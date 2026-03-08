export type CrashContext = {
  route?: string | null;
  sport?: string | null;
  routeParams?: any;
  activeProfileId?: string | null;
  build?: string | null;
};

export type CrashReport = {
  id: string;
  at: string;
  ts: number;
  kind: string;
  message: string;
  stack?: string;
  name?: string;
  source?: string;
  href: string;
  ua: string;
  online: boolean | null;
  visibilityState?: string;
  context?: CrashContext;
  raw?: string;
};

const LAST_KEY = "dc_last_crash_report_v2";
const LOG_KEY = "dc_crash_log_v2";
const CONTEXT_KEY = "dc_crash_context_v2";
const MAX_LOG = 12;

function hasWindow() {
  return typeof window !== "undefined";
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeStringify(value: any, fallback = "") {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return fallback;
    }
  }
}

function trimText(value: string, max = 8000) {
  return value.length > max ? value.slice(0, max) + "\n...[truncated]" : value;
}

export function normalizeErrorLike(input: any): {
  message: string;
  stack?: string;
  name?: string;
  raw?: string;
} {
  try {
    const value = input?.reason ?? input?.error ?? input;

    if (!value) {
      return { message: "Erreur inconnue" };
    }

    if (typeof value === "string") {
      return { message: value, raw: value };
    }

    if (value instanceof Error) {
      return {
        message: value.message || value.name || "Error",
        stack: value.stack || "",
        name: value.name || "Error",
        raw: trimText(safeStringify({ message: value.message, name: value.name, stack: value.stack }, "")),
      };
    }

    const message = String(value?.message || value?.toString?.() || "Erreur inconnue");
    const stack = typeof value?.stack === "string" ? value.stack : "";
    const name = typeof value?.name === "string" ? value.name : undefined;

    return {
      message,
      stack,
      name,
      raw: trimText(safeStringify(value, "")),
    };
  } catch {
    return { message: "Erreur non sérialisable" };
  }
}

export function setCrashContext(ctx: Partial<CrashContext>) {
  if (!hasWindow()) return;
  try {
    const prev = getCrashContext();
    const next: CrashContext = { ...prev, ...ctx };
    window.sessionStorage.setItem(CONTEXT_KEY, safeStringify(next, "{}"));
  } catch {}
}

export function getCrashContext(): CrashContext {
  if (!hasWindow()) return {};
  try {
    return safeParse<CrashContext>(window.sessionStorage.getItem(CONTEXT_KEY), {});
  } catch {
    return {};
  }
}

export function clearCrashContext() {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.removeItem(CONTEXT_KEY);
  } catch {}
}

export function isDynamicImportCrash(input: any): boolean {
  const msg = String(input?.message || input?.reason?.message || input?.error?.message || input || "").toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("dynamically imported module")
  );
}

export function captureCrash(kind: string, input: any, extra?: Partial<CrashReport>): CrashReport {
  const norm = normalizeErrorLike(input);
  const report: CrashReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ts: Date.now(),
    kind,
    message: norm.message,
    stack: norm.stack,
    name: norm.name,
    raw: norm.raw,
    href: hasWindow() ? window.location.href : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    online: typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : null,
    visibilityState: typeof document !== "undefined" ? document.visibilityState : undefined,
    context: getCrashContext(),
    ...extra,
  };

  if (hasWindow()) {
    try {
      window.localStorage.setItem(LAST_KEY, safeStringify(report, "{}"));
    } catch {}
    try {
      const prev = safeParse<CrashReport[]>(window.localStorage.getItem(LOG_KEY), []);
      prev.unshift(report);
      window.localStorage.setItem(LOG_KEY, safeStringify(prev.slice(0, MAX_LOG), "[]"));
    } catch {}
  }

  return report;
}

export function getLastCrashReport(): CrashReport | null {
  if (!hasWindow()) return null;
  try {
    return safeParse<CrashReport | null>(window.localStorage.getItem(LAST_KEY), null);
  } catch {
    return null;
  }
}

export function getCrashLog(): CrashReport[] {
  if (!hasWindow()) return [];
  try {
    return safeParse<CrashReport[]>(window.localStorage.getItem(LOG_KEY), []);
  } catch {
    return [];
  }
}

export function clearLastCrashReport() {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(LAST_KEY);
  } catch {}
}

export function formatCrashReportText(report: CrashReport | null | undefined): string {
  if (!report) return "Aucun crash enregistré.";

  const lines = [
    "💥 CRASH CAPTURÉ",
    `Quand: ${report.at}`,
    `Type: ${report.kind}`,
    `Message: ${report.message || ""}`,
    report.name ? `Nom: ${report.name}` : "",
    report.source ? `Source: ${report.source}` : "",
    report.context?.route ? `Route: ${report.context.route}` : "",
    report.context?.sport ? `Sport: ${report.context.sport}` : "",
    report.context?.activeProfileId ? `Profil actif: ${report.context.activeProfileId}` : "",
    report.context?.routeParams ? `Params: ${trimText(safeStringify(report.context.routeParams, ""), 2000)}` : "",
    `URL: ${report.href}`,
    `En ligne: ${String(report.online)}`,
    report.visibilityState ? `Visibilité: ${report.visibilityState}` : "",
    report.ua ? `UA: ${report.ua}` : "",
    report.stack ? `\nSTACK\n${trimText(report.stack, 12000)}` : "",
    report.raw ? `\nRAW\n${trimText(report.raw, 4000)}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function copyCrashReport(report: CrashReport | null | undefined): Promise<boolean> {
  try {
    const txt = formatCrashReportText(report);
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    return false;
  }
}
