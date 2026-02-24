// ============================================
// src/pages/molkky/MolkkyMenuGames.tsx
// Menu MÖLKKY — même UX que Ping-Pong/Baby-Foot/Pétanque
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

function getTickerFromCandidates(ids: Array<string | null | undefined>) {
  for (const id of ids) {
    const src = getTicker(id);
    if (src) return src;
  }
  return null;
}

type Props = {
  go: (tab: any, params?: any) => void;
};

export default function MolkkyMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const headerTicker = React.useMemo(
    () => getTickerFromCandidates(["molkky_games", "molkky", "petanque_games", "games"]),
    []
  );

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("games")} />
        <div style={topTitle(theme)}>{""}</div>
        <InfoDot
          onClick={() => {
            alert(
              "MÖLKKY — Règles rapides\n\n• 1 quille : points = numéro\n• Plusieurs quilles : points = nombre de quilles\n• Objectif : 50 EXACT\n• Si dépassement : retour à 25 (option)\n• 3 MISS consécutifs : élimination (option)"
            );
          }}
        />
      </div>

      {headerTicker ? (
        <div style={{ ...tickerWrap, backgroundImage: `url(${headerTicker})` }} />
      ) : (
        <div style={{ ...fallbackHeader(theme) }}>MÖLKKY</div>
      )}

      <div style={grid}>
        <button style={cardBtn(theme)} onClick={() => go("molkky_config")}>{
          t?.("Nouvelle partie") ?? "NOUVELLE PARTIE"
        }</button>

        <button style={cardBtn(theme)} onClick={() => go("molkky_stats")}>{
          t?.("Statistiques") ?? "STATISTIQUES"
        }</button>

        <button style={cardBtn(theme)} onClick={() => go("molkky_stats_history")}>{
          t?.("Historique") ?? "HISTORIQUE"
        }</button>

        <button style={cardBtn(theme)} onClick={() => go("molkky_stats_leaderboards")}>{
          t?.("Classements") ?? "CLASSEMENTS"
        }</button>
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

const topRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle = (theme: any): React.CSSProperties => ({
  textAlign: "center",
  fontWeight: 900,
  letterSpacing: 1,
  color: theme?.colors?.text ?? "#fff",
  opacity: 0.95,
});

const tickerWrap: React.CSSProperties = {
  width: "100%",
  height: 140,
  borderRadius: 18,
  backgroundSize: "cover",
  backgroundPosition: "center",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
  marginBottom: 12,
};

const fallbackHeader = (theme: any): React.CSSProperties => ({
  width: "100%",
  height: 140,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 1000,
  letterSpacing: 2,
  fontSize: 28,
});

const grid: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const cardBtn = (theme: any): React.CSSProperties => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1000,
  letterSpacing: 1,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});
