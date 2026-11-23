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

export type MssInputIcon = "keypad" | "dartboard" | "voice" | "camera" | "autodarts";
export function MssInputMethodIcon({ kind, size = 24 }: { kind: MssInputIcon; size?: number }) {
  const path = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    {kind === "keypad" ? <>{[5, 10, 15].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />))}</> : null}
    {kind === "dartboard" ? <><circle {...path} cx="12" cy="12" r="9"/><circle {...path} cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path {...path} d="M12 3v5M12 16v5M3 12h5M16 12h5"/></> : null}
    {kind === "voice" ? <><rect {...path} x="9" y="3" width="6" height="12" rx="3"/><path {...path} d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"/></> : null}
    {kind === "camera" ? <><path {...path} d="M4 7h4l1.5-2h5L16 7h4v12H4z"/><circle {...path} cx="12" cy="13" r="3.5"/></> : null}
    {kind === "autodarts" ? <><path {...path} d="M4 17 17 4m-4 0h4v4M5 7a9 9 0 0 0 12 12M8 11a5 5 0 0 0 5 5"/><circle cx="18" cy="18" r="2" {...path}/></> : null}
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
