const express = require('express');
const router = express.Router();
const { openaiComplete } = require('../lib/openai');
const { normalizeLang } = require('../lib/lang');

const MIN_WORDS = 160;
const MAX_WORDS = 220;

const FALLBACKS = {
  en: 'Today favors small steps. Drink water, send that one message, and smile at a coincidence.',
  bg: 'Днес е ден за малки стъпки. Пий вода, изпрати онова съобщение и се усмихни на съвпадението.',
  ru: 'Сегодня день маленьких шагов. Пей воду, отправь то самое сообщение и улыбнись совпадению.',
  fr: 'Aujourd’hui, avance par petits pas. Bois de l’eau, envoie ce message et souris aux coïncidences.',
  de: 'Heute zählen kleine Schritte. Trink Wasser, sende die eine Nachricht und lächle dem Zufall zu.',
  tr: 'Bugün küçük adımlar günü. Su iç, o mesajı gönder ve tesadüfe gülümse.',
  es: 'Hoy valen los pequeños pasos. Bebe agua, envía ese mensaje y sonríe a la casualidad.',
};

const countWords = (s) => s.split(/\s+/).filter(Boolean).length;
const inRange = (n) => n >= MIN_WORDS && n <= MAX_WORDS;

async function generateAdvice({ sign, lang, sex, age }) {
  if (!process.env.OPENAI_API_KEY) {
    return FALLBACKS[lang] || FALLBACKS.en;
  }

  const system = `You are a witty horoscope writer. Keep it entertaining, clear, and safe-for-work. Write ${MIN_WORDS}-${MAX_WORDS} words. Language: ${lang}.`;
  const user =
    `Give one detailed daily horoscope for a user.\n` +
    `Zodiac: ${sign || 'Unknown'}\n` +
    `Sex: ${sex || 'unspecified'}\n` +
    `Age: ${age || 'unknown'}\n` +
    `Include 3-4 concrete suggestions for the day.\n` +
    `Include a brief outlook for morning/afternoon/evening.\n` +
    `Tone: uplifting, fun, zero doom. No health/financial claims.\n` +
    `Return only the horoscope text; no headings or word counts.\n` +
    `If you fall outside ${MIN_WORDS}-${MAX_WORDS} words, revise to fit the range.`;

  let advice = await openaiComplete({
    system,
    user,
    temperature: 0.9,
    max_tokens: 600,
    timeout_ms: 12000,
    logTag: 'dailyAdvice',
  });
  if (!advice) advice = FALLBACKS[lang] || FALLBACKS.en;

  let wordCount = countWords(advice);
  let retries = 0;
  while (!inRange(wordCount) && retries < 4) {
    const direction = wordCount < MIN_WORDS ? 'Expand' : 'Shorten';
    const adjustUser =
      `${direction} the following horoscope to ${MIN_WORDS}-${MAX_WORDS} words. ` +
      `Keep the same language and tone. Keep 3-4 concrete suggestions and a brief morning/afternoon/evening outlook. ` +
      `No health or financial claims. Return only the revised horoscope.\n\n${advice}`;

    const adjusted = await openaiComplete({
      system,
      user: adjustUser,
      temperature: retries >= 2 ? 0.6 : 0.8,
      max_tokens: 600,
      timeout_ms: 12000,
      logTag: 'dailyAdviceAdjust',
    });

    if (!adjusted) break;
    advice = adjusted;
    wordCount = countWords(advice);
    retries += 1;
  }

  return advice;
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
    return res.json({ advice: FALLBACKS.en, lang: 'en' });
  }
});

module.exports = router;
