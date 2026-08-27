import React from "react";
import type { FitMuscle } from "../../fit/fitStore";
import { FIT_MUSCLE_COLORS, FIT_MUSCLE_LABELS } from "../../fit/fitExerciseTaxonomy";

type Props = {
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  counts?: Partial<Record<FitMuscle, number>>;
  lang?: string;
};

type Hotspot = {
  muscle: FitMuscle;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
};

const anatomyImage = "/fit-anatomy-reference.jpg";

const FRONT_HOTSPOTS: Hotspot[] = [
  { muscle: "Cou", x: 43, y: 9.5, w: 14, h: 11, radius: 18 },
  { muscle: "Épaules", x: 18, y: 18, w: 24, h: 12, radius: 20 },
  { muscle: "Épaules", x: 58, y: 18, w: 24, h: 12, radius: 20 },
  { muscle: "Pectoraux", x: 29, y: 23, w: 20, h: 15, radius: 18 },
  { muscle: "Pectoraux", x: 51, y: 23, w: 20, h: 15, radius: 18 },
  { muscle: "Biceps", x: 11, y: 27, w: 14, h: 18, radius: 18 },
  { muscle: "Biceps", x: 75, y: 27, w: 14, h: 18, radius: 18 },
  { muscle: "Avant-bras", x: 7, y: 45, w: 13, h: 20, radius: 18 },
  { muscle: "Avant-bras", x: 80, y: 45, w: 13, h: 20, radius: 18 },
  { muscle: "Abdos", x: 38, y: 37, w: 24, h: 24, radius: 16 },
  { muscle: "Abducteurs", x: 28, y: 59, w: 13, h: 11, radius: 18 },
  { muscle: "Abducteurs", x: 59, y: 59, w: 13, h: 11, radius: 18 },
  { muscle: "Adducteurs", x: 42, y: 60, w: 16, h: 15, radius: 18 },
  { muscle: "Quadriceps", x: 29, y: 66, w: 16, h: 21, radius: 18 },
  { muscle: "Quadriceps", x: 55, y: 66, w: 16, h: 21, radius: 18 },
  { muscle: "Mollets", x: 33, y: 86, w: 12, h: 12, radius: 18 },
  { muscle: "Mollets", x: 55, y: 86, w: 12, h: 12, radius: 18 },
];

const BACK_HOTSPOTS: Hotspot[] = [
  { muscle: "Cou", x: 43, y: 9.5, w: 14, h: 11, radius: 18 },
  { muscle: "Épaules", x: 17, y: 17, w: 24, h: 13, radius: 20 },
  { muscle: "Épaules", x: 59, y: 17, w: 24, h: 13, radius: 20 },
  { muscle: "Dos", x: 26, y: 24, w: 48, h: 28, radius: 18 },
  { muscle: "Triceps", x: 10, y: 27, w: 14, h: 18, radius: 18 },
  { muscle: "Triceps", x: 76, y: 27, w: 14, h: 18, radius: 18 },
  { muscle: "Avant-bras", x: 7, y: 45, w: 13, h: 20, radius: 18 },
  { muscle: "Avant-bras", x: 80, y: 45, w: 13, h: 20, radius: 18 },
  { muscle: "Lombaires", x: 38, y: 50, w: 24, h: 11, radius: 18 },
  { muscle: "Fessiers", x: 31, y: 58, w: 38, h: 16, radius: 18 },
  { muscle: "Abducteurs", x: 26, y: 59, w: 12, h: 14, radius: 18 },
  { muscle: "Abducteurs", x: 62, y: 59, w: 12, h: 14, radius: 18 },
  { muscle: "Ischios", x: 30, y: 71, w: 16, h: 18, radius: 18 },
  { muscle: "Ischios", x: 54, y: 71, w: 16, h: 18, radius: 18 },
  { muscle: "Mollets", x: 32, y: 86, w: 12, h: 12, radius: 18 },
  { muscle: "Mollets", x: 56, y: 86, w: 12, h: 12, radius: 18 },
];

function colorWithAlpha(hex: string, alpha: string) {
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) return hex;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  return `${hex}${alpha}`;
}

function BodyPanel({ title, backgroundPosition, hotspots, selected, onSelect, lang }: {
  title: string;
  backgroundPosition: string;
  hotspots: Hotspot[];
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  lang: "fr" | "en" | "es";
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ textAlign: "center", fontSize: 7.4, fontWeight: 1000, letterSpacing: 1, opacity: .56, marginBottom: 8 }}>{title}</div>
      <div
        style={{
          position: "relative",
          height: 338,
          borderRadius: 26,
          border: "1px solid rgba(255,255,255,.08)",
          overflow: "hidden",
          background: `linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)), url(${anatomyImage})`,
          backgroundSize: "200% auto",
          backgroundPosition,
          backgroundRepeat: "no-repeat",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 12px 24px rgba(0,0,0,.18)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.04))" }} />
        {hotspots.map((spot, index) => {
          const active = selected === spot.muscle;
          const color = FIT_MUSCLE_COLORS[spot.muscle];
          return (
            <button
              key={`${spot.muscle}-${index}`}
              type="button"
              aria-label={FIT_MUSCLE_LABELS[spot.muscle][lang]}
              title={FIT_MUSCLE_LABELS[spot.muscle][lang]}
              onClick={() => onSelect(spot.muscle)}
              style={{
                position: "absolute",
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: `${spot.w}%`,
                height: `${spot.h}%`,
                transform: "translate(-50%, -50%)",
                borderRadius: spot.radius || 16,
                border: active ? `1.6px solid ${colorWithAlpha(color, "ee")}` : `1px solid ${colorWithAlpha(color, "80")}`,
                background: active ? colorWithAlpha(color, "b8") : colorWithAlpha(color, "4a"),
                boxShadow: active ? `0 0 0 2px rgba(255,255,255,.2), 0 0 20px ${colorWithAlpha(color, "90")}` : `0 0 10px ${colorWithAlpha(color, "55")}`,
                cursor: "pointer",
                backdropFilter: "blur(1px)",
                transition: "all .16s ease",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function FitBodyMap({ selected, onSelect, counts = {}, lang = "fr" }: Props) {
  const key = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const selectedLabel = selected === "Tous"
    ? (key === "en" ? "All muscle groups" : key === "es" ? "Todos los grupos" : "Tous les groupes")
    : FIT_MUSCLE_LABELS[selected][key];
  const selectedCount = selected === "Tous"
    ? Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)
    : Number(counts[selected] || 0);

  return (
    <div style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(11,14,24,.98),rgba(7,10,18,.92))", boxShadow: "0 18px 44px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.04)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "14px 15px 10px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 7.5, fontWeight: 1000, letterSpacing: 1, opacity: .52 }}>{key === "en" ? "TARGET AREA" : key === "es" ? "ZONA OBJETIVO" : "ZONE CIBLÉE"}</div>
          <div style={{ marginTop: 5, fontSize: 18, fontWeight: 1000, letterSpacing: -.35 }}>{selectedLabel}</div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,.62)", fontSize: 8.2 }}>{key === "en" ? "Tap a colored area to filter the library instantly." : key === "es" ? "Toca una zona coloreada para filtrar la biblioteca al instante." : "Touchez une zone colorée pour filtrer la bibliothèque instantanément."}</div>
        </div>
        <div style={{ minWidth: 62, minHeight: 46, padding: "0 10px", borderRadius: 16, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03))" }}>
          <div style={{ fontSize: 18, fontWeight: 1000 }}>{selected === "Tous" ? "∞" : selectedCount}</div>
          <div style={{ marginTop: 2, fontSize: 6.6, opacity: .5, fontWeight: 1000, letterSpacing: .8 }}>{key === "en" ? "EXERCISES" : key === "es" ? "EJERCICIOS" : "EXERCICES"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, padding: "0 12px 12px" }}>
        <BodyPanel title={key === "en" ? "FRONT" : key === "es" ? "FRENTE" : "FACE"} backgroundPosition="left center" hotspots={FRONT_HOTSPOTS} selected={selected} onSelect={onSelect} lang={key} />
        <BodyPanel title={key === "en" ? "BACK" : key === "es" ? "ESPALDA" : "DOS"} backgroundPosition="right center" hotspots={BACK_HOTSPOTS} selected={selected} onSelect={onSelect} lang={key} />
      </div>
    </div>
  );
}
