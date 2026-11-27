// INBR Service Worker for PWA Offline Caching & Instant Republish Updates
const CACHE_NAME = 'inbr-cache-v2';
const STATIC_ASSETS = [
  '/logo-inbr.jpg',
  '/manifest.json'
];

// Install: Cache critical static assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW Precache non-critical item failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions immediately
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
    })
  );
  self.clients.claim();
});

// Fetch: Always go straight to network for API/Supabase & HTML navigations so live edits show immediately
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-GET requests or non-HTTP URLs
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  // Never intercept or serve stale data for API routes or Supabase calls
  if (req.url.includes('supabase.co') || req.url.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for HTML navigations (index.html, '/') so republished versions load immediately
  const isNavigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Stale-while-revalidate for static hashed assets / images
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
