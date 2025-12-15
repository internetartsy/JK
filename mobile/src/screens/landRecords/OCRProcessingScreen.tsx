import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Button, ScrollView } from 'react-native';
import { CameraScreen } from './ScanDocumentScreen'; // Re-use the purely UI component
import { OCRService } from '../../services/ocr';
import { Colors } from '../../styles/colors';
import { ProcessStatus } from '../../components/ProcessStatus';

export default function OCRProcessingScreen({ navigation }: any) {
    const [step, setStep] = useState<'camera' | 'uploading' | 'processing' | 'result' | 'error'>('camera');
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [ocrResult, setOcrResult] = useState<any>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    const retryCount = useRef(0);

    const handleCapture = async (path: string, type?: string) => {
        setStep('uploading');
        setStatusMessage('Uploading document...');
        retryCount.current = 0; // Reset counter

        try {
            // Default to 'girdawari' for now, but could be dynamic
            const { job_id, status } = await OCRService.uploadForProcessing(path, 'girdawari', type);
            setJobId(job_id);
            setStep('processing');
            setStatusMessage('Processing... (Queued)');

            // Start Polling
            pollInterval.current = setInterval(async () => {
                await checkJobStatus(job_id);
            }, 2000);

        } catch (error) {
            console.error('Upload error:', error);
            setStep('error');
            setStatusMessage('Failed to upload document.');
        }
    };

    const checkJobStatus = async (id: string) => {
        try {
            retryCount.current += 1;
            if (retryCount.current > 30) { // 60s timeout
                if (pollInterval.current) clearInterval(pollInterval.current);
                setStep('error');
                setStatusMessage('Processing Timeout. Please try again later.');
                return;
            }

            const data = await OCRService.checkStatus(id);
            console.log('Poll Status:', data.status);

            if (data.status === 'completed') {
                if (pollInterval.current) clearInterval(pollInterval.current);
                setOcrResult(data.result);
                setStep('result');
            } else if (data.status === 'failed') {
                if (pollInterval.current) clearInterval(pollInterval.current);
                setStep('error');
                setStatusMessage(`Processing failed: ${data.error || 'Unknown error'}`);
            } else {
                setStatusMessage(`Processing... ${data.progress ? `${data.progress}%` : ''} \n${data.message || ''}`);
            }
        } catch (error) {
            console.error('Poll error:', error);
            // Don't stop polling immediately on network hiccup, but maybe handle retries
        }
    };

    const handleDone = () => {
        navigation.navigate('OperatorDashboard');
    };

    const handleRetry = () => {
        setStep('camera');
        setOcrResult(null);
        setJobId(null);
    };

    if (step === 'camera') {
        return <CameraScreen onCapture={handleCapture} onClose={() => navigation.goBack()} />;
    }

    if (step === 'uploading' || step === 'processing') {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.statusText}>{statusMessage}</Text>
                <Text style={styles.subText}>Do not close the app.</Text>
            </View>
        );
    }

    if (step === 'error') {
        return (
            <View style={styles.centerContainer}>
                <Text style={[styles.statusText, { color: 'red' }]}>Error</Text>
                <Text style={styles.subText}>{statusMessage}</Text>
                <Button title="Try Again" onPress={handleRetry} />
                <View style={{ height: 20 }} />
                <Button title="Cancel" onPress={() => navigation.goBack()} color="#888" />
            </View>
        );
    }

    if (step === 'result' && ocrResult) {
        const needsReview = ocrResult.review_routing?.review_created;

        return (
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.title}>Scan Complete</Text>

                <View style={styles.resultCard}>
                    <Text style={styles.label}>Document ID:</Text>
                    <Text style={styles.value}>{ocrResult.doc_id}</Text>

                    <Text style={styles.label}>Confidence:</Text>
                    <Text style={[styles.value, { color: ocrResult.confidence > 0.8 ? 'green' : 'orange' }]}>
                        {(ocrResult.confidence * 100).toFixed(1)}%
                    </Text>
                </View>

                <Text style={styles.sectionHeader}>Extracted Data</Text>
                <View style={styles.fieldsContainer}>
                    {Object.entries(ocrResult.fields || {}).map(([key, value]) => (
                        <View key={key} style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>{key.replace('_', ' ').toUpperCase()}:</Text>
                            <Text style={styles.fieldValue}>{String(value)}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ marginVertical: 20 }}>
                    {needsReview ? (
                        <ProcessStatus
                            transferId={ocrResult.review_routing.review_task_id || "TASK-NEW"}
                            status="PENDING_REVIEW"
                            color="ORANGE"
                            icon="AlertTriangle"
                            text="Sent for Manual Review"
                            timeline="Confidence low or critical fields detected"
                            actions={[]}
                        />
                    ) : (
                        <ProcessStatus
                            transferId={ocrResult.doc_id}
                            status="APPROVED"
                            color="GREEN"
                            icon="CheckCircle2"
                            text="Auto-Approved"
                            timeline="High confidence, data verified"
                            actions={[]}
                        />
                    )}
                </View>

                <Button title="Done" onPress={handleDone} color={Colors.primary} />
            </ScrollView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: Colors.text },
    statusText: { marginTop: 20, fontSize: 18, fontWeight: '600', color: Colors.text, textAlign: 'center' },
    subText: { marginTop: 10, fontSize: 14, color: '#666', textAlign: 'center' },
    resultCard: { backgroundColor: Colors.card, padding: 15, borderRadius: 8, marginBottom: 20 },
    label: { fontSize: 14, color: '#888' },
    value: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
    fieldsContainer: { backgroundColor: Colors.card, padding: 15, borderRadius: 8 },
    fieldRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#555', flex: 1 },
    fieldValue: { fontSize: 14, color: Colors.text, flex: 1, textAlign: 'right' }
});
