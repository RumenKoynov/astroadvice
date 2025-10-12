// src/navigation/AppNavigator.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { isProfileComplete } from '../utils/profile';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StandartZodiacScreen from '../screens/StandartZodiacScreen';
import ChineseHoroscopeScreen from '../screens/ChineseHoroscopeScreen';
import TarotScreen from '../screens/TarotScreen';
import ThreeTarotCardsScreen from '../screens/ThreeTarotCardsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { t } = useTranslation('common');
  const user = useUser();

  // Wait until AsyncStorage is loaded so we don't flash the wrong stack
  if (!user.hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const complete = isProfileComplete(user);

  if (!complete) {
    // 🔒 Onboarding stack — force users to complete Profile first
    return (
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          animation: 'fade',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: t('profile') || 'Profile' }}
        />
        {/* (Optional) allow Settings too */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('settings') || 'Settings' }}
        />
      </Stack.Navigator>
    );
  }

  // ✅ Main app stack
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTitleAlign: 'center',
        animation: 'fade',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('home_title') || 'AstroAdvice' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile') || 'Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings') || 'Settings' }}
      />
      <Stack.Screen
        name="StandartZodiac"
        component={StandartZodiacScreen}
        options={{ title: t('zodiac') || 'Zodiac' }}
      />
      <Stack.Screen
        name="ChineseHoroscope"
        component={ChineseHoroscopeScreen}
        options={{ title: t('chinese') || 'Chinese' }}
      />
      <Stack.Screen
        name="Tarot"
        component={TarotScreen}
        options={{ title: t('tarot') || 'Tarot' , headerShown: false}}
        
      />
      <Stack.Screen
        name="ThreeTarot"
        component={ThreeTarotCardsScreen}
        options={{ title: t('three_cards') || 'Three Cards' , headerShown: false}}
      />
    </Stack.Navigator>
  );
}








