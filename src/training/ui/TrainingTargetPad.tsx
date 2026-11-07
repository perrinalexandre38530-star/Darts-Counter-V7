import React from "react";

/** A real 20-sector dartboard: each selectable ring records its actual sector and multiplier. */
const CLOCK = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const CX = 150;
const CY = 150;
const polar = (radius: number, angle: number) => ({ x: CX + radius * Math.sin(angle), y: CY - radius * Math.cos(angle) });
function ringSector(inner: number, outer: number, start: number, end: number) {
  const a = polar(outer, start), b = polar(outer, end), c = polar(inner, end), d = polar(inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}

export default function TrainingTargetPad({ onHit, disabled = false }: {
  onHit: (sector: number, multiplier: 1 | 2 | 3) => void;
  disabled?: boolean;
}) {
  return <div style={{ width: "min(100%,355px)", margin: "0 auto", padding: "10px 5px", userSelect: "none" }}>
    <svg viewBox="0 0 300 300" width="100%" role="group" aria-label="Cible de fléchettes interactive : choisis exactement la zone touchée" style={{ display: "block", touchAction: "manipulation", filter: "drop-shadow(0 8px 16px rgba(0,0,0,.4))" }}>
      <circle cx={CX} cy={CY} r="119" fill="#131b1c" stroke="#a8babc" strokeWidth="3" />
      {CLOCK.map((sector, i) => {
        const start = (i - .5) * Math.PI / 10;
        const end = (i + .5) * Math.PI / 10;
        const pale = i % 2 === 0;
        return <g key={sector}>
          {([
            [23, 68, 1, pale ? "#d2c5ad" : "#20242a"],
            [68, 78, 3, pale ? "#dc5552" : "#1e997a"],
            [78, 101, 1, pale ? "#d2c5ad" : "#20242a"],
            [101, 112, 2, pale ? "#dc5552" : "#1e997a"],
          ] as const).map(([inside, outside, multiplier, color], idx) => <path key={idx} d={ringSector(inside, outside, start, end)} fill={color} stroke="#9eaaa2" strokeWidth=".55" style={{ cursor: disabled ? "default" : "pointer" }} onClick={() => !disabled && onHit(sector, multiplier)} aria-label={`${multiplier === 3 ? "Triple" : multiplier === 2 ? "Double" : "Simple"} ${sector}`} />)}
          <text x={polar(128, i * Math.PI / 10).x} y={polar(128, i * Math.PI / 10).y} fill="#f6f6f6" fontWeight={900} fontSize="12" textAnchor="middle" dominantBaseline="central" pointerEvents="none">{sector}</text>
        </g>;
      })}
      <circle cx={CX} cy={CY} r="23" fill="#149573" stroke="#e1b9a3" strokeWidth="1.5" onClick={() => !disabled && onHit(25, 1)} style={{ cursor: disabled ? "default" : "pointer" }} aria-label="Demi-bulle 25" />
      <circle cx={CX} cy={CY} r="11" fill="#d43741" stroke="#e1b9a3" strokeWidth="1" onClick={() => !disabled && onHit(25, 2)} style={{ cursor: disabled ? "default" : "pointer" }} aria-label="Bulle 50" />
    </svg>
    <div style={{ fontSize: 11, opacity: .75, textAlign: "center", lineHeight: 1.5 }}>Appuie sur le simple, double, triple ou bull réellement touché.</div>
  </div>;
}
