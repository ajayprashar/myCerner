import type { SmartConfiguration, TokenResponse } from '../types/auth';
import { authStore } from '../stores/authStore';
import { patientStore } from '../stores/patientStore';

class AuthService {
  private static instance: AuthService;
  private config: SmartConfiguration | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing auth service...');
      
      // Clear any existing auth state
      sessionStorage.removeItem('authState');
      
      // Get launch parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const launchToken = urlParams.get('launch');
      const issuer = urlParams.get('iss');
      const patientId = urlParams.get('patient');
      
      console.log('Launch context:', { launchToken, issuer, patientId });

      // Store launch parameters
      if (launchToken) {
        sessionStorage.setItem('launch_token', launchToken);
      }
      if (issuer) {
        sessionStorage.setItem('iss', issuer);
      }
      if (patientId) {
        sessionStorage.setItem('launch_patient_id', patientId);
      }

      // Generate and store state parameter
      const state = this.generateState();
      sessionStorage.setItem('auth_state', state);
      
      const params = {
        response_type: 'code',
        client_id: import.meta.env.VITE_CLIENT_ID,
        scope: import.meta.env.VITE_SCOPE,
        redirect_uri: import.meta.env.VITE_REDIRECT_URI,
        state: state,
        aud: issuer || import.meta.env.VITE_FHIR_BASE_URL,
        launch: launchToken || import.meta.env.VITE_LAUNCH_TOKEN
      };

      console.log('Auth params:', params);

      const authUrl = `${import.meta.env.VITE_AUTH_URL}?` + new URLSearchParams(params);
      console.log('Redirecting to:', authUrl);
      
      window.location.replace(authUrl);
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    }
  }

  async handleCallback(code: string): Promise<void> {
    try {
      console.log('Auth callback - URL params:', new URLSearchParams(window.location.search));
      const tokenData = await this.exchangeCodeForToken(code);
      console.log('Token response:', tokenData);
      
      let patientId = tokenData.patient;
      
      if (!patientId) {
        // Try to get patient ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        patientId = urlParams.get('patient') || '';
        console.log('Got patient ID from URL:', patientId);
        
        // If still no patient ID, try to extract from token
        if (!patientId && tokenData.access_token) {
          try {
            const tokenParts = tokenData.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('Token payload:', payload);
              patientId = payload.patient_id || payload.context?.patient || '';
              console.log('Extracted patient ID from token:', patientId);
            }
          } catch (e) {
            console.error('Failed to decode token:', e);
          }
        }
      }

      console.log('Final patient ID:', patientId);

      authStore.setTokens(
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.id_token,
        tokenData.expires_in,
        patientId,
        tokenData.user
      );

      if (patientId) {
        patientStore.setPatientId(patientId);
      }

      // Clear the URL parameters after successful authentication
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenUrl = import.meta.env.VITE_TOKEN_URL;
    const clientId = import.meta.env.VITE_CLIENT_ID;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenData = await response.json();
    
    // Update the stored tokens
    authStore.setTokens(
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.id_token,
      tokenData.expires_in,
      tokenData.patient || '',
      tokenData.user
    );

    return tokenData;
  }

  getLoginUrl() {
    // Reconstruct the initial authorization URL
    const authUrl = import.meta.env.VITE_AUTH_URL;
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI;
    const scope = import.meta.env.VITE_SCOPE;
    
    const state = this.generateState();
    sessionStorage.setItem('auth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope,
      state,
      redirect_uri: redirectUri
    });

    return `${authUrl}?${params.toString()}`;
  }

  private async exchangeCodeForToken(code: string) {
    const tokenParams = {
      grant_type: 'authorization_code',
      code: code,
      client_id: import.meta.env.VITE_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI
    };

    const response = await fetch(import.meta.env.VITE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenParams)
    });

    const responseData = await response.text();

    if (!response.ok) {
      let errorMessage = 'Token exchange failed';
      try {
        const errorJson = JSON.parse(responseData);
        errorMessage = `${errorMessage}: ${JSON.stringify(errorJson)}`;
        
        if (errorJson.error === 'invalid_grant') {
          console.log('Code expired, restarting auth flow');
          await this.initialize();
          return;
        }
      } catch (e) {
        errorMessage = `${errorMessage}: ${responseData}`;
      }
      throw new Error(errorMessage);
    }

    return JSON.parse(responseData);
  }
}

export const authService = AuthService.getInstance();