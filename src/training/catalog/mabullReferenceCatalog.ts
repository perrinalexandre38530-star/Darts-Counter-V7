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

const tech = (id: string, title: string, tags: string[], mappedExerciseId?: string): MabullReferenceItem => ({
  id,
  title,
  kind: "technique",
  status: mappedExerciseId ? "mapped" : "technique",
  mappedExerciseId,
  tags,
});

export const MABULL_REFERENCE_CATALOG: MabullReferenceItem[] = [
  ex("501_switch", "501 Switch", "regularity", ["scoring", "switch", "confirmé"], "lab_501_switch"),
  ex("la_corde", "La corde", "precision", ["grouping", "pression"], "lab_rope"),
  ex("finish_61_80", "Finish 61-80", "checkout", ["finish", "intermédiaire"], "lab_finish_61_80"),
  ex("horloge_speed", "L'horloge speed", "precision", ["alignement", "scoring", "pression"], "lab_clock_speed"),
  ex("finish_41_60", "Finish 41-60", "checkout", ["finish", "intermédiaire"], "lab_finish_41_60"),
  ex("les_anneaux", "Les anneaux", "precision", ["grouping", "précision"], "lab_rings"),
  ex("le_121", "Le 121", "checkout", ["finish", "confirmé", "pression"], "lab_121"),
  ex("checkout_50_challenge", "50 checkout challenge", "checkout", ["finish", "double"], "lab_checkout50"),
  ex("501_premium", "501 premium", "scoring", ["scoring", "confirmé", "pression"], "lab_501_premium"),
  ex("horloge_simple", "L'horloge simple", "precision", ["débutant", "alignement"], "lab_clock_simple"),
  ex("99_fleches_20", "99 flèches au 20", "scoring", ["scoring", "grouping", "20"], "lab_99_20"),
  ex("fish_the_fish", "Fish the fish !", "regularity", ["pression", "confirmé"], "lab_fish170"),
  ex("bull_stack", "Bull Stack !", "bull", ["bulle", "pression"], "lab_bull_stack"),
  ex("count_up", "Count up", "scoring", ["scoring", "débutant"], "lab_count_up"),
  ex("horloge_doubles", "L'horloge aux doubles", "doubles", ["double", "finish"], "lab_clock_doubles"),
  ex("horloge_hardcore", "L'horloge hardcore", "precision", ["confirmé", "pression"], "lab_clock_hardcore"),
  ex("touchettes", "Touchettes !", "precision", ["grouping", "débutant"], "lab_touchettes"),
  ex("cricket_count_up", "Cricket count up", "scoring", ["scoring", "triple"], "lab_cricket_count"),
  ex("pekin_express", "Pekin express", "regularity", ["pression", "intermédiaire"], "lab_pekin"),
  ex("bob_27", "Le BOB 27", "doubles", ["double", "confirmé", "pression"], "lab_bob27"),
  ex("les_12_travaux", "Les 12 travaux", "regularity", ["pression", "confirmé"], "lab_12works"),
  ex("la_routourne", "La routourne", "regularity", ["switch", "pression"], "lab_routourne"),
  ex("mabull", "Balance Bull", "bull", ["bulle", "pression"], "lab_balance_bull"),
  ex("half_it", "Half it", "scoring", ["scoring", "pression"], "lab_half_it"),
  ex("deep_dive", "Deep dive", "precision", ["grouping", "confirmé"], "lab_deep_dive"),
  ex("deadline", "Deadline", "regularity", ["pression", "confirmé"], "lab_deadline"),
  ex("brochette_v", "Brochette² (V)", "precision", ["grouping", "alignement"], "lab_brochette_v"),
  ex("brochette_h", "Brochette² (H)", "precision", ["grouping", "alignement"], "lab_brochette_h"),
  ex("7_a_risques", "7 à risques !", "regularity", ["pression", "confirmé"], "lab_risk7"),
  ex("the_switcher", "The switcher", "regularity", ["switch", "triple"], "lab_switcher"),
  ex("double_ou_rien", "Double ou rien", "doubles", ["double", "pression"], "lab_double_or_nothing"),
  tech("posture_position_pieds", "Posture : la position des pieds", ["posture", "technique"], "tech_feet"),
  tech("alignement_coude", "Alignement : placer le coude", ["alignement", "technique"], "tech_elbow"),
  tech("posture_pied_arriere", "Posture : le pied arrière", ["posture", "technique"], "tech_rear_foot"),
  tech("geste_release", "Geste : le lâcher (release)", ["geste", "technique"], "tech_release"),
  tech("geste_extension_bras", "Geste : l'extension du bras", ["geste", "technique"], "tech_extension"),
  tech("geste_follow_through", "Geste : le suivi (follow-through)", ["geste", "technique"], "tech_follow"),
  tech("geste_pull_back", "Geste : l'armement (pull-back)", ["geste", "technique"], "tech_pullback"),
  ex("petit_mais_costaud", "Petit mais costaud", "precision", ["grouping", "pression"], "lab_small_tough"),
  ex("barrage", "Barrage", "regularity", ["pression", "confirmé"], "lab_barrage"),
  ex("surcharge", "Surcharge", "scoring", ["scoring", "pression"], "lab_surcharge"),
  ex("les_5_elements", "Les 5 éléments", "regularity", ["pression", "intermédiaire"], "lab_5elements"),
  ex("jeu_de_cartes", "Le jeu de cartes", "regularity", ["pression", "variété"], "lab_cards"),
  ex("19_suite_2", "19 à la suite 2.0", "scoring", ["19", "scoring", "grouping"], "lab_19_streak"),
  ex("20_suite_2", "20 à la suite 2.0", "scoring", ["20", "scoring", "grouping"], "lab_20_streak"),
  ex("navire_en_vue", "Navire en vue !", "precision", ["précision", "pression"], "lab_ship"),
  tech("trouver_rythme", "Trouver son rythme", ["rythme", "technique"], "tech_rhythm"),
  ex("mabullathon", "Endurance 42", "regularity", ["endurance", "pression"], "lab_endurance42"),
  ex("le_jdc", "Le JDC", "regularity", ["pression", "confirmé"], "lab_jdc"),
  tech("trouver_routine", "Trouver sa routine", ["routine", "technique"], "tech_routine"),
  tech("importance_regard", "L'importance du regard", ["regard", "technique"], "tech_gaze"),
  ex("redemption", "Redemption", "checkout", ["finish", "pression"], "lab_redemption"),
  ex("le_1_a_20", "Le 1 à 20", "precision", ["débutant", "alignement"], "lab_1to20"),
  ex("atomic", "Atomic", "scoring", ["scoring", "triple", "pression"], "lab_atomic"),
  ex("rainbow_road", "Rainbow road", "regularity", ["variété", "pression"], "lab_rainbow"),
];

export const MABULL_REFERENCE_STATS = {
  total: MABULL_REFERENCE_CATALOG.length,
  exercises: MABULL_REFERENCE_CATALOG.filter((item) => item.kind === "exercise").length,
  techniques: MABULL_REFERENCE_CATALOG.filter((item) => item.kind === "technique").length,
  mapped: MABULL_REFERENCE_CATALOG.filter((item) => item.status === "mapped").length,
};
