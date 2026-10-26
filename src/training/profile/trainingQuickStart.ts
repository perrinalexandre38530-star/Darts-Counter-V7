export type TrainingQuickStartKind = "resume" | "assessment" | "followup" | "daily";

export type TrainingQuickStart = {
  kind: TrainingQuickStartKind;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
};

export function buildTrainingQuickStart(input: {
  hasDraft: boolean;
  assessmentAvailable: boolean;
  assessmentDue: boolean;
  hasFollowup: boolean;
  dailyDurationMin: number;
  dailyFocusLabel: string;
}): TrainingQuickStart {
  if (input.hasDraft) {
    return {
      kind: "resume",
      eyebrow: "À REPRENDRE",
      title: "Continue ta séance",
      body: "Une séance est déjà en cours. Reprends exactement là où tu t'étais arrêté.",
      cta: "REPRENDRE",
    };
  }
  if (!input.assessmentAvailable || input.assessmentDue) {
    return {
      kind: "assessment",
      eyebrow: input.assessmentAvailable ? "POINT DE REPÈRE" : "COMMENCE ICI",
      title: input.assessmentAvailable ? "Refais ton bilan de niveau" : "Fais ton bilan de niveau",
      body: "6 tests courts pour situer ton niveau et permettre à Awena de te proposer un entraînement vraiment adapté.",
      cta: input.assessmentAvailable ? "REFAIRE LE BILAN" : "LANCER LE BILAN",
    };
  }
  if (input.hasFollowup) {
    return {
      kind: "followup",
      eyebrow: "SUITE LOGIQUE",
      title: "Continue sur ta lancée",
      body: "Awena a déjà préparé la meilleure suite à partir de ta dernière séance.",
      cta: "CONTINUER",
    };
  }
  return {
    kind: "daily",
    eyebrow: "AUJOURD'HUI",
    title: `Ton plan du jour • ${input.dailyDurationMin} min`,
    body: `Un parcours simple centré sur ${input.dailyFocusLabel}, avec échauffement, travail principal et finish.`,
    cta: "DÉMARRER",
  };
}
