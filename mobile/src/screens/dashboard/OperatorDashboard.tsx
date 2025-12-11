import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { Colors } from '../../styles/colors';
import { ProcessStatus } from '../../components/ProcessStatus';

export default function OperatorDashboard({ navigation }: any) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.title}>Operator Dashboard</Text>

            <View style={styles.card}>
                <Text style={styles.subtitle}>Quick Actions</Text>
                <Button title="Scan New Record" onPress={() => navigation.navigate('ScanDocument')} color={Colors.primary} />
                <View style={{ height: 10 }} />
                <Button title="Sync Offline Data" onPress={() => navigation.navigate('OfflineSync')} />
            </View>

            <Text style={[styles.subtitle, { marginTop: 20 }]}>Recent Activities</Text>

            {/* Demo of ProcessStatus Component */}
            <ProcessStatus
                transferId="TRF-2025-0001"
                status="PENDING_TAHSILDAR"
                color="RED"
                text="Awaiting Tahsildar Approval"
                timeline="Expected: 2-3 days"
                actions={[
                    { label: "View Details", action: () => { } },
                    { label: "Contact", action: () => { } }
                ]}
            />

            <ProcessStatus
                transferId="TRF-2025-0045"
                status="PROCESS_DEBT"
                color="BLACK"
                text="Multiple claimants detected"
                timeline="Escalated: 1 hour ago"
                actions={[
                    { label: "Escalate", action: () => { } }
                ]}
            />

            <ProcessStatus
                transferId="TRF-2025-0099"
                status="COMPLETED"
                color="GREEN"
                text="Ownership transfer complete"
                timeline="Today at 10:45 AM"
                actions={[
                    { label: "Download", action: () => { } }
                ]}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: Colors.background },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: Colors.text },
    card: { padding: 15, backgroundColor: Colors.card, borderRadius: 8, elevation: 2 },
    subtitle: { fontSize: 18, marginBottom: 10, fontWeight: '600' }
});
