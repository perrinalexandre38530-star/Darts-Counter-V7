// CORS minimal pour la WebView native Capacitor (https://localhost).
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "https://darts-counter-v7.pages.dev",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://darts-counter-v7.pages.dev";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export const onRequest: PagesFunction = async (context) => {
  const origin = context.request.headers.get("Origin");
  if (context.request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = await context.next();
  const next = new Response(response.body, response);
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, String(value));
  return next;
};
