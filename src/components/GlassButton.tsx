import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  onPress: () => void;
  style?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  customStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GlassButton({
  title,
  onPress,
  style = 'primary',
  disabled = false,
  customStyle,
  textStyle,
}: Props) {
  const getColors = () => {
    switch (style) {
      case 'primary':
        return ['#0ea5e9', '#0284c7'];
      case 'secondary':
        return ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'];
      case 'danger':
        return ['#ef4444', '#dc2626'];
      default:
        return ['#0ea5e9', '#0284c7'];
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[customStyle]}
    >
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
