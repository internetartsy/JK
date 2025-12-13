import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, Image, ScrollView, FlatList } from 'react-native';
import { Colors } from '../../styles/colors';
import * as ImagePicker from 'expo-image-picker';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react-native';
import { FarmerService } from '../../services/farmerService';

interface LandParcel {
    id: string;
    village: string;
    surveyNo: string;
    area: string;
    selected: boolean;
    isManual?: boolean;
}

export default function FarmerSignup({ navigation }: any) {
    const [step, setStep] = useState(1);

    // Step 1: Personal Details
    const [name, setName] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [mobile, setMobile] = useState('');

    // Step 2: Land Claiming
    const [suggestedLands, setSuggestedLands] = useState<LandParcel[]>([]);
    const [manualVillage, setManualVillage] = useState('');
    const [manualSurvey, setManualSurvey] = useState('');
    const [manualArea, setManualArea] = useState('');

    // Step 3: Face Auth & E-Sign
    const [faceImage, setFaceImage] = useState<string | null>(null);
    const [consent, setConsent] = useState(false);

    // --- Actions ---



    const handleVerifyDetails = async () => {
        if (aadhar.length !== 12 || mobile.length !== 10) {
            Alert.alert("Validation Error", "Please check Aadhar (12 digits) and Mobile (10 digits).");
            return;
        }

        try {
            // Call Backend API
            const response = await FarmerService.discoverLands(aadhar, mobile, name);

            if (response.buckets && response.buckets.length > 0) {
                // Map backend response to UI model
                const lands = response.buckets.map((b: any) => ({
                    id: b.id,
                    village: b.village,
                    surveyNo: b.surveyNo,
                    area: b.area,
                    selected: false
                }));
                setSuggestedLands(lands);
                Alert.alert("Records Found", `We found ${lands.length} land parcels linked to your details.`);
            } else {
                setSuggestedLands([]);
                Alert.alert("No Records Found", "No existing records found. You can add lands manually in the next step.");
            }
            setStep(2);
        } catch (error) {
            Alert.alert("Connection Error", "Could not connect to Land Records Database. Please try again.");
            // For Demo robustness, allow proceed if backend fails? No, better to block or handle.
        }
    };

    const toggleLandSelection = (id: string) => {
        setSuggestedLands(prev => prev.map(land =>
            land.id === id ? { ...land, selected: !land.selected } : land
        ));
    };

    const addManualLand = () => {
        if (!manualVillage || !manualSurvey) {
            Alert.alert("Missing Details", "Please enter Village and Survey/Khasra Number.");
            return;
        }

        const newLand: LandParcel = {
            id: `M_${Date.now()}`,
            village: manualVillage,
            surveyNo: manualSurvey,
            area: manualArea || 'Unknown',
            selected: true,
            isManual: true
        };

        setSuggestedLands(prev => [...prev, newLand]);
        setManualVillage('');
        setManualSurvey('');
        setManualArea('');
        Alert.alert("Added", "Land added to your claim list.");
    };

    const removeManualLand = (id: string) => {
        setSuggestedLands(prev => prev.filter(l => l.id !== id));
    };

    const handleProceedToAuth = () => {
        const selected = suggestedLands.filter(l => l.selected);
        if (selected.length === 0) {
            Alert.alert("No Land Claimed", "Are you sure you want to proceed without claiming any land?", [
                { text: "Cancel", style: "cancel" },
                { text: "Yes, Proceed", onPress: () => setStep(3) }
            ]);
        } else {
            setStep(3);
        }
    };

    const handleFaceAuth = async () => {
        if (!consent) {
            Alert.alert("Consent Required", "Please agree to the declaration before E-Signing.");
            return;
        }

        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission Required", "Camera permission is needed for E-Sign");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            cameraType: ImagePicker.CameraType.front,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setFaceImage(result.assets[0].uri);
            Alert.alert("E-Sign Successful", "Digital Signature generated via Face Auth.");
        }
    };

    const handleCreateAccount = async () => {
        const claimed = suggestedLands.filter(l => l.selected);
        const claimedRoRs = claimed.filter(l => !l.isManual).map(l => l.id);
        const manualLands = claimed.filter(l => l.isManual);

        try {
            const result = await FarmerService.register({
                name,
                mobile_number: mobile,
                aadhaar_number: aadhar,
                claimed_ror_numbers: claimedRoRs,
                manual_lands: manualLands,
                face_auth_image: faceImage // Sends Base64/URI
            });

            Alert.alert(
                "Application Submitted",
                `Registration Successful!\nFarmer ID: ${result.farmer_id}\n\nPlease Login with your Mobile Number.`,
                [{ text: "OK", onPress: () => navigation.replace('FarmerLogin') }]
            );
        } catch (error) {
            Alert.alert("Submission Failed", "There was an error submitting your application. Please try again.");
        }
    };

    // --- Render ---

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Farmer Registry</Text>

            {/* Progress Indicator */}
            <View style={styles.progress}>
                <View style={[styles.step, step >= 1 && styles.stepActive]}><Text style={styles.stepText}>1</Text></View>
                <View style={styles.line} />
                <View style={[styles.step, step >= 2 && styles.stepActive]}><Text style={styles.stepText}>2</Text></View>
                <View style={styles.line} />
                <View style={[styles.step, step >= 3 && styles.stepActive]}><Text style={styles.stepText}>3</Text></View>
            </View>

            {step === 1 && (
                <View style={styles.card}>
                    <Text style={styles.title}>Basic Details</Text>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
                    <Text style={styles.label}>Aadhar Number</Text>
                    <TextInput style={styles.input} value={aadhar} onChangeText={setAadhar} placeholder="12 Digit UID" keyboardType="number-pad" maxLength={12} />
                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput style={styles.input} value={mobile} onChangeText={setMobile} placeholder="Linked Mobile" keyboardType="phone-pad" maxLength={10} />
                    <Button title="Validate & Fetch Lands" onPress={handleVerifyDetails} color={Colors.primary} />
                </View>
            )}

            {step === 2 && (
                <View>
                    <View style={styles.card}>
                        <Text style={styles.title}>Claim Land Buckets</Text>
                        <Text style={styles.info}>Select lands that belong to you from the list below.</Text>

                        {suggestedLands.map((land) => (
                            <TouchableOpacity key={land.id} style={[styles.landItem, land.selected && styles.landItemSelected]} onPress={() => toggleLandSelection(land.id)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    {land.selected ? <CheckCircle2 color="green" size={24} /> : <Circle color="#ccc" size={24} />}
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={styles.landText}>{land.village} - Survey No: {land.surveyNo}</Text>
                                        <Text style={styles.landSubText}>Area: {land.area} {land.isManual ? '(Manual)' : ''}</Text>
                                    </View>
                                </View>
                                {land.isManual && (
                                    <TouchableOpacity onPress={() => removeManualLand(land.id)}>
                                        <Trash2 color="red" size={20} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>Add Missing Land</Text>
                        <Text style={styles.info}>Don't see your land? Add it manually.</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Village" value={manualVillage} onChangeText={setManualVillage} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Survey No." value={manualSurvey} onChangeText={setManualSurvey} />
                        </View>
                        <TextInput style={styles.input} placeholder="Area (e.g. 0.5 Ha)" value={manualArea} onChangeText={setManualArea} />
                        <Button title="Add Land" onPress={addManualLand} color={Colors.secondary} />
                    </View>

                    <Button title="Confirm Claims & Proceed" onPress={handleProceedToAuth} color="green" />
                </View>
            )}

            {step === 3 && (
                <View style={styles.card}>
                    <Text style={styles.title}>Consent & E-Sign</Text>

                    <View style={styles.consentBox}>
                        <TouchableOpacity onPress={() => setConsent(!consent)} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{ marginTop: 2 }}>
                                {consent ? <CheckCircle2 color="green" size={20} /> : <Circle color="#666" size={20} />}
                            </View>
                            <Text style={styles.consentText}>
                                I hereby declare that the details furnished above are true and correct to the best of my knowledge and belief. I consent to using my Face Authentication as a Digital Signature for this land claim registry.
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Digital Signature</Text>

                    <View style={styles.faceContainer}>
                        {faceImage ? (
                            <View>
                                <Image source={{ uri: faceImage }} style={styles.faceImage} />
                                <View style={styles.signedBadge}>
                                    <CheckCircle2 color="white" size={12} />
                                    <Text style={{ color: 'white', fontSize: 10, marginLeft: 4 }}>SIGNED</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.placeholderFace}><Text>Pending E-Sign</Text></View>
                        )}
                    </View>

                    <View style={styles.btnRow}>
                        <Button
                            title={faceImage ? "Retake E-Sign" : "E-Sign (Face Auth)"}
                            onPress={handleFaceAuth}
                            color={Colors.secondary}
                            disabled={!consent}
                        />
                    </View>

                    {faceImage && (
                        <View style={{ marginTop: 20 }}>
                            <Button title="Submit Application" onPress={handleCreateAccount} color={Colors.primary} />
                        </View>
                    )}
                </View>
            )}

            {step === 1 && (
                <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('FarmerLogin')}>
                    <Text style={styles.linkText}>Already Registered? Login</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: Colors.background },
    header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: Colors.text },

    progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    step: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    stepActive: { backgroundColor: Colors.primary },
    stepText: { color: 'white', fontWeight: 'bold' },
    line: { width: 30, height: 2, backgroundColor: '#ddd' },

    card: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 2, marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    label: { marginBottom: 5, fontWeight: '600', color: '#555' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginBottom: 15, fontSize: 16 },
    info: { marginBottom: 15, color: '#666', fontSize: 14 },

    landItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 10 },
    landItemSelected: { borderColor: 'green', backgroundColor: '#f0fff4' },
    landText: { fontWeight: 'bold', fontSize: 16 },
    landSubText: { fontSize: 12, color: '#666' },

    consentBox: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 5, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    consentText: { marginLeft: 10, color: '#555', fontSize: 13, lineHeight: 18 },

    faceContainer: { alignItems: 'center', marginBottom: 20 },
    faceImage: { width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: 'green' },
    placeholderFace: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    signedBadge: { position: 'absolute', bottom: 0, backgroundColor: 'green', flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: 10 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    btnRow: { marginBottom: 10 },
    link: { alignItems: 'center', marginTop: 10 },
    linkText: { color: Colors.primary, fontWeight: 'bold' }
});
