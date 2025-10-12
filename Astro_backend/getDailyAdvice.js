// routes/getDailyAdvice.js
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

const FALLBACKS = {
  en: 'Today favors small steps. Drink water, send that one message, and smile at a coincidence.',
  bg: 'Днес е ден за малки стъпки. Пий вода, изпрати онова съобщение и се усмихни на съвпадението.',
  ru: 'Сегодня день маленьких шагов. Пей воду, отправь то самое сообщение и улыбнись совпадению.',
  fr: 'Aujourd’hui, avance par petits pas. Bois de l’eau, envoie ce message et souris aux coïncidences.',
  de: 'Heute zählen kleine Schritte. Trink Wasser, sende die eine Nachricht und lächle dem Zufall zu.',
  tr: 'Bugün küçük adımlar günü. Su iç, o mesajı gönder ve tesadüfe gülümse.',
  es: 'Hoy valen los pequeños pasos. Bebe agua, envía ese mensaje y sonríe a la casualidad.',
};

module.exports = async function getDailyAdviceHandler(req, res) {
  const sign = String(req.query.sign || 'Aries');
  const lang = String((req.query.lang || 'en')).toLowerCase();
  const sex  = String(req.query.sex || 'female');
  const age  = String(req.query.age || '25');

  // helpful server logs
  console.log('[getDailyAdvice] q=', { sign, lang, sex, age });

  // Defensive: if API key missing, return fallback immediately
  if (!process.env.GROQ_API_KEY) {
    const advice = FALLBACKS[lang] || FALLBACKS.en;
    return res.json({ advice, source: 'fallback:no_api_key' });
  }

  try {
    const sys = `You are a witty horoscope writer. Keep it entertaining, brief (max 32 words), and safe-for-work. Language: ${lang}.`;
    const usr =
      `Give one short, playful daily advice for a user.\n` +
      `Zodiac: ${sign}\n` +
      `Sex: ${sex}\n` +
      `Age: ${age}\n` +
      `Tone: uplifting, fun, zero doom. No health/financial claims.`;

    // Add a hard timeout to avoid hanging forever
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.9,
      max_tokens: 64,
      // @ts-ignore signal supported by fetch in groq-sdk
      signal: controller.signal,
    }).finally(() => clearTimeout(t));

    const advice =
      completion?.choices?.[0]?.message?.content?.trim() ||
      FALLBACKS[lang] || FALLBACKS.en;

    return res.json({ advice, source: 'groq' });
  } catch (err) {
    // Log detailed error and return graceful fallback
    console.error('[getDailyAdvice] error:', err?.message || err);
    const advice = FALLBACKS[lang] || FALLBACKS.en;
    return res.json({ advice, source: 'fallback:error' });
  }
};


