import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../../config/admob';
import { logEvent } from '../../services/analytics';

export default function AdBanner({ unitId, placement }) {
  const insets = useSafeAreaInsets();
  const loggedRef = useRef(false);
  if (!unitId) return null;
  return (
    <View style={[styles.wrap, { paddingBottom: 10 + insets.bottom }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={AD_REQUEST_OPTIONS}
        onAdLoaded={() => {
          if (loggedRef.current) return;
          loggedRef.current = true;
          logEvent('ad_impression_shown', {
            placement: placement || unitId,
            ad_type: 'banner',
          });
        }}
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
