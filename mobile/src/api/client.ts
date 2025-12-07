import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from '../services/AuthService';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const BASE_URL = Platform.select({
    android: 'http://10.0.2.2:80/api/v1',
    ios: 'http://localhost:80/api/v1',
    default: 'http://localhost:80/api/v1',
});

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/vnd.agristack.v1+json',
        'Content-Type': 'application/json',
    },
});

// Add interceptor for Auth token
client.interceptors.request.use(async (config) => {
    try {
        const token = await AuthService.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error getting access token:', error);
    }
    return config;
});

export default client;
