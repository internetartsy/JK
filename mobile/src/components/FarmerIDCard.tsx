import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Colors } from '../styles/colors';
import { ShieldCheck, MapPin, Calendar, QrCode } from 'lucide-react-native';

interface FarmerIDCardProps {
    farmerName: string;
    farmerId: string;
    issuanceDate: string;
    totalLand: string;
    photoUri?: string;
}

const { width } = Dimensions.get('window');

export const FarmerIDCard: React.FC<FarmerIDCardProps> = ({
    farmerName,
    farmerId,
    issuanceDate,
    totalLand,
    photoUri
}) => {
    return (
        <View style={styles.cardContainer}>
            {/* Header / Brand */}
            <View style={styles.header}>
                <View style={styles.govLogo}>
                    <ShieldCheck color="white" size={24} />
                    <Text style={styles.govText}>J&K Govt AgriStack</Text>
                </View>
                <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>OFFICIAL ID</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Photo */}
                <View style={styles.photoContainer}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photo} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                style={styles.photo}
                            />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{farmerName}</Text>
                    <Text style={styles.farmerIdText}>ID: {farmerId}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <MapPin size={12} color="#666" />
                            <Text style={styles.statText}>{totalLand}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Calendar size={12} color="#666" />
                            <Text style={styles.statText}>{issuanceDate}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Footer / QR / Verify */}
            <View style={styles.footer}>
                <View style={styles.qrPlaceholder}>
                    <QrCode color="#333" size={40} />
                    <Text style={styles.qrText}>SCAN TO VERIFY</Text>
                </View>
                <View style={styles.verifiedStamp}>
                    <ShieldCheck color="green" size={16} />
                    <Text style={styles.verifiedText}>BIOMETRIC VERIFIED</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: width - 40,
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 20,
    },
    header: {
        backgroundColor: '#1a4a1a', // Dark forest green
        paddingVertical: 10,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    govLogo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    govText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
    idBadge: {
        backgroundColor: '#ffd700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    idBadgeText: {
        fontSize: 10,
        fontWeight: 'black',
        color: '#000',
    },
    mainContent: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
    },
    photoContainer: {
        width: 80,
        height: 100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        overflow: 'hidden',
        backgroundColor: '#f9f9f9',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    farmerIdText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 15,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 4,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fafafa',
    },
    qrPlaceholder: {
        alignItems: 'center',
    },
    qrText: {
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 2,
        color: '#333',
    },
    verifiedStamp: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'green',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    verifiedText: {
        color: 'green',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    }
});
