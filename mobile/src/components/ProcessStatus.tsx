import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
    AlertCircle,
    Clock,
    CheckCircle,
    Info,
    AlertTriangle,
    Gavel,
    Link,
    PenTool,
    LucideIcon
} from 'lucide-react-native';

export type StatusColor = 'BLUE' | 'YELLOW' | 'RED' | 'BLACK' | 'GREEN' | 'ORANGE' | 'PURPLE' | 'LIGHT_BLUE';

interface ActionButton {
    label: string;
    action: () => void;
}

interface ProcessStatusProps {
    transferId: string;
    status: string; // e.g., "PENDING_TAHSILDAR"
    color: StatusColor;
    icon?: string; // Optional override, otherwise derived from color
    text: string;
    timeline?: string;
    actions?: ActionButton[];
    style?: StyleProp<ViewStyle>;
}

// Configuration for each status type
const STATUS_CONFIG: Record<StatusColor, { bg: string; text: string; icon: LucideIcon; border: string }> = {
    BLUE: {
        bg: '#eff6ff', // blue-50
        text: '#1e40af', // blue-800
        border: '#bfdbfe', // blue-200
        icon: Info
    },
    YELLOW: {
        bg: '#fefce8', // yellow-50
        text: '#854d0e', // yellow-800
        border: '#fde68a', // yellow-200
        icon: Clock
    },
    RED: {
        bg: '#fef2f2', // red-50
        text: '#991b1b', // red-800
        border: '#fecaca', // red-200
        icon: AlertCircle
    },
    BLACK: {
        bg: '#18181b', // zinc-900 (Black-ish)
        text: '#f4f4f5', // zinc-100 (White text)
        border: '#3f3f46',
        icon: AlertTriangle
    },
    GREEN: {
        bg: '#f0fdf4', // green-50
        text: '#166534', // green-800
        border: '#bbf7d0', // green-200
        icon: CheckCircle
    },
    ORANGE: {
        bg: '#fff7ed', // orange-50
        text: '#9a3412', // orange-800
        border: '#fed7aa', // orange-200
        icon: Gavel
    },
    PURPLE: {
        bg: '#faf5ff', // purple-50
        text: '#6b21a8', // purple-800
        border: '#e9d5ff', // purple-200
        icon: Link
    },
    LIGHT_BLUE: {
        bg: '#f0f9ff', // sky-50
        text: '#075985', // sky-800
        border: '#bae6fd', // sky-200
        icon: PenTool
    }
};

export const ProcessStatus = ({
    transferId,
    status,
    color,
    text,
    timeline,
    actions = [],
    style
}: ProcessStatusProps) => {

    const config = STATUS_CONFIG[color] || STATUS_CONFIG.BLUE;
    const IconComponent = config.icon;

    return (
        <View style={[
            styles.container,
            { backgroundColor: config.bg, borderColor: config.border },
            style
        ]}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <IconComponent size={24} color={config.text} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.statusLabel, { color: config.text }]}>{status.replace('_', ' ')}</Text>
                    <Text style={[styles.transferId, { color: config.text, opacity: 0.8 }]}>{transferId}</Text>
                </View>
            </View>

            {/* Message Body */}
            <View style={styles.body}>
                <Text style={[styles.messageText, { color: config.text }]}>
                    {text}
                </Text>
                {timeline && (
                    <Text style={[styles.timelineText, { color: config.text, opacity: 0.7 }]}>
                        {timeline}
                    </Text>
                )}
            </View>

            {/* Action Buttons */}
            {actions.length > 0 && (
                <View style={[styles.actions, { borderTopColor: config.border, borderTopWidth: 1 }]}>
                    {actions.map((btn, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={btn.action}
                            style={[
                                styles.button,
                                { backgroundColor: index === 0 ? config.text : 'transparent' } // Primary action filled
                            ]}
                        >
                            <Text style={[
                                styles.buttonText,
                                { color: index === 0 ? (color === 'BLACK' ? '#000' : '#fff') : config.text }
                            ]}>
                                {btn.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        marginVertical: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    statusLabel: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    transferId: {
        fontSize: 12,
        fontFamily: 'monospace',
    },
    body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    messageText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    timelineText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 12,
        gap: 8,
        flexWrap: 'wrap',
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 13,
        fontWeight: '600',
    }
});
