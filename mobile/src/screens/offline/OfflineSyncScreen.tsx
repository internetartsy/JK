import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SyncService } from '../../services/sync';
import { Colors } from '../../styles/colors';

export default function OfflineSyncScreen() {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            await SyncService.sync();
            Alert.alert("Success", "Data synchronized successfully");
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Offline Data Sync</Text>
            <Text style={styles.desc}>Push stored records to server and pull latest updates.</Text>

            {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : (
                <Button title="Sync Now" onPress={handleSync} color={Colors.primary} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    desc: { textAlign: 'center', marginBottom: 30, color: Colors.textSecondary }
});
