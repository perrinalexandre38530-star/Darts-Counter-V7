/**
 * Sauvegardes locales des parties Darts non terminées.
 * Une clé par jeu évite de confondre un jeu principal avec sa variante.
 * Aucun envoi réseau : History V4 demeure l'unique source des parties terminées.
 */
export type DartsDraftMode = "five_lives" | "chase" | "halve_it" | "split_score";

export type DartsMatchDraft<T = Record<string, unknown>> = {
  version: 1;
  mode: DartsDraftMode;
  savedAt: number;
  config: Record<string, any>;
  snapshot: T;
};

const PREFIX = "mss_darts_unfinished_v1_";
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_CHARS = 600_000;
const MODES = new Set<DartsDraftMode>(["five_lives", "chase", "halve_it", "split_score"]);
const storageKey = (mode: DartsDraftMode) => `${PREFIX}${mode}`;

export function readDartsMatchDraft<T = Record<string, unknown>>(mode: DartsDraftMode): DartsMatchDraft<T> | null {
  if (!MODES.has(mode)) return null;
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw || raw.length > MAX_CHARS) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || value.mode !== mode || !Number.isFinite(value.savedAt)
      || value.savedAt > Date.now() + 60_000 || Date.now() - value.savedAt > MAX_AGE_MS
      || !value.config || typeof value.config !== "object" || Array.isArray(value.config)
      || !value.snapshot || typeof value.snapshot !== "object" || Array.isArray(value.snapshot)) return null;
    return value as DartsMatchDraft<T>;
  } catch { return null; }
}

export function writeDartsMatchDraft<T>(mode: DartsDraftMode, config: Record<string, any>, snapshot: T): boolean {
  if (!MODES.has(mode)) return false;
  try {
    // Ne pas conserver d'avatars base64 ni de fichiers médias dans le stockage local.
    // Les profils et leurs images sont résolus par l'application au chargement.
    const encoded = JSON.stringify({ version: 1, mode, savedAt: Date.now(), config, snapshot }, (key, value) => {
      if (typeof value === "string" && (value.startsWith("data:image/") || value.length > 100_000)) return null;
      return value;
    });
    if (encoded.length > MAX_CHARS) return false;
    localStorage.setItem(storageKey(mode), encoded);
    return true;
  } catch { return false; }
}

export function clearDartsMatchDraft(mode: DartsDraftMode): void {
  try { localStorage.removeItem(storageKey(mode)); } catch {}
}
