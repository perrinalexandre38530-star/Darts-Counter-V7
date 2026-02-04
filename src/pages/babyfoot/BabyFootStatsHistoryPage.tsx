// =============================================================
// src/pages/babyfoot/BabyFootStatsHistoryPage.tsx
// Baby-Foot — Historique + résumé (LOCAL)
// - Source: store.history (App.tsx pushBabyFootHistory)
// ✅ V2: agrégats + top victoires + top buteurs (scorerId) + affichage sets/penalties
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

function safeNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function BabyFootStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const profiles = (store?.profiles ?? []) as any[];
  const profileById = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of profiles) if (p?.id) m[p.id] = p;
    return m;
  }, [profiles]);

  const all = useMemo(() => {
    const list = (store?.history ?? []).filter((h: any) => h?.sport === "babyfoot" || h?.kind === "babyfoot");
    return list.sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
  }, [store?.history]);

  const agg = useMemo(() => {
    const byWins: Record<string, { id: string; played: number; wins: number }> = {};
    const byGoals: Record<string, { id: string; goals: number }> = {};

    let matches = 0;
    let goals = 0;
    let totalDurationMs = 0;

    for (const h of all) {
      if (h?.status && h.status !== "finished") continue;

      const payload = h?.payload || {};
      const scoreA = safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0);
      const scoreB = safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0);

      matches += 1;
      goals += Math.max(0, scoreA) + Math.max(0, scoreB);
      totalDurationMs += safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);

      const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
      for (const p of players) {
        const id = p?.id;
        if (!id) continue;
        if (!byWins[id]) byWins[id] = { id, played: 0, wins: 0 };
        byWins[id].played += 1;
      }

      const w = h?.winnerId ?? payload?.winnerId ?? null;
      if (w) {
        if (!byWins[w]) byWins[w] = { id: w, played: 0, wins: 0 };
        byWins[w].wins += 1;
      }

      // scorerId aggregation
      const events = Array.isArray(payload?.events) ? payload.events : Array.isArray(h?.events) ? h.events : [];
      for (const ev of events) {
        if (!ev) continue;
        if (ev.t === "goal" || ev.t === "penalty") {
          const sid = ev.scorerId;
          if (!sid) continue;
          if (!byGoals[sid]) byGoals[sid] = { id: sid, goals: 0 };
          byGoals[sid].goals += 1;
        }
      }
    }

    const leaderboardWins = Object.values(byWins)
      .sort((a, b) => b.wins - a.wins || b.played - a.played)
      .slice(0, 6);

    const leaderboardScorers = Object.values(byGoals)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 6);

    return {
      matches,
      goals,
      avgGoals: matches > 0 ? goals / matches : 0,
      avgDurationMs: matches > 0 ? totalDurationMs / matches : 0,
      leaderboardWins,
      leaderboardScorers,
    };
  }, [all]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;

    return all.filter((h: any) => {
      const payload = h?.payload || {};
      const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
      const names = players
        .map((x: any) => {
          const p = profileById[x?.id];
          return (p?.name || x?.name || "").toLowerCase();
        })
        .join(" ");
      const summary = JSON.stringify(payload?.summary || {}).toLowerCase();
      return names.includes(s) || summary.includes(s);
    });
  }, [q, all, profileById]);

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={{ textAlign: "center", fontWeight: 950, letterSpacing: 1, opacity: 0.95 }}>BABY-FOOT — STATS</div>
        <div />
      </div>

      {/* KPIs */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
          background: theme.card,
          padding: 14,
          boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <div style={pillStyle(theme)}>
            <span style={{ opacity: 0.7 }}>{t("babyfoot.stats.matches", "Matchs")}</span>
            <b>{agg.matches}</b>
          </div>
          <div style={pillStyle(theme)}>
            <span style={{ opacity: 0.7 }}>{t("babyfoot.stats.goals", "Buts")}</span>
            <b>{agg.goals}</b>
          </div>
          <div style={pillStyle(theme)}>
            <span style={{ opacity: 0.7 }}>{t("babyfoot.stats.avgGoals", "Buts/match")}</span>
            <b>{agg.avgGoals.toFixed(2)}</b>
          </div>
          <div style={pillStyle(theme)}>
            <span style={{ opacity: 0.7 }}>{t("babyfoot.stats.avgTime", "Durée")}</span>
            <b>{fmt(agg.avgDurationMs)}</b>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {/* Top wins */}
          <div style={{ borderRadius: 16, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, padding: 12 }}>
            <div style={{ fontWeight: 1000, color: theme.primary, letterSpacing: 0.6, marginBottom: 10 }}>
              {t("babyfoot.stats.topWins", "Top victoires")}
            </div>
            {agg.leaderboardWins.length === 0 ? (
              <div style={{ color: theme.textSoft, fontWeight: 800 }}>{t("common.none", "—")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {agg.leaderboardWins.map((row) => {
                  const p = profileById[row.id];
                  return (
                    <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ProfileAvatar profile={p} size={36} showStars={false} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 1000 }}>{p?.name || row.id.slice(0, 8)}</div>
                        <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 800 }}>
                          {row.wins} {t("babyfoot.stats.wins", "victoires")} • {row.played} {t("babyfoot.stats.played", "matchs")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top scorers */}
          <div style={{ borderRadius: 16, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`, padding: 12 }}>
            <div style={{ fontWeight: 1000, color: theme.primary, letterSpacing: 0.6, marginBottom: 10 }}>
              {t("babyfoot.stats.topScorers", "Top buteurs")}
            </div>
            {agg.leaderboardScorers.length === 0 ? (
              <div style={{ color: theme.textSoft, fontWeight: 800 }}>
                {t("babyfoot.stats.noScorers", "Aucun buteur (scorerId) enregistré.")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {agg.leaderboardScorers.map((row) => {
                  const p = profileById[row.id];
                  return (
                    <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ProfileAvatar profile={p} size={36} showStars={false} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 1000 }}>{p?.name || row.id.slice(0, 8)}</div>
                        <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 800 }}>
                          {row.goals} {t("babyfoot.stats.goals", "buts")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search", "Rechercher…")}
          style={{
            width: "100%",
            padding: "12px 12px",
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            background: "rgba(0,0,0,0.18)",
            color: theme.text,
            fontWeight: 900,
            outline: "none",
          }}
        />
      </div>

      {/* History list */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((h: any) => {
          const payload = h?.payload || {};
          const scoreA = safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0);
          const scoreB = safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0);
          const durationMs = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);

          const setsBestOf = payload?.setsBestOf ?? 0;
          const setsWonA = safeNum(payload?.setsWonA, 0);
          const setsWonB = safeNum(payload?.setsWonB, 0);
          const penA = safeNum(payload?.penA, 0);
          const penB = safeNum(payload?.penB, 0);
          const phase = payload?.phase;

          const teamA = payload?.teamA || "TEAM A";
          const teamB = payload?.teamB || "TEAM B";

          const pArr = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
          const pProfiles = pArr.map((x: any) => profileById[x?.id]).filter(Boolean);

          return (
            <div
              key={h?.id || payload?.matchId || Math.random()}
              style={{
                borderRadius: 18,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                padding: 12,
                boxShadow: "0 12px 28px rgba(0,0,0,0.30)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 1000 }}>
                  {teamA} <span style={{ opacity: 0.6 }}>vs</span> {teamB}
                </div>
                <div style={{ fontWeight: 1000, color: theme.primary }}>{scoreA} — {scoreB}</div>
              </div>

              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <div style={pillStyle(theme)}>⏱ {fmt(durationMs)}</div>
                {setsBestOf ? <div style={pillStyle(theme)}>SETS BO{setsBestOf}: {setsWonA}-{setsWonB}</div> : null}
                {phase === "penalties" ? <div style={pillStyle(theme)}>PEN: {penA}-{penB}</div> : null}
              </div>

              {pProfiles.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pProfiles.slice(0, 6).map((p: any) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ProfileAvatar profile={p} size={34} showStars={false} />
                      <div style={{ fontWeight: 900, fontSize: 12 }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
