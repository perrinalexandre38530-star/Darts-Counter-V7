// ===============================================
// src/components/graphics/DartboardOverlay.tsx
// Overlay SVG d'un board officiel
// - Ordre des numéros correct : 20-1-18-4-13-6-10-15-2-17-3-19-7-16-8-11-14-9-12-5
// - Style minimaliste (traits + chiffres)
// - Utilisable par dessus n'importe quel background
// ===============================================

import React from "react";
import clsx from "clsx";

type Props = {
  /** Taille en pixels lorsqu'on ne passe pas de className Tailwind */
  size?: number;
  /** Couleur des traits du board */
  stroke?: string;
  /** Couleur des numéros */
  numberColor?: string;
  /** Largeur de trait principale */
  strokeWidth?: number;
  /** Classe CSS additionnelle (positionnement, opacity, etc.) */
  className?: string;
};

const SEGMENT_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

export default function DartboardOverlay({
  size = 512,
  stroke = "#FFA500", // orange par défaut
  numberColor = "#FFFFFF",
  strokeWidth = 1.5,
  className,
}: Props) {
  // Rayon de base (dans un viewBox 0–100)
  const outerRadius = 45;
  const doubleInner = 38;
  const doubleOuter = 41;
  const tripleInner = 25;
  const tripleOuter = 28;
  const singleBullRadius = 3;
  const doubleBullRadius = 1.5;

  const center = 50;

  const segments = React.useMemo(
    () => Array.from({ length: 20 }, (_, i) => i),
    []
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={clsx("pointer-events-none select-none", className)}
    >
      <defs>
        {/* Glow léger sur les traits */}
        <filter id="dc-dartboard-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.8 0"
          />
        </filter>
        {/* Glow sur les numéros */}
        <filter id="dc-dartboard-text-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Anneaux principaux */}
      <g
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        filter="url(#dc-dartboard-glow)"
      >
        {/* Contour board */}
        <circle cx={center} cy={center} r={outerRadius} />
        {/* Anneaux triple et double */}
        <circle cx={center} cy={center} r={doubleOuter} />
        <circle cx={center} cy={center} r={doubleInner} />
        <circle cx={center} cy={center} r={tripleOuter} />
        <circle cx={center} cy={center} r={tripleInner} />
        {/* Outer single / inner single (guides visuels) */}
        <circle cx={center} cy={center} r={singleBullRadius * 4.5} />
        <circle cx={center} cy={center} r={singleBullRadius * 2.5} />
        {/* Bulls */}
        <circle cx={center} cy={center} r={singleBullRadius} />
        <circle cx={center} cy={center} r={doubleBullRadius} />
      </g>

      {/* Lignes de séparation des 20 segments */}
      <g stroke={stroke} strokeWidth={strokeWidth} filter="url(#dc-dartboard-glow)">
        {segments.map((i) => {
          const angleDeg = -90 + i * 18; // 20 segments → 360 / 20 = 18°
          const angleRad = (angleDeg * Math.PI) / 180;
          const x2 = center + outerRadius * Math.cos(angleRad);
          const y2 = center + outerRadius * Math.sin(angleRad);
          return (
            <line
              key={`seg-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
            />
          );
        })}
      </g>

      {/* Numéros – ordre officiel */}
      <g
        fill={numberColor}
        fontSize={4}
        fontFamily='"Orbitron", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        textAnchor="middle"
        dominantBaseline="middle"
        filter="url(#dc-dartboard-text-glow)"
      >
        {segments.map((i) => {
          const n = SEGMENT_NUMBERS[i];
          const angleDeg = -90 + i * 18;
          const angleRad = (angleDeg * Math.PI) / 180;
          const r = outerRadius + 4.5; // rayon où poser les numéros
          const x = center + r * Math.cos(angleRad);
          const y = center + r * Math.sin(angleRad);
          return (
            <text key={`n-${i}`} x={x} y={y}>
              {n}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
