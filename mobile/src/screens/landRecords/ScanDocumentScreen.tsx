import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image as ImageIcon, FileText } from 'lucide-react-native';
import { Colors } from '../../styles/colors';

interface CameraScreenProps {
    onCapture: (path: string, type?: string) => void;
    onClose: () => void;
}

export function CameraScreen({ onCapture, onClose }: CameraScreenProps) {
    // const device = useCameraDevice('back');
    // const { hasPermission, requestPermission } = useCameraPermission();
    // const camera = useRef<Camera>(null);
    const [isActive, setIsActive] = useState(true);

    // Mock for Expo Go
    const device = null;
    const hasPermission = true;

    // useEffect(() => {
    //     if (!hasPermission) {
    //         requestPermission();
    //     }
    // }, [hasPermission]);

    const capturePhoto = async () => {
        // if (camera.current) {
        //     try {
        //         const photo = await camera.current.takePhoto({
        //             flash: 'off'
        //         });
        //         setIsActive(false);
        //         onCapture(`file://${photo.path}`, 'image/jpeg');
        //     } catch (e) {
        //         console.error("Failed to take photo", e);
        //         Alert.alert("Error", "Failed to take photo");
        //     }
        // }
        Alert.alert("Camera not supported in Expo Go");
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setIsActive(false);
                onCapture(result.assets[0].uri, 'image/jpeg');
            }
        } catch (e) {
            console.error("Failed to pick image", e);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIsActive(false);
                onCapture(asset.uri, asset.mimeType || 'application/pdf');
            }
        } catch (e) {
            console.error("Failed to pick document", e);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    // if (!hasPermission) {
    //     return <View style={styles.container}><Text style={{ color: 'white' }}>No Camera Permission</Text></View>;
    // }

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission Required", "Camera access is needed to scan documents.");
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setIsActive(false);
                onCapture(result.assets[0].uri, 'image/jpeg');
            }
        } catch (error) {
            console.error("Camera Error:", error);
            Alert.alert("Error", "Failed to open camera.");
        }
    };

    // Force Fallback View (Simulator/Expo Go)
    if (device == null) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', marginBottom: 20 }}>Select Capture Method</Text>

                <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: Colors.primary }]} onPress={takePhoto}>
                    <Text style={styles.btnText}>Take Photo (Camera)</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Text style={styles.btnText}>Select Image (Gallery)</Text>
                </TouchableOpacity>

                <View style={{ height: 10 }} />

                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                    <Text style={styles.btnText}>Select PDF / Doc</Text>
                </TouchableOpacity>

                <View style={{ height: 30 }} />

                <TouchableOpacity style={[styles.captureBtn, { marginTop: 20, borderColor: '#555', width: 60, height: 60 }]} onPress={() => onCapture('mock-file://simulated_scan.jpg', 'image/jpeg')}>
                    <Text style={{ color: 'black', fontSize: 10 }}>Mock</Text>
                </TouchableOpacity>
                <Text style={{ color: '#555', fontSize: 10, marginTop: 5 }}>Simulated Scan</Text>

                <TouchableOpacity style={[styles.closeBtn, { marginTop: 20 }]} onPress={onClose}>
                    <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                photo={true}
            /> */}

            <View style={styles.controls}>
                <TouchableOpacity style={styles.closeBtn} onPress={pickDocument}>
                    <FileText color="white" size={28} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
                    <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={pickImage}>
                    <ImageIcon color="white" size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.topControls}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
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
        paddingHorizontal: 20,
    },
    topControls: {
        position: 'absolute',
        top: 50,
        right: 20,
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
    uploadBtn: {
        padding: 15,
        backgroundColor: '#333',
        borderRadius: 8,
        minWidth: 200,
        alignItems: 'center'
    },
    btnText: {
        color: 'white',
        fontSize: 16,
    }
});
