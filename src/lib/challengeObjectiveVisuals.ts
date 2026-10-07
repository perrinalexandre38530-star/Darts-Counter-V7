import target1 from '../assets/challenge_targets/target_1.webp';
import target2 from '../assets/challenge_targets/target_2.webp';
import target3 from '../assets/challenge_targets/target_3.webp';
import target4 from '../assets/challenge_targets/target_4.webp';
import target5 from '../assets/challenge_targets/target_5.webp';
import target6 from '../assets/challenge_targets/target_6.webp';
import target7 from '../assets/challenge_targets/target_7.webp';
import target8 from '../assets/challenge_targets/target_8.webp';
import target9 from '../assets/challenge_targets/target_9.webp';
import target10 from '../assets/challenge_targets/target_10.webp';
import target11 from '../assets/challenge_targets/target_11.webp';
import target12 from '../assets/challenge_targets/target_12.webp';
import target13 from '../assets/challenge_targets/target_13.webp';
import target14 from '../assets/challenge_targets/target_14.webp';
import target15 from '../assets/challenge_targets/target_15.webp';
import target16 from '../assets/challenge_targets/target_16.webp';
import target17 from '../assets/challenge_targets/target_17.webp';
import target18 from '../assets/challenge_targets/target_18.webp';
import target19 from '../assets/challenge_targets/target_19.webp';
import target20 from '../assets/challenge_targets/target_20.webp';
import targetAnyDouble from '../assets/challenge_targets/target_any_double.webp';
import targetAnyTriple from '../assets/challenge_targets/target_any_triple.webp';
import targetBull50 from '../assets/challenge_targets/target_bull50.webp';

export function normalizeChallengeObjectiveVisual(value: any): string {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'bull' || v === 'bull25' || v === 'bull50') return 'bull';
  if (v === 'any-double' || v === 'double' || v === 'doubles') return 'any-double';
  if (v === 'any-triple' || v === 'triple' || v === 'triples') return 'any-triple';
  const n = Number(v);
  if (Number.isInteger(n) && n >= 1 && n <= 20) return String(n);
  return '20';
}

const objectiveImages: Record<string, string> = {
  '1': target1,
  '2': target2,
  '3': target3,
  '4': target4,
  '5': target5,
  '6': target6,
  '7': target7,
  '8': target8,
  '9': target9,
  '10': target10,
  '11': target11,
  '12': target12,
  '13': target13,
  '14': target14,
  '15': target15,
  '16': target16,
  '17': target17,
  '18': target18,
  '19': target19,
  '20': target20,
  'any-double': targetAnyDouble,
  'any-triple': targetAnyTriple,
  // Le Challenge BULL est unique (25 = 1 pt, 50 = 2 pts).
  // L'image DBULL sert ici uniquement d'icône compacte du centre de cible.
  bull: targetBull50,
};

export function getChallengeObjectiveImage(value: any): string {
  return objectiveImages[normalizeChallengeObjectiveVisual(value)] || target20;
}

export default objectiveImages;
