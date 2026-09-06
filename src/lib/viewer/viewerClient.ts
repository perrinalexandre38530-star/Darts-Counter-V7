import { NAS_API_URL, PUBLIC_PAGES_ORIGIN } from "../serverConfig";
import type { ViewerCreateSessionResult, ViewerLiveSnapshot } from "./types";

const VIEWER_TIMEOUT_MS = 3500;

// Source de vérité Viewer : le Worker ONLINE possède déjà le KV DC_SYNC et
// les routes /viewer/session. Cela évite qu'Android (https://localhost), Tizen
// ou une Pages Function non configurée tombent sur une réponse HTML / générique.
export const DEFAULT_VIEWER_API_URL = "https://dc-online-v3.perrin-alexandre38530.workers.dev";

type ViewerFetchInit = RequestInit & {
  timeoutMs?: number;
  acceptPayload?: (payload: any) => boolean;
};

function normalizeBase(raw: any) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, "");
}

function isLocalPackagedRuntime() {
  if (typeof window === "undefined") return false;
  const protocol = String(window.location?.protocol || "").toLowerCase();
  const hostname = String(window.location?.hostname || "").toLowerCase();
  if (["file:", "capacitor:", "tizen:", "app:"].includes(protocol)) return true;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function baseCandidates() {
  const env = (import.meta as any)?.env || {};
  const localPackaged = isLocalPackagedRuntime();
  const currentOrigin = typeof window !== "undefined" && !localPackaged && /^https?:$/i.test(String(window.location?.protocol || ""))
    ? normalizeBase(window.location.origin)
    : "";

  // Ordre volontaire : override explicite > Worker ONLINE stable > Pages >
  // origine Web courante > anciens backends. Le Worker ONLINE sait créer des
  // sessions Viewer et possède le binding KV DC_SYNC.
  const list = [
    normalizeBase(env.VITE_VIEWER_API_URL),
    normalizeBase(env.VITE_ONLINE_API_URL),
    normalizeBase(DEFAULT_VIEWER_API_URL),
    normalizeBase(PUBLIC_PAGES_ORIGIN),
    currentOrigin,
    normalizeBase(env.VITE_ONLINE_WS_BASE_URL),
    normalizeBase(NAS_API_URL),
  ];

  return Array.from(new Set(list.filter(Boolean)));
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function pathCandidates(path: string) {
  const normalized = normalizePath(path);
  const apiPath = normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
  return Array.from(new Set([apiPath, normalized]));
}

async function apiFetch(path: string, init?: ViewerFetchInit) {
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

      const { timeoutMs: _timeoutMs, acceptPayload, headers, ...fetchInit } = init || {};

      try {
        const url = `${base}${candidatePath}`;
        const res = await fetch(url, {
          ...fetchInit,
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
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

        // Un SPA local / un reverse-proxy peut répondre HTTP 200 avec index.html.
        // Avant ce correctif, createViewerSession() prenait cette réponse pour
        // un succès puis levait « identifiant absent » sans essayer le Worker.
        const raw = String(json?.raw || "").trim();
        if (raw && /^<!doctype\s+html|^<html/i.test(raw)) {
          const err: any = new Error("Réponse HTML reçue à la place de l'API Viewer.");
          err.status = 502;
          err.payload = json;
          err.url = url;
          throw err;
        }

        if (acceptPayload && !acceptPayload(json)) {
          const err: any = new Error("Réponse Viewer API invalide pour cette route.");
          err.status = 502;
          err.payload = json;
          err.url = url;
          throw err;
        }

        return json;
      } catch (e: any) {
        lastError = e;
        const status = Number(e?.status || 0);
        // Pour une réponse qui prouve que ce backend n'est pas le bon, on passe
        // directement au backend suivant. 404/405 peuvent encore justifier de
        // tenter l'alias /api ou sans /api sur le même backend.
        if (status && ![401, 403, 404, 405].includes(status)) break;
      } finally {
        window.clearTimeout(timer);
      }
    }
  }

  const detail = String(lastError?.message || lastError || "Viewer API indisponible.");
  throw new Error(`${detail} [Viewer API: ${bases.join(" → ")}]`);
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
    acceptPayload: (payload) => Boolean(cleanCode(payload?.sessionId || payload?.id || payload?.code || "")),
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
    acceptPayload: (payload) => payload && typeof payload === "object" && payload.ok !== false,
  });
  return { ok: json?.ok !== false, rev: Number(json?.rev || 0) || undefined };
}

export async function fetchViewerSnapshot(sessionId: string): Promise<ViewerLiveSnapshot | null> {
  const sid = cleanCode(sessionId);
  if (!sid) throw new Error("Session viewer manquante.");
  const json = await apiFetch(`/viewer/session/${encodeURIComponent(sid)}/snapshot`, {
    method: "GET",
    timeoutMs: 3200,
    acceptPayload: (payload) => {
      const snap = payload?.snapshot || payload?.payload || payload;
      return Boolean(snap && typeof snap === "object" && Array.isArray(snap.players));
    },
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
