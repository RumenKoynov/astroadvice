// server/lib/lang.js
// We expect short codes in your datasets: en, bg, ru, fr, de, tr
const MAP = {
  english: 'en',
  bulgarian: 'bg',
  russian: 'ru',
  french: 'fr',
  german: 'de',
  turkish: 'tr',
  spanish: 'es',
  italian: 'it',
  // also accept uppercase inputs
  EN: 'en', BG: 'bg', RU: 'ru', FR: 'fr', DE: 'de', TR: 'tr', ES: 'es', IT: 'it',
};

function normalizeLang(input) {
  if (!input) return 'en';
  const s = String(input).trim().toLowerCase();
  return MAP[s] || s; // if already 'en','bg',... keep it
}

module.exports = { normalizeLang };
