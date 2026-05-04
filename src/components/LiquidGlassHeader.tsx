import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export interface LiquidGlassHeaderProps {
  title: string;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

const isModernIOS = Platform.OS === 'ios' && parseFloat(Platform.Version as string) >= 26;

export default function LiquidGlassHeader({
  title,
  onBackPress,
  rightElement,
  style,
}: LiquidGlassHeaderProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.leftSlot}>
        {onBackPress ? (
          <TouchableOpacity onPress={onBackPress} activeOpacity={0.7}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSpacer} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightSlot}>
        {rightElement ?? <View style={styles.sideSpacer} />}
      </View>
    </View>
  );

  if (isModernIOS) {
    return (
      <View style={[styles.container, style]}>
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={AURA_COLORS.gradients.subtleGlass}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {content}
      </View>
    );
  }

  // Fallback for Android and older iOS
  return (
    <View style={[styles.container, styles.fallback, style]}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={AURA_COLORS.gradients.subtleGlass}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  fallback: {
    backgroundColor: 'rgba(20, 24, 45, 0.4)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSlot: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  rightSlot: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  backButton: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.6,
  },
  sideSpacer: {
    width: 60,
  },
});
