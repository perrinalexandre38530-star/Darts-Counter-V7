// /public/sw.js — minimal PWA SW, cache-safe
// Objectif:
// - ne PAS mettre les chunks Vite en cache
// - supporter SKIP_WAITING
// - permettre purge des caches si demandé
// - éviter les vieux modules cassés après déploiement

const SW_VERSION = "dc-sw-2026-03-08-02";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== SW_VERSION)
          .map((name) => caches.delete(name).catch(() => false))
      );
    } catch {}
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const type = event?.data?.type;
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (type === "PURGE_CACHES") {
    event.waitUntil((async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name).catch(() => false)));
      } catch {}
    })());
  }
});

// Network-only : on ne sert rien depuis le cache pour éviter les vieux chunks Vite.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
