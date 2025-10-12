const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const tarot = require('../data/tarotDescriptions');
const { groqComplete } = require('../lib/groq');
const { normalizeLang } = require('../lib/lang');

function imgUrl(req, id) {
  const base = process.env.API_PUBLIC_BASE || `${req.protocol}://${req.get('host')}`;
  const exts = ['.png','.jpg','.jpeg'];
  const found = exts.find(ext => fs.existsSync(path.join(__dirname,'..','cards', id+ext))) || '.png';
  return `${base}/cards/${id}${found}`;
}

// /draw (unchanged example)
router.get('/draw', (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const ids = Object.keys(tarot);
  const pool = [...ids];
  const pick = [];
  while (pick.length < 3 && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    pick.push(pool.splice(i, 1)[0]);
  }
  const cards = pick.map(id => {
    const meta = tarot[id] || {};
    const name = meta.name?.[lang] || meta.name?.en || id;
    const description = meta.desc?.[lang] || meta.desc?.en || '';
    return { id, name, description, imageUrl: imgUrl(req, id) };
  });
  res.json({ cards });
});

// /reading — rich mystic text in requested language
router.post('/reading', async (req, res) => {
  try {
    const lang = normalizeLang(req.body?.lang || 'en');
    const cards = Array.isArray(req.body?.cards) ? req.body.cards.slice(0,3) : [];
    if (cards.length !== 3) {
      return res.status(400).json({ reading: '', error: 'Need exactly 3 cards' });
    }
    const names = cards.map(c => c?.name || c?.id || 'Unknown');

    const system = `
You are an expert tarot reader with a poetic, mystical voice.
Write clearly structured readings for a mobile app. No health/finance/legal advice.
Always reply in the user's language.
`.trim();

    const user = `
Language: ${lang}
Cards (Past, Present, Future):
- ${names[0]}
- ${names[1]}
- ${names[2]}

Write ~180–240 words with sections:
Past — 2–3 sentences
Present — 2–3 sentences
Future — 3–4 sentences
Caution — 1 sentence naming a small trap to avoid
Opportunity — 1 sentence naming an opening
Affirmation — "<short first-person sentence>"

Tone: warm, oracular, slightly enigmatic yet actionable. No emojis, no bullet lists.
`.trim();

    let reading = '';
    try {
      reading = await groqComplete({
        system,
        user,
        temperature: 0.95,
        max_tokens: 700,
        timeout_ms: 9000,
      });
    } catch (_) {}

    if (!reading) {
      reading = [
        `Past — Echoes of ${names[0]} taught you to carry your own fire without burning your hands.`,
        `Present — ${names[1]} invites steadiness and a gentle refusal of noise.`,
        `Future — With ${names[2]}, a threshold appears if you move with patience and luminous intent.`,
        `Caution — Don’t outrun your intuition to keep up with someone else’s pace.`,
        `Opportunity — A quiet invitation aligns perfectly with your next step.`,
        `Affirmation — "I choose the door that honors my spirit."`,
      ].join('\n');
    }

    return res.json({ reading, lang });
  } catch (e) {
    console.error('tarot reading error:', e.message);
    return res.json({
      reading:
        'Past — You learned to listen between the lines.\nPresent — Choose the truest small action.\nFuture — What you seek starts seeking you.\nCaution — Beware hasty bargains.\nOpportunity — An ally appears when you speak plainly.\nAffirmation — "I walk with clear intent."',
    });
  }
});

module.exports = router;








