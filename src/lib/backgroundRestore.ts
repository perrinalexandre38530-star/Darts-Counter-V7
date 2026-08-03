import * as React from "react";

export type BackgroundRestoreStatus = "idle" | "running" | "success" | "error";
export type BackgroundRestorePhase = "download" | "prepare" | "import" | "rebuild" | "finalize";

export type BackgroundRestoreState = {
  id: string | null;
  status: BackgroundRestoreStatus;
  source: string;
  label: string;
  message: string;
  progress: number;
  phase: BackgroundRestorePhase | null;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
};

export type BackgroundRestoreReporter = (
  progress: number,
  message: string,
  phase?: BackgroundRestorePhase,
) => void;

const STORAGE_KEY = "dc_background_restore_job_v1";
const EVENT_NAME = "dc-background-restore-state";

const EMPTY_STATE: BackgroundRestoreState = {
  id: null,
  status: "idle",
  source: "",
  label: "",
  message: "",
  progress: 0,
  phase: null,
  startedAt: null,
  finishedAt: null,
  error: null,
};

function readPersistedState(): BackgroundRestoreState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<BackgroundRestoreState>;
    const startedAt = Number(parsed.startedAt || 0) || null;
    const staleRunning = parsed.status === "running" && (!startedAt || Date.now() - startedAt > 20 * 60_000);
    if (staleRunning) {
      return {
        ...EMPTY_STATE,
        id: String(parsed.id || "") || null,
        status: "error",
        source: String(parsed.source || ""),
        label: String(parsed.label || "Restauration"),
        message: "La restauration a été interrompue avant confirmation.",
        progress: Math.max(0, Math.min(99, Number(parsed.progress || 0))),
        phase: (parsed.phase || null) as BackgroundRestorePhase | null,
        startedAt,
        finishedAt: Date.now(),
        error: "Restauration interrompue",
      };
    }
    return {
      ...EMPTY_STATE,
      ...parsed,
      id: parsed.id ? String(parsed.id) : null,
      status: (["idle", "running", "success", "error"].includes(String(parsed.status)) ? parsed.status : "idle") as BackgroundRestoreStatus,
      progress: Math.max(0, Math.min(100, Number(parsed.progress || 0))),
      phase: (["download", "prepare", "import", "rebuild", "finalize"].includes(String(parsed.phase)) ? parsed.phase : null) as BackgroundRestorePhase | null,
      startedAt,
      finishedAt: Number(parsed.finishedAt || 0) || null,
      error: parsed.error ? String(parsed.error) : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

let currentState: BackgroundRestoreState = readPersistedState();
let currentJob: Promise<unknown> | null = null;
const listeners = new Set<() => void>();

function persistState(state: BackgroundRestoreState): void {
  if (typeof window === "undefined") return;
  try {
    if (state.status === "idle") window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function publish(next: BackgroundRestoreState): void {
  currentState = next;
  persistState(next);
  for (const listener of listeners) {
    try { listener(); } catch {}
  }
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next })); } catch {}
  }
}

export function getBackgroundRestoreState(): BackgroundRestoreState {
  return currentState;
}

export function subscribeBackgroundRestore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBackgroundRestoreState(): BackgroundRestoreState {
  return React.useSyncExternalStore(
    subscribeBackgroundRestore,
    getBackgroundRestoreState,
    () => EMPTY_STATE,
  );
}

export function isBackgroundRestoreRunning(): boolean {
  return currentState.status === "running" || currentJob !== null;
}

export function dismissBackgroundRestoreState(): void {
  if (currentState.status === "running") return;
  publish(EMPTY_STATE);
}

export function updateBackgroundRestore(
  progress: number,
  message: string,
  phase?: BackgroundRestorePhase,
): void {
  if (currentState.status !== "running") return;
  publish({
    ...currentState,
    progress: Math.max(currentState.progress, Math.min(99, Math.round(progress))),
    message: String(message || currentState.message || "Restauration en cours…"),
    phase: phase || currentState.phase,
  });
}

export function startBackgroundRestoreJob<T>(args: {
  source: string;
  label: string;
  run: (report: BackgroundRestoreReporter) => Promise<T>;
  successMessage?: (result: T) => string;
}): Promise<T> {
  if (currentJob || currentState.status === "running") {
    return Promise.reject(new Error("Une restauration est déjà en cours en arrière-plan."));
  }

  const id = `restore_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  publish({
    id,
    status: "running",
    source: String(args.source || ""),
    label: String(args.label || "Restauration"),
    message: "Préparation de la restauration…",
    progress: 2,
    phase: "prepare",
    startedAt: Date.now(),
    finishedAt: null,
    error: null,
  });

  const job = (async () => {
    try {
      const result = await args.run((progress, message, phase) => updateBackgroundRestore(progress, message, phase));
      const successMessage = args.successMessage
        ? args.successMessage(result)
        : "Restauration terminée.";
      publish({
        ...currentState,
        status: "success",
        message: successMessage,
        progress: 100,
        phase: "finalize",
        finishedAt: Date.now(),
        error: null,
      });
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent("dc-background-restore-finished", { detail: { ok: true, result, state: currentState } })); } catch {}
      }
      return result;
    } catch (error: any) {
      const message = String(error?.message || error || "Restauration impossible");
      publish({
        ...currentState,
        status: "error",
        message,
        progress: Math.max(1, Math.min(99, currentState.progress || 1)),
        finishedAt: Date.now(),
        error: message,
      });
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent("dc-background-restore-finished", { detail: { ok: false, error: message, state: currentState } })); } catch {}
      }
      throw error;
    } finally {
      currentJob = null;
    }
  })();

  currentJob = job;
  return job;
}
