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
  demiBonus: number;
  penalties: number;
  handicap: number;
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
    pecheOffA: safeNum(stats.pecheOffA),
    pecheOffB: safeNum(stats.pecheOffB),
    pecheDefA: safeNum(stats.pecheDefA),
    pecheDefB: safeNum(stats.pecheDefB),
    demiBonusAppliedA: safeNum(stats.demiBonusAppliedA),
    demiBonusAppliedB: safeNum(stats.demiBonusAppliedB),
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

export function computeBabyFootRichStats(input: any): BabyFootRichStats {
  const summary = extractSummary(input);
  const existing = summary?.stats;
  if (existing?.teamA && existing?.teamB) {
    return existing as BabyFootRichStats;
  }

  const events = extractEvents(input);
  const goalEvents = events.filter((event) => event?.t === 'goal');
  const setWinEvents = events.filter((event) => event?.t === 'set_win');
  const penEvents = events.filter((event) => event?.t === 'pen_shot');

  const scoreA = safeNum(summary?.scoreA ?? input?.scoreA);
  const scoreB = safeNum(summary?.scoreB ?? input?.scoreB);
  const handicapA = safeNum(summary?.handicapA ?? input?.handicapA);
  const handicapB = safeNum(summary?.handicapB ?? input?.handicapB);
  const setsEnabled = Boolean(summary?.setsEnabled ?? input?.setsEnabled);
  const setsA = safeNum(summary?.setsA ?? input?.setsA ?? setWinEvents.filter((event: any) => event?.team === 'A').length);
  const setsB = safeNum(summary?.setsB ?? input?.setsB ?? setWinEvents.filter((event: any) => event?.team === 'B').length);
  const finished = Boolean(summary?.finished ?? input?.finished ?? events.some((event) => event?.t === 'finish'));
  const hasGoalActivity = goalEvents.length > 0 || scoreA > handicapA || scoreB > handicapB;
  const baseLegs = setsEnabled ? (setsA + setsB) : 1;
  const totalLegs = Math.max(1, baseLegs + (setsEnabled && !finished && hasGoalActivity ? 1 : 0));

  const goalsA = goalEvents.reduce((acc: number, event: any) => acc + (event?.team === 'A' ? Math.max(1, safeNum(event?.points, 1)) : 0), 0);
  const goalsB = goalEvents.reduce((acc: number, event: any) => acc + (event?.team === 'B' ? Math.max(1, safeNum(event?.points, 1)) : 0), 0);

  const penaltiesA = safeNum(summary?.penalties?.goalsA ?? input?.penalties?.goalsA ?? penEvents.filter((event: any) => event?.team === 'A' && event?.scored).length);
  const penaltiesB = safeNum(summary?.penalties?.goalsB ?? input?.penalties?.goalsB ?? penEvents.filter((event: any) => event?.team === 'B' && event?.scored).length);

  const specialStats = normalizeSpecialStats(summary?.specialStats ?? input?.specialStats);

  const teamAName = String(summary?.teamA ?? input?.teamA ?? 'Équipe A');
  const teamBName = String(summary?.teamB ?? input?.teamB ?? 'Équipe B');

  const teamA: BabyFootRichSideStats = {
    name: teamAName,
    score: scoreA,
    sets: setsA,
    legs: totalLegs,
    goals: goalsA,
    goalsConceded: goalsB,
    avgGoalsPerLeg: round1(goalsA / Math.max(1, totalLegs)),
    goalDiff: goalsA - goalsB,
    gamelle: specialStats.gamelleA,
    peche: specialStats.pecheOffA + specialStats.pecheDefA,
    pecheOff: specialStats.pecheOffA,
    pecheDef: specialStats.pecheDefA,
    demi: specialStats.demiA,
    pissette: specialStats.pissetteA,
    demiBonus: specialStats.demiBonusAppliedA,
    penalties: penaltiesA,
    handicap: handicapA,
    longestRun: getLongestRun(goalEvents, 'A'),
  };

  const teamB: BabyFootRichSideStats = {
    name: teamBName,
    score: scoreB,
    sets: setsB,
    legs: totalLegs,
    goals: goalsB,
    goalsConceded: goalsA,
    avgGoalsPerLeg: round1(goalsB / Math.max(1, totalLegs)),
    goalDiff: goalsB - goalsA,
    gamelle: specialStats.gamelleB,
    peche: specialStats.pecheOffB + specialStats.pecheDefB,
    pecheOff: specialStats.pecheOffB,
    pecheDef: specialStats.pecheDefB,
    demi: specialStats.demiB,
    pissette: specialStats.pissetteB,
    demiBonus: specialStats.demiBonusAppliedB,
    penalties: penaltiesB,
    handicap: handicapB,
    longestRun: getLongestRun(goalEvents, 'B'),
  };

  return {
    teamA,
    teamB,
    setsEnabled,
    totalLegs,
    totalGoals: goalsA + goalsB,
    totalGamelle: teamA.gamelle + teamB.gamelle,
    totalPeche: teamA.peche + teamB.peche,
    totalDemi: teamA.demi + teamB.demi,
    totalPissette: teamA.pissette + teamB.pissette,
  };
}

export function formatBabyFootAvg(value: number) {
  return Number.isFinite(value) ? round1(value).toFixed(1) : '0.0';
}
