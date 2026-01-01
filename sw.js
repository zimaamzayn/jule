const CACHE_NAME = 'medflash-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
  'https://unpkg.com/dexie@4.0.8/dist/dexie.min.js',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(res => res || fetch(e.request))
      .catch(() => caches.match('/'))
  );
});