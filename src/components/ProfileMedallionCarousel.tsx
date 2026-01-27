import React from "react";
import ProfileAvatar from "./ProfileAvatar";

export type MedallionItem = {
  id: string;
  name: string;
  /** Profile object consumed by <ProfileAvatar /> */
  profile: any;
};

export type ProfileMedallionCarouselProps = {
  items: MedallionItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;

  /** Theme colors (use the same values you pass in DepartementsConfig) */
  primary: string;
  primarySoft?: string;

  /** Optional: show assign/pending button like Territories teams flow */
  showAssign?: boolean;
  pendingId?: string | null;
  onTogglePending?: (id: string) => void;

  /** Optional: show/hide grayscale on inactive items (Territories style) */
  grayscaleInactive?: boolean;

  /** Optional: custom left padding (Territories uses 8) */
  padLeft?: number;
};

/**
 * EXACT same medallion carousel styling as DepartementsConfig.tsx.
 * - dc-scroll-thin
 * - 122px cards, 78px circular avatar
 * - glow on selected, grayscale/dim on unselected
 */
export default function ProfileMedallionCarousel(props: ProfileMedallionCarouselProps) {
  const {
    items,
    selectedIds,
    onToggle,
    primary,
    primarySoft = "rgba(125,255,202,0.16)",
    showAssign = false,
    pendingId = null,
    onTogglePending,
    grayscaleInactive = true,
    padLeft = 8,
  } = props;

  return (
    <div
      className="dc-scroll-thin"
      style={{
        display: "flex",
        gap: 18,
        overflowX: "auto",
        paddingBottom: 10,
        marginTop: 12,
        paddingLeft: padLeft,
      }}
    >
      {items.map((it) => {
        const active = selectedIds.includes(it.id);
        const isPending = pendingId === it.id;
        return (
          <div
            key={it.id}
            style={{
              minWidth: 122,
              maxWidth: 122,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            <div
              role="button"
              onClick={() => onToggle(it.id)}
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                overflow: "hidden",
                boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                outline: isPending ? `2px solid ${primary}` : "none",
                outlineOffset: 2,
                background: active
                  ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})`
                  : "#111320",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={active ? "Clique pour retirer" : "Clique pour ajouter"}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  filter: !active && grayscaleInactive ? "grayscale(100%) brightness(0.55)" : "none",
                  opacity: active ? 1 : grayscaleInactive ? 0.6 : 1,
                  transition: "filter .2s ease, opacity .2s ease",
                }}
              >
                <ProfileAvatar profile={it.profile as any} size={78} />
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textAlign: "center",
                color: active ? "#f6f2e9" : "#7e8299",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {it.name}
            </div>

            {showAssign && active && onTogglePending && (
              <button
                onClick={() => onTogglePending(it.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${primary}66`,
                  background: isPending ? primarySoft : "rgba(0,0,0,0.18)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: "pointer",
                }}
                title="Clique puis assigne dans TEAMS"
              >
                {isPending ? "En attente" : "Assigner"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
