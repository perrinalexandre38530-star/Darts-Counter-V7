/**
 * SHOVE A PENNY -> History V4 PDF / image / share report.
 * No guessing of missing results and no treating marks as money/points.
 * Uses only the canonical saved summary, visit log and/or saved game snapshot.
 */
import type {
  ChallengeExportReport, ChallengeExportPlayer, ChallengeExportMetric,
  ChallengeExportSection,
} from './challengeResultsExport';

type AnyRecord = Record<string, any>;
const obj = (v: unknown): AnyRecord => v && typeof v === 'object' && !Array.isArray(v) ? v as AnyRecord : {};
const array = (v: unknown): any[] => Array.isArray(v) ? v : [];
const numeric = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v: number | null): string => v === null ? '—' : Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toLocaleString('fr-FR');
const stat = (label: string, value: unknown): ChallengeExportMetric => ({label, value: String(value ?? '—')});
const sec = (title: string, columns: string[], rows: string[][], note?: string): ChallengeExportSection =>
  ({title, columns, rows, ...(note ? {note} : {})});
const asId = (v: unknown): string => String(v ?? '').trim();
const isShove = (v: unknown) => /^shove[_-]?a[_-]?penny$/i.test(String(v ?? '').trim());
const findSavedId = (player: ChallengeExportPlayer, saved: any[]) => {
  const exactId = asId(player.participantId);
  if (exactId && (!saved.length || saved.some(p => asId(p.id) === exactId))) return exactId;
  const names = saved.filter(p => String(p?.name || '').trim().toLowerCase() === player.name.trim().toLowerCase());
  return names.length === 1 ? asId(names[0].id) : '';
};

/** Source-independent checks for historical entries with modeId in different containers. */
export function isShoveHistoryEntry(entry: any): boolean {
  const summary = obj(entry?.summary);
  const payload = obj(entry?.payload || entry?.decoded);
  return [entry?.modeId, entry?.mode, entry?.kind, entry?.game?.modeId, entry?.game?.mode,
    summary.modeId, summary.mode, payload.modeId, payload.mode,
    payload?.stateSnapshot?.modeId, entry?.resume?.state?.modeId].some(isShove);
}

/** Do not overwrite a report when the history entry isn't SHOVE or has no reliable players. */
export function enrichShoveHistoryReport(report: ChallengeExportReport, entry: any): ChallengeExportReport {
  if (!isShoveHistoryEntry(entry)) return report;
  const summary = obj(entry?.summary);
  const payload = obj(entry?.payload || entry?.decoded);
  const saved = obj(summary.shoveAPenny);
  const snapshot = obj(payload.stateSnapshot || entry?.resume?.state);
  const options = obj(snapshot.config?.modeOptions || summary.config?.modeOptions || payload.config?.modeOptions);
  const knownMarks = obj(saved.marksByPlayer || snapshot.special?.shoveMarksByPlayer);
  const compactStats = obj(summary.playerStats);
  const compactSample = array(summary.playerStats)[0] || Object.values(compactStats)[0];
  const sampleMarks = obj(Object.values(knownMarks)[0] || obj(compactSample).shoveAPenny?.marksBySector);
  const inferredRule = Object.hasOwn(sampleMarks, '25') ? 'electronic' : Object.hasOwn(sampleMarks, '1') ? 'traditional' : 'electronic';
  const rule = String(saved.ruleSet ?? options.ruleSet ?? inferredRule) === 'electronic' ? 'electronic' : 'traditional';
  const targets = rule === 'electronic' ? [15,16,17,18,19,20,25] : [1,2,3,4,5,6,7,8,9];
  const need = Math.max(2, Math.min(5, numeric(saved.marksPerBox ?? options.marksPerBox) ?? 3));
  const full = need * targets.length;
  const marksMap = obj(saved.marksByPlayer || snapshot.special?.shoveMarksByPlayer);
  // History V4 may keep its complete state, or a compact summary after a
  // cross-device backup. playerStats is a dictionary in current Wave61 saves,
  // but older archives may contain an array. Neither form may be discarded.
  const playerStatsMap = obj(summary.playerStats);
  const savedStats = array(summary.playerStats).length
    ? array(summary.playerStats)
    : Object.entries(playerStatsMap).map(([id, value]) => ({ ...obj(value), id }));
  const ranking = array(summary.rankings).length
    ? array(summary.rankings)
    : savedStats.filter(row => numeric(row?.rank) !== null && Number(row.rank) > 0)
      .sort((a, b) => Number(a.rank) - Number(b.rank));
  const originalPlayers = array(entry?.players).length ? array(entry.players) : array(snapshot.players);
  const savedPlayers = array(snapshot.players).length ? array(snapshot.players) : originalPlayers;
  const nameOf = (id: string): string =>
    String(originalPlayers.find(p => asId(p?.id) === id)?.name
      || savedPlayers.find(p => asId(p?.id) === id)?.name
      || savedStats.find(p => asId(p?.id) === id)?.name || id);
  const completeOrder = array(saved.finishOrder).length ? array(saved.finishOrder).map(asId) : array(snapshot.special?.shoveFinishOrder).map(asId);
  const rankedIds = ranking.map(p => asId(p?.id || p?.playerId)).filter(Boolean);
  const orderedIds = Array.from(new Set([
    ...rankedIds, ...completeOrder,
    ...savedPlayers.map(p=>asId(p?.id)).filter(Boolean),
    ...savedStats.map(p=>asId(p?.id)).filter(Boolean),
  ]));
  if (!report.players.length && orderedIds.length) {
    report.players = orderedIds.map((id): ChallengeExportPlayer => ({
      participantId: id, name: nameOf(id), score: Number.NaN, accuracy: null,
      darts: null, bestStreak: null, avgVisit: null, metrics: [], visits: [],
      avatarUrl: originalPlayers.find(p=>asId(p?.id)===id)?.avatarDataUrl || undefined,
    }));
  }
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  report.players.sort((a, b) => {
    const ai = positions.get(findSavedId(a, savedPlayers));
    const bi = positions.get(findSavedId(b, savedPlayers));
    return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
  });
  const visits = array(payload.visits).length ? array(payload.visits) : array(snapshot.visits);
  const statById = obj(snapshot.statsByPlayer || summary.statsByPlayer);
  const rulesLabel = rule === 'electronic' ? '15 À 20 + BULL · DANS L’ORDRE' : '1 À 9 · ORDRE LIBRE';
  const endMode = String(saved.endMode ?? options.endMode ?? 'first_finish');
  const endLabel = endMode === 'full_ranking' ? 'Classement complet' : endMode === 'fixed_rounds' ? 'Rounds limités' : 'Premier joueur à tout fermer';
  const stateStatus = String(entry?.status || snapshot.phase || '');
  const finished = stateStatus === 'finished' || snapshot.phase === 'finished';
  const winnerId = asId(entry?.winnerId || summary?.winnerId || snapshot?.winnerId);
  const rows: string[][] = [];
  const bySector: string[][] = targets.map(n => [n === 25 ? 'BULL' : String(n)]);
  for (const [index, player] of report.players.entries()) {
    const id = findSavedId(player, savedPlayers);
    const savedRow = obj(savedStats.find(p => asId(p?.id) === id));
    const personal = obj(marksMap[id]
      || savedRow.shoveAPenny?.marksBySector
      || ranking.find(p => asId(p?.id) === id)?.shoveAPenny?.marksBySector);
    const hasMarks = Object.keys(personal).length > 0;
    const st = obj(statById[id] || savedRow);
    const ownedVisits = visits.filter(v => asId(v?.playerId) === id);
    const total = hasMarks ? targets.reduce((sum, n) => sum + (numeric(personal[String(n)]) ?? 0), 0) : null;
    const closed = hasMarks ? targets.filter(n => (numeric(personal[String(n)]) ?? 0) >= need).length : null;
    const dartCount = numeric(st.darts ?? savedRow.darts);
    const hitCount = numeric(st.hits ?? savedRow.hits);
    const accuracy = dartCount !== null && dartCount > 0 && hitCount !== null
      ? Math.round(hitCount / dartCount * 1000) / 10 : null;
    const selfGained = ownedVisits.length ? ownedVisits.reduce((sum, v) => sum + (numeric(v.delta) ?? 0), 0) : null;
    const gifts = total !== null && selfGained !== null ? Math.max(0, total - selfGained) : null;
    const finishPlace = completeOrder.indexOf(id);
    player.score = closed ?? Number.NaN;
    player.scoreDisplay = closed === null ? 'CASES —' : `${closed}/${targets.length} CASES`;
    player.scoreSecondary = `${total === null ? '—' : total}/${full} marques · ${finishPlace >= 0 ? `place ${finishPlace + 1}` : finished ? `rang ${index + 1}` : 'en cours'}`;
    player.accuracy = accuracy;
    player.darts = dartCount;
    player.avgVisit = ownedVisits.length ? ownedVisits.reduce((sum,v)=>sum+(numeric(v.delta)??0),0)/ownedVisits.length : null;
    player.visits = ownedVisits.map(v=>numeric(v.delta)??0);
    const metrics = [stat('CASES FERMÉES', player.scoreDisplay), stat('MARQUES', `${fmt(total)}/${full}`),
      stat('FLÉCHETTES', fmt(dartCount)), stat('VOLÉES', fmt(numeric(st.visits) ?? (ownedVisits.length ? ownedVisits.length : null))),
      stat('PRÉCISION', accuracy === null ? '—' : `${fmt(accuracy)} %`),
      stat('SIMPLES / DOUBLES / TRIPLES', [
        fmt(hitCount === null ? null : Math.max(0, hitCount - (numeric(st.doubles)??0) - (numeric(st.triples)??0))),
        fmt(numeric(st.doubles)), fmt(numeric(st.triples)),
      ].join(' / ')), stat('MISS', fmt(numeric(st.misses)))];
    if (selfGained !== null) metrics.push(stat('MARQUES AU LANCER', fmt(selfGained)));
    if (gifts !== null) metrics.push(stat('MARQUES REÇUES', fmt(gifts)));
    player.metrics = metrics;
    player.headlineMetrics = metrics.slice(0, 4);
    rows.push([`#${index+1} ${player.name}`, fmt(closed), fmt(total), fmt(dartCount), accuracy === null ? '—' : `${fmt(accuracy)} %`,
      finishPlace >= 0 ? `${finishPlace + 1}` : winnerId === id ? '1' : '—']);
    targets.forEach((n, targetIndex) => bySector[targetIndex].push(hasMarks ? `${fmt(numeric(personal[String(n)]) ?? 0)}/${need}` : '—'));
  }
  report.title = 'SHOVE A PENNY · ' + (rule === 'electronic' ? '15–BULL' : '1–9');
  report.unit = 'volées';
  const actualRounds = Math.max(0, ...visits.map(v=>numeric(v?.round)??0));
  report.rounds = actualRounds;
  report.highlight = [stat(finished ? 'VAINQUEUR' : 'EN TÊTE', report.players[0]?.name || '—'),
    stat('CASES', report.players[0]?.scoreDisplay || '—'), stat('VOLÉES VALIDÉES', visits.length),
    stat('PARTICIPANTS', report.players.length)];
  const savedConfig = [stat('VARIANTE', rulesLabel), stat('MARQUES PAR CASE', need), stat('FIN DE PARTIE', endLabel),
    stat('SURPLUS', Number(options.overflowRule ?? 1) === 1 ? 'Marques offertes' : Number(options.overflowRule) === 2 ? 'Conversion en points' : 'Marques perdues')];
  if (endMode === 'fixed_rounds') savedConfig.push(stat('ROUNDS PRÉVUS', fmt(numeric(snapshot.config?.rounds ?? summary.config?.rounds))));
  report.configSummary = savedConfig;
  const markTables = Array.from({length:Math.ceil(report.players.length/4)},(_,page)=>{
    const first = page*4, subset = report.players.slice(first,first+4);
    return sec(`SHOVE · TABLEAU DES MARQUES${report.players.length > 4 ? ` · ${first+1}–${first+subset.length}` : ''}`,
      ['SECTEUR', ...subset.map(p=>p.name)], bySector.map(row=>[row[0],...row.slice(first+1,first+1+subset.length)]),
      `Marques par case ; ${need}/${need} signifie fermée. Les cases incomplètes ne rapportent aucune fermeture.`);
  });
  report.details = [
    sec('PARAMÈTRES DE LA PARTIE', ['PARAMÈTRE','VALEUR'], savedConfig.map(v=>[v.label,v.value])),
    sec(finished ? 'SHOVE · CLASSEMENT FINAL' : 'SHOVE · CLASSEMENT PROVISOIRE',
      ['JOUEUR','CASES','MARQUES','FLÉCHETTES','PRÉCISION','ARRIVÉE'], rows,
      'Le classement utilise les cases fermées, puis les marques ; une marque partielle ne ferme pas une case.'),
    ...markTables,
    ...report.players.map(p => sec(`${p.name.toUpperCase()} · STATISTIQUES`, ['INDICATEUR','VALEUR'], p.metrics.map(m=>[m.label,m.value]))),
    ...(visits.length ? [sec('SHOVE · JOURNAL DES VOLÉES',
      ['TOUR','JOUEUR','FLÉCHETTES','MARQUES GAGNÉES','IMPACTS'], visits.map(v=>[
        fmt(numeric(v?.round)), nameOf(asId(v?.playerId)),
        Array.isArray(v?.darts) ? String(v.darts.length) : '—', fmt(numeric(v?.delta)),
        array(v?.darts).map(d => d?.bed === 'MISS' ? 'MISS' : d?.bed === 'OB' ? 'BULL' : d?.bed === 'IB' ? 'DBULL' : `${String(d?.bed || '')}${String(d?.number || '')}`).join(' · ') || '—',
      ]), 'Données issues du journal History V4 ; les surplus reçus sont inclus dans le tableau final.')] : []),
  ];
  return report;
}
