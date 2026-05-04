import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VocabularyWord } from '../types/Vocabulary';
import { useAuthStore } from '../store/authStore';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import LiquidGlassCard from '../components/LiquidGlassCard';
import AuraBackground from '../components/AuraBackground';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const CATEGORIES = [
  'All',
  'Animals',
  'Food',
  'Colors',
  'Numbers',
  'Emotions',
  'Vehicles',
];

const DEMO_VOCABULARY: VocabularyWord[] = [
  { id: 'v1', word: 'Lion', phonetic: '/ˈlaɪ.ən/', emoji: '🦁', category: 'Animals', ageRange: [3, 8], isLearned: false },
  { id: 'v2', word: 'Apple', phonetic: '/ˈæp.əl/', emoji: '🍎', category: 'Food', ageRange: [2, 8], isLearned: false },
  { id: 'v3', word: 'Blue', phonetic: '/bluː/', emoji: '🔵', category: 'Colors', ageRange: [2, 6], isLearned: false },
  { id: 'v4', word: 'Happy', phonetic: '/ˈhæp.i/', emoji: '😊', category: 'Emotions', ageRange: [4, 10], isLearned: false },
  { id: 'v5', word: 'Car', phonetic: '/kɑːr/', emoji: '🚗', category: 'Vehicles', ageRange: [2, 8], isLearned: false },
  { id: 'v6', word: 'Five', phonetic: '/faɪv/', emoji: '5️⃣', category: 'Numbers', ageRange: [3, 8], isLearned: false },
  { id: 'v7', word: 'Dog', phonetic: '/dɒɡ/', emoji: '🐕', category: 'Animals', ageRange: [2, 7], isLearned: false },
  { id: 'v8', word: 'Banana', phonetic: '/bəˈnɑː.nə/', emoji: '🍌', category: 'Food', ageRange: [2, 8], isLearned: false },
];

interface VocabularyScreenProps {
  navigation: any;
}

export default function VocabularyScreen({ navigation }: VocabularyScreenProps) {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>(
    __DEV__ ? DEMO_VOCABULARY : []
  );

  const userAge = currentUser?.settings?.age ?? 5;
  const specialInterests = currentUser?.settings?.specialInterests ?? [];

  const filteredWords = useMemo(() => {
    return vocabulary.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      const matchesAge =
        userAge >= item.ageRange[0] && userAge <= item.ageRange[1];

      const matchesInterests =
        specialInterests.length === 0 ||
        specialInterests.some(
          (interest) =>
            interest.toLowerCase() === item.category.toLowerCase()
        );

      return matchesCategory && matchesAge && matchesInterests;
    });
  }, [vocabulary, selectedCategory, userAge, specialInterests]);

  const speakWord = (word: string) => {
    Speech.stop();
    Speech.speak(word, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const toggleLearned = (id: string) => {
    setVocabulary((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isLearned: !item.isLearned } : item
      )
    );
  };

  const renderCategoryChip = (category: string) => {
    const isActive = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        onPress={() => setSelectedCategory(category)}
        activeOpacity={0.8}
        style={[styles.chip, isActive && styles.chipActive]}
      >
        <Text
          style={[
            styles.chipText,
            isActive && styles.chipTextActive,
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWordCard = ({ item }: { item: VocabularyWord }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => speakWord(item.word)}
      style={styles.cardWrapper}
    >
      <LiquidGlassCard cornerRadius={20} padding={16} style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.word}>{item.word}</Text>
          <Text style={styles.phonetic}>{item.phonetic}</Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleLearned(item.id)}
          activeOpacity={0.7}
          style={styles.starButton}
        >
          <Text style={styles.star}>
            {item.isLearned ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </LiquidGlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AuraBackground />
      <LiquidGlassHeader
        title="Vocabulary"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {CATEGORIES.map(renderCategoryChip)}
        </ScrollView>

        {/* Word Grid */}
        {filteredWords.length > 0 ? (
          <FlatList
            data={filteredWords}
            renderItem={renderWordCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No words match your filters.
            </Text>
          </View>
        )}
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
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: AURA_COLORS.primary,
    borderColor: AURA_COLORS.primary,
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontFamily: AURA_FONTS.rounded,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chipTextActive: {
    color: 'white',
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '50%',
    padding: 6,
  },
  card: {
    minHeight: 140,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  word: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  phonetic: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  starButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  star: {
    fontSize: 22,
    color: AURA_COLORS.secondary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: AURA_FONTS.rounded,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
