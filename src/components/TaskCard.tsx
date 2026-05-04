import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import LiquidGlassCard from './LiquidGlassCard';
import { Task } from '../types/Task';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: AURA_COLORS.success,
  medium: AURA_COLORS.accent,
  hard: AURA_COLORS.danger,
};

export default function TaskCard({ task, onPress }: TaskCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LiquidGlassCard style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.icon}>{task.icon}</Text>
          <View style={styles.info}>
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
              <View style={styles.difficultyBadge}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        DIFFICULTY_COLORS[task.difficulty] ??
                        AURA_COLORS.primary,
                    },
                  ]}
                />
                <Text style={styles.badgeText}>
                  {task.difficulty.charAt(0).toUpperCase() +
                    task.difficulty.slice(1)}
                </Text>
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
    marginHorizontal: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  description: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.70)',
    lineHeight: 20,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: AURA_COLORS.glass.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.glass.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
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
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
