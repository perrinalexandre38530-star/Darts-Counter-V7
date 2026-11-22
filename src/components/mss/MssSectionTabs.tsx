import React from "react";
import { BottomNavIcon } from "../BottomNav";
import "../../styles/mss-ui-contract.css";

type IconName = React.ComponentProps<typeof BottomNavIcon>["name"];
export type MssSectionTab<K extends string> = { id: K; label: string; icon: IconName; disabled?: boolean };

/** MSS BottomNav-style local view switcher. One visible panel per selection. */
export function MssSectionTabs<K extends string>({
  tabs, active, onChange, ariaLabel,
}: {
  tabs: readonly MssSectionTab<K>[];
  active: K;
  onChange: (id: K) => void;
  ariaLabel: string;
}) {
  return <nav className="mss-ui-tabbar" role="tablist" aria-label={ariaLabel}>
    {tabs.map((tab) => <button
      key={tab.id}
      type="button"
      role="tab"
      disabled={tab.disabled}
      aria-selected={active === tab.id}
      aria-label={tab.label}
      title={tab.label}
      onClick={() => onChange(tab.id)}
    >
      <BottomNavIcon name={tab.icon} size={21} />
      <span className="mss-ui-tabbar__label">{tab.label}</span>
    </button>)}
  </nav>;
}
