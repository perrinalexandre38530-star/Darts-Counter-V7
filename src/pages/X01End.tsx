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
type PlayerLite = { id: string; name?: string; avatarDataUrl?: string | null };

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
  const summary = { ...decodedSummary, ...payloadSummary, ...ownSummary };

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

  return {
    ...input,
    payload: { ...payload, summary },
    summary,
    players,
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
const mobileDenseCss = `
@media (max-width: 420px){
  .x-end h2{ font-size:16px; }
  .x-card h3{ font-size:13px; }
  .x-table{ font-size:11px; }
  .x-th, .x-td{ padding:4px 6px; }
  .selector button{ font-size:11px; padding:4px 8px; }
}
`;

/* ================================
   Types pour historique des volées
================================ */
type VisitRow = {
  idx: number;
  legNo: number;
  playerId: string;
  darts: { v: number; mult: 1 | 2 | 3 }[];
  scoreBefore: number;
  scoreAfter: number;
  bust: boolean;
  finish: boolean;
};

/* ================================
   Composant principal
================================ */
export default function X01End({ go, params }: Props) {
  // --- Hooks toujours au même ordre ---
  const [rec, setRec] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // cible: ne pas dépendre de rec au moment de l'initialisation
  const [chartPid, setChartPid] = React.useState<string>("");

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
          if (mounted) setRec(hydrateX01HistoryRecord(params.rec));
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
    return arr.map((p: any) => ({
      id: p.id,
      name: p?.name || "—",
      avatarDataUrl: p?.avatarDataUrl ?? null,
    }));
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

      remaining[id] = 0; // match terminé
    }

    const order = [...ids].sort((a, b) => {
      const az = remaining[a] === 0,
        bz = remaining[b] === 0;
      if (az && !bz) return -1;
      if (!az && bz) return 1;
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

  const rankedPlayers = [...players].sort((a, b) => {
    if (winnerId && a.id === winnerId && b.id !== winnerId) return -1;
    if (winnerId && b.id === winnerId && a.id !== winnerId) return 1;
    return n(M[b.id]?.avg3, 0) - n(M[a.id]?.avg3, 0);
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
            border: "1px solid rgba(255,207,87,.28)",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,207,87,.22), rgba(255,207,87,.06) 45%, rgba(255,255,255,.02) 100%)",
            color: "#ffcf57",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 0 14px rgba(255,207,87,.18), inset 0 0 10px rgba(255,207,87,.06)",
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
              color: "#ffcf57",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              textShadow: "0 0 10px rgba(255,207,87,.30), 0 0 24px rgba(255,207,87,.18)",
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
                      boxShadow: "0 0 10px rgba(255,207,87,.32)",
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
  const cols = players.map((p) => ({ key: p.id, title: p.name || "—" }));

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
                  label: "Tons (Σ)",
                  get: (m) =>
                    f0(m.t180 + m.t140 + m.t100),
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
                { label: "CO hits", get: (m) => f0(m.coHits) },
                { label: "CO att.", get: (m) => f0(m.coAtt) },
                {
                  label: "CO %",
                  get: (m) => pct(m.coPct),
                },
                ...(has.avgCoDarts
                  ? [
                      {
                        label: "Avg darts@CO",
                        get: (m) =>
                          m.avgCoDarts != null
                            ? f2(m.avgCoDarts)
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

      {/* ===== 4) DARTS USAGE ===== */}
      <CardTable title="Darts usage">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                { label: "Darts", get: (m) => f0(m.darts) },
                {
                  label: "Singles",
                  get: (m) => {
                    const d = Math.max(0, m.darts || 0);
                    const singles = n(
                      m.singles,
                      Math.max(
                        0,
                        d -
                          (n(m.doubles) +
                            n(m.triples) +
                            n(m.bulls) +
                            n(m.dbulls) +
                            n(m.misses) +
                            n(m.busts))
                      )
                    );
                    return f0(singles);
                  },
                },
                {
                  label: "Singles %",
                  get: (m) => {
                    const d = Math.max(0, m.darts || 0);
                    const singles = n(
                      m.singles,
                      Math.max(
                        0,
                        d -
                          (n(m.doubles) +
                            n(m.triples) +
                            n(m.bulls) +
                            n(m.dbulls) +
                            n(m.misses) +
                            n(m.busts))
                      )
                    );
                    return pct(
                      d > 0 ? (singles / d) * 100 : undefined
                    );
                  },
                },
                {
                  label: "Miss",
                  get: (m) => f0(m.misses || 0),
                },
                {
                  label: "Miss %",
                  get: (m) =>
                    pct(
                      m.darts > 0
                        ? (n(m.misses) / m.darts) * 100
                        : undefined
                    ),
                },
                {
                  label: "Bust",
                  get: (m) => f0(m.busts || 0),
                },
                {
                  label: "Bust %",
                  get: (m) =>
                    pct(
                      m.darts > 0
                        ? (n(m.busts) / m.darts) * 100
                        : undefined
                    ),
                },
              ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 5) PRÉCISION (IMPACTS) ===== */}
      <CardTable title="Précision (impacts)">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                { label: "Doubles", get: (m) => f0(m.doubles) },
                {
                  label: "Dbl %",
                  get: (m) => pct(m.doublePct),
                },
                { label: "Triples", get: (m) => f0(m.triples) },
                {
                  label: "Trpl %",
                  get: (m) => pct(m.triplePct),
                },
                { label: "Bulls", get: (m) => f0(m.bulls) },
                {
                  label: "Bulls %",
                  get: (m) => pct(m.bullPct),
                },
                { label: "DBull", get: (m) => f0(m.dbulls) },
                {
                  label: "DBull %",
                  get: (m) => pct(m.dbullPct),
                },
                ...(has.singles
                  ? [
                      {
                        label: "Singles (hits)",
                        get: (m) => f0(m.singles || 0),
                      },
                    ]
                  : []),
                ...(has.misses
                  ? [
                      {
                        label: "Misses (hits)",
                        get: (m) => f0(m.misses || 0),
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

      {/* ===== 6) RATES ===== */}
      <CardTable title="Rates (si tentatives connues ou fallback)">
        <TableColMajor
          columns={cols}
          rowGroups={[
            {
              rows: [
                {
                  label: "Treble rate",
                  get: (m) => pct(m.triplePct),
                },
                {
                  label: "Double rate",
                  get: (m) => pct(m.doublePct),
                },
                {
                  label: "Bull rate",
                  get: (m) => pct(m.bullPct),
                },
                {
                  label: "DBull rate",
                  get: (m) => pct(m.dbullPct),
                },
                {
                  label: "Checkout rate",
                  get: (m) => pct(m.coPct),
                },
                {
                  label: "Single rate",
                  get: (m) => pct(m.singleRate),
                },
                {
                  label: "Bust rate",
                  get: (m) => pct(m.bustRate),
                },
              ],
            },
          ]}
          dataMap={M}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* ===== 7) RADAR HITS "TRAINING-LIKE" ===== */}
      {chartMetrics ? (
        <>
          <Panel className="x-card">
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: D.fsHead + 1,
                letterSpacing: 0.2,
                color: "#ffcf57",
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
                color: "#ffcf57",
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
              color: "#ffcf57",
            }}
          >
            Historique des volées
          </h3>
          <VisitsList visits={visits} playersById={playersById} />
        </Panel>
      ) : null}

      {/* ===== Overlay fin (optionnel) ===== */}
      {overlayOpen && overlayResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <EndOfLegOverlay
            open={overlayOpen}
            result={overlayResult}
            playersById={playersById}
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
      bestCheckout: sanitizeCO(
        row.bestCheckout ?? row.bestCheckoutScore ?? rawSummary.bestCheckout
      ),
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
      bestCheckoutScore: sanitizeCO(
        row.bestCheckout ?? row.bestCheckoutScore ?? rawSummary.bestCheckout
      ),
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
      const bestCO = sanitizeCO(
        s.bestCheckoutScore ?? s.highestCheckout ?? s.bestCheckout
      );
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
      bestCheckout: sanitizeCO(
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
  segOuter?: number;
  segInner?: number;
  segDouble?: number;
  segTriple?: number;
  segMiss?: number;
  byNumber?: ByNumber;
};

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

function buildPerPlayerMetrics(
  rec: any,
  summary: any | null,
  players: PlayerLite[],
  legStats?: LegStats
) {
  const out: Record<string, PlayerMetrics> = {};

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
        byNumber: {},
      });

    row.visits += 1;
    row.darts += Array.isArray(v.darts) ? v.darts.length : 0;

    let visitPoints = 0;
    for (const d of v.darts || []) {
      const seg = Number(d?.v ?? 0) || 0;
      const mult = Number(d?.mult ?? 1) || 1;
      const score = seg === 25 && mult === 2 ? 50 : seg * mult;
      visitPoints += score;

      if (seg === 0) {
        row.misses += 1;
        row.byNumber.miss = (row.byNumber.miss ?? 0) + 1;
        continue;
      }
      if (seg === 25 && mult === 2) {
        row.dbulls += 1;
        row.byNumber.dbull = (row.byNumber.dbull ?? 0) + 1;
        continue;
      }
      if (seg === 25) {
        row.bulls += 1;
        row.byNumber.bull = (row.byNumber.bull ?? 0) + 1;
        continue;
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
    }

    if (v.bust) {
      row.busts += 1;
      visitPoints = 0;
    }

    row.points += visitPoints;
    row.bestVisit = Math.max(row.bestVisit, visitPoints);

    if (visitPoints >= 180) row.t180 += 1;
    else if (visitPoints >= 140) row.t140 += 1;
    else if (visitPoints >= 100) row.t100 += 1;
    else if (visitPoints >= 60) row.t60 += 1;

    if (v.finish) {
      row.bestCO = Math.max(row.bestCO, visitPoints);
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
      m.bestCO = sanitizeCO(s.bestCheckout);
      m.darts = n(s.darts);
      m.visits = s._sumVisits ? n(s._sumVisits) : m.darts ? Math.ceil(m.darts / 3) : 0;
      m.points = n(s._sumPoints, (m.avg3 / 3) * m.darts);

      const sb =
        s.buckets ||
        (s.powerBuckets as any) ||
        (s.power as any) ||
        {};
      if (sb) {
        m.t180 = n(sb["180"] ?? sb["180+"] ?? sb.t180 ?? sb._180, m.t180);
        m.t140 = n(sb["140+"] ?? sb.t140 ?? sb._140, m.t140);
        m.t100 = n(sb["100+"] ?? sb.t100 ?? sb._100, m.t100);
        m.t60 = n(sb["60+"] ?? sb.t60 ?? sb._60, m.t60);
      }
    }

    // ===== 2) perPlayer riche (V3, training, etc.) =====
    const r = per?.[pid] || getPlayerRowFromObjectOrArray(payloadSummary?.perPlayer, pid) || {};
    const imp = r.impacts || {};

    m.first9 = v(r.first9Avg);
    m.highestNonCO = v(r.highestNonCheckout);
    m.dartsToFinish = v(r.dartsToFinish);
    m.avgCoDarts = v(r.avgCheckoutDarts);

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
      m.bestCO = sanitizeCO(
        r.bestCheckoutScore ?? r.highestCheckout ?? r.bestCheckout
      );

    // ---- HITS bruts : compat X01 V3 / training ----
    const dblHits = n(
      r.doubles ??
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
        r.hitsBull ??
        r.hitsBulls ??
        r.bullHits ??
        imp.bulls,
      m.bulls
    );
    const dbuHits = n(
      r.dbulls ??
        r.dBull ??
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
      m.t180 = m.t180 || n(rb["180"] ?? rb["180+"] ?? rb.t180 ?? rb._180, 0);
      m.t140 = m.t140 || n(rb["140+"] ?? rb.t140 ?? rb._140, 0);
      m.t100 = m.t100 || n(rb["100+"] ?? rb.t100 ?? rb._100, 0);
      m.t60 = m.t60 || n(rb["60+"] ?? rb.t60 ?? rb._60, 0);
    }

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
      sanitizeCO(
        pickFromAny([
          `bestCheckout.${pid}`,
          `highestCheckout.${pid}`,
          `bestCO.${pid}`,
        ], legacyRoots)
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

    // ===== 3b) fallback reconstruit depuis resume.darts / replay =====
    const dv = derivedByPid[pid];
    if (dv) {
      if (!m.darts) m.darts = n(dv.darts, 0);
      if (!m.visits) m.visits = n(dv.visits, 0);
      if (!m.points) m.points = n(dv.points, 0);
      if (!m.avg3 && n(dv.darts, 0) > 0) {
        m.avg3 = (n(dv.points, 0) / n(dv.darts, 0)) * 3;
      }
      if (!m.avg1 && m.avg3) m.avg1 = m.avg3 / 3;
      if (!m.bestVisit) m.bestVisit = n(dv.bestVisit, 0);
      m.bestCO = Math.max(
        sanitizeCO(m.bestCO),
        sanitizeCO(dv.bestCO)
      );

      if (!m.t60) m.t60 = n(dv.t60, 0);
      if (!m.t100) m.t100 = n(dv.t100, 0);
      if (!m.t140) m.t140 = n(dv.t140, 0);
      if (!m.t180) m.t180 = n(dv.t180, 0);

      if (m.singles == null) m.singles = n(dv.singles, 0);
      if (m.misses == null) m.misses = n(dv.misses, 0);
      if (m.busts == null) m.busts = n(dv.busts, 0);
      if (!m.doubles) m.doubles = n(dv.doubles, 0);
      if (!m.triples) m.triples = n(dv.triples, 0);
      if (!m.bulls) m.bulls = n(dv.bulls, 0);
      if (!m.dbulls) m.dbulls = n(dv.dbulls, 0);
      if (!m.byNumber && dv.byNumber) m.byNumber = dv.byNumber;
    }

    // ===== 4) dérivés & % =====
    if (!m.points && m.avg3 && m.darts) {
      m.points = Math.round((m.avg3 / 3) * m.darts);
    }
    if (!m.visits && m.darts) {
      m.visits = Math.ceil(m.darts / 3);
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
          color: "#ffcf57",
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
}: {
  player: PlayerLite;
  crowned?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: 34,
        height: 34,
        borderRadius: 999,
        border: crowned
          ? "2px solid rgba(255,207,87,.88)"
          : "2px solid rgba(255,255,255,.18)",
        boxShadow: crowned
          ? "0 0 16px rgba(255,207,87,.28)"
          : "0 6px 14px rgba(0,0,0,.22)",
        overflow: "hidden",
        background: "linear-gradient(180deg,#2a2a31,#121218)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: 11,
        fontWeight: 900,
        flex: "0 0 auto",
      }}
      title={player?.name || "Joueur"}
    >
      {player?.avatarDataUrl ? (
        <img
          src={player.avatarDataUrl}
          alt={player.name || "avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{avatarInitials(player?.name)}</span>
      )}
    </div>
  );
}

/* ================================
   Table COL-MAJOR (lignes = stats)
================================ */
type Col = { key: string; title: string };
type RowDef = { label: string; get: (m: PlayerMetrics) => string | number };

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
  return (
    <div
      className="x-table"
      style={{
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: D.radius,
      }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            <th className="x-th" style={thStyle(true)}>
              Stat
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                className="x-th"
                style={thStyle(false)}
              >
                <span
                  style={{
                    fontWeight: 900,
                    color: "#ffcf57",
                  }}
                >
                  {c.title}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowGroups.flatMap((g, gi) =>
            g.rows.map((r, ri) => (
              <tr key={`r-${gi}-${ri}`}>
                <td className="x-td" style={tdStyle(true)}>
                  {r.label}
                </td>
                {columns.map((c) => {
                  const m =
                    dataMap[c.key] ||
                    emptyMetrics({ id: c.key });
                  return (
                    <td
                      key={c.key}
                      className="x-td"
                      style={tdStyle(false)}
                    >
                      {r.get(m)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
function thStyle(isRowHeader: boolean): React.CSSProperties {
  return {
    textAlign: isRowHeader ? "left" : "right",
    padding: `${D.padCellV}px ${D.padCellH}px`,
    color: "#ffcf57",
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
              fill="rgba(255,207,87,.18)"
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

function buildVisitHistory(
  rec: any,
  players: PlayerLite[],
  legLike: any
): VisitRow[] {
  if (!players.length) return [];

  // 1) Si legStats / __legStats possède déjà les visits : on les utilise
  const rawVisits: any[] =
    legLike?.visits && Array.isArray(legLike.visits)
      ? legLike.visits
      : [];

  if (rawVisits.length) {
    return rawVisits.map((v, idx) => {
      const dartsSrc: any[] =
        v.darts || v.hits || v.throw || v.throws || [];
      const darts = dartsSrc.map((d) => ({
        v: Number(d.segment ?? d.v ?? d.value ?? d.num ?? 0) || 0,
        mult: (Number(d.multiplier ?? d.mult ?? d.m ?? d.multi ?? 1) ||
          1) as 1 | 2 | 3,
      }));
      const before = n(
        v.scoreBefore ?? v.before ?? v.startScore ?? v.scoreStart,
        0
      );
      const after = n(
        v.scoreAfter ?? v.after ?? v.endScore ?? v.scoreEnd,
        0
      );
      const bust = !!(v.bust ?? v.isBust);
      const finish =
        !!(v.finish ?? v.isFinish) || (!bust && after === 0);

      return {
        idx: idx + 1,
        legNo: Number(v.legNo ?? v.legIndex ?? 1) || 1,
        playerId: String(v.playerId ?? v.pid ?? ""),
        darts,
        scoreBefore: before,
        scoreAfter: after,
        bust,
        finish,
      };
    });
  }

  // 2) Fallback : on reconstruit depuis une liste linéaire de darts
  const rawDarts: any[] =
    rec?.resume?.darts ||
    rec?.resume?.throws ||
    rec?.payload?.allDarts ||
    rec?.payload?.darts ||
    rec?.payload?.replayDarts ||
    rec?.darts ||
    [];

  if (!Array.isArray(rawDarts) || !rawDarts.length) return [];

  const order: string[] =
    (Array.isArray(rec?.summary?.throwOrder) &&
    rec.summary.throwOrder.length
      ? rec.summary.throwOrder
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

  const scores: Record<string, number> = {};
  order.forEach((pid) => {
    scores[pid] = startScore;
  });

  const visits: VisitRow[] = [];
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

    let consumed = 0;

    for (; consumed < 3 && i < rawDarts.length; consumed += 1, i += 1) {
      const r = rawDarts[i] || {};
      const seg = Number(r.segment ?? r.v ?? r.value ?? r.num ?? 0) || 0;
      const mult = (Number(r.multiplier ?? r.mult ?? r.m ?? r.multi ?? 1) || 1) as 1 | 2 | 3;

      darts.push({ v: seg, mult });

      const value = seg === 25 && mult === 2 ? 50 : seg * mult;
      const tentative = scoreAfter - value;

      if (tentative < 0 || tentative === 1) {
        bust = true;
        scoreAfter = scoreBefore;

        // on consomme le reste de la volée pour éviter un doublon parasite
        const remainingInVisit = 2 - consumed;
        if (remainingInVisit > 0) {
          i += remainingInVisit;
        }
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

    if (finish) {
      break;
    }

    throwerIndex += 1;
  }

  return visits;
}

function VisitsList({
  visits,
  playersById,
}: {
  visits: VisitRow[];
  playersById: Record<string, PlayerLite>;
}) {
  if (!visits.length) return null;

  return (
    <div style={{ maxHeight: 320, overflowY: "auto", marginTop: 4 }}>
      {visits.map((v) => {
        const p = playersById[v.playerId];
        const name = p?.name || "—";
        const visitTotal = v.bust ? 0 : Math.max(0, v.scoreBefore - v.scoreAfter);

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
                  color: "#ffcf57",
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
                {v.darts?.length ? (
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
                    border: "1px solid rgba(255,207,87,.18)",
                    background:
                      "linear-gradient(180deg, rgba(255,207,87,.16), rgba(255,207,87,.06))",
                    color: "#ffcf57",
                    fontSize: 11,
                    fontWeight: 900,
                    boxShadow: "0 0 10px rgba(255,207,87,.14)",
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
      ? "1px solid rgba(255,207,87,.24)"
      : "1px solid rgba(255,255,255,.10)",
    background: isAfter
      ? "linear-gradient(180deg, rgba(255,207,87,.16), rgba(255,207,87,.06))"
      : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
    color: isAfter ? "#ffcf57" : "#f3f3f7",
    fontWeight: 900,
    fontSize: 12,
    boxShadow: isAfter
      ? "0 0 10px rgba(255,207,87,.12)"
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
    : "—";
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
