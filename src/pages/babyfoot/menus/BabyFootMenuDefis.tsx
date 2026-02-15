// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuDefis.tsx
// Menu DÉFIS — Baby-Foot (sport autonome)
//
// ✅ Clone strict du rendu BabyFootMenuMatch (style "Games DartsCounter"):
//   - Header ticker + BackDot à droite
//   - Cartes: fond sombre + ticker en "panneau" à droite (≈ 3/4 de la carte)
//   - Ticker = hauteur EXACTE de la carte (100%)
//   - Dégradé sur le bord GAUCHE du ticker pour laisser le titre lisible
//   - AUCUN texte visible sous les titres (tout passe dans InfoDot => modal)
// ✅ Tickers: /src/assets/tickers/ticker_babyfoot_*.png
//   - IMPORTANT: "GLUTCH" (pas "CLUTCH")
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

type DefiId = "classic9" | "glutch3" | "endurance";

type DefiDef = {
  id: DefiId;
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

const DEFIS: DefiDef[] = [
  {
    id: "classic9",
    titleKey: "babyfoot.defis.classic9.title",
    titleDefault: "CLASSIC 9",
    subtitleKey: "babyfoot.defis.classic9.subtitle",
    subtitleDefault: "Preset jouable • 1v1 • premier à 9",
    infoTitleKey: "babyfoot.defis.classic9.infoTitle",
    infoTitleDefault: "Classic 9 (Défi)",
    infoBodyKey: "babyfoot.defis.classic9.infoBody",
    infoBodyDefault:
      "Défi (Classic 9)\n" +
      "• Mode: 1v1\n" +
      "• Objectif: 9 buts\n" +
      "• Variante défi: à relier à des scores/records (à venir).",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_fun_classic9", // réutilise le même visuel
  },
  {
    id: "glutch3",
    titleKey: "babyfoot.defis.glutch3.title",
    titleDefault: "GLUTCH 3",
    subtitleKey: "babyfoot.defis.glutch3.subtitle",
    subtitleDefault: "1v1 • premier à 3 • 90 sec",
    infoTitleKey: "babyfoot.defis.glutch3.infoTitle",
    infoTitleDefault: "Glutch 3",
    infoBodyKey: "babyfoot.defis.glutch3.infoBody",
    infoBodyDefault:
      "Défi (Glutch 3)\n" +
      "• Mode: 1v1\n" +
      "• Objectif: 3 buts\n" +
      "• Chrono: 90 secondes\n" +
      "• Pression maximale: tu dois conclure vite.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_defis_glutch3",
  },
  {
    id: "endurance",
    titleKey: "babyfoot.defis.endurance.title",
    titleDefault: "ENDURANCE",
    subtitleKey: "babyfoot.defis.endurance.subtitle",
    subtitleDefault: "2v2 • BO5 • 3 buts/set",
    infoTitleKey: "babyfoot.defis.endurance.infoTitle",
    infoTitleDefault: "Endurance",
    infoBodyKey: "babyfoot.defis.endurance.infoBody",
    infoBodyDefault:
      "Défi (Endurance)\n" +
      "• Mode: 2v2\n" +
      "• Best of: 5 sets (BO5)\n" +
      "• Score par set: 3 buts\n" +
      "• Objectif: tenir la distance + régularité.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_defis_endurance",
  },
];

const TICKER_Y: Partial<Record<DefiId, number>> = {
  classic9: 50,
  glutch3: 50,
  endurance: 50,
};

export default function BabyFootMenuDefis({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoDefi, setInfoDefi] = React.useState<DefiDef | null>(null);

  function navigate(id: DefiId) {
    if (id === "classic9") {
      return go("babyfoot_config", { presetMode: "1v1", presetTarget: 9, presetCategory: "defis" });
    }
    if (id === "glutch3") {
      return go("babyfoot_config", {
        presetMode: "1v1",
        presetTarget: 3,
        presetTimerSec: 90,
        presetCategory: "defis",
      });
    }
    // endurance
    return go("babyfoot_config", {
      presetMode: "2v2",
      presetBestOf: 5,
      presetSetTarget: 3,
      presetCategory: "defis",
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
      <div style={{ position: "relative", width: "100%", marginBottom: 10 }}>
        <img
          src={getTicker("babyfoot_defis") || logoBabyFoot}
          alt="Baby-Foot — Défis"
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
        {t("babyfoot.defis.subtitle", "Choisis un défi")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DEFIS.map((m) => {
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
                      setInfoDefi(m);
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

      {infoDefi && (
        <div
          onClick={() => setInfoDefi(null)}
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
                {t(infoDefi.infoTitleKey, infoDefi.infoTitleDefault)}
              </div>
              <button
                onClick={() => setInfoDefi(null)}
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
              {t(infoDefi.subtitleKey, infoDefi.subtitleDefault)}
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
              {t(infoDefi.infoBodyKey, infoDefi.infoBodyDefault)}
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
              {infoDefi.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
