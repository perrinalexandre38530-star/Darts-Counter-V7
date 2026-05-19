// =============================================================
// src/pages/babyfoot/BabyFootCompetitionHome.tsx
// Accueil Compétition Baby-Foot — Tournoi + Ligue
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import logoBabyFoot from "../../assets/games/logo-babyfoot.png";

const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(new Set([
    norm,
    norm.replace(/\s+/g, "_"),
    norm.replace(/\s+/g, "-"),
    norm.replace(/-/g, "_"),
    norm.replace(/_/g, "-"),
    norm.replace(/[^a-z0-9_\-]/g, ""),
  ])).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

type Props = { go: (tab: any, params?: any) => void };

export default function BabyFootCompetitionHome({ go }: Props) {
  const { theme } = useTheme() as any;

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 92, background: theme.bg, color: theme.text }}>
      <div style={{ position: "relative", width: "100%", marginBottom: 14 }}>
        <img
          src={getTicker("babyfoot_competition") || getTicker("babyfoot_tournoi") || getTicker("babyfoot_ligue") || logoBabyFoot}
          alt="Compétition Baby-Foot"
          style={{ width: "100%", aspectRatio: "800 / 230", height: "auto", objectFit: "contain", background: "#05070c", borderRadius: 16, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, opacity: 0.9, boxShadow: "0 10px 26px rgba(0,0,0,.35)" }}
          draggable={false}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <BackDot onClick={() => go("home")} />
          <InfoDot
            title="COMPÉTITION"
            content={
              <div style={{ display: "grid", gap: 12, lineHeight: 1.35 }}>
                <div>
                  <strong>TOURNOI</strong><br />
                  Poules, élimination directe et tableau final Baby-Foot.
                </div>
                <div>
                  <strong>LIGUE</strong><br />
                  Saison avec calendrier ou championnat infini amical. Le mode ÉQUIPE regroupe 2v2 et 2v1 ; le mode SOLO reste en 1v1.
                </div>
                <div style={{ opacity: 0.8 }}>
                  Les matchs simples restent dans Local &gt; Match.
                </div>
              </div>
            }
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <CompetitionCard
          theme={theme}
          title="TOURNOI"
          tickerId="babyfoot_tournoi"
          onClick={() => go("tournaments" as any, { forceMode: "babyfoot", openTournamentModule: true })}
        />
        <CompetitionCard
          theme={theme}
          title="LIGUE"
          tickerId="babyfoot_ligue"
          onClick={() => go("babyfoot_league" as any)}
        />
      </div>
    </div>
  );
}

function CompetitionCard({ theme, title, tickerId, onClick }: any) {
  const src = getTicker(tickerId) || logoBabyFoot;
  return (
    <button onClick={onClick} style={{ position: "relative", width: "100%", padding: 0, textAlign: "left", borderRadius: 18, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: theme.card ?? "rgba(255,255,255,.06)", color: theme.text, overflow: "hidden", cursor: "pointer", boxShadow: "0 14px 30px rgba(0,0,0,.42)" }}>
      <div style={{ position: "relative", aspectRatio: "800 / 185", width: "100%", overflow: "hidden" }}>
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            right: "-32%",
            top: 0,
            height: "100%",
            width: "132%",
            objectFit: "contain",
            objectPosition: "center",
            opacity: 0.96,
          }}
          draggable={false}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,8,12,.99) 0%, rgba(8,8,12,.88) 30%, rgba(8,8,12,.58) 58%, rgba(8,8,12,.08) 100%)" }} />
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", maxWidth: "56%" }}>
          <div style={{ fontSize: 20, fontWeight: 1000, color: theme.primary, letterSpacing: 1, textShadow: `0 0 18px ${theme.primary}55` }}>{title}</div>
        </div>
      </div>
    </button>
  );
}
