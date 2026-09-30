// @ts-nocheck
import type { GameDart, Player } from "../types-game";
import { getWave61Preset, type Wave61Family } from "../../games/dartsWave61Families";

// Legacy audit markers preserved: WAVE61_ENGINE_VERSION = 9, WAVE61_ENGINE_VERSION = 10, WAVE61_ENGINE_VERSION = 11, WAVE61_ENGINE_VERSION = 12, WAVE61_ENGINE_VERSION = 13, WAVE61_ENGINE_VERSION = 14, WAVE61_ENGINE_VERSION = 15, WAVE61_ENGINE_VERSION = 16, WAVE61_ENGINE_VERSION = 17.
export const WAVE61_ENGINE_VERSION = 18;

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
  modeOptions?: Record<string, any>;
  targetAdviceEnabled?: boolean;
  awenaCommentaryEnabled?: boolean;
  wave61SfxEnabled?: boolean;
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
  | { kind: "exact"; number?: number; bed: "S" | "D" | "T" | "OB" | "IB"; label: string }
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
  const forcedRounds = modeId === "nine_dart_century" ? 3 : modeId === "double_down" ? 9 : modeId === "athletisme" ? 6 : null;
  const forcedGoal = modeId === "nine_dart_century" ? 100 : modeId === "shove_a_penny" ? 7 * clamp(Number(raw?.modeOptions?.marksPerBox || 3), 2, 5) : modeId === "green_vs_red" ? clamp(Number(raw?.modeOptions?.finishSteps || 10), 3, 10) : null;
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
    rounds: forcedRounds ?? clamp(Number(raw?.rounds || preset.defaultRounds), 1, 60),
    goal: forcedGoal ?? Math.max(0, Number(raw?.goal ?? preset.defaultGoal) || 0),
    lives: Math.max(0, Number(raw?.lives ?? preset.defaultLives) || 0),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    randomOrder: raw?.randomOrder !== false,
    modeOptions: raw?.modeOptions && typeof raw.modeOptions === "object" ? { ...raw.modeOptions } : {},
    targetAdviceEnabled: raw?.targetAdviceEnabled !== false,
    awenaCommentaryEnabled: raw?.awenaCommentaryEnabled !== false,
    wave61SfxEnabled: raw?.wave61SfxEnabled !== false,
  };
}

function seededNumbers(seedText: string, count: number, max = 20): number[] {
  const out: number[] = [];
  let seed = hashText(seedText) || 1;
  let guard = 0;
  while (out.length < count && guard++ < 500) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const n = (seed % max) + 1;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

function modeOptionNumber(config: Wave61Config, key: string, fallback: number, min = -Infinity, max = Infinity): number {
  const raw = Number(config?.modeOptions?.[key]);
  const value = Number.isFinite(raw) ? raw : fallback;
  return clamp(value, min, max);
}

function modeOptionBool(config: Wave61Config, key: string, fallback = false): boolean {
  const raw = config?.modeOptions?.[key];
  return raw == null ? fallback : raw === true || raw === "true" || raw === 1 || raw === "1";
}

function mineMap(seedText: string, count = 5): number[] {
  return seededNumbers(`mines:${seedText}`, clamp(Math.round(count), 2, 9), 20).sort((a, b) => a - b);
}

function codeSequence(seedText: string, length = 3, allowRepeats = false): number[] {
  const size = clamp(Math.round(length), 2, 3);
  return allowRepeats ? seededSequence(`code:${seedText}`, size, 20) : seededNumbers(`code:${seedText}`, size, 20);
}

function colinSequence(seedText: string, length = 6): number[] {
  return seededNumbers(`colin:${seedText}`, clamp(Math.round(length), 3, 10), 20);
}

function faceSecret(seedText: string): number {
  return seededNumbers(`face:${seedText}`, 1, 20)[0] || 1;
}

function seededSequence(seedText: string, count: number, max = 20): number[] {
  const out: number[] = [];
  let seed = hashText(seedText) || 1;
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    out.push((seed % max) + 1);
  }
  return out;
}

const SHOVE_TARGETS = [15, 16, 17, 18, 19, 20, 25] as const;
const RED_RING = [20, 18, 13, 10, 2, 3, 7, 8, 14, 12] as const;
const GREEN_RING = [1, 4, 6, 15, 17, 19, 16, 11, 9, 5] as const;

function blankShoveMarks() {
  return Object.fromEntries(SHOVE_TARGETS.map((n) => [String(n), 0]));
}

function sniperContracts(seedText: string, count = 12): Array<{ number?: number; bed: "S" | "D" | "T" | "OB" | "IB" }> {
  const nums = seededSequence(`sniper:${seedText}`, count, 20);
  const beds: Array<"S" | "D" | "T"> = ["S", "D", "T"];
  return nums.map((number, i) => {
    if ((i + 1) % 6 === 0) return { bed: i % 12 === 5 ? "IB" : "OB" };
    return { number, bed: beds[(hashText(`${seedText}:${i}`) + i) % beds.length] };
  });
}

function greenRedColorForIndex(index: number): "RED" | "GREEN" {
  return index % 2 === 0 ? "RED" : "GREEN";
}

function exactTargetLabel(contract: { number?: number; bed: string }): string {
  if (contract.bed === "IB") return "DBULL";
  if (contract.bed === "OB") return "BULL";
  return `${contract.bed}${contract.number || ""}`;
}

const ATHLETICS_DISCIPLINES = ["SPRINT", "HAIES", "LONGUEUR", "HAUTEUR", "JAVELOT", "RELAIS"] as const;
const ROLLER_SECTIONS = [
  { name: "MONTÉE", target: 20, danger: false },
  { name: "DROP", target: 5, danger: false },
  { name: "LOOPING", target: 12, danger: true },
  { name: "VIRAGE", target: 18, danger: true },
  { name: "SPRINT FINAL", target: 7, danger: false },
] as const;
const TYROLIEN_STAGES = [
  { name: "DÉPART", target: 20 },
  { name: "FORÊT", target: 18 },
  { name: "RAVIN", target: 13 },
  { name: "VENT", target: 6 },
  { name: "ARRIVÉE", target: 15 },
] as const;

const HEIST_STAGES = ["REPÉRAGE", "EFFRACTION", "COFFRE", "FUITE"] as const;
const ESCAPE_STAGES = ["CODE", "CLÉ", "LASER", "PORTAIL", "SORTIE"] as const;
const LUNAR_PHASES = ["CARBURANT", "LANCEMENT", "ORBITE", "ALUNISSAGE"] as const;
const HOLLYWOOD_SCENES = ["CASTING", "ACTION", "CASCADE", "DRAME", "PREMIÈRE", "OSCARS"] as const;
const MAYA_CYCLES = ["JAGUAR", "SOLEIL", "PLUIE", "SERPENT", "TEMPLE"] as const;
const PYRAMID_CHAMBERS = ["ENTRÉE", "GALERIE", "PIÈGES", "CHAMBRE ROYALE", "SARCOPHAGE"] as const;
const MYTH_GODS = ["ATHÉNA", "HERMÈS", "ARÈS", "POSÉIDON", "HADÈS", "ZEUS"] as const;
const MICRO_SAMPLES = ["CELLULE", "BACTÉRIE", "POLLEN", "SPORE", "CRISTAL", "ADN"] as const;
const CIRCUIT_NAMES = ["ALIM", "MOTEUR", "ÉCLAIRAGE", "CAPTEUR", "RELAIS", "SORTIE"] as const;
const BAC_CATEGORIES = ["PRÉNOM", "VILLE", "ANIMAL", "OBJET", "SPORT", "MÉTIER"] as const;
const BAC_LETTERS = ["A","B","C","D","E","F","G","H","I","J","L","M","N","O","P","R","S","T","V","Z"] as const;

const MONT_BLANC_STAGES = [
  { name: "DÉPART", altitude: 0 },
  { name: "REFUGE", altitude: 1400 },
  { name: "GLACIER", altitude: 2600 },
  { name: "ARÊTE", altitude: 3800 },
  { name: "SOMMET", altitude: 4809 },
] as const;
const EVEREST_STAGES = [
  { name: "BASE CAMP", altitude: 0 },
  { name: "CAMP I", altitude: 5900 },
  { name: "CAMP II", altitude: 6500 },
  { name: "CAMP III", altitude: 7300 },
  { name: "CAMP IV", altitude: 7950 },
  { name: "BALCONY", altitude: 8400 },
  { name: "SOMMET", altitude: 8849 },
] as const;
const SUMMIT_14_PEAKS = [
  "SHISHAPANGMA", "GASHERBRUM II", "BROAD PEAK", "GASHERBRUM I",
  "ANNAPURNA I", "NANGA PARBAT", "MANASLU", "DHAULAGIRI I",
  "CHO OYU", "MAKALU", "LHOTSE", "KANGCHENJUNGA", "K2", "EVEREST",
] as const;

function ascentStages(modeId: string) {
  return modeId === "everest" ? EVEREST_STAGES : MONT_BLANC_STAGES;
}
function ascentSummitAltitude(modeId: string): number {
  return modeId === "everest" ? 8849 : 4809;
}
function ascentStageForAltitude(modeId: string, altitude: number): number {
  const stages = ascentStages(modeId);
  let idx = 0;
  for (let i = 0; i < stages.length; i++) if (altitude >= stages[i].altitude) idx = i;
  return idx;
}
function ascentWeather(state: Wave61State): { label: string; penalty: number; fatigue: number } {
  const cycle = Array.isArray(state.special?.ascentWeatherCycle) ? state.special.ascentWeatherCycle : [];
  const raw = Number(cycle[(state.turnIndex + state.roundIndex) % Math.max(1, cycle.length)] || 10);
  const intensity = modeOptionNumber(state?.config, "weatherSeverity", 100, 70, 150) / 100;
  const scaled = (label: string, penalty: number, fatigue: number) => ({ label, penalty: Math.min(0.75, penalty * intensity), fatigue: Math.round(fatigue * intensity) });
  if (raw >= 18) return scaled("TEMPÊTE", 0.48, 18);
  if (raw >= 14) return scaled("VENT FORT", 0.28, 10);
  if (raw >= 9) return scaled("NUAGEUX", 0.12, 5);
  return scaled("FENÊTRE CLAIRE", 0, 0);
}

function ascentStartingOxygen(modeId: string, config: Wave61Config): number {
  const fallback = modeId === "mont_blanc" ? 100 : 90;
  return modeOptionNumber(config, "oxygenReserve", fallback, 60, 130);
}

function ascentClimbFactor(state: Wave61State): number {
  return modeOptionNumber(state.config, "climbPower", 100, 70, 130) / 100;
}

const CONQUEST_PROFILES: Record<string, { icon: string; label: string; nodes: string[]; threshold: number; win: number; resource: string; ability: string; fort: number }> = {
  vikings: { icon: "🛡️", label: "VIKINGS", nodes: ["FJORD", "PORT", "VILLAGE", "FORT", "TEMPLE", "JARL"], threshold: 5, win: 4, resource: "FUREUR", ability: "RAID DU JARL", fort: 1 },
  black_flag: { icon: "🏴‍☠️", label: "BLACK FLAG", nodes: ["CAYE", "PORT", "ÎLE", "FORT", "GALION", "TRÉSOR"], threshold: 6, win: 4, resource: "BUTIN", ability: "BORDÉE", fort: 2 },
  menhir_mayhem: { icon: "🪨", label: "MENHIR MAYHEM", nodes: ["VILLAGE", "FORÊT", "CARRIÈRE", "CAMP NORD", "CAMP SUD", "FORT"], threshold: 5, win: 4, resource: "POTION", ability: "MENHIR GÉANT", fort: 1 },
  attila: { icon: "🐎", label: "ATTILA", nodes: ["CAMPEMENT", "PLAINE", "PONT", "CITÉ", "FORT", "CAPITALE", "EMPIRE"], threshold: 5, win: 5, resource: "TERREUR", ability: "CHARGE DES HUNS", fort: 1 },
  poseidon: { icon: "🔱", label: "POSÉIDON", nodes: ["RÉCIF", "PORT", "DÉTROIT", "ABYSSES", "TEMPLE", "OCÉAN"], threshold: 6, win: 4, resource: "MARÉE", ability: "TRIDENT", fort: 2 },
  sabaudia_dauphine: { icon: "🏔️", label: "SABAUDIA & DAUPHINÉ", nodes: ["SAVOIE", "HAUTE-SAVOIE", "DAUPHINÉ", "CHAMBÉRY", "GRENOBLE", "MAURIENNE", "TARENTAISE", "VERCORS"], threshold: 5, win: 5, resource: "INFLUENCE", ability: "FORT DES ALPES", fort: 2 },
  galaxies: { icon: "🌌", label: "GALAXIES", nodes: ["NÉBULEUSE", "SYSTÈME A", "SYSTÈME B", "CEINTURE", "LUNE", "MONDE", "PORTAIL", "NOYAU"], threshold: 6, win: 5, resource: "ÉNERGIE", ability: "HYPERDRIVE", fort: 2 },
};

const TROJAN_PHASES = ["BOIS", "ASSEMBLAGE", "SIÈGE", "INFILTRATION", "CITADELLE"] as const;

const FINAL_BUZZER_CHALLENGES = [
  { name: "RAPID 20", kind: "number", number: 20 },
  { name: "DOUBLE RUSH", kind: "double" },
  { name: "BULL PANIC", kind: "bull" },
  { name: "TRIPLE SHOT", kind: "triple" },
  { name: "SECTOR SPRINT", kind: "sequence" },
  { name: "CLUTCH DOUBLE", kind: "double" },
  { name: "BULL OR BUST", kind: "bull" },
  { name: "FINAL SHOT", kind: "sequence" },
] as const;

const JACKPOT_SYMBOLS = ["CHERRY", "LEMON", "BELL", "BAR", "SEVEN", "DIAMOND"] as const;

type ImpossibleContract = { number?: number; bed: "S" | "D" | "T" | "OB" | "IB" };

function impossibleContracts(seedText: string, count: number): ImpossibleContract[] {
  const total = clamp(Math.round(count), 6, 18);
  const nums = seededSequence(`impossible:${seedText}`, total, 20);
  const beds: Array<"S" | "D" | "T"> = ["D", "T", "S", "T"];
  return nums.map((number, index) => {
    if ((index + 1) % 7 === 0) return { bed: "IB" };
    if ((index + 1) % 5 === 0) return { bed: "OB" };
    return { number, bed: beds[(hashText(`${seedText}:impossible:${index}`) + index) % beds.length] };
  });
}

function corbeauRenardRoles(ids: string[], teamByPlayer: Record<string,string>, participantMode: Wave61ParticipantMode) {
  return Object.fromEntries(ids.map((id, index) => [id, participantMode === "teams" ? (String(teamByPlayer[id] || "A") === "B" ? "RENARD" : "CORBEAU") : (index % 2 === 0 ? "CORBEAU" : "RENARD")]));
}

type MafiaRole = "MAFIA" | "DETECTIVE" | "MEDIC" | "CITIZEN";

function mafiaPhase(state: Wave61State): "NIGHT" | "DAY" {
  return Number(state.roundIndex || 0) % 2 === 0 ? "NIGHT" : "DAY";
}
export function wave61MafiaPhase(state: Wave61State): "NIGHT" | "DAY" { return mafiaPhase(state); }

function assignMafiaRoles(ids: string[], seedText: string, teamByPlayer: Record<string, string>, participantMode: Wave61ParticipantMode): Record<string, MafiaRole> {
  if (!ids.length) return {};
  if (participantMode === "teams") {
    const town = ids.filter((id) => String(teamByPlayer[id] || "A") !== "B");
    const roles: Record<string, MafiaRole> = {};
    ids.forEach((id) => { roles[id] = String(teamByPlayer[id] || "A") === "B" ? "MAFIA" : "CITIZEN"; });
    if (town[0]) roles[town[0]] = "DETECTIVE";
    if (town[1]) roles[town[1]] = "MEDIC";
    return roles;
  }
  const ordered = [...ids].sort((a, b) => hashText(`${seedText}:${a}`) - hashText(`${seedText}:${b}`));
  const mafiaCount = Math.max(1, Math.floor(ids.length / 4));
  const roles: Record<string, MafiaRole> = Object.fromEntries(ids.map((id) => [id, "CITIZEN"] as const));
  ordered.slice(0, mafiaCount).forEach((id) => { roles[id] = "MAFIA"; });
  const town = ordered.slice(mafiaCount);
  if (town[0]) roles[town[0]] = "DETECTIVE";
  if (ids.length >= 5 && town[1]) roles[town[1]] = "MEDIC";
  return roles;
}

function finalBuzzerChallenge(state: Wave61State) {
  const index = Number(state.roundIndex || 0) % FINAL_BUZZER_CHALLENGES.length;
  const base = FINAL_BUZZER_CHALLENGES[index];
  const seq = state.special?.finalBuzzerSequence || [];
  const number = base.kind === "sequence" ? raceTargetFromSequence(seq, index) : Number((base as any).number || 0);
  return { ...base, index, number };
}
export function wave61FinalBuzzerChallenge(state: Wave61State) { return finalBuzzerChallenge(state); }

export function wave61FinalBuzzerCutoff(state: Wave61State): number {
  const fixed = modeOptionNumber(state.config, "fixedCutoff", 0, 0, 3);
  if (fixed >= 1) return fixed;
  const cutoffs = state.special?.finalBuzzerCutoffs || [];
  const raw = Number(cutoffs[Math.max(0, Number(state.turnIndex || 0)) % Math.max(1, cutoffs.length)] || 2);
  return clamp(((raw - 1) % 3) + 1, 1, 3);
}

function jackpotSymbol(d: GameDart): string {
  if (!d || d.bed === "MISS") return "BLANK";
  if (d.bed === "IB" || d.bed === "OB") return "WILD";
  const n = Math.max(1, Number(d.number || 1));
  return JACKPOT_SYMBOLS[(n - 1) % JACKPOT_SYMBOLS.length];
}
export function wave61JackpotSymbol(d: GameDart): string { return jackpotSymbol(d); }


function missionThreshold(difficulty: Wave61Difficulty, easy = 2, normal = 3, hard = 4) {
  return difficulty === "easy" ? easy : difficulty === "hard" ? hard : normal;
}

function missionStageTarget(sequence: any[], step: number): number {
  if (!sequence.length) return 20;
  return Number(sequence[Math.min(Math.max(0, step), sequence.length - 1)] || 20);
}

function bullCount(darts: GameDart[]) {
  return darts.filter((d) => d?.bed === "OB" || d?.bed === "IB").length;
}

function nonBullWrongCount(darts: GameDart[], target: Wave61Target, difficulty: Wave61Difficulty) {
  return darts.filter((d) => d?.bed !== "MISS" && d?.bed !== "OB" && d?.bed !== "IB" && !dartMatchesTarget(d, target, difficulty)).length;
}

const SURVIVAL_TARGET_LENGTH = 160;
const ICEBERG_COMPARTMENTS = 5;

function survivalSequence(seedText: string, key: string) {
  return seededSequence(`${key}:${seedText}`, SURVIVAL_TARGET_LENGTH, 20);
}

function nextEnemy(state: Wave61State, attackerId: string, predicate?: (player: Player) => boolean): Player | null {
  const attackerTeam = state.config.teamByPlayer?.[attackerId];
  const candidates = state.players.filter((p) =>
    p.id !== attackerId &&
    !state.eliminated[p.id] &&
    (state.config.participantMode !== "teams" || state.config.teamByPlayer?.[p.id] !== attackerTeam) &&
    (!predicate || predicate(p))
  );
  if (!candidates.length) return null;
  return candidates[(state.turnIndex + hashText(attackerId)) % candidates.length] || candidates[0] || null;
}

function hotPotatoFuseReset(configOrDifficulty: Wave61Config | Wave61Difficulty): number {
  const difficulty = typeof configOrDifficulty === "string" ? configOrDifficulty : configOrDifficulty.difficulty;
  const fallback = difficulty === "hard" ? 3 : difficulty === "easy" ? 6 : 5;
  return typeof configOrDifficulty === "string" ? fallback : modeOptionNumber(configOrDifficulty, "fuseLength", fallback, 2, 10);
}

function roleSeed(ids: string[], teamByPlayer: Record<string, string>, participantMode: Wave61ParticipantMode, badRole: string, goodRole: string) {
  return Object.fromEntries(ids.map((id, index) => [id, participantMode === "teams" ? (teamByPlayer[id] === "B" ? badRole : goodRole) : (index === 0 ? badRole : goodRole)]));
}

function bedPower(d: GameDart, single = 1, double = 2, triple = 3, outerBull = 2, innerBull = 4): number {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "IB") return innerBull;
  if (d.bed === "OB") return outerBull;
  if (d.bed === "T") return triple;
  if (d.bed === "D") return double;
  return single;
}

function sideByPlayer(ids: string[], teamByPlayer: Record<string, string>, participantMode: Wave61ParticipantMode): Record<string, "A" | "B"> {
  return Object.fromEntries(ids.map((id, index) => [id, participantMode === "teams" ? (String(teamByPlayer[id] || "A") === "B" ? "B" : "A") : (index % 2 === 0 ? "A" : "B")]));
}

function soleilPhase(state: Wave61State): "GO" | "STOP" {
  return ((Number(state.turnIndex || 0) + hashText(String(state.special?.seedText || state.modeId))) % 4) === 3 ? "STOP" : "GO";
}
export function wave61SoleilPhase(state: Wave61State): "GO" | "STOP" { return soleilPhase(state); }

function freefallWindow(difficulty: Wave61Difficulty, config?: Wave61Config) {
  const base = difficulty === "easy" ? { high: 1700, low: 250, fallFactor: 6 } : difficulty === "hard" ? { high: 1000, low: 450, fallFactor: 10 } : { high: 1300, low: 350, fallFactor: 8 };
  const windowFactor = config ? modeOptionNumber(config, "parachuteWindowPct", 100, 60, 160) / 100 : 1;
  return {
    high: Math.round(base.high * windowFactor),
    low: Math.round(base.low / Math.max(.6, windowFactor)),
    fallFactor: base.fallFactor,
  };
}

function raceTargetFromSequence(sequence: any[], index: number): number {
  if (!Array.isArray(sequence) || !sequence.length) return 20;
  return Number(sequence[((Math.max(0, index) % sequence.length) + sequence.length) % sequence.length] || 20);
}

function currentRollerSection(state: Wave61State, playerId: string) {
  const pos = Number(state.special?.rollerPosByPlayer?.[playerId] || 0);
  const goal = Math.max(1, Number(state.config.goal || 100));
  const index = clamp(Math.floor((pos / goal) * ROLLER_SECTIONS.length), 0, ROLLER_SECTIONS.length - 1);
  return { ...ROLLER_SECTIONS[index], index };
}

function currentTyrolienStage(state: Wave61State, playerId: string) {
  const pos = Number(state.special?.tyrolienPosByPlayer?.[playerId] || 0);
  const goal = Math.max(1, Number(state.config.goal || 100));
  const index = clamp(Math.floor((pos / goal) * TYROLIEN_STAGES.length), 0, TYROLIEN_STAGES.length - 1);
  return { ...TYROLIEN_STAGES[index], index };
}

function currentAthleticsDiscipline(state: Wave61State): string {
  return String(ATHLETICS_DISCIPLINES[clamp(Number(state.roundIndex || 0), 0, ATHLETICS_DISCIPLINES.length - 1)] || "SPRINT");
}

export function createWave61State(playersRaw: Player[], modeId: string, rawConfig: any): Wave61State {
  const config = normalizeWave61Config(modeId, rawConfig);
  const preset = getWave61Preset(modeId);
  const players = (playersRaw || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const ids = players.map((p) => p.id);
  const startedAt = Date.now();
  const seedText = `${modeId}:${startedAt}:${ids.join("|")}`;
  const teamByPlayer = { ...(config.teamByPlayer || {}) };
  if (config.participantMode === "teams") ids.forEach((id, i) => { if (!teamByPlayer[id]) teamByPlayer[id] = i % 2 === 0 ? "A" : "B"; });
  config.teamByPlayer = teamByPlayer;
  const teamIds = Array.from(new Set(Object.values(teamByPlayer).filter(Boolean)));
  const conquest = CONQUEST_PROFILES[modeId] || null;
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
    scores: Object.fromEntries(ids.map((id) => [id, modeId === "radin" ? modeOptionNumber(config, "startWallet", 100, 20, 500) : 0])),
    progress: Object.fromEntries(ids.map((id) => [id, 0])),
    health: Object.fromEntries(ids.map((id) => [id, 100])),
    lives: Object.fromEntries(ids.map((id) => [id, config.lives || 0])),
    eliminated: Object.fromEntries(ids.map((id) => [id, false])),
    teamScores: Object.fromEntries(teamIds.map((id) => [id, 0])),
    statsByPlayer: Object.fromEntries(ids.map((id) => [id, blankStats()])),
    visits: [],
    special: {
      version: WAVE61_ENGINE_VERSION,
      seedText,
      mines: modeId === "demineur" ? mineMap(seedText, modeOptionNumber(config, "mineCount", 5, 2, 9)) : [],
      revealed: [],
      exploded: [],
      safeByPlayer: {},
      board: modeId === "align_4" ? Array.from({ length: 6 }, () => Array(7).fill(null)) : null,
      align4Moves: [],
      lastVisitDarts: [],
      replicatReferenceOwner: null,
      secretCode: modeId === "codebreaker" ? codeSequence(seedText, modeOptionNumber(config, "codeLength", 3, 2, 3), modeOptionBool(config, "allowRepeats", false)) : [],
      codeHistory: [],
      faceSecret: modeId === "face_mystere" ? faceSecret(seedText) : null,
      faceCandidates: modeId === "face_mystere" ? Array.from({ length: 20 }, (_, i) => i + 1) : [],
      faceClues: [],
      faceHistory: [],
      colinSequence: modeId === "colin_maillard" ? colinSequence(seedText, modeOptionNumber(config, "sequenceLength", 6, 3, 10)) : [],
      colinStepByPlayer: modeId === "colin_maillard" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      doubleDownHistory: [],
      centuryBustsByPlayer: Object.fromEntries(ids.map((id) => [id, 0])),
      shoveMarksByPlayer: modeId === "shove_a_penny" ? Object.fromEntries(ids.map((id) => [id, blankShoveMarks()])) : {},
      shoveHistory: [],
      greenRedColorByPlayer: modeId === "green_vs_red" ? Object.fromEntries(ids.map((id, i) => [id, config.participantMode === "teams" ? (teamByPlayer[id] === "B" ? "GREEN" : "RED") : greenRedColorForIndex(i)])) : {},
      greenRedStepByPlayer: modeId === "green_vs_red" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      greenRedHistory: [],
      sniperContracts: modeId === "sniper" ? sniperContracts(seedText, Math.max(12, config.goal || 12)) : [],
      sniperStepByPlayer: modeId === "sniper" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      sniperHistory: [],
      lucioleSequence: modeId === "luciole" ? seededSequence(`luciole:${seedText}`, Math.max(12, config.goal || 10), 20) : [],
      lucioleStepByPlayer: modeId === "luciole" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      lucioleHistory: [],
      goldenTargets: modeId === "golden_dart" ? seededNumbers(`gold:${seedText}`, Math.min(20, Math.max(7, config.goal || 7)), 20) : [],
      goldenIndex: 0,
      goldenClues: [],
      goldenHistory: [],
      tugTargetSequence: modeId === "tug_rush" ? seededSequence(`tug:${seedText}`, 80, 20) : [],
      tugSideByPlayer: modeId === "tug_rush" ? sideByPlayer(ids, teamByPlayer, config.participantMode) : {},
      tugPosition: 0,
      tugContributionByPlayer: modeId === "tug_rush" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      tugHistory: [],
      soleilSequence: modeId === "un_deux_trois_soleil" ? seededSequence(`soleil:${seedText}`, 100, 20) : [],
      soleilFallsByPlayer: modeId === "un_deux_trois_soleil" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      soleilHistory: [],
      chatSourisRoleByPlayer: modeId === "chat_souris" ? Object.fromEntries(ids.map((id, i) => [id, config.participantMode === "teams" ? (teamByPlayer[id] === "B" ? "MOUSE" : "CAT") : (i === 0 ? "CAT" : "MOUSE")])) : {},
      chatSourisPosByPlayer: modeId === "chat_souris" ? Object.fromEntries(ids.map((id, i) => [id, (config.participantMode === "teams" ? (teamByPlayer[id] === "B") : i > 0) ? modeOptionNumber(config, "mouseHeadStart", 25, 0, 60) : 0])) : {},
      chatSourisCaughtByPlayer: {},
      chatSourisRoute: modeId === "chat_souris" ? seededSequence(`catmouse:${seedText}`, 120, 20) : [],
      mazeRoute: modeId === "maze_chase" ? seededSequence(`maze:${seedText}`, 60, 20) : [],
      mazePosByPlayer: modeId === "maze_chase" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mazeGhostByPlayer: modeId === "maze_chase" ? Object.fromEntries(ids.map((id) => [id, -modeOptionNumber(config, "ghostGap", 6, 2, 12)])) : {},
      mazePowerByPlayer: modeId === "maze_chase" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mazeHistory: [],
      chienChatRoleByPlayer: modeId === "chien_chat" ? Object.fromEntries(ids.map((id, i) => [id, config.participantMode === "teams" ? (teamByPlayer[id] === "B" ? "CAT" : "DOG") : (i % 2 === 0 ? "DOG" : "CAT")])) : {},
      chienChatPosByPlayer: modeId === "chien_chat" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      chienChatRoute: modeId === "chien_chat" ? seededSequence(`dogcat:${seedText}`, 100, 20) : [],
      chienChatHistory: [],
      rollerSpeedByPlayer: modeId === "roller_coaster" ? Object.fromEntries(ids.map((id) => [id, 20])) : {},
      rollerPosByPlayer: modeId === "roller_coaster" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      rollerHistory: [],
      athleticsResultsByPlayer: modeId === "athletisme" ? Object.fromEntries(ids.map((id) => [id, {}])) : {},
      athleticsHistory: [],
      freefallAltitudeByPlayer: modeId === "chute_libre" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "startAltitude", 4000, 2000, 7000)])) : {},
      freefallChuteByPlayer: modeId === "chute_libre" ? Object.fromEntries(ids.map((id) => [id, false])) : {},
      freefallCrashedByPlayer: modeId === "chute_libre" ? Object.fromEntries(ids.map((id) => [id, false])) : {},
      freefallHistory: [],
      tyrolienSpeedByPlayer: modeId === "tyrolien" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "startSpeed", 20, 0, 60)])) : {},
      tyrolienPosByPlayer: modeId === "tyrolien" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      tyrolienHistory: [],
      ropeSequence: modeId === "saut_a_la_corde" ? seededSequence(`rope:${seedText}`, 160, 20) : [],
      ropeStepByPlayer: modeId === "saut_a_la_corde" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ropeComboByPlayer: modeId === "saut_a_la_corde" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ropePaceByPlayer: modeId === "saut_a_la_corde" ? Object.fromEntries(ids.map((id) => [id, 1])) : {},
      ropeHistory: [],

      heistSequence: modeId === "heist_180" ? seededSequence(`heist:${seedText}`, HEIST_STAGES.length, 20) : [],
      heistStageByPlayer: modeId === "heist_180" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      heistMarksByPlayer: modeId === "heist_180" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      heistLootByPlayer: modeId === "heist_180" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      heistHeatByPlayer: modeId === "heist_180" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      heistHistory: [],

      escapeSequence: modeId === "escape_game" ? seededSequence(`escape:${seedText}`, ESCAPE_STAGES.length, 20) : [],
      escapeStepByPlayer: modeId === "escape_game" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      escapePenaltyByPlayer: modeId === "escape_game" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      escapeJokersByPlayer: modeId === "escape_game" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      escapeHistory: [],

      lunarSequence: modeId === "objectif_lune" ? seededSequence(`moon:${seedText}`, LUNAR_PHASES.length, 20) : [],
      lunarStageByPlayer: modeId === "objectif_lune" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      lunarMarksByPlayer: modeId === "objectif_lune" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      lunarFuelByPlayer: modeId === "objectif_lune" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      lunarStabilityByPlayer: modeId === "objectif_lune" ? Object.fromEntries(ids.map((id) => [id, 100])) : {},
      lunarHistory: [],

      hollywoodSequence: modeId === "hollywood" ? seededSequence(`hollywood:${seedText}`, HOLLYWOOD_SCENES.length, 20) : [],
      hollywoodSceneByPlayer: modeId === "hollywood" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hollywoodMarksByPlayer: modeId === "hollywood" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hollywoodStarsByPlayer: modeId === "hollywood" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hollywoodBoxOfficeByPlayer: modeId === "hollywood" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hollywoodHistory: [],

      mayaSequence: modeId === "calendrier_maya" ? seededSequence(`maya:${seedText}`, MAYA_CYCLES.length, 20) : [],
      mayaSealByPlayer: modeId === "calendrier_maya" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mayaMarksByPlayer: modeId === "calendrier_maya" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mayaDoomByPlayer: modeId === "calendrier_maya" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mayaHistory: [],

      pyramidSequence: modeId === "pyramides" ? seededSequence(`pyramid:${seedText}`, PYRAMID_CHAMBERS.length, 20) : [],
      pyramidChamberByPlayer: modeId === "pyramides" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      pyramidMarksByPlayer: modeId === "pyramides" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      pyramidTorchByPlayer: modeId === "pyramides" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "torchStart", 70, 40, 100)])) : {},
      pyramidHistory: [],

      dracoSequence: modeId === "draco_spheres" ? seededNumbers(`draco:${seedText}`, 7, 20) : [],
      dracoSpheresByPlayer: modeId === "draco_spheres" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      dracoEnergyByPlayer: modeId === "draco_spheres" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      dracoHistory: [],

      mythSequence: modeId === "mythologie" ? seededSequence(`myth:${seedText}`, MYTH_GODS.length, 20) : [],
      mythTrialByPlayer: modeId === "mythologie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mythMarksByPlayer: modeId === "mythologie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mythFavorByPlayer: modeId === "mythologie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mythHistory: [],

      gardenSequence: modeId === "jardinier" ? seededSequence(`garden:${seedText}`, 30, 20) : [],
      gardenGrowthByPlayer: modeId === "jardinier" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      gardenHarvestByPlayer: modeId === "jardinier" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      gardenWaterByPlayer: modeId === "jardinier" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "waterStart", 60, 20, 100)])) : {},
      gardenHistory: [],

      microSequence: modeId === "microscopia" ? seededSequence(`micro:${seedText}`, MICRO_SAMPLES.length, 20) : [],
      microSamplesByPlayer: modeId === "microscopia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      microQualityByPlayer: modeId === "microscopia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      microContaminationByPlayer: modeId === "microscopia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      microHistory: [],

      circuitSequence: modeId === "disjoncte" ? seededSequence(`circuit:${seedText}`, CIRCUIT_NAMES.length, 20) : [],
      circuitStepByPlayer: modeId === "disjoncte" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      circuitOverloadByPlayer: modeId === "disjoncte" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      circuitHistory: [],

      bacSequence: modeId === "petit_bac" ? seededSequence(`bac:${seedText}`, BAC_CATEGORIES.length, 20) : [],
      bacStepByPlayer: modeId === "petit_bac" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      bacValidatedByPlayer: modeId === "petit_bac" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      bacHistory: [],

      finalBuzzerSequence: modeId === "final_buzzer" ? seededSequence(`finalbuzzer:${seedText}`, FINAL_BUZZER_CHALLENGES.length, 20) : [],
      finalBuzzerCutoffs: modeId === "final_buzzer" ? seededSequence(`buzzer:${seedText}`, Math.max(32, config.rounds * Math.max(1, ids.length)), 3) : [],
      finalBuzzerStreakByPlayer: modeId === "final_buzzer" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      finalBuzzerClutchByPlayer: modeId === "final_buzzer" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      finalBuzzerHistory: [],

      jackpotPot: modeId === "jackpot" ? modeOptionNumber(config, "basePot", 250, 50, 2000) : 0,
      jackpotLastSpinByPlayer: modeId === "jackpot" ? Object.fromEntries(ids.map((id) => [id, []])) : {},
      jackpotWinsByPlayer: modeId === "jackpot" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      jackpotJackpotsByPlayer: modeId === "jackpot" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      jackpotHistory: [],

      mafiaRoleByPlayer: modeId === "mafia" ? assignMafiaRoles(ids, seedText, teamByPlayer, config.participantMode) : {},
      mafiaNightSequence: modeId === "mafia" ? seededSequence(`mafia-night:${seedText}`, Math.max(32, config.rounds), 20) : [],
      mafiaShieldByPlayer: modeId === "mafia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mafiaDamageByPlayer: modeId === "mafia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mafiaVotesByPlayer: modeId === "mafia" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mafiaIntel: [],
      mafiaHistory: [],
      mafiaWinningFaction: null,

      ascentTargets: ["mont_blanc", "everest", "summit_14"].includes(modeId) ? seededSequence(`ascent:${modeId}:${seedText}`, 24, 20) : [],
      ascentWeatherCycle: ["mont_blanc", "everest", "summit_14"].includes(modeId) ? seededSequence(`weather:${modeId}:${seedText}`, 64, 20) : [],
      ascentAltitudeByPlayer: ["mont_blanc", "everest"].includes(modeId) ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ascentStageByPlayer: ["mont_blanc", "everest"].includes(modeId) ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ascentFatigueByPlayer: ["mont_blanc", "everest", "summit_14"].includes(modeId) ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ascentOxygenByPlayer: ["mont_blanc", "everest", "summit_14"].includes(modeId) ? Object.fromEntries(ids.map((id) => [id, ascentStartingOxygen(modeId, config)])) : {},
      ascentAcclimationByPlayer: ["mont_blanc", "everest", "summit_14"].includes(modeId) ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      summit14PeakByPlayer: modeId === "summit_14" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      summit14MarksByPlayer: modeId === "summit_14" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      ascentHistory: [],

      conquestTargets: conquest ? seededNumbers(`conquest:${modeId}:${seedText}`, conquest.nodes.length, 20) : [],
      conquestOwnerByNode: conquest ? Array(conquest.nodes.length).fill(null) : [],
      conquestPressureByNode: conquest ? Array.from({ length: conquest.nodes.length }, () => ({ actor: null, value: 0 })) : [],
      conquestFortByNode: conquest ? Array(conquest.nodes.length).fill(0) : [],
      conquestFocusByPlayer: conquest ? Object.fromEntries(ids.map((id, i) => [id, i % conquest.nodes.length])) : {},
      conquestResourceByPlayer: conquest ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      conquestCapturesByPlayer: conquest ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      conquestHistory: [],

      trojanSequence: modeId === "cheval_de_troie" ? seededNumbers(`trojan:${seedText}`, TROJAN_PHASES.length, 20) : [],
      trojanPhaseByPlayer: modeId === "cheval_de_troie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      trojanMarksByPlayer: modeId === "cheval_de_troie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      trojanAlertByPlayer: modeId === "cheval_de_troie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      trojanWoodByPlayer: modeId === "cheval_de_troie" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      trojanHistory: [],

      hotPotatoSequence: modeId === "hot_potato" ? survivalSequence(seedText, "hotpotato") : [],
      hotPotatoFuse: modeId === "hot_potato" ? hotPotatoFuseReset(config) : 0,
      hotPotatoExplosionsByPlayer: modeId === "hot_potato" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hotPotatoPassesByPlayer: modeId === "hot_potato" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      hotPotatoHistory: [],

      zombieSequence: modeId === "zombie_siege" ? survivalSequence(seedText, "zombie") : [],
      zombieRoleByPlayer: modeId === "zombie_siege" ? roleSeed(ids, teamByPlayer, config.participantMode, "ZOMBIE", "SURVIVOR") : {},
      zombieInfectionByPlayer: modeId === "zombie_siege" ? Object.fromEntries(ids.map((id, i) => [id, (config.participantMode === "teams" ? teamByPlayer[id] === "B" : i === 0) ? 100 : 0])) : {},
      zombieBarricadeByPlayer: modeId === "zombie_siege" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      zombieHistory: [],

      loupSequence: modeId === "le_loup" ? survivalSequence(seedText, "wolf") : [],
      loupId: modeId === "le_loup" ? ids[0] || null : null,
      loupProtectedByPlayer: modeId === "le_loup" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      loupCaughtByPlayer: modeId === "le_loup" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      loupHistory: [],

      epervierSequence: modeId === "eperviers" ? survivalSequence(seedText, "hawk") : [],
      epervierRoleByPlayer: modeId === "eperviers" ? Object.fromEntries(ids.map((id, i) => [id, i === 0 ? "HAWK" : "RUNNER"])) : {},
      epervierCrossingByPlayer: modeId === "eperviers" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      epervierCaughtByPlayer: modeId === "eperviers" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      epervierHistory: [],

      dodgeSequence: modeId === "ballon_prisonnier" ? survivalSequence(seedText, "dodge") : [],
      dodgePrisonerByPlayer: modeId === "ballon_prisonnier" ? Object.fromEntries(ids.map((id) => [id, false])) : {},
      dodgeShieldByPlayer: modeId === "ballon_prisonnier" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      dodgeHitsByPlayer: modeId === "ballon_prisonnier" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      dodgeHistory: [],

      icebergSequence: modeId === "iceberg" ? survivalSequence(seedText, "iceberg") : [],
      icebergHullByPlayer: modeId === "iceberg" ? Object.fromEntries(ids.map((id) => [id, 100])) : {},
      icebergFloodByPlayer: modeId === "iceberg" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      icebergCompartmentsByPlayer: modeId === "iceberg" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      icebergHistory: [],

      jurassicSequence: modeId === "jurassic_dart" ? survivalSequence(seedText, "jurassic") : [],
      jurassicThreatByPlayer: modeId === "jurassic_dart" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      jurassicSecurityByPlayer: modeId === "jurassic_dart" ? Object.fromEntries(ids.map((id) => [id, 100])) : {},
      jurassicProgressByPlayer: modeId === "jurassic_dart" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      jurassicHistory: [],

      apocalypseSequence: modeId === "apocalypse" ? survivalSequence(seedText, "apocalypse") : [],
      apocalypseResourcesByPlayer: modeId === "apocalypse" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      apocalypseRefugeByPlayer: modeId === "apocalypse" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      apocalypseThreatByPlayer: modeId === "apocalypse" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      apocalypseHistory: [],

      mistigriSequence: modeId === "mistigri" ? survivalSequence(seedText, "mistigri") : [],
      mistigriHolderId: modeId === "mistigri" ? (ids[hashText(`mistigri-holder:${seedText}`) % Math.max(1, ids.length)] || ids[0] || null) : null,
      mistigriDangerByPlayer: modeId === "mistigri" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mistigriPairsByPlayer: modeId === "mistigri" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mistigriShieldByPlayer: modeId === "mistigri" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      mistigriHistory: [],

      radinSequence: modeId === "radin" ? seededSequence(`radin:${seedText}`, 160, 20) : [],
      radinWalletByPlayer: modeId === "radin" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "startWallet", 100, 20, 500)])) : {},
      radinSpentByPlayer: modeId === "radin" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      radinEarnedByPlayer: modeId === "radin" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      radinHistory: [],

      fableSequence: modeId === "corbeau_renard" ? seededSequence(`fable:${seedText}`, 160, 20) : [],
      fableRoleByPlayer: modeId === "corbeau_renard" ? corbeauRenardRoles(ids, teamByPlayer, config.participantMode) : {},
      fableCheeseByPlayer: modeId === "corbeau_renard" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "startingCheese", 2, 1, 5)])) : {},
      fableMeterByPlayer: modeId === "corbeau_renard" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      fableGuardByPlayer: modeId === "corbeau_renard" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      fableHistory: [],

      impossibleContracts: modeId === "darts_impossible" ? impossibleContracts(seedText, modeOptionNumber(config, "missionCount", config.goal || 10, 6, 18)) : [],
      impossibleStepByPlayer: modeId === "darts_impossible" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      impossibleAlarmByPlayer: modeId === "darts_impossible" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      impossibleFailsByPlayer: modeId === "darts_impossible" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      impossibleHistory: [],

      knockbackHistory: modeId === "knockback" ? [] : [],
      spartacusSequence: modeId === "spartacus" ? survivalSequence(seedText, "spartacus") : [],
      spartacusArmorByPlayer: modeId === "spartacus" ? Object.fromEntries(ids.map((id) => [id, modeOptionNumber(config, "startingArmor", 40, 0, 100)])) : {},
      spartacusGloryByPlayer: modeId === "spartacus" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      spartacusGuardByPlayer: modeId === "spartacus" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      spartacusHistory: [],

      cosmoSequence: modeId === "cosmo_knights" ? survivalSequence(seedText, "cosmo") : [],
      cosmoChargeByPlayer: modeId === "cosmo_knights" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      cosmoShieldByPlayer: modeId === "cosmo_knights" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      cosmoBurstsByPlayer: modeId === "cosmo_knights" ? Object.fromEntries(ids.map((id) => [id, 0])) : {},
      cosmoHistory: [],
    },
    startedAt,
  };
}

export function cloneWave61State(state: Wave61State): Wave61State { return clone(state); }

function targetSequenceIndex(state: Wave61State) { return state.roundIndex + state.activePlayerIndex + state.turnIndex; }

export function getWave61Target(state: Wave61State): Wave61Target {
  if (!state || state.phase === "finished") return null;
  if (["align_4", "demineur", "codebreaker", "face_mystere", "shove_a_penny", "golden_dart"].includes(state.modeId)) return null;
  if (state.modeId === "colin_maillard") {
    const player = state.players[state.activePlayerIndex];
    const seq = Array.isArray(state.special?.colinSequence) ? state.special.colinSequence : [];
    const step = Number(state.special?.colinStepByPlayer?.[player?.id] || 0);
    const n = Number(seq[Math.min(step, Math.max(0, seq.length - 1))] || 0);
    return n ? { kind: "number", value: n, label: `Cible mémorisée ${Math.min(step + 1, seq.length)}/${seq.length}` } : null;
  }
  if (state.modeId === "final_buzzer") {
    const challenge = finalBuzzerChallenge(state);
    if (challenge.kind === "number" || challenge.kind === "sequence") return { kind: "number", value: Number(challenge.number || 20), label: `⏱️ ${challenge.name} · secteur ${challenge.number || 20}` };
    if (challenge.kind === "double") return { kind: "double", label: `⏱️ ${challenge.name} · DOUBLE` };
    if (challenge.kind === "triple") return { kind: "triple", label: `⏱️ ${challenge.name} · TRIPLE` };
    return { kind: "bull", label: `⏱️ ${challenge.name} · BULL / DBULL` };
  }
  if (state.modeId === "mafia") {
    if (mafiaPhase(state) === "DAY") return null;
    const n = raceTargetFromSequence(state.special?.mafiaNightSequence || [], Math.floor(Number(state.roundIndex || 0) / 2));
    return { kind: "number", value: n, label: `🌙 NUIT · action secrète sur secteur ${n}` };
  }
  if (state.modeId === "tug_rush") {
    const n = raceTargetFromSequence(state.special?.tugTargetSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `⚓ Corde sur secteur ${n}` };
  }
  if (state.modeId === "un_deux_trois_soleil") {
    if (soleilPhase(state) === "STOP") return { kind: "bull", label: "🔴 SOLEIL ! BULL pour rester figé" };
    const n = raceTargetFromSequence(state.special?.soleilSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `🟢 AVANCE · secteur ${n}` };
  }
  if (state.modeId === "chat_souris") {
    const player = state.players[state.activePlayerIndex];
    const pos = Number(state.special?.chatSourisPosByPlayer?.[player?.id] || 0);
    const n = raceTargetFromSequence(state.special?.chatSourisRoute || [], Math.floor(pos / 5));
    return { kind: "number", value: n, label: `${state.special?.chatSourisRoleByPlayer?.[player?.id] === "CAT" ? "🐱 CHASSE" : "🐭 FUITE"} · secteur ${n}` };
  }
  if (state.modeId === "maze_chase") {
    const player = state.players[state.activePlayerIndex];
    const pos = Number(state.special?.mazePosByPlayer?.[player?.id] || 0);
    const n = raceTargetFromSequence(state.special?.mazeRoute || [], pos);
    return { kind: "number", value: n, label: `🧩 Couloir ${Math.min(pos + 1, state.config.goal || 20)} · secteur ${n}` };
  }
  if (state.modeId === "chien_chat") {
    const player = state.players[state.activePlayerIndex];
    const pos = Number(state.special?.chienChatPosByPlayer?.[player?.id] || 0);
    const n = raceTargetFromSequence(state.special?.chienChatRoute || [], Math.floor(pos / 6));
    return { kind: "number", value: n, label: `${state.special?.chienChatRoleByPlayer?.[player?.id] === "DOG" ? "🐶" : "🐱"} piste · secteur ${n}` };
  }
  if (state.modeId === "roller_coaster") {
    const player = state.players[state.activePlayerIndex];
    const section = currentRollerSection(state, player?.id);
    return { kind: "number", value: Number(section.target), label: `🎢 ${section.name} · secteur ${section.target}` };
  }
  if (state.modeId === "athletisme") {
    const discipline = currentAthleticsDiscipline(state);
    if (discipline === "HAIES") return { kind: "number", value: 20, label: "🏃 HAIES · franchis le 20" };
    if (discipline === "RELAIS") return { kind: "number", value: 20, label: "🏁 RELAIS · 20 → 19 → 18" };
    return null;
  }
  if (state.modeId === "chute_libre") {
    const player = state.players[state.activePlayerIndex];
    const altitude = Number(state.special?.freefallAltitudeByPlayer?.[player?.id] || 0);
    const opened = !!state.special?.freefallChuteByPlayer?.[player?.id];
    const window = freefallWindow(state.config.difficulty, state.config);
    if (!opened && altitude <= window.high && altitude >= window.low) return { kind: "bull", label: "🪂 FENÊTRE PARACHUTE · BULL / DBULL" };
    return null;
  }
  if (state.modeId === "tyrolien") {
    const player = state.players[state.activePlayerIndex];
    const stage = currentTyrolienStage(state, player?.id);
    return { kind: "number", value: Number(stage.target), label: `🪢 ${stage.name} · secteur ${stage.target}` };
  }
  if (state.modeId === "saut_a_la_corde") {
    const player = state.players[state.activePlayerIndex];
    const step = Number(state.special?.ropeStepByPlayer?.[player?.id] || 0);
    const n = raceTargetFromSequence(state.special?.ropeSequence || [], step);
    return { kind: "number", value: n, label: `🪢 Rythme · secteur ${n}` };
  }
  if (state.modeId === "heist_180") {
    const player = state.players[state.activePlayerIndex];
    const stage = Number(state.special?.heistStageByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.heistSequence || [], stage);
    return { kind: "number", value: n, label: `💰 ${HEIST_STAGES[Math.min(stage, HEIST_STAGES.length - 1)]} · secteur ${n} · chaleur ${state.special?.heistHeatByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "escape_game") {
    const player = state.players[state.activePlayerIndex];
    const step = Number(state.special?.escapeStepByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.escapeSequence || [], step);
    return { kind: "number", value: n, label: `🔐 ${ESCAPE_STAGES[Math.min(step, ESCAPE_STAGES.length - 1)]} · secteur ${n} · BULL = joker` };
  }
  if (state.modeId === "objectif_lune") {
    const player = state.players[state.activePlayerIndex];
    const stage = Number(state.special?.lunarStageByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.lunarSequence || [], stage);
    return { kind: "number", value: n, label: `🚀 ${LUNAR_PHASES[Math.min(stage, LUNAR_PHASES.length - 1)]} · secteur ${n} · carburant ${state.special?.lunarFuelByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "hollywood") {
    const player = state.players[state.activePlayerIndex];
    const scene = Number(state.special?.hollywoodSceneByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.hollywoodSequence || [], scene);
    return { kind: "number", value: n, label: `🎬 ${HOLLYWOOD_SCENES[Math.min(scene, HOLLYWOOD_SCENES.length - 1)]} · secteur ${n}` };
  }
  if (state.modeId === "calendrier_maya") {
    const player = state.players[state.activePlayerIndex];
    const seal = Number(state.special?.mayaSealByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.mayaSequence || [], seal);
    return { kind: "number", value: n, label: `🗿 ${MAYA_CYCLES[Math.min(seal, MAYA_CYCLES.length - 1)]} · secteur ${n} · fin ${state.special?.mayaDoomByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "pyramides") {
    const player = state.players[state.activePlayerIndex];
    const chamber = Number(state.special?.pyramidChamberByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.pyramidSequence || [], chamber);
    return { kind: "number", value: n, label: `🔺 ${PYRAMID_CHAMBERS[Math.min(chamber, PYRAMID_CHAMBERS.length - 1)]} · secteur ${n} · torche ${state.special?.pyramidTorchByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "draco_spheres") {
    const player = state.players[state.activePlayerIndex];
    const sphere = Number(state.special?.dracoSpheresByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.dracoSequence || [], sphere);
    return { kind: "number", value: n, label: `🐉 ORBE ${Math.min(sphere + 1, 7)}/7 · secteur ${n} · énergie ${state.special?.dracoEnergyByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "mythologie") {
    const player = state.players[state.activePlayerIndex];
    const trial = Number(state.special?.mythTrialByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.mythSequence || [], trial);
    return { kind: "number", value: n, label: `⚡ ÉPREUVE ${MYTH_GODS[Math.min(trial, MYTH_GODS.length - 1)]} · secteur ${n}` };
  }
  if (state.modeId === "jardinier") {
    const player = state.players[state.activePlayerIndex];
    const harvest = Number(state.special?.gardenHarvestByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.gardenSequence || [], harvest);
    const harvestGoal = modeOptionNumber(state.config, "harvestGoal", 5, 1, 10);
    return { kind: "number", value: n, label: `🌱 PLANTE ${Math.min(harvest + 1, harvestGoal)}/${harvestGoal} · secteur ${n} · eau ${state.special?.gardenWaterByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "microscopia") {
    const player = state.players[state.activePlayerIndex];
    const sample = Number(state.special?.microSamplesByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.microSequence || [], sample);
    return { kind: "number", value: n, label: `🔬 ${MICRO_SAMPLES[Math.min(sample, MICRO_SAMPLES.length - 1)]} · secteur ${n} · contamination ${state.special?.microContaminationByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "disjoncte") {
    const player = state.players[state.activePlayerIndex];
    const step = Number(state.special?.circuitStepByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.circuitSequence || [], step);
    return { kind: "number", value: n, label: `⚡ ${CIRCUIT_NAMES[Math.min(step, CIRCUIT_NAMES.length - 1)]} · secteur ${n} · surcharge ${state.special?.circuitOverloadByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "petit_bac") {
    const player = state.players[state.activePlayerIndex];
    const step = Number(state.special?.bacStepByPlayer?.[player?.id] || 0);
    const n = missionStageTarget(state.special?.bacSequence || [], step);
    const letter = BAC_LETTERS[(n - 1) % BAC_LETTERS.length];
    return { kind: "number", value: n, label: `📝 ${BAC_CATEGORIES[Math.min(step, BAC_CATEGORIES.length - 1)]} en ${letter} · secteur ${n} · BULL = joker` };
  }
  if (["mont_blanc", "everest", "summit_14"].includes(state.modeId)) {
    const player = state.players[state.activePlayerIndex];
    const targetSeq = state.special?.ascentTargets || [];
    if (state.modeId === "summit_14") {
      const peak = clamp(Number(state.special?.summit14PeakByPlayer?.[player?.id] || 0), 0, SUMMIT_14_PEAKS.length - 1);
      const n = raceTargetFromSequence(targetSeq, peak);
      const weather = ascentWeather(state);
      return { kind: "number", value: n, label: `🏔️ ${SUMMIT_14_PEAKS[peak]} ${Math.min(peak + 1, 14)}/14 · secteur ${n} · ${weather.label}` };
    }
    const altitude = Number(state.special?.ascentAltitudeByPlayer?.[player?.id] || 0);
    const stage = ascentStageForAltitude(state.modeId, altitude);
    const stages = ascentStages(state.modeId);
    const n = raceTargetFromSequence(targetSeq, stage);
    const weather = ascentWeather(state);
    return { kind: "number", value: n, label: `⛰️ ${stages[Math.min(stage, stages.length - 1)].name} · secteur ${n} · ${Math.round(altitude)} m · ${weather.label}` };
  }
  if (CONQUEST_PROFILES[state.modeId]) {
    const player = state.players[state.activePlayerIndex];
    const profile = CONQUEST_PROFILES[state.modeId];
    const focus = conquestFocusIndex(state, player?.id);
    const n = Number(state.special?.conquestTargets?.[focus] || 20);
    const node = profile.nodes[focus] || `ZONE ${focus + 1}`;
    const owner = state.special?.conquestOwnerByNode?.[focus];
    const fort = Number(state.special?.conquestFortByNode?.[focus] || 0);
    return { kind: "number", value: n, label: `${profile.icon} ${node} · secteur ${n}${owner ? ` · fort ${fort}` : ""}` };
  }
  if (state.modeId === "cheval_de_troie") {
    const player = state.players[state.activePlayerIndex];
    const phase = Number(state.special?.trojanPhaseByPlayer?.[player?.id] || 0);
    const n = Number(state.special?.trojanSequence?.[Math.min(phase, TROJAN_PHASES.length - 1)] || 20);
    return { kind: "number", value: n, label: `🐴 ${TROJAN_PHASES[Math.min(phase, TROJAN_PHASES.length - 1)]} · secteur ${n} · alerte ${state.special?.trojanAlertByPlayer?.[player?.id] || 0}%` };
  }
  if (state.modeId === "hot_potato") {
    const n = raceTargetFromSequence(state.special?.hotPotatoSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `🥔 Passe vite · secteur ${n} · mèche ${state.special?.hotPotatoFuse || 0}` };
  }
  if (state.modeId === "zombie_siege") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.zombieSequence || [], state.turnIndex);
    const role = state.special?.zombieRoleByPlayer?.[player?.id] || "SURVIVOR";
    return { kind: "number", value: n, label: role === "ZOMBIE" ? `🧟 Infection · secteur ${n}` : `🛡️ Barricade · secteur ${n}` };
  }
  if (state.modeId === "le_loup") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.loupSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: state.special?.loupId === player?.id ? `🐺 CHASSE · secteur ${n}` : `🏃 FUITE · secteur ${n}` };
  }
  if (state.modeId === "eperviers") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.epervierSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: state.special?.epervierRoleByPlayer?.[player?.id] === "HAWK" ? `🦅 CAPTURE · secteur ${n}` : `🏃 TRAVERSÉE · secteur ${n}` };
  }
  if (state.modeId === "ballon_prisonnier") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.dodgeSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: state.special?.dodgePrisonerByPlayer?.[player?.id] ? "🔒 Prisonnier · BULL pour libérer" : `🏐 Attaque · secteur ${n} · BULL libère` };
  }
  if (state.modeId === "iceberg") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.icebergSequence || [], state.turnIndex + Number(state.special?.icebergFloodByPlayer?.[player?.id] || 0));
    const goal = modeOptionNumber(state.config, "compartmentGoal", ICEBERG_COMPARTMENTS, 2, 10);
    return { kind: "number", value: n, label: `🧊 Compartiment ${Math.min(goal, Number(state.special?.icebergCompartmentsByPlayer?.[player?.id] || 0) + 1)}/${goal} · secteur ${n}` };
  }
  if (state.modeId === "jurassic_dart") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.jurassicSequence || [], Math.floor(Number(state.special?.jurassicProgressByPlayer?.[player?.id] || 0) / 5));
    return { kind: "number", value: n, label: `🦖 Expédition · secteur ${n} · BULL tranquillisant` };
  }
  if (state.modeId === "apocalypse") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.apocalypseSequence || [], state.turnIndex + Math.floor(Number(state.special?.apocalypseThreatByPlayer?.[player?.id] || 0) / 10));
    return { kind: "number", value: n, label: `☢️ Zone sûre · secteur ${n} · BULL medkit` };
  }
  if (state.modeId === "mistigri") {
    const player = state.players[state.activePlayerIndex];
    const n = raceTargetFromSequence(state.special?.mistigriSequence || [], state.turnIndex);
    const holder = String(state.special?.mistigriHolderId || "") === String(player?.id || "");
    return { kind: "number", value: n, label: `${holder ? "🃏 MISTIGRI EN MAIN" : "🎴 FAIS UNE PAIRE"} · secteur ${n} · BULL protège` };
  }
  if (state.modeId === "radin") {
    const player = state.players[state.activePlayerIndex];
    const wallet = Math.round(Number(state.special?.radinWalletByPlayer?.[player?.id] ?? state.scores?.[player?.id] ?? 0));
    const n = raceTargetFromSequence(state.special?.radinSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `💰 ÉCONOMISE · secteur rentable ${n} · caisse ${wallet}` };
  }
  if (state.modeId === "corbeau_renard") {
    const player = state.players[state.activePlayerIndex];
    const role = String(state.special?.fableRoleByPlayer?.[player?.id] || "CORBEAU");
    const n = raceTargetFromSequence(state.special?.fableSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `${role === "RENARD" ? "🦊 FLATTE" : "🐦 GARDE LE FROMAGE"} · secteur ${n} · BULL = ruse` };
  }
  if (state.modeId === "darts_impossible") {
    const player = state.players[state.activePlayerIndex];
    const contracts = Array.isArray(state.special?.impossibleContracts) ? state.special.impossibleContracts : [];
    const step = clamp(Number(state.special?.impossibleStepByPlayer?.[player?.id] || 0), 0, Math.max(0, contracts.length - 1));
    const contract = contracts[step];
    if (!contract) return null;
    if (state.config.difficulty === "easy" && contract.number) return { kind: "number", value: Number(contract.number), label: `🕶️ MISSION ${step + 1}/${contracts.length} · secteur ${contract.number}` };
    return { kind: "exact", number: contract.number, bed: contract.bed, label: `🕶️ MISSION ${step + 1}/${contracts.length} · ${exactTargetLabel(contract)} · alarme ${Math.round(Number(state.special?.impossibleAlarmByPlayer?.[player?.id] || 0))}%` };
  }
  if (state.modeId === "knockback") return null;
  if (state.modeId === "spartacus") {
    const n = raceTargetFromSequence(state.special?.spartacusSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `⚔️ Fenêtre d'attaque · secteur ${n} · BULL garde` };
  }
  if (state.modeId === "cosmo_knights") {
    const n = raceTargetFromSequence(state.special?.cosmoSequence || [], state.turnIndex);
    return { kind: "number", value: n, label: `✨ Constellation · secteur ${n} · charge le Cosmos` };
  }
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
  if (state.modeId === "green_vs_red") {
    const player = state.players[state.activePlayerIndex];
    const color = String(state.special?.greenRedColorByPlayer?.[player?.id] || "RED") as "RED" | "GREEN";
    const path = color === "GREEN" ? GREEN_RING : RED_RING;
    const step = Math.min(path.length - 1, Number(state.special?.greenRedStepByPlayer?.[player?.id] || 0));
    return { kind: "number", value: path[step], label: `${color === "RED" ? "🔴" : "🟢"} ${color} · D/T ${path[step]} · étape ${step + 1}/${path.length}` };
  }
  if (state.modeId === "sniper") {
    const player = state.players[state.activePlayerIndex];
    const contracts = Array.isArray(state.special?.sniperContracts) ? state.special.sniperContracts : [];
    const step = Math.min(Math.max(0, contracts.length - 1), Number(state.special?.sniperStepByPlayer?.[player?.id] || 0));
    const contract = contracts[step];
    if (!contract) return null;
    if (state.config.difficulty === "easy" && contract.number) return { kind: "number", value: contract.number, label: `🎯 CIBLE ${contract.number} · mission ${step + 1}/${contracts.length}` };
    return { kind: "exact", number: contract.number, bed: contract.bed, label: `🎯 ${exactTargetLabel(contract)} · mission ${step + 1}/${contracts.length}` };
  }
  if (state.modeId === "luciole") {
    const player = state.players[state.activePlayerIndex];
    const seq = Array.isArray(state.special?.lucioleSequence) ? state.special.lucioleSequence : [];
    const step = Number(state.special?.lucioleStepByPlayer?.[player?.id] || 0);
    const n = Number(seq[Math.min(step, Math.max(0, seq.length - 1))] || 0);
    return n ? { kind: "number", value: n, label: `✨ LUCIOLE MÉMORISÉE · ${Math.min(step + 1, seq.length)}/${seq.length}` } : null;
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
  if (target.kind === "exact") {
    if (target.bed === "OB" || target.bed === "IB") return d.bed === target.bed;
    return d.bed === target.bed && Number(d.number || 0) === Number(target.number || 0);
  }
  return false;
}

function primaryValue(state: Wave61State, playerId: string): number {
  if (state.family === "survival" || state.family === "combat") return Number(state.health[playerId] || 0) + Number(state.lives[playerId] || 0) * 100 + Number(state.scores[playerId] || 0) / 1000;
  if (state.modeId === "shove_a_penny" || state.modeId === "green_vs_red") return Number(state.progress[playerId] || 0) * 1000 + Number(state.scores[playerId] || 0);
  if (state.family === "score") return Number(state.scores[playerId] || 0);
  return Number(state.progress[playerId] || 0) * 1000 + Number(state.scores[playerId] || 0);
}

function finishWith(state: Wave61State, playerId: string, teamId: string | null = null) {
  state.phase = "finished";
  state.winnerId = playerId;
  // Dedicated engines historically did not all forward their team id. Keep the
  // terminal contract centralized so every Teams victory reaches history/stats.
  state.winnerTeamId = state.config.participantMode === "teams"
    ? (teamId || state.config.teamByPlayer?.[playerId] || null)
    : null;
  state.finishedAt = Date.now();
}

function bestPlayer(state: Wave61State): string | null {
  const alive = state.players.filter((p) => !state.eliminated[p.id]);
  const pool = alive.length ? alive : state.players;
  return [...pool].sort((a, b) => primaryValue(state, b.id) - primaryValue(state, a.id))[0]?.id || null;
}

function bestTeam(state: Wave61State): { teamId: string; playerId: string } | null {
  refreshTeamScores(state);
  const entries = Object.entries(state.teamScores || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  const teamId = entries[0]?.[0];
  if (!teamId) return null;
  const playerId = state.players.filter((p) => (state.config.teamByPlayer?.[p.id] || "A") === teamId).sort((a, b) => primaryValue(state, b.id) - primaryValue(state, a.id))[0]?.id || state.players[0]?.id;
  return playerId ? { teamId, playerId } : null;
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

function checkConnect(board: any[][], token: string, length = 4): boolean {
  const H = board.length, W = board[0]?.length || 0;
  const need = clamp(Math.round(length), 3, 5);
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++) if (board[r][c] === token) for (const [dr,dc] of dirs) {
    let ok = true;
    for (let k=1;k<need;k++) { const rr=r+dr*k, cc=c+dc*k; if (rr<0||rr>=H||cc<0||cc>=W||board[rr][cc]!==token) { ok=false; break; } }
    if (ok) return true;
  }
  return false;
}

function placeAlign4(state: Wave61State, playerId: string, dart: GameDart, events: string[]): { placed: boolean; won: boolean; col: number } {
  if (!state.special?.board || !dart || dart.bed === "MISS") return { placed: false, won: false, col: -1 };
  const bullColumn = modeOptionNumber(state.config, "bullColumn", 7, 1, 7);
  const raw = dart.bed === "OB" || dart.bed === "IB" ? bullColumn : Number(dart.number || 1);
  const col = ((raw - 1) % 7 + 7) % 7;
  const token = state.config.participantMode === "teams" ? String(state.config.teamByPlayer?.[playerId] || "A") : playerId;
  for (let r = 5; r >= 0; r--) {
    if (!state.special.board[r][col]) {
      state.special.board[r][col] = token;
      state.special.align4Moves = [...(state.special.align4Moves || []), { playerId, token, col: col + 1, row: r + 1 }];
      events.push(`Jeton posé en colonne ${col + 1}`);
      return { placed: true, won: checkConnect(state.special.board, token, modeOptionNumber(state.config, "connectLength", 4, 3, 5)), col };
    }
  }
  events.push(`Colonne ${col + 1} pleine`);
  return { placed: false, won: false, col };
}

function mineNeighbors(n: number): number[] {
  const idx = Number(n) - 1;
  if (idx < 0 || idx >= 20) return [];
  const row = Math.floor(idx / 5), col = idx % 5;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = row + dr, cc = col + dc;
    if (rr >= 0 && rr < 4 && cc >= 0 && cc < 5) out.push(rr * 5 + cc + 1);
  }
  return out;
}

export function wave61MineNeighborCount(state: Wave61State, n: number): number {
  const mines = new Set<number>((state.special?.mines || []).map(Number));
  return mineNeighbors(n).filter((cell) => mines.has(cell)).length;
}

function revealSafeCell(state: Wave61State, playerId: string, start: number, revealed: Set<number>, mines: Set<number>, events: string[], allowFlood = true): number {
  if (!start || revealed.has(start) || mines.has(start)) return 0;
  const queue = [start];
  let count = 0;
  while (queue.length) {
    const n = Number(queue.shift() || 0);
    if (!n || revealed.has(n) || mines.has(n)) continue;
    revealed.add(n);
    count += 1;
    const around = wave61MineNeighborCount(state, n);
    if (allowFlood && around === 0) {
      for (const next of mineNeighbors(n)) if (!revealed.has(next) && !mines.has(next)) queue.push(next);
    }
  }
  if (count > 0) {
    state.statsByPlayer[playerId].safeReveals += count;
    events.push(count > 1 ? `✓ Zone sécurisée · ${count} cases` : `✓ Case ${start} sécurisée`);
  }
  return count;
}

function processMinefield(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const revealed = new Set<number>((state.special?.revealed || []).map(Number));
  const exploded = new Set<number>((state.special?.exploded || []).map(Number));
  const mines = new Set<number>((state.special?.mines || []).map(Number));
  let delta = 0, hits = 0;

  const scanSafe = (count: number) => {
    const candidates = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !revealed.has(n) && !mines.has(n));
    candidates.sort((a, b) => wave61MineNeighborCount(state, a) - wave61MineNeighborCount(state, b) || a - b);
    let scanned = 0;
    for (const n of candidates.slice(0, count)) {
      const opened = revealSafeCell(state, playerId, n, revealed, mines, events, false);
      if (opened) { scanned += opened; delta += opened; hits += 1; }
    }
    if (scanned) events.push(`🔎 Scanner BULL · ${scanned} case(s) sûre(s)`);
  };

  for (const d of darts) {
    if (d?.bed === "OB" || d?.bed === "IB") {
      const scanner = modeOptionNumber(state.config, "scannerStrength", 1, 0, 3);
      if (scanner > 0) scanSafe((d.bed === "IB" ? 1 : 0) + scanner);
      else events.push("🔎 Scanner désactivé");
      continue;
    }
    const n = Number(d?.number || 0);
    if (!n || revealed.has(n)) continue;
    if (mines.has(n)) {
      revealed.add(n);
      exploded.add(n);
      const damage = modeOptionNumber(state.config, "mineDamage", state.config.difficulty === "hard" ? 45 : state.config.difficulty === "easy" ? 25 : 35, 10, 100);
      state.health[playerId] = Math.max(0, Number(state.health[playerId] || 100) - damage);
      state.statsByPlayer[playerId].damageTaken += damage;
      events.push(`💥 Mine sur ${n} · -${damage} PV`);
    } else {
      const opened = revealSafeCell(state, playerId, n, revealed, mines, events, true);
      if (opened) { hits += 1; delta += opened; }
    }
  }
  state.special.revealed = [...revealed].sort((a, b) => a - b);
  state.special.exploded = [...exploded].sort((a, b) => a - b);
  state.special.safeByPlayer = { ...(state.special.safeByPlayer || {}), [playerId]: Number(state.special.safeByPlayer?.[playerId] || 0) + delta };
  state.progress[playerId] = Number(state.progress[playerId] || 0) + delta;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta * 10;
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

function sameReplicatNumber(a: GameDart, b: GameDart): boolean {
  if (!a || !b) return false;
  const aBull = a.bed === "OB" || a.bed === "IB";
  const bBull = b.bed === "OB" || b.bed === "IB";
  if (aBull || bBull) return aBull && bBull;
  return Number(a.number || 0) === Number(b.number || 0) && a.bed !== "MISS" && b.bed !== "MISS";
}

function scoreReplicat(state: Wave61State, darts: GameDart[]): { hits: number; progressDelta: number; scoreDelta: number; events: string[] } {
  const target = Array.isArray(state.special?.lastVisitDarts) ? state.special.lastVisitDarts : [];
  if (!target.length) return { hits: 0, progressDelta: 0, scoreDelta: 0, events: [`📼 Séquence de référence créée : ${darts.map(wave61DartLabel).join(" · ")}`] };
  const max = Math.min(3, darts.length, target.length);
  let hits = 0;
  for (let i = 0; i < max; i++) {
    const ok = state.config.difficulty === "easy"
      ? sameReplicatNumber(darts[i], target[i])
      : wave61DartLabel(darts[i]) === wave61DartLabel(target[i]);
    if (ok) hits += 1;
  }
  const baseProgress = state.config.difficulty === "hard" ? (hits === max && max > 0 ? max : 0) : hits;
  const failurePenalty = hits < max ? modeOptionNumber(state.config, "failurePenalty", 0, 0, 3) : 0;
  const progressDelta = Math.max(0, baseProgress - failurePenalty);
  const copyPoints = modeOptionNumber(state.config, "copyPoints", 100, 25, 250);
  const perfectBonus = hits === max && max > 0 ? modeOptionNumber(state.config, "perfectBonus", 50, 0, 250) : 0;
  const scoreDelta = progressDelta * copyPoints + perfectBonus;
  const level = state.config.difficulty === "easy" ? "numéros" : state.config.difficulty === "hard" ? "séquence parfaite" : "segments exacts";
  return { hits, progressDelta, scoreDelta, events: [`📋 ${hits}/${max} reproduit(s) · ${level}${perfectBonus ? ` · parfait +${perfectBonus}` : ""}${failurePenalty ? ` · pénalité -${failurePenalty}` : ""}${state.config.difficulty === "hard" && hits !== max ? " · série non validée" : ""}`] };
}

function dartNumberGuess(d: GameDart): number {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "OB" || d.bed === "IB") return 20;
  return clamp(Number(d.number || 0), 0, 20);
}

function scoreCodeGuess(secret: number[], guess: number[]): { exact: number; present: number } {
  const usedSecret = new Set<number>();
  const usedGuess = new Set<number>();
  let exact = 0;
  for (let i = 0; i < Math.min(secret.length, guess.length); i++) {
    if (guess[i] && guess[i] === secret[i]) {
      exact += 1;
      usedSecret.add(i);
      usedGuess.add(i);
    }
  }
  let present = 0;
  for (let gi = 0; gi < guess.length; gi++) {
    if (usedGuess.has(gi) || !guess[gi]) continue;
    const si = secret.findIndex((value, index) => !usedSecret.has(index) && value === guess[gi]);
    if (si >= 0) {
      present += 1;
      usedSecret.add(si);
      usedGuess.add(gi);
    }
  }
  return { exact, present };
}

function doubleDownContractMatches(d: GameDart, target: Wave61Target): boolean {
  if (!target || !d || d.bed === "MISS") return false;
  if (target.kind === "number") return Number(d.number || 0) === target.value;
  if (target.kind === "double") return d.bed === "D" || d.bed === "IB";
  if (target.kind === "triple") return d.bed === "T";
  if (target.kind === "bull") return d.bed === "OB" || d.bed === "IB";
  return false;
}

function nextOpponentId(state: Wave61State, playerId: string): string | null {
  const start = state.players.findIndex((p) => p.id === playerId);
  for (let i = 1; i < state.players.length; i++) {
    const p = state.players[(start + i) % state.players.length];
    if (p && !state.eliminated[p.id]) return p.id;
  }
  return null;
}

function shoveMarkValue(d: GameDart): { key: string | null; marks: number } {
  if (!d || d.bed === "MISS") return { key: null, marks: 0 };
  if (d.bed === "OB") return { key: "25", marks: 1 };
  if (d.bed === "IB") return { key: "25", marks: 2 };
  const n = Number(d.number || 0);
  if (!SHOVE_TARGETS.includes(n as any)) return { key: null, marks: 0 };
  return { key: String(n), marks: d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1 };
}

function processShoveAPenny(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const marksByPlayer = state.special.shoveMarksByPlayer || (state.special.shoveMarksByPlayer = {});
  const marks = marksByPlayer[playerId] || (marksByPlayer[playerId] = blankShoveMarks());
  const marksPerBox = modeOptionNumber(state.config, "marksPerBox", 3, 2, 5);
  const overflowRule = modeOptionNumber(state.config, "overflowRule", 1, 0, 2);
  const overflowBonus = modeOptionNumber(state.config, "overflowBonus", 25, 0, 100);
  let gained = 0, hits = 0, bonusScore = 0;
  for (const d of darts) {
    const { key, marks: amount } = shoveMarkValue(d);
    if (!key || !amount) continue;
    hits += 1;
    const before = Number(marks[key] || 0);
    const room = Math.max(0, marksPerBox - before);
    const own = Math.min(room, amount);
    const overflow = Math.max(0, amount - own);
    marks[key] = before + own;
    gained += own;
    if (own) events.push(`🪙 ${key === "25" ? "BULL" : key} +${own} marque(s)`);
    if (overflow > 0) {
      if (overflowRule === 1) {
        const oppId = nextOpponentId(state, playerId);
        if (oppId) {
          const opp = marksByPlayer[oppId] || (marksByPlayer[oppId] = blankShoveMarks());
          const oppRoom = Math.max(0, marksPerBox - Number(opp[key] || 0));
          const shove = Math.min(oppRoom, overflow);
          opp[key] = Number(opp[key] || 0) + shove;
          if (shove) events.push(`↪ ${shove} surplus poussé(s) à ${state.players.find((p) => p.id === oppId)?.name || "l'adversaire"}`);
        }
      } else if (overflowRule === 2) {
        const earned = overflow * overflowBonus;
        bonusScore += earned;
        events.push(`💰 Surplus converti · +${earned}`);
      } else events.push(`🪙 ${overflow} surplus perdu(s)`);
    }
  }
  const total = SHOVE_TARGETS.reduce((sum, n) => sum + Number(marks[String(n)] || 0), 0);
  state.progress[playerId] = total;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + gained * 25 + bonusScore;
  state.special.shoveHistory = [...(state.special.shoveHistory || []), { playerId, gained, total }].slice(-20);
  if (total >= SHOVE_TARGETS.length * marksPerBox) finishWith(state, playerId);
  return { delta: gained, hits };
}

function processGreenVsRed(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const color = String(state.special?.greenRedColorByPlayer?.[playerId] || "RED") as "RED" | "GREEN";
  const ownPath = color === "GREEN" ? GREEN_RING : RED_RING;
  const otherPath = color === "GREEN" ? RED_RING : GREEN_RING;
  const finishSteps = modeOptionNumber(state.config, "finishSteps", ownPath.length, 3, ownPath.length);
  const tripleAdvance = modeOptionNumber(state.config, "tripleAdvance", 2, 1, 3);
  const wrongColorAdvance = modeOptionNumber(state.config, "wrongColorAdvance", 1, 0, 3);
  let step = Number(state.special?.greenRedStepByPlayer?.[playerId] || 0);
  let delta = 0, hits = 0;
  for (const d of darts) {
    if (step >= finishSteps) break;
    const n = Number(d?.number || 0);
    const ringHit = d?.bed === "D" || d?.bed === "T";
    if (!ringHit) continue;
    if (n === ownPath[step]) {
      const advance = d.bed === "T" ? tripleAdvance : 1;
      step = Math.min(finishSteps, step + advance);
      hits += 1;
      delta += advance;
      events.push(`${color === "RED" ? "🔴" : "🟢"} ${d.bed}${n} · +${advance} étape(s)`);
    } else if ((otherPath as readonly number[]).includes(n)) {
      const oppId = nextOpponentId(state, playerId);
      if (oppId && wrongColorAdvance > 0) {
        const oppStep = Number(state.special?.greenRedStepByPlayer?.[oppId] || 0);
        state.special.greenRedStepByPlayer[oppId] = Math.min(finishSteps, oppStep + wrongColorAdvance);
        state.progress[oppId] = state.special.greenRedStepByPlayer[oppId];
        events.push(`⚠️ Mauvaise couleur · +${wrongColorAdvance} à ${state.players.find((p) => p.id === oppId)?.name || "l'adversaire"}`);
      } else if (oppId) events.push("⚠️ Mauvaise couleur · bonus adverse désactivé");
    }
  }
  state.special.greenRedStepByPlayer[playerId] = step;
  state.progress[playerId] = step;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta * 40;
  state.special.greenRedHistory = [...(state.special.greenRedHistory || []), { playerId, color, step }].slice(-20);
  if (step >= finishSteps) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta, hits };
}

function processSniper(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const contracts = Array.isArray(state.special?.sniperContracts) ? state.special.sniperContracts : [];
  let step = Number(state.special?.sniperStepByPlayer?.[playerId] || 0);
  let hits = 0, completed = 0, scoreDelta = 0;
  for (const d of darts) {
    if (step >= contracts.length) break;
    const contract = contracts[step];
    const hit = state.config.difficulty === "easy" && contract.number
      ? sameReplicatNumber(d, { bed: "S", number: contract.number } as GameDart)
      : (contract.bed === "OB" || contract.bed === "IB" ? d?.bed === contract.bed : d?.bed === contract.bed && Number(d?.number || 0) === Number(contract.number || 0));
    if (hit) {
      hits += 1;
      completed += 1;
      step += 1;
      const headshot = d?.bed === "T" || d?.bed === "IB";
      scoreDelta += headshot ? modeOptionNumber(state.config, "headshotBonus", 175, 100, 500) : 100;
      events.push(`🎯 ${headshot ? "HEADSHOT" : "CIBLE"} · ${exactTargetLabel(contract)} validé`);
    } else if (d && d.bed !== "MISS") {
      events.push(`• ${wave61DartLabel(d)} hors contrat`);
    }
  }
  state.special.sniperStepByPlayer[playerId] = step;
  state.progress[playerId] = step;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + scoreDelta;
  state.special.sniperHistory = [...(state.special.sniperHistory || []), { playerId, completed, step }].slice(-20);
  if (step >= Math.min(contracts.length, Math.max(1, state.config.goal || contracts.length))) finishWith(state, playerId);
  return { delta: completed, hits };
}

export function wave61LucioleTarget(state: Wave61State, playerId?: string): number {
  const id = playerId || state.players[state.activePlayerIndex]?.id;
  const seq = Array.isArray(state.special?.lucioleSequence) ? state.special.lucioleSequence : [];
  const step = Number(state.special?.lucioleStepByPlayer?.[id] || 0);
  return Number(seq[Math.min(step, Math.max(0, seq.length - 1))] || 0);
}

function processLuciole(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const seq = Array.isArray(state.special?.lucioleSequence) ? state.special.lucioleSequence : [];
  let step = Number(state.special?.lucioleStepByPlayer?.[playerId] || 0);
  if (step >= seq.length) return { delta: 0, hits: 0 };
  const expected = Number(seq[step] || 0);
  const matching = darts.find((d) => Number(d?.number || 0) === expected && d?.bed !== "MISS" && d?.bed !== "OB" && d?.bed !== "IB");
  const hits = matching ? 1 : 0;
  if (matching) {
    step += 1;
    events.push(`✨ Luciole ${expected} capturée · ${step}/${Math.min(seq.length, state.config.goal || seq.length)}`);
  } else {
    const fallbackPenalty = state.config.difficulty === "hard" ? 1 : 0;
    const wrongPenalty = modeOptionNumber(state.config, "wrongPenalty", fallbackPenalty, 0, 2);
    if (wrongPenalty > 0) step = Math.max(0, step - wrongPenalty);
    events.push(`🌑 Luciole ${expected} manquée${wrongPenalty > 0 ? ` · -${wrongPenalty} étape(s)` : ""}`);
  }
  state.special.lucioleStepByPlayer[playerId] = step;
  state.progress[playerId] = step;
  const scoreDelta = matching ? (matching.bed === "T" ? 100 : matching.bed === "D" ? 80 : 60) : 0;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + scoreDelta;
  state.special.lucioleHistory = [...(state.special.lucioleHistory || []), { playerId, expected, hit: !!matching, step }].slice(-20);
  if (step >= Math.min(seq.length, Math.max(1, state.config.goal || seq.length))) finishWith(state, playerId);
  return { delta: hits, hits };
}

function goldenCurrentTarget(state: Wave61State): number {
  const targets = Array.isArray(state.special?.goldenTargets) ? state.special.goldenTargets : [];
  const index = Math.min(Math.max(0, targets.length - 1), Number(state.special?.goldenIndex || 0));
  return Number(targets[index] || 0);
}

export function wave61GoldenTarget(state: Wave61State): number { return goldenCurrentTarget(state); }

function addGoldenClue(state: Wave61State, guess: number, target: number) {
  const clues = state.special.goldenClues || (state.special.goldenClues = []);
  const candidates = [
    { key: `range:${target > 10}`, label: target > 10 ? "La cible dorée est entre 11 et 20" : "La cible dorée est entre 1 et 10" },
    { key: `parity:${target % 2}`, label: target % 2 ? "La cible dorée est IMPAIRE" : "La cible dorée est PAIRE" },
    { key: `dir:${guess < target}`, label: guess < target ? `Elle est PLUS HAUTE que ${guess}` : `Elle est PLUS BASSE que ${guess}` },
    { key: `five:${target % 5 === 0}`, label: target % 5 === 0 ? "Elle est multiple de 5" : "Elle n'est pas multiple de 5" },
  ];
  const next = candidates.find((c) => !clues.some((x: any) => x.key === c.key));
  if (next) clues.push(next);
}

function processGoldenDart(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  let hits = 0, delta = 0;
  for (const d of darts) {
    if (state.phase === "finished") break;
    const target = goldenCurrentTarget(state);
    const guess = Number(d?.number || 0);
    if (!guess || d?.bed === "MISS" || d?.bed === "OB" || d?.bed === "IB") continue;
    if (guess === target) {
      hits += 1;
      delta += 1;
      state.progress[playerId] = Number(state.progress[playerId] || 0) + 1;
      const bonus = d.bed === "T" ? 300 : d.bed === "D" ? 200 : 120;
      state.scores[playerId] = Number(state.scores[playerId] || 0) + bonus;
      state.special.goldenHistory = [...(state.special.goldenHistory || []), { playerId, target, found: true, bed: d.bed }].slice(-20);
      state.special.goldenIndex = Number(state.special.goldenIndex || 0) + 1;
      state.special.goldenClues = [];
      events.push(`🌟 GOLDEN DART sur ${target} · +${bonus}`);
      if (state.progress[playerId] >= Math.max(1, state.config.goal || 7)) finishWith(state, playerId);
      break; // une seule cible dorée peut être trouvée par volée
    } else {
      const clueCount = modeOptionNumber(state.config, "cluesPerMiss", 1, 1, 3);
      for (let clueIndex = 0; clueIndex < clueCount; clueIndex++) addGoldenClue(state, guess, target);
      state.special.goldenHistory = [...(state.special.goldenHistory || []), { playerId, target, guess, found: false }].slice(-20);
      events.push(`🔎 ${guess} n'est pas la cible dorée`);
    }
  }
  return { delta, hits };
}

function processCodebreaker(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const codeLength = modeOptionNumber(state.config, "codeLength", 3, 2, 3);
  const secret = (state.special?.secretCode || []).map(Number).slice(0, codeLength);
  const guess = darts.slice(0, codeLength).map(dartNumberGuess);
  while (guess.length < codeLength) guess.push(0);
  const { exact, present } = scoreCodeGuess(secret, guess);
  state.special.codeHistory = [...(state.special.codeHistory || []), { playerId, guess, exact, present }].slice(-12);
  state.progress[playerId] = Math.max(Number(state.progress[playerId] || 0), exact);
  const delta = exact * 100 + present * 30;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  events.push(`🔐 ${guess.map((n) => n || "—").join(" · ")} · ${exact} exact(s) · ${present} déplacé(s)`);
  if (exact === secret.length && secret.length) {
    events.push("✅ CODE DÉVERROUILLÉ");
    finishWith(state, playerId);
  }
  return { delta, hits: exact + present };
}

type FaceTrait = { key: string; test: (n: number) => boolean; yes: string; no: string };
const FACE_TRAITS: FaceTrait[] = [
  { key: "even", test: (n) => n % 2 === 0, yes: "Le suspect est PAIR", no: "Le suspect est IMPAIR" },
  { key: "high", test: (n) => n >= 11, yes: "Le suspect est dans la moitié HAUTE (11–20)", no: "Le suspect est dans la moitié BASSE (1–10)" },
  { key: "prime", test: (n) => [2,3,5,7,11,13,17,19].includes(n), yes: "Le suspect appartient au clan PREMIER", no: "Le suspect n'appartient PAS au clan PREMIER" },
  { key: "three", test: (n) => n % 3 === 0, yes: "Le suspect porte le signe ×3", no: "Le suspect ne porte PAS le signe ×3" },
  { key: "five", test: (n) => n % 5 === 0, yes: "Le suspect porte le signe ×5", no: "Le suspect ne porte PAS le signe ×5" },
  { key: "edge", test: (n) => n <= 5 || n >= 16, yes: "Le suspect vient d'une zone EXTRÊME", no: "Le suspect vient de la zone CENTRALE" },
];

export function wave61FaceTraitSummary(n: number): string[] {
  return FACE_TRAITS.map((trait) => trait.test(Number(n)) ? trait.yes : trait.no);
}

function nextFaceTrait(state: Wave61State): FaceTrait | null {
  const used = new Set((state.special?.faceClues || []).map((c: any) => String(c?.key || "")));
  return FACE_TRAITS.find((trait) => !used.has(trait.key)) || null;
}

function processFaceMystere(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const secret = Number(state.special?.faceSecret || 0);
  let candidates = Array.isArray(state.special?.faceCandidates) ? state.special.faceCandidates.map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
  let delta = 0, hits = 0;
  for (const dart of darts) {
    const guess = dartNumberGuess(dart);
    if (!guess || state.phase === "finished") continue;
    state.special.faceHistory = [...(state.special.faceHistory || []), { playerId, guess }].slice(-20);
    if (guess === secret) {
      hits += 1;
      delta += Math.max(1, candidates.length);
      state.scores[playerId] = Number(state.scores[playerId] || 0) + 250 + Math.max(0, 20 - state.turnIndex * 5);
      events.push(`🕵️ Suspect ${guess} identifié !`);
      finishWith(state, playerId);
      break;
    }
    candidates = candidates.filter((n) => n !== guess);
    const before = candidates.length;
    const cluesPerMiss = modeOptionNumber(state.config, "cluesPerMiss", 1, 1, 2);
    let clueAdded = false;
    for (let clueIndex = 0; clueIndex < cluesPerMiss; clueIndex++) {
      const trait = nextFaceTrait(state);
      if (!trait) break;
      const answer = trait.test(secret);
      candidates = candidates.filter((n) => trait.test(n) === answer);
      const label = answer ? trait.yes : trait.no;
      state.special.faceClues = [...(state.special.faceClues || []), { key: trait.key, label }];
      events.push(`🔎 ${label}`);
      clueAdded = true;
    }
    if (!clueAdded) events.push(`❌ Suspect ${guess} écarté`);
    const removed = Math.max(1, before - candidates.length + 1);
    delta += removed;
    state.scores[playerId] = Number(state.scores[playerId] || 0) + removed * 8;
  }
  state.special.faceCandidates = candidates;
  state.progress[playerId] = Math.max(Number(state.progress[playerId] || 0), 20 - candidates.length);
  if (state.phase === "playing" && candidates.length === 1) events.push(`💡 Un seul suspect reste : vise-le pour conclure`);
  return { delta, hits };
}

function processColinMaillard(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const seq = Array.isArray(state.special?.colinSequence) ? state.special.colinSequence.map(Number) : [];
  let step = Number(state.special?.colinStepByPlayer?.[playerId] || 0);
  let hits = 0;
  for (const dart of darts) {
    if (step >= seq.length) break;
    const guess = dartNumberGuess(dart);
    if (!guess) continue;
    const expected = seq[step];
    if (guess === expected) {
      hits += 1;
      step += 1;
      events.push(`🧠 Mémoire juste · étape ${step}/${seq.length}`);
    } else {
      const previous = step;
      if (state.config.difficulty === "hard") step = 0;
      else if (state.config.difficulty === "normal") step = Math.max(0, step - 1);
      events.push(previous === step ? "🙈 Raté · séquence conservée" : `🙈 Raté · retour étape ${step + 1}`);
    }
  }
  state.special.colinStepByPlayer = { ...(state.special.colinStepByPlayer || {}), [playerId]: step };
  state.progress[playerId] = step;
  const delta = hits * 25;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  if (step >= seq.length && seq.length) {
    events.push("✅ Séquence mémorisée complète");
    finishWith(state, playerId);
  }
  return { delta, hits };
}


function processTugRush(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const target = getWave61Target(state);
  const side = String(state.special?.tugSideByPlayer?.[playerId] || "A") === "B" ? "B" : "A";
  const sign = side === "A" ? 1 : -1;
  const pullFactor = modeOptionNumber(state.config, "pullPowerPct", 100, 50, 160) / 100;
  const bullFactor = modeOptionNumber(state.config, "bullBoostPct", 100, 50, 180) / 100;
  let pull = 0, hits = 0;
  for (const dart of darts) {
    if (dart?.bed === "IB") { pull += 14 * bullFactor; hits += 1; continue; }
    if (dart?.bed === "OB") { pull += 8 * bullFactor; hits += 1; continue; }
    if (target?.kind === "number" && Number(dart?.number || 0) === target.value && dart?.bed !== "MISS") {
      pull += (dart.bed === "T" ? 10 : dart.bed === "D" ? 7 : 4) * pullFactor;
      hits += 1;
    }
  }
  if (!pull) {
    const configuredSlip = modeOptionNumber(state.config, "slipPenalty", 0, 0, 8);
    const slip = configuredSlip > 0 ? configuredSlip : (state.config.difficulty === "hard" ? 4 : state.config.difficulty === "easy" ? 1 : 2);
    state.special.tugPosition = clamp(Number(state.special?.tugPosition || 0) - sign * slip, -state.config.goal, state.config.goal);
    events.push(`🧤 Corde glissante · recul ${slip}`);
  } else {
    pull = Math.max(0, Math.round(pull));
    state.special.tugPosition = clamp(Number(state.special?.tugPosition || 0) + sign * pull, -state.config.goal, state.config.goal);
    state.special.tugContributionByPlayer[playerId] = Number(state.special?.tugContributionByPlayer?.[playerId] || 0) + pull;
    state.progress[playerId] = Number(state.special.tugContributionByPlayer[playerId] || 0);
    state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
    events.push(`💪 Camp ${side} tire de ${pull}`);
  }
  state.special.tugHistory = [...(state.special?.tugHistory || []), { playerId, side, pull, position: state.special.tugPosition }].slice(-30);
  if (Math.abs(Number(state.special.tugPosition || 0)) >= Math.max(1, state.config.goal)) finishWith(state, playerId, side);
  return { delta: pull, hits };
}

function processSoleil(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const phase = soleilPhase(state);
  const target = getWave61Target(state);
  let delta = 0, hits = 0;
  if (phase === "STOP") {
    let moved = 0, frozen = 0;
    for (const dart of darts) {
      if (!dart || dart.bed === "MISS") { frozen += 1; continue; }
      if (dart.bed === "OB" || dart.bed === "IB") { frozen += 1; hits += 1; continue; }
      moved += 1;
    }
    if (moved) {
      const penaltyUnit = modeOptionNumber(state.config, "stopPenalty", state.config.difficulty === "hard" ? 12 : state.config.difficulty === "easy" ? 5 : 8, 0, 30);
      const penalty = moved * penaltyUnit;
      state.progress[playerId] = Math.max(0, Number(state.progress[playerId] || 0) - penalty);
      state.special.soleilFallsByPlayer[playerId] = Number(state.special?.soleilFallsByPlayer?.[playerId] || 0) + 1;
      events.push(`🔴 BOUGÉ ! recul de ${penalty}`);
    } else {
      delta = frozen > 0 ? modeOptionNumber(state.config, "freezeBonus", 3, 0, 12) : 0;
      state.progress[playerId] = Math.min(state.config.goal, Number(state.progress[playerId] || 0) + delta);
      events.push("🧊 Parfaitement immobile");
    }
  } else {
    for (const dart of darts) {
      if (target?.kind === "number" && Number(dart?.number || 0) === target.value && dart?.bed !== "MISS") {
        const moveFactor = modeOptionNumber(state.config, "movePowerPct", 100, 50, 180) / 100;
        const step = Math.max(1, Math.round(bedPower(dart, 4, 8, 12, 6, 10) * moveFactor));
        delta += step;
        hits += 1;
      }
    }
    state.progress[playerId] = Math.min(state.config.goal, Number(state.progress[playerId] || 0) + delta);
    state.scores[playerId] = Number(state.scores[playerId] || 0) + delta * 10;
    events.push(delta ? `🟢 Avance de ${delta}` : "🟢 Aucun pas validé");
  }
  state.special.soleilHistory = [...(state.special?.soleilHistory || []), { playerId, phase, delta, progress: state.progress[playerId] }].slice(-30);
  if (Number(state.progress[playerId] || 0) >= state.config.goal) finishWith(state, playerId);
  return { delta, hits };
}

function processChatSouris(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const role = String(state.special?.chatSourisRoleByPlayer?.[playerId] || "MOUSE");
  const target = getWave61Target(state);
  let pos = Number(state.special?.chatSourisPosByPlayer?.[playerId] || 0);
  let delta = 0, hits = 0;
  for (const dart of darts) {
    let step = 0;
    const moveFactor = modeOptionNumber(state.config, "movementPowerPct", 100, 50, 180) / 100;
    const bullFactor = modeOptionNumber(state.config, "bullShortcutPct", 100, 50, 180) / 100;
    if (dart?.bed === "IB") step = Math.max(1, Math.round(14 * bullFactor));
    else if (dart?.bed === "OB") step = Math.max(1, Math.round(9 * bullFactor));
    else if (target?.kind === "number" && Number(dart?.number || 0) === target.value && dart?.bed !== "MISS") step = Math.max(1, Math.round((dart.bed === "T" ? 12 : dart.bed === "D" ? 8 : 5) * moveFactor));
    if (step) { delta += step; hits += 1; pos += step; }
  }
  pos = Math.min(state.config.goal, pos);
  state.special.chatSourisPosByPlayer[playerId] = pos;
  state.progress[playerId] = pos;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
  if (role === "CAT") {
    const mice = state.players.filter((p) => state.special?.chatSourisRoleByPlayer?.[p.id] === "MOUSE" && !state.special?.chatSourisCaughtByPlayer?.[p.id]);
    for (const mouse of mice) {
      const mousePos = Number(state.special?.chatSourisPosByPlayer?.[mouse.id] || 0);
      if (pos >= mousePos) {
        state.special.chatSourisCaughtByPlayer[mouse.id] = true;
        state.eliminated[mouse.id] = true;
        events.push(`🐱 ${mouse.name} capturé(e)`);
      }
    }
    const remaining = state.players.filter((p) => state.special?.chatSourisRoleByPlayer?.[p.id] === "MOUSE" && !state.special?.chatSourisCaughtByPlayer?.[p.id]);
    if (!remaining.length) finishWith(state, playerId, state.config.participantMode === "teams" ? "A" : null);
  } else if (pos >= state.config.goal) {
    events.push("🐭 La souris atteint le refuge !");
    finishWith(state, playerId, state.config.participantMode === "teams" ? "B" : null);
  }
  state.special.chatSourisHistory = [...(state.special?.chatSourisHistory || []), { playerId, role, delta, pos }].slice(-30);
  if (!delta) events.push(role === "CAT" ? "🐱 La souris garde ses distances" : "🐭 Pas d'avance");
  return { delta, hits };
}

function processMazeChase(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  let pos = Number(state.special?.mazePosByPlayer?.[playerId] || 0);
  const ghostGap = modeOptionNumber(state.config, "ghostGap", 6, 2, 12);
  const ghostAdvance = modeOptionNumber(state.config, "ghostAdvance", 1, 0, 4);
  let ghost = Number(state.special?.mazeGhostByPlayer?.[playerId] ?? -ghostGap);
  let power = Number(state.special?.mazePowerByPlayer?.[playerId] || 0);
  let delta = 0, hits = 0;
  const route = state.special?.mazeRoute || [];
  for (const dart of darts) {
    if (dart?.bed === "OB" || dart?.bed === "IB") {
      const move = dart.bed === "IB" ? 4 : 3;
      pos += move; delta += move; hits += 1; power += modeOptionNumber(state.config, "bullPowerCharge", 1, 1, 4);
      events.push(`⚡ Power mode +${move}`);
      continue;
    }
    const expected = raceTargetFromSequence(route, pos);
    if (Number(dart?.number || 0) === expected && dart?.bed !== "MISS") {
      const move = bedPower(dart, 1, 2, 3, 2, 4);
      pos += move; delta += move; hits += 1;
    } else {
      ghost += ghostAdvance;
    }
  }
  ghost += Math.max(0, ghostAdvance - 1);
  if (ghost >= pos) {
    if (power > 0) {
      power -= 1;
      ghost = pos - ghostGap;
      events.push("⚡ Power utilisé · poursuivant repoussé");
    } else {
      pos = Math.max(0, pos - 3);
      ghost = pos - ghostGap;
      events.push("👻 Rattrapé · recul de 3 cases");
    }
  }
  pos = Math.min(Math.max(1, state.config.goal), pos);
  state.special.mazePosByPlayer[playerId] = pos;
  state.special.mazeGhostByPlayer[playerId] = ghost;
  state.special.mazePowerByPlayer[playerId] = power;
  state.progress[playerId] = pos;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta * 25;
  state.special.mazeHistory = [...(state.special?.mazeHistory || []), { playerId, pos, ghost, power, delta }].slice(-30);
  if (pos >= state.config.goal) finishWith(state, playerId);
  return { delta, hits };
}

function processChienChat(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const role = String(state.special?.chienChatRoleByPlayer?.[playerId] || "DOG");
  const bonusSector = role === "DOG" ? 5 : 17;
  let pos = Number(state.special?.chienChatPosByPlayer?.[playerId] || 0);
  let delta = 0, hits = 0;
  const route = state.special?.chienChatRoute || [];
  for (const dart of darts) {
    if (dart?.bed === "IB" || dart?.bed === "OB") {
      const shortcut = modeOptionNumber(state.config, "bullShortcut", 12, 4, 24);
      const move = dart.bed === "IB" ? shortcut + 6 : shortcut;
      pos += move; delta += move; hits += 1; events.push("⚡ Raccourci BULL");
      continue;
    }
    const expected = raceTargetFromSequence(route, Math.floor(pos / 6));
    const n = Number(dart?.number || 0);
    if (n === bonusSector && dart?.bed !== "MISS") {
      const move = modeOptionNumber(state.config, "bonusMove", 10, 4, 20) + (dart.bed === "T" ? 4 : dart.bed === "D" ? 2 : 0);
      pos += move; delta += move; hits += 1; events.push(role === "DOG" ? "🦴 Os bonus !" : "🐟 Poisson bonus !");
    } else if (n === expected && dart?.bed !== "MISS") {
      const routeFactor = modeOptionNumber(state.config, "routePowerPct", 100, 50, 180) / 100;
      const move = Math.max(1, Math.round((dart.bed === "T" ? 11 : dart.bed === "D" ? 7 : 4) * routeFactor));
      pos += move; delta += move; hits += 1;
    }
  }
  pos = Math.min(state.config.goal, pos);
  state.special.chienChatPosByPlayer[playerId] = pos;
  state.progress[playerId] = pos;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
  state.special.chienChatHistory = [...(state.special?.chienChatHistory || []), { playerId, role, pos, delta }].slice(-30);
  if (pos >= state.config.goal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta, hits };
}

function processRollerCoaster(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  let pos = Number(state.special?.rollerPosByPlayer?.[playerId] || 0);
  let speed = Number(state.special?.rollerSpeedByPlayer?.[playerId] || 20);
  let delta = 0, hits = 0;
  for (const dart of darts) {
    const section = currentRollerSection(state, playerId);
    if (dart?.bed === "IB" || dart?.bed === "OB") {
      const bullFactor = modeOptionNumber(state.config, "bullBoostPct", 100, 50, 180) / 100;
      speed = clamp(speed + Math.round((dart.bed === "IB" ? 24 : 16) * bullFactor), 0, 100);
      const move = Math.max(1, Math.round((dart.bed === "IB" ? 14 : 10) * bullFactor));
      pos += move; delta += move; hits += 1;
    } else if (Number(dart?.number || 0) === Number(section.target) && dart?.bed !== "MISS") {
      speed = clamp(speed + bedPower(dart, 6, 12, 18), 0, 100);
      const move = Math.max(3, Math.round(speed / 10));
      pos += move; delta += move; hits += 1;
    } else {
      const missLoss = modeOptionNumber(state.config, "missSpeedLoss", 10, 0, 25);
      speed = clamp(speed - (dart?.bed === "MISS" ? missLoss : Math.ceil(missLoss / 2)), 0, 100);
    }
  }
  const section = currentRollerSection({ ...state, special: { ...state.special, rollerPosByPlayer: { ...state.special.rollerPosByPlayer, [playerId]: pos } } } as any, playerId);
  const dangerLimit = modeOptionNumber(state.config, "dangerLimit", state.config.difficulty === "hard" ? 60 : state.config.difficulty === "easy" ? 85 : 72, 40, 100);
  if (section.danger && speed > dangerLimit) {
    pos = Math.max(0, pos - 12);
    speed = 35;
    events.push(`🎢 ${section.name} trop rapide · -12`);
  } else events.push(`🎢 ${section.name} · vitesse ${Math.round(speed)}%`);
  pos = Math.min(state.config.goal, pos);
  state.special.rollerPosByPlayer[playerId] = pos;
  state.special.rollerSpeedByPlayer[playerId] = speed;
  state.progress[playerId] = pos;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
  state.special.rollerHistory = [...(state.special?.rollerHistory || []), { playerId, pos, speed, section: section.name }].slice(-30);
  if (pos >= state.config.goal) finishWith(state, playerId);
  return { delta, hits };
}

function processAthletisme(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const discipline = currentAthleticsDiscipline(state);
  const scores = darts.map(wave61DartScore);
  const visitScore = scores.reduce((a,b)=>a+b,0);
  let points = 0, hits = darts.filter((d)=>wave61DartScore(d)>0).length;
  if (discipline === "SPRINT") points = Math.round(visitScore / 2) + darts.filter((d)=>d?.bed==="T").length * modeOptionNumber(state.config, "sprintTripleBonus", 5, 0, 30);
  else if (discipline === "HAIES") {
    hits = darts.filter((d)=>Number(d?.number||0)===20 && d?.bed!=="MISS").length;
    points = darts.reduce((sum,d)=>sum+(Number(d?.number||0)===20 ? bedPower(d,12,20,28) : 0),0);
  } else if (discipline === "LONGUEUR") points = Math.round(Math.max(0,...scores) * 1.5);
  else if (discipline === "HAUTEUR") points = darts.reduce((sum,d)=>sum+(d?.bed==="T"?30:d?.bed==="D"?20:d?.bed==="IB"?40:d?.bed==="OB"?25:0),0);
  else if (discipline === "JAVELOT") points = Math.round(Math.max(0,...scores) + visitScore / 6);
  else if (discipline === "RELAIS") {
    const relay = [20,19,18];
    hits = 0;
    for (let i=0;i<Math.min(3,darts.length);i++) if (Number(darts[i]?.number||0)===relay[i] && darts[i]?.bed!=="MISS") hits += 1; else break;
    points = hits * 30 + (hits === 3 ? modeOptionNumber(state.config, "relayPerfectBonus", 30, 0, 100) : 0);
  }
  points = Math.max(0, Math.round(points * (modeOptionNumber(state.config, "scoreMultiplierPct", 100, 50, 180) / 100)));
  const results = state.special.athleticsResultsByPlayer[playerId] || (state.special.athleticsResultsByPlayer[playerId] = {});
  results[discipline] = Math.max(Number(results[discipline] || 0), points);
  state.scores[playerId] = Number(state.scores[playerId] || 0) + points;
  state.progress[playerId] = state.scores[playerId];
  state.special.athleticsHistory = [...(state.special?.athleticsHistory || []), { playerId, discipline, points }].slice(-40);
  events.push(`🏟️ ${discipline} · ${points} pts`);
  return { delta: points, hits };
}

function processChuteLibre(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const startAltitude = modeOptionNumber(state.config, "startAltitude", 4000, 2000, 7000);
  let altitude = Number(state.special?.freefallAltitudeByPlayer?.[playerId] ?? startAltitude);
  let chute = !!state.special?.freefallChuteByPlayer?.[playerId];
  const window = freefallWindow(state.config.difficulty, state.config);
  const fallFactor = modeOptionNumber(state.config, "fallSpeedPct", 100, 50, 180) / 100;
  let hits = 0, descent = 0;
  for (const dart of darts) {
    if (!chute && (dart?.bed === "OB" || dart?.bed === "IB")) {
      if (altitude <= window.high && altitude >= window.low) {
        chute = true; events.push(`🪂 Parachute ouvert à ${Math.round(altitude)} m`);
      } else if (altitude > window.high) events.push("🪂 Trop tôt pour ouvrir");
      else events.push("⚠️ Trop bas pour ouvrir");
    }
    const score = wave61DartScore(dart);
    if (score > 0) hits += 1;
    const factor = (chute ? 2 : window.fallFactor) * fallFactor;
    const step = Math.round(score * factor);
    altitude -= step;
    descent += step;
    if (altitude <= 0) break;
  }
  altitude = Math.max(0, altitude);
  state.special.freefallAltitudeByPlayer[playerId] = altitude;
  state.special.freefallChuteByPlayer[playerId] = chute;
  state.progress[playerId] = clamp(Math.round(((startAltitude - altitude) / Math.max(1, startAltitude)) * 100), 0, 100);
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
  if (altitude <= 0) {
    if (chute) {
      const bonus = 500 + Math.max(0, 300 - Math.round(descent / 10));
      state.scores[playerId] += bonus;
      events.push(`✅ Atterrissage contrôlé · +${bonus}`);
      finishWith(state, playerId);
    } else {
      state.special.freefallCrashedByPlayer[playerId] = true;
      state.eliminated[playerId] = true;
      events.push("💥 CRASH · parachute non ouvert");
      const alive = state.players.filter((p)=>!state.eliminated[p.id]);
      if (alive.length === 1 && state.players.length > 1) finishWith(state, alive[0].id);
      else if (!alive.length) {
        const winner = [...state.players].sort((a,b)=>Number(state.progress[b.id]||0)-Number(state.progress[a.id]||0))[0]?.id || playerId;
        finishWith(state, winner);
      }
    }
  } else events.push(`🪂 Altitude ${Math.round(altitude)} m${chute ? " · voile ouverte" : ""}`);
  state.special.freefallHistory = [...(state.special?.freefallHistory || []), { playerId, altitude, chute, descent }].slice(-30);
  return { delta: descent, hits };
}

function processTyrolien(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  let pos = Number(state.special?.tyrolienPosByPlayer?.[playerId] || 0);
  let speed = Number(state.special?.tyrolienSpeedByPlayer?.[playerId] ?? modeOptionNumber(state.config, "startSpeed", 20, 0, 60));
  const boostFactor = modeOptionNumber(state.config, "boostPowerPct", 100, 50, 180) / 100;
  let delta = 0, hits = 0;
  for (const dart of darts) {
    const stage = currentTyrolienStage(state, playerId);
    if (dart?.bed === "IB" || dart?.bed === "OB") {
      speed = clamp(speed + Math.round((dart.bed === "IB" ? 18 : 12) * boostFactor), 0, 100);
      const move = Math.max(1, Math.round((dart.bed === "IB" ? 16 : 11) * boostFactor));
      pos += move; delta += move; hits += 1;
    } else if (Number(dart?.number || 0) === Number(stage.target) && dart?.bed !== "MISS") {
      const move = dart.bed === "T" ? 15 : dart.bed === "D" ? 10 : 6;
      speed = clamp(speed + Math.round(bedPower(dart, 4, 7, 11) * boostFactor), 0, 100);
      pos += move + Math.floor(speed / 25);
      delta += move + Math.floor(speed / 25);
      hits += 1;
    } else speed = clamp(speed - 7, 0, 100);
  }
  const stage = currentTyrolienStage({ ...state, special: { ...state.special, tyrolienPosByPlayer: { ...state.special.tyrolienPosByPlayer, [playerId]: pos } } } as any, playerId);
  if ((stage.index === 2 || stage.index === 3) && hits === 0) {
    const windPenalty = modeOptionNumber(state.config, "windPenalty", 4, 0, 12);
    pos = Math.max(0, pos - windPenalty);
    events.push(`🌬️ ${stage.name} · recul de ${windPenalty}`);
  }
  pos = Math.min(state.config.goal, pos);
  state.special.tyrolienPosByPlayer[playerId] = pos;
  state.special.tyrolienSpeedByPlayer[playerId] = speed;
  state.progress[playerId] = pos;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((s,d)=>s+wave61DartScore(d),0);
  state.special.tyrolienHistory = [...(state.special?.tyrolienHistory || []), { playerId, pos, speed, stage: stage.name }].slice(-30);
  events.push(`🪢 ${stage.name} · ${Math.round(pos)}/${state.config.goal}`);
  if (pos >= state.config.goal) finishWith(state, playerId);
  return { delta, hits };
}

function processSautCorde(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  let jumps = Number(state.progress[playerId] || 0);
  let combo = Number(state.special?.ropeComboByPlayer?.[playerId] || 0);
  let step = Number(state.special?.ropeStepByPlayer?.[playerId] || 0);
  let delta = 0, hits = 0;
  const sequence = state.special?.ropeSequence || [];
  for (const dart of darts) {
    const expected = raceTargetFromSequence(sequence, step);
    if (dart?.bed === "IB" || dart?.bed === "OB") {
      const bullFactor = modeOptionNumber(state.config, "bullJumpBonusPct", 100, 50, 180) / 100;
      const add = Math.max(1, Math.round((dart.bed === "IB" ? 6 : 4) * bullFactor));
      jumps += add; delta += add; combo += 2; hits += 1; step += 1;
    } else if (Number(dart?.number || 0) === expected && dart?.bed !== "MISS") {
      const add = bedPower(dart, 1, 2, 3);
      jumps += add; delta += add; combo += add; hits += 1; step += 1;
    } else {
      const missPenalty = modeOptionNumber(state.config, "missJumpPenalty", state.config.difficulty === "hard" ? 2 : 0, 0, 8);
      jumps = Math.max(0, jumps - missPenalty);
      combo = 0;
      events.push("💢 Corde touchée · combo cassé");
    }
  }
  const paceStep = modeOptionNumber(state.config, "paceStep", 10, 4, 30);
  const pace = 1 + Math.min(5, Math.floor(combo / paceStep));
  state.progress[playerId] = Math.min(state.config.goal, jumps);
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta * (10 + pace * 2);
  state.special.ropeComboByPlayer[playerId] = combo;
  state.special.ropeStepByPlayer[playerId] = step;
  state.special.ropePaceByPlayer[playerId] = pace;
  state.special.ropeHistory = [...(state.special?.ropeHistory || []), { playerId, jumps: state.progress[playerId], combo, pace }].slice(-30);
  events.push(`🪢 ${state.progress[playerId]} sauts · combo ${combo} · rythme ${pace}`);
  if (Number(state.progress[playerId] || 0) >= state.config.goal) finishWith(state, playerId);
  return { delta, hits };
}

function processHeist180(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let stage = Number(state.special?.heistStageByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.heistMarksByPlayer?.[playerId] || 0);
  let loot = Number(state.special?.heistLootByPlayer?.[playerId] || 0);
  let heat = Number(state.special?.heistHeatByPlayer?.[playerId] || 0);
  const hits = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length;
  const power = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  const wrong = nonBullWrongCount(darts, target, state.config.difficulty) + darts.filter((d) => d?.bed === "MISS").length;
  marks += power;
  loot += darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).reduce((s, d) => s + wave61DartScore(d), 0);
  const heatGain = modeOptionNumber(state.config, "heatGain", state.config.difficulty === "hard" ? 12 : 8, 0, 30);
  const bullCooling = modeOptionNumber(state.config, "bullCooling", 18, 0, 50);
  heat = clamp(heat + wrong * heatGain - bulls * bullCooling, 0, 100);
  const threshold = modeOptionNumber(state.config, "phaseNeed", missionThreshold(state.config.difficulty), 1, 8);
  if (marks >= threshold) {
    stage += 1;
    marks = 0;
    events.push(`✅ Phase ${HEIST_STAGES[Math.min(stage - 1, HEIST_STAGES.length - 1)]} réussie`);
  }
  if (heat >= 100 && stage < HEIST_STAGES.length) {
    stage = Math.max(0, stage - 1);
    heat = 55;
    marks = 0;
    events.push("🚨 ALARME ! Une phase est perdue");
  }
  state.special.heistStageByPlayer[playerId] = stage;
  state.special.heistMarksByPlayer[playerId] = marks;
  state.special.heistLootByPlayer[playerId] = loot;
  state.special.heistHeatByPlayer[playerId] = heat;
  state.progress[playerId] = Math.min(100, stage * 25);
  state.scores[playerId] = loot;
  state.special.heistHistory = [...(state.special?.heistHistory || []), { playerId, stage, loot, heat }].slice(-40);
  if (stage >= HEIST_STAGES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processEscapeGame(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let step = Number(state.special?.escapeStepByPlayer?.[playerId] || 0);
  let penalty = Number(state.special?.escapePenaltyByPlayer?.[playerId] || 0);
  let jokers = Number(state.special?.escapeJokersByPlayer?.[playerId] || 0);
  const direct = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length;
  const bulls = bullCount(darts);
  const jokerSteps = darts.reduce((s, d) => s + (d?.bed === "IB" ? 2 : d?.bed === "OB" ? 1 : 0), 0);
  const hits = direct + bulls;
  const directPower = modeOptionNumber(state.config, "directStepPower", 1, 1, 3);
  const jokerPower = modeOptionNumber(state.config, "bullJokerPower", 1, 1, 4);
  let gain = direct * directPower + jokerSteps * jokerPower;
  if (gain > 0) {
    const before = step;
    step = Math.min(ESCAPE_STAGES.length, step + gain);
    jokers += jokerSteps * jokerPower;
    penalty = Math.max(0, penalty - 1);
    events.push(`🔓 ${step - before} verrou(s) franchi(s)`);
  } else {
    penalty += 1;
    const backAfter = modeOptionNumber(state.config, "penaltyBackAfter", 3, 1, 6);
    if (penalty >= backAfter && step > 0) {
      step = Math.max(0, step - 1);
      penalty = 0;
      events.push("⏳ Trop d’erreurs · un verrou se referme");
    } else events.push(`⏳ Mauvaise piste · pénalité ${penalty}/${backAfter}`);
  }
  state.special.escapeStepByPlayer[playerId] = step;
  state.special.escapePenaltyByPlayer[playerId] = penalty;
  state.special.escapeJokersByPlayer[playerId] = jokers;
  state.progress[playerId] = Math.round((step / ESCAPE_STAGES.length) * 100);
  state.scores[playerId] += darts.reduce((s, d) => s + wave61DartScore(d), 0);
  state.special.escapeHistory = [...(state.special?.escapeHistory || []), { playerId, step, penalty, jokers }].slice(-40);
  if (step >= ESCAPE_STAGES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: gain, hits };
}

function processObjectifLune(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let stage = Number(state.special?.lunarStageByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.lunarMarksByPlayer?.[playerId] || 0);
  let fuel = Number(state.special?.lunarFuelByPlayer?.[playerId] || 0);
  let stability = Number(state.special?.lunarStabilityByPlayer?.[playerId] || 100);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  const fuelFactor = modeOptionNumber(state.config, "fuelGainPct", 100, 50, 180) / 100;
  const stabilityLoss = modeOptionNumber(state.config, "stabilityLoss", 8, 0, 25);
  fuel = clamp(fuel + Math.round((power * 9 + bulls * 18) * fuelFactor) - (stage > 0 ? 5 : 0), 0, 100);
  stability = clamp(stability - wrong * stabilityLoss + bulls * 6, 0, 100);
  marks += power;
  const need = stage === 0 ? 4 : stage === 3 ? 4 : 3;
  const fuelMinimum = modeOptionNumber(state.config, "fuelMinimum", 35, 10, 80);
  if (stage === 0 && fuel < fuelMinimum) events.push(`⛽ Carburant ${fuel}% · minimum ${fuelMinimum}%`);
  else if (marks >= need) {
    stage += 1;
    marks = 0;
    events.push(`🚀 ${LUNAR_PHASES[Math.min(stage - 1, LUNAR_PHASES.length - 1)]} validé`);
  }
  if (stability <= 0 && stage > 0) {
    stage = Math.max(0, stage - 1);
    stability = 55;
    marks = 0;
    events.push("🌀 Trajectoire perdue · retour d'une phase");
  }
  state.special.lunarStageByPlayer[playerId] = stage;
  state.special.lunarMarksByPlayer[playerId] = marks;
  state.special.lunarFuelByPlayer[playerId] = fuel;
  state.special.lunarStabilityByPlayer[playerId] = stability;
  state.progress[playerId] = Math.min(100, stage * 25);
  state.scores[playerId] += darts.reduce((s, d) => s + wave61DartScore(d), 0);
  state.special.lunarHistory = [...(state.special?.lunarHistory || []), { playerId, stage, fuel, stability }].slice(-40);
  if (stage >= LUNAR_PHASES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processHollywood(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let scene = Number(state.special?.hollywoodSceneByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.hollywoodMarksByPlayer?.[playerId] || 0);
  let stars = Number(state.special?.hollywoodStarsByPlayer?.[playerId] || 0);
  let boxOffice = Number(state.special?.hollywoodBoxOfficeByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  marks += power;
  const starFactor = modeOptionNumber(state.config, "starPowerPct", 100, 50, 180) / 100;
  const boxFactor = modeOptionNumber(state.config, "boxOfficePct", 100, 50, 180) / 100;
  stars += Math.max(0, Math.round((power + bulls) * starFactor));
  boxOffice += Math.max(0, Math.round(darts.reduce((s, d) => s + wave61DartScore(d), 0) * boxFactor));
  const need = modeOptionNumber(state.config, "sceneNeed", missionThreshold(state.config.difficulty, 2, 3, 4), 1, 8);
  if (marks >= need) {
    scene += 1;
    marks = 0;
    events.push(`🎬 Scène ${HOLLYWOOD_SCENES[Math.min(scene - 1, HOLLYWOOD_SCENES.length - 1)]} dans la boîte !`);
  }
  state.special.hollywoodSceneByPlayer[playerId] = scene;
  state.special.hollywoodMarksByPlayer[playerId] = marks;
  state.special.hollywoodStarsByPlayer[playerId] = stars;
  state.special.hollywoodBoxOfficeByPlayer[playerId] = boxOffice;
  state.progress[playerId] = Math.round((scene / HOLLYWOOD_SCENES.length) * 100);
  state.scores[playerId] = boxOffice + stars * 10;
  state.special.hollywoodHistory = [...(state.special?.hollywoodHistory || []), { playerId, scene, stars, boxOffice }].slice(-40);
  if (scene >= HOLLYWOOD_SCENES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processMaya(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let seal = Number(state.special?.mayaSealByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.mayaMarksByPlayer?.[playerId] || 0);
  let doom = Number(state.special?.mayaDoomByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  marks += power;
  const doomGain = modeOptionNumber(state.config, "doomGain", state.config.difficulty === "hard" ? 14 : 10, 0, 30);
  const bullRelief = modeOptionNumber(state.config, "bullDoomRelief", 20, 0, 60);
  doom = clamp(doom + wrong * doomGain - bulls * bullRelief, 0, 100);
  if (marks >= modeOptionNumber(state.config, "sealNeed", missionThreshold(state.config.difficulty, 2, 3, 4), 1, 8)) {
    seal += 1;
    marks = 0;
    events.push(`☀️ Sceau ${MAYA_CYCLES[Math.min(seal - 1, MAYA_CYCLES.length - 1)]} activé`);
  }
  if (doom >= 100 && seal < MAYA_CYCLES.length) {
    seal = Math.max(0, seal - 1);
    doom = 50;
    marks = 0;
    events.push("🌋 Le cycle se brise · un sceau est perdu");
  }
  state.special.mayaSealByPlayer[playerId] = seal;
  state.special.mayaMarksByPlayer[playerId] = marks;
  state.special.mayaDoomByPlayer[playerId] = doom;
  state.progress[playerId] = Math.round((seal / MAYA_CYCLES.length) * 100);
  state.scores[playerId] += hits * 40 + bulls * 25;
  state.special.mayaHistory = [...(state.special?.mayaHistory || []), { playerId, seal, doom }].slice(-40);
  if (seal >= MAYA_CYCLES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processPyramides(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let chamber = Number(state.special?.pyramidChamberByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.pyramidMarksByPlayer?.[playerId] || 0);
  let torch = Number(state.special?.pyramidTorchByPlayer?.[playerId] || modeOptionNumber(state.config, "torchStart", 70, 40, 100));
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  marks += power;
  torch = clamp(torch + bulls * 18 - wrong * modeOptionNumber(state.config, "torchDrain", 9, 3, 20), 0, 100);
  if (marks >= modeOptionNumber(state.config, "chamberNeed", missionThreshold(state.config.difficulty, 2, 3, 4), 2, 6)) {
    chamber += 1;
    marks = 0;
    events.push(`🗝️ ${PYRAMID_CHAMBERS[Math.min(chamber - 1, PYRAMID_CHAMBERS.length - 1)]} franchie`);
  }
  if (torch <= 0 && chamber < PYRAMID_CHAMBERS.length) {
    chamber = Math.max(0, chamber - 1);
    torch = 45;
    marks = 0;
    events.push("🕯️ Torche éteinte · retour dans la salle précédente");
  }
  state.special.pyramidChamberByPlayer[playerId] = chamber;
  state.special.pyramidMarksByPlayer[playerId] = marks;
  state.special.pyramidTorchByPlayer[playerId] = torch;
  state.progress[playerId] = Math.round((chamber / PYRAMID_CHAMBERS.length) * 100);
  state.scores[playerId] += hits * 35 + bulls * 20;
  state.special.pyramidHistory = [...(state.special?.pyramidHistory || []), { playerId, chamber, torch }].slice(-40);
  if (chamber >= PYRAMID_CHAMBERS.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processDracoSpheres(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let spheres = Number(state.special?.dracoSpheresByPlayer?.[playerId] || 0);
  let energy = Number(state.special?.dracoEnergyByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const bulls = bullCount(darts);
  const energyThreshold = modeOptionNumber(state.config, "energyThreshold", 100, 60, 150);
  const bullEnergy = modeOptionNumber(state.config, "bullEnergy", 22, 5, 50);
  const tripleEnergy = modeOptionNumber(state.config, "tripleEnergy", 12, 4, 30);
  energy = clamp(energy + bulls * bullEnergy + matching.filter((d) => d?.bed === "T").length * tripleEnergy, 0, Math.max(150, energyThreshold));
  if (hits > 0 && spheres < 7) {
    spheres += 1;
    events.push(`🔮 Orbe ${spheres}/7 récupéré`);
  }
  if (energy >= energyThreshold && spheres < 7) {
    spheres += 1;
    energy = Math.max(0, energy - energyThreshold);
    events.push("🐉 Énergie maximale · un orbe bonus est invoqué");
  }
  state.special.dracoSpheresByPlayer[playerId] = spheres;
  state.special.dracoEnergyByPlayer[playerId] = energy;
  state.progress[playerId] = Math.round((spheres / 7) * 100);
  state.scores[playerId] += darts.reduce((s, d) => s + wave61DartScore(d), 0);
  state.special.dracoHistory = [...(state.special?.dracoHistory || []), { playerId, spheres, energy }].slice(-40);
  if (spheres >= 7) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: hits, hits };
}

function processMythologie(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let trial = Number(state.special?.mythTrialByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.mythMarksByPlayer?.[playerId] || 0);
  let favor = Number(state.special?.mythFavorByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  marks += power;
  const favorThreshold = modeOptionNumber(state.config, "favorThreshold", 60, 30, 90);
  const bullFavor = modeOptionNumber(state.config, "bullFavor", 18, 5, 40);
  const trialNeed = modeOptionNumber(state.config, "trialNeed", missionThreshold(state.config.difficulty, 2, 3, 4), 2, 6);
  favor = clamp(favor + bulls * bullFavor + hits * 4, 0, 100);
  if (favor >= favorThreshold && marks < trialNeed) {
    marks += 1;
    favor = Math.max(0, favor - Math.max(20, Math.round(favorThreshold * 0.67)));
    events.push("✨ Faveur divine · +1 marque");
  }
  if (marks >= trialNeed) {
    trial += 1;
    marks = 0;
    events.push(`🏛️ Épreuve de ${MYTH_GODS[Math.min(trial - 1, MYTH_GODS.length - 1)]} accomplie`);
  }
  state.special.mythTrialByPlayer[playerId] = trial;
  state.special.mythMarksByPlayer[playerId] = marks;
  state.special.mythFavorByPlayer[playerId] = favor;
  state.progress[playerId] = Math.round((trial / MYTH_GODS.length) * 100);
  state.scores[playerId] += hits * 45 + bulls * 25;
  state.special.mythHistory = [...(state.special?.mythHistory || []), { playerId, trial, favor }].slice(-40);
  if (trial >= MYTH_GODS.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processJardinier(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let growth = Number(state.special?.gardenGrowthByPlayer?.[playerId] || 0);
  let harvest = Number(state.special?.gardenHarvestByPlayer?.[playerId] || 0);
  let water = Number(state.special?.gardenWaterByPlayer?.[playerId] ?? modeOptionNumber(state.config, "waterStart", 60, 20, 100));
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const power = matching.reduce((s, d) => s + bedPower(d), 0);
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  growth += power * 20;
  const waterDrain = modeOptionNumber(state.config, "waterDrain", 8, 0, 25);
  water = clamp(water + bulls * 20 - wrong * waterDrain - 3, 0, 100);
  if (water <= 0) {
    growth = Math.floor(growth / 2);
    water = 30;
    events.push("☀️ Sécheresse · croissance divisée");
  }
  const harvestGoal = modeOptionNumber(state.config, "harvestGoal", 5, 1, 10);
  while (growth >= 100 && harvest < harvestGoal) {
    growth -= 100;
    harvest += 1;
    events.push(`🥕 Récolte ${harvest}/${harvestGoal}`);
  }
  state.special.gardenGrowthByPlayer[playerId] = growth;
  state.special.gardenHarvestByPlayer[playerId] = harvest;
  state.special.gardenWaterByPlayer[playerId] = water;
  state.progress[playerId] = Math.min(100, Math.round((harvest / harvestGoal) * 100));
  state.scores[playerId] += hits * 30 + bulls * 15;
  state.special.gardenHistory = [...(state.special?.gardenHistory || []), { playerId, growth, harvest, water }].slice(-40);
  if (harvest >= harvestGoal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processMicroscopia(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let samples = Number(state.special?.microSamplesByPlayer?.[playerId] || 0);
  let quality = Number(state.special?.microQualityByPlayer?.[playerId] || 0);
  let contamination = Number(state.special?.microContaminationByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  if (hits > 0 && samples < MICRO_SAMPLES.length) {
    samples += 1;
    quality += Math.round(matching.reduce((s, d) => s + bedPower(d, 10, 18, 26, 15, 25), 0) * (modeOptionNumber(state.config, "qualityPowerPct", 100, 50, 180) / 100));
    events.push(`🧬 Échantillon ${samples}/${MICRO_SAMPLES.length} isolé`);
  }
  contamination = clamp(contamination + wrong * modeOptionNumber(state.config, "contaminationGain", 11, 0, 30) - bulls * modeOptionNumber(state.config, "bullDecontam", 22, 0, 60), 0, 100);
  if (contamination >= 100 && samples > 0) {
    samples -= 1;
    contamination = 50;
    events.push("☣️ Contamination critique · un échantillon est perdu");
  }
  state.special.microSamplesByPlayer[playerId] = samples;
  state.special.microQualityByPlayer[playerId] = quality;
  state.special.microContaminationByPlayer[playerId] = contamination;
  state.progress[playerId] = Math.round((samples / MICRO_SAMPLES.length) * 100);
  state.scores[playerId] = quality;
  state.special.microHistory = [...(state.special?.microHistory || []), { playerId, samples, quality, contamination }].slice(-40);
  if (samples >= MICRO_SAMPLES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: hits, hits };
}

function processDisjoncte(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let step = Number(state.special?.circuitStepByPlayer?.[playerId] || 0);
  let overload = Number(state.special?.circuitOverloadByPlayer?.[playerId] || 0);
  const matching = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty));
  const hits = matching.length;
  const bulls = bullCount(darts);
  const wrong = darts.filter((d) => d?.bed === "MISS").length + nonBullWrongCount(darts, target, state.config.difficulty);
  if (hits > 0 && step < CIRCUIT_NAMES.length) {
    step += 1;
    overload += Math.round(matching.reduce((s, d) => s + (d?.bed === "T" ? 18 : d?.bed === "D" ? 12 : 7), 0) * (modeOptionNumber(state.config, "hitOverloadPct", 100, 40, 180) / 100));
    events.push(`🔌 Circuit ${step}/${CIRCUIT_NAMES.length} alimenté`);
  }
  overload = clamp(overload + wrong * modeOptionNumber(state.config, "wrongOverload", 10, 0, 30) - bulls * modeOptionNumber(state.config, "bullCooling", 28, 0, 70), 0, 110);
  if (overload >= 100 && step < CIRCUIT_NAMES.length) {
    step = Math.max(0, step - 1);
    overload = 45;
    events.push("💥 DISJONCTION ! Un circuit retombe");
  }
  state.special.circuitStepByPlayer[playerId] = step;
  state.special.circuitOverloadByPlayer[playerId] = overload;
  state.progress[playerId] = Math.round((step / CIRCUIT_NAMES.length) * 100);
  state.scores[playerId] += hits * 40 + bulls * 20;
  state.special.circuitHistory = [...(state.special?.circuitHistory || []), { playerId, step, overload }].slice(-40);
  if (step >= CIRCUIT_NAMES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: hits, hits };
}

function processPetitBac(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let step = Number(state.special?.bacStepByPlayer?.[playerId] || 0);
  let validated = Number(state.special?.bacValidatedByPlayer?.[playerId] || 0);
  const direct = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length;
  const bulls = bullCount(darts);
  const hits = direct + bulls;
  const directAdvance = modeOptionNumber(state.config, "directAdvance", 1, 1, 3);
  const bullAdvance = modeOptionNumber(state.config, "bullAdvance", 1, 1, 4);
  const advance = Math.max(direct > 0 ? directAdvance : 0, bulls > 0 ? bullAdvance : 0);
  if (advance > 0 && step < BAC_CATEGORIES.length) {
    const n = target?.kind === "number" ? target.value : 1;
    const letter = BAC_LETTERS[(n - 1) % BAC_LETTERS.length];
    const before = step;
    step = Math.min(BAC_CATEGORIES.length, step + advance);
    validated += step - before;
    events.push(`✅ ${BAC_CATEGORIES[before]} en ${letter} validé · +${step - before} catégorie(s)`);
  } else {
    events.push("⏱️ Aucune réponse validée sur cette catégorie");
  }
  state.special.bacStepByPlayer[playerId] = step;
  state.special.bacValidatedByPlayer[playerId] = validated;
  state.progress[playerId] = Math.round((step / BAC_CATEGORIES.length) * 100);
  state.scores[playerId] += darts.reduce((s, d) => s + wave61DartScore(d), 0) + advance * modeOptionNumber(state.config, "validationBonus", 25, 0, 100);
  state.special.bacHistory = [...(state.special?.bacHistory || []), { playerId, step, validated }].slice(-40);
  if (step >= BAC_CATEGORIES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: hits, hits };
}

function processFinalBuzzer(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const challenge = finalBuzzerChallenge(state);
  const cutoff = wave61FinalBuzzerCutoff(state);
  const liveDarts = darts.slice(0, cutoff);
  const hits = liveDarts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length;
  const power = liveDarts.reduce((sum, d) => sum + (dartMatchesTarget(d, target, state.config.difficulty) ? bedPower(d, 10, 20, 30, 20, 35) : 0), 0);
  const lastHit = !!liveDarts.length && dartMatchesTarget(liveDarts[liveDarts.length - 1], target, state.config.difficulty);
  const clutch = lastHit && hits === 1 ? modeOptionNumber(state.config, "clutchBonus", 25, 0, 100) : 0;
  const streak = hits > 0 ? Number(state.special?.finalBuzzerStreakByPlayer?.[playerId] || 0) + 1 : 0;
  const streakBonus = hits > 0 ? Math.min(modeOptionNumber(state.config, "streakCap", 25, 0, 100), streak * 3) : 0;
  const delta = power + clutch + streakBonus;
  state.special.finalBuzzerStreakByPlayer[playerId] = streak;
  if (clutch) state.special.finalBuzzerClutchByPlayer[playerId] = Number(state.special?.finalBuzzerClutchByPlayer?.[playerId] || 0) + 1;
  state.progress[playerId] = Number(state.progress[playerId] || 0) + delta;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  events.push(`⏱️ Buzzer après dart ${cutoff} · ${hits} réussite(s) · +${delta}`);
  if (clutch) events.push("🚨 CLUTCH sur la dernière fléchette autorisée");
  state.special.finalBuzzerHistory = [...(state.special.finalBuzzerHistory || []), { playerId, challenge: challenge.name, cutoff, hits, delta, round: state.roundIndex + 1 }].slice(-40);
  if (state.config.goal > 0 && state.progress[playerId] >= state.config.goal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta, hits };
}

function evaluateJackpotSpin(darts: GameDart[], pot: number) {
  const raw = darts.slice(0, 3).map(jackpotSymbol);
  while (raw.length < 3) raw.push("BLANK");
  const nonWild = raw.filter((s) => s !== "WILD" && s !== "BLANK");
  const fill = nonWild[0] || (raw.includes("WILD") ? "SEVEN" : "BLANK");
  const symbols = raw.map((s) => s === "WILD" ? fill : s);
  const counts = symbols.reduce((acc: Record<string, number>, symbol: string) => { acc[symbol] = Number(acc[symbol] || 0) + 1; return acc; }, {});
  const triple = Object.entries(counts).find(([symbol, count]) => symbol !== "BLANK" && Number(count) >= 3)?.[0] || null;
  const pair = Object.entries(counts).find(([symbol, count]) => symbol !== "BLANK" && Number(count) >= 2)?.[0] || null;
  let payout = 0, label = "Rien";
  let jackpot = false;
  if (triple) {
    const table: Record<string, number> = { LEMON: 80, CHERRY: 100, BELL: 150, BAR: 200, DIAMOND: 300, SEVEN: 777 };
    payout = Number(table[triple] || 60);
    label = `3 × ${triple}`;
    if (triple === "SEVEN") { payout += Math.max(0, Number(pot || 0)); jackpot = true; label = "JACKPOT 777"; }
  } else if (pair) {
    payout = pair === "SEVEN" ? 100 : pair === "DIAMOND" ? 75 : 40;
    label = `PAIRE ${pair}`;
  } else if (raw.includes("WILD")) {
    payout = 25;
    label = "WILD BONUS";
  } else {
    payout = 10;
    label = "MISE DE CONSOLATION";
  }
  return { raw, symbols, payout, label, jackpot };
}

function processJackpot(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const basePot = modeOptionNumber(state.config, "basePot", 250, 50, 2000);
  const pot = Number(state.special?.jackpotPot || basePot);
  const spin = evaluateJackpotSpin(darts, pot);
  const payout = Math.max(0, Math.round(spin.payout * (modeOptionNumber(state.config, "payoutMultiplierPct", 100, 25, 250) / 100)));
  state.special.jackpotLastSpinByPlayer[playerId] = spin.symbols;
  state.special.jackpotWinsByPlayer[playerId] = Number(state.special?.jackpotWinsByPlayer?.[playerId] || 0) + payout;
  if (spin.jackpot) state.special.jackpotJackpotsByPlayer[playerId] = Number(state.special?.jackpotJackpotsByPlayer?.[playerId] || 0) + 1;
  const potGrowth = modeOptionNumber(state.config, "potGrowth", 10, 0, 100);
  state.special.jackpotPot = spin.jackpot ? basePot : Math.min(10000, pot + potGrowth + bullCount(darts) * 15);
  state.scores[playerId] = Number(state.scores[playerId] || 0) + payout;
  state.progress[playerId] = Number(state.scores[playerId] || 0);
  events.push(`🎰 ${spin.symbols.join(" · ")} · ${spin.label} · +${payout}`);
  if (spin.jackpot) events.push(`💰 JACKPOT décroché : ${payout}`);
  state.special.jackpotHistory = [...(state.special.jackpotHistory || []), { playerId, ...spin, payout, potBefore: pot, potAfter: state.special.jackpotPot }].slice(-40);
  return { delta: payout, hits: payout >= 40 ? 1 : 0 };
}

function mafiaAliveByRole(state: Wave61State, role: MafiaRole): Player[] {
  return state.players.filter((p) => !state.eliminated[p.id] && state.special?.mafiaRoleByPlayer?.[p.id] === role);
}

function checkMafiaVictory(state: Wave61State): boolean {
  const mafia = mafiaAliveByRole(state, "MAFIA");
  const town = state.players.filter((p) => !state.eliminated[p.id] && state.special?.mafiaRoleByPlayer?.[p.id] !== "MAFIA");
  if (!mafia.length) {
    state.special.mafiaWinningFaction = "CITIZENS";
    const winner = [...town].sort((a,b) => Number(state.scores[b.id] || 0) - Number(state.scores[a.id] || 0))[0] || state.players[0];
    if (winner) finishWith(state, winner.id);
    return true;
  }
  const eliminatedCount = state.players.filter((p) => state.eliminated[p.id]).length;
  if (mafia.length >= town.length && eliminatedCount > 0) {
    state.special.mafiaWinningFaction = "MAFIA";
    const winner = [...mafia].sort((a,b) => Number(state.scores[b.id] || 0) - Number(state.scores[a.id] || 0))[0] || mafia[0];
    if (winner) finishWith(state, winner.id);
    return true;
  }
  return false;
}

function mafiaVoteTarget(state: Wave61State, d: GameDart, voterId: string): Player | null {
  const alive = state.players.filter((p) => !state.eliminated[p.id] && p.id !== voterId);
  if (!alive.length || !d || d.bed === "MISS") return null;
  const n = d.bed === "IB" || d.bed === "OB" ? 20 : Number(d.number || 1);
  return alive[((n - 1) % alive.length + alive.length) % alive.length] || alive[0] || null;
}

function processMafia(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const role: MafiaRole = state.special?.mafiaRoleByPlayer?.[playerId] || "CITIZEN";
  const phase = mafiaPhase(state);
  let delta = 0, hits = 0;
  if (phase === "NIGHT") {
    hits = darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length;
    const bulls = bullCount(darts);
    if (role === "MAFIA") {
      const victim = nextEnemy(state, playerId, (p) => state.special?.mafiaRoleByPlayer?.[p.id] !== "MAFIA");
      if (victim && (hits || bulls)) {
        if (Number(state.special?.mafiaShieldByPlayer?.[victim.id] || 0) > 0) {
          state.special.mafiaShieldByPlayer[victim.id] = Math.max(0, Number(state.special?.mafiaShieldByPlayer?.[victim.id] || 0) - 1);
          events.push("🛡️ Une protection nocturne bloque l'attaque");
        } else {
          const damagePerHit = modeOptionNumber(state.config, "nightDamage", 45, 20, 90);
          const damage = hits * damagePerHit + bulls * Math.round(damagePerHit * 0.55);
          state.special.mafiaDamageByPlayer[victim.id] = Number(state.special?.mafiaDamageByPlayer?.[victim.id] || 0) + damage;
          state.health[victim.id] = Math.max(0, 100 - Number(state.special.mafiaDamageByPlayer[victim.id] || 0));
          events.push(`🌙 Attaque secrète · ${damage} dégâts`);
          if (state.special.mafiaDamageByPlayer[victim.id] >= 100) { state.eliminated[victim.id] = true; state.health[victim.id] = 0; events.push("☠️ Un citoyen disparaît dans la nuit"); }
        }
      }
    } else if (role === "DETECTIVE") {
      if (hits || bulls) {
        const known = new Set((state.special?.mafiaIntel || []).map((x: any) => String(x.playerId)));
        const candidate = state.players.find((p) => !state.eliminated[p.id] && p.id !== playerId && !known.has(p.id));
        if (candidate) {
          const alignment = state.special?.mafiaRoleByPlayer?.[candidate.id] === "MAFIA" ? "MAFIA" : "CLEAN";
          state.special.mafiaIntel = [...(state.special.mafiaIntel || []), { playerId: candidate.id, alignment }];
          events.push(`🔎 Enquête réussie · ${alignment === "MAFIA" ? "suspect confirmé" : "citoyen innocent"}`);
        }
      }
    } else if (role === "MEDIC") {
      if (hits || bulls) {
        const candidate = state.players.find((p) => !state.eliminated[p.id] && state.special?.mafiaRoleByPlayer?.[p.id] !== "MAFIA") || state.players.find((p) => !state.eliminated[p.id]);
        if (candidate) { state.special.mafiaShieldByPlayer[candidate.id] = modeOptionNumber(state.config, "medicShield", 1, 1, 3); events.push("🩺 Protection nocturne activée"); }
      }
    } else {
      delta = hits * 8 + bulls * 5;
      state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
      events.push(hits ? `🌙 Vigilance +${delta}` : "🌙 Nuit silencieuse");
    }
    state.scores[playerId] = Number(state.scores[playerId] || 0) + hits * 10;
  } else {
    for (const d of darts) {
      const suspect = mafiaVoteTarget(state, d, playerId);
      if (!suspect) continue;
      const weight = bedPower(d, 1, 2, 3, 2, 4) * modeOptionNumber(state.config, "dayVoteMultiplier", 1, 1, 3);
      state.special.mafiaVotesByPlayer[suspect.id] = Number(state.special?.mafiaVotesByPlayer?.[suspect.id] || 0) + weight;
      hits += 1;
      delta += weight * 5;
    }
    state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
    events.push(hits ? `☀️ ${hits} vote(s) dart · influence +${delta}` : "☀️ Aucun vote valable");
  }
  state.special.mafiaHistory = [...(state.special.mafiaHistory || []), { playerId, role, phase, hits, delta, round: state.roundIndex + 1 }].slice(-60);
  checkMafiaVictory(state);
  return { delta, hits };
}

function resolveMafiaDay(state: Wave61State) {
  if (state.phase !== "playing") return;
  const entries = state.players.filter((p) => !state.eliminated[p.id]).map((p) => ({ p, votes: Number(state.special?.mafiaVotesByPlayer?.[p.id] || 0) })).sort((a,b) => b.votes - a.votes || Number(state.scores[b.p.id] || 0) - Number(state.scores[a.p.id] || 0));
  const top = entries[0];
  if (top && top.votes > 0) {
    state.eliminated[top.p.id] = true;
    state.health[top.p.id] = 0;
    state.special.mafiaHistory = [...(state.special.mafiaHistory || []), { phase: "DAY_RESOLUTION", playerId: top.p.id, votes: top.votes, role: state.special?.mafiaRoleByPlayer?.[top.p.id] }].slice(-60);
  }
  state.special.mafiaVotesByPlayer = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  checkMafiaVictory(state);
}

function processAscentMode(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const matching = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const bulls = bullCount(darts);
  const hits = matching.length + bulls;
  const wrong = nonBullWrongCount(darts, target, state.config.difficulty) + darts.filter((d) => d?.bed === "MISS").length;
  const weather = ascentWeather(state);
  let fatigue = Number(state.special?.ascentFatigueByPlayer?.[playerId] || 0);
  let oxygen = Number(state.special?.ascentOxygenByPlayer?.[playerId] ?? (state.modeId === "mont_blanc" ? 100 : 90));
  let acclimation = Number(state.special?.ascentAcclimationByPlayer?.[playerId] || 0);

  if (state.modeId === "summit_14") {
    let peak = Number(state.special?.summit14PeakByPlayer?.[playerId] || 0);
    let marks = Number(state.special?.summit14MarksByPlayer?.[playerId] || 0);
    const threshold = modeOptionNumber(state.config, "peakThreshold", state.config.difficulty === "hard" ? 7 : state.config.difficulty === "easy" ? 4 : 5, 3, 8);
    const power = matching.reduce((sum, d) => sum + bedPower(d, 1, 2, 3), 0) + bulls * 2;
    const adjusted = Math.max(0, Math.round(power * ascentClimbFactor(state) * (1 - weather.penalty)));
    marks += adjusted;
    fatigue = clamp(fatigue + wrong * 9 + weather.fatigue - bulls * 12, 0, 100);
    oxygen = clamp(oxygen - 3 - wrong * 3 - (weather.penalty > .25 ? 4 : 0) + bulls * 12, 0, 100);
    acclimation = clamp(acclimation + matching.length * 4 + bulls * 6, 0, 100);
    if (fatigue >= 100 || oxygen <= 0) {
      marks = Math.max(0, marks - 2);
      fatigue = 58;
      oxygen = Math.max(35, oxygen);
      events.push("⛺ Repli au camp · récupération obligatoire");
    }
    if (marks >= threshold && peak < SUMMIT_14_PEAKS.length) {
      events.push(`🏔️ ${SUMMIT_14_PEAKS[peak]} VALIDÉ !`);
      peak += 1;
      marks = 0;
      fatigue = clamp(fatigue - 24, 0, 100);
      oxygen = clamp(oxygen + 18, 0, 100);
      state.scores[playerId] = Number(state.scores[playerId] || 0) + 800 + peak * 100;
    } else if (adjusted > 0) events.push(`🧗 Progression sommet +${adjusted}/${threshold}`);
    else events.push(`🌨️ ${weather.label} · aucune progression`);
    state.special.summit14PeakByPlayer[playerId] = peak;
    state.special.summit14MarksByPlayer[playerId] = marks;
    state.special.ascentFatigueByPlayer[playerId] = fatigue;
    state.special.ascentOxygenByPlayer[playerId] = oxygen;
    state.special.ascentAcclimationByPlayer[playerId] = acclimation;
    state.progress[playerId] = Math.min(100, Math.round((peak / SUMMIT_14_PEAKS.length) * 100));
    state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((sum, d) => sum + wave61DartScore(d), 0);
    state.special.ascentHistory = [...(state.special?.ascentHistory || []), { playerId, modeId: state.modeId, peak, marks, fatigue, oxygen, weather: weather.label }].slice(-60);
    if (peak >= SUMMIT_14_PEAKS.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
    return { delta: adjusted, hits };
  }

  let altitude = Number(state.special?.ascentAltitudeByPlayer?.[playerId] || 0);
  const summit = ascentSummitAltitude(state.modeId);
  const beforeStage = ascentStageForAltitude(state.modeId, altitude);
  let climb = matching.reduce((sum, d) => sum + bedPower(d, 220, 340, 520), 0) + bulls * (state.modeId === "everest" ? 90 : 140);
  climb = Math.max(0, Math.round(climb * ascentClimbFactor(state) * (1 - weather.penalty) * Math.max(.35, 1 - fatigue / 150)));
  fatigue = clamp(fatigue + wrong * (state.modeId === "everest" ? 12 : 9) + weather.fatigue + matching.filter((d) => d?.bed === "T").length * 4 - bulls * 16, 0, 100);
  acclimation = clamp(acclimation + matching.length * 4 + bulls * 8, 0, 100);

  if (state.modeId === "everest") {
    const altitudeDrain = altitude >= 7900 ? 10 : altitude >= 7000 ? 7 : altitude >= 6000 ? 5 : 2;
    oxygen = clamp(oxygen - altitudeDrain - wrong * 3 - (weather.penalty > .25 ? 5 : 0) + bulls * 14, 0, 100);
    const nextStage = Math.min(beforeStage + 1, EVEREST_STAGES.length - 1);
    const requiredAcclimation = Math.max(0, nextStage - 1) * 10;
    if (acclimation < requiredAcclimation && nextStage >= 3) {
      climb = Math.round(climb * .45);
      events.push(`🫁 Acclimatation ${Math.round(acclimation)}% / ${requiredAcclimation}% recommandée`);
    }
  } else {
    oxygen = clamp(oxygen - wrong * 2 - weather.fatigue / 3 + bulls * 10, 0, 100);
  }

  altitude = clamp(altitude + climb, 0, summit);
  if (fatigue >= 100 || oxygen <= 0) {
    const drop = state.modeId === "everest" ? 650 : 350;
    altitude = Math.max(0, altitude - drop);
    fatigue = 58;
    oxygen = Math.max(32, oxygen);
    events.push(`⛺ Repli de ${drop} m pour récupérer`);
  }
  const stage = ascentStageForAltitude(state.modeId, altitude);
  if (stage > beforeStage) events.push(`🏕️ ${ascentStages(state.modeId)[stage].name} atteint`);
  if (climb > 0) events.push(`🧗 +${climb} m · ${weather.label}`);
  else events.push(`🌨️ ${weather.label} · progression bloquée`);
  if (bulls) events.push(state.modeId === "everest" ? "🫁 Oxygène / acclimatation restaurés" : "☀️ Fenêtre météo exploitée");

  state.special.ascentAltitudeByPlayer[playerId] = altitude;
  state.special.ascentStageByPlayer[playerId] = stage;
  state.special.ascentFatigueByPlayer[playerId] = fatigue;
  state.special.ascentOxygenByPlayer[playerId] = oxygen;
  state.special.ascentAcclimationByPlayer[playerId] = acclimation;
  state.progress[playerId] = Math.min(100, Math.round((altitude / summit) * 100));
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((sum, d) => sum + wave61DartScore(d), 0) + Math.round(climb / 10);
  state.special.ascentHistory = [...(state.special?.ascentHistory || []), { playerId, modeId: state.modeId, altitude, stage, fatigue, oxygen, acclimation, weather: weather.label }].slice(-60);
  if (altitude >= summit) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: climb, hits };
}

function conquestActor(state: Wave61State, playerId: string): string {
  return state.config.participantMode === "teams" ? String(state.config.teamByPlayer?.[playerId] || "A") : playerId;
}

function conquestControlledCount(state: Wave61State, actor: string): number {
  return (state.special?.conquestOwnerByNode || []).filter((owner: any) => String(owner || "") === actor).length;
}

function conquestVictoryGoal(state: Wave61State): number {
  const profile = CONQUEST_PROFILES[state.modeId];
  return profile ? modeOptionNumber(state.config, "territoryGoal", profile.win, 1, profile.nodes.length) : 0;
}

function conquestCaptureThreshold(state: Wave61State): number {
  const profile = CONQUEST_PROFILES[state.modeId];
  return profile ? modeOptionNumber(state.config, "captureThreshold", profile.threshold, 3, 9) : 0;
}

function conquestResourceFactor(state: Wave61State): number {
  return modeOptionNumber(state.config, "resourceBoost", 100, 50, 180) / 100;
}

function conquestBaseFort(state: Wave61State): number {
  const profile = CONQUEST_PROFILES[state.modeId];
  return profile ? modeOptionNumber(state.config, "baseFort", profile.fort, 0, 4) : 0;
}

function conquestFocusIndex(state: Wave61State, playerId: string): number {
  const profile = CONQUEST_PROFILES[state.modeId];
  if (!profile) return 0;
  const actor = conquestActor(state, playerId);
  const owners = state.special?.conquestOwnerByNode || [];
  const start = Number(state.special?.conquestFocusByPlayer?.[playerId] || 0) % profile.nodes.length;
  for (let step = 0; step < profile.nodes.length; step++) {
    const idx = (start + step) % profile.nodes.length;
    if (String(owners[idx] || "") !== actor) return idx;
  }
  return start;
}

function syncConquestProgress(state: Wave61State) {
  const profile = CONQUEST_PROFILES[state.modeId];
  if (!profile) return;
  for (const p of state.players) {
    const actor = conquestActor(state, p.id);
    const controlled = conquestControlledCount(state, actor);
    state.progress[p.id] = Math.min(100, Math.round((controlled / Math.max(1, conquestVictoryGoal(state))) * 100));
  }
}

function processConquestMode(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const profile = CONQUEST_PROFILES[state.modeId];
  if (!profile) return { delta: 0, hits: 0 };
  const actor = conquestActor(state, playerId);
  let focus = conquestFocusIndex(state, playerId);
  state.special.conquestFocusByPlayer[playerId] = focus;
  const matching = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const bulls = bullCount(darts);
  const triples = matching.filter((d) => d?.bed === "T").length;
  const hits = matching.length + bulls;
  let power = matching.reduce((sum, d) => sum + bedPower(d, 1, 2, 3), 0) + bulls;
  const threshold = conquestCaptureThreshold(state);
  const victoryGoal = conquestVictoryGoal(state);
  const fortBase = conquestBaseFort(state);
  const resourceFactor = conquestResourceFactor(state);
  let resource = Number(state.special?.conquestResourceByPlayer?.[playerId] || 0);
  resource += Math.round((matching.reduce((sum, d) => sum + bedPower(d, 6, 10, 15), 0) + bulls * 20) * resourceFactor);

  if (state.modeId === "black_flag") {
    const treasure = bulls * 40 + triples * 20;
    state.scores[playerId] = Number(state.scores[playerId] || 0) + treasure;
    if (treasure) events.push(`🏴‍☠️ Butin +${treasure}`);
  } else if (state.modeId === "menhir_mayhem") {
    resource += triples * 12;
  } else if (state.modeId === "attila" && hits >= 3) {
    power += 2; resource += 10; events.push("🐎 Charge parfaite +2 puissance");
  } else if (state.modeId === "poseidon" && bulls > 0) {
    power += bulls * 2; events.push("🔱 Marée renforcée");
  } else if (state.modeId === "galaxies") {
    resource += triples * 15;
  }

  if (resource >= 100) {
    resource -= 100;
    power += state.modeId === "galaxies" ? 5 : state.modeId === "poseidon" ? 4 : 3;
    events.push(`${profile.icon} ${profile.ability} activé`);
    if (state.modeId === "sabaudia_dauphine") {
      const owned = (state.special?.conquestOwnerByNode || []).map((owner: any, i: number) => String(owner || "") === actor ? i : -1).filter((i: number) => i >= 0);
      for (const idx of owned) state.special.conquestFortByNode[idx] = Math.min(6, Number(state.special.conquestFortByNode[idx] || 0) + 1);
    }
  }
  state.special.conquestResourceByPlayer[playerId] = clamp(resource, 0, 120);

  let owner = state.special.conquestOwnerByNode[focus];
  let fort = Number(state.special.conquestFortByNode[focus] || 0);
  let pressure = state.special.conquestPressureByNode[focus] || { actor: null, value: 0 };

  if (owner && String(owner) !== actor && fort > 0 && power > 0) {
    const broken = Math.min(fort, power);
    fort -= broken;
    power -= broken;
    state.special.conquestFortByNode[focus] = fort;
    events.push(`🧱 Fortification adverse -${broken}`);
  }

  if (String(owner || "") === actor) {
    if (power > 0) {
      state.special.conquestFortByNode[focus] = Math.min(8, fort + power);
      events.push(`🏰 ${profile.nodes[focus]} renforcée`);
    }
  } else if (power > 0) {
    if (pressure.actor && pressure.actor !== actor) {
      const cancel = Math.min(Number(pressure.value || 0), power);
      pressure.value = Math.max(0, Number(pressure.value || 0) - cancel);
      power -= cancel;
      if (pressure.value <= 0) pressure = { actor: null, value: 0 };
      if (cancel) events.push(`⚔️ Contestation -${cancel}`);
    }
    if (power > 0) {
      if (!pressure.actor || pressure.actor === actor) pressure = { actor, value: Number(pressure.value || 0) + power };
      else pressure = { actor, value: power };
    }
    if (Number(pressure.value || 0) >= threshold) {
      owner = actor;
      state.special.conquestOwnerByNode[focus] = actor;
      state.special.conquestFortByNode[focus] = fortBase + Math.min(2, bulls);
      state.special.conquestPressureByNode[focus] = { actor: null, value: 0 };
      state.special.conquestCapturesByPlayer[playerId] = Number(state.special?.conquestCapturesByPlayer?.[playerId] || 0) + 1;
      state.scores[playerId] = Number(state.scores[playerId] || 0) + 100 + threshold * 10;
      events.push(`${profile.icon} ${profile.nodes[focus]} conquise !`);
      focus = conquestFocusIndex(state, playerId);
      state.special.conquestFocusByPlayer[playerId] = focus;
    } else {
      state.special.conquestPressureByNode[focus] = pressure;
      events.push(`${profile.icon} Pression ${Math.round(Number(pressure.value || 0))}/${threshold}`);
    }
  } else events.push(`${profile.icon} Assaut repoussé`);

  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((sum, d) => sum + wave61DartScore(d), 0);
  syncConquestProgress(state);
  const controlled = conquestControlledCount(state, actor);
  state.special.conquestHistory = [...(state.special?.conquestHistory || []), { playerId, actor, focus, controlled, resource: state.special.conquestResourceByPlayer[playerId] }].slice(-50);
  if (controlled >= victoryGoal) finishWith(state, playerId, state.config.participantMode === "teams" ? actor : null);
  return { delta: hits, hits };
}

function processChevalTroie(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let phase = Number(state.special?.trojanPhaseByPlayer?.[playerId] || 0);
  let marks = Number(state.special?.trojanMarksByPlayer?.[playerId] || 0);
  let alert = Number(state.special?.trojanAlertByPlayer?.[playerId] || 0);
  let wood = Number(state.special?.trojanWoodByPlayer?.[playerId] || 0);
  const matching = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const hits = matching.length;
  const power = matching.reduce((sum, d) => sum + bedPower(d, 1, 2, 3), 0);
  const bulls = bullCount(darts);
  const wrong = nonBullWrongCount(darts, target, state.config.difficulty) + darts.filter((d) => d?.bed === "MISS").length;
  marks += power;
  if (phase <= 1) wood += power * 12;
  const alertGain = modeOptionNumber(state.config, "alertGain", state.config.difficulty === "hard" ? 14 : 9, 3, 20);
  const bullStealth = modeOptionNumber(state.config, "bullStealth", 18, 5, 35);
  alert = clamp(alert + wrong * alertGain - bulls * bullStealth, 0, 100);
  const baseNeed = [5, 5, 4, 4, 5][Math.min(phase, 4)] || 5;
  const phaseNeedBonus = modeOptionNumber(state.config, "phaseNeedBonus", 0, -1, 2);
  const need = baseNeed + (state.config.difficulty === "hard" ? 1 : state.config.difficulty === "easy" ? -1 : 0) + phaseNeedBonus;
  if (marks >= Math.max(3, need)) {
    events.push(`🐴 ${TROJAN_PHASES[Math.min(phase, TROJAN_PHASES.length - 1)]} réussi`);
    phase += 1; marks = 0;
  }
  if (alert >= 100 && phase >= 2 && phase < TROJAN_PHASES.length) {
    phase = Math.max(1, phase - 1); marks = 0; alert = 55;
    events.push("🚨 Infiltration découverte · recul d'une phase");
  }
  if (bulls) events.push(`🤫 Discrétion -${bulls * bullStealth}% alerte`);
  state.special.trojanPhaseByPlayer[playerId] = phase;
  state.special.trojanMarksByPlayer[playerId] = marks;
  state.special.trojanAlertByPlayer[playerId] = alert;
  state.special.trojanWoodByPlayer[playerId] = wood;
  state.progress[playerId] = Math.min(100, Math.round((phase / TROJAN_PHASES.length) * 100));
  state.scores[playerId] = Number(state.scores[playerId] || 0) + darts.reduce((sum, d) => sum + wave61DartScore(d), 0) + power * 20;
  state.special.trojanHistory = [...(state.special?.trojanHistory || []), { playerId, phase, alert, wood, marks }].slice(-40);
  if (phase >= TROJAN_PHASES.length) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  return { delta: power, hits };
}

function processHotPotato(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const hits = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length : 0;
  let fuse = Number(state.special?.hotPotatoFuse || hotPotatoFuseReset(state.config));
  fuse -= 1;
  if (hits > 0) {
    const passBonus = modeOptionNumber(state.config, "passFuseBonus", 1, 0, 4);
    fuse = Math.min(hotPotatoFuseReset(state.config) + passBonus, fuse + passBonus);
    state.special.hotPotatoPassesByPlayer[playerId] = Number(state.special?.hotPotatoPassesByPlayer?.[playerId] || 0) + 1;
    state.scores[playerId] += hits * 30;
    events.push(`🥔 Passe réussie · mèche ${Math.max(0, fuse)}`);
  } else {
    fuse -= 1;
    events.push(`🔥 La patate chauffe · mèche ${Math.max(0, fuse)}`);
  }
  if (fuse <= 0) {
    state.special.hotPotatoExplosionsByPlayer[playerId] = Number(state.special?.hotPotatoExplosionsByPlayer?.[playerId] || 0) + 1;
    applySurvivalDamage(state, playerId, modeOptionNumber(state.config, "explosionDamage", 120, 40, 200), events);
    fuse = hotPotatoFuseReset(state.config);
    events.push(`💥 PATATE EXPLOSÉE · nouvelle mèche ${fuse}`);
  }
  state.special.hotPotatoFuse = fuse;
  state.progress[playerId] = Number(state.special?.hotPotatoPassesByPlayer?.[playerId] || 0);
  state.special.hotPotatoHistory = [...(state.special?.hotPotatoHistory || []), { playerId, hits, fuse, lives: state.lives[playerId] }].slice(-40);
  return { delta: hits, hits };
}

function processZombieSiege(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const role = String(state.special?.zombieRoleByPlayer?.[playerId] || "SURVIVOR");
  const matches = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const hits = matches.length;
  let delta = 0;
  if (role === "ZOMBIE") {
    const victim = nextEnemy(state, playerId, (p) => state.special?.zombieRoleByPlayer?.[p.id] === "SURVIVOR") || state.players.find((p) => state.special?.zombieRoleByPlayer?.[p.id] === "SURVIVOR") || null;
    if (victim && hits) {
      const infectBase = matches.reduce((sum, d) => sum + bedPower(d, 18, 28, 38, 30, 45), 0);
      const infect = Math.round(infectBase * modeOptionNumber(state.config, "infectionPowerPct", 100, 50, 180) / 100);
      const barricade = Number(state.special?.zombieBarricadeByPlayer?.[victim.id] || 0);
      const effective = Math.max(5, infect - Math.floor(barricade / 4));
      state.special.zombieInfectionByPlayer[victim.id] = clamp(Number(state.special?.zombieInfectionByPlayer?.[victim.id] || 0) + effective, 0, 100);
      state.statsByPlayer[playerId].damage += effective;
      delta = effective;
      events.push(`🧟 ${victim.name} contaminé +${effective}%`);
      if (state.special.zombieInfectionByPlayer[victim.id] >= 100) {
        state.special.zombieRoleByPlayer[victim.id] = "ZOMBIE";
        events.push(`☣️ ${victim.name} rejoint la horde`);
      }
    } else events.push("🧟 Aucune morsure");
    state.scores[playerId] += delta * 3;
  } else {
    let barricadeGain = 0;
    for (const d of darts) {
      if (d?.bed === "IB" || d?.bed === "OB") {
        const cureBase = d.bed === "IB" ? 30 : 18;
        const cure = Math.round(cureBase * modeOptionNumber(state.config, "curePowerPct", 100, 50, 180) / 100);
        state.special.zombieInfectionByPlayer[playerId] = Math.max(0, Number(state.special?.zombieInfectionByPlayer?.[playerId] || 0) - cure);
        barricadeGain += Math.round((d.bed === "IB" ? 14 : 8) * modeOptionNumber(state.config, "barricadePowerPct", 100, 50, 180) / 100);
      } else if (target && dartMatchesTarget(d, target, state.config.difficulty)) barricadeGain += Math.round(bedPower(d, 8, 14, 20) * modeOptionNumber(state.config, "barricadePowerPct", 100, 50, 180) / 100);
    }
    state.special.zombieBarricadeByPlayer[playerId] = clamp(Number(state.special?.zombieBarricadeByPlayer?.[playerId] || 0) + barricadeGain, 0, 100);
    state.progress[playerId] = state.special.zombieBarricadeByPlayer[playerId];
    state.scores[playerId] += barricadeGain * 2;
    delta = barricadeGain;
    if (barricadeGain) events.push(`🛡️ Barricade +${barricadeGain}`); else events.push("⚠️ Défense ratée");
  }
  const survivors = state.players.filter((p) => state.special?.zombieRoleByPlayer?.[p.id] === "SURVIVOR");
  if (!survivors.length) {
    const zombie = state.players.find((p) => state.special?.zombieRoleByPlayer?.[p.id] === "ZOMBIE") || state.players[0];
    if (zombie) finishWith(state, zombie.id, state.config.participantMode === "teams" ? "B" : null);
  }
  state.special.zombieHistory = [...(state.special?.zombieHistory || []), { playerId, role, hits, delta }].slice(-40);
  return { delta, hits };
}

function processLeLoup(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const isWolf = state.special?.loupId === playerId;
  const hits = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length : 0;
  let delta = 0;
  if (isWolf && hits > 0) {
    const victim = nextEnemy(state, playerId);
    if (victim) {
      if (Number(state.special?.loupProtectedByPlayer?.[victim.id] || 0) > 0) {
        state.special.loupProtectedByPlayer[victim.id] = Math.max(0, Number(state.special?.loupProtectedByPlayer?.[victim.id] || 0) - 1);
        events.push(`🛡️ ${victim.name} échappe au loup`);
      } else {
        state.special.loupCaughtByPlayer[victim.id] = Number(state.special?.loupCaughtByPlayer?.[victim.id] || 0) + 1;
        const lostLives = modeOptionNumber(state.config, "catchLives", 1, 1, 3);
        const remainingLives = Math.max(0, Number(state.lives[victim.id] || 0) - lostLives);
        state.lives[victim.id] = remainingLives;
        if (remainingLives <= 0) state.eliminated[victim.id] = true;
        state.scores[playerId] += 50 * hits;
        delta = hits;
        events.push(`🐺 ${victim.name} attrapé · -${lostLives} vie(s) · ${state.lives[victim.id]} restante(s)`);
        if (!state.eliminated[victim.id]) state.special.loupId = victim.id;
      }
    }
  } else if (!isWolf) {
    const bull = darts.some((d) => d?.bed === "OB" || d?.bed === "IB");
    if (bull) { const charges = modeOptionNumber(state.config, "bullProtectionCharges", 1, 1, 3); state.special.loupProtectedByPlayer[playerId] = clamp(Number(state.special?.loupProtectedByPlayer?.[playerId] || 0) + charges, 0, 6); events.push(`✨ Protection +${charges} charge(s)`); }
    delta = Math.round((hits * 6 + (bull ? 4 : 0)) * modeOptionNumber(state.config, "escapePowerPct", 100, 50, 180) / 100);
    state.progress[playerId] += delta;
    state.scores[playerId] += delta * 5;
    events.push(hits ? `🏃 Fuite +${delta}` : "🐾 Le loup se rapproche");
  } else events.push("🐺 Attaque ratée");
  state.special.loupHistory = [...(state.special?.loupHistory || []), { playerId, wolf: isWolf, hits, loupId: state.special.loupId }].slice(-40);
  return { delta, hits };
}

function processEperviers(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const role = String(state.special?.epervierRoleByPlayer?.[playerId] || "RUNNER");
  const matches = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const hits = matches.length;
  let delta = 0;
  if (role === "HAWK") {
    const victim = state.players.find((p) => p.id !== playerId && state.special?.epervierRoleByPlayer?.[p.id] === "RUNNER") || null;
    if (victim && hits > 0) {
      const catches = Number(state.special?.epervierCaughtByPlayer?.[victim.id] || 0) + hits;
      state.special.epervierCaughtByPlayer[victim.id] = catches;
      const threshold = modeOptionNumber(state.config, "catchThreshold", state.config.difficulty === "hard" ? 1 : state.config.difficulty === "easy" ? 3 : 2, 1, 5);
      events.push(`🦅 ${victim.name} touché ${hits}×`);
      if (catches >= threshold) {
        state.special.epervierRoleByPlayer[victim.id] = "HAWK";
        events.push(`🦅 ${victim.name} devient Épervier`);
      }
      state.scores[playerId] += hits * 45;
      delta = hits;
    }
  } else {
    const crossingGoal = modeOptionNumber(state.config, "crossingGoal", 100, 50, 200);
    delta = Math.round(matches.reduce((sum, d) => sum + bedPower(d, 6, 10, 15, 10, 18), 0) * modeOptionNumber(state.config, "runPowerPct", 100, 50, 180) / 100);
    state.special.epervierCrossingByPlayer[playerId] = Math.min(crossingGoal, Number(state.special?.epervierCrossingByPlayer?.[playerId] || 0) + delta);
    state.progress[playerId] = state.special.epervierCrossingByPlayer[playerId];
    state.scores[playerId] += delta * 4;
    if (state.progress[playerId] >= modeOptionNumber(state.config, "crossingGoal", 100, 50, 200)) finishWith(state, playerId);
    events.push(delta ? `🏃 Traversée ${state.progress[playerId]}/${modeOptionNumber(state.config, "crossingGoal", 100, 50, 200)}` : "⚠️ Traversée bloquée");
  }
  const runners = state.players.filter((p) => state.special?.epervierRoleByPlayer?.[p.id] === "RUNNER");
  if (!runners.length && state.phase === "playing") {
    const hawk = state.players[0];
    if (hawk) finishWith(state, hawk.id);
  }
  state.special.epervierHistory = [...(state.special?.epervierHistory || []), { playerId, role, hits, delta }].slice(-40);
  return { delta, hits };
}

function processBallonPrisonnier(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const prisoner = !!state.special?.dodgePrisonerByPlayer?.[playerId];
  let hits = 0, delta = 0;
  const team = state.config.teamByPlayer?.[playerId];
  const releaseCandidate = () => state.players.find((p) => !!state.special?.dodgePrisonerByPlayer?.[p.id] && (state.config.participantMode !== "teams" ? p.id === playerId : state.config.teamByPlayer?.[p.id] === team));
  for (const d of darts) {
    if (d?.bed === "OB" || d?.bed === "IB") {
      const released = releaseCandidate();
      if (released) {
        state.special.dodgePrisonerByPlayer[released.id] = false;
        state.health[released.id] = d.bed === "IB" ? 100 : modeOptionNumber(state.config, "releaseHealth", 70, 30, 100);
        events.push(`🔓 ${released.name} libéré`);
        hits += 1;
      } else if (!prisoner) {
        const shieldCap = modeOptionNumber(state.config, "shieldCap", 60, 20, 120);
        state.special.dodgeShieldByPlayer[playerId] = clamp(Number(state.special?.dodgeShieldByPlayer?.[playerId] || 0) + (d.bed === "IB" ? 35 : 20), 0, shieldCap);
        events.push("🛡️ Esquive renforcée");
      }
      continue;
    }
    if (prisoner) continue;
    if (target && dartMatchesTarget(d, target, state.config.difficulty)) {
      const victim = nextEnemy(state, playerId, (p) => !state.special?.dodgePrisonerByPlayer?.[p.id]);
      if (!victim) continue;
      let damage = Math.round(bedPower(d, 18, 28, 40) * modeOptionNumber(state.config, "damagePowerPct", 100, 50, 180) / 100);
      const shield = Number(state.special?.dodgeShieldByPlayer?.[victim.id] || 0);
      const absorbed = Math.min(shield, damage);
      state.special.dodgeShieldByPlayer[victim.id] = Math.max(0, shield - absorbed);
      damage -= absorbed;
      state.health[victim.id] = Math.max(0, Number(state.health[victim.id] || 100) - damage);
      state.statsByPlayer[playerId].damage += damage;
      state.statsByPlayer[victim.id].damageTaken += damage;
      state.special.dodgeHitsByPlayer[playerId] = Number(state.special?.dodgeHitsByPlayer?.[playerId] || 0) + 1;
      hits += 1; delta += damage;
      events.push(`🏐 ${victim.name} touché · -${damage} PV`);
      if (state.health[victim.id] <= 0) {
        state.special.dodgePrisonerByPlayer[victim.id] = true;
        state.health[victim.id] = 50;
        events.push(`🔒 ${victim.name} prisonnier`);
      }
    }
  }
  state.scores[playerId] += delta + hits * 10;
  const free = state.players.filter((p) => !state.special?.dodgePrisonerByPlayer?.[p.id]);
  if (state.config.participantMode === "teams") {
    const freeTeams = Array.from(new Set(free.map((p) => state.config.teamByPlayer?.[p.id] || "A")));
    if (freeTeams.length === 1 && state.players.length > 1) finishWith(state, free[0]?.id || playerId, freeTeams[0] || null);
  } else if (free.length === 1 && state.players.length > 1) finishWith(state, free[0].id);
  state.special.dodgeHistory = [...(state.special?.dodgeHistory || []), { playerId, prisoner, hits, delta }].slice(-40);
  return { delta, hits };
}

function processIceberg(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let hull = Number(state.special?.icebergHullByPlayer?.[playerId] || 100);
  let flood = Number(state.special?.icebergFloodByPlayer?.[playerId] || 0);
  let compartments = Number(state.special?.icebergCompartmentsByPlayer?.[playerId] || 0);
  let hits = 0, delta = 0;
  for (const d of darts) {
    if (d?.bed === "OB" || d?.bed === "IB") {
      const pump = Math.round((d.bed === "IB" ? 22 : 12) * modeOptionNumber(state.config, "pumpPowerPct", 100, 50, 180) / 100);
      flood = Math.max(0, flood - pump); hull = Math.min(100, hull + Math.round(pump / 2)); hits += 1;
      events.push(`🚰 Pompes -${pump}% eau`);
    } else if (target && dartMatchesTarget(d, target, state.config.difficulty)) {
      const repair = bedPower(d, 8, 14, 20);
      hull = Math.min(100, hull + Math.floor(repair / 2)); flood = Math.max(0, flood - repair); delta += repair; hits += 1;
    } else {
      const water = Math.round((d?.bed === "MISS" ? 14 : 8) * modeOptionNumber(state.config, "floodPowerPct", 100, 50, 180) / 100);
      flood = clamp(flood + water, 0, 100); hull = Math.max(0, hull - Math.max(4, Math.floor(water + flood / 18)));
    }
  }
  const compartmentGoal = modeOptionNumber(state.config, "compartmentGoal", ICEBERG_COMPARTMENTS, 2, 10);
  if (hits >= 2) { compartments = Math.min(compartmentGoal, compartments + 1); events.push(`✅ Compartiment ${compartments}/${compartmentGoal} sécurisé`); }
  if (flood >= 85) { hull = Math.max(0, hull - 18); events.push("🌊 Inondation critique"); }
  state.special.icebergHullByPlayer[playerId] = hull;
  state.special.icebergFloodByPlayer[playerId] = flood;
  state.special.icebergCompartmentsByPlayer[playerId] = compartments;
  state.health[playerId] = hull; state.progress[playerId] = compartments; state.scores[playerId] += delta * 3;
  if (hull <= 0) { state.eliminated[playerId] = true; events.push("🚢 Navire perdu"); }
  if (compartments >= compartmentGoal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  state.special.icebergHistory = [...(state.special?.icebergHistory || []), { playerId, hull, flood, compartments }].slice(-40);
  return { delta, hits };
}

function processJurassic(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let threat = Number(state.special?.jurassicThreatByPlayer?.[playerId] || 0);
  let security = Number(state.special?.jurassicSecurityByPlayer?.[playerId] || 100);
  let progress = Number(state.special?.jurassicProgressByPlayer?.[playerId] || 0);
  let hits = 0, delta = 0;
  for (const d of darts) {
    if (d?.bed === "OB" || d?.bed === "IB") {
      const tranq = modeOptionNumber(state.config, "tranquilizerPower", 22, 8, 40);
      const calm = d.bed === "IB" ? Math.round(tranq * 1.6) : tranq;
      threat = Math.max(0, threat - calm); security = Math.min(100, security + Math.floor(calm / 3)); hits += 1;
      events.push(`💉 Tranquillisant · menace -${calm}`);
    } else if (target && dartMatchesTarget(d, target, state.config.difficulty)) {
      const move = bedPower(d, 6, 10, 15);
      progress = Math.min(100, progress + move); delta += move; hits += 1; threat = Math.max(0, threat - 4);
    } else threat = clamp(threat + (d?.bed === "MISS" ? 18 : 10), 0, 120);
  }
  const attackThreshold = modeOptionNumber(state.config, "attackThreshold", 100, 70, 120);
  if (threat >= attackThreshold) {
    const damage = modeOptionNumber(state.config, "securityDamage", state.config.difficulty === "hard" ? 65 : state.config.difficulty === "easy" ? 40 : 52, 25, 90);
    security = Math.max(0, security - damage); threat = 35; events.push(`🦖 ATTAQUE ! Sécurité -${damage}`);
    if (security <= 0) { applySurvivalDamage(state, playerId, 120, events); security = state.eliminated[playerId] ? 0 : 100; }
  }
  state.special.jurassicThreatByPlayer[playerId] = threat;
  state.special.jurassicSecurityByPlayer[playerId] = security;
  state.special.jurassicProgressByPlayer[playerId] = progress;
  state.health[playerId] = security; state.progress[playerId] = progress; state.scores[playerId] += delta * 4;
  if (progress >= 100) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  events.push(`🦕 Expédition ${progress}/100 · menace ${Math.round(threat)}%`);
  state.special.jurassicHistory = [...(state.special?.jurassicHistory || []), { playerId, progress, threat, security }].slice(-40);
  return { delta, hits };
}

function processApocalypse(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  let resources = Number(state.special?.apocalypseResourcesByPlayer?.[playerId] || 0);
  let refuge = Number(state.special?.apocalypseRefugeByPlayer?.[playerId] || 0);
  let threat = Number(state.special?.apocalypseThreatByPlayer?.[playerId] || 0);
  let hits = 0, delta = 0;
  for (const d of darts) {
    if (d?.bed === "OB" || d?.bed === "IB") {
      const heal = Math.round((d.bed === "IB" ? 30 : 18) * modeOptionNumber(state.config, "medkitPowerPct", 100, 50, 180) / 100);
      state.health[playerId] = Math.min(100, Number(state.health[playerId] || 100) + heal);
      threat = Math.max(0, threat - Math.floor(heal / 2)); hits += 1; events.push(`🩹 Medkit +${heal} PV`);
    } else if (target && dartMatchesTarget(d, target, state.config.difficulty)) {
      const gain = bedPower(d, 6, 10, 15);
      resources += gain; refuge = Math.min(modeOptionNumber(state.config, "refugeGoal", 100, 50, 150), refuge + Math.max(2, Math.floor(gain * 0.8))); delta += gain; hits += 1;
    } else threat = clamp(threat + (d?.bed === "MISS" ? 16 : 9), 0, 120);
  }
  const disaster = (hashText(`${state.special?.seedText}:${state.turnIndex}`) % 4) + 1;
  threat = clamp(threat + disaster * (state.config.difficulty === "hard" ? 5 : 3), 0, 120);
  const disasterThreshold = modeOptionNumber(state.config, "disasterThreshold", 85, 50, 120);
  if (threat >= disasterThreshold) {
    const damage = Math.round(18 + threat / 5);
    applySurvivalDamage(state, playerId, damage, events);
    refuge = Math.max(0, refuge - 8);
    threat = Math.max(25, threat - 45);
    events.push(`☢️ Catastrophe · refuge -8`);
  }
  state.special.apocalypseResourcesByPlayer[playerId] = resources;
  state.special.apocalypseRefugeByPlayer[playerId] = refuge;
  state.special.apocalypseThreatByPlayer[playerId] = threat;
  state.progress[playerId] = refuge; state.scores[playerId] += delta * 5;
  const refugeGoal = modeOptionNumber(state.config, "refugeGoal", 100, 50, 150);
  if (refuge >= refugeGoal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  events.push(`🏚️ Refuge ${refuge}/${refugeGoal} · ressources ${resources}`);
  state.special.apocalypseHistory = [...(state.special?.apocalypseHistory || []), { playerId, refuge, resources, threat }].slice(-40);
  return { delta, hits };
}

function processMistigri(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const holderId = String(state.special?.mistigriHolderId || "");
  const isHolder = holderId === playerId;
  const hits = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)).length : 0;
  const bulls = bullCount(darts);
  const dangerThreshold = modeOptionNumber(state.config, "dangerThreshold", 3, 2, 6);
  const dangerPerMiss = modeOptionNumber(state.config, "dangerPerMiss", 1, 1, 3);
  const bullShield = modeOptionNumber(state.config, "bullShield", 1, 0, 3);
  let danger = Number(state.special?.mistigriDangerByPlayer?.[playerId] || 0);
  let shield = Number(state.special?.mistigriShieldByPlayer?.[playerId] || 0);
  let pairs = Number(state.special?.mistigriPairsByPlayer?.[playerId] || 0);
  let delta = 0;

  if (bulls > 0 && bullShield > 0) {
    shield += bulls * bullShield;
    events.push(`🛡️ Protection Mistigri +${bulls * bullShield}`);
  }

  if (hits > 0) {
    pairs += 1;
    delta += 30 + hits * 20 + bulls * 15;
    danger = Math.max(0, danger - hits);
    events.push(`🎴 Paire validée · ${hits} touche(s)`);
    if (isHolder) {
      const next = nextEnemy(state, playerId)?.id || nextOpponentId(state, playerId);
      if (next) {
        state.special.mistigriHolderId = next;
        danger = 0;
        events.push(`🃏 Mistigri transmis à ${state.players.find((p) => p.id === next)?.name || "l'adversaire"}`);
      }
    }
  } else if (isHolder) {
    danger += dangerPerMiss;
    events.push(`😬 Le Mistigri reste en main · danger ${danger}/${dangerThreshold}`);
    if (danger >= dangerThreshold) {
      if (shield > 0) {
        shield -= 1;
        danger = Math.max(0, dangerThreshold - 1);
        events.push("🛡️ Protection consommée · pénalité évitée");
      } else {
        const before = Number(state.lives[playerId] || 0);
        state.lives[playerId] = Math.max(0, before - 1);
        danger = 0;
        events.push(`💀 Mistigri ! Vie perdue · ${state.lives[playerId]} restante(s)`);
        if (state.lives[playerId] <= 0) {
          state.eliminated[playerId] = true;
          events.push("☠️ Éliminé par le Mistigri");
        }
        const next = nextEnemy(state, playerId)?.id || nextOpponentId(state, playerId);
        if (next) state.special.mistigriHolderId = next;
      }
    }
  } else {
    delta += bulls * 10;
    events.push(hits ? "🎴 Tu restes hors du Mistigri" : "🃏 Le Mistigri est ailleurs");
  }

  state.special.mistigriDangerByPlayer[playerId] = danger;
  state.special.mistigriShieldByPlayer[playerId] = shield;
  state.special.mistigriPairsByPlayer[playerId] = pairs;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  state.progress[playerId] = pairs;
  state.special.mistigriHistory = [...(state.special?.mistigriHistory || []), { playerId, hits, pairs, danger, shield, holderId: state.special.mistigriHolderId }].slice(-60);
  return { delta, hits: hits + bulls };
}

function processRadin(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const targetWallet = modeOptionNumber(state.config, "targetWallet", 250, 100, 1000);
  const missFee = modeOptionNumber(state.config, "missFee", 12, 0, 50);
  const bullRebate = modeOptionNumber(state.config, "bullRebate", 25, 0, 100);
  let wallet = Number(state.special?.radinWalletByPlayer?.[playerId] ?? state.scores[playerId] ?? 100);
  let spent = Number(state.special?.radinSpentByPlayer?.[playerId] || 0);
  let earned = Number(state.special?.radinEarnedByPlayer?.[playerId] || 0);
  let visitEarned = 0, visitSpent = 0, hits = 0;

  for (const d of darts) {
    if (!d || d.bed === "MISS") {
      visitSpent += missFee;
      continue;
    }
    if (d.bed === "OB" || d.bed === "IB") {
      const rebate = d.bed === "IB" ? bullRebate * 2 : bullRebate;
      visitEarned += rebate;
      hits += 1;
      events.push(`🎟️ Coupon BULL +${rebate}`);
      continue;
    }
    const cost = bedPower(d, 2, 4, 6, 0, 0);
    visitSpent += cost;
    if (target && dartMatchesTarget(d, target, state.config.difficulty)) {
      const reward = bedPower(d, 14, 28, 42, 0, 0);
      visitEarned += reward;
      hits += 1;
    }
  }

  spent += visitSpent;
  earned += visitEarned;
  wallet = Math.max(0, wallet + visitEarned - visitSpent);
  state.special.radinWalletByPlayer[playerId] = wallet;
  state.special.radinSpentByPlayer[playerId] = spent;
  state.special.radinEarnedByPlayer[playerId] = earned;
  state.scores[playerId] = wallet;
  state.progress[playerId] = Math.round((wallet / Math.max(1, targetWallet)) * 100);
  const delta = visitEarned - visitSpent;
  events.push(`💰 +${visitEarned} / -${visitSpent} · caisse ${Math.round(wallet)}/${targetWallet}`);
  if (wallet >= targetWallet) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  state.special.radinHistory = [...(state.special?.radinHistory || []), { playerId, wallet, spent, earned, visitEarned, visitSpent }].slice(-60);
  return { delta, hits };
}

function processCorbeauRenard(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const role = String(state.special?.fableRoleByPlayer?.[playerId] || "CORBEAU");
  const threshold = modeOptionNumber(state.config, "fableThreshold", 5, 3, 9);
  const cheeseGoal = modeOptionNumber(state.config, "cheeseGoal", 6, 3, 12);
  const bullGuard = modeOptionNumber(state.config, "bullGuard", 1, 0, 3);
  const matches = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const bulls = bullCount(darts);
  const hits = matches.length + bulls;
  let meter = Number(state.special?.fableMeterByPlayer?.[playerId] || 0);
  let cheese = Number(state.special?.fableCheeseByPlayer?.[playerId] || 0);
  let guard = Number(state.special?.fableGuardByPlayer?.[playerId] || 0);
  const power = matches.reduce((sum, d) => sum + bedPower(d, 1, 2, 3), 0) + bulls * 2;
  meter += power;
  if (bulls && bullGuard > 0) {
    guard += bulls * bullGuard;
    events.push(`🛡️ Ruse protégée +${bulls * bullGuard}`);
  }

  let actions = 0;
  while (meter >= threshold) {
    meter -= threshold;
    actions += 1;
    if (role === "RENARD") {
      const victim = nextEnemy(state, playerId);
      if (!victim) break;
      const victimGuard = Number(state.special?.fableGuardByPlayer?.[victim.id] || 0);
      if (victimGuard > 0) {
        state.special.fableGuardByPlayer[victim.id] = victimGuard - 1;
        events.push(`🐦 ${victim.name} protège son fromage`);
      } else {
        const victimCheese = Number(state.special?.fableCheeseByPlayer?.[victim.id] || 0);
        if (victimCheese > 0) {
          state.special.fableCheeseByPlayer[victim.id] = victimCheese - 1;
          cheese += 1;
          events.push(`🦊 Fromage volé à ${victim.name}`);
        } else events.push(`🦊 ${victim.name} n'avait plus de fromage à voler`);
      }
    } else {
      cheese += 1;
      events.push("🧀 Le Corbeau sécurise un fromage");
    }
  }

  state.special.fableMeterByPlayer[playerId] = meter;
  state.special.fableCheeseByPlayer[playerId] = cheese;
  state.special.fableGuardByPlayer[playerId] = guard;
  state.progress[playerId] = cheese;
  const delta = power * 12 + actions * 40;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  events.push(`${role === "RENARD" ? "🦊" : "🐦"} ${role} · fromage ${cheese}/${cheeseGoal} · ruse ${meter}/${threshold}`);
  if (cheese >= cheeseGoal) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  state.special.fableHistory = [...(state.special?.fableHistory || []), { playerId, role, cheese, meter, guard, actions }].slice(-60);
  return { delta, hits };
}

function impossibleContractMatches(d: GameDart, contract: ImpossibleContract, difficulty: Wave61Difficulty): boolean {
  if (!d || d.bed === "MISS" || !contract) return false;
  if (contract.bed === "OB" || contract.bed === "IB") {
    if (difficulty === "easy") return d.bed === "OB" || d.bed === "IB";
    return d.bed === contract.bed;
  }
  if (Number(d.number || 0) !== Number(contract.number || 0)) return false;
  if (difficulty === "easy") return true;
  return d.bed === contract.bed;
}

function processDartsImpossible(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const contracts: ImpossibleContract[] = Array.isArray(state.special?.impossibleContracts) ? state.special.impossibleContracts : [];
  const missionCount = Math.min(contracts.length, modeOptionNumber(state.config, "missionCount", contracts.length || 10, 6, 18));
  const alarmGain = modeOptionNumber(state.config, "alarmGain", 18, 8, 40);
  const alarmThreshold = modeOptionNumber(state.config, "alarmThreshold", 100, 60, 150);
  const failBack = modeOptionNumber(state.config, "failBack", 1, 0, 4);
  const bullCooling = modeOptionNumber(state.config, "bullCooling", 16, 0, 50);
  let step = Number(state.special?.impossibleStepByPlayer?.[playerId] || 0);
  let alarm = Number(state.special?.impossibleAlarmByPlayer?.[playerId] || 0);
  let fails = Number(state.special?.impossibleFailsByPlayer?.[playerId] || 0);
  let hits = 0, delta = 0;

  for (const d of darts) {
    if (step >= missionCount) break;
    const contract = contracts[step];
    if (impossibleContractMatches(d, contract, state.config.difficulty)) {
      step += 1;
      hits += 1;
      const reward = 80 + bedPower(d, 20, 35, 55, 35, 70);
      delta += reward;
      alarm = Math.max(0, alarm - 8);
      events.push(`✅ Mission ${step}/${missionCount} validée · +${reward}`);
      continue;
    }
    if (d?.bed === "OB" || d?.bed === "IB") {
      const cool = d.bed === "IB" ? bullCooling * 2 : bullCooling;
      alarm = Math.max(0, alarm - cool);
      events.push(`🧯 Piratage BULL · alarme -${cool}`);
    } else {
      alarm += alarmGain + (d?.bed === "MISS" ? 5 : 0);
      events.push(`🚨 Laser déclenché · alarme ${Math.round(alarm)}%`);
    }
    if (alarm >= alarmThreshold) {
      fails += 1;
      step = Math.max(0, step - failBack);
      alarm = Math.round(alarmThreshold * 0.35);
      events.push(`💥 MISSION COMPROMISE · recul ${failBack} · alarme réinitialisée`);
    }
  }

  state.special.impossibleStepByPlayer[playerId] = step;
  state.special.impossibleAlarmByPlayer[playerId] = alarm;
  state.special.impossibleFailsByPlayer[playerId] = fails;
  state.progress[playerId] = step;
  state.scores[playerId] = Number(state.scores[playerId] || 0) + delta;
  if (step >= missionCount) finishWith(state, playerId, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[playerId] || null : null);
  state.special.impossibleHistory = [...(state.special?.impossibleHistory || []), { playerId, step, alarm, fails, hits, delta }].slice(-60);
  return { delta, hits };
}

function processKnockback(state: Wave61State, playerId: string, darts: GameDart[], events: string[]): { delta: number; hits: number } {
  const before = Number(state.scores[playerId] || 0);
  const visit = darts.reduce((sum, d) => sum + wave61DartScore(d), 0);
  const projected = before + visit;
  if (projected > state.config.goal) {
    const bustBack = modeOptionNumber(state.config, "bustBack", 0, 0, 100);
    if (bustBack > 0) {
      state.scores[playerId] = Math.max(0, before - bustBack);
      state.progress[playerId] = state.scores[playerId];
      events.push(`💥 BUST · ${projected} dépasse ${state.config.goal} · recul ${bustBack}`);
    } else events.push(`💥 BUST · ${projected} dépasse ${state.config.goal}`);
    return { delta: 0, hits: darts.filter((d) => wave61DartScore(d) > 0).length };
  }
  state.scores[playerId] = projected; state.progress[playerId] = projected;
  const collisions: string[] = [];
  if (projected > 0) for (const other of state.players) {
    if (other.id === playerId || state.eliminated[other.id]) continue;
    if (Number(state.scores[other.id] || 0) === projected) {
      const resetPct = modeOptionNumber(state.config, "collisionResetPct", 0, 0, 100);
      const resetScore = Math.round(projected * resetPct / 100);
      state.scores[other.id] = resetScore; state.progress[other.id] = resetScore; collisions.push(other.name);
    }
  }
  if (collisions.length) {
    const resetPct = modeOptionNumber(state.config, "collisionResetPct", 0, 0, 100);
    const collisionBonus = modeOptionNumber(state.config, "collisionScoreBonus", 0, 0, 100);
    if (collisionBonus > 0) state.scores[playerId] = Math.min(state.config.goal, Number(state.scores[playerId] || 0) + collisionBonus);
    state.progress[playerId] = state.scores[playerId];
    events.push(`💣 KNOCKBACK · ${collisions.join(", ")} → ${resetPct}%${collisionBonus ? ` · bonus +${collisionBonus}` : ""}`);
  } else events.push(`🎯 ${projected}/${state.config.goal}`);
  state.special.knockbackHistory = [...(state.special?.knockbackHistory || []), { playerId, before, visit, projected, collisions }].slice(-40);
  if (Number(state.scores[playerId] || 0) >= state.config.goal) finishWith(state, playerId);
  return { delta: visit, hits: darts.filter((d) => wave61DartScore(d) > 0).length };
}

function damageWithLayer(state: Wave61State, targetId: string, amount: number, layerKey: string, events: string[], label: string): number {
  let damage = Math.max(0, Math.round(amount));
  const layer = Number(state.special?.[layerKey]?.[targetId] || 0);
  const absorbed = Math.min(layer, damage);
  if (state.special?.[layerKey]) state.special[layerKey][targetId] = Math.max(0, layer - absorbed);
  damage -= absorbed;
  if (absorbed) events.push(`${label} absorbe ${absorbed}`);
  if (damage > 0) {
    state.health[targetId] = Math.max(0, Number(state.health[targetId] || 100) - damage);
    state.statsByPlayer[targetId].damageTaken += damage;
  }
  return damage;
}

function processSpartacus(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const matches = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const hits = matches.length;
  let glory = Number(state.special?.spartacusGloryByPlayer?.[playerId] || 0);
  let guard = Number(state.special?.spartacusGuardByPlayer?.[playerId] || 0);
  const guardCap = modeOptionNumber(state.config, "guardCap", 60, 20, 120);
  for (const d of darts) if (d?.bed === "OB" || d?.bed === "IB") guard = clamp(guard + (d.bed === "IB" ? 35 : 20), 0, guardCap);
  glory += matches.reduce((sum, d) => sum + bedPower(d, 8, 14, 22), 0);
  state.special.spartacusGloryByPlayer[playerId] = glory;
  state.special.spartacusGuardByPlayer[playerId] = guard;
  let attack = Math.round((matches.reduce((sum, d) => sum + bedPower(d, 16, 26, 40), 0) + Math.floor(glory / 50) * 5) * modeOptionNumber(state.config, "attackPowerPct", 100, 50, 180) / 100);
  const victim = nextEnemy(state, playerId);
  let dealt = 0;
  if (victim && attack > 0) {
    dealt = damageWithLayer(state, victim.id, attack, "spartacusArmorByPlayer", events, `🛡️ Armure ${victim.name}`);
    const victimGuard = Number(state.special?.spartacusGuardByPlayer?.[victim.id] || 0);
    if (victimGuard > 0 && dealt > 0) {
      const block = Math.min(victimGuard, dealt);
      state.special.spartacusGuardByPlayer[victim.id] = Math.max(0, victimGuard - block);
      state.health[victim.id] = Math.min(100, state.health[victim.id] + block);
      dealt -= block; events.push(`🗡️ Garde bloque ${block}`);
    }
    state.statsByPlayer[playerId].damage += Math.max(0, dealt);
    if (state.health[victim.id] <= 0) { state.eliminated[victim.id] = true; events.push(`🏛️ ${victim.name} tombe dans l'arène`); }
  }
  state.scores[playerId] += glory + dealt; state.progress[playerId] = glory;
  events.push(hits ? `⚔️ Gloire ${glory} · attaque ${attack}` : "⚔️ Ouverture manquée");
  state.special.spartacusHistory = [...(state.special?.spartacusHistory || []), { playerId, hits, glory, guard, attack, dealt }].slice(-40);
  return { delta: dealt, hits };
}

function processCosmoKnights(state: Wave61State, playerId: string, darts: GameDart[], target: Wave61Target, events: string[]): { delta: number; hits: number } {
  const matches = target ? darts.filter((d) => dartMatchesTarget(d, target, state.config.difficulty)) : [];
  const hits = matches.length;
  const burstThreshold = modeOptionNumber(state.config, "burstThreshold", 100, 60, 150);
  const burstDamage = modeOptionNumber(state.config, "burstDamage", 55, 30, 90);
  const shieldCap = modeOptionNumber(state.config, "shieldCap", 50, 20, 90);
  let charge = Number(state.special?.cosmoChargeByPlayer?.[playerId] || 0);
  let shield = Number(state.special?.cosmoShieldByPlayer?.[playerId] || 0);
  for (const d of darts) {
    if (d?.bed === "IB" || d?.bed === "OB") { charge += d.bed === "IB" ? 45 : 28; shield = clamp(shield + (d.bed === "IB" ? 22 : 12), 0, shieldCap); }
    else if (target && dartMatchesTarget(d, target, state.config.difficulty)) charge += bedPower(d, 12, 20, 30);
  }
  const victim = nextEnemy(state, playerId);
  let dealt = 0;
  if (victim && hits > 0) {
    const base = matches.reduce((sum, d) => sum + bedPower(d, 10, 16, 24), 0);
    dealt += damageWithLayer(state, victim.id, base, "cosmoShieldByPlayer", events, `✨ Bouclier ${victim.name}`);
  }
  if (victim && charge >= burstThreshold) {
    const burst = burstDamage + (state.config.difficulty === "hard" ? 10 : 0);
    dealt += damageWithLayer(state, victim.id, burst, "cosmoShieldByPlayer", events, `✨ Bouclier ${victim.name}`);
    charge -= burstThreshold;
    state.special.cosmoBurstsByPlayer[playerId] = Number(state.special?.cosmoBurstsByPlayer?.[playerId] || 0) + 1;
    events.push(`🌌 COSMO BURST · ${burst} puissance`);
  }
  state.special.cosmoChargeByPlayer[playerId] = clamp(charge, 0, Math.max(150, burstThreshold + 50));
  state.special.cosmoShieldByPlayer[playerId] = shield;
  state.statsByPlayer[playerId].damage += Math.max(0, dealt);
  state.scores[playerId] += dealt + hits * 15; state.progress[playerId] = state.special.cosmoChargeByPlayer[playerId];
  if (victim && state.health[victim.id] <= 0) { state.eliminated[victim.id] = true; events.push(`💫 ${victim.name} est vaincu`); }
  events.push(`✨ Cosmos ${Math.round(state.special.cosmoChargeByPlayer[playerId])}% · bouclier ${Math.round(shield)}`);
  state.special.cosmoHistory = [...(state.special?.cosmoHistory || []), { playerId, hits, charge: state.special.cosmoChargeByPlayer[playerId], shield, dealt }].slice(-40);
  return { delta: dealt, hits };
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
    let won = false, placed = 0;
    for (const d of darts) {
      const move = placeAlign4(state, player.id, d, events);
      if (move.placed) placed += 1;
      if (move.won) { won = true; break; }
    }
    hits = placed;
    delta = placed;
    state.progress[player.id] = Number(state.progress[player.id] || 0) + placed;
    state.scores[player.id] = Number(state.scores[player.id] || 0) + placed * 10;
    if (won) finishWith(state, player.id, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[player.id] || null : null);
  } else if (state.modeId === "demineur") {
    const mineResult = processMinefield(state, player.id, darts, events); delta = mineResult.delta; hits = mineResult.hits;
    if (state.health[player.id] <= 0) state.eliminated[player.id] = true;
    const safeCount = 20 - (state.special?.mines?.length || 0);
    const safeRevealed = (state.special?.revealed || []).filter((n: number) => !(state.special?.mines || []).includes(n)).length;
    if (safeRevealed >= safeCount) {
      const winner = [...state.players].sort((a, b) => Number(state.special?.safeByPlayer?.[b.id] || 0) - Number(state.special?.safeByPlayer?.[a.id] || 0))[0]?.id || player.id;
      finishWith(state, winner, state.config.participantMode === "teams" ? state.config.teamByPlayer?.[winner] || null : null);
    }
  } else if (state.modeId === "replicat") {
    const res = scoreReplicat(state, darts);
    hits = res.hits; delta = res.progressDelta; events.push(...res.events);
    state.progress[player.id] = Number(state.progress[player.id] || 0) + res.progressDelta;
    state.scores[player.id] = Number(state.scores[player.id] || 0) + res.scoreDelta;
    if (state.progress[player.id] >= state.config.goal) finishWith(state, player.id);
  } else if (state.modeId === "double_down") {
    const valid = darts.filter((d) => doubleDownContractMatches(d, target));
    hits = valid.length;
    if (hits <= 0) {
      const before = Number(state.scores[player.id] || 0);
      const penaltyPct = modeOptionNumber(state.config, "missPenaltyPercent", 50, 0, 100);
      state.scores[player.id] = Math.max(0, Math.floor(before * (1 - penaltyPct / 100)));
      events.push(`💔 Contrat raté · -${penaltyPct}% · ${before} → ${state.scores[player.id]}`);
    } else {
      const hitFactor = modeOptionNumber(state.config, "hitMultiplierPct", 100, 50, 200) / 100;
      const perfectBonus = hits >= 3 ? modeOptionNumber(state.config, "perfectBonus", 0, 0, 250) : 0;
      delta = Math.round(valid.reduce((sum,d)=>sum+wave61DartScore(d),0) * hitFactor) + perfectBonus;
      state.scores[player.id] += delta;
      events.push(`✅ Contrat ${target?.label || ""} · +${delta}${perfectBonus ? ` · parfait +${perfectBonus}` : ""}`);
    }
    state.progress[player.id] = state.roundIndex + 1;
    state.special.doubleDownHistory = [...(state.special.doubleDownHistory || []), { playerId: player.id, round: state.roundIndex + 1, target: target?.label, hits, score: state.scores[player.id] }].slice(-30);
  } else if (state.modeId === "nine_dart_century") {
    const projected = Number(state.scores[player.id] || 0) + visitScore;
    if (projected > state.config.goal) {
      state.special.centuryBustsByPlayer[player.id] = Number(state.special.centuryBustsByPlayer?.[player.id] || 0) + 1;
      const busts = Number(state.special.centuryBustsByPlayer[player.id] || 0);
      const bustBack = modeOptionNumber(state.config, "bustBack", 0, 0, 50);
      const resetAfter = modeOptionNumber(state.config, "bustResetAfter", 0, 0, 6);
      if (resetAfter > 0 && busts >= resetAfter) {
        state.scores[player.id] = 0; state.progress[player.id] = 0;
        state.special.centuryBustsByPlayer[player.id] = 0;
        events.push(`💥 BUST #${busts} · remise à zéro`);
      } else if (bustBack > 0) {
        state.scores[player.id] = Math.max(0, Number(state.scores[player.id] || 0) - bustBack);
        state.progress[player.id] = state.scores[player.id];
        events.push(`💥 BUST · ${projected} dépasse ${state.config.goal} · recul ${bustBack}`);
      } else events.push(`💥 BUST · ${projected} dépasse ${state.config.goal}`);
      delta = 0;
    } else {
      delta = visitScore; state.scores[player.id] = projected; state.progress[player.id] = projected;
      events.push(`🎯 ${state.scores[player.id]}/${state.config.goal} après ${Math.min(9, st.darts)} fléchette(s)`);
    }
    if (state.scores[player.id] === state.config.goal) finishWith(state, player.id);
  } else if (state.modeId === "shove_a_penny") {
    const result = processShoveAPenny(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "green_vs_red") {
    const result = processGreenVsRed(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "hi_score") {
    const scoreFactor = modeOptionNumber(state.config, "scoreMultiplierPct", 100, 50, 200) / 100;
    const bulls = bullCount(darts);
    const misses = darts.filter((d) => !d || d.bed === "MISS").length;
    const bullBonus = bulls * modeOptionNumber(state.config, "bullBonus", 0, 0, 100);
    const missPenalty = misses * modeOptionNumber(state.config, "missPenalty", 0, 0, 100);
    delta = Math.max(0, Math.round(visitScore * scoreFactor) + bullBonus - missPenalty);
    state.scores[player.id] = Number(state.scores[player.id] || 0) + delta;
    state.progress[player.id] = state.scores[player.id];
    events.push(`🏁 HI SCORE · +${delta} · total ${state.scores[player.id]}${bullBonus ? ` · BULL +${bullBonus}` : ""}${missPenalty ? ` · MISS -${missPenalty}` : ""}`);
  } else if (state.modeId === "sniper") {
    const result = processSniper(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "luciole") {
    const result = processLuciole(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "golden_dart") {
    const result = processGoldenDart(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "tug_rush") {
    const result = processTugRush(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "un_deux_trois_soleil") {
    const result = processSoleil(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "chat_souris") {
    const result = processChatSouris(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "maze_chase") {
    const result = processMazeChase(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "chien_chat") {
    const result = processChienChat(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "roller_coaster") {
    const result = processRollerCoaster(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "athletisme") {
    const result = processAthletisme(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "chute_libre") {
    const result = processChuteLibre(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "tyrolien") {
    const result = processTyrolien(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "saut_a_la_corde") {
    const result = processSautCorde(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "heist_180") {
    const result = processHeist180(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "escape_game") {
    const result = processEscapeGame(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "objectif_lune") {
    const result = processObjectifLune(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "hollywood") {
    const result = processHollywood(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "calendrier_maya") {
    const result = processMaya(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "pyramides") {
    const result = processPyramides(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "draco_spheres") {
    const result = processDracoSpheres(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "mythologie") {
    const result = processMythologie(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "jardinier") {
    const result = processJardinier(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "microscopia") {
    const result = processMicroscopia(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "disjoncte") {
    const result = processDisjoncte(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "petit_bac") {
    const result = processPetitBac(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "final_buzzer") {
    const result = processFinalBuzzer(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "jackpot") {
    const result = processJackpot(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "mafia") {
    const result = processMafia(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (["mont_blanc", "everest", "summit_14"].includes(state.modeId)) {
    const result = processAscentMode(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (CONQUEST_PROFILES[state.modeId]) {
    const result = processConquestMode(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "cheval_de_troie") {
    const result = processChevalTroie(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "hot_potato") {
    const result = processHotPotato(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "zombie_siege") {
    const result = processZombieSiege(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "le_loup") {
    const result = processLeLoup(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "eperviers") {
    const result = processEperviers(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "ballon_prisonnier") {
    const result = processBallonPrisonnier(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "iceberg") {
    const result = processIceberg(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "jurassic_dart") {
    const result = processJurassic(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "apocalypse") {
    const result = processApocalypse(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "mistigri") {
    const result = processMistigri(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "radin") {
    const result = processRadin(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "corbeau_renard") {
    const result = processCorbeauRenard(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "darts_impossible") {
    const result = processDartsImpossible(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "knockback") {
    const result = processKnockback(state, player.id, darts, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "spartacus") {
    const result = processSpartacus(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "cosmo_knights") {
    const result = processCosmoKnights(state, player.id, darts, target, events); delta = result.delta; hits = result.hits;
  } else if (state.modeId === "codebreaker") {
    const result = processCodebreaker(state, player.id, darts, events);
    delta = result.delta;
    hits = result.hits;
  } else if (state.modeId === "face_mystere") {
    const result = processFaceMystere(state, player.id, darts, events);
    delta = result.delta;
    hits = result.hits;
  } else if (state.modeId === "colin_maillard") {
    const result = processColinMaillard(state, player.id, darts, events);
    delta = result.delta;
    hits = result.hits;
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

  if (state.phase === "playing" && (state.family === "survival" || state.family === "combat") && !["zombie_siege", "eperviers", "ballon_prisonnier"].includes(state.modeId)) {
    const alive = state.players.filter((p) => !state.eliminated[p.id]);
    if (state.config.participantMode === "teams") {
      const aliveTeams = Array.from(new Set(alive.map((p) => state.config.teamByPlayer?.[p.id] || "A")));
      if (aliveTeams.length === 1 && state.players.length > 1) {
        finishWith(state, alive.find((p) => (state.config.teamByPlayer?.[p.id] || "A") === aliveTeams[0])?.id || player.id, aliveTeams[0]);
      } else if (aliveTeams.length === 0 && state.players.length > 0) {
        // A simultaneous/last-survivor elimination must still terminate the match.
        // Rank the completed teams instead of leaving the engine stuck in `playing`.
        const team = bestTeam(state);
        if (team) finishWith(state, team.playerId, team.teamId);
      }
    } else if (alive.length === 1 && state.players.length > 1) {
      finishWith(state, alive[0].id);
    } else if (alive.length === 0 && state.players.length > 0) {
      // No eligible player remains: close immediately using the final metrics.
      const winner = bestPlayer(state);
      if (winner) finishWith(state, winner);
    }
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
  if (wrapped && state.modeId === "mafia" && mafiaPhase(state) === "DAY") resolveMafiaDay(state);
  if (state.phase !== "playing") return state;
  state.activePlayerIndex = next;
  state.turnIndex += 1;
  if (wrapped) state.roundIndex += 1;
  if (state.roundIndex >= state.config.rounds && state.phase === "playing") {
    if (state.modeId === "mafia") {
      if (!checkMafiaVictory(state)) {
        const mafia = mafiaAliveByRole(state, "MAFIA");
        const town = state.players.filter((p) => !state.eliminated[p.id] && state.special?.mafiaRoleByPlayer?.[p.id] !== "MAFIA");
        const faction = mafia.length && mafia.length >= Math.max(1, Math.ceil(town.length / 2)) ? "MAFIA" : "CITIZENS";
        state.special.mafiaWinningFaction = faction;
        const pool = faction === "MAFIA" ? mafia : town;
        const winner = [...pool].sort((a,b) => Number(state.scores[b.id] || 0) - Number(state.scores[a.id] || 0))[0] || state.players[0];
        if (winner) finishWith(state, winner.id);
      }
      return state;
    }
    if (state.modeId === "zombie_siege") {
      const survivors = state.players.filter((p) => state.special?.zombieRoleByPlayer?.[p.id] === "SURVIVOR");
      if (survivors.length) {
        const winner = [...survivors].sort((a,b) => Number(state.special?.zombieBarricadeByPlayer?.[b.id] || 0) - Number(state.special?.zombieBarricadeByPlayer?.[a.id] || 0))[0];
        if (winner) finishWith(state, winner.id, state.config.participantMode === "teams" ? "A" : null);
      } else {
        const zombie = state.players.find((p) => state.special?.zombieRoleByPlayer?.[p.id] === "ZOMBIE") || state.players[0];
        if (zombie) finishWith(state, zombie.id, state.config.participantMode === "teams" ? "B" : null);
      }
      return state;
    }
    if (state.modeId === "eperviers") {
      const runners = state.players.filter((p) => state.special?.epervierRoleByPlayer?.[p.id] === "RUNNER");
      const winner = runners.length ? [...runners].sort((a,b)=>Number(state.special?.epervierCrossingByPlayer?.[b.id]||0)-Number(state.special?.epervierCrossingByPlayer?.[a.id]||0))[0] : state.players[0];
      if (winner) finishWith(state, winner.id);
      return state;
    }
    if (state.modeId === "ballon_prisonnier") {
      if (state.config.participantMode === "teams") {
        const teams = Array.from(new Set(state.players.map((p)=>state.config.teamByPlayer?.[p.id] || "A")));
        const ranked = teams.map((team)=>({ team, players: state.players.filter((p)=>(state.config.teamByPlayer?.[p.id]||"A")===team) })).map((x)=>({ ...x, free: x.players.filter((p)=>!state.special?.dodgePrisonerByPlayer?.[p.id]).length, hp: x.players.reduce((sum,p)=>sum+Number(state.health[p.id]||0),0) })).sort((a,b)=>b.free-a.free || b.hp-a.hp);
        const top = ranked[0]; const winner = top?.players.find((p)=>!state.special?.dodgePrisonerByPlayer?.[p.id]) || top?.players[0];
        if (top && winner) finishWith(state, winner.id, top.team);
      } else {
        const winner = [...state.players].sort((a,b)=>(Number(!state.special?.dodgePrisonerByPlayer?.[b.id])-Number(!state.special?.dodgePrisonerByPlayer?.[a.id])) || Number(state.health[b.id]||0)-Number(state.health[a.id]||0))[0];
        if (winner) finishWith(state, winner.id);
      }
      return state;
    }
    if (state.config.participantMode === "teams") {
      const team = bestTeam(state);
      if (team) finishWith(state, team.playerId, team.teamId);
    } else {
      const winner = bestPlayer(state);
      if (winner) finishWith(state, winner);
    }
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
  const activeId = state.players[state.activePlayerIndex]?.id;
  if (state.modeId === "shove_a_penny") {
    const marks = state.special?.shoveMarksByPlayer?.[activeId] || {};
    const targetNum = SHOVE_TARGETS.find((n) => Number(marks[String(n)] || 0) < 3) || 20;
    const bed = level === "hard" ? "T" : level === "normal" ? "D" : "S";
    if (targetNum === 25) return [{ bed: level === "hard" ? "IB" : "OB" } as GameDart, { bed: "OB" } as GameDart, { bed: "OB" } as GameDart];
    return Array.from({ length: 3 }, () => ({ bed, number: targetNum } as GameDart));
  }
  if (state.modeId === "green_vs_red" && target?.kind === "number") {
    const bed = level === "hard" ? "T" : "D";
    return Array.from({ length: 3 }, () => Math.random() < chance ? ({ bed, number: target.value } as GameDart) : missNear(target));
  }
  if (state.modeId === "sniper" && target) {
    return Array.from({ length: 3 }, () => {
      if (Math.random() >= chance) return missNear(target);
      if (target.kind === "exact") return { bed: target.bed, ...(target.number ? { number: target.number } : {}) } as GameDart;
      if (target.kind === "number") return { bed: level === "hard" ? "T" : "S", number: target.value } as GameDart;
      return missNear(target);
    });
  }
  if (state.modeId === "luciole") {
    const n = wave61LucioleTarget(state, activeId);
    return Array.from({ length: 3 }, () => Math.random() < chance ? ({ bed: level === "hard" ? "T" : "S", number: n || 20 } as GameDart) : missNear({ kind: "number", value: n || 20, label: "" }));
  }
  if (state.modeId === "golden_dart") {
    const gold = goldenCurrentTarget(state);
    const guessChance = level === "hard" ? 0.66 : level === "normal" ? 0.34 : 0.12;
    return Array.from({ length: 3 }, () => Math.random() < guessChance ? ({ bed: level === "hard" ? "T" : "S", number: gold || 20 } as GameDart) : ({ bed: "S", number: 1 + Math.floor(Math.random() * 20) } as GameDart));
  }
  if (state.modeId === "jackpot") {
    const roll = Math.random();
    if (level === "hard" && roll < 0.28) return [5, 11, 17].map((n) => ({ bed: "T", number: n } as GameDart));
    if ((level === "hard" && roll < 0.62) || (level === "normal" && roll < 0.42)) return [4, 10, 2].map((n) => ({ bed: "S", number: n } as GameDart));
    return [1 + Math.floor(Math.random() * 20), 1 + Math.floor(Math.random() * 20), 1 + Math.floor(Math.random() * 20)].map((n) => ({ bed: "S", number: n } as GameDart));
  }
  if (state.modeId === "mafia" && mafiaPhase(state) === "DAY") {
    const alive = state.players.filter((p) => !state.eliminated[p.id] && p.id !== activeId);
    const suspect = alive.find((p) => state.special?.mafiaRoleByPlayer?.[p.id] === "MAFIA") || alive[0];
    const idx = Math.max(0, alive.findIndex((p) => p.id === suspect?.id));
    const n = idx + 1;
    return Array.from({ length: 3 }, () => ({ bed: level === "hard" ? "T" : "S", number: n || 1 } as GameDart));
  }
  if (state.modeId === "hi_score") {
    return Array.from({ length: 3 }, () => Math.random() < chance ? ({ bed: level === "hard" ? "T" : "S", number: 20 } as GameDart) : ({ bed: "S", number: 1 + Math.floor(Math.random() * 20) } as GameDart));
  }
  if (state.modeId === "demineur") {
    const revealed = new Set<number>((state.special?.revealed || []).map(Number));
    const mines = new Set<number>((state.special?.mines || []).map(Number));
    const candidates = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !revealed.has(n));
    const safer = candidates.filter((n) => !mines.has(n)).sort((a, b) => wave61MineNeighborCount(state, a) - wave61MineNeighborCount(state, b));
    const pool = level === "hard" ? safer : level === "normal" && Math.random() < 0.55 ? safer : candidates;
    const picks = pool.slice(0, 3);
    if (!picks.length) return [{ bed: "OB" } as GameDart];
    return picks.map((n) => ({ bed: "S", number: n } as GameDart));
  }
  if (state.modeId === "align_4") {
    const centerFirst = [4, 3, 5, 2, 6, 1, 7];
    return centerFirst.slice(0, 3).map((n) => ({ bed: "S", number: n } as GameDart));
  }
  if (state.modeId === "codebreaker") {
    const secret = (state.special?.secretCode || []).map(Number).slice(0, 3);
    const accuracy = level === "hard" ? 0.72 : level === "normal" ? 0.42 : 0.20;
    return secret.map((n: number) => ({ bed: "S", number: Math.random() < accuracy ? n : 1 + Math.floor(Math.random() * 20) } as GameDart));
  }
  if (state.modeId === "face_mystere") {
    const candidates = Array.isArray(state.special?.faceCandidates) && state.special.faceCandidates.length ? state.special.faceCandidates.map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
    const secret = Number(state.special?.faceSecret || 0);
    const solveChance = level === "hard" ? 0.34 : level === "normal" ? 0.16 : 0.06;
    const guesses = Array.from({ length: 3 }, (_, i) => (i === 0 && Math.random() < solveChance && secret) ? secret : candidates[(state.turnIndex + i * 3) % candidates.length]);
    return guesses.map((n) => ({ bed: "S", number: Number(n || 1) } as GameDart));
  }
  if (state.modeId === "knockback") {
    return Array.from({ length: 3 }, () => Math.random() < chance ? ({ bed: level === "hard" ? "T" : level === "normal" ? "D" : "S", number: 20 } as GameDart) : ({ bed: "S", number: 1 + Math.floor(Math.random() * 20) } as GameDart));
  }
  if (state.modeId === "ballon_prisonnier" && state.special?.dodgePrisonerByPlayer?.[activeId]) {
    return Array.from({ length: 3 }, (_, i) => i === 0 && Math.random() < chance ? ({ bed: level === "hard" ? "IB" : "OB" } as GameDart) : ({ bed: "S", number: 1 + Math.floor(Math.random() * 20) } as GameDart));
  }
  if (["jurassic_dart", "apocalypse"].includes(state.modeId) && Math.random() < (level === "hard" ? 0.35 : 0.18)) {
    return [{ bed: level === "hard" ? "IB" : "OB" } as GameDart, ...(target?.kind === "number" ? [{ bed: "S", number: target.value } as GameDart, { bed: "D", number: target.value } as GameDart] : [{ bed: "S", number: 20 } as GameDart, { bed: "S", number: 19 } as GameDart])];
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
    else if (target.kind === "exact") out.push({ bed: target.bed, ...(target.number ? { number: target.number } : {}) } as GameDart);
  }
  return out;
}

export function wave61PrimaryMetric(state: Wave61State, playerId: string): { value: number; label: string; sub: string } {
  const stats = state.statsByPlayer[playerId] || blankStats();
  if (state.modeId === "final_buzzer") return { value: Math.round(Number(state.progress[playerId] || 0)), label: "BUZZ", sub: `streak ${state.special?.finalBuzzerStreakByPlayer?.[playerId] || 0} · clutch ${state.special?.finalBuzzerClutchByPlayer?.[playerId] || 0}` };
  if (state.modeId === "jackpot") return { value: Math.round(Number(state.scores[playerId] || 0)), label: "CRÉDITS", sub: `${state.special?.jackpotJackpotsByPlayer?.[playerId] || 0} jackpot(s) · pot ${state.special?.jackpotPot || modeOptionNumber(state.config, "basePot", 250, 50, 2000)}` };
  if (state.modeId === "mafia") return { value: state.eliminated[playerId] ? 0 : 1, label: state.eliminated[playerId] ? "ÉLIMINÉ" : "EN JEU", sub: `${state.special?.mafiaVotesByPlayer?.[playerId] || 0} vote(s) · ${mafiaPhase(state) === "NIGHT" ? "nuit" : "jour"}` };
  if (state.modeId === "heist_180") return { value: Number(state.special?.heistStageByPlayer?.[playerId] || 0), label: "CASSE", sub: `${state.special?.heistLootByPlayer?.[playerId] || 0} butin · chaleur ${state.special?.heistHeatByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "escape_game") return { value: Number(state.special?.escapeStepByPlayer?.[playerId] || 0), label: "VERROUS", sub: `${state.special?.escapeStepByPlayer?.[playerId] || 0}/${ESCAPE_STAGES.length} · ${state.special?.escapePenaltyByPlayer?.[playerId] || 0} pénalité(s)` };
  if (state.modeId === "objectif_lune") return { value: Math.round(Number(state.special?.lunarStageByPlayer?.[playerId] || 0) * 25), label: "MISSION", sub: `fuel ${state.special?.lunarFuelByPlayer?.[playerId] || 0}% · stabilité ${state.special?.lunarStabilityByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "hollywood") return { value: Number(state.special?.hollywoodSceneByPlayer?.[playerId] || 0), label: "SCÈNES", sub: `${state.special?.hollywoodStarsByPlayer?.[playerId] || 0} ★ · box-office ${state.special?.hollywoodBoxOfficeByPlayer?.[playerId] || 0}` };
  if (state.modeId === "calendrier_maya") return { value: Number(state.special?.mayaSealByPlayer?.[playerId] || 0), label: "SCEAUX", sub: `fin du cycle ${state.special?.mayaDoomByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "pyramides") return { value: Number(state.special?.pyramidChamberByPlayer?.[playerId] || 0), label: "SALLES", sub: `torche ${state.special?.pyramidTorchByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "draco_spheres") return { value: Number(state.special?.dracoSpheresByPlayer?.[playerId] || 0), label: "ORBES", sub: `${state.special?.dracoSpheresByPlayer?.[playerId] || 0}/7 · énergie ${state.special?.dracoEnergyByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "mythologie") return { value: Number(state.special?.mythTrialByPlayer?.[playerId] || 0), label: "ÉPREUVES", sub: `${state.special?.mythTrialByPlayer?.[playerId] || 0}/${MYTH_GODS.length} · faveur ${state.special?.mythFavorByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "jardinier") return { value: Number(state.special?.gardenHarvestByPlayer?.[playerId] || 0), label: "RÉCOLTES", sub: `croissance ${Math.round(Number(state.special?.gardenGrowthByPlayer?.[playerId] || 0))}% · eau ${state.special?.gardenWaterByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "microscopia") return { value: Number(state.special?.microSamplesByPlayer?.[playerId] || 0), label: "ÉCHANT.", sub: `qualité ${state.special?.microQualityByPlayer?.[playerId] || 0} · contamination ${state.special?.microContaminationByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "disjoncte") return { value: Number(state.special?.circuitStepByPlayer?.[playerId] || 0), label: "CIRCUITS", sub: `${state.special?.circuitStepByPlayer?.[playerId] || 0}/${CIRCUIT_NAMES.length} · surcharge ${state.special?.circuitOverloadByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "petit_bac") return { value: Number(state.special?.bacValidatedByPlayer?.[playerId] || 0), label: "CATÉG.", sub: `${state.special?.bacStepByPlayer?.[playerId] || 0}/${BAC_CATEGORIES.length} validées` };
  if (state.modeId === "mont_blanc" || state.modeId === "everest") {
    const altitude = Math.round(Number(state.special?.ascentAltitudeByPlayer?.[playerId] || 0));
    const summit = ascentSummitAltitude(state.modeId);
    return { value: altitude, label: "ALTITUDE", sub: `${altitude}/${summit} m · fatigue ${Math.round(Number(state.special?.ascentFatigueByPlayer?.[playerId] || 0))}% · oxy ${Math.round(Number(state.special?.ascentOxygenByPlayer?.[playerId] || 0))}%` };
  }
  if (state.modeId === "summit_14") {
    const peak = Number(state.special?.summit14PeakByPlayer?.[playerId] || 0);
    const marks = Number(state.special?.summit14MarksByPlayer?.[playerId] || 0);
    return { value: peak, label: "SOMMETS", sub: `${peak}/14 · progression ${marks} · fatigue ${Math.round(Number(state.special?.ascentFatigueByPlayer?.[playerId] || 0))}%` };
  }
  if (CONQUEST_PROFILES[state.modeId]) {
    const profile = CONQUEST_PROFILES[state.modeId];
    const actor = conquestActor(state, playerId);
    const controlled = conquestControlledCount(state, actor);
    return { value: controlled, label: "TERRITOIRES", sub: `${controlled}/${conquestVictoryGoal(state)} · ${profile.resource.toLowerCase()} ${Math.round(Number(state.special?.conquestResourceByPlayer?.[playerId] || 0))}%` };
  }
  if (state.modeId === "cheval_de_troie") return { value: Number(state.special?.trojanPhaseByPlayer?.[playerId] || 0), label: "PHASES", sub: `${state.special?.trojanPhaseByPlayer?.[playerId] || 0}/${TROJAN_PHASES.length} · alerte ${state.special?.trojanAlertByPlayer?.[playerId] || 0}%` };
  if (state.modeId === "hot_potato") return { value: Number(state.lives[playerId] || 0), label: "VIES", sub: `${state.special?.hotPotatoPassesByPlayer?.[playerId] || 0} passe(s) · ${state.special?.hotPotatoExplosionsByPlayer?.[playerId] || 0} explosion(s)` };
  if (state.modeId === "zombie_siege") return { value: Number(state.special?.zombieInfectionByPlayer?.[playerId] || 0), label: state.special?.zombieRoleByPlayer?.[playerId] === "ZOMBIE" ? "ZOMBIE" : "INFECTION", sub: `${state.special?.zombieBarricadeByPlayer?.[playerId] || 0}% barricade` };
  if (state.modeId === "le_loup") return { value: state.special?.loupId === playerId ? 1 : Number(state.lives[playerId] || 0), label: state.special?.loupId === playerId ? "LOUP" : "VIES", sub: `${state.special?.loupCaughtByPlayer?.[playerId] || 0} capture(s) · fuite ${Math.round(Number(state.progress[playerId] || 0))}` };
  if (state.modeId === "eperviers") return { value: Math.round(Number(state.special?.epervierCrossingByPlayer?.[playerId] || 0)), label: state.special?.epervierRoleByPlayer?.[playerId] === "HAWK" ? "ÉPERVIER" : "TRAVERSÉE", sub: `${Math.round(Number(state.special?.epervierCrossingByPlayer?.[playerId] || 0))}/${modeOptionNumber(state.config, "crossingGoal", 100, 50, 200)} · ${state.special?.epervierCaughtByPlayer?.[playerId] || 0} capture(s)` };
  if (state.modeId === "ballon_prisonnier") return { value: Math.round(Number(state.health[playerId] || 0)), label: state.special?.dodgePrisonerByPlayer?.[playerId] ? "PRISON" : "PV", sub: `${state.special?.dodgeHitsByPlayer?.[playerId] || 0} touche(s) · bouclier ${state.special?.dodgeShieldByPlayer?.[playerId] || 0}` };
  if (state.modeId === "iceberg") return { value: Math.round(Number(state.special?.icebergHullByPlayer?.[playerId] || 0)), label: "COQUE", sub: `${state.special?.icebergCompartmentsByPlayer?.[playerId] || 0}/${modeOptionNumber(state.config, "compartmentGoal", ICEBERG_COMPARTMENTS, 2, 10)} compartiments · eau ${Math.round(Number(state.special?.icebergFloodByPlayer?.[playerId] || 0))}%` };
  if (state.modeId === "jurassic_dart") return { value: Math.round(Number(state.special?.jurassicProgressByPlayer?.[playerId] || 0)), label: "EXPÉDITION", sub: `menace ${Math.round(Number(state.special?.jurassicThreatByPlayer?.[playerId] || 0))}% · sécurité ${Math.round(Number(state.special?.jurassicSecurityByPlayer?.[playerId] || 0))}%` };
  if (state.modeId === "apocalypse") return { value: Math.round(Number(state.special?.apocalypseRefugeByPlayer?.[playerId] || 0)), label: "REFUGE", sub: `${Math.round(Number(state.special?.apocalypseRefugeByPlayer?.[playerId] || 0))}/${modeOptionNumber(state.config, "refugeGoal", 100, 50, 150)} · ${state.special?.apocalypseResourcesByPlayer?.[playerId] || 0} ressources · menace ${Math.round(Number(state.special?.apocalypseThreatByPlayer?.[playerId] || 0))}%` };
  if (state.modeId === "mistigri") return { value: Number(state.lives[playerId] || 0), label: state.special?.mistigriHolderId === playerId ? "MISTIGRI" : "VIES", sub: `${state.special?.mistigriPairsByPlayer?.[playerId] || 0} paire(s) · danger ${state.special?.mistigriDangerByPlayer?.[playerId] || 0}/${modeOptionNumber(state.config, "dangerThreshold", 3, 2, 6)} · bouclier ${state.special?.mistigriShieldByPlayer?.[playerId] || 0}` };
  if (state.modeId === "radin") return { value: Math.round(Number(state.special?.radinWalletByPlayer?.[playerId] || 0)), label: "CAISSE", sub: `${Math.round(Number(state.special?.radinWalletByPlayer?.[playerId] || 0))}/${modeOptionNumber(state.config, "targetWallet", 250, 100, 1000)} · dépensé ${state.special?.radinSpentByPlayer?.[playerId] || 0} · gagné ${state.special?.radinEarnedByPlayer?.[playerId] || 0}` };
  if (state.modeId === "corbeau_renard") return { value: Number(state.special?.fableCheeseByPlayer?.[playerId] || 0), label: String(state.special?.fableRoleByPlayer?.[playerId] || "CORBEAU"), sub: `fromage ${state.special?.fableCheeseByPlayer?.[playerId] || 0}/${modeOptionNumber(state.config, "cheeseGoal", 6, 3, 12)} · ruse ${state.special?.fableMeterByPlayer?.[playerId] || 0}/${modeOptionNumber(state.config, "fableThreshold", 5, 3, 9)} · garde ${state.special?.fableGuardByPlayer?.[playerId] || 0}` };
  if (state.modeId === "darts_impossible") return { value: Number(state.special?.impossibleStepByPlayer?.[playerId] || 0), label: "MISSIONS", sub: `${state.special?.impossibleStepByPlayer?.[playerId] || 0}/${modeOptionNumber(state.config, "missionCount", state.special?.impossibleContracts?.length || 10, 6, 18)} · alarme ${Math.round(Number(state.special?.impossibleAlarmByPlayer?.[playerId] || 0))}% · échecs ${state.special?.impossibleFailsByPlayer?.[playerId] || 0}` };
  if (state.modeId === "knockback") return { value: Math.round(Number(state.scores[playerId] || 0)), label: "SCORE", sub: `${Math.round(Number(state.scores[playerId] || 0))}/${state.config.goal}` };
  if (state.modeId === "spartacus") return { value: Math.round(Number(state.health[playerId] || 0)), label: "PV", sub: `armure ${state.special?.spartacusArmorByPlayer?.[playerId] || 0} · gloire ${state.special?.spartacusGloryByPlayer?.[playerId] || 0}` };
  if (state.modeId === "cosmo_knights") return { value: Math.round(Number(state.health[playerId] || 0)), label: "PV", sub: `Cosmos ${Math.round(Number(state.special?.cosmoChargeByPlayer?.[playerId] || 0))}% · bouclier ${state.special?.cosmoShieldByPlayer?.[playerId] || 0}` };
  if (state.modeId === "tug_rush") return { value: Number(state.special?.tugContributionByPlayer?.[playerId] || 0), label: "TRACTION", sub: `Camp ${state.special?.tugSideByPlayer?.[playerId] || "A"} · corde ${Math.round(Number(state.special?.tugPosition || 0))}` };
  if (state.modeId === "un_deux_trois_soleil") return { value: Math.round(Number(state.progress[playerId] || 0)), label: "PAS", sub: `${state.special?.soleilFallsByPlayer?.[playerId] || 0} faute(s)` };
  if (state.modeId === "chat_souris") return { value: Math.round(Number(state.special?.chatSourisPosByPlayer?.[playerId] || 0)), label: state.special?.chatSourisRoleByPlayer?.[playerId] === "CAT" ? "CHAT" : "SOURIS", sub: state.special?.chatSourisCaughtByPlayer?.[playerId] ? "CAPTURÉE" : `${Math.round(Number(state.special?.chatSourisPosByPlayer?.[playerId] || 0))}/${state.config.goal}` };
  if (state.modeId === "maze_chase") return { value: Math.round(Number(state.special?.mazePosByPlayer?.[playerId] || 0)), label: "LABY", sub: `power ${state.special?.mazePowerByPlayer?.[playerId] || 0} · ghost ${Math.round(Number(state.special?.mazeGhostByPlayer?.[playerId] ?? -6))}` };
  if (state.modeId === "chien_chat") return { value: Math.round(Number(state.special?.chienChatPosByPlayer?.[playerId] || 0)), label: state.special?.chienChatRoleByPlayer?.[playerId] === "CAT" ? "CHAT" : "CHIEN", sub: `${Math.round(Number(state.special?.chienChatPosByPlayer?.[playerId] || 0))}/${state.config.goal}` };
  if (state.modeId === "roller_coaster") return { value: Math.round(Number(state.special?.rollerPosByPlayer?.[playerId] || 0)), label: "PISTE", sub: `vitesse ${Math.round(Number(state.special?.rollerSpeedByPlayer?.[playerId] || 0))}%` };
  if (state.modeId === "athletisme") return { value: Math.round(Number(state.scores[playerId] || 0)), label: "MEETING", sub: `${currentAthleticsDiscipline(state)} · ${Object.keys(state.special?.athleticsResultsByPlayer?.[playerId] || {}).length}/6` };
  if (state.modeId === "chute_libre") return { value: Math.round(Number(state.special?.freefallAltitudeByPlayer?.[playerId] || 0)), label: "ALTITUDE", sub: state.special?.freefallCrashedByPlayer?.[playerId] ? "CRASH" : state.special?.freefallChuteByPlayer?.[playerId] ? "PARACHUTE OUVERT" : "CHUTE LIBRE" };
  if (state.modeId === "tyrolien") return { value: Math.round(Number(state.special?.tyrolienPosByPlayer?.[playerId] || 0)), label: "CÂBLE", sub: `vitesse ${Math.round(Number(state.special?.tyrolienSpeedByPlayer?.[playerId] || 0))}%` };
  if (state.modeId === "saut_a_la_corde") return { value: Math.round(Number(state.progress[playerId] || 0)), label: "SAUTS", sub: `combo ${state.special?.ropeComboByPlayer?.[playerId] || 0} · rythme ${state.special?.ropePaceByPlayer?.[playerId] || 1}` };
  if (state.modeId === "replicat") return { value: Number(state.progress[playerId] || 0), label: "COPIES", sub: `${state.scores[playerId] || 0} pts · ${stats.hits || 0} exacts` };
  if (state.modeId === "shove_a_penny") {
    const maxMarks = SHOVE_TARGETS.length * modeOptionNumber(state.config, "marksPerBox", 3, 2, 5);
    return { value: Number(state.progress[playerId] || 0), label: "MARQUES", sub: `${state.progress[playerId] || 0}/${maxMarks} · ${state.scores[playerId] || 0} pts` };
  }
  if (state.modeId === "green_vs_red") {
    const finishSteps = modeOptionNumber(state.config, "finishSteps", 10, 3, 10);
    return { value: Number(state.progress[playerId] || 0), label: "ÉTAPES", sub: `${state.special?.greenRedColorByPlayer?.[playerId] || "RED"} · /${finishSteps}` };
  }
  if (state.modeId === "sniper") return { value: Number(state.progress[playerId] || 0), label: "MISSIONS", sub: `${state.progress[playerId] || 0}/${state.config.goal || 12}` };
  if (state.modeId === "luciole") return { value: Number(state.progress[playerId] || 0), label: "LUCIOLES", sub: `${state.progress[playerId] || 0}/${state.config.goal || 10}` };
  if (state.modeId === "golden_dart") return { value: Number(state.progress[playerId] || 0), label: "OR", sub: `${state.progress[playerId] || 0}/${state.config.goal || 7}` };
  if (state.modeId === "nine_dart_century") return { value: Number(state.scores[playerId] || 0), label: "PTS", sub: `${Math.min(9, stats.darts)} darts · ${state.special?.centuryBustsByPlayer?.[playerId] || 0} bust` };
  if (state.family === "score") return { value: Number(state.scores[playerId] || 0), label: "PTS", sub: `best ${stats.bestVisit}` };
  if (state.family === "survival") return { value: Number(state.health[playerId] || 0), label: "PV", sub: `${state.lives[playerId] || 0} vie(s) · ${state.scores[playerId] || 0} pts` };
  if (state.family === "combat") return { value: Number(state.health[playerId] || 0), label: "PV", sub: `${stats.damage || 0} dégâts` };
  return { value: Math.round(Number(state.progress[playerId] || 0)), label: "PROG", sub: `${state.scores[playerId] || 0} pts · ${stats.hits || 0} hits` };
}
