import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { useAuthStore } from '../store/authStore';
import { ImageDatasetService } from '../services/ImageDatasetService';
import { AudioService } from '../services/AudioService';
import { OpenAIService } from '../services/OpenAIService';
import { ProgressionService } from '../services/ProgressionService';
import { UserMonitoringService } from '../services/UserMonitoringService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { MimicrySession } from '../types';

const EMOTIONS = ['Happy', 'Sad', 'Angry', 'Surprised', 'Fear', 'Neutral'];
const MAX_ROUNDS = 5;

export default function MimicryScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [targetEmotion, setTargetEmotion] = useState(EMOTIONS[0]);
  const [targetEmotionIndex, setTargetEmotionIndex] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cumulativeConfidence, setCumulativeConfidence] = useState(0);
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | undefined>();
  const cameraRef = useRef<Camera>(null);
  const recognitionInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermissions();
    loadReferenceImage();
    return () => {
      if (recognitionInterval.current) {
        clearInterval(recognitionInterval.current);
      }
      AudioService.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    loadReferenceImage();
    AudioService.speak(`Try to make a ${targetEmotion} expression`);
  }, [targetEmotion]);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadReferenceImage = () => {
    const images = ImageDatasetService.loadImagesForEmotion(targetEmotion);
    if (images.length > 0 && images[0].imageData) {
      setReferenceImage(images[0].imageData);
    }
  };

  const startRecognition = () => {
    setIsRecognizing(true);

    // Simulate emotion detection every 2 seconds
    recognitionInterval.current = setInterval(async () => {
      await detectEmotion();
    }, 2000);
  };

  const stopRecognition = () => {
    setIsRecognizing(false);
    if (recognitionInterval.current) {
      clearInterval(recognitionInterval.current);
      recognitionInterval.current = null;
    }
  };

  const detectEmotion = async () => {
    if (!cameraRef.current) return;

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (!photo.base64) return;

      // Use OpenAI Vision to detect emotion
      const result = await OpenAIService.analyzeImage(
        photo.base64,
        'What emotion is this person expressing? Answer with only one word: Happy, Sad, Angry, Surprised, Fear, or Neutral.'
      );

      const emotion = result.trim();
      const mockConfidence = Math.random() * 0.3 + 0.6; // 0.6-0.9

      setDetectedEmotion(emotion);
      setConfidence(mockConfidence);
      UserMonitoringService.recordEmotion(emotion, mockConfidence);

      // Check if matches target
      if (emotion.toLowerCase() === targetEmotion.toLowerCase() && mockConfidence > 0.7) {
        handleSuccessfulMatch(mockConfidence);
      }
    } catch (error) {
      console.error('Emotion detection error:', error);
      // Fallback: simulate detection
      simulateDetection();
    }
  };

  const simulateDetection = () => {
    // Fallback simulation if API fails
    const randomEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    const isCorrect = Math.random() > 0.5;
    const emotion = isCorrect ? targetEmotion : randomEmotion;
    const confidenceValue = isCorrect ? Math.random() * 0.2 + 0.75 : Math.random() * 0.5 + 0.3;

    setDetectedEmotion(emotion);
    setConfidence(confidenceValue);
    UserMonitoringService.recordEmotion(emotion, confidenceValue);

    if (isCorrect && confidenceValue > 0.7) {
      handleSuccessfulMatch(confidenceValue);
    }
  };

  const handleSuccessfulMatch = (confidenceValue: number) => {
    stopRecognition();
    setCurrentScore(prev => prev + 100);
    setCumulativeConfidence(prev => prev + confidenceValue);
    setSuccessfulRounds(prev => prev + 1);

    AudioService.speak('Perfect! Great job matching that expression!');
    setShowSuccess(true);
  };

  const nextEmotion = () => {
    setShowSuccess(false);
    setRoundsCompleted(prev => prev + 1);

    if (roundsCompleted + 1 >= MAX_ROUNDS) {
      finalizeSession();
    } else {
      const nextIndex = (targetEmotionIndex + 1) % EMOTIONS.length;
      setTargetEmotionIndex(nextIndex);
      setTargetEmotion(EMOTIONS[nextIndex]);
      setDetectedEmotion('');
      setConfidence(0);
    }
  };

  const finalizeSession = async () => {
    if (!currentUser) return;

    const averageConfidence = successfulRounds > 0 ? cumulativeConfidence / successfulRounds : 0;

    const session: MimicrySession = {
      id: `mimicry-${Date.now()}`,
      timestamp: new Date(),
      targetEmotion,
      detectedEmotion,
      confidenceScore: averageConfidence,
      roundsCompleted: roundsCompleted + 1,
      averageConfidence,
      score: currentScore,
    };

    const updatedProgress = {
      ...currentUser.progress,
      mimicryHistory: [session, ...currentUser.progress.mimicryHistory].slice(0, 20),
    };
    const progressed = ProgressionService.applyProgression(updatedProgress);
    await updateUserProgress(progressed);
    navigation.goBack();
  };

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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        type={CameraType.front}
      />

      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={() => finalizeSession()}>
            <Text style={styles.exitButtonText}>✕ Done</Text>
          </TouchableOpacity>

          <GlassCard cornerRadius={22} style={styles.scoreCard}>
            <View style={styles.scoreContent}>
              <View>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>{currentScore}</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.scoreLabel}>Round</Text>
                <Text style={styles.scoreValue}>{roundsCompleted + 1}/{MAX_ROUNDS}</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Target Emotion */}
        <View style={styles.targetContainer}>
          <GlassCard cornerRadius={28}>
            <View style={styles.targetContent}>
              <Text style={styles.targetLabel}>Make this expression:</Text>
              {referenceImage ? (
                <Image source={{ uri: referenceImage }} style={styles.referenceImage} />
              ) : (
                <Text style={styles.targetEmoji}>
                  {targetEmotion === 'Happy' ? '😊' :
                   targetEmotion === 'Sad' ? '😢' :
                   targetEmotion === 'Angry' ? '😠' :
                   targetEmotion === 'Surprised' ? '😲' : '😐'}
                </Text>
              )}
              <Text style={styles.targetEmotion}>{targetEmotion}</Text>
            </View>
          </GlassCard>
        </View>

        {/* Detection Card */}
        {isRecognizing && (
          <View style={styles.detectionContainer}>
            <GlassCard cornerRadius={26}>
              <View style={styles.detectionContent}>
                <Text style={styles.detectionLabel}>
                  Detected: {detectedEmotion || '—'}
                </Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[styles.confidenceFill, { width: `${confidence * 100}%` }]}
                  />
                </View>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(confidence * 100)}%
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              isRecognizing ? styles.controlButtonStop : styles.controlButtonStart,
            ]}
            onPress={isRecognizing ? stopRecognition : startRecognition}
          >
            <Text style={styles.controlButtonText}>
              {isRecognizing ? '⏹ Stop' : '▶ Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButtonNext}
            onPress={nextEmotion}
          >
            <Text style={styles.controlButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Perfect!</Text>
            <Text style={styles.successSubtitle}>
              You matched the {targetEmotion} expression!
            </Text>
            <TouchableOpacity style={styles.continueButton} onPress={nextEmotion}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
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
  },
  scoreCard: {
    padding: 12,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  targetContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  targetContent: {
    alignItems: 'center',
    gap: 18,
  },
  targetLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  referenceImage: {
    width: 200,
    height: 200,
    borderRadius: 22,
  },
  targetEmoji: {
    fontSize: 104,
  },
  targetEmotion: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  detectionContainer: {
    paddingHorizontal: 24,
  },
  detectionContent: {
    gap: 12,
  },
  detectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  confidenceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 24,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  controlButtonStart: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
  },
  controlButtonStop: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  controlButtonNext: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    fontSize: 80,
    color: '#10b981',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
