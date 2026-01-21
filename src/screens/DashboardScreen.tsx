import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export default function DashboardScreen({ navigation }: any) {
  const { currentUser, signOut } = useAuthStore();

  if (!currentUser) return null;

  const { progress } = currentUser;
  const canViewAdmin = [UserRole.ADMIN, UserRole.PARENT, UserRole.TEACHER].includes(currentUser.role);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const navigateTo = (screen: string) => {
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AURA</Text>
            <Text style={styles.subtitle}>
              Autism Understanding & Recognition Assistant
            </Text>
          </View>

          {/* Progress Card */}
          <GlassCard cornerRadius={30} style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View>
                <Text style={styles.progressLabel}>
                  Level {progress.currentLevel}
                </Text>
                <Text style={styles.progressSubtitle}>
                  Total score {progress.totalScore}
                </Text>
              </View>
              <View style={styles.progressRight}>
                <Text style={styles.progressLabel}>
                  Accuracy {Math.round(progress.overallAccuracy * 100)}%
                </Text>
                <Text style={styles.progressSubtitle}>
                  Best streak {progress.bestStreak}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Feature Tiles */}
          <View style={styles.tilesContainer}>
            <FeatureTile
              title="Emotion Recognition"
              subtitle="Practice identifying expressions"
              icon="😊"
              gradient={AURA_COLORS.gradients.primary}
              onPress={() => navigateTo('Game')}
            />
            <FeatureTile
              title="Speech Practice"
              subtitle="Say the emotions you see"
              icon="🎤"
              gradient={AURA_COLORS.gradients.secondary}
              onPress={() => navigateTo('SpeechPractice')}
            />
            <FeatureTile
              title="Facial Mimicry"
              subtitle="Practice making expressions"
              icon="📸"
              gradient={['#2d3a7f', '#5b7cff']}
              onPress={() => navigateTo('Mimicry')}
            />
            <FeatureTile
              title="Vision Training"
              subtitle="Live emotion feedback"
              icon="🧠"
              gradient={['#3f5fd6', '#7ed0ff']}
              onPress={() => navigateTo('VisionTraining')}
            />
            <FeatureTile
              title="AI Conversation"
              subtitle="Simulate real conversations"
              icon="💬"
              gradient={['#3a2b7a', '#a37bff']}
              onPress={() => navigateTo('Conversation')}
            />
            <FeatureTile
              title="My Progress"
              subtitle="Review mastery & insights"
              icon="📊"
              gradient={['#5b7cff', '#a37bff']}
              onPress={() => navigateTo('Progress')}
            />
            {canViewAdmin && (
              <FeatureTile
                title="Admin Dashboard"
                subtitle="Manage learners & reports"
                icon="🧭"
                gradient={['#2a2f5a', '#5b7cff']}
                onPress={() => navigateTo('AdminDashboard')}
              />
            )}
            <FeatureTile
              title="API Keys"
              subtitle="Configure AI services"
              icon="🔐"
              gradient={['#23284d', '#7ed0ff']}
              onPress={() => navigateTo('APIKeyConfig')}
            />
            <FeatureTile
              title="Settings"
              subtitle="Preferences & access"
              icon="⚙️"
              gradient={['#5b7cff', '#7ed0ff']}
              onPress={() => navigateTo('Settings')}
            />
          </View>

          {/* Stats Strip */}
          <GlassCard cornerRadius={28} padding={0} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatTile title="Sessions" value={progress.totalSessions} />
              <View style={styles.divider} />
              <StatTile
                title="Unlocked"
                value={progress.unlockedEmotions.length}
              />
              <View style={styles.divider} />
              <StatTile title="Correct" value={progress.totalCorrectAnswers} />
            </View>
          </GlassCard>

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface FeatureTileProps {
  title: string;
  subtitle: string;
  icon: string;
  gradient: string[];
  onPress: () => void;
}

function FeatureTile({
  title,
  subtitle,
  icon,
  gradient,
  onPress,
}: FeatureTileProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tile}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tileGradient}
      >
        <View style={styles.tileContent}>
          <Text style={styles.tileIcon}>{icon}</Text>
          <View style={styles.tileText}>
            <Text style={styles.tileTitle}>{title}</Text>
            <Text style={styles.tileSubtitle}>{subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

interface StatTileProps {
  title: string;
  value: number;
}

function StatTile({ title, value }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 54,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.84)',
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  progressCard: {
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.6,
  },
  progressSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  tilesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  tile: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 12,
  },
  tileGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  tileText: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  tileSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.84)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  chevron: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statTile: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  signOutButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  signOutText: {
    color: AURA_COLORS.dangerDark,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
});
