// ============================================
// src/components/InfoDot.tsx
// InfoDot robuste (anti "button in button") — rendu IDENTIQUE à BackDot
// ✅ Pas de <button> => évite DOM nesting warnings
// ✅ Click fiable mobile/desktop : onPointerDown + onClick
// ✅ stopPropagation + preventDefault
// ✅ Modal RulesModal optionnel (content)
// ✅ Icône "i" custom (SVG inline) coloriable via currentColor (Theme)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import RulesModal from "./RulesModal";

type Props = {
  onClick?: (e: any) => void;

  /** Halo/glow (optionnel). Par défaut: theme.primary + alpha. */
  glow?: string;

  /** Titre (tooltip + aria). */
  title?: string;

  /** Taille du bouton (px). */
  size?: number;

  /** Couleur icône (optionnel). Par défaut: theme.primary. */
  color?: string;

  /** Si fourni, ouvre un modal RulesModal au clic. */
  content?: React.ReactNode;
};

export default function InfoDot({
  onClick,
  glow,
  title = "Infos",
  size = 46,
  color,
  content,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const iconColor = color ?? theme.primary;
  const halo = glow ?? `${iconColor}88`;

  const handle = React.useCallback(
    (e: any) => {
      try {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } catch {}

      // Modal interne si "content"
      if (content != null) setOpen(true);

      onClick?.(e);
    },
    [onClick, content]
  );

  // 🔥 icône volontairement plus grosse que BackDot pour être lisible
  const iconSize = Math.max(24, Math.round(size * 0.62));

  return (
    <>
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
          color: iconColor, // ✅ la couleur THEME se propage au SVG via currentColor
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
          {/* IMPORTANT: fill="currentColor" (pas de noir hardcodé) */}
          <g
            transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)"
            fill="currentColor"
            stroke="none"
          >
            <path d="M4847 7964 c-260 -47 -480 -234 -568 -483 -73 -206 -58 -407 43 -606
60 -116 200 -254 318 -313 130 -65 228 -86 375 -80 202 9 353 75 496 217 87
87 146 182 185 296 39 114 45 286 15 405 -62 247 -225 435 -451 523 -140 55
-268 67 -413 41z m313 -350 c122 -58 203 -156 236 -284 36 -140 -3 -286 -106
-394 -205 -217 -558 -161 -691 110 -32 65 -34 74 -34 179 0 103 2 114 32 177
53 113 137 187 258 231 38 13 73 17 145 14 82 -2 104 -7 160 -33z"/>
            <path d="M4981 6205 c-230 -52 -411 -158 -623 -364 -126 -122 -237 -258 -318
-392 -148 -243 -231 -509 -187 -596 22 -42 71 -81 112 -89 72 -13 101 1 209
104 98 95 219 192 237 192 5 0 9 -461 9 -1117 0 -1245 -3 -1178 70 -1328 132
-272 428 -435 721 -395 105 14 241 59 339 111 348 187 688 598 820 989 57 171
50 270 -22 322 -32 23 -101 34 -143 24 -14 -4 -72 -50 -128 -102 -56 -53 -131
-118 -167 -145 l-65 -49 -5 1123 c-6 1112 -6 1123 -27 1192 -32 102 -50 142
-99 217 -89 134 -230 238 -389 288 -91 28 -254 36 -344 15z m272 -332 c49 -15
121 -65 163 -111 13 -15 39 -56 56 -92 l33 -65 5 -1272 c5 -1271 5 -1272 26
-1300 55 -74 123 -89 229 -53 32 11 60 20 62 20 10 0 -67 -90 -139 -161 -89
-90 -197 -173 -288 -222 -241 -131 -477 -91 -598 101 -65 102 -62 30 -62 1391
0 1228 0 1235 -21 1277 -40 84 -111 106 -222 71 -75 -24 -76 -24 -62 -4 38 55
164 183 238 242 217 175 406 233 580 178z"/>
          </g>
        </svg>
      </div>

      {content != null ? (
        <RulesModal open={open} onClose={() => setOpen(false)} title={title}>
          {typeof content === "string" ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
          ) : (
            content
          )}
        </RulesModal>
      ) : null}
    </>
  );
}
