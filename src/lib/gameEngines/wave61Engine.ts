// @ts-nocheck
import type { GameDart, Player } from "../types-game";
import { getWave61Preset, type Wave61Family } from "../../games/dartsWave61Families";

export type Wave61Difficulty = "easy" | "normal" | "hard";
export type Wave61ParticipantMode = "players" | "teams";
export type Wave61Config = {
  modeId: string;
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botLevel: Wave61Difficulty;
  difficulty: Wave61Difficulty;
  participantMode: Wave61ParticipantMode;
  teamByPlayer?: Record<string, string>;
  rounds: number;
  goal: number;
  lives: number;
  scoreInputMethod: "keypad" | "dartboard";
  randomOrder?: boolean;
};

export type Wave61PlayerStats = {
  darts: number;
  visits: number;
  rawPoints: number;
  score: number;
  progress: number;
  hits: number;
  misses: number;
  bulls: number;
  doubles: number;
  triples: number;
  bestVisit: number;
  combo: number;
  bestCombo: number;
  damage: number;
  damageTaken: number;
  safeReveals: number;
};

export type Wave61Target =
  | { kind: "number"; value: number; label: string }
  | { kind: "double"; label: string }
  | { kind: "triple"; label: string }
  | { kind: "bull"; label: string }
  | { kind: "replicate"; darts: GameDart[]; label: string }
  | null;

export type Wave61Visit = {
  id: string;
  playerId: string;
  round: number;
  turn: number;
  darts: GameDart[];
  visitScore: number;
  delta: number;
  hits: number;
  events: string[];
  targetLabel?: string;
};

export type Wave61State = {
  sport: "darts";
  mode: "wave61";
  modeId: string;
  family: Wave61Family;
  config: Wave61Config;
  players: Player[];
  activePlayerIndex: number;
  roundIndex: number;
  turnIndex: number;
  phase: "playing" | "finished";
  winnerId: string | null;
  winnerTeamId: string | null;
  scores: Record<string, number>;
  progress: Record<string, number>;
  health: Record<string, number>;
  lives: Record<string, number>;
  eliminated: Record<string, boolean>;
  teamScores: Record<string, number>;
  statsByPlayer: Record<string, Wave61PlayerStats>;
  visits: Wave61Visit[];
  special: any;
  startedAt: number;
  finishedAt?: number;
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function uid(prefix = "wave61") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function hashText(value: string) { let h = 2166136261; for (const ch of String(value || "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h >>> 0); }

export function wave61DartScore(d: GameDart): number {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "IB") return 50;
  if (d.bed === "OB") return 25;
  const n = Number(d.number || 0);
  return n * (d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1);
}

export function wave61DartLabel(d: GameDart): string {
  if (!d || d.bed === "MISS") return "MISS";
  if (d.bed === "IB") return "DBULL";
  if (d.bed === "OB") return "BULL";
  return `${d.bed}${d.number || ""}`;
}

function blankStats(): Wave61PlayerStats {
  return { darts: 0, visits: 0, rawPoints: 0, score: 0, progress: 0, hits: 0, misses: 0, bulls: 0, doubles: 0, triples: 0, bestVisit: 0, combo: 0, bestCombo: 0, damage: 0, damageTaken: 0, safeReveals: 0 };
}

export function normalizeWave61Config(modeId: string, raw: any): Wave61Config {
  const preset = getWave61Preset(modeId);
  const selectedIds = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  const difficulty: Wave61Difficulty = raw?.difficulty === "easy" || raw?.difficulty === "hard" ? raw.difficulty : "normal";
  const botLevel: Wave61Difficulty = raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : difficulty;
  return {
    modeId,
    selectedIds,
    players: Math.max(preset.minPlayers, Number(raw?.players || selectedIds.length || preset.minPlayers)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botLevel,
    difficulty,
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    teamByPlayer: raw?.teamByPlayer && typeof raw.teamByPlayer === "object" ? raw.teamByPlayer : {},
    rounds: clamp(Number(raw?.rounds || preset.defaultRounds), 1, 60),
    goal: Math.max(0, Number(raw?.goal ?? preset.defaultGoal) || 0),
    lives: Math.max(0, Number(raw?.lives ?? preset.defaultLives) || 0),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    randomOrder: raw?.randomOrder !== false,
  };
}

function mineMap(modeId: string): number[] {
  const offset = hashText(modeId) % 20;
  const base = [2, 6, 10, 14, 18];
  return base.map((v) => ((v + offset - 1) % 20) + 1);
}

function codeSequence(modeId: string): number[] {
  const seed = hashText(modeId);
  return [0, 1, 2, 3].map((i) => ((seed >> (i * 4)) % 20) + 1);
}

export function createWave61State(playersRaw: Player[], modeId: string, rawConfig: any): Wave61State {
  const config = normalizeWave61Config(modeId, rawConfig);
  const preset = getWave61Preset(modeId);
  const players = (playersRaw || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const ids = players.map((p) => p.id);
  const teamByPlayer = { ...(config.teamByPlayer || {}) };
  if (config.participantMode === "teams") ids.forEach((id, i) => { if (!teamByPlayer[id]) teamByPlayer[id] = i % 2 === 0 ? "A" : "B"; });
  config.teamByPlayer = teamByPlayer;
  const teamIds = Array.from(new Set(Object.values(teamByPlayer).filter(Boolean)));
  return {
    sport: "darts",
    mode: "wave61",
    modeId,
    family: preset.family,
    config,
    players,
    activePlayerIndex: 0,
    roundIndex: 0,
    turnIndex: 0,
    phase: "playing",
    winnerId: null,
    winnerTeamId: null,
    scores: Object.fromEntries(ids.map((id) => [id, 0])),
    progress: Object.fromEntries(ids.map((id) => [id, 0])),
    health: Object.fromEntries(ids.map((id) => [id, 100])),
    lives: Object.fromEntries(ids.map((id) => [id, config.lives || 0])),
    eliminated: Object.fromEntries(ids.map((id) => [id, false])),
    teamScores: Object.fromEntries(teamIds.map((id) => [id, 0])),
    statsByPlayer: Object.fromEntries(ids.map((id) => [id, blankStats()])),
    visits: [],
    special: {
      mines: modeId === "demineur" ? mineMap(modeId) : [],
      revealed: [],
      safeByPlayer: {},
      board: modeId === "align_4" ? Array.from({ length: 6 }, () => Array(7).fill(null)) : null,
      lastVisitDarts: [],
      secretCode: modeId === "codebreaker" ? codeSequence(modeId) : [],
      codeHits: {},
    },
    startedAt: Date.now(),
  };
}

export function cloneWave61State(state: Wave61State): Wave61State { return clone(state); }

function targetSequenceIndex(state: Wave61State) { return state.roundIndex + state.activePlayerIndex + state.turnIndex; }

export function getWave61Target(state: Wave61State): Wave61Target {
  if (!state || state.phase === "finished") return null;
  if (state.modeId === "replicat" && Array.isArray(state.special?.lastVisitDarts) && state.special.lastVisitDarts.length) {
    return { kind: "replicate", darts: state.special.lastVisitDarts.slice(0, 3), label: `Copier ${state.special.lastVisitDarts.slice(0, 3).map(wave61DartLabel).join(" · ")}` };
  }
  if (state.modeId === "double_down") {
    const seq: any[] = [15, 16, "double", 17, 18, "triple", 19, 20, "bull"];
    const item = seq[Math.min(state.roundIndex, seq.length - 1)];
    if (item === "double") return { kind: "double", label: "N'importe quel DOUBLE" };
    if (item === "triple") return { kind: "triple", label: "N'importe quel TRIPLE" };
    if (item === "bull") return { kind: "bull", label: "BULL / DBULL" };
    return { kind: "number", value: item, label: `Secteur ${item}` };
  }
  const preset = getWave61Preset(state.modeId);
  if (!preset.targetDriven) return null;
  const preferred = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const idx = (hashText(state.modeId) + targetSequenceIndex(state) * 7) % preferred.length;
  const n = preferred[idx];
  if ((state.roundIndex + hashText(state.modeId)) % 11 === 10) return { kind: "bull", label: "BULL / DBULL" };
  return { kind: "number", value: n, label: `Secteur ${n}` };
}

function dartMatchesTarget(d: GameDart, target: Wave61Target, difficulty: Wave61Difficulty): boolean {
  if (!target || !d || d.bed === "MISS") return false;
  if (target.kind === "number") {
    if (Number(d.number || 0) !== target.value) return false;
    if (difficulty === "hard") return d.bed === "D" || d.bed === "T";
    return true;
  }
  if (target.kind === "double") return d.bed === "D" || d.bed === "IB";
  if (target.kind === "triple") return d.bed === "T";
  if (target.kind === "bull") return d.bed === "OB" || d.bed === "IB";
  return false;
}

function primaryValue(state: Wave61State, playerId: string): number {
  if (state.family === "survival" || state.family === "combat") return Number(state.health[playerId] || 0) + Number(state.lives[playerId] || 0) * 100 + Number(state.scores[playerId] || 0) / 1000;
  if (state.family === "score") return Number(state.scores[playerId] || 0);
  return Number(state.progress[playerId] || 0) * 1000 + Number(state.scores[playerId] || 0);
}

function finishWith(state: Wave61State, playerId: string, teamId: string | null = null) {
  state.phase = "finished";
  state.winnerId = playerId;
  state.winnerTeamId = teamId;
  state.finishedAt = Date.now();
}

function bestPlayer(state: Wave61State): string | null {
  const alive = state.players.filter((p) => !state.eliminated[p.id]);
  const pool = alive.length ? alive : state.players;
  return [...pool].sort((a, b) => primaryValue(state, b.id) - primaryValue(state, a.id))[0]?.id || null;
}

function refreshTeamScores(state: Wave61State) {
  if (state.config.participantMode !== "teams") return;
  const teamScores: Record<string, number> = {};
  for (const p of state.players) {
    const team = state.config.teamByPlayer?.[p.id] || "A";
    teamScores[team] = Number(teamScores[team] || 0) + primaryValue(state, p.id);
  }
  state.teamScores = teamScores;
}

function checkFour(board: any[][], token: string): boolean {
  const H = board.length, W = board[0]?.length || 0;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++) if (board[r][c] === token) for (const [dr,dc] of dirs) {
    let ok = true;
    for (let k=1;k<4;k++) { const rr=r+dr*k, cc=c+dc*k; if (rr<0||rr>=H||cc<0||cc>=W||board[rr][cc]!==token) { ok=false; break; } }
    if (ok) return true;
  }
  return false;
}

function placeAlign4(state: Wave61State, playerId: string, dart: GameDart, events: string[]): boolean {
  if (!state.special?.board || !dart || dart.bed === "MISS") return false;
  const raw = dart.bed === "OB" || dart.bed === "IB" ? 7 : Number(dart.number || 1);
  const col = ((raw - 1) % 7 + 7) % 7;
  const token = state.config.participantMode === "teams" ? String(state.config.teamByPlayer?.[playerId] || "A") : playerId;
  for (let r = 5; r >= 0; r--) {
    if (!state.special.board[r][col]) {
      state.special.board[r][col] = token;
      events.push(`Jeton posé en colonne ${col + 1}`);
      return checkFour(state.special.board, token);
    }
  }
  events.push(`Colonne ${col + 1} pleine`);
  return false;
}

function processMinefield(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const revealed = new Set<number>((state.special?.revealed || []).map(Number));
  const mines = new Set<number>((state.special?.mines || []).map(Number));
  let delta = 0, hits = 0;
  for (const d of darts) {
    const n = d?.bed === "OB" || d?.bed === "IB" ? 20 : Number(d?.number || 0);
    if (!n || revealed.has(n)) continue;
    revealed.add(n);
    if (mines.has(n)) {
      state.health[playerId] = Math.max(0, Number(state.health[playerId] || 100) - 35);
      events.push(`💥 Mine sur ${n}`);
    } else {
      hits += 1;
      delta += 1;
      state.statsByPlayer[playerId].safeReveals += 1;
      events.push(`✓ Case ${n} sécurisée`);
    }
  }
  state.special.revealed = [...revealed];
  state.progress[playerId] = Number(state.progress[playerId] || 0) + delta;
  return { delta, hits };
}

function applySurvivalDamage(state: Wave61State, playerId: string, damage: number, events: string[]) {
  if (damage <= 0) return;
  const st = state.statsByPlayer[playerId];
  st.damageTaken += damage;
  state.health[playerId] = Math.max(0, Number(state.health[playerId] || 100) - damage);
  if (state.health[playerId] <= 0) {
    if (Number(state.lives[playerId] || 0) > 1) {
      state.lives[playerId] -= 1;
      state.health[playerId] = 100;
      events.push(`❤️ Vie perdue · ${state.lives[playerId]} restante(s)`);
    } else if (Number(state.lives[playerId] || 0) === 1) {
      state.lives[playerId] = 0;
      state.eliminated[playerId] = true;
      events.push("☠️ Éliminé");
    } else if (state.family === "combat") {
      state.eliminated[playerId] = true;
      events.push("☠️ K.O.");
    }
  }
}

function attackNextOpponent(state: Wave61State, attackerId: string, amount: number, events: string[]) {
  if (amount <= 0) return;
  const attackerTeam = state.config.teamByPlayer?.[attackerId];
  const targets = state.players.filter((p) => p.id !== attackerId && !state.eliminated[p.id] && (state.config.participantMode !== "teams" || state.config.teamByPlayer?.[p.id] !== attackerTeam));
  if (!targets.length) return;
  const target = targets[(state.turnIndex + hashText(attackerId)) % targets.length];
  state.health[target.id] = Math.max(0, Number(state.health[target.id] || 100) - amount);
  state.statsByPlayer[attackerId].damage += amount;
  state.statsByPlayer[target.id].damageTaken += amount;
  events.push(`⚔️ ${amount} dégâts à ${target.name}`);
  if (state.health[target.id] <= 0) { state.eliminated[target.id] = true; events.push(`☠️ ${target.name} K.O.`); }
}

function scoreReplicat(state: Wave61State, darts: GameDart[]): { hits: number; delta: number; events: string[] } {
  const target = Array.isArray(state.special?.lastVisitDarts) ? state.special.lastVisitDarts : [];
  if (!target.length) return { hits: darts.filter((d) => wave61DartScore(d) > 0).length, delta: darts.reduce((s,d)=>s+wave61DartScore(d),0), events: ["Séquence de référence créée"] };
  let hits = 0;
  const events: string[] = [];
  for (let i = 0; i < Math.min(3, darts.length, target.length); i++) {
    const exact = wave61DartLabel(darts[i]) === wave61DartLabel(target[i]);
    if (exact) hits++;
  }
  const delta = hits * 10;
  events.push(`${hits}/${Math.min(3, target.length)} reproduit(s)`);
  return { hits, delta, events };
}

export function playWave61Visit(input: Wave61State, dartsRaw: GameDart[]): Wave61State {
  const state = cloneWave61State(input);
  if (state.phase !== "playing" || !state.players.length) return state;
  const darts = (dartsRaw || []).slice(0, 3);
  const player = state.players[state.activePlayerIndex];
  if (!player || state.eliminated[player.id]) return advanceWave61Turn(state);
  const st = state.statsByPlayer[player.id] || (state.statsByPlayer[player.id] = blankStats());
  const target = getWave61Target(state);
  const visitScore = darts.reduce((sum, d) => sum + wave61DartScore(d), 0);
  const events: string[] = [];
  let hits = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length : darts.filter((d) => wave61DartScore(d) > 0).length;
  let delta = 0;

  st.visits += 1;
  st.rawPoints += visitScore;
  st.bestVisit = Math.max(st.bestVisit, visitScore);
  for (const d of darts) {
    st.darts += 1;
    if (!d || d.bed === "MISS") st.misses += 1;
    if (d?.bed === "D") st.doubles += 1;
    if (d?.bed === "T") st.triples += 1;
    if (d?.bed === "OB" || d?.bed === "IB") st.bulls += 1;
  }

  if (state.modeId === "align_4") {
    let won = false;
    for (const d of darts) { if (placeAlign4(state, player.id, d, events)) { won = true; break; } }
    delta = darts.filter((d) => d?.bed !== "MISS").length;
    if (won) finishWith(state, player.id, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[player.id] || null : null);
  } else if (state.modeId === "demineur") {
    const mineResult = processMinefield(state, player.id, darts, events); delta = mineResult.delta; hits = mineResult.hits;
    if (state.health[player.id] <= 0) state.eliminated[player.id] = true;
    const safeCount = 20 - (state.special?.mines?.length || 0);
    if ((state.special?.revealed || []).length >= 20 || Number(state.progress[player.id] || 0) >= safeCount) finishWith(state, bestPlayer(state) || player.id);
  } else if (state.modeId === "replicat") {
    const res = scoreReplicat(state, darts); hits = res.hits; delta = res.delta; events.push(...res.events); state.progress[player.id] += delta; state.scores[player.id] += delta;
    if (state.progress[player.id] >= state.config.goal) finishWith(state, player.id);
  } else if (state.modeId === "double_down") {
    if (hits <= 0) { state.scores[player.id] = Math.floor(Number(state.scores[player.id] || 0) / 2); events.push("Score divisé par deux"); }
    else { delta = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).reduce((sum,d)=>sum+wave61DartScore(d),0); state.scores[player.id] += delta; events.push(`+${delta} sur le contrat`); }
  } else if (state.modeId === "nine_dart_century") {
    const projected = Number(state.scores[player.id] || 0) + visitScore;
    if (projected > state.config.goal) { events.push(`BUST au-dessus de ${state.config.goal}`); delta = 0; }
    else { delta = visitScore; state.scores[player.id] = projected; }
    if (state.scores[player.id] === state.config.goal) finishWith(state, player.id);
  } else if (state.modeId === "codebreaker") {
    const secret = state.special?.secretCode || [];
    const guessed = darts.map((d) => Number(d?.number || (d?.bed === "IB" || d?.bed === "OB" ? 20 : 0))).filter(Boolean);
    let exact = 0, present = 0;
    guessed.forEach((n, i) => { if (secret[i] === n) exact++; else if (secret.includes(n)) present++; });
    delta = exact * 2 + present;
    state.progress[player.id] += delta;
    state.scores[player.id] += delta * 10;
    events.push(`${exact} exact(s) · ${present} présent(s)`);
    if (exact >= Math.min(3, secret.length) || state.progress[player.id] >= state.config.goal) finishWith(state, player.id);
  } else {
    switch (state.family) {
      case "score": {
        delta = visitScore;
        state.scores[player.id] += delta;
        events.push(`+${delta} points`);
        break;
      }
      case "precision":
      case "deduction": {
        delta = hits;
        state.progress[player.id] += delta;
        state.scores[player.id] += hits * 25 + Math.floor(visitScore / 10);
        events.push(`${hits}/3 cible(s) validée(s)`);
        if (hits > 0) { st.combo += hits; st.bestCombo = Math.max(st.bestCombo, st.combo); } else st.combo = 0;
        if (state.config.goal > 0 && state.progress[player.id] >= state.config.goal) finishWith(state, player.id);
        break;
      }
      case "rhythm": {
        if (hits > 0) st.combo += hits; else st.combo = 0;
        st.bestCombo = Math.max(st.bestCombo, st.combo);
        delta = hits * (8 + Math.min(12, st.combo));
        state.progress[player.id] += delta;
        state.scores[player.id] += delta;
        events.push(hits ? `🔥 Combo ${st.combo} · +${delta}` : "Combo cassé");
        if (state.progress[player.id] >= state.config.goal) finishWith(state, player.id);
        break;
      }
      case "race":
      case "ascent":
      case "mission":
      case "conquest": {
        const base = hits * (state.family === "ascent" ? 7 : 9) + Math.floor(visitScore / 18);
        const bonus = state.family === "mission" && darts.some((d) => d?.bed === "IB") ? 12 : state.family === "conquest" && darts.some((d) => d?.bed === "T") ? 7 : 0;
        delta = Math.max(0, base + bonus);
        state.progress[player.id] += delta;
        state.scores[player.id] += visitScore;
        events.push(`Progression +${delta}`);
        if (state.progress[player.id] >= state.config.goal) finishWith(state, player.id, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[player.id] || null : null);
        break;
      }
      case "survival": {
        delta = hits * 8 + Math.floor(visitScore / 25);
        state.scores[player.id] += visitScore;
        state.progress[player.id] += delta;
        const missPenalty = hits > 0 ? 0 : (state.config.difficulty === "hard" ? 45 : state.config.difficulty === "easy" ? 20 : 30);
        applySurvivalDamage(state, player.id, missPenalty, events);
        if (hits > 0) events.push(`Zone sûre · +${delta}`);
        break;
      }
      case "combat": {
        const attack = Math.max(0, hits * 10 + Math.floor(visitScore / 12));
        state.scores[player.id] += visitScore;
        delta = attack;
        attackNextOpponent(state, player.id, attack, events);
        break;
      }
      default: break;
    }
  }

  st.score = Number(state.scores[player.id] || 0);
  st.progress = Number(state.progress[player.id] || 0);
  st.hits += hits;
  // Chaque volée devient la référence suivante de REPLICAT ; pour les autres
  // modes cette mémoire sert également aux écrans/timelines sans modifier les règles.
  state.special.lastVisitDarts = darts;
  state.visits.push({ id: uid("wave61-visit"), playerId: player.id, round: state.roundIndex + 1, turn: state.turnIndex + 1, darts, visitScore, delta, hits, events, targetLabel: target?.label });
  refreshTeamScores(state);

  if (state.phase === "playing" && (state.family === "survival" || state.family === "combat")) {
    const alive = state.players.filter((p) => !state.eliminated[p.id]);
    if (state.config.participantMode === "teams") {
      const aliveTeams = Array.from(new Set(alive.map((p) => state.config.teamByPlayer?.[p.id] || "A")));
      if (aliveTeams.length === 1 && state.players.length > 1) finishWith(state, alive.find((p) => (state.config.teamByPlayer?.[p.id] || "A") === aliveTeams[0])?.id || player.id, aliveTeams[0]);
    } else if (alive.length === 1 && state.players.length > 1) finishWith(state, alive[0].id);
  }

  if (state.phase === "playing") return advanceWave61Turn(state);
  return state;
}

function advanceWave61Turn(state: Wave61State): Wave61State {
  if (state.phase !== "playing" || !state.players.length) return state;
  let next = state.activePlayerIndex;
  for (let i = 0; i < state.players.length; i++) {
    next = (next + 1) % state.players.length;
    if (!state.eliminated[state.players[next].id]) break;
  }
  const wrapped = next <= state.activePlayerIndex;
  state.activePlayerIndex = next;
  state.turnIndex += 1;
  if (wrapped) state.roundIndex += 1;
  if (state.roundIndex >= state.config.rounds && state.phase === "playing") {
    const winner = bestPlayer(state);
    if (winner) finishWith(state, winner, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[winner] || null : null);
  }
  return state;
}

function missNear(target: Wave61Target): GameDart {
  if (target?.kind === "number") return { bed: "S", number: target.value === 20 ? 1 : target.value + 1 };
  return { bed: "S", number: 1 + Math.floor(Math.random() * 20) };
}

export function pickWave61BotDarts(state: Wave61State, level: Wave61Difficulty = "normal"): GameDart[] {
  const target = getWave61Target(state);
  const chance = level === "hard" ? 0.86 : level === "easy" ? 0.50 : 0.69;
  if (state.modeId === "demineur") {
    const revealed = new Set<number>((state.special?.revealed || []).map(Number));
    const mines = new Set<number>((state.special?.mines || []).map(Number));
    const safe = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !revealed.has(n) && (level === "hard" ? !mines.has(n) : true));
    return safe.slice(0, 3).map((n) => ({ bed: "S", number: n } as GameDart));
  }
  if (state.modeId === "align_4") {
    return [4, 4, 3].map((n) => ({ bed: "S", number: n } as GameDart));
  }
  if (target?.kind === "replicate") {
    return target.darts.slice(0, 3).map((d) => Math.random() < chance ? d : missNear({ kind: "number", value: Number(d.number || 20), label: "" }));
  }
  const out: GameDart[] = [];
  for (let i = 0; i < 3; i++) {
    const hit = Math.random() < chance;
    if (!target) out.push(hit ? { bed: Math.random() < 0.45 ? "T" : "S", number: 20 } : missNear(null));
    else if (!hit) out.push(missNear(target));
    else if (target.kind === "number") out.push({ bed: level === "hard" ? "T" : Math.random() < 0.35 ? "D" : "S", number: target.value });
    else if (target.kind === "double") out.push({ bed: "D", number: 10 + (i % 3) });
    else if (target.kind === "triple") out.push({ bed: "T", number: 18 + (i % 3) });
    else if (target.kind === "bull") out.push({ bed: level === "hard" ? "IB" : "OB" });
  }
  return out;
}

export function wave61PrimaryMetric(state: Wave61State, playerId: string): { value: number; label: string; sub: string } {
  const stats = state.statsByPlayer[playerId] || blankStats();
  if (state.family === "score") return { value: Number(state.scores[playerId] || 0), label: "PTS", sub: `best ${stats.bestVisit}` };
  if (state.family === "survival") return { value: Number(state.health[playerId] || 0), label: "PV", sub: `${state.lives[playerId] || 0} vie(s) · ${state.scores[playerId] || 0} pts` };
  if (state.family === "combat") return { value: Number(state.health[playerId] || 0), label: "PV", sub: `${stats.damage || 0} dégâts` };
  return { value: Math.round(Number(state.progress[playerId] || 0)), label: "PROG", sub: `${state.scores[playerId] || 0} pts · ${stats.hits || 0} hits` };
}
