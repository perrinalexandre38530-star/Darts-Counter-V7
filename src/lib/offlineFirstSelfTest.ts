import { loadStore } from "./storage";
import { History } from "./history";
import { loadStatsIndex } from "./stats/rebuildStatsFromHistory";
import { estimateBrowserStorage, formatStorageBytes } from "./storagePlans";
import {
  getOfflineFirstState,
  setOfflineFirstDiagnosticOnlineOverride,
  shouldAttemptRemoteWork,
} from "./offlineFirstRuntime";
import { getGlobalSyncState, requestGlobalSync } from "./sync/syncOrchestrator";
import { listUnsyncedIncrementalChanges } from "./incrementalBackupJournal";
import { readQueuedAccountProfileUpdate } from "./accountProfileOutbox";
import { trainingSyncQueueDebugState } from "../training/sync/trainingSyncQueue";

export type OfflineFirstSelfTestStatus = "ok" | "warn" | "fail" | "info";

export type OfflineFirstSelfTestCheck = {
  id: string;
  label: string;
  status: OfflineFirstSelfTestStatus;
  detail: string;
  durationMs?: number;
};

export type OfflineFirstSelfTestReport = {
  version: 1;
  generatedAt: string;
  verdict: "PASS" | "WARN" | "FAIL";
  durationMs: number;
  checks: OfflineFirstSelfTestCheck[];
  baseline: {
    profiles: number;
    history: number;
    finished: number;
    statsMatches: number;
    userId: string | null;
  };
};

const REPORT_KEY = "msc_offline_first_selftest_v1";
const TEST_DB = "msc-offline-first-selftest-v1";
const TEST_STORE = "probe";

function nowMs(): number {
  try { return performance.now(); } catch { return Date.now(); }
}

function elapsed(start: number): number {
  return Math.max(0, Math.round((nowMs() - start) * 10) / 10);
}

function inferFinished(row: any): boolean {
  const status = String(row?.status || row?.state || row?.payload?.status || "").toLowerCase();
  if (status === "finished" || status === "completed" || status === "complete") return true;
  return !!(row?.finishedAt || row?.endedAt || row?.completedAt || row?.payload?.finishedAt);
}

function knownUserId(): string | null {
  try {
    const value = String(
      localStorage.getItem("dc_user_id") ||
      (window as any).__dc_primary_auth_user_id ||
      (window as any).__dc_last_signed_in_user_id ||
      "",
    ).trim();
    return value || null;
  } catch { return null; }
}

async function idbRoundTrip(): Promise<{ ok: boolean; detail: string }> {
  if (typeof indexedDB === "undefined") return { ok: false, detail: "IndexedDB indisponible sur ce runtime." };
  const token = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(TEST_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(TEST_STORE)) req.result.createObjectStore(TEST_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("open_idb_failed"));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TEST_STORE, "readwrite");
      tx.objectStore(TEST_STORE).put({ token, at: Date.now() }, "roundtrip");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("write_idb_failed"));
      tx.onabort = () => reject(tx.error || new Error("write_idb_aborted"));
    });
    const value = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(TEST_STORE, "readonly");
      const req = tx.objectStore(TEST_STORE).get("roundtrip");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("read_idb_failed"));
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(TEST_STORE, "readwrite");
      tx.objectStore(TEST_STORE).delete("roundtrip");
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    return value?.token === token
      ? { ok: true, detail: "Écriture → lecture → suppression réussies dans la base de test isolée." }
      : { ok: false, detail: "La valeur relue ne correspond pas à la valeur écrite." };
  } finally {
    try { db.close(); } catch {}
  }
}

async function runCheck(
  checks: OfflineFirstSelfTestCheck[],
  id: string,
  label: string,
  run: () => Promise<{ status?: OfflineFirstSelfTestStatus; detail: string }> | { status?: OfflineFirstSelfTestStatus; detail: string },
): Promise<void> {
  const started = nowMs();
  try {
    const result = await run();
    checks.push({ id, label, status: result.status || "ok", detail: result.detail, durationMs: elapsed(started) });
  } catch (error: any) {
    checks.push({ id, label, status: "fail", detail: String(error?.message || error || "Erreur inconnue"), durationMs: elapsed(started) });
  }
}

export function readOfflineFirstSelfTestReport(): OfflineFirstSelfTestReport | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.version === 1 ? parsed as OfflineFirstSelfTestReport : null;
  } catch { return null; }
}

export async function runOfflineFirstSelfTest(): Promise<OfflineFirstSelfTestReport> {
  const totalStarted = nowMs();
  const checks: OfflineFirstSelfTestCheck[] = [];
  const baseline = { profiles: 0, history: 0, finished: 0, statsMatches: 0, userId: knownUserId() };
  let realOnline = true;
  try { realOnline = navigator.onLine !== false; } catch {}

  try {
    await runCheck(checks, "runtime", "Runtime Offline-First", async () => {
      const state = getOfflineFirstState();
      return { detail: `Runtime actif · état réel ${state.connectivity.toUpperCase()} · stockage persistant ${state.persistentStorage === true ? "oui" : state.persistentStorage === false ? "non garanti" : "inconnu"}.` };
    });

    await runCheck(checks, "storage", "IndexedDB local", async () => {
      const probe = await idbRoundTrip();
      return { status: probe.ok ? "ok" : "fail", detail: probe.detail };
    });

    await runCheck(checks, "quota", "Quota stockage local", async () => {
      const storage = await estimateBrowserStorage();
      const percent = storage.quota > 0 ? (storage.usage / storage.quota) * 100 : 0;
      const status: OfflineFirstSelfTestStatus = percent >= 95 ? "fail" : percent >= 85 ? "warn" : "ok";
      return { status, detail: `${formatStorageBytes(storage.usage)} utilisés · ${formatStorageBytes(storage.free)} libres${storage.quota ? ` · ${percent.toFixed(1)}%` : ""}.` };
    });

    await runCheck(checks, "local-data", "Profils / Historique / Stats locaux", async () => {
      const [store, history, stats] = await Promise.all([
        loadStore<any>().catch(() => null),
        History.list().catch(() => [] as any[]),
        loadStatsIndex().catch(() => null),
      ]);
      baseline.profiles = Array.isArray(store?.profiles) ? store.profiles.length : 0;
      baseline.history = Array.isArray(history) ? history.length : 0;
      baseline.finished = Array.isArray(history) ? history.filter(inferFinished).length : 0;
      baseline.statsMatches = Number((stats as any)?.totals?.matches || 0) || 0;
      const active = String(store?.activeProfileId || "").trim();
      const activeValid = !active || !baseline.profiles || store?.profiles?.some((p: any) => String(p?.id || "") === active);
      return {
        status: activeValid ? "ok" : "fail",
        detail: `${baseline.profiles} profil(s) · ${baseline.history} partie(s), dont ${baseline.finished} terminée(s) · index stats ${baseline.statsMatches} match(s)${active ? ` · profil actif ${activeValid ? "valide" : "INTROUVABLE"}` : ""}.`,
      };
    });

    await runCheck(checks, "identity", "Identité locale", async () => ({
      status: baseline.userId ? "ok" : "info",
      detail: baseline.userId ? `Identité locale stable disponible (${baseline.userId.slice(0, 8)}…).` : "Aucun compte Online mémorisé : fonctionnement local anonyme/profil local autorisé.",
    }));

    await runCheck(checks, "offline-gate", "Simulation hors ligne", async () => {
      setOfflineFirstDiagnosticOnlineOverride(false);
      const blocked = shouldAttemptRemoteWork() === false;
      requestGlobalSync("offline-selftest", { delayMs: 0, bypassBackoff: true });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const sync = getGlobalSyncState();
      return {
        status: blocked && sync.status === "offline" ? "ok" : "fail",
        detail: blocked
          ? `Réseau logique coupé · orchestrateur ${sync.status}. Aucune sync distante ne doit partir.`
          : "Le garde-fou distant est resté ouvert pendant la simulation.",
      };
    });

    await runCheck(checks, "offline-read", "Lecture complète hors ligne simulée", async () => {
      const [store, history, stats] = await Promise.all([
        loadStore<any>().catch(() => null),
        History.list().catch(() => [] as any[]),
        loadStatsIndex().catch(() => null),
      ]);
      const profiles = Array.isArray(store?.profiles) ? store.profiles.length : 0;
      const rows = Array.isArray(history) ? history.length : 0;
      const statsMatches = Number((stats as any)?.totals?.matches || 0) || 0;
      const stable = profiles === baseline.profiles && rows === baseline.history && statsMatches === baseline.statsMatches;
      return {
        status: stable ? "ok" : "fail",
        detail: stable
          ? `Données identiques hors ligne : ${profiles} profil(s), ${rows} partie(s), ${statsMatches} match(s) dans l’index stats.`
          : `Écart détecté : profils ${baseline.profiles}→${profiles}, historique ${baseline.history}→${rows}, stats ${baseline.statsMatches}→${statsMatches}.`,
      };
    });

    await runCheck(checks, "queues", "Files persistantes de synchronisation", async () => {
      const providers = ["founder_nas", "google_drive", "cloud_r2", "onedrive", "dropbox"];
      const pending: Record<string, number> = {};
      for (const provider of providers) {
        pending[provider] = (await listUnsyncedIncrementalChanges(provider).catch(() => [])).length;
      }
      const accountPending = baseline.userId ? !!readQueuedAccountProfileUpdate(baseline.userId) : false;
      const training = trainingSyncQueueDebugState();
      const total = Object.values(pending).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
      return {
        status: "ok",
        detail: `${total} delta(s) provider en attente · profil compte ${accountPending ? "en attente" : "propre"} · Training tentatives ${Number(training?.attempts || 0)}. Les files restent locales pendant la coupure.`,
      };
    });

    await runCheck(checks, "service-worker", "Shell / Service Worker", async () => {
      if (!("serviceWorker" in navigator)) return { status: "info", detail: "Service Worker non applicable sur ce runtime natif/navigateur." };
      const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      const controller = navigator.serviceWorker.controller;
      let marker: any = null;
      try {
        const response = typeof caches !== "undefined" ? await caches.match("/__mss_offline_ready__") : null;
        marker = response ? await response.json().catch(() => null) : null;
      } catch {}
      const manifestAssets = Number(marker?.manifestAssets || 0);
      const coreAssets = Number(marker?.coreAssets || 0);
      const failedCodeAssets = Array.isArray(marker?.failedCodeAssets) ? marker.failedCodeAssets.length : Number(marker?.failedAssets || 0);
      const coreReady = marker?.coreReady === true || marker?.ready === true;
      const fullReady = marker?.fullReady === true;
      if (controller && coreReady && coreAssets > 0) {
        return {
          status: fullReady ? "ok" : "warn",
          detail: fullReady
            ? `Service Worker contrôleur actif · shell critique ${coreAssets} chunk(s) · application complète ${manifestAssets} chunk(s) OFFLINE READY.`
            : `Service Worker contrôleur actif · shell critique OFFLINE READY (${coreAssets} chunk(s)). Pré-cache complet encore en cours/partiel : ${manifestAssets} chunk(s), ${failedCodeAssets} échec(s).`,
        };
      }
      if (registration || controller) {
        return { status: "warn", detail: `Service Worker présent mais shell critique incomplet : contrôleur ${controller ? "oui" : "non"}, core ${coreAssets}, manifest ${manifestAssets}, échecs ${failedCodeAssets}.` };
      }
      return { status: "warn", detail: "Aucun Service Worker actif sur cette session. Sur PWA/web, le mode hors ligne ne peut pas démarrer tant qu’une session en ligne n’a pas installé le shell." };
    });
  } finally {
    setOfflineFirstDiagnosticOnlineOverride(null);
  }

  await runCheck(checks, "restore-network", "Retour au réseau logique réel", async () => {
    const expected = realOnline;
    const actual = shouldAttemptRemoteWork();
    return {
      status: actual === expected ? "ok" : "fail",
      detail: `État restauré : ${actual ? "ONLINE" : "OFFLINE"}${actual === expected ? "" : " · incohérent avec navigator.onLine"}.`,
    };
  });

  const failed = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  const report: OfflineFirstSelfTestReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    verdict: failed ? "FAIL" : warned ? "WARN" : "PASS",
    durationMs: elapsed(totalStarted),
    checks,
    baseline,
  };
  try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); } catch {}
  return report;
}
