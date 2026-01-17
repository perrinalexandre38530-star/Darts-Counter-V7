// ============================================
// src/pages/babyfoot/BabyFootMenuGames.tsx
// Menu Baby-Foot — même UX que src/pages/Games.tsx (Darts)
// ✅ Cartes actives : Match 1v1 / 2v2 / 2v1 / Tournoi
// ✅ Local only (pas d'Online)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import InfoDot from "../../components/InfoDot";

type Props = {
  go: (tab: any, params?: any) => void;
};

type BabyFootModeId = "match_1v1" | "match_2v2" | "match_2v1" | "tournament";

type ModeDef = {
  id: BabyFootModeId;
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
    id: "match_1v1",
    titleKey: "babyfoot.modes.1v1.title",
    titleDefault: "MATCH SIMPLE (1v1)",
    subtitleKey: "babyfoot.modes.1v1.subtitle",
    subtitleDefault: "Deux joueurs — un par équipe.",
    infoTitleKey: "babyfoot.modes.1v1.infoTitle",
    infoTitleDefault: "Match 1v1",
    infoBodyKey: "babyfoot.modes.1v1.infoBody",
    infoBodyDefault: "Partie classique 1 contre 1. Configure score cible, noms et options.",
    enabled: true,
  },
  {
    id: "match_2v2",
    titleKey: "babyfoot.modes.2v2.title",
    titleDefault: "MATCH ÉQUIPES (2v2)",
    subtitleKey: "babyfoot.modes.2v2.subtitle",
    subtitleDefault: "Deux équipes de deux.",
    infoTitleKey: "babyfoot.modes.2v2.infoTitle",
    infoTitleDefault: "Match 2v2",
    infoBodyKey: "babyfoot.modes.2v2.infoBody",
    infoBodyDefault: "Deux joueurs par équipe. Configure score cible et noms des équipes/joueurs.",
    enabled: true,
  },
  {
    id: "match_2v1",
    titleKey: "babyfoot.modes.2v1.title",
    titleDefault: "VARIANTE (2v1)",
    subtitleKey: "babyfoot.modes.2v1.subtitle",
    subtitleDefault: "Deux joueurs contre un.",
    infoTitleKey: "babyfoot.modes.2v1.infoTitle",
    infoTitleDefault: "Variante 2v1",
    infoBodyKey: "babyfoot.modes.2v1.infoBody",
    infoBodyDefault: "Mode asymétrique : 2 joueurs dans une équipe contre 1 joueur dans l'autre.",
    enabled: true,
  },
  {
    id: "tournament",
    titleKey: "babyfoot.modes.tournament.title",
    titleDefault: "TOURNOI",
    subtitleKey: "babyfoot.modes.tournament.subtitle",
    subtitleDefault: "Multi-parties — KO / poules (selon config).",
    infoTitleKey: "babyfoot.modes.tournament.infoTitle",
    infoTitleDefault: "Tournoi Baby-Foot",
    infoBodyKey: "babyfoot.modes.tournament.infoBody",
    infoBodyDefault: "Mode tournoi (local) : brackets, poules, phases finales (selon la config Tournois).",
    enabled: true,
  },
];

export default function BabyFootMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  function openTournaments() {
    go("tournaments", { forceMode: "babyfoot" });
  }

  function navigate(mode: BabyFootModeId) {
    if (mode === "tournament") {
      openTournaments();
      return;
    }

    const meta =
      mode === "match_1v1"
        ? { kind: "teams", teams: 2, teamSizeA: 1, teamSizeB: 1 }
        : mode === "match_2v2"
        ? { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 2 }
        : { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 1 };

    go("babyfoot_config", { mode, meta });
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
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
        {t("babyfoot.title", "BABY-FOOT")}
      </h1>

      <div style={{ fontSize: 13, color: theme.textSoft, marginBottom: 18, textAlign: "center" }}>
        {t("babyfoot.subtitle", "Choisis un mode")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;
          const comingSoon = disabled ? t("games.status.comingSoon", "Bientôt disponible") : null;

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
                borderRadius: 18,
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 32px rgba(0,0,0,0.30)`,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <div style={{ fontWeight: 1000, letterSpacing: 0.6, fontSize: 15, color: theme.textMain ?? theme.text }}>
                {title}
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft, fontWeight: 800, lineHeight: 1.35 }}>
                {subtitle}
              </div>

              {comingSoon && (
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: theme.textSoft,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {comingSoon}
                </div>
              )}

              <div style={{ position: "absolute", right: 12, top: 12 }}>
                <InfoDot
                  onClick={(e: any) => {
                    try {
                      e?.stopPropagation?.();
                      e?.preventDefault?.();
                    } catch {}
                    setInfoMode(m);
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal Info */}
      {infoMode && (
        <div
          onClick={() => setInfoMode(null)}
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
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {t(infoMode.infoTitleKey, infoMode.infoTitleDefault)}
              </div>
              <button
                onClick={() => setInfoMode(null)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  fontWeight: 900,
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}>
              {t(infoMode.infoBodyKey, infoMode.infoBodyDefault)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
