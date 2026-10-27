type Env = {
  DARTS_API_KEY?: string;
};

const API_BASE = "https://api.dartsapi.com/v1";
const ALLOWED_METHODS = "GET, OPTIONS";

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=180",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": ALLOWED_METHODS,
      "access-control-allow-headers": "content-type",
      ...extraHeaders,
    },
  });
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function callDartsApi(key: string, path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    },
  });

  const body = await response.json().catch(() => ({
    error: "invalid_json",
    message: `Darts API returned HTTP ${response.status}`,
  })) as any;

  return { ok: response.ok, status: response.status, body };
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": ALLOWED_METHODS,
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const rawPath = context.params?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath || "overview");

  if (path !== "overview") {
    return json({ error: "not_found", message: "Unknown DARTS LIVE endpoint." }, 404);
  }

  const key = String(context.env?.DARTS_API_KEY || "").trim();
  if (!key) {
    return json({
      configured: false,
      provider: "dartsapi",
      live_available: false,
      live_reason: "DARTS_API_KEY is not configured on Cloudflare Pages.",
      live: { data: [], meta: {} },
      fixtures: { data: [], meta: {} },
      results: { data: [], meta: {} },
      warnings: [
        "Official source links remain available. Add the DARTS_API_KEY secret on Cloudflare to enable automatic fixtures/results.",
      ],
    });
  }

  const now = new Date();
  const future = new Date(now.getTime() + 7 * 86400000);

  // DartsAPI free keys intentionally expose delayed results and may reject /live
  // with 402. Refused plan calls do not consume the allowance according to their
  // public docs, so we can detect capability without exposing the key to clients.
  const [live, fixtures, results] = await Promise.all([
    callDartsApi(key, "/live"),
    callDartsApi(key, `/fixtures?from=${isoDate(now)}&to=${isoDate(future)}&limit=40`),
    callDartsApi(key, "/results?limit=30"),
  ]);

  const warnings: string[] = [];
  if (!fixtures.ok) warnings.push(`Fixtures unavailable (${fixtures.status}).`);
  if (!results.ok) warnings.push(`Results unavailable (${results.status}).`);

  let liveReason: string | null = null;
  if (!live.ok) {
    liveReason =
      live.status === 402
        ? "Live scores require a DartsAPI live-capable plan."
        : `Live scores unavailable (${live.status}).`;
  }

  const successfulMeta = [live, fixtures, results]
    .filter((item) => item.ok)
    .map((item) => item.body?.meta)
    .find(Boolean) || {};

  return json({
    configured: true,
    provider: "dartsapi",
    plan: successfulMeta?.plan || null,
    data_as_of: successfulMeta?.data_as_of || null,
    live_available: live.ok,
    live_reason: liveReason,
    live: live.ok ? live.body : { data: [], meta: live.body?.meta || {} },
    fixtures: fixtures.ok ? fixtures.body : { data: [], meta: fixtures.body?.meta || {} },
    results: results.ok ? results.body : { data: [], meta: results.body?.meta || {} },
    warnings,
  });
};
