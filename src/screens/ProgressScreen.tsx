import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import AuraBackground from '../components/AuraBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

function ProgressRing({
  size = 160,
  stroke = 14,
  progress = 0,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
}) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const half = size / 2;

  const rightRotation = 180 + Math.min(clamped, 0.5) * 360;
  const leftRotation = 180 + Math.max(clamped - 0.5, 0) * 360;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background track */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: 'rgba(255,255,255,0.12)',
          position: 'absolute',
        }}
      />

      {/* Right half mask */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: AURA_COLORS.primary,
            transform: [{ rotate: `${rightRotation}deg` }],
          }}
        />
      </View>

      {/* Left half mask */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: AURA_COLORS.primary,
            transform: [{ rotate: `${leftRotation}deg` }],
          }}
        />
      </View>

      {/* Center text */}
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.ringPercent}>{Math.round(clamped * 100)}%</Text>
        <Text style={styles.ringLabel}>Done</Text>
      </View>
    </View>
  );
}

export default function ProgressScreen({ navigation }: any) {
  const { currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  if (!currentUser) return null;

  // Placeholder stats: bridge from legacy data where possible, otherwise hardcoded for UI
  const overallCompletion = 0.73;
  const tasksCompleted = currentUser.progress?.totalSessions ?? 42;
  const wordsLearned = 156;
  const streak = currentUser.progress?.bestStreak ?? 12;

  const weeklyData = [
    { day: 'Mon', value: 2 },
    { day: 'Tue', value: 5 },
    { day: 'Wed', value: 3 },
    { day: 'Thu', value: 7 },
    { day: 'Fri', value: 4 },
    { day: 'Sat', value: 6 },
    { day: 'Sun', value: 8 },
  ];
  const maxWeekly = Math.max(...weeklyData.map((d) => d.value));

  const badges = [
    { id: '1', emoji: '🌟', label: 'Starter' },
    { id: '2', emoji: '📚', label: 'Bookworm' },
    { id: '3', emoji: '🔥', label: 'On Fire' },
    { id: '4', emoji: '🏆', label: 'Champ' },
    { id: '5', emoji: '🎯', label: 'Focus' },
    { id: '6', emoji: '🚀', label: 'Blast Off' },
  ];

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
          {/* Header */}
          <LiquidGlassHeader
            title="My Progress"
            onBackPress={() => navigation.goBack()}
            style={styles.headerCard}
          />

          {/* Progress Ring */}
          <LiquidGlassCard cornerRadius={30}>
            <View style={styles.ringCard}>
              <ProgressRing size={160} stroke={14} progress={overallCompletion} />
              <Text style={styles.ringTitle}>Overall Completion</Text>
            </View>
          </LiquidGlassCard>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <LiquidGlassCard style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statValue}>{tasksCompleted}</Text>
              <Text style={styles.statLabel}>Tasks Completed</Text>
            </LiquidGlassCard>
            <LiquidGlassCard style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statValue}>{wordsLearned}</Text>
              <Text style={styles.statLabel}>Words Learned</Text>
            </LiquidGlassCard>
            <LiquidGlassCard style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </LiquidGlassCard>
          </View>

          {/* Weekly Chart */}
          <LiquidGlassCard cornerRadius={24}>
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Weekly Activity</Text>
              <View style={styles.chartRow}>
                {weeklyData.map((item) => {
                  const barHeight = maxWeekly > 0 ? (item.value / maxWeekly) * 80 : 0;
                  return (
                    <View key={item.day} style={styles.chartColumn}>
                      <View style={styles.barBackground}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: barHeight,
                              backgroundColor:
                                item.value === maxWeekly
                                  ? AURA_COLORS.primary
                                  : AURA_COLORS.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{item.day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </LiquidGlassCard>

          {/* Badges */}
          <LiquidGlassCard cornerRadius={24}>
            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <View style={styles.badgesGrid}>
                {badges.map((badge) => (
                  <View key={badge.id} style={styles.badgeCard}>
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
  ringTitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  ringPercent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  ringLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
    marginTop: 4,
    textAlign: 'center',
  },
  streakEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  chartSection: {
    gap: 16,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barBackground: {
    width: 12,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
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
  badgeCard: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
});
