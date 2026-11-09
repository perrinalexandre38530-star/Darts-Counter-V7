import React from 'react';
import {
  CHALLENGE_IDEAS,
  CHALLENGE_IDEA_CATEGORIES,
  CHALLENGE_APPROVED_IDEA_COUNT,
  type ChallengeIdeaCategory,
} from '../lib/challengeIdeasCatalog';
import './ChallengeIdeasCatalog.css';

type CategoryFilter = 'all' | ChallengeIdeaCategory;

/**
 * Presentation-only catalogue. The active exercises are still selected by
 * ChallengeConfig / challengeExercises; a planned idea cannot launch a match.
 */
export default function ChallengeIdeasCatalog() {
  const [filter, setFilter] = React.useState<CategoryFilter>('all');
  const [query, setQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const matches = React.useMemo(
    () => CHALLENGE_IDEAS.filter(item =>
      (filter === 'all' || item.category === filter) &&
      (!normalizedQuery || (item.title + ' ' + item.rule + ' ' + item.ranking)
        .toLocaleLowerCase('fr').includes(normalizedQuery))
    ),
    [filter, normalizedQuery],
  );
  const shown = showAll ? matches : matches.slice(0, 8);

  return <section className="challenge-ideas-catalog" aria-label="Nouveaux challenges approuvés, en préparation">
    <header className="challenge-ideas-heading">
      <span className="challenge-ideas-icon" aria-hidden="true">✦</span>
      <div>
        <strong>LE LABORATOIRE DES DÉFIS</strong>
        <p>{CHALLENGE_APPROVED_IDEA_COUNT} nouveaux challenges validés · 7 familles · futurs modes de jeu</p>
      </div>
      <span className="challenge-ideas-counter">{CHALLENGE_APPROVED_IDEA_COUNT}</span>
    </header>
    <p className="challenge-ideas-note">
      Découvrez les prochains challenges. Ces fiches présentent les règles prévues :
      elles ne sont pas encore jouables et ne modifient pas votre configuration actuelle.
    </p>
    <label className="challenge-ideas-search">
      <span className="sr-only">Rechercher un futur challenge</span>
      <input
        type="search"
        aria-label="Rechercher un futur challenge"
        placeholder="Rechercher un défi, une cible ou une règle…"
        value={query}
        onChange={event => { setQuery(event.target.value); setShowAll(false); }}
      />
    </label>
    <div className="challenge-ideas-filters" role="group" aria-label="Filtrer les nouveaux challenges">
      <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'on' : ''}
        onClick={() => { setFilter('all'); setShowAll(false); }}>
        TOUS <span>{CHALLENGE_IDEAS.length}</span>
      </button>
      {CHALLENGE_IDEA_CATEGORIES.map(cat => <button
        key={cat.id} type="button" className={filter === cat.id ? 'on' : ''}
        aria-pressed={filter === cat.id}
        onClick={() => { setFilter(cat.id); setShowAll(false); }}
      >{cat.icon} {cat.label} <span>{CHALLENGE_IDEAS.filter(idea => idea.category === cat.id).length}</span></button>)}
    </div>
    {matches.length ? <div className="challenge-ideas-grid">
      {shown.map(item => <details className="challenge-idea" key={item.id}>
        <summary>
          <span className="challenge-idea-name">{item.title}</span>
          <span className="challenge-idea-planned">EN PRÉPARATION</span>
        </summary>
        <div className="challenge-idea-detail">
          <p><b>MISSION</b>{item.rule}</p>
          <p><b>RECORD / CLASSEMENT</b>{item.ranking}</p>
          <small>Ce challenge sera activé uniquement après raccordement au moteur et validation des tests.</small>
        </div>
      </details>)}
    </div> : <div className="challenge-ideas-empty">Aucun défi ne correspond à cette recherche.</div>}
    {matches.length > 8 && <button type="button" className="challenge-ideas-more"
      onClick={() => setShowAll(current => !current)}>
      {showAll ? 'RÉDUIRE LE CATALOGUE' : 'VOIR LES ' + matches.length + ' DÉFIS'}
    </button>}
  </section>;
}
