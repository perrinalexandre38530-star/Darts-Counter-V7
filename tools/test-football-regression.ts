import assert from "node:assert/strict";
import {
  buildFootballMatchStats,
  createFootballState,
  getFootballAction,
  getFootballTargets,
  pickFootballBotDarts,
  playFootballVisit,
  type FootballConfigPayload,
  type FootballState,
} from "../src/lib/gameEngines/footballEngine.ts";

const players = [
  { id: "p1", name: "Ninja" },
  { id: "p2", name: "Hubert" },
];

function config(overrides: Partial<FootballConfigPayload> = {}): FootballConfigPayload {
  return {
    mode: "football",
    participantMode: "players",
    variant: "match",
    selectedIds: ["p1", "p2"],
    playersList: players,
    teamConfigs: [],
    playerDartSets: {},
    botIds: [],
    botLevel: "normal",
    halfRounds: 5,
    extraRounds: 2,
    tieBreaker: "penalties",
    goalTarget: 3,
    penaltyShots: 5,
    mercyGoals: 0,
    targetDifficulty: "standard",
    kickoffMode: "home",
    goalkeeperEnabled: true,
    missLosesPossession: true,
    randomOrder: false,
    coachHints: true,
    scoreInputMethod: "keypad",
    ...overrides,
  };
}

function fresh(overrides: Partial<FootballConfigPayload> = {}): FootballState {
  return createFootballState(players, config(overrides), () => 0.1);
}

// Progression offensive : un triple sur cible doit avancer de trois zones.
{
  const state = fresh();
  assert.equal(getFootballAction(state), "attack");
  const target = getFootballTargets(state)[0];
  const next = playFootballVisit(state, [{ bed: "T", number: target }]);
  assert.equal(next.ballPosition, 6);
  assert.equal(next.statsByPlayer.p1.advances, 3);
  assert.equal(next.statsByPlayer.p1.triples, 1);
}

// Tir direct : triple dans la surface = but immédiat.
{
  const state = fresh();
  state.ballPosition = 5;
  state.activeSideIndex = 0;
  state.possessionSideIndex = 0;
  const target = getFootballTargets(state, "shot")[0];
  const next = playFootballVisit(state, [{ bed: "T", number: target }]);
  assert.equal(next.scoreBySide[next.sides[0].id], 1);
  assert.equal(next.statsByPlayer.p1.goals, 1);
  assert.equal(next.phase, "playing");
}

// Gardien : un simple cadré ouvre une phase gardien, puis une cible valide provoque l'arrêt.
{
  const state = fresh();
  state.ballPosition = 5;
  state.activeSideIndex = 0;
  state.possessionSideIndex = 0;
  const target = getFootballTargets(state, "shot")[0];
  const shot = playFootballVisit(state, [{ bed: "S", number: target }]);
  assert.equal(shot.phase, "goalkeeper");
  assert.ok(shot.pendingShot?.saveTargets.length);
  assert.equal(shot.activeSideIndex, 1);
  const saveTarget = shot.pendingShot!.saveTargets[0];
  const saved = playFootballVisit(shot, [{ bed: "S", number: saveTarget }]);
  assert.equal(saved.phase, "playing");
  assert.equal(saved.scoreBySide[saved.sides[0].id], 0);
  assert.equal(saved.statsByPlayer.p2.saves, 1);
}

// Défense : un double valide récupère la possession ; un simple est compté comme dégagement.
{
  let state = fresh();
  state.activeSideIndex = 1;
  state.possessionSideIndex = 0;
  let target = getFootballTargets(state, "defense")[0];
  let next = playFootballVisit(state, [{ bed: "D", number: target }]);
  assert.equal(next.possessionSideIndex, 1);
  assert.equal(next.statsByPlayer.p2.interceptions, 1);

  state = fresh();
  state.activeSideIndex = 1;
  state.possessionSideIndex = 0;
  target = getFootballTargets(state, "defense")[0];
  next = playFootballVisit(state, [{ bed: "S", number: target }]);
  assert.equal(next.statsByPlayer.p2.clearances, 1);
}

// Difficulté : Accessible propose plus de secteurs, Expert moins de secteurs.
{
  const accessible = fresh({ targetDifficulty: "accessible" });
  const standard = fresh({ targetDifficulty: "standard" });
  const expert = fresh({ targetDifficulty: "expert" });
  assert.ok(getFootballTargets(accessible).length >= getFootballTargets(standard).length);
  assert.ok(getFootballTargets(expert).length <= 2);
}

// Coup d'envoi : le camp 2 peut être imposé.
{
  const state = fresh({ kickoffMode: "away" });
  assert.equal(state.activeSideIndex, 1);
  assert.equal(state.possessionSideIndex, 1);
}

// Premier à X : la partie s'arrête dès l'objectif atteint.
{
  let state = fresh({ variant: "first_to", goalTarget: 2, goalkeeperEnabled: false });
  for (let goal = 0; goal < 2; goal += 1) {
    state.ballPosition = 5;
    state.activeSideIndex = 0;
    state.possessionSideIndex = 0;
    const target = getFootballTargets(state, "shot")[0];
    state = playFootballVisit(state, [{ bed: "T", number: target }]);
  }
  assert.equal(state.scoreBySide[state.sides[0].id], 2);
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerSideIds, [state.sides[0].id]);
}

// Variante Classic : Bull pour la possession, double pour le but, avec vraie condition de fin.
{
  let state = fresh({ variant: "classic", goalTarget: 1 });
  state.activeSideIndex = 1;
  state.possessionSideIndex = 0;
  state = playFootballVisit(state, [{ bed: "OB" }]);
  assert.equal(state.possessionSideIndex, 1);
  state.activeSideIndex = 1;
  state = playFootballVisit(state, [{ bed: "D", number: 20 }]);
  assert.equal(state.scoreBySide[state.sides[1].id], 1);
  assert.equal(state.phase, "finished");
}

// Penalties : série configurable de trois tirs puis décision anticipée/mort subite.
{
  let state = fresh({ variant: "penalties", penaltyShots: 3 });
  for (let index = 0; index < 6 && state.phase !== "finished"; index += 1) {
    const active = state.activeSideIndex;
    const target = getFootballTargets(state, "penalty")[0];
    state = playFootballVisit(state, active === 0 ? [{ bed: "S", number: target }] : [{ bed: "MISS" }]);
  }
  assert.equal(state.phase, "finished");
  assert.deepEqual(state.winnerSideIds, [state.sides[0].id]);
  assert.ok(state.statsByPlayer.p1.penaltiesScored >= 1);
}

// Mercy rule : un écart configuré termine immédiatement le match.
{
  let state = fresh({ mercyGoals: 1, goalkeeperEnabled: false });
  state.ballPosition = 5;
  state.activeSideIndex = 0;
  state.possessionSideIndex = 0;
  const target = getFootballTargets(state, "shot")[0];
  state = playFootballVisit(state, [{ bed: "T", number: target }]);
  assert.equal(state.phase, "finished");
}

// Bots et agrégats restent exploitables.
{
  const state = fresh();
  const darts = pickFootballBotDarts(state, "hard", () => 0.1);
  assert.ok(darts.length >= 1 && darts.length <= 3);
  const stats = buildFootballMatchStats(playFootballVisit(state, darts));
  assert.ok(stats.totalDarts >= 1);
  assert.equal(typeof stats.scoreBySide, "object");
  assert.equal(typeof stats.clearances, "number");
}

console.log("DARTS FOOTBALL engine regression V3: OK");
