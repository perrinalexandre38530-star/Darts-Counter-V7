import { MABULL_REFERENCE_CATALOG, type MabullReferenceItem } from './mabullReferenceCatalog';
import type { TrainingExerciseFamily } from './trainingExerciseCatalog';

export type MabullCatalogSection = TrainingExerciseFamily | 'technique';

export const MABULL_SECTION_META: Record<MabullCatalogSection, { label: string; shortLabel: string; icon: string }> = {
  scoring: { label: 'SCORING', shortLabel: 'Score', icon: 'scoring' },
  doubles: { label: 'DOUBLES', shortLabel: 'Doubles', icon: 'doubles' },
  checkout: { label: 'FINISH', shortLabel: 'Finish', icon: 'checkout' },
  precision: { label: 'PRÉCISION', shortLabel: 'Précision', icon: 'precision' },
  bull: { label: 'BULL', shortLabel: 'Bull', icon: 'bull' },
  regularity: { label: 'JEUX / RÉGULARITÉ', shortLabel: 'Jeux', icon: 'regularity' },
  technique: { label: 'TECHNIQUE', shortLabel: 'Technique', icon: 'coach' },
};

export const MABULL_SECTION_ORDER: MabullCatalogSection[] = ['scoring', 'doubles', 'checkout', 'precision', 'bull', 'regularity', 'technique'];

export function getMabullItemSection(item: MabullReferenceItem): MabullCatalogSection {
  return item.kind === 'technique' ? 'technique' : (item.family || 'regularity');
}

export function buildMabullCatalogCoverage() {
  return MABULL_SECTION_ORDER.map((section) => {
    const items = MABULL_REFERENCE_CATALOG.filter((item) => getMabullItemSection(item) === section);
    const mapped = items.filter((item) => item.status === 'mapped').length;
    return {
      section,
      label: MABULL_SECTION_META[section].label,
      total: items.length,
      mapped,
      pending: items.length - mapped,
      pct: items.length ? Math.round((mapped / items.length) * 100) : 0,
    };
  });
}

const conversionPriorityIds = [
  'finish_41_60',
  'finish_61_80',
  'checkout_50_challenge',
  'bob_27',
  'half_it',
  'count_up',
  'cricket_count_up',
  '99_fleches_20',
  'le_1_a_20',
  '501_switch',
  'double_ou_rien',
  'bull_stack',
];

export function buildMabullConversionQueue(limit = 3) {
  const pending = MABULL_REFERENCE_CATALOG.filter((item) => item.kind === 'exercise' && item.status !== 'mapped');
  const rank = new Map(conversionPriorityIds.map((id, index) => [id, index]));
  return [...pending]
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) || a.title.localeCompare(b.title, 'fr'))
    .slice(0, Math.max(1, limit));
}

export type MabullTechniqueTrack = 'setup' | 'gesture' | 'routine';

export const MABULL_TECHNIQUE_TRACK_META: Record<MabullTechniqueTrack, { label: string; shortLabel: string; icon: string; description: string }> = {
  setup: { label: 'POSTURE & ALIGNEMENT', shortLabel: 'Posture', icon: 'precision', description: 'Position des pieds, appuis et placement du coude.' },
  gesture: { label: 'GESTE DE LANCER', shortLabel: 'Geste', icon: 'skills', description: 'Armement, lâcher, extension et suivi du bras.' },
  routine: { label: 'RYTHME & ROUTINE', shortLabel: 'Routine', icon: 'regularity', description: 'Rythme, routine mentale et importance du regard.' },
};

export const MABULL_TECHNIQUE_TRACK_ORDER: MabullTechniqueTrack[] = ['setup', 'gesture', 'routine'];

export function getMabullTechniqueTrack(item: MabullReferenceItem): MabullTechniqueTrack {
  const haystack = `${item.title} ${item.tags.join(' ')}`.toLowerCase();
  if (haystack.includes('posture') || haystack.includes('alignement') || haystack.includes('pied') || haystack.includes('coude')) return 'setup';
  if (haystack.includes('geste') || haystack.includes('release') || haystack.includes('bras') || haystack.includes('follow') || haystack.includes('pull-back')) return 'gesture';
  return 'routine';
}

export function buildMabullTechniqueTracks() {
  return MABULL_TECHNIQUE_TRACK_ORDER.map((track) => {
    const items = MABULL_REFERENCE_CATALOG.filter((item) => item.kind === 'technique' && getMabullTechniqueTrack(item) === track);
    return {
      track,
      ...MABULL_TECHNIQUE_TRACK_META[track],
      items,
      total: items.length,
    };
  });
}
