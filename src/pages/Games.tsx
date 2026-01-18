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
import { DARTS_GAMES, GAME_CATEGORIES, sortByPopularity, type GameCategory } from "../games/dartsGameRegistry";

type Props = {
  setTab: (tab: any) => void;
};

type InfoGame = {
  label: string;
  infoTitle?: string;
  infoBody?: string;
  ready: boolean;
};

export default function Games({ setTab }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [activeCat, setActiveCat] = React.useState<GameCategory>("classic");
  const [infoGame, setInfoGame] = React.useState<InfoGame | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: string) {
    setTab(tab);
  }

  const gamesForCat = React.useMemo(() => {
    if (activeCat === "training") {
      // Dans le menu Games, l'onglet Training renvoie vers le hub Training existant.
      // Les drills spécifiques pourront être ajoutés dans TrainingMenu.
      return [];
    }
    return DARTS_GAMES.filter((g) => g.category === activeCat).slice().sort(sortByPopularity);
  }, [activeCat]);

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

      {/* Cartes rapides (hors catégories) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {/* TRAINING hub */}
        <button
          onClick={() => navigate("training")}
          style={{
            position: "relative",
            width: "100%",
            padding: 14,
            paddingRight: 46,
            textAlign: "left",
            borderRadius: 16,
            border: `1px solid ${theme.borderSoft}`,
            background: CARD_BG,
            cursor: "pointer",
            boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: theme.primary,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${theme.primary}55`,
            }}
          >
            {t("games.training.title", "TRAINING")}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
            {t("games.training.subtitle", "Améliore ta progression.")}
          </div>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <InfoDot
              onClick={(ev) => {
                ev.stopPropagation();
                setInfoGame({
                  label: "Training",
                  ready: true,
                  infoTitle: "Training",
                  infoBody:
                    "Mode entraînement pour travailler la régularité, le scoring et les finitions (X01 Training, Tour de l'horloge, etc.).",
                });
              }}
              glow={theme.primary + "88"}
            />
          </div>
        </button>

        {/* TOURNOIS */}
        <button
          onClick={() => navigate("tournaments")}
          style={{
            position: "relative",
            width: "100%",
            padding: 14,
            paddingRight: 46,
            textAlign: "left",
            borderRadius: 16,
            border: `1px solid ${theme.borderSoft}`,
            background: CARD_BG,
            cursor: "pointer",
            boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: theme.primary,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${theme.primary}55`,
            }}
          >
            {t("games.tournaments.title", "TOURNOIS")}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
            {t("games.tournaments.subtitle", "Crée des tournois en local (poules, élimination…).")}
          </div>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <InfoDot
              onClick={(ev) => {
                ev.stopPropagation();
                setInfoGame({
                  label: "Tournois",
                  ready: true,
                  infoTitle: "Tournois (Local)",
                  infoBody:
                    "Crée des tournois en local : round-robin, élimination directe, poules + phase finale, byes et paramètres complets selon le mode.",
                });
              }}
              glow={theme.primary + "88"}
            />
          </div>
        </button>
      </div>

      {/* Onglets catégories */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {GAME_CATEGORIES.map((c) => {
          const on = c.id === activeCat;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${on ? theme.primary : theme.borderSoft}`,
                background: on ? theme.primary : theme.card,
                color: on ? "#000" : theme.text,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: on ? `0 0 18px ${theme.primary}55` : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Cartes de jeux (par catégorie + tri popularité) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeCat === "training" ? (
          <button
            onClick={() => navigate("training")}
            style={{
              position: "relative",
              width: "100%",
              padding: 14,
              textAlign: "left",
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: CARD_BG,
              cursor: "pointer",
              boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 12px ${theme.primary}55`,
              }}
            >
              {t("games.training.title", "TRAINING")}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
              {t("games.training.subtitle", "Améliore ta progression.")}
            </div>
          </button>
        ) : (
          gamesForCat.map((g) => {
            const disabled = !g.ready;
            const comingSoon = disabled ? t("games.status.comingSoon", "Bientôt disponible") : null;

            return (
              <button
                key={g.id}
                onClick={() => navigate(disabled ? "mode_not_ready" : g.tab)}
                style={{
                  position: "relative",
                  width: "100%",
                  padding: 14,
                  paddingRight: 46,
                  textAlign: "left",
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: CARD_BG,
                  cursor: "pointer",
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
                    textShadow: disabled ? "none" : `0 0 12px ${theme.primary}55`,
                  }}
                >
                  {g.label}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
                  {comingSoon && (
                    <span style={{ fontSize: 11, fontStyle: "italic", opacity: 0.9 }}>
                      {comingSoon}
                    </span>
                  )}
                </div>

                {/* Pastille "i" harmonisée (InfoDot) */}
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <InfoDot
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setInfoGame({ label: g.label, ready: g.ready, infoTitle: g.infoTitle, infoBody: g.infoBody });
                    }}
                    glow={theme.primary + "88"}
                  />
                </div>
              </button>
            );
          })
        )}
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
              {infoGame.infoTitle ?? infoGame.label}
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {infoGame.infoBody ?? ""}
            </div>

            {!infoGame.ready && (
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
