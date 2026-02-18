import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeMediaView,
  NativeAssetType,
  NativeMediaAspectRatio,
} from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../../config/admob';

export default function NativeAdCard({ unitId }) {
  const [nativeAd, setNativeAd] = useState(null);

  useEffect(() => {
    if (!unitId) return () => {};
    let active = true;
    let loadedAd = null;
    NativeAd.createForAdRequest(unitId, {
      ...AD_REQUEST_OPTIONS,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
    })
      .then((ad) => {
        loadedAd = ad;
        if (active) setNativeAd(ad);
        else ad.destroy();
      })
      .catch(() => {});

    return () => {
      active = false;
      if (loadedAd) loadedAd.destroy();
    };
  }, [unitId]);

  if (!unitId || !nativeAd) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sponsored}>Sponsored</Text>
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <NativeMediaView style={styles.media} />

        <View style={styles.row}>
          {!!nativeAd.icon?.url && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}

          <View style={styles.texts}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={1}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            {!!nativeAd.body && (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.body} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            )}
          </View>
        </View>

        {!!nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
            </View>
          </NativeAsset>
        )}
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sponsored: {
    color: '#d8d8d8',
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  card: {
    width: '100%',
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  texts: { flex: 1 },
  headline: { color: '#fff', fontWeight: '800', fontSize: 14 },
  body: { color: '#e6e6e6', fontSize: 12, marginTop: 2 },
  cta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffd262',
  },
  ctaText: { color: '#2b1f3a', fontWeight: '800', fontSize: 12 },
});
