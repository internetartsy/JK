import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { SyncService } from './SyncService';

/**
 * Service to handle background synchronization logic.
 * Triggers regular syncs when online and listens for connectivity changes.
 */
class BackgroundSyncService {
    private isSyncing: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private unsubscribeNetInfo: (() => void) | null = null;

    // Config
    private SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    /**
     * Start the background sync service
     */
    public start() {
        console.log('[BackgroundSync] Service started');

        // 1. Initial Sync (if online)
        this.checkAndSync();

        // 2. Listen for connectivity changes
        this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
            if (state.isConnected && state.isInternetReachable) {
                console.log('[BackgroundSync] Connection restored. Triggering sync.');
                this.checkAndSync();
            }
        });

        // 3. Periodic Sync
        this.intervalId = setInterval(() => {
            console.log('[BackgroundSync] Periodic sync triggered.');
            this.checkAndSync();
        }, this.SYNC_INTERVAL_MS);
    }

    /**
     * Stop the service (cleanup)
     */
    public stop() {
        console.log('[BackgroundSync] Service stopped');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.unsubscribeNetInfo) {
            this.unsubscribeNetInfo();
            this.unsubscribeNetInfo = null;
        }
    }

    /**
     * Check connectivity and run sync if safe
     */
    private async checkAndSync() {
        if (this.isSyncing) {
            console.log('[BackgroundSync] Sync already in progress. Skipping.');
            return;
        }

        const state = await NetInfo.fetch();
        if (!state.isConnected) {
            console.log('[BackgroundSync] Offline. Skipping sync.');
            return;
        }

        this.triggerSync();
    }

    /**
     * Internal method to execute the sync
     */
    private async triggerSync() {
        this.isSyncing = true;
        try {
            await SyncService.sync();
            console.log('[BackgroundSync] Sync completed successfully.');
        } catch (error) {
            console.error('[BackgroundSync] Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }
}

export const backgroundSyncService = new BackgroundSyncService();
