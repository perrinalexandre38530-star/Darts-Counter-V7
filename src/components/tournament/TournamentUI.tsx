// =============================================================
// src/components/tournament/TournamentUI.tsx
// UI TOURNOI — Cards / Pills / Sections (neon arcade)
// - SectionTitle, NeonCard, Pill, ProgressBar
// - PoolCard, MatchCard, MiniKPI
// =============================================================
import React from "react";

// -------------------------------------------------------------
// Helpers (utilisés par TournamentView)
// -------------------------------------------------------------
export type MatchStatus = "pending" | "running" | "done";

// Accepte soit un tournoi, soit un tableau de matches
export function getMatchCountByStatus(input: any, status: MatchStatus): number {
  const matches = Array.isArray(input)
    ? input
    : input?.matches || input?.bracket?.matches || input?.tournament?.matches || [];
  if (!Array.isArray(matches)) return 0;

  return matches.filter((m: any) => String(m?.status || "pending") === status).length;
}

// Label lisible pour l'UI
export function getPlayLabel(statusOrMatch: any): string {
  const st =
    typeof statusOrMatch === "string"
      ? statusOrMatch
      : statusOrMatch?.status || "pending";
  const s = String(st);
  if (s === "running") return "En cours";
  if (s === "done") return "Terminé";
  return "À jouer";
}

// Accent couleur (utile si tu veux des KPIs/onglets cohérents)
export function getStatusAccent(statusOrMatch: any): string {
  const st =
    typeof statusOrMatch === "string"
      ? statusOrMatch
      : statusOrMatch?.status || "pending";
  const s = String(st);
  if (s === "running") return "#4fb4ff"; // bleu
  if (s === "done") return "#7fe2a9"; // vert
  return "#ffd56a"; // gold (cohérent avec ton UI)
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 950,
            letterSpacing: 0.2,
            color: "#ffd56a",
            textShadow: "0 0 12px rgba(255,215,80,.28)",
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2, lineHeight: 1.3 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}

export function NeonCard({
  children,
  accent = "rgba(255,213,106,.65)",
  style,
}: {
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.07), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 14px 32px rgba(0,0,0,.55)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${accent}, rgba(255,255,255,0))`,
          opacity: 0.95,
        }}
      />
      {children}
    </div>
  );
}

export function Pill({
  label,
  tone = "gold",
}: {
  label: string;
  tone?: "gold" | "blue" | "green" | "red" | "gray" | "pink";
}) {
  const map: any = {
    gold: ["rgba(255,213,106,.18)", "#ffd56a", "rgba(255,213,106,.35)"],
    blue: ["rgba(79,180,255,.14)", "#4fb4ff", "rgba(79,180,255,.35)"],
    green: ["rgba(127,226,169,.14)", "#7fe2a9", "rgba(127,226,169,.35)"],
    red: ["rgba(255,90,90,.14)", "#ff5a5a", "rgba(255,90,90,.35)"],
    pink: ["rgba(255,79,216,.14)", "#ff4fd8", "rgba(255,79,216,.35)"],
    gray: ["rgba(255,255,255,.08)", "rgba(255,255,255,.9)", "rgba(255,255,255,.12)"],
  };
  const [bg, fg, bd] = map[tone] || map.gray;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 10.8,
        fontWeight: 950,
        letterSpacing: 0.2,
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  accent = "#ffd56a",
}: {
  value: number;
  max: number;
  accent?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(0,0,0,.35)",
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.25)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.round(pct * 100)}%`,
          background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,.10))`,
          boxShadow: `0 0 12px ${accent}55`,
        }}
      />
    </div>
  );
}

export function MiniKPI({
  label,
  value,
  tone = "gold",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "gold" | "blue" | "green" | "red" | "gray" | "pink";
}) {
  const toneColor =
    tone === "green"
      ? "#7fe2a9"
      : tone === "blue"
      ? "#4fb4ff"
      : tone === "red"
      ? "#ff5a5a"
      : tone === "pink"
      ? "#ff4fd8"
      : "#ffd56a";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 14,
        padding: "10px 10px",
        border: "1px solid rgba(255,255,255,.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.20))",
        boxShadow: "0 10px 20px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ fontSize: 10.8, opacity: 0.78, fontWeight: 850 }}>{label}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: 16,
          fontWeight: 950,
          color: toneColor,
          textShadow: `0 0 12px ${toneColor}33`,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function SoftButton({
  label,
  onClick,
  tone = "gold",
  disabled,
}: {
  label: string;
  onClick?: () => void;
  tone?: "gold" | "blue" | "green" | "red" | "gray" | "pink";
  disabled?: boolean;
}) {
  const bg =
    tone === "green"
      ? "linear-gradient(180deg,#35c86d,#23a958)"
      : tone === "blue"
      ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
      : tone === "red"
      ? "linear-gradient(180deg,#ff5a5a,#e01f1f)"
      : tone === "pink"
      ? "linear-gradient(180deg,#ff4fd8,#d62fb4)"
      : tone === "gray"
      ? "linear-gradient(180deg,#555,#333)"
      : "linear-gradient(180deg,#ffd25a,#ffaf00)";

  const fg = tone === "gray" ? "rgba(255,255,255,.92)" : "#1b1508";
  const fg2 = tone === "gray" ? "rgba(255,255,255,.92)" : fg;

  return (
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        borderRadius: 999,
        padding: "9px 12px",
        border: "1px solid rgba(0,0,0,.25)",
        fontWeight: 950,
        fontSize: 13,
        background: bg,
        color: fg2,
        cursor: disabled ? "default" : "pointer",
        boxShadow: "0 10px 22px rgba(0,0,0,.45)",
        opacity: disabled ? 0.55 : 1,
        width: "100%",
      }}
    >
      {label}
    </button>
  );
}

export function PoolCard({
  name,
  standings,
  onOpen,
}: {
  name: string;
  standings?: Array<{ name: string; pts?: number; w?: number; l?: number }>;
  onOpen?: () => void;
}) {
  const top = (standings || []).slice(0, 4);
  return (
    <NeonCard accent="rgba(79,180,255,.55)">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 950, fontSize: 13, flex: 1, minWidth: 0 }}>
          {name}
        </div>
        <Pill label="POULE" tone="blue" />
      </div>

      {top.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {top.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "7px 9px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(0,0,0,.25)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 950,
                    fontSize: 12,
                    background: "rgba(79,180,255,.16)",
                    border: "1px solid rgba(79,180,255,.35)",
                    color: "#4fb4ff",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontWeight: 850,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name || "Joueur"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                {typeof r.w === "number" ? <Pill label={`W ${r.w}`} tone="green" /> : null}
                {typeof r.l === "number" ? <Pill label={`L ${r.l}`} tone="red" /> : null}
                {typeof r.pts === "number" ? <Pill label={`${r.pts} pts`} tone="gold" /> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ opacity: 0.8, fontSize: 12, lineHeight: 1.35 }}>
          Classement vide pour l’instant.
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <SoftButton label="Voir la poule" tone="blue" onClick={onOpen} />
      </div>
    </NeonCard>
  );
}

export function MatchCard({
  title,
  subtitle,
  status,
  statusTone,
  leftName,
  rightName,
  leftAvatar,
  rightAvatar,
  score,
  onPlay,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: "gold" | "blue" | "green" | "red" | "gray" | "pink";
  leftName: string;
  rightName: string;
  leftAvatar?: string | null;
  rightAvatar?: string | null;
  score?: string | null;
  onPlay?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.05), transparent 55%), linear-gradient(180deg, rgba(20,20,26,.96), rgba(10,10,14,.98))",
        boxShadow: "0 14px 28px rgba(0,0,0,.55)",
        display: "grid",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: "linear-gradient(180deg, rgba(255,213,106,.65), rgba(255,255,255,0))",
          opacity: 0.9,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          {subtitle ? <div style={{ fontSize: 11.5, opacity: 0.78, marginTop: 2 }}>{subtitle}</div> : null}
        </div>
        {status ? <Pill label={status} tone={statusTone || "gray"} /> : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PlayerMini name={leftName} avatar={leftAvatar} tone="gold" />
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ fontWeight: 950, fontSize: 14, color: "#ffd56a", textShadow: "0 0 12px rgba(255,215,80,.22)" }}>
            VS
          </div>
          {score ? <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>{score}</div> : null}
        </div>
        <PlayerMini name={rightName} avatar={rightAvatar} tone="pink" align="right" />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SoftButton label="Détails" tone="gray" onClick={onOpen} />
        </div>
        <div style={{ flex: 1 }}>
          <SoftButton label="Jouer / Reprendre" tone="green" onClick={onPlay} />
        </div>
      </div>
    </div>
  );
}

function PlayerMini({
  name,
  avatar,
  tone,
  align = "left",
}: {
  name: string;
  avatar?: string | null;
  tone?: "gold" | "pink" | "blue" | "green" | "red" | "gray";
  align?: "left" | "right";
}) {
  const ring =
    tone === "pink"
      ? "radial-gradient(circle at 30% 0%, #ff7be7, #b82086)"
      : tone === "blue"
      ? "radial-gradient(circle at 30% 0%, #7fc7ff, #1a6fc6)"
      : tone === "green"
      ? "radial-gradient(circle at 30% 0%, #93f0b4, #1f9a58)"
      : tone === "red"
      ? "radial-gradient(circle at 30% 0%, #ff8b8b, #c61f1f)"
      : "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {align === "right" ? (
        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontWeight: 950, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name || "Joueur"}
          </div>
        </div>
      ) : null}

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          overflow: "hidden",
          background: ring,
          flexShrink: 0,
          boxShadow: "0 0 14px rgba(0,0,0,.45)",
        }}
      >
        {avatar ? (
          <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontWeight: 950, color: "#1a1a1a" }}>
            {(name || "??").slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {align !== "right" ? (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name || "Joueur"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
