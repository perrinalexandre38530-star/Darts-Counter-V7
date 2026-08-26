import React from "react";

export const FIT_PAGE_MAX = 720;

export function FitShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", maxWidth: FIT_PAGE_MAX, margin: "0 auto", padding: "8px 12px 112px", boxSizing: "border-box" }}>
      {children}
    </div>
  );
}

export function FitSectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, margin: "18px 2px 10px" }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.8, opacity: .58, marginBottom: 3 }}>{eyebrow}</div> : null}
        <div style={{ fontSize: 18, lineHeight: 1.05, fontWeight: 950, letterSpacing: -.35 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

export function FitGlassCard({ children, accent = "#f6c256", style, onClick }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,.08)",
        background: "linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018))",
        boxShadow: "0 16px 42px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035)",
        backdropFilter: "blur(14px)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: "0 auto auto 0", height: 2, width: "100%", background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: .52 }} />
      <div style={{ position: "absolute", width: 130, height: 130, right: -72, top: -72, borderRadius: 999, background: accent, filter: "blur(56px)", opacity: .12, pointerEvents: "none" }} />
      {children}
    </div>
  );
}

export function FitPill({ children, accent = "#f6c256", muted = false }: { children: React.ReactNode; accent?: string; muted?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 9px", borderRadius: 999, border: `1px solid ${muted ? "rgba(255,255,255,.08)" : accent + "55"}`, background: muted ? "rgba(255,255,255,.045)" : `${accent}14`, color: muted ? "inherit" : accent, fontSize: 10, fontWeight: 900, letterSpacing: .65, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function FitPrimaryButton({ children, accent = "#f6c256", onClick, disabled = false, style }: { children: React.ReactNode; accent?: string; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 52,
        borderRadius: 16,
        border: `1px solid ${accent}66`,
        background: disabled ? "rgba(255,255,255,.05)" : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        color: disabled ? "rgba(255,255,255,.35)" : "#0a0b0d",
        fontWeight: 950,
        letterSpacing: .45,
        padding: "0 17px",
        boxShadow: disabled ? "none" : `0 10px 30px ${accent}26, inset 0 1px 0 rgba(255,255,255,.35)`,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function FitGhostButton({ children, onClick, accent = "#f6c256", style }: { children: React.ReactNode; onClick?: () => void; accent?: string; style?: React.CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={{ minHeight: 42, borderRadius: 13, padding: "0 13px", border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "inherit", fontWeight: 850, cursor: "pointer", boxShadow: `inset 0 0 0 1px ${accent}08`, ...style }}>
      {children}
    </button>
  );
}

export function FitMetric({ label, value, sub, accent = "#f6c256" }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div style={{ minWidth: 0, padding: "13px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.032)" }}>
      <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.15, opacity: .56, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: 22, lineHeight: 1, fontWeight: 950, letterSpacing: -.5, color: accent }}>{value}</div>
      {sub ? <div style={{ marginTop: 6, fontSize: 10.5, opacity: .6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}
    </div>
  );
}

export function FitProgress({ value, accent = "#f6c256", height = 7 }: { value: number; accent?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ height, width: "100%", borderRadius: 99, background: "rgba(255,255,255,.065)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${accent}aa, ${accent})`, transition: "width .25s ease", boxShadow: `0 0 14px ${accent}55` }} />
    </div>
  );
}

export function FitRing({ value, label, accent = "#f6c256", size = 86 }: { value: number; label: string; accent?: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 999, background: `conic-gradient(${accent} ${pct * 3.6}deg, rgba(255,255,255,.07) 0)`, padding: 7, boxSizing: "border-box", boxShadow: `0 0 24px ${accent}18` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 999, background: "#0c0f14", display: "grid", placeItems: "center", textAlign: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.055)" }}>
        <div><div style={{ fontSize: 20, lineHeight: 1, fontWeight: 950 }}>{Math.round(pct)}%</div><div style={{ marginTop: 4, fontSize: 8, opacity: .55, fontWeight: 900, letterSpacing: .7 }}>{label}</div></div>
      </div>
    </div>
  );
}

export function FitMiniBars({ values, accent = "#f6c256", height = 70 }: { values: number[]; accent?: string; height?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 6 }}>
      {values.map((value, index) => {
        const pct = Math.max(5, (value / max) * 100);
        return <div key={index} style={{ flex: 1, height: `${pct}%`, minWidth: 5, borderRadius: "6px 6px 2px 2px", background: `linear-gradient(180deg, ${accent}, ${accent}55)`, opacity: index === values.length - 1 ? 1 : .62, boxShadow: index === values.length - 1 ? `0 0 14px ${accent}33` : undefined }} />;
      })}
    </div>
  );
}

export function FitHeroMark({ accent = "#f6c256", size = 84 }: { accent?: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 22, display: "grid", placeItems: "center", background: `radial-gradient(circle at 50% 35%, ${accent}28, rgba(255,255,255,.025) 55%, rgba(0,0,0,.1))`, border: `1px solid ${accent}38`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), 0 0 26px ${accent}16` }}>
      <svg width={Math.round(size * .68)} height={Math.round(size * .68)} viewBox="0 0 64 64" fill="none">
        <rect x="16" y="28" width="32" height="8" rx="4" fill={accent}/>
        <rect x="10" y="22" width="6" height="20" rx="2" fill={accent}/>
        <rect x="4" y="18" width="6" height="28" rx="2" fill={accent}/>
        <rect x="48" y="22" width="6" height="20" rx="2" fill={accent}/>
        <rect x="54" y="18" width="6" height="28" rx="2" fill={accent}/>
      </svg>
    </div>
  );
}
