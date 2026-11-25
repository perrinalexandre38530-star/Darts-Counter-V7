import React from 'react';
import { createPortal } from 'react-dom';
import GameDifficultyStars from '../../components/GameDifficultyStars';
import TrainingExerciseListRow from './TrainingExerciseListRow';
import GameDifficultyFilter from '../../components/GameDifficultyFilter';
import { mssChallengeDifficulty } from '../../lib/mssVisualCharter';
import {
  CHALLENGE_TRAINING_ALL, CHALLENGE_TRAINING_FAMILIES, challengeTrainingPlayable,
  type ChallengeTrainingFamily, type ChallengeTrainingPreset,
} from '../catalog/challengeTrainingCatalog';
import type { TrainingDetailedSession } from '../stats/trainingStatsHub';
import { loadTrainingChallengeDraft } from '../profile/trainingChallengeDraft';
import { buildChallengeTrainingRecommendations, summarizeComparableChallengeSessions } from '../profile/trainingChallengeCoach';
import {loadTrainingArcadeDraft} from '../profile/trainingArcadeDraft';
import './trainingResponsive.css';

type Props = {
  sessions: TrainingDetailedSession[];
  participantId: string;
  canStart: boolean;
  onResume: (preset: ChallengeTrainingPreset) => void;
  onStart: (preset: ChallengeTrainingPreset) => void;
  onCustomize: (preset: ChallengeTrainingPreset) => void;
};

function draftDartCount(draft: {hits?: readonly unknown[]; log?: readonly unknown[]} | null | undefined): number {
  if (Array.isArray(draft?.hits)) return draft.hits.length;
  if (Array.isArray(draft?.log)) return draft.log.length;
  return 0;
}

const familyIcons: Record<ChallengeTrainingFamily, string> = { cible: 'bull', parcours: 'progress', precision: 'precision', doubles: 'doubles', evaluation: 'diagnosis', combinaisons: 'library', scoring: 'scoring', risque: 'live', strategie: 'plans', multijoueurs: 'badges' };

const filters: Array<{ id: ChallengeTrainingFamily | 'all'; label: string }> = [
  { id: 'all', label: 'TOUS' },
  ...Object.entries(CHALLENGE_TRAINING_FAMILIES).map(([id, label]) => ({ id: id as ChallengeTrainingFamily, label })),
];

export default function TrainingChallengeCatalog({ sessions, participantId, canStart, onStart, onResume, onCustomize }: Props) {
  const [family, setFamily] = React.useState<ChallengeTrainingFamily | 'all'>('all');
  const [query, setQuery] = React.useState('');
  const [difficultyFilter, setDifficultyFilter] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [onlyStarted, setOnlyStarted] = React.useState(false);
  const [onlyRecommended, setOnlyRecommended] = React.useState(false);
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const dialogRef = React.useRef<HTMLElement>(null);
  const [availability, setAvailability] = React.useState<'all' | 'playable' | 'planned'>('all');
  const comparableById = React.useMemo(() => new Map(CHALLENGE_TRAINING_ALL.map((row) => [row.id, summarizeComparableChallengeSessions(row.id, sessions, participantId)])), [sessions, participantId]);
  const coaching = React.useMemo(() => buildChallengeTrainingRecommendations(CHALLENGE_TRAINING_ALL, sessions, participantId), [sessions, participantId]);
  const selected = CHALLENGE_TRAINING_ALL.find((row) => row.id === selectedId) || null;
  React.useEffect(() => {
    if (!selectedId) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setSelectedId(null); }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]'));
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); if (previous?.isConnected) previous.focus(); };
  }, [selectedId]);
  const pendingById = React.useMemo(() => new Map(CHALLENGE_TRAINING_ALL.map((row) => [row.id, row.arcadeId ? loadTrainingArcadeDraft(participantId,row.id) : loadTrainingChallengeDraft(participantId, row.id)])), [participantId]);
  const list = CHALLENGE_TRAINING_ALL.filter((row) => {
    if (family !== 'all' && row.family !== family) return false;
    if (difficultyFilter !== 0 && mssChallengeDifficulty(row) !== difficultyFilter) return false;
    if (availability === 'playable' && !challengeTrainingPlayable(row)) return false;
    if (availability === 'planned' && challengeTrainingPlayable(row)) return false;
    if (onlyStarted && !(comparableById.get(row.id)?.attempts)) return false;
    if (onlyRecommended && !coaching.some((item) => item.preset.id === row.id)) return false;
    const text = `${row.title} ${row.description} ${row.instructions}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return text.includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  });
  const hasFilters = Boolean(query || family !== 'all' || difficultyFilter || onlyStarted || onlyRecommended || availability !== 'all');
  const totalAttempts = [...comparableById.values()].reduce((sum, row) => sum + row.attempts, 0);
  const playableCount = CHALLENGE_TRAINING_ALL.filter(challengeTrainingPlayable).length;
  const plannedCount = CHALLENGE_TRAINING_ALL.length - playableCount;
  return <section className="mssChallengeCatalog" aria-label="Catalogue des exercices Challenge">
    <header className="mssChallengeCatalogHero">
      <h3>CHALLENGE</h3>
      <div className="mssChallengeCatalogMetrics"><div><b>{CHALLENGE_TRAINING_ALL.length}</b><small>FICHES</small></div><div><b>{totalAttempts}</b><small>ESSAIS</small></div></div>
    </header>
    {!canStart && <div className="mssChallengeCatalogNotice" role="status">Sélectionne un profil actif pour jouer.</div>}
    <div className="mssChallengeCatalogControls">
      <div className="mssChallengeCatalogSearchRow">
        <div className="mssChallengeCatalogSearch"><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un défi…" aria-label="Rechercher dans le catalogue Challenge" />{query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery('')}>×</button>}</div>
        <button type="button" className={'mssChallengeCatalogFilterToggle'+(showMoreFilters || onlyStarted || onlyRecommended || availability !== 'all' ? ' is-active' : '')} aria-label="Filtres supplémentaires" title="Filtres supplémentaires" aria-expanded={showMoreFilters} aria-controls={showMoreFilters ? "mss-challenge-extra-filters" : undefined} onClick={() => setShowMoreFilters(value => !value)}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="var(--dc-card,#141923)"/><circle cx="16" cy="12" r="2" fill="var(--dc-card,#141923)"/><circle cx="10" cy="18" r="2" fill="var(--dc-card,#141923)"/></svg></button>
      </div>
      <div className="mssChallengeCatalogFilterRow">
        <select aria-label="Famille Challenge" value={family} onChange={event => setFamily(event.target.value as ChallengeTrainingFamily | 'all')}>{filters.map(filter => <option key={filter.id} value={filter.id}>{filter.id === 'all' ? 'TOUTES FAMILLES' : filter.label}</option>)}</select>
        <GameDifficultyFilter compact value={difficultyFilter} onChange={setDifficultyFilter} label="Difficulté des exercices Challenge" />
      </div>
      {showMoreFilters && <div className="mssChallengeCatalogExtraFilters" id="mss-challenge-extra-filters">
        <button type="button" aria-pressed={onlyStarted} className={onlyStarted ? 'is-active' : ''} onClick={() => setOnlyStarted(!onlyStarted)}>DÉJÀ JOUÉS</button>
        <button type="button" aria-pressed={onlyRecommended} className={onlyRecommended ? 'is-active' : ''} onClick={() => setOnlyRecommended(!onlyRecommended)}>CONSEILLÉS</button>
        {plannedCount > 0 && <select className="mssChallengeAvailability" aria-label="Disponibilité des défis" value={availability} onChange={(e) => setAvailability(e.target.value as 'all' | 'playable' | 'planned')}><option value="all">TOUTES LES FICHES</option><option value="playable">JOUABLES ({playableCount})</option><option value="planned">À DÉVELOPPER ({plannedCount})</option></select>}
      </div>}
    </div>
    {canStart && coaching.length > 0 && <details className="mssChallengeCoach" aria-label="Suggestions Awena pour les exercices Challenge">
      <summary>Mes exercices conseillés <span>AWENA · {coaching.length}</span></summary>
      <div className="mssChallengeCoachGrid">{coaching.map((item) => <article key={item.preset.id} className="mssChallengeCoachTile"><span className="mssChallengeCoachTag">{item.kind === 'consolider' ? 'À RETRAVAILLER' : item.kind === 'progresser' ? 'À CONFIRMER' : 'À DÉCOUVRIR'}</span><strong>{item.preset.title}</strong><GameDifficultyStars level={mssChallengeDifficulty(item.preset)} compact showValue={false} /><p>{item.reason}</p><button type="button" disabled={!canStart} onClick={() => onStart(item.preset)}>{item.kind === 'decouvrir' ? 'DÉCOUVRIR' : 'S’ENTRAÎNER'}</button></article>)}</div>
    </details>}
    {hasFilters && <div className="mssChallengeCatalogCount" aria-live="polite">{list.length} / {CHALLENGE_TRAINING_ALL.length} exercices <button type="button" onClick={() => { setFamily('all'); setQuery(''); setOnlyStarted(false); setOnlyRecommended(false); setAvailability('all'); setDifficultyFilter(0); }}>RÉINITIALISER</button></div>}
    <div className="mssChallengeCatalogGrid">
      {list.map((preset) => {
        const progress = comparableById.get(preset.id)!;
        const pending = pendingById.get(preset.id);
        const status = pending ? `En pause · ${draftDartCount(pending)} fléchettes` : !challengeTrainingPlayable(preset) ? 'À développer' : progress.attempts > 0 ? `${progress.attempts} essai${progress.attempts > 1 ? 's' : ''}${progress.best == null ? '' : ` · Record ${Math.round(progress.best)}%`}` : 'Pas encore commencé';
        return <TrainingExerciseListRow key={preset.id} title={preset.title} description={preset.description} icon={familyIcons[preset.family]}
          level={mssChallengeDifficulty(preset)} status={status} badge={CHALLENGE_TRAINING_FAMILIES[preset.family]}
          active={selectedId === preset.id} onClick={() => setSelectedId(preset.id)} />;
      })}
    </div>
    {!list.length && <div className="mssChallengeCatalogEmpty">Aucun exercice avec ces filtres. <button type="button" onClick={() => { setFamily('all'); setQuery(''); setOnlyStarted(false); setOnlyRecommended(false); setAvailability('all'); setDifficultyFilter(0); }}>Tout afficher</button></div>}
    {selected && typeof document !== 'undefined' && createPortal(<div className="mssChallengeCatalogOverlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedId(null); }}>
      <section ref={dialogRef} className="mssChallengeCatalogDialog" role="dialog" aria-modal="true" aria-labelledby="mss-challenge-dialog-title">
        <header><div><small>{CHALLENGE_TRAINING_FAMILIES[selected.family]} · {selected.status === 'planned' ? 'À DÉVELOPPER' : (selected.minPlayers || 1) > 1 ? 'MULTIJOUEURS' : 'JOUABLE'}</small><h3 id="mss-challenge-dialog-title">{selected.title}</h3><GameDifficultyStars level={mssChallengeDifficulty(selected)} showValue={false} /></div><button type="button" aria-label="Fermer les détails" onClick={() => setSelectedId(null)}>×</button></header>
        <p>{selected.description}</p><p>{selected.instructions}</p>
        {!canStart && <div className="mssChallengeCatalogNotice" role="status">Sélectionne un profil actif pour jouer.</div>}
        {selected.status === 'planned' ? <div className="mssChallengeCatalogNotice">Ce défi figure dans le catalogue officiel Challenge, mais ses règles ne disposent pas encore d’un moteur jouable. Aucun faux score n’est généré.</div> : null}
        {!selected.arcadeId && <div className="mssChallengeCatalogDialogMetrics"><div><small>TOURS</small><b>{selected.config.visits || 10}</b></div><div><small>FLECHETTES MAX</small><b>{(selected.config.visits || 10) * 3}</b></div><div><small>OBJECTIF DE VALIDATION</small><b>{selected.successValidationPct}%</b></div></div>}
        <div className="mssChallengeCatalogDialogMetrics"><div><small>TENTATIVES</small><b>{comparableById.get(selected.id)?.attempts || 0}</b></div><div><small>MEILLEUR INDICE</small><b>{comparableById.get(selected.id)?.best == null ? '—' : `${Math.round(comparableById.get(selected.id)!.best!)}%`}</b></div><div><small>SCORE MESURÉ</small><b>{comparableById.get(selected.id)?.latestPoints ?? '—'}</b></div></div>
        {comparableById.get(selected.id)?.latest != null && <div className="mssChallengeCatalogComparison"><b>PERFORMANCE MESURÉE</b><span>Dernier indice : {Math.round(comparableById.get(selected.id)!.latest!)} % · Meilleur indice : {Math.round(comparableById.get(selected.id)!.best!)} % · {comparableById.get(selected.id)!.comparableAttempts} essai(s) à règles identiques</span>{comparableById.get(selected.id)!.delta !== null && <strong>Évolution : {comparableById.get(selected.id)!.delta! > 0 ? '+' : ''}{Math.round(comparableById.get(selected.id)!.delta!)} point(s) vs séance précédente comparable</strong>}{comparableById.get(selected.id)!.comparisonExcluded > 0 && <small>{comparableById.get(selected.id)!.comparisonExcluded} tentative(s) avec d'autres réglages ou des données incomplètes : exclues du comparatif.</small>}</div>}
        {Boolean(comparableById.get(selected.id)?.attempts) && comparableById.get(selected.id)?.comparisonExcluded ? <small className="mssChallengeCatalogCompareHint">{comparableById.get(selected.id)!.comparisonExcluded} séance(s) non comparables à la dernière configuration mesurée.</small> : null}
        {pendingById.get(selected.id) && <div className="mssChallengeCatalogResume"><span>Une tentative est en pause avec {draftDartCount(pendingById.get(selected.id))} fléchettes.</span><button type="button" disabled={!canStart} onClick={() => onResume(selected)}>REPRENDRE LA SÉANCE</button></div>}
        <footer><button type="button" onClick={() => setSelectedId(null)}>RETOUR</button><button type="button" disabled={!canStart || !challengeTrainingPlayable(selected)} onClick={() => onCustomize(selected)}>PERSONNALISER</button><button type="button" disabled={!canStart || !challengeTrainingPlayable(selected)} onClick={() => onStart(selected)}>{challengeTrainingPlayable(selected) ? ((selected.minPlayers || 1) > 1 ? 'CHOISIR LES JOUEURS' : (pendingById.get(selected.id) ? 'NOUVEL ESSAI' : 'LANCER LA SÉANCE')) : 'À DÉVELOPPER'}</button></footer>
      </section>
    </div>, document.body)}
  </section>;
}
