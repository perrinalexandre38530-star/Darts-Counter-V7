// @ts-nocheck
// ============================================
// src/pages/statscenter/StatsCenterHistoryPage.tsx
// ✅ UI UNIQUE — Historique via StatsProvider (local)
// ============================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import { useStatsProvider } from "../../stats/useStatsProvider";
import type { StatsPeriod } from "../../stats/types";

type Props = { go?: any };

const PERIODS: StatsPeriod[] = ["J", "S", "M", "A", "ARV" as any];

export default function StatsCenterHistoryPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const provider = useStatsProvider();

  const [period, setPeriod] = useState<StatsPeriod>("A");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    try {
      const all = provider.getHistory((period as any) === "ARV" ? "ALL" : (period as any)) || [];
      const q = query.trim().toLowerCase();
      if (!q) return all;
      return all.filter((m: any) => {
        const s = `${m?.id || ""} ${(m?.players || []).join(" ")} ${m?.winner || ""} ${m?.mode || ""}`.toLowerCase();
        return s.includes(q);
      });
    } catch {
      return [];
    }
  }, [provider, period, query]);

  const allCount = rows.length;
  const inProgress = rows.filter((m: any) => m?.status === "in_progress").length;

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const tr = (k: string, fallback?: string) => (t ? t(k) : "") || fallback || k;

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "#050607",
    color: "#fff",
    padding: "14px 12px 90px",
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: "14px 14px",
    margin: "12px auto",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  };

  const title: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 16,
    textTransform: "uppercase",
    color: "#ffcc55",
    textShadow: "0 0 16px rgba(255,204,85,0.55)",
  };

  const statRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
  };

  const statBox = (active?: boolean): React.CSSProperties => ({
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    padding: "12px 10px",
    textAlign: "center",
    fontWeight: 900,
    opacity: active ? 1 : 0.9,
  });

  const bigBtn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#fff",
  };

  const periodRow: React.CSSProperties = {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 10,
  };

  const periodBtn = (active: boolean): React.CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: active ? `rgba(255,204,85,0.18)` : "rgba(0,0,0,0.35)",
    color: active ? "#ffcc55" : "#fff",
    fontWeight: 900,
    letterSpacing: 0.6,
  });

  const searchRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    marginTop: 10,
  };

  const input: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    outline: "none",
  };

  const listBox: React.CSSProperties = {
    marginTop: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.28)",
    padding: 12,
    minHeight: 110,
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("stats") : null)} />
        <div style={title}>{tr("stats.history", "HISTORIQUE")}</div>
        <InfoDot onClick={() => (go ? go("stats") : null)} />
      </div>

      <div style={card}>
        <div style={statRow}>
          <div style={statBox(true)}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{tr("stats.all", "ALL")}</div>
            <div style={{ fontSize: 26, color: "#ffcc55" }}>{allCount}</div>
          </div>
          <div style={statBox()}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{tr("stats.inProgress", "En cours")}</div>
            <div style={{ fontSize: 26, color: "#ff4444" }}>{inProgress}</div>
          </div>
          <div style={statBox()}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>{tr("stats.received", "Reçues")}</div>
            <div style={{ fontSize: 26, color: "#fff" }}>0</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <button style={bigBtn} onClick={() => { /* placeholder */ }}>
            {tr("stats.reload", "RECHARGER")}
          </button>
          <button style={bigBtn} onClick={() => { /* placeholder */ }}>
            {tr("stats.import", "IMPORTER")}
          </button>
        </div>

        <div style={periodRow}>
          {PERIODS.map((p) => (
            <button key={p} style={periodBtn(p === period)} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={searchRow}>
          <input
            style={input}
            placeholder={tr("stats.search", "Rechercher")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button style={bigBtn} onClick={() => setQuery("")}>{tr("stats.clear", "EFFACER")}</button>
        </div>

        <div style={listBox}>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 800, textAlign: "center", padding: 10 }}>
              {tr("stats.noData", "Aucune donnée.")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.slice(0, 30).map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontWeight: 900, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ opacity: 0.9 }}>{(m.mode && (t ? t(m.mode) : "")) || m.mode || ""}</div>
                    <div style={{ color: "#ffcc55" }}>{new Date(m.date || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                    {(m.players || []).join(" vs ")}
                    {m.winner ? ` • ${tr("stats.winner", "Vainqueur")}: ${m.winner}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
