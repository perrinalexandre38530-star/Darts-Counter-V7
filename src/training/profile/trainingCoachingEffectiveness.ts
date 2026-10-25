import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

const FAMILY_ORDER: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];

export type TrainingCoachingEffectiveness = {
  sampleSize: number;
  adaptedSessions: number;
  stableSessions: number;
  adaptedAverage: number;
  stableAverage: number;
  postAdaptationLift: number;
  adaptationEffect: "learning" | "positive" | "neutral" | "negative";
  adaptationEffectLabel: string;
  recentAdaptationRate: number;
  previousAdaptationRate: number;
  adaptationRateDelta: number;
  stagnatingFamily: TrainingExerciseFamily | null;
  stagnatingFamilyLabel: string;
  stagnationSamples: number;
  stagnationDelta: number;
  relayFamily: TrainingExerciseFamily | null;
  relayFamilyLabel: string;
  headline: string;
  body: string;
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function safeFamily(value: unknown): TrainingExerciseFamily | null {
  const family = String(value || "") as TrainingExerciseFamily;
  return TRAINING_FAMILY_META[family] ? family : null;
}

function adaptationRate(rows: TrainingProgramSessionRecord[]) {
  if (!rows.length) return 0;
  return (rows.filter((row) => row.adaptationCount > 0).length / rows.length) * 100;
}

function buildPrescriptionOutcomes(records: TrainingProgramSessionRecord[]) {
  const chronological = [...records].sort((a, b) => a.endedAt - b.endedAt);
  const map = new Map<TrainingExerciseFamily, number[]>();
  for (let index = 0; index < chronological.length - 1; index += 1) {
    const source = chronological[index];
    const next = chronological[index + 1];
    const family = safeFamily(source.nextFamily);
    if (!family || !Array.isArray(next.families) || !next.families.includes(family)) continue;
    map.set(family, [...(map.get(family) || []), next.performanceScore]);
  }
  return map;
}

function chooseRelayFamily(records: TrainingProgramSessionRecord[], excluded: TrainingExerciseFamily): TrainingExerciseFamily {
  const recent = records.slice(0, 8);
  const exposure = new Map<TrainingExerciseFamily, number>();
  const performance = new Map<TrainingExerciseFamily, number[]>();
  for (const family of FAMILY_ORDER) {
    exposure.set(family, 0);
    performance.set(family, []);
  }
  for (const row of recent) {
    const unique = Array.from(new Set((row.families || []).filter((family) => TRAINING_FAMILY_META[family])));
    for (const family of unique) {
      exposure.set(family, (exposure.get(family) || 0) + 1);
      performance.set(family, [...(performance.get(family) || []), row.performanceScore]);
    }
  }
  return FAMILY_ORDER
    .filter((family) => family !== excluded)
    .sort((a, b) => {
      const exposureDelta = (exposure.get(a) || 0) - (exposure.get(b) || 0);
      if (exposureDelta) return exposureDelta;
      return average(performance.get(b) || []) - average(performance.get(a) || []);
    })[0] || "regularity";
}

export function buildTrainingCoachingEffectiveness(
  records: TrainingProgramSessionRecord[],
  windowSize = 10,
): TrainingCoachingEffectiveness {
  const size = Math.max(6, Math.min(20, Math.round(Number(windowSize) || 10)));
  const recent = records.slice(0, size);
  const adapted = recent.filter((row) => row.adaptationCount > 0);
  const stable = recent.filter((row) => row.adaptationCount === 0);
  const adaptedAverage = average(adapted.map((row) => row.performanceScore));
  const stableAverage = average(stable.map((row) => row.performanceScore));

  const chronological = [...recent].sort((a, b) => a.endedAt - b.endedAt);
  const postAdaptationDeltas: number[] = [];
  for (let index = 0; index < chronological.length - 1; index += 1) {
    const current = chronological[index];
    const next = chronological[index + 1];
    if (current.adaptationCount > 0) postAdaptationDeltas.push(next.performanceScore - current.performanceScore);
  }
  const postAdaptationLift = average(postAdaptationDeltas);
  const adaptationEffect: TrainingCoachingEffectiveness["adaptationEffect"] =
    postAdaptationDeltas.length < 2 ? "learning" :
    postAdaptationLift >= 3 ? "positive" :
    postAdaptationLift <= -3 ? "negative" : "neutral";
  const adaptationEffectLabel =
    adaptationEffect === "positive" ? "EFFICACES" :
    adaptationEffect === "negative" ? "À RECALIBRER" :
    adaptationEffect === "neutral" ? "NEUTRES" : "EN APPRENTISSAGE";

  const split = Math.max(3, Math.floor(recent.length / 2));
  const recentHalf = recent.slice(0, split);
  const previousHalf = recent.slice(split, split * 2);
  const recentAdaptationRate = adaptationRate(recentHalf);
  const previousAdaptationRate = adaptationRate(previousHalf);
  const adaptationRateDelta = previousHalf.length ? recentAdaptationRate - previousAdaptationRate : 0;

  const outcomes = buildPrescriptionOutcomes(recent);
  let stagnatingFamily: TrainingExerciseFamily | null = null;
  let stagnationSamples = 0;
  let stagnationDelta = 0;
  let worstScore = Number.POSITIVE_INFINITY;

  for (const family of FAMILY_ORDER) {
    const values = outcomes.get(family) || [];
    if (values.length < 3) continue;
    const newest = values.slice(-2);
    const previous = values.slice(Math.max(0, values.length - 4), Math.max(0, values.length - 2));
    const newestAverage = average(newest);
    const previousAverage = average(previous);
    const delta = previous.length ? newestAverage - previousAverage : 0;
    const stagnates = Math.abs(delta) < 2.5 && newestAverage < 85;
    if (stagnates && newestAverage < worstScore) {
      stagnatingFamily = family;
      stagnationSamples = values.length;
      stagnationDelta = delta;
      worstScore = newestAverage;
    }
  }

  const relayFamily = stagnatingFamily ? chooseRelayFamily(recent, stagnatingFamily) : null;
  const relayFamilyLabel = relayFamily ? TRAINING_FAMILY_META[relayFamily].label : "—";
  const stagnatingFamilyLabel = stagnatingFamily ? TRAINING_FAMILY_META[stagnatingFamily].label : "—";

  let headline = "COACHING EN CALIBRATION";
  let body = "Awena construit encore assez de recul pour mesurer si ses adaptations améliorent vraiment les séances suivantes.";
  if (recent.length >= 6) {
    if (stagnatingFamily && relayFamily) {
      headline = "FOCUS EN PLATEAU";
      body = `${stagnatingFamilyLabel} ne progresse plus malgré ${stagnationSamples} prescriptions suivies. Awena peut passer temporairement par ${relayFamilyLabel} pour relancer le transfert de compétence au lieu d'insister.`;
    } else if (adaptationEffect === "positive") {
      headline = "ADAPTATIONS UTILES";
      body = `Les séances qui ont été adaptées sont suivies d'un gain moyen de ${postAdaptationLift >= 0 ? "+" : ""}${Math.round(postAdaptationLift)} points. Le coaching en direct apporte un signal positif mesurable.`;
    } else if (adaptationEffect === "negative") {
      headline = "ADAPTATIONS À RECALIBRER";
      body = `Après une adaptation, la séance suivante est en moyenne ${Math.abs(Math.round(postAdaptationLift))} points plus basse. Awena doit réduire l'amplitude de ses changements et privilégier la stabilité.`;
    } else {
      headline = "COACHING STABLE";
      body = "Les adaptations ne créent ni gain ni recul marqué. Awena peut les utiliser avec parcimonie et continuer à construire une référence fiable.";
    }
  }

  return {
    sampleSize: recent.length,
    adaptedSessions: adapted.length,
    stableSessions: stable.length,
    adaptedAverage,
    stableAverage,
    postAdaptationLift,
    adaptationEffect,
    adaptationEffectLabel,
    recentAdaptationRate,
    previousAdaptationRate,
    adaptationRateDelta,
    stagnatingFamily,
    stagnatingFamilyLabel,
    stagnationSamples,
    stagnationDelta,
    relayFamily,
    relayFamilyLabel,
    headline,
    body,
  };
}

export function chooseCoachingEffectiveNextFamily(
  baseFamily: TrainingExerciseFamily,
  effectiveness: TrainingCoachingEffectiveness,
): TrainingExerciseFamily {
  if (
    effectiveness.stagnatingFamily === baseFamily &&
    effectiveness.relayFamily &&
    effectiveness.stagnationSamples >= 3
  ) {
    return effectiveness.relayFamily;
  }
  return baseFamily;
}
