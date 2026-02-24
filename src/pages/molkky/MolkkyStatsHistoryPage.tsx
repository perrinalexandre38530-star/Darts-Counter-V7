// =============================================================
// src/pages/molkky/MolkkyStatsHistoryPage.tsx
// MÖLKKY — Historique (LOCAL)
// - Source: store.history (pushMolkkyHistory dans App.tsx)
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

function pillStyle(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,0.14)` ,
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  };
}

function cardStyle(theme: any): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    borderRadius: 16,
    border: `1px solid rgba(255,255,255,0.14)` ,
    background: "rgba(255,255,255,0.06)",
    padding: 12,
    boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
    cursor: "pointer",
  };
}

export default function MolkkyStatsHistoryPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [q, setQ] = useState("");

  const focusMatchId = String((params as any)?.focusMatchId || "");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const raw = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "molkky");

    const mapped = raw
      .map((r: any) => {
        const when = Number(r.updatedAt || r.createdAt) || Date.now();
        const dateStr = new Date(when).toLocaleString();

        const summary = r?.summary || r?.payload?.summary || {};
        const winnerName = summary?.winnerName || "";
        const targetScore = Number(summary?.targetScore ?? 50) || 50;
        const turns = Number(summary?.turns ?? 0) || 0;
        const dur = Number(summary?.durationMs ?? 0) || 0;
        const durSec = dur ? Math.round(dur / 1000) : 0;

        const players = Array.isArray(summary?.players)
          ? summary.players
          : Array.isArray(r?.players)
          ? r.players.map((p: any) => ({ id: p.id, name: p.name, score: p.score }))
          : [];

        const names = players.map((p: any) => p?.name).filter(Boolean).join(" · ");

        const hay = `${winnerName} ${names} ${dateStr}`.toLowerCase();
        if (qq && !hay.includes(qq)) return null;

        return {
          id: r.id,
          when,
          dateStr,
          winnerName,
          targetScore,
          turns,
          durSec,
          names,
          raw: r,
        };
      })
      .filter(Boolean) as any[];

    mapped.sort((a, b) => b.when - a.when);
    return mapped;
  }, [store?.history, q]);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_stats")} />
        <div style={topTitle}>MÖLKKY — HISTORIQUE</div>
        <div style={{ width: 48 }} />
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t?.("Rechercher") ?? "Rechercher"}
        style={search(theme)}
      />

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {list.map((r) => {
          const focused = focusMatchId && r.id === focusMatchId;
          return (
            <button
              key={r.id}
              style={{
                ...cardStyle(theme),
                outline: focused ? `2px solid ${theme?.colors?.accent ?? "#6cff7a"}` : "none",
              }}
              onClick={() => {
                // Pour l'instant on reste en lecture (pas de détail match). On peut ajouter un détail plus tard.
                alert(
                  `${r.dateStr}\n\nJoueurs: ${r.names || "—"}\nVainqueur: ${r.winnerName || "—"}\nCible: ${r.targetScore}\nTours: ${r.turns}\nDurée: ${r.durSec}s`
                );
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 1100, letterSpacing: 0.2, opacity: 0.95, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.names || "Partie"}
                </div>
                <div style={pillStyle(theme)}>
                  <span style={{ opacity: 0.85 }}>Cible</span>
                  <b>{r.targetScore}</b>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                <div style={{ opacity: 0.8 }}>{r.dateStr}</div>
                <div style={{ fontWeight: 1000 }}>🏆 {r.winnerName || "—"}</div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <div style={pillStyle(theme)}>Tours: <b>{r.turns}</b></div>
                <div style={pillStyle(theme)}>Durée: <b>{r.durSec}s</b></div>
              </div>
            </button>
          );
        })}

        {!list.length ? (
          <div style={{ opacity: 0.75, fontSize: 13, fontWeight: 900, marginTop: 10 }}>
            {t?.("Aucune partie") ?? "Aucune partie"}.
          </div>
        ) : null}
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
};

const topTitle: any = {
  textAlign: "center",
  fontWeight: 1000,
  letterSpacing: 2,
  opacity: 0.95,
};

const search = (theme: any): React.CSSProperties => ({
  width: "100%",
  height: 44,
  borderRadius: 14,
  marginTop: 12,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  outline: "none",
  fontWeight: 900,
});
