/**
 * Tesseract.js OCR Wrapper
 * Provides on-device OCR for Urdu and English text
 */

import Tesseract, { createWorker } from 'tesseract.js';
import type { Worker, RecognizeResult } from 'tesseract.js';

export interface OCRWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    direction: 'ltr' | 'rtl';
}

export interface OCRLine {
    text: string;
    confidence: number;
    words: OCRWord[];
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface OCRBlock {
    text: string;
    confidence: number;
    lines: OCRLine[];
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface OCRResult {
    text: string;
    confidence: number;
    blocks: OCRBlock[];
    languages: string[];
    processingTime: number;
}

export interface OCRProgress {
    status: string;
    progress: number;
}

type ProgressCallback = (progress: OCRProgress) => void;

class TesseractOCR {
    private workers: Map<string, Worker> = new Map();
    private initializing: Map<string, Promise<Worker>> = new Map();

    /**
     * Get or create a worker for the specified language
     */
    private async getWorker(lang: string, onProgress?: ProgressCallback): Promise<Worker> {
        // Check if worker already exists
        const existingWorker = this.workers.get(lang);
        if (existingWorker) {
            return existingWorker;
        }

        // Check if initialization is in progress
        const initPromise = this.initializing.get(lang);
        if (initPromise) {
            return initPromise;
        }

        // Create new worker
        const workerPromise = this.createWorker(lang, onProgress);
        this.initializing.set(lang, workerPromise);

        try {
            const worker = await workerPromise;
            this.workers.set(lang, worker);
            this.initializing.delete(lang);
            return worker;
        } catch (error) {
            this.initializing.delete(lang);
            throw error;
        }
    }

    /**
     * Create and initialize a Tesseract worker
     */
    private async createWorker(lang: string, onProgress?: ProgressCallback): Promise<Worker> {
        const worker = await createWorker(lang, 1, {
            logger: (m) => {
                if (onProgress && m.status) {
                    onProgress({
                        status: m.status,
                        progress: m.progress || 0,
                    });
                }
            },
        });

        // Configure for better accuracy
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1',
        });

        return worker;
    }

    /**
     * Recognize text in an image
     */
    async recognize(
        image: Blob | HTMLCanvasElement | string,
        langs: string[] = ['eng', 'urd'],
        onProgress?: ProgressCallback
    ): Promise<OCRResult> {
        const startTime = Date.now();

        // Join languages for Tesseract
        const langString = langs.join('+');

        onProgress?.({ status: 'Loading OCR engine...', progress: 0 });

        // Get worker
        const worker = await this.getWorker(langString, onProgress);

        onProgress?.({ status: 'Analyzing document...', progress: 0.3 });

        // Perform recognition
        const result = await worker.recognize(image);

        onProgress?.({ status: 'Processing results...', progress: 0.9 });

        // Transform results
        const ocrResult = this.transformResult(result, langs, Date.now() - startTime);

        onProgress?.({ status: 'Complete', progress: 1 });

        return ocrResult;
    }

    /**
     * Recognize text in a specific region
     */
    async recognizeRegion(
        image: Blob | HTMLCanvasElement | string,
        region: { x: number; y: number; width: number; height: number },
        langs: string[] = ['eng', 'urd'],
        onProgress?: ProgressCallback
    ): Promise<OCRResult> {
        const startTime = Date.now();
        const langString = langs.join('+');

        const worker = await this.getWorker(langString, onProgress);

        const result = await worker.recognize(image, {
            rectangle: {
                left: region.x,
                top: region.y,
                width: region.width,
                height: region.height,
            },
        });

        return this.transformResult(result, langs, Date.now() - startTime);
    }

    /**
     * Transform Tesseract result to our format
     */
    private transformResult(
        result: RecognizeResult,
        languages: string[],
        processingTime: number
    ): OCRResult {
        const { data } = result;

        const blocks: OCRBlock[] = (data.blocks || []).map((block) => ({
            text: block.text,
            confidence: block.confidence,
            bbox: {
                x0: block.bbox.x0,
                y0: block.bbox.y0,
                x1: block.bbox.x1,
                y1: block.bbox.y1,
            },
            lines: (block.lines || []).map((line) => ({
                text: line.text,
                confidence: line.confidence,
                bbox: {
                    x0: line.bbox.x0,
                    y0: line.bbox.y0,
                    x1: line.bbox.x1,
                    y1: line.bbox.y1,
                },
                words: (line.words || []).map((word) => ({
                    text: word.text,
                    confidence: word.confidence,
                    bbox: {
                        x0: word.bbox.x0,
                        y0: word.bbox.y0,
                        x1: word.bbox.x1,
                        y1: word.bbox.y1,
                    },
                    direction: this.detectDirection(word.text),
                })),
            })),
        }));

        return {
            text: data.text,
            confidence: data.confidence,
            blocks,
            languages,
            processingTime,
        };
    }

    /**
     * Detect text direction (LTR or RTL)
     */
    private detectDirection(text: string): 'ltr' | 'rtl' {
        // Check for Urdu/Arabic characters
        const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return rtlPattern.test(text) ? 'rtl' : 'ltr';
    }

    /**
     * Preload language models
     */
    async preloadLanguages(langs: string[], onProgress?: ProgressCallback): Promise<void> {
        for (const lang of langs) {
            await this.getWorker(lang, onProgress);
        }
    }

    /**
     * Terminate all workers
     */
    async terminate(): Promise<void> {
        for (const worker of this.workers.values()) {
            await worker.terminate();
        }
        this.workers.clear();
    }

    /**
     * Check if a language is loaded
     */
    isLanguageLoaded(lang: string): boolean {
        return this.workers.has(lang);
    }
}

// Export singleton instance
export const tesseractOCR = new TesseractOCR();
export default tesseractOCR;
