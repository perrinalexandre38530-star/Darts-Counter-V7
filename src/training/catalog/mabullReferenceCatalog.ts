import type { TrainingExerciseFamily } from "./trainingExerciseCatalog";

export type MabullReferenceKind = "exercise" | "technique";
export type MabullReferenceStatus = "mapped" | "needs_rules" | "technique";

export type MabullReferenceItem = {
  id: string;
  title: string;
  kind: MabullReferenceKind;
  family?: TrainingExerciseFamily;
  status: MabullReferenceStatus;
  mappedExerciseId?: string;
  tags: string[];
};

const ex = (id: string, title: string, family: TrainingExerciseFamily, tags: string[], mappedExerciseId?: string): MabullReferenceItem => ({
  id,
  title,
  kind: "exercise",
  family,
  status: mappedExerciseId ? "mapped" : "needs_rules",
  mappedExerciseId,
  tags,
});

const tech = (id: string, title: string, tags: string[]): MabullReferenceItem => ({
  id,
  title,
  kind: "technique",
  status: "technique",
  tags,
});

export const MABULL_REFERENCE_CATALOG: MabullReferenceItem[] = [
  ex("501_switch", "501 Switch", "regularity", ["scoring", "switch", "confirmé"]),
  ex("la_corde", "La corde", "precision", ["grouping", "pression"]),
  ex("finish_61_80", "Finish 61-80", "checkout", ["finish", "intermédiaire"]),
  ex("horloge_speed", "L'horloge speed", "precision", ["alignement", "scoring", "pression"]),
  ex("finish_41_60", "Finish 41-60", "checkout", ["finish", "intermédiaire"]),
  ex("les_anneaux", "Les anneaux", "precision", ["grouping", "précision"]),
  ex("le_121", "Le 121", "checkout", ["finish", "confirmé", "pression"], "checkout_121"),
  ex("checkout_50_challenge", "50 checkout challenge", "checkout", ["finish", "double"]),
  ex("501_premium", "501 premium", "scoring", ["scoring", "confirmé", "pression"]),
  ex("horloge_simple", "L'horloge simple", "precision", ["débutant", "alignement"], "clock_singles"),
  ex("99_fleches_20", "99 flèches au 20", "scoring", ["scoring", "grouping", "20"]),
  ex("fish_the_fish", "Fish the fish !", "regularity", ["pression", "confirmé"]),
  ex("bull_stack", "Bull Stack !", "bull", ["bulle", "pression"]),
  ex("count_up", "Count up", "scoring", ["scoring", "débutant"]),
  ex("horloge_doubles", "L'horloge aux doubles", "doubles", ["double", "finish"], "double_clock"),
  ex("horloge_hardcore", "L'horloge hardcore", "precision", ["confirmé", "pression"]),
  ex("touchettes", "Touchettes !", "precision", ["grouping", "débutant"]),
  ex("cricket_count_up", "Cricket count up", "scoring", ["scoring", "triple"]),
  ex("pekin_express", "Pekin express", "regularity", ["pression", "intermédiaire"]),
  ex("bob_27", "Le BOB 27", "doubles", ["double", "confirmé", "pression"]),
  ex("les_12_travaux", "Les 12 travaux", "regularity", ["pression", "confirmé"]),
  ex("la_routourne", "La routourne", "regularity", ["switch", "pression"]),
  ex("mabull", "Mabull !", "bull", ["bulle", "pression"]),
  ex("half_it", "Half it", "scoring", ["scoring", "pression"]),
  ex("deep_dive", "Deep dive", "precision", ["grouping", "confirmé"]),
  ex("deadline", "Deadline", "regularity", ["pression", "confirmé"]),
  ex("brochette_v", "Brochette² (V)", "precision", ["grouping", "alignement"]),
  ex("brochette_h", "Brochette² (H)", "precision", ["grouping", "alignement"]),
  ex("7_a_risques", "7 à risques !", "regularity", ["pression", "confirmé"]),
  ex("the_switcher", "The switcher", "regularity", ["switch", "triple"]),
  ex("double_ou_rien", "Double ou rien", "doubles", ["double", "pression"]),
  tech("posture_position_pieds", "Posture : la position des pieds", ["posture", "technique"]),
  tech("alignement_coude", "Alignement : placer le coude", ["alignement", "technique"]),
  tech("posture_pied_arriere", "Posture : le pied arrière", ["posture", "technique"]),
  tech("geste_release", "Geste : le lâcher (release)", ["geste", "technique"]),
  tech("geste_extension_bras", "Geste : l'extension du bras", ["geste", "technique"]),
  tech("geste_follow_through", "Geste : le suivi (follow-through)", ["geste", "technique"]),
  tech("geste_pull_back", "Geste : l'armement (pull-back)", ["geste", "technique"]),
  ex("petit_mais_costaud", "Petit mais costaud", "precision", ["grouping", "pression"]),
  ex("barrage", "Barrage", "regularity", ["pression", "confirmé"]),
  ex("surcharge", "Surcharge", "scoring", ["scoring", "pression"]),
  ex("les_5_elements", "Les 5 éléments", "regularity", ["pression", "intermédiaire"]),
  ex("jeu_de_cartes", "Le jeu de cartes", "regularity", ["pression", "variété"]),
  ex("19_suite_2", "19 à la suite 2.0", "scoring", ["19", "scoring", "grouping"]),
  ex("20_suite_2", "20 à la suite 2.0", "scoring", ["20", "scoring", "grouping"]),
  ex("navire_en_vue", "Navire en vue !", "precision", ["précision", "pression"]),
  tech("trouver_rythme", "Trouver son rythme", ["rythme", "technique"]),
  ex("mabullathon", "Le MaBULLathon", "regularity", ["endurance", "pression"]),
  ex("le_jdc", "Le JDC", "regularity", ["pression", "confirmé"]),
  tech("trouver_routine", "Trouver sa routine", ["routine", "technique"]),
  tech("importance_regard", "L'importance du regard", ["regard", "technique"]),
  ex("redemption", "Redemption", "checkout", ["finish", "pression"]),
  ex("le_1_a_20", "Le 1 à 20", "precision", ["débutant", "alignement"]),
  ex("atomic", "Atomic", "scoring", ["scoring", "triple", "pression"]),
  ex("rainbow_road", "Rainbow road", "regularity", ["variété", "pression"]),
];

export const MABULL_REFERENCE_STATS = {
  total: MABULL_REFERENCE_CATALOG.length,
  exercises: MABULL_REFERENCE_CATALOG.filter((item) => item.kind === "exercise").length,
  techniques: MABULL_REFERENCE_CATALOG.filter((item) => item.kind === "technique").length,
  mapped: MABULL_REFERENCE_CATALOG.filter((item) => item.status === "mapped").length,
};
