/**
 * Capture Queue - IndexedDB-backed local storage for captures
 */

import { get, set, del, keys, createStore } from 'idb-keyval';
import type { UseStore } from 'idb-keyval';

export interface CaptureItem {
    id: string;
    imageBlob: Blob;
    previewUrl?: string;
    documentType: 'khasra' | 'girdawari' | 'general';
    ocrResult?: {
        text: string;
        confidence: number;
        languages: string[];
    };
    extractedFields?: Record<string, unknown>;
    qualityScore: number;
    issues: string[];
    location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
    };
    consentTimestamp?: Date;
    capturedAt: Date;
    syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
    syncError?: string;
    syncAttempts: number;
    lastSyncAttempt?: Date;
}

export interface QueueStats {
    total: number;
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
}

class CaptureQueue {
    private store: UseStore;
    private metaStore: UseStore;

    constructor() {
        this.store = createStore('optionlist-captures', 'captures');
        this.metaStore = createStore('optionlist-meta', 'meta');
    }

    /**
     * Generate a unique ID for a capture
     */
    private generateId(): string {
        return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a new capture to the queue
     */
    async add(capture: Omit<CaptureItem, 'id' | 'syncStatus' | 'syncAttempts' | 'capturedAt'>): Promise<string> {
        const id = this.generateId();

        const item: CaptureItem = {
            ...capture,
            id,
            capturedAt: new Date(),
            syncStatus: 'pending',
            syncAttempts: 0,
        };

        await set(id, item, this.store);

        // Update stats
        await this.updateStats();

        return id;
    }

    /**
     * Get a capture by ID
     */
    async get(id: string): Promise<CaptureItem | undefined> {
        return get<CaptureItem>(id, this.store);
    }

    /**
     * Get all captures
     */
    async getAll(): Promise<CaptureItem[]> {
        const allKeys = await keys<string>(this.store);
        const items: CaptureItem[] = [];

        for (const key of allKeys) {
            const item = await get<CaptureItem>(key, this.store);
            if (item) {
                items.push(item);
            }
        }

        // Sort by capture date (newest first)
        return items.sort((a, b) =>
            new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
        );
    }

    /**
     * Get pending captures (not yet synced)
     */
    async getPending(): Promise<CaptureItem[]> {
        const all = await this.getAll();
        return all.filter(item => item.syncStatus === 'pending' || item.syncStatus === 'failed');
    }

    /**
     * Update a capture
     */
    async update(id: string, updates: Partial<CaptureItem>): Promise<void> {
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Capture ${id} not found`);
        }

        await set(id, { ...existing, ...updates }, this.store);
        await this.updateStats();
    }

    /**
     * Update OCR result for a capture
     */
    async updateOCRResult(
        id: string,
        ocrResult: CaptureItem['ocrResult']
    ): Promise<void> {
        await this.update(id, { ocrResult });
    }

    /**
     * Update extracted fields for a capture
     */
    async updateExtractedFields(
        id: string,
        extractedFields: Record<string, unknown>
    ): Promise<void> {
        await this.update(id, { extractedFields });
    }

    /**
     * Mark a capture as syncing
     */
    async markSyncing(id: string): Promise<void> {
        await this.update(id, {
            syncStatus: 'syncing',
            lastSyncAttempt: new Date(),
        });
    }

    /**
     * Mark a capture as synced successfully
     */
    async markSynced(id: string): Promise<void> {
        await this.update(id, {
            syncStatus: 'synced',
            syncError: undefined,
        });
    }

    /**
     * Mark a capture as failed
     */
    async markFailed(id: string, error: string): Promise<void> {
        const existing = await this.get(id);
        if (!existing) return;

        await this.update(id, {
            syncStatus: 'failed',
            syncError: error,
            syncAttempts: existing.syncAttempts + 1,
        });
    }

    /**
     * Delete a capture
     */
    async delete(id: string): Promise<void> {
        await del(id, this.store);
        await this.updateStats();
    }

    /**
     * Delete all synced captures
     */
    async deleteSynced(): Promise<number> {
        const all = await this.getAll();
        const synced = all.filter(item => item.syncStatus === 'synced');

        for (const item of synced) {
            await del(item.id, this.store);
        }

        await this.updateStats();
        return synced.length;
    }

    /**
     * Delete captures older than specified days
     */
    async deleteOlderThan(days: number): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const all = await this.getAll();
        const old = all.filter(item =>
            new Date(item.capturedAt) < cutoff && item.syncStatus === 'synced'
        );

        for (const item of old) {
            await del(item.id, this.store);
        }

        await this.updateStats();
        return old.length;
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<QueueStats> {
        const cached = await get<QueueStats>('stats', this.metaStore);
        if (cached) {
            return cached;
        }
        return this.updateStats();
    }

    /**
     * Update and return queue statistics
     */
    private async updateStats(): Promise<QueueStats> {
        const all = await this.getAll();

        const stats: QueueStats = {
            total: all.length,
            pending: all.filter(i => i.syncStatus === 'pending').length,
            syncing: all.filter(i => i.syncStatus === 'syncing').length,
            synced: all.filter(i => i.syncStatus === 'synced').length,
            failed: all.filter(i => i.syncStatus === 'failed').length,
        };

        await set('stats', stats, this.metaStore);
        return stats;
    }

    /**
     * Get storage usage estimate
     */
    async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0,
                percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
            };
        }
        return { used: 0, quota: 0, percentage: 0 };
    }

    /**
     * Clear all data (use with caution!)
     */
    async clear(): Promise<void> {
        const allKeys = await keys(this.store);
        for (const key of allKeys) {
            await del(key, this.store);
        }
        await this.updateStats();
    }

    /**
     * Export queue as JSON (for backup)
     */
    async exportAsJSON(): Promise<string> {
        const all = await this.getAll();

        // Convert blobs to base64 for export
        const exportData = await Promise.all(
            all.map(async (item) => {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(item.imageBlob);
                });

                return {
                    ...item,
                    imageBlob: base64,
                };
            })
        );

        return JSON.stringify(exportData, null, 2);
    }
}

// Export singleton instance
export const captureQueue = new CaptureQueue();
export default captureQueue;
