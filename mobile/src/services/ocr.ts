import client from './api';
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
     * Upload an image to the Async OCR Pipeline
     * Maps to: POST /api/v1/ocr/run-async
     */
    async uploadForProcessing(uri: string, docType: string = 'girdawari'): Promise<{ job_id: string, status: string }> {
        try {
            const formData = new FormData();

            // Prepare file object for React Native FormData
            const filename = uri.split('/').pop() || `scan_${Date.now()}.jpg`;
            const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

            // @ts-ignore: React Native specific FormData handling
            formData.append('file', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: filename,
                type: fileType,
            });

            formData.append('doc_type', docType);
            formData.append('langs', 'ur+en');

            console.log(`[OCR] Uploading ${filename} to ${client.defaults.baseURL}/ocr/run-async`);

            const response = await client.post('/ocr/run-async', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('[OCR] Upload success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[OCR] Upload failed:', error);
            throw error;
        }
    },

    /**
     * Check status of an OCR Job
     * Maps to: GET /api/v1/ocr/status/{job_id}
     */
    async checkStatus(jobId: string): Promise<any> {
        try {
            const response = await client.get(`/ocr/status/${jobId}`);
            return response.data;
        } catch (error) {
            console.error(`[OCR] Status check failed for ${jobId}:`, error);
            throw error;
        }
    }
};
