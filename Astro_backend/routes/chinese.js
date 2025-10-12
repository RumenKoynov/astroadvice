const express = require('express');
const router = express.Router();
const path = require('path');
const chinese = require('../data/chineseDescriptions'); // { rat:{name,desc}, 'rat-water':{...} }

function buildImgUrl(req, slug) {
  const base = process.env.API_PUBLIC_BASE || `${req.protocol}://${req.get('host')}`;
  return `${base}/cz/${slug}.png`;
}

router.get('/:slug', (req, res) => {
  const slug = (req.params.slug || '').toLowerCase();
  const lang = (req.query.lang || 'en').toLowerCase();
  const meta = chinese[slug];
  if (!meta) return res.status(404).json({ error: 'Unknown chinese slug', slug });
  const name = meta.name?.[lang] || meta.name?.en || slug;
  const desc = meta.desc?.[lang] || meta.desc?.en || '';
  res.json({ name, desc, imageUrl: buildImgUrl(req, slug) });
});

router.get('/daily', async (req, res) => {
  try {
    const { sign = '', element = '', lang = 'en' } = req.query;
    const horoscope = await generateChineseDaily({ sign, element, lang }); // implement via Groq/fallback
    res.json({ horoscope });
  } catch (e) {
    console.error('chinese daily error:', e.message);
    res.json({ horoscope: 'Balance your Qi with simple acts; harmony follows diligence.' });
  }
});

module.exports = router;






