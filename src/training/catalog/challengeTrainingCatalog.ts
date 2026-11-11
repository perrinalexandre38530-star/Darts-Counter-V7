/**
 * Catalogue de passerelle Centre d'entraînement -> moteur officiel Challenge.
 * Aucun moteur/scoring n'est réimplémenté ici : chaque fiche utilise ChallengePlay.
 */
import type { ChallengeConfigData } from '../../pages/ChallengeConfig';
import { DEFAULT_CUSTOM_SEQUENCE, DEFAULT_HALF_IT_SEQUENCE, DOUBLES_8_TARGETS, challengeExerciseType, exerciseTitle } from '../../lib/challengeExercises';
import { CHALLENGE_ARCADE_CATALOG, isArcadeChallengePlayable, type ArcadeFamily } from '../../lib/challengeArcadeCatalog';
import { arcadeRuleDetails } from '../../lib/challengeArcadeEngine';

export type ChallengeTrainingFamily = 'cible' | 'parcours' | 'precision' | 'doubles' | 'evaluation' | 'combinaisons' | 'scoring' | 'risque' | 'strategie' | 'multijoueurs';
export type ChallengeTrainingPreset = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  family: ChallengeTrainingFamily;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** Identifiant source du moteur arcade V128; prévu pour les nouvelles fiches. */
  arcadeId?: string;
  status?: 'available' | 'preview' | 'planned';
  minPlayers?: number;
  successValidationPct: number;
  config: Partial<ChallengeConfigData> & Pick<ChallengeConfigData, 'exerciseType'>;
};

export const CHALLENGE_TRAINING_FAMILIES: Record<ChallengeTrainingFamily, string> = {
  cible: 'CIBLE FIXE', parcours: 'PARCOURS', precision: 'PRÉCISION', doubles: 'DOUBLES', evaluation: 'ÉVALUATION',
  combinaisons: 'COMBINAISONS', scoring: 'SCORING', risque: 'RISQUE', strategie: 'STRATÉGIE', multijoueurs: 'MULTIJOUEURS',
};

export const CHALLENGE_TRAINING_CATALOG: ChallengeTrainingPreset[] = [
  { id: 'challenge_t20', title: 'Cible 20 · rendement', description: '15 volées sur le secteur 20, simples, doubles et triples.', instructions: 'Vise le secteur 20. Chaque touche valide compte selon la règle Challenge : S=1, D=2, T=3.', family: 'cible', difficulty: 2, successValidationPct: 50, config: { exerciseType: 'classic', target: '20', rule: 'all', visits: 15 } },
  { id: 'challenge_t20_triple', title: 'T20 · précision', description: '10 volées : seuls les triples 20 rapportent des points.', instructions: 'Travaille le T20 et sa régularité. Les simples et doubles ne rapportent aucun point.', family: 'cible', difficulty: 4, successValidationPct: 25, config: { exerciseType: 'classic', target: '20', rule: 'triple', visits: 10 } },
  { id: 'challenge_bull', title: 'Bull Challenge', description: '10 volées pour travailler Bull 25 et Bull 50.', instructions: 'Concentre-toi sur le centre de la cible. Les touches Bull 25 et Bull 50 restent distinctes.', family: 'cible', difficulty: 3, successValidationPct: 30, config: { exerciseType: 'classic', target: 'bull', rule: 'bull', visits: 10 } },
  { id: 'challenge_free_doubles', title: 'Doubles libres', description: '12 volées : tous les doubles sont autorisés.', instructions: 'Choisis ton double à chaque lancer. Une touche simple ou triple n’est pas validée.', family: 'doubles', difficulty: 2, successValidationPct: 35, config: { exerciseType: 'classic', target: 'any-double', rule: 'double', visits: 12 } },
  { id: 'challenge_clock', title: 'Horloge complète', description: 'Parcours 1 → 20, puis Bull, trois fléchettes par étape.', instructions: 'Chaque volée impose un secteur différent. Les multiplicateurs comptent selon le barème Challenge.', family: 'parcours', difficulty: 3, successValidationPct: 50, config: { exerciseType: 'clock', target: '20', rule: 'all', visits: 21, clockIncludeBull: true, clockScoreMode: 'challenge' } },
  { id: 'challenge_clock_real', title: 'Horloge · valeur réelle', description: 'Parcours 1 → 20, scoring avec la valeur réelle des impacts.', instructions: 'Une volée par secteur, sans Bull final. Les points sont ceux de la cible (S/D/T).', family: 'parcours', difficulty: 3, successValidationPct: 45, config: { exerciseType: 'clock', target: '20', rule: 'all', visits: 20, clockIncludeBull: false, clockScoreMode: 'real' } },
  { id: 'challenge_halfit', title: 'Half-It · résistance', description: '9 objectifs progressifs. Échec : la moitié du score.', instructions: 'Respecte les objectifs officiels Half-It. Une volée sans validation divise le score par deux.', family: 'parcours', difficulty: 4, successValidationPct: 40, config: { exerciseType: 'half-it', target: '20', rule: 'all', visits: DEFAULT_HALF_IT_SEQUENCE.length, sequenceObjectives: [...DEFAULT_HALF_IT_SEQUENCE], halfItStartScore: 40 } },
  { id: 'challenge_sequence', title: 'Séquence tactique', description: '20 → double libre → 18 → triple libre → Bull.', instructions: 'Respecte l’ordre imposé et enchaîne les différents types d’impacts.', family: 'precision', difficulty: 3, successValidationPct: 50, config: { exerciseType: 'sequence', target: '20', rule: 'all', visits: DEFAULT_CUSTOM_SEQUENCE.length, sequenceObjectives: [...DEFAULT_CUSTOM_SEQUENCE], sequenceScoreMode: 'real' } },
  { id: 'challenge_group_2', title: 'Groupement · doublet', description: '10 volées, au moins deux fléchettes sur un même secteur (15–20).', instructions: 'Groupe deux fléchettes sur un même numéro, entre 15 et 20. Le moteur Challenge valide les groupements.', family: 'precision', difficulty: 3, successValidationPct: 40, config: { exerciseType: 'grouping', target: '15', rule: 'all', visits: 10, groupingMin: 15, groupingMax: 20, groupingHits: 2 } },
  { id: 'challenge_group_3', title: 'Groupement · triplet', description: '10 volées, trois fléchettes sur le même secteur (15–20).', instructions: 'Valide un triplet par volée. La marge d’erreur est nulle.', family: 'precision', difficulty: 5, successValidationPct: 20, config: { exerciseType: 'grouping', target: '15', rule: 'all', visits: 10, groupingMin: 15, groupingMax: 20, groupingHits: 3 } },
  { id: 'challenge_doubles8', title: '8 doubles · Challenge', description: 'D20, D18, D16, D12, D10, D8, D4, D2 et bonus final.', instructions: 'Trois volées par double, puis le bonus à choisir à la fin. Calcul de score identique au Challenge officiel.', family: 'doubles', difficulty: 4, successValidationPct: 35, config: { exerciseType: 'doubles8', target: '20', rule: 'double', visits: DOUBLES_8_TARGETS.length * 3 + 1, doublesTargets: [...DOUBLES_8_TARGETS], doublesTargetMode: 'official', doublesBonusTarget: 20 } },
  { id: 'challenge_jdc', title: 'JDC Challenge · bilan', description: '19 volées / 57 fléchettes et 3 phases de contrôle.', instructions: 'Secteurs 10–15, séries de doubles et Bull, puis secteurs 15–20. Les règles JDC, notamment le Shanghai, sont celles du moteur Challenge.', family: 'evaluation', difficulty: 5, successValidationPct: 40, config: { exerciseType: 'jdc', target: '10', rule: 'all', visits: 19 } },
];

/** Les 44 défis reprennent en direct les 44 définitions du moteur V135.
 * Le statut et le nombre de joueurs viennent du moteur officiel ; aucun barème parallèle.
 */
const arcadeTrainingFamily: Record<ArcadeFamily, ChallengeTrainingFamily> = {
  'PRÉCISION': 'precision', 'PARCOURS': 'parcours', 'COMBINAISONS': 'combinaisons',
  'SCORING': 'scoring', 'RISQUE': 'risque', 'STRATÉGIE': 'strategie', 'MULTIJOUEURS': 'multijoueurs',
};
export const CHALLENGE_TRAINING_ARCADE_CATALOG: ChallengeTrainingPreset[] = CHALLENGE_ARCADE_CATALOG.map((item) => ({
  id: `challenge_arcade_${item.id}`,
  arcadeId: item.id,
  status: isArcadeChallengePlayable(item.id) ? 'available' : 'planned',
  minPlayers: arcadeRuleDetails({catalogChallengeId:item.id,catalogLine:20,catalogVariant:'classic',catalogRounds:5}).minPlayers,
  title: item.title,
  description: item.description,
  instructions: item.description,
  family: arcadeTrainingFamily[item.family],
  // 100% = parcours terminé (jamais une précision de tir inventée).
  successValidationPct: 100,
  config: {
    exerciseType: 'arcade', target: '20', rule: 'all', visits: 5,
    catalogChallengeId: item.id, catalogLine: 20, catalogVariant: 'classic', catalogRounds: 5,
  },
}));
export const CHALLENGE_TRAINING_ALL: ChallengeTrainingPreset[] = [
  ...CHALLENGE_TRAINING_CATALOG, ...CHALLENGE_TRAINING_ARCADE_CATALOG,
];
export const challengeTrainingPlayable = (preset: ChallengeTrainingPreset): boolean => preset.status !== 'planned';
export function getChallengeTrainingPreset(id: string): ChallengeTrainingPreset | null {
  return CHALLENGE_TRAINING_ALL.find((preset) => preset.id === id) || null;
}

export function makeChallengeTrainingConfig(preset: ChallengeTrainingPreset, participantId: string): ChallengeConfigData {
  const id = String(participantId || '').trim();
  if (!id) throw new Error('Un profil actif est nécessaire pour démarrer un exercice Challenge.');
  if (!challengeTrainingPlayable(preset)) throw new Error('Ce Challenge ne dispose pas encore de moteur jouable.');
  if ((preset.minPlayers || 1) > 1) throw new Error('Ce Challenge nécessite plusieurs joueurs : ouvre sa configuration pour sélectionner les participants.');
  return {
    target: '20', visits: 10, rule: 'all', configMode: 'complete', matchMode: 'solo',
    participantMode: 'players', participantSource: 'direct', playerIds: [id], teamIds: [], soundsEnabled: true,
    ...preset.config,
    // Métadonnées d'origine : préservent les exercices du Centre hors Historique compétitif.
    trainingOrigin: 'training_lab', trainingCatalogPresetId: preset.id,
  } as ChallengeConfigData;
}

/** Regroupement par fiche et par compte, jamais par score d'une partie compétitive. */
export function summarizeChallengeTrainingSessions(presetId: string, sessions: readonly any[]) {
  const rows = (sessions || []).filter((session) =>
    session?.modeId === 'training_challenges' && session?.config?.trainingOrigin === 'training_lab' &&
    session?.config?.trainingCatalogPresetId === presetId,
  ).sort((a, b) => (Number(b.endedAt) || 0) - (Number(a.endedAt) || 0));
  const performances = rows.map((row) => Number(row?.metrics?.trainingPerformancePct ?? row?.metrics?.exerciseValidationRate))
    .filter((value) => Number.isFinite(value));
  return { attempts: rows.length, best: performances.length ? Math.max(...performances) : null,
    last: performances.length ? Number(rows[0]?.metrics?.trainingPerformancePct ?? rows[0]?.metrics?.exerciseValidationRate) : null,
    lastScore: rows.length ? Math.round(Number(rows[0].points) || 0) : null,
    lastAt: rows.length ? Number(rows[0].endedAt) || null : null,
  };
}

// Vérification déclarative : les 7 types du moteur Challenge ont bien des fiches.
export const CHALLENGE_TRAINING_TYPES = [...new Set(CHALLENGE_TRAINING_CATALOG.map((row) => challengeExerciseType({target: row.config.target || '20', rule: row.config.rule || 'all', visits: row.config.visits || 10, exerciseType: row.config.exerciseType})))] as const;
export const CHALLENGE_TRAINING_ENGINE_LABELS = CHALLENGE_TRAINING_CATALOG.map((row) => exerciseTitle({target: row.config.target || '20', rule: row.config.rule || 'all', visits: row.config.visits || 10, exerciseType: row.config.exerciseType}));
