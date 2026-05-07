// ===================================================
// functions/api/avatar/debug.ts
// Diagnostic léger pour vérifier les bindings runtime Cloudflare Pages.
// Ne renvoie jamais la clé complète.
// ===================================================

export interface Env {
  AI?: any;
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
  [key: string]: any;
}

type KeyProbe = {
  expected: string;
  found: boolean;
  source: string | null;
  valuePreview: string | null;
  length: number;
};

function normalizeKeyName(value: string): string {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function maskSecret(value: string): string {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.length <= 12) return `${v.slice(0, 3)}…${v.slice(-2)}`;
  return `${v.slice(0, 7)}…${v.slice(-5)}`;
}

function readOpenAiKey(env: Env): KeyProbe {
  const candidates = [
    "OPENAI_API_KEY",
    "OPENAI_KEY",
    "OPENAI_SECRET_KEY",
    "OPENAI_APIKEY",
    "VITE_OPENAI_API_KEY",
  ];

  for (const name of candidates) {
    const raw = env?.[name];
    if (typeof raw === "string" && raw.trim()) {
      const value = raw.trim();
      return { expected: "OPENAI_API_KEY", found: true, source: name, valuePreview: maskSecret(value), length: value.length };
    }
  }

  const wanted = normalizeKeyName("OPENAI_API_KEY");
  for (const [name, raw] of Object.entries(env || {})) {
    if (normalizeKeyName(name) === wanted && typeof raw === "string" && raw.trim()) {
      const value = raw.trim();
      return { expected: "OPENAI_API_KEY", found: true, source: name, valuePreview: maskSecret(value), length: value.length };
    }
  }

  return { expected: "OPENAI_API_KEY", found: false, source: null, valuePreview: null, length: 0 };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const probe = readOpenAiKey(env);
  const envKeys = Object.keys(env || {}).sort();
  const publicEnvKeys = envKeys.filter((key) => !/KEY|TOKEN|SECRET|PASSWORD|PWD/i.test(key));
  const sensitiveEnvKeysDetected = envKeys
    .filter((key) => /OPENAI|AI|KEY|TOKEN|SECRET/i.test(key))
    .map((key) => ({ name: key, masked: key === probe.source ? probe.valuePreview : "present_or_binding" }));

  return json(
    {
      ok: true,
      route: "/api/avatar/debug",
      now: new Date().toISOString(),
      host: url.host,
      openai: probe,
      cloudflareAiBinding: Boolean(env?.AI && typeof env.AI.run === "function"),
      openaiImageModel: typeof env?.OPENAI_IMAGE_MODEL === "string" && env.OPENAI_IMAGE_MODEL.trim() ? env.OPENAI_IMAGE_MODEL.trim() : "gpt-image-1",
      publicEnvKeys,
      sensitiveEnvKeysDetected,
      advice: probe.found
        ? "OPENAI_API_KEY est visible par la Function runtime. Si /cartoon échoue encore, regarder status/provider/message."
        : "OPENAI_API_KEY n'est pas visible par la Function runtime. Vérifier variable Runtime Production, nom exact, puis redéployer.",
    },
    200
  );
};

function json(payload: any, status: number): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
