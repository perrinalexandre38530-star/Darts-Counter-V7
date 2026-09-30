import React from 'react';
import BackDot from '../components/BackDot';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../contexts/StoreContext';
import { useAwenaOptional } from '../awena/AwenaProvider';
import { useFullscreenPlay } from '../hooks/useFullscreenPlay';
import { loadTeamsBySport } from '../lib/petanqueTeamsStore';
import { History } from '../lib/history';
import { recordTrainingDetailedSession } from '../training/stats/trainingStatsHub';
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
import targetBull25 from '../assets/challenge_targets/target_bull25.webp';
import targetBull50 from '../assets/challenge_targets/target_bull50.webp';
import type { ChallengeConfigData, ChallengeRule } from './ChallengeConfig';

type Hit = 'S' | 'D' | 'T' | '25' | '50' | 'MISS';
type Entry = { hit: Hit; pid: string };
type Participant = { id: string; name: string; profile?: any; team?: any; teamName?: string };
type ParticipantComputedStats = {
  score: number;
  darts: number;
  hits: number;
  misses: number;
  pct: number;
  streak: number;
  hitCounts: Record<Hit, number>;
};

const hits: Hit[] = ['S', 'D', 'T', '25', '50', 'MISS'];
const val: Record<Hit, number> = { S: 1, D: 2, T: 3, '25': 1, '50': 2, MISS: 0 };
const targetBoards: Record<string, string> = {
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
  bull25: targetBull25,
  bull50: targetBull50,
};

const targetLabel = (t: string) => (t === 'bull25' ? 'BULL 25' : t === 'bull50' ? 'BULL 50' : t);
const ok = (h: Hit, r: ChallengeRule, t: string) =>
  h === 'MISS' ||
  (r === 'all'
    ? t === 'bull25'
      ? h === '25'
      : t === 'bull50'
        ? h === '50'
        : ['S', 'D', 'T'].includes(h)
    : r === 'single'
      ? h === 'S'
      : r === 'double'
        ? h === 'D'
        : r === 'triple'
          ? h === 'T'
          : r === 'bull25'
            ? h === '25'
            : h === '50');
const hitValue = (h: Hit, r: ChallengeRule, t: string) => (ok(h, r, t) ? val[h] : 0);
const avatarSrc = (p: any) => p?.avatarDataUrl || p?.photoDataUrl || p?.avatarUrl || p?.photoUrl || p?.avatar || p?.imageUrl || '';
const teamSrc = (t: any) => t?.logoDataUrl || t?.logoUrl || t?.avatarUrl || t?.imageUrl || '';
const normalize = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const localeMap: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ro: 'ro-RO',
  sr: 'sr-RS',
  hr: 'hr-HR',
  da: 'da-DK',
  no: 'nb-NO',
  sv: 'sv-SE',
  is: 'is-IS',
  cs: 'cs-CZ',
  tr: 'tr-TR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  hi: 'hi-IN',
  zh: 'zh-CN',
  ja: 'ja-JP',
};
const voiceWords: Record<string, Record<'S' | 'D' | 'T' | 'MISS', string[]>> = {
  fr: { S: ['simple', 's'], D: ['double', 'd', 'b'], T: ['triple', 't'], MISS: ['miss', 'rate', 'loupe', 'manque', 'zero', 'm'] },
  en: { S: ['single', 's'], D: ['double', 'd'], T: ['triple', 't'], MISS: ['miss', 'missed', 'zero', 'm'] },
  es: { S: ['simple', 's'], D: ['doble', 'd'], T: ['triple', 't'], MISS: ['fallo', 'fallado', 'cero', 'm'] },
  de: { S: ['einfach', 'single', 's'], D: ['doppel', 'double', 'd'], T: ['dreifach', 'triple', 't'], MISS: ['daneben', 'fehler', 'null', 'm'] },
  it: { S: ['singolo', 'semplice', 's'], D: ['doppio', 'd'], T: ['triplo', 't'], MISS: ['mancato', 'errore', 'zero', 'm'] },
  pt: { S: ['simples', 's'], D: ['duplo', 'd'], T: ['triplo', 't'], MISS: ['falha', 'falhou', 'zero', 'm'] },
  nl: { S: ['enkel', 'single', 's'], D: ['dubbel', 'd'], T: ['triple', 'driedubbel', 't'], MISS: ['mis', 'gemist', 'nul', 'm'] },
  pl: { S: ['pojedynczy', 's'], D: ['podwojny', 'd'], T: ['potrojny', 't'], MISS: ['pudlo', 'zero', 'm'] },
  ro: { S: ['simplu', 's'], D: ['dublu', 'd'], T: ['triplu', 't'], MISS: ['ratat', 'zero', 'm'] },
  sr: { S: ['jedan', 'singl', 's'], D: ['duplo', 'd'], T: ['troduplo', 'tripl', 't'], MISS: ['promasaj', 'nula', 'm'] },
  hr: { S: ['jedan', 'singl', 's'], D: ['duplo', 'd'], T: ['troduplo', 'tripl', 't'], MISS: ['promasaj', 'nula', 'm'] },
  da: { S: ['enkelt', 's'], D: ['dobbelt', 'd'], T: ['tredobbelt', 'triple', 't'], MISS: ['forbi', 'nul', 'm'] },
  no: { S: ['enkel', 's'], D: ['dobbel', 'd'], T: ['trippel', 't'], MISS: ['bom', 'null', 'm'] },
  sv: { S: ['enkel', 's'], D: ['dubbel', 'd'], T: ['trippel', 't'], MISS: ['miss', 'noll', 'm'] },
  is: { S: ['einfalt', 's'], D: ['tvofalt', 'd'], T: ['threfalt', 'triple', 't'], MISS: ['framhja', 'null', 'm'] },
  cs: { S: ['jednoduchy', 'single', 's'], D: ['dvojity', 'double', 'd'], T: ['trojity', 'triple', 't'], MISS: ['mimo', 'nula', 'm'] },
  tr: { S: ['tek', 'single', 's'], D: ['cift', 'double', 'd'], T: ['uclu', 'triple', 't'], MISS: ['iskala', 'sifir', 'm'] },
  ar: { S: ['مفرد', 'واحد', 's'], D: ['مزدوج', 'دبل', 'd'], T: ['ثلاثي', 'تربل', 't'], MISS: ['خطأ', 'خارج', 'صفر', 'm'] },
  ru: { S: ['одинарный', 'сингл', 's'], D: ['двойной', 'дабл', 'd'], T: ['тройной', 'трипл', 't'], MISS: ['мимо', 'ноль', 'm'] },
  hi: { S: ['सिंगल', 'एकल', 's'], D: ['डबल', 'd'], T: ['ट्रिपल', 't'], MISS: ['मिस', 'चूक', 'शून्य', 'm'] },
  zh: { S: ['单倍', '单区', 's'], D: ['双倍', 'd'], T: ['三倍', 't'], MISS: ['脱靶', '未中', '零', 'm'] },
  ja: { S: ['シングル', 's'], D: ['ダブル', 'd'], T: ['トリプル', 't'], MISS: ['ミス', '外れ', 'ゼロ', 'm'] },
};

function parseChallengeVoice(raw: string, lang: string, allowed: Hit[]): Hit | null {
  const n = normalize(raw);
  const base = (lang || 'fr').toLowerCase().split('-')[0];
  const dict = voiceWords[base] || voiceWords.en;
  for (const h of ['MISS', 'T', 'D', 'S'] as const) {
    if (!allowed.includes(h)) continue;
    if (dict[h].some((w) => {
      const x = normalize(w);
      return n === x || n.split(' ').includes(x);
    })) return h;
  }
  return null;
}

function ChallengeAvatar({ participant, size }: { participant: Participant; size: number }) {
  const direct = participant.profile ? avatarSrc(participant.profile) : teamSrc(participant.team);
  const [directFailed, setDirectFailed] = React.useState(false);
  React.useEffect(() => setDirectFailed(false), [direct]);
  if (direct && !directFailed) {
    return <img className="challenge-avatar-img" src={direct} alt="" onError={() => setDirectFailed(true)} />;
  }
  if (participant.profile) {
    return (
      <ProfileAvatar
        profile={participant.profile}
        profileId={String(participant.profile?.id || participant.id)}
        fallbackMode="full"
        loading="eager"
        noFrame
        size={size}
      />
    );
  }
  if (direct) return <img className="challenge-avatar-img" src={direct} alt="" />;
  return <span className="challenge-avatar-fallback">{String(participant.name || '?').slice(0, 1).toUpperCase()}</span>;
}

export default function ChallengePlay({ go, params }: { go: (t: any, p?: any) => void; params?: any }) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const theme = useTheme();
  const { store } = useStore();
  const awena = useAwenaOptional();
  const cfg: ChallengeConfigData =
    params?.config || {
      target: '20',
      visits: 30,
      rule: 'all',
      playerIds: [],
      teamIds: [],
      participantMode: 'players',
      participantSource: 'direct',
      configMode: 'guided',
      matchMode: 'solo',
    };

  const profiles = store?.profiles || [];
  const teams = React.useMemo(() => {
    try {
      return loadTeamsBySport('darts') || [];
    } catch {
      return [];
    }
  }, []);
  const selectedTeams = React.useMemo(
    () => teams.filter((team: any) => (cfg.teamIds || []).includes(String(team.id))),
    [teams, cfg.teamIds],
  );

  const participants = React.useMemo<Participant[]>(() => {
    const picked = profiles
      .filter((p: any) => cfg.playerIds?.includes(String(p.id)))
      .map((p: any) => {
        const team = selectedTeams.find((t: any) => Array.isArray(t?.playerIds) && t.playerIds.map(String).includes(String(p.id)));
        return { id: String(p.id), name: p.name || p.nickname || 'Joueur', profile: p, team, teamName: team?.name || '' };
      });
    if (picked.length) return picked;
    if (cfg.participantMode === 'teams') {
      return (cfg.teamIds || [])
        .map((id) => {
          const team = teams.find((t: any) => String(t.id) === String(id));
          return team ? { id: `team:${team.id}`, name: team.name || 'Équipe', team } : null;
        })
        .filter(Boolean) as Participant[];
    }
    return [];
  }, [cfg.playerIds, cfg.participantMode, cfg.teamIds, profiles, selectedTeams, teams]);

  const safeParticipants = participants.length ? participants : [{ id: 'solo', name: 'Joueur' }];
  const [log, setLog] = React.useState<Entry[]>([]);
  const [rankOpen, setRankOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [voiceOn, setVoiceOn] = React.useState(false);
  const [voiceHeard, setVoiceHeard] = React.useState('');
  const matchIdRef = React.useRef(`challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const createdAtRef = React.useRef(Date.now());
  const lastPersistSignatureRef = React.useRef('');
  const trainingSavedRef = React.useRef(false);

  const totalMax = cfg.visits * 3 * safeParticipants.length;
  const done = log.length >= totalMax;
  const activeIndex = Math.floor(log.length / 3) % safeParticipants.length;
  const current = safeParticipants[activeIndex];
  const currentLog = log.filter((e) => e.pid === current.id);
  const turn = Math.min(cfg.visits, Math.floor(currentLog.length / 3) + 1);
  const currentScore = currentLog.reduce((s, e) => s + hitValue(e.hit, cfg.rule, cfg.target), 0);
  const currentHits = currentLog.map((e) => e.hit);
  const counts = Object.fromEntries(hits.map((h) => [h, currentHits.filter((x) => x === h).length])) as Record<Hit, number>;
  const successful = currentHits.filter((h) => h !== 'MISS').length;
  const pct = Math.round((successful / Math.max(1, currentHits.length)) * 100);
  const participantScore = React.useCallback(
    (p: Participant) => log.filter((e) => e.pid === p.id).reduce((s, e) => s + hitValue(e.hit, cfg.rule, cfg.target), 0),
    [cfg.rule, cfg.target, log],
  );
  const participantDarts = React.useCallback((p: Participant) => log.filter((e) => e.pid === p.id).length, [log]);
  const streak = React.useMemo(() => {
    let n = 0;
    for (let i = currentLog.length - 1; i >= 0; i -= 1) {
      if (currentLog[i].hit === 'MISS') break;
      n += 1;
    }
    return n;
  }, [currentLog]);

  const participantMaxStreak = React.useCallback(
    (p: Participant) => {
      let best = 0;
      let run = 0;
      for (const e of log.filter((x) => x.pid === p.id)) {
        if (e.hit === 'MISS') run = 0;
        else {
          run += 1;
          best = Math.max(best, run);
        }
      }
      return best;
    },
    [log],
  );

  const participantStats = React.useCallback(
    (p: Participant): ParticipantComputedStats => {
      const entries = log.filter((e) => e.pid === p.id);
      const score = entries.reduce((sum, e) => sum + hitValue(e.hit, cfg.rule, cfg.target), 0);
      const darts = entries.length;
      const hitCounts = Object.fromEntries(hits.map((h) => [h, entries.filter((e) => e.hit === h).length])) as Record<Hit, number>;
      const hitsDone = darts - hitCounts.MISS;
      return {
        score,
        darts,
        hits: hitsDone,
        misses: hitCounts.MISS,
        pct: Math.round((hitsDone / Math.max(1, darts)) * 100),
        streak: participantMaxStreak(p),
        hitCounts,
      };
    },
    [cfg.rule, cfg.target, log, participantMaxStreak],
  );

  const allowedHits = React.useMemo<Hit[]>(() => {
    if (cfg.target === 'bull25' || cfg.rule === 'bull25') return ['25', 'MISS'];
    if (cfg.target === 'bull50' || cfg.rule === 'bull50') return ['50', 'MISS'];
    if (cfg.rule === 'single') return ['S', 'MISS'];
    if (cfg.rule === 'double') return ['D', 'MISS'];
    if (cfg.rule === 'triple') return ['T', 'MISS'];
    return ['S', 'D', 'T', 'MISS'];
  }, [cfg.target, cfg.rule]);

  const add = React.useCallback(
    (h: Hit) => {
      if (done) return;
      setLog((v) => [
        ...v,
        {
          hit: ok(h, cfg.rule, cfg.target) ? h : 'MISS',
          pid: safeParticipants[Math.floor(v.length / 3) % safeParticipants.length].id,
        },
      ]);
    },
    [done, cfg.rule, cfg.target, safeParticipants],
  );

  const lang = React.useMemo(() => {
    try {
      return localStorage.getItem('dc_lang_v1') || navigator.language || 'fr';
    } catch {
      return 'fr';
    }
  }, []);

  const startVoice = React.useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceHeard('Micro non supporté');
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = localeMap[String(lang).toLowerCase().split('-')[0]] || lang || 'fr-FR';
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      setVoiceOn(true);
      setVoiceHeard('…');
      rec.onresult = (ev: any) => {
        const alternatives = Array.from(ev?.results?.[0] || []) as any[];
        const heard = alternatives.map((a) => a?.transcript || '').filter(Boolean).join(' | ');
        setVoiceHeard(heard);
        const hit = parseChallengeVoice(heard, String(lang), allowedHits);
        if (hit) add(hit);
        else setVoiceHeard(`${heard} ?`);
      };
      rec.onerror = () => setVoiceHeard('');
      rec.onend = () => setVoiceOn(false);
      rec.start();
    } catch {
      setVoiceOn(false);
    }
  }, [lang, allowedHits, add]);

  const standings = React.useMemo(
    () => [...safeParticipants].sort((a, b) => participantScore(b) - participantScore(a)),
    [participantScore, safeParticipants],
  );
  const playerLabel = current.team ? 'ÉQUIPE ACTIVE' : 'JOUEUR ACTIF';

  const buildParticipantSnapshot = React.useCallback(
    (p: Participant) => {
      const stats = participantStats(p);
      const entries = log.filter((e) => e.pid === p.id);
      const targetSegment = cfg.target === 'bull25' || cfg.target === 'bull50' ? 25 : Number(cfg.target) || 20;
      const ringMap: Record<Hit, string> = { S: 'S', D: 'D', T: 'T', '25': 'SB', '50': 'DB', MISS: 'MISS' };
      return {
        id: String(p.id),
        name: p.name,
        avatarDataUrl: (p.profile ? avatarSrc(p.profile) : teamSrc(p.team)) || null,
        teamId: p.team ? String(p.team.id || '') : undefined,
        teamName: p.teamName || p.team?.name || '',
        score: stats.score,
        points: stats.score,
        darts: stats.darts,
        dartsThrown: stats.darts,
        hitCount: stats.hits,
        hits: entries.map((entry, index) => ({
          ring: ringMap[entry.hit],
          label: entry.hit,
          segment: targetSegment,
          mult: entry.hit === 'D' || entry.hit === '50' ? 2 : entry.hit === 'T' ? 3 : entry.hit === 'MISS' ? 0 : 1,
          visitIndex: Math.floor(index / 3),
          dartIndex: index % 3,
          scored: hitValue(entry.hit, cfg.rule, cfg.target),
          valid: entry.hit !== 'MISS',
        })),
        hitSummary: {
          S: stats.hitCounts.S,
          D: stats.hitCounts.D,
          T: stats.hitCounts.T,
          SBull: stats.hitCounts['25'],
          DBull: stats.hitCounts['50'],
          MISS: stats.hitCounts.MISS,
          darts: stats.darts,
          hits: stats.hits,
        },
        stats: {
          score: stats.score,
          points: stats.score,
          darts: stats.darts,
          dartsThrown: stats.darts,
          hitCount: stats.hits,
          hits: stats.hits,
          misses: stats.misses,
          successRate: stats.pct,
          best: stats.score,
          bestScore: stats.score,
          bestStreak: stats.streak,
          streak: stats.streak,
          targetHits: stats.hits,
          rule: cfg.rule,
          target: cfg.target,
          favNumberHits: { [String(targetSegment)]: stats.hits },
        },
        special: {
          best: stats.score,
          bestScore: stats.score,
          bestStreak: stats.streak,
          streak: stats.streak,
          score: stats.score,
          points: stats.score,
          targetHits: stats.hits,
          misses: stats.misses,
          rule: cfg.rule,
          target: cfg.target,
        },
      };
    },
    [cfg.rule, cfg.target, log, participantStats],
  );

  const buildHistoryRecord = React.useCallback(
    (status: 'in_progress' | 'finished') => {
      const now = Date.now();
      const perPlayer = safeParticipants.map(buildParticipantSnapshot);
      const rankings = [...perPlayer]
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
        .map((row, index) => ({ ...row, rank: index + 1 }));
      const winnerId = status === 'finished' ? rankings[0]?.id || null : null;
      const finalScores = Object.fromEntries(rankings.map((row) => [row.id, Number(row.score || 0)]));
      const rankingScores = rankings.map((row) => ({
        id: row.id,
        name: row.name,
        score: Number(row.score || 0),
        rank: row.rank,
        darts: Number(row.darts || 0),
      }));
      const totalHits = rankings.reduce((acc, row) => acc + Number(row.hitCount || 0), 0);
      const totalMisses = rankings.reduce((acc, row) => acc + Number(row.hitSummary?.MISS || 0), 0);
      const totalDarts = rankings.reduce((acc, row) => acc + Number(row.darts || 0), 0);
      const bestScore = Math.max(0, ...rankings.map((row) => Number(row.score || 0)));
      const bestStreak = Math.max(0, ...rankings.map((row) => Number(row.stats?.bestStreak || 0)));
      const scoreLine = rankings.map((row) => `${row.name} ${row.score}`).join(' • ');

      return {
        id: matchIdRef.current,
        matchId: matchIdRef.current,
        kind: 'challenge',
        mode: 'challenge',
        sport: 'darts',
        status,
        createdAt: createdAtRef.current,
        updatedAt: now,
        finishedAt: status === 'finished' ? now : undefined,
        players: safeParticipants.map((p) => ({
          id: String(p.id),
          name: p.name,
          avatarDataUrl: (p.profile ? avatarSrc(p.profile) : teamSrc(p.team)) || null,
          teamId: p.team ? String(p.team.id || '') : undefined,
          teamName: p.teamName || p.team?.name || '',
        })),
        winnerId,
        game: {
          mode: 'challenge',
          target: cfg.target,
          objective: targetLabel(cfg.target),
          rule: cfg.rule,
          visits: cfg.visits,
          matchMode: cfg.matchMode || 'solo',
          participantMode: cfg.participantMode || 'players',
        },
        summary: {
          title: 'CHALLENGE',
          kind: 'challenge',
          mode: 'challenge',
          game: { mode: 'challenge' },
          finished: status === 'finished',
          winnerId,
          rounds: cfg.visits,
          objective: targetLabel(cfg.target),
          target: cfg.target,
          rule: cfg.rule,
          finalScores,
          scoreLine,
          rankings: rankingScores,
          scores: rankingScores,
          perPlayer: rankings,
          hitSummary: {
            S: rankings.reduce((acc, row) => acc + Number(row.hitSummary?.S || 0), 0),
            D: rankings.reduce((acc, row) => acc + Number(row.hitSummary?.D || 0), 0),
            T: rankings.reduce((acc, row) => acc + Number(row.hitSummary?.T || 0), 0),
            SBull: rankings.reduce((acc, row) => acc + Number(row.hitSummary?.SBull || 0), 0),
            DBull: rankings.reduce((acc, row) => acc + Number(row.hitSummary?.DBull || 0), 0),
            MISS: totalMisses,
            darts: totalDarts,
            hits: totalHits,
            byPlayer: Object.fromEntries(rankings.map((row) => [row.id, row.hitSummary])),
          },
        },
        payload: {
          kind: 'challenge',
          mode: 'challenge',
          sport: 'darts',
          config: cfg,
          entries: log,
          events: log,
          activePlayerIndex: activeIndex,
          roundIdx: turn,
          visitHistory: log.map((entry, index) => ({
            playerId: entry.pid,
            visitIndex: Math.floor(index / (safeParticipants.length * 3)),
            dartIndex: index % 3,
            roundIndex: Math.floor(index / (safeParticipants.length * 3)),
            ring: entry.hit,
            scored: hitValue(entry.hit, cfg.rule, cfg.target),
            valid: entry.hit !== 'MISS',
          })),
          summary: {
            perPlayer: rankings,
            rankings: rankingScores,
            scores: rankingScores,
            scoreLine,
          },
          players: rankings,
          finalPlayers: rankings,
          stats: {
            mode: 'challenge',
            kind: 'challenge',
            global: {
              matches: 1,
              target: cfg.target,
              rule: cfg.rule,
              visits: cfg.visits,
              darts: totalDarts,
              hits: totalHits,
              misses: totalMisses,
              points: rankings.reduce((acc, row) => acc + Number(row.score || 0), 0),
              best: bestScore,
              bestScore,
              bestStreak,
            },
            players: rankings.map((row) => ({
              id: row.id,
              name: row.name,
              score: row.score,
              points: row.score,
              best: row.score,
              bestScore: row.score,
              darts: row.darts,
              dartsThrown: row.darts,
              hitCount: row.hitCount,
              misses: row.hitSummary?.MISS || 0,
              special: {
                best: row.score,
                bestScore: row.score,
                bestStreak: row.stats?.bestStreak || 0,
                targetHits: row.hitCount,
                misses: row.hitSummary?.MISS || 0,
              },
              stats: row.stats,
              hitSummary: row.hitSummary,
              hits: row.hits,
            })),
          },
        },
      };
    },
    [activeIndex, buildParticipantSnapshot, cfg, log, safeParticipants, turn],
  );

  const persistRecord = React.useCallback(
    (status: 'in_progress' | 'finished') => {
      const record: any = buildHistoryRecord(status);
      const signature = `${status}|${log.length}|${String(record?.summary?.scoreLine || '')}`;
      if (lastPersistSignatureRef.current === signature) return;
      lastPersistSignatureRef.current = signature;
      void History.upsert(record).catch((error: any) => {
        console.warn('[challenge] history persistence failed', error);
      });
    },
    [buildHistoryRecord, log.length],
  );

  React.useEffect(() => {
    persistRecord(done ? 'finished' : 'in_progress');
  }, [done, persistRecord]);

  React.useEffect(() => {
    if (!done || trainingSavedRef.current || safeParticipants.length !== 1) return;
    trainingSavedRef.current = true;
    const solo = safeParticipants[0];
    const stats = participantStats(solo);
    try {
      recordTrainingDetailedSession({
        id: `${matchIdRef.current}-training`,
        modeId: 'training_challenges',
        participantId: solo?.profile?.id ? String(solo.profile.id) : String(solo.id || 'solo'),
        participantName: solo.name,
        participantType: 'player',
        startedAt: createdAtRef.current,
        endedAt: Date.now(),
        durationMs: Date.now() - createdAtRef.current,
        darts: stats.darts,
        hits: stats.hits,
        misses: stats.misses,
        points: stats.score,
        accuracyPct: stats.pct,
        success: stats.score > 0,
        config: { ...cfg, sourceMode: 'challenge', challengeTarget: cfg.target, challengeRule: cfg.rule },
        metrics: {
          sourceMode: 'challenge',
          target: cfg.target,
          rule: cfg.rule,
          visits: cfg.visits,
          score: stats.score,
          bestStreak: stats.streak,
          matchId: matchIdRef.current,
        },
        visitHistory: log,
        telemetry: { target: cfg.target, rule: cfg.rule, hits: stats.hitCounts },
        telemetryCoverage: 'exact',
      } as any);
    } catch (error) {
      console.warn('[challenge] training stats persistence failed', error);
    }
  }, [cfg, done, log, participantStats, safeParticipants]);

  return (
    <div className="cp" style={{ background: theme.bg, color: theme.text }}>
      <header className="cp-head">
        <div className="cp-back">
          <BackDot onClick={() => go('challenge_config')} size={44} color="#35e9ff" glow="#35e9ff77" />
        </div>
        <img className="cp-ticker" src="/challenge/ticker_challenge.png" alt="Challenge" />
        <button className="cp-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={() => awena?.openPanel?.()}>
          <span>
            <img src="/awena/awena-avatar.webp" alt="Awena" />
          </span>
          <i aria-hidden>🎙</i>
        </button>
      </header>

      <main className="cp-layout">
        <section className="cp-left">
          {safeParticipants.length > 1 && (
            <div className="challenge-roster portrait-only">
              {safeParticipants.map((p, i) => (
                <div key={p.id} title={p.name} aria-label={`${p.name} : ${participantScore(p)} points`} className={i === activeIndex ? 'active' : ''}>
                  <span className="roster-avatar">
                    <ChallengeAvatar participant={p} size={30} />
                  </span>
                  <strong>{participantScore(p)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="player">
            {teamSrc(current.team) && (
              <div className="player-team-bg" aria-hidden="true">
                <img src={teamSrc(current.team)} alt="" />
              </div>
            )}
            <div className="player-avatar">
              <ChallengeAvatar participant={current} size={64} />
            </div>
            <div className="player-meta">
              <small>{playerLabel}</small>
              <b>{current.name}</b>
              {current.teamName ? <span>{current.teamName}</span> : null}
              {safeParticipants.length > 1 && <em>{activeIndex + 1}/{safeParticipants.length}</em>}
              <i className="landscape-only">TOUR {done ? cfg.visits : turn}/{cfg.visits}</i>
            </div>
            <div className="player-score">
              <small>SCORE</small>
              <b>{currentScore}</b>
            </div>
            <div className="player-objective portrait-only">
              <img src={targetBoards[cfg.target] || target20} alt={`Objectif ${targetLabel(cfg.target)}`} />
              <span>OBJECTIF</span>
            </div>
          </div>

          <div className="left-kpis landscape-only">
            <div><span>RÉUSSITE</span><b>{pct}%</b></div>
            <div><span>SUITE</span><b>{streak}</b></div>
            <div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits * 3}</b></div>
          </div>

          <div className="left-actions landscape-only">
            <button type="button" onClick={() => setRankOpen(true)}><span>◎</span><b>ONLINE</b></button>
            <div><span>RECORD SUITE</span><b>{participantMaxStreak(current)}</b></div>
          </div>

          {safeParticipants.length > 1 && (
            <div className="player-list landscape-only">
              <div className="player-list-title"><b>JOUEURS</b><span>{safeParticipants.length}</span></div>
              <div className="player-list-scroll">
                {safeParticipants.map((p, i) => (
                  <div key={p.id} className={`player-row ${i === activeIndex ? 'active' : ''}`}>
                    <span className="list-avatar"><ChallengeAvatar participant={p} size={34} /></span>
                    <span className="list-name"><b>{p.name}</b>{p.teamName ? <small>{p.teamName}</small> : null}</span>
                    <span className="list-score"><b>{participantScore(p)}</b><small>{participantDarts(p)} fl.</small></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="cp-board">
          <div className="board-caption"><span>OBJECTIF</span><b>{targetLabel(cfg.target)}</b></div>
          <div className="board-media">
            <img src={targetBoards[cfg.target] || target20} alt={`Objectif ${targetLabel(cfg.target)}`} />
            <div className="board-glow" />
          </div>
        </section>

        <aside className="cp-right">
          <div className="turn-banner portrait-only"><span>TOUR</span><b>{done ? cfg.visits : turn}</b><i>/ {cfg.visits}</i></div>

          <div className="portrait-stats-wrap portrait-only">
            <div className="portrait-stats">
              <div className="ps-title">
                <strong>STATS CHALLENGE</strong>
                <button type="button" className="online-rank" aria-label="Classement online" onClick={() => setRankOpen(true)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9" /></svg>
                </button>
              </div>
              <div className="ps-kpis">
                <div><span>SCORE</span><b>{currentScore}</b></div>
                <div><span>RÉUSSITE</span><b>{pct}%</b></div>
                <div><span>FLÉCHETTES</span><b>{currentLog.length}/{cfg.visits * 3}</b></div>
                <div><span>SUITE</span><b>{streak}</b></div>
              </div>
              <div className="ps-hits">
                {allowedHits.map((h) => (
                  <div className={`psh ${h}`} key={h}><span>{h}</span><b>{counts[h]}</b></div>
                ))}
              </div>
            </div>
            {safeParticipants.length === 2 && (
              <button type="button" className="match-detail-trigger" onClick={() => setDetailOpen(true)}>
                DÉTAIL MATCH <span>↗</span>
              </button>
            )}
          </div>

          <div className="landscape-turn landscape-only"><span>TOUR</span><b>{done ? cfg.visits : turn}</b><i>/ {cfg.visits}</i></div>
          <div className="landscape-stats landscape-only">
            <h2>STATS HITS</h2>
            <div className="hitstats">
              {hits.map((h) => (
                <div className={`hs ${h}`} key={h}>
                  <b>{h}<small>{h === 'S' ? ' ×1' : h === 'D' ? ' ×2' : h === 'T' ? ' ×3' : ''}</small></b>
                  <strong>{counts[h]}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="input-tools">
            <button className="undo" disabled={!log.length} onClick={() => setLog((v) => v.slice(0, -1))}>↶ <span>ANNULER</span></button>
            <button className={`voice ${voiceOn ? 'listening' : ''}`} type="button" onClick={startVoice} aria-label="Saisie vocale">
              <svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></svg>
              <span>{voiceOn ? 'ÉCOUTE…' : 'VOCAL'}</span>
            </button>
          </div>

          <div className={`keypad keys-${allowedHits.length}`}>
            {allowedHits.map((h) => (
              <button className={h} key={h} disabled={done} onClick={() => add(h)}>
                <b>{h}</b>
                <span>{h === 'S' ? '×1' : h === 'D' ? '×2' : h === 'T' ? '×3' : h === '25' ? 'BULL 25' : h === '50' ? 'BULL 50' : '×'}</span>
              </button>
            ))}
          </div>

          <div className="sr-only" aria-live="polite">{voiceHeard}</div>
        </aside>
      </main>

      {detailOpen && safeParticipants.length === 2 && (() => {
        const left = safeParticipants[0];
        const right = safeParticipants[1];
        const a = participantStats(left);
        const b = participantStats(right);
        const rows: Array<[string, React.ReactNode, React.ReactNode]> = [
          ['SCORE', a.score, b.score],
          ['RÉUSSITE', `${a.pct}%`, `${b.pct}%`],
          ['FLÉCHETTES', `${a.darts}/${cfg.visits * 3}`, `${b.darts}/${cfg.visits * 3}`],
          ['SUITE MAX', a.streak, b.streak],
          ['S', a.hitCounts.S, b.hitCounts.S],
          ['D', a.hitCounts.D, b.hitCounts.D],
          ['T', a.hitCounts.T, b.hitCounts.T],
          ['MISS', a.hitCounts.MISS, b.hitCounts.MISS],
        ];
        return (
          <div className="match-detail-modal" onClick={() => setDetailOpen(false)}>
            <div className="match-detail-card" onClick={(e) => e.stopPropagation()}>
              <div className="match-detail-top">
                <div className="match-side">
                  <span>
                    {teamSrc(left.team) && <div className="match-team-bg" aria-hidden="true"><img src={teamSrc(left.team)} alt="" /></div>}
                    <ChallengeAvatar participant={left} size={52} />
                  </span>
                  <b>{left.name}</b>
                  <strong>{a.score}</strong>
                </div>
                <div className="match-center-title"><small>CHALLENGE</small><b>DÉTAIL MATCH</b><em>OBJECTIF {targetLabel(cfg.target)}</em></div>
                <div className="match-side">
                  <span>
                    {teamSrc(right.team) && <div className="match-team-bg" aria-hidden="true"><img src={teamSrc(right.team)} alt="" /></div>}
                    <ChallengeAvatar participant={right} size={52} />
                  </span>
                  <b>{right.name}</b>
                  <strong>{b.score}</strong>
                </div>
              </div>
              <div className="match-compare">
                {rows.map(([label, leftValue, rightValue]) => (
                  <div className="match-compare-row" key={label}>
                    <strong>{leftValue}</strong>
                    <span>{label}</span>
                    <strong>{rightValue}</strong>
                  </div>
                ))}
              </div>
              <button type="button" className="match-detail-close" onClick={() => setDetailOpen(false)}>FERMER</button>
            </div>
          </div>
        );
      })()}

      {rankOpen && (
        <div className="stats-modal" onClick={() => setRankOpen(false)}>
          <div className="stats-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-head">
              <div><strong>CLASSEMENT CHALLENGE</strong><span>Objectif {targetLabel(cfg.target)} · {cfg.visits} tours</span></div>
              <button onClick={() => setRankOpen(false)}>×</button>
            </div>
            <div className="rank-list">
              {standings.map((p, i) => (
                <div key={p.id}><strong>{i + 1}</strong><span>{p.name}</span><b>{participantScore(p)} pts</b><em>{participantDarts(p)} fl. · suite {participantMaxStreak(p)}</em></div>
              ))}
            </div>
            <button className="online-open" onClick={() => go('online', { tab: 'rankings', gameId: 'challenge', target: cfg.target, visits: cfg.visits })}>◎ OUVRIR LES CLASSEMENTS ONLINE</button>
          </div>
        </div>
      )}

      {done && (
        <div className="finish">
          <h2>CHALLENGE TERMINÉ</h2>
          <strong>{standings[0] ? participantScore(standings[0]) : 0} POINTS</strong>
          <span className="finish-streak">MEILLEURE SUITE : {standings[0] ? participantMaxStreak(standings[0]) : 0}</span>
          <div className="finish-scoreline">
            {standings.map((p, i) => (
              <div key={p.id} className="finish-score-row">
                <span>{i + 1}. {p.name}</span>
                <b>{participantScore(p)} pts</b>
                <em>{participantDarts(p)} fl. · suite {participantMaxStreak(p)}</em>
              </div>
            ))}
          </div>
          <button onClick={() => go('challenge_config')}>NOUVEAU CHALLENGE</button>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

const css = `
.cp{width:100%;height:calc(var(--vh,1vh)*100);min-height:0;box-sizing:border-box;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr);gap:6px;padding:max(5px,env(safe-area-inset-top,0px)) max(6px,env(safe-area-inset-right,0px)) max(6px,env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-left,0px));background-image:radial-gradient(circle at 48% 28%,#2b0b0f 0,#080b10 48%,#020305 100%)!important}
.portrait-only,.portrait-only.turn-banner,.portrait-only.portrait-stats-wrap{display:none!important}
.landscape-only{display:block}
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.cp-head{position:relative;height:72px;border-radius:16px;border:1px solid #1f2d3c;background:linear-gradient(180deg,#07111c,#05070b);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 10px 30px #0007}
.cp-back{position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:3}
.cp-ticker{width:min(420px,44%);height:60px;object-fit:contain;filter:drop-shadow(0 0 10px #ff8b0022)}
.cp-awena{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:50px;height:50px;border-radius:50%;border:1px solid #26dfff99;background:radial-gradient(circle at 30% 30%,#173653,#081420);display:grid;place-items:center;box-shadow:0 0 0 2px #08111b inset,0 0 18px #26dfff40}
.cp-awena span{width:42px;height:42px;border-radius:50%;overflow:hidden;display:block}
.cp-awena img{width:100%;height:100%;object-fit:cover}
.cp-awena i{position:absolute;right:-1px;bottom:-1px;width:18px;height:18px;border-radius:50%;background:#0b1018;border:1px solid #26dfff99;display:grid;place-items:center;font-style:normal;font-size:9px}
.cp-layout{min-height:0;display:grid;grid-template-columns:minmax(250px,22%) minmax(300px,36%) minmax(320px,42%);gap:8px;overflow:hidden}
.cp-left,.cp-right,.cp-board{min-height:0;border:1px solid #243142;border-radius:18px;background:linear-gradient(180deg,rgba(8,12,18,.96),rgba(4,7,11,.94));box-shadow:0 16px 42px #0009, inset 0 0 0 1px #0f1621}
.cp-left,.cp-right{padding:8px;display:flex;flex-direction:column;gap:6px}
.challenge-roster{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:5px}
.challenge-roster>div{height:38px;border-radius:11px;border:1px solid #39495b;background:#09111b;display:flex;align-items:center;gap:6px;padding:4px 6px}
.challenge-roster>div.active{border-color:#ff4d53;box-shadow:0 0 0 1px #ff4d5377 inset}
.roster-avatar{width:28px;height:28px;border-radius:50%;overflow:hidden;display:grid;place-items:center}
.challenge-roster strong{font-size:14px;color:#fff;margin-left:auto}
.player{position:relative;overflow:hidden;display:grid;grid-template-columns:clamp(54px,7vw,74px) minmax(0,1fr) auto;gap:8px;align-items:center;min-height:clamp(76px,15vh,108px);padding:8px;border:1px solid #ff343466;border-radius:14px;background:linear-gradient(100deg,#0b1119,#090b10);box-shadow:inset 0 0 16px #000}
.player>*:not(.player-team-bg){position:relative;z-index:2}
.player-team-bg{position:absolute!important;z-index:0!important;inset:6px 10px 6px 34%;display:flex;align-items:center;justify-content:flex-end;opacity:.18;pointer-events:none;filter:saturate(1.15) contrast(1.05)}
.player-team-bg img{width:100%;height:100%;max-width:78%;object-fit:contain;object-position:right center}
.player-avatar{width:clamp(54px,7vw,74px);height:clamp(54px,7vw,74px);border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #566273;background:#101722;box-shadow:0 0 0 2px #0008,0 0 14px #ff343422}
.player-avatar>*{width:100%!important;height:100%!important}
.challenge-avatar-img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
.challenge-avatar-fallback{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:#151d28;color:#fff;font-size:clamp(19px,4vw,32px);font-weight:1000}
.player-meta{min-width:0;display:flex;flex-direction:column}
.player-meta small,.player-score small{font-size:8px;color:#99a5b5;font-weight:950;letter-spacing:.7px}
.player-meta>b{font-size:clamp(16px,2.4vw,25px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-meta>span{font-size:8px;color:#8e9bad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-meta em{font-size:8px;color:#ff5252;font-style:normal;font-weight:950}
.player-meta i{margin-top:5px;font-size:9px;color:#c2cad7;font-style:normal;font-weight:950}
.player-score{min-width:64px;padding-left:8px;border-left:1px solid #303a48;text-align:center;display:flex;flex-direction:column}
.player-score b{font-size:clamp(25px,4vw,40px);line-height:1;color:#fff}
.left-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.left-kpis>div,.left-actions>button,.left-actions>div{min-height:48px;border-radius:12px;border:1px solid #213142;background:#07111c;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 18px #03111b}
.left-kpis span,.left-actions span{font-size:8px;color:#8ea0b4;font-weight:1000;letter-spacing:.65px}
.left-kpis b{font-size:18px;color:#fff}
.left-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.left-actions>button{cursor:pointer}
.left-actions>button b,.left-actions>div b{font-size:11px;color:#fff;margin-top:2px}
.player-list{min-height:0;display:flex;flex-direction:column;border:1px solid #283444;border-radius:14px;background:linear-gradient(180deg,#08111a,#05090f)}
.player-list-title{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 9px;border-bottom:1px solid #22303f;color:#ff4d53;font-size:11px;font-weight:1000}
.player-list-scroll{min-height:0;flex:1;overflow:auto;display:grid;gap:4px;padding:5px}
.player-row{min-height:42px;border-radius:10px;border:1px solid #1b2633;background:#081018;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:6px;align-items:center;padding:4px 5px}
.player-row.active{border-color:#ff4850;box-shadow:0 0 0 1px #ff485055 inset}
.list-avatar{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center}
.list-name{min-width:0;display:flex;flex-direction:column}
.list-name b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list-name small,.list-score small{font-size:7px;color:#8fa1b3}
.list-score{text-align:right;display:flex;flex-direction:column}
.list-score b{font-size:13px;color:#ff5252}
.cp-board{padding:10px;display:flex;flex-direction:column;gap:10px}
.board-caption{min-height:52px;border:1px solid #5b1e28;border-radius:14px;background:linear-gradient(90deg,#0f090c,#1b0e11,#0f090c);display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:inset 0 0 20px #000}
.board-caption span{font-size:15px;color:#d0d5dc;font-weight:1000;letter-spacing:1px}
.board-caption b{font-size:clamp(32px,4vw,58px);line-height:1;color:#ff4248;text-shadow:0 0 20px #ff343477}
.board-media{position:relative;min-height:0;flex:1;display:grid;place-items:center;overflow:hidden}
.board-media img{width:min(92%,560px);height:auto;max-height:100%;object-fit:contain;position:relative;z-index:2;filter:drop-shadow(0 16px 24px #000) drop-shadow(0 0 8px #ff2f2f22)}
.board-glow{position:absolute;inset:7% 18% 6%;border-radius:50%;background:radial-gradient(circle at center,#50091588 0,transparent 66%)}
.turn-banner{height:28px;display:flex;align-items:baseline;justify-content:center;gap:5px;border:1px solid #4b2630;border-radius:9px;background:linear-gradient(90deg,#10090c,#201014,#10090c);color:#fff}
.turn-banner span{font-size:8px;color:#9da8b7;font-weight:900}
.turn-banner b{font-size:18px;color:#ff4248}
.turn-banner i{font-size:10px;font-style:normal;font-weight:900}
.turn-banner em{margin-left:8px;font-size:8px;color:#c5ceda;font-style:normal;font-weight:900;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.portrait-stats-wrap{min-width:0}
.portrait-stats{display:block;border:1px solid #3d4b5e;border-radius:11px;background:linear-gradient(180deg,#0d141e,#080c12);padding:5px 7px}
.ps-title{height:25px;display:flex;align-items:center;justify-content:space-between}
.ps-title strong{font-size:11px;color:#ff4141;letter-spacing:.6px}
.online-rank{width:30px;height:25px;border-radius:8px;border:1px solid #24dfff88;background:#08202a;color:#27e9ff;display:grid;place-items:center}
.online-rank svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}
.ps-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.ps-kpis div{height:37px;border:1px solid #263343;border-radius:8px;background:#091019;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ps-kpis span{font-size:6.5px;color:#93a1b2;font-weight:1000}
.ps-kpis b{font-size:14px;line-height:1.05}
.ps-hits{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:4px;margin-top:4px}
.psh{height:28px;border-radius:7px;background:#111925;display:flex;align-items:center;justify-content:center;gap:6px;border-bottom:3px solid #748093}
.psh span{font-size:9px;font-weight:1000}
.psh b{font-size:13px}
.psh.S{border-color:#169cff}
.psh.D{border-color:#ff3b48}
.psh.T{border-color:#ffad19}
.psh[class~="25"]{border-color:#10d47b}
.psh[class~="50"]{border-color:#bc55ff}
.match-detail-trigger{width:100%;height:30px;margin-top:4px;border:1px solid #5b3440;border-radius:9px;background:linear-gradient(180deg,#1b1015,#0b090d);color:#fff;font-size:9px;font-weight:1000;letter-spacing:.8px}
.match-detail-trigger span{color:#ff454d;margin-left:5px}
.landscape-turn{min-height:38px;border:1px solid #4b2630;border-radius:12px;background:linear-gradient(180deg,#130b0d,#0f0d14);display:flex;align-items:baseline;justify-content:center;gap:8px;padding:4px 8px}
.landscape-turn span{font-size:10px;color:#b4bcc7;font-weight:950;letter-spacing:.9px}
.landscape-turn b{font-size:32px;line-height:1;color:#ff454d}
.landscape-turn i{font-style:normal;color:#fff;font-size:18px;font-weight:900}
.landscape-stats h2{margin:0 0 6px;padding-bottom:5px;border-bottom:1px solid #2b3949;font-size:20px;letter-spacing:1px;text-align:center}
.hitstats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}
.hs{min-height:68px;border-radius:12px;background:#111925;border-bottom:4px solid #748093;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 3px;box-shadow:inset 0 0 16px #0008}
.hs b{display:flex;flex-direction:column;align-items:center;font-size:14px;gap:1px}
.hs b small{font-size:9px;color:#c2c9d4}
.hs strong{font-size:32px;line-height:1}
.hs.S{border-color:#179dff}
.hs.D{border-color:#ff404a}
.hs.T{border-color:#ffb219}
.hs[class~="25"]{border-color:#17d987}
.hs[class~="50"]{border-color:#c159ff}
.input-tools{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:6px;height:48px}
.input-tools .undo,.voice{height:100%;border-radius:12px;border:1px solid #364153;background:linear-gradient(180deg,#150b0f,#10151e);color:#fff;font-weight:1000}
.input-tools .undo{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px}
.input-tools .undo:disabled{opacity:.45}
.voice{display:flex;align-items:center;justify-content:center;gap:8px;color:#27ecff;border-color:#23d9ff88;background:linear-gradient(180deg,#08202a,#09121b)}
.voice.listening{box-shadow:0 0 0 1px #26dfff88 inset,0 0 16px #26dfff33}
.voice svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8}
.voice span{font-size:11px}
.keypad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;grid-auto-rows:minmax(110px,1fr);min-height:0}
.keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.keypad.keys-4{grid-template-columns:repeat(2,minmax(0,1fr))}
.keypad button{border-radius:16px;border:1px solid #506070;background:#0f1621;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:inset 0 0 28px #ffffff10,0 14px 28px #0006}
.keypad button b{font-size:clamp(36px,4vw,62px);line-height:1}
.keypad button span{font-size:14px;font-weight:1000;opacity:.95}
.keypad .S{background:linear-gradient(135deg,#2d8fff,#1d5fc3)}
.keypad .D{background:linear-gradient(135deg,#ff424a,#ad0f19)}
.keypad .T{background:linear-gradient(135deg,#f3b31d,#986100)}
.keypad .MISS{background:linear-gradient(135deg,#767f8c,#434b57)}
.keypad .25{background:linear-gradient(135deg,#12d67d,#0c8250)}
.keypad .50{background:linear-gradient(135deg,#be5bff,#7030c8)}
.match-detail-modal{position:fixed;inset:0;z-index:10025;background:#000d;backdrop-filter:blur(8px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(16px,env(safe-area-inset-bottom,0px));overflow:auto}
.match-detail-card{width:min(520px,100%);border:1px solid #4c596a;border-radius:18px;background:linear-gradient(180deg,#101621,#06090e);box-shadow:0 28px 80px #000;padding:12px}
.match-detail-top{display:grid;grid-template-columns:minmax(0,1fr) 118px minmax(0,1fr);gap:8px;align-items:end}
.match-side{min-width:0;display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;align-items:center}
.match-side>span{position:relative;grid-row:1/3;width:44px;height:44px;border-radius:50%;overflow:hidden;border:1px solid #536174;display:grid;place-items:center;background:#111925}
.match-side>span>*{width:100%!important;height:100%!important}
.match-team-bg{position:absolute;inset:0;display:grid;place-items:center;opacity:.26;pointer-events:none}
.match-team-bg img{width:88%;height:88%;object-fit:contain;filter:saturate(1.08) contrast(1.05)}
.match-side>b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.match-side>strong{font-size:19px;color:#ff4950;line-height:1}
.match-center-title{text-align:center;display:flex;flex-direction:column;align-items:center}
.match-center-title small{font-size:7px;color:#95a2b2;font-weight:1000;letter-spacing:.8px}
.match-center-title b{font-size:12px;color:#fff;letter-spacing:.8px}
.match-center-title em{font-size:7px;color:#ff555b;font-style:normal;font-weight:1000}
.match-compare{margin-top:10px;border:1px solid #263342;border-radius:12px;overflow:hidden;background:#070c13}
.match-compare-row{min-height:34px;display:grid;grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr);align-items:center;text-align:center;border-bottom:1px solid #1f2a37}
.match-compare-row:last-child{border-bottom:0}
.match-compare-row span{height:100%;display:grid;place-items:center;border-left:1px solid #263342;border-right:1px solid #263342;color:#95a2b2;font-size:8px;font-weight:1000;letter-spacing:.55px}
.match-compare-row strong{font-size:15px;color:#fff}
.match-detail-close{width:100%;height:38px;margin-top:9px;border:1px solid #d13d46;border-radius:10px;background:linear-gradient(180deg,#351015,#16090b);color:#fff;font-size:10px;font-weight:1000;letter-spacing:.8px}
.stats-modal{position:fixed;inset:0;z-index:10020;background:#000c;backdrop-filter:blur(7px);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));overflow:auto}
.stats-modal-card{width:min(500px,100%);max-height:min(90dvh,720px);overflow:auto;border:1px solid #4a596c;border-radius:17px;background:linear-gradient(180deg,#0e151f,#06090e);box-shadow:0 25px 70px #000;padding:12px}
.stats-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.stats-modal-head>div{display:flex;flex-direction:column}
.stats-modal-head strong{color:#ff4141;font-size:15px}
.stats-modal-head span{font-size:9px;color:#9da9b8;margin-top:2px}
.stats-modal-head button{width:34px;height:34px;border-radius:50%;border:1px solid #536176;background:#121a25;color:white;font-size:22px}
.rank-list{display:grid;gap:6px;margin:10px 0}
.rank-list>div{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:9px;border:1px solid #293545;border-radius:10px;background:#0a1018}
.rank-list>div>strong{color:#ffb52e}
.rank-list>div>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rank-list>div>em{font-size:9px;color:#9ba7b6;font-style:normal}
.rank-list>div>b{color:#fff}
.online-open{width:100%;min-height:42px;border:1px solid #24dfff88;border-radius:11px;background:#0a1a25;color:#2eeaff;font-weight:1000}
.finish{position:fixed;inset:0;z-index:10030;background:#000e;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center}
.finish h2{font-size:clamp(26px,6vw,42px);letter-spacing:2px}
.finish strong{font-size:clamp(38px,9vw,62px);color:#ff4141}
.finish-streak{margin-top:8px;color:#fff;font-weight:900;letter-spacing:1px}
.finish-scoreline{width:min(460px,100%);margin-top:14px;display:grid;gap:7px}
.finish-score-row{padding:10px 12px;border:1px solid #334154;border-radius:12px;background:linear-gradient(180deg,#0f1621,#0a0f16);display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'name score' 'meta score';gap:2px 12px;align-items:center}
.finish-score-row span{grid-area:name;color:#fff;font-weight:950;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.finish-score-row b{grid-area:score;color:#ffb33f;font-size:20px}
.finish-score-row em{grid-area:meta;color:#a9b4c2;font-style:normal;font-size:11px}
.finish button{margin-top:20px;padding:14px 22px;border-radius:12px;background:#19b84a;color:white;font-weight:900;border:1px solid #5cff87}
@media(orientation:portrait){
 .portrait-only{display:flex!important}
 .portrait-stats-wrap.portrait-only{display:block!important}
 .landscape-only{display:none!important}
 .cp{gap:5px;height:calc(var(--vh,1vh)*100);max-height:100dvh;padding:max(4px,env(safe-area-inset-top,0px)) max(5px,env(safe-area-inset-right,0px)) max(12px,calc(env(safe-area-inset-bottom,0px) + 6px)) max(5px,env(safe-area-inset-left,0px))}
 .cp-head{height:68px;border-radius:13px}
 .cp-head-title{display:none}
 .cp-head .cp-ticker{position:absolute;z-index:1;inset:0;display:block!important;width:100%;height:100%;object-fit:cover;object-position:center}
 .cp-head:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(90deg,#02050ab8 0,transparent 22%,transparent 78%,#02050ab8 100%);pointer-events:none}
 .cp-back{left:7px;z-index:4}
 .cp-awena{right:7px;z-index:4}
 .cp-layout{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:5px;margin:0;overflow:hidden}
 .cp-left{padding:0;border:0;background:transparent;box-shadow:none;gap:3px}
 .player{height:82px;min-height:82px;padding:5px 7px;grid-template-columns:54px minmax(0,1fr) 54px minmax(78px,23%);gap:6px}
 .player-avatar{width:54px;height:54px}
 .player-meta small,.player-score small{font-size:7.5px}
 .player-meta>b{font-size:15px}
 .player-meta>span{font-size:7px}
 .player-meta em{font-size:7px}
 .player-score{min-width:52px;padding-left:5px}
 .player-score b{font-size:25px}
 .player-objective{height:68px;min-width:0;position:relative;display:flex!important;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid #303a48;padding-left:4px}
 .player-objective img{width:100%;height:58px;object-fit:contain;filter:drop-shadow(0 0 7px #ff343455)}
 .player-objective span{position:absolute;bottom:0;right:2px;font-size:6px;color:#b8c2d0;font-weight:1000;letter-spacing:.5px}
 .cp-board{display:none}
 .portrait-stats-wrap{display:block!important}
 .cp-right{height:100%;padding:5px 5px 10px;display:grid;grid-template-rows:28px auto 50px minmax(0,1fr);gap:4px;border-radius:13px}
 .input-tools{height:50px;grid-template-columns:minmax(0,1fr) 104px;gap:5px}
 .input-tools .undo{font-size:11px}
 .voice span{font-size:9px}
 .keypad{height:calc(100% - 10px);min-height:0;align-self:start;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:5px}
 .keypad.keys-2{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:minmax(0,1fr)}
 .keypad button{height:auto;min-height:0;border-radius:11px}
 .keypad button b{font-size:clamp(28px,10vw,42px)}
 .keypad button span{font-size:clamp(8px,2.7vw,11px)}
}
@media(orientation:portrait) and (max-height:700px){.cp-head{height:58px}.cp-awena{width:42px;height:42px}.cp-back{transform:translateY(-50%) scale(.9)}.player{height:72px;min-height:72px;grid-template-columns:48px minmax(0,1fr) 50px minmax(68px,22%)}.player-avatar{width:48px;height:48px}.player-objective{height:60px}.player-objective img{height:50px}.ps-title{height:20px}.ps-kpis div{height:30px}.ps-hits{margin-top:2px}.psh{height:23px}.match-detail-trigger{height:26px;margin-top:3px;font-size:8px}.cp-right{grid-template-rows:25px auto 46px minmax(0,1fr);padding-bottom:9px}.turn-banner{height:25px}.input-tools{height:46px}.challenge-roster>div{height:34px}.challenge-roster{padding-bottom:2px}.keypad{height:calc(100% - 8px)}}
@media(orientation:landscape) and (max-height:520px){.cp{gap:4px;padding:3px max(4px,env(safe-area-inset-right,0px)) max(4px,env(safe-area-inset-bottom,0px)) max(4px,env(safe-area-inset-left,0px))}.cp-head{height:46px;border-radius:11px}.cp-back{left:5px;transform:translateY(-50%) scale(.82)}.cp-awena{right:5px;width:40px;height:40px}.cp-awena i{width:16px;height:16px;font-size:8px}.cp-ticker{width:min(360px,50%);height:42px}.cp-layout{gap:5px;grid-template-columns:25fr 35fr 40fr}.cp-left,.cp-right{padding:5px;gap:4px;border-radius:11px}.player{min-height:68px;padding:4px;grid-template-columns:48px minmax(0,1fr) auto;gap:5px}.player-avatar{width:48px;height:48px}.player-meta>b{font-size:14px}.player-meta i{margin-top:2px;font-size:7px}.player-score{min-width:48px}.player-score b{font-size:23px}.left-kpis{gap:3px}.left-kpis>div{min-height:42px}.left-kpis span{font-size:6px}.left-kpis b{font-size:15px}.left-actions{gap:3px}.left-actions>button,.left-actions>div{min-height:36px}.left-actions span{font-size:6px}.left-actions b{font-size:9px}.player-list-title{height:25px;flex-basis:25px}.player-list-scroll{padding:3px;gap:2px}.player-row{min-height:35px;grid-template-columns:28px minmax(0,1fr) auto;padding:2px 3px}.list-avatar{width:28px;height:28px}.list-name b{font-size:8px}.list-name small,.list-score small{font-size:6px}.list-score b{font-size:11px}.cp-board{padding:5px;border-radius:11px}.board-caption{min-height:36px;padding:2px 8px;border-radius:9px}.board-caption span{font-size:10px}.board-caption b{font-size:24px}.landscape-turn{min-height:30px;padding:2px 6px}.landscape-turn span{font-size:9px}.landscape-turn b{font-size:22px}.landscape-turn i{font-size:12px}.landscape-stats h2{font-size:11px;margin-bottom:3px;padding-bottom:3px}.hitstats{gap:2px}.hs{min-height:46px;padding:2px 1px;border-bottom-width:3px}.hs b{font-size:8px}.hs b small{font-size:6px}.hs strong{font-size:17px}.input-tools{height:40px;gap:4px}.input-tools .undo{font-size:9px}.voice svg{width:17px;height:17px}.voice span{font-size:8px}.keypad{height:auto;grid-auto-rows:clamp(62px,18vh,78px);gap:4px}.keypad button{border-radius:9px}.keypad button b{font-size:clamp(25px,5vh,34px)}.keypad button span{font-size:8px}}
`;
