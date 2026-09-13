/**
 * Servizio per l'amministrazione tramite FastAPI Backend
 */

import { apiClient, buildPath } from './api-client';
import { API_CONFIG } from '@/config/api';
import {
  UserResponse,
  UserCreate,
  UserUpdate,
  PasswordChange,
  AttivitaResponse,
} from '@/types/api';

/**
 * Carica tutti gli utenti (solo admin)
 */
export async function loadAdminUsers(): Promise<{
  success: boolean;
  data?: UserResponse[];
  error?: string;
}> {
  try {
    const response = await apiClient.get<UserResponse[]>(
      API_CONFIG.ENDPOINTS.ADMIN_UTENTI,
      undefined,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Errore nel caricamento degli utenti',
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Errore caricamento utenti admin:', error);
    return {
      success: false,
      error: 'Errore durante il caricamento degli utenti',
    };
  }
}

/**
 * Crea un nuovo utente (solo admin)
 */
export async function createAdminUser(
  user: UserCreate
): Promise<{
  success: boolean;
  data?: UserResponse;
  error?: string;
}> {
  try {
    const response = await apiClient.post<UserResponse>(
      API_CONFIG.ENDPOINTS.ADMIN_UTENTI,
      user,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Errore nella creazione dell'utente",
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Errore creazione utente admin:', error);
    return {
      success: false,
      error: 'Errore durante la creazione dell\'utente',
    };
  }
}

/**
 * Aggiorna un utente (solo admin)
 */
export async function updateAdminUser(
  userId: number,
  update: UserUpdate
): Promise<{
  success: boolean;
  data?: UserResponse;
  error?: string;
}> {
  try {
    const path = buildPath(API_CONFIG.ENDPOINTS.ADMIN_UTENTI_DETAIL, {
      id_utente: userId,
    });

    const response = await apiClient.put<UserResponse>(path, update, true);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Errore nell'aggiornamento dell'utente",
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Errore aggiornamento utente admin:', error);
    return {
      success: false,
      error: 'Errore durante l\'aggiornamento dell\'utente',
    };
  }
}

/**
 * Reimposta la password di un utente (solo admin)
 */
export async function resetAdminUserPassword(
  userId: number,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const path = buildPath(API_CONFIG.ENDPOINTS.ADMIN_UTENTI_PASSWORD, {
      id_utente: userId,
    });

    const body: PasswordChange = { new_password: newPassword };

    const response = await apiClient.put(path, body, true);

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Errore nella reimpostazione della password",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Errore reset password utente admin:', error);
    return {
      success: false,
      error: 'Errore durante la reimpostazione della password',
    };
  }
}

/**
 * Elimina un utente (solo admin)
 */
export async function deleteAdminUser(userId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const path = buildPath(API_CONFIG.ENDPOINTS.ADMIN_UTENTI_DETAIL, {
      id_utente: userId,
    });

    const response = await apiClient.delete(path, true);

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Errore nell'eliminazione dell'utente",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Errore eliminazione utente admin:', error);
    return {
      success: false,
      error: 'Errore durante l\'eliminazione dell\'utente',
    };
  }
}

/**
 * Carica il registro attività globale (solo admin)
 */
export async function loadAdminActivities(): Promise<{
  success: boolean;
  data?: AttivitaResponse[];
  error?: string;
}> {
  try {
    const response = await apiClient.get<AttivitaResponse[]>(
      API_CONFIG.ENDPOINTS.ADMIN_ATTIVITA,
      undefined,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Errore nel caricamento delle attività',
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Errore caricamento attività admin:', error);
    return {
      success: false,
      error: 'Errore durante il caricamento delle attività',
    };
  }
}