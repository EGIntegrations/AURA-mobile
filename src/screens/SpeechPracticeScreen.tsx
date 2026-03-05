import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from 'expo-speech-recognition';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { ImageDatasetService } from '../services/ImageDatasetService';
import { AudioService } from '../services/AudioService';
import { ProgressionService } from '../services/ProgressionService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { GameQuestion, ALL_EMOTIONS, SpeechPracticeResult, ScoreSummary } from '../types';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';
import { buildScoreSummary, formatImprovementText } from '../utils/sessionSummary';
import { Logger } from '../services/Logger';

const MAX_PROMPTS = 6;
const STORAGE_KEY_SPEECH_INSTRUCTIONS = '@speech_practice_skip_instructions';

type PracticeState = 'idle' | 'listening' | 'processing' | 'waiting-next' | 'complete';

export default function SpeechPracticeScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [showingInstructions, setShowingInstructions] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [showingSummary, setShowingSummary] = useState(false);
  const [summary, setSummary] = useState<ScoreSummary | null>(null);
  const [practiceState, setPracticeState] = useState<PracticeState>('idle');

  const hasTranscriptRef = useRef(false);
  const isProcessingRef = useRef(false);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousScoreRef = useRef<number | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (!text || practiceState !== 'listening') return;

    hasTranscriptRef.current = true;
    setTranscribedText(text);

    const recognizedEmotion = recognizeEmotionFromText(text);
    processVoiceAnswer(recognizedEmotion || '');
  });

  useSpeechRecognitionEvent('end', () => {
    if (practiceState === 'listening' && !hasTranscriptRef.current && !isProcessingRef.current) {
      processVoiceAnswer('');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    Logger.warn('Speech recognition error', String(event.error));
    if (practiceState === 'listening' && !isProcessingRef.current) {
      processVoiceAnswer('');
    }
  });

  useEffect(() => {
    const setupVoice = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

        const skipInstructions = await AsyncStorage.getItem(STORAGE_KEY_SPEECH_INSTRUCTIONS);
        if (skipInstructions === 'true') {
          setShowingInstructions(false);
          startPracticeSession();
        }
      } catch (error) {
        Logger.warn('Speech setup failed', Logger.fromError(error));
      }
    };

    previousScoreRef.current = currentUser?.progress.speechPracticeHistory[0]?.score ?? null;
    setupVoice();

    return () => {
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
      stopListening();
      AudioService.stopSpeaking();
    };
  }, []);

  const recognizeEmotionFromText = (text: string): string | null => {
    const lowerText = text.toLowerCase();

    const emotionMap: Record<string, string[]> = {
      happy: ['happy', 'joy', 'joyful', 'glad', 'cheerful', 'pleased'],
      sad: ['sad', 'unhappy', 'sorrowful', 'upset', 'down', 'blue'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated'],
      surprised: ['surprised', 'shocked', 'amazed', 'astonished', 'startled'],
      fear: ['fear', 'scared', 'afraid', 'frightened', 'terrified'],
      neutral: ['neutral', 'calm', 'normal', 'plain'],
    };

    for (const [emotion, synonyms] of Object.entries(emotionMap)) {
      if (synonyms.some((syn) => lowerText.includes(syn))) {
        return emotion.charAt(0).toUpperCase() + emotion.slice(1);
      }
    }

    return null;
  };

  const startPractice = async () => {
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_SPEECH_INSTRUCTIONS, 'true');
      } catch (error) {
        Logger.warn('Speech preference save failed', Logger.fromError(error));
      }
    }

    setShowingInstructions(false);
    startPracticeSession();
  };

  const startPracticeSession = () => {
    setQuestionsCompleted(0);
    setScore(0);
    setCorrectAnswers(0);
    setTranscribedText('');
    setShowFeedback(false);
    setShowingSummary(false);
    setSummary(null);
    setPracticeState('idle');
    loadNextQuestion();
  };

  const loadNextQuestion = () => {
    if (!currentUser) return;

    const unlockedEmotions = ProgressionService.getUnlockedEmotions(currentUser.progress.currentLevel);
    const randomEmotion = unlockedEmotions[Math.floor(Math.random() * unlockedEmotions.length)];

    const questions = ImageDatasetService.loadImagesForEmotion(randomEmotion);
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)] || null;

    setCurrentQuestion(randomQuestion);
    setTranscribedText('');
    setShowFeedback(false);

    waitAndListen(350);
  };

  const waitAndListen = (delayMs: number) => {
    if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
    isProcessingRef.current = false;
    setPracticeState('waiting-next');

    waitingTimeoutRef.current = setTimeout(() => {
      startListening();
    }, delayMs);
  };

  const startListening = async () => {
    try {
      hasTranscriptRef.current = false;
      setPracticeState('listening');
      setTranscribedText('');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (error) {
      Logger.warn('Speech start listening failed', Logger.fromError(error));
      setPracticeState('processing');
      processVoiceAnswer('');
    }
  };

  const stopListening = async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      Logger.warn('Speech stop listening failed', Logger.fromError(error));
    }
  };

  const processVoiceAnswer = async (answer: string) => {
    if (!currentQuestion || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setPracticeState('processing');
    await stopListening();

    const normalizedAnswer = answer.trim();
    const isMatch =
      normalizedAnswer.length > 0 &&
      normalizedAnswer.toLowerCase() === currentQuestion.correctEmotion.toLowerCase();

    setIsCorrect(isMatch);
    setFeedbackMessage(
      isMatch
        ? 'Correct!'
        : normalizedAnswer
        ? `That was ${currentQuestion.correctEmotion}`
        : `No voice match. Answer: ${currentQuestion.correctEmotion}`
    );

    const updatedCorrect = isMatch ? correctAnswers + 1 : correctAnswers;
    const updatedScore = isMatch ? score + 100 : Math.max(score - 25, 0);
    const updatedCompleted = questionsCompleted + 1;

    if (isMatch) {
      setCorrectAnswers(updatedCorrect);
      setScore(updatedScore);
      await AudioService.playFeedback(true, currentQuestion.correctEmotion);
    } else {
      setScore(updatedScore);
      await AudioService.playFeedback(false, currentQuestion.correctEmotion);
    }

    setQuestionsCompleted(updatedCompleted);
    setShowFeedback(true);

    if (updatedCompleted < MAX_PROMPTS) {
      waitingTimeoutRef.current = setTimeout(() => {
        setShowFeedback(false);
        loadNextQuestion();
      }, 1100);
    } else {
      waitingTimeoutRef.current = setTimeout(async () => {
        await finalizePractice(updatedScore, updatedCorrect);
      }, 1100);
    }
  };

  const finalizePractice = async (finalScore: number, finalCorrect: number) => {
    if (!currentUser) return;

    isProcessingRef.current = false;
    setPracticeState('complete');
    await stopListening();

    const result: SpeechPracticeResult = {
      id: `speech-${Date.now()}`,
      timestamp: new Date(),
      targetEmotion: currentQuestion?.correctEmotion || '',
      recognizedText: transcribedText,
      isCorrect,
      confidenceScore: 0.85,
      totalPrompts: MAX_PROMPTS,
      correctResponses: finalCorrect,
      score: finalScore,
    };

    const updatedProgress = {
      ...currentUser.progress,
      speechPracticeHistory: [result, ...currentUser.progress.speechPracticeHistory].slice(0, 20),
    };
    const progressed = ProgressionService.applyProgression(updatedProgress);
    await updateUserProgress(progressed);

    await AudioService.playSessionComplete();
    setSummary(buildScoreSummary(finalScore, previousScoreRef.current));
    setShowFeedback(false);
    setShowingSummary(true);
  };

  const handleReplay = () => {
    startPracticeSession();
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (showingInstructions) {
    return (
      <View style={styles.container}>
        <AuraBackground />

        <View
          style={[
            styles.instructionsContainer,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 },
          ]}
        >
          <View style={styles.instructionsHeaderRow}>
            <TouchableOpacity style={styles.instructionsBackButton} onPress={handleDone}>
              <Text style={styles.instructionsBackText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <GlassCard cornerRadius={22} padding={16}>
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionIcon}>🎤</Text>
              <Text style={styles.instructionTitle}>Speech Practice</Text>
              <Text style={styles.instructionSubtitle}>Say the emotion you see. We auto-listen each round.</Text>
            </View>
          </GlassCard>

          <GlassCard cornerRadius={22} padding={16}>
            <View style={styles.howItWorks}>
              <Text style={styles.howItWorksTitle}>How it works</Text>
              <InstructionRow icon="1️⃣" text="Look at the emotion image." />
              <InstructionRow icon="2️⃣" text="Speak the emotion out loud." />
              <InstructionRow icon="3️⃣" text="Next round starts automatically." />
              <InstructionRow icon="4️⃣" text="Review your score + improvement." />
            </View>
          </GlassCard>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Don't show this again</Text>
            <Switch
              value={dontShowAgain}
              onValueChange={setDontShowAgain}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accent }}
              thumbColor={dontShowAgain ? 'white' : 'rgba(255, 255, 255, 0.8)'}
            />
          </View>

          <GlassButton title="Start Practice" onPress={startPractice} customStyle={styles.startButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuraBackground />

      <View style={[styles.mainContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}> 
        <View style={styles.headerRow}>
          <GlassCard cornerRadius={20} padding={14} style={styles.headerCard}>
            <View style={styles.headerInner}>
              <View>
                <Text style={styles.headerLabel}>Speech Practice</Text>
                <Text style={styles.headerSubtext}>{questionsCompleted}/{MAX_PROMPTS}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>Score {score}</Text>
                <Text style={styles.headerSubtext}>{practiceState === 'listening' ? 'Listening' : practiceState === 'processing' ? 'Checking' : 'Ready'}</Text>
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>✕ Done</Text>
          </TouchableOpacity>
        </View>

        <GlassCard cornerRadius={20} padding={12} style={styles.progressCard}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(questionsCompleted / MAX_PROMPTS) * 100}%` }]} />
          </View>
        </GlassCard>

        <View style={styles.practiceArea}>
          <GlassCard cornerRadius={24} padding={12} style={styles.questionCard}>
            {currentQuestion?.imageData ? (
              <Image source={{ uri: currentQuestion.imageData }} style={styles.questionImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderEmoji}>
                  {ALL_EMOTIONS.find((emotion) => emotion.name === currentQuestion?.correctEmotion)?.emoji || '😐'}
                </Text>
              </View>
            )}
          </GlassCard>

          <GlassCard cornerRadius={24} padding={12} style={styles.voiceCard}>
            <View style={styles.voiceStatusBlock}>
              <Text style={styles.voiceLabel}>
                {practiceState === 'listening'
                  ? 'Listening now…'
                  : practiceState === 'processing'
                  ? 'Processing response…'
                  : 'Auto-starting next prompt…'}
              </Text>
              <Text style={styles.transcriptText}>{transcribedText ? `"${transcribedText}"` : 'Speak naturally when ready.'}</Text>
            </View>

            <View style={styles.emotionGrid}>
              {ALL_EMOTIONS.map((emotion) => (
                <TouchableOpacity
                  key={emotion.id}
                  style={styles.emotionButton}
                  onPress={() => processVoiceAnswer(emotion.name)}
                  disabled={practiceState === 'processing'}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={styles.emotionName}>{emotion.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </View>

      {showFeedback && (
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>{isCorrect ? '✓' : '✗'}</Text>
            <Text style={styles.feedbackTitle}>{feedbackMessage}</Text>
          </View>
        </View>
      )}

      <Modal visible={showingSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Speech Session Complete</Text>
            <View style={styles.summaryStats}>
              <StatRow title="Score" value={`${summary?.score ?? score}`} />
              <StatRow title="Accuracy" value={`${Math.round((correctAnswers / MAX_PROMPTS) * 100)}%`} />
              <StatRow title="Correct" value={`${correctAnswers}/${MAX_PROMPTS}`} />
            </View>

            <Text style={styles.improvementText}>{formatImprovementText(summary?.improvement ?? 0)}</Text>

            <View style={styles.summaryButtons}>
              <GlassButton title="Play Again" onPress={handleReplay} />
              <TouchableOpacity style={styles.returnButton} onPress={handleDone}>
                <Text style={styles.returnButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

function InstructionRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.instructionRow}>
      <Text style={styles.instructionRowIcon}>{icon}</Text>
      <Text style={styles.instructionRowText}>{text}</Text>
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
  instructionsContainer: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  instructionsHeaderRow: {
    alignItems: 'flex-start',
  },
  instructionsBackButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  instructionsBackText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 15,
    fontFamily: AURA_FONTS.pixel,
  },
  instructionsContent: {
    alignItems: 'center',
    gap: 8,
  },
  instructionIcon: {
    fontSize: 56,
  },
  instructionTitle: {
    fontSize: 24,
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  instructionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.84)',
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  howItWorks: {
    gap: 8,
  },
  howItWorksTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.92)',
    fontFamily: AURA_FONTS.pixel,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionRowIcon: {
    fontSize: 18,
  },
  instructionRowText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleText: {
    color: 'white',
    fontSize: 13,
    fontFamily: AURA_FONTS.pixel,
  },
  startButton: {
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCard: {
    flex: 1,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    color: 'white',
    fontSize: 15,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 3,
    fontSize: 11,
    fontFamily: AURA_FONTS.pixel,
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
  },
  progressCard: {
    gap: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AURA_COLORS.accent,
  },
  practiceArea: {
    flex: 1,
    gap: 10,
  },
  questionCard: {
    flex: 0.42,
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
    fontSize: 88,
  },
  voiceCard: {
    flex: 0.58,
    gap: 10,
    justifyContent: 'space-between',
  },
  voiceStatusBlock: {
    gap: 6,
  },
  voiceLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
  },
  transcriptText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    minHeight: 18,
    fontFamily: AURA_FONTS.pixel,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emotionButton: {
    width: '30%',
    aspectRatio: 1.12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionEmoji: {
    fontSize: 26,
  },
  emotionName: {
    color: 'white',
    marginTop: 3,
    fontSize: 10,
    fontFamily: AURA_FONTS.pixel,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  feedbackIcon: {
    fontSize: 64,
    color: 'white',
  },
  feedbackTitle: {
    marginTop: 8,
    color: 'white',
    fontSize: 22,
    fontFamily: AURA_FONTS.pixel,
    textAlign: 'center',
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
    fontSize: 23,
    textAlign: 'center',
    marginBottom: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  summaryStats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  statValue: {
    color: 'white',
    fontSize: 15,
    fontFamily: AURA_FONTS.pixel,
  },
  improvementText: {
    marginTop: 12,
    marginBottom: 14,
    textAlign: 'center',
    color: AURA_COLORS.accent,
    fontSize: 13,
    fontFamily: AURA_FONTS.pixel,
  },
  summaryButtons: {
    gap: 10,
  },
  returnButton: {
    borderRadius: 14,
    backgroundColor: 'rgba(91, 124, 255, 0.2)',
    alignItems: 'center',
    paddingVertical: 12,
  },
  returnButtonText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
  },
});
