// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuTraining.tsx
// Menu TRAINING — Baby-Foot (sport autonome)
//
// ✅ Clone strict du rendu BabyFootMenuMatch (style "Games DartsCounter"):
//   - Header ticker + BackDot à droite
//   - Cartes: fond sombre + ticker en "panneau" à droite (≈ 3/4 de la carte)
//   - Ticker = hauteur EXACTE de la carte (100%)
//   - Dégradé sur le bord GAUCHE du ticker pour laisser le titre lisible
//   - AUCUN texte visible sous les titres (tout passe dans InfoDot => modal)
// ✅ Tickers: /src/assets/tickers/ticker_babyfoot_*.png
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLang } from "../../../contexts/LangContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

import logoBabyFoot from "../../../assets/games/logo-babyfoot.png";

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../../assets/tickers/*.png", {
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

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

type TrainingId = "speed5" | "team_quick7" | "challenge_2v1";

type TrainingDef = {
  id: TrainingId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
  enabled: boolean;
  status: "OK" | "BETA" | "WIP";
  tickerId?: string | null;
};

const TRAININGS: TrainingDef[] = [
  {
    id: "speed5",
    titleKey: "babyfoot.training.speed5.title",
    titleDefault: "SPEED 5",
    subtitleKey: "babyfoot.training.speed5.subtitle",
    subtitleDefault: "Entraînement • vitesse • 5 cibles",
    infoTitleKey: "babyfoot.training.speed5.infoTitle",
    infoTitleDefault: "Speed 5",
    infoBodyKey: "babyfoot.training.speed5.infoBody",
    infoBodyDefault:
      "Training (Speed 5)\n" +
      "• Objectif: marquer sur 5 cibles / zones\n" +
      "• Focus: vitesse + précision\n" +
      "• Format court, idéal échauffement.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_training_speed5",
  },
  {
    id: "team_quick7",
    titleKey: "babyfoot.training.teamquick7.title",
    titleDefault: "TEAM QUICK 7",
    subtitleKey: "babyfoot.training.teamquick7.subtitle",
    subtitleDefault: "Coop • rapidité • 7 cibles",
    infoTitleKey: "babyfoot.training.teamquick7.infoTitle",
    infoTitleDefault: "Team Quick 7",
    infoBodyKey: "babyfoot.training.teamquick7.infoBody",
    infoBodyDefault:
      "Training (Team Quick 7)\n" +
      "• Coop (équipe)\n" +
      "• Objectif: 7 cibles / objectifs\n" +
      "• Focus: enchaînements rapides + coordination.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_training_teamquick7",
  },
  {
    id: "challenge_2v1",
    titleKey: "babyfoot.training.challenge2v1.title",
    titleDefault: "CHALLENGE 2V1",
    subtitleKey: "babyfoot.training.challenge2v1.subtitle",
    subtitleDefault: "Défi • 2v1 • objectif 6",
    infoTitleKey: "babyfoot.training.challenge2v1.infoTitle",
    infoTitleDefault: "Challenge 2v1",
    infoBodyKey: "babyfoot.training.challenge2v1.infoBody",
    infoBodyDefault:
      "Training (Challenge 2v1)\n" +
      "• Mode: 2v1\n" +
      "• Objectif: 6 (cible / score selon preset)\n" +
      "• Format challenge pour progresser en situation asymétrique.",
    enabled: true,
    status: "BETA",
    tickerId: "babyfoot_training_challenge2v1",
  },
];

const TICKER_Y: Partial<Record<TrainingId, number>> = {
  speed5: 50,
  team_quick7: 50,
  challenge_2v1: 50,
};

export default function BabyFootMenuTraining({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoTraining, setInfoTraining] = React.useState<TrainingDef | null>(null);

  function navigate(id: TrainingId) {
    // ⚠️ Les presets exacts peuvent être rebranchés plus tard.
    // Ici on conserve un payload simple et stable.
    if (id === "speed5") {
      return go("babyfoot_config", { presetTraining: "speed5", presetMode: "1v1" });
    }
    if (id === "team_quick7") {
      return go("babyfoot_config", { presetTraining: "teamquick7", presetMode: "2v2" });
    }
    return go("babyfoot_config", { presetTraining: "challenge2v1", presetMode: "2v1" });
  }

  const cardHeight = 86;
  const tickerPanelW = "76%";
  const leftFade =
    "linear-gradient(90deg, rgba(10,10,14,0.98) 0%, rgba(10,10,14,0.86) 35%, rgba(10,10,14,0.55) 60%, rgba(10,10,14,0.00) 100%)";
  const tickerLeftEdgeFade =
    "linear-gradient(90deg, rgba(10,10,14,0.92) 0%, rgba(10,10,14,0.72) 38%, rgba(10,10,14,0.25) 70%, rgba(10,10,14,0.00) 100%)";

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
          src={getTicker("babyfoot_training") || logoBabyFoot}
          alt="Baby-Foot — Training"
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
          <BackDot onClick={onBack} />
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
        {t("babyfoot.training.subtitle", "Choisis un entraînement")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TRAININGS.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;
          const src = getTicker(m.tickerId) || logoBabyFoot;
          const y = TICKER_Y[m.id] ?? 50;

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.id)}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled ? "none" : "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", height: cardHeight, width: "100%" }}>
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: "100%",
                    width: tickerPanelW,
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                >
                  <img
                    src={src}
                    alt={title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `50% ${y}%`,
                      opacity: 0.95,
                      transform: "translateZ(0)",
                    }}
                    draggable={false}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: "42%",
                      background: tickerLeftEdgeFade,
                    }}
                  />
                </div>

                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "64%",
                    background: leftFade,
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 2,
                    maxWidth: "44%",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 1000,
                      letterSpacing: 0.9,
                      color: theme.primary,
                      textTransform: "uppercase",
                      textShadow: `0 0 12px ${theme.primary}55, 0 8px 24px rgba(0,0,0,0.70)`,
                      lineHeight: 1.05,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {title}
                  </div>
                </div>

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
                    onClick={(e: any) => {
                      try {
                        e?.stopPropagation?.();
                        e?.preventDefault?.();
                      } catch {}
                      setInfoTraining(m);
                    }}
                    glow={theme.primary + "88"}
                  />
                </div>

                <span style={{ position: "absolute", left: -9999, top: -9999 }}>
                  {title} — {subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {infoTraining && (
        <div
          onClick={() => setInfoTraining(null)}
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
              maxWidth: 560,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {t(infoTraining.infoTitleKey, infoTraining.infoTitleDefault)}
              </div>
              <button
                onClick={() => setInfoTraining(null)}
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

            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: theme.textSoft, fontWeight: 800 }}>
              {t(infoTraining.subtitleKey, infoTraining.subtitleDefault)}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.5,
                color: theme.textSoft,
                whiteSpace: "pre-line",
              }}
            >
              {t(infoTraining.infoBodyKey, infoTraining.infoBodyDefault)}
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
              {infoTraining.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
