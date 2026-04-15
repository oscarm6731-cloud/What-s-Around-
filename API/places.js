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
    sort: sort || 'RATING',
    limit: limit || '10',
    fields: 'fsq_id,name,location,categories,rating,stats,hours,price,photos,website,tel,distance,popularity'
  });

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
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Foursquare error: ' + errText });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
