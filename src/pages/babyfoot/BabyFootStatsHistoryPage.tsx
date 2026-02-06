// =============================================================
// src/pages/babyfoot/BabyFootStatsHistoryPage.tsx
// Baby-Foot — Historique + résumé (LOCAL)
// - Source: store.history (App.tsx pushBabyFootHistory)
// - ✅ Stats avancées: winrate, buts/match, penalties, séries
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function pillStyle(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
  };
}

function fmt(ms?: number) {
  const v = Math.max(0, Math.floor((ms || 0) / 1000));
  const mm = String(Math.floor(v / 60)).padStart(2, "0");
  const ss = String(v % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function safeNum(n: any, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}

type PlayerAgg = {
  id: string;
  name: string;
  played: number;
  wins: number;
  goals: number;
  goalsForTeam: number;
  pensScored: number;
  pensMissed: number;
  // series
  bestWinStreak: number;
  currentWinStreak: number;
};

export default function BabyFootStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const all = useMemo(() => {
    const list = (store?.history ?? []).filter((h: any) => h?.sport === "babyfoot" || h?.kind === "babyfoot");
    return list.sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
  }, [store?.history]);

  const agg = useMemo(() => {
    // per player aggregations
    const byId: Record<string, PlayerAgg> = {};
    const resultsByPlayer: Record<string, boolean[]> = {}; // chronological ASC array of wins/losses for streaks

    let matches = 0;
    let goals = 0;
    let totalDurationMs = 0;

    let pensScoredAll = 0;
    let pensMissedAll = 0;

    // helper: register player
    const ensure = (p: any) => {
      const id = p?.id;
      if (!id) return null;
      if (!byId[id]) {
        byId[id] = {
          id,
          name: p?.name || "",
          played: 0,
          wins: 0,
          goals: 0,
          goalsForTeam: 0,
          pensScored: 0,
          pensMissed: 0,
          bestWinStreak: 0,
          currentWinStreak: 0,
        };
      } else if (!byId[id].name && p?.name) {
        byId[id].name = p.name;
      }
      return byId[id];
    };

    // We need chronological for streaks
    const chrono = [...all].slice().sort((a: any, b: any) => (a?.createdAt || 0) - (b?.createdAt || 0));

    for (const h of chrono) {
      if (h?.status && h.status !== "finished") continue;

      const payload = h?.payload || {};
      const scoreA = safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0);
      const scoreB = safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0);
      const durationMs = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);

      matches += 1;
      goals += Math.max(0, scoreA) + Math.max(0, scoreB);
      totalDurationMs += Math.max(0, durationMs);

      const players = Array.isArray(h?.players)
        ? h.players
        : Array.isArray(payload?.players)
        ? payload.players
        : [];

      // build quick team membership (if present in payload)
      const teamAIds: string[] = Array.isArray(payload?.teamAProfileIds) ? payload.teamAProfileIds : [];
      const teamBIds: string[] = Array.isArray(payload?.teamBProfileIds) ? payload.teamBProfileIds : [];

      // count played
      for (const p of players) {
        const a = ensure(p);
        if (!a) continue;
        a.played += 1;
      }

      const winnerId = h?.winnerId ?? payload?.winnerId ?? null;
      const winnerTeam = payload?.winnerTeam ?? h?.winnerTeam ?? null;

      // mark win/loss sequence for streaks
      for (const p of players) {
        const id = p?.id;
        if (!id) continue;

        const won =
          winnerId === id ||
          (winnerTeam === "A" && teamAIds.includes(id)) ||
          (winnerTeam === "B" && teamBIds.includes(id));

        if (!resultsByPlayer[id]) resultsByPlayer[id] = [];
        resultsByPlayer[id].push(!!won);

        if (won && byId[id]) byId[id].wins += 1;
      }

      // Goals + penalties by scorerId (events)
      const events: any[] = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload?.payload?.events) ? payload.payload.events : [];
      for (const e of events) {
        const tEv = e?.t;
        if (tEv === "goal") {
          const scorerId = e?.scorerId ?? null;
          const team: "A" | "B" | null = e?.team ?? null;
          if (scorerId && byId[scorerId]) {
            byId[scorerId].goals += 1;
            if (team === "A") byId[scorerId].goalsForTeam += 1;
            if (team === "B") byId[scorerId].goalsForTeam += 1;
          }
        }
        if (tEv === "penalty") {
          const scorerId = e?.scorerId ?? null;
          const scored = !!e?.scored;
          if (scorerId && byId[scorerId]) {
            if (scored) byId[scorerId].pensScored += 1;
            else byId[scorerId].pensMissed += 1;
          }
          if (scored) pensScoredAll += 1;
          else pensMissedAll += 1;
        }
      }
    }

    // compute streaks
    for (const [id, seq] of Object.entries(resultsByPlayer)) {
      const p = byId[id];
      if (!p) continue;

      let best = 0;
      let cur = 0;
      for (const won of seq) {
        if (won) {
          cur += 1;
          best = Math.max(best, cur);
        } else {
          cur = 0;
        }
      }
      p.bestWinStreak = best;

      // current streak from latest going backwards
      let current = 0;
      for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i]) current += 1;
        else break;
      }
      p.currentWinStreak = current;
    }

    const players = Object.values(byId);

    const topWins = players
      .slice()
      .sort((a, b) => b.wins - a.wins || b.played - a.played || (a.name || "").localeCompare(b.name || ""))
      .slice(0, 6);

    const topWinrate = players
      .filter((p) => p.played >= 5)
      .slice()
      .sort((a, b) => b.wins / b.played - a.wins / a.played || b.played - a.played)
      .slice(0, 6);

    const topGoalsPerMatch = players
      .filter((p) => p.played >= 3)
      .slice()
      .sort((a, b) => b.goals / b.played - a.goals / a.played || b.goals - a.goals)
      .slice(0, 6);

    const topStreak = players
      .filter((p) => p.played >= 3)
      .slice()
      .sort((a, b) => b.bestWinStreak - a.bestWinStreak || b.wins - a.wins)
      .slice(0, 6);

    return {
      matches,
      goals,
      avgGoals: matches > 0 ? goals / matches : 0,
      avgDurationMs: matches > 0 ? totalDurationMs / matches : 0,
      pensScoredAll,
      pensMissedAll,
      penRate: pensScoredAll + pensMissedAll > 0 ? pensScoredAll / (pensScoredAll + pensMissedAll) : 0,

      topWins,
      topWinrate,
      topGoalsPerMatch,
      topStreak,
    };
  }, [all]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;

    return all.filter((h: any) => {
      const p = Array.isArray(h?.players) ? h.players : [];
      const names = p.map((x: any) => (x?.name || "").toLowerCase()).join(" ");
      const summary = JSON.stringify(h?.summary || h?.payload?.summary || {}).toLowerCase();
      return names.includes(s) || summary.includes(s);
    });
  }, [all, q]);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>{t?.("babyfoot.stats.history") ?? "BABY-FOOT — STATS"}</div>
        <div />
      </div>

      <div style={summaryCard(theme)}>
        <div style={summaryTitle}>Résumé</div>
        <div style={summaryGrid}>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Matchs</div>
            <div style={kpiValue}>{agg.matches}</div>
          </div>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Buts</div>
            <div style={kpiValue}>{agg.goals}</div>
          </div>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Buts / match</div>
            <div style={kpiValue}>{agg.avgGoals.toFixed(1)}</div>
          </div>
          <div style={kpi(theme)}>
            <div style={kpiLabel}>Durée moyenne</div>
            <div style={kpiValue}>{fmt(agg.avgDurationMs)}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={pillStyle(theme)}>
            Penalties ✅ {agg.pensScoredAll} / ❌ {agg.pensMissedAll}
          </div>
          <div style={pillStyle(theme)}>Réussite {(agg.penRate * 100).toFixed(0)}%</div>
          <div style={pillStyle(theme)}>Winrate (min 5 matchs)</div>
        </div>

        <div style={lbTitle}>Top victoires</div>
        <div style={lbRow}>
          {agg.topWins.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 700 }}>Aucun match enregistré.</div>
          ) : (
            agg.topWins.map((p) => (
              <PlayerChip key={p.id} theme={theme} id={p.id} name={p.name} lines={[`${p.wins}W • ${p.played}J`]} />
            ))
          )}
        </div>

        <div style={lbTitle}>Top winrate (≥ 5 matchs)</div>
        <div style={lbRow}>
          {agg.topWinrate.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 700 }}>Pas assez de données (min 5 matchs).</div>
          ) : (
            agg.topWinrate.map((p) => (
              <PlayerChip
                key={p.id}
                theme={theme}
                id={p.id}
                name={p.name}
                lines={[`${Math.round((p.wins / Math.max(1, p.played)) * 100)}% • ${p.wins}W/${p.played}J`]}
              />
            ))
          )}
        </div>

        <div style={lbTitle}>Top buts / match (≥ 3 matchs)</div>
        <div style={lbRow}>
          {agg.topGoalsPerMatch.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 700 }}>Pas assez de données (events buts manquants).</div>
          ) : (
            agg.topGoalsPerMatch.map((p) => (
              <PlayerChip
                key={p.id}
                theme={theme}
                id={p.id}
                name={p.name}
                lines={[
                  `${(p.goals / Math.max(1, p.played)).toFixed(2)} but/match`,
                  `${p.goals} buts • ${p.played} matchs`,
                ]}
              />
            ))
          )}
        </div>

        <div style={lbTitle}>Séries de victoires</div>
        <div style={lbRow}>
          {agg.topStreak.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 700 }}>Pas assez de données.</div>
          ) : (
            agg.topStreak.map((p) => (
              <PlayerChip
                key={p.id}
                theme={theme}
                id={p.id}
                name={p.name}
                lines={[
                  `Best: ${p.bestWinStreak}W`,
                  `Actuelle: ${p.currentWinStreak}W`,
                ]}
              />
            ))
          )}
        </div>
      </div>

      <div style={searchRow}>
        <input style={search(theme)} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer (nom / score / etc.)" />
        <div style={pillStyle(theme)}>{filtered.length} matchs</div>
      </div>

      <div style={list}>
        {filtered.map((m: any) => {
          const payload = m?.payload || {};
          const players = Array.isArray(m?.players) ? m.players : [];
          const scoreA = safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0);
          const scoreB = safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0);
          const teamA = payload?.teamA ?? payload?.summary?.teamA ?? "A";
          const teamB = payload?.teamB ?? payload?.summary?.teamB ?? "B";
          const dur = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);

          return (
            <div key={m.id} style={row(theme)}>
              <div style={rowTop}>
                <div style={rowTitle}>
                  {teamA} <span style={{ opacity: 0.65 }}>vs</span> {teamB}
                </div>
                <div style={pillStyle(theme)}>{fmt(dur)}</div>
              </div>

              <div style={rowMid}>
                <div style={score}>{scoreA}</div>
                <div style={{ opacity: 0.6, fontWeight: 900 }}>—</div>
                <div style={score}>{scoreB}</div>
              </div>

              <div style={playersRow}>
                {players.slice(0, 6).map((p: any) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <ProfileAvatar profile={p} size={26} />
                    <div style={{ opacity: 0.8, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p?.name || p?.id?.slice(0, 6)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerChip({ theme, id, name, lines }: { theme: any; id: string; name?: string; lines: string[] }) {
  return (
    <div style={lbItem(theme)}>
      <div style={{ width: 34, height: 34, display: "grid", placeItems: "center" }}>
        <ProfileAvatar profile={{ id }} size={30} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={lbName}>{name || id.slice(0, 6)}</div>
        {lines.map((l, idx) => (
          <div key={idx} style={lbSub}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = { textAlign: "center", fontWeight: 900, letterSpacing: 1, opacity: 0.95 };

const summaryCard = (theme: any) => ({
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: 14,
  boxShadow: "0 18px 60px rgba(0,0,0,0.40)",
});

const summaryTitle: any = { fontWeight: 1000, letterSpacing: 0.6, marginBottom: 10 };

const summaryGrid: any = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const kpi = (theme: any) => ({
  borderRadius: 16,
  background: "rgba(0,0,0,0.18)",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: 12,
});

const kpiLabel: any = { fontSize: 12, fontWeight: 900, opacity: 0.75 };
const kpiValue: any = { fontSize: 22, fontWeight: 1000, letterSpacing: 0.6, marginTop: 6 };

const lbTitle: any = { marginTop: 14, fontWeight: 1000, letterSpacing: 0.5, opacity: 0.95 };

const lbRow: any = { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" };

const lbItem = (theme: any) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  minWidth: 190,
  flex: "1 1 190px",
});

const lbName: any = { fontWeight: 950, letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis" };
const lbSub: any = { fontSize: 12, fontWeight: 900, opacity: 0.7 };

const searchRow: any = { marginTop: 12, display: "flex", gap: 10, alignItems: "center" };

const search = (theme: any) => ({
  flex: 1,
  height: 44,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  color: theme?.colors?.text ?? "#fff",
  padding: "0 12px",
  fontWeight: 900,
  outline: "none",
});

const list: any = { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 };

const row = (theme: any) => ({
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: 12,
  boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
});

const rowTop: any = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };

const rowTitle: any = { fontWeight: 1000, letterSpacing: 0.6 };

const rowMid: any = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const score: any = { fontSize: 28, fontWeight: 1000, letterSpacing: 1 };

const playersRow: any = { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" };
