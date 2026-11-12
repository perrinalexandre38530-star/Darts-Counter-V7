/**
 * Mode-specific, evidence-based history reports for non-darts sports.
 * Uses only persisted final scores/counters; never invents sets, shots or events.
 * Kept separate from the canvas/PDF renderer so existing design is untouched.
 */
import type { ChallengeExportMetric, ChallengeExportPlayer, ChallengeExportReport, ChallengeExportSection } from './challengeResultsExport';

const textValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const metricNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const metric = (label: string, value: number | string): ChallengeExportMetric => ({ label, value: String(value) });
const firstDefined = (...values: unknown[]): unknown => values.find(v => v !== undefined && v !== null && v !== '');
const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const n = metricNumber(value);
    if (n !== null) return n;
  }
  return null;
};
const asObject = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const imageSource = (obj: any): string | undefined => {
  const candidate = firstDefined(obj?.logoDataUrl, obj?.logoUrl, obj?.avatarDataUrl, obj?.avatarUrl,
    obj?.avatar, obj?.photoDataUrl);
  return textValue(candidate) || undefined;
};
const sportKind = (entry: any, payload: any, mode: string) =>
  [entry?.sport, entry?.kind, payload?.sport, payload?.kind, entry?.game?.sport, mode]
    .map(value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_\s]/g, ''))
    .find(value => /babyfoot|pingpong|petanque|molkky|molky/.test(value)) || '';

function teamPlayer(name: string, points: number, unit: string, image: string | undefined,
  metrics: ChallengeExportMetric[], key: string): ChallengeExportPlayer {
  return {
    name, participantId: key, score: points,
    scoreDisplay: `${points} ${unit}`, scoreSecondary: 'Résultat de l’équipe',
    accuracy: null, darts: null, bestStreak: null, avgVisit: null,
    visits: [], metrics, headlineMetrics: metrics.slice(0, 4), avatarUrl: image,
  };
}
function addConfig(report: ChallengeExportReport, label: string, value: unknown) {
  if (value === null || value === undefined || value === '' || typeof value === 'object') return;
  report.configSummary = report.configSummary || [];
  if (report.configSummary.some(item=>item.label === label)) return;
  const asString = typeof value === 'boolean' ? (value ? 'OUI' : 'NON') : String(value);
  report.configSummary.push(metric(label, asString));
  const detail = report.details?.find(section=>section.title==='PARAMÈTRES DE LA PARTIE');
  if (detail) detail.rows.push([label,asString]);
}
function newSection(title: string, columns: string[], rows: string[][]): ChallengeExportSection {
  return { title, columns, rows };
}
function addMetric(list: ChallengeExportMetric[], label: string, value: number | null): void {
  if (value !== null) list.push(metric(label, value));
}
function replaceScoreboard(report: ChallengeExportReport, left: ChallengeExportPlayer,
  right: ChallengeExportPlayer, rows: string[][], title: string, highlights: ChallengeExportMetric[]) {
  report.players = [left, right];
  report.highlight = highlights;
  report.details = [newSection(title, ['INDICATEUR', left.name, right.name], rows), ...(report.details || [])];
  return report;
}

function reportBabyfoot(report: ChallengeExportReport, payload: any, summary: any): ChallengeExportReport | null {
  const roots = [summary, payload?.summary, payload];
  const read = (key: string) => firstDefined(...roots.map(root => root?.[key]));
  // Follow the native BabyFootStatsHistoryPage precedence: an explicit score
  // line outranks stale snapshot balances, then team stats, then top-level fields.
  const line = textValue(read('scoreLine') || read('scoreline'));
  const colon = [...line.matchAll(/:\s*(\d+)/g)];
  const dash = [...line.matchAll(/(\d+)\s*[-—–]\s*(\d+)/g)];
  const fromLine = colon.length >= 2 ? [Number(colon[0][1]), Number(colon[1][1])] :
    dash.length ? [Number(dash[dash.length - 1][1]), Number(dash[dash.length - 1][2])] : [];
  const scores: [number | null, number | null] = [
    firstNumber(fromLine[0], payload?.stats?.teamA?.score, read('scoreA')),
    firstNumber(fromLine[1], payload?.stats?.teamB?.score, read('scoreB')),
  ];
  if (scores[0] === null || scores[1] === null) return null;
  const setsA = firstNumber(read('setsA'));
  const setsB = firstNumber(read('setsB'));
  const setsEnabled = firstDefined(read('setsEnabled')) === true;
  const teamA = textValue(read('teamA')) || 'Équipe A';
  const teamB = textValue(read('teamB')) || 'Équipe B';
  const members = Array.isArray(payload?.players) ? payload.players : [];
  const memberAvatar = (team: 'A' | 'B') => {
    const ids = read(team === 'A' ? 'teamAProfileIds' : 'teamBProfileIds');
    const membersById = Array.isArray(ids) ? members.filter((member: any) => ids.map(String).includes(String(member?.id || ''))) : [];
    return membersById.map(imageSource).find(Boolean);
  };
  const logoA = imageSource({ logoDataUrl: read('teamALogoDataUrl'), logoUrl: read('teamALogoUrl') }) || memberAvatar('A');
  const logoB = imageSource({ logoDataUrl: read('teamBLogoDataUrl'), logoUrl: read('teamBLogoUrl') }) || memberAvatar('B');
  const pen = asObject(read('parachutes'));
  const pA: ChallengeExportMetric[] = [metric('BUTS', scores[0])];
  const pB: ChallengeExportMetric[] = [metric('BUTS', scores[1])];
  if (setsA !== null) pA.push(metric('SETS', setsA));
  if (setsB !== null) pB.push(metric('SETS', setsB));
  addMetric(pA, 'TIRS PARACHUTE', firstNumber(pen.shotsA));
  addMetric(pB, 'TIRS PARACHUTE', firstNumber(pen.shotsB));
  addMetric(pA, 'BUTS PARACHUTE', firstNumber(pen.goalsA));
  addMetric(pB, 'BUTS PARACHUTE', firstNumber(pen.goalsB));
  const left = teamPlayer(teamA, scores[0], 'BUTS', logoA, pA, 'A');
  const right = teamPlayer(teamB, scores[1], 'BUTS', logoB, pB, 'B');
  if (setsEnabled && setsA !== null && setsB !== null) {
    left.scoreDisplay = `${setsA} SET${setsA === 1 ? '' : 'S'} · ${scores[0]} BUTS`;
    right.scoreDisplay = `${setsB} SET${setsB === 1 ? '' : 'S'} · ${scores[1]} BUTS`;
  }
  const rows: string[][] = [
    ['BUTS', String(scores[0]), String(scores[1])],
  ];
  if (setsA !== null && setsB !== null) rows.push(['SETS', String(setsA), String(setsB)]);
  if (pA.some(m => m.label === 'TIRS PARACHUTE') && pB.some(m => m.label === 'TIRS PARACHUTE'))
    rows.push(['TIRS PARACHUTE', String(pen.shotsA), String(pen.shotsB)]);
  if (pA.some(m => m.label === 'BUTS PARACHUTE') && pB.some(m => m.label === 'BUTS PARACHUTE'))
    rows.push(['BUTS PARACHUTE', String(pen.goalsA), String(pen.goalsB)]);
  const highlights = [metric('SCORE FINAL', `${scores[0]} – ${scores[1]}`)];
  if (setsA !== null && setsB !== null) highlights.push(metric('SETS', `${setsA} – ${setsB}`));
  const winner = firstDefined(read('winnerTeam'));
  if (winner === 'A' || winner === 'B') highlights.push(metric('VAINQUEUR', winner === 'A' ? teamA : teamB));
  addConfig(report, 'FORMAT', read('mode'));
  addConfig(report, 'RÈGLE DE SCORE', read('scoreMode'));
  addConfig(report, 'CIBLE DE BUTS', read('target'));
  addConfig(report, 'BO SETS', read('setsBestOf'));
  const ret = replaceScoreboard(report, left, right, rows, 'BABY-FOOT · RÉSULTAT ÉQUIPES', highlights);
  ret.title = 'BABY-FOOT';
  // Sort only when winner is explicitly persisted, not on a potentially partial set score.
  if (winner === 'B') ret.players.reverse();
  if (!winner && scores[1] > scores[0] && !setsEnabled) ret.players.reverse();
  return ret;
}

function reportPetanque(report: ChallengeExportReport, payload: any, summary: any): ChallengeExportReport | null {
  const state = asObject(firstDefined(payload?.state, payload?.st, payload?.match));
  const teams = asObject(payload?.teams);
  const scores = asObject(payload?.scores);
  const leftScore = firstNumber(summary?.scoreA, payload?.scoreA, scores.A, state.scoreA, state?.scores?.A);
  const rightScore = firstNumber(summary?.scoreB, payload?.scoreB, scores.B, state.scoreB, state?.scores?.B);
  if (leftScore === null || rightScore === null) return null;
  const teamName = (team: 'A' | 'B') => {
    const raw = teams[team] ?? payload?.[`team${team}`] ?? state?.[`team${team}`];
    return textValue(typeof raw === 'string' ? raw : raw?.name) || `Équipe ${team}`;
  };
  const teamImage = (team: 'A' | 'B') => {
    const info = teams[team] || payload?.[`team${team}`];
    return imageSource(info) || (Array.isArray(info?.players) ? info.players.map(imageSource).find(Boolean) : undefined);
  };
  const nameA = teamName('A'), nameB = teamName('B');
  const target = firstNumber(summary?.targetScore, payload?.targetScore, state.targetScore);
  const recordedEnds = Array.isArray(payload?.ends) ? payload.ends : Array.isArray(state.ends) ? state.ends : [];
  const endsCount = firstNumber(summary?.endsCount, recordedEnds.length || null);
  const leftMetrics = [metric('POINTS', leftScore)], rightMetrics = [metric('POINTS', rightScore)];
  if (endsCount !== null) {
    leftMetrics.push(metric('MÈNES', endsCount)); rightMetrics.push(metric('MÈNES', endsCount));
  }
  const left = teamPlayer(nameA, leftScore, 'PTS', teamImage('A'), leftMetrics, 'A');
  const right = teamPlayer(nameB, rightScore, 'PTS', teamImage('B'), rightMetrics, 'B');
  const winner = firstDefined(summary?.winnerTeam, payload?.winnerTeam, summary?.winnerTeamId, payload?.winnerTeamId);
  const highlights: ChallengeExportMetric[] = [metric('SCORE FINAL', `${leftScore} – ${rightScore}`)];
  if (target !== null) highlights.push(metric('OBJECTIF', `${target} PTS`));
  if (endsCount !== null) highlights.push(metric('MÈNES', endsCount));
  if (winner === 'A' || winner === 'B') highlights.push(metric('VAINQUEUR', winner === 'A' ? nameA : nameB));
  addConfig(report, 'CIBLE', target === null ? null : `${target} PTS`);
  addConfig(report, 'FORMAT', firstDefined(payload?.mode, payload?.config?.mode, summary?.mode));
  const reportOut = replaceScoreboard(report, left, right,
    [['POINTS MARQUÉS', String(leftScore), String(rightScore)]], 'PÉTANQUE · SCORE ÉQUIPES', highlights);
  reportOut.title = 'PÉTANQUE';
  if (recordedEnds.length) {
    const lines: string[][] = recordedEnds.map((end: any, i: number) => {
      const team = textValue(end?.teamId || end?.team || end?.winnerTeam) || '—';
      const points = firstNumber(end?.points, end?.pts, end?.score);
      return [String(i + 1), team, points === null ? '—' : String(points)];
    });
    reportOut.details?.push(newSection('PÉTANQUE · MÈNE PAR MÈNE', ['N°', 'ÉQUIPE', 'POINTS'], lines));
  }
  if (winner === 'B' || (!winner && rightScore > leftScore)) reportOut.players.reverse();
  return reportOut;
}

function reportPingpong(report: ChallengeExportReport, entry: any, payload: any, summary: any): ChallengeExportReport | null {
  const data = asObject(payload);
  const scores = asObject(firstDefined(summary?.scores, data?.scores));
  const playersRaw = Array.isArray(entry?.players) ? entry.players : Array.isArray(data.players) ? data.players : [];
  const setsA = firstNumber(data.setsA, summary?.setsA);
  const setsB = firstNumber(data.setsB, summary?.setsB);
  // PingPongPlay persists sideA/B and setsA/B; legacy pingpongHistory stores
  // scores by player ID. Never treat unlabelled summary.sets[] as winning sets.
  if (setsA !== null && setsB !== null && (data.sideA || data.sideB)) {
    const leftName = textValue(data.sideA) || 'Équipe A';
    const rightName = textValue(data.sideB) || 'Équipe B';
    const left = teamPlayer(leftName, setsA, 'SETS', undefined, [metric('SETS', setsA)], 'A');
    const right = teamPlayer(rightName, setsB, 'SETS', undefined, [metric('SETS', setsB)], 'B');
    const aPts = firstNumber(data.pointsA, summary?.pointsA), bPts = firstNumber(data.pointsB, summary?.pointsB);
    const lines = [['SETS', String(setsA), String(setsB)]];
    if (aPts !== null && bPts !== null) {
      left.metrics.push(metric('POINTS DU SET', aPts)); right.metrics.push(metric('POINTS DU SET', bPts));
      lines.push(['POINTS DU SET', String(aPts), String(bPts)]);
    }
    addConfig(report, 'SETS À GAGNER', firstNumber(data.setsToWin, summary?.setsToWin));
    addConfig(report, 'PTS PAR SET', firstNumber(data.pointsPerSet, summary?.pointsPerSet));
    addConfig(report, 'ÉCART DE 2', firstDefined(data.winByTwo, summary?.winByTwo));
    const out = replaceScoreboard(report, left, right, lines, 'PING-PONG · SCORE', [metric('SETS', `${setsA} – ${setsB}`)]);
    out.title = 'PING-PONG';
    if (setsB > setsA) out.players.reverse();
    return out;
  }
  // Older pingpong_history records have a winnerId, players[], and sometimes
  // scores {playerId:number}. Treat those numbers as recorded values, not sets.
  if (playersRaw.length !== 2) return null;
  const keyA = String(playersRaw[0]?.id || ''), keyB = String(playersRaw[1]?.id || '');
  if (!keyA || !keyB || keyA === keyB) return null;
  const scoreA = firstNumber(scores[keyA]), scoreB = firstNumber(scores[keyB]);
  if (scoreA === null || scoreB === null) return null;
  const left = teamPlayer(textValue(playersRaw[0].name) || 'Joueur A', scoreA, 'POINTS', imageSource(playersRaw[0]), [metric('SCORE ENREGISTRÉ', scoreA)], keyA);
  const right = teamPlayer(textValue(playersRaw[1].name) || 'Joueur B', scoreB, 'POINTS', imageSource(playersRaw[1]), [metric('SCORE ENREGISTRÉ', scoreB)], keyB);
  const out = replaceScoreboard(report, left, right,
    [['SCORE ENREGISTRÉ', String(scoreA), String(scoreB)]], 'PING-PONG · SCORE ENREGISTRÉ', [metric('SCORES', `${scoreA} – ${scoreB}`)]);
  out.title = 'PING-PONG';
  if (firstDefined(entry.winnerId, data.winnerId, summary?.winnerId) === keyB) out.players.reverse();
  return out;
}

function reportMolkky(report: ChallengeExportReport, payload: any, summary: any): ChallengeExportReport | null {
  const state = asObject(payload?.state);
  const players: any[] = Array.isArray(state.players) && state.players.length ? state.players :
    Array.isArray(summary?.players) ? summary.players : [];
  const usable: Array<{raw:any;score:number|null}> = players.map((raw: any) => ({raw, score:firstNumber(raw?.score)}))
    .filter(item => item.score !== null);
  if (!usable.length) return null;
  const winnerId = String(firstDefined(state.winnerPlayerId, summary?.winnerPlayerId, payload?.winnerId) || '');
  const target = firstNumber(state?.config?.targetScore, summary?.targetScore, payload?.config?.targetScore);
  const turns = Array.isArray(state.turns) ? state.turns : [];
  addConfig(report, 'OBJECTIF', target === null ? null : `${target} PTS`);
  addConfig(report, 'RETOUR À 25', firstDefined(state?.config?.bounceBackTo25, summary?.bounceBackTo25));
  addConfig(report, 'ÉLIMINATION 3 MISS', firstDefined(state?.config?.eliminationOnThreeMiss, summary?.eliminationOnThreeMiss));
  report.title = 'MÖLKKY';
  report.players = usable.map(item => {
    const raw = item.raw;
    const id = String(raw.id || raw.playerId || '');
    const score = item.score as number;
    const thrown = firstNumber(raw.throws);
    const playerMetrics: ChallengeExportMetric[] = [metric('SCORE', score)];
    if (thrown !== null) playerMetrics.push(metric('LANCERS', thrown));
    if (raw.eliminated === true) playerMetrics.push(metric('STATUT', 'ÉLIMINÉ'));
    return {
      name: textValue(raw.name) || id || 'Joueur', participantId: id,
      score, scoreDisplay: `${score} PTS`, scoreSecondary: id === winnerId ? 'Vainqueur' : 'Score final',
      avatarUrl:imageSource(raw),accuracy:null,darts:null,bestStreak:null,avgVisit:null,
      metrics:playerMetrics,headlineMetrics:playerMetrics.slice(0,4),visits:[],
    };
  });
  // The winner can be first even when a player was later eliminated by a game rule.
  if (winnerId) report.players.sort((a,b)=> Number(b.participantId===winnerId)-Number(a.participantId===winnerId));
  const winner = report.players.find(player=>player.participantId===winnerId);
  const highlights:ChallengeExportMetric[]=[];
  if (winner) highlights.push(metric('VAINQUEUR', winner.name));
  if (target !== null) highlights.push(metric('OBJECTIF', `${target} PTS`));
  const turnsCount = firstNumber(summary?.turns, turns.length || null);
  if (turnsCount !== null) highlights.push(metric('LANCERS', turnsCount));
  report.highlight = highlights;
  report.details = [newSection('MÖLKKY · CLASSEMENT', ['JOUEUR','SCORE','LANCERS'],
    report.players.map(player=>[player.name,String(player.score),
      player.metrics.find(m=>m.label==='LANCERS')?.value||'—'])), ...(report.details||[])];
  if (turns.length) report.details.push(newSection('MÖLKKY · HISTORIQUE DES LANCERS',
    ['N°','JOUEUR','POINTS LANCER','AVANT','APRÈS'],turns.map((turn:any,i:number)=>[
      String(i+1),report.players.find(player=>player.participantId===String(turn.playerId||''))?.name||'—',
      String(firstNumber(turn.value)??'—'),String(firstNumber(turn.beforeScore)??'—'),
      String(firstNumber(turn.afterScore)??'—')] )));
  return report;
}

/** Returns the same report object if the archive is not a recognised sport. */
export function applyHistoricalSportResult(report: ChallengeExportReport, entry: any, mode: string): ChallengeExportReport {
  const payload = entry?.payload || entry?.decoded || {};
  const summary = entry?.summary || payload?.summary || {};
  const sport = sportKind(entry, payload, mode);
  if (sport.includes('babyfoot')) return reportBabyfoot(report, payload, summary) || report;
  if (sport.includes('petanque')) return reportPetanque(report, payload, summary) || report;
  if (sport.includes('pingpong')) return reportPingpong(report, entry, payload, summary) || report;
  if (sport.includes('molkky') || sport.includes('molky')) return reportMolkky(report, payload, summary) || report;
  return report;
}
