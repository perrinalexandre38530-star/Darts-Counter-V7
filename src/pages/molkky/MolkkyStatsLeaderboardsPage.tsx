// @ts-nocheck
// =============================================================
// src/pages/molkky/MolkkyStatsLeaderboardsPage.tsx
// ✅ Objectif: VISUEL identique à src/pages/StatsLeaderboardsPage.tsx (Darts)
// ✅ Données: Mölkky (localStorage dc_molkky_history_v1 via lib/molkkyStore)
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import { loadMolkkyMatches } from "../../lib/molkkyStore";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ALL" | "TOUT";
type MetricKey = "matches" | "wins" | "winRate" | "avgPts" | "avgTurns" | "exact50" | "over50" | "bestStreak";

type Row = {
  id: string;
  name: string;
  avatar?: string | null;
  matches: number;
  wins: number;
  winRate: number;
  avgPts: number;
  avgTurns: number;
  exact50: number;
  over50: number;
  bestStreak: number;
};

function periodStart(period: PeriodKey): number {
  const now = new Date();
  const d = new Date(now);
  if (period === "TOUT") return 0;
  if (period === "ALL") return 0;
  if (period === "J") {
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "S") {
    const day = (d.getDay() + 6) % 7; // monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "M") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "A") {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return 0;
}

function metricLabel(k: MetricKey) {
  switch (k) {
    case "matches":
      return "MATCHS JOUÉS";
    case "wins":
      return "VICTOIRES";
    case "winRate":
      return "WINRATE";
    case "avgPts":
      return "MOY. (PTS/LANCER)";
    case "avgTurns":
      return "TOURS (MOY.)";
    case "exact50":
      return "EXACT 50";
    case "over50":
      return "OVER 50";
    case "bestStreak":
      return "BEST STREAK";
    default:
      return k;
  }
}

function metricValue(r: Row, k: MetricKey): number {
  return Number((r as any)[k] ?? 0) || 0;
}

function formatMetric(k: MetricKey, v: number): string {
  if (k === "winRate") return `${Math.round(v)} %`;
  if (k === "avgPts" || k === "avgTurns") return `${Math.round(v * 10) / 10}`;
  return `${Math.round(v)}`;
}

export default function MolkkyStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const langAny: any = useLang();
  const t = React.useCallback(
    (key: string, fallback: string) => {
      const fn = langAny?.t;
      if (typeof fn === "function") {
        const v = fn(key, fallback);
        return !v || v === key ? fallback : v;
      }
      return fallback ?? key;
    },
    [langAny]
  );

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const profileById = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of profiles || []) m[String(p.id)] = p;
    return m;
  }, [profiles]);

  const [scope, setScope] = React.useState<"local" | "online">("local"); // online placeholder (visuel)
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");
  const [includeBots, setIncludeBots] = React.useState<boolean>(true); // placeholder (visuel)
  const [metric, setMetric] = React.useState<MetricKey>("matches");

  const metricList: MetricKey[] = React.useMemo(
    () => ["matches", "wins", "winRate", "avgPts", "avgTurns", "exact50", "over50", "bestStreak"],
    []
  );

  const currentMetricIndex = Math.max(0, metricList.findIndex((m) => m === metric));
  const cycleMetric = (dir: "prev" | "next") => {
    const len = metricList.length;
    const idx = currentMetricIndex < 0 ? 0 : currentMetricIndex;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMetric(metricList[newIndex]);
  };

  const rows: Row[] = React.useMemo(() => {
    const matches = (loadMolkkyMatches() as any[]) || [];
    const start = periodStart(period);
    const filtered = matches.filter((m) => {
      const ts = new Date(m?.date || Date.now()).getTime();
      return ts >= start;
    });

    // aggregate
    const agg: Record<string, any> = {};
    for (const m of filtered) {
      const players = Array.isArray(m?.players) ? m.players : [];
      for (const ps of players) {
        const pid = String(ps?.playerId || "");
        if (!pid) continue;
        if (!agg[pid]) {
          const prof = profileById[pid] || {};
          agg[pid] = {
            id: pid,
            name: prof?.name || pid,
            avatar: prof?.avatarDataUrl || prof?.avatar || null,
            matches: 0,
            wins: 0,
            throws: 0,
            totalPoints: 0,
            turnsSum: 0,
            turnsCount: 0,
            exact50: 0,
            over50: 0,
            bestStreak: 0,
          };
        }
        const a = agg[pid];
        a.matches += 1;
        if (String(m?.winnerId || "") === pid) a.wins += 1;
        a.throws += Number(ps?.throws || 0) || 0;
        a.totalPoints += Number(ps?.totalPoints || 0) || 0;
        a.exact50 += Number(ps?.exactHits || 0) || 0;
        a.over50 += Number(ps?.over50 || 0) || 0;
        a.bestStreak = Math.max(a.bestStreak, Number(ps?.bestStreak || 0) || 0);
      }

      // turns (si dispo dans le payload futur) -> fallback 0
      const turns = Number(m?.turns || m?.summary?.turns || 0) || 0;
      if (turns > 0) {
        for (const ps of (m.players || [])) {
          const pid = String(ps?.playerId || "");
          if (agg[pid]) {
            agg[pid].turnsSum += turns;
            agg[pid].turnsCount += 1;
          }
        }
      }
    }

    const out: Row[] = Object.values(agg).map((a: any) => {
      const avgPts = a.throws ? a.totalPoints / a.throws : 0;
      const avgTurns = a.turnsCount ? a.turnsSum / a.turnsCount : 0;
      const winRate = a.matches ? (a.wins / a.matches) * 100 : 0;
      return {
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        matches: a.matches,
        wins: a.wins,
        winRate,
        avgPts,
        avgTurns,
        exact50: a.exact50,
        over50: a.over50,
        bestStreak: a.bestStreak,
      };
    });

    out.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
    return out;
  }, [period, metric, profileById, includeBots]);

  const T = theme;
  const accent = T.accent || T.gold || "#c8ff00";

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(1200px 900px at 50% -30%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%), linear-gradient(180deg, #050506, #07070a 55%, #050506)",
    color: "#fff",
    padding: 12,
    paddingBottom: 86,
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  };

  const title: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: accent,
    textShadow: `0 0 10px ${accent}, 0 0 22px ${accent}`,
  };

  const card: React.CSSProperties = {
    borderRadius: 22,
    border: `1px solid rgba(255,255,255,.08)`,
    background: "linear-gradient(180deg, rgba(18,18,22,.98), rgba(9,9,12,.96))",
    boxShadow: `0 0 0 1px rgba(255,255,255,.06), 0 10px 26px rgba(0,0,0,.55)`,
    padding: 10,
  };

  const pillRow: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", justifyContent: "center" };

  const bigPill = (active: boolean): React.CSSProperties => ({
    flex: 1,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.08)"}`,
    background: active
      ? `linear-gradient(180deg, ${accent} 0%, rgba(0,0,0,.35) 85%)`
      : "rgba(0,0,0,.35)",
    color: active ? "#101010" : "rgba(255,255,255,.65)",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  });

  const tinyPill: React.CSSProperties = {
    width: "100%",
    height: 30,
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,.10)`,
    background: "rgba(0,0,0,.35)",
    color: "rgba(255,255,255,.9)",
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const arrowBtn = (disabled: boolean): React.CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,.12)`,
    background: disabled ? "rgba(0,0,0,.45)" : `radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), transparent 60%)`,
    color: disabled ? "rgba(255,255,255,.25)" : accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  });

  const periodBtn = (active: boolean): React.CSSProperties => ({
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.08)"}`,
    background: active ? `rgba(0,0,0,.55)` : `rgba(0,0,0,.35)`,
    color: active ? accent : "rgba(255,255,255,.70)",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  });

  return (
    <div style={pageWrap}>
      {!embedded && (
        <div style={topRow}>
          <BackDot onClick={() => go("molkky_stats")} />
          <div style={title}>{t("leaderboards.title", "CLASSEMENTS")}</div>
          <InfoDot
            onClick={() =>
              alert("Classements Mölkky (local)\n\nVisuel calqué sur Darts. Filtres période + tri par métrique.")
            }
          />
        </div>
      )}

      <div style={{ ...card, padding: 12, marginBottom: 10 }}>
        <div style={pillRow}>
          <button type="button" onClick={() => setScope("local")} style={bigPill(scope === "local")}>
            LOCAL
          </button>
          <button type="button" onClick={() => setScope("online")} style={bigPill(scope === "online")}>
            ONLINE
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setIncludeBots((v) => !v)}
            style={{
              ...tinyPill,
              width: "100%",
              background: includeBots ? `linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.35))` : "rgba(0,0,0,.35)",
              color: includeBots ? "#fff" : "rgba(255,255,255,.75)",
            }}
          >
            BOTS : {includeBots ? "ON" : "OFF"}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" style={arrowBtn(true)} disabled>
            {"<"}
          </button>
          <div style={{ flex: 1, ...tinyPill }}>MÖLKKY</div>
          <button type="button" style={arrowBtn(true)} disabled>
            {">"}
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: 1.2, color: "rgba(255,255,255,.75)", marginBottom: 8 }}>
          {t("leaderboards.period", "PÉRIODE")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {(["J", "S", "M", "A", "ALL", "TOUT"] as PeriodKey[]).map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={periodBtn(period === p)}>
              {p === "ALL" ? "All" : p === "TOUT" ? "Tout" : p}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, letterSpacing: 1.2, color: "rgba(255,255,255,.75)" }}>
          {t("leaderboards.sortBy", "CLASSEMENT PAR")}
        </div>

        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => cycleMetric("prev")} style={arrowBtn(false)}>
            {"<"}
          </button>
          <div style={{ flex: 1, ...tinyPill }}>{metricLabel(metric)}</div>
          <button type="button" onClick={() => cycleMetric("next")} style={arrowBtn(false)}>
            {">"}
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: 10 }}>
        {rows.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,.65)", padding: 12 }}>{t("leaderboards.none", "Aucune donnée.")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, idx) => {
              const v = metricValue(r, metric);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(0,0,0,.28)",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: accent,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ width: 34, height: 34, borderRadius: 999, overflow: "hidden" }}>
                    <ProfileAvatar size={34} name={r.name} avatar={r.avatar || undefined} />
                  </div>

                  <div style={{ flex: 1, fontWeight: 900 }}>{r.name}</div>

                  <div style={{ fontWeight: 900, color: accent }}>{formatMetric(metric, v)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scope === "online" && (
        <div style={{ marginTop: 10, color: "rgba(255,255,255,.55)", textAlign: "center" }}>
          Online : bientôt.
        </div>
      )}
    </div>
  );
}
