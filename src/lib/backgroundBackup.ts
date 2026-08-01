import * as React from "react";

export type BackgroundBackupStatus = "idle" | "running" | "success" | "error";

export type BackgroundBackupState = {
  id: string | null;
  status: BackgroundBackupStatus;
  destination: string;
  label: string;
  message: string;
  progress: number;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
};

export type BackgroundBackupReporter = (progress: number, message: string) => void;

const STORAGE_KEY = "dc_background_backup_job_v1";
const EVENT_NAME = "dc-background-backup-state";

const EMPTY_STATE: BackgroundBackupState = {
  id: null,
  status: "idle",
  destination: "",
  label: "",
  message: "",
  progress: 0,
  startedAt: null,
  finishedAt: null,
  error: null,
};

function readPersistedState(): BackgroundBackupState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<BackgroundBackupState>;
    const startedAt = Number(parsed.startedAt || 0) || null;
    const staleRunning = parsed.status === "running" && (!startedAt || Date.now() - startedAt > 20 * 60_000);
    if (staleRunning) {
      return {
        ...EMPTY_STATE,
        id: String(parsed.id || "") || null,
        status: "error",
        destination: String(parsed.destination || ""),
        label: String(parsed.label || "Sauvegarde"),
        message: "La sauvegarde a été interrompue avant confirmation.",
        progress: Math.max(0, Math.min(99, Number(parsed.progress || 0))),
        startedAt,
        finishedAt: Date.now(),
        error: "Sauvegarde interrompue",
      };
    }
    return {
      ...EMPTY_STATE,
      ...parsed,
      id: parsed.id ? String(parsed.id) : null,
      status: (["idle", "running", "success", "error"].includes(String(parsed.status)) ? parsed.status : "idle") as BackgroundBackupStatus,
      progress: Math.max(0, Math.min(100, Number(parsed.progress || 0))),
      startedAt,
      finishedAt: Number(parsed.finishedAt || 0) || null,
      error: parsed.error ? String(parsed.error) : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

let currentState: BackgroundBackupState = readPersistedState();
let currentJob: Promise<unknown> | null = null;
const listeners = new Set<() => void>();

function persistState(state: BackgroundBackupState): void {
  if (typeof window === "undefined") return;
  try {
    if (state.status === "idle") window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function publish(next: BackgroundBackupState): void {
  currentState = next;
  persistState(next);
  for (const listener of listeners) {
    try { listener(); } catch {}
  }
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next })); } catch {}
  }
}

export function getBackgroundBackupState(): BackgroundBackupState {
  return currentState;
}

export function subscribeBackgroundBackup(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBackgroundBackupState(): BackgroundBackupState {
  return React.useSyncExternalStore(
    subscribeBackgroundBackup,
    getBackgroundBackupState,
    () => EMPTY_STATE,
  );
}

export function isBackgroundBackupRunning(): boolean {
  return currentState.status === "running" || currentJob !== null;
}

export function dismissBackgroundBackupState(): void {
  if (currentState.status === "running") return;
  publish(EMPTY_STATE);
}

export function updateBackgroundBackup(progress: number, message: string): void {
  if (currentState.status !== "running") return;
  publish({
    ...currentState,
    progress: Math.max(currentState.progress, Math.min(99, Math.round(progress))),
    message: String(message || currentState.message || "Sauvegarde en cours…"),
  });
}

export function startBackgroundBackupJob<T>(args: {
  destination: string;
  label: string;
  run: (report: BackgroundBackupReporter) => Promise<T>;
  successMessage?: (result: T) => string;
}): Promise<T> {
  if (currentJob || currentState.status === "running") {
    return Promise.reject(new Error("Une sauvegarde est déjà en cours en arrière-plan."));
  }

  const id = `backup_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const startedAt = Date.now();
  publish({
    id,
    status: "running",
    destination: String(args.destination || ""),
    label: String(args.label || "Sauvegarde"),
    message: "Préparation de la sauvegarde…",
    progress: 2,
    startedAt,
    finishedAt: null,
    error: null,
  });

  const job = (async () => {
    try {
      const result = await args.run((progress, message) => updateBackgroundBackup(progress, message));
      const successMessage = args.successMessage
        ? args.successMessage(result)
        : "Sauvegarde terminée.";
      publish({
        ...currentState,
        status: "success",
        message: successMessage,
        progress: 100,
        finishedAt: Date.now(),
        error: null,
      });
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent("dc-background-backup-finished", { detail: { ok: true, result, state: currentState } })); } catch {}
      }
      return result;
    } catch (error: any) {
      const message = String(error?.message || error || "Sauvegarde impossible");
      publish({
        ...currentState,
        status: "error",
        message,
        progress: Math.max(1, Math.min(99, currentState.progress || 1)),
        finishedAt: Date.now(),
        error: message,
      });
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent("dc-background-backup-finished", { detail: { ok: false, error: message, state: currentState } })); } catch {}
      }
      throw error;
    } finally {
      currentJob = null;
    }
  })();

  currentJob = job;
  return job;
}
