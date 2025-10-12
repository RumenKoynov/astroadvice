import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';



const LANGS = ['English', 'Bulgarian', 'Turkish', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'];

export default function LanguagePicker({ value, onChange }) {
  const { colors, dark } = useTheme();
  const { t } = useTranslation(); // defaults to 'common' NS now
  
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, {color: colors.text}]}>{t('language')}</Text>
      <Picker selectedValue={value} onValueChange={onChange} style={[styles.picker, {color: colors.text}]}>
        {LANGS.map(l => <Picker.Item key={l} label={l} value={l} />)}
      </Picker>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  picker: { },
});

