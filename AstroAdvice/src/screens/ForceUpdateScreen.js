import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { logScreen } from '../services/analytics';

export default function ForceUpdateScreen({ storeUrl }) {
  const { t } = useTranslation('common');
  useEffect(() => {
    logScreen('ForceUpdate');
  }, []);
  const onUpdate = () => {
    if (storeUrl) Linking.openURL(storeUrl);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('update_required_title') || 'Update required'}</Text>
      <Text style={styles.body}>
        {t('update_required_body') || 'Please update the app to continue.'}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onUpdate} activeOpacity={0.9}>
        <Text style={styles.btnText}>{t('update_required_cta') || 'Update on Google Play'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#120b1d',
  },
  title: {
    color: '#ffe7c2',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: '#e9e0ff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.4)',
    backgroundColor: '#2b1f3a',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
