import React from "react";

export type MssSelectorIcon = "players" | "profiles" | "bots" | "teams" | "manage" | "manual-team" | "saved-teams" | "shuffle" | "bot-teams" | "add-team" | "plus" | "random-order" | "alternate-order" | "manual-order" | "bull-order";

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
    players: <><circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20v-1.8A6.5 6.5 0 0 1 12 11.7a6.5 6.5 0 0 1 6.5 6.5V20"/></>,
    profiles: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5 17c0-2 1.6-3 4-3s4 1 4 3M15 9h4M15 13h4"/></>,
    bots: <><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 6V3M9 3h6"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 16h6M4 11H2M20 11h2"/></>,
    teams: <><circle cx="7" cy="8.5" r="2.4"/><circle cx="12" cy="6.4" r="2.8"/><circle cx="17" cy="8.5" r="2.4"/><path d="M2.5 19.5v-1a4.5 4.5 0 0 1 6.8-3.8"/><path d="M7.5 20v-1.7A5.4 5.4 0 0 1 12.9 12.9h.2a5.4 5.4 0 0 1 5.4 5.4V20"/><path d="M14.7 14.7a4.5 4.5 0 0 1 6.8 3.8v1"/></>,
    manage: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 9-5.2"/><circle cx="17" cy="17" r="4"/><path d="M17 14v6M14 17h6"/></>,
    "manual-team": <><circle cx="7" cy="8.5" r="2.4"/><circle cx="12" cy="6.4" r="2.8"/><circle cx="17" cy="8.5" r="2.4"/><path d="M2.5 19.5v-1a4.5 4.5 0 0 1 6.8-3.8"/><path d="M7.5 20v-1.7A5.4 5.4 0 0 1 12.9 12.9h.2a5.4 5.4 0 0 1 5.4 5.4V20"/><path d="M14.7 14.7a4.5 4.5 0 0 1 6.8 3.8v1"/></>,
    "saved-teams": <><path d="M12 2 3 6v5c0 5 4 9 9 11 5-2 9-6 9-11V6l-9-4z"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M5.5 17a4 4 0 0 1 7 0M11.5 17a4 4 0 0 1 7 0"/></>,
    shuffle: <><path d="M3 6h3c5 0 6 12 12 12h3M18 15l3 3-3 3M3 18h3c3 0 4-4 6-6M15 6h6M18 3l3 3-3 3"/></>,
    "bot-teams": <><rect x="2" y="7" width="11" height="12" rx="2"/><path d="M7.5 7V4M5 4h5M5 12h.5M9.5 12h.5M5 16h5"/><rect x="15" y="10" width="7" height="9" rx="2"/><path d="M18.5 10V7M17 14h.5M20 14h.5"/></>,
    plus: <><path d="M12 4v16M4 12h16"/></>,
    "add-team": <><circle cx="6.5" cy="8" r="2.5"/><circle cx="14" cy="8" r="2.5"/><path d="M1 20v-2a5 5 0 0 1 10 0v2M11 18a4 4 0 0 1 7-2"/><circle cx="19" cy="19" r="4"/><path d="M19 17v4M17 19h4"/></>,
    "random-order": <><path d="M4 7h3c4 0 5 10 10 10h3"/><path d="M17 14l3 3-3 3"/><path d="M4 17h3c2.5 0 3.8-3.5 5.5-5.5"/><path d="M15 7h5"/><path d="M17 4l3 3-3 3"/></>,
    "alternate-order": <><path d="M6 8h12"/><path d="M14 5l4 3-4 3"/><path d="M18 16H6"/><path d="M10 13l-4 3 4 3"/></>,
    "manual-order": <><path d="M5 18h14"/><path d="M12 6v9"/><path d="M8.5 9.5 12 6l3.5 3.5"/></>,
    "bull-order": <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2"/></>,
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
