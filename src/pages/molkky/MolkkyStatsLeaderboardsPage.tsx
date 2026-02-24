// =============================================================
// src/pages/molkky/MolkkyStatsLeaderboardsPage.tsx
// MÖLKKY — Classements (LOCAL)
// - Basé sur store.history
// =============================================================

import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
};

export default function MolkkyStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const data = useMemo(() => {
    const games = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "molkky");

    let fastest: any = null;
    let lowestTurns: any = null;

    const winsByName: Record<string, number> = {};

    for (const g of games) {
      const s = g?.summary || g?.payload?.summary || {};
      const dur = Number(s?.durationMs ?? 0) || 0;
      const turns = Number(s?.turns ?? 0) || 0;
      const winner = String(s?.winnerName || "").trim();

      if (winner) winsByName[winner] = (winsByName[winner] || 0) + 1;

      if (dur > 0) {
        if (!fastest || dur < fastest.dur) fastest = { dur, winner, when: g.updatedAt || g.createdAt || 0 };
      }
      if (turns > 0) {
        if (!lowestTurns || turns < lowestTurns.turns) lowestTurns = { turns, winner, when: g.updatedAt || g.createdAt || 0 };
      }
    }

    const topWinners = Object.entries(winsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, wins]) => ({ name, wins }));

    return { total: games.length, fastest, lowestTurns, topWinners };
  }, [store?.history]);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_stats")} />
        <div style={topTitle}>MÖLKKY — CLASSEMENTS</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>Records</div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={row(theme)}>
            <span>Victoire la plus rapide</span>
            <b>{data.fastest ? `${Math.round(data.fastest.dur / 1000)}s — ${data.fastest.winner || "—"}` : "—"}</b>
          </div>
          <div style={row(theme)}>
            <span>Moins de tours</span>
            <b>{data.lowestTurns ? `${data.lowestTurns.turns} — ${data.lowestTurns.winner || "—"}` : "—"}</b>
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>Top vainqueurs</div>
        {data.topWinners.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {data.topWinners.map((x, i) => (
              <div key={x.name} style={row(theme)}>
                <span>
                  <b style={{ marginRight: 8 }}>{i + 1}.</b>
                  {x.name}
                </span>
                <b>{x.wins}</b>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 13, fontWeight: 900 }}>{t?.("Aucune donnée") ?? "Aucune donnée"}.</div>
        )}
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

const topTitle: any = {
  textAlign: "center",
  fontWeight: 1000,
  letterSpacing: 2,
  opacity: 0.95,
};

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const sectionTitle: any = {
  fontWeight: 1000,
  letterSpacing: 1,
  opacity: 0.9,
  marginBottom: 10,
};

const row = (theme: any): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.20)",
  fontSize: 13,
  opacity: 0.95,
});
