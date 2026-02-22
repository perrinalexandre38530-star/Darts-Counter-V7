// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueStatsLeaderboardsPage.tsx
// CLASSEMENTS PÉTANQUE — UI calquée sur StatsLeaderboardsPage (Darts)
// - Modes: Joueurs / Équipes / Duos
// - Filtre période D/W/M/Y/ALL/TOUT
// - Stats: wins / winRate / matches / diff / pointsFor / pointsAgainst / ends
// - Source: localStorage via loadPetanqueHistory() (lib/petanqueStats)
// =============================================================

import * as React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";

import {
  aggregatePetanquePlayers,
  aggregatePetanqueTeams,
  computePetanqueDuos,
  formatPct,
  getPetanqueMatches,
  safeName,
} from "../../lib/petanqueStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: { subTab?: "players" | "teams" | "duos" };
};

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";
type SubTab = "players" | "teams" | "duos";

type MetricKey = "wins" | "winRate" | "matches" | "diff" | "pointsFor" | "pointsAgainst" | "ends";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "D", label: "J" },
  { id: "W", label: "S" },
  { id: "M", label: "M" },
  { id: "Y", label: "A" },
  { id: "ALL", label: "ALL" },
  { id: "TOUT", label: "TOUT" },
];

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "players", label: "JOUEURS" },
  { id: "teams", label: "ÉQUIPES" },
  { id: "duos", label: "DUOS" },
];

const METRICS: { id: MetricKey; label: string }[] = [
  { id: "wins", label: "Victoires" },
  { id: "winRate", label: "% Victoire" },
  { id: "matches", label: "Matchs" },
  { id: "diff", label: "Diff" },
  { id: "pointsFor", label: "Points +" },
  { id: "pointsAgainst", label: "Points -" },
  { id: "ends", label: "Mènes" },
];

function numOr0(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function periodCutoffMs(period: PeriodKey) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (period === "ALL" || period === "TOUT") return 0;
  if (period === "D") return now - day;
  if (period === "W") return now - 7 * day;

  const d = new Date();
  if (period === "M") {
    d.setMonth(d.getMonth() - 1);
    return d.getTime();
  }
  if (period === "Y") {
    d.setFullYear(d.getFullYear() - 1);
    return d.getTime();
  }
  return 0;
}

function getInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function PetanqueStatsLeaderboardsPage({ params }: Props) {
  const { theme } = useTheme();
  const langAny: any = useLang();

  // ✅ Fix "t is not a function" (même pattern que la page darts)
  const t = React.useCallback(
    (key: string, fallback: string) => {
      const fn = langAny?.t;
      if (typeof fn === "function") return fn(key, fallback);
      return fallback ?? key;
    },
    [langAny]
  );

  const [subTab, setSubTab] = React.useState<SubTab>(params?.subTab ?? "players");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");
  const [metric, setMetric] = React.useState<MetricKey>("wins");

  const matchesAll = React.useMemo(() => {
    try {
      return getPetanqueMatches() || [];
    } catch {
      return [];
    }
  }, []);

  const matches = React.useMemo(() => {
    const cutoff = periodCutoffMs(period);
    if (!cutoff) return matchesAll;
    return (matchesAll || []).filter((m: any) => numOr0(m?.when) >= cutoff);
  }, [matchesAll, period]);

  const rows = React.useMemo(() => {
    if (subTab === "players") {
      const agg = aggregatePetanquePlayers(matches) || [];
      const list = agg.map((p: any) => {
        const matchesN = numOr0(p.matches);
        const winsN = numOr0(p.wins);
        const winRate = matchesN > 0 ? (winsN / matchesN) * 100 : 0;

        return {
          kind: "player",
          id: p.id,
          label: safeName(p.name, "Joueur"),
          avatarDataUrl: p.avatarDataUrl ?? null,
          matches: matchesN,
          wins: winsN,
          losses: numOr0(p.losses),
          ties: numOr0(p.ties),
          pointsFor: numOr0(p.pointsFor),
          pointsAgainst: numOr0(p.pointsAgainst),
          diff: numOr0(p.diff),
          ends: numOr0(p.ends),
          winRate,
        };
      });

      return list;
    }

    if (subTab === "teams") {
      const agg = aggregatePetanqueTeams(matches) || [];
      const list = agg.map((trow: any, idx: number) => {
        const matchesN = numOr0(trow.games ?? trow.matches);
        const winsN = numOr0(trow.wins);
        const winRate = matchesN > 0 ? (winsN / matchesN) * 100 : 0;
        const label = safeName(trow.name, `Équipe ${idx + 1}`);
        return {
          kind: "team",
          id: String(trow.name ?? idx),
          label,
          avatarDataUrl: null,
          matches: matchesN,
          wins: winsN,
          losses: numOr0(trow.losses),
          ties: numOr0(trow.ties),
          pointsFor: numOr0(trow.pointsFor),
          pointsAgainst: numOr0(trow.pointsAgainst),
          diff: numOr0(trow.diff),
          ends: 0,
          winRate,
        };
      });

      return list;
    }

    // duos
    const duos = computePetanqueDuos(matches) || [];
    const list = duos.map((d: any) => {
      const matchesN = numOr0(d.matches);
      const winsN = numOr0(d.wins);
      const winRate = matchesN > 0 ? (winsN / matchesN) * 100 : 0;
      const label = `${safeName(d?.p1?.name, "J1")} + ${safeName(d?.p2?.name, "J2")}`;
      return {
        kind: "duo",
        id: d.key ?? label,
        label,
        avatarDataUrl: null,
        matches: matchesN,
        wins: winsN,
        losses: numOr0(d.losses),
        ties: numOr0(d.ties),
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        ends: 0,
        winRate,
      };
    });

    return list;
  }, [matches, subTab]);

  const sorted = React.useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    list.sort((a: any, b: any) => {
      const av =
        metric === "winRate" ? numOr0(a.winRate) :
        metric === "wins" ? numOr0(a.wins) :
        metric === "matches" ? numOr0(a.matches) :
        metric === "diff" ? numOr0(a.diff) :
        metric === "pointsFor" ? numOr0(a.pointsFor) :
        metric === "pointsAgainst" ? numOr0(a.pointsAgainst) :
        metric === "ends" ? numOr0(a.ends) :
        0;

      const bv =
        metric === "winRate" ? numOr0(b.winRate) :
        metric === "wins" ? numOr0(b.wins) :
        metric === "matches" ? numOr0(b.matches) :
        metric === "diff" ? numOr0(b.diff) :
        metric === "pointsFor" ? numOr0(b.pointsFor) :
        metric === "pointsAgainst" ? numOr0(b.pointsAgainst) :
        metric === "ends" ? numOr0(b.ends) :
        0;

      // desc
      if (bv !== av) return bv - av;

      // tie-break: matches desc, then label
      const bm = numOr0(b.matches);
      const am = numOr0(a.matches);
      if (bm !== am) return bm - am;

      return String(a.label).localeCompare(String(b.label));
    });
    return list;
  }, [rows, metric]);

  return (
    <div
      className="petanque-leaderboards-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        paddingTop: 20,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER (même esprit que StatsLeaderboardsPage darts) */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 10,
          padding: 14,
          borderRadius: 20,
          border: `1px solid ${theme.borderSoft}`,
          background: `linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))`,
          boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 8px 30px rgba(0,0,0,.35)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.6 }}>
              {t("petanque.leaderboards.title", "CLASSEMENTS")}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.3, color: theme.textSoft }}>
              {t("petanque.leaderboards.subtitle", "Classements Pétanque — Joueurs / Équipes / Duos.")}
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              color: theme.primary,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              boxShadow: `0 0 10px ${theme.primary}33`,
              background: "rgba(0,0,0,.35)",
            }}
          >
            PÉTANQUE
          </div>
        </div>
      </div>

      {/* CARD : MODE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 14,
          marginBottom: 10,
          border: `1px solid ${theme.borderSoft}`,
          background: `linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015))`,
          boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 8px 30px rgba(0,0,0,.35)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Subtabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {SUBTABS.map((m) => {
              const active = m.id === subTab;
              return (
                <button
                  key={m.id}
                  onClick={() => setSubTab(m.id)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    background: active ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "transparent",
                    color: active ? "#000" : theme.textSoft,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Period */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: theme.textSoft, width: 74 }}>
              {t("stats.leaderboards.period", "Période")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PERIODS.map((p) => {
                const active = p.id === period;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    style={{
                      borderRadius: 999,
                      border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      background: active ? `linear-gradient(135deg, ${theme.primary}cc, ${theme.primary}44)` : "transparent",
                      color: active ? theme.primary : theme.textSoft,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: theme.textSoft, width: 74 }}>
              {t("stats.leaderboards.metric", "Stat")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {METRICS.map((m) => {
                const active = m.id === metric;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetric(m.id)}
                    style={{
                      borderRadius: 999,
                      border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      padding: "5px 9px",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                      background: active ? `linear-gradient(135deg, ${theme.primary}cc, ${theme.primary}44)` : "transparent",
                      color: active ? theme.primary : theme.textSoft,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: `linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01))`,
          boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 8px 30px rgba(0,0,0,.35)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5 }}>
            {t("petanque.leaderboards.section", "Classement")}
          </div>
          <div style={{ fontSize: 10.5, color: theme.textSoft }}>
            {(sorted?.length ?? 0) === 0 ? "" : `${sorted.length} entrées`}
          </div>
        </div>

        {(sorted?.length ?? 0) === 0 ? (
          <div style={{ padding: 12, textAlign: "center", color: theme.textSoft, fontSize: 12 }}>
            {t("stats.leaderboards.empty", "Aucune donnée de classement.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((row: any, index: number) => {
              const rank = index + 1;

              let rankColor = theme.textSoft;
              if (rank === 1) rankColor = "#ffd700";
              else if (rank === 2) rankColor = "#c0c0c0";
              else if (rank === 3) rankColor = "#cd7f32";

              const rMatches = numOr0(row.matches);

              let metricValue = "0";
              let metricSub: string | null = null;

              switch (metric) {
                case "wins":
                  metricValue = `${numOr0(row.wins)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                case "winRate":
                  metricValue = `${numOr0(row.winRate).toFixed(1)}%`;
                  metricSub = `${numOr0(row.wins)}/${rMatches}`;
                  break;
                case "matches":
                  metricValue = `${rMatches}`;
                  metricSub = `${numOr0(row.wins)} win`;
                  break;
                case "diff":
                  metricValue = `${numOr0(row.diff)}`;
                  metricSub = `${numOr0(row.pointsFor)}-${numOr0(row.pointsAgainst)}`;
                  break;
                case "pointsFor":
                  metricValue = `${numOr0(row.pointsFor)}`;
                  metricSub = `${numOr0(row.diff)} diff`;
                  break;
                case "pointsAgainst":
                  metricValue = `${numOr0(row.pointsAgainst)}`;
                  metricSub = `${numOr0(row.diff)} diff`;
                  break;
                case "ends":
                  metricValue = `${numOr0(row.ends)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                default:
                  metricValue = `${numOr0(row.wins)}`;
                  metricSub = `${rMatches} matchs`;
              }

              const label = safeName(row.label, "—");
              const letter = getInitials(label);

              return (
                <div
                  key={`${row.kind}:${row.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 10px",
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.25)",
                    boxShadow: `0 0 10px ${theme.primary}11`,
                  }}
                >
                  {/* Rang */}
                  <div style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 13, color: rankColor }}>
                    {rank}
                  </div>

                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: `0 0 8px ${theme.primary}33`,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "#000",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.avatarDataUrl ? (
                        <img
                          src={row.avatarDataUrl}
                          alt={label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : (
                        <ProfileAvatar size={30} dataUrl={null} label={letter} showStars={false} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: theme.text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label}
                      </div>

                      {/* sub line */}
                      <div style={{ fontSize: 9.5, color: theme.textSoft, whiteSpace: "nowrap" }}>
                        {row.kind === "player" ? `${numOr0(row.wins)}W / ${numOr0(row.losses)}L / ${numOr0(row.ties)}N` :
                         row.kind === "team" ? `${numOr0(row.wins)}W / ${numOr0(row.losses)}L / ${numOr0(row.ties)}N` :
                         `${formatPct((numOr0(row.winRate) || 0) / 100)}`}
                      </div>
                    </div>
                  </div>

                  {/* Valeur */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 11 }}>
                    <div style={{ fontWeight: 800, color: theme.primary }}>{metricValue}</div>
                    <div style={{ fontSize: 9.5, color: theme.textSoft }}>{metricSub ?? `${rMatches} matchs`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
