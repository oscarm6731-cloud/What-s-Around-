const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, near, ll, sort, price, limit } = req.query;
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'No Groq API key configured' });
  if (!near) return res.status(400).json({ error: 'near parameter required' });

  const n = Math.min(parseInt(limit) || 8, 15);
  const sortHint = sort === 'POPULARITY' ? 'most popular and iconic'
                 : sort === 'RATING'     ? 'highest-rated'
                 : 'well-known';
  const priceHint = price ? ` at price level ${price}/4` : '';
  const coordHint = ll ? ` (coordinates: ${ll})` : '';

  const prompt = `List ${n} real, specific, ${sortHint} places in ${near}${coordHint} for: "${query || 'popular attractions'}"${priceHint}.

Return ONLY a valid JSON array, no markdown:
[{"name":"Exact Place Name","address":"Full street address, ${near}","category":"Specific Type","rating":8.5,"price":2,"lat":0.0,"lng":0.0,"website":"https://... or null"}]

Rules:
- Only real places that actually exist in ${near}
- rating: 6.0–10.0 (iconic landmarks ~9+, solid locals ~7–8)
- price: 1=free/cheap 2=moderate 3=expensive 4=luxury, null if N/A
- category: specific e.g. "Buddhist Temple", "Specialty Coffee Shop", "Contemporary Art Museum"
- lat/lng: real coordinates for ${near}, otherwise 0
- No duplicates`;

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a travel expert. Return ONLY a valid JSON array with no markdown, no explanation, no extra text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })
    });

    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Groq error' });

    const text = (d.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
    const si = text.indexOf('['), ei = text.lastIndexOf(']');
    if (si === -1 || ei === -1) return res.status(200).json({ results: [] });

    let places;
    try { places = JSON.parse(text.slice(si, ei + 1)); }
    catch (e) { return res.status(200).json({ results: [] }); }

    const results = (Array.isArray(places) ? places : [])
      .filter(p => p && p.name)
      .map(p => {
        const lat = (typeof p.lat === 'number' && p.lat !== 0) ? p.lat : null;
        const lng = (typeof p.lng === 'number' && p.lng !== 0) ? p.lng : null;
        return {
          fsq_id: (near + '_' + p.name).toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: p.name,
          location: {
            formatted_address: p.address || near,
            latitude: lat,
            longitude: lng
          },
          categories: [{ name: p.category || query || 'Place' }],
          rating: (typeof p.rating === 'number' && p.rating >= 1) ? p.rating : null,
          price: (typeof p.price === 'number' && p.price >= 1 && p.price <= 4) ? p.price : null,
          hours: null,
          photos: [],
          website: (p.website && p.website !== 'null') ? p.website : null,
          tel: null
        };
      });

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
