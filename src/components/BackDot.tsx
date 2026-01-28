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
      <svg
        width={Math.max(18, Math.round(size * 0.48))}
        height={Math.max(18, Math.round(size * 0.48))}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{
          display: "block",
          filter: `drop-shadow(0 0 10px ${halo}) drop-shadow(0 0 18px ${halo})`,
        }}
      >
        <g
          transform="translate(0,512) scale(0.1,-0.1)"
          fill="currentColor"
          stroke="none"
        >
          <path d="M1839 3783 c-14 -10 -281 -256 -592 -547 -417 -390 -572 -540 -587
-571 -27 -56 -27 -154 0 -210 15 -31 170 -182 586 -571 311 -291 580 -537 598
-547 49 -29 137 -19 177 19 55 52 59 71 59 324 0 154 3 230 11 230 5 0 482
-47 1059 -105 577 -58 1071 -105 1098 -105 95 0 184 66 217 161 22 62 22 1336
0 1398 -33 95 -122 161 -217 161 -27 0 -521 -47 -1098 -105 -577 -58 -1054
-105 -1059 -105 -8 0 -11 76 -11 230 0 253 -3 272 -59 325 -26 25 -41 30 -94
33 -48 2 -68 -1 -88 -15z m107 -659 c31 -42 67 -65 110 -70 21 -3 513 42 1092
100 579 58 1068 106 1088 106 24 0 43 -8 59 -25 l25 -24 0 -651 0 -651 -25
-24 c-16 -17 -35 -25 -59 -25 -20 0 -509 48 -1088 106 -579 58 -1071 103
-1092 100 -43 -5 -79 -28 -110 -70 -20 -25 -21 -45 -26 -272 l-5 -245 -557
521 c-556 518 -558 520 -558 560 0 40 2 42 558 560 l557 521 5 -245 c5 -227 6
-247 26 -272z"/>
        </g>
      </svg>
    </div>
  );
}
