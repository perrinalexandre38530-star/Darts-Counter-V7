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
  return (pp?.dartSetId ?? null) || (pp?.dartPresetId ?? null) || (pp?.dartsetId ?? null) || null;
}

function pickNum(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
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

function buildRecentMatchesMap(allHistory: any[], profileId: string): Record<string, MiniMatch[]> {
  const map: Record<string, MiniMatch[]> = {};

  for (const r of allHistory || []) {
    if (!isX01Record(r)) continue;

    const status = r?.status ?? r?.state ?? "";
    if (status && status !== "finished") continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    const mine = perPlayer.find((pp: any) => String(resolveProfileId(pp) ?? "") === String(profileId));
    if (!mine) continue;

    const dsid = resolveDartSetId(mine);
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
    const isWinner =
      mine?.isWinner === true ||
      mine?.win === true ||
      mine?.won === true ||
      (winnerId && String(winnerId) === String(profileId)) ||
      (winnerId && mineId && String(winnerId) === mineId);

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
      pickNum(mine, "avg3", "avg3d", "avgPer3", "avgPerThree", "avg") ??
      pickNum(summary, "avg3", "avg3d") ??
      null;

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
    null
  );
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

  for (const obj of allObjs) {
    for (const [k, v] of Object.entries(obj)) {
      const kk = normalizeSegKey(k);
      const n = Number(v);
      if (!kk || !Number.isFinite(n) || n <= 0) continue;
      outRaw[kk] = (outRaw[kk] || 0) + n;

      const parsed = parseSegKey(kk);
      if (!parsed) continue;

      if (parsed.mult === "MISS") {
        outDetail.MISS ||= blankSeg();
        outDetail.MISS.MISS += n;
        continue;
      }
      if (parsed.mult === "B") {
        outDetail["25"] ||= blankSeg();
        outDetail["25"].B += n;
        continue;
      }
      if (parsed.mult === "DB") {
        outDetail["DB"] ||= blankSeg();
        outDetail["DB"].DB += n;
        continue;
      }

      outDetail[parsed.num] ||= blankSeg();
      (outDetail[parsed.num] as any)[parsed.mult] += n;
    }
  }

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
  if (evo && evo.length >= 2) {
    const vals = evo.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n));
    if (vals.length >= 2) return vals.slice(-18);
  }

  const arr = pickArr(r, "spark", "sparkline", "avg3Spark", "avg3Series", "seriesAvg3", "lastAvg3") || null;

  if (arr && arr.length) {
    const vals = arr.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n));
    if (vals.length >= 2) return vals.slice(-18);
  }

  const vals2 = (recent || [])
    .slice()
    .reverse()
    .map((m) => N(m?.avg3, NaN))
    .filter((n) => Number.isFinite(n)) as number[];

  if (vals2.length >= 2) return vals2.slice(-18);

  return [];
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

  segments?: Record<string, number>;
  evoAvg3?: number[];
};

function computeAggFromHistory(allHistory: any[], profileId: string): Record<string, AggRow> {
  const out: Record<string, AggRow> = {};

  for (const r of allHistory || []) {
    if (!isX01Record(r)) continue;

    const status = r?.status ?? r?.state ?? "";
    if (status && status !== "finished") continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    const mine = perPlayer.find((pp: any) => String(resolveProfileId(pp) ?? "") === String(profileId));
    if (!mine) continue;

    const dsid = String(resolveDartSetId(mine) ?? "");
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
      segments: {},
      evoAvg3: [],
    });

    row.matches += 1;

    const avg3 =
      pickNum(mine, "avg3", "avg3d", "avgPer3", "avgPerThree", "avg") ??
      pickNum(summary, "avg3", "avg3d") ??
      null;

    if (avg3 !== null) row.evoAvg3.push(Number(avg3));

    row.darts +=
      pickNum(mine, "darts", "nbDarts", "thrown", "dartsThrown", "dartsUsed") ??
      pickNum(mine, "totalDarts") ??
      0;

    row.bestVisit = Math.max(row.bestVisit, N(pickNum(mine, "bestVisit", "bestVolley", "bestThree", "best3", "bestScore"), 0));
    row.bestCheckout = Math.max(row.bestCheckout, N(pickNum(mine, "bestCheckout", "bestCO", "bestOut"), 0));

    const f9 = pickNum(mine, "first9", "first9Avg", "avgFirst9", "firstNine") ?? null;
    if (f9 !== null) row.first9 += Number(f9);

    const coPct =
      pickNum(mine, "checkoutPct", "coPct", "checkoutPercent", "pctCheckout") ??
      pickNum(mine, "checkout%", "checkoutP") ??
      null;
    if (coPct !== null) row.checkoutPct += Number(coPct);

    const dPct =
      pickNum(mine, "doublesPct", "doublePct", "doublesPercent", "pctDoubles") ??
      pickNum(mine, "doubles%", "doublesP") ??
      null;
    if (dPct !== null) row.doublesPct += Number(dPct);

    row.n180 += N(pickNum(mine, "n180", "count180", "s180", "nb180"), 0);
    row.n140 += N(pickNum(mine, "n140", "count140", "s140", "nb140"), 0);
    row.n100 += N(pickNum(mine, "n100", "count100", "s100", "nb100", "n100p", "n100Plus"), 0);

    row.hitsS += N(pickNum(mine, "hitsS", "s", "singles", "single", "S"), 0);
    row.hitsD += N(pickNum(mine, "hitsD", "d", "doubles", "double", "D"), 0);
    row.hitsT += N(pickNum(mine, "hitsT", "t", "triples", "triple", "T"), 0);
    row.bull += N(pickNum(mine, "bull", "hitsBull", "sbull", "BULL"), 0);
    row.dBull += N(pickNum(mine, "dBull", "dbull", "hitsDBull", "DBULL"), 0);
    row.miss += N(pickNum(mine, "miss", "misses", "missCount", "nbMiss"), 0);
    row.bust += N(pickNum(mine, "bust", "busts", "bustCount", "nbBust"), 0);

    const segObj = extractSegmentsObjectFromPlayer(mine) || null;
    if (segObj) {
      for (const [k, v] of Object.entries(segObj)) {
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

export default function StatsDartSetsSection(props: { activeProfileId: string | null; title?: string }) {
  const { activeProfileId, title } = props;
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

        const recMap = buildRecentMatchesMap(all || [], activeProfileId);
        if (mounted) setRecentBySet(recMap);

        const aggMap = computeAggFromHistory(all || [], activeProfileId);

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
  }, [activeProfileId]);

  React.useEffect(() => {
    setSelectedIdx((i) => {
      const n = rows?.length || 0;
      if (!n) return 0;
      return Math.max(0, Math.min(n - 1, i));
    });
  }, [rows?.length]);

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

  const { detail: segDetail } = extractSegmentsDetailFromSources(r, { segments: r?.segments || null });
  const topStacks = detailToTopStacks(segDetail, 12);

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
          {sparkVals.length >= 2 ? <Sparkline values={sparkVals} accent={accent} height={84} /> : <EmptySmall text={t("common.na", "—")} />}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <BlockTitle title={t("stats.dartSets.radarHits", "Radar Hits")} />
        <div style={wideBoxStyle()}>
          <TargetRadar detail={segDetail} accent={accent} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <BlockTitle title={t("stats.dartSets.hitsBySegment", "Hits par segment (S/D/T/Miss)")} />
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>{topStacks.length ? `${topStacks.length}` : "0"}</div>
        </div>

        <div style={wideBoxStyle()}>
          {!topStacks.length ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              {t(
                "stats.dartSets.noSegments",
                "Segments non disponibles pour ce set (ils doivent être envoyés dans summary.perPlayer.segments ou row.segments)."
              )}
            </div>
          ) : (
            <SegmentsStacks items={topStacks} accent={accent} />
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
  const h = Math.max(58, Math.min(120, Number(props.height ?? 60)));
  const w = 260;
  const pad = 6;

  const vals = (values || []).slice(-18).map((x) => N(x, 0));
  if (vals.length < 2) return <EmptySmall text="—" />;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1e-6, max - min);

  const pts = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1);
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1]?.v ?? null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <path d={d} fill="none" stroke={accent} strokeWidth="2.2" />
        <path d={`${d} L ${pts[pts.length - 1].x.toFixed(2)} ${h - pad} L ${pts[0].x.toFixed(2)} ${h - pad} Z`} fill={accent} opacity="0.10" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.4" fill={accent} />
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", fontWeight: 950 }}>
          min {fmt1(min)} • max {fmt1(max)}
        </div>
        <div style={{ fontSize: 11.5, color: accent, fontWeight: 950, textShadow: `0 0 12px ${accent}66` }}>{last !== null ? `dernier ${fmt1(last)}` : "—"}</div>
      </div>
    </div>
  );
}

/* ============================================================= */
/* ---------------- Target radar (cible) ----------------------- */
/* ============================================================= */

function TargetRadar(props: { detail: SegDetailMap; accent: string }) {
  const { detail, accent } = props;

  const totals: Record<string, number> = {};
  for (let i = 1; i <= 20; i++) {
    const k = String(i);
    const d = detail?.[k] || blankSeg();
    totals[k] = N(d.S) + N(d.D) + N(d.T) + N(d.MISS);
  }

  const total25 = N(detail?.["25"]?.B, 0);
  const totalDB = N(detail?.["DB"]?.DB, 0);
  const totalMiss = N(detail?.["MISS"]?.MISS, 0);

  const maxV = Math.max(1, ...Object.values(totals), total25, totalDB, totalMiss);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const R = 78;

  const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const angleForIndex = (i: number) => (-90 + (i * 360) / 20) * (Math.PI / 180);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 10, alignItems: "center" }}>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={R + 26} fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.10)" />
        <circle cx={cx} cy={cy} r={R} fill="rgba(0,0,0,.30)" stroke="rgba(255,255,255,.10)" />
        <circle cx={cx} cy={cy} r={R * 0.66} fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)" />
        <circle cx={cx} cy={cy} r={R * 0.33} fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)" />

        {order.map((num, i) => {
          const ang = angleForIndex(i);
          const x = cx + Math.cos(ang) * (R * 0.8);
          const y = cy + Math.sin(ang) * (R * 0.8);
          const v = totals[String(num)] || 0;
          const rr = 2.5 + 8 * Math.sqrt(v / maxV);
          const op = 0.12 + 0.7 * (v / maxV);
          return <circle key={num} cx={x} cy={y} r={rr} fill={accent} opacity={op} />;
        })}

        {order.map((num, i) => {
          const ang = angleForIndex(i);
          const x = cx + Math.cos(ang) * (R + 16);
          const y = cy + Math.sin(ang) * (R + 16);
          return (
            <text key={`t-${num}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="900" fill="rgba(255,255,255,.80)">
              {num}
            </text>
          );
        })}

        <circle cx={cx} cy={cy} r={10} fill={accent} opacity={0.18} stroke={accent} strokeOpacity={0.35} />
        <circle cx={cx} cy={cy} r={5} fill={accent} opacity={0.35} stroke={accent} strokeOpacity={0.6} />
      </svg>

      <div style={{ display: "grid", gap: 8 }}>
        <SideBadge label="25" value={fmt0(total25)} accent={accent} />
        <SideBadge label="D25" value={fmt0(totalDB)} accent={accent} />
        <SideBadge label="MISS" value={fmt0(totalMiss)} accent={accent} />
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
  const { items, accent } = props;

  const max = Math.max(1, ...items.map((x) => N(x.S) + N(x.D) + N(x.T) + N(x.MISS) + N(x.B) + N(x.DB)));
  const barH = 58;

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
      {items.map((it) => {
        const total = N(it.total, 0);
        const h = Math.max(8, Math.round((barH * total) / max));

        const hS = Math.round((h * N(it.S)) / Math.max(1, total));
        const hD = Math.round((h * N(it.D)) / Math.max(1, total));
        const hT = Math.round((h * N(it.T)) / Math.max(1, total));
        const hM = Math.max(0, h - hS - hD - hT);

        return (
          <div key={it.k} style={{ minWidth: 44 }}>
            <div
              style={{
                height: barH,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.03)",
                display: "flex",
                flexDirection: "column-reverse",
                overflow: "hidden",
              }}
              title={`S:${fmt0(it.S)} D:${fmt0(it.D)} T:${fmt0(it.T)} Miss:${fmt0(it.MISS)} 25:${fmt0(it.B)} D25:${fmt0(it.DB)}`}
            >
              <div style={{ height: hS, background: "rgba(255,255,255,.18)" }} />
              <div style={{ height: hD, background: "rgba(255,255,255,.10)" }} />
              <div style={{ height: hT, background: "rgba(255,255,255,.26)" }} />
              <div style={{ height: hM, background: `${accent}22` }} />
            </div>

            <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, fontWeight: 950, color: accent, textShadow: `0 0 10px ${accent}44` }}>
              {it.k}
            </div>
            <div style={{ marginTop: 2, textAlign: "center", fontSize: 10.5, fontWeight: 900, color: "rgba(255,255,255,.70)" }}>
              {fmt0(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
