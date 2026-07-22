import React from "react";
import { useTheme } from "../contexts/ThemeContext";

function hexToRgba(hex: string, alpha: number) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(120,255,200,${alpha})`;
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function OptionToggle(props: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;
  const { theme } = useTheme();
  const primary = theme?.primary || "#78ffc8";

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
        border: `1px solid ${value ? hexToRgba(primary, 0.62) : "rgba(255,255,255,0.12)"}`,
        background: value ? hexToRgba(primary, 0.22) : "rgba(0,0,0,0.25)",
        boxShadow: value ? `0 0 14px ${hexToRgba(primary, 0.20)}` : "none",
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
          background: value ? primary : "rgba(255,255,255,0.75)",
          boxShadow: value ? `0 0 12px ${hexToRgba(primary, 0.55)}` : "0 10px 20px rgba(0,0,0,0.35)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}
