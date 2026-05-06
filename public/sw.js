const CACHE_NAME = 'campusvault-v1'

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
