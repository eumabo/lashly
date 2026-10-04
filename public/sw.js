const CACHE = 'lashly-shell-v2'
const STATIC = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).catch(() => undefined))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
  ]))
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/functions/')) return
  if (STATIC.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => undefined)
          return response
        })
        .catch(() => caches.match(event.request))
    )
  }
})

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  const title = data.title || 'Lashly'
  const options = {
    body: data.body || 'Você tem um lembrete de atendimento.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'lashly-reminder',
    renotify: true,
    data: { url: data.url || '/agenda' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/agenda'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if ('focus' in client) {
        client.navigate(url)
        return client.focus()
      }
    }
    return self.clients.openWindow(url)
  }))
})
