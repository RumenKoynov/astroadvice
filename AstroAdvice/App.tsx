import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/utils/nav';
import mobileAds from 'react-native-google-mobile-ads';
import DeviceInfo from 'react-native-device-info';

// Initialize i18n resources once
import './src/i18n';

import AppNavigator from './src/navigation/AppNavigator';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import {UserProvider} from './src/context/UserContext';
import ThemeProvider, { useThemePref } from './src/context/ThemeContext';
import I18nGate from './src/context/I18nGate';
import { apiFetch } from './src/services/api';
import { logScreen } from './src/services/analytics';
import { compareVersions } from './src/utils/version';

function ThemedNav() {
  const { navTheme, hydrated } = useThemePref();
  const routeNameRef = useRef(null);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isDark = navTheme?.dark === true;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          const current = navigationRef.getCurrentRoute()?.name;
          if (current) {
            routeNameRef.current = current;
            logScreen(current);
          }
        }}
        onStateChange={() => {
          const current = navigationRef.getCurrentRoute()?.name;
          if (current && routeNameRef.current !== current) {
            routeNameRef.current = current;
            logScreen(current);
          }
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [forceUpdate, setForceUpdate] = useState(false);
  const [appConfigChecked, setAppConfigChecked] = useState(false);
  const [storeUrl, setStoreUrl] = useState('https://play.google.com/store/apps/details?id=com.astroadvice');

  useEffect(() => {
    mobileAds().initialize();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await apiFetch('/app-config', 'GET');
        if (!active) return;
        const minVersionAndroid = cfg?.minVersionAndroid;
        const url = cfg?.playStoreUrlAndroid;
        if (url) setStoreUrl(url);
        if (Platform.OS === 'android' && minVersionAndroid) {
          const installed = DeviceInfo.getVersion();
          setForceUpdate(compareVersions(installed, minVersionAndroid) < 0);
        }
      } catch {
        if (active) setForceUpdate(false);
      } finally {
        if (active) setAppConfigChecked(true);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        {/* Ensure UI language is loaded before nav renders */}
        <I18nGate>
          {!appConfigChecked ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            forceUpdate
              ? <ForceUpdateScreen storeUrl={storeUrl} />
              : <ThemedNav />
          )}
        </I18nGate>
      </UserProvider>
    </ThemeProvider>
  );
}
