import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function AgeInput({ value, onChange }) {

  const { colors, dark } = useTheme();
  const { t } = useTranslation(); // defaults to 'common' NS now

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, {color: colors.text}]}>{t("age")}</Text>
      <TextInput
        style={[styles.input, {color: colors.text}]}
        placeholder="e.g. 26"
        keyboardType="numeric"
        value={String(value || '')}
        onChangeText={onChange}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
});
