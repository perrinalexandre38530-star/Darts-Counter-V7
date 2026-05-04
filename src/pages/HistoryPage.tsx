// @ts-nocheck
// ============================================
// src/pages/HistoryPage.tsx — Historique V2 Neon Deluxe
// - KPIs (sauvegardées / terminées / en cours)
// - Filtres J / S / M / A / ARV
// - Cartes stylées : mode, statut, format, scores
// - Décodage payload (base64 + gzip) pour récupérer config/summary
// ✅ FIX: “Voir stats” n’ouvre PLUS les pages X01 pour KILLER
//    -> KILLER : go("killer_summary", { rec })
// ✅ NEW: “Voir stats” ouvre une page dédiée pour SHANGHAI
//    -> SHANGHAI : go("shanghai_end", { rec })
// ✅ NEW: Reprendre/Voir en cours route aussi SHANGHAI vers "shanghai_play" / "shanghai"
// ✅ FIX CRICKET: “Voir stats” ouvre BIEN StatsHub (route = "statsHub") + fallback "cricket_stats"
// ✅ DEBUG: logs RAW + logs AFTER FILTER (pour comprendre "Aucune partie ici")
// ✅ FIX BUILD: aucune dépendance npm "lz-string" (fallback via window.LZString si présent)
// ============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useSport, type SportId } from "../contexts/SportContext";
import { History, type SavedMatch } from "../lib/history";

import { buildMatchSharePacket, isMatchSharePacketV1, shareOneMatch, type MatchSharePacketV1 } from "../lib/matchShare";
import { inboxAddLocal, inboxListLocal, inboxRemoveLocal, type InboxItemLocal } from "../lib/matchInboxLocal";
import { listInboxCloud, sendMatchToEmail, setInboxStatusCloud, type InboxRowCloud, ensureDirectoryEntry } from "../lib/matchInboxCloud";
import logoDarts from "../assets/games/logo-darts.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoBabyfoot from "../assets/games/logo-babyfoot.png";


/* ---------- Icônes ---------- */

const Icon = {
  Trophy: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"
      />
    </svg>
  ),
  Eye: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M12 5c5.5 0 9.5 4.5 10 7-0.5 2.5-4.5 7-10 7S2.5 14.5 2 12c.5-2.5 4.5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
      />
    </svg>
  ),
  Play: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  ),
  Trash: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2Zm-3 6h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
      />
    </svg>
  ),

  Share: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M18 16a3 3 0 0 0-2.4 1.2L8.9 13.7a3.2 3.2 0 0 0 0-3.4l6.6-3.5A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.5 9.2A3 3 0 1 0 9 15l6.1 3.2A3 3 0 1 0 18 16Z"
      />
    </svg>
  ),
  Send: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M2 21 23 12 2 3v7l15 2-15 2v7Z" />
    </svg>
  ),
  Upload: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M5 20h14v-2H5v2Zm7-18 5 5h-3v6h-4V7H7l5-5Z" />
    </svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h8V3l-3.3 3.3Z" />
    </svg>
  ),
  Filter: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
    </svg>
  ),
  Broom: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M15.4 2.6a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8l-6.5 6.5-3-3 6.5-6.5ZM7.9 10.1l4 4-1.3 1.3c-.5.5-1.2.8-1.9.8H7.6L6.4 20H4.1l1.6-5.2c.2-.8.7-1.5 1.3-2.1l.9-.9ZM12.8 15.2l1.8-1.8 1.4 1.4-1.8 1.8 2.7 2.7-1.4 1.4-2.7-2.7-2.6 2.6-1.4-1.4 2.6-2.6-1.4-1.4 1.4-1.4 1.4 1.4Z" />
    </svg>
  ),
  Gamepad: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M7 8h10a5 5 0 0 1 4.8 3.6l.8 2.8a3.3 3.3 0 0 1-5.4 3.3L15 15H9l-2.2 2.7a3.3 3.3 0 0 1-5.4-3.3l.8-2.8A5 5 0 0 1 7 8Zm-1 3v2H4v2h2v2h2v-2h2v-2H8v-2H6Zm10.5 1.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm3 3a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" />
    </svg>
  ),
  User: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  ),
  Inbox: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-2 8h-3l-2 2h-2l-2-2H5V5h14v6Z" />
    </svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6 9 16.2Z" />
    </svg>
  ),
  X: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z" />
    </svg>
  ),
};

/* ---------- Types ---------- */

export type SavedEntry = SavedMatch & {
  resumeId?: string;
  game?: { mode?: string; startScore?: number };
  summary?: any;
  winnerName?: string | null;
  decoded?: any; // payload décodé
};

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function isUsableSavedEntry(v: any): boolean {
  try {
    const id = String(v?.id ?? v?.matchId ?? v?.resumeId ?? "").trim();
    if (!id) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeSavedEntry(v: any): SavedEntry {
  const out: any = { ...(v || {}) };
  const id = String(out?.id ?? out?.matchId ?? out?.resumeId ?? "").trim();
  if (id) {
    out.id = id;
    if (!out.matchId) out.matchId = id;
  }
  out.players = safeArray(out.players);
  out.summary = out.summary && typeof out.summary === "object" ? out.summary : {};
  out.game = out.game && typeof out.game === "object" ? out.game : {};
  return out as SavedEntry;
}

/* ---------- Helpers players / avatars ---------- */

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
}
function getName(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.name || v.displayName || v.username || "");
}
function getAvatarUrl(store: Store, v: any): string | null {
  if (v && typeof v === "object" && v.avatarDataUrl) return String(v.avatarDataUrl);
  const id = getId(v);
  const anyStore: any = store as any;
  const list: any[] = Array.isArray(anyStore?.profiles)
    ? anyStore.profiles
    : Array.isArray(anyStore?.profiles?.list)
    ? anyStore.profiles.list
    : [];
  const hit = list.find((p) => getId(p) === id);
  return hit?.avatarDataUrl ?? null;
}

/* ---------- Mode / status ---------- */

function baseMode(e: SavedEntry) {
  const k = (e.kind || "").toLowerCase();
  const m = (e.game?.mode || "").toLowerCase();
  if (k === "leg") return m || "x01";
  return k || m || "x01";
}

function isKillerEntry(e: SavedEntry) {
  const m = baseMode(e);
  const s1 = String((e as any)?.summary?.mode || "");
  const s2 = String((e as any)?.payload?.mode || "");
  return m.includes("killer") || s1.toLowerCase().includes("killer") || s2.toLowerCase().includes("killer");
}

function isShanghaiEntry(e: SavedEntry) {
  const m = baseMode(e);
  const s1 = String((e as any)?.summary?.mode || "");
  const s2 = String((e as any)?.payload?.mode || "");
  const s3 = String((e as any)?.decoded?.config?.mode || "");
  return (
    m.includes("shanghai") ||
    s1.toLowerCase().includes("shanghai") ||
    s2.toLowerCase().includes("shanghai") ||
    s3.toLowerCase().includes("shanghai")
  );
}

function isBatardEntry(e: SavedEntry) {
  const m = baseMode(e);
  const s1 = String((e as any)?.summary?.mode || "");
  const s2 = String((e as any)?.payload?.mode || "");
  const s3 = String((e as any)?.decoded?.config?.mode || "");
  const k = String((e as any)?.kind || (e as any)?.payload?.kind || "");
  return (
    m.includes("batard") ||
    m.includes("bastard") ||
    k.toLowerCase().includes("batard") ||
    s1.toLowerCase().includes("batard") ||
    s2.toLowerCase().includes("batard") ||
    s3.toLowerCase().includes("batard")
  );
}


type GameFilterKey = "all" | string;
type PlayerFilterKey = "all" | string;

const SPORT_GAME_FILTERS: Record<string, { key: string; label: string; aliases: string[] }[]> = {
  darts: [
    { key: "x01", label: "X01", aliases: ["x01", "leg", "301", "501", "701", "901"] },
    { key: "cricket", label: "Cricket", aliases: ["cricket"] },
    { key: "killer", label: "Killer", aliases: ["killer"] },
    { key: "shanghai", label: "Shanghai", aliases: ["shanghai"] },
    { key: "golf", label: "Golf", aliases: ["golf"] },
    { key: "batard", label: "Bâtard", aliases: ["batard", "bastard"] },
    { key: "clock", label: "Horloge", aliases: ["clock", "tourdelhorloge", "tour_de_lhorloge", "tdh"] },
    { key: "training", label: "Training", aliases: ["training", "entrainement", "practice"] },
    { key: "countup", label: "Count Up", aliases: ["countup", "count_up"] },
  ],
  petanque: [
    { key: "petanque", label: "Pétanque", aliases: ["petanque", "petanque_classic", "classic"] },
    { key: "simple", label: "Simple", aliases: ["simple", "solo"] },
    { key: "doublette", label: "Doublette", aliases: ["doublette", "2v2"] },
    { key: "triplette", label: "Triplette", aliases: ["triplette", "3v3"] },
  ],
  pingpong: [
    { key: "pingpong", label: "Ping-pong", aliases: ["pingpong", "ping_pong", "tabletennis", "table_tennis"] },
    { key: "match", label: "Match", aliases: ["match", "classic"] },
    { key: "sets", label: "Sets", aliases: ["sets", "set"] },
  ],
  babyfoot: [
    { key: "babyfoot", label: "Babyfoot", aliases: ["babyfoot", "foosball"] },
    { key: "match", label: "Match", aliases: ["match", "classic"] },
    { key: "sets", label: "Sets", aliases: ["sets", "set"] },
  ],
  molkky: [
    { key: "molkky", label: "Mölkky", aliases: ["molkky", "molky", "mölkky"] },
  ],
  dicegame: [
    { key: "dicegame", label: "Dice Game", aliases: ["dicegame", "dice", "dice_game"] },
  ],
};

function normalizeToken(v: any): string {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function collectEntryModeTokens(e: SavedEntry): string[] {
  const anyE: any = e as any;
  const values = [
    anyE.kind,
    anyE.mode,
    anyE.variant,
    anyE.sport,
    anyE.game?.mode,
    anyE.game?.kind,
    anyE.game?.variant,
    anyE.summary?.mode,
    anyE.summary?.kind,
    anyE.summary?.game?.mode,
    anyE.summary?.game?.kind,
    anyE.summary?.config?.mode,
    anyE.payload?.mode,
    anyE.payload?.kind,
    anyE.payload?.sport,
    anyE.payload?.config?.mode,
    anyE.payload?.config?.kind,
    anyE.payload?.game?.mode,
    anyE.decoded?.mode,
    anyE.decoded?.kind,
    anyE.decoded?.sport,
    anyE.decoded?.config?.mode,
    anyE.decoded?.config?.kind,
    anyE.decoded?.game?.mode,
    anyE.decoded?.game?.kind,
    baseMode(e),
  ];
  const out = values.map(normalizeToken).filter(Boolean);
  return [...new Set(out)];
}

function inferGameFilterKey(e: SavedEntry, sport: SportId): string {
  if (sport === "darts") {
    if (isKillerEntry(e)) return "killer";
    if (isShanghaiEntry(e)) return "shanghai";
    if (isBatardEntry(e)) return "batard";
  }
  const filters = SPORT_GAME_FILTERS[sport] || [];
  const tokens = collectEntryModeTokens(e);
  for (const f of filters) {
    const aliases = [f.key, f.label, ...(f.aliases || [])].map(normalizeToken).filter(Boolean);
    if (aliases.some((a) => tokens.some((t) => t === a || t.includes(a) || a.includes(t)))) return f.key;
  }
  return tokens[0] || "unknown";
}

function inferSportKey(e: SavedEntry): string {
  const tokens = collectEntryModeTokens(e);
  const joined = tokens.join("|");
  if (/petanque|boule/.test(joined)) return "petanque";
  if (/pingpong|ping_pong|tabletennis|table_tennis/.test(joined)) return "pingpong";
  if (/babyfoot|foosball/.test(joined)) return "babyfoot";
  if (/molkky|molky/.test(joined)) return "molkky";
  if (/dicegame|dice_game|dice/.test(joined)) return "dicegame";
  if (/x01|leg|cricket|killer|shanghai|golf|batard|bastard|clock|countup|training|darts/.test(joined)) return "darts";
  return "darts";
}

function getAllEntryPlayers(e: SavedEntry): any[] {
  const anyE: any = e as any;
  const pools = [
    anyE.players,
    anyE.summary?.players,
    anyE.summary?.rankings,
    anyE.summary?.result?.players,
    anyE.summary?.result?.rankings,
    anyE.payload?.players,
    anyE.payload?.config?.players,
    anyE.payload?.state?.players,
    anyE.decoded?.players,
    anyE.decoded?.config?.players,
    anyE.decoded?.state?.players,
  ];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const p of pool) {
      const id = getId(p) || getName(p);
      const key = String(id || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function entryHasPlayer(e: SavedEntry, playerId: string): boolean {
  if (!playerId || playerId === "all") return true;
  const wanted = String(playerId);
  return getAllEntryPlayers(e).some((p) => String(getId(p) || getName(p)) === wanted);
}

function getKnownPlayers(store: Store, entries: SavedEntry[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  const anyStore: any = store as any;
  const storeLists = [
    Array.isArray(anyStore?.profiles) ? anyStore.profiles : null,
    Array.isArray(anyStore?.profiles?.list) ? anyStore.profiles.list : null,
    Array.isArray(anyStore?.players) ? anyStore.players : null,
    Array.isArray(anyStore?.localProfiles) ? anyStore.localProfiles : null,
    Array.isArray(anyStore?.bots) ? anyStore.bots : null,
  ].filter(Array.isArray) as any[][];

  for (const list of storeLists) {
    for (const p of list) {
      const id = String(getId(p) || getName(p) || "").trim();
      if (!id) continue;
      const label = getName(p) || String((p as any)?.surname || (p as any)?.nickname || (p as any)?.displayName || id);
      if (!seen.has(id)) seen.set(id, label);
    }
  }

  for (const e of entries) {
    for (const p of getAllEntryPlayers(e)) {
      const id = String(getId(p) || getName(p) || "").trim();
      if (!id) continue;
      const label = getName(p) || String((p as any)?.surname || (p as any)?.nickname || (p as any)?.displayName || id);
      if (!seen.has(id)) seen.set(id, label);
    }
  }

  return [...seen.entries()]
    .map(([id, label]) => ({ id, label: label || id }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));
}

function statusOf(e: SavedEntry): "finished" | "in_progress" {
  // 1️⃣ Status explicite
  const raw = String(e.status || "").toLowerCase();
  if (raw === "finished") return "finished";

  // 2️⃣ Summary direct
  const s: any = e.summary || {};
  if (s.finished === true) return "finished";
  if (s.result?.finished === true) return "finished";

  // 3️⃣ Indices forts de fin
  if (s.winnerId) return "finished";
  if (Array.isArray(s.rankings) && s.rankings.length > 0) return "finished";
  if (Array.isArray(s.players) && s.players.length > 0 && s.result) return "finished";

  // 4️⃣ Payload décodé
  const d: any = e.decoded || {};
  if (d.summary || d.result || d.stats) return "finished";

  // 5️⃣ Fallback legacy
  if (raw === "inprogress" || raw === "in_progress") return "in_progress";

  return "in_progress";
}

function modeLabel(e: SavedEntry) {
  const m = baseMode(e);
  if (m === "x01") {
    const sc = getStartScore(e);
    return `X01 · ${sc}`;
  }
  return m.toUpperCase();
}

/* ---------- Match link ---------- */

function matchLink(e: SavedEntry): string | undefined {
  return (
    e.resumeId ||
    (e.summary as any)?.resumeId ||
    (e.summary as any)?.matchId ||
    (e.payload as any)?.resumeId ||
    (e.payload as any)?.matchId
  );
}

/* ---------- Décodage payload (base64 + gzip) + fallback LZString (sans import npm) ---------- */

async function decodePayload(raw: any): Promise<any | null> {
  if (!raw || typeof raw !== "string") return null;

  // helper parse safe
  const tryParse = (s: any) => {
    if (typeof s !== "string") return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // 0) Si déjà JSON string clair
  const direct = tryParse(raw);
  if (direct) return direct;

  // 1) Tentative base64 -> (gzip stream) -> json
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      const ds = new DS("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      const resp = new Response(stream);
      return await resp.json();
    }

    // fallback sans gzip: parfois c'est juste du JSON base64
    const parsed = tryParse(bin);
    if (parsed) return parsed;
  } catch {
    // ignore
  }

  // 2) ✅ FIX BUILD: PAS D'IMPORT npm => fallback global window.LZString
  try {
    const LZ: any = (window as any).LZString;
    if (LZ) {
      const s1 = typeof LZ.decompressFromUTF16 === "function" ? LZ.decompressFromUTF16(raw) : null;
      const p1 = tryParse(s1);
      if (p1) return p1;

      const s2 = typeof LZ.decompressFromBase64 === "function" ? LZ.decompressFromBase64(raw) : null;
      const p2 = tryParse(s2);
      if (p2) return p2;

      const s3 = typeof LZ.decompress === "function" ? LZ.decompress(raw) : null;
      const p3 = tryParse(s3);
      if (p3) return p3;
    }
  } catch {
    // ignore
  }

  return null;
}

/* ---------- Dédup + range ---------- */

function better(a: SavedEntry, b: SavedEntry): SavedEntry {
  const ta = a.updatedAt || a.createdAt || 0;
  const tb = b.updatedAt || b.createdAt || 0;
  if (ta !== tb) return ta > tb ? a : b;
  const sa = statusOf(a),
    sb = statusOf(b);
  if (sa !== sb) return sa === "finished" ? a : b;
  return a;
}

function sameBucket(a: SavedEntry, b: SavedEntry): boolean {
  if (baseMode(a) !== baseMode(b)) return false;
  const ta = a.updatedAt || a.createdAt || 0;
  const tb = b.updatedAt || b.createdAt || 0;
  if (Math.abs(ta - tb) > 20 * 60 * 1000) return false;
  const A = new Set((a.players || []).map(getId).filter(Boolean));
  const B = new Set((b.players || []).map(getId).filter(Boolean));
  if (!A.size || !B.size) return true;
  for (const id of A) if (B.has(id)) return true;
  return false;
}

function dedupe(list: SavedEntry[]): SavedEntry[] {
  const byLink = new Map<string, SavedEntry>();
  const rest: SavedEntry[] = [];
  for (const e of list) {
    const link = matchLink(e);
    if (link) byLink.set(link, byLink.has(link) ? better(byLink.get(link)!, e) : e);
    else rest.push(e);
  }
  const base = [...byLink.values(), ...rest];
  const buckets: { rep: SavedEntry }[] = [];
  for (const e of base.sort((a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0))) {
    let ok = false;
    for (const bkt of buckets) {
      if (sameBucket(bkt.rep, e)) {
        bkt.rep = better(bkt.rep, e);
        ok = true;
        break;
      }
    }
    if (!ok) buckets.push({ rep: e });
  }
  return buckets
    .map((b) => b.rep)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

/* ---------- Range filters ---------- */

type RangeKey = "today" | "week" | "month" | "year" | "archives";

function startOf(period: RangeKey) {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "week") {
    const d = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - d);
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "year") return new Date(now.getFullYear(), 0, 1).getTime();
  return 0;
}

function inRange(ts: number, key: RangeKey): boolean {
  const t = ts || Date.now();
  if (key === "archives") return t < startOf("year");
  return t >= startOf(key);
}

/* ---------- Mode colors ---------- */

const modeColor: Record<string, string> = {
  x01: "#e4c06b",
  cricket: "#4da84d",
  clock: "#ff40b4",
  training: "#71c9ff",
  killer: "#ff6a3c",
  shanghai: "#ffb000",
  golf: "#f6c256",
  batard: "#9b5cff",
  default: "#888",
};

function getModeColor(e: SavedEntry) {
  const m = baseMode(e);
  return modeColor[m] || modeColor.default;
}

/* ---------- Format (Solo / 2v2 ...) ---------- */

function detectFormat(e: SavedEntry): string {
  const cfg: any =
    e.game || (e.summary && e.summary.game) || (e.decoded && (e.decoded.config || e.decoded.game));
  if (!cfg) return "Solo";

  const teams = cfg.teams;
  if (!teams || teams.length <= 1) return "Solo";

  const sizes = teams.map((t: any) => t.players?.length || 1);
  if (sizes.every((s) => s === sizes[0])) return sizes[0] + "v" + sizes[0];
  return sizes.join("v");
}

/* ---------- Score / classement ---------- */

function cleanName(raw: any): string | undefined {
  if (typeof raw !== "string") return undefined;
  const name = raw.trim();
  if (!name) return undefined;
  if (name.length > 24 && name.includes("-")) return undefined;
  return name;
}
function cleanScore(raw: any): string | undefined {
  if (typeof raw === "number") return String(raw);
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  return s;
}

function summarizeScore(e: SavedEntry): string {
  const data: any = e.summary || {};
  const result = data.result || {};

  const rankings = data.rankings || result.rankings || result.players || data.players || result.standings;

  if (Array.isArray(rankings)) {
    const parts = rankings
      .map((r: any) => {
        const name = cleanName(r.name || r.playerName || r.label || r.id || r.playerId) || undefined;
        const score =
          cleanScore(r.score ?? r.legsWon ?? r.legs ?? r.setsWon ?? r.sets ?? r.points ?? r.total) ||
          (typeof r.avg3 === "number" ? r.avg3.toFixed(1) : undefined);

        if (!name && !score) return null;
        if (name && score) return `${name}: ${score}`;
        return name || score || null;
      })
      .filter(Boolean) as string[];

    if (parts.length) return parts.join(" • ");
  }

  const detailed = data.detailedByPlayer || data.byPlayer;
  if (detailed && typeof detailed === "object") {
    const parts = Object.entries(detailed)
      .map(([rawName, val]: [string, any]) => {
        const name = cleanName(rawName);
        const legs = cleanScore(val.legsWon ?? val.legs);
        const avg = typeof val.avg3 === "number" ? val.avg3.toFixed(1) : undefined;

        if (!name && !legs && !avg) return null;

        const sub = [];
        if (legs) sub.push(`${legs}L`);
        if (avg) sub.push(avg);

        if (name && sub.length) return `${name}: ${sub.join(" • ")}`;
        if (name) return name;
        if (sub.length) return sub.join(" • ");
        return null;
      })
      .filter(Boolean) as string[];

    if (parts.length) return parts.join(" • ");
  }

  return "";
}

/* ---------- StartScore basé sur game / summary / decoded ---------- */

function getStartScore(e: SavedEntry): number {
  const anyE: any = e;

  const direct =
    e.game?.startScore ??
    anyE.summary?.game?.startScore ??
    anyE.decoded?.config?.startScore ??
    anyE.decoded?.game?.startScore ??
    anyE.decoded?.x01?.config?.startScore ??
    anyE.decoded?.x01?.startScore ??
    anyE.decoded?.x01?.start ??
    anyE.decoded?.x01?.start;

  if (typeof direct === "number" && [301, 501, 701, 901].includes(direct)) return direct;
  return 501;
}

/* ---------- History API avec décodage payload ---------- */

const HistoryAPI = {
  async list(store: Store): Promise<SavedEntry[]> {
    try {
      const rows = safeArray<SavedEntry>(await History.list()).filter(isUsableSavedEntry).map((r) => normalizeSavedEntry(r));

      const enhanced = await Promise.all(
        rows.map(async (row) => {
          try {
          const r: any = row;
          if (!r.summary) r.summary = {};
          if (!r.game) r.game = {};

          if (typeof r.payload === "string") {
            const decoded = await decodePayload(r.payload);
            if (decoded && typeof decoded === "object") {
              r.decoded = decoded;

              const cfg = decoded.config || decoded.game || decoded.x01?.config || decoded.x01;

              if (cfg) {
                const sc = cfg.startScore ?? cfg.start ?? cfg.x01Start ?? cfg.x01StartScore;
                if (typeof sc === "number") r.game.startScore = sc;

                const mode = cfg.mode || cfg.gameMode || "x01";
                if (!r.game.mode) r.game.mode = mode;
              }

              const sum = decoded.summary || decoded.result || decoded.stats || {};
              r.summary = { ...sum, ...r.summary };
            }
          }

          // winnerName : tentative soft depuis summary
          if (!r.winnerName) {
            const wid = r.summary?.winnerId || r.summary?.result?.winnerId || r.summary?.winner?.id;
            if (wid) {
              const hit = (r.players || []).find((p: any) => getId(p) === String(wid));
              const nm = hit ? getName(hit) : null;
              if (nm) r.winnerName = nm;
            }
          }

          return normalizeSavedEntry(r as SavedEntry);
          } catch {
            return normalizeSavedEntry(row as SavedEntry);
          }
        })
      );

      return safeArray<SavedEntry>(enhanced).filter(isUsableSavedEntry).map((r) => normalizeSavedEntry(r));
    } catch {
      const anyStore = store as any;
      return safeArray<SavedEntry>(anyStore.history).filter(isUsableSavedEntry).map((r) => normalizeSavedEntry(r));
    }
  },
  async remove(id: string) {
    try {
      await History.remove(id);
    } catch {}
  },
  async clear() {
    try {
      await History.clear();
    } catch {}
  },
};

/* ---------- Styles ---------- */

function makeStyles(theme: any) {
  const edge = theme.borderSoft ?? "rgba(255,255,255,0.12)";
  const text70 = theme.textSoft ?? "rgba(255,255,255,0.7)";

  return {
    page: {
      minHeight: "100dvh",
      background: theme.bg,
      color: theme.text,
      paddingBottom: 96,
    },

    title: {
      marginTop: 20,
      textAlign: "center",
      fontSize: 28,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 3,
      color: theme.primary,
      textShadow: `
        0 0 8px ${theme.primary},
        0 0 18px ${theme.primary},
        0 0 28px ${theme.primary}AA
      `,
    },

    kpiRow: {
      marginTop: 20,
      display: "flex",
      flexWrap: "nowrap",
      gap: "calc(10px * var(--u, 1))",
      padding: "0 calc(10px * var(--u, 1))",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
    },

    kpiCard: (active: boolean, borderColor: string) => ({
      flex: 1,
      padding: "calc(10px * var(--u, 1)) calc(6px * var(--u, 1))",
      borderRadius: "calc(14px * var(--u, 1))",
      cursor: "pointer",
      textAlign: "center",
      background: "linear-gradient(180deg,#15171B,#0F0F11)",
      border: `1px solid ${active ? borderColor : "rgba(255,255,255,0.15)"}`,
      boxShadow: active ? `0 0 14px ${borderColor}` : "none",
    }),

    kpiLabel: {
      fontSize: "calc(11px * var(--u, 1))",
      opacity: 0.72,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    },
    kpiValue: {
      marginTop: "calc(4px * var(--u, 1))",
      fontSize: "calc(20px * var(--u, 1))",
      fontWeight: 900,
      lineHeight: 1,
    },

    toolbar: {
      marginTop: 12,
      display: "flex",
      gap: 10,
      justifyContent: "center",
      alignItems: "center",
      padding: "0 12px",
      flexWrap: "nowrap",
    },
    toolIconBtn: (danger = false, active = false) => ({
      width: 42,
      height: 42,
      borderRadius: 14,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      border: `1px solid ${danger ? theme.danger : theme.primary}`,
      background: active ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.45)",
      color: danger ? theme.danger : theme.primary,
      boxShadow: `0 0 12px ${danger ? theme.danger : theme.primary}88`,
      opacity: active ? 0.58 : 1,
      userSelect: "none",
    }),

    filtersRow: {
      marginTop: 16,
      display: "flex",
      gap: 8,
      justifyContent: "center",
      padding: "0 12px",
      flexWrap: "wrap",
    },
    filterBtn: (active: boolean) => ({
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 10,
      border: `1px solid ${active ? theme.primary : edge}`,
      background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
      color: active ? theme.primary : theme.text,
      boxShadow: active ? `0 0 10px ${theme.primary}88` : "none",
      cursor: "pointer",
    }),
    filterPopoverWrap: {
      position: "relative",
      display: "inline-flex",
    },
    filterPanel: {
      // IMPORTANT mobile/StackBlitz/Firefox : le popover est en fixed + centré.
      // Il ne dépend plus du bouton parent, donc il ne peut plus partir hors écran à gauche/droite.
      position: "fixed",
      top: "clamp(238px, 29vh, 360px)",
      left: "50%",
      right: "auto",
      transform: "translateX(-50%)",
      zIndex: 9999,
      width: "min(292px, calc(100vw - 24px))",
      maxWidth: "calc(100vw - 24px)",
      boxSizing: "border-box",
      padding: 10,
      borderRadius: 18,
      border: `1px solid ${edge}`,
      background: "linear-gradient(180deg, rgba(16,18,26,0.985), rgba(3,5,12,0.985))",
      boxShadow: `0 18px 40px rgba(0,0,0,.78), 0 0 18px ${theme.primary}44`,
      display: "grid",
      gap: 10,
      backdropFilter: "blur(10px)",
      overflow: "hidden",
    },
    filterTabs: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      width: "100%",
    },
    filterTabBtn: (active: boolean) => ({
      minHeight: 44,
      borderRadius: 14,
      border: `1px solid ${active ? theme.primary : edge}`,
      background: active ? `${theme.primary}22` : "rgba(255,255,255,0.055)",
      color: active ? theme.primary : theme.text,
      boxShadow: active ? `0 0 12px ${theme.primary}66` : "none",
      display: "inline-grid",
      placeItems: "center",
      fontSize: 0,
      cursor: "pointer",
    }),
    filterDropdown: {
      width: "100%",
      maxHeight: "min(230px, calc(100vh - 330px))",
      overflowY: "auto",
      display: "grid",
      gap: 7,
      padding: "2px 2px 4px",
      WebkitOverflowScrolling: "touch",
      boxSizing: "border-box",
    },
    filterChip: (active: boolean, tone?: string) => {
      const c = tone || theme.primary;
      return {
        flex: "0 0 auto",
        minHeight: 34,
        padding: "7px 11px",
        borderRadius: 999,
        border: `1px solid ${active ? c : edge}`,
        background: active ? `${c}22` : "rgba(255,255,255,0.055)",
        color: active ? c : theme.text,
        boxShadow: active ? `0 0 10px ${c}66` : "none",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        userSelect: "none",
      };
    },
    chipCount: {
      opacity: 0.72,
      fontSize: 10,
      fontWeight: 950,
    },

    list: {
      marginTop: 20,
      padding: "0 12px",
      display: "grid",
      gap: 14,
    },

    card: {
      background: theme.card,
      borderRadius: 18,
      padding: 14,
      position: "relative",
      overflow: "hidden",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      border: `1px solid ${edge}`,
      boxShadow: "0 12px 28px rgba(0,0,0,.4)",
    },
    watermarkLogo: {
      position: "absolute",
      left: -74,
      top: 6,
      width: 220,
      height: 220,
      objectFit: "contain",
      opacity: 0.13,
      filter: "grayscale(1) contrast(1.08) brightness(1.15)",
      transform: "rotate(-8deg)",
      pointerEvents: "none",
    },


    rowBetween: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },

    avatars: { display: "flex" },
    avWrap: {
      width: 42,
      height: 42,
      borderRadius: "50%",
      overflow: "hidden",
      background: "rgba(255,255,255,.08)",
      border: "2px solid rgba(0,0,0,.4)",
      marginLeft: -8,
    },
    avImg: { width: "100%", height: "100%", objectFit: "cover" },
    avFallback: {
      width: "100%",
      height: "100%",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      color: text70,
    },

    pillRow: {
      marginTop: 12,
      display: "flex",
      gap: 8,
    },
    pill: {
      flex: 1,
      padding: "8px 8px",
      textAlign: "center",
      borderRadius: 999,
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 12,
      border: `1px solid ${edge}`,
      background: "rgba(255,255,255,.06)",
    },
    pillGold: {
      color: theme.primary,
      border: `1px solid ${theme.primary}`,
      background: "rgba(0,0,0,.4)",
    },
    pillDanger: {
      color: "#ffbcbc",
      border: `1px solid ${theme.danger}`,
      background: "rgba(255,0,0,.15)",
    },

    // Actions V3 (plus épuré que 4 gros boutons)
    actionRow: {
      marginTop: 12,
      display: "flex",
      gap: 8,
      alignItems: "center",
      width: "100%",
      maxWidth: "100%",
      flexWrap: "nowrap",
    },
    primaryAction: {
      flex: "0 0 auto",
      padding: "8px 8px",
      minWidth: 44,
      maxWidth: 92,
      borderRadius: 12,
      fontWeight: 950,
      fontSize: 11,
      cursor: "pointer",
      border: `1px solid ${theme.primary}`,
      background: "rgba(0,0,0,.45)",
      color: theme.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: `0 0 14px ${theme.primary}55`,
      userSelect: "none",
    },
    iconRow: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginLeft: "auto",
      flexWrap: "nowrap",
      justifyContent: "flex-end",
      maxWidth: "100%",
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      border: `1px solid ${edge}`,
      background: "rgba(255,255,255,.06)",
      userSelect: "none",
    },
    iconDanger: {
      border: `1px solid ${theme.danger}`,
      background: "rgba(255,0,0,.12)",
      color: theme.danger,
      boxShadow: `0 0 10px ${theme.danger}44`,
    },
  };
}



function ScaledKpiRow({
  children,
  baseStyle,
}: {
  children: React.ReactNode;
  baseStyle: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [u, setU] = React.useState(1);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 360;
      setU(clamp(w / 360, 0.78, 1.05));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ ...(baseStyle || {}), ["--u" as any]: u }}>
      {children}
    </div>
  );
}


function ScaledCard({
  children,
  baseStyle,
}: {
  children: any;
  baseStyle: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [u, setU] = React.useState(1);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 360;
      // u proportionnel à la carte (base = 360px)
      const next = clamp(w / 360, 0.75, 1.05);
      setU(next);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        ...baseStyle,
        ["--u" as any]: u,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/* ---------- Component ---------- */

export default function HistoryPage({
  store,
  go,
}: {
  store: Store;
  go: (to: string, params?: any) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const { sport } = useSport();
  const S = useMemo(() => makeStyles(theme), [theme]);

  const [tab, setTab] = useState<"all" | "done" | "running" | "inbox">("done");
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 360 : false));
  useEffect(() => {
    const onR = () => setIsNarrow(window.innerWidth < 360);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const [sub, setSub] = useState<RangeKey>("today");
  const [gameFilter, setGameFilter] = useState<GameFilterKey>("all");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilterKey>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"games" | "players">("games");
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // FIX HISTORIQUE/FIREFOX:
  // - le store passé par StatsHub peut changer de référence très souvent ; on ne le met pas
  //   dans les dépendances de chargement sinon l'historique recharge en boucle.
  // - un seul chargement actif à la fois, avec token anti-race.
  const storeRef = useRef<Store>(store);
  const loadingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [inboxLocal, setInboxLocal] = useState<InboxItemLocal[]>([]);
  const [inboxCloud, setInboxCloud] = useState<InboxRowCloud[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // ============================================================
  // 🔎 DEBUG HISTORYPAGE — voir RAW vs filtré (pour "Aucune partie ici")
  // ============================================================
  useEffect(() => {
    const debugHistory = false;
    if (!debugHistory) return;
    let mounted = true;

    (async () => {
      try {
        const raw = await History.list();
        if (!mounted) return;

        const arr = Array.isArray(raw) ? raw : [];
        console.log("[HP][RAW] count =", arr.length);
        console.log("[HP][RAW] sample =", arr[0]);

        const mini = arr.slice(0, 20).map((r: any) => ({
          id: r?.id,
          kind: r?.kind,
          status: r?.status,
          game: r?.game,
          mode: r?.mode,
          variant: r?.variant,
          createdAt: r?.createdAt,
          updatedAt: r?.updatedAt,
          players: (Array.isArray(r?.players) ? r.players : []).map((p: any) => p?.id),
          winnerId: r?.winnerId,
        }));

        console.table(mini);
      } catch (e) {
        console.warn("[HP][RAW] History.list failed", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (loadingRef.current) return;
    const seq = ++loadSeqRef.current;
    loadingRef.current = true;
    setLoading(true);
    try {
      const rows = await HistoryAPI.list(storeRef.current);
      if (seq !== loadSeqRef.current) return;
      setItems(safeArray<SavedEntry>(rows).filter(isUsableSavedEntry).map((r) => normalizeSavedEntry(r)));
    } finally {
      if (seq === loadSeqRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  const scheduleHistoryReload = useCallback(() => {
    if (typeof window === "undefined") return;
    if (refreshTimerRef.current != null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      loadHistory().catch(() => {});
    }, 120);
  }, [loadHistory]);

  useEffect(() => {
    setGameFilter("all");
    setPlayerFilter("all");
    setFilterOpen(false);
  }, [sport]);

  useEffect(() => {
    loadHistory().catch(() => {});
    return () => {
      if (refreshTimerRef.current != null) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [loadHistory]);

  useEffect(() => {
    const onUpd = () => {
      scheduleHistoryReload();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dc-history-refresh") scheduleHistoryReload();
    };
    window.addEventListener("dc-history-updated" as any, onUpd);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("dc-history-updated" as any, onUpd);
      window.removeEventListener("storage", onStorage);
    };
  }, [scheduleHistoryReload]);


  // ============================================================
  // 📥 Inbox (reçues) = Local (import fichier) + Cloud (Supabase)
  // ============================================================
  async function loadInbox() {
    setInboxLoading(true);
    try {
      setInboxLocal(inboxListLocal());
      const cloud = await listInboxCloud("pending");
      setInboxCloud(cloud.ok ? cloud.rows : []);
    } finally {
      setInboxLoading(false);
    }
  }

  useEffect(() => {
    // refresh inbox quand on l'ouvre
    if (tab === "inbox") loadInbox();
  }, [tab]);

  useEffect(() => {
    if (tab === "inbox") setFilterOpen(false);
  }, [tab]);

  async function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!isMatchSharePacketV1(json)) {
        window.alert("Format invalide : ce fichier n'est pas une partie partageable.");
        return;
      }
      inboxAddLocal(json as MatchSharePacketV1);
      setInboxLocal(inboxListLocal());
      window.alert("Partie reçue ✅ (en attente d'acceptation)");
    } catch (e) {
      window.alert("Import impossible : fichier illisible.");
    }
  }

  async function acceptPacket(packet: MatchSharePacketV1) {
    // transforme packet -> SavedMatch (History.upsert compresse si besoin)
    const rec: any = {
      id: packet.matchId,
      kind: packet.kind,
      status: packet.summary?.status === "in_progress" ? "in_progress" : "finished",
      createdAt: packet.exportedAt,
      updatedAt: new Date().toISOString(),
      finishedAt: packet.summary?.finishedAt || null,
      payload: packet.payload,
    };
    await History.upsert(rec as any);
    await loadHistory();
  }

  async function acceptLocal(item: InboxItemLocal) {
    await acceptPacket(item.packet);
    inboxRemoveLocal(item.id);
    setInboxLocal(inboxListLocal());
  }

  async function refuseLocal(item: InboxItemLocal) {
    inboxRemoveLocal(item.id);
    setInboxLocal(inboxListLocal());
  }

  async function acceptCloud(row: InboxRowCloud) {
    await acceptPacket(row.packet);
    await setInboxStatusCloud(row.id, "accepted");
    await loadInbox();
  }

  async function refuseCloud(row: InboxRowCloud) {
    await setInboxStatusCloud(row.id, "refused");
    await loadInbox();
  }

  async function handleShare(entry: SavedEntry) {
    // 1) tente Web Share (Android / PWA)
    const res = await shareOneMatch(entry);

    // 2) fallback robuste : téléchargement du JSON (fonctionne dans StackBlitz / navigateur desktop)
    if (!res || res.ok === false) {
      try {
        const packet = buildMatchSharePacket(entry);
        const json = JSON.stringify(packet, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `match-${packet.kind || "game"}-${packet.matchId || entry.id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        window.alert("Partage via fichier JSON ✅ (téléchargé).");
      } catch {
        window.alert("Partage impossible.");
      }
    }
  }

  async function handleSendToFriend(entry: SavedEntry) {
    const email = window.prompt("Envoyer à quel email (compte ami) ?");
    if (!email) return;


    // Auto opt-in: ensure YOU are discoverable in user_directory (email_norm)
    await ensureDirectoryEntry();
    const packet = buildMatchSharePacket(entry);
    const res = await sendMatchToEmail(email, packet);
    if (res.ok) {
      window.alert("Envoyé ✅ (en attente d'acceptation côté ami)");
    } else if (res.error === "not-found") {
      window.alert(
        "Ami introuvable. Il doit ouvrir l'app, se connecter ONLINE puis activer l'annuaire (user_directory).\n\nAstuce: utilise \"Partager\" pour lui envoyer le fichier JSON en attendant."
      );
    } else if (res.error === "no-user") {
      window.alert("Tu dois être connecté (ONLINE) pour envoyer à un ami.");
    } else {
      window.alert("Erreur envoi: " + (res.message || "db"));
    }
  }


  const { done, running } = useMemo(() => {
    const fins = items.filter((e) => statusOf(e) === "finished");
    const inprog = items.filter((e) => statusOf(e) !== "finished");
    return { done: dedupe(fins), running: dedupe(inprog) };
  }, [items]);

  const inboxCount = (inboxLocal?.length || 0) + (inboxCloud?.length || 0);

  const source = useMemo(
    () => (tab === "all" ? items : tab === "inbox" ? [] : tab === "done" ? done : running),
    [tab, items, done, running]
  );

  const sportSource = useMemo(() => {
    return source.filter((e) => inferSportKey(e) === sport || sport === "darts" && inferSportKey(e) === "darts");
  }, [source, sport]);

  const gameOptions = useMemo(() => {
    const configured = SPORT_GAME_FILTERS[sport] || [];
    const present = new Set(sportSource.map((e) => inferGameFilterKey(e, sport)).filter(Boolean));
    const base = configured.filter((g) => present.has(g.key));
    const configuredKeys = new Set(configured.map((g) => g.key));
    const unknowns = [...present].filter((key) => key && key !== "unknown" && !configuredKeys.has(key));
    return [
      ...base,
      ...unknowns.map((key) => ({ key, label: key.toUpperCase(), aliases: [key] })),
    ];
  }, [sportSource, sport]);

  const playerOptions = useMemo(() => getKnownPlayers(storeRef.current, sportSource), [sportSource]);

  useEffect(() => {
    if (gameFilter !== "all" && !gameOptions.some((g) => g.key === gameFilter)) setGameFilter("all");
  }, [gameFilter, gameOptions]);

  useEffect(() => {
    if (playerFilter !== "all" && !playerOptions.some((p) => p.id === playerFilter)) setPlayerFilter("all");
  }, [playerFilter, playerOptions]);

  const filtered = useMemo(() => {
    return sportSource
      .filter((e) => inRange(e.updatedAt || e.createdAt, sub))
      .filter((e) => gameFilter === "all" || inferGameFilterKey(e, sport) === gameFilter)
      .filter((e) => entryHasPlayer(e, playerFilter));
  }, [sportSource, sub, gameFilter, playerFilter, sport]);

  // Debug volontairement désactivé en prod : les console.table répétées faisaient ramer Firefox.

  async function handleDelete(e: SavedEntry) {
    if (!window.confirm("Supprimer cette partie ?")) return;
    const ids = [e.id, e.matchId, e.resumeId, matchLink(e)].filter(Boolean).map(String);
    const idSet = new Set(ids);

    // Mise à jour optimiste : la carte disparaît immédiatement sans recharger tout l'historique.
    setItems((prev) =>
      safeArray<SavedEntry>(prev).filter((row: any) => {
        const rowIds = [row?.id, row?.matchId, row?.resumeId, matchLink(row)].filter(Boolean).map(String);
        return !rowIds.some((rid) => idSet.has(rid));
      })
    );

    try {
      await Promise.all(ids.map((id) => HistoryAPI.remove(id)));
    } catch (err) {
      console.warn("[HistoryPage] suppression impossible", err);
      await loadHistory().catch(() => {});
      window.alert("Suppression impossible. Historique rechargé.");
    }
  }

  async function handleClearHistory() {
    const count = items.length;
    if (!count) {
      window.alert("L'historique est déjà vide.");
      return;
    }
    const ok = window.confirm(
      `Vider tout l'historique ?

${count} partie(s) seront supprimée(s). Cette action nettoie les parties jouées et ne peut pas être annulée.`
    );
    if (!ok) return;

    const previous = items;
    setItems([]);
    setGameFilter("all");
    setPlayerFilter("all");

    try {
      await HistoryAPI.clear();
      try {
        if (typeof window !== "undefined") window.dispatchEvent(new Event("dc-history-updated"));
      } catch {}
    } catch (err) {
      console.warn("[HistoryPage] vidage historique impossible", err);
      setItems(previous);
      await loadHistory().catch(() => {});
      window.alert("Vidage impossible. Historique rechargé.");
    }
  }

  function safeGo(candidates: string[], params: any) {
    for (const id of candidates) {
      try {
        go(id, params);
        return true;
      } catch {}
    }
    return false;
  }

  function goResume(e: SavedEntry, preview?: boolean) {
    const resumeId = e.resumeId || matchLink(e) || e.id;

    // GOLF
    if (baseMode(e) === "golf") {
      const ok = safeGo(["golf_play", "golf"], {
        rec: e,
        resumeId,
        from: preview ? "history_preview" : "history",
        preview: !!preview,
        mode: "golf",
        config: (e as any)?.payload?.config ?? (e as any)?.decoded?.config ?? null,
      });
      if (!ok) {
        go("golf_play", {
          rec: e,
          resumeId,
          from: preview ? "history_preview" : "history",
          preview: !!preview,
          mode: "golf",
          config: (e as any)?.payload?.config ?? (e as any)?.decoded?.config ?? null,
        });
      }
      return;
    }

    if (isKillerEntry(e)) {
      safeGo(["killer_play", "killer"], {
        resumeId,
        from: preview ? "history_preview" : "history",
        preview: !!preview,
        mode: "killer",
      });
      return;
    }

    if (isShanghaiEntry(e)) {
      const ok = safeGo(["shanghai_play", "shanghai"], {
        resumeId,
        from: preview ? "history_preview" : "history",
        preview: !!preview,
        mode: "shanghai",
      });
      if (!ok) {
        go("x01_play_v3", {
          resumeId,
          from: preview ? "history_preview" : "history",
          mode: baseMode(e),
          preview: !!preview,
        });
      }
      return;
    }

    if (isBatardEntry(e)) {
      safeGo(["batard_play", "batard"], {
        resumeId,
        from: preview ? "history_preview" : "history",
        preview: !!preview,
        mode: "batard",
      });
      return;
    }

    go("x01_play_v3", {
      resumeId,
      rec: e,
      payload: (e as any)?.payload ?? (e as any)?.decoded ?? null,
      from: preview ? "history_preview" : "history",
      mode: baseMode(e),
      preview: !!preview,
    });
  }

  async function goStats(e: SavedEntry) {
    // PATCH hydrate history full record
    try {
      const wantedId = String((e as any)?.id || (e as any)?.matchId || (e as any)?.resumeId || "");
      const wantedResume = String((e as any)?.resumeId || matchLink(e) || wantedId || "");
      const loaded = (wantedId && (await (History as any)?.get?.(wantedId))) || (wantedResume && wantedResume !== wantedId && (await (History as any)?.get?.(wantedResume))) || null;
      if (loaded && typeof loaded === "object") {
        const ePayloadRaw = (e as any).payload;
        const loadedPayloadRaw = (loaded as any).payload;
        const ePayload = ePayloadRaw && typeof ePayloadRaw === "object" && !Array.isArray(ePayloadRaw) ? ePayloadRaw : {};
        const loadedPayload = loadedPayloadRaw && typeof loadedPayloadRaw === "object" && !Array.isArray(loadedPayloadRaw) ? loadedPayloadRaw : {};
        const payload = { ...ePayload, ...loadedPayload };
        const payloadSummary = (payload as any)?.summary && typeof (payload as any).summary === "object" ? (payload as any).summary : {};
        const summary = { ...payloadSummary, ...(((e as any).summary && typeof (e as any).summary === "object") ? (e as any).summary : {}), ...(((loaded as any).summary && typeof (loaded as any).summary === "object") ? (loaded as any).summary : {}) };
        const players = Array.isArray((loaded as any).players) && (loaded as any).players.length ? (loaded as any).players : Array.isArray((payload as any).players) && (payload as any).players.length ? (payload as any).players : (e as any).players;
        e = { ...(e as any), ...(loaded as any), payload: { ...payload, summary }, summary, players } as any;
      }
    } catch (err) { console.warn("[HistoryPage] goStats hydrate failed", err); }
    const resumeId = e.resumeId || matchLink(e) || e.id;

    const m = baseMode(e);

    // ✅ BATARD
    if (isBatardEntry(e)) {
      const wid =
        (e.summary && ((e.summary as any).winnerId || (e.summary as any)?.result?.winnerId)) || (e as any)?.winnerId || null;
      const firstPlayerId = wid || (e.players && e.players.length ? getId(e.players[0]) : null) || null;
      try {
        go("statsHub", {
          tab: "batard",
          initialStatsSubTab: "batard",
          initialPlayerId: firstPlayerId,
          playerId: firstPlayerId,
          matchId: e.id,
          resumeId,
          from: "history",
        });
        return;
      } catch {}
      try {
        go("stats", { tab: "batard", profileId: firstPlayerId });
      } catch {}
      return;
    }

    // ✅ CRICKET
    if (m === "cricket") {
      const wid =
        (e.summary && (e.summary.winnerId || e.summary?.result?.winnerId)) || (e as any)?.winnerId || null;

      const firstPlayerId = wid || (e.players && e.players.length ? getId(e.players[0]) : null) || null;

      try {
        go("statsHub", {
          tab: "cricket",
          initialStatsSubTab: "cricket",
          initialPlayerId: firstPlayerId,
          playerId: firstPlayerId,
          matchId: e.id,
          resumeId,
          from: "history",
        });
        return;
      } catch {}

      try {
        go("cricket_stats", { profileId: firstPlayerId, from: "history" });
        return;
      } catch {}

      try {
        go("stats", { tab: "cricket", profileId: firstPlayerId });
      } catch {}
      return;
    }

    // ✅ KILLER
    if (isKillerEntry(e)) {
      go("killer_summary", { rec: e, resumeId, from: "history" });
      return;
    }

    // ✅ SHANGHAI
    if (isShanghaiEntry(e)) {
      const ok = safeGo(["shanghai_end", "shanghai_summary", "stats_shanghai_match"], {
        rec: e,
        resumeId,
        from: "history",
      });
      if (!ok) {
        go("x01_end", { rec: e, resumeId, showEnd: true, from: "history", __forcedMode: "shanghai" });
      }
      return;
    }

    // ✅ GOLF
    if (m === "golf") {
      try {
        go("statsDetail", {
          store,
          rec: e,
          matchId: e.id,
          from: "history",
        });
        return;
      } catch {}

      try {
        go("golfMatchStats", {
          record: e,
          matchId: e.id,
          from: "history",
        });
        return;
      } catch {}

      try {
        go("stats", { tab: "golf" });
      } catch {}
      return;
    }

    // ✅ FALLBACK X01
    go("x01_end", { rec: e, resumeId, showEnd: true, from: "history" });
  }


  // Fond "tôle inox brossée" + teinte sport
  function metalBackground(color: string) {
    const c = color || theme.primary;
    // Petit bruit (SVG turbulence) pour casser le côté "trop propre"
    const noiseSvg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
      `<filter id="n">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0"/>` +
      `</filter>` +
      `<rect width="180" height="180" filter="url(#n)" opacity="0.18"/>` +
      `</svg>`;
    const noiseUri = `url("data:image/svg+xml,${encodeURIComponent(noiseSvg)}")`;

    // Base acier "brossé" sans rayures apparentes + reflets + teinte sport
    return (
      `radial-gradient(120% 90% at 10% 10%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%),` +
      `radial-gradient(90% 70% at 85% 0%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%),` +
      `linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0) 38%, rgba(0,0,0,0.28)),` +
      // teinte sport (subtile)
      `linear-gradient(160deg, ${c}14, rgba(0,0,0,0.80) 62%, ${c}10),` +
      noiseUri
    );
  }

  function sportLogoForKind(kind: string) {
    const k = String(kind || "").toLowerCase();
    if (k.includes("ping")) return logoPingPong;
    if (k.includes("petanque")) return logoPetanque;
    if (k.includes("babyfoot")) return logoBabyfoot;
    // darts family
    if (k.includes("x01") || k.includes("cricket") || k.includes("killer") || k.includes("shanghai") || k.includes("golf") || k.includes("darts")) return logoDarts;
    return logoDarts;
  }

  function sportCardStyle(color: string) {
    const c = color || theme.primary;
    return {
      ...S.card,
      background: metalBackground(c),
      border: `1px solid ${c}55`,
      boxShadow: `0 14px 30px rgba(0,0,0,.45), 0 0 18px ${c}22`,
    } as any;
  }

  return (
    <div style={S.page}>
      <div style={S.title}>HISTORIQUE</div>

      <ScaledKpiRow baseStyle={S.kpiRow}>
        <div style={S.kpiCard(tab === "all", theme.primary)} onClick={() => setTab("all")}>
          <div style={S.kpiLabel}>ALL</div>
          <div style={S.kpiValue}>{items.length}</div>
        </div>

        <div style={S.kpiCard(tab === "done", theme.primary)} onClick={() => setTab("done")}>
          <div style={S.kpiLabel}>Terminées</div>
          <div style={S.kpiValue}>{done.length}</div>
        </div>

        <div style={S.kpiCard(tab === "running", theme.danger)} onClick={() => setTab("running")}>
          <div style={S.kpiLabel}>En cours</div>
          <div style={{ ...S.kpiValue, color: theme.danger }}>{running.length}</div>
        </div>

        <div style={S.kpiCard(tab === "inbox", theme.primary)} onClick={() => setTab("inbox")}>
          <div style={S.kpiLabel}>Reçues</div>
          <div style={S.kpiValue}>{inboxCount}</div>
        </div>
      </ScaledKpiRow>

      <div style={S.toolbar}>
        <button
          type="button"
          aria-label={loading ? "Chargement de l'historique" : "Recharger l'historique"}
          title={loading ? "Chargement..." : "Recharger"}
          style={S.toolIconBtn(false, loading)}
          onClick={() => loadHistory()}
          disabled={loading}
        >
          <Icon.Refresh />
        </button>

        <button
          type="button"
          aria-label="Importer une partie"
          title="Importer une partie (.json)"
          style={S.toolIconBtn(false, false)}
          onClick={handleImportClick}
        >
          <Icon.Upload />
        </button>

        {tab !== "inbox" && (
          <div style={S.filterPopoverWrap}>
            <button
              type="button"
              aria-label="Filtrer l'historique"
              title="Filtrer"
              style={S.toolIconBtn(false, filterOpen || gameFilter !== "all" || playerFilter !== "all")}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Icon.Filter />
            </button>

            {filterOpen && (
              <div style={S.filterPanel}>
                <div style={S.filterTabs}>
                  <button
                    type="button"
                    aria-label="Filtrer par jeu"
                    title="Jeux"
                    style={S.filterTabBtn(filterMode === "games")}
                    onClick={() => setFilterMode("games")}
                  >
                    <Icon.Gamepad />
                  </button>
                  <button
                    type="button"
                    aria-label="Filtrer par joueur"
                    title="Joueurs"
                    style={S.filterTabBtn(filterMode === "players")}
                    onClick={() => setFilterMode("players")}
                  >
                    <Icon.User />
                  </button>
                </div>

                <div style={S.filterDropdown}>
                  {filterMode === "games" ? (
                    <>
                      <button
                        type="button"
                        style={S.filterChip(gameFilter === "all", theme.primary)}
                        onClick={() => setGameFilter("all")}
                        title="Afficher tous les jeux"
                      >
                        Tous les jeux <span style={S.chipCount}>{sportSource.length}</span>
                      </button>
                      {gameOptions.map((g) => {
                        const n = sportSource.filter((e) => inferGameFilterKey(e, sport) === g.key).length;
                        return (
                          <button
                            type="button"
                            key={g.key}
                            style={S.filterChip(gameFilter === g.key, theme.primary)}
                            onClick={() => setGameFilter(g.key)}
                            title={`Afficher seulement ${g.label}`}
                          >
                            {g.label} <span style={S.chipCount}>{n}</span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={S.filterChip(playerFilter === "all", theme.primary)}
                        onClick={() => setPlayerFilter("all")}
                        title="Afficher tous les joueurs"
                      >
                        Tous les joueurs
                      </button>
                      {playerOptions.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          style={S.filterChip(playerFilter === p.id, theme.primary)}
                          onClick={() => setPlayerFilter(p.id)}
                          title={`Afficher seulement ${p.label}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab !== "inbox" && (
          <button
            type="button"
            aria-label="Vider tout l'historique"
            title="Vider tout l'historique"
            style={S.toolIconBtn(true, false)}
            onClick={handleClearHistory}
          >
            <Icon.Trash />
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={async (e: any) => {
            const f = e?.target?.files?.[0];
            e.target.value = "";
            if (!f) return;
            await handleImportFile(f);
          }}
        />
      </div>

      {tab !== "inbox" && (
        <>
          <div style={S.filtersRow}>
            {(
              [
                ["today", "J"],
                ["week", "S"],
                ["month", "M"],
                ["year", "A"],
                ["archives", "ARV"],
              ] as any
            ).map(([key, label]) => (
              <div key={key} style={S.filterBtn(sub === key)} onClick={() => setSub(key as RangeKey)}>
                {label}
              </div>
            ))}
          </div>        </>
      )}

      <div style={S.list}>
        {tab === "inbox" ? (
          <div>
            {inboxLoading ? (
              <div style={{ opacity: 0.7, textAlign: "center", marginTop: 20 }}>Chargement...</div>
            ) : inboxCount === 0 ? (
              <div style={{ opacity: 0.7, textAlign: "center", marginTop: 20 }}>
                Aucune partie reçue.
              </div>
            ) : (
              <>
                {inboxCloud.length > 0 && (
                  <div style={{ marginBottom: 10, opacity: 0.85, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon.Inbox /> Reçues (ONLINE)
                  </div>
                )}
                {inboxCloud.map((row) => {
                  const c = getModeColor({ kind: row.packet?.kind || row.kind, game: { mode: row.packet?.kind || row.kind } } as any);
                  return (
                    <div key={row.id} style={sportCardStyle(c)}>
                      <img src={sportLogoForKind(row.packet?.kind || row.kind)} style={S.watermarkLogo} />
                      <div style={S.rowBetween}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: c + "22", border: `1px solid ${c}99`, color: c }}>
                            {(row.packet?.summary?.title || row.kind || "MATCH").toUpperCase()}
                          </span>
                          <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: theme.primary }}>
                            Reçue
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: theme.primary }}>{fmtDate(row.created_at)}</span>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                        {row.packet?.summary?.scoreLine || "—"}
                      </div>

                      <div style={S.pillRow}>
                        <div style={{ ...S.pill, ...S.pillGold }} onClick={() => acceptCloud(row)}>
                          <Icon.Check /> Accepter
                        </div>
                        <div style={{ ...S.pill, ...S.pillDanger }} onClick={() => refuseCloud(row)}>
                          <Icon.X /> Refuser
                        </div>
                      </div>
                    </div>
                  );
                })}

                {inboxLocal.length > 0 && (
                  <div style={{ margin: "14px 0 10px", opacity: 0.85, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon.Inbox /> Reçues (LOCAL)
                  </div>
                )}
                {inboxLocal.map((it) => {
                  const kind = it.packet?.kind || "match";
                  const c = getModeColor({ kind, game: { mode: kind } } as any);
                  return (
                    <div key={it.id} style={sportCardStyle(c)}>
                      <img src={sportLogoForKind(it.packet?.kind || it.packet?.summary?.title || "match")} style={S.watermarkLogo} />
                      <div style={S.rowBetween}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: c + "22", border: `1px solid ${c}99`, color: c }}>
                            {(it.packet?.summary?.title || kind).toUpperCase()}
                          </span>
                          <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: theme.primary }}>
                            Importée
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: theme.primary }}>{fmtDate(it.receivedAt)}</span>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                        {it.packet?.summary?.scoreLine || "—"}
                      </div>

                      <div style={S.pillRow}>
                        <div style={{ ...S.pill, ...S.pillGold }} onClick={() => acceptLocal(it)}>
                          <Icon.Check /> Accepter
                        </div>
                        <div style={{ ...S.pill, ...S.pillDanger }} onClick={() => refuseLocal(it)}>
                          <Icon.X /> Refuser
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
	        ) : (
	          filtered.length === 0 ? (
	            <div style={{ opacity: 0.7, textAlign: "center", marginTop: 20 }}>Aucune partie ici.</div>
	          ) : (
	            filtered.map((e) => {
            const inProg = statusOf(e) === "in_progress";
            const key = matchLink(e) || e.id;

            return (
              <ScaledCard key={key} baseStyle={sportCardStyle(getModeColor(e))}>
                <img src={sportLogoForKind(baseMode(e) || e.kind)} style={S.watermarkLogo} />
                <div style={S.rowBetween}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: getModeColor(e) + "22",
                        border: `1px solid ${getModeColor(e)}99`,
                        color: getModeColor(e),
                        textShadow: "0 0 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {modeLabel(e)}
                    </span>

                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: inProg ? "rgba(255,0,0,0.1)" : getModeColor(e) + "22",
                        border: "1px solid " + (inProg ? theme.danger : getModeColor(e)),
                        color: inProg ? theme.danger : getModeColor(e),
                        textShadow: "0 0 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {inProg ? "En cours" : "Terminé"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: theme.primary }}>{fmtDate(e.updatedAt || e.createdAt)}</span>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                  {detectFormat(e)}
                  {(() => {
                    const s = summarizeScore(e);
                    return s ? " • " + s : "";
                  })()}
                </div>

                <div style={{ ...S.rowBetween, marginTop: 10 }}>
                  <div style={S.avatars}>
                    {(e.players || []).slice(0, 6).map((p, i) => {
                      const nm = getName(p);
                      const url = getAvatarUrl(store, p);
                      return (
                        <div key={i} style={{ ...S.avWrap, marginLeft: i === 0 ? 0 : -8 }}>
                          {url ? (
                            <img src={url} style={S.avImg} />
                          ) : (
                            <div style={S.avFallback}>{nm ? nm.slice(0, 2) : "?"}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(!inProg && e.winnerName) ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: theme.primary }}>
                      <Icon.Trophy /> {e.winnerName}
                    </div>
                  ) : null}
                </div>

                <div style={S.actionRow}>
                  {inProg ? (
                    <div style={S.primaryAction} onClick={() => goResume(e, false)}>
                      <Icon.Play />
                    </div>
                  ) : (
                    <div style={S.primaryAction} onClick={() => goStats(e)}>
                      <Icon.Eye /> Voir stats
                    </div>
                  )}

                  <div style={S.iconRow}>
                    {inProg && (
                      <div style={S.iconBtn} onClick={() => goResume(e, true)} title="Voir (sans reprendre)">
                        <Icon.Eye />
                      </div>
                    )}

                    <div style={S.iconBtn} onClick={() => handleShare(e)} title="Partager (fichier .json / feuille Android)">
                      <Icon.Share />
                    </div>

                    <div style={S.iconBtn} onClick={() => handleSendToFriend(e)} title="Envoyer directement à un ami (email)">
                      <Icon.Send />
                    </div>

                    <div style={{ ...S.iconBtn, ...S.iconDanger }} onClick={() => handleDelete(e)} title="Supprimer">
                      <Icon.Trash />
                    </div>
                  </div>
                </div>
              </ScaledCard>
            );
	            })
	          )
        )}
      </div>
    </div>
  );
}

/* ---------- Date format ---------- */
function fmtDate(ts: number) {
  const n = Number(ts || 0);
  return new Date(Number.isFinite(n) && n > 0 ? n : Date.now()).toLocaleString();
}
