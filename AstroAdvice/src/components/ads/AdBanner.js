import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../../config/admob';

export default function AdBanner({ unitId }) {
  const insets = useSafeAreaInsets();
  if (!unitId) return null;
  return (
    <View style={[styles.wrap, { paddingBottom: 10 + insets.bottom }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={AD_REQUEST_OPTIONS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
