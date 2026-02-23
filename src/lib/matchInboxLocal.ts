// @ts-nocheck
// ============================================
// src/lib/matchInboxLocal.ts
// Inbox LOCAL de parties reçues (import fichier / QR / etc.)
// - liste / add / remove / clear
// ============================================

import type { MatchSharePacketV1 } from "./matchShare";

export type InboxItemLocal = {
  id: string;
  receivedAt: string;
  packet: MatchSharePacketV1;
};

const KEY = "dc_inbox_matches_v1";

function uid() {
  return (globalThis.crypto?.randomUUID?.() || `inbox_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

export function inboxListLocal(): InboxItemLocal[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function inboxAddLocal(packet: MatchSharePacketV1): InboxItemLocal {
  const item: InboxItemLocal = { id: uid(), receivedAt: new Date().toISOString(), packet };
  const next = [item, ...inboxListLocal()];
  localStorage.setItem(KEY, JSON.stringify(next));
  return item;
}

export function inboxRemoveLocal(id: string) {
  const next = inboxListLocal().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function inboxClearLocal() {
  localStorage.removeItem(KEY);
}
