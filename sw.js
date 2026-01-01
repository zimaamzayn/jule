const CACHE_NAME = 'medflash-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/modules/db.js',
  '/modules/fsrs.js',
  '/modules/ui.js',
  '/modules/card-renderer.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
  'https://unpkg.com/dexie@4.0.8/dist/dexie.mjs',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first strategy for navigation and assets
  if (e.request.mode === 'navigate' || (e.request.destination === 'style' || e.request.destination === 'script')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else if (e.request.destination === 'image') {
    // Cache-first strategy for images
    e.respondWith(
      caches.match(e.request).then(response => {
        return response || fetch(e.request).then(fetchResponse => {
          const clonedResponse = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, clonedResponse);
          });
          return fetchResponse;
        });
      })
    );
  }
});