import React from "react";
import { OUTDOOR_PERFORMANCE_SPORTS, outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import { RunningGlyph, type RunningGlyphName } from "./RunningUi";

function sportGlyph(sport: OutdoorPerformanceSport): RunningGlyphName {
  switch (sport) {
    case "running":
      return "sport-running";
    case "trail":
      return "sport-trail";
    case "hiking":
      return "sport-hiking";
    case "walking":
      return "sport-walking";
    case "nordic-walking":
      return "sport-nordic";
    case "treadmill":
      return "sport-treadmill";
    default:
      return "sport-running";
  }
}

export default function OutdoorActivitySelector({ value, onChange, lang, accent, compact = false }: {
  value: OutdoorPerformanceSport;
  onChange: (sport: OutdoorPerformanceSport) => void;
  lang: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto", scrollbarWidth: "none", margin: compact ? "4px 0 8px" : "8px 0 12px" }}>
      <div style={{ display: "flex", gap: 6, minWidth: "max-content", padding: 2 }}>
        {OUTDOOR_PERFORMANCE_SPORTS.map((sport) => {
          const active = sport === value;
          const label = outdoorSportLabel(sport, lang).toUpperCase();
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onChange(sport)}
              style={{
                minHeight: compact ? 36 : 40,
                minWidth: active ? undefined : 40,
                padding: active ? (compact ? "5px 10px" : "6px 12px") : 0,
                width: active ? "auto" : (compact ? 36 : 40),
                borderRadius: 13,
                border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,.08)"}`,
                background: active ? `linear-gradient(145deg,${accent}20,rgba(5,7,12,.90))` : "rgba(255,255,255,.025)",
                color: active ? accent : "rgba(255,255,255,.67)",
                boxShadow: active ? `0 9px 20px ${accent}10,inset 0 1px 0 ${accent}18` : "inset 0 1px 0 rgba(255,255,255,.025)",
                cursor: "pointer",
                font: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: active ? 7 : 0,
                whiteSpace: "nowrap",
                fontSize: compact ? 8.3 : 9,
                fontWeight: 1000,
                flexShrink: 0,
              }}
            >
              <span style={{ width: compact ? 18 : 20, height: compact ? 18 : 20, display: "grid", placeItems: "center" }}>
                <RunningGlyph name={sportGlyph(sport)} size={compact ? 16 : 18} />
              </span>
              {active ? <span>{label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
