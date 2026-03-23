export function getLocalized(card, lang) {
  return {
    name: card.name[lang] || card.name.en,
    keywords: card.keywords[lang] || card.keywords.en,
    meaning: card.meaning[lang] || card.meaning.en,
    advice: card.advice[lang] || card.advice.en,
  };
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleOthers(cards, excludeId, count) {
  const pool = cards.filter(c => c.id !== excludeId);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function normalizeKeywords(value) {
  if (!value) return '';
  return String(value)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}

export function buildQuizQuestions(cards, lang, count = 5) {
  const deck = shuffle(cards);
  const picked = deck.slice(0, Math.min(count, deck.length));
  return picked.map(card => {
    const others = sampleOthers(cards, card.id, 3);
    const options = shuffle([card, ...others]).map(c => ({
      id: c.id,
      label: normalizeKeywords(c.keywords[lang] || c.keywords.en),
    }));
    return {
      id: card.id,
      imageId: card.id,
      options,
      answerId: card.id,
    };
  });
}
