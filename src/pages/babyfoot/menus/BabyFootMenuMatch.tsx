// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuMatch.tsx
// Menu MATCH — Baby-Foot (sport autonome)
//
// ✅ UI V3.4 (ajustée):
//   - header ticker + BackDot à droite (pas de InfoDot header)
//   - cartes : zone titre à gauche + ticker “plein cadre” décalé VERS LA GAUCHE
//     pour mieux voir le contenu du visuel
//   - dégradés :
//       * fondu gauche (fort) pour laisser le titre lisible (style Games Darts/Pétanque)
//       * fondu droite pour lisibilité du bouton InfoDot
//   - pas d’annotations sous le titre (tout passe dans InfoDot / modal)
// ✅ IMPORTANT : “centrer en hauteur le texte sur le ticker”
//   → on recadre verticalement l’image via objectPosition Y (TICKER_Y)
// ✅ Tickers: /src/assets/tickers/ticker_babyfoot_*.png
// ✅ Modes: 1v1 / 2v2 / 2v1 + TOURNOI + LIGUE
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLang } from "../../../contexts/LangContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

import logoBabyFoot from "../../../assets/games/logo-babyfoot.png";

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

type Props = {
  onBack: () => void;
  go: (t: any, p?: any) => void;
};

type ModeId =
  | "match_1v1"
  | "match_2v2"
  | "match_2v1"
  | "tournament"
  | "league";

type ModeDef = {
  id: ModeId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoTitleKey: string;
  infoTitleDefault: string;
  infoBodyKey: string;
  infoBodyDefault: string;
  enabled: boolean;
  status: "OK" | "BETA" | "WIP";
  tickerId?: string | null;
};

const MODES: ModeDef[] = [
  {
    id: "match_1v1",
    titleKey: "babyfoot.modes.1v1.title",
    titleDefault: "MATCH SIMPLE",
    subtitleKey: "babyfoot.modes.1v1.subtitle",
    subtitleDefault: "1v1 — un joueur par équipe",
    infoTitleKey: "babyfoot.modes.1v1.infoTitle",
    infoTitleDefault: "Match 1v1",
    infoBodyKey: "babyfoot.modes.1v1.infoBody",
    infoBodyDefault:
      "Règles & setup (1v1)\n" +
      "• 1 joueur VS 1 joueur (1 profil par équipe).\n" +
      "• Choisis les profils, le score cible et les options de match.\n" +
      "• But = +1 (ou règles du preset si activées).\n" +
      "• Fin de match : équipe qui atteint le score cible en premier.\n" +
      "• Historique/Stats : sauvegarde locale du match (si activée).",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_1v1",
  },
  {
    id: "match_2v2",
    titleKey: "babyfoot.modes.2v2.title",
    titleDefault: "MATCH ÉQUIPES",
    subtitleKey: "babyfoot.modes.2v2.subtitle",
    subtitleDefault: "2v2 — deux joueurs par équipe",
    infoTitleKey: "babyfoot.modes.2v2.infoTitle",
    infoTitleDefault: "Match 2v2",
    infoBodyKey: "babyfoot.modes.2v2.infoBody",
    infoBodyDefault:
      "Règles & setup (2v2)\n" +
      "• 2 joueurs par équipe (4 profils au total).\n" +
      "• Compositions réelles : Team A / Team B (utile pour stats d’équipes).\n" +
      "• Choisis score cible, options et éventuellement chrono/preset.\n" +
      "• Fin : première équipe au score cible.\n" +
      "• Conseillé : activer l’historique pour stats de duels/équipes.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_2v2",
  },
  {
    id: "match_2v1",
    titleKey: "babyfoot.modes.2v1.title",
    titleDefault: "VARIANTE",
    subtitleKey: "babyfoot.modes.2v1.subtitle",
    subtitleDefault: "2v1 — asymétrique",
    infoTitleKey: "babyfoot.modes.2v1.infoTitle",
    infoTitleDefault: "Variante 2v1",
    infoBodyKey: "babyfoot.modes.2v1.infoBody",
    infoBodyDefault:
      "Règles & setup (2v1)\n" +
      "• 2 joueurs dans une équipe contre 1 joueur dans l'autre.\n" +
      "• Idéal pour équilibrer un écart de niveau.\n" +
      "• Configure score cible et profils (2 profils côté équipe, 1 profil côté solo).\n" +
      "• Option recommandée : handicap/preset si disponible (à venir).\n" +
      "• Fin : équipe au score cible.",
    enabled: true,
    status: "OK",
    tickerId: "babyfoot_2v1",
  },
  {
    id: "tournament",
    titleKey: "babyfoot.modes.tournament.title",
    titleDefault: "TOURNOI",
    subtitleKey: "babyfoot.modes.tournament.subtitle",
    subtitleDefault: "Local — via module Tournois",
    infoTitleKey: "babyfoot.modes.tournament.infoTitle",
    infoTitleDefault: "Tournoi Baby-Foot",
    infoBodyKey: "babyfoot.modes.tournament.infoBody",
    infoBodyDefault:
      "Tournoi (WIP)\n" +
      "• Ouvre le module Tournois avec un scope Baby-Foot.\n" +
      "• Objectif : poules / KO, planning, résultats + stats.\n" +
      "• À venir : templates (2v2), gestion équipes, classement final.",
    enabled: true,
    status: "WIP",
    tickerId: "babyfoot_tournoi",
  },
  {
    id: "league",
    titleKey: "babyfoot.modes.league.title",
    titleDefault: "LIGUE",
    subtitleKey: "babyfoot.modes.league.subtitle",
    subtitleDefault: "Classement • saisons • clubs",
    infoTitleKey: "babyfoot.modes.league.infoTitle",
    infoTitleDefault: "Ligue Baby-Foot",
    infoBodyKey: "babyfoot.modes.league.infoBody",
    infoBodyDefault:
      "Ligue (à venir)\n" +
      "• Saisons, clubs, classement, ELO/points, calendrier.\n" +
      "• Stats : buts, séries, victoires/défaites, duels, compositions.\n" +
      "• Intégration : matchs du module MATCH alimenteront la ligue.",
    enabled: false,
    status: "WIP",
    tickerId: "babyfoot_ligue",
  },
];

// ✅ Recadrage vertical des tickers (pour centrer le texte DANS l'image)
// Valeur = pourcentage Y de object-position (0 = haut, 50 = centre, 100 = bas)
const TICKER_Y: Partial<Record<ModeId, number>> = {
  match_1v1: 50,
  match_2v2: 50,
  match_2v1: 50,
  tournament: 50,
  league: 50,
};

export default function BabyFootMenuMatch({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  function openTournaments() {
    go("tournaments", { forceMode: "babyfoot" });
  }

  function openLeague() {
    // placeholder (page à créer plus tard)
  }

  function navigate(mode: ModeId) {
    if (mode === "tournament") return openTournaments();
    if (mode === "league") return openLeague();

    const meta =
      mode === "match_1v1"
        ? { kind: "teams", teams: 2, teamSizeA: 1, teamSizeB: 1 }
        : mode === "match_2v2"
        ? { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 2 }
        : { kind: "teams", teams: 2, teamSizeA: 2, teamSizeB: 1 };

    go("babyfoot_config", { mode, meta });
  }

  const cardHeight = 86;

  // ✅ fondu gauche (style Games Darts/Pétanque) : laisse le titre parfaitement lisible
  const leftFade =
    "linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.86) 38%, rgba(0,0,0,0.55) 66%, rgba(0,0,0,0.10) 88%, rgba(0,0,0,0.00) 100%)";
  // ✅ fondu droite : contraste pour InfoDot / bords du ticker
  const rightFade =
    "linear-gradient(270deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.00) 100%)";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER TICKER */}
      <div style={{ position: "relative", width: "100%", marginBottom: 10 }}>
        <img
          src={getTicker("babyfoot_match") || logoBabyFoot}
          alt="Baby-Foot — Match"
          style={{
            width: "100%",
            height: 90,
            objectFit: "cover",
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
          }}
          draggable={false}
        />

        {/* BackDot à droite */}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <BackDot onClick={onBack} />
        </div>
      </div>

      {/* TEXTE */}
      <div
        style={{
          margin: "4px 0 12px",
          textAlign: "center",
          fontWeight: 950,
          letterSpacing: 0.8,
          color: theme.textSoft,
          textShadow: "0 6px 18px rgba(0,0,0,0.45)",
          opacity: 0.95,
        }}
      >
        {t("babyfoot.match.subtitle", "Choisis un format de match")}
      </div>

      {/* CARTES */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;
          const src = getTicker(m.tickerId) || logoBabyFoot;
          const y = TICKER_Y[m.id] ?? 50;

          return (
            <button
              key={m.id}
              onClick={() => !disabled && navigate(m.id)}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", width: "100%", height: cardHeight }}>
                {/* ✅ ticker: on limite le zoom + on décale vers la GAUCHE pour voir le contenu
                    (sinon on ne voit que le bord droit du ticker). */}
                <img
                  src={src}
                  alt={title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "112%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `50% ${y}%`,
                    transform: "translateX(-10%) translateZ(0)", // ✅ plus à gauche
                  }}
                  draggable={false}
                />

                {/* ✅ fondu gauche (fort) : titre lisible */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "74%",
                    background: leftFade,
                    pointerEvents: "none",
                  }}
                />

                {/* ✅ fondu droite : bords / InfoDot */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: "100%",
                    width: "28%",
                    background: rightFade,
                    pointerEvents: "none",
                    opacity: 0.95,
                  }}
                />

                {/* légère vignette pour homogénéiser */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.20) 100%)",
                    opacity: 0.55,
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Titre à gauche (couleur thème) — sans annotation visible */}
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  maxWidth: "62%",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 1000,
                    letterSpacing: 0.9,
                    color: theme.primary,
                    textTransform: "uppercase",
                    textShadow: `0 0 12px ${theme.primary}55, 0 8px 24px rgba(0,0,0,0.70)`,
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </div>
              </div>

              {/* Détail intégré (InfoDot) */}
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 3,
                }}
              >
                <InfoDot
                  onClick={(e: any) => {
                    try {
                      e?.stopPropagation?.();
                      e?.preventDefault?.();
                    } catch {}
                    setInfoMode(m);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>

              {/* Texte invisible (accessibilité) */}
              <span style={{ position: "absolute", left: -9999, top: -9999 }}>
                {title} — {subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* MODAL — infos/règles */}
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
              maxWidth: 560,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
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

            {/* subtitle uniquement dans la modal */}
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
                color: theme.textSoft,
                fontWeight: 800,
              }}
            >
              {t(infoMode.subtitleKey, infoMode.subtitleDefault)}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.5,
                color: theme.textSoft,
                whiteSpace: "pre-line",
              }}
            >
              {t(infoMode.infoBodyKey, infoMode.infoBodyDefault)}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.18)",
                padding: "6px 10px",
                borderRadius: 999,
                fontWeight: 950,
                letterSpacing: 0.6,
                fontSize: 11,
              }}
            >
              {infoMode.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
