import type { BabyFootRichStats } from './babyfootRichStats';

export type BabyFootStatRow = {
  label: string;
  left: string | number;
  right: string | number;
  accent?: boolean;
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
        { label: 'Sets', left: stats.teamA.sets, right: stats.teamB.sets, accent: true },
        { label: 'Legs', left: stats.teamA.legs, right: stats.teamB.legs },
        { label: 'Buts', left: stats.teamA.goals, right: stats.teamB.goals },
        { label: 'Moy. buts / leg', left: numOrText(stats.teamA.avgGoalsPerLeg, 1), right: numOrText(stats.teamB.avgGoalsPerLeg, 1) },
        { label: 'Diff. buts', left: stats.teamA.goalDiff, right: stats.teamB.goalDiff },
        { label: 'Série max', left: stats.teamA.longestRun, right: stats.teamB.longestRun },
      ],
    },
    {
      key: 'specials',
      title: 'Coups spéciaux',
      rows: [
        { label: 'Gamelle', left: stats.teamA.gamelle, right: stats.teamB.gamelle },
        { label: 'Pêche', left: stats.teamA.peche, right: stats.teamB.peche },
        { label: 'Pêche off.', left: stats.teamA.pecheOff, right: stats.teamB.pecheOff },
        { label: 'Pêche déf.', left: stats.teamA.pecheDef, right: stats.teamB.pecheDef },
        { label: 'Demi', left: stats.teamA.demi, right: stats.teamB.demi },
        { label: 'Pissette', left: stats.teamA.pissette, right: stats.teamB.pissette },
      ],
    },
    {
      key: 'impact',
      title: 'Impact',
      rows: [
        { label: 'Bonus demi', left: stats.teamA.demiBonus, right: stats.teamB.demiBonus },
        { label: 'Pénalties', left: stats.teamA.penalties, right: stats.teamB.penalties },
        { label: 'Handicap', left: stats.teamA.handicap, right: stats.teamB.handicap },
        { label: 'Buts encaissés', left: stats.teamA.goalsConceded, right: stats.teamB.goalsConceded },
      ],
    },
  ];
}

export function flattenBabyFootStatRows(stats: BabyFootRichStats): BabyFootStatRow[] {
  return buildBabyFootStatSections(stats).flatMap((section) => section.rows);
}
