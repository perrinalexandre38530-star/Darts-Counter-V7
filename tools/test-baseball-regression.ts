import assert from "node:assert/strict";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
} from "../src/lib/gameEngines/baseballEngine.ts";

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

// 6) Variante Attaque/Défense : 6 en attaque - 5 en défense = 1 point.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ gameVariant: "attack_defense", innings: 1, extraInnings: false, bullTargetMode: "off" })
  );
  assert.equal(state.duelPhase, "attack");
  state = play(state, [T(5), S(8), D(13)]); // A attaque = 6
  assert.equal(state.duelPhase, "defense");
  assert.equal(state.pendingAttackPower, 6);
  state = play(state, [T(7), S(5), S(4)]); // B défend = 5 => A +1
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 1);
  assert.equal(state.duelPhase, "attack");
  state = play(state, [D(1), D(2), D(3)]); // B attaque = 6
  state = play(state, [T(1), T(2), T(3)]); // A défend = 9 => B +0
  assert.equal(state.finished, true);
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 1);
  assert.equal(state.standings.find((row) => row.id === "p2")?.total, 0);
  assert.equal(state.statsByPlayer.p1.attackPower, 6);
  assert.equal(state.statsByPlayer.p2.runsPrevented, 5);
}

// 7) Variante duel + BULL Défense : l'effet spécial ne s'applique que pendant le rôle DÉFENSE.
{
  let state = BaseballEngine.initGame(
    [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
    rules({ gameVariant: "attack_defense", innings: 2, extraInnings: false, bullTargetMode: "defense", bullBonusPoints: 4 })
  );
  // Première paire : A attaque 6, B défend 5 => A prend 1 puis le BULL défensif ne peut pas enlever sous 0 avant résolution.
  state = play(state, [T(5), S(8), D(13)]);
  state = play(state, [T(7), S(5), BULL]); // puissance 7, donc aucun point A ; effet BULL sur A reste borné à 0
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 0);
  // B attaque 6, A défend 0 => B prend 6.
  state = play(state, [T(1), D(2), S(3)]);
  state = play(state, [MISS]);
  assert.equal(state.standings.find((row) => row.id === "p2")?.total, 6);
  // Manche 2 : BULL défensif de B doit retirer 4 à A si A a marqué avant.
  state = play(state, [T(1), T(2), T(3)]); // A attaque 9
  state = play(state, [BULL]); // B défense puissance 3 + retire 0 à A avant attribution ; net A=6
  assert.equal(state.standings.find((row) => row.id === "p1")?.total, 6);
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

console.log("[BASEBALL] 9 regression groups passed");
