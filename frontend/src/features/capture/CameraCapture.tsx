import { useEffect, useState, useCallback } from 'react';
import { Camera, FlashlightOff, Flashlight, RotateCcw, Check, X, RefreshCw, Scan } from 'lucide-react';
import { useCamera } from './hooks/useCamera';
import { preprocessImage, analyzeQuality, type QualityMetrics } from './utils/ImagePreprocessor';

interface CameraGridProps {
    aspectRatio?: '4:3' | '16:9' | 'a4' | 'square';
}

function CameraGrid(_props: CameraGridProps) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Rule of thirds grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/20" />
                ))}
            </div>

            {/* Document corner guides */}
            <div className="absolute inset-8 border-2 border-dashed border-primary-400/60 rounded-lg">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
            </div>

            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-2 border-white/40 rounded-full" />
                <div className="absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1 bg-white/60 rounded-full" />
            </div>
        </div>
    );
}

interface QualityIndicatorProps {
    metrics: QualityMetrics | null;
}

function QualityIndicator({ metrics }: QualityIndicatorProps) {
    if (!metrics) return null;

    const getBlurStatus = () => {
        if (metrics.blur > 0.5) return { label: 'Sharp', color: 'bg-green-500' };
        if (metrics.blur > 0.3) return { label: 'Acceptable', color: 'bg-yellow-500' };
        return { label: 'Blurry', color: 'bg-red-500' };
    };

    const getBrightnessStatus = () => {
        if (metrics.brightness > 0.3 && metrics.brightness < 0.7) return { label: 'Good', color: 'bg-green-500' };
        if (metrics.brightness < 0.2 || metrics.brightness > 0.8) return { label: 'Poor', color: 'bg-red-500' };
        return { label: 'Acceptable', color: 'bg-yellow-500' };
    };

    const blur = getBlurStatus();
    const brightness = getBrightnessStatus();

    return (
        <div className="absolute top-4 left-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className={`w-2 h-2 rounded-full ${blur.color}`} />
                <span className="text-white">Focus: {blur.label}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className={`w-2 h-2 rounded-full ${brightness.color}`} />
                <span className="text-white">Light: {brightness.label}</span>
            </div>
            {metrics.glare && (
                <div className="flex items-center gap-2 bg-red-500/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <span className="text-white">⚠️ Glare detected</span>
                </div>
            )}
        </div>
    );
}

export interface CapturedImage {
    blob: Blob;
    preview: string;
    timestamp: Date;
    qualityScore: number;
    issues: string[];
    location?: GeolocationPosition;
}

interface CameraCaptureProps {
    onCapture: (image: CapturedImage) => void;
    onCancel: () => void;
    enableGeolocation?: boolean;
    documentType?: 'khasra' | 'girdawari' | 'general';
}

export function CameraCapture({
    onCapture,
    onCancel,
    enableGeolocation = true,
    documentType = 'general'
}: CameraCaptureProps) {
    const {
        videoRef,
        isLoading,
        error,
        hasPermission,
        isTorchSupported,
        isTorchOn,
        devices,
        startCamera,
        stopCamera,
        switchCamera,
        toggleTorch,
        captureImage,
    } = useCamera();

    const [, setCapturedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
    const [processingResult, setProcessingResult] = useState<{
        blob: Blob;
        qualityScore: number;
        issues: string[];
    } | null>(null);

    // Initialize camera on mount
    useEffect(() => {
        startCamera({ facingMode: 'environment' });
        return () => stopCamera();
    }, []);

    // Real-time quality analysis (throttled)
    useEffect(() => {
        if (!hasPermission) return;

        const analyzeFrame = async () => {
            const blob = await captureImage();
            if (blob) {
                const metrics = await analyzeQuality(blob);
                setQualityMetrics(metrics);
            }
        };

        const interval = setInterval(analyzeFrame, 1000);
        return () => clearInterval(interval);
    }, [hasPermission, captureImage]);

    // Handle capture
    const handleCapture = useCallback(async () => {
        setIsProcessing(true);

        try {
            const blob = await captureImage();
            if (!blob) {
                throw new Error('Failed to capture image');
            }

            // Create preview URL
            const url = URL.createObjectURL(blob);
            setCapturedBlob(blob);
            setPreviewUrl(url);

            // Process image
            const result = await preprocessImage(blob);
            setProcessingResult({
                blob: result.blob,
                qualityScore: result.qualityScore,
                issues: result.issues,
            });

        } catch (err) {
            console.error('Capture failed:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [captureImage]);

    // Confirm and submit captured image
    const handleConfirm = useCallback(async () => {
        if (!processingResult) return;

        let location: GeolocationPosition | undefined;

        if (enableGeolocation && 'geolocation' in navigator) {
            try {
                location = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                    });
                });
            } catch {
                console.log('Geolocation not available');
            }
        }

        onCapture({
            blob: processingResult.blob,
            preview: previewUrl!,
            timestamp: new Date(),
            qualityScore: processingResult.qualityScore,
            issues: processingResult.issues,
            location,
        });

        // Cleanup
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    }, [processingResult, previewUrl, enableGeolocation, onCapture]);

    // Retake photo
    const handleRetake = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setCapturedBlob(null);
        setPreviewUrl(null);
        setProcessingResult(null);
    }, [previewUrl]);

    // Show permission denied state
    if (error && !hasPermission) {
        return (
            <div className="fixed inset-0 bg-secondary-900 flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-16 h-16 text-primary-400 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Camera Access Required</h2>
                <p className="text-secondary-300 mb-6 max-w-md">{error}</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => startCamera()}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Show preview/confirmation state
    if (previewUrl && processingResult) {
        return (
            <div className="fixed inset-0 bg-secondary-900 flex flex-col">
                {/* Preview image */}
                <div className="flex-1 relative">
                    <img
                        src={previewUrl}
                        alt="Captured document"
                        className="w-full h-full object-contain"
                    />

                    {/* Quality score overlay */}
                    <div className="absolute top-4 left-4 right-4">
                        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">Quality Score</span>
                                <span className={`text-lg font-bold ${processingResult.qualityScore > 0.7 ? 'text-green-400' :
                                    processingResult.qualityScore > 0.4 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {Math.round(processingResult.qualityScore * 100)}%
                                </span>
                            </div>
                            <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${processingResult.qualityScore > 0.7 ? 'bg-green-500' :
                                        processingResult.qualityScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${processingResult.qualityScore * 100}%` }}
                                />
                            </div>

                            {/* Issues */}
                            {processingResult.issues.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {processingResult.issues.map((issue, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-yellow-300">
                                            <span>⚠️</span>
                                            <span>{issue}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="bg-black/80 backdrop-blur-lg p-6 pb-safe">
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={handleRetake}
                            className="flex flex-col items-center gap-2 text-white"
                        >
                            <div className="w-14 h-14 rounded-full bg-secondary-700 flex items-center justify-center hover:bg-secondary-600 transition-colors">
                                <RotateCcw className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Retake</span>
                        </button>

                        <button
                            onClick={handleConfirm}
                            className="flex flex-col items-center gap-2 text-white"
                        >
                            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-colors shadow-lg shadow-green-500/30">
                                <Check className="w-10 h-10" />
                            </div>
                            <span className="text-sm font-medium">Confirm</span>
                        </button>

                        <button
                            onClick={onCancel}
                            className="flex flex-col items-center gap-2 text-white"
                        >
                            <div className="w-14 h-14 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors">
                                <X className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Cancel</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Camera viewfinder
    return (
        <div className="fixed inset-0 bg-black flex flex-col">
            {/* Camera view */}
            <div className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Grid overlay */}
                <CameraGrid aspectRatio={documentType === 'khasra' ? 'a4' : '4:3'} />

                {/* Quality indicators */}
                <QualityIndicator metrics={qualityMetrics} />

                {/* Loading overlay */}
                {(isLoading || isProcessing) && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center text-white">
                            <Scan className="w-12 h-12 mx-auto mb-3 animate-pulse" />
                            <p>{isLoading ? 'Starting camera...' : 'Processing...'}</p>
                        </div>
                    </div>
                )}

                {/* Document type indicator */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-sm font-medium capitalize">
                        {documentType === 'khasra' ? 'خسرہ' : documentType === 'girdawari' ? 'گرداوری' : 'Document'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-black/80 backdrop-blur-lg p-6 pb-safe">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    {/* Torch toggle */}
                    <button
                        onClick={toggleTorch}
                        disabled={!isTorchSupported}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isTorchSupported
                            ? isTorchOn
                                ? 'bg-yellow-500 text-black'
                                : 'bg-secondary-700 text-white hover:bg-secondary-600'
                            : 'bg-secondary-800 text-secondary-500 cursor-not-allowed'
                            }`}
                        aria-label={isTorchOn ? 'Turn off flash' : 'Turn on flash'}
                    >
                        {isTorchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
                    </button>

                    {/* Capture button */}
                    <button
                        onClick={handleCapture}
                        disabled={isProcessing || isLoading}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 hover:bg-secondary-100 transition-colors shadow-lg"
                        aria-label="Capture photo"
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-secondary-900" />
                    </button>

                    {/* Camera switch */}
                    <button
                        onClick={switchCamera}
                        disabled={devices.length < 2}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${devices.length >= 2
                            ? 'bg-secondary-700 text-white hover:bg-secondary-600'
                            : 'bg-secondary-800 text-secondary-500 cursor-not-allowed'
                            }`}
                        aria-label="Switch camera"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Cancel button */}
                <button
                    onClick={onCancel}
                    className="mt-4 w-full text-center text-secondary-400 hover:text-white transition-colors py-2"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default CameraCapture;
