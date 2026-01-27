import React from "react";

// =============================================================
// src/components/training/TrainingModeLeaderboardCard.tsx
// Version COMPLETE (shim UI) pour éviter les imports cassés
// Utilisé par StatsTrainingModesLocal
// =============================================================

type AnyProps = any;

export default function TrainingModeLeaderboardCard(props: AnyProps) {
  const {
    title,
    label,
    subtitle,
    description,
    kpis,
    rows,
    onClick,
    disabled,
    style,
    badge,
  } = props ?? {};

  const heading = title ?? label ?? "Mode";
  const sub = subtitle ?? description ?? "";

  const card: React.CSSProperties = {
    borderRadius: 16,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "0 0 18px rgba(255,255,255,0.06)",
    cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const kpiWrap: React.CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 10,
  };

  const chip: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const table: React.CSSProperties = {
    width: "100%",
    marginTop: 10,
    borderCollapse: "collapse",
    fontSize: 12,
    opacity: 0.92,
  };

  const thtd: React.CSSProperties = {
    padding: "6px 4px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    textAlign: "left",
    verticalAlign: "top",
  };

  return (
    <div style={card} onClick={disabled ? undefined : onClick}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>{String(heading)}</div>
        {badge ? (
          <div style={{ ...chip, borderColor: "rgba(255,255,255,0.22)" }}>{String(badge)}</div>
        ) : null}
      </div>

      {sub ? <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>{String(sub)}</div> : null}

      {Array.isArray(kpis) && kpis.length ? (
        <div style={kpiWrap}>
          {kpis.map((k: any, idx: number) => (
            <div key={idx} style={chip} title={k?.hint ?? ""}>
              <strong style={{ marginRight: 6 }}>{String(k?.label ?? "KPI")}</strong>
              <span>{String(k?.value ?? "")}</span>
            </div>
          ))}
        </div>
      ) : null}

      {Array.isArray(rows) && rows.length ? (
        <table style={table}>
          <thead>
            <tr>
              <th style={thtd}>#</th>
              <th style={thtd}>Nom</th>
              <th style={thtd}>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((r: any, idx: number) => (
              <tr key={idx}>
                <td style={thtd}>{idx + 1}</td>
                <td style={thtd}>{String(r?.name ?? r?.playerName ?? r?.label ?? "")}</td>
                <td style={thtd}>{String(r?.score ?? r?.value ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
