import React from "react";
import type { OrganizationKind } from "../organizations/organizationService";

export type WorkspaceBadgeKind = OrganizationKind | "personal";

type Props = {
  kind: WorkspaceBadgeKind;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function IconPaths({ kind, strokeWidth }: { kind: WorkspaceBadgeKind; strokeWidth: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "personal":
      return <><circle {...common} cx="12" cy="8" r="3.2"/><path {...common} d="M5 20c.8-4 3.5-6 7-6s6.2 2 7 6"/></>;
    case "club":
      return <><path {...common} d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z"/><path {...common} d="M9 12h6M12 9v6"/></>;
    case "association":
      return <><circle {...common} cx="8" cy="9" r="2.3"/><circle {...common} cx="16" cy="9" r="2.3"/><path {...common} d="M4.5 18c.6-2.7 2.2-4.1 3.8-4.1 1.5 0 3.1 1.4 3.7 4.1M11.9 18c.6-2.7 2.1-4.1 3.7-4.1 1.6 0 3.2 1.4 3.9 4.1"/></>;
    case "company":
      return <><path {...common} d="M4 20h16"/><path {...common} d="M6 20V8l6-3v15"/><path {...common} d="M12 20V10l6-2v12"/><path {...common} d="M8.5 11.5h.01M8.5 15h.01M14.8 13h.01M14.8 16.4h.01"/></>;
    case "venue":
      return <><path {...common} d="M5 10h14"/><path {...common} d="M6 10V8.3C6 6.5 7.5 5 9.3 5h5.4C16.5 5 18 6.5 18 8.3V10"/><path {...common} d="M7 10v8h10v-8"/><path {...common} d="M9 14h6"/></>;
    case "school":
      return <><path {...common} d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z"/><path {...common} d="M6 10.5V16c0 1.3 2.7 2.5 6 2.5s6-1.2 6-2.5v-5.5"/></>;
    case "local_authority":
      return <><path {...common} d="M4 20h16"/><path {...common} d="M6 20v-7h12v7"/><path {...common} d="M4 13h16"/><path {...common} d="M12 5 4 9h16l-8-4Z"/><path {...common} d="M9 13v7M15 13v7"/></>;
    case "organizer":
      return <><rect {...common} x="4" y="6" width="16" height="14" rx="2.4"/><path {...common} d="M8 4v4M16 4v4M4 11h16"/><path {...common} d="m9 15 2 2 4-4"/></>;
    case "other":
    default:
      return <><path {...common} d="M8.4 4.8c1.2-.8 2.5-.8 3.6 0l1 .8 1.2-.2c1.5-.2 2.7.5 3.2 1.8l.4 1.1 1.1.5c1.4.6 2 1.8 1.8 3.2l-.2 1.2.8 1c.8 1.2.8 2.5 0 3.6l-.8 1 .2 1.2c.2 1.5-.5 2.7-1.8 3.2l-1.1.4-.5 1.1c-.6 1.4-1.8 2-3.2 1.8l-1.2-.2-1 .8c-1.2.8-2.5.8-3.6 0l-1-.8-1.2.2c-1.5.2-2.7-.5-3.2-1.8l-.4-1.1-1.1-.5c-1.4-.6-2-1.8-1.8-3.2l.2-1.2-.8-1c-.8-1.2-.8-2.5 0-3.6l.8-1-.2-1.2c-.2-1.5.5-2.7 1.8-3.2l1.1-.4.5-1.1c.6-1.4 1.8-2 3.2-1.8l1.2.2 1-.8Z"/><path {...common} d="M9.2 12h5.6M12 9.2v5.6"/></>;
  }
}

export default function OrganizationTypeIcon({ kind, size = 14, color = "currentColor", strokeWidth = 1.9 }: Props) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, display: "inline-grid", placeItems: "center", color, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="presentation" focusable="false">
        <IconPaths kind={kind} strokeWidth={strokeWidth} />
      </svg>
    </span>
  );
}
