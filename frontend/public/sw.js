self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  // Always fetch from network, never serve cached HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request))
    return
  }
  event.respondWith(fetch(event.request))
})