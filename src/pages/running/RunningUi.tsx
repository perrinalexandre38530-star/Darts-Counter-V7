import React from "react";

export type RunningTabItem<T extends string> = {
  id: T;
  label: string;
  icon?: string;
  badge?: string | number | null;
};

export function RunningTabs<T extends string>({
  items,
  value,
  onChange,
  accent,
  sticky = false,
}: {
  items: RunningTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: string;
  sticky?: boolean;
}) {
  return (
    <div
      style={{
        position: sticky ? "sticky" : "relative",
        top: sticky ? "calc(env(safe-area-inset-top, 0px) + 68px)" : undefined,
        zIndex: sticky ? 35 : undefined,
        margin: "8px 0 12px",
        padding: 5,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(7,9,14,.86)",
        boxShadow: "0 12px 30px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.035)",
        backdropFilter: "blur(16px)",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ display: "flex", gap: 5, minWidth: "max-content" }}>
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              style={{
                minHeight: 39,
                minWidth: 92,
                padding: "6px 11px",
                borderRadius: 12,
                border: `1px solid ${active ? `${accent}66` : "transparent"}`,
                background: active
                  ? `linear-gradient(145deg,${accent}20,${accent}08 58%,rgba(255,255,255,.025))`
                  : "transparent",
                color: active ? accent : "rgba(255,255,255,.62)",
                boxShadow: active ? `0 8px 18px ${accent}12, inset 0 1px 0 ${accent}18` : "none",
                cursor: "pointer",
                font: "inherit",
                fontSize: 9,
                fontWeight: 1000,
                letterSpacing: .25,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {item.icon ? <span style={{ fontSize: 13 }}>{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge != null ? (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    paddingInline: 5,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    color: active ? "#090b10" : "rgba(255,255,255,.72)",
                    background: active ? accent : "rgba(255,255,255,.09)",
                    fontSize: 7.5,
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RunningSurface({
  children,
  accent,
  style,
  active = false,
  padding = 14,
}: {
  children: React.ReactNode;
  accent: string;
  style?: React.CSSProperties;
  active?: boolean;
  padding?: number | string;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: `1px solid ${active ? `${accent}50` : "rgba(255,255,255,.085)"}`,
        background: `linear-gradient(145deg,${active ? `${accent}11` : "rgba(255,255,255,.032)"},rgba(5,7,12,.82) 56%,rgba(0,0,0,.38))`,
        boxShadow: active
          ? `0 18px 38px rgba(0,0,0,.42), 0 0 28px ${accent}0f, inset 0 1px 0 ${accent}18`
          : "0 16px 34px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.035)",
        padding,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 999,
          top: -76,
          right: -38,
          background: `radial-gradient(circle,${accent}18,transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          top: 0,
          height: 1,
          background: `linear-gradient(90deg,transparent,${accent}32,transparent)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export function RunningMetricCard({
  label,
  value,
  accent,
  icon,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
  icon?: string;
  sub?: React.ReactNode;
}) {
  return (
    <RunningSurface accent={accent} padding={11}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon ? (
          <span style={{ width: 29, height: 29, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}25`, fontSize: 14 }}>{icon}</span>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 7.8, opacity: .55, fontWeight: 1000, letterSpacing: .35 }}>{label}</div>
          <div style={{ marginTop: 3, color: accent, fontSize: 17, lineHeight: 1.1, fontWeight: 1000 }}>{value}</div>
          {sub ? <div style={{ marginTop: 3, fontSize: 7.5, opacity: .48 }}>{sub}</div> : null}
        </div>
      </div>
    </RunningSurface>
  );
}
