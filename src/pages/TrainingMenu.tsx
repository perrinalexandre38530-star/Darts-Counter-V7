// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training — style harmonisé avec Games.tsx
// - Cartes sombres néon
// - Pastille "i" à droite => panneau d'aide
// - Modes grisés : non cliquables (si enabled = false)
// - Textes pilotés par LangContext (t())
// - ✅ FIX doublons : registry list exclut les cartes déjà affichées en haut
// - ✅ Evolution = carte raccourci STATS, en VERT (pas un jeu)
// - ✅ Evolution TOUT EN HAUT
// - ✅ Suppression du label "Autres modes d’entraînement"
// - ✅ Ajout Training : Double In/Out + Challenges (pinned cards)
// ✅ NEW: BackDot en haut pour revenir au menu Games
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import { dartsGameRegistry } from "../games/dartsGameRegistry";

type Tab =
  | "games"
  | "training"
  | "training_x01"
  | "training_clock"
  | "training_stats"
  | "darts_mode";

type Props = {
  go?: (tab: Tab, params?: any) => void;
};

type ModeDef = {
  id: string;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoKey: string;
  infoDefault: string;
  tab: Tab | null; // null = à venir
  params?: any;
  enabled: boolean;
  badge?: string | null;

  // Accent visuel (pour Evolution en vert)
  accentHex?: string | null;
  accentBorder?: string | null;
  accentGlow?: string | null;
};

export default function TrainingMenu({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  const regById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const g of dartsGameRegistry || []) m.set(g.id, g);
    return m;
  }, []);

  function navigate(tab: Tab | null, params?: any) {
    if (!tab) return;
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    go(tab, params);
  }

  // IDs des trainings déjà affichés en cartes fixes (donc exclus de la liste auto)
  const pinnedRegistryIds = React.useMemo(
    () =>
      new Set<string>([
        "training_x01",
        "tour_horloge",
        "training_doubleio",
        "training_challenges",
        // safety si des vieux IDs traînent
        "evolution",
        "training_evolution",
      ]),
    []
  );

  const MODES: ModeDef[] = React.useMemo(() => {
    const comingSoon = t("training.menu.comingSoon", "En développement");

    const doubleio = regById.get("training_doubleio");
    const challenges = regById.get("training_challenges");

    const badgeFromRegistry = (g: any) => {
      if (!g) return comingSoon;
      return g.ready ? null : comingSoon;
    };

    // ✅ EVOLUTION en 1er
    const evolution: ModeDef = {
      id: "evolution",
      titleKey: "training.menu.evolution.title",
      titleDefault: "Évolution",
      subtitleKey: "training.menu.evolution.subtitle",
      subtitleDefault: "Accès direct aux stats Training X01",
      infoKey: "training.menu.evolution.info",
      infoDefault:
        "Accède directement aux statistiques détaillées de tes sessions Training X01 dans l’onglet Stats.",
      tab: "training_stats",
      enabled: true,
      accentHex: "#8CFFCB",
      accentBorder: "rgba(120,255,180,0.35)",
      accentGlow: "rgba(120,255,180,0.55)",
    };

    const x01: ModeDef = {
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
    };

    const clock: ModeDef = {
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
    };

    const doubleIOCard: ModeDef = {
      id: "doubleio",
      titleKey: "training.menu.doubleio.title",
      titleDefault: "Double In / Double Out",
      subtitleKey: "training.menu.doubleio.subtitle",
      subtitleDefault: "Travail DI/DO — précision & régularité",
      infoKey: "training.menu.doubleio.info",
      infoDefault:
        "Entraînement dédié aux doubles : Double In, Double Out ou les deux. Objectif : fiabiliser tes entrées et sorties.",
      tab: "darts_mode",
      params: { gameId: "training_doubleio" },
      enabled: true,
      badge: badgeFromRegistry(doubleio),
    };

    const challengesCard: ModeDef = {
      id: "challenges",
      titleKey: "training.menu.challenges.title",
      titleDefault: "Challenges",
      subtitleKey: "training.menu.challenges.subtitle",
      subtitleDefault: "Défis courts (doubles, bull, triples…)",
      infoKey: "training.menu.challenges.info",
      infoDefault:
        "Série de défis rapides pour travailler un axe précis : doubles, bull, triples, régularité. Idéal en session courte.",
      tab: "darts_mode",
      params: { gameId: "training_challenges" },
      enabled: true,
      badge: badgeFromRegistry(challenges),
    };

    // Ordre final : Evolution -> X01 -> Clock -> DoubleIO -> Challenges
    return [evolution, x01, clock, doubleIOCard, challengesCard];
  }, [t, regById]);

  const extraModes: ModeDef[] = React.useMemo(() => {
    const comingSoon = t("training.menu.comingSoon", "En développement");

    const trainings = (dartsGameRegistry || [])
      .filter((g: any) => g.entry === "training")
      .filter((g: any) => !pinnedRegistryIds.has(g.id))
      .filter((g: any) => {
        const id = String(g.id || "").toLowerCase();
        return id !== "evolution" && id !== "training_evolution";
      });

    trainings.sort((a: any, b: any) => a.label.localeCompare(b.label, "fr"));

    return trainings.map((g: any) => ({
      id: g.id,
      titleKey: `training.registry.${g.id}.title`,
      titleDefault: g.label,
      subtitleKey: `training.registry.${g.id}.subtitle`,
      subtitleDefault: "Entraînement dédié",
      infoKey: `training.registry.${g.id}.info`,
      infoDefault:
        "Ce mode est enregistré dans l’application. S’il n’est pas encore implémenté, il s’ouvrira sur l’écran “Mode en cours d’implémentation”.",
      tab: "darts_mode",
      params: { gameId: g.id },
      enabled: true,
      badge: g.ready ? null : comingSoon,
    }));
  }, [t, pinnedRegistryIds]);

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
      {/* ✅ Header : BackDot + Titre centré */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <BackDot
            onClick={() => navigate("games")}
            glow={theme.primary + "88"}
          />
        </div>

        <h1
          style={{
            margin: 0,
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
            marginTop: 6,
            textAlign: "center",
          }}
        >
          {t(
            "training.menu.subtitle",
            "Améliore ta progression dans différents modes d’entraînement."
          )}
        </div>
      </div>

      {/* Liste des modes (pinned) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;

          const comingSoonLabel = !m.enabled
            ? t("training.menu.comingSoon", "En développement")
            : null;

          const badge = m.badge ?? comingSoonLabel;

          const accentHex = m.accentHex || theme.primary;
          const accentBorder = m.accentBorder || theme.borderSoft;
          const accentGlow = m.accentGlow || `${theme.primary}55`;

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.tab, m.params)}
              style={{
                position: "relative",
                width: "100%",
                padding: 14,
                paddingRight: 46,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${accentBorder}`,
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
                  color: disabled ? theme.textSoft : accentHex,
                  textTransform: "uppercase",
                  textShadow: disabled ? "none" : `0 0 12px ${accentGlow}`,
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
                {badge && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      fontStyle: "italic",
                      opacity: 0.9,
                    }}
                  >
                    • {badge}
                  </span>
                )}
              </div>

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
                  glow={
                    m.id === "evolution"
                      ? "rgba(120,255,180,0.55)"
                      : `${theme.primary}55`
                  }
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

      {/* ✅ Liste auto registry (SANS label "Autres modes d’entraînement") */}
      {extraModes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {extraModes.map((m) => {
              const title = t(m.titleKey, m.titleDefault);
              const subtitle = t(m.subtitleKey, m.subtitleDefault);
              const disabled = !m.enabled;

              const comingSoonLabel = !m.enabled
                ? t("training.menu.comingSoon", "En développement")
                : null;

              const badge = m.badge ?? comingSoonLabel;

              return (
                <button
                  key={m.id}
                  onClick={() => !disabled && navigate(m.tab, m.params)}
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
                      textShadow: disabled ? "none" : `0 0 12px ${theme.primary}55`,
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
                    {badge && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          fontStyle: "italic",
                          opacity: 0.9,
                        }}
                      >
                        • {badge}
                      </span>
                    )}
                  </div>

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
        </div>
      )}

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
              border:
                infoMode.id === "evolution"
                  ? `1px solid rgba(120,255,180,0.55)`
                  : `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginBottom: 8,
                color: infoMode.id === "evolution" ? "#8CFFCB" : theme.primary,
                textTransform: "uppercase",
                textShadow:
                  infoMode.id === "evolution"
                    ? "0 0 10px rgba(120,255,180,0.55)"
                    : `0 0 10px ${theme.primary}55`,
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
                background: infoMode.id === "evolution" ? "#8CFFCB" : theme.primary,
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
