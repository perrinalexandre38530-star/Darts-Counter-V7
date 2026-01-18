// ============================================
// src/components/InfoDot.tsx
// Petit bouton rond "i" pour afficher une infobulle / modal.
// ✅ NEW: style harmonisé BackDot (même border/bg/halo)
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

export default function InfoDot({
  onClick,
  color,
  glow,
  title = "Infos",
  size = 36,
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
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.22)",
        boxShadow: `0 0 0 2px rgba(0,0,0,0.15), 0 0 14px ${halo}`,
        color: c,
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 1000,
          lineHeight: 1,
          transform: "translateY(-0.5px)",
          textShadow: `0 0 10px ${halo}`,
        }}
      >
        i
      </span>
    </div>
  );
}
