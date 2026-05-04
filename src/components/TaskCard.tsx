import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { Task } from '../types/Task';
import { AURA_FONTS } from '../theme/typography';
import { AURA_COLORS } from '../theme/colors';
import LiquidGlassCard from './LiquidGlassCard';

export interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

const difficultyMeta: Record<
  Task['difficulty'],
  { label: string; color: string }
> = {
  easy: { label: 'Easy', color: AURA_COLORS.success },
  medium: { label: 'Medium', color: '#FBBF24' },
  hard: { label: 'Hard', color: AURA_COLORS.danger },
};

export default function TaskCard({ task, onPress }: TaskCardProps) {
  const diff = difficultyMeta[task.difficulty];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LiquidGlassCard padding={16} style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.icon}>{task.icon}</Text>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {task.description}
            </Text>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{task.category}</Text>
              </View>
              <View style={[styles.badge, styles.diffBadge]}>
                <View
                  style={[styles.dot, { backgroundColor: diff.color }]}
                />
                <Text style={styles.badgeText}>{diff.label}</Text>
              </View>
            </View>
          </View>
        </View>
      </LiquidGlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 40,
    marginRight: 14,
    lineHeight: 48,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  description: {
    fontFamily: AURA_FONTS.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 20,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
});
