import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export interface LiquidGlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const isModernIOS = Platform.OS === 'ios' && parseFloat(Platform.Version as string) >= 26;

export default function LiquidGlassButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}: LiquidGlassButtonProps) {
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.touchable, disabled && styles.disabled, style]}
    >
      <View
        style={[
          styles.container,
          isSecondary && styles.secondaryContainer,
          !isSecondary && variant === 'primary' && styles.primaryGlow,
          !isSecondary && variant === 'danger' && styles.dangerGlow,
        ]}
      >
        {isSecondary ? (
          <>
            <BlurView
              intensity={isModernIOS ? 60 : 25}
              tint={isModernIOS ? 'light' : 'dark'}
              style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
            />
            <LinearGradient
              colors={AURA_COLORS.gradients.subtleGlass}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
              pointerEvents="none"
            />
          </>
        ) : (
          <LinearGradient
            colors={variant === 'danger' ? AURA_COLORS.gradients.danger : AURA_COLORS.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, !!icon && styles.textWithIcon]}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 26,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 26,
    overflow: 'hidden',
  },
  secondaryContainer: {
    backgroundColor: AURA_COLORS.glass.base,
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  primaryGlow: {
    shadowColor: AURA_COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dangerGlow: {
    shadowColor: AURA_COLORS.danger,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  textWithIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.45,
  },
});
