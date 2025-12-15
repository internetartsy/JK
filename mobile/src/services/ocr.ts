import client, { frappeClient } from '../api/client';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface OCRResult {
    doc_id: string;
    fields: Record<string, any>;
    confidence: number;
    review_routing?: any;
}

export const OCRService = {
    /**
     * Upload an image to the Frappe Backend Logic Queue
     */
    async uploadForProcessing(uri: string, docType: string = 'girdawari', mimeType?: string): Promise<{ job_id: string, status: string }> {
        if (uri.startsWith('mock-file://')) {
            return new Promise(resolve => setTimeout(() => resolve({ job_id: 'mock-' + Date.now(), status: 'processing' }), 1000));
        }

        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || `scan_${Date.now()}`;
            let fileType = mimeType || (filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

            // @ts-ignore
            formData.append('file', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: filename,
                type: fileType,
            });
            formData.append('is_private', '1');

            console.log(`[OCR] Uploading to Frappe Logic Queue...`);

            // 1. Upload File
            const uploadRes = await frappeClient.post('/method/upload_file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Create Document
            const docRes = await frappeClient.post('/resource/OCR Result', {
                scan_id: `MOB-${Date.now()}`,
                description: `Mobile Upload: ${uploadRes.data.message.file_url}`,
                status: 'Processing' // Enters Logic Queue
            });

            console.log('[OCR] Frappe Doc Created:', docRes.data.data.name);
            return { job_id: docRes.data.data.name, status: 'submitted' };

        } catch (error) {
            console.warn('[OCR] Frappe Upload failed, trying Gateway Fallback extraction...', error);
            // Fallback to FastAPI extraction
            const formData = new FormData();
            const filename = uri.split('/').pop() || `scan_${Date.now()}`;
            // @ts-ignore
            formData.append('file', { uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri, name: filename, type: 'image/jpeg' });
            formData.append('doc_type', docType);

            const response = await client.post('/ocr/run-async', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
    },

    /**
     * Check status of an OCR Job
     * Maps to: GET /api/v1/ocr/status/{job_id}
     */
    async checkStatus(jobId: string): Promise<any> {
        if (jobId.startsWith('mock-job-')) {
            return {
                status: 'completed',
                result: {
                    doc_id: 'mock-doc-123',
                    confidence: 0.95,
                    fields: {
                        owner_name: 'Ramesh Kumar (Mock)',
                        khasra_number: '123/45',
                        village: 'Rampur',
                        area: '1.5 Ha'
                    }
                }
            };
        }

        try {
            const response = await client.get(`/ocr/status/${jobId}`);
            return response.data;
        } catch (error) {
            console.error(`[OCR] Status check failed for ${jobId}:`, error);
            throw error;
        }
    }
};
