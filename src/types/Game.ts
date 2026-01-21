export interface PlayerProgress {
  totalSessions: number;
  totalScore: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  overallAccuracy: number;
  currentLevel: number;
  currentStreak: number;
  bestStreak: number;
  unlockedEmotions: string[];
  sessionHistory: GameSession[];
  mimicryHistory: MimicrySession[];
  speechPracticeHistory: SpeechPracticeResult[];
  conversationHistory: ConversationSummary[];
  achievementsUnlocked: string[];
  lastSessionDate?: Date;
}

export interface GameSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  currentStreak: number;
  maxStreak: number;
  accuracy: number;
  averageResponseTime: number;
}

export interface MimicrySession {
  id: string;
  timestamp: Date;
  targetEmotion: string;
  detectedEmotion: string;
  confidenceScore: number;
  roundsCompleted: number;
  averageConfidence: number;
  score: number;
}

export interface SpeechPracticeResult {
  id: string;
  timestamp: Date;
  targetEmotion: string;
  recognizedText: string;
  isCorrect: boolean;
  confidenceScore: number;
  totalPrompts: number;
  correctResponses: number;
  score: number;
}

export interface ConversationSummary {
  id: string;
  timestamp: Date;
  scenario: string;
  messageCount: number;
  duration: number;
  sentiment?: string;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
}

export const ALL_EMOTIONS: Emotion[] = [
  { id: '1', name: 'Happy', emoji: '😊' },
  { id: '2', name: 'Sad', emoji: '😢' },
  { id: '3', name: 'Angry', emoji: '😠' },
  { id: '4', name: 'Surprised', emoji: '😲' },
  { id: '5', name: 'Fear', emoji: '😨' },
  { id: '6', name: 'Neutral', emoji: '😐' },
];
