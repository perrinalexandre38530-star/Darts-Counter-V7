// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// Style harmonisé avec TrainingMenu (cartes néon)
// - Cartes sombres, titre néon
// - Pastille "i" à droite => panneau d'aide (traductions via t())
// - Modes grisés : non cliquables (enabled = false) + "Coming soon"
// ✅ NEW: Carte "TOURNOIS" (LOCAL) dans le menu Games
// ✅ CHANGE: supprime l’entrée "X01" (ancien moteur)
// ✅ CHANGE: "X01 V3" devient "X01" (même tab x01_config_v3)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";

type Props = {
  setTab: (tab: any) => void;
};

type GameId =
  | "training"
  | "tournaments" // ✅ NEW
  | "x01v3" // ✅ X01 unique (affiché X01, moteur V3)
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle";

type GameDef = {
  id: GameId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
  tab: string | null;
  enabled: boolean;
};

const GAMES: GameDef[] = [
  {
    id: "training",
    titleKey: "games.training.title",
    titleDefault: "TRAINING",
    subtitleKey: "games.training.subtitle",
    subtitleDefault: "Améliore ta progression.",
    infoTitleKey: "games.training.infoTitle",
    infoTitleDefault: "Training",
    infoBodyKey: "games.training.infoBody",
    infoBodyDefault:
      "Mode entraînement pour travailler la régularité, le scoring et les finitions.",
    tab: "training",
    enabled: true,
  },

  // ✅ NEW: TOURNOIS (LOCAL)
  {
    id: "tournaments",
    titleKey: "games.tournaments.title",
    titleDefault: "TOURNOIS",
    subtitleKey: "games.tournaments.subtitle",
    subtitleDefault: "Crée des tournois en local (poules, élimination…).",
    infoTitleKey: "games.tournaments.infoTitle",
    infoTitleDefault: "Tournois (Local)",
    infoBodyKey: "games.tournaments.infoBody",
    infoBodyDefault:
      "Crée un tournoi en local : round-robin, élimination directe, poules + phase finale, têtes de série, byes, et paramètres complets selon le mode de jeu. Plusieurs matchs peuvent être lancés et validés en parallèle.",
    tab: "tournaments", // 👈 onglet à créer/câbler dans App.tsx
    enabled: true,
  },

  // ✅ X01 UNIQUE (affiché "X01", mais c’est ton moteur V3)
  {
    id: "x01v3",
    // On conserve les keys existantes pour éviter de casser les traductions,
    // mais on affiche "X01" + sous-titre classique.
    titleKey: "games.x01v3.title",
    titleDefault: "X01",
    subtitleKey: "games.x01v3.subtitle",
    subtitleDefault: "301 / 501 / 701 / 901.",
    infoTitleKey: "games.x01v3.infoTitle",
    infoTitleDefault: "X01",
    infoBodyKey: "games.x01v3.infoBody",
    infoBodyDefault:
      "Parties classiques de 301/501/701/901 avec moteur V3, classement live, suggestions de check-out et stats complètes vers le menu Stats.",
    tab: "x01_config_v3", // 👈 on garde la navigation V3
    enabled: true,
  },

  {
    id: "cricket",
    titleKey: "games.cricket.title",
    titleDefault: "CRICKET",
    subtitleKey: "games.cricket.subtitle",
    subtitleDefault: "Ferme 15–20 + Bull.",
    infoTitleKey: "games.cricket.infoTitle",
    infoTitleDefault: "Cricket",
    infoBodyKey: "games.cricket.infoBody",
    infoBodyDefault:
      "Ferme les cases 15 à 20 et le Bull avant ton adversaire tout en marquant un maximum de points.",
    tab: "cricket",
    enabled: true,
  },
  {
    id: "killer",
    titleKey: "games.killer.title",
    titleDefault: "KILLER",
    subtitleKey: "games.killer.subtitle",
    subtitleDefault: "Touche ton numéro… deviens Killer.",
    infoTitleKey: "games.killer.infoTitle",
    infoTitleDefault: "Killer",
    infoBodyKey: "games.killer.infoBody",
    infoBodyDefault:
      "Chaque joueur possède un numéro. Deviens Killer en touchant le tien, puis élimine les autres joueurs.",
    tab: "killer_config",
    enabled: true,
  },
  {
    id: "shanghai",
    titleKey: "games.shanghai.title",
    titleDefault: "SHANGHAI",
    subtitleKey: "games.shanghai.subtitle",
    subtitleDefault: "Cible du round, S-D-T = Shanghai.",
    infoTitleKey: "games.shanghai.infoTitle",
    infoTitleDefault: "Shanghai",
    infoBodyKey: "games.shanghai.infoBody",
    infoBodyDefault:
      "Chaque round possède une cible. Touche simple, double et triple sur la même visite pour un Shanghai.",
    tab: "shanghai", // ✅ IMPORTANT : active la navigation
    enabled: true, // ✅ IMPORTANT : plus grisé
  },
  {
    id: "battle",
    titleKey: "games.battle.title",
    titleDefault: "BATTLE ROYALE",
    subtitleKey: "games.battle.subtitle",
    subtitleDefault: "Mode fun — éliminations.",
    infoTitleKey: "games.battle.infoTitle",
    infoTitleDefault: "Battle Royale",
    infoBodyKey: "games.battle.infoBody",
    infoBodyDefault:
      "Mode multijoueur fun avec éliminations successives. Le dernier joueur en vie gagne.",
    tab: null,
    enabled: false,
  },
];

export default function Games({ setTab }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [infoGame, setInfoGame] = React.useState<GameDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: string | null) {
    if (!tab) return;
    setTab(tab);
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
        {t("games.title", "TOUS LES JEUX")}
      </h1>

      <div
        style={{
          fontSize: 13,
          color: theme.textSoft,
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        {t("games.subtitle", "Choisis un mode de jeu")}
      </div>

      {/* Cartes de jeux */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {GAMES.map((g) => {
          const title = t(g.titleKey, g.titleDefault);
          const subtitle = t(g.subtitleKey, g.subtitleDefault);
          const disabled = !g.enabled;
          const comingSoon = !g.enabled
            ? t("games.status.comingSoon", "Bientôt disponible")
            : null;

          return (
            <button
              key={g.id}
              onClick={() => !disabled && navigate(g.tab)}
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
                    setInfoGame(g);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Overlay d'information */}
      {infoGame && (
        <div
          onClick={() => setInfoGame(null)}
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
              {t(infoGame.infoTitleKey, infoGame.infoTitleDefault)}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {t(infoGame.infoBodyKey, infoGame.infoBodyDefault)}
            </div>

            {!infoGame.enabled && (
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
              onClick={() => setInfoGame(null)}
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
