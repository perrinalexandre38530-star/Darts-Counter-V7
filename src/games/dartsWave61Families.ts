import { DARTS_WAVE_61 } from "./dartsWave61";

export type Wave61Family =
  | "score"
  | "precision"
  | "race"
  | "survival"
  | "mission"
  | "conquest"
  | "ascent"
  | "combat"
  | "deduction"
  | "rhythm"
  | "grid";

export type Wave61FamilyPreset = {
  family: Wave61Family;
  minPlayers: number;
  defaultRounds: number;
  defaultGoal: number;
  defaultLives: number;
  targetDriven: boolean;
  label: string;
  accent: string;
};

const FAMILY_PRESETS: Record<Wave61Family, Omit<Wave61FamilyPreset, "family">> = {
  score: { minPlayers: 1, defaultRounds: 10, defaultGoal: 0, defaultLives: 0, targetDriven: false, label: "Score & contrats", accent: "#ffbf47" },
  precision: { minPlayers: 1, defaultRounds: 10, defaultGoal: 12, defaultLives: 0, targetDriven: true, label: "Précision", accent: "#70d6ff" },
  race: { minPlayers: 1, defaultRounds: 12, defaultGoal: 100, defaultLives: 0, targetDriven: true, label: "Course", accent: "#6df7a8" },
  survival: { minPlayers: 2, defaultRounds: 14, defaultGoal: 0, defaultLives: 3, targetDriven: true, label: "Survie", accent: "#ff6b68" },
  mission: { minPlayers: 1, defaultRounds: 12, defaultGoal: 100, defaultLives: 0, targetDriven: true, label: "Mission", accent: "#cda7ff" },
  conquest: { minPlayers: 2, defaultRounds: 12, defaultGoal: 100, defaultLives: 0, targetDriven: true, label: "Conquête", accent: "#ff925c" },
  ascent: { minPlayers: 1, defaultRounds: 15, defaultGoal: 100, defaultLives: 0, targetDriven: true, label: "Ascension", accent: "#c8f2ff" },
  combat: { minPlayers: 2, defaultRounds: 12, defaultGoal: 0, defaultLives: 0, targetDriven: true, label: "Combat", accent: "#ff5874" },
  deduction: { minPlayers: 1, defaultRounds: 10, defaultGoal: 10, defaultLives: 0, targetDriven: true, label: "Déduction", accent: "#74e3c3" },
  rhythm: { minPlayers: 1, defaultRounds: 10, defaultGoal: 100, defaultLives: 0, targetDriven: true, label: "Rythme", accent: "#f779ff" },
  grid: { minPlayers: 2, defaultRounds: 18, defaultGoal: 4, defaultLives: 0, targetDriven: false, label: "Plateau", accent: "#ffd43b" },
};

const MODE_FAMILY: Record<string, Wave61Family> = {
  tug_rush: "race",
  demineur: "deduction",
  heist_180: "mission",
  hot_potato: "survival",
  zombie_siege: "survival",
  replicat: "precision",
  knockback: "combat",
  double_down: "score",
  nine_dart_century: "score",
  shove_a_penny: "score",
  green_vs_red: "score",
  hi_score: "score",
  un_deux_trois_soleil: "race",
  le_loup: "survival",
  chat_souris: "race",
  eperviers: "survival",
  colin_maillard: "deduction",
  ballon_prisonnier: "combat",
  final_buzzer: "rhythm",
  maze_chase: "race",
  chien_chat: "race",
  escape_game: "mission",
  iceberg: "survival",
  objectif_lune: "mission",
  golden_dart: "precision",
  roller_coaster: "race",
  jackpot: "score",
  hollywood: "mission",
  saut_a_la_corde: "rhythm",
  athletisme: "race",
  calendrier_maya: "mission",
  chute_libre: "race",
  tyrolien: "race",
  mont_blanc: "ascent",
  everest: "ascent",
  summit_14: "ascent",
  mafia: "deduction",
  vikings: "conquest",
  codebreaker: "deduction",
  black_flag: "conquest",
  pyramides: "mission",
  menhir_mayhem: "conquest",
  attila: "conquest",
  poseidon: "conquest",
  cosmo_knights: "combat",
  draco_spheres: "mission",
  mythologie: "mission",
  jardinier: "mission",
  microscopia: "mission",
  disjoncte: "mission",
  jurassic_dart: "survival",
  face_mystere: "deduction",
  align_4: "grid",
  spartacus: "combat",
  cheval_de_troie: "conquest",
  sniper: "precision",
  petit_bac: "mission",
  luciole: "precision",
  sabaudia_dauphine: "conquest",
  galaxies: "conquest",
  apocalypse: "survival",
  mistigri: "survival",
  radin: "score",
  corbeau_renard: "mission",
  darts_impossible: "precision",
};

const MODE_OVERRIDES: Record<string, Partial<Wave61FamilyPreset>> = {
  tug_rush: { minPlayers: 2, defaultGoal: 60, defaultRounds: 15 },
  demineur: { defaultGoal: 15, defaultRounds: 16 },
  heist_180: { defaultGoal: 100, defaultRounds: 16 },
  escape_game: { defaultGoal: 100, defaultRounds: 14 },
  objectif_lune: { defaultGoal: 100, defaultRounds: 16 },
  hollywood: { defaultGoal: 100, defaultRounds: 16 },
  calendrier_maya: { defaultGoal: 100, defaultRounds: 18 },
  pyramides: { defaultGoal: 100, defaultRounds: 18 },
  draco_spheres: { defaultGoal: 7, defaultRounds: 18 },
  mythologie: { defaultGoal: 100, defaultRounds: 18 },
  jardinier: { defaultGoal: 100, defaultRounds: 18 },
  microscopia: { defaultGoal: 100, defaultRounds: 18 },
  disjoncte: { defaultGoal: 100, defaultRounds: 16 },
  petit_bac: { defaultGoal: 100, defaultRounds: 12 },
  hot_potato: { defaultLives: 5, defaultRounds: 20 },
  zombie_siege: { defaultLives: 4, defaultRounds: 18 },
  le_loup: { defaultLives: 3, defaultRounds: 18 },
  eperviers: { defaultLives: 0, defaultRounds: 18, defaultGoal: 100 },
  ballon_prisonnier: { defaultRounds: 18 },
  iceberg: { defaultLives: 3, defaultRounds: 18, defaultGoal: 5 },
  jurassic_dart: { defaultLives: 3, defaultRounds: 18, defaultGoal: 100 },
  apocalypse: { defaultLives: 3, defaultRounds: 20, defaultGoal: 100 },
  replicat: { defaultGoal: 9, defaultRounds: 12 },
  knockback: { defaultGoal: 301, defaultRounds: 25 },
  spartacus: { defaultRounds: 18 },
  cosmo_knights: { defaultRounds: 18 },
  double_down: { defaultRounds: 9 },
  nine_dart_century: { defaultRounds: 3, defaultGoal: 100 },
  shove_a_penny: { minPlayers: 2, defaultRounds: 15, defaultGoal: 21 },
  green_vs_red: { minPlayers: 2, defaultRounds: 14, defaultGoal: 10 },
  hi_score: { defaultRounds: 10 },
  final_buzzer: { defaultRounds: 8, defaultGoal: 80 },
  un_deux_trois_soleil: { defaultGoal: 100, defaultRounds: 16 },
  chat_souris: { minPlayers: 2, defaultGoal: 100, defaultRounds: 18 },
  maze_chase: { defaultGoal: 20, defaultRounds: 18 },
  chien_chat: { minPlayers: 2, defaultGoal: 100, defaultRounds: 16 },
  roller_coaster: { defaultGoal: 100, defaultRounds: 14 },
  saut_a_la_corde: { defaultGoal: 100, defaultRounds: 16 },
  athletisme: { defaultGoal: 0, defaultRounds: 6 },
  objectif_lune: { defaultGoal: 100, defaultRounds: 12 },
  golden_dart: { defaultGoal: 7, defaultRounds: 12 },
  chute_libre: { defaultGoal: 0, defaultRounds: 12 },
  tyrolien: { defaultGoal: 100, defaultRounds: 14 },
  mont_blanc: { defaultGoal: 100, defaultRounds: 12 },
  everest: { defaultGoal: 100, defaultRounds: 16 },
  summit_14: { defaultGoal: 140, defaultRounds: 22 },
  codebreaker: { defaultGoal: 3, defaultRounds: 12 },
  colin_maillard: { defaultGoal: 6, defaultRounds: 14 },
  face_mystere: { defaultGoal: 19, defaultRounds: 14 },
  mafia: { minPlayers: 4, defaultRounds: 12 },
  draco_spheres: { defaultGoal: 7, defaultRounds: 14 },
  align_4: { defaultRounds: 21, defaultGoal: 4, minPlayers: 2 },
  sniper: { defaultGoal: 12, defaultRounds: 12 },
  luciole: { defaultGoal: 10, defaultRounds: 12 },
  vikings: { minPlayers: 2, defaultGoal: 100, defaultRounds: 18 },
  black_flag: { minPlayers: 2, defaultGoal: 100, defaultRounds: 18 },
  menhir_mayhem: { minPlayers: 2, defaultGoal: 100, defaultRounds: 18 },
  attila: { minPlayers: 2, defaultGoal: 100, defaultRounds: 20 },
  poseidon: { minPlayers: 2, defaultGoal: 100, defaultRounds: 18 },
  cheval_de_troie: { defaultGoal: 100, defaultRounds: 18 },
  sabaudia_dauphine: { minPlayers: 2, defaultGoal: 100, defaultRounds: 20 },
  galaxies: { minPlayers: 2, defaultGoal: 100, defaultRounds: 22 },
  mistigri: { defaultLives: 4, defaultRounds: 16, defaultGoal: 0, minPlayers: 2 },
  radin: { defaultRounds: 12, defaultGoal: 0, minPlayers: 2 },
  corbeau_renard: { defaultRounds: 16, defaultGoal: 0, minPlayers: 2 },
  darts_impossible: { defaultRounds: 12, defaultGoal: 0, minPlayers: 1 },
};

export function getWave61Family(modeId: string): Wave61Family {
  return MODE_FAMILY[String(modeId || "")] || "mission";
}

export function getWave61Preset(modeId: string): Wave61FamilyPreset {
  const family = getWave61Family(modeId);
  return { family, ...FAMILY_PRESETS[family], ...(MODE_OVERRIDES[String(modeId || "")] || {}) };
}

export const WAVE61_FAMILY_COUNTS = DARTS_WAVE_61.reduce<Record<Wave61Family, number>>((acc, mode) => {
  const family = getWave61Family(mode.id);
  acc[family] = (acc[family] || 0) + 1;
  return acc;
}, {
  score: 0,
  precision: 0,
  race: 0,
  survival: 0,
  mission: 0,
  conquest: 0,
  ascent: 0,
  combat: 0,
  deduction: 0,
  rhythm: 0,
  grid: 0,
});

const unclassified = DARTS_WAVE_61.filter((mode) => !MODE_FAMILY[mode.id]);
if (unclassified.length) {
  throw new Error(`[WAVE61] Modes sans famille: ${unclassified.map((mode) => mode.id).join(", ")}`);
}

export const WAVE61_FAMILY_LABELS: Record<Wave61Family, string> = Object.fromEntries(
  Object.entries(FAMILY_PRESETS).map(([id, preset]) => [id, preset.label])
) as Record<Wave61Family, string>;
