// /public/sw.js — minimal PWA SW, cache-safe
// Objectif:
// - ne PAS mettre les chunks Vite en cache
// - supporter SKIP_WAITING
// - permettre purge des caches si demandé
// - éviter les vieux modules cassés après déploiement

const SW_VERSION = "dc-sw-2026-05-23-message-center-v2";

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


self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL("/#/messages", self.location.origin).toString();
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) {
      try {
        if ("focus" in client) {
          if ("navigate" in client) await client.navigate(url);
          return client.focus();
        }
      } catch {}
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});


self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch {
      try { data = { body: event.data ? event.data.text() : "" }; } catch {}
    }
    const title = data.title || "Multisports Scoring";
    const options = {
      body: data.body || "Nouveau message reçu.",
      tag: data.tag || "multisports-message-center",
      renotify: true,
      icon: data.icon || "/app-192.png",
      badge: data.badge || "/app-192.png",
      data: { url: data.url || "/#/messages" },
    };
    await self.registration.showNotification(title, options);
  })());
});
