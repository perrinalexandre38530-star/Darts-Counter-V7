/** Fonds buvette fournis avec l’application : clés stables conservées dans Supabase. */
export const BUVETTE_SCENES = [
  { key: "scene-01", path: "/assets/buvette/fond-01-bar-classique.webp", fr: "Bar classique", en: "Classic bar", es: "Bar clásico" },
  { key: "scene-02", path: "/assets/buvette/fond-02-club-sportif.webp", fr: "Club sportif", en: "Sports club", es: "Club deportivo" },
  { key: "scene-03", path: "/assets/buvette/fond-03-association.webp", fr: "Buvette associative", en: "Community club", es: "Asociación" },
  { key: "scene-04", path: "/assets/buvette/fond-04-fete.webp", fr: "Soirée festive", en: "Party night", es: "Noche festiva" },
  { key: "scene-05", path: "/assets/buvette/fond-05-plage.webp", fr: "Buvette plage", en: "Beach bar", es: "Bar de playa" },
  { key: "scene-06", path: "/assets/buvette/fond-06-tournoi.webp", fr: "Jour de tournoi", en: "Tournament day", es: "Torneo" },
  { key: "scene-07", path: "/assets/buvette/fond-07-lounge-chic.webp", fr: "Lounge chic", en: "Chic lounge", es: "Salón elegante" },
  { key: "scene-08", path: "/assets/buvette/fond-08-guinguette.webp", fr: "Guinguette", en: "Garden bar", es: "Guingueta" },
  { key: "scene-09", path: "/assets/buvette/fond-09-sans-alcool.webp", fr: "Boissons fraîches", en: "Soft drinks", es: "Refrescos" },
  { key: "scene-10", path: "/assets/buvette/fond-10-chalet-hiver.webp", fr: "Chalet d’hiver", en: "Winter chalet", es: "Chalet invernal" },
  { key: "scene-11", path: "/assets/buvette/fond-11-buvette-club.webp", fr: "Buvette du club", en: "Club refreshments", es: "Cantina del club" },
  { key: "scene-12", path: "/assets/buvette/fond-12-cocktails-lounge.webp", fr: "Cocktails lounge", en: "Cocktail lounge", es: "Cócteles lounge" },
  { key: "scene-13", path: "/assets/buvette/fond-13-comptoir-stade.webp", fr: "Bar de stade", en: "Stadium bar", es: "Bar de estadio" },
  { key: "scene-14", path: "/assets/buvette/fond-14-cocktails-ambre.webp", fr: "Cocktails ambrés", en: "Amber cocktails", es: "Cócteles ámbar" },
  { key: "scene-15", path: "/assets/buvette/fond-15-bieres-tireuses.webp", fr: "Bières pression", en: "Draft beer", es: "Cerveza de barril" },
  { key: "scene-16", path: "/assets/buvette/fond-16-bar-jus-fruits.webp", fr: "Jus et fruits", en: "Juice bar", es: "Zumos y frutas" },
  { key: "scene-17", path: "/assets/buvette/fond-17-bar-de-nuit.webp", fr: "Bar de nuit", en: "Night bar", es: "Bar nocturno" },
  { key: "scene-18", path: "/assets/buvette/fond-18-collection-cocktails.webp", fr: "Collection cocktails", en: "Cocktail collection", es: "Colección de cócteles" },
  { key: "scene-19", path: "/assets/buvette/fond-19-comptoir-rustique.webp", fr: "Comptoir rustique", en: "Rustic counter", es: "Barra rústica" },
  { key: "scene-20", path: "/assets/buvette/fond-20-cocktails-prestige.webp", fr: "Cocktails prestige", en: "Prestige cocktails", es: "Cócteles de lujo" },
 ] as const;

export type BuvetteSceneKey = (typeof BUVETTE_SCENES)[number]["key"];
export const DEFAULT_BUVETTE_COVER: BuvetteSceneKey = "scene-02";
export function isBuvetteSceneKey(value: unknown): value is BuvetteSceneKey {
  return typeof value === "string" && BUVETTE_SCENES.some((scene) => scene.key === value);
}
export function buvetteScenePath(key: BuvetteSceneKey): string {
  return BUVETTE_SCENES.find((scene) => scene.key === key)?.path ?? BUVETTE_SCENES[1].path;
}
