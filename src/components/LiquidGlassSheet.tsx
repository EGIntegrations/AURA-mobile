import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { AURA_FONTS } from '../theme/typography';
import LiquidGlassCard from './LiquidGlassCard';

export interface LiquidGlassSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LiquidGlassSheet({
  visible,
  onClose,
  title,
  children,
}: LiquidGlassSheetProps) {
  const [showModal, setShowModal] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 40,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, translateY]);

  if (!showModal) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible={showModal}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                { transform: [{ translateY }] },
              ]}
            >
              <LiquidGlassCard
                cornerRadius={24}
                padding={0}
                style={styles.card}
              >
                <View style={styles.header}>
                  <View style={styles.handle} />
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {!!title && (
                  <Text style={styles.title}>{title}</Text>
                )}
                <View style={styles.body}>{children}</View>
              </LiquidGlassCard>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  card: {
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    position: 'relative',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 22,
    fontWeight: '600',
  },
  title: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
