import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { BackendClient } from './BackendClient';

const SAVED_USERNAME_KEY = 'aura_biometric_username';
const BIOMETRIC_ENABLED_KEY = 'aura_biometric_enabled';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class BiometricService {
  static async canAuthenticate(): Promise<boolean> {
    if (!__DEV__ && !BackendClient.isConfigured()) {
      return false;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async isEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY, STORE_OPTIONS);
    return value === 'true';
  }

  static async enable(username: string): Promise<void> {
    if (!BackendClient.isConfigured() && !__DEV__) {
      throw new Error('Biometric login requires secure server authentication');
    }
    const canAuth = await this.canAuthenticate();
    if (!canAuth) {
      throw new Error('Biometric authentication is not available on this device');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric login for AURA',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error('Biometric authentication failed');
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', STORE_OPTIONS);
    await SecureStore.setItemAsync(SAVED_USERNAME_KEY, username, STORE_OPTIONS);
  }

  static async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY, STORE_OPTIONS);
    await SecureStore.deleteItemAsync(SAVED_USERNAME_KEY, STORE_OPTIONS);
  }

  static async getBiometricType(): Promise<'faceId' | 'touchId' | 'fingerprint' | 'none'> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'faceId';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'touchId';
    }
    return 'none';
  }

  static async authenticate(): Promise<string> {
    if (!BackendClient.isConfigured() && !__DEV__) {
      throw new Error('Biometric login requires secure server authentication');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to AURA',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error('Biometric authentication failed');
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('Biometric login is disabled');
    }

    const username = await SecureStore.getItemAsync(SAVED_USERNAME_KEY, STORE_OPTIONS);
    if (!username) {
      throw new Error('No saved username for biometric authentication');
    }

    return username;
  }

  static async saveUsername(username: string): Promise<void> {
    await SecureStore.setItemAsync(SAVED_USERNAME_KEY, username, STORE_OPTIONS);
  }

  static async clearSavedUsername(): Promise<void> {
    await SecureStore.deleteItemAsync(SAVED_USERNAME_KEY, STORE_OPTIONS);
  }

  static async getSavedUsername(): Promise<string | null> {
    const enabled = await this.isEnabled();
    if (!enabled) return null;
    return await SecureStore.getItemAsync(SAVED_USERNAME_KEY, STORE_OPTIONS);
  }
}
