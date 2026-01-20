// ============================================
// src/components/DartboardClickable.tsx
// Cible interactive (touch/click) => déduit segment + multiplicateur
// - SVG/Canvas-free: simple div + calcul géométrique
// - Mapping standard des numéros autour de la cible
// - Anneaux approximés avec proportions réalistes (suffisant pour une saisie UX)
// ============================================

import React from "react";

type Props = {
  /** Callback segment (0..20, 25) + mult (1..3) */
  onHit: (segment: number, mult: 1 | 2 | 3) => void;
  /** Multiplicateur courant venant du parent (boutons S/D/T) */
  multiplier: 1 | 2 | 3;
  /** Dimensions (px). Si non fourni => responsive via container */
  size?: number;
  /** Affiche une grille debug */
  debug?: boolean;
  /** Désactive l'input */
  disabled?: boolean;
};

// Ordre standard (en tournant dans le sens horaire depuis le haut)
const WEDGE_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

// Proportions normalisées (r en [0..1]) basées sur des dimensions de board standard.
// Objectif: UX fiable, pas calibration officielle.
const R = {
  DBULL: 0.037, // ~6.35 / 170
  BULL: 0.094, // ~15.9 / 170
  TRIPLE_IN: 0.582, // ~99 / 170
  TRIPLE_OUT: 0.629, // ~107 / 170
  DOUBLE_IN: 0.953, // ~162 / 170
  DOUBLE_OUT: 1.0,
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function polarFromEvent(
  el: HTMLElement,
  clientX: number,
  clientY: number
): { r: number; ang: number } {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const radiusPx = Math.min(rect.width, rect.height) / 2;
  const r = Math.sqrt(dx * dx + dy * dy) / radiusPx;
  // angle 0 au "haut", sens horaire
  const ang = Math.atan2(dy, dx); // -pi..pi, 0 à droite
  const angFromTop = ang + Math.PI / 2;
  const angCW = (2 * Math.PI - angFromTop) % (2 * Math.PI);
  return { r, ang: angCW };
}

function pickWedge(angleCW: number): number {
  const slice = (2 * Math.PI) / 20;
  const idx = Math.floor(((angleCW + slice / 2) % (2 * Math.PI)) / slice);
  return WEDGE_ORDER[clamp(idx, 0, 19)];
}

function pickRing(r: number): { segment: number; mult: 1 | 2 | 3 } {
  if (r > R.DOUBLE_OUT) return { segment: 0, mult: 1 }; // dehors
  if (r <= R.DBULL) return { segment: 25, mult: 2 }; // 50
  if (r <= R.BULL) return { segment: 25, mult: 1 }; // 25
  if (r >= R.DOUBLE_IN && r <= R.DOUBLE_OUT) return { segment: -1 as any, mult: 2 };
  if (r >= R.TRIPLE_IN && r <= R.TRIPLE_OUT) return { segment: -1 as any, mult: 3 };
  return { segment: -1 as any, mult: 1 };
}

export default function DartboardClickable({
  onHit,
  multiplier,
  size,
  debug = false,
  disabled = false,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [last, setLast] = React.useState<null | {
    label: string;
    x: number;
    y: number;
  }>(null);

  function handlePointer(e: React.PointerEvent) {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const { r, ang } = polarFromEvent(el, e.clientX, e.clientY);
    const wedge = pickWedge(ang);
    const ring = pickRing(r);

    // Bull/DBull ignorent le multiplier externe, on fixe.
    if (ring.segment === 25) {
      onHit(25, ring.mult);
      setLast({ label: ring.mult === 2 ? "DBULL" : "BULL", x: e.clientX, y: e.clientY });
      return;
    }

    if (ring.segment === 0) {
      onHit(0, 1);
      setLast({ label: "MISS", x: e.clientX, y: e.clientY });
      return;
    }

    // Anneaux D/T imposent le multiplicateur.
    const forcedMult = ring.mult;
    const finalMult: 1 | 2 | 3 = forcedMult === 1 ? multiplier : forcedMult;
    onHit(wedge, finalMult);
    const prefix = finalMult === 3 ? "T" : finalMult === 2 ? "D" : "S";
    setLast({ label: `${prefix}${wedge}`, x: e.clientX, y: e.clientY });
  }

  const px = size ?? 320;

  return (
    <div
      style={{
        width: size ? px : "100%",
        maxWidth: size ? px : 520,
        margin: "0 auto",
      }}
    >
      <div
        ref={ref}
        onPointerDown={handlePointer}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "radial-gradient(circle at center, rgba(255,255,255,.10) 0%, rgba(0,0,0,.55) 35%, rgba(0,0,0,.85) 100%)",
          boxShadow: "0 18px 40px rgba(0,0,0,.45)",
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
        }}
        aria-label="Cible interactive"
        role="button"
      >
        {/* Anneaux visuels (approx.) */}
        <Ring r={R.DOUBLE_OUT} c="rgba(255,255,255,.08)" />
        <Ring r={R.DOUBLE_IN} c="rgba(255,255,255,.06)" />
        <Ring r={R.TRIPLE_OUT} c="rgba(255,255,255,.06)" />
        <Ring r={R.TRIPLE_IN} c="rgba(255,255,255,.06)" />
        <Ring r={R.BULL} c="rgba(255,255,255,.10)" />
        <Ring r={R.DBULL} c="rgba(255,255,255,.18)" />

        {/* Repères 20 secteurs */}
        <Sectors />

        {/* Badge multiplicateur actif */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(0,0,0,.55)",
            border: "1px solid rgba(255,255,255,.10)",
            color: "rgba(255,255,255,.85)",
            fontWeight: 900,
            letterSpacing: 0.3,
            fontSize: 12,
          }}
          title="Multiplicateur courant (S/D/T)"
        >
          {multiplier === 3 ? "TRIPLE" : multiplier === 2 ? "DOUBLE" : "SIMPLE"}
        </div>

        {/* Flash dernier hit */}
        {last && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(0,0,0,.60)",
              border: "1px solid rgba(255,255,255,.14)",
              color: "#ffc63a",
              fontWeight: 1000,
              fontSize: 18,
              boxShadow: "0 0 28px rgba(255,198,58,.18)",
              pointerEvents: "none",
            }}
          >
            {last.label}
          </div>
        )}

        {debug && <DebugOverlay />}
      </div>
      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,.55)",
          fontWeight: 800,
        }}
      >
        Touchez la cible pour enregistrer une fléchette (Bull/DBull auto).
      </div>
    </div>
  );
}

function Ring({ r, c }: { r: number; c: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${r * 100}%`,
        height: `${r * 100}%`,
        transform: "translate(-50%, -50%)",
        borderRadius: "999px",
        border: `1px solid ${c}`,
      }}
    />
  );
}

function Sectors() {
  // 20 traits radiaux légers
  const lines = Array.from({ length: 20 }).map((_, i) => {
    const deg = (360 / 20) * i;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1,
          height: "50%",
          transform: `translate(-50%, -100%) rotate(${deg}deg)`,
          transformOrigin: "50% 100%",
          background: "rgba(255,255,255,.05)",
        }}
      />
    );
  });
  return <>{lines}</>;
}

function DebugOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        color: "rgba(255,255,255,.18)",
        fontWeight: 900,
        fontSize: 11,
      }}
    >
      <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)" }}>N</div>
      <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>E</div>
      <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)" }}>S</div>
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}>W</div>
    </div>
  );
}
