import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuraBackground from '../components/AuraBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface NavCardProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

function NavCard({ title, icon, color, onPress }: NavCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.cardWrapper}>
      <LiquidGlassCard cornerRadius={28} padding={20} style={[styles.card, { borderColor: color }]}>
        <View style={styles.cardInner}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      </LiquidGlassCard>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  if (!currentUser) return null;

  const name = currentUser.displayName || currentUser.username || 'Friend';
  const streak = currentUser.progress?.bestStreak ?? 0;

  const navigateTo = (screen: string) => {
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Greeting */}
          <View style={styles.header}>
            <Text style={styles.greeting}>
              {getGreeting()}, {name}!
            </Text>
          </View>

          {/* Streak */}
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{streak} day streak</Text>
          </View>

          {/* 2x2 Grid */}
          <View style={styles.grid}>
            <NavCard
              title="Task Library"
              icon="📚"
              color={AURA_COLORS.primary}
              onPress={() => navigateTo('TaskLibrary')}
            />
            <NavCard
              title="Vocabulary"
              icon="🧠"
              color={AURA_COLORS.secondary}
              onPress={() => navigateTo('Vocabulary')}
            />
            <NavCard
              title="Progress"
              icon="📈"
              color={AURA_COLORS.success}
              onPress={() => navigateTo('Progress')}
            />
            <NavCard
              title="Settings"
              icon="⚙️"
              color={AURA_COLORS.accent}
              onPress={() => navigateTo('Settings')}
            />
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  streakIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '47%',
    aspectRatio: 1,
  },
  card: {
    flex: 1,
    borderWidth: 2,
  },
  cardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
