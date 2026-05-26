// =============================================================
// src/lib/tournaments/onlineStore.ts
// Ligues / championnats / tournois ONLINE — stockage NAS générique
// Compatible multi-sport : darts, babyfoot, pétanque, pingpong, molkky, etc.
// =============================================================

import { apiGet, apiPost, apiPut, apiDelete } from "../apiClient";

export type OnlineCompetitionKind = "league" | "championship" | "tournament" | "cup";

export type OnlineCompetitionPayload = {
  id?: string;
  name: string;
  sport?: string;
  mode?: string;
  kind?: OnlineCompetitionKind | string;
  status?: string;
  tournament?: any;
  matches?: any[];
  settings?: Record<string, any>;
  participants?: any[];
  source?: "online";
};

function normalizeItem(row: any) {
  const payload = row?.payload || row?.tournament || {};
  const tournament = payload?.tournament || payload || {};
  return {
    ...(tournament || {}),
    id: row?.id || tournament?.id,
    source: "online",
    onlineCompetitionId: row?.id || tournament?.onlineCompetitionId || tournament?.id,
    name: row?.name || tournament?.name || "Compétition online",
    status: row?.status || tournament?.status || "draft",
    sport: row?.sport || tournament?.sport || tournament?.game?.sport || "darts",
    kind: row?.kind || tournament?.kind || tournament?.viewKind || "tournament",
    game: tournament?.game || { mode: row?.mode || row?.sport || "x01", rules: {} },
    createdAt: Date.parse(row?.createdAt || row?.created_at || "") || tournament?.createdAt || Date.now(),
    updatedAt: Date.parse(row?.updatedAt || row?.updated_at || "") || tournament?.updatedAt || Date.now(),
    __onlineRow: row,
  };
}

export async function listOnlineCompetitions(opts: { sport?: string; mode?: string; kind?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.sport) q.set("sport", opts.sport);
  if (opts.mode) q.set("mode", opts.mode);
  if (opts.kind) q.set("kind", opts.kind);
  if (opts.limit) q.set("limit", String(opts.limit));
  const res = await apiGet(`/online/competitions${q.toString() ? `?${q.toString()}` : ""}`);
  const items = Array.isArray(res?.items) ? res.items : [];
  return items.map(normalizeItem);
}

export async function getOnlineCompetition(id: string) {
  const res = await apiGet(`/online/competitions/${encodeURIComponent(String(id || ""))}`);
  return normalizeItem(res?.item || res);
}

export async function saveOnlineCompetition(payload: OnlineCompetitionPayload) {
  const body = {
    name: payload.name || payload.tournament?.name || "Compétition online",
    sport: payload.sport || payload.tournament?.sport || payload.tournament?.game?.sport || payload.tournament?.game?.mode || "darts",
    mode: payload.mode || payload.tournament?.game?.mode || payload.sport || "x01",
    kind: payload.kind || payload.tournament?.meta?.competitionKind || payload.tournament?.viewKind || "tournament",
    status: payload.status || payload.tournament?.status || "draft",
    settings: payload.settings || payload.tournament?.game?.rules || {},
    participants: payload.participants || payload.tournament?.players || [],
    payload: {
      tournament: { ...(payload.tournament || payload), source: "online" },
      matches: Array.isArray(payload.matches) ? payload.matches : [],
    },
  };
  const res = await apiPost("/online/competitions", body);
  return normalizeItem(res?.item || res);
}

export async function updateOnlineCompetition(id: string, patch: Partial<OnlineCompetitionPayload>) {
  const res = await apiPut(`/online/competitions/${encodeURIComponent(String(id || ""))}`, patch);
  return normalizeItem(res?.item || res);
}

export async function deleteOnlineCompetition(id: string) {
  return apiDelete(`/online/competitions/${encodeURIComponent(String(id || ""))}`);
}
