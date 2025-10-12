
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function ThemedTextInput({
  style,
  placeholder,
  value = '',
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  ...rest
}) {
  const { colors, dark } = useTheme();

  return (
    <TextInput
      style={[
        styles.input,
        {
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#fff',
        },
        style,
      ]}
      placeholder={placeholder}
      placeholderTextColor={dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'}
      value={value ?? ''}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      selectionColor={colors.primary || '#7B1FA2'}
      keyboardAppearance={dark ? 'dark' : 'light'}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
});
