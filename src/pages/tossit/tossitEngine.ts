/** TOSSIT SCORING — human-validated throws, pure and undoable transitions.
 * Rules reference: https://tossit.game/pages/how-to-play (November 2026).
 * No visual / camera claims are made by this scoring engine. */
export type TossitMode = "classic" | "speed" | "target" | "duel" | "border" | "tictac" | "battle" | "sniper" | "conquest" | "river" | "cornhole" | "goalkeeper" | "football_pitch";
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
  /** MSS match format for round-based modes; not a published official threshold. */
  victoryTarget: number;
  board: (string | null)[];
  /** Consecutive Cornhole over-21 rounds, keyed by team. */
  cornholeBusted: Record<string, boolean>;
  /** Manually confirmed football path; no automatic camera claim. */
  pitch: { attackerId: string; attackerThrows: number; defenderThrows: number; chainLength: number; blocks: number; longPassUsed: boolean; drive: number };
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
export type BattleRound = {
  kind: "battle";
  stuck: Record<string, number>;
  /** Winner of rock-paper-scissors if the number of stuck darts is equal. */
  tieWinnerId?: string;
  jackStuck: boolean;
  /** Validates the observed closest-colour winner only after a stuck black dart. */
  closestPlayerId?: string;
};
export type SniperAttempt = { kind: "sniper"; outcome: "miss" | "mega" | "ultimate"; playerId?: string };
export type ConquestRound = {
  kind: "conquest";
  color: string;
  required: number;
  stuck: Record<string, number>;
  /** Required when both teams achieved the target: which reached it first. */
  firstId?: string;
};
export type RiverLanding = { kind: "opponent" | "own" | "river" | "miss"; points: number };
export type RiverTurn = { kind: "river"; landings: RiverLanding[]; kiss: number; jumpover: boolean };
export type CornholeLanding = "hole" | "board" | "miss";
export type CornholeRound = { kind: "cornhole"; throws: Record<string, CornholeLanding[]>; kiss: Record<string, number>; jumpover: Record<string, number> };
export type GoalkeeperTurn = { kind: "goalkeeper"; zones: number[] };
export type FootballPitchTurn = { kind: "football_pitch"; outcome: "centre" | "linked" | "longpass" | "goal" | "block" | "miss" };
export const TOSSIT_COLORS = ["Rouge", "Bleu", "Vert", "Jaune", "Rose", "Violet"] as const;
export type TossitAction = ClassicRound | SpeedRound | TargetTurn | DuelTurn | BorderRound | TicTacTurn | BattleRound | SniperAttempt | ConquestRound | RiverTurn | CornholeRound | GoalkeeperTurn | FootballPitchTurn;

export const TOSSIT_MODES: ReadonlyArray<{ id: TossitMode; title: string; category: string; description: string; target: number }> = [
  { id: "classic", title: "TOSSIT CLASSIC", category: "Classique", description: "Cochonnet noir, comptage des ventouses collées et bonus spéciaux. Premier à 13 points.", target: 13 },
  { id: "speed", title: "SPEED BATTLE", category: "Défi", description: "Lancers simultanés, ventouses qui tiennent, pénalités et objectif 21 points.", target: 21 },
  { id: "target", title: "TOSSIT TARGET", category: "Précision", description: "Cercles à 1, 2 et 3 points. Atteindre exactement 21.", target: 21 },
  { id: "duel", title: "DUEL", category: "Duel", description: "Six fléchettes colorées et une noire en dernier. Le cochonnet doit tenir pour marquer. Premier à 21.", target: 21 },
  { id: "border", title: "CROSS THE BORDER", category: "Précision", description: "Traversez la frontière ; la ventouse la plus proche de la ligne décide la manche. Premier à 13.", target: 13 },
  { id: "tictac", title: "TIC-TAC-TOSSIT", category: "Stratégie", description: "Grille 4×4 (ligne de 3) ou 5×5 (ligne de 4), en alternant les lancers.", target: 0 },
  { id: "battle", title: "BATTLE MODE", category: "Duel", description: "Lancers simultanés. Le plus de ventouses collées lance la noire ; le plus proche remporte la manche. Match en manches gagnées (format MSS).", target: 3 },
  { id: "sniper", title: "EL SNIPER", category: "Précision", description: "Soyez le premier à empiler une ventouse sur la Mega dart : victoire instantanée !", target: 0 },
  { id: "conquest", title: "COLOR CONQUEST", category: "Équipes", description: "Une couleur et un nombre de ventouses à atteindre : la première équipe à réussir marque une manche (format MSS).", target: 5 },
  { id: "river", title: "RIVER", category: "Plateau", description: "Touchez les zones du camp adverse, évitez la rivière qui arrête votre tour. Première équipe à 50 points.", target: 50 },
  { id: "cornhole", title: "CORNHOLE", category: "Plateau", description: "3 points dans le trou, 1 sur la planche, annulation des points et double bust. Exactement 21.", target: 21 },
  { id: "goalkeeper", title: "FOOTBALL • GOALKEEPER", category: "Football", description: "Visez les zones du but : de −1 à 3 points par ventouse, premier à 11 points.", target: 11 },
  { id: "football_pitch", title: "FOOTBALL • PITCH", category: "Football", description: "Attaquant contre défenseur : créez un chemin de ventouses jusqu'au but, premier à 5 buts.", target: 5 },
] as const;
export const TOSSIT_PLANNED: ReadonlyArray<{ title: string; category: string; description: string }> = [
  { title: "THIEF & COP", category: "Duel", description: "Le voleur change de position, le policier marque selon la proximité et les captures." },
  { title: "STICK & REACH", category: "Entraînement", description: "Défi de portée et de précision sur une surface verticale." },
  { title: "RAINBOW RING & STACK", category: "Créativité", description: "Former des anneaux colorés, motifs et empilements de ventouses." },
  { title: "CHORES", category: "Plateau", description: "Atteindre les zones de tâches et attribuer des défis aux adversaires." },
  { title: "CAPTURE THE BOTTLE", category: "Défi", description: "Approcher une bouteille-cible ou poser une ventouse dessus." },
];

function integerBetween(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function newTossitGame(mode: TossitMode, players: TossitPlayer[], dartsPerPlayer = 3, now = Date.now(), gridSize: 4 | 5 = 4, victoryTarget?: number): TossitState {
  if (!TOSSIT_MODES.some((m) => m.id === mode)) throw new Error("Unknown mode");
  const unique = players.filter((p, index) => !!p.id && players.findIndex((q) => q.id === p.id) === index);
  if (unique.length !== players.length || unique.some((p) => !p.name?.trim())) throw new Error("Invalid players");
  if (unique.length < (mode === "target" ? 1 : 2)) throw new Error("Not enough players");
  if (["speed", "duel", "border", "tictac", "battle", "conquest", "river", "cornhole", "goalkeeper", "football_pitch"].includes(mode) && unique.length !== 2) throw new Error("This mode requires two players");
  const allowedDarts = mode === "river" ? integerBetween(dartsPerPlayer, 6, 9)
    : mode === "cornhole" || mode === "goalkeeper" ? dartsPerPlayer === 3
    : mode === "football_pitch" ? dartsPerPlayer === 6 : integerBetween(dartsPerPlayer, 3, 6);
  if (unique.length > (mode === "target" ? 4 : 6) || !allowedDarts) throw new Error("Invalid setup");
  if (mode === "duel" && dartsPerPlayer !== 6) throw new Error("Duel requires six coloured darts plus the jack");
  if (gridSize !== 4 && gridSize !== 5) throw new Error("Invalid grid");
  const matchTarget = victoryTarget ?? (mode === "conquest" ? 5 : mode === "battle" ? 3 : 1);
  if (![1, 3, 5, 7].includes(matchTarget) || (["conquest", "battle"].includes(mode) && matchTarget === 1)) throw new Error("Invalid MSS match target");
  return { mode, players: unique, dartsPerPlayer, scores: Object.fromEntries(unique.map((p) => [p.id, 0])), events: [], nextPlayerIndex: 0, winnerId: null, finished: false, createdAt: now, previous: null, gridSize, victoryTarget: matchTarget, board: Array(gridSize * gridSize).fill(null),
    cornholeBusted: Object.fromEntries(unique.map((p) => [p.id, false])),
    pitch: { attackerId: unique[0].id, attackerThrows: 0, defenderThrows: 0, chainLength: 0, blocks: 0, longPassUsed: false, drive: 1 },
  };
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
  let cornholeBusted = prev.cornholeBusted;
  let pitch = prev.pitch;
  if (prev.mode === "river" && action.kind === "river") {
    const active = prev.players[prev.nextPlayerIndex];
    const opponent = prev.players[(prev.nextPlayerIndex + 1) % 2];
    if (!Array.isArray(action.landings) || action.landings.length === 0 || action.landings.length > prev.dartsPerPlayer ||
      !integerBetween(action.kiss, 0, prev.dartsPerPlayer) || typeof action.jumpover !== "boolean") throw new Error("Invalid River turn");
    let riverAt = -1, ownPoints = 0, earned = 0;
    for (const [i, item] of action.landings.entries()) {
      if (!item || !["opponent", "own", "river", "miss"].includes(item.kind) ||
        !integerBetween(item.points, 0, 100) || (["river", "miss"].includes(item.kind) && item.points !== 0)) throw new Error("Invalid River landing");
      if (item.kind === "river") riverAt = i;
      if (i < action.landings.length - 1 && item.kind === "river") throw new Error("River immediately ends the turn");
      if (item.kind === "opponent") earned += item.points;
      if (item.kind === "own") ownPoints += item.points;
    }
    if (riverAt === -1 && action.landings.length !== prev.dartsPerPlayer) throw new Error("Record all darts unless the river ends the turn");
    if (action.jumpover) scores[opponent.id] = 0;
    earned += action.kiss * 2 + (action.jumpover ? 9 : 0);
    scores[active.id] += earned;
    scores[opponent.id] += ownPoints;
    if ((scores[active.id] >= 50 || scores[opponent.id] >= 50) && scores[active.id] !== scores[opponent.id]) winnerId = scores[active.id] > scores[opponent.id] ? active.id : opponent.id;
    nextPlayerIndex = (prev.nextPlayerIndex + 1) % 2;
    explanation = `${active.name} +${earned} · ${opponent.name} +${ownPoints}${riverAt >= 0 ? " · rivière : tour terminé" : ""}`;
  } else if (prev.mode === "cornhole" && action.kind === "cornhole") {
    const totals: Record<string, number> = {};
    for (const id of ids) {
      const darts = action.throws?.[id];
      if (!Array.isArray(darts) || darts.length < 3 || darts.length % 3 !== 0 || darts.length > 30 ||
        !darts.every((hit) => ["hole", "board", "miss"].includes(hit)) ||
        !integerBetween(action.kiss?.[id] ?? -1, 0, darts.length) ||
        !integerBetween(action.jumpover?.[id] ?? -1, 0, darts.length)) throw new Error("Invalid Cornhole darts");
      // Every additional group of 3 requires the preceding group to be a perfect 3-hole throw.
      for (let offset = 3; offset < darts.length; offset += 3)
        if (darts.slice(offset - 3, offset).some((hit) => hit !== "hole")) throw new Error("Extra Cornhole throws require a perfect group");
      let raw = darts.reduce((n, hit) => n + (hit === "hole" ? 3 : hit === "board" ? 1 : 0), 0);
      for (let offset = 0; offset < darts.length; offset += 3)
        if (darts.slice(offset, offset + 3).every(hit => hit === "hole")) raw += 9;
      raw += action.kiss[id];
      totals[id] = raw * (1 + action.jumpover[id]);
    }
    const [a, b] = ids;
    const diff = totals[a] - totals[b];
    const scoringId = diff > 0 ? a : diff < 0 ? b : null;
    const earned = Math.abs(diff);
    cornholeBusted = { ...prev.cornholeBusted };
    if (scoringId) {
      const proposed = scores[scoringId] + earned;
      if (proposed > 21) {
        const consecutive = !!prev.cornholeBusted?.[scoringId];
        scores[scoringId] = consecutive ? 0 : 13;
        cornholeBusted[scoringId] = true;
      } else {
        scores[scoringId] = proposed;
        cornholeBusted[scoringId] = false;
      }
      if (scores[scoringId] === 21) winnerId = scoringId;
    }
    // The other team's turn did not bust; streak applies only to consecutive scoring rounds.
    for (const id of ids) if (id !== scoringId) cornholeBusted[id] = false;
    explanation = `${prev.players[0].name} ${totals[a]} · ${prev.players[1].name} ${totals[b]} · ${scoringId ? `écart +${earned} pour ${prev.players.find(p => p.id === scoringId)?.name}` : "annulation totale"}${scoringId && cornholeBusted[scoringId] ? ` · BUST → ${scores[scoringId]}` : ""}`;
  } else if (prev.mode === "goalkeeper" && action.kind === "goalkeeper") {
    const current = prev.players[prev.nextPlayerIndex];
    if (!Array.isArray(action.zones) || action.zones.length !== 3 ||
      !action.zones.every(value => integerBetween(value, -1, 3))) throw new Error("Invalid Goalkeeper volley");
    const earned = action.zones.reduce((n, value) => n + value, 0);
    scores[current.id] += earned;
    if (scores[current.id] >= 11) winnerId = current.id;
    nextPlayerIndex = (prev.nextPlayerIndex + 1) % 2;
    explanation = `${current.name} : ${earned >= 0 ? "+" : ""}${earned} (${action.zones.join(" / ")})`;
  } else if (prev.mode === "football_pitch" && action.kind === "football_pitch") {
    const [a, b] = ids;
    const current = prev.players[prev.nextPlayerIndex];
    const previousPitch = prev.pitch;
    const isAttacker = current.id === previousPitch.attackerId;
    const valid = isAttacker ? ["centre", "linked", "longpass", "goal", "miss"] : ["block", "miss"];
    if (!valid.includes(action.outcome)) throw new Error("Invalid Football Pitch action for this role");
    if (isAttacker && previousPitch.attackerThrows >= 6 || !isAttacker && previousPitch.defenderThrows >= 6) throw new Error("No darts left in this drive");
    if (isAttacker && action.outcome === "centre" && previousPitch.chainLength > 0) throw new Error("Centre already placed");
    if (isAttacker && ["linked", "longpass", "goal"].includes(action.outcome) && previousPitch.chainLength === 0) throw new Error("Place a connected dart at the centre first");
    if (action.outcome === "longpass" && previousPitch.longPassUsed) throw new Error("Long pass already used in this drive");
    pitch = { ...previousPitch };
    if (isAttacker) {
      pitch.attackerThrows++;
      if (action.outcome === "centre") pitch.chainLength = 1;
      if (["linked", "longpass"].includes(action.outcome)) pitch.chainLength++;
      if (action.outcome === "longpass") pitch.longPassUsed = true;
    } else {
      pitch.defenderThrows++;
      if (action.outcome === "block") pitch.blocks++;
    }
    if (action.outcome === "goal") {
      scores[current.id]++;
      if (scores[current.id] >= 5) winnerId = current.id;
    }
    const completedDrive = action.outcome === "goal" || (!isAttacker && pitch.defenderThrows === 6 && pitch.attackerThrows === 6);
    if (completedDrive && !winnerId) {
      // MSS rotation: switch roles between attempts to give both sides an opportunity to attack.
      const nextAttackerId = pitch.attackerId === a ? b : a;
      pitch = { attackerId: nextAttackerId, attackerThrows: 0, defenderThrows: 0, chainLength: 0, blocks: 0, longPassUsed: false, drive: pitch.drive + 1 };
      nextPlayerIndex = ids.indexOf(nextAttackerId);
    } else nextPlayerIndex = (prev.nextPlayerIndex + 1) % 2;
    explanation = `${current.name} (${isAttacker ? "attaque" : "défense"}) : ${action.outcome}${action.outcome === "goal" ? " · BUT !" : ""}${completedDrive && !winnerId ? " · nouveau duel" : ""}`;
  } else if (prev.mode === "classic" && action.kind === "classic") {
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
  } else if (prev.mode === "battle" && action.kind === "battle") {
    const [a, b] = ids;
    const countA = action.stuck?.[a], countB = action.stuck?.[b];
    if (!integerBetween(countA, 0, prev.dartsPerPlayer) || !integerBetween(countB, 0, prev.dartsPerPlayer)) throw new Error("Invalid Battle dart counts");
    if (typeof action.jackStuck !== "boolean") throw new Error("Specify whether the black jack stuck");
    const tied = countA === countB;
    if (tied && !ids.includes(action.tieWinnerId ?? "")) throw new Error("Choose the rock-paper-scissors winner");
    if (!tied && action.tieWinnerId) throw new Error("Tie breaker only applies on equal counts");
    const jackThrowerId = tied ? action.tieWinnerId : countA > countB ? a : b;
    if (action.jackStuck && (countA + countB > 0) && !ids.includes(action.closestPlayerId ?? "")) throw new Error("Choose the dart closest to the black jack");
    if (!action.jackStuck && action.closestPlayerId) throw new Error("No closest dart without a stuck black jack");
    if (action.closestPlayerId && (action.stuck[action.closestPlayerId] ?? 0) === 0) throw new Error("Closest player must have a stuck coloured dart");
    const roundWinner = action.jackStuck && countA + countB > 0 ? action.closestPlayerId : undefined;
    if (roundWinner) {
      scores[roundWinner] += 1; // MSS match format: first to N round victories.
      if (scores[roundWinner] >= (prev.victoryTarget ?? 3)) winnerId = roundWinner;
    }
    explanation = `${prev.players.find(p => p.id === jackThrowerId)?.name} lance la noire (${countA}-${countB}) · ${roundWinner ? `${prev.players.find(p => p.id === roundWinner)?.name} gagne la manche` : "manche sans point"}`;
  } else if (prev.mode === "sniper" && action.kind === "sniper") {
    if (!["miss", "mega", "ultimate"].includes(action.outcome)) throw new Error("Invalid Sniper result");
    if (action.outcome !== "miss" && !ids.includes(action.playerId ?? "")) throw new Error("Choose the Sniper winner");
    if (action.outcome === "miss" && action.playerId) throw new Error("No winner for a failed attempt");
    if (action.outcome !== "miss") {
      winnerId = action.playerId!;
      scores[winnerId] = 1; // Instant victory; no arbitrary 13/21 points.
    }
    explanation = winnerId ? `${prev.players.find(p => p.id === winnerId)?.name} · ${action.outcome === "ultimate" ? "ULTIMATE TRICK : double empilement !" : "ventouse posée sur la Mega dart !"}` : "Aucune ventouse empilée : le défi continue";
  } else if (prev.mode === "conquest" && action.kind === "conquest") {
    const [a, b] = ids;
    const countA = action.stuck?.[a], countB = action.stuck?.[b];
    if (!TOSSIT_COLORS.includes(action.color as typeof TOSSIT_COLORS[number]) || !integerBetween(action.required, 1, prev.dartsPerPlayer) ||
      !integerBetween(countA, 0, prev.dartsPerPlayer) || !integerBetween(countB, 0, prev.dartsPerPlayer)) throw new Error("Invalid Color Conquest target");
    const qualifies = ids.filter(id => action.stuck[id] >= action.required);
    if (qualifies.length === 2 && !ids.includes(action.firstId ?? "")) throw new Error("Choose which team completed the target first");
    if (qualifies.length < 2 && action.firstId) throw new Error("Tie-breaker is only for two successful teams");
    const roundWinner = qualifies.length === 2 ? action.firstId : qualifies[0];
    if (roundWinner) {
      scores[roundWinner] += 1;
      if (scores[roundWinner] >= (prev.victoryTarget ?? 5)) winnerId = roundWinner;
    }
    explanation = `${action.required} ${action.color.toLowerCase()} · ${countA}-${countB} · ${roundWinner ? `${prev.players.find(p => p.id === roundWinner)?.name} +1 manche` : "objectif non atteint"}`;
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
  return { ...prev, scores, board, cornholeBusted, pitch, events: [...prev.events, event], nextPlayerIndex, winnerId, finished: !!winnerId || finishAsDraw, previous: prev };
}

export function undoTossitAction(state: TossitState): TossitState { return state.previous ?? state; }
export function summaryForTossit(state: TossitState) {
  return { finished: state.finished, sport: "tossit", mode: state.mode, scores: { ...state.scores }, rounds: state.events.length, winnerId: state.winnerId, draw: state.finished && !state.winnerId,
    gridSize: state.mode === "tictac" ? state.gridSize : undefined,
    victoryTarget: ["battle", "conquest"].includes(state.mode) ? (state.victoryTarget ?? (state.mode === "battle" ? 3 : 5)) : undefined,
    cornholeBusted: state.mode === "cornhole" ? state.cornholeBusted : undefined,
    footballDrive: state.mode === "football_pitch" ? state.pitch.drive : undefined,
    perPlayer: state.players.map((p) => ({ id: p.id, playerId: p.id, name: p.name, points: state.scores[p.id] ?? 0 })) };
}
