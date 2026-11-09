/**
 * A small, device-local recovery envelope for finished TOSSIT games awaiting
 * the authoritative History V4 IndexedDB upsert. This is NOT a second history.
 * The envelope is removed only after the caller reports a successful commit.
 */
import type { TossitMode, TossitPlayer, TossitState, TossitEvent } from "./tossitEngine";

export interface TossitFinishedMatch {
  id: string;
  kind: "tossit";
  sport: "tossit";
  mode: TossitMode;
  status: "finished";
  winnerId: string | null;
  players: TossitPlayer[];
  createdAt: number;
  updatedAt: number;
  finishedAt: number;
  summary: Record<string, unknown>;
  payload: {
    sport: "tossit";
    mode: TossitMode;
    dartsPerPlayer: number;
    players: TossitPlayer[];
    events: TossitEvent[];
    scores: Record<string, number>;
    winnerId: string | null;
  };
}

export interface TossitPendingResult {
  version: 1;
  state: TossitState;
  match: TossitFinishedMatch;
}

export function tossitMatchId(state: Pick<TossitState, "createdAt" | "mode">): string {
  return `tossit-${state.createdAt}-${state.mode}`;
}

/** Bounded snapshot: the full undo chain is unnecessary for a completed game. */
export function encodeTossitPendingResult(state: TossitState, match: TossitFinishedMatch): string | null {
  if (!state.finished || match.id !== tossitMatchId(state) || match.mode !== state.mode || match.status !== "finished") return null;
  const encoded = JSON.stringify({ version: 1, state: { ...state, previous: null }, match } satisfies TossitPendingResult);
  return encoded.length <= 2_000_000 ? encoded : null;
}

/** Reject unrelated or damaged entries rather than showing a fake completed game. */
export function decodeTossitPendingResult(
  raw: string | null,
  isSupportedMode: (mode: unknown) => boolean,
): TossitPendingResult | null {
  if (!raw || raw.length > 2_000_000) return null;
  try {
    const entry = JSON.parse(raw) as TossitPendingResult;
    const state = entry?.state;
    const match = entry?.match;
    if (entry.version !== 1 || !state || !match || !state.finished || !isSupportedMode(state.mode) ||
      match.kind !== "tossit" || match.sport !== "tossit" || match.status !== "finished" ||
      match.mode !== state.mode || match.id !== tossitMatchId(state) || match.createdAt !== state.createdAt ||
      !Number.isFinite(state.createdAt) || !Number.isFinite(match.finishedAt) ||
      !Array.isArray(state.players) || !state.players.length || state.players.length > 10 ||
      state.players.some(p => typeof p?.id !== "string" || !p.id || typeof p.name !== "string" || !p.name.trim()) ||
      new Set(state.players.map(p => p.id)).size !== state.players.length ||
      !Array.isArray(state.events) || state.events.length > 5000 || !state.scores ||
      !Array.isArray(match.players) || match.players.length !== state.players.length ||
      match.players.some((p, i) => p?.id !== state.players[i]?.id) ||
      match.winnerId !== state.winnerId ||
      match.payload?.sport !== "tossit" || match.payload?.mode !== state.mode ||
      match.payload?.dartsPerPlayer !== state.dartsPerPlayer ||
      !Array.isArray(match.payload?.events) || match.payload.events.length !== state.events.length ||
      !match.payload?.scores ||
      state.players.some(p => match.payload.scores[p.id] !== state.scores[p.id]) ||
      !match.summary || typeof match.summary !== "object") return null;
    return { version: 1, state: { ...state, previous: null }, match };
  } catch { return null; }
}
