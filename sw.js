/**
 * ARK Pulse Drop — Service Worker v5.0
 * Offline-first caching strategy
 */
const CACHE_NAME = 'ark-pulse-drop-v6.2.0';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/shop.js',
    './js/leaderboard.js',
    './js/audio.js',
    './js/ads.js',
    './js/paypal-shop.js',
    './js/firebase-config.js',
    './js/firebase-sdk.min.js',
    './manifest.json',
    './icons/icon-48.png',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-120.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache new resources dynamically
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback for navigation
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});
