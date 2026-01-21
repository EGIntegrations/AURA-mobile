import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

interface Props {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

export default function LiquidGlassHeader({ title, onBack, rightSlot, style }: Props) {
  const useLiquidGlass =
    Platform.OS === 'ios' && Number(Platform.Version) >= 26;

  const content = (
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpacer} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightSlot}>{rightSlot ?? <View style={styles.sideSpacer} />}</View>
    </View>
  );

  if (useLiquidGlass) {
    return (
      <BlurView intensity={45} tint="dark" style={[styles.container, style]}>
        <LinearGradient
          colors={AURA_COLORS.gradients.subtleGlass}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {content}
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, styles.plain, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.border,
  },
  plain: {
    backgroundColor: 'rgba(20, 24, 45, 0.4)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.6,
  },
  rightSlot: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  sideSpacer: {
    width: 60,
  },
});
