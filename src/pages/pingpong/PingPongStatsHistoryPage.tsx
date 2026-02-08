// =============================================================
// src/pages/pingpong/PingPongStatsHistoryPage.tsx
// Ping-Pong — Historique (LOCAL)
// - Source: store.history (pushPingPongHistory dans App.tsx)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function modeLabel(mode: string) {
  const m = String(mode || "").toLowerCase();
  if (m.includes("tourn")) return "TOURNANTE";
  if (m.includes("set")) return "SETS";
  if (m.includes("train")) return "TRAINING";
  if (m.includes("simple")) return "1 SET";
  return (mode || "MATCH").toUpperCase();
}

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

function cardStyle(theme: any): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    borderRadius: 16,
    border: `1px solid ${theme.borderSoft ?? theme.border ?? "rgba(255,255,255,0.14)"}`,
    background: theme.card,
    padding: 12,
    boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
    cursor: "pointer",
  };
}

export default function PingPongStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const raw = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "pingpong");

    const mapped = raw
      .map((r: any) => {
        const when = Number(r.updatedAt || r.createdAt) || Date.now();
        const dateStr = new Date(when).toLocaleString();

        const payload = r.payload || {};
        const sides = payload.sides || {};
        const state = payload.state || {};
        const sets = state.sets || payload.sets || {};
        const points = state.points || payload.points || {};

        const mode = payload.mode || "match";

        // Match (simple/sets)
        const a = sides.A?.name || payload.sideA || "Joueur A";
        const b = sides.B?.name || payload.sideB || "Joueur B";
        const sa = Number(sets.A ?? payload.setsA ?? 0);
        const sb = Number(sets.B ?? payload.setsB ?? 0);
        const pa = Number(points.A ?? payload.pointsA ?? 0);
        const pb = Number(points.B ?? payload.pointsB ?? 0);

        // Tournante
        const tournanteWinner =
          payload.winnerName || payload.tournanteWinner || r.winnerName || r.winnerId || null;

        const title =
          String(mode).toLowerCase().includes("tourn")
            ? tournanteWinner
              ? `Tournante — Vainqueur : ${tournanteWinner}`
              : "Tournante"
            : sa || sb
            ? `${a} ${sa}–${sb} ${b}`
            : `${a} ${pa}–${pb} ${b}`;

        return { id: r.id, title, dateStr, when, mode, payload };
      })
      .sort((a: any, b: any) => (b.when || 0) - (a.when || 0));

    if (!qq) return mapped;

    return mapped.filter((it: any) => {
      const hay = `${it.title} ${it.dateStr} ${it.mode}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [store, q]);

  return (
    <div style={{ minHeight: "100vh", padding: 14, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <BackDot onClick={() => go("stats")} />
        <div style={{ fontWeight: 1000, letterSpacing: 0.5 }}>
          {t("pingpong.stats.historyTitle", "PING-PONG — HISTORIQUE")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pingpong.stats.search", "Rechercher…")}
          style={{
            flex: 1,
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft ?? theme.border ?? "rgba(255,255,255,0.16)"}`,
            background: theme.card,
            color: theme.text,
            padding: "10px 12px",
            fontWeight: 800,
            outline: "none",
          }}
        />
        <div style={pillStyle(theme)}>{list.length}</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {list.map((it: any) => (
          <button
            key={it.id}
            style={cardStyle(theme)}
            onClick={() => {
              go("pingpong_match_detail", { id: it.id });
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>{it.title}</div>
              <div style={{ ...pillStyle(theme), opacity: 0.9 }}>{modeLabel(it.mode)}</div>
            </div>
            <div style={{ marginTop: 6, opacity: 0.75, fontWeight: 800, fontSize: 12 }}>{it.dateStr}</div>
          </button>
        ))}

        {!list.length && (
          <div style={{ opacity: 0.75, fontWeight: 850, marginTop: 10 }}>
            {t("pingpong.stats.noneHistory", "Aucun match trouvé.")}
          </div>
        )}
      </div>
    </div>
  );
}
