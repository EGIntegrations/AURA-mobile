import axios, { AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { BackendAuthService } from './BackendAuthService';

interface BackendResponse<T> {
  data: T;
}

export class BackendClient {
  static getBaseUrl(): string {
    const value =
      Constants.expoConfig?.extra?.backendBaseUrl ||
      (Constants.manifest as { extra?: { backendBaseUrl?: string } } | null)?.extra?.backendBaseUrl;
    return typeof value === 'string' ? value.trim() : '';
  }

  static isConfigured(): boolean {
    return this.getBaseUrl().length > 0;
  }

  static async request<T>(config: AxiosRequestConfig): Promise<T> {
    const baseUrl = this.getBaseUrl().replace(/\/$/, '');
    if (!baseUrl) {
      throw new Error('Backend base URL not configured');
    }

    const token = await BackendAuthService.getToken();
    const response = await axios({
      ...config,
      baseURL: baseUrl,
      headers: {
        ...(config.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return (response.data as BackendResponse<T>).data ?? response.data;
  }

  static async post<T>(path: string, payload?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'post',
      url: path,
      data: payload,
      ...(config || {}),
    });
  }
}
