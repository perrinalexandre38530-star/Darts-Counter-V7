// ============================================
// src/components/SparklinePro.tsx
// Mini sparkline "PRO" simple en SVG
// - Affiche une courbe lissée des points {x,y}
// - Utilisé dans StatsHub (onglet Training)
// ============================================
import React from "react";

type SparkPoint = { x: number; y: number };

type Props = {
  points: SparkPoint[];
  height?: number;
};

const SparklinePro: React.FC<Props> = ({ points, height = 60 }) => {
  if (!points.length) {
    return null;
  }

  const width = 260; // largeur de base (sera étirée en CSS)
  const xs = points.map((p, idx) =>
    // on utilise l'index pour répartir les points horizontalement
    points.length === 1 ? 0 : (idx / (points.length - 1)) * width
  );
  const ys = points.map((p) => p.y);

  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;

  // Y SVG inversé (0 en haut)
  const mapY = (y: number) =>
    height - ((y - minY) / spanY) * (height - 8) - 4;

  const pathD = points
    .map((p, i) => {
      const x = xs[i];
      const y = mapY(p.y);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  // Remplissage sous la courbe
  const areaD =
    pathD +
    ` L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height }}
    >
      {/* fond */}
      <defs>
        <linearGradient
          id="sparklineFill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="rgba(246,194,86,0.35)"
          />
          <stop
            offset="100%"
            stopColor="rgba(0,0,0,0)"
          />
        </linearGradient>
      </defs>

      {/* axe de base */}
      <line
        x1={0}
        y1={height - 2}
        x2={width}
        y2={height - 2}
        stroke="rgba(255,255,255,.18)"
        strokeWidth={1}
      />

      {/* zone sous la courbe */}
      <path
        d={areaD}
        fill="url(#sparklineFill)"
      />

      {/* courbe */}
      <path
        d={pathD}
        fill="none"
        stroke="#F6C256"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* petit point sur le dernier sample */}
      {points.length > 0 && (
        <circle
          cx={xs[xs.length - 1]}
          cy={mapY(points[points.length - 1].y)}
          r={3}
          fill="#F6C256"
          stroke="#000"
          strokeWidth={1}
        />
      )}
    </svg>
  );
};

export default SparklinePro;
