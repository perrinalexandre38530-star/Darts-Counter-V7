// =============================================================
// src/lib/territories/resolveTerritoryMap.ts
// Résolution countryCode -> TerritoryMap
// - Supporte alias (UK/GB -> EN, USA -> US, CHN -> CN, etc.)
// - Fallback WORLD => jamais de crash
// =============================================================

import { TERRITORY_MAPS, type TerritoryMap } from "./maps";

function normalizeCountryCode(cc?: string | null) {
  const c = (cc || "").trim().toUpperCase();
  if (!c) return "WORLD";

  // common aliases
  if (c === "UK" || c === "GB") return "EN";
  if (c === "USA") return "US";
  if (c === "CHN") return "CN";
  if (c === "AUS") return "AU";
  if (c === "JPN") return "JP";
  if (c === "RUS") return "RU";

  return c;
}

export function resolveTerritoryMap(countryCode?: string | null): TerritoryMap {
  const key = normalizeCountryCode(countryCode);
  return TERRITORY_MAPS[key] ?? TERRITORY_MAPS.WORLD;
}

export function resolveTerritoryTickerId(countryCode?: string | null): string {
  return resolveTerritoryMap(countryCode).tickerId;
}
