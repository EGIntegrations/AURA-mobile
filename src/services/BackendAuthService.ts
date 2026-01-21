import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'aura_backend_token';

export class BackendAuthService {
  static async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  static async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  static async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
