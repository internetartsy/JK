import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, Button, TouchableOpacity, Platform, Alert } from 'react-native';

// Mock Implementation for Expo Go
const MockCamera = React.forwardRef((props: any, ref: any) => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#333' }]}>
        <Text style={{ color: 'white', marginTop: 100, textAlign: 'center' }}>Camera Stream Placeholder</Text>
    </View>
));

let Camera: any = MockCamera;
let useCameraDevice: any = () => ({});
let useCameraPermission: any = () => ({ hasPermission: true, requestPermission: () => { } });

// Try to load real module, but fail silently if missing (Expo Go)
try {
    // Note: In a real scenario, we might check Constants.appOwnership to avoid even trying this
    // const visionCamera = require('react-native-vision-camera');
    // Camera = visionCamera.Camera;
    // useCameraDevice = visionCamera.useCameraDevice;
    // useCameraPermission = visionCamera.useCameraPermission;
} catch (e) {
    console.warn('Vision Camera not available, using mock.');
}

interface CameraScreenProps {
    onCapture: (path: string) => void;
    onCancel: () => void;
}

export default function CameraScreen({ onCapture, onCancel }: CameraScreenProps) {
    const permissionResult = useCameraPermission();
    const hasPermission = permissionResult?.hasPermission ?? false;
    const requestPermission = permissionResult?.requestPermission ?? (() => { });
    const device = useCameraDevice('back');
    const camera = useRef<any>(null);
    const [isActive, setIsActive] = useState(true);

    // Mock functionality for taking a photo in Expo Go
    const takePhoto = async () => {
        if (Camera === MockCamera) {
            Alert.alert('Expo Go', 'Camera not supported in Expo Go. Using mock image.');
            onCapture('mock-image-path.jpg');
            return;
        }

        if (camera.current) {
            try {
                const photo = await camera.current.takePhoto({
                    flash: 'off',
                });
                setIsActive(false);
                onCapture(photo.path);
            } catch (e: any) {
                Alert.alert('Error', `Failed to take photo: ${e.message}`);
            }
        }
    };

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera not supported on Web</Text>
                <Button title="Back" onPress={onCancel} />
            </View>
        );
    }

    // In Expo Go with Mock, we bypass permission checks effectively or fake them
    if (Camera !== MockCamera && !hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera permission required</Text>
                <Button title="Request Permission" onPress={requestPermission} />
                <Button title="Cancel" onPress={onCancel} />
            </View>
        );
    }

    if (Camera !== MockCamera && device == null) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No camera device found</Text>
                <Button title="Back" onPress={onCancel} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                photo={true}
            />

            <View style={styles.overlay}>
                <View style={styles.topBar}>
                    <Button title="Cancel" onPress={onCancel} color="#fff" />
                </View>

                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                        <View style={styles.captureBtnInner} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: 'white',
        fontSize: 18,
        marginBottom: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 40,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    captureBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
});
