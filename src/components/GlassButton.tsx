import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

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
        return AURA_COLORS.gradients.primary;
      case 'secondary':
        return ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'];
      case 'danger':
        return AURA_COLORS.gradients.danger;
      default:
        return AURA_COLORS.gradients.primary;
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
});
