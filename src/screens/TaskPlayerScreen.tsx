import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../store/taskStore';
import { Task } from '../types/Task';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const AUTO_SAVE_INTERVAL_MS = 5000;
const TIMER_COMPLETION_THRESHOLD_SECONDS = 60;
const SESSION_BACKUP_KEY = '@aura_task_player_session_backup';

type TaskPlayerParams = {
  taskId: string;
};

export default function TaskPlayerScreen({ navigation, route }: any) {
  const { taskId } = route.params as TaskPlayerParams;

  const {
    tasks,
    assignedTasks,
    activeTask,
    sessionState,
    setActiveTask,
    completeSession,
  } = useTaskStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalCorrectMoves, setFinalCorrectMoves] = useState(0);
  const [finalMoves, setFinalMoves] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);

  const isCompleteRef = useRef(false);
  const sessionStateRef = useRef(sessionState);

  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  // Resolve task from available lists
  const task: Task | undefined =
    tasks.find((t) => t.id === taskId) ?? assignedTasks.find((t) => t.id === taskId);

  // Initialize session when task is available
  useEffect(() => {
    if (task && !activeTask) {
      setActiveTask(task);
    }
  }, [task, activeTask, setActiveTask]);

  // Timer + auto-completion threshold
  useEffect(() => {
    if (!activeTask || sessionState.startTime === 0 || isCompleteRef.current) {
      return;
    }

    const timer = setInterval(() => {
      if (isCompleteRef.current) {
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      const elapsed = Math.floor((now - sessionState.startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed >= TIMER_COMPLETION_THRESHOLD_SECONDS) {
        finishSession();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTask, sessionState.startTime]);

  // Auto-save every 5s
  useEffect(() => {
    if (!activeTask || isCompleteRef.current) {
      return;
    }

    const autoSave = setInterval(() => {
      if (!activeTask || isCompleteRef.current) return;
      const backup = {
        taskId: activeTask.id,
        sessionState: sessionStateRef.current,
        timestamp: Date.now(),
      };
      AsyncStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(backup)).catch(() => {});
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(autoSave);
  }, [activeTask]);

  const finishSession = () => {
    if (isCompleteRef.current) return;
    isCompleteRef.current = true;

    try {
      const session = completeSession();
      setFinalScore(session.score);
      setFinalCorrectMoves(session.correctMoves);
      setFinalMoves(session.moves);
      setFinalDuration(session.durationSeconds);
      setIsComplete(true);
      AsyncStorage.removeItem(SESSION_BACKUP_KEY).catch(() => {});
    } catch {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    setActiveTask(null);
    navigation.goBack();
  };

  const handleReturnToLibrary = () => {
    setIsComplete(false);
    isCompleteRef.current = false;
    setElapsedSeconds(0);
    setFinalScore(0);
    setFinalCorrectMoves(0);
    setFinalMoves(0);
    setFinalDuration(0);
    navigation.navigate('TaskLibrary');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <LiquidGlassHeader title="Task Player" onBackPress={handleBack} />
        <View style={styles.centerContent}>
          <Text style={styles.placeholderText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LiquidGlassHeader
        title={task.title}
        onBackPress={handleBack}
        rightElement={
          <View style={styles.headerRight}>
            <Text style={styles.scoreText}>{sessionState.score} pts</Text>
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
        }
      />

      <View style={styles.content}>
        {!isComplete ? (
          <View style={styles.gameArea}>
            <Text style={styles.icon}>{task.icon}</Text>
            <Text style={styles.comingSoonText}>Coming soon!</Text>
            <Text style={styles.description}>{task.description}</Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={finishSession}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.overlayContainer}>
            <LiquidGlassCard style={styles.completionCard}>
              <Text style={styles.completionIcon}>🎉</Text>
              <Text style={styles.completionTitle}>Great job!</Text>
              <Text style={styles.completionScore}>
                Final Score: {finalScore}
              </Text>
              <Text style={styles.completionDetails}>
                {finalCorrectMoves} / {finalMoves} correct moves
              </Text>
              <Text style={styles.completionDetails}>
                Time: {formatTime(finalDuration)}
              </Text>
              <View style={styles.completionButtonWrapper}>
                <LiquidGlassButton
                  title="Back to Task Library"
                  onPress={handleReturnToLibrary}
                />
              </View>
            </LiquidGlassCard>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: AURA_COLORS.success,
  },
  timerText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 12,
    color: '#fff',
    marginTop: 2,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  comingSoonText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: AURA_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
  },
  doneButtonText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionCard: {
    width: '100%',
    alignItems: 'center',
  },
  completionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completionTitle: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  completionScore: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 20,
    fontWeight: '600',
    color: AURA_COLORS.success,
    marginBottom: 4,
  },
  completionDetails: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  completionButtonWrapper: {
    marginTop: 20,
    width: '100%',
  },
  placeholderText: {
    fontFamily: AURA_FONTS.rounded,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
});
