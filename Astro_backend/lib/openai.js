// server/lib/openai.js
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function openaiComplete({
  model = process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  system = '',
  user = '',
  temperature = 0.9,
  max_tokens = 600,
  timeout_ms = 12000,
  logTag = 'openai',
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const input = system ? `${system}\n\n${user}` : user;
    const resp = await client.responses.create(
      {
        model,
        input,
        temperature,
        max_output_tokens: max_tokens,
      },
      { signal: controller.signal }
    );
    const text = resp?.output_text?.trim() || '';
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

module.exports = { openaiComplete };
