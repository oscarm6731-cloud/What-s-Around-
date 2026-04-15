module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, near, radius, sort, price, limit } = req.query;
  const key = process.env.FOURSQUARE_KEY;
  if (!key) return res.status(500).json({ error: 'No Foursquare key configured' });

  const params = new URLSearchParams({
    query: query || '',
    near: near || '',
    radius: radius || '5000',
    limit: limit || '10',
    fields: 'fsq_id,name,location,categories,rating,hours,price,photos,website,tel'
  });

  // Only add sort if provided — avoid sending unsupported values
  if (sort) params.append('sort', sort);
  if (price) params.append('price', price);

  try {
    const response = await fetch(
      'https://places-api.foursquare.com/places/search?' + params.toString(),
      {
        headers: {
          'Authorization': 'Bearer ' + key,
          'X-Places-Api-Version': '2025-02-05',
          'Accept': 'application/json'
        }
      }
    );

    const text = await response.text();

    if (!response.ok) {
      // Surface the real Foursquare error so the client can show it
      return res.status(200).json({ results: [], fsq_error: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(200).json({ results: [], fsq_error: 'Invalid JSON from Foursquare: ' + text.slice(0, 200) });
    }

    // Normalise to { results: [...] } regardless of what the new API wraps it in
    const results = data.results || data.places || (Array.isArray(data) ? data : []);
    return res.status(200).json({ results });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
