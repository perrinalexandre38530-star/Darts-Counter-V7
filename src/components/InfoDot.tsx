// ============================================
// src/components/InfoDot.tsx
// FIX validateDOMNesting: <span role="button">
// + click/keyboard safe
// ============================================

import React from "react";

export default function InfoDot({
  onClick,
  size = 30,
  color = "#FFFFFF",
  glow = "rgba(255,255,255,0.35)",
}: {
  onClick?: (e: React.MouseEvent) => void;
  size?: number;
  color?: string;
  glow?: string;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    // Déclenche la même logique qu'un click (sans fake MouseEvent)
    // Ici on appelle juste onClick sans event souris (la plupart des handlers s'en foutent)
    // Si tu veux absolument un MouseEvent: fais un wrapper côté appelant.
    (onClick as any)?.(e);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Info"
      title="Info"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontWeight: 800,
        fontSize: Math.max(12, size * 0.5),
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        boxShadow: `0 0 6px ${glow}, 0 0 12px ${glow}`,
        animation: "infodotPulse 1.9s infinite ease-in-out",
      }}
    >
      i

      {/* injecté mais ultra léger ; si tu veux 0 injection, je te fais version sans <style> */}
      <style>
        {`
          @keyframes infodotPulse {
            0%   { transform: scale(1);   filter: brightness(1); }
            50%  { transform: scale(1.05); filter: brightness(1.15); }
            100% { transform: scale(1);   filter: brightness(1); }
          }
        `}
      </style>
    </span>
  );
}
