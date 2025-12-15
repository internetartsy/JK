import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
    AlertCircle,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Gavel,
    Link2,
    PenTool,
    Info,
    LucideIcon
} from 'lucide-react-native';

export type StatusColor = 'BLUE' | 'YELLOW' | 'RED' | 'BLACK' | 'GREEN' | 'ORANGE' | 'PURPLE' | 'LIGHT_BLUE';

interface ActionButton {
    label: string;
    action: () => void;
}

interface ProcessStatusProps {
    transferId: string;
    status: string;
    color: StatusColor;
    icon: string;
    text: string;
    timeline?: string;
    actions?: ActionButton[];
}

const ICON_MAP: Record<string, LucideIcon> = {
    AlertCircle: AlertCircle,
    Clock: Clock,
    AlertTriangle: AlertTriangle,
    CheckCircle2: CheckCircle2,
    Gavel: Gavel,
    Link2: Link2,
    PenTool: PenTool,
    Info: Info,
};

const COLOR_CONFIG: Record<StatusColor, { bg: string; text: string; iconColor: string; border: string }> = {
    BLUE: { bg: '#EFF6FF', text: '#1E40AF', iconColor: '#2563EB', border: '#DBEAFE' },
    YELLOW: { bg: '#FEFCE8', text: '#854D0E', iconColor: '#CA8A04', border: '#FEF9C3' },
    RED: { bg: '#FEF2F2', text: '#991B1B', iconColor: '#DC2626', border: '#FEE2E2' },
    BLACK: { bg: '#111827', text: '#F3F4F6', iconColor: '#F87171', border: '#374151' }, // High contrast for critical
    GREEN: { bg: '#F0FDF4', text: '#166534', iconColor: '#16A34A', border: '#DCFCE7' },
    ORANGE: { bg: '#FFF7ED', text: '#9A3412', iconColor: '#EA580C', border: '#FFEDD5' },
    PURPLE: { bg: '#FAF5FF', text: '#6B21A8', iconColor: '#9333EA', border: '#F3E8FF' },
    LIGHT_BLUE: { bg: '#F0F9FF', text: '#075985', iconColor: '#0EA5E9', border: '#E0F2FE' },
};

export const ProcessStatus = ({
    transferId,
    status,
    color,
    icon,
    text,
    timeline,
    actions
}: ProcessStatusProps) => {
    const styles = getStyles(COLOR_CONFIG[color]);
    const IconComponent = ICON_MAP[icon] || Info;
    const theme = COLOR_CONFIG[color];

    return (
        <View style={styles.container}>
            {/* Header with ID and Icon */}
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <IconComponent size={24} color={theme.iconColor} />
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.transferId}>{transferId}</Text>
                    <Text style={styles.statusLabel}>{status.replace(/_/g, ' ')}</Text>
                </View>
            </View>

            {/* Main Message */}
            <Text style={styles.mainText}>{text}</Text>

            {/* Timeline if present */}
            {timeline && (
                <View style={styles.timelineContainer}>
                    <Clock size={14} color={theme.text} style={{ opacity: 0.7 }} />
                    <Text style={styles.timelineText}>{timeline}</Text>
                </View>
            )}

            {/* Action Buttons */}
            {actions && actions.length > 0 && (
                <View style={styles.actionsContainer}>
                    {actions.map((btn, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.button}
                            onPress={btn.action}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.buttonText}>{btn.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const getStyles = (theme: typeof COLOR_CONFIG['BLUE']) => StyleSheet.create({
    container: {
        backgroundColor: theme.bg,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.border,
        marginVertical: 10,
        shadowColor: theme.iconColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        marginRight: 12,
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: 8,
        borderRadius: 12,
    },
    titleContainer: {
        flex: 1,
    },
    transferId: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.text,
        opacity: 0.8,
        marginBottom: 2,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.text,
    },
    mainText: {
        fontSize: 15,
        color: theme.text,
        lineHeight: 22,
        marginBottom: 16,
    },
    timelineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    timelineText: {
        fontSize: 13,
        color: theme.text,
        marginLeft: 6,
        fontWeight: '500',
    },
    actionsContainer: {
        marginTop: 4,
        gap: 10,
    },
    button: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.border,
    },
    buttonText: {
        color: theme.iconColor, // Use the vivid color for button text
        fontWeight: '600',
        fontSize: 14,
    }
});
