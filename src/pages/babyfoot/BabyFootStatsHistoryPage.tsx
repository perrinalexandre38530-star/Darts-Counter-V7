// =============================================================
// src/pages/babyfoot/BabyFootStatsHistoryPage.tsx
// Baby-Foot — Historique (LOCAL)
// - Source: store.history (App.tsx pushBabyFootHistory)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

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

export default function BabyFootStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const raw = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "babyfoot");
    const mapped = raw
      .map((r: any) => {
        const when = Number(r.updatedAt || r.createdAt) || Date.now();
        const dateStr = new Date(when).toLocaleString();
        const payload = r.payload || {};
        const teams = payload.teams || {};
        const scores = payload.scores || {};
        const a = teams.A?.name || payload.teamA || "Équipe A";
        const b = teams.B?.name || payload.teamB || "Équipe B";
        const sa = Number(scores.A ?? payload.scoreA ?? 0);
        const sb = Number(scores.B ?? payload.scoreB ?? 0);
        const title = `${a} ${sa}–${sb} ${b}`;
        return { id: r.id, title, dateStr, sa, sb };
      })
      .sort((a: any, b: any) => (b?.dateStr ? 1 : 0) - (a?.dateStr ? 1 : 0));

    if (!qq) return mapped;
    return mapped.filter((x: any) => `${x.title} ${x.dateStr}`.toLowerCase().includes(qq));
  }, [store?.history, q]);

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

        <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: 0.6 }}>HISTORIQUE — BABY-FOOT</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <span style={pillStyle(theme)}>Matches : {list.length}</span>
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
        {list.map((x: any) => (
          <div
            key={x.id}
            style={{
              textAlign: "left",
              borderRadius: 16,
              padding: 12,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 0.3 }}>{x.title}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{x.dateStr}</div>
            </div>
          </div>
        ))}

        {list.length === 0 ? (
          <div style={{ opacity: 0.75, padding: 10 }}>{t("stats.empty", "Aucune donnée pour le moment.")}</div>
        ) : null}
      </div>
    </div>
  );
}
