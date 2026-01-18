// ============================================
// src/components/BackDot.tsx
// BackDot robuste (anti "button in button")
// ✅ Pas de <button> => évite DOM nesting warnings
// ✅ Click fiable mobile/desktop : onPointerDown + onClick
// ✅ stopPropagation + preventDefault
// ✅ NEW: look cohérent avec InfoDot (couleur thème + halo + flèche plus grasse)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onClick?: (e: any) => void;
  glow?: string;
  title?: string;
  size?: number; // px

  // ✅ NEW: option pour forcer la couleur (sinon theme.primary)
  color?: string;
};

export default function BackDot({
  onClick,
  glow,
  title = "Retour",
  size = 36,
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

  const c = color ?? theme.primary; // ✅ flèche et bordure = thème
  const halo = glow ?? c + "88";

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
        // ✅ harmonisation visuelle
        border: `1px solid ${c}66`,
        background: "rgba(0,0,0,0.22)",
        boxShadow: `0 0 0 2px rgba(0,0,0,0.15), 0 0 14px ${halo}`,
        color: c,
        flex: "0 0 auto",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 20, // un peu plus présent
          fontWeight: 1000, // ✅ plus gras
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
