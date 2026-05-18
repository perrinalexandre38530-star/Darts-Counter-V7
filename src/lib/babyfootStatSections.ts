import type { BabyFootRichStats } from './babyfootRichStats';

export type BabyFootCompareMode = 'high' | 'low' | 'none';

export type BabyFootStatRow = {
  label: string;
  left: string | number;
  right: string | number;
  accent?: boolean;
  compare?: BabyFootCompareMode;
};

export type BabyFootStatSection = {
  key: string;
  title: string;
  rows: BabyFootStatRow[];
};

function numOrText(value: number, digits = 0) {
  if (!Number.isFinite(value)) return digits > 0 ? (0).toFixed(digits) : 0;
  return digits > 0 ? Number(value).toFixed(digits) : Math.round(value);
}

export function buildBabyFootStatSections(stats: BabyFootRichStats): BabyFootStatSection[] {
  return [
    {
      key: 'match',
      title: 'Match',
      rows: [
        { label: 'Manche', left: stats.teamA.score, right: stats.teamB.score, accent: true, compare: 'high' },
        { label: 'Sets', left: stats.teamA.sets, right: stats.teamB.sets, compare: 'high' },
        { label: 'Legs', left: stats.teamA.legs, right: stats.teamB.legs, compare: 'high' },
        { label: 'Buts', left: stats.teamA.goals, right: stats.teamB.goals, compare: 'high' },
        { label: 'Moy/leg', left: numOrText(stats.teamA.avgGoalsPerLeg, 1), right: numOrText(stats.teamB.avgGoalsPerLeg, 1), compare: 'high' },
        { label: 'Diff.', left: stats.teamA.goalDiff, right: stats.teamB.goalDiff, compare: 'high' },
        { label: 'Série', left: stats.teamA.longestRun, right: stats.teamB.longestRun, compare: 'high' },
        { label: 'Égalisations', left: stats.teamA.equalizations, right: stats.teamB.equalizations, compare: 'high' },
        { label: 'Lead changes', left: stats.teamA.leadChanges, right: stats.teamB.leadChanges, compare: 'high' },
      ],
    },
    {
      key: 'goals',
      title: 'Buts',
      rows: [
        { label: 'AV', left: stats.teamA.goalAv, right: stats.teamB.goalAv, compare: 'high' },
        { label: 'DEF', left: stats.teamA.goalDef, right: stats.teamB.goalDef, compare: 'high' },
        { label: 'GB', left: stats.teamA.goalGb, right: stats.teamB.goalGb, compare: 'high' },
        { label: 'CSC', left: stats.teamA.csc, right: stats.teamB.csc, compare: 'low' },
        { label: '% AV', left: numOrText((stats.teamA.goalAv / Math.max(1, stats.teamA.goals)) * 100), right: numOrText((stats.teamB.goalAv / Math.max(1, stats.teamB.goals)) * 100), compare: 'high' },
        { label: '% DEF', left: numOrText((stats.teamA.goalDef / Math.max(1, stats.teamA.goals)) * 100), right: numOrText((stats.teamB.goalDef / Math.max(1, stats.teamB.goals)) * 100), compare: 'high' },
        { label: '% GB', left: numOrText((stats.teamA.goalGb / Math.max(1, stats.teamA.goals)) * 100), right: numOrText((stats.teamB.goalGb / Math.max(1, stats.teamB.goals)) * 100), compare: 'high' },
        { label: 'Enc. AV', left: stats.teamA.goalsConcededAv, right: stats.teamB.goalsConcededAv, compare: 'low' },
        { label: 'Enc. DEF', left: stats.teamA.goalsConcededDef, right: stats.teamB.goalsConcededDef, compare: 'low' },
        { label: 'Enc. GB', left: stats.teamA.goalsConcededGb, right: stats.teamB.goalsConcededGb, compare: 'low' },
      ],
    },
    {
      key: 'specials',
      title: 'Spéciaux',
      rows: [
        { label: 'Gamelle', left: stats.teamA.gamelle, right: stats.teamB.gamelle, compare: 'high' },
        { label: 'Pêche +', left: stats.teamA.pecheOff, right: stats.teamB.pecheOff, compare: 'high' },
        { label: 'Pêche -', left: stats.teamA.pecheDef, right: stats.teamB.pecheDef, compare: 'high' },
        { label: 'Demis', left: stats.teamA.demi, right: stats.teamB.demi, compare: 'high' },
        { label: 'Pts demi', left: stats.teamA.demiBonus, right: stats.teamB.demiBonus, compare: 'high' },
        { label: 'Pissettes tentées', left: stats.teamA.pissette, right: stats.teamB.pissette, compare: 'high' },
        { label: 'Pissettes validées', left: stats.teamA.pissetteValid, right: stats.teamB.pissetteValid, compare: 'high' },
        { label: 'Pissettes refusées', left: stats.teamA.pissetteRefused, right: stats.teamB.pissetteRefused, compare: 'low' },
      ],
    },
    {
      key: 'impact',
      title: 'Bonus / Malus',
      rows: [
        { label: 'Hcap', left: stats.teamA.handicap, right: stats.teamB.handicap, compare: 'none' },
        { label: 'Encaissés', left: stats.teamA.goalsConceded, right: stats.teamB.goalsConceded, compare: 'low' },
      ],
    },
  ];
}
