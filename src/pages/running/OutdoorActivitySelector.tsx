import React from "react";
import { OUTDOOR_PERFORMANCE_SPORTS, OUTDOOR_SPORT_PROFILES, outdoorSportLabel, type OutdoorPerformanceSport } from "../../activity/outdoorPerformance";

export default function OutdoorActivitySelector({ value, onChange, lang, accent, compact = false }: {
  value: OutdoorPerformanceSport;
  onChange: (sport: OutdoorPerformanceSport) => void;
  lang: string;
  accent: string;
  compact?: boolean;
}) {
  return <div style={{ overflowX: "auto", scrollbarWidth: "none", margin: compact ? "4px 0 8px" : "8px 0 12px" }}>
    <div style={{ display: "flex", gap: 6, minWidth: "max-content", padding: 2 }}>
      {OUTDOOR_PERFORMANCE_SPORTS.map((sport) => {
        const profile = OUTDOOR_SPORT_PROFILES[sport];
        const active = sport === value;
        return <button key={sport} type="button" onClick={() => onChange(sport)} style={{ minHeight: compact ? 34 : 40, padding: compact ? "5px 9px" : "6px 11px", borderRadius: 13, border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,.08)"}`, background: active ? `linear-gradient(145deg,${accent}20,rgba(5,7,12,.90))` : "rgba(255,255,255,.025)", color: active ? accent : "rgba(255,255,255,.67)", boxShadow: active ? `0 9px 20px ${accent}10,inset 0 1px 0 ${accent}18` : "inset 0 1px 0 rgba(255,255,255,.025)", cursor: "pointer", font: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: compact ? 8.3 : 9, fontWeight: 1000 }}>
          <span style={{ fontSize: compact ? 13 : 15 }}>{profile.icon}</span><span>{outdoorSportLabel(sport, lang).toUpperCase()}</span>
        </button>;
      })}
    </div>
  </div>;
}
