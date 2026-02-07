// src/utils/api.js
// Using adb reverse (tcp:3000 -> tcp:3000) lets the emulator reach localhost.
const API_BASE = 'http://localhost:3000';
// 👆 replace with your backend IP:port, e.g. http://192.168.1.5:3000

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
