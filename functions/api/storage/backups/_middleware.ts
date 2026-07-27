// CORS bridge for native MULTISPORTS SCORING WebViews.
// Browser/PWA calls remain same-origin. Capacitor Android/iOS runs from
// https://localhost and needs explicit cross-origin permission to call the
// Cloudflare Pages R2 Functions. Authentication is still Bearer-token based;
// no cookies or credentialed cross-origin requests are enabled here.

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
