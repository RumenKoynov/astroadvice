const DEFAULT_API_URL = 'https://astroadvice-api-776563982808.europe-west1.run.app';

// Allow optional overrides (e.g., set in debugger or Metro env)
const GLOBAL_OVERRIDE =
  (typeof global !== 'undefined' && global.__ASTRO_API_URL__) ||
  (typeof globalThis !== 'undefined' && globalThis.__ASTRO_API_URL__);

const ENV_OVERRIDE =
  (typeof process !== 'undefined' && process.env && process.env.ASTRO_API_URL) || null;

export const API_URL = GLOBAL_OVERRIDE || ENV_OVERRIDE || DEFAULT_API_URL;
