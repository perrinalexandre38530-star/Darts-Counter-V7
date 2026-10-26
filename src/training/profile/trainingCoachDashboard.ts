import type { TrainingCoachHistory } from "./trainingCoachHistory";
import type { TrainingCoachingEffectiveness } from "./trainingCoachingEffectiveness";
import type { TrainingSessionHistoryCoach } from "./trainingSessionHistoryCoach";

export type TrainingCoachDashboard = {
  status: "learning" | "stable" | "watch" | "recalibrate";
  statusLabel: string;
  confidencePct: number;
  headline: string;
  body: string;
  nextRule: string;
  signals: Array<{ id: string; label: string; value: string; tone: "good" | "neutral" | "watch" }>;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function buildTrainingCoachDashboard(
  weekly: TrainingCoachHistory,
  live: TrainingSessionHistoryCoach,
  effectiveness: TrainingCoachingEffectiveness,
): TrainingCoachDashboard {
  const sampleScore = clamp((Math.min(live.sampleSize, 6) / 6) * 45);
  const consistencyScore = clamp((Number(weekly.consistencyPct) || 0) * 0.25);
  const adherenceScore = clamp((Number(live.adherenceAverage) || 0) * 0.2);
  const targetScore = clamp((Number(live.targetRate) || 0) * 0.1);
  const confidencePct = Math.round(clamp(sampleScore + consistencyScore + adherenceScore + targetScore));

  let status: TrainingCoachDashboard["status"] = "learning";
  if (live.sampleSize >= 5 && effectiveness.adaptationEffect === "negative") status = "recalibrate";
  else if (live.sampleSize >= 4 && (live.recurringFamily || effectiveness.stagnatingFamily)) status = "watch";
  else if (live.sampleSize >= 4 && confidencePct >= 65) status = "stable";

  const statusLabel = status === "stable" ? "STABLE" : status === "watch" ? "À SURVEILLER" : status === "recalibrate" ? "À RECALIBRER" : "EN APPRENTISSAGE";
  const headline =
    status === "stable" ? "AWENA A UNE RÉFÉRENCE FIABLE" :
    status === "watch" ? "UN SIGNAL MÉRITE D'ÊTRE CONFIRMÉ" :
    status === "recalibrate" ? "RALENTIR LES ADAPTATIONS" :
    "AWENA CONSTRUIT ENCORE SA RÉFÉRENCE";
  const body =
    status === "stable" ? `Les ${live.sampleSize} dernières séances donnent assez de recul pour modifier le Plan du jour sans sur-réagir à une performance isolée.` :
    status === "watch" ? `${live.recurringFamilyLabel !== "—" ? live.recurringFamilyLabel : effectiveness.stagnatingFamilyLabel} ressort plusieurs fois. Awena le garde en vigilance avant d'en faire une priorité durable.` :
    status === "recalibrate" ? "Les adaptations récentes ne produisent pas de gain mesurable. Awena doit privilégier des plans plus stables avant de changer à nouveau la structure." :
    "Quelques séances complètes supplémentaires sont nécessaires avant de considérer les tendances comme suffisamment robustes.";
  const nextRule =
    status === "stable" ? "Autoriser des adaptations légères du bloc principal." :
    status === "watch" ? "Confirmer le signal sur plusieurs séances avant de changer le cap." :
    status === "recalibrate" ? "Réduire l'amplitude des adaptations et conserver la structure." :
    "Accumuler des séances comparables avant d'affiner le coaching.";

  const signals: TrainingCoachDashboard["signals"] = [
    { id: "confidence", label: "CONFIANCE", value: `${confidencePct}%`, tone: confidencePct >= 65 ? "good" : confidencePct >= 45 ? "neutral" : "watch" },
    { id: "adherence", label: "STABILITÉ", value: `${Math.round(live.adherenceAverage || 0)}%`, tone: live.adherenceAverage >= 75 ? "good" : "neutral" },
    { id: "targets", label: "CIBLES", value: `${Math.round(live.targetRate || 0)}%`, tone: live.targetRate >= 65 ? "good" : "neutral" },
    { id: "adapt", label: "ADAPTATIONS", value: effectiveness.adaptationEffectLabel, tone: effectiveness.adaptationEffect === "negative" ? "watch" : effectiveness.adaptationEffect === "positive" ? "good" : "neutral" },
  ];

  return { status, statusLabel, confidencePct, headline, body, nextRule, signals };
}
