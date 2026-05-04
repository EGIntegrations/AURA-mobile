import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuraBackground from '../components/AuraBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

// Placeholder stats until taskStore exposes historical aggregates
const PLACEHOLDER_STATS = {
  tasksCompleted: 12,
  wordsLearned: 34,
  streak: 5,
  overallCompletion: 0.42,
  weeklyTasks: [2, 0, 3, 1, 4, 2, 3], // Mon-Sun
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BADGES = [
  { emoji: '🌟', label: 'First Task' },
  { emoji: '📚', label: 'Word Wizard' },
  { emoji: '🔥', label: 'Week Streak' },
  { emoji: '🎯', label: 'Sharp Eye' },
  { emoji: '🏆', label: 'Top Score' },
  { emoji: '💎', label: 'Collector' },
];

function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        {/* Background circle */}
        <View
          style={[
            styles.ringTrack,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        />
        {/* Progress arc using a clipped half-circle trick would be complex;
            instead use a simple pie-segment approach with rotation */}
        <View
          style={[
            styles.ringProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: color,
              borderRightColor: progress > 0.5 ? color : 'transparent',
              borderBottomColor: progress > 0.5 ? color : 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: `${-90 + progress * 360}deg` }],
              opacity: progress > 0 ? 1 : 0,
            },
          ]}
        />
      </View>
      <View style={styles.ringLabelContainer}>
        <Text style={styles.ringPercent}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
}

export default function ProgressScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const stats = PLACEHOLDER_STATS;
  const maxWeekly = Math.max(1, ...stats.weeklyTasks);

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <LiquidGlassHeader
            title="My Progress"
            onBackPress={() => navigation.goBack()}
            style={styles.headerCard}
          />

          {/* Progress Ring */}
          <LiquidGlassCard cornerRadius={30}>
            <View style={styles.ringCard}>
              <ProgressRing
                size={160}
                strokeWidth={14}
                progress={stats.overallCompletion}
                color={AURA_COLORS.accent}
              />
              <Text style={styles.ringSubtitle}>Overall Completion</Text>
            </View>
          </LiquidGlassCard>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <LiquidGlassCard style={styles.statCard} padding={16}>
              <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </LiquidGlassCard>
            <LiquidGlassCard style={styles.statCard} padding={16}>
              <Text style={styles.statValue}>{stats.wordsLearned}</Text>
              <Text style={styles.statLabel}>Words Learned</Text>
            </LiquidGlassCard>
            <LiquidGlassCard style={styles.statCard} padding={16}>
              <Text style={styles.statValue}>
                🔥{stats.streak}
              </Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </LiquidGlassCard>
          </View>

          {/* Weekly Bar Chart */}
          <LiquidGlassCard cornerRadius={24}>
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.barsRow}>
                {stats.weeklyTasks.map((count, index) => (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${(count / maxWeekly) * 100}%`,
                            backgroundColor: AURA_COLORS.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{WEEK_DAYS[index]}</Text>
                    <Text style={styles.barValue}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LiquidGlassCard>

          {/* Badges */}
          <LiquidGlassCard cornerRadius={24}>
            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <View style={styles.badgesGrid}>
                {BADGES.map((badge, index) => (
                  <View key={index} style={styles.badgeItem}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={styles.badgeLabel}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LiquidGlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  headerCard: {
    marginBottom: 8,
  },
  ringCard: {
    alignItems: 'center',
    gap: 12,
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTrack: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
  },
  ringLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.6,
  },
  ringSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
  chartSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
  badgesSection: {
    gap: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
