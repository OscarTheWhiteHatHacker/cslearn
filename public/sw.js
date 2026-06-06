const CACHE_NAME = 'cslearn-v1'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
]

// Install: precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
})

// Fetch: network-first strategy for pages
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip non-HTTP(S) requests
  const { protocol } = new URL(event.request.url)
  if (protocol !== 'http:' && protocol !== 'https:') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        const cacheCopy = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cacheCopy)
        })
        return response
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 })
        })
      })
  )
})
