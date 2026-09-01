import { contentPackAssetUrl } from "./contentPacks";
const avatarLucky = contentPackAssetUrl("character-portraits", "loterie-bots/lucky.webp");
const avatarVega = contentPackAssetUrl("character-portraits", "loterie-bots/vega.webp");
const avatarAce = contentPackAssetUrl("character-portraits", "loterie-bots/ace.webp");
const avatarFortuna = contentPackAssetUrl("character-portraits", "loterie-bots/fortuna.webp");
const avatarJinx = contentPackAssetUrl("character-portraits", "loterie-bots/jinx.webp");
const avatarJack = contentPackAssetUrl("character-portraits", "loterie-bots/jack.webp");
const avatarMidas = contentPackAssetUrl("character-portraits", "loterie-bots/midas.webp");

export type DartsLoterieBotTrait =
  | "luck"
  | "jackpot"
  | "precision"
  | "intuition"
  | "chaos"
  | "control"
  | "strategy";

export type DartsLoterieBot = {
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
  source: "darts_loterie";
  systemBot: true;
  officialCharacter: true;
  locked: true;
  characterId: string;
  groupLabel: "Loterie IA";
  profileStarring: number;
  botLevel: string;
  level: string;
  avg3D: number;
  avg3: number;
  loterieAiTrait: DartsLoterieBotTrait;
  loterieRole: string;
  loterieLevelLabel: string;
};

function bot(
  id: string,
  name: string,
  avatar: string,
  stars: number,
  avg3D: number,
  trait: DartsLoterieBotTrait,
  role: string,
  levelLabel: string,
): DartsLoterieBot {
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
    source: "darts_loterie",
    systemBot: true,
    officialCharacter: true,
    locked: true,
    characterId: id.replace(/^bot_loterie_/, ""),
    groupLabel: "Loterie IA",
    profileStarring: stars,
    botLevel: `${stars}/5`,
    level: stars >= 5 ? "legend" : stars >= 4.5 ? "pro" : stars >= 4 ? "strong" : stars >= 3.5 ? "mixte" : "medium",
    avg3D,
    avg3: avg3D,
    loterieAiTrait: trait,
    loterieRole: role,
    loterieLevelLabel: levelLabel,
  };
}

/**
 * Casting IA officiel du mode LOTERIE.
 * Il remplace les anciens BOTS IA PRO génériques uniquement dans ce mode.
 * Les BOTS CPU personnels restent ajoutés séparément dans LoterieConfig.
 */
export const DARTS_LOTERIE_BOTS: DartsLoterieBot[] = [
  bot("bot_loterie_lucky", "Lucky", avatarLucky, 3.5, 68, "luck", "Spécialiste du hasard", "Avancé"),
  bot("bot_loterie_vega", "Vega", avatarVega, 4, 76, "jackpot", "Reine du jackpot", "Confirmée"),
  bot("bot_loterie_ace", "Ace", avatarAce, 4.5, 88, "precision", "As de la précision", "Expert"),
  bot("bot_loterie_fortuna", "Fortuna", avatarFortuna, 4.5, 84, "intuition", "Maîtresse du destin", "Experte"),
  bot("bot_loterie_jinx", "Jinx", avatarJinx, 3.5, 72, "chaos", "Chaos maîtrisé", "Avancée"),
  bot("bot_loterie_jack", "Jack", avatarJack, 4, 80, "control", "Maître du tirage", "Confirmé"),
  bot("bot_loterie_midas", "Midas", avatarMidas, 5, 98, "strategy", "Roi de la stratégie", "Élite"),
];

export const DARTS_LOTERIE_BOT_IDS = new Set(DARTS_LOTERIE_BOTS.map((item) => item.id));

export function isDartsLoterieBot(input: any): boolean {
  return DARTS_LOTERIE_BOT_IDS.has(String(input?.id || input || ""));
}