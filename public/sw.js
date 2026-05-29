const CACHE_NAME = 'campusvault-v2'

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// Install — pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, fall back to cache for pages
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and non-same-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip API routes — always go network
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful page navigations
        if (response.ok && request.destination === 'document') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // For page navigations, serve the root from cache
          if (request.destination === 'document') {
            return caches.match('/')
          }
        })
      })
  )
})

// ── WEB PUSH EVENT LISTENERS ───────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const { title, body, link, category, priority } = payload

    // Determine if this notification should persist until dismissed
    const isUrgent = priority === 'urgent' || priority === 'high'

    const options = {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        link: link || '/',
        category: category || 'general',
        priority: priority || 'normal',
      },
      // Group notifications by category so they don't flood
      tag: category || 'general',
      // Urgent/High priority notifications persist until dismissed
      requireInteraction: isUrgent,
      vibrate: isUrgent ? [200, 100, 200, 100, 200] : [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Campus Vault Alert', options)
    );
  } catch (err) {
    console.error('Error handling service worker push event:', err);
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetLink = event.notification.data?.link || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there is an open client tab, focus and navigate it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          try {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetLink);
            }
          } catch (e) {
            console.error('Failed to focus/navigate existing tab:', e);
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetLink);
      }
    })
  )
})
