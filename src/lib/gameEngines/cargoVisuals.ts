import type { CargoPlayerStats, CargoState, CargoVisitEvent } from './cargoEngine';

export type CargoLoadStage = 'EMPTY' | 'LOADING' | 'PALLET_READY' | 'LOADED' | 'FULL';

export type CargoVisualSnapshot = {
  unit: 'KG' | 'COLIS';
  current: number;
  target: number;
  fillPercent: number;
  stage: CargoLoadStage;
  stageLabel: string;
  stageHint: string;
  palletsReady: number;
  parcelsReady: number;
  cartonsReady: number;
  cratesReady: number;
  contractsDone: number;
  activeSeriesCount: number;
  activeSeriesTarget: number;
  lastEventLabel: string;
};
export type CargoMissionCue = {
  label: string;
  detail: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
};

function cargoActiveContract(state: CargoState, stats?: CargoPlayerStats | null) {
  const contractId = stats?.currentSeries?.contractId;
  return contractId ? state.contracts.find((contract) => String(contract.id) === String(contractId)) || null : null;
}

export function buildCargoMissionCue(state: CargoState, stats?: CargoPlayerStats | null): CargoMissionCue {
  const config = state?.config;
  const series = stats?.currentSeries;
  const contract = cargoActiveContract(state, stats);
  const round = Math.max(1, safeNumber(state?.roundIndex, 1));

  if (!config) return { label: 'MISSION CARGO', detail: 'Prépare le prochain chargement.', tone: 'neutral' };

  if (config.variant === 'parcel_delivery') {
    if (!series) return { label: 'NOUVELLE ADRESSE', detail: 'Le premier numéro touché ouvre une adresse de livraison.', tone: 'neutral' };
    const count = safeNumber(series.count, 0);
    const next = Math.min(5, count + 1);
    const bonus = safeNumber(config.parcelBonuses?.[next], 0);
    return {
      label: `ADRESSE ${series.number} · ${count}/5`,
      detail: count >= 5 ? 'Livraison prête à être validée.' : `Prochain palier : ${next} touche${next > 1 ? 's' : ''}${bonus ? ` · +${bonus} colis bonus` : ''}.`,
      tone: count >= 4 ? 'good' : 'neutral',
    };
  }

  if (config.variant === 'exact_load') {
    const target = Math.max(1, safeNumber(config.targetWeight || config.truckCapacity, 500));
    const current = safeNumber(stats?.totalWeight, 0);
    const remaining = Math.max(0, target - current);
    if (remaining <= 0) return { label: 'CHARGE EXACTE ATTEINTE', detail: `${current}/${target} kg · évite toute surcharge.`, tone: 'good' };
    if (remaining <= Math.max(25, target * 0.1)) return { label: `PLUS QUE ${remaining} KG`, detail: 'Zone critique : privilégie une charge précise pour éviter le dépassement.', tone: 'warning' };
    return { label: `RESTE ${remaining} KG`, detail: `Objectif exact : ${target} kg.`, tone: 'neutral' };
  }

  if (config.variant === 'fragile_cargo') {
    if (series?.protected) return { label: 'CHARGE FRAGILE PROTÉGÉE', detail: 'La série active bénéficie d’une protection.', tone: 'good' };
    if (contract?.fragile) return { label: 'FRAGILE ACTIF', detail: 'Un MISS ou un mauvais segment peut casser la cargaison : reste sur la cible.', tone: 'danger' };
    return { label: 'PRIORITÉ FRAGILE', detail: 'Repère les contrats FRAGILE et sécurise les séries avant de prendre des risques.', tone: 'warning' };
  }

  if (config.variant === 'cargo_rush') {
    if (contract?.urgent) {
      const expires = Math.max(round, safeNumber(contract.expiresAtRound, round));
      const remainingRounds = Math.max(0, expires - round + 1);
      return {
        label: remainingRounds <= 1 ? 'EXPRESS · DERNIER TOUR' : `EXPRESS · ${remainingRounds} TOURS`,
        detail: `${contract.label} expire au tour ${expires} · ${series?.count || 0}/${contract.targetCount}.`,
        tone: remainingRounds <= 1 ? 'danger' : 'warning',
      };
    }
    return { label: 'CHARGE EXPRESS', detail: 'Choisis en priorité un contrat urgent avant son expiration.', tone: 'warning' };
  }

  if (config.variant === 'full_pallet') {
    const count = safeNumber(series?.count, 0);
    const min = Math.max(1, safeNumber(config.minSeries, 2));
    const max = Math.max(min, safeNumber(config.maxSeries, 5));
    if (!series) return { label: 'PALETTE COMPLÈTE', detail: `Lance une série puis pousse-la jusqu’à ${max} touches pour maximiser la palette.`, tone: 'neutral' };
    if (count < min) return { label: `PALETTE ${count}/${max}`, detail: `Encore ${min - count} touche${min - count > 1 ? 's' : ''} avant sécurisation.`, tone: 'warning' };
    return { label: `PALETTE ${count}/${max}`, detail: count >= max ? 'Palette pleine : validation maximale.' : 'Palette sécurisable : tu peux encore augmenter sa valeur.', tone: count >= max ? 'good' : 'neutral' };
  }

  if (config.variant === 'free_load') {
    if (!series) return { label: 'CHARGEMENT LIBRE', detail: `Crée une série jusqu’à ${config.maxSeries} touches sur le même objectif.`, tone: 'neutral' };
    return { label: `SÉRIE LIBRE ${series.count}/${config.maxSeries}`, detail: `${series.rawWeight || 0} kg provisoires · continue ou sécurise la série.`, tone: series.count >= config.maxSeries ? 'good' : 'neutral' };
  }

  if (config.variant === 'convoy') {
    if (config.participantMode !== 'teams') return { label: 'CONVOI', detail: 'Le mode Convoi prend tout son sens en équipes.', tone: 'warning' };
    if (series) return { label: `RELAIS CONVOI · ${series.count}/${contract?.targetCount || config.maxSeries}`, detail: 'La série peut être transmise au prochain coéquipier au changement de tour.', tone: 'neutral' };
    return { label: 'NOUVEAU RELAIS', detail: 'Démarre une série pour lancer la chaîne de chargement de l’équipe.', tone: 'neutral' };
  }

  if (config.variant === 'long_haul') {
    const stages = Array.isArray(state.routeStages) ? state.routeStages : [];
    const index = Math.max(0, Math.min(stages.length - 1, safeNumber(state.routeStage, 0)));
    const current = stages[index] || 'Itinéraire';
    const next = stages[index + 1];
    return { label: `ÉTAPE ${index + 1}/${Math.max(1, stages.length)} · ${current}`, detail: next ? `Prochaine étape : ${next}.` : 'Centre de livraison atteint.', tone: next ? 'neutral' : 'good' };
  }

  if (contract) {
    return { label: contract.urgent ? 'CONTRAT URGENT' : contract.fragile ? 'CONTRAT FRAGILE' : 'CONTRAT ACTIF', detail: `${contract.label} · ${series?.count || 0}/${contract.targetCount} · ${contract.finalWeight} kg.`, tone: contract.urgent ? 'warning' : contract.fragile ? 'danger' : 'neutral' };
  }
  if (state.contracts?.length) return { label: 'CHOISIS TON CONTRAT', detail: `${state.contracts.length} contrat${state.contracts.length > 1 ? 's' : ''} disponible${state.contracts.length > 1 ? 's' : ''} dans le manifeste.`, tone: 'neutral' };
  return { label: 'NOUVELLE SÉRIE', detail: 'Construis une série de segments identiques pour charger une palette.', tone: 'neutral' };
}


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isParcelMatch(state: CargoState) {
  return state?.config?.variant === 'parcel_delivery';
}

function loadTarget(state: CargoState) {
  if (!state) return 1;
  if (isParcelMatch(state)) return Math.max(30, safeNumber(state?.config?.rounds, 0) * 5);
  if (state?.config?.variant === 'exact_load') return Math.max(1, safeNumber(state?.config?.targetWeight || state?.config?.truckCapacity, 1000));
  return Math.max(1, safeNumber(state?.config?.truckCapacity || state?.config?.targetWeight, 1000));
}

function stageFromFill(fillPercent: number, stats: CargoPlayerStats | null | undefined): CargoLoadStage {
  const series = safeNumber(stats?.currentSeries?.count, 0);
  const pallets = safeNumber(stats?.pallets, 0);
  if (fillPercent >= 100) return 'FULL';
  if (pallets > 0 || fillPercent >= 75) return 'LOADED';
  if (series >= 3 || fillPercent >= 45) return 'PALLET_READY';
  if (fillPercent > 0 || safeNumber(stats?.hits, 0) > 0) return 'LOADING';
  return 'EMPTY';
}

function stageLabel(stage: CargoLoadStage, parcel: boolean) {
  if (parcel) {
    if (stage === 'FULL') return 'TOURNÉE BOUCLÉE';
    if (stage === 'LOADED') return 'TOURNÉE BIEN LANCÉE';
    if (stage === 'PALLET_READY') return 'LIVRAISONS EN CHAÎNE';
    if (stage === 'LOADING') return 'LIVRAISONS EN COURS';
    return 'VÉHICULE PRÊT';
  }
  if (stage === 'FULL') return 'CHARGEMENT COMPLET';
  if (stage === 'LOADED') return 'CAMION BIEN REMPLI';
  if (stage === 'PALLET_READY') return 'PALETTE PRÊTE';
  if (stage === 'LOADING') return 'CHARGEMENT EN COURS';
  return 'QUAI EN ATTENTE';
}

function stageHint(stage: CargoLoadStage, stats: CargoPlayerStats | null | undefined, parcel: boolean) {
  const pallets = safeNumber(stats?.pallets, 0);
  const contractsDone = safeNumber(stats?.completedContracts, 0);
  const series = safeNumber(stats?.currentSeries?.count, 0);
  if (parcel) {
    if (stage === 'FULL') return 'Objectif visuel atteint, la tournée est terminée.';
    if (stage === 'LOADED') return `${safeNumber(stats?.parcelsDelivered, 0)} colis déjà sécurisés.`;
    if (stage === 'PALLET_READY') return `Chaîne active : ${series}/5 colis vers un bonus.`;
    if (stage === 'LOADING') return 'Le véhicule se remplit au fil des livraisons.';
    return 'Commence une série pour lancer la tournée.';
  }
  if (stage === 'FULL') return 'Le camion est à pleine capacité.';
  if (stage === 'LOADED') return `${pallets} palette${pallets > 1 ? 's' : ''} chargée${pallets > 1 ? 's' : ''} · ${contractsDone} contrat${contractsDone > 1 ? 's' : ''} validé${contractsDone > 1 ? 's' : ''}.`;
  if (stage === 'PALLET_READY') return `Série active : ${series} impact${series > 1 ? 's' : ''} utile${series > 1 ? 's' : ''}.`;
  if (stage === 'LOADING') return 'Le chargement a démarré, continue la série.';
  return 'Aucun colis chargé pour l’instant.';
}

export function buildCargoVisualSnapshot(state: CargoState, stats?: CargoPlayerStats | null): CargoVisualSnapshot {
  const parcel = isParcelMatch(state);
  const current = parcel ? safeNumber(stats?.parcelsDelivered, 0) : safeNumber(stats?.totalWeight, 0);
  const target = loadTarget(state);
  const fillPercent = clamp((current / Math.max(1, target)) * 100, 0, 100);
  const stage = stageFromFill(fillPercent, stats);
  const lastVisit = state?.visits?.length ? state.visits[state.visits.length - 1] : null;
  const lastEventLabel = lastVisit?.events?.length ? lastVisit.events[lastVisit.events.length - 1]?.label || '' : '';
  return {
    unit: parcel ? 'COLIS' : 'KG',
    current,
    target,
    fillPercent: Math.round(fillPercent * 10) / 10,
    stage,
    stageLabel: stageLabel(stage, parcel),
    stageHint: stageHint(stage, stats, parcel),
    palletsReady: safeNumber(stats?.pallets, 0),
    parcelsReady: safeNumber(stats?.parcelsDelivered, 0),
    cartonsReady: safeNumber(stats?.cartons, 0),
    cratesReady: safeNumber(stats?.crates, 0),
    contractsDone: safeNumber(stats?.completedContracts, 0),
    activeSeriesCount: safeNumber(stats?.currentSeries?.count, 0),
    activeSeriesTarget: parcel ? 5 : Math.max(1, safeNumber(state?.config?.maxSeries, 4)),
    lastEventLabel,
  };
}


export type CargoVisitFeedback = {
  title: string;
  detail: string;
  value: string;
  tone: 'neutral' | 'good' | 'warning' | 'danger';
  icon: string;
};

export type CargoRiskCue = {
  label: string;
  detail: string;
  level: 'safe' | 'watch' | 'danger';
};

export function buildCargoLastVisitFeedback(state: CargoState, playerId?: string | null): CargoVisitFeedback {
  const visits = Array.isArray(state?.visits) ? state.visits : [];
  const visit = [...visits].reverse().find((row) => !playerId || String(row.playerId) === String(playerId));
  if (!visit) return { title: 'PRÊT À CHARGER', detail: 'Joue ta première volée : le résultat sera expliqué ici.', value: '—', tone: 'neutral', icon: '▶' };

  const events = Array.isArray(visit.events) ? visit.events : [];
  const priority = [...events].reverse().sort((a, b) => {
    const pa = ['overload','perfect_load','contract_complete','free_load_complete','parcel_delivery','series_lost','contract_expired','route_stage','convoy_handoff','dbull_validate','dbull_protect','bull_secure','series_secure','series_progress','series_start','miss','hit'].indexOf(a.type);
    const pb = ['overload','perfect_load','contract_complete','free_load_complete','parcel_delivery','series_lost','contract_expired','route_stage','convoy_handoff','dbull_validate','dbull_protect','bull_secure','series_secure','series_progress','series_start','miss','hit'].indexOf(b.type);
    return pa - pb;
  })[0] || null;

  const parcel = state?.config?.variant === 'parcel_delivery';
  const beforeScore = parcel ? safeNumber(visit.before?.parcelsDelivered, 0) : safeNumber(visit.before?.totalWeight, 0);
  const afterScore = parcel ? safeNumber(visit.after?.parcelsDelivered, 0) : safeNumber(visit.after?.totalWeight, 0);
  const delta = afterScore - beforeScore;
  const label = (priority?.label || visit.labels?.join(' / ') || 'Volée enregistrée').trim();

  if (priority?.type === 'overload') return { title: 'SURCHARGE', detail: label, value: priority.weight ? `+${priority.weight} kg refusés` : 'Charge refusée', tone: 'danger', icon: '⚠' };
  if (priority?.type === 'series_lost' || priority?.type === 'contract_expired') return { title: 'CHARGE PERDUE', detail: label, value: priority.weight ? `${priority.weight} kg perdus` : 'Série interrompue', tone: 'danger', icon: '×' };
  if (priority?.type === 'perfect_load') return { title: 'CHARGEMENT PARFAIT', detail: label, value: delta > 0 ? `+${delta} ${parcel ? 'colis' : 'kg'}` : 'Objectif atteint', tone: 'good', icon: '★' };
  if (priority?.type === 'contract_complete') return { title: 'CONTRAT TERMINÉ', detail: label, value: `+${Math.max(0, delta)} kg`, tone: 'good', icon: '▣' };
  if (priority?.type === 'parcel_delivery') return { title: 'LIVRAISON VALIDÉE', detail: label, value: `+${Math.max(0, delta)} colis`, tone: 'good', icon: '⌂' };
  if (priority?.type === 'free_load_complete') return { title: 'PALETTE CHARGÉE', detail: label, value: `+${Math.max(0, delta)} kg`, tone: 'good', icon: '▤' };
  if (priority?.type === 'convoy_handoff') return { title: 'RELAIS CONVOI', detail: label, value: 'Série transmise', tone: 'good', icon: '⇄' };
  if (priority?.type === 'route_stage') return { title: 'ÉTAPE ATTEINTE', detail: label, value: 'Itinéraire avancé', tone: 'good', icon: '➜' };
  if (priority?.type === 'dbull_protect' || priority?.type === 'bull_secure' || priority?.type === 'series_secure') return { title: 'CHARGE SÉCURISÉE', detail: label, value: delta > 0 ? `+${delta} ${parcel ? 'colis' : 'kg'}` : 'Protection active', tone: 'good', icon: '✓' };
  if (delta > 0) return { title: 'VOLÉE PRODUCTIVE', detail: label, value: `+${delta} ${parcel ? 'colis' : 'kg'}`, tone: 'good', icon: '+' };
  const misses = safeNumber(visit.after?.misses, 0) - safeNumber(visit.before?.misses, 0);
  if (misses > 0) return { title: 'AUCUNE CHARGE', detail: label, value: `${misses} MISS`, tone: 'warning', icon: '–' };
  return { title: 'VOLÉE ENREGISTRÉE', detail: label, value: '0 gain', tone: 'neutral', icon: '•' };
}

export function buildCargoRiskCue(state: CargoState, stats?: CargoPlayerStats | null): CargoRiskCue {
  const variant = state?.config?.variant;
  const series = stats?.currentSeries;
  const contract = cargoActiveContract(state, stats);
  if (variant === 'exact_load') {
    const target = Math.max(1, safeNumber(state.config.targetWeight || state.config.truckCapacity, 1000));
    const current = safeNumber(stats?.totalWeight, 0);
    const remaining = target - current;
    if (remaining <= 0) return { label: 'ZONE ROUGE', detail: 'Objectif atteint : tout poids supplémentaire peut provoquer une surcharge.', level: 'danger' };
    if (remaining <= Math.max(25, target * .1)) return { label: `PRÉCISION · ${remaining} KG`, detail: 'Finis avec une petite charge. Les gros triples deviennent risqués.', level: 'watch' };
    return { label: 'MARGE SÛRE', detail: `${remaining} kg restent disponibles avant la cible exacte.`, level: 'safe' };
  }
  if (variant === 'fragile_cargo') {
    if (series?.protected) return { label: 'PROTECTION ACTIVE', detail: 'La charge fragile active est protégée.', level: 'safe' };
    if (contract?.fragile && series) return { label: 'FRAGILE EXPOSÉ', detail: 'MISS ou mauvais segment = risque de casse de la série.', level: 'danger' };
    return { label: 'SURVEILLE LES FRAGILES', detail: 'Sécurise les contrats fragiles avant de pousser la série.', level: 'watch' };
  }
  if (variant === 'cargo_rush') {
    if (contract?.urgent) {
      const left = Math.max(0, safeNumber(contract.expiresAtRound, state.roundIndex) - safeNumber(state.roundIndex, 1) + 1);
      return { label: left <= 1 ? 'DERNIER TOUR' : `${left} TOURS RESTANTS`, detail: 'Le contrat EXPRESS expire rapidement.', level: left <= 1 ? 'danger' : 'watch' };
    }
    return { label: 'PRESSION TEMPS', detail: 'Prends d’abord les contrats URGENTS.', level: 'watch' };
  }
  if (variant === 'full_pallet') {
    const count = safeNumber(series?.count, 0);
    const min = Math.max(1, safeNumber(state.config.minSeries, 2));
    return count >= min ? { label: 'PALETTE SÉCURISABLE', detail: 'Tu peux sécuriser maintenant ou continuer pour augmenter sa valeur.', level: 'safe' } : { label: 'PALETTE NON SÉCURISÉE', detail: `Encore ${Math.max(0,min-count)} touche${Math.max(0,min-count)>1?'s':''} avant sécurisation.`, level: 'watch' };
  }
  if (variant === 'convoy') return { label: 'RELAIS D’ÉQUIPE', detail: series ? 'La série active passera au prochain coéquipier.' : 'Démarre une série pour créer un relais.', level: 'safe' };
  if (variant === 'parcel_delivery') return { label: 'CHAÎNE DE LIVRAISON', detail: series ? 'Reste sur la même adresse pour augmenter le bonus.' : 'Le premier numéro touché fixe l’adresse.', level: series ? 'safe' : 'watch' };
  if (variant === 'long_haul') return { label: 'ITINÉRAIRE', detail: 'Chaque tour fait avancer le camion vers la prochaine étape.', level: 'safe' };
  return series ? { label: 'SÉRIE ACTIVE', detail: 'Reste sur le même objectif pour construire une charge rentable.', level: 'safe' } : { label: 'AUCUNE SÉRIE', detail: 'Le premier bon impact démarre ton chargement.', level: 'watch' };
}
export function cargoRecentEvents(state: CargoState, playerId?: string | null, limit = 3): CargoVisitEvent[] {
  const visits = Array.isArray(state?.visits) ? [...state.visits] : [];
  const selected = playerId ? visits.filter((visit) => String(visit.playerId) === String(playerId)) : visits;
  const events = selected.flatMap((visit) => Array.isArray(visit.events) ? visit.events : []).filter(Boolean);
  return events.slice(-Math.max(1, limit)).reverse();
}
