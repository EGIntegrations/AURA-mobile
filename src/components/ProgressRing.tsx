import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AURA_FONTS } from '../theme/typography';

export interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function ProgressRing({
  progress: rawProgress,
  size = 120,
  strokeWidth = 10,
  color = '#5B7CFF',
}: ProgressRingProps) {
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const halfSize = size / 2;

  let rightDeg = 0;
  let leftDeg = 0;

  if (progress <= 0.5) {
    rightDeg = -180 + progress * 360;
    leftDeg = -180;
  } else {
    rightDeg = 0;
    leftDeg = -180 + (progress - 0.5) * 360;
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Track ring */}
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
          },
        ]}
      />

      {/* Fill layer */}
      <View style={StyleSheet.absoluteFill}>
        {/* Right half wrapper */}
        <View
          style={[
            styles.halfWrapper,
            { left: halfSize, width: halfSize, height: size },
          ]}
        >
          <View
            style={[
              styles.fillCircle,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                left: -halfSize,
                transform: [{ rotate: `${rightDeg}deg` }],
              },
            ]}
          />
        </View>

        {/* Left half wrapper */}
        <View
          style={[
            styles.halfWrapper,
            { left: 0, width: halfSize, height: size },
          ]}
        >
          <View
            style={[
              styles.fillCircle,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                left: 0,
                transform: [{ rotate: `${leftDeg}deg` }],
              },
            ]}
          />
        </View>
      </View>

      {/* Center text */}
      <View style={[StyleSheet.absoluteFill, styles.centerContent]}>
        <Text style={[styles.percentText, { fontSize: size * 0.25 }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  halfWrapper: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  fillCircle: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontFamily: AURA_FONTS.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
