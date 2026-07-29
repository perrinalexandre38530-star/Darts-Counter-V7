import assert from "node:assert/strict";
import {
  fingerprintHistoryPayload,
  protectFinishedHistoryPayload,
} from "../src/lib/historyIntegrity.ts";

const cricketRich = {
  mode: "cricket",
  players: [
    {
      id: "chevroute",
      name: "Chevroute",
      hits: Array.from({ length: 114 }, (_, i) => ({ segment: [20, 19, 18, 17, 16, 15, 25][i % 7], mult: (i % 3) + 1 })),
      legStats: { darts: 114, marks: 30, mpr: 0.81, hitRate: 0.386 },
      cricketStats: { totalPoints: 96, totalMarks: 30 },
      marks: { 20: 3, 19: 4, 18: 3, 17: 5, 16: 6, 15: 7, 25: 2 },
    },
    {
      id: "ninja",
      name: "Ninja",
      hits: Array.from({ length: 114 }, (_, i) => ({ segment: [20, 19, 18, 17, 16, 15, 25][i % 7], mult: ((i + 1) % 3) + 1 })),
      legStats: { darts: 114, marks: 35, mpr: 0.92, hitRate: 0.456 },
      cricketStats: { totalPoints: 199, totalMarks: 35 },
      marks: { 20: 7, 19: 3, 18: 10, 17: 7, 16: 5, 15: 3, 25: 0 },
    },
  ],
  cricketEvents: Array.from({ length: 76 }, (_, i) => ({ turn: i + 1, playerId: i % 2 ? "ninja" : "chevroute", marks: i % 6 })),
  cricketDartLog: Array.from({ length: 228 }, (_, i) => ({ dart: i + 1, playerId: i % 2 ? "ninja" : "chevroute", segment: 20 - (i % 6) })),
  stats: { winnerId: "ninja", totalDarts: 228 },
};

const cricketLight = {
  summary: { legs: 1, darts: 228, compact: true, compactBytes: 423, playersCount: 2 },
};

const protectedCricket = protectFinishedHistoryPayload(cricketRich, cricketLight);
assert.equal(protectedCricket.regressionPrevented, true, "Cricket rich -> light must be blocked");
assert.equal(protectedCricket.payload.players[0].hits.length, 114);
assert.equal(protectedCricket.payload.players[1].cricketStats.totalPoints, 199);
assert.equal(protectedCricket.payload.cricketDartLog.length, 228);
assert.ok(protectedCricket.merged.jsonBytes >= protectedCricket.previous.jsonBytes * 0.95);

const enriched = {
  ...cricketRich,
  stats: { ...cricketRich.stats, tournamentRound: "final" },
  extraAnalytics: { pressureVisits: 12 },
};
const protectedEnrichment = protectFinishedHistoryPayload(cricketRich, enriched);
assert.equal(protectedEnrichment.payload.extraAnalytics.pressureVisits, 12, "Enrichment must be accepted");
assert.equal(protectedEnrichment.payload.players[0].hits.length, 114);

const x01Rich = {
  config: { startScore: 501 },
  darts: Array.from({ length: 45 }, (_, i) => ({ v: (i % 20) + 1, mult: 1 })),
  visitHistory: Array.from({ length: 15 }, (_, i) => ({ idx: i + 1, score: 60 - i })),
  summary: { detailedByPlayer: { ninja: { darts: 45, hitsS: 30, hitsT: 5 } } },
};
const x01Light = { summary: { winnerName: "Ninja" } };
const protectedX01 = protectFinishedHistoryPayload(x01Rich, x01Light);
assert.equal(protectedX01.regressionPrevented, true, "X01 rich -> summary-only must be blocked");
assert.equal(protectedX01.payload.darts.length, 45);
assert.equal(protectedX01.payload.config.startScore, 501);

const fpRich = fingerprintHistoryPayload(cricketRich);
const fpLight = fingerprintHistoryPayload(cricketLight);
assert.ok(fpRich.score > fpLight.score * 3, "Richness fingerprint must clearly separate detailed Cricket from 423B-like summary");

console.log("✅ HISTORY INTEGRITY REGRESSION OK");
console.log({ richBytes: fpRich.jsonBytes, lightBytes: fpLight.jsonBytes, richScore: fpRich.score, lightScore: fpLight.score });
