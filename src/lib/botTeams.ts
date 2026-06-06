// ============================================
// src/lib/botTeams.ts
// Équipes BOTS PRO IA prédéfinies pour les modes par équipes.
// Répartition du plus fort au moins fort, avec niveau global utilisé par ProfileStarRing.
// ============================================

export type BotTeamTier = "elite" | "pro" | "challenger" | "mix";

export type BotTeamMember = {
  id: string;
  name: string;
  avatarKey: string;
  botLevel: 1 | 2 | 3 | 3.5 | 4 | 4.5 | 5;
  targetAvg3: number;
};

export type BotProTeam = {
  key: BotTeamTier;
  name: string;
  botLevel: 1 | 2 | 3 | 3.5 | 4 | 4.5 | 5;
  avg3D: number;
  members: BotTeamMember[];
};

export const BOT_PRO_TEAMS: BotProTeam[] = [
  {
    key: "elite",
    name: "BOT Élite",
    botLevel: 5,
    avg3D: 100,
    members: [
      { id: "bot_green_machine", name: "Green Machine", avatarKey: "pro_mvg", botLevel: 5, targetAvg3: 104 },
      { id: "bot_wonder_kid", name: "Wonder Kid", avatarKey: "pro_littler", botLevel: 5, targetAvg3: 101 },
      { id: "bot_cool_hand", name: "Cool Hand", avatarKey: "pro_humphries", botLevel: 5, targetAvg3: 102 },
      { id: "bot_the_power", name: "The Power", avatarKey: "pro_taylor", botLevel: 5, targetAvg3: 103 },
    ],
  },
  {
    key: "pro",
    name: "BOT Pro",
    botLevel: 4.5,
    avg3D: 90,
    members: [
      { id: "bot_crafty", name: "Crafty", avatarKey: "pro_crafty", botLevel: 5, targetAvg3: 101 },
      { id: "bot_jackpot", name: "Jackpot", avatarKey: "pro_jackpot", botLevel: 4.5, targetAvg3: 99 },
      { id: "bot_barney", name: "Barney", avatarKey: "pro_barney", botLevel: 4.5, targetAvg3: 99 },
      { id: "bot_ice_man", name: "Ice Man", avatarKey: "pro_price", botLevel: 4, targetAvg3: 99 },
    ],
  },
  {
    key: "challenger",
    name: "BOT Challenger",
    botLevel: 4,
    avg3D: 80,
    members: [
      { id: "bot_snake_king", name: "Snake King", avatarKey: "pro_wright", botLevel: 4, targetAvg3: 98 },
      { id: "bot_flying_scotsman", name: "Flying Scotsman", avatarKey: "pro_anderson", botLevel: 4, targetAvg3: 96 },
      { id: "bot_bully_boy", name: "Bully Boy", avatarKey: "pro_smith", botLevel: 4, targetAvg3: 98 },
      { id: "bot_the_ferret", name: "The Ferret", avatarKey: "pro_clayton", botLevel: 4, targetAvg3: 95 },
    ],
  },
  {
    key: "mix",
    name: "BOT Mixte",
    botLevel: 3.5,
    avg3D: 70,
    members: [
      { id: "bot_the_asp", name: "The Asp", avatarKey: "pro_aspinall", botLevel: 4, targetAvg3: 96 },
      { id: "bot_hollywood", name: "Hollywood", avatarKey: "pro_dobey", botLevel: 3, targetAvg3: 92 },
      { id: "bot_dobey", name: "Dobey", avatarKey: "pro_dobey_custom", botLevel: 3.5, targetAvg3: 94 },
      { id: "bot_the_menace", name: "The Menace", avatarKey: "pro_menace", botLevel: 3, targetAvg3: 91 },
    ],
  },
];

export const BOT_PRO_TEAM_BY_KEY = Object.fromEntries(BOT_PRO_TEAMS.map((team) => [team.key, team])) as Record<BotTeamTier, BotProTeam>;
