import React from 'react';
import GameDifficultyStars from '../../components/GameDifficultyStars';
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
  const [availability, setAvailability] = React.useState<'all' | 'playable' | 'planned'>('all');
  const comparableById = React.useMemo(() => new Map(CHALLENGE_TRAINING_ALL.map((row) => [row.id, summarizeComparableChallengeSessions(row.id, sessions, participantId)])), [sessions, participantId]);
  const coaching = React.useMemo(() => buildChallengeTrainingRecommendations(CHALLENGE_TRAINING_ALL, sessions, participantId), [sessions, participantId]);
  const selected = CHALLENGE_TRAINING_ALL.find((row) => row.id === selectedId) || null;
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
  const totalAttempts = [...comparableById.values()].reduce((sum, row) => sum + row.attempts, 0);
  const playableCount = CHALLENGE_TRAINING_ALL.filter(challengeTrainingPlayable).length;
  const plannedCount = CHALLENGE_TRAINING_ALL.length - playableCount;
  return <section className="mssChallengeCatalog" aria-label="Catalogue des exercices Challenge">
    <header className="mssChallengeCatalogHero">
      <div className="mssChallengeCatalogHeroText"><span className="mssChallengeCatalogEyebrow">CENTRE D’ENTRAÎNEMENT · CHALLENGE</span><h3>Catalogue Challenge complet</h3><p>12 classiques et 44 nouveaux défis. Awena t’aide à retrouver tes exercices à travailler, en comparant uniquement les séances réalisées avec les mêmes règles. Les résultats restent privés au Centre.</p></div>
      <div className="mssChallengeCatalogMetrics"><div><b>{CHALLENGE_TRAINING_ALL.length}</b><small>FICHES</small></div><div><b>{totalAttempts}</b><small>TENTATIVES</small></div></div>
    </header>
    {canStart && coaching.length > 0 && <section className="mssChallengeCoach" aria-label="Suggestions Awena pour les exercices Challenge">
      <div className="mssChallengeCoachHead"><span className="mssChallengeCoachIcon" aria-hidden="true">✦</span><div><small>AWENA · ENTRAÎNEMENT PERSONNALISÉ</small><h4>Mes exercices conseillés</h4><p>Conseils calculés sur tes séances privées, sans classement ni comparaison entre joueurs.</p></div></div>
      <div className="mssChallengeCoachGrid">{coaching.map((item) => <article key={item.preset.id} className="mssChallengeCoachTile"><span className="mssChallengeCoachTag">{item.kind === 'consolider' ? 'À RETRAVAILLER' : item.kind === 'progresser' ? 'À CONFIRMER' : 'À DÉCOUVRIR'}</span><strong>{item.preset.title}</strong><GameDifficultyStars level={mssChallengeDifficulty(item.preset)} compact /><p>{item.reason}</p><button type="button" disabled={!canStart} onClick={() => onStart(item.preset)}>{item.kind === 'decouvrir' ? 'DÉCOUVRIR' : 'S’ENTRAÎNER'}</button></article>)}</div>
    </section>}
    {!canStart && <div className="mssChallengeCatalogNotice" role="status">Sélectionne un profil actif pour démarrer et enregistrer tes exercices Challenge.</div>}
    <div className="mssChallengeCatalogControls">
      <label className="mssChallengeCatalogSearch"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un défi, une cible, un objectif…" aria-label="Rechercher dans le catalogue Challenge" /></label>
      <div style={{minWidth:148,maxWidth:184}}><GameDifficultyFilter compact value={difficultyFilter} onChange={setDifficultyFilter} label="Difficulté des exercices Challenge" /></div>
      <button type="button" className={onlyStarted ? 'is-active' : ''} onClick={() => setOnlyStarted(!onlyStarted)}>{onlyStarted ? '✓' : '◌'} DÉJÀ JOUÉS</button><button type="button" className={onlyRecommended ? 'is-active' : ''} onClick={() => setOnlyRecommended(!onlyRecommended)}>{onlyRecommended ? '✓' : '✦'} CONSEILLÉS</button><select className="mssChallengeAvailability" aria-label="Disponibilité des défis" value={availability} onChange={(e) => setAvailability(e.target.value as 'all' | 'playable' | 'planned')}><option value="all">TOUTES LES FICHES</option><option value="playable">JOUABLES ({playableCount})</option>{plannedCount > 0 && <option value="planned">À DÉVELOPPER ({plannedCount})</option>}</select>
    </div>
    <nav className="mssChallengeCatalogFilters" aria-label="Familles Challenge">
      {filters.map((filter) => <button type="button" key={filter.id} className={family === filter.id ? 'is-active' : ''} onClick={() => setFamily(filter.id)}>{filter.label}</button>)}
    </nav>
    <div className="mssChallengeCatalogCount">{list.length} fiche{list.length !== 1 ? 's' : ''} affiché{list.length !== 1 ? 's' : ''}</div>
    <div className="mssChallengeCatalogGrid">
      {list.map((preset) => {
        const progress = comparableById.get(preset.id)!;
        return <article key={preset.id} className={'mssChallengeCatalogCard'+(preset.status === 'planned' ? ' is-planned' : '')}>
          <div className="mssChallengeCatalogCardHead"><span>{CHALLENGE_TRAINING_FAMILIES[preset.family]}</span><small>{preset.status === 'planned' ? 'À DÉVELOPPER' : (preset.minPlayers || 1) > 1 ? 'MULTIJOUEURS' : 'JOUABLE'}</small></div>
          <div style={{display:'flex',justifyContent:'flex-end',margin:'2px 0 4px'}}><GameDifficultyStars level={mssChallengeDifficulty(preset)} compact /></div>
          <h4>{preset.title}</h4><p>{preset.description}</p>
          {challengeTrainingPlayable(preset) ? <div className="mssChallengeCatalogProgress"><div><span>{progress.attempts ? `${progress.attempts} tentative${progress.attempts > 1 ? 's' : ''}` : 'À DÉCOUVRIR'}</span><b>{progress.best == null ? '—' : `${Math.round(progress.best)}%`}</b></div><div className="mssChallengeCatalogProgressTrack"><i style={{ width: `${Math.max(0, Math.min(100, progress.best ?? 0))}%` }} /></div>{progress.comparableAttempts > 1 && <small className="mssChallengeCatalogTrend">{progress.delta! > 0 ? '↗ +' : progress.delta! < 0 ? '↘ ' : '→ '}{Math.round(progress.delta!)} pt vs séance précédente · même configuration</small>}{progress.comparisonExcluded > 0 && <small className="mssChallengeCatalogCompareHint">{progress.comparisonExcluded} séance(s) non comparables à la dernière configuration mesurée</small>}</div> : <div className="mssChallengeCatalogNotReady">Concept visible · moteur de jeu non disponible</div>}
          {pendingById.get(preset.id) && <div className="mssChallengeCatalogResume"><span>⏸ Séance interrompue · {draftDartCount(pendingById.get(preset.id))} fléchettes</span><button type="button" disabled={!canStart} onClick={() => onResume(preset)}>REPRENDRE</button></div>}
          <div className="mssChallengeCatalogActions"><button type="button" onClick={() => setSelectedId(preset.id)}>DÉTAILS</button><button type="button" disabled={!canStart || !challengeTrainingPlayable(preset)} onClick={() => onStart(preset)}>{!challengeTrainingPlayable(preset) ? 'À VENIR' : (preset.minPlayers || 1) > 1 ? 'CHOISIR JOUEURS' : '▶ ' + (pendingById.get(preset.id) ? 'NOUVEL ESSAI' : 'JOUER')}</button></div>
        </article>;
      })}
    </div>
    {!list.length && <div className="mssChallengeCatalogEmpty">Aucun exercice avec ces filtres. <button type="button" onClick={() => { setFamily('all'); setQuery(''); setOnlyStarted(false); setOnlyRecommended(false); setAvailability('all'); setDifficultyFilter(0); }}>Tout afficher</button></div>}
    {selected && <div className="mssChallengeCatalogOverlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedId(null); }}>
      <section className="mssChallengeCatalogDialog" role="dialog" aria-modal="true" aria-labelledby="mss-challenge-dialog-title">
        <header><div><small>{CHALLENGE_TRAINING_FAMILIES[selected.family]} · {selected.status === 'planned' ? 'À DÉVELOPPER' : (selected.minPlayers || 1) > 1 ? 'MULTIJOUEURS' : selected.arcadeId ? 'JOUABLE' : `NIVEAU ${selected.difficulty}/5`}</small><h3 id="mss-challenge-dialog-title">{selected.title}</h3><GameDifficultyStars level={mssChallengeDifficulty(selected)} /></div><button type="button" aria-label="Fermer les détails" onClick={() => setSelectedId(null)}>×</button></header>
        <p>{selected.instructions}</p>
        {selected.status === 'planned' ? <div className="mssChallengeCatalogNotice">Ce défi figure dans le catalogue officiel Challenge, mais ses règles ne disposent pas encore d’un moteur jouable. Aucun faux score n’est généré.</div> : null}
        {!selected.arcadeId && <div className="mssChallengeCatalogDialogMetrics"><div><small>TOURS</small><b>{selected.config.visits || 10}</b></div><div><small>FLECHETTES MAX</small><b>{(selected.config.visits || 10) * 3}</b></div><div><small>OBJECTIF DE VALIDATION</small><b>{selected.successValidationPct}%</b></div></div>}
        <div className="mssChallengeCatalogDialogMetrics"><div><small>TENTATIVES</small><b>{comparableById.get(selected.id)?.attempts || 0}</b></div><div><small>MEILLEUR INDICE</small><b>{comparableById.get(selected.id)?.best == null ? '—' : `${Math.round(comparableById.get(selected.id)!.best!)}%`}</b></div><div><small>SCORE MESURÉ</small><b>{comparableById.get(selected.id)?.latestPoints ?? '—'}</b></div></div>
        {comparableById.get(selected.id)?.latest != null && <div className="mssChallengeCatalogComparison"><b>PERFORMANCE MESURÉE</b><span>Dernier indice : {Math.round(comparableById.get(selected.id)!.latest!)} % · Meilleur indice : {Math.round(comparableById.get(selected.id)!.best!)} % · {comparableById.get(selected.id)!.comparableAttempts} essai(s) à règles identiques</span>{comparableById.get(selected.id)!.delta !== null && <strong>Évolution : {comparableById.get(selected.id)!.delta! > 0 ? '+' : ''}{Math.round(comparableById.get(selected.id)!.delta!)} point(s) vs séance précédente comparable</strong>}{comparableById.get(selected.id)!.comparisonExcluded > 0 && <small>{comparableById.get(selected.id)!.comparisonExcluded} tentative(s) avec d'autres réglages ou des données incomplètes : exclues du comparatif.</small>}</div>}
        {pendingById.get(selected.id) && <div className="mssChallengeCatalogResume"><span>Une tentative est en pause avec {draftDartCount(pendingById.get(selected.id))} fléchettes.</span><button type="button" disabled={!canStart} onClick={() => onResume(selected)}>REPRENDRE LA SÉANCE</button></div>}
        <footer><button type="button" onClick={() => setSelectedId(null)}>RETOUR</button><button type="button" disabled={!canStart || !challengeTrainingPlayable(selected)} onClick={() => onCustomize(selected)}>PERSONNALISER</button><button type="button" disabled={!canStart || !challengeTrainingPlayable(selected)} onClick={() => onStart(selected)}>{challengeTrainingPlayable(selected) ? ((selected.minPlayers || 1) > 1 ? 'CHOISIR LES JOUEURS' : '▶ LANCER LA SÉANCE') : 'À DÉVELOPPER'}</button></footer>
      </section>
    </div>}
  </section>;
}
