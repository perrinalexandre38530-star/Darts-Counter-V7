// src/lib/cloudBackup/exportBackup.ts

import { makeCloudBackup } from "./cloudBackupTypes";

import { History } from "../history";
import { loadStore, saveStore } from "../storage";
import type { Store } from "../types";
import { getAllDartSets, setAllDartSets } from "../dartSetsStore";

function getAppVersion(): string {
  // Option A (Vite): define import.meta.env.VITE_APP_VERSION
  const v = (import.meta as any)?.env?.VITE_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v;

  // Option B: fallback
  return "unknown";
}

export async function exportCloudBackupAsJson(): Promise<{
  backupJson: string;
  backupObj: any;
}> {
  // This export can become *very* large, especially if profiles/dartsets embed
  // base64 images (avatarDataUrl, photoDataUrl, etc.). Large JSON.stringify()
  // can block the UI thread and look like a freeze.
  //
  // Strategy:
  // - Yield once to allow UI to paint any "Export…" message.
  // - Strip only *huge* embedded data URLs to keep exports reliable.
  const yieldToUi = async () => {
    try {
      await new Promise<void>((r) => setTimeout(r, 0));
    } catch {}
  };

  const maybeStripHugeDataUrl = (v: unknown) => {
    if (typeof v !== "string") return v;
    // Keep small images; strip only very large base64 payloads.
    // 120k chars ~ 90KB base64 (enough for a usable avatar).
    return v.length > 120_000 ? "" : v;
  };

  const slimProfile = (p: any) => {
    if (!p || typeof p !== "object") return p;
    if (typeof p.avatarDataUrl === "string") {
      return { ...p, avatarDataUrl: maybeStripHugeDataUrl(p.avatarDataUrl) };
    }
    return p;
  };

  const slimDartset = (d: any) => {
    if (!d || typeof d !== "object") return d;
    if (typeof d.imageDataUrl === "string") {
      return { ...d, imageDataUrl: maybeStripHugeDataUrl(d.imageDataUrl) };
    }
    if (typeof d.photoDataUrl === "string") {
      return { ...d, photoDataUrl: maybeStripHugeDataUrl(d.photoDataUrl) };
    }
    return d;
  };

  // ✅ Source de vérité :
  // - History (IndexedDB)
  // - Store (profils)
  // - dartSetsStore (localStorage) + mirror store.dartSets

  const [history, storeAny] = await Promise.all([
    History.list?.() ?? [],
    loadStore<any>().catch(() => null),
  ]);

  const localProfiles = ((storeAny?.profiles ?? []) as any[]).map(slimProfile);
  const dartsets = (((storeAny as any)?.dartSets ?? getAllDartSets()) as any[]).map(slimDartset);

  // ✅ Best-effort: remet dartSetsStore en phase si store.dartSets est la source actuelle
  try {
    if (Array.isArray((storeAny as any)?.dartSets)) setAllDartSets((storeAny as any).dartSets);
  } catch {}
  try {
    if (storeAny && Array.isArray(dartsets)) {
      const st: any = { ...storeAny, dartSets: dartsets };
      await saveStore(st as Store).catch(() => {});
    }
  } catch {}

  const backup = makeCloudBackup({
    appVersion: getAppVersion(),
    history: Array.isArray(history) ? history : [],
    localProfiles: Array.isArray(localProfiles) ? localProfiles : [],
    dartsets: Array.isArray(dartsets) ? dartsets : [],
  });

  // Give the UI a chance to paint before the heavy stringify.
  await yieldToUi();
  const backupJson = JSON.stringify(backup);
  return { backupJson, backupObj: backup };
}
