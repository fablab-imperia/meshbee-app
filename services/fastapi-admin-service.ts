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
  ArniaConStato,
  ArniaCreate,
  ArniaUpdate,
  UtenteArniaCreate,
  UtenteArniaResponse,
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

// =============================================================================
// ARNIE (solo admin)
// =============================================================================

/**
 * Carica tutte le arnie, incluse quelle dismesse (solo admin)
 */
export async function loadAdminArnie(): Promise<{
  success: boolean;
  data?: ArniaConStato[];
  error?: string;
}> {
  try {
    const response = await apiClient.get<ArniaConStato[]>(
      API_CONFIG.ENDPOINTS.ADMIN_ARNIE,
      undefined,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Errore nel caricamento delle arnie',
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Errore caricamento arnie admin:', error);
    return { success: false, error: 'Errore durante il caricamento delle arnie' };
  }
}

/**
 * Crea una nuova arnia (solo admin)
 */
export async function createAdminArnia(
  arnia: ArniaCreate
): Promise<{
  success: boolean;
  data?: ArniaConStato;
  error?: string;
}> {
  try {
    const response = await apiClient.post<ArniaConStato>(
      API_CONFIG.ENDPOINTS.ADMIN_ARNIE,
      arnia,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Errore nella creazione dell'arnia",
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Errore creazione arnia admin:', error);
    return { success: false, error: "Errore durante la creazione dell'arnia" };
  }
}

/**
 * Aggiorna un'arnia (solo admin)
 */
export async function updateAdminArnia(
  arniaId: number,
  update: ArniaUpdate
): Promise<{
  success: boolean;
  data?: ArniaConStato;
  error?: string;
}> {
  try {
    const path = buildPath(API_CONFIG.ENDPOINTS.ADMIN_ARNIA_DETAIL, {
      id_arnia: arniaId,
    });

    const response = await apiClient.put<ArniaConStato>(path, update, true);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Errore nell'aggiornamento dell'arnia",
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Errore aggiornamento arnia admin:', error);
    return { success: false, error: "Errore durante l'aggiornamento dell'arnia" };
  }
}

/**
 * Disattiva un'arnia (soft delete, solo admin)
 */
export async function deleteAdminArnia(arniaId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const path = buildPath(API_CONFIG.ENDPOINTS.ADMIN_ARNIA_DETAIL, {
      id_arnia: arniaId,
    });

    const response = await apiClient.delete(path, true);

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Errore nella disattivazione dell'arnia",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Errore disattivazione arnia admin:', error);
    return { success: false, error: "Errore durante la disattivazione dell'arnia" };
  }
}

// =============================================================================
// ASSOCIAZIONI UTENTE-ARNIA (solo admin)
// =============================================================================

/**
 * Carica le associazioni utente-arnia attive (solo admin)
 */
export async function loadAdminUserArnie(params?: {
  id_utente?: number;
  id_arnia?: number;
}): Promise<{
  success: boolean;
  data?: UtenteArniaResponse[];
  error?: string;
}> {
  try {
    const response = await apiClient.get<UtenteArniaResponse[]>(
      API_CONFIG.ENDPOINTS.ADMIN_UTENTI_ARNIE,
      params,
      true
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Errore nel caricamento delle associazioni',
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Errore caricamento associazioni utente-arnia:', error);
    return { success: false, error: 'Errore durante il caricamento delle associazioni' };
  }
}

/**
 * Associa un utente a un'arnia (solo admin)
 */
export async function associateAdminUserArnia(
  associazione: UtenteArniaCreate
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.ADMIN_UTENTI_ARNIE,
      associazione,
      true
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Errore nell'associazione utente-arnia",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Errore associazione utente-arnia:', error);
    return { success: false, error: "Errore durante l'associazione utente-arnia" };
  }
}

/**
 * Rimuove l'associazione tra un utente e un'arnia (solo admin)
 */
export async function removeAdminUserArnia(
  idUtente: number,
  idArnia: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await apiClient.delete(
      API_CONFIG.ENDPOINTS.ADMIN_UTENTI_ARNIE,
      true,
      { id_utente: idUtente, id_arnia: idArnia }
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Errore nella rimozione dell'associazione",
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Errore rimozione associazione utente-arnia:', error);
    return { success: false, error: "Errore durante la rimozione dell'associazione" };
  }
}