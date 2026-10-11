/**
 * API Client per backend FastAPI
 * Gestisce autenticazione JWT e chiamate HTTP
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';
import { ApiError } from '@/types/api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@beehive_access_token',
  REFRESH_TOKEN: '@beehive_refresh_token',
  USER_DATA: '@beehive_user_data',
};

const SESSION_EXPIRED_MESSAGE = 'Sessione scaduta. Effettua nuovamente il login.';

// ============================================================================
// Storage per tokens
// ============================================================================

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  } catch (error) {
    console.error('Error saving tokens:', error);
    throw error;
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

export async function saveUserData(userData: any): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

export async function getUserData(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// ============================================================================
// JWT
// ============================================================================

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * True se l'access token è già scaduto secondo il claim `exp` del JWT.
 */
export function isAccessTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

// ============================================================================
// API Client
// ============================================================================

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean | null | undefined>;
  requiresAuth?: boolean;
  timeout?: number;
}

export interface ApiClientResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Classe principale per chiamate API
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Costruisce URL completo con parametri query
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Prepara headers per la richiesta
   */
  private async prepareHeaders(
    customHeaders?: Record<string, string>,
    requiresAuth: boolean = false
  ): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    if (requiresAuth) {
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Esegue una richiesta HTTP
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiClientResponse<T>> {
    const {
      method = 'GET',
      headers: customHeaders,
      body,
      params,
      requiresAuth = false,
      timeout = this.timeout,
    } = options;

    try {
      const headers = await this.prepareHeaders(customHeaders, requiresAuth);

      // Se l'access token è già scaduto non inviare la richiesta: invalida la
      // sessione e lascia che la UI riporti al login con un messaggio chiaro,
      // invece di un errore di rete incomprensibile.
      if (requiresAuth) {
        const token = await getAccessToken();
        if (token && isAccessTokenExpired(token)) {
          await this.failSession();
          return {
            success: false,
            error: SESSION_EXPIRED_MESSAGE,
            statusCode: 401,
          };
        }
      }

      const url = this.buildUrl(endpoint, params);

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      console.log(`🌐 API Request: ${method} ${url}`);

      let response = await this.fetchWithTimeout(url, requestOptions, timeout);

      // Parsing risposta
      let data: any;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Gestione risposta non OK
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);

        // 401 su una richiesta autenticata: token scaduto o revocato. Il
        // backend non offre un refresh, quindi la sessione va invalidata.
        if (requiresAuth && response.status === 401) {
          await this.failSession();
          return {
            success: false,
            error: SESSION_EXPIRED_MESSAGE,
            statusCode: response.status,
          };
        }

        return {
          success: false,
          error: this.parseError(data),
          statusCode: response.status,
        };
      }

      console.log(`✅ API Success: ${method} ${url}`);

      return {
        success: true,
        data,
        statusCode: response.status,
      };

    } catch (error: any) {
      console.error(`❌ API Request failed:`, error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }

      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Esegue fetch con timeout, ritentando una volta i soli errori di rete.
   *
   * Al rientro dallo stato di background la connessione può essere stata
   * resettata dal sistema: un singolo retry assorbe quei casi transitori senza
   * mascherare un guasto reale (in quel caso il secondo fetch fallisce ancora).
   */
  private async fetchWithTimeout(
    url: string,
    requestOptions: RequestInit,
    timeout: number
  ): Promise<Response> {
    const doFetch = (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      return fetch(url, { ...requestOptions, signal: controller.signal }).finally(() => {
        clearTimeout(timeoutId);
      });
    };

    try {
      return await doFetch();
    } catch (error: any) {
      // Un abort è un timeout voluto: ritentare non avrebbe senso.
      if (error.name === 'AbortError') {
        throw error;
      }
      // Piccola attesa per dare alla rete il tempo di stabilizzarsi.
      await new Promise(resolve => setTimeout(resolve, 500));
      return doFetch();
    }
  }

  /**
   * Invalida la sessione: cancella i token e notifica l'applicazione.
   */
  private async failSession(): Promise<void> {
    await clearTokens();
    this.unauthorizedHandler?.();
  }

  /**
   * Handler chiamato quando la sessione non è più valida (token scaduto o 401).
   */
  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  /**
   * Estrae messaggio di errore da risposta API
   */
  private parseError(errorData: any): string {
    if (typeof errorData === 'string') {
      return errorData;
    }

    if (errorData.detail) {
      if (typeof errorData.detail === 'string') {
        return errorData.detail;
      }

      if (Array.isArray(errorData.detail)) {
        return errorData.detail
          .map((err: any) => err.msg || JSON.stringify(err))
          .join(', ');
      }
    }

    if (errorData.message) {
      return errorData.message;
    }

    return 'Errore sconosciuto';
  }

  // ==========================================================================
  // Metodi pubblici HTTP
  // ==========================================================================

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    requiresAuth: boolean = false
  ): Promise<ApiClientResponse<T>> {
    return this.executeRequest<T>(endpoint, {
      method: 'GET',
      params,
      requiresAuth,
    });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = false
  ): Promise<ApiClientResponse<T>> {
    return this.executeRequest<T>(endpoint, {
      method: 'POST',
      body,
      requiresAuth,
    });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = false
  ): Promise<ApiClientResponse<T>> {
    return this.executeRequest<T>(endpoint, {
      method: 'PUT',
      body,
      requiresAuth,
    });
  }

  async delete<T>(
    endpoint: string,
    requiresAuth: boolean = false,
    params?: Record<string, any>
  ): Promise<ApiClientResponse<T>> {
    return this.executeRequest<T>(endpoint, {
      method: 'DELETE',
      params,
      requiresAuth,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = false
  ): Promise<ApiClientResponse<T>> {
    return this.executeRequest<T>(endpoint, {
      method: 'PATCH',
      body,
      requiresAuth,
    });
  }
}

// Istanza singleton del client
export const apiClient = new ApiClient();

/**
 * Registra un handler invocato quando la sessione viene invalidata
 * (token scaduto o 401): permette al livello di autenticazione di tornare al login.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  apiClient.setUnauthorizedHandler(handler);
}

// =============================================================================
// Utility functions
// =============================================================================

/**
 * Sostituisce parametri nell'URL (es: /api/arnie/:id -> /api/arnie/123)
 */
export function buildPath(template: string, params: Record<string, string | number>): string {
  let path = template;
  Object.keys(params).forEach(key => {
    path = path.replace(`:${key}`, String(params[key]));
  });
  return path;
}
