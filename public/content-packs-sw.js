// Dedicated native Capacitor Service Worker for Cloudflare content packs only.
// It NEVER intercepts application chunks, navigation, HTML or API traffic.
const CONTENT_PACK_CACHE = "mss-content-packs-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isContentPackRequest(request) {
  if (!request || request.method !== "GET") return false;
  try {
    const url = new URL(request.url);
    return url.pathname.includes("/mss-content-packs/v1/");
  } catch {
    return false;
  }
}

function parseRange(value, total) {
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

async function fetchFullAndCache(url, cache) {
  const request = new Request(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });
  const response = await fetch(request);
  if (!response || !response.ok) return response;
  try { await cache.put(url, response.clone()); } catch {}
  return response;
}

async function serveContentPack(request) {
  const cache = await caches.open(CONTENT_PACK_CACHE);
  let response = await cache.match(request.url);
  const rangeHeader = request.headers.get("range");

  // For range playback we need an inspectable full CORS response, not an opaque body.
  if (!response || (rangeHeader && response.type === "opaque")) {
    try { response = await fetchFullAndCache(request.url, cache); }
    catch { response = null; }
  }

  if (!response) {
    return new Response("", { status: 503, statusText: "Content pack unavailable" });
  }

  if (!rangeHeader || !response.ok) return response;

  try {
    const buffer = await response.clone().arrayBuffer();
    const range = parseRange(rangeHeader, buffer.byteLength);
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
  if (!isContentPackRequest(event.request)) return;
  event.respondWith(serveContentPack(event.request));
});
