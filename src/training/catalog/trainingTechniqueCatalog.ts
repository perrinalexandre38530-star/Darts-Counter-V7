import { TRAINING_EXERCISE_CATALOG, type TrainingExerciseDefinition } from './trainingExerciseCatalog';

export type TrainingTechniqueTrack = 'setup' | 'gesture' | 'routine';

export const TRAINING_TECHNIQUE_TRACK_META: Record<TrainingTechniqueTrack, { label: string; shortLabel: string; icon: string; description: string }> = {
  setup: { label: 'POSTURE & ALIGNEMENT', shortLabel: 'Posture', icon: 'precision', description: 'Position des pieds, appuis et placement du coude.' },
  gesture: { label: 'GESTE DE LANCER', shortLabel: 'Geste', icon: 'skills', description: 'Armement, lâcher, extension et suivi du bras.' },
  routine: { label: 'RYTHME & ROUTINE', shortLabel: 'Routine', icon: 'regularity', description: 'Rythme, routine mentale et qualité du regard.' },
};

export const TRAINING_TECHNIQUE_TRACK_ORDER: TrainingTechniqueTrack[] = ['setup', 'gesture', 'routine'];

const TECHNIQUE_TRACK_BY_EXERCISE_ID: Record<string, TrainingTechniqueTrack> = {
  tech_feet: 'setup',
  tech_elbow: 'setup',
  tech_rear_foot: 'setup',
  tech_release: 'gesture',
  tech_extension: 'gesture',
  tech_follow: 'gesture',
  tech_pullback: 'gesture',
  tech_rhythm: 'routine',
  tech_routine: 'routine',
  tech_gaze: 'routine',
};

export type TrainingTechniqueItem = TrainingExerciseDefinition & { track: TrainingTechniqueTrack };

export const TRAINING_TECHNIQUE_ITEMS: TrainingTechniqueItem[] = TRAINING_EXERCISE_CATALOG
  .filter((exercise) => Object.prototype.hasOwnProperty.call(TECHNIQUE_TRACK_BY_EXERCISE_ID, exercise.id))
  .map((exercise) => ({ ...exercise, track: TECHNIQUE_TRACK_BY_EXERCISE_ID[exercise.id] }));

export function buildTrainingTechniqueTracks() {
  return TRAINING_TECHNIQUE_TRACK_ORDER.map((track) => {
    const items = TRAINING_TECHNIQUE_ITEMS.filter((item) => item.track === track);
    return {
      track,
      ...TRAINING_TECHNIQUE_TRACK_META[track],
      items,
      total: items.length,
    };
  });
}
