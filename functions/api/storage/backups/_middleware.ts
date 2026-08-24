// CORS Cloudflare Pages/R2 : production + WebView Capacitor + développement local.
const PROD_ORIGIN = "https://multisports-scoring.pages.dev";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === PROD_ORIGIN || origin === "capacitor://localhost") return true;
  try {
    const url = new URL(origin);
    const host = String(url.hostname || "").toLowerCase();
    // Vite/preview utilisent des ports variables (5173, 4173...).
    return (url.protocol === "http:" || url.protocol === "https:") &&
      (host === "localhost" || host === "127.0.0.1" || host === "::1");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = isAllowedOrigin(origin) ? String(origin) : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonWithCors(body: any, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
    },
  });
}

export const onRequest: PagesFunction = async (context) => {
  const origin = context.request.headers.get("Origin");
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = await context.next();

  // Les médias R2 sont des fallbacks optionnels. L'absence d'une cover/avatar
  // signifie simplement « pas encore répliqué », pas une erreur applicative.
  // On renvoie donc un cache-miss 200 au lieu d'un 404 rouge dans DevTools.
  if (method === "GET" && response.status === 404) {
    const pathname = new URL(context.request.url).pathname;
    if (pathname.includes("/api/storage/backups/media/")) {
      return jsonWithCors({ ok: true, media: null, missing: true }, origin, 200);
    }
    if (pathname.includes("/api/storage/backups/avatar/")) {
      return jsonWithCors({ ok: true, avatar: null, missing: true }, origin, 200);
    }
  }

  const next = new Response(response.body, response);
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, String(value));
  return next;
};
