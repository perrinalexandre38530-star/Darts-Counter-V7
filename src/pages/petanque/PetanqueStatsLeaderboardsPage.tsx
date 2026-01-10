// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueStatsLeaderboardsPage.tsx
// Classements Pétanque (simple)
// - Metrics: wins | winRate | diff | matches
// - UI "leaderboards" style Darts (pills + rows)
// =============================================================

import React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  PeriodKey,
  cleanName,
  getScoreAB,
  getTeams,
  inPeriod,
  isPetanqueRec,
  numOr0,
  pickAvatar,
} from "./petanqueStatsUtils";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type Metric = "wins" | "winRate" | "diff" | "matches";

function Pill({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${active ? "rgba(255,215,60,.42)" : "rgba(255,255,255,.10)"}`,
        background: active ? "rgba(255,215,60,.14)" : "rgba(255,255,255,.06)",
        color: active ? "#ffd73c" : "rgba(255,255,255,.85)",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.8,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  diff: number;
};

export default function PetanqueStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [period, setPeriod] = React.useState<PeriodKey>("ALL");
  const [metric, setMetric] = React.useState<Metric>("wins");

  const profiles = (store?.profiles || []) as any[];

  const all = React.useMemo(() => {
    const list = (store?.history || []) as any[];
    return list.filter((r) => isPetanqueRec(r)).filter((r) => inPeriod(r, period));
  }, [store?.history, period]);

  const rows = React.useMemo(() => {
    const map = new Map<string, Row>();

    const ensure = (id: string, seed?: any) => {
      const pid = String(id || "");
      if (!pid) return null;
      if (!map.has(pid)) {
        const prof = profiles.find((p) => String(p?.id) === pid) || null;
        map.set(pid, {
          id: pid,
          name: cleanName(seed?.name) || cleanName(prof?.name) || "Joueur",
          avatarDataUrl: pickAvatar(seed) || pickAvatar(prof) || null,
          wins: 0,
          losses: 0,
          matches: 0,
          winRate: 0,
          diff: 0,
        });
      }
      return map.get(pid)!;
    };

    for (const rec of all) {
      const { mode, teamA, teamB, ffa } = getTeams(rec);
      const { scoreA, scoreB } = getScoreAB(rec);

      if (mode !== "teams") {
        // FFA : matches only
        for (const p of (ffa || [])) {
          const id = String(p?.id ?? p?.profileId ?? "");
          const row = ensure(id, p);
          if (!row) continue;
          row.matches += 1;
        }
        continue;
      }

      const winner = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";

      for (const p of teamA || []) {
        const id = String(p?.id ?? p?.profileId ?? "");
        const row = ensure(id, p);
        if (!row) continue;
        row.matches += 1;
        row.diff += numOr0(scoreA) - numOr0(scoreB);
        if (winner === "A") row.wins += 1;
        if (winner === "B") row.losses += 1;
      }

      for (const p of teamB || []) {
        const id = String(p?.id ?? p?.profileId ?? "");
        const row = ensure(id, p);
        if (!row) continue;
        row.matches += 1;
        row.diff += numOr0(scoreB) - numOr0(scoreA);
        if (winner === "B") row.wins += 1;
        if (winner === "A") row.losses += 1;
      }
    }

    const out = Array.from(map.values()).map((r) => {
      r.winRate = r.matches ? Math.round((r.wins / r.matches) * 100) : 0;
      return r;
    });

    const cmp = (a: Row, b: Row) => {
      if (metric === "wins") return (b.wins - a.wins) || (b.diff - a.diff) || (b.matches - a.matches);
      if (metric === "winRate") return (b.winRate - a.winRate) || (b.wins - a.wins) || (b.matches - a.matches);
      if (metric === "diff") return (b.diff - a.diff) || (b.wins - a.wins) || (b.matches - a.matches);
      if (metric === "matches") return (b.matches - a.matches) || (b.wins - a.wins) || (b.diff - a.diff);
      return 0;
    };

    out.sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
    return out;
  }, [all, profiles, metric]);

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("stats")} style={{ marginBottom: 10 }}>
        ← Retour
      </button>

      <div
        style={{
          fontSize: 26,
          fontWeight: 950,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#ffd73c",
          textShadow: "0 0 18px rgba(255,215,60,.22)",
          lineHeight: 1.05,
        }}
      >
        CLASSEMENTS (PÉTANQUE)
      </div>
      <div style={{ marginTop: 6, opacity: 0.85, color: theme.textSoft, fontSize: 12 }}>
        {t("petanque.stats.rank.hint", "Classements simples Pétanque (moins de métriques que Fléchettes).")}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {(["D", "W", "M", "Y", "ALL"] as any[]).map((k) => (
          <Pill key={k} active={period === k} onClick={() => setPeriod(k)}>
            {k === "ALL" ? "TOUT" : k}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Pill active={metric === "wins"} onClick={() => setMetric("wins")}>
          WINS
        </Pill>
        <Pill active={metric === "winRate"} onClick={() => setMetric("winRate")}>
          WINRATE
        </Pill>
        <Pill active={metric === "diff"} onClick={() => setMetric("diff")}>
          DIFF
        </Pill>
        <Pill active={metric === "matches"} onClick={() => setMetric("matches")}>
          MATCHS
        </Pill>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {rows.length ? (
          rows.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => go("petanque_stats_matches", { playerId: r.id })}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 14,
                padding: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.06)",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "32px 44px 1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 950, color: "#ffd73c" }}>{idx + 1}</div>
              <ProfileAvatar size={44} url={r.avatarDataUrl} name={r.name} />
              <div>
                <div style={{ fontWeight: 950 }}>{r.name}</div>
                <div style={{ opacity: 0.78, fontSize: 12 }}>
                  {r.matches} matchs · {r.wins}W/{r.losses}L · {r.winRate}%
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 950, color: "#fff" }}>
                  {metric === "wins" ? r.wins : metric === "winRate" ? `${r.winRate}%` : metric === "diff" ? (r.diff >= 0 ? `+${r.diff}` : `${r.diff}`) : r.matches}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  diff: {r.diff >= 0 ? `+${r.diff}` : `${r.diff}`}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div
            style={{
              background: "rgba(15,15,18,.55)",
              border: "1px solid rgba(255, 215, 60, .18)",
              borderRadius: 14,
              padding: 12,
              boxShadow: "0 0 18px rgba(255, 215, 60, .10)",
            }}
          >
            <div style={{ fontWeight: 900 }}>Aucune donnée Pétanque sur cette période.</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Joue quelques matchs puis reviens ici.</div>
          </div>
        )}
      </div>
    </div>
  );
}