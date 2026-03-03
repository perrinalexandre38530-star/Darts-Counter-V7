// @ts-nocheck
// ============================================
// src/pages/dice/DiceStatsLeaderboardsPage.tsx
// ✅ UI calquée sur PetanqueStatsLeaderboardsPage (style Darts)
// ✅ Classements Dice basés sur l’historique
// ============================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import type { Store } from "../../lib/types";
import { getDiceMatches, aggregatePlayers } from "../../lib/diceStats";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type Metric =
  | "wins"
  | "winRate"
  | "avgPts"
  | "avgTurns"
  | "exact50"
  | "over50";

const METRICS: { key: Metric; label: string; suffix?: string }[] = [
  { key: "wins", label: "Victoires" },
  { key: "winRate", label: "Winrate", suffix: "%" },
  { key: "avgPts", label: "Moy. (pts/lancer)" },
  { key: "avgTurns", label: "Tours (moy.)" },
  { key: "exact50", label: "Exact 50" },
  { key: "over50", label: "Over 50" },
];

function fmt(v: any, metric: Metric) {
  if (metric === "winRate") return (Number(v || 0) * 100).toFixed(0);
  if (metric === "avgPts" || metric === "avgTurns") return Number(v || 0).toFixed(1);
  return String(v ?? 0);
}

export default function DiceStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const allHistory = (store as any)?.history || [];
  const matches = useMemo(() => getDiceMatches(allHistory), [allHistory]);
  const players = useMemo(() => aggregatePlayers(matches), [matches]);

  const [metric, setMetric] = useState<Metric>("wins");

  const sorted = useMemo(() => {
    const arr = [...players];
    arr.sort((a, b) => {
      const av =
        metric === "avgPts"
          ? a.avgPtsPerThrow
          : metric === "avgTurns"
          ? a.avgTurns
          : metric === "winRate"
          ? a.winRate
          : metric === "exact50"
          ? a.exact50
          : metric === "over50"
          ? a.over50
          : a.wins;
      const bv =
        metric === "avgPts"
          ? b.avgPtsPerThrow
          : metric === "avgTurns"
          ? b.avgTurns
          : metric === "winRate"
          ? b.winRate
          : metric === "exact50"
          ? b.exact50
          : metric === "over50"
          ? b.over50
          : b.wins;
      return (bv || 0) - (av || 0);
    });
    return arr;
  }, [players, metric]);

  return (
    <div className="page" style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <div style={{ padding: 12, maxWidth: 560, margin: "0 auto", paddingBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BackDot onClick={() => go("dice_stats_shell")} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: theme.primary,
                textShadow: `0 0 14px ${theme.primary}66`,
                fontSize: 16,
              }}
            >
              {t("dice.leaderboards.title", "DICE — CLASSEMENTS")}
            </div>
            <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 2 }}>
              {t("dice.leaderboards.subtitle", "Classements globaux Dice (historique local).")}
            </div>
          </div>
          <InfoDot
            title={t("dice.leaderboards.infoTitle", "Classements")}
            lines={[t("dice.leaderboards.info", "Tri par métrique — même rendu que Darts, adapté Dice.")]}
          />
        </div>

        {/* Metric selector (Darts-like pill) */}
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {METRICS.map((m) => {
              const active = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  style={{
                    height: 32,
                    borderRadius: 999,
                    border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
                    padding: "0 12px",
                    background: active ? `${theme.primary}18` : "transparent",
                    color: active ? theme.primary : theme.textSoft,
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: active ? `0 0 12px ${theme.primary}22` : "none",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.length === 0 ? (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: theme.card,
                border: `1px solid ${theme.borderSoft}`,
                color: theme.textSoft,
              }}
            >
              {t("common.noData", "Aucune donnée.")}
            </div>
          ) : (
            sorted.map((p, idx) => {
              const val =
                metric === "avgPts"
                  ? p.avgPtsPerThrow
                  : metric === "avgTurns"
                  ? p.avgTurns
                  : metric === "winRate"
                  ? p.winRate
                  : metric === "exact50"
                  ? p.exact50
                  : metric === "over50"
                  ? p.over50
                  : p.wins;
              const suffix = METRICS.find((m) => m.key === metric)?.suffix || "";
              return (
                <div
                  key={p.name}
                  style={{
                    border: `1px solid ${theme.borderSoft}`,
                    background: theme.card,
                    borderRadius: 14,
                    padding: 12,
                    boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}12`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          border: `1px solid ${theme.borderSoft}`,
                          color: theme.textSoft,
                          fontWeight: 900,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <ProfileAvatar
                        size={36}
                        dataUrl={undefined}
                        label={(p.name || "?")[0]?.toUpperCase() || "?"}
                        showStars={false}
                      />
                      <div>
                        <div style={{ fontWeight: 900, color: theme.text }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 2 }}>
                          {t("dice.lb.line", "Victoires")}: {p.wins} • {t(
                            "dice.lb.matches",
                            "Matchs"
                          )}: {p.matches}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 950,
                          color: theme.primary,
                          textShadow: `0 0 14px ${theme.primary}55`,
                          fontSize: 18,
                          lineHeight: 1,
                        }}
                      >
                        {fmt(val, metric)}
                        {suffix}
                      </div>
                      <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 4 }}>
                        {METRICS.find((m) => m.key === metric)?.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
