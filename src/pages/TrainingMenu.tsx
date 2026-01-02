// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training — style harmonisé avec Games.tsx
// - Cartes sombres néon
// - Pastille "i" à droite => panneau d'aide
// - Modes grisés : non cliquables (si enabled = false)
// - Textes pilotés par LangContext (t())
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";

type Tab = "training" | "training_x01" | "training_clock" | "training_stats";

type Props = {
  go?: (tab: Tab, params?: any) => void;
};

type TrainingId = "x01" | "clock" | "evolution";

type ModeDef = {
  id: TrainingId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoKey: string;
  infoDefault: string;
  tab: Tab | null; // null = à venir
  enabled: boolean;
};

const MODES: ModeDef[] = [
  {
    id: "x01",
    titleKey: "training.menu.x01.title",
    titleDefault: "Training X01",
    subtitleKey: "training.menu.x01.subtitle",
    subtitleDefault: "Travaille ton scoring et tes fins",
    infoKey: "training.menu.x01.info",
    infoDefault:
      "Entraînement X01 dédié à la progression : scoring, régularité, finitions, stats détaillées.",
    tab: "training_x01",
    enabled: true,
  },
  {
    id: "clock",
    titleKey: "training.menu.clock.title",
    titleDefault: "Tour de l’horloge",
    subtitleKey: "training.menu.clock.subtitle",
    subtitleDefault: "Simple / Double / Triple",
    infoKey: "training.menu.clock.info",
    infoDefault:
      "Atteins chaque segment du 1 au 20 puis Bull. Mode simple, double ou triple.",
    tab: "training_clock",
    enabled: true,
  },
  {
    id: "evolution",
    titleKey: "training.menu.evolution.title",
    titleDefault: "Évolution",
    subtitleKey: "training.menu.evolution.subtitle",
    subtitleDefault: "Accès direct aux stats Training X01",
    infoKey: "training.menu.evolution.info",
    infoDefault:
      "Accède directement aux statistiques détaillées de tes sessions Training X01 dans l’onglet Stats.",
    tab: "training_stats", // redirige vers StatsHub onglet Training
    enabled: true,
  },
];

export default function TrainingMenu({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: Tab | null) {
    if (!tab) return;
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    go(tab);
  }

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Titre */}
      <h1
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 24,
          color: theme.primary,
          textAlign: "center",
          textShadow: `0 0 12px ${theme.primary}66`,
        }}
      >
        {t("training.menu.title", "TRAINING")}
      </h1>

      <div
        style={{
          fontSize: 13,
          color: theme.textSoft,
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        {t(
          "training.menu.subtitle",
          "Améliore ta progression dans différents modes d’entraînement."
        )}
      </div>

      {/* Liste des modes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;
          const comingSoonLabel = !m.enabled
            ? t("training.menu.comingSoon", "En développement")
            : null;

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.tab)}
              style={{
                position: "relative",
                width: "100%",
                padding: 14,
                paddingRight: 46,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: CARD_BG,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled ? "none" : `0 10px 24px rgba(0,0,0,0.55)`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: disabled ? theme.textSoft : theme.primary,
                  textTransform: "uppercase",
                  textShadow: disabled
                    ? "none"
                    : `0 0 12px ${theme.primary}55`,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: theme.textSoft,
                  opacity: 0.9,
                }}
              >
                {subtitle}
                {comingSoonLabel && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      fontStyle: "italic",
                      opacity: 0.9,
                    }}
                  >
                    • {comingSoonLabel}
                  </span>
                )}
              </div>

              {/* Pastille "i" (InfoDot réutilisé, même style que Games) */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <InfoDot
                  size={30}
                  color="#FFFFFF"
                  glow={`${theme.primary}55`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoMode(m);
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Overlay d'information */}
      {infoMode && (
        <div
          onClick={() => setInfoMode(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {t(infoMode.titleKey, infoMode.titleDefault)}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {t(infoMode.infoKey, infoMode.infoDefault)}
            </div>
            <button
              type="button"
              onClick={() => setInfoMode(null)}
              style={{
                display: "block",
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("training.menu.info.close", t("games.info.close", "Fermer"))}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
