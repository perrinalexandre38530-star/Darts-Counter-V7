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
    sectorRaceMode: "claim" | "race";
    cleanBullSplash: boolean;
  };
};
export type CradosSector = { ownerId: string | null; claimantId: string | null; layers: number; pressureBySide?: Record<string, number> };
export type CradosPlayerStats = {
  darts: number;
  visits: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  hits: number;
  layersPlaced: number;
  sectorsClaimed: number;
  sectorsStolen: number;
  dirtTaken: number;
  dirtWashed: number;
  dirtInflicted: number;
  bullSplashInflicted: number;
  freeSectorHits: number;
  ownSectorHits: number;
  opponentSectorHits: number;
  cleanVisits: number;
  dirtyVisits: number;
  maxDirt: number;
  bestVisitImpact: number;
  eliminationsCaused: number;
  legsWon: number;
};
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
function blankStats(): CradosPlayerStats {
  return {
    darts: 0,
    visits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbulls: 0,
    misses: 0,
    hits: 0,
    layersPlaced: 0,
    sectorsClaimed: 0,
    sectorsStolen: 0,
    dirtTaken: 0,
    dirtWashed: 0,
    dirtInflicted: 0,
    bullSplashInflicted: 0,
    freeSectorHits: 0,
    ownSectorHits: 0,
    opponentSectorHits: 0,
    cleanVisits: 0,
    dirtyVisits: 0,
    maxDirt: 0,
    bestVisitImpact: 0,
    eliminationsCaused: 0,
    legsWon: 0,
  };
}
function power(d: GameDart) { return d?.bed === "T" ? 3 : d?.bed === "D" ? 2 : 1; }
function numberOf(d: GameDart) { return d?.bed === "S" || d?.bed === "D" || d?.bed === "T" ? Number(d.number || 0) : 0; }
function unique(values: any[]) { return Array.from(new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))); }
function blankSectors() { const o: any = {}; for (let n = 1; n <= 20; n += 1) o[n] = { ownerId: null, claimantId: null, layers: 0, pressureBySide: {} }; return o; }
function leadingPressureSide(sec: any) {
  const entries = Object.entries(sec?.pressureBySide || {}).map(([sideId, raw]) => [String(sideId), Number(raw || 0)] as const).filter(([, value]) => value > 0);
  if (!entries.length) return { sideId: null, value: 0 };
  entries.sort((a, b) => b[1] - a[1]);
  return { sideId: entries[0][0], value: entries[0][1] };
}

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
      sectorRaceMode: r?.sectorRaceMode === "race" ? "race" : "claim",
      cleanBullSplash: r?.cleanBullSplash === true,
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
      if (s.statsByPlayer[playerId]) s.statsByPlayer[playerId].legsWon = Number(s.statsByPlayer[playerId].legsWon || 0) + 1;
    }
  } else if (s.statsByPlayer[winnerSideId]) {
    s.statsByPlayer[winnerSideId].legsWon = Number(s.statsByPlayer[winnerSideId].legsWon || 0) + 1;
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
  const st = s.statsByPlayer[playerId] = { ...blankStats(), ...(s.statsByPlayer[playerId] || {}) };
  const before = Number(s.dirt[sideId] || 0);
  const events: string[] = [];
  let visitImpact = 0;
  st.visits += 1;

  const markElimination = (targetSideIdRaw: any, messages: string[] = events) => {
    const targetSideId = String(targetSideIdRaw || "");
    if (!targetSideId) return;
    const limit = Number(s.config.rules.dirtLimit || 10);
    if (Number(s.dirt[targetSideId] || 0) < limit || s.eliminated[targetSideId]) return;
    s.dirt[targetSideId] = limit;
    s.eliminated[targetSideId] = true;
    const targetName = cradosSideName(s, targetSideId);
    messages.push(`${targetName} est trop CRADO : ${isCradosTeamMode(s) ? "équipe éliminée" : "éliminé"}`);
  };

  const addDirt = (targetSideIdRaw: any, amountRaw: any, messages: string[] = events, reason = "") => {
    const targetSideId = String(targetSideIdRaw || "");
    const amount = Math.max(0, Number(amountRaw || 0));
    if (!targetSideId || amount <= 0 || s.eliminated[targetSideId]) return 0;
    const limit = Number(s.config.rules.dirtLimit || 10);
    const prev = Number(s.dirt[targetSideId] || 0);
    const next = Math.min(limit, prev + amount);
    const delta = next - prev;
    const wasEliminated = Boolean(s.eliminated[targetSideId]);
    s.dirt[targetSideId] = next;
    if (delta > 0 && targetSideId === sideId) st.dirtTaken += delta;
    if (delta > 0 && targetSideId !== sideId) st.dirtInflicted += delta;
    if (delta > 0 && reason) messages.push(reason.replace(/__VALUE__/g, String(delta)));
    markElimination(targetSideId, messages);
    if (!wasEliminated && s.eliminated[targetSideId] && targetSideId !== sideId) st.eliminationsCaused += 1;
    return delta;
  };

  for (const d of ds) {
    st.darts += 1;
    if (!d || d.bed === "MISS") {
      st.misses += 1;
      continue;
    }

    st.hits += 1;
    if (d.bed === "OB" || d.bed === "IB") {
      if (d.bed === "IB") st.dbulls += 1;
      else st.bulls += 1;
      visitImpact += d.bed === "IB" ? 3 : 1;
      const wash = d.bed === "IB" ? 3 : 1;
      const shooterWasClean = Number(s.dirt[sideId] || 0) <= 0;
      if (s.config.rules.bullWash) {
        const old = Number(s.dirt[sideId] || 0);
        const next = Math.max(0, old - wash);
        const done = old - next;
        s.dirt[sideId] = next;
        st.dirtWashed += done;
        events.push(`${d.bed === "IB" ? "DBULL" : "BULL"} DOUCHE : −${done} crasse${isCradosTeamMode(s) ? ` pour ${sideName}` : ""}`);
      }
      if (s.config.rules.cleanBullSplash && shooterWasClean) {
        const touched: string[] = [];
        let splashTotal = 0;
        for (const enemySideId of cradosSideIds(s)) {
          if (String(enemySideId) === sideId || s.eliminated[enemySideId]) continue;
          const delta = addDirt(enemySideId, wash);
          splashTotal += delta;
          if (delta > 0) touched.push(`${cradosSideName(s, enemySideId)} +${delta}`);
        }
        st.bullSplashInflicted += splashTotal;
        if (touched.length) events.push(`${d.bed === "IB" ? "DBULL" : "BULL"} PROPAGATION : ${touched.join(" · ")}`);
      }
      continue;
    }

    const n = numberOf(d);
    if (!n) continue;
    const pow = power(d);
    visitImpact += pow;
    if (d.bed === "T") st.triples += 1;
    else if (d.bed === "D") st.doubles += 1;
    else st.singles += 1;
    const sec = s.sectors[n] || (s.sectors[n] = { ownerId: null, claimantId: null, layers: 0, pressureBySide: {} });
    sec.pressureBySide = sec.pressureBySide || {};

    if (!sec.ownerId) {
      st.freeSectorHits += 1;
      if (s.config.rules.sectorRaceMode === "race") {
        sec.pressureBySide[sideId] = Number(sec.pressureBySide[sideId] || 0) + pow;
        st.layersPlaced += pow;
        const mine = Number(sec.pressureBySide[sideId] || 0);
        const leader = leadingPressureSide(sec);
        sec.claimantId = String(leader.sideId || sideId);
        sec.layers = Math.min(s.config.rules.layersToOwn, Number(leader.value || mine || 0));
        if (mine >= s.config.rules.layersToOwn) {
          sec.ownerId = sideId;
          sec.claimantId = sideId;
          sec.layers = s.config.rules.layersToOwn;
          st.sectorsClaimed += 1;
          const scraps: string[] = [];
          for (const [otherSideId, rawValue] of Object.entries(sec.pressureBySide || {})) {
            const value = Number(rawValue || 0);
            if (!value || String(otherSideId) === sideId) continue;
            const delta = addDirt(otherSideId, value);
            if (delta > 0) scraps.push(`${cradosSideName(s, otherSideId)} +${delta}`);
          }
          events.push(`N°${n} remporté par ${sideName}`);
          if (scraps.length) events.push(`Touches adverses changées en crasse : ${scraps.join(" · ")}`);
        } else {
          events.push(`N°${n} : ${mine}/${s.config.rules.layersToOwn} touches pour ${sideName}`);
        }
        continue;
      }

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
      st.ownSectorHits += 1;
      events.push(`N°${n} est déjà à ${sideName}`);
      continue;
    }

    st.opponentSectorHits += 1;
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
      addDirt(sideId, 1, events, `Contact avec la crasse adverse : +__VALUE__ CRASSE${isCradosTeamMode(s) ? ` à ${sideName}` : ""}`);
    } else {
      addDirt(sideId, pow, events, `N°${n} adverse : +__VALUE__ CRASSE${isCradosTeamMode(s) ? ` à ${sideName}` : ""}`);
    }

    if (s.eliminated[sideId]) break;
  }

  const after = Number(s.dirt[sideId] || 0);
  st.bestVisitImpact = Math.max(Number(st.bestVisitImpact || 0), visitImpact);
  st.maxDirt = Math.max(Number(st.maxDirt || 0), after);
  if (after < before) st.cleanVisits += 1;
  if (after > before) st.dirtyVisits += 1;

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
    dirtAfter: after,
  });
  s.turnIndex += 1;

  const alive = aliveSideIds(s);
  if (alive.length === 1) return winLeg(s, alive[0]);
  s.activePlayerIndex = nextAliveIndex(s, s.activePlayerIndex);
  return s;
}

function strengthRating(level: CradosBotStrength): number {
  if (typeof level === "number" && Number.isFinite(level)) {
    // Compatibilité descendante : les anciens appels passaient encore une note /5.
    if (level <= 5) return Math.max(1, Math.min(100, 20 + (Math.max(1, level) - 1) * 19));
    return Math.max(1, Math.min(100, level));
  }
  return level === "hard" ? 80 : level === "easy" ? 30 : 58;
}

function aimChance(level: CradosBotStrength): number {
  const rating = strengthRating(level);
  return Math.max(.38, Math.min(.95, .32 + rating * .0065));
}

function strategyChance(level: CradosBotStrength): number {
  const rating = strengthRating(level);
  return Math.max(.28, Math.min(.96, .23 + rating * .0075));
}

function rawMissChance(level: CradosBotStrength): number {
  const rating = strengthRating(level);
  return Math.max(.045, Math.min(.22, .24 - rating * .0019));
}

function bedForStrength(level: CradosBotStrength): "S" | "D" | "T" {
  const rating = strengthRating(level);
  const r = Math.random();
  const triple = Math.max(.05, Math.min(.30, .03 + rating * .0026));
  const double = Math.max(.10, Math.min(.25, .09 + rating * .0015));
  return r < triple ? "T" : r < triple + double ? "D" : "S";
}

function randomBoardNumber(): number {
  return 1 + Math.floor(Math.random() * 20);
}

function pickFrom(pool: number[]): number {
  return pool[Math.floor(Math.random() * Math.max(1, pool.length))] || randomBoardNumber();
}

export function pickCradosBotDarts(s: CradosState, level: CradosBotStrength = "normal"): GameDart[] {
  const p = s.players[s.activePlayerIndex];
  if (!p) return [];

  const sideId = cradosSideIdForPlayer(s, p.id);
  const rating = strengthRating(level);
  const aim = aimChance(level);
  const strategy = strategyChance(level);
  const dirt = Number(s.dirt[sideId] || 0);
  const dirtRatio = dirt / Math.max(1, Number(s.config.rules.dirtLimit || 1));

  const sectors = Object.entries(s.sectors);
  const enemy = sectors.filter(([, x]: any) => x.ownerId && x.ownerId !== sideId).map(([n]) => Number(n));
  const free = sectors.filter(([, x]: any) => !x.ownerId).map(([n]) => Number(n));
  const own = sectors.filter(([, x]: any) => x.ownerId === sideId).map(([n]) => Number(n));

  // Un bon BOT comprend mieux la situation :
  // - en mode VOL, il attaque les secteurs adverses ;
  // - sinon il privilégie les secteurs libres ;
  // - un mauvais BOT s'écarte plus souvent de ce plan et touche des zones risquées.
  const tacticalPool =
    s.config.rules.stealMode === "flip" && enemy.length
      ? enemy
      : free.length
        ? free
        : own.length
          ? own
          : Array.from({ length: 20 }, (_, i) => i + 1);

  const allNumbers = Array.from({ length: 20 }, (_, i) => i + 1);
  const darts: GameDart[] = [];

  for (let dartIndex = 0; dartIndex < 3; dartIndex += 1) {
    // Plus le BOT est fort et plus il pense à se laver au Bull quand sa jauge monte.
    // Les plus faibles oublient souvent cette option ou ratent leur tentative.
    const bullIntent =
      s.config.rules.bullWash &&
      dirtRatio >= .48 &&
      Math.random() < Math.max(.08, Math.min(.82, (.10 + rating * .0065) * (0.72 + dirtRatio * .45)));

    if (bullIntent) {
      if (Math.random() <= aim) {
        const innerBullChance = Math.max(.08, Math.min(.58, .03 + rating * .0053));
        darts.push({ bed: Math.random() < innerBullChance ? "IB" : "OB" } as GameDart);
      } else if (Math.random() < rawMissChance(level)) {
        darts.push({ bed: "MISS" } as GameDart);
      } else {
        darts.push({ bed: "S", number: randomBoardNumber() } as GameDart);
      }
      continue;
    }

    const usesPlan = Math.random() < strategy;
    const targetPool = usesPlan ? tacticalPool : allNumbers;
    const target = pickFrom(targetPool);

    // La précision brute varie fortement de Bébert (20) à Gégé (96).
    if (Math.random() > aim) {
      if (Math.random() < rawMissChance(level)) {
        darts.push({ bed: "MISS" } as GameDart);
      } else {
        // Erreur latérale : le BOT touche un autre numéro, potentiellement adverse,
        // ce qui augmente naturellement son risque de CRASSE.
        darts.push({ bed: "S", number: randomBoardNumber() } as GameDart);
      }
      continue;
    }

    darts.push({ bed: bedForStrength(level), number: target } as GameDart);
  }

  return darts;
}
