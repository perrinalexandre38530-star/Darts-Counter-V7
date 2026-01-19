import React from "react";

export default function OptionToggle(props: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      aria-pressed={value}
      disabled={disabled}
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: value ? "rgba(120,255,200,0.22)" : "rgba(0,0,0,0.25)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: value ? 26 : 3,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: value ? "rgba(120,255,200,0.85)" : "rgba(255,255,255,0.75)",
          boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}
