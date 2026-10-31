// /public/sw.js — minimal PWA SW, cache-safe + Push appels entrants
const SW_VERSION = "dc-sw-2026-10-29-offline-shell-v10";
const CONTENT_PACK_CACHE_PREFIX = "mss-content-packs-";
const CONTENT_PACK_CACHE = "mss-content-packs-v3";
const MAP_TILE_CACHE = "mss-map-tiles-v1";
const APP_SHELL_CACHE = SW_VERSION;
const APP_SHELL_SEED = ["/", "/index.html", "/manifest.json", "/manifest.webmanifest", "/app-192.png", "/app-512.png"];
const MAP_TILE_CACHE_LIMIT = 360;
let mapTileWriteCount = 0;

function isPrecacheCodeAsset(pathname) {
  return /\.(?:js|mjs|css|woff2?|ttf|otf)$/i.test(String(pathname || ""));
}

async function readViteManifest() {
  try {
    const response = await fetch(new Request("/manifest.json", { cache: "no-store", credentials: "same-origin" }));
    if (!response?.ok) return null;
    const manifest = await response.json();
    return manifest && typeof manifest === "object" ? manifest : null;
  } catch {
    return null;
  }
}

function manifestAssetUrl(value) {
  const file = String(value || "").trim();
  if (!file || !isPrecacheCodeAsset(file)) return null;
  return `/${file.replace(/^\/+/, "")}`;
}

function collectEntryAssets(entry, out) {
  if (!entry || typeof entry !== "object") return;
  const file = manifestAssetUrl(entry.file);
  if (file) out.add(file);
  const css = Array.isArray(entry.css) ? entry.css : [];
  for (const item of css) {
    const value = manifestAssetUrl(item);
    if (value) out.add(value);
  }
}

function collectManifestGraph(manifest, rootKey, out, dynamicDepth = 0, visited = new Set()) {
  const key = String(rootKey || "");
  if (!key || visited.has(key)) return;
  const entry = manifest?.[key];
  if (!entry || typeof entry !== "object") return;
  visited.add(key);
  collectEntryAssets(entry, out);
  for (const dep of Array.isArray(entry.imports) ? entry.imports : []) {
    collectManifestGraph(manifest, dep, out, dynamicDepth, visited);
  }
  if (dynamicDepth > 0) {
    for (const dep of Array.isArray(entry.dynamicImports) ? entry.dynamicImports : []) {
      collectManifestGraph(manifest, dep, out, dynamicDepth - 1, visited);
    }
  }
}

function readManifestAssetSets(manifest) {
  const all = new Set();
  const core = new Set();
  if (!manifest || typeof manifest !== "object") return { all: [], core: [] };

  for (const entry of Object.values(manifest)) collectEntryAssets(entry, all);

  // Le boot V206 charge src/main.tsx puis importe dynamiquement ./App. On suit
  // donc les imports statiques de l'entrée et UN niveau dynamique afin que
  // main + App soient disponibles même au tout premier redémarrage hors ligne.
  for (const [key, entry] of Object.entries(manifest)) {
    if (entry?.isEntry === true) collectManifestGraph(manifest, key, core, 1);
  }

  // Routes locales les plus importantes : elles doivent rester ouvrables même
  // si le pré-cache complet de la très grosse application (290+ lazy chunks)
  // n'a pas encore fini.
  const critical = /(?:^|\/)src\/(?:pages\/(?:Home|Games|Profiles|StatsShell|StatsHub|Settings|TrainingMenu)|App)\.(?:t|j)sx?$/i;
  for (const key of Object.keys(manifest)) {
    if (critical.test(String(key))) collectManifestGraph(manifest, key, core, 0);
  }

  return { all: Array.from(all), core: Array.from(core) };
}

async function cacheUrls(cache, urls, concurrency = 6) {
  const queue = Array.from(new Set((urls || []).filter(Boolean)));
  const failed = [];
  let cachedAssets = 0;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      const url = queue[index];
      try {
        const response = await fetch(new Request(url, { cache: "no-store", credentials: "same-origin" }));
        if (!response?.ok) {
          failed.push(url);
          continue;
        }
        await cache.put(url, response.clone());
        cachedAssets += 1;
      } catch {
        failed.push(url);
      }
    }
  };

  const count = Math.max(1, Math.min(Number(concurrency || 1), queue.length || 1));
  await Promise.all(Array.from({ length: count }, () => worker()));
  return { cachedAssets, failed, total: queue.length };
}

async function writeOfflineReadyMarker(cache, patch) {
  let previous = {};
  try {
    const response = await cache.match("/__mss_offline_ready__");
    previous = response ? await response.json().catch(() => ({})) : {};
  } catch {}
  const next = { ...previous, ...patch, version: SW_VERSION, updatedAt: Date.now() };
  try {
    await cache.put("/__mss_offline_ready__", new Response(JSON.stringify(next), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }));
  } catch {}
  return next;
}

async function precacheCoreShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const manifest = await readViteManifest();
  if (!manifest) throw new Error("offline-precache: Vite manifest absent");
  const assets = readManifestAssetSets(manifest);
  if (!assets.core.length) throw new Error("offline-precache: aucun chunk critique trouve");

  const requiredSeed = ["/", "/index.html", "/manifest.json"];
  const optionalSeed = APP_SHELL_SEED.filter((url) => !requiredSeed.includes(url));
  const required = Array.from(new Set([...requiredSeed, ...assets.core]));
  const requiredResult = await cacheUrls(cache, required, 6);
  void cacheUrls(cache, optionalSeed, 4).catch(() => {});

  const ready = requiredResult.failed.length === 0;
  await writeOfflineReadyMarker(cache, {
    ready,
    coreReady: ready,
    fullReady: false,
    phase: ready ? "core-ready" : "core-failed",
    coreAssets: assets.core.length,
    manifestAssets: assets.all.length,
    cachedAssets: requiredResult.cachedAssets,
    failedAssets: requiredResult.failed.length,
    failedCodeAssets: requiredResult.failed.filter((url) => assets.core.includes(url)),
  });

  if (!ready) throw new Error(`offline-precache: ${requiredResult.failed.length} ressource(s) critique(s) non cachee(s)`);
  return { manifest, assets };
}

async function precacheFullApp() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const manifest = await readViteManifest();
  if (!manifest) {
    await writeOfflineReadyMarker(cache, { fullReady: false, phase: "full-manifest-missing" });
    return { ready: false, failed: ["/manifest.json"] };
  }
  const assets = readManifestAssetSets(manifest);
  const urls = Array.from(new Set([...APP_SHELL_SEED, ...assets.all]));
  await writeOfflineReadyMarker(cache, {
    phase: "full-caching",
    fullReady: false,
    manifestAssets: assets.all.length,
  });

  // V206 contient environ 290 React.lazy. Les télécharger séquentiellement dans
  // install faisait expirer l'installation du SW sur Android. Le cache complet
  // se fait donc APRES activation, avec une concurrence bornée.
  const result = await cacheUrls(cache, urls, 8);
  const failedCodeAssets = result.failed.filter((url) => assets.all.includes(url));
  const fullReady = failedCodeAssets.length === 0;
  const marker = await writeOfflineReadyMarker(cache, {
    ready: true,
    coreReady: true,
    fullReady,
    phase: fullReady ? "full-ready" : "full-partial",
    coreAssets: assets.core.length,
    manifestAssets: assets.all.length,
    cachedAssets: result.cachedAssets,
    failedAssets: result.failed.length,
    failedCodeAssets,
    cachedAt: Date.now(),
  });
  return { ready: fullReady, failed: result.failed, marker };
}

self.addEventListener("install", (event) => {
  // Le SW s'active dès que le shell CRITIQUE est garanti. Le pré-cache complet
  // est volontairement exclu de install : sur V206, 290+ chunks lazy pouvaient
  // maintenir l'installation en attente jusqu'à abandon par Chrome Android.
  event.waitUntil((async () => {
    await precacheCoreShell();
    await self.skipWaiting();
  })());
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
  if (type === "PRECACHE_APP_SHELL") {
    event.waitUntil(precacheFullApp());
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

function isSameOriginAppRequest(request, url) {
  if (!request || !url || url.origin !== self.location.origin) return false;
  if (request.mode === "navigate") return true;
  const destination = String(request.destination || "");
  return ["script", "style", "font", "image"].includes(destination);
}

async function serveAppRequestNetworkFirst(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      try { await cache.put(request, response.clone()); } catch {}
      if (request.mode === "navigate") {
        try { await cache.put("/index.html", response.clone()); } catch {}
      }
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match("/index.html") || await cache.match("/");
      if (shell) return shell;
    }
    return new Response("", { status: 503, statusText: "Offline asset unavailable" });
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
  // OFFLINE-FIRST W3: network-first pour le shell et les assets locaux. En ligne,
  // on prend toujours la version fraîche; hors ligne, on retombe sur le dernier
  // exemplaire réellement chargé. Cela évite le vieux comportement cache-first
  // qui pouvait ressusciter des chunks Vite obsolètes.
  if (isSameOriginAppRequest(event.request, url)) {
    event.respondWith(serveAppRequestNetworkFirst(event.request));
    return;
  }
  return;
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
