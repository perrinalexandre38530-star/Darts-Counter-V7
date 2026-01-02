// ============================================
// src/components/MaskIcon.tsx
// Icônes recolorisables via CSS mask
// - MaskIcon : composant générique
// - DartIconColorizable : fléchette Cricket
// - CricketMarkIcon : marks 1 / 2 / 3 (I, X, cible)
// ============================================

import React from "react";
import dartPng from "../ui_assets/cricket-dart-white.png";
import mark1Png from "../ui_assets/cricket-mark-1.png";
import mark2Png from "../ui_assets/cricket-mark-2.png";
import mark3Png from "../ui_assets/cricket-mark-3.png";

export type MaskIconProps = {
  src: string;        // PNG blanc sur fond transparent (forme)
  color: string;      // couleur de remplissage
  size?: number;      // taille en px (width = height)
  rotateDeg?: number; // rotation en degrés
  glow?: boolean;     // halo on/off
  glowColor?: string; // couleur du halo (par défaut = color)
  opacity?: number;   // opacité globale
};

export function MaskIcon({
  src,
  color,
  size = 28,
  rotateDeg = 0,
  glow = false,
  glowColor,
  opacity = 1,
}: MaskIconProps) {
  const haloColor = glowColor ?? color;

  return (
    <div
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        backgroundColor: color,
        transform: `rotate(${rotateDeg}deg)`,
        filter: glow ? `drop-shadow(0 0 8px ${haloColor})` : "none",
        opacity,
        transition: "filter 0.15s ease, opacity 0.15s ease",
      }}
    />
  );
}

/* ---------- Fléchette Cricket ---------- */

export type DartIconColorizableProps = {
  color: string;    // couleur joueur
  active?: boolean; // fléchette déjà jouée ?
  size?: number;
};

export function DartIconColorizable({
  color,
  active = false,
  size = 30,
}: DartIconColorizableProps) {
  return (
    <MaskIcon
      src={dartPng}
      color={color}
      size={size}
      rotateDeg={180}         // pointe vers le bas
      glow={active}           // halo uniquement sur fléchettes jouées
      opacity={active ? 1 : 0.3}
    />
  );
}

/* ---------- Marks Cricket (1 / 2 / 3) ---------- */

export type CricketMarkIconProps = {
  marks: number;    // 1, 2 ou 3 (>=3 clampé à 3)
  color: string;    // couleur joueur ou doré
  size?: number;
  glow?: boolean;   // halo néon
};

export function CricketMarkIcon({
  marks,
  color,
  size = 18,
  glow = true,
}: CricketMarkIconProps) {
  if (marks <= 0) return null;

  const src = marks === 1 ? mark1Png : marks === 2 ? mark2Png : mark3Png;

  const filter = glow
    ? marks === 3
      // 🔥 mark-3 : halo couleur joueur + double contour sombre
      ? `drop-shadow(0 0 2px #000000dd)
         drop-shadow(0 0 4px #000000aa)
         drop-shadow(0 0 8px ${color})`
      // mark-1 / mark-2 : halo couleur joueur classique
      : `drop-shadow(0 0 3px ${color})
         drop-shadow(0 0 7px ${color})`
    : "drop-shadow(0 0 2px rgba(0,0,0,0.8))";

  return (
    <img
      src={src}
      alt={`mark-${marks}`}
      style={{
        width: size,
        height: size,
        display: "block",
        filter,
      }}
    />
  );
}
