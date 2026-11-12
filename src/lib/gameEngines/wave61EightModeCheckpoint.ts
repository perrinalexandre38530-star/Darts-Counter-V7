/**
 * Durable, single-level checkpoints for the eight Wave61 variants/FUN modes.
 *
 * History V4 persists the last committed visit, but the transient React undo
 * stack is lost when the app or Android process is restarted. Keep only ONE
 * pre-visit snapshot (no nested history of snapshots) in the canonical state.
 */
import { cloneWave61State, type Wave61State } from "./wave61Engine";

const EIGHT_MODE_IDS = new Set([
  "black_vs_white", "three_colors", "la_suite", "color_call",
  "bim_bam_boum", "saute_moutons", "troupeau_en_danger", "une_ptite_raclette",
]);

export function withWave61EightModeUndoCheckpoint(
  committed: Wave61State,
  beforeVisit: Wave61State,
): Wave61State {
  if (!EIGHT_MODE_IDS.has(committed.modeId) || committed.phase !== "playing" || committed.special?.seriesIntermission) {
    return committed; // a separate seriesIntermissionUndo handles winning legs
  }
  const checkpoint = cloneWave61State(beforeVisit);
  if (checkpoint.special) {
    delete checkpoint.special.lastVisitUndo; // bound snapshot depth/History size
    delete checkpoint.special.seriesIntermissionUndo;
  }
  const next = cloneWave61State(committed);
  next.special = { ...(next.special || {}), lastVisitUndo: checkpoint };
  return next;
}

export function getWave61EightModeUndoCheckpoint(state: Wave61State): Wave61State | null {
  if (!EIGHT_MODE_IDS.has(state.modeId)) return null;
  const snapshot = state.special?.lastVisitUndo;
  if (!snapshot || snapshot.mode !== "wave61" || snapshot.modeId !== state.modeId || snapshot.phase !== "playing") return null;
  // Refuse stale or unrelated snapshots, including backwards time travel to a
  // different match. This also protects imports from older saved formats.
  if (snapshot.startedAt !== state.startedAt || !Array.isArray(snapshot.visits) || snapshot.visits.length + 1 !== state.visits.length) return null;
  return snapshot as Wave61State; // caller clones only when actually undoing
}

/** A BOT recap must survive History resume, even for the LAST dart of a match. */
export function getWave61PendingBotVisitRecap(state: Wave61State): any | null {
  const pending = state.special?.pendingBotVisitRecap;
  const lastVisit = state.visits?.[state.visits.length - 1];
  return pending?.isBot === true
    && String(pending.visitId || "") !== ""
    && String(pending.visitId) === String(lastVisit?.id || "")
    ? pending : null;
}

/** Drop corrupt/stale recap markers from imported History states. Otherwise a
 * hidden pendingBotVisitRecap can block BOTH human input and BOT turns forever.
 * Valid recaps (including a BOT finish) are preserved unchanged.
 */
export function normalizeWave61EightModeRestoredState(state: Wave61State): Wave61State {
  if (!EIGHT_MODE_IDS.has(state.modeId) || !state.special?.pendingBotVisitRecap || getWave61PendingBotVisitRecap(state)) return state;
  const clean = cloneWave61State(state);
  delete clean.special.pendingBotVisitRecap;
  return clean;
}
