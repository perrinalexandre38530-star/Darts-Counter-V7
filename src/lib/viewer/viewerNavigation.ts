export type ViewerTvMenuItem = {
  id: string;
  label: string;
  subtitle: string;
  tab?: string;
  kind?: "route" | "scoreboard";
};

export const VIEWER_TV_MENU: ViewerTvMenuItem[] = [
  { id: "scoreboard", label: "LANCER / REPRENDRE", subtitle: "Nouvelle partie ou scoreboard live", kind: "scoreboard" },
  { id: "games", label: "SPORTS", subtitle: "Choisir une discipline", tab: "gameSelect", kind: "route" },
  { id: "profiles", label: "PROFILS", subtitle: "Joueurs et équipes", tab: "profiles", kind: "route" },
  { id: "online", label: "ONLINE", subtitle: "Communauté et parties", tab: "online", kind: "route" },
  { id: "stats", label: "STATS", subtitle: "Performances et historiques", tab: "statsHub", kind: "route" },
  { id: "agenda", label: "AGENDA", subtitle: "Événements et séances", tab: "agenda", kind: "route" },
  { id: "settings", label: "RÉGLAGES", subtitle: "Écrans et préférences", tab: "settings", kind: "route" },
];

const REMOTE_ALLOWED_TABS = new Set([
  "home",
  "gameSelect",
  "games",
  "profiles",
  "online",
  "stats",
  "statsHub",
  "agenda",
  "settings",
  "cast_host",
  "viewer_host",
  "x01setup",
  "x01_config_v3",
]);

const GAMEPLAY_TABS = new Set([
  "x01",
  "x01_play_v3",
  "cricket",
  "killer_play",
  "shanghai_play",
  "petanque_play",
  "babyfoot_play",
  "pingpong_play",
  "golf_play",
  "darts_mode_play",
  "five_lives_play",
  "warfare_play",
  "battle_royale_play",
  "training_x01_play",
]);

const LABELS: Record<string, string> = {
  home: "Accueil",
  gameSelect: "Sports",
  games: "Sports",
  profiles: "Profils",
  online: "Online",
  stats: "Stats",
  statsHub: "Stats",
  agenda: "Agenda",
  settings: "Réglages",
  cast_host: "Écrans",
  viewer_host: "Viewer",
  x01setup: "X01 · Configuration",
  x01_config_v3: "X01 · Configuration",
  x01: "X01",
  x01_play_v3: "X01 · Partie",
  cricket: "Cricket",
  killer_play: "Killer · Partie",
  shanghai_play: "Shanghai · Partie",
  petanque_play: "Pétanque · Partie",
  babyfoot_play: "Baby-foot · Partie",
  pingpong_play: "Ping-pong · Partie",
  golf_play: "Golf · Partie",
};

export function isViewerRemoteTabAllowed(tab: string) {
  const value = String(tab || "");
  if (REMOTE_ALLOWED_TABS.has(value)) return true;

  // Les écrans TV peuvent ouvrir les configurations de jeu déjà existantes
  // sans transformer la télécommande en routeur arbitraire. On limite aux
  // familles de routes de configuration/menus connues de l'application.
  if (/^(?:petanque|babyfoot|pingpong|molkky|dice|foot|darts|killer|shanghai|warfare|five_lives|halve_it|count_up|prisoner|super_bull|happy_mille|game_170|bobs_27|bowling|knockout|shooter|darts_racer|baseball|attrape_moi|president|football|rugby|capital|loterie|departements|cargo|ocean_control|tic_tac_toe|batard|golf|scram|enculette).*_config$/.test(value)) return true;

  return [
    "cricket",
    "shanghai",
    "battle_royale",
    "training",
    "tournaments",
    "running_plan",
    "fit_plan",
    "esports_rooms",
    "esports_matches",
    "esports_tournaments",
    "esports_profile",
    "esports_stats",
  ].includes(value);
}

export function isViewerGameplayRoute(tab: string) {
  const value = String(tab || "");
  if (GAMEPLAY_TABS.has(value)) return true;
  return /(?:_play|\.play)$/.test(value) && !/(replay|player)/.test(value);
}

export function viewerRouteLabel(tab: string) {
  const value = String(tab || "");
  if (LABELS[value]) return LABELS[value];
  if (!value) return "MULTISPORTS SCORING";
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function viewerMenuIndexForRoute(tab: string) {
  const value = String(tab || "");
  if (isViewerGameplayRoute(value)) return 0;
  if (["gameSelect", "games", "home", "x01setup", "x01_config_v3"].includes(value)) return 1;
  if (value.startsWith("profile")) return 2;
  if (value === "online" || value.startsWith("spectator") || value.startsWith("message")) return 3;
  if (value.startsWith("stats") || value.includes("leaderboard")) return 4;
  if (value === "agenda" || value.includes("calendar")) return 5;
  if (value === "settings" || value.startsWith("cast_") || value.startsWith("viewer_")) return 6;
  return 1;
}

export function sanitizeViewerRouteParams(params: any) {
  if (!params || typeof params !== "object") return null;
  const allowedKeys = [
    "screenTab",
    "mode",
    "sport",
    "organizationId",
    "sessionId",
    "roomId",
    "gameId",
    "variantId",
    "baseGame",
    "preset",
    "format",
    "presetCategory",
    "presetVariantId",
    "presetMode",
    "presetTarget",
    "forceMode",
    "onlineMode",
    "lobbyCode",
    "lobbyId",
    "fresh",
  ];
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of allowedKeys) {
    const value = params[key];
    if (value == null) continue;
    if (["string", "number", "boolean"].includes(typeof value)) out[key] = value as any;
  }
  return Object.keys(out).length ? out : null;
}
