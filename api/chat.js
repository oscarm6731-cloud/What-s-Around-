export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const key = process.env.GROQ_API_KEY;
if (!key) return res.status(500).json({ error: ‘GROQ_API_KEY not set’ });

try {
const body = req.body || {};
const messages = [];

```
if (body.system) {
  messages.push({ role: 'system', content: String(body.system) });
}

const incoming = Array.isArray(body.messages) ? body.messages : [];
incoming.forEach(function(m) {
  messages.push({ role: m.role, content: String(m.content) });
});

if (messages.length === 0) {
  return res.status(400).json({ error: 'No messages provided' });
}

const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + key
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    max_tokens: body.max_tokens || 4000,
    temperature: 0.7
  })
});

const data = await response.json();

if (!response.ok) {
  console.error('Groq error:', JSON.stringify(data));
  return res.status(500).json({ error: data.error ? data.error.message : 'Groq API error' });
}

const text = data.choices && data.choices[0] && data.choices[0].message
  ? data.choices[0].message.content
  : '';

return res.status(200).json({
  content: [{ type: 'text', text: text }]
});
```

} catch (err) {
console.error(‘Handler error:’, err.message);
return res.status(500).json({ error: err.message });
}
}