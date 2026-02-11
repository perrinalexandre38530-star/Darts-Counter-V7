// =============================================================
// src/lib/sync/SyncHardener.ts
// HARDEN — verrous, retries, logs persistants
// =============================================================

import { supabase } from "../supabaseClient";

type SyncLogEntry = {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
};

const LOG_KEY = "dc_sync_logs";
const LOCK_KEY = "dc_sync_lock";
const LOCK_TTL = 60_000; // 60s

function now() {
  return new Date().toISOString();
}

function readLogs(): SyncLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLogs(logs: SyncLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-200)));
  } catch {}
}

export function logSync(level: SyncLogEntry["level"], message: string) {
  const logs = readLogs();
  logs.push({ at: now(), level, message });
  writeLogs(logs);
}

export function getSyncLogs(): SyncLogEntry[] {
  return readLogs();
}

// ------------------------------------------------------------
// LOCK (anti double sync multi-onglets)
// ------------------------------------------------------------

export function acquireSyncLock(): boolean {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (Date.now() - lock.ts < LOCK_TTL) {
        return false;
      }
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now() }));
    return true;
  } catch {
    return true;
  }
}

export function releaseSyncLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {}
}

// ------------------------------------------------------------
// Retry helper
// ------------------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      logSync("warn", `Retry ${i + 1}/${retries}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  logSync("error", "All retries failed");
  throw lastErr;
}