import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar, IconButton, List, Surface } from 'react-native-paper';
import { offlineMapService, TilePack } from '../services/OfflineMapService';

export default function OfflineMapManager() {
    const [availablePacks, setAvailablePacks] = useState<TilePack[]>([]);
    const [downloadedPacks, setDownloadedPacks] = useState<any[]>([]); // MapLibre packs
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPacks();

        // Subscribe to progress updates
        const unsubscribe = offlineMapService.subscribeToProgress((updatedPack) => {
            setAvailablePacks(current =>
                current.map(p => p.id === updatedPack.id ? updatedPack : p)
            );

            if (updatedPack.status === 'complete') {
                refreshDownloadedList();
            }
        });

        return () => unsubscribe();
    }, []);

    const loadPacks = async () => {
        setLoading(true);
        // hardcoded district for demo
        const onlinePacks = await offlineMapService.fetchAvailablePacks('lahore');
        setAvailablePacks(onlinePacks);

        await refreshDownloadedList();
        setLoading(false);
    };

    const refreshDownloadedList = async () => {
        const localPacks = await offlineMapService.getDownloadedPacks();
        setDownloadedPacks(localPacks || []);
    };

    const handleDownload = (pack: TilePack) => {
        offlineMapService.downloadPack(pack);
        // Optimistic update
        setAvailablePacks(current =>
            current.map(p => p.id === pack.id ? { ...p, status: 'downloading', progress: 0 } : p)
        );
    };

    const handleDelete = async (packId: string) => {
        await offlineMapService.deletePack(packId);
        await refreshDownloadedList();
        // Reset status in available list
        setAvailablePacks(current =>
            current.map(p => p.id === packId ? { ...p, status: 'available', progress: 0 } : p)
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Title style={styles.header}>Offline Maps</Title>

            <Surface style={styles.section}>
                <Title style={styles.sectionTitle}>Available Regions</Title>
                {availablePacks.map(pack => (
                    <Card key={pack.id} style={styles.card}>
                        <Card.Content>
                            <View style={styles.row}>
                                <View style={styles.info}>
                                    <Title>{pack.name}</Title>
                                    <Paragraph>Size: {((pack.size || 0) / 1024 / 1024).toFixed(1)} MB</Paragraph>
                                </View>
                                <View style={styles.actions}>
                                    {pack.status === 'available' && (
                                        <Button mode="contained" onPress={() => handleDownload(pack)}>Download</Button>
                                    )}
                                    {pack.status === 'downloading' && (
                                        <Button mode="outlined" disabled>Downloading...</Button>
                                    )}
                                    {pack.status === 'complete' && (
                                        <Button mode="outlined" icon="check" disabled>Saved</Button>
                                    )}
                                </View>
                            </View>
                            {pack.status === 'downloading' && (
                                <ProgressBar progress={pack.progress / 100} style={styles.progress} />
                            )}
                        </Card.Content>
                    </Card>
                ))}
            </Surface>

            <Surface style={styles.section}>
                <Title style={styles.sectionTitle}>Downloaded on Device</Title>
                {downloadedPacks.length === 0 ? (
                    <Paragraph style={styles.emptyText}>No offline maps saved.</Paragraph>
                ) : (
                    downloadedPacks.map((pack, index) => {
                        let packName = pack.name;
                        try {
                            const metadata = typeof pack.metadata === 'string' ? JSON.parse(pack.metadata) : pack.metadata;
                            if (metadata && metadata.name) packName = metadata.name;
                        } catch (e) {
                            // Keep default name
                        }
                        return (
                            <List.Item
                                key={pack.name || index}
                                title={packName}
                                description={`Status: ${pack.status || 'Active'}`} // Pack object structure varies by version
                                left={props => <List.Icon {...props} icon="map-marker-check" />}
                                right={props => (
                                    <IconButton
                                        {...props}
                                        icon="delete"
                                        onPress={() => handleDelete(pack.name)}
                                    />
                                )}
                            />
                        );
                    })
                )}
            </Surface>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
    },
    header: {
        fontSize: 24,
        marginBottom: 16,
    },
    section: {
        padding: 10,
        marginBottom: 20,
        borderRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    card: {
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    actions: {
        marginLeft: 10,
    },
    progress: {
        marginTop: 10,
        height: 8,
        borderRadius: 4,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#666',
    },
});
