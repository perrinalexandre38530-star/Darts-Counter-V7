
// ============================================
// serviceWorker PATCH
// protection cache PWA Android
// ============================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    )
  )
})
