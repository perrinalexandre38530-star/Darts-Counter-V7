// src/lib/history.ts
// ============================================
// Historique "lourd + compressé"
// API : list(), get(id), upsert(rec), remove(id), clear()
// + History.{list,get,upsert,remove,clear,readAll}
// + History.{getX01, listInProgress, listFinished, listByStatus}
// - Stockage principal : IndexedDB (objectStore "history")
// - Compression : LZString (UTF-16) sur le champ payload → stocké en payloadCompressed
// - Fallback : localStorage si IDB indispo (compact, sans payload)
// - Migration auto depuis l’ancien localStorage KEY = "dc-history-v1"
// - Trim auto à MAX_ROWS
// ✅ FIX CRITICAL: legacy LSK peut être JSON OU LZString UTF16 (et parfois base64-ish) -> parse robuste
// ✅ FIX CRITICAL: 1 match MULTI = 1 record (dédoublonnage list + id canonique upsert)
// ✅ PATCH (CRITICAL): NE JAMAIS JSON.parse un payload non maîtrisé (safeJsonParse partout)
// ✅ FIX STATS CRICKET: list() renvoie payload décodé (sinon stats = 0)
// ✅ ANTI-FREEZE: ne parse/log QUE si JSON-like + anti-spam logs + decode payload seulement pour Cricket
// ✅ JSONC PATCH: support // /* */ + trailing commas (sinon JSON.parse casse sur '/')
// ✅ PATCH CLOUD (CRITICAL): push snapshot cloud après upsert/remove/clear
// ✅ PATCH AVATAR: supprime avatarDataUrl des players/history/payload avant persistance
// ============================================

/* =========================
   Types
========================= */
export type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

export type SavedMatch = {
  id: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished";
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;

  // ✅ NEW (light): id stable du match (pour éviter doublons multi)
  matchId?: string;

  // Config légère de la partie (ex: X01 301 / 501...)
  game?: {
    mode?: string;
    startScore?: number;
    [k: string]: any;
  } | null;

  // Résumé léger (pour listes)
  summary?: {
    legs?: number;
    darts?: number; // total darts (compat)
    avg3ByPlayer?: Record<string, number>;
    co?: number;
    [k: string]: any;
  } | null;

  // Payload complet (gros) — compressé en base
  payload?: any;

  // ✅ RESUME payload minimal (anti-corruption / anti-compress)
  // - Permet de reprendre même si payloadCompressed est vide/corrompu.
  // - Doit rester petit (config + state + dartsLite)
  resume?: any;

  // champs libres tolérés (meta, state, etc.)
  [k: string]: any;
};

export type CloudImportResult = {
  applied: "cloud" | "local" | "conflict_only";
  baseId: string;
  conflictId?: string;
  reason?: string;
};

/* =========================
   Cricket stats (nouveau)
========================= */
import { computeCricketLegStats, type CricketHit } from "./StatsCricket";

import { triggerAutoBackupIfEnabled } from "./backup/triggerAutoBackup";
import { scheduleStatsIndexRefresh } from "./stats/rebuildStatsFromHistory";
import { encodeCompactMatch, estimateCompactBytes } from "./matchCompactCodec";
/* =========================
   ✅ CLOUD SNAPSHOT PUSH (PATCH CRITICAL)
   - après un match / remove / clear -> push snapshot cloud (debounce)
   - évite “tout a disparu après clear site data”
========================= */
import type { Store } from "./types";
import { loadStore, scopedStorageKey } from "./storage";
import { onlineApi } from "./onlineApi";
import { emitCloudChange } from "./cloudEvents";
import { EventBuffer } from "./sync/EventBuffer";

// ✅ Resume index (localStorage) — permet "Reprendre partie" multi-modes
// Évite la dépendance circulaire avec src/lib/resume.ts (qui importe History)
const RESUME_INDEX_KEY = "dc-v5-resume-index";
const scopedResumeIndexKey = () => scopedStorageKey(RESUME_INDEX_KEY);
function _resumeIndexRead(): string[] {
  try {
    const raw = localStorage.getItem(scopedResumeIndexKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}
function _resumeIndexWrite(ids: string[]) {
  try {
    const uniq = [...new Set((ids || []).filter(Boolean).map(String))];
    localStorage.setItem(scopedResumeIndexKey(), JSON.stringify(uniq));
  } catch {}
}
function _resumeIndexAdd(id: string) {
  const ids = _resumeIndexRead();
  _resumeIndexWrite([id, ...ids.filter((x) => x !== id)]);
}
function _resumeIndexRemove(id: string) {
  const ids = _resumeIndexRead();
  _resumeIndexWrite(ids.filter((x) => x !== id));
}

function inferHistoryStatus(rec: any): "in_progress" | "finished" {
  try {
    const raw = String(rec?.status || "").toLowerCase();

    // V3 FIX : un ancien header peut encore porter status="in_progress"
    // alors qu'un upsert final a déjà ajouté winnerId/summary.finished.
    // On privilégie donc les marqueurs de fin AVANT le raw in_progress.
    if (raw === "finished" || raw === "done" || raw === "match_end" || raw === "ended") return "finished";

    const summary: any = rec?.summary || {};
    if (summary?.finished === true) return "finished";
    if (summary?.result?.finished === true) return "finished";
    if (summary?.winnerId) return "finished";
    if (summary?.result?.winnerId) return "finished";
    if (Array.isArray(summary?.rankings) && summary.rankings.length > 0) return "finished";

    if (rec?.winnerId) return "finished";

    const payload: any = rec?.payload || {};
    if (payload?.winnerId || payload?.summary?.winnerId || payload?.summary?.finished === true || payload?.result?.winnerId || payload?.result?.finished === true) {
      return "finished";
    }

    if (raw === "in_progress" || raw === "inprogress" || raw === "playing" || raw === "live") return "in_progress";

    const resume: any = rec?.resume || {};
    if (resume?.state || resume?.config || (Array.isArray(resume?.darts) && resume.darts.length > 0)) {
      return "in_progress";
    }

    if (payload?.result || payload?.summary || payload?.stats) return "finished";

    return "finished";
  } catch {
    return "finished";
  }
}

function isHistoryRowUsable(rec: any): boolean {
  try {
    const id = String(rec?.id ?? rec?.matchId ?? "").trim();
    if (!id) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeHistoryRow<T extends Record<string, any>>(rec: T): T {
  const out: any = { ...(rec || {}) };
  const id = String(out?.matchId ?? out?.id ?? "").trim();
  if (id) {
    out.id = id;
    out.matchId = id;
  }
  out.status = inferHistoryStatus(out);
  if (!Array.isArray(out.players)) out.players = [];
  return out as T;
}

// ============================================
// 🔒 PATCH AVATAR HELPERS
// - supprime les avatars base64 dans history/payload
// - évite crash React / Android / historique énorme
// ============================================
function stripAvatarFieldFromPlayer(p: any) {
  if (!p) return p;
  const out = { ...p };
  if (typeof out.avatarDataUrl === "string" && out.avatarDataUrl.startsWith("data:image")) {
    delete out.avatarDataUrl;
  }
  return out;
}

function stripAvatarDataFromPlayers(players: any[] | null | undefined) {
  if (!Array.isArray(players)) return players;
  return players.map(stripAvatarFieldFromPlayer);
}

function stripAvatarDataFromPayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload;

  let out: any;
  try {
    out = Array.isArray(payload)
      ? payload.map((x: any) => (typeof x === "object" && x ? { ...x } : x))
      : { ...payload };
  } catch {
    return payload;
  }

  try {
    if (Array.isArray(out.players)) {
      out.players = stripAvatarDataFromPlayers(out.players);
    }

    if (out.config && Array.isArray(out.config.players)) {
      out.config = { ...out.config, players: stripAvatarDataFromPlayers(out.config.players) };
    }

    if (out.cfg && Array.isArray(out.cfg.players)) {
      out.cfg = { ...out.cfg, players: stripAvatarDataFromPlayers(out.cfg.players) };
    }

    if (out.summary && Array.isArray(out.summary.players)) {
      out.summary = { ...out.summary, players: stripAvatarDataFromPlayers(out.summary.players) };
    }

    if (out.state && Array.isArray(out.state.players)) {
      out.state = { ...out.state, players: stripAvatarDataFromPlayers(out.state.players) };
    }

    if (out.engineState && Array.isArray(out.engineState.players)) {
      out.engineState = { ...out.engineState, players: stripAvatarDataFromPlayers(out.engineState.players) };
    }
  } catch {}

  return out;
}


// ============================================
// 🔒 GLOBAL HISTORY SANITIZER
// - allège tous les records avant persistance
// - supprime les champs runtime inutiles / dangereux
// - protège contre data:image/base64 trop gros
// - conserve la reprise de partie
// ============================================
function _trimHeavyArray(arr: any, keep = 100, hardLimit = 200) {
  if (!Array.isArray(arr)) return arr;
  return arr.length > hardLimit ? arr.slice(-keep) : arr;
}

function _sanitizeDataUrlsDeep(input: any, depth = 0): any {
  if (depth > 6) return input;
  if (typeof input === "string") {
    if (input.startsWith("data:image")) return undefined;
    return input;
  }
  if (!input || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map((x) => _sanitizeDataUrlsDeep(x, depth + 1));
  }

  const out: any = { ...input };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "string" && v.startsWith("data:image")) {
      delete out[k];
      continue;
    }
    out[k] = _sanitizeDataUrlsDeep(v, depth + 1);
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

function sanitizeRecord(record: any) {
  if (!record || typeof record !== "object") return record;

  const r: any = { ...record };

  try {
    if (Array.isArray(r.players)) {
      r.players = stripAvatarDataFromPlayers(r.players) || [];
    }
  } catch {}

  if (r.payload && typeof r.payload === "object") {
    let p: any = stripAvatarDataFromPayload(r.payload);
    try {
      p = { ...p };

      delete p.stats;
      delete p.liveStatsByPlayer;
      delete p.history;
      delete p.tempState;

      if (Array.isArray(p.players)) {
        p.players = p.players.map((pl: any) => {
          const clean = stripAvatarFieldFromPlayer(pl);
          if (clean && typeof clean === "object") {
            delete clean.avatar;
            delete clean.avatarDataUrl;
          }
          return clean;
        });
      }

      p.visits = _trimHeavyArray(p.visits, 100, 200);
      p.turns = _trimHeavyArray(p.turns, 100, 200);

      p = _sanitizeDataUrlsDeep(p);
    } catch {}
    r.payload = p;
  }

  if (r.resume && typeof r.resume === "object") {
    try {
      const resume: any = { ...r.resume };
      resume.darts = _trimHeavyArray(resume.darts, 90, 120);
      r.resume = _sanitizeDataUrlsDeep(resume);
    } catch {}
  }

  return r;
}

// =========================
// ✅ CLOUD IMPORT GUARD
// - Quand on importe depuis le cloud, on évite:
//   - de re-push des events (boucle)
//   - de re-déclencher des syncs opportunistes
// =========================
let __historyCloudImportDepth = 0;
function isCloudImporting(): boolean {
  return __historyCloudImportDepth > 0;
}
async function withCloudImportGuard<T>(fn: () => Promise<T>): Promise<T> {
  __historyCloudImportDepth++;
  try {
    return await fn();
  } finally {
    __historyCloudImportDepth = Math.max(0, __historyCloudImportDepth - 1);
  }
}

// mini-sanitize local (anti data: énormes + perfs)
function _sanitizeStoreForCloudMini(s: any) {
  let clone: any;
  try {
    clone = JSON.parse(JSON.stringify(s || {}));
  } catch {
    clone = { ...(s || {}) };
  }

  // profiles: supprime avatarDataUrl data:
  if (Array.isArray(clone.profiles)) {
    clone.profiles = clone.profiles.map((p: any) => {
      const out = { ...(p || {}) };
      const v = out.avatarDataUrl;
      if (typeof v === "string" && v.startsWith("data:")) delete out.avatarDataUrl;
      return out;
    });
  }

  // history: players / payload.players supprime avatarDataUrl data:
  if (Array.isArray(clone.history)) {
    clone.history = clone.history.map((r: any) => {
      const rr = { ...(r || {}) };
      if (Array.isArray(rr.players)) {
        rr.players = rr.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = pp.avatarDataUrl;
          if (typeof v === "string" && v.startsWith("data:")) delete pp.avatarDataUrl;
          return pp;
        });
      }
      if (rr.payload && Array.isArray(rr.payload.players)) {
        rr.payload = { ...(rr.payload || {}) };
        rr.payload.players = rr.payload.players.map((pl: any) => {
          const pp = { ...(pl || {}) };
          const v = pp.avatarDataUrl;
          if (typeof v === "string" && v.startsWith("data:")) delete pp.avatarDataUrl;
          return pp;
        });
      }
      return rr;
    });
  }

  return clone;
}

let __cloudPushTimer: number | null = null;

const HISTORY_CLOUD_PUSH_ENABLED = false;

function scheduleCloudSnapshotPush(reason: string) {
  if (!HISTORY_CLOUD_PUSH_ENABLED) return;
  try {
    if (typeof window === "undefined") return;

    if (__cloudPushTimer) {
      window.clearTimeout(__cloudPushTimer);
      __cloudPushTimer = null;
    }

    __cloudPushTimer = window.setTimeout(async () => {
      try {
        // on vérifie une session réelle
        const sess = await onlineApi.getCurrentSession().catch(() => null);
        const uid = String((sess as any)?.user?.id || "");
        if (!uid) return;

        const store = await loadStore<Store>().catch(() => null);
        if (!store) return;

        const payload = {
          kind: "dc_store_snapshot_v1",
          createdAt: new Date().toISOString(),
          app: "darts-counter-v5",
          reason,
          store: _sanitizeStoreForCloudMini(store),
        };

        await onlineApi.pushStoreSnapshot(payload);
      } catch (e) {
        console.warn("[history] cloud snapshot push failed:", e);
      }
    }, 900);
  } catch {}
}

console.warn("🔥 HISTORY PATCH LOADED v2");

/* =========================
   Constantes
========================= */
const LSK = "dc-history-v1"; // ancien storage (migration + fallback)
const scopedHistoryLsKey = () => scopedStorageKey(LSK);
const DB_NAME = "dc-store-v1";
const DB_VER = 3; // ⬅ split header/detail stores
const STORE_LEGACY = "history";
const STORE_HEADERS = "history_headers";
const STORE_DETAILS = "history_details";
const STORE = STORE_HEADERS;
const MAX_ROWS = 400;
const MAX_CACHE_ROWS = 200;
const LIST_PAYLOAD_KINDS = new Set(["cricket"]); // payload décodé seulement si vraiment utile

// =========================
// ✅ PATCH CRITICAL — JSON parse SAFE (ANTI-FREEZE + JSONC)
// - ne parse QUE si JSON-like ({ ou [)
// - JSON strict, puis JSONC (strip // comments + block comments + trailing commas)
// - log 1 seule fois par (id+stage+snippet) (anti-spam)
// =========================
const __historyWarnedPayloads = new Set<string>();

function stripJsonCommentsAndTrailingCommas(input: string): string {
  if (!input) return input;

  // Strip comments safely (ignore "comments" inside strings)
  let out = "";
  let inStr = false;
  let esc = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const n = input[i + 1];

    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
      continue;
    }

    if (inBlock) {
      if (c === "*" && n === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }

    if (inStr) {
      out += c;
      if (esc) {
        esc = false;
      } else if (c === "\\") {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }

    // not in string
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }

    // start comments
    if (c === "/" && n === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlock = true;
      i++;
      continue;
    }

    out += c;
  }

  // Remove trailing commas: ",}" and ",]"
  out = out.replace(/,\s*([}\]])/g, "$1");
  return out;
}

function safeJsonParse(raw: any, ctx?: { id?: string; stage?: string }) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const s = raw.trim();

  // ✅ ne tente même pas JSON.parse si pas JSON-like
  if (!(s.startsWith("{") || s.startsWith("["))) return null;

  // 1) JSON strict
  try {
    return JSON.parse(s);
  } catch {
    // 2) JSONC (comments + trailing commas)
    try {
      const cleaned = stripJsonCommentsAndTrailingCommas(s);
      return JSON.parse(cleaned);
    } catch {
      // ✅ anti-spam + log avec id/stage si dispo
      const key = `${ctx?.id || "?"}::${ctx?.stage || "parse"}::${s.slice(0, 180)}`;
      if (!__historyWarnedPayloads.has(key)) {
        __historyWarnedPayloads.add(key);
        console.warn(
          "[History] JSON parse failed (skipped record)",
          { id: ctx?.id, stage: ctx?.stage },
          s.slice(0, 220)
        );
      }
      return null;
    }
  }
}

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

/* =========================
   ✅ FIX STATS: decode payloadCompressed (best-effort, no throw)
   - ne parse QUE si JSON-like
   - anti-spam logs
   - ✅ JSONC support + ctx id/stage
========================= */
function decodePayloadCompressedBestEffort(
  payloadCompressed: any,
  ctx?: { id?: string; stage?: string }
): any | null {
  if (!payloadCompressed) return null;
  if (typeof payloadCompressed !== "string") return null;

  const s = payloadCompressed;

  const tryParseIfJsonLike = (txt: any, stage: string) => {
    if (typeof txt !== "string") return null;
    const t = txt.trim();
    if (!(t.startsWith("{") || t.startsWith("["))) return null;
    const obj = safeJsonParse(t, { id: ctx?.id, stage: ctx?.stage ? `${ctx.stage}:${stage}` : stage });
    return obj && typeof obj === "object" ? obj : null;
  };

  // 0) ✅ legacy: payloadCompressed peut déjà être du JSON (non compressé)
  try {
    const direct = tryParseIfJsonLike(s, "direct");
    if (direct) return direct;
  } catch {}

  // 1) UTF16 standard
  try {
    const dec = (LZString as any).decompressFromUTF16?.(s);
    const obj = tryParseIfJsonLike(dec, "lz:utf16");
    if (obj) return obj;
  } catch {}

  // 2) decompress direct (rare legacy)
  try {
    const dec = (LZString as any).decompress?.(s);
    const obj = tryParseIfJsonLike(dec, "lz:raw");
    if (obj) return obj;
  } catch {}

  // 3) base64-ish → bin → (json OR decompress)
  try {
    const isB64 = /^[A-Za-z0-9+/=\r\n\s-]+$/.test(s) && s.length > 16;
    if (isB64) {
      const bin = (LZString as any)._tryDecodeBase64ToString?.(s) || "";

      // 3a) bin déjà JSON
      const obj0 = tryParseIfJsonLike(bin, "b64:bin");
      if (obj0) return obj0;

      // 3b) bin = compress() -> decompress()
      try {
        const dec = (LZString as any).decompress?.(bin);
        const obj = tryParseIfJsonLike(dec, "b64->lz");
        if (obj) return obj;
      } catch {}
    }
  } catch {}

  return null;
}

/* =========================
   Mini LZ-String UTF16
========================= */
/* eslint-disable */
const LZString = (function () {
  const f = String.fromCharCode;
  const baseReverseDic: Record<string, Record<string, number>> = {};
  function getBaseValue(alphabet: string, character: string) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (let i = 0; i < alphabet.length; i++) {
        baseReverseDic[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return baseReverseDic[alphabet][character];
  }
  const keyStrUriSafe =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  const LZ: any = {};
  LZ.compressToUTF16 = function (input: string) {
    if (input == null) return "";
    let output = "",
      current = 0,
      status = 0,
      i: number;
    input = LZ.compress(input);
    for (i = 0; i < input.length; i++) {
      current = (current << 1) + input.charCodeAt(i);
      if (status++ == 14) {
        output += f(current + 32);
        status = 0;
        current = 0;
      }
    }
    return output + f(current + 32 + status);
  };
  LZ.decompressFromUTF16 = function (compressed: string) {
    if (compressed == null) return "";
    let output = "",
      current = 0,
      status = 0,
      i: number,
      c: number;
    for (i = 0; i < compressed.length; i++) {
      c = compressed.charCodeAt(i) - 32;
      if (status === 0) {
        status = c & 15;
        current = c >> 4;
      } else {
        current = (current << 15) + c;
        status += 15;
        while (status >= 8) {
          status -= 8;
          output += f((current >> status) & 255);
        }
      }
    }
    return LZ.decompress(output);
  };
  // ✅ Optionnel "best-effort": certains legacy étaient base64-ish
  LZ._tryDecodeBase64ToString = function (b64: string) {
    try {
      const bin = atob(b64.replace(/[\r\n\s]/g, ""));
      return bin;
    } catch {
      return "";
    }
  };
  LZ.compress = function (uncompressed: string) {
    if (uncompressed == null) return "";
    let i,
      value,
      context_dictionary: any = {},
      context_dictionaryToCreate: any = {},
      context_c = "",
      context_wc = "",
      context_w = "",
      context_enlargeIn = 2,
      context_dictSize = 3,
      context_numBits = 2,
      context_data: number[] = [],
      context_data_val = 0,
      context_data_position = 0;
    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }
      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc))
        context_w = context_wc;
      else {
        if (
          Object.prototype.hasOwnProperty.call(
            context_dictionaryToCreate,
            context_w
          )
        ) {
          value = context_w.charCodeAt(0);
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1;
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
          }
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
            value >>= 1;
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
            // @ts-ignore
            value >>= 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }
    if (context_w !== "") {
      if (
        Object.prototype.hasOwnProperty.call(
          context_dictionaryToCreate,
          context_w
        )
      ) {
        value = context_w.charCodeAt(0);
        for (i = 0; i < context_numBits; i++) {
          context_data_val = context_data_val << 1;
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
        }
        for (i = 0; i < 8; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
          value >>= 1;
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
          // @ts-ignore
          value >>= 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }
    for (i = 0; i < context_numBits; i++) {
      context_data_val = context_data_val << 1;
      if (context_data_position == 15) {
        context_data.push(context_data_val);
        context_data_val = 0;
        context_data_position = 0;
      } else context_data_position++;
    }
    return context_data.map((c) => String.fromCharCode(c + 32)).join("");
  };
  LZ.decompress = function (compressed: string) {
    if (compressed == null) return "";
    let dictionary: any[] = [0, 1, 2],
      enlargeIn = 4,
      dictSize = 4,
      numBits = 3,
      result: string[] = [],
      w: any,
      c: number;
    const data = {
      string: compressed,
      val: compressed.charCodeAt(0) - 32,
      position: 32768,
      index: 1,
    };
    function readBits(n: number) {
      let bits = 0,
        maxpower = Math.pow(2, n),
        power = 1;
      while (power != maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = 32768;
          data.val = data.string.charCodeAt(data.index++) - 32;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      return bits;
    }
    const next = readBits(2);
    switch (next) {
      case 0:
        c = readBits(8);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 1:
        c = readBits(16);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 2:
        return "";
    }
    result.push(w as string);
    while (true) {
      if (data.index > data.string.length) return "";
      let cc = readBits(numBits);
      let entry2: any;
      if (cc === 0) {
        c = readBits(8);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 1) {
        c = readBits(16);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 2) return result.join("");
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      if (dictionary[cc]) entry2 = dictionary[cc];
      else if (cc === dictSize) entry2 = (w as string) + (w as string).charAt(0);
      else return "";
      result.push(entry2 as string);
      dictionary[dictSize++] = (w as string) + (entry2 as string).charAt(0);
      enlargeIn--;
      w = entry2;
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  };
  return LZ;
})();
/* eslint-enable */

/* =========================
   ✅ FIX: lecture robuste localStorage (JSON OU LZString)
   ✅ PATCH: safeJsonParse partout (0 throw)
========================= */
function parseHistoryLocalStorage(raw: string | null): any[] {
  if (!raw) return [];
  const s = String(raw);
  const trimmed = s.trim();

  // 1) JSON direct
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const v = safeJsonParse(trimmed, { id: "localStorage", stage: "legacy:json" });
    return asArray(v);
  }

  // 2) LZString UTF16
  try {
    const dec = (LZString as any).decompressFromUTF16?.(s);
    if (typeof dec === "string" && dec.trim().length) {
      const v = safeJsonParse(dec, { id: "localStorage", stage: "legacy:lz:utf16" });
      return asArray(v);
    }
  } catch {}

  // 3) Base64-ish best effort
  try {
    const isB64 = /^[A-Za-z0-9+/=\r\n\s-]+$/.test(s) && s.length > 16;
    if (isB64) {
      const bin = (LZString as any)._tryDecodeBase64ToString?.(s) || "";
      if (bin) {
        // 3a) bin déjà JSON
        const v0 = safeJsonParse(bin, { id: "localStorage", stage: "legacy:b64:bin" });
        if (Array.isArray(v0)) return v0;

        // 3b) bin = compress() -> decompress()
        try {
          const dec = (LZString as any).decompress?.(bin);
          if (typeof dec === "string" && dec.trim().length) {
            const v = safeJsonParse(dec, { id: "localStorage", stage: "legacy:b64->lz" });
            return asArray(v);
          }
        } catch {}
      }
    }
  } catch {}

  // 4) decompress direct (rare)
  try {
    const dec = (LZString as any).decompress?.(s);
    if (typeof dec === "string" && dec.trim().length) {
      const v = safeJsonParse(dec, { id: "localStorage", stage: "legacy:lz:raw" });
      return asArray(v);
    }
  } catch {}

  return [];
}

function readLegacyRowsSafe(): SavedMatch[] {
  try {
    const raw = localStorage.getItem(scopedHistoryLsKey());
    const rows = parseHistoryLocalStorage(raw);
    return Array.isArray(rows) ? (rows as SavedMatch[]) : [];
  } catch {
    return [];
  }
}

/* =========================
   ✅ DEDUPE KEY — 1 match réel = 1 id canonique
========================= */
function getCanonicalMatchId(rec: any): string | null {
  if (!rec) return null;
  const direct =
    rec?.matchId ??
    rec?.sessionId ??
    rec?.resumeId ??
    rec?.summary?.matchId ??
    rec?.summary?.sessionId ??
    rec?.summary?.resumeId ??
    null;

  const payload =
    rec?.payload ??
    rec?.payloadRaw ??
    rec?.engineState?.payload ??
    rec?.payload?.payload ??
    null;

  const fromPayload =
    payload?.matchId ??
    payload?.sessionId ??
    payload?.resumeId ??
    payload?.summary?.matchId ??
    payload?.summary?.sessionId ??
    payload?.engineState?.matchId ??
    payload?.engineState?.sessionId ??
    null;

  const fromEngine =
    rec?.engineState?.matchId ??
    rec?.engineState?.sessionId ??
    rec?.payload?.engineState?.matchId ??
    rec?.payload?.engineState?.sessionId ??
    null;

  const v = direct ?? fromPayload ?? fromEngine ?? null;
  if (!v) return null;
  const s = String(v);
  return s.length ? s : null;
}

/* =========================
   IndexedDB helpers
========================= */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const fail = (err: any) => {
      if (settled) return;
      settled = true;
      try {
        req?.result?.close?.();
      } catch {}
      reject(err);
    };

    const t = window.setTimeout(() => {
      fail(new Error("[history] openDB timeout (IndexedDB blocked?)"));
    }, 1500);

    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      try {
        const db = req.result;
        let headers: IDBObjectStore;

        if (!db.objectStoreNames.contains(STORE_HEADERS)) {
          headers = db.createObjectStore(STORE_HEADERS, { keyPath: "id" });
        } else {
          headers = req.transaction!.objectStore(STORE_HEADERS);
        }

        try {
          // @ts-ignore
          if (!headers.indexNames || !headers.indexNames.contains("by_updatedAt")) {
            headers.createIndex("by_updatedAt", "updatedAt", { unique: false });
          }
        } catch {
          try {
            headers.createIndex("by_updatedAt", "updatedAt", { unique: false });
          } catch {}
        }

        try {
          // @ts-ignore
          if (!headers.indexNames || !headers.indexNames.contains("by_matchId")) {
            headers.createIndex("by_matchId", "matchId", { unique: false });
          }
        } catch {
          try {
            headers.createIndex("by_matchId", "matchId", { unique: false });
          } catch {}
        }

        let details: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_DETAILS)) {
          details = db.createObjectStore(STORE_DETAILS, { keyPath: "id" });
        } else {
          details = req.transaction!.objectStore(STORE_DETAILS);
        }

        try {
          // @ts-ignore
          if (!details.indexNames || !details.indexNames.contains("by_updatedAt")) {
            details.createIndex("by_updatedAt", "updatedAt", { unique: false });
          }
        } catch {
          try {
            details.createIndex("by_updatedAt", "updatedAt", { unique: false });
          } catch {}
        }
      } catch (e) {
        console.warn("[history] onupgradeneeded error:", e);
      }
    };

    req.onblocked = () => {
      window.clearTimeout(t);
      fail(new Error("[history] IndexedDB blocked (close other tabs/windows using the app)"));
    };

    req.onsuccess = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);

      const db = req.result;
      try {
        db.onversionchange = () => {
          try {
            db.close();
          } catch {}
        };
      } catch {}

      resolve(db);
    };

    req.onerror = () => {
      window.clearTimeout(t);
      fail(req.error || new Error("[history] openDB error"));
    };
  });
}

async function withStoreName<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let result: T;

    const tx = db.transaction(storeName, mode);
    const st = tx.objectStore(storeName);

    const finishResolve = () => {
      if (settled) return;
      settled = true;
      resolve(result as T);
    };

    const finishReject = (err: any) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    tx.oncomplete = () => finishResolve();
    tx.onerror = () => finishReject(tx.error || new Error("IndexedDB tx error"));
    tx.onabort = () => finishReject(tx.error || new Error("IndexedDB tx aborted"));

    const to = window.setTimeout(() => {
      finishReject(new Error("IndexedDB tx timeout"));
      try {
        tx.abort();
      } catch {}
    }, 8000);

    const clearTo = () => window.clearTimeout(to);

    Promise.resolve()
      .then(() => fn(st))
      .then((v) => {
        result = v as T;
      })
      .catch((e) => {
        clearTo();
        finishReject(e);
        try {
          tx.abort();
        } catch {}
      });

    tx.addEventListener("complete", clearTo);
    tx.addEventListener("error", clearTo);
    tx.addEventListener("abort", clearTo);
  });
}

async function withStores<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  fn: (stores: Record<string, IDBObjectStore>) => Promise<T> | T
): Promise<T> {
  const db = await openDB();

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let result: T;

    const tx = db.transaction(storeNames, mode);
    const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)])) as Record<string, IDBObjectStore>;

    const finishResolve = () => {
      if (settled) return;
      settled = true;
      resolve(result as T);
    };
    const finishReject = (err: any) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    tx.oncomplete = () => finishResolve();
    tx.onerror = () => finishReject(tx.error || new Error("IndexedDB tx error"));
    tx.onabort = () => finishReject(tx.error || new Error("IndexedDB tx aborted"));

    const to = window.setTimeout(() => {
      finishReject(new Error("IndexedDB tx timeout"));
      try {
        tx.abort();
      } catch {}
    }, 8000);
    const clearTo = () => window.clearTimeout(to);

    Promise.resolve()
      .then(() => fn(stores))
      .then((v) => {
        result = v as T;
      })
      .catch((e) => {
        clearTo();
        finishReject(e);
        try {
          tx.abort();
        } catch {}
      });

    tx.addEventListener("complete", clearTo);
    tx.addEventListener("error", clearTo);
    tx.addEventListener("abort", clearTo);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  return withStoreName(STORE_HEADERS, mode, fn);
}

function toHeaderRecord(rec: any) {
  const out: any = normalizeHistoryRow({ ...(rec || {}) });
  delete out.payload;
  delete out.payloadCompressed;
  return out;
}

function toDetailRecord(id: string, payloadCompressed: string, rec: any) {
  const updatedAt = Number(rec?.updatedAt || Date.now());
  return {
    id: String(id),
    matchId: String(rec?.matchId ?? id),
    kind: String(rec?.kind || ""),
    status: String(rec?.status || ""),
    createdAt: Number(rec?.createdAt || updatedAt),
    updatedAt,
    payloadCompressed: payloadCompressed || "",
  };
}

let legacyIdbMigrDone = false;
async function migrateLegacyIdbOnce() {
  if (legacyIdbMigrDone) return;
  legacyIdbMigrDone = true;

  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_LEGACY)) return;

    const headersCount = await withStoreName(STORE_HEADERS, "readonly", (st) =>
      new Promise<number>((resolve) => {
        const req = st.count();
        req.onsuccess = () => resolve(Number(req.result || 0));
        req.onerror = () => resolve(0);
      })
    ).catch(() => 0);

    if (headersCount > 0) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_LEGACY, STORE_HEADERS, STORE_DETAILS], "readwrite");
      const legacy = tx.objectStore(STORE_LEGACY);
      const headers = tx.objectStore(STORE_HEADERS);
      const details = tx.objectStore(STORE_DETAILS);
      const req = legacy.openCursor();

      req.onsuccess = () => {
        const cur = req.result as IDBCursorWithValue | null;
        if (!cur) return;
        const row: any = cur.value || {};
        const id = String(row?.id ?? row?.matchId ?? "").trim();
        if (id) {
          const header = toHeaderRecord({ ...row, id, matchId: String(row?.matchId ?? id) });
          const detail = toDetailRecord(id, String(row?.payloadCompressed || ""), row);
          try { headers.put(header); } catch {}
          try { details.put(detail); } catch {}
        }
        cur.continue();
      };
      req.onerror = () => reject(req.error || new Error("history legacy cursor error"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("history legacy migration tx error"));
      tx.onabort = () => reject(tx.error || new Error("history legacy migration tx aborted"));
    });
  } catch (e) {
    console.warn("[history] legacy IDB migration skipped:", e);
  }
}

/* =========================
   Migration depuis localStorage (une seule fois)
========================= */
let migrDone = false;

async function migrateFromLocalStorageOnce() {
  if (migrDone) return;
  migrDone = true;

  await migrateLegacyIdbOnce().catch(() => {});

  try {
    const raw = localStorage.getItem(scopedHistoryLsKey());
    if (!raw) return;

    const rows: SavedMatch[] = readLegacyRowsSafe();
    if (!rows.length) return;

    await withStores([STORE_HEADERS, STORE_DETAILS], "readwrite", async (stores) => {
      const headers = stores[STORE_HEADERS];
      const details = stores[STORE_DETAILS];
      for (const r of rows) {
        const rec: any = normalizeHistoryRow({ ...r });
        const id = String(rec?.matchId ?? rec?.id ?? "").trim();
        if (!id) continue;
        const payloadStr = rec.payload ? JSON.stringify(stripAvatarDataFromPayload(rec.payload)) : "";
        const payloadCompressed = payloadStr ? LZString.compressToUTF16(payloadStr) : "";
        delete rec.payload;
        if (Array.isArray(rec.players)) rec.players = stripAvatarDataFromPlayers(rec.players);
        const header = toHeaderRecord({ ...rec, id, matchId: id });
        const detail = toDetailRecord(id, payloadCompressed, rec);

        await new Promise<void>((res, rej) => {
          const req = headers.put(header);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        });
        await new Promise<void>((res, rej) => {
          const req = details.put(detail);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        });
      }
    });

    localStorage.removeItem(scopedHistoryLsKey());
    console.info("[history] migration depuis localStorage effectuée");
  } catch (e) {
    console.warn("[history] migration impossible:", e);
  }
}

/* =========================
   Lectures
========================= */
export async function list(): Promise<SavedMatch[]> {
  await migrateFromLocalStorageOnce();

  try {
    const rows: any[] = await withStoreName(STORE_HEADERS, "readonly", async (st) => {
      const readWithIndex = async () =>
        await new Promise<any[]>((resolve, reject) => {
          try {
            // @ts-ignore
            const hasIndex = st.indexNames && st.indexNames.contains("by_updatedAt");
            if (!hasIndex) throw new Error("no_index");
            const ix = st.index("by_updatedAt");
            const req = ix.openCursor(undefined, "prev");
            const out: any[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                out.push({ ...cur.value });
                cur.continue();
              } else resolve(out);
            };
            req.onerror = () => reject(req.error);
          } catch (e) {
            reject(e);
          }
        });

      const readWithoutIndex = async () =>
        await new Promise<any[]>((resolve, reject) => {
          const req = st.openCursor();
          const out: any[] = [];
          req.onsuccess = () => {
            const cur = req.result as IDBCursorWithValue | null;
            if (cur) {
              out.push({ ...cur.value });
              cur.continue();
            } else {
              out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
              resolve(out);
            }
          };
          req.onerror = () => reject(req.error);
        });

      try {
        return await readWithIndex();
      } catch {
        return await readWithoutIndex();
      }
    });

    const byMatch = new Map<string, any>();
    for (const r0 of rows || []) {
      const r: any = r0;
      if (!r) continue;
      let key = getCanonicalMatchId(r) ?? String(r?.matchId ?? "");
      if (!key) key = String(r?.id ?? "");
      if (!key) continue;

      const existing = byMatch.get(key);
      const tNew = Number(r?.updatedAt ?? r?.createdAt ?? 0);
      const out = normalizeHistoryRow({ ...r, id: key, matchId: key } as any);
      if (Array.isArray(out.players)) out.players = stripAvatarDataFromPlayers(out.players) || [];

      if (!existing) byMatch.set(key, out);
      else {
        const tOld = Number(existing?.updatedAt ?? existing?.createdAt ?? 0);
        if (tNew >= tOld) byMatch.set(key, out);
      }
    }

    return Array.from(byMatch.values()).filter(isHistoryRowUsable).map((r: any) => normalizeHistoryRow(r)) as SavedMatch[];
  } catch {
    return readLegacyRowsSafe();
  }
}

export async function get(id: string): Promise<SavedMatch | null> {
  await migrateFromLocalStorageOnce();

  try {
    const rec: any = await withStores([STORE_HEADERS, STORE_DETAILS], "readonly", async (stores) => {
      const headers = stores[STORE_HEADERS];
      const details = stores[STORE_DETAILS];

      const getHeaderDirect = () =>
        new Promise<any>((resolve) => {
          const req = headers.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

      const getHeaderByMatchId = () =>
        new Promise<any>((resolve) => {
          try {
            // @ts-ignore
            const hasIx = headers.indexNames && headers.indexNames.contains("by_matchId");
            if (!hasIx) return resolve(null);
            const req = headers.index("by_matchId").get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });

      const scanHeader = () =>
        new Promise<any>((resolve) => {
          const req = headers.openCursor();
          req.onsuccess = () => {
            const cur = req.result as IDBCursorWithValue | null;
            if (!cur) return resolve(null);
            const v: any = cur.value;
            if (v?.matchId === id) return resolve(v);
            cur.continue();
          };
          req.onerror = () => resolve(null);
        });

      let header = (await getHeaderDirect()) || (await getHeaderByMatchId()) || (await scanHeader());

      // V14 DETAIL FIX: si l’appelant demande un id composite "matchId:playerId",
      // retenter automatiquement avec la partie avant ':' pour retrouver le vrai match.
      if (!header && String(id || "").includes(":")) {
        const baseId = String(id).split(":")[0]?.trim();
        if (baseId) {
          header =
            (await new Promise<any>((resolve) => {
              const req = headers.get(baseId);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            })) ||
            (await new Promise<any>((resolve) => {
              try {
                // @ts-ignore
                const hasIx = headers.indexNames && headers.indexNames.contains("by_matchId");
                if (!hasIx) return resolve(null);
                const req = headers.index("by_matchId").get(baseId);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
              } catch {
                resolve(null);
              }
            }));
        }
      }

      if (!header) return null;

      const detail = await new Promise<any>((resolve) => {
        const req = details.get(String(header?.id ?? id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      return { header, detail };
    });

    if (!rec?.header) {
      const rows = readLegacyRowsSafe();
      return (rows.find((r) => r.id === id || r.matchId === id) || null) as SavedMatch | null;
    }

    const header = { ...(rec.header || {}) };
    const detail = rec.detail || null;

    let payload: any | null = decodePayloadCompressedBestEffort(detail?.payloadCompressed, {
      id: String(id),
      stage: "get",
    });

    if (!payload && typeof detail?.payloadCompressed === "string") {
      const t = String(detail.payloadCompressed || "").trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        payload = safeJsonParse(t, {
          id: String(id),
          stage: "get:payloadCompressed:direct",
        });
      }
    }

    // V3 FIX : si le payload principal a été compacté/corrompu/ancien,
    // on reconstruit une base exploitable depuis header.resume.
    // Cela répare la reprise X01 et évite "configuration absente".
    try {
      const resume = (header as any)?.resume;
      const needsResumeMerge =
        resume &&
        typeof resume === "object" &&
        (!payload ||
          typeof payload !== "object" ||
          ((payload as any)?.config == null && (resume as any)?.config != null) ||
          (!Array.isArray((payload as any)?.darts) && Array.isArray((resume as any)?.darts)));

      if (needsResumeMerge) {
        payload = {
          ...(payload && typeof payload === "object" ? payload : {}),
          ...(resume?.config ? { config: resume.config } : {}),
          ...(resume?.state ? { state: resume.state } : {}),
          ...(Array.isArray(resume?.darts) ? { darts: resume.darts } : {}),
        };
      }
    } catch {}

    const mid = getCanonicalMatchId({ ...header, payload }) ?? header.matchId ?? null;
    if (mid) header.matchId = String(mid);

    if (Array.isArray(header.players)) {
      header.players = stripAvatarDataFromPlayers(header.players);
    }

    return normalizeHistoryRow({
      ...header,
      payload: stripAvatarDataFromPayload(payload),
    } as any) as SavedMatch;
  } catch (e) {
    console.warn("[history.get] fallback localStorage:", e);
    const rows = readLegacyRowsSafe();
    const hit = rows.find((r) => r.id === id || r.matchId === id) || null;
    return hit ? (normalizeHistoryRow(hit as any) as SavedMatch) : null;
  }
}


function _toLightHistoryRow(rec: any): SavedMatch {
  const out: any = normalizeHistoryRow({ ...(rec || {}) });
  delete out.payloadCompressed;

  // Pour les listes / cache, on garde un resume minimal sans grosses séquences
  if (out.resume && typeof out.resume === "object") {
    const resume = { ...(out.resume || {}) };
    if (Array.isArray(resume.darts)) {
      resume.darts = resume.darts.slice(-30);
    }
    out.resume = resume;
  }

  return out as SavedMatch;
}

async function _readRowsLightFromIdb(): Promise<SavedMatch[]> {
  await migrateFromLocalStorageOnce();

  const rows: any[] = await withStoreName(STORE_HEADERS, "readonly", async (st) => {
    const readWithIndex = async () =>
      await new Promise<any[]>((resolve, reject) => {
        try {
          // @ts-ignore
          const hasIndex = st.indexNames && st.indexNames.contains("by_updatedAt");
          if (!hasIndex) throw new Error("no_index");
          const ix = st.index("by_updatedAt");
          const req = ix.openCursor(undefined, "prev");
          const out: any[] = [];
          req.onsuccess = () => {
            const cur = req.result as IDBCursorWithValue | null;
            if (cur) {
              out.push({ ...cur.value });
              cur.continue();
            } else resolve(out);
          };
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });

    const readWithoutIndex = async () =>
      await new Promise<any[]>((resolve, reject) => {
        const req = st.openCursor();
        const out: any[] = [];
        req.onsuccess = () => {
          const cur = req.result as IDBCursorWithValue | null;
          if (cur) {
            out.push({ ...cur.value });
            cur.continue();
          } else {
            out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            resolve(out);
          }
        };
        req.onerror = () => reject(req.error);
      });

    try {
      return await readWithIndex();
    } catch {
      return await readWithoutIndex();
    }
  });

  const byMatch = new Map<string, any>();
  for (const r0 of rows || []) {
    const r: any = r0;
    if (!r) continue;
    let key = getCanonicalMatchId(r) ?? String(r?.matchId ?? "");
    if (!key) key = String(r?.id ?? "");
    if (!key) continue;

    const existing = byMatch.get(key);
    const tNew = Number(r?.updatedAt ?? r?.createdAt ?? 0);
    const out = _toLightHistoryRow({ ...r, id: key, matchId: key });
    if (Array.isArray(out.players)) out.players = stripAvatarDataFromPlayers(out.players) || [];

    if (!existing) {
      byMatch.set(key, out);
    } else {
      const tOld = Number(existing?.updatedAt ?? existing?.createdAt ?? 0);
      if (tNew >= tOld) byMatch.set(key, out);
    }
  }

  return Array.from(byMatch.values())
    .filter(isHistoryRowUsable)
    .map((r: any) => normalizeHistoryRow(r)) as SavedMatch[];
}

type _TrimRow = { id: string; updatedAt?: number; createdAt?: number; status?: string; conflictOf?: string | null };
type _TrimRow = { id: string; updatedAt?: number; createdAt?: number; status?: string; conflictOf?: string | null };

function _computeTrimIds(rows: _TrimRow[], keepIds: string[] = []): string[] {
  const uniqKeep = new Set((keepIds || []).filter(Boolean).map(String));
  if (!Array.isArray(rows) || rows.length <= MAX_ROWS) return [];

  const sorted = [...rows].sort((a, b) => Number(b?.updatedAt || b?.createdAt || 0) - Number(a?.updatedAt || a?.createdAt || 0));
  const overflow = sorted.length - MAX_ROWS;
  if (overflow <= 0) return [];

  const isProtected = (r: _TrimRow) =>
    uniqKeep.has(String(r?.id || "")) ||
    String(r?.status || "") === "in_progress" ||
    !!r?.conflictOf;

  const deletable = sorted.filter((r) => !isProtected(r)).reverse(); // plus vieux d'abord
  const picked: string[] = [];
  for (const r of deletable) {
    if (picked.length >= overflow) break;
    if (!r?.id) continue;
    picked.push(String(r.id));
  }

  if (picked.length >= overflow) return picked;

  // Dernier recours: si la DB contient trop d'éléments protégés, on complète avec les plus vieux,
  // mais on n'efface jamais l'élément en cours d'upsert.
  const fallback = sorted
    .filter((r) => !uniqKeep.has(String(r?.id || "")) && !picked.includes(String(r?.id || "")))
    .reverse();

  for (const r of fallback) {
    if (picked.length >= overflow) break;
    if (!r?.id) continue;
    picked.push(String(r.id));
  }

  return picked;
}

/* =========================
   Écritures
========================= */
export async function upsert(rec: SavedMatch): Promise<void> {
  await migrateFromLocalStorageOnce();

  try {
    rec = sanitizeRecord(rec);
  } catch (e) {
    console.warn("[history.upsert] sanitizeRecord failed:", e);
  }

  const now = Date.now();

  // ✅ id canonique
  const canonicalId =
    getCanonicalMatchId(rec) ??
    rec.matchId ??
    rec.id ??
    (crypto.randomUUID?.() ?? String(now));

  const safe: any = normalizeHistoryRow({
    id: String(canonicalId),
    matchId: String(canonicalId),
    kind: rec.kind || "x01",
    game: (rec as any).game ?? null,
    status: inferHistoryStatus(rec),
    players: Array.isArray(rec.players) ? rec.players : [],
    winnerId: rec.winnerId ?? null,
    createdAt: rec.createdAt ?? now,
    updatedAt: now,
    summary: rec.summary || null,
  });

  // ============================================
  // 🔒 PATCH CRITICAL — SUPPRESSION AVATAR BASE64
  // évite crash React / Android / historique énorme
  // ============================================
  try {
    if (Array.isArray(safe.players)) {
      safe.players = stripAvatarDataFromPlayers(safe.players) || [];
    }
  } catch (e) {
    console.warn("[history] avatar strip failed (safe.players):", e);
  }

  // ✅ V4 FIX CRITICAL : ne jamais laisser un autosave tardif "in_progress"
  // ré-écraser une partie déjà terminée.
  // Cas réel constaté : X01 termine, puis un timer autosave flush encore un record
  // in_progress avec le même id => Historique bloqué en "En cours", StatsHub à 0, reprise cassée.
  try {
    if (String((safe as any).status || "") === "in_progress") {
      const existingHeader = await withStore("readonly", async (st) => {
        return await new Promise<any>((resolve) => {
          const req = st.get(String(safe.id));
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      });
      const existingStatus = existingHeader ? inferHistoryStatus(existingHeader) : null;
      if (existingStatus === "finished") {
        try { _resumeIndexRemove(String((safe as any).id)); } catch {}
        return;
      }
    }
  } catch {}

  // ✅ MAJ index de reprise (multi-sport)
  try {
    const st = String((safe as any).status || "");
    if (st === "in_progress") _resumeIndexAdd(String((safe as any).id));
    else _resumeIndexRemove(String((safe as any).id));
  } catch {}

  // payload effectif (on le mutera si on ajoute des infos sets)
  let payloadEffective = stripAvatarDataFromPayload(rec.payload);

  // ✅ DART SETS : injecte dartSetId dans safe.players si présent dans payload/config
  try {
    const cfgPlayers: any[] =
      (payloadEffective as any)?.config?.players ??
      (payloadEffective as any)?.cfg?.players ??
      (payloadEffective as any)?.players ??
      (safe.game as any)?.players ??
      [];

    const map: Record<string, string | null> = {};
    for (const p of Array.isArray(cfgPlayers) ? cfgPlayers : []) {
      const key = String((p as any)?.profileId ?? (p as any)?.id ?? "");
      if (!key) continue;
      const ds =
        (p as any)?.dartSetId ??
        (p as any)?.dartsetId ??
        (p as any)?.dartSet ??
        null;
      if (typeof ds === "string" && ds.trim()) map[key] = ds.trim();
      else if (ds === null) map[key] = null;
    }

    if (Array.isArray(safe.players) && safe.players.length > 0) {
      safe.players = safe.players.map((p: any) => {
        const pid = String(p?.profileId ?? p?.id ?? "");
        const ds =
          p?.dartSetId ??
          (pid && Object.prototype.hasOwnProperty.call(map, pid) ? map[pid] : null);
        return { ...p, dartSetId: ds ?? null };
      });
    }
  } catch {}

  // ---------------------------------------------
  // 🎯 Cricket : calcul auto legStats
  // ---------------------------------------------

  // ✅ Conserver le "mode" de jeu pour StatsHub (multi-modes/fun/variants)
  // rec.game est généralement un objet { mode, ... } — on le garde tel quel dans la ligne "safe"
  // Fallback: si rec.game absent, on tente de récupérer un mode depuis payload/config
  try {
    if (!safe.game) {
      const cfg: any = (payloadEffective as any)?.config ?? (payloadEffective as any)?.cfg ?? null;
      const mode =
        (payloadEffective as any)?.game?.mode ??
        (payloadEffective as any)?.mode ??
        cfg?.mode ??
        cfg?.gameMode ??
        null;
      if (mode) safe.game = { mode };
    }
  } catch {}

  try {
    if (rec.kind === "cricket" && payloadEffective && typeof payloadEffective === "object") {
      const base = stripAvatarDataFromPayload(payloadEffective) as any;
      const players = Array.isArray(base.players) ? base.players : [];
      const playersWithStats = players.map((p: any) => {
        const cleanPlayer = stripAvatarFieldFromPlayer(p);
        const hits: CricketHit[] = Array.isArray(cleanPlayer?.hits) ? cleanPlayer.hits : [];
        const legStats =
          cleanPlayer?.legStats && typeof cleanPlayer.legStats === "object"
            ? cleanPlayer.legStats
            : computeCricketLegStats(hits);
        return { ...cleanPlayer, hits, legStats };
      });

      payloadEffective = {
        ...base,
        mode: base.mode ?? "cricket",
        players: playersWithStats,
      };

      // matchId léger si dispo
      const mid =
        getCanonicalMatchId({ ...rec, payload: payloadEffective }) ??
        base?.matchId ??
        base?.sessionId ??
        base?.engineState?.matchId ??
        base?.engineState?.sessionId ??
        null;
      if (mid) safe.matchId = String(mid);
    }
  } catch (e) {
    console.warn("[history.upsert] cricket enrichment error:", e);
  }

  // ---------------------------------------------
  // 🎯 X01 : expose startScore pour l'UI
  // ---------------------------------------------
  try {
    if (rec.kind === "x01" && payloadEffective && typeof payloadEffective === "object") {
      const base = stripAvatarDataFromPayload(payloadEffective) as any;
      const cfg =
        base.config ||
        base.game?.config ||
        base.x01?.config ||
        base.match?.config ||
        base.x01Config;

      if (cfg) {
        const sc =
          cfg.startScore ??
          cfg.start ??
          cfg.x01StartScore ??
          cfg.x01Start ??
          cfg.startingScore;
        if (typeof sc === "number" && sc > 0) {
          safe.game = {
            ...(safe.game || {}),
            mode: safe.kind || rec.kind || "x01",
            startScore: sc,
          };
          const prevSummary: any = safe.summary || {};
          safe.summary = {
            ...prevSummary,
            game: { ...(prevSummary.game || {}), startScore: sc },
          };
        }
      }

      if (base.summary && typeof base.summary === "object") {
        const prevSummary: any = safe.summary || {};
        safe.summary = { ...base.summary, ...prevSummary };
      } else if (base.result && typeof base.result === "object") {
        const prevSummary: any = safe.summary || {};
        safe.summary = {
          ...prevSummary,
          result: { ...(prevSummary.result || {}), ...base.result },
        };
      }

      const mid =
        getCanonicalMatchId({ ...rec, payload: payloadEffective }) ??
        base?.matchId ??
        base?.sessionId ??
        base?.engineState?.matchId ??
        base?.engineState?.sessionId ??
        null;
      if (mid) safe.matchId = String(mid);
    }
  } catch (e) {
    console.warn("[history.upsert] x01 enrichment error:", e);
  }

  // ---------------------------------------------------------
  // 📦 MATCH COMPACT V1
  // Résumé/statistiques complets mais compacts pour StatsHub.
  // On conserve l’ancien payload compressé pour compat/reprise,
  // mais les écrans stats peuvent lire safe.compact directement.
  // ---------------------------------------------------------
  try {
    const compact = encodeCompactMatch({ ...safe, payload: payloadEffective });
    if (compact) {
      (safe as any).compact = compact;
      (safe as any).compactBytes = estimateCompactBytes(compact);
      const prevSummary: any = safe.summary || {};
      safe.summary = {
        ...prevSummary,
        compact: true,
        compactBytes: (safe as any).compactBytes,
        playersCount: Array.isArray(compact.p) ? compact.p.length : 0,
      };
    }
  } catch (e) {
    console.warn("[history.upsert] compact encode failed:", e);
  }

  try {
    // ✅ IMPORTANT: ne jamais écraser un payload existant par "" si rec.payload est absent.
    // Cas réel: certains callers font History.upsert(matchId) avec seulement summary/status,
    // ce qui wipe config/darts et casse la reprise.
    let prevPayloadCompressed = "";
    let prevPayloadObj: any = null;

    // ✅ Merge "reprise" : certains callers font des upserts partiels (ex: payload sans darts / sans config)
    // et écrasent le payload complet. On conserve alors les champs critiques depuis l'ancien payload.
    const needsMerge =
      !!payloadEffective &&
      (safe.kind === "x01" ||
        (payloadEffective as any)?.variant === "x01_v3" ||
        (payloadEffective as any)?.game === "x01") &&
      (((payloadEffective as any)?.config ?? null) == null ||
        !Array.isArray((payloadEffective as any)?.darts));

    try {
      if (!payloadEffective || needsMerge) {
        prevPayloadCompressed = await withStore("readonly", async (st) => {
          return await new Promise<string>((resolve) => {
            const req = st.get(String(safe.id));
            req.onsuccess = () =>
              resolve((req.result && (req.result as any).payloadCompressed) || "");
            req.onerror = () => resolve("");
          });
        });
      }

      if (needsMerge && prevPayloadCompressed) {
        prevPayloadObj = decodePayloadCompressedBestEffort(
          prevPayloadCompressed,
          { id: String(safe.id), stage: "upsert:merge_prev" }
        );

        if (prevPayloadObj && typeof prevPayloadObj === "object") {
          const merged: any = {
            ...stripAvatarDataFromPayload(prevPayloadObj),
            ...(payloadEffective as any),
          };

          if (((payloadEffective as any)?.config ?? null) == null && (prevPayloadObj as any)?.config) {
            merged.config = (prevPayloadObj as any).config;
          }

          if (
            !Array.isArray((payloadEffective as any)?.darts) &&
            Array.isArray((prevPayloadObj as any)?.darts)
          ) {
            merged.darts = (prevPayloadObj as any).darts;
          }

          payloadEffective = stripAvatarDataFromPayload(merged);
        }
      }
    } catch {}

    // ✅ Résumé minimal pour la reprise (anti-corruption / anti-compress)
    // On stocke aussi une version "lite" non compressée pour garantir la reprise.
    try {
      const basePayload =
        payloadEffective ||
        (prevPayloadCompressed
          ? stripAvatarDataFromPayload(
              decodePayloadCompressedBestEffort(prevPayloadCompressed, {
                id: String(safe.id),
                stage: "upsert:resume_prev",
              })
            )
          : null);

      if (basePayload && typeof basePayload === "object") {
        const cfgLite = (basePayload as any).config ?? null;
        const stateLite = (basePayload as any).state ?? null;
        const dartsLite = Array.isArray((basePayload as any).darts)
          ? (basePayload as any).darts.slice(-90)
          : null;

        const resume: any = {};
        if (cfgLite) resume.config = cfgLite;
        if (stateLite) resume.state = stateLite;
        if (dartsLite) resume.darts = dartsLite;

        (safe as any).resume = Object.keys(resume).length ? resume : null;
      } else {
        (safe as any).resume = null;
      }
    } catch {
      (safe as any).resume = null;
    }

    let payloadCompressed = "";

    if (!payloadEffective && prevPayloadCompressed) {
      payloadCompressed = prevPayloadCompressed;
    } else {
      // V2 PROPRE : le compact sert aux stats rapides, mais ne remplace jamais
      // le payload complet nécessaire à la reprise / au détail de partie.
      // On conserve donc le détail sans avatars/base64 + une copie du compact.
      const payloadClean = stripAvatarDataFromPayload(payloadEffective);
      const payloadForDetail = payloadClean && typeof payloadClean === "object"
        ? { ...(payloadClean as any), compact: (safe as any).compact ?? (payloadClean as any).compact ?? null }
        : ((safe as any).compact ? { compact: (safe as any).compact } : payloadClean);
      const payloadStr = payloadForDetail ? JSON.stringify(payloadForDetail) : "";
      payloadCompressed = payloadStr ? LZString.compressToUTF16(payloadStr) : "";
    }

    await withStores([STORE_HEADERS, STORE_DETAILS], "readwrite", async (stores) => {
      const headers = stores[STORE_HEADERS];
      const details = stores[STORE_DETAILS];

      await new Promise<void>((resolve, reject) => {
        const doTrim = (rows: _TrimRow[]) => {
          const toDelete = _computeTrimIds(rows, [String(safe.id)]);
          let pending = toDelete.length;
          if (!pending) return resolve();

          toDelete.forEach((k) => {
            const delHeader = headers.delete(k);
            delHeader.onsuccess = () => {
              try { details.delete(k); } catch {}
              if (--pending === 0) resolve();
            };
            delHeader.onerror = () => {
              try { details.delete(k); } catch {}
              if (--pending === 0) resolve();
            };
          });
        };

        try {
          // @ts-ignore
          const hasIndex = headers.indexNames && headers.indexNames.contains("by_updatedAt");
          if (hasIndex) {
            const ix = headers.index("by_updatedAt");
            const req = ix.openCursor(undefined, "prev");
            const rows: _TrimRow[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                const v: any = cur.value || {};
                rows.push({
                  id: String(v?.id || cur.primaryKey || ""),
                  updatedAt: v?.updatedAt,
                  createdAt: v?.createdAt,
                  status: v?.status,
                  conflictOf: v?.conflictOf ?? null,
                });
                cur.continue();
              } else {
                rows.unshift({
                  id: String(safe.id),
                  updatedAt: safe.updatedAt,
                  createdAt: safe.createdAt,
                  status: safe.status,
                  conflictOf: (safe as any)?.conflictOf ?? null,
                });
                doTrim(rows);
              }
            };
            req.onerror = () => reject(req.error);
          } else {
            const req = headers.openCursor();
            const rows: _TrimRow[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                const v: any = cur.value || {};
                rows.push({
                  id: String(v?.id || cur.primaryKey || ""),
                  updatedAt: v?.updatedAt,
                  createdAt: v?.createdAt,
                  status: v?.status,
                  conflictOf: v?.conflictOf ?? null,
                });
                cur.continue();
              } else {
                rows.unshift({
                  id: String(safe.id),
                  updatedAt: safe.updatedAt,
                  createdAt: safe.createdAt,
                  status: safe.status,
                  conflictOf: (safe as any)?.conflictOf ?? null,
                });
                doTrim(rows);
              }
            };
            req.onerror = () => reject(req.error);
          }
        } catch {
          resolve();
        }
      });

      const headerReq = headers.put({
        ...toHeaderRecord(safe),
        players: stripAvatarDataFromPlayers(safe.players) || [],
      });
      await new Promise<void>((resolve, reject) => {
        headerReq.onsuccess = () => resolve();
        headerReq.onerror = () => reject(headerReq.error);
      });

      const detailReq = details.put(toDetailRecord(String(safe.id), payloadCompressed, safe));
      await new Promise<void>((resolve, reject) => {
        detailReq.onsuccess = () => resolve();
        detailReq.onerror = () => reject(detailReq.error);
      });
    });

    // ================================
    // 🔔 NOTIFY UI/STATS (history changed)
    // ================================
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dc-history-updated"));
      }
    } catch {}

    try {
      const st = String((safe as any)?.status || "").toLowerCase();
      if (st !== "in_progress") {
        void scheduleStatsIndexRefresh({
          includeNonFinished: true,
          persist: true,
          reason: `history-upsert:${st || "unknown"}`,
        });
      }
    } catch {}

    // ================================
    // ✅ PUSH SNAPSHOT TO CLOUD (debounced)
    // ================================
    scheduleCloudSnapshotPush("history:upsert");
    try { emitCloudChange("history:upsert"); } catch {}

    // ================================
    // ✅ EVENT BUFFER (multi-device sync)
    // - IMPORTANT: ne jamais re-push quand on importe depuis le cloud (anti-boucle)
    // ================================
    if (!isCloudImporting()) {
      try {
        const kind = String(rec.kind || safe.kind || "");
        const sport = kind.includes("petanque")
          ? "petanque"
          : kind.includes("baby")
          ? "babyfoot"
          : kind.includes("ping")
          ? "pingpong"
          : kind.includes("territ")
          ? "territories"
          : "darts";

        // On push un payload compact (pas la partie complète)
        EventBuffer.push({
          sport,
          mode: kind || sport,
          event_type: "MATCH_SAVED",
          payload: {
            id: safe.id,
            matchId: safe.matchId,
            kind: safe.kind,
            status: safe.status,
            winnerId: safe.winnerId,
            players: stripAvatarDataFromPlayers(safe.players) || [],
            createdAt: safe.createdAt,
            updatedAt: safe.updatedAt,
            summary: safe.summary ?? null,
          },
        }).catch(() => {});

        // tentative de sync opportuniste (non bloquante)
        EventBuffer.syncNow().catch(() => {});
      } catch {}
    }
  } catch (e) {
    console.warn("[history.upsert] fallback localStorage (IDB indispo?):", e);

    try {
      const rows: any[] = readLegacyRowsSafe();
      const idx = rows.findIndex((r) => (r.id || r.matchId) === safe.id);

      // ✅ IMPORTANT: même en fallback localStorage, on conserve un payload "lite"
      // pour permettre la reprise (config + darts).
      const cfgLite =
        (payloadEffective as any)?.config ??
        (payloadEffective as any)?.cfg ??
        null;

      const dartsLiteRaw =
        (payloadEffective as any)?.darts ??
        (payloadEffective as any)?.throws ??
        (payloadEffective as any)?.visits ??
        (payloadEffective as any)?.events ??
        null;

      const dartsLite = Array.isArray(dartsLiteRaw) ? dartsLiteRaw : null;

      const payloadLite =
        cfgLite || dartsLite
          ? { config: cfgLite, darts: dartsLite }
          : null;

      // ✅ IMPORTANT: si un upsert arrive sans payload, on conserve l'ancien payload (sinon reprise cassée)
      const payloadLiteFinal =
        payloadLite ??
        (idx >= 0 ? stripAvatarDataFromPayload((rows[idx] as any)?.payload ?? null) : null);

      const trimmed = {
        ...safe,
        players: stripAvatarDataFromPlayers(safe.players) || [],
        payload: stripAvatarDataFromPayload(payloadLiteFinal),
      };
      if (idx >= 0) rows.splice(idx, 1);
      rows.unshift(trimmed);
      while (rows.length > 120) rows.pop();
      localStorage.setItem(scopedHistoryLsKey(), JSON.stringify(rows));

      // ================================
      // 🔔 NOTIFY UI/STATS (history changed)
      // ================================
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dc-history-updated"));
        }
      } catch {}

      // ================================
      // ✅ PUSH SNAPSHOT TO CLOUD (debounced)
      // ================================
      scheduleCloudSnapshotPush("history:upsert:ls_fallback");
      try { emitCloudChange("history:upsert:ls_fallback"); } catch {}

      // ================================
      // ✅ EVENT BUFFER (multi-device sync)
      // - IMPORTANT: ne jamais re-push quand on importe depuis le cloud (anti-boucle)
      // ================================
      if (!isCloudImporting()) {
        try {
          const kind = String(rec.kind || safe.kind || "");
          const sport = kind.includes("petanque")
            ? "petanque"
            : kind.includes("baby")
            ? "babyfoot"
            : kind.includes("ping")
            ? "pingpong"
            : kind.includes("territ")
            ? "territories"
            : "darts";

          EventBuffer.push({
            sport,
            mode: kind || sport,
            event_type: "MATCH_SAVED",
            payload: {
              id: safe.id,
              matchId: safe.matchId,
              kind: safe.kind,
              status: safe.status,
              winnerId: safe.winnerId,
              players: stripAvatarDataFromPlayers(safe.players) || [],
              createdAt: safe.createdAt,
              updatedAt: safe.updatedAt,
              summary: safe.summary ?? null,
            },
          }).catch(() => {});
          EventBuffer.syncNow().catch(() => {});
        } catch {}
      }
    } catch {}
  }

  // Auto-backup (centralized) after persisting history
  triggerAutoBackupIfEnabled();
}

// ============================================
// ✅ CLOUD IMPORT (multi-device)
// - Upsert depuis le cloud avec anti-boucle
// - Détecte divergence et conserve une copie "conflict" si besoin
// ============================================

function _stableBaseId(rec: any): string {
  const id = String(rec?.id || "").trim();
  const matchId = String(rec?.matchId || "").trim();
  return matchId || id;
}

function _conflictId(baseId: string, suffix: string): string {
  const safe = baseId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const s = suffix.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  return `${safe}__conflict__${s}`;
}

function _payloadHashLite(payload: any): string {
  try {
    const s = JSON.stringify(payload ?? null);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  } catch {
    return "";
  }
}

export async function upsertFromCloud(
  rec: SavedMatch,
  meta?: { cloudEventId?: string; cloudCreatedAt?: string }
): Promise<CloudImportResult> {
  const baseId = _stableBaseId(rec);
  if (!baseId) {
    return { applied: "conflict_only", baseId: "", reason: "missing_base_id" };
  }

  return await withCloudImportGuard(async () => {
    const local = await get(baseId).catch(() => null);

    const localUpdated = Number((local as any)?.updatedAt || 0);
    const cloudUpdated = Number((rec as any)?.updatedAt || 0);

    const localHash = _payloadHashLite((local as any)?.payload);
    const cloudHash = _payloadHashLite((rec as any)?.payload);

    // Si local existe et est plus récent -> on garde local, mais on garde la version cloud en "conflict" si elle diffère
    if (local && localUpdated && cloudUpdated && localUpdated > cloudUpdated) {
      if (localHash !== cloudHash) {
        const cid = _conflictId(baseId, meta?.cloudEventId || rec.createdAt?.toString?.() || rec.updatedAt?.toString?.() || Date.now().toString());
        const conflict = {
          ...(rec as any),
          id: cid,
          matchId: baseId,
          conflictOf: baseId,
          conflictReason: "cloud_older_than_local",
          conflictCloudCreatedAt: meta?.cloudCreatedAt || "",
          conflictCreatedAt: Date.now(),
        } as SavedMatch;
        await upsert(conflict);
        return { applied: "local", baseId, conflictId: cid, reason: "cloud_older_than_local" };
      }
      return { applied: "local", baseId, reason: "local_newer_same_payload" };
    }

    // Si divergence sans info temporelle fiable: on conserve cloud en conflict (et on garde local)
    if (local && localHash && cloudHash && localHash !== cloudHash && !(cloudUpdated > localUpdated)) {
      const cid = _conflictId(baseId, meta?.cloudEventId || Date.now().toString());
      const conflict = {
        ...(rec as any),
        id: cid,
        matchId: baseId,
        conflictOf: baseId,
        conflictReason: "divergent_payload",
        conflictCloudCreatedAt: meta?.cloudCreatedAt || "",
        conflictCreatedAt: Date.now(),
      } as SavedMatch;
      await upsert(conflict);
      return { applied: "conflict_only", baseId, conflictId: cid, reason: "divergent_payload" };
    }

    // Sinon: la version cloud est acceptée (plus récente ou pas de conflit)
    const normalized = { ...(rec as any), id: baseId, matchId: baseId } as SavedMatch;
    await upsert(normalized);
    return { applied: "cloud", baseId };
  });
}

export async function listConflicts(): Promise<SavedMatch[]> {
  const rows = await list().catch(() => [] as SavedMatch[]);
  return rows.filter((r: any) => !!r?.conflictOf);
}

export async function clearConflicts(baseId?: string): Promise<void> {
  const conflicts = await listConflicts();
  const targets = baseId ? conflicts.filter((c: any) => c?.conflictOf === baseId) : conflicts;
  for (const c of targets) {
    // eslint-disable-next-line no-await-in-loop
    await remove(String(c.id)).catch(() => {});
  }
}

export async function remove(id: string): Promise<void> {
  await migrateFromLocalStorageOnce();

  const wanted = String(id || "").trim();
  if (!wanted) return;

  // FIX HISTORIQUE : certains enregistrements ont id != matchId/resumeId.
  // Une suppression par headers.delete(id) seule laisse donc la carte revenir, ou déclenche
  // des incohérences d'affichage après reload. On supprime toutes les variantes liées.
  const idsToDelete = new Set<string>([wanted]);

  try {
    await withStores([STORE_HEADERS, STORE_DETAILS], "readwrite", (stores) => {
      const headers = stores[STORE_HEADERS];
      const details = stores[STORE_DETAILS];

      const deleteOne = (store: IDBObjectStore, key: string) =>
        new Promise<void>((resolve) => {
          try {
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          } catch {
            resolve();
          }
        });

      return new Promise<void>((resolve, reject) => {
        const scan = headers.openCursor();
        scan.onsuccess = async () => {
          try {
            const cur = scan.result as IDBCursorWithValue | null;
            if (cur) {
              const v: any = cur.value || {};
              const candidates = [
                v?.id,
                v?.matchId,
                v?.resumeId,
                v?.payload?.matchId,
                v?.payload?.resumeId,
                v?.summary?.matchId,
                v?.summary?.resumeId,
                getCanonicalMatchId(v),
              ].filter(Boolean).map(String);
              if (candidates.includes(wanted)) {
                candidates.forEach((x) => idsToDelete.add(x));
                idsToDelete.add(String(cur.key));
              }
              cur.continue();
              return;
            }

            for (const key of Array.from(idsToDelete)) {
              // eslint-disable-next-line no-await-in-loop
              await deleteOne(headers, key);
              // eslint-disable-next-line no-await-in-loop
              await deleteOne(details, key);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        scan.onerror = () => reject(scan.error);
      });
    });

    try {
      idsToDelete.forEach((x) => _resumeIndexRemove(String(x)));
    } catch {}

    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dc-history-updated"));
      }
    } catch {}

    scheduleCloudSnapshotPush("history:remove");
    try { emitCloudChange("history:remove"); } catch {}
  } catch {
    try {
      const rows = readLegacyRowsSafe() as any[];
      const out = rows.filter((r) => {
        const candidates = [r?.id, r?.matchId, r?.resumeId, getCanonicalMatchId(r)].filter(Boolean).map(String);
        return !candidates.includes(wanted);
      });
      localStorage.setItem(scopedHistoryLsKey(), JSON.stringify(out));

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dc-history-updated"));
        }
      } catch {}

      scheduleCloudSnapshotPush("history:remove:ls_fallback");
      try { emitCloudChange("history:remove:ls_fallback"); } catch {}
      try { _resumeIndexRemove(wanted); } catch {}
    } catch {}
  }
}

export async function clear(): Promise<void> {
  await migrateFromLocalStorageOnce();

  try {
    await withStores([STORE_HEADERS, STORE_DETAILS], "readwrite", (stores) => {
      const headers = stores[STORE_HEADERS];
      const details = stores[STORE_DETAILS];
      return new Promise<void>((resolve, reject) => {
        const req1 = headers.clear();
        req1.onsuccess = () => {
          const req2 = details.clear();
          req2.onsuccess = () => resolve();
          req2.onerror = () => reject(req2.error);
        };
        req1.onerror = () => reject(req1.error);
      });
    });

    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dc-history-updated"));
      }
    } catch {}

    scheduleCloudSnapshotPush("history:clear");
    try { emitCloudChange("history:clear"); } catch {}
    try { _resumeIndexWrite([]); } catch {}
  } catch {
    try {
      localStorage.removeItem(scopedHistoryLsKey());

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dc-history-updated"));
        }
      } catch {}

      scheduleCloudSnapshotPush("history:clear:ls_fallback");
      try { emitCloudChange("history:clear:ls_fallback"); } catch {}
      try { _resumeIndexWrite([]); } catch {}
    } catch {}
  }
}

/* =========================
   Cache léger synchrone (pour UI legacy)
========================= */
type _LightRow = Omit<SavedMatch, "payload">;

let __cache: _LightRow[] = [];

function _saveCache() {
  // stage 1: on supprime la persistance locale du cache history
}

async function _hydrateCacheFromList() {
  try {
    const rows = await _readRowsLightFromIdb();
    __cache = rows
      .map((r: any) => {
        const { payload, ...lite } = r || {};
        return normalizeHistoryRow(lite as any);
      })
      .slice(0, MAX_CACHE_ROWS);
    _saveCache();
  } catch {
    try {
      const rows = await list();
      __cache = rows
        .map((r: any) => {
          const { payload, ...lite } = r || {};
          return normalizeHistoryRow(lite as any);
        })
        .slice(0, MAX_CACHE_ROWS);
      _saveCache();
    } catch {}
  }
}

function _applyUpsertToCache(rec: SavedMatch) {
  const cid = getCanonicalMatchId(rec) ?? (rec as any)?.matchId ?? rec.id;
  const { payload, ...lite0 } = (rec as any) || {};
  const lite = normalizeHistoryRow({ ...lite0, id: String(cid), matchId: String(cid) } as any) as _LightRow;
  __cache = [lite, ...__cache.filter((r) => r.id !== lite.id)];
  if (__cache.length > MAX_CACHE_ROWS) __cache.length = MAX_CACHE_ROWS;
  _saveCache();
}

function _applyRemoveToCache(id: string) {
  __cache = __cache.filter((r) => r.id !== id && (r as any).matchId !== id);
  _saveCache();
}

function _clearCache() {
  __cache = [];
  _saveCache();
}

function readAllSync(): _LightRow[] {
  return __cache.slice();
}

/* =========================
   Sélecteurs utilitaires (✅ exports nommés)
========================= */
export async function listByStatus(
  status: "in_progress" | "finished"
): Promise<SavedMatch[]> {
  const rows = await list();
  return rows
    .filter((r) => isHistoryRowUsable(r))
    .map((r: any) => normalizeHistoryRow(r))
    .filter((r: any) => String(r?.status || "") === status);
}

export async function listInProgress(): Promise<SavedMatch[]> {
  return listByStatus("in_progress");
}

export async function listFinished(): Promise<SavedMatch[]> {
  return listByStatus("finished");
}

export async function getX01(id: string): Promise<SavedMatch | null> {
  const r = await get(id);
  return r && r.kind === "x01" ? r : null;
}

/* =========================
   Export objet unique History
========================= */
export const History = {
  async list() {
    const rows = await list();
    __cache = rows
      .map((r: any) => {
        const { payload, ...lite } = r || {};
        return lite;
      })
      .slice(0, MAX_CACHE_ROWS);
    _saveCache();
    return rows;
  },
  get,
  async upsert(rec: SavedMatch) {
    await upsert(rec);
    // V4 FIX : si l'upsert a été ignoré car il tentait de downgrader
    // un match finished en in_progress, on recharge la ligne réelle avant de toucher le cache UI.
    try {
      const cid = getCanonicalMatchId(rec) ?? (rec as any)?.matchId ?? rec.id;
      const fresh = cid ? await get(String(cid)) : null;
      _applyUpsertToCache((fresh || rec) as any);
    } catch {
      _applyUpsertToCache(rec);
    }
  },
  // ✅ import cloud (anti-boucle + conflits)
  async upsertFromCloud(rec: SavedMatch, meta?: { cloudEventId?: string; cloudCreatedAt?: string }) {
    const res = await upsertFromCloud(rec, meta);
    // update cache only if base record changed
    if (res.applied === "cloud") {
      _applyUpsertToCache({ ...(rec as any), id: res.baseId, matchId: res.baseId } as any);
    } else if (res.conflictId) {
      _applyUpsertToCache({ ...(rec as any), id: res.conflictId, matchId: res.baseId, conflictOf: res.baseId } as any);
    }
    return res;
  },
  listConflicts,
  clearConflicts,
  async remove(id: string) {
    await remove(id);
    _applyRemoveToCache(id);
  },
  async clear() {
    await clear();
    _clearCache();
  },

  // sélecteurs utilitaires
  listByStatus,
  listInProgress,
  listFinished,
  getX01,

  // synchrone (legacy UI)
  readAll: readAllSync,
};

// Première hydration du cache (✅ non-bloquant : ne doit JAMAIS bloquer l'intro)
if (!__cache.length) {
  try {
    window.setTimeout(() => {
      _hydrateCacheFromList().catch(() => {});
    }, 0);
  } catch {}
}

// DEBUG TEMP — expose History to DevTools
try {
  if (typeof window !== "undefined") {
    (window as any).__DC_HISTORY__ = History;
  }
} catch {}
