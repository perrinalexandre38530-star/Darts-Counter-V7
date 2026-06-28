import React from "react";
import ProfileAvatar from "./ProfileAvatar";

type Item = {
  id?: string;
  name?: string;
  subtitle?: string;
  logoDataUrl?: string | null;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  profile?: any;
};

export default function SelectionStickyBanner({
  title = "Sélection",
  items = [],
  accent = "#22e6ff",
  emptyLabel = "Aucune sélection",
  bottomOffset = 0,
}: {
  title?: string;
  items?: Item[];
  accent?: string;
  emptyLabel?: string;
  bottomOffset?: number;
}) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return null;
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 80,
        margin: "0 0 12px",
        padding: "9px 10px",
        borderRadius: 18,
        border: `1px solid ${accent}55`,
        background: "linear-gradient(180deg, rgba(8,12,22,.98), rgba(8,12,22,.88))",
        boxShadow: `0 12px 32px rgba(0,0,0,.55), 0 0 22px ${accent}22`,
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ color: accent, fontSize: 11, fontWeight: 950, letterSpacing: .9, textTransform: "uppercase", marginBottom: 7 }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: bottomOffset }}>
        {safeItems.length ? safeItems.map((item, idx) => {
          const logo = item.logoDataUrl || item.avatarDataUrl || item.avatarUrl || undefined;
          return (
            <div
              key={item.id || `${item.name || "item"}-${idx}`}
              style={{
                flex: "0 0 min(58vw, 210px)",
                minHeight: 78,
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 18,
                padding: 10,
                border: `1px solid ${accent}44`,
                background: "rgba(255,255,255,.045)",
                color: "#fff",
                minWidth: 0,
              }}
            >
              <ProfileAvatar profile={item.profile} name={item.name || "Sélection"} dataUrl={logo} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name || "Sélection"}</div>
                <div style={{ fontSize: 11, color: "#aab0ca", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subtitle || emptyLabel}</div>
              </div>
            </div>
          );
        }) : <div style={{ color: "#8f94b2", fontSize: 12 }}>{emptyLabel}</div>}
      </div>
    </div>
  );
}
