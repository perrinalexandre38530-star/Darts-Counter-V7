// ============================================
// src/components/PlusDot.tsx
// Bouton rond "+" — icône SVG fournie (pas de texte)
// ✅ Thème appliqué sur les traits noirs (fill currentColor)
// ✅ Même rendu que BackDot/InfoDot (halo + drop-shadow)
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
  size = 42,
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

  const iconSize = Math.max(22, Math.round(size * 0.62));

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
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{
          display: "block",
          filter: `drop-shadow(0 0 10px ${halo}) drop-shadow(0 0 18px ${halo})`,
        }}
      >
        <g
          transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)"
          fill="currentColor"
          stroke="none"
        >
          <path d="M4118 8924 c-62 -33 -58 54 -58 -1414 l0 -1340 -1340 0 c-1179 0
-1345 -2 -1370 -15 -63 -33 -60 22 -60 -1050 0 -1072 -3 -1017 60 -1050 25
-13 191 -15 1370 -15 l1340 0 0 -1340 c0 -1179 2 -1345 15 -1370 33 -63 -22
-60 1050 -60 1072 0 1017 -3 1050 60 13 25 15 191 15 1370 l0 1340 1340 0
c1179 0 1345 2 1370 15 63 33 60 -22 60 1050 0 1072 3 1017 -60 1050 -25 13
-191 15 -1370 15 l-1340 0 0 1340 c0 1473 4 1382 -60 1415 -44 22 -1971 22
-2012 -1z m1832 -1564 c0 -1473 -4 -1382 60 -1415 25 -13 191 -15 1370 -15
l1340 0 0 -825 0 -825 -1340 0 c-1473 0 -1382 4 -1415 -60 -13 -25 -15 -191
-15 -1370 l0 -1340 -825 0 -825 0 0 1340 c0 1179 -2 1345 -15 1370 -33 64 58
60 -1415 60 l-1340 0 0 825 0 825 1355 2 1355 3 27 28 28 27 3 1355 2 1355
825 0 825 0 0 -1340z"/>
        </g>
      </svg>
    </div>
  );
}
