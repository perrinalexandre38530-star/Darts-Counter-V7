import assert from "node:assert/strict";
import {
  advanceDartsPokerRound,
  createDartsPokerState,
  evaluateBestPokerHand,
  finishDartsPokerHand,
  openDartsPokerChoice,
  playDartsPokerVisit,
  resolveDartsPokerChoice,
  useDartsPokerExchange,
  type DartsPokerConfigPayload,
  type PokerCard,
} from "../src/lib/gameEngines/dartsPokerEngine.ts";
import { decodeCompactMatch, encodeCompactMatch } from "../src/lib/matchCompactCodec.ts";

const card = (rank: number, suit: "S" | "H" | "D" | "C"): PokerCard => ({ id: `${suit}${rank}`, rank, suit });
const joker: PokerCard = { id: "JOKER", rank: 15, suit: null, joker: true };

const royal = evaluateBestPokerHand([card(10,"H"), card(11,"H"), card(12,"H"), card(13,"H"), card(14,"H")]);
assert.equal(royal?.category, "royal_flush");

const wheel = evaluateBestPokerHand([card(14,"S"), card(2,"H"), card(3,"D"), card(4,"C"), card(5,"S")]);
assert.equal(wheel?.category, "straight");
assert.equal(wheel?.tiebreak[0], 5);

const full = evaluateBestPokerHand([card(9,"S"), card(9,"H"), card(9,"D"), card(4,"C"), card(4,"S")]);
assert.equal(full?.category, "full_house");

const jokerRoyal = evaluateBestPokerHand([card(10,"S"), card(11,"S"), card(12,"S"), card(13,"S"), joker]);
assert.equal(jokerRoyal?.category, "royal_flush");

const config: DartsPokerConfigPayload = {
  mode: "darts_poker",
  players: 2,
  selectedIds: ["p1", "p2"],
  botLevel: "normal",
  rounds: 3,
  dartsPerHand: 6,
  powersEnabled: true,
  jokerEnabled: true,
  autoDrawMissing: true,
  openHands: true,
  randomOrder: false,
  scoreInputMethod: "keypad",
};
const rng = () => 0.314159;
let state = createDartsPokerState([{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }], config, rng);
assert.equal(Object.keys(state.market).length, 20);
assert.equal(state.deck.length, 32);

const rotationSequence = [
  { playerId: "p1", dart: { bed: "S", number: 1 } },
  { playerId: "p2", dart: { bed: "MISS" } },
  { playerId: "p1", dart: { bed: "D", number: 2 } },
  { playerId: "p2", dart: { bed: "MISS" } },
  { playerId: "p1", dart: { bed: "T", number: 3 } },
  { playerId: "p2", dart: { bed: "MISS" } },
  { playerId: "p1", dart: { bed: "OB" } },
  { playerId: "p2", dart: { bed: "MISS" } },
  { playerId: "p1", dart: { bed: "IB" } },
  { playerId: "p2", dart: { bed: "MISS" } },
  { playerId: "p1", dart: { bed: "MISS" } },
  { playerId: "p2", dart: { bed: "MISS" } },
] as const;

rotationSequence.forEach((step, index) => {
  assert.equal(state.players[state.activePlayerIndex]?.id, step.playerId, `mauvais joueur actif avant la fléchette ${index + 1}`);
  state = playDartsPokerVisit(state, [step.dart as any], rng);
  if (index < rotationSequence.length - 1) {
    assert.notEqual(state.players[state.activePlayerIndex]?.id, step.playerId, `la main n'a pas tourné après la fléchette ${index + 1}`);
  }
});

assert.equal(state.phase, "powers");
assert.equal(state.activePlayerIndex, 0);
assert.equal(state.handsByPlayer.p1.dartsUsed, 6);
assert.equal(state.handsByPlayer.p2.dartsUsed, 6);
assert.equal(state.handsByPlayer.p1.exchangeTokens, 1);
assert.equal(state.handsByPlayer.p1.choiceTokens, 2);
assert.equal(state.statsByPlayer.p1.jokers, 1);
assert.equal(state.statsByPlayer.p1.darts, 6);
assert.equal(state.statsByPlayer.p2.darts, 6);
assert.equal(state.visits.length, 12);

state = openDartsPokerChoice(state, rng);
assert.equal(state.pendingChoice?.cards.length, 2);
state = resolveDartsPokerChoice(state, 0);
assert.equal(state.handsByPlayer.p1.choiceTokens, 1);
state = useDartsPokerExchange(state, 0, rng);
assert.equal(state.handsByPlayer.p1.exchangeTokens, 0);
state = finishDartsPokerHand(state, rng);
assert.equal(state.activePlayerIndex, 1);
assert.equal(state.phase, "powers");
assert.equal(state.statsByPlayer.p1.handsPlayed, 1);
assert.ok(state.handsByPlayer.p1.evaluation);

state = finishDartsPokerHand(state, rng);
assert.equal(state.phase, "round_result");
assert.equal(state.rounds.length, 1);
assert.equal(state.statsByPlayer.p2.autoDraws, 5);
assert.equal(state.rounds[0].rows.length, 2);

state = advanceDartsPokerRound(state, rng);
assert.equal(state.phase, "throwing");
assert.equal(state.roundIndex, 2);
assert.equal(state.activePlayerIndex, 0);
assert.equal(state.handsByPlayer.p1.cards.length, 0);
assert.equal(Object.keys(state.market).length, 20);

const compact = encodeCompactMatch({
  id: "poker-regression",
  kind: "darts_poker",
  mode: "darts_poker",
  sport: "darts",
  status: "in_progress",
  createdAt: Date.now(),
  players: [
    { id: "p1", name: "Alice", ...state.statsByPlayer.p1 },
    { id: "p2", name: "Bob", ...state.statsByPlayer.p2 },
  ],
  payload: {
    kind: "darts_poker",
    mode: "darts_poker",
    sport: "darts",
    config,
    players: [
      { id: "p1", name: "Alice", ...state.statsByPlayer.p1 },
      { id: "p2", name: "Bob", ...state.statsByPlayer.p2 },
    ],
    stateSnapshot: state,
    rounds: state.rounds,
    visits: state.visits,
    stats: { mode: "darts_poker", sport: "darts", players: [], match: { totalDarts: 12 } },
    summary: { mode: "darts_poker", roundsPlayed: state.rounds.length },
  },
});
assert.equal(compact?.m, "darts_poker");
assert.ok(compact?.d?.pk?.stateSnapshot?.market, "snapshot Poker absent du compact");
const decoded = decodeCompactMatch(compact);
assert.equal(decoded?.mode, "darts_poker");
assert.equal(decoded?.stats?.mode, "darts_poker");
assert.equal(Object.keys(decoded?.stateSnapshot?.market || {}).length, 20);

console.log("Darts Poker regression: OK");
