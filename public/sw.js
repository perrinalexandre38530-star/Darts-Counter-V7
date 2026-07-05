// /public/sw.js — minimal PWA SW, cache-safe + Push appels entrants
const SW_VERSION = "dc-sw-2026-07-05-messenger-call-push-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== SW_VERSION).map((name) => caches.delete(name).catch(() => false)));
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
    return;
  }
  if (type === "SHOW_NOTIFICATION") {
    const payload = event?.data || {};
    const options = payload.options || {};
    event.waitUntil(self.registration.showNotification(payload.title || "Multisports Scoring", {
      body: payload.body || options.body || "Nouveau message reçu.",
      tag: options.tag || payload.tag || "multisports-message-center",
      renotify: true,
      requireInteraction: !!options.requireInteraction,
      vibrate: options.vibrate || [120, 60, 120],
      icon: options.icon || payload.icon || "/app-512.png",
      badge: options.badge || payload.badge || "/app-512.png",
      actions: options.actions || [],
      data: { ...(options.data || {}), url: payload.url || options?.data?.url || "/#/messages" },
    }));
  }
});

// Network-only : on ne sert rien depuis le cache pour éviter les vieux chunks Vite.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || new Response("", { status: 503, statusText: "Network unavailable" })));
});

self.addEventListener("notificationclick", (event) => {
  const data = event.notification && event.notification.data ? event.notification.data : {};
  const action = String(event.action || "open");
  event.notification.close();
  event.waitUntil((async () => {
    let target = data.url || "/#/messages";
    if (action === "accept") target = data.acceptUrl || data.url || "/#/messages";
    if (action === "decline") target = data.declineUrl || data.url || "/#/messages";
    const url = new URL(target, self.location.origin).toString();
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) {
      try {
        if ("focus" in client) {
          if ("navigate" in client) await client.navigate(url);
          try { client.postMessage({ type: "MESSENGER_NOTIFICATION_CLICK", action, data }); } catch {}
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
    const isCall = String(data.kind || "") === "incoming_call";
    const title = data.title || (isCall ? "Appel entrant" : "Multisports Scoring");
    const options = {
      body: data.body || (isCall ? "Un ami essaie de t'appeler." : "Nouveau message reçu."),
      tag: data.tag || (isCall && data.callId ? `multisports-call-${data.callId}` : "multisports-message-center"),
      renotify: true,
      requireInteraction: !!(data.requireInteraction || isCall),
      vibrate: data.vibrate || (isCall ? [600, 180, 600, 180, 900] : [120, 60, 120]),
      icon: data.icon || "/app-512.png",
      badge: data.badge || "/app-512.png",
      actions: data.actions || (isCall ? [
        { action: "accept", title: "Répondre" },
        { action: "decline", title: "Refuser" },
      ] : []),
      data: {
        ...(data.data || {}),
        kind: data.kind || null,
        callId: data.callId || null,
        callType: data.callType || null,
        url: data.url || (isCall && data.callId ? `/#/messages?callId=${encodeURIComponent(data.callId)}` : "/#/messages"),
        acceptUrl: data.acceptUrl || (isCall && data.callId ? `/#/messages?callId=${encodeURIComponent(data.callId)}&callAction=accept` : undefined),
        declineUrl: data.declineUrl || (isCall && data.callId ? `/#/messages?callId=${encodeURIComponent(data.callId)}&callAction=decline` : undefined),
      },
    };
    await self.registration.showNotification(title, options);
  })());
});
