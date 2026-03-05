import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { CurriculumEngine } from '../services/CurriculumEngine';
import { ProgressionService } from '../services/ProgressionService';
import { AudioService } from '../services/AudioService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { ALL_EMOTIONS, GameQuestion, ScoreSummary } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';
import { buildScoreSummary, formatImprovementText } from '../utils/sessionSummary';

const MAX_QUESTIONS = 8;
const QUESTION_TIME_LIMIT = 20;

type RoundStatus = 'active' | 'transitioning' | 'complete';

export default function GameScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>('active');
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<ScoreSummary | null>(null);

  const curriculumEngine = useRef(new CurriculumEngine());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionRef = useRef<NodeJS.Timeout | null>(null);
  const previousScoreRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const correctAnswersRef = useRef(0);
  const questionsAnsweredRef = useRef(0);
  const currentStreakRef = useRef(0);
  const maxStreakRef = useRef(0);

  useEffect(() => {
    previousScoreRef.current = currentUser?.progress.sessionHistory[0]?.score ?? null;
    startGame();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
      AudioService.stopSpeaking();
    };
  }, []);

  const startGame = () => {
    if (!currentUser) return;

    curriculumEngine.current.generateQuestionQueue(currentUser.progress, MAX_QUESTIONS);

    setScore(0);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setSelectedEmotion(null);
    setShowSummary(false);
    setSummary(null);
    scoreRef.current = 0;
    correctAnswersRef.current = 0;
    questionsAnsweredRef.current = 0;
    currentStreakRef.current = 0;
    maxStreakRef.current = 0;

    loadNextQuestion();
  };

  const loadNextQuestion = () => {
    const question = curriculumEngine.current.nextQuestion();

    if (!question) {
      endGame();
      return;
    }

    setCurrentQuestion(question);
    setQuestionStartTime(Date.now());
    setSelectedEmotion(null);
    setRoundStatus('active');
    setTimeRemaining(QUESTION_TIME_LIMIT);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleEmotionSelection('');
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const handleEmotionSelection = (emotion: string) => {
    if (!currentQuestion || roundStatus !== 'active') return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const isCorrect = emotion.toLowerCase() === currentQuestion.correctEmotion.toLowerCase();

    setSelectedEmotion(emotion);
    setLastAnswerCorrect(isCorrect);
    setRoundStatus('transitioning');

    let points = 0;
    let nextStreak = 0;
    let nextCorrect = correctAnswersRef.current;

    if (isCorrect) {
      points = 100;
      if (responseTime < 2) points += 50;
      else if (responseTime < 5) points += 25;
      points += currentStreakRef.current > 0 ? currentStreakRef.current * 10 : 0;

      nextStreak = currentStreakRef.current + 1;
      nextCorrect += 1;
      AudioService.playFeedback(true, currentQuestion.correctEmotion).catch(() => undefined);
    } else {
      nextStreak = 0;
      AudioService.playFeedback(false, currentQuestion.correctEmotion).catch(() => undefined);
    }

    const nextScore = scoreRef.current + points;
    const nextAnswered = questionsAnsweredRef.current + 1;
    const nextMaxStreak = Math.max(maxStreakRef.current, nextStreak);

    scoreRef.current = nextScore;
    questionsAnsweredRef.current = nextAnswered;
    correctAnswersRef.current = nextCorrect;
    currentStreakRef.current = nextStreak;
    maxStreakRef.current = nextMaxStreak;

    setScore(nextScore);
    setQuestionsAnswered(nextAnswered);
    setCorrectAnswers(nextCorrect);
    setCurrentStreak(nextStreak);
    setMaxStreak(nextMaxStreak);
    curriculumEngine.current.recordAnswer(isCorrect, responseTime);

    transitionRef.current = setTimeout(() => {
      if (questionsAnsweredRef.current >= MAX_QUESTIONS) {
        endGame();
      } else {
        loadNextQuestion();
      }
    }, 1200);
  };

  const endGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionRef.current) clearTimeout(transitionRef.current);

    const finalScore = scoreRef.current;
    const finalCorrect = correctAnswersRef.current;
    const finalAnswered = questionsAnsweredRef.current;
    const finalCurrentStreak = currentStreakRef.current;
    const finalMaxStreak = maxStreakRef.current;
    const session = curriculumEngine.current.completeSession(finalScore, finalMaxStreak);

    if (currentUser) {
      const updatedProgress = {
        ...currentUser.progress,
        totalSessions: currentUser.progress.totalSessions + 1,
        totalScore: currentUser.progress.totalScore + finalScore,
        totalCorrectAnswers: currentUser.progress.totalCorrectAnswers + finalCorrect,
        totalQuestions: currentUser.progress.totalQuestions + finalAnswered,
        currentStreak: finalCurrentStreak,
        bestStreak: Math.max(currentUser.progress.bestStreak, finalMaxStreak),
        sessionHistory: [session, ...currentUser.progress.sessionHistory].slice(0, 20),
        lastSessionDate: new Date(),
      };
      const progressed = ProgressionService.applyProgression(updatedProgress);
      await updateUserProgress(progressed);
    }

    await AudioService.playSessionComplete();
    setSummary(buildScoreSummary(finalScore, previousScoreRef.current));
    setCurrentQuestion(null);
    setRoundStatus('complete');
    setShowSummary(true);
  };

  const handlePlayAgain = () => {
    curriculumEngine.current.reset();
    startGame();
  };

  const handleReturn = () => {
    navigation.goBack();
  };

  const progress = questionsAnswered / MAX_QUESTIONS;
  const timeProgress = Math.max(0, timeRemaining / QUESTION_TIME_LIMIT);

  const timeBarColor =
    timeProgress > 0.5
      ? AURA_COLORS.accent
      : timeProgress > 0.25
      ? AURA_COLORS.secondary
      : AURA_COLORS.dangerDark;

  return (
    <View style={styles.container}>
      <AuraBackground />

      <View style={[styles.screenContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}> 
        <View style={styles.headerRow}>
          <GlassCard cornerRadius={20} padding={14} style={styles.headerCard}>
            <View style={styles.headerInner}>
              <View>
                <Text style={styles.headerLabel}>Level {currentUser?.progress.currentLevel || 1}</Text>
                <Text style={styles.headerSubtext}>Score {score}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>
                  {Math.min(questionsAnswered + 1, MAX_QUESTIONS)}/{MAX_QUESTIONS}
                </Text>
                <Text style={styles.headerSubtext}>Streak {currentStreak}</Text>
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity style={styles.doneButton} onPress={handleReturn}>
            <Text style={styles.doneButtonText}>✕ Done</Text>
          </TouchableOpacity>
        </View>

        <GlassCard cornerRadius={20} padding={12} style={styles.progressCard}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeBar}>
            <View style={[styles.timeFill, { width: `${timeProgress * 100}%`, backgroundColor: timeBarColor }]} />
          </View>
        </GlassCard>

        <View style={styles.mainArea}>
          <GlassCard cornerRadius={24} padding={14} style={styles.questionCard}>
            {currentQuestion ? (
              currentQuestion.imageData ? (
                <Image source={{ uri: currentQuestion.imageData }} style={styles.questionImage} resizeMode="contain" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderEmoji}>
                    {ALL_EMOTIONS.find((emotion) => emotion.name === currentQuestion.correctEmotion)?.emoji || '😐'}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.loadingText}>Preparing challenge…</Text>
              </View>
            )}
          </GlassCard>

          <GlassCard cornerRadius={24} padding={14} style={styles.answerCard}>
            <View style={styles.emotionGrid}>
              {ALL_EMOTIONS.map((emotion) => (
                <TouchableOpacity
                  key={emotion.id}
                  style={[
                    styles.emotionButton,
                    selectedEmotion?.toLowerCase() === emotion.name.toLowerCase() && styles.emotionButtonSelected,
                  ]}
                  onPress={() => handleEmotionSelection(emotion.name)}
                  disabled={roundStatus !== 'active'}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={styles.emotionName}>{emotion.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </View>

      {roundStatus === 'transitioning' && (
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>{lastAnswerCorrect ? '✓' : '✗'}</Text>
            <Text style={styles.feedbackTitle}>{lastAnswerCorrect ? 'Correct!' : 'Not Quite'}</Text>
            {!lastAnswerCorrect && currentQuestion && (
              <Text style={styles.feedbackSubtitle}>Correct answer: {currentQuestion.correctEmotion}</Text>
            )}
          </View>
        </View>
      )}

      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Session Complete</Text>
            <View style={styles.summaryStats}>
              <StatRow title="Score" value={`${summary?.score ?? score}`} />
              <StatRow
                title="Accuracy"
                value={`${questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0}%`}
              />
              <StatRow title="Best Streak" value={`${maxStreak}`} />
            </View>
            <Text style={styles.improvementText}>
              {formatImprovementText(summary?.improvement ?? 0)}
            </Text>

            <View style={styles.summaryButtons}>
              <TouchableOpacity style={styles.summaryButton} onPress={handlePlayAgain}>
                <LinearGradient colors={AURA_COLORS.gradients.primary} style={styles.summaryButtonGradient}>
                  <Text style={styles.summaryButtonText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.summaryButtonSecondary} onPress={handleReturn}>
                <Text style={styles.summaryButtonTextSecondary}>Return</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

function StatRow({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  headerCard: {
    flex: 1,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 3,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  doneButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  progressCard: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  timeBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  timeFill: {
    height: '100%',
  },
  mainArea: {
    flex: 1,
    gap: 10,
  },
  questionCard: {
    flex: 0.45,
    justifyContent: 'center',
  },
  questionImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 96,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  answerCard: {
    flex: 0.55,
    justifyContent: 'center',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionButton: {
    width: '30%',
    aspectRatio: 1.12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionButtonSelected: {
    borderColor: AURA_COLORS.accent,
    backgroundColor: AURA_COLORS.accentSoft,
  },
  emotionEmoji: {
    fontSize: 28,
  },
  emotionName: {
    marginTop: 3,
    color: 'white',
    fontSize: 10,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.1,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  feedbackIcon: {
    fontSize: 70,
    color: 'white',
  },
  feedbackTitle: {
    color: 'white',
    fontSize: 30,
    fontFamily: AURA_FONTS.pixel,
    marginTop: 6,
  },
  feedbackSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 8,
    fontFamily: AURA_FONTS.pixel,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    padding: 20,
  },
  summaryCard: {
    padding: 20,
  },
  summaryTitle: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  summaryStats: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
  },
  improvementText: {
    marginTop: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: AURA_COLORS.accent,
    fontSize: 13,
    fontFamily: AURA_FONTS.pixel,
  },
  summaryButtons: {
    gap: 10,
  },
  summaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  summaryButtonGradient: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  summaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
  },
  summaryButtonSecondary: {
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(91, 124, 255, 0.2)',
    paddingVertical: 13,
  },
  summaryButtonTextSecondary: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
  },
});
