/**
 * Menu unique de CHALLENGE : mêmes catégories pour les exercices historiques
 * et les nouveaux défis. Chaque carte garde son moteur spécialisé avec les mêmes catégories et réglages.
 * Les identifiants de l'ancien moteur sont conservés pour les sauvegardes.
 */
import { CHALLENGE_ARCADE_CATALOG, CHALLENGE_ARCADE_FAMILIES, type ArcadeFamily } from './challengeArcadeCatalog.ts';
import type { ChallengeExerciseType } from './challengeExercises.ts';

export type ClassicChallengeType = Exclude<ChallengeExerciseType, 'arcade'>;
export type UnifiedChallengeMode = {
  id: string;
  title: string;
  description: string;
  family: ArcadeFamily;
  exerciseType: ChallengeExerciseType;
  arcadeId?: string;
  icon: string;
  state: 'available' | 'preview' | 'planned';
};

export const EXISTING_CHALLENGE_MODES: readonly UnifiedChallengeMode[] = [
  { id:'classic',title:'CIBLE FIXE',description:'Secteur, Bull, Doubles ou Triples : score maximal sur la cible choisie.',family:'PRÉCISION',exerciseType:'classic',icon:'◎',state:'available' },
  { id:'clock',title:'HORLOGE 1 → 20',description:'Un nouveau numéro à chaque volée, avec Bull en option.',family:'PARCOURS',exerciseType:'clock',icon:'↻',state:'available' },
  { id:'half-it',title:'HALF-IT',description:'Validez chaque objectif sous peine de voir votre score divisé par deux.',family:'SCORING',exerciseType:'half-it',icon:'½',state:'available' },
  { id:'sequence',title:'SÉQUENCE PERSONNALISÉE',description:'Composez et réussissez votre propre suite de cibles.',family:'STRATÉGIE',exerciseType:'sequence',icon:'≡',state:'available' },
  { id:'grouping',title:'GROUPEMENT',description:'Regroupez deux ou trois fléchettes sur un même secteur.',family:'COMBINAISONS',exerciseType:'grouping',icon:'◉',state:'available' },
  { id:'jdc',title:'LE JDC CHALLENGE',description:'Trois phases, dix-neuf volées, Shanghai et tour des doubles.',family:'SCORING',exerciseType:'jdc',icon:'🏆',state:'available' },
  { id:'doubles8',title:'8 DOUBLES · 9 FLÉCHETTES',description:'Parcours de doubles, neuf fléchettes par cible et volée bonus.',family:'PRÉCISION',exerciseType:'doubles8',icon:'⑧',state:'available' },
];

const FAMILY_ICONS: Record<ArcadeFamily,string> = {
 'PRÉCISION':'◎',
 'PARCOURS':'↗',
 'COMBINAISONS':'✣',
 'SCORING':'✦',
 'RISQUE':'⚡',
 'STRATÉGIE':'◈',
 'MULTIJOUEURS':'♟',
};

export const CHALLENGE_MODE_OPTIONS: readonly UnifiedChallengeMode[] = [
 ...EXISTING_CHALLENGE_MODES,
 ...CHALLENGE_ARCADE_CATALOG.map((item): UnifiedChallengeMode=>({
  id:`arcade:${item.id}`,
  title:item.title,
  description:item.description,
  family:item.family,
  exerciseType:'arcade',
  arcadeId:item.id,
  icon:FAMILY_ICONS[item.family],
  state:item.status==='ready'?'available':'planned',
 })),
];
export const CHALLENGE_MODE_FAMILIES = CHALLENGE_ARCADE_FAMILIES;
export function selectedChallengeMode(exerciseType:ChallengeExerciseType,arcadeId?:string|null):UnifiedChallengeMode | undefined {
 return CHALLENGE_MODE_OPTIONS.find(item=>item.exerciseType===exerciseType && (exerciseType!=='arcade'||item.arcadeId===arcadeId));
}
