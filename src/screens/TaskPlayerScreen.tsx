import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../store/taskStore';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import AuraBackground from '../components/AuraBackground';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';
import { Task, TaskSession } from '../types';

type TaskPlayerParams = {
  taskId: string;
};

const AUTO_SAVE_KEY = '@aura_task_session_autosave';
const COMPLETION_THRESHOLD_SECONDS = 60;

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function TaskPlayerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { taskId } = (route?.params ?? {}) as TaskPlayerParams;

  const {
    tasks,
    assignedTasks,
    activeTask,
    sessionState,
    setActiveTask,
    recordMove,
    completeSession,
  } = useTaskStore();

  const [task, setTask] = useState<Task | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [finalSession, setFinalSession] = useState<TaskSession | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve task and initialize session
  useEffect(() => {
    const found = assignedTasks.find((t) => t.id === taskId) ?? tasks.find((t) => t.id === taskId);
    if (found) {
      setActiveTask(found);
      setTask(found);
    } else {
      setTask(null);
    }
  }, [taskId, assignedTasks, tasks, setActiveTask]);

  // Start timer when active task is set
  useEffect(() => {
    if (!activeTask) return;
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeTask]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!activeTask) return;

    autoSaveRef.current = setInterval(() => {
      const state = useTaskStore.getState();
      const payload = {
        taskId: activeTask.id,
        score: state.sessionState.score,
        moves: state.sessionState.moves,
        correctMoves: state.sessionState.correctMoves,
        elapsedSeconds: Math.floor((Date.now() - state.sessionState.startTime) / 1000),
        timestamp: Date.now(),
      };
      AsyncStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(payload)).catch(() => {
        // silently ignore
      });
    }, 5000);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [activeTask]);

  const handleComplete = useCallback(() => {
    if (showCompletion || !activeTask) return;
    setShowCompletion(true);
    try {
      const session = completeSession();
      setFinalSession(session);
    } catch {
      setFinalSession(null);
    }
  }, [showCompletion, activeTask, completeSession]);

  // Trigger completion when threshold reached
  useEffect(() => {
    if (elapsedSeconds >= COMPLETION_THRESHOLD_SECONDS && !showCompletion) {
      handleComplete();
    }
  }, [elapsedSeconds, showCompletion, handleComplete]);

  const handleBack = useCallback(() => {
    setActiveTask(null);
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  }, [setActiveTask, navigation]);

  const handleReturnToLibrary = useCallback(() => {
    setActiveTask(null);
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('TaskLibrary');
    }
  }, [setActiveTask, navigation]);

  const handleSimulateMove = useCallback(() => {
    recordMove(true);
  }, [recordMove]);

  if (!task) {
    return (
      <View style={styles.container}>
        <AuraBackground />
        <View style={{ paddingTop: insets.top }}>
          <LiquidGlassHeader title="Task Not Found" onBackPress={handleBack} />
        </View>
        <View style={[styles.centerContent, { paddingBottom: insets.bottom }]}>
          <Text style={styles.placeholderText}>Task not found</Text>
          <LiquidGlassButton title="Go Back" onPress={handleBack} style={styles.doneButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AuraBackground />
      <LiquidGlassHeader
        title={task.title}
        onBackPress={handleBack}
        rightElement={
          <Text style={styles.scoreText}>{sessionState.score}</Text>
        }
      />

      <View style={styles.content}>
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Time</Text>
          <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>
        </View>

        <View style={styles.gameArea}>
          <Text style={styles.taskIcon}>{task.icon}</Text>
          <Text style={styles.comingSoonText}>Coming soon!</Text>
          <Text style={styles.taskDescription}>{task.description}</Text>

          {/* Placeholder interaction to demonstrate recordMove */}
          <TouchableOpacity style={styles.simulateButton} onPress={handleSimulateMove} activeOpacity={0.8}>
            <Text style={styles.simulateButtonText}>Simulate Correct Move (+10)</Text>
          </TouchableOpacity>
        </View>

        <LiquidGlassButton title="Done" onPress={handleComplete} style={styles.doneButton} />
      </View>

      {showCompletion && (
        <View style={styles.overlay}>
          <LiquidGlassCard style={styles.completionCard}>
            <Text style={styles.completionTitle}>Great job!</Text>
            <Text style={styles.completionScore}>
              Final Score: {finalSession?.score ?? 0}
            </Text>
            <Text style={styles.completionDetail}>
              {finalSession?.correctMoves ?? 0} / {finalSession?.moves ?? 0} correct moves
            </Text>
            <Text style={styles.completionDetail}>
              Time: {formatTime(finalSession?.durationSeconds ?? elapsedSeconds)}
            </Text>
            <LiquidGlassButton
              title="Return to Task Library"
              onPress={handleReturnToLibrary}
              style={styles.returnButton}
            />
          </LiquidGlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: AURA_COLORS.accent,
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  taskIcon: {
    fontSize: 80,
  },
  comingSoonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  simulateButton: {
    marginTop: 24,
    backgroundColor: AURA_COLORS.glass.base,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  simulateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  doneButton: {
    marginTop: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completionCard: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.6,
  },
  completionScore: {
    fontSize: 22,
    fontWeight: '700',
    color: AURA_COLORS.accent,
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.4,
  },
  completionDetail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  returnButton: {
    marginTop: 16,
    width: '100%',
  },
  placeholderText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
    marginBottom: 24,
  },
});
