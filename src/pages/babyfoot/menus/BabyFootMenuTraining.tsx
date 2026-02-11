// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuTraining.tsx
// Menu TRAINING — Baby-Foot (sport autonome)
//
// ✅ UI (Games-style cards):
//   - header ticker + BackDot à droite
//   - cartes : ticker occupe ~3/4 à droite + dégradé à gauche pour laisser le titre lisible
//   - le texte intégré dans le ticker reste lisible (image à hauteur de carte)
//   - infos/règles maximales via InfoDot (modal)
// ✅ Tickers: /src/assets/tickers/ticker_babyfoot_training_*.png
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

type PresetId = "speed5" | "teamquick7" | "challenge2v1";

type PresetDef = {
  id: PresetId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  target: number;
  tickerId: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
};

const PRESETS: PresetDef[] = [
  {
    id: "speed5",
    titleKey: "babyfoot.training.speed5.title",
    titleDefault: "SPEED 5",
    subtitleKey: "babyfoot.training.speed5.subtitle",
    subtitleDefault: "1v1 — premier à 5",
    target: 5,
    tickerId: "babyfoot_training_speed5",
    infoTitleKey: "babyfoot.training.speed5.infoTitle",
    infoTitleDefault: "Speed 5",
    infoBodyKey: "babyfoot.training.speed5.infoBody",
    infoBodyDefault:
      "Objectif\n" +
      "• Match rapide : premier à 5 buts.\n\n" +
      "Règles\n" +
      "• 1v1 (1 profil par équipe).\n" +
      "• But = +1.\n" +
      "• Fin immédiate à 5.\n\n" +
      "Conseils\n" +
      "• Idéal pour échauffement / séries courtes.\n" +
      "• Active l'historique si tu veux suivre tes perfs.",
  },
  {
    id: "teamquick7",
    titleKey: "babyfoot.training.teamquick7.title",
    titleDefault: "TEAM QUICK 7",
    subtitleKey: "babyfoot.training.teamquick7.subtitle",
    subtitleDefault: "2v2 — premier à 7",
    target: 7,
    tickerId: "babyfoot_training_teamquick7",
    infoTitleKey: "babyfoot.training.teamquick7.infoTitle",
    infoTitleDefault: "Team Quick 7",
    infoBodyKey: "babyfoot.training.teamquick7.infoBody",
    infoBodyDefault:
      "Objectif\n" +
      "• Match rapide en équipes : premier à 7 buts.\n\n" +
      "Règles\n" +
      "• 2v2 (4 profils).\n" +
      "• But = +1.\n" +
      "• Fin immédiate à 7.\n\n" +
      "Conseils\n" +
      "• Parfait pour enchaîner des manches courtes.\n" +
      "• Active l'historique pour stats d'équipes/duels.",
  },
  {
    id: "challenge2v1",
    titleKey: "babyfoot.training.challenge2v1.title",
    titleDefault: "CHALLENGE 2V1",
    subtitleKey: "babyfoot.training.challenge2v1.subtitle",
    subtitleDefault: "2v1 — premier à 6",
    target: 6,
    tickerId: "babyfoot_training_challenge2v1",
    infoTitleKey: "babyfoot.training.challenge2v1.infoTitle",
    infoTitleDefault: "Challenge 2v1",
    infoBodyKey: "babyfoot.training.challenge2v1.infoBody",
    infoBodyDefault:
      "Objectif\n" +
      "• Défi asymétrique : une équipe de 2 contre 1 joueur.\n\n" +
      "Règles\n" +
      "• 2v1 (2 profils vs 1 profil).\n" +
      "• But = +1.\n" +
      "• Fin à 6 buts.\n\n" +
      "Conseils\n" +
      "• Idéal pour équilibrer un écart de niveau.\n" +
      "• Le solo peut viser la précision; le duo la construction.",
  },
];

export default function BabyFootMenuTraining({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoPreset, setInfoPreset] = React.useState<PresetDef | null>(null);

  function startPreset(preset: PresetDef) {
    // 🔧 On reste compatible avec tes pages existantes :
    // tu pourras rerouter plus tard vers un vrai "training_play".
    // Pour l'instant on passe par babyfoot_config avec un preset simple.
    go("babyfoot_config", {
      mode: preset.id,
      meta: { kind: "training", target: preset.target, preset: preset.id },
    });
  }

  const cardHeight = 86;

  // Dégradé gauche : laisse le titre thème lisible (comme Games darts/pétanque)
  const leftFade =
    "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 40%, rgba(0,0,0,0.40) 70%, rgba(0,0,0,0.00) 100%)";
  // Dégradé droite : contraste pour la zone InfoDot / pill
  const rightFade =
    "linear-gradient(270deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.00) 100%)";

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
      {/* HEADER TICKER */}
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

        {/* BackDot à droite */}
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

      {/* TEXTE */}
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

      {/* CARTES — rendu Games-style : ticker à droite sur ~3/4 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PRESETS.map((p) => {
          const title = t(p.titleKey, p.titleDefault);
          const subtitle = t(p.subtitleKey, p.subtitleDefault);
          const src = getTicker(p.tickerId) || logoBabyFoot;

          return (
            <button
              key={p.id}
              onClick={() => startPreset(p)}
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
              {/* ticker (hauteur = carte) + placement ~3/4 à droite */}
              <div style={{ position: "relative", width: "100%", height: cardHeight }}>
                <img
                  src={src}
                  alt={title}
                  style={{
                    position: "absolute",
                    // ✅ rendu identique aux cartes "Games" :
                    // - le ticker occupe ~3/4 de la carte (décalage 1/4 à droite)
                    // - hauteur strictement = hauteur de la carte
                    // - on évite le sur-crop vertical
                    inset: 0,
                    width: "128%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "50% 50%",
                    transform: "translateZ(0)",
                  }}
                  draggable={false}
                />

                {/* dégradé gauche (titre lisible) */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "72%",
                    background: leftFade,
                    pointerEvents: "none",
                  }}
                />
                {/* dégradé droite (zone actions) */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: "100%",
                    width: "38%",
                    background: rightFade,
                    pointerEvents: "none",
                    opacity: 0.95,
                  }}
                />
              </div>

              {/* Titre à gauche (couleur thème) */}
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  maxWidth: "56%",
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

              {/* Pill TARGET (comme Training darts) */}
              <div
                style={{
                  position: "absolute",
                  right: 46,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 3,
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontWeight: 950,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: theme.text,
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              >
                {t("babyfoot.training.target", "TARGET")} {p.target}
              </div>

              {/* InfoDot */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 4,
                }}
              >
                <InfoDot
                  onClick={(e: any) => {
                    try {
                      e?.stopPropagation?.();
                      e?.preventDefault?.();
                    } catch {}
                    setInfoPreset(p);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>

              {/* Texte invisible (accessibilité) */}
              <span style={{ position: "absolute", left: -9999, top: -9999 }}>
                {title} — {subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* MODAL — infos/règles */}
      {infoPreset && (
        <div
          onClick={() => setInfoPreset(null)}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {t(infoPreset.infoTitleKey, infoPreset.infoTitleDefault)}
              </div>
              <button
                onClick={() => setInfoPreset(null)}
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
              {t(infoPreset.subtitleKey, infoPreset.subtitleDefault)}
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
              {t(infoPreset.infoBodyKey, infoPreset.infoBodyDefault)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
