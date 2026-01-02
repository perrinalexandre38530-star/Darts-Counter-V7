// @ts-nocheck
// ============================================
// src/pages/TournamentMatchPlay.tsx
// TOURNOIS — MATCH PLAY (ROUTEUR ROBUSTE)
// ✅ Recharge tournoi + matchs depuis storeLocal (cache async)
// ✅ Évite écran noir (loading/fallbacks + refresh event)
// ✅ Lance une vraie partie pour un match de tournoi (X01 V3 / CRICKET / KILLER)
// ✅ Auto-submit résultat => tournament engine + persistence locale
// ✅ Bloque BYE/TBD (ne lance pas un "match fantôme")
// - Horloge / autres modes : fallback propre (pas d'écran noir)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Tournament, TournamentMatch } from "../lib/tournaments/types";
import { submitResult } from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
  TOURNAMENTS_UPDATED_EVENT,
} from "../lib/tournaments/storeLocal";

import { History } from "../lib/history";

// ✅ Jeux existants
import X01PlayV3 from "./X01PlayV3";
import CricketPlay from "./CricketPlay";
import KillerPlay from "./KillerPlay";

const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

// ⚠️ mêmes valeurs que TournamentView.tsx (si tu les utilises côté engine)
const BYE = "__BYE__";
const TBD = "__TBD__";

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}

function nameOf(t: Tournament, pid: string) {
  const p = (t?.players || []).find((x: any) => String(x?.id) === String(pid));
  return p?.name || "Joueur";
}

function avatarOf(t: Tournament, pid: string) {
  const p = (t?.players || []).find((x: any) => String(x?.id) === String(pid));
  return p?.avatarDataUrl ?? p?.avatar ?? p?.avatarUrl ?? null;
}

function extractWinnerId(m: any) {
  return (
    m?.winnerId ||
    m?.payload?.winnerId ||
    m?.summary?.winnerId ||
    m?.payload?.summary?.winnerId ||
    null
  );
}

function ensureTournamentLikeMatchId(m: any) {
  const now = Date.now();
  return m?.id || m?.matchId || `tmatch-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sauvegarde "best effort" dans History IDB + miroir LS (StatsOnline) sans toucher au state App.
 * (On évite pushHistory() car ça navigue vers StatsHub et casse le flow tournoi)
 */
function saveMatchToHistoryIDB(args: {
  tournament: Tournament;
  matchPayload: any;
  profiles: any[];
}) {
  const { tournament, matchPayload, profiles } = args;

  const now = Date.now();
  const id = ensureTournamentLikeMatchId(matchPayload);

  const rawPlayers = matchPayload?.players ?? matchPayload?.payload?.players ?? [];

  const players = (rawPlayers || []).map((p: any) => {
    const prof = (profiles || []).find((pr: any) => pr.id === p?.id);
    return {
      id: p?.id,
      name: p?.name ?? prof?.name ?? "",
      avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
    };
  });

  const summary = matchPayload?.summary ?? matchPayload?.payload?.summary ?? null;

  const saved: any = {
    id,
    kind: matchPayload?.kind || tournament?.game?.mode || "match",
    status: "finished",
    players,
    winnerId: extractWinnerId(matchPayload),
    createdAt: matchPayload?.createdAt || now,
    updatedAt: now,
    summary,
    payload: { ...(matchPayload || {}), players },
  };

  try {
    (History as any)?.upsert?.(saved);
  } catch {}

  // miroir LS (StatsOnline) — best effort
  try {
    const raw = localStorage.getItem(LS_ONLINE_MATCHES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: saved.id,
      mode: saved.kind,
      createdAt: saved.createdAt,
      finishedAt: saved.updatedAt,
      players: saved.players,
      winnerId: saved.winnerId,
      summary: saved.summary ?? null,
      stats: saved.payload?.stats ?? null,
    });
    localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}

  return saved;
}

function detectMode(tour: any) {
  const raw =
    tour?.game?.mode ||
    tour?.mode ||
    tour?.gameKey ||
    tour?.type ||
    tour?.format?.game ||
    tour?.config?.mode ||
    "";
  return String(raw || "").toLowerCase();
}

export default function TournamentMatchPlay({ store, go, params }: any) {
  const { theme } = useTheme();
  const { t } = useLang();

  const tournamentId = String(params?.tournamentId || params?.id || "");
  const matchId = String(params?.matchId || "");

  const [loading, setLoading] = React.useState(true);
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<TournamentMatch[]>([]);
  const [tm, setTm] = React.useState<TournamentMatch | null>(null);

  const safeMatches = React.useMemo(() => (Array.isArray(matches) ? matches : []), [matches]);

  const refreshFromStore = React.useCallback(() => {
    if (!tournamentId) return;
    const T = (getTournamentLocal(tournamentId) as any) ?? null;
    const M = (listMatchesForTournamentLocal(tournamentId) as any) ?? [];
    const arr = Array.isArray(M) ? M : [];
    setTour(T);
    setMatches(arr);
    setTm(arr.find((x: any) => String(x?.id) === String(matchId)) ?? null);
  }, [tournamentId, matchId]);

  // 1) Load initial (sync cache)
  React.useEffect(() => {
    setLoading(true);
    refreshFromStore();
    // si cache pas encore prêt, on laisse une petite fenêtre puis on relit
    const t1 = window.setTimeout(() => {
      refreshFromStore();
      setLoading(false);
    }, 120);
    return () => window.clearTimeout(t1);
  }, [refreshFromStore]);

  // 2) Très important: storeLocal charge en async -> on écoute l'event pour recharger
  React.useEffect(() => {
    function onUpdate() {
      refreshFromStore();
      setLoading(false);
    }
    window.addEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdate as any);
    return () => window.removeEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdate as any);
  }, [refreshFromStore]);

  function persist(nextTour: Tournament, nextMatches: TournamentMatch[]) {
    try {
      upsertTournamentLocal(nextTour as any);
      upsertMatchesForTournamentLocal((nextTour as any).id, nextMatches as any);
    } catch {}
    setTour(nextTour);
    setMatches(Array.isArray(nextMatches) ? nextMatches : []);
    setTm(
      (Array.isArray(nextMatches) ? nextMatches : []).find(
        (x: any) => String(x?.id) === String(matchId)
      ) ?? null
    );
  }

  async function finishAndSubmit(matchPayload: any, historyMatchIdMaybe?: string | null) {
    if (!tour || !tm) return;

    // 1) sauvegarde History (IDB) sans naviguer
    const saved = saveMatchToHistoryIDB({
      tournament: tour as any,
      matchPayload,
      profiles: store?.profiles ?? [],
    });

    const winnerId = extractWinnerId(matchPayload) || saved?.winnerId;
    const historyMatchId = historyMatchIdMaybe || saved?.id || null;

    // 2) submit tournoi
    if (winnerId) {
      try {
        const r = submitResult({
          tournament: tour as any,
          matches: safeMatches as any,
          matchId: (tm as any).id,
          winnerId,
          historyMatchId,
        });
        persist(r.tournament as any, r.matches as any);
      } catch (e) {
        console.error("[tournament_match_play] submitResult error:", e);
      }
    } else {
      console.warn("[tournament_match_play] winnerId introuvable, retour tournoi.");
    }

    // 3) retour tournoi
    go("tournament_view", { id: (tour as any).id });
  }

  // ---------- UI fallback / anti écran noir ----------
  if (!tournamentId || !matchId) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournaments")}>← Tournois</button>
        <div style={{ marginTop: 10, fontWeight: 950 }}>Paramètres manquants</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>tournamentId/matchId manquants pour lancer un match.</div>
      </div>
    );
  }

  if (loading && (!tour || !tm)) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>
        <div style={{ marginTop: 12, fontWeight: 950, color: theme.primary }}>Chargement…</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>Récupération du match du tournoi.</div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>
        <div style={{ marginTop: 12, fontWeight: 950 }}>Tournoi introuvable</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>Le tournoi n’est pas chargé (ou a été supprimé).</div>
      </div>
    );
  }

  if (!tm) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>
        <div style={{ marginTop: 12, fontWeight: 950 }}>Match introuvable</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>matchId={String(matchId)}</div>
      </div>
    );
  }

  const mode = detectMode(tour);

  const aId = String((tm as any).aPlayerId || "");
  const bId = String((tm as any).bPlayerId || "");

  // ✅ Bloque BYE/TBD => pas de "match" à jouer
  const hasBye = isByeId(aId) || isByeId(bId);
  const hasTbd = isTbdId(aId) || isTbdId(bId);

  if (hasBye || hasTbd || !aId || !bId) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>

        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
            Ce match n’est pas jouable
          </div>
          <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.35 }}>
            {hasBye ? (
              <>Exempt (BYE) — pas de partie à lancer.</>
            ) : hasTbd ? (
              <>En attente (TBD) — l’adversaire n’est pas encore connu.</>
            ) : (
              <>Joueurs incomplets.</>
            )}
            <br />
            <b>{nameOf(tour, aId)}</b> vs <b>{nameOf(tour, bId)}</b>
          </div>

          <button
            onClick={() => go("tournament_view", { id: tournamentId })}
            style={{
              marginTop: 12,
              borderRadius: 999,
              padding: "10px 12px",
              border: "none",
              fontWeight: 950,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1b1508",
              cursor: "pointer",
            }}
          >
            Retour au tournoi
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // ✅ X01 V3  (FIX NaN + header dans X01)
  // ------------------------------------------------------------
  if (mode === "x01" || mode.includes("x01") || mode.includes("501") || mode.includes("301") || mode === "") {
    const cfgFromTour = (tour?.game?.rules?.x01v3 ?? null) as any;

    const safeInt = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
    };

    // ✅ IMPORTANT: X01PlayV3 selon versions peut lire start/startScore/startingScore/x01
    const startScore = safeInt(
      cfgFromTour?.start ??
        cfgFromTour?.startScore ??
        cfgFromTour?.startingScore ??
        tour?.game?.rules?.start ??
        tour?.game?.rules?.x01 ??
        501,
      501
    );

    const doubleOut = Boolean(cfgFromTour?.doubleOut ?? tour?.game?.rules?.doubleOut ?? true);

    const inMode = String(cfgFromTour?.inMode ?? tour?.game?.rules?.inMode ?? "simple") || "simple";

    // ✅ on force players 1v1 du match
    const players = [
      { id: aId, name: nameOf(tour, aId), avatarDataUrl: avatarOf(tour, aId) },
      { id: bId, name: nameOf(tour, bId), avatarDataUrl: avatarOf(tour, bId) },
    ];

    // ✅ Build config robuste (évite NaN) + met le tournoi dans le header X01
    const config: any = {
      ...(cfgFromTour || {}),
      mode: "x01",

      // champs “header” (suivant ta version de X01PlayV3)
      title: tour?.name || "Tournoi",
      subtitle: `${nameOf(tour, aId)} vs ${nameOf(tour, bId)}`,

      players,

      // ✅ ALIAS start score (compat max)
      start: startScore,
      startScore,
      startingScore: startScore,
      x01: startScore,

      doubleOut,
      inMode,

      // defaults safe si X01PlayV3 attend legs/sets
      legs: safeInt(cfgFromTour?.legs ?? 1, 1),
      sets: safeInt(cfgFromTour?.sets ?? 1, 1),
    };

    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        {/* ✅ pas de mini-header ici : on laisse X01PlayV3 gérer SON header
            => évite le chevauchement (Mon tournoi derrière / doublons) */}
        <X01PlayV3
          config={config}
          onExit={() => go("tournament_view", { id: tournamentId })}
          onReplayNewConfig={() => go("tournament_view", { id: tournamentId })}
          onShowSummary={async (historyMatchId: string) => {
            try {
              // winner depuis History si dispo
              let rec: any = null;
              try {
                rec = await (History as any)?.get?.(historyMatchId);
              } catch {}

              const winnerId = rec?.winnerId || rec?.payload?.winnerId || rec?.summary?.winnerId || null;

              if (winnerId) {
                const r = submitResult({
                  tournament: tour as any,
                  matches: safeMatches as any,
                  matchId: (tm as any).id,
                  winnerId,
                  historyMatchId,
                });
                persist(r.tournament as any, r.matches as any);
              } else {
                console.warn("[tournament_match_play] X01V3: winnerId introuvable dans History");
              }
            } catch (e) {
              console.error("[tournament_match_play] X01V3 submitResult error:", e);
            } finally {
              go("tournament_view", { id: tournamentId });
            }
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ✅ CRICKET
  // ------------------------------------------------------------
  if (mode === "cricket" || mode.includes("cricket")) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <div style={{ padding: 12, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => go("tournament_view", { id: tournamentId })}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              ← Tournoi
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
                {tour?.name || "Tournoi"}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                Cricket • {nameOf(tour, aId)} vs {nameOf(tour, bId)}
              </div>
            </div>
            <div style={{ width: 90 }} />
          </div>
        </div>

        <CricketPlay
          profiles={store?.profiles ?? []}
          onFinish={async (m: any) => {
            const payload = { ...(m || {}), kind: m?.kind || "cricket" };
            await finishAndSubmit(payload, null);
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ✅ KILLER (best effort config 1v1)
  // ------------------------------------------------------------
  if (mode === "killer" || mode.includes("killer")) {
    const cfg: any = tour?.game?.rules?.killerConfig || {
      players: [
        { id: aId, name: nameOf(tour, aId), avatarDataUrl: avatarOf(tour, aId), number: 20 },
        { id: bId, name: nameOf(tour, bId), avatarDataUrl: avatarOf(tour, bId), number: 19 },
      ],
      damageRule: "classic",
      becomeRule: "oneHit",
      lives: 3,
    };

    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <div style={{ padding: 12, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => go("tournament_view", { id: tournamentId })}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              ← Tournoi
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
                {tour?.name || "Tournoi"}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                Killer • {nameOf(tour, aId)} vs {nameOf(tour, bId)}
              </div>
            </div>
            <div style={{ width: 90 }} />
          </div>
        </div>

        <KillerPlay
          store={store}
          go={go}
          config={cfg}
          onFinish={async (m: any) => {
            const payload = { ...(m || {}), kind: m?.kind || "killer" };
            await finishAndSubmit(payload, null);
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ⏱️ HORLOGE / autres modes : fallback propre
  // ------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>

      <div
        style={{
          marginTop: 12,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
          Mode pas encore branché automatiquement
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.35 }}>
          Mode du tournoi : <b>{String(mode).toUpperCase() || "?"}</b>
          <br />
          Match : <b>{nameOf(tour, aId)}</b> vs <b>{nameOf(tour, bId)}</b>
        </div>

        <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.8 }}>
          (Pas d’écran noir) — quand tu me dis quel composant “Play” utiliser pour ce mode, je branche exactement comme
          X01/Cricket/Killer : onFinish → History → submitResult → retour tournoi.
        </div>

        <button
          onClick={() => go("tournament_view", { id: tournamentId })}
          style={{
            marginTop: 12,
            borderRadius: 999,
            padding: "10px 12px",
            border: "none",
            fontWeight: 950,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Retour au tournoi
        </button>
      </div>
    </div>
  );
}
