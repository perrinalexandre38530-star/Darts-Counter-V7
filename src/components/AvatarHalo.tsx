// ============================================
// src/components/AvatarHalo.tsx
// Halo néon autour de l'avatar
// - aucun cercle noir derrière
// - halo très léger juste autour de l'image
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  size?: number;
  active?: boolean;
  children: React.ReactNode;
};

export default function AvatarHalo({ size = 80, active = true, children }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary ?? "#F6C256";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            inset: -6, // léger dépassement autour de l'avatar
            borderRadius: "50%",
            background: `radial-gradient(circle, ${primary}55 0, transparent 65%)`,
            boxShadow: `0 0 16px ${primary}99`,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
