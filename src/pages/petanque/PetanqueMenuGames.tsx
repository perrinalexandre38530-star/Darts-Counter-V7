// ============================================
// src/pages/petanque/PetanqueMenuGames.tsx
// Menu Pétanque — VISUEL identique à src/pages/Games.tsx
// - Cartes néon, titre, sous-titre
// - Pastille "i" (InfoDot) + overlay d'aide
// - Navigation via go(...)
//
// NOTE:
// - Par défaut, on navigue vers go("petanque_play", { mode })
//   -> si chez toi c’est une autre route (petanque_config / petanque_home),
//      remplace simplement la string dans navigate().
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import InfoDot from "../../components/InfoDot";

type Props = {
  go: (tab: any, params?: any) => void;
};

type PetanqueModeId = "singles" | "doublette" | "triplette" | "training";

type ModeDef = {
  id: PetanqueModeId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
  enabled: boolean;
};

const MODES: ModeDef[] = [
  {
    id: "singles",
    titleKey: "petanque.modes.singles.title",
    titleDefault: "MATCH SIMPLE (1v1)",
    subtitleKey: "petanque.modes.singles.subtitle",
    subtitleDefault: "Deux joueurs — une équipe chacun.",
    infoTitleKey: "petanque.modes.singles.infoTitle",
    infoTitleDefault: "Match simple (1v1)",
    infoBodyKey: "petanque.modes.singles.infoBody",
    infoBodyDefault:
      "Partie classique en tête-à-tête. Configuration rapide des joueurs, score cible, options, puis lancement de la partie.",
    enabled: true,
  },
  {
    id: "doublette",
    titleKey: "petanque.modes.doublette.title",
    titleDefault: "DOUBLETTE (2v2)",
    subtitleKey: "petanque.modes.doublette.subtitle",
    subtitleDefault: "Deux équipes de deux joueurs.",
    infoTitleKey: "petanque.modes.doublette.infoTitle",
    infoTitleDefault: "Doublette (2v2)",
    infoBodyKey: "petanque.modes.doublette.infoBody",
    infoBodyDefault:
      "Mode équipe 2 contre 2. Sélection des joueurs par équipe, score cible et options avant lancement.",
    enabled: true,
  },
  {
    id: "triplette",
    titleKey: "petanque.modes.triplette.title",
    titleDefault: "TRIPLETTE (3v3)",
    subtitleKey: "petanque.modes.triplette.subtitle",
    subtitleDefault: "Deux équipes de trois joueurs.",
    infoTitleKey: "petanque.modes.triplette.infoTitle",
    infoTitleDefault: "Triplette (3v3)",
    infoBodyKey: "petanque.modes.triplette.infoBody",
    infoBodyDefault:
      "Mode équipe 3 contre 3. Sélection des joueurs, configuration des règles et démarrage de la partie.",
    enabled: true,
  },
  {
    id: "training",
    titleKey: "petanque.modes.training.title",
    titleDefault: "ENTRAÎNEMENT",
    subtitleKey: "petanque.modes.training.subtitle",
    subtitleDefault: "Exercices & mesures (manuel/photo/live).",
    infoTitleKey: "petanque.modes.training.infoTitle",
    infoTitleDefault: "Entraînement",
    infoBodyKey: "petanque.modes.training.infoBody",
    infoBodyDefault:
      "Mode entraînement : mesure des distances, exercices, et capture (manuel/photo/live) selon ton implémentation.",
    enabled: true,
  },
];

export default function PetanqueMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(mode: "singles" | "doublette" | "triplette" | "training") {
    // Option 1 (recommandé) : passer par config
    go("petanque_config" as any, { mode });
  
    // Option 2 : si tu veux aller direct au play :
    // go("petanque_play" as any, { mode });
  }

  return (
    <div
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
        {t("petanque.menu.title", "PÉTANQUE")}
      </h1>

      <div
        style={{
          fontSize: 13,
          color: theme.textSoft,
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        {t("petanque.menu.subtitle", "Choisis un mode")}
      </div>

      {/* Cartes de modes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;
          const comingSoon = !m.enabled
            ? t("games.status.comingSoon", "Bientôt disponible")
            : null;

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.id)}
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
                {comingSoon && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      fontStyle: "italic",
                      opacity: 0.9,
                    }}
                  >
                    • {comingSoon}
                  </span>
                )}
              </div>

              {/* Pastille "i" harmonisée (InfoDot) */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <InfoDot
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setInfoMode(m);
                  }}
                  glow={theme.primary + "88"}
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
              {t(infoMode.infoTitleKey, infoMode.infoTitleDefault)}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {t(infoMode.infoBodyKey, infoMode.infoBodyDefault)}
            </div>

            {!infoMode.enabled && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.primary,
                  marginBottom: 10,
                }}
              >
                {t("games.status.comingSoon", "Bientôt disponible")}
              </div>
            )}

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
              {t("games.info.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
