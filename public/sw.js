// /public/sw.js — minimal PWA SW, cache-safe + Push appels entrants
const SW_VERSION = "dc-sw-2026-09-02-maplibre-terrain-v6";
const CONTENT_PACK_CACHE_PREFIX = "mss-content-packs-";
const CONTENT_PACK_CACHE = "mss-content-packs-v3";
const MAP_TILE_CACHE = "mss-map-tiles-v1";
const MAP_TILE_CACHE_LIMIT = 360;
let mapTileWriteCount = 0;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== SW_VERSION && name !== CONTENT_PACK_CACHE && name !== MAP_TILE_CACHE).map((name) => caches.delete(name).catch(() => false)));
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

// Les packs Cloudflare sont explicitement installables. Ils sont les seuls médias
// lourds servis cache-first. Le reste de l'application reste network-first pour
// ne jamais ressusciter un vieux chunk Vite.
function parseContentPackRange(value, total) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(value || "").trim());
  if (!match || !Number.isFinite(total) || total <= 0) return null;
  let start;
  let end;
  if (!match[1] && match[2]) {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1] || 0);
    end = match[2] ? Number(match[2]) : total - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total || end < start) return null;
  return { start, end: Math.min(end, total - 1) };
}

async function fetchFullContentPack(url, cache) {
  const response = await fetch(new Request(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  }));
  if (response?.ok) {
    try { await cache.put(url, response.clone()); } catch {}
  }
  return response;
}

function isMapTileRequest(url) {
  if (!url) return false;
  const host = String(url.hostname || "").toLowerCase();
  if (host === "tile.openstreetmap.org" || host === "tile.opentopomap.org" || host === "tile.waymarkedtrails.org" || host === "tiles.mapterhorn.com") return true;
  return false;
}

async function pruneMapTileCache(cache) {
  mapTileWriteCount += 1;
  if (mapTileWriteCount % 24 !== 0) return;
  try {
    const keys = await cache.keys();
    const extra = keys.length - MAP_TILE_CACHE_LIMIT;
    if (extra > 0) await Promise.all(keys.slice(0, extra).map((key) => cache.delete(key).catch(() => false)));
  } catch {}
}

async function serveMapTileRequest(request) {
  const cache = await caches.open(MAP_TILE_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      try {
        await cache.put(request, response.clone());
        void pruneMapTileCache(cache);
      } catch {}
    }
    return response;
  } catch {
    return cached || new Response("", { status: 503, statusText: "Map tile unavailable" });
  }
}

async function serveContentPackRequest(request) {
  const cache = await caches.open(CONTENT_PACK_CACHE);
  let response = await cache.match(request.url);
  const rangeHeader = request.headers.get("range");

  if (!response || (rangeHeader && response.type === "opaque")) {
    try { response = await fetchFullContentPack(request.url, cache); }
    catch { response = null; }
  }

  if (!response) return new Response("", { status: 503, statusText: "Content pack unavailable" });
  if (!rangeHeader || !response.ok) return response;

  try {
    const buffer = await response.clone().arrayBuffer();
    const range = parseContentPackRange(rangeHeader, buffer.byteLength);
    if (!range) {
      const headers = new Headers(response.headers);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Range", `bytes */${buffer.byteLength}`);
      return new Response(null, { status: 416, headers });
    }
    const headers = new Headers(response.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${buffer.byteLength}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(buffer.slice(range.start, range.end + 1), { status: 206, headers });
  } catch {
    return response;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  let url = null;
  try { url = new URL(event.request.url); } catch {}
  const isContentPack = !!url && url.pathname.includes("/mss-content-packs/");
  if (isContentPack) {
    event.respondWith(serveContentPackRequest(event.request));
    return;
  }
  if (isMapTileRequest(url)) {
    event.respondWith(serveMapTileRequest(event.request));
    return;
  }
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
