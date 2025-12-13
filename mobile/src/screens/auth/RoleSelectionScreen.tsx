import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRole, loginSuccess } from '../../store/authSlice';
import { Colors } from '../../styles/colors';
import * as AuthSession from 'expo-auth-session';
import { jwtDecode } from 'jwt-decode';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Keycloak Configuration
// Use LAN IP (192.168.1.11) to ensure accessibility from:
// 1. Android Emulator (can reach host IP)
// 2. Physical Devices (on same WiFi)
// 3. iOS Simulator
const KEYCLOAK_URL = 'http://192.168.1.11:8180';
const REALM = 'agristack';
const CLIENT_ID = 'agristack-frontend';

const discovery = {
    authorizationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`,
    tokenEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    revocationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/revoke`,
    userInfoEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
};

export default function RoleSelectionScreen({ navigation }: any) {
    const dispatch = useDispatch();

    const redirectUri = AuthSession.makeRedirectUri({
        // Auto-detect scheme
    });

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: CLIENT_ID,
            scopes: ['openid', 'profile', 'email'], // Removed offline_access to fix token exchange error
            redirectUri: redirectUri,
            responseType: AuthSession.ResponseType.Code,
        },
        discovery
    );

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params;

            console.log("Auth Code Received, Exchanging...", code);

            // Exchange Code for Token
            AuthSession.exchangeCodeAsync(
                {
                    clientId: CLIENT_ID,
                    code,
                    redirectUri: redirectUri, // Must match exactly
                    extraParams: {
                        code_verifier: request?.codeVerifier || "",
                    },
                },
                discovery
            ).then(tokenResponse => {
                console.log("Token Exchanged Success", tokenResponse.accessToken);
                handleLoginSuccess(tokenResponse.accessToken);
            }).catch(error => {
                console.error("Token Exchange Failed Full Error:", JSON.stringify(error));
                Alert.alert("Login Error", "Failed to exchange authorization code.");
            });

        } else if (response?.type === 'error') {
            Alert.alert('Login Error', response.error?.message || 'Something went wrong');
        }
    }, [response]);

    const handleLoginSuccess = (token: string) => {
        try {
            const decoded: any = jwtDecode(token);
            console.log('Decoded Token:', decoded);

            // Extract Realm Roles
            const roles = decoded.realm_access?.roles || [];

            // Map Keycloak Roles to App Roles
            let appRole = 'OPERATOR'; // Default
            if (roles.includes('tahsildar')) appRole = 'TAHSILDAR';
            else if (roles.includes('verifier')) appRole = 'VERIFIER';
            else if (roles.includes('field_team')) appRole = 'FIELD_TEAM';
            else if (roles.includes('officer')) appRole = 'OPERATOR'; // officer -> patwari

            const user = {
                name: decoded.name || decoded.preferred_username,
                email: decoded.email,
                id: decoded.sub
            };

            // Save token for API requests
            SecureStore.setItemAsync('auth_token', token);

            dispatch(loginSuccess({ user, token, role: appRole }));

            Alert.alert('Login Success', `Welcome ${user.name} (${appRole})`);

            // Navigate based on mapped role
            navigateForRole(appRole);

        } catch (e) {
            console.error('Token Decode Error', e);
            Alert.alert('Error', 'Failed to process login token');
        }
    };

    const navigateForRole = (role: string) => {
        if (role === 'OPERATOR') navigation.replace('OperatorTabs');
        else if (role === 'VERIFIER') navigation.replace('VerifierTabs');
        else if (role === 'TAHSILDAR') navigation.replace('TahsildarTabs');
        else if (role === 'FIELD_TEAM') navigation.replace('FieldTeamTabs');
    };

    const manualSelectRole = (role: string) => {
        dispatch(setRole(role));
        navigateForRole(role);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>J&K Land Records</Text>

            {/* Government Section */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Government Officials</Text>
                    <Text style={styles.cardSubtitle}>Patwari, Girdawar, Tahsildar</Text>
                </View>

                <TouchableOpacity
                    style={[styles.ssoButton, !request && { opacity: 0.5 }]}
                    onPress={() => promptAsync()}
                    disabled={!request}
                >
                    <Text style={styles.ssoText}>Official Login (SSO)</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>Secured by Keycloak</Text>

                {/* Dev Options Hidden/Collapsed visually */}
                <View style={styles.divider}>
                    <Text style={styles.dividerText}>DEV / TRAINING MODE</Text>
                </View>
                <View style={styles.row}>
                    <Button title="Operator" onPress={() => manualSelectRole('OPERATOR')} color={Colors.primary} />
                    <View style={{ width: 10 }} />
                    <Button title="Verifier" onPress={() => manualSelectRole('VERIFIER')} color={Colors.secondary} />
                </View>
                <View style={[styles.row, { marginTop: 10 }]}>
                    <Button title="Tahsildar" onPress={() => manualSelectRole('TAHSILDAR')} color={Colors.warning} />
                </View>
            </View>

            {/* Citizen Section */}
            <View style={[styles.card, styles.citizenCard]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Citizens</Text>
                    <Text style={styles.cardSubtitle}>Farmers & Land Owners</Text>
                </View>

                <TouchableOpacity
                    style={styles.citizenButton}
                    onPress={() => navigation.navigate('FarmerPortal')}
                >
                    <Text style={styles.citizenBtnText}>Farmer Registry & Claims</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: Colors.background,
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: Colors.text
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    citizenCard: {
        backgroundColor: '#e8f5e9', // Light green hint
        borderWidth: 1,
        borderColor: '#c8e6c9'
    },
    cardHeader: {
        marginBottom: 20,
        alignItems: 'center'
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4
    },
    ssoButton: {
        backgroundColor: '#0066CC',
        paddingVertical: 14,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 8
    },
    citizenButton: {
        backgroundColor: '#2E7D32',
        paddingVertical: 14,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center'
    },
    ssoText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    citizenBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    helperText: { textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 20 },

    divider: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 10,
        marginBottom: 20,
        alignItems: 'center',
        position: 'relative'
    },
    dividerText: {
        backgroundColor: 'white',
        position: 'absolute',
        top: -10,
        paddingHorizontal: 10,
        color: '#bbb',
        fontSize: 10,
        fontWeight: 'bold'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center'
    }
});
