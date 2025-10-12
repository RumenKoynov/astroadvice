const express = require('express');
const router = express.Router();
const { groqComplete } = require('../lib/groq');
const { normalizeLang } = require('../lib/lang');

// Minimal, safe generator with fallback
async function generateAdvice({ sign, lang, sex, age }) {
  const system = `You are a concise horoscope copywriter. Reply in the requested language. Output ONE sentence, <= 32 words, playful and uplifting. No health/finance/legal claims.`;
  const user = `
Language: ${lang}
Sign: ${sign || 'Unknown'}
Sex: ${sex || 'unspecified'}
Age: ${age || 'unknown'}
Goal: Daily tip with a dash of mystique for a mobile app.
`.trim();

  try {
    const text = await groqComplete({
      system,
      user,
      temperature: 0.85,
      max_tokens: 120,
      timeout_ms: 7000,
    });
    if (text) return text;
  } catch (e) {
    // fall through
  }
  // Fallback per language (very short)
  const fallbacks = {
    en: 'Small bold steps open quiet doors today.',
    bg: 'Малките смели стъпки отварят тихи врати днес.',
    ru: 'Маленькие смелые шаги открывают тихие двери сегодня.',
    fr: 'De petits pas audacieux ouvrent des portes discrètes aujourd’hui.',
    de: 'Kleine mutige Schritte öffnen heute leise Türen.',
    tr: 'Küçük cesur adımlar bugün sessiz kapılar açar.',
  };
  return fallbacks[lang] || fallbacks.en;
}

router.get('/getDailyAdvice', async (req, res) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const sign = req.query.sign || '';
    const sex  = req.query.sex || '';
    const age  = req.query.age || '';

    const advice = await generateAdvice({ sign, lang, sex, age });
    return res.json({ advice, lang });
  } catch (e) {
    console.error('advice error:', e.message);
    return res.json({ advice: 'Small bold steps open quiet doors today.' });
  }
});

module.exports = router;



