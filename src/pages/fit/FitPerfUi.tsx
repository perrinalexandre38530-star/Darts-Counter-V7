import React from "react";

export const FIT_PAGE_MAX = 520;

export type FitIconName =
  | "home" | "today" | "progress" | "records" | "goals"
  | "workout" | "program" | "live" | "history" | "library"
  | "muscles" | "favorite" | "guide" | "search" | "settings"
  | "timer" | "volume" | "strength" | "profile" | "coach" | "plus"
  | "chevron" | "info" | "filter";

export function FitIcon({ name, size = 21 }: { name: FitIconName; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (name) {
    case "home": return <svg {...common}><path {...p} d="M3 11.5 12 4l9 7.5"/><path {...p} d="M5.5 10.5V20h13v-9.5M9.5 20v-5h5v5"/></svg>;
    case "today": return <svg {...common}><path {...p} d="M5 4v3M19 4v3M3.5 8.5h17v11h-17z"/><path {...p} d="M7 12h4M7 16h7"/></svg>;
    case "progress": return <svg {...common}><path {...p} d="M4 18V9M10 18V5M16 18v-7M22 18V3"/><path {...p} d="m3 15 7-5 6 2 6-7"/></svg>;
    case "records": return <svg {...common}><path {...p} d="M8 4h8v4a4 4 0 0 1-8 0z"/><path {...p} d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 20h8M9 17h6"/></svg>;
    case "goals": return <svg {...common}><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="4"/><path {...p} d="m12 12 6-6M17 6h3v3"/></svg>;
    case "workout": return <svg {...common}><path {...p} d="M7 9v6M17 9v6M4 7v10M20 7v10M7 12h10"/></svg>;
    case "program": return <svg {...common}><path {...p} d="M6 3v3M18 3v3M4 8h16v12H4z"/><path {...p} d="M8 12h3M8 16h7"/></svg>;
    case "live": return <svg {...common}><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M5.5 7.5a7 7 0 0 0 0 9M18.5 7.5a7 7 0 0 1 0 9"/></svg>;
    case "history": return <svg {...common}><path {...p} d="M4 12a8 8 0 1 0 2-5.3L4 9"/><path {...p} d="M4 4v5h5M12 8v5l3 2"/></svg>;
    case "library": return <svg {...common}><path {...p} d="M5 4h5v16H5zM14 4h5v16h-5z"/><path {...p} d="M7.5 8h0M16.5 8h0"/></svg>;
    case "muscles": return <svg {...common}><path {...p} d="M5 14c1.5-3 3.5-4 6-3l2-4 3 1 1 5c2 1 3 2.5 3 5H8c-2 0-3-1.5-3-4Z"/><path {...p} d="M10 11c0 3 2 5 5 5"/></svg>;
    case "favorite": return <svg {...common}><path {...p} d="m12 4 2.5 5 5.5.8-4 3.8.9 5.4-4.9-2.6L7.1 19l.9-5.4-4-3.8L9.5 9z"/></svg>;
    case "guide": return <svg {...common}><path {...p} d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z"/></svg>;
    case "search": return <svg {...common}><circle {...p} cx="10.5" cy="10.5" r="6"/><path {...p} d="m15 15 5 5"/></svg>;
    case "settings": return <svg {...common}><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>;
    case "timer": return <svg {...common}><circle {...p} cx="12" cy="13" r="7"/><path {...p} d="M9 2h6M12 6V2M12 13l3-2"/></svg>;
    case "volume": return <svg {...common}><path {...p} d="M5 18V8M10 18V4M15 18v-7M20 18V6"/></svg>;
    case "strength": return <svg {...common}><path {...p} d="M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10"/></svg>;
    case "profile": return <svg {...common}><circle {...p} cx="12" cy="8" r="4"/><path {...p} d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
    case "coach": return <svg {...common}><circle {...p} cx="12" cy="7" r="3"/><path {...p} d="M7 21v-5a5 5 0 0 1 10 0v5M5 13l3-2M19 13l-3-2"/></svg>;
    case "plus": return <svg {...common}><path {...p} d="M12 5v14M5 12h14"/></svg>;
    case "chevron": return <svg {...common}><path {...p} d="m9 6 6 6-6 6"/></svg>;
    case "info": return <svg {...common}><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 10v6M12 7h.01"/></svg>;
    case "filter": return <svg {...common}><path {...p} d="M4 6h16M7 12h10M10 18h4"/><circle {...p} cx="8" cy="6" r="1.6"/><circle {...p} cx="15" cy="12" r="1.6"/><circle {...p} cx="12" cy="18" r="1.6"/></svg>;
    default: return null;
  }
}

export function FitShell({ children }: { children: React.ReactNode }) {
  return <div style={{ width: "100%", maxWidth: FIT_PAGE_MAX, margin: "0 auto", padding: "11px 10px 104px", boxSizing: "border-box" }}>{children}</div>;
}

export function FitPageHeader({ title, eyebrow, accent = "#f6c256", children }: { title: string; eyebrow?: string; accent?: string; children?: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 20, padding: "12px 14px", marginBottom: 10, background: "linear-gradient(135deg,rgba(8,10,20,.97),rgba(14,18,34,.96))", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 12px 28px rgba(0,0,0,.45)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, flex: "0 0 40px", borderRadius: 13, display: "grid", placeItems: "center", color: accent, border: `1px solid ${accent}46`, background: `${accent}10` }}><FitIcon name="strength" size={21}/></div>
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <div style={{ color: accent, fontSize: 8, fontWeight: 950, letterSpacing: 1.15, textTransform: "uppercase" }}>{eyebrow}</div> : null}
          <div style={{ marginTop: eyebrow ? 2 : 0, fontSize: 20, lineHeight: 1, fontWeight: 1000, letterSpacing: -.55, textTransform: "uppercase" }}>{title}</div>
        </div>
      </div>
      {children ? <div style={{ marginTop: 8 }}>{children}</div> : null}
    </div>
  );
}

export function FitIconTabs<T extends string>({ items, value, onChange, accent = "#f6c256" }: { items: { id: T; label: string; icon: FitIconName; badge?: string | number }[]; value: T; onChange: (id: T) => void; accent?: string }) {
  return (
    <div className="fit-icon-tabs" role="tablist" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: "4px", margin: "0 0 9px", borderRadius: 17, border: "1px solid rgba(255,255,255,.06)", background: "rgba(3,5,10,.48)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.025)" }}>
      {items.map((item) => {
        const active = item.id === value;
        return <button key={item.id} role="tab" aria-selected={active} aria-label={item.label} title={item.label} type="button" onClick={() => onChange(item.id)} style={{ flex: active ? "0 0 auto" : "0 0 42px", width: active ? "auto" : 42, minWidth: active ? 88 : 42, height: 42, borderRadius: 13, border: `1px solid ${active ? accent + "68" : "transparent"}`, background: active ? `linear-gradient(135deg,${accent}1c,rgba(255,255,255,.055))` : "transparent", color: active ? accent : "rgba(255,255,255,.58)", boxShadow: active ? `0 0 16px ${accent}16, inset 0 0 0 1px ${accent}0d` : "none", cursor: "pointer", padding: active ? "0 12px" : 0, display: "flex", alignItems: "center", justifyContent: "center", gap: active ? 8 : 0, position: "relative", transition: "width .18s ease,min-width .18s ease,padding .18s ease,background .18s ease,color .18s ease,border-color .18s ease" }}>
          <span style={{ display: "grid", placeItems: "center", flex: "0 0 auto" }}><FitIcon name={item.icon} size={20}/></span>
          {active ? <span style={{ fontSize: 8.7, fontWeight: 1000, letterSpacing: .55, textTransform: "uppercase", whiteSpace: "nowrap", animation: "fitTabLabelIn .18s ease both" }}>{item.label}</span> : null}
          {item.badge != null ? <span style={{ position: "absolute", right: active ? 4 : -2, top: -3, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, display: "grid", placeItems: "center", background: accent, color: "#08090c", fontSize: 7, fontWeight: 1000, boxShadow: "0 2px 8px rgba(0,0,0,.35)" }}>{item.badge}</span> : null}
        </button>;
      })}
    </div>
  );
}

export function FitSectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, margin: "14px 2px 8px" }}><div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}>{eyebrow ? <span style={{ flex: "0 0 auto", padding: "3px 6px", borderRadius: 999, background: "rgba(255,255,255,.045)", color: "rgba(255,255,255,.5)", fontSize: 7.2, fontWeight: 1000, letterSpacing: .8, textTransform: "uppercase" }}>{eyebrow}</span> : null}<div style={{ minWidth: 0, fontSize: 14.5, lineHeight: 1.1, fontWeight: 1000, letterSpacing: -.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div></div>{right}</div>;
}

export function FitGlassCard({ children, accent = "#f6c256", style, onClick }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div onClick={onClick} style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.065)", background: "linear-gradient(145deg,rgba(255,255,255,.038),rgba(255,255,255,.014))", boxShadow: `0 10px 24px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.025), 0 0 16px ${accent}08`, ...style }}>{children}</div>;
}

export function FitPill({ children, accent = "#f6c256", muted = false }: { children: React.ReactNode; accent?: string; muted?: boolean }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 22, padding: "0 8px", borderRadius: 999, border: `1px solid ${muted ? "rgba(255,255,255,.07)" : accent + "42"}`, background: muted ? "rgba(255,255,255,.035)" : `${accent}10`, color: muted ? "inherit" : accent, fontSize: 8.5, fontWeight: 950, letterSpacing: .55, whiteSpace: "nowrap" }}>{children}</span>;
}

export function FitPrimaryButton({ children, accent = "#f6c256", onClick, disabled = false, style }: { children: React.ReactNode; accent?: string; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minHeight: 44, borderRadius: 13, padding: "0 14px", border: `1px solid ${accent}72`, background: disabled ? "rgba(255,255,255,.06)" : `linear-gradient(135deg,${accent},#fff4ba 54%,${accent})`, color: disabled ? "rgba(255,255,255,.38)" : "#08090b", fontWeight: 1000, letterSpacing: .3, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : `0 9px 22px ${accent}18`, ...style }}>{children}</button>;
}

export function FitGhostButton({ children, onClick, accent = "#f6c256", style }: { children: React.ReactNode; onClick?: () => void; accent?: string; style?: React.CSSProperties }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 38, borderRadius: 12, padding: "0 12px", border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.032)", color: "inherit", fontWeight: 900, cursor: "pointer", boxShadow: `inset 0 0 0 1px ${accent}06`, ...style }}>{children}</button>;
}

export function FitMetric({ label, value, sub, accent = "#f6c256" }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return <div style={{ minWidth: 0, padding: "10px", borderRadius: 13, border: "1px solid rgba(255,255,255,.055)", background: "rgba(255,255,255,.025)" }}><div style={{ fontSize: 8, fontWeight: 950, letterSpacing: .9, opacity: .52, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color: accent, fontSize: 16, lineHeight: 1, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>{sub ? <div style={{ marginTop: 4, opacity: .44, fontSize: 7.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}</div>;
}

export function FitProgress({ value, accent = "#f6c256", height = 7 }: { value: number; accent?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return <div style={{ height, width: "100%", borderRadius: 99, background: "rgba(255,255,255,.055)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${accent},#fff2a7)`, boxShadow: `0 0 10px ${accent}40`, transition: "width .25s ease" }}/></div>;
}

export function FitRing({ value, label, accent = "#f6c256", size = 86 }: { value: number; label: string; accent?: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return <div style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 999, background: `conic-gradient(${accent} ${pct * 3.6}deg, rgba(255,255,255,.07) 0)`, padding: 6, boxSizing: "border-box", boxShadow: `0 0 18px ${accent}12` }}><div style={{ width: "100%", height: "100%", borderRadius: 999, display: "grid", placeItems: "center", textAlign: "center", background: "radial-gradient(circle at 50% 38%,rgba(255,255,255,.06),#090b10 68%)", border: "1px solid rgba(255,255,255,.05)" }}><div><div style={{ color: accent, fontWeight: 1000, fontSize: Math.round(size * .24), lineHeight: 1 }}>{Math.round(pct)}</div><div style={{ marginTop: 3, fontSize: Math.max(6, Math.round(size * .073)), fontWeight: 950, letterSpacing: .65, opacity: .46 }}>{label}</div></div></div></div>;
}

export function FitMiniBars({ values, accent = "#f6c256", height = 70 }: { values: number[]; accent?: string; height?: number }) {
  const max = Math.max(1, ...values);
  return <div style={{ height, display: "flex", alignItems: "flex-end", gap: 5 }}>{values.map((value, index) => <div key={index} style={{ flex: 1, minWidth: 5, height: `${Math.max(6, (Math.max(0, value) / max) * 100)}%`, borderRadius: "5px 5px 2px 2px", background: `linear-gradient(180deg,#fff4b7,${accent})`, boxShadow: `0 0 8px ${accent}18`, opacity: .9 }} />)}</div>;
}

export function FitHeroMark({ accent = "#f6c256", size = 84 }: { accent?: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: 20, display: "grid", placeItems: "center", background: `radial-gradient(circle at 50% 35%,${accent}24,rgba(255,255,255,.02) 55%,rgba(0,0,0,.1))`, border: `1px solid ${accent}30`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.06),0 0 22px ${accent}12` }}><FitIcon name="strength" size={Math.round(size * .56)}/></div>;
}

export const fitUiCss = `
@keyframes fitTitlePulse{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.018);filter:brightness(1.12)}}
@keyframes fitTitleShimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes fitSoftFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes fitTabLabelIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}
.fit-icon-tabs::-webkit-scrollbar{display:none}
`;
