import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, Button, Alert } from 'react-native';
import { getDB } from '../services/Database';
import { SyncService } from '../services/SyncService';
import * as Crypto from 'expo-crypto';
import { OCRService } from '../services/OCRService';

export default function CaptureScreen({ onSave, onScan, imagePath }: { onSave: () => void, onScan: () => void, imagePath?: string }) {
    const [villageId, setVillageId] = useState('');
    const [khasraNumber, setKhasraNumber] = useState('');
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [localImagePath, setLocalImagePath] = useState<string | null>(null);

    // Update local state when prop changes (e.g. returning from camera)
    React.useEffect(() => {
        const processImage = async () => {
            if (imagePath) {
                setLocalImagePath(imagePath);
                setProcessing(true);
                try {
                    const result = await OCRService.process(imagePath);
                    console.log('OCR Result:', result.text);
                    const { villageId: v, khasraNumber: k } = OCRService.extractDetails(result.text);
                    if (v) setVillageId(v);
                    if (k) setKhasraNumber(k);

                    if (!v && !k && result.text.length > 5) {
                        alert('OCR finished but no fields detected.\nText: ' + result.text.substring(0, 100) + '...');
                    }
                } catch (e) {
                    console.error('OCR Error:', e);
                    alert('OCR Failed to process image');
                } finally {
                    setProcessing(false);
                }
            }
        };
        processImage();
    }, [imagePath]);

    const handleSave = async () => {
        if (!villageId || !khasraNumber) {
            alert('Please fill all fields');
            return;
        }

        setSaving(true);
        try {
            const db = getDB();
            const id = Crypto.randomUUID();
            const timestamp = new Date().toISOString();

            await db.runAsync(
                `INSERT INTO parcels (id, village_id, khasra_number, status, version, updated_at, sync_status, local_image_path)
         VALUES (?, ?, ?, ?, 1, ?, 'pending', ?)`,
                [id, villageId, khasraNumber, status, timestamp, localImagePath]
            );

            // Trigger sync in background (fire and forget)
            SyncService.push().catch(console.error);

            alert('Parcel Saved Locally');
            onSave();
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Add New Parcel</Text>

            <View style={styles.scanSection}>
                <Button title="📷 Scan Khasra Document" onPress={onScan} />
                {localImagePath && <Text style={styles.imagePath}>Image captured!</Text>}
            </View>

            <Text style={styles.label}>Village ID</Text>
            <TextInput
                style={styles.input}
                value={villageId}
                onChangeText={setVillageId}
                placeholder="e.g. village_123"
            />

            <Text style={styles.label}>Khasra Number</Text>
            <TextInput
                style={styles.input}
                value={khasraNumber}
                onChangeText={setKhasraNumber}
                placeholder="e.g. 100/1"
            />

            <View style={styles.buttonContainer}>
                <Button title={saving ? "Saving..." : "Save Parcel"} onPress={handleSave} disabled={saving} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    scanSection: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    imagePath: {
        marginTop: 5,
        fontSize: 12,
        color: 'green',
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    buttonContainer: {
        marginTop: 10,
    }
});
