export interface Task {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  type: 'drag-drop' | 'tap-sequence' | 'match';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  ageRange: [number, number];
  assets: TaskAsset[];
  rules: TaskRule[];
  isAssigned: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAsset {
  id: string;
  type: 'image' | 'audio';
  url: string;
  label?: string;
}

export interface TaskRule {
  id: string;
  action: 'drag-to-target' | 'tap-in-order' | 'match-pairs';
  sourceAssetId?: string;
  targetAssetId?: string;
  sequence?: string[];
  successCriteria: {
    minScore?: number;
    maxTimeSeconds?: number;
  };
  framingText: string;
}

export interface TaskSession {
  id: string;
  taskId: string;
  userId: string;
  score: number;
  maxPossibleScore: number;
  moves: number;
  correctMoves: number;
  durationSeconds: number;
  completedAt: Date;
  syncedAt?: Date;
}
