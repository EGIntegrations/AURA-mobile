import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskSession } from '../types';

const PENDING_SESSIONS_KEY = '@aura_pending_sessions';

const initialSessionState = {
  score: 0,
  moves: 0,
  correctMoves: 0,
  startTime: 0,
  isComplete: false,
};

const DEMO_TASKS: Task[] = [
  {
    id: 'demo-1',
    title: 'Match the Animals',
    description: 'Drag each animal to its home!',
    icon: '🦁',
    type: 'drag-drop',
    difficulty: 'easy',
    category: 'Animals',
    ageRange: [3, 8],
    assets: [],
    rules: [],
    isAssigned: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-2',
    title: 'Counting Stars',
    description: 'Tap the stars in order!',
    icon: '⭐',
    type: 'tap-sequence',
    difficulty: 'medium',
    category: 'Numbers',
    ageRange: [4, 10],
    assets: [],
    rules: [],
    isAssigned: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-3',
    title: 'Color Pairs',
    description: 'Match the colors that go together.',
    icon: '🎨',
    type: 'match',
    difficulty: 'easy',
    category: 'Colors',
    ageRange: [3, 7],
    assets: [],
    rules: [],
    isAssigned: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface TaskState {
  tasks: Task[];
  assignedTasks: Task[];
  activeTask: Task | null;
  sessionState: {
    score: number;
    moves: number;
    correctMoves: number;
    startTime: number;
    isComplete: boolean;
  };
  fetchTasks: () => Promise<void>;
  fetchAssignedTasks: (userId: string) => Promise<void>;
  setActiveTask: (task: Task | null) => void;
  recordMove: (isCorrect: boolean) => void;
  completeSession: () => TaskSession;
  syncPendingSessions: () => Promise<{ synced: number; failed: number }>;
}

let lastUserId: string | null = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  assignedTasks: [],
  activeTask: null,
  sessionState: { ...initialSessionState },

  fetchTasks: async () => {
    if (__DEV__) {
      set({ tasks: DEMO_TASKS });
      return;
    }
    // TODO: implement API call
    set({ tasks: [] });
  },

  fetchAssignedTasks: async (userId) => {
    lastUserId = userId;
    if (__DEV__) {
      set({ assignedTasks: DEMO_TASKS });
      return;
    }
    // TODO: implement API call
    set({ assignedTasks: [] });
  },

  setActiveTask: (task) => {
    set({
      activeTask: task,
      sessionState: task
        ? { ...initialSessionState, startTime: Date.now() }
        : { ...initialSessionState },
    });
  },

  recordMove: (isCorrect) => {
    set((state) => ({
      sessionState: {
        ...state.sessionState,
        moves: state.sessionState.moves + 1,
        correctMoves: state.sessionState.correctMoves + (isCorrect ? 1 : 0),
        score: state.sessionState.score + (isCorrect ? 10 : 0),
      },
    }));
  },

  completeSession: () => {
    const state = get();
    const { activeTask, sessionState } = state;

    if (!activeTask) {
      throw new Error('No active task to complete');
    }

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - sessionState.startTime) / 1000);

    const session: TaskSession = {
      id: `session-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`,
      taskId: activeTask.id,
      userId: lastUserId ?? 'anonymous',
      score: sessionState.score,
      maxPossibleScore: sessionState.moves * 10,
      moves: sessionState.moves,
      correctMoves: sessionState.correctMoves,
      durationSeconds: Math.max(0, durationSeconds),
      completedAt: now,
    };

    // Queue for sync (fire-and-forget)
    AsyncStorage.getItem(PENDING_SESSIONS_KEY)
      .then((raw) => {
        const pending: TaskSession[] = raw ? JSON.parse(raw) : [];
        pending.push(session);
        return AsyncStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(pending));
      })
      .catch(() => {
        // Silently fail — session is still returned to caller
      });

    set({
      activeTask: null,
      sessionState: { ...initialSessionState },
    });

    return session;
  },

  syncPendingSessions: async () => {
    const raw = await AsyncStorage.getItem(PENDING_SESSIONS_KEY);
    const pending: TaskSession[] = raw ? JSON.parse(raw) : [];

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    if (__DEV__) {
      await AsyncStorage.removeItem(PENDING_SESSIONS_KEY);
      return { synced: pending.length, failed: 0 };
    }

    // TODO: implement real API sync
    const remaining: TaskSession[] = [];
    let synced = 0;
    let failed = 0;

    for (const session of pending) {
      try {
        // await api.post('/sessions', session);
        synced++;
      } catch {
        failed++;
        remaining.push(session);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_SESSIONS_KEY);
    }

    return { synced, failed };
  },
}));
