import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  cornerRadius?: number;
  padding?: number;
}

const isModernIOS = Platform.OS === 'ios' && parseFloat(Platform.Version as string) >= 26;

export default function LiquidGlassCard({
  children,
  style,
  intensity,
  cornerRadius = 24,
  padding = 24,
}: LiquidGlassCardProps) {
  const blurIntensity = intensity ?? (isModernIOS ? 60 : 25);
  const tint = isModernIOS ? 'light' : 'dark';

  return (
    <View
      style={[
        styles.wrapper,
        { borderRadius: cornerRadius },
        style,
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
      />
      <LinearGradient
        colors={AURA_COLORS.gradients.subtleGlass}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
        pointerEvents="none"
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: AURA_COLORS.glass.base,
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.borderLight,
    shadowColor: '#0a0f2b',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
