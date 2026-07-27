// CORS bridge for native MULTISPORTS SCORING WebViews.
// The browser/PWA calls this route same-origin. Capacitor Android/iOS runs from
// https://localhost and therefore needs an explicit cross-origin allowance.
// Authentication remains Bearer-token based; no cookies/credentials are used.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
