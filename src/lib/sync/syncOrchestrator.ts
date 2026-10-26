// ============================================================
// src/lib/sync/syncOrchestrator.ts
// OFFLINE-FIRST WAVE 6 — coordinateur unique de synchronisation.
//
// Principes :
// - aucune requête distante si navigator.onLine === false ;
// - une seule passe de sync à la fois ;
// - chaque file reste persistante et idempotente dans son propre store ;
// - les erreurs d'un provider n'empêchent pas les autres files d'avancer ;
// - backoff persistant, remis à zéro dès un vrai retour `online` ;
// - le gameplay n'attend JAMAIS ce coordinateur.
// ============================================================

import { initOfflineFirstRuntime, shouldAttemptRemoteWork } from "../offlineFirstRuntime";

export const GLOBAL_SYNC_REQUEST_EVENT = "msc:sync-request";
export const GLOBAL_SYNC_STATE_EVENT = "msc:sync-orchestrator-state";
const ACCOUNT_OWNED_SYNC_CYCLE_EVENT = "msc:account-owned-sync-cycle";
const STATE_KEY = "msc_sync_orchestrator_v1";

export type GlobalSyncState = {
  version: 1;
  status: "idle" | "scheduled" | "running" | "offline" | "backoff";
  lastReason?: string | null;
  lastRunAt?: number;
  lastSuccessAt?: number;
  lastErrorAt?: number;
  nextAttemptAt?: number;
  consecutiveFailures: number;
  runId?: string | null;
  steps?: Record<string, { ok: boolean; skipped?: boolean; detail?: any; error?: string | null }>;
  stepBackoff?: Record<string, { failures: number; nextAttemptAt: number; lastError?: string | null }>;
};

type RequestOptions = {
  delayMs?: number;
  includeAccountHistory?: boolean;
  bypassBackoff?: boolean;
};

const BACKOFF_MS = [2_000, 5_000, 10_000, 20_000, 40_000, 60_000];
let started = false;
let timer: number | null = null;
let inFlight: Promise<void> | null = null;
let rerunRequested = false;
let pendingReasons = new Set<string>();
let pendingIncludeAccountHistory = false;
let heartbeatTimer: number | null = null;
let state: GlobalSyncState = loadState();

function loadState(): GlobalSyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.version === 1) {
      return {
        version: 1,
        status: parsed.status || "idle",
        consecutiveFailures: Math.max(0, Number(parsed.consecutiveFailures || 0) || 0),
        lastReason: parsed.lastReason || null,
        lastRunAt: Number(parsed.lastRunAt || 0) || undefined,
        lastSuccessAt: Number(parsed.lastSuccessAt || 0) || undefined,
        lastErrorAt: Number(parsed.lastErrorAt || 0) || undefined,
        nextAttemptAt: Number(parsed.nextAttemptAt || 0) || undefined,
        runId: parsed.runId || null,
        steps: parsed.steps && typeof parsed.steps === "object" ? parsed.steps : undefined,
        stepBackoff: parsed.stepBackoff && typeof parsed.stepBackoff === "object" ? parsed.stepBackoff : undefined,
      };
    }
  } catch {}
  return { version: 1, status: "idle", consecutiveFailures: 0 };
}

function publish(patch: Partial<GlobalSyncState>): void {
  state = { ...state, ...patch, version: 1 };
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
  try {
    document.documentElement.dataset.mscSyncState = state.status;
    window.dispatchEvent(new CustomEvent(GLOBAL_SYNC_STATE_EVENT, { detail: { ...state } }));
  } catch {}
}

function resolveUserId(): string {
  try {
    const direct = String(localStorage.getItem("dc_user_id") || "").trim();
    if (direct) return direct;
    const raw = localStorage.getItem("dc_online_auth_supabase_v1");
    const cached = raw ? JSON.parse(raw) : null;
    return String(cached?.supabaseUserId || cached?.user?.id || cached?.userId || "").trim();
  } catch {
    return "";
  }
}

function makeRunId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}

function backoffForFailures(failures: number): number {
  return BACKOFF_MS[Math.min(Math.max(0, failures - 1), BACKOFF_MS.length - 1)];
}

function scheduleAt(timestamp: number): void {
  if (typeof window === "undefined") return;
  if (timer != null) window.clearTimeout(timer);
  const delay = Math.max(250, timestamp - Date.now());
  timer = window.setTimeout(() => {
    timer = null;
    void runGlobalSync();
  }, delay);
}

async function runStep(
  name: string,
  fn: () => Promise<any>,
  steps: NonNullable<GlobalSyncState["steps"]>,
  stepBackoff: NonNullable<GlobalSyncState["stepBackoff"]>,
  bypassBackoff = false,
): Promise<void> {
  const existing = stepBackoff[name];
  if (!bypassBackoff && existing && Number(existing.nextAttemptAt || 0) > Date.now()) {
    steps[name] = { ok: true, skipped: true, detail: { backoffUntil: existing.nextAttemptAt } };
    return;
  }
  try {
    const detail = await fn();
    delete stepBackoff[name];
    steps[name] = { ok: true, detail: detail ?? null };
  } catch (error: any) {
    const message = String(error?.message || error || "sync_failed");
    const failures = Math.min(20, Number(existing?.failures || 0) + 1);
    stepBackoff[name] = {
      failures,
      nextAttemptAt: Date.now() + backoffForFailures(failures),
      lastError: message,
    };
    steps[name] = { ok: false, error: message };
  }
}

async function runGlobalSync(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!shouldAttemptRemoteWork()) {
    publish({ status: "offline", nextAttemptAt: undefined });
    return;
  }

  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }

  const now = Date.now();

  const reasons = Array.from(pendingReasons);
  pendingReasons.clear();
  const reason = reasons.join(",") || "scheduled";
  const includeAccountHistory = pendingIncludeAccountHistory;
  pendingIncludeAccountHistory = false;
  const runId = makeRunId();
  const steps: NonNullable<GlobalSyncState["steps"]> = {};
  const stepBackoff: NonNullable<GlobalSyncState["stepBackoff"]> = { ...(state.stepBackoff || {}) };
  const bypassStepBackoff = reason.split(",").includes("online");

  publish({ status: "running", runId, lastReason: reason, lastRunAt: now, steps, stepBackoff, nextAttemptAt: undefined });

  inFlight = (async () => {
    const userId = resolveUserId();

    // 1) MON PROFIL : la petite outbox passe avant les lectures distantes.
    if (userId) {
      await runStep("account-profile", async () => {
        const [{ onlineApi }, outbox] = await Promise.all([
          import("../onlineApi"),
          import("../accountProfileOutbox"),
        ]);
        const before = outbox.readQueuedAccountProfileUpdate(userId);
        if (!before) return { pending: 0 };
        await (onlineApi as any).flushQueuedAccountProfileUpdate?.(userId);
        const after = outbox.readQueuedAccountProfileUpdate(userId);
        if (after) throw new Error(after.lastError || "account_profile_outbox_pending");
        return { pending: 0, flushed: 1 };
      }, steps, stepBackoff, bypassStepBackoff);
    } else {
      steps["account-profile"] = { ok: true, skipped: true, detail: "no-user" };
    }

    // 2) Données privées du compte. Le sous-système garde ses révisions et ses
    // upserts idempotents ; l'orchestrateur ne fait que demander UNE passe.
    try {
      window.dispatchEvent(new CustomEvent(ACCOUNT_OWNED_SYNC_CYCLE_EVENT, {
        detail: { userId: userId || null, reason, includeHistory: includeAccountHistory, runId },
      }));
      steps["account-owned"] = { ok: true, detail: { requested: true, includeHistory: includeAccountHistory } };
    } catch (error: any) {
      steps["account-owned"] = { ok: false, error: String(error?.message || error) };
    }

    // 3) Training : la queue conserve les mêmes IDs. Les doublons distants sont
    // considérés comme confirmés par le moteur W6.
    if (userId) {
      await runStep("training", async () => {
        const queue = await import("../../training/sync/trainingSyncQueue");
        // Un vrai reconnect annule le délai dû à l'ancienne coupure. Les autres
        // cycles respectent le backoff persistant de la queue Training.
        if (reason.split(",").includes("online")) queue.trainingSyncQueueEnqueueSoon();
        await queue.trainingSyncQueueTry(userId);
        const debug = queue.trainingSyncQueueDebugState();
        if (debug.attempts > 0 && Number(debug.nextAttemptAt || 0) > Date.now()) {
          throw new Error(debug.lastError || "training_sync_pending");
        }
        return { attempts: debug.attempts || 0, nextAttemptAt: debug.nextAttemptAt || 0 };
      }, steps, stepBackoff, bypassStepBackoff);
    } else {
      steps.training = { ok: true, skipped: true, detail: "no-user" };
    }

    // 4) Journal incrémental Drive/NAS/R2/OneDrive/Dropbox.
    await runStep("incremental-backup", async () => {
      const { flushIncrementalRemoteSync } = await import("../incrementalRemoteSync");
      const result = await flushIncrementalRemoteSync();
      if (result?.error) throw new Error(result.error);
      return result;
    }, steps, stepBackoff, bypassStepBackoff);

    // 5) Checkpoint complet / compaction. Le journal incrémental ne doit jamais
    // grossir indéfiniment et un premier checkpoint doit finir par exister même
    // si seules des préférences/profils ont changé. Le helper refuse lui-même
    // tout travail lourd au premier plan sur mobile.
    await runStep("checkpoint", async () => {
      const backup = await import("../matchAutoBackup");
      return backup.createSelectedDestinationCheckpointIfDue(reason || "sync-orchestrator");
    }, steps, stepBackoff, bypassStepBackoff);

    // 6) Ancien EventBuffer : uniquement si explicitement activé par env.
    await runStep("legacy-events", async () => {
      const policy = await import("./cloudEventSyncPolicy");
      if (!policy.isSupabaseEventSyncEnabled()) return { disabled: true };
      const { EventBuffer } = await import("./EventBuffer");
      await EventBuffer.syncNow({ limit: 500 });
      return { enabled: true };
    }, steps, stepBackoff, bypassStepBackoff);

    const failures = Object.entries(steps).filter(([, result]) => result.ok === false);
    const retryTimes = Object.values(stepBackoff)
      .map((entry) => Number(entry?.nextAttemptAt || 0))
      .filter((value) => value > Date.now());
    const retryAt = retryTimes.length ? Math.min(...retryTimes) : undefined;

    if (failures.length || retryAt) {
      publish({
        status: retryAt ? "backoff" : "idle",
        runId: null,
        steps,
        stepBackoff,
        consecutiveFailures: Object.values(stepBackoff).reduce((sum, entry) => sum + Number(entry?.failures || 0), 0),
        ...(failures.length ? { lastErrorAt: Date.now() } : {}),
        nextAttemptAt: retryAt,
      });
      if (retryAt) scheduleAt(retryAt);
      return;
    }

    publish({
      status: "idle",
      runId: null,
      steps,
      stepBackoff: {},
      consecutiveFailures: 0,
      lastSuccessAt: Date.now(),
      nextAttemptAt: undefined,
    });
  })().finally(() => {
    inFlight = null;
    if (rerunRequested) {
      rerunRequested = false;
      requestGlobalSync("rerun", { delayMs: 450 });
    }
  });

  await inFlight;
}

export function requestGlobalSync(reason = "manual", options: RequestOptions = {}): void {
  if (typeof window === "undefined") return;
  initGlobalSyncOrchestrator();
  pendingReasons.add(String(reason || "manual"));
  if (options.includeAccountHistory) pendingIncludeAccountHistory = true;

  if (!shouldAttemptRemoteWork()) {
    publish({ status: "offline", lastReason: reason, nextAttemptAt: undefined });
    return;
  }

  if (options.bypassBackoff) {
    publish({ nextAttemptAt: undefined, consecutiveFailures: 0, stepBackoff: {} });
  }

  const requestedAt = Date.now() + Math.max(0, Number(options.delayMs ?? 700));
  // W6 : un provider en backoff ne doit jamais retarder une autre queue.
  // La passe démarre à l'heure demandée et runStep saute seulement les étapes
  // encore refroidies.
  publish({ status: requestedAt > Date.now() + 50 ? "scheduled" : "idle", lastReason: reason });
  scheduleAt(requestedAt);
}

export function getGlobalSyncState(): GlobalSyncState {
  return { ...state, steps: state.steps ? { ...state.steps } : undefined };
}

export function initGlobalSyncOrchestrator(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  initOfflineFirstRuntime();

  const onOnline = () => {
    publish({ status: "idle", nextAttemptAt: undefined, consecutiveFailures: 0, stepBackoff: {} });
    requestGlobalSync("online", { delayMs: 350, includeAccountHistory: true, bypassBackoff: true });
  };
  const onOffline = () => {
    if (timer != null) window.clearTimeout(timer);
    timer = null;
    publish({ status: "offline", nextAttemptAt: undefined });
  };
  const onFocus = () => {
    if (document.visibilityState !== "hidden") requestGlobalSync("focus", { delayMs: 1_000 });
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      requestGlobalSync("visible", { delayMs: 1_100 });
      return;
    }
    // WAVE 7: hidden/background is the safest window for full checkpoints and
    // journal compaction on mobile. Run immediately before the OS suspends us.
    if (document.visibilityState === "hidden") requestGlobalSync("hidden-checkpoint", { delayMs: 0 });
  };
  const onRequest = (event: Event) => {
    const detail: any = (event as CustomEvent)?.detail || {};
    requestGlobalSync(String(detail.reason || "external"), {
      delayMs: Number(detail.delayMs ?? 650),
      includeAccountHistory: detail.includeAccountHistory === true,
      bypassBackoff: detail.bypassBackoff === true,
    });
  };

  window.addEventListener("online", onOnline, { passive: true });
  window.addEventListener("offline", onOffline, { passive: true });
  window.addEventListener("focus", onFocus, { passive: true });
  window.addEventListener(GLOBAL_SYNC_REQUEST_EVENT, onRequest as EventListener);
  document.addEventListener("visibilitychange", onVisible, { passive: true });

  const localTriggers: Array<[string, number]> = [
    ["dc:incremental-backup-change", 1_000],
    ["dc:account-profile-outbox-changed", 450],
    ["msc:local-match-committed", 900],
    ["dc-events-buffer-updated", 900],
    ["dc-training-stats-updated", 900],
    ["dc:training-sync-queued", 650],
  ];
  for (const [eventName, delayMs] of localTriggers) {
    window.addEventListener(eventName, (() => requestGlobalSync(eventName, { delayMs })) as EventListener, { passive: true });
  }

  // Filet de sécurité : aucune queue ne doit rester bloquée simplement parce
  // qu'un événement navigateur a été perdu. Visible + online uniquement.
  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState === "visible" && shouldAttemptRemoteWork()) {
      requestGlobalSync("heartbeat", { delayMs: 300 });
    }
  }, 120_000);

  if (shouldAttemptRemoteWork()) requestGlobalSync("boot", { delayMs: 2_500 });
  else publish({ status: "offline" });
}
