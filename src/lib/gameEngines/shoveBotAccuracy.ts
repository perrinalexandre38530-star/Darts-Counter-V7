/**
 * SHOVE A PENNY — realistic, star-based bot shots.
 *
 * Stars are the same 1–5 individual value rendered by BotPagedSelector.
 * A hit on the aimed sector is NOT a guaranteed triple (or even a valid mark).
 * Percentages are a LONG-RUN average, not a constant chance on every visit.
 * One form is sampled per three-dart visit, creating hot/cold rounds.
 * This module is independent of the shared Wave61 difficulty preset.
 */

export type ShoveBotBed = "S" | "D" | "T" | "OB" | "IB" | "MISS";
export type ShoveBotDart = { bed: ShoveBotBed; number?: number };
export type ShoveBotChance = {
  stars: number;
  sectorHit: number;
  tripleGivenHit: number;
  doubleGivenHit: number;
  errorMissGivenError: number;
};

/** Fluctuating ability shared by all three darts in one visit. */
export type ShoveBotVisitForm = ShoveBotChance & {
  bullHit: number;
  innerBullGivenHit: number;
  /** -1 = cautious; +1 = aggressive; varies independently of accuracy. */
  risk: number;
};

type Random = () => number;

const BOARD_CLOCKWISE = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));

/** 1★: 36% ; 2★: 45% ; 3★: 55% ; 4★: 65% ; 5★: 75% aimed-sector hits. */
export function shoveBotChance(starsRaw: number): ShoveBotChance {
  const stars = clamp(Number.isFinite(starsRaw) && starsRaw > 0 ? starsRaw : 3, 1, 5);
  const strength = (stars - 1) / 4;
  // Discrete star anchors and linear interpolation also support half stars.
  // More forgiving at higher skill while preserving meaningful errors even at 5★.
  const sectorHitByStar = [0.36, 0.45, 0.55, 0.65, 0.75];
  const lower = Math.floor(stars);
  const upper = Math.ceil(stars);
  const sectorHit = sectorHitByStar[lower - 1] + (sectorHitByStar[upper - 1] - sectorHitByStar[lower - 1]) * (stars - lower);
  return {
    stars,
    sectorHit,
    tripleGivenHit: 0.055 + strength * 0.235,
    doubleGivenHit: 0.14 + strength * 0.105,
    errorMissGivenError: 0.43 - strength * 0.06,
  };
}

/**
 * Draw a NEW form per visit. Baseline star values stay the LONG-RUN means,
 * but visit-to-visit skill swings broadly, including on elite bots:
 * 1★ about 14–58%, 3★ 27–83%, 5★ 55–95% for the aimed sector.
 * A struggling 5★ bot can therefore lose a single visit to an inspired 3★ bot.
 * No scheduled good/bad cycles and no guaranteed 3-dart patterns.
 */
export function rollShoveBotVisitForm(starsRaw: number, rng: Random = Math.random): ShoveBotVisitForm {
  const base = shoveBotChance(starsRaw);
  const strength = (base.stars - 1) / 4;
  const widthByStar = [0.22, 0.25, 0.28, 0.24, 0.20];
  const lower = Math.floor(base.stars);
  const upper = Math.ceil(base.stars);
  const amplitude = widthByStar[lower - 1] + (widthByStar[upper - 1] - widthByStar[lower - 1]) * (base.stars - lower);
  // This symmetric interval preserves the exact target average without clipping.
  const swing = (rng() * 2 - 1) * amplitude;
  const risk = rng() * 2 - 1;
  const bullBase = 0.28 + strength * 0.36;
  return {
    ...base,
    sectorHit: clamp(base.sectorHit + swing, 0.06, 0.95),
    tripleGivenHit: clamp(base.tripleGivenHit + swing * 0.21 + risk * 0.08, 0.015, 0.46),
    doubleGivenHit: clamp(base.doubleGivenHit + swing * 0.10 - risk * 0.035, 0.065, 0.39),
    errorMissGivenError: clamp(base.errorMissGivenError - swing * 0.28 + (rng() - 0.5) * 0.11, 0.18, 0.70),
    bullHit: clamp(bullBase + swing * 0.70, 0.10, 0.88),
    innerBullGivenHit: clamp(0.075 + strength * 0.275 + swing * 0.09 + risk * 0.055, 0.03, 0.48),
    risk,
  };
}

function adjacentSector(number: number, rng: Random): number {
  const index = BOARD_CLOCKWISE.indexOf(number as (typeof BOARD_CLOCKWISE)[number]);
  if (index < 0) return 1 + Math.floor(rng() * 20);
  return BOARD_CLOCKWISE[(index + (rng() < 0.5 ? 1 : BOARD_CLOCKWISE.length - 1)) % BOARD_CLOCKWISE.length];
}

/**
 * Impact is random for each dart, but the player's accuracy and tactics share
 * the SAME form across one visit. A standalone call samples a form on its own.
 * Remaining marks temper aggression to avoid unintentional gifts.
 */
export function rollShoveBotDart(
  target: number,
  starsRaw: number,
  remainingMarks: number,
  rng: Random = Math.random,
  visitForm?: ShoveBotVisitForm,
): ShoveBotDart {
  const skill = visitForm ?? rollShoveBotVisitForm(starsRaw, rng);

  if (target === 25) {
    // Even elite bots do not nail outer / inner bull on demand.
    if (rng() >= skill.bullHit) return rng() < skill.errorMissGivenError ? { bed: "MISS" } : { bed: "S", number: 1 + Math.floor(rng() * 20) };
    const innerChance = skill.innerBullGivenHit * (remainingMarks >= 2 ? 1 : 0.5);
    return { bed: rng() < innerChance ? "IB" : "OB" };
  }

  if (rng() >= skill.sectorHit) {
    // Real misses: either no score or a neighbouring *physical* sector.
    return rng() < skill.errorMissGivenError
      ? { bed: "MISS" }
      : { bed: "S", number: adjacentSector(target, rng) };
  }

  // Good bots favor a single when only 1 mark is missing to avoid giving away extras.
  const tripleProbability = remainingMarks <= 1
    ? skill.tripleGivenHit * 0.18
    : remainingMarks === 2 ? skill.tripleGivenHit * 0.32 : skill.tripleGivenHit;
  const doubleProbability = remainingMarks <= 1
    ? skill.doubleGivenHit * 0.40
    : remainingMarks === 2 ? Math.min(0.48, skill.doubleGivenHit * 1.55) : skill.doubleGivenHit;
  const roll = rng();
  const bed: ShoveBotBed = roll < tripleProbability ? "T" : roll < tripleProbability + doubleProbability ? "D" : "S";
  return { bed, number: target };
}

/** Legacy CPU bots without an individual rating keep a moderate, non-perfect fallback. */
export function shoveBotFallbackStars(level: "easy" | "normal" | "hard"): number {
  return level === "easy" ? 1.5 : level === "hard" ? 4.5 : 3;
}
