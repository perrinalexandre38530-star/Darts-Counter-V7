// src/lib/cloudBackup/restoreBackup.ts
// ============================================
// Restore d'un CloudBackup (JSON)
// - remplace (par défaut) : history + profiles + dartsets
// - rebuild stats après import (⚠️ pas de stats dans le backup)
// ============================================

import { History } from "../history";
import { loadStore, saveStore } from "../storage";
import type { Store } from "../types";
import { rebuildStatsFromHistory } from "../stats/rebuildStatsFromHistory";
import { setAllDartSets, getAllDartSets } from "../dartSetsStore";
import { isCloudBackup, type CloudBackup } from "./cloudBackupTypes";

export type RestoreMode = "replace" | "merge";

export async function restoreCloudBackupFromJson(args: {
  json: string;
  mode?: RestoreMode;
  rebuild?: boolean;
}): Promise<{ ok: true; backup: CloudBackup } | { ok: false; error: string }> {
  const mode: RestoreMode = args.mode ?? "replace";
  const rebuild = args.rebuild !== false;

  let parsed: any;
  try {
    parsed = JSON.parse(args.json);
  } catch {
    return { ok: false, error: "JSON invalide" };
  }

  if (!isCloudBackup(parsed)) {
    return { ok: false, error: "Format CloudBackup invalide" };
  }

  const backup: CloudBackup = parsed;

  // ----------------------------
  // 1) Profiles + dartsets (Store + dartSetsStore)
  // ----------------------------
  const storeAny = (await loadStore<any>().catch(() => null)) || {};

  const incomingProfiles = Array.isArray(backup.localProfiles) ? backup.localProfiles : [];
  const incomingDartSets = Array.isArray(backup.dartsets) ? backup.dartsets : [];

  let nextProfiles: any[];
  let nextDartSets: any[];

  if (mode === "merge") {
    const curProfiles: any[] = Array.isArray(storeAny.profiles) ? storeAny.profiles : [];
    const byId = new Map<string, any>();
    for (const p of curProfiles) if (p?.id) byId.set(String(p.id), p);
    for (const p of incomingProfiles) if (p?.id) byId.set(String(p.id), p);
    nextProfiles = Array.from(byId.values());

    const curDartSets: any[] = Array.isArray(storeAny.dartSets) ? storeAny.dartSets : getAllDartSets();
    const dsById = new Map<string, any>();
    for (const s of curDartSets) if (s?.id) dsById.set(String(s.id), s);
    for (const s of incomingDartSets) if (s?.id) dsById.set(String(s.id), s);
    nextDartSets = Array.from(dsById.values());
  } else {
    nextProfiles = incomingProfiles;
    nextDartSets = incomingDartSets;
  }

  // activeProfileId best effort
  let nextActive = storeAny.activeProfileId ?? null;
  if (nextActive && !nextProfiles.find((p) => String(p?.id) === String(nextActive))) {
    nextActive = null;
  }
  if (!nextActive && nextProfiles.length) nextActive = String(nextProfiles[0]?.id || "") || null;

  const nextStore: any = {
    ...storeAny,
    profiles: nextProfiles,
    activeProfileId: nextActive,
    dartSets: nextDartSets,
  };

  try {
    setAllDartSets(nextDartSets as any);
  } catch {}

  try {
    await saveStore(nextStore as Store);
  } catch {}

  // ----------------------------
  // 2) History (IndexedDB)
  // ----------------------------
  try {
    if (mode === "replace") {
      await History.clear?.();
    }
  } catch {}

  const rows = Array.isArray(backup.history) ? backup.history : [];
  for (const rec of rows) {
    try {
      // upsert = id stable / dedupe
      await History.upsert?.(rec as any);
    } catch {
      // jamais casser le restore
    }
  }

  // ----------------------------
  // 3) Rebuild stats (pas dans le backup)
  // ----------------------------
  if (rebuild) {
    try {
      await rebuildStatsFromHistory({ includeNonFinished: true, persist: true });
    } catch {}
  }

  return { ok: true, backup };
}
