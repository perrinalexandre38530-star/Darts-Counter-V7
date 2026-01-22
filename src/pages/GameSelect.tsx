// ============================================
// src/pages/GameSelect.tsx
// Hub de sélection de jeu (sans BottomNav)
// - ✅ Texte: "Choisis ton sport"
// - ✅ Affiche 1 sport à la fois (logo plus gros)
// - ✅ Swipe horizontal (doigt) pour défiler sport par sport
// - ✅ Clic sur le sport courant => route principale (avec BottomNav)
// - ✅ FIX: setSport() pour MAJ immédiate (même onglet)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useSport } from "../contexts/SportContext";
import { useDevMode } from "../contexts/DevModeContext";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";

// IMPORTANT: ajuste les chemins si tu places ailleurs
import logoDarts from "../assets/games/logo-darts.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoBabyFoot from "../assets/games/logo-babyfoot.png";

type Props = {
  go: (route: any) => void;
};

type GameId = "darts" | "petanque" | "pingpong" | "babyfoot";

export default function GameSelect({ go }: Props) {
  const { theme } = useTheme();
  const { setSport } = useSport();
  const dev = useDevMode() as any;

  // ✅ routes d'entrée (BottomNav)
  // - Darts: on garde le dashboard "Home"
  // - Sports locaux (Pétanque/Baby-foot/Ping-pong): on ouvre DIRECTEMENT le menu "Games"
  const HOME_ROUTE = "home";
  const GAMES_ROUTE = "games";

  const items: Array<{
    id: GameId;
    label: string;
    logo: string;
    enabled: boolean;
    onClick: () => void;
  }> = [
    {
      id: "darts",
      label: "Darts Counter",
      logo: logoDarts,
      enabled: true,
      onClick: () => {
        setSport("darts");
        go(HOME_ROUTE);
      },
    },
    {
      id: "petanque",
      label: "Pétanque Counter",
      logo: logoPetanque,
      enabled: true,
      onClick: () => {
        setSport("petanque");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "pingpong",
      label: "Ping-Pong Counter",
      logo: logoPingPong,
      enabled: true,
      onClick: () => {
        setSport("pingpong");
        go(GAMES_ROUTE);
      },
    },
    {
      id: "babyfoot",
      label: "Baby-Foot Counter",
      logo: logoBabyFoot,
      enabled: true,
      onClick: () => {
        setSport("babyfoot");
        go(GAMES_ROUTE);
      },
    },
  ];

  // ------------------------------------------
  // Swipe (mobile / tablette)
  // ------------------------------------------
  const [index, setIndex] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);

  const clampIndex = React.useCallback(
    (i: number) => Math.max(0, Math.min(items.length - 1, i)),
    [items.length]
  );

  const goPrev = React.useCallback(() => setIndex((i) => clampIndex(i - 1)), [clampIndex]);
  const goNext = React.useCallback(() => setIndex((i) => clampIndex(i + 1)), [clampIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? null;
    draggingRef.current = true;
  };

  const onTouchMove = () => {
    // On ne fait rien ici: on déclenche seulement au release.
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const startX = startXRef.current;
    startXRef.current = null;

    if (startX == null) return;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;

    // seuil volontairement franc pour éviter les faux positifs
    if (delta > 55) goPrev();
    else if (delta < -55) goNext();
  };

  // Desktop: flèches clavier (confort)
  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft") goPrev();
      if (ev.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const it = items[index];
  const visuallyDisabled = devVisuallyDisabled(!!it.enabled);
  const clickable = devClickable(!!it.enabled, !!dev?.enabled);

  return (
    <div style={wrap(theme)}>
      <div style={panel(theme)} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div style={title(theme)}>Choisis ton sport</div>

        <button
          key={it.id}
          onClick={clickable ? it.onClick : undefined}
          style={sportTile(theme, !visuallyDisabled)}
          aria-disabled={!clickable}
          title={clickable ? "Ouvrir" : "Bientôt"}
        >
          <img
            src={it.logo}
            alt={it.label}
            style={sportImg(theme, !visuallyDisabled)}
            draggable={false}
          />
          <div style={sportLabel(theme, !visuallyDisabled)}>{it.label}</div>
          {visuallyDisabled && <div style={soonPill(theme)}>SOON</div>}
        </button>

        <div style={dotsWrap}>
          {items.map((_, i) => (
            <span key={i} style={dot(theme, i === index)} />
          ))}
        </div>

        {/* Zones tactiles discrètes (utile tablette) */}
        <button aria-label="Précédent" onClick={goPrev} style={edgeTap("left")} />
        <button aria-label="Suivant" onClick={goNext} style={edgeTap("right")} />
      </div>
    </div>
  );
}

// ---------------- styles ----------------

function wrap(theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px 14px",
    backgroundColor: "#000",
    overflow: "hidden",
  };
}

function panel(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 680,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    position: "relative",
    padding: "18px 12px 10px",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "pan-y", // autorise le swipe horizontal sans bloquer le scroll vertical global (mais ici pas de scroll)
  };
}

function title(theme: any): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const c = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.86)";
  return {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: c,
    textAlign: "center",
    padding: "0 6px",
  };
}

function sportTile(theme: any, enabled: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const bg = isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.03)";
  const glow = enabled
    ? isDark
      ? "0 18px 60px rgba(0,0,0,0.65)"
      : "0 18px 60px rgba(0,0,0,0.22)"
    : "none";

  return {
    position: "relative",
    borderRadius: 28,
    border: `1px solid ${border}`,
    background: bg,
    boxShadow: glow,
    width: "min(520px, 92vw)",
    padding: "18px 14px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.55,
    transform: enabled ? "translateZ(0)" : "none",
  };
}

function sportImg(theme: any, enabled: boolean): React.CSSProperties {
  const size = "min(320px, 72vw)"; // gros logo (1 sport à la fois)
  const glow = enabled ? (theme?.accentGlow ?? "0 0 0 rgba(0,0,0,0)") : "none";

  return {
    width: size,
    height: size,
    objectFit: "contain",
    filter: enabled ? "drop-shadow(0 10px 28px rgba(0,0,0,0.55))" : "grayscale(1)",
    boxShadow: glow,
    pointerEvents: "none",
  };
}

function sportLabel(theme: any, enabled: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const c = isDark ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.82)";
  return {
    fontSize: 18,
    fontWeight: 700,
    opacity: enabled ? 0.9 : 0.7,
    color: c,
    textAlign: "center",
    paddingBottom: 4,
    pointerEvents: "none",
  };
}

const dotsWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "2px 0 0",
};

function dot(theme: any, active: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const base = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
  const on = theme?.accent ?? (isDark ? "rgba(255,215,0,0.95)" : "rgba(0,0,0,0.70)");
  return {
    width: active ? 10 : 8,
    height: active ? 10 : 8,
    borderRadius: 999,
    background: active ? on : base,
    transition: "all 140ms ease",
  };
}

function soonPill(theme: any): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const bg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const c = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.78)";
  return {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    padding: "6px 10px",
    borderRadius: 999,
    background: bg,
    color: c,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
  };
}

function edgeTap(side: "left" | "right"): React.CSSProperties {
  // zones invisibles pour faciliter le swipe sur tablette
  const common: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "14%",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: 0,
    cursor: "default",
  };
  return side === "left"
    ? { ...common, left: 0 }
    : { ...common, right: 0 };
}
