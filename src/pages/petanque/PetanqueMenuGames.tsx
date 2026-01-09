// ============================================
// src/pages/petanque/PetanqueMenuGames.tsx
// Menu Pétanque — même UX que src/pages/Games.tsx
// ✅ Fix: handlers robustes (ne crash pas si InfoDot ne passe pas l'event)
// ✅ Compat: accepte go(tab, params) OU setTab(tab) selon ton câblage
// ✅ NEW: Quadrette (4v4) + Variantes (équipes impaires)
// ✅ NEW: FFA 3 JOUEURS (chacun pour soi) — 3 boules/joueur => max 3 points/mène
// ✅ Compat routes: supporte "petanque.config" ET "petanque_config"
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import InfoDot from "../../components/InfoDot";

type Props = {
  go?: (tab: any, params?: any) => void;
  setTab?: (tab: any) => void;
};

type PetanqueModeId =
  | "singles"
  | "ffa3"
  | "doublette"
  | "triplette"
  | "quadrette"
  | "variants"
  | "training";

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
      "Partie classique en tête-à-tête. 3 boules/joueur → maximum 3 points par mène.",
    enabled: true,
  },
  {
    id: "ffa3",
    titleKey: "petanque.modes.ffa3.title",
    titleDefault: "MATCH À 3 (CHACUN POUR SOI)",
    subtitleKey: "petanque.modes.ffa3.subtitle",
    subtitleDefault: "Trois joueurs — le premier à 13 gagne.",
    infoTitleKey: "petanque.modes.ffa3.infoTitle",
    infoTitleDefault: "Match à 3 (FFA)",
    infoBodyKey: "petanque.modes.ffa3.infoBody",
    infoBodyDefault:
      "3 joueurs, chacun joue pour soi. 3 boules/joueur. Un seul joueur gagne la mène et marque des points. Maximum 3 points par mène.",
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
      "Mode équipe 2 contre 2. Standard : 3 boules/joueur → 6 boules/équipe → max 6 points par mène.",
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
      "Mode équipe 3 contre 3. Standard : 2 boules/joueur → 6 boules/équipe → max 6 points par mène.",
    enabled: true,
  },
  {
    id: "quadrette",
    titleKey: "petanque.modes.quadrette.title",
    titleDefault: "QUADRETTE (4v4)",
    subtitleKey: "petanque.modes.quadrette.subtitle",
    subtitleDefault: "Deux équipes de quatre joueurs (2 boules/joueur).",
    infoTitleKey: "petanque.modes.quadrette.infoTitle",
    infoTitleDefault: "Quadrette (4v4)",
    infoBodyKey: "petanque.modes.quadrette.infoBody",
    infoBodyDefault:
      "Mode équipe 4 contre 4. Standard : 2 boules/joueur → 8 boules/équipe → max 8 points par mène.",
    enabled: true,
  },
  {
    id: "variants",
    titleKey: "petanque.modes.variants.title",
    titleDefault: "VARIANTES",
    subtitleKey: "petanque.modes.variants.subtitle",
    subtitleDefault:
      "Équipes impaires (1v2, 2v3, 3v4…) avec compensation de boules.",
    infoTitleKey: "petanque.modes.variants.infoTitle",
    infoTitleDefault: "Variantes (équipes impaires)",
    infoBodyKey: "petanque.modes.variants.infoBody",
    infoBodyDefault:
      "Presets 1v2 / 2v3 / 3v4 / 4v3… avec répartition automatique des boules par joueur et score cible ajustable.",
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
      "Mode entraînement : mesure des distances, exercices, capture manuel/photo/live.",
    enabled: true,
  },
];

export default function PetanqueMenuGames({ go, setTab }: Props) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  const ROUTE_CONFIG_PRIMARY = "petanque.config";
  const ROUTE_CONFIG_FALLBACK = "petanque_config";

  function getMaxEndPoints(mode: PetanqueModeId): number {
    // Règle: on ne peut pas marquer plus de points que le nombre de boules gagnantes possibles
    // (donc boules du camp gagnant mieux placées que la meilleure boule adverse).
    if (mode === "singles") return 3;   // 3 boules/joueur
    if (mode === "ffa3") return 3;      // 3 boules/joueur, un seul gagnant
    if (mode === "doublette") return 6; // 2 joueurs x 3 boules
    if (mode === "triplette") return 6; // 3 joueurs x 2 boules
    if (mode === "quadrette") return 8; // 4 joueurs x 2 boules (tel que défini dans l'UI)
    // variants/training: par défaut 6 (sera affiné dans la config)
    return 6;
  }

  function navigate(mode: PetanqueModeId) {
    const mappedMode =
      mode === "singles"
        ? "simple"
        : mode === "ffa3"
        ? "ffa3"
        : mode === "variants"
        ? "variants"
        : mode;

    const maxEndPoints = getMaxEndPoints(mode);

    // On envoie aussi une info pratique pour la config/play (non obligatoire)
    const meta =
      mode === "ffa3"
        ? { kind: "ffa", players: 3 }
        : mode === "singles"
        ? { kind: "teams", teams: 2, teamSize: 1 }
        : { kind: "teams" };

    if (typeof go === "function") {
      try {
        go(ROUTE_CONFIG_PRIMARY as any, { mode: mappedMode, maxEndPoints, meta });
        return;
      } catch {
        go(ROUTE_CONFIG_FALLBACK as any, { mode: mappedMode, maxEndPoints, meta });
        return;
      }
    }

    if (typeof setTab === "function") {
      setTab(ROUTE_CONFIG_FALLBACK as any);
      return;
    }

    console.error(
      "[PetanqueMenuGames] Aucun handler de navigation: props.go et props.setTab sont absents."
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

              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <InfoDot
                  onClick={(ev: any) => {
                    ev?.stopPropagation?.();
                    setInfoMode(m);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>
            </button>
          );
        })}
      </div>

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
              boxShadow: `0 18px 40px rgba(0,0,0,0.7)`,
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
