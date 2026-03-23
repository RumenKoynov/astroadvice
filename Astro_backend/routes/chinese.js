const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const chinese = require('../data/chineseDescriptions'); // { rat:{name,desc}, 'rat-water':{...} }
const { openaiComplete } = require('../lib/openai');
const { normalizeLang } = require('../lib/lang');

const ELEMENT_DESC = {
  wood: {
    en: 'Wood adds growth, flexibility, and curiosity.',
    bg: 'Дървото носи растеж, гъвкавост и любопитство.',
    ru: 'Дерево приносит рост, гибкость и любознательность.',
    fr: 'Le Bois apporte croissance, souplesse et curiosité.',
    de: 'Holz bringt Wachstum, Flexibilität und Neugier.',
    tr: 'Ağaç büyüme, esneklik ve merak katar.',
    es: 'La madera aporta crecimiento, flexibilidad y curiosidad.',
    it: 'Il Legno porta crescita, flessibilità e curiosità.',
  },
  fire: {
    en: 'Fire adds passion, courage, and momentum.',
    bg: 'Огънят носи страст, смелост и устрем.',
    ru: 'Огонь приносит страсть, смелость и импульс.',
    fr: 'Le Feu apporte passion, courage et élan.',
    de: 'Feuer bringt Leidenschaft, Mut und Schwung.',
    tr: 'Ateş tutku, cesaret ve ivme katar.',
    es: 'El fuego aporta pasión, valentía y impulso.',
    it: 'Il Fuoco porta passione, coraggio e slancio.',
  },
  earth: {
    en: 'Earth adds steadiness, patience, and grounded care.',
    bg: 'Земята носи стабилност, търпение и заземена грижа.',
    ru: 'Земля приносит устойчивость, терпение и чувство опоры.',
    fr: 'La Terre apporte stabilité, patience et ancrage.',
    de: 'Erde bringt Stabilität, Geduld und Bodenhaftung.',
    tr: 'Toprak istikrar, sabır ve sağlamlık katar.',
    es: 'La tierra aporta estabilidad, paciencia y arraigo.',
    it: 'La Terra porta stabilità, pazienza e radicamento.',
  },
  metal: {
    en: 'Metal adds focus, clarity, and strong boundaries.',
    bg: 'Металът носи фокус, яснота и здрави граници.',
    ru: 'Металл приносит фокус, ясность и крепкие границы.',
    fr: 'Le Métal apporte concentration, clarté et limites nettes.',
    de: 'Metall bringt Fokus, Klarheit und klare Grenzen.',
    tr: 'Metal odak, netlik ve güçlü sınırlar katar.',
    es: 'El metal aporta enfoque, claridad y límites firmes.',
    it: 'Il Metallo porta concentrazione, chiarezza e confini solidi.',
  },
  water: {
    en: 'Water adds intuition, flow, and quiet strength.',
    bg: 'Водата носи интуиция, плавност и тиха сила.',
    ru: 'Вода приносит интуицию, текучесть и тихую силу.',
    fr: 'L’Eau apporte intuition, fluidité et force tranquille.',
    de: 'Wasser bringt Intuition, Fluss und stille Stärke.',
    tr: 'Su sezgi, akış ve sakin güç katar.',
    es: 'El agua aporta intuición, fluidez y fuerza serena.',
    it: 'L’Acqua porta intuizione, fluidità e forza tranquilla.',
  },
};

function buildImgUrl(req, slug) {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const base = process.env.API_PUBLIC_BASE || `${proto}://${req.get('host')}`;
  return `${base}/cz/${slug}.png`;
}

async function generateChineseDaily({ sign, element, lang, sex, age }) {
  const safeLang = normalizeLang(lang || 'en');
  const safeSign = (sign || '').toLowerCase();
  const safeElement = (element || '').toLowerCase();

  if (!safeSign || !safeElement) {
    return '';
  }

  const MIN_WORDS = 90;
  const MAX_WORDS = 130;

  const countWords = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
  const inRange = (n) => n >= MIN_WORDS && n <= MAX_WORDS;

  const ageNum = Number.isFinite(Number(age)) ? Number(age) : null;

  const getLifeStage = (n) => {
    if (n === null) return 'unspecified';
    if (n < 18) return 'early personal growth';
    if (n < 25) return 'emerging adulthood';
    if (n < 35) return 'building foundations';
    if (n < 50) return 'responsibility and self-redefinition';
    if (n < 65) return 'wisdom, stability, and renewal';
    return 'deeper alignment and perspective';
  };

  const lifeStage = getLifeStage(ageNum);

  const system = [
    'You are a thoughtful Chinese zodiac reader writing for a modern astrology app.',
    `Write in ${safeLang}.`,
    'Your tone must feel warm, human, reflective, and quietly wise.',
    'Make the reading clearly connected to the Chinese zodiac sign and its element.',
    'Focus on themes such as rhythm, balance, timing, character, relationships, patience, wisdom, and personal direction.',
    'Adapt mainly to the person’s life stage based on age, and use sex only as subtle tone context when relevant.',
    'Avoid stereotypes completely.',
    'Do not explicitly mention age or sex unless it feels completely natural.',
    'This reading must feel distinct from a daily horoscope and distinct from a western zodiac reading.',
    'Do not focus on morning, afternoon, evening, or practical to-do advice.',
    'Do not mention planets, transits, astrology mechanics, or generic mystical clichés.',
    'Do not give health, legal, or financial advice.',
    'Do not sound AI-generated.',
  ].join(' ');

  const user = [
    'Write a Chinese horoscope reading for this person.',
    `Language: ${safeLang}.`,
    `Chinese zodiac sign: ${safeSign}.`,
    `Element: ${safeElement}.`,
    `Age: ${ageNum === null ? 'unknown' : ageNum}.`,
    `Life stage: ${lifeStage}.`,
    `Sex: ${sex || 'unspecified'}.`,
    `Length: ${MIN_WORDS}-${MAX_WORDS} words.`,
    'Write 4-6 sentences.',
    'The reading must feel rooted in the Chinese zodiac sign’s temperament and deeper patterns.',
    'Emphasize timing, balance, social energy, inner discipline, and long-term direction.',
    'Keep it personal, calm, symbolic, and emotionally intelligent.',
    'Keep it different from daily advice and different from western zodiac personality language.',
    'Return only the reading text with no heading or label.',
  ].join(' ');

  let text = await openaiComplete({
    system,
    user,
    temperature: 0.85,
    max_tokens: 300,
    timeout_ms: 10000,
    logTag: 'chinese-daily',
  });

  text = String(text || '').trim();
  let wordCount = countWords(text);
  let retries = 0;

  while (text && !inRange(wordCount) && retries < 3) {
    const direction = wordCount < MIN_WORDS ? 'Expand' : 'Shorten';

    const adjustUser =
      `${direction} the following Chinese horoscope reading to ${MIN_WORDS}-${MAX_WORDS} words. ` +
      `Keep the same language, tone, and meaning. ` +
      `Keep it rooted in the Chinese zodiac sign and element, and keep it distinct from daily advice and western zodiac style. ` +
      `Return only the revised reading text.\n\n${text}`;

    const adjusted = await openaiComplete({
      system,
      user: adjustUser,
      temperature: retries >= 1 ? 0.6 : 0.8,
      max_tokens: 300,
      timeout_ms: 10000,
      logTag: 'chinese-daily-adjust',
    });

    if (!adjusted) break;
    text = String(adjusted).trim();
    wordCount = countWords(text);
    retries += 1;
  }

  return text;
}

router.get('/daily', async (req, res) => {
  try {
    const { sign = '', element = '', lang = 'en', sex = '', age = '' } = req.query;
    const horoscope = await generateChineseDaily({ sign, element, lang, sex, age });
    res.json({ horoscope: horoscope || '' });
  } catch (e) {
    console.error('chinese daily error:', e.message);
    res.json({
      horoscope:
        'A calmer rhythm will serve you well now; steady choices and quiet patience can bring more harmony than force.',
    });
  }
});

router.get('/:slug', (req, res) => {
  const slug = (req.params.slug || '').toLowerCase();
  const lang = (req.query.lang || 'en').toLowerCase();
  let meta = chinese[slug];
  if (!meta && slug) {
    const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
    meta = chinese[cap];
  }
  if (!meta && slug.includes('-')) {
    const [signRaw, elementRaw] = slug.split('-');
    const signKey = (signRaw || '').toLowerCase();
    const signMeta =
      chinese[signKey] ||
      chinese[signKey.charAt(0).toUpperCase() + signKey.slice(1)];
    if (signMeta) {
      const signName = signMeta.name?.[lang] || signMeta.name?.en || signKey;
      const elemLabel = (elementRaw || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      const name = elemLabel ? `${elemLabel} ${signName}` : signName;
      const baseDesc = signMeta.desc?.[lang] || signMeta.desc?.en || '';
      const elementKey = (elementRaw || '').toLowerCase();
      const elementLine =
        ELEMENT_DESC[elementKey]?.[lang] ||
        ELEMENT_DESC[elementKey]?.en ||
        '';
      const desc = [elementLine, baseDesc].filter(Boolean).join(' ');
      const imgPath = path.join(__dirname, '..', 'chinese-zodiac', `${slug}.png`);
      const imgSlug = fs.existsSync(imgPath) ? slug : signKey;
      return res.json({ name, desc, imageUrl: buildImgUrl(req, imgSlug), fallback: true });
    }
  }
  if (!meta) return res.status(404).json({ error: 'Unknown chinese slug', slug });
  const name = meta.name?.[lang] || meta.name?.en || slug;
  const desc = meta.desc?.[lang] || meta.desc?.en || '';
  res.json({ name, desc, imageUrl: buildImgUrl(req, slug) });
});

module.exports = router;





