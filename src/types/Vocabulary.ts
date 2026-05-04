export interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  emoji: string;
  category: string;
  ageRange: [number, number];
  audioUrl?: string;
  isLearned: boolean;
}
