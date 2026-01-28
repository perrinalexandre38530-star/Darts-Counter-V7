// ============================================
// src/components/PlusDot.tsx
// Petit bouton rond "+" façon InfoDot/BackDot
// ✅ Rend toujours un "+" visible (SVG fallback) même si l’asset PNG ne charge pas
// ✅ Même border/bg/halo que InfoDot
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onClick?: (e: any) => void;
  title?: string;
  size?: number;
  /** Optionnel: source image (PNG). Si non fourni ou si erreur, fallback SVG. */
  iconSrc?: any;
  color?: string;
  glow?: string;
};

function normalizeImgSrc(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  // Vite static import { default: "..." }
  if (typeof v === "object" && typeof v.default === "string") return v.default;
  return null;
}

export default function PlusDot({
  onClick,
  title = "Ajouter / retirer des stats",
  size = 46,
  iconSrc,
  color,
  glow,
}: Props) {
  const { theme } = useTheme();
  const c = color ?? theme.primary;
  const halo = glow ?? `${c}88`;

  const [imgOk, setImgOk] = React.useState(true);
  const src = normalizeImgSrc(iconSrc);

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
        overflow: "hidden",
      }}
    >
      {/* PNG optionnel */}
      {src && imgOk ? (
        <img
          src={src}
          alt="+"
          draggable={false}
          onError={() => setImgOk(false)}
          style={{
            width: Math.round(size * 0.46),
            height: Math.round(size * 0.46),
            objectFit: "contain",
            // rend l’icône visible même si PNG noir: on force un rendu "neon"
            filter: `drop-shadow(0 0 10px ${halo}) drop-shadow(0 0 18px ${halo})`,
          }}
        />
      ) : (
        // Fallback: SVG "+" (toujours visible)
        <svg
          width={Math.round(size * 0.46)}
          height={Math.round(size * 0.46)}
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            filter: `drop-shadow(0 0 10px ${halo}) drop-shadow(0 0 18px ${halo})`,
          }}
        >
          <path
            d="M11 5h2v14h-2zM5 11h14v2H5z"
            fill={c}
          />
        </svg>
      )}
    </div>
  );
}
