import React from "react";
import type { FitMuscle } from "../../fit/fitStore";

type MuscleIntensity = 0 | 1 | 2 | 3;

type Props = {
  selected?: FitMuscle | "Tous";
  onSelect?: (muscle: FitMuscle) => void;
  lang?: string;
  intensityMap?: Partial<Record<FitMuscle, MuscleIntensity>>;
  interactive?: boolean;
};

type BodyChartInstance = {
  update: (options: Record<string, unknown>) => void;
  destroy: () => void;
};

type BodyMusclesModule = {
  BodyChart: new (container: HTMLElement, options: Record<string, unknown>) => BodyChartInstance;
  ViewSide: { FRONT: string; BACK: string };
};

const BODY_MUSCLES_ESM = "https://esm.sh/body-muscles@1.0.0?bundle";

const NEUTRAL_FILL = "rgba(216,219,226,.26)";
const NEUTRAL_STROKE = "rgba(125,131,142,.44)";
const INTENSITY_COLORS: Record<MuscleIntensity, { fill: string; stroke: string; glow: string }> = {
  0: { fill: NEUTRAL_FILL, stroke: NEUTRAL_STROKE, glow: "transparent" },
  1: { fill: "#f2d36b", stroke: "#ffe38f", glow: "rgba(242,211,107,.30)" },
  2: { fill: "#ff9a38", stroke: "#ffb064", glow: "rgba(255,154,56,.34)" },
  3: { fill: "#ff5d73", stroke: "#ff9aa9", glow: "rgba(255,93,115,.40)" },
};

function fitMuscleForBodyMusclesId(id: string): FitMuscle | null {
  const value = String(id || "").toLowerCase();
  if (!value) return null;

  if (value.startsWith("neck-") || value === "nape") return "Cou";
  if (value.startsWith("shoulder-") || value.startsWith("deltoid-") || value.startsWith("traps-")) return "Épaules";
  if (value.startsWith("biceps-")) return "Biceps";
  if (value.startsWith("triceps-")) return "Triceps";
  if (value.startsWith("forearm-") || value.startsWith("elbow-")) return "Avant-bras";
  if (value.startsWith("chest-")) return "Pectoraux";
  if (value.startsWith("lats-")) return "Dos";
  if (value.startsWith("lower-back-") || value === "spine") return "Lombaires";
  if (value.startsWith("gluteus-medius-")) return "Abducteurs";
  if (value.startsWith("gluteus-maximus-")) return "Fessiers";
  if (value.startsWith("abs-") || value.startsWith("obliques-") || value.startsWith("serratus-anterior-")) return "Abdos";
  if (value.startsWith("quads-")) return "Quadriceps";
  if (value.startsWith("hamstrings-")) return "Ischios";
  if (value.startsWith("adductors-")) return "Adducteurs";
  if (value.startsWith("calves-") || value.startsWith("tibialis-anterior-")) return "Mollets";
  if (value.startsWith("hip-flexor-")) return "Quadriceps";
  return null;
}

function intensityForMuscle(
  muscle: FitMuscle | null,
  selected: FitMuscle | "Tous",
  intensityMap?: Partial<Record<FitMuscle, MuscleIntensity>>,
): MuscleIntensity {
  if (!muscle) return 0;
  if (intensityMap) return intensityMap[muscle] ?? 0;
  return selected !== "Tous" && muscle === selected ? 3 : 0;
}

function applyChartState(
  chart: BodyChartInstance | null,
  selected: FitMuscle | "Tous",
  intensityMap?: Partial<Record<FitMuscle, MuscleIntensity>>,
) {
  if (!chart) return;
  const rawMap = (chart as any).musclePaths as Map<string, SVGPathElement> | undefined;
  if (!rawMap || typeof rawMap.forEach !== "function") {
    chart.update({ bodyState: {} });
    return;
  }

  chart.update({ bodyState: {} });
  rawMap.forEach((path, id) => {
    const fitMuscle = fitMuscleForBodyMusclesId(id);
    const intensity = intensityForMuscle(fitMuscle, selected, intensityMap);
    const color = INTENSITY_COLORS[intensity];
    path.style.fill = color.fill;
    path.style.stroke = color.stroke;
    path.style.strokeWidth = intensity > 0 ? ".28" : ".16";
    path.style.fillOpacity = intensity > 0 ? "1" : ".95";
    path.style.filter = intensity > 0 ? `drop-shadow(0 0 6px ${color.glow})` : "none";
    path.style.transition = "fill .18s ease, stroke .18s ease, filter .18s ease, opacity .18s ease";
    path.style.cursor = fitMuscle ? "pointer" : "default";
  });
}

function BodyMusclesPanel({
  view,
  label,
  selected,
  onSelect,
  module,
  intensityMap,
  interactive = true,
}: {
  view: "FRONT" | "BACK";
  label: string;
  selected: FitMuscle | "Tous";
  onSelect?: (muscle: FitMuscle) => void;
  module: BodyMusclesModule | null;
  intensityMap?: Partial<Record<FitMuscle, MuscleIntensity>>;
  interactive?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<BodyChartInstance | null>(null);

  React.useEffect(() => {
    if (!module || !hostRef.current) return;
    const host = hostRef.current;
    host.replaceChildren();

    const chart = new module.BodyChart(host, {
      view: view === "FRONT" ? module.ViewSide.FRONT : module.ViewSide.BACK,
      bodyState: {},
      enableTransitions: true,
      showViewLabel: false,
      ariaLabel: label,
      onMuscleClick: (id: string) => {
        const target = fitMuscleForBodyMusclesId(id);
        if (interactive && target && onSelect) onSelect(target);
      },
      onMuscleHover: () => {},
    });
    chartRef.current = chart;
    applyChartState(chart, selected, intensityMap);

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [module, view, label, interactive, onSelect]);

  React.useEffect(() => {
    applyChartState(chartRef.current, selected, intensityMap);
  }, [selected, intensityMap]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ textAlign: "center", fontSize: 7.4, fontWeight: 1000, letterSpacing: 1.05, opacity: .56, marginBottom: 7 }}>{label}</div>
      <div className="fit-body-muscles-host" ref={hostRef} />
    </div>
  );
}

export default function FitBodyMap({ selected = "Tous", onSelect, lang = "fr", intensityMap, interactive = true }: Props) {
  const key = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const [module, setModule] = React.useState<BodyMusclesModule | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    const importModule = new Function("url", "return import(url)") as (url: string) => Promise<BodyMusclesModule>;
    void importModule(BODY_MUSCLES_ESM)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded?.BodyChart || !loaded?.ViewSide) throw new Error("Body Muscles module incomplete");
        setModule(loaded);
        setLoadState("ready");
      })
      .catch((error) => {
        console.warn("[FIT PERF] Body Muscles unavailable", error);
        if (!cancelled) {
          setModule(null);
          setLoadState("error");
        }
      });
    return () => { cancelled = true; };
  }, [retryKey]);

  const frontLabel = key === "en" ? "FRONT" : key === "es" ? "FRENTE" : "FACE";
  const backLabel = key === "en" ? "BACK" : key === "es" ? "ESPALDA" : "DOS";

  return (
    <div className="fit-body-muscles-map" style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.075)", background: "linear-gradient(180deg,rgba(10,13,22,.96),rgba(6,9,16,.91))", boxShadow: "0 15px 38px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.035)", overflow: "hidden", padding: 9 }}>
      <style>{`
        @keyframes fitBodyMusclePulse {
          0%,100% { filter:brightness(1); }
          50% { filter:brightness(1.08); }
        }
        .fit-body-muscles-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px;
        }
        .fit-body-muscles-host {
          position:relative;
          height:315px;
          min-width:0;
          border-radius:18px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.05);
          background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.042),rgba(255,255,255,.01) 60%,rgba(0,0,0,.08));
        }
        .fit-body-muscles-host .body-chart-container {
          box-sizing:border-box !important;
          padding:3px 0 !important;
          width:100% !important;
          height:100% !important;
        }
        .fit-body-muscles-host .body-chart-svg {
          display:block !important;
          width:100% !important;
          height:100% !important;
          max-width:none !important;
          max-height:100% !important;
          overflow:visible !important;
        }
        .fit-body-muscles-host .body-chart-background { opacity:.09 !important; }
        .fit-body-muscles-host .body-chart-muscle {
          transition:fill .18s ease, stroke .18s ease, filter .18s ease, opacity .18s ease !important;
          animation:fitBodyMusclePulse 1.25s ease-in-out infinite;
        }
        @media (max-width:560px) {
          .fit-body-muscles-host { height:255px; }
          .fit-body-muscles-grid { gap:6px; }
        }
      `}</style>

      {loadState === "ready" && module ? (
        <div className="fit-body-muscles-grid">
          <BodyMusclesPanel view="FRONT" label={frontLabel} selected={selected} onSelect={onSelect} module={module} intensityMap={intensityMap} interactive={interactive} />
          <BodyMusclesPanel view="BACK" label={backLabel} selected={selected} onSelect={onSelect} module={module} intensityMap={intensityMap} interactive={interactive} />
        </div>
      ) : (
        <div style={{ minHeight: 280, borderRadius: 18, border: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.014)", display: "grid", placeItems: "center", padding: 18, textAlign: "center" }}>
          {loadState === "loading" ? (
            <div><div style={{ fontSize: 22 }}>◌</div><div style={{ marginTop: 8, fontSize: 9, fontWeight: 1000 }}>{key === "en" ? "Loading anatomical map…" : key === "es" ? "Cargando mapa anatómico…" : "Chargement de la carte anatomique…"}</div></div>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontWeight: 1000 }}>{key === "en" ? "Anatomical map unavailable" : key === "es" ? "Mapa anatómico no disponible" : "Carte anatomique indisponible"}</div>
              <button type="button" onClick={() => setRetryKey((value) => value + 1)} style={{ marginTop: 10, minHeight: 34, padding: "0 13px", borderRadius: 11, border: "1px solid rgba(255,61,98,.42)", background: "rgba(255,61,98,.09)", color: "#ff6b86", fontSize: 8, fontWeight: 1000, cursor: "pointer" }}>{key === "en" ? "RETRY" : key === "es" ? "REINTENTAR" : "RÉESSAYER"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
