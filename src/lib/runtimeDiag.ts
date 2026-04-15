// src/lib/runtimeDiag.ts

export type RuntimeDiagEvent = {
  at: string;
  type: string;
  route?: string | null;
  data?: any;
};

const KEY = "dc_runtime_diag_v1";
const MAX = 300;

function hasWindow() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function currentRoute() {
  if (!hasWindow()) return null;
  try {
    return String(window.location.hash || window.location.pathname || "/");
  } catch {
    return null;
  }
}

function readEvents(): RuntimeDiagEvent[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: RuntimeDiagEvent[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
  } catch {}
}

export function runtimeDiag(type: string, data?: any) {
  const evt: RuntimeDiagEvent = { at: nowIso(), type, route: currentRoute(), data: data ?? null };
  try { console.warn('[runtime-diag]', type, evt.data ?? {}); } catch {}
  const events = readEvents();
  events.push(evt);
  writeEvents(events);
}

export function runtimeDiagClear() {
  if (!hasWindow()) return;
  try { window.localStorage.removeItem(KEY); } catch {}
}

export function runtimeDiagRead(): RuntimeDiagEvent[] {
  return readEvents();
}

const marks = new Map<string, number>();

export function diagMarkStart(name: string, data?: any) {
  marks.set(name, (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  runtimeDiag(`${name}:start`, data);
}

export function diagMarkEnd(name: string, data?: any, warnMs = 120) {
  const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const start = marks.get(name);
  const durationMs = start == null ? null : Math.round((end - start) * 10) / 10;
  const payload = { ...(data || {}), durationMs };
  runtimeDiag(durationMs != null && durationMs >= warnMs ? `${name}:slow` : `${name}:end`, payload);
  marks.delete(name);
  return durationMs;
}
