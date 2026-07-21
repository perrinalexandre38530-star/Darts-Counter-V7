// @ts-nocheck
// Same-origin bridge Cloudflare Pages -> backend NAS/R2.
// Le navigateur n'appelle plus directement api.multisports-api.fr : les erreurs
// CORS du tunnel ne peuvent donc plus bloquer la connexion.

interface Env {
  MULTISPORTS_BACKEND_URL?: string;
}

const DEFAULT_BACKEND = "https://api.multisports-api.fr";
const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
]);

function json(payload: any, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-multisports-pages-proxy": "1",
    },
  });
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const pathValue = Array.isArray(params?.path) ? params.path.join("/") : String(params?.path || "");
  const base = String(env?.MULTISPORTS_BACKEND_URL || DEFAULT_BACKEND).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(base)) return json({ ok: false, error: "backend_url_invalid" }, 500);

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${base}/${pathValue.replace(/^\/+/, "")}`);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  for (const name of Array.from(headers.keys())) {
    if (HOP_BY_HOP.has(name.toLowerCase()) || name.toLowerCase().startsWith("cf-")) headers.delete(name);
  }
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  headers.set("x-multisports-pages-proxy", "1");

  const method = request.method.toUpperCase();
  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of Array.from(responseHeaders.keys())) {
      if (HOP_BY_HOP.has(name.toLowerCase())) responseHeaders.delete(name);
    }
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.set("x-multisports-pages-proxy", "1");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return json({
      ok: false,
      code: "backend_proxy_unreachable",
      error: "Le proxy Cloudflare Pages ne parvient pas à joindre le backend NAS/R2.",
      detail: String(error?.message || error || "Erreur réseau"),
      upstream: base,
    }, 502);
  }
};
