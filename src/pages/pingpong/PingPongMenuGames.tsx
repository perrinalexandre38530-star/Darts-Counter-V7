// =============================================================
// src/pages/pingpong/PingPongMenuGames.tsx
// Menu GAMES Ping-Pong — même UX que BabyFootMenuMatch (cartes plein largeur + tickers)
// ✅ Modes: 1v1 / 2v2 / 2v1 / Tournante / Training
// ✅ Header: ticker_pingpong_games (image) + BackDot à gauche (retour Accueil/Games)
// =============================================================

import React from "react";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

// ✅ Tickers images (Vite) — inclut aussi les sous-dossiers si tu en as
const TICKERS = import.meta.glob("../../assets/tickers/**/*.png", {
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
    const suffixB = `/${c}.png`;

    for (const [path, url] of Object.entries(TICKERS)) {
      const p = path.toLowerCase();
      if (p.endsWith(suffixA) || p.endsWith(suffixB)) return url;
    }
  }
  return null;
}

type Props = {
  go: (tab: any, params?: any) => void;
};

type ModeDef = {
  id: string;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
  enabled: boolean;
  tickerId: string; // sans "ticker_" et sans extension
  route: { tab: string; params: any };
};

const MODES: ModeDef[] = [
  {
    id: "pp_1v1",
    titleKey: "pingpong.modes.1v1.title",
    titleDefault: "1V1",
    subtitleKey: "pingpong.modes.1v1.subtitle",
    subtitleDefault: "1v1 — un joueur par côté.",
    infoTitleKey: "pingpong.modes.1v1.infoTitle",
    infoTitleDefault: "Match 1v1",
    infoBodyKey: "pingpong.modes.1v1.infoBody",
    infoBodyDefault: "Partie classique 1 contre 1 (un set direct).",
    enabled: true,
    tickerId: "pingpong_1v1",
    route: { tab: "pingpong_config", params: { mode: "simple", format: "1v1" } },
  },
  {
    id: "pp_2v2",
    titleKey: "pingpong.modes.2v2.title",
    titleDefault: "2V2",
    subtitleKey: "pingpong.modes.2v2.subtitle",
    subtitleDefault: "2v2 — deux joueurs par côté.",
    infoTitleKey: "pingpong.modes.2v2.infoTitle",
    infoTitleDefault: "Match 2v2",
    infoBodyKey: "pingpong.modes.2v2.infoBody",
    infoBodyDefault: "Partie équipes 2 contre 2.",
    enabled: true,
    tickerId: "pingpong_2v2",
    route: { tab: "pingpong_config", params: { mode: "simple", format: "2v2" } },
  },
  {
    id: "pp_2v1",
    titleKey: "pingpong.modes.2v1.title",
    titleDefault: "2V1",
    subtitleKey: "pingpong.modes.2v1.subtitle",
    subtitleDefault: "2v1 — avantage numérique.",
    infoTitleKey: "pingpong.modes.2v1.infoTitle",
    infoTitleDefault: "Match 2v1",
    infoBodyKey: "pingpong.modes.2v1.infoBody",
    infoBodyDefault: "Partie asymétrique 2 contre 1.",
    enabled: true,
    tickerId: "pingpong_2v1",
    route: { tab: "pingpong_config", params: { mode: "simple", format: "2v1" } },
  },
  {
    id: "pp_tournante",
    titleKey: "pingpong.modes.tournante.title",
    titleDefault: "Tournante",
    subtitleKey: "pingpong.modes.tournante.subtitle",
    subtitleDefault: "Joueurs illimités — 1 éliminé à chaque tour.",
    infoTitleKey: "pingpong.modes.tournante.infoTitle",
    infoTitleDefault: "Tournante",
    infoBodyKey: "pingpong.modes.tournante.infoBody",
    infoBodyDefault: "Mode club : une file de joueurs, duel, éliminations successives.",
    enabled: true,
    tickerId: "pingpong_tournante",
    route: { tab: "pingpong_config", params: { mode: "tournante" } },
  },
  {
    id: "pp_training",
    titleKey: "pingpong.modes.training.title",
    titleDefault: "Training",
    subtitleKey: "pingpong.modes.training.subtitle",
    subtitleDefault: "Entraînement — stats et séries.",
    infoTitleKey: "pingpong.modes.training.infoTitle",
    infoTitleDefault: "Training",
    infoBodyKey: "pingpong.modes.training.infoBody",
    infoBodyDefault: "Mode entraînement (work-in-progress) — démarre une session simple.",
    enabled: true,
    tickerId: "pingpong_training",
    route: { tab: "pingpong_config", params: { mode: "simple", format: "training", training: true } },
  },
];

export default function PingPongMenuGames({ go }: Props) {
  const { t } = useLang();

const tr = (key: string, fallback: string) => {
  const v = t?.(key);
  return v && v !== key ? v : fallback;
};


  const onBack = () => go("games");

  const headerTicker = getTicker("pingpong_games");

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header ticker (remplace le texte) */}
      {headerTicker ? (
        <div
          style={{ position: "relative", width: "100%", marginBottom: 14, background: "rgba(0,0,0,0.65)", aspectRatio: "800 / 230", overflow: "hidden" }}
        >
          <img
            src={headerTicker}
            alt="Ping-Pong Games"
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
          />

          {/* BackDot extrême gauche */}
          <div style={{ position: "absolute", left: 10, top: 10, zIndex: 2 }}>
            <BackDot onClick={onBack} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <BackDot onClick={onBack} />
          <div style={{ fontWeight: 950, letterSpacing: 1, opacity: 0.95 }}>PING-PONG — GAMES</div>
        </div>
      )}

      <div style={{ padding: 14 }}>
        {/* Cards (plein largeur) */}
        <div style={{ display: "grid", gap: 12 }}>
        {MODES.filter((m) => m.enabled).map((m) => {
          const ticker = getTicker(m.tickerId);
          return (
            <div
              key={m.id}
              style={{
                position: "relative",
                width: "100%",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 10px 28px rgba(0,0,0,.55)",
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(12,14,20,.55)",
                cursor: "pointer",
              }}
              onClick={() => go(m.route.tab, m.route.params)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") go(m.route.tab, m.route.params);
              }}
            >              {/* Ticker background (inset + safe zone à droite pour InfoDot) */}
              {ticker ? (
                <>
                  <img
                    src={ticker}
                    alt={m.titleDefault}
                    style={{
                      position: "absolute",
                      top: 10,
                      bottom: 10,
                      left: 10,
                      right: 74, // réserve pour le bouton i
                      objectFit: "cover",
                      objectPosition: "center",
                      filter: "saturate(1.05)",
                      opacity: 0.98,
                      borderRadius: 14,
                    }}
                  />

                  {/* Fade pour ne pas coller aux bords + lisibilité */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,.60) 0%, rgba(0,0,0,.18) 52%, rgba(0,0,0,0) 70%, rgba(0,0,0,.85) 100%)",
                    }}
                  />

                  {/* Zone droite dédiée au bouton InfoDot (évite de recouvrir le texte du ticker) */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: 86,
                      background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(6,8,12,.92) 85%)",
                    }}
                  />
                </>
              ) : null}

              {/* Label minimal (seul texte en code) */}
              <div style={{ position: "relative", padding: "16px 96px 16px 18px" }}>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: 1, textTransform: "uppercase" }}>
                  {m.titleDefault}
                </div>
              </div>

              {/* InfoDot en bout */}
              <div
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 3,
                }}
              >
                <InfoDot title={tr(m.infoTitleKey, m.infoTitleDefault)} body={tr(m.infoBodyKey, m.infoBodyDefault)} />
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Safe bottom padding vs bottom nav */}
      <div style={{ height: 80 }} />
    </div>
  );
}
