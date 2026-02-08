// =============================================================
// src/pages/pingpong/PingPongStatsShell.tsx
// Stats Ping-Pong (LOCAL ONLY)
// - Shell: résumé + accès historique
// - Source: store.history (pushPingPongHistory dans App.tsx)
// =============================================================

import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
};

type ModeKey = "simple" | "sets" | "tournante" | "training" | "unknown";

function inferMode(r: any): ModeKey {
  const p = r?.payload || r || {};
  const m = (p?.mode ?? p?.state?.mode ?? p?.payload?.mode) as any;
  if (!m) return "unknown";
  const mm = String(m).toLowerCase();
  if (mm.includes("tourn")) return "tournante";
  if (mm.includes("train")) return "training";
  if (mm.includes("set")) return "sets";
  if (mm.includes("simple") || mm.includes("match")) return "simple";
  return "unknown";
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

export default function PingPongStatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const stats = useMemo(() => {
    const raw = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "pingpong");
    const byMode: Record<ModeKey, number> = { simple: 0, sets: 0, tournante: 0, training: 0, unknown: 0 };

    let lastTitle = "";
    let lastWhen = 0;

    for (const r of raw) {
      const when = Number(r.updatedAt || r.createdAt) || 0;
      if (when > lastWhen) {
        lastWhen = when;
        lastTitle = r?.summary?.title || r?.payload?.summary?.title || "";
      }

      const mk = inferMode(r);
      byMode[mk] = (byMode[mk] || 0) + 1;
    }

    return {
      total: raw.length,
      byMode,
      lastWhen,
      lastTitle,
    };
  }, [store]);

  const accent = theme?.primary ?? "#6EB4FF";

  return (
    <div style={wrap(theme)}>
      <div style={titleRow}>
        <div style={title}>{t("pingpong.stats.title", "STATS — PING-PONG")}</div>
        <div style={{ ...pill(theme), borderColor: accent + "55", color: accent }}>
          {t("pingpong.stats.localOnly", "LOCAL")}
        </div>
      </div>

      {/* Résumé */}
      <div style={panel(theme)}>
        <div style={panelTitle}>{t("pingpong.stats.summary", "Résumé")}</div>

        <div style={kpiGrid}>
          <div style={kpiCard(theme)}>
            <div style={kpiLabel}>{t("pingpong.stats.total", "Matchs enregistrés")}</div>
            <div style={{ ...kpiValue, color: accent }}>{stats.total}</div>
          </div>

          <div style={kpiCard(theme)}>
            <div style={kpiLabel}>{t("pingpong.stats.simple", "Match simple")}</div>
            <div style={kpiValue}>{stats.byMode.simple}</div>
          </div>

          <div style={kpiCard(theme)}>
            <div style={kpiLabel}>{t("pingpong.stats.sets", "Match en sets")}</div>
            <div style={kpiValue}>{stats.byMode.sets}</div>
          </div>

          <div style={kpiCard(theme)}>
            <div style={kpiLabel}>{t("pingpong.stats.tournante", "Tournante")}</div>
            <div style={kpiValue}>{stats.byMode.tournante}</div>
          </div>
        </div>

        {stats.lastWhen ? (
          <div style={{ marginTop: 10, fontWeight: 850, opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>{t("pingpong.stats.last", "Dernier match :")}</span>{" "}
            {stats.lastTitle || new Date(stats.lastWhen).toLocaleString()}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontWeight: 800, opacity: 0.75 }}>
            {t("pingpong.stats.none", "Aucun match enregistré pour le moment.")}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={grid}>
        <button style={card(theme)} onClick={() => go("pingpong_stats_history")}>
          <div style={cardTitle}>{t("pingpong.stats.history", "Historique")}</div>
          <div style={cardSub}>{t("pingpong.stats.historySub", "Tous les matchs (local) + recherche")}</div>
        </button>

        <button style={card(theme)} onClick={() => go("home")}>
          <div style={cardTitle}>{t("pingpong.stats.back", "Retour")}</div>
          <div style={cardSub}>{t("pingpong.stats.backSub", "Accueil Ping-Pong")}</div>
        </button>
      </div>
    </div>
  );
}

function wrap(theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: 14,
    paddingBottom: 90,
    color: theme?.text ?? theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
  };
}

const titleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 12,
};

const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 0.7 };

function pill(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${theme?.border ?? "rgba(255,255,255,0.18)"}`,
    background: theme?.card ?? "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.3,
  };
}

function panel(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    marginBottom: 12,
  };
}

const panelTitle: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.4, fontSize: 15, marginBottom: 10 };

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

function kpiCard(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
  };
}

const kpiLabel: React.CSSProperties = { fontSize: 12, fontWeight: 850, opacity: 0.78, letterSpacing: 0.2 };
const kpiValue: React.CSSProperties = { marginTop: 6, fontSize: 20, fontWeight: 1000, letterSpacing: 0.4 };

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
  gap: 12,
};

function card(theme: any): React.CSSProperties {
  return {
    textAlign: "left",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    cursor: "pointer",
  };
}

const cardTitle: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.4, fontSize: 16 };
const cardSub: React.CSSProperties = { marginTop: 6, opacity: 0.8, fontWeight: 800, fontSize: 12, lineHeight: 1.35 };
