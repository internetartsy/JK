import client from '../api/client';
import { getDB } from './Database';
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
            const db = getDB();

            // Transaction for atomic updates
            await db.withTransactionAsync(async () => {
                // Update Parcels - Check for conflicts
                for (const p of parcels) {
                    // Check if local record has pending changes
                    const localRecord = await db.getFirstAsync('SELECT sync_status FROM parcels WHERE id = ?', [p.id]);
                    if (localRecord && (localRecord as any).sync_status === 'pending') {
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

    async uploadImage(uri: string): Promise<string | null> {
        if (!uri) return null;
        try {
            const formData = new FormData();
            // Append file for React Native
            const filename = uri.split('/').pop() || 'image.jpg';
            // @ts-ignore: FormData expects Blob/File but RN supports object
            formData.append('file', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                type: 'image/jpeg',
                name: filename,
            });

            console.log('Uploading image...', filename);
            const response = await client.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log('Image uploaded:', response.data);
            return response.data.url;
        } catch (error) {
            console.error('Image Upload Failed:', error);
            return null;
        }
    },

    async push() {
        console.log('Starting Push Sync...');
        const db = getDB();

        // Get pending items
        const pendingParcels = await db.getAllAsync('SELECT * FROM parcels WHERE sync_status = ?', ['pending']);
        const pendingPersons = await db.getAllAsync('SELECT * FROM persons WHERE sync_status = ?', ['pending']);

        if (pendingParcels.length === 0 && pendingPersons.length === 0) {
            console.log('Nothing to push.');
            return;
        }

        // 1. Process Image Uploads for Parcels
        const parcelsToSync = await Promise.all(pendingParcels.map(async (p: any) => {
            let imageUrl = p.image_url;
            if (p.local_image_path && !p.image_url) {
                // Determine if we should upload (only if not already uploaded)
                const uploadedUrl = await this.uploadImage(p.local_image_path);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                    // Update local DB to avoid re-upload
                    await db.runAsync('UPDATE parcels SET image_url = ? WHERE id = ?', [imageUrl, p.id]);
                }
            }
            return {
                ...p,
                image_url: imageUrl,
                version: p.version || 1
            };
        }));

        const payload = {
            parcels: parcelsToSync,
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
    },

    // ==================== 3-Way Merge Conflict Resolution ====================

    async getConflicts() {
        /**
         * Get all local records marked as 'conflict' status
         */
        const db = getDB();
        const conflictParcels = await db.getAllAsync(
            'SELECT * FROM parcels WHERE sync_status = ?',
            ['conflict']
        );
        const conflictPersons = await db.getAllAsync(
            'SELECT * FROM persons WHERE sync_status = ?',
            ['conflict']
        );

        return {
            parcels: conflictParcels,
            persons: conflictPersons,
            total: conflictParcels.length + conflictPersons.length
        };
    },

    async checkConflict(entityType: string, entityId: string) {
        /**
         * Check for conflicts between local version and server version.
         * Returns a detailed diff report for the UI to display.
         */
        const db = getDB();

        // Get local version
        let localVersion;
        let baseVersion;

        if (entityType === 'parcel') {
            const local = await db.getFirstAsync(
                'SELECT * FROM parcels WHERE id = ?',
                [entityId]
            );
            if (!local) throw new Error('Local record not found');
            localVersion = local;

            // Base version would be the last synced state
            // For simplicity, we'll use version - 1 as base
            baseVersion = { ...(local as any), version: ((local as any).version || 1) - 1 };
        } else {
            const local = await db.getFirstAsync(
                'SELECT * FROM persons WHERE id = ?',
                [entityId]
            );
            if (!local) throw new Error('Local record not found');
            localVersion = local;
            baseVersion = { ...(local as any) };
        }

        // Call backend to get conflict report
        try {
            const response = await client.post('/sync/conflict/check', {
                entity_type: entityType,
                entity_id: entityId,
                base_version: baseVersion,
                local_version: localVersion
            });
            return response.data;
        } catch (error) {
            console.error('Conflict check failed:', error);
            throw error;
        }
    },

    async resolveConflict(
        entityType: string,
        entityId: string,
        conflictReport: any,
        resolutions: Record<string, any>
    ) {
        /**
         * Apply conflict resolution and sync the merged result.
         */
        try {
            // Send resolution to backend
            const response = await client.post('/sync/conflict/resolve', {
                entity_type: entityType,
                entity_id: entityId,
                conflict_report: conflictReport,
                resolutions: resolutions
            });

            if (response.data.status === 'resolved') {
                // Update local record to synced status
                const db = getDB();

                if (entityType === 'parcel') {
                    await db.runAsync(
                        'UPDATE parcels SET sync_status = ?, version = ? WHERE id = ?',
                        ['synced', response.data.merged_version, entityId]
                    );
                } else {
                    await db.runAsync(
                        'UPDATE persons SET sync_status = ? WHERE id = ?',
                        ['synced', entityId]
                    );
                }

                console.log(`Conflict resolved for ${entityType} ${entityId}`);
                return { success: true, ...response.data };
            }

            return { success: false, error: 'Resolution failed' };
        } catch (error) {
            console.error('Conflict resolution failed:', error);
            throw error;
        }
    },

    async useServerVersion(entityType: string, entityId: string) {
        /**
         * Quick resolution: Accept server version for all fields
         */
        const db = getDB();

        // Fetch server version via pull
        const lastSync = await this.getLastSyncTime();
        const since = lastSync || '2023-01-01T00:00:00';

        const response = await client.get(`/sync/changes?since=${since}`);
        const { parcels, persons } = response.data;

        if (entityType === 'parcel') {
            const serverRecord = parcels.find((p: any) => p.id === entityId);
            if (serverRecord) {
                await db.runAsync(
                    `UPDATE parcels SET 
                        village_id = ?, khasra_number = ?, area_text = ?, 
                        area_geom = ?, status = ?, version = ?, sync_status = ?
                    WHERE id = ?`,
                    [
                        serverRecord.village_id,
                        serverRecord.khasra_number,
                        serverRecord.area_text,
                        serverRecord.area_geom,
                        serverRecord.status,
                        serverRecord.version,
                        'synced',
                        entityId
                    ]
                );
            }
        } else {
            const serverRecord = persons.find((p: any) => p.id === entityId);
            if (serverRecord) {
                await db.runAsync(
                    `UPDATE persons SET 
                        name_urdu = ?, name_english = ?, confidence = ?, 
                        consent_flags = ?, sync_status = ?
                    WHERE id = ?`,
                    [
                        serverRecord.name_urdu,
                        serverRecord.name_english,
                        serverRecord.confidence,
                        JSON.stringify(serverRecord.consent_flags),
                        'synced',
                        entityId
                    ]
                );
            }
        }

        return { success: true };
    },

    async useLocalVersion(entityType: string, entityId: string) {
        /**
         * Quick resolution: Push local version to server (force overwrite)
         */
        const db = getDB();

        if (entityType === 'parcel') {
            const local = await db.getFirstAsync('SELECT * FROM parcels WHERE id = ?', [entityId]);
            if (local) {
                await client.post('/sync/batch', {
                    parcels: [local],
                    persons: []
                });
                await db.runAsync('UPDATE parcels SET sync_status = ? WHERE id = ?', ['synced', entityId]);
            }
        } else {
            const local = await db.getFirstAsync('SELECT * FROM persons WHERE id = ?', [entityId]);
            if (local) {
                await client.post('/sync/batch', {
                    parcels: [],
                    persons: [{
                        ...(local as any),
                        consent_flags: JSON.parse((local as any).consent_flags || '{}')
                    }]
                });
                await db.runAsync('UPDATE persons SET sync_status = ? WHERE id = ?', ['synced', entityId]);
            }
        }

        return { success: true };
    }
};
