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
// - ✅ NEW: BackDot en haut pour revenir au menu Games
//
// ✅ NEW (cette demande) :
// - En TRAINING, tout mode "en développement" (registry.ready === false)
//   est GRISÉ + NON CLIQUABLE
//
// ✅ NEW (ticker dans cartes, comme Games) :
// - Si src/assets/tickers/ticker_<gameId>.png existe => affichage en fond
// - Fond discret : 75% largeur, 100% hauteur, côté droit
// - Dégradé de chaque côté pour fusionner avec la carte
// - Matching tolérant : ticker_super_bull.png fonctionne aussi si id = training_super_bull, super_bull_training, etc.
// ============================================

import React, { useLayoutEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useDevMode } from "../contexts/DevModeContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import tickerTraining from "../assets/tickers/ticker_training.png";
import { dartsGameRegistry } from "../games/dartsGameRegistry";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";

type Tab =
  | "games"
  | "training"
  | "training_x01"
  | "training_clock"
  | "training_stats"
  | "training_mode"
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

  // ✅ ticker overlay
  tickerSrc?: string | null;
};

const TICKERS = import.meta.glob("../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function normId(id: string) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function findTickerSmart(gameId: string): string | null {
  const raw = normId(gameId);
  if (!raw) return null;

  // candidats (tolérant)
  const candidates = Array.from(
    new Set([
      raw,
      raw.replace(/^training_/, ""),
      raw.replace(/_training$/, ""),
      raw.replace(/^training/, ""),
      raw.replace(/training$/, ""),
    ])
  ).filter(Boolean);

  // on cherche ticker_<candidate>.png dans /src/assets/tickers/
  for (const c of candidates) {
    const suffix = `/ticker_${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.toLowerCase().endsWith(suffix)) return TICKERS[k];
    }
  }
  return null;
}

function TickerOverlay({ src }: { src?: string | null }) {
  if (!src) return null;

  // ✅ 75% largeur, 100% hauteur, à droite
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "75%",
          opacity: 0.22,
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // remplit toute la zone (100% hauteur)
            display: "block",
            transform: "translateZ(0)",
            filter: "saturate(1.05) contrast(1.05)",
          }}
          draggable={false}
        />

        {/* ✅ fondu gauche */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "45%",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.0) 100%)",
          }}
        />

        {/* ✅ fondu droit */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "18%",
            background:
              "linear-gradient(270deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.0) 100%)",
          }}
        />
      </div>
    </div>
  );
}

export default function TrainingMenu({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const dev = useDevMode() as any;
  
  useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);
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
        "evolution",
        "training_evolution",
      ]),
    []
  );

  const MODES: ModeDef[] = React.useMemo(() => {
    const comingSoon = t("training.menu.comingSoon", "En développement");

    const doubleio = regById.get("training_doubleio");
    const challenges = regById.get("training_challenges");

    const isReady = (g: any) => {
      if (!g) return false;
      if (typeof g.ready === "boolean") return g.ready;
      return true;
    };

    const badgeFromRegistry = (g: any) => {
      if (!g) return comingSoon;
      if (typeof g.ready === "boolean") return g.ready ? null : comingSoon;
      return null;
    };

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
      tickerSrc: findTickerSmart("evolution"),
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
      tickerSrc: findTickerSmart("training_x01") ?? findTickerSmart("x01"),
    };

    const clock: ModeDef = {
      id: "clock",
      titleKey: "training.menu.clock.title",
      titleDefault: "Tour de l’horloge",
      subtitleKey: "training.menu.clock.subtitle",
      subtitleDefault: "Simple / Double / Triple",
      infoKey: "training.menu.clock.info",
      infoDefault: "Atteins chaque segment du 1 au 20 puis Bull. Mode simple, double ou triple.",
      tab: "training_clock",
      enabled: true,
      tickerSrc: findTickerSmart("tour_horloge") ?? findTickerSmart("training_clock"),
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
      tab: "training_mode",
      params: { modeId: "training_doubleio" },
      enabled: isReady(doubleio),
      badge: badgeFromRegistry(doubleio),
      tickerSrc: findTickerSmart("training_doubleio"),
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
      tab: "training_mode",
      params: { modeId: "training_challenges" },
      enabled: isReady(challenges),
      badge: badgeFromRegistry(challenges),
      tickerSrc: findTickerSmart("training_challenges"),
    };

    return [evolution, x01, clock, doubleIOCard, challengesCard];
  }, [t, regById]);

  const extraModes: ModeDef[] = React.useMemo(() => {
    const comingSoon = t("training.menu.comingSoon", "En développement");

    const isReady = (g: any) => {
      if (!g) return false;
      if (typeof g.ready === "boolean") return g.ready;
      return true;
    };

    const trainings = (dartsGameRegistry || [])
      .filter((g: any) => g.entry === "training")
      .filter((g: any) => !pinnedRegistryIds.has(g.id))
      .filter((g: any) => {
        const id = String(g.id || "").toLowerCase();
        return id !== "evolution" && id !== "training_evolution";
      });

    trainings.sort((a: any, b: any) => a.label.localeCompare(b.label, "fr"));

    return trainings.map((g: any) => {
      const ready = isReady(g);
      return {
        id: g.id,
        titleKey: `training.registry.${g.id}.title`,
        titleDefault: g.label,
        subtitleKey: `training.registry.${g.id}.subtitle`,
        subtitleDefault: "Entraînement dédié",
        infoKey: `training.registry.${g.id}.info`,
        infoDefault:
          "Ce mode est enregistré dans l’application. S’il n’est pas encore implémenté, il sera affiché comme “En développement”.",
        tab: "training_mode",
        params: { modeId: g.id },
        enabled: ready,
        badge: ready ? null : comingSoon,
        tickerSrc: findTickerSmart(g.id),
      };
    });
  }, [t, pinnedRegistryIds]);

  const renderCard = (m: ModeDef, accent: { hex: string; border: string; glow: string }) => {
    const title = t(m.titleKey, m.titleDefault);
    const subtitle = t(m.subtitleKey, m.subtitleDefault);
    const visuallyDisabled = devVisuallyDisabled(!!m.enabled);
    const clickable = devClickable(!!m.enabled, !!dev?.enabled);

    const badge = m.badge ?? (visuallyDisabled ? t("training.menu.comingSoon", "En développement") : null);

    return (
      <button
        key={m.id}
        onClick={() => clickable && navigate(m.tab, m.params)}
        style={{
          position: "relative",
          width: "100%",
          padding: 14,
          paddingRight: 46,
          textAlign: "left",
          borderRadius: 16,
          border: `1px solid ${accent.border}`,
          background: CARD_BG,
          cursor: clickable ? "pointer" : "default",
          opacity: visuallyDisabled ? 0.55 : 1,
          boxShadow: visuallyDisabled ? "none" : `0 10px 24px rgba(0,0,0,0.55)`,
          overflow: "hidden",
          filter: visuallyDisabled ? "grayscale(0.65)" : "none",
        }}
      >
        {/* ✅ ticker discret dans la carte */}
        <TickerOverlay src={m.tickerSrc} />

        {/* contenu au-dessus */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: visuallyDisabled ? theme.textSoft : accent.hex,
              textTransform: "uppercase",
              textShadow: visuallyDisabled ? "none" : `0 0 12px ${accent.glow}`,
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
        </div>

        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <InfoDot
            size={30}
            color="#FFFFFF"
            glow={m.id === "evolution" ? "rgba(120,255,180,0.55)" : `${theme.primary}55`}
            onClick={(e) => {
              e.stopPropagation();
              setInfoMode(m);
            }}
          />
        </div>
      </button>
    );
  };

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
      {/* HEADER TICKER (full-width) */}
<div
  style={{
    position: "sticky",
    top: 0,
    zIndex: 60,
    paddingTop: "env(safe-area-inset-top)",
    marginLeft: -16,
    marginRight: -16,
    marginBottom: 10,
  }}
>
  <div style={{ position: "relative" }}>
    <img
      src={tickerTraining}
      alt="Training"
      draggable={false}
      style={{
        width: "100%",
        height: 92,
        objectFit: "cover",
        display: "block",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <BackDot onClick={() => navigate("games")} glow={theme.primary + "88"} />
      </div>
      <div style={{ width: 42 }} />
    </div>
  </div>
</div>

      {/* Pinned modes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const accentHex = m.accentHex || theme.primary;
          const accentBorder = m.accentBorder || theme.borderSoft;
          const accentGlow = m.accentGlow || `${theme.primary}55`;
          return renderCard(m, { hex: accentHex, border: accentBorder, glow: accentGlow });
        })}
      </div>

      {/* Extra registry modes (sans label "Autres...") */}
      {extraModes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {extraModes.map((m) => renderCard(m, { hex: theme.primary, border: theme.borderSoft, glow: `${theme.primary}55` }))}
          </div>
        </div>
      )}

      {/* Overlay info */}
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