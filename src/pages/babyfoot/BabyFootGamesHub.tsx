// =============================================================
// src/pages/babyfoot/BabyFootGamesHub.tsx
// HUB Games — Baby-Foot (sport autonome)
// ✅ UI V3: cartes = tickers FULL WIDTH (sans titres/annotations visibles)
// ✅ Détails intégrés via InfoDot sur chaque carte (ouvre modal)
// ✅ Header: ticker + BackDot à droite (InfoDot header retiré)
// ✅ Texte: "Choisir une catégorie" entre le header et les cartes
// ✅ Tickers: /src/assets/tickers/ticker_babyfoot_*.png
// ❌ TOURNOI + STATS exclus du GameHub
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import logoBabyFoot from "../../assets/games/logo-babyfoot.png";

// ✅ Tickers images (Vite) — même logique que Games/Pétanque
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

// ✅ Sections DISPONIBLES dans le GameHub (catégories uniquement)
type Section = "match" | "fun" | "defis" | "training";

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
  tickerId?: string | null;
};

// ✅ GameHub = catégories (PAS de modes 1v1 / 2v2 ici)
const CARDS: CardDef[] = [
  {
    id: "match",
    title: "MATCH",
    subtitle: "1v1 • 2v2 • 2v1",
    status: "OK",
    infoTitle: "Match",
    infoBody:
      "Accès aux matchs baby-foot locaux. Choix des équipes et du mode (1v1, 2v2, 2v1).",
    tickerId: "babyfoot_match",
  },
  {
    id: "training",
    title: "TRAINING",
    subtitle: "Match rapide • presets",
    status: "BETA",
    infoTitle: "Training",
    infoBody:
      "Presets rapides (score cible, chrono) pour s’entraîner efficacement.",
    tickerId: "babyfoot_training",
  },
  {
    id: "fun",
    title: "FUN",
    subtitle: "Modes fun (preset)",
    status: "WIP",
    infoTitle: "Fun",
    infoBody: "Variantes fun à venir : golden goal, handicaps, défis rapides.",
    tickerId: "babyfoot_fun",
  },
  {
    id: "defis",
    title: "DÉFIS",
    subtitle: "Challenges (preset)",
    status: "WIP",
    infoTitle: "Défis",
    infoBody: "Challenges baby-foot à objectifs (séries, précision, chrono).",
    tickerId: "babyfoot_defis",
  },
];

export default function BabyFootGamesHub({ onBack, onSelect }: Props) {
  const { theme } = useTheme();
  const [info, setInfo] = React.useState<CardDef | null>(null);

  // ✅ Back doit retourner sur Home (BabyFoot)
  // (fallback hash pour sécuriser en Stackblitz / HashRouter)
  function goHome() {
    try {
      // priorité : navigation parent
      onBack?.();
    } catch {}
    try {
      // fallback hard : Home babyfoot
      if (typeof window !== "undefined") {
        const h = String(window.location.hash || "");
        // si on est déjà dans babyfoot, on force la racine babyfoot
        if (!h.includes("babyfoot") || !h.endsWith("/babyfoot")) {
          window.location.hash = "#/babyfoot";
        }
      }
    } catch {}
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
      {/* HEADER TICKER (sans InfoDot) */}
      <div style={{ position: "relative", width: "100%", marginBottom: 10 }}>
        <img
          src={getTicker("babyfoot_games") || logoBabyFoot}
          alt="Baby-Foot — Games"
          style={{
            width: "100%",
            height: 90,
            objectFit: "cover",
            borderRadius: 14,
            border: `1px solid ${
              theme.borderSoft ?? "rgba(255,255,255,0.14)"
            }`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
          }}
          draggable={false}
        />

        {/* BackDot à droite (à la place du i du header) */}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <BackDot onClick={goHome} />
        </div>
      </div>

      {/* TEXTE ENTRE HEADER ET CARTES */}
      <div
        style={{
          margin: "4px 0 12px",
          textAlign: "center",
          fontWeight: 950,
          letterSpacing: 0.8,
          color: theme.textSoft,
          textShadow: "0 6px 18px rgba(0,0,0,0.45)",
          opacity: 0.95,
        }}
      >
        Choisir une catégorie
      </div>

      {/* CARTES = TICKERS FULL WIDTH (sans titres/annotations visibles) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CARDS.map((c) => {
          const src = getTicker(c.tickerId) || logoBabyFoot;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${
                  theme.borderSoft ?? "rgba(255,255,255,0.14)"
                }`,
                background: theme.card,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
              {/* ticker full width */}
              <img
                src={src}
                alt={c.title}
                style={{
                  width: "100%",
                  height: 86,
                  display: "block",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
                draggable={false}
              />

              {/* Détail intégré dans la carte (InfoDot) */}
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

      {/* MODAL DÉTAILS */}
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
              border: `1px solid ${
                theme.borderSoft ?? "rgba(255,255,255,0.14)"
              }`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {info.infoTitle}
              </div>
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

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
                color: theme.textSoft,
                fontWeight: 800,
              }}
            >
              {info.subtitle}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
                color: theme.textSoft,
              }}
            >
              {info.infoBody}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.18)",
                padding: "6px 10px",
                borderRadius: 999,
                fontWeight: 950,
                letterSpacing: 0.6,
                fontSize: 11,
              }}
            >
              {info.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
