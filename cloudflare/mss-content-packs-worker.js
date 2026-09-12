// MULTISPORTS SCORING — public read-only gateway for versioned content packs.
// R2 stays private; only objects under mss-content-packs/v1/ are exposed.

const PUBLIC_PREFIX = "mss-content-packs/v1/";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range,If-None-Match,If-Modified-Since",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,ETag,Accept-Ranges,Last-Modified",
    "Access-Control-Max-Age": "86400",
  };
}

function mimeFor(key) {
  const ext = key.split(".").pop()?.toLowerCase();
  return {
    webp: "image/webp", avif: "image/avif", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    mp4: "video/mp4", webm: "video/webm", m4a: "audio/mp4", opus: "audio/ogg",
    json: "application/json; charset=utf-8", svg: "image/svg+xml", bvh: "text/plain; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function safeKey(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const key = decoded.replace(/^\/+/, "");
  if (!key.startsWith(PUBLIC_PREFIX)) return null;
  if (key.includes("..") || key.includes("\\")) return null;
  return key;
}

function applyObjectHeaders(headers, object, key) {
  object?.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeFor(key));
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", key.endsWith("/manifest.json") ? "public, max-age=300" : "public, max-age=31536000, immutable");
  }
  if (object?.httpEtag) headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "mss-content-packs", prefix: PUBLIC_PREFIX }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
      });
    }

    const key = safeKey(url.pathname);
    if (!key) return new Response("Not Found", { status: 404, headers: corsHeaders() });

    if (request.method === "HEAD") {
      const object = await env.CONTENT_PACKS.head(key);
      if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders() });
      const headers = new Headers();
      applyObjectHeaders(headers, object, key);
      if (typeof object.size === "number") headers.set("Content-Length", String(object.size));
      return new Response(null, { status: 200, headers });
    }

    // Range support is important for cached/streamed exercise videos.
    const rangeHeader = request.headers.get("Range");
    let object;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match) {
        const head = await env.CONTENT_PACKS.head(key);
        if (!head) return new Response("Not Found", { status: 404, headers: corsHeaders() });
        const size = Number(head.size || 0);
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : Math.max(0, size - 1);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
          return new Response(null, { status: 416, headers: { ...corsHeaders(), "Content-Range": `bytes */${size}` } });
        }
        const boundedEnd = Math.min(end, size - 1);
        object = await env.CONTENT_PACKS.get(key, { range: { offset: start, length: boundedEnd - start + 1 } });
        if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders() });
        const headers = new Headers();
        applyObjectHeaders(headers, object, key);
        headers.set("Content-Range", `bytes ${start}-${boundedEnd}/${size}`);
        headers.set("Content-Length", String(boundedEnd - start + 1));
        return new Response(object.body, { status: 206, headers });
      }
    }

    object = await env.CONTENT_PACKS.get(key);
    if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders() });
    const headers = new Headers();
    applyObjectHeaders(headers, object, key);
    if (typeof object.size === "number") headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  },
};
