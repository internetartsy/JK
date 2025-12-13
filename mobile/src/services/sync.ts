import client from '../api/client';
import { getDB } from './storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';

export const SyncService = {
    async getLastSyncTime(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(SYNC_TIMESTAMP_KEY);
        }
        return await SecureStore.getItemAsync(SYNC_TIMESTAMP_KEY);
    },

    async setLastSyncTime(timestamp: string) {
        if (Platform.OS === 'web') {
            localStorage.setItem(SYNC_TIMESTAMP_KEY, timestamp);
            return;
        }
        await SecureStore.setItemAsync(SYNC_TIMESTAMP_KEY, timestamp);
    },

    async pull() {
        console.log('Starting Pull Sync...');
        const lastSync = await this.getLastSyncTime();
        // Default to a long time ago if no sync yet
        const since = lastSync || '2023-01-01T00:00:00';

        try {
            const response = await client.get(`/sync/changes?since=${since}`);
            const { parcels, persons } = response.data;
            const db = await getDB();

            // Transaction for atomic updates
            await db.withTransactionAsync(async () => {
                // Update Parcels - Check for conflicts
                for (const p of parcels) {
                    // Check if local record has pending changes using new API
                    const localRecord = await db.getFirstAsync<{ sync_status: string }>('SELECT sync_status FROM parcels WHERE id = ?', [p.id]);

                    if (localRecord && localRecord.sync_status === 'pending') {
                        // CONFLICT: Local pending change vs Server change
                        // Mark as conflict instead of overwriting
                        await db.runAsync('UPDATE parcels SET sync_status = ? WHERE id = ?', ['conflict', p.id]);
                        console.warn(`Conflict detected for parcel ${p.id}`);
                        continue;
                    }

                    await db.runAsync(
                        `INSERT OR REPLACE INTO parcels (id, village_id, khasra_number, area_text, area_geom, status, version, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                        [p.id, p.village_id, p.khasra_number, p.area_text, p.area_geom, p.status, p.version, p.updated_at]
                    );
                }

                // Update Persons
                for (const p of persons) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO persons (id, name_urdu, name_english, confidence, consent_flags, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, 'synced')`,
                        [p.id, p.name_urdu, p.name_english, p.confidence, JSON.stringify(p.consent_flags), p.updated_at]
                    );
                }
            });

            // Update timestamp (use server time from response header if available, or current time)
            // Ideally backend returns a "synced_at" cursor. For now, use ISO string.
            await this.setLastSyncTime(new Date().toISOString());
            console.log(`Pulled ${parcels.length} parcels and ${persons.length} persons.`);
            return { parcels: parcels.length, persons: persons.length };

        } catch (error) {
            console.error('Pull Sync Failed:', error);
            throw error;
        }
    },

    async push() {
        console.log('Starting Push Sync...');
        const db = await getDB();

        // Get pending items
        const pendingParcels = await db.getAllAsync<{ id: string, image_url: string | null, local_image_path: string | null, version: number }>('SELECT * FROM parcels WHERE sync_status = ?', ['pending']);
        const pendingPersons = await db.getAllAsync('SELECT * FROM persons WHERE sync_status = ?', ['pending']);

        if (pendingParcels.length === 0 && pendingPersons.length === 0) {
            console.log('Nothing to push.');
            return;
        }

        // 1. Process Image Uploads for Parcels (if we were uploading directly to MinIO, but here we likely rely on sync/batch to handle small data, or separate file upload endpoint)
        // For now, let's assume images are uploaded via OCRService separately and we just sync metadata.

        const payload = {
            parcels: pendingParcels,
            persons: pendingPersons.map((p: any) => ({
                ...p,
                consent_flags: JSON.parse(p.consent_flags || '{}')
            }))
        };

        try {
            const response = await client.post('/sync/batch', payload);
            const { synced_parcels, synced_persons, errors } = response.data;

            if (errors.length > 0) {
                console.warn('Sync Errors:', errors);
                // TODO: Mark these as 'conflict' or 'error' in DB
            }

            await db.withTransactionAsync(async () => {
                // Mark successful uploads as synced
                for (const id of synced_parcels) {
                    await db.runAsync('UPDATE parcels SET sync_status = ? WHERE id = ?', ['synced', id]);
                }
                for (const id of synced_persons) {
                    await db.runAsync('UPDATE persons SET sync_status = ? WHERE id = ?', ['synced', id]);
                }
            });

            console.log('Push Sync Completed.');
            return { pushed_parcels: synced_parcels.length, pushed_persons: synced_persons.length, errors };

        } catch (error) {
            console.error('Push Sync Failed:', error);
            throw error;
        }
    },

    async sync() {
        await this.push();
        await this.pull();
    }
};
