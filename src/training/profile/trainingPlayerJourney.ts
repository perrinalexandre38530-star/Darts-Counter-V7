export type TrainingPlayerJourneyStage = {
  id: "start" | "foundations" | "regular" | "performance" | "mastery";
  label: string;
  shortLabel: string;
  description: string;
  completed: boolean;
  progressPct: number;
};

export type TrainingPlayerJourney = {
  currentIndex: number;
  currentLabel: string;
  nextLabel: string;
  progressPct: number;
  headline: string;
  body: string;
  stages: TrainingPlayerJourneyStage[];
};

export type TrainingPlayerJourneyInput = {
  completedPrograms: number;
  coveredFamilies: number;
  averagePerformance: number;
  certifiedLevels: number[];
};

function pct(parts: boolean[]) {
  if (!parts.length) return 0;
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

export function buildTrainingPlayerJourney(input: TrainingPlayerJourneyInput): TrainingPlayerJourney {
  const levels = input.certifiedLevels.length ? input.certifiedLevels : [1, 1, 1, 1, 1, 1];
  const level2 = levels.filter((level) => level >= 2).length;
  const level3 = levels.filter((level) => level >= 3).length;
  const level4 = levels.filter((level) => level >= 4).length;
  const level5 = levels.filter((level) => level >= 5).length;

  const defs: Array<Omit<TrainingPlayerJourneyStage, "completed" | "progressPct"> & { checks: boolean[] }> = [
    {
      id: "start",
      label: "Prendre ses repères",
      shortLabel: "DÉPART",
      description: "Terminer une première séance et mesurer au moins deux compétences.",
      checks: [input.completedPrograms >= 1, input.coveredFamilies >= 2],
    },
    {
      id: "foundations",
      label: "Construire les bases",
      shortLabel: "BASES",
      description: "Installer une routine et certifier les premiers niveaux.",
      checks: [input.completedPrograms >= 5, input.coveredFamilies >= 4, level2 >= 2],
    },
    {
      id: "regular",
      label: "Devenir régulier",
      shortLabel: "RÉGULIER",
      description: "Couvrir les six compétences et stabiliser les fondamentaux.",
      checks: [input.completedPrograms >= 12, input.coveredFamilies >= 6, level2 >= 4],
    },
    {
      id: "performance",
      label: "Passer un cap",
      shortLabel: "PERF.",
      description: "Faire monter la performance globale et certifier des niveaux intermédiaires.",
      checks: [input.averagePerformance >= 70, level3 >= 3, input.completedPrograms >= 20],
    },
    {
      id: "mastery",
      label: "Maîtriser son jeu",
      shortLabel: "MAÎTRISE",
      description: "Atteindre un haut niveau stable et valider des certifications avancées.",
      checks: [input.averagePerformance >= 80, level4 >= 3, level5 >= 1],
    },
  ];

  const stages = defs.map((stage) => ({
    id: stage.id,
    label: stage.label,
    shortLabel: stage.shortLabel,
    description: stage.description,
    completed: stage.checks.every(Boolean),
    progressPct: pct(stage.checks),
  }));

  const firstIncomplete = stages.findIndex((stage) => !stage.completed);
  const currentIndex = firstIncomplete === -1 ? stages.length - 1 : firstIncomplete;
  const current = stages[currentIndex];
  const completedBefore = stages.slice(0, currentIndex).length;
  const overall = Math.round(((completedBefore + current.progressPct / 100) / stages.length) * 100);
  const allDone = stages.every((stage) => stage.completed);

  return {
    currentIndex,
    currentLabel: current.label,
    nextLabel: allDone ? "Route complétée" : current.label,
    progressPct: Math.max(0, Math.min(100, overall)),
    headline: allDone ? "Route joueur complétée" : current.label,
    body: allDone ? "Tes cinq grandes étapes sont validées. Awena peut maintenant privilégier le maintien, les records et les objectifs personnels." : current.description,
    stages,
  };
}
