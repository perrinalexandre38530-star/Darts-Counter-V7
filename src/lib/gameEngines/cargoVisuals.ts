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

export function cargoRecentEvents(state: CargoState, playerId?: string | null, limit = 3): CargoVisitEvent[] {
  const visits = Array.isArray(state?.visits) ? [...state.visits] : [];
  const selected = playerId ? visits.filter((visit) => String(visit.playerId) === String(playerId)) : visits;
  const events = selected.flatMap((visit) => Array.isArray(visit.events) ? visit.events : []).filter(Boolean);
  return events.slice(-Math.max(1, limit)).reverse();
}
