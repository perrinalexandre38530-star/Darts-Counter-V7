// =============================================================
// GROS 6 / BIG 6 — moteur de règles pur
// - individuel + équipes
// - vies individuelles ou réserve d'équipe
// - cibles S/D/T, Bull/DBull et zones fermées/extérieures
// - bonus de sélection après validation sur la 3e fléchette
// =============================================================

export type Gros6SegmentRing = "S" | "D" | "T";
export type Gros6Target =
  | { kind: "segment"; ring: Gros6SegmentRing; value: number; label: string; singleArea?: "big" | "small" }
  | { kind: "bull"; bull: "SB" | "DB"; label: string }
  | { kind: "special"; code: string; label: string }
  | { kind: "miss"; label: "MISS" };

export const GROS6_NUMBER_ORDER = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const GROS6_SPECIAL_ZONES = [
  { code: "outer_numbers_ring", label: "Contour extérieur" },
  { code: "closed_6", label: "Hors cible 6" },
  { code: "closed_8_top", label: "Hors cible 8 haut" },
  { code: "closed_8_bottom", label: "Hors cible 8 bas" },
  { code: "closed_9", label: "Hors cible 9" },
  { code: "closed_10", label: "Hors cible 10" },
  { code: "closed_16", label: "Hors cible 16" },
  { code: "closed_18_top", label: "Hors cible 18 haut" },
  { code: "closed_18_bottom", label: "Hors cible 18 bas" },
  { code: "closed_19", label: "Hors cible 19" },
  { code: "closed_20", label: "Hors cible 20" },
];

export function gros6Clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function makeGros6Segment(ring: Gros6SegmentRing, value: number, singleArea?: "big" | "small"): Gros6Target {
  const safeValue = Number(value);
  const safeArea = ring === "S" ? (singleArea === "small" ? "small" : "big") : undefined;
  const label = ring === "S"
    ? `${safeArea === "small" ? "PETIT" : "GROS"} ${safeValue}`
    : `${ring}${safeValue}`;
  return { kind: "segment", ring, value: safeValue, label, ...(safeArea ? { singleArea: safeArea } : {}) };
}
export function makeGros6Bull(doubleBull = false): Gros6Target {
  return { kind: "bull", bull: doubleBull ? "DB" : "SB", label: doubleBull ? "DBULL" : "BULL" };
}
export function makeGros6Special(code: string, label: string): Gros6Target {
  return { kind: "special", code: String(code), label: String(label) };
}
export function makeGros6Miss(): Gros6Target {
  return { kind: "miss", label: "MISS" };
}
export function gros6TargetLabel(target: any): string {
  return target?.label || "—";
}
export function normalizeGros6Target(target: any): Gros6Target {
  if (!target) return makeGros6Segment("S", 6, "big");
  if (target.kind === "segment") return makeGros6Segment((target.ring || "S") as Gros6SegmentRing, Number(target.value || 6), target.singleArea === "small" ? "small" : "big");
  if (target.kind === "bull") return makeGros6Bull(target.bull === "DB");
  if (target.kind === "special") return makeGros6Special(String(target.code), String(target.label || target.code));
  if (target.kind === "miss") return makeGros6Miss();
  return makeGros6Segment("S", 6, "big");
}
export function gros6HitToTarget(hit: any): Gros6Target | null {
  if (!hit || hit.kind === "miss") return null;
  return normalizeGros6Target(hit);
}

export function gros6MatchesTarget(hit: any, target: any, config: any): boolean {
  if (!hit || hit.kind === "miss" || !target) return false;
  if (target.kind === "special") return hit.kind === "special" && String(hit.code) === String(target.code);
  if (target.kind === "bull") return hit.kind === "bull" && String(hit.bull) === String(target.bull);
  if (target.kind === "segment") {
    if (hit.kind !== "segment") return false;
    if (String(hit.ring) !== String(target.ring) || Number(hit.value) !== Number(target.value)) return false;
    if (String(target.ring) === "S") return String(hit.singleArea || "big") === String(target.singleArea || "big");
    if (String(config?.targetRule || "strict") === "value") return Number(hit.value) === Number(target.value);
    return true;
  }
  return false;
}

export function isGros6TargetAllowedForSelection(target: any, config: any): boolean {
  if (!target || target.kind === "miss") return false;
  if (target.kind === "special") {
    if (!config?.allowSpecialZones) return false;
    if (String(target?.code || "") === "outer_numbers_ring" && config?.allowOuterRing === false) return false;
    return String(config?.selectionPolicy || "open") !== "pro";
  }
  if (target.kind === "bull") return !!config?.allowBull;
  if (target.kind === "segment") {
    const policy = String(config?.selectionPolicy || "open");
    if (policy === "pro") return target.ring === "D" || target.ring === "T";
    return true;
  }
  return false;
}

export function randomGros6StartTarget(config: any): Gros6Target {
  const ringPool: Gros6SegmentRing[] = String(config?.selectionPolicy || "open") === "pro" ? ["D", "T"] : ["S", "D", "T"];
  const ring = ringPool[Math.floor(Math.random() * ringPool.length)] || "S";
  const value = GROS6_NUMBER_ORDER[Math.floor(Math.random() * GROS6_NUMBER_ORDER.length)] || 6;
  return makeGros6Segment(ring, value, Math.random() < 0.5 ? "big" : "small");
}

function makePlayerState(player: any, startingLives: number) {
  return {
    ...player,
    lives: Number(startingLives || 5),
    eliminated: false,
    stats: {
      dartsThrown: 0,
      targetsCleared: 0,
      targetsImposed: 0,
      livesLost: 0,
      lastDartSaves: 0,
      specialTargetsCleared: 0,
      bullsCleared: 0,
      doublesCleared: 0,
      triplesCleared: 0,
    },
  };
}

function makeTeamState(team: any, startingLives: number) {
  return {
    ...team,
    lives: Number(startingLives || 5),
    eliminated: false,
    stats: { livesLost: 0, targetsCleared: 0, targetsImposed: 0 },
  };
}

export function gros6TeamForPlayer(state: any, player: any) {
  const teamId = String(player?.teamId || "");
  return (state?.teams || []).find((team: any) => String(team?.id || "") === teamId) || null;
}

export function gros6IsPlayerActive(state: any, player: any): boolean {
  if (!player || player.eliminated) return false;
  if (state?.participantMode === "teams" && state?.teamLifeMode === "shared") {
    const team = gros6TeamForPlayer(state, player);
    return !!team && !team.eliminated && Number(team.lives || 0) > 0;
  }
  return Number(player.lives || 0) > 0;
}

export function gros6AliveTeams(state: any): any[] {
  if (state?.participantMode !== "teams") return [];
  return (state?.teams || []).filter((team: any) => {
    if (team?.eliminated) return false;
    if (state?.teamLifeMode === "shared") return Number(team?.lives || 0) > 0;
    return (state?.players || []).some((player: any) => String(player?.teamId || "") === String(team?.id || "") && gros6IsPlayerActive(state, player));
  });
}

export function gros6FindWinner(state: any): any | null {
  if (state?.participantMode === "teams") {
    const aliveTeams = gros6AliveTeams(state);
    if (aliveTeams.length === 1) return { type: "team", id: aliveTeams[0].id, name: aliveTeams[0].name, team: aliveTeams[0] };
    return null;
  }
  const alive = (state?.players || []).filter((player: any) => gros6IsPlayerActive(state, player));
  return alive.length === 1 ? { type: "player", id: alive[0].id, name: alive[0].name, player: alive[0] } : null;
}

export function gros6NextAliveIndex(state: any, fromIndex: number): number {
  const players = Array.isArray(state?.players) ? state.players : [];
  if (!players.length) return 0;
  for (let step = 1; step <= players.length; step += 1) {
    const index = (fromIndex + step) % players.length;
    if (gros6IsPlayerActive(state, players[index])) return index;
  }
  return fromIndex;
}

export function buildGros6InitialState(config: any) {
  const participantMode = config?.participantMode === "teams" ? "teams" : "players";
  const teamLifeMode = config?.teamLifeMode === "shared" ? "shared" : "individual";
  const startingLives = Number(config?.startingLives || 5);
  const initialTarget = normalizeGros6Target(
    config?.startingTarget || makeGros6Segment("S", 6, "big"),
  );
  return {
    players: (config?.players || []).map((player: any) => makePlayerState(player, startingLives)),
    teams: participantMode === "teams" ? (config?.teams || []).map((team: any) => makeTeamState(team, startingLives)) : [],
    participantMode,
    teamLifeMode,
    turnIndex: 0,
    turnNo: 1,
    phase: "attack",
    currentTarget: initialTarget,
    attackDarts: [],
    selectionDarts: [],
    selectionAllowed: 0,
    pendingNextTarget: null,
    message: "Touchez la cible courante.",
    winnerId: null,
    winnerName: null,
    winnerType: null,
    history: [],
  };
}

function historyEntry(player: any, target: any, phase: string, darts: any[]) {
  return {
    at: Date.now(),
    playerId: player?.id,
    playerName: player?.name,
    teamId: player?.teamId || null,
    teamName: player?.teamName || null,
    phase,
    target: gros6TargetLabel(target),
    darts: (darts || []).map((dart: any) => gros6TargetLabel(dart)),
  };
}

function syncIndividualTeamElimination(next: any) {
  if (next.participantMode !== "teams" || next.teamLifeMode === "shared") return;
  for (const team of next.teams || []) {
    const members = (next.players || []).filter((p: any) => String(p?.teamId || "") === String(team?.id || ""));
    team.eliminated = members.length > 0 && members.every((p: any) => !gros6IsPlayerActive(next, p));
  }
}

function finishIfWinner(next: any) {
  const winner = gros6FindWinner(next);
  if (!winner) return next;
  next.phase = "finished";
  next.winnerId = winner.id;
  next.winnerName = winner.name;
  next.winnerType = winner.type;
  next.message = `${winner.name} remporte la partie !`;
  return next;
}

function advanceTurn(next: any) {
  const winner = gros6FindWinner(next);
  if (winner) return finishIfWinner(next);
  next.turnIndex = gros6NextAliveIndex(next, next.turnIndex);
  next.turnNo += 1;
  next.phase = "attack";
  next.attackDarts = [];
  next.selectionDarts = [];
  next.selectionAllowed = 0;
  next.pendingNextTarget = null;
  next.message = "Touchez la cible courante.";
  return next;
}

export function finalizeGros6Selection(state: any) {
  const next = gros6Clone(state);
  if (next.phase !== "select" || next.winnerId) return next;
  const player = next.players[next.turnIndex];
  const chosen = next.pendingNextTarget ? normalizeGros6Target(next.pendingNextTarget) : next.currentTarget;
  next.currentTarget = chosen;
  if (next.pendingNextTarget) {
    player.stats.targetsImposed += 1;
    const team = gros6TeamForPlayer(next, player);
    if (team) team.stats.targetsImposed += 1;
  }
  next.history.push({
    ...historyEntry(player, chosen, "select", next.selectionDarts),
    nextTarget: gros6TargetLabel(chosen),
  });
  return advanceTurn(next);
}

function markClearStats(player: any, team: any, target: any) {
  player.stats.targetsCleared += 1;
  if (team) team.stats.targetsCleared += 1;
  if (target?.kind === "special") player.stats.specialTargetsCleared += 1;
  if (target?.kind === "bull") player.stats.bullsCleared += 1;
  if (target?.kind === "segment" && target?.ring === "D") player.stats.doublesCleared += 1;
  if (target?.kind === "segment" && target?.ring === "T") player.stats.triplesCleared += 1;
}

export function applyGros6AttackHit(state: any, hit: any, config: any) {
  const next = gros6Clone(state);
  if (next.phase !== "attack" || next.winnerId) return next;
  const player = next.players[next.turnIndex];
  if (!player || !gros6IsPlayerActive(next, player)) return next;
  const team = gros6TeamForPlayer(next, player);

  const normalized = hit?.kind ? normalizeGros6Target(hit) : makeGros6Miss();
  next.attackDarts.push(normalized);
  player.stats.dartsThrown += 1;
  const dartIndex = next.attackDarts.length - 1;
  const success = gros6MatchesTarget(normalized, next.currentTarget, config);

  if (success) {
    markClearStats(player, team, next.currentTarget);
    const remaining = Math.max(0, 2 - dartIndex);
    const bonus = config?.thirdDartBonusSelection ? Number(config?.thirdDartBonusCount || 3) : 0;
    const selectionAllowed = remaining > 0 ? remaining : bonus;
    if (dartIndex === 2) player.stats.lastDartSaves += 1;
    next.history.push({
      ...historyEntry(player, next.currentTarget, "attack", next.attackDarts),
      success: true,
      selectionAllowed,
    });
    if (selectionAllowed > 0) {
      next.phase = "select";
      next.selectionAllowed = selectionAllowed;
      next.selectionDarts = [];
      next.pendingNextTarget = null;
      next.message = dartIndex === 2 && config?.thirdDartBonusSelection
        ? `Cible validée sur la 3e fléchette : ${selectionAllowed} fléchettes bonus pour définir la prochaine zone.`
        : `Cible validée : ${selectionAllowed} fléchette${selectionAllowed > 1 ? "s" : ""} pour définir la prochaine zone.`;
      return next;
    }
    next.message = "Cible validée. La cible reste inchangée.";
    return advanceTurn(next);
  }

  if (next.attackDarts.length >= 3) {
    player.stats.livesLost += 1;
    let eliminationMessage = "";

    if (next.participantMode === "teams" && next.teamLifeMode === "shared" && team) {
      team.lives = Math.max(0, Number(team.lives || 0) - 1);
      team.stats.livesLost += 1;
      if (team.lives <= 0) {
        team.eliminated = true;
        for (const member of next.players || []) {
          if (String(member?.teamId || "") === String(team.id)) member.eliminated = true;
        }
        eliminationMessage = `${team.name} est éliminée.`;
      } else {
        eliminationMessage = `${team.name} perd une vie (${team.lives} restante${team.lives > 1 ? "s" : ""}).`;
      }
    } else {
      player.lives = Math.max(0, Number(player.lives || 0) - 1);
      if (player.lives <= 0) player.eliminated = true;
      if (next.participantMode === "teams") syncIndividualTeamElimination(next);
      eliminationMessage = player.eliminated
        ? `${player.name} est éliminé${player?.name?.endsWith?.("e") ? "e" : ""}.`
        : `${player.name} perd une vie (${player.lives} restante${player.lives > 1 ? "s" : ""}).`;
    }

    next.history.push({
      ...historyEntry(player, next.currentTarget, "attack", next.attackDarts),
      success: false,
      lifeLost: true,
      livesAfter: player.lives,
      teamLivesAfter: team?.lives ?? null,
    });
    const winner = gros6FindWinner(next);
    if (winner) return finishIfWinner(next);
    next.message = `${eliminationMessage} La cible reste ${gros6TargetLabel(next.currentTarget)}.`;
    return advanceTurn(next);
  }

  next.message = `Encore ${3 - next.attackDarts.length} fléchette${3 - next.attackDarts.length > 1 ? "s" : ""}.`;
  return next;
}

export function applyGros6SelectionHit(state: any, hit: any, config: any) {
  const next = gros6Clone(state);
  if (next.phase !== "select" || next.winnerId) return next;
  const normalized = hit?.kind ? normalizeGros6Target(hit) : makeGros6Miss();
  next.selectionDarts.push(normalized);
  const candidate = gros6HitToTarget(normalized);
  const allowed = candidate && isGros6TargetAllowedForSelection(candidate, config);
  if (allowed) next.pendingNextTarget = candidate;

  if (next.selectionDarts.length >= Number(next.selectionAllowed || 0)) return finalizeGros6Selection(next);

  if (candidate && !allowed) {
    next.message = `Zone ${gros6TargetLabel(candidate)} non autorisée par cette variante. Il reste ${Math.max(0, Number(next.selectionAllowed || 0) - next.selectionDarts.length)} fléchette(s).`;
  } else {
    next.message = next.pendingNextTarget
      ? `Cible provisoire : ${gros6TargetLabel(next.pendingNextTarget)}.`
      : `Choisissez la prochaine zone (${Math.max(0, Number(next.selectionAllowed || 0) - next.selectionDarts.length)} fléchette(s) restante(s)).`;
  }
  return next;
}

export function gros6BotSkill(player: any): number {
  const raw = String(player?.botLevel ?? player?.level ?? "3").replace(",", ".");
  const match = raw.match(/\d+(?:\.5)?/);
  const parsed = match ? Number(match[0]) : Number(player?.botLevel || 3);
  return Math.max(1, Math.min(5, Number.isFinite(parsed) ? parsed : 3));
}

function randomSegment(): Gros6Target {
  const value = GROS6_NUMBER_ORDER[Math.floor(Math.random() * GROS6_NUMBER_ORDER.length)] || 20;
  const rings: Gros6SegmentRing[] = ["S", "D", "T"];
  const ring = rings[Math.floor(Math.random() * rings.length)] || "S";
  return makeGros6Segment(ring, value, Math.random() < 0.5 ? "big" : "small");
}

function randomHit(config: any): Gros6Target {
  const r = Math.random();
  if (config?.allowBull && r < 0.05) return Math.random() < 0.2 ? makeGros6Bull(true) : makeGros6Bull(false);
  if (config?.allowSpecialZones && r < 0.14) {
    const zones = GROS6_SPECIAL_ZONES.filter((zone) => !(config?.allowOuterRing === false && zone.code === "outer_numbers_ring"));
    const zone = zones[Math.floor(Math.random() * zones.length)];
    return makeGros6Special((zone || GROS6_SPECIAL_ZONES[0]).code, (zone || GROS6_SPECIAL_ZONES[0]).label);
  }
  return randomSegment();
}

function randomNonMatchingHit(target: any, config: any): Gros6Target {
  for (let i = 0; i < 20; i += 1) {
    const hit = randomHit(config);
    if (!gros6MatchesTarget(hit, target, config)) return hit;
  }
  return makeGros6Miss();
}

function targetDifficulty(target: any): number {
  if (!target) return 0.5;
  if (target.kind === "special") return 0.82;
  if (target.kind === "bull") return target.bull === "DB" ? 0.9 : 0.72;
  if (target.kind === "segment") {
    const high = [20, 19, 18, 17, 16, 15].includes(Number(target.value)) ? 0.05 : 0;
    const base = target.ring === "T" ? 0.82 : target.ring === "D" ? 0.7 : (target.singleArea === "small" ? 0.58 : 0.44);
    return Math.min(0.94, base + high);
  }
  return 0.5;
}

export function chooseGros6BotTarget(skill: number, config: any): Gros6Target {
  const options: Gros6Target[] = [
    makeGros6Segment("T", 20), makeGros6Segment("T", 19), makeGros6Segment("D", 20),
    makeGros6Segment("D", 18), makeGros6Segment("D", 16), makeGros6Segment("T", 18),
    makeGros6Segment("S", 20, "big"), makeGros6Segment("S", 20, "small"), makeGros6Segment("S", 19, "big"), makeGros6Segment("S", 18, "big"), makeGros6Segment("S", 6, "big"), makeGros6Segment("S", 6, "small"),
  ];
  if (config?.allowBull) options.push(makeGros6Bull(true), makeGros6Bull(false));
  if (config?.allowSpecialZones) {
    for (const zone of GROS6_SPECIAL_ZONES.filter((item) => !(config?.allowOuterRing === false && item.code === "outer_numbers_ring"))) {
      options.push(makeGros6Special(zone.code, zone.label));
    }
  }
  const allowed = options.filter((target) => isGros6TargetAllowedForSelection(target, config));
  const ordered = skill >= 4 ? allowed : [...allowed].reverse();
  return gros6Clone(ordered[Math.floor(Math.random() * Math.max(1, ordered.length))] || makeGros6Segment("S", 20, "big"));
}

export function simulateGros6BotAttack(state: any, config: any): { darts: Gros6Target[]; successIndex: number } {
  const player = state.players[state.turnIndex];
  const skill = gros6BotSkill(player);
  const difficulty = targetDifficulty(state.currentTarget);
  const base = Math.max(0.1, Math.min(0.95, 0.23 + skill * 0.135 - difficulty * 0.24));
  const darts: Gros6Target[] = [];
  let successIndex = -1;
  for (let i = 0; i < 3; i += 1) {
    const chance = Math.max(0.06, Math.min(0.97, base + i * 0.07));
    if (Math.random() < chance) {
      darts.push(normalizeGros6Target(state.currentTarget));
      successIndex = i;
      break;
    }
    darts.push(randomNonMatchingHit(state.currentTarget, config));
  }
  while (successIndex < 0 && darts.length < 3) darts.push(randomNonMatchingHit(state.currentTarget, config));
  return { darts, successIndex };
}

export function simulateGros6BotSelection(allowed: number, player: any, config: any) {
  const skill = gros6BotSkill(player);
  const chosen = chooseGros6BotTarget(skill, config);
  const darts: Gros6Target[] = [];
  const missFirst = allowed > 1 && skill <= 2 && Math.random() < 0.32;
  if (missFirst) darts.push(makeGros6Miss());
  darts.push(chosen);
  while (darts.length < allowed) darts.push(makeGros6Miss());
  return { darts: darts.slice(0, allowed), chosen };
}
