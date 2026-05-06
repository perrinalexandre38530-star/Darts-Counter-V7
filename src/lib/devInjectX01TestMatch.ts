// ============================================
// src/lib/devInjectX01TestMatch.ts
// Injection DEV d'une partie X01 fixe JN/SP pour tester X01End / History / StatsHub
// sans rejouer une partie complète.
// ============================================

import { History } from "./history";

type DartHit = { v: number; mult: 0 | 1 | 2 | 3; label?: string };
type VisitRow = {
  idx: number;
  legNo: number;
  playerId: string;
  darts: DartHit[];
  scoreBefore: number;
  scoreAfter: number;
  score: number;
  bust?: boolean;
  finish?: boolean;
  isCheckout?: boolean;
};

const JN_ID = "dev_x01_jean_nunu";
const SP_ID = "dev_x01_salsifi_poilu";
const MATCH_ID = "dev_x01_jn_sp_reference_301_simple_out";

function dart(v: number, mult: 0 | 1 | 2 | 3, label?: string): DartHit {
  return { v, mult, label };
}

function makeVisit(
  idx: number,
  playerId: string,
  before: number,
  after: number,
  score: number,
  darts: DartHit[],
  extra: Partial<VisitRow> = {}
): VisitRow {
  return {
    idx,
    legNo: 1,
    playerId,
    scoreBefore: before,
    scoreAfter: after,
    score,
    darts,
    bust: false,
    finish: false,
    isCheckout: false,
    ...extra,
  };
}

function makeX01ReferenceRecord(now = Date.now()) {
  // Partie demandée : 301 simple in / simple out
  // JN commence : 117, 61, 26, 74, 23 checkout en 2 darts => 14 darts
  // SP : 67, 120, 65, DBULL bust => 10 darts
  const visitHistory: VisitRow[] = [
    makeVisit(1, JN_ID, 301, 184, 117, [dart(16, 2, "D16"), dart(25, 1, "BULL"), dart(20, 3, "T20")]),
    makeVisit(2, SP_ID, 301, 234, 67, [dart(17, 3, "T17"), dart(16, 1, "S16"), dart(0, 0, "MISS")]),
    makeVisit(3, JN_ID, 184, 123, 61, [dart(10, 1, "S10"), dart(10, 3, "T10"), dart(7, 3, "T7")]),
    makeVisit(4, SP_ID, 234, 114, 120, [dart(19, 3, "T19"), dart(25, 2, "DBULL"), dart(13, 1, "S13")]),
    makeVisit(5, JN_ID, 123, 97, 26, [dart(0, 0, "MISS"), dart(20, 1, "S20"), dart(6, 1, "S6")]),
    makeVisit(6, SP_ID, 114, 49, 65, [dart(13, 3, "T13"), dart(25, 1, "BULL"), dart(1, 1, "S1")]),
    makeVisit(7, JN_ID, 97, 23, 74, [dart(18, 3, "T18"), dart(7, 1, "S7"), dart(13, 1, "S13")]),
    makeVisit(8, SP_ID, 49, 49, 0, [dart(25, 2, "DBULL")], { bust: true }),
    makeVisit(9, JN_ID, 23, 0, 23, [dart(11, 1, "S11"), dart(6, 2, "D6")], { finish: true, isCheckout: true }),
  ];

  const players = [
    { id: JN_ID, name: "Jean Nunu", profileId: JN_ID, avatarDataUrl: null, dartSetId: null },
    { id: SP_ID, name: "Salsifi Poilu", profileId: SP_ID, avatarDataUrl: null, dartSetId: null },
  ];

  const detailedByPlayer: Record<string, any> = {
    [JN_ID]: {
      id: JN_ID,
      name: "Jean Nunu",
      darts: 14,
      visits: 5,
      avg3: 64.5,
      totalScore: 301,
      points: 301,
      pointsScored: 301,
      bestVisit: 117,
      bestCheckout: 23,
      highestCheckout: 23,
      checkoutHits: 1,
      checkoutAttempts: 1,
      avgCheckoutDarts: 2,
      dartsCheckout: 2,
      singles: 6,
      doubles: 2,
      triples: 4,
      bulls: 1,
      dbulls: 0,
      misses: 1,
      busts: 0,
      buckets: { "60+": 2, "100+": 1, "140+": 0, "180": 0 },
      powerBuckets: { "60+": 2, "100+": 1, "140+": 0, "180": 0 },
      byNumber: {
        "6": { double: 1, inner: 1 },
        "7": { triple: 1, inner: 1 },
        "10": { inner: 1, triple: 1 },
        "11": { inner: 1 },
        "13": { inner: 1 },
        "16": { double: 1 },
        "18": { triple: 1 },
        "20": { triple: 1, inner: 1 },
        bull: 1,
        dbull: 0,
        miss: 1,
      },
    },
    [SP_ID]: {
      id: SP_ID,
      name: "Salsifi Poilu",
      darts: 10,
      visits: 4,
      avg3: 75.6,
      totalScore: 252,
      points: 252,
      pointsScored: 252,
      bestVisit: 120,
      bestCheckout: 0,
      highestCheckout: 0,
      checkoutHits: 0,
      checkoutAttempts: 1,
      avgCheckoutDarts: 0,
      dartsCheckout: 0,
      singles: 3,
      doubles: 0,
      triples: 3,
      bulls: 1,
      dbulls: 1,
      misses: 1,
      busts: 1,
      buckets: { "60+": 2, "100+": 1, "140+": 0, "180": 0 },
      powerBuckets: { "60+": 2, "100+": 1, "140+": 0, "180": 0 },
      byNumber: {
        "1": { inner: 1 },
        "13": { triple: 1, inner: 1 },
        "16": { inner: 1 },
        "17": { triple: 1 },
        "19": { triple: 1 },
        bull: 1,
        dbull: 1,
        miss: 1,
      },
    },
  };

  const legacy = {
    legNo: 1,
    winnerId: JN_ID,
    finishedAt: now,
    remaining: { [JN_ID]: 0, [SP_ID]: 49 },
    darts: { [JN_ID]: 14, [SP_ID]: 10 },
    visits: { [JN_ID]: 5, [SP_ID]: 4 },
    avg3: { [JN_ID]: 64.5, [SP_ID]: 75.6 },
    bestVisit: { [JN_ID]: 117, [SP_ID]: 120 },
    bestCheckout: { [JN_ID]: 23, [SP_ID]: 0 },
    singles: { [JN_ID]: 6, [SP_ID]: 3 },
    doubles: { [JN_ID]: 2, [SP_ID]: 0 },
    triples: { [JN_ID]: 4, [SP_ID]: 3 },
    bulls: { [JN_ID]: 1, [SP_ID]: 1 },
    dbulls: { [JN_ID]: 0, [SP_ID]: 1 },
    misses: { [JN_ID]: 1, [SP_ID]: 1 },
    busts: { [JN_ID]: 0, [SP_ID]: 1 },
    points: { [JN_ID]: 301, [SP_ID]: 252 },
    h60: { [JN_ID]: 2, [SP_ID]: 2 },
    h100: { [JN_ID]: 1, [SP_ID]: 1 },
    h140: { [JN_ID]: 0, [SP_ID]: 0 },
    h180: { [JN_ID]: 0, [SP_ID]: 0 },
    checkoutHits: { [JN_ID]: 1, [SP_ID]: 0 },
    checkoutAttempts: { [JN_ID]: 1, [SP_ID]: 1 },
    visitHistory,
    visitsHistory: visitHistory,
  };

  const summary = {
    kind: "x01",
    variant: "x01_v3",
    engine: "x01_v3",
    matchId: MATCH_ID,
    winnerId: JN_ID,
    winnerName: "Jean Nunu",
    updatedAt: now,
    game: { mode: "x01", startScore: 301, inMode: "simple", outMode: "simple" },
    players: detailedByPlayer,
    detailedByPlayer,
    perPlayer: detailedByPlayer,
    legacy,
    visitHistory,
    visitsHistory: visitHistory,
    __legStats: { visits: visitHistory },
  };

  const payload = {
    mode: "x01_multi",
    variant: "x01_v3",
    game: "x01",
    startScore: 301,
    matchId: MATCH_ID,
    resumeId: MATCH_ID,
    config: { startScore: 301, inMode: "simple", outMode: "simple", players },
    players,
    finalScores: { [JN_ID]: 0, [SP_ID]: 49 },
    summary,
    visitHistory,
    visitsHistory: visitHistory,
    __legStats: { visits: visitHistory },
  };

  return {
    id: MATCH_ID,
    matchId: MATCH_ID,
    resumeId: MATCH_ID,
    kind: "x01",
    game: { mode: "x01", startScore: 301 },
    status: "finished",
    source: "dev-x01-reference",
    devSim: true,
    createdAt: now,
    updatedAt: now,
    players,
    winnerId: JN_ID,
    summary,
    payload,
    visitHistory,
    visitsHistory: visitHistory,
  };
}

export async function injectDevX01ReferenceMatch() {
  const rec = makeX01ReferenceRecord(Date.now());
  await History.upsert(rec as any);
  try {
    window.dispatchEvent(new CustomEvent("dc:history:changed", { detail: { reason: "dev-x01-reference", id: rec.id } }));
  } catch {
    // noop
  }
  return rec;
}

export const DEV_X01_REFERENCE_MATCH_ID = MATCH_ID;
