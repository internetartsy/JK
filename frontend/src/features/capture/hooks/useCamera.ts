import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraDevice {
    deviceId: string;
    label: string;
    kind: 'videoinput';
}

export interface CameraConstraints {
    facingMode?: 'user' | 'environment';
    width?: { ideal: number };
    height?: { ideal: number };
}

export interface UseCameraResult {
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isLoading: boolean;
    error: string | null;
    devices: CameraDevice[];
    currentDeviceId: string | null;
    hasPermission: boolean;
    isTorchSupported: boolean;
    isTorchOn: boolean;
    startCamera: (constraints?: CameraConstraints) => Promise<void>;
    stopCamera: () => void;
    switchCamera: () => Promise<void>;
    toggleTorch: () => Promise<void>;
    captureImage: () => Promise<Blob | null>;
}

export function useCamera(): UseCameraResult {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<CameraDevice[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    // Enumerate available camera devices
    const enumerateDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices
                .filter((device): device is MediaDeviceInfo & { kind: 'videoinput' } =>
                    device.kind === 'videoinput'
                )
                .map((device) => ({
                    deviceId: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
                    kind: device.kind as 'videoinput',
                }));
            setDevices(videoDevices);
            return videoDevices;
        } catch (err) {
            console.error('Failed to enumerate devices:', err);
            return [];
        }
    }, []);

    // Start camera with given constraints
    const startCamera = useCallback(async (constraints?: CameraConstraints) => {
        setIsLoading(true);
        setError(null);

        try {
            // Stop any existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const videoConstraints: MediaTrackConstraints = {
                facingMode: constraints?.facingMode || 'environment',
                width: constraints?.width || { ideal: 1920 },
                height: constraints?.height || { ideal: 1080 },
            };

            // If we have a specific device ID, use it
            if (currentDeviceId) {
                videoConstraints.deviceId = { exact: currentDeviceId };
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false,
            });

            setStream(mediaStream);
            setHasPermission(true);

            // Attach stream to video element
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            // Get the track to check for torch support
            const videoTrack = mediaStream.getVideoTracks()[0];
            setCurrentDeviceId(videoTrack.getSettings().deviceId || null);

            // Check torch/flash support
            const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
            setIsTorchSupported(!!capabilities?.torch);

            // Enumerate devices after permission is granted (to get labels)
            await enumerateDevices();

        } catch (err) {
            const error = err as Error;
            if (error.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access to continue.');
            } else if (error.name === 'NotFoundError') {
                setError('No camera found. Please connect a camera and try again.');
            } else if (error.name === 'NotReadableError') {
                setError('Camera is in use by another application.');
            } else {
                setError(`Failed to access camera: ${error.message}`);
            }
            setHasPermission(false);
        } finally {
            setIsLoading(false);
        }
    }, [stream, currentDeviceId, enumerateDevices]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsTorchOn(false);
    }, [stream]);

    // Switch between available cameras
    const switchCamera = useCallback(async () => {
        if (devices.length < 2) return;

        const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % devices.length;
        const nextDevice = devices[nextIndex];

        setCurrentDeviceId(nextDevice.deviceId);

        // Restart camera with new device
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: nextDevice.deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            // Check torch support for new camera
            const videoTrack = mediaStream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
            setIsTorchSupported(!!capabilities?.torch);
            setIsTorchOn(false);
        } catch (err) {
            setError(`Failed to switch camera: ${(err as Error).message}`);
        }
    }, [devices, currentDeviceId, stream]);

    // Toggle torch/flash
    const toggleTorch = useCallback(async () => {
        if (!stream || !isTorchSupported) return;

        try {
            const videoTrack = stream.getVideoTracks()[0];
            const newTorchState = !isTorchOn;

            await videoTrack.applyConstraints({
                advanced: [{ torch: newTorchState } as MediaTrackConstraintSet]
            });

            setIsTorchOn(newTorchState);
        } catch (err) {
            console.error('Failed to toggle torch:', err);
        }
    }, [stream, isTorchSupported, isTorchOn]);

    // Capture current frame as image
    const captureImage = useCallback(async (): Promise<Blob | null> => {
        if (!videoRef.current) return null;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/jpeg',
                0.92 // High quality JPEG
            );
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return {
        stream,
        videoRef,
        isLoading,
        error,
        devices,
        currentDeviceId,
        hasPermission,
        isTorchSupported,
        isTorchOn,
        startCamera,
        stopCamera,
        switchCamera,
        toggleTorch,
        captureImage,
    };
}

export default useCamera;
