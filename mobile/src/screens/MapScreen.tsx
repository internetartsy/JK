import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Modal } from 'react-native';
import { Button, Portal, Provider as PaperProvider } from 'react-native-paper';
import Map from '../components/Map';
import { getDB } from '../services/Database';
import OfflineMapManager from '../components/OfflineMapManager';

export default function MapScreen() {
    const [geojson, setGeojson] = useState<any>(null);
    const [offlineManagerVisible, setOfflineManagerVisible] = useState(false);

    useEffect(() => {
        loadParcels();
    }, []);

    const loadParcels = async () => {
        const db = getDB();
        const parcels = await db.getAllAsync('SELECT * FROM parcels');

        const features = parcels.map((p: any) => {
            // Mock geometry for demo (Lahore area) since we might not have real geom in sync data yet
            // In production, p.area_geom would be parsed
            const lat = 31.5204 + (Math.random() - 0.5) * 0.01;
            const lng = 74.3587 + (Math.random() - 0.5) * 0.01;

            const mockGeom = {
                type: 'Polygon',
                coordinates: [[
                    [lng, lat],
                    [lng + 0.001, lat],
                    [lng + 0.001, lat + 0.001],
                    [lng, lat + 0.001],
                    [lng, lat]
                ]]
            };

            return {
                type: 'Feature',
                properties: {
                    id: p.id,
                    khasra_number: p.khasra_number,
                    status: p.status
                },
                geometry: mockGeom
            };
        });

        setGeojson({
            type: 'FeatureCollection',
            features
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Parcel Map</Text>
                <Button
                    mode="text"
                    icon="download"
                    onPress={() => setOfflineManagerVisible(true)}
                    compact
                >
                    Offline Maps
                </Button>
            </View>

            <Map geojson={geojson} />

            <Modal
                visible={offlineManagerVisible}
                animationType="slide"
                onRequestClose={() => setOfflineManagerVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Button onPress={() => setOfflineManagerVisible(false)}>Close</Button>
                    </View>
                    <OfflineMapManager />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        elevation: 2,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        padding: 10,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        padding: 10,
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    }
});
