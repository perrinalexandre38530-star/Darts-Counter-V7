// src/lib/cloudBackup/exportBackup.ts

import { makeCloudBackup } from "./cloudBackupTypes";

import { History } from "../history";
import { loadStore, saveStore } from "../storage";
import type { Store } from "../types";
import { getAllDartSets, setAllDartSets } from "../dartSetsStore";

function getAppVersion(): string {
  const v = (import.meta as any)?.env?.VITE_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v;
  return "unknown";
}

function sanitizeStoreLite(storeAny: any): Record<string, any> {
  if (!storeAny || typeof storeAny !== "object") return {};

  const lite: Record<string, any> = { ...storeAny };

  // Gros blocs / doublons à exclure du backup léger
  delete lite.history;
  delete lite.saved;
  delete lite.matches;
  delete lite.recentMatches;
  delete lite.stats;
  delete lite.profileStats;
  delete lite.statsByMode;
  delete lite.statsByPlayer;
  delete lite.dartSets;
  delete lite.profiles;
  delete lite.put;

  return lite;
}

export async function exportCloudBackupAsJson(): Promise<{
  backupJson: string;
  backupObj: any;
}> {
  const yieldToUi = async () => {
    try {
      await new Promise<void>((r) => setTimeout(r, 0));
    } catch {}
  };

  const stringifyInWorker = async (obj: any): Promise<string> => {
    return await new Promise<string>((resolve, reject) => {
      try {
        const workerCode = `self.onmessage = (e) => {\n  try {\n    const json = JSON.stringify(e.data);\n    self.postMessage({ ok: true, json });\n  } catch (err) {\n    const msg = (err && err.message) ? err.message : String(err);\n    self.postMessage({ ok: false, error: msg });\n  }\n};`;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const w = new Worker(url);
        const cleanup = () => {
          try { w.terminate(); } catch {}
          try { URL.revokeObjectURL(url); } catch {}
        };
        w.onmessage = (ev) => {
          const d: any = (ev as any)?.data;
          cleanup();
          if (d?.ok && typeof d.json === "string") resolve(d.json);
          else reject(new Error(d?.error || "Stringify failed"));
        };
        w.onerror = (err) => {
          cleanup();
          reject(err instanceof Error ? err : new Error("Worker error"));
        };
        w.postMessage(obj);
      } catch (e) {
        reject(e as any);
      }
    });
  };

  const maybeStripHugeDataUrl = (v: unknown) => {
    if (typeof v !== "string") return v;
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

  const [history, storeAny] = await Promise.all([
    History.list?.() ?? [],
    loadStore<any>().catch(() => null),
  ]);

  const localProfiles = ((storeAny?.profiles ?? []) as any[]).map(slimProfile);
  const dartsets = (((storeAny as any)?.dartSets ?? getAllDartSets()) as any[]).map(slimDartset);
  const storeLite = sanitizeStoreLite(storeAny);

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
    storeLite,
  });

  await yieldToUi();
  const needsWorkerStringify = (backup as any)?.history?.length > 500;
  const backupJson = needsWorkerStringify ? await stringifyInWorker(backup) : JSON.stringify(backup);
  return { backupJson, backupObj: backup };
}
