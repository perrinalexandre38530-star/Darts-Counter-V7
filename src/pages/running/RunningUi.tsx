import React from "react";

export type RunningGlyphName =
  | "sport-running"
  | "sport-trail"
  | "sport-hiking"
  | "sport-walking"
  | "sport-nordic"
  | "sport-treadmill"
  | "step-workout"
  | "step-route"
  | "step-ready"
  | "route-choose"
  | "route-guide"
  | "route-offline"
  | "gear"
  | "gps"
  | "voice"
  | "sensor"
  | "shoe"
  | "safety"
  | "goal"
  | "training"
  | "advanced"
  | "free"
  | "distance"
  | "time"
  | "pace"
  | "heart"
  | "footpod"
  | "health"
  | "native-gps"
  | "garmin"
  | "files";

export function RunningGlyph({ name, size = 18, stroke = 2.1 }: { name: RunningGlyphName; size?: number; stroke?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "sport-running":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="15.5" cy="4.8" r="2" />
          <path {...p} d="m13.8 8-3.2 3.3 2.6 2.5 3.5-1.2" />
          <path {...p} d="m10.7 11.3-4 .7" />
          <path {...p} d="m13.2 14-2.5 5" />
          <path {...p} d="m13.2 14 4.8 4" />
        </svg>
      );
    case "sport-trail":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M3 18 9 8l3.4 5 2.1-3.2L21 18" />
          <path {...p} d="M5 18h14" />
        </svg>
      );
    case "sport-hiking":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="4.7" r="1.8" />
          <path {...p} d="m11 8 1.8 3.3-1.1 3.4" />
          <path {...p} d="m12.8 11.3 2.8 2.2" />
          <path {...p} d="m9.8 20 1.3-5 2.4 2.2V20" />
          <path {...p} d="M7 12.2h3.1" />
          <path {...p} d="M17.6 7v13" />
        </svg>
      );
    case "sport-walking":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12.2" cy="4.5" r="1.8" />
          <path {...p} d="m11.5 8.2-1.4 4.2 2 1.8" />
          <path {...p} d="m10.1 12.4-2.8 2.2" />
          <path {...p} d="m12.1 14.2 3 2.3" />
          <path {...p} d="m12 14-1.1 6" />
          <path {...p} d="m14 16.3-.2 3.7" />
        </svg>
      );
    case "sport-nordic":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12.2" cy="4.5" r="1.8" />
          <path {...p} d="m11.5 8.2-1.4 4.2 2 1.8" />
          <path {...p} d="m10.1 12.4-2.8 2.2" />
          <path {...p} d="m12.1 14.2 3 2.3" />
          <path {...p} d="m12 14-1.1 6" />
          <path {...p} d="m14 16.3-.2 3.7" />
          <path {...p} d="M6.8 8.6 5.5 20" />
          <path {...p} d="M18.5 8.6 19.7 20" />
        </svg>
      );
    case "sport-treadmill":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 18h13.5" />
          <path {...p} d="M17.5 18 20 21" />
          <path {...p} d="M14.5 7.5h3v7" />
          <circle {...p} cx="10.8" cy="5.2" r="1.6" />
          <path {...p} d="m9.6 8.2-1.8 2.4 2.1 1.9 3-.9" />
          <path {...p} d="m10 12.5-1.8 4" />
          <path {...p} d="m12.2 12.7 3.4 3" />
        </svg>
      );
    case "step-workout":
      return <RunningGlyph name="sport-running" size={size} stroke={stroke} />;
    case "step-route":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M5 19c5-8 6-14 14-14" />
          <circle {...p} cx="5" cy="19" r="1.8" />
          <circle {...p} cx="19" cy="5" r="1.8" />
          <path {...p} d="m14 7 2.2 2.2" />
        </svg>
      );
    case "step-ready":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="m5 12.5 4 4L19 7" />
        </svg>
      );
    case "route-choose":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="7" cy="17" r="2" />
          <circle {...p} cx="17" cy="7" r="2" />
          <path {...p} d="M8.8 15.4c2.5-1.8 3.9-3.2 6.4-6.8" />
        </svg>
      );
    case "route-guide":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M5 12h12" />
          <path {...p} d="m13 6 6 6-6 6" />
        </svg>
      );
    case "route-offline":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M12 4v10" />
          <path {...p} d="m8 10 4 4 4-4" />
          <path {...p} d="M5 19h14" />
        </svg>
      );
    case "gear":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="m4 15 3.5-5 4 2.2 4.3.5 2.7 3.3V19H4.5Z" />
          <path {...p} d="M8.3 10.4 9.8 7" />
        </svg>
      );
    case "shoe":
      return <RunningGlyph name="gear" size={size} stroke={stroke} />;
    case "gps":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M12 21s5-5.2 5-10a5 5 0 1 0-10 0c0 4.8 5 10 5 10Z" />
          <circle {...p} cx="12" cy="11" r="1.8" />
        </svg>
      );
    case "voice":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect {...p} x="9" y="4" width="6" height="10" rx="3" />
          <path {...p} d="M6 10.5a6 6 0 0 0 12 0" />
          <path {...p} d="M12 16v4" />
          <path {...p} d="M9 20h6" />
        </svg>
      );
    case "sensor":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M6 18a3 3 0 0 1 3-3" />
          <path {...p} d="M6 14a7 7 0 0 1 7-7" />
          <path {...p} d="M6 10a11 11 0 0 1 11 11" />
          <circle {...p} cx="6" cy="18" r="1.2" />
        </svg>
      );
    case "safety":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M12 3 5.5 6v5c0 4.5 2.4 7.4 6.5 10 4.1-2.6 6.5-5.5 6.5-10V6Z" />
          <path {...p} d="M12 8v4" />
          <circle {...p} cx="12" cy="15.8" r=".7" />
        </svg>
      );
    case "goal":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="7" />
          <circle {...p} cx="12" cy="12" r="3" />
          <path {...p} d="M17 7 21 3" />
        </svg>
      );
    case "training":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
        </svg>
      );
    case "advanced":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M5 7h14M5 17h14" />
          <circle {...p} cx="9" cy="7" r="2" />
          <circle {...p} cx="15" cy="17" r="2" />
        </svg>
      );
    case "free":
      return <RunningGlyph name="sport-running" size={size} stroke={stroke} />;
    case "distance":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 16c4-8 8 0 16-8" />
          <path {...p} d="M4 19h16" />
        </svg>
      );
    case "time":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="13" r="7" />
          <path {...p} d="M9 3h6M12 6v2M12 13l3-2" />
        </svg>
      );
    case "pace":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 17a8 8 0 0 1 16 0" />
          <path {...p} d="m12 13 4-4" />
          <path {...p} d="M7 17h10" />
        </svg>
      );
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M12 20S4.5 15.5 4.5 9.5A4 4 0 0 1 12 7a4 4 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20Z" />
          <path {...p} d="M8 12h2l1-2.2 2 4.4 1.2-2.2H16" />
        </svg>
      );
    case "footpod":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M8 4c1.7 3.2 1.4 6.1-.7 8.2-2 2-2.5 4.1-1.1 5.7 1.3 1.5 3.6 1.5 5.2.3 2.1-1.6 2.7-4.8 1.4-7.3C11.8 8.8 10.4 6.5 8 4Z" />
          <circle {...p} cx="16.8" cy="7" r="1.2" />
          <circle {...p} cx="18.7" cy="10" r="1" />
        </svg>
      );
    case "health":
      return <RunningGlyph name="heart" size={size} stroke={stroke} />;
    case "native-gps":
      return <RunningGlyph name="gps" size={size} stroke={stroke} />;
    case "garmin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect {...p} x="6" y="5" width="12" height="14" rx="3" />
          <path {...p} d="M9 2h6M9 22h6" />
          <circle {...p} cx="12" cy="12" r="3" />
        </svg>
      );
    case "files":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M7 3h7l4 4v14H7Z" />
          <path {...p} d="M14 3v5h5" />
          <path {...p} d="M10 13h5M10 16h5" />
        </svg>
      );
    default:
      return null;
  }
}

export type RunningTabItem<T extends string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number | null;
};

export function RunningTabs<T extends string>({
  items,
  value,
  onChange,
  accent,
  sticky = false,
  showLabelOnActiveOnly = true,
}: {
  items: RunningTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: string;
  sticky?: boolean;
  showLabelOnActiveOnly?: boolean;
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
      <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
        {items.map((item) => {
          const active = item.id === value;
          const showLabel = !showLabelOnActiveOnly || active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              style={{
                minHeight: 42,
                minWidth: active ? 108 : 42,
                padding: active ? "6px 12px" : 0,
                borderRadius: 14,
                border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,.08)"}`,
                background: active
                  ? `linear-gradient(145deg,${accent}20,${accent}08 58%,rgba(255,255,255,.025))`
                  : "rgba(255,255,255,.018)",
                color: active ? accent : "rgba(255,255,255,.70)",
                boxShadow: active ? `0 8px 18px ${accent}12, inset 0 1px 0 ${accent}18` : "none",
                cursor: "pointer",
                font: "inherit",
                fontSize: 8.8,
                fontWeight: 1000,
                letterSpacing: .25,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: showLabel ? 8 : 0,
                flexShrink: 0,
              }}
            >
              {item.icon ? (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    display: "grid",
                    placeItems: "center",
                    color: "currentColor",
                  }}
                >
                  {item.icon}
                </span>
              ) : null}
              {showLabel ? <span>{item.label}</span> : null}
              {item.badge != null && active ? (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    paddingInline: 5,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    color: "#090b10",
                    background: accent,
                    fontSize: 7.4,
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
  icon?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <RunningSurface accent={accent} padding={11}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon ? (
          <span style={{ width: 29, height: 29, borderRadius: 9, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}25`, fontSize: 14 }}>
            {icon}
          </span>
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
