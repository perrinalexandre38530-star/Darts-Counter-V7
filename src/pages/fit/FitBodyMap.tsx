import React from "react";
import type { FitMuscle } from "../../fit/fitStore";
import { FIT_MUSCLE_LABELS } from "../../fit/fitExerciseTaxonomy";

type Props = {
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  counts?: Partial<Record<FitMuscle, number>>;
  lang?: string;
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
const SELECTED_INTENSITY = 7; // Body Muscles intensity 7 = red.

/**
 * Body Muscles exposes 70+ anatomical SVG regions. FIT PERF intentionally maps
 * those fine-grained paths back to the exercise taxonomy used by the app.
 * Symmetric/sub-regions therefore light up together (e.g. all chest pieces).
 */
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
  // Iliopsoas/hip flexors are closest to the upper anterior thigh in the current FIT taxonomy.
  if (value.startsWith("hip-flexor-")) return "Quadriceps";

  // Head, face, hands, feet and knees are rendered for anatomical continuity,
  // but are not exercise filters in FIT PERF V1.
  return null;
}

function selectedBodyState(selected: FitMuscle | "Tous") {
  if (selected === "Tous") return {};

  // BodyChart accepts a sparse state, but it needs concrete ids. We create the
  // state after render by reading the library's own muscle path map (normal TS
  // private field, not a JS #private field). If that implementation detail ever
  // changes, click selection still works and the map simply falls back to neutral.
  return { __fitSelectedGroup: selected } as Record<string, unknown>;
}

function applySelectedGroup(chart: BodyChartInstance | null, selected: FitMuscle | "Tous") {
  if (!chart) return;
  const rawMap = (chart as any).musclePaths as Map<string, SVGPathElement> | undefined;
  if (!rawMap || typeof rawMap.forEach !== "function") {
    chart.update({ bodyState: selectedBodyState(selected) });
    return;
  }

  const bodyState: Record<string, { intensity: number; selected: boolean }> = {};
  rawMap.forEach((_path, id) => {
    const fitMuscle = fitMuscleForBodyMusclesId(id);
    bodyState[id] = {
      intensity: selected !== "Tous" && fitMuscle === selected ? SELECTED_INTENSITY : 0,
      selected: selected !== "Tous" && fitMuscle === selected,
    };
  });
  chart.update({ bodyState });
}

function BodyMusclesPanel({
  view,
  label,
  selected,
  onSelect,
  module,
}: {
  view: "FRONT" | "BACK";
  label: string;
  selected: FitMuscle | "Tous";
  onSelect: (muscle: FitMuscle) => void;
  module: BodyMusclesModule | null;
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
        if (target) onSelect(target);
      },
      onMuscleHover: () => {},
    });
    chartRef.current = chart;
    applySelectedGroup(chart, selected);

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [module, view]);

  React.useEffect(() => {
    applySelectedGroup(chartRef.current, selected);
  }, [selected]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ textAlign: "center", fontSize: 7.4, fontWeight: 1000, letterSpacing: 1.05, opacity: .56, marginBottom: 7 }}>{label}</div>
      <div className="fit-body-muscles-host" ref={hostRef} />
    </div>
  );
}

export default function FitBodyMap({ selected, onSelect, counts = {}, lang = "fr" }: Props) {
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

  const selectedLabel = selected === "Tous"
    ? (key === "en" ? "All muscle groups" : key === "es" ? "Todos los grupos" : "Tous les groupes")
    : FIT_MUSCLE_LABELS[selected][key];
  const selectedCount = selected === "Tous"
    ? Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)
    : Number(counts[selected] || 0);

  const frontLabel = key === "en" ? "FRONT" : key === "es" ? "FRENTE" : "FACE";
  const backLabel = key === "en" ? "BACK" : key === "es" ? "ESPALDA" : "DOS";

  return (
    <div className="fit-body-muscles-map" style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(11,14,24,.98),rgba(7,10,18,.94))", boxShadow: "0 18px 44px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.04)", overflow: "hidden" }}>
      <style>{`
        @keyframes fitBodyMusclePulse {
          0%,100% { stroke-opacity:1; filter:drop-shadow(0 0 3px rgba(255,61,98,.66)) drop-shadow(0 0 9px rgba(255,61,98,.32)); }
          50% { stroke-opacity:.28; filter:drop-shadow(0 0 6px rgba(255,61,98,.95)) drop-shadow(0 0 15px rgba(255,61,98,.56)); }
        }
        .fit-body-muscles-host {
          position:relative;
          height:360px;
          min-width:0;
          border-radius:20px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.055);
          background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.045),rgba(255,255,255,.012) 58%,rgba(0,0,0,.10));
        }
        .fit-body-muscles-host .body-chart-container {
          box-sizing:border-box !important;
          padding:5px 2px !important;
          width:100% !important;
          height:100% !important;
        }
        .fit-body-muscles-host .body-chart-svg {
          display:block !important;
          width:100% !important;
          height:100% !important;
          max-width:none !important;
          max-height:100% !important;
          filter:none !important;
          overflow:visible !important;
        }
        .fit-body-muscles-host .body-chart-background {
          opacity:.12 !important;
        }
        .fit-body-muscles-host .body-chart-muscle {
          fill:#d8dbe2 !important;
          fill-opacity:.90 !important;
          stroke:#686c76 !important;
          stroke-width:.13 !important;
          filter:none !important;
          transition:fill .15s ease,stroke .15s ease,filter .15s ease,opacity .15s ease !important;
        }
        .fit-body-muscles-host .body-chart-muscle:hover:not([stroke="#ffffff"]) {
          fill:#eef0f4 !important;
          stroke:#9297a2 !important;
        }
        .fit-body-muscles-host .body-chart-muscle[stroke="#ffffff"] {
          fill:#ff3d62 !important;
          fill-opacity:1 !important;
          stroke:#ffffff !important;
          stroke-width:.32 !important;
          animation:fitBodyMusclePulse 1.05s ease-in-out infinite !important;
        }
        @media (max-width:560px) {
          .fit-body-muscles-host { height:300px; }
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "14px 15px 11px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 7.5, fontWeight: 1000, letterSpacing: 1, opacity: .52 }}>{key === "en" ? "TARGET AREA" : key === "es" ? "ZONA OBJETIVO" : "ZONE CIBLÉE"}</div>
          <div style={{ marginTop: 5, fontSize: 18, fontWeight: 1000, letterSpacing: -.35 }}>{selectedLabel}</div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,.62)", fontSize: 8.2 }}>
            {key === "en" ? "Tap an anatomical region. Symmetric work zones are selected together." : key === "es" ? "Toca una zona anatómica. Las zonas simétricas se seleccionan juntas." : "Touchez une zone anatomique. Les zones de travail symétriques sont sélectionnées ensemble."}
          </div>
        </div>
        <div style={{ minWidth: 62, minHeight: 46, padding: "0 10px", borderRadius: 16, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03))" }}>
          <div style={{ fontSize: 18, fontWeight: 1000 }}>{selected === "Tous" ? "∞" : selectedCount}</div>
          <div style={{ marginTop: 2, fontSize: 6.6, opacity: .5, fontWeight: 1000, letterSpacing: .8 }}>{key === "en" ? "EXERCISES" : key === "es" ? "EJERCICIOS" : "EXERCICES"}</div>
        </div>
      </div>

      {loadState === "ready" && module ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, padding: "0 10px 11px" }}>
          <BodyMusclesPanel view="FRONT" label={frontLabel} selected={selected} onSelect={onSelect} module={module} />
          <BodyMusclesPanel view="BACK" label={backLabel} selected={selected} onSelect={onSelect} module={module} />
        </div>
      ) : (
        <div style={{ margin: "0 10px 11px", minHeight: 320, borderRadius: 20, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.018)", display: "grid", placeItems: "center", padding: 18, textAlign: "center" }}>
          {loadState === "loading" ? (
            <div><div style={{ fontSize: 22 }}>◌</div><div style={{ marginTop: 8, fontSize: 9, fontWeight: 1000 }}>{key === "en" ? "Loading anatomical map…" : key === "es" ? "Cargando mapa anatómico…" : "Chargement de la carte anatomique…"}</div></div>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontWeight: 1000 }}>{key === "en" ? "Anatomical map unavailable" : key === "es" ? "Mapa anatómico no disponible" : "Carte anatomique indisponible"}</div>
              <div style={{ marginTop: 5, maxWidth: 300, color: "rgba(255,255,255,.52)", fontSize: 8 }}>{key === "en" ? "Check the connection and retry." : key === "es" ? "Comprueba la conexión y vuelve a intentarlo." : "Vérifie la connexion puis relance le chargement."}</div>
              <button type="button" onClick={() => setRetryKey((value) => value + 1)} style={{ marginTop: 10, minHeight: 34, padding: "0 13px", borderRadius: 11, border: "1px solid rgba(255,61,98,.42)", background: "rgba(255,61,98,.09)", color: "#ff6b86", fontSize: 8, fontWeight: 1000, cursor: "pointer" }}>{key === "en" ? "RETRY" : key === "es" ? "REINTENTAR" : "RÉESSAYER"}</button>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "0 12px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,.42)", fontSize: 6.8, fontWeight: 800 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#d8dbe2", border: "1px solid #6f7480" }} />
        {key === "en" ? "AVAILABLE" : key === "es" ? "DISPONIBLE" : "DISPONIBLE"}
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ff3d62", border: "1px solid #fff", boxShadow: "0 0 8px rgba(255,61,98,.55)", marginLeft: 6 }} />
        {key === "en" ? "SELECTED" : key === "es" ? "SELECCIONADO" : "SÉLECTIONNÉ"}
        <span style={{ marginLeft: 8, opacity: .62 }}>Body Muscles · Apache 2.0</span>
      </div>
    </div>
  );
}
