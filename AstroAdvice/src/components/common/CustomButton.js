import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function CustomButton({ title, onPress, variant = 'primary' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, variant === 'link' ? styles.linkBtn : styles.primaryBtn]}
    >
      <Text style={variant === 'link' ? styles.linkText : styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  primaryBtn: { backgroundColor: '#4C6FFF' },
  primaryText: { color: '#fff', fontWeight: '600' },
  linkBtn: { backgroundColor: 'transparent' },
  linkText: { color: '#4C6FFF', fontWeight: '600' },
});
