// @ts-nocheck
// =============================================================
// CRADOS — moteur pur SOLO + ÉQUIPES
// - Joueurs : crasse / secteurs / élimination par joueur.
// - Équipes : crasse / secteurs / élimination partagés par équipe,
//   tandis que les membres jouent à tour de rôle et gardent leurs stats.
// =============================================================
import type { GameDart, Player } from "../types-game";

export type CradosBotLevel = "easy" | "normal" | "hard";
export type CradosBotStrength = CradosBotLevel | number;
export type CradosTeamConfig = {
  id: string;
  name: string;
  color?: string | null;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
  isCradosFamily?: boolean;
};
export type CradosConfigPayload = {
  mode: "crados";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: CradosBotLevel;
  participantMode?: "players" | "teams";
  gameMode?: "players" | "teams";
  teamsSourceMode?: "manual" | "saved" | "auto";
  teams?: CradosTeamConfig[];
  familyTeamIds?: string[];
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  rules: {
    dirtLimit: 10 | 15 | 20;
    layersToOwn: 2 | 3 | 4;
    bullWash: boolean;
    stealMode: "block" | "flip";
  };
};
export type CradosSector = { ownerId: string | null; claimantId: string | null; layers: number };
export type CradosPlayerStats = { darts: number; visits: number; layersPlaced: number; sectorsClaimed: number; sectorsStolen: number; dirtTaken: number; dirtWashed: number; legsWon: number };
export type CradosVisit = { id: string; playerId: string; sideId?: string; teamId?: string | null; leg: number; turn: number; darts: GameDart[]; events: string[]; dirtBefore: number; dirtAfter: number };
export type CradosState = {
  sport: "darts";
  mode: "crados";
  config: CradosConfigPayload;
  players: Player[];
  dirt: Record<string, number>;
  eliminated: Record<string, boolean>;
  sectors: Record<number, CradosSector>;
  legWins: Record<string, number>;
  statsByPlayer: Record<string, CradosPlayerStats>;
  activePlayerIndex: number;
  legIndex: number;
  turnIndex: number;
  phase: "playing" | "finished";
  winnerId: string | null;
  lastLegWinnerId: string | null;
  visits: CradosVisit[];
  startedAt: number;
  finishedAt?: number;
};

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function id(p = "crados") { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function blankStats(): CradosPlayerStats { return { darts: 0, visits: 0, layersPlaced: 0, sectorsClaimed: 0, sectorsStolen: 0, dirtTaken: 0, dirtWashed: 0, legsWon: 0 }; }
function power(d: GameDart) { return d?.bed === "T" ? 3 : d?.bed === "D" ? 2 : 1; }
function numberOf(d: GameDart) { return d?.bed === "S" || d?.bed === "D" || d?.bed === "T" ? Number(d.number || 0) : 0; }
function unique(values: any[]) { return Array.from(new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))); }
function blankSectors() { const o: any = {}; for (let n = 1; n <= 20; n += 1) o[n] = { ownerId: null, claimantId: null, layers: 0 }; return o; }

function normalizeTeams(raw: any): CradosTeamConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((team: any, index: number) => ({
    id: String(team?.id || `crados_team_${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color ?? null,
    logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? null,
    playerIds: unique(team?.playerIds || []),
    isBotTeam: Boolean(team?.isBotTeam),
    isCradosFamily: Boolean(team?.isCradosFamily),
  })).filter((team: CradosTeamConfig) => team.playerIds.length > 0);
}

export function normalizeCradosConfig(raw: any): CradosConfigPayload {
  const r = raw?.rules || {};
  const ids = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  const teams = normalizeTeams(raw?.teams);
  const teamMode = (raw?.participantMode === "teams" || raw?.gameMode === "teams") && teams.length >= 2;
  return {
    mode: "crados",
    selectedIds: ids,
    players: Math.max(2, Number(raw?.players || ids.length || 2)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    participantMode: teamMode ? "teams" : "players",
    gameMode: teamMode ? "teams" : "players",
    teamsSourceMode: raw?.teamsSourceMode === "saved" || raw?.teamsSourceMode === "auto" ? raw.teamsSourceMode : "manual",
    teams: teamMode ? teams : [],
    familyTeamIds: Array.isArray(raw?.familyTeamIds) ? raw.familyTeamIds.map(String) : [],
    randomOrder: raw?.randomOrder !== false,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    seriesWins: raw?.seriesWins === 2 || raw?.seriesWins === 3 ? raw.seriesWins : 1,
    rules: {
      dirtLimit: r?.dirtLimit === 15 || r?.dirtLimit === 20 ? r.dirtLimit : 10,
      layersToOwn: r?.layersToOwn === 2 || r?.layersToOwn === 4 ? r.layersToOwn : 3,
      bullWash: r?.bullWash !== false,
      stealMode: r?.stealMode === "flip" ? "flip" : "block",
    },
  };
}

export function isCradosTeamMode(configOrState: any): boolean {
  const cfg = configOrState?.config || configOrState || {};
  return (cfg?.participantMode === "teams" || cfg?.gameMode === "teams") && Array.isArray(cfg?.teams) && cfg.teams.length >= 2;
}

export function cradosTeamForPlayer(configOrState: any, playerIdRaw: any): CradosTeamConfig | null {
  const cfg = configOrState?.config || configOrState || {};
  const playerId = String(playerIdRaw || "");
  if (!playerId || !Array.isArray(cfg?.teams)) return null;
  return cfg.teams.find((team: any) => Array.isArray(team?.playerIds) && team.playerIds.map(String).includes(playerId)) || null;
}

export function cradosSideIdForPlayer(configOrState: any, playerIdRaw: any): string {
  const playerId = String(playerIdRaw || "");
  if (!isCradosTeamMode(configOrState)) return playerId;
  return String(cradosTeamForPlayer(configOrState, playerId)?.id || playerId);
}

export function cradosSideName(configOrState: any, sideIdRaw: any): string {
  const cfg = configOrState?.config || configOrState || {};
  const sideId = String(sideIdRaw || "");
  if (isCradosTeamMode(cfg)) {
    const team = (cfg.teams || []).find((row: any) => String(row?.id || "") === sideId);
    if (team) return String(team.name || "Équipe");
  }
  const state = configOrState?.players ? configOrState : null;
  const player = state?.players?.find((row: any) => String(row?.id || "") === sideId);
  return String(player?.name || "Joueur");
}

export function cradosSideIds(configOrState: any, playersRaw?: Player[]): string[] {
  const cfg = configOrState?.config || configOrState || {};
  const players = playersRaw || configOrState?.players || [];
  if (isCradosTeamMode(cfg)) return unique((cfg.teams || []).map((team: any) => team.id));
  return unique((players || []).map((player: any) => player.id));
}

function sideEliminated(s: CradosState, playerId: string) { return Boolean(s.eliminated[cradosSideIdForPlayer(s, playerId)]); }
function aliveSideIds(s: CradosState) { return cradosSideIds(s).filter((sideId) => !s.eliminated[sideId]); }

function playerIndexById(s: CradosState, playerIdRaw: any): number {
  const playerId = String(playerIdRaw || "");
  return s.players.findIndex((player: any) => String(player?.id || "") === playerId);
}

function nextTeamPlayerIndex(s: CradosState, from: number): number {
  const current = s.players[from];
  const teams = Array.isArray(s.config?.teams) ? s.config.teams : [];
  if (!current || teams.length < 2) return from;
  const currentTeam = cradosTeamForPlayer(s, current.id);
  const currentTeamIndex = Math.max(0, teams.findIndex((team: any) => String(team?.id || "") === String(currentTeam?.id || "")));
  const currentLeg = s.legIndex + 1;

  // Le tour passe d'abord à l'équipe suivante, puis au membre suivant de cette équipe.
  // Cela garde une vraie alternance d'équipes même si des équipes enregistrées
  // n'ont pas exactement le même nombre de membres (comportement attendu façon X01).
  for (let step = 1; step <= teams.length; step += 1) {
    const team = teams[(currentTeamIndex + step) % teams.length];
    const teamId = String(team?.id || "");
    if (!teamId || s.eliminated[teamId]) continue;
    const memberIds = unique(team?.playerIds || []).filter((playerId) => playerIndexById(s, playerId) >= 0);
    if (!memberIds.length) continue;
    const visitsAlreadyPlayed = s.visits.filter((visit: any) => visit.leg === currentLeg && String(visit.teamId || visit.sideId || "") === teamId).length;
    const nextMemberId = memberIds[visitsAlreadyPlayed % memberIds.length];
    const nextIndex = playerIndexById(s, nextMemberId);
    if (nextIndex >= 0) return nextIndex;
  }
  return from;
}

function nextAliveIndex(s: CradosState, from: number) {
  if (isCradosTeamMode(s)) return nextTeamPlayerIndex(s, from);
  for (let k = 1; k <= s.players.length; k += 1) {
    const i = (from + k) % s.players.length;
    const p = s.players[i];
    if (p && !sideEliminated(s, String(p.id))) return i;
  }
  return from;
}

function resetLeg(s: CradosState, starter: number) {
  s.legIndex += 1;
  s.turnIndex = 0;
  const sides = cradosSideIds(s);
  s.dirt = Object.fromEntries(sides.map((sideId) => [sideId, 0]));
  s.eliminated = Object.fromEntries(sides.map((sideId) => [sideId, false]));
  s.sectors = blankSectors();
  if (isCradosTeamMode(s)) {
    const teams = s.config.teams || [];
    const starterTeam = teams.length ? teams[s.legIndex % teams.length] : null;
    const starterPlayerId = unique(starterTeam?.playerIds || [])[0];
    const teamStarterIndex = playerIndexById(s, starterPlayerId);
    s.activePlayerIndex = teamStarterIndex >= 0 ? teamStarterIndex : 0;
  } else {
    s.activePlayerIndex = Math.max(0, Math.min(s.players.length - 1, starter));
  }
  s.phase = "playing";
}

function winLeg(s: CradosState, winnerSideId: string) {
  s.lastLegWinnerId = winnerSideId;
  s.legWins[winnerSideId] = Number(s.legWins[winnerSideId] || 0) + 1;
  if (isCradosTeamMode(s)) {
    const team = (s.config.teams || []).find((row: any) => String(row.id) === String(winnerSideId));
    for (const playerId of team?.playerIds || []) {
      if (s.statsByPlayer[playerId]) s.statsByPlayer[playerId].legsWon += 1;
    }
  } else if (s.statsByPlayer[winnerSideId]) {
    s.statsByPlayer[winnerSideId].legsWon += 1;
  }
  if (s.legWins[winnerSideId] >= s.config.seriesWins) {
    s.phase = "finished";
    s.winnerId = winnerSideId;
    s.finishedAt = Date.now();
    return s;
  }
  const starter = s.players.length ? (s.activePlayerIndex + 1) % s.players.length : 0;
  resetLeg(s, starter);
  return s;
}

export function createCradosState(players: Player[], rawConfig: any): CradosState {
  const c = normalizeCradosConfig(rawConfig);
  const ps = (players || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const sides = cradosSideIds(c, ps);
  const initialTeamPlayerId = isCradosTeamMode(c) ? unique(c.teams?.[0]?.playerIds || [])[0] : null;
  const initialTeamPlayerIndex = initialTeamPlayerId ? ps.findIndex((player: any) => String(player.id) === String(initialTeamPlayerId)) : -1;
  return {
    sport: "darts",
    mode: "crados",
    config: c,
    players: ps,
    dirt: Object.fromEntries(sides.map((sideId) => [sideId, 0])),
    eliminated: Object.fromEntries(sides.map((sideId) => [sideId, false])),
    sectors: blankSectors(),
    legWins: Object.fromEntries(sides.map((sideId) => [sideId, 0])),
    statsByPlayer: Object.fromEntries(ps.map((p) => [p.id, blankStats()])),
    activePlayerIndex: initialTeamPlayerIndex >= 0 ? initialTeamPlayerIndex : 0,
    legIndex: 0,
    turnIndex: 0,
    phase: "playing",
    winnerId: null,
    lastLegWinnerId: null,
    visits: [],
    startedAt: Date.now(),
  };
}

export function cloneCradosState(s: CradosState): CradosState { return clone(s); }

export function playCradosVisit(input: CradosState, dartsRaw: GameDart[]): CradosState {
  const s = cloneCradosState(input);
  if (s.phase !== "playing") return s;
  const p = s.players[s.activePlayerIndex];
  if (!p) return s;
  const playerId = String(p.id);
  const sideId = cradosSideIdForPlayer(s, playerId);
  const sideName = cradosSideName(s, sideId);
  const team = cradosTeamForPlayer(s, playerId);
  const ds = (dartsRaw || []).slice(0, 3);
  const st = s.statsByPlayer[playerId] || (s.statsByPlayer[playerId] = blankStats());
  const before = Number(s.dirt[sideId] || 0);
  const events: string[] = [];
  st.visits += 1;

  for (const d of ds) {
    st.darts += 1;
    if (!d || d.bed === "MISS") continue;
    if (d.bed === "OB" || d.bed === "IB") {
      if (s.config.rules.bullWash) {
        const wash = d.bed === "IB" ? 3 : 1;
        const old = Number(s.dirt[sideId] || 0);
        const next = Math.max(0, old - wash);
        const done = old - next;
        s.dirt[sideId] = next;
        st.dirtWashed += done;
        events.push(`${d.bed === "IB" ? "DBULL" : "BULL"} DOUCHE : −${done} crasse${isCradosTeamMode(s) ? ` pour ${sideName}` : ""}`);
      }
      continue;
    }

    const n = numberOf(d);
    if (!n) continue;
    const pow = power(d);
    const sec = s.sectors[n] || (s.sectors[n] = { ownerId: null, claimantId: null, layers: 0 });

    if (!sec.ownerId) {
      if (sec.claimantId === sideId) sec.layers += pow;
      else { sec.claimantId = sideId; sec.layers = pow; }
      st.layersPlaced += pow;
      if (sec.layers >= s.config.rules.layersToOwn) {
        sec.layers = s.config.rules.layersToOwn;
        sec.ownerId = sideId;
        sec.claimantId = sideId;
        st.sectorsClaimed += 1;
        events.push(`N°${n} devient CRADO pour ${sideName}`);
      } else events.push(`N°${n} : ${sec.layers}/${s.config.rules.layersToOwn} couches pour ${sideName}`);
      continue;
    }

    if (sec.ownerId === sideId) {
      events.push(`N°${n} est déjà à ${sideName}`);
      continue;
    }

    if (s.config.rules.stealMode === "flip") {
      const oldOwner = sec.ownerId;
      sec.layers -= pow;
      if (sec.layers <= 0) {
        const overflow = Math.abs(sec.layers);
        sec.ownerId = sideId;
        sec.claimantId = sideId;
        sec.layers = Math.min(s.config.rules.layersToOwn, 1 + overflow);
        st.sectorsStolen += 1;
        events.push(`N°${n} VOLÉ à ${cradosSideName(s, oldOwner)}`);
      } else events.push(`N°${n} attaqué : ${sec.layers} couche${sec.layers > 1 ? "s" : ""}`);
      s.dirt[sideId] = Number(s.dirt[sideId] || 0) + 1;
      st.dirtTaken += 1;
      events.push(`Contact avec la crasse adverse : +1 CRASSE${isCradosTeamMode(s) ? ` à ${sideName}` : ""}`);
    } else {
      s.dirt[sideId] = Number(s.dirt[sideId] || 0) + pow;
      st.dirtTaken += pow;
      events.push(`N°${n} adverse : +${pow} CRASSE${isCradosTeamMode(s) ? ` à ${sideName}` : ""}`);
    }

    if (Number(s.dirt[sideId] || 0) >= s.config.rules.dirtLimit) {
      s.dirt[sideId] = s.config.rules.dirtLimit;
      s.eliminated[sideId] = true;
      events.push(`${sideName} est trop CRADO : ${isCradosTeamMode(s) ? "équipe éliminée" : "éliminé"}`);
      break;
    }
  }

  s.visits.push({
    id: id("crados-visit"),
    playerId,
    sideId,
    teamId: team?.id || null,
    leg: s.legIndex + 1,
    turn: s.turnIndex + 1,
    darts: ds,
    events,
    dirtBefore: before,
    dirtAfter: Number(s.dirt[sideId] || 0),
  });
  s.turnIndex += 1;

  const alive = aliveSideIds(s);
  if (alive.length === 1) return winLeg(s, alive[0]);
  s.activePlayerIndex = nextAliveIndex(s, s.activePlayerIndex);
  return s;
}

function strengthValue(level: CradosBotStrength) {
  if (typeof level === "number" && Number.isFinite(level)) return Math.max(1, Math.min(5, level));
  return level === "hard" ? 4 : level === "easy" ? 2 : 3;
}
function chance(level: CradosBotStrength) { const v = strengthValue(level); return Math.max(.42, Math.min(.88, .34 + v * .105)); }
function bedForStrength(level: CradosBotStrength) { const v = strengthValue(level), r = Math.random(); const triple = .025 + v * .055, double = .07 + v * .045; return r < triple ? "T" : r < triple + double ? "D" : "S"; }

export function pickCradosBotDarts(s: CradosState, level: CradosBotStrength = "normal"): GameDart[] {
  const p = s.players[s.activePlayerIndex];
  if (!p) return [];
  const sideId = cradosSideIdForPlayer(s, p.id);
  const skill = chance(level);
  if (s.config.rules.bullWash && Number(s.dirt[sideId] || 0) >= s.config.rules.dirtLimit * .6 && Math.random() < skill * .45) {
    return [{ bed: Math.random() < skill * .35 ? "IB" : "OB" }, { bed: "S", number: 1 + Math.floor(Math.random() * 20) }, { bed: "S", number: 1 + Math.floor(Math.random() * 20) }];
  }
  const sectors = Object.entries(s.sectors);
  const enemy = sectors.filter(([, x]: any) => x.ownerId && x.ownerId !== sideId).map(([n]) => Number(n));
  const free = sectors.filter(([, x]: any) => !x.ownerId).map(([n]) => Number(n));
  const own = sectors.filter(([, x]: any) => x.ownerId === sideId).map(([n]) => Number(n));
  const pool = s.config.rules.stealMode === "flip" && enemy.length ? enemy : free.length ? free : own.length ? own : Array.from({ length: 20 }, (_, i) => i + 1);
  return Array.from({ length: 3 }, () => {
    if (Math.random() > skill) return { bed: Math.random() < Math.max(.035, .17 - strengthValue(level) * .025) ? "MISS" : "S", number: 1 + Math.floor(Math.random() * 20) } as GameDart;
    return { bed: bedForStrength(level), number: pool[Math.floor(Math.random() * pool.length)] || 20 } as GameDart;
  });
}
