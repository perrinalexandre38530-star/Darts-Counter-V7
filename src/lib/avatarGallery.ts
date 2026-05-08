// =============================================================
// src/lib/avatarGallery.ts
// Galerie centrale des avatars/logo du compte utilisateur.
// - Stockage local léger, dédupliqué par hash simple
// - Compatible profils locaux, bots CPU, teams, Avatar IA, profil actif
// =============================================================

export type AvatarGalleryCategory = "account" | "local" | "bot" | "team" | "ia";

export type AvatarGalleryItem = {
  id: string;
  category: AvatarGalleryCategory;
  ownerId?: string | null;
  ownerName?: string | null;
  name: string;
  src: string;
  createdAt: number;
  updatedAt: number;
  source?: string;
  hash?: string;
};

export const AVATAR_GALLERY_EVENT = "dc:avatar-gallery-changed";
const BASE_KEY = "dc_avatar_gallery_v1";
const MAX_ITEMS = 260;

function now() {
  return Date.now();
}

function safeAccountKey(accountId?: string | null) {
  const id = String(accountId || "").trim();
  return id ? id.replace(/[^a-zA-Z0-9_\-:.]/g, "_") : "local_device";
}

export function avatarGalleryKey(accountId?: string | null) {
  return `${BASE_KEY}:${safeAccountKey(accountId)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isValidSrc(src: any): src is string {
  const value = String(src || "").trim();
  if (!value) return false;
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/media/") || value.startsWith("/images/") || value.startsWith("blob:");
}

export function avatarGalleryHash(src: string): string {
  const s = String(src || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h${(h >>> 0).toString(16)}`;
}

function normalizeItem(input: Partial<AvatarGalleryItem>): AvatarGalleryItem | null {
  const src = String(input.src || "").trim();
  if (!isValidSrc(src)) return null;
  const category = (input.category || "local") as AvatarGalleryCategory;
  const hash = input.hash || avatarGalleryHash(src);
  const t = Number(input.updatedAt || input.createdAt || now());
  return {
    id: String(input.id || `${category}_${hash}`).trim(),
    category,
    ownerId: input.ownerId == null ? null : String(input.ownerId),
    ownerName: input.ownerName == null ? null : String(input.ownerName),
    name: String(input.name || input.ownerName || "Avatar").trim() || "Avatar",
    src,
    createdAt: Number(input.createdAt || t),
    updatedAt: t,
    source: input.source ? String(input.source) : undefined,
    hash,
  };
}

export function readAvatarGallery(accountId?: string | null): AvatarGalleryItem[] {
  if (typeof window === "undefined") return [];
  const raw = safeJsonParse<any[]>(window.localStorage.getItem(avatarGalleryKey(accountId)), []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeItem).filter(Boolean).sort((a, b) => b!.updatedAt - a!.updatedAt) as AvatarGalleryItem[];
}

export function writeAvatarGallery(accountId: string | null | undefined, items: AvatarGalleryItem[]): AvatarGalleryItem[] {
  const map = new Map<string, AvatarGalleryItem>();
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeItem(raw);
    if (!item) continue;
    const key = item.hash || `${item.category}:${item.ownerId || item.id}`;
    const prev = map.get(key);
    if (!prev || item.updatedAt >= prev.updatedAt) map.set(key, { ...prev, ...item, createdAt: prev?.createdAt || item.createdAt });
  }
  const safe = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ITEMS);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(avatarGalleryKey(accountId), JSON.stringify(safe));
      window.dispatchEvent(new CustomEvent(AVATAR_GALLERY_EVENT, { detail: { accountId, count: safe.length } }));
    } catch (error) {
      // En cas de quota, on conserve les entrées récentes et on réessaie.
      try {
        const compact = safe.slice(0, 120);
        window.localStorage.setItem(avatarGalleryKey(accountId), JSON.stringify(compact));
        window.dispatchEvent(new CustomEvent(AVATAR_GALLERY_EVENT, { detail: { accountId, count: compact.length } }));
        return compact;
      } catch {}
    }
  }
  return safe;
}

export function upsertAvatarGalleryItem(accountId: string | null | undefined, input: Partial<AvatarGalleryItem>): AvatarGalleryItem[] {
  const item = normalizeItem(input);
  if (!item) return readAvatarGallery(accountId);
  return writeAvatarGallery(accountId, [item, ...readAvatarGallery(accountId)]);
}

export function collectAvatarGalleryFromSources(opts: {
  accountId?: string | null;
  activeProfileId?: string | null;
  profiles?: any[];
  bots?: any[];
  teams?: any[];
  includeLegacyAiGallery?: boolean;
}): AvatarGalleryItem[] {
  const at = now();
  const out: AvatarGalleryItem[] = [];
  const push = (input: Partial<AvatarGalleryItem>) => {
    const item = normalizeItem(input);
    if (item) out.push(item);
  };

  for (const p of Array.isArray(opts.profiles) ? opts.profiles : []) {
    if (!p) continue;
    const ownerId = String(p.id || "").trim();
    const name = String(p.name || p.displayName || p.nickname || "Profil").trim();
    const src = String(p.avatarDataUrl || p.avatarFullDataUrl || p.avatarThumbDataUrl || p.avatarUrl || p.avatar || "").trim();
    if (!src) continue;
    const isAccount = String(ownerId) === String(opts.activeProfileId || opts.accountId || "");
    push({
      category: isAccount ? "account" : "local",
      ownerId,
      ownerName: name,
      name: isAccount ? `Profil actif · ${name}` : name,
      src,
      updatedAt: Number(p.avatarUpdatedAt || p.updatedAt || at),
      createdAt: Number(p.createdAt || at),
      source: isAccount ? "active_profile" : "local_profile",
    });
  }

  for (const b of Array.isArray(opts.bots) ? opts.bots : []) {
    if (!b) continue;
    const ownerId = String(b.id || "").trim();
    const name = String(b.name || b.displayName || "Bot CPU").trim();
    const src = String(b.avatarDataUrl || b.avatarFullDataUrl || b.avatarThumbDataUrl || b.avatarUrl || b.avatar || "").trim();
    if (!src) continue;
    push({ category: "bot", ownerId, ownerName: name, name, src, updatedAt: Number(b.avatarUpdatedAt || b.updatedAt || at), createdAt: Number(b.createdAt || at), source: "bot_cpu" });
  }

  for (const team of Array.isArray(opts.teams) ? opts.teams : []) {
    if (!team) continue;
    const ownerId = String(team.id || "").trim();
    const name = String(team.name || "Team").trim();
    const src = String(team.logoDataUrl || team.regionLogoDataUrl || team.logoUrl || team.avatarDataUrl || team.avatarUrl || "").trim();
    if (!src) continue;
    push({ category: "team", ownerId, ownerName: name, name, src, updatedAt: Number(team.updatedAt || at), createdAt: Number(team.createdAt || at), source: "team_logo" });
  }

  if (opts.includeLegacyAiGallery && typeof window !== "undefined") {
    const legacy = safeJsonParse<any[]>(window.localStorage.getItem("msc_avatar_ia_gallery_v1"), []);
    for (const item of Array.isArray(legacy) ? legacy : []) {
      const src = String(item?.dataUrl || item?.src || "").trim();
      if (!src) continue;
      push({ category: "ia", ownerId: String(item?.id || ""), ownerName: String(item?.name || "Avatar IA"), name: String(item?.name || "Avatar IA"), src, createdAt: Date.parse(item?.createdAt || "") || at, updatedAt: Date.parse(item?.createdAt || "") || at, source: "avatar_ia" });
    }
  }

  return out;
}

export function syncAvatarGalleryFromSources(opts: Parameters<typeof collectAvatarGalleryFromSources>[0]): AvatarGalleryItem[] {
  const accountId = opts.accountId || null;
  const existing = readAvatarGallery(accountId);
  const collected = collectAvatarGalleryFromSources(opts);
  return writeAvatarGallery(accountId, [...collected, ...existing]);
}
