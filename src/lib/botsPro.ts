// ============================================
// src/lib/botsPro.ts
// Bots IA "joueurs pro" prédéfinis
// - Liste centrale de bots inspirés des pros
// - Adaptateur vers ton type Profile
// ============================================

import type { Profile } from "./types";

// Ids internes des bots pro
export type BotId =
  | "pro_mvg"
  | "pro_wright"
  | "pro_littler"
  | "pro_price"
  | "pro_anderson"
  | "pro_humphries"
  | "pro_taylor"
  | "pro_smith"
  | "pro_aspinall"
  | "pro_dobey"
  | "pro_clayton"
  | "pro_jackpot"
  | "pro_crafty"
  | "pro_barney"
  | "pro_dobey_custom"
  | "pro_menace";

// Style de jeu (pour guider l'IA)
export type BotPlayStyle =
  | "power_scorer"
  | "checkout_master"
  | "ultra_regular"
  | "all_rounder";

// Descripteur d'un bot IA pro
export type ProBot = {
  id: BotId;
  displayName: string;       // Nom affiché (UI)
  avatarKey: string;         // Clé pour ton système d'avatars
  botLevel: 1 | 2 | 3 | 3.5 | 4 | 4.5 | 5;
  style: BotPlayStyle;
  targetAvg3: number;        // Objectif de moyenne (3 darts)
  checkoutSkill: "low" | "medium" | "high";
};

// Liste centrale des bots IA "pro"
export const PRO_BOTS: ProBot[] = [
  {
    id: "pro_mvg",
    displayName: "Green Machine",
    avatarKey: "pro_mvg",
    botLevel: 5,
    style: "power_scorer",
    targetAvg3: 104,
    checkoutSkill: "high",
  },
  {
    id: "pro_wright",
    displayName: "Snake King",
    avatarKey: "pro_wright",
    botLevel: 4,
    style: "checkout_master",
    targetAvg3: 98,
    checkoutSkill: "high",
  },
  {
    id: "pro_littler",
    displayName: "Wonder Kid",
    avatarKey: "pro_littler",
    botLevel: 5,
    style: "power_scorer",
    targetAvg3: 101,
    checkoutSkill: "medium",
  },
  {
    id: "pro_price",
    displayName: "Ice Man",
    avatarKey: "pro_price",
    botLevel: 4,
    style: "ultra_regular",
    targetAvg3: 99,
    checkoutSkill: "high",
  },
  {
    id: "pro_anderson",
    displayName: "The Flying Scotsman",
    avatarKey: "pro_anderson",
    botLevel: 4,
    style: "all_rounder",
    targetAvg3: 96,
    checkoutSkill: "medium",
  },
  {
    id: "pro_humphries",
    displayName: "Cool Hand",
    avatarKey: "pro_humphries",
    botLevel: 5,
    style: "ultra_regular",
    targetAvg3: 102,
    checkoutSkill: "high",
  },
  {
    id: "pro_taylor",
    displayName: "The Power",
    avatarKey: "pro_taylor",
    botLevel: 5,
    style: "checkout_master",
    targetAvg3: 103,
    checkoutSkill: "high",
  },
  {
    id: "pro_smith",
    displayName: "Bully Boy",
    avatarKey: "pro_smith",
    botLevel: 4,
    style: "power_scorer",
    targetAvg3: 98,
    checkoutSkill: "medium",
  },
  {
    id: "pro_aspinall",
    displayName: "The Asp",
    avatarKey: "pro_aspinall",
    botLevel: 4,
    style: "power_scorer",
    targetAvg3: 96,
    checkoutSkill: "medium",
  },
  {
    id: "pro_dobey",
    displayName: "Hollywood",
    avatarKey: "pro_dobey",
    botLevel: 3,
    style: "all_rounder",
    targetAvg3: 92,
    checkoutSkill: "medium",
  },
  {
    id: "pro_clayton",
    displayName: "The Ferret",
    avatarKey: "pro_clayton",
    botLevel: 4,
    style: "ultra_regular",
    targetAvg3: 95,
    checkoutSkill: "high",
  },
  {
    id: "pro_jackpot",
    displayName: "Jackpot",
    avatarKey: "pro_jackpot",
    botLevel: 4.5,
    style: "power_scorer",
    targetAvg3: 99,
    checkoutSkill: "high",
  },
  {
    id: "pro_crafty",
    displayName: "Crafty",
    avatarKey: "pro_crafty",
    botLevel: 5,
    style: "checkout_master",
    targetAvg3: 101,
    checkoutSkill: "high",
  },
  {
    id: "pro_barney",
    displayName: "Barney",
    avatarKey: "pro_barney",
    botLevel: 4.5,
    style: "ultra_regular",
    targetAvg3: 99,
    checkoutSkill: "high",
  },
  {
    id: "pro_dobey_custom",
    displayName: "Dobey",
    avatarKey: "pro_dobey_custom",
    botLevel: 3.5,
    style: "all_rounder",
    targetAvg3: 94,
    checkoutSkill: "medium",
  },
  {
    id: "pro_menace",
    displayName: "The Menace",
    avatarKey: "pro_menace",
    botLevel: 3,
    style: "all_rounder",
    targetAvg3: 91,
    checkoutSkill: "medium",
  },
];

// ---------------------------------------------------
// Adaptateur : ProBot -> Profile utilisable partout
// ---------------------------------------------------
export function proBotToProfile(bot: ProBot): Profile {
  // ⚠️ On reste minimal pour ne pas casser ton type Profile.
  // Si tu as d'autres champs obligatoires, tu peux les compléter ici.
  return {
    id: `bot_${bot.id}`,
    name: bot.displayName,
    isBot: true as any,
    // @ts-expect-error : dépend de la forme exacte de ton Profile
    botLevel: bot.botLevel,
    // @ts-expect-error : dépend de ton système d'avatar
    avatarKey: bot.avatarKey,
  } as Profile;
}
