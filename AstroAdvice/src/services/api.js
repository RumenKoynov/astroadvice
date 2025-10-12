// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';

const TK = 'token';
const RTK = 'refreshToken';

async function _doFetch(url, method, headers, body) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  return { res, data };
}

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem(RTK);
  if (!refreshToken) return null;
  const url = `${API_URL}/auth/refresh`;
  const { res, data } = await _doFetch(url, 'POST', { 'Content-Type': 'application/json' }, { refreshToken });
  if (!res.ok) return null;
  const newToken = data?.token;
  const newRefresh = data?.refreshToken;
  if (newToken) await AsyncStorage.setItem(TK, newToken);
  if (newRefresh) await AsyncStorage.setItem(RTK, newRefresh);
  return newToken || null;
}

export async function apiFetch(path, method = 'GET', body, tokenOverride) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;

  let token = (typeof tokenOverride === 'string' && tokenOverride.trim()) ? tokenOverride.trim() : null;
  if (!token) token = (await AsyncStorage.getItem(TK)) || null;

  let headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (__DEV__) {
    console.log(`[apiFetch] ${method} ${url} auth=`, token ? `${token.slice(0,12)}…` : '(none)');
  }

  let { res, data } = await _doFetch(url, method, headers, body);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      ({ res, data } = await _doFetch(url, method, headers, body));
    }
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}







