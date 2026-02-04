// =============================================================
// src/pages/babyfoot/BabyFootStatsHistoryPage.tsx
// Baby-Foot — Historique + résumé (LOCAL)
// - Source: store.history (App.tsx pushBabyFootHistory)
// - ✅ Ajout: stats agrégées (matchs, buts, top victoires)
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

export default function BabyFootStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const all = useMemo(() => {
    const list = (store?.history ?? []).filter((h: any) => h?.sport === "babyfoot" || h?.kind === "babyfoot");
    return list.sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
  }, [store?.history]);

  const agg = useMemo(() => {
    const byId: Record<string, { id: string; name: string; played: number; wins: number }> = {};
    let matches = 0;
    let goals = 0;
    let totalDurationMs = 0;

    for (const h of all) {
      if (h?.status && h.status !== "finished") continue;
      const payload = h?.payload || {};
      const scoreA = Number(payload?.scoreA ?? payload?.summary?.scoreA ?? 0);
      const scoreB = Number(payload?.scoreB ?? payload?.summary?.scoreB ?? 0);

      matches += 1;
      goals += Math.max(0, scoreA) + Math.max(0, scoreB);
      totalDurationMs += Number(payload?.durationMs ?? payload?.summary?.durationMs ?? 0);

      const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
      for (const p of players) {
        const id = p?.id;
        if (!id) continue;
        if (!byId[id]) byId[id] = { id, name: p?.name || "", played: 0, wins: 0 };
        byId[id].played += 1;
      }
      const w = h?.winnerId ?? payload?.winnerId ?? null;
      if (w && byId[w]) byId[w].wins += 1;
    }

    const leaderboard = Object.values(byId)
      .sort((a, b) => b.wins - a.wins || b.played - a.played || (a.name || "").localeCompare(b.name || ""))
      .slice(0, 6);

    return {
      matches,
      goals,
      avgGoals: matches > 0 ? goals / matches : 0,
      avgDurationMs: matches > 0 ? totalDurationMs / matches : 0,
      leaderboard,
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

        <div style={lbTitle}>Top victoires</div>
        <div style={lbRow}>
          {agg.leaderboard.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 700 }}>Aucun match enregistré.</div>
          ) : (
            agg.leaderboard.map((p) => (
              <div key={p.id} style={lbItem(theme)}>
                <div style={{ width: 34, height: 34, display: "grid", placeItems: "center" }}>
                  <ProfileAvatar profile={{ id: p.id }} size={30} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={lbName}>{p.name || p.id.slice(0, 6)}</div>
                  <div style={lbSub}>
                    {p.wins}W • {p.played}J
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={searchRow}>
        <input
          style={search(theme)}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer (nom / score / etc.)"
        />
        <div style={pillStyle(theme)}>{filtered.length} matchs</div>
      </div>

      <div style={list}>
        {filtered.map((m: any) => {
          const payload = m?.payload || {};
          const players = Array.isArray(m?.players) ? m.players : [];
          const scoreA = Number(payload?.scoreA ?? payload?.summary?.scoreA ?? 0);
          const scoreB = Number(payload?.scoreB ?? payload?.summary?.scoreB ?? 0);
          const teamA = payload?.teamA ?? payload?.summary?.teamA ?? "A";
          const teamB = payload?.teamB ?? payload?.summary?.teamB ?? "B";
          const dur = Number(payload?.durationMs ?? payload?.summary?.durationMs ?? 0);

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
  padding: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  marginBottom: 12,
});

const summaryTitle: any = { fontWeight: 950, letterSpacing: 0.8, marginBottom: 10 };
const summaryGrid: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

const kpi = (theme: any) => ({
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 10,
});

const kpiLabel: any = { opacity: 0.7, fontWeight: 800, fontSize: 12 };
const kpiValue: any = { fontSize: 22, fontWeight: 950, letterSpacing: 0.6 };

const lbTitle: any = { marginTop: 12, fontWeight: 950, letterSpacing: 0.8, opacity: 0.9 };
const lbRow: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 };

const lbItem = (theme: any) => ({
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: 10,
  alignItems: "center",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 10,
});

const lbName: any = { fontWeight: 950, letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis" };
const lbSub: any = { opacity: 0.7, fontWeight: 800, fontSize: 12 };

const searchRow: any = { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" };

const search = (theme: any) => ({
  height: 40,
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: "rgba(0,0,0,0.20)",
  color: theme.text,
  padding: "0 12px",
  fontWeight: 800,
  outline: "none",
});

const list: any = { display: "grid", gap: 10, marginTop: 12 };

const row = (theme: any) => ({
  borderRadius: 18,
  border: `1px solid ${theme.border}`,
  background: theme.card,
  padding: 12,
});

const rowTop: any = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const rowTitle: any = { fontWeight: 950, letterSpacing: 0.4 };
const rowMid: any = { display: "flex", gap: 10, alignItems: "baseline", justifyContent: "center", marginTop: 10 };

const score: any = { fontSize: 28, fontWeight: 950, letterSpacing: 1 };

const playersRow: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 };
