import targetLogo from "../assets/darts-brands/target.svg";
import winmauLogo from "../assets/darts-brands/winmau.svg";
import redDragonLogo from "../assets/darts-brands/red-dragon.svg";
import unicornLogo from "../assets/darts-brands/unicorn.svg";
import shotLogo from "../assets/darts-brands/shot.svg";
import harrowsLogo from "../assets/darts-brands/harrows.svg";
import loxleyLogo from "../assets/darts-brands/loxley.svg";
import xqMaxLogo from "../assets/darts-brands/xqmax.svg";

export type ProBotDartsBrandKey =
  | "target"
  | "winmau"
  | "red_dragon"
  | "unicorn"
  | "shot"
  | "harrows"
  | "loxley"
  | "xqmax";

export type ProBotDartsBrand = {
  key: ProBotDartsBrandKey;
  label: string;
  logo: string;
};

export const PRO_BOT_DARTS_BRANDS: Record<ProBotDartsBrandKey, ProBotDartsBrand> = {
  target: { key: "target", label: "Target", logo: targetLogo },
  winmau: { key: "winmau", label: "Winmau", logo: winmauLogo },
  red_dragon: { key: "red_dragon", label: "Red Dragon", logo: redDragonLogo },
  unicorn: { key: "unicorn", label: "Unicorn", logo: unicornLogo },
  shot: { key: "shot", label: "Shot Darts", logo: shotLogo },
  harrows: { key: "harrows", label: "Harrows", logo: harrowsLogo },
  loxley: { key: "loxley", label: "Loxley", logo: loxleyLogo },
  xqmax: { key: "xqmax", label: "XQ Max", logo: xqMaxLogo },
};

const PRO_BOT_DARTS_BRAND_BY_ID: Record<string, ProBotDartsBrandKey> = {
  pro_mvg: "winmau",
  pro_wright: "red_dragon",
  pro_littler: "target",
  pro_price: "red_dragon",
  pro_anderson: "unicorn",
  pro_humphries: "red_dragon",
  pro_taylor: "target",
  pro_smith: "shot",
  pro_aspinall: "target",
  pro_dobey: "target",
  pro_clayton: "red_dragon",
  pro_jackpot: "target",
  pro_crafty: "harrows",
  pro_barney: "target",
  pro_darth_maple: "loxley",
  pro_menace: "winmau",
  pro_the_giant: "winmau",
  pro_the_hammer: "xqmax",
  pro_voltage: "target",
  pro_one_dart: "winmau",
};

const PRO_BOT_DARTS_BRAND_BY_NAME: Record<string, ProBotDartsBrandKey> = {
  greenmachine: "winmau",
  snakeking: "red_dragon",
  snakebite: "red_dragon",
  wonderkid: "target",
  thenuke: "target",
  iceman: "red_dragon",
  theiceman: "red_dragon",
  flyingscotsman: "unicorn",
  theflyingscotsman: "unicorn",
  coolhand: "red_dragon",
  coolhandluke: "red_dragon",
  thepower: "target",
  bullyboy: "shot",
  theasp: "target",
  hollywood: "target",
  theferret: "red_dragon",
  jackpot: "target",
  crafty: "harrows",
  craftycockney: "harrows",
  thecraftycockney: "harrows",
  barney: "target",
  darthmaple: "loxley",
  themenace: "winmau",
  thegiant: "winmau",
  thehammer: "xqmax",
  voltage: "target",
  onedart: "winmau",
};

function compact(value: any): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeBrandKey(value: any): ProBotDartsBrandKey | null {
  const raw = compact(value);
  if (!raw) return null;
  const aliases: Record<string, ProBotDartsBrandKey> = {
    target: "target",
    targetdarts: "target",
    winmau: "winmau",
    reddragon: "red_dragon",
    reddragondarts: "red_dragon",
    unicorn: "unicorn",
    unicorndarts: "unicorn",
    shot: "shot",
    shotdarts: "shot",
    harrows: "harrows",
    harrowsdarts: "harrows",
    loxley: "loxley",
    loxleydarts: "loxley",
    xqmax: "xqmax",
    xqmaxdarts: "xqmax",
  };
  return aliases[raw] || null;
}

function normalizeBotId(value: any): string {
  let raw = String(value || "").trim().toLowerCase();
  if (raw.startsWith("bot_")) raw = raw.slice(4);
  return raw;
}

export function resolveProBotDartsBrandKey(input: any): ProBotDartsBrandKey | null {
  const explicit = normalizeBrandKey(
    input?.dartsBrandKey ??
      input?.dartBrandKey ??
      input?.dartsBrand ??
      input?.dartBrand ??
      input?.brand ??
      input?.profile?.dartsBrandKey ??
      input?.profile?.dartBrandKey ??
      null
  );
  if (explicit) return explicit;

  const candidates = [input?.id, input?.botId, input?.avatarKey, input?.profile?.id, input?.profile?.avatarKey];
  for (const candidate of candidates) {
    const direct = PRO_BOT_DARTS_BRAND_BY_ID[normalizeBotId(candidate)];
    if (direct) return direct;
  }

  const nameKey = compact(input?.name ?? input?.displayName ?? input?.nickname ?? input?.profile?.name ?? "");
  return PRO_BOT_DARTS_BRAND_BY_NAME[nameKey] || null;
}

export function getProBotDartsBrand(input: any): ProBotDartsBrand | null {
  const key = resolveProBotDartsBrandKey(input);
  return key ? PRO_BOT_DARTS_BRANDS[key] : null;
}

export function getProBotDartsBrandLogo(input: any): string | null {
  return getProBotDartsBrand(input)?.logo || null;
}

export function getProBotDartsBrandLabel(input: any): string | null {
  return getProBotDartsBrand(input)?.label || null;
}

export function applyResolvedProBotDartsBrands<T extends Record<string, any>>(items: T[]): Array<T & { dartsBrandKey?: ProBotDartsBrandKey }> {
  return (Array.isArray(items) ? items : []).map((item) => {
    const key = resolveProBotDartsBrandKey(item);
    return key ? { ...item, dartsBrandKey: key, dartBrandKey: key } : { ...item };
  });
}
