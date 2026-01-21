import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { User, UserRole, PlayerProgress } from '../types';
import { BackendAuthService } from './BackendAuthService';
import { BackendClient } from './BackendClient';

const USERS_KEY = 'aura_users';
const CURRENT_USER_KEY = 'aura_current_user';

export class AuthenticationService {
  static async signIn(username: string, password: string): Promise<User> {
    const users = await this.getAllUsers();
    let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    if (user.passwordSalt) {
      const passwordHash = await this.hashPassword(password, user.passwordSalt);
      if (passwordHash !== user.passwordHash) {
        throw new Error('Invalid credentials');
      }
    } else {
      const legacyHash = await this.hashPasswordLegacy(password);
      if (legacyHash !== user.passwordHash) {
        throw new Error('Invalid credentials');
      }
      user = await this.upgradeLegacyPassword(user, password);
    }

    if (BackendClient.isConfigured()) {
      try {
        const response = await BackendClient.post<{ token: string }>('/auth/login', {
          username,
          password,
        });
        if (response?.token) {
          await BackendAuthService.saveToken(response.token);
        }
      } catch (error) {
        throw new Error('Unable to sign in to server');
      }
    }

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
    };

    await this.persistUser(updatedUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.serializeUser(updatedUser)));

    return updatedUser;
  }

  static async signInWithBiometric(username: string): Promise<User> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    if (BackendClient.isConfigured()) {
      try {
        const response = await BackendClient.post<{ token: string }>('/auth/biometric', {
          username,
        });
        if (response?.token) {
          await BackendAuthService.saveToken(response.token);
        }
      } catch (error) {
        throw new Error('Unable to sign in to server');
      }
    }

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
    };

    await this.persistUser(updatedUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.serializeUser(updatedUser)));
    return updatedUser;
  }

  static async signUp(
    username: string,
    email: string,
    displayName: string,
    role: UserRole,
    password: string,
    supervisorId?: string,
    options?: { setAsCurrentUser?: boolean }
  ): Promise<User> {
    const users = await this.getAllUsers();
    const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (existing) {
      throw new Error('User already exists');
    }

    const passwordSalt = await this.generateSalt();
    const passwordHash = await this.hashPassword(password, passwordSalt);
    const newUser: User = {
      id: this.generateId(),
      username,
      email,
      displayName,
      role,
      passwordHash,
      passwordSalt,
      isActive: true,
      supervisorId,
      supervisedUserIds: [],
      progress: this.createEmptyProgress(),
      createdAt: new Date(),
      lastLoginAt: new Date(),
      settings: {
        notificationsEnabled: true,
        soundEnabled: true,
        preferredVoice: 'alloy',
        theme: 'dark',
      },
      permissions: this.getDefaultPermissions(role),
    };

    if (BackendClient.isConfigured()) {
      try {
        const response = await BackendClient.post<{ token: string }>('/auth/register', {
          username,
          email,
          displayName,
          role,
          password,
        });
        if (response?.token) {
          await BackendAuthService.saveToken(response.token);
        }
      } catch (error) {
        throw new Error('Unable to register with server');
      }
    }

    await this.saveUser(newUser);
    if (options?.setAsCurrentUser !== false) {
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.serializeUser(newUser)));
    }

    if (supervisorId) {
      await this.addSupervisedUser(supervisorId, newUser.id);
    }

    return newUser;
  }

  static async signOut(): Promise<void> {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    await BackendAuthService.clearToken();
  }

  static async getCurrentUser(): Promise<User | null> {
    const data = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;
    return this.deserializeUser(JSON.parse(data));
  }

  static async updateUserProgress(userId: string, progress: PlayerProgress): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex >= 0) {
      users[userIndex].progress = progress;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(u => this.serializeUser(u))));

      // Update current user if it's the same user
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.progress = progress;
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.serializeUser(currentUser)));
      }
    }
  }

  static async getAllUsers(): Promise<User[]> {
    const data = await AsyncStorage.getItem(USERS_KEY);
    if (!data) return [];
    const serialized = JSON.parse(data);
    return serialized.map((u: any) => this.deserializeUser(u));
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  static async getSupervisedUsers(supervisorId: string): Promise<User[]> {
    const users = await this.getAllUsers();
    return users.filter(user => user.supervisorId === supervisorId);
  }

  static async addSupervisedUser(supervisorId: string, userId: string): Promise<void> {
    const users = await this.getAllUsers();
    const supervisorIndex = users.findIndex(user => user.id === supervisorId);
    if (supervisorIndex < 0) return;

    const supervisor = users[supervisorIndex];
    const updatedSupervisor: User = {
      ...supervisor,
      supervisedUserIds: Array.from(new Set([...(supervisor.supervisedUserIds || []), userId])),
    };

    users[supervisorIndex] = updatedSupervisor;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(u => this.serializeUser(u))));

    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.id === supervisorId) {
      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(this.serializeUser(updatedSupervisor))
      );
    }
  }

  private static async saveUser(user: User): Promise<void> {
    const users = await this.getAllUsers();
    users.push(user);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(u => this.serializeUser(u))));
  }

  private static async persistUser(user: User): Promise<void> {
    const users = await this.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(u => this.serializeUser(u))));
    }
  }

  private static async hashPassword(password: string, salt: string): Promise<string> {
    const salted = `${password}::${salt}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salted
    );
  }

  private static async hashPasswordLegacy(password: string): Promise<string> {
    const salted = `${password}::AURA::2025`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salted
    );
  }

  private static async generateSalt(): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes)
      .map(value => value.toString(16).padStart(2, '0'))
      .join('');
  }

  private static async upgradeLegacyPassword(user: User, password: string): Promise<User> {
    const passwordSalt = await this.generateSalt();
    const passwordHash = await this.hashPassword(password, passwordSalt);
    const updatedUser: User = {
      ...user,
      passwordSalt,
      passwordHash,
    };
    await this.persistUser(updatedUser);
    return updatedUser;
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static createEmptyProgress(): PlayerProgress {
    return {
      totalSessions: 0,
      totalScore: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      overallAccuracy: 0,
      currentLevel: 1,
      currentStreak: 0,
      bestStreak: 0,
      unlockedEmotions: ['Happy', 'Sad', 'Neutral'],
      sessionHistory: [],
      mimicryHistory: [],
      speechPracticeHistory: [],
      conversationHistory: [],
      achievementsUnlocked: [],
    };
  }

  private static getDefaultPermissions(role: UserRole) {
    switch (role) {
      case UserRole.ADMIN:
        return {
          manageUsers: true,
          manageStudents: true,
          manageChildren: true,
          shareContent: true,
          viewReports: true,
          generateReports: true,
        };
      case UserRole.TEACHER:
        return {
          manageUsers: false,
          manageStudents: true,
          manageChildren: false,
          shareContent: true,
          viewReports: true,
          generateReports: true,
        };
      case UserRole.PARENT:
        return {
          manageUsers: false,
          manageStudents: false,
          manageChildren: true,
          shareContent: true,
          viewReports: true,
          generateReports: false,
        };
      case UserRole.STUDENT:
      default:
        return {
          manageUsers: false,
          manageStudents: false,
          manageChildren: false,
          shareContent: false,
          viewReports: false,
          generateReports: false,
        };
    }
  }

  // Serialize Date objects to ISO strings for storage
  private static serializeUser(user: User): any {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      progress: {
        ...user.progress,
        lastSessionDate: user.progress.lastSessionDate?.toISOString(),
        sessionHistory: user.progress.sessionHistory.map(s => ({
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime?.toISOString(),
        })),
        mimicryHistory: user.progress.mimicryHistory.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        speechPracticeHistory: user.progress.speechPracticeHistory.map(sp => ({
          ...sp,
          timestamp: sp.timestamp.toISOString(),
        })),
        conversationHistory: user.progress.conversationHistory.map(c => ({
          ...c,
          timestamp: c.timestamp.toISOString(),
        })),
      },
    };
  }

  // Deserialize ISO strings back to Date objects
  private static deserializeUser(data: any): User {
    const baseProgress = this.createEmptyProgress();
    const progress = data.progress || baseProgress;

    return {
      ...data,
      passwordSalt: data.passwordSalt || '',
      createdAt: new Date(data.createdAt),
      lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : undefined,
      progress: {
        ...baseProgress,
        ...progress,
        lastSessionDate: progress.lastSessionDate ? new Date(progress.lastSessionDate) : undefined,
        sessionHistory: (progress.sessionHistory || []).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined,
        })),
        mimicryHistory: (progress.mimicryHistory || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        speechPracticeHistory: (progress.speechPracticeHistory || []).map((sp: any) => ({
          ...sp,
          timestamp: new Date(sp.timestamp),
        })),
        conversationHistory: (progress.conversationHistory || []).map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp),
        })),
      },
    };
  }

  // Create demo users for testing
  static async createDemoUsers(): Promise<void> {
    if (!__DEV__) return;

    const users = await this.getAllUsers();
    if (users.length > 0) return;

    const teacher = await this.signUp(
      'teacher1',
      'teacher@demo.com',
      'Ms. Smith',
      UserRole.TEACHER,
      'demo',
      undefined,
      { setAsCurrentUser: false }
    );
    const parent = await this.signUp(
      'parent1',
      'parent@demo.com',
      'John Parent',
      UserRole.PARENT,
      'demo',
      undefined,
      { setAsCurrentUser: false }
    );
    await this.signUp(
      'student1',
      'student1@demo.com',
      'Alex',
      UserRole.STUDENT,
      'demo',
      teacher.id,
      { setAsCurrentUser: false }
    );
    await this.signUp(
      'student2',
      'student2@demo.com',
      'Sam',
      UserRole.STUDENT,
      'demo',
      parent.id,
      { setAsCurrentUser: false }
    );
  }
}
