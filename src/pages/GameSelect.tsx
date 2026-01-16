// ============================================
// src/pages/GameSelect.tsx
// Hub de sélection de jeu (sans BottomNav)
// - Affiche uniquement 4 logos (2x2)
// - Clic sur un logo => route principale (avec BottomNav)
// ✅ FIX: setSport() pour MAJ immédiate (même onglet)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useSport } from "../contexts/SportContext";

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

  // ✅ route d'entrée de l'app (BottomNav)
  const HOME_ROUTE = "home";

  const items: Array<{
    id: GameId;
    logo: string;
    enabled: boolean;
    onClick: () => void;
  }> = [
    {
      id: "darts",
      logo: logoDarts,
      enabled: true,
      onClick: () => {
        setSport("darts"); // ✅ MAJ state + persistance LS dc-start-game
        go(HOME_ROUTE);
      },
    },
    {
      id: "petanque",
      logo: logoPetanque,
      enabled: true,
      onClick: () => {
        setSport("petanque"); // ✅ MAJ state + persistance LS dc-start-game
        go(HOME_ROUTE);
      },
    },
    {
      id: "pingpong",
      logo: logoPingPong,
      enabled: true,
      onClick: () => {
        setSport("pingpong");
        go(HOME_ROUTE);
      },
    },
    {
      id: "babyfoot",
      logo: logoBabyFoot,
      enabled: true,
      onClick: () => {
        setSport("babyfoot");
        go(HOME_ROUTE);
      },
    },
  ];

  return (
    <div style={wrap(theme)}>
      <div style={grid}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={it.enabled ? it.onClick : undefined}
            style={tile(theme, it.enabled)}
            aria-disabled={!it.enabled}
            title={it.enabled ? "Ouvrir" : "Bientôt"}
          >
            <img src={it.logo} alt={it.id} style={img(theme, it.enabled)} draggable={false} />
            {!it.enabled && <div style={soonPill(theme)}>SOON</div>}
          </button>
        ))}
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
  };
}

const grid: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

function tile(theme: any, enabled: boolean): React.CSSProperties {
  const isDark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const bg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
  const glow = enabled
    ? isDark
      ? "0 14px 40px rgba(0,0,0,0.55)"
      : "0 14px 40px rgba(0,0,0,0.18)"
    : "none";

  return {
    position: "relative",
    borderRadius: 22,
    border: `1px solid ${border}`,
    background: bg,
    boxShadow: glow,
    padding: 18,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.55,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: "1 / 1",
    userSelect: "none",
  };
}

function img(theme: any, enabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    filter: enabled ? "none" : "grayscale(0.15)",
    transform: enabled ? "scale(1.02)" : "scale(1.0)",
  };
}

function soonPill(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1,
    padding: "5px 9px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
  };
}
