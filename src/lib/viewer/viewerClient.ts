import { NAS_API_URL } from "../serverConfig";
import type { ViewerCreateSessionResult, ViewerLiveSnapshot } from "./types";

const VIEWER_TIMEOUT_MS = 3500;

function normalizeBase(raw: any) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, "");
}

function baseCandidates() {
  const env = (import.meta as any)?.env || {};
  const list = [
    normalizeBase(env.VITE_VIEWER_API_URL),
    normalizeBase(NAS_API_URL),
    normalizeBase(env.VITE_ONLINE_API_URL),
    normalizeBase(env.VITE_ONLINE_WS_BASE_URL),
    "",
  ];
  return Array.from(new Set(list.filter((v, idx, arr) => arr.indexOf(v) === idx)));
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function pathCandidates(path: string) {
  const normalized = normalizePath(path);
  const apiPath = normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
  return Array.from(new Set([apiPath, normalized]));
}

async function apiFetch(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const bases = baseCandidates();
  let lastError: any = null;

  for (const base of bases) {
    for (const candidatePath of pathCandidates(path)) {
      const ctrl = new AbortController();
      const timeout = Math.max(800, Number(init?.timeoutMs ?? VIEWER_TIMEOUT_MS) || VIEWER_TIMEOUT_MS);
      const timer = window.setTimeout(() => {
        try {
          ctrl.abort();
        } catch {}
      }, timeout);

      try {
        const url = `${base}${candidatePath}`;
        const res = await fetch(url, {
          ...init,
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            ...((init?.headers as any) || {}),
          },
        });
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = { raw: text };
        }
        if (!res.ok) {
          const msg = String(json?.message || json?.error || `Viewer API ${res.status}`);
          const err: any = new Error(msg);
          err.status = res.status;
          err.payload = json;
          err.url = url;
          throw err;
        }
        return json;
      } catch (e: any) {
        lastError = e;
        const status = Number(e?.status || 0);
        if (status && ![401, 403, 404, 405].includes(status)) break;
      } finally {
        window.clearTimeout(timer);
      }
    }
  }

  throw lastError || new Error("Viewer API indisponible.");
}

function cleanCode(input: string) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function buildJoinUrl(sessionId: string) {
  const sid = cleanCode(sessionId);
  if (typeof window === "undefined") return `#/viewer/${sid}`;
  return `${window.location.origin}${window.location.pathname}#/viewer/${sid}`;
}

export async function createViewerSession(): Promise<ViewerCreateSessionResult> {
  const json = await apiFetch("/viewer/session", {
    method: "POST",
    body: JSON.stringify({ app: "multisports-scoring", kind: "viewer_live_v1" }),
  });

  const sessionId = cleanCode(json?.sessionId || json?.id || json?.code || "");
  if (!sessionId) throw new Error("Session viewer invalide : identifiant absent.");

  return {
    sessionId,
    code: cleanCode(json?.code || sessionId),
    expiresInSeconds: Number(json?.expiresInSeconds || json?.ttl || 0) || undefined,
    joinUrl: json?.joinUrl || buildJoinUrl(sessionId),
  };
}

export async function publishViewerSnapshot(sessionId: string, snapshot: ViewerLiveSnapshot): Promise<{ ok: boolean; rev?: number }> {
  const sid = cleanCode(sessionId);
  if (!sid) throw new Error("Session viewer manquante.");
  const json = await apiFetch(`/viewer/session/${encodeURIComponent(sid)}/snapshot`, {
    method: "POST",
    body: JSON.stringify(snapshot),
    timeoutMs: 2800,
  });
  return { ok: json?.ok !== false, rev: Number(json?.rev || 0) || undefined };
}

export async function fetchViewerSnapshot(sessionId: string): Promise<ViewerLiveSnapshot | null> {
  const sid = cleanCode(sessionId);
  if (!sid) throw new Error("Session viewer manquante.");
  const json = await apiFetch(`/viewer/session/${encodeURIComponent(sid)}/snapshot`, {
    method: "GET",
    timeoutMs: 3200,
  });
  const snap = json?.snapshot || json?.payload || json;
  if (!snap || typeof snap !== "object" || !Array.isArray(snap.players)) return null;
  return snap as ViewerLiveSnapshot;
}

export async function closeViewerSession(sessionId: string): Promise<void> {
  const sid = cleanCode(sessionId);
  if (!sid) return;
  try {
    await apiFetch(`/viewer/session/${encodeURIComponent(sid)}`, { method: "DELETE", timeoutMs: 2000 });
  } catch {}
}

export const viewerJoinUrl = buildJoinUrl;
export const normalizeViewerCode = cleanCode;
