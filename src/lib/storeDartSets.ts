// ============================================================
// src/lib/storeDartSets.ts
// SOURCE UNIQUE des dartsets (STORE-BASED)
// ============================================================

import type { Store } from "./types";

export type DartSet = {
  id: string;
  profileId: string;
  name: string;
  brand?: string;
  weightGrams?: number;
  notes?: string;
  scope: "private" | "public";
  bgColor?: string;

  kind?: "plain" | "preset" | "photo";
  presetId?: string;
  mainImageUrl?: string;
  thumbImageUrl?: string;

  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
};

const MAX_IMAGE_DATA_URL_CHARS = 380_000;

function sanitizeImageUrl(value: any): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (!v.startsWith("data:image/")) return v;
  return v.length <= MAX_IMAGE_DATA_URL_CHARS ? v : undefined;
}

function sanitizeSet(set: DartSet): DartSet {
  const mainImageUrl = sanitizeImageUrl(set.mainImageUrl) || "";
  const thumbImageUrl = sanitizeImageUrl(set.thumbImageUrl);
  return {
    ...set,
    mainImageUrl,
    thumbImageUrl,
    kind: set.kind === "photo" && !mainImageUrl ? (set.presetId ? "preset" : "plain") : set.kind,
  };
}

export function ensureDartSets(store: Store): DartSet[] {
  if (!Array.isArray((store as any).dartSets)) {
    (store as any).dartSets = [];
  }
  return (store as any).dartSets;
}

export function getDartSetsForProfile(store: Store, profileId: string): DartSet[] {
  return ensureDartSets(store).filter((s) => s.profileId === profileId);
}

export function upsertDartSet(store: Store, set: DartSet) {
  const list = ensureDartSets(store);
  const safe = sanitizeSet(set);
  const idx = list.findIndex((s) => s.id === safe.id);
  if (idx >= 0) list[idx] = safe;
  else list.push(safe);
}

export function deleteDartSet(store: Store, id: string) {
  (store as any).dartSets = ensureDartSets(store).filter((s) => s.id !== id);
}

export function setFavorite(store: Store, profileId: string, id: string) {
  const list = ensureDartSets(store);
  for (const s of list) {
    if (s.profileId !== profileId) continue;
    s.isFavorite = s.id === id;
  }
}
