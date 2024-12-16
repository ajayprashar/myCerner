import { writable } from 'svelte/store';
import { authService } from '../services/authService';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  error: string | null;
  expiresAt: number | null;
  patientId: string | null;
  userId: string | null;
  needPatientBanner: boolean;
}

function loadPersistedState(): AuthState {
  try {
    const stored = sessionStorage.getItem('authState');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load persisted auth state:', e);
  }
  return {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    error: null,
    expiresAt: null,
    patientId: null,
    userId: null,
    needPatientBanner: false
  };
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(loadPersistedState());

  return {
    subscribe,
    setTokens: (accessToken: string, refreshToken: string, idToken: string, expiresIn: number, patientId: string, userId: string, needPatientBanner: boolean) => {
      const expiresAt = new Date().getTime() + (expiresIn * 1000);
      const newState = {
        isAuthenticated: true,
        accessToken,
        refreshToken,
        idToken,
        expiresAt,
        patientId,
        userId,
        needPatientBanner,
        error: null
      };
      sessionStorage.setItem('authState', JSON.stringify(newState));
      set(newState);
    },
    clearAuth: () => {
      sessionStorage.removeItem('authState');
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        error: null,
        expiresAt: null,
        patientId: null,
        userId: null,
        needPatientBanner: false
      });
    },
    getAccessToken: async () => {
      let state: AuthState;
      subscribe(s => { state = s; })();

      // Check if token is expired or will expire in the next minute
      const now = new Date().getTime();
      const isExpired = state.expiresAt && (state.expiresAt - now < 60000);

      if (isExpired && state.refreshToken) {
        try {
          const newTokens = await authService.refreshAccessToken(state.refreshToken);
          return newTokens.access_token;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // If refresh fails, clear auth and redirect to login
          authStore.clearAuth();
          window.location.href = authService.getLoginUrl();
          return null;
        }
      }

      return state.accessToken;
    }
  };
}

export const authStore = createAuthStore(); 