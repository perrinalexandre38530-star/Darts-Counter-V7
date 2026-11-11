/** Brouillons locaux Challenge lancés depuis le Centre, indépendants du match History. */
import type { ChallengeConfigData } from '../../pages/ChallengeConfig';

const STORAGE_KEY = 'dc_training_challenge_drafts_v1';
const MAX_DRAFTS = 24;
const MAX_DARTS = 360;

export type TrainingChallengeDraft = {
  participantId: string;
  presetId: string;
  savedAt: number;
  config: ChallengeConfigData;
  log: Array<{ hit: 'S' | 'D' | 'T' | '25' | '50' | 'MISS'; pid: string; segment?: number; bonusTarget?: number }>;
  bonusTargetByPlayer: Record<string, number>;
};

type DraftMap = Record<string, TrainingChallengeDraft>;
const keyFor = (participantId: string, presetId: string) => `${participantId}::${presetId}`;
const safeLoad = (): DraftMap => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch { return {}; }
};
const safeSave = (drafts: DraftMap) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)); } catch { /* quota ou navigation privée */ }
};

export function loadTrainingChallengeDraft(participantId: string, presetId: string): TrainingChallengeDraft | null {
  if (!participantId || !presetId) return null;
  const row = safeLoad()[keyFor(participantId, presetId)];
  if (!row || row.participantId !== participantId || row.presetId !== presetId || !Array.isArray(row.log) || !row.log.length || !row.config) return null;
  return row;
}

export function saveTrainingChallengeDraft(draft: TrainingChallengeDraft): void {
  if (!draft.participantId || !draft.presetId || !Array.isArray(draft.log) || !draft.log.length) return;
  const data = safeLoad();
  data[keyFor(draft.participantId, draft.presetId)] = {
    ...draft,
    savedAt: Date.now(),
    log: draft.log.slice(0, MAX_DARTS),
  };
  const keys = Object.keys(data);
  if (keys.length > MAX_DRAFTS) {
    keys.sort((a, b) => Number(data[b]?.savedAt || 0) - Number(data[a]?.savedAt || 0));
    for (const key of keys.slice(MAX_DRAFTS)) delete data[key];
  }
  safeSave(data);
}

export function clearTrainingChallengeDraft(participantId: string, presetId: string): void {
  if (!participantId || !presetId) return;
  const data = safeLoad();
  const key = keyFor(participantId, presetId);
  if (!(key in data)) return;
  delete data[key];
  safeSave(data);
}
