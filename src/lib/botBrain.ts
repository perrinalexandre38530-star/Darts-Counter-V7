// ============================================
// src/lib/botBrain.ts
// Petit "cerveau" BOT pour X01 V3
// - renvoie une volée de 3 fléchettes { seg, mul }
// - botLevel : "easy" | "medium" | "hard" | "pro" | "legend"
// - objectif moyennes (approx) :
//   easy   ~ 30
//   medium ~ 50
//   hard   ~ 80
//   pro    ~ 100
//   legend ~ 110
// ============================================

export type BotLevel = "easy" | "medium" | "hard" | "pro" | "legend";

export type BotDart = {
  seg: number; // 1–20 ou 25 (bull)
  mul: 1 | 2 | 3;
};

export type BotVisit = BotDart[];

export function computeBotVisit(
  level: BotLevel | undefined,
  currentScore: number
): BotVisit {
  const lvl: BotLevel =
    level && ["easy", "medium", "hard", "pro", "legend"].includes(level)
      ? (level as BotLevel)
      : "medium";

  // 1) Si on peut finir proprement → tenter le checkout
  const checkout = basicCheckout(currentScore, lvl);
  if (checkout) return checkout;

  // 2) Sinon, scorer en fonction du niveau
  return scoringPattern(currentScore, lvl);
}

// --------------------------------------------------
// FINISHER BASIQUE (double out only, plus réaliste)
// --------------------------------------------------

function basicCheckout(score: number, level: BotLevel): BotVisit | null {
  // ignore les scores exotiques
  if (score <= 1 || score > 170) return null;

  // quelques checkouts classiques (échantillon)
  const table: Record<number, BotVisit> = {
    170: [
      { seg: 20, mul: 3 },
      { seg: 20, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    167: [
      { seg: 20, mul: 3 },
      { seg: 19, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    164: [
      { seg: 20, mul: 3 },
      { seg: 18, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    161: [
      { seg: 20, mul: 3 },
      { seg: 17, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    160: [
      { seg: 20, mul: 3 },
      { seg: 20, mul: 3 },
      { seg: 20, mul: 2 },
    ],
    121: [
      { seg: 20, mul: 3 },
      { seg: 11, mul: 1 },
      { seg: 25, mul: 2 },
    ],
    110: [
      { seg: 20, mul: 1 },
      { seg: 18, mul: 2 },
      { seg: 16, mul: 2 },
    ],
    100: [
      { seg: 20, mul: 1 },
      { seg: 20, mul: 1 },
      { seg: 20, mul: 2 },
    ],
    64: [
      { seg: 16, mul: 3 },
      { seg: 8, mul: 2 },
      { seg: 0 as any, mul: 1 }, // "sécurité"
    ],
    40: [
      { seg: 20, mul: 2 },
      { seg: 0 as any, mul: 1 },
      { seg: 0 as any, mul: 1 },
    ],
    32: [
      { seg: 16, mul: 2 },
      { seg: 0 as any, mul: 1 },
      { seg: 0 as any, mul: 1 },
    ],
  };

  const forced = table[score];
  if (!forced) return null;

  // Probabilité de rater le checkout selon le niveau
  const missProb =
    level === "easy"
      ? 0.75
      : level === "medium"
      ? 0.45
      : level === "hard"
      ? 0.25
      : level === "pro"
      ? 0.12
      : 0.05; // legend : très peu de miss

  if (Math.random() < missProb) {
    return randomizeVisitAround(forced, level);
  }
  return forced;
}

function randomizeVisitAround(
  visit: BotVisit,
  level: BotLevel
): BotVisit {
  // On "lâche" un peu les segments pour simuler un raté
  // + moins de dérive pour pro/legend
  const driftProb =
    level === "easy"
      ? 0.9
      : level === "medium"
      ? 0.8
      : level === "hard"
      ? 0.6
      : level === "pro"
      ? 0.45
      : 0.35; // legend

  return visit.map((d) => {
    if (d.seg === 0) return d;
    if (Math.random() > driftProb) return d;

    const dir = Math.random() < 0.5 ? -1 : +1;
    const seg = Math.min(20, Math.max(1, d.seg + dir));
    let mul: 1 | 2 | 3 = d.mul;

    // sur raté on tombe plus souvent en simple
    if (Math.random() < 0.7) {
      mul = 1;
    } else if (Math.random() < 0.2) {
      mul = 2;
    }

    return { seg, mul };
  });
}

// ---------------------------------------
// PROFIL PAR NIVEAU (scoring "général")
// ---------------------------------------
//
// Idée : chaque flèche suit une distribution grossière :
// - hit "parfait" (souvent T20)
// - hit "correct" (S20 ou voisins)
// - "mauvais" dart (single bas, 1/5/7, etc.)
// avec des proportions différentes par niveau.
//
// Les moyennes ciblées sont atteintes "en gros" sur la
// phase de scoring, et les checkouts tirent un peu vers le haut
// pour hard/pro/legend.
//
type LevelProfile = {
  mainTarget: number;
  perfectTripleProb: number; // T20 propre
  solidSingleProb: number; // S20 / voisins corrects
  badMissProb: number; // reste : darts faibles
};

const LEVEL_PROFILES: Record<BotLevel, LevelProfile> = {
  easy: {
    mainTarget: 20,
    perfectTripleProb: 0.03, // quasi jamais T20
    solidSingleProb: 0.25, // parfois un bon S20
    badMissProb: 0.72, // très souvent "faible"
  },
  medium: {
    mainTarget: 20,
    perfectTripleProb: 0.10,
    solidSingleProb: 0.45,
    badMissProb: 0.45,
  },
  hard: {
    mainTarget: 20,
    perfectTripleProb: 0.25,
    solidSingleProb: 0.55,
    badMissProb: 0.20,
  },
  pro: {
    mainTarget: 20,
    perfectTripleProb: 0.40,
    solidSingleProb: 0.45,
    badMissProb: 0.15,
  },
  legend: {
    mainTarget: 20,
    perfectTripleProb: 0.55,
    solidSingleProb: 0.35,
    badMissProb: 0.10,
  },
};

// ---------------------------------------
// SCORING GÉNÉRAL
// ---------------------------------------

function scoringPattern(score: number, level: BotLevel): BotVisit {
  const profile = LEVEL_PROFILES[level];

  const visit: BotVisit = [];

  for (let i = 0; i < 3; i++) {
    // On évite de dépasser le score restant de façon débile :
    // si on est très proche d'un finish (<= 70) pour les niveaux forts,
    // on calme un peu la triple.
    const nearFinish = score <= 70;
    const effectiveProfile =
      level === "pro" || level === "legend"
        ? adjustProfileNearFinish(profile, nearFinish)
        : profile;

    const dart = drawDart(effectiveProfile, level);
    visit.push(dart);
    score -= dart.seg * dart.mul;
  }

  return visit;
}

function adjustProfileNearFinish(
  profile: LevelProfile,
  nearFinish: boolean
): LevelProfile {
  if (!nearFinish) return profile;
  // Sur les derniers points, pros & légendes jouent un peu plus "safe"
  return {
    ...profile,
    perfectTripleProb: profile.perfectTripleProb * 0.7,
    solidSingleProb:
      profile.solidSingleProb + profile.perfectTripleProb * 0.3,
    badMissProb: profile.badMissProb, // on ne touche pas trop à ça
  };
}

function drawDart(
  profile: LevelProfile,
  level: BotLevel
): BotDart {
  const r = Math.random();

  // 1) Hit "parfait" → T20 le plus souvent
  if (r < profile.perfectTripleProb) {
    // Légende / Pro : ultra ciblé sur T20
    const main = profile.mainTarget;
    return {
      seg: main,
      mul: 3,
    };
  }

  // 2) Hit "correct" → S20 ou voisins (1 / 5) avec parfois un double
  if (r < profile.perfectTripleProb + profile.solidSingleProb) {
    const base = profile.mainTarget;
    const driftR = Math.random();
    const seg =
      driftR < 0.7
        ? base
        : driftR < 0.85
        ? base - 1
        : base + 1; // voisins (ex: 19 / 1)

    const segClamped = Math.min(20, Math.max(1, seg));

    let mul: 1 | 2 | 3 = 1;

    // joueurs plus forts → un peu de D20 dans les "crayons"
    if (level === "hard" && Math.random() < 0.10) mul = 2;
    if (level === "pro" && Math.random() < 0.20) mul = 2;
    if (level === "legend" && Math.random() < 0.25) mul = 2;

    return {
      seg: segClamped,
      mul,
    };
  }

  // 3) "Mauvais" dart → single bas ou chou blanc / segment pourri
  //    Les bons niveaux restent rarement sur 1/5, les faibles beaucoup plus.
  const badR = Math.random();

  if (level === "easy" || level === "medium") {
    // random sur la board, mais beaucoup de petits numéros
    if (badR < 0.4) {
      return { seg: 1, mul: 1 };
    }
    if (badR < 0.7) {
      return { seg: 5, mul: 1 };
    }
    return { seg: 7, mul: 1 };
  }

  if (level === "hard") {
    if (badR < 0.3) return { seg: 5, mul: 1 };
    if (badR < 0.6) return { seg: 1, mul: 1 };
    return { seg: 12, mul: 1 };
  }

  // pro / legend : mauvais dart = quand même "ok"
  if (level === "pro") {
    if (badR < 0.4) return { seg: 5, mul: 1 };
    if (badR < 0.8) return { seg: 1, mul: 1 };
    return { seg: 9, mul: 1 };
  }

  // legend → très rares gros ratés
  if (badR < 0.4) return { seg: 5, mul: 1 };
  if (badR < 0.8) return { seg: 1, mul: 1 };
  return { seg: 12, mul: 1 };
}
