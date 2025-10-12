// server/lib/groq.js
const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function groqComplete({
  model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  system = '',
  user = '',
  temperature = 0.9,
  max_tokens = 600,
  timeout_ms = 12000,
  logTag = 'groq',
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const resp = await client.chat.completions.create(
      {
        model,
        temperature,
        max_tokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      { signal: controller.signal }
    );
    const text = resp?.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      console.warn(`[${logTag}] empty completion`);
    }
    return text;
  } catch (err) {
    console.error(`[${logTag}] error:`, err?.message || err);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { groqComplete };

