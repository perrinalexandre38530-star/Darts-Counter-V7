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
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
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

  const last7 = React.useMemo(() => {
    const now = Date.now();
    const d7 = 7 * 24 * 3600 * 1000;
    return items.filter((it) => now - n(it.when) <= d7).length;
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

          {bestGame ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={row}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: "#ddd" }}>
                    {t("territories.bestDom", "Meilleure domination (winner)")}
                  </div>
                  <div style={{ fontSize: 11, color: T.text70 }}>
                    {TERRITORY_MAPS[bestGame.mapId]?.name || bestGame.mapId} • {fmtDate(bestGame.when)}
                  </div>
                </div>
                <div style={{ fontWeight: 1000, color: "#47B5FF" }}>
                  {n(bestGame.domination?.[n(bestGame.winnerTeam)] ?? 0)}
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
                        <div style={{ fontSize: 11, color: T.text70 }}>{fmtDate(it.when)}</div>
                      </div>
                      <div style={{ fontSize: 11, color: T.text70, marginTop: 2 }}>
                        {t("territories.rounds", "Tours")}: {n(it.rounds)} • {t("territories.domination", "Dom")}: {wDom} • {t("territories.captures", "Cap")}: {wCap} ({share}%)
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
