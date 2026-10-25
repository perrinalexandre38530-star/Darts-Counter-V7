// ============================================================
// src/lib/storeDartSets.ts
// WAVE 3 — façade de compatibilité vers dartSetsStore.ts.
//
// Ce module historique ne possède plus de source de vérité distincte. Les
// appels legacy restent compatibles mais toute mutation est immédiatement
// déléguée au store DartSets canonique.
// ============================================================

import type { Store } from "./types";
import {
  getAllDartSets,
  getDartSetsForProfile as getCanonicalDartSetsForProfile,
  setAllDartSets,
  deleteDartSet as deleteCanonicalDartSet,
  setFavoriteDartSet,
  type DartSet as CanonicalDartSet,
} from "./dartSetsStore";

export type DartSet = CanonicalDartSet;

function mirrorIntoLegacyStore(store: Store, list: CanonicalDartSet[]): CanonicalDartSet[] {
  try { (store as any).dartSets = list; } catch {}
  return list;
}

export function ensureDartSets(store: Store): DartSet[] {
  return mirrorIntoLegacyStore(store, getAllDartSets());
}

export function getDartSetsForProfile(store: Store, profileId: string): DartSet[] {
  const rows = getCanonicalDartSetsForProfile(profileId);
  mirrorIntoLegacyStore(store, getAllDartSets());
  return rows;
}

export function upsertDartSet(store: Store, set: DartSet) {
  const rows = getAllDartSets();
  const idx = rows.findIndex((row) => row.id === set.id);
  const next = rows.slice();
  if (idx >= 0) next[idx] = { ...rows[idx], ...set, id: rows[idx].id, createdAt: rows[idx].createdAt };
  else next.push(set);
  setAllDartSets(next);
  mirrorIntoLegacyStore(store, getAllDartSets());
}

export function deleteDartSet(store: Store, id: string) {
  deleteCanonicalDartSet(id);
  mirrorIntoLegacyStore(store, getAllDartSets());
}

export function setFavorite(store: Store, profileId: string, id: string) {
  setFavoriteDartSet(profileId, id);
  mirrorIntoLegacyStore(store, getAllDartSets());
}
