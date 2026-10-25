export type BackupPerfOperation = "backup" | "restore" | "store" | "network" | "media" | "stats";

export type BackupPerfEvent = {
  id: string;
  operationId: string;
  operation: BackupPerfOperation;
  phase: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  ok: boolean;
  bytes?: number;
  count?: number;
  detail?: string;
  meta?: Record<string, any>;
};

const KEY = "dc_backup_performance_events_v1";
const MAX_EVENTS = 120;

function nowMs(): number {
  try { return typeof performance !== "undefined" ? performance.now() : Date.now(); }
  catch { return Date.now(); }
}

function readAll(): BackupPerfEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch { return []; }
}

function writeAll(events: BackupPerfEvent[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS))); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-backup-perf-updated")); } catch {}
}

export function recordBackupPerfEvent(event: Omit<BackupPerfEvent, "id">): BackupPerfEvent {
  const row: BackupPerfEvent = {
    ...event,
    id: `${event.operationId}:${event.phase}:${Math.round(event.endedAt)}:${Math.random().toString(36).slice(2, 7)}`,
    durationMs: Math.max(0, Math.round(Number(event.durationMs || 0))),
  };
  const rows = readAll();
  rows.push(row);
  writeAll(rows);
  return row;
}

export function beginBackupPerfStep(
  operation: BackupPerfOperation,
  phase: string,
  options?: { operationId?: string; meta?: Record<string, any> },
): (result?: { ok?: boolean; bytes?: number; count?: number; detail?: string; meta?: Record<string, any> }) => BackupPerfEvent {
  const startedPerf = nowMs();
  const startedAt = Date.now();
  const operationId = options?.operationId || `${operation}:${startedAt}:${Math.random().toString(36).slice(2, 7)}`;
  let done = false;
  return (result = {}) => {
    if (done) {
      return {
        id: `${operationId}:${phase}:duplicate`, operationId, operation, phase,
        startedAt, endedAt: Date.now(), durationMs: 0, ok: result.ok !== false,
      };
    }
    done = true;
    const endedAt = Date.now();
    return recordBackupPerfEvent({
      operationId,
      operation,
      phase,
      startedAt,
      endedAt,
      durationMs: nowMs() - startedPerf,
      ok: result.ok !== false,
      ...(Number.isFinite(Number(result.bytes)) ? { bytes: Number(result.bytes) } : {}),
      ...(Number.isFinite(Number(result.count)) ? { count: Number(result.count) } : {}),
      ...(result.detail ? { detail: String(result.detail) } : {}),
      meta: { ...(options?.meta || {}), ...(result.meta || {}) },
    });
  };
}

export function readBackupPerfEvents(limit = 40): BackupPerfEvent[] {
  const rows = readAll();
  return rows.slice(-Math.max(1, limit)).reverse();
}

export function clearBackupPerfEvents(): void {
  try { localStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-backup-perf-updated")); } catch {}
}

export function summarizeBackupPerfEvents(limit = 80): {
  total: number;
  slowest: BackupPerfEvent[];
  recent: BackupPerfEvent[];
  lastBackup: BackupPerfEvent | null;
  lastRestore: BackupPerfEvent | null;
} {
  const rows = readBackupPerfEvents(limit);
  const slowest = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8);
  return {
    total: rows.length,
    slowest,
    recent: rows.slice(0, 12),
    lastBackup: rows.find((row) => row.operation === "backup") || null,
    lastRestore: rows.find((row) => row.operation === "restore") || null,
  };
}
