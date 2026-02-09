// ============================================
// src/pages/StatsTerritories.tsx
// Centre de statistiques — TERRITORIES
// Objectif: même rendu "dashboard" que l'onglet X01 (KPIs + sections),
// tout en restant robuste quand il n'y a aucune donnée.
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS } from "../lib/territories/maps";
import {
  clearTerritoriesHistory,
  loadTerritoriesHistory,
  type TerritoriesMatch,
} from "../lib/territories/territoriesStats";

const INFO_TEXT = `STATS TERRITORIES

- Parties enregistrées localement (sur l'appareil)
- KPIs : maps jouées, domination, captures, volumes
- Reset possible via le bouton "effacer"`;

function fmtDate(ts: number) {
  try {
    const d = new Date(ts);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
  } catch {
    return "—";
  }
}

function n(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function StatsTerritories(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  const embedded = Boolean(props?.embedded);

  const [items, setItems] = React.useState<TerritoriesMatch[]>(() =>
    loadTerritoriesHistory()
  );

  const refresh = React.useCallback(() => {
    setItems(loadTerritoriesHistory());
  }, []);

  React.useEffect(() => {
    // refresh if history changes
    const onUpd = () => refresh();
    if (typeof window !== "undefined") {
      window.addEventListener("dc-territories-updated", onUpd);
      window.addEventListener("dc-history-updated", onUpd);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dc-territories-updated", onUpd);
        window.removeEventListener("dc-history-updated", onUpd);
      }
    };
  }, [refresh]);

  function goBack() {
    if (props?.setTab) return props.setTab("stats");
    window.history.back();
  }

  function clearAll() {
    clearTerritoriesHistory();
    refresh();
  }

  // =====================
  // Aggregations
  // =====================
  const total = items.length;

  const byMap = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.mapId] = (m[it.mapId] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const uniqueMaps = byMap.length;

  const avgRounds = React.useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + n(it.rounds), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const avgDomWinner = React.useMemo(() => {
    if (!items.length) return 0;
    let sum = 0;
    for (const it of items) {
      const w = n(it.winnerTeam);
      sum += n(it.domination?.[w] ?? 0);
    }
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const avgCaptures = React.useMemo(() => {
    if (!items.length) return 0;
    let sum = 0;
    for (const it of items) {
      const cap = Array.isArray(it.captured) ? it.captured : [];
      sum += cap.reduce((a, b) => a + n(b), 0);
    }
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const avgCapturesPerRound = React.useMemo(() => {
    const r = avgRounds || 0;
    if (r <= 0) return 0;
    return Math.round((avgCaptures / r) * 10) / 10;
  }, [avgCaptures, avgRounds]);

  const avgMargin = React.useMemo(() => {
    if (!items.length) return 0;
    let sum = 0;
    for (const it of items) {
      const dom = Array.isArray(it.domination) ? it.domination.map(n) : [];
      const w = n(it.winnerTeam);
      const wv = n(dom[w] ?? 0);
      const ov = Math.max(
        0,
        ...dom.filter((_, idx) => idx !== w)
      );
      sum += Math.max(0, wv - ov);
    }
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const breakdown = React.useMemo(() => {
    let solo = 0;
    let teams = 0;
    let totalDarts = 0;
    let totalSteals = 0;
    let totalLost = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    const objectives: Record<string, number> = {};
    const victoryTypes: Record<string, number> = {};

    for (const it of items) {
      const mode = String((it as any).mode ?? "solo");
      if (mode === "teams") teams++;
      else solo++;

      totalDarts += n((it as any).darts);
      totalSteals += n((it as any).steals);
      totalLost += n((it as any).lost);

      const dur = n((it as any).durationMs);
      if (dur > 0) {
        totalDurationMs += dur;
        durationCount++;
      }

      const obj = String((it as any).objective ?? "");
      if (obj) objectives[obj] = (objectives[obj] ?? 0) + 1;

      const v = String((it as any).victoryType ?? "");
      if (v) victoryTypes[v] = (victoryTypes[v] ?? 0) + 1;
    }

    const avgDarts = items.length ? Math.round((totalDarts / items.length) * 10) / 10 : 0;
    const avgSteals = items.length ? Math.round((totalSteals / items.length) * 10) / 10 : 0;
    const avgLost = items.length ? Math.round((totalLost / items.length) * 10) / 10 : 0;
    const avgDurationMin = durationCount
      ? Math.round(((totalDurationMs / durationCount) / 60000) * 10) / 10
      : 0;

    const topObjective = Object.entries(objectives).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topVictory = Object.entries(victoryTypes).sort((a, b) => b[1] - a[1])[0]?.[0];

    
    // --- Mini-graph helpers (recent trends + scaling) ---
    const itemsSorted = [...items].sort(
      (a, b) => Number((b as any)?.ts ?? 0) - Number((a as any)?.ts ?? 0)
    );
    const lastN = itemsSorted.slice(0, 12);

    const lastCaptures = lastN.map((it) => Number((it as any)?.captures ?? 0));
    const lastDom = lastN.map((it) =>
      Number((it as any)?.domWinner ?? (it as any)?.domination ?? 0)
    );
    const lastRounds = lastN.map((it) => Number((it as any)?.rounds ?? 0));

    const maxLastCaptures = Math.max(1, ...lastCaptures);
    const maxLastDom = Math.max(1, ...lastDom);
    const maxLastRounds = Math.max(1, ...lastRounds);
return {
      solo,
      teams,
      totalDarts,
      totalSteals,
      totalLost,
      totalDurationMs,
      durationCount,
      lastCaptures,
      lastDom,
      lastRounds,
      maxLastCaptures,
      maxLastDom,
      maxLastRounds,
      avgDarts,
      avgSteals,
      avgLost,
      avgDurationMin,
      topObjective,
      topVictory,
      objectives,
      victoryTypes,
    };
  }, [items]);

  // ------------------------------------------------------------
  // Derived ratios used by mini-graphs (must always be defined)
  // ------------------------------------------------------------
  const avgDarts = n(breakdown.avgDarts);
  const avgDurationMin = n(breakdown.avgDurationMin);
  // --- Derived ratios (robust: never ReferenceError even if a metric is missing) ---
  const totalRoundsAll = n((breakdown as any).totalRounds);
  const totalDartsAll = n((breakdown as any).totalDarts);
  const totalCapturesAll = n((breakdown as any).totalCaptures);
  const totalStealsAll = n((breakdown as any).totalSteals);
  const totalLostAll = n((breakdown as any).totalLost);

  // Per-round (global) rates
  const avgStealsPerRound = totalRoundsAll > 0 ? totalStealsAll / totalRoundsAll : 0;
  const avgLostPerRound = totalRoundsAll > 0 ? totalLostAll / totalRoundsAll : 0;

  // Per-dart (global) rate
  const capturesPerDart = totalDartsAll > 0 ? totalCapturesAll / totalDartsAll : 0;
  const dartsPerCapture = n(avgCapturesPerRound) > 0 ? avgDarts / n(avgCapturesPerRound) : 0;
  const capturesPerMin = avgDurationMin > 0 ? n(avgCapturesPerRound) / avgDurationMin : 0;
  const stealsPerMin = avgDurationMin > 0 ? avgStealsPerRound / avgDurationMin : 0;
  const lostPerMin = avgDurationMin > 0 ? avgLostPerRound / avgDurationMin : 0;

  const last7 = React.useMemo(() => {
    const now = Date.now();
    const d7 = 7 * 24 * 3600 * 1000;
    return items.filter((it) => now - n((it as any).ts ?? (it as any).when) <= d7).length;
  }, [items]);

  const bestGame = React.useMemo(() => {
    if (!items.length) return null;
    let best: TerritoriesMatch | null = null;
    let bestDom = -1;
    for (const it of items) {
      const w = n(it.winnerTeam);
      const dom = n(it.domination?.[w] ?? 0);
      if (dom > bestDom) {
        bestDom = dom;
        best = it;
      }
    }
    return best;
  }, [items]);

  const records = React.useMemo(() => {
    if (!items.length) {
      return {
        bestCaptures: null as TerritoriesMatch | null,
        bestSteals: null as TerritoriesMatch | null,
        bestEfficiency: null as TerritoriesMatch | null,
        longest: null as TerritoriesMatch | null,
      };
    }

    let bestCaptures: TerritoriesMatch | null = null;
    let bestCapturesVal = -1;

    let bestSteals: TerritoriesMatch | null = null;
    let bestStealsVal = -1;

    let bestEfficiency: TerritoriesMatch | null = null;
    let bestEfficiencyVal = -1;

    let longest: TerritoriesMatch | null = null;
    let longestVal = -1;

    for (const it of items) {
      const w = n(it.winnerTeam);
      const capW = n((it.captured || [])[w] ?? 0);
      if (capW > bestCapturesVal) {
        bestCapturesVal = capW;
        bestCaptures = it;
      }

      const steals = n((it as any).steals);
      if (steals > bestStealsVal) {
        bestStealsVal = steals;
        bestSteals = it;
      }

      const darts = n((it as any).darts);
      const capTotal = Array.isArray(it.captured) ? it.captured.map(n).reduce((a, b) => a + b, 0) : 0;
      const eff = darts > 0 ? capTotal / darts : 0;
      if (eff > bestEfficiencyVal) {
        bestEfficiencyVal = eff;
        bestEfficiency = it;
      }

      const dur = n((it as any).durationMs);
      if (dur > longestVal) {
        longestVal = dur;
        longest = it;
      }
    }

    return { bestCaptures, bestSteals, bestEfficiency, longest };
  }, [items]);

  // =====================
  // Style "X01-like"
  // =====================
  const T = {
    gold: theme.primary,
    text: theme.text ?? "#FFFFFF",
    text70: "rgba(255,255,255,.70)",
    cardBg: "rgba(7,8,16,0.98)",
    edge: theme.edgeColor ?? "rgba(255,255,255,0.10)",
  };

  const card: React.CSSProperties = {
    background: T.cardBg,
    borderRadius: 22,
    border: `1px solid ${T.edge}`,
    boxShadow: "0 18px 32px rgba(0,0,0,.90)",
    padding: 12,
  };

  const goldNeon: React.CSSProperties = {
    color: T.gold,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: 900,
    textShadow: `0 0 6px ${T.gold}CC, 0 0 14px ${T.gold}88`,
  };

  const kpiBox: React.CSSProperties = {
    borderRadius: 18,
    padding: 10,
    background: "linear-gradient(180deg,#18181A,#0F0F12)",
    border: "1px solid rgba(255,255,255,.16)",
    boxShadow: "0 10px 24px rgba(0,0,0,.55)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minHeight: 70,
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: T.text70,
  };

  const kpiValueMain: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
  };

  const row: React.CSSProperties = {
    borderRadius: 16,
    padding: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  };

  // =====================
  // Render
  // =====================
  return (
    <div className={embedded ? undefined : "page"}>
      {!embedded && (
        <PageHeader
          title="STATS — TERRITORIES"
          left={<BackDot onClick={goBack} />}
          right={<InfoDot title="Stats TERRITORIES" content={INFO_TEXT} />}
        />
      )}

      {embedded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>
            TERRITORIES
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={refresh}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                padding: "6px 10px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {t("generic.refresh", "Rafraîchir")}
            </button>

            <InfoDot title="Stats TERRITORIES" content={INFO_TEXT} />
          </div>
        </div>
      )}

      <div
        style={{
          padding: embedded ? 0 : 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: embedded ? 10 : 0,
        }}
      >
        {/* HEADER CARD */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ ...goldNeon, fontSize: 18, marginBottom: 8, textAlign: "center" }}>
            {t("territories.title", "Territories")}
          </div>
          <div style={{ fontSize: 12, color: T.text70, textAlign: "center" }}>
            {t(
              "territories.subtitle",
              "Vue d'ensemble + gameplay (même style que X01)"
            )}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <button
              onClick={refresh}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                padding: "10px 12px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
                minWidth: 110,
              }}
            >
              {t("generic.refresh", "Rafraîchir")}
            </button>

            <button
              onClick={clearAll}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,120,120,0.25)",
                background: "rgba(255,120,120,0.12)",
                padding: "10px 12px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
                minWidth: 110,
              }}
              title="Supprime l'historique TERRITORIES local"
            >
              {t("generic.clear", "Effacer")}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(246,194,86,.9)",
              boxShadow:
                "0 0 0 1px rgba(246,194,86,.35), 0 0 14px rgba(246,194,86,.7)",
            }}
          >
            <div style={kpiLabel}>{t("stats.matches", "Parties")}</div>
            <div style={{ ...kpiValueMain, color: T.gold }}>{total}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {uniqueMaps} {t("territories.maps", "maps")} • {last7} {t("stats.last7", "7j")}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(71,181,255,.6)",
              boxShadow:
                "0 0 0 1px rgba(71,181,255,.16), 0 0 12px rgba(71,181,255,.55)",
            }}
          >
            <div style={kpiLabel}>{t("territories.domWinner", "Domination (winner)")}</div>
            <div style={{ ...kpiValueMain, color: "#47B5FF" }}>{avgDomWinner}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.marginAvg", "Écart moyen")}: {avgMargin}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,184,222,.6)",
              boxShadow:
                "0 0 0 1px rgba(255,184,222,.16), 0 0 12px rgba(255,184,222,.55)",
            }}
          >
            <div style={kpiLabel}>{t("territories.roundsAvg", "Tours (moy.)")}</div>
            <div style={{ ...kpiValueMain, color: "#FFB8DE" }}>{avgRounds}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.objective", "Objectif")}: {items[0]?.objective ?? "—"}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(124,255,154,.6)",
              boxShadow:
                "0 0 0 1px rgba(124,255,154,.16), 0 0 12px rgba(124,255,154,.55)",
            }}
          >
            <div style={kpiLabel}>{t("territories.captures", "Captures")}</div>
            <div style={{ ...kpiValueMain, color: "#7CFF9A" }}>{avgCaptures}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.capturesPerRound", "Captures / tour")}: {avgCapturesPerRound}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,221,120,.55)",
              boxShadow:
                "0 0 0 1px rgba(255,221,120,.14), 0 0 12px rgba(255,221,120,.45)",
            }}
          >
            <div style={kpiLabel}>{t("territories.modes", "Modes")}</div>
            <div style={{ ...kpiValueMain, color: T.gold }}>
              {breakdown.solo} / {breakdown.teams}
            </div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.soloTeams", "Solo / Teams")}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,255,255,.12)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,.10), 0 0 12px rgba(255,255,255,.20)",
            }}
          >
            <div style={kpiLabel}>{t("territories.darts", "Darts")}</div>
            <div style={{ ...kpiValueMain, color: "#EAEAEA" }}>{breakdown.avgDarts}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.dartsTotal", "Total")}: {breakdown.totalDarts}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,120,190,.45)",
              boxShadow:
                "0 0 0 1px rgba(255,120,190,.12), 0 0 12px rgba(255,120,190,.35)",
            }}
          >
            <div style={kpiLabel}>{t("territories.steals", "Steals")}</div>
            <div style={{ ...kpiValueMain, color: "#FF78BE" }}>{breakdown.avgSteals}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.lost", "Lost")}: {breakdown.avgLost} • {t("territories.avg", "moy.")}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(71,181,255,.35)",
              boxShadow:
                "0 0 0 1px rgba(71,181,255,.10), 0 0 12px rgba(71,181,255,.30)",
            }}
          >
            <div style={kpiLabel}>{t("territories.duration", "Durée")}</div>
            <div style={{ ...kpiValueMain, color: "#47B5FF" }}>
              {breakdown.avgDurationMin}
            </div>
            <div style={{ fontSize: 11, color: T.text70 }}>{t("territories.minutesAvg", "minutes (moy.)")}</div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(246,194,86,.35)",
              boxShadow:
                "0 0 0 1px rgba(246,194,86,.10), 0 0 12px rgba(246,194,86,.28)",
            }}
          >
            <div style={kpiLabel}>{t("territories.victory", "Victoire")}</div>
            <div style={{ ...kpiValueMain, color: T.gold }}>
              {breakdown.topVictory ? String(breakdown.topVictory).toUpperCase() : "—"}
            </div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.objective", "Objectif")}: {breakdown.topObjective ?? "—"}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,255,255,.18)",
              boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 0 12px rgba(255,255,255,.12)",
            }}
          >
            <div style={kpiLabel}>{t("territories.dartsAvg", "Darts (moy.)")}</div>
            <div style={{ ...kpiValueMain, color: T.text }}>{breakdown.avgDarts}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.totalDarts", "Total")}: {breakdown.totalDarts}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,210,120,.35)",
              boxShadow: "0 0 0 1px rgba(255,210,120,.12), 0 0 12px rgba(255,210,120,.22)",
            }}
          >
            <div style={kpiLabel}>{t("territories.stealsAvg", "Steals (moy.)")}</div>
            <div style={{ ...kpiValueMain, color: T.gold }}>{breakdown.avgSteals}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.totalSteals", "Total")}: {breakdown.totalSteals}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(255,90,90,.35)",
              boxShadow: "0 0 0 1px rgba(255,90,90,.12), 0 0 12px rgba(255,90,90,.22)",
            }}
          >
            <div style={kpiLabel}>{t("territories.lostAvg", "Lost (moy.)")}</div>
            <div style={{ ...kpiValueMain, color: "#FF5A5A" }}>{breakdown.avgLost}</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.totalLost", "Total")}: {breakdown.totalLost}
            </div>
          </div>

          <div
            style={{
              ...kpiBox,
              borderColor: "rgba(180,170,255,.35)",
              boxShadow: "0 0 0 1px rgba(180,170,255,.12), 0 0 12px rgba(180,170,255,.22)",
            }}
          >
            <div style={kpiLabel}>{t("territories.durationAvg", "Durée (moy.)")}</div>
            <div style={{ ...kpiValueMain, color: "#B4AAFF" }}>{breakdown.avgDurationMin}m</div>
            <div style={{ fontSize: 11, color: T.text70 }}>
              {t("territories.roundsPerMin", "Tours/min")}: {breakdown.avgDurationMin > 0 ? Math.round((avgRounds / breakdown.avgDurationMin) * 10) / 10 : 0}
            </div>
          </div>
        </div>


        {/* MINI-GRAPHES */}
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ ...goldNeon, fontSize: 13, marginBottom: 10 }}>
            {t("territories.minigraphs", "Mini-graphes")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <SparkBars
              title={t("territories.trendCaptures", "Captures (12 derniers)")}
              values={breakdown.lastCaptures}
              maxValue={breakdown.maxLastCaptures}
              theme={T}
            />
            <SparkBars
              title={t("territories.trendDom", "Domination winner (12 derniers)")}
              values={breakdown.lastDom}
              maxValue={breakdown.maxLastDom}
              theme={T}
            />
            <SparkBars
              title={t("territories.trendRounds", "Tours (12 derniers)")}
              values={breakdown.lastRounds}
              maxValue={breakdown.maxLastRounds}
              theme={T}
            />
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <MiniBar
              label={t("territories.captPerDart", "Captures / dart")}
              value={capturesPerDart}
              valueLabel={String(capturesPerDart)}
              max={1}
              theme={T}
              accent="#6AE3FF"
            />
            <MiniBar
              label={t("territories.dartsPerCapt", "Darts / capture")}
              value={dartsPerCapture}
              valueLabel={`${dartsPerCapture}`}
              max={Math.max(1, dartsPerCapture * 2)}
              theme={T}
              accent="#FFD36A"
            />
            <MiniBar
              label={t("territories.captPerMin", "Captures / min")}
              value={capturesPerMin}
              valueLabel={`${capturesPerMin}`}
              max={Math.max(1, capturesPerMin * 2)}
              theme={T}
              accent="#44FF88"
            />
            <MiniBar
              label={t("territories.stealsPerMin", "Steals / min")}
              value={stealsPerMin}
              valueLabel={`${stealsPerMin}`}
              max={Math.max(1, stealsPerMin * 2)}
              theme={T}
              accent="#B4AAFF"
            />
            <MiniBar
              label={t("territories.lostPerMin", "Lost / min")}
              value={lostPerMin}
              valueLabel={`${lostPerMin}`}
              max={Math.max(1, lostPerMin * 2)}
              theme={T}
              accent="#FF6A6A"
            />
          </div>
        </div>

        {/* TOP MAPS */}
        <div style={card}>
          <div style={{ ...goldNeon, fontSize: 13, marginBottom: 10 }}>
            {t("territories.topMaps", "Maps les plus jouées")}
          </div>

          {byMap.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {byMap.slice(0, 8).map(([mapId, count]) => {
                const name = TERRITORY_MAPS[mapId]?.name || mapId;
                const ratio = total > 0 ? clamp01(count / total) : 0;
                return (
                  <div key={mapId} style={row}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 1000, color: "#ddd" }}>{name}</div>
                      <div style={{ fontSize: 11, color: T.text70 }}>
                        {t("stats.share", "Part")}: {Math.round(ratio * 100)}%
                      </div>
                    </div>
                    <div style={{ fontWeight: 1000, color: T.gold }}>{count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.text70 }}>
              {t("stats.empty", "Aucune partie enregistrée.")}
            </div>
          )}
        </div>

        {/* RECORDS */}
        <div style={card}>
          <div style={{ ...goldNeon, fontSize: 13, marginBottom: 10 }}>
            {t("stats.records", "Records")}
          </div>

          {items.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.bestDom", "Meilleure domination (winner)")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {records.bestGame ? `${TERRITORY_MAPS[records.bestGame.mapId]?.name || records.bestGame.mapId} • ${fmtDate(n((records.bestGame as any).ts ?? (records.bestGame as any).when))}` : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#47B5FF" }}>
                  {records.bestGame ? n(records.bestGame.domination?.[n(records.bestGame.winnerTeam)] ?? 0) : 0}
                </div>
              </div>

              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.bestCaptures", "Meilleures captures (winner)")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {records.bestCaptures ? `${TERRITORY_MAPS[records.bestCaptures.mapId]?.name || records.bestCaptures.mapId} • ${fmtDate(n((records.bestCaptures as any).ts ?? (records.bestCaptures as any).when))}` : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#7CFF9A" }}>
                  {records.bestCaptures ? n(records.bestCaptures.captured?.[n(records.bestCaptures.winnerTeam)] ?? 0) : 0}
                </div>
              </div>

              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.bestSteals", "Meilleurs steals")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {records.bestSteals ? `${TERRITORY_MAPS[records.bestSteals.mapId]?.name || records.bestSteals.mapId} • ${fmtDate(n((records.bestSteals as any).ts ?? (records.bestSteals as any).when))}` : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#FF78BE" }}>
                  {records.bestSteals ? n((records.bestSteals as any).steals ?? 0) : 0}
                </div>
              </div>

              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.bestEfficiency", "Meilleure efficacité (cap/dart)")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {records.bestEfficiency ? `${TERRITORY_MAPS[records.bestEfficiency.mapId]?.name || records.bestEfficiency.mapId} • ${fmtDate(n((records.bestEfficiency as any).ts ?? (records.bestEfficiency as any).when))}` : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: T.gold }}>
                  {records.bestEfficiency ? Math.round(n((records.bestEfficiency as any).capturesPerDart) * 1000) / 1000 : 0}
                </div>
              </div>

              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.longest", "Partie la plus longue")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {records.longest ? `${TERRITORY_MAPS[records.longest.mapId]?.name || records.longest.mapId} • ${fmtDate(n((records.longest as any).ts ?? (records.longest as any).when))}` : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#47B5FF" }}>
                  {records.longest ? Math.round(n((records.longest as any).durationMs) / 60000) : 0}m
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.text70 }}>
              {t("stats.empty", "Aucune partie enregistrée.")}
            </div>
          )}
        </div>

        {/* HISTORY */}
        <div style={card}>
          <div style={{ ...goldNeon, fontSize: 13, marginBottom: 10 }}>
            {t("stats.history", "Historique")}
          </div>

          {items.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.slice(0, 25).map((it) => {
                const mapName = TERRITORY_MAPS[it.mapId]?.name || it.mapId;
                const dom = Array.isArray(it.domination) ? it.domination.map(n) : [];
                const cap = Array.isArray(it.captured) ? it.captured.map(n) : [];
                const w = n(it.winnerTeam);
                const wDom = n(dom[w] ?? 0);
                const wCap = n(cap[w] ?? 0);
                const totalCap = cap.reduce((a, b) => a + n(b), 0);
                const share = totalCap > 0 ? Math.round((wCap / totalCap) * 1000) / 10 : 0;
                const modeLabel = (it.mode || "solo") === "teams" ? t("common.teams", "Teams") : t("common.solo", "Solo");

                return (
                  <div key={it.id} style={row}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 1000, color: "#ddd" }}>{mapName}</div>
                        <div style={{ fontSize: 11, color: T.text70 }}>{fmtDate(n((it as any).ts ?? (it as any).when))}</div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 1000,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.25)",
                            color: "#ddd",
                          }}
                        >
                          {modeLabel}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 1000,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,215,0,0.22)",
                            background: "rgba(255,215,0,0.08)",
                            color: T.gold,
                          }}
                        >
                          {t("territories.objective", "Obj")}: {n(it.objective)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: T.text70, marginTop: 2 }}>
                        {t("territories.rounds", "Tours")}: {n(it.rounds)} • {t("territories.domination", "Dom")}: {wDom} • {t("territories.captures", "Cap")}: {wCap} ({share}%)
                        {Number.isFinite(n(it.darts)) ? ` • ${t("territories.darts", "Darts")}: ${n(it.darts)}` : ""}
                        {Number.isFinite(n(it.steals)) ? ` • ${t("territories.steals", "Steals")}: ${n(it.steals)}` : ""}
                      </div>
                    </div>
                    <div style={{ fontWeight: 1000, color: T.gold }}>{wDom}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.text70, textAlign: "center" }}>
              {t(
                "territories.noData",
                "Aucune partie enregistrée — lance une partie Territories et tes stats apparaîtront ici."
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function MiniBar({
  label,
  value,
  valueLabel,
  max,
  theme,
  accent,
}: {
  label: string;
  value: number;
  valueLabel: string;
  max: number;
  theme: any;
  accent: string;
}) {
  const pct =
    max > 0 ? Math.max(0, Math.min(1, Number(value ?? 0) / Number(max))) : 0;

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: theme.text70, fontWeight: 900 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: accent, fontWeight: 900 }}>
          {valueLabel}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: 999,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(pct * 100)}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}55, ${accent})`,
          }}
        />
      </div>
    </div>
  );
}

function SparkBars({
  title,
  values,
  maxValue,
  theme,
}: {
  title: string;
  values: number[];
  maxValue: number;
  theme: any;
}) {
  const v = Array.isArray(values) ? values : [];
  const max = Math.max(1, Number(maxValue ?? 1));

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ fontSize: 12, color: theme.text70, fontWeight: 900 }}>
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 4,
          alignItems: "flex-end",
          height: 42,
        }}
      >
        {v.length ? (
          v
            .slice()
            .reverse()
            .map((n, idx) => {
              const h = Math.max(2, Math.round((Number(n ?? 0) / max) * 40));
              return (
                <div
                  key={idx}
                  title={String(n ?? 0)}
                  style={{
                    width: 10,
                    height: h,
                    borderRadius: 8,
                    background: "rgba(255,215,0,0.35)",
                    border: "1px solid rgba(255,215,0,0.35)",
                    boxShadow: "0 0 10px rgba(255,215,0,0.12)",
                  }}
                />
              );
            })
        ) : (
          <div style={{ fontSize: 12, color: theme.text60 }}>—</div>
        )}
      </div>
    </div>
  );
}
