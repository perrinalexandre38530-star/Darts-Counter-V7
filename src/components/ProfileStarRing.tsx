// ============================================
// src/components/ProfileStarRing.tsx
// ProfileStarring darts — couronne historique autour du médaillon.
// Règle : AVG3D X01 -> étoiles (10 pts = 1★, paliers de 5 = ½★,
// puis +1★ à 120/140/160/180).
// ============================================

import React from "react";
import { computeProfileStarRating } from "../lib/profileStarRating";

function profileStarRingParseBotLevelValue(input: any, fallback = 1): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.max(1, Math.min(5, Math.round(input * 2) / 2));
  }
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return fallback;
  const fraction = value.match(/(\d+(?:[.,]\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(String(fraction[1]).replace(",", "."));
    if (Number.isFinite(n)) return Math.max(1, Math.min(5, Math.round(n * 2) / 2));
  }
  const decimal = value.match(/(?:niveau|level|lvl|botlevel|stars?|étoiles?)?\s*(\d+(?:[.,]\d+)?)/);
  if (decimal) {
    const n = Number(String(decimal[1]).replace(",", "."));
    if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.max(1, Math.min(5, Math.round(n * 2) / 2));
  }
  if (value.includes("legend") || value.includes("légende") || value.includes("legende")) return 5;
  if (value.includes("prodige")) return 4.5;
  if (value.includes("pro")) return 4;
  if (value.includes("fort") || value.includes("strong") || value.includes("hard") || value.includes("difficile")) return 3;
  if (value.includes("standard") || value.includes("regular") || value.includes("medium") || value.includes("normal") || value.includes("moyen")) return 2;
  if (value.includes("easy") || value.includes("facile") || value.includes("beginner") || value.includes("débutant") || value.includes("debutant") || value.includes("rookie")) return 1;
  return fallback;
}

function profileStarRingBotLevelToAvg3d(input: any, fallback = 1): number {
  return profileStarRingParseBotLevelValue(input, fallback) * 20;
}

type Props = {
  anchorSize?: number;
  size?: number;
  avg3d?: number;
  score?: number;
  profile?: any;
  botLevel?: any;
  starSize?: number;
  gapPx?: number;
  stepDeg?: number;
  rotationDeg?: number;
  animateGlow?: boolean;
  glow?: boolean;
  color?: string;
  theme?: any;
  active?: boolean;
};

type StarEntry = { color: string; half?: boolean };

const STAR_COLORS = [
  "#FFE873",
  "#FFD95C",
  "#FFC945",
  "#FFB733",
  "#FFA22E",
  "#FF8A2F",
  "#FF6A3B",
  "#FF504A",
  "#FF3860",
  "#D07CFF",
];

const STAR_PATH = "M50 5 L61 36 L94 38 L68 57 L77 88 L50 71 L23 88 L32 57 L6 38 L39 36 Z";

export default function ProfileStarRing({
  anchorSize,
  size,
  avg3d,
  score: scoreProp,
  profile,
  botLevel,
  starSize = 14,
  gapPx = 2,
  stepDeg = 10,
  rotationDeg = 0,
  animateGlow = false,
  glow,
}: Props) {
  const resolvedAnchorSize = Math.max(1, Number(anchorSize ?? size ?? 64) || 64);
  const profileBotLevel = profile?.botLevel ?? profile?.level ?? botLevel;

  // L'AVG3D explicite est toujours prioritaire. C'est la valeur affichée par
  // les écrans Home / Profils / Statistics Center et donc la seule qui doit
  // décider du niveau visuel d'un joueur humain.
  const explicitAvg = Number(avg3d);
  const explicitScore = Number(scoreProp);
  const rawScore = Number.isFinite(explicitAvg) && explicitAvg > 0
    ? explicitAvg
    : Number.isFinite(explicitScore) && explicitScore > 0
      ? explicitScore
      : profileBotLevel != null
        ? profileStarRingBotLevelToAvg3d(profileBotLevel, 1)
        : 0;

  const rating = computeProfileStarRating(rawScore);
  const entries: StarEntry[] = [];

  for (let i = 1; i <= rating.baseFullStars; i += 1) {
    entries.push({ color: STAR_COLORS[i - 1] || STAR_COLORS[STAR_COLORS.length - 1] });
  }
  if (rating.hasHalfStar) {
    const pos = rating.baseFullStars + 1;
    entries.push({ color: STAR_COLORS[pos - 1] || STAR_COLORS[STAR_COLORS.length - 1], half: true });
  }
  for (let i = 0; i < rating.extraStars; i += 1) {
    entries.push({ color: STAR_COLORS[9] });
  }

  const count = entries.length;
  if (count === 0) return null;

  // IMPORTANT : la couronne possède maintenant son propre repère SVG fixe.
  // Elle ne dépend plus de la largeur/hauteur des wrappers des pages, ce qui
  // supprimait le décentrage et les étoiles masquées sur certains layouts.
  const requestedStep = Math.max(1, Number(stepDeg) || 10);
  const minCenterDistance = Math.max(4, starSize * 0.62);
  const baseRadius = resolvedAnchorSize / 2 + Number(gapPx || 0) + starSize * 0.46;

  const minStepForRadius = (radius: number) => {
    const ratio = Math.min(0.999, minCenterDistance / Math.max(2, 2 * radius));
    return (2 * Math.asin(ratio) * 180) / Math.PI;
  };

  let radius = baseRadius;
  let effectiveStep = Math.max(requestedStep, minStepForRadius(radius));
  const maxArc = count <= 10 ? 126 : 132;
  if (count > 1 && (count - 1) * effectiveStep > maxArc) {
    effectiveStep = maxArc / (count - 1);
    const halfStep = (effectiveStep * Math.PI) / 360;
    const requiredRadius = minCenterDistance / Math.max(0.001, 2 * Math.sin(halfStep));
    radius = Math.max(radius, requiredRadius);
  }

  const halfSpread = ((count - 1) * effectiveStep) / 2;
  const pad = Math.max(starSize * 1.8, 12);
  const boxSize = Math.ceil(Math.max(resolvedAnchorSize + pad * 2, radius * 2 + starSize * 1.7));
  const center = boxSize / 2;
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const animate = animateGlow || !!glow;

  return (
    <div
      data-profile-star-score={rating.score}
      data-profile-star-full={rating.baseFullStars + rating.extraStars}
      data-profile-star-half={rating.hasHalfStar ? "1" : "0"}
      data-profile-star-glyphs={count}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: boxSize,
        height: boxSize,
        transform: "translate(-50%, -50%)",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      <svg
        width={boxSize}
        height={boxSize}
        viewBox={`0 0 ${boxSize} ${boxSize}`}
        aria-hidden="true"
        style={{ display: "block", width: boxSize, height: boxSize, maxWidth: "none", overflow: "visible" }}
      >
        {entries.map((entry, index) => {
          const angleDeg = -halfSpread + index * effectiveStep + rotationDeg;
          const angle = (angleDeg * Math.PI) / 180;
          const cx = center + Math.sin(angle) * radius;
          const cy = center - Math.cos(angle) * radius;
          const x = cx - starSize / 2;
          const y = cy - starSize / 2;
          const clipId = `psr-half-${uid}-${index}`;
          return (
            <svg
              key={`${index}-${entry.half ? "h" : "f"}`}
              x={x}
              y={y}
              width={starSize}
              height={starSize}
              viewBox="0 0 100 100"
              overflow="visible"
              style={{
                filter: `drop-shadow(0 0 ${Math.max(1.5, starSize * 0.16)}px ${entry.color})`,
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: animate ? "psr-star-pulse 2.6s ease-in-out infinite" : undefined,
              }}
            >
              {entry.half ? (
                <>
                  <defs>
                    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                      <rect x="0" y="0" width="50" height="100" />
                    </clipPath>
                  </defs>
                  <path d={STAR_PATH} fill={entry.color} clipPath={`url(#${clipId})`} />
                </>
              ) : (
                <path d={STAR_PATH} fill={entry.color} />
              )}
            </svg>
          );
        })}
      </svg>
      {animate ? (
        <style>{`@keyframes psr-star-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.94}}`}</style>
      ) : null}
    </div>
  );
}
