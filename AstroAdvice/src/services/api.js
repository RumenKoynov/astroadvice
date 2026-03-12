// src/services/api.js
import { API_URL } from '../config/env';

async function _doFetch(url, method, headers, body) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  return { res, data };
}

export async function apiFetch(path, method = 'GET', body) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };

  if (__DEV__) {
    console.log(`[apiFetch] ${method} ${url}`);
  }

  const { res, data } = await _doFetch(url, method, headers, body);
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}







