import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY = 'aura_openai_key';
const ELEVENLABS_KEY = 'aura_elevenlabs_key';

export class APIKeyService {
  static async getOpenAIKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(OPENAI_KEY);
  }

  static async saveOpenAIKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(OPENAI_KEY, key);
  }

  static async getElevenLabsKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(ELEVENLABS_KEY);
  }

  static async saveElevenLabsKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(ELEVENLABS_KEY, key);
  }

  static async deleteAllKeys(): Promise<void> {
    await SecureStore.deleteItemAsync(OPENAI_KEY);
    await SecureStore.deleteItemAsync(ELEVENLABS_KEY);
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
