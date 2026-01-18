// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// Style harmonisé avec TrainingMenu (cartes néon)
// - Cartes sombres, titre néon
// - Pastille "i" à droite => panneau d'aide (traductions via t())
// - Modes grisés : non cliquables (enabled = false) + "Coming soon"
//
// ✅ CHANGE (REQUEST FINAL):
// - Conserver STATISTIQUES (vert) tout en haut (sans bouton i) -> menu Stats
// - Conserver FAVORIS (centrés, sans i) SANS annotations "Ton mode ... préféré"
// - Remettre les cartes TRAINING et TOURNOIS SOUS les favoris
//   et AU-DESSUS des onglets, séparés par une barre de séparation thème
// - IMPORTANT ROUTING :
//   * Carte TRAINING => ouvre le HUB Training (tab "training")
//   * Favori TRAINING (ex: "Training X01") => ouvre sa CONFIG dédiée si elle existe
//     - training_x01 => tab "training_x01" (TrainingX01Config)
//     - tour_horloge => tab "training_clock" (TrainingClockConfig)
//     - autres trainings => fallback vers "training" (hub)
// - Onglets colorisés par catégorie comme les favoris
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import {
  DARTS_GAMES,
  GAME_CATEGORIES,
  sortByPopularity,
  type GameCategory,
  type DartsGameDef,
} from "../games/dartsGameRegistry";

type Props = {
  setTab: (tab: any, params?: any) => void;
};

type InfoGame = {
  label: string;
  infoTitle?: string;
  infoBody?: string;
  ready: boolean;
};

const LS_FAV_PREFIX = "dc:fav:darts:";

function getFavKey(cat: GameCategory) {
  return `${LS_FAV_PREFIX}${cat}`;
}

function getFavoriteId(cat: GameCategory): string | null {
  try {
    return localStorage.getItem(getFavKey(cat));
  } catch {
    return null;
  }
}

function pickDefaultFavorite(cat: GameCategory): DartsGameDef | null {
  const list = DARTS_GAMES.filter((g) => g.category === cat).slice().sort(sortByPopularity);
  return list[0] ?? null;
}

function resolveFavorite(cat: GameCategory): DartsGameDef | null {
  const favId = getFavoriteId(cat);
  if (favId) {
    const found = DARTS_GAMES.find((g) => g.id === favId && g.category === cat);
    if (found) return found;
  }
  return pickDefaultFavorite(cat);
}

export default function Games({ setTab }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [activeCat, setActiveCat] = React.useState<GameCategory>("classic");
  const [infoGame, setInfoGame] = React.useState<InfoGame | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: string, params?: any) {
    setTab(tab, params);
  }

  const gamesForCat = React.useMemo(() => {
    return DARTS_GAMES.filter((g) => g.category === activeCat).slice().sort(sortByPopularity);
  }, [activeCat]);

  // Favorites
  const favClassic = React.useMemo(() => resolveFavorite("classic"), []);
  const favTraining = React.useMemo(() => resolveFavorite("training"), []);
  const favVariant = React.useMemo(() => resolveFavorite("variant"), []);
  const favChallenge = React.useMemo(() => resolveFavorite("challenge"), []);
  const favFun = React.useMemo(() => resolveFavorite("fun"), []);

  // Styles helpers
  function tintedCardStyle(tint: { border: string; bg: string; title: string; glow: string }) {
    return {
      border: `1px solid ${tint.border}`,
      background: tint.bg,
      boxShadow: `0 10px 24px rgba(0,0,0,0.55), 0 0 18px ${tint.glow}`,
    } as React.CSSProperties;
  }

  // Tints
  const TINT_STATS = {
    border: "rgba(120,255,180,0.40)",
    bg: "linear-gradient(180deg, rgba(120,255,180,0.14), rgba(255,255,255,0.05))",
    title: "#8CFFCB",
    glow: "rgba(120,255,180,0.22)",
  };

  const TINT_CLASSIC = {
    border: "rgba(255,215,120,0.45)",
    bg: "linear-gradient(180deg, rgba(255,215,120,0.16), rgba(255,255,255,0.05))",
    title: "#FFD88A",
    glow: "rgba(255,215,120,0.24)",
  };

  const TINT_TRAINING = {
    border: "rgba(255,170,90,0.45)",
    bg: "linear-gradient(180deg, rgba(255,170,90,0.16), rgba(255,255,255,0.05))",
    title: "#FFBE7A",
    glow: "rgba(255,170,90,0.24)",
  };

  const TINT_VARIANT = {
    border: "rgba(160,120,255,0.45)",
    bg: "linear-gradient(180deg, rgba(160,120,255,0.16), rgba(255,255,255,0.05))",
    title: "#C7A7FF",
    glow: "rgba(160,120,255,0.24)",
  };

  const TINT_CHALLENGE = {
    border: "rgba(120,200,255,0.45)",
    bg: "linear-gradient(180deg, rgba(120,200,255,0.16), rgba(255,255,255,0.05))",
    title: "#9FD7FF",
    glow: "rgba(120,200,255,0.24)",
  };

  const TINT_FUN = {
    border: "rgba(255,120,200,0.48)",
    bg: "linear-gradient(180deg, rgba(255,120,200,0.16), rgba(255,255,255,0.05))",
    title: "#FF9FDC",
    glow: "rgba(255,120,200,0.26)",
  };

  function tintForCategory(cat: GameCategory) {
    if (cat === "classic") return TINT_CLASSIC;
    if (cat === "training") return TINT_TRAINING;
    if (cat === "variant") return TINT_VARIANT;
    if (cat === "challenge") return TINT_CHALLENGE;
    return TINT_FUN;
  }

  // ✅ Routing du favori training : config dédiée quand disponible
  function trainingFavoriteTarget(game: DartsGameDef | null): { tab: string; params?: any } {
    if (!game) return { tab: "training" };
    // Si ton App.tsx utilise d'autres noms, adapte ici uniquement.
    if (game.id === "training_x01") return { tab: "training_x01" };
    if (game.id === "tour_horloge") return { tab: "training_clock" };
    // autres trainings : hub
    return { tab: "training" };
  }

  function renderFavoriteCard(opts: {
    title: string;
    tint: { border: string; bg: string; title: string; glow: string };
    game: DartsGameDef | null;
    fallbackTab: string;
    kind: "classic" | "training" | "variant" | "challenge" | "fun";
  }) {
    const g = opts.game;
  
    const disabled = g ? !g.ready : true;
    const label = g ? g.label : t("games.fav.none", "Aucun favori");
  
    let goTab = g ? g.tab : opts.fallbackTab;
    let params: any = undefined;
  
    // ✅ cas training favori : config dédiée quand dispo
    if (opts.kind === "training") {
      if (g?.id === "training_x01") goTab = "training_x01";
      else if (g?.id === "tour_horloge") goTab = "training_clock";
      else goTab = "training";
    }
  
    const glow = opts.tint.glow;
    const border = opts.tint.border;
    const titleColor = opts.tint.title;
  
    return (
      <button
        onClick={() => setTab(disabled ? "mode_not_ready" : goTab, params)}
        style={{
          position: "relative",
          width: "100%",
          padding: 14,
          textAlign: "center",
          borderRadius: 16,
          cursor: "pointer",
          overflow: "hidden",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
  
          // ✅ “design”
          border: `1px solid ${border}`,
          background: opts.tint.bg,
          boxShadow: disabled
            ? `0 8px 18px rgba(0,0,0,0.45)`
            : `0 14px 28px rgba(0,0,0,0.60), 0 0 22px ${glow}`,
          opacity: disabled ? 0.6 : 1,
          transform: "translateZ(0)",
          transition: "transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease",
        }}
        onMouseDown={(e) => {
          // micro “press” (desktop)
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.992)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {/* Halo / glow soft */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -40,
            background: `radial-gradient(320px 180px at 50% 15%, ${glow}, rgba(0,0,0,0) 60%)`,
            opacity: disabled ? 0.35 : 0.7,
            pointerEvents: "none",
            filter: "blur(2px)",
          }}
        />
  
        {/* Sheen diagonal (reflet) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            left: -80,
            width: 180,
            height: 220,
            transform: "rotate(20deg)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 70%)",
            opacity: disabled ? 0.12 : 0.22,
            pointerEvents: "none",
          }}
        />
  
        {/* Inner border subtle */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 1,
            borderRadius: 15,
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />
  
        {/* Title category */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 1.0,
            color: titleColor,
            textTransform: "uppercase",
            textShadow: `0 0 12px ${glow}`,
          }}
        >
          {opts.title}
        </div>
  
        {/* Main label */}
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 950,
            letterSpacing: 0.6,
            color: "#fff",
            textTransform: "uppercase",
            textShadow: disabled ? "none" : "0 0 10px rgba(0,0,0,0.35)",
          }}
        >
          {label}
        </div>
  
        {/* ❌ AUCUNE annotation (ni “préféré”, ni “bientôt disponible”) */}
      </button>
    );
  }

  function separatorBar() {
    return (
      <div
        style={{
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, transparent, ${theme.primary}88, transparent)`,
          boxShadow: `0 0 14px ${theme.primary}44`,
          margin: "8px 2px",
        }}
      />
    );
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

      {/* ✅ Top : Stats + Favoris */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
        {/* STATS (vert) - centre */}
        <button
          onClick={() => {
            // ⚠️ adapte si ton App.tsx utilise un autre tab (ex: "stats_shell")
            navigate("stats");
          }}
          style={{
            position: "relative",
            width: "100%",
            padding: 14,
            textAlign: "center",
            borderRadius: 16,
            border: `1px solid ${theme.borderSoft}`,
            background: CARD_BG,
            cursor: "pointer",
            overflow: "hidden",
            ...tintedCardStyle(TINT_STATS),
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 0.9,
              color: TINT_STATS.title,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${TINT_STATS.glow}`,
            }}
          >
            {t("games.stats.title", "STATISTIQUES")}
          </div>

          {/* ✅ suppression du sous-texte */}
        </button>

        {renderFavoriteCard({
          title: t("games.fav.classic.title", "FAVORI — CLASSIQUES"),
          tint: TINT_CLASSIC,
          game: favClassic,
          fallbackTab: "mode_not_ready",
          kind: "classic",
        })}

        {renderFavoriteCard({
          title: t("games.fav.training.title", "FAVORI — TRAINING"),
          tint: TINT_TRAINING,
          game: favTraining,
          fallbackTab: "training",
          kind: "training",
        })}

        {renderFavoriteCard({
          title: t("games.fav.variant.title", "FAVORI — VARIANTES"),
          tint: TINT_VARIANT,
          game: favVariant,
          fallbackTab: "mode_not_ready",
          kind: "variant",
        })}

        {renderFavoriteCard({
          title: t("games.fav.challenge.title", "FAVORI — DÉFIS"),
          tint: TINT_CHALLENGE,
          game: favChallenge,
          fallbackTab: "mode_not_ready",
          kind: "challenge",
        })}

        {renderFavoriteCard({
          title: t("games.fav.fun.title", "FAVORI — FUN"),
          tint: TINT_FUN,
          game: favFun,
          fallbackTab: "mode_not_ready",
          kind: "fun",
        })}

        {/* ✅ Séparateur thème */}
        {separatorBar()}

        {/* ✅ Remettre TRAINING + TOURNOIS sous les favoris */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* TRAINING HUB */}
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
                      "Hub d'entraînement : accès à Training X01, Tour de l'horloge, et autres drills (selon implémentation).",
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
      </div>

      {/* ✅ Onglets catégories - couleurs liées aux favoris */}
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
          const tint = tintForCategory(c.id);

          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${on ? tint.border : theme.borderSoft}`,
                background: on ? tint.bg : theme.card,
                color: on ? tint.title : theme.text,
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: on ? `0 0 18px ${tint.glow}` : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Cartes de jeux (liste) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gamesForCat.map((g) => {
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

              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                <InfoDot
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setInfoGame({
                      label: g.label,
                      ready: g.ready,
                      infoTitle: g.infoTitle,
                      infoBody: g.infoBody,
                    });
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
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.primary, marginBottom: 10 }}>
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
