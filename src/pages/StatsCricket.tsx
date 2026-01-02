// ============================================
// src/pages/StatsCricket.tsx
// Stats dédiées Cricket (local) — ROBUST
// - Agrège toutes les parties "cricket" de l'historique (IDB History + fallback)
// - Supporte payload compressé (base64+gzip)
// - Extrait marks/points depuis plusieurs formats (player.legStats / payload.stats / summary.byPlayer...)
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";

type Props = {
  profiles: Profile[];
  activeProfileId: string | null;
};

type CricketAgg = {
  playerId: string;
  name: string;
  matches: number;
  wins: number;
  legs: number;
  totalMarks: number;
  totalPoints: number;
  bestMarks: number;
  bestPoints: number;
};

type CricketAggMap = Record<string, CricketAgg>;

/* -------------------------
   Helpers robust decode
------------------------- */

async function decodePayloadIfString(raw: any): Promise<any | null> {
  if (!raw || typeof raw !== "string") return null;
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      const ds = new DS("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      const resp = new Response(stream);
      return await resp.json();
    }

    // fallback sans gzip
    return JSON.parse(bin);
  } catch {
    try {
      // dernier fallback: peut-être JSON direct
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function asNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function getWinnerId(m: any): string | null {
  const payload = m?.payload || {};
  const sum = m?.summary || payload?.summary || payload?.result || {};
  return (
    m?.winnerId ??
    payload?.winnerId ??
    sum?.winnerId ??
    sum?.result?.winnerId ??
    sum?.winner?.id ??
    null
  );
}

function isFinished(m: any): boolean {
  const s = String(m?.status || "").toLowerCase();
  if (s === "finished") return true;
  const sum = m?.summary || m?.payload?.summary || m?.payload?.result || {};
  if (sum?.finished === true || sum?.result?.finished === true) return true;
  return false;
}

function isCricketMatch(m: any): boolean {
  const kind = String(m?.kind || "").toLowerCase();
  if (kind === "cricket") return true;

  const mode1 = String(m?.game?.mode || "").toLowerCase();
  const mode2 = String(m?.payload?.mode || "").toLowerCase();
  const mode3 = String(m?.payload?.config?.mode || "").toLowerCase();
  const mode4 = String(m?.summary?.mode || "").toLowerCase();
  return (
    mode1.includes("cricket") ||
    mode2.includes("cricket") ||
    mode3.includes("cricket") ||
    mode4.includes("cricket")
  );
}

function getPlayersFromMatch(m: any): any[] {
  const payload = m?.payload || {};
  const a =
    (Array.isArray(payload?.players) && payload.players.length && payload.players) ||
    (Array.isArray(m?.players) && m.players.length && m.players) ||
    (Array.isArray(m?.payload?.summary?.players) && m.payload.summary.players) ||
    [];
  return Array.isArray(a) ? a : [];
}

/**
 * Extrait une "ligne stats cricket" pour un joueur
 * Supporte plusieurs formats :
 * - player.legStats / player.stats / player.cricketStats
 * - payload.stats.byPlayer[id]
 * - summary.byPlayer[id]
 * - summary.players[] / standings[] / rankings[]
 */
function extractPlayerCricketLine(match: any, player: any) {
  const pid = String(player?.id || player?.playerId || player?.profileId || "");
  const payload = match?.payload || {};
  const summary = match?.summary || payload?.summary || payload?.result || {};

  // 1) direct sur le player
  const pStats =
    player?.legStats ||
    player?.stats ||
    player?.cricketStats ||
    player?.cricket ||
    player?.cricket_stats ||
    null;

  if (pStats && typeof pStats === "object") {
    const legs =
      asNum(pStats.legs, 0) ||
      asNum(pStats.totalLegs, 0) ||
      asNum(pStats.rounds, 0) ||
      asNum(pStats.totalRounds, 0) ||
      1;

    const marks =
      asNum(pStats.totalMarks, 0) ||
      asNum(pStats.marks, 0) ||
      asNum(pStats.totalHits, 0) ||
      asNum(pStats.hits, 0) ||
      0;

    const points =
      asNum(pStats.totalPoints, 0) ||
      asNum(pStats.points, 0) ||
      asNum(pStats.score, 0) ||
      0;

    return { legs, marks, points };
  }

  // 2) payload.stats.byPlayer
  const byPlayer =
    payload?.stats?.byPlayer ||
    payload?.cricketStats?.byPlayer ||
    payload?.cricket?.byPlayer ||
    summary?.byPlayer ||
    summary?.detailedByPlayer ||
    summary?.playersById ||
    null;

  if (byPlayer && typeof byPlayer === "object") {
    const row = byPlayer[pid] || byPlayer[String(pid)] || null;
    if (row && typeof row === "object") {
      const legs = asNum(row.legs, 0) || asNum(row.rounds, 0) || 1;
      const marks =
        asNum(row.totalMarks, 0) ||
        asNum(row.marks, 0) ||
        asNum(row.totalHits, 0) ||
        asNum(row.hits, 0) ||
        0;
      const points =
        asNum(row.totalPoints, 0) ||
        asNum(row.points, 0) ||
        asNum(row.score, 0) ||
        0;
      return { legs, marks, points };
    }
  }

  // 3) summary.rankings / summary.players / standings etc.
  const arr =
    summary?.rankings ||
    summary?.players ||
    summary?.standings ||
    summary?.result?.players ||
    summary?.result?.rankings ||
    null;

  if (Array.isArray(arr)) {
    const hit = arr.find(
      (x: any) =>
        String(x?.id || x?.playerId || x?.profileId || "") === pid ||
        String(x?.name || "") === String(player?.name || "")
    );
    if (hit) {
      const legs = asNum(hit.legs, 0) || asNum(hit.rounds, 0) || 1;
      const marks =
        asNum(hit.totalMarks, 0) ||
        asNum(hit.marks, 0) ||
        asNum(hit.hits, 0) ||
        asNum(hit.totalHits, 0) ||
        0;
      const points =
        asNum(hit.totalPoints, 0) ||
        asNum(hit.points, 0) ||
        asNum(hit.score, 0) ||
        0;
      return { legs, marks, points };
    }
  }

  return { legs: 1, marks: 0, points: 0 };
}

/* -------------------------
   Component
------------------------- */

export default function StatsCricket({ profiles, activeProfileId }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [loading, setLoading] = React.useState(true);
  const [agg, setAgg] = React.useState<CricketAggMap>({});
  const [selectedId, setSelectedId] = React.useState<string | "all">("all");

  // init sélection : profil actif sinon "all"
  React.useEffect(() => {
    if (activeProfileId) setSelectedId(activeProfileId);
    else setSelectedId("all");
  }, [activeProfileId]);

  // Chargement / agrégation des matchs Cricket
  React.useEffect(() => {
    let alive = true;

    async function loadCricketStats() {
      setLoading(true);
      try {
        // 1) Liste: History.list() (robuste)
        let rows: any[] = [];
        try {
          rows = (await (History as any).list?.()) || [];
        } catch {
          rows = [];
        }

        // fallback store.history si jamais (rare)
        if (!Array.isArray(rows) || !rows.length) {
          try {
            const anyStore = (window as any).__appStore?.store;
            if (anyStore?.history && Array.isArray(anyStore.history)) rows = anyStore.history;
          } catch {}
        }

        // 2) Filtrer cricket + finished
        const cricketRows = (rows || []).filter((m: any) => isFinished(m) && isCricketMatch(m));

        // 3) Charger match complet (History.get) + decode payload si string
        const fullMatches = await Promise.all(
          cricketRows.map(async (m: any) => {
            const id = m?.id;
            let full = m;
            try {
              const got = await (History as any).get?.(id);
              if (got) full = got;
            } catch {}

            // decode payload string -> merge
            if (typeof full?.payload === "string") {
              const decoded = await decodePayloadIfString(full.payload);
              if (decoded && typeof decoded === "object") {
                // certains workers stockent {config, summary, payload} etc.
                const decodedPayload = decoded?.payload || decoded;
                const decodedSummary = decoded?.summary || decoded?.result || decoded?.stats || null;

                full = {
                  ...full,
                  payload: typeof decodedPayload === "object" ? { ...(full.payloadObj || {}), ...decodedPayload } : full.payloadObj || {},
                  summary: decodedSummary ? { ...(full.summary || {}), ...decodedSummary } : (full.summary || {}),
                  decoded,
                };
              }
            }

            // si payload est objet normal, OK
            if (full?.payload && typeof full.payload === "object") {
              // rien
            }

            return full;
          })
        );

        const map: CricketAggMap = {};

        for (const match of fullMatches) {
          if (!match) continue;
          if (!isCricketMatch(match) || !isFinished(match)) continue;

          const winnerId = getWinnerId(match);

          const players = getPlayersFromMatch(match);

          for (const p of players) {
            const id: string = String(p?.id || p?.playerId || p?.profileId || "");
            if (!id) continue;

            const profile = profiles.find((pr) => pr.id === id) ?? null;
            const name: string = profile?.name || p?.name || "???";

            const line = extractPlayerCricketLine(match, p);
            const legs = asNum(line.legs, 1) > 0 ? asNum(line.legs, 1) : 1;
            const marks = asNum(line.marks, 0);
            const points = asNum(line.points, 0);

            if (!map[id]) {
              map[id] = {
                playerId: id,
                name,
                matches: 0,
                wins: 0,
                legs: 0,
                totalMarks: 0,
                totalPoints: 0,
                bestMarks: 0,
                bestPoints: 0,
              };
            }

            const row = map[id];
            row.matches += 1;
            if (winnerId && String(winnerId) === id) row.wins += 1;

            row.legs += legs;
            row.totalMarks += marks;
            row.totalPoints += points;

            row.bestMarks = Math.max(row.bestMarks, marks);
            row.bestPoints = Math.max(row.bestPoints, points);
          }
        }

        if (!alive) return;
        setAgg(map);
      } catch (e) {
        console.warn("[StatsCricket] load error:", e);
        if (!alive) return;
        setAgg({});
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCricketStats();
    return () => {
      alive = false;
    };
  }, [profiles]);

  const playersAgg = React.useMemo(
    () => Object.values(agg).sort((a, b) => b.matches - a.matches),
    [agg]
  );

  const totalAgg = React.useMemo(() => {
    if (!playersAgg.length) return null;
    const base: CricketAgg = {
      playerId: "all",
      name: t("statsCricket.allPlayers", "Tous les joueurs"),
      matches: 0,
      wins: 0,
      legs: 0,
      totalMarks: 0,
      totalPoints: 0,
      bestMarks: 0,
      bestPoints: 0,
    };
    for (const r of playersAgg) {
      base.matches += r.matches;
      base.wins += r.wins;
      base.legs += r.legs;
      base.totalMarks += r.totalMarks;
      base.totalPoints += r.totalPoints;
      base.bestMarks = Math.max(base.bestMarks, r.bestMarks);
      base.bestPoints = Math.max(base.bestPoints, r.bestPoints);
    }
    return base;
  }, [playersAgg, t]);

  const current: CricketAgg | null = React.useMemo(() => {
    if (selectedId === "all") return totalAgg;
    return playersAgg.find((p) => p.playerId === selectedId) ?? null;
  }, [selectedId, playersAgg, totalAgg]);

  const hasData = playersAgg.length > 0;

  const marksPerLeg = current && current.legs > 0 ? current.totalMarks / current.legs : 0;
  const pointsPerLeg = current && current.legs > 0 ? current.totalPoints / current.legs : 0;
  const winRate = current && current.matches > 0 ? (current.wins / current.matches) * 100 : 0;

  return (
    <div
      className="cricket-stats-page"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: "16px 12px 80px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .cricket-stats-page {
          --title-min: 22px;
          --title-ideal: 7vw;
          --title-max: 34px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .cricket-stats-page {
            --title-min: 20px;
            --title-ideal: 6.6vw;
            --title-max: 30px;
          }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto 12px",
          paddingInline: 8,
        }}
      >
        <div
          style={{
            fontSize: "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
            fontWeight: 900,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: theme.primary,
            textShadow: `0 0 12px ${theme.primary}88`,
          }}
        >
          {t("statsCricket.title", "Stats Cricket")}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: theme.textSoft,
            maxWidth: 360,
          }}
        >
          {t("statsCricket.subtitle", "Performance détaillée sur les manches de Cricket (local).")}
        </div>
      </div>

      {/* SELECTEUR JOUEUR */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto 14px",
          paddingInline: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSoft,
            marginBottom: 6,
          }}
        >
          {t("statsCricket.playerPicker", "Joueur")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            onClick={() => setSelectedId("all")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: selectedId === "all" ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
              background: selectedId === "all" ? theme.primary : "rgba(0,0,0,0.5)",
              color: selectedId === "all" ? "#000" : theme.textSoft,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {t("statsCricket.all", "Tous")}
          </button>

          {profiles.map((p) => {
            const active = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  background: active ? theme.primary : "rgba(0,0,0,0.5)",
                  color: active ? "#000" : theme.textSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  maxWidth: "60%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARTE PRINCIPALE JOUEUR */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto 12px",
          paddingInline: 8,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
            padding: 14,
            boxShadow: "0 18px 36px rgba(0,0,0,.7)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8, color: theme.textSoft }}>
                {t("statsCricket.overview", "Vue d'ensemble")}
              </div>
              <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800 }}>
                {current?.name ?? t("statsCricket.noData", "Aucune donnée Cricket")}
              </div>
            </div>

            {current && (
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.7)",
                  border: `1px solid ${theme.borderSoft}`,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: theme.textSoft,
                }}
              >
                {current.matches} {t("statsCricket.matches", "matchs")}
              </div>
            )}
          </div>

          {loading && (
            <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
              {t("statsCricket.loading", "Chargement des stats Cricket…")}
            </div>
          )}

          {!loading && !hasData && (
            <div style={{ marginTop: 4, fontSize: 13, color: theme.textSoft }}>
              {t("statsCricket.empty", "Aucune manche de Cricket enregistrée pour l'instant.")}
            </div>
          )}

          {!loading && hasData && current && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 10,
                marginTop: 10,
              }}
            >
              <KpiCard
                label={t("statsCricket.kpi.winrate", "Taux de victoire")}
                value={`${winRate.toFixed(1)}%`}
                hint={`${current.wins}/${current.matches} ${t("statsCricket.kpi.winsLabel", "victoires")}`}
                theme={theme}
              />
              <KpiCard
                label={t("statsCricket.kpi.marksPerLeg", "Marks / manche")}
                value={marksPerLeg.toFixed(1)}
                hint={`${current.totalMarks} ${t("statsCricket.kpi.marksTotal", "marks totales")}`}
                theme={theme}
              />
              <KpiCard
                label={t("statsCricket.kpi.pointsPerLeg", "Points / manche")}
                value={pointsPerLeg.toFixed(1)}
                hint={`${current.totalPoints} ${t("statsCricket.kpi.pointsTotal", "points totaux")}`}
                theme={theme}
              />
              <KpiCard
                label={t("statsCricket.kpi.bestGame", "Meilleure manche")}
                value={`${current.bestMarks} m`}
                hint={`${current.bestPoints} pts`}
                theme={theme}
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLEAU JOUEURS */}
      {hasData && (
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", paddingInline: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: theme.textSoft, marginBottom: 4 }}>
            {t("statsCricket.playersTable", "Classement joueurs (Cricket)")}
          </div>

          <div style={{ borderRadius: 14, background: theme.card, border: `1px solid ${theme.borderSoft}`, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 1fr 1fr 1fr",
                padding: "6px 10px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: theme.textSoft,
                borderBottom: `1px solid ${theme.borderSoft}`,
              }}
            >
              <div>{t("statsCricket.th.player", "Joueur")}</div>
              <div style={{ textAlign: "right" }}>{t("statsCricket.th.matches", "M")}</div>
              <div style={{ textAlign: "right" }}>{t("statsCricket.th.winrate", "Win%")}</div>
              <div style={{ textAlign: "right" }}>{t("statsCricket.th.marksPerLeg", "Marks/L")}</div>
            </div>

            {playersAgg.map((p) => {
              const wr = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
              const mpl = p.legs > 0 ? p.totalMarks / p.legs : 0;
              const active = selectedId === p.playerId;

              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => setSelectedId(p.playerId)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.2fr 1fr 1fr 1fr",
                    padding: "6px 10px",
                    fontSize: 12,
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    background: active ? "rgba(0,0,0,0.75)" : "transparent",
                    color: theme.text,
                    cursor: "pointer",
                    borderBottom: `1px solid ${theme.borderSoft}33`,
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ textAlign: "right" }}>{p.matches}</div>
                  <div style={{ textAlign: "right" }}>{wr.toFixed(1)}%</div>
                  <div style={{ textAlign: "right" }}>{mpl.toFixed(1)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------
 * KPI CARD
 * -------------------------------------------*/

function KpiCard({
  label,
  value,
  hint,
  theme,
}: {
  label: string;
  value: string | number;
  hint?: string;
  theme: any;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: "rgba(0,0,0,0.7)",
        border: `1px solid ${theme.borderSoft}`,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: theme.textSoft }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: theme.primary, textShadow: `0 0 10px ${theme.primary}66` }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: theme.textSoft, opacity: 0.8 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
