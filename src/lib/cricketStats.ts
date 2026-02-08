// ============================================
// src/lib/cricketStats.ts
// Système de stats pour CRICKET
// - Event par fléchette (CricketDartEvent)
// - Stats par manche (CricketLegStats)
// - Agrégat profil (CricketProfileStats) + KPIs globaux
// ============================================

// Segments utiles en Cricket
export type CricketSegmentId = 15 | 16 | 17 | 18 | 19 | 20 | 25; // 25 = Bull

export type CricketRing =
  | "S" // simple
  | "D" // double
  | "T" // triple
  | "SB" // single bull (25)
  | "DB" // double bull (50)
  | "MISS";

export type CricketPlayerId = string;

// Variante de scoring
export type CricketScoringVariant = "points" | "no-points" | "cut-throat";

// ----------- EVENT PAR FLECHETTE ----------------

export type CricketDartEvent = {
  legId: string;
  setId?: string;
  matchId?: string;

  playerId: CricketPlayerId;
  visitIndex: number; // 0,1,2... (volée)
  dartIndex: 0 | 1 | 2; // 0..2 dans la volée

  segment: CricketSegmentId | "MISS";
  ring: CricketRing;

  // LOGIQUE CRICKET
  marks: number; // 0..3 (DB = 2 marks sur bull)
  rawScore: number; // points théoriques (ex: T20 => 60)
  scoredPoints: number; // points réellement ajoutés (0 si pas de score)

  // Cut-throat : points infligés aux adversaires (0 sinon)
  inflictedPoints?: number;

  // Infos de clôture
  beforeMarksOnSegment: number; // 0..3 (chez ce joueur)
  afterMarksOnSegment: number; // 0..3
  closedSegmentNow: boolean; // true si cette fléchette a fermé le segment pour ce joueur

  // Contexte partie (optionnel mais utile)
  leadingBeforeThrow?: boolean; // était-il en tête en points avant cette fléchette ?
  winningThrow?: boolean; // true si cette fléchette termine la manche

  timestamp: number;
};

// ----------- STATS PAR SEGMENT ----------------

export type CricketSegmentStats = {
  segment: CricketSegmentId;
  marks: number; // total marks sur ce segment (0..3 ou plus si points)
  closes: number; // 0 ou 1 (fermé au moins une fois)
  firstHitVisitIndex?: number; // première volée où il touche ce segment
  firstCloseVisitIndex?: number; // volée où il ferme ce segment
  pointsScored: number; // points obtenus sur ce segment
};

// ----------- STATS PAR MANCHE ----------------

export type CricketLegStats = {
  // Identité manche / match
  matchId?: string;
  setId?: string;
  legId: string;
  playerId: CricketPlayerId;

  // Contexte de jeu
  mode: "solo" | "teams"; // SOLO vs ÉQUIPES

  // Variantes
  scoringVariant: CricketScoringVariant;
  variantId?: string; // ex: \"classic\" / \"enculette\" / \"cut_throat\"
  cutThroat?: boolean;
  teamId?: string; // ex: "gold" / "blue"
  teamName?: string; // ex: "Team Gold"

  // Volume
  darts: number;
  visits: number;
  totalMarks: number;
  totalPoints: number; // total de points marqués pendant cette manche
  totalInflictedPoints: number; // points infligés (cut-throat)


  // Efficacité
  mpr: number; // totalMarks / visits
  hitRate: number; // (flèches non MISS) / darts
  scoringRate: number; // (flèches qui marquent des points) / darts

  // Résultat
  won: boolean;
  winningDartIndex: number; // index global fléchette (0..darts-1)
  winningVisitIndex: number;

  // Adversité
  opponentTotalPoints: number; // points totaux adverses
  opponentLabel?: string; // "Paul", "Team Blue", etc. (rempli par le moteur)

  // Segments
  perSegment: Record<CricketSegmentId, CricketSegmentStats>;

  // Volées / rythme
  bestVisitMarks: number; // max marks sur une volée
  avgMarksWhenScoring: number; // moyenne de marks sur les volées où il touche

  // Ordre de fermeture (15..20 + Bull)
  closeOrder: CricketSegmentId[]; // liste des segments dans l’ordre de fermeture

  // Timestamps
  startedAt: number;
  endedAt: number;
  durationMs: number;
};

// ----------- FONCTION DE CALCUL PAR MANCHE ----------------

export function computeCricketLegStats(
  legId: string,
  playerId: CricketPlayerId,
  events: CricketDartEvent[],
  options?: {
    mode?: "solo" | "teams";
    teamId?: string;
    teamName?: string;
    won?: boolean;
    opponentTotalPoints?: number;
    opponentLabel?: string;
    startedAt?: number;
    endedAt?: number;
    scoringVariant?: CricketScoringVariant;
    variantId?: string;
    cutThroat?: boolean;
  }
): CricketLegStats {
  const playerEvents = events.filter((e) => e.playerId === playerId);

  const darts = playerEvents.length;
  const visits = playerEvents.length
    ? 1 + Math.max(...playerEvents.map((e) => e.visitIndex))
    : 0;

  let totalMarks = 0;
  let totalPoints = 0;
  let totalInflictedPoints = 0;
  let hits = 0;
  let scoringHits = 0;

  const perSegment: Record<CricketSegmentId, CricketSegmentStats> = {
    15: { segment: 15, marks: 0, closes: 0, pointsScored: 0 },
    16: { segment: 16, marks: 0, closes: 0, pointsScored: 0 },
    17: { segment: 17, marks: 0, closes: 0, pointsScored: 0 },
    18: { segment: 18, marks: 0, closes: 0, pointsScored: 0 },
    19: { segment: 19, marks: 0, closes: 0, pointsScored: 0 },
    20: { segment: 20, marks: 0, closes: 0, pointsScored: 0 },
    25: { segment: 25, marks: 0, closes: 0, pointsScored: 0 },
  };

  let bestVisitMarks = 0;
  const visitMarksMap = new Map<number, number>();
  const closeOrder: CricketSegmentId[] = [];

  playerEvents.forEach((e) => {
    totalMarks += e.marks;
    totalPoints += e.scoredPoints;
    totalInflictedPoints += (e as any).inflictedPoints ? Number((e as any).inflictedPoints) : 0;

    if (e.ring !== "MISS") hits++;
    if (e.scoredPoints > 0 || ((e as any).inflictedPoints ?? 0) > 0) scoringHits++;

    if (e.segment !== "MISS") {
      const segId = e.segment as CricketSegmentId;
      const segStats = perSegment[segId];

      segStats.marks += e.marks;
      segStats.pointsScored += e.scoredPoints;

      if (segStats.firstHitVisitIndex === undefined && e.marks > 0) {
        segStats.firstHitVisitIndex = e.visitIndex;
      }

      if (e.closedSegmentNow) {
        segStats.closes = 1;
        if (segStats.firstCloseVisitIndex === undefined) {
          segStats.firstCloseVisitIndex = e.visitIndex;
          closeOrder.push(segId);
        }
      }
    }

    const prev = visitMarksMap.get(e.visitIndex) ?? 0;
    const newVal = prev + e.marks;
    visitMarksMap.set(e.visitIndex, newVal);
    if (newVal > bestVisitMarks) bestVisitMarks = newVal;
  });

  const hitRate = darts ? hits / darts : 0;
  const scoringRate = darts ? scoringHits / darts : 0;
  const mpr = visits ? totalMarks / visits : 0;

  const marksWhenScoring: number[] = [];
  visitMarksMap.forEach((marks) => {
    if (marks > 0) marksWhenScoring.push(marks);
  });
  const avgMarksWhenScoring = marksWhenScoring.length
    ? marksWhenScoring.reduce((a, b) => a + b, 0) / marksWhenScoring.length
    : 0;

  const startedAt =
    options?.startedAt ?? playerEvents[0]?.timestamp ?? Date.now();
  const endedAt =
    options?.endedAt ?? playerEvents[playerEvents.length - 1]?.timestamp ?? startedAt;
  const durationMs = Math.max(0, endedAt - startedAt);

  return {
    matchId: playerEvents[0]?.matchId,
    setId: playerEvents[0]?.setId,
    legId,
    playerId,

    mode: options?.mode ?? "solo",

    scoringVariant: options?.scoringVariant ?? "points",
    variantId: options?.variantId,
    cutThroat: options?.cutThroat ?? (options?.scoringVariant === "cut-throat"),

    teamId: options?.teamId,
    teamName: options?.teamName,

    darts,
    visits,
    totalMarks,
    totalPoints,
    totalInflictedPoints,

    mpr,
    hitRate,
    scoringRate,

    won: !!options?.won,
    winningDartIndex: darts ? darts - 1 : 0,
    winningVisitIndex: playerEvents[playerEvents.length - 1]?.visitIndex ?? 0,

    opponentTotalPoints: options?.opponentTotalPoints ?? 0,
    opponentLabel: options?.opponentLabel,

    perSegment,
    bestVisitMarks,
    avgMarksWhenScoring,
    closeOrder,

    startedAt,
    endedAt,
    durationMs,
  };
}

// ----------- HISTORIQUE & STATS PROFIL ----------------

// Une ligne d'historique : 1 manche de Cricket
export type CricketMatchHistoryItem = {
  legId: string;
  matchId?: string;
  ts: number; // timestamp (endedAt)
  mode: "solo" | "teams";
  opponentLabel: string; // "Paul", "Team Blue", etc.
  pointsFor: number; // totalPoints du joueur
  pointsAgainst: number; // opponentTotalPoints
  won: boolean;
};

// Agrégat global pour un profil
export type CricketProfileStats = {
  // Volume global
  matchesTotal: number; // nb de manches Cricket jouées
  matchesSolo: number; // nb de manches solo
  matchesTeams: number; // nb de manches en équipes

  // Résultats
  winsTotal: number;
  lossesTotal: number;

  winsSolo: number; // victoires en solo
  lossesSolo: number; // défaites en solo

  winsTeams: number; // victoires en équipes
  lossesTeams: number; // défaites en équipes

  // Records
  bestPointsInMatch: number; // record de points sur une manche
  bestPointsMatchId?: string;
  bestPointsLegId?: string;

  // Historique des scores (dernières parties Cricket)
  history: CricketMatchHistoryItem[];

  // ---------- KPIs globaux supplémentaires (pour Home / dashboards) ----------
  totalPointsFor: number;
  totalPointsAgainst: number;
  avgPointsFor: number;
  avgPointsAgainst: number;

  totalInflictedPoints: number;
  avgInflictedPoints: number;

  byScoringVariant: Record<CricketScoringVariant, {
    matches: number;
    wins: number;
    losses: number;
    darts: number;
    visits: number;
    marks: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsInflicted: number;
  }>;

  byVariantId: Record<string, {
    matches: number;
    wins: number;
    losses: number;
    darts: number;
    visits: number;
    marks: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsInflicted: number;
  }>;

  totalDarts: number;
  totalMarks: number;

  globalMpr: number; // marks par volée global
  globalHitRate: number; // proportion de flèches non MISS (0..1)
  globalScoringRate: number; // proportion de flèches qui scorent (0..1)
};

export function aggregateCricketProfileStats(
  legs: CricketLegStats[],
  options?: {
    // Combien de lignes d'historique tu veux garder
    maxHistoryItems?: number;
  }
): CricketProfileStats {
  const maxHistoryItems = options?.maxHistoryItems ?? 20;

  let matchesTotal = 0;
  let matchesSolo = 0;
  let matchesTeams = 0;

  let winsTotal = 0;
  let lossesTotal = 0;

  let winsSolo = 0;
  let lossesSolo = 0;

  let winsTeams = 0;
  let lossesTeams = 0;

  let bestPointsInMatch = 0;
  let bestPointsMatchId: string | undefined;
  let bestPointsLegId: string | undefined;

  const history: CricketMatchHistoryItem[] = [];

  // Nouveaux accumulateurs globaux
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;

  let totalDarts = 0;
  let totalMarks = 0;
  let totalVisits = 0;

  let sumHits = 0;
  let sumScoringHits = 0;

  // Variantes (points / no-points / cut-throat + variantes custom)
  type _Bucket = {
    matches: number;
    wins: number;
    losses: number;
    darts: number;
    visits: number;
    marks: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsInflicted: number;
  };

  const makeBucket = (): _Bucket => ({
    matches: 0,
    wins: 0,
    losses: 0,
    darts: 0,
    visits: 0,
    marks: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsInflicted: 0,
  });

  const byScoringVariant: Record<CricketScoringVariant, _Bucket> = {
    "points": makeBucket(),
    "no-points": makeBucket(),
    "cut-throat": makeBucket(),
  };

  const byVariantId: Record<string, _Bucket> = {};

  // Tri par date pour un historique "du plus récent au plus ancien"
  const sorted = [...legs].sort((a, b) => b.endedAt - a.endedAt);

  for (const leg of sorted) {
    matchesTotal++;

    const isSolo = leg.mode === "solo";
    const isTeam = leg.mode === "teams";

    if (isSolo) matchesSolo++;
    if (isTeam) matchesTeams++;

    const scoringVariant: CricketScoringVariant =
      (leg as any).scoringVariant ??
      ((leg as any).cutThroat ? "cut-throat" : undefined) ??
      // best-effort: si aucun point et aucune variante => no-points
      (leg.totalPoints === 0 && (leg as any).totalInflictedPoints === 0 ? "no-points" : "points");

    const variantIdKey = String((leg as any).variantId ?? "classic");

    const bucketSV = byScoringVariant[scoringVariant] ?? byScoringVariant["points"];
    const bucketVID = (byVariantId[variantIdKey] ??= makeBucket());

    if (leg.won) {
      winsTotal++;
      if (isSolo) winsSolo++;
      if (isTeam) winsTeams++;
    } else {
      lossesTotal++;
      if (isSolo) lossesSolo++;
      if (isTeam) lossesTeams++;
    }

    // Buckets variantes
    bucketSV.matches += 1;
    bucketVID.matches += 1;
    if (leg.won) {
      bucketSV.wins += 1;
      bucketVID.wins += 1;
    } else {
      bucketSV.losses += 1;
      bucketVID.losses += 1;
    }

    bucketSV.darts += leg.darts;
    bucketVID.darts += leg.darts;

    bucketSV.visits += leg.visits;
    bucketVID.visits += leg.visits;

    bucketSV.marks += leg.totalMarks;
    bucketVID.marks += leg.totalMarks;

    bucketSV.pointsFor += leg.totalPoints;
    bucketVID.pointsFor += leg.totalPoints;

    bucketSV.pointsAgainst += leg.opponentTotalPoints ?? 0;
    bucketVID.pointsAgainst += leg.opponentTotalPoints ?? 0;

    bucketSV.pointsInflicted += (leg as any).totalInflictedPoints ?? 0;
    bucketVID.pointsInflicted += (leg as any).totalInflictedPoints ?? 0;

    // Record de points sur une manche
    if (leg.totalPoints > bestPointsInMatch) {
      bestPointsInMatch = leg.totalPoints;
      bestPointsMatchId = leg.matchId;
      bestPointsLegId = leg.legId;
    }

    // Accumulateurs globaux
    totalPointsFor += leg.totalPoints;
    totalPointsAgainst += leg.opponentTotalPoints ?? 0;
    totalInflictedPoints += (leg as any).totalInflictedPoints ?? 0;

    totalDarts += leg.darts;
    totalMarks += leg.totalMarks;
    totalVisits += leg.visits;

    // hitRate / scoringRate sont rapportés à la fléchette
    sumHits += leg.hitRate * leg.darts;
    sumScoringHits += leg.scoringRate * leg.darts;

    // Historique (limité à maxHistoryItems)
    if (history.length < maxHistoryItems) {
      history.push({
        legId: leg.legId,
        matchId: leg.matchId,
        ts: leg.endedAt,
        mode: leg.mode,
        opponentLabel:
          leg.opponentLabel ?? (leg.mode === "solo" ? "Opponent" : "Team"),
        pointsFor: leg.totalPoints,
        pointsAgainst: leg.opponentTotalPoints,
        won: leg.won,
      });
    }
  }

  const avgPointsFor =
    matchesTotal > 0 ? totalPointsFor / matchesTotal : 0;
  const avgPointsAgainst =
    matchesTotal > 0 ? totalPointsAgainst / matchesTotal : 0;

  const avgInflictedPoints =
    matchesTotal > 0 ? totalInflictedPoints / matchesTotal : 0;

  const globalMpr =
    totalVisits > 0 ? totalMarks / totalVisits : 0;

  const globalHitRate =
    totalDarts > 0 ? sumHits / totalDarts : 0;

  const globalScoringRate =
    totalDarts > 0 ? sumScoringHits / totalDarts : 0;

  return {
    matchesTotal,
    matchesSolo,
    matchesTeams,

    winsTotal,
    lossesTotal,

    winsSolo,
    lossesSolo,

    winsTeams,
    lossesTeams,

    bestPointsInMatch,
    bestPointsMatchId,
    bestPointsLegId,

    history,

    totalPointsFor,
    totalPointsAgainst,
    avgPointsFor,
    avgPointsAgainst,

    totalInflictedPoints,
    avgInflictedPoints,

    byScoringVariant,
    byVariantId,

    totalDarts,
    totalMarks,
    globalMpr,
    globalHitRate,
    globalScoringRate,
  };
}
