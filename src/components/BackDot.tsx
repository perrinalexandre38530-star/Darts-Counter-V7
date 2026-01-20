// ============================================
// src/components/BackDot.tsx
// BackDot robuste (anti "button in button")
// ✅ Pas de <button> => évite DOM nesting warnings
// ✅ Click fiable mobile/desktop : onPointerDown + onClick
// ✅ stopPropagation + preventDefault
// ✅ NEW: couleur icône (thème) + style harmonisé InfoDot
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onClick?: (e: any) => void;
  glow?: string;
  title?: string;
  size?: number; // px
  color?: string; // ✅ NEW : couleur icône (sinon theme.primary)
};

export default function BackDot({
  onClick,
  glow,
  title = "Retour",
  size = 46,
  color,
}: Props) {
  const { theme } = useTheme();

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

  const iconColor = color ?? theme.primary;
  const halo = glow ?? `${iconColor}88`;

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
        color: iconColor,
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 24,
          fontWeight: 1000,
          lineHeight: 1,
          transform: "translateX(-1px)",
          textShadow: `0 0 12px ${halo}, 0 0 22px ${halo}`,
        }}
      >
        ←
      </span>
    </div>
  );
}
