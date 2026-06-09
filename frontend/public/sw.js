self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => fetch('/index.html'))
    )
    return
  }
  event.respondWith(fetch(event.request))
})

self.addEventListener('message', event => {
  if (event.data === 'CHECK_AUTH') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage('REDIRECT_LOGIN'))
    })
  }
})