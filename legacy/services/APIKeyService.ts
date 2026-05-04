import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY = 'aura_openai_key';
const ELEVENLABS_KEY = 'aura_elevenlabs_key';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class APIKeyService {
  static async getOpenAIKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(OPENAI_KEY, STORE_OPTIONS);
  }

  static async saveOpenAIKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(OPENAI_KEY, key, STORE_OPTIONS);
  }

  static async getElevenLabsKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(ELEVENLABS_KEY, STORE_OPTIONS);
  }

  static async saveElevenLabsKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(ELEVENLABS_KEY, key, STORE_OPTIONS);
  }

  static async deleteAllKeys(): Promise<void> {
    await SecureStore.deleteItemAsync(OPENAI_KEY, STORE_OPTIONS);
    await SecureStore.deleteItemAsync(ELEVENLABS_KEY, STORE_OPTIONS);
  }

  static async hasOpenAIKey(): Promise<boolean> {
    const key = await this.getOpenAIKey();
    return !!key;
  }

  static async hasElevenLabsKey(): Promise<boolean> {
    const key = await this.getElevenLabsKey();
    return !!key;
  }
}
