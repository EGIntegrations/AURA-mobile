import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SAVED_USERNAME_KEY = 'aura_biometric_username';

export class BiometricService {
  static async canAuthenticate(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
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
    return await SecureStore.getItemAsync(SAVED_USERNAME_KEY);
  }
}
