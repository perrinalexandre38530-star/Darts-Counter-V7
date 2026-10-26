// /public/sw.js — PWA SW offline-first + Push appels entrants
const SW_VERSION = "dc-sw-2026-10-26-offline-first-v1";
const APP_SHELL_CACHE = `${SW_VERSION}-app-shell`;
const RUNTIME_STATIC_CACHE = `${SW_VERSION}-runtime-static`;
const CONTENT_PACK_CACHE_PREFIX = "mss-content-packs-";
const CONTENT_PACK_CACHE = "mss-content-packs-v3";
const MAP_TILE_CACHE = "mss-map-tiles-v1";
const MAP_TILE_CACHE_LIMIT = 360;
let mapTileWriteCount = 0;

const CORE_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/app-192.png",
  "/app-512.png",
];

function sameOrigin(url) {
  try { return new URL(url, self.location.origin).origin === self.location.origin; }
  catch { return false; }
}

function normalizePath(url) {
  try {
    const u = new URL(url, self.location.origin);
    return `${u.pathname}${u.search}`;
  } catch {
    return String(url || "");
  }
}

function isCodeAssetPath(pathname) {
  return /\.(?:js|mjs|css|woff2?|ttf|otf)$/i.test(String(pathname || ""));
}

function isRuntimeStaticPath(pathname) {
  return /\.(?:png|jpe?g|webp|gif|svg|ico|avif|mp3|m4a|wav|ogg|json)$/i.test(String(pathname || ""));
}

async function cacheResponse(cache, request, response) {
  if (!response || !response.ok) return false;
  try {
    await cache.put(request, response.clone());
    return true;
  } catch {
    return false;
  }
}

async function fetchAndCache(cache, url) {
  try {
    const request = new Request(url, { method: "GET", cache: "reload", credentials: "same-origin" });
    const response = await fetch(request);
    if (!response?.ok) return false;
    return await cacheResponse(cache, request, response);
  } catch {
    return false;
  }
}

async function readViteManifestUrls() {
  try {
    const response = await fetch(new Request("/manifest.json", { cache: "no-store", credentials: "same-origin" }));
    if (!response?.ok) return [];
    const manifest = await response.json();
    const urls = new Set();

    for (const entry of Object.values(manifest || {})) {
      const file = entry && typeof entry === "object" ? entry.file : null;
      if (file && isCodeAssetPath(file)) urls.add(`/${String(file).replace(/^\/+/, "")}`);
      const css = Array.isArray(entry?.css) ? entry.css : [];
      for (const item of css) {
        if (item) urls.add(`/${String(item).replace(/^\/+/, "")}`);
      }
    }

    return Array.from(urls);
  } catch {
    return [];
  }
}

async function precacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const manifestUrls = await readViteManifestUrls();
  const urls = Array.from(new Set([...CORE_SHELL_URLS, ...manifestUrls]));

  // Best effort par fichier : un asset optionnel manquant ne doit JAMAIS faire
  // échouer l'installation du SW entier.
  for (const url of urls) {
    await fetchAndCache(cache, url);
  }

  try {
    await cache.put("/__mss_offline_ready__", new Response(JSON.stringify({
      version: SW_VERSION,
      cachedAt: Date.now(),
      codeAssets: manifestUrls.length,
    }), { headers: { "content-type": "application/json" } }));
  } catch {}
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await precacheAppShell();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => {
        if (name === APP_SHELL_CACHE || name === RUNTIME_STATIC_CACHE || name === CONTENT_PACK_CACHE || name === MAP_TILE_CACHE) return false;
        if (name.startsWith(CONTENT_PACK_CACHE_PREFIX)) return false;
        return name.startsWith("dc-sw-") || name.includes("app-shell") || name.includes("runtime-static");
      }).map((name) => caches.delete(name).catch(() => false)));
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
  if (type === "PRECACHE_APP_SHELL") {
    event.waitUntil(precacheAppShell());
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

// Les packs Cloudflare sont explicitement installables. Ils restent les médias
// lourds servis cache-first. Le shell applicatif est désormais également mis en
// cache afin de permettre un vrai démarrage/rechargement sans réseau.
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

async function serveNavigationRequest(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response?.ok) {
      // Les routes utilisent HashRouter, mais on garde aussi la dernière réponse
      // navigation en secours pour Cloudflare Pages/PWA.
      try { await cache.put("/index.html", response.clone()); } catch {}
      return response;
    }
  } catch {}

  return (
    await cache.match("/index.html") ||
    await cache.match("/") ||
    new Response("Application hors ligne indisponible : shell non installé.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  );
}

async function serveCodeAssetRequest(request) {
  const shellCache = await caches.open(APP_SHELL_CACHE);
  const cached = await shellCache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response?.ok) {
      await cacheResponse(shellCache, request, response);
      return response;
    }
    return response;
  } catch {
    // Les chunks Vite sont hashés : ignoreSearch n'est volontairement pas utilisé.
    return new Response("", { status: 504, statusText: "Offline code asset unavailable" });
  }
}

async function serveRuntimeStaticRequest(request) {
  const cache = await caches.open(RUNTIME_STATIC_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      void cacheResponse(cache, request, response);
    }
    return response;
  } catch {
    return cached || new Response("", { status: 504, statusText: "Offline asset unavailable" });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  let url = null;
  try { url = new URL(event.request.url); } catch {}
  if (!url) return;

  const isContentPack = url.pathname.includes("/mss-content-packs/");
  if (isContentPack) {
    event.respondWith(serveContentPackRequest(event.request));
    return;
  }
  if (isMapTileRequest(url)) {
    event.respondWith(serveMapTileRequest(event.request));
    return;
  }

  // Les API/auth/cloud ne doivent jamais être simulées hors ligne. Elles échouent
  // normalement tandis que le store local reste fonctionnel et met ses mutations
  // en queue pour la reconnexion.
  if (url.origin !== self.location.origin) return;
  if (/^\/api(?:\/|$)/i.test(url.pathname)) return;

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(serveNavigationRequest(event.request));
    return;
  }

  if (isCodeAssetPath(url.pathname) || url.pathname.startsWith("/assets/")) {
    event.respondWith(serveCodeAssetRequest(event.request));
    return;
  }

  if (isRuntimeStaticPath(url.pathname)) {
    event.respondWith(serveRuntimeStaticRequest(event.request));
    return;
  }
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
