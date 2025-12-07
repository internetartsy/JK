/*
  Fix for Mobile OAuth Redirect
  
  Issue: Expo Go and Native Builds use different redirect URL schemes.
  - Expo Go: exp://...
  - Native: agristack://...
  
  Code in AuthService.ts (Lines 22-25) currently hardcodes 'agristack'.
  This works for native builds but breaks in Expo Go.
  
  Fix: Use makeRedirectUri without forcing scheme for Expo Go compatibility during dev,
  or explicitly handle both cases.
*/

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthRequest, CodeChallengeMethod, exchangeCodeAsync, refreshAsync, revokeAsync } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Keycloak Endpoints
// Use 10.0.2.2 for Android Emulator to access host localhost
const KEYCLOAK_URL = Platform.select({
    android: 'http://10.0.2.2:8080',
    ios: 'http://localhost:8080',
    default: 'http://localhost:8080',
});
const REALM = 'agristack';
const DISCOVERY = {
    authorizationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`,
    tokenEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    revocationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/revoke`,
};

const CLIENT_ID = 'agristack-mobile';

// Improved Redirect URI generation
const REDIRECT_URI = makeRedirectUri({
    scheme: 'agristack',
    path: 'oauthredirect',
    // In dev (Expo Go), this might need to not specify path/scheme explicitly 
    // to fallback to exp:// IP address style. 
    // But 'agristack' scheme is required for Keycloak allowed redirect URIs.
    // Ensure Keycloak has 'exp://...' added or just use 'agristack://...' with a dev client.
});

const TOKEN_KEY = 'auth_token';

export interface AuthState {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn?: number;
    issuedAt?: number;
}

export const AuthService = {
    async login(): Promise<AuthState> {
        try {
            console.log('Initiating Auth Session with PKCE...');
            console.log('Redirect URI:', REDIRECT_URI);

            // Create AuthRequest with PKCE support
            const request = new AuthRequest({
                clientId: CLIENT_ID,
                scopes: ['openid', 'profile', 'email', 'offline_access'],
                redirectUri: REDIRECT_URI,
                usePKCE: true,
                codeChallengeMethod: CodeChallengeMethod.S256,
            });

            const result = await request.promptAsync(DISCOVERY);

            if (result.type === 'success' && result.params.code) {
                console.log('Code received, exchanging for token with PKCE...');

                const tokenResult = await exchangeCodeAsync(
                    {
                        clientId: CLIENT_ID,
                        code: result.params.code,
                        redirectUri: REDIRECT_URI,
                        extraParams: {
                            code_verifier: request.codeVerifier!,
                        },
                    },
                    DISCOVERY
                );

                const authState: AuthState = {
                    accessToken: tokenResult.accessToken,
                    refreshToken: tokenResult.refreshToken,
                    idToken: tokenResult.idToken,
                    expiresIn: tokenResult.expiresIn,
                    issuedAt: Date.now() / 1000,
                };

                await this.setAuthState(authState);
                return authState;
            }

            throw new Error('Login cancelled or failed');
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    },

    async refresh(): Promise<AuthState | null> {
        try {
            const state = await this.getAuthState();
            if (!state || !state.refreshToken) return null;

            console.log('Refreshing token...');
            const tokenResult = await refreshAsync(
                {
                    clientId: CLIENT_ID,
                    refreshToken: state.refreshToken,
                },
                DISCOVERY
            );

            const newState: AuthState = {
                ...state,
                accessToken: tokenResult.accessToken,
                refreshToken: tokenResult.refreshToken || state.refreshToken,
                idToken: tokenResult.idToken || state.idToken,
                expiresIn: tokenResult.expiresIn,
                issuedAt: Date.now() / 1000,
            };
            await this.setAuthState(newState);
            console.log('Token refreshed');
            return newState;
        } catch (error) {
            console.error('Refresh failed', error);
            return null;
        }
    },

    async logout(): Promise<void> {
        try {
            const state = await this.getAuthState();
            if (state && state.accessToken) {
                await revokeAsync(
                    {
                        clientId: CLIENT_ID,
                        token: state.accessToken,
                    },
                    DISCOVERY
                );
            }
        } catch (error) {
            console.error('Logout revoke failed', error);
        } finally {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    },

    async getAccessToken(): Promise<string | null> {
        const state = await this.getAuthState();
        if (!state) return null;

        // Check expiry (buffer 5 mins)
        if (state.expiresIn && state.issuedAt) {
            const expiresAt = state.issuedAt + state.expiresIn;
            if (expiresAt - 300 < Date.now() / 1000) {
                const refreshed = await this.refresh();
                return refreshed ? refreshed.accessToken : null;
            }
        }

        return state.accessToken;
    },

    async setAuthState(state: AuthState) {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, JSON.stringify(state));
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(state));
        }
    },

    async getAuthState(): Promise<AuthState | null> {
        let json;
        if (Platform.OS === 'web') {
            json = localStorage.getItem(TOKEN_KEY);
        } else {
            json = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        return json ? JSON.parse(json) : null;
    },

    async isLoggedIn(): Promise<boolean> {
        const token = await this.getAccessToken();
        return !!token;
    },
};
