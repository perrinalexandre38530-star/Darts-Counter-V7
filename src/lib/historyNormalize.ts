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
  const raw = String(row?.status || "").toLowerCase();
  if (raw === "finished") return "finished";

  const s = row?.summary || decoded?.summary || decoded?.result || decoded?.stats || {};
  if (s?.finished === true) return "finished";
  if (s?.result?.finished === true) return "finished";
  if (s?.winnerId) return "finished";
  if (Array.isArray(s?.rankings) && s.rankings.length) return "finished";

  if (raw === "in_progress" || raw === "inprogress") return "in_progress";
  return "in_progress";
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
