import React from "react";

/** MSS CONFIG PREMIUM — composants transversaux de présentation (aucune logique métier). */
export function MssConfigCaption({ children, accent = "#f7c85c" }: { children: React.ReactNode; accent?: string }) {
  return <div style={{ fontWeight: 950, fontSize: 11, letterSpacing: .9, color: accent, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

export function MssConfigFact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, borderBottom: "1px solid rgba(255,255,255,.065)", padding: "7px 0" }}>
    <span style={{ color: "#abb3ca", fontWeight: 750, fontSize: 11, minWidth: 0 }}>{label}</span>
    <span style={{ fontWeight: 900, fontSize: 11.5, color: "#f7f8fd", textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
  </div>;
}

export type MssInputIcon =
  | "keypad"
  | "visit_score"
  | "dartboard"
  | "presets"
  | "voice"
  | "camera"
  | "autodarts"
  | "external_device"
  | "phone"
  | "bridge"
  | "bluetooth"
  | "scolia"
  | "grandarts";

export function MssInputMethodIcon({ kind, size = 24 }: { kind: MssInputIcon; size?: number }) {
  const path = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    {kind === "keypad" ? <>{[5, 10, 15].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />))}</> : null}
    {kind === "visit_score" ? <><rect {...path} x="3" y="4" width="18" height="16" rx="3"/><path {...path} d="M6 9h12M6 15h12"/><text x="12" y="13.65" textAnchor="middle" fontSize="6.8" fontWeight="900" fill="currentColor" stroke="none">180</text></> : null}
    {kind === "presets" ? <><rect {...path} x="3" y="4" width="18" height="16" rx="3"/><path {...path} d="M7 8h3M7 12h3M7 16h3M14 8h3M14 12h3M14 16h3"/></> : null}
    {kind === "dartboard" ? <><circle {...path} cx="12" cy="12" r="9"/><circle {...path} cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path {...path} d="M12 3v5M12 16v5M3 12h5M16 12h5"/></> : null}
    {kind === "voice" ? <><rect {...path} x="9" y="3" width="6" height="12" rx="3"/><path {...path} d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"/></> : null}
    {kind === "camera" ? <><path {...path} d="M4 7h4l1.5-2h5L16 7h4v12H4z"/><circle {...path} cx="12" cy="13" r="3.5"/></> : null}
    {kind === "autodarts" ? <><path {...path} d="M4 17 17 4m-4 0h4v4M5 7a9 9 0 0 0 12 12M8 11a5 5 0 0 0 5 5"/><circle cx="18" cy="18" r="2" {...path}/></> : null}
    {kind === "external_device" ? <><rect {...path} x="4" y="8" width="8" height="8" rx="2.2"/><path {...path} d="M12 12h3"/><path {...path} d="M17 9v6"/><path {...path} d="M20 10v4"/><path {...path} d="M17 12h3"/></> : null}
    {kind === "phone" ? <><rect {...path} x="7" y="3" width="10" height="18" rx="2.5"/><path {...path} d="M10 6h4"/><circle cx="12" cy="17.3" r=".95" fill="currentColor" stroke="none"/></> : null}
    {kind === "bridge" ? <><circle {...path} cx="6" cy="16" r="2.5"/><circle {...path} cx="18" cy="16" r="2.5"/><path {...path} d="M6 13V9h12v4"/><path {...path} d="M12 9V5"/><path {...path} d="M9 5h6"/></> : null}
    {kind === "bluetooth" ? <><path {...path} d="M9 5l6 7-6 7V5Z"/><path {...path} d="m9 12 6-5M9 12l6 5"/></> : null}
    {kind === "scolia" ? <><circle {...path} cx="12" cy="12" r="8.2"/><circle {...path} cx="12" cy="12" r="3.6"/><path {...path} d="M12 3.8v2.6M20.2 12h-2.6M12 20.2v-2.6M3.8 12h2.6"/><path {...path} d="m15.8 8.2 2.7-2.7"/></> : null}
    {kind === "grandarts" ? <><rect {...path} x="5" y="4" width="14" height="16" rx="2.6"/><path {...path} d="M8 8h8M8 12h8M8 16h5"/><circle cx="16.5" cy="16" r="1" fill="currentColor" stroke="none"/></> : null}
  </svg>;
}

export function MssInputMethodChoice({ label, icon, active, disabled, accent, onClick }: {
  label: string; icon: MssInputIcon; active: boolean; disabled?: boolean; accent: string; onClick: () => void;
}) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}
    style={{ width: 54, height: 54, flex: "0 0 54px", display: "grid", placeItems: "center", background: active ? `${accent}18` : "rgba(255,255,255,.035)", borderRadius: 14, border: `1px solid ${active ? accent : `${accent}48`}`, color: accent, boxShadow: active ? `0 0 15px ${accent}30` : "none", opacity: disabled ? .35 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
    <MssInputMethodIcon kind={icon} size={27}/>
  </button>;
}
