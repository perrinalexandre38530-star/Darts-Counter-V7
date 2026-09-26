// ============================================
// src/lib/resume.ts — Gestion des parties en cours (multi-slot)
// ============================================
import { History, type SavedMatch } from "./history";
import { scopedStorageKey } from "./storage";

const RESUME_INDEX_KEY = "dc-v5-resume-index";
const LAST_OPEN_KEY = "dc-v5-last-open-x01";
const resumeIndexStorageKey = () => scopedStorageKey(RESUME_INDEX_KEY);
const lastOpenStorageKey = () => scopedStorageKey(LAST_OPEN_KEY);

/** Lit l’index d’IDs de parties "en cours" (ordre récent → ancien) */
export function lireIndexReprise(): string[] {
  try {
    const scopedKey = resumeIndexStorageKey();
    const brut = localStorage.getItem(scopedKey) ?? localStorage.getItem(RESUME_INDEX_KEY);
    const arr = brut ? JSON.parse(brut) : [];
    const clean = Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
    // Migration transparente de l'ancien index non scopé vers le même espace
    // utilisateur que History.upsertInProgressCheckpoint().
    if (clean.length && !localStorage.getItem(scopedKey)) {
      try { localStorage.setItem(scopedKey, JSON.stringify([...new Set(clean)])); } catch {}
    }
    return clean;
  } catch {
    return [];
  }
}

/** Écrit l’index en imposant l’unicité et l’ordre donné */
export function ecrireIndexReprise(ids: string[]) {
  try {
    const uniq = [...new Set(ids.filter(Boolean))];
    localStorage.setItem(resumeIndexStorageKey(), JSON.stringify(uniq));
  } catch {}
}

/** Met une partie en tête de la liste "en cours" */
export function enregistrerPartieEnCours(id: string) {
  const ids = lireIndexReprise();
  ecrireIndexReprise([id, ...ids.filter((x) => x !== id)]);
}

/** Retire une partie de la liste "en cours" */
export function supprimerPartieEnCours(id: string) {
  const ids = lireIndexReprise();
  ecrireIndexReprise(ids.filter((x) => x !== id));
}

/** Mémorise la dernière partie ouverte (pour auto-reprise au besoin) */
export function enregistrerDernierePartie(id: string) {
  try {
    localStorage.setItem(lastOpenStorageKey(), id);
  } catch {}
}
export function lireDernierePartie(): string | undefined {
  try {
    return localStorage.getItem(lastOpenStorageKey()) || localStorage.getItem(LAST_OPEN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** Récupère la liste ordonnée des parties "en cours" (dédupliquée, robustifiée) */
export async function getPartiesEnCours(): Promise<SavedMatch[]> {
  // History.readAll() est un cache UI léger qui n'est volontairement PAS mis à
  // jour à chaque checkpoint gameplay. Pour la reprise, il faut lire la source
  // IndexedDB autoritaire via listInProgress()/list().
  const ids = lireIndexReprise();
  const map: Record<string, SavedMatch> = {};
  try {
    const all = typeof (History as any).listInProgress === "function"
      ? await (History as any).listInProgress()
      : await History.list();
    for (const rec of Array.isArray(all) ? all : []) {
      const id = String((rec as any)?.id ?? (rec as any)?.matchId ?? "").trim();
      if (!id) continue;
      const status = String((rec as any)?.status || "in_progress");
      if (status === "in_progress" || !status) map[id] = rec as SavedMatch;
    }
  } catch {
    // Fallback par index : hydrate chaque ligne individuellement.
    for (const id of ids) {
      try {
        const rec = await History.get(id);
        if (rec && String((rec as any)?.status || "in_progress") === "in_progress") map[id] = rec as SavedMatch;
      } catch {}
    }
  }

  const ordered: SavedMatch[] = [];
  for (const id of ids) if (map[id]) ordered.push(map[id]);
  for (const rec of Object.values(map)) {
    const id = String((rec as any)?.id ?? (rec as any)?.matchId ?? "");
    if (id && !ordered.find((r) => String((r as any)?.id ?? (r as any)?.matchId ?? "") === id)) ordered.push(rec);
  }

  const seen = new Set<string>();
  return ordered.filter((r) => {
    const id = String((r as any)?.id ?? (r as any)?.matchId ?? "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
