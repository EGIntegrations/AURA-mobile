import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { User, UserRole, PlayerProgress } from '../types';
import { BackendAuthService } from './BackendAuthService';
import { BackendClient } from './BackendClient';
import { Logger } from './Logger';

const USERS_KEY = 'aura_users';
const CURRENT_USER_KEY = 'aura_current_user';
const USER_CREDENTIALS_PREFIX = 'aura_user_credentials_v1:';
const PASSWORD_HASH_VERSION = 'v2';
const PASSWORD_HASH_ITERATIONS = 12000;
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class AuthenticationService {
  static async signIn(username: string, password: string): Promise<User> {
    const normalizedUsername = username.trim();
    let serverAuthenticated = false;

    if (!this.isLocalAuthAllowed() && !BackendClient.isConfigured()) {
      throw new Error('Server authentication is required in production.');
    }

    if (BackendClient.isConfigured()) {
      try {
        const response = await BackendClient.post<{ token: string }>('/auth/login', {
          username: normalizedUsername,
          password,
        });
        if (response?.token) {
          await BackendAuthService.saveToken(response.token);
        }
        serverAuthenticated = true;
      } catch (error) {
        if (!this.isLocalAuthAllowed()) {
          throw new Error('Unable to sign in to server');
        }
        Logger.warn('Server sign-in failed, falling back to local auth', Logger.fromError(error));
      }
    }

    const users = await this.getAllUsers();
    let user = users.find(u => u.username.toLowerCase() === normalizedUsername.toLowerCase());

    if (!user) {
      if (BackendClient.isConfigured() && serverAuthenticated) {
        user = this.createServerBackedUser(normalizedUsername);
        await this.saveUser(user);
      } else {
        throw new Error('User not found');
      }
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    if (!BackendClient.isConfigured() || !serverAuthenticated) {
      if (user.passwordSalt) {
        const validPassword = await this.verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!validPassword) {
          throw new Error('Invalid credentials');
        }
        if (!this.isVersionedHash(user.passwordHash)) {
          user = await this.upgradePasswordHash(user, password);
        }
      } else {
        const legacyHash = await this.hashPasswordLegacy(password);
        if (legacyHash !== user.passwordHash) {
          throw new Error('Invalid credentials');
        }
        user = await this.upgradeLegacyPassword(user, password);
      }
    }

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
    };

    await this.persistUser(updatedUser);
    await AsyncStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(this.serializeUser(updatedUser, { includeCredentials: false }))
    );

    return updatedUser;
  }

  static async signInWithBiometric(username: string): Promise<User> {
    if (!BackendClient.isConfigured()) {
      throw new Error('Biometric login requires secure server authentication.');
    }

    const nonce = await this.generateSalt();
    const timestamp = Date.now();
    const normalizedUsername = username.trim();

    try {
      const response = await BackendClient.post<{ token: string }>('/auth/biometric', {
        username: normalizedUsername,
        nonce,
        timestamp,
      });
      if (response?.token) {
        await BackendAuthService.saveToken(response.token);
      }
    } catch (error) {
      throw new Error('Unable to sign in to server');
    }

    let user = await this.getUserByUsername(normalizedUsername);
    if (!user) {
      user = this.createServerBackedUser(normalizedUsername);
      await this.saveUser(user);
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
    };

    await this.persistUser(updatedUser);
    await AsyncStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(this.serializeUser(updatedUser, { includeCredentials: false }))
    );
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
    const localAuthAllowed = this.isLocalAuthAllowed();

    if (!localAuthAllowed && !BackendClient.isConfigured()) {
      throw new Error('Server registration is required in production.');
    }

    const sanitizedRole = __DEV__ ? role : UserRole.STUDENT;
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
      role: sanitizedRole,
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
      permissions: this.getDefaultPermissions(sanitizedRole),
    };

    if (BackendClient.isConfigured()) {
      try {
        const response = await BackendClient.post<{ token: string }>('/auth/register', {
          username,
          email,
          displayName,
          role: sanitizedRole,
          password,
        });
        if (response?.token) {
          await BackendAuthService.saveToken(response.token);
        }
      } catch (error) {
        if (!localAuthAllowed) {
          throw new Error('Unable to register with server');
        }
        Logger.warn('Server registration failed, falling back to local auth', Logger.fromError(error));
      }
    }

    await this.saveUser(newUser);
    if (options?.setAsCurrentUser !== false) {
      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(this.serializeUser(newUser, { includeCredentials: false }))
      );
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
    const currentUser = this.deserializeUser(JSON.parse(data));
    return await this.hydrateCredentials(currentUser);
  }

  static async updateUserProgress(userId: string, progress: PlayerProgress): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex >= 0) {
      users[userIndex].progress = progress;
      await AsyncStorage.setItem(
        USERS_KEY,
        JSON.stringify(users.map(u => this.serializeUser(u, { includeCredentials: false })))
      );

      // Update current user if it's the same user
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.progress = progress;
        await AsyncStorage.setItem(
          CURRENT_USER_KEY,
          JSON.stringify(this.serializeUser(currentUser, { includeCredentials: false }))
        );
      }
    }
  }

  static async getAllUsers(): Promise<User[]> {
    const data = await AsyncStorage.getItem(USERS_KEY);
    if (!data) return [];
    const serialized = JSON.parse(data);
    const users = serialized.map((u: any) => this.deserializeUser(u));
    return await Promise.all(users.map((user: User) => this.hydrateCredentials(user)));
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
    await AsyncStorage.setItem(
      USERS_KEY,
      JSON.stringify(users.map(u => this.serializeUser(u, { includeCredentials: false })))
    );

    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.id === supervisorId) {
      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(this.serializeUser(updatedSupervisor, { includeCredentials: false }))
      );
    }
  }

  private static async saveUser(user: User): Promise<void> {
    const users = await this.getAllUsers();
    const withoutSameId = users.filter(existing => existing.id !== user.id);
    withoutSameId.push(user);
    await this.persistCredentials(user);
    await AsyncStorage.setItem(
      USERS_KEY,
      JSON.stringify(withoutSameId.map(u => this.serializeUser(u, { includeCredentials: false })))
    );
  }

  private static async persistUser(user: User): Promise<void> {
    const users = await this.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
      await this.persistCredentials(user);
      await AsyncStorage.setItem(
        USERS_KEY,
        JSON.stringify(users.map(u => this.serializeUser(u, { includeCredentials: false })))
      );
    }
  }

  private static async hashPassword(password: string, salt: string): Promise<string> {
    let digest = `${password}::${salt}`;
    for (let i = 0; i < PASSWORD_HASH_ITERATIONS; i += 1) {
      digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${digest}::${salt}::${i}`
      );
    }
    return `${PASSWORD_HASH_VERSION}$${PASSWORD_HASH_ITERATIONS}$${digest}`;
  }

  private static async verifyPassword(
    password: string,
    salt: string,
    storedHash: string
  ): Promise<boolean> {
    if (this.isVersionedHash(storedHash)) {
      const [version, iterationText, expectedHash] = storedHash.split('$');
      const iterations = Number(iterationText) || PASSWORD_HASH_ITERATIONS;
      if (version !== PASSWORD_HASH_VERSION || !expectedHash) return false;

      let digest = `${password}::${salt}`;
      for (let i = 0; i < iterations; i += 1) {
        digest = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${digest}::${salt}::${i}`
        );
      }
      return digest === expectedHash;
    }

    const legacyCurrentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${password}::${salt}`
    );
    return legacyCurrentHash === storedHash;
  }

  private static isVersionedHash(hash: string): boolean {
    return typeof hash === 'string' && hash.startsWith(`${PASSWORD_HASH_VERSION}$`);
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

  private static async upgradePasswordHash(user: User, password: string): Promise<User> {
    const passwordHash = await this.hashPassword(password, user.passwordSalt);
    const updatedUser: User = {
      ...user,
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

  private static isLocalAuthAllowed(): boolean {
    if (__DEV__) return true;
    const value =
      Constants.expoConfig?.extra?.allowOfflineAuthInProduction ??
      (Constants.manifest as { extra?: { allowOfflineAuthInProduction?: boolean } } | null)?.extra
        ?.allowOfflineAuthInProduction;
    return value === true;
  }

  private static createServerBackedUser(username: string): User {
    return {
      id: this.generateId(),
      username,
      email: '',
      displayName: username,
      role: UserRole.STUDENT,
      passwordHash: '',
      passwordSalt: '',
      isActive: true,
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
      permissions: this.getDefaultPermissions(UserRole.STUDENT),
    };
  }

  private static async getCredentials(userId: string): Promise<{ passwordHash: string; passwordSalt: string } | null> {
    const serialized = await SecureStore.getItemAsync(
      `${USER_CREDENTIALS_PREFIX}${userId}`,
      SECURE_STORE_OPTIONS
    );
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      if (!parsed.passwordHash || !parsed.passwordSalt) return null;
      return {
        passwordHash: parsed.passwordHash,
        passwordSalt: parsed.passwordSalt,
      };
    } catch (error) {
      Logger.warn('Credential parse error', Logger.fromError(error));
      return null;
    }
  }

  private static async persistCredentials(user: User): Promise<void> {
    if (!user.passwordHash || !user.passwordSalt) return;
    await SecureStore.setItemAsync(
      `${USER_CREDENTIALS_PREFIX}${user.id}`,
      JSON.stringify({
        passwordHash: user.passwordHash,
        passwordSalt: user.passwordSalt,
      }),
      SECURE_STORE_OPTIONS
    );
  }

  private static async hydrateCredentials(user: User): Promise<User> {
    const secureCredentials = await this.getCredentials(user.id);
    if (secureCredentials) {
      return {
        ...user,
        ...secureCredentials,
      };
    }

    // One-time migration path from old AsyncStorage payloads with embedded credentials.
    if (user.passwordHash && user.passwordSalt) {
      await this.persistCredentials(user);
    }

    return user;
  }

  // Serialize Date objects to ISO strings for storage
  private static serializeUser(
    user: User,
    options: { includeCredentials?: boolean } = {}
  ): any {
    const includeCredentials = options.includeCredentials ?? false;
    return {
      ...user,
      passwordHash: includeCredentials ? user.passwordHash : '',
      passwordSalt: includeCredentials ? user.passwordSalt : '',
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

  static isOfflineAuthEnabled(): boolean {
    return this.isLocalAuthAllowed();
  }
}
