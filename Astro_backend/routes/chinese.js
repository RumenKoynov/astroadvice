const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const chinese = require('../data/chineseDescriptions'); // { rat:{name,desc}, 'rat-water':{...} }
const { groqComplete } = require('../lib/groq');
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
  const base = process.env.API_PUBLIC_BASE || `${req.protocol}://${req.get('host')}`;
  return `${base}/cz/${slug}.png`;
}

async function generateChineseDaily({ sign, element, lang }) {
  const safeLang = normalizeLang(lang || 'en');
  const safeSign = (sign || '').toLowerCase();
  const safeElement = (element || '').toLowerCase();
  if (!safeSign || !safeElement) {
    return '';
  }

  const system = [
    'You are a concise Chinese zodiac horoscope writer for a mobile app.',
    'Reply in the requested language. No health/finance/legal advice.',
    'Keep it uplifting, slightly mystical, and practical.',
    'Make it about today: focus on the day\'s mood, timing, or a small action.',
    'Avoid repeating the sign or element names in the text.',
  ].join(' ');

  const user = [
    `Language: ${safeLang}.`,
    `Sign: ${safeSign}.`,
    `Element: ${safeElement}.`,
    'Write 4-5 sentences, <= 95 words, no bullet lists, no emojis.',
  ].join(' ');

  const text = await groqComplete({
    system,
    user,
    temperature: 0.8,
    max_tokens: 200,
    timeout_ms: 9000,
    logTag: 'chinese-daily',
  });

  return (text || '').trim();
}

router.get('/daily', async (req, res) => {
  try {
    const { sign = '', element = '', lang = 'en' } = req.query;
    const horoscope = await generateChineseDaily({ sign, element, lang });
    res.json({ horoscope: horoscope || '' });
  } catch (e) {
    console.error('chinese daily error:', e.message);
    res.json({ horoscope: 'Balance your Qi with simple acts; harmony follows diligence.' });
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






