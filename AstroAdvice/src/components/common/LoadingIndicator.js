import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function LoadingIndicator() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
});
