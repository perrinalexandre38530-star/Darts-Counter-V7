// ============================================================
// src/hooks/useHomeStats.ts
// Agrégateur complet des stats pour la Home v2
// - Local X01 (History)
// - X01 Multi (History)
// - Online: uniquement matchs online déjà enregistrés dans History
// - Cricket (statsBridge)
// - Training X01 (lib/TrainingX01Store)
// - Tour de l’Horloge (TODO: TrainingStore)
// - Records globaux (fusion local + online + training)
// ============================================================

import { useEffect, useState } from "react";
import { History } from "../lib/history";
import { TrainingX01Store } from "../lib/TrainingX01Store";
import { getCricketProfileStats } from "../lib/statsBridge";

export type HomeStats = {
  global: any | null;
  multi: any | null;
  online: any | null;
  cricket: any | null;
  trainingX01: any | null;
  clock: any | null;
  records: any | null;
};

export function useHomeStats(activeProfileId: string | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    if (!activeProfileId) {
      setStats(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        // ---------------------------------
        // LOCAL X01 (legs / matchs classiques)
        // ---------------------------------
        const historyRowsRaw: any[] =
          ((await (History as any).listFinished?.()) ?? (await (History as any).list?.()) ?? []) as any[];
        const historyRows = await Promise.all(
          (Array.isArray(historyRowsRaw) ? historyRowsRaw : []).map(async (row: any) => {
            try {
              const id = String(row?.matchId ?? row?.id ?? "").trim();
              return id && typeof (History as any).get === "function" ? ((await (History as any).get(id)) || row) : row;
            } catch {
              return row;
            }
          })
        );

        const rowGame = (m: any) => String(m?.game ?? m?.kind ?? m?.mode ?? m?.payload?.game ?? m?.payload?.kind ?? m?.payload?.mode ?? "").toLowerCase();
        const rowPlayers = (m: any) => m?.players ?? m?.summary?.players ?? m?.summary?.perPlayer ?? m?.payload?.players ?? m?.payload?.summary?.players ?? [];
        const hasProfile = (m: any) => Array.isArray(rowPlayers(m)) && rowPlayers(m).some((p: any) => String(p?.profileId ?? p?.playerId ?? p?.id ?? "") === String(activeProfileId));

        const localMatches = historyRows.filter((m: any) => rowGame(m).includes("x01") && hasProfile(m));

        // ---------------------------------
        // X01 MULTI (tous joueurs, mode multi)
        // ---------------------------------
        const localMulti = historyRows.filter((m: any) => rowGame(m).includes("x01") && rowPlayers(m).length > 1);

        // ---------------------------------
        // TRAINING X01 (store localStorage existant)
        // ---------------------------------
        const allTraining = TrainingX01Store.getAll();
        const trainingX01 = allTraining.filter(
          (s) => s.profileId === activeProfileId
        );

        // ---------------------------------
        // TOUR DE L’HORLOGE
        // TODO : à brancher sur ton vrai TrainingStore
        // Pour l’instant : aucune session => null
        // ---------------------------------
        const clockSessions: any[] = []; // placeholder

        // ---------------------------------
        // CRICKET (agrégateur déjà existant)
        // ---------------------------------
        const cricket = await getCricketProfileStats(activeProfileId);

        // ---------------------------------
        // ONLINE
        // Source unique stats: uniquement les parties online déjà sauvegardées dans History.
        // Pas de lecture Supabase directe ici, sinon Home diverge de l'Historique.
        // ---------------------------------
        const onlineMatches: any[] = historyRows.filter((m: any) => {
          const src = String(m?.source ?? m?.origin ?? m?.payload?.source ?? m?.payload?.origin ?? "").toLowerCase();
          return src.includes("online") && hasProfile(m);
        });

        // ---------------------------------
        // RECORDS (fusion global local + online + training)
        // ---------------------------------
        const records = computeRecords({
          localMatches,
          onlineMatches,
          trainingX01,
        });

        const nextStats: HomeStats = {
          global: computeGlobal(localMatches),
          // ⬇⬇⬇  Ici on passe aussi le profileId pour calculer win%, bestVisit, etc.
          multi: computeX01Multi(localMulti, activeProfileId),
          online: computeOnline(onlineMatches),
          cricket,
          trainingX01: computeTrainingX01(trainingX01),
          clock: computeClock(clockSessions),
          records,
        };

        if (!cancelled) {
          setStats(nextStats);
        }
      } catch (e) {
        console.warn("[useHomeStats] error:", e);
        if (!cancelled) {
          setStats({
            global: null,
            multi: null,
            online: null,
            cricket: null,
            trainingX01: null,
            clock: null,
            records: null,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  return { loading, stats };
}

// ============================================================
// --------------- CALCULATEURS SIMPLIFIÉS ---------------------
// ============================================================

function computeGlobal(matches: any[] | null | undefined) {
  if (!matches || !matches.length) return null;

  const darts = matches.flatMap((m) => m.darts || []);
  if (!darts.length) {
    return {
      matches: matches.length,
      avg3: 0,
      last10: [],
    };
  }

  const sum = darts.reduce((a: number, b: number) => a + (b || 0), 0);
  const avg1 = sum / darts.length;
  const avg3 = avg1 * 3;

  return {
    matches: matches.length,
    avg3: Math.round(avg3),
    last10: matches.slice(-10).map((m) => m.avg3 || 0),
  };
}

/**
 * X01 MULTI (V3) — agrégat Home
 *
 * Retourne un objet du type :
 * {
 *   count:       nb de matchs (sessions)
 *   avg3d:       moyenne 3D globale
 *   avg:         (alias arrondi pour compat backward)
 *   winPct:      % de legs gagnés
 *   bestVisit:   meilleure mène
 *   bestCheckout:meilleure sortie
 *   minDarts:    leg le plus court
 *   tickerSlides:[ ... ] // pour le ticker "Derniers records" de la Home
 * }
 */
function computeX01Multi(
  matches: any[] | null | undefined,
  activeProfileId: string | null
) {
  if (!matches || !matches.length) return null;

  let sessions = 0;
  let totalScore = 0;
  let totalDarts = 0;
  let legsWon = 0;
  let legsPlayed = 0;
  let bestVisit = 0;
  let bestCheckout = 0;
  let minDarts = Infinity;

  for (const match of matches) {
    const summary: any = match.summary ?? match;
    const perPlayer: any[] =
      summary.perPlayer ?? summary.players ?? match.players ?? [];

    if (!perPlayer || !perPlayer.length) continue;

    // On cible le joueur du profil si possible, sinon tout le monde
    const playersForProfile = activeProfileId
      ? perPlayer.filter(
          (p) =>
            p.profileId === activeProfileId ||
            p.playerId === activeProfileId ||
            p.id === activeProfileId
        )
      : perPlayer;

    if (!playersForProfile.length) continue;

    sessions += 1;

    for (const p of playersForProfile) {
      const darts =
        Number(p.darts ?? p.totalDarts ?? p.stats?.darts ?? 0) || 0;
      const score =
        Number(
          p.totalScore ?? p.scored ?? p.pointsScored ?? p.score ?? 0
        ) || 0;
      const legsW = Number(p.legsWon ?? p.wins ?? 0) || 0;
      const legsP =
        Number(p.legsPlayed ?? p.legs ?? p.totalLegs ?? 0) || 0;

      totalDarts += darts;
      totalScore += score;
      legsWon += legsW;
      legsPlayed += legsP;

      const bv = Number(p.bestVisit ?? p.bestVisitScore ?? 0) || 0;
      if (bv > bestVisit) bestVisit = bv;

      const bco =
        Number(p.bestCheckout ?? p.bestCo ?? p.bestFinish ?? 0) || 0;
      if (bco > bestCheckout) bestCheckout = bco;

      const pMinDarts =
        Number(p.minDarts ?? p.bestLegDarts ?? p.fastestLeg ?? 0) || 0;
      if (pMinDarts > 0 && pMinDarts < minDarts) {
        minDarts = pMinDarts;
      }
    }
  }

  // Moyenne 3D globale
  const avg3d =
    totalDarts > 0 ? Number(((totalScore / totalDarts) * 3).toFixed(1)) : 0;
  const avgRounded = Math.round(avg3d);

  // Winrate sur les legs
  const winPct =
    legsPlayed > 0
      ? Number(((legsWon / legsPlayed) * 100).toFixed(0))
      : 0;

  const minDartsValue = minDarts === Infinity ? 0 : minDarts;

  const tickerSlides = [
    {
      id: "x01_multi_sessions",
      label: "Sessions X01 multi",
      value: String(sessions),
      subLabel: "Nombre total de matchs multi",
    },
    {
      id: "x01_multi_avg3d",
      label: "Moyenne 3D",
      value: avg3d.toFixed(1),
      subLabel: "Sur toutes les sessions multi",
    },
    {
      id: "x01_multi_winpct",
      label: "Winrate legs",
      value: `${winPct.toFixed(0)}%`,
      subLabel: "Legs gagnés / joués",
    },
    {
      id: "x01_multi_best_visit",
      label: "Meilleure mène",
      value: String(bestVisit || 0),
      subLabel: "Score max sur une volée",
    },
    {
      id: "x01_multi_best_co",
      label: "Meilleur checkout",
      value: bestCheckout ? String(bestCheckout) : "—",
      subLabel: "Plus grosse sortie réalisée",
    },
    {
      id: "x01_multi_min_darts",
      label: "Leg le plus court",
      value: minDartsValue ? `${minDartsValue}` : "—",
      subLabel: "Nb de fléchettes sur un leg gagné",
    },
  ];

  return {
    // ancien format (pour compat éventuelle)
    count: sessions,
    avg: avgRounded,

    // nouveau format + KPIs détaillés
    avg3d,
    winPct,
    bestVisit,
    bestCheckout,
    minDarts: minDartsValue,
    tickerSlides,
  };
}

function computeOnline(matches: any[] | null | undefined) {
  if (!matches || !matches.length) return null;

  const avg =
    matches.reduce((a: number, m: any) => a + (m.avg3 || 0), 0) /
    matches.length;

  return {
    count: matches.length,
    avg: Math.round(avg),
  };
}

function computeTrainingX01(sessions: any[] | null | undefined) {
  if (!sessions || !sessions.length) return null;

  const avg =
    sessions.reduce((a: number, s: any) => a + (s.avg3D || 0), 0) /
    sessions.length;

  return {
    count: sessions.length,
    avg: Math.round(avg),
  };
}

function computeClock(sessions: any[] | null | undefined) {
  if (!sessions || !sessions.length) return null;

  const hitRate =
    sessions.reduce((a: number, s: any) => a + (s.hitRate || 0), 0) /
    sessions.length;

  return {
    count: sessions.length,
    hitRate: Math.round(hitRate * 10) / 10,
  };
}

function computeRecords({
  localMatches,
  onlineMatches,
  trainingX01,
}: {
  localMatches: any[];
  onlineMatches: any[];
  trainingX01: any[];
}) {
  const all: any[] = [
    ...(localMatches || []),
    ...(onlineMatches || []),
    ...(trainingX01 || []),
  ];

  if (!all.length) return null;

  const bestAvg3 = Math.max(
    ...all.map((s) => Number(s.avg3 ?? s.avg3D ?? 0))
  );

  const bestVisit = Math.max(...all.map((s) => Number(s.bestVisit ?? 0)));

  const dartsCandidates = all
    .map((m) => Number(m.totalDarts501 ?? m.darts ?? m.dartsCount ?? 0))
    .filter((n) => n > 0);

  const minDarts501 =
    dartsCandidates.length > 0 ? Math.min(...dartsCandidates) : null;

  return {
    bestAvg3,
    bestVisit,
    minDarts501,
  };
}
