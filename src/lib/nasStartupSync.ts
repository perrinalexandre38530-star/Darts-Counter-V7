import { pushStoreToNas } from "./nasAutoSync";

let started = false;
let timer: number | null = null;
let startTimer: number | null = null;

const BOOT_DIAG_KEY = "dc_boot_diag_v3";

function pushBootDiag(step: string, extra?: any) {
  try {
    const raw = localStorage.getItem(BOOT_DIAG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    list.push({ at: new Date().toISOString(), step, extra: extra ?? null });
    localStorage.setItem(BOOT_DIAG_KEY, JSON.stringify(list.slice(-120)));
  } catch {}
}

export function startNasBackgroundSync(options?: { initialDelayMs?: number; intervalMs?: number }): void {
  if (started) return;
  started = true;

  const initialDelayMs = Math.max(0, Number(options?.initialDelayMs || 4000));
  const intervalMs = Math.max(15000, Number(options?.intervalMs || 60000));
  pushBootDiag("nas:bgsync:scheduled", { initialDelayMs, intervalMs });

  startTimer = window.setTimeout(() => {
    pushBootDiag("nas:bgsync:first_push:start", { initialDelayMs });
    pushStoreToNas()
      .then(() => pushBootDiag("nas:bgsync:first_push:done"))
      .catch((e) => pushBootDiag("nas:bgsync:first_push:error", { message: e instanceof Error ? e.message : String(e) }));
  }, initialDelayMs);

  timer = window.setInterval(() => {
    pushBootDiag("nas:bgsync:tick:start");
    pushStoreToNas()
      .then(() => pushBootDiag("nas:bgsync:tick:done"))
      .catch((e) => pushBootDiag("nas:bgsync:tick:error", { message: e instanceof Error ? e.message : String(e) }));
  }, intervalMs);
}

export function stopNasBackgroundSync(): void {
  if (startTimer != null) {
    window.clearTimeout(startTimer);
    startTimer = null;
  }
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
  started = false;
}
