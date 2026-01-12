// =============================================================
// src/pages/petanque/PetanqueStatsHistoryPage.tsx
// Stats Pétanque — Historique (détail par match)
// Source : petanqueStore history (localStorage)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";

import { getPetanqueMatches, normalizePetanqueRecord } from "../../lib/petanqueStats";

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

export default function PetanqueStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const records = getPetanqueMatches();
    const qq = q.trim().toLowerCase();
    const mapped = records
      .map((r) => {
        const n = normalizePetanqueRecord(r);
        const dateStr = new Date(n.updatedAt || n.createdAt || Date.now()).toLocaleString();
        const players = [...n.teamA.players, ...n.teamB.players].map((p) => p.name).join(" · ");
        const title = `${n.teamA.name} ${n.scores.A}–${n.scores.B} ${n.teamB.name}`;
        return { raw: r, n, dateStr, players, title };
      })
      .sort((a, b) => (Number(b.n.updatedAt || b.n.createdAt) || 0) - (Number(a.n.updatedAt || a.n.createdAt) || 0));

    if (!qq) return mapped;
    return mapped.filter((x) => {
      const hay = `${x.title} ${x.players} ${x.dateStr}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [q]);

  const kpi = useMemo(() => {
    const total = list.length;
    const totalEnds = list.reduce((acc, x) => acc + (x.n.endsCount || 0), 0);
    const avgEnds = total ? totalEnds / total : 0;
    return { total, totalEnds, avgEnds };
  }, [list]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button
          onClick={() => go("stats")}
          style={{
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ← {t("common.back", "Retour")}
        </button>

        <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: 0.6 }}>HISTORIQUE — PÉTANQUE</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <span style={pillStyle(theme)}>Matches : {kpi.total}</span>
        <span style={pillStyle(theme)}>Mènes : {kpi.totalEnds}</span>
        <span style={pillStyle(theme)}>Moy. mènes/match : {kpi.avgEnds.toFixed(1)}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search", "Rechercher…")}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            outline: "none",
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {list.map(({ n, dateStr, title }) => {
          const w = n.winnerTeamId;
          const leftWin = w === "A";
          const rightWin = w === "B";

          return (
            <button
              key={n.id}
              onClick={() => go("petanque_stats_matches", { matchId: n.id })}
              style={{
                textAlign: "left",
                borderRadius: 16,
                padding: 12,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950, letterSpacing: 0.3 }}>{title}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{dateStr}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {n.teamA.players.slice(0, 3).map((p) => (
                    <ProfileAvatar
                      key={p.id}
                      name={p.name}
                      avatarDataUrl={p.avatarDataUrl}
                      size={26}
                      ring={leftWin ? "gold" : undefined}
                    />
                  ))}
                  <div style={{ fontWeight: 900, opacity: leftWin ? 1 : 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.teamA.name}
                  </div>
                </div>

                <div style={{ fontWeight: 950, letterSpacing: 1, opacity: 0.95 }}>
                  {n.scores.A}–{n.scores.B}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginLeft: "auto" }}>
                  <div style={{ fontWeight: 900, opacity: rightWin ? 1 : 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.teamB.name}
                  </div>
                  {n.teamB.players.slice(0, 3).map((p) => (
                    <ProfileAvatar
                      key={p.id}
                      name={p.name}
                      avatarDataUrl={p.avatarDataUrl}
                      size={26}
                      ring={rightWin ? "gold" : undefined}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                Mode : {n.mode.toUpperCase()} · Mènes : {n.endsCount} · Cible : {n.target || 13}
              </div>
            </button>
          );
        })}

        {list.length === 0 ? (
          <div style={{ opacity: 0.75, padding: 10 }}>{t("stats.empty", "Aucune donnée pour le moment.")}</div>
        ) : null}
      </div>
    </div>
  );
}
