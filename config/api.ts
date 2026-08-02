import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Calcola la URL base appropriata per il backend in base al dispositivo
 */
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Su emulatore Android, localhost punta alla VM interna: usa 10.0.2.2 per raggiungere l'host
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  // URL base del backend FastAPI — configurabile tramite variabile d'ambiente o auto-detect per emulatore
  BASE_URL: getBaseUrl(),

  // Timeout per le richieste (ms)
  TIMEOUT: 30000,

  // Endpoints
  ENDPOINTS: {
    // Autenticazione
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',

    // Utente
    USER_ARNIE: '/api/user/arnie',
    USER_ARNIA: '/api/user/arnie/:id',
    USER_LETTURE: '/api/user/arnie/:id/letture',
    USER_LETTURE_TEMPERATURA: '/api/user/arnie/:id/letture/temperatura',
    USER_LETTURE_UMIDITA: '/api/user/arnie/:id/letture/umidita',
    USER_LETTURE_PESO: '/api/user/arnie/:id/letture/peso',
    USER_ATTIVITA: '/api/user/arnie/:id/attivita',
    USER_ATTIVITA_DETAIL: '/api/user/arnie/:id_arnia/attivita/:id_log',
    USER_PASSWORD: '/api/user/password',

    // Admin
    ADMIN_UTENTI: '/api/admin/utenti',
    ADMIN_ARNIE: '/api/admin/arnie',
    ADMIN_NODI: '/api/admin/nodi',
    ADMIN_LETTURE: '/api/admin/letture',
    ADMIN_ATTIVITA: '/api/admin/attivita',
  },

  // Headers default
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;
