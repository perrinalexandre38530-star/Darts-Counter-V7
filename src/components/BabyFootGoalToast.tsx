import React from "react";

type Props = {
  show: boolean;
  text: string;
  subtext?: string;
  accent?: string;
  onDone?: () => void;
  durationMs?: number;
};

export default function BabyFootGoalToast({
  show,
  text,
  subtext,
  accent = "rgba(124,255,196,0.85)",
  onDone,
  durationMs = 1200,
}: Props) {
  React.useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [show, durationMs, onDone]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", left: 14, right: 14, top: 74, zIndex: 9999, pointerEvents: "none" }}>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(10,12,18,0.78)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          padding: "12px 14px",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 1, color: "#fff" }}>{text}</div>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: `0 0 14px ${accent}` }} />
        </div>
        {subtext ? (
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 900, opacity: 0.8, color: "#fff" }}>{subtext}</div>
        ) : null}
      </div>
    </div>
  );
}
