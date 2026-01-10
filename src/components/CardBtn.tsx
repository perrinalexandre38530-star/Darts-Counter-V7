// ============================================
// src/components/CardBtn.tsx
// Bouton "carte" réutilisable (menu style)
// ============================================

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
};

export default function CardBtn({
  title,
  subtitle,
  right,
  onClick,
  disabled,
  icon,
  style,
}: Props) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid rgba(255,255,255,.10)",
        background: disabled ? "rgba(30,30,30,.35)" : "rgba(25,25,25,.55)",
        borderRadius: 16,
        padding: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        color: "#fff",
        display: "grid",
        gridTemplateColumns: icon ? "28px 1fr auto" : "1fr auto",
        gap: 12,
        alignItems: "center",
        boxShadow: "0 10px 24px rgba(0,0,0,.25)",
        ...style,
      }}
    >
      {icon ? (
        <div style={{ width: 28, height: 28, display: "grid", placeItems: "center", opacity: disabled ? 0.5 : 0.9 }}>
          {icon}
        </div>
      ) : null}

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.6, fontSize: 14, textTransform: "uppercase" }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75, lineHeight: 1.25 }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: disabled ? 0.5 : 0.9 }}>
        {right}
        <span style={{ fontSize: 18, lineHeight: 1, opacity: 0.85 }}>›</span>
      </div>
    </button>
  );
}
