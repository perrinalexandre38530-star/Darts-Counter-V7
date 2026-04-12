// @ts-nocheck

type DiagEvent = { at: number; channel: string; data?: any };

declare global {
  interface Window {
    __profilesDiag?: {
      installed: boolean;
      events: DiagEvent[];
      counters: Record<string, number>;
      marks: Record<string, number>;
      consoleEnabled?: boolean;
    };
    __dumpProfilesDiag?: () => any;
    __clearProfilesDiag?: () => void;
    __setProfilesDiagConsole?: (enabled: boolean) => void;
  }
}

const MAX_EVENTS = 400;

function getStore() {
  if (typeof window === "undefined") return null as any;
  if (!window.__profilesDiag) {
    window.__profilesDiag = {
      installed: false,
      events: [],
      counters: {},
      marks: {},
      consoleEnabled: false,
    };
  }
  return window.__profilesDiag;
}

function isConsoleEnabled() {
  try {
    const s = getStore();
    if (!s) return false;
    if (typeof s.consoleEnabled === "boolean") return s.consoleEnabled;
    return localStorage.getItem("dc_profiles_diag_console") === "1";
  } catch {
    return false;
  }
}

export function profilesDiagIncrement(key: string) {
  const s = getStore();
  if (!s) return 0;
  s.counters[key] = Number(s.counters[key] || 0) + 1;
  return s.counters[key];
}

export function profilesDiagMark(key: string) {
  const s = getStore();
  if (!s) return Date.now();
  const now = performance?.now?.() ?? Date.now();
  s.marks[key] = now;
  return now;
}

export function profilesDiagMeasure(key: string) {
  const s = getStore();
  const now = performance?.now?.() ?? Date.now();
  const start = s?.marks?.[key];
  if (typeof start !== "number") return null;
  return Math.round((now - start) * 10) / 10;
}

export function profilesDiagLog(channel: string, data?: any) {
  const s = getStore();
  if (!s) return;
  const evt = { at: Date.now(), channel, data };
  s.events.push(evt);
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  if (!isConsoleEnabled()) return;
  try {
    console.log(`[diag][${channel}]`, data ?? "");
  } catch {}
}

export function diffShallow(prev: any, next: any) {
  const changed: string[] = [];
  const keys = new Set<string>([
    ...Object.keys(prev || {}),
    ...Object.keys(next || {}),
  ]);
  keys.forEach((key) => {
    const a = prev?.[key];
    const b = next?.[key];
    const same = Array.isArray(a) && Array.isArray(b)
      ? a.length === b.length && a.every((v, i) => v === b[i])
      : a === b;
    if (!same) changed.push(key);
  });
  return changed;
}

export function installProfilesDiag() {
  const s = getStore();
  if (!s || s.installed || typeof window === "undefined") return;
  s.installed = true;

  window.__dumpProfilesDiag = () => ({
    counters: { ...(s.counters || {}) },
    marks: { ...(s.marks || {}) },
    events: [...(s.events || [])],
  });
  window.__clearProfilesDiag = () => {
    s.events = [];
    s.counters = {};
    s.marks = {};
  };
  window.__setProfilesDiagConsole = (enabled: boolean) => {
    s.consoleEnabled = !!enabled;
    try {
      localStorage.setItem("dc_profiles_diag_console", enabled ? "1" : "0");
    } catch {}
  };

  try {
    if (typeof PerformanceObserver !== "undefined") {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          profilesDiagLog("longtask", {
            name: entry.name,
            startTime: Math.round(entry.startTime),
            duration: Math.round(entry.duration * 10) / 10,
          });
        }
      });
      po.observe({ type: "longtask", buffered: true } as any);
    }
  } catch (e) {
    profilesDiagLog("diag-install-warning", { where: "longtask", error: String((e as any)?.message || e) });
  }

  profilesDiagLog("diag-installed", {
    href: String(window.location.href || ""),
    ua: String(navigator.userAgent || "").slice(0, 120),
  });
}
