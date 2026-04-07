// @ts-nocheck
// ============================================
// src/pages/statscenter/StatsCenterLocalsPage.tsx
// ✅ UI UNIQUE (copie du modèle Stats Center) — profils locaux via StatsProvider
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import { useStore } from "../../contexts/StoreContext";
import { useStatsProvider } from "../../stats/useStatsProvider";

import type { Profile } from "../../lib/types";

type Props = { go?: any };

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function StatsCenterLocalsPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const { store } = useStore();
  const provider = useStatsProvider();

  const allProfiles: Profile[] = useMemo(() => {
    const arr = (store as any)?.profiles;
    return Array.isArray(arr) ? arr : [];
  }, [store]);

  const activeProfileId = (store as any)?.activeProfileId || "";

  const locals = useMemo(() => {
    return allProfiles.filter((p) => p?.id && p.id !== activeProfileId);
  }, [allProfiles, activeProfileId]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [locals.length]);

  const selected = locals[idx] || null;

  const stats = useMemo(() => {
    if (!selected?.id) {
      return { avgScore: 0, bestScore: 0, avgTurns: 0, avgDurationMs: 0 };
    }
    try {
      const s = provider.getPlayerStats(String(selected.id));
      return {
        avgScore: safeNum(s?.avgScore),
        bestScore: safeNum(s?.bestScore),
        avgTurns: safeNum(s?.avgTurns),
        avgDurationMs: safeNum(s?.avgDurationMs),
      };
    } catch {
      return { avgScore: 0, bestScore: 0, avgTurns: 0, avgDurationMs: 0 };
    }
  }, [provider, selected]);

  const canPrev = idx > 0;
  const canNext = idx < locals.length - 1;

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const tr = (k: string, fallback?: string) => (t ? t(k) : "") || fallback || k;

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 50% 0%, rgba(183,255,0,0.10), rgba(0,0,0,0) 60%), #050607",
    color: "#fff",
    padding: "14px 12px 90px",
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
    fontSize: 12,
    opacity: 0.9,
    textTransform: "uppercase",
  };

  const pill: React.CSSProperties = {
    margin: "10px auto 14px",
    width: "100%",
    maxWidth: 520,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.30)",
    textAlign: "center",
    fontWeight: 800,
    letterSpacing: 0.4,
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: "14px 14px",
    margin: "10px auto",
  };

  const btnRound: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: accent,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  };

  const row3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
  };

  const metricCard: React.CSSProperties = {
    ...card,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const metricLeft: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };

  const metricTitle: React.CSSProperties = {
    fontWeight: 800,
    opacity: 0.9,
  };

  const metricValue: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: 0.2,
    lineHeight: 1,
  };

  const metricUnit: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    opacity: 0.9,
    marginLeft: 6,
  };

  const metricSub: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
  };

  const iconBox: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${border}`,
    display: "grid",
    placeItems: "center",
    color: accent,
    background: "rgba(0,0,0,0.35)",
    fontWeight: 900,
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("stats") : null)} />
        <div style={title}>{tr("molkky.locals", "MÖLKKY — PROFILS LOCAUX")}</div>
        <InfoDot onClick={() => (go ? go("stats") : null)} />
      </div>

      <div style={pill}>{tr("stats.dashboardGlobal", "DASHBOARD GLOBAL")}</div>

      {/* carousel locals */}
      <div style={{ ...card, padding: "12px 14px" }}>
        <div style={row3}>
          <button
            style={{ ...btnRound, opacity: canPrev ? 1 : 0.25 }}
            disabled={!canPrev}
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
          >
            ‹
          </button>

          <div style={{ textAlign: "center", opacity: locals.length ? 1 : 0.6 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {selected?.name || tr("profiles.none", "Aucun profil.")}
            </div>
          </div>

          <button
            style={{ ...btnRound, opacity: canNext ? 1 : 0.25 }}
            disabled={!canNext}
            onClick={() => setIdx((v) => Math.min(locals.length - 1, v + 1))}
          >
            ›
          </button>
        </div>
      </div>

      {/* Moyenne */}
      <div style={metricCard}>
        <div style={metricLeft}>
          <div style={metricTitle}>{tr("stats.avgPtsTitle", "Moyenne (pts / lancer)")}</div>
          <div>
            <span style={metricValue}>{safeNum(stats.avgScore).toFixed(1)}</span>
            <span style={metricUnit}>pts</span>
          </div>
          <div style={metricSub}>{tr("stats.avgLabel", "Moyenne")}</div>
        </div>
        <div style={iconBox}>Ø</div>
      </div>

      {/* Best */}
      <div style={metricCard}>
        <div style={metricLeft}>
          <div style={metricTitle}>{tr("stats.bestTitle", "Meilleur score")}</div>
          <div>
            <span style={metricValue}>{Math.round(safeNum(stats.bestScore))}</span>
            <span style={metricUnit}>pts</span>
          </div>
          <div style={metricSub}>{tr("stats.record", "Record")}</div>
        </div>
        <div style={iconBox}>★</div>
      </div>

      {/* Details */}
      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{tr("stats.more", "Détails")}</div>
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          {tr("stats.avgDuration", "Durée moyenne")}: {"0:00"} • {tr("stats.avgTurns", "Tours moyens")}: {safeNum(stats.avgTurns).toFixed(1)}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{tr("stats.note", "Note")}</div>
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          {tr(
            "stats.localsHint",
            "Ici, seuls les profils locaux (hors profil actif) sont listés."
          )}
        </div>
      </div>
    </div>
  );
}
