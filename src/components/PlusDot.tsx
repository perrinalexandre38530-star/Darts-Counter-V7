// ============================================
// src/components/PlusDot.tsx
// Bouton rond "+" (même style que InfoDot / BackDot)
// - Couleurs calées sur le thème
// - Halo neon + bord soft
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onClick?: (e: any) => void;
  color?: string;
  glow?: string;
  title?: string;
  size?: number;
};

export default function PlusDot({
  onClick,
  color,
  glow,
  title = "Ajouter / modifier",
  size = 46,
}: Props) {
  const { theme } = useTheme();

  const c = color ?? theme.primary;
  const halo = glow ?? `${c}88`;

  const handle = React.useCallback(
    (e: any) => {
      try {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } catch {}
      onClick?.(e);
    },
    [onClick]
  );

  return (
    <div
      role="button"
      aria-label={title}
      title={title}
      tabIndex={0}
      onPointerDown={handle}
      onClick={handle}
      onKeyDown={(e: any) => {
        if (e.key === "Enter" || e.key === " ") handle(e);
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        border: `2px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.48)",
        boxShadow: `0 0 0 2px rgba(0,0,0,0.22), 0 0 18px ${halo}, 0 0 34px ${halo}`,
        color: c,
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 26,
          fontWeight: 1000,
          lineHeight: 1,
          transform: "translateY(-1px)",
          textShadow: `0 0 12px ${halo}, 0 0 22px ${halo}`,
        }}
      >
        +
      </span>
    </div>
  );
}
