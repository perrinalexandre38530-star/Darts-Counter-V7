// =============================================================
// src/lib/statsCricket.ts
// Système complet de statistiques Cricket (Leg + Match + Global)
// - Log par dart (target, multiplier, scoring, state)
// - computeCricketLegStats : stats détaillées par cible
// - aggregateCricketMatches : cumul historique multi-parties
// - + Types légers pour StatsCricket.tsx (CricketPlayerStats…)
// =============================================================

// -------------------------------------------------------------
// 1) Modèle "par dart" + stats de leg
// -------------------------------------------------------------

export type CricketHit = {
  dartIndex: number;
  target: number;       // 15–20 ou 25/50 (bull)
  multiplier: 1 | 2 | 3;
  isScoring: boolean;   // true si points générés
  beforeHits: number;   // état avant la flèche
  afterHits: number;    // état après la flèche
  opponentOpen: boolean;
};

export type CricketTargetStats = {
  hits: number;
  singles: number;
  doubles: number;
  triples: number;

  openedAt?: number;    // dart index
  closedAt?: number;    // dart index

  pointsScored: number;
  pointsConceded: number;

  domination: number;   // durée seule open
};

export type CricketLegStats = {
  darts: number;
  visits: number;

  // global
  totalHits: number;
  singles: number;
  doubles: number;
  triples: number;
  accuracy: number;

  // advanced
  avgOpenTime: number;
  avgCloseTime: number;
  clutchCloses: number;
  choke: number;

  // par cible
  targets: Record<number, CricketTargetStats>;
};

// -------------------------------------------------------------
// 2) Agrégation multi-legs => stats "match"
// -------------------------------------------------------------

export type CricketMatchAgg = {
  legs: number;

  darts: number;
  totalHits: number;
  singles: number;
  doubles: number;
  triples: number;

  accuracy: number;
  bestLeg: number;
  worstLeg: number;

  targets: Record<number, CricketTargetStats>;
};

// =============================================================
// computeCricketLegStats : stats d'un leg Cricket
// =============================================================

export function computeCricketLegStats(hits: CricketHit[]): CricketLegStats {
  const targets = [15, 16, 17, 18, 19, 20, 25]; // 25=SB/DB

  const tStats: Record<number, CricketTargetStats> = {};
  targets.forEach((t) => {
    tStats[t] = {
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      pointsScored: 0,
      pointsConceded: 0,
      domination: 0,
    };
  });

  let totalHits = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;

  // ouverture / fermeture par cible
  const openedAt: Record<number, number | undefined> = {};
  const closedAt: Record<number, number | undefined> = {};

  let clutchCloses = 0;
  let choke = 0;

  hits.forEach((h, i) => {
    const T = h.target;
    if (!tStats[T]) return;

    const ts = tStats[T];
    const m = h.multiplier;

    ts.hits += m;
    totalHits += m;

    if (m === 1) {
      ts.singles++;
      singles++;
    }
    if (m === 2) {
      ts.doubles++;
      doubles++;
    }
    if (m === 3) {
      ts.triples++;
      triples++;
    }

    // ouverture
    if (!ts.openedAt && h.afterHits >= 3) {
      ts.openedAt = i;
      openedAt[T] = i;
    }

    // fermeture
    if (!ts.closedAt && h.afterHits >= 3) {
      // fermé quand hits ≥3 ET opponentOpen == false
      if (!h.opponentOpen) {
        ts.closedAt = i;
        closedAt[T] = i;

        // (NB: condition clutch potentiellement à revoir,
        //  mais on ne la modifie pas ici pour ne rien casser)
        if (h.opponentOpen) clutchCloses++;
      }
    }

    // points générés
    if (h.isScoring) {
      ts.pointsScored += (T === 25 ? 25 : T) * m;
    }

    // points concédés (si l'adversaire avait ouvert avant)
    if (!h.isScoring && h.opponentOpen && h.beforeHits < 3) {
      ts.pointsConceded += (T === 25 ? 25 : T) * m;
    }
  });

  // temps ouverture / fermeture
  const openTimes: number[] = [];
  const closeTimes: number[] = [];

  targets.forEach((T) => {
    const ts = tStats[T];
    if (ts.openedAt !== undefined) openTimes.push(ts.openedAt);
    if (ts.closedAt !== undefined) {
      closeTimes.push(ts.closedAt - (ts.openedAt ?? 0));
    }
  });

  const avgOpen = openTimes.length
    ? openTimes.reduce((a, b) => a + b, 0) / openTimes.length
    : 0;
  const avgClose = closeTimes.length
    ? closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length
    : 0;

  const darts = hits.length;
  const visits = Math.ceil(darts / 3);
  const accuracy = darts > 0 ? totalHits / darts : 0;

  return {
    darts,
    visits,
    totalHits,
    singles,
    doubles,
    triples,
    accuracy,
    avgOpenTime: avgOpen,
    avgCloseTime: avgClose,
    clutchCloses,
    choke,
    targets: tStats,
  };
}

// =============================================================
// aggregateCricketMatches : agrégation multi-legs
// =============================================================

export function aggregateCricketMatches(legs: CricketLegStats[]): CricketMatchAgg {
  const targets = [15, 16, 17, 18, 19, 20, 25];

  const base: CricketMatchAgg = {
    legs: legs.length,
    darts: 0,
    totalHits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    accuracy: 0,
    bestLeg: Infinity,
    worstLeg: 0,
    targets: {},
  };

  targets.forEach((t) => {
    base.targets[t] = {
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      pointsScored: 0,
      pointsConceded: 0,
      domination: 0,
    };
  });

  legs.forEach((L) => {
    base.darts += L.darts;
    base.totalHits += L.totalHits;
    base.singles += L.singles;
    base.doubles += L.doubles;
    base.triples += L.triples;

    if (L.totalHits > base.worstLeg) base.worstLeg = L.totalHits;
    if (L.totalHits < base.bestLeg) base.bestLeg = L.totalHits;

    // par cible
    Object.entries(L.targets).forEach(([k, ts]) => {
      const T = Number(k);
      if (!base.targets[T]) return;

      base.targets[T].hits += ts.hits;
      base.targets[T].singles += ts.singles;
      base.targets[T].doubles += ts.doubles;
      base.targets[T].triples += ts.triples;
      base.targets[T].pointsScored += ts.pointsScored;
      base.targets[T].pointsConceded += ts.pointsConceded;
      base.targets[T].domination += ts.domination;
    });
  });

  base.accuracy = base.darts > 0 ? base.totalHits / base.darts : 0;

  return base;
}

// -------------------------------------------------------------
// 3) Couche "simple" pour la page StatsCricket
// -------------------------------------------------------------
//
// On ajoute ici des types légers pour:
// - CricketNumberKey (clés 15..20 + 25 sous forme de string)
// - CricketPlayerStats : ce que consomme StatsCricket.tsx
// - un petit agrégateur basé sur des "événements" simples
//   (utilisable plus tard avec l'historique).
// -------------------------------------------------------------

export type CricketNumberKey = "15" | "16" | "17" | "18" | "19" | "20" | "25";

export type CricketNumberStatsSimple = {
  hits: number;   // nombre total de marks sur ce numéro
  closes: number; // nombre de fermetures (placeholder pour l'instant)
  points: number; // points marqués sur ce numéro
};

export type CricketPlayerStats = {
  profileId: string;
  games: number;
  wins: number;
  marksPerRound: number;
  numbers: Record<CricketNumberKey, CricketNumberStatsSimple>;
};

// Helpers internes

const EMPTY_NUMBER_SIMPLE: CricketNumberStatsSimple = {
  hits: 0,
  closes: 0,
  points: 0,
};

export function createEmptyCricketPlayerStats(
  profileId: string
): CricketPlayerStats {
  const numbers: Record<CricketNumberKey, CricketNumberStatsSimple> = {
    "15": { ...EMPTY_NUMBER_SIMPLE },
    "16": { ...EMPTY_NUMBER_SIMPLE },
    "17": { ...EMPTY_NUMBER_SIMPLE },
    "18": { ...EMPTY_NUMBER_SIMPLE },
    "19": { ...EMPTY_NUMBER_SIMPLE },
    "20": { ...EMPTY_NUMBER_SIMPLE },
    "25": { ...EMPTY_NUMBER_SIMPLE }, // bull
  };

  return {
    profileId,
    games: 0,
    wins: 0,
    marksPerRound: 0,
    numbers,
  };
}

// -------------------------------------------------------------
// Agrégateur générique à partir d'événements Cricket "simples"
// (suffisant pour alimenter StatsCricket.tsx)
// -------------------------------------------------------------

export type CricketThrowEvent = {
  profileId: string;
  number: CricketNumberKey;
  marks: number;           // marks ajoutés sur ce lancer
  points: number;          // points marqués sur ce lancer
  closed?: boolean;        // true si ce lancer ferme le numéro
  winIncrement?: boolean;  // true si ce lancer correspond à une victoire
  gameIncrement?: boolean; // true si ce lancer compte comme match joué
  rounds?: number;         // poids en "rounds" pour le calcul MPR
};

/**
 * buildCricketStatsFromEvents
 * - agrège une liste d'événements Cricket par profil
 * - totalement safe : si la liste est vide, renvoie un objet vide
 *
 * NOTE:
 *  Dans une étape suivante, on construira ces événements à partir
 *  de ton historique réel (History / matchs Cricket).
 */
export function buildCricketStatsFromEvents(
  events: CricketThrowEvent[]
): Record<string, CricketPlayerStats> {
  const byProfile: Record<string, CricketPlayerStats> = {};
  const totals: Record<string, { marks: number; rounds: number }> = {};

  for (const ev of events) {
    const pid = ev.profileId;
    if (!pid) continue;

    if (!byProfile[pid]) {
      byProfile[pid] = createEmptyCricketPlayerStats(pid);
      totals[pid] = { marks: 0, rounds: 0 };
    }

    const ps = byProfile[pid];
    const t = totals[pid];

    const num = ev.number;
    const slot = ps.numbers[num] || { ...EMPTY_NUMBER_SIMPLE };
    slot.hits += ev.marks || 0;
    slot.points += ev.points || 0;
    if (ev.closed) {
      slot.closes += 1;
    }
    ps.numbers[num] = slot;

    if (ev.gameIncrement) {
      ps.games += 1;
    }
    if (ev.winIncrement) {
      ps.wins += 1;
    }

    const rounds = ev.rounds ?? 0;
    t.marks += ev.marks || 0;
    t.rounds += rounds;
  }

  // calcul du MPR final pour chaque joueur
  for (const pid of Object.keys(byProfile)) {
    const ps = byProfile[pid];
    const t = totals[pid];
    if (!t || t.rounds <= 0) {
      ps.marksPerRound = 0;
    } else {
      ps.marksPerRound = t.marks / t.rounds;
    }
  }

  return byProfile;
}
