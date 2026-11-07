/**
 * Undo checkpoint for one completed 5 VIES / CHASE visit.
 * Pure helpers: the snapshot is saved locally with the unfinished match only;
 * History V4 remains the source of truth for finished matches.
 */
export type FiveLivesUndoState<Player, Event> = {
  players: Player[];
  turnIndex: number;
  chaseRoundQueue: string[];
  lastScoreToBeat: number | null;
  events: Event[];
};

type NamedPlayer = { id: string };
type NamedEvent = { id: string; playerId: string };

export function captureFiveLivesUndo<Player extends NamedPlayer, Event extends NamedEvent>(
  state: FiveLivesUndoState<Player, Event>,
): FiveLivesUndoState<Player, Event> {
  return {
    // Play updates player stats immutably; copy all collections so further
    // state replacements and queue shuffles cannot mutate this checkpoint.
    players: [...state.players],
    turnIndex: state.turnIndex,
    chaseRoundQueue: [...state.chaseRoundQueue],
    lastScoreToBeat: state.lastScoreToBeat,
    events: [...state.events],
  };
}

export function isValidFiveLivesUndo<Player extends NamedPlayer, Event extends NamedEvent>(
  previous: FiveLivesUndoState<Player, Event> | null | undefined,
  current: FiveLivesUndoState<Player, Event>,
): previous is FiveLivesUndoState<Player, Event> {
  if (!previous || !Array.isArray(previous.players) || !Array.isArray(previous.events)
    || !Array.isArray(previous.chaseRoundQueue) || !Array.isArray(current.players)
    || !Array.isArray(current.events) || previous.events.length + 1 !== current.events.length
    || previous.players.length !== current.players.length || !previous.players.length
    || !Number.isInteger(previous.turnIndex) || previous.turnIndex < 0
    || previous.turnIndex >= previous.players.length
    || (previous.lastScoreToBeat !== null && !Number.isFinite(previous.lastScoreToBeat))) return false;

  const currentIds = current.players.map((p) => p?.id);
  const previousIds = previous.players.map((p) => p?.id);
  if (new Set(currentIds).size !== currentIds.length || currentIds.some((id, i) => !id || id !== previousIds[i])) return false;
  if (previous.chaseRoundQueue.some((id) => !currentIds.includes(id))) return false;
  // An undo is only valid for the immediately preceding completed visit.
  return previous.events.every((event, index) =>
    typeof event?.id === "string" && event.id === current.events[index]?.id
    && currentIds.includes(event.playerId));
}
