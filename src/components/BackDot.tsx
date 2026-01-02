// ============================================
// src/components/BackDot.tsx
// BackDot robuste (anti "button in button")
// ✅ Pas de <button> => évite DOM nesting warnings
// ✅ Click fiable mobile/desktop : onPointerDown + onClick
// ✅ stopPropagation + preventDefault
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onClick?: (e: any) => void;
  glow?: string;
  title?: string;
  size?: number; // px
};

export default function BackDot({
  onClick,
  glow,
  title = "Retour",
  size = 36,
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

  const halo = glow ?? theme.primary + "88";

  return (
    <div
      role="button"
      aria-label={title}
      title={title}
      tabIndex={0}
      onPointerDown={handle} // 👈 ultra fiable sur mobile
      onClick={handle} // 👈 fallback desktop
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
        color: theme.text,
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 1000,
          lineHeight: 1,
          transform: "translateX(-1px)",
          textShadow: `0 0 10px ${halo}`,
        }}
      >
        ←
      </span>
    </div>
  );
}
