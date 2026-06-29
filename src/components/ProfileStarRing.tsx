// ============================================
// src/components/ProfileStarRing.tsx
// Couronne d’étoiles — dégradé jaune→rouge + violet final
// - 1★ / 10 pts (1..9 = dégradé jaune→rouge, 10 = violet clair)
// - ½★ aux seuils : 15/25/35/45/55/65/75/85/95
// - >100 : +1★ violette chaque +20 (120/140/160/180)
// - Centré à 12h, gapPx pour coller au médaillon
// ============================================

import React from "react";


function profileStarRingParseBotLevelValue(input: any, fallback = 1): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.max(1, Math.min(5, Math.round(input * 2) / 2));
  }

  const raw = String(input ?? "").trim();
  const value = raw.toLowerCase();
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
  return Math.round(profileStarRingParseBotLevelValue(input, fallback) * 20);
}

type Props = {
  anchorSize?: number;    // diamètre du médaillon
  size?: number;          // alias historique de anchorSize
  avg3d?: number;         // moyenne 0..180
  score?: number;         // alias historique
  profile?: any;          // compat : certains écrans passent directement le profil/BOT
  botLevel?: any;         // compat directe
  starSize?: number;      // taille d’une étoile (px)
  gapPx?: number;         // distance depuis le bord du médaillon (px)
  stepDeg?: number;       // écart angulaire entre étoiles (°)
  rotationDeg?: number;   // rotation globale (°)
  animateGlow?: boolean;  // légère pulsation
  glow?: boolean;         // alias historique
  color?: string;         // ignoré volontairement : couleurs internes du ring
  theme?: any;            // compat anciens appels
  active?: boolean;       // compat anciens appels
};

type StarEntry = { color: string; half?: boolean };

/* --- Dégradé continu jaune → orange → rouge (1..9) + violet clair (10) --- */
const STAR_COLORS = [
  "#FFE873", // 1 jaune clair
  "#FFD95C", // 2 jaune
  "#FFC945", // 3 doré
  "#FFB733", // 4 or/ambre
  "#FFA22E", // 5 orange clair
  "#FF8A2F", // 6 orange soutenu
  "#FF6A3B", // 7 rouge-orangé
  "#FF504A", // 8 rouge
  "#FF3860", // 9 rouge vif
  "#D07CFF", // 10 violet clair
];

/* --- Étoile SVG --- */
function Star({
  size,
  color,
  half,
  animate,
}: {
  size: number;
  color: string;
  half?: boolean;
  animate?: boolean;
}) {
  const cls = animate ? "psr-pulse" : undefined;
  const path =
    "M50 5 L61 36 L94 38 L68 57 L77 88 L50 71 L23 88 L32 57 L6 38 L39 36 Z";

  // Chaque étoile doit avoir ses propres IDs SVG.
  // Les IDs fixes (#psrGlow / #halfClip) entraient en collision quand plusieurs
  // ProfileStarRing étaient affichés sur la même page, ce qui pouvait rendre les
  // demi-étoiles/filters instables selon l'ordre de rendu du DOM.
  const safeId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `psrGlow-${safeId}`;
  const halfClipId = `halfClip-${safeId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cls}
      style={{ filter: `url(#${glowId})` }}
    >
      <defs>
        <filter id={glowId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={halfClipId}>
          <rect x="0" y="0" width="50" height="100" />
        </clipPath>
      </defs>
      {half ? (
        <>
          <path d={path} fill="rgba(255,255,255,0.15)" />
          <g clipPath={`url(#${halfClipId})`}>
            <path d={path} fill={color} />
          </g>
        </>
      ) : (
        <path d={path} fill={color} />
      )}
    </svg>
  );
}

/* --- Composant principal --- */
export default function ProfileStarRing({
  anchorSize,
  size,
  avg3d,
  score: scoreProp,
  profile,
  botLevel,
  starSize = 14,
  gapPx = -3,     // collé par défaut
  stepDeg = 10,   // resserré
  rotationDeg = 0,
  animateGlow = false,
  glow,
}: Props) {
  const resolvedAnchorSize = Number(anchorSize ?? size ?? 64) || 64;
  const profileBotLevel = profile?.botLevel ?? profile?.level ?? botLevel;
  const rawScore = Number.isFinite(Number(avg3d)) && Number(avg3d) > 0
    ? Number(avg3d)
    : Number.isFinite(Number(scoreProp)) && Number(scoreProp) > 0
      ? Number(scoreProp)
      : profileBotLevel != null
        ? profileStarRingBotLevelToAvg3d(profileBotLevel, 1)
        : 0;
  const score = Math.max(0, Math.min(180, Math.round(rawScore)));

  // 1★ / 10 pts
  const fullUnder100 = Math.min(10, Math.floor(Math.min(score, 100) / 10));
  const hasHalf = score < 100 && score >= 5 && score % 10 >= 5;

  // +1★ violette toutes les 20 au-dessus de 100
  const extraViolets = score > 100 ? Math.floor((Math.min(score, 180) - 100) / 20) : 0;

  const entries: StarEntry[] = [];

  // Pleines 1..fullUnder100
  for (let i = 1; i <= fullUnder100; i++) {
    entries.push({ color: STAR_COLORS[i - 1] || STAR_COLORS[STAR_COLORS.length - 1] });
  }

  // Demi (couleur du palier suivant)
  if (hasHalf) {
    const pos = fullUnder100 + 1;
    entries.push({ color: STAR_COLORS[pos - 1] || STAR_COLORS[STAR_COLORS.length - 1], half: true });
  }

  // Si score >100 : compléter les 10 premières pleines avant les extras
  if (score > 100 && fullUnder100 < 10) {
    for (let i = fullUnder100 + 1; i <= 10; i++) {
      entries.push({ color: STAR_COLORS[i - 1] });
    }
  }

  // Étoiles violettes supplémentaires
  for (let i = 0; i < extraViolets; i++) {
    entries.push({ color: STAR_COLORS[9] });
  }

  const count = entries.length;
  if (count === 0) return null;

  // Rayon centre→étoile
  const r = resolvedAnchorSize / 2 + gapPx + starSize / 2;
  const halfSpread = (count - 1) * (stepDeg / 2);

  function pol2cart(angleDeg: number) {
    const a = ((angleDeg + rotationDeg) * Math.PI) / 180;
    return { x: Math.sin(a) * r, y: -Math.cos(a) * r };
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {entries.map((e, i) => {
          const ang = -halfSpread + i * stepDeg; // centré à 12h
          const { x, y } = pol2cart(ang);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - starSize / 2,
                top: y - starSize / 2,
              }}
            >
              <Star
                size={starSize}
                color={e.color}
                half={e.half}
                animate={animateGlow || !!glow}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes psr-pulse-kf {
          0%   { transform: scale(1); opacity: 1; }
          50%  { transform: scale(1.08); opacity: .92; }
          100% { transform: scale(1); opacity: 1; }
        }
        .psr-pulse {
          animation: psr-pulse-kf 2.6s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
      `}</style>
    </div>
  );
}
