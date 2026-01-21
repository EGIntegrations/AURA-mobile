import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import type { CameraType } from 'expo-camera';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { AudioService } from '../services/AudioService';
import { OpenAIService } from '../services/OpenAIService';
import { UserMonitoringService } from '../services/UserMonitoringService';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const EMOTIONS = ['Happy', 'Sad', 'Angry', 'Surprised', 'Fear', 'Neutral'];

export default function VisionTrainingScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [targetEmotion, setTargetEmotion] = useState(EMOTIONS[0]);
  const [detectedEmotion, setDetectedEmotion] = useState('Neutral');
  const [confidence, setConfidence] = useState(0.0);
  const [isTraining, setIsTraining] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraFacing: CameraType = 'front';

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    requestPermissions();
    return () => {
      stopTraining();
    };
  }, []);

  const startTraining = () => {
    UserMonitoringService.resetSession();
    setIsTraining(true);
    intervalRef.current = setInterval(detectEmotion, 2000);
  };

  const stopTraining = () => {
    setIsTraining(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const detectEmotion = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
      });

      if (!photo.base64) return;

      const response = await OpenAIService.analyzeImage(
        photo.base64,
        'What emotion is this person expressing? Answer with one word: Happy, Sad, Angry, Surprised, Fear, or Neutral.'
      );

      const emotion = response.trim().split(/\s+/)[0];
      const simulatedConfidence = Math.random() * 0.3 + 0.65;

      setDetectedEmotion(emotion);
      setConfidence(simulatedConfidence);
      UserMonitoringService.recordEmotion(emotion, simulatedConfidence);

      if (emotion.toLowerCase() === targetEmotion.toLowerCase() && simulatedConfidence > 0.7) {
        setScore(prev => prev + 50);
        setFeedback('Great match!');
        AudioService.speak('Great match!');
      } else {
        setFeedback('Keep trying');
      }
    } catch (error) {
      console.error('Vision training error:', error);
      setFeedback('Check your connection and try again.');
    }
  };

  const nextEmotion = () => {
    const index = EMOTIONS.indexOf(targetEmotion);
    const next = EMOTIONS[(index + 1) % EMOTIONS.length];
    setTargetEmotion(next);
    setFeedback('');
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />

      <View style={styles.overlay}>
        <LiquidGlassHeader
          title="Vision Training"
          onBack={() => navigation.goBack()}
          style={styles.headerCard}
        />

        <GlassCard style={styles.card}>
          <Text style={styles.cardLabel}>Target Emotion</Text>
          <Text style={styles.targetEmotion}>{targetEmotion}</Text>
          <TouchableOpacity style={styles.nextButton} onPress={nextEmotion}>
            <Text style={styles.nextButtonText}>Next Emotion</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardLabel}>Detected</Text>
          <Text style={styles.detectedEmotion}>{detectedEmotion}</Text>
          <Text style={styles.confidenceText}>Confidence: {Math.round(confidence * 100)}%</Text>
          {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardLabel}>Score</Text>
          <Text style={styles.scoreText}>{score}</Text>
          <TouchableOpacity
            style={[styles.trainingButton, isTraining && styles.trainingButtonActive]}
            onPress={isTraining ? stopTraining : startTraining}
          >
            <Text style={styles.trainingButtonText}>
              {isTraining ? 'Stop Training' : 'Start Training'}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 18,
  },
  headerCard: {
    marginBottom: 8,
  },
  card: {
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  targetEmotion: {
    fontSize: 32,
    fontWeight: '700',
    color: AURA_COLORS.accent,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.6,
  },
  detectedEmotion: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  confidenceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  feedbackText: {
    color: AURA_COLORS.success,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    color: AURA_COLORS.primary,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  trainingButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: AURA_COLORS.primary,
  },
  trainingButtonActive: {
    backgroundColor: AURA_COLORS.dangerDark,
  },
  trainingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  nextButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.accentSoft,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
});
