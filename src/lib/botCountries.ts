import { COUNTRY_NAME_TO_CODE } from "./countryNames";

export type BotCountryCode = string;

const PRO_BOT_COUNTRY_BY_ID: Record<string, BotCountryCode> = {
  pro_mvg: "NL",
  pro_wright: "SCO",
  pro_littler: "ENG",
  pro_price: "WAL",
  pro_anderson: "SCO",
  pro_humphries: "ENG",
  pro_taylor: "ENG",
  pro_smith: "ENG",
  pro_aspinall: "ENG",
  pro_dobey: "ENG",
  pro_clayton: "WAL",
  pro_jackpot: "ENG",
  pro_crafty: "ENG",
  pro_barney: "NL",
  pro_darth_maple: "CA",
  pro_menace: "ENG",
  pro_the_giant: "NL",
  pro_the_hammer: "ENG",
  pro_voltage: "ENG",
  pro_one_dart: "ENG",
};

const PRO_BOT_COUNTRY_BY_NAME: Record<string, BotCountryCode> = {
  greenmachine: "NL",
  snakeking: "SCO",
  wonderkid: "ENG",
  iceman: "WAL",
  theiceman: "WAL",
  flyingscotsman: "SCO",
  theflyingscotsman: "SCO",
  coolhand: "ENG",
  thepower: "ENG",
  bullyboy: "ENG",
  theasp: "ENG",
  hollywood: "ENG",
  theferret: "WAL",
  jackpot: "ENG",
  crafty: "ENG",
  craftycockney: "ENG",
  thecraftycockney: "ENG",
  barney: "NL",
  darthmaple: "CA",
  themenace: "ENG",
  thegiant: "NL",
  thehammer: "ENG",
  voltage: "ENG",
  onedart: "ENG",
};

const COUNTRY_ALIASES: Record<string, BotCountryCode> = {
  uk: "GB",
  unitedkingdom: "GB",
  royaumeuni: "GB",
  grandebretagne: "GB",
  england: "ENG",
  angleterre: "ENG",
  english: "ENG",
  scotland: "SCO",
  ecosse: "SCO",
  scottish: "SCO",
  wales: "WAL",
  paysdegalles: "WAL",
  welsh: "WAL",
  netherlands: "NL",
  paysbas: "NL",
  hollande: "NL",
  canada: "CA",
};

function compact(value: any): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function emojiFlagToIso2(value: string): string | null {
  const chars = Array.from(value.trim());
  if (chars.length !== 2) return null;
  const a = chars[0]?.codePointAt(0) || 0;
  const b = chars[1]?.codePointAt(0) || 0;
  if (a < 0x1f1e6 || a > 0x1f1ff || b < 0x1f1e6 || b > 0x1f1ff) return null;
  return String.fromCharCode(65 + a - 0x1f1e6, 65 + b - 0x1f1e6);
}

export function normalizeBotCountryCode(value: any): BotCountryCode | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const emojiCode = emojiFlagToIso2(raw);
  if (emojiCode) return emojiCode;

  const upper = raw.toUpperCase().replace(/_/g, "-");
  if (upper === "UK") return "GB";
  if (["ENG", "SCO", "WAL"].includes(upper)) return upper;
  if (upper === "GB-ENG") return "ENG";
  if (upper === "GB-SCT" || upper === "GB-SCO") return "SCO";
  if (upper === "GB-WLS" || upper === "GB-WAL") return "WAL";
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const key = compact(raw);
  const alias = COUNTRY_ALIASES[key];
  if (alias) return alias;
  const mapped = (COUNTRY_NAME_TO_CODE as Record<string, string>)[key];
  return mapped ? String(mapped).toUpperCase() : null;
}

function canonicalBotId(input: any): string {
  let id = compact(input);
  if (id.startsWith("bot")) id = id.slice(3);
  return id;
}

export function resolveProBotCountryCode(input: any): BotCountryCode | null {
  const explicit = normalizeBotCountryCode(
    input?.countryCode ??
      input?.country_code ??
      input?.country ??
      input?.countryName ??
      input?.nation ??
      input?.nationality ??
      input?.privateInfo?.countryCode ??
      input?.privateInfo?.country ??
      null
  );
  if (explicit) return explicit;

  const idCandidates = [input?.id, input?.botId, input?.avatarKey];
  for (const candidate of idCandidates) {
    const raw = String(candidate || "").trim().toLowerCase();
    const withoutBotPrefix = raw.startsWith("bot_") ? raw.slice(4) : raw;
    const direct = PRO_BOT_COUNTRY_BY_ID[withoutBotPrefix];
    if (direct) return direct;

    const compactId = canonicalBotId(candidate);
    for (const [knownId, code] of Object.entries(PRO_BOT_COUNTRY_BY_ID)) {
      if (compact(knownId) === compactId) return code;
    }
  }

  const nameKey = compact(input?.name ?? input?.displayName ?? input?.nickname ?? "");
  return PRO_BOT_COUNTRY_BY_NAME[nameKey] || null;
}

export function withResolvedBotCountry<T extends Record<string, any>>(bot: T): T & { countryCode?: string | null } {
  const countryCode = resolveProBotCountryCode(bot);
  return countryCode ? ({ ...bot, countryCode } as T & { countryCode: string }) : ({ ...bot } as T & { countryCode?: null });
}

export function applyResolvedBotCountries<T extends Record<string, any>>(bots: T[]): Array<T & { countryCode?: string | null }> {
  return (Array.isArray(bots) ? bots : []).map(withResolvedBotCountry);
}
