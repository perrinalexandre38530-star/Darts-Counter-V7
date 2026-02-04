// =============================================================
// src/pages/babyfoot/menus/BabyFootMenuMatch.tsx
// Menu MATCH Baby-Foot — mêmes cartes "Games" (plein largeur) + tickers
// ✅ Modes: 1v1 / 2v2 / 2v1
// ✅ Tickers fournis: ticker_babyfoot_1v1 / 2v2 / 2v1
// =============================================================

import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLang } from "../../../contexts/LangContext";
import BackDot from "../../../components/BackDot";
import InfoDot from "../../../components/InfoDot";

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

type ModeId = "match_1v1" | "match_2v2" | "match_2v1" | "tournament";

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
    infoBodyDefault: "Partie classique 1 contre 1. Configure score cible, profils et options.",
    enabled: true,
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
    infoBodyDefault: "Deux joueurs par équipe. Configure score cible et sélectionne les profils.",
    enabled: true,
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
    infoBodyDefault: "2 joueurs dans une équipe contre 1 joueur dans l'autre.",
    enabled: true,
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
    infoBodyDefault: "Ouvre le module Tournois avec scope Baby-Foot.",
    enabled: true,
    tickerId: null,
  },
];

export default function BabyFootMenuMatch({ onBack, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const [infoMode, setInfoMode] = React.useState<ModeDef | null>(null);

  function openTournaments() {
    go("tournaments", { forceMode: "babyfoot" });
  }

  function navigate(mode: ModeId) {
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

  function Watermark({ tickerId }: { tickerId?: string | null }) {
    const src = getTicker(tickerId);
    if (!src) return null;

    const mask =
      "linear-gradient(90deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.78) 18%, rgba(0,0,0,1.00) 55%, rgba(0,0,0,1.00) 100%)";

    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "78%",
          pointerEvents: "none",
          opacity: 0.85,
          zIndex: 0,
          WebkitMaskImage: mask as any,
          maskImage: mask as any,
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
            objectPosition: "right center",
            transform: "translateX(-6%) translateZ(0)",
            filter: "contrast(1.02) saturate(1.02)",
          }}
          draggable={false}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.00) 38%, rgba(0,0,0,0.00) 70%, rgba(0,0,0,0.50) 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <BackDot onClick={onBack} />
        <div style={{ textAlign: "center", fontWeight: 950, letterSpacing: 1, opacity: 0.95 }}>BABY-FOOT — MATCH</div>
        <InfoDot title="Match" body="Choisis un mode puis configure la partie (profils, score cible, chrono, etc.)." glow={theme.primary + "88"} />
      </div>

      <div style={{ fontSize: 13, color: theme.textSoft, marginBottom: 14, textAlign: "center", fontWeight: 850 }}>
        {t("babyfoot.match.subtitle", "Choisis un format de match")}
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
                paddingRight: 54,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                overflow: "hidden",
              }}
            >
              <Watermark tickerId={m.tickerId} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontWeight: 1000, letterSpacing: 0.8, fontSize: 15, color: theme.primary, textShadow: `0 0 12px ${theme.primary}55` }}>
                  {title}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft, fontWeight: 850, lineHeight: 1.35 }}>{subtitle}</div>
              </div>

              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
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
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>{t(infoMode.infoTitleKey, infoMode.infoTitleDefault)}</div>
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
