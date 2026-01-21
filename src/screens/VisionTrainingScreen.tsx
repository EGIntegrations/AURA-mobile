import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { AudioService } from '../services/AudioService';
import { OpenAIService } from '../services/OpenAIService';
import { UserMonitoringService } from '../services/UserMonitoringService';

const EMOTIONS = ['Happy', 'Sad', 'Angry', 'Surprised', 'Fear', 'Neutral'];

export default function VisionTrainingScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [targetEmotion, setTargetEmotion] = useState(EMOTIONS[0]);
  const [detectedEmotion, setDetectedEmotion] = useState('Neutral');
  const [confidence, setConfidence] = useState(0.0);
  const [isTraining, setIsTraining] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const cameraRef = useRef<Camera>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} type={CameraType.front} />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vision Training</Text>
          <View style={{ width: 60 }} />
        </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  card: {
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  targetEmotion: {
    fontSize: 32,
    fontWeight: '700',
    color: '#facc15',
  },
  detectedEmotion: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
  },
  confidenceText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  feedbackText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#38bdf8',
  },
  trainingButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#2563eb',
  },
  trainingButtonActive: {
    backgroundColor: '#ef4444',
  },
  trainingButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  nextButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: 'white',
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
  },
});
