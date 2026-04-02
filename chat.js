module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'No API key configured' });
  try {
    const body = req.body || {};
    const msgs = [];
    if (body.system) msgs.push({ role: 'system', content: body.system });
    (body.messages || []).forEach(m => msgs.push({ role: m.role, content: m.content }));
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: body.max_tokens || 4000 })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error ? d.error.message : 'Groq error' });
    const text = d.choices && d.choices[0] ? d.choices[0].message.content : '';
    return res.status(200).json({ content: [{ type: 'text', text: text }] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
