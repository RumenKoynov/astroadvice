import { NativeModules, Platform } from 'react-native';

const mod = NativeModules.TikTokSdk;

const isAvailable = Platform.OS === 'android' && !!mod;

const safeStr = (v) => (v === undefined || v === null ? '' : String(v));

export function tiktokIdentify({ externalId, externalUserName, phoneNumber, email } = {}) {
  if (!isAvailable) return;
  try {
    mod.identify(safeStr(externalId), safeStr(externalUserName), safeStr(phoneNumber), safeStr(email));
  } catch {
    // no-op
  }
}

export function tiktokLogout() {
  if (!isAvailable) return;
  try {
    mod.logout();
  } catch {
    // no-op
  }
}

export function tiktokTrackEvent(name, params) {
  if (!isAvailable) return;
  if (!name) return;
  try {
    mod.trackEvent(String(name), params ?? null);
  } catch {
    // no-op
  }
}

export function tiktokTrackTTEvent(name, params, eventId) {
  if (!isAvailable) return;
  if (!name) return;
  try {
    mod.trackTTEvent(String(name), params ?? null, safeStr(eventId));
  } catch {
    // no-op
  }
}

export function tiktokTrackStandardEvent(name, eventId) {
  if (!isAvailable) return;
  if (!name) return;
  try {
    mod.trackStandardEvent(String(name), safeStr(eventId));
  } catch {
    // no-op
  }
}

export function tiktokEnableDebugMode(enabled) {
  if (!isAvailable) return;
  try {
    if (enabled) mod.enableDebugMode();
    else mod.disableDebugMode();
  } catch {
    // no-op
  }
}
