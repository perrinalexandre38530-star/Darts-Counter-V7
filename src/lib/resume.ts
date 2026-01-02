// ============================================
// src/lib/resume.ts — Gestion des parties en cours (multi-slot)
// ============================================
import { History, type SavedMatch } from "./history";

const RESUME_INDEX_KEY = "dc-v5-resume-index";
const LAST_OPEN_KEY = "dc-v5-last-open-x01";

/** Lit l’index d’IDs de parties "en cours" (ordre récent → ancien) */
export function lireIndexReprise(): string[] {
  try {
    const brut = localStorage.getItem(RESUME_INDEX_KEY);
    const arr = brut ? JSON.parse(brut) : [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Écrit l’index en imposant l’unicité et l’ordre donné */
export function ecrireIndexReprise(ids: string[]) {
  try {
    const uniq = [...new Set(ids.filter(Boolean))];
    localStorage.setItem(RESUME_INDEX_KEY, JSON.stringify(uniq));
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
    localStorage.setItem(LAST_OPEN_KEY, id);
  } catch {}
}
export function lireDernierePartie(): string | undefined {
  try {
    return localStorage.getItem(LAST_OPEN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** Récupère la liste ordonnée des parties "en cours" (dédupliquée, robustifiée) */
export async function getPartiesEnCours(): Promise<SavedMatch[]> {
  // On commence par l’index (ordre voulu), puis on reconcilie avec l’IDB
  const ids = lireIndexReprise();
  const map: Record<string, SavedMatch> = {};
  try {
    const all = await History.readAll?.(); // si dispo
    if (Array.isArray(all)) {
      for (const rec of all) {
        if (!rec?.id) continue;
        // statut explicite, ou payload/engine présent => in_progress
        const status = (rec.status || "in_progress") as any;
        if (status === "in_progress") map[rec.id] = rec;
      }
    } else {
      // fallback minimal
      for (const id of ids) {
        const rec = (History as any).getX01 ? (History as any).getX01(id) : await History.get(id);
        if (rec && (rec.status === "in_progress" || !rec.status)) map[id] = rec as SavedMatch;
      }
    }
  } catch {}

  // Construit la liste dans l’ordre de l’index, puis ajoute les "orphelines" éventuelles
  const ordered: SavedMatch[] = [];
  for (const id of ids) if (map[id]) ordered.push(map[id]);
  for (const rec of Object.values(map)) if (!ordered.find((r) => r.id === rec.id)) ordered.push(rec);

  // Déduplique et nettoie par sécurité (évite que toutes les cartes pointent vers le même ID)
  const seen = new Set<string>();
  const clean = ordered.filter((r) => {
    if (!r?.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return clean;
}
