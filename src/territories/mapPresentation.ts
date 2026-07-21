import type { TerritoriesCountry } from "./types";

/**
 * Corrections visuelles et fonctionnelles propres à certaines sources SVG.
 *
 * - excludedTerritoryIds : le path est retiré du moteur ET masqué au rendu.
 *   À utiliser lorsqu'un territoire n'appartient pas réellement à la carte ou
 *   lorsque le SVG source contient un path parasite.
 * - fitExcludedTerritoryIds : le territoire reste jouable et visible, mais ne
 *   participe pas au calcul du cadrage initial. À réserver aux petits encarts
 *   ou îles très éloignées que l'on souhaite conserver ensuite.
 * - pathTransforms : permet de rapprocher un territoire sans modifier le SVG
 *   source. La transformation SVG est appliquée au path correspondant.
 */
export type TerritoriesMapPresentationProfile = {
  excludedTerritoryIds?: readonly string[];
  fitExcludedTerritoryIds?: readonly string[];
  pathTransforms?: Readonly<Record<string, string>>;
};

const EMPTY_PROFILE: TerritoriesMapPresentationProfile = {};

const MAP_PRESENTATION_PROFILES: Partial<Record<TerritoriesCountry, TerritoriesMapPresentationProfile>> = {
  AF: {
    // Le fichier africa.svg contient par erreur Kiribati. Son path traverse
    // pratiquement toute la largeur du dessin (-376 -> +601) et provoque le
    // dézoom massif visible en jeu. Kiribati n'appartient pas à l'Afrique :
    // on le retire donc à la fois du moteur et du rendu.
    excludedTerritoryIds: ["KI"],
  },
};

export function getTerritoriesMapPresentationProfile(
  country: TerritoriesCountry,
): TerritoriesMapPresentationProfile {
  return MAP_PRESENTATION_PROFILES[country] ?? EMPTY_PROFILE;
}

export function isTerritoryExcludedFromMap(
  country: TerritoriesCountry,
  territoryId: string,
): boolean {
  const excluded = getTerritoriesMapPresentationProfile(country).excludedTerritoryIds;
  return !!excluded?.includes(String(territoryId));
}
