import React, { useState, useEffect } from 'react';
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
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';
import { useAuthStore } from '../store/authStore';
import { ImageDatasetService } from '../services/ImageDatasetService';
import { AudioService } from '../services/AudioService';
import { ProgressionService } from '../services/ProgressionService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { GameQuestion, ALL_EMOTIONS, SpeechPracticeResult } from '../types';

const MAX_PROMPTS = 6;

export default function SpeechPracticeScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const [showingInstructions, setShowingInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [showingSummary, setShowingSummary] = useState(false);

  useEffect(() => {
    setupVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      AudioService.stopSpeaking();
    };
  }, []);

  const setupVoice = async () => {
    try {
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      // Request permissions
      await Audio.requestPermissionsAsync();
    } catch (error) {
      console.error('Voice setup error:', error);
    }
  };

  const onSpeechResults = (event: any) => {
    if (event.value && event.value[0]) {
      const text = event.value[0];
      setTranscribedText(text);

      // Try to recognize emotion
      const recognizedEmotion = recognizeEmotionFromText(text);
      if (recognizedEmotion) {
        processVoiceAnswer(recognizedEmotion);
      }
    }
  };

  const onSpeechError = (event: any) => {
    console.error('Speech error:', event);
    setIsListening(false);
  };

  const recognizeEmotionFromText = (text: string): string | null => {
    const lowerText = text.toLowerCase();

    // Emotion synonyms mapping
    const emotionMap: Record<string, string[]> = {
      happy: ['happy', 'joy', 'joyful', 'glad', 'cheerful', 'pleased'],
      sad: ['sad', 'unhappy', 'sorrowful', 'upset', 'down', 'blue'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated'],
      surprised: ['surprised', 'shocked', 'amazed', 'astonished', 'startled'],
      fear: ['fear', 'scared', 'afraid', 'frightened', 'terrified'],
      neutral: ['neutral', 'calm', 'normal', 'plain'],
    };

    for (const [emotion, synonyms] of Object.entries(emotionMap)) {
      if (synonyms.some(syn => lowerText.includes(syn))) {
        return emotion.charAt(0).toUpperCase() + emotion.slice(1);
      }
    }

    return null;
  };

  const startPractice = () => {
    setShowingInstructions(false);
    resetSession();
    loadNextQuestion();
  };

  const resetSession = () => {
    setCurrentQuestion(null);
    setQuestionsCompleted(0);
    setScore(0);
    setCorrectAnswers(0);
    setTranscribedText('');
    setShowFeedback(false);
    setIsListening(false);
  };

  const loadNextQuestion = () => {
    if (!currentUser) return;

    const unlockedEmotions = getUnlockedEmotions(currentUser.progress.currentLevel);
    const randomEmotion = unlockedEmotions[Math.floor(Math.random() * unlockedEmotions.length)];

    const questions = ImageDatasetService.loadImagesForEmotion(randomEmotion);
    if (questions.length > 0) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
      setTranscribedText('');
      setShowFeedback(false);
    }
  };

  const getUnlockedEmotions = (level: number): string[] => {
    return ProgressionService.getUnlockedEmotions(level);
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      setTranscribedText('');
      await Voice.start('en-US');
    } catch (error) {
      console.error('Start listening error:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Stop listening error:', error);
    }
  };

  const processVoiceAnswer = (answer: string) => {
    if (questionsCompleted >= MAX_PROMPTS || !currentQuestion) return;

    stopListening();

    const normalizedAnswer = answer.trim();
    const isMatch = normalizedAnswer.toLowerCase() === currentQuestion.correctEmotion.toLowerCase();

    setIsCorrect(isMatch);
    setFeedbackMessage(isMatch ? 'Correct!' : `That was ${currentQuestion.correctEmotion}`);

    if (isMatch) {
      setCorrectAnswers(prev => prev + 1);
      setScore(prev => prev + 100);
      AudioService.speak('Correct! Great job!');
    } else {
      setScore(prev => Math.max(prev - 25, 0));
      AudioService.speak(`Not quite. The answer was ${currentQuestion.correctEmotion}`);
    }

    setQuestionsCompleted(prev => prev + 1);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      if (questionsCompleted + 1 < MAX_PROMPTS) {
        loadNextQuestion();
      } else {
        finalizePractice();
      }
    }, 1400);
  };

  const finalizePractice = async () => {
    if (!currentUser) return;

    const result: SpeechPracticeResult = {
      id: `speech-${Date.now()}`,
      timestamp: new Date(),
      targetEmotion: currentQuestion?.correctEmotion || '',
      recognizedText: transcribedText,
      isCorrect: isCorrect,
      confidenceScore: 0.85,
      totalPrompts: MAX_PROMPTS,
      correctResponses: correctAnswers,
      score,
    };

    const updatedProgress = {
      ...currentUser.progress,
      speechPracticeHistory: [result, ...currentUser.progress.speechPracticeHistory].slice(0, 20),
    };
    const progressed = ProgressionService.applyProgression(updatedProgress);
    await updateUserProgress(progressed);
    setShowingSummary(true);
  };

  const handleReplay = () => {
    setShowingSummary(false);
    startPractice();
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (showingInstructions) {
    return (
      <View style={styles.container}>
        <AuraBackground />
        <View style={styles.instructionsContainer}>
          <GlassCard>
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionIcon}>🎤</Text>
              <Text style={styles.instructionTitle}>Voice Practice</Text>
              <Text style={styles.instructionSubtitle}>Use your voice to identify emotions</Text>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.howItWorks}>
              <Text style={styles.howItWorksTitle}>How it works</Text>
              <InstructionRow icon="1️⃣" text="Look closely at the expression" />
              <InstructionRow icon="2️⃣" text="Tap the microphone and say the emotion" />
              <InstructionRow icon="3️⃣" text="We listen and give voice feedback" />
            </View>
          </GlassCard>

          <GlassButton
            title="Start Practice"
            onPress={startPractice}
            customStyle={styles.startButton}
          />

          <TouchableOpacity style={styles.backButton} onPress={handleDone}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <GlassCard>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerLabel}>Speech Practice</Text>
                <Text style={styles.headerSubtitle}>Say the emotion you see</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>Score: {score}</Text>
                <Text style={styles.headerSubtitle}>{questionsCompleted}/{MAX_PROMPTS}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Progress */}
          <GlassCard>
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Progress</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${(questionsCompleted / MAX_PROMPTS) * 100}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{questionsCompleted} of {MAX_PROMPTS} prompts</Text>
            </View>
          </GlassCard>

          {/* Question Image */}
          {currentQuestion && (
            <GlassCard>
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
          )}

          {/* Microphone Controls */}
          <GlassCard>
            {isListening ? (
              <View style={styles.listeningContainer}>
                <Text style={styles.micIcon}>🎤</Text>
                <Text style={styles.listeningText}>Listening…</Text>
                <GlassButton
                  title="Stop"
                  onPress={stopListening}
                  style="danger"
                  customStyle={styles.stopButton}
                />
              </View>
            ) : (
              <GlassButton
                title="🎤 Tap to Speak"
                onPress={startListening}
                customStyle={styles.micButton}
              />
            )}

            {transcribedText && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>You said</Text>
                <Text style={styles.transcriptionText}>"{transcribedText}"</Text>
              </View>
            )}
          </GlassCard>

          {/* Fallback Buttons */}
          <GlassCard>
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallbackLabel}>Or pick an emotion</Text>
              <View style={styles.emotionGrid}>
                {ALL_EMOTIONS.map(emotion => (
                  <TouchableOpacity
                    key={emotion.id}
                    style={styles.emotionButton}
                    onPress={() => processVoiceAnswer(emotion.name)}
                  >
                    <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                    <Text style={styles.emotionName}>{emotion.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Exit Button */}
      <TouchableOpacity style={styles.exitButton} onPress={handleDone}>
        <Text style={styles.exitButtonText}>Exit</Text>
      </TouchableOpacity>

      {/* Feedback Overlay */}
      {showFeedback && (
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>{isCorrect ? '✓' : '✗'}</Text>
            <Text style={styles.feedbackTitle}>{feedbackMessage}</Text>
          </View>
        </View>
      )}

      {/* Summary Modal */}
      <Modal visible={showingSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>🎤</Text>
            <Text style={styles.summaryTitle}>Speech Session Complete</Text>

            <View style={styles.summaryStats}>
              <Text style={styles.summaryStatText}>Score: {score}</Text>
              <Text style={styles.summaryStatText}>
                Accuracy: {Math.round((correctAnswers / MAX_PROMPTS) * 100)}%
              </Text>
              <Text style={styles.summaryStatText}>
                Correct answers: {correctAnswers}/{MAX_PROMPTS}
              </Text>
            </View>

            <View style={styles.summaryButtons}>
              <GlassButton title="Practice Again" onPress={handleReplay} />
              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 28,
  },
  instructionsContent: {
    alignItems: 'center',
    gap: 16,
  },
  instructionIcon: {
    fontSize: 80,
  },
  instructionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  instructionSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  howItWorks: {
    gap: 16,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionRowIcon: {
    fontSize: 24,
  },
  instructionRowText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  startButton: {
    marginTop: 8,
  },
  backButton: {
    alignSelf: 'center',
    padding: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 16,
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
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  progressSection: {
    gap: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  questionImage: {
    width: '100%',
    height: 280,
  },
  placeholderImage: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 120,
  },
  listeningContainer: {
    alignItems: 'center',
    gap: 12,
  },
  micIcon: {
    fontSize: 46,
  },
  listeningText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  stopButton: {
    marginTop: 8,
  },
  micButton: {
    marginVertical: 8,
  },
  transcriptionBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  transcriptionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  fallbackContainer: {
    gap: 16,
  },
  fallbackLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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
  emotionEmoji: {
    fontSize: 32,
  },
  emotionName: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    marginTop: 4,
  },
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  summaryCard: {
    alignItems: 'center',
    padding: 24,
  },
  summaryIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  summaryStats: {
    gap: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryStatText: {
    fontSize: 16,
    color: 'white',
  },
  summaryButtons: {
    width: '100%',
    gap: 12,
  },
  doneButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    borderRadius: 16,
  },
  doneButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
});
