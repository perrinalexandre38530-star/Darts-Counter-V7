/**
 * MSS VISUAL CHARTER V1 — single source of truth for darts hits and difficulty.
 * Keep keypads, visit strips and star ratings consistent across modes.
 * Difficulty is an editorial MSS estimate, not a measured skill score.
 */
export const MSS_HIT = {
  simple: '#cbd5e1',
  double: '#4dbfea',
  triple: '#e689cc',
  miss: '#ff4c59',
  bull: '#36d99d',
  dbull: '#fc5361',
  undo: '#ffbe35',
  validate: '#ffc341',
  empty: '#657184',
} as const;
export type MSSDifficulty = 1 | 2 | 3 | 4 | 5;
export const MSS_DIFFICULTY_COLORS = ['#ffe15c', '#ffbf47', '#ff942f', '#fa633d', '#eb3c47'] as const;
export const MSS_DIFFICULTY_LABELS = ['Débutant', 'Facile', 'Intermédiaire', 'Avancé', 'Expert'] as const;
const OVERRIDES: Record<string, MSSDifficulty> = {
  x01: 2, cricket: 2, cricket_cut_throat: 3, killer: 2, killer_progressive: 3,
  capital: 4, baseball: 2, loterie: 1, shove_a_penny: 2,
  split_score: 3, chase: 3, halve_it: 4, nine_dart_century: 4,
  double_down: 3, perfect_line: 5, opposites: 4,
  green_vs_red: 3, black_vs_white: 3, three_colors: 3,
  la_suite: 3, color_call: 3, hi_score: 1,
  challenge: 3, crados: 2, p_tit_1: 2,
};
/** Stable 1–5 classification for every registry entry, including future modes. */
export function mssGameDifficulty(game: {id?: string; category?: string; subCategory?: string; label?: string} | string): MSSDifficulty {
  const id = typeof game === 'string' ? game : String(game.id || '');
  const entry = typeof game === 'string' ? { category: '', subCategory: '', label: '' } : game;
  if (OVERRIDES[id] !== undefined) return OVERRIDES[id];
  const search = `${id} ${entry.subCategory || ''} ${entry.label || ''}`.toLowerCase();
  if (/expert|impossible|precision|précision|sniper|master|perfect|ultimate|hardcore/.test(search)) return 5;
  if (/strategy|stratég|tactique|calcul|contract|contrat|roulette|poker|501_do/.test(search)) return 4;
  if (/fun|arcade|enfant|beginner|débutant|quick|rapide|bim_bam|morpion/.test(search)) return 1;
  if (/training|challenge|défi|variant|variante/.test(search)) return 3;
  if (entry.category === 'challenge' || entry.category === 'training') return 3;
  if (entry.category === 'variant') return 3;
  if (entry.category === 'fun') return 2;
  return 2;
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
