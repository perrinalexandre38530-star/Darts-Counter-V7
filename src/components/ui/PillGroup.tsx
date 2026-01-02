// src/components/ui/PillGroup.tsx
import React from "react";

type PillItem = { key: string; label: string; disabled?: boolean; rightIcon?: React.ReactNode };

export function PillGroup({
  items,
  value,
  onChange,
  accent = "#f5c84b",
}: {
  items: PillItem[];
  value: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            disabled={!!it.disabled}
            onClick={() => !it.disabled && onChange(it.key)}
            style={{
              appearance: "none",
              border: "1px solid rgba(255,255,255,0.10)",
              background: active ? `linear-gradient(180deg, ${accent} 0%, rgba(245,200,75,0.25) 100%)` : "rgba(0,0,0,0.25)",
              color: active ? "#141414" : "rgba(255,255,255,0.92)",
              padding: "7px 12px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 0.4,
              boxShadow: active
                ? `0 0 0 1px rgba(0,0,0,0.25), 0 8px 18px rgba(0,0,0,0.35), 0 0 22px rgba(245,200,75,0.35)`
                : "0 6px 14px rgba(0,0,0,0.25)",
              opacity: it.disabled ? 0.45 : 1,
              cursor: it.disabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{it.label}</span>
            {it.rightIcon}
          </button>
        );
      })}
    </div>
  );
}
