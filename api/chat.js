module.exports = async (req, res) => {
if (req.method === ‘OPTIONS’) { res.setHeader(‘Access-Control-Allow-Origin’, ‘*’); res.setHeader(‘Access-Control-Allow-Methods’, ‘POST’); res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’); return res.status(200).end(); }
res.setHeader(‘Access-Control-Allow-Origin’, ’*’);
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });
try {
const body = req.body || {};
const msgs = [];
if (body.system) msgs.push({ role: ‘system’, content: body.system });
(body.messages || []).forEach(function(m) { msgs.push({ role: m.role, content: m.content }); });
const r = await fetch(‘https://api.groq.com/openai/v1/chat/completions’, { method: ‘POST’, headers: { ‘Content-Type’: ‘application/json’, ‘Authorization’: ’Bearer ’ + process.env.GROQ_API_KEY }, body: JSON.stringify({ model: ‘llama-3.3-70b-versatile’, messages: msgs, max_tokens: body.max_tokens || 4000 }) });
const d = await r.json();
const text = d.choices && d.choices[0] ? d.choices[0].message.content : ‘’;
return res.status(200).json({ content: [{ type: ‘text’, text: text }] });
} catch(e) { return res.status(500).json({ error: e.message }); }
};