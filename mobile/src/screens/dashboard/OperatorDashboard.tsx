import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { Colors } from '../../styles/colors';
import { ProcessStatus } from '../../components/ProcessStatus';
import { DisputeService } from '../../services/disputeService';
import { TransferService } from '../../services/transferService';

export default function OperatorDashboard({ navigation }: any) {
    const dispatch = useDispatch();

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: 'destructive',
                    onPress: () => {
                        dispatch(logout());
                        // Reset navigation stack to prevent going back
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'RoleSelection' }],
                        });
                    }
                }
            ]
        );
    };

    const handleEscalate = async (claimId: string) => {
        try {
            Alert.alert("Processing", "Escalating dispute...");
            await DisputeService.transitionDispute(claimId, 'escalate_complex');
            Alert.alert("Success", "Dispute escalated to higher authority.");
        } catch (error: any) {
            console.error("Escalation failed", error);
            // Check for 404 (ID not found) which proves backend reachability
            if (error.response && error.response.status === 404) {
                Alert.alert("Backend Connected", "Service reached, but Mock ID not found in DB (As Expected).");
            } else {
                Alert.alert("Error", "Failed to escalate dispute. Check backend connection.");
            }
        }
    };

    const handleViewDetails = async (transferId: string) => {
        try {
            Alert.alert("Fetching", "Loading transfer details...");
            const data = await TransferService.getTransferDetails(transferId);
            Alert.alert("Transfer Details", JSON.stringify(data, null, 2));
        } catch (error: any) {
            console.error("View Details failed", error);
            if (error.response && error.response.status === 404) {
                Alert.alert("Backend Connected", "Service reached, but ID not found (Expected for Mock ID).");
            } else {
                Alert.alert("Error", "Failed to fetch details.");
            }
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Text style={styles.title}>Operator Dashboard</Text>
                <Button title="Logout" onPress={handleLogout} color="red" />
            </View>

            <View style={styles.card}>
                <Text style={styles.subtitle}>Quick Actions</Text>
                <Button title="Scan New Record" onPress={() => navigation.navigate('ScanDocument')} color={Colors.primary} />
                <View style={{ height: 10 }} />
                <Button title="Sync Offline Data" onPress={() => navigation.navigate('OfflineSync')} />
            </View>

            <Text style={[styles.subtitle, { marginTop: 20 }]}>Recent Activities</Text>

            {/* Demo of ProcessStatus Component */}
            <ProcessStatus
                // Valid UUID format for backend test
                transferId="123e4567-e89b-12d3-a456-426614174000"
                status="PENDING_TAHSILDAR"
                color="RED"
                icon="Clock"
                text="Awaiting Tahsildar Approval"
                timeline="Expected: 2-3 days"
                actions={[
                    { label: "View Details", action: () => handleViewDetails('123e4567-e89b-12d3-a456-426614174000') },
                    { label: "Contact", action: () => { } }
                ]}
            />

            <ProcessStatus
                // Use a valid UUID format to permit backend validation pass
                transferId="550e8400-e29b-41d4-a716-446655440000"
                status="PROCESS_DEBT"
                color="BLACK"
                icon="AlertTriangle"
                text="Multiple claimants detected"
                timeline="Escalated: 1 hour ago"
                actions={[
                    { label: "Escalate", action: () => handleEscalate('550e8400-e29b-41d4-a716-446655440000') }
                ]}
            />

            <ProcessStatus
                transferId="TRF-2025-0099"
                status="COMPLETED"
                color="GREEN"
                icon="CheckCircle2"
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
    card: { padding: 15, backgroundColor: Colors.card, borderRadius: 8, elevation: 2 },
    subtitle: { fontSize: 18, marginBottom: 10, fontWeight: '600' }
});
