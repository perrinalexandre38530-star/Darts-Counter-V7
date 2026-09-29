export type CradosWinnerBadgeKey = 'clean' | 'thief' | 'toxic' | 'sniper';

export type CradosWinnerBadge = {
  key: CradosWinnerBadgeKey;
  title: string;
  icon: string;
  accent: string;
  text: string;
  image: string;
  reason: string;
  score: number;
};

const CRADOS_BADGE_META: Record<CradosWinnerBadgeKey, Omit<CradosWinnerBadge, 'score'>> = {
  clean: {
    key: 'clean',
    title: 'CLEAN MASTER',
    icon: '✨',
    accent: '#73e5c1',
    text: 'le roi du nettoyage et de la jauge sous contrôle',
    image: '/img/crados-badges/clean-master.webp',
    reason: 'Attribué quand la propreté finale et la crasse lavée dominent les autres profils.',
  },
  thief: {
    key: 'thief',
    title: 'VOLEUR SUPRÊME',
    icon: '🥷',
    accent: '#ffd866',
    text: 'spécialiste des secteurs arrachés aux adversaires',
    image: '/img/crados-badges/voleur-supreme.webp',
    reason: 'Attribué quand les vols de zones et la conquête de secteurs font la différence.',
  },
  toxic: {
    key: 'toxic',
    title: 'BOUCHER TOXIQUE',
    icon: '☣',
    accent: '#ff8f80',
    text: 'a étouffé la concurrence sous la crasse',
    image: '/img/crados-badges/boucher-toxique.webp',
    reason: 'Attribué quand la crasse infligée et l’impact maximum sur une volée dominent.',
  },
  sniper: {
    key: 'sniper',
    title: 'SNIPER CRADOS',
    icon: '🎯',
    accent: '#8fc8ff',
    text: 'précision et impacts lourds au moment décisif',
    image: '/img/crados-badges/sniper-crados.webp',
    reason: 'Attribué quand la précision, les triples et les double bulls dominent.',
  },
};

export function resolveCradosWinnerBadge(params: { dirtLimit: number; winnerRow: any; winnerAccuracy: number }): CradosWinnerBadge {
  const { dirtLimit, winnerRow, winnerAccuracy } = params;
  const candidates: CradosWinnerBadge[] = [
    {
      ...CRADOS_BADGE_META.clean,
      score: Math.max(0, Number(dirtLimit || 0) - Number(winnerRow?.dirt || 0)) * 2 + Number(winnerRow?.dirtWashed || 0) * 3,
    },
    {
      ...CRADOS_BADGE_META.thief,
      score: Number(winnerRow?.steals || 0) * 7 + Number(winnerRow?.zones || 0) * 2,
    },
    {
      ...CRADOS_BADGE_META.toxic,
      score: Number(winnerRow?.dirtInflicted || 0) * 4 + Number(winnerRow?.bestVisitImpact || 0) * 2,
    },
    {
      ...CRADOS_BADGE_META.sniper,
      score: Number(winnerAccuracy || 0) * 0.7 + Number(winnerRow?.triples || 0) * 3 + Number(winnerRow?.dbulls || 0) * 6,
    },
  ];
  return candidates.sort((a, b) => b.score - a.score)[0] || { ...CRADOS_BADGE_META.clean, score: 0 };
}

export function cradosBadgeMeta(key?: string | null) {
  if (!key) return null;
  return CRADOS_BADGE_META[key as CradosWinnerBadgeKey] || null;
}

export const CRADOS_WINNER_BADGES = Object.values(CRADOS_BADGE_META);
