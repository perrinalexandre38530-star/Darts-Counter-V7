// ============================================
// src/lib/historyNormalize.ts
// Normalise une ligne History en "match exploitable stats"
// ============================================

import type { SavedMatch } from "./history";
import { decodeHistoryPayload } from "./historyDecode";

export type NormalizedMatch = {
  id: string;
  kind: string; // x01/cricket/killer/shanghai/...
  status: "in_progress" | "finished";
  createdAt: number;
  updatedAt: number;
  playerIds: string[];
  payloadDecoded: any | null; // {config, summary, stats}
  config: any;
  summary: any;
  stats: any;
};

const getId = (v: any) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
};

const pickKind = (row: any, decoded: any) => {
  const k = String(row?.kind || "").toLowerCase();
  const gm = String(row?.game?.mode || "").toLowerCase();
  const dm = String(decoded?.config?.mode || decoded?.game?.mode || decoded?.mode || "").toLowerCase();

  // cas legacy "leg" => x01
  if (k === "leg") return gm || dm || "x01";
  return k || gm || dm || "x01";
};

const pickStatus = (row: any, decoded: any): "in_progress" | "finished" => {
  const finishedTokens = new Set(["finished", "finish", "done", "match_end", "match-end", "ended", "complete", "completed"]);
  const liveTokens = new Set(["in_progress", "inprogress", "playing", "live", "running", "started", "active"]);
  const norm = (value: any) => String(value ?? "").trim().toLowerCase();
  const summary = row?.summary || decoded?.summary || {};

  const hasIrreversibleFinish =
    summary?.finished === true || summary?.result?.finished === true ||
    row?.payload?.summary?.finished === true || decoded?.summary?.finished === true ||
    row?.resume?.state?.finished === true || row?.payload?.state?.finished === true || row?.payload?.stateSnapshot?.finished === true ||
    !!row?.finishedAt || !!summary?.finishedAt || !!row?.payload?.finishedAt;
  if (hasIrreversibleFinish) return "finished";

  const rootStatus = norm(row?.status);
  if (finishedTokens.has(rootStatus)) return "finished";
  if (liveTokens.has(rootStatus)) return "in_progress";

  const matchTokens = [
    row?.summary?.status,
    row?.payload?.status,
    row?.payload?.summary?.status,
    decoded?.status,
    decoded?.summary?.status,
  ].map(norm).filter(Boolean);
  if (matchTokens.some((token) => finishedTokens.has(token))) return "finished";
  if (matchTokens.some((token) => liveTokens.has(token))) return "in_progress";

  const snapshotTokens = [
    row?.resume?.state?.status,
    row?.resume?.state?.phase,
    row?.payload?.state?.status,
    row?.payload?.state?.phase,
    row?.payload?.stateSnapshot?.status,
    row?.payload?.stateSnapshot?.phase,
    decoded?.state?.status,
    decoded?.state?.phase,
  ].map(norm).filter(Boolean);
  if (snapshotTokens.some((token) => finishedTokens.has(token))) return "finished";
  if (snapshotTokens.some((token) => liveTokens.has(token))) return "in_progress";

  const winnerId =
    row?.winnerId || summary?.winnerId || summary?.result?.winnerId ||
    row?.payload?.winnerId || row?.payload?.summary?.winnerId ||
    decoded?.winnerId || decoded?.summary?.winnerId || decoded?.result?.winnerId || null;
  if (winnerId) return "finished";
  return "finished";
};

export async function normalizeHistoryRow(row: SavedMatch): Promise<NormalizedMatch> {
  const anyRow: any = row as any;

  const decoded = typeof anyRow.payload === "string" ? await decodeHistoryPayload(anyRow.payload) : null;

  const kind = pickKind(anyRow, decoded);
  const status = pickStatus(anyRow, decoded);

  const createdAt = Number(anyRow.createdAt || Date.now());
  const updatedAt = Number(anyRow.updatedAt || anyRow.createdAt || Date.now());

  const playersArr = Array.isArray(anyRow.players) ? anyRow.players : [];
  const playerIds = playersArr.map(getId).filter(Boolean);

  const config = decoded?.config || decoded?.game || decoded?.x01?.config || {};
  const summary =
    decoded?.summary ||
    decoded?.result ||
    decoded?.stats ||
    anyRow.summary ||
    {};
  const stats = decoded?.stats || decoded?.detail || {};

  return {
    id: String(anyRow.id),
    kind,
    status,
    createdAt,
    updatedAt,
    playerIds,
    payloadDecoded: decoded,
    config,
    summary,
    stats,
  };
}
