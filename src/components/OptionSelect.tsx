import React from "react";

type Primitive = string | number;

export default function OptionSelect(props: {
  value: any;
  options: any[];
  onChange: (v: any) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { value, options, onChange, disabled, compact = false } = props;

  const norm = (opt: any) => {
    if (opt && typeof opt === "object" && "value" in opt) return { value: opt.value, label: opt.label ?? String(opt.value) };
    return { value: opt as Primitive, label: String(opt) };
  };

  const normalized = options.map(norm);

  return (
    <select
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        // If current value is a number, coerce to number
        const next = typeof value === "number" ? Number(raw) : raw;
        onChange(next);
      }}
      disabled={disabled}
      style={{
        borderRadius: compact ? 10 : 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        color: "#fff",
        padding: compact ? "7px 9px" : "10px 12px",
        fontWeight: 900,
        fontSize: compact ? 11 : undefined,
        outline: "none",
        minWidth: compact ? 92 : 120,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {normalized.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
