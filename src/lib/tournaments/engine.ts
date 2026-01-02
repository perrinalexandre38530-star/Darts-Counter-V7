// ============================================
// src/lib/tournaments/engine.ts
// Engine tournois LOCAL — V2
// ✅ 4 types: single_ko / double_ko / round_robin / groups_ko
// ✅ Repêchage: stage dédié (phase="repechage") + onglet possible
// ✅ Brackets: mapping nextMatchId/nextSlot + TBD via aFromMatchId/bFromMatchId
// ✅ RR: schedule "circle method" + standings basiques
// ✅ Auto-advance BYE (winner direct)
// ✅ submitResult: propage vainqueur au match suivant
//
// ✅ FIX IMPORTANT (2026-01):
// - groupIndex est UNIQUEMENT pour les matchs de POULES.
// - Les matchs KO / losers / grand final / repechage doivent avoir groupIndex = -1
//   Sinon l'UI croit que tous les KO appartiennent à la "Poule A".
// ============================================

import type {
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentStage,
  TournamentViewKind,
  StageRole,
} from "./types";

const BYE = "__BYE__";
const TBD = "__TBD__";

function now() {
  return Date.now();
}

function uid(prefix = "m") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pow2Ceil(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function stageRoleDefault(viewKind: TournamentViewKind, stage: TournamentStage, idx: number): StageRole {
  if (stage.role) return stage.role;
  if (stage.type === "round_robin") return "groups";
  // KO / double / etc :
  if (viewKind === "groups_ko" && idx === 0) return "groups";
  return "ko";
}

export function createTournamentDraft(opts: {
  name: string;
  source: "local" | "online";
  ownerProfileId?: string | null;
  players: TournamentPlayer[];
  game: { mode: any; rules: Record<string, any> };
  stages: TournamentStage[];
  viewKind: TournamentViewKind;
  repechage?: { enabled: boolean; slotsToKo?: number; afterKoRoundIndex?: number };
}): Tournament {
  const t = now();
  const id = uid("tour");
  return {
    id,
    source: opts.source,
    name: opts.name,
    status: "draft",
    createdAt: t,
    updatedAt: t,
    ownerProfileId: opts.ownerProfileId ?? null,
    players: opts.players || [],
    viewKind: opts.viewKind,
    repechage: opts.repechage ? { enabled: !!opts.repechage.enabled, ...opts.repechage } : { enabled: false },
    stages: (opts.stages || []).map((s, i) => ({
      ...s,
      role: s.role ?? stageRoleDefault(opts.viewKind, s, i),
    })),
    game: opts.game as any,
    currentStageIndex: 0,
  };
}

/* -------------------------------------------
   RR Schedule (circle method)
-------------------------------------------- */

function buildRoundRobinSchedule(playerIds: string[]) {
  const ids = playerIds.slice();
  if (ids.length % 2 === 1) ids.push(BYE);
  const n = ids.length;
  const rounds = n - 1;

  const fixed = ids[0];
  let rot = ids.slice(1);

  const pairsByRound: Array<Array<[string, string]>> = [];

  for (let r = 0; r < rounds; r++) {
    const roundPairs: Array<[string, string]> = [];
    const left = [fixed, ...rot.slice(0, (n / 2) - 1)];
    const right = rot.slice((n / 2) - 1).slice().reverse();

    for (let i = 0; i < n / 2; i++) {
      const a = left[i];
      const b = right[i];
      roundPairs.push([a, b]);
    }

    pairsByRound.push(roundPairs);

    // rotate
    rot = [rot[rot.length - 1], ...rot.slice(0, rot.length - 1)];
  }

  return pairsByRound; // rounds -> pairs
}

function computeStandingsFromMatches(playerIds: string[], matches: TournamentMatch[]) {
  const rows: Record<string, { id: string; played: number; wins: number; losses: number; points: number; scored: number; conceded: number }> = {};
  for (const pid of playerIds) {
    rows[pid] = { id: pid, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
  }

  for (const m of matches) {
    if (String(m.status) !== "done") continue;
    const a = String(m.aPlayerId || "");
    const b = String(m.bPlayerId || "");
    if (!a || !b) continue;
    if (isByeId(a) || isByeId(b) || isTbdId(a) || isTbdId(b)) continue;

    if (!rows[a]) rows[a] = { id: a, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
    if (!rows[b]) rows[b] = { id: b, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

    const sa = typeof (m as any).scoreA === "number" ? (m as any).scoreA : 0;
    const sb = typeof (m as any).scoreB === "number" ? (m as any).scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m.winnerId || "");
    if (w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const arr = Object.values(rows);
  arr.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    const d1 = r1.scored - r1.conceded;
    const d2 = r2.scored - r2.conceded;
    if (d2 !== d1) return d2 - d1;
    return r2.wins - r1.wins;
  });

  return arr;
}

/* -------------------------------------------
   Bracket Single Elim builder
-------------------------------------------- */

function buildSingleElimBracket(opts: {
  tournamentId: string;
  stageIndex: number;
  phase: StageRole;
  playerIds: string[];
  seeding?: "random" | "manual" | "by_rating";
  createdAt: number;
}): TournamentMatch[] {
  const { tournamentId, stageIndex, phase, seeding, createdAt } = opts;

  const ids = (opts.playerIds || []).filter(Boolean).map(String);
  let seeded = ids.slice();

  // seeding basic: random
  if (seeding === "random" || !seeding) seeded = shuffle(seeded);

  const size = pow2Ceil(seeded.length);
  while (seeded.length < size) seeded.push(BYE);

  const matches: TournamentMatch[] = [];
  const rounds = Math.log2(size) | 0;

  const matchIdAt: Record<string, string> = {}; // key: R{r}_M{o} -> id

  // create matches per round
  let orderGlobal = 0;
  for (let r = 0; r < rounds; r++) {
    const mCount = size / (2 ** (r + 1));
    for (let o = 0; o < mCount; o++) {
      const id = uid(`ko_s${stageIndex}_r${r}_m${o}`);
      matchIdAt[`R${r}_M${o}`] = id;

      const m: TournamentMatch = {
        id,
        tournamentId,
        stageIndex,

        // IMPORTANT: groupIndex est UNIQUEMENT pour les matchs de poules.
        // Si on laisse 0 ici, l’UI croit que tout est "Poule A" (même les KO).
        groupIndex: -1,

        roundIndex: r,
        orderIndex: orderGlobal++,
        aPlayerId: TBD,
        bPlayerId: TBD,
        status: "pending",
        winnerId: null,
        createdAt,
        updatedAt: createdAt,
        nextMatchId: null,
        nextSlot: null,
        aFromMatchId: null,
        bFromMatchId: null,
        phase,
      };
      matches.push(m);
    }
  }

  // fill first round participants
  const firstRoundCount = size / 2;
  for (let o = 0; o < firstRoundCount; o++) {
    const m = matches.find((x) => x.id === matchIdAt[`R0_M${o}`])!;
    const a = seeded[o * 2];
    const b = seeded[o * 2 + 1];
    m.aPlayerId = a || BYE;
    m.bPlayerId = b || BYE;

    // auto-wire sources for round0 (optional)
    m.aFromMatchId = null;
    m.bFromMatchId = null;
  }

  // wire nextMatchId / nextSlot + set feeder refs (aFromMatchId/bFromMatchId) for next matches
  for (let r = 0; r < rounds - 1; r++) {
    const mCount = size / (2 ** (r + 1));
    for (let o = 0; o < mCount; o++) {
      const curId = matchIdAt[`R${r}_M${o}`];
      const nextO = (o / 2) | 0;
      const nextId = matchIdAt[`R${r + 1}_M${nextO}`];
      const nextSlot: "a" | "b" = o % 2 === 0 ? "a" : "b";

      const cur = matches.find((x) => x.id === curId)!;
      cur.nextMatchId = nextId;
      cur.nextSlot = nextSlot;

      const next = matches.find((x) => x.id === nextId)!;
      if (nextSlot === "a") next.aFromMatchId = curId;
      else next.bFromMatchId = curId;
    }
  }

  // auto-advance BYE in round0
  for (const m of matches.filter((x) => x.roundIndex === 0)) {
    const a = String(m.aPlayerId || "");
    const b = String(m.bPlayerId || "");
    if (isByeId(a) && isByeId(b)) {
      // void bye
      m.status = "done";
      m.winnerId = null;
      m.updatedAt = now();
      continue;
    }
    if (isByeId(a) && !isByeId(b)) {
      m.status = "done";
      m.winnerId = b;
      m.updatedAt = now();
    } else if (isByeId(b) && !isByeId(a)) {
      m.status = "done";
      m.winnerId = a;
      m.updatedAt = now();
    }
  }

  return matches;
}

/* -------------------------------------------
   Double Elim (simplifié mais fonctionnel)
   - winners bracket (SE)
   - losers bracket (SE) : alimenté par losers winners R0.. etc via TBD feeders
   - grand final: winner(W) vs winner(L)
   NOTE: pour N puissance de 2 uniquement propre. Pour le reste : ok (BYE).
-------------------------------------------- */

function buildDoubleElimBracket(opts: {
  tournamentId: string;
  stageIndexW: number;
  stageIndexL: number;
  stageIndexGF: number;
  playerIds: string[];
  seeding?: "random" | "manual" | "by_rating";
  createdAt: number;
}): TournamentMatch[] {
  const tId = opts.tournamentId;
  const createdAt = opts.createdAt;
  const seeded = (opts.seeding === "random" || !opts.seeding) ? shuffle(opts.playerIds.slice()) : opts.playerIds.slice();

  // winners bracket
  const winners = buildSingleElimBracket({
    tournamentId: tId,
    stageIndex: opts.stageIndexW,
    phase: "ko",
    playerIds: seeded,
    seeding: "manual",
    createdAt,
  });

  // losers bracket: size = pow2Ceil(n) ; rounds in losers = (2*roundsW - 1)
  const size = pow2Ceil(seeded.length);
  const roundsW = Math.log2(size) | 0;
  const roundsL = Math.max(1, 2 * roundsW - 1);

  const losers: TournamentMatch[] = [];
  const idAt: Record<string, string> = {};
  let order = 0;

  // build L rounds structure: roundIndex 0..roundsL-1
  const countForL = (lr: number) => {
    const k = (lr / 2) | 0;
    const base = size / (2 ** (k + 2)); // size/4, size/8, size/16...
    return Math.max(1, base);
  };

  for (let lr = 0; lr < roundsL; lr++) {
    const mCount = countForL(lr);
    for (let o = 0; o < mCount; o++) {
      const id = uid(`lb_s${opts.stageIndexL}_r${lr}_m${o}`);
      idAt[`L${lr}_M${o}`] = id;
      losers.push({
        id,
        tournamentId: tId,
        stageIndex: opts.stageIndexL,

        // Losers bracket = KO (jamais une poule)
        groupIndex: -1,

        roundIndex: lr,
        orderIndex: order++,
        aPlayerId: TBD,
        bPlayerId: TBD,
        status: "pending",
        winnerId: null,
        createdAt,
        updatedAt: createdAt,
        nextMatchId: null,
        nextSlot: null,
        aFromMatchId: null,
        bFromMatchId: null,
        phase: "repechage",
      });
    }
  }

  // link losers rounds sequentially
  for (let lr = 0; lr < roundsL - 1; lr++) {
    const mCount = countForL(lr);
    for (let o = 0; o < mCount; o++) {
      const cur = losers.find((m) => m.id === idAt[`L${lr}_M${o}`])!;
      const nextCount = countForL(lr + 1);
      const nextO = (nextCount === mCount) ? o : ((o / 2) | 0);
      const next = losers.find((m) => m.id === idAt[`L${lr + 1}_M${nextO}`])!;
      cur.nextMatchId = next.id;
      cur.nextSlot = (nextCount === mCount) ? (o % 2 === 0 ? "a" : "b") : (o % 2 === 0 ? "a" : "b");
      if (cur.nextSlot === "a") next.aFromMatchId = cur.id;
      else next.bFromMatchId = cur.id;
    }
  }

  // feed L0 from losers of winners R0
  const wR0 = winners.filter((m) => m.roundIndex === 0);
  const l0Count = countForL(0);
  for (let i = 0; i < Math.min(l0Count, wR0.length / 2); i++) {
    const mL = losers.find((m) => m.id === idAt[`L0_M${i}`])!;
    const w1 = wR0[i * 2];
    const w2 = wR0[i * 2 + 1];
    mL.aFromMatchId = w1.id;
    mL.bFromMatchId = w2.id;
  }

  // grand final
  const gfId = uid(`gf_s${opts.stageIndexGF}`);
  const grandFinal: TournamentMatch[] = [
    {
      id: gfId,
      tournamentId: tId,
      stageIndex: opts.stageIndexGF,

      // Grand Final = KO (jamais une poule)
      groupIndex: -1,

      roundIndex: 0,
      orderIndex: 0,
      aPlayerId: TBD,
      bPlayerId: TBD,
      status: "pending",
      winnerId: null,
      createdAt,
      updatedAt: createdAt,
      nextMatchId: null,
      nextSlot: null,
      aFromMatchId: null,
      bFromMatchId: null,
      phase: "ko",
    },
  ];

  // winners champion feeds GF.a, losers champion feeds GF.b
  const wFinal = winners.filter((m) => m.nextMatchId == null).slice(-1)[0];
  const lFinal = losers.filter((m) => m.nextMatchId == null).slice(-1)[0];
  if (wFinal) {
    grandFinal[0].aFromMatchId = wFinal.id;
    wFinal.nextMatchId = gfId;
    wFinal.nextSlot = "a";
  }
  if (lFinal) {
    grandFinal[0].bFromMatchId = lFinal.id;
    lFinal.nextMatchId = gfId;
    lFinal.nextSlot = "b";
  }

  return [...winners, ...losers, ...grandFinal];
}

/* -------------------------------------------
   Build Initial Matches for all viewKinds
-------------------------------------------- */

export function buildInitialMatches(tour: Tournament): TournamentMatch[] {
  const t = now();
  const tournamentId = tour.id;
  const players = (tour.players || []).map((p) => String(p.id)).filter(Boolean);

  const stages = tour.stages || [];
  const out: TournamentMatch[] = [];

  // helper
  const stageAt = (i: number) => stages[i];
  const roleOf = (i: number) => stageAt(i)?.role || stageRoleDefault(tour.viewKind, stageAt(i), i);

  if (tour.viewKind === "round_robin") {
    const st = stageAt(0);
    const groups = Math.max(1, Number(st?.groups || 1));
    const roundsRR = Math.max(1, Number(st?.rounds || 1));
    const ids = shuffle(players);

    // split into groups
    const buckets: string[][] = Array.from({ length: groups }, () => []);
    for (let i = 0; i < ids.length; i++) buckets[i % groups].push(ids[i]);

    let orderIndex = 0;
    for (let g = 0; g < groups; g++) {
      const base = buckets[g];
      for (let rep = 0; rep < roundsRR; rep++) {
        const schedule = buildRoundRobinSchedule(base);
        for (let r = 0; r < schedule.length; r++) {
          const pairs = schedule[r];
          for (let m = 0; m < pairs.length; m++) {
            const [a, b] = pairs[m];
            const id = uid(`rr_s0_g${g}_r${r}_m${m}`);
            out.push({
              id,
              tournamentId,
              stageIndex: 0,
              groupIndex: g,
              roundIndex: r + rep * schedule.length,
              orderIndex: orderIndex++,
              aPlayerId: a,
              bPlayerId: b,
              status: "pending",
              winnerId: null,
              createdAt: t,
              updatedAt: t,
              phase: roleOf(0),
            });
          }
        }
      }
    }

    // auto-advance BYE (RR): mark done winner = real
    for (const m of out) {
      const a = String(m.aPlayerId || "");
      const b = String(m.bPlayerId || "");
      if (isByeId(a) && !isByeId(b)) {
        m.status = "done";
        m.winnerId = b;
        m.updatedAt = now();
      } else if (isByeId(b) && !isByeId(a)) {
        m.status = "done";
        m.winnerId = a;
        m.updatedAt = now();
      } else if (isByeId(a) && isByeId(b)) {
        m.status = "done";
        m.winnerId = null;
        m.updatedAt = now();
      }
    }

    return out;
  }

  if (tour.viewKind === "single_ko") {
    const st = stageAt(0);
    out.push(
      ...buildSingleElimBracket({
        tournamentId,
        stageIndex: 0,
        phase: "ko",
        playerIds: players,
        seeding: (st?.seeding as any) || "random",
        createdAt: t,
      })
    );
    return applyAutoProgress(tour, out);
  }

  if (tour.viewKind === "double_ko") {
    const matches = buildDoubleElimBracket({
      tournamentId,
      stageIndexW: 0,
      stageIndexL: 1,
      stageIndexGF: 2,
      playerIds: players,
      seeding: "random",
      createdAt: t,
    });
    return applyAutoProgress(tour, matches);
  }

  // groups_ko
  if (tour.viewKind === "groups_ko") {
    const stRR = stageAt(0);
    const stKO = stageAt(1);

    const groups = Math.max(1, Number(stRR?.groups || 2));
    const qualifiers = Math.max(1, Number(stRR?.qualifiersPerGroup || 2));
    const roundsRR = Math.max(1, Number(stRR?.rounds || 1));

    const ids = shuffle(players);

    // split into groups
    const buckets: string[][] = Array.from({ length: groups }, () => []);
    for (let i = 0; i < ids.length; i++) buckets[i % groups].push(ids[i]);

    let orderIndex = 0;

    // RR matches stageIndex 0
    for (let g = 0; g < groups; g++) {
      const base = buckets[g];
      for (let rep = 0; rep < roundsRR; rep++) {
        const schedule = buildRoundRobinSchedule(base);
        for (let r = 0; r < schedule.length; r++) {
          const pairs = schedule[r];
          for (let m = 0; m < pairs.length; m++) {
            const [a, b] = pairs[m];
            const id = uid(`rr_s0_g${g}_r${r}_m${m}`);
            out.push({
              id,
              tournamentId,
              stageIndex: 0,
              groupIndex: g,
              roundIndex: r + rep * schedule.length,
              orderIndex: orderIndex++,
              aPlayerId: a,
              bPlayerId: b,
              status: "pending",
              winnerId: null,
              createdAt: t,
              updatedAt: t,
              phase: "groups",
            });
          }
        }
      }
    }

    // KO bracket stageIndex 1 built with TBD for participants (filled when poules terminées)
    const koSize = pow2Ceil(groups * qualifiers);
    const koSlots: string[] = Array.from({ length: koSize }, () => TBD);

    out.push(
      ...buildSingleElimBracket({
        tournamentId,
        stageIndex: 1,
        phase: "ko",
        playerIds: koSlots,
        seeding: (stKO?.seeding as any) || "random",
        createdAt: t,
      }).map((m) => m)
    );

    // repêchage option : stageIndex 2
    if (tour.repechage?.enabled) {
      const repSlots: string[] = Array.from({ length: pow2Ceil(Math.max(2, players.length - groups * qualifiers)) }, () => TBD);
      out.push(
        ...buildSingleElimBracket({
          tournamentId,
          stageIndex: 2,
          phase: "repechage",
          playerIds: repSlots,
          seeding: "random",
          createdAt: t,
        })
      );
    }

    // auto BYE RR + propagate
    for (const m of out.filter((x) => x.stageIndex === 0)) {
      const a = String(m.aPlayerId || "");
      const b = String(m.bPlayerId || "");
      if (isByeId(a) && !isByeId(b)) {
        m.status = "done";
        m.winnerId = b;
        m.updatedAt = now();
      } else if (isByeId(b) && !isByeId(a)) {
        m.status = "done";
        m.winnerId = a;
        m.updatedAt = now();
      } else if (isByeId(a) && isByeId(b)) {
        m.status = "done";
        m.winnerId = null;
        m.updatedAt = now();
      }
    }

    return applyAutoProgress(tour, out);
  }

  return out;
}

/* -------------------------------------------
   Progression logic
-------------------------------------------- */

function setSlot(target: TournamentMatch, slot: "a" | "b", playerId: string) {
  if (slot === "a") target.aPlayerId = playerId;
  else target.bPlayerId = playerId;
}

function loserId(m: TournamentMatch) {
  const w = String(m.winnerId || "");
  const a = String(m.aPlayerId || "");
  const b = String(m.bPlayerId || "");
  if (!w) return "";
  if (w === a) return b;
  if (w === b) return a;
  return "";
}

function applyWinnerToNext(matches: TournamentMatch[], m: TournamentMatch) {
  const nextId = m.nextMatchId ? String(m.nextMatchId) : "";
  const slot = (m.nextSlot as any) as "a" | "b" | null;
  const w = String(m.winnerId || "");
  if (!nextId || !slot || !w) return;

  const next = matches.find((x) => String(x.id) === nextId);
  if (!next) return;

  const cur = slot === "a" ? String(next.aPlayerId || "") : String(next.bPlayerId || "");
  if (!cur || isTbdId(cur) || isByeId(cur)) {
    setSlot(next, slot, w);
    next.updatedAt = now();
  }
}

function applyLoserToRepechageIfFeeder(matches: TournamentMatch[], m: TournamentMatch) {
  const mid = String(m.id || "");
  if (!mid) return;
  const l = loserId(m);
  if (!l) return;

  for (const target of matches) {
    if (String(target.phase) !== "repechage") continue;

    if (String(target.aFromMatchId || "") === mid) {
      const cur = String(target.aPlayerId || "");
      if (!cur || isTbdId(cur)) {
        target.aPlayerId = l;
        target.updatedAt = now();
      }
    }
    if (String(target.bFromMatchId || "") === mid) {
      const cur = String(target.bPlayerId || "");
      if (!cur || isTbdId(cur)) {
        target.bPlayerId = l;
        target.updatedAt = now();
      }
    }
  }
}

function applyByeAutoDone(matches: TournamentMatch[]) {
  for (const m of matches) {
    if (String(m.status) !== "pending") continue;
    const a = String(m.aPlayerId || "");
    const b = String(m.bPlayerId || "");
    if (!a || !b) continue;

    if (isByeId(a) && isByeId(b)) {
      m.status = "done";
      m.winnerId = null;
      m.updatedAt = now();
    } else if (isByeId(a) && !isByeId(b) && !isTbdId(b)) {
      m.status = "done";
      m.winnerId = b;
      m.updatedAt = now();
    } else if (isByeId(b) && !isByeId(a) && !isTbdId(a)) {
      m.status = "done";
      m.winnerId = a;
      m.updatedAt = now();
    }
  }
}

function applyAutoProgress(tour: Tournament, matches: TournamentMatch[]) {
  let changed = true;
  let guard = 0;

  while (changed && guard++ < 50) {
    changed = false;

    const before = JSON.stringify(matches.map((m) => [m.id, m.status, m.winnerId, m.aPlayerId, m.bPlayerId]));
    applyByeAutoDone(matches);

    for (const m of matches) {
      if (String(m.status) !== "done") continue;
      applyWinnerToNext(matches, m);
      applyLoserToRepechageIfFeeder(matches, m);
    }

    if (tour.viewKind === "groups_ko") {
      const rrDone = matches.filter((m) => m.stageIndex === 0).every((m) => String(m.status) === "done");
      if (rrDone) {
        const rrMatches = matches.filter((m) => m.stageIndex === 0);
        const stRR = tour.stages[0];
        const groups = Math.max(1, Number(stRR?.groups || 2));
        const qualifiers = Math.max(1, Number(stRR?.qualifiersPerGroup || 2));

        const groupPlayers: string[][] = Array.from({ length: groups }, () => []);
        for (const pid of (tour.players || []).map((p) => String(p.id))) {
          const mm = rrMatches.find((m) => m.aPlayerId === pid || m.bPlayerId === pid);
          if (mm) groupPlayers[mm.groupIndex] = Array.from(new Set([...groupPlayers[mm.groupIndex], pid]));
        }

        const qualifiersIds: string[] = [];
        for (let g = 0; g < groups; g++) {
          const pids = groupPlayers[g].filter((x) => x && !isByeId(x));
          const groupMatches = rrMatches.filter((m) => m.groupIndex === g);
          const standings = computeStandingsFromMatches(pids, groupMatches);
          qualifiersIds.push(...standings.slice(0, qualifiers).map((r) => r.id));
        }

        const koR0 = matches.filter((m) => m.stageIndex === 1 && m.roundIndex === 0);
        const slots: string[] = qualifiersIds.slice();
        const size = pow2Ceil(slots.length);
        while (slots.length < size) slots.push(BYE);

        for (let i = 0; i < koR0.length; i++) {
          const m = koR0[i];
          const a = slots[i * 2] ?? BYE;
          const b = slots[i * 2 + 1] ?? BYE;
          const curA = String(m.aPlayerId || "");
          const curB = String(m.bPlayerId || "");
          if (isTbdId(curA) || !curA) {
            m.aPlayerId = a;
            m.updatedAt = now();
          }
          if (isTbdId(curB) || !curB) {
            m.bPlayerId = b;
            m.updatedAt = now();
          }
        }

        if (tour.repechage?.enabled) {
          const allIds = (tour.players || []).map((p) => String(p.id)).filter(Boolean);
          const nonQual = allIds.filter((x) => !qualifiersIds.includes(x));
          const repR0 = matches.filter((m) => m.stageIndex === 2 && m.roundIndex === 0);
          const repSlots = shuffle(nonQual.slice());
          const repSize = pow2Ceil(Math.max(2, repSlots.length));
          while (repSlots.length < repSize) repSlots.push(BYE);

          for (let i = 0; i < repR0.length; i++) {
            const m = repR0[i];
            if (isTbdId(m.aPlayerId)) m.aPlayerId = repSlots[i * 2] ?? BYE;
            if (isTbdId(m.bPlayerId)) m.bPlayerId = repSlots[i * 2 + 1] ?? BYE;
          }
        }
      }
    }

    const after = JSON.stringify(matches.map((m) => [m.id, m.status, m.winnerId, m.aPlayerId, m.bPlayerId]));
    if (before !== after) changed = true;
  }

  return matches;
}

/* -------------------------------------------
   Public API
-------------------------------------------- */

export function getPlayableMatches(tour: Tournament, matches: TournamentMatch[]) {
  const arr = Array.isArray(matches) ? matches : [];
  return arr.filter((m) => {
    if (String(m.status) !== "pending") return false;
    if (!m.aPlayerId || !m.bPlayerId) return false;
    const a = String(m.aPlayerId);
    const b = String(m.bPlayerId);
    if (isTbdId(a) || isTbdId(b)) return false;
    if (isByeId(a) || isByeId(b)) return false;
    if (isByeId(a) && isByeId(b)) return false;
    return true;
  });
}

export function startMatch(opts: { tournament: Tournament; matches: TournamentMatch[]; matchId: string }) {
  const t = { ...(opts.tournament as any) } as Tournament;
  const ms = (Array.isArray(opts.matches) ? opts.matches.slice() : []) as TournamentMatch[];

  const m = ms.find((x) => String(x.id) === String(opts.matchId));
  if (!m) return { tournament: t, matches: ms };

  if (t.status === "draft") t.status = "running";
  t.updatedAt = now();

  m.status = "playing";
  m.startedAt = now();
  m.updatedAt = now();

  return { tournament: t, matches: ms };
}

export function submitResult(opts: {
  tournament: Tournament;
  matches: TournamentMatch[];
  matchId: string;
  winnerId: string;
  historyMatchId: string | null;
}) {
  const t = { ...(opts.tournament as any) } as Tournament;
  const ms = (Array.isArray(opts.matches) ? opts.matches.slice() : []) as TournamentMatch[];

  const m = ms.find((x) => String(x.id) === String(opts.matchId));
  if (!m) return { tournament: t, matches: ms };

  const w = String(opts.winnerId || "");
  m.status = "done";
  m.winnerId = w || null;
  (m as any).historyMatchId = opts.historyMatchId ?? null;
  m.updatedAt = now();

  applyAutoProgress(t, ms);

  const allDone = ms.every((x) => String(x.status) === "done" || isByeId(x.aPlayerId) || isByeId(x.bPlayerId));
  if (allDone) {
    t.status = "finished";
    t.updatedAt = now();
  } else {
    if (t.status === "draft") t.status = "running";
    t.updatedAt = now();
  }

  return { tournament: t, matches: ms };
}
