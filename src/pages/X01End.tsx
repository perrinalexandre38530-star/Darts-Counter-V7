
/* FINAL TENNIS TV PATCH
- underline bars only under values
- no underline under stat labels
- neon gradient bars preserved
*/

// ============================================
// src/pages/X01End.tsx
// Fin de partie “maxi-stats” (LEG/MATCH) — colonnes = joueurs
// + RESTE TON TABLEAU tel quel
// + Ajout: overlay optionnel si params.showEnd === true (reconstruit legacy depuis les métriques)
// + NOUVEAU : support X01 V3 léger via buildLegStatsFromX01V3Summary
// + NOUVEAU : Radar "TrainingX01-like" + Historique des volées
// ============================================
import React from "react";
import { History } from "../lib/history";
import EndOfLegOverlay from "../components/EndOfLegOverlay";
import {
  buildLegStatsFromX01V3Summary,
  type LegStats,
} from "../lib/stats";
import { exportSharedMatchPack } from "../lib/backup/sharedMatch";
import { shareOrDownload } from "../lib/backup/fileExport";

/* ================================
   Types basiques
================================ */
type PlayerLite = { id: string; name?: string; avatarDataUrl?: string | null; avatarUrl?: string | null; photoUrl?: string | null; imageUrl?: string | null };

type Props = {
  go: (tab: string, params?: any) => void;
  params?: {
    matchId?: string;
    resumeId?: string | null;
    rec?: any;
    showEnd?: boolean;
  };
};
function hydrateX01HistoryRecord(input: any): any {
  if (!input || typeof input !== "object") return input;

  // IMPORTANT : les lignes venant de l'historique peuvent arriver sous 3 formes :
  // - header léger : summary présent mais payload absent
  // - detail History.get : payload objet complet
  // - ancien/legacy : payload string JSON/compressée déjà décodée ailleurs ou non
  // Cette fonction ne doit JAMAIS transformer une string en objet {0:"..."}, sinon X01End
  // perd summary.legacy/darts et toutes les stats tombent à 0.
  const rawPayload = (input as any).payload;
  const payload = rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload) ? rawPayload : {};

  const payloadSummary = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
  const ownSummary = input.summary && typeof input.summary === "object" ? input.summary : {};
  const decodedSummary = input.decoded?.summary && typeof input.decoded.summary === "object" ? input.decoded.summary : {};

  // CRITIQUE HISTORIQUE : la carte Historique transporte souvent un summary léger
  // (header IndexedDB) qui ne contient pas les buckets 60+/100+/140+/180 ni
  // visitHistory. Le payload détaillé, lui, est la source complète. Il doit donc
  // écraser le header, pas l'inverse. Sinon "Voir stats" affiche 0 alors que le
  // résumé de fin de partie live est correct.
  const summary = { ...ownSummary, ...decodedSummary, ...payloadSummary };

  const players =
    Array.isArray(input.players) && input.players.length
      ? input.players
      : Array.isArray(payload.players) && payload.players.length
      ? payload.players
      : Array.isArray(input.decoded?.players) && input.decoded.players.length
      ? input.decoded.players
      : Array.isArray(summary.players)
      ? summary.players
      : [];

  const firstNonEmptyArray = (...arrs: any[]) => arrs.find((a) => Array.isArray(a) && a.length > 0) || [];
  const richVisitHistory = firstNonEmptyArray(
    input.visitHistory,
    input.visitsHistory,
    input.__legStats?.visits,
    ownSummary.visitHistory,
    ownSummary.visitsHistory,
    ownSummary.__legStats?.visits,
    decodedSummary.visitHistory,
    decodedSummary.visitsHistory,
    payload.visitHistory,
    payload.visitsHistory,
    payload.__legStats?.visits,
    payloadSummary.visitHistory,
    payloadSummary.visitsHistory,
    payloadSummary.__legStats?.visits,
    payload?.payload?.visitHistory,
    payload?.payload?.visitsHistory,
    payload?.payload?.summary?.visitHistory,
    payload?.payload?.summary?.visitsHistory
  );

  return {
    ...input,
    payload: { ...payload, summary: { ...summary, visitHistory: richVisitHistory, visitsHistory: richVisitHistory, __legStats: { ...((summary as any).__legStats || {}), visits: richVisitHistory } }, visitHistory: richVisitHistory, visitsHistory: richVisitHistory, __legStats: { ...((payload as any).__legStats || {}), visits: richVisitHistory } },
    summary: { ...summary, visitHistory: richVisitHistory, visitsHistory: richVisitHistory, __legStats: { ...((summary as any).__legStats || {}), visits: richVisitHistory } },
    players,
    visitHistory: richVisitHistory,
    visitsHistory: richVisitHistory,
    __legStats: { ...((input as any).__legStats || {}), visits: richVisitHistory },
  };
}

/* ================================
   Densité / responsive
================================ */
const D = {
  fsBody: 12,
  fsHead: 12,
  padCellV: 6,
  padCellH: 10,
  cardPad: 10,
  radius: 14,
};

const THEME_ACCENT = "var(--dc-accent, var(--accent, #f6c256))";
const THEME_ACCENT_SOFT = "color-mix(in srgb, var(--dc-accent, #f6c256) 62%, white 38%)";
const THEME_PANEL =
  "radial-gradient(130% 160% at 0% 0%, color-mix(in srgb, var(--dc-accent, #f6c256) 18%, transparent), transparent 48%), linear-gradient(180deg, rgba(10,17,26,.96), rgba(7,10,15,.985))";
const THEME_PANEL_BORDER = "color-mix(in srgb, var(--dc-accent, #f6c256) 42%, rgba(255,255,255,.10))";
const mobileDenseCss = `
@media (max-width: 420px){
  .x-end h2{ font-size:16px; }
  .x-card h3{ font-size:13px; }
  .x-table{ font-size:11px; }
  .x-th, .x-td{ padding:4px 6px; }
  .x-player-avatar{ width:28px !important; height:28px !important; }
  .x-rank-badge{ transform:scale(.86); }
  .selector button{ font-size:11px; padding:4px 8px; }
}
`;

/* ================================
   Types pour historique des volées
================================ */
type VisitRow = {
  idx: number;
  legNo: number;
  setNo?: number;
  legInSet?: number;
  playerId: string;
  darts: { v: number; mult: 0 | 1 | 2 | 3; source?: string; scoreInputMode?: string; visitScoreInput?: number | string; visitScoreSource?: string }[];
  scoreBefore: number;
  scoreAfter: number;
  bust: boolean;
  finish: boolean;
  score?: number;
  scoreInputMode?: string;
  visitScoreInput?: number | string;
};

function isVisitScoreInputRecord(rec: any): boolean {
  const roots = [
    rec,
    rec?.summary,
    rec?.payload,
    rec?.payload?.summary,
    rec?.resume,
    rec?.resume?.config,
    rec?.payload?.config,
    rec?.config,
    rec?.payload?.payload,
    rec?.payload?.payload?.summary,
  ].filter(Boolean);

  return roots.some((root: any) => {
    const mode = String(
      root?.scoreInputMethod ??
        root?.scoreInputMode ??
        root?.scoreInputDefaultMethod ??
        root?.inputMode ??
        ""
    ).toLowerCase();
    return (
      mode === "visit_score" ||
      mode === "score_visit" ||
      mode === "visit-score" ||
      root?.isVisitScoreInput === true ||
      root?.hideSegmentStats === true ||
      root?.statsDetailAvailable === false
    );
  });
}

/* ================================
   Composant principal
================================ */
export default function X01End({ go, params }: Props) {
  // --- Hooks toujours au même ordre ---
  const [rec, setRec] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // cible: ne pas dépendre de rec au moment de l'initialisation
  const [chartPid, setChartPid] = React.useState<string>("");
  const [summaryTab, setSummaryTab] = React.useState<"summary" | "details">("summary");

  // NEW: overlay “à la demande”
  const [overlayOpen, setOverlayOpen] = React.useState<boolean>(
    !!params?.showEnd
  );
  const [overlayResult, setOverlayResult] = React.useState<any | null>(null);
  const [playersById, setPlayersById] = React.useState<
    Record<string, PlayerLite>
  >({});

  // NEW : LegStats X01 V3 reconstruit à partir du summary léger
  const [legStats, setLegStats] = React.useState<LegStats | null>(null);

  // chargement de l'enregistrement (asynchrone protégé)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (params?.rec) {
          const lightweight = hydrateX01HistoryRecord(params.rec);
          const wantedFromRec =
            lightweight?.id || lightweight?.matchId || lightweight?.resumeId || params?.matchId || params?.resumeId;

          // IMPORTANT HISTORY: la carte Historique envoie souvent un header léger
          // (e) sans payload complet / visitHistory. Si on fait return ici, X01End
          // calcule depuis un objet incomplet => 60+/100+ à 0, radar vide, pas
          // d’historique des volées. On tente donc de recharger le détail IndexedDB
          // puis on fusionne : header léger + payload complet.
          if (wantedFromRec && typeof (History as any)?.get === "function") {
            try {
              const detail = await (History as any).get(wantedFromRec);
              if (detail && mounted) {
                setRec(
                  hydrateX01HistoryRecord({
                    ...lightweight,
                    ...detail,
                    payload: {
                      ...(lightweight?.payload && typeof lightweight.payload === "object" ? lightweight.payload : {}),
                      ...(detail?.payload && typeof detail.payload === "object" ? detail.payload : {}),
                    },
                    summary: {
                      ...(lightweight?.summary && typeof lightweight.summary === "object" ? lightweight.summary : {}),
                      ...(detail?.summary && typeof detail.summary === "object" ? detail.summary : {}),
                      ...(detail?.payload?.summary && typeof detail.payload.summary === "object" ? detail.payload.summary : {}),
                    },
                  })
                );
                return;
              }
            } catch (e) {
              console.warn("[X01End] History.get(params.rec) failed:", e);
            }
          }

          if (mounted) setRec(lightweight);
          return;
        }
        const wantedId = params?.matchId || params?.resumeId;
        if (wantedId) {
          const byId = await (History as any)?.get?.(wantedId);
          if (mounted && byId) {
            setRec(hydrateX01HistoryRecord(byId));
            return;
          }
        }
        const mem = (window as any)?.__appStore?.history as
          | any[]
          | undefined;
        if (mem?.length) {
          if (wantedId) {
            const m = mem.find((r) => r?.id === wantedId || r?.resumeId === wantedId || r?.matchId === wantedId);
            if (mounted && m) {
              setRec(hydrateX01HistoryRecord(m));
              return;
            }
          }
          const lastFin = mem.find(
            (r) => String(r?.status).toLowerCase() === "finished"
          );
          if (mounted && lastFin) {
            setRec(hydrateX01HistoryRecord(lastFin));
            return;
          }
        }

        // ✅ Rechargement direct / Firefox rouvert : quand X01End est restaurée
        // sans params.rec et sans mémoire runtime, il faut relire l'IndexedDB.
        // Sinon l'écran détaillé affiche un record vide / fallback à 0.
        const list = typeof (History as any)?.list === "function"
          ? await (History as any).list()
          : [];
        if (Array.isArray(list) && list.length) {
          const hit = wantedId
            ? list.find((r: any) => r?.id === wantedId || r?.resumeId === wantedId || r?.matchId === wantedId)
            : list.find((r: any) => String(r?.kind || "").toLowerCase() === "x01" && String(r?.status || "").toLowerCase() === "finished");
          if (hit) {
            const detail = hit?.id && typeof (History as any)?.get === "function"
              ? await (History as any).get(hit.id)
              : hit;
            if (mounted && detail) {
              setRec(hydrateX01HistoryRecord(detail));
              return;
            }
          }
        }

        if (mounted) setErr("Impossible de charger l'enregistrement.");
      } catch (e) {
        console.warn("[X01End] load error:", e);
        if (mounted) setErr("Erreur de chargement.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params?.matchId, params?.rec]);

  // données dérivées — protégées quand rec est null
  const finished = normalizeStatus(rec ?? {}) === "finished";
  const when = n(rec?.updatedAt ?? rec?.createdAt ?? Date.now());
  const dateStr = new Date(when).toLocaleString();

  const players: PlayerLite[] = React.useMemo(() => {
    if (!rec) return [];
    const arr = rec.players?.length ? rec.players : rec.payload?.players || [];
    return arr.map((p: any) => {
      const avatar =
        p?.avatarDataUrl ||
        p?.avatarUrl ||
        p?.avatar ||
        p?.photoUrl ||
        p?.imageUrl ||
        p?.picture ||
        p?.profile?.avatarDataUrl ||
        p?.profile?.avatarUrl ||
        null;
      return {
        id: p.id || p.profileId || p.playerId,
        name: p?.name || p?.displayName || "—",
        avatarDataUrl: avatar,
        avatarUrl: p?.avatarUrl ?? null,
        photoUrl: p?.photoUrl ?? null,
        imageUrl: p?.imageUrl ?? null,
      };
    });
  }, [rec]);

  // tenir playersById synchro (évite setState dans useMemo)
  React.useEffect(() => {
    if (!players?.length) return;
    setPlayersById(Object.fromEntries(players.map((p) => [p.id, p])));
  }, [players]);

  const winnerId: string | null =
    rec?.winnerId ??
    rec?.payload?.winnerId ??
    rec?.summary?.winnerId ??
    null;
  const winnerName =
    (winnerId && (players.find((p) => p.id === winnerId)?.name || null)) ||
    null;

  // Match summary :
  // - X01 v1/v2 => kind === "x01"
  // - X01 v3 léger => kind/variant/engine === "x01_v3"
  const matchSummary = React.useMemo(
    () => normalizeX01Summary(rec?.summary, players),
    [rec?.summary, players]
  );

  const legSummary = !matchSummary ? buildSummaryFromLeg(rec) : null;

  // NEW : tentative de reconstruction LegStats X01 V3 à partir du summary léger
  React.useEffect(() => {
    if (!rec) {
      setLegStats(null);
      return;
    }

    const summary: any = rec.summary || {};
    const decoded: any = rec.decoded || rec.payload || {};

    const isX01V3 =
      summary.variant === "x01_v3" ||
      summary.engine === "x01_v3" ||
      summary.kind === "x01_v3" ||
      summary.game === "x01_v3";

    if (!isX01V3) {
      setLegStats(null);
      return;
    }

    const cfg =
      decoded.config ||
      decoded.game ||
      decoded.x01?.config ||
      decoded.x01 ||
      null;

    if (!cfg) {
      setLegStats(null);
      return;
    }

    const finalScores =
      decoded.finalScores ||
      decoded.x01?.finalScores ||
      summary.finalScores ||
      undefined;

    const leg = buildLegStatsFromX01V3Summary(summary, cfg, finalScores);
    setLegStats(leg || null);
  }, [rec]);

  const M = React.useMemo(() => {
    return rec
      ? buildPerPlayerMetrics(
          rec,
          matchSummary || legSummary,
          players,
          legStats || undefined
        )
      : {};
  }, [rec, matchSummary, legSummary, players, legStats]);

  const has = detectAvailability(M);
  const hideDetailedHitStats = isVisitScoreInputRecord(rec);

  const resumeId =
    params?.resumeId ?? rec?.resumeId ?? rec?.payload?.resumeId ?? null;

  // garder chartPid cohérent avec la liste des joueurs dès qu'elle change
  React.useEffect(() => {
    if (!players.length) return;
    setChartPid((prev) =>
      players.find((p) => p.id === prev) ? prev : players[0]?.id || ""
    );
  }, [players]);

  // NEW: si showEnd demandé, construire un "legacy" overlay depuis M (sans rien toucher aux profils)
  React.useEffect(() => {
    if (!params?.showEnd || !players.length || !rec) return;

    const ids = players.map((p) => p.id);
    const zmap = () => Object.fromEntries(ids.map((id) => [id, 0]));
    const remaining = zmap();
    const darts = zmap();
    const visits = zmap();
    const avg3 = zmap();
    const bestVisit = zmap();
    const bestCheckout = zmap();
    const h60 = zmap();
    const h100 = zmap();
    const h140 = zmap();
    const h180 = zmap();
    const miss = zmap();
    const bust = zmap();
    const dbull = zmap();
    const missPct = zmap();
    const bustPct = zmap();
    const dbullPct = zmap();
    const doubles = zmap();
    const triples = zmap();
    const bulls = zmap();

    for (const id of ids) {
      const m = M[id];
      if (!m) continue;
      darts[id] = n(m.darts, 0);
      visits[id] = n(
        m.visits,
        darts[id] ? Math.ceil(darts[id] / 3) : 0
      );
      avg3[id] = Math.round(n(m.avg3, 0) * 100) / 100;
      bestVisit[id] = n(m.bestVisit, 0);
      bestCheckout[id] = n(m.bestCO, 0);

      h60[id] = n(m.t60, 0);
      h100[id] = n(m.t100, 0);
      h140[id] = n(m.t140, 0);
      h180[id] = n(m.t180, 0);

      miss[id] = n(m.misses, 0);
      bust[id] = n(m.busts, 0);
      dbull[id] = n(m.dbulls, 0);

      missPct[id] = darts[id]
        ? Math.round((miss[id] / darts[id]) * 1000) / 10
        : 0;
      bustPct[id] = visits[id]
        ? Math.round((bust[id] / visits[id]) * 1000) / 10
        : 0;
      dbullPct[id] = darts[id]
        ? Math.round((dbull[id] / darts[id]) * 1000) / 10
        : 0;

      doubles[id] = n(m.doubles, 0);
      triples[id] = n(m.triples, 0);
      bulls[id] = n(m.bulls, 0);

      // Score restant réel : seul le vainqueur finit à 0.
      // Le perdant doit garder son score final ; si un payload historique l'a écrasé à 0,
      // on recalcule depuis les points marqués (ex. 301 - 286 = 15).
      remaining[id] = computeX01RemainingScore(m, rec, winnerId) ?? 0;
    }

    const explicitOrder = readExplicitX01RankingOrder(rec, ids);
    const order = explicitOrder.length
      ? explicitOrder
      : [...ids].sort((a, b) => {
          const az = remaining[a] === 0,
            bz = remaining[b] === 0;
          if (az && !bz) return -1;
          if (!az && bz) return 1;

          // En X01, le classement de fin de manche doit suivre le score restant
          // croissant : 0, 35, 45, 91, 106...
          // L'ancien fallback triait les perdants à la moyenne, ce qui inversait
          // Ninja/Chevroute ou Jess/Jems selon les stats.
          const ar = Number.isFinite(Number(remaining[a])) ? Number(remaining[a]) : Number.POSITIVE_INFINITY;
          const br = Number.isFinite(Number(remaining[b])) ? Number(remaining[b]) : Number.POSITIVE_INFINITY;
          if (ar !== br) return ar - br;

          return (avg3[b] ?? 0) - (avg3[a] ?? 0);
        });

    setOverlayResult({
      legNo: 1,
      winnerId: winnerId ?? order[0] ?? ids[0],
      order,
      finishedAt: rec.updatedAt ?? Date.now(),
      remaining,
      darts,
      visits,
      avg3,
      bestVisit,
      bestCheckout,
      h60,
      h100,
      h140,
      h180,
      miss,
      missPct,
      bust,
      bustPct,
      dbull,
      dbullPct,
      doubles,
      triples,
      bulls,
    });
  }, [params?.showEnd, players, M, rec, winnerId]);

  // Historique des volées — priorité à legStats / __legStats
  const visits: VisitRow[] = React.useMemo(
    () =>
      buildVisitHistory(
        rec,
        players,
        legStats || rec?.payload?.__legStats || rec?.__legStats || null
      ),
    [rec, players, legStats]
  );

  const isMatchDetailsMode = React.useMemo(
    () => isX01MatchWithDetails(rec, visits),
    [rec, visits]
  );

  const legBreakdown = React.useMemo(
    () => buildLegBreakdown(rec, players, visits),
    [rec, players, visits]
  );

  React.useEffect(() => {
    if (!isMatchDetailsMode && summaryTab !== "summary") {
      setSummaryTab("summary");
    }
  }, [isMatchDetailsMode, summaryTab]);

  const shareMatchId = (params?.matchId || (rec as any)?.id || (rec as any)?.matchId) as string | undefined;

  async function handleShareMatch() {
    if (!shareMatchId) return;
    try {
      const pack = await exportSharedMatchPack(shareMatchId);
      await shareOrDownload(pack, "dc_match_share.json", "Partie Darts Counter");
    } catch (e) {
      console.warn("share match failed", e);
    }
  }

  // --- Rendus (aucun hook après ceci) ---
  if (err)
    return (
      <Shell go={go} title="Fin de partie">
        <Notice>{err}</Notice>
      </Shell>
    );
  if (!rec)
    return (
      <Shell go={go}>
        <Notice>Chargement…</Notice>
      </Shell>
    );

  const chartPlayer = players.find((p) => p.id === chartPid);
  const chartMetrics = chartPlayer
    ? M[chartPlayer.id] || emptyMetrics(chartPlayer)
    : null;

  const getFinalRankTuple = (p: PlayerLite): [number, number, number, number, string] => {
    const m = M[p.id] || emptyMetrics(p);
    const remaining = computeX01RemainingScore(m, rec, winnerId);
    const setsWon = n(m.setsWon ?? (winnerId && p.id === winnerId ? 1 : 0), 0);
    const legsWon = n(m.legsWon ?? (winnerId && p.id === winnerId ? 1 : 0), 0);
    const safeRemaining = remaining == null ? Number.MAX_SAFE_INTEGER : n(remaining, Number.MAX_SAFE_INTEGER);
    return [-setsWon, -legsWon, safeRemaining, -n(m.avg3, 0), String(p.name || "")];
  };

  const rankedPlayers = [...players].sort((a, b) => {
    const ta = getFinalRankTuple(a);
    const tb = getFinalRankTuple(b);
    for (let i = 0; i < ta.length; i++) {
      const av = ta[i] as any;
      const bv = tb[i] as any;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });

  const customHeader = (
    <div
      style={{
        position: "relative",
        padding: "4px 0 6px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr auto",
          alignItems: "start",
          gap: 8,
        }}
      >
        <button
          onClick={() => go("stats", { tab: "history" })}
          aria-label="Retour"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 28%, transparent)",
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--dc-accent, #f6c256) 22%, transparent), color-mix(in srgb, var(--dc-accent, #f6c256) 6%, transparent) 45%, rgba(255,255,255,.02) 100%)",
            color: THEME_ACCENT,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 0 14px color-mix(in srgb, var(--dc-accent, #f6c256) 18%, transparent), inset 0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 6%, transparent)",
            marginTop: 2,
          }}
        >
          <ArrowLeftIcon />
        </button>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: 19,
              fontWeight: 1000,
              lineHeight: 1.05,
              color: THEME_ACCENT,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              textShadow: "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 30%, transparent), 0 0 24px color-mix(in srgb, var(--dc-accent, #f6c256) 18%, transparent)",
            }}
          >
            {modeTitleFromRec(rec)}
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: "#d7d7de",
              fontWeight: 700,
            }}
          >
            {dateStr}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {rankedPlayers.map((player, index) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {index === 0 ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "linear-gradient(180deg,#ffe58a,#ffb300)",
                      color: "#17130a",
                      boxShadow: "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 32%, transparent)",
                      border: "1px solid rgba(0,0,0,.25)",
                      flex: "0 0 auto",
                    }}
                  >
                    <Trophy width={10} height={10} />
                  </div>
                ) : null}
                <AvatarBubble
                  player={player}
                  crowned={player.id === winnerId}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {shareMatchId ? (
            <button
              onClick={handleShareMatch}
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
                marginTop: 2,
              }}
              title="Partager cette partie (fichier)"
            >
              Partager
            </button>
          ) : (
            <div style={{ width: 72 }} />
          )}
        </div>
      </div>
    </div>
  );

  /* ========= Tableaux COL-MAJOR (colonnes = joueurs) ========= */
  const cols = rankedPlayers.map((p, idx) => ({
    key: p.id,
    title: p.name || "—",
    player: p,
    rank: idx + 1,
    remaining: (() => {
      const m = M[p.id] || emptyMetrics(p);
      return computeX01RemainingScore(m, rec, winnerId);
    })(),
  }));

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: D.fsBody,
  };

  return (
    <Shell
      go={go}
      title={
        ((rec?.kind === "x01" || rec?.kind === "leg"
          ? "LEG"
          : String(rec?.kind || "Fin").toUpperCase()) +
          " — " +
          dateStr) as string
      }
      canResume={!!resumeId && !finished}
      resumeId={resumeId}
      header={customHeader}
    >
      <style dangerouslySetInnerHTML={{ __html: mobileDenseCss }} />

      {!matchSummary && legSummary ? (
        <InfoCard>
          <b>Résumé (manche)</b> — reconstruit depuis les statistiques de la
          manche.
        </InfoCard>
      ) : null}

      {isMatchDetailsMode ? (
        <SummaryDetailsTabs value={summaryTab} onChange={setSummaryTab} />
      ) : null}

      {summaryTab === "summary" ? (
        <>
      <CardTable title="Score du match">
        <TableColMajor
          columns={cols}
          rowGroups={[{ rows: [
            { label: "Sets remportés", get: (m) => f0(m.setsWon ?? (m.id === winnerId ? 1 : 0)) },
            { label: "Legs remportées", get: (m) => f0(m.legsWon ?? (m.id === winnerId ? 1 : 0)) },
            { label: "Score restant", get: (m) => {
              const rem = computeX01RemainingScore(m, rec, winnerId);
              return rem != null ? f0(rem) : "—";
            } },
          ] }]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 1) VOLUMES (lignes) ===== */}
      <CardTable title="Volumes">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                { label: "Avg/3D", get: (m) => f2(m.avg3) },
                { label: "Avg/1D", get: (m) => f2(m.avg1) },
                { label: "Best visit", get: (m) => f0(m.bestVisit) },
                { label: "Best CO", get: (m) => f0(m.bestCO) },
                { label: "Darts", get: (m) => f0(m.darts) },
                { label: "Visits", get: (m) => f0(m.visits) },
                { label: "Points", get: (m) => f0(m.points) },
                {
                  label: "Score/visit",
                  get: (m) =>
                    m.visits > 0
                      ? f2(m.points / m.visits)
                      : "—",
                },
                ...(has.first9
                  ? [
                      {
                        label: "First9",
                        get: (m) =>
                          m.first9 != null ? f2(m.first9) : "—",
                      },
                    ]
                  : []),
                ...(has.dartsToFinish
                  ? [
                      {
                        label: "Darts→CO",
                        get: (m) =>
                          m.dartsToFinish != null
                            ? f0(m.dartsToFinish)
                            : "—",
                      },
                    ]
                  : []),
                ...(has.highestNonCO
                  ? [
                      {
                        label: "Hi non-CO",
                        get: (m) =>
                          m.highestNonCO != null
                            ? f0(m.highestNonCO)
                            : "—",
                      },
                    ]
                  : []),
              ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 2) POWER SCORING ===== */}
      <CardTable title="Power scoring">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                { label: "60+", get: (m) => f0(m.t60) },
                { label: "100+", get: (m) => f0(m.t100) },
                { label: "140+", get: (m) => f0(m.t140) },
                { label: "180", get: (m) => f0(m.t180) },
                {
                  label: "Tons (100+)",
                  get: (m) => f0(m.t100),
                },
              ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 3) CHECKOUT ===== */}
      <CardTable title="Checkout">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                { label: "Best CO", get: (m) => f0(m.bestCO) },
                { label: "CO", get: (m) => f0(m.coAtt) },
                { label: "CO hits", get: (m) => f0(m.coHits) },
                {
                  label: "CO %",
                  get: (m) => pct(m.coPct),
                },
                {
                  label: "Darts CO",
                  get: (m) => {
                    const total = n(m.checkoutDartsTotal ?? m.avgCoDarts, 0);
                    return total > 0 ? f0(total) : "0";
                  },
                },
              ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 4) DARTS / IMPACTS / RATES — bloc fusionné ===== */}
      {hideDetailedHitStats ? (
        <InfoCard>
          <b>Mode score de volée</b> — le détail par impact n'est pas disponible. Les colonnes S/D/T, Bull détaillé et les radars par segment sont donc masqués.
        </InfoCard>
      ) : null}
      <CardTable title="Darts / impacts / précision">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: hideDetailedHitStats
                ? [
                    { label: "Darts", get: (m) => f0(m.darts) },
                    { label: "Bust", get: (m) => f0(m.busts || 0) },
                    { label: "Bust %", get: (m) => pct(m.darts > 0 ? (n(m.busts) / m.darts) * 100 : undefined) },
                  ]
                : [
                    { label: "Darts", get: (m) => f0(m.darts) },
                    { label: "Miss hits", get: (m) => f0(m.misses || 0) },
                    { label: "Miss %", get: (m) => pct(m.darts > 0 ? (n(m.misses) / m.darts) * 100 : undefined) },
                    { label: "Singles hits", get: (m) => f0(m.singles || 0) },
                    { label: "Singles %", get: (m) => pct(m.darts > 0 ? (n(m.singles) / m.darts) * 100 : undefined) },
                    { label: "Double hits", get: (m) => f0(m.doubles || 0) },
                    { label: "Dbl %", get: (m) => pct(m.doublePct) },
                    { label: "Triples hits", get: (m) => f0(m.triples || 0) },
                    { label: "Trpl %", get: (m) => pct(m.triplePct) },
                    { label: "Bull 25 hits", get: (m) => f0(m.bulls || 0) },
                    { label: "Bull 25 %", get: (m) => pct(m.bullPct) },
                    { label: "DBull 50 hits", get: (m) => f0(m.dbulls || 0) },
                    { label: "DBull 50 %", get: (m) => pct(m.dbullPct) },
                    { label: "Bust", get: (m) => f0(m.busts || 0) },
                    { label: "Bust %", get: (m) => pct(m.darts > 0 ? (n(m.busts) / m.darts) * 100 : undefined) },
                  ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 7) RADAR HITS "TRAINING-LIKE" ===== */}
      {!hideDetailedHitStats && chartMetrics ? (
        <>
          <Panel className="x-card">
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: D.fsHead + 1,
                letterSpacing: 0.2,
                color: THEME_ACCENT,
              }}
            >
              Radar — répartition des hits
            </h3>
            <div
              className="selector"
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setChartPid(p.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border:
                      p.id === chartPid
                        ? "1px solid rgba(255,200,60,.6)"
                        : "1px solid rgba(255,255,255,.18)",
                    background:
                      p.id === chartPid
                        ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                        : "transparent",
                    color:
                      p.id === chartPid ? "#141417" : "#e8e8ec",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 11.5,
                  }}
                >
                  {p.name || "—"}
                </button>
              ))}
            </div>
            <HitsRadar m={chartMetrics} />
            <div
              style={{
                marginTop: 8,
                color: "#bbb",
                fontSize: 12,
              }}
            >
              Chaque numéro est pondéré par le nombre de hits :{" "}
              <b>1× Single</b>, <b>2× Double</b>, <b>3× Triple</b>.
              Le point le plus touché est le plus éloigné du centre
              (même logique que le radar Training X01).
            </div>
          </Panel>

          {/* Bloc "Hits par segments" façon X01Multi */}
          <Panel className="x-card">
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: D.fsHead + 1,
                letterSpacing: 0.2,
                color: THEME_ACCENT,
              }}
            >
              Hits par segments
            </h3>
            <HitsBySegmentBlock m={chartMetrics} />
          </Panel>
        </>
      ) : null}

      {/* ===== 8) HISTORIQUE DES VOLÉES ===== */}
      {visits.length > 0 ? (
        <Panel className="x-card">
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: D.fsHead + 1,
              letterSpacing: 0.2,
              color: THEME_ACCENT,
            }}
          >
            Historique des volées
          </h3>
          <VisitsList visits={visits} playersById={playersById} hideDartDetails={hideDetailedHitStats} />
        </Panel>
      ) : null}

        </>
      ) : (
        <MatchLegDetails
          breakdown={legBreakdown}
          players={players}
          tableStyle={tableStyle}
        />
      )}

      {/* ===== Overlay fin (optionnel) ===== */}
      {overlayOpen && overlayResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <EndOfLegOverlay
            open={overlayOpen}
            result={overlayResult}
            playersById={playersById}
            visitHistory={visits}
            onClose={() => setOverlayOpen(false)}
            onReplay={() => setOverlayOpen(false)}
            onSave={() => setOverlayOpen(false)}
          />
        </div>
      )}
    </Shell>
  );
}

function normalizeX01Summary(
  rawSummary: any,
  players: PlayerLite[]
) {
  if (!rawSummary || typeof rawSummary !== "object") return null;

  const kind = String(
    rawSummary.kind ||
      rawSummary.variant ||
      rawSummary.engine ||
      rawSummary.game ||
      ""
  );

  const isNativeX01 =
    rawSummary.kind === "x01" ||
    rawSummary.kind === "x01_v3" ||
    rawSummary.variant === "x01_v3" ||
    rawSummary.engine === "x01_v3";

  if (isNativeX01) return rawSummary;
  if (kind !== "training_x01") return null;

  const arr = Array.isArray(rawSummary.perPlayer)
    ? rawSummary.perPlayer
    : [];
  const byPid = Object.fromEntries(
    arr
      .map((row: any) => {
        const pid = String(
          row?.profileId || row?.playerId || row?.id || ""
        );
        return pid ? [pid, row] : null;
      })
      .filter(Boolean)
  );

  const mappedPlayers: any = {};
  const detailedByPlayer: any = {};

  for (const p of players) {
    const row = byPid[p.id] || {};
    const darts = n(row.darts ?? row.dartsThrown ?? row.totalDarts, 0);
    const avg3 = n(
      row.avg3,
      rawSummary?.avg3ByPlayer?.[p.id]
    );
    const points = n(
      row.pointsScored ?? row.points,
      darts ? (avg3 / 3) * darts : 0
    );

    mappedPlayers[p.id] = {
      id: p.id,
      name: p.name || row.name || "—",
      avg3,
      bestVisit: n(row.bestVisit, rawSummary.bestVisit),
      bestCheckout: readBestCOFromRow(rawSummary, row, rawSummary.bestCheckout),
      darts,
      buckets: row.buckets || undefined,
      updatedAt: rawSummary.updatedAt || Date.now(),
      matches: 1,
      legs: 1,
      _sumPoints: points,
      _sumDarts: darts,
      _sumVisits: darts ? Math.ceil(darts / 3) : 0,
    };

    detailedByPlayer[p.id] = {
      ...row,
      playerId: p.id,
      profileId: p.id,
      dartsThrown: darts,
      pointsScored: points,
      bestCheckoutScore: readBestCOFromRow(rawSummary, row, rawSummary.bestCheckout),
      best9Score: n(row.best9Score, rawSummary.best9Score),
      hitsSingle: n(row.singles, row.hitsSingle),
      hitsDouble: n(row.doubles, row.hitsDouble),
      hitsTriple: n(row.triples, row.hitsTriple),
      hitsBull: n(row.bull25 ?? row.bulls, row.hitsBull),
      hitsDBull: n(row.bull50 ?? row.dbulls, row.hitsDBull),
      misses: n(row.miss, row.misses),
      busts: n(row.bust, row.busts),
      coAttempts: n(row.coAttempts, rawSummary.coAttempts),
      coSuccess: n(row.coSuccess, rawSummary.coSuccess),
      checkoutAttempts: n(row.coAttempts, rawSummary.coAttempts),
      checkoutHits: n(row.coSuccess, rawSummary.coSuccess),
    };
  }

  return {
    ...rawSummary,
    kind: "x01",
    isTraining: true,
    players: mappedPlayers,
    detailedByPlayer,
  };
}

/* ================================
   Fallback LEG -> summary-like
================================ */
function buildSummaryFromLeg(rec: any) {
  const leg = rec?.payload?.__legStats || rec?.__legStats;
  const per = leg?.perPlayer;
  const list = leg?.players;
  const now = Date.now();

  const make = (
    rows: Array<{ id: string; name?: string }>,
    get: (id: string) => any
  ) => {
    const players: any = {};
    for (const p of rows) {
      const s = get(p.id) || {};
      const darts = n(s.dartsThrown ?? s.darts);
      const visits = n(s.visits);
      const points = n(
        s.pointsScored,
        (n(s.avg3) / 3) * (darts || visits * 3)
      );
      const bestCO = readBestCOFromRow(rec, s);
      players[p.id] = {
        id: p.id,
        name: p.name || "—",
        avg3: n(s.avg3),
        bestVisit: n(s.bestVisit),
        bestCheckout: bestCO,
        darts: darts || (visits ? visits * 3 : 0),
        win:
          !!s.win ||
          (rec?.winnerId ? rec.winnerId === p.id : false),
        buckets:
          s.buckets && Object.keys(s.buckets).length
            ? s.buckets
            : undefined,
        updatedAt: now,
        matches: 1,
        legs: 1,
        _sumPoints: points,
        _sumDarts: darts || (visits ? visits * 3 : 0),
        _sumVisits: visits || undefined,
      };
    }
    return {
      kind: "x01",
      winnerId: rec?.winnerId ?? null,
      players,
      updatedAt: now,
    };
  };

  if (per && Array.isArray(list)) {
    return make(
      list.map((id) => ({
        id,
        name: rec.players?.find((p: any) => p.id === id)?.name,
      })),
      (id: string) => per[id] || {}
    );
  }

  const ids: string[] = Object.keys(
    rec?.payload?.avg3 || rec?.avg3 || {}
  );
  if (ids.length) {
    const rows = ids.map((id) => ({
      id,
      name: rec.players?.find((p: any) => p.id === id)?.name,
    }));
    const get = (id: string) => ({
      avg3: pick(rec, [`payload.avg3.${id}`, `avg3.${id}`]),
      bestVisit: pick(rec, [
        `payload.bestVisit.${id}`,
        `bestVisit.${id}`,
      ]),
      bestCheckout: sanitizeCOForRecord(
        rec,
        pick(rec, [
          `payload.bestCheckout.${id}`,
          `bestCheckout.${id}`,
        ])
      ),
      darts: pick(rec, [`payload.darts.${id}`, `darts.${id}`]),
      visits: pick(rec, [`payload.visits.${id}`, `visits.${id}`]),
      buckets: undefined,
    });
    return make(rows, get);
  }
  return null;
}

/* ================================
   Metrics & extraction robuste
================================ */
type ByNumber = Record<
  string,
  {
    inner?: number;
    outer?: number;
    double?: number;
    triple?: number;
    miss?: number;
    bull?: number;
    dbull?: number;
  }
>;

type PlayerMetrics = {
  id: string;
  name: string;
  darts: number;
  visits: number;
  points: number;
  avg1: number;
  avg3: number;
  bestVisit: number;
  bestCO: number;
  first9?: number;
  dartsToFinish?: number;
  highestNonCO?: number;
  avgCoDarts?: number;
  checkoutDartsTotal?: number;
  t180: number;
  t140: number;
  t100: number;
  t60: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  singles?: number;
  misses?: number;
  busts?: number;
  doublePct?: number;
  triplePct?: number;
  bullPct?: number;
  dbullPct?: number;
  singleRate?: number;
  bustRate?: number;
  coHits: number;
  coAtt: number;
  coPct: number;
  remaining?: number;
  setsWon?: number;
  legsWon?: number;
  segOuter?: number;
  segInner?: number;
  segDouble?: number;
  segTriple?: number;
  segMiss?: number;
  byNumber?: ByNumber;
};

function getX01OutMode(rec: any): "simple" | "double" | "master" {
  const raw =
    rec?.resume?.config?.outMode ??
    rec?.summary?.game?.outMode ??
    rec?.summary?.outMode ??
    rec?.payload?.config?.outMode ??
    rec?.payload?.game?.outMode ??
    rec?.payload?.outMode ??
    rec?.config?.outMode ??
    rec?.game?.outMode ??
    rec?.outMode ??
    "double";
  const v = String(raw).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v === "single" || v === "straight" || v === "simple" || v.includes("simple")) return "simple";
  if (v === "master" || v.includes("master")) return "master";
  return "double";
}

const X01_FINISH_DARTS = (() => {
  const out: Array<{ value: number; mult: 1 | 2 | 3; seg: number }> = [];
  for (let seg = 1; seg <= 20; seg += 1) {
    out.push({ seg, mult: 1, value: seg });
    out.push({ seg, mult: 2, value: seg * 2 });
    out.push({ seg, mult: 3, value: seg * 3 });
  }
  out.push({ seg: 25, mult: 1, value: 25 });
  out.push({ seg: 25, mult: 2, value: 50 });
  return out;
})();

function isX01FinishableScore(score: number, outMode: any): boolean {
  const target = Number(score);
  const mode = String(outMode || "double");
  const maxFinish = mode === "double" ? 170 : 180;
  if (!Number.isFinite(target) || target <= 1 || target > maxFinish) return false;
  const finishers = X01_FINISH_DARTS.filter((d) => {
    if (mode === "simple") return true;
    if (mode === "master") return d.mult === 2 || d.mult === 3;
    return d.mult === 2;
  });
  for (const last of finishers) {
    if (last.value === target) return true;
    for (const a of X01_FINISH_DARTS) {
      if (a.value + last.value === target) return true;
      for (const b of X01_FINISH_DARTS) {
        if (a.value + b.value + last.value === target) return true;
      }
    }
  }
  return false;
}

function getX01StartScore(rec: any): number {
  const raw =
    rec?.resume?.config?.startScore ??
    rec?.resume?.startScore ??
    rec?.summary?.game?.startScore ??
    rec?.summary?.startScore ??
    rec?.payload?.startScore ??
    rec?.payload?.config?.startScore ??
    rec?.payload?.game?.startScore ??
    rec?.config?.startScore ??
    rec?.game?.startScore;

  const val = Number(raw);
  if (Number.isFinite(val) && val > 0) return val;

  // Fallback historique : certaines cartes n'ont pas startScore mais portent
  // un libellé du type "X01 - 301". C'est nécessaire pour recalculer
  // correctement le score restant du perdant.
  const title = String(
    rec?.title ??
      rec?.label ??
      rec?.name ??
      rec?.summary?.title ??
      rec?.summary?.label ??
      rec?.payload?.title ??
      rec?.payload?.label ??
      rec?.payload?.name ??
      ""
  );
  const match = title.match(/x01\s*[-–—:]?\s*(\d{3,4})/i) || title.match(/(?:start|score|départ|depart)\D*(\d{3,4})/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 501;
}


function hasCheckoutEvidence(row: any): boolean {
  if (!row || typeof row !== "object") return false;
  return (
    n(row.checkoutHits ?? row.coHits ?? row.COHits ?? row.checkoutsMade ?? row.coSuccess, 0) > 0 ||
    row.checkout === true ||
    row.isCheckout === true ||
    row.finish === true ||
    row.isFinish === true ||
    n(row.remaining ?? row.scoreRemaining ?? row.finalScore ?? row.scoreAfter, NaN) === 0
  );
}

function sanitizeCOForRecord(rec: any, value: any, sourceRow?: any): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const r = Math.round(num);

  // Sortie simple : un checkout à 1 est valide.
  // On l'accepte uniquement s'il est explicitement confirmé par le record/row,
  // pour éviter de transformer un vieux champ bruité en Best CO global.
  if (r === 1 && (getX01OutMode(rec) === "simple" || hasCheckoutEvidence(sourceRow))) return 1;

  return sanitizeCO(r);
}

function readBestCOFromRow(rec: any, row: any, fallback?: any): number {
  if (!row || typeof row !== "object") return sanitizeCOForRecord(rec, fallback, row);
  const candidates = [
    row.bestCO,
    row.bestCo,
    row.coBest,
    row.checkoutBest,
    row.bestCheckoutScore,
    row.highestCheckout,
    row.bestCheckout,
    fallback,
  ];
  for (const c of candidates) {
    const co = sanitizeCOForRecord(rec, c, row);
    if (co > 0) return co;
  }
  return 0;
}

function emptyMetrics(p: { id: string; name?: string }): PlayerMetrics {
  return {
    id: p.id,
    name: p.name || "—",
    darts: 0,
    visits: 0,
    points: 0,
    avg1: 0,
    avg3: 0,
    bestVisit: 0,
    bestCO: 0,
    first9: undefined,
    dartsToFinish: undefined,
    highestNonCO: undefined,
    avgCoDarts: undefined,
    checkoutDartsTotal: undefined,
    t180: 0,
    t140: 0,
    t100: 0,
    t60: 0,
    doubles: 0,
    triples: 0,
    bulls: 0,
    dbulls: 0,
    singles: undefined,
    misses: undefined,
    busts: undefined,
    doublePct: undefined,
    triplePct: undefined,
    bullPct: undefined,
    dbullPct: undefined,
    singleRate: undefined,
    bustRate: undefined,
    coHits: 0,
    coAtt: 0,
    coPct: 0,
    remaining: undefined,
    setsWon: undefined,
    legsWon: undefined,
    segOuter: undefined,
    segInner: undefined,
    segDouble: undefined,
    segTriple: undefined,
    segMiss: undefined,
    byNumber: undefined,
  };
}

function getSummaryPlayerStats(summary: any, pid: string): any {
  const playersBlock = summary?.players;
  if (!playersBlock) return null;

  if (Array.isArray(playersBlock)) {
    return (
      playersBlock.find((row: any) =>
        String(row?.id ?? row?.playerId ?? row?.profileId ?? "") === String(pid)
      ) || null
    );
  }

  if (typeof playersBlock === "object") {
    return playersBlock[pid] || playersBlock[String(pid)] || null;
  }

  return null;
}

function pickFromAny(paths: string[], roots: any[], def?: any) {
  for (const root of roots) {
    if (!root || typeof root !== "object") continue;
    const hit = pick(root, paths, undefined);
    if (hit !== undefined && hit !== null) return hit;
  }
  return def;
}

function getPlayerRowFromObjectOrArray(src: any, pid: string): any {
  if (!src) return null;
  if (Array.isArray(src)) {
    return src.find((row: any) => String(row?.id ?? row?.playerId ?? row?.profileId ?? "") === String(pid)) || null;
  }
  if (typeof src === "object") return src[pid] || src[String(pid)] || null;
  return null;
}


function readExplicitX01RankingOrder(rec: any, playerIds: string[]): string[] {
  const ids = (Array.isArray(playerIds) ? playerIds : []).map(String).filter(Boolean);
  if (!ids.length) return [];
  const valid = new Set(ids);
  const roots = [
    rec?.summary,
    rec?.payload?.summary,
    rec?.payload?.state?.summary,
    rec?.payload?.state,
    rec?.resume?.state?.summary,
    rec?.payload?.resume?.state?.summary,
    rec?.resume?.summary,
  ];

  for (const root of roots) {
    if (!root || typeof root !== "object") continue;
    const list = root?.rankings || root?.ranking || root?.playersRanking || root?.standings;
    if (!Array.isArray(list) || !list.length) continue;

    const rows = list
      .map((row: any, index: number) => ({
        id: String(row?.id ?? row?.playerId ?? row?.profileId ?? row?.pid ?? ""),
        rank: Number(row?.finalRank ?? row?.rank ?? row?.position ?? row?.place ?? index + 1),
        index,
      }))
      .filter((row: any) => row.id && valid.has(row.id));

    if (!rows.length) continue;

    rows.sort((a: any, b: any) => {
      if (Number.isFinite(a.rank) && Number.isFinite(b.rank) && a.rank !== b.rank) return a.rank - b.rank;
      return a.index - b.index;
    });

    const ordered = rows.map((row: any) => row.id).filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index);
    for (const id of ids) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }

  return [];
}

function getRankingRowForPlayer(rec: any, summary: any, payloadSummary: any, pid: string): any {
  const roots = [summary, payloadSummary, rec?.summary, rec?.payload?.summary, rec?.payload?.state, rec?.state, rec?.resume?.state];
  for (const root of roots) {
    const list = root?.rankings || root?.ranking || root?.playersRanking || root?.standings;
    if (Array.isArray(list)) {
      const hit = list.find((row: any) => String(row?.id ?? row?.playerId ?? row?.profileId ?? row?.pid ?? "") === String(pid));
      if (hit) return hit;
    }
  }
  return null;
}

function readScoreMapValue(rec: any, summary: any, payloadSummary: any, pid: string, kind: "legs" | "sets"): number | undefined {
  const roots = [summary, payloadSummary, rec?.summary, rec?.payload?.summary, rec?.payload?.state, rec?.state, rec?.resume?.state];
  const paths = kind === "legs"
    ? ["legsByPlayer", "legsWon", "legsScore", "score.legs", "lw"]
    : ["setsByPlayer", "setsWon", "setsScore", "score.sets", "sw"];
  for (const root of roots) {
    if (!root || typeof root !== "object") continue;
    for (const path of paths) {
      const map = pick(root, [path], undefined);
      if (map && typeof map === "object") {
        const direct = map[pid] ?? map[String(pid)];
        if (direct !== undefined && direct !== null && Number.isFinite(Number(direct))) return Number(direct);
        const shortKey = String(pid).slice(0, 20);
        const short = map[shortKey];
        if (short !== undefined && short !== null && Number.isFinite(Number(short))) return Number(short);
      }
    }
  }
  return undefined;
}

function winnerIdFromRecord(rec: any): string | null {
  return rec?.winnerId ?? rec?.payload?.winnerId ?? rec?.summary?.winnerId ?? null;
}

function readExplicitX01FinalScore(rec: any, pid: string): number | undefined {
  const id = String(pid || "");
  if (!id) return undefined;
  const roots = [
    rec?.summary,
    rec?.payload?.summary,
    rec?.resume?.state,
    rec?.payload?.resume?.state,
    rec?.payload,
    rec,
  ].filter(Boolean);

  const maps = [
    "finalScores",
    "remainingScores",
    "scoreByPlayer",
    "scores",
  ];

  for (const root of roots) {
    for (const key of maps) {
      const map = root?.[key];
      if (!map || typeof map !== "object" || Array.isArray(map)) continue;
      const direct = map[id] ?? map[String(id)];
      if (direct !== undefined && direct !== null && Number.isFinite(Number(direct))) return Number(direct);
      const shortHit = Object.keys(map).find((k) => id.startsWith(k) || k.startsWith(id));
      if (shortHit && Number.isFinite(Number(map[shortHit]))) return Number(map[shortHit]);
    }
  }

  const playerRows = [
    rec?.players,
    rec?.payload?.players,
    rec?.summary?.players,
    rec?.payload?.summary?.players,
    rec?.resume?.config?.players,
    rec?.payload?.resume?.config?.players,
  ];
  for (const arr of playerRows) {
    if (!Array.isArray(arr)) continue;
    const row = arr.find((p: any) => String(p?.id ?? p?.playerId ?? p?.profileId ?? "") === id);
    if (!row) continue;
    const raw = row.finalScore ?? row.remainingScore ?? row.score;
    if (raw !== undefined && raw !== null && Number.isFinite(Number(raw))) return Number(raw);
  }

  const detailRows = [
    rec?.summary?.detailedByPlayer,
    rec?.payload?.summary?.detailedByPlayer,
    rec?.resume?.state?.summary?.detailedByPlayer,
    rec?.payload?.resume?.state?.summary?.detailedByPlayer,
    rec?.resume?.state?.liveStatsByPlayer,
    rec?.payload?.resume?.state?.liveStatsByPlayer,
  ];
  for (const obj of detailRows) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    const row = obj[id] || obj[String(id)] || obj[Object.keys(obj).find((k) => id.startsWith(k) || k.startsWith(id)) || ""];
    if (!row) continue;
    const raw = row.finalScore ?? row.remainingScore ?? row.scoreRemaining ?? row.remaining;
    if (raw !== undefined && raw !== null && Number.isFinite(Number(raw))) return Number(raw);
  }
  return undefined;
}

function computeX01RemainingScore(
  m: Partial<PlayerMetrics> & { id?: string },
  rec: any,
  explicitWinnerId?: string | null
): number | undefined {
  const pid = String(m?.id ?? "");
  const winner = explicitWinnerId ? String(explicitWinnerId) : null;
  const startScore = getX01StartScore(rec);

  // Source de vérité import/historique : si le record transporte explicitement
  // un score final corrigé, on le respecte avant tout recalcul depuis les volées.
  const explicitFinal = readExplicitX01FinalScore(rec, pid);
  if (explicitFinal !== undefined) return explicitFinal;

  // Le vainqueur est le seul joueur dont le score restant doit être forcé à 0.
  if ((winner && pid && winner === pid) || (!winner && n(m.bestCO, 0) > 0 && n(m.remaining, 0) === 0)) {
    return 0;
  }

  const rawRemaining = Number(m.remaining);
  if (Number.isFinite(rawRemaining) && rawRemaining > 0) {
    return rawRemaining;
  }

  // Ancien bug : plusieurs payloads historisés écrasent le score final du perdant à 0.
  // Dans ce cas, on recalcule depuis les points réellement marqués.
  const points = n(
    m.points,
    n(m.avg3, 0) > 0 && n(m.darts, 0) > 0
      ? Math.round((n(m.avg3, 0) / 3) * n(m.darts, 0))
      : 0
  );

  if (points > 0 && points < startScore) {
    return Math.max(0, startScore - points);
  }

  if (Number.isFinite(rawRemaining)) {
    return rawRemaining;
  }

  return undefined;
}

function buildPerPlayerMetrics(
  rec: any,
  summary: any | null,
  players: PlayerLite[],
  legStats?: LegStats
) {
  const out: Record<string, PlayerMetrics> = {};
  const outMode = getX01OutMode(rec);

  // ---- sources "riches" possibles ----
  const rich =
    legStats ||
    rec?.payload?.__legStats ||
    rec?.__legStats ||
    {};
  const perFromRich = (rich as any).perPlayer || {};

  const summaryDetailed =
    summary?.detailedByPlayer && typeof summary.detailedByPlayer === "object"
      ? summary.detailedByPlayer
      : {};

  const payloadSummary = rec?.payload?.summary && typeof rec.payload.summary === "object" ? rec.payload.summary : {};
  const payloadDetailed =
    payloadSummary?.detailedByPlayer && typeof payloadSummary.detailedByPlayer === "object"
      ? payloadSummary.detailedByPlayer
      : {};

  const summaryPerPlayerArray = Array.isArray(summary?.perPlayer)
    ? Object.fromEntries(
        summary.perPlayer
          .map((row: any) => {
            const pid = String(
              row?.profileId || row?.playerId || row?.id || ""
            );
            return pid ? [pid, row] : null;
          })
          .filter(Boolean)
      )
    : {};

  // on merge : ce qui vient de __legStats écrase au besoin ce qui vient de detailedByPlayer
  const per: Record<string, any> = {
    ...summaryPerPlayerArray,
    ...payloadDetailed,
    ...summaryDetailed,
    ...perFromRich,
  };

  const legacy = rec?.payload || rec || {};
  const legacyRoots = [
    rec?.summary?.legacy,
    rec?.payload?.summary?.legacy,
    rec?.payload?.legacy,
    rec?.summary,
    rec?.payload,
    rec,
  ].filter(Boolean);
  const legacyHitsBySectorAll: any =
    rec?.summary?.legacy?.hitsBySector ||
    rec?.payload?.summary?.legacy?.hitsBySector ||
    rec?.payload?.legacy?.hitsBySector ||
    {};

  const derivedVisits = buildVisitHistory(
    rec,
    players,
    legStats || rec?.payload?.__legStats || rec?.__legStats || null
  );
  const derivedMaxLegNo = Math.max(
    1,
    ...derivedVisits.map((v: any) => Number(v?.legNo || 1) || 1)
  );

  const derivedByPid = derivedVisits.reduce((acc: any, v) => {
    const pid = String(v.playerId || "");
    if (!pid) return acc;
    const row =
      acc[pid] ||
      (acc[pid] = {
        darts: 0,
        visits: 0,
        points: 0,
        bestVisit: 0,
        bestCO: 0,
        t60: 0,
        t100: 0,
        t140: 0,
        t180: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        bulls: 0,
        dbulls: 0,
        misses: 0,
        busts: 0,
        coHits: 0,
        coAtt: 0,
        checkoutDarts: 0,
        finalScore: undefined,
        finalLegNo: 1,
        byNumber: {},
      });

    row.visits += 1;
    const visitDarts = Array.isArray(v.darts) ? v.darts : [];

    // HISTORIQUE FIX CRITIQUE : certaines cartes historiques conservent les
    // volées sous forme compacte avec seulement { score, playerId } et sans
    // détail des fléchettes. Dans ce cas l'ancien calcul donnait visitPoints=0,
    // donc 60+/100+/140+/180 restaient à 0 alors que le résumé live était bon.
    const rawVisitScore = n(
      v.score ??
        v.points ??
        v.visitScore ??
        v.visitPoints ??
        v.total ??
        v.value,
      0
    );

    const explicitDartsCount = n(
      v.dartsCount ??
        v.dartsThrown ??
        v.nbDarts ??
        v.countDarts ??
        (typeof v.darts === "number" ? v.darts : undefined),
      0
    );
    row.darts += visitDarts.length || explicitDartsCount;

    let visitPoints = visitDarts.length ? 0 : rawVisitScore;
    const isBustVisit = !!v.bust;
    visitDarts.forEach((d: any, dartIdx: number) => {
      const seg = Number(d?.v ?? d?.segment ?? d?.value ?? 0) || 0;
      const mult = Number(d?.mult ?? d?.multiplier ?? d?.m ?? 0) || 0;
      const score = seg === 25 && mult === 2 ? 50 : seg * mult;
      visitPoints += score;

      // Une fléchette de bust reste un impact réel :
      // ex. DBULL qui bust = DBULL + 1 et bust + 1.
      // BUST est une colonne séparée, pas un remplacement du hit.

      if (seg === 0 || mult <= 0) {
        row.misses += 1;
        row.byNumber.miss = (row.byNumber.miss ?? 0) + 1;
        return;
      }
      if (seg === 25 && mult === 2) {
        row.dbulls += 1;
        row.byNumber.dbull = (row.byNumber.dbull ?? 0) + 1;
        return;
      }
      if (seg === 25) {
        row.bulls += 1;
        row.byNumber.bull = (row.byNumber.bull ?? 0) + 1;
        return;
      }

      const key = String(seg);
      const slot = row.byNumber[key] || {};
      if (mult === 3) {
        row.triples += 1;
        slot.triple = (slot.triple ?? 0) + 1;
      } else if (mult === 2) {
        row.doubles += 1;
        slot.double = (slot.double ?? 0) + 1;
      } else {
        row.singles += 1;
        slot.inner = (slot.inner ?? 0) + 1;
      }
      row.byNumber[key] = slot;
    });

    if (v.bust) {
      row.busts += 1;
      visitPoints = 0;
    }

    row.finalScore = n(v.scoreAfter, row.finalScore ?? undefined);
    row.finalLegNo = Number(v.legNo || row.finalLegNo || 1) || 1;

    row.points += visitPoints;
    row.bestVisit = Math.max(row.bestVisit, visitPoints);

    // Power scoring X01 : classes exclusives 60-99 / 100-139 / 140-179 / 180.
    if (visitPoints >= 180) row.t180 += 1;
    else if (visitPoints >= 140) row.t140 += 1;
    else if (visitPoints >= 100) row.t100 += 1;
    else if (visitPoints >= 60) row.t60 += 1;

    // Tentative de checkout : volée commencée avec un finish mathématique réel,
    // selon le mode de sortie de la partie (Double/Master/Straight Out).
    const isCheckoutAttemptVisit = isX01FinishableScore(n(v.scoreBefore, 0), outMode);
    if (isCheckoutAttemptVisit) {
      const checkoutVisitDarts = visitDarts.length || explicitDartsCount;
      row.coAtt += 1;
      row.checkoutDarts = n(row.checkoutDarts, 0) + checkoutVisitDarts;
    }

    if (v.finish) {
      row.bestCO = Math.max(row.bestCO, visitPoints);
      row.coHits += 1;
      if (!isCheckoutAttemptVisit && row.coAtt <= 0) {
        const checkoutVisitDarts = visitDarts.length || explicitDartsCount;
        row.coAtt = 1;
        row.checkoutDarts = Math.max(n(row.checkoutDarts, 0), checkoutVisitDarts);
      }
    }

    return acc;
  }, {} as Record<string, any>);

  for (const pl of players) {
    const pid = pl.id;
    const m = emptyMetrics(pl);

    // ===== 1) summary (rapide) =====
    const s = getSummaryPlayerStats(summary, pid) || getSummaryPlayerStats(payloadSummary, pid);
    if (s) {
      m.avg3 = n(s.avg3);
      m.avg1 = m.avg3 / 3;
      m.bestVisit = n(s.bestVisit);
      m.bestCO = readBestCOFromRow(rec, s);
      m.darts = n(s.darts);
      m.visits = s._sumVisits ? n(s._sumVisits) : m.darts ? Math.ceil(m.darts / 3) : 0;
      m.points = n(s._sumPoints, (m.avg3 / 3) * m.darts);
      m.remaining = v(s.remaining ?? s.scoreRemaining ?? s.finalScore ?? s.scoreAfter);
      m.setsWon = v(s.setsWon ?? s.sets ?? s.matchSets ?? s.wonSets);
      m.legsWon = v(s.legsWon ?? s.legs ?? s.matchLegs ?? s.wonLegs);

      const sb =
        s.buckets ||
        (s.powerBuckets as any) ||
        (s.power as any) ||
        {};
      if (sb) {
        m.t180 = n(sb["180"] ?? sb["180+"] ?? sb.t180 ?? sb.h180 ?? sb._180, m.t180);
        m.t140 = n(sb["140-179"] ?? sb["140+"] ?? sb.t140 ?? sb.h140 ?? sb._140, m.t140);
        m.t100 = n(sb["100-139"] ?? sb["100+"] ?? sb.t100 ?? sb.h100 ?? sb._100, m.t100);
        m.t60 = n(sb["60-99"] ?? sb["60+"] ?? sb.t60 ?? sb.h60 ?? sb._60, m.t60);
      }

      // Historique X01 : certains records stockent les buckets et le checkout
      // directement dans summary.players[pid] et non dans buckets. Le résumé
      // rapide live les affiche bien, mais la table détaillée restait à 0.
      m.t180 = n(s.h180 ?? s.t180 ?? s["180"] ?? s["180+"], m.t180);
      m.t140 = n(s.h140 ?? s.t140 ?? s["140+"] ?? s["140-179"], m.t140);
      m.t100 = n(s.h100 ?? s.t100 ?? s["100+"] ?? s["100-139"], m.t100);
      m.t60 = n(s.h60 ?? s.t60 ?? s["60+"] ?? s["60-99"], m.t60);
      m.coHits = n(s.checkoutHits ?? s.coHits ?? s.coSuccess ?? s.hitsCheckout ?? s.hitsCO, m.coHits);
      m.coAtt = n(s.checkoutAttempts ?? s.coAtt ?? s.coAttempts ?? s.co_attempts ?? s.attemptsCheckout, m.coAtt);
      const summaryCheckoutDartsTotal = v(
        s.checkoutDartsTotal ??
          s.checkoutDartsThrown ??
          s.dartsCheckout ??
          s.checkoutDarts ??
          s.dartsCO
      );
      if (summaryCheckoutDartsTotal != null) {
        m.checkoutDartsTotal = summaryCheckoutDartsTotal;
        m.avgCoDarts = summaryCheckoutDartsTotal;
      } else if (!m.avgCoDarts) {
        m.avgCoDarts = v(s.avgCheckoutDarts);
      }
    }

    // ===== 2) perPlayer riche (V3, training, etc.) =====
    const r = per?.[pid] || getPlayerRowFromObjectOrArray(payloadSummary?.perPlayer, pid) || {};
    const imp = r.impacts || {};

    const summaryLegsMap =
      summary?.legsByPlayer ||
      summary?.legsWon ||
      summary?.legsScore ||
      payloadSummary?.legsByPlayer ||
      payloadSummary?.legsWon ||
      rec?.payload?.legsWon ||
      {};
    const summarySetsMap =
      summary?.setsByPlayer ||
      summary?.setsWon ||
      summary?.setsScore ||
      payloadSummary?.setsByPlayer ||
      payloadSummary?.setsWon ||
      rec?.payload?.setsWon ||
      {};

    const rankingRow = getRankingRowForPlayer(rec, summary, payloadSummary, pid);
    const rankedLegs = rankingRow
      ? Number(rankingRow.legsWon ?? rankingRow.lw ?? rankingRow.legs ?? rankingRow.matchLegs ?? rankingRow.wonLegs)
      : NaN;
    const rankedSets = rankingRow
      ? Number(rankingRow.setsWon ?? rankingRow.sw ?? rankingRow.sets ?? rankingRow.matchSets ?? rankingRow.wonSets)
      : NaN;
    const mappedLegs = readScoreMapValue(rec, summary, payloadSummary, pid, "legs");
    const mappedSets = readScoreMapValue(rec, summary, payloadSummary, pid, "sets");

    m.legsWon = Number.isFinite(rankedLegs)
      ? rankedLegs
      : (mappedLegs !== undefined ? mappedLegs : v(
        m.legsWon ??
          r.legsWonTotal ??
          r.legsWon ??
          r.legs ??
          r.matchLegs ??
          r.wonLegs ??
          summaryLegsMap?.[pid]
      ));
    m.setsWon = Number.isFinite(rankedSets)
      ? rankedSets
      : (mappedSets !== undefined ? mappedSets : v(
        m.setsWon ??
          r.setsWonTotal ??
          r.setsWon ??
          r.sets ??
          r.matchSets ??
          r.wonSets ??
          summarySetsMap?.[pid]
      ));

    m.first9 = v(r.first9Avg);
    m.highestNonCO = v(r.highestNonCheckout);
    m.dartsToFinish = v(r.dartsToFinish);
    const richCheckoutDartsTotal = v(
      r.checkoutDartsTotal ??
        r.checkoutDartsThrown ??
        r.dartsCheckout ??
        r.checkoutDarts ??
        r.dartsCO
    );
    if (richCheckoutDartsTotal != null) {
      m.checkoutDartsTotal = richCheckoutDartsTotal;
      m.avgCoDarts = richCheckoutDartsTotal;
    } else {
      m.avgCoDarts = v(r.avgCheckoutDarts);
    }
    m.remaining = v(r.remaining ?? r.scoreRemaining ?? r.finalScore ?? r.scoreAfter ?? m.remaining);
    if (m.setsWon === undefined) m.setsWon = v(r.setsWonTotal ?? r.setsWon ?? r.sets ?? r.matchSets ?? r.wonSets ?? summarySetsMap?.[pid]);
    if (m.legsWon === undefined) m.legsWon = v(r.legsWonTotal ?? r.legsWon ?? r.legs ?? r.matchLegs ?? r.wonLegs ?? summaryLegsMap?.[pid]);

    // NB de darts : on prend ce qu'on trouve de plus fiable
    const dartsFromDetail = n(
      r.darts ?? r.dartsThrown ?? r.totalDarts,
      0
    );
    if (!m.darts && dartsFromDetail) m.darts = dartsFromDetail;

    // volumes complémentaires (si summary ne les a pas déjà remplis)
    if (!m.points) m.points = n(r.pointsScored, 0);
    if (!m.avg3) m.avg3 = n(r.avg3, 0);
    if (!m.avg1 && m.avg3) m.avg1 = m.avg3 / 3;
    if (!m.bestVisit) m.bestVisit = n(r.bestVisit, 0);
    if (!m.bestCO)
      m.bestCO = readBestCOFromRow(rec, r);

    // ---- HITS bruts : compat X01 V3 / training ----
    // Compat historique X01 : detailedByPlayer peut stocker les hits sous
    // hits: { S, D, T, M, BULL, DBULL } au lieu de champs plats.
    const hitsBag = r.hits && typeof r.hits === "object" ? r.hits : {};

    const dblHits = n(
      r.doubles ??
        hitsBag.D ?? hitsBag.d ?? hitsBag.double ?? hitsBag.doubles ??
        r.hitsD ??
        r.hitsDouble ??
        r.hitsDoubles ??
        r.doubleHits ??
        r.doubleCount ??
        imp.doubles,
      m.doubles
    );
    const trpHits = n(
      r.triples ??
        hitsBag.T ?? hitsBag.t ?? hitsBag.triple ?? hitsBag.triples ??
        r.hitsT ??
        r.hitsTriple ??
        r.hitsTriples ??
        r.tripleHits ??
        r.tripleCount ??
        imp.triples,
      m.triples
    );
    const bulHits = n(
      r.bulls ??
        r.bull ??
        hitsBag.BULL ?? hitsBag.bull ?? hitsBag.B ?? hitsBag.b ??
        r.hitsBull ??
        r.hitsBulls ??
        r.bullHits ??
        imp.bulls,
      m.bulls
    );
    const dbuHits = n(
      r.dbulls ??
        r.dBull ??
        hitsBag.DBULL ?? hitsBag.dbull ?? hitsBag.IB ?? hitsBag.ib ??
        r.hitsDbull ??
        r.hitsDBull ??
        r.doubleBull ??
        r.doubleBullHits ??
        imp.dbulls,
      m.dbulls
    );

    m.doubles = dblHits;
    m.triples = trpHits;
    m.bulls = bulHits;
    m.dbulls = dbuHits;

    if (m.singles == null) {
      m.singles =
        r.singles ??
        hitsBag.S ?? hitsBag.s ?? hitsBag.single ?? hitsBag.singles ??
        r.hitsS ??
        r.hitsSingle ??
        r.hitsSingles ??
        imp.singles ??
        undefined;
    }

    if (m.misses == null) {
      m.misses =
        r.misses ??
        r.miss ??
        hitsBag.M ?? hitsBag.m ?? hitsBag.MISS ?? hitsBag.miss ??
        r.hitsMiss ??
        r.hitsMiss ??
        r.missCount ??
        imp.misses ??
        undefined;
    }

    if (m.busts == null) {
      m.busts =
        r.busts ??
        r.bust ??
        r.bustCount ??
        imp.busts ??
        undefined;
    }

    // checkout
    m.coHits = n(
      r.checkoutHits ??
        r.coHits ??
        r.co_success ??
        r.hitsCheckout ??
        r.hitsCO ??
        imp.coHits,
      m.coHits
    );
    m.coAtt = n(
      r.checkoutAttempts ??
        r.coAtt ??
        r.co_attempts ??
        r.coAttempts ??
        r.attemptsCheckout ??
        imp.coAtt,
      m.coAtt
    );

    // Segments agrégés (si dispo)
    if (r.segments) {
      m.segOuter = v(r.segments.outer);
      m.segInner = v(r.segments.inner);
      m.segDouble = v(r.segments.double);
      m.segTriple = v(r.segments.triple);
      m.segMiss = v(r.segments.miss);
    }

    // Power scoring depuis la partie riche, si pas déjà rempli
    const rb =
      r.buckets || r.powerBuckets || r.power || r.x01Buckets || {};
    if (rb && typeof rb === "object") {
      m.t180 = m.t180 || n(rb["180"] ?? rb["180+"] ?? rb.t180 ?? rb.h180 ?? rb._180, 0);
      m.t140 = m.t140 || n(rb["140-179"] ?? rb["140+"] ?? rb.t140 ?? rb.h140 ?? rb._140, 0);
      m.t100 = m.t100 || n(rb["100-139"] ?? rb["100+"] ?? rb.t100 ?? rb.h100 ?? rb._100, 0);
      m.t60 = m.t60 || n(rb["60-99"] ?? rb["60+"] ?? rb.t60 ?? rb.h60 ?? rb._60, 0);
    }
    // X01PlayV3 sauvegarde aussi ces valeurs en champs plats dans perPlayer.
    m.t180 = m.t180 || n(r.h180 ?? r.t180 ?? r["180"] ?? r["180+"], 0);
    m.t140 = m.t140 || n(r.h140 ?? r.t140 ?? r["140+"] ?? r["140-179"], 0);
    m.t100 = m.t100 || n(r.h100 ?? r.t100 ?? r["100+"] ?? r["100-139"], 0);
    m.t60 = m.t60 || n(r.h60 ?? r.t60 ?? r["60+"] ?? r["60-99"], 0);

    // byNumber (si structure dédiée présente)
    const byNumDirect =
      r.byNumber ||
      imp.byNumber ||
      r.target?.byNumber ||
      r.perNumber ||
      undefined;
    if (byNumDirect && typeof byNumDirect === "object") {
      m.byNumber = byNumDirect as any;
    }

    // Compat X01V3 : detailedByPlayer.segments = { S:{20:1}, D:{16:1}, T:{...} }
    // Sans cette conversion, le radar et les barres par segments restent vides même si
    // les compteurs Singles/Doubles/Triples sont bien présents.
    if (!m.byNumber && r.hitsBySegment && typeof r.hitsBySegment === "object") {
      const byNum: ByNumber = {};
      for (const [rawSeg, rawVal] of Object.entries(r.hitsBySegment)) {
        const segLabel = String(rawSeg).toUpperCase();
        const val: any = rawVal || {};
        if (segLabel === "MISS" || segLabel === "M" || segLabel === "0") {
          (byNum as any).miss = n((byNum as any).miss, 0) + n(val.M ?? val.m ?? val.miss ?? val.MISS ?? val, 0);
          continue;
        }
        if (segLabel === "BULL" || segLabel === "25") {
          (byNum as any).bull = n((byNum as any).bull, 0) + n(val.S ?? val.s ?? val.BULL ?? val.bull ?? val.outer ?? val, 0);
          (byNum as any).dbull = n((byNum as any).dbull, 0) + n(val.D ?? val.d ?? val.DBULL ?? val.dbull ?? val.inner, 0);
          continue;
        }
        const num = Number(String(rawSeg).replace(/^n/i, ""));
        if (!Number.isFinite(num) || num < 1 || num > 20) continue;
        const row: any = {};
        row.inner = n(val.S ?? val.s ?? val.single ?? val.singles ?? val.inner, 0);
        row.double = n(val.D ?? val.d ?? val.double ?? val.doubles, 0);
        row.triple = n(val.T ?? val.t ?? val.triple ?? val.triples, 0);
        if (row.inner || row.double || row.triple) byNum[String(num)] = row;
      }
      if (Object.keys(byNum).length) m.byNumber = byNum;
    }

    if (!m.byNumber) {
      const segSrc = r.segments || r.segmentHits || r.bySegment || {};
      const sMap = segSrc.S || segSrc.s || segSrc.singles || r.bySegmentS || r.hitsBySegmentS || {};
      const dMap = segSrc.D || segSrc.d || segSrc.doubles || r.bySegmentD || r.hitsBySegmentD || {};
      const tMap = segSrc.T || segSrc.t || segSrc.triples || r.bySegmentT || r.hitsBySegmentT || {};
      const byNum: ByNumber = {};
      const add = (map: any, keyName: "inner" | "double" | "triple") => {
        if (!map || typeof map !== "object") return;
        for (const [rawSeg, rawVal] of Object.entries(map)) {
          const seg = String(rawSeg).replace(/^n/i, "");
          const val = n(rawVal, 0);
          if (!val) continue;
          if (seg === "25" || seg.toUpperCase() === "BULL") {
            if (keyName === "double") (byNum as any).dbull = n((byNum as any).dbull, 0) + val;
            else (byNum as any).bull = n((byNum as any).bull, 0) + val;
            continue;
          }
          if (seg.toUpperCase() === "MISS" || seg === "0") {
            (byNum as any).miss = n((byNum as any).miss, 0) + val;
            continue;
          }
          const num = Number(seg);
          if (!Number.isFinite(num) || num < 1 || num > 20) continue;
          const row = byNum[String(num)] || {};
          (row as any)[keyName] = n((row as any)[keyName], 0) + val;
          byNum[String(num)] = row;
        }
      };
      add(sMap, "inner");
      add(dMap, "double");
      add(tMap, "triple");
      if (Object.keys(byNum).length) m.byNumber = byNum;
    }

    // ===== 3) legacy (compat avec anciens formats / v1 / v2) =====
    m.t180 = m.t180 || n(pickFromAny([`h180.${pid}`, `t180.${pid}`], legacyRoots), 0);
    m.t140 = m.t140 || n(pickFromAny([`h140.${pid}`, `t140.${pid}`], legacyRoots), 0);
    m.t100 = m.t100 || n(pickFromAny([`h100.${pid}`, `t100.${pid}`], legacyRoots), 0);
    m.t60 = m.t60 || n(pickFromAny([`h60.${pid}`, `t60.${pid}`], legacyRoots), 0);

    m.darts =
      m.darts ||
      n(pickFromAny([`darts.${pid}`, `dartsThrown.${pid}`], legacyRoots), 0);
    m.visits = m.visits || n(pickFromAny([`visits.${pid}`], legacyRoots), 0);
    m.points =
      m.points ||
      n(pickFromAny([`pointsScored.${pid}`, `points.${pid}`], legacyRoots), 0);
    m.avg3 =
      m.avg3 ||
      n(pickFromAny([`avg3.${pid}`, `avg3d.${pid}`], legacyRoots), 0);
    if (!m.avg1 && m.avg3) m.avg1 = m.avg3 / 3;
    m.bestVisit =
      m.bestVisit || n(pickFromAny([`bestVisit.${pid}`], legacyRoots), 0);
    m.bestCO =
      m.bestCO ||
      sanitizeCOForRecord(
        rec,
        pickFromAny([
          `bestCheckout.${pid}`,
          `highestCheckout.${pid}`,
          `bestCO.${pid}`,
        ], legacyRoots),
        { checkoutHits: m.coHits, coHits: m.coHits, remaining: m.remaining }
      );

    const dblC = n(
      pickFromAny([
        `doubles.${pid}`,
        `doubleCount.${pid}`,
        `dbl.${pid}`,
      ], legacyRoots),
      0
    );
    const trpC = n(
      pickFromAny([
        `triples.${pid}`,
        `tripleCount.${pid}`,
        `trp.${pid}`,
      ], legacyRoots),
      0
    );
    const bulC = n(
      pickFromAny([
        `bulls.${pid}`,
        `bullCount.${pid}`,
        `bull.${pid}`,
      ], legacyRoots),
      0
    );
    const dbuC = n(
      pickFromAny([
        `dbulls.${pid}`,
        `doubleBull.${pid}`,
        `doubleBulls.${pid}`,
        `bull50.${pid}`,
      ], legacyRoots),
      0
    );
    const sngC = pickFromAny([`singles.${pid}`, `single.${pid}`], legacyRoots);
    const misC = pickFromAny([`misses.${pid}`, `miss.${pid}`], legacyRoots);
    const bstC = pickFromAny([
      `busts.${pid}`,
      `bust.${pid}`,
      `bustCount.${pid}`,
    ], legacyRoots);

    if (!m.doubles) m.doubles = dblC || m.doubles;
    if (!m.triples) m.triples = trpC || m.triples;
    if (!m.bulls) m.bulls = bulC || m.bulls;
    if (!m.dbulls) m.dbulls = dbuC || m.dbulls;
    if (m.singles == null && sngC != null) m.singles = n(sngC, 0);
    if (m.misses == null && misC != null) m.misses = n(misC, 0);
    if (m.busts == null && bstC != null) m.busts = n(bstC, 0);

    m.coHits =
      m.coHits ||
      n(pickFromAny([`checkoutHits.${pid}`], legacyRoots), m.coHits);
    m.coAtt =
      m.coAtt ||
      n(
        pickFromAny([`checkoutAttempts.${pid}`], legacyRoots),
        m.coAtt
      );

    m.remaining = v(pickFromAny([`remaining.${pid}`, `finalScores.${pid}`, `scoreAfter.${pid}`, `scores.${pid}`], legacyRoots), m.remaining);
    if (m.setsWon === undefined) m.setsWon = v(pickFromAny([`setsWon.${pid}`, `sets.${pid}`, `score.sets.${pid}`], legacyRoots));
    if (m.legsWon === undefined) m.legsWon = v(pickFromAny([`legsWon.${pid}`, `legs.${pid}`, `score.legs.${pid}`], legacyRoots));

    // ===== 3b) source de vérité replay/volées =====
    // Pour X01, les compteurs finaux/history doivent être recalculés depuis les
    // fléchettes réellement jouées. Les maps live/legacy peuvent contenir des
    // volées padding à 3 darts, des BULL/DBULL fusionnés, ou des busts comptés
    // dans le power scoring. On remplace donc les compteurs sensibles dès que
    // le replay est disponible.
    const dv = derivedByPid[pid];
    if (dv && n(dv.visits, 0) > 0) {
      // Les buckets power-scoring sont fiables uniquement si le replay permet
      // vraiment de les recalculer. Si le replay compact ne donne que les hits
      // par segments, il peut produire 0/0/0/0 et ne doit pas écraser les
      // buckets déjà lus depuis summary.players/perPlayer/legacy.
      const dvPowerTotal = n(dv.t60, 0) + n(dv.t100, 0) + n(dv.t140, 0) + n(dv.t180, 0);
      if (dvPowerTotal > 0 || (n(m.t60, 0) + n(m.t100, 0) + n(m.t140, 0) + n(m.t180, 0)) === 0) {
        m.t60 = n(dv.t60, 0);
        m.t100 = n(dv.t100, 0);
        m.t140 = n(dv.t140, 0);
        m.t180 = n(dv.t180, 0);
      }

      // On ne remplace les métriques de volume que si le replay porte vraiment
      // assez d'information. Sinon on garde les valeurs summary déjà bonnes
      // (darts, avg, best visit) et on corrige seulement les compteurs à 0.
      if (n(dv.darts, 0) > 0) {
        m.darts = n(dv.darts, 0);
        m.visits = n(dv.visits, 0);
        m.points = n(dv.points, 0);
        m.avg3 = m.darts > 0 ? (m.points / m.darts) * 3 : 0;
        m.avg1 = m.avg3 / 3;
      } else {
        m.visits = m.visits || n(dv.visits, 0);
        m.points = m.points || n(dv.points, 0);
      }

      if (n(dv.bestVisit, 0) > 0) m.bestVisit = n(dv.bestVisit, 0);
      if (sanitizeCOForRecord(rec, dv.bestCO, dv) > 0) m.bestCO = sanitizeCOForRecord(rec, dv.bestCO, dv);

      const hitTotal = n(dv.singles, 0) + n(dv.doubles, 0) + n(dv.triples, 0) + n(dv.bulls, 0) + n(dv.dbulls, 0) + n(dv.misses, 0);
      if (hitTotal > 0) {
        m.singles = n(dv.singles, 0);
        m.doubles = n(dv.doubles, 0);
        m.triples = n(dv.triples, 0);
        m.bulls = n(dv.bulls, 0);
        m.dbulls = n(dv.dbulls, 0);
        m.misses = n(dv.misses, 0);
        if (dv.byNumber) m.byNumber = dv.byNumber;
      }
      m.busts = n(dv.busts, m.busts ?? 0);
      // Même principe pour checkout : ne pas écraser les champs sauvegardés
      // par 0 quand le replay historique n'a pas assez de contexte.
      if (n(dv.coHits, 0) > 0 || n(dv.coAtt, 0) > 0) {
        m.coHits = n(dv.coHits, m.coHits ?? 0);
        m.coAtt = n(dv.coAtt, m.coAtt ?? 0);
      }
      if (n(dv.checkoutDarts, 0) > 0) {
        m.checkoutDartsTotal = n(dv.checkoutDarts, m.checkoutDartsTotal ?? 0);
        m.avgCoDarts = m.checkoutDartsTotal;
      }

      // En multi-legs, un joueur peut ne pas relancer dans le leg décisif
      // (ex. l'adversaire check-out au premier tour). Dans ce cas son dernier
      // scoreAfter issu du replay appartient au leg précédent et ne doit pas
      // écraser finalScores/remaining déjà sauvegardé par le moteur.
      const hasExplicitRemaining =
        m.remaining != null && Number.isFinite(Number(m.remaining));
      const dvIsFinalLeg = n(dv.finalLegNo, 1) >= derivedMaxLegNo;
      if (
        dv.finalScore !== undefined &&
        (!hasExplicitRemaining || derivedMaxLegNo <= 1 || dvIsFinalLeg)
      ) {
        m.remaining = n(dv.finalScore, m.remaining ?? undefined);
      }
    }

    // Score restant final : seul le vainqueur est forcé à 0.
    // Pour les perdants, si l'historique ne porte pas de scoreAfter fiable ou
    // si un ancien payload l'a écrasé à 0, on recalcule depuis le score de départ
    // et les points marqués (ex. 301 - 286 = 15).
    const winnerPid = winnerIdFromRecord(rec);
    const startScoreForRemaining = getX01StartScore(rec);
    if (winnerPid === pid) {
      m.remaining = 0;
    } else if (m.remaining == null || m.remaining === 0) {
      const pointsForRemaining = n(m.points, 0);
      if (pointsForRemaining > 0) {
        m.remaining = Math.max(0, startScoreForRemaining - pointsForRemaining);
      }
    }

    // ===== 4) dérivés & % =====
    if (!m.points && m.avg3 && m.darts) {
      m.points = Math.round((m.avg3 / 3) * m.darts);
    }
    if (!m.visits && m.darts) {
      m.visits = Math.ceil(m.darts / 3);
    }

    // Dernier filet de sécurité : certains historiques anciens portent remaining/finalScore à 0
    // pour tous les joueurs. Après avoir stabilisé points/avg/darts, on recalcule le perdant.
    // Si un import corrigé porte finalScores/remainingScores, cette valeur gagne toujours.
    const safeRemaining = computeX01RemainingScore(m, rec, winnerIdFromRecord(rec));
    if (safeRemaining !== undefined) {
      m.remaining = safeRemaining;
    }

    // si darts encore à 0, tente un fallback minimal (hits connus)
    if (!m.darts) {
      const hitsKnown =
        n(m.singles, 0) +
        n(m.doubles, 0) +
        n(m.triples, 0) +
        n(m.bulls, 0) +
        n(m.dbulls, 0) +
        n(m.misses, 0);
      if (hitsKnown > 0) m.darts = hitsKnown;
    }

    const darts = Math.max(0, n(m.darts, 0));

    // % basés prioritairement sur attempts → sinon fallback hits/darts
    const dblAtt = n(
      r.doubleAttempts ?? imp.doubleAttempts ?? r.attemptsDouble ?? r.attemptsDoubles,
      0
    );
    const trpAtt = n(
      r.tripleAttempts ?? imp.tripleAttempts ?? r.attemptsTriple ?? r.attemptsTriples,
      0
    );
    const bulAtt = n(
      r.bullAttempts ?? imp.bullAttempts ?? r.attemptsBull ?? r.attemptsBulls,
      0
    );
    const dbuAtt = n(
      r.dbullAttempts ??
        imp.dbullAttempts ??
        r.doubleBullAttempts ??
        imp.doubleBullAttempts,
      0
    );

    const dblHit = n(
      r.doubleHits ?? imp.doubleHits ?? m.doubles,
      m.doubles
    );
    const trpHit = n(
      r.tripleHits ?? imp.tripleHits ?? m.triples,
      m.triples
    );
    const bulHit = n(
      r.bullHits ?? imp.bullHits ?? m.bulls,
      m.bulls
    );
    const dbuHit = n(
      r.dbullHits ??
        imp.dbullHits ??
        r.doubleBullHits ??
        imp.doubleBullHits ??
        m.dbulls,
      m.dbulls
    );

    m.doublePct =
      dblAtt > 0
        ? (dblHit / dblAtt) * 100
        : darts
        ? (n(m.doubles) / darts) * 100
        : undefined;

    m.triplePct =
      trpAtt > 0
        ? (trpHit / trpAtt) * 100
        : darts
        ? (n(m.triples) / darts) * 100
        : undefined;

    m.bullPct =
      bulAtt > 0
        ? (bulHit / bulAtt) * 100
        : darts
        ? (n(m.bulls) / darts) * 100
        : undefined;

    m.dbullPct =
      dbuAtt > 0
        ? (dbuHit / dbuAtt) * 100
        : darts
        ? (n(m.dbulls) / darts) * 100
        : undefined;

    // singles / bust rates
    const sngAtt = n(
      r.singleAttempts ?? imp.singleAttempts ?? r.attemptsSingle ?? r.attemptsSingles,
      0
    );
    const bstAtt = n(
      r.bustAttempts ?? imp.bustAttempts ?? r.attemptsBust ?? r.attemptsBusts,
      0
    );
    const sngHit = n(
      r.singleHits ?? imp.singleHits ?? n(m.singles, 0),
      n(m.singles, 0)
    );
    const bstHit = n(
      r.bustHits ?? imp.bustHits ?? n(m.busts, 0),
      n(m.busts, 0)
    );

    m.singleRate =
      sngAtt > 0
        ? (sngHit / sngAtt) * 100
        : darts
        ? (n(m.singles) / darts) * 100
        : undefined;

    m.bustRate =
      bstAtt > 0
        ? (bstHit / bstAtt) * 100
        : darts
        ? (n(m.busts) / darts) * 100
        : undefined;

    // Checkout fallback historique : si le joueur a un Best CO, il y a forcément
    // un checkout réussi, même si la carte historique n'a pas stocké coHits/coAtt.
    // C'était le dernier cas où le résumé live était bon mais la fiche historique
    // affichait CO hits/att/%/Darts CO à 0.
    if (n(m.bestCO, 0) > 0) {
      if (m.coHits <= 0) m.coHits = 1;
      if (m.coAtt <= 0) m.coAtt = 1;

      if (!m.checkoutDartsTotal || m.checkoutDartsTotal <= 0) {
        const finishVisit = derivedVisits
          .filter((vv) => String(vv.playerId) === String(pid))
          .slice()
          .reverse()
          .find((vv) => !!vv.finish || n(vv.score, 0) === n(m.bestCO, 0));
        const fd = Array.isArray(finishVisit?.darts) ? finishVisit!.darts.length : 0;
        if (fd > 0) {
          m.checkoutDartsTotal = fd;
          m.avgCoDarts = fd;
        }
      }
    }

    // Darts CO fallback : quand le résumé historique indique bien un checkout
    // réussi mais ne stocke pas la longueur exacte de la volée de finish, on
    // déduit le nombre de fléchettes de la dernière volée du joueur.
    if ((!m.checkoutDartsTotal || m.checkoutDartsTotal <= 0) && m.coHits > 0) {
      const lastVisitDarts = m.darts > 0 && m.visits > 0 ? m.darts - (m.visits - 1) * 3 : 0;
      if (lastVisitDarts > 0 && lastVisitDarts <= 3) {
        m.checkoutDartsTotal = lastVisitDarts;
        m.avgCoDarts = lastVisitDarts;
      } else if (m.dartsToFinish != null && m.dartsToFinish > 0) {
        m.checkoutDartsTotal = m.dartsToFinish;
        m.avgCoDarts = m.dartsToFinish;
      }
    }

    if ((m.checkoutDartsTotal == null || m.checkoutDartsTotal <= 0) && m.avgCoDarts != null && m.avgCoDarts > 0) {
      m.checkoutDartsTotal = m.avgCoDarts;
    }

    // CO%
    if (m.coAtt > 0) {
      m.coPct = (m.coHits / m.coAtt) * 100;
    } else if (m.coHits > 0) {
      // fallback simple si on n'a pas les tentatives détaillées
      m.coPct = 100;
    }

    // ===== 5) données cible / byNumber =====
    const singlesFallback = Math.max(
      0,
      darts -
        (n(m.doubles) +
          n(m.triples) +
          n(m.bulls) +
          n(m.dbulls) +
          n(m.misses))
    );
    if (m.singles == null) m.singles = singlesFallback;

    if (m.segOuter == null || m.segInner == null) {
      const sng = n(m.singles, 0);
      m.segOuter = n(m.segOuter, Math.round(sng * 0.55));
      m.segInner = n(m.segInner, sng - n(m.segOuter, 0));
    }
    if (m.segDouble == null) m.segDouble = n(m.doubles, 0);
    if (m.segTriple == null) m.segTriple = n(m.triples, 0);
    if (m.segMiss == null) m.segMiss = n(m.misses, 0);

    // Si on n'a toujours pas de byNumber, on reconstruit une version simple
    // à partir de legacy.hitsBySector (comptage global par numéro).
    if (!m.byNumber) {
      const legacyHits: any = legacyHitsBySectorAll?.[pid];
      if (legacyHits && typeof legacyHits === "object") {
        const byNum: ByNumber = {};
        let bullTotal = 0;
        let dbullTotal = 0;
        let missTotal = 0;

        for (const [seg, valRaw] of Object.entries(legacyHits)) {
          const val = n(valRaw, 0);
          if (!val) continue;
          const segKey = String(seg).toUpperCase();

          if (segKey === "MISS") {
            missTotal += val;
            continue;
          }
          if (segKey === "OB") {
            bullTotal += val;
            continue;
          }
          if (segKey === "IB") {
            dbullTotal += val;
            continue;
          }

          const num = Number(segKey);
          if (!Number.isFinite(num)) continue;

          const key = String(num);
          const row = byNum[key] || {};
          row.inner = (row.inner ?? 0) + val;
          byNum[key] = row;
        }

        (byNum as any).bull = bullTotal;
        (byNum as any).dbull = dbullTotal;
        (byNum as any).miss = missTotal;

        m.byNumber = byNum;
      }
    }

    out[pid] = m;
  }

  return out;
}


function getLegsPerSetFromRecord(rec: any): number {
  const raw = pickFromAny(
    [
      "summary.game.legsPerSet",
      "payload.summary.game.legsPerSet",
      "payload.config.legsPerSet",
      "payload.game.legsPerSet",
      "config.legsPerSet",
      "game.legsPerSet",
    ],
    [rec],
    1
  );
  const val = Number(raw);
  return Number.isFinite(val) && val > 0 ? val : 1;
}

function getSetsToWinFromRecord(rec: any): number {
  const raw = pickFromAny(
    [
      "summary.game.setsToWin",
      "payload.summary.game.setsToWin",
      "payload.config.setsToWin",
      "payload.game.setsToWin",
      "config.setsToWin",
      "game.setsToWin",
    ],
    [rec],
    1
  );
  const val = Number(raw);
  return Number.isFinite(val) && val > 0 ? val : 1;
}

function maxMapValue(obj: any): number {
  if (!obj || typeof obj !== "object") return 0;
  return Math.max(0, ...Object.values(obj).map((x: any) => Number(x) || 0));
}

function isX01MatchWithDetails(rec: any, visits: VisitRow[]): boolean {
  if (!rec) return false;
  const legsPerSet = getLegsPerSetFromRecord(rec);
  const setsToWin = getSetsToWinFromRecord(rec);
  const distinctLegs = new Set((visits || []).map((v) => Number(v.legNo || 1))).size;

  const summary = rec?.summary || rec?.payload?.summary || {};
  const maxLegsWon = Math.max(
    maxMapValue(summary?.legsByPlayer),
    maxMapValue(summary?.legsWon),
    maxMapValue(summary?.legsScore),
    maxMapValue(rec?.payload?.legsWon)
  );
  const maxSetsWon = Math.max(
    maxMapValue(summary?.setsByPlayer),
    maxMapValue(summary?.setsWon),
    maxMapValue(summary?.setsScore),
    maxMapValue(rec?.payload?.setsWon)
  );

  return distinctLegs > 1 || legsPerSet > 1 || setsToWin > 1 || maxLegsWon > 1 || maxSetsWon > 1;
}

function buildLegBreakdown(
  rec: any,
  players: PlayerLite[],
  visits: VisitRow[]
): LegBreakdown[] {
  if (!rec || !players.length || !visits.length) return [];

  const legsPerSet = getLegsPerSetFromRecord(rec);
  const groups = new Map<string, VisitRow[]>();

  for (const visit of visits) {
    const legNo = Math.max(1, Number(visit.legNo || 1) || 1);
    const setNo = Math.max(1, Number(visit.setNo || Math.floor((legNo - 1) / legsPerSet) + 1) || 1);
    const legInSet = Math.max(1, Number(visit.legInSet || ((legNo - 1) % legsPerSet) + 1) || 1);
    const key = `${setNo}:${legInSet}:${legNo}`;
    const normalized = { ...visit, legNo, setNo, legInSet };
    const bucket = groups.get(key) || [];
    bucket.push(normalized);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const first = rows[0] || ({} as VisitRow);
      const legNo = Math.max(1, Number(first.legNo || 1) || 1);
      const setNo = Math.max(1, Number(first.setNo || Math.floor((legNo - 1) / legsPerSet) + 1) || 1);
      const legInSet = Math.max(1, Number(first.legInSet || ((legNo - 1) % legsPerSet) + 1) || 1);
      const winnerVisit = rows.find((v) => v.finish && !v.bust) || null;
      const winnerId = winnerVisit ? String(winnerVisit.playerId || "") : null;

      const syntheticSummary = {
        kind: "x01",
        winnerId,
        game: {
          ...(rec?.summary?.game || rec?.payload?.summary?.game || {}),
          startScore: getX01StartScore(rec),
          legsPerSet,
        },
        visitHistory: rows,
        visitsHistory: rows,
        __legStats: { visits: rows },
        legacy: {
          winnerId,
          visitHistory: rows,
          visitsHistory: rows,
        },
      };

      const syntheticRec = {
        ...rec,
        winnerId,
        summary: syntheticSummary,
        payload: {
          ...(rec?.payload || {}),
          winnerId,
          visitHistory: rows,
          visitsHistory: rows,
          __legStats: { visits: rows },
          summary: syntheticSummary,
        },
        visitHistory: rows,
        visitsHistory: rows,
        __legStats: { visits: rows },
      };

      return {
        key,
        legNo,
        setNo,
        legInSet,
        title: `Set ${setNo} — Leg ${legInSet}`,
        winnerId,
        visits: rows,
        metrics: buildPerPlayerMetrics(syntheticRec, syntheticSummary, players),
      } as LegBreakdown;
    })
    .sort((a, b) => a.legNo - b.legNo || a.setNo - b.setNo || a.legInSet - b.legInSet);
}


/* ================================
   Détection colonnes optionnelles
================================ */
function detectAvailability(M: Record<string, PlayerMetrics>) {
  const vals = Object.values(M);
  const any = (k: keyof PlayerMetrics) =>
    vals.some(
      (v) => v[k] != null && Number(v[k] as any) !== 0
    );
  const segAny = ["segOuter", "segInner", "segDouble", "segTriple", "segMiss"].some(
    (k) => any(k as any)
  );
  const impactsAny =
    any("doubles") ||
    any("triples") ||
    any("bulls") ||
    any("dbulls") ||
    any("doublePct") ||
    any("triplePct") ||
    any("bullPct") ||
    any("dbullPct");

  return {
    first9: any("first9"),
    dartsToFinish: any("dartsToFinish"),
    highestNonCO: any("highestNonCO"),
    avgCoDarts: any("avgCoDarts"),
    singles: any("singles"),
    misses: any("misses"),
    segments: segAny,
    rates:
      any("doublePct") ||
      any("triplePct") ||
      any("bullPct") ||
      any("dbullPct") ||
      any("coPct") ||
      any("singleRate") ||
      any("bustRate"),
    impacts: impactsAny,
  };
}

/* ================================
   UI de base
================================ */
function Shell({
  go,
  title,
  children,
  canResume,
  resumeId,
  header,
}: {
  go: (t: string, p?: any) => void;
  title?: string;
  children?: React.ReactNode;
  canResume?: boolean;
  resumeId?: string | null;
  header?: React.ReactNode;
}) {
  return (
    <div
      className="x-end"
      style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}
    >
      {header ? (
        <div style={{ marginBottom: 10 }}>{header}</div>
      ) : (
        <>
          <button onClick={() => go("stats", { tab: "history" })} style={btn()}>
            ← Retour
          </button>
          <h2 style={{ margin: "10px 0 8px", letterSpacing: 0.3 }}>
            {title || "Fin de partie"}
          </h2>
        </>
      )}
      {children}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => go("stats", { tab: "history" })}
          style={btn()}
        >
          ← Historique
        </button>
        {canResume && resumeId ? (
          <button
            onClick={() => go("x01", { resumeId })}
            style={btnGold()}
          >
            Reprendre
          </button>
        ) : null}
      </div>
    </div>
  );
}
function Panel({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        padding: D.cardPad,
        borderRadius: D.radius,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,26,.96), rgba(14,14,16,.98))",
        boxShadow: "0 18px 46px rgba(0,0,0,.35)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function CardTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="x-card" style={{ padding: D.cardPad }}>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: D.fsHead + 1,
          letterSpacing: 0.2,
          color: THEME_ACCENT,
        }}
      >
        {title}
      </h3>
      {children}
    </Panel>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Panel>
      <div style={{ color: "#bbb" }}>{children}</div>
    </Panel>
  );
}
function InfoCard({ children }: { children: React.ReactNode }) {
  return <Panel style={{ color: "#bbb" }}>{children}</Panel>;
}

function SummaryDetailsTabs({
  value,
  onChange,
}: {
  value: "summary" | "details";
  onChange: (value: "summary" | "details") => void;
}) {
  const tab = (key: "summary" | "details", label: string) => {
    const active = value === key;
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        style={{
          flex: 1,
          border: active ? "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 57%, transparent)" : "1px solid rgba(255,255,255,.10)",
          background: active
            ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
            : "linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03))",
          color: active ? "#141417" : "#e8e8ec",
          borderRadius: 999,
          padding: "8px 10px",
          fontSize: 12,
          fontWeight: 1000,
          cursor: "pointer",
          boxShadow: active ? "0 0 16px color-mix(in srgb, var(--dc-accent, #f6c256) 22%, transparent)" : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        margin: "0 0 10px",
        padding: 4,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.04)",
      }}
    >
      {tab("summary", "Résumé cumulé")}
      {tab("details", "Détails legs")}
    </div>
  );
}

type LegBreakdown = {
  key: string;
  legNo: number;
  setNo: number;
  legInSet: number;
  title: string;
  winnerId: string | null;
  visits: VisitRow[];
  metrics: Record<string, PlayerMetrics>;
};

function MatchLegDetails({
  breakdown,
  players,
  tableStyle,
}: {
  breakdown: LegBreakdown[];
  players: PlayerLite[];
  tableStyle: React.CSSProperties;
}) {
  const cols = players.map((p) => ({ key: p.id, title: p.name || "—" }));

  if (!breakdown.length) {
    return (
      <InfoCard>
        Aucun détail de leg disponible pour ce match. Pour les anciennes sauvegardes, seuls le score cumulé sets/legs et les stats globales peuvent être récupérés.
      </InfoCard>
    );
  }

  const sets = React.useMemo(() => {
    const map = new Map<number, LegBreakdown[]>();
    for (const leg of breakdown) {
      const setNo = Math.max(1, Number(leg.setNo || 1) || 1);
      const arr = map.get(setNo) || [];
      arr.push(leg);
      map.set(setNo, arr);
    }
    return Array.from(map.entries())
      .map(([setNo, legs]) => ({
        setNo,
        legs: legs.sort((a, b) => a.legInSet - b.legInSet || a.legNo - b.legNo),
      }))
      .sort((a, b) => a.setNo - b.setNo);
  }, [breakdown]);

  const [activeSet, setActiveSet] = React.useState<number>(sets[0]?.setNo || 1);
  const activeSetObj = sets.find((s) => s.setNo === activeSet) || sets[0];
  const [activeLegKey, setActiveLegKey] = React.useState<string>(activeSetObj?.legs?.[0]?.key || "");

  React.useEffect(() => {
    const setObj = sets.find((s) => s.setNo === activeSet) || sets[0];
    if (!setObj) return;
    if (!setObj.legs.some((leg) => leg.key === activeLegKey)) {
      setActiveLegKey(setObj.legs[0]?.key || "");
    }
  }, [sets, activeSet, activeLegKey]);

  const selectedSet = sets.find((s) => s.setNo === activeSet) || sets[0];
  const selectedLeg =
    selectedSet?.legs.find((leg) => leg.key === activeLegKey) || selectedSet?.legs?.[0];

  const pill = (active: boolean): React.CSSProperties => ({
    border: active ? "1px solid rgba(255,190,36,.85)" : "1px solid rgba(255,255,255,.10)",
    background: active ? "linear-gradient(180deg,#ffc233,#f0a900)" : "rgba(255,255,255,.05)",
    color: active ? "#181000" : "rgba(255,255,255,.82)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
    boxShadow: active ? "0 0 18px rgba(255,190,36,.22)" : "none",
  });

  const winnerName =
    selectedLeg?.winnerId && players.find((p) => p.id === selectedLeg.winnerId)?.name
      ? players.find((p) => p.id === selectedLeg.winnerId)?.name
      : null;

  return (
    <>
      <InfoCard>
        <b>Détails par set / leg</b> — choisis d’abord le set, puis la manche. Le résumé cumulé additionne toutes les legs du match.
      </InfoCard>

      <Panel className="x-card" style={{ padding: D.cardPad }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 3 }}>
          <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
            {sets.map((s) => (
              <button
                key={s.setNo}
                type="button"
                onClick={() => {
                  setActiveSet(s.setNo);
                  setActiveLegKey(s.legs[0]?.key || "");
                }}
                style={pill(s.setNo === selectedSet?.setNo)}
              >
                Set {s.setNo}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: 8, paddingBottom: 3 }}>
          <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
            {(selectedSet?.legs || []).map((leg) => (
              <button
                key={leg.key}
                type="button"
                onClick={() => setActiveLegKey(leg.key)}
                style={pill(leg.key === selectedLeg?.key)}
              >
                Leg {leg.legInSet}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {selectedLeg ? (
        <Panel key={selectedLeg.key} className="x-card" style={{ padding: D.cardPad }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: D.fsHead + 1,
                letterSpacing: 0.2,
                color: THEME_ACCENT,
              }}
            >
              Set {selectedLeg.setNo} — Leg {selectedLeg.legInSet}
            </h3>
            {winnerName ? (
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 30%, transparent)",
                  background: "color-mix(in srgb, var(--dc-accent, #f6c256) 10%, transparent)",
                  color: THEME_ACCENT,
                  fontSize: 10.5,
                  fontWeight: 1000,
                  whiteSpace: "nowrap",
                }}
              >
                🏆 {winnerName}
              </span>
            ) : null}
          </div>

          <TableColMajor
            columns={cols}
            rowGroups={[
              {
                rows: [
                  { label: "Score restant", get: (m) => (m.remaining != null ? f0(m.remaining) : "—") },
                  { label: "Avg/3D", get: (m) => f2(m.avg3) },
                  { label: "Best visit", get: (m) => f0(m.bestVisit) },
                  { label: "Darts", get: (m) => f0(m.darts) },
                  { label: "Visits", get: (m) => f0(m.visits) },
                  { label: "Points", get: (m) => f0(m.points) },
                  { label: "60+", get: (m) => f0(m.t60) },
                  { label: "100+", get: (m) => f0(m.t100) },
                  { label: "140+", get: (m) => f0(m.t140) },
                  { label: "180", get: (m) => f0(m.t180) },
                  { label: "Best CO", get: (m) => f0(m.bestCO) },
                  { label: "CO", get: (m) => f0(m.coAtt) },
                  { label: "CO hits", get: (m) => f0(m.coHits) },
                  { label: "CO %", get: (m) => pct(m.coPct) },
                ],
              },
            ]}
            dataMap={selectedLeg.metrics}
            tableStyle={tableStyle}
          />

          <div style={{ marginTop: 8 }}>
            <VisitsList
              visits={selectedLeg.visits.map((v, idx) => ({ ...v, idx: idx + 1 }))}
              playersById={Object.fromEntries(players.map((p) => [p.id, p]))}
            />
          </div>
        </Panel>
      ) : null}
    </>
  );
}

function Trophy(props: any) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} {...props}>
      <path
        fill="currentColor"
        d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"
      />
    </svg>
  );
}

function ArrowLeftIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} {...props}>
      <path
        fill="currentColor"
        d="M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H20a1 1 0 1 1 0 2h-9.59l4.3 4.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0Z"
      />
    </svg>
  );
}

function modeTitleFromRec(rec: any) {
  const raw =
    rec?.summary?.mode ||
    rec?.game?.mode ||
    rec?.summary?.kind ||
    rec?.kind ||
    "Fin de partie";
  const value = String(raw || "Fin de partie").replace(/_/g, " ").trim();
  if (!value) return "Fin de partie";
  return value.toUpperCase();
}

function avatarInitials(name?: string) {
  const s = String(name || "?").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function AvatarBubble({
  player,
  crowned,
  size = 34,
}: {
  player: PlayerLite;
  crowned?: boolean;
  size?: number;
}) {
  const src = getAvatarSrc(player);
  return (
    <div
      className="x-player-avatar"
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 999,
        border: crowned
          ? "2px solid color-mix(in srgb, var(--dc-accent, #f6c256) 88%, transparent)"
          : "2px solid rgba(255,255,255,.18)",
        boxShadow: crowned
          ? "0 0 16px color-mix(in srgb, var(--dc-accent, #f6c256) 28%, transparent)"
          : "0 6px 14px rgba(0,0,0,.22)",
        overflow: "hidden",
        background: "linear-gradient(180deg,#2a2a31,#121218)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: Math.max(9, Math.round(size * 0.32)),
        fontWeight: 900,
        flex: "0 0 auto",
      }}
      title={player?.name || "Joueur"}
    >
      {src ? (
        <img
          src={src}
          alt={player.name || "avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{avatarInitials(player?.name)}</span>
      )}
    </div>
  );
}

function getAvatarSrc(player?: PlayerLite | null): string | null {
  return (
    player?.avatarDataUrl ||
    player?.avatarUrl ||
    player?.photoUrl ||
    player?.imageUrl ||
    null
  );
}

/* ================================
   Table COL-MAJOR (lignes = stats)
================================ */
type Col = {
  key: string;
  title: string;
  player?: PlayerLite;
  rank?: number;
  remaining?: number | null;
};
type RowDef = { label: string; get: (m: PlayerMetrics) => string | number };

type CellTone = "best" | "neutral";

function TableColMajor({
  columns,
  rowGroups,
  dataMap,
  tableStyle,
}: {
  columns: Col[];
  rowGroups: { rows: RowDef[] }[];
  dataMap: Record<string, PlayerMetrics>;
  tableStyle?: React.CSSProperties;
}) {
  const rows = rowGroups.flatMap((g) => g.rows);
  const isDuel = columns.length === 2;

  const rankForRow = (row: RowDef): Record<string, CellTone> => {
    const vals = columns
      .map((c) => ({ key: c.key, value: parseStatNumber(row.get(dataMap[c.key] || emptyMetrics({ id: c.key }))) }))
      .filter((x) => Number.isFinite(x.value));
    if (!vals.length) return {};
    const sorted = [...vals].sort((a, b) =>
      isLowBetterRow(row.label) ? a.value - b.value : b.value - a.value
    );
    const best = sorted[0]?.value;
    if (!Number.isFinite(best)) return {};

    // IMPORTANT VISUEL : on ne colore QUE le meilleur unique.
    // S'il y a égalité sur la meilleure valeur, on ne colore rien.
    const bestCount = vals.filter((x) => x.value === best).length;
    if (bestCount !== 1) return {};

    return Object.fromEntries(
      vals.map((x) => [x.key, x.value === best ? "best" : "neutral"])
    ) as Record<string, CellTone>;
  };

  if (isDuel) {
    const left = columns[0];
    const right = columns[1];
    const leftM = dataMap[left.key] || emptyMetrics({ id: left.key });
    const rightM = dataMap[right.key] || emptyMetrics({ id: right.key });

    return (
      <div className="x-table x-table-duel" style={{ ...tableWrapStyle(), overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr minmax(104px, .82fr) 1fr",
            alignItems: "stretch",
            background: "rgba(255,255,255,.035)",
            borderBottom: "1px solid rgba(255,255,255,.06)",
          }}
        >
          <div className="x-th" style={{ ...thStyle(false), textAlign: "left", position: "relative", top: "auto" }}>
            <PlayerColHeader col={left} align="left" />
          </div>
          <div className="x-th" style={{ ...thStyle(false), textAlign: "center", color: THEME_ACCENT, position: "relative", top: "auto" }}>
            Stat
          </div>
          <div className="x-th" style={{ ...thStyle(false), textAlign: "right", position: "relative", top: "auto" }}>
            <PlayerColHeader col={right} align="right" />
          </div>
        </div>

        {rows.map((r, ri) => {
          const tones = rankForRow(r);
          const leftBest = tones[left.key] === "best";
          const rightBest = tones[right.key] === "best";
          return (
            <DuelStatRow
              key={`duel-r-${ri}`}
              label={r.label}
              leftValue={r.get(leftM)}
              rightValue={r.get(rightM)}
              leftBest={leftBest}
              rightBest={rightBest}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="x-table" style={tableWrapStyle()}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th className="x-th" style={thStyle(true)}>Stat</th>
            {columns.map((c) => (
              <th key={c.key} className="x-th" style={thStyle(false)}>
                <PlayerColHeader col={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const tones = rankForRow(r);
            return (
              <tr key={`r-${ri}`}>
                <td className="x-td" style={tdStyle(true)}>{r.label}</td>
                {columns.map((c) => {
                  const m = dataMap[c.key] || emptyMetrics({ id: c.key });
                  return (
                    <td key={c.key} className="x-td" style={{ ...tdStyle(false), ...valueToneStyle(tones[c.key]) }}>
                      {r.get(m)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DuelStatRow({
  label,
  leftValue,
  rightValue,
  leftBest,
  rightBest,
}: {
  label: string;
  leftValue: string | number;
  rightValue: string | number;
  leftBest: boolean;
  rightBest: boolean;
}) {
  const accentStrong = "color-mix(in srgb, var(--dc-accent, #f6c256) 96%, transparent)";
  const accentSoft = "color-mix(in srgb, var(--dc-accent, #f6c256) 44%, transparent)";
  const whiteStrong = "rgba(255,255,255,.72)";
  const whiteSoft = "rgba(255,255,255,.18)";

  // Barres façon ATP/TennisTV : elles partent du libellé central en fondu
  // invisible, puis deviennent plus visibles vers l'extérieur.
  const leftLine = leftBest
    ? `linear-gradient(90deg, ${accentStrong} 0%, ${accentSoft} 46%, rgba(255,255,255,0) 100%)`
    : `linear-gradient(90deg, ${whiteStrong} 0%, ${whiteSoft} 46%, rgba(255,255,255,0) 100%)`;
  const rightLine = rightBest
    ? `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${accentSoft} 54%, ${accentStrong} 100%)`
    : `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${whiteSoft} 54%, ${whiteStrong} 100%)`;

  const valueBase: React.CSSProperties = {
    position: "relative",
    padding: `${D.padCellV}px ${D.padCellH}px 7px`,
    color: "#e8e8ec",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    borderTop: "1px solid rgba(255,255,255,.05)",
    fontSize: D.fsBody,
    fontWeight: 760,
    lineHeight: 1.15,
    minWidth: 0,
  };

  const lineBase: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 2,
    height: 2,
    borderRadius: 999,
    opacity: .95,
    pointerEvents: "none",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr minmax(104px, .82fr) 1fr",
        alignItems: "stretch",
      }}
    >
      <div style={{ ...valueBase, textAlign: "left", ...valueToneStyle(leftBest ? "best" : "neutral") }}>
        {leftValue}
        <span
          aria-hidden="true"
          style={{
            ...lineBase,
            background: leftLine,
            boxShadow: leftBest ? "0 0 9px color-mix(in srgb, var(--dc-accent, #f6c256) 48%, transparent)" : "none",
          }}
        />
      </div>
      <div
        style={{
          ...valueBase,
          textAlign: "center",
          color: "rgba(255,255,255,.90)",
          fontSize: D.fsBody,
          fontWeight: 800,
          textTransform: "none",
          letterSpacing: .1,
        }}
      >
        {label}
      </div>
      <div style={{ ...valueBase, textAlign: "right", ...valueToneStyle(rightBest ? "best" : "neutral") }}>
        {rightValue}
        <span
          aria-hidden="true"
          style={{
            ...lineBase,
            background: rightLine,
            boxShadow: rightBest ? "0 0 9px color-mix(in srgb, var(--dc-accent, #f6c256) 48%, transparent)" : "none",
          }}
        />
      </div>
    </div>
  );
}

function tableWrapStyle(): React.CSSProperties {
  return {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: D.radius,
    background: "linear-gradient(90deg, rgba(255,255,255,.025), rgba(255,255,255,.01))",
  };
}

function PlayerColHeader({ col, align = "center" }: { col: Col; align?: "left" | "center" | "right" }) {
  const player = col.player || { id: col.key, name: col.title };
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        justifyContent: "center",
        gap: 3,
        minWidth: 42,
      }}
      title={col.title}
    >
      <div style={{ position: "relative", display: "inline-flex" }}>
        <AvatarBubble player={player} crowned={col.rank === 1} size={30} />
        {col.rank ? <RankBadge rank={col.rank} /> : null}
      </div>
      {col.remaining != null ? (
        <span
          style={{
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 1000,
            color: col.rank === 1 ? THEME_ACCENT : "rgba(255,255,255,.70)",
            textShadow: col.rank === 1 ? "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 28%, transparent)" : "none",
          }}
        >
          {f0(col.remaining)}
        </span>
      ) : null}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className="x-rank-badge"
      style={{
        position: "absolute",
        top: -7,
        right: -7,
        width: 16,
        height: 16,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        fontSize: 9,
        fontWeight: 1000,
        color: rank === 1 ? "#15110a" : "#101116",
        background: rank === 1 ? THEME_ACCENT : "rgba(255,255,255,.82)",
        border: "1px solid rgba(0,0,0,.38)",
        boxShadow: rank === 1 ? "0 0 12px color-mix(in srgb, var(--dc-accent, #f6c256) 34%, transparent)" : "0 2px 8px rgba(0,0,0,.35)",
      }}
    >
      {rank}
    </span>
  );
}

function parseStatNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/%/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "")
    .trim();
  if (!cleaned) return Number.NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isLowBetterRow(label: string): boolean {
  const l = String(label || "").toLowerCase();
  return (
    l.includes("score restant") ||
    l === "darts" ||
    l.includes("darts→") ||
    l.includes("bust") ||
    l.includes("miss")
  );
}

function valueToneStyle(tone?: CellTone): React.CSSProperties {
  if (tone === "best") {
    return {
      color: THEME_ACCENT,
      fontWeight: 1000,
      textShadow: "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 34%, transparent)",
    };
  }
  return { fontWeight: 760 };
}

function thStyle(isRowHeader: boolean): React.CSSProperties {
  return {
    textAlign: isRowHeader ? "left" : "right",
    padding: `${D.padCellV}px ${D.padCellH}px`,
    color: THEME_ACCENT,
    fontWeight: 800,
    background: "rgba(255,255,255,.04)",
    position: "sticky",
    top: 0,
    whiteSpace: "nowrap",
  };
}
function tdStyle(isRowHeader: boolean): React.CSSProperties {
  return {
    textAlign: isRowHeader ? "left" : "right",
    padding: `${D.padCellV}px ${D.padCellH}px`,
    color: "#e8e8ec",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    borderTop: "1px solid rgba(255,255,255,.05)",
  };
}

/* ================================
   Radar hits type "cible X01"
   - 20 numéros, ordre officiel
   - score(num) = 1×Singles + 2×Doubles + 3×Triples
   - Bulls / Miss sortent dans BullMissBars (bloc séparé)
================================ */
function HitsRadar({ m }: { m: PlayerMetrics }) {
  const BY = (m.byNumber || {}) as ByNumber | any;

  const numbers = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
    3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  const values: number[] = [];

  for (const nu of numbers) {
    const key = String(nu);
    const row =
      (BY[key] as any) ||
      (BY[`n${key}`] as any) ||
      (BY[`s${key}`] as any) ||
      {};

    // Singles = tous les simples pour ce numéro
    const singles = n(
      row.singles ??
        row.single ??
        row.s ??
        row.inner ??
        row.outer,
      0
    );
    // Doubles / triples
    const doubles = n(
      row.doubles ??
        row.double ??
        row.d ??
        row.hitsD ??
        row.D,
      0
    );
    const triples = n(
      row.triples ??
        row.triple ??
        row.t ??
        row.hitsT ??
        row.T,
      0
    );

    const score =
      Math.max(0, singles) +
      2 * Math.max(0, doubles) +
      3 * Math.max(0, triples);

    values.push(score);
  }

  const maxVal = Math.max(1, ...values);

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const R = 115;
  const step = (Math.PI * 2) / numbers.length;

  const toXY = (value: number, idx: number) => {
    const ratio = maxVal > 0 ? value / maxVal : 0;
    const r = R * ratio;
    const theta = -Math.PI / 2 + idx * step; // 20 en haut
    return {
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    };
  };

  const polyPoints = values
    .map((val, i) => {
      const { x, y } = toXY(val, i);
      return `${x},${y}`;
    })
    .concat(
      values.length
        ? (() => {
            const { x, y } = toXY(values[0], 0);
            return `${x},${y}`;
          })()
        : []
    )
    .join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg
        width="100%"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: 380 }}
      >
        {/* Fond */}
        <defs>
          <radialGradient id="x01end-radar-bg2" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#26262b" />
            <stop offset="100%" stopColor="#151519" />
          </radialGradient>
        </defs>
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill="url(#x01end-radar-bg2)"
          rx={18}
        />

        {/* Cercles guides */}
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R * t}
            fill="none"
            stroke="rgba(255,255,255,.06)"
            strokeWidth={1}
          />
        ))}

        {/* Axes + labels numéros */}
        {numbers.map((nu, i) => {
          const end = toXY(maxVal, i);
          const labelR = R + 16;
          const theta = -Math.PI / 2 + i * step;
          const lx = cx + labelR * Math.cos(theta);
          const ly = cy + labelR * Math.sin(theta);

          return (
            <g key={nu}>
              <line
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,.10)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                fontSize={11}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#e8e8ec"
                style={{ fontWeight: 800 }}
              >
                {nu}
              </text>
            </g>
          );
        })}

        {/* Polygone pondéré */}
        {values.length > 0 && (
          <>
            <polyline
              points={polyPoints}
              fill="color-mix(in srgb, var(--dc-accent, #f6c256) 18%, transparent)"
              stroke="#ffcf57"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {values.map((val, i) => {
              const { x, y } = toXY(val, i);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="#ffcf57"
                />
              );
            })}
          </>
        )}

        {/* Nom joueur au centre */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={13}
          fill="#ffcf57"
          style={{ fontWeight: 900 }}
        >
          {m.name}
        </text>
      </svg>
    </div>
  );
}

/* ================================
   Hits par segments (2 lignes, centré)
   - Colonnes : MISS, 1..20, BULL
   - 11 colonnes par ligne
================================ */
function HitsBySegmentBlock({ m }: { m: PlayerMetrics }) {
  const BY = (m.byNumber || {}) as ByNumber | any;

  const nums = Array.from({ length: 20 }, (_, i) => i + 1);

  type SegHit = { num: number; s: number; d: number; t: number; total: number };

  // -------- 1) hits par numéro 1..20 --------
  let segments: SegHit[] = nums.map((nu) => {
    const key = String(nu);
    const row =
      (BY[key] as any) ||
      (BY[`n${key}`] as any) ||
      (BY[`s${key}`] as any) ||
      {};

    const s = Math.max(
      0,
      n(
        row.singles ??
          row.single ??
          row.s ??
          row.inner ??
          row.outer,
        0
      )
    );
    const d = Math.max(
      0,
      n(
        row.doubles ??
          row.double ??
          row.d ??
          row.hitsD ??
          row.D,
        0
      )
    );
    const t = Math.max(
      0,
      n(
        row.triples ??
          row.triple ??
          row.t ??
          row.hitsT ??
          row.T,
        0
      )
    );

    return { num: nu, s, d, t, total: s + d + t };
  });

  // -------- 2) fallback si aucun D/T : on répartit les D/T globaux --------
  const sumSingles = segments.reduce((acc, s) => acc + s.s, 0);
  const totalDoubles = Math.max(0, n(m.doubles, 0));
  const totalTriples = Math.max(0, n(m.triples, 0));

  const hasAnyD = segments.some((s) => s.d > 0);
  const hasAnyT = segments.some((s) => s.t > 0);

  const spread = (kind: "d" | "t", total: number) => {
    if (total <= 0 || sumSingles <= 0) return;
    let remaining = total;
    segments = segments.map((seg, idx) => {
      if (seg.s <= 0) return seg;
      const raw = (seg.s / sumSingles) * total;
      const val =
        idx === segments.length - 1 ? remaining : Math.round(raw);
      remaining -= val;
      const next = { ...seg };
      if (kind === "d") next.d += val;
      if (kind === "t") next.t += val;
      next.total = next.s + next.d + next.t;
      return next;
    });
  };

  if (!hasAnyD && totalDoubles > 0) spread("d", totalDoubles);
  if (!hasAnyT && totalTriples > 0) spread("t", totalTriples);

  // -------- 3) BULL / DBULL / MISS intégrés comme colonnes --------
  const bullHits = Math.max(0, n((BY as any).bull, 0) + n(m.bulls, 0));
  const dbullHits = Math.max(0, n((BY as any).dbull, 0) + n(m.dbulls, 0));
  const missHits = Math.max(0, n((BY as any).miss, 0) + n(m.misses, 0));

  type Col = { label: string; s: number; d: number; t: number };

  const cols: Col[] = [];

  // MISS (ex-0)
  cols.push({
    label: "MISS",
    s: missHits,
    d: 0,
    t: 0,
  });

  // 1..20
  for (const seg of segments) {
    cols.push({
      label: String(seg.num),
      s: seg.s,
      d: seg.d,
      t: seg.t,
    });
  }

  // BULL = single 25 / double 25 empilé
  cols.push({
    label: "BULL",
    s: bullHits,
    d: dbullHits,
    t: 0,
  });

  const totals = cols.map((c) => c.s + c.d + c.t);
  const maxTotal = Math.max(1, ...totals);

  const barHeight = 52;
  const firstRow = cols.slice(0, 11); // MISS + 1..10
  const secondRow = cols.slice(11);   // 11..20 + BULL

  const renderRow = (rowCols: Col[]) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 10,
        width: "100%",
      }}
    >
      {rowCols.map((c, idx) => {
        const total = c.s + c.d + c.t;
        const ratio = total > 0 ? total / maxTotal : 0;
        const hTotal = barHeight * ratio || 0;

        const hS = total > 0 ? (c.s / total) * hTotal : 0;
        const hD = total > 0 ? (c.d / total) * hTotal : 0;
        const hT = total > 0 ? (c.t / total) * hTotal : 0;

        const isMiss = c.label === "MISS";
        const isBull = c.label === "BULL";

        return (
          <div
            key={`${c.label}-${idx}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 10,
              color: "#ddd",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 14,
                height: barHeight,
                borderRadius: 999,
                background: "rgba(255,255,255,.03)",
                overflow: "hidden",
                boxShadow:
                  total > 0 ? "0 0 6px rgba(0,0,0,.6)" : "none",
              }}
            >
              {/* Singles (ou MISS si label MISS) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: hS,
                  background: isMiss
                    ? "linear-gradient(180deg,#fecaca,#f97373)"
                    : "linear-gradient(180deg,#8bc5ff,#3ba9ff)",
                }}
              />
              {/* Doubles (inclut DBULL pour la colonne BULL) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: hS,
                  height: hD,
                  background: isBull
                    ? "linear-gradient(180deg,#bbf7d0,#4ade80)"
                    : "linear-gradient(180deg,#7fe2a9,#3dd68c)",
                }}
              />
              {/* Triples */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: hS + hD,
                  height: hT,
                  background:
                    "linear-gradient(180deg,#fca5ff,#f973cf)",
                }}
              />
            </div>
            <div style={{ marginTop: 2 }}>{c.label}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: 4,
      }}
    >
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Ligne 1 : MISS,1..10 */}
          {renderRow(firstRow)}
          {/* Ligne 2 : 11..20,BULL */}
          {renderRow(secondRow)}
        </div>
      </div>

      {/* Légende S / D / T (sans MISS) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          fontSize: 10,
          color: "#ccc",
          marginTop: 2,
        }}
      >
        <LegendDot
          label="Singles"
          gradient="linear-gradient(180deg,#8bc5ff,#3ba9ff)"
        />
        <LegendDot
          label="Doubles"
          gradient="linear-gradient(180deg,#7fe2a9,#3dd68c)"
        />
        <LegendDot
          label="Triples"
          gradient="linear-gradient(180deg,#fca5ff,#f973cf)"
        />
      </div>
    </div>
  );
}

/* Petit composant pour la légende S / D / T */
function LegendDot({
  label,
  gradient,
}: {
  label: string;
  gradient: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: gradient,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

/* ================================
   Historique des volées
================================ */
function dartToString(v: number, mult: 1 | 2 | 3) {
  if (!v) return "MISS";
  if (v === 25) return mult === 2 ? "DBULL" : "BULL";
  const prefix = mult === 3 ? "T" : mult === 2 ? "D" : "S";
  return `${prefix}${v}`;
}


function parseHistoryDart(r: any): { v: number; mult: 0 | 1 | 2 | 3 } {
  const rawLabel = String(r?.label ?? r?.segmentLabel ?? r?.dart ?? r?.hit ?? r?.code ?? r?.text ?? r?.name ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  let seg = Number.NaN;
  let mult = Number(r?.multiplier ?? r?.mult ?? r?.m ?? r?.multi ?? r?.coef ?? r?.factor);

  if (rawLabel) {
    if (rawLabel === "MISS" || rawLabel === "M" || rawLabel === "0") { seg = 0; mult = 0; }
    else if (rawLabel === "BULL" || rawLabel === "SBULL" || rawLabel === "OB") { seg = 25; mult = 1; }
    else if (rawLabel === "DBULL" || rawLabel === "D-BULL" || rawLabel === "DOUBLEBULL" || rawLabel === "IB") { seg = 25; mult = 2; }
    else {
      const m = rawLabel.match(/^([SDT])?(\d{1,2})$/);
      if (m) { seg = Number(m[2]) || 0; mult = m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1; }
    }
  }

  if (!Number.isFinite(seg)) seg = Number(r?.segment ?? r?.v ?? r?.num ?? r?.number ?? r?.target ?? 0);
  if (!Number.isFinite(seg) || seg < 0 || seg > 25) {
    const rawScore = Number(r?.score ?? r?.points ?? r?.total ?? r?.value);
    if (rawScore === 50) { seg = 25; mult = 2; }
    else if (rawScore === 25) { seg = 25; mult = 1; }
    else seg = 0;
  }
  if (!Number.isFinite(mult) || mult <= 0) {
    if (rawLabel.startsWith("T")) mult = 3;
    else if (rawLabel.startsWith("D") && rawLabel !== "DBULL") mult = 2;
    else mult = seg > 0 ? 1 : 0;
  }
  if (seg === 25 && mult > 2) mult = 2;
  if (![0, 1, 2, 3].includes(mult)) mult = seg > 0 ? 1 : 0;
  return { v: seg, mult: mult as 0 | 1 | 2 | 3 };
}

function buildVisitHistory(
  rec: any,
  players: PlayerLite[],
  legLike: any
): VisitRow[] {
  if (!players.length) return [];


  const buildSyntheticVisitsFromScorePerVisit = (): VisitRow[] => {
    const detailedSources = [
      rec?.summary?.detailedByPlayer,
      rec?.payload?.summary?.detailedByPlayer,
      rec?.resume?.summary?.detailedByPlayer,
      rec?.compact?.d?.summary?.detailedbyplayer,
    ].filter((x) => x && typeof x === "object");

    const detailed: Record<string, any> = {};
    for (const source of detailedSources) {
      for (const p of players) {
        const shortId = String(p.id || "").slice(0, 20);
        const row = source?.[p.id] || source?.[shortId];
        if (row && !detailed[p.id]) detailed[p.id] = row;
      }
    }

    const scoreLists: Record<string, number[]> = {};
    for (const p of players) {
      const row = detailed[p.id] || {};
      const list = row.scorePerVisit || row.scorepervisit || row.visitsScores || row.visitScores;
      if (Array.isArray(list) && list.length) {
        scoreLists[p.id] = list.map((x: any) => Math.max(0, Number(x) || 0));
      }
    }
    if (!Object.keys(scoreLists).length) return [];

    const order: string[] = (
      Array.isArray(rec?.payload?.state?.throwOrder) && rec.payload.state.throwOrder.length
        ? rec.payload.state.throwOrder
        : Array.isArray(rec?.resume?.state?.throwOrder) && rec.resume.state.throwOrder.length
        ? rec.resume.state.throwOrder
        : Array.isArray(rec?.summary?.throwOrder) && rec.summary.throwOrder.length
        ? rec.summary.throwOrder
        : players.map((p) => p.id)
    ).map((x: any) => String(x));
    const finalOrder = order.filter((id) => players.some((p) => p.id === id));
    if (!finalOrder.length) finalOrder.push(...players.map((p) => p.id));

    const startScore = Number(getX01StartScore(rec) || 501) || 501;
    const legsPerSet = getLegsPerSetFromRecord(rec);
    const scores: Record<string, number> = {};
    const indexes: Record<string, number> = {};
    finalOrder.forEach((pid) => { scores[pid] = startScore; indexes[pid] = 0; });

    const resetScores = () => finalOrder.forEach((pid) => { scores[pid] = startScore; });
    const visitsOut: VisitRow[] = [];
    let legNo = 1;
    let done = false;

    while (!done) {
      let consumedInRound = false;
      for (const pid of finalOrder) {
        const arr = scoreLists[pid] || [];
        const idx = indexes[pid] || 0;
        if (idx >= arr.length) continue;
        consumedInRound = true;
        indexes[pid] = idx + 1;

        const before = scores[pid] ?? startScore;
        const points = Math.max(0, Number(arr[idx]) || 0);
        const afterCandidate = before - points;
        const finish = points > 0 && afterCandidate === 0;
        const bust = points === 0 && before > 0;
        const after = finish ? 0 : points > 0 && afterCandidate > 1 ? afterCandidate : before;
        const setNo = Math.floor((legNo - 1) / legsPerSet) + 1;
        const legInSet = ((legNo - 1) % legsPerSet) + 1;

        visitsOut.push({
          idx: visitsOut.length + 1,
          legNo,
          setNo,
          legInSet,
          playerId: pid,
          darts: [],
          dartsCount: finish ? 1 : 3,
          scoreBefore: before,
          scoreAfter: after,
          bust,
          finish,
          score: finish || !bust ? points : 0,
          scoreInputMode: isVisitScoreInputRecord(rec) ? "visit_score" : undefined,
          visitScoreInput: points,
        } as any);

        scores[pid] = after;
        if (finish) {
          legNo += 1;
          resetScores();
          break;
        }
      }
      done = !consumedInRound || Object.entries(scoreLists).every(([pid, arr]) => (indexes[pid] || 0) >= arr.length);
    }

    return visitsOut;
  };

  // 1) Si legStats / __legStats possède déjà les visits : on les utilise.
  // IMPORTANT : ne jamais s'arrêter sur un tableau vide. C'était la cause du bug
  // Historique : legStats reconstruit depuis un summary léger fournissait visits=[],
  // ce qui empêchait de retomber sur rec.visitHistory / payload.visitHistory.
  const firstNonEmptyArray = (...candidates: any[]): any[] => {
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) return c;
    }
    return [];
  };

  let rawVisits: any[] = firstNonEmptyArray(
    legLike?.visits,
    rec?.visitHistory,
    rec?.visitsHistory,
    rec?.__legStats?.visits,
    rec?.summary?.visitHistory,
    rec?.summary?.visitsHistory,
    rec?.summary?.__legStats?.visits,
    rec?.summary?.legacy?.visitHistory,
    rec?.summary?.legacy?.visitsHistory,
    rec?.payload?.visitHistory,
    rec?.payload?.visitsHistory,
    rec?.payload?.__legStats?.visits,
    rec?.payload?.legacy?.visitHistory,
    rec?.payload?.legacy?.visitsHistory,
    rec?.payload?.summary?.visitHistory,
    rec?.payload?.summary?.visitsHistory,
    rec?.payload?.summary?.__legStats?.visits,
    rec?.payload?.summary?.legacy?.visitHistory,
    rec?.payload?.summary?.legacy?.visitsHistory,
    rec?.payload?.payload?.visitHistory,
    rec?.payload?.payload?.visitsHistory,
    rec?.payload?.payload?.summary?.visitHistory,
    rec?.payload?.payload?.summary?.visitsHistory,
    rec?.resume?.visitHistory,
    rec?.resume?.visitsHistory,
    rec?.resume?.__legStats?.visits
  );

  if (!rawVisits.length) {
    const dp = rec?.summary?.detailedByPlayer || rec?.payload?.summary?.detailedByPlayer || rec?.summary?.players || rec?.payload?.summary?.players || {};
    const rebuilt: any[] = [];
    for (const p of players) {
      const row = dp?.[p.id] || {};
      const pv = Array.isArray(row.visitHistory) ? row.visitHistory : Array.isArray(row.visitsHistory) ? row.visitsHistory : Array.isArray(row.visitsList) ? row.visitsList : [];
      pv.forEach((v: any) => rebuilt.push({ ...v, playerId: v?.playerId ?? v?.pid ?? p.id }));
    }
    rawVisits = rebuilt;
  }

  if (!rawVisits.length) {
    rawVisits = buildSyntheticVisitsFromScorePerVisit();
  }

  if (rawVisits.length) {
    const legsPerSet = getLegsPerSetFromRecord(rec);
    let inferredLegNo = 1;
    let previousWasFinish = false;

    return rawVisits.map((v, idx) => {
      const dartsSrc: any[] =
        Array.isArray(v.darts)
          ? v.darts
          : Array.isArray(v.segments)
          ? v.segments
          : Array.isArray(v.hits)
          ? v.hits
          : Array.isArray(v.throw)
          ? v.throw
          : Array.isArray(v.throws)
          ? v.throws
          : [];
      const darts = dartsSrc.map((d) => ({
        ...parseHistoryDart(d),
        source: d?.source,
        scoreInputMode: d?.scoreInputMode,
        visitScoreInput: d?.visitScoreInput,
        visitScoreSource: d?.visitScoreSource,
      }));
      const visitScoreMode =
        v?.scoreInputMode === "visit_score" ||
        v?.source === "visit_score" ||
        dartsSrc.some((d: any) => d?.source === "visit_score" || d?.scoreInputMode === "visit_score") ||
        isVisitScoreInputRecord(rec);
      const before = n(
        v.scoreBefore ?? v.before ?? v.startScore ?? v.scoreStart ?? v.remainingBefore,
        0
      );
      const after = n(
        v.scoreAfter ?? v.after ?? v.endScore ?? v.scoreEnd ?? v.remainingAfter,
        0
      );
      const bust = !!(v.bust ?? v.isBust);

      const strongLeg = Number(v.matchLegNo ?? v.legIndex ?? (Number(v.legNo) > 1 ? v.legNo : undefined));
      if (Number.isFinite(strongLeg) && strongLeg > 0) {
        inferredLegNo = strongLeg;
      } else if (idx > 0 && previousWasFinish) {
        inferredLegNo += 1;
      }

      const setNoRaw = Number(v.setNo ?? v.setIndex ?? v.currentSet);
      const legInSetRaw = Number(v.legInSet ?? v.currentLeg);
      const setNo = Number.isFinite(setNoRaw) && setNoRaw > 0
        ? setNoRaw
        : Math.floor((inferredLegNo - 1) / legsPerSet) + 1;
      const legInSet = Number.isFinite(legInSetRaw) && legInSetRaw > 0
        ? legInSetRaw
        : ((inferredLegNo - 1) % legsPerSet) + 1;

      const finish =
        !!(v.finish ?? v.isFinish ?? v.isCheckout) || (!bust && after === 0 && before > 0);
      const compactScore = n(
        v.score ?? v.points ?? v.visitScore ?? v.visitPoints ?? v.total ?? v.value,
        darts.reduce((sum: number, d: any) => sum + (d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult), 0)
      );
      previousWasFinish = finish && !bust;

      return {
        idx: idx + 1,
        legNo: inferredLegNo,
        setNo,
        legInSet,
        playerId: String(v.playerId ?? v.pid ?? v.p ?? v.profileId ?? players[idx % players.length]?.id ?? ""),
        darts,
        scoreBefore: before,
        scoreAfter: after,
        bust,
        finish,
        score: compactScore,
        scoreInputMode: visitScoreMode ? "visit_score" : v?.scoreInputMode,
        visitScoreInput: v?.visitScoreInput ?? (visitScoreMode ? compactScore : undefined),
      };
    });
  }

  // 2) Fallback : on reconstruit depuis une liste linéaire de darts.
  // IMPORTANT : les replayDarts X01V3 récents portent playerId/pid/profileId.
  // L'ancienne reconstruction par ordre de jeu uniquement cassait les stats détaillées
  // depuis l'historique si une volée ne faisait pas exactement 3 darts ou si un checkout
  // terminait avant la 3e fléchette.
  const rawDarts: any[] =
    rec?.resume?.darts ||
    rec?.resume?.throws ||
    rec?.payload?.darts ||
    rec?.payload?.allDarts ||
    rec?.payload?.replayDarts ||
    rec?.summary?.dartsReplay ||
    rec?.darts ||
    [];

  if (!Array.isArray(rawDarts) || !rawDarts.length) return [];

  const order: string[] =
    (Array.isArray(rec?.summary?.throwOrder) && rec.summary.throwOrder.length
      ? rec.summary.throwOrder
      : Array.isArray(rec?.payload?.summary?.throwOrder) && rec.payload.summary.throwOrder.length
      ? rec.payload.summary.throwOrder
      : Array.isArray(rec?.payload?.config?.players) && rec.payload.config.players.length
      ? rec.payload.config.players.map((p: any) => String(p?.id || "")).filter(Boolean)
      : players.map((p) => p.id)) || [];

  if (!order.length) return [];

  const startScore =
    rec?.resume?.config?.startScore ??
    rec?.resume?.startScore ??
    rec?.summary?.game?.startScore ??
    rec?.summary?.startScore ??
    rec?.payload?.startScore ??
    rec?.payload?.config?.startScore ??
    rec?.payload?.game?.startScore ??
    501;

  const parseDart = (r: any) => parseHistoryDart(r);

  const dartPid = (r: any): string => String(r?.playerId ?? r?.pid ?? r?.p ?? r?.profileId ?? "").trim();
  const hasTaggedPlayers = rawDarts.some((d) => dartPid(d));

  const scores: Record<string, number> = {};
  order.forEach((pid) => { scores[pid] = Number(startScore) || 501; });

  const visits: VisitRow[] = [];

  // 2a) Replay tagué : groupe par joueur + maximum 3 darts par volée.
  if (hasTaggedPlayers) {
    const legsPerSet = getLegsPerSetFromRecord(rec);
    const resetScores = () => order.forEach((pid) => { scores[pid] = Number(startScore) || 501; });
    const rawLegNo = (raw: any): number | null => {
      const val = Number(raw?.matchLegNo ?? raw?.legNo ?? raw?.legIndex);
      return Number.isFinite(val) && val > 0 ? val : null;
    };
    const rawSetNo = (raw: any): number | null => {
      const val = Number(raw?.setNo ?? raw?.setIndex ?? raw?.currentSet);
      return Number.isFinite(val) && val > 0 ? val : null;
    };
    const rawLegInSet = (raw: any): number | null => {
      const val = Number(raw?.legInSet ?? raw?.currentLeg);
      return Number.isFinite(val) && val > 0 ? val : null;
    };

    let current: any = null;
    let currentLegNo = rawLegNo(rawDarts[0]) || 1;
    let currentSetNo = rawSetNo(rawDarts[0]) || 1;
    let currentLegInSet = rawLegInSet(rawDarts[0]) || currentLegNo;
    let pendingNewLeg = false;

    const openNextLegIfNeeded = (raw?: any) => {
      const explicit = raw ? rawLegNo(raw) : null;
      const setExplicit = raw ? rawSetNo(raw) : null;
      const legInSetExplicit = raw ? rawLegInSet(raw) : null;

      if (explicit && explicit !== currentLegNo) {
        currentLegNo = explicit;
        currentSetNo = setExplicit || currentSetNo;
        currentLegInSet = legInSetExplicit || ((currentLegNo - 1) % legsPerSet) + 1;
        resetScores();
        pendingNewLeg = false;
        return;
      }

      if (pendingNewLeg) {
        currentLegNo += 1;
        currentSetNo = setExplicit || Math.floor((currentLegNo - 1) / legsPerSet) + 1;
        currentLegInSet = legInSetExplicit || ((currentLegNo - 1) % legsPerSet) + 1;
        resetScores();
        pendingNewLeg = false;
      }
    };

    const flush = () => {
      if (!current || !current.darts?.length) return;
      const before = n(current.scoreBefore, scores[current.playerId] ?? startScore);
      let after = before;
      let bust = false;
      let finish = false;
      for (const d of current.darts) {
        const value = d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult;
        const tentative = after - value;
        if (tentative < 0 || tentative === 1) {
          bust = true;
          after = before;
          break;
        }
        after = tentative;
        if (after === 0) { finish = true; break; }
      }
      const explicitAfter = current.scoreAfter;
      if (explicitAfter != null && Number.isFinite(Number(explicitAfter))) after = Number(explicitAfter);
      if (after === 0) finish = true;
      visits.push({
        idx: visits.length + 1,
        legNo: Number(current.legNo ?? currentLegNo) || 1,
        setNo: Number(current.setNo ?? currentSetNo) || 1,
        legInSet: Number(current.legInSet ?? currentLegInSet) || Number(current.legNo ?? currentLegNo) || 1,
        playerId: current.playerId,
        darts: current.darts,
        scoreBefore: before,
        scoreAfter: after,
        bust: !!(current.bust || bust),
        finish: !!(current.finish || finish),
        score: !!(current.bust || bust) ? 0 : Math.max(0, before - after),
        scoreInputMode: current.scoreInputMode,
        visitScoreInput: current.visitScoreInput,
      });
      scores[current.playerId] = after;
      if (finish && !(current.bust || bust)) pendingNewLeg = true;
      current = null;
    };

    for (const raw of rawDarts) {
      const pid = dartPid(raw) || order[0];
      const d = parseDart(raw);
      const explicitLeg = rawLegNo(raw);
      if (explicitLeg && explicitLeg !== currentLegNo) {
        flush();
        openNextLegIfNeeded(raw);
      } else if (pendingNewLeg) {
        flush();
        openNextLegIfNeeded(raw);
      }
      if (!current || current.playerId !== pid || current.darts.length >= 3) {
        flush();
        if (pendingNewLeg) openNextLegIfNeeded(raw);
        current = {
          playerId: pid,
          darts: [],
          scoreBefore: raw?.scoreBefore ?? raw?.before ?? raw?.startScore ?? scores[pid] ?? startScore,
          scoreAfter: raw?.scoreAfter ?? raw?.after ?? raw?.endScore,
          bust: raw?.bust ?? raw?.isBust,
          finish: raw?.finish ?? raw?.isFinish,
          scoreInputMode: raw?.source === "visit_score" || raw?.scoreInputMode === "visit_score" ? "visit_score" : raw?.scoreInputMode,
          visitScoreInput: raw?.visitScoreInput,
          legNo: rawLegNo(raw) || currentLegNo,
          setNo: rawSetNo(raw) || currentSetNo,
          legInSet: rawLegInSet(raw) || currentLegInSet,
        };
      }
      current.darts.push({
        ...d,
        source: raw?.source,
        scoreInputMode: raw?.scoreInputMode,
        visitScoreInput: raw?.visitScoreInput,
        visitScoreSource: raw?.visitScoreSource,
      });
      if (raw?.source === "visit_score" || raw?.scoreInputMode === "visit_score") {
        current.scoreInputMode = "visit_score";
        current.visitScoreInput = raw?.visitScoreInput ?? current.visitScoreInput;
      }
      if (raw?.scoreAfter != null || raw?.after != null || raw?.endScore != null) {
        current.scoreAfter = raw?.scoreAfter ?? raw?.after ?? raw?.endScore;
      }
      if (raw?.bust || raw?.isBust) current.bust = true;
      if (raw?.finish || raw?.isFinish) current.finish = true;
    }
    flush();
    return visits;
  }

  // 2b) Ancien replay non tagué : fallback par ordre de jeu.
  let legNo = 1;
  let throwerIndex = 0;
  let i = 0;

  while (i < rawDarts.length) {
    const pid = order[throwerIndex % order.length];
    const scoreBefore = scores[pid] ?? startScore;

    const darts: { v: number; mult: 1 | 2 | 3 }[] = [];
    let scoreAfter = scoreBefore;
    let bust = false;
    let finish = false;

    for (let consumed = 0; consumed < 3 && i < rawDarts.length; consumed += 1, i += 1) {
      const d = parseDart(rawDarts[i] || {});
      darts.push(d);

      const value = d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult;
      const tentative = scoreAfter - value;

      if (tentative < 0 || tentative === 1) {
        bust = true;
        scoreAfter = scoreBefore;
        break;
      }

      scoreAfter = tentative;

      if (scoreAfter === 0) {
        finish = true;
        break;
      }
    }

    visits.push({
      idx: visits.length + 1,
      legNo,
      playerId: pid,
      darts,
      scoreBefore,
      scoreAfter,
      bust,
      finish,
    });

    scores[pid] = scoreAfter;
    if (finish) break;
    throwerIndex += 1;
  }

  return visits;
}

function VisitsList({
  visits,
  playersById,
  hideDartDetails = false,
}: {
  visits: VisitRow[];
  playersById: Record<string, PlayerLite>;
  hideDartDetails?: boolean;
}) {
  if (!visits.length) return null;

  return (
    <div style={{ maxHeight: 320, overflowY: "auto", marginTop: 4 }}>
      {visits.map((v) => {
        const p = playersById[v.playerId];
        const name = p?.name || "—";
        const visitTotal = v.bust ? 0 : Math.max(0, v.scoreBefore - v.scoreAfter);
        const visitScoreMode = hideDartDetails || v.scoreInputMode === "visit_score" || (v.darts || []).some((d: any) => d?.source === "visit_score" || d?.scoreInputMode === "visit_score");

        return (
          <div
            key={v.idx}
            style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr auto",
              gap: 8,
              alignItems: "center",
              padding: "8px 8px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
              boxShadow: "0 10px 24px rgba(0,0,0,.22)",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: THEME_ACCENT,
                  letterSpacing: 0.2,
                }}
              >
                #{v.idx}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#a9a9b2",
                  fontWeight: 700,
                }}
              >
                Leg {v.legNo}
              </div>
            </div>

            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#f3f3f7",
                  }}
                >
                  {name}
                </div>

                {v.finish && !v.bust ? (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 900,
                      color: "#0f1411",
                      background:
                        "linear-gradient(180deg,#86efac,#22c55e)",
                      boxShadow: "0 0 12px rgba(34,197,94,.35)",
                    }}
                  >
                    FINISH
                  </span>
                ) : null}

                {v.bust ? (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 900,
                      color: "#190f10",
                      background:
                        "linear-gradient(180deg,#fca5a5,#ef4444)",
                      boxShadow: "0 0 12px rgba(239,68,68,.35)",
                    }}
                  >
                    BUST
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {visitScoreMode ? (
                  <div
                    style={{
                      padding: "7px 10px",
                      borderRadius: 12,
                      border: "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 22%, transparent)",
                      color: THEME_ACCENT,
                      fontSize: 11,
                      fontWeight: 900,
                      background: "linear-gradient(180deg, color-mix(in srgb, var(--dc-accent, #f6c256) 12%, transparent), rgba(255,255,255,.03))",
                    }}
                  >
                    SCORE SAISI
                  </div>
                ) : v.darts?.length ? (
                  v.darts.map((d, i) => (
                    <div
                      key={`${v.idx}-${i}`}
                      style={dartBadgeStyle(d.v, d.mult)}
                    >
                      {dartToString(d.v, d.mult)}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "7px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.10)",
                      color: "#9a9aa3",
                      fontSize: 11,
                    }}
                  >
                    —
                  </div>
                )}

                <div
                  style={{
                    marginLeft: 2,
                    padding: "7px 10px",
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 18%, transparent)",
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--dc-accent, #f6c256) 16%, transparent), color-mix(in srgb, var(--dc-accent, #f6c256) 6%, transparent))",
                    color: THEME_ACCENT,
                    fontSize: 11,
                    fontWeight: 900,
                    boxShadow: "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 14%, transparent)",
                  }}
                >
                  {v.bust ? "BUST" : `+${visitTotal}`}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "flex-end",
                minWidth: 112,
              }}
            >
              <div style={scoreBoxStyle(false)}>{v.scoreBefore}</div>
              <div
                style={{
                  color: "#8f8f99",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                →
              </div>
              <div style={scoreBoxStyle(true)}>{v.scoreAfter}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dartBadgeStyle(v: number, mult: 1 | 2 | 3): React.CSSProperties {
  const label = dartToString(v, mult);

  if (label === "MISS") {
    return {
      padding: "7px 10px",
      minWidth: 52,
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(248,113,113,.30)",
      background: "linear-gradient(180deg, rgba(248,113,113,.24), rgba(127,29,29,.18))",
      color: "#ffd4d4",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 0 12px rgba(248,113,113,.18)",
    };
  }

  if (label === "BULL") {
    return {
      padding: "7px 10px",
      minWidth: 52,
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(96,165,250,.34)",
      background: "linear-gradient(180deg, rgba(96,165,250,.24), rgba(29,78,216,.18))",
      color: "#d9ecff",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 0 12px rgba(96,165,250,.18)",
    };
  }

  if (label === "DBULL") {
    return {
      padding: "7px 10px",
      minWidth: 52,
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(74,222,128,.34)",
      background: "linear-gradient(180deg, rgba(74,222,128,.24), rgba(21,128,61,.18))",
      color: "#dcffe8",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 0 12px rgba(74,222,128,.18)",
    };
  }

  if (mult === 3) {
    return {
      padding: "7px 10px",
      minWidth: 52,
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(244,114,182,.34)",
      background: "linear-gradient(180deg, rgba(244,114,182,.22), rgba(157,23,77,.18))",
      color: "#ffd9ef",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 0 12px rgba(244,114,182,.18)",
    };
  }

  if (mult === 2) {
    return {
      padding: "7px 10px",
      minWidth: 52,
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(74,222,128,.34)",
      background: "linear-gradient(180deg, rgba(74,222,128,.22), rgba(21,128,61,.18))",
      color: "#dcffe8",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 0 12px rgba(74,222,128,.18)",
    };
  }

  return {
    padding: "7px 10px",
    minWidth: 52,
    textAlign: "center",
    borderRadius: 12,
    border: "1px solid rgba(96,165,250,.28)",
    background: "linear-gradient(180deg, rgba(96,165,250,.18), rgba(30,41,59,.22))",
    color: "#e4f1ff",
    fontSize: 11,
    fontWeight: 900,
    boxShadow: "0 0 12px rgba(96,165,250,.12)",
  };
}

function scoreBoxStyle(isAfter: boolean): React.CSSProperties {
  return {
    minWidth: 42,
    textAlign: "center",
    padding: "7px 8px",
    borderRadius: 12,
    border: isAfter
      ? "1px solid color-mix(in srgb, var(--dc-accent, #f6c256) 24%, transparent)"
      : "1px solid rgba(255,255,255,.10)",
    background: isAfter
      ? "linear-gradient(180deg, color-mix(in srgb, var(--dc-accent, #f6c256) 16%, transparent), color-mix(in srgb, var(--dc-accent, #f6c256) 6%, transparent))"
      : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
    color: isAfter ? "#ffcf57" : "#f3f3f7",
    fontWeight: 900,
    fontSize: 12,
    boxShadow: isAfter
      ? "0 0 10px color-mix(in srgb, var(--dc-accent, #f6c256) 12%, transparent)"
      : "none",
  };
}


/* ================================
   Utils
================================ */
function normalizeStatus(
  rec: any
): "finished" | "in_progress" {
  const raw = String(
    rec?.status ?? rec?.payload?.status ?? ""
  ).toLowerCase();
  if (raw === "finished") return "finished";
  if (raw === "inprogress" || raw === "in_progress")
    return "in_progress";
  const sum = rec?.summary ?? rec?.payload ?? {};
  if (sum?.finished === true || sum?.result?.finished === true)
    return "finished";
  return "in_progress";
}

function sanitizeCO(v: any): number {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  const r = Math.round(num);
  if (r === 50) return 50;
  if (r >= 2 && r <= 170) return r;
  return 0;
}

function btn(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,.12)",
    background: "transparent",
    color: "#e8e8ec",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  };
}

function btnGold(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "6px 10px",
    border: "1px solid rgba(255,180,0,.3)",
    background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
    color: "#141417",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(255,170,0,.28)",
    fontSize: 12,
  };
}

function n(x: any, d = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}
function v(x: any) {
  const vv = Number(x);
  return Number.isFinite(vv) && vv !== 0 ? vv : undefined;
}
function f2(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}
function f0(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? (v | 0) : 0;
}
function pct(x?: number) {
  const v = Number(x);
  return Number.isFinite(v)
    ? `${Math.round(Math.max(0, Math.min(100, v)))}%`
    : "0%";
}

function pick(obj: any, paths: string[], def?: any) {
  for (const p of paths) {
    try {
      const segs = p.split(".");
      let cur: any = obj;
      let ok = true;
      for (const s of segs) {
        if (cur == null) {
          ok = false;
          break;
        }
        if (s in cur) {
          cur = cur[s];
        } else {
          ok = false;
          break;
        }
      }
      if (ok) return cur;
    } catch {
      /* ignore */
    }
  }
  return def;
}
