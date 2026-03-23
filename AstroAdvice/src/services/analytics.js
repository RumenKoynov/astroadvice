import analytics from '@react-native-firebase/analytics';

const normalizeParam = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  return String(value);
};

const normalizeParams = (params = {}) => {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    const next = normalizeParam(value);
    if (next !== undefined) out[key] = next;
  });
  return out;
};

export async function logEvent(name, params) {
  try {
    await analytics().logEvent(name, normalizeParams(params));
  } catch {
    // no-op
  }
}

let lastScreenName = null;
let lastScreenTs = 0;

export async function logScreen(name) {
  try {
    if (!name) return;
    const now = Date.now();
    if (lastScreenName === name && now - lastScreenTs < 1500) return;
    lastScreenName = name;
    lastScreenTs = now;
    await analytics().logScreenView({ screen_name: name, screen_class: name });
  } catch {
    // no-op
  }
}
