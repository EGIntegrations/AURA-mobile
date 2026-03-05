import axios, { AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { BackendAuthService } from './BackendAuthService';
import { Logger } from './Logger';

interface BackendResponse<T> {
  data: T;
}

export class BackendClient {
  private static readonly REQUEST_TIMEOUT_MS = 12000;

  static getBaseUrl(): string {
    const value =
      Constants.expoConfig?.extra?.backendBaseUrl ||
      (Constants.manifest as { extra?: { backendBaseUrl?: string } } | null)?.extra?.backendBaseUrl;
    const baseUrl = typeof value === 'string' ? value.trim() : '';
    if (!baseUrl) return '';

    // Require TLS outside development.
    if (!__DEV__ && !baseUrl.startsWith('https://')) {
      Logger.error('Invalid backend base URL', 'Production builds require https:// backend URL');
      return '';
    }
    return baseUrl;
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
    try {
      const response = await axios({
        ...config,
        baseURL: baseUrl,
        timeout: this.REQUEST_TIMEOUT_MS,
        headers: {
          ...(config.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      return (response.data as BackendResponse<T>).data ?? response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        await BackendAuthService.clearToken();
        throw new Error('Your session expired. Please sign in again.');
      }

      if (error?.code === 'ECONNABORTED') {
        throw new Error('Server timeout. Please try again.');
      }

      throw new Error('Unable to reach AURA backend');
    }
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
