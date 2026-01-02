// ============================================
// src/lib/x01AutosaveV3.ts
// Autosave X01 V3 (moteur neuf)
// - Sauvegarde un snapshot "en cours" dans localStorage
// - Permet de recharger/reprendre une partie X01 V3
// - Pensé pour être utilisé dans X01PlayV3.tsx
// ============================================

export type X01V3Snapshot = any;

export type X01V3AutosaveMeta = {
  matchId?: string | null;
  profileIds?: string[]; // joueurs impliqués
  createdAt?: number;    // date de création de la partie
};

export type X01V3AutosavePayload = {
  snapshot: X01V3Snapshot;
  meta: X01V3AutosaveMeta;
};

const KEY = "dc_x01v3_autosave_v1";

/**
 * Sauvegarde un snapshot courant.
 * - snapshot: ce que te renvoie ton moteur X01 V3 (engine.exportSnapshot / engine.state…)
 * - meta: infos utiles pour l’UI (liste joueurs, date, matchId éventuel)
 */
export function saveX01V3Autosave(
  snapshot: X01V3Snapshot,
  meta: X01V3AutosaveMeta = {}
): void {
  if (typeof window === "undefined") return;
  try {
    if (!snapshot) {
      // Si on passe null / undefined => on efface
      window.localStorage.removeItem(KEY);
      return;
    }

    const payload: X01V3AutosavePayload = {
      snapshot,
      meta: {
        ...meta,
        createdAt: meta.createdAt ?? Date.now(),
      },
    };

    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // silencieux (pas grave si l'autosave ne marche pas)
  }
}

/**
 * Charge le dernier autosave X01 V3 (s'il existe).
 * Renvoie:
 *   - { snapshot, meta }  si trouvé
 *   - null                si rien / invalide
 */
export function loadX01V3Autosave(): X01V3AutosavePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as X01V3AutosavePayload;

    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.snapshot) return null;

    return {
      snapshot: parsed.snapshot,
      meta: parsed.meta || {},
    };
  } catch {
    return null;
  }
}

/**
 * Efface l'autosave X01 V3 (appelé à la fin d'un match, par ex.).
 */
export function clearX01V3Autosave(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // silencieux
  }
}
