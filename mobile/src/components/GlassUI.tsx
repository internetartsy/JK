/**
 * Minimalist Black & White Glass UI
 * Simple, clean glassmorphism with monochromatic palette
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

// ============================================
// MONOCHROME THEME
// ============================================

export const MonochromeTheme = {
    colors: {
        // Black & White palette
        black: '#000000',
        white: '#FFFFFF',
        gray: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
        },
        // Glass opacity
        glass: {
            light: 'rgba(255, 255, 255, 0.1)',
            medium: 'rgba(255, 255, 255, 0.15)',
            strong: 'rgba(255, 255, 255, 0.2)',
        },
        glassBlack: {
            light: 'rgba(0, 0, 0, 0.1)',
            medium: 'rgba(0, 0, 0, 0.2)',
            strong: 'rgba(0, 0, 0, 0.3)',
        },
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};

// ============================================
// GLASS CARD
// ============================================

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    dark?: boolean;
    onPress?: () => void;
}

export function GlassCard({ children, style, dark = false, onPress }: GlassCardProps) {
    const CardComponent = onPress ? TouchableOpacity : View;

    return (
        <CardComponent
            style={[
                styles.glassCard,
                dark ? styles.glassCardDark : styles.glassCardLight,
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <BlurView
                intensity={20}
                tint={dark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardContent}>{children}</View>
        </CardComponent>
    );
}

// ============================================
// GLASS BUTTON
// ============================================

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'black' | 'white' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}

export function GlassButton({
    title,
    onPress,
    variant = 'black',
    size = 'md',
    disabled = false,
    loading = false,
    style,
}: GlassButtonProps) {
    const sizeStyles = {
        sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
        md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
        lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
    };

    const variantStyles = {
        black: { bg: MonochromeTheme.colors.black, text: MonochromeTheme.colors.white },
        white: { bg: MonochromeTheme.colors.white, text: MonochromeTheme.colors.black },
        ghost: { bg: 'transparent', text: MonochromeTheme.colors.gray[900] },
    };

    return (
        <TouchableOpacity
            style={[
                styles.glassButton,
                { backgroundColor: variantStyles[variant].bg },
                variant === 'ghost' && styles.ghostButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {variant === 'ghost' && (
                <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
            )}
            <Text
                style={[
                    styles.buttonText,
                    { fontSize: sizeStyles[size].fontSize, color: variantStyles[variant].text },
                ]}
            >
                {loading ? 'Loading...' : title}
            </Text>
        </TouchableOpacity>
    );
}

// ============================================
// GLASS HEADER
// ============================================

interface GlassHeaderProps {
    title: string;
    subtitle?: string;
    leftAction?: React.ReactNode;
    rightActions?: React.ReactNode[];
    dark?: boolean;
}

export function GlassHeader({
    title,
    subtitle,
    leftAction,
    rightActions,
    dark = true,
}: GlassHeaderProps) {
    return (
        <View style={[styles.header, dark && styles.headerDark]}>
            <BlurView
                intensity={30}
                tint={dark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerContent}>
                <View style={styles.headerLeft}>{leftAction}</View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, dark && styles.headerTitleDark]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.headerSubtitle, dark && styles.headerSubtitleDark]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {rightActions?.map((action, i) => (
                        <View key={i} style={styles.headerAction}>
                            {action}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

// ============================================
// GLASS BADGE
// ============================================

interface GlassBadgeProps {
    label: string;
    variant?: 'light' | 'dark';
    style?: ViewStyle;
}

export function GlassBadge({ label, variant = 'light', style }: GlassBadgeProps) {
    return (
        <View
            style={[
                styles.badge,
                variant === 'dark'
                    ? { backgroundColor: MonochromeTheme.colors.black }
                    : { backgroundColor: MonochromeTheme.colors.white },
                style,
            ]}
        >
            <Text
                style={[
                    styles.badgeText,
                    { color: variant === 'dark' ? MonochromeTheme.colors.white : MonochromeTheme.colors.black },
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

// ============================================
// GLASS BACKGROUND
// ============================================

interface GlassBackgroundProps {
    children: React.ReactNode;
    dark?: boolean;
}

export function GlassBackground({ children, dark = true }: GlassBackgroundProps) {
    return (
        <View
            style={[
                styles.background,
                { backgroundColor: dark ? MonochromeTheme.colors.black : MonochromeTheme.colors.white },
            ]}
        >
            {children}
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    // Glass Card
    glassCard: {
        borderRadius: MonochromeTheme.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        ...MonochromeTheme.shadows.md,
    },
    glassCardLight: {
        borderColor: MonochromeTheme.colors.gray[200],
        backgroundColor: MonochromeTheme.colors.glass.medium,
    },
    glassCardDark: {
        borderColor: MonochromeTheme.colors.gray[800],
        backgroundColor: MonochromeTheme.colors.glassBlack.medium,
    },
    cardContent: {
        padding: MonochromeTheme.spacing.md,
    },

    // Glass Button
    glassButton: {
        borderRadius: MonochromeTheme.borderRadius.md,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...MonochromeTheme.shadows.sm,
    },
    ghostButton: {
        borderWidth: 1,
        borderColor: MonochromeTheme.colors.gray[300],
    },
    buttonText: {
        fontWeight: '600',
        letterSpacing: 0.3,
    },

    // Header
    header: {
        height: 100,
        overflow: 'hidden',
        paddingTop: 40,
        borderBottomWidth: 1,
    },
    headerDark: {
        borderBottomColor: MonochromeTheme.colors.gray[800],
        backgroundColor: MonochromeTheme.colors.black,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: MonochromeTheme.spacing.md,
        flex: 1,
    },
    headerLeft: {
        width: 50,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    headerAction: {},
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: MonochromeTheme.colors.black,
    },
    headerTitleDark: {
        color: MonochromeTheme.colors.white,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: MonochromeTheme.colors.gray[600],
        marginTop: 2,
    },
    headerSubtitleDark: {
        color: MonochromeTheme.colors.gray[400],
    },

    // Badge
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: MonochromeTheme.borderRadius.full,
        alignSelf: 'flex-start',
        ...MonochromeTheme.shadows.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },

    // Background
    background: {
        flex: 1,
    },
});
