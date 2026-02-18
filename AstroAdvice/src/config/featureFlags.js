// src/sonfig/featureFlags.js
export const DEV_OVERRIDE_KEY = 'debug_is_developer';
export const is_dev = false;
let devOverride = null; // null => follow __DEV__

const compute = () => (devOverride === null ? __DEV__ : devOverride);

export let BYPASS_DAILY_LIMITS = compute(); // true in dev, false in prod

export function setDeveloperMode(enabled) {
  devOverride = (enabled === null || typeof enabled === 'undefined') ? null : !!enabled;
  const next = compute();
  BYPASS_DAILY_LIMITS = next;
}

export function getDeveloperMode() {
  return compute();
}
