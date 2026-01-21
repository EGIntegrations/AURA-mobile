import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';

interface Props {
  children: React.ReactNode;
  cornerRadius?: number;
  padding?: number;
  style?: ViewStyle;
}

export default function GlassCard({
  children,
  cornerRadius = 12,
  padding = 24,
  style,
}: Props) {
  const snappedRadius = Math.max(6, Math.round(cornerRadius / 4) * 4);
  return (
    <BlurView
      intensity={25}
      tint="dark"
      style={[
        styles.container,
        { borderRadius: snappedRadius, padding },
        style,
      ]}
    >
      <LinearGradient
        colors={AURA_COLORS.gradients.subtleGlass}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.overlay}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: AURA_COLORS.glass.base,
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.border,
    shadowColor: '#0a0f2b',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  overlay: {
    backgroundColor: AURA_COLORS.glass.overlay,
  },
});
