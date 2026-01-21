export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  isActive: boolean;
  supervisorId?: string;
  supervisedUserIds: string[];
  progress: PlayerProgress;
  createdAt: Date;
  lastLoginAt?: Date;
  settings: UserSettings;
  permissions: Permission;
}

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  PARENT = 'parent',
  ADMIN = 'admin',
}

export interface Permission {
  manageUsers: boolean;
  manageStudents: boolean;
  manageChildren: boolean;
  shareContent: boolean;
  viewReports: boolean;
  generateReports: boolean;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  preferredVoice: string;
  theme: 'light' | 'dark';
}

// Re-export PlayerProgress from Game types
export type { PlayerProgress } from './Game';
