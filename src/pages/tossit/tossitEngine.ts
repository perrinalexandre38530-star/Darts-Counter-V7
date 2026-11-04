/** TOSSIT SCORING — human-validated throws, pure and undoable transitions.
 * Rules reference: https://tossit.game/pages/how-to-play (November 2026).
 * No visual / camera claims are made by this scoring engine. */
export type TossitMode = "classic" | "speed" | "target" | "duel" | "border" | "tictac";
export type TossitPlayer = { id: string; name: string; avatarDataUrl?: string | null };
export type TossitEvent = {
  index: number;
  scores: Record<string, number>;
  explanation: string;
  winnerId?: string | null;
  at: number;
};
export type TossitState = {
  mode: TossitMode;
  players: TossitPlayer[];
  dartsPerPlayer: number;
  scores: Record<string, number>;
  events: TossitEvent[];
  nextPlayerIndex: number;
  winnerId: string | null;
  finished: boolean;
  createdAt: number;
  previous: TossitState | null;
  gridSize: 4 | 5;
  board: (string | null)[];
};
export type ClassicRound = {
  kind: "classic";
  playerId: string;
  /** For Classic, number of the round winner's darts actually stuck. */
  closestDarts: number;
  kiss: number;
  frenchKiss?: number;
  jackiss: boolean;
  jackissExtra: number;
  jumpover: boolean;
  jackover: boolean;
};
export type SpeedRound = {
  kind: "speed";
  stuck: Record<string, number>;
  kiss: Record<string, number>;
  jumpoverWinnerId?: string;
};
export type TargetTurn = { kind: "target"; hits: number[] };
export type DuelTurn = { kind: "duel"; stuck: number; jackStuck: boolean; kiss: number; jumpover: number };
export type BorderRound = {
  kind: "border";
  /** Valid darts' distance from the line, in centimeters, for each player. */
  valid: Record<string, number[]>;
  /** Darts still stuck on the wrong side (award points to the opponent). */
  wrongSide: Record<string, number>;
};
export type TicTacTurn = { kind: "tictac"; cell: number | null };
export type TossitAction = ClassicRound | SpeedRound | TargetTurn | DuelTurn | BorderRound | TicTacTurn;

export const TOSSIT_MODES: ReadonlyArray<{ id: TossitMode; title: string; category: string; description: string; target: number }> = [
  { id: "classic", title: "TOSSIT CLASSIC", category: "Classique", description: "Cochonnet noir, comptage des ventouses collées et bonus spéciaux. Premier à 13 points.", target: 13 },
  { id: "speed", title: "SPEED BATTLE", category: "Défi", description: "Lancers simultanés, ventouses qui tiennent, pénalités et objectif 21 points.", target: 21 },
  { id: "target", title: "TOSSIT TARGET", category: "Précision", description: "Cercles à 1, 2 et 3 points. Atteindre exactement 21.", target: 21 },
  { id: "duel", title: "DUEL", category: "Duel", description: "Six fléchettes colorées et une noire en dernier. Le cochonnet doit tenir pour marquer. Premier à 21.", target: 21 },
  { id: "border", title: "CROSS THE BORDER", category: "Précision", description: "Traversez la frontière ; la ventouse la plus proche de la ligne décide la manche. Premier à 13.", target: 13 },
  { id: "tictac", title: "TIC-TAC-TOSSIT", category: "Stratégie", description: "Grille 4×4 (ligne de 3) ou 5×5 (ligne de 4), en alternant les lancers.", target: 0 },
] as const;
export const TOSSIT_PLANNED: ReadonlyArray<{ title: string; category: string; description: string }> = [
  { title: "BATTLE MODE", category: "Duel", description: "Lancers simultanés ; la meilleure série de ventouses permet de lancer le cochonnet noir." },
  { title: "EL SNIPER", category: "Précision", description: "Atteindre une méga ventouse avec une fléchette." },
  { title: "COLOR CONQUEST", category: "Stratégie", description: "Conquérir des zones avec les ventouses de son équipe." },
  { title: "RIVER", category: "Défi", description: "Éviter la rivière centrale pour marquer." },
  { title: "CORNHOLE", category: "Précision", description: "Atterrir sur la planche ou dans l'ouverture pour marquer." },
  { title: "FOOTBALL", category: "Stratégie", description: "Marquer en visant les zones du but adverse." },
];

function integerBetween(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function newTossitGame(mode: TossitMode, players: TossitPlayer[], dartsPerPlayer = 3, now = Date.now(), gridSize: 4 | 5 = 4): TossitState {
  if (!TOSSIT_MODES.some((m) => m.id === mode)) throw new Error("Unknown mode");
  const unique = players.filter((p, index) => !!p.id && players.findIndex((q) => q.id === p.id) === index);
  if (unique.length !== players.length || unique.some((p) => !p.name?.trim())) throw new Error("Invalid players");
  if (unique.length < (mode === "target" ? 1 : 2)) throw new Error("Not enough players");
  if (["speed", "duel", "border", "tictac"].includes(mode) && unique.length !== 2) throw new Error("This mode requires two players");
  if (unique.length > (mode === "target" ? 4 : 6) || !integerBetween(dartsPerPlayer, 3, 6)) throw new Error("Invalid setup");
  if (mode === "duel" && dartsPerPlayer !== 6) throw new Error("Duel requires six coloured darts plus the jack");
  if (gridSize !== 4 && gridSize !== 5) throw new Error("Invalid grid");
  return { mode, players: unique, dartsPerPlayer, scores: Object.fromEntries(unique.map((p) => [p.id, 0])), events: [], nextPlayerIndex: 0, winnerId: null, finished: false, createdAt: now, previous: null, gridSize, board: Array(gridSize * gridSize).fill(null) };
}

/** Detect a run of 3 in 4x4 or 4 in 5x5. Both diagonal directions count. */
export function ticTacHasLine(board: ReadonlyArray<string | null>, size: 4 | 5, playerId: string): boolean {
  const length = size === 4 ? 3 : 4;
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const endRow = row + (length - 1) * dr, endCol = col + (length - 1) * dc;
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      let all = true;
      for (let k = 0; k < length; k++) if (board[(row + k * dr) * size + col + k * dc] !== playerId) { all = false; break; }
      if (all) return true;
    }
  }
  return false;
}

export function applyTossitAction(prev: TossitState, action: TossitAction, now = Date.now()): TossitState {
  if (prev.finished) throw new Error("Match already finished");
  const scores = { ...prev.scores };
  const ids = prev.players.map((p) => p.id);
  let winnerId: string | null = null;
  let nextPlayerIndex = prev.nextPlayerIndex;
  let board = prev.board;
  let finishAsDraw = false;
  let explanation = "";
  if (prev.mode === "classic" && action.kind === "classic") {
    if (!ids.includes(action.playerId)) throw new Error("Unknown round winner");
    if (!integerBetween(action.closestDarts, 0, prev.dartsPerPlayer) || !integerBetween(action.kiss, 0, prev.dartsPerPlayer) ||
      !integerBetween(action.frenchKiss ?? 0, 0, prev.dartsPerPlayer) || !integerBetween(action.jackissExtra, 0, prev.dartsPerPlayer)) throw new Error("Invalid Classic round");
    // Classic bonuses only belong to the winning player. The Kiss is +2, French Kiss +3.
    const bonus = action.kiss * 2 + (action.frenchKiss ?? 0) * 3 + (action.jackiss ? 3 + action.jackissExtra : 0) + (action.jumpover ? 9 : 0);
    const roundTotal = action.closestDarts + bonus;
    if (action.jumpover) for (const id of ids) if (id !== action.playerId) scores[id] = 0;
    scores[action.playerId] += roundTotal;
    if (action.jackover || scores[action.playerId] >= 13) winnerId = action.playerId;
    explanation = `${prev.players.find((p) => p.id === action.playerId)?.name} : +${roundTotal} (${action.closestDarts} collées, ${bonus} bonus)${action.jackover ? " • JACKOVER !" : ""}`;
  } else if (prev.mode === "speed" && action.kind === "speed") {
    const [a, b] = ids;
    for (const id of ids) {
      if (!integerBetween(action.stuck[id] ?? 0, 0, prev.dartsPerPlayer) || !integerBetween(action.kiss[id] ?? 0, 0, prev.dartsPerPlayer)) throw new Error("Invalid Speed Battle score");
      scores[id] += (action.stuck[id] ?? 0) + (action.kiss[id] ?? 0);
    }
    if ((action.stuck[a] ?? 0) === 0) scores[a] -= (action.stuck[b] ?? 0) + (action.kiss[b] ?? 0);
    if ((action.stuck[b] ?? 0) === 0) scores[b] -= (action.stuck[a] ?? 0) + (action.kiss[a] ?? 0);
    if (action.jumpoverWinnerId) {
      if (!ids.includes(action.jumpoverWinnerId)) throw new Error("Invalid Jumpover winner");
      winnerId = action.jumpoverWinnerId;
    } else if (scores[a] >= 21 || scores[b] >= 21) {
      if (scores[a] !== scores[b]) winnerId = scores[a] > scores[b] ? a : b;
    }
    explanation = `${prev.players[0].name} ${scores[a]} · ${prev.players[1].name} ${scores[b]}`;
  } else if (prev.mode === "target" && action.kind === "target") {
    if (action.hits.length !== prev.dartsPerPlayer || !action.hits.every((v) => integerBetween(v, 0, 3))) throw new Error("Invalid Target turn");
    const current = prev.players[prev.nextPlayerIndex];
    const points = action.hits.reduce((s, n) => s + n, 0) + (action.hits.every((v) => v > 0) ? 1 : 0);
    const proposed = scores[current.id] + points;
    if (proposed <= 21) scores[current.id] = proposed;
    if (proposed === 21) winnerId = current.id;
    nextPlayerIndex = (prev.nextPlayerIndex + 1) % prev.players.length;
    explanation = `${current.name} : ${points} points${proposed > 21 ? " • dépassement, score inchangé" : ""}`;
  } else if (prev.mode === "duel" && action.kind === "duel") {
    if (!integerBetween(action.stuck, 0, prev.dartsPerPlayer) || !integerBetween(action.kiss, 0, prev.dartsPerPlayer) || !integerBetween(action.jumpover, 0, prev.dartsPerPlayer)) throw new Error("Invalid Duel turn");
    const current = prev.players[prev.nextPlayerIndex];
    const earned = action.jackStuck ? action.stuck + action.kiss + action.jumpover * 3 : 0;
    scores[current.id] += earned;
    if (scores[current.id] >= 21) winnerId = current.id;
    nextPlayerIndex = (prev.nextPlayerIndex + 1) % 2;
    explanation = `${current.name} : +${earned}${action.jackStuck ? ` (${action.stuck} collées + bonus)` : " (cochonnet manqué : 0)"}`;
  } else if (prev.mode === "border" && action.kind === "border") {
    const [a, b] = ids;
    for (const id of ids) {
      const positions = action.valid[id];
      const invalid = action.wrongSide[id];
      if (!Array.isArray(positions) || positions.length > prev.dartsPerPlayer || !positions.every((v) => Number.isFinite(v) && v >= 0 && v <= 10000) ||
        !integerBetween(invalid, 0, prev.dartsPerPlayer) || positions.length + invalid > prev.dartsPerPlayer) throw new Error("Invalid Border round");
    }
    const nearA = Math.min(Infinity, ...action.valid[a]);
    const nearB = Math.min(Infinity, ...action.valid[b]);
    const pointsA = nearA < nearB ? action.valid[a].filter((v) => v < nearB).length : 0;
    const pointsB = nearB < nearA ? action.valid[b].filter((v) => v < nearA).length : 0;
    const totalA = pointsA + action.wrongSide[b];
    const totalB = pointsB + action.wrongSide[a];
    scores[a] += totalA;
    scores[b] += totalB;
    if ((scores[a] >= 13 || scores[b] >= 13) && scores[a] !== scores[b]) winnerId = scores[a] > scores[b] ? a : b;
    explanation = `${prev.players[0].name} +${totalA} · ${prev.players[1].name} +${totalB}${nearA === nearB ? " • distance égale" : ""}`;
  } else if (prev.mode === "tictac" && action.kind === "tictac") {
    const current = prev.players[prev.nextPlayerIndex];
    if (action.cell !== null && !integerBetween(action.cell, 0, prev.board.length - 1)) throw new Error("Invalid cell");
    if (action.cell !== null && prev.board[action.cell] === null) {
      board = prev.board.slice();
      board[action.cell] = current.id;
      scores[current.id] += 1; // tracks occupied cells, not match points
      if (ticTacHasLine(board, prev.gridSize, current.id)) winnerId = current.id;
      explanation = `${current.name} : case ${action.cell + 1}`;
    } else explanation = `${current.name} : ${action.cell === null ? "ventouse manquée" : "case déjà occupée"}`;
    nextPlayerIndex = (prev.nextPlayerIndex + 1) % 2;
    if (!winnerId && board.every((x) => x !== null)) finishAsDraw = true;
  } else throw new Error("Action incompatible with game mode");
  const event: TossitEvent = { index: prev.events.length + 1, scores: { ...scores }, explanation, winnerId, at: now };
  return { ...prev, scores, board, events: [...prev.events, event], nextPlayerIndex, winnerId, finished: !!winnerId || finishAsDraw, previous: prev };
}

export function undoTossitAction(state: TossitState): TossitState { return state.previous ?? state; }
export function summaryForTossit(state: TossitState) {
  return { finished: state.finished, sport: "tossit", mode: state.mode, scores: { ...state.scores }, rounds: state.events.length, winnerId: state.winnerId, draw: state.finished && !state.winnerId,
    gridSize: state.mode === "tictac" ? state.gridSize : undefined,
    perPlayer: state.players.map((p) => ({ id: p.id, playerId: p.id, name: p.name, points: state.scores[p.id] ?? 0 })) };
}
