import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { VocabularyWord } from '../types/Vocabulary';
import { AURA_FONTS } from '../theme/typography';
import LiquidGlassCard from './LiquidGlassCard';

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
    <LiquidGlassCard padding={20} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{word.emoji}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onSpeak}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleLearned}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>
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
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  word: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  phonetic: {
    fontFamily: AURA_FONTS.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.60)',
    fontStyle: 'italic',
  },
});
