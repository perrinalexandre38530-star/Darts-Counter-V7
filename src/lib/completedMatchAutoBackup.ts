import { saveConfiguredBackupNow } from "./configuredBackupNow";

const LAST_SIGNATURE_PREFIX = "dc_match_full_backup_last_signature_v1";
const LAST_RESULT_KEY = "dc_match_full_backup_last_result_v1";
const DEBOUNCE_MS = 900;
const RETRY_MS = 12_000;
const SAME_MATCH_DEDUPE_MS = 60_000;

let timer: number | null = null;
let retryTimer: number | null = null;
let running: Promise<void> | null = null;
let queued: { matchId: string; signature: string; reason: string; attempt: number } | null = null;
const recentSuccessfulMatches = new Map<string, number>();

function currentUserScope(): string {
  try {
    const raw = localStorage.getItem("dc_storage_user_id_v1") || localStorage.getItem("dc_user_id") || "local";
    return String(raw || "local").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "local";
  } catch {
    return "local";
  }
}

function storageKey(): string {
  return `${LAST_SIGNATURE_PREFIX}:${currentUserScope()}`;
}

function alreadyBackedUp(signature: string): boolean {
  try { return localStorage.getItem(storageKey()) === signature; } catch { return false; }
}

function rememberSuccess(signature: string, result: any): void {
  try {
    localStorage.setItem(storageKey(), signature);
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ at: new Date().toISOString(), ok: true, signature, result }));
  } catch {}
}

function rememberFailure(signature: string, result: any): void {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ at: new Date().toISOString(), ok: false, signature, result }));
  } catch {}
}

async function flushQueued(): Promise<void> {
  if (running || !queued) return;
  const job = queued;
  queued = null;
  if (alreadyBackedUp(job.signature)) return;

  running = (async () => {
    const result = await saveConfiguredBackupNow(job.reason);
    if (result.ok) {
      recentSuccessfulMatches.set(job.matchId, Date.now());
      rememberSuccess(job.signature, result);
      try { window.dispatchEvent(new CustomEvent("dc-match-full-backup-finished", { detail: { ok: true, matchId: job.matchId, result } })); } catch {}
      return;
    }

    rememberFailure(job.signature, result);
    try { window.dispatchEvent(new CustomEvent("dc-match-full-backup-finished", { detail: { ok: false, matchId: job.matchId, result } })); } catch {}

    // Une panne distante ne doit pas faire perdre la sauvegarde locale créée par
    // saveConfiguredBackupNow(). On tente simplement une fois de plus le remote.
    if (job.attempt < 1) {
      queued = { ...job, attempt: job.attempt + 1 };
      if (retryTimer != null) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void flushQueued();
      }, RETRY_MS);
    }
  })().catch((error) => {
    rememberFailure(job.signature, { message: String(error?.message || error || "Sauvegarde automatique impossible") });
  }).finally(() => {
    running = null;
    if (queued && retryTimer == null) void flushQueued();
  });

  await running;
}

/**
 * Déclenché par History.upsert uniquement lorsqu'une partie est terminée.
 * Une seule sauvegarde complète est produite par état final de match, même si
 * plusieurs écrans réécrivent le même résultat pendant quelques millisecondes.
 */
export function queueCompletedMatchAutoBackup(args: {
  matchId?: string | null;
  updatedAt?: string | number | null;
  kind?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const matchId = String(args.matchId || "match").trim() || "match";
  const lastSuccessAt = recentSuccessfulMatches.get(matchId) || 0;
  if (lastSuccessAt > 0 && Date.now() - lastSuccessAt < SAME_MATCH_DEDUPE_MS) return;
  const updated = String(args.updatedAt || "").trim() || "final";
  const signature = `${matchId}|${updated}`;
  if (alreadyBackedUp(signature)) return;

  queued = {
    matchId,
    signature,
    reason: `match-end-auto:${String(args.kind || "match")}:${matchId}`,
    attempt: 0,
  };

  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void flushQueued();
  }, DEBOUNCE_MS);
}
