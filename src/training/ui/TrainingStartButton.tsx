import React from "react";

export default function TrainingStartButton({
  label,
  onClick,
  disabled = false,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        minHeight: 50,
        marginTop: 14,
        borderRadius: 999,
        border: disabled
          ? "1px solid rgba(255,255,255,.12)"
          : "1px solid rgba(39,220,255,.62)",
        background: disabled
          ? "rgba(255,255,255,.06)"
          : "linear-gradient(180deg,#39e4ff,#09afd9)",
        color: disabled ? "rgba(255,255,255,.38)" : "#001018",
        fontWeight: 950,
        fontSize: 15,
        letterSpacing: 0.5,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 10px 26px rgba(39,220,255,.22)",
      }}
    >
      {label ?? "LANCER LA SESSION"}
    </button>
  );
}
