/**
 * CAPITAL V162 — Une seule projection History V4 pour les exports et VOIR STATS.
 * Les résultats finaux sont ceux de la sauvegarde ; le journal ne fournit que
 * les manches explicitement enregistrées et validées par le lecteur V161.
 */
import { readCapitalHistoryMatchDetail } from './capitalHistoryMatchDetail';
import type { ChallengeExportReport, ChallengeExportMetric, ChallengeExportPlayer, ChallengeExportSection } from './challengeResultsExport';
import { CAPITAL_CONTRACT_META } from './capitalGame';

const cell = (value: number | null): string => value === null || !Number.isFinite(value) ? '—' :
  value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const valueOrNull = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const row = (title: string, columns: string[], rows: string[][], note?: string): ChallengeExportSection =>
  ({title, columns, rows, ...(note ? {note} : {})});
const stat = (label: string, n: number | null, suffix = ''): ChallengeExportMetric | null =>
  n === null ? null : ({label, value: cell(n) + suffix});
const stripNull = (values: Array<ChallengeExportMetric | null>): ChallengeExportMetric[] =>
  values.filter((x): x is ChallengeExportMetric => !!x);

export function capitalHistoryVisualReport(report: ChallengeExportReport, source: unknown): ChallengeExportReport {
  const detail = readCapitalHistoryMatchDetail(source);
  // Full profile IDs are authoritative. Never join by name: homonyms remain distinct.
  const existing = new Map(report.players.filter(p => p.participantId)
    .map(p => [p.participantId!, p]));
  report.players = detail.players.map((p): ChallengeExportPlayer => {
    const prior = existing.get(p.id);
    return {
      ...(prior || {}), name: p.name, participantId: p.id,
      score: p.finalCapital ?? Number.NaN,
      scoreDisplay: p.finalCapital === null ? 'CAPITAL —' : `${cell(p.finalCapital)} CAPITAL`,
      scoreSecondary: 'Capital final · contrats validés uniquement',
      accuracy: p.successRate, darts: p.dartsThrown, avgVisit: p.averageVisit,
      bestStreak: null, visits: [],
      metrics: stripNull([
        stat('CAPITAL INITIAL', p.startingCapital), stat('CAPITAL FINAL', p.finalCapital),
        stat('POINTS CRÉDITÉS', p.pointsWon), stat('CAPITAL PERDU', p.capitalLost),
        stat('CONTRATS VALIDÉS', p.successfulContracts), stat('CONTRATS JOUÉS', p.contractsPlayed),
        stat('RÉUSSITE', p.successRate, ' %'), stat('MOYENNE PAR VOLÉE', p.averageVisit),
        stat('MEILLEURE VOLÉE', p.bestVisit), stat('FLÉCHETTES', p.dartsThrown),
      ]),
    };
  });
  report.title = `CAPITAL · ${detail.variantName}`;
  report.sportLabel = 'DARTS · CAPITAL';
  report.rounds = detail.contracts.length;
  report.unit = 'contrats';
  report.highlight = [
    {label: 'JOUEURS', value: String(detail.players.length)},
    {label: 'CONTRATS', value: String(detail.contracts.length)},
    ...stripNull([stat('MEILLEUR CAPITAL', detail.players[0]?.finalCapital ?? null)]),
  ];
  const config = (report.configSummary || []).filter(item =>
    item.label !== 'VARIANTE' && item.label !== 'CONTRATS');
  report.configSummary = [
    {label: 'VARIANTE', value: detail.variantName},
    {label: 'CONTRATS', value: String(detail.contracts.length)},
    ...config,
  ];
  // Discard older, independently inferred CAPITAL tables to avoid conflicting
  // player identity, raw scores or a different journal in the same PDF.
  report.details = [row('PARAMÈTRES DE LA PARTIE', ['PARAMÈTRE', 'VALEUR'],
    report.configSummary.map(item => [item.label, item.value]))];
  if (detail.integrityWarning || detail.dataWarning) {
    report.details.push(row('CAPITAL · INTÉGRITÉ DE LA SAUVEGARDE',
      ['CONTRÔLE', 'OBSERVATION'], [[
        'Historique V4', detail.dataWarning || 'Une incohérence est signalée dans les scores conservés',
      ]], 'Les résultats ne sont jamais corrigés ni reconstruits pendant l’export.'));
  }
  if (detail.teams.length) report.details.push(row('CAPITAL · CLASSEMENT DES ÉQUIPES',
    ['ÉQUIPE', 'CAPITAL FINAL'], detail.teams.map(t => [t.name, cell(t.score)])));
  // Keep A4 report columns legible: do not squeeze seven statistics into one row.
  // Both tables use the same stored player IDs and the same authoritative values.
  report.details.push(row('CAPITAL · CLASSEMENT',
    ['JOUEUR', 'RANG', 'CAPITAL FINAL', 'CONTRATS OK'],
    detail.players.map(p => [p.name, p.rank === null ? '—' : String(p.rank),
      cell(p.finalCapital), p.successfulContracts === null || p.contractsPlayed === null ? '—'
        : `${p.successfulContracts}/${p.contractsPlayed}`])));
  report.details.push(row('CAPITAL · PERFORMANCE',
    ['JOUEUR', 'POINTS CRÉDITÉS', 'CAPITAL PERDU', 'RÉUSSITE'],
    detail.players.map(p => [p.name, cell(p.pointsWon), cell(p.capitalLost),
      p.successRate === null ? '—' : `${cell(p.successRate)} %`])));
  const visits = new Map(detail.visits.map(v => [`${v.playerId}:${v.contractIndex}`, v]));
  const contractName = (id: string) => detail.contractLabels[id] ||
    CAPITAL_CONTRACT_META[id as keyof typeof CAPITAL_CONTRACT_META]?.label || id;
  if (detail.contracts.length) {
    // At most 3 player columns per table keep labels and values legible on A4.
    for (let start = 0; start < detail.players.length; start += 3) {
      const subset = detail.players.slice(start, start + 3);
      const rows = detail.contracts.map((contract, index) => [
        String(index + 1), contractName(contract), ...subset.map(p => {
          const v = visits.get(`${p.id}:${index}`);
          return v ? `${cell(valueOrNull(v.scoreAfter))} · ${v.success ? 'OK' : 'ÉCHEC'}` : '—';
        }),
      ]);
      report.details.push(row(`CAPITAL · CONTRATS PAR JOUEUR${detail.players.length > 3 ? ` (${start + 1}–${start + subset.length})` : ''}`,
        ['TOUR','CONTRAT',...subset.map(p => p.name)], rows,
        'OK : contrat validé · ÉCHEC : contrat raté · — : volée absente. Chaque cellule donne le capital après le contrat.'));
    }
  }
  for (const p of detail.players) {
    const playerVisits = detail.contracts.map((id, index) => visits.get(`${p.id}:${index}`))
      .filter((v): v is NonNullable<typeof v> => !!v);
    if (!playerVisits.length) continue;
    report.details.push(row(`${p.name} · ÉVOLUTION DU CAPITAL`,
      ['TOUR', 'CONTRAT', 'ÉTAT', 'VARIATION', 'CAPITAL APRÈS'],
      playerVisits.map(v => [
        String(v.contractIndex + 1), contractName(v.contractId), v.success ? 'OK' : 'ÉCHEC',
        cell(v.scoreAfter - v.scoreBefore), cell(valueOrNull(v.scoreAfter)),
      ]), 'Variation calculée seulement depuis les capitaux avant et après explicitement enregistrés.'));
  }
  return report;
}
