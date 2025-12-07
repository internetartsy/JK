import React, { useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { AuthService } from '../services/AuthService';
import {
    GlassBackground,
    GlassCard,
    GlassButton,
    MonochromeTheme,
} from '../components/GlassUI';

// TEMPORARY: Set to true to bypass OAuth for testing in Expo Go
const MOCK_AUTH = false;  // Enable real OAuth

const { width } = Dimensions.get('window');

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            if (MOCK_AUTH) {
                console.log('Using mock auth for Expo Go testing');
                await AuthService.setAuthState({
                    accessToken: 'mock-token-for-expo-go',
                    refreshToken: 'mock-refresh',
                    expiresIn: 86400,
                    issuedAt: Date.now() / 1000,
                });
                onLoginSuccess();
            } else {
                await AuthService.login();
                onLoginSuccess();
            }
        } catch (e: any) {
            console.error(e);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassBackground dark={true}>
            <View style={styles.container}>
                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <Text style={styles.logoTitle}>AgriStack</Text>
                    <Text style={styles.logoSubtitle}>Land Records System</Text>
                </View>

                {/* Main Content */}
                <View style={styles.contentSection}>
                    <GlassCard dark={true} style={styles.contentCard}>
                        <View style={styles.cardContent}>
                            {/* Welcome Text */}
                            <Text style={styles.welcomeTitle}>Welcome</Text>
                            <Text style={styles.welcomeSubtitle}>
                                Sign in to continue
                            </Text>

                            {/* Login Button or Loading */}
                            <View style={styles.actionSection}>
                                {loading ? (
                                    <View style={styles.loaderContainer}>
                                        <ActivityIndicator
                                            animating={true}
                                            size="large"
                                            color={MonochromeTheme.colors.white}
                                        />
                                        <Text style={styles.loaderText}>Authenticating...</Text>
                                    </View>
                                ) : (
                                    <GlassButton
                                        title="Sign in with Keycloak"
                                        onPress={handleLogin}
                                        variant="white"
                                        size="lg"
                                    />
                                )}
                            </View>

                            {/* Error Message */}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Features */}
                            <View style={styles.featuresSection}>
                                <FeatureItem text="Offline-first data collection" />
                                <FeatureItem text="Real-time synchronization" />
                                <FeatureItem text="Secure authentication" />
                            </View>
                        </View>
                    </GlassCard>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Powered by AgriStack Platform
                    </Text>
                </View>
            </View>
        </GlassBackground>
    );
}

// Feature Item Component
function FeatureItem({ text }: { text: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoTitle: {
        fontSize: 48,
        fontWeight: '800',
        color: MonochromeTheme.colors.white,
        letterSpacing: -1,
    },
    logoSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: MonochromeTheme.colors.gray[500],
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginTop: 8,
    },

    // Content Section
    contentSection: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    contentCard: {
        width: width * 0.9,
        maxWidth: 400,
    },
    cardContent: {
        paddingVertical: 16,
    },

    // Welcome Section
    welcomeTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: MonochromeTheme.colors.white,
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 15,
        fontWeight: '400',
        color: MonochromeTheme.colors.gray[400],
        marginBottom: 32,
    },

    // Action Section
    actionSection: {
        marginBottom: 24,
    },

    // Loader
    loaderContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loaderText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '500',
        color: MonochromeTheme.colors.gray[400],
    },

    // Error
    errorContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: MonochromeTheme.colors.glassBlack.medium,
        borderRadius: MonochromeTheme.borderRadius.md,
        borderWidth: 1,
        borderColor: MonochromeTheme.colors.gray[800],
    },
    errorText: {
        color: MonochromeTheme.colors.gray[300],
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },

    // Features
    featuresSection: {
        marginTop: 32,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    featureDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: MonochromeTheme.colors.gray[600],
        marginRight: 12,
    },
    featureText: {
        fontSize: 13,
        fontWeight: '400',
        color: MonochromeTheme.colors.gray[400],
        flex: 1,
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
        color: MonochromeTheme.colors.gray[700],
        letterSpacing: 0.3,
    },
});
