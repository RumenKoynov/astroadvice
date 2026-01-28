const express = require('express');
const router = express.Router();
const path = require('path');
const chinese = require('../data/chineseDescriptions'); // { rat:{name,desc}, 'rat-water':{...} }
const { groqComplete } = require('../lib/groq');
const { normalizeLang } = require('../lib/lang');

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
  ].join(' ');

  const user = [
    `Language: ${safeLang}.`,
    `Sign: ${safeSign}.`,
    `Element: ${safeElement}.`,
    'Write 2-3 sentences, <= 60 words, no bullet lists, no emojis.',
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
  const meta = chinese[slug];
  if (!meta) return res.status(404).json({ error: 'Unknown chinese slug', slug });
  const name = meta.name?.[lang] || meta.name?.en || slug;
  const desc = meta.desc?.[lang] || meta.desc?.en || '';
  res.json({ name, desc, imageUrl: buildImgUrl(req, slug) });
});

module.exports = router;






