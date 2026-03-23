const express = require('express');
const { numberReadings } = require('../data/numberReadings');

const router = express.Router();

const LANGS = new Set(['en', 'bg', 'ru', 'es', 'tr', 'fr', 'de', 'it']);

router.get('/number/:value', (req, res) => {
  const value = Number(req.params.value);
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    return res.status(400).json({ error: 'Invalid number' });
  }

  const entry = numberReadings[value];
  if (!entry) {
    return res.status(404).json({ error: 'Number reading not found' });
  }

  const langRaw = typeof req.query.lang === 'string' ? req.query.lang : 'en';
  const langKey = langRaw.split('-')[0];
  const lang = LANGS.has(langKey) && entry.title?.[langKey] ? langKey : 'en';

  return res.json({
    number: value,
    lang,
    title: entry.title?.[lang],
    meaning: entry.meaning?.[lang],
    advice: entry.advice?.[lang],
  });
});

module.exports = router;
