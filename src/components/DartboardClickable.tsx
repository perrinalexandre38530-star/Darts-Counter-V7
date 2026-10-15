// ============================================
// src/components/DartboardClickable.tsx
// Cible interactive (touch/click) => déduit segment + multiplicateur
// - Basé sur une image (photo) en fond
// - Détection via coordonnées polaires (angle + rayon)
// - Mapping standard des numéros (20 en haut, sens horaire)
// - Anneaux calibrés "UX" (double/triple/bull) + INSET ajustable
// ============================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import dartboardPhoto from "../ui_assets/dartboard_photo.png";

export type DartboardHitDetail = {
  segment: number;
  mult: 1 | 2 | 3;
  ring: "miss" | "dbull" | "bull" | "inner_single" | "triple" | "outer_single" | "double";
};

export type DartboardGuideRing = "number" | "single" | "inner_single" | "outer_single" | "double" | "triple" | "bull" | "dbull" | "bull_any";
export type DartboardGuideTarget = {
  segment?: number;
  ring: DartboardGuideRing;
  label?: string;
  color?: string;
};

type Props = {
  /** Callback segment (0..20, 25) + mult (1..3) */
  onHit: (segment: number, mult: 1 | 2 | 3) => void;
  /** Détail optionnel de la zone physique, utile aux modes comme PRISONER. */
  onDetailedHit?: (hit: DartboardHitDetail) => void;
  /** Multiplicateur courant venant du parent (boutons S/D/T) */
  multiplier: 1 | 2 | 3;
  /** Dimensions (px). Si non fourni => responsive via container */
  size?: number;
  /** Affiche une grille debug */
  debug?: boolean;
  /** Désactive l'input */
  disabled?: boolean;
  /** Zones à mettre en évidence pour guider le joueur sans modifier le scoring. */
  guideTargets?: DartboardGuideTarget[];
  /** Libellé court du guide (ex: "VISE T20"). */
  guideLabel?: string;
  /** Couleur par défaut du guide. */
  guideColor?: string;
};

// Numéros standards, en partant du 20 en haut, sens horaire.
const WEDGE_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

const TAU = Math.PI * 2;
const WEDGE = TAU / 20;

// Réglage principal pour "rentrer dans la cible" (compense marges/transparences de l'image).
// Augmente cette valeur si tu cliques trop facilement sur le "double" externe.
const INSET_PX = 18;

// Proportions normalisées (r en [0..1]) calibrées pour la photo actuelle.
// (Ces valeurs sont volontairement "UX": on privilégie la précision de saisie.)
const R = {
  DBULL: 0.070,
  BULL: 0.140,

  TRIPLE_IN: 0.545,
  TRIPLE_OUT: 0.625,

  DOUBLE_IN: 0.865,
  DOUBLE_OUT: 0.975,
} as const;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function normAngle0TopClockwise(dx: number, dy: number) {
  // Browser coords: +x right, +y down.
  // atan2(dy, dx): right=0, down=+pi/2, left=pi, up=-pi/2.
  // Add +pi/2 so that up becomes 0. Then increasing angle goes clockwise.
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  if (a < 0) a += TAU;
  return a; // [0..2pi)
}

function segmentFromAngle(angle0TopClockwise: number) {
  // Wedges centered on their number => offset by half-wedge.
  const idx = Math.floor((angle0TopClockwise + WEDGE / 2) / WEDGE) % 20;
  return WEDGE_ORDER[idx] ?? 20;
}

function classifyHit(r: number, angle0TopClockwise: number): { seg: number; mul: 1 | 2 | 3; ring: DartboardHitDetail["ring"] } {
  // Outside board => miss (0)
  if (!(r >= 0) || r > 1.02) return { seg: 0, mul: 1, ring: "miss" };

  // Bulls
  if (r <= R.DBULL) return { seg: 25, mul: 2, ring: "dbull" };
  if (r <= R.BULL) return { seg: 25, mul: 1, ring: "bull" };

  const seg = segmentFromAngle(angle0TopClockwise);

  // Rings
  if (r >= R.DOUBLE_IN && r <= R.DOUBLE_OUT) return { seg, mul: 2, ring: "double" };
  if (r >= R.TRIPLE_IN && r <= R.TRIPLE_OUT) return { seg, mul: 3, ring: "triple" };

  // Single : la distinction interne/externe est essentielle pour PRISONER.
  if (r < R.TRIPLE_IN) return { seg, mul: 1, ring: "inner_single" };
  return { seg, mul: 1, ring: "outer_single" };
}


function guideRadius(size: number | undefined) {
  const s = Math.max(80, Number(size || 320));
  return Math.max(60, 100 - (INSET_PX * 200) / s);
}
function polarPoint(cx:number, cy:number, radius:number, angle:number) {
  return { x: cx + Math.sin(angle) * radius, y: cy - Math.cos(angle) * radius };
}
function annularPath(segment:number, innerR:number, outerR:number) {
  const idx = WEDGE_ORDER.findIndex((n) => Number(n) === Number(segment));
  if (idx < 0) return "";
  const center = idx * WEDGE;
  const start = center - WEDGE / 2;
  const end = center + WEDGE / 2;
  const a = polarPoint(100, 100, outerR, start);
  const b = polarPoint(100, 100, outerR, end);
  const c = polarPoint(100, 100, innerR, end);
  const d = polarPoint(100, 100, innerR, start);
  return `M ${a.x} ${a.y} A ${outerR} ${outerR} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${innerR} ${innerR} 0 0 0 ${d.x} ${d.y} Z`;
}
function guideRanges(target:DartboardGuideTarget, boardR:number) {
  const r = (v:number) => Math.max(0, Math.min(boardR, v * boardR));
  switch (target.ring) {
    case "number": return [[r(R.BULL), r(R.DOUBLE_OUT)]];
    case "single": return [[r(R.BULL), r(R.TRIPLE_IN)], [r(R.TRIPLE_OUT), r(R.DOUBLE_IN)]];
    case "inner_single": return [[r(R.BULL), r(R.TRIPLE_IN)]];
    case "triple": return [[r(R.TRIPLE_IN), r(R.TRIPLE_OUT)]];
    case "outer_single": return [[r(R.TRIPLE_OUT), r(R.DOUBLE_IN)]];
    case "double": return [[r(R.DOUBLE_IN), r(R.DOUBLE_OUT)]];
    default: return [];
  }
}

export default function DartboardClickable(props: Props) {
  const { onHit, onDetailedHit, multiplier, size, debug, disabled, guideTargets = [], guideLabel, guideColor = "#ffe46b" } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const [last, setLast] = useState<{ seg: number; mul: 1 | 2 | 3; x: number; y: number } | null>(null);

  const lastTimerRef = useRef<number | null>(null);

  const dimStyle = useMemo(() => {
    const s = size ?? 320;
    return { width: s, height: s };
  }, [size]);
  const guideBoardR = useMemo(() => guideRadius(size), [size]);

  useEffect(() => {
    return () => {
      if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
    };
  }, []);


  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const x = e.clientX - cx;
    const y = e.clientY - cy;

    const radiusPx = Math.max(10, Math.min(rect.width, rect.height) / 2 - INSET_PX);
    const dist = Math.sqrt(x * x + y * y);
    const r = dist / radiusPx;

    const ang = normAngle0TopClockwise(x, y);
    const hit = classifyHit(r, ang);

    // Safety: éviter tout NaN/Object dans la pipe
    const seg = Number.isFinite(hit.seg) ? hit.seg : 0;
    const mul = (hit.mul === 2 || hit.mul === 3) ? hit.mul : 1;

    setLast({ seg, mul, x, y });

    // Auto-hide l’étiquette centrale après 1s pour ne pas gêner BULL/DBULL
    if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
    lastTimerRef.current = window.setTimeout(() => setLast(null), 1000);


    try {
      onDetailedHit?.({ segment: seg, mult: mul, ring: hit.ring });
      onHit(seg, mul);
    } catch {
      // noop
    }
  }

  return (
    <div
      ref={ref}
      data-mss-play-input="1"
      onPointerDown={handlePointer}
      style={{
        ...dimStyle,
        position: "relative",
        margin: "0 auto",
        touchAction: "none",
        userSelect: "none",
        borderRadius: "999px",
        overflow: "hidden",
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? "grayscale(0.3)" : "none",
        background: "rgba(0,0,0,.25)",
        border: "1px solid rgba(255,255,255,.10)",
      }}
      aria-label="Dartboard"
      role="button"
    >
      {/* Image */}
      <img
        src={dartboardPhoto}
        alt="dartboard"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          pointerEvents: "none",
        }}
      />

      {guideTargets.length ? (
        <>
          <svg
            viewBox="0 0 200 200"
            aria-hidden="true"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}
          >
            {guideTargets.map((target, ti) => {
              const color = target.color || guideColor;
              if (target.ring === "dbull") {
                return <circle key={`g-${ti}`} cx="100" cy="100" r={R.DBULL * guideBoardR} fill={color} fillOpacity=".25" stroke={color} strokeWidth="1.6" />;
              }
              if (target.ring === "bull") {
                return <circle key={`g-${ti}`} cx="100" cy="100" r={R.BULL * guideBoardR} fill="none" stroke={color} strokeOpacity=".95" strokeWidth="5.5" />;
              }
              if (target.ring === "bull_any") {
                return <circle key={`g-${ti}`} cx="100" cy="100" r={R.BULL * guideBoardR} fill={color} fillOpacity=".19" stroke={color} strokeOpacity=".9" strokeWidth="1.7" />;
              }
              const seg = Number(target.segment || 0);
              return <React.Fragment key={`g-${ti}`}>{guideRanges(target, guideBoardR).map(([innerR, outerR], ri) => {
                const d = annularPath(seg, innerR, outerR);
                return d ? <path key={ri} d={d} fill={color} fillOpacity=".19" stroke={color} strokeOpacity=".9" strokeWidth="1.4" /> : null;
              })}</React.Fragment>;
            })}
          </svg>
          {guideLabel ? (
            <div style={{ position:"absolute", left:"50%", bottom:8, transform:"translateX(-50%)", maxWidth:"82%", padding:"4px 9px", borderRadius:999, background:"rgba(4,7,11,.86)", border:`1px solid ${guideColor}77`, color:guideColor, fontSize:9.5, fontWeight:1000, letterSpacing:.45, textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", pointerEvents:"none", boxShadow:`0 0 14px ${guideColor}22` }}>
              {guideLabel}
            </div>
          ) : null}
        </>
      ) : null}

      {/* Badge multiplicateur (état sélectionné parent) */}
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          padding: "6px 10px",
          borderRadius: 12,
          background: "rgba(0,0,0,.55)",
          border: "1px solid rgba(255,255,255,.10)",
          color: "rgba(255,255,255,.85)",
          fontWeight: 900,
          letterSpacing: 0.3,
          fontSize: 12,
          pointerEvents: "none",
        }}
      >
        {multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S"}
      </div>

      {/* Dernier hit */}
      {last ? (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,.60)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "#ffd46a",
              fontWeight: 1000,
              fontSize: 14,
              letterSpacing: 0.2,
              pointerEvents: "none",
            }}
          >
            {(last.mul === 3 ? "T" : last.mul === 2 ? "D" : "S") + (last.seg === 25 ? "BULL" : String(last.seg))}
          </div>

          {/* Point visuel */}
          <div
            style={{
              position: "absolute",
              left: `calc(50% + ${last.x}px)`,
              top: `calc(50% + ${last.y}px)`,
              width: 10,
              height: 10,
              transform: "translate(-50%,-50%)",
              borderRadius: 999,
              background: "rgba(255,255,255,.9)",
              boxShadow: "0 0 0 2px rgba(0,0,0,.55)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}

      {debug ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.10) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            mixBlendMode: "overlay",
          }}
        />
      ) : null}
    </div>
  );
}
