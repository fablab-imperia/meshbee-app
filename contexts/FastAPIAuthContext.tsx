/**
 * Context per la gestione dello stato di autenticazione globale
 * Versione per backend FastAPI
 */

import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { UserResponse } from '@/types/api';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  getCurrentUser,
  getUserProfile,
} from '@/services/fastapi-auth-service';
import {
  setUnauthorizedHandler,
  getAccessToken,
  isAccessTokenExpired,
  clearTokens,
} from '@/services/api-client';
// TEMPORANEAMENTE DISABILITATO - Richiede migrazione Supabase
// import { registerForPushNotifications } from '@/services/notification-service';

// =============================================================================
// TIPI
// =============================================================================

interface SignInData {
  email: string;
  password: string;
}

interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
}

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (data: SignInData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = useRef(AppState.currentState);

  // Carica utente all'avvio
  useEffect(() => {
    loadInitialUser();

    // Se la sessione viene invalidata (token scaduto o 401) ripristina subito
    // lo stato di disconnessione, così la guardia riporta al login.
    setUnauthorizedHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
    });

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      setUnauthorizedHandler(null);
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const prev = appState.current;
    appState.current = nextAppState;

    // Al ritorno in primo piano la sessione resta valida finché l'access token non
    // scade: in quel caso `restoreSession` la invalida e la guardia riporta al login.
    if (nextAppState === 'active' && (prev === 'inactive' || prev === 'background')) {
      try {
        await restoreSession();
      } catch (error) {
        console.error('Errore durante il ripristino della sessione:', error);
      }
    }
  };

  // TEMPORANEAMENTE DISABILITATO - Richiede migrazione Supabase
  // Registra per notifiche push quando l'utente è autenticato
  /*
  useEffect(() => {
    if (user) {
      // Registra dispositivo per notifiche push
      registerForPushNotifications().then(result => {
        if (result.success) {
          console.log('Push notifications registered successfully');
        } else {
          console.warn('Push notifications not registered:', result.error);
        }
      });
    }
  }, [user]);
  */

  /**
   * Carica l'utente iniziale
   */
  async function loadInitialUser() {
    try {
      setLoading(true);

      // Verifica che esista un access token non scaduto
      const authenticated = await hasValidSession();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Carica i dati dell'utente
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error loading initial user:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Ripristina la sessione dopo un periodo di inattività o di background.
   *
   * La sessione resta valida finché l'access token non scade: in quel caso
   * `hasValidSession` la invalida e la guardia riporta al login.
   */
  async function restoreSession() {
    const authenticated = await hasValidSession();
    setIsAuthenticated(authenticated);

    if (authenticated) {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } else {
      setUser(null);
    }
  }

  /**
   * True se è presente un access token non scaduto.
   *
   * Se il token è scaduto pulisce storage e stato, così l'utente torna al login
   * invece di ricevere errori di rete incomprensibili.
   */
  async function hasValidSession(): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) return false;

    if (isAccessTokenExpired(token)) {
      await clearTokens();
      return false;
    }

    return true;
  }

  /**
   * Carica il profilo utente
   */
  async function loadUserProfile() {
    try {
      const result = await getUserProfile();
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  /**
   * Effettua il login
   */
  async function signIn(data: SignInData) {
    try {
      const result = await authSignIn(data);

      if (result.success && result.data) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'Errore durante il login',
      };
    }
  }

  /**
   * Effettua il logout
   */
  async function signOut() {
    try {
      await authSignOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Ricarica il profilo utente
   */
  async function refreshProfile() {
    await loadUserProfile();
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook per accedere al context di autenticazione
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook per verificare se l'utente è autenticato
 */
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();

  return {
    isAuthenticated,
    loading,
  };
}
