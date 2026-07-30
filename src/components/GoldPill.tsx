import * as React from "react";

const TEXT = "#FFFFFF";
const EDGE = "rgba(255,255,255,.10)";

/**
 * Bouton visuel sans hook, séparé du Dashboard afin que le chunk X01 Multi
 * n'embarque pas le composant StatsPlayerDashboard et ses hooks React.
 */
export default function GoldPill({
  children,
  active = false,
  onClick,
  leftIcon,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${active ? "rgba(246,194,86,.9)" : EDGE}`,
    background: active ? "rgba(246,194,86,.10)" : "rgba(255,255,255,.02)",
    color: TEXT,
    boxShadow: active ? "inset 0 0 0 1px rgba(246,194,86,.25)" : "none",
    cursor: onClick ? "pointer" : "default",
    whiteSpace: "nowrap",
  };

  return (
    <button type="button" style={{ ...base, ...(style || {}) }} onClick={onClick}>
      {leftIcon ? <span style={{ display: "grid", placeItems: "center" }}>{leftIcon}</span> : null}
      <span style={{ fontWeight: 800 }}>{children}</span>
    </button>
  );
}
