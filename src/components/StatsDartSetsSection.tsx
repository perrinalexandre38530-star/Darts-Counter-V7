// @ts-nocheck
// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// ✅ FIX UI: une seule carte PLEINE LARGEUR (pas de carrousel scroll), centrée, nav ← →
// ✅ FIX DATA: si statsByDartSet est incomplet => recalcul robuste depuis History (legacy + V3)
// ✅ FIX PHOTO: résolution image preset/set blindée + fallback propre
// ✅ FIX KPI: First9 / Checkout% / Doubles% / Records / HITS S/D/T / Miss / Bust (fallback History)
// ✅ FIX SPARKLINE: série AVG/3D depuis History si pas dispo
// ✅ NEW RADAR: mini “cible” SVG numérotée 1..20 + 25/DB/Miss (à la place d’un radar vide)
// ✅ NEW HITS PAR SEGMENT: mini stacks S/D/T/Miss (fallback History)
// ✅ FIX PHOTO (NEW): supporte preset “créé depuis Profils”
// - champs hétérogènes (photo / image / thumb / dataUrl / file/blob / nested)
// - crée ObjectURL si Blob/File
// - deep-scan 2 niveaux si champs inconnus
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";
import { dartPresets } from "../lib/dartPresets";
import { getX01StatsByDartSetForProfile } from "../lib/statsByDartSet";
import { History } from "../lib/history";
import { loadStore } from "../lib/storage";
import TrainingRadar from "./TrainingRadar";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt1(n: number) {
  return N(n, 0).toFixed(1);
}
function fmt0(n: number) {
  return String(Math.round(N(n, 0)));
}
function fmtPct1(n: number) {
  return N(n, 0).toFixed(1);
}
function safeLower(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

const COMPARE_COLORS = ["#B7FF00", "#FF4FD8", "#24F0D2", "#47B5FF", "#B56CFF", "#7FE2A9", "#F6C256", "#FF8A5B"];
function compareColor(index: number, accent?: string) {
  if (index === 0 && accent) return accent;
  return COMPARE_COLORS[index % COMPARE_COLORS.length];
}

function isX01Record(r: any): boolean {
  const kind = safeLower(r?.kind);
  const game = safeLower(r?.game);
  const mode = safeLower(r?.mode);
  const variant = safeLower(r?.variant);
  if (kind === "x01" || kind === "x01v3") return true;
  if (game === "x01" || game === "x01v3") return true;
  if (mode === "x01" || mode === "x01v3") return true;
  if (variant === "x01" || variant === "x01v3") return true;
  return false;
}

function isFinishedX01StatsRecord(r: any): boolean {
  const status = String(r?.status ?? r?.state ?? "").trim().toLowerCase();
  if (!status) return true;
  if (["finished", "finish", "completed", "complete", "done", "ended", "end", "saved"].includes(status)) return true;
  const summary = r?.summary ?? r?.payload?.summary ?? r?.payload?.payload?.summary ?? {};
  if (summary?.finished === true || summary?.result?.finished === true) return true;
  if (summary?.winnerId || summary?.winnerName || r?.winnerId || r?.payload?.winnerId) return true;
  return false;
}

/* ============================================================= */
/* -------------------- URL / IMAGE HELPERS -------------------- */
/* ============================================================= */

const blobUrlCache = typeof WeakMap !== "undefined" ? new WeakMap<any, string>() : null;

function looksLikeImageUrl(s: string) {
  const v = String(s || "").trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  if (v.startsWith("blob:")) return true;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  // vite/webpack asset
  if (v.startsWith("/") || v.startsWith("./") || v.startsWith("../") || v.startsWith("assets/")) return true;
  // fichier
  if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v)) return true;
  return false;
}

function normalizeAssetUrl(u: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  // vite public assets parfois sans "/"
  if (s.startsWith("assets/")) return `/${s}`;
  return s;
}

function isBlobLike(v: any) {
  if (!v) return false;
  // Blob et File
  if (typeof Blob !== "undefined" && v instanceof Blob) return true;
  return false;
}

function blobToObjectUrl(v: any): string | null {
  if (!isBlobLike(v)) return null;
  try {
    if (blobUrlCache && blobUrlCache.has(v)) return blobUrlCache.get(v) || null;
    const url = URL.createObjectURL(v);
    if (blobUrlCache) blobUrlCache.set(v, url);
    return url;
  } catch {
    return null;
  }
}

function asUrl(v: any): string | null {
  if (!v) return null;

  // string direct
  if (typeof v === "string") return normalizeAssetUrl(v);

  // Blob/File
  const b = blobToObjectUrl(v);
  if (b) return b;

  // objet (imports, wrappers)
  if (typeof v === "object") {
    const cand =
      v.default ||
      v.src ||
      v.url ||
      v.uri ||
      v.href ||
      v.path ||
      v.dataUrl ||
      v.dataURL ||
      v.imageDataUrl ||
      v.imageURL ||
      v.photoDataUrl ||
      v.photoURL ||
      v.thumb ||
      v.thumbnail ||
      v.image ||
      v.img ||
      null;

    if (typeof cand === "string" && looksLikeImageUrl(cand)) return normalizeAssetUrl(cand);

    // nested classique
    const nested =
      v?.image?.url ||
      v?.image?.src ||
      v?.image?.dataUrl ||
      v?.photo?.url ||
      v?.photo?.src ||
      v?.photo?.dataUrl ||
      v?.thumb?.url ||
      v?.thumb?.src ||
      null;

    if (typeof nested === "string" && looksLikeImageUrl(nested)) return normalizeAssetUrl(nested);

    // blob nested
    const nb =
      blobToObjectUrl(v?.file) ||
      blobToObjectUrl(v?.blob) ||
      blobToObjectUrl(v?.imageBlob) ||
      blobToObjectUrl(v?.photoBlob) ||
      null;
    if (nb) return nb;
  }

  return null;
}

function deepFindImage(obj: any, depth = 2): string | null {
  if (!obj || depth < 0) return null;

  if (typeof obj === "string") return looksLikeImageUrl(obj) ? normalizeAssetUrl(obj) : null;

  const direct = asUrl(obj);
  if (direct) return direct;

  if (typeof obj !== "object") return null;

  // priorité keys "image/photo/img/thumb"
  const keys = Object.keys(obj || []);
  const scoreKey = (k: string) => {
    const kk = k.toLowerCase();
    if (kk.includes("photo")) return 0;
    if (kk.includes("image")) return 1;
    if (kk.includes("img")) return 2;
    if (kk.includes("thumb") || kk.includes("mini")) return 3;
    if (kk.includes("url") || kk.includes("src")) return 4;
    return 10;
  };

  const sorted = keys.slice().sort((a, b) => scoreKey(a) - scoreKey(b));

  for (const k of sorted) {
    const v = (obj as any)[k];
    const u = asUrl(v);
    if (u) return u;
  }

  for (const k of sorted) {
    const v = (obj as any)[k];
    const u = deepFindImage(v, depth - 1);
    if (u) return u;
  }

  return null;
}

/* ============================================================= */

function presetById(id: string) {
  const sid = String(id || "");
  return (dartPresets || []).find((p: any) => String(p?.id) === sid) || null;
}
function presetByName(name: string) {
  const n = safeLower(name);
  if (!n) return null;
  return (
    (dartPresets || []).find((p: any) => safeLower(p?.name) === n) ||
    (dartPresets || []).find((p: any) => safeLower(p?.name).includes(n)) ||
    (dartPresets || []).find((p: any) => n.includes(safeLower(p?.name))) ||
    null
  );
}

// ✅ élargi + deep scan
function presetImage(pr: any): string | null {
  if (!pr) return null;

  // champs connus
  const u =
    asUrl(pr.imgUrlThumb) ||
    asUrl(pr.imgUrlMain) ||
    asUrl(pr.imgUrl) ||
    asUrl(pr.imageUrlThumb) ||
    asUrl(pr.imageUrlMain) ||
    asUrl(pr.imageUrl) ||
    asUrl(pr.photoUrl) ||
    asUrl(pr.photoDataUrl) ||
    asUrl(pr.imageDataUrl) ||
    asUrl(pr.dataUrl) ||
    asUrl(pr.thumb) ||
    asUrl(pr.thumbnail) ||
    asUrl(pr.imageThumb) ||
    asUrl(pr.imageMain) ||
    asUrl(pr.image) ||
    asUrl(pr.img) ||
    asUrl(pr.url) ||
    asUrl(pr.src) ||
    null;

  if (u) return u;

  // preset créé depuis Profils: souvent un objet "photo"/"file"/"blob"/nested
  const deep = deepFindImage(pr, 2);
  return deep || null;
}

function pickAccent(theme: any) {
  return theme?.primary || theme?.accent || theme?.colors?.primary || "#F6C256";
}

function pickPerPlayer(summary: any): any[] {
  if (!summary) return [];
  if (Array.isArray(summary.perPlayer)) return summary.perPlayer;
  if (Array.isArray(summary.players)) return summary.players;

  if (summary.players && typeof summary.players === "object") {
    return Object.entries(summary.players).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  if (summary.perPlayer && typeof summary.perPlayer === "object") {
    return Object.entries(summary.perPlayer).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  return [];
}

// ✅ important: profileId / playerId / pid / uid etc.
function resolveProfileId(pp: any): string | null {
  return (
    (pp?.profileId ?? null) ||
    (pp?.playerId ?? null) ||
    (pp?.pid ?? null) ||
    (pp?.uid ?? null) ||
    (pp?.id ?? null) ||
    null
  );
}
function resolveDartSetId(pp: any): string | null {
  return (pp?.dartSetId ?? null) || (pp?.dartPresetId ?? null) || (pp?.dartsetId ?? null) || (pp?.presetId ?? null) || null;
}

function pickRecordPlayers(r: any): any[] {
  const candidates = [
    r?.players,
    r?.payload?.players,
    r?.payload?.config?.players,
    r?.config?.players,
    r?.resume?.players,
    r?.resume?.config?.players,
    r?.summary?.players,
    r?.payload?.summary?.players,
  ];
  const out: any[] = [];
  for (const c of candidates) {
    if (!Array.isArray(c)) continue;
    for (const p of c) {
      if (p && typeof p === "object") out.push(p);
    }
  }
  return out;
}


function collectCandidatePlayerIds(r: any, profileId: string | null | undefined, pp?: any): Set<string> {
  const ids = new Set<string>();
  const add = (v: any) => {
    if (v !== null && v !== undefined && String(v).trim()) ids.add(String(v));
  };

  add(profileId);
  add(resolveProfileId(pp));
  add(pp?.id);
  add(pp?.profileId);
  add(pp?.playerId);
  add(pp?.pid);
  add(pp?.uid);

  // Historique X01 : le profil actif peut être stocké dans players[].profileId
  // alors que summary.players est indexé par players[].id. On ajoute donc les 2.
  for (const player of pickRecordPlayers(r)) {
    const vals = [player?.id, player?.profileId, player?.playerId, player?.pid, player?.uid];
    const hit = vals.some((v) => v !== null && v !== undefined && ids.has(String(v)));
    if (hit) vals.forEach(add);
  }

  return ids;
}

function readDartSetMapFromRecord(r: any): Record<string, any> | null {
  const map =
    r?.payload?.meta?.dartSetIdsByPlayer ??
    r?.meta?.dartSetIdsByPlayer ??
    r?.resume?.meta?.dartSetIdsByPlayer ??
    r?.resume?.payload?.meta?.dartSetIdsByPlayer ??
    r?.payload?.dartSetIdsByPlayer ??
    r?.dartSetIdsByPlayer ??
    null;
  return map && typeof map === "object" ? map : null;
}

function resolveDartSetIdFromRecord(r: any, profileId: string, pp?: any): string | null {
  const direct = resolveDartSetId(pp);
  if (direct) return String(direct);

  const ids = collectCandidatePlayerIds(r, profileId, pp);

  const map = readDartSetMapFromRecord(r);
  if (map) {
    for (const id of ids) {
      const v = map[id];
      if (v) return String(v);
    }
    // Certains historiques keyent dartSetIdsByPlayer par nom affiché plutôt que par id.
    const names = [
      pp?.name,
      pp?.playerName,
      pp?.profileName,
      pp?.displayName,
      pp?.nickname,
    ]
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean);
    for (const name of names) {
      const directName = map[name];
      if (directName) return String(directName);
      const low = name.toLowerCase();
      for (const [k, v] of Object.entries(map)) {
        if (String(k).trim().toLowerCase() === low && v) return String(v);
      }
    }
  }

  for (const player of pickRecordPlayers(r)) {
    const pid = resolveProfileId(player);
    const rawId = player?.id ?? player?.profileId ?? player?.playerId ?? player?.pid ?? null;
    if ((pid && ids.has(String(pid))) || (rawId && ids.has(String(rawId)))) {
      const ds = resolveDartSetId(player);
      if (ds) return String(ds);
    }
  }

  const global =
    r?.dartSetId ??
    r?.payload?.dartSetId ??
    r?.payload?.meta?.dartSetId ??
    r?.meta?.dartSetId ??
    r?.summary?.dartSetId ??
    r?.payload?.summary?.dartSetId ??
    r?.payload?.config?.dartSetId ??
    r?.config?.dartSetId ??
    null;

  return global ? String(global) : null;
}

function makeLegacyStatsRowFromRecord(r: any, pid: string, base: any = {}): any | null {
  const summary = r?.summary ?? r?.payload?.summary ?? r?.payload?.payload?.summary ?? null;
  const legacy = summary?.legacy ?? r?.legacy ?? r?.payload?.legacy ?? r?.payload?.summary?.legacy ?? null;
  if (!legacy || !pid) return null;
  const get = (key: string) => legacy?.[key]?.[pid];
  const row: any = {
    ...(base || {}),
    id: base?.id ?? pid,
    playerId: base?.playerId ?? pid,
    profileId: base?.profileId ?? pid,
    name: base?.name,
    dartSetId: base?.dartSetId ?? null,
    dartPresetId: base?.dartPresetId ?? null,
    avg3: get("avg3"),
    bestVisit: get("bestVisit"),
    bestCheckout: get("bestCheckout"),
    darts: get("darts"),
    visits: get("visits"),
    _sumPoints: get("points"),
    hitsS: get("singles"),
    hitsD: get("doubles"),
    hitsT: get("triples"),
    bull: get("bulls"),
    dBull: get("dbulls"),
    miss: get("misses"),
    bust: get("busts"),
    checkoutHits: get("checkoutHits"),
    checkoutAttempts: get("checkoutAttempts"),
    buckets: {
      "60+": N(get("h60"), 0),
      "100+": N(get("h100"), 0),
      "140+": N(get("h140"), 0),
      "180": N(get("h180"), 0),
    },
    hitsBySector: get("hitsBySector"),
  };
  const hasNumbers = ["avg3", "bestVisit", "darts", "_sumPoints", "hitsS", "hitsD", "hitsT", "miss", "bull", "dBull", "bust"].some((k) => Number(row[k] || 0) > 0);
  return hasNumbers ? row : null;
}

function mergeStatsRowsForDartSet(...rows: any[]): any | null {
  const valid = rows.filter((r) => r && typeof r === "object");
  if (!valid.length) return null;
  const out: any = {};
  for (const r of valid) {
    for (const [k, v] of Object.entries(r)) {
      if (v == null || v === "") continue;
      const cur = out[k];
      if (cur == null || cur === "") {
        out[k] = v;
        continue;
      }
      if (typeof v === "number" && (!Number.isFinite(Number(cur)) || Number(cur) === 0) && Number(v) !== 0) {
        out[k] = v;
        continue;
      }
      if (k === "buckets" && v && typeof v === "object") out.buckets = { ...(cur || {}), ...(v as any) };
      if ((k === "segments" || k === "hitsBySegment" || k === "segmentsByHit" || k === "hitsBySector") && v && typeof v === "object") {
        out[k] = { ...(cur || {}), ...(v as any) };
      }
    }
  }
  return out;
}

function resolvePlayerStatsRowFromRecord(r: any, profileId: string, playerName = ""): any | null {
  const summary = r?.summary ?? r?.payload?.summary ?? r?.payload?.payload?.summary ?? null;
  const perPlayer = pickPerPlayer(summary);
  const ids = collectCandidatePlayerIds(r, profileId, null);
  const wantedName = String(playerName || "").trim().toLowerCase();
  const rowName = (x: any) => String(x?.name ?? x?.playerName ?? x?.profileName ?? x?.displayName ?? x?.nickname ?? "").trim().toLowerCase();
  const idVals = (x: any) => [resolveProfileId(x), x?.id, x?.profileId, x?.playerId, x?.pid, x?.uid].filter((v) => v !== null && v !== undefined && String(v).trim());

  const allRows: any[] = [];
  const push = (x: any) => { if (x && typeof x === "object") allRows.push(x); };

  // 1) Les lignes players du record portent souvent dartSetId + name, mais peu/pas de stats.
  for (const p of pickRecordPlayers(r)) push(p);
  // 2) Les lignes summary.players/perPlayer portent les stats, mais pas toujours dartSetId.
  for (const pp of perPlayer) push(pp);
  // 3) detailedByPlayer contient parfois les compteurs détaillés.
  const detailed = summary?.detailedByPlayer ?? r?.payload?.summary?.detailedByPlayer ?? null;
  if (detailed && typeof detailed === "object") {
    for (const [pid, v] of Object.entries(detailed)) push({ playerId: pid, ...(v as any) });
  }

  // On élargit les alias par nom ET par id. C'est le point qui cassait “Mes fléchettes” :
  // la carte player trouvait le dartSet, mais la ligne stats était ailleurs sous playerId/name.
  for (const row of allRows) {
    const nm = rowName(row);
    const hitByName = !!wantedName && !!nm && nm === wantedName;
    const hitById = idVals(row).some((v) => ids.has(String(v)));
    if (hitByName || hitById) idVals(row).forEach((v) => ids.add(String(v)));
  }

  const matched = allRows.filter((row) => {
    const nm = rowName(row);
    return idVals(row).some((v) => ids.has(String(v))) || (!!wantedName && !!nm && nm === wantedName);
  });

  // Ajoute les maps legacy utilisées par X01End/History : legacy.avg3[pid], legacy.darts[pid], etc.
  const legacyRows: any[] = [];
  for (const row of matched) {
    for (const pid of idVals(row)) {
      const lr = makeLegacyStatsRowFromRecord(r, String(pid), row);
      if (lr) legacyRows.push(lr);
    }
  }
  if (!legacyRows.length) {
    for (const id of ids) {
      const lr = makeLegacyStatsRowFromRecord(r, String(id), null);
      if (lr) legacyRows.push(lr);
    }
  }

  return mergeStatsRowsForDartSet(...matched, ...legacyRows);
}

function pickNum(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}
function countNumValues(obj: any): number {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((sum: number, v: any) => sum + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
}
function pickAvg3FromRow(r: any): number | null {
  return pickNum(r, "avg3", "avg3d", "avgPer3", "avgPerThree", "average3", "avg", "moy3", "moyenne3", "mean3");
}
function pickDartsFromRow(r: any): number {
  return N(pickNum(r, "darts", "_sumDarts", "sumDarts", "totalDarts", "nbDarts", "thrown", "throws", "totalThrows", "dartsThrown", "dartsUsed", "dartsCount", "countDarts"), 0);
}
function pickPointsFromRow(r: any): number {
  const direct = pickNum(r, "_sumPoints", "sumPoints", "points", "scoredPoints", "totalPoints", "pointsScored", "score", "totalScore");
  if (direct !== null) return Number(direct);
  const avg = pickAvg3FromRow(r);
  const darts = pickDartsFromRow(r);
  return avg !== null && darts > 0 ? (Number(avg) * darts) / 3 : 0;
}
function pickHitCount(r: any, mult: "S" | "D" | "T"): number {
  const h = r?.hits && typeof r.hits === "object" ? r.hits : null;
  const seg = r?.segments && typeof r.segments === "object" ? r.segments : null;
  if (mult === "S") return N(pickNum(r, "hitsS", "s", "singles", "single", "S") ?? h?.S ?? h?.s, 0) || countNumValues(seg?.S ?? r?.bySegmentS);
  if (mult === "D") return N(pickNum(r, "hitsD", "d", "doubles", "double", "D") ?? h?.D ?? h?.d, 0) || countNumValues(seg?.D ?? r?.bySegmentD);
  return N(pickNum(r, "hitsT", "t", "triples", "triple", "T") ?? h?.T ?? h?.t, 0) || countNumValues(seg?.T ?? r?.bySegmentT);
}
function pickMissCount(r: any): number {
  const h = r?.hits && typeof r.hits === "object" ? r.hits : null;
  return N(pickNum(r, "miss", "misses", "missCount", "nbMiss") ?? h?.M ?? h?.miss ?? h?.misses, 0);
}
function pickBucket(r: any, key: string): number {
  const b = r?.buckets && typeof r.buckets === "object" ? r.buckets : null;
  return N(b?.[key], 0);
}
function pickObj(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = r?.[k];
    if (v && typeof v === "object") return v;
  }
  return null;
}
function pickArr(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = r?.[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

function fmtDateShort(ts: any) {
  const d = new Date(ts || 0);
  if (!Number.isFinite(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

type MiniMatch = {
  id: string;
  at: number;
  dateLabel: string;
  label: string; // WIN / LOSE
  score?: string;
  opponent?: string;
  avg3?: number | null;
};

function isWinnerForPlayerFromSummary(summary: any, mine: any, profileId: string, playerName = "") {
  const winnerId =
    summary?.winnerId ??
    summary?.winnerPid ??
    summary?.winnerPlayerId ??
    summary?.winnerProfileId ??
    null;

  const mineId = String(resolveProfileId(mine) ?? "");
  const winnerName = String(
    summary?.winnerName ?? summary?.winnerPlayerName ?? summary?.winnerProfileName ?? summary?.winner?.name ?? ""
  ).trim().toLowerCase();
  const mineName = nameOfPlayerLike(mine) || String(playerName || "").trim().toLowerCase();

  return (
    mine?.isWinner === true ||
    mine?.win === true ||
    mine?.won === true ||
    mine?.result === "win" ||
    mine?.status === "win" ||
    (winnerId && String(winnerId) === String(profileId)) ||
    (winnerId && mineId && String(winnerId) === mineId) ||
    (winnerName && mineName && winnerName === mineName) ||
    (N(mine?.remaining ?? mine?.scoreRemaining ?? mine?.finalScore, NaN) === 0 && N(mine?.bestCheckout ?? mine?.bestCO, 0) > 0)
  );
}

function buildRecentMatchesMap(allHistory: any[], profileId: string, playerName = ""): Record<string, MiniMatch[]> {
  const map: Record<string, MiniMatch[]> = {};

  for (const r of allHistory || []) {
    if (!isX01Record(r)) continue;

    if (!isFinishedX01StatsRecord(r)) continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    const mine = resolvePlayerStatsRowFromRecord(r, profileId, playerName);
    if (!mine) continue;

    const dsid = resolveDartSetIdFromRecord(r, profileId, mine);
    if (!dsid) continue;

    const at =
      N(r?.endedAt, 0) ||
      N(r?.finishedAt, 0) ||
      N(r?.createdAt, 0) ||
      N(r?.at, 0) ||
      N(r?.ts, 0) ||
      Date.now();

    const others = perPlayer.filter((pp: any) => String(resolveProfileId(pp) ?? "") !== String(profileId));
    const oppName =
      (others[0]?.name ?? null) ||
      (others[0]?.playerName ?? null) ||
      (others[0]?.profileName ?? null) ||
      null;

    const winnerId =
      summary?.winnerId ??
      summary?.winnerPid ??
      summary?.winnerPlayerId ??
      summary?.winnerProfileId ??
      null;

    const mineId = String(resolveProfileId(mine) ?? "");
    const winnerName = String(
      summary?.winnerName ?? summary?.winnerPlayerName ?? summary?.winnerProfileName ?? summary?.winner?.name ?? ""
    ).trim().toLowerCase();
    const mineName = nameOfPlayerLike(mine) || String(playerName || "").trim().toLowerCase();

    const isWinner =
      mine?.isWinner === true ||
      mine?.win === true ||
      mine?.won === true ||
      mine?.result === "win" ||
      mine?.status === "win" ||
      (winnerId && String(winnerId) === String(profileId)) ||
      (winnerId && mineId && String(winnerId) === mineId) ||
      (winnerName && mineName && winnerName === mineName) ||
      (N(mine?.remaining ?? mine?.scoreRemaining ?? mine?.finalScore, NaN) === 0 && N(mine?.bestCheckout ?? mine?.bestCO, 0) > 0);

    const legsW = pickNum(mine, "legsWin", "legsWon", "legsW");
    const legsL = pickNum(mine, "legsLose", "legsLost", "legsL");
    const setsW = pickNum(mine, "setsWin", "setsWon", "setsW");
    const setsL = pickNum(mine, "setsLose", "setsLost", "setsL");

    let score: string | undefined = undefined;
    if (setsW !== null || setsL !== null) {
      score = `${N(setsW, 0)}-${N(setsL, 0)}`;
      if (legsW !== null || legsL !== null) score += ` • ${N(legsW, 0)}-${N(legsL, 0)}`;
    } else if (legsW !== null || legsL !== null) {
      score = `${N(legsW, 0)}-${N(legsL, 0)}`;
    }

    const avg3 =
      pickAvg3FromRow(mine) ??
      pickNum(summary, "avg3", "avg3d") ??
      (() => {
        const pts = pickPointsFromRow(mine);
        const darts = pickDartsFromRow(mine);
        return darts > 0 && pts > 0 ? (pts / darts) * 3 : null;
      })();

    const item: MiniMatch = {
      id: String(r?.id ?? r?.matchId ?? `${dsid}-${at}`),
      at,
      dateLabel: fmtDateShort(at),
      label: isWinner ? "WIN" : "LOSE",
      score,
      opponent: oppName ? String(oppName) : undefined,
      avg3,
    };

    (map[String(dsid)] ||= []).push(item);
  }

  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => b.at - a.at);
    map[k] = map[k].slice(0, 12);
  }

  return map;
}

/** ---------- Segments parsing (S/D/T + Bull/DB + Miss) ---------- **/

type SegDetail = {
  S: number;
  D: number;
  T: number;
  MISS: number;
  B: number; // 25
  DB: number; // D25
};
type SegDetailMap = Record<string, SegDetail>; // key: "1".."20" + "25" + "DB" + "MISS"

function blankSeg(): SegDetail {
  return { S: 0, D: 0, T: 0, MISS: 0, B: 0, DB: 0 };
}

function normalizeSegKey(k: string) {
  return String(k || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
}

function parseSegKey(raw: string): { mult: "S" | "D" | "T" | "MISS" | "B" | "DB"; num: string } | null {
  const k = normalizeSegKey(raw);

  if (!k) return null;

  if (k === "MISS" || k === "M" || k === "0") return { mult: "MISS", num: "MISS" };

  if (k === "B" || k === "BULL" || k === "SBULL" || k === "S25" || k === "25") return { mult: "B", num: "25" };
  if (k === "DB" || k === "DBULL" || k === "D25" || k === "50") return { mult: "DB", num: "DB" };

  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const mult = m[1] as any;
    const num = String(Number(m[2]));
    const n = Number(num);
    if (Number.isFinite(n) && n >= 1 && n <= 20) return { mult, num };
    if (n === 25) return mult === "D" ? { mult: "DB", num: "DB" } : { mult: "B", num: "25" };
  }

  const n2 = Number(k);
  if (Number.isFinite(n2) && n2 >= 1 && n2 <= 20) return { mult: "S", num: String(n2) };

  return null;
}

function mergeDetail(dst: SegDetail, add: Partial<SegDetail>) {
  dst.S += N(add.S, 0);
  dst.D += N(add.D, 0);
  dst.T += N(add.T, 0);
  dst.MISS += N(add.MISS, 0);
  dst.B += N(add.B, 0);
  dst.DB += N(add.DB, 0);
}

function extractSegmentsObjectFromPlayer(pp: any): any | null {
  return (
    pp?.segments ||
    pp?.hitsBySegment ||
    pp?.segmentHits ||
    pp?.segmentsHits ||
    pp?.hitsSegments ||
    pp?.segHits ||
    pp?.hitsBySeg ||
    pp?.bySegment ||
    pp?.hitsBySector ||
    pp?.sectorMap ||
    null
  );
}

function addParsedSegmentHit(outRaw: Record<string, number>, outDetail: SegDetailMap, key: any, value: any, forcedMult?: "S" | "D" | "T" | "MISS" | "B" | "DB") {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return;

  let parsed = parseSegKey(String(key));
  if (!parsed && forcedMult) {
    const kk = normalizeSegKey(String(key));
    if (kk === "25" || kk === "BULL" || kk === "SBULL") parsed = { mult: forcedMult === "DB" ? "DB" : forcedMult === "MISS" ? "MISS" : "B", num: forcedMult === "DB" ? "DB" : forcedMult === "MISS" ? "MISS" : "25" } as any;
    else {
      const nn = Number(kk);
      if (Number.isFinite(nn) && nn >= 1 && nn <= 20) parsed = { mult: forcedMult, num: String(nn) } as any;
    }
  }
  if (!parsed) return;

  const rawKey = parsed.mult === "MISS" ? "MISS" : parsed.mult === "B" ? "SB" : parsed.mult === "DB" ? "DB" : `${parsed.mult}${parsed.num}`;
  outRaw[rawKey] = (outRaw[rawKey] || 0) + n;

  if (parsed.mult === "MISS") {
    outDetail.MISS ||= blankSeg();
    outDetail.MISS.MISS += n;
  } else if (parsed.mult === "B") {
    outDetail["25"] ||= blankSeg();
    outDetail["25"].B += n;
  } else if (parsed.mult === "DB") {
    outDetail["DB"] ||= blankSeg();
    outDetail["DB"].DB += n;
  } else {
    outDetail[parsed.num] ||= blankSeg();
    (outDetail[parsed.num] as any)[parsed.mult] += n;
  }
}

function absorbSegmentsObject(outRaw: Record<string, number>, outDetail: SegDetailMap, obj: any) {
  if (!obj || typeof obj !== "object") return;

  // Formats groupés : { S:{20:3}, D:{5:1}, T:{20:2}, MISS:1 }
  const groupKeys: Array<[string, "S" | "D" | "T" | "MISS" | "B" | "DB"]> = [
    ["S", "S"], ["SIMPLE", "S"], ["SINGLES", "S"], ["SIMPLEHITS", "S"],
    ["D", "D"], ["DOUBLE", "D"], ["DOUBLES", "D"], ["DOUBLEHITS", "D"],
    ["T", "T"], ["TRIPLE", "T"], ["TRIPLES", "T"], ["TRIPLEHITS", "T"],
    ["B", "B"], ["BULL", "B"], ["BULL25", "B"], ["SB", "B"], ["SBULL", "B"],
    ["DB", "DB"], ["DBULL", "DB"], ["DOUBLEBULL", "DB"], ["D25", "DB"],
    ["MISS", "MISS"], ["MISSES", "MISS"],
  ];

  for (const [rawGroup, forced] of groupKeys) {
    const group = (obj as any)[rawGroup] ?? (obj as any)[rawGroup.toLowerCase()];
    if (group == null) continue;
    if (typeof group === "number") {
      addParsedSegmentHit(outRaw, outDetail, forced === "MISS" ? "MISS" : forced === "DB" ? "DB" : forced === "B" ? "25" : rawGroup, group, forced);
    } else if (typeof group === "object") {
      for (const [seg, count] of Object.entries(group)) addParsedSegmentHit(outRaw, outDetail, seg, count, forced);
    }
  }

  // Formats directs : { S20:2, D5:1, T20:2, SB:1, DB:1, MISS:1 }
  // Formats imbriqués : { 20:{S:2,D:0,T:3}, 5:{S:1}, 25:{B:1,DB:0} }
  for (const [k, v] of Object.entries(obj)) {
    const kk = normalizeSegKey(k);
    if (groupKeys.some(([g]) => g === kk)) continue;

    if (typeof v === "number") {
      addParsedSegmentHit(outRaw, outDetail, k, v);
      continue;
    }

    if (v && typeof v === "object") {
      const nestedKeys = ["S", "D", "T", "B", "DB", "MISS", "s", "d", "t", "b", "db", "miss", "simple", "double", "triple", "bull", "dbull", "misses"];
      let usedNested = false;
      for (const nk of nestedKeys) {
        if ((v as any)[nk] == null) continue;
        usedNested = true;
        const up = normalizeSegKey(nk);
        const forced = up === "S" || up === "SIMPLE" ? "S" : up === "D" || up === "DOUBLE" ? "D" : up === "T" || up === "TRIPLE" ? "T" : up === "B" || up === "BULL" ? "B" : up === "DB" || up === "DBULL" ? "DB" : "MISS";
        addParsedSegmentHit(outRaw, outDetail, k, (v as any)[nk], forced as any);
      }
      // Dernier recours : objet type {count: n, mult:'T'}
      if (!usedNested) {
        const count = Number((v as any).count ?? (v as any).hits ?? (v as any).value ?? 0);
        const multRaw = normalizeSegKey((v as any).mult ?? (v as any).multiplier ?? (v as any).type ?? (v as any).ring ?? "");
        const forced = multRaw === "3" || multRaw === "T" || multRaw === "TRIPLE" ? "T" : multRaw === "2" || multRaw === "D" || multRaw === "DOUBLE" ? "D" : multRaw === "MISS" ? "MISS" : "S";
        addParsedSegmentHit(outRaw, outDetail, k, count, forced as any);
      }
    }
  }
}

function extractSegmentsDetailFromSources(rowLike: any, mine: any): { rawMap: Record<string, number>; detail: SegDetailMap } {
  const outRaw: Record<string, number> = {};
  const outDetail: SegDetailMap = {};

  const objA =
    rowLike?.segments ||
    pickObj(rowLike, "hitsBySegment", "segmentsHits", "hitsSegments", "segmentHits", "hitsBySeg", "segHits", "segmentsMap", "bySegment") ||
    null;

  const objB = extractSegmentsObjectFromPlayer(mine);

  const allObjs = [objA, objB].filter(Boolean);
  for (const obj of allObjs) absorbSegmentsObject(outRaw, outDetail, obj);

  return { rawMap: outRaw, detail: outDetail };
}

function detailToTopStacks(detail: SegDetailMap, limit = 12) {
  const items = Object.entries(detail)
    .filter(([k]) => k !== "MISS")
    .map(([k, d]) => {
      const total = N(d.S) + N(d.D) + N(d.T) + N(d.B) + N(d.DB) + N(d.MISS);
      return { k, ...d, total };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return items;
}

/** ---------- Sparkline helpers ---------- **/

function extractSparkValuesFromRow(r: any, recent: MiniMatch[]): number[] {
  const evo = Array.isArray(r?.evoAvg3) ? r.evoAvg3 : null;
  if (evo && evo.length) {
    const vals = evo.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n) && n > 0);
    if (vals.length) return vals.slice(-18);
  }

  const arr = pickArr(r, "spark", "sparkline", "avg3Spark", "avg3Series", "seriesAvg3", "lastAvg3") || null;
  if (arr && arr.length) {
    const vals = arr.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n) && n > 0);
    if (vals.length) return vals.slice(-18);
  }

  const vals2 = (recent || [])
    .slice()
    .reverse()
    .map((m) => N(m?.avg3, NaN))
    .filter((n) => Number.isFinite(n) && n > 0) as number[];
  if (vals2.length) return vals2.slice(-18);

  const single = pickNum(r, "avg3", "avg3d", "avgPer3", "average3");
  return single && single > 0 ? [single] : [];
}

function detailToOrderedStacks(detail: SegDetailMap) {
  const order: (string | number)[] = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25, "MISS"];
  return order.map((seg) => {
    const k = String(seg);
    if (k === "25") {
      const b = detail?.["25"] || blankSeg();
      const db = detail?.["DB"] || blankSeg();
      const S = N(b.B, 0) + N(b.S, 0);
      const D = N(db.DB, 0) + N(b.DB, 0) + N(db.D, 0);
      const T = N(b.T, 0) + N(db.T, 0);
      const MISS = N(b.MISS, 0) + N(db.MISS, 0);
      return { k, label: "25", S, D, T, MISS, B: S, DB: D, total: S + D + T + MISS };
    }
    if (k === "MISS") {
      const d = detail?.MISS || blankSeg();
      const MISS = N(d.MISS, 0) + N(d.S, 0) + N(d.D, 0) + N(d.T, 0);
      return { k, label: "MISS", S: 0, D: 0, T: 0, MISS, B: 0, DB: 0, total: MISS };
    }
    const d = detail?.[k] || blankSeg();
    const S = N(d.S, 0);
    const D = N(d.D, 0);
    const T = N(d.T, 0);
    const MISS = N(d.MISS, 0);
    return { k, label: k, S, D, T, MISS, B: N(d.B, 0), DB: N(d.DB, 0), total: S + D + T + MISS + N(d.B, 0) + N(d.DB, 0) };
  });
}

/** ---------- Nom + image ---------- **/

function resolveSetName(id: string, mySets: DartSet[], t: any) {
  const sid = String(id ?? "");
  const mine = (mySets || []).find((s: any) => String(s?.id) === sid) || null;
  if (mine?.name) return String(mine.name);

  const pr = (dartPresets || []).find((p: any) => String(p?.id) === sid) || null;
  if (pr?.name) return String(pr.name);

  return t?.("stats.dartSets.unknown", "Set inconnu") ?? "Set inconnu";
}

function resolveSetImage(id: string, mySets: DartSet[]) {
  const sid = String(id ?? "");
  const mine: any = (mySets || []).find((s: any) => String(s?.id) === sid) || null;

  // 1) custom set direct
  const mineImg =
    asUrl(mine?.photoDataUrl) ||
    asUrl(mine?.photoUrl) ||
    asUrl(mine?.imageDataUrl) ||
    asUrl(mine?.imageUrl) ||
    asUrl(mine?.imgUrlMain) ||
    asUrl(mine?.imgUrlThumb) ||
    asUrl(mine?.imgUrl) ||
    asUrl(mine?.photo) ||
    asUrl(mine?.image) ||
    asUrl(mine?.img) ||
    asUrl(mine?.file) ||
    asUrl(mine?.blob) ||
    deepFindImage(mine, 2) ||
    null;

  if (mineImg) return mineImg;

  // 2) resolve preset
  const myPresetId =
    mine?.dartPresetId ||
    mine?.presetId ||
    mine?.preset ||
    mine?.basePresetId ||
    mine?.refPresetId ||
    null;

  const prFromMine = myPresetId ? presetById(String(myPresetId)) : null;
  const prById = presetById(sid);
  const pr = prFromMine || prById || (mine?.name ? presetByName(String(mine.name)) : null);

  const prImg = presetImage(pr) || deepFindImage(pr, 2) || null;
  return prImg || null;
}

/** ---------- Recalc robuste depuis History ---------- **/


function extractStartScoreFromRecord(r: any): number {
  // try config paths (history shapes vary)
  return (
    N(r?.config?.startScore, 0) ||
    N(r?.payload?.config?.startScore, 0) ||
    N(r?.payload?.match?.config?.startScore, 0) ||
    N(r?.payload?.state?.config?.startScore, 0) ||
    N(r?.summary?.config?.startScore, 0) ||
    N(r?.payload?.summary?.config?.startScore, 0) ||
    501
  );
}

function extractScorePerVisit(mine: any, r: any): number[] {
  const arr =
    pickArr(mine, "scorePerVisit", "scoresPerVisit", "visitScores", "scores", "scoreByVisit") ||
    pickArr(r?.summary, "scorePerVisit", "scoresPerVisit") ||
    pickArr(r?.payload?.summary, "scorePerVisit", "scoresPerVisit") ||
    null;

  if (arr && arr.length) return arr.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n));
  return [];
}

function computeFirst9FromScorePerVisit(scores: number[]): number | null {
  if (!scores || scores.length < 1) return null;
  const first = scores.slice(0, 3);
  const m = first.reduce((a, b) => a + N(b, 0), 0) / Math.max(1, first.length);
  return Number.isFinite(m) ? m : null;
}

function computeCheckoutPctFromScorePerVisit(startScore: number, scores: number[]): { attempts: number; hits: number; pct: number } | null {
  if (!scores || scores.length < 1) return null;
  let remaining = N(startScore, 0) || 501;
  let attempts = 0;
  let hits = 0;

  for (const s of scores) {
    const v = Math.max(0, N(s, 0));
    if (remaining > 0 && remaining <= 170) attempts += 1;

    const next = remaining - v;
    if (next === 0) {
      hits += 1;
      remaining = 0;
      break;
    }
    // bust / invalid finish often recorded as 0 => remaining unchanged
    if (next > 0) remaining = next;
  }

  const pct = attempts > 0 ? (hits / attempts) * 100 : 0;
  return { attempts, hits, pct };
}

type AggRow = {
  dartSetId: string;
  matches: number;
  darts: number;

  avg3: number;
  first9: number;

  bestVisit: number;
  bestCheckout: number;

  checkoutPct: number;
  doublesPct: number;

  n180: number;
  n140: number;
  n100: number;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  bull: number;
  dBull: number;
  miss: number;
  bust: number;
  wins?: number;
  losses?: number;

  segments?: Record<string, number>;
  evoAvg3?: number[];
};


function parseDartLoose(raw: any): { value: number; mult: number; score: number; label: string } {
  // Les vraies volées X01 ne sont pas toutes stockées sous forme objet.
  // On rencontre aussi: "T20", "D16", "BULL", "DBULL", "MISS", 20, 0.
  if (typeof raw === "string" || typeof raw === "number") {
    const label0 = String(raw ?? "").trim().toUpperCase();
    if (!label0 || label0 === "MISS" || label0 === "M" || label0 === "0") return { value: 0, mult: 0, score: 0, label: "MISS" };
    if (label0 === "DB" || label0 === "DBULL" || label0 === "D25" || label0 === "50") return { value: 25, mult: 2, score: 50, label: "DB" };
    if (label0 === "BULL" || label0 === "SB" || label0 === "SBULL" || label0 === "S25" || label0 === "25") return { value: 25, mult: 1, score: 25, label: "SB" };
    const m0 = label0.match(/^([SDT])?(\d{1,2})$/);
    if (m0) {
      const value = Number(m0[2]) || 0;
      const mult = m0[1] === "T" ? 3 : m0[1] === "D" ? 2 : 1;
      if (value >= 1 && value <= 20) return { value, mult, score: value * mult, label: `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${value}` };
    }
  }

  const label = String(raw?.label ?? raw?.segmentLabel ?? raw?.dart ?? raw?.hit ?? raw?.segment ?? raw?.seg ?? raw?.target ?? "").trim().toUpperCase();
  let value = Number(raw?.number ?? raw?.num ?? raw?.n ?? raw?.segment ?? raw?.v ?? raw?.value ?? raw?.target ?? 0) || 0;
  let mult = Number(raw?.multiplier ?? raw?.mult ?? raw?.m ?? raw?.multi ?? 0) || 0;

  if (raw?.miss === true || raw?.type === "miss" || label === "MISS" || label === "M" || label === "0") return { value: 0, mult: 0, score: 0, label: "MISS" };
  if (raw?.dBull === true || raw?.dbull === true || label === "DB" || label === "DBULL" || label === "D25" || label === "50") return { value: 25, mult: 2, score: 50, label: "DB" };
  if (raw?.bull === true || label === "BULL" || label === "SB" || label === "SBULL" || label === "S25" || label === "25") return { value: 25, mult: 1, score: 25, label: "SB" };

  const m = label.match(/^([SDT])?(\d{1,2})$/);
  if (m) {
    value = Number(m[2]) || value;
    mult = m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1;
  }
  if (!mult) mult = value > 0 ? 1 : 0;
  if (value > 20 && value !== 25) value = 0;
  if (value === 25 && mult > 2) mult = 2;
  const score = Number(raw?.points ?? raw?.score ?? raw?.scored ?? NaN);
  const computed = value && mult ? (value === 25 && mult === 2 ? 50 : value * mult) : 0;
  const mm = mult === 3 ? "T" : mult === 2 ? "D" : mult === 1 ? "S" : "MISS";
  return { value, mult, score: Number.isFinite(score) ? score : computed, label: value ? `${mm}${value}` : "MISS" };
}

function playerAliasesForRecord(r: any, profileId: string, playerName = ""): Set<string> {
  const ids = collectCandidatePlayerIds(r, profileId, null);
  const wantedName = String(playerName || "").trim().toLowerCase();
  for (const p of pickRecordPlayers(r)) {
    const vals = [p?.id, p?.profileId, p?.playerId, p?.pid, p?.uid];
    const nm = String(p?.name ?? p?.playerName ?? p?.profileName ?? p?.displayName ?? p?.nickname ?? "").trim().toLowerCase();
    const hit = vals.some((v) => v !== null && v !== undefined && ids.has(String(v))) || (wantedName && nm === wantedName);
    if (hit) vals.forEach((v) => { if (v !== null && v !== undefined && String(v).trim()) ids.add(String(v)); });
  }
  return ids;
}

function nameOfPlayerLike(x: any): string {
  return String(x?.name ?? x?.playerName ?? x?.profileName ?? x?.displayName ?? x?.nickname ?? x?.label ?? "").trim().toLowerCase();
}

function collectPlayerNamesForRecord(r: any, profileId: string, playerName = ""): Set<string> {
  const names = new Set<string>();
  const addName = (v: any) => {
    const n = String(v ?? "").trim().toLowerCase();
    if (n) names.add(n);
  };
  addName(playerName);
  const ids = collectCandidatePlayerIds(r, profileId, null);
  for (const p of pickRecordPlayers(r)) {
    const vals = [p?.id, p?.profileId, p?.playerId, p?.pid, p?.uid];
    const nm = nameOfPlayerLike(p);
    const hitById = vals.some((v) => v !== null && v !== undefined && ids.has(String(v)));
    const hitByName = nm && names.has(nm);
    if (hitById || hitByName) {
      addName(nm);
      vals.forEach((v) => {
        if (v !== null && v !== undefined && String(v).trim()) ids.add(String(v));
      });
    }
  }
  return names;
}

function pickVisitArrays(r: any): any[] {
  const payload = r?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = r?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const legacy = summary?.legacy ?? payload?.legacy ?? r?.legacy ?? null;
  const roots = [r, payload, nested, summary, legacy, r?.state, payload?.state, payload?.match, nested?.state].filter(Boolean);
  const keys = [
    "visitHistory",
    "visitsHistory",
    "visits",
    "turns",
    "throwsHistory",
    "throwHistory",
    "rounds",
    "history",
  ];
  const out: any[] = [];
  const seen = new Set<any>();
  for (const root of roots) {
    for (const key of keys) {
      const arr = root?.[key];
      if (Array.isArray(arr) && arr.length && !seen.has(arr)) {
        seen.add(arr);
        out.push(...arr);
      }
    }
    const legArr = root?.__legStats?.visits;
    if (Array.isArray(legArr) && legArr.length && !seen.has(legArr)) {
      seen.add(legArr);
      out.push(...legArr);
    }
  }
  return out;
}

function visitBelongsToPlayer(v: any, aliases: Set<string>, names: Set<string>): boolean {
  const ids = [
    v?.p, v?.playerId, v?.pid, v?.profileId, v?.id, v?.uid, v?.ownerId,
    v?.player, v?.player?.id, v?.player?.profileId, v?.player?.playerId,
  ];
  if (ids.some((x) => x !== null && x !== undefined && aliases.has(String(x)))) return true;

  const directName = String(
    v?.name ?? v?.playerName ?? v?.profileName ?? v?.displayName ?? v?.nickname ??
    (typeof v?.player === "string" ? v.player : "")
  ).trim().toLowerCase();
  const nestedName = nameOfPlayerLike(v?.player);
  const nm = directName || nestedName || nameOfPlayerLike(v);
  if (nm && names.has(nm)) return true;
  return false;
}

function rawVisitsForPlayer(r: any, profileId: string, playerName = ""): any[] {
  const explicit = pickVisitArrays(r);
  if (!explicit.length) return [];
  const aliases = playerAliasesForRecord(r, profileId, playerName);
  const names = collectPlayerNamesForRecord(r, profileId, playerName);
  return explicit.filter((v: any) => visitBelongsToPlayer(v, aliases, names));
}

type RawVisitStats = {
  darts: number; points: number; bestVisit: number; bestCheckout: number;
  hitsS: number; hitsD: number; hitsT: number; bull: number; dBull: number; miss: number; bust: number;
  n180: number; n140: number; n100: number; segments: Record<string, number>; scorePerVisit: number[];
};

function computeRawVisitStats(r: any, profileId: string, playerName = ""): RawVisitStats | null {
  const visits = rawVisitsForPlayer(r, profileId, playerName);
  if (!visits.length) return null;
  const out: RawVisitStats = { darts: 0, points: 0, bestVisit: 0, bestCheckout: 0, hitsS: 0, hitsD: 0, hitsT: 0, bull: 0, dBull: 0, miss: 0, bust: 0, n180: 0, n140: 0, n100: 0, segments: {}, scorePerVisit: [] };
  for (const v of visits) {
    const segsRaw = Array.isArray(v?.segments)
      ? v.segments
      : Array.isArray(v?.darts)
      ? v.darts
      : Array.isArray(v?.throws)
      ? v.throws
      : Array.isArray(v?.shots)
      ? v.shots
      : Array.isArray(v?.items)
      ? v.items
      : [];
    const bust = v?.bust === true || v?.isBust === true || v?.busted === true;
    if (bust) out.bust += 1;
    let visitScore = Number(v?.score ?? v?.total ?? v?.points ?? v?.visitScore ?? v?.visitPoints ?? v?.value ?? NaN);
    const explicitDartsCount = N(
      v?.dartsCount ?? v?.dartsThrown ?? v?.nbDarts ?? v?.countDarts ?? v?.dartCount ??
        (typeof v?.darts === "number" ? v.darts : undefined),
      0
    );
    let computedScore = 0;
    for (const raw of segsRaw) {
      const d = parseDartLoose(raw);
      out.darts += 1;
      computedScore += d.score;
      if (d.value === 0 || d.mult === 0) { out.miss += 1; out.segments.MISS = (out.segments.MISS || 0) + 1; }
      else if (d.value === 25 && d.mult === 1) { out.bull += 1; out.segments.SB = (out.segments.SB || 0) + 1; }
      else if (d.value === 25 && d.mult === 2) { out.dBull += 1; out.segments.DB = (out.segments.DB || 0) + 1; }
      else {
        const key = `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.value}`;
        out.segments[key] = (out.segments[key] || 0) + 1;
        if (d.mult === 1) out.hitsS += 1;
        else if (d.mult === 2) out.hitsD += 1;
        else if (d.mult === 3) out.hitsT += 1;
      }
    }
    if (!segsRaw.length && explicitDartsCount > 0) out.darts += explicitDartsCount;
    if (!Number.isFinite(visitScore)) visitScore = computedScore;
    if (!bust) {
      out.points += Math.max(0, visitScore || 0);
      out.bestVisit = Math.max(out.bestVisit, Math.max(0, visitScore || 0));
      if (v?.finish || v?.isFinish || v?.checkout || v?.isCheckout) out.bestCheckout = Math.max(out.bestCheckout, Math.max(0, visitScore || 0));
      if (visitScore === 180) out.n180 += 1;
      if (visitScore >= 140) out.n140 += 1;
      if (visitScore >= 100) out.n100 += 1;
    }
    out.scorePerVisit.push(bust ? 0 : Math.max(0, visitScore || 0));
  }
  return out.darts > 0 ? out : null;
}

function computeAggFromHistory(allHistory: any[], profileId: string, playerName = ""): Record<string, AggRow> {
  const out: Record<string, AggRow> = {};

  for (const r of allHistory || []) {
    if (!isX01Record(r)) continue;

    if (!isFinishedX01StatsRecord(r)) continue;

    const summary = r?.summary ?? r?.payload?.summary ?? r?.payload?.payload?.summary ?? null;
    const mine = resolvePlayerStatsRowFromRecord(r, profileId, playerName);
    if (!mine) continue;

    const dsid = String(resolveDartSetIdFromRecord(r, profileId, mine) ?? "");
    if (!dsid) continue;

    const row = (out[dsid] ||= {
      dartSetId: dsid,
      matches: 0,
      darts: 0,
      avg3: 0,
      first9: 0,
      bestVisit: 0,
      bestCheckout: 0,
      checkoutPct: 0,
      doublesPct: 0,
      n180: 0,
      n140: 0,
      n100: 0,
      hitsS: 0,
      hitsD: 0,
      hitsT: 0,
      bull: 0,
      dBull: 0,
      miss: 0,
      bust: 0,
      wins: 0,
      losses: 0,
      segments: {},
      evoAvg3: [],
    });

    row.matches += 1;
    const isWinner = isWinnerForPlayerFromSummary(summary, mine, profileId, playerName);
    if (isWinner) row.wins = N(row.wins, 0) + 1;
    else row.losses = N(row.losses, 0) + 1;

    // Source prioritaire pour les anciens matchs X01 : les volées détaillées.
    // C'est exactement ce qui permet aux autres écrans stats de retrouver les AVG.
    const raw = computeRawVisitStats(r, profileId, playerName);

    const summaryDarts = pickDartsFromRow(mine);
    const summaryPoints = pickPointsFromRow(mine);
    const summaryAvg3 =
      pickAvg3FromRow(mine) ??
      pickNum(summary, "avg3", "avg3d") ??
      (summaryDarts > 0 && summaryPoints > 0 ? (summaryPoints / summaryDarts) * 3 : null);

    const avg3 = raw?.darts ? (raw.points / raw.darts) * 3 : summaryAvg3;
    if (avg3 !== null && Number.isFinite(Number(avg3))) row.evoAvg3.push(Number(avg3));

    row.darts += raw?.darts || summaryDarts;

    row.bestVisit = Math.max(
      row.bestVisit,
      raw?.bestVisit || 0,
      N(pickNum(mine, "bestVisit", "bestVolley", "bestThree", "best3", "bestScore"), 0)
    );
    row.bestCheckout = Math.max(
      row.bestCheckout,
      raw?.bestCheckout || 0,
      N(pickNum(mine, "bestCheckout", "bestCO", "bestOut"), 0)
    );

    const spv = raw?.scorePerVisit?.length ? raw.scorePerVisit : extractScorePerVisit(mine, r);

    const f9 = pickNum(mine, "first9", "first9Avg", "avgFirst9", "firstNine") ?? null;
    if (f9 !== null) row.first9 += Number(f9);
    else {
      const f9c = computeFirst9FromScorePerVisit(spv);
      if (f9c !== null) row.first9 += Number(f9c);
    }

    const coPct =
      pickNum(mine, "checkoutPct", "coPct", "checkoutPercent", "pctCheckout") ??
      pickNum(mine, "checkout%", "checkoutP") ??
      null;
    if (coPct !== null) row.checkoutPct += Number(coPct);
    else {
      const calc = computeCheckoutPctFromScorePerVisit(extractStartScoreFromRecord(r), spv);
      if (calc) row.checkoutPct += Number(calc.pct);
    }

    const summaryS = pickHitCount(mine, "S");
    const summaryD = pickHitCount(mine, "D");
    const summaryT = pickHitCount(mine, "T");
    const sHits = raw?.darts ? raw.hitsS : summaryS;
    const dHits = raw?.darts ? raw.hitsD : summaryD;
    const tHits = raw?.darts ? raw.hitsT : summaryT;

    const dPct =
      pickNum(mine, "doublesPct", "doublePct", "doublesPercent", "pctDoubles") ??
      pickNum(mine, "doubles%", "doublesP") ??
      null;
    if (dPct !== null) row.doublesPct += Number(dPct);
    else row.doublesPct += (dHits / Math.max(1, sHits + dHits + tHits)) * 100;

    row.n180 += raw?.n180 || N(pickNum(mine, "n180", "count180", "s180", "nb180", "h180") ?? pickBucket(mine, "180"), 0);
    row.n140 += raw?.n140 || N(pickNum(mine, "n140", "count140", "s140", "nb140", "h140") ?? pickBucket(mine, "140+"), 0);
    row.n100 += raw?.n100 || N(pickNum(mine, "n100", "count100", "s100", "nb100", "n100p", "n100Plus", "h100") ?? pickBucket(mine, "100+"), 0);

    row.hitsS += sHits;
    row.hitsD += dHits;
    row.hitsT += tHits;
    row.bull += raw?.darts ? raw.bull : N(pickNum(mine, "bull", "bulls", "hitsBull", "sbull", "BULL"), 0);
    row.dBull += raw?.darts ? raw.dBull : N(pickNum(mine, "dBull", "dbull", "dbulls", "hitsDBull", "DBULL"), 0);
    row.miss += raw?.darts ? raw.miss : pickMissCount(mine);
    row.bust += raw?.darts ? raw.bust : N(pickNum(mine, "bust", "busts", "bustCount", "nbBust"), 0);

    const segObj = raw?.segments && Object.keys(raw.segments).length ? raw.segments : extractSegmentsObjectFromPlayer(mine) || null;
    if (segObj) {
      const flatRaw: Record<string, number> = {};
      const flatDetail: SegDetailMap = {};
      absorbSegmentsObject(flatRaw, flatDetail, segObj);
      for (const [k, v] of Object.entries(flatRaw)) {
        const kk = normalizeSegKey(k);
        const n = Number(v);
        if (!kk || !Number.isFinite(n) || n <= 0) continue;
        row.segments[kk] = (row.segments[kk] || 0) + n;
      }
    }
  }

  for (const dsid of Object.keys(out)) {
    const row = out[dsid];
    const m = Math.max(1, row.matches);
    const arr = (row.evoAvg3 || []).filter((x: any) => Number.isFinite(Number(x)));
    row.avg3 = arr.length ? arr.reduce((a: number, b: number) => a + Number(b), 0) / arr.length : 0;
    row.first9 = row.first9 > 0 ? row.first9 / m : 0;
    row.checkoutPct = row.checkoutPct > 0 ? row.checkoutPct / m : 0;
    row.doublesPct = row.doublesPct > 0 ? row.doublesPct / m : 0;
    row.evoAvg3 = arr.slice(-18);
  }

  return out;
}

function mergeRowPreferNonZero(base: any, extra: any) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(extra || {})) {
    const cur = (out as any)[k];
    const isNum = typeof v === "number";
    if (cur == null || cur === "" || cur === "—") {
      (out as any)[k] = v;
      continue;
    }
    if (isNum && (Number(cur) === 0 || !Number.isFinite(Number(cur))) && Number(v) !== 0) {
      (out as any)[k] = v;
      continue;
    }
    if (k === "segments" && v && typeof v === "object") {
      (out as any).segments = { ...(cur || {}), ...(v as any) };
      continue;
    }
    if (Array.isArray(v) && Array.isArray(cur) && v.length && !cur.length) {
      (out as any)[k] = v;
      continue;
    }
  }
  return out;
}


/* ============================================================= */
/* ---------------- Comparateur dartsets ------------------------ */
/* ============================================================= */

type CompareMetricKey = "avg3" | "first9" | "checkoutPct" | "p100" | "p140" | "p180" | "bustPerMatch" | "winPct";

type CompareItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  row: any;
  recent: MiniMatch[];
  color: string;
  values: Record<string, number>;
};

const COMPARE_METRICS: Array<{ key: CompareMetricKey; label: string; short: string; suffix?: string; lowerIsBetter?: boolean }> = [
  { key: "avg3", label: "Avg 3D", short: "AVG" },
  { key: "first9", label: "First 9", short: "F9" },
  { key: "checkoutPct", label: "Checkout %", short: "CO", suffix: "%" },
  { key: "p100", label: "100+ / match", short: "100+" },
  { key: "p140", label: "140+ / match", short: "140+" },
  { key: "p180", label: "180 / match", short: "180" },
  { key: "bustPerMatch", label: "Busts / match", short: "Bust", lowerIsBetter: true },
  { key: "winPct", label: "Win %", short: "Win", suffix: "%" },
];

function rowMatches(row: any) {
  return Math.max(0, N(row?.matches, 0));
}

function rowWinPct(row: any, recent: MiniMatch[]) {
  const wins = N(row?.wins ?? row?.win ?? row?.victories ?? row?.winsCount, 0);
  const losses = N(row?.losses ?? row?.lose ?? row?.defeats ?? row?.lossesCount, 0);
  if (wins + losses > 0) return (wins / Math.max(1, wins + losses)) * 100;
  const rec = Array.isArray(recent) ? recent : [];
  if (!rec.length) return 0;
  return (rec.filter((m) => m?.label === "WIN").length / rec.length) * 100;
}

function rowMetricValue(row: any, key: CompareMetricKey, recent: MiniMatch[] = []) {
  const m = Math.max(1, rowMatches(row));
  if (key === "avg3") return N(pickNum(row, "avg3") ?? 0, 0);
  if (key === "first9") return N(pickNum(row, "first9") ?? 0, 0);
  if (key === "checkoutPct") return N(pickNum(row, "checkoutPct") ?? 0, 0);
  if (key === "p100") return N(pickNum(row, "n100") ?? 0, 0) / m;
  if (key === "p140") return N(pickNum(row, "n140") ?? 0, 0) / m;
  if (key === "p180") return N(pickNum(row, "n180") ?? 0, 0) / m;
  if (key === "bustPerMatch") return N(pickNum(row, "bust") ?? 0, 0) / m;
  if (key === "winPct") return rowWinPct(row, recent);
  return 0;
}

function buildCompareItems(rows: any[], mySets: DartSet[], recentBySet: Record<string, MiniMatch[]>, t: any, accent: string): CompareItem[] {
  return (rows || [])
    .filter((r: any) => String(r?.dartSetId || "").trim())
    .map((row: any, index: number) => {
      const id = String(row?.dartSetId || "");
      const recent = recentBySet?.[id] || [];
      const values: Record<string, number> = { matches: rowMatches(row) };
      for (const m of COMPARE_METRICS) values[m.key] = rowMetricValue(row, m.key, recent);
      return {
        id,
        name: resolveSetName(id, mySets, t),
        imageUrl: normalizeAssetUrl(resolveSetImage(id, mySets)),
        row,
        recent,
        color: compareColor(index, accent),
        values,
      };
    });
}

function fmtCompareValue(metric: CompareMetricKey | "matches", value: number) {
  if (metric === "matches") return fmt0(value);
  if (metric === "checkoutPct" || metric === "winPct") return `${fmtPct1(value)}%`;
  if (metric === "p100" || metric === "p140" || metric === "p180" || metric === "bustPerMatch") return N(value, 0).toFixed(2);
  return fmt1(value);
}

function bestItemFor(items: CompareItem[], metric: CompareMetricKey) {
  const def = COMPARE_METRICS.find((m) => m.key === metric);
  const candidates = (items || []).filter((it) => Number.isFinite(N(it.values?.[metric], NaN)));
  if (!candidates.length) return null;
  if (def?.lowerIsBetter) {
    const nonZero = candidates.filter((it) => N(it.values?.[metric], 0) > 0);
    const pool = nonZero.length ? nonZero : candidates;
    return pool.slice().sort((a, b) => N(a.values?.[metric], 0) - N(b.values?.[metric], 0))[0] || null;
  }
  return candidates.slice().sort((a, b) => N(b.values?.[metric], 0) - N(a.values?.[metric], 0))[0] || null;
}

function consistencyScore(values: number[]) {
  const vals = (values || []).map((v) => N(v, NaN)).filter((v) => Number.isFinite(v) && v > 0);
  if (vals.length < 2) return Infinity;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  return Math.sqrt(variance);
}

function bestConsistentItem(items: CompareItem[]) {
  const scored = (items || [])
    .map((it) => ({ it, score: consistencyScore(extractSparkValuesFromRow(it.row, it.recent)) }))
    .filter((x) => Number.isFinite(x.score));
  if (!scored.length) return null;
  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}

function metricSeriesForItem(item: CompareItem, metric: CompareMetricKey) {
  if (metric === "avg3") {
    const vals = extractSparkValuesFromRow(item.row, item.recent);
    if (vals.length) return vals.slice(-8);
  }
  const current = N(item.values?.[metric], 0);
  if (current <= 0) return [0, 0, 0, 0];
  // Les anciennes parties ne stockent pas toujours les séries par métrique.
  // On garde une micro-courbe stable pour permettre la comparaison visuelle sans inventer de grands écarts.
  return [current * 0.96, current * 0.985, current * 0.975, current];
}

function normalizedRadarValue(metric: CompareMetricKey, item: CompareItem, visible: CompareItem[]) {
  const def = COMPARE_METRICS.find((m) => m.key === metric);
  const values = (visible || []).map((x) => N(x.values?.[metric], 0)).filter((n) => Number.isFinite(n));
  const v = N(item.values?.[metric], 0);
  if (def?.lowerIsBetter) {
    const max = Math.max(1, ...values);
    return Math.max(0, Math.min(100, 100 - (v / max) * 100));
  }
  if (metric === "checkoutPct" || metric === "winPct") return Math.max(0, Math.min(100, v));
  const max = Math.max(1, ...values);
  return Math.max(0, Math.min(100, (v / max) * 100));
}

export default function StatsDartSetsSection(props: { activeProfileId: string | null; activePlayerName?: string | null; title?: string }) {
  const { activeProfileId, activePlayerName, title } = props;
  const { theme } = useTheme();
  const { t } = useLang() as any;

  const accent = pickAccent(theme);
  const accentSoft = `rgba(246,194,86,.22)`;

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [mySets, setMySets] = React.useState<DartSet[]>([]);
  const [recentBySet, setRecentBySet] = React.useState<Record<string, MiniMatch[]>>({});
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [statsTab, setStatsTab] = React.useState<"set" | "compare">("set");
  const [hiddenCompareIds, setHiddenCompareIds] = React.useState<Record<string, boolean>>({});
  const [compareMetric, setCompareMetric] = React.useState<CompareMetricKey>("avg3");

  React.useEffect(() => {
    if (!activeProfileId) return;
    const refreshSets = () => {
      try {
        setMySets(getDartSetsForProfile(activeProfileId) || []);
      } catch {
        setMySets([]);
      }
    };
    refreshSets();
    try { window.addEventListener("dc-dartsets-updated", refreshSets); } catch {}
    try { window.addEventListener("dc-linked-history-materialized", refreshSets as any); } catch {}
    try { window.addEventListener("dc-linked-profile-projection-updated", refreshSets as any); } catch {}
    return () => {
      try { window.removeEventListener("dc-dartsets-updated", refreshSets); } catch {}
      try { window.removeEventListener("dc-linked-history-materialized", refreshSets as any); } catch {}
      try { window.removeEventListener("dc-linked-profile-projection-updated", refreshSets as any); } catch {}
    };
  }, [activeProfileId]);

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      if (!activeProfileId) return;
      setLoading(true);
      setErr(null);

      try {
        const s = getDartSetsForProfile(activeProfileId);
        if (mounted) setMySets(s || []);
      } catch {
        if (mounted) setMySets([]);
      }

      try {
        const statsA = await getX01StatsByDartSetForProfile(activeProfileId).catch(() => []);
        const rowsA = Array.isArray(statsA) ? statsA : [];

        const [apiList, storeAny] = await Promise.all([History.list?.(), loadStore<any>().catch(() => null)]);
        const memList = Array.isArray(storeAny?.history) ? storeAny.history : [];
        const merged = [...(apiList || []), ...memList];

        const byId = new Map<string, any>();
        for (const r of merged) {
          const id = String(r?.id ?? "");
          if (!id) continue;
          const old = byId.get(id);
          if (!old) {
            byId.set(id, r);
            continue;
          }
          const tNew = Number(r?.updatedAt ?? r?.createdAt ?? r?.endedAt ?? 0);
          const tOld = Number(old?.updatedAt ?? old?.createdAt ?? old?.endedAt ?? 0);
          if (tNew >= tOld) byId.set(id, r);
        }
        const all = Array.from(byId.values());

        // ------------------------------------------------------------
        // Enrich complet X01 : History.list() ne donne que le header léger.
        // Les stats dartsets peuvent avoir besoin du payload détaillé (darts / visits).
        // On recharge donc les derniers X01 via History.get(id), même si le header
        // ne contient pas payloadCompressed (il est stocké dans le store detail).
        // ------------------------------------------------------------
        const sortedForEnrich = (all || []).slice().sort((a: any, b: any) => {
          const ta = N(a?.endedAt, 0) || N(a?.finishedAt, 0) || N(a?.updatedAt, 0) || N(a?.createdAt, 0) || 0;
          const tb = N(b?.endedAt, 0) || N(b?.finishedAt, 0) || N(b?.updatedAt, 0) || N(b?.createdAt, 0) || 0;
          return tb - ta;
        });

        const enrichedMap = new Map<string, any>();
        let enrichCount = 0;

        for (const rec of sortedForEnrich) {
          const id = String(rec?.id ?? rec?.matchId ?? "").trim();
          if (!id) continue;
          if (isX01Record(rec) && enrichCount < 120) {
            try {
              const full = await History.get(id);
              enrichedMap.set(id, full || rec);
              enrichCount += 1;
              continue;
            } catch {}
          }
          enrichedMap.set(id, rec);
        }

        const allEnriched = Array.from(enrichedMap.values());


        const recMap = buildRecentMatchesMap(allEnriched || [], activeProfileId, activePlayerName || "");
        if (mounted) setRecentBySet(recMap);

        const aggMap = computeAggFromHistory(allEnriched || [], activeProfileId, activePlayerName || "");

        const ids = new Set<string>();
        for (const r of rowsA) ids.add(String(r?.dartSetId || r?.dartPresetId || ""));
        for (const id of Object.keys(aggMap)) ids.add(String(id));

        const outRows = Array.from(ids)
          .filter(Boolean)
          .map((id) => {
            const a = rowsA.find((x: any) => String(x?.dartSetId || x?.dartPresetId || "") === String(id)) || { dartSetId: id };
            const b = aggMap[String(id)] || { dartSetId: id };
            const mergedRow = mergeRowPreferNonZero(a, b);
            mergedRow.dartSetId = String(mergedRow.dartSetId || id);
            return mergedRow;
          });

        outRows.sort((x: any, y: any) => N(pickNum(y, "avg3") ?? 0, 0) - N(pickNum(x, "avg3") ?? 0, 0));

        if (mounted) {
          setRows(outRows);
          setSelectedIdx(0);
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [activeProfileId, activePlayerName]);

  React.useEffect(() => {
    setSelectedIdx((i) => {
      const n = rows?.length || 0;
      if (!n) return 0;
      return Math.max(0, Math.min(n - 1, i));
    });
  }, [rows?.length]);

  const compareItems = React.useMemo(() => buildCompareItems(rows, mySets, recentBySet, t, accent), [rows, mySets, recentBySet, t, accent]);
  const visibleCompareItems = React.useMemo(() => {
    const visible = compareItems.filter((it) => !hiddenCompareIds?.[it.id]);
    return visible.length ? visible : compareItems.slice(0, 1);
  }, [compareItems, hiddenCompareIds]);

  if (!activeProfileId) return null;

  const cardBg = "linear-gradient(180deg, rgba(17,18,20,.94), rgba(13,14,17,.92))";
  const countPresets = rows?.length || 0;
  const top = rows?.[0] || null;

  const current = rows?.[selectedIdx] || null;

  const navPrev = () => setSelectedIdx((i) => Math.max(0, i - 1));
  const navNext = () => setSelectedIdx((i) => Math.min((rows?.length || 1) - 1, i + 1));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        margin: "0 auto",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,.10)",
        background: cardBg,
        boxShadow: "0 10px 26px rgba(0,0,0,.45)",
        padding: 12,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontWeight: 950,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: 1.0,
            color: accent,
            textShadow: `0 0 10px ${accent}, 0 0 22px rgba(0,0,0,.35)`,
          }}
        >
          {title || t("stats.dartSets.title", "Mes fléchettes")}
        </div>

        <div style={{ marginLeft: "auto" }}>
          <NeonCountKPI accent={accent} label={t("stats.dartSets.countLabel", "Nombre")} value={`${countPresets}`} />
        </div>
      </div>

      {!loading && !err && rows.length > 1 && (
        <DartSetsInnerTabs active={statsTab} accent={accent} onChange={setStatsTab} />
      )}

      {top && !loading && !err && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,.08)",
            background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), rgba(0,0,0,.28)`,
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.70)",
              fontWeight: 950,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {t("stats.dartSets.best", "Meilleur set")}
          </div>

          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  fontWeight: 950,
                  color: "#fff",
                  textAlign: "center",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textShadow: `0 0 12px ${accent}66, 0 0 26px ${accent}33`,
                }}
              >
                {resolveSetName(top.dartSetId, mySets, t)}
              </div>
            </div>

            <NeonKPIButton accent={accent} label={"AVG/3D"} value={fmt1(pickNum(top, "avg3") ?? 0)} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, padding: 8 }}>{t("common.loading", "Chargement...")}</div>
      ) : err ? (
        <div style={{ color: "#ff8a8a", fontSize: 12, padding: 8 }}>
          {t("common.error", "Erreur")} : {String(err)}
        </div>
      ) : !rows.length ? (
        <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, padding: 8 }}>
          {t("stats.dartSets.empty", "Aucune partie X01 trouvée pour ce profil.")}
        </div>
      ) : statsTab === "compare" && rows.length > 1 ? (
        <DartSetsComparator
          items={compareItems}
          visibleItems={visibleCompareItems}
          hiddenIds={hiddenCompareIds}
          onToggle={(id: string) => setHiddenCompareIds((prev) => ({ ...prev, [id]: !prev?.[id] }))}
          metric={compareMetric}
          onMetric={setCompareMetric}
          accent={accent}
          t={t}
        />
      ) : (
        <>
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "44px 1fr 44px",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowBtn disabled={selectedIdx <= 0} onClick={navPrev} />
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "rgba(255,255,255,.70)",
                fontWeight: 950,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {t("stats.dartSets.presetIndex", "Preset")} {selectedIdx + 1}/{rows.length}
            </div>
            <ArrowBtn right disabled={selectedIdx >= rows.length - 1} onClick={navNext} />
          </div>

          <div style={{ marginTop: 8 }}>
            <DartSetCard row={current} mySets={mySets} recent={recentBySet?.[String(current?.dartSetId || "")] || []} accent={accent} accentSoft={accentSoft} t={t} />
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            {t("stats.dartSets.note", "Ces stats sont calculées sur les matchs X01 terminés, groupées par set sélectionné.")}
          </div>
        </>
      )}
    </div>
  );
}


/* ============================================================= */
/* ---------------- Comparateur UI ----------------------------- */
/* ============================================================= */

function DartSetsInnerTabs(props: { active: "set" | "compare"; accent: string; onChange: (v: "set" | "compare") => void }) {
  const { active, accent, onChange } = props;
  const mk = (key: "set" | "compare", label: string) => {
    const on = active === key;
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        style={{
          minWidth: 0,
          height: 34,
          borderRadius: 999,
          border: `1px solid ${on ? accent + "99" : "rgba(255,255,255,.10)"}`,
          background: on ? `radial-gradient(circle at 50% 0%, ${accent}22, transparent 68%), rgba(0,0,0,.45)` : "rgba(0,0,0,.22)",
          color: on ? accent : "rgba(255,255,255,.68)",
          fontWeight: 950,
          letterSpacing: 0.45,
          textTransform: "uppercase",
          fontSize: 10.5,
          cursor: "pointer",
          boxShadow: on ? `0 0 18px ${accent}40` : "none",
          textShadow: on ? `0 0 12px ${accent}88` : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(0,0,0,.22)",
        padding: 6,
      }}
    >
      {mk("set", "Stats par set")}
      {mk("compare", "Comparateur")}
    </div>
  );
}

function DartSetsComparator(props: {
  items: CompareItem[];
  visibleItems: CompareItem[];
  hiddenIds: Record<string, boolean>;
  onToggle: (id: string) => void;
  metric: CompareMetricKey;
  onMetric: (m: CompareMetricKey) => void;
  accent: string;
  t: any;
}) {
  const { items, visibleItems, hiddenIds, onToggle, metric, onMetric, accent, t } = props;
  const bestAvg = bestItemFor(visibleItems, "avg3");
  const bestCheckout = bestItemFor(visibleItems, "checkoutPct");
  const regular = bestConsistentItem(visibleItems);

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.10)",
          background: `radial-gradient(circle at 0% 0%, ${accent}1f, transparent 62%), rgba(0,0,0,.25)`,
          padding: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: "#fff", letterSpacing: 0.2 }}>Comparateur des dartsets</div>
            <div style={{ marginTop: 3, fontSize: 11.5, color: "rgba(255,255,255,.58)", fontWeight: 800 }}>
              Moyennes par set, calculées sur les matchs X01 terminés du profil actif.
            </div>
          </div>
          <div
            title="Masque ou affiche un set dans les graphiques."
            style={{
              flex: "0 0 auto",
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.18)",
              color: "rgba(255,255,255,.70)",
              display: "grid",
              placeItems: "center",
              fontWeight: 950,
            }}
          >
            i
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(74px, 1fr))", gap: 8 }}>
          {items.map((it) => {
            const off = !!hiddenIds?.[it.id];
            return (
              <button
                type="button"
                key={it.id}
                onClick={() => onToggle(it.id)}
                title={it.name}
                style={{
                  minWidth: 0,
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  gap: 4,
                  borderRadius: 14,
                  border: `1px solid ${off ? "rgba(255,255,255,.10)" : it.color + "88"}`,
                  background: off ? "rgba(255,255,255,.035)" : `radial-gradient(circle at 50% 0%, ${it.color}18, transparent 70%), rgba(0,0,0,.24)`,
                  padding: "7px 6px 6px",
                  cursor: "pointer",
                  opacity: off ? 0.48 : 1,
                  boxShadow: off ? "none" : `0 0 14px ${it.color}24`,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 6,
                    borderRadius: 999,
                    border: `1px solid ${off ? "rgba(255,255,255,.14)" : it.color + "88"}`,
                    color: off ? "rgba(255,255,255,.45)" : it.color,
                    padding: "1px 5px",
                    fontSize: 9,
                    fontWeight: 950,
                    lineHeight: 1.1,
                    background: "rgba(0,0,0,.38)",
                  }}
                >
                  {off ? "👁̶" : "👁"}
                </span>
                <DartSetAvatarLabel item={it} size={42} nameMaxWidth={70} />
              </button>
            );
          })}
        </div>
      </div>

      <CompareSummaryStrip items={visibleItems} accent={accent} />
      <CompareRadarCard items={visibleItems} accent={accent} />
      <CompareLineCard items={visibleItems} metric={metric} onMetric={onMetric} accent={accent} />
      <CompareStatsTable items={visibleItems} accent={accent} />

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(0,0,0,.24)",
          padding: 10,
        }}
      >
        <BlockTitle title="À retenir" />
        <div style={{ marginTop: 9, display: "grid", gap: 8 }}>
          <InsightRow
            color={bestAvg?.color || accent}
            icon="🏆"
            item={bestAvg}
            title="Meilleur set actuel"
            value={bestAvg ? fmtCompareValue("avg3", bestAvg.values.avg3) : "—"}
            subtitle={bestCheckout && bestCheckout.id === bestAvg?.id ? "Meilleure moyenne / meilleur checkout" : "Meilleure moyenne AVG/3D"}
          />
          <InsightRow
            color={regular?.it?.color || "#FF4FD8"}
            icon="✦"
            item={regular?.it || null}
            title="Set le plus régulier"
            value={regular ? `σ ${fmt1(regular.score)}` : "—"}
            subtitle={regular ? "Écart-type AVG/3D le plus faible" : "Pas assez de matchs pour mesurer la régularité"}
          />
        </div>
        <div style={{ marginTop: 9, fontSize: 10.8, lineHeight: 1.35, color: "rgba(255,255,255,.52)", fontWeight: 800 }}>
          Le radar normalise les stats sur 100 pour comparer des valeurs qui n'ont pas la même échelle. Les valeurs exactes restent affichées dans les tableaux.
        </div>
      </div>
    </div>
  );
}

function CompareSummaryStrip(props: { items: CompareItem[]; accent: string }) {
  const { items, accent } = props;
  const best = bestItemFor(items, "avg3");
  const bestCo = bestItemFor(items, "checkoutPct");
  const lowestBust = bestItemFor(items, "bustPerMatch");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
      <MiniCompareKpi accent={best?.color || accent} label="Meilleure AVG" value={best ? fmtCompareValue("avg3", best.values.avg3) : "—"} item={best} />
      <MiniCompareKpi accent={bestCo?.color || "#24F0D2"} label="Meilleur CO" value={bestCo ? fmtCompareValue("checkoutPct", bestCo.values.checkoutPct) : "—"} item={bestCo} />
      <MiniCompareKpi accent={lowestBust?.color || "#7FE2A9"} label="Moins de bust" value={lowestBust ? fmtCompareValue("bustPerMatch", lowestBust.values.bustPerMatch) : "—"} item={lowestBust} />
    </div>
  );
}

function MiniCompareKpi(props: { accent: string; label: string; value: string; item?: CompareItem | null }) {
  const { accent, label, value, item } = props;
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 14,
        border: `1px solid ${accent}55`,
        background: `radial-gradient(circle at 50% 0%, ${accent}18, transparent 68%), rgba(0,0,0,.28)`,
        padding: "7px 6px",
        textAlign: "center",
        boxShadow: `0 0 14px ${accent}22`,
      }}
    >
      <div style={{ color: "rgba(255,255,255,.70)", fontSize: 9.2, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.25 }}>{label}</div>
      <div style={{ marginTop: 5, display: "grid", placeItems: "center" }}>
        {item ? <DartSetMiniAvatar item={item} size={32} /> : <span style={{ color: accent, fontSize: 18, fontWeight: 950 }}>—</span>}
      </div>
      <div style={{ marginTop: 4, color: accent, fontSize: 13.5, fontWeight: 950, textShadow: `0 0 12px ${accent}80` }}>{value}</div>
      {item ? <div style={{ marginTop: 2, color: "rgba(255,255,255,.58)", fontSize: 8.4, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div> : null}
    </div>
  );
}

function CompareRadarCard(props: { items: CompareItem[]; accent: string }) {
  const { items, accent } = props;
  return (
    <div style={compareCardStyle(accent)}>
      <BlockTitle title="Profil global" />
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
        <RadarCompareSvg items={items} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 10px" }}>
          {items.map((it) => <CompareAvatarLegend key={it.id} item={it} />)}
        </div>
      </div>
    </div>
  );
}

function RadarCompareSvg(props: { items: CompareItem[] }) {
  const items = props.items || [];
  const metrics: CompareMetricKey[] = ["avg3", "first9", "checkoutPct", "p100", "p140", "p180", "bustPerMatch", "winPct"];
  const labels = ["Avg 3D", "First 9", "CO %", "100+", "140+", "180", "Busts", "Win %"];
  const cx = 160;
  const cy = 134;
  const maxR = 92;
  const angleFor = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / metrics.length;
  const pt = (r: number, i: number) => {
    const a = angleFor(i);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const ring = (r: number) => metrics.map((_, i) => pt(r, i)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const pathFor = (it: CompareItem) => {
    const points = metrics.map((m, i) => pt((normalizedRadarValue(m, it, items) / 100) * maxR, i));
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  };

  return (
    <svg width="100%" viewBox="0 0 320 268" style={{ display: "block", overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={ring(maxR * k)} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1" />)}
      {metrics.map((_, i) => {
        const p = pt(maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,.08)" strokeWidth="1" />;
      })}
      {[25, 50, 75, 100].map((v) => <text key={v} x={cx + 5} y={cy - (maxR * v) / 100 + 4} fill="rgba(255,255,255,.62)" fontSize="10" fontWeight="800">{v}</text>)}
      {items.map((it) => (
        <g key={it.id}>
          <path d={pathFor(it)} fill={it.color} opacity="0.10" />
          <path d={pathFor(it)} fill="none" stroke={it.color} strokeWidth="2.4" strokeLinejoin="round" filter={`drop-shadow(0 0 5px ${it.color})`} />
          {metrics.map((m, i) => {
            const p = pt((normalizedRadarValue(m, it, items) / 100) * maxR, i);
            return <circle key={m} cx={p.x} cy={p.y} r="3" fill={it.color} stroke="rgba(0,0,0,.55)" strokeWidth="1" />;
          })}
        </g>
      ))}
      {labels.map((label, i) => {
        const p = pt(maxR + 25, i);
        const anchor = Math.abs(p.x - cx) < 8 ? "middle" : p.x > cx ? "start" : "end";
        return <text key={label} x={p.x} y={p.y + 4} textAnchor={anchor as any} fill="rgba(255,255,255,.78)" fontSize="11" fontWeight="850">{label}</text>;
      })}
    </svg>
  );
}

function CompareLineCard(props: { items: CompareItem[]; metric: CompareMetricKey; onMetric: (m: CompareMetricKey) => void; accent: string }) {
  const { items, metric, onMetric, accent } = props;
  const metricDefs = COMPARE_METRICS.filter((m) => ["avg3", "first9", "checkoutPct", "winPct"].includes(m.key));
  return (
    <div style={compareCardStyle(accent)}>
      <BlockTitle title="Évolution des performances" />
      <div style={{ marginTop: 9, display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
        {metricDefs.map((m) => {
          const on = m.key === metric;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onMetric(m.key)}
              style={{
                flex: "0 0 auto",
                borderRadius: 999,
                border: `1px solid ${on ? accent + "aa" : "rgba(255,255,255,.10)"}`,
                background: on ? `radial-gradient(circle at 50% 0%, ${accent}22, transparent 70%), rgba(0,0,0,.34)` : "rgba(0,0,0,.22)",
                color: on ? accent : "rgba(255,255,255,.72)",
                fontSize: 11,
                fontWeight: 950,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 8 }}>
        <LineCompareSvg items={items} metric={metric} />
      </div>
    </div>
  );
}

function LineCompareSvg(props: { items: CompareItem[]; metric: CompareMetricKey }) {
  const { items, metric } = props;
  const w = 340;
  const h = 152;
  const padL = 30;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const series = (items || []).map((it) => ({ it, vals: metricSeriesForItem(it, metric).slice(-6) }));
  const allVals = series.flatMap((s) => s.vals).filter((v) => Number.isFinite(N(v, NaN)));
  const min0 = Math.min(...(allVals.length ? allVals : [0]));
  const max0 = Math.max(...(allVals.length ? allVals : [100]));
  const pad = Math.max(2, (max0 - min0) * 0.15);
  const min = Math.max(0, min0 - pad);
  const max = max0 + pad;
  const span = Math.max(1e-6, max - min);
  const xFor = (i: number, len: number) => padL + (i * (w - padL - padR)) / Math.max(1, len - 1);
  const yFor = (v: number) => padT + (h - padT - padB) * (1 - (N(v, 0) - min) / span);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((k) => {
          const y = padT + k * (h - padT - padB);
          const val = max - k * span;
          return (
            <g key={k}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,.075)" strokeWidth="1" />
              <text x="3" y={y + 4} fill="rgba(255,255,255,.58)" fontSize="10" fontWeight="850">{fmt0(val)}</text>
            </g>
          );
        })}
        {series.map(({ it, vals }) => {
          const clean = vals.length > 1 ? vals : [0, ...vals];
          const d = clean.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i, clean.length).toFixed(1)} ${yFor(v).toFixed(1)}`).join(" ");
          return (
            <g key={it.id}>
              <path d={d} fill="none" stroke={it.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter={`drop-shadow(0 0 5px ${it.color})`} />
              {clean.map((v, i) => <circle key={i} cx={xFor(i, clean.length)} cy={yFor(v)} r="3" fill={it.color} stroke="rgba(0,0,0,.58)" strokeWidth="1" />)}
            </g>
          );
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const x = xFor(i, 6);
          return <text key={i} x={x} y={h - 5} textAnchor="middle" fill="rgba(255,255,255,.60)" fontSize="10" fontWeight="850">{i === 5 ? "M" : `M-${5 - i}`}</text>;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 10px", marginTop: 4 }}>
        {items.map((it) => <CompareAvatarLegend key={it.id} item={it} />)}
      </div>
    </div>
  );
}

function CompareStatsTable(props: { items: CompareItem[]; accent: string }) {
  const { items, accent } = props;
  const rows = [
    { key: "matches", label: "Matchs joués" },
    ...COMPARE_METRICS,
  ] as any[];
  const labelCol = 112;
  const itemCol = 58;
  const minW = Math.max(300, labelCol + items.length * itemCol);
  return (
    <div style={compareCardStyle(accent)}>
      <BlockTitle title="Moyennes détaillées" />
      <div style={{ marginTop: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
        <div style={{ minWidth: minW }}>
          <div style={{ display: "grid", gridTemplateColumns: `${labelCol}px repeat(${items.length}, minmax(${itemCol}px, 1fr))`, borderBottom: "1px solid rgba(255,255,255,.10)", paddingBottom: 6, alignItems: "end" }}>
            <div />
            {items.map((it) => (
              <div key={it.id} title={it.name} style={{ minWidth: 0, display: "grid", placeItems: "center", gap: 2 }}>
                <DartSetMiniAvatar item={it} size={34} />
                <div style={{ maxWidth: itemCol - 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,.62)", fontSize: 8.2, fontWeight: 850, lineHeight: 1.05 }}>{it.name}</div>
              </div>
            ))}
          </div>

          {rows.map((r) => {
            const metricKey = r.key as CompareMetricKey | "matches";
            const metricDef = COMPARE_METRICS.find((m) => m.key === metricKey);
            const values = items.map((it) => metricKey === "matches" ? N(it.values.matches, 0) : N(it.values[metricKey], 0));
            const finiteValues = values.filter((v) => Number.isFinite(v));
            const nonZeroValues = finiteValues.filter((v) => v > 0);
            const bestVal = metricDef?.lowerIsBetter
              ? Math.min(...(nonZeroValues.length ? nonZeroValues : finiteValues.length ? finiteValues : [0]))
              : Math.max(...finiteValues.concat([0]));
            return (
              <div key={r.key} style={{ display: "grid", gridTemplateColumns: `${labelCol}px repeat(${items.length}, minmax(${itemCol}px, 1fr))`, borderBottom: "1px solid rgba(255,255,255,.065)", minHeight: 28, alignItems: "center" }}>
                <div style={{ color: "rgba(255,255,255,.72)", fontSize: 10.7, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                {items.map((it, i) => {
                  const val = values[i];
                  const isBest = Number.isFinite(val) && Math.abs(val - bestVal) < 0.0001;
                  return (
                    <div key={it.id} style={{ textAlign: "center", color: isBest ? it.color : "rgba(255,255,255,.76)", fontSize: 11.4, fontWeight: isBest ? 950 : 850, textShadow: isBest ? `0 0 10px ${it.color}80` : "none" }}>
                      {fmtCompareValue(metricKey as any, val)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InsightRow(props: { color: string; icon: string; item?: CompareItem | null; title: string; value: string; subtitle: string }) {
  const { color, icon, item, title, value, subtitle } = props;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "62px 1fr 18px",
        alignItems: "center",
        gap: 10,
        borderRadius: 16,
        border: `1px solid ${color}66`,
        background: `radial-gradient(circle at 0% 0%, ${color}1f, transparent 68%), rgba(0,0,0,.26)`,
        padding: 10,
      }}
    >
      <div style={{ minWidth: 0, display: "grid", placeItems: "center", gap: 2 }}>
        {item ? <DartSetMiniAvatar item={item} size={46} /> : <div style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${color}88`, display: "grid", placeItems: "center", color, fontSize: 23, boxShadow: `0 0 18px ${color}32` }}>{icon}</div>}
        <div style={{ maxWidth: 60, color: "rgba(255,255,255,.58)", fontSize: 8.2, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.name || "—"}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "rgba(255,255,255,.66)", fontSize: 11, fontWeight: 850 }}>{title}</div>
        <div style={{ marginTop: 2, color, fontSize: 16.5, fontWeight: 950, lineHeight: 1.1, textShadow: `0 0 12px ${color}88`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
        <div style={{ marginTop: 3, color: "rgba(255,255,255,.72)", fontSize: 10.6, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>
      </div>
      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 22, fontWeight: 700 }}>›</div>
    </div>
  );
}

function DartSetMiniAvatar(props: { item: CompareItem; size?: number }) {
  const { item, size = 34 } = props;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        border: `1px solid ${item.color}88`,
        background: `radial-gradient(circle at 50% 0%, ${item.color}22, transparent 70%), rgba(0,0,0,.35)`,
        boxShadow: `0 0 14px ${item.color}30`,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} style={{ width: "86%", height: "86%", objectFit: "contain", filter: `drop-shadow(0 0 6px ${item.color}55)` }} />
      ) : (
        <span style={{ color: item.color, fontSize: Math.max(14, size * 0.42), fontWeight: 950, lineHeight: 1 }}>✦</span>
      )}
      <span style={{ position: "absolute", left: 4, bottom: 4, width: 6, height: 6, borderRadius: 999, background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
    </span>
  );
}

function DartSetAvatarLabel(props: { item: CompareItem; size?: number; nameMaxWidth?: number }) {
  const { item, size = 38, nameMaxWidth = 78 } = props;
  return (
    <span style={{ minWidth: 0, display: "grid", placeItems: "center", gap: 3 }}>
      <DartSetMiniAvatar item={item} size={size} />
      <span style={{ maxWidth: nameMaxWidth, color: "rgba(255,255,255,.70)", fontSize: 8.6, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.05 }}>
        {item.name}
      </span>
    </span>
  );
}

function CompareAvatarLegend(props: { item: CompareItem }) {
  const { item } = props;
  return (
    <span title={item.name} style={{ display: "inline-grid", placeItems: "center", gap: 2, minWidth: 44, color: "rgba(255,255,255,.72)" }}>
      <DartSetMiniAvatar item={item} size={28} />
      <span style={{ maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.2, fontWeight: 850, lineHeight: 1.05 }}>{item.name}</span>
    </span>
  );
}

function CompareLegend(props: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, color: "rgba(255,255,255,.72)", fontSize: 10.5, fontWeight: 850 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: props.color, boxShadow: `0 0 8px ${props.color}` }} />
      <span style={{ maxWidth: 116, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.label}</span>
    </span>
  );
}

function compareCardStyle(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: `radial-gradient(circle at 0% 0%, ${accent}0f, transparent 62%), rgba(0,0,0,.24)`,
    padding: 10,
    boxShadow: "0 8px 22px rgba(0,0,0,.30)",
    overflow: "hidden",
  };
}

/* ============================================================= */
/* ---------------- Card (plein écran) ------------------------- */
/* ============================================================= */

function DartSetCard(props: { row: any; mySets: DartSet[]; recent: MiniMatch[]; accent: string; accentSoft: string; t: any }) {
  const { row: r, mySets, recent, accent, accentSoft, t } = props;

  if (!r) return null;

  const id: string = String(r.dartSetId || "");
  const my: any = (mySets || []).find((s: any) => String(s?.id) === id) || null;

  const prDirect = !my ? presetById(id) : null;

  const myPresetId = my?.dartPresetId || my?.presetId || my?.preset || my?.basePresetId || my?.refPresetId || null;

  const prFromMyId = myPresetId ? presetById(String(myPresetId)) : null;
  const prFromMyName = !prFromMyId && my?.name ? presetByName(String(my.name)) : null;
  const pr = prDirect || prFromMyId || prFromMyName;

  const name = my?.name || pr?.name || t("stats.dartSets.unknown", "Set inconnu");

  // ✅ image robuste (custom/preset/Profils)
  const imgRaw = resolveSetImage(id, mySets);
  const img = normalizeAssetUrl(imgRaw);

  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [img]);

  const avg3v = pickNum(r, "avg3") ?? 0;

  const first9 = pickNum(r, "first9") ?? 0;
  const checkoutPct = pickNum(r, "checkoutPct") ?? 0;
  const doublesPct = pickNum(r, "doublesPct") ?? 0;

  const bestVisit = pickNum(r, "bestVisit") ?? 0;
  const bestCheckout = pickNum(r, "bestCheckout") ?? 0;

  const n180 = pickNum(r, "n180") ?? 0;
  const n140 = pickNum(r, "n140") ?? 0;
  const n100 = pickNum(r, "n100") ?? 0;

  const hitsS = pickNum(r, "hitsS") ?? 0;
  const hitsD = pickNum(r, "hitsD") ?? 0;
  const hitsT = pickNum(r, "hitsT") ?? 0;
  const bull = pickNum(r, "bull") ?? 0;
  const dBull = pickNum(r, "dBull") ?? 0;
  const miss = pickNum(r, "miss") ?? 0;
  const bust = pickNum(r, "bust") ?? 0;

  const sparkVals = extractSparkValuesFromRow(r, recent);

  let { detail: segDetail } = extractSegmentsDetailFromSources(r, { segments: r?.segments || null });

  // Fallback synthétique si les anciens matchs ne possèdent pas de segments détaillés.
  const hasSegments = Object.keys(segDetail || {}).length > 0;
  if (!hasSegments) {
    segDetail = {
      "20": { ...blankSeg(), T: hitsT || 0 },
      "18": { ...blankSeg(), D: hitsD || 0 },
      "5": { ...blankSeg(), S: hitsS || 0 },
      "25": { ...blankSeg(), B: bull || 0 },
      "DB": { ...blankSeg(), DB: dBull || 0 },
      "MISS": { ...blankSeg(), MISS: miss || 0 },
    };
  }

  const orderedStacks = detailToOrderedStacks(segDetail);
  const nonEmptyStackCount = orderedStacks.filter((x: any) => N(x.total, 0) > 0).length;

  const quality = clamp01(avg3v / 90);
  const glow = quality > 0.72 ? "#7fe2a9" : quality > 0.45 ? accent : "#cfd1d7";

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.10)",
        background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.90))`,
        boxShadow: "0 10px 26px rgba(0,0,0,.42)",
        padding: 10,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 22,
            overflow: "hidden",
            background: "rgba(255,255,255,.06)",
            border: `1px solid ${accent}44`,
            boxShadow: `0 0 22px ${accent}55, 0 0 44px ${accent}22`,
          }}
        >
          {img && !imgFailed ? (
            <img
              src={img}
              alt={name}
              onError={() => setImgFailed(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,.55)",
                fontWeight: 900,
                fontSize: 28,
              }}
              title={!img ? "no image resolved" : "image failed to load"}
            >
              ?
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 2,
            fontWeight: 950,
            color: accent,
            fontSize: 14,
            textAlign: "center",
            textShadow: `0 0 12px ${accent}88, 0 0 22px ${accent}55`,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>

        <div
          style={{
            marginTop: 6,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            width: "100%",
            alignItems: "stretch",
          }}
        >
          <NeonKPIButton accent="#F6C256" label="AVG/3D" value={fmt1(avg3v)} />
          <NeonKPIButton accent="#FF4FD8" label="Sessions" value={fmt0(N(r.matches, 0))} />
          <NeonKPIButton accent="#7FE2A9" label="Hits" value={fmt0(N(r.darts, 0))} />
        </div>

        <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>
          {t("stats.quality", "Qualité")} •{" "}
          <span style={{ color: glow, textShadow: `0 0 10px ${glow}55` }}>{fmtPct1(quality * 100)}%</span>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <KPI label={t("stats.bestVisit", "Best volée")} value={bestVisit > 0 ? fmt0(bestVisit) : "—"} />
        <KPI label={t("stats.bestCheckout", "Best CO")} value={bestCheckout > 0 ? fmt0(bestCheckout) : "—"} />

        <KPI label={t("stats.first9", "First 9")} value={first9 > 0 ? fmt1(first9) : "—"} />
        <KPI label={t("stats.checkoutPct", "Checkout %")} value={checkoutPct > 0 ? `${fmtPct1(checkoutPct)}%` : "—"} />
        <KPI label={t("stats.doublesPct", "Doubles %")} value={doublesPct > 0 ? `${fmtPct1(doublesPct)}%` : "—"} />
        <KPI label={t("stats.records", "Records")} value={`180:${fmt0(n180)}  140:${fmt0(n140)}  100+:${fmt0(n100)}`} />

        <KPI label={t("stats.hits", "HITS")} value={`S${fmt0(hitsS)} D${fmt0(hitsD)} T${fmt0(hitsT)}`} />
        <KPI label={t("stats.bull", "Bull / DBull")} value={`${fmt0(bull)} / ${fmt0(dBull)}`} />
        <KPI label={t("stats.missBust", "Miss / Bust")} value={`${fmt0(miss)} / ${fmt0(bust)}`} />
        <KPI label={t("stats.setType", "Type")} value={my ? t("stats.dartSets.custom", "Perso") : pr ? t("stats.dartSets.preset", "Preset") : "—"} />
      </div>

      <div style={{ marginTop: 12 }}>
        <BlockTitle title={t("stats.dartSets.spark", "Sparkline AVG/3D")} />
        <div style={wideBoxStyle()}>
          {(sparkVals.length >= 1) ? <Sparkline values={sparkVals} accent={accent} height={116} /> : <EmptySmall text={t("common.na", "—")} />}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <BlockTitle title={t("stats.dartSets.radarHits", "Radar Hits")} />
        <div style={wideBoxStyle()}>
          <PrecisionRadar detail={segDetail} accent={accent} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <BlockTitle title={t("stats.dartSets.hitsBySegment", "Hits par segment (S/D/T/Miss)")} />
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>{nonEmptyStackCount ? `${nonEmptyStackCount}` : "0"}</div>
        </div>

        <div style={wideBoxStyle()}>
          {!nonEmptyStackCount ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              {t(
                "stats.dartSets.noSegments",
                "Segments non disponibles pour ce set (ils doivent être envoyés dans summary.perPlayer.segments ou row.segments)."
              )}
            </div>
          ) : (
            <SegmentsStacks items={orderedStacks} accent={accent} />
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.08)",
          background: "rgba(0,0,0,.22)",
          padding: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,.80)", letterSpacing: 0.5, textTransform: "uppercase" }}>
            {t("stats.dartSets.recent", "Derniers matchs")}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>{recent.length ? `${recent.length}` : "0"}</div>
        </div>

        {!recent.length ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>{t("stats.dartSets.noRecent", "Aucun match récent pour ce set.")}</div>
        ) : (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
            {recent.map((m) => (
              <MatchChip key={m.id} item={m} />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>{t("stats.dartSets.scopeNote", "Calculé sur les matchs X01 terminés (profil actif).")}</div>
    </div>
  );
}

/* ============================================================= */
/* ---------------- UI bits ------------------------------------ */
/* ============================================================= */

function boxStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
    padding: "7px 8px",
  };
}

function wideBoxStyle(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.22)",
    padding: 10,
  };
}

function BlockTitle(props: { title: string }) {
  return (
    <div style={{ fontSize: 11, color: "rgba(255,255,255,.80)", fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.5 }}>
      {props.title}
    </div>
  );
}

function EmptySmall(props: { text: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,.55)", padding: "12px 6px", textAlign: "center" }}>
      {props.text}
    </div>
  );
}

function NeonCountKPI(props: { accent: string; label: string; value: string }) {
  const { accent, label, value } = props;
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${accent}88`,
        background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 62%), rgba(0,0,0,.40)`,
        padding: "7px 10px",
        minWidth: 86,
        textAlign: "center",
        boxShadow: `0 0 18px ${accent}40`,
      }}
    >
      <div style={{ fontSize: 10.5, color: "#fff", opacity: 0.85, fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 2, fontWeight: 950, color: accent, fontSize: 13.5, textShadow: `0 0 14px ${accent}88` }}>{value}</div>
    </div>
  );
}

function NeonKPIButton(props: { accent: string; label: string; value: string }) {
  const { accent, label, value } = props;
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${accent}88`,
        background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 62%), rgba(0,0,0,.40)`,
        padding: "7px 10px",
        minWidth: 0,
        textAlign: "center",
        boxShadow: `0 0 18px ${accent}40`,
      }}
    >
      <div style={{ fontSize: 10.5, color: accent, fontWeight: 950, letterSpacing: 0.4, textShadow: `0 0 12px ${accent}66` }}>{label}</div>
      <div style={{ marginTop: 2, fontWeight: 950, color: accent, fontSize: 13.5, textShadow: `0 0 14px ${accent}88` }}>{value}</div>
    </div>
  );
}

function KPI(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <div style={boxStyle()}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.70)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 950 }}>
        {label}
      </div>
      <div style={{ fontWeight: 950, color: "#fff", fontSize: 12.6 }}>{value}</div>
    </div>
  );
}

function MatchChip(props: { item: MiniMatch }) {
  const { item } = props;
  const win = item?.label === "WIN";
  const c = win ? "#7fe2a9" : "#ff8a8a";

  return (
    <div
      style={{
        minWidth: 130,
        maxWidth: 130,
        borderRadius: 12,
        border: `1px solid ${c}22`,
        background: `radial-gradient(circle at 0% 0%, ${c}22, transparent 60%), rgba(255,255,255,.03)`,
        padding: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <div style={{ fontWeight: 950, color: "#fff", fontSize: 12 }}>{item.dateLabel}</div>
        <span style={{ fontSize: 10, fontWeight: 950, color: c, border: `1px solid ${c}33`, padding: "2px 6px", borderRadius: 999, background: "rgba(0,0,0,.25)" }}>
          {item.label}
        </span>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {item.opponent ? `vs ${item.opponent}` : "Match"}
      </div>

      <div style={{ marginTop: 4, fontSize: 11.5, color: "#fff", fontWeight: 950 }}>{item.score || "—"}</div>
    </div>
  );
}

function ArrowBtn(props: { right?: boolean; disabled?: boolean; onClick?: () => void }) {
  const { right, disabled, onClick } = props;
  return (
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        height: 36,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.12)",
        background: disabled ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.30)",
        color: disabled ? "rgba(255,255,255,.30)" : "#fff",
        fontWeight: 950,
        cursor: disabled ? "default" : "pointer",
      }}
      aria-label={right ? "next" : "prev"}
    >
      {right ? "›" : "‹"}
    </button>
  );
}

/* ============================================================= */
/* ---------------- Sparkline SVG ------------------------------ */
/* ============================================================= */

function Sparkline(props: { values: number[]; accent: string; height?: number }) {
  const { values, accent } = props;
  const h = Math.max(96, Math.min(150, Number(props.height ?? 116)));
  const w = 320;
  const padX = 16;
  const padY = 18;

  const vals = (values || []).slice(-18).map((x) => N(x, 0)).filter((x) => x > 0);
  if (!vals.length) return <EmptySmall text="—" />;

  const visualVals = vals.length === 1 ? [Math.max(0, vals[0] * 0.72), vals[0]] : vals;
  const minRaw = Math.min(...visualVals);
  const maxRaw = Math.max(...visualVals);
  const padVal = Math.max(4, (maxRaw - minRaw) * 0.18);
  const min = Math.max(0, minRaw - padVal);
  const max = maxRaw + padVal;
  const span = Math.max(1e-6, max - min);

  const pts = visualVals.map((v, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(1, visualVals.length - 1);
    const y = padY + (h - padY * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${d} L ${pts[pts.length - 1].x.toFixed(2)} ${h - padY} L ${pts[0].x.toFixed(2)} ${h - padY} Z`;
  const last = vals[vals.length - 1];

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        {[0, 1, 2].map((i) => {
          const y = padY + (i * (h - padY * 2)) / 2;
          return <line key={i} x1={padX} x2={w - padX} y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />;
        })}
        <path d={area} fill={accent} opacity="0.10" />
        <path d={d} fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 0 5px rgba(246,194,86,.45))" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.2 : 3.1} fill={accent} stroke="rgba(0,0,0,.55)" strokeWidth="1" />
        ))}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", fontWeight: 950 }}>
          min {fmt1(vals.length === 1 ? vals[0] : Math.min(...vals))} • max {fmt1(Math.max(...vals))}
        </div>
        <div style={{ fontSize: 11.5, color: accent, fontWeight: 950, textShadow: `0 0 12px ${accent}66` }}>dernier {fmt1(last)}</div>
      </div>
    </div>
  );
}

/* ============================================================= */
/* ---------------- Target radar (cible) ----------------------- */
/* ============================================================= */

function detailToRadarDarts(detail: SegDetailMap): any[] {
  const darts: any[] = [];
  const pushMany = (count: number, v: number, mult: number) => {
    const n = Math.max(0, Math.round(N(count, 0)));
    for (let i = 0; i < n; i += 1) darts.push({ v, mult });
  };

  for (let seg = 1; seg <= 20; seg += 1) {
    const d = detail?.[String(seg)] || blankSeg();
    pushMany(d.S, seg, 1);
    pushMany(d.D, seg, 2);
    pushMany(d.T, seg, 3);
  }

  const b = detail?.["25"] || blankSeg();
  const db = detail?.["DB"] || blankSeg();
  pushMany(N(b.B, 0) + N(b.S, 0), 25, 1);
  pushMany(N(db.DB, 0) + N(b.DB, 0) + N(db.D, 0), 25, 2);
  return darts;
}

function detailRadarSummary(detail: SegDetailMap) {
  const segments = Array.from({ length: 20 }, (_, i) => i + 1);
  const totalFor = (seg: number) => {
    const d = detail?.[String(seg)] || blankSeg();
    return N(d.S, 0) + N(d.D, 0) + N(d.T, 0);
  };
  const bestBy = (field: "S" | "D" | "T" | "TOTAL") => {
    let bestSeg: number | null = null;
    let best = 0;
    for (const seg of segments) {
      const d = detail?.[String(seg)] || blankSeg();
      const val = field === "TOTAL" ? totalFor(seg) : N((d as any)[field], 0);
      if (val > best) {
        best = val;
        bestSeg = seg;
      }
    }
    return bestSeg ? String(bestSeg) : "-";
  };

  let leastSeg: number | null = null;
  let least = Infinity;
  for (const seg of segments) {
    const total = totalFor(seg);
    if (total > 0 && total < least) {
      least = total;
      leastSeg = seg;
    }
  }

  const b = detail?.["25"] || blankSeg();
  const db = detail?.["DB"] || blankSeg();
  const bull25 = N(b.B, 0) + N(b.S, 0);
  const db25 = N(db.DB, 0) + N(b.DB, 0) + N(db.D, 0);
  const missTotal = N(detail?.MISS?.MISS, 0) + N(detail?.["MISS"]?.MISS, 0);
  const totalHits = segments.reduce((sum, seg) => sum + totalFor(seg), 0) + bull25 + db25;

  return {
    totalHits,
    bull25,
    db25,
    missTotal,
    favorite: bestBy("TOTAL"),
    simple: bestBy("S"),
    double: bestBy("D"),
    triple: bestBy("T"),
    least: leastSeg ? String(leastSeg) : "-",
  };
}

function PrecisionRadar(props: { detail: SegDetailMap; accent: string }) {
  const { detail, accent } = props;
  const darts = detailToRadarDarts(detail);
  const s = detailRadarSummary(detail);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 132px", gap: 10, alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <TrainingRadar darts={darts} />
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)", display: "flex", flexDirection: "column", gap: 5, lineHeight: 1.25 }}>
        <div style={{ fontWeight: 950, color: accent, textShadow: `0 0 10px ${accent}66` }}>Segments clés</div>
        <div>Total hits : <span style={{ color: accent, fontWeight: 950 }}>{fmt0(s.totalHits)}</span></div>
        <div>Hit préféré : <span style={{ color: "#7CFF9A", fontWeight: 950 }}>{s.favorite}</span></div>
        <div>Simple favori : <span style={{ color: "#47B5FF", fontWeight: 950 }}>{s.simple}</span></div>
        <div>Double favori : <span style={{ color: "#FFB8DE", fontWeight: 950 }}>{s.double}</span></div>
        <div>Triple favori : <span style={{ color: "#FF9F43", fontWeight: 950 }}>{s.triple}</span></div>
        <div>Moins joué : <span style={{ color: "#AAAAAA", fontWeight: 950 }}>{s.least}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginTop: 4 }}>
          <SideBadge accent={accent} label="25" value={fmt0(s.bull25)} />
          <SideBadge accent="#FF6FB5" label="D25" value={fmt0(s.db25)} />
          <SideBadge accent="rgba(255,255,255,.72)" label="MISS" value={fmt0(s.missTotal)} />
        </div>
      </div>
    </div>
  );
}

function SideBadge(props: { label: string; value: string; accent: string }) {
  const { label, value, accent } = props;
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.24)", padding: "8px 10px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 950, color: "rgba(255,255,255,.70)" }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 950, color: accent, textShadow: `0 0 12px ${accent}55` }}>{value}</div>
    </div>
  );
}

/* ============================================================= */
/* ---------------- Segments stacks ---------------------------- */
/* ============================================================= */

function SegmentsStacks(props: { items: any[]; accent: string }) {
  const { items } = props;
  const max = Math.max(1, ...items.map((x) => N(x.total, 0)));
  const barH = 70;

  const colorS = "linear-gradient(180deg,#47B5FF,#1F5F9F)";
  const colorD = "linear-gradient(180deg,#FF6FB5,#8F2B64)";
  const colorT = "linear-gradient(180deg,#FF9F43,#C25B0F)";
  const colorM = "linear-gradient(180deg,#555,#999)";

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(11, minmax(18px, 1fr))",
          alignItems: "end",
          gap: "8px 5px",
          minHeight: 168,
        }}
      >
        {items.map((it) => {
          const total = N(it.total, 0);
          const stackH = total > 0 ? Math.max(8, Math.round((barH * total) / max)) : 6;
          const hS = total > 0 ? Math.round((stackH * N(it.S)) / total) : 0;
          const hD = total > 0 ? Math.round((stackH * N(it.D)) / total) : 0;
          const hT = total > 0 ? Math.round((stackH * N(it.T)) / total) : 0;
          const hM = total > 0 ? Math.max(0, stackH - hS - hD - hT) : 0;

          return (
            <div key={it.k} style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
              <div
                style={{
                  height: barH,
                  width: 14,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div
                  title={`S:${fmt0(it.S)} D:${fmt0(it.D)} T:${fmt0(it.T)} Miss:${fmt0(it.MISS)}`}
                  style={{
                    height: stackH,
                    width: 14,
                    borderRadius: 5,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column-reverse",
                    background: "rgba(255,255,255,.05)",
                    boxShadow: total > 0 ? "0 0 8px rgba(255,255,255,.24)" : "inset 0 0 0 1px rgba(255,255,255,.05)",
                  }}
                >
                  {hS > 0 && <div style={{ height: hS, background: colorS }} />}
                  {hD > 0 && <div style={{ height: hD, background: colorD }} />}
                  {hT > 0 && <div style={{ height: hT, background: colorT }} />}
                  {hM > 0 && <div style={{ height: hM, background: colorM }} />}
                </div>
              </div>
              <div style={{ marginTop: 3, textAlign: "center", fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,.72)", whiteSpace: "nowrap" }}>
                {it.label || it.k}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 10, color: "rgba(255,255,255,.70)", fontWeight: 900 }}>
        <LegendDot bg={colorS} label="S" />
        <LegendDot bg={colorD} label="D" />
        <LegendDot bg={colorT} label="T" />
        <LegendDot bg={colorM} label="Miss" />
      </div>
    </div>
  );
}

function LegendDot(props: { bg: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: props.bg, display: "inline-block" }} />
      {props.label}
    </span>
  );
}
