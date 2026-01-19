// ============================================
// src/lib/TrainingStore.ts
// Store IndexedDB / localStorage pour le Training
// ============================================

import { nanoid } from "nanoid";
import type { TrainingHit, TrainingSession, TrainingMode } from "./trainingTypes";
import type { Dart as UIDart } from "./types";

// --- STORAGE SIMPLE (tu pourras le migrer sur IndexedDB plus tard) ---

const TRAINING_HITS_KEY = "dc_training_hits_v1";
const TRAINING_SESSIONS_KEY = "dc_training_sessions_v1";

// Training X01 (stats complètes X01 solo)
const TRAINING_X01_STATS_KEY = "dc_training_x01_full_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * localStorage peut lever QuotaExceededError (souvent sur mobile / Safari / WebView).
 * On applique un "best-effort" : on prune les plus anciens éléments jusqu'à réussir.
 */
function isQuotaExceeded(err: unknown): boolean {
  const e = err as any;
  const name = String(e?.name || "");
  const msg = String(e?.message || "");
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(name) ||
    /quota/i.test(msg)
  );
}

function trySetItemWithPrune<T>(
  key: string,
  list: T[],
  prune: (current: T[]) => T[],
  opts?: { maxAttempts?: number },
): T[] {
  const maxAttempts = opts?.maxAttempts ?? 8;
  let current = list;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      localStorage.setItem(key, JSON.stringify(current));
      return current;
    } catch (err) {
      if (!isQuotaExceeded(err)) throw err;
      const next = prune(current);
      // si prune ne change rien, on stop (sinon boucle infinie)
      if (next.length === current.length) {
        // dernier recours: vider la clé pour éviter crashs en boucle
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        return [];
      }
      current = next;
    }
  }
  // dernier recours
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  return [];
}

// --------------------------------------------
// Types X01 — sessions complètes pour StatsHub
// --------------------------------------------

export type TrainingX01Session = {
  id: string;
  date: number;
  profileId: string;

  // stats globales
  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;

  // compteurs S / D / T / Miss / Bull / DBull / Bust
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  // anciens agrégats
  bySegment?: Record<string, number>;

  // nouveaux agrégats détaillés
  bySegmentS?: Record<string, number>;
  bySegmentD?: Record<string, number>;
  bySegmentT?: Record<string, number>;

  // détail fléchette par fléchette pour radar, barres, modal
  dartsDetail?: UIDart[];
};

// Liste complète (tu pourras optimiser avec de l'IDB si ça grossit)
function loadHits(): TrainingHit[] {
  return safeParse<TrainingHit[]>(localStorage.getItem(TRAINING_HITS_KEY), []);
}

function saveHits(list: TrainingHit[]) {
  // Prune progressif: on retire les plus anciens hits (ceux du début)
  // jusqu'à ce que ça rentre dans le quota.
  const pruned = trySetItemWithPrune(
    TRAINING_HITS_KEY,
    list,
    (cur) => {
      // garde ~75% des plus récents
      const keepFrom = Math.floor(cur.length * 0.25);
      return cur.slice(keepFrom);
    },
  );
  // Si on a dû prune, on remplace la liste en mémoire pour cohérence
  if (pruned.length !== list.length) {
    // nothing else to do (appelants reliront au besoin)
  }
}

function loadSessions(): TrainingSession[] {
  return safeParse<TrainingSession[]>(
    localStorage.getItem(TRAINING_SESSIONS_KEY),
    [],
  );
}

function saveSessions(list: TrainingSession[]) {
  // Les sessions peuvent grossir dans le temps. On garde les plus récentes.
  trySetItemWithPrune(TRAINING_SESSIONS_KEY, list, (cur) => {
    // garde les 200 plus récentes, sinon coupe la moitié la plus ancienne
    if (cur.length > 200) return cur.slice(cur.length - 200);
    const drop = Math.max(1, Math.floor(cur.length / 2));
    return cur.slice(drop);
  });
}

// ---- X01 solo: sessions complètes (Stats Training X01) ----

function loadX01Sessions(): TrainingX01Session[] {
  return safeParse<TrainingX01Session[]>(
    localStorage.getItem(TRAINING_X01_STATS_KEY),
    [],
  );
}

function saveX01Sessions(list: TrainingX01Session[]) {
  // Training X01 peut exploser le quota (dartsDetail). Stratégie:
  // 1) garder les N dernières sessions
  // 2) si encore trop gros, on retire dartsDetail des anciennes sessions
  // 3) si encore trop gros, on coupe plus agressivement
  const sorted = [...list].sort((a, b) => a.date - b.date); // ancien -> récent

  const prune = (cur: TrainingX01Session[]): TrainingX01Session[] => {
    // étape A: limiter aux 120 dernières
    if (cur.length > 120) return cur.slice(cur.length - 120);

    // étape B: enlever les détails des 80% plus anciennes
    const cutAt = Math.floor(cur.length * 0.2); // on conserve details sur les 20% + récentes
    const out = cur.map((s, idx) =>
      idx < cur.length - cutAt
        ? ({ ...s, dartsDetail: undefined } as TrainingX01Session)
        : s,
    );

    // si rien ne change (déjà sans details), coupe moitié
    const changed = out.some((s, i) => s.dartsDetail !== cur[i]?.dartsDetail);
    if (!changed) {
      const drop = Math.max(1, Math.floor(cur.length / 2));
      return cur.slice(drop);
    }
    return out;
  };

  trySetItemWithPrune(TRAINING_X01_STATS_KEY, sorted, prune);
}

// --- API PUBLIQUE ---

export const TrainingStore = {
  // ==========================
  // Modes "généraux" (Clock, etc.)
  // ==========================
  startSession(
    mode: TrainingMode,
    profileId: string | null,
    target?: string,
  ): TrainingSession {
    const sessions = loadSessions();
    const session: TrainingSession = {
      id: nanoid(),
      profileId,
      mode,
      createdAt: Date.now(),
      finishedAt: null,
      totalDarts: 0,
      totalHits: 0,
      target,
    };
    sessions.push(session);
    saveSessions(sessions);
    return session;
  },

  finishSession(sessionId: string) {
    const sessions = loadSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return;
    sessions[index] = {
      ...sessions[index],
      finishedAt: Date.now(),
    };
    saveSessions(sessions);
  },

  addHits(sessionId: string, hits: Omit<TrainingHit, "id" | "sessionId">[]) {
    const allHits = loadHits();
    const now = Date.now();
    const mapped: TrainingHit[] = hits.map((h) => ({
      ...h,
      id: nanoid(),
      sessionId,
      timestamp: now,
    }));
    allHits.push(...mapped);
    saveHits(allHits);

    // mettre à jour le résumé de session
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      const addedHits = mapped.filter((h) => h.isHit).length;
      sessions[idx] = {
        ...sessions[idx],
        totalDarts: sessions[idx].totalDarts + mapped.length,
        totalHits: sessions[idx].totalHits + addedHits,
      };
      saveSessions(sessions);
    }
  },

  // Pour l’écran d’évolution
  getSessionsForProfile(profileId: string | null): TrainingSession[] {
    return loadSessions()
      .filter((s) => s.profileId === profileId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getHitsForProfile(profileId: string | null): TrainingHit[] {
    return loadHits()
      .filter((h) => h.profileId === profileId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  // ==========================
  // Bloc spécifique Training X01
  // ==========================

  /**
   * Enregistre / met à jour une session X01 solo training.
   * Appelé depuis TrainingX01Play quand la partie se termine.
   */
  saveX01Session(session: TrainingX01Session) {
    const all = loadX01Sessions();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx === -1) {
      all.push(session);
    } else {
      all[idx] = session;
    }
    saveX01Sessions(all);
  },

  /**
   * Toutes les sessions X01 (tous profils confondus).
   */
  getAllX01Sessions(): TrainingX01Session[] {
    return loadX01Sessions().sort((a, b) => b.date - a.date);
  },

  /**
   * Sessions X01 pour un profil donné (StatsHub Training X01).
   */
  getX01SessionsForProfile(profileId: string | null): TrainingX01Session[] {
    if (!profileId) return [];
    return loadX01Sessions()
      .filter((s) => s.profileId === profileId)
      .sort((a, b) => b.date - a.date);
  },

  /**
   * Agrégat "toutes les fléchettes X01" pour un profil
   * Utilisé par le radar / barres (trainingDartsAll).
   */
  trainingDartsAll(profileId: string | null): UIDart[] {
    if (!profileId) return [];
    const sessions = loadX01Sessions()
      .filter((s) => s.profileId === profileId)
      .sort((a, b) => a.date - b.date);

    const all: UIDart[] = [];
    for (const s of sessions) {
      if (Array.isArray(s.dartsDetail)) {
        all.push(...s.dartsDetail);
      }
    }
    return all;
  },

  // Pour reset complet si besoin
  clearAll() {
    localStorage.removeItem(TRAINING_HITS_KEY);
    localStorage.removeItem(TRAINING_SESSIONS_KEY);
    localStorage.removeItem(TRAINING_X01_STATS_KEY);
  },
};
