import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function HistoryList({ items }) {
  const { colors } = useTheme();
  const { t } = useTranslation(); // defaults to 'common' NS now

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>History</Text>
      <FlatList
        text={colors.text}
        data={items}
        keyExtractor={(item) => String(item.ts)}
        renderItem={({ item }) => <Text style={styles.item}>• {item.text}</Text>}
        ListEmptyComponent={<Text style={styles.empty}>{t("No history yet")}</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 8 },
  title: { fontWeight: '600', marginBottom: 6 },
  item: { marginBottom: 6 },
  empty: { color: '#888' },
});
