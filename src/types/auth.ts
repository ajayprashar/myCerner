export interface AuthState {
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

export interface AuthService {
  initialize(): Promise<void>;
  handleCallback(code: string): Promise<void>;
  logout(): void;
}

export interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported: string[];
  registration_endpoint: string;
  scopes_supported: string[];
  response_types_supported: string[];
  management_endpoint: string;
  introspection_endpoint: string;
  revocation_endpoint: string;
  capabilities: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  patient?: string;
  encounter?: string;
  user?: string;
}