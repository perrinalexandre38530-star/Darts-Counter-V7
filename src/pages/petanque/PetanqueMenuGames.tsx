// ============================================
// src/pages/petanque/PetanqueMenuGames.tsx
// Menu Pétanque — même UX que src/pages/Games.tsx
// ✅ Fix: handlers robustes (ne crash pas si InfoDot ne passe pas l'event)
// ✅ Compat: accepte go(tab, params) OU setTab(tab) selon ton câblage
// ✅ NEW: Quadrette (4v4) + Variantes (équipes impaires)
// ✅ NEW: FFA 3 JOUEURS (chacun pour soi) — 3 boules/joueur => max 3 points/mène
// ✅ NEW: TOURNOI (scope PÉTANQUE uniquement) — ouvre le menu tournois avec forceMode="petanque"
// ✅ Compat routes: supporte "petanque.config" ET "petanque_config"
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import InfoDot from "../../components/InfoDot";
import BackDot from "../../components/BackDot";

// ✅ Tickers images (Vite): /src/assets/tickers/ticker_<id>.png
// On réutilise la même logique que src/pages/Games.tsx
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTickerById(id: string): string | null {
  const raw = String(id || "");
  if (!raw) return null;

  // Tolérant (underscore, tiret, espaces) pour éviter les "missing ticker"
  const norm = raw.trim().toLowerCase();
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
  | "training"
  | "tournament";

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
    infoBodyDefault: "Partie classique en tête-à-tête. 3 boules/joueur → maximum 3 points par mène.",
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
    infoBodyDefault: "Mode équipe 2 contre 2. Standard : 3 boules/joueur → 6 boules/équipe → max 6 points par mène.",
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
    infoBodyDefault: "Mode équipe 3 contre 3. Standard : 2 boules/joueur → 6 boules/équipe → max 6 points par mène.",
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
    infoBodyDefault: "Mode équipe 4 contre 4. Standard : 2 boules/joueur → 8 boules/équipe → max 8 points par mène.",
    enabled: true,
  },
  {
    id: "variants",
    titleKey: "petanque.modes.variants.title",
    titleDefault: "VARIANTES",
    subtitleKey: "petanque.modes.variants.subtitle",
    subtitleDefault: "Équipes impaires (1v2, 2v3, 3v4…) avec compensation de boules.",
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
    infoBodyDefault: "Mode entraînement : mesure des distances, exercices, capture manuel/photo/live.",
    enabled: true,
  },
  {
    id: "tournament",
    titleKey: "petanque.modes.tournament.title",
    titleDefault: "TOURNOI",
    subtitleKey: "petanque.modes.tournament.subtitle",
    subtitleDefault: "Multi-parties — élimination / poules (selon config).",
    infoTitleKey: "petanque.modes.tournament.infoTitle",
    infoTitleDefault: "Tournoi Pétanque",
    infoBodyKey: "petanque.modes.tournament.infoBody",
    infoBodyDefault: "Mode tournoi Pétanque. La structure (élimination directe, poules, nombre d’équipes) se règle dans la page de configuration.",
    enabled: true,
  },
];

export default function PetanqueMenuGames({ go, setTab }: Props) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  const ROUTE_CONFIG_PRIMARY = "petanque.config";
  const ROUTE_CONFIG_FALLBACK = "petanque_config";

  // ✅ Tournois existants (Darts) — on les réutilise mais filtrés via params.forceMode="petanque"
  const ROUTE_TOURNAMENTS = "tournaments";

  function goHome() {
    if (typeof go === "function") {
      go("home" as any);
      return;
    }
    if (typeof setTab === "function") {
      setTab("home" as any);
      return;
    }
    console.error("[PetanqueMenuGames] Aucun handler de navigation pour HOME: props.go et props.setTab sont absents.");
  }


  // ✅ même logique que "Games" : un ticker discret DANS chaque carte (watermark)
  // (2/3 à droite du bouton, opacity faible, fade des bords)
  function tickerKeyForMode(mode: PetanqueModeId): string {
    switch (mode) {
      case "singles":
        return "petanque_1v1";
      case "ffa3":
        return "petanque_free_for_all";
      case "doublette":
        return "petanque_2v2";
      case "triplette":
        return "petanque_3v3";
      case "quadrette":
        return "petanque_4v4";
      case "variants":
        return "petanque_variantes";
      case "training":
        return "petanque_training";
      case "tournament":
        return "petanque_tournois";
      default:
        return "petanque";
    }
  }

  function renderModeTickerWatermark(mode: PetanqueModeId) {
    const src = findTickerById(tickerKeyForMode(mode));
    if (!src) return null;

    // ✅ Lisibilité du libellé des tickers (1v1 / 2v2 / 3v3 / 4v4 / variantes...)
    // IMPORTANT (request): on NE TOUCHE PAS au dégradé (mask) — il doit commencer au même endroit.
    // On règle uniquement le problème en décalant l'IMAGE vers la gauche (sans déplacer le mask).
    // TRAINING & TOURNOIS sont déjà OK → on les garde tels quels.
    const keepAsIs = mode === "training" || mode === "tournament";

    const wmWidth = keepAsIs ? "74%" : "78%";
    const wmObjectPosition = "80% center";

    // ✅ Dégradé constant (ne pas déplacer)
    const mask = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)";

    // ✅ Décalage image vers la gauche (seulement pour les modes où le libellé est rogné)
    const shiftLeftPct: number = keepAsIs
      ? 0
      : mode === "quadrette"
      ? 12
      : mode === "ffa3"
      ? 12
      : mode === "singles"
      ? 10
      : mode === "doublette"
      ? 10
      : mode === "triplette"
      ? 10
      : mode === "variants"
      ? 10
      : 10;

    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: wmWidth,
          pointerEvents: "none",
          opacity: keepAsIs ? 0.24 : 0.26,
          zIndex: 0,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: wmObjectPosition,
            transform: shiftLeftPct ? `translateX(-${shiftLeftPct}%) translateZ(0)` : "translateZ(0)",
            filter: "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))",
          }}
          draggable={false}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.42) 100%)",
            opacity: 0.55,
          }}
        />
      </div>
    );
  }

  function getMaxEndPoints(mode: PetanqueModeId): number {
    if (mode === "singles") return 3;
    if (mode === "ffa3") return 3;
    if (mode === "doublette") return 6;
    if (mode === "triplette") return 6;
    if (mode === "quadrette") return 8;
    if (mode === "tournament") return 6;
    return 6;
  }

  function openPetanqueTournamentsHome() {
    const params = { forceMode: "petanque" };

    if (typeof go === "function") {
      go(ROUTE_TOURNAMENTS as any, params);
      return;
    }
    if (typeof setTab === "function") {
      setTab(ROUTE_TOURNAMENTS as any);
      return;
    }

    console.error("[PetanqueMenuGames] Aucun handler de navigation: props.go et props.setTab sont absents.");
  }

  function navigate(mode: PetanqueModeId) {
    if (mode === "tournament") {
      openPetanqueTournamentsHome();
      return;
    }

    const mappedMode =
      mode === "singles" ? "simple" : mode === "ffa3" ? "ffa3" : mode === "variants" ? "variants" : mode;

    const maxEndPoints = getMaxEndPoints(mode);

    const meta =
      mode === "ffa3"
        ? { kind: "ffa", players: 3 }
        : mode === "singles"
        ? { kind: "teams", teams: 2, teamSize: 1 }
        : { kind: "teams" };

    if (typeof go === "function") {
      try {
        go(ROUTE_CONFIG_PRIMARY as any, { mode: mappedMode, maxEndPoints, meta });
      } catch {
        go(ROUTE_CONFIG_FALLBACK as any, { mode: mappedMode, maxEndPoints, meta });
      }
      return;
    }

    if (typeof setTab === "function") {
      setTab(ROUTE_CONFIG_FALLBACK as any);
      return;
    }

    console.error("[PetanqueMenuGames] Aucun handler de navigation: props.go et props.setTab sont absents.");
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <BackDot onClick={goHome} />
        </div>
        <div style={{ textAlign: "center" }}>
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

          <div style={{ fontSize: 13, color: theme.textSoft, marginBottom: 18, textAlign: "center" }}>
        {t("petanque.menu.subtitle", "Choisis un mode")}
      </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((m) => {
          const title = t(m.titleKey, m.titleDefault);
          const subtitle = t(m.subtitleKey, m.subtitleDefault);
          const disabled = !m.enabled;

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
                background: theme.card,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled ? "none" : `0 10px 24px rgba(0,0,0,0.55)`,
                overflow: "hidden",
              }}
            >
              {/* ✅ Ticker (watermark) sur ~2/3 à droite */}
              {renderModeTickerWatermark(m.id)}

              {/* ✅ contenu au-dessus */}
              <div style={{ position: "relative", zIndex: 1 }}>
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

                <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>{subtitle}</div>
              </div>

              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
                <InfoDot
                  onClick={(ev: any) => {
                    try {
                      ev?.stopPropagation?.();
                    } catch {}
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

            <div style={{ fontSize: 13, lineHeight: 1.4, color: theme.textSoft, marginBottom: 12 }}>
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
