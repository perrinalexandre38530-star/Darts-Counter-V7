export type TrainingExerciseFamily = "scoring" | "doubles" | "checkout" | "precision" | "bull" | "regularity";
export type TrainingExerciseEngine = "target_hits" | "sequence" | "checkout" | "score_darts";

export type TrainingExerciseDefinition = {
  id: string;
  title: string;
  subtitle: string;
  family: TrainingExerciseFamily;
  engine: TrainingExerciseEngine;
  difficulty: 1 | 2 | 3 | 4 | 5;
  maxDarts: number;
  target?: string;
  hitsGoal?: number;
  sequence?: string[];
  checkoutScore?: number;
  scoreGoal?: number;
  tags?: string[];
};

const clockSingles = Array.from({ length: 20 }, (_, i) => `S${i + 1}`);
const clockDoubles = Array.from({ length: 20 }, (_, i) => `D${i + 1}`);

export const TRAINING_EXERCISE_CATALOG: TrainingExerciseDefinition[] = [
  { id: "t20_10_hits", title: "T20 — 10 impacts", subtitle: "Touche dix fois le triple 20 en 45 fléchettes.", family: "scoring", engine: "target_hits", difficulty: 3, maxDarts: 45, target: "T20", hitsGoal: 10, tags: ["T20", "scoring"] },
  { id: "t19_10_hits", title: "T19 — 10 impacts", subtitle: "Travaille le switch et valide dix T19.", family: "scoring", engine: "target_hits", difficulty: 3, maxDarts: 45, target: "T19", hitsGoal: 10, tags: ["T19", "switch"] },
  { id: "score_600_30", title: "600 en 30 fléchettes", subtitle: "Atteins 600 points en dix volées maximum.", family: "scoring", engine: "score_darts", difficulty: 3, maxDarts: 30, scoreGoal: 600, tags: ["volume", "avg"] },
  { id: "score_300_18", title: "Sprint 300", subtitle: "Atteins 300 points en 18 fléchettes.", family: "scoring", engine: "score_darts", difficulty: 2, maxDarts: 18, scoreGoal: 300, tags: ["sprint", "avg"] },

  { id: "d16_8_hits", title: "D16 — 8 impacts", subtitle: "Valide huit D16 en 30 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "D16", hitsGoal: 8, tags: ["D16", "finish"] },
  { id: "d20_8_hits", title: "D20 — 8 impacts", subtitle: "Valide huit D20 en 30 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "D20", hitsGoal: 8, tags: ["D20", "finish"] },
  { id: "d8_6_hits", title: "D8 — correction", subtitle: "Travaille le D8 : six réussites en 24 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "D8", hitsGoal: 6, tags: ["D8", "finish"] },
  { id: "double_clock", title: "Horloge des doubles", subtitle: "D1 → D20 dans l'ordre. Une validation par double.", family: "doubles", engine: "sequence", difficulty: 5, maxDarts: 90, sequence: clockDoubles, tags: ["clock", "doubles"] },

  { id: "checkout_32", title: "Checkout 32", subtitle: "Ferme 32 en trois fléchettes maximum, dernière fléchette sur un double.", family: "checkout", engine: "checkout", difficulty: 1, maxDarts: 3, checkoutScore: 32, tags: ["checkout", "D16"] },
  { id: "checkout_40", title: "Checkout 40", subtitle: "Ferme 40 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 1, maxDarts: 3, checkoutScore: 40, tags: ["checkout", "D20"] },
  { id: "checkout_61", title: "Checkout 61", subtitle: "Trouve et exécute une sortie 61 en trois fléchettes.", family: "checkout", engine: "checkout", difficulty: 2, maxDarts: 3, checkoutScore: 61, tags: ["checkout", "route"] },
  { id: "checkout_81", title: "Checkout 81", subtitle: "Ferme 81 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 3, maxDarts: 3, checkoutScore: 81, tags: ["checkout", "route"] },

  { id: "clock_singles", title: "Horloge précision", subtitle: "S1 → S20 dans l'ordre, uniquement le simple demandé.", family: "precision", engine: "sequence", difficulty: 3, maxDarts: 60, sequence: clockSingles, tags: ["clock", "singles"] },
  { id: "bull_t20_d20", title: "BULL → T20 → D20", subtitle: "Valide la séquence exacte dans cet ordre.", family: "precision", engine: "sequence", difficulty: 4, maxDarts: 12, sequence: ["BULL", "T20", "D20"], tags: ["sequence", "pressure"] },
  { id: "switch_20_19_18", title: "Switch 20 / 19 / 18", subtitle: "T20 → T19 → T18, à répéter trois fois.", family: "regularity", engine: "sequence", difficulty: 4, maxDarts: 36, sequence: ["T20", "T19", "T18", "T20", "T19", "T18", "T20", "T19", "T18"], tags: ["switch", "triples"] },

  { id: "bull_10_hits", title: "BULL — 10 impacts", subtitle: "Touche dix fois la zone 25 en 30 fléchettes.", family: "bull", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "BULL", hitsGoal: 10, tags: ["bull", "25"] },
  { id: "dbull_5_hits", title: "DBULL — 5 impacts", subtitle: "Valide cinq centres 50 en 30 fléchettes.", family: "bull", engine: "target_hits", difficulty: 4, maxDarts: 30, target: "DBULL", hitsGoal: 5, tags: ["dbull", "50"] },
];

export const TRAINING_FAMILY_META: Record<TrainingExerciseFamily, { label: string; description: string }> = {
  scoring: { label: "SCORING", description: "Volume de points, triples et changement de zone." },
  doubles: { label: "DOUBLES", description: "Fiabilise les doubles de fermeture." },
  checkout: { label: "CHECKOUT", description: "Routes et fins de manche sous contrainte." },
  precision: { label: "PRÉCISION", description: "Cibles exactes et séquences techniques." },
  bull: { label: "BULL", description: "Travail du 25 et du centre 50." },
  regularity: { label: "RÉGULARITÉ", description: "Répétition, switch et stabilité." },
};

export function getTrainingExercise(id: string | null | undefined) {
  return TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === String(id || "")) || TRAINING_EXERCISE_CATALOG[0];
}
