// src/components/profile/ZodiacSignPicker.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SIGN_IDS } from '../../i18n/zodiacMap';

export default function ZodiacSignPicker({ value, onChange }) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{t('zodiac')}</Text>
      <View style={{ borderWidth: 1, borderRadius: 8, borderColor: colors.border, backgroundColor: colors.card }}>
        <Picker
          selectedValue={value}            // value is the canonical ID (e.g., 'aries')
          onValueChange={onChange}
          style={{ color: colors.text }}
          dropdownIconColor={colors.text}
        >
          <Picker.Item label={t('zodiac')} value="" />
          {SIGN_IDS.map(id => (
            <Picker.Item key={id} label={t(`zodiac_signs.${id}`)} value={id} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
});


