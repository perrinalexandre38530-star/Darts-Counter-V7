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
          if (mounted) setRec(params.rec);
          return;
        }
        if (params?.matchId) {
          const byId = await (History as any)?.get?.(params.matchId);
          if (mounted && byId) {
            setRec(byId);
            return;
          }
        }
        const mem = (window as any)?.__appStore?.history as
          | any[]
          | undefined;
        if (mem?.length) {
          if (params?.matchId) {
            const m = mem.find((r) => r?.id === params.matchId);
            if (mounted && m) {
              setRec(m);
              return;
            }
          }
          const lastFin = mem.find(
            (r) => String(r?.status).toLowerCase() === "finished"
          );
          if (mounted && lastFin) {
            setRec(lastFin);
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
  const matchSummary =
    rec?.summary &&
    typeof rec.summary === "object" &&
    (rec.summary.kind === "x01" ||
      rec.summary.kind === "x01_v3" ||
      rec.summary.variant === "x01_v3" ||
      rec.summary.engine === "x01_v3")
      ? rec.summary
      : null;

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
    >
      <style dangerouslySetInnerHTML={{ __html: mobileDenseCss }} />

      {/* === Bandeau joueurs + vainqueur === */}
      <Panel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#e8e8ec",
              fontSize: 12,
            }}
          >
            Joueurs :{" "}
            {players.map((p) => p?.name || "—").join(" · ") || "—"}
          </div>
          {winnerName ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#ffcf57",
                fontWeight: 900,
              }}
            >
              <Trophy />
              <span>{winnerName}</span>
            </div>
          ) : null}
        </div>
      </Panel>

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
  const perFromSummary = summary?.detailedByPlayer || {};

  // on merge : ce qui vient de __legStats écrase au besoin ce qui vient de detailedByPlayer
  const per: Record<string, any> = {
    ...perFromSummary,
    ...perFromRich,
  };

  const legacy = rec?.payload || rec || {};
  const legacyHitsBySectorAll: any =
    rec?.summary?.legacy?.hitsBySector ||
    rec?.payload?.legacy?.hitsBySector ||
    {};

  for (const pl of players) {
    const pid = pl.id;
    const m = emptyMetrics(pl);

    // ===== 1) summary (rapide) =====
    const s = summary?.players?.[pid];
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
    const r = per?.[pid] || {};
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
    m.t180 = m.t180 || n(pick(legacy, [`h180.${pid}`, `t180.${pid}`]), 0);
    m.t140 = m.t140 || n(pick(legacy, [`h140.${pid}`, `t140.${pid}`]), 0);
    m.t100 = m.t100 || n(pick(legacy, [`h100.${pid}`, `t100.${pid}`]), 0);
    m.t60 = m.t60 || n(pick(legacy, [`h60.${pid}`, `t60.${pid}`]), 0);

    m.darts =
      m.darts ||
      n(pick(legacy, [`darts.${pid}`, `dartsThrown.${pid}`]), 0);
    m.visits = m.visits || n(pick(legacy, [`visits.${pid}`]), 0);
    m.points =
      m.points ||
      n(pick(legacy, [`pointsScored.${pid}`, `points.${pid}`]), 0);
    m.avg3 =
      m.avg3 ||
      n(pick(legacy, [`avg3.${pid}`, `avg3d.${pid}`]), 0);
    if (!m.avg1 && m.avg3) m.avg1 = m.avg3 / 3;
    m.bestVisit =
      m.bestVisit || n(pick(legacy, [`bestVisit.${pid}`]), 0);
    m.bestCO =
      m.bestCO ||
      sanitizeCO(
        pick(legacy, [
          `bestCheckout.${pid}`,
          `highestCheckout.${pid}`,
          `bestCO.${pid}`,
        ])
      );

    const dblC = n(
      pick(legacy, [
        `doubles.${pid}`,
        `doubleCount.${pid}`,
        `dbl.${pid}`,
      ]),
      0
    );
    const trpC = n(
      pick(legacy, [
        `triples.${pid}`,
        `tripleCount.${pid}`,
        `trp.${pid}`,
      ]),
      0
    );
    const bulC = n(
      pick(legacy, [
        `bulls.${pid}`,
        `bullCount.${pid}`,
        `bull.${pid}`,
      ]),
      0
    );
    const dbuC = n(
      pick(legacy, [
        `dbulls.${pid}`,
        `doubleBull.${pid}`,
        `doubleBulls.${pid}`,
        `bull50.${pid}`,
      ]),
      0
    );
    const sngC = pick(legacy, [`singles.${pid}`, `single.${pid}`]);
    const misC = pick(legacy, [`misses.${pid}`, `miss.${pid}`]);
    const bstC = pick(legacy, [
      `busts.${pid}`,
      `bust.${pid}`,
      `bustCount.${pid}`,
    ]);

    if (!m.doubles) m.doubles = dblC || m.doubles;
    if (!m.triples) m.triples = trpC || m.triples;
    if (!m.bulls) m.bulls = bulC || m.bulls;
    if (!m.dbulls) m.dbulls = dbuC || m.dbulls;
    if (m.singles == null && sngC != null) m.singles = n(sngC, 0);
    if (m.misses == null && misC != null) m.misses = n(misC, 0);
    if (m.busts == null && bstC != null) m.busts = n(bstC, 0);

    m.coHits =
      m.coHits ||
      n(pick(legacy, [`checkoutHits.${pid}`]), m.coHits);
    m.coAtt =
      m.coAtt ||
      n(
        pick(legacy, [`checkoutAttempts.${pid}`]),
        m.coAtt
      );

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
}: {
  go: (t: string, p?: any) => void;
  title?: string;
  children?: React.ReactNode;
  canResume?: boolean;
  resumeId?: string | null;
}) {
  return (
    <div
      className="x-end"
      style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}
    >
      <button onClick={() => go("stats", { tab: "history" })} style={btn()}>
        ← Retour
      </button>
      <h2 style={{ margin: "10px 0 8px", letterSpacing: 0.3 }}>
        {title || "Fin de partie"}
      </h2>
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
    rec?.summary?.game?.startScore ??
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

    for (let j = 0; j < 3 && i < rawDarts.length; j++, i++) {
      const r = rawDarts[i] || {};
      const seg = Number(r.segment ?? r.v ?? r.value ?? r.num ?? 0) || 0;
      const mult = (Number(r.multiplier ?? r.mult ?? r.m ?? r.multi ?? 1) ||
        1) as 1 | 2 | 3;

      darts.push({ v: seg, mult });

      const value = seg === 25 && mult === 2 ? 50 : seg * mult;
      const tentative = scoreAfter - value;

      if (tentative < 0 || tentative === 1) {
        // Bust : score revient à l'état initial de la volée
        bust = true;
        scoreAfter = scoreBefore;
        break;
      } else {
        scoreAfter = tentative;
        if (scoreAfter === 0) {
          finish = true;
          break;
        }
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
      // Nouveau leg : reset des scores
      legNo += 1;
      order.forEach((id) => {
        scores[id] = startScore;
      });
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
    <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 2 }}>
      {visits.map((v) => {
        const p = playersById[v.playerId];
        const name = p?.name || "—";
        const dartsLabel = v.darts.map((d) => dartToString(d.v, d.mult)).join(" · ");

        return (
          <div
            key={v.idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 6px",
              borderRadius: 8,
              background: "rgba(255,255,255,.02)",
              marginBottom: 3,
              fontSize: 11.5,
            }}
          >
            <div style={{ minWidth: 70 }}>
              <b>#{v.idx}</b> · Leg {v.legNo}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                marginInline: 8,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
              {v.bust && (
                <span style={{ marginLeft: 4, color: "#ff9090", fontWeight: 700 }}>
                  (BUST)
                </span>
              )}
              {v.finish && !v.bust && (
                <span style={{ marginLeft: 4, color: "#7fe2a9", fontWeight: 700 }}>
                  (FINISH)
                </span>
              )}
            </div>
            <div
              style={{
                flex: 2,
                minWidth: 0,
                fontFamily: "monospace",
                fontSize: 11,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {dartsLabel || "—"}
            </div>
            <div style={{ minWidth: 80, textAlign: "right" }}>
              {v.scoreBefore} → <b>{v.scoreAfter}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
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
