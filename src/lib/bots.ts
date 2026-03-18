import { nanoid } from 'nanoid';

export const LS_BOTS_KEY = 'dc_bots_v1';
export const MAX_BOTS_STORAGE_BYTES = 350 * 1024;

export type BotLevel = 'easy' | 'medium' | 'strong' | 'pro' | 'legend';

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
  type?: 'bot';
  kind?: 'bot';
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
  type: 'bot';
  kind: 'bot';
  cpu: true;
  botLevel?: string | null;
  level?: BotLevel;
  avatarSeed?: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function estimateBytes(value: string): number {
  try {
    return new Blob([value]).size;
  } catch {
    return value.length * 2;
  }
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      console.error(`[bots] quota exceeded for key=${key}`);
      return false;
    }
    console.error(`[bots] localStorage setItem failed for key=${key}`, err);
    return false;
  }
}

export function normalizeBotLevel(input: any): BotLevel {
  const v = String(input || '').trim().toLowerCase();
  if (v === 'easy' || v === 'medium' || v === 'strong' || v === 'pro' || v === 'legend') return v;
  if (v === 'hard' || v === 'fort') return 'strong';
  if (v === 'debutant' || v === 'débutant') return 'easy';
  if (v === 'standard' || v === 'regular') return 'medium';
  if (v === 'legende' || v === 'légende') return 'legend';
  return 'easy';
}

function sanitizeAvatarDataUrl(input: any): string | null {
  const value =
    typeof input?.avatarDataUrl === 'string' && input.avatarDataUrl
      ? input.avatarDataUrl
      : typeof input?.avatarUrl === 'string' && input.avatarUrl
        ? input.avatarUrl
        : typeof input?.avatar === 'string' && input.avatar
          ? input.avatar
          : null;

  if (!value) return null;
  if (!value.startsWith('data:')) return value;

  // Évite l’explosion du quota localStorage avec des avatars base64 trop lourds.
  return value.length <= 120_000 ? value : null;
}

function pruneBotForStorage(input: any): BotRecord {
  const level = normalizeBotLevel(input?.level ?? input?.botLevel);
  const nowIso = new Date().toISOString();

  return {
    id: String(input?.id || nanoid()),
    name: String(input?.name || 'BOT'),
    level,
    botLevel: String(input?.botLevel || level),
    avatarSeed: String(input?.avatarSeed || Math.random().toString(36).slice(2, 10)),
    avatarDataUrl: sanitizeAvatarDataUrl(input),
    createdAt: String(input?.createdAt || nowIso),
    updatedAt: String(input?.updatedAt || nowIso),
    isBot: true,
    type: 'bot',
    kind: 'bot',
    bot: true,
    cpu: true,
  };
}

export function normalizeBotRecord(input: any): BotRecord {
  return pruneBotForStorage(input);
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

export function loadBots(): BotRecord[] {
  if (typeof window === 'undefined') return [];
  return normalizeBotsList(safeParse<any[]>(safeGetItem(LS_BOTS_KEY), []));
}

function compactBotsForStorage(list: any[]): BotRecord[] {
  const normalized = normalizeBotsList(Array.isArray(list) ? list : []);
  return normalized.map(pruneBotForStorage);
}

export function saveBots(list: any[]): boolean {
  if (typeof window === 'undefined') return false;

  const compact = compactBotsForStorage(list);
  let payload = JSON.stringify(compact);

  if (estimateBytes(payload) <= MAX_BOTS_STORAGE_BYTES) {
    return safeSetItem(LS_BOTS_KEY, payload);
  }

  // Deuxième tentative : on supprime tous les avatars base64.
  const withoutAvatars = compact.map((bot) => ({ ...bot, avatarDataUrl: null }));
  payload = JSON.stringify(withoutAvatars);

  if (estimateBytes(payload) <= MAX_BOTS_STORAGE_BYTES) {
    console.warn('[bots] payload too large, avatars removed before save');
    return safeSetItem(LS_BOTS_KEY, payload);
  }

  console.error(`[bots] payload too large for localStorage (${estimateBytes(payload)} bytes), save skipped`);
  return false;
}

export function toBotPlayerLite(input: any): BotPlayerLite {
  const bot = normalizeBotRecord(input);
  return {
    id: bot.id,
    name: bot.name,
    avatarDataUrl: bot.avatarDataUrl ?? null,
    isBot: true,
    bot: true,
    type: 'bot',
    kind: 'bot',
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
    input?.type === 'bot' ||
    input?.kind === 'bot' ||
    String(input?.id || '').startsWith('bot_') ||
    input?.botLevel
  );
}

// Aliases de compat pour les écrans qui utilisent une API plus parlante
export type StoredBotLevel = BotLevel;
export type StoredBot = BotRecord;
export const loadStoredBots = loadBots;
export const saveStoredBots = saveBots;
export const loadBotsAsPlayers = loadBotPlayers;
