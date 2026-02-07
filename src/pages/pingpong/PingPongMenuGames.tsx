// ============================================
// src/pages/pingpong/PingPongMenuGames.tsx
// Menu Ping-Pong — même UX que les menus Games (Baby-Foot/Pétanque)
// ✅ Cartes plein largeur + watermark tickers
// ✅ Header ticker_pingpong_games en haut (remplace le texte)
// ✅ BackDot à l'extrême gauche -> retour accueil Games
// ✅ Titres en couleurs thème + glow renforcé
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

// ✅ Tickers images (Vite)
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

function getTickerFromCandidates(ids: Array<string | null | undefined>) {
  for (const id of ids) {
    const src = getTicker(id);
    if (src) return src;
  }
  return null;
}

type Props = {
  go: (tab: any, params?: any) => void;
};

type PingPongModeId =
  | "match_1v1"
  | "match_2v2"
  | "match_2v1"
  | "tournante"
  | "training";

type ModeDef = {
  id: PingPongModeId;
  label: string; // petit titre affiché sur la carte
  tickerCandidates: string[];
  enabled: boolean;
};

// ✅ 5 modes (comme demandé) — libellés dans les tickers
const MODES: ModeDef[] = [
  { id: "match_1v1", label: "1V1", tickerCandidates: ["pingpong_1v1"], enabled: true },
  { id: "match_2v2", label: "2V2", tickerCandidates: ["pingpong_2v2"], enabled: true },
  { id: "match_2v1", label: "2V1", tickerCandidates: ["pingpong_2v1"], enabled: true },
  { id: "tournante", label: "TOURNANTE", tickerCandidates: ["pingpong_tournante"], enabled: true },
  { id: "training", label: "TRAINING", tickerCandidates: ["pingpong_training"], enabled: true },
];

export default function PingPongMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoModeId, setInfoModeId] = React.useState<PingPongModeId | null>(null);

  const INFO: Record<PingPongModeId, { title: string; body: string }> = {
    match_1v1: {
      title: t("pingpong.modes.1v1.infoTitle", "1v1"),
      body: t("pingpong.modes.1v1.infoBody", "Match 1 contre 1."),
    },
    match_2v2: {
      title: t("pingpong.modes.2v2.infoTitle", "2v2"),
      body: t("pingpong.modes.2v2.infoBody", "Match en double : 2 contre 2."),
    },
    match_2v1: {
      title: t("pingpong.modes.2v1.infoTitle", "2v1"),
      body: t("pingpong.modes.2v1.infoBody", "Match asymétrique : 2 contre 1."),
    },
    tournante: {
      title: t("pingpong.modes.tournante.infoTitle", "Tournante"),
      body: t(
        "pingpong.modes.tournante.infoBody",
        "Rotation autour de la table, élimination progressive."
      ),
    },
    training: {
      title: t("pingpong.modes.training.infoTitle", "Training"),
      body: t("pingpong.modes.training.infoBody", "Entraînement solo (stats et objectifs)."),
    },
  };

  function navigate(mode: PingPongModeId) {
    // Tous les modes passent par la config (comme demandé)
    go("pingpong_config", { mode });
  }

  // 🎨 Couleurs titres par mode (dynamiques thème)
  function getModeColor(id: PingPongModeId) {
    const primary = theme?.primary ?? "rgba(110,180,255,1)";
    const danger = theme?.danger ?? "rgba(255,90,110,1)";
    const warning = theme?.warning ?? "rgba(255,180,80,1)";
    const success = theme?.success ?? "rgba(110,255,170,1)";
    const purple = (theme as any)?.purple ?? "rgba(190,130,255,1)";

    switch (id) {
      case "match_1v1":
        return primary;
      case "match_2v2":
        return danger;
      case "match_2v1":
        return purple;
      case "tournante":
        return warning;
      case "training":
        return success;
      default:
        return primary;
    }
  }

  function ModeTicker({ tickerCandidates }: { tickerCandidates: string[] }) {
    const src = getTickerFromCandidates(tickerCandidates);
    if (!src) return null;

    // On affiche le ticker EN ENTIER (texte dans le ticker), mais on le réduit/décale
    // pour (1) laisser une marge à gauche/droite et (2) réserver une zone à droite pour le bouton InfoDot.
    const rightGutter = 74; // réserve pour le cercle + marge
    const sideInset = 10;
    const vertInset = 6;

    return (
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* Zone image réduite (pas de crop) */}
        <div
          style={{
            position: "absolute",
            left: sideInset,
            right: rightGutter,
            top: vertInset,
            bottom: vertInset,
            overflow: "hidden",
            background: "rgba(0,0,0,0.85)",
            borderRadius: 14,
          }}
        >
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              // On ancre à droite pour voir le libellé du mode (1V1/2V2/etc) dans le ticker.
              objectPosition: "right center",
              display: "block",
              transform: "translateZ(0)",
            }}
            draggable={false}
          />

          {/* Dégradé gauche (marge + vignette) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 10%, rgba(0,0,0,0.00) 22%)",
              pointerEvents: "none",
            }}
          />

          {/* Dégradé droite pour transition vers la zone Info */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.00) 58%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.90) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Zone droite (derrière InfoDot) */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: rightGutter,
            background: "rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  const headerSrc = getTickerFromCandidates(["pingpong_games"]);

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
      {/* HEADER ticker_pingpong_games */}
      {headerSrc && (
        <div
          style={{
            position: "relative",
            // Pleine largeur écran (pas dans un bloc)
            width: "calc(100% + 32px)",
            marginLeft: -16,
            marginRight: -16,
            aspectRatio: "800 / 230" as any,
            overflow: "hidden",
            background: "rgba(0,0,0,0.85)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            marginBottom: 14,
          }}
        >
          <img
            src={headerSrc}
            alt="PING-PONG GAMES"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              // Pas de crop : afficher le ticker en entier
              objectFit: "contain",
              objectPosition: "center center",
            }}
            draggable={false}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 42%, rgba(0,0,0,0.00) 70%)",
            }}
          />

          {/* BackDot extrême gauche */}
          <div style={{ position: "absolute", left: 10, top: 10, zIndex: 5 }}>
            <BackDot onClick={() => go("home")} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const disabled = !m.enabled;
          const titleColor = getModeColor(m.id);

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.id)}
              style={{
                position: "relative",
                width: "100%",
                height: 74,
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                overflow: "hidden",
                background: "rgba(0,0,0,0.85)",
              }}
            >
              {/* Ticker complet (texte DANS le ticker) + réduit pour laisser place au i */}
              <ModeTicker tickerCandidates={m.tickerCandidates} />

              {/* Titre minimal + couleur thème + glow renforcé */}
              <div
                style={{
                  position: "absolute",
                  left: 20, // (2) léger ajustement position
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  fontSize: 20,
                  fontWeight: 1000,
                  letterSpacing: 1,
                  color: titleColor,
                  textShadow:
                    // (1) glow renforcé
                    "0 0 10px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.65), 0 0 22px currentColor, 0 0 34px currentColor",
                }}
              >
                {m.label}
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
                    setInfoModeId(m.id);
                  }}
                  glow={(theme.primary ?? "rgba(110,180,255,1)") + "88"}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal Info */}
      {infoModeId && (
        <div
          onClick={() => setInfoModeId(null)}
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
              border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              color: theme.text,
              boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                fontWeight: 1000,
                color: theme.primary,
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              {INFO[infoModeId].title}
            </div>

            <div style={{ color: theme.textSoft, fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
              {INFO[infoModeId].body}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setInfoModeId(null)}
                style={{
                  borderRadius: 14,
                  padding: "10px 12px",
                  border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                  background: "rgba(255,255,255,0.06)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
