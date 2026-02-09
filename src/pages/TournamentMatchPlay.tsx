// @ts-nocheck
// ============================================
// src/pages/TournamentMatchPlay.tsx
// TOURNOIS — MATCH PLAY (ROUTEUR ROBUSTE)
// ✅ Recharge tournoi + matchs depuis storeLocal (cache async)
// ✅ Évite écran noir (loading/fallbacks + refresh event)
// ✅ Lance une vraie partie pour un match de tournoi (X01 V3 / CRICKET / KILLER)
// ✅ NEW: PÉTANQUE (score manuel) — saisie score 0..13 + validation (13 obligatoire)
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

// ✅ Baby-Foot store (pour lancer un vrai match depuis un match de tournoi)
import {
  resetBabyFoot,
  setMode as setBabyFootMode,
  setTeams as setBabyFootTeams,
  setTeamsProfiles as setBabyFootTeamsProfiles,
  setTarget as setBabyFootTarget,
  setAdvancedOptions as setBabyFootAdvanced,
  startMatch as startBabyFootMatch,
} from "../lib/babyfootStore";

const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

function bfTourKey(tournamentId: any, matchId: any) {
  return `bf_tour_result_${String(tournamentId || "")}_${String(matchId || "")}`;
}

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

function clampInt(n: any, min: number, max: number) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
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

  const isBabyFootMode = isBabyFoot || mode === "babyfoot" || String((tour as any)?.game?.rules?.sport || "").toLowerCase() === "babyfoot";

  const aId = String((tm as any).aPlayerId || "");
  const bId = String((tm as any).bPlayerId || "");

  // ✅ Bloque BYE/TBD => pas de "match" à jouer
  const hasBye = isByeId(aId) || isByeId(bId);
  const hasTbd = isTbdId(aId) || isTbdId(bId);

  // ------------------------------------------------------------
  // ✅ PÉTANQUE — states TOP-LEVEL (pas de hooks dans un if)
  // ------------------------------------------------------------
  const isPetanque = mode === "petanque" || String(mode).includes("petanque");

  const [petSa, setPetSa] = React.useState<number>(0);
  const [petSb, setPetSb] = React.useState<number>(0);
  const [petErr, setPetErr] = React.useState<string>("");

  // ✅ Baby-foot (tournoi) — saisie score simple
  const [bfSa, setBfSa] = React.useState<number>(0);
  const [bfSb, setBfSb] = React.useState<number>(0);
  const [bfErr, setBfErr] = React.useState<string>("");

  React.useEffect(() => {
    // reset quand on change de match / tournoi / mode
    setPetSa(0);
    setPetSb(0);
    setPetErr("");
  }, [tournamentId, matchId, mode]);

  const petClamp = React.useCallback((v: any) => clampInt(v, 0, 13), []);
  const petA = petClamp(petSa);
  const petB = petClamp(petSb);
  const petCanSubmit = petA !== petB && (petA === 13 || petB === 13);

  async function submitPetanque() {
    setPetErr("");

    const a = petClamp(petSa);
    const b = petClamp(petSb);

    if (a === b) return setPetErr("Égalité impossible : il faut un vainqueur.");
    if (a !== 13 && b !== 13) return setPetErr("Score invalide : la victoire se fait à 13.");
    if (a > 13 || b > 13) return setPetErr("Score invalide.");

    const winnerId = a > b ? aId : bId;

    try {
      const now = Date.now();
      const payload = {
        kind: "petanque",
        createdAt: now,
        players: [
          { id: aId, name: nameOf(tour, aId), avatarDataUrl: avatarOf(tour, aId) },
          { id: bId, name: nameOf(tour, bId), avatarDataUrl: avatarOf(tour, bId) },
        ],
        winnerId,
        summary: { kind: "petanque", scoreA: a, scoreB: b, winnerId },
        payload: { kind: "petanque", scoreA: a, scoreB: b, winnerId },
      };

      await finishAndSubmit(payload, null);
    } catch (e: any) {
      console.error("[petanque_tournament] submit error", e);
      setPetErr(e?.message || "Erreur lors de la validation.");
    }
  }

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
  // ✅ BABY-FOOT — saisie score simple (tournoi)
  // ------------------------------------------------------------
  if (isBabyFootMode) {
    const winnerId = bfSa === bfSb ? null : (bfSa > bfSb ? aId : bId);


    const tid = (params as any)?.tournamentId ?? (params as any)?.tournament_id;
    const mid = (params as any)?.matchId ?? (params as any)?.tournamentMatchId;

    // ✅ V5.4: Résultat direct stocké par BabyFootPlay (bridge tournoi)
    const storedResult = (() => {
      try {
        if (!tid || !mid || typeof localStorage === "undefined") return null;
        const raw = localStorage.getItem(bfTourKey(tid, mid));
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj) return null;
        const a = safeNum(obj?.scoreA, -1);
        const b = safeNum(obj?.scoreB, -1);
        if (a < 0 || b < 0) return null;
        return { scoreA: a, scoreB: b, winnerId: obj?.winnerId ?? null, finishedAt: obj?.finishedAt ?? null };
      } catch {
        return null;
      }
    })();


    // ✅ V5.3: Import rapide depuis l'historique Baby-Foot (si tu as joué le match dans l'app)
    const lastPlayed = (() => {
      try {
        const hist = (store?.history ?? []).filter((h: any) => h?.sport === "babyfoot" || h?.kind === "babyfoot");
        const candidates = hist
          .filter((h: any) => {
            const players = Array.isArray(h?.players) ? h.players : [];
            const ids = players.map((p: any) => p?.id).filter(Boolean);
            return ids.includes(aId) && ids.includes(bId);
          })
          .sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
        return candidates[0] || null;
      } catch {
        return null;
      }
    })();

    const canImport = !!lastPlayed && safeNum(lastPlayed?.summary?.scoreA, -1) >= 0 && safeNum(lastPlayed?.summary?.scoreB, -1) >= 0;

    return (
      <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId, forceMode: "babyfoot" })}>← Retour tournoi</button>

        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 1000, letterSpacing: 0.8 }}>BABY-FOOT — Score du match</div>
          <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 800 }}>
            {nameOf(tour, aId)} vs {nameOf(tour, bId)}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>{nameOf(tour, aId)}</div>

          <button
            onClick={() => {
              try {
                setBfErr("");
                // Prépare un vrai match Baby-Foot (SAFE) et lance le gameplay
                resetBabyFoot();
                setBabyFootMode("1v1");
                setBabyFootTeams(nameOf(tour, aId), nameOf(tour, bId));
                setBabyFootTeamsProfiles([String(aId)], [String(bId)]);
                setBabyFootTarget(10);
                setBabyFootAdvanced({
                  // defaults raisonnables tournoi (tu pourras ouvrir ça plus tard)
                  chronoEnabled: false,
                  matchDurationSec: null,
                  overtimeEnabled: false,
                  overtimeSec: null,
                  penaltiesEnabled: false,
                  goldenGoalEnabled: false,
                  setsEnabled: false,
                  setsBestOf: 3,
                  setTarget: 10,
                  handicapA: 0,
                  handicapB: 0,
                });
                startBabyFootMatch();
                go("babyfoot_play", {
                  tournamentId: (params as any)?.tournamentId ?? (params as any)?.tournament_id,
                  tournamentMatchId: (params as any)?.matchId ?? (params as any)?.tournamentMatchId,
                });
              } catch (e: any) {
                setBfErr(String(e?.message || e || "Erreur lancement match"));
              }
            }}
            style={{
              marginTop: 10,
              width: "100%",
              height: 48,
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(124,255,196,0.14)",
              color: theme.text,
              fontWeight: 1000,
              letterSpacing: 0.6,
              cursor: "pointer",
            }}
          >
            LANCER LE MATCH BABY-FOOT
          </button>

          {storedResult ? (
            <button
              onClick={() => {
                try {
                  setBfErr("");
                  setBfSa(Math.max(0, Math.min(99, safeNum(storedResult.scoreA, 0))));
                  setBfSb(Math.max(0, Math.min(99, safeNum(storedResult.scoreB, 0))));
                } catch {}
              }}
              style={{
                marginTop: 10,
                width: "100%",
                height: 44,
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.08)",
                color: theme.text,
                fontWeight: 950,
                letterSpacing: 0.5,
                cursor: "pointer",
              }}
            >
              IMPORTER RÉSULTAT DU MATCH JOUÉ
            </button>
          ) : null}


          {canImport ? (
            <button
              onClick={() => {
                try {
                  setBfErr("");
                  const a = safeNum(lastPlayed?.summary?.scoreA, 0);
                  const b = safeNum(lastPlayed?.summary?.scoreB, 0);
                  setBfSa(Math.max(0, Math.min(99, a)));
                  setBfSb(Math.max(0, Math.min(99, b)));
                } catch {}
              }}
              style={{
                marginTop: 10,
                width: "100%",
                height: 44,
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.08)",
                color: theme.text,
                fontWeight: 950,
                letterSpacing: 0.5,
                cursor: "pointer",
              }}
            >
              IMPORTER DERNIÈRE PARTIE JOUÉE
            </button>
          ) : null}

              <input
                inputMode="numeric"
                value={String(bfSa)}
                onChange={(e) => setBfSa(Math.max(0, Math.min(99, Number(e.target.value || 0))))}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  padding: "0 12px",
                  fontWeight: 950,
                  fontSize: 18,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>{nameOf(tour, bId)}</div>
              <input
                inputMode="numeric"
                value={String(bfSb)}
                onChange={(e) => setBfSb(Math.max(0, Math.min(99, Number(e.target.value || 0))))}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  padding: "0 12px",
                  fontWeight: 950,
                  fontSize: 18,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {bfErr ? (
            <div style={{ marginTop: 10, color: "#ff6b6b", fontWeight: 900 }}>{bfErr}</div>
          ) : null}

          <button
            onClick={async () => {
              try {
                setBfErr("");
                if (bfSa === bfSb) {
                  setBfErr("Score nul : il faut un vainqueur pour valider un match de tournoi.");
                  return;
                }

                const winnerId2 = bfSa > bfSb ? aId : bId;

                const now = Date.now();
                const payload = {
                  kind: "babyfoot",
                  sport: "babyfoot",
                  createdAt: now,
                  players: [
                    { id: aId, name: nameOf(tour, aId), avatarDataUrl: avatarOf(tour, aId) },
                    { id: bId, name: nameOf(tour, bId), avatarDataUrl: avatarOf(tour, bId) },
                  ],
                  winnerId: winnerId2,
                  summary: { kind: "babyfoot", scoreA: bfSa, scoreB: bfSb, winnerId: winnerId2 },
                  payload: { kind: "babyfoot", scoreA: bfSa, scoreB: bfSb, winnerId: winnerId2 },
                };

                await finishAndSubmit(payload, null);
              } catch (e: any) {
                console.error("[babyfoot_tournament] submit error", e);
                setBfErr(e?.message || "Erreur lors de la validation.");
              }
            }}
            style={{
              marginTop: 12,
              width: "100%",
              height: 50,
              borderRadius: 16,
              border: "none",
              fontWeight: 1000,
              letterSpacing: 0.8,
              background: "linear-gradient(180deg,#7cffc4,#21e7a7)",
              color: "#052016",
              cursor: "pointer",
            }}
          >
            VALIDER LE MATCH
          </button>
        </div>
      </div>
    );
  }

// ------------------------------------------------------------
  // ✅ PÉTANQUE — saisie score simple (tournoi)
  // ------------------------------------------------------------
  if (isPetanque) {
    const winnerId = petA > petB ? aId : bId;

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
            {tour?.name || "Tournoi"} — Pétanque
          </div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            <b>{nameOf(tour, aId)}</b> vs <b>{nameOf(tour, bId)}</b>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{nameOf(tour, aId)}</div>
              <input
                type="number"
                min={0}
                max={13}
                value={petSa}
                onChange={(e) => setPetSa(petClamp(e.target.value))}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.25)",
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: 900,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>0 → 13</div>
            </div>

            <div style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{nameOf(tour, bId)}</div>
              <input
                type="number"
                min={0}
                max={13}
                value={petSb}
                onChange={(e) => setPetSb(petClamp(e.target.value))}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.25)",
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: 900,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>0 → 13</div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.75, lineHeight: 1.35 }}>
            Règle appliquée ici : victoire à 13 (un seul vainqueur).
          </div>

          {petErr ? <div style={{ marginTop: 10, color: "#ff6b6b", fontWeight: 800 }}>{petErr}</div> : null}

          <button
            onClick={submitPetanque}
            disabled={!petCanSubmit}
            style={{
              marginTop: 12,
              width: "100%",
              borderRadius: 999,
              padding: "12px 12px",
              border: "none",
              fontWeight: 950,
              background: petCanSubmit ? "linear-gradient(180deg,#ffc63a,#ffaf00)" : "rgba(255,255,255,.12)",
              color: petCanSubmit ? "#1b1508" : "rgba(255,255,255,.55)",
              cursor: petCanSubmit ? "pointer" : "not-allowed",
            }}
          >
            Valider le score (vainqueur : {winnerId === aId ? nameOf(tour, aId) : nameOf(tour, bId)})
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
