import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Determine the base URL based on the platform
// Android Emulator uses 10.0.2.2 to access host localhost
// iOS Simulator uses localhost
// Physical Devices need the LAN IP (e.g., 192.168.1.x) - manually update if testing on device
const getGatewayUrl = () => {
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8090';
    }
    return 'http://localhost:8090';
};

const client = axios.create({
    baseURL: `${getGatewayUrl()}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

export const frappeClient = axios.create({
    baseURL: `${getGatewayUrl()}/api`, // Points to Frappe via Gateway
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Attach same interceptors to frappeClient
const attachInterceptors = (axiosInstance: typeof client) => {
    axiosInstance.interceptors.request.use(async (config) => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch (error) { console.warn('[API] Auth Token Error', error); }
        console.log(`[API ${axiosInstance.defaults.baseURL}] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    });
};
attachInterceptors(frappeClient);
attachInterceptors(client);

// Auth Interceptor: Automatically attach token from SecureStore
client.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.warn('[API] Failed to retrieve auth token', error);
    }
    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
});

// Response Interceptor for Debugging and Error Handling
client.interceptors.response.use(
    response => {
        console.log(`[API] Success: ${response.status} ${response.config.url}`);
        return response;
    },
    error => {
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error(`[API] Error Response: ${error.response.status} - ${error.config.url}`, error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(`[API] No Response (Network Error): ${error.message} - Is the server running?`);
        } else {
            // Something happened in setting up the request
            console.error(`[API] Setup Error: ${error.message}`);
        }
        return Promise.reject(error);
    }
);

// Helper to set the Auth Token dynamically (Legacy support/Login flow)
export const setAuthToken = (token: string | null) => {
    if (token) {
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete client.defaults.headers.common['Authorization'];
    }
};

export default client;
