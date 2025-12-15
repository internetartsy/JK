import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../styles/colors';
import { ChevronLeft } from 'lucide-react-native';

export default function FarmerLogin({ navigation }: any) {
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);

    const handleSendOtp = () => {
        if (mobile.length !== 10) {
            Alert.alert("Invalid Mobile", "Please enter a valid 10-digit mobile number.");
            return;
        }
        setShowOtp(true);
        Alert.alert("OTP Sent", "Mock OTP is 1234");
    };

    const handleLogin = () => {
        if (otp === '1234') {
            navigation.replace('FarmerDashboard');
        } else {
            Alert.alert("Error", "Invalid OTP");
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft color={Colors.text} size={24} />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Farmer Login</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Mobile Number (+91)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Mobile Number"
                    keyboardType="phone-pad"
                    value={mobile}
                    onChangeText={setMobile}
                    maxLength={10}
                    editable={!showOtp}
                />

                {showOtp && (
                    <>
                        <Text style={styles.label}>Enter OTP</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter 4-digit OTP"
                            keyboardType="number-pad"
                            value={otp}
                            onChangeText={setOtp}
                            maxLength={4}
                        />
                    </>
                )}

                <View style={styles.btnContainer}>
                    {!showOtp ? (
                        <Button title="Get OTP" onPress={handleSendOtp} color={Colors.primary} />
                    ) : (
                        <Button title="Login" onPress={handleLogin} color={Colors.primary} />
                    )}
                </View>

                <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('FarmerSignup')}>
                    <Text style={styles.linkText}>Don't have an account? Register</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: Colors.background },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10
    },
    backText: { fontSize: 16, color: Colors.text, marginLeft: 5 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: Colors.text },
    form: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 3 },
    label: { marginBottom: 5, fontWeight: '600', color: '#555' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, marginBottom: 20, fontSize: 16 },
    btnContainer: { marginBottom: 20 },
    link: { alignItems: 'center' },
    linkText: { color: Colors.primary, fontWeight: 'bold' }
});
