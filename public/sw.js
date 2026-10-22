// Service Worker for 100% In-Device Offline PWA Execution
// Caches application shell, dynamic Vite chunks, assets, and routes.
// Ensures shopkeepers can run the POS and Khata dashboard with zero internet connection.

const CACHE_NAME = 'inventory-blue-flow-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: pre-cache the essential application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate: purge stale cache versions and immediately take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: offline-first stale-while-revalidate strategy + navigation fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Handle SPA Navigation requests (e.g. /pos, /inventory, /khata, /auth)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful navigation responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached index.html so React Router renders the route offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return (await caches.match('/')) || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, fonts, images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Fetch from network in background to update cache (stale-while-revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Silently handle network errors when offline
          return cachedResponse;
        });

      // Return cached version if available immediately, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});