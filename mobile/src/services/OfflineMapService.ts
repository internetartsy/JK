import client from '../api/client';

// Mock for Expo Go
const MockMapLibreGL = {
    StyleURL: { Default: 'https://demotiles.maplibre.org/style.json' },
    offlineManager: {
        getPacks: async () => [],
        createPack: (options: any, progressListener: any) => {
            // fake progress for demo in Expo Go
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress > 100) {
                    clearInterval(interval);
                    progressListener(null, { percentage: 100, state: 2 }); // 2 = Complete
                } else {
                    progressListener(null, { percentage: progress, state: 1 }); // 1 = Active
                }
            }, 500);
        },
        deletePack: async () => { },
    },
    OfflinePackDownloadState: {
        Complete: 2
    }
};

let MapLibreGL: any = MockMapLibreGL;

try {
    // Conditional import to support Native vs Expo Go
    // In Expo Go, require will fail or return null, we catch it.
    // However, static import is what kills it. So we must use require inside try block if we want to support both.
    // Commenting out real require for Expo Go stability just like other services
    MapLibreGL = require('@maplibre/maplibre-react-native').default;
    console.log('Using real MapLibreGL offline manager');
} catch (e) {
    console.log('MapLibre Offline Manager not available, using mock.');
}

export interface TilePack {
    id: string;
    name: string;
    status: 'available' | 'downloading' | 'complete' | 'error';
    progress: number;
    size?: number;
    bounds?: [number, number, number, number];
    minZoom?: number;
    maxZoom?: number;
    styleUrl?: string;
}

class OfflineMapService {
    private progressListeners: ((pack: TilePack) => void)[] = [];

    async fetchAvailablePacks(district: string): Promise<TilePack[]> {
        try {
            const response = await client.get(`/geo/tiles/manifest/${district}`);
            const manifest = response.data;

            return manifest.packs.map((p: any) => ({
                id: p.id,
                name: `${manifest.district} (Offline Pack)`,
                status: 'available',
                progress: 0,
                size: p.size || 0,
                bounds: [74.2, 31.4, 74.5, 31.7],
                minZoom: 10,
                maxZoom: 14,
                styleUrl: p.styleUrl || MapLibreGL.StyleURL.Default
            }));
        } catch (error) {
            console.error('Failed to fetch tile manifest:', error);
            // Return mock data for demo if backend fails
            return [{
                id: 'demo-pack-1',
                name: 'Lahore Demo Pack',
                status: 'available',
                progress: 0,
                size: 50 * 1024 * 1024,
                bounds: [74.2, 31.4, 74.5, 31.7],
                minZoom: 10,
                maxZoom: 14,
                styleUrl: MapLibreGL.StyleURL.Default
            }];
        }
    }

    async getDownloadedPacks(): Promise<any[]> {
        try {
            const packs = await MapLibreGL.offlineManager.getPacks();
            console.log('Downloaded packs:', packs);
            return packs;
        } catch (error) {
            console.error('Error fetching downloaded packs:', error);
            return [];
        }
    }

    async downloadPack(pack: TilePack): Promise<void> {
        if (MapLibreGL === MockMapLibreGL) {
            console.log('Using Mock Offline Manager to simulate download...');
        }

        const flatBounds = pack.bounds || [74.2, 31.4, 74.5, 31.7];
        const bounds: [[number, number], [number, number]] = [
            [flatBounds[0], flatBounds[1]], // southwest
            [flatBounds[2], flatBounds[3]]  // northeast
        ];

        const options = {
            name: pack.id,
            styleURL: pack.styleUrl || MapLibreGL.StyleURL.Default,
            bounds: bounds,
            minZoom: pack.minZoom || 10,
            maxZoom: pack.maxZoom || 14,
            metadata: {
                id: pack.id,
                name: pack.name
            }
        };

        try {
            // Check if pack already exists
            const existingPacks = await MapLibreGL.offlineManager.getPacks();
            if (existingPacks.find((p: any) => p.name === pack.id)) {
                console.log('Pack already exists.');
                return;
            }

            // Start download
            MapLibreGL.offlineManager.createPack(
                options,
                (region: any, status: any) => {
                    // Progress callback
                    const progress = status.percentage;
                    const updatedPack: TilePack = {
                        ...pack,
                        status: status.state === MapLibreGL.OfflinePackDownloadState.Complete ? 'complete' : 'downloading',
                        progress: progress
                    };
                    this.notifyProgress(updatedPack);
                    console.log(`Download progress for ${pack.id}: ${progress}%`);
                },
                (region: any, err: any) => {
                    console.error('Offline pack download error:', err);
                    const errorPack: TilePack = { ...pack, status: 'error', progress: 0 };
                    this.notifyProgress(errorPack);
                }
            );
        } catch (error) {
            console.error('Failed to start download:', error);
            throw error;
        }
    }

    async deletePack(packId: string): Promise<void> {
        try {
            await MapLibreGL.offlineManager.deletePack(packId);
            console.log(`Deleted pack: ${packId}`);
        } catch (error) {
            console.error(`Failed to delete pack ${packId}:`, error);
        }
    }

    subscribeToProgress(callback: (pack: TilePack) => void) {
        this.progressListeners.push(callback);
        return () => {
            this.progressListeners = this.progressListeners.filter(cb => cb !== callback);
        };
    }

    private notifyProgress(pack: TilePack) {
        this.progressListeners.forEach(cb => cb(pack));
    }
}

export const offlineMapService = new OfflineMapService();
