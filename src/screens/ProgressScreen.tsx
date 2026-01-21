import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { ALL_EMOTIONS } from '../types';

export default function ProgressScreen({ navigation }: any) {
  const { currentUser } = useAuthStore();

  if (!currentUser) return null;

  const { progress } = currentUser;
  const xpForNextLevel = progress.currentLevel * 1000;
  const xpProgress = progress.totalScore % 1000;
  const levelProgress = xpProgress / 1000;

  const getStreakMedal = () => {
    if (progress.bestStreak >= 20) return { emoji: '💎', name: 'Platinum', color: '#e0e7ff' };
    if (progress.bestStreak >= 10) return { emoji: '🥇', name: 'Gold', color: '#fbbf24' };
    if (progress.bestStreak >= 5) return { emoji: '🥈', name: 'Silver', color: '#d1d5db' };
    return { emoji: '🥉', name: 'Bronze', color: '#d97706' };
  };

  const medal = getStreakMedal();

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>My Progress</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Level Card */}
          <GlassCard cornerRadius={30}>
            <View style={styles.levelCard}>
              <Text style={styles.levelNumber}>{progress.currentLevel}</Text>
              <Text style={styles.levelLabel}>Current Level</Text>
              <View style={styles.levelProgressBar}>
                <View style={[styles.levelProgressFill, { width: `${levelProgress * 100}%` }]} />
              </View>
              <Text style={styles.levelProgressText}>
                {xpProgress} / {xpForNextLevel} XP to Level {progress.currentLevel + 1}
              </Text>
              <Text style={styles.totalXp}>Total XP: {progress.totalScore}</Text>
            </View>
          </GlassCard>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{progress.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{Math.round(progress.overallAccuracy * 100)}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{progress.bestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{progress.speechPracticeHistory.length}</Text>
              <Text style={styles.statLabel}>Speech</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{progress.conversationHistory.length}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{progress.mimicryHistory.length}</Text>
              <Text style={styles.statLabel}>Mimicry</Text>
            </GlassCard>
          </View>

          {/* Streak Medal */}
          <GlassCard cornerRadius={24}>
            <View style={styles.medalSection}>
              <Text style={styles.sectionTitle}>Streak Medal</Text>
              <View style={styles.medalDisplay}>
                <Text style={styles.medalEmoji}>{medal.emoji}</Text>
                <Text style={[styles.medalName, { color: medal.color }]}>{medal.name}</Text>
                <Text style={styles.medalDescription}>
                  Best streak: {progress.bestStreak} correct in a row
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Emotion Mastery */}
          <GlassCard cornerRadius={24}>
            <View style={styles.emotionSection}>
              <Text style={styles.sectionTitle}>Emotion Mastery</Text>
              <View style={styles.emotionGrid}>
                {ALL_EMOTIONS.map((emotion) => {
                  const isUnlocked = progress.unlockedEmotions.includes(emotion.name);
                  return (
                    <View key={emotion.id} style={styles.emotionCard}>
                      <Text style={[styles.emotionEmoji, !isUnlocked && styles.emotionLocked]}>
                        {emotion.emoji}
                      </Text>
                      <Text style={styles.emotionName}>{emotion.name}</Text>
                      <Text style={styles.emotionStatus}>
                        {isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </GlassCard>

          {/* Achievements */}
          <GlassCard cornerRadius={24}>
            <View style={styles.achievementsSection}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              {progress.achievementsUnlocked.length > 0 ? (
                <View style={styles.achievementsGrid}>
                  {progress.achievementsUnlocked.map((achievement) => (
                    <View key={achievement} style={styles.achievementChip}>
                      <Text style={styles.achievementText}>{achievement}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Complete sessions to unlock achievements.</Text>
              )}
            </View>
          </GlassCard>

          {/* Recent Sessions */}
          <GlassCard cornerRadius={24}>
            <View style={styles.sessionsSection}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              {progress.sessionHistory.slice(0, 4).map((session, index) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View>
                    <Text style={styles.sessionScore}>Score: {session.score}</Text>
                    <Text style={styles.sessionDate}>
                      {new Date(session.startTime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.sessionStats}>
                    <Text style={styles.sessionStat}>
                      {Math.round(session.accuracy * 100)}% accuracy
                    </Text>
                    <Text style={styles.sessionStat}>Streak: {session.maxStreak}</Text>
                  </View>
                </View>
              ))}
              {progress.sessionHistory.length === 0 && (
                <Text style={styles.emptyText}>No sessions yet. Start playing to see your progress!</Text>
              )}
            </View>
          </GlassCard>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  levelCard: {
    alignItems: 'center',
    gap: 12,
  },
  levelNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  levelLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  levelProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  levelProgressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  totalXp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '31%',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  medalSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  medalDisplay: {
    alignItems: 'center',
    gap: 8,
  },
  medalEmoji: {
    fontSize: 64,
  },
  medalName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  medalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  emotionSection: {
    gap: 16,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementsSection: {
    gap: 12,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  achievementText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emotionCard: {
    width: '47%',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  emotionEmoji: {
    fontSize: 40,
  },
  emotionLocked: {
    opacity: 0.3,
  },
  emotionName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emotionStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sessionsSection: {
    gap: 16,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionScore: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  sessionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionStat: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
