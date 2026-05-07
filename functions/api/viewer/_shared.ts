// @ts-nocheck
export interface Env {
  DC_SYNC?: KVNamespace;
}

export const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const SNAPSHOT_TTL_SECONDS = 60 * 60 * 8;

export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "cache-control": "no-store",
    },
  });
}

export function cleanId(input: any) {
  return String(input || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function sessionKey(sessionId: string) {
  return `viewer:${sessionId}`;
}

export function snapshotKey(sessionId: string) {
  return `viewer:${sessionId}:snapshot`;
}

export function joinUrl(request: Request, sessionId: string) {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname.startsWith("/api/") ? "/" : url.pathname}#/viewer/${sessionId}`.replace(/\/api\/viewer\/session.*?#/, "/#");
}

export async function ensureStore(env: Env) {
  if (!env?.DC_SYNC) throw new Error("DC_SYNC KV binding manquante pour le Viewer.");
  return env.DC_SYNC;
}
