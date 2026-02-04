// =============================================================
// src/pages/babyfoot/BabyFootGamesHub.tsx
// HUB Games — Baby-Foot (sport autonome)
// ✅ V2 UI: cartes en 1 colonne, plein largeur, même esprit que Pétanque/Darts (Games menus)
// - Watermark "ticker" masqué sur la droite (logo baby-foot par défaut)
// - Badges OK/BETA/WIP discrets
// - Aucune dépendance Darts/Pétanque/Pingpong
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import InfoDot from "../../components/InfoDot";
import BackDot from "../../components/BackDot";

import logoBabyFoot from "../../assets/games/logo-babyfoot.png";

type Section = "match" | "fun" | "defis" | "training" | "tournoi" | "stats";

type Props = {
  onBack: () => void;
  onSelect: (s: Section) => void;
};

type CardDef = {
  id: Section;
  title: string;
  subtitle: string;
  status: "OK" | "BETA" | "WIP";
  infoTitle: string;
  infoBody: string;
};

const CARDS: CardDef[] = [
  {
    id: "match",
    title: "MATCH",
    subtitle: "1v1 • 2v2 • 2v1",
    status: "OK",
    infoTitle: "Match",
    infoBody: "Modes de match local : 1v1, 2v2, 2v1. Sélection profils + score cible.",
  },
  {
    id: "training",
    title: "TRAINING",
    subtitle: "Match rapide • presets",
    status: "BETA",
    infoTitle: "Training",
    infoBody: "Presets rapides (score cible / chrono) pour enchaîner des matchs courts.",
  },
  {
    id: "fun",
    title: "FUN",
    subtitle: "Modes fun (preset)",
    status: "WIP",
    infoTitle: "Fun",
    infoBody: "À venir : variantes fun (golden goal, handicap, séries, etc.).",
  },
  {
    id: "defis",
    title: "DÉFIS",
    subtitle: "Challenges (preset)",
    status: "WIP",
    infoTitle: "Défis",
    infoBody: "À venir : challenges baby-foot (séries, objectifs, chrono, etc.).",
  },
  {
    id: "tournoi",
    title: "TOURNOI",
    subtitle: "Local • à venir",
    status: "WIP",
    infoTitle: "Tournoi",
    infoBody: "À venir : tournoi baby-foot local (poules / KO) dédié baby-foot.",
  },
  {
    id: "stats",
    title: "STATS",
    subtitle: "Résumé + historique",
    status: "OK",
    infoTitle: "Stats",
    infoBody: "Historique et résumé des matchs baby-foot (local).",
  },
];

export default function BabyFootGamesHub({ onBack, onSelect }: Props) {
  const { theme } = useTheme();

  const [info, setInfo] = React.useState<CardDef | null>(null);

  function renderWatermark() {
    // même esprit que PétanqueMenuGames: watermark masqué à droite
    const mask =
      "linear-gradient(90deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.70) 18%, rgba(0,0,0,1.00) 55%, rgba(0,0,0,1.00) 100%)";

    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "70%",
          pointerEvents: "none",
          opacity: 0.26,
          zIndex: 0,
          WebkitMaskImage: mask as any,
          maskImage: mask as any,
        }}
      >
        <img
          src={logoBabyFoot}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "right center",
            transform: "translateX(-6%) translateZ(0)",
            filter:
              "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))",
          }}
          draggable={false}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.42) 100%)",
            opacity: 0.55,
          }}
        />
      </div>
    );
  }

  function badgeStyle(status: CardDef["status"]) {
    const base: any = {
      position: "absolute",
      right: 12,
      top: 12,
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 900,
      letterSpacing: 0.8,
      fontSize: 11,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.20)",
      zIndex: 2,
    };
    if (status === "OK") return { ...base, color: "#d7ffef" };
    if (status === "BETA") return { ...base, color: "#ffe7ad" };
    return { ...base, color: "#ffb9b9" };
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Top bar (comme PetanqueMenuGames) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr 48px",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <BackDot onClick={onBack} />
        <div
          style={{
            textAlign: "center",
            fontWeight: 950,
            letterSpacing: 1,
            opacity: 0.95,
          }}
        >
          BABY-FOOT — GAMES
        </div>
        <InfoDot
          title="Baby-foot"
          body="Sport autonome. Menus dédiés. Local only."
          glow={theme.primary + "88"}
        />
      </div>

      {/* Hero (inchangé, mais cohérent) */}
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
          background: theme.card,
          padding: 14,
          marginBottom: 14,
          boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(800px 300px at 30% 10%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(600px 240px at 80% 90%, rgba(255,255,255,0.10), transparent 55%)",
            opacity: 0.75,
          }}
        />
        <img
          src={logoBabyFoot}
          alt="babyfoot"
          style={{ width: 84, height: 84, objectFit: "contain", position: "relative" }}
          draggable={false}
        />
        <div style={{ marginTop: 6, fontWeight: 950, letterSpacing: 1, position: "relative" }}>
          Choisis une catégorie
        </div>
        <div style={{ marginTop: 2, opacity: 0.75, fontWeight: 800, position: "relative" }}>
          Match • Fun • Défis • Training • Tournoi • Stats
        </div>
      </div>

      {/* ✅ LISTE PLEIN LARGEUR (comme Pétanque/Darts) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CARDS.map((c) => {
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                position: "relative",
                width: "100%",
                padding: 14,
                paddingRight: 54,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
              {/* Watermark "ticker" sur ~2/3 à droite */}
              {renderWatermark()}

              {/* Contenu */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: 0.9,
                    color: theme.primary,
                    textTransform: "uppercase",
                    textShadow: `0 0 12px ${theme.primary}55`,
                  }}
                >
                  {c.title}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft, fontWeight: 850, lineHeight: 1.35 }}>
                  {c.subtitle}
                </div>
              </div>

              {/* Badge status */}
              <div style={badgeStyle(c.status)}>{c.status}</div>

              {/* InfoDot à droite (style Petanque) */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 3,
                }}
              >
                <InfoDot
                  onClick={(ev: any) => {
                    try {
                      ev?.stopPropagation?.();
                      ev?.preventDefault?.();
                    } catch {}
                    setInfo(c);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal info (comme tes autres menus) */}
      {info && (
        <div
          onClick={() => setInfo(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>{info.infoTitle}</div>
              <button
                onClick={() => setInfo(null)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  fontWeight: 900,
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}>
              {info.infoBody}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
