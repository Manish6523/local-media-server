self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler to pass PWA installability requirements.
  // Don't intercept API requests, especially video streams which use Range requests
  // Firefox and Safari have issues with ServiceWorkers proxying Range requests
  if (event.request.url.includes('/api/')) {
    return; // Let the browser handle it natively
  }
  event.respondWith(fetch(event.request));
});
