import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { Task } from '../types';
import AuraBackground from '../components/AuraBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const DIFFICULTIES: Task['difficulty'][] = ['easy', 'medium', 'hard'];

export default function TaskLibraryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const { assignedTasks, fetchAssignedTasks } = useTaskStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Task['difficulty'] | null>(null);

  useEffect(() => {
    const userId = currentUser?.id ?? 'anonymous';
    fetchAssignedTasks(userId);
  }, [currentUser, fetchAssignedTasks]);

  const categories = useMemo(() => {
    const set = new Set(assignedTasks.map((t) => t.category));
    return Array.from(set).sort();
  }, [assignedTasks]);

  const filteredTasks = useMemo(() => {
    return assignedTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesCategory = selectedCategory ? task.category === selectedCategory : true;
      const matchesDifficulty = selectedDifficulty ? task.difficulty === selectedDifficulty : true;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [assignedTasks, searchQuery, selectedCategory, selectedDifficulty]);

  const handleTaskPress = (taskId: string) => {
    (navigation.navigate as any)('TaskPlayer', { taskId });
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <LiquidGlassHeader
            title="My Tasks"
            onBackPress={() => navigation.goBack()}
            style={styles.header}
          />

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Chips */}
          {categories.length > 0 && (
            <View style={styles.chipsRow}>
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  active={selectedCategory === cat}
                  onPress={() =>
                    setSelectedCategory((prev) => (prev === cat ? null : cat))
                  }
                />
              ))}
            </View>
          )}

          {/* Difficulty Chips */}
          <View style={styles.chipsRow}>
            {DIFFICULTIES.map((diff) => (
              <FilterChip
                key={diff}
                label={diff.charAt(0).toUpperCase() + diff.slice(1)}
                active={selectedDifficulty === diff}
                onPress={() =>
                  setSelectedDifficulty((prev) => (prev === diff ? null : diff))
                }
              />
            ))}
          </View>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

function TaskCard({ task, onPress }: TaskCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LiquidGlassCard style={styles.card} cornerRadius={20} padding={16}>
        <View style={styles.cardRow}>
          <Text style={styles.cardIcon}>{task.icon}</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {task.description}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMeta}>{task.category}</Text>
              <Text style={styles.cardMetaDivider}>·</Text>
              <Text
                style={[
                  styles.cardMeta,
                  task.difficulty === 'easy' && styles.diffEasy,
                  task.difficulty === 'medium' && styles.diffMedium,
                  task.difficulty === 'hard' && styles.diffHard,
                ]}
              >
                {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardChevron}>›</Text>
        </View>
      </LiquidGlassCard>
    </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    fontSize: 16,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
  },
  chipActive: {
    backgroundColor: AURA_COLORS.primary,
    borderColor: AURA_COLORS.primary,
  },
  chipText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: AURA_FONTS.rounded,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chipTextActive: {
    color: 'white',
  },
  list: {
    gap: 12,
    marginTop: 4,
  },
  card: {
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
  cardMetaDivider: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 6,
  },
  diffEasy: {
    color: AURA_COLORS.success,
  },
  diffMedium: {
    color: AURA_COLORS.accent,
  },
  diffHard: {
    color: AURA_COLORS.danger,
  },
  cardChevron: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
