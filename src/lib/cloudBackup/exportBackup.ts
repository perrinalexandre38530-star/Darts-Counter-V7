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

function maybeStripHugeDataUrl(v: unknown) {
  if (typeof v !== "string") return v;
  return v.length > 120_000 ? "" : v;
}

function slimProfile(p: any) {
  if (!p || typeof p !== "object") return p;
  const next = { ...p } as any;

  if (typeof next.avatarDataUrl === "string") {
    next.avatarDataUrl = maybeStripHugeDataUrl(next.avatarDataUrl);
  }
  if (typeof next.avatar === "string") {
    next.avatar = maybeStripHugeDataUrl(next.avatar);
  }

  return next;
}

function slimDartset(d: any) {
  if (!d || typeof d !== "object") return d;
  const next = { ...d } as any;

  if (typeof next.imageDataUrl === "string") {
    next.imageDataUrl = maybeStripHugeDataUrl(next.imageDataUrl);
  }
  if (typeof next.photoDataUrl === "string") {
    next.photoDataUrl = maybeStripHugeDataUrl(next.photoDataUrl);
  }

  return next;
}

async function yieldToUi() {
  try {
    await new Promise<void>((r) => setTimeout(r, 0));
  } catch {}
}

async function stringifyInWorker(obj: any): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    try {
      const workerCode = `self.onmessage = (e) => {
  try {
    const json = JSON.stringify(e.data);
    self.postMessage({ ok: true, json });
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    self.postMessage({ ok: false, error: msg });
  }
};`;
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
}

export async function exportCloudBackupAsJson(): Promise<{
  backupJson: string;
  backupObj: any;
}> {
  const [history, storeAny] = await Promise.all([
    History.list?.() ?? [],
    loadStore<any>().catch(() => null),
  ]);

  const localProfiles = ((storeAny?.profiles ?? []) as any[]).map(slimProfile);

  const rawDartsets = Array.isArray((storeAny as any)?.dartSets)
    ? (storeAny as any).dartSets
    : getAllDartSets();

  const dartsets = (Array.isArray(rawDartsets) ? rawDartsets : []).map(slimDartset);

  try {
    if (Array.isArray((storeAny as any)?.dartSets)) {
      setAllDartSets((storeAny as any).dartSets);
    }
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

  await yieldToUi();

  const needsWorkerStringify = Array.isArray((backup as any)?.history)
    && (backup as any).history.length > 1500;

  const backupJson = needsWorkerStringify
    ? await stringifyInWorker(backup)
    : JSON.stringify(backup);

  return { backupJson, backupObj: backup };
}
