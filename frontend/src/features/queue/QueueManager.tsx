import { useState, useEffect } from 'react';
import {
    Cloud, CloudOff, Check, AlertCircle, Clock, Trash2,
    RefreshCw, Download, Eye, ChevronRight, HardDrive
} from 'lucide-react';
import { useQueue } from './hooks/useQueue';
import type { CaptureItem } from './CaptureQueue';

interface QueueItemProps {
    item: CaptureItem;
    onView: (item: CaptureItem) => void;
    onDelete: (id: string) => void;
    onRetry: (id: string) => void;
}

function QueueItem({ item, onView, onDelete, onRetry }: QueueItemProps) {
    const statusConfig = {
        pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        syncing: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        synced: { icon: Check, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    };

    const status = statusConfig[item.syncStatus];
    const StatusIcon = status.icon;

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <div className={`${status.bg} rounded-xl p-4 mb-3 transition-all hover:shadow-md`}>
            <div className="flex items-start gap-4">
                {/* Preview thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary-200 dark:bg-secondary-700 flex-shrink-0">
                    {item.previewUrl ? (
                        <img
                            src={item.previewUrl}
                            alt="Capture preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary-400">
                            <Eye className="w-6 h-6" />
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-secondary-900 dark:text-secondary-100 capitalize">
                            {item.documentType}
                        </span>
                        <StatusIcon className={`w-4 h-4 ${status.color} ${item.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    </div>

                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {formatDate(item.capturedAt)}
                    </p>

                    {item.ocrResult && (
                        <p className="text-xs text-secondary-400 mt-1 truncate">
                            {item.ocrResult.text.substring(0, 50)}...
                        </p>
                    )}

                    {item.syncError && (
                        <p className="text-xs text-red-500 mt-1">
                            Error: {item.syncError}
                        </p>
                    )}

                    {/* Quality score */}
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${item.qualityScore > 0.7 ? 'bg-green-500' :
                                    item.qualityScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${item.qualityScore * 100}%` }}
                            />
                        </div>
                        <span className="text-xs text-secondary-500">
                            {Math.round(item.qualityScore * 100)}%
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onView(item)}
                        className="p-2 text-secondary-500 hover:text-primary-500 hover:bg-white dark:hover:bg-secondary-700 rounded-lg transition-colors"
                        title="View details"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {item.syncStatus === 'failed' && (
                        <button
                            onClick={() => onRetry(item.id)}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Retry sync"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}

                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface QueueManagerProps {
    onViewItem?: (item: CaptureItem) => void;
}

export function QueueManager({ onViewItem }: QueueManagerProps) {
    const {
        items,
        stats,
        isLoading,
        error,
        deleteCapture,
        refresh,
        clearSynced,
    } = useQueue();

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleRetry = async (id: string) => {
        // TODO: Implement retry logic via sync service
        console.log('Retrying sync for', id);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this capture? This cannot be undone.')) {
            await deleteCapture(id);
        }
    };

    const handleClearSynced = async () => {
        if (confirm('Remove all synced captures from local storage?')) {
            const count = await clearSynced();
            alert(`Cleared ${count} synced captures`);
        }
    };

    const handleExport = async () => {
        // TODO: Implement export
        console.log('Exporting queue...');
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                        Upload Queue
                    </h2>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {stats.total} captures • {stats.pending} pending
                    </p>
                </div>

                {/* Online status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isOnline
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                    {isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                    <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70">Pending</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.syncing}</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Syncing</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.synced}</p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70">Synced</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Failed</p>
                </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={refresh}
                    className="btn btn-secondary text-sm flex items-center gap-2"
                    disabled={isLoading}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>

                <button
                    onClick={() => {
                        // Mock sync trigger
                        alert('Triggering agristack.queue.sync');
                    }}
                    className="btn btn-primary text-sm flex items-center gap-2"
                    disabled={isLoading || stats.pending === 0}
                >
                    <RefreshCw className="w-4 h-4" />
                    Sync Now
                </button>

                {stats.synced > 0 && (
                    <button
                        onClick={handleClearSynced}
                        className="btn btn-secondary text-sm flex items-center gap-2"
                    >
                        <HardDrive className="w-4 h-4" />
                        Clear Synced
                    </button>
                )}

                <button
                    onClick={handleExport}
                    className="btn btn-secondary text-sm flex items-center gap-2 ml-auto"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl p-4 mb-4">
                    <p className="font-medium">Error loading queue</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-secondary-400">
                        <Cloud className="w-12 h-12 mb-3" />
                        <p className="font-medium">Queue is empty</p>
                        <p className="text-sm">Captured documents will appear here</p>
                    </div>
                ) : (
                    items.map(item => (
                        <QueueItem
                            key={item.id}
                            item={item}
                            onView={(i) => onViewItem?.(i)}
                            onDelete={handleDelete}
                            onRetry={handleRetry}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default QueueManager;
