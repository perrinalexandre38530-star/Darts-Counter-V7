// =============================================================
// src/pages/babyfoot/BabyFootGamesHub.tsx
// HUB Games — Baby-Foot (sport autonome)
// ❌ ÉQUIPES retiré du GameHub (reste UNIQUEMENT dans PROFILS)
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

  function goHome() {
    try {
      onBack?.();
    } catch {}
    try {
      if (typeof window !== "undefined") {
        const h = String(window.location.hash || "");
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
      <div style={{ position: "relative", width: "100%", marginBottom: 10 }}>
        <img
          src={getTicker("babyfoot_games") || logoBabyFoot}
          alt="Baby-Foot — Games"
          style={{
            width: "100%",
            height: 90,
            objectFit: "cover",
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
          }}
          draggable={false}
        />
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
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
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
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>{info.infoTitle}</div>
              <button onClick={() => setInfo(null)}>OK</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: theme.textSoft }}>
              {info.infoBody}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
