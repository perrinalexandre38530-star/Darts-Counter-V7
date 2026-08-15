export const AWENA_BOT_ID = "bot_awena_official";

export const OFFICIAL_BOTS = [
  {
    id: AWENA_BOT_ID,
    name: "Awena",
    level: "pro",
    botLevel: "4.5/5",
    avatarSeed: "awena-official",
    avatarUrl: "/awena/awena-bot-medallion.webp",
    countryCode: "FR",
    country: "FR",
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    isBot: true,
    bot: true,
    cpu: true,
    type: "bot",
    kind: "bot",
    systemBot: true,
    locked: true,
    officialCharacter: true,
    characterId: "awena",
    targetAvg3: 92,
  },
] as const;

export function isOfficialBotId(id: unknown): boolean {
  const value = String(id || "");
  return OFFICIAL_BOTS.some((bot) => bot.id === value);
}

export function getOfficialBots(): any[] {
  return OFFICIAL_BOTS.map((bot) => ({ ...bot }));
}
