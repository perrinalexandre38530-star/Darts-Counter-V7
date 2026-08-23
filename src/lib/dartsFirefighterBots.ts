import avatarKael from "../assets/avatars/firefighter-bots/kael.webp";
import avatarMalysia from "../assets/avatars/firefighter-bots/malysia.webp";
import avatarAero from "../assets/avatars/firefighter-bots/aero.webp";
import avatarZephyr from "../assets/avatars/firefighter-bots/zephyr.webp";
import avatarBraze from "../assets/avatars/firefighter-bots/braze.webp";
import avatarLyna from "../assets/avatars/firefighter-bots/lyna.webp";

export type DartsFirefighterBotTrait =
  | "commander"
  | "wildfire"
  | "air_support"
  | "weather"
  | "heavy"
  | "scout";

export type DartsFirefighterBot = {
  id: string;
  name: string;
  avatarDataUrl: string;
  avatarUrl: string;
  avatar: string;
  isBot: true;
  bot: true;
  cpu: true;
  type: "bot";
  kind: "bot";
  source: "darts_firefighter";
  systemBot: true;
  officialCharacter: true;
  locked: true;
  characterId: string;
  groupLabel: "Firefighter IA";
  profileStarring: number;
  botLevel: string;
  level: string;
  avg3D: number;
  firefighterAiDifficulty: "easy" | "normal" | "hard";
  firefighterAiTrait: DartsFirefighterBotTrait;
  firefighterRole: string;
  firefighterLevelLabel: string;
  countryCode: string;
  country: string;
};

function bot(
  id: string,
  name: string,
  avatar: string,
  stars: number,
  avg3D: number,
  difficulty: "easy" | "normal" | "hard",
  trait: DartsFirefighterBotTrait,
  role: string,
  levelLabel: string,
  countryCode = "FR",
): DartsFirefighterBot {
  return {
    id,
    name,
    avatarDataUrl: avatar,
    avatarUrl: avatar,
    avatar,
    isBot: true,
    bot: true,
    cpu: true,
    type: "bot",
    kind: "bot",
    source: "darts_firefighter",
    systemBot: true,
    officialCharacter: true,
    locked: true,
    characterId: id.replace(/^bot_ff_/, ""),
    groupLabel: "Firefighter IA",
    profileStarring: stars,
    botLevel: `${stars}/5`,
    level: stars >= 5 ? "legend" : stars >= 4.5 ? "pro" : stars >= 4 ? "strong" : "medium",
    avg3D,
    firefighterAiDifficulty: difficulty,
    firefighterAiTrait: trait,
    firefighterRole: role,
    firefighterLevelLabel: levelLabel,
    countryCode,
    country: countryCode,
  };
}

/**
 * Brigade officielle DARTS FIREFIGHTER.
 * Les niveaux influencent à la fois l'affichage, la calibration des cibles
 * et le comportement réel du bot pendant la partie.
 */
export const DARTS_FIREFIGHTER_BOTS: DartsFirefighterBot[] = [
  bot("bot_ff_kael", "Kaël", avatarKael, 5, 96, "hard", "commander", "Chef d'intervention", "Élite"),
  bot("bot_ff_aero", "Aero", avatarAero, 4.5, 88, "hard", "air_support", "Pilote Canadair", "Expert", "CA"),
  bot("bot_ff_zephyr", "Zéphyr", avatarZephyr, 4.5, 86, "hard", "weather", "Experte météo & vent", "Expert"),
  bot("bot_ff_malysia", "Malysia", avatarMalysia, 4, 76, "normal", "wildfire", "Spécialiste feux de forêt", "Confirmée"),
  bot("bot_ff_braze", "Braze", avatarBraze, 4, 74, "normal", "heavy", "Attaque lourde", "Confirmé"),
  bot("bot_ff_lyna", "Lyna", avatarLyna, 3.5, 66, "normal", "scout", "Éclaireuse tactique", "Avancée"),
];

export const DARTS_FIREFIGHTER_BOT_IDS = new Set(DARTS_FIREFIGHTER_BOTS.map((item) => item.id));

export function isDartsFirefighterBot(input: any): boolean {
  return DARTS_FIREFIGHTER_BOT_IDS.has(String(input?.id || input || ""));
}
