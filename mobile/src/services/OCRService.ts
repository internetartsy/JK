import { Platform } from 'react-native';

// Conditional import - MLKit OCR only works on native
// We default to null/mock
let TextRecognition: any = null;

try {
    // Commented out for Expo Go compatibility
    // In a Dev Client, we would import this
    TextRecognition = require('react-native-mlkit-ocr').default;
} catch (e) {
    console.warn('MLKit OCR not available:', e);
}

export interface OCRResult {
    text: string;
    blocks: any[];
}

export const OCRService = {
    process: async (imagePath: string): Promise<OCRResult> => {
        if (Platform.OS === 'web' || !TextRecognition) {
            console.log('OCR Service: Using mock implementation (Expo Go)');
            // Mock response
            return {
                text: 'Khasra: 123\nVillage: Mock Village',
                blocks: []
            };
        }

        try {
            const result = await TextRecognition.recognize(imagePath);
            return {
                text: result.text,
                blocks: result.blocks,
            };
        } catch (e) {
            console.error('OCR Failed:', e);
            throw e;
        }
    },

    extractDetails: (text: string) => {
        // Basic heuristics for Khasra/Village extraction
        const lines = text.split('\n');
        let villageId = '';
        let khasraNumber = '';

        // Example regex patterns (adjust based on actual document format)
        // Looking for "Village: XYZ" or "Khasra: 123"
        const villageRegex = /(?:Village|Mouza)[\s:]+([A-Za-z0-9_-]+)/i;
        const khasraRegex = /(?:Khasra|Survey)[\s:]+([0-9\/]+)/i;

        for (const line of lines) {
            if (!villageId) {
                const vMatch = line.match(villageRegex);
                if (vMatch) villageId = vMatch[1];
            }
            if (!khasraNumber) {
                const kMatch = line.match(khasraRegex);
                if (kMatch) khasraNumber = kMatch[1];
            }
        }

        return { villageId, khasraNumber };
    }
};
