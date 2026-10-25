// src/lib/cloudBackup/restoreBackup.ts
// ============================================
// Restore d'un CloudBackup (JSON)
// - remplace (par défaut) : history + profiles + dartsets
// - rebuild stats après import (⚠️ pas de stats dans le backup)
// - ne touche pas au flux NAS
// ============================================

import { importHistoryDump } from "../historyCloud";
import { getStorageUser, importCloudSnapshot, importRegisteredAppDataSnapshot, loadStore, saveStore } from "../storage";
import type { Store } from "../types";
import { cancelScheduledStatsIndexRefresh, scheduleStatsIndexRefresh } from "../stats/rebuildStatsFromHistory";
import { setAllDartSets, getAllDartSets } from "../dartSetsStore";
import { isCloudBackup, type CloudBackup } from "./cloudBackupTypes";
import { importUserMediaFallbackSnapshot } from "../userMediaFallback";
import { collectRequiredMediaKeysFromSnapshot, importMediaVaultV2Snapshot, validateMediaVaultV2Snapshot } from "../../data/mediaVaultV2";
import { isCanonicalBackupArtifact, validateCanonicalBackupArtifact } from "../backup/canonicalBackupArtifact";

export type RestoreMode = "replace" | "merge";

function stripHugeDataUrl(v: unknown) {
  if (typeof v !== "string") return v;
  return v.length > 120_000 ? "" : v;
}

function sanitizeProfile(p: any) {
  if (!p || typeof p !== "object") return p;
  const next = { ...p } as any;

  if (typeof next.avatarDataUrl === "string") {
    next.avatarDataUrl = stripHugeDataUrl(next.avatarDataUrl);
  }
  if (typeof next.avatar === "string") {
    next.avatar = stripHugeDataUrl(next.avatar);
  }

  return next;
}

function sanitizeDartSet(s: any) {
  if (!s || typeof s !== "object") return s;
  const next = { ...s } as any;

  if (typeof next.imageDataUrl === "string") {
    next.imageDataUrl = stripHugeDataUrl(next.imageDataUrl);
  }
  if (typeof next.photoDataUrl === "string") {
    next.photoDataUrl = stripHugeDataUrl(next.photoDataUrl);
  }

  return next;
}

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

  // WAVE 7 — format canonique. Il est validé ici pour fournir une erreur
  // immédiate à l'UI, puis importCloudSnapshot refait la validation + staging
  // avant commit. Les CloudBackup V1/V2/V3 restent supportés plus bas.
  if (isCanonicalBackupArtifact(parsed)) {
    try {
      const checked = await validateCanonicalBackupArtifact(parsed, {
        expectedOwnerUserId: String(getStorageUser() || "").trim() || null,
      });
      if (!checked.ok) return { ok: false, error: checked.errors.join(" ") };
      await importCloudSnapshot(parsed as any, { mode });
      return { ok: true, backup: parsed as any };
    } catch (error: any) {
      return { ok: false, error: `Restauration canonique impossible: ${String(error?.message || error)}` };
    }
  }

  if (!isCloudBackup(parsed)) {
    return { ok: false, error: "Format de sauvegarde invalide" };
  }

  const backup: CloudBackup = parsed;

  // WAVE 5 — restaurer d'abord les domaines applicatifs complémentaires.
  // Les CloudBackup V1 n'ont pas ce bloc : compatibilité totale par absence.
  try {
    if ((backup as any).appData) {
      await importRegisteredAppDataSnapshot((backup as any).appData);
    }
  } catch (error: any) {
    return { ok: false, error: `Restauration des données MULTISPORTS impossible: ${String(error?.message || error)}` };
  }

  try {
    if ((parsed as any)?.mediaVaultV2 || (parsed as any)?.media_vault_v2) {
      const portableShape = { portableAccountData: { profiles: backup.localProfiles, dartSets: backup.dartsets } };
      const requiredKeys = collectRequiredMediaKeysFromSnapshot(portableShape);
      const validation = await validateMediaVaultV2Snapshot(parsed, {
        ownerUserId: String(getStorageUser() || "").trim() || null,
        requiredKeys,
      });
      if (!validation.ok) return { ok: false, error: `Media Vault V2 invalide: ${validation.errors.slice(0, 6).join(" ")}` };
      const imported = await importMediaVaultV2Snapshot(parsed, { ownerUserId: String(getStorageUser() || "").trim() || null });
      if (!imported.ok) return { ok: false, error: `Import Media Vault V2 incomplet: ${imported.errors.slice(0, 6).join(" ")}` };
    } else {
      await importUserMediaFallbackSnapshot((parsed as any)?.userMediaFallbacks || (parsed as any)?.user_media_fallbacks || null);
    }
  } catch (error: any) {
    return { ok: false, error: `Restauration média impossible: ${String(error?.message || error)}` };
  }

  const storeAny = (await loadStore<any>().catch(() => null)) || {};

  const incomingProfiles = Array.isArray(backup.localProfiles)
    ? backup.localProfiles.map(sanitizeProfile)
    : [];
  const incomingDartSets = Array.isArray(backup.dartsets)
    ? backup.dartsets.map(sanitizeDartSet)
    : [];

  let nextProfiles: any[];
  let nextDartSets: any[];

  if (mode === "merge") {
    const curProfiles: any[] = Array.isArray(storeAny.profiles) ? storeAny.profiles : [];
    const byId = new Map<string, any>();
    for (const p of curProfiles) if (p?.id) byId.set(String(p.id), p);
    for (const p of incomingProfiles) if (p?.id) byId.set(String(p.id), p);
    nextProfiles = Array.from(byId.values());

    const curDartSets: any[] = Array.isArray(storeAny.dartSets)
      ? storeAny.dartSets
      : getAllDartSets();

    const dsById = new Map<string, any>();
    for (const s of curDartSets) if (s?.id) dsById.set(String(s.id), s);
    for (const s of incomingDartSets) if (s?.id) dsById.set(String(s.id), s);
    nextDartSets = Array.from(dsById.values());
  } else {
    nextProfiles = incomingProfiles;
    nextDartSets = incomingDartSets;
  }

  let nextActive = storeAny.activeProfileId ?? null;
  if (nextActive && !nextProfiles.find((p) => String(p?.id) === String(nextActive))) {
    nextActive = null;
  }
  if (!nextActive && nextProfiles.length) {
    nextActive = String(nextProfiles[0]?.id || "") || null;
  }

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
  } catch (e: any) {
    return { ok: false, error: `saveStore failed: ${String(e?.message ?? e)}` };
  }

  try {
    cancelScheduledStatsIndexRefresh();
  } catch {}

  const rows = Array.isArray(backup.history) ? backup.history : [];
  const rowsById: Record<string, any> = {};
  for (const rec of rows) {
    const id = String((rec as any)?.id || (rec as any)?.matchId || "").trim();
    if (id) rowsById[id] = rec;
  }
  const historyV4 = (backup as any)?.historyV4;
  try {
    await importHistoryDump({
      _v: 1,
      rows: rowsById,
      ...(Number(historyV4?.schemaVersion || 0) === 4
        ? { historySchemaVersion: 4 as const, tombstones: historyV4?.tombstones || {} }
        : {}),
    }, {
      replace: mode === "replace",
      preserveExisting: mode !== "replace",
    });
  } catch (error: any) {
    return { ok: false, error: `Restauration History impossible: ${String(error?.message || error)}` };
  }
  const importedHistoryRows = Object.keys(rowsById).length;

  if (rebuild && (importedHistoryRows > 0 || Number(historyV4?.schemaVersion || 0) === 4)) {
    try {
      await scheduleStatsIndexRefresh({
        includeNonFinished: true,
        persist: true,
        debounceMs: 80,
        reason: `cloud-backup-restore:${mode}:${importedHistoryRows}`,
      });
    } catch {}
  }

  // Compat CloudBackup V1 : même règle que les snapshots modernes.
  // Une restauration devient le nouvel état du compte, quel que soit le
  // transport qui a fourni le fichier (Drive/NAS/SD/fichier/R2).
  try {
    const forceSync = typeof window !== "undefined" ? (window as any).__forceAccountOwnedSyncNow : null;
    if (typeof forceSync === "function") {
      await forceSync({ reason: `cloud-backup-v1:${mode}` });
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dc:account-owned-force-sync", {
        detail: { reason: `cloud-backup-v1:${mode}` },
      }));
    }
  } catch (syncError) {
    console.warn("[cloudBackup] account sync after restore deferred", syncError);
  }

  return { ok: true, backup };
}
