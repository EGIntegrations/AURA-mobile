import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_PROCESSING_CONSENT_KEY = 'aura_ai_processing_consent_v1';

export class ConsentService {
  static async hasAIProcessingConsent(): Promise<boolean> {
    const value = await AsyncStorage.getItem(AI_PROCESSING_CONSENT_KEY);
    return value === 'true';
  }

  static async setAIProcessingConsent(granted: boolean): Promise<void> {
    await AsyncStorage.setItem(AI_PROCESSING_CONSENT_KEY, granted ? 'true' : 'false');
  }
}
