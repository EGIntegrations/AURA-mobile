import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import LiquidGlassCard from './LiquidGlassCard';
import { VocabularyWord } from '../types/Vocabulary';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export interface VocabCardProps {
  word: VocabularyWord;
  onSpeak: () => void;
  onToggleLearned: () => void;
}

export default function VocabCard({
  word,
  onSpeak,
  onToggleLearned,
}: VocabCardProps) {
  return (
    <LiquidGlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{word.emoji}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onSpeak}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleLearned}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.actionIcon,
                word.isLearned && styles.learnedStar,
              ]}
            >
              {word.isLearned ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.word}>{word.word}</Text>
      <Text style={styles.phonetic}>{word.phonetic}</Text>
    </LiquidGlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  actionIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  learnedStar: {
    color: '#FFD700',
  },
  word: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  phonetic: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.2,
  },
});
