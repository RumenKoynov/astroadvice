import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme } from '@react-navigation/native';

const ThemeContext = createContext(null);
export const useThemePref = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light'); // 'light' | 'dark'
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('themeMode');
      if (saved === 'dark' || saved === 'light') setMode(saved);
      setHydrated(true);
    })();
  }, []);

  const setTheme = async (next) => {
    setMode(next);
    await AsyncStorage.setItem('themeMode', next);
  };

  const navTheme = mode === 'dark' ? NavDarkTheme : NavLightTheme;

  const value = useMemo(() => ({ mode, setTheme, navTheme, hydrated }), [mode, navTheme, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
