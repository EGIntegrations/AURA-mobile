import { create } from 'zustand';
import { User, UserRole } from '../types';
import { AuthenticationService } from '../services/AuthenticationService';
import { BiometricService } from '../services/BiometricService';

interface AuthStore {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  signUp: (
    username: string,
    email: string,
    displayName: string,
    role: UserRole,
    password: string
  ) => Promise<void>;
  updateUserProgress: (progress: User['progress']) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  signIn: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthenticationService.signIn(username, password);
      await BiometricService.saveUsername(user.username);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, isLoading: false });
    }
  },

  signInWithBiometric: async () => {
    set({ isLoading: true, error: null });
    try {
      const username = await BiometricService.authenticate();
      const user = await AuthenticationService.signInWithBiometric(username);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, isLoading: false });
    }
  },

  signUp: async (username, email, displayName, role, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthenticationService.signUp(
        username,
        email,
        displayName,
        role,
        password
      );
      await BiometricService.saveUsername(user.username);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateUserProgress: async (progress) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    await AuthenticationService.updateUserProgress(currentUser.id, progress);
    set({ currentUser: { ...currentUser, progress }, isAuthenticated: true });
  },

  signOut: async () => {
    await AuthenticationService.signOut();
    await BiometricService.clearSavedUsername();
    set({ currentUser: null, isAuthenticated: false });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      if (__DEV__) {
        // Create demo users in dev builds only.
        await AuthenticationService.createDemoUsers();
      }

      // Check if user is already signed in
      const user = await AuthenticationService.getCurrentUser();
      if (user) {
        set({ currentUser: user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
