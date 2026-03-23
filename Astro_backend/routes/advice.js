const express = require('express');
const router = express.Router();
const { openaiComplete } = require('../lib/openai');
const { normalizeLang } = require('../lib/lang');

const MIN_WORDS = 160;
const MAX_WORDS = 220;
const OVERLAY_MAX_WORDS = 70;

const baseCache = new Map();

const todayKey = () => new Date().toISOString().slice(0, 10);
const baseKey = (date, sign, lang) =>
  `${date}::${(lang || 'en').toLowerCase()}::${(sign || 'unknown').toLowerCase()}`;

const FALLBACKS = {
  en: 'Today favors small steps. Protect your energy, answer only what truly matters, and let one quiet moment guide the rest of your day. A simple choice made with calm attention may bring more clarity than expected.',
  bg: 'Днес е ден за малки, но важни стъпки. Пази енергията си, отговаряй само на онова, което наистина има значение, и остави един спокоен миг да насочи деня ти. Едно просто решение може да донесе повече яснота, отколкото очакваш.',
  ru: 'Сегодня лучше делать маленькие, но важные шаги. Береги свою энергию, отвечай только на действительно важное и позволь одному спокойному моменту направить твой день. Простое решение может принести больше ясности, чем ты ожидаешь.',
  fr: 'Aujourd’hui favorise les petits pas essentiels. Protège ton énergie, réponds seulement à ce qui compte vraiment et laisse un moment de calme guider le reste de ta journée. Une décision simple pourrait t’apporter plus de clarté que prévu.',
  de: 'Heute zählen kleine, aber wichtige Schritte. Schütze deine Energie, reagiere nur auf das, was wirklich zählt, und lass einen ruhigen Moment deinen Tag lenken. Eine einfache Entscheidung kann mehr Klarheit bringen, als du erwartest.',
  tr: 'Bugün küçük ama önemli adımlar için uygun. Enerjini koru, yalnızca gerçekten önemli olana cevap ver ve sakin bir anın gününü yönlendirmesine izin ver. Basit bir karar, beklediğinden daha fazla netlik getirebilir.',
  es: 'Hoy favorece los pasos pequeños pero importantes. Protege tu energía, responde solo a lo que de verdad importa y deja que un momento de calma guíe el resto del día. Una decisión sencilla podría darte más claridad de la que esperas.',
};

const dayThemes = [
  'emotional clarity',
  'quiet confidence',
  'unexpected connection',
  'inner reset',
  'bold honesty',
  'patience rewarded',
  'creative spark',
  'letting go',
  'hidden opportunity',
  'gentle momentum',
];

const toneVariations = [
  'soft and comforting',
  'mysterious and deep',
  'uplifting and bright',
  'romantic and tender',
  'bold and motivating',
  'calm and wise',
];

const countWords = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
const inRange = (n) => n >= MIN_WORDS && n <= MAX_WORDS;

const hash = (str) =>
  String(str || '')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

const getLifeStage = (age) => {
  if (!Number.isFinite(age)) return 'unspecified';
  if (age < 18) return 'early personal growth';
  if (age < 25) return 'emerging adulthood';
  if (age < 35) return 'building foundations';
  if (age < 50) return 'responsibility and self-redefinition';
  if (age < 65) return 'wisdom, stability, and renewal';
  return 'deeper alignment and perspective';
};

async function generateAdvice({ sign, lang, sex, age }) {
  const safeLang = normalizeLang(lang);
  const baseDate = todayKey();
  const cacheKey = baseKey(baseDate, sign, safeLang);

  const seed = hash(`${baseDate}:${sign}:${safeLang}`);
  const theme = dayThemes[seed % dayThemes.length];
  const tone = toneVariations[seed % toneVariations.length];

  let base = baseCache.get(cacheKey) || '';

  if (!base) {
    if (!process.env.OPENAI_API_KEY) {
      base = FALLBACKS[safeLang] || FALLBACKS.en;
    } else {
      const system =
        `You are a gifted astrologer writing for a modern astrology app. ` +
        `Write in ${safeLang}. Your tone must feel human, warm, emotionally intelligent, and slightly mystical without sounding cheesy, theatrical, or artificial. ` +
        `Avoid clichés, generic self-help language, repetitive horoscope wording, and anything that sounds AI-generated. ` +
        `Do not mention astrology mechanics, planets, houses, transits, or phrases like "the stars say". ` +
        `Do not give health, legal, or financial advice.`;

      const user =
        `Write today's daily horoscope for the zodiac sign: ${sign || 'Unknown'}.\n` +
        `Global emotional theme: ${theme}\n` +
        `Tone variation: ${tone}\n\n` +
        `Requirements:\n` +
        `- Length: ${MIN_WORDS}-${MAX_WORDS} words\n` +
        `- 4 to 6 sentences\n` +
        `- Warm, personal, emotionally specific, and engaging\n` +
        `- Focus on mood, relationships, energy, opportunity, or inner clarity\n` +
        `- Include one subtle practical suggestion\n` +
        `- End with a memorable final sentence that feels hopeful, intriguing, or quietly powerful\n` +
        `- Return only the horoscope text with no heading, label, or word count`;

      base = await openaiComplete({
        system,
        user,
        temperature: 0.9,
        max_tokens: 600,
        timeout_ms: 12000,
        logTag: 'dailyAdviceBase',
      });

      base = String(base || '').trim();
      if (!base) base = FALLBACKS[safeLang] || FALLBACKS.en;

      let wordCount = countWords(base);
      let retries = 0;

      while (!inRange(wordCount) && retries < 4) {
        const direction = wordCount < MIN_WORDS ? 'Expand' : 'Shorten';
        const adjustUser =
          `${direction} the following horoscope to ${MIN_WORDS}-${MAX_WORDS} words. ` +
          `Keep the same language, tone, emotional theme, and overall meaning. ` +
          `Keep it natural, warm, personal, and non-repetitive. ` +
          `Return only the revised horoscope text.\n\n${base}`;

        const adjusted = await openaiComplete({
          system,
          user: adjustUser,
          temperature: retries >= 2 ? 0.6 : 0.8,
          max_tokens: 600,
          timeout_ms: 12000,
          logTag: 'dailyAdviceBaseAdjust',
        });

        if (!adjusted) break;

        base = String(adjusted).trim();
        wordCount = countWords(base);
        retries += 1;
      }
    }

    baseCache.set(cacheKey, base);
  }

  let personalized = '';

  if (process.env.OPENAI_API_KEY) {
    const ageNum = Number.isFinite(Number(age)) ? Number(age) : null;

    const system =
      `You are a gifted astrologer adding a short personalized insight to a daily horoscope. ` +
      `Write in ${safeLang}. Keep it 1-2 sentences and no more than ${OVERLAY_MAX_WORDS} words. ` +
      `The tone must feel warm, intimate, human, and natural. ` +
      `Adapt mainly to the user's life stage, and use sex only as subtle context when relevant. ` +
      `Avoid stereotypes completely. Do not explicitly mention age or sex unless it feels completely natural. ` +
      `Do not repeat the base horoscope. Do not give health, finance, legal, or medical advice. No bullet points. No emojis.`;

    const user =
      `Zodiac: ${sign || 'Unknown'}\n` +
      `Sex: ${sex || 'unspecified'}\n` +
      `Age: ${ageNum === null ? 'unknown' : ageNum}\n` +
      `Life stage: ${getLifeStage(ageNum)}\n\n` +
      `Base horoscope:\n${base}\n\n` +
      `Write a short personalized add-on that feels like a natural continuation of the base horoscope. ` +
      `Add emotional depth, relatability, or a more personal angle without repeating the same ideas.`;

    personalized = await openaiComplete({
      system,
      user,
      temperature: 0.8,
      max_tokens: 200,
      timeout_ms: 9000,
      logTag: 'dailyAdviceOverlay',
    });

    personalized = String(personalized || '').trim();
  }

  if (!personalized) {
    personalized =
      safeLang === 'bg'
        ? 'Днес ще ти помогне, ако пазиш енергията си и оставиш място за малко вътрешно спокойствие.'
        : 'You may feel better today if you protect your energy and leave a little more room for calm.';
  }

  base = String(base || '').trim();
  personalized = String(personalized || '').trim();

  return {
    base,
    personalized,
    advice: `${base}\n\n${personalized}`,
    lang: safeLang,
  };
}

router.get('/getDailyAdvice', async (req, res) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const sign = req.query.sign || '';
    const sex = req.query.sex || '';
    const age = req.query.age || '';

    const result = await generateAdvice({ sign, lang, sex, age });
    return res.json(result);
  } catch (e) {
    console.error('advice error:', e.message);
    const base = FALLBACKS.en;
    const personalized = 'You may feel better today if you protect your energy and leave a little more room for calm.';
    return res.json({
      base,
      personalized,
      advice: `${base}\n\n${personalized}`,
      lang: 'en',
    });
  }
});

module.exports = router;
