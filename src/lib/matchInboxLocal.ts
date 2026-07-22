// @ts-nocheck
// ============================================
// src/lib/matchInboxLocal.ts
// Inbox LOCAL robuste pour les parties importées.
// - compression LZString pour limiter le quota localStorage
// - compatibilité avec l'ancien JSON non compressé
// - repli sessionStorage puis mémoire si le quota est plein
// - déduplication par matchId
// ============================================

import LZString from "lz-string";
import type { MatchSharePacketV1 } from "./matchShare";

export type InboxItemLocal = {
  id: string;
  receivedAt: string;
  packet: MatchSharePacketV1;
};

const KEY = "dc_inbox_matches_v1";
const SESSION_KEY = "dc_inbox_matches_v1_session";
const PACKED_PREFIX = "lz:";
const MAX_ITEMS = 100;

let memoryFallback: InboxItemLocal[] = [];

function uid() {
  return globalThis.crypto?.randomUUID?.() || `inbox_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getLocal(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function getSession(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

function normalizeItem(value: any): InboxItemLocal | null {
  try {
    if (!value || typeof value !== "object" || !value.packet) return null;
    const packet = value.packet as MatchSharePacketV1;
    const matchId = String(packet?.matchId || "").trim();
    if (!matchId) return null;
    return {
      id: String(value.id || uid()),
      receivedAt: String(value.receivedAt || new Date().toISOString()),
      packet,
    };
  } catch {
    return null;
  }
}

function decode(raw: string | null): InboxItemLocal[] {
  if (!raw) return [];
  try {
    let json = raw;
    if (raw.startsWith(PACKED_PREFIX)) {
      json = LZString.decompressFromUTF16(raw.slice(PACKED_PREFIX.length)) || "[]";
    }
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter(Boolean) as InboxItemLocal[];
  } catch {
    return [];
  }
}

function encode(items: InboxItemLocal[]): string {
  const json = JSON.stringify(items);
  const packed = LZString.compressToUTF16(json);
  return packed ? `${PACKED_PREFIX}${packed}` : json;
}

function read(storage: Storage | null, key: string): InboxItemLocal[] {
  if (!storage) return [];
  try {
    return decode(storage.getItem(key));
  } catch {
    return [];
  }
}

function write(storage: Storage | null, key: string, items: InboxItemLocal[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, encode(items));
    return true;
  } catch {
    return false;
  }
}

function removeStorageKey(storage: Storage | null, key: string) {
  try {
    storage?.removeItem(key);
  } catch {}
}

function matchIdOf(item: InboxItemLocal): string {
  return String(item?.packet?.matchId || "").trim();
}

function mergeDedup(...groups: InboxItemLocal[][]): InboxItemLocal[] {
  const out: InboxItemLocal[] = [];
  const seenItems = new Set<string>();
  const seenMatches = new Set<string>();

  for (const group of groups) {
    for (const raw of group || []) {
      const item = normalizeItem(raw);
      if (!item) continue;
      const itemId = String(item.id || "");
      const matchId = matchIdOf(item);
      if ((itemId && seenItems.has(itemId)) || (matchId && seenMatches.has(matchId))) continue;
      if (itemId) seenItems.add(itemId);
      if (matchId) seenMatches.add(matchId);
      out.push(item);
    }
  }

  return out
    .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")))
    .slice(0, MAX_ITEMS);
}

function persist(items: InboxItemLocal[]) {
  const next = mergeDedup(items);
  const local = getLocal();
  const session = getSession();

  // ✅ ANDROID / PWA FIX V5
  // Toujours garder une copie mémoire pour garantir l'affichage immédiat
  // de la carte dans "Reçues", même si le stockage navigateur se comporte mal.
  memoryFallback = next;

  // Stockage persistant prioritaire + vérification par relecture.
  if (write(local, KEY, next)) {
    const roundTrip = read(local, KEY);
    const expectedIds = new Set(next.map(matchIdOf).filter(Boolean));
    const actualIds = new Set(roundTrip.map(matchIdOf).filter(Boolean));
    const verified =
      expectedIds.size === actualIds.size &&
      Array.from(expectedIds).every((id) => actualIds.has(id));

    if (verified) {
      removeStorageKey(session, SESSION_KEY);
      return;
    }
  }

  // Repli valable pendant l'onglet/session si localStorage est saturé.
  if (write(session, SESSION_KEY, next)) {
    return;
  }

  // Dernier repli : memoryFallback suffit pour la session courante.
}

export function inboxListLocal(): InboxItemLocal[] {
  return mergeDedup(memoryFallback, read(getSession(), SESSION_KEY), read(getLocal(), KEY));
}

export function inboxAddLocal(packet: MatchSharePacketV1): InboxItemLocal {
  const item: InboxItemLocal = {
    id: uid(),
    receivedAt: new Date().toISOString(),
    packet,
  };

  const matchId = String(packet?.matchId || "").trim();
  const current = inboxListLocal().filter((row) => !matchId || matchIdOf(row) !== matchId);
  persist([item, ...current]);
  return item;
}

export function inboxRemoveLocal(id: string) {
  const wanted = String(id || "");
  persist(inboxListLocal().filter((row) => String(row.id || "") !== wanted));
}

export function inboxClearLocal() {
  memoryFallback = [];
  removeStorageKey(getLocal(), KEY);
  removeStorageKey(getSession(), SESSION_KEY);
}
