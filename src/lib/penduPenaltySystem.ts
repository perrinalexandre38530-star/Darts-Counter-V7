// @ts-nocheck
// =============================================================
// PENDU — PENALTY SYSTEM V14
// CLASSIQUE / VICIEUX / ROULETTE / SABOTAGE / CHAOS
// Une seule malédiction majeure active à la fois.
// =============================================================

import type { GameDart } from "./types-game";

export type PenduPenaltyMode = "classic" | "vicious" | "roulette" | "sabotage" | "chaos";
export type PenduPenaltyRarity = "common" | "rare" | "epic" | "bonus";

export type PenduPenaltyCard = {
  id:
    | "warning"
    | "hard_hit"
    | "one_dart"
    | "two_darts"
    | "require_double"
    | "require_triple"
    | "ban_20"
    | "ban_bull"
    | "ban_left"
    | "ban_right"
    | "require_top"
    | "require_bottom"
    | "color_red"
    | "color_green"
    | "color_black"
    | "color_white"
    | "cursed_sector"
    | "two_hits"
    | "sudden_death"
    | "shield"
    | "heal"
    | "joker";
  label: string;
  icon: string;
  detail: string;
  rarity: PenduPenaltyRarity;
  forbiddenSector?: number;
};

export type PenduPenaltyPlayerState = {
  curse: PenduPenaltyCard | null;
  shield: number;
  joker: number;
  sabotageTokens: number;
  lastDraw: PenduPenaltyCard | null;
  lastBodyEffect: PenduPenaltyCard | null;
};

const BOARD_CW = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

export function blankPenduPenaltyState(): PenduPenaltyPlayerState {
  return { curse: null, shield: 0, joker: 0, sabotageTokens: 0, lastDraw: null, lastBodyEffect: null };
}

export function normalizePenduPenaltyMode(value: any): PenduPenaltyMode {
  return value === "vicious" || value === "roulette" || value === "sabotage" || value === "chaos" ? value : "classic";
}

export function penduPenaltyModeLabel(mode: PenduPenaltyMode) {
  if (mode === "vicious") return "PENDU VICIEUX";
  if (mode === "roulette") return "ROULETTE";
  if (mode === "sabotage") return "SABOTAGE";
  if (mode === "chaos") return "CHAOS";
  return "CLASSIQUE";
}

export function penduPenaltyModeIcon(mode: PenduPenaltyMode) {
  if (mode === "vicious") return "😈";
  if (mode === "roulette") return "🎰";
  if (mode === "sabotage") return "💣";
  if (mode === "chaos") return "🔥";
  return "🪢";
}

function card(
  id: PenduPenaltyCard["id"],
  label: string,
  icon: string,
  detail: string,
  rarity: PenduPenaltyRarity,
  extra: Partial<PenduPenaltyCard> = {},
): PenduPenaltyCard {
  return { id, label, icon, detail, rarity, ...extra };
}

export function viciousBodyEffect(errors: number, partsToLose: number): PenduPenaltyCard | null {
  const e = Math.max(0, Number(errors || 0));
  const max = Math.max(6, Number(partsToLose || 6));
  if (e <= 0 || e >= max) return null;
  if (max >= 8) {
    if (e === 1) return card("warning", "CORDE", "🪢", "Premier avertissement : aucune contrainte supplémentaire.", "common");
    if (e === 2) return card("two_darts", "TÊTE", "🙂", "Prochain objectif : seulement 2 fléchettes.", "common");
    if (e === 3) return card("two_hits", "CORPS", "🧍", "Prochain objectif : au moins 2 fléchettes doivent toucher la cible.", "rare");
    if (e === 4) return card("ban_left", "BRAS GAUCHE", "💪", "Moitié gauche interdite au prochain tour.", "rare");
    if (e === 5) return card("ban_right", "BRAS DROIT", "💪", "Moitié droite interdite au prochain tour.", "rare");
    if (e === 6) return card("require_double", "JAMBE GAUCHE", "🦵", "Le prochain objectif doit inclure au moins un Double.", "epic");
    if (e === 7) return card("require_triple", "JAMBE DROITE", "🦵", "Le prochain objectif doit inclure au moins un Triple.", "epic");
  }
  if (e === 1) return card("warning", "CORDE", "🪢", "Premier avertissement : aucune contrainte supplémentaire.", "common");
  if (e === 2) return card("two_darts", "TÊTE", "🙂", "Prochain objectif : seulement 2 fléchettes.", "common");
  if (e === 3) return card("ban_20", "CORPS", "🧍", "Le secteur 20 est interdit au prochain tour.", "rare");
  if (e === 4) return card("ban_left", "BRAS", "💪", "Moitié gauche interdite au prochain tour.", "rare");
  if (e === 5) return card("require_double", "JAMBE", "🦵", "Le prochain objectif doit inclure au moins un Double.", "epic");
  return null;
}

export function rouletteDeck(): PenduPenaltyCard[] {
  return [
    card("two_darts", "DEUX FLÉCHETTES", "✌️", "Seulement 2 fléchettes au prochain objectif.", "common"),
    card("ban_20", "20 INTERDIT", "🚫", "Tout impact dans le secteur 20 fait échouer la tentative.", "common"),
    card("ban_bull", "BULL INTERDIT", "🚫", "Bull 25 et DBull 50 sont interdits au prochain objectif.", "common"),
    card("cursed_sector", "SECTEUR MAUDIT", "🎲", "Un secteur aléatoire devient interdit au prochain objectif.", "common"),
    card("ban_left", "GAUCHE INTERDITE", "⬅️", "Aucun impact autorisé dans la moitié gauche.", "common"),
    card("ban_right", "DROITE INTERDITE", "➡️", "Aucun impact autorisé dans la moitié droite.", "common"),
    card("require_top", "HAUT IMPOSÉ", "⬆️", "Au moins une fléchette doit toucher la moitié haute.", "common"),
    card("require_bottom", "BAS IMPOSÉ", "⬇️", "Au moins une fléchette doit toucher la moitié basse.", "common"),
    card("color_red", "ROUGE IMPOSÉ", "🔴", "Au moins une fléchette dans une zone rouge.", "rare"),
    card("color_green", "VERT IMPOSÉ", "🟢", "Au moins une fléchette dans une zone verte.", "rare"),
    card("color_black", "NOIR IMPOSÉ", "⚫", "Au moins une fléchette dans une zone noire.", "rare"),
    card("color_white", "BLANC IMPOSÉ", "⚪", "Au moins une fléchette dans une zone blanche.", "rare"),
    card("require_double", "DOUBLE OBLIGATOIRE", "⭕", "Le prochain objectif doit inclure au moins un Double.", "rare"),
    card("two_hits", "DEUX TOUCHES", "🎯", "Au moins 2 fléchettes doivent toucher la cible.", "rare"),
    card("one_dart", "UNE SEULE FLÉCHETTE", "☝️", "Une seule fléchette pour réussir le prochain objectif.", "epic"),
    card("require_triple", "TRIPLE OBLIGATOIRE", "⚡", "Le prochain objectif doit inclure au moins un Triple.", "epic"),
    card("sudden_death", "MORT SUBITE", "💣", "Si le prochain objectif est raté, la pénalité vaut 2 morceaux.", "epic"),
    card("hard_hit", "COUP DUR", "☠️", "La pénalité actuelle vaut immédiatement 2 morceaux.", "epic"),
    card("shield", "BOUCLIER", "🛡️", "La prochaine erreur ne dessine rien.", "bonus"),
    card("heal", "RÉMISSION", "❤️", "Retire immédiatement un morceau du pendu.", "bonus"),
    card("joker", "JOKER", "🎁", "Conservé : il annulera automatiquement une erreur fatale.", "bonus"),
  ];
}

export function drawRoulettePenalty(rng = Math.random): PenduPenaltyCard {
  const deck = rouletteDeck();
  const roll = rng();
  let pool: PenduPenaltyCard[];
  if (roll < .58) pool = deck.filter((c) => c.rarity === "common");
  else if (roll < .84) pool = deck.filter((c) => c.rarity === "rare");
  else if (roll < .95) pool = deck.filter((c) => c.rarity === "epic");
  else pool = deck.filter((c) => c.rarity === "bonus");
  const chosen = pool[Math.floor(rng() * pool.length)] || deck[0];
  if (chosen.id === "cursed_sector") return { ...chosen, forbiddenSector: 1 + Math.floor(rng() * 20) };
  return { ...chosen };
}

export function drawSabotagePenalty(rng = Math.random): PenduPenaltyCard {
  const pool = [
    card("two_darts", "2 DARTS", "✌️", "Seulement 2 fléchettes au prochain objectif.", "common"),
    card("ban_20", "20 INTERDIT", "🚫", "Le secteur 20 devient interdit pour un tour.", "common"),
    card("ban_bull", "BULL INTERDIT", "🚫", "BULL et DBULL interdits pour un tour.", "common"),
    card("ban_left", "GAUCHE INTERDITE", "⬅️", "Moitié gauche interdite pour un tour.", "rare"),
    card("ban_right", "DROITE INTERDITE", "➡️", "Moitié droite interdite pour un tour.", "rare"),
    card("require_double", "DOUBLE OBLIGATOIRE", "⭕", "Doit inclure un Double.", "rare"),
    card("color_red", "ROUGE IMPOSÉ", "🔴", "Doit toucher au moins une zone rouge.", "rare"),
    card("color_green", "VERT IMPOSÉ", "🟢", "Doit toucher au moins une zone verte.", "rare"),
  ];
  return { ...pool[Math.floor(rng() * pool.length)]! };
}

export function penaltyMaxDarts(penalty?: PenduPenaltyPlayerState | null) {
  const id = penalty?.curse?.id;
  if (id === "one_dart") return 1;
  if (id === "two_darts") return 2;
  return 3;
}

function sectorColor(d: GameDart): "red" | "green" | "black" | "white" | null {
  if (!d || d.bed === "MISS") return null;
  if (d.bed === "IB") return "red";
  if (d.bed === "OB") return "green";
  const idx = BOARD_CW.indexOf(Number(d.number || 0));
  if (idx < 0) return null;
  if (d.bed === "D" || d.bed === "T") return idx % 2 === 0 ? "red" : "green";
  return idx % 2 === 0 ? "black" : "white";
}

function zone(d: GameDart) {
  const idx = BOARD_CW.indexOf(Number(d?.number || 0));
  if (idx < 0) return { left:false,right:false,top:false,bottom:false };
  const angle = (-90 + idx * 18) * Math.PI / 180;
  const x = Math.cos(angle), y = Math.sin(angle);
  return { left:x < -.05, right:x > .05, top:y < -.05, bottom:y > .05 };
}

export function isPenduPenaltyConstraintSatisfied(
  penalty: PenduPenaltyPlayerState | null | undefined,
  dartsRaw: GameDart[],
): boolean {
  const curse = penalty?.curse;
  if (!curse || curse.id === "warning" || curse.id === "sudden_death") return true;
  const maxDarts = penaltyMaxDarts(penalty);
  const darts = (dartsRaw || []).slice(0, 3);
  if (darts.length > maxDarts) return false;
  const hits = darts.filter((d) => d && d.bed !== "MISS");

  if (curse.id === "require_double") return hits.some((d) => d.bed === "D");
  if (curse.id === "require_triple") return hits.some((d) => d.bed === "T");
  if (curse.id === "ban_20") return !hits.some((d) => Number(d.number || 0) === 20);
  if (curse.id === "ban_bull") return !hits.some((d) => d.bed === "OB" || d.bed === "IB");
  if (curse.id === "ban_left") return !hits.some((d) => zone(d).left);
  if (curse.id === "ban_right") return !hits.some((d) => zone(d).right);
  if (curse.id === "require_top") return hits.some((d) => zone(d).top);
  if (curse.id === "require_bottom") return hits.some((d) => zone(d).bottom);
  if (curse.id === "color_red") return hits.some((d) => sectorColor(d) === "red");
  if (curse.id === "color_green") return hits.some((d) => sectorColor(d) === "green");
  if (curse.id === "color_black") return hits.some((d) => sectorColor(d) === "black");
  if (curse.id === "color_white") return hits.some((d) => sectorColor(d) === "white");
  if (curse.id === "cursed_sector") return !hits.some((d) => Number(d.number || 0) === Number(curse.forbiddenSector || 0));
  if (curse.id === "two_hits") return hits.length >= 2;
  return true;
}

export function penduPenaltyConstraintLabel(penalty?: PenduPenaltyPlayerState | null) {
  const c = penalty?.curse;
  if (!c) return "AUCUNE MALÉDICTION";
  if (c.id === "cursed_sector") return `${c.icon} SECTEUR ${c.forbiddenSector} INTERDIT`;
  return `${c.icon} ${c.label}`;
}

export function penduPenaltyConstraintDetail(penalty?: PenduPenaltyPlayerState | null) {
  return penalty?.curse?.detail || "Aucune contrainte supplémentaire pour cette tentative.";
}

export function penduPenaltyRarityLabel(rarity?: PenduPenaltyRarity) {
  if (rarity === "epic") return "ÉPIQUE";
  if (rarity === "rare") return "RARE";
  if (rarity === "bonus") return "BONUS";
  return "COMMUNE";
}
