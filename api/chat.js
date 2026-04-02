module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'nope' });
  const key = process.env.GROQ_API_KEY;
  try {
    const b = req.body || {};
    const msgs = [];
    if (b.system) msgs.push({ role: 'system', content: b.system });
    (b.messages || []).forEach(m => msgs.push(m));
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: b.max_tokens || 4000 })
    });
    const d = await r.json();
    const t = d.choices && d.choices[0] ? d.choices[0].message.content : '';
    res.status(200).json({ content: [{ type: 'text', text: t }] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
