import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

interface CameraScreenProps {
    onCapture: (path: string) => void;
    onClose: () => void;
}

export function CameraScreen({ onCapture, onClose }: CameraScreenProps) {
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const camera = useRef<Camera>(null);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    const capturePhoto = async () => {
        if (camera.current) {
            try {
                const photo = await camera.current.takePhoto({
                    flash: 'off'
                });
                setIsActive(false);
                onCapture(`file://${photo.path}`);
            } catch (e) {
                console.error("Failed to take photo", e);
                Alert.alert("Error", "Failed to take photo");
            }
        }
    };

    if (!hasPermission) {
        return <View style={styles.container}><Text>No Camera Permission</Text></View>;
    }

    if (device == null) {
        return <View style={styles.container}><ActivityIndicator size="large" /></View>;
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

            <View style={styles.controls}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
                    <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <View style={{ width: 60 }} />
            </View>

            <View style={styles.overlay}>
                <Text style={styles.overlayText}>Align Document with Frame</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
    },
    closeBtn: {
        padding: 10,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
    },
    overlay: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 8
    },
    overlayText: {
        color: 'white',
        fontWeight: 'bold'
    }
});
