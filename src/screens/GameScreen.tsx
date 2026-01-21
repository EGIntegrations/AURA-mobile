import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { CurriculumEngine } from '../services/CurriculumEngine';
import { ProgressionService } from '../services/ProgressionService';
import { AudioService } from '../services/AudioService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { ALL_EMOTIONS, GameQuestion } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const MAX_QUESTIONS = 8;
const QUESTION_TIME_LIMIT = 25.0;

export default function GameScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const curriculumEngine = useRef(new CurriculumEngine());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      AudioService.stopSpeaking();
    };
  }, []);

  const startGame = () => {
    if (!currentUser) return;

    // Generate question queue
    const questions = curriculumEngine.current.generateQuestionQueue(
      currentUser.progress,
      MAX_QUESTIONS
    );

    // Reset state
    setScore(0);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setShowSummary(false);

    // Load first question
    loadNextQuestion();
    startTimer();
  };

  const loadNextQuestion = () => {
    const question = curriculumEngine.current.nextQuestion();

    if (!question) {
      // No more questions - end game
      endGame();
      return;
    }

    setCurrentQuestion(question);
    setQuestionStartTime(Date.now());
    setSelectedEmotion(null);
    setShowFeedback(false);
    setTimeRemaining(QUESTION_TIME_LIMIT);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0.1) {
          handleTimeUp();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!selectedEmotion) {
      handleEmotionSelection('');
    }
  };

  const handleEmotionSelection = (emotion: string) => {
    if (!currentQuestion) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedEmotion(emotion);

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const isCorrect = emotion.toLowerCase() === currentQuestion.correctEmotion.toLowerCase();

    setLastAnswerCorrect(isCorrect);

    // Calculate score
    let points = 0;
    if (isCorrect) {
      points = 100;

      // Speed bonus
      if (responseTime < 2) {
        points += 50;
      } else if (responseTime < 5) {
        points += 25;
      }

      // Streak bonus
      if (currentStreak > 0) {
        points += currentStreak * 10;
      }

      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }
      setCorrectAnswers(prev => prev + 1);
    } else {
      setCurrentStreak(0);
    }

    setScore(prev => prev + points);
    setQuestionsAnswered(prev => prev + 1);

    // Record answer
    curriculumEngine.current.recordAnswer(isCorrect, responseTime);

    // Play feedback
    AudioService.playFeedback(isCorrect, currentQuestion.correctEmotion);

    // Show feedback overlay
    setShowFeedback(true);

    // Auto-advance after delay
    setTimeout(() => {
      if (questionsAnswered + 1 >= MAX_QUESTIONS) {
        endGame();
      } else {
        setShowFeedback(false);
        loadNextQuestion();
        startTimer();
      }
    }, 1600);
  };

  const endGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Create session
    const session = curriculumEngine.current.completeSession(score, maxStreak);

    // Update user progress
    if (currentUser) {
      const updatedProgress = {
        ...currentUser.progress,
        totalSessions: currentUser.progress.totalSessions + 1,
        totalScore: currentUser.progress.totalScore + score,
        totalCorrectAnswers: currentUser.progress.totalCorrectAnswers + correctAnswers,
        totalQuestions: currentUser.progress.totalQuestions + questionsAnswered,
        currentStreak,
        bestStreak: Math.max(currentUser.progress.bestStreak, maxStreak),
        sessionHistory: [session, ...currentUser.progress.sessionHistory].slice(0, 20),
        lastSessionDate: new Date(),
      };
      const progressed = ProgressionService.applyProgression(updatedProgress);
      await updateUserProgress(progressed);
    }

    setCurrentQuestion(null);
    setShowSummary(true);
  };

  const handlePlayAgain = () => {
    setShowSummary(false);
    curriculumEngine.current.reset();
    startGame();
  };

  const handleExit = () => {
    navigation.goBack();
  };

  const progress = questionsAnswered / MAX_QUESTIONS;
  const timeProgress = timeRemaining / QUESTION_TIME_LIMIT;

  const timeBarColor =
    timeProgress > 0.5
      ? AURA_COLORS.accent
      : timeProgress > 0.25
      ? AURA_COLORS.secondary
      : AURA_COLORS.dangerDark;

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <GlassCard>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerLabel}>
                  Level {currentUser?.progress.currentLevel || 1}
                </Text>
                <Text style={styles.headerSubtitle}>Score {score}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>
                  Question {Math.min(questionsAnswered + 1, MAX_QUESTIONS)}/{MAX_QUESTIONS}
                </Text>
                <Text style={styles.headerSubtitle}>Streak {currentStreak}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Progress Bar */}
          <GlassCard>
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.timeBar}>
                <View
                  style={[
                    styles.timeFill,
                    { width: `${timeProgress * 100}%`, backgroundColor: timeBarColor },
                  ]}
                />
              </View>
            </View>
          </GlassCard>

          {/* Question */}
          {currentQuestion ? (
            <View style={styles.questionContainer}>
              <GlassCard cornerRadius={30}>
                {currentQuestion.imageData ? (
                  <Image
                    source={{ uri: currentQuestion.imageData }}
                    style={styles.questionImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderEmoji}>
                      {ALL_EMOTIONS.find(e => e.name === currentQuestion.correctEmotion)?.emoji || '😐'}
                    </Text>
                  </View>
                )}
              </GlassCard>

              {/* Emotion Selection Grid */}
              <GlassCard cornerRadius={24}>
                <View style={styles.emotionGrid}>
                  {ALL_EMOTIONS.map(emotion => (
                    <TouchableOpacity
                      key={emotion.id}
                      style={[
                        styles.emotionButton,
                        selectedEmotion?.toLowerCase() === emotion.name.toLowerCase() &&
                          styles.emotionButtonSelected,
                      ]}
                      onPress={() => handleEmotionSelection(emotion.name)}
                      disabled={showFeedback}
                    >
                      <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                      <Text style={styles.emotionName}>{emotion.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            </View>
          ) : (
            <GlassCard cornerRadius={28}>
              <View style={styles.loading}>
                <Text style={styles.loadingText}>Preparing your next challenge…</Text>
              </View>
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Exit Button */}
      <View style={styles.exitContainer}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback Overlay */}
      {showFeedback && (
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>{lastAnswerCorrect ? '✓' : '✗'}</Text>
            <Text style={styles.feedbackTitle}>{lastAnswerCorrect ? 'Correct!' : 'Not Quite'}</Text>
            {!lastAnswerCorrect && currentQuestion && (
              <Text style={styles.feedbackSubtitle}>
                The correct answer was: {currentQuestion.correctEmotion}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Summary Modal */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Session Complete!</Text>

            <View style={styles.summaryStats}>
              <StatRow title="Final Score" value={score.toString()} />
              <StatRow
                title="Accuracy"
                value={`${Math.round((correctAnswers / questionsAnswered) * 100)}%`}
              />
              <StatRow title="Questions" value={`${correctAnswers}/${questionsAnswered}`} />
              <StatRow title="Best Streak" value={maxStreak.toString()} />
            </View>

            <View style={styles.summaryButtons}>
              <TouchableOpacity style={styles.summaryButton} onPress={handlePlayAgain}>
                <LinearGradient
                  colors={AURA_COLORS.gradients.primary}
                  style={styles.summaryButtonGradient}
                >
                  <Text style={styles.summaryButtonText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryButton} onPress={handleExit}>
                <View style={styles.summaryButtonSecondary}>
                  <Text style={styles.summaryButtonTextSecondary}>Done</Text>
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

interface StatRowProps {
  title: string;
  value: string;
}

function StatRow({ title, value }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  progressSection: {
    gap: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  timeBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timeFill: {
    height: '100%',
  },
  questionContainer: {
    gap: 24,
  },
  questionImage: {
    width: '100%',
    height: 260,
  },
  placeholderImage: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 120,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  },
  emotionButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  emotionButtonSelected: {
    backgroundColor: AURA_COLORS.accentSoft,
    borderColor: AURA_COLORS.accent,
  },
  emotionEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  emotionName: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  loading: {
    paddingVertical: 34,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  exitContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContent: {
    alignItems: 'center',
    padding: 40,
  },
  feedbackIcon: {
    fontSize: 80,
    color: 'white',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  feedbackSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  summaryCard: {
    padding: 24,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  summaryStats: {
    gap: 16,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  summaryButtons: {
    gap: 12,
  },
  summaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryButtonSecondary: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: AURA_COLORS.accentSoft,
  },
  summaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  summaryButtonTextSecondary: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
});
