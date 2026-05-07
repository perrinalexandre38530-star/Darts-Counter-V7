import type { CastSnapshot } from "../../cast/castTypes";
import type { ViewerLiveSnapshot } from "./types";
import { publishViewerSnapshot } from "./viewerClient";
import { getActiveViewerSession } from "./viewerSession";
import { castSnapshotToViewerSnapshot } from "./buildViewerSnapshot";

const MIN_INTERVAL_MS = 350;
const VIEWER_DIAG_KEY = "dc_viewer_diag_v1";
let lastSentAt = 0;
let lastSignature = "";
let lastErrorAt = 0;

function diag(entry: string, extra?: any) {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(window.localStorage.getItem(VIEWER_DIAG_KEY) || "[]");
    const next = Array.isArray(prev) ? prev : [];
    next.push({ at: Date.now(), entry, extra: extra ?? null });
    while (next.length > 80) next.shift();
    window.localStorage.setItem(VIEWER_DIAG_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dc-viewer-diag"));
  } catch {}
}

function signatureOf(snapshot: ViewerLiveSnapshot) {
  try {
    return JSON.stringify({
      game: snapshot.game,
      phase: snapshot.phase,
      activePlayerId: snapshot.activePlayerId,
      players: snapshot.players?.map((p) => ({ id: p.id, score: p.score, active: p.isActive, lives: p.lives, rank: p.rank })),
      match: snapshot.match,
      summary: snapshot.summary,
    });
  } catch {
    return String(Date.now());
  }
}

export function getViewerDiagLog(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(VIEWER_DIAG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function clearViewerDiagLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(VIEWER_DIAG_KEY);
    window.dispatchEvent(new CustomEvent("dc-viewer-diag"));
  } catch {}
}

export function publishActiveViewerSnapshotFromCast(castSnapshot: CastSnapshot | null, reason = "cast_snapshot") {
  if (!castSnapshot) return false;
  const session = getActiveViewerSession();
  if (!session?.sessionId) return false;
  const snapshot = castSnapshotToViewerSnapshot(castSnapshot, session.sessionId);
  void publishActiveViewerSnapshot(snapshot, reason);
  return true;
}

export async function publishActiveViewerSnapshot(snapshot: ViewerLiveSnapshot, reason = "snapshot") {
  const session = getActiveViewerSession();
  if (!session?.sessionId) return false;

  const now = Date.now();
  if (now - lastSentAt < MIN_INTERVAL_MS) return true;

  const payload: ViewerLiveSnapshot = {
    ...snapshot,
    v: 1,
    sessionId: session.sessionId,
    updatedAt: now,
  };
  const sig = signatureOf(payload);
  if (sig === lastSignature) return true;

  lastSentAt = now;
  lastSignature = sig;

  try {
    await publishViewerSnapshot(session.sessionId, payload);
    diag("viewer_publish_ok", { reason, sessionId: session.sessionId, game: payload.game, players: payload.players?.length || 0 });
    return true;
  } catch (e: any) {
    const at = Date.now();
    if (at - lastErrorAt > 3000) {
      lastErrorAt = at;
      diag("viewer_publish_failed", { reason, sessionId: session.sessionId, error: String(e?.message || e || "Erreur") });
    }
    return false;
  }
}
