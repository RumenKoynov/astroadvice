// src/sonfig/featureFlags.js
export const DEV_OVERRIDE_KEY = 'debug_is_developer';
let devOverride = null; // null => follow __DEV__

const compute = () => (devOverride === null ? __DEV__ : devOverride);

export let BYPASS_DAILY_ZODIAC_LIMIT = compute();   // true in dev, false in prod
export let BYPASS_DAILY_READING_LIMIT = compute();  // ThreeTarot
export let BYPASS_DAILY_CHINESE_LIMIT = compute();  // Chinese horoscope
export let BYPASS_DAILY_ADVICE_LIMIT = compute();   // Daily advice
export let BYPASS_DAILY_SINGLE_LIMIT = compute();   // Single tarot

export function setDeveloperMode(enabled) {
  devOverride = (enabled === null || typeof enabled === 'undefined') ? null : !!enabled;
  const next = compute();
  BYPASS_DAILY_ZODIAC_LIMIT = next;
  BYPASS_DAILY_READING_LIMIT = next;
  BYPASS_DAILY_CHINESE_LIMIT = next;
  BYPASS_DAILY_ADVICE_LIMIT = next;
  BYPASS_DAILY_SINGLE_LIMIT = next;
}

export function getDeveloperMode() {
  return compute();
}
