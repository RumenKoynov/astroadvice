import React from 'react';
import { Text, StyleSheet } from 'react-native';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return <Text style={styles.text}>{message}</Text>;
}
const styles = StyleSheet.create({
  text: { color: '#C62828', marginBottom: 8 },
});
