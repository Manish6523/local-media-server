self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler to pass PWA installability requirements.
  // It simply forwards all requests to the network.
  event.respondWith(fetch(event.request));
});
