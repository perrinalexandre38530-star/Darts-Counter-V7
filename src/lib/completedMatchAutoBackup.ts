import { getCanonicalAccountScopeId } from "./canonicalAccountScope";

// Compatibility shim — W5 backup pipeline cleanup.
//
// History.upsert no longer calls this module. A finished match is already
// persisted locally, mirrored as a per-match backup and recorded in the
// incremental journal before `msc:local-match-committed` is emitted. The global
// sync orchestrator listens to that event and is the single authority deciding
// when deltas are uploaded and when a full checkpoint is due.
//
// Keep this exported function for older callers/plugins, but never rebuild a
// full account snapshot from here.

const LAST_RESULT_KEY = "dc_match_full_backup_last_result_v1";

export function queueCompletedMatchAutoBackup(args: {
  matchId?: string | null;
  updatedAt?: string | number | null;
  kind?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const matchId = String(args.matchId || "match").trim() || "match";
  const ownerScope = String(getCanonicalAccountScopeId() || "local").trim() || "local";
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({
      at: new Date().toISOString(),
      ok: true,
      deferred: false,
      incrementalOnly: true,
      matchId,
      ownerScope,
      reason: `match-finished:${String(args.kind || "match")}:${matchId}`,
      message: "Partie persistée localement ; synchro incrémentale confiée à l’orchestrateur global.",
    }));
  } catch {}

  // Compatibility path only: if a legacy caller still invokes this function,
  // ask the unique orchestrator for one lightweight pass instead of creating a
  // second full snapshot pipeline.
  try {
    window.dispatchEvent(new CustomEvent("msc:sync-request", {
      detail: { reason: "legacy-completed-match-backup-shim", delayMs: 500 },
    }));
  } catch {}
}
