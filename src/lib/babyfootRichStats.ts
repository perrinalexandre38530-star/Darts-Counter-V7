import { deriveBabyFootScoreFromEvents } from "./babyfootScoreRules";

export type BabyFootRichSideStats = {
  name: string;
  score: number;
  sets: number;
  legs: number;
  goals: number;
  goalsConceded: number;
  avgGoalsPerLeg: number;
  goalDiff: number;
  gamelle: number;
  peche: number;
  pecheOff: number;
  pecheDef: number;
  demi: number;
  pissette: number;
  pissetteValid: number;
  pissetteRefused: number;
  csc: number;
  parachute: number;
  demiBonus: number;
  goalAv: number;
  goalDef: number;
  goalGb: number;
  penalties: number;
  handicap: number;
  goalsConcededAv: number;
  goalsConcededDef: number;
  goalsConcededGb: number;
  equalizations: number;
  leadChanges: number;
  longestRun: number;
};

export type BabyFootRichStats = {
  teamA: BabyFootRichSideStats;
  teamB: BabyFootRichSideStats;
  setsEnabled: boolean;
  totalLegs: number;
  totalGoals: number;
  totalGamelle: number;
  totalPeche: number;
  totalDemi: number;
  totalPissette: number;
};

type AnyObj = Record<string, any>;

function safeNum(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function extractSummary(input: any): AnyObj {
  return (input?.summary && typeof input.summary === 'object') ? input.summary : (input || {});
}

function extractEvents(input: any): any[] {
  const direct = input?.events;
  if (Array.isArray(direct)) return direct;
  const summary = extractSummary(input);
  if (Array.isArray(summary?.events)) return summary.events;
  return [];
}

function normalizeSpecialStats(raw: any) {
  const stats = raw && typeof raw === 'object' ? raw : {};
  return {
    demiA: safeNum(stats.demiA),
    demiB: safeNum(stats.demiB),
    gamelleA: safeNum(stats.gamelleA),
    gamelleB: safeNum(stats.gamelleB),
    pissetteA: safeNum(stats.pissetteA),
    pissetteB: safeNum(stats.pissetteB),
    pissetteValidA: safeNum(stats.pissetteValidA),
    pissetteValidB: safeNum(stats.pissetteValidB),
    pissetteRefusedA: safeNum(stats.pissetteRefusedA),
    pissetteRefusedB: safeNum(stats.pissetteRefusedB),
    pecheOffA: safeNum(stats.pecheOffA),
    pecheOffB: safeNum(stats.pecheOffB),
    pecheDefA: safeNum(stats.pecheDefA),
    pecheDefB: safeNum(stats.pecheDefB),
    demiBonusAppliedA: safeNum(stats.demiBonusAppliedA),
    demiBonusAppliedB: safeNum(stats.demiBonusAppliedB),
    goalAvA: safeNum(stats.goalAvA),
    goalAvB: safeNum(stats.goalAvB),
    goalDefA: safeNum(stats.goalDefA),
    goalDefB: safeNum(stats.goalDefB),
    goalGbA: safeNum(stats.goalGbA),
    goalGbB: safeNum(stats.goalGbB),
    cscA: safeNum(stats.cscA),
    cscB: safeNum(stats.cscB),
    parachuteA: safeNum(stats.parachuteA),
    parachuteB: safeNum(stats.parachuteB),
  };
}

function getLongestRun(events: any[], team: 'A' | 'B') {
  let best = 0;
  let run = 0;
  for (const event of events) {
    if (!event || event.t !== 'goal') continue;
    if (event.team === team) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function computeLeadStats(goalEvents: any[]) {
  let a = 0;
  let b = 0;
  let lastLeader: 'A' | 'B' | null = null;
  let equalizationsA = 0;
  let equalizationsB = 0;
  let leadChangesA = 0;
  let leadChangesB = 0;
  for (const event of goalEvents) {
    if (!event || event.t !== 'goal') continue;
    const points = Math.max(1, safeNum(event.points, 1));
    if (event.team === 'A') a += points;
    if (event.team === 'B') b += points;
    const nextLeader: 'A' | 'B' | null = a === b ? null : a > b ? 'A' : 'B';
    if (nextLeader === null && lastLeader) {
      if (event.team === 'A') equalizationsA += 1;
      if (event.team === 'B') equalizationsB += 1;
    }
    if (nextLeader && lastLeader && nextLeader !== lastLeader) {
      if (nextLeader === 'A') leadChangesA += 1;
      if (nextLeader === 'B') leadChangesB += 1;
    }
    lastLeader = nextLeader;
  }
  return { equalizationsA, equalizationsB, leadChangesA, leadChangesB };
}

export function computeBabyFootRichStats(input: any): BabyFootRichStats {
  const summary = extractSummary(input);
  const events = extractEvents(input);
  const existing = summary?.stats;
  if (existing?.teamA && existing?.teamB) {
    const eventScore = deriveBabyFootScoreFromEvents(events, input);
    if (!eventScore.hasScoringEvents) return existing as BabyFootRichStats;
    const a0 = safeNum(existing.teamA.score ?? existing.teamA.sc, 0);
    const b0 = safeNum(existing.teamB.score ?? existing.teamB.sc, 0);
    if (a0 === eventScore.scoreA && b0 === eventScore.scoreB) return existing as BabyFootRichStats;
    const fixed: any = {
      ...existing,
      teamA: { ...existing.teamA },
      teamB: { ...existing.teamB },
    };
    const legs = Math.max(1, safeNum(fixed.totalLegs ?? fixed.totallegs, 1));
    fixed.teamA.score = eventScore.scoreA;
    fixed.teamB.score = eventScore.scoreB;
    fixed.teamA.goalsConceded = eventScore.scoreB;
    fixed.teamB.goalsConceded = eventScore.scoreA;
    fixed.teamA.goalDiff = eventScore.scoreA - eventScore.scoreB;
    fixed.teamB.goalDiff = eventScore.scoreB - eventScore.scoreA;
    fixed.teamA.avgGoalsPerLeg = round1(eventScore.scoreA / legs);
    fixed.teamB.avgGoalsPerLeg = round1(eventScore.scoreB / legs);
    fixed.totalGoals = eventScore.scoreA + eventScore.scoreB;
    return fixed as BabyFootRichStats;
  }

  const goalEvents = events.filter((event) => event?.t === 'goal');
  const setWinEvents = events.filter((event) => event?.t === 'set_win');
  const penEvents = events.filter((event) => event?.t === 'pen_shot');

  const eventScore = deriveBabyFootScoreFromEvents(events, input);
  const scoreA = eventScore.hasScoringEvents ? eventScore.scoreA : safeNum(summary?.scoreA ?? input?.scoreA);
  const scoreB = eventScore.hasScoringEvents ? eventScore.scoreB : safeNum(summary?.scoreB ?? input?.scoreB);
  const handicapA = safeNum(summary?.handicapA ?? input?.handicapA);
  const handicapB = safeNum(summary?.handicapB ?? input?.handicapB);
  const setsEnabled = Boolean(summary?.setsEnabled ?? input?.setsEnabled);
  const setsA = safeNum(summary?.setsA ?? input?.setsA ?? setWinEvents.filter((event: any) => event?.team === 'A').length);
  const setsB = safeNum(summary?.setsB ?? input?.setsB ?? setWinEvents.filter((event: any) => event?.team === 'B').length);
  const finished = Boolean(summary?.finished ?? input?.finished ?? events.some((event) => event?.t === 'finish'));
  const hasGoalActivity = goalEvents.length > 0 || scoreA > handicapA || scoreB > handicapB;
  const baseLegs = setsEnabled ? (setsA + setsB) : 1;
  const totalLegs = Math.max(1, baseLegs + (setsEnabled && !finished && hasGoalActivity ? 1 : 0));
  const legsWonA = safeNum(summary?.legsWonA ?? input?.legsWonA ?? (!setsEnabled && finished && scoreA !== scoreB ? (scoreA > scoreB ? 1 : 0) : 0));
  const legsWonB = safeNum(summary?.legsWonB ?? input?.legsWonB ?? (!setsEnabled && finished && scoreA !== scoreB ? (scoreB > scoreA ? 1 : 0) : 0));

  const goalsA = goalEvents.reduce((acc: number, event: any) => acc + (event?.team === 'A' ? Math.max(1, safeNum(event?.points, 1)) : 0), 0);
  const goalsB = goalEvents.reduce((acc: number, event: any) => acc + (event?.team === 'B' ? Math.max(1, safeNum(event?.points, 1)) : 0), 0);

  const penaltiesA = safeNum(summary?.penalties?.goalsA ?? input?.penalties?.goalsA ?? penEvents.filter((event: any) => event?.team === 'A' && event?.scored).length);
  const penaltiesB = safeNum(summary?.penalties?.goalsB ?? input?.penalties?.goalsB ?? penEvents.filter((event: any) => event?.team === 'B' && event?.scored).length);

  const specialStats = normalizeSpecialStats(summary?.specialStats ?? input?.specialStats);
  const leadStats = computeLeadStats(goalEvents);

  const teamAName = String(summary?.teamA ?? input?.teamA ?? 'Équipe A');
  const teamBName = String(summary?.teamB ?? input?.teamB ?? 'Équipe B');

  const teamA: BabyFootRichSideStats = {
    name: teamAName,
    score: scoreA,
    sets: setsA,
    legs: legsWonA,
    goals: goalsA,
    goalsConceded: scoreB,
    avgGoalsPerLeg: round1(scoreA / Math.max(1, totalLegs)),
    goalDiff: scoreA - scoreB,
    gamelle: specialStats.gamelleA,
    peche: specialStats.pecheOffA + specialStats.pecheDefA,
    pecheOff: specialStats.pecheOffA,
    pecheDef: specialStats.pecheDefA,
    demi: specialStats.demiA,
    pissette: specialStats.pissetteA,
    pissetteValid: specialStats.pissetteValidA,
    pissetteRefused: specialStats.pissetteRefusedA,
    csc: specialStats.cscA,
    parachute: specialStats.parachuteA,
    demiBonus: specialStats.demiBonusAppliedA,
    goalAv: specialStats.goalAvA,
    goalDef: specialStats.goalDefA,
    goalGb: specialStats.goalGbA,
    penalties: penaltiesA,
    handicap: handicapA,
    goalsConcededAv: specialStats.goalAvB,
    goalsConcededDef: specialStats.goalDefB,
    goalsConcededGb: specialStats.goalGbB,
    equalizations: leadStats.equalizationsA,
    leadChanges: leadStats.leadChangesA,
    longestRun: getLongestRun(goalEvents, 'A'),
  };

  const teamB: BabyFootRichSideStats = {
    name: teamBName,
    score: scoreB,
    sets: setsB,
    legs: legsWonB,
    goals: goalsB,
    goalsConceded: scoreA,
    avgGoalsPerLeg: round1(scoreB / Math.max(1, totalLegs)),
    goalDiff: scoreB - scoreA,
    gamelle: specialStats.gamelleB,
    peche: specialStats.pecheOffB + specialStats.pecheDefB,
    pecheOff: specialStats.pecheOffB,
    pecheDef: specialStats.pecheDefB,
    demi: specialStats.demiB,
    pissette: specialStats.pissetteB,
    pissetteValid: specialStats.pissetteValidB,
    pissetteRefused: specialStats.pissetteRefusedB,
    csc: specialStats.cscB,
    parachute: specialStats.parachuteB,
    demiBonus: specialStats.demiBonusAppliedB,
    goalAv: specialStats.goalAvB,
    goalDef: specialStats.goalDefB,
    goalGb: specialStats.goalGbB,
    penalties: penaltiesB,
    handicap: handicapB,
    goalsConcededAv: specialStats.goalAvA,
    goalsConcededDef: specialStats.goalDefA,
    goalsConcededGb: specialStats.goalGbA,
    equalizations: leadStats.equalizationsB,
    leadChanges: leadStats.leadChangesB,
    longestRun: getLongestRun(goalEvents, 'B'),
  };

  return {
    teamA,
    teamB,
    setsEnabled,
    totalLegs,
    totalGoals: scoreA + scoreB,
    totalGamelle: teamA.gamelle + teamB.gamelle,
    totalPeche: teamA.peche + teamB.peche,
    totalDemi: teamA.demi + teamB.demi,
    totalPissette: teamA.pissette + teamB.pissette,
  };
}

export function formatBabyFootAvg(value: number) {
  return Number.isFinite(value) ? round1(value).toFixed(1) : '0.0';
}
