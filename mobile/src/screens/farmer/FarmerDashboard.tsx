import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Colors } from '../../styles/colors';

export default function FarmerDashboard({ navigation }: any) {
    const handleLogout = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Farmer Dashboard</Text>
            <Text style={styles.subtitle}>Welcome, Farmer</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>My Land Records</Text>
                <Text>No records found linked to your Aadhar.</Text>
                <Button title="Link New Land" onPress={() => Alert.alert("Coming Soon")} />
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>PM Kisan Status</Text>
                <Text style={{ color: 'green' }}>Active</Text>
            </View>

            <View style={{ marginTop: 20 }}>
                <Button title="Logout" onPress={handleLogout} color="red" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: Colors.background },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: Colors.text },
    subtitle: { fontSize: 18, marginBottom: 20, color: '#666' },
    card: { padding: 15, backgroundColor: 'white', borderRadius: 8, marginBottom: 15, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 }
});
