import { History } from "./history";
import { loadNormalizedHistory, type NormalizedMatch } from "./statsNormalized";
import { loadDartsFirefighterStatsUnified } from "./dartsFirefighterStats";
import { computeKillerStatsAggForProfile } from "./statsKiller";

export type CollectibleCollectionId = "awena" | "firefighter" | "loterie" | "killer" | "legends";
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
  | "loterie_midas"
  | "killer_morrow"
  | "killer_velvet"
  | "killer_brutus"
  | "killer_djuno"
  | "killer_thorn"
  | "killer_miasma"
  | "killer_raze"
  | "killer_noz"
  | "killer_zeno"
  | "killer_brat"
  | "killer_viper"
  | "killer_west"
  | "killer_batuga"
  | "killer_skull"
  | "legend_the_bullet"
  | "legend_mcdanger"
  | "legend_one_dart"
  | "legend_the_giant"
  | "legend_smudger"
  | "legend_prince_of_style"
  | "legend_the_ferret"
  | "legend_wolfie"
  | "legend_jaws"
  | "legend_the_power"
  | "legend_beau_n_arrow"
  | "legend_the_count"
  | "legend_the_dreammaker"
  | "legend_the_crafty_cockney"
  | "legend_the_nuke"
  | "legend_the_iceman"
  | "legend_chizzy"
  | "legend_the_voltage"
  | "legend_the_flying_scotsman"
  | "legend_barney"
  | "legend_cool_hand_luke"
  | "legend_bully_boy"
  | "legend_the_asp"
  | "legend_the_fella"
  | "legend_the_bronzed_adonis"
  | "legend_marathon_man"
  | "legend_john_boy"
  | "legend_the_deadly_boomerang"
  | "legend_scotty2hotty"
  | "legend_scotty_dog"
  | "legend_webby"
  | "legend_the_lipstick"
  | "legend_the_cobra"
  | "legend_the_nodor"
  | "legend_the_wizard"
  | "legend_the_machine"
  | "legend_snakebite"
  | "legend_mighty_mike"
  | "legend_jackpot"
  | "legend_the_viking"
  | "legend_hawaii_501"
  | "legend_the_bull"
  | "legend_the_menace"
  | "legend_the_artist_a"
  | "legend_prince_of_wales_a"
  | "legend_the_artist_b"
  | "legend_silverback"
  | "legend_aubergenius"
  | "legend_rocky"
  | "legend_queen_of_the_palace"
  | "legend_prince_of_wales_b"
  | "legend_the_wall"
  | "legend_belli"
  | "legend_the_rockstar"
  | "legend_the_ton_machine"
  | "legend_flawlas"
  | "legend_old_stoneface"
  | "legend_the_heat"
  | "legend_mr_glitter"
  | "legend_the_african_warrior"
  | "legend_the_hurricane"
  | "legend_the_gambler"
  | "legend_hollywood"
  | "legend_the_gentle"
  | "legend_razmatazz"
  | "legend_the_french_touch"
  | "legend_the_limestone_cowboy"
  | "legend_frosty_the_throwman"
  | "legend_the_polish_eagle"
  | "legend_the_special_one"
  | "legend_the_dutch_destroyer"
  | "legend_big_cliff"
  | "legend_the_magpie"
  | "legend_braziliant"
  | "legend_the_ninja"
  | "legend_goldfinger"
  | "legend_big_rig"
  | "legend_the_blade"
  | "legend_demolition_man"
  | "legend_the_gunner"
  | "legend_superchin"
  | "legend_heavy_metal";

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
  | "loterieBestStreak"
  | "killerMatches"
  | "killerWins"
  | "killerKills"
  | "killerHits"
  | "killerAutoHits"
  | "killerPodiums"
  | "killerFirsts"
  | "killerPrecision"
  | "x01Matches"
  | "x01Wins"
  | "cricketMatches"
  | "cricketWins"
  | "killerHistoryMatches"
  | "killerHistoryWins"
  | "shanghaiMatches"
  | "shanghaiWins"
  | "territoriesMatches"
  | "territoriesWins"
  | "fiftyOneByFiveMatches"
  | "fiftyOneByFiveWins"
  | "looperMatches"
  | "looperWins"
  | "callThreeMatches"
  | "callThreeWins"
  | "steeplechaseMatches"
  | "steeplechaseWins"
  | "dartsFirefighterHistoryMatches"
  | "dartsFirefighterHistoryWins"
  | "dartsPokerMatches"
  | "dartsPokerWins"
  | "oceanControlMatches"
  | "oceanControlWins"
  | "cargoMatches"
  | "cargoWins"
  | "golfMatches"
  | "golfWins"
  | "batardMatches"
  | "batardWins"
  | "battleRoyaleMatches"
  | "battleRoyaleWins"
  | "fiveLivesMatches"
  | "fiveLivesWins"
  | "scramMatches"
  | "scramWins"
  | "warfareMatches"
  | "warfareWins"
  | "clockMatches"
  | "clockWins";

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
  image?: string;
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

  { id: "killer_morrow", collection: "killer", name: "MORROW", stars: 5, accent: "#e54848", subtitle: { fr: "Seigneur de la cité rouge", en: "Lord of the red city", es: "Señor de la ciudad roja" }, requirements: [
    { metric: "killerMatches", target: 1, label: { fr: "Partie KILLER terminée", en: "Completed KILLER match", es: "Partida KILLER completada" } },
  ] },
  { id: "killer_velvet", collection: "killer", name: "VELVET", stars: 4.5, accent: "#44d18f", subtitle: { fr: "Enchanteresse des lianes", en: "Vine enchantress", es: "Hechicera de las lianas" }, requirements: [
    { metric: "killerWins", target: 2, label: { fr: "Victoires en KILLER", en: "KILLER wins", es: "Victorias en KILLER" } },
  ] },
  { id: "killer_brutus", collection: "killer", name: "BRUTUS", stars: 4.5, accent: "#ff7f45", subtitle: { fr: "Colosse des forges", en: "Forge colossus", es: "Coloso de las forjas" }, requirements: [
    { metric: "killerKills", target: 10, label: { fr: "Kills réalisés en KILLER", en: "KILLER kills", es: "Kills realizados en KILLER" } },
  ] },
  { id: "killer_djuno", collection: "killer", name: "DJUNO", stars: 4, accent: "#ff4fc8", subtitle: { fr: "Joker néon du chaos", en: "Neon joker of chaos", es: "Bufón neón del caos" }, requirements: [
    { metric: "killerHits", target: 15, label: { fr: "Hits enregistrés en KILLER", en: "KILLER hits", es: "Impactos en KILLER" } },
  ] },
  { id: "killer_thorn", collection: "killer", name: "THORN", stars: 4, accent: "#7ecf6e", subtitle: { fr: "Traqueur des marais", en: "Marsh tracker", es: "Rastreador de los pantanos" }, requirements: [
    { metric: "killerMatches", target: 5, label: { fr: "Parties KILLER terminées", en: "Completed KILLER matches", es: "Partidas KILLER completadas" } },
    { metric: "killerPodiums", target: 3, label: { fr: "Podiums en KILLER", en: "KILLER podiums", es: "Podios en KILLER" } },
  ] },
  { id: "killer_miasma", collection: "killer", name: "MIASMA", stars: 3.5, accent: "#c8e05a", subtitle: { fr: "Médecin de la peste", en: "Plague doctor", es: "Médico de la peste" }, requirements: [
    { metric: "killerAutoHits", target: 3, label: { fr: "Auto-hits / pénalités subies", en: "Self-hits / penalties taken", es: "Autoimpactos / penalizaciones" } },
  ] },
  { id: "killer_raze", collection: "killer", name: "RAZE", stars: 3.5, accent: "#ff8a3d", subtitle: { fr: "Seigneur des flammes", en: "Lord of flames", es: "Señor de las llamas" }, requirements: [
    { metric: "killerKills", target: 25, label: { fr: "Kills réalisés en KILLER", en: "KILLER kills", es: "Kills realizados en KILLER" } },
  ] },
  { id: "killer_noz", collection: "killer", name: "NOZ", stars: 5, accent: "#d650ff", subtitle: { fr: "Héros gothique lunaire", en: "Moonlit gothic hero", es: "Héroe gótico lunar" }, requirements: [
    { metric: "killerWins", target: 8, label: { fr: "Victoires en KILLER", en: "KILLER wins", es: "Victorias en KILLER" } },
    { metric: "killerFirsts", target: 5, label: { fr: "1res places en KILLER", en: "1st places in KILLER", es: "Primeros puestos en KILLER" } },
  ] },
  { id: "killer_zeno", collection: "killer", name: "ZENO", stars: 4.5, accent: "#ef5555", subtitle: { fr: "Samouraï biker", en: "Biker samurai", es: "Samurái motero" }, requirements: [
    { metric: "killerMatches", target: 12, label: { fr: "Parties KILLER terminées", en: "Completed KILLER matches", es: "Partidas KILLER completadas" } },
    { metric: "killerWins", target: 6, label: { fr: "Victoires en KILLER", en: "KILLER wins", es: "Victorias en KILLER" } },
  ] },
  { id: "killer_brat", collection: "killer", name: "BRAT", stars: 4.5, accent: "#ff7d45", subtitle: { fr: "Brute cybernétique", en: "Cybernetic brute", es: "Bruto cibernético" }, requirements: [
    { metric: "killerHits", target: 60, label: { fr: "Hits enregistrés en KILLER", en: "KILLER hits", es: "Impactos en KILLER" } },
    { metric: "killerKills", target: 30, label: { fr: "Kills réalisés en KILLER", en: "KILLER kills", es: "Kills realizados en KILLER" } },
  ] },
  { id: "killer_viper", collection: "killer", name: "VIPER", stars: 4, accent: "#60d26e", subtitle: { fr: "Gardienne serpentine", en: "Serpentine guardian", es: "Guardiana serpentina" }, requirements: [
    { metric: "killerPrecision", target: 35, label: { fr: "Précision KILLER (%)", en: "KILLER accuracy (%)", es: "Precisión KILLER (%)" } },
    { metric: "killerMatches", target: 8, label: { fr: "Parties KILLER terminées", en: "Completed KILLER matches", es: "Partidas KILLER completadas" } },
  ] },
  { id: "killer_west", collection: "killer", name: "WEST", stars: 4, accent: "#c88c5b", subtitle: { fr: "Gunslinger mort-vivant", en: "Undead gunslinger", es: "Pistolero no muerto" }, requirements: [
    { metric: "killerFirsts", target: 3, label: { fr: "1res places en KILLER", en: "1st places in KILLER", es: "Primeros puestos en KILLER" } },
    { metric: "killerWins", target: 5, label: { fr: "Victoires en KILLER", en: "KILLER wins", es: "Victorias en KILLER" } },
  ] },
  { id: "killer_batuga", collection: "killer", name: "BATUGA", stars: 3.5, accent: "#b650ff", subtitle: { fr: "Vampire gothique", en: "Gothic vampire", es: "Vampira gótica" }, requirements: [
    { metric: "killerPodiums", target: 8, label: { fr: "Podiums en KILLER", en: "KILLER podiums", es: "Podios en KILLER" } },
    { metric: "killerMatches", target: 15, label: { fr: "Parties KILLER terminées", en: "Completed KILLER matches", es: "Partidas KILLER completadas" } },
  ] },
  { id: "killer_skull", collection: "killer", name: "SKULL", stars: 3, accent: "#ff55c9", subtitle: { fr: "Squelette punk", en: "Punk skeleton", es: "Esqueleto punk" }, requirements: [
    { metric: "killerMatches", target: 20, label: { fr: "Parties KILLER terminées", en: "Completed KILLER matches", es: "Partidas KILLER completadas" } },
    { metric: "killerKills", target: 40, label: { fr: "Kills réalisés en KILLER", en: "KILLER kills", es: "Kills realizados en KILLER" } },
  ] },


  // Collection LÉGENDES — 51 cartes joueurs, chacune avec un défi distinct.
  { id: "legend_the_bullet", collection: "legends", name: "THE BULLET", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/001-the-bullet.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "x01Matches", target: 1, label: { fr: "Terminer une partie X01", en: "Complete an X01 match", es: "Completar una partida X01" } },
  ] },
  { id: "legend_mcdanger", collection: "legends", name: "MCDANGER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/002-mcdanger.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "x01Wins", target: 1, label: { fr: "Gagner une partie X01", en: "Win an X01 match", es: "Ganar una partida X01" } },
  ] },
  { id: "legend_one_dart", collection: "legends", name: "ONE DART", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/003-one-dart.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cricketMatches", target: 1, label: { fr: "Terminer une partie Cricket", en: "Complete a Cricket match", es: "Completar una partida de Cricket" } },
  ] },
  { id: "legend_the_giant", collection: "legends", name: "THE GIANT", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/004-the-giant.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cricketWins", target: 1, label: { fr: "Gagner une partie Cricket", en: "Win a Cricket match", es: "Ganar una partida de Cricket" } },
  ] },
  { id: "legend_smudger", collection: "legends", name: "SMUDGER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/005-smudger.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "killerHistoryMatches", target: 1, label: { fr: "Terminer une partie Killer", en: "Complete a Killer match", es: "Completar una partida Killer" } },
  ] },
  { id: "legend_prince_of_style", collection: "legends", name: "THE PRINCE OF STYLE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/006-prince-of-style.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "killerHistoryWins", target: 1, label: { fr: "Gagner une partie Killer", en: "Win a Killer match", es: "Ganar una partida Killer" } },
  ] },
  { id: "legend_the_ferret", collection: "legends", name: "THE FERRET", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/007-the-ferret.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "shanghaiMatches", target: 1, label: { fr: "Terminer une partie Shanghai", en: "Complete a Shanghai match", es: "Completar una partida Shanghai" } },
  ] },
  { id: "legend_wolfie", collection: "legends", name: "WOLFIE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/008-wolfie.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "shanghaiWins", target: 1, label: { fr: "Gagner une partie Shanghai", en: "Win a Shanghai match", es: "Ganar una partida Shanghai" } },
  ] },
  { id: "legend_jaws", collection: "legends", name: "JAWS", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/009-jaws.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "territoriesMatches", target: 1, label: { fr: "Terminer une partie Territories", en: "Complete a Territories match", es: "Completar una partida Territories" } },
  ] },
  { id: "legend_the_power", collection: "legends", name: "THE POWER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/010-the-power.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "territoriesWins", target: 1, label: { fr: "Gagner une partie Territories", en: "Win a Territories match", es: "Ganar una partida Territories" } },
  ] },
  { id: "legend_beau_n_arrow", collection: "legends", name: "BEAU ’N’ ARROW", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/011-beau-n-arrow.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiftyOneByFiveMatches", target: 1, label: { fr: "Terminer une partie 51 BY 5", en: "Complete a 51 BY 5 match", es: "Completar una partida 51 BY 5" } },
  ] },
  { id: "legend_the_count", collection: "legends", name: "THE COUNT", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/012-the-count.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiftyOneByFiveWins", target: 1, label: { fr: "Gagner une partie 51 BY 5", en: "Win a 51 BY 5 match", es: "Ganar una partida 51 BY 5" } },
  ] },
  { id: "legend_the_dreammaker", collection: "legends", name: "THE DREAMMAKER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/013-the-dreammaker.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "looperMatches", target: 1, label: { fr: "Terminer une partie Looper", en: "Complete a Looper match", es: "Completar una partida Looper" } },
  ] },
  { id: "legend_the_crafty_cockney", collection: "legends", name: "THE CRAFTY COCKNEY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/014-the-crafty-cockney.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "looperWins", target: 1, label: { fr: "Gagner une partie Looper", en: "Win a Looper match", es: "Ganar una partida Looper" } },
  ] },
  { id: "legend_the_nuke", collection: "legends", name: "THE NUKE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/015-the-nuke.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "callThreeMatches", target: 1, label: { fr: "Terminer une partie Call Three", en: "Complete a Call Three match", es: "Completar una partida Call Three" } },
  ] },
  { id: "legend_the_iceman", collection: "legends", name: "THE ICEMAN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/016-the-iceman.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "callThreeWins", target: 1, label: { fr: "Gagner une partie Call Three", en: "Win a Call Three match", es: "Ganar una partida Call Three" } },
  ] },
  { id: "legend_chizzy", collection: "legends", name: "CHIZZY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/017-chizzy.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "steeplechaseMatches", target: 1, label: { fr: "Terminer une partie Steeplechase", en: "Complete a Steeplechase match", es: "Completar una partida Steeplechase" } },
  ] },
  { id: "legend_the_voltage", collection: "legends", name: "THE VOLTAGE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/018-the-voltage.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "steeplechaseWins", target: 1, label: { fr: "Gagner une partie Steeplechase", en: "Win a Steeplechase match", es: "Ganar una partida Steeplechase" } },
  ] },
  { id: "legend_the_flying_scotsman", collection: "legends", name: "THE FLYING SCOTSMAN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/019-the-flying-scotsman.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsFirefighterHistoryMatches", target: 1, label: { fr: "Terminer une partie Darts Firefighter", en: "Complete a Darts Firefighter match", es: "Completar una partida Darts Firefighter" } },
  ] },
  { id: "legend_barney", collection: "legends", name: "BARNEY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/020-barney.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsFirefighterHistoryWins", target: 1, label: { fr: "Gagner une partie Darts Firefighter", en: "Win a Darts Firefighter match", es: "Ganar una partida Darts Firefighter" } },
  ] },
  { id: "legend_cool_hand_luke", collection: "legends", name: "COOL HAND LUKE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/021-cool-hand-luke.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsPokerMatches", target: 1, label: { fr: "Terminer une partie Darts Poker", en: "Complete a Darts Poker match", es: "Completar una partida Darts Poker" } },
  ] },
  { id: "legend_bully_boy", collection: "legends", name: "BULLY BOY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/022-bully-boy.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsPokerWins", target: 1, label: { fr: "Gagner une partie Darts Poker", en: "Win a Darts Poker match", es: "Ganar una partida Darts Poker" } },
  ] },
  { id: "legend_the_asp", collection: "legends", name: "THE ASP", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/023-the-asp.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "oceanControlMatches", target: 1, label: { fr: "Terminer une partie Ocean Control", en: "Complete an Ocean Control match", es: "Completar una partida Ocean Control" } },
  ] },
  { id: "legend_the_fella", collection: "legends", name: "THE FELLA", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/024-the-fella.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "oceanControlWins", target: 1, label: { fr: "Gagner une partie Ocean Control", en: "Win an Ocean Control match", es: "Ganar una partida Ocean Control" } },
  ] },
  { id: "legend_the_bronzed_adonis", collection: "legends", name: "THE BRONZED ADONIS", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/025-the-bronzed-adonis.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cargoMatches", target: 1, label: { fr: "Terminer une partie Cargo", en: "Complete a Cargo match", es: "Completar una partida Cargo" } },
  ] },
  { id: "legend_marathon_man", collection: "legends", name: "MARATHON MAN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/026-marathon-man.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cargoWins", target: 1, label: { fr: "Gagner une partie Cargo", en: "Win a Cargo match", es: "Ganar una partida Cargo" } },
  ] },
  { id: "legend_john_boy", collection: "legends", name: "JOHN BOY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/027-john-boy.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "golfMatches", target: 1, label: { fr: "Terminer une partie Golf", en: "Complete a Golf match", es: "Completar una partida Golf" } },
  ] },
  { id: "legend_the_deadly_boomerang", collection: "legends", name: "THE DEADLY BOOMERANG", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/028-the-deadly-boomerang.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "golfWins", target: 1, label: { fr: "Gagner une partie Golf", en: "Win a Golf match", es: "Ganar una partida Golf" } },
  ] },
  { id: "legend_scotty2hotty", collection: "legends", name: "SCOTTY2HOTTY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/029-scotty2hotty.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "batardMatches", target: 1, label: { fr: "Terminer une partie Bâtard", en: "Complete a Bâtard match", es: "Completar una partida Bâtard" } },
  ] },
  { id: "legend_scotty_dog", collection: "legends", name: "SCOTTY DOG", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/030-scotty-dog.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "batardWins", target: 1, label: { fr: "Gagner une partie Bâtard", en: "Win a Bâtard match", es: "Ganar una partida Bâtard" } },
  ] },
  { id: "legend_webby", collection: "legends", name: "WEBBY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/031-webby.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "battleRoyaleMatches", target: 1, label: { fr: "Terminer une partie Battle Royale", en: "Complete a Battle Royale match", es: "Completar una partida Battle Royale" } },
  ] },
  { id: "legend_the_lipstick", collection: "legends", name: "THE LIPSTICK", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/032-the-lipstick.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "battleRoyaleWins", target: 1, label: { fr: "Gagner une partie Battle Royale", en: "Win a Battle Royale match", es: "Ganar una partida Battle Royale" } },
  ] },
  { id: "legend_the_cobra", collection: "legends", name: "THE COBRA", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/033-the-cobra.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiveLivesMatches", target: 1, label: { fr: "Terminer une partie Five Lives", en: "Complete a Five Lives match", es: "Completar una partida Five Lives" } },
  ] },
  { id: "legend_the_nodor", collection: "legends", name: "JOCKY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/034-the-nodor.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiveLivesWins", target: 1, label: { fr: "Gagner une partie Five Lives", en: "Win a Five Lives match", es: "Ganar una partida Five Lives" } },
  ] },
  { id: "legend_the_wizard", collection: "legends", name: "THE WIZARD", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/035-the-wizard.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "scramMatches", target: 1, label: { fr: "Terminer une partie Scram", en: "Complete a Scram match", es: "Completar una partida Scram" } },
  ] },
  { id: "legend_the_machine", collection: "legends", name: "THE MACHINE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/036-the-machine.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "scramWins", target: 1, label: { fr: "Gagner une partie Scram", en: "Win a Scram match", es: "Ganar una partida Scram" } },
  ] },
  { id: "legend_snakebite", collection: "legends", name: "SNAKEBITE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/037-snakebite.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "warfareMatches", target: 1, label: { fr: "Terminer une partie Warfare", en: "Complete a Warfare match", es: "Completar una partida Warfare" } },
  ] },
  { id: "legend_mighty_mike", collection: "legends", name: "MIGHTY MIKE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/038-mighty-mike.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "warfareWins", target: 1, label: { fr: "Gagner une partie Warfare", en: "Win a Warfare match", es: "Ganar una partida Warfare" } },
  ] },
  { id: "legend_jackpot", collection: "legends", name: "JACKPOT", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/039-jackpot.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "clockMatches", target: 1, label: { fr: "Terminer une partie Clock", en: "Complete a Clock match", es: "Completar una partida Clock" } },
  ] },
  { id: "legend_the_viking", collection: "legends", name: "THE VIKING", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/040-the-viking.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "clockWins", target: 1, label: { fr: "Gagner une partie Clock", en: "Win a Clock match", es: "Ganar una partida Clock" } },
  ] },
  { id: "legend_hawaii_501", collection: "legends", name: "HAWAII 501", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/041-hawaii-501.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "matches", target: 5, label: { fr: "Terminer 5 parties", en: "Complete 5 matches", es: "Completar 5 partidas" } },
  ] },
  { id: "legend_the_bull", collection: "legends", name: "THE BULL", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/042-the-bull.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "wins", target: 3, label: { fr: "Remporter 3 victoires", en: "Earn 3 wins", es: "Conseguir 3 victorias" } },
  ] },
  { id: "legend_the_menace", collection: "legends", name: "THE MENACE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/043-the-menace.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "modes", target: 3, label: { fr: "Jouer dans 3 modes différents", en: "Play 3 different modes", es: "Jugar 3 modos diferentes" } },
  ] },
  { id: "legend_the_artist_a", collection: "legends", name: "THE ARTIST", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/044-the-artist-a.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "matches", target: 15, label: { fr: "Terminer 15 parties", en: "Complete 15 matches", es: "Completar 15 partidas" } },
  ] },
  { id: "legend_prince_of_wales_a", collection: "legends", name: "THE PRINCE OF WALES", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/045-prince-of-wales-a.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "wins", target: 10, label: { fr: "Remporter 10 victoires", en: "Earn 10 wins", es: "Conseguir 10 victorias" } },
  ] },
  { id: "legend_the_artist_b", collection: "legends", name: "THE ARTIST", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/046-the-artist-b.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "modes", target: 5, label: { fr: "Jouer dans 5 modes différents", en: "Play 5 different modes", es: "Jugar 5 modos diferentes" } },
  ] },
  { id: "legend_silverback", collection: "legends", name: "SILVERBACK", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/047-silverback.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "matches", target: 25, label: { fr: "Terminer 25 parties", en: "Complete 25 matches", es: "Completar 25 partidas" } },
  ] },
  { id: "legend_aubergenius", collection: "legends", name: "AUBERGENIUS", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/048-aubergenius.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "wins", target: 15, label: { fr: "Remporter 15 victoires", en: "Earn 15 wins", es: "Conseguir 15 victorias" } },
  ] },
  { id: "legend_rocky", collection: "legends", name: "ROCKY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/049-rocky.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "modes", target: 8, label: { fr: "Jouer dans 8 modes différents", en: "Play 8 different modes", es: "Jugar 8 modos diferentes" } },
  ] },
  { id: "legend_queen_of_the_palace", collection: "legends", name: "QUEEN OF THE PALACE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/050-queen-of-the-palace.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "matches", target: 50, label: { fr: "Terminer 50 parties", en: "Complete 50 matches", es: "Completar 50 partidas" } },
    { metric: "wins", target: 20, label: { fr: "Remporter 20 victoires", en: "Earn 20 wins", es: "Conseguir 20 victorias" } },
  ] },
  { id: "legend_prince_of_wales_b", collection: "legends", name: "THE PRINCE OF WALES", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/051-prince-of-wales-b.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "matches", target: 75, label: { fr: "Terminer 75 parties", en: "Complete 75 matches", es: "Completar 75 partidas" } },
    { metric: "modes", target: 10, label: { fr: "Jouer dans 10 modes différents", en: "Play 10 different modes", es: "Jugar 10 modos diferentes" } },
  ] },
  // V146 : nouveaux badges validés ; JOCKY remplace la carte existante THE NODOR.
  { id: "legend_the_wall", collection: "legends", name: "THE WALL", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/052-the-wall.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "x01Wins", target: 2, label: { fr: "Gagner 2 parties X01", en: "Win 2 X01 matches", es: "Ganar 2 partidas de X01" } },
  ] },
  { id: "legend_belli", collection: "legends", name: "BELLI", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/053-belli.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "x01Matches", target: 10, label: { fr: "Terminer 10 parties X01", en: "Complete 10 X01 matches", es: "Completar 10 partidas de X01" } },
  ] },
  { id: "legend_the_rockstar", collection: "legends", name: "THE ROCKSTAR", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/054-the-rockstar.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cricketWins", target: 3, label: { fr: "Gagner 3 parties Cricket", en: "Win 3 Cricket matches", es: "Ganar 3 partidas de Cricket" } },
  ] },
  { id: "legend_the_ton_machine", collection: "legends", name: "THE TON MACHINE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/055-the-ton-machine.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cricketMatches", target: 6, label: { fr: "Terminer 6 parties Cricket", en: "Complete 6 Cricket matches", es: "Completar 6 partidas de Cricket" } },
  ] },
  { id: "legend_flawlas", collection: "legends", name: "FLAWLAS", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/056-flawlas.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "killerHistoryWins", target: 2, label: { fr: "Gagner 2 parties Killer", en: "Win 2 Killer matches", es: "Ganar 2 partidas de Killer" } },
  ] },
  { id: "legend_old_stoneface", collection: "legends", name: "OLD STONEFACE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/057-old-stoneface.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "killerHistoryMatches", target: 8, label: { fr: "Terminer 8 parties Killer", en: "Complete 8 Killer matches", es: "Completar 8 partidas de Killer" } },
  ] },
  { id: "legend_the_heat", collection: "legends", name: "THE HEAT", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/058-the-heat.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "shanghaiWins", target: 2, label: { fr: "Gagner 2 parties Shanghai", en: "Win 2 Shanghai matches", es: "Ganar 2 partidas de Shanghai" } },
  ] },
  { id: "legend_mr_glitter", collection: "legends", name: "MR GLITTER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/059-mr-glitter.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "shanghaiMatches", target: 6, label: { fr: "Terminer 6 parties Shanghai", en: "Complete 6 Shanghai matches", es: "Completar 6 partidas de Shanghai" } },
  ] },
  { id: "legend_the_african_warrior", collection: "legends", name: "THE AFRICAN WARRIOR", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/060-the-african-warrior.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "territoriesWins", target: 2, label: { fr: "Gagner 2 parties Territories", en: "Win 2 Territories matches", es: "Ganar 2 partidas de Territories" } },
  ] },
  { id: "legend_the_hurricane", collection: "legends", name: "THE HURRICANE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/061-the-hurricane.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "territoriesMatches", target: 7, label: { fr: "Terminer 7 parties Territories", en: "Complete 7 Territories matches", es: "Completar 7 partidas de Territories" } },
  ] },
  { id: "legend_the_gambler", collection: "legends", name: "THE GAMBLER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/062-the-gambler.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiftyOneByFiveWins", target: 2, label: { fr: "Gagner 2 parties 51 BY 5", en: "Win 2 51 BY 5 matches", es: "Ganar 2 partidas de 51 BY 5" } },
  ] },
  { id: "legend_hollywood", collection: "legends", name: "HOLLYWOOD", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/063-hollywood.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiftyOneByFiveMatches", target: 8, label: { fr: "Terminer 8 parties 51 BY 5", en: "Complete 8 51 BY 5 matches", es: "Completar 8 partidas de 51 BY 5" } },
  ] },
  { id: "legend_the_gentle", collection: "legends", name: "THE GENTLE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/064-the-gentle.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "looperWins", target: 2, label: { fr: "Gagner 2 parties Looper", en: "Win 2 Looper matches", es: "Ganar 2 partidas de Looper" } },
  ] },
  { id: "legend_razmatazz", collection: "legends", name: "RAZMATAZZ", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/065-razmatazz.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "looperMatches", target: 5, label: { fr: "Terminer 5 parties Looper", en: "Complete 5 Looper matches", es: "Completar 5 partidas de Looper" } },
  ] },
  { id: "legend_the_french_touch", collection: "legends", name: "THE FRENCH TOUCH", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/066-the-french-touch.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "callThreeWins", target: 2, label: { fr: "Gagner 2 parties Call Three", en: "Win 2 Call Three matches", es: "Ganar 2 partidas de Call Three" } },
  ] },
  { id: "legend_the_limestone_cowboy", collection: "legends", name: "THE LIMESTONE COWBOY", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/067-the-limestone-cowboy.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "callThreeMatches", target: 7, label: { fr: "Terminer 7 parties Call Three", en: "Complete 7 Call Three matches", es: "Completar 7 partidas de Call Three" } },
  ] },
  { id: "legend_frosty_the_throwman", collection: "legends", name: "FROSTY THE THROWMAN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/068-frosty-the-throwman.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "steeplechaseWins", target: 2, label: { fr: "Gagner 2 parties Steeplechase", en: "Win 2 Steeplechase matches", es: "Ganar 2 partidas de Steeplechase" } },
  ] },
  { id: "legend_the_polish_eagle", collection: "legends", name: "THE POLISH EAGLE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/069-the-polish-eagle.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "steeplechaseMatches", target: 6, label: { fr: "Terminer 6 parties Steeplechase", en: "Complete 6 Steeplechase matches", es: "Completar 6 partidas de Steeplechase" } },
  ] },
  { id: "legend_the_special_one", collection: "legends", name: "THE SPECIAL ONE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/070-the-special-one.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsPokerWins", target: 2, label: { fr: "Gagner 2 parties Darts Poker", en: "Win 2 Darts Poker matches", es: "Ganar 2 partidas de Darts Poker" } },
  ] },
  { id: "legend_the_dutch_destroyer", collection: "legends", name: "THE DUTCH DESTROYER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/071-the-dutch-destroyer.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "dartsPokerMatches", target: 6, label: { fr: "Terminer 6 parties Darts Poker", en: "Complete 6 Darts Poker matches", es: "Completar 6 partidas de Darts Poker" } },
  ] },
  { id: "legend_big_cliff", collection: "legends", name: "BIG CLIFF", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/072-big-cliff.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "oceanControlWins", target: 2, label: { fr: "Gagner 2 parties Ocean Control", en: "Win 2 Ocean Control matches", es: "Ganar 2 partidas de Ocean Control" } },
  ] },
  { id: "legend_the_magpie", collection: "legends", name: "THE MAGPIE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/073-the-magpie.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "oceanControlMatches", target: 6, label: { fr: "Terminer 6 parties Ocean Control", en: "Complete 6 Ocean Control matches", es: "Completar 6 partidas de Ocean Control" } },
  ] },
  { id: "legend_braziliant", collection: "legends", name: "BRAZILIANT", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/074-braziliant.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cargoWins", target: 2, label: { fr: "Gagner 2 parties Cargo", en: "Win 2 Cargo matches", es: "Ganar 2 partidas de Cargo" } },
  ] },
  { id: "legend_the_ninja", collection: "legends", name: "THE NINJA", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/075-the-ninja.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "cargoMatches", target: 6, label: { fr: "Terminer 6 parties Cargo", en: "Complete 6 Cargo matches", es: "Completar 6 partidas de Cargo" } },
  ] },
  { id: "legend_goldfinger", collection: "legends", name: "GOLDFINGER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/076-goldfinger.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "golfWins", target: 2, label: { fr: "Gagner 2 parties Golf", en: "Win 2 Golf matches", es: "Ganar 2 partidas de Golf" } },
  ] },
  { id: "legend_big_rig", collection: "legends", name: "BIG RIG", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/077-big-rig.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "golfMatches", target: 6, label: { fr: "Terminer 6 parties Golf", en: "Complete 6 Golf matches", es: "Completar 6 partidas de Golf" } },
  ] },
  { id: "legend_the_blade", collection: "legends", name: "THE BLADE", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/078-the-blade.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "batardWins", target: 2, label: { fr: "Gagner 2 parties Bâtard", en: "Win 2 Bâtard matches", es: "Ganar 2 partidas de Bâtard" } },
  ] },
  { id: "legend_demolition_man", collection: "legends", name: "DEMOLITION MAN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/079-demolition-man.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "battleRoyaleWins", target: 2, label: { fr: "Gagner 2 parties Battle Royale", en: "Win 2 Battle Royale matches", es: "Ganar 2 partidas de Battle Royale" } },
  ] },
  { id: "legend_the_gunner", collection: "legends", name: "THE GUNNER", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/080-the-gunner.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "fiveLivesWins", target: 2, label: { fr: "Gagner 2 parties 5 Lives", en: "Win 2 5 Lives matches", es: "Ganar 2 partidas de 5 Lives" } },
  ] },
  { id: "legend_superchin", collection: "legends", name: "SUPERCHIN", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/081-superchin.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "scramWins", target: 2, label: { fr: "Gagner 2 parties Scram", en: "Win 2 Scram matches", es: "Ganar 2 partidas de Scram" } },
  ] },
  { id: "legend_heavy_metal", collection: "legends", name: "HEAVY METAL", stars: 5, accent: "#f2c14e", image: "/images/collectible-legends/082-heavy-metal.webp", subtitle: { fr: "Légende des fléchettes", en: "Darts legend", es: "Leyenda de los dardos" }, requirements: [
    { metric: "warfareWins", target: 2, label: { fr: "Gagner 2 parties Warfare", en: "Win 2 Warfare matches", es: "Ganar 2 partidas de Warfare" } },
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
    killerMatches: 0, killerWins: 0, killerKills: 0, killerHits: 0, killerAutoHits: 0,
    killerPodiums: 0, killerFirsts: 0, killerPrecision: 0,
    x01Matches: 0, x01Wins: 0, cricketMatches: 0, cricketWins: 0, killerHistoryMatches: 0, killerHistoryWins: 0, shanghaiMatches: 0, shanghaiWins: 0, territoriesMatches: 0, territoriesWins: 0, fiftyOneByFiveMatches: 0, fiftyOneByFiveWins: 0, looperMatches: 0, looperWins: 0, callThreeMatches: 0, callThreeWins: 0, steeplechaseMatches: 0, steeplechaseWins: 0, dartsFirefighterHistoryMatches: 0, dartsFirefighterHistoryWins: 0, dartsPokerMatches: 0, dartsPokerWins: 0, oceanControlMatches: 0, oceanControlWins: 0, cargoMatches: 0, cargoWins: 0, golfMatches: 0, golfWins: 0, batardMatches: 0, batardWins: 0, battleRoyaleMatches: 0, battleRoyaleWins: 0, fiveLivesMatches: 0, fiveLivesWins: 0, scramMatches: 0, scramWins: 0, warfareMatches: 0, warfareWins: 0, clockMatches: 0, clockWins: 0,
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

function applyLegendModeMetrics(metrics: CollectibleMetrics, mode: string, won: boolean): void {
  const key = String(mode || "").trim().toLowerCase();
  const pair: [CollectibleMetricKey, CollectibleMetricKey] | null = ({
    x01: ["x01Matches", "x01Wins"],
    cricket: ["cricketMatches", "cricketWins"],
    killer: ["killerHistoryMatches", "killerHistoryWins"],
    shanghai: ["shanghaiMatches", "shanghaiWins"],
    territories: ["territoriesMatches", "territoriesWins"],
    fifty_one_by_five: ["fiftyOneByFiveMatches", "fiftyOneByFiveWins"],
    looper: ["looperMatches", "looperWins"],
    call_three: ["callThreeMatches", "callThreeWins"],
    steeplechase: ["steeplechaseMatches", "steeplechaseWins"],
    darts_firefighter: ["dartsFirefighterHistoryMatches", "dartsFirefighterHistoryWins"],
    darts_poker: ["dartsPokerMatches", "dartsPokerWins"],
    ocean_control: ["oceanControlMatches", "oceanControlWins"],
    cargo: ["cargoMatches", "cargoWins"],
    golf: ["golfMatches", "golfWins"],
    batard: ["batardMatches", "batardWins"],
    battle_royale: ["battleRoyaleMatches", "battleRoyaleWins"],
    five_lives: ["fiveLivesMatches", "fiveLivesWins"],
    scram: ["scramMatches", "scramWins"],
    warfare: ["warfareMatches", "warfareWins"],
    clock: ["clockMatches", "clockWins"],
  } as Record<string, [CollectibleMetricKey, CollectibleMetricKey]>)[key] || null;
  if (!pair) return;
  metrics[pair[0]] += 1;
  if (won) metrics[pair[1]] += 1;
}

export async function computeCollectibleMetrics(profileIdInput: string): Promise<CollectibleMetrics> {
  const profileId = String(profileIdInput || "").trim();
  const metrics = emptyMetrics();
  if (!profileId) return metrics;

  const [history, firefighter, rawHistory] = await Promise.all([
    loadNormalizedHistory().catch(() => [] as NormalizedMatch[]),
    loadDartsFirefighterStatsUnified().catch(() => [] as any[]),
    History.list().catch(() => [] as any[]),
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
    applyLegendModeMetrics(metrics, String(match.mode || mode), won);

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

  const killerAgg = computeKillerStatsAggForProfile(rawHistory as any[], profileId);
  metrics.killerMatches = Number(killerAgg?.played || 0);
  metrics.killerWins = Number(killerAgg?.wins || 0);
  metrics.killerKills = Number(killerAgg?.killsTotal || killerAgg?.kills || 0);
  metrics.killerHits = Number(killerAgg?.totalHits || 0);
  metrics.killerAutoHits = Number(killerAgg?.autoHitsTotal || 0);
  metrics.killerPodiums = Number(killerAgg?.podiums || 0);
  metrics.killerFirsts = Number(killerAgg?.firsts || 0);
  metrics.killerPrecision = Math.round(Number(killerAgg?.precisionKiller || 0));

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
