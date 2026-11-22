import React from "react";

export type MssSelectorIcon = "players" | "profiles" | "bots" | "teams" | "manage";

/** Barre de sélection MSS : iconographie sobre type BottomNav, sans texte visible. */
export default function MssSelectorIconButton({
  icon, label, onClick, accent = "#f6c44d", active = false, disabled = false,
}: {
  icon: MssSelectorIcon;
  label: string;
  onClick: () => void;
  accent?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const paths: Record<MssSelectorIcon, React.ReactNode> = {
    players: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 11a3 3 0 1 0-1.5-5.6M17 14a5 5 0 0 1 4 5v1"/></>,
    profiles: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5 17c0-2 1.6-3 4-3s4 1 4 3M15 9h4M15 13h4"/></>,
    bots: <><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 6V3M9 3h6"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 16h6M4 11H2M20 11h2"/></>,
    teams: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M12 20v-2a5 5 0 0 1 10 0v2"/></>,
    manage: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 9-5.2"/><circle cx="17" cy="17" r="4"/><path d="M17 14v6M14 17h6"/></>,
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      title={label} aria-pressed={active} data-mss-selector-icon={icon}
      style={{ width: 45, height: 43, minWidth: 45, borderRadius: 13,
        border: active ? `1px solid ${accent}` : `1px solid ${accent}55`,
        background: active ? `${accent}20` : "rgba(255,255,255,.035)",
        color: accent, display: "grid", placeItems: "center",
        boxShadow: active ? `0 0 12px ${accent}33` : "none",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .4 : 1,
        padding: 0, flex: "0 0 auto", WebkitTapHighlightColor: "transparent" }}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[icon]}</svg>
    </button>
  );
}
