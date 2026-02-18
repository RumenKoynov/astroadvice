// src/utils/api.js
import { API_URL } from '../config/env';

// For local dev, update API_URL in src/config/env.js (adb reverse works for emulators).
const API_BASE = API_URL;

export default async function api(endpoint, method = 'GET', body, token) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);

  if (!res.ok) {
    let errorMsg = 'API error';
    try {
      const err = await res.json();
      errorMsg = err.message || JSON.stringify(err);
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}
