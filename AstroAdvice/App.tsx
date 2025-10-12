import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

// Initialize i18n resources once
import './src/i18n';

import AppNavigator from './src/navigation/AppNavigator';
import {UserProvider} from './src/context/UserContext';
import ThemeProvider, { useThemePref } from './src/context/ThemeContext';
import I18nGate from './src/context/I18nGate';

function ThemedNav() {
  const { navTheme, hydrated } = useThemePref();

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
      <NavigationContainer theme={navTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        {/* Ensure UI language is loaded before nav renders */}
        <I18nGate>
          <ThemedNav />
        </I18nGate>
      </UserProvider>
    </ThemeProvider>
  );
}





