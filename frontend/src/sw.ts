/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
    StaleWhileRevalidate,
    NetworkFirst,
    CacheFirst
} from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAME = 'optionlist-cache-v1';
const API_CACHE = 'api-cache-v1';
const TILES_CACHE = 'tiles-cache-v1';

// Precache static assets (will be populated at build time)
precacheAndRoute(self.__WB_MANIFEST || []);

// Clean up old caches
cleanupOutdatedCaches();

// Background sync for upload queue
const bgSyncPlugin = new BackgroundSyncPlugin('uploadQueue', {
    maxRetentionTime: 24 * 60, // Retry for max of 24 hours (in minutes)
    onSync: async ({ queue }) => {
        let entry;
        while ((entry = await queue.shiftRequest())) {
            try {
                await fetch(entry.request);
                console.log('[SW] Background sync: Successfully uploaded', entry.request.url);
            } catch (error) {
                console.error('[SW] Background sync failed:', error);
                await queue.unshiftRequest(entry);
                throw error;
            }
        }
    },
});

// Cache strategy for static assets (CSS, JS, images)
registerRoute(
    ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image',
    new StaleWhileRevalidate({
        cacheName: CACHE_NAME,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            }),
        ],
    })
);

// Cache strategy for API calls (network first with offline fallback)
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({
        cacheName: API_CACHE,
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
        ],
    })
);

// Cache strategy for map tiles (cache first for offline use)
registerRoute(
    ({ url }) =>
        url.hostname.includes('tiles') ||
        url.pathname.includes('/tiles/'),
    new CacheFirst({
        cacheName: TILES_CACHE,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            }),
        ],
    })
);

// Handle POST requests to /api/v1/captures with background sync
registerRoute(
    ({ url, request }) =>
        url.pathname.startsWith('/api/v1/captures') &&
        request.method === 'POST',
    new NetworkFirst({
        cacheName: 'capture-uploads',
        plugins: [bgSyncPlugin],
    }),
    'POST'
);

// Navigation routes - serve index.html for all navigation requests
const navigationHandler = new NavigationRoute(
    async ({ request }) => {
        try {
            // Try network first
            return await fetch(request);
        } catch (error) {
            // Fall back to cached index.html for offline
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match('/index.html');
            if (cachedResponse) {
                return cachedResponse;
            }
            // Return an offline page if nothing cached
            return new Response(
                `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OptionList - Offline</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #e2e8f0;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { color: #0ea5e9; }
            p { opacity: 0.8; }
            button {
              margin-top: 1rem;
              padding: 0.75rem 1.5rem;
              background: #0ea5e9;
              color: white;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #0284c7; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📡 Offline Mode</h1>
            <p>You're currently offline. Your captured documents are saved locally and will sync when you're back online.</p>
            <button onclick="location.reload()">Try Again</button>
          </div>
        </body>
        </html>`,
                { headers: { 'Content-Type': 'text/html' } }
            );
        }
    }
);
registerRoute(navigationHandler);

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        });
    }
});

// Handle service worker installation
self.addEventListener('install', (_event) => {
    console.log('[SW] Service Worker installing...');
    // Force the waiting service worker to become active
    self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activating...');
    // Take control of all pages immediately
    event.waitUntil(self.clients.claim());
});

// Handle background sync
self.addEventListener('sync', (event: ExtendableEvent & { tag: string }) => {
    if (event.tag === 'uploadQueue') {
        console.log('[SW] Background sync triggered for uploadQueue');
        event.waitUntil(Promise.resolve());
    }
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const title = data.title || 'OptionList';
        const options = {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: data.data,
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.notification.data?.url) {
        event.waitUntil(self.clients.openWindow(event.notification.data.url));
    }
});

export { };
