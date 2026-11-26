import React from "react";

/** Voyant ON/OFF compact identique au contrôle des variantes de KillerConfig.
 * Composant de présentation : chaque écran conserve son état et son handler. */
export default function MssKillerBooleanToggle({
  label,
  checked,
  onChange,
  accent = "#f6c44d",
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) auto",
      alignItems: "center",
      gap: 8,
      minHeight: 38,
      padding: "3px 2px",
      borderBottom: "1px solid rgba(255,255,255,.045)",
      opacity: disabled ? .52 : 1,
    }}>
      <span style={{
        fontSize: 11.8,
        lineHeight: 1.15,
        color: "#f0f2ff",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: .35,
        minWidth: 0,
      }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        title={`${label} : ${checked ? "désactiver" : "activer"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          borderRadius: "50%",
          border: checked ? `1.6px solid ${accent}` : "1px solid rgba(255,102,136,.64)",
          background: checked ? "linear-gradient(180deg, rgba(255,220,120,.98), rgba(229,176,33,.94))" : "transparent",
          color: checked ? "#241300" : "rgba(255,122,154,.88)",
          fontSize: 15,
          fontWeight: 1000,
          lineHeight: 1,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          boxShadow: checked
            ? `0 0 0 1px ${accent}22, 0 0 8px ${accent}22`
            : "0 0 0 1px rgba(255,102,136,.08), 0 0 6px rgba(255,102,136,.12)",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: 0,
        }}
      >
        <span aria-hidden="true">{checked ? "✓" : ""}</span>
      </button>
    </div>
  );
}
