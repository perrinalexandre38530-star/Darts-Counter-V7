// @ts-nocheck
// =============================================================
// src/lib/molkkyStore.ts
// Thin compatibility wrapper for Mölkky stats pages.
// We keep the real persistence in molkkyStatsStore.ts.
// =============================================================

import { loadMolkkyHistory, saveMolkkyHistory } from "./molkkyStatsStore";

// The stats pages expect a "matches" list (history entries).
export function loadMolkkyMatches() {
  return loadMolkkyHistory();
}

export function saveMolkkyMatches(rows: any[]) {
  return saveMolkkyHistory(rows);
}

export function clearMolkkyMatches() {
  return saveMolkkyHistory([]);
}
