import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'aura_backend_token';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class BackendAuthService {
  static async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY, STORE_OPTIONS);
  }

  static async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, STORE_OPTIONS);
  }

  static async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY, STORE_OPTIONS);
  }
}
