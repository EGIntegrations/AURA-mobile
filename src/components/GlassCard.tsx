import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  children: React.ReactNode;
  cornerRadius?: number;
  padding?: number;
  style?: ViewStyle;
}

export default function GlassCard({
  children,
  cornerRadius = 24,
  padding = 24,
  style,
}: Props) {
  return (
    <BlurView
      intensity={20}
      tint="dark"
      style={[
        styles.container,
        { borderRadius: cornerRadius, padding },
        style,
      ]}
    >
      <View style={styles.overlay}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
