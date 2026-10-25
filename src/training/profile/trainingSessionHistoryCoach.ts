import { TRAINING_FAMILY_META, type TrainingExerciseFamily } from "../catalog/trainingExerciseCatalog";
import type { TrainingProgramSessionRecord } from "./trainingPlanTracker";

export type TrainingSessionHistoryCoach = {
  sampleSize: number;
  adaptedSessions: number;
  stableSessions: number;
  adaptedAverage: number;
  stableAverage: number;
  targetRate: number;
  adherenceAverage: number;
  warmupAverage: number;
  coreAverage: number;
  finishAverage: number;
  weakestPhase: "warmup" | "core" | "finish" | null;
  recurringFamily: TrainingExerciseFamily | null;
  recurringFamilyLabel: string;
  recurringFamilyCount: number;
  confidence: number;
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

export function buildTrainingSessionHistoryCoach(records: TrainingProgramSessionRecord[], windowSize = 6): TrainingSessionHistoryCoach {
  const size = Math.max(3, Math.min(12, Math.round(Number(windowSize) || 6)));
  const recent = records.slice(0, size);
  const adapted = recent.filter((row) => row.adaptationCount > 0);
  const stable = recent.filter((row) => row.adaptationCount === 0);
  const targetHits = recent.reduce((sum, row) => sum + Math.max(0, row.targetHitCount || 0), 0);
  const targetTotal = recent.reduce((sum, row) => sum + Math.max(0, row.targetTotalCount || 0), 0);
  const adherenceValues = recent.map((row) => Number(row.adherencePct) || (row.steps ? Math.max(0, 100 - (row.adaptationCount / row.steps) * 100) : 100));
  const warmupValues = recent.map((row) => Number(row.warmupPerformance) || 0).filter((value) => value > 0);
  const coreValues = recent.map((row) => Number(row.corePerformance) || 0).filter((value) => value > 0);
  const finishValues = recent.map((row) => Number(row.finishPerformance) || 0).filter((value) => value > 0);

  const familyCounts = new Map<TrainingExerciseFamily, number>();
  recent.forEach((row) => {
    const family = safeFamily(row.nextFamily);
    if (family) familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
  });
  const rankedFamilies = Array.from(familyCounts.entries()).sort((a, b) => b[1] - a[1]);
  const recurringFamily = rankedFamilies[0]?.[0] || null;
  const recurringFamilyCount = rankedFamilies[0]?.[1] || 0;
  const confidence = recent.length ? recurringFamilyCount / recent.length : 0;

  const phaseScores = [
    ["warmup", average(warmupValues)],
    ["core", average(coreValues)],
    ["finish", average(finishValues)],
  ] as const;
  const availablePhases = phaseScores.filter(([, score]) => score > 0);
  const weakestPhase = availablePhases.length ? availablePhases.reduce((worst, row) => row[1] < worst[1] ? row : worst)[0] : null;

  const adaptedAverage = average(adapted.map((row) => row.performanceScore));
  const stableAverage = average(stable.map((row) => row.performanceScore));
  const targetRate = targetTotal ? (targetHits / targetTotal) * 100 : 0;
  const adherenceAverage = average(adherenceValues);
  const warmupAverage = average(warmupValues);
  const coreAverage = average(coreValues);
  const finishAverage = average(finishValues);

  let headline = "RÉFÉRENCE LIVE COACH EN CONSTRUCTION";
  let body = "Awena a besoin de quelques séances complètes pour distinguer un incident ponctuel d'une faiblesse récurrente.";
  if (recent.length >= 3) {
    if (recurringFamily && recurringFamilyCount >= 2) {
      headline = "SIGNAL RÉCURRENT DÉTECTÉ";
      body = `${TRAINING_FAMILY_META[recurringFamily].label} ressort comme point de vigilance sur ${recurringFamilyCount}/${recent.length} séances récentes. Awena peut le prioriser sans sur-réagir à une seule mauvaise étape.`;
    } else if (adapted.length >= Math.ceil(recent.length / 2)) {
      headline = "PLANS SOUVENT ADAPTÉS";
      body = `Awena a ajusté ${adapted.length}/${recent.length} séances récentes. Le niveau de difficulté mérite d'être stabilisé avant d'augmenter la charge.`;
    } else {
      headline = "PLANS STABLES";
      body = `${stable.length}/${recent.length} séances récentes ont conservé leur structure initiale. La progression peut maintenant s'appuyer sur une référence plus fiable.`;
    }
  }

  return {
    sampleSize: recent.length,
    adaptedSessions: adapted.length,
    stableSessions: stable.length,
    adaptedAverage,
    stableAverage,
    targetRate,
    adherenceAverage,
    warmupAverage,
    coreAverage,
    finishAverage,
    weakestPhase,
    recurringFamily,
    recurringFamilyLabel: recurringFamily ? TRAINING_FAMILY_META[recurringFamily].label : "—",
    recurringFamilyCount,
    confidence,
    headline,
    body,
  };
}

export function chooseHistoryAwareNextFamily(
  immediateFamily: TrainingExerciseFamily,
  records: TrainingProgramSessionRecord[],
  minimumRepeat = 2,
): TrainingExerciseFamily {
  const summary = buildTrainingSessionHistoryCoach(records, 6);
  if (summary.recurringFamily && summary.recurringFamilyCount >= minimumRepeat && summary.confidence >= 0.34) {
    return summary.recurringFamily;
  }
  return immediateFamily;
}
