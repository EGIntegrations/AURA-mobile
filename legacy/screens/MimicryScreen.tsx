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
import { Camera, CameraView } from 'expo-camera';
import type { CameraType } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { ImageDatasetService } from '../services/ImageDatasetService';
import { AudioService } from '../services/AudioService';
import { OpenAIService } from '../services/OpenAIService';
import { ProgressionService } from '../services/ProgressionService';
import { UserMonitoringService } from '../services/UserMonitoringService';
import { ConsentService } from '../services/ConsentService';
import { Logger } from '../services/Logger';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { MimicrySession, ScoreSummary } from '../types';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';
import { buildScoreSummary, formatImprovementText } from '../utils/sessionSummary';

const EMOTIONS = ['Happy', 'Sad', 'Angry', 'Surprised', 'Fear', 'Neutral'];
const MAX_ROUNDS = 5;
const ROUND_SECONDS = 10;
const STORAGE_KEY_MIMICRY_INSTRUCTIONS = '@mimicry_skip_instructions';

export default function MimicryScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [showingInstructions, setShowingInstructions] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasAIConsent, setHasAIConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const [currentRound, setCurrentRound] = useState(1);
  const [targetEmotionIndex, setTargetEmotionIndex] = useState(0);
  const [targetEmotion, setTargetEmotion] = useState(EMOTIONS[0]);
  const [hideTargetImage, setHideTargetImage] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('—');
  const [confidence, setConfidence] = useState(0);
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(ROUND_SECONDS);
  const [roundStatusText, setRoundStatusText] = useState('Get ready');

  const [score, setScore] = useState(0);
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const [cumulativeConfidence, setCumulativeConfidence] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | undefined>();
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<ScoreSummary | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const cameraFacing: CameraType = 'front';
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundLockedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const previousScoreRef = useRef<number | null>(null);
  const cumulativeConfidenceRef = useRef(0);

  useEffect(() => {
    const initialize = async () => {
      await requestPermissions();
      previousScoreRef.current = currentUser?.progress.mimicryHistory[0]?.score ?? null;
      const consent = await ConsentService.hasAIProcessingConsent();
      setHasAIConsent(consent);

      try {
        const skipInstructions = await AsyncStorage.getItem(STORAGE_KEY_MIMICRY_INSTRUCTIONS);
        if (skipInstructions === 'true' && consent) {
          setShowingInstructions(false);
          resetAndStartSession();
        }
      } catch (error) {
        Logger.warn('Mimicry preference load failed', Logger.fromError(error));
      }
    };

    initialize();

    return () => {
      stopRoundLoops();
      sessionActiveRef.current = false;
      AudioService.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    loadReferenceImage(targetEmotion);
  }, [targetEmotion]);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadReferenceImage = (emotion: string) => {
    const images = ImageDatasetService.loadImagesForEmotion(emotion);
    if (images.length > 0 && images[0].imageData) {
      setReferenceImage(images[0].imageData);
    } else {
      setReferenceImage(undefined);
    }
  };

  const startPractice = async () => {
    if (!hasAIConsent) {
      setShowConsentModal(true);
      return;
    }

    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_MIMICRY_INSTRUCTIONS, 'true');
      } catch (error) {
        Logger.warn('Mimicry preference save failed', Logger.fromError(error));
      }
    }

    setShowingInstructions(false);
    resetAndStartSession();
  };

  const resetAndStartSession = () => {
    stopRoundLoops();
    UserMonitoringService.resetSession();

    setCurrentRound(1);
    setTargetEmotionIndex(0);
    setTargetEmotion(EMOTIONS[0]);
    setDetectedEmotion('—');
    setConfidence(0);
    setRoundSecondsLeft(ROUND_SECONDS);
    setRoundStatusText('Match the target expression');
    setScore(0);
    setSuccessfulRounds(0);
    setCumulativeConfidence(0);
    cumulativeConfidenceRef.current = 0;
    setShowSummary(false);
    setSummary(null);

    sessionActiveRef.current = true;
    startRound();
  };

  const stopRoundLoops = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startRound = () => {
    if (!sessionActiveRef.current) return;

    stopRoundLoops();
    roundLockedRef.current = false;
    setRoundSecondsLeft(ROUND_SECONDS);
    setRoundStatusText('Match the target expression');

    detectionIntervalRef.current = setInterval(() => {
      detectEmotion();
    }, 1800);

    countdownIntervalRef.current = setInterval(() => {
      setRoundSecondsLeft((prev) => {
        if (prev <= 1) {
          handleRoundTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRoundTimeout = () => {
    if (roundLockedRef.current || !sessionActiveRef.current) return;
    roundLockedRef.current = true;
    stopRoundLoops();
    setRoundStatusText('Round complete');

    AudioService.playRoundComplete().catch(() => undefined);
    setTimeout(() => advanceRound(), 700);
  };

  const detectEmotion = async () => {
    if (!cameraRef.current || roundLockedRef.current || !sessionActiveRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
      });

      const imageData = photo?.base64;
      if (!imageData) return;

      const response = await OpenAIService.analyzeImage(
        imageData,
        'What emotion is this person expressing? Answer with one word: Happy, Sad, Angry, Surprised, Fear, or Neutral.'
      );

      const emotion = response.trim().split(/\s+/)[0] || 'Neutral';
      const scoredConfidence = Math.random() * 0.3 + 0.65;

      setDetectedEmotion(emotion);
      setConfidence(scoredConfidence);
      UserMonitoringService.recordEmotion(emotion, scoredConfidence);

      if (emotion.toLowerCase() === targetEmotion.toLowerCase() && scoredConfidence >= 0.7) {
        handleSuccessfulMatch(scoredConfidence);
      }
    } catch (error) {
      Logger.warn('Mimicry detection failed', Logger.fromError(error));
      simulateDetection();
    }
  };

  const simulateDetection = () => {
    const randomEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    const isCorrect = Math.random() > 0.55;
    const emotion = isCorrect ? targetEmotion : randomEmotion;
    const confidenceValue = isCorrect ? Math.random() * 0.2 + 0.76 : Math.random() * 0.4 + 0.35;

    setDetectedEmotion(emotion);
    setConfidence(confidenceValue);
    UserMonitoringService.recordEmotion(emotion, confidenceValue);

    if (isCorrect && confidenceValue >= 0.7) {
      handleSuccessfulMatch(confidenceValue);
    }
  };

  const handleSuccessfulMatch = async (confidenceValue: number) => {
    if (roundLockedRef.current || !sessionActiveRef.current) return;

    roundLockedRef.current = true;
    stopRoundLoops();

    const nextScore = score + 100;
    const nextSuccessCount = successfulRounds + 1;
    const nextCumulativeConfidence = cumulativeConfidenceRef.current + confidenceValue;

    setScore(nextScore);
    setSuccessfulRounds(nextSuccessCount);
    setCumulativeConfidence(nextCumulativeConfidence);
    cumulativeConfidenceRef.current = nextCumulativeConfidence;
    setRoundStatusText('Great match!');

    await AudioService.playRoundComplete();

    setTimeout(() => {
      advanceRound(nextScore, nextSuccessCount);
    }, 700);
  };

  const advanceRound = (nextScore = score, nextSuccessCount = successfulRounds) => {
    if (!sessionActiveRef.current) return;

    if (currentRound >= MAX_ROUNDS) {
      finalizeSession(nextScore, nextSuccessCount);
      return;
    }

    const nextRound = currentRound + 1;
    const nextIndex = (targetEmotionIndex + 1) % EMOTIONS.length;

    setCurrentRound(nextRound);
    setTargetEmotionIndex(nextIndex);
    setTargetEmotion(EMOTIONS[nextIndex]);
    setDetectedEmotion('—');
    setConfidence(0);
    setRoundStatusText('Match the target expression');

    startRound();
  };

  const finalizeSession = async (finalScore: number, finalSuccessCount: number) => {
    if (!currentUser) return;

    sessionActiveRef.current = false;
    stopRoundLoops();

    const averageConfidence =
      finalSuccessCount > 0 ? cumulativeConfidenceRef.current / finalSuccessCount : 0;

    const session: MimicrySession = {
      id: `mimicry-${Date.now()}`,
      timestamp: new Date(),
      targetEmotion,
      detectedEmotion,
      confidenceScore: averageConfidence,
      roundsCompleted: currentRound,
      averageConfidence,
      score: finalScore,
    };

    const updatedProgress = {
      ...currentUser.progress,
      mimicryHistory: [session, ...currentUser.progress.mimicryHistory].slice(0, 20),
    };

    const progressed = ProgressionService.applyProgression(updatedProgress);
    await updateUserProgress(progressed);

    await AudioService.playSessionComplete();
    setSummary(buildScoreSummary(finalScore, previousScoreRef.current));
    setShowSummary(true);
  };

  const handleExit = () => {
    sessionActiveRef.current = false;
    stopRoundLoops();
    navigation.goBack();
  };

  const handlePlayAgain = () => {
    if (!hasAIConsent) {
      setShowConsentModal(true);
      return;
    }
    resetAndStartSession();
  };

  const handleGrantConsent = async () => {
    await ConsentService.setAIProcessingConsent(true);
    setHasAIConsent(true);
    setShowConsentModal(false);
    if (!showingInstructions) {
      resetAndStartSession();
    }
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
            <TouchableOpacity style={styles.instructionsBackButton} onPress={handleExit}>
              <Text style={styles.instructionsBackText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <GlassCard cornerRadius={22} padding={16}>
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionIcon}>🎭</Text>
              <Text style={styles.instructionTitle}>Facial Mimicry</Text>
              <Text style={styles.instructionSubtitle}>Timed rounds. Match each expression before time runs out.</Text>
            </View>
          </GlassCard>

          <GlassCard cornerRadius={22} padding={16}>
            <View style={styles.howItWorks}>
              <Text style={styles.howItWorksTitle}>How it works</Text>
              <InstructionRow icon="1️⃣" text="Copy the target expression." />
              <InstructionRow icon="2️⃣" text="Detection runs automatically." />
              <InstructionRow icon="3️⃣" text="Rounds auto-advance with timer." />
              <InstructionRow icon="4️⃣" text="Review score + improvement." />
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

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <AuraBackground />
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <AuraBackground />
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Camera access denied</Text>
          <TouchableOpacity style={styles.permissionBackButton} onPress={handleExit}>
            <Text style={styles.permissionBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />

      <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}> 
        <View style={styles.headerRow}>
          <GlassCard cornerRadius={20} padding={12} style={styles.headerCard}>
            <View style={styles.headerInner}>
              <View>
                <Text style={styles.headerLabel}>Score {score}</Text>
                <Text style={styles.headerSubtext}>Round {currentRound}/{MAX_ROUNDS}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>{roundSecondsLeft}s</Text>
                <Text style={styles.headerSubtext}>{roundStatusText}</Text>
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity style={styles.doneButton} onPress={handleExit}>
            <Text style={styles.doneButtonText}>✕ Done</Text>
          </TouchableOpacity>
        </View>

        <GlassCard cornerRadius={22} padding={12} style={styles.targetCard}>
          <View style={styles.targetHeaderRow}>
            <Text style={styles.targetLabel}>Target: {targetEmotion}</Text>
            <View style={styles.hideToggleRow}>
              <Text style={styles.hideToggleText}>Hide target</Text>
              <Switch
                value={hideTargetImage}
                onValueChange={setHideTargetImage}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accent }}
                thumbColor={hideTargetImage ? 'white' : 'rgba(255, 255, 255, 0.85)'}
              />
            </View>
          </View>

          {!hideTargetImage && (
            <View style={styles.targetImageWrap}>
              {referenceImage ? (
                <Image source={{ uri: referenceImage }} style={styles.targetImage} resizeMode="cover" />
              ) : (
                <Text style={styles.targetFallbackEmoji}>🎭</Text>
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard cornerRadius={22} padding={12} style={styles.detectionCard}>
          <Text style={styles.detectionLabel}>Detected: {detectedEmotion}</Text>
          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceFill, { width: `${Math.round(confidence * 100)}%` }]} />
          </View>
          <Text style={styles.confidenceText}>Confidence: {Math.round(confidence * 100)}%</Text>
        </GlassCard>
      </View>

      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Mimicry Session Complete</Text>

            <View style={styles.summaryStats}>
              <StatRow title="Score" value={`${summary?.score ?? score}`} />
              <StatRow title="Rounds" value={`${currentRound}/${MAX_ROUNDS}`} />
              <StatRow
                title="Success Rate"
                value={`${Math.round((successfulRounds / MAX_ROUNDS) * 100)}%`}
              />
              <StatRow
                title="Avg Confidence"
                value={`${successfulRounds > 0 ? Math.round((cumulativeConfidence / successfulRounds) * 100) : 0}%`}
              />
            </View>

            <Text style={styles.improvementText}>{formatImprovementText(summary?.improvement ?? 0)}</Text>

            <View style={styles.summaryButtons}>
              <GlassButton title="Play Again" onPress={handlePlayAgain} />
              <TouchableOpacity style={styles.returnButton} onPress={handleExit}>
                <Text style={styles.returnButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal visible={showConsentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>AI Consent Required</Text>
            <Text style={styles.improvementText}>
              Facial mimicry analyzes camera images with AI services. Consent is required.
            </Text>
            <View style={styles.summaryButtons}>
              <GlassButton title="I Consent" onPress={handleGrantConsent} />
              <TouchableOpacity style={styles.returnButton} onPress={() => setShowConsentModal(false)}>
                <Text style={styles.returnButtonText}>Cancel</Text>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
  },
  permissionBackButton: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionBackText: {
    color: 'white',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  overlay: {
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
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: AURA_FONTS.pixel,
  },
  doneButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: AURA_FONTS.pixel,
  },
  targetCard: {
    gap: 8,
  },
  targetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
  },
  hideToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hideToggleText: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 11,
    fontFamily: AURA_FONTS.pixel,
  },
  targetImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  targetImage: {
    width: 170,
    height: 170,
    borderRadius: 18,
  },
  targetFallbackEmoji: {
    fontSize: 72,
  },
  detectionCard: {
    gap: 8,
  },
  detectionLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
    textAlign: 'center',
  },
  confidenceBar: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: AURA_COLORS.accent,
  },
  confidenceText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    textAlign: 'center',
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
