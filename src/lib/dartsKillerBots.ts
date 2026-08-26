import avatarMarron from "../assets/avatars/killer-bots/marron.webp";
import avatarVerveine from "../assets/avatars/killer-bots/verveine.webp";
import avatarBrutes from "../assets/avatars/killer-bots/brutes.webp";
import avatarDjuno from "../assets/avatars/killer-bots/djuno.webp";
import avatarThorn from "../assets/avatars/killer-bots/thorn.webp";
import avatarMiasma from "../assets/avatars/killer-bots/miasma.webp";
import avatarRaze from "../assets/avatars/killer-bots/raze.webp";
import avatarNoz from "../assets/avatars/killer-bots/noz.webp";
import avatarZeno from "../assets/avatars/killer-bots/zeno.webp";
import avatarBrams from "../assets/avatars/killer-bots/brams.webp";
import avatarViperine from "../assets/avatars/killer-bots/viperine.webp";
import avatarWest from "../assets/avatars/killer-bots/west.webp";
import avatarBatuzia from "../assets/avatars/killer-bots/batuzia.webp";
import avatarSqwal from "../assets/avatars/killer-bots/sqwal.webp";

export type DartsKillerBotTrait =
  | "spectral"
  | "venom"
  | "brute"
  | "chaos"
  | "hunter"
  | "toxic"
  | "berserker"
  | "precision"
  | "samurai"
  | "heavy"
  | "predator"
  | "gunslinger"
  | "vampire"
  | "punk";

export type DartsKillerBot = {
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
  source: "darts_killer";
  systemBot: true;
  officialCharacter: true;
  locked: true;
  characterId: string;
  groupLabel: "Killer IA";
  profileStarring: number;
  botLevel: string;
  level: string;
  avg3D: number;
  avg3: number;
  killerAiTrait: DartsKillerBotTrait;
  killerRole: string;
  killerLevelLabel: string;
};

function bot(
  id: string,
  name: string,
  avatar: string,
  stars: number,
  avg3D: number,
  trait: DartsKillerBotTrait,
  role: string,
  levelLabel: string,
): DartsKillerBot {
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
    source: "darts_killer",
    systemBot: true,
    officialCharacter: true,
    locked: true,
    characterId: id.replace(/^bot_killer_/, ""),
    groupLabel: "Killer IA",
    profileStarring: stars,
    botLevel: `${stars}/5`,
    level: stars >= 5 ? "legend" : stars >= 4.5 ? "pro" : stars >= 4 ? "strong" : stars >= 3 ? "medium" : "easy",
    avg3D,
    avg3: avg3D,
    killerAiTrait: trait,
    killerRole: role,
    killerLevelLabel: levelLabel,
  };
}

/**
 * Casting IA officiel exclusif au mode KILLER.
 * Il remplace les anciens BOTS IA PRO génériques uniquement dans Killer.
 * Les BOTS CPU créés par l'utilisateur sont ajoutés séparément par KillerConfig.
 */
export const DARTS_KILLER_BOTS: DartsKillerBot[] = [
  bot("bot_killer_marron", "MORROW", avatarMarron, 5, 96, "spectral", "Traqueur spectral", "Élite"),
  bot("bot_killer_verveine", "VELVET", avatarVerveine, 4.5, 90, "venom", "Spécialiste du contrôle", "Experte"),
  bot("bot_killer_brutes", "BRUTUS", avatarBrutes, 4.5, 89, "brute", "Colosse frontal", "Expert"),
  bot("bot_killer_djuno", "DJUNO", avatarDjuno, 4, 84, "chaos", "Style imprévisible", "Confirmée"),
  bot("bot_killer_thorn", "THORN", avatarThorn, 4, 85, "hunter", "Chasseur camouflé", "Confirmé"),
  bot("bot_killer_miasma", "MIASMA", avatarMiasma, 3.5, 76, "toxic", "Alchimiste tactique", "Avancé"),
  bot("bot_killer_raze", "RAZE", avatarRaze, 3.5, 75, "berserker", "Combattant agressif", "Avancé"),
  bot("bot_killer_noz", "NOZ", avatarNoz, 5, 94, "precision", "Maître de la précision", "Élite"),
  bot("bot_killer_zeno", "ZENO", avatarZeno, 4.5, 90, "samurai", "Biker ronin", "Expert"),
  bot("bot_killer_brams", "BRAT", avatarBrams, 4.5, 88, "heavy", "Force lourde", "Expert"),
  bot("bot_killer_viperine", "VIPER", avatarViperine, 4, 84, "predator", "Prédatrice agile", "Confirmée"),
  bot("bot_killer_west", "WEST", avatarWest, 4, 80, "gunslinger", "Gunslinger tactique", "Confirmé"),
  bot("bot_killer_batuzia", "BATUGA", avatarBatuzia, 3.5, 74, "vampire", "Joueuse opportuniste", "Avancée"),
  bot("bot_killer_sqwal", "SKULL", avatarSqwal, 3, 68, "punk", "Style explosif", "Intermédiaire"),
];

export const DARTS_KILLER_BOT_IDS = new Set(DARTS_KILLER_BOTS.map((item) => item.id));

export function isDartsKillerBot(input: any): boolean {
  return DARTS_KILLER_BOT_IDS.has(String(input?.id || input || ""));
}
