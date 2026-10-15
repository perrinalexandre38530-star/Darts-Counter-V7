// ============================================
// Stats diagnostics trace
// Lightweight, opt-in event recorder for the stats pipeline.
// Stores only metadata/counters in localStorage; never stores match payloads.
// ============================================

export type StatsDiagnosticTraceEvent = {
  id: string;
  at: number;
  channel: string;
  data?: any;
};

const ENABLED_KEY = "dc_stats_diagnostic_trace_enabled_v1";
const EVENTS_KEY = "dc_stats_diagnostic_trace_events_v1";
const MAX_EVENTS = 360;

function safeGet(key: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
}

function safeSet(key: string, value: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch {}
}

function safeRemove(key: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch {}
}

export function isStatsDiagnosticTraceEnabled(): boolean {
  return safeGet(ENABLED_KEY) === "1";
}

export function setStatsDiagnosticTraceEnabled(enabled: boolean): void {
  safeSet(ENABLED_KEY, enabled ? "1" : "0");
  if (enabled) recordStatsDiagnosticEvent("trace.enabled", { href: currentRoute() }, true);
}

export function readStatsDiagnosticTrace(): StatsDiagnosticTraceEvent[] {
  try {
    const raw = safeGet(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearStatsDiagnosticTrace(): void {
  safeRemove(EVENTS_KEY);
}

function currentRoute(): string {
  try {
    return String((globalThis as any)?.__mscActiveTab || (globalThis as any)?.location?.hash || "");
  } catch {
    return "";
  }
}

function sanitize(value: any, depth = 0): any {
  if (value == null) return value;
  if (depth > 4) return "[depth]";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > 240 ? `${value.slice(0, 237)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value).slice(0, 40)) {
      // Explicitly reject heavy/raw payload-like fields.
      if (/payload|compressed|dataurl|base64|darts?history|visits?history/i.test(key)) continue;
      out[key] = sanitize(nested, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function recordStatsDiagnosticEvent(channel: string, data?: any, force = false): void {
  if (!force && !isStatsDiagnosticTraceEnabled()) return;
  try {
    const events = readStatsDiagnosticTrace();
    events.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      channel: String(channel || "event"),
      data: sanitize({ route: currentRoute(), ...(data && typeof data === "object" ? data : { value: data }) }),
    });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    safeSet(EVENTS_KEY, JSON.stringify(events));
  } catch {}
}
