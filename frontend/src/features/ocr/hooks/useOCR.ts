import { useState, useCallback, useRef } from 'react';
import { tesseractOCR } from '../TesseractOCR';
import type { OCRResult, OCRProgress } from '../TesseractOCR';

export interface UseOCRResult {
    result: OCRResult | null;
    isProcessing: boolean;
    progress: OCRProgress | null;
    error: string | null;
    processImage: (image: Blob | HTMLCanvasElement, langs?: string[]) => Promise<OCRResult | null>;
    processRegion: (
        image: Blob | HTMLCanvasElement,
        region: { x: number; y: number; width: number; height: number },
        langs?: string[]
    ) => Promise<OCRResult | null>;
    preloadLanguages: (langs: string[]) => Promise<void>;
    reset: () => void;
}

export function useOCR(): UseOCRResult {
    const [result, setResult] = useState<OCRResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<OCRProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const abortRef = useRef(false);

    const processImage = useCallback(async (
        image: Blob | HTMLCanvasElement,
        langs: string[] = ['eng', 'urd']
    ): Promise<OCRResult | null> => {
        if (isProcessing) {
            console.warn('OCR already in progress');
            return null;
        }

        setIsProcessing(true);
        setError(null);
        setProgress({ status: 'Initializing...', progress: 0 });
        abortRef.current = false;

        try {
            const ocrResult = await tesseractOCR.recognize(image, langs, (p) => {
                if (!abortRef.current) {
                    setProgress(p);
                }
            });

            if (abortRef.current) {
                return null;
            }

            setResult(ocrResult);
            return ocrResult;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'OCR processing failed';
            setError(message);
            console.error('OCR error:', err);
            return null;
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    }, [isProcessing]);

    const processRegion = useCallback(async (
        image: Blob | HTMLCanvasElement,
        region: { x: number; y: number; width: number; height: number },
        langs: string[] = ['eng', 'urd']
    ): Promise<OCRResult | null> => {
        if (isProcessing) {
            console.warn('OCR already in progress');
            return null;
        }

        setIsProcessing(true);
        setError(null);
        abortRef.current = false;

        try {
            const ocrResult = await tesseractOCR.recognizeRegion(image, region, langs, (p) => {
                if (!abortRef.current) {
                    setProgress(p);
                }
            });

            if (abortRef.current) {
                return null;
            }

            // Merge with existing result or set as new
            if (result) {
                setResult({
                    ...result,
                    text: result.text + '\n' + ocrResult.text,
                    blocks: [...result.blocks, ...ocrResult.blocks],
                });
            } else {
                setResult(ocrResult);
            }

            return ocrResult;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'OCR processing failed';
            setError(message);
            return null;
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    }, [isProcessing, result]);

    const preloadLanguages = useCallback(async (langs: string[]) => {
        setProgress({ status: 'Preloading language models...', progress: 0 });
        try {
            await tesseractOCR.preloadLanguages(langs, setProgress);
        } finally {
            setProgress(null);
        }
    }, []);

    const reset = useCallback(() => {
        abortRef.current = true;
        setResult(null);
        setIsProcessing(false);
        setProgress(null);
        setError(null);
    }, []);

    return {
        result,
        isProcessing,
        progress,
        error,
        processImage,
        processRegion,
        preloadLanguages,
        reset,
    };
}

export default useOCR;
