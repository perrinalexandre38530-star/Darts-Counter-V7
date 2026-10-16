export type ClosestCenterDiagnosticLevel = "info" | "ok" | "warn" | "reject";
export type ClosestCenterDiagnosticStage = "baseline" | "preflight" | "analysis" | "reread" | "validation" | "round";

export type ClosestCenterDiagnosticEntry = {
  id: string;
  at: number;
  sessionId: string;
  round: number;
  playerId?: string | null;
  playerName?: string | null;
  stage: ClosestCenterDiagnosticStage;
  level: ClosestCenterDiagnosticLevel;
  code: string;
  message: string;
  metrics?: Record<string, number | string | boolean | null | undefined>;
};

const KEY = "dc_closest_center_camera_diagnostics_v1";
const LIMIT = 160;

function safeParse(raw: string | null): ClosestCenterDiagnosticEntry[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(Boolean).slice(-LIMIT) : [];
  } catch {
    return [];
  }
}

export function loadClosestCenterDiagnostics(): ClosestCenterDiagnosticEntry[] {
  try { return safeParse(window.localStorage.getItem(KEY)); } catch { return []; }
}

export function appendClosestCenterDiagnostic(entry: Omit<ClosestCenterDiagnosticEntry, "id" | "at"> & Partial<Pick<ClosestCenterDiagnosticEntry, "id" | "at">>) {
  const normalized: ClosestCenterDiagnosticEntry = {
    ...entry,
    id: entry.id || `ccdiag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at || Date.now(),
  };
  try {
    const next = [...loadClosestCenterDiagnostics(), normalized].slice(-LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dc:closest-center-diagnostic", { detail: normalized }));
  } catch {}
  return normalized;
}

export function clearClosestCenterDiagnostics() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("dc:closest-center-diagnostics-cleared"));
  } catch {}
}

export function summarizeClosestCenterDiagnostics(entries: ClosestCenterDiagnosticEntry[]) {
  const list = entries || [];
  const rejected = list.filter(x => x.level === "reject").length;
  const warnings = list.filter(x => x.level === "warn").length;
  const rereads = list.filter(x => x.stage === "reread" && (x.level === "ok" || x.level === "warn")).length;
  const accepted = list.filter(x => x.stage === "validation" && x.level === "ok").length;
  return { total: list.length, rejected, warnings, rereads, accepted };
}
