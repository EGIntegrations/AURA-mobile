import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SAVED_USERNAME_KEY = 'aura_biometric_username';
const BIOMETRIC_ENABLED_KEY = 'aura_biometric_enabled';

export class BiometricService {
  static async canAuthenticate(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async isEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  }

  static async enable(username: string): Promise<void> {
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

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    await SecureStore.setItemAsync(SAVED_USERNAME_KEY, username);
  }

  static async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(SAVED_USERNAME_KEY);
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

    const username = await SecureStore.getItemAsync(SAVED_USERNAME_KEY);
    if (!username) {
      throw new Error('No saved username for biometric authentication');
    }

    return username;
  }

  static async saveUsername(username: string): Promise<void> {
    await SecureStore.setItemAsync(SAVED_USERNAME_KEY, username);
  }

  static async clearSavedUsername(): Promise<void> {
    await SecureStore.deleteItemAsync(SAVED_USERNAME_KEY);
  }

  static async getSavedUsername(): Promise<string | null> {
    const enabled = await this.isEnabled();
    if (!enabled) return null;
    return await SecureStore.getItemAsync(SAVED_USERNAME_KEY);
  }
}
