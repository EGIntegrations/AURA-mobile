import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const BG_COLOR = 'rgba(255, 255, 255, 0.15)';

export default function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color = AURA_COLORS.primary,
}: ProgressRingProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const percentage = Math.round(clampedProgress * 100);

  const isOverHalf = clampedProgress > 0.5;
  const rightRotation = isOverHalf ? 0 : 180 - clampedProgress * 360;
  const leftRotation = isOverHalf ? (1 - clampedProgress) * 360 : 180;

  const halfSize = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: BG_COLOR,
          },
        ]}
      />

      {/* Right half progress */}
      <View
        style={[
          styles.halfWrapper,
          {
            right: 0,
            width: halfSize,
            height: size,
            borderTopRightRadius: halfSize,
            borderBottomRightRadius: halfSize,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              left: -halfSize,
              transform: [{ rotate: `${rightRotation}deg` }],
            },
          ]}
        />
      </View>

      {/* Left half progress */}
      <View
        style={[
          styles.halfWrapper,
          {
            left: 0,
            width: halfSize,
            height: size,
            borderTopLeftRadius: halfSize,
            borderBottomLeftRadius: halfSize,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              left: 0,
              transform: [{ rotate: `${leftRotation}deg` }],
            },
          ]}
        />
      </View>

      {/* Center text */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.centerContent}>
          <Text style={[styles.text, { fontSize: size * 0.22 }]}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
  },
  halfWrapper: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: AURA_FONTS.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
