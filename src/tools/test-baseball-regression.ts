import assert from "node:assert/strict";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
} from "../lib/gameEngines/baseballEngine.ts";

const S = (number: number) => ({ bed: "S" as const, number });
const D = (number: number) => ({ bed: "D" as const, number });
const T = (number: number) => ({ bed: "T" as const, number });
const BULL = { bed: "OB" as const };
const DBULL = { bed: "IB" as const };
const MISS = { bed: "MISS" as const };

function rules(patch: Partial<BaseballRules> = {}): Partial<BaseballRules> {
  return {
    mode: "baseball",
    innings: 9,
    extraInnings: true,
    maxExtraInnings: 3,
    seventhInningRule: "none",
    gameVariant: "target",
    bullTargetMode: "off",
    bullBonusPoints: 4,
    missEndsTurn: true,
    participantMode: "players",
    ...patch,
  };
}

function play(state: BaseballState, darts: any[]): BaseballState {
  return BaseballEngine.playTurn(state, darts);
}

// 1) Mode cibles : S/D/T sur la cible = 1/2/3, et le BULL n'est pas dans la rotation par défaut.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, extraInnings: false })
  );
  assert.ok(state.target >= 1 && state.target <= 20);
  assert.ok(!state.targetSequence.includes(25));
  const target = state.target;
  const wrong = target === 20 ? 19 : target + 1;
  state = play(state, [S(target), D(target), T(target)]);
  state = play(state, [S(wrong), D(wrong)]);
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 6);
  assert.equal(state.standings.find((row) => row.id === "p2")?.total, 0);
  assert.equal(state.finished, true);
}

// 2) BULL dans le tirage est un choix explicite : sur cette cible BULL=3 et DBULL=5.
{
  const seq = BaseballEngine.buildTargetSequence(20, 1, "random");
  assert.equal(seq.length, 21);
  assert.ok(seq.includes(25));
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 1, extraInnings: false, bullTargetMode: "random" })
  );
  state.target = 25;
  state.targetSequence[0] = 25;
  state = play(state, [BULL, DBULL]);
  assert.equal(state.standings[0].total, 8);
  assert.equal(state.statsByPlayer.p1.bestDart, 5);
}

// 3) BULL Attaque : +bonus ; DBULL : score personnel x2.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 3, extraInnings: false, bullTargetMode: "attack", bullBonusPoints: 4 })
  );
  state = play(state, [S(state.target)]); // 1
  state = play(state, [BULL, DBULL]); // 1 + 4 = 5 ; DBULL => 10
  assert.equal(state.standings[0].total, 10);
  assert.equal(state.statsByPlayer.p1.bullAttackBonus, 4);
  assert.equal(state.statsByPlayer.p1.dbullAttackDoubles, 1);
}

// 4) BULL Défense : -4 à l'adversaire ; DBULL : score /2 avec arrondi supérieur.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 2, extraInnings: false, bullTargetMode: "defense", bullBonusPoints: 4 })
  );
  const t1 = state.target;
  state = play(state, [T(t1), D(t1)]); // A = 5
  state = play(state, [DBULL]); // B défend contre A => ceil(5/2) = 3
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 3);
  const t2 = state.target;
  state = play(state, [S(t2)]); // A = 4
  state = play(state, [BULL]); // B retire 4 => A = 0
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 0);
}

// 5) MISS configuré = fin immédiate du tour : les fléchettes après le MISS sont ignorées.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ innings: 1, extraInnings: false, missEndsTurn: true })
  );
  const target = state.target;
  state = play(state, [S(target), MISS, T(target)]);
  assert.equal(state.statsByPlayer.p1.darts, 2);
  assert.equal(state.statsByPlayer.p1.turnsLostOnMiss, 1);
  assert.equal(state.history[0].endedByMiss, true);
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 1);
}

// 6) Variante Attaque/Défense : la cible de la manche est obligatoire pour S/D/T.
//    Cible 20 : A attaque T20 + S1 + D5 = 3 ; B défend D20 + MISS = 2 ; A marque 1.
//    Puis B attaque et A défend encore sur 20 avant seulement de changer de cible.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, bullTargetMode: "off" })
  );
  state.target = 20;
  state.targetSequence[0] = 20;
  assert.equal(state.duelPhase, "attack");
  assert.equal(state.target, 20);

  state = play(state, [T(20), S(1), D(5)]); // A attaque = 3
  assert.equal(state.duelPhase, "defense");
  assert.equal(state.pendingAttackPower, 3);
  assert.equal(state.target, 20);
  assert.equal(state.statsByPlayer.p1.targetHits, 1);
  assert.equal(state.statsByPlayer.p1.wastedDarts, 2);

  state = play(state, [D(20), MISS, T(20)]); // B défense = 2 ; T20 après MISS ignoré
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 1);
  assert.equal(state.duelPhase, "attack");
  assert.equal(state.duelPairIndex, 1);
  assert.equal(state.target, 20);
  assert.equal(state.statsByPlayer.p2.defensePower, 2);
  assert.equal(state.statsByPlayer.p2.turnsLostOnMiss, 1);

  state = play(state, [S(20), D(3), T(1)]); // B attaque = 1
  assert.equal(state.pendingAttackPower, 1);
  assert.equal(state.target, 20);
  state = play(state, [S(20)]); // A défense = 1 => B +0

  assert.equal(state.finished, true);
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 1);
  assert.equal(state.standings.find((row) => row.id === "p2")?.total, 0);
  assert.deepEqual(state.history.map((visit) => visit.target), [20, 20, 20, 20]);
  assert.equal(state.statsByPlayer.p1.attackPower, 3);
  assert.equal(state.statsByPlayer.p2.runsPrevented, 2);
}

// 7) La cible ne change qu'après que chacun a attaqué ET défendu sur la cible courante.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ gameVariant: "attack_defense", innings: 2, extraInnings: false, bullTargetMode: "off" })
  );
  state.targetSequence[0] = 20;
  state.targetSequence[1] = 5;
  state.target = 20;

  state = play(state, [S(20)]); // A attaque
  state = play(state, [MISS]);  // B défend => A +1
  state = play(state, [D(20)]); // B attaque
  assert.equal(state.target, 20);
  state = play(state, [S(20)]); // A défend => B +1 ; fin manche 1

  assert.equal(state.inning, 2);
  assert.equal(state.target, 5);
  assert.equal(state.duelPhase, "attack");

  state = play(state, [T(5), T(20)]); // A attaque = 3, T20 hors cible = 0
  assert.equal(state.pendingAttackPower, 3);
  state = play(state, [D(5)]); // B défend = 2 => A +1
  state = play(state, [S(5)]); // B attaque = 1
  state = play(state, [S(1)]); // A défense hors cible = 0 => B +1

  assert.equal(state.finished, true);
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 2);
  assert.equal(state.standings.find((row) => row.id === "p2")?.total, 2);
}

// 8) Règle de 7e manche toujours compatible avec les nouvelles cibles aléatoires.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }],
    rules({ innings: 7, extraInnings: false, seventhInningRule: "halve_on_zero" })
  );
  for (let inning = 1; inning <= 6; inning += 1) state = play(state, [T(state.target)]);
  assert.equal(state.standings[0].total, 18);
  state = play(state, [MISS]);
  assert.equal(state.standings[0].total, 9);
  assert.equal(state.statsByPlayer.p1.penaltyRunsLost, 9);
}

// 9) Équipes : score de base + effets spéciaux sont appliqués au total d'équipe.
{
  let state = BaseballEngine.initGame(
    [
      { id: "a1", name: "A1" },
      { id: "b1", name: "B1" },
      { id: "a2", name: "A2" },
      { id: "b2", name: "B2" },
    ],
    rules({ innings: 1, extraInnings: false, participantMode: "teams", bullTargetMode: "attack", bullBonusPoints: 4 }),
    [
      { id: "A", name: "Team A", playerIds: ["a1", "a2"] },
      { id: "B", name: "Team B", playerIds: ["b1", "b2"] },
    ]
  );
  const target = state.target;
  state = play(state, [S(target)]); // A +1
  state = play(state, [BULL]);      // B +4
  state = play(state, [DBULL]);     // A double 1 => 2
  state = play(state, [MISS]);
  assert.equal(state.standings.find((row) => row.id === "A")?.total, 2);
  assert.equal(state.standings.find((row) => row.id === "B")?.total, 4);
}


// 10) Garde-fou duel individuel : impossible de lancer Attaque/Défense à plus de 2 joueurs.
{
  const state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }, { id: "p3", name: "C" }],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, participantMode: "players" })
  );
  assert.equal(state.rules.gameVariant, "target");
}

// 11) Duel équipes 2v2 : toute l'équipe attaque d'abord, puis l'autre équipe défend le total cumulé.
//     Ensuite les rôles s'inversent sur la même cible.
{
  let state = BaseballEngine.initGame(
    [
      { id: "a1", name: "A1" },
      { id: "b1", name: "B1" },
      { id: "a2", name: "A2" },
      { id: "b2", name: "B2" },
    ],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, participantMode: "teams", bullTargetMode: "off" }),
    [
      { id: "A", name: "Team A", playerIds: ["a1", "a2"] },
      { id: "B", name: "Team B", playerIds: ["b1", "b2"] },
    ]
  );
  state.target = 20;
  state.targetSequence[0] = 20;

  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "a1", defenderId: "b1", role: "attack" });
  state = play(state, [T(20)]);          // A1 attaque 3
  assert.equal(state.pendingAttackPower, 3);
  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "a2", defenderId: "b2", role: "attack" });

  state = play(state, [D(20)]);          // A2 attaque 2 => attaque équipe A = 5
  assert.equal(state.pendingAttackPower, 5);
  assert.equal(state.duelPhase, "defense");
  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "a1", defenderId: "b1", role: "defense" });

  state = play(state, [S(20)]);          // B1 défend 1 => reste 4
  assert.equal(state.pendingAttackPower, 4);
  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "a2", defenderId: "b2", role: "defense" });
  state = play(state, [D(20)]);          // B2 défend 2 => Team A marque 2
  assert.equal(state.standings.find((row) => row.id === "A")?.total, 2);
  assert.equal(state.inningAdjustmentsByEntity.A[1], 2);

  assert.equal(state.duelPhase, "attack");
  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "b1", defenderId: "a1", role: "attack" });
  state = play(state, [T(20)]);          // B1 attaque 3
  state = play(state, [S(20)]);          // B2 attaque 1 => attaque B = 4
  assert.equal(state.pendingAttackPower, 4);
  assert.equal(state.duelPhase, "defense");

  state = play(state, [D(20)]);          // A1 défend 2 => reste 2
  state = play(state, [S(20)]);          // A2 défend 1 => Team B marque 1

  assert.equal(state.finished, true);
  assert.equal(state.standings.find((row) => row.id === "A")?.total, 2);
  assert.equal(state.standings.find((row) => row.id === "B")?.total, 1);
  assert.equal(state.inningAdjustmentsByEntity.B[1], 1);
  assert.deepEqual(state.history.map((visit) => visit.playerId), ["a1", "a2", "b1", "b2", "b1", "b2", "a1", "a2"]);
  assert.deepEqual(state.history.map((visit) => visit.target), [20, 20, 20, 20, 20, 20, 20, 20]);
  for (const id of ["a1", "a2", "b1", "b2"]) {
    assert.equal(state.statsByPlayer[id].attackVisits, 1);
    assert.equal(state.statsByPlayer[id].defenseVisits, 1);
  }
}

// 12) Duel équipes : si toute l'équipe attaquante fait 0, la défense adverse est sautée.
{
  let state = BaseballEngine.initGame(
    [
      { id: "a1", name: "A1" }, { id: "a2", name: "A2" },
      { id: "b1", name: "B1" }, { id: "b2", name: "B2" },
    ],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, participantMode: "teams", bullTargetMode: "off" }),
    [
      { id: "A", name: "Team A", playerIds: ["a1", "a2"] },
      { id: "B", name: "Team B", playerIds: ["b1", "b2"] },
    ]
  );
  state.target = 20;
  state.targetSequence[0] = 20;
  state = play(state, [MISS]); // A1 = 0
  state = play(state, [S(1)]); // A2 hors cible = 0 => défense B sautée
  assert.equal(state.duelPhase, "attack");
  assert.deepEqual(BaseballEngine.getCurrentDuel(state), { attackerId: "b1", defenderId: "a1", role: "attack" });
  assert.equal(state.inningAdjustmentsByEntity.A[1], 0);
  assert.deepEqual(state.history.map((visit) => visit.playerId), ["a1", "a2"]);
}

// 13) Garde-fou duel équipes : Attaque/Défense refuse plus de 2 équipes.
{
  const state = BaseballEngine.initGame(
    [
      { id: "a1", name: "A1" },
      { id: "b1", name: "B1" },
      { id: "c1", name: "C1" },
    ],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, participantMode: "teams" }),
    [
      { id: "A", name: "Team A", playerIds: ["a1"] },
      { id: "B", name: "Team B", playerIds: ["b1"] },
      { id: "C", name: "Team C", playerIds: ["c1"] },
    ]
  );
  assert.equal(state.rules.gameVariant, "target");
}

console.log("[BASEBALL] 13 regression groups passed — team attack aggregate / defense aggregate");
