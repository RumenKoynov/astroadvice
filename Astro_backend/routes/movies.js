const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const MOVIES_PATH = path.join(__dirname, '..', 'movies.json');
const SUPPORTED_LANGS = new Set(['en', 'bg', 'ru', 'es', 'tr', 'fr', 'de', 'it']);

let cache = { mtimeMs: 0, data: [] };

function normalizeLang(raw) {
  const lang = (raw || 'en').toLowerCase();
  const key = lang.split('-')[0];
  return SUPPORTED_LANGS.has(key) ? key : 'en';
}

function loadMovies() {
  try {
    const stat = fs.statSync(MOVIES_PATH);
    if (stat.mtimeMs !== cache.mtimeMs) {
      const raw = fs.readFileSync(MOVIES_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      cache = { mtimeMs: stat.mtimeMs, data: Array.isArray(parsed) ? parsed : [] };
    }
    return cache.data;
  } catch {
    return [];
  }
}

function hashString(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

router.get('/quote', (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const dateKey = (req.query.date || new Date().toISOString().slice(0, 10)).toString();
  const list = loadMovies();
  if (!list.length) {
    return res.status(500).json({ error: 'No movie quotes available' });
  }
  const index = hashString(dateKey) % list.length;
  const item = list[index] || list[0];

  const pick = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };
  const actors = (item.actors && (item.actors[lang] || item.actors.en)) || [];

  return res.json({
    date: dateKey,
    id: item.id ?? index,
    quote: pick(item.quote),
    movie: pick(item.movie),
    actors: Array.isArray(actors) ? actors : [],
    year: item.year || '',
    lang,
  });
});

module.exports = router;
