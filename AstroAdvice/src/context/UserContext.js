import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'astro_user_v1';
const UserCtx = createContext(undefined);

export function UserProvider({ children }) {
  const [state, setState] = useState({
    language: 'en',
    theme: 'dark',      // 'light' | 'dark'
    sex: '',
    dob: '',            // ISO date
    westernZodiac: '',  // derived
    chineseSign: '',    // derived
    chineseElement: '', // derived
    // daily caches
    daily: {
      advice: {},                 // {'YYYY-MM-DD': { sign, text }}
      tarotSingle: {},            // {date: { card }}
      tarotThree: {},             // {date: { cards, reading }}
      chineseHoroscope: {},       // {date: { slug, horoscope }}
    },
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setState(JSON.parse(raw));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const save = useCallback(async (next) => {
    setState(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const patch = useCallback(async (patcher) => {
    setState(prev => {
      const next = typeof patcher === 'function' ? patcher(prev) : { ...prev, ...patcher };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    ...state,
    hydrated,
    setAll: save,
    setLanguage: (language) => patch({ language }),
    setTheme: (theme) => patch({ theme }),
    setProfile: (p) => patch({ ...p }),
    setDaily: (dateKey, bucket, payload) =>
      patch(prev => ({
        ...prev,
        daily: {
          ...prev.daily,
          [bucket]: { ...(prev.daily?.[bucket] || {}), [dateKey]: payload }
        }
      })),
    clearDaily: () => patch(prev => ({ ...prev, daily: { advice:{}, tarotSingle:{}, tarotThree:{}, chineseHoroscope:{} } })),
  }), [state, hydrated, save, patch]);

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser() {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
