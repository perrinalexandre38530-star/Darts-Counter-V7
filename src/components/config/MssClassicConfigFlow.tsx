import React from "react";
import { MssGuidedConfigNav } from "./MssGuidedConfigNav";
import MssAwenaExplainButton from "../MssAwenaExplainButton";

/**
 * MSS CLASSIQUES · navigation de référence issue de KILLER/X01.
 * Presentation only. Each game owns its rules, participants and launch guards.
 */
export type ClassicConfigView = "guided" | "complete";
export function MssClassicConfigFlow({
  title, steps, step, view, accent, summary, onStep, onView, onHelp, progressiveSingleLine = false,
}: {
  title: string;
  steps: string[];
  step: number;
  view: ClassicConfigView;
  accent: string;
  summary?: string;
  onStep: (value: number) => void;
  onView: (value: ClassicConfigView) => void;
  onHelp: () => void;
  progressiveSingleLine?: boolean;
}) {
  const last = steps.length - 1;
  if (view === "guided") {
    return <MssGuidedConfigNav
      progressiveSingleLine={progressiveSingleLine}
      compactLikeKiller
      steps={steps} step={step} selectionSummary={summary} accent={accent}
      onStepChange={(value) => onStep(Math.max(0, Math.min(last, value)))}
      onPrev={() => onStep(Math.max(0, step - 1))}
      onNext={() => onStep(Math.min(last, step + 1))}
      onComplete={() => onView("complete")}
      onAwenaExplain={onHelp}
    />;
  }
  return <section aria-label={`Configuration complète ${title}`} style={{
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    flexWrap: "wrap", borderRadius: 18, border: `1px solid ${accent}55`,
    background: "rgba(9,12,24,.95)", padding: "13px 14px", marginBottom: 14,
  }}>
    <strong style={{ color: accent, textTransform: "uppercase", fontWeight: 950, fontSize: 13,
      letterSpacing: .65 }}>CONFIGURATION {title.toUpperCase()}</strong>
    <div style={{ display: "flex", gap: 7 }}>
      <button type="button" onClick={() => onView("guided")} style={{ ...switchStyle(accent, false) }}>Guidée</button>
      <button type="button" aria-pressed={true} style={{ ...switchStyle(accent, true) }}>Complète</button>
    </div>
  </section>;
}

function switchStyle(accent: string, active: boolean): React.CSSProperties {
  return {
    borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer",
    color: active ? accent : "#f1f3f8", border: `1px solid ${active ? accent : "#ffffff2d"}`,
    background: active ? `${accent}1e` : "#ffffff0a",
  };
}

export function MssClassicOverview({ title, description, accent, onHelp }: {
  title: string; description: string; accent: string; onHelp?: () => void;
}) {
  return <section style={{
    background: "rgba(9,12,24,.95)", padding: "15px 16px", borderRadius: 18,
    border: `1px solid ${accent}45`, marginBottom: 14,
  }}>
    <strong style={{ color: accent, fontSize: 14, fontWeight: 950, letterSpacing: .6 }}>{title.toUpperCase()}</strong>
    <p style={{ margin: "9px 0 0", color: "#abb7ce", lineHeight: 1.45, fontSize: 12 }}>{description}</p>
    {onHelp && <div style={{ marginTop: 13 }}><MssAwenaExplainButton onClick={onHelp} /></div>}
  </section>;
}

export function MssClassicRecap({ entries, accent, ready }: {
  entries: Array<[string, string | number]>;
  accent: string; ready: boolean;
}) {
  return <section style={{ border: `1px solid ${accent}55`, borderRadius: 18, background: "rgba(9,12,24,.95)",
    padding: 14, marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 9, marginBottom: 8 }}>
      <strong style={{ color: accent, fontSize: 14, fontWeight: 950 }}>RÉCAPITULATIF</strong>
      <span style={{ color: ready ? accent : "#ff8b8b", border: `1px solid ${ready ? accent : "#ff8b8b"}66`,
        borderRadius: 999, fontWeight: 900, fontSize: 11, padding: "4px 9px" }}>{ready ? "✓ PRÊT" : "À COMPLÉTER"}</span>
    </div>
    <div style={{ display: "grid", gap: 0 }}>
      {entries.map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
        padding: "10px 0", gap: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <span style={{ color: "#a4b0ce", fontSize: 12, fontWeight: 800 }}>{label}</span>
        <strong style={{ color: "#f4f5fb", fontSize: 12, textAlign: "right", overflowWrap: "anywhere" }}>{value}</strong>
      </div>)}
    </div>
  </section>;
}
