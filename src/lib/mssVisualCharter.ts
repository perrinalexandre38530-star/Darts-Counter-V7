/**
 * MSS VISUAL CHARTER V1 — single source of truth for darts hits and difficulty.
 * Keep keypads, visit strips and star ratings consistent across modes.
 * Difficulty is an editorial MSS estimate, not a measured skill score.
 */
export const MSS_HIT = {
  simple: '#cbd5e1',
  double: '#4dbfea',
  triple: '#e689cc',
  miss: '#e5a13a',
  bull: '#36d99d',
  dbull: '#fc5361',
  undo: '#ffbe35',
  validate: '#ffc341',
  empty: '#657184',
} as const;
export type MSSDifficulty = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;
export const MSS_DIFFICULTY_COLORS = ['#ffe15c', '#ffbf47', '#ff942f', '#fa633d', '#eb3c47'] as const;
export const MSS_DIFFICULTY_LABELS = ['Initiation', 'Facile', 'Intermédiaire', 'Difficile', 'Expert'] as const;
export const MSS_DIFFICULTY_LEVELS: MSSDifficulty[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export function mssDifficultyLabel(level: number): string {
  if (level <= 1) return 'Initiation';
  if (level < 2) return 'Très accessible';
  if (level === 2) return 'Facile';
  if (level < 3) return 'Facile +';
  if (level === 3) return 'Intermédiaire';
  if (level < 4) return 'Intermédiaire +';
  if (level === 4) return 'Difficile';
  if (level < 5) return 'Très difficile';
  return 'Expert';
}
/**
 * Évaluation éditoriale par mode : exigences de précision (cibles et multiplicateurs),
 * régularité, séquences obligatoires, pression de l'échec et décisions tactiques.
 * Valeur = difficulté de bien jouer en configuration standard, pas complexité de l'interface.
 * Garder chaque ID du registre central et de Wave61 dans cette grille.
 */
const GAME_RATINGS: Readonly<Record<string, MSSDifficulty>> = {
  x01: 2.5,
  challenge: 3,
  cricket: 3,
  darts_poker: 3.5,
  cargo: 3.5,
  killer: 2.5,
  shanghai: 3,
  battle_royale: 3,
  warfare: 3.5,
  five_lives: 2.5,
  chase: 3,
  gros_6: 2.5,
  golf: 2,
  scram: 3,
  closest_center: 3.5,
  ptit_hun: 3,
  enculette: 2.5,
  cricket_cut_throat: 3.5,
  killer_progressive: 3.5,
  super_bull: 2,
  happy_mille: 2,
  v170: 4.5,
  count_up: 1,
  split_score: 3.5,
  halve_it: 4,
  bobs_27: 4,
  knockout: 3,
  shooter: 3,
  baseball: 2,
  attrape_moi: 3.5,
  president: 3.5,
  kilo_de_merde: 1.5,
  football: 3,
  rugby: 3,
  capital: 4,
  departements: 3,
  darts_firefighter: 3,
  loterie: 1,
  fifty_one_by_five: 2.5,
  looper: 2.5,
  call_three: 2.5,
  steeplechase: 2.5,
  pendu: 2.5,
  menteur: 2.5,
  crados: 2,
  bss_king: 3.5,
  castle: 2.5,
  gotcha: 2,
  hare_hounds: 2,
  prisoner: 2.5,
  tic_tac_toe: 2.5,
  top_10: 1.5,
  top_10_training: 2.5,
  bastard: 2,
  fun_gages: 1,
  bowling: 1.5,
  bingo: 1.5,
  follow_the_leader: 3,
  mario_kart: 2.5,
  ocean_control: 3.5,
  conquest: 3,
  domination: 3,
  mines_traps: 3.5,
  last_man_standing: 3,
  bomb_countdown: 2.5,
  infection: 2.5,
  randomizer: 1,
  casino: 1.5,
  chaos_mode: 1.5,
  coop_mission: 2.5,
  boss_battle: 3,
  training_precision_gauntlet: 4,
  training_time_attack: 3,
  training_repeat_master: 4,
  training_ghost: 3,
  rpg_darts: 2.5,
  blind_darts: 3.5,
  sound_darts: 2.5,
  training_x01: 3.5,
  tour_horloge: 2.5,
  training_doubleio: 4,
  training_challenges: 3.5,
  training_super_bull: 3.5,
  tug_rush: 3,
  demineur: 3,
  heist_180: 3,
  mexicain: 2.5,
  hot_potato: 2,
  zombie_siege: 3,
  replicat: 4,
  knockback: 3,
  double_down: 3.5,
  nine_dart_century: 3,
  shove_a_penny: 3.5,
  green_vs_red: 3,
  black_vs_white: 2,
  three_colors: 3.5,
  la_suite: 4,
  color_call: 2.5,
  bim_bam_boum: 4,
  saute_moutons: 1.5,
  troupeau_en_danger: 2.5,
  une_ptite_raclette: 1.5,
  hi_score: 1,
  un_deux_trois_soleil: 1.5,
  le_loup: 2,
  chat_souris: 2,
  eperviers: 2,
  colin_maillard: 3,
  ballon_prisonnier: 2.5,
  final_buzzer: 3,
  maze_chase: 2.5,
  chien_chat: 2,
  escape_game: 4,
  iceberg: 2.5,
  objectif_lune: 2.5,
  golden_dart: 3,
  roller_coaster: 2.5,
  jackpot: 2,
  hollywood: 2,
  saut_a_la_corde: 3,
  athletisme: 3,
  calendrier_maya: 3,
  chute_libre: 2.5,
  tyrolien: 2.5,
  mont_blanc: 2.5,
  everest: 4,
  summit_14: 3.5,
  mafia: 3.5,
  vikings: 2.5,
  codebreaker: 4,
  black_flag: 3.5,
  pyramides: 3,
  menhir_mayhem: 2.5,
  attila: 2.5,
  poseidon: 2.5,
  cosmo_knights: 3,
  draco_spheres: 3,
  mythologie: 3,
  jardinier: 2,
  microscopia: 3,
  disjoncte: 3.5,
  jurassic_dart: 2.5,
  face_mystere: 3,
  align_4: 3,
  spartacus: 2.5,
  cheval_de_troie: 3.5,
  sniper: 4.5,
  petit_bac: 2,
  luciole: 4,
  sabaudia_dauphine: 3,
  galaxies: 3,
  apocalypse: 3,
  mistigri: 2,
  radin: 2.5,
  corbeau_renard: 2.5,
  darts_impossible: 5,
};
/** Difficulty rating for a mode; uncatalogued modes are neutral pending manual review. */
export function mssGameDifficulty(game: {id?: string; category?: string; subCategory?: string; label?: string} | string): MSSDifficulty {
  const id = typeof game === 'string' ? game : String(game.id || '');
  return GAME_RATINGS[id] ?? 3;
}
/** Estimation éditoriale des défis (aucun effet sur les scores ni sur les moteurs). */
export function mssChallengeDifficulty(challenge: { id?: string; title?: string; description?: string; family?: string; difficulty?: number }): MSSDifficulty {
  const saved = Number(challenge.difficulty);
  if (Number.isInteger(saved) && saved >= 1 && saved <= 5) return saved as MSSDifficulty;
  const id = String(challenge.id || '').replace(/^challenge_arcade_|^arcade:/, '').toLowerCase();
  const title = String(challenge.title || '').toLowerCase();
  const text = `${id} ${title} ${challenge.description || ''}`.toLowerCase();
  const baseline: Record<string, MSSDifficulty> = {
    classic: 2, clock: 3, 'half-it': 4, sequence: 3, grouping: 3, jdc: 5, doubles8: 4,
    'perfect-line': 5, 'perfect_line': 5, 'opposites': 4, 'les-opposes': 4,
  };
  if (baseline[id]) return baseline[id];
  if (/impossible|hardcore|expert|parfait|perfect|sniper|triple precision|triple précision|sans filet|coffre.fort/.test(text)) return 5;
  if (/double|bull|sequence|séquence|combinaison|serrure|calcul|risque|contrainte|sauvetage|zone interdite|paliers/.test(text)) return 4;
  if (/simple|débutant|debutant|initiation|découverte|decouverte/.test(text)) return 1;
  if (/chrono|horloge|zigzag|serpent|spirale|précision|precision|tactique|ascension/.test(text)) return 3;
  if (/multijoueurs|stratégie|strategie|combinaisons/.test(String(challenge.family || '').toLowerCase())) return 3;
  return 2;
}
export function mssHitColor(dart?: {v?: number; mult?: number; bed?: string} | null): string {
  if (!dart) return MSS_HIT.empty;
  const bed = String(dart.bed || '');
  if (dart.v === 0 || bed === 'MISS') return MSS_HIT.miss;
  if (bed === 'IB' || dart.v === 50 || (dart.v === 25 && dart.mult === 2)) return MSS_HIT.dbull;
  if (bed === 'OB' || dart.v === 25) return MSS_HIT.bull;
  if (bed === 'T' || dart.mult === 3) return MSS_HIT.triple;
  if (bed === 'D' || dart.mult === 2) return MSS_HIT.double;
  return MSS_HIT.simple;
}
