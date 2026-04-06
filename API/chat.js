const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_HISTORY = 8;

async function groqCall(key, model, msgs, maxTokens) {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: msgs, max_tokens: maxTokens, temperature: 0.3 })
  });
  const d = await r.json();
  if (!r.ok) {
    const err = d.error ? d.error.message : 'Groq error';
    const isRateLimit = r.status === 429 || (err && err.toLowerCase().includes('rate limit'));
    const e = new Error(err);
    e.isRateLimit = isRateLimit;
    throw e;
  }
  return d.choices && d.choices[0] ? d.choices[0].message.content : '';
}

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
    const maxTokens = body.max_tokens || 4000;
    let msgs, model;

    if (body.image) {
      const textContent = (body.messages && body.messages[0]) ? body.messages[0].content : '';
      msgs = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: body.image } }, { type: 'text', text: textContent }] }];
      model = 'llama-4-scout-17b-16e-instruct';
    } else {
      msgs = [];
      if (body.system) msgs.push({ role: 'system', content: body.system });
      // Trim conversation history to last MAX_HISTORY messages to reduce token usage
      const history = (body.messages || []).slice(-MAX_HISTORY);
      history.forEach(m => msgs.push({ role: m.role, content: m.content }));
      model = 'llama-3.3-70b-versatile';
    }

    let text;
    try {
      text = await groqCall(key, model, msgs, maxTokens);
    } catch (e) {
      // Fallback to smaller model on rate limit (text only — vision model has no fallback)
      if (e.isRateLimit && !body.image) {
        text = await groqCall(key, 'llama-3.1-8b-instant', msgs, maxTokens);
      } else {
        throw e;
      }
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
