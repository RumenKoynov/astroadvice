import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import LoadingIndicator from '../common/LoadingIndicator';
import CustomButton from '../common/CustomButton';
import { useTranslation } from 'react-i18next';

export default function DailyAdviceCard({ onNeedAdvice }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme(); // <-- theme colors
  const { t } = useTranslation(); // defaults to 'common' NS now

  const getAdvice = async () => {
    setLoading(true);
    const result = await onNeedAdvice();
    setAdvice(result || 'No advice available.');
    setLoading(false);
  };

  useEffect(() => {
    getAdvice(); // fetch on mount
  }, []);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border }
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t("daily_advice")}</Text>
      {loading ? (
        <LoadingIndicator />
      ) : (
        <Text style={[styles.body, { color: colors.text }]}>{advice}</Text>
      )}
      <CustomButton title={t("new_advice")} onPress={getAdvice} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16 },
});

