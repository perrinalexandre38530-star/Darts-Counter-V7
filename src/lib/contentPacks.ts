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

const STATE_KEY = "mss_content_packs_v1";
export const CONTENT_PACK_CACHE = "mss-content-packs-v1";
export const CONTENT_PACK_BASE_URL = String(
  (import.meta as any)?.env?.VITE_CONTENT_PACK_BASE_URL ||
    "https://pub-170ceab787594ee9a09d6315358fb928.r2.dev/mss-content-packs/v1"
).replace(/\/+$/, "");

export const CONTENT_PACK_META: Record<ContentPackId, { title: string; subtitle: string }> = {
  "fit-awena": {
    title: "FIT PERF · Médias AWENA",
    subtitle: "Vidéos, étapes d’exercices, tickers et médias FIT PERF.",
  },
  "navigation-music": {
    title: "Musiques de navigation",
    subtitle: "Playlist complète MULTISPORTS SCORING, installable hors ligne.",
  },
  "collectible-cards": {
    title: "Cartes à débloquer HD",
    subtitle: "Cartes de collection haute définition des modes et personnages.",
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

export function contentPackAssetUrl(packId: ContentPackId, relativePath: string): string {
  const clean = String(relativePath || "").replace(/^\/+/, "");
  return `${CONTENT_PACK_BASE_URL}/${encodeURIComponent(packId)}/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

export function contentPackInfo(packId: ContentPackId) {
  return CONTENT_PACK_CATALOG[packId];
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
  try {
    const response = await fetch(url, { cache: "no-store", credentials: "omit", mode: "cors" });
    if (response.ok) return response;
  } catch {}
  const opaque = await fetch(url, { cache: "no-store", credentials: "omit", mode: "no-cors" });
  return opaque;
}

export async function installContentPack(
  packId: ContentPackId,
  onProgress?: (progress: ContentPackProgress) => void
): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Le stockage hors ligne des packs n’est pas disponible sur cet appareil.");
  }
  const pack = CONTENT_PACK_CATALOG[packId];
  const cache = await window.caches.open(CONTENT_PACK_CACHE);
  let completedFiles = 0;
  let completedBytes = 0;
  const totalFiles = pack.files.length;
  const totalBytes = Number(pack.totalBytes || 0);

  for (const file of pack.files) {
    const url = contentPackAssetUrl(packId, file.path);
    const existing = await cache.match(url);
    if (!existing) {
      const response = await fetchPackAsset(url);
      if (response.type !== "opaque" && !response.ok) throw new Error(`Téléchargement impossible : ${file.path}`);
      await cache.put(url, response.clone());
    }
    completedFiles += 1;
    completedBytes += Number(file.bytes || 0);
    onProgress?.({ packId, completedFiles, totalFiles, completedBytes, totalBytes, currentPath: file.path });
  }

  const next = readState();
  next[packId] = { installed: true, version: pack.version, installedAt: Date.now() };
  writeState(next);
}

export async function removeContentPack(packId: ContentPackId): Promise<void> {
  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await window.caches.open(CONTENT_PACK_CACHE);
    const pack = CONTENT_PACK_CATALOG[packId];
    await Promise.all(pack.files.map((file) => cache.delete(contentPackAssetUrl(packId, file.path))));
  }
  const next = readState();
  next[packId] = { installed: false, version: null, installedAt: null };
  writeState(next);
}

export async function contentPackCachedBytes(packId: ContentPackId): Promise<number> {
  return getContentPackStatus(packId).installed ? Number(CONTENT_PACK_CATALOG[packId].totalBytes || 0) : 0;
}
