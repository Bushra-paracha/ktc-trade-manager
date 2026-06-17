// KTC Trade Manager — Service Worker
// Provides basic offline caching so the app shell loads even with
// a flaky connection, and enables "Add to Home Screen" installability.

const CACHE_NAME = 'ktc-trade-manager-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first strategy: always try the network first (since this app
// is data-heavy and live data matters), falling back to cache only when
// offline. This avoids showing stale CRM/order data when online.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests; let POST/PUT/DELETE (API writes) pass through untouched.
  if (event.request.method !== 'GET') return;

  // Don't cache Supabase API calls or external resources — only the app shell itself.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
