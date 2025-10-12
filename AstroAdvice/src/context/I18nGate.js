import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { getDeviceDefaultUILang } from '../i18n'; // you already exported this earlier

export default function I18nGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('uiLanguage');
        const lang = saved || getDeviceDefaultUILang(); // 'en' | 'bg' | 'tr' | 'es'
        if (lang && lang !== i18n.language) {
          await i18n.changeLanguage(lang);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return children;
}
