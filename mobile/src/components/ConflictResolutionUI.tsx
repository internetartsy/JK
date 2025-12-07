import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
    Card,
    Title,
    Paragraph,
    Button,
    Chip,
    RadioButton,
    TextInput,
    Divider,
    Surface,
    Text,
    IconButton,
    useTheme
} from 'react-native-paper';

interface FieldDiff {
    field_name: string;
    base_value: any;
    local_value: any;
    server_value: any;
    has_conflict: boolean;
    suggested_resolution: string;
    merged_value: any;
}

interface ConflictReport {
    entity_type: string;
    entity_id: string;
    base_version: number;
    local_version: number;
    server_version: number;
    field_diffs: FieldDiff[];
    has_conflicts: boolean;
    can_auto_merge: boolean;
    suggested_merged_entity: Record<string, any>;
}

interface Props {
    conflictReport: ConflictReport;
    onResolve: (resolutions: Record<string, any>) => void;
    onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
    khasra_number: 'Khasra Number',
    village_id: 'Village',
    area_text: 'Area (Text)',
    area_geom: 'Area (Numeric)',
    status: 'Status',
    name_urdu: 'Name (Urdu)',
    name_english: 'Name (English)',
    confidence: 'Confidence',
    consent_flags: 'Consent Flags',
};

export const ConflictResolutionUI: React.FC<Props> = ({
    conflictReport,
    onResolve,
    onCancel,
}) => {
    const theme = useTheme();
    const [resolutions, setResolutions] = useState<Record<string, any>>({});
    const [customValues, setCustomValues] = useState<Record<string, string>>({});

    // Initialize with suggested resolutions
    React.useEffect(() => {
        const initial: Record<string, any> = {};
        conflictReport.field_diffs.forEach(diff => {
            if (diff.merged_value !== null) {
                initial[diff.field_name] = diff.merged_value;
            } else if (diff.suggested_resolution === 'use_local') {
                initial[diff.field_name] = 'USE_LOCAL';
            } else if (diff.suggested_resolution === 'use_server') {
                initial[diff.field_name] = 'USE_SERVER';
            }
        });
        setResolutions(initial);
    }, [conflictReport]);

    const handleResolutionChange = (fieldName: string, value: string) => {
        setResolutions(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleCustomValue = (fieldName: string, value: string) => {
        setCustomValues(prev => ({ ...prev, [fieldName]: value }));
        setResolutions(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleResolve = () => {
        const finalResolutions: Record<string, any> = {};
        conflictReport.field_diffs.forEach(diff => {
            if (diff.has_conflict) {
                finalResolutions[diff.field_name] = resolutions[diff.field_name];
            }
        });
        onResolve(finalResolutions);
    };

    const conflictingFields = conflictReport.field_diffs.filter(d => d.has_conflict);
    const autoMergedFields = conflictReport.field_diffs.filter(d => !d.has_conflict && d.merged_value !== d.base_value);

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '(empty)';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <Surface style={styles.header}>
                <Title style={styles.title}>🔀 Resolve Conflict</Title>
                <Paragraph style={styles.subtitle}>
                    {conflictReport.entity_type === 'parcel' ? '📍 Land Parcel' : '👤 Person'} • ID: {conflictReport.entity_id.slice(0, 8)}...
                </Paragraph>
                <View style={styles.versionRow}>
                    <Chip icon="source-branch" style={styles.versionChip}>Base v{conflictReport.base_version}</Chip>
                    <Chip icon="cellphone" style={[styles.versionChip, styles.localChip]}>Local v{conflictReport.local_version}</Chip>
                    <Chip icon="cloud" style={[styles.versionChip, styles.serverChip]}>Server v{conflictReport.server_version}</Chip>
                </View>
            </Surface>

            {/* Conflicting Fields */}
            {conflictingFields.length > 0 && (
                <Card style={styles.card}>
                    <Card.Title
                        title="⚠️ Fields with Conflicts"
                        subtitle={`${conflictingFields.length} fields need your decision`}
                    />
                    <Card.Content>
                        {conflictingFields.map((diff, index) => (
                            <View key={diff.field_name}>
                                {index > 0 && <Divider style={styles.divider} />}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.fieldName}>
                                        {FIELD_LABELS[diff.field_name] || diff.field_name}
                                    </Text>

                                    {/* 3-way comparison */}
                                    <View style={styles.comparisonContainer}>
                                        <Surface style={[styles.valueBox, styles.baseBox]}>
                                            <Text style={styles.valueLabel}>Base</Text>
                                            <Text style={styles.valueText}>{formatValue(diff.base_value)}</Text>
                                        </Surface>

                                        <Surface style={[styles.valueBox, styles.localBox]}>
                                            <Text style={styles.valueLabel}>📱 Local</Text>
                                            <Text style={styles.valueText}>{formatValue(diff.local_value)}</Text>
                                        </Surface>

                                        <Surface style={[styles.valueBox, styles.serverBox]}>
                                            <Text style={styles.valueLabel}>☁️ Server</Text>
                                            <Text style={styles.valueText}>{formatValue(diff.server_value)}</Text>
                                        </Surface>
                                    </View>

                                    {/* Resolution options */}
                                    <RadioButton.Group
                                        onValueChange={value => handleResolutionChange(diff.field_name, value)}
                                        value={resolutions[diff.field_name] || ''}
                                    >
                                        <View style={styles.radioRow}>
                                            <RadioButton.Item
                                                label="Use Local"
                                                value="USE_LOCAL"
                                                style={styles.radioItem}
                                                labelStyle={styles.radioLabel}
                                            />
                                            <RadioButton.Item
                                                label="Use Server"
                                                value="USE_SERVER"
                                                style={styles.radioItem}
                                                labelStyle={styles.radioLabel}
                                            />
                                        </View>
                                        <RadioButton.Item
                                            label="Custom value"
                                            value={customValues[diff.field_name] || 'CUSTOM'}
                                            style={styles.radioItem}
                                            labelStyle={styles.radioLabel}
                                        />
                                    </RadioButton.Group>

                                    {resolutions[diff.field_name] === (customValues[diff.field_name] || 'CUSTOM') && (
                                        <TextInput
                                            mode="outlined"
                                            label="Enter custom value"
                                            value={customValues[diff.field_name] || ''}
                                            onChangeText={text => handleCustomValue(diff.field_name, text)}
                                            style={styles.customInput}
                                            dense
                                        />
                                    )}
                                </View>
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Auto-merged Fields */}
            {autoMergedFields.length > 0 && (
                <Card style={styles.card}>
                    <Card.Title
                        title="✅ Auto-Merged Changes"
                        subtitle="These will be applied automatically"
                    />
                    <Card.Content>
                        {autoMergedFields.map(diff => (
                            <View key={diff.field_name} style={styles.autoMergeRow}>
                                <Text style={styles.autoMergeField}>
                                    {FIELD_LABELS[diff.field_name] || diff.field_name}
                                </Text>
                                <Chip
                                    mode="outlined"
                                    icon={diff.suggested_resolution === 'use_local' ? 'cellphone' : 'cloud'}
                                    style={styles.autoMergeChip}
                                >
                                    {formatValue(diff.merged_value)}
                                </Chip>
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
                <Button
                    mode="outlined"
                    onPress={onCancel}
                    style={styles.cancelButton}
                >
                    Cancel
                </Button>
                <Button
                    mode="contained"
                    onPress={handleResolve}
                    style={styles.resolveButton}
                    disabled={conflictingFields.some(d => !resolutions[d.field_name])}
                >
                    Apply Resolution
                </Button>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        margin: 12,
        borderRadius: 12,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#666',
        marginBottom: 8,
    },
    versionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    versionChip: {
        backgroundColor: '#e0e0e0',
    },
    localChip: {
        backgroundColor: '#e3f2fd',
    },
    serverChip: {
        backgroundColor: '#fff3e0',
    },
    card: {
        margin: 12,
        marginTop: 0,
        borderRadius: 12,
    },
    divider: {
        marginVertical: 16,
    },
    fieldContainer: {
        marginVertical: 8,
    },
    fieldName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    comparisonContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    valueBox: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        elevation: 1,
    },
    baseBox: {
        backgroundColor: '#f5f5f5',
    },
    localBox: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        borderWidth: 1,
    },
    serverBox: {
        backgroundColor: '#fff3e0',
        borderColor: '#ff9800',
        borderWidth: 1,
    },
    valueLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    valueText: {
        fontSize: 13,
        color: '#333',
    },
    radioRow: {
        flexDirection: 'row',
    },
    radioItem: {
        paddingVertical: 4,
    },
    radioLabel: {
        fontSize: 14,
    },
    customInput: {
        marginTop: 8,
    },
    autoMergeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    autoMergeField: {
        fontSize: 14,
        color: '#666',
    },
    autoMergeChip: {
        backgroundColor: '#e8f5e9',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
    },
    resolveButton: {
        flex: 2,
    },
});

export default ConflictResolutionUI;
