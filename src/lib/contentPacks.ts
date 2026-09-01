import { CONTENT_PACK_CATALOG } from "./contentPackCatalog.generated";

export type ContentPackId = Extract<keyof typeof CONTENT_PACK_CATALOG, string>;
export type ContentPackStatus = {
  installed: boolean;
  version: string | null;
  installedAt: number | null;
};

export type ContentPackProgress = {
  packId: ContentPackId;
  completedFiles: number;
  totalFiles: number;
  completedBytes: number;
  totalBytes: number;
  currentPath?: string;
};

const STATE_KEY = "mss_content_packs_v3";
export const CONTENT_PACK_CACHE = "mss-content-packs-v3";
export const CONTENT_PACK_BASE_URL = String(
  (import.meta as any)?.env?.VITE_CONTENT_PACK_BASE_URL ||
    "https://mss-content-packs.perrin-alexandre38530.workers.dev/mss-content-packs/v1"
).replace(/\/+$/, "");

export const CONTENT_PACK_IDS = Object.keys(CONTENT_PACK_CATALOG) as ContentPackId[];

export const CONTENT_PACK_META: Record<ContentPackId, { title: string; subtitle: string; group: "sport" | "audio" | "visual" }> = {
  "fit-awena": {
    title: "FIT PERF · Médias AWENA",
    subtitle: "Vidéos, étapes d’exercices, motion capture et médias FIT PERF.",
    group: "sport",
  },
  "navigation-music": {
    title: "Musiques de navigation",
    subtitle: "Playlist complète MULTISPORTS SCORING, compressée en Opus et installable hors ligne.",
    group: "audio",
  },
  "collectible-cards": {
    title: "Cartes à débloquer HD",
    subtitle: "Cartes de collection haute définition des modes et personnages.",
    group: "visual",
  },
  "theme-textures": {
    title: "Textures de thèmes",
    subtitle: "Textures premium, graffiti, matériaux, arènes et thèmes post-apocalyptiques.",
    group: "visual",
  },
  "character-portraits": {
    title: "Personnages IA",
    subtitle: "Portraits Killer, Loterie et Firefighter chargés à la demande.",
    group: "visual",
  },
};

function readState(): Partial<Record<ContentPackId, ContentPackStatus>> {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STATE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(next: Partial<Record<ContentPackId, ContentPackStatus>>) {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mss:content-pack-state"));
  } catch {}
}

function encodePackPath(relativePath: string): string {
  const clean = String(relativePath || "").replace(/^\/+/, "");
  return clean.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

/**
 * Immutable, versioned URL. A new pack version gets a new path, so old CacheStorage
 * entries can never shadow a refreshed Cloudflare object.
 */
export function contentPackAssetUrl(packId: ContentPackId, relativePath: string): string {
  const clean = encodePackPath(relativePath);
  const version = encodeURIComponent(String(CONTENT_PACK_CATALOG[packId].version || "0"));
  return `${CONTENT_PACK_BASE_URL}/${encodeURIComponent(packId)}/${version}${clean ? `/${clean}` : ""}`;
}

export function contentPackManifestUrl(packId: ContentPackId): string {
  return contentPackAssetUrl(packId, "manifest.json");
}

export function contentPackInfo(packId: ContentPackId) {
  return CONTENT_PACK_CATALOG[packId];
}

export function contentPacksTotalBytes(): number {
  return CONTENT_PACK_IDS.reduce((total, id) => total + Number(CONTENT_PACK_CATALOG[id].totalBytes || 0), 0);
}

export function getContentPackStatus(packId: ContentPackId): ContentPackStatus {
  const current = readState()[packId];
  const wantedVersion = CONTENT_PACK_CATALOG[packId].version;
  return {
    installed: Boolean(current?.installed && current?.version === wantedVersion),
    version: current?.version || null,
    installedAt: current?.installedAt || null,
  };
}

export function subscribeContentPacks(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener("mss:content-pack-state", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("mss:content-pack-state", handler);
    window.removeEventListener("storage", handler);
  };
}

async function fetchPackAsset(url: string): Promise<Response> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok) {
    throw new Error(`Cloudflare Content Pack HTTP ${response.status}`);
  }
  return response;
}

/**
 * Petit test réseau utilisé par l'interface de réglages. Le Worker ne révèle aucun
 * secret : il ne sert que le préfixe public mss-content-packs/v1/ du bucket privé.
 */
export async function probeContentPackGateway(packId: ContentPackId = "theme-textures"): Promise<boolean> {
  try {
    const response = await fetch(contentPackManifestUrl(packId), {
      method: "HEAD",
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function packPathMarker(packId: ContentPackId): string {
  try {
    const base = new URL(CONTENT_PACK_BASE_URL);
    const basePath = base.pathname.replace(/\/+$/, "");
    return `${basePath}/${encodeURIComponent(packId)}/`;
  } catch {
    return `/${encodeURIComponent(packId)}/`;
  }
}

async function purgePackCacheEntries(packId: ContentPackId): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await window.caches.open(CONTENT_PACK_CACHE);
  const marker = packPathMarker(packId);
  const keys = await cache.keys();
  await Promise.all(keys.filter((request) => {
    try { return new URL(request.url).pathname.includes(marker); }
    catch { return request.url.includes(marker); }
  }).map((request) => cache.delete(request)));
}

export async function installContentPack(
  packId: ContentPackId,
  onProgress?: (progress: ContentPackProgress) => void
): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Le stockage hors ligne des packs n’est pas disponible sur cet appareil.");
  }

  const pack = CONTENT_PACK_CATALOG[packId];
  const current = readState()[packId];
  if (current?.version && current.version !== pack.version) await purgePackCacheEntries(packId);

  const cache = await window.caches.open(CONTENT_PACK_CACHE);
  let completedFiles = 0;
  let completedBytes = 0;
  let cursor = 0;
  const totalFiles = pack.files.length;
  const totalBytes = Number(pack.totalBytes || 0);
  const concurrency = Math.min(4, Math.max(1, totalFiles));

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= totalFiles) return;
      const file = pack.files[index];
      const url = contentPackAssetUrl(packId, file.path);
      const existing = await cache.match(url);

      if (!existing) {
        const response = await fetchPackAsset(url);
        await cache.put(url, response.clone());
      }

      completedFiles += 1;
      completedBytes += Number(file.bytes || 0);
      onProgress?.({
        packId,
        completedFiles,
        totalFiles,
        completedBytes,
        totalBytes,
        currentPath: file.path,
      });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const next = readState();
  next[packId] = { installed: true, version: pack.version, installedAt: Date.now() };
  writeState(next);
}

export async function removeContentPack(packId: ContentPackId): Promise<void> {
  await purgePackCacheEntries(packId);
  const next = readState();
  next[packId] = { installed: false, version: null, installedAt: null };
  writeState(next);
}

export async function contentPackCachedBytes(packId: ContentPackId): Promise<number> {
  return getContentPackStatus(packId).installed ? Number(CONTENT_PACK_CATALOG[packId].totalBytes || 0) : 0;
}
