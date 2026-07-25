import React from "react";

export default function TrainingOptionCard({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const accent = "#27dcff";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        width: "100%",
        minHeight: 58,
        padding: "11px 13px",
        marginBottom: 8,
        borderRadius: 16,
        border: active
          ? "1px solid rgba(39,220,255,.70)"
          : "1px solid rgba(255,255,255,.13)",
        background: active
          ? "linear-gradient(135deg,rgba(8,55,74,.82),rgba(2,19,30,.90))"
          : "linear-gradient(135deg,rgba(9,18,27,.78),rgba(0,0,0,.52))",
        color: "#fff",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: active ? "0 0 20px rgba(39,220,255,.18)" : "none",
        display: "grid",
        gridTemplateColumns: "1fr 24px",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13.5,
            letterSpacing: 0.45,
            fontWeight: 950,
            color: active ? accent : "rgba(255,255,255,.93)",
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            style={{
              display: "block",
              marginTop: 3,
              fontSize: 11.5,
              lineHeight: 1.35,
              opacity: 0.72,
              fontWeight: 700,
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: active ? `5px solid ${accent}` : "2px solid rgba(255,255,255,.25)",
          boxSizing: "border-box",
          justifySelf: "end",
          boxShadow: active ? "0 0 12px rgba(39,220,255,.45)" : "none",
        }}
      />
    </button>
  );
}
