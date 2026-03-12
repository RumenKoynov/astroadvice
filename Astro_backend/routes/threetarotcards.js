const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const tarot = require('../data/tarotDescriptions');
const { openaiComplete } = require('../lib/openai');
const { normalizeLang } = require('../lib/lang');

const SECTION_LABELS = {
  en: {
    past: 'Past',
    present: 'Present',
    future: 'Future',
    caution: 'Caution',
    opportunity: 'Opportunity',
    affirmation: 'Affirmation',
  },
  bg: {
    past: '\u041c\u0438\u043d\u0430\u043b\u043e',
    present: '\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0435',
    future: '\u0411\u044a\u0434\u0435\u0449\u0435',
    caution: '\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435',
    opportunity: '\u0412\u044a\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442',
    affirmation: '\u0423\u0442\u0432\u044a\u0440\u0436\u0434\u0435\u043d\u0438\u0435',
  },
  ru: {
    past: '\u041f\u0440\u043e\u0448\u043b\u043e\u0435',
    present: '\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0435\u0435',
    future: '\u0411\u0443\u0434\u0443\u0449\u0435\u0435',
    caution: '\u041e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u043e\u0441\u0442\u044c',
    opportunity: '\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u044c',
    affirmation: '\u0410\u0444\u0444\u0438\u0440\u043c\u0430\u0446\u0438\u044f',
  },
  fr: {
    past: 'Pass\u00e9',
    present: 'Pr\u00e9sent',
    future: 'Futur',
    caution: 'Prudence',
    opportunity: 'Opportunit\u00e9',
    affirmation: 'Affirmation',
  },
  de: {
    past: 'Vergangenheit',
    present: 'Gegenwart',
    future: 'Zukunft',
    caution: 'Vorsicht',
    opportunity: 'Chance',
    affirmation: 'Best\u00e4tigung',
  },
  tr: {
    past: 'Ge\u00e7mi\u015f',
    present: '\u015eimdi',
    future: 'Gelecek',
    caution: 'Dikkat',
    opportunity: 'F\u0131rsat',
    affirmation: 'Onaylama',
  },
  es: {
    past: 'Pasado',
    present: 'Presente',
    future: 'Futuro',
    caution: 'Precauci\u00f3n',
    opportunity: 'Oportunidad',
    affirmation: 'Afirmaci\u00f3n',
  },
  it: {
    past: 'Passato',
    present: 'Presente',
    future: 'Futuro',
    caution: 'Attenzione',
    opportunity: 'Opportunit\u00e0',
    affirmation: 'Affermazione',
  },
};

function getSectionLabels(lang) {
  return SECTION_LABELS[lang] || SECTION_LABELS.en;
}

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
    const labels = getSectionLabels(lang);
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
Cards (${labels.past}, ${labels.present}, ${labels.future}):
- ${names[0]}
- ${names[1]}
- ${names[2]}

Write ~180-240 words with sections:
${labels.past} - 2-3 sentences
${labels.present} - 2-3 sentences
${labels.future} - 3-4 sentences
${labels.caution} - 1 sentence naming a small trap to avoid
${labels.opportunity} - 1 sentence naming an opening
${labels.affirmation} - "<short first-person sentence>"

Tone: warm, oracular, slightly enigmatic yet actionable. No emojis, no bullet lists.
`.trim();

    let reading = '';
    try {
      reading = await openaiComplete({
        system,
        user,
        temperature: 0.95,
        max_tokens: 700,
        timeout_ms: 9000,
      });
    } catch (_) {}

    if (!reading) {
      reading = [
        `${labels.past} - Echoes of ${names[0]} taught you to carry your own fire without burning your hands.`,
        `${labels.present} - ${names[1]} invites steadiness and a gentle refusal of noise.`,
        `${labels.future} - With ${names[2]}, a threshold appears if you move with patience and luminous intent.`,
        `${labels.caution} - Don't outrun your intuition to keep up with someone else's pace.`,
        `${labels.opportunity} - A quiet invitation aligns perfectly with your next step.`,
        `${labels.affirmation} - "I choose the door that honors my spirit."`,
      ].join('\n');
    }

    return res.json({ reading, lang });
  } catch (e) {
    console.error('tarot reading error:', e.message);
    const lang = normalizeLang(req.body?.lang || 'en');
    const labels = getSectionLabels(lang);
    return res.json({
      reading:
        `${labels.past} - You learned to listen between the lines.\n` +
        `${labels.present} - Choose the truest small action.\n` +
        `${labels.future} - What you seek starts seeking you.\n` +
        `${labels.caution} - Beware hasty bargains.\n` +
        `${labels.opportunity} - An ally appears when you speak plainly.\n` +
        `${labels.affirmation} - "I walk with clear intent."`,
    });
  }
});

module.exports = router;








