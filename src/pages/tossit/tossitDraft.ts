/** TOSSIT interrupted-match draft. History V4 stays authoritative for finished games.
 * Store at most one prior state to allow one undo after a page reload without
 * serializing the recursive in-memory undo chain. No storage API here: unit-testable.
 */
import type { TossitPlayer, TossitState } from "./tossitEngine";

export function encodeTossitDraft(state: TossitState): string | null {
  if (state.finished) return null;
  return JSON.stringify({
    ...state,
    previous: state.previous ? { ...state.previous, previous: null } : null,
  });
}

export function decodeTossitDraft(raw: string | null, isSupportedMode: (value: unknown) => boolean): TossitState | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as TossitState;
    if (!draft || draft.finished || !isSupportedMode(draft.mode) ||
        !Array.isArray(draft.players) || !Array.isArray(draft.events) || !draft.scores ||
        !Number.isInteger(draft.dartsPerPlayer) || draft.dartsPerPlayer < 3 || draft.dartsPerPlayer > 9 ||
        !Array.isArray(draft.board) || draft.board.length !== (draft.gridSize || 4) ** 2 ||
        draft.players.some((p: TossitPlayer) => !p?.id || !p?.name)) return null;

    const players = draft.players;
    const previous = draft.previous;
    const validPrevious = !!previous && !previous.finished && previous.mode === draft.mode &&
      Array.isArray(previous.events) && previous.events.length === draft.events.length - 1 &&
      Array.isArray(previous.players) && previous.players.length === players.length &&
      previous.players.every((p: TossitPlayer, i: number) => p.id === players[i].id) &&
      Array.isArray(previous.board) && previous.board.length === draft.board.length &&
      previous.scores && typeof previous.scores === "object";

    return {
      ...draft,
      victoryTarget: Number.isInteger(draft.victoryTarget) ? draft.victoryTarget : (draft.mode === "conquest" ? 5 : 3),
      cornholeBusted: draft.cornholeBusted || Object.fromEntries(players.map(p => [p.id, false])),
      pitch: draft.pitch || { attackerId: players[0].id, attackerThrows: 0, defenderThrows: 0, chainLength: 0, blocks: 0, longPassUsed: false, drive: 1 },
      reach: draft.reach || Object.fromEntries(players.map(p => [p.id, { bestCm: 0, stuck: 0 }])),
      thiefCopWins: draft.thiefCopWins || Object.fromEntries(players.map(p => [p.id, 0])),
      chores: draft.chores || Object.fromEntries(players.map(p => [p.id, []])),
      previous: validPrevious ? { ...previous, previous: null } : null,
    };
  } catch { return null; }
}
