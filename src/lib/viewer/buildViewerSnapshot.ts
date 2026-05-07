import type { CastSnapshot } from "../../cast/castTypes";
import type { ViewerLiveSnapshot, ViewerPlayer } from "./types";

function asNumber(value: any, fallback?: number | null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanAvatarUrl(p: any) {
  const src = p?.avatarUrl || p?.photoUrl || p?.imageUrl || p?.avatar || "";
  if (typeof src === "string" && src.startsWith("data:")) return null;
  return src || null;
}

function mapPlayer(p: any, idx: number): ViewerPlayer {
  return {
    ...p,
    id: String(p?.id || `player-${idx + 1}`),
    name: String(p?.name || p?.label || `Joueur ${idx + 1}`),
    score: p?.score ?? p?.points ?? p?.remaining ?? 0,
    avatarUrl: cleanAvatarUrl(p),
    avatarDataUrl: typeof p?.avatarDataUrl === "string" && p.avatarDataUrl.startsWith("data:") ? p.avatarDataUrl : null,
    color: p?.color || p?.accent || null,
    isActive: Boolean(p?.active || p?.isActive),
    isWinner: Boolean(p?.winner || p?.isWinner),
    rank: asNumber(p?.rank, null),
    stats: p?.stats || {},
    lives: p?.lives ?? null,
    target: p?.target ?? p?.number ?? null,
    eliminated: Boolean(p?.eliminated || false),
  };
}

function inferSport(game: string) {
  const g = String(game || "").toLowerCase();
  if (["petanque"].includes(g)) return "petanque";
  if (["babyfoot"].includes(g)) return "babyfoot";
  if (["pingpong"].includes(g)) return "pingpong";
  if (["molkky"].includes(g)) return "molkky";
  if (["dice", "dicegame", "yams", "421", "farkle"].includes(g)) return "dicegame";
  return "darts";
}

export function castSnapshotToViewerSnapshot(snapshot: CastSnapshot, sessionId?: string): ViewerLiveSnapshot {
  const game = String((snapshot as any)?.game || "unknown").toLowerCase();
  const meta = ((snapshot as any)?.meta && typeof (snapshot as any).meta === "object" ? (snapshot as any).meta : {}) as Record<string, any>;
  const players = Array.isArray((snapshot as any)?.players) ? (snapshot as any).players.map(mapPlayer) : [];
  const active = players.find((p) => p.isActive) || null;

  return {
    v: 1,
    sessionId,
    updatedAt: Date.now(),
    sport: String((snapshot as any)?.sport || inferSport(game)),
    game,
    phase: (snapshot as any)?.status === "finished" ? "finished" : "playing",
    title: String((snapshot as any)?.title || "Multisports Scoring"),
    screen: (snapshot as any)?.screen || undefined,
    activePlayerId: active?.id || (snapshot as any)?.activePlayerId || null,
    currentPlayer: (snapshot as any)?.currentPlayer || active?.name || null,
    match: {
      legIndex: asNumber(meta.leg, null),
      setIndex: asNumber(meta.set, null),
      round: asNumber(meta.round ?? meta.end ?? meta.hole, null),
      target: meta.target ?? null,
      modeLabel: meta.outMode || meta.mode || meta.text || null,
      ...meta,
    },
    players,
    meta,
    summary: (snapshot as any)?.summary || undefined,
    source: "cast",
  };
}

export function buildViewerWaitingSnapshot(sessionId: string): ViewerLiveSnapshot {
  return {
    v: 1,
    sessionId,
    updatedAt: Date.now(),
    sport: "darts",
    game: "unknown",
    phase: "lobby",
    title: "Multisports Scoring",
    screen: "waiting",
    activePlayerId: null,
    players: [],
    meta: { text: "En attente du lancement de la partie" },
    source: "viewer",
  };
}
