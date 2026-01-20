import React, { useMemo, useRef, useState } from "react";

export type DartMult = 0 | 1 | 2 | 3; // 0 = MISS
export type DartHit = {
  mult: DartMult;
  value: number;      // 0 si MISS
  label: string;      // ex: "S20", "T19", "DBULL", "MISS"
  isBull?: boolean;
};

type Props = {
  /** URL de l'image (photo/PNG) de la cible */
  src: string;
  /** Callback quand on clique/touch */
  onHit: (hit: DartHit) => void;
  /** Optionnel: désactive l'interaction */
  disabled?: boolean;
  /** Optionnel: classe wrapper */
  className?: string;
  /** Optionnel: afficher un point d'impact */
  showImpactDot?: boolean;
};

/**
 * Cible cliquable via calcul angle/rayon.
 * Fonctionne avec une IMAGE en background : la "zone" est déduite mathématiquement.
 *
 * Références (dimensions standard) normalisées par rayon extérieur (double outer = 170mm).
 * - Double outer: 170
 * - Double inner: 162
 * - Triple outer: 107
 * - Triple inner: 99
 * - Bull outer: 31.8
 * - Bull inner: 12.7
 */
export default function DartboardPhotoHit({
  src,
  onHit,
  disabled,
  className,
  showImpactDot = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [impact, setImpact] = useState<{ x: number; y: number; label: string } | null>(null);

  // Ordre standard des numéros sur une cible (en partant du haut, sens horaire)
  const numbers = useMemo(
    () => [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
    []
  );

  // Ratios (rayon / rayon_exterieur)
  const R = useMemo(() => {
    const outer = 170;
    return {
      miss: 1.0,                // au-delà => MISS
      doubleOuter: 170 / outer, // 1.0
      doubleInner: 162 / outer, // ~0.9529
      tripleOuter: 107 / outer, // ~0.6294
      tripleInner: 99 / outer,  // ~0.5824
      bullOuter: 31.8 / outer,  // ~0.1871
      bullInner: 12.7 / outer,  // ~0.0747
    };
  }, []);

  function hitFromPoint(nx: number, ny: number): DartHit {
    // nx, ny dans [-1..1] (centre = 0,0), cercle unité = rayon extérieur
    const r = Math.sqrt(nx * nx + ny * ny);

    if (r > R.miss) return { mult: 0, value: 0, label: "MISS" };

    // Bulls
    if (r <= R.bullInner) return { mult: 2, value: 25, label: "DBULL", isBull: true };
    if (r <= R.bullOuter) return { mult: 1, value: 25, label: "BULL", isBull: true };

    // Angle: on veut 0° en haut (12h), puis horaire
    // atan2 donne angle depuis l'axe x, sens trigonométrique. On transforme.
    const angle = Math.atan2(ny, nx); // [-pi..pi], 0 à droite
    let deg = (angle * 180) / Math.PI; // [-180..180]
    deg = (deg + 90 + 360) % 360; // 0 en haut, horaire, [0..360)

    // 20 secteurs => 18° chacun
    // On décale de 9° pour centrer le secteur
    const sectorIndex = Math.floor(((deg + 9) % 360) / 18); // 0..19
    const base = numbers[sectorIndex];

    // Anneaux (ordre : du centre vers l'extérieur)
    // Simple intérieur: bullOuter..tripleInner
    // Triple: tripleInner..tripleOuter
    // Simple extérieur: tripleOuter..doubleInner
    // Double: doubleInner..doubleOuter
    let mult: DartMult = 1;

    if (r >= R.doubleInner && r <= R.doubleOuter) mult = 2;
    else if (r >= R.tripleInner && r <= R.tripleOuter) mult = 3;
    else mult = 1;

    return { mult, value: base, label: `${mult === 1 ? "S" : mult === 2 ? "D" : "T"}${base}` };
  }

  function onPointer(e: React.PointerEvent) {
    if (disabled) return;

    const el = wrapRef.current;
    if (!el) return;

    // Capture pointer pour un meilleur feeling mobile
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const rect = el.getBoundingClientRect();

    // On force un carré logique basé sur le plus petit côté (pour garder le cercle)
    const size = Math.min(rect.width, rect.height);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Coordonnées relatives centre -> normalisées par (size/2)
    const px = e.clientX - cx;
    const py = e.clientY - cy;

    const nx = px / (size / 2);
    const ny = py / (size / 2);

    const hit = hitFromPoint(nx, ny);
    onHit(hit);

    if (showImpactDot) {
      // Position dot en % du wrapper
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      setImpact({ x: xPct, y: yPct, label: hit.label });
      window.setTimeout(() => setImpact(null), 650);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      onPointerDown={onPointer}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 18,
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        cursor: disabled ? "not-allowed" : "crosshair",
      }}
    >
      {/* IMAGE */}
      <img
        src={src}
        alt="Dartboard"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "contrast(1.05) saturate(1.05)",
          transform: "scale(1.01)",
        }}
      />

      {/* VIGNETTE / GLOW léger */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 40px rgba(0,0,0,0.55)",
        }}
      />

      {/* DOT impact */}
      {impact && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: `${impact.x}%`,
            top: `${impact.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 0 18px rgba(255,255,255,0.65)",
            }}
          />
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {impact.label}
          </div>
        </div>
      )}

      {/* Overlay pour capter clics même si img a des comportements */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
        }}
      />
    </div>
  );
}
