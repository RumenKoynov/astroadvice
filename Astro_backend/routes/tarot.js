const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const tarot = require('../data/tarotDescriptions'); // { id: { name:{}, desc:{} } }
const { openaiComplete } = require('../lib/openai');

const SUPPORTED_LANGS = new Set(['en', 'bg', 'ru', 'es', 'tr', 'fr', 'de', 'it']);

function normalizeLang(raw) {
  const lang = (raw || 'en').toLowerCase();
  const key = lang.split('-')[0];
  return SUPPORTED_LANGS.has(key) ? key : 'en';
}

function getLifeStage(age) {
  if (typeof age !== 'number' || Number.isNaN(age)) return '';
  if (age < 18) return 'teen';
  if (age <= 25) return 'young adult';
  if (age <= 40) return 'adult';
  if (age <= 60) return 'mature adult';
  return 'elder';
}

function buildImgUrl(req, id) {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const base =
    process.env.API_PUBLIC_BASE ||
    `${proto}://${req.get('host')}`;
  const exts = ['.png', '.jpg', '.jpeg'];
  const found = exts.find(ext => fs.existsSync(path.join(__dirname, '..', 'cards', id + ext)));
  return `${base}/cards/${id}${found || '.png'}`;
}

router.get('/random', (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const full =
    req.query.full === '1' ||
    req.query.full === 'true' ||
    req.query.reading === '1' ||
    req.query.reading === 'true';
  const idParam = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  const sex = typeof req.query.sex === 'string' ? req.query.sex.trim() : '';
  const ageRaw = typeof req.query.age === 'string' ? req.query.age.trim() : '';
  const ageNum = ageRaw ? Number(ageRaw) : NaN;
  const age = Number.isFinite(ageNum) ? ageNum : null;
  const lifeStage = getLifeStage(age);
  const ids = Object.keys(tarot);
  const id = (idParam && tarot[idParam]) ? idParam : ids[Math.floor(Math.random() * ids.length)];
  const meta = tarot[id] || {};
  const name = (meta.name && (meta.name[lang] || meta.name.en)) || id;
  const baseDescription = (meta.desc && (meta.desc[lang] || meta.desc.en)) || '';

  const buildReading = async () => {
    if (!full || !process.env.OPENAI_API_KEY) return '';
    const system = [
      'You are a mystical tarot reader.',
      `Write in ${lang}.`,
      'Use second person.',
      'Write 4-6 sentences.',
      'Be warm, positive, and reflective.',
      'Avoid headings, bullet points, or lists.',
      'Link the card meaning to the querent’s age/sex and life stage in a respectful, inclusive way.',
    ].join(' ');
    const userPrompt = [
      `Card: ${name}.`,
      baseDescription ? `Base meaning: ${baseDescription}.` : '',
      sex ? `Sex: ${sex}.` : 'Sex: not specified.',
      age ? `Age: ${age}.` : 'Age: not specified.',
      lifeStage ? `Life stage: ${lifeStage}.` : '',
    ].filter(Boolean).join(' ');
    return openaiComplete({
      system,
      user: userPrompt,
      temperature: 0.8,
      max_tokens: 240,
      logTag: 'tarot_single_reading',
    });
  };

  Promise.resolve(buildReading()).then((reading) => {
    const finalReading = reading && reading.length > 30 ? reading : '';
    return res.json({
      id,
      name,
      description: baseDescription,
      baseDescription,
      reading: finalReading || '',
      imageUrl: buildImgUrl(req, id),
    });
  });
});

module.exports = router;




