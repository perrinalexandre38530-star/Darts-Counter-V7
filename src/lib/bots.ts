import { markNasSyncDirty, pushNasSyncDirtyReason } from "./manualNasSync";
import { nanoid } from "nanoid";
import LZString from "lz-string";
import { MAX_AVATAR_DATA_URL_CHARS } from "./avatarSafe";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";

export const LS_BOTS_KEY = "dc_bots_v1";
export const LS_BOTS_AVATARS_KEY = "dc_bots_avatars_v1";
const BOTS_STORAGE_VERSION = 2;
const BOTS_CHANGED_EVENT = "dc:bots-changed";

export type BotLevel = "easy" | "medium" | "strong" | "pro" | "legend";

export type BotRecord = {
  id: string;
  name: string;
  level: BotLevel;
  botLevel?: string | null;
  avatarSeed: string;
  avatarDataUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  isBot?: boolean;
  type?: "bot";
  kind?: "bot";
  bot?: boolean;
  cpu?: boolean;
  [k: string]: any;
};

export type BotPlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot: true;
  bot: true;
  type: "bot";
  kind: "bot";
  cpu: true;
  botLevel?: string | null;
  level?: BotLevel;
  avatarSeed?: string;
};

type BotsMetaPayload = {
  v: number;
  items: any[];
};

type BotsAvatarsPayload = {
  v: number;
  items: Record<string, string>;
};

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err?.name === "QuotaExceededError") {
      console.error(`[bots] quota exceeded for key=${key}`);
      return false;
    }
    console.error(`[bots] setItem failed for key=${key}`, err);
    return false;
  }
}

function safeRemoveItem(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function dispatchBotsChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(BOTS_CHANGED_EVENT));
  } catch {}
}

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function byteSize(value: string): number {
  try {
    return new Blob([value]).size;
  } catch {
    return value.length * 2;
  }
}

function sanitizeAvatarDataUrl(input: any): string | null {
  if (!isNonEmptyString(input)) return null;
  const value = String(input).trim();
  if (!value.startsWith("data:image/")) return null;
  if (value.length > MAX_AVATAR_DATA_URL_CHARS) return null;
  return value;
}

function compressAvatar(dataUrl: string): string {
  return LZString.compressToUTF16(dataUrl);
}

function decompressAvatar(input: string): string | null {
  if (!isNonEmptyString(input)) return null;
  try {
    const out = LZString.decompressFromUTF16(input);
    return isNonEmptyString(out) ? out : null;
  } catch {
    return null;
  }
}

function packBotMeta(bot: BotRecord) {
  const {
    avatarDataUrl,
    avatar,
    avatarUrl,
    ...rest
  } = bot as any;

  // IMPORTANT PERF: ne jamais dupliquer le base64 avatar dans la méta.
  // Les avatars sont déjà stockés de manière séparée et compressée dans LS_BOTS_AVATARS_KEY.
  void avatarDataUrl;
  void avatar;
  void avatarUrl;

  return {
    ...rest,
    avatarDataUrl: null,
    avatarUrl: null,
    avatar: null,
  };
}

function buildAvatarCandidates(list: BotRecord[]) {
  return list
    .map((bot) => {
      const dataUrl = sanitizeAvatarDataUrl(
        bot.avatarDataUrl ?? (bot as any)?.avatar ?? (bot as any)?.avatarUrl ?? null
      );
      if (!dataUrl) return null;

      const compressed = compressAvatar(dataUrl);
      return {
        id: bot.id,
        compressed,
        rawBytes: byteSize(dataUrl),
        compressedBytes: byteSize(compressed),
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      compressed: string;
      rawBytes: number;
      compressedBytes: number;
    }>;
}

function trySaveAvatarsPayload(candidates: Array<{ id: string; compressed: string }>): boolean {
  const payload: BotsAvatarsPayload = {
    v: BOTS_STORAGE_VERSION,
    items: Object.fromEntries(candidates.map((x) => [x.id, x.compressed])),
  };
  return safeLocalStorageSetJson(LS_BOTS_AVATARS_KEY, payload, {
    compressAboveChars: 2000,
    imageMaxChars: 220000,
    sanitizeImages: false,
  });
}

function saveAvatarsWithPruning(list: BotRecord[]) {
  const candidates = buildAvatarCandidates(list)
    .sort((a, b) => b.compressedBytes - a.compressedBytes);

  if (!candidates.length) {
    safeRemoveItem(LS_BOTS_AVATARS_KEY);
    return;
  }

  const working = [...candidates];
  while (working.length > 0) {
    const ok = trySaveAvatarsPayload(working.map(({ id, compressed }) => ({ id, compressed })));
    if (ok) {
      const dropped = candidates.length - working.length;
      if (dropped > 0) {
        console.warn(`[bots] ${dropped} avatar(s) dropped to stay under storage quota`);
      }
      return;
    }
    working.shift();
  }

  console.warn("[bots] avatar storage disabled: quota still exceeded after pruning");
  safeRemoveItem(LS_BOTS_AVATARS_KEY);
}

export function normalizeBotLevel(input: any): BotLevel {
  const v = String(input || "").trim().toLowerCase();
  if (v === "easy" || v === "medium" || v === "strong" || v === "pro" || v === "legend") return v;
  if (v === "hard" || v === "fort") return "strong";
  if (v === "debutant" || v === "débutant") return "easy";
  if (v === "standard" || v === "regular") return "medium";
  if (v === "legende" || v === "légende") return "legend";
  return "easy";
}

export function normalizeBotRecord(input: any): BotRecord {
  const level = normalizeBotLevel(input?.level ?? input?.botLevel);
  const nowIso = new Date().toISOString();
  const avatarDataUrl = sanitizeAvatarDataUrl(
    input?.avatarDataUrl ?? input?.avatar ?? input?.avatarUrl ?? null
  );

  return {
    ...input,
    id: String(input?.id || nanoid()),
    name: String(input?.name || "BOT"),
    level,
    botLevel: String(input?.botLevel || level),
    avatarSeed: String(input?.avatarSeed || Math.random().toString(36).slice(2, 10)),
    avatarDataUrl,
    createdAt: String(input?.createdAt || nowIso),
    updatedAt: String(input?.updatedAt || nowIso),
    isBot: true,
    type: "bot",
    kind: "bot",
    bot: true,
    cpu: true,
  };
}

export function normalizeBotsList(list: any[]): BotRecord[] {
  const seen = new Set<string>();
  const out: BotRecord[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const bot = normalizeBotRecord(raw);
    if (!bot.id || seen.has(bot.id)) continue;
    seen.add(bot.id);
    out.push(bot);
  }
  return out;
}

function readLegacyInlineBots(): BotRecord[] {
  const raw = safeGetItem(LS_BOTS_KEY);
  const parsed = safeParseJson<any>(raw, []);
  if (Array.isArray(parsed)) {
    return normalizeBotsList(parsed);
  }
  if (parsed && Array.isArray(parsed.items)) {
    return normalizeBotsList(parsed.items);
  }
  return [];
}

function readBotsMeta(): BotRecord[] {
  const parsed = safeLocalStorageGetJson<any>(LS_BOTS_KEY, [] as any);
  if (Array.isArray(parsed)) {
    return normalizeBotsList(parsed);
  }
  if (parsed && Array.isArray(parsed.items)) {
    return normalizeBotsList(parsed.items);
  }
  return [];
}

function readAvatarsMap(): Record<string, string | null> {
  const parsed = safeLocalStorageGetJson<any>(LS_BOTS_AVATARS_KEY, null as any);
  if (!parsed || typeof parsed !== "object" || typeof parsed.items !== "object" || !parsed.items) {
    return {};
  }

  const out: Record<string, string | null> = {};
  for (const [botId, packed] of Object.entries(parsed.items as Record<string, any>)) {
    const avatar = typeof packed === "string" ? decompressAvatar(packed) : null;
    if (avatar) out[botId] = avatar;
  }
  return out;
}

export function loadBots(): BotRecord[] {
  if (typeof window === "undefined") return [];

  const metaBots = readBotsMeta();
  const avatarsMap = readAvatarsMap();

  const merged = metaBots.map((bot) => ({
    ...bot,
    avatarDataUrl:
      avatarsMap[bot.id] ??
      sanitizeAvatarDataUrl(bot.avatarDataUrl ?? (bot as any)?.avatar ?? (bot as any)?.avatarUrl ?? null) ??
      null,
  }));

  if (merged.length > 0) return normalizeBotsList(merged);

  return readLegacyInlineBots();
}

function persistBots(list: any[], opts?: { triggerCloud?: boolean; updateAppStore?: boolean; dispatch?: boolean }): boolean {
  if (typeof window === "undefined") return false;

  const normalized = normalizeBotsList(Array.isArray(list) ? list : []);
  const metaPayload: BotsMetaPayload = {
    v: BOTS_STORAGE_VERSION,
    items: normalized.map(packBotMeta),
  };

  let metaSaved = safeLocalStorageSetJson(LS_BOTS_KEY, metaPayload, {
    compressAboveChars: 1500,
    imageMaxChars: 120000,
  });
  if (!metaSaved) {
    try {
      safeRemoveItem(LS_BOTS_AVATARS_KEY);
      metaSaved = safeLocalStorageSetJson(LS_BOTS_KEY, metaPayload, {
        compressAboveChars: 1500,
        imageMaxChars: 120000,
      });
    } catch {}
  }
  if (!metaSaved) {
    console.warn("[bots] metadata save failed");
    return false;
  }

  saveAvatarsWithPruning(normalized);

  if (opts?.dispatch !== false) {
    dispatchBotsChanged();
  }

  try {
    const w: any = window as any;
    if (opts?.updateAppStore !== false && w?.__appStore?.update) {
      const liteForStore = normalized.map((bot: any) => ({
        ...bot,
        avatarDataUrl: null,
      }));
      w.__appStore.update((st: any) => ({ ...(st || {}), bots: liteForStore }));
    }
    if (opts?.triggerCloud !== false) {
      try {
        markNasSyncDirty("bots_save");
        pushNasSyncDirtyReason("bots_save");
      } catch {}
    }
  } catch {}
  return true;
}

export function saveBots(list: any[]): boolean {
  return persistBots(list, {
    triggerCloud: true,
    updateAppStore: true,
    dispatch: true,
  });
}

export function restoreBotsFromSnapshot(list: any[]): boolean {
  return persistBots(list, {
    triggerCloud: false,
    updateAppStore: false,
    dispatch: true,
  });
}

export function toBotPlayerLite(input: any): BotPlayerLite {
  const bot = normalizeBotRecord(input);
  return {
    id: bot.id,
    name: bot.name,
    avatarDataUrl: bot.avatarDataUrl ?? null,
    isBot: true,
    bot: true,
    type: "bot",
    kind: "bot",
    cpu: true,
    botLevel: bot.botLevel ?? bot.level,
    level: bot.level,
    avatarSeed: bot.avatarSeed,
  };
}

export function loadBotPlayers(): BotPlayerLite[] {
  return loadBots().map(toBotPlayerLite);
}

export function isBotLike(input: any): boolean {
  return !!(
    input?.isBot ||
    input?.bot ||
    input?.cpu ||
    input?.type === "bot" ||
    input?.kind === "bot" ||
    String(input?.id || "").startsWith("bot_") ||
    input?.botLevel
  );
}

export function subscribeBotsChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener("storage", handler);
  window.addEventListener(BOTS_CHANGED_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(BOTS_CHANGED_EVENT, handler as EventListener);
  };
}

// Aliases de compat pour les écrans qui utilisent une API plus parlante
export type StoredBotLevel = BotLevel;
export type StoredBot = BotRecord;
export const loadStoredBots = loadBots;
export const saveStoredBots = saveBots;
export const restoreStoredBots = restoreBotsFromSnapshot;
export const loadBotsAsPlayers = loadBotPlayers;
