// Service Worker — casha l'app shell, i dati vengono gestiti da IndexedDB in JS
const CACHE = "ai-feed-v1"
const APP_SHELL = ["/", "/_next/static/css/app.css"]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url)

  // Richieste all'API backend: network-only (non casha, i dati vanno in IndexedDB)
  if (url.port === "8000") return

  // App shell: network-first con fallback cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
