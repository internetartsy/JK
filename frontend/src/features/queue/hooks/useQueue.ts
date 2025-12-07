import { useState, useCallback, useEffect } from 'react';
import { captureQueue } from '../CaptureQueue';
import type { CaptureItem, QueueStats } from '../CaptureQueue';

export interface UseQueueResult {
    items: CaptureItem[];
    stats: QueueStats;
    isLoading: boolean;
    error: string | null;
    addCapture: (capture: Omit<CaptureItem, 'id' | 'syncStatus' | 'syncAttempts' | 'capturedAt'>) => Promise<string>;
    updateCapture: (id: string, updates: Partial<CaptureItem>) => Promise<void>;
    deleteCapture: (id: string) => Promise<void>;
    getCapture: (id: string) => Promise<CaptureItem | undefined>;
    refresh: () => Promise<void>;
    clearSynced: () => Promise<number>;
    clearOld: (days: number) => Promise<number>;
}

export function useQueue(): UseQueueResult {
    const [items, setItems] = useState<CaptureItem[]>([]);
    const [stats, setStats] = useState<QueueStats>({
        total: 0,
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [allItems, queueStats] = await Promise.all([
                captureQueue.getAll(),
                captureQueue.getStats(),
            ]);

            setItems(allItems);
            setStats(queueStats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load queue');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const addCapture = useCallback(async (
        capture: Omit<CaptureItem, 'id' | 'syncStatus' | 'syncAttempts' | 'capturedAt'>
    ): Promise<string> => {
        const id = await captureQueue.add(capture);
        await refresh();
        return id;
    }, [refresh]);

    const updateCapture = useCallback(async (
        id: string,
        updates: Partial<CaptureItem>
    ): Promise<void> => {
        await captureQueue.update(id, updates);
        await refresh();
    }, [refresh]);

    const deleteCapture = useCallback(async (id: string): Promise<void> => {
        await captureQueue.delete(id);
        await refresh();
    }, [refresh]);

    const getCapture = useCallback(async (id: string): Promise<CaptureItem | undefined> => {
        return captureQueue.get(id);
    }, []);

    const clearSynced = useCallback(async (): Promise<number> => {
        const count = await captureQueue.deleteSynced();
        await refresh();
        return count;
    }, [refresh]);

    const clearOld = useCallback(async (days: number): Promise<number> => {
        const count = await captureQueue.deleteOlderThan(days);
        await refresh();
        return count;
    }, [refresh]);

    return {
        items,
        stats,
        isLoading,
        error,
        addCapture,
        updateCapture,
        deleteCapture,
        getCapture,
        refresh,
        clearSynced,
        clearOld,
    };
}

export default useQueue;
