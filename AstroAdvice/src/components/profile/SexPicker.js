import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const SEXES = ['female', 'male'];

export default function SexPicker({ value, onChange }) {
  const { colors, dark } = useTheme();
  const { t } = useTranslation(); // defaults to 'common' NS now


  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, {color: colors.text}]}>{t("sex")}</Text>
      <Picker selectedValue={value} onValueChange={onChange} style={[styles.picker, {color: colors.text}]}>
        <Picker.Item label="Select" value="" />
        {SEXES.map(s => <Picker.Item key={s} label={s} value={s} style={colors.text} />)}
      </Picker>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
});
