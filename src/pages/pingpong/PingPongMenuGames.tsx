// ============================================
// src/pages/pingpong/PingPongMenuGames.tsx
// Menu Ping-Pong — même UX que src/pages/Games.tsx (Darts)
// ✅ Cartes actives : Match simple (1v1) / Match en sets / Tournante / Tournoi
// ✅ Local only (pas d'Online)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import InfoDot from "../../components/InfoDot";

type Props = {
  go: (tab: any, params?: any) => void;
};

type PingPongModeId = "simple" | "sets" | "tournante" | "tournament";

type ModeDef = {
  id: PingPongModeId;
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
    id: "simple",
    titleKey: "pingpong.modes.simple.title",
    titleDefault: "MATCH SIMPLE (1v1)",
    subtitleKey: "pingpong.modes.simple.subtitle",
    subtitleDefault: "Un set direct (score cible configurable).",
    infoTitleKey: "pingpong.modes.simple.infoTitle",
    infoTitleDefault: "Match simple",
    infoBodyKey: "pingpong.modes.simple.infoBody",
    infoBodyDefault: "Partie rapide : un set, points configurable, avantage (écart 2) optionnel.",
    enabled: true,
  },
  {
    id: "sets",
    titleKey: "pingpong.modes.sets.title",
    titleDefault: "MATCH EN SETS",
    subtitleKey: "pingpong.modes.sets.subtitle",
    subtitleDefault: "Best-of (ex: 3 sets gagnants).",
    infoTitleKey: "pingpong.modes.sets.infoTitle",
    infoTitleDefault: "Match en sets",
    infoBodyKey: "pingpong.modes.sets.infoBody",
    infoBodyDefault: "Configure points par set, nombre de sets gagnants, et la règle d'écart.",
    enabled: true,
  },
  {
    id: "tournante",
    titleKey: "pingpong.modes.tournante.title",
    titleDefault: "TOURNANTE",
    subtitleKey: "pingpong.modes.tournante.subtitle",
    subtitleDefault: "Joueurs illimités — 1 éliminé à chaque tour.",
    infoTitleKey: "pingpong.modes.tournante.infoTitle",
    infoTitleDefault: "Tournante",
    infoBodyKey: "pingpong.modes.tournante.infoBody",
    infoBodyDefault: "Mode club : rotation autour de la table, élimination progressive. (Config dédiée)",
    enabled: true,
  },
  {
    id: "tournament",
    titleKey: "pingpong.modes.tournament.title",
    titleDefault: "TOURNOI",
    subtitleKey: "pingpong.modes.tournament.subtitle",
    subtitleDefault: "Multi-parties — KO / poules (selon config).",
    infoTitleKey: "pingpong.modes.tournament.infoTitle",
    infoTitleDefault: "Tournoi Ping-Pong",
    infoBodyKey: "pingpong.modes.tournament.infoBody",
    infoBodyDefault: "Mode tournoi (local) : brackets, poules, phases finales (selon la config Tournois).",
    enabled: true,
  },
];

export default function PingPongMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  function openTournaments() {
    go("tournaments", { forceMode: "pingpong" });
  }

  function navigate(mode: PingPongModeId) {
    if (mode === "tournament") {
      openTournaments();
      return;
    }

    // NB: PingPongConfig actuel gère déjà les sets.
    // On passe quand même un mode pour permettre une UI différenciée.
    const meta =
      mode === "simple"
        ? { kind: "single_set" }
        : mode === "sets"
        ? { kind: "multi_sets" }
        : { kind: "tournante", players: "unlimited" };

    go("pingpong_config", { mode, meta });
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
        {t("pingpong.title", "PING-PONG")}
      </h1>

      <div style={{ fontSize: 13, color: theme.textSoft, marginBottom: 18, textAlign: "center" }}>
        {t("pingpong.subtitle", "Choisis un mode")}
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
              color: theme.text,
              boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontWeight: 1000, color: theme.primary, fontSize: 18, marginBottom: 8 }}>
              {t(infoMode.infoTitleKey, infoMode.infoTitleDefault)}
            </div>

            <div style={{ color: theme.textSoft, fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
              {t(infoMode.infoBodyKey, infoMode.infoBodyDefault)}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setInfoMode(null)}
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
