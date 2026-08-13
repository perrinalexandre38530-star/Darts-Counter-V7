// =============================================================
// src/lib/avatarGallery.ts
// Galerie centrale des avatars/logo du compte utilisateur.
// - Stockage local léger, dédupliqué par hash simple
// - Compatible profils locaux, bots CPU, teams, Avatar IA, profil actif
// =============================================================

import { captureUserMediaFallback, galleryItemMediaKey } from "./userMediaFallback";
import { deleteDirectR2MediaFallback } from "./directR2BackupApi";
import { emitCloudChange } from "./cloudEvents";

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
const MAX_ITEMS = 180;
// localStorage est réservé à un index léger. Les originaux sont dans IndexedDB/R2.
const MAX_LOCAL_STORAGE_CHARS = 600_000;
const MAX_LOCAL_STORAGE_ITEMS = 64;
const MAX_INLINE_SRC_CHARS = 60_000;

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
  // Les blob: sont temporaires et deviennent vite invalides après navigation/rerender.
  // La galerie doit uniquement stocker des sources durables.
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/media/") || value.startsWith("/images/");
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

const pendingGalleryCaptures = new Map<string, AvatarGalleryItem>();
let galleryCaptureRunning = false;
let galleryCaptureTimer: number | null = null;

function persistableGalleryItems(items: AvatarGalleryItem[]): AvatarGalleryItem[] {
  const out: AvatarGalleryItem[] = [];
  let chars = 2;
  for (const item of items) {
    if (out.length >= MAX_LOCAL_STORAGE_ITEMS) break;
    const src = String(item?.src || "").trim();
    if (!src) continue;
    // Les grosses data URLs ne doivent jamais revenir dans localStorage. Elles
    // restent disponibles via le coffre média IndexedDB/R2 et les profils sources.
    if (src.startsWith("data:image/") && src.length > MAX_INLINE_SRC_CHARS) continue;
    let rowChars = 0;
    try { rowChars = JSON.stringify(item).length + 1; } catch { continue; }
    if (chars + rowChars > MAX_LOCAL_STORAGE_CHARS) continue;
    out.push(item);
    chars += rowChars;
  }
  return out;
}

function persistGalleryIndex(
  accountId: string | null | undefined,
  items: AvatarGalleryItem[],
): { items: AvatarGalleryItem[]; changed: boolean } {
  if (typeof window === "undefined") return { items, changed: false };
  const compact = persistableGalleryItems(items);
  try {
    const key = avatarGalleryKey(accountId);
    const serialized = JSON.stringify(compact);
    const previous = window.localStorage.getItem(key);
    if (previous !== serialized) {
      window.localStorage.setItem(key, serialized);
      return { items: compact, changed: true };
    }
    return { items: compact, changed: false };
  } catch {
    try {
      const key = avatarGalleryKey(accountId);
      const fallback = compact.slice(0, 32);
      const serialized = JSON.stringify(fallback);
      const previous = window.localStorage.getItem(key);
      if (previous !== serialized) {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, serialized);
        return { items: fallback, changed: true };
      }
      return { items: fallback, changed: false };
    } catch {}
  }
  return { items: compact, changed: false };
}

function scheduleGalleryCaptures(items: AvatarGalleryItem[]): void {
  for (const item of items) {
    if (!item?.id || !item?.src) continue;
    pendingGalleryCaptures.set(String(item.id), item);
  }
  if (galleryCaptureRunning || galleryCaptureTimer != null || typeof window === "undefined") return;
  galleryCaptureTimer = window.setTimeout(() => {
    galleryCaptureTimer = null;
    void (async () => {
      if (galleryCaptureRunning) return;
      galleryCaptureRunning = true;
      try {
        while (pendingGalleryCaptures.size > 0) {
          const first = pendingGalleryCaptures.entries().next().value as [string, AvatarGalleryItem] | undefined;
          if (!first) break;
          pendingGalleryCaptures.delete(first[0]);
          const item = first[1];
          await captureUserMediaFallback(galleryItemMediaKey(item.id), String(item.src || ""), {
            kind: "gallery_item",
            updatedAt: Number(item.updatedAt || Date.now()),
          }).catch(() => "");
        }
      } finally {
        galleryCaptureRunning = false;
        if (pendingGalleryCaptures.size > 0) scheduleGalleryCaptures([]);
      }
    })();
  }, 350);
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
  const key = avatarGalleryKey(accountId);
  const rawText = window.localStorage.getItem(key);
  const raw = safeJsonParse<any[]>(rawText, []);
  if (!Array.isArray(raw)) return [];
  const items = raw.map(normalizeItem).filter(Boolean).sort((a, b) => b!.updatedAt - a!.updatedAt) as AvatarGalleryItem[];
  // Migration automatique d'une ancienne galerie base64 surdimensionnée.
  if ((rawText || "").length > MAX_LOCAL_STORAGE_CHARS) persistGalleryIndex(accountId, items);
  return items;
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
  const persisted = persistGalleryIndex(accountId, safe);

  if (typeof window !== "undefined" && persisted.changed) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(AVATAR_GALLERY_EVENT, { detail: { accountId, count: safe.length, persisted: persisted.items.length } }));
    }, 0);
  }
  try { emitCloudChange("avatar-gallery:changed"); } catch {}

  // Capture séquentielle bornée : l'ancienne boucle lançait jusqu'à 260 conversions
  // image/R2 en parallèle et pouvait provoquer un pic mémoire massif.
  scheduleGalleryCaptures(safe);
  return safe;
}

export function upsertAvatarGalleryItem(accountId: string | null | undefined, input: Partial<AvatarGalleryItem>): AvatarGalleryItem[] {
  const item = normalizeItem(input);
  if (!item) return readAvatarGallery(accountId);
  return writeAvatarGallery(accountId, [item, ...readAvatarGallery(accountId)]);
}


export function deleteAvatarGalleryItem(accountId: string | null | undefined, itemId: string): AvatarGalleryItem[] {
  const id = String(itemId || "").trim();
  if (!id) return readAvatarGallery(accountId);
  const next = readAvatarGallery(accountId).filter((item) => String(item.id || "") !== id);
  void deleteDirectR2MediaFallback(galleryItemMediaKey(id)).catch(() => undefined);
  return writeAvatarGallery(accountId, next);
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
    const src = String(p.avatarUrl || p.avatarFullDataUrl || p.avatarThumbDataUrl || p.avatarDataUrl || p.avatar || "").trim();
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
    const src = String(b.avatarUrl || b.avatarFullDataUrl || b.avatarThumbDataUrl || b.avatarDataUrl || b.avatar || b.avatar || "").trim();
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
