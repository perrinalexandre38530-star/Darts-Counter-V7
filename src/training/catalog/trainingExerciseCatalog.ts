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
const powerTriples = ["T20", "T19", "T18", "T20", "T19", "T18"];

export const TRAINING_EXERCISE_CATALOG: TrainingExerciseDefinition[] = [
  // SCORING
  { id: "t20_10_hits", title: "T20 — 10 impacts", subtitle: "Touche dix fois le triple 20 en 45 fléchettes.", family: "scoring", engine: "target_hits", difficulty: 3, maxDarts: 45, target: "T20", hitsGoal: 10, tags: ["T20", "scoring"] },
  { id: "t19_10_hits", title: "T19 — 10 impacts", subtitle: "Travaille le switch et valide dix T19.", family: "scoring", engine: "target_hits", difficulty: 3, maxDarts: 45, target: "T19", hitsGoal: 10, tags: ["T19", "switch"] },
  { id: "t18_8_hits", title: "T18 — 8 impacts", subtitle: "Huit T18 pour consolider la troisième grosse zone de scoring.", family: "scoring", engine: "target_hits", difficulty: 3, maxDarts: 36, target: "T18", hitsGoal: 8, tags: ["T18", "switch"] },
  { id: "score_600_30", title: "600 en 30 fléchettes", subtitle: "Atteins 600 points en dix volées maximum.", family: "scoring", engine: "score_darts", difficulty: 3, maxDarts: 30, scoreGoal: 600, tags: ["volume", "avg"] },
  { id: "score_300_18", title: "Sprint 300", subtitle: "Atteins 300 points en 18 fléchettes.", family: "scoring", engine: "score_darts", difficulty: 2, maxDarts: 18, scoreGoal: 300, tags: ["sprint", "avg"] },
  { id: "score_450_21", title: "Cadence 450", subtitle: "Atteins 450 points en 21 fléchettes.", family: "scoring", engine: "score_darts", difficulty: 3, maxDarts: 21, scoreGoal: 450, tags: ["cadence", "avg"] },
  { id: "score_720_36", title: "Volume 720", subtitle: "Tiens le rythme : 720 points en 36 fléchettes.", family: "scoring", engine: "score_darts", difficulty: 4, maxDarts: 36, scoreGoal: 720, tags: ["volume", "endurance"] },

  // DOUBLES
  { id: "d16_8_hits", title: "D16 — 8 impacts", subtitle: "Valide huit D16 en 30 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "D16", hitsGoal: 8, tags: ["D16", "finish"] },
  { id: "d20_8_hits", title: "D20 — 8 impacts", subtitle: "Valide huit D20 en 30 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "D20", hitsGoal: 8, tags: ["D20", "finish"] },
  { id: "d8_6_hits", title: "D8 — correction", subtitle: "Travaille le D8 : six réussites en 24 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "D8", hitsGoal: 6, tags: ["D8", "finish"] },
  { id: "d10_6_hits", title: "D10 — sécurité", subtitle: "Six D10 en 24 fléchettes pour fiabiliser 20 restant.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "D10", hitsGoal: 6, tags: ["D10", "finish"] },
  { id: "d12_6_hits", title: "D12 — sécurité", subtitle: "Six D12 en 24 fléchettes pour renforcer les sorties 24.", family: "doubles", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "D12", hitsGoal: 6, tags: ["D12", "finish"] },
  { id: "d18_6_hits", title: "D18 — pression", subtitle: "Six D18 en 24 fléchettes.", family: "doubles", engine: "target_hits", difficulty: 3, maxDarts: 24, target: "D18", hitsGoal: 6, tags: ["D18", "finish"] },
  { id: "double_clock", title: "Horloge des doubles", subtitle: "D1 → D20 dans l'ordre. Une validation par double.", family: "doubles", engine: "sequence", difficulty: 5, maxDarts: 90, sequence: clockDoubles, tags: ["clock", "doubles"] },
  { id: "double_core_route", title: "D20 → D10 → D5", subtitle: "Valide la chaîne classique de correction des doubles.", family: "doubles", engine: "sequence", difficulty: 3, maxDarts: 18, sequence: ["D20", "D10", "D5"], tags: ["route", "doubles"] },

  // CHECKOUT
  { id: "checkout_24", title: "Checkout 24", subtitle: "Ferme 24 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 1, maxDarts: 3, checkoutScore: 24, tags: ["checkout", "D12"] },
  { id: "checkout_32", title: "Checkout 32", subtitle: "Ferme 32 en trois fléchettes maximum, dernière fléchette sur un double.", family: "checkout", engine: "checkout", difficulty: 1, maxDarts: 3, checkoutScore: 32, tags: ["checkout", "D16"] },
  { id: "checkout_40", title: "Checkout 40", subtitle: "Ferme 40 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 1, maxDarts: 3, checkoutScore: 40, tags: ["checkout", "D20"] },
  { id: "checkout_52", title: "Checkout 52", subtitle: "Trouve une route propre pour fermer 52.", family: "checkout", engine: "checkout", difficulty: 2, maxDarts: 3, checkoutScore: 52, tags: ["checkout", "route"] },
  { id: "checkout_61", title: "Checkout 61", subtitle: "Trouve et exécute une sortie 61 en trois fléchettes.", family: "checkout", engine: "checkout", difficulty: 2, maxDarts: 3, checkoutScore: 61, tags: ["checkout", "route"] },
  { id: "checkout_72", title: "Checkout 72", subtitle: "Ferme 72 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 3, maxDarts: 3, checkoutScore: 72, tags: ["checkout", "route"] },
  { id: "checkout_81", title: "Checkout 81", subtitle: "Ferme 81 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 3, maxDarts: 3, checkoutScore: 81, tags: ["checkout", "route"] },
  { id: "checkout_100", title: "Checkout 100", subtitle: "Ferme 100 en trois fléchettes maximum.", family: "checkout", engine: "checkout", difficulty: 4, maxDarts: 3, checkoutScore: 100, tags: ["checkout", "route"] },
  { id: "checkout_121", title: "Checkout 121", subtitle: "Travaille une sortie trois fléchettes de référence.", family: "checkout", engine: "checkout", difficulty: 5, maxDarts: 3, checkoutScore: 121, tags: ["checkout", "pressure"] },

  // PRÉCISION
  { id: "clock_singles", title: "Horloge précision", subtitle: "S1 → S20 dans l'ordre, uniquement le simple demandé.", family: "precision", engine: "sequence", difficulty: 3, maxDarts: 60, sequence: clockSingles, tags: ["clock", "singles"] },
  { id: "bull_t20_d20", title: "BULL → T20 → D20", subtitle: "Valide la séquence exacte dans cet ordre.", family: "precision", engine: "sequence", difficulty: 4, maxDarts: 12, sequence: ["BULL", "T20", "D20"], tags: ["sequence", "pressure"] },
  { id: "s20_12_hits", title: "S20 — groupement", subtitle: "Place douze fléchettes dans le simple 20.", family: "precision", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "S20", hitsGoal: 12, tags: ["grouping", "S20"] },
  { id: "s19_10_hits", title: "S19 — groupement", subtitle: "Place dix fléchettes dans le simple 19.", family: "precision", engine: "target_hits", difficulty: 2, maxDarts: 24, target: "S19", hitsGoal: 10, tags: ["grouping", "S19"] },
  { id: "precision_20_19_18", title: "20 → 19 → 18", subtitle: "S20 → S19 → S18, trois cycles sans changer l'ordre.", family: "precision", engine: "sequence", difficulty: 3, maxDarts: 27, sequence: ["S20", "S19", "S18", "S20", "S19", "S18", "S20", "S19", "S18"], tags: ["sequence", "singles"] },

  // BULL
  { id: "bull_10_hits", title: "BULL — 10 impacts", subtitle: "Touche dix fois la zone 25 en 30 fléchettes.", family: "bull", engine: "target_hits", difficulty: 2, maxDarts: 30, target: "BULL", hitsGoal: 10, tags: ["bull", "25"] },
  { id: "bull_15_hits", title: "BULL — endurance", subtitle: "Valide quinze impacts Bull en 45 fléchettes.", family: "bull", engine: "target_hits", difficulty: 3, maxDarts: 45, target: "BULL", hitsGoal: 15, tags: ["bull", "endurance"] },
  { id: "dbull_5_hits", title: "DBULL — 5 impacts", subtitle: "Valide cinq centres 50 en 30 fléchettes.", family: "bull", engine: "target_hits", difficulty: 4, maxDarts: 30, target: "DBULL", hitsGoal: 5, tags: ["dbull", "50"] },
  { id: "dbull_3_hits", title: "DBULL — précision", subtitle: "Trois centres 50 en 18 fléchettes.", family: "bull", engine: "target_hits", difficulty: 4, maxDarts: 18, target: "DBULL", hitsGoal: 3, tags: ["dbull", "precision"] },
  { id: "bull_dbull_chain", title: "BULL → DBULL", subtitle: "Enchaîne 25 puis 50, trois fois.", family: "bull", engine: "sequence", difficulty: 5, maxDarts: 24, sequence: ["BULL", "DBULL", "BULL", "DBULL", "BULL", "DBULL"], tags: ["bull", "sequence"] },

  // RÉGULARITÉ
  { id: "switch_20_19_18", title: "Switch 20 / 19 / 18", subtitle: "T20 → T19 → T18, à répéter trois fois.", family: "regularity", engine: "sequence", difficulty: 4, maxDarts: 36, sequence: ["T20", "T19", "T18", "T20", "T19", "T18", "T20", "T19", "T18"], tags: ["switch", "triples"] },
  { id: "power_triplets", title: "Triples de puissance", subtitle: "T20 → T19 → T18, deux cycles propres.", family: "regularity", engine: "sequence", difficulty: 4, maxDarts: 24, sequence: powerTriples, tags: ["triples", "rhythm"] },
  { id: "repeat_t20_6", title: "Répétition T20", subtitle: "Six T20 sans changer de cible.", family: "regularity", engine: "target_hits", difficulty: 3, maxDarts: 30, target: "T20", hitsGoal: 6, tags: ["repeat", "T20"] },
  { id: "repeat_d16_5", title: "Répétition D16", subtitle: "Cinq D16 pour installer une routine stable.", family: "regularity", engine: "target_hits", difficulty: 3, maxDarts: 24, target: "D16", hitsGoal: 5, tags: ["repeat", "D16"] },
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
