// ============================================
// src/components/TrainingRadar.tsx
// Radar Training X01 — version premium
// - 20 segments + 25 (Bull) entre 5 et 20
// - Polygone jaune qui s'arrête juste avant les chiffres
// - Halo animé "pulse" + breathing léger du polygone
// - Chiffres dorés avec effet néon
// ============================================
import React from "react";
import type { Dart as UIDart } from "../lib/types";

// Même ordre que dans StatsHub / Training (avec 25 entre 5 et 20 en cercle)
const SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

type Props = {
  darts: UIDart[];
};

const T = {
  bg: "#101116",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  gold: "#F6C256",
};

export default function TrainingRadar({ darts }: Props) {
  // -----------------------------
  // 1) Agrégation des hits par segment
  // -----------------------------
  const hits: Record<number, number> = {};

  for (const d of darts || []) {
    const v = Number((d as any)?.v) || 0;
    const mult = Number((d as any)?.mult) || 0;
    if (!v || !mult) continue;

    const key = v === 25 ? 25 : v;
    if (!hits[key]) hits[key] = 0;
    hits[key] += 1;
  }

  let maxHit = 0;
  for (const seg of SEGMENTS) {
    const v = hits[seg] || 0;
    if (v > maxHit) maxHit = v;
  }
  if (maxHit <= 0) maxHit = 1;

  // -----------------------------
  // 2) Géométrie du radar — VERSION PLUS GRANDE
  // -----------------------------
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  const outerRadius = 132;  // cercle externe principal
  const labelRadius = 140;  // chiffres juste à l’extérieur

  const gridRadius1 = 60;
  const gridRadius2 = 96;

  const polygonMinRadius = 26;
  const polygonMaxRadius = 126; // pointe très proche des chiffres

  const haloRadius = outerRadius + 6;
  const n = SEGMENTS.length;

  // -----------------------------
  // 3) Helpers coordonnées polaires
  // -----------------------------
  function angleForIndex(i: number): number {
    const step = (Math.PI * 2) / n;
    return -Math.PI / 2 + i * step;
  }

  function pointAt(radius: number, angle: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  // -----------------------------
  // 4) Construction du polygone
  // -----------------------------
  const polygonPoints: { x: number; y: number }[] = [];

  SEGMENTS.forEach((seg, idx) => {
    const a = angleForIndex(idx);
    const v = hits[seg] || 0;
    const ratio = v / maxHit;
    const r =
      polygonMinRadius + (polygonMaxRadius - polygonMinRadius) * ratio;
    polygonPoints.push(pointAt(r, a));
  });

  const polygonPath =
    polygonPoints.length > 0
      ? polygonPoints
          .map((p, i) =>
            i === 0
              ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
              : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
          )
          .join(" ") + " Z"
      : "";

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: "100%" }}
      >
        {/* Styles locaux pour les animations */}
        <style>{`
          @keyframes radarPulse {
            0% {
              r: ${haloRadius};
              opacity: 0.35;
            }
            50% {
              r: ${haloRadius + 14};
              opacity: 0;
            }
            100% {
              r: ${haloRadius};
              opacity: 0.35;
            }
          }

          @keyframes radarBreathe {
            0% {
              transform: scale(0.97);
            }
            50% {
              transform: scale(1.03);
            }
            100% {
              transform: scale(0.97);
            }
          }

          @keyframes radarEnter {
            0% {
              opacity: 0;
              transform: scale(0.85);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>

        <defs>
          {/* Gradient fond du radar */}
          <radialGradient id="radar-bg" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#20222A" />
            <stop offset="40%" stopColor="#14151B" />
            <stop offset="100%" stopColor="#05060A" />
          </radialGradient>

          {/* Gradient du polygone */}
          <linearGradient id="radar-poly" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFEFAF" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#F6C256" stopOpacity={0.6} />
          </linearGradient>

          {/* Halo doré autour du radar */}
          <radialGradient id="radar-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6C256" stopOpacity={0.4} />
            <stop offset="60%" stopColor="#F6C256" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#F6C256" stopOpacity={0} />
          </radialGradient>

          {/* Légère lueur sur le polygone */}
          <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow central */}
          <radialGradient id="radar-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6C256" stopOpacity={0.8} />
            <stop offset="40%" stopColor="#F6C256" stopOpacity={0.0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </radialGradient>

          {/* Glow néon pour les chiffres */}
          <filter id="radar-text-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0.85 0.7 0 0 0
                0 0 0 0 0
                0 0 0 1 0
              "
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Groupe global avec anim d'entrée douce */}
        <g
          style={{
            transformOrigin: "50% 50%",
            animation: "radarEnter 0.6s ease-out",
          }}
        >
          {/* HALO ANIMÉ */}
          <circle
            cx={cx}
            cy={cy}
            r={haloRadius}
            fill="url(#radar-halo)"
            style={{
              transformOrigin: "50% 50%",
              animation: "radarPulse 3.2s ease-out infinite",
            }}
          />

          {/* Fond du radar */}
          <circle cx={cx} cy={cy} r={outerRadius} fill="url(#radar-bg)" />

          {/* Cercles de grille */}
          <circle
            cx={cx}
            cy={cy}
            r={gridRadius1}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
          <circle
            cx={cx}
            cy={cy}
            r={gridRadius2}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />

          {/* Rayons */}
          {SEGMENTS.map((_, idx) => {
            const a = angleForIndex(idx);
            const p = pointAt(outerRadius, a);
            return (
              <line
                key={`ray-${idx}`}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}

          {/* Polygone des hits avec breathing */}
          {polygonPath && (
            <g
              filter="url(#radar-glow)"
              style={{
                transformOrigin: "50% 50%",
                animation: "radarBreathe 4.2s ease-in-out infinite",
              }}
            >
              <path
                d={polygonPath}
                fill="url(#radar-poly)"
                stroke={T.gold}
                strokeWidth={2}
                fillOpacity={0.8}
              />
            </g>
          )}

          {/* Glow central + disque */}
          <circle
            cx={cx}
            cy={cy}
            r={polygonMinRadius + 12}
            fill="url(#radar-center-glow)"
          />
          <circle
            cx={cx}
            cy={cy}
            r={polygonMinRadius - 4}
            fill="rgba(0,0,0,0.75)"
            stroke={T.gold}
            strokeWidth={1}
            opacity={0.95}
          />
          <circle cx={cx} cy={cy} r={2.8} fill={T.gold} opacity={0.95} />

          {/* Petit réticule */}
          <line
            x1={cx - 8}
            y1={cy}
            x2={cx + 8}
            y2={cy}
            stroke="rgba(246,194,86,0.45)"
            strokeWidth={0.8}
          />
          <line
            x1={cx}
            y1={cy - 8}
            x2={cx}
            y2={cy + 8}
            stroke="rgba(246,194,86,0.45)"
            strokeWidth={0.8}
          />

          {/* Labels 1–20 + 25 (Bull) en doré néon, version large */}
{SEGMENTS.map((seg, idx) => {
  const a = angleForIndex(idx);
  const p = pointAt(labelRadius + 4, a); // léger décalage pour gros texte
  return (
    <text
      key={`label-${seg}-${idx}`}
      x={p.x}
      y={p.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={14} // <— plus grand
      fontWeight={600}
      fill={T.gold}
      style={{ paintOrder: "stroke", strokeWidth: 0.6, stroke: "rgba(0,0,0,0.35)" }}
      filter="url(#radar-text-glow)"
    >
      {seg === 25 ? "25" : seg}
    </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
