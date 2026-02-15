// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuDefis.tsx
// DÉFIS Baby-Foot — rendu MATCH-STYLE (cards + ticker + fade)
// - Même rendu visuel que BabyFootMenuMatch
// - Tickers: src/assets/tickers (inclut Clutch 3 + Endurance)
// - Bouton i (info) DANS chaque carte (à droite)
// - Pas de "note" en bas
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLang } from "../../../contexts/LangContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

// ✅ Tickers locaux (Vite glob)
const tickerImages = import.meta.glob("../../../assets/tickers/*.{png,jpg,jpeg,webp}", {
  eager: true,
  as: "url",
}) as Record<string, string>;

function getTicker(fileName: string): string {
  const key = Object.keys(tickerImages).find((p) => p.endsWith("/" + fileName));
  return key ? tickerImages[key] : "";
}

export default function BabyFootMenuDefis({ onBack, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoPreset, setInfoPreset] = React.useState<InfoPreset>(INFO_SCREEN);

  const presets: Preset[] = [
    {
      id: "classic9",
      leftTitleKey: "babyfoot.defis.classic9.title",
      leftTitleDefault: "CLASSIC 9",
      leftSubKey: "babyfoot.defis.classic9.sub",
      leftSubDefault: "Preset jouable • 1v1 • premier à 9",
      // ✅ On réutilise le ticker classic9 (déjà validé)
      tickerId: "ticker_babyfoot_fun_classic9.png",
      info: {
        titleKey: "babyfoot.defis.classic9.info.title",
        titleDefault: "Classic 9",
        bodyKey: "babyfoot.defis.classic9.info.body",
        bodyDefault: "Défi de base : score objectif 9, idéal pour warm-up / comparatif rapide.",
      },
      onClick: () => go("babyfoot_config", { presetMode: "1v1", presetTarget: 9 }),
    },
    {
      id: "clutch3",
      leftTitleKey: "babyfoot.defis.clutch3.title",
      leftTitleDefault: "CLUTCH 3",
      leftSubKey: "babyfoot.defis.clutch3.sub",
      leftSubDefault: "1v1 • premier à 3 • 90 sec",
      tickerId: "ticker_babyfoot_defis_clutch3.png",
      info: {
        titleKey: "babyfoot.defis.clutch3.info.title",
        titleDefault: "Clutch 3",
        bodyKey: "babyfoot.defis.clutch3.info.body",
        bodyDefault:
          "Défi chrono : 90 secondes pour atteindre 3 buts. Si égalité à la fin, mort subite.",
      },
      onClick: () =>
        go("babyfoot_config", {
          presetMode: "1v1",
          presetTarget: 3,
          presetTimeLimitSec: 90,
        }),
    },
    {
      id: "endurance",
      leftTitleKey: "babyfoot.defis.endurance.title",
      leftTitleDefault: "ENDURANCE",
      leftSubKey: "babyfoot.defis.endurance.sub",
      leftSubDefault: "2v2 • BO5 • 3 buts/set",
      tickerId: "ticker_babyfoot_defis_endurance.png",
      info: {
        titleKey: "babyfoot.defis.endurance.info.title",
        titleDefault: "Endurance",
        bodyKey: "babyfoot.defis.endurance.info.body",
        bodyDefault:
          "Défi long : meilleur des 5 sets (BO5). Chaque set se gagne à 3 buts. Idéal pour tester la constance.",
      },
      onClick: () =>
        go("babyfoot_config", {
          presetMode: "2v2",
          presetBestOf: 5,
          presetSetTarget: 3,
        }),
    },
  ];

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={onBack} />
        <div style={topCenter}>
          <img
            src={getTicker("ticker_babyfoot_defis.png")}
            alt="DÉFIS"
            style={headerTickerImg}
            draggable={false}
          />
          <div style={headerSubtitle}>{t("babyfoot.defis.pick", "Choisis un défi")}</div>
        </div>
        <InfoDot title={t(INFO_SCREEN.titleKey, INFO_SCREEN.titleDefault)} body={t(INFO_SCREEN.bodyKey, INFO_SCREEN.bodyDefault)} />
      </div>

      <div style={grid}>
        {presets.map((p) => (
          <div
            key={p.id}
            style={cardShell(theme)}
            onClick={p.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") p.onClick();
            }}
          >
            <div style={leftLabelCol}>
              <div style={leftTitle(theme)}>{t(p.leftTitleKey, p.leftTitleDefault)}</div>
              <div style={leftSub(theme)}>{t(p.leftSubKey, p.leftSubDefault)}</div>
            </div>

            <div style={tickerLayer}>
              <div style={tickerGlow(theme)} />
              <div style={tickerPanel(theme)}>
                <img src={getTicker(p.tickerId)} alt={p.leftTitleDefault} style={tickerImg} draggable={false} />
                <div style={leftFade} />
                <div style={rightFade} />
                <div style={tickerGloss} />
              </div>
            </div>

            <button
              type="button"
              style={infoBtn(theme)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setInfoPreset({
                  titleKey: p.info.titleKey,
                  titleDefault: p.info.titleDefault,
                  bodyKey: p.info.bodyKey,
                  bodyDefault: p.info.bodyDefault,
                });
                setInfoOpen(true);
              }}
              aria-label="info"
              title={t(p.info.titleKey, p.info.titleDefault)}
            >
              i
            </button>
          </div>
        ))}
      </div>

      {infoOpen && (
        <div style={infoOverlay} onClick={() => setInfoOpen(false)} role="presentation">
          <div
            style={infoModal(theme)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div style={infoTitle(theme)}>{t(infoPreset.titleKey, infoPreset.titleDefault)}</div>
            <div style={infoBody(theme)}>{t(infoPreset.bodyKey, infoPreset.bodyDefault)}</div>
            <button style={infoOk(theme)} onClick={() => setInfoOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------
// Types
// ----------------------------

type InfoPreset = {
  titleKey: string;
  titleDefault: string;
  bodyKey: string;
  bodyDefault: string;
};

type Preset = {
  id: string;
  leftTitleKey: string;
  leftTitleDefault: string;
  leftSubKey: string;
  leftSubDefault: string;
  tickerId: string;
  info: { titleKey: string; titleDefault: string; bodyKey: string; bodyDefault: string };
  onClick: () => void;
};

const INFO_SCREEN: InfoPreset = {
  titleKey: "babyfoot.defis.info.title",
  titleDefault: "DÉFIS",
  bodyKey: "babyfoot.defis.info.body",
  bodyDefault: "Défis baby-foot (chrono, endurance, formats spéciaux).",
};

// ----------------------------
// Styles (MATCH-STYLE)
// ----------------------------

const cardH = 92;
const tickerW = 76; // %
const leftW = 100 - tickerW;

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "52px 1fr 52px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topCenter: any = {
  display: "grid",
  alignItems: "center",
  justifyItems: "center",
  gap: 6,
};

const headerTickerImg: any = {
  width: "100%",
  maxWidth: 520,
  height: 70,
  objectFit: "cover",
  borderRadius: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const headerSubtitle: any = {
  fontWeight: 900,
  opacity: 0.9,
  letterSpacing: 0.6,
  textShadow: "0 2px 10px rgba(0,0,0,0.45)",
};

const grid: any = { display: "grid", gap: 10 };

const cardShell = (_theme: any) => ({
  position: "relative",
  height: cardH,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  overflow: "hidden",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  textAlign: "left",
  padding: 0,
});

const leftLabelCol: any = {
  position: "absolute",
  left: 12,
  top: 0,
  bottom: 0,
  width: `calc(${leftW}% - 18px)`,
  display: "grid",
  alignContent: "center",
  gap: 4,
  zIndex: 3,
};

const leftTitle = (theme: any) => ({
  fontWeight: 950,
  letterSpacing: 0.9,
  fontSize: 12,
  color: theme?.colors?.accent ?? "#f7d36a",
  textTransform: "uppercase",
  textShadow: "0 2px 10px rgba(0,0,0,0.45)",
});

const leftSub = (_theme: any) => ({
  fontWeight: 850,
  fontSize: 11,
  opacity: 0.75,
  lineHeight: 1.15,
  textShadow: "0 2px 10px rgba(0,0,0,0.45)",
});

const tickerLayer: any = {
  position: "absolute",
  left: `${leftW}%`,
  top: 0,
  bottom: 0,
  width: `${tickerW}%`,
  zIndex: 1,
};

const tickerGlow = (theme: any) => ({
  position: "absolute",
  inset: -40,
  background: `radial-gradient(circle at 45% 40%, ${theme?.colors?.accent ?? "#f7d36a"}22 0%, rgba(0,0,0,0) 60%)`,
  filter: "blur(18px)",
  opacity: 0.65,
});

const tickerPanel = (_theme: any) => ({
  position: "absolute",
  inset: 0,
  borderLeft: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  background: "rgba(0,0,0,0.22)",
});

const tickerImg: any = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "50% 50%",
  transform: "scale(1.02)",
};

const leftFade: any = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: "72%",
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)",
  pointerEvents: "none",
};

const rightFade: any = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: "18%",
  background:
    "linear-gradient(270deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.20) 55%, rgba(0,0,0,0) 100%)",
  pointerEvents: "none",
};

const tickerGloss: any = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 28%, rgba(0,0,0,0.08) 100%)",
  pointerEvents: "none",
};

const infoBtn = (theme: any) => ({
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: theme?.colors?.accent ?? "#f7d36a",
  fontWeight: 1000,
  letterSpacing: 0.5,
  boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
  cursor: "pointer",
  zIndex: 5,
});

// Modal
const infoOverlay: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "grid",
  placeItems: "center",
  padding: 18,
  zIndex: 9999,
};

const infoModal = (theme: any) => ({
  width: "min(520px, 92vw)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: theme?.colors?.panel ?? "rgba(18,20,28,0.92)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
  padding: 14,
});

const infoTitle = (theme: any) => ({
  fontWeight: 1000,
  letterSpacing: 0.8,
  marginBottom: 8,
  color: theme?.colors?.accent ?? "#f7d36a",
  textTransform: "uppercase",
});

const infoBody = (theme: any) => ({
  opacity: 0.9,
  fontWeight: 750,
  lineHeight: 1.35,
  color: theme?.colors?.text ?? "#fff",
});

const infoOk = (theme: any) => ({
  marginTop: 12,
  width: "100%",
  height: 40,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.30)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 1,
  cursor: "pointer",
});
