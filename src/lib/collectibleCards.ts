import { loadNormalizedHistory, type NormalizedMatch } from "./statsNormalized";
import { loadDartsFirefighterStatsUnified } from "./dartsFirefighterStats";

export type CollectibleCollectionId = "awena" | "firefighter" | "loterie";
export type CollectibleCardId =
  | "awena_bronze"
  | "awena_argent"
  | "awena_platine"
  | "awena_or"
  | "awena_diamant"
  | "firefighter_kael_presentation"
  | "firefighter_kael_bronze"
  | "firefighter_kael_argent"
  | "firefighter_kael_platine"
  | "firefighter_kael_or"
  | "firefighter_kael_diamant"
  | "firefighter_malysia_presentation"
  | "firefighter_malysia_bronze"
  | "firefighter_malysia_argent"
  | "firefighter_malysia_platine"
  | "firefighter_malysia_or"
  | "firefighter_malysia_diamant"
  | "firefighter_lyna_presentation"
  | "firefighter_lyna_bronze"
  | "firefighter_lyna_argent"
  | "firefighter_lyna_platine"
  | "firefighter_lyna_or"
  | "firefighter_lyna_diamant"
  | "firefighter_braze_presentation"
  | "firefighter_braze_bronze"
  | "firefighter_braze_argent"
  | "firefighter_braze_platine"
  | "firefighter_braze_or"
  | "firefighter_braze_diamant"
  | "firefighter_aero_presentation"
  | "firefighter_aero_bronze"
  | "firefighter_aero_argent"
  | "firefighter_aero_platine"
  | "firefighter_aero_or"
  | "firefighter_aero_diamant"
  | "firefighter_zephyr_presentation"
  | "firefighter_zephyr_bronze"
  | "firefighter_zephyr_argent"
  | "firefighter_zephyr_platine"
  | "firefighter_zephyr_or"
  | "firefighter_zephyr_diamant"
  | "loterie_lucky"
  | "loterie_vega"
  | "loterie_ace"
  | "loterie_fortuna"
  | "loterie_jinx"
  | "loterie_jack"
  | "loterie_midas";

export type CollectibleMetricKey =
  | "matches"
  | "wins"
  | "modes"
  | "firefighterTacticalActions"
  | "firefighterWindMatches"
  | "firefighterWins"
  | "firefighterCriticalExtinguishes"
  | "firefighterCanadairs"
  | "firefighterMatches"
  | "firefighterKaelMatches"
  | "firefighterKaelWins"
  | "firefighterMalysiaMatches"
  | "firefighterMalysiaWins"
  | "firefighterLynaMatches"
  | "firefighterBrazeMatches"
  | "firefighterBrazeCriticalExtinguishes"
  | "firefighterAeroMatches"
  | "firefighterAeroCanadairs"
  | "loterieMatches"
  | "loterieWins"
  | "loterieCellsRevealed"
  | "loterieMultiHits"
  | "loterieCardsCompleted"
  | "loterieExpressFirstDartHits"
  | "loterieBestStreak";

export type CollectibleMetrics = Record<CollectibleMetricKey, number>;
export type LocalizedText = { fr: string; en: string; es: string };
export type CollectibleRequirement = { metric: CollectibleMetricKey; target: number; label: LocalizedText };
export type CollectibleCardDefinition = {
  id: CollectibleCardId;
  collection: CollectibleCollectionId;
  name: string;
  subtitle: LocalizedText;
  tier?: "bronze" | "argent" | "platine" | "or" | "diamant";
  stars?: number;
  accent: string;
  requirements: CollectibleRequirement[];
};
export type CollectibleUnlock = { unlockedAt: number };
export type CollectibleUnlockMap = Partial<Record<CollectibleCardId, CollectibleUnlock>>;

export const COLLECTIBLE_CARDS: CollectibleCardDefinition[] = [
  { id: "awena_bronze", collection: "awena", name: "AWENA · BRONZE", tier: "bronze", stars: 5, accent: "#c77645", subtitle: { fr: "Premiers pas", en: "First steps", es: "Primeros pasos" }, requirements: [
    { metric: "matches", target: 5, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
  ] },
  { id: "awena_argent", collection: "awena", name: "AWENA · ARGENT", tier: "argent", stars: 7, accent: "#c7ced8", subtitle: { fr: "Compétitrice régulière", en: "Regular competitor", es: "Competidora habitual" }, requirements: [
    { metric: "matches", target: 25, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 5, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
  ] },
  { id: "awena_platine", collection: "awena", name: "AWENA · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Polyvalence confirmée", en: "Proven versatility", es: "Versatilidad confirmada" }, requirements: [
    { metric: "matches", target: 75, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "modes", target: 3, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "awena_or", collection: "awena", name: "AWENA · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Joueuse accomplie", en: "Accomplished player", es: "Jugadora consolidada" }, requirements: [
    { metric: "matches", target: 150, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 50, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
    { metric: "modes", target: 5, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "awena_diamant", collection: "awena", name: "AWENA · DIAMANT", tier: "diamant", stars: 14, accent: "#d879ff", subtitle: { fr: "Collection ultime", en: "Ultimate collection", es: "Colección definitiva" }, requirements: [
    { metric: "matches", target: 300, label: { fr: "Parties terminées", en: "Completed matches", es: "Partidas terminadas" } },
    { metric: "wins", target: 100, label: { fr: "Victoires", en: "Wins", es: "Victorias" } },
    { metric: "modes", target: 5, label: { fr: "Modes différents", en: "Different modes", es: "Modos diferentes" } },
  ] },
  { id: "firefighter_lyna_presentation", collection: "firefighter", name: "LYNA", accent: "#e5b24a", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterLynaMatches", target: 1, label: { fr: "Mission terminée avec Lyna", en: "Completed mission with Lyna", es: "Misión completada con Lyna" } },
  ] },
  { id: "firefighter_lyna_bronze", collection: "firefighter", name: "LYNA · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 10, label: { fr: "Actions tactiques réussies", en: "Successful tactical actions", es: "Acciones tácticas exitosas" } },
  ] },
  { id: "firefighter_lyna_argent", collection: "firefighter", name: "LYNA · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 25, label: { fr: "Actions tactiques réussies", en: "Successful tactical actions", es: "Acciones tácticas exitosas" } },
  ] },
  { id: "firefighter_lyna_platine", collection: "firefighter", name: "LYNA · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 50, label: { fr: "Actions tactiques réussies", en: "Successful tactical actions", es: "Acciones tácticas exitosas" } },
  ] },
  { id: "firefighter_lyna_or", collection: "firefighter", name: "LYNA · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 100, label: { fr: "Actions tactiques réussies", en: "Successful tactical actions", es: "Acciones tácticas exitosas" } },
  ] },
  { id: "firefighter_lyna_diamant", collection: "firefighter", name: "LYNA · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Éclaireuse tactique", en: "Tactical scout", es: "Exploradora táctica" }, requirements: [
    { metric: "firefighterTacticalActions", target: 200, label: { fr: "Actions tactiques réussies", en: "Successful tactical actions", es: "Acciones tácticas exitosas" } },
  ] },
  { id: "firefighter_zephyr_presentation", collection: "firefighter", name: "ZEPHYR", accent: "#4bc7ff", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 1, label: { fr: "Mission avec vent actif", en: "Mission with wind enabled", es: "Misión con viento activo" } },
  ] },
  { id: "firefighter_zephyr_bronze", collection: "firefighter", name: "ZEPHYR · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 5, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_zephyr_argent", collection: "firefighter", name: "ZEPHYR · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 15, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_zephyr_platine", collection: "firefighter", name: "ZEPHYR · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 30, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_zephyr_or", collection: "firefighter", name: "ZEPHYR · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 60, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_zephyr_diamant", collection: "firefighter", name: "ZEPHYR · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Maîtresse des vents", en: "Mistress of the winds", es: "Maestra de los vientos" }, requirements: [
    { metric: "firefighterWindMatches", target: 120, label: { fr: "Parties avec vent actif", en: "Matches with wind enabled", es: "Partidas con viento activo" } },
  ] },
  { id: "firefighter_kael_presentation", collection: "firefighter", name: "KAËL", accent: "#ff563f", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelMatches", target: 1, label: { fr: "Mission terminée avec Kaël", en: "Completed mission with Kaël", es: "Misión completada con Kaël" } },
  ] },
  { id: "firefighter_kael_bronze", collection: "firefighter", name: "KAËL · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelWins", target: 3, label: { fr: "Victoires avec Kaël", en: "Wins with Kaël", es: "Victorias con Kaël" } },
  ] },
  { id: "firefighter_kael_argent", collection: "firefighter", name: "KAËL · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelWins", target: 10, label: { fr: "Victoires avec Kaël", en: "Wins with Kaël", es: "Victorias con Kaël" } },
  ] },
  { id: "firefighter_kael_platine", collection: "firefighter", name: "KAËL · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelWins", target: 25, label: { fr: "Victoires avec Kaël", en: "Wins with Kaël", es: "Victorias con Kaël" } },
  ] },
  { id: "firefighter_kael_or", collection: "firefighter", name: "KAËL · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelWins", target: 50, label: { fr: "Victoires avec Kaël", en: "Wins with Kaël", es: "Victorias con Kaël" } },
  ] },
  { id: "firefighter_kael_diamant", collection: "firefighter", name: "KAËL · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Chef d’intervention", en: "Incident commander", es: "Jefe de intervención" }, requirements: [
    { metric: "firefighterKaelWins", target: 100, label: { fr: "Victoires avec Kaël", en: "Wins with Kaël", es: "Victorias con Kaël" } },
  ] },
  { id: "firefighter_braze_presentation", collection: "firefighter", name: "BRAZE", accent: "#ff5140", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeMatches", target: 1, label: { fr: "Mission terminée avec Braze", en: "Completed mission with Braze", es: "Misión completada con Braze" } },
  ] },
  { id: "firefighter_braze_bronze", collection: "firefighter", name: "BRAZE · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeCriticalExtinguishes", target: 5, label: { fr: "Feux critiques éteints avec Braze", en: "Critical fires extinguished with Braze", es: "Incendios críticos extinguidos con Braze" } },
  ] },
  { id: "firefighter_braze_argent", collection: "firefighter", name: "BRAZE · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeCriticalExtinguishes", target: 12, label: { fr: "Feux critiques éteints avec Braze", en: "Critical fires extinguished with Braze", es: "Incendios críticos extinguidos con Braze" } },
  ] },
  { id: "firefighter_braze_platine", collection: "firefighter", name: "BRAZE · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeCriticalExtinguishes", target: 25, label: { fr: "Feux critiques éteints avec Braze", en: "Critical fires extinguished with Braze", es: "Incendios críticos extinguidos con Braze" } },
  ] },
  { id: "firefighter_braze_or", collection: "firefighter", name: "BRAZE · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeCriticalExtinguishes", target: 50, label: { fr: "Feux critiques éteints avec Braze", en: "Critical fires extinguished with Braze", es: "Incendios críticos extinguidos con Braze" } },
  ] },
  { id: "firefighter_braze_diamant", collection: "firefighter", name: "BRAZE · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Héros des flammes", en: "Hero of the flames", es: "Héroe de las llamas" }, requirements: [
    { metric: "firefighterBrazeCriticalExtinguishes", target: 100, label: { fr: "Feux critiques éteints avec Braze", en: "Critical fires extinguished with Braze", es: "Incendios críticos extinguidos con Braze" } },
  ] },
  { id: "firefighter_aero_presentation", collection: "firefighter", name: "AERO", accent: "#ff8b2e", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroMatches", target: 1, label: { fr: "Mission terminée avec Aero", en: "Completed mission with Aero", es: "Misión completada con Aero" } },
  ] },
  { id: "firefighter_aero_bronze", collection: "firefighter", name: "AERO · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroCanadairs", target: 5, label: { fr: "Interventions Canadair avec Aero", en: "Water bomber interventions with Aero", es: "Intervenciones aéreas con Aero" } },
  ] },
  { id: "firefighter_aero_argent", collection: "firefighter", name: "AERO · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroCanadairs", target: 15, label: { fr: "Interventions Canadair avec Aero", en: "Water bomber interventions with Aero", es: "Intervenciones aéreas con Aero" } },
  ] },
  { id: "firefighter_aero_platine", collection: "firefighter", name: "AERO · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroCanadairs", target: 30, label: { fr: "Interventions Canadair avec Aero", en: "Water bomber interventions with Aero", es: "Intervenciones aéreas con Aero" } },
  ] },
  { id: "firefighter_aero_or", collection: "firefighter", name: "AERO · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroCanadairs", target: 60, label: { fr: "Interventions Canadair avec Aero", en: "Water bomber interventions with Aero", es: "Intervenciones aéreas con Aero" } },
  ] },
  { id: "firefighter_aero_diamant", collection: "firefighter", name: "AERO · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Pilote Canadair", en: "Water bomber pilot", es: "Piloto de hidroavión" }, requirements: [
    { metric: "firefighterAeroCanadairs", target: 120, label: { fr: "Interventions Canadair avec Aero", en: "Water bomber interventions with Aero", es: "Intervenciones aéreas con Aero" } },
  ] },
  { id: "firefighter_malysia_presentation", collection: "firefighter", name: "MALYSIA", accent: "#ff9a34", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 1, label: { fr: "Mission terminée avec Malysia", en: "Completed mission with Malysia", es: "Misión completada con Malysia" } },
  ] },
  { id: "firefighter_malysia_bronze", collection: "firefighter", name: "MALYSIA · BRONZE", tier: "bronze", stars: 6, accent: "#c77645", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 5, label: { fr: "Missions terminées avec Malysia", en: "Completed missions with Malysia", es: "Misiones completadas con Malysia" } },
  ] },
  { id: "firefighter_malysia_argent", collection: "firefighter", name: "MALYSIA · ARGENT", tier: "argent", stars: 8, accent: "#c7ced8", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 15, label: { fr: "Missions terminées avec Malysia", en: "Completed missions with Malysia", es: "Misiones completadas con Malysia" } },
  ] },
  { id: "firefighter_malysia_platine", collection: "firefighter", name: "MALYSIA · PLATINE", tier: "platine", stars: 10, accent: "#c9e7ff", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 30, label: { fr: "Missions terminées avec Malysia", en: "Completed missions with Malysia", es: "Misiones completadas con Malysia" } },
  ] },
  { id: "firefighter_malysia_or", collection: "firefighter", name: "MALYSIA · OR", tier: "or", stars: 12, accent: "#f3c557", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 60, label: { fr: "Missions terminées avec Malysia", en: "Completed missions with Malysia", es: "Misiones completadas con Malysia" } },
  ] },
  { id: "firefighter_malysia_diamant", collection: "firefighter", name: "MALYSIA · DIAMANT", tier: "diamant", stars: 14, accent: "#7ec5ff", subtitle: { fr: "Spécialiste feux de forêt", en: "Wildfire specialist", es: "Especialista en incendios forestales" }, requirements: [
    { metric: "firefighterMalysiaMatches", target: 120, label: { fr: "Missions terminées avec Malysia", en: "Completed missions with Malysia", es: "Misiones completadas con Malysia" } },
  ] },
  { id: "loterie_lucky", collection: "loterie", name: "LUCKY", accent: "#65d66f", subtitle: { fr: "Le porte-bonheur", en: "The lucky charm", es: "El amuleto de la suerte" }, requirements: [
    { metric: "loterieMatches", target: 3, label: { fr: "Parties LOTERIE terminées", en: "Completed LOTTERY matches", es: "Partidas de LOTERÍA terminadas" } },
  ] },
  { id: "loterie_vega", collection: "loterie", name: "VEGA", accent: "#ff4a45", subtitle: { fr: "Reine du jackpot", en: "Jackpot queen", es: "Reina del jackpot" }, requirements: [
    { metric: "loterieWins", target: 3, label: { fr: "Victoires en LOTERIE", en: "LOTTERY wins", es: "Victorias en LOTERÍA" } },
  ] },
  { id: "loterie_ace", collection: "loterie", name: "ACE", accent: "#f3c557", subtitle: { fr: "As de la précision", en: "Ace of precision", es: "As de la precisión" }, requirements: [
    { metric: "loterieExpressFirstDartHits", target: 15, label: { fr: "Cibles EXPRESS validées au 1er dart", en: "EXPRESS targets hit on dart 1", es: "Objetivos EXPRESS acertados al 1.er dardo" } },
  ] },
  { id: "loterie_fortuna", collection: "loterie", name: "FORTUNA", accent: "#bc78ff", subtitle: { fr: "Maîtresse du destin", en: "Mistress of fate", es: "Maestra del destino" }, requirements: [
    { metric: "loterieBestStreak", target: 5, label: { fr: "Série de 5 tours gagnants", en: "5 successful turns in a row", es: "Racha de 5 turnos acertados" } },
  ] },
  { id: "loterie_jinx", collection: "loterie", name: "JINX", accent: "#ff4fc8", subtitle: { fr: "Chaos maîtrisé", en: "Controlled chaos", es: "Caos controlado" }, requirements: [
    { metric: "loterieMultiHits", target: 10, label: { fr: "Multi-hits réalisés", en: "Multi-hits achieved", es: "Multi-hits realizados" } },
  ] },
  { id: "loterie_jack", collection: "loterie", name: "JACK", accent: "#d94b43", subtitle: { fr: "Maître du tirage", en: "Draw master", es: "Maestro del sorteo" }, requirements: [
    { metric: "loterieCardsCompleted", target: 5, label: { fr: "Cartons LOTERIE complétés", en: "LOTTERY cards completed", es: "Cartones de LOTERÍA completados" } },
  ] },
  { id: "loterie_midas", collection: "loterie", name: "MIDAS", accent: "#ffd35a", subtitle: { fr: "Roi de la loterie", en: "King of the lottery", es: "Rey de la lotería" }, requirements: [
    { metric: "loterieWins", target: 10, label: { fr: "Victoires en LOTERIE", en: "LOTTERY wins", es: "Victorias en LOTERÍA" } },
    { metric: "loterieCellsRevealed", target: 250, label: { fr: "Cases révélées en LOTERIE", en: "LOTTERY cells revealed", es: "Casillas reveladas en LOTERÍA" } },
  ] },

];

function emptyMetrics(): CollectibleMetrics {
  return {
    matches: 0, wins: 0, modes: 0,
    firefighterTacticalActions: 0, firefighterWindMatches: 0, firefighterWins: 0,
    firefighterCriticalExtinguishes: 0, firefighterCanadairs: 0, firefighterMatches: 0,
    firefighterKaelMatches: 0, firefighterKaelWins: 0, firefighterMalysiaMatches: 0,
    firefighterMalysiaWins: 0, firefighterLynaMatches: 0, firefighterBrazeMatches: 0,
    firefighterBrazeCriticalExtinguishes: 0, firefighterAeroMatches: 0, firefighterAeroCanadairs: 0,
    loterieMatches: 0, loterieWins: 0, loterieCellsRevealed: 0, loterieMultiHits: 0,
    loterieCardsCompleted: 0, loterieExpressFirstDartHits: 0, loterieBestStreak: 0,
  };
}

function sameProfile(value: unknown, profileId: string): boolean {
  return String(value ?? "").trim() === profileId;
}

function normalizedMatchIsFinished(match: NormalizedMatch): boolean {
  const raw: any = match.raw || {};
  const status = String(raw?.status || raw?.summary?.status || raw?.payload?.status || "").toLowerCase();
  if (status) return status === "finished" || status === "complete" || status === "completed";
  if (raw?.finished === false || raw?.summary?.finished === false || raw?.payload?.finished === false) return false;
  if (raw?.finished === true || raw?.summary?.finished === true || raw?.payload?.finished === true) return true;
  if (raw?.finishedAt || raw?.endedAt || raw?.completedAt || raw?.summary?.finishedAt || raw?.payload?.finishedAt) return true;
  return true;
}

function collectibleModeKey(match: NormalizedMatch): string {
  const raw: any = match.raw || {};
  const normalized = String(match?.mode || "").trim().toLowerCase();
  const fallback = String(
    raw?.game?.mode || raw?.mode || raw?.kind || raw?.summary?.mode || raw?.summary?.kind || raw?.payload?.mode || raw?.payload?.kind || ""
  ).trim().toLowerCase();
  const mode = normalized && normalized !== "unknown" ? normalized : fallback;
  if (!mode || mode === "unknown" || mode.includes("training") || mode.includes("entrainement") || mode.includes("entraînement")) return "";
  return mode.replace(/\s+/g, "_");
}

function normalizedMatchHasProfile(match: NormalizedMatch, profileId: string): boolean {
  if ((match.players || []).some((player) => sameProfile(player.playerId, profileId) || sameProfile(player.profileId, profileId))) return true;
  const raw: any = match.raw || {};
  const candidateLists = [raw?.players, raw?.summary?.players, raw?.summary?.perPlayer, raw?.payload?.players, raw?.payload?.stats?.players];
  return candidateLists.some((list) => Array.isArray(list) && list.some((player: any) => sameProfile(player?.id ?? player?.playerId ?? player?.profileId, profileId)));
}

function normalizedMatchWonByProfile(match: NormalizedMatch, profileId: string): boolean {
  if ((match.winnerIds || []).some((id) => sameProfile(id, profileId))) return true;
  const raw: any = match.raw || {};
  const candidateLists = [raw?.players, raw?.summary?.players, raw?.summary?.perPlayer, raw?.payload?.players, raw?.payload?.stats?.players];
  for (const list of candidateLists) {
    if (!Array.isArray(list)) continue;
    const player = list.find((entry: any) => sameProfile(entry?.id ?? entry?.playerId ?? entry?.profileId, profileId));
    if (player && (player?.win === true || player?.winner === true || (Number(player?.rank) === 1 && raw?.tied !== true))) return true;
  }
  return false;
}

function recordPlayer(row: any, profileId: string): any | null {
  const players = Array.isArray(row?.players) ? row.players : [];
  return players.find((player: any) => sameProfile(player?.id ?? player?.playerId ?? player?.profileId, profileId)) || null;
}

function loteriePlayerForMatch(match: NormalizedMatch, profileId: string): any | null {
  const raw: any = match.raw || {};
  const lists = [
    raw?.players,
    raw?.summary?.players,
    raw?.summary?.perPlayer,
    raw?.payload?.players,
    raw?.payload?.stats?.players,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const player = list.find((entry: any) => sameProfile(entry?.id ?? entry?.playerId ?? entry?.profileId, profileId));
    if (player) return player;
  }
  return null;
}

function collectibleNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function countCriticalExtinguishes(row: any, profileId: string): number {
  const visits = Array.isArray(row?.visits) ? row.visits : [];
  const finalTerritories = Array.isArray(row?.finalTerritories) ? row.finalTerritories : [];
  const criticalIds = new Set(finalTerritories.filter((territory: any) => territory?.critical).map((territory: any) => String(territory?.id || "")));
  let count = 0;
  for (const visit of visits) {
    if (!sameProfile(visit?.playerId, profileId)) continue;
    for (const event of Array.isArray(visit?.events) ? visit.events : []) {
      if (String(event?.type || "") !== "extinguished") continue;
      const territoryId = String(event?.territoryId || "");
      const explicitlyCritical = String(event?.label || "").toUpperCase().includes("ZONE CRITIQUE");
      if ((territoryId && criticalIds.has(territoryId)) || explicitlyCritical) count += 1;
    }
  }
  return count;
}

function countCanadairs(row: any, profileId: string): number {
  const visits = Array.isArray(row?.visits) ? row.visits : [];
  return visits.reduce((sum: number, visit: any) => {
    if (!sameProfile(visit?.playerId, profileId)) return sum;
    return sum + (Array.isArray(visit?.events) ? visit.events.filter((event: any) => String(event?.type || "") === "canadair").length : 0);
  }, 0);
}

function rowPlayerMatchesCharacter(player: any, characterId: string): boolean {
  const target = String(characterId || "").trim().toLowerCase();
  if (!target) return false;
  const rawId = String(player?.characterId || player?.officialCharacterId || player?.botCharacterId || "").trim().toLowerCase();
  if (rawId === target) return true;
  const playerId = String(player?.id || player?.playerId || player?.profileId || "").trim().toLowerCase();
  if (playerId === `bot_ff_${target}`) return true;
  const name = String(player?.name || "").trim().toLowerCase();
  return name === target || name.normalize('NFD').replace(/[̀-ͯ]/g, '') === target.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function rowPlayersForCharacter(row: any, characterId: string): any[] {
  const lists = [row?.players, row?.summary?.players, row?.summary?.perPlayer, row?.payload?.players, row?.payload?.stats?.players];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const found = list.filter((player: any) => rowPlayerMatchesCharacter(player, characterId));
    if (found.length) return found;
  }
  return [];
}

export async function computeCollectibleMetrics(profileIdInput: string): Promise<CollectibleMetrics> {
  const profileId = String(profileIdInput || "").trim();
  const metrics = emptyMetrics();
  if (!profileId) return metrics;

  const [history, firefighter] = await Promise.all([
    loadNormalizedHistory().catch(() => [] as NormalizedMatch[]),
    loadDartsFirefighterStatsUnified().catch(() => [] as any[]),
  ]);

  const modes = new Set<string>();
  for (const match of history || []) {
    if (!normalizedMatchIsFinished(match) || !normalizedMatchHasProfile(match, profileId)) continue;
    const mode = collectibleModeKey(match);
    if (!mode) continue;
    metrics.matches += 1;
    modes.add(mode);
    const won = normalizedMatchWonByProfile(match, profileId);
    if (won) metrics.wins += 1;

    if (mode.includes("loterie") || mode.includes("lottery")) {
      metrics.loterieMatches += 1;
      if (won) metrics.loterieWins += 1;
      const player = loteriePlayerForMatch(match, profileId);
      if (player) {
        metrics.loterieCellsRevealed += collectibleNumber(player?.cellsRevealed ?? player?.lo_cells ?? player?.score ?? player?.points);
        metrics.loterieMultiHits += collectibleNumber(player?.multiHits ?? player?.lo_multi);
        metrics.loterieCardsCompleted += collectibleNumber(player?.cardsCompleted ?? player?.lo_done);
        metrics.loterieExpressFirstDartHits += collectibleNumber(player?.expressSuccessOnDart1);
        metrics.loterieBestStreak = Math.max(metrics.loterieBestStreak, collectibleNumber(player?.bestStreak ?? player?.lo_str));
      }
    }
  }
  metrics.modes = modes.size;

  for (const row of firefighter || []) {
    const player = recordPlayer(row, profileId);
    if (!player) continue;
    metrics.firefighterTacticalActions += Number(player?.protectionsPlaced || 0) + Number(player?.propagationBlocked || 0);
    if ((row?.payload?.config?.windEnabled ?? row?.summary?.windEnabled ?? true) !== false) metrics.firefighterWindMatches += 1;
    metrics.firefighterMatches += 1;
    if (row?.won === true || player?.win === true || player?.winner === true) metrics.firefighterWins += 1;
    metrics.firefighterCriticalExtinguishes += countCriticalExtinguishes(row, profileId);
    metrics.firefighterCanadairs += countCanadairs(row, profileId);

    const kaelPlayers = rowPlayersForCharacter(row, "kael");
    if (kaelPlayers.length) {
      metrics.firefighterKaelMatches += 1;
      if (kaelPlayers.some((entry: any) => entry?.win === true || entry?.winner === true || row?.won === true)) {
        metrics.firefighterKaelWins += 1;
      }
    }

    const malysiaPlayers = rowPlayersForCharacter(row, "malysia");
    if (malysiaPlayers.length) {
      metrics.firefighterMalysiaMatches += 1;
      if (malysiaPlayers.some((entry: any) => entry?.win === true || entry?.winner === true || row?.won === true)) {
        metrics.firefighterMalysiaWins += 1;
      }
    }

    const lynaPlayers = rowPlayersForCharacter(row, "lyna");
    if (lynaPlayers.length) {
      metrics.firefighterLynaMatches += 1;
    }

    const brazePlayers = rowPlayersForCharacter(row, "braze");
    if (brazePlayers.length) {
      metrics.firefighterBrazeMatches += 1;
      metrics.firefighterBrazeCriticalExtinguishes += countCriticalExtinguishes(row, profileId);
    }

    const aeroPlayers = rowPlayersForCharacter(row, "aero");
    if (aeroPlayers.length) {
      metrics.firefighterAeroMatches += 1;
      metrics.firefighterAeroCanadairs += countCanadairs(row, profileId);
    }
  }

  return metrics;
}

export function cardRequirementProgress(card: CollectibleCardDefinition, metrics: CollectibleMetrics): number {
  if (!card.requirements.length) return 1;
  const ratios = card.requirements.map((req) => Math.max(0, Math.min(1, Number(metrics[req.metric] || 0) / Math.max(1, req.target))));
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

export function isCollectibleCardEligible(card: CollectibleCardDefinition, metrics: CollectibleMetrics): boolean {
  return card.requirements.every((req) => Number(metrics[req.metric] || 0) >= req.target);
}

export function reconcileCollectibleUnlocks(previous: CollectibleUnlockMap | null | undefined, metrics: CollectibleMetrics, now = Date.now()): { unlocks: CollectibleUnlockMap; newlyUnlocked: CollectibleCardId[] } {
  const unlocks: CollectibleUnlockMap = { ...(previous || {}) };
  const newlyUnlocked: CollectibleCardId[] = [];
  for (const card of COLLECTIBLE_CARDS) {
    if (unlocks[card.id] || !isCollectibleCardEligible(card, metrics)) continue;
    unlocks[card.id] = { unlockedAt: now };
    newlyUnlocked.push(card.id);
  }
  return { unlocks, newlyUnlocked };
}
