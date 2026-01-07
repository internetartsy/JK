import { View, Text, StyleSheet, Button, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../styles/colors';
import { FarmerIDCard } from '../../components/FarmerIDCard';
import { CheckCircle2, Clock, Landmark, ArrowRight, Share2 } from 'lucide-react-native';

export default function FarmerDashboard({ navigation }: any) {
    const handleLogout = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Farmer Dashboard</Text>
                    <Text style={styles.subtitle}>Welcome back, Ghulam Ahmed</Text>
                </View>
                <TouchableOpacity style={styles.shareBtn}>
                    <Share2 color={Colors.primary} size={20} />
                </TouchableOpacity>
            </View>

            {/* Digital ID Card Section */}
            <Text style={styles.sectionTitle}>Digital Agri-Identity</Text>
            <FarmerIDCard
                farmerName="Ghulam Ahmed"
                farmerId="JK-F-9025-1102"
                issuanceDate="Oct 12, 2025"
                totalLand="2.45 Hectares"
            />

            {/* AgriStack Transmission Status */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Landmark color={Colors.primary} size={20} />
                    <Text style={styles.cardTitle}>AgriStack Registry Status</Text>
                </View>

                <View style={styles.transmissionStep}>
                    <CheckCircle2 color="green" size={18} />
                    <Text style={styles.stepText}>Land Parcel Digitized (ULPIN: 1402...)</Text>
                </View>
                <View style={styles.transmissionStep}>
                    <CheckCircle2 color="green" size={18} />
                    <Text style={styles.stepText}>Aadhaar e-KYC Verified</Text>
                </View>
                <View style={styles.transmissionStep}>
                    <Clock color="#f39c12" size={18} />
                    <Text style={styles.stepTextActive}>National Data Bucket Transmission In-Progress</Text>
                </View>

                <TouchableOpacity style={styles.detailsBtn}>
                    <Text style={styles.detailsBtnText}>View Full Audit Trail</Text>
                    <ArrowRight color={Colors.primary} size={14} />
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Services</Text>
                <View style={styles.btnGrid}>
                    <TouchableOpacity style={styles.gridBtn}>
                        <Text style={styles.gridBtnText}>PM Kisan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridBtn}>
                        <Text style={styles.gridBtnText}>Fertilizer Subsidy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridBtn}>
                        <Text style={styles.gridBtnText}>Insurance Claim</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ marginTop: 20 }}>
                <Button title="Logout" onPress={handleLogout} color="red" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: Colors.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
    subtitle: { fontSize: 14, color: '#666' },
    shareBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#444' },
    card: { padding: 15, backgroundColor: 'white', borderRadius: 12, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 10, color: '#333' },
    transmissionStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    stepText: { fontSize: 13, marginLeft: 10, color: '#666' },
    stepTextActive: { fontSize: 13, marginLeft: 10, color: '#f39c12', fontWeight: '600' },
    detailsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
    detailsBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginRight: 5 },
    btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    gridBtn: { backgroundColor: '#f0f7f0', padding: 12, borderRadius: 8, flex: 1, minWidth: '45%', alignItems: 'center' },
    gridBtnText: { color: '#2d6a4f', fontSize: 12, fontWeight: '600' }
});
