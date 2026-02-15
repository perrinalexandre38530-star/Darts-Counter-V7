// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuFun.tsx
// Menu FUN — Baby-Foot (sport autonome)
//
// ✅ Clone strict du rendu BabyFootMenuMatch (style "Games DartsCounter"):
//   - Header ticker + BackDot à droite (pas de InfoDot header)
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

type ModeId = "classic9" | "golden_goal" | "handicap_2v1" | "sets_bo3";

type ModeDef = {
  id: ModeId;
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

const MODES: ModeDef[] = [
  {
    id: "classic9",
    titleKey: "babyfoot.fun.classic9.title",
    titleDefault: "CLASSIC 9",
    subtitleKey: "babyfoot.fun.classic9.subtitle",
    subtitleDefault: "Preset jouable • 1v1 • premier à 9",
    infoTitleKey: "babyfoot.fun.classic9.infoTitle",
    infoTitleDefault: "Classic 9",
    infoBodyKey: "babyfoot.fun.classic9.infoBody",
    infoBodyDefault:
      "Preset FUN (Classic 9)\n" +
      "• Mode: 1v1\n" +
      "• Objectif: 9 buts\n" +
      "• Idéal pour une partie rapide (règles simples).",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_fun_classic9",
  },
  {
    id: "golden_goal",
    titleKey: "babyfoot.fun.goldengoal.title",
    titleDefault: "GOLDEN GOAL",
    subtitleKey: "babyfoot.fun.goldengoal.subtitle",
    subtitleDefault: "1v1 • premier but gagne",
    infoTitleKey: "babyfoot.fun.goldengoal.infoTitle",
    infoTitleDefault: "Golden Goal",
    infoBodyKey: "babyfoot.fun.goldengoal.infoBody",
    infoBodyDefault:
      "Preset FUN (Golden Goal)\n" +
      "• Mode: 1v1\n" +
      "• Objectif: 1 but\n" +
      "• Le premier but termine immédiatement la partie.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_fun_goldengoal",
  },
  {
    id: "handicap_2v1",
    titleKey: "babyfoot.fun.handicap.title",
    titleDefault: "HANDICAP",
    subtitleKey: "babyfoot.fun.handicap.subtitle",
    subtitleDefault: "2v1 • TEAM B démarre à +2",
    infoTitleKey: "babyfoot.fun.handicap.infoTitle",
    infoTitleDefault: "Handicap 2v1",
    infoBodyKey: "babyfoot.fun.handicap.infoBody",
    infoBodyDefault:
      "Preset FUN (Handicap)\n" +
      "• Mode: 2v1\n" +
      "• Objectif: 10 buts\n" +
      "• Handicap: Team B démarre à +2\n" +
      "• Utile pour équilibrer un match (niveau différent).",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_fun_handicap",
  },
  {
    id: "sets_bo3",
    titleKey: "babyfoot.fun.setsbo3.title",
    titleDefault: "SETS BO3",
    subtitleKey: "babyfoot.fun.setsbo3.subtitle",
    subtitleDefault: "2v2 • 2 sets gagnants • 5 buts",
    infoTitleKey: "babyfoot.fun.setsbo3.infoTitle",
    infoTitleDefault: "Sets BO3",
    infoBodyKey: "babyfoot.fun.setsbo3.infoBody",
    infoBodyDefault:
      "Preset FUN (Sets BO3)\n" +
      "• Mode: 2v2\n" +
      "• Best of: 3 sets (2 sets gagnants)\n" +
      "• Score par set: 5 buts\n" +
      "• Style compétition, mais rapide.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_fun_sets_bo3",
  },
];

// ✅ Recadrage vertical du ticker (object-position Y)
const TICKER_Y: Partial<Record<ModeId, number>> = {
  classic9: 50,
  golden_goal: 50,
  handicap_2v1: 50,
  sets_bo3: 50,
};

export default function BabyFootMenuFun({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  function navigate(mode: ModeId) {
    if (mode === "classic9") {
      return go("babyfoot_config", {
        presetMode: "1v1",
        presetTarget: 9,
      });
    }
    if (mode === "golden_goal") {
      return go("babyfoot_config", {
        presetMode: "1v1",
        presetGoldenGoal: true,
        presetTarget: 1,
      });
    }
    if (mode === "handicap_2v1") {
      return go("babyfoot_config", {
        presetMode: "2v1",
        presetTarget: 10,
        presetHandicapA: 0,
        presetHandicapB: 2,
      });
    }
    // sets_bo3
    return go("babyfoot_config", {
      presetMode: "2v2",
      presetBestOf: 3,
      presetSetTarget: 5,
    });
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
      {/* HEADER TICKER */}
      <div style={{ position: "relative", width: "100%", marginBottom: 10 }}>
        <img
          src={getTicker("babyfoot_fun") || logoBabyFoot}
          alt="Baby-Foot — Fun"
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
        {t("babyfoot.fun.subtitle", "Choisis une règle FUN")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MODES.map((m) => {
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
                      setInfoMode(m);
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

      {infoMode && (
        <div
          onClick={() => setInfoMode(null)}
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
                {t(infoMode.infoTitleKey, infoMode.infoTitleDefault)}
              </div>
              <button
                onClick={() => setInfoMode(null)}
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
              {t(infoMode.subtitleKey, infoMode.subtitleDefault)}
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
              {t(infoMode.infoBodyKey, infoMode.infoBodyDefault)}
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
              {infoMode.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
