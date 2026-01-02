// ============================================
// src/components/StatsPlayerDashboard.tsx
// Dashboard joueur — Verre dépoli OR (responsive sans dépassement)
// ✅ Répartition des volées: valeurs visibles + badges scintillants (par bucket)
// ✅ Mode préféré + Top modes (EN PILE, jamais sur une ligne)
// ✅ sessionsByMode supporté (si fourni par buildDashboardForPlayer)
// ✅ FIX LAYOUT: centré + width clamp + overflow-x hidden
// ============================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import type { X01MultiLegsSets } from "../lib/statsBridge";

/* CSS global : shimmer nom + shimmer titres + shimmer valeurs */
const statsNameCss = `
.dc-stats-name-wrapper { position: relative; isolation: isolate; }
.dc-stats-name-base, .dc-stats-name-shimmer { position: relative; }

.dc-stats-name-base {
  color: var(--dc-accent, #f6c256);
  text-shadow:
    0 0 4px rgba(0,0,0,0.9),
    0 0 10px var(--dc-accent-soft, rgba(246,194,86,0.4)),
    0 0 18px var(--dc-accent-soft, rgba(246,194,86,0.4));
}

.dc-stats-name-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg,
    transparent 0%,
    rgba(255,255,255,0.10) 20%,
    rgba(255,255,255,0.92) 50%,
    rgba(255,255,255,0.15) 80%,
    transparent 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.95;
  mix-blend-mode: screen;
  animation: dcStatsNameShimmer 3.6s ease-in-out infinite;
}
@keyframes dcStatsNameShimmer {
  0% { background-position: -80% 0; transform: scale(1); }
  45% { background-position: 130% 0; transform: scale(1.05); }
  100% { background-position: 130% 0; transform: scale(1); }
}

/* ✅ Titres de blocs scintillants */
.dc-block-title {
  position: relative;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .9px;
  color: var(--dc-accent, #f6c256);
  text-shadow:
    0 0 8px var(--dc-accent, #f6c256),
    0 0 18px var(--dc-accent-soft, rgba(246,194,86,0.35));
}
.dc-block-title::after {
  content: attr(data-t);
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg,
    transparent 0%,
    rgba(255,255,255,0.08) 22%,
    rgba(255,255,255,0.92) 50%,
    rgba(255,255,255,0.14) 78%,
    transparent 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: .90;
  mix-blend-mode: screen;
  animation: dcBlockTitleShimmer 3.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes dcBlockTitleShimmer {
  0% { background-position: -90% 0; }
  55% { background-position: 140% 0; }
  100% { background-position: 140% 0; }
}

/* ✅ Shimmer valeurs */
.dc-shimmer-val {
  position: relative;
  font-weight: 900;
  color: transparent;
  background-image: linear-gradient(
    90deg,
    var(--dc-accent, #f6c256),
    rgba(255,255,255,.92),
    var(--dc-accent, #f6c256)
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: dcValShimmer 2.4s linear infinite;
  text-shadow: 0 0 10px var(--dc-accent-soft, rgba(246,194,86,0.35));
}
@keyframes dcValShimmer {
  0% { background-position: -80% 0; }
  100% { background-position: 120% 0; }
}
`;

function useInjectStatsNameCss() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("dc-stats-name-css")) return;
    const style = document.createElement("style");
    style.id = "dc-stats-name-css";
    style.innerHTML = statsNameCss;
    document.head.appendChild(style);
  }, []);
}

/* ---------- Types ---------- */
export type VisitBucket = "0-59" | "60-99" | "100+" | "140+" | "180";
export type PlayerGamePoint = { date: string; avg3: number };
export type PlayerDistribution = Record<VisitBucket, number>;
export type PlayerDashboardStats = {
  playerId: string;
  playerName: string;
  avg3Overall: number;
  bestVisit: number;
  winRatePct: number;
  bestCheckout?: number;

  evolution: PlayerGamePoint[];
  distribution: PlayerDistribution;

  sessionsByMode?: Record<string, number>;
};

type StatsPlayerDashboardProps = {
  data: PlayerDashboardStats | null | undefined;
  x01MultiLegsSets?: X01MultiLegsSets | null;
};

/* ---------- Thème ---------- */
const T = {
  gold: "#F6C256",
  goldEdgeStrong: "rgba(246,194,86,.9)",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  text60: "rgba(255,255,255,.60)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
  tile: "linear-gradient(180deg,rgba(21,22,26,.96),rgba(17,18,22,.94))",
  chip: "linear-gradient(180deg,rgba(27,29,34,.95),rgba(22,24,29,.95))",
  axis: "rgba(42,43,47,1)",
  grid: "rgba(36,37,40,1)",
};

// ✅ NEW: wrapper centré + pas d'overflow X
const pageWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  margin: "0 auto",
  padding: "0 12px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

// ✅ NEW: stack vertical
const stack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "100%",
  boxSizing: "border-box",
};

// ✅ NEW: toutes les cards/sections doivent rester dans la largeur dispo
const fullW: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const glassCard: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

const tile: React.CSSProperties = {
  background: T.tile,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.02)",
};

const iconBadge: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: T.chip,
  border: `1px solid ${T.edge}`,
  color: T.gold,
};

// ✅ Exports attendus par StatsHub (ne pas supprimer)
export function GoldPill({
  children,
  active = false,
  onClick,
  leftIcon,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${active ? T.goldEdgeStrong : T.edge}`,
    background: active ? "rgba(246,194,86,.10)" : "rgba(255,255,255,.02)",
    color: T.text,
    boxShadow: active ? "inset 0 0 0 1px rgba(246,194,86,.25)" : "none",
    cursor: onClick ? "pointer" : "default",
    whiteSpace: "nowrap",
  };

  return (
    <button type="button" style={{ ...base, ...(style || {}) }} onClick={onClick}>
      {leftIcon ? <span style={{ display: "grid", placeItems: "center" }}>{leftIcon}</span> : null}
      <span style={{ fontWeight: 800 }}>{children}</span>
    </button>
  );
}

export function ProfilePill({
  name,
  avatarDataUrl,
  active = false,
  onClick,
}: {
  name: string;
  avatarDataUrl?: string | null;
  active?: boolean;
  onClick?: () => void;
}) {
  const base: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? T.goldEdgeStrong : T.edge}`,
    background: active ? "rgba(246,194,86,.10)" : "rgba(255,255,255,.02)",
    color: T.text,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <button type="button" style={base} onClick={onClick}>
      {avatarDataUrl ? (
        <img src={avatarDataUrl} alt={name} width={22} height={22} style={{ borderRadius: 999, objectFit: "cover" }} />
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(255,255,255,.10)" }} />
      )}
      <span style={{ fontWeight: 900, fontSize: 13, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </span>
    </button>
  );
}

/* ---------- Icônes ---------- */
const IconBars = ({ size = 18, color = T.text }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="4" height="8" rx="1.5" stroke={color} strokeWidth="1.8" />
    <rect x="10" y="7" width="4" height="12" rx="1.5" stroke={color} strokeWidth="1.8" />
    <rect x="17" y="4" width="4" height="15" rx="1.5" stroke={color} strokeWidth="1.8" />
  </svg>
);

const IconTarget = ({ size = 18, color = T.text }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
  </svg>
);

const IconPercent = ({ size = 18, color = T.text }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 18L18 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="7" cy="7" r="2.4" stroke={color} strokeWidth="1.8" />
    <circle cx="17" cy="17" r="2.4" stroke={color} strokeWidth="1.8" />
  </svg>
);

const IconHourglass = ({ size = 18, color = T.text }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M7 4h10M7 20h10M8 4c0 5 8 5 8 8s-8 3-8 8"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/* ---------- Titres ---------- */
const H1 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.2, color: T.text }}>{children}</div>
);

const Sub = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 13, color: T.text70 }}>{children}</div>;

function BlockTitle({
  text,
  accent,
  accentSoft,
  style,
}: {
  text: string;
  accent: string;
  accentSoft: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="dc-block-title"
      data-t={text}
      style={
        {
          ...(style || {}),
          // @ts-ignore
          "--dc-accent": accent,
          // @ts-ignore
          "--dc-accent-soft": accentSoft,
        } as React.CSSProperties
      }
    >
      {text}
    </div>
  );
}

/* ---------- Hook largeur conteneur ---------- */
function useContainerWidth<T extends HTMLElement>(min = 300): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(min);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(min, Math.floor(el.clientWidth))));
    ro.observe(el);
    setW(Math.max(min, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, [min]);

  return [ref, w];
}

/* ---------- Helpers charts ---------- */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rng = (n: number) => [...Array(n).keys()];
const niceMax = (v: number) =>
  v <= 10 ? 10 : v <= 20 ? 20 : v <= 40 ? 40 : v <= 60 ? 60 : v <= 80 ? 80 : v <= 100 ? 100 : Math.ceil(v / 50) * 50;

function safeDate(d: string): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}
function fmtStart(d: string): string {
  const dt = safeDate(d);
  if (!dt) return "Début";
  const m = dt.getMonth() + 1;
  const y = dt.getFullYear();
  return `${String(m).padStart(2, "0")}/${y}`;
}

/* ---------- Tiles ---------- */
function Tile({
  label,
  value,
  sub,
  icon,
  accent,
  accentSoft,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent: string;
  accentSoft: string;
}) {
  return (
    <div
      style={
        {
          ...tile,
          ...fullW,
          // @ts-ignore
          "--dc-accent": accent,
          // @ts-ignore
          "--dc-accent-soft": accentSoft,
        } as React.CSSProperties
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <BlockTitle
          text={label}
          accent={accent}
          accentSoft={accentSoft}
          style={{ fontSize: 11, opacity: 0.95, textTransform: "none", letterSpacing: 0.2 }}
        />
        <span style={iconBadge}>{icon ?? <IconBars color={T.gold} />}</span>
      </div>
      <div className="dc-shimmer-val" style={{ fontSize: 28, lineHeight: "28px" }}>
        {value}
      </div>
      {sub ? <div style={{ marginTop: 4, fontSize: 12, color: T.text60 }}>{sub}</div> : null}
    </div>
  );
}

/* ---------- Line chart ---------- */
function LineChart({
  points,
  height = 240,
  padding = 36,
  width,
  accent,
  accentSoft,
}: {
  points: PlayerGamePoint[];
  height?: number;
  padding?: number;
  width: number;
  accent: string;
  accentSoft: string;
}) {
  const svgW = Math.max(220, width - 32);

  const pts =
    points.length >= 2
      ? points
      : [
          { date: points[0]?.date ?? "—", avg3: points[0]?.avg3 ?? 50 },
          { date: points[0]?.date ?? "", avg3: points[0]?.avg3 ?? 50 },
        ];

  const startLabel = fmtStart(pts[0]?.date ?? "");
  const endLabel = "Aujourd’hui";

  const { path, area, yTicks } = useMemo(() => {
    const max = niceMax(Math.max(...pts.map((p) => p.avg3), 10));
    const plotW = svgW - padding * 2;
    const plotH = height - padding * 2;
    const x = (i: number) => (pts.length === 1 ? padding + plotW / 2 : padding + (i / (pts.length - 1)) * plotW);
    const y = (v: number) => padding + plotH - (v / max) * plotH;

    const d = pts.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.avg3)}`).join(" ");
    const a = `${d} L ${x(pts.length - 1)} ${height - padding} L ${x(0)} ${height - padding} Z`;

    const ticks = rng(5).map((k) => {
      const val = (k / 4) * max;
      return { y: y(val), label: Math.round(val).toString() };
    });

    return { path: d, area: a, yTicks: ticks };
  }, [pts, height, padding, svgW]);

  return (
    <section style={{ ...glassCard, ...fullW, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconBadge}>
          <IconBars color={T.gold} />
        </div>
        <div style={{ minWidth: 0 }}>
          <BlockTitle text="Évolution" accent={accent} accentSoft={accentSoft} style={{ fontSize: 12, marginBottom: 2 }} />
          <div style={{ fontSize: 12, color: T.text60 }}>Moyenne par partie</div>
        </div>
      </div>

      <div style={{ padding: "0 0 12px" }}>
        <svg
          width={svgW}
          height={height}
          style={{ display: "block", width: "100%", maxWidth: "100%" }}
          viewBox={`0 0 ${svgW} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line x1={padding} y1={height - padding} x2={svgW - padding} y2={height - padding} stroke={T.axis} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={T.axis} />

          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padding} y1={t.y} x2={svgW - padding} y2={t.y} stroke={T.grid} />
              <text x={padding - 10} y={t.y + 4} textAnchor="end" style={{ fontSize: 10, fill: "rgba(255,255,255,.65)" }}>
                {t.label}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#goldArea)" />
          <path d={path} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          <text x={padding} y={height - (padding - 14)} textAnchor="start" style={{ fontSize: 10, fill: "rgba(255,255,255,.70)" }}>
            {startLabel}
          </text>
          <text x={svgW - padding} y={height - (padding - 14)} textAnchor="end" style={{ fontSize: 10, fill: "rgba(255,255,255,.80)" }}>
            {endLabel}
          </text>
        </svg>
      </div>
    </section>
  );
}

/* ---------- Bar chart ---------- */
function BarChart({
  data,
  height = 240,
  padding = 36,
  width,
  accent,
  accentSoft,
}: {
  data: PlayerDistribution;
  height?: number;
  padding?: number;
  width: number;
  accent: string;
  accentSoft: string;
}) {
  const svgW = Math.max(220, width - 32);
  const buckets: VisitBucket[] = ["0-59", "60-99", "100+", "140+", "180"];
  const vals = buckets.map((b) => Number(data?.[b] ?? 0));
  const max = niceMax(Math.max(1, ...vals));

  const plotW = svgW - padding * 2;
  const plotH = height - padding * 2;
  const gap = 16;
  const barW = (plotW - gap * (buckets.length - 1)) / buckets.length;

  const glow = accentSoft || `${accent}33`;

  return (
    <section style={{ ...glassCard, ...fullW, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconBadge}>
          <IconBars color={T.gold} />
        </div>
        <div style={{ minWidth: 0 }}>
          <BlockTitle text="Répartition des volées" accent={accent} accentSoft={glow} style={{ fontSize: 12 }} />
          <div style={{ fontSize: 12, color: T.text60 }}>Valeurs affichées par segment</div>
        </div>
      </div>

      <div style={{ padding: "0 0 12px" }}>
        <svg
          width={svgW}
          height={height}
          style={{ display: "block", width: "100%", maxWidth: "100%" }}
          viewBox={`0 0 ${svgW} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="dcBarValueGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.9" />
              <animate attributeName="x1" values="-1;1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0;2" dur="2.6s" repeatCount="indefinite" />
            </linearGradient>

            <filter id="dcTextGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.9 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1={padding} y1={height - padding} x2={svgW - padding} y2={height - padding} stroke={T.axis} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={T.axis} />

          {rng(5).map((i) => {
            const y = padding + (i / 4) * plotH;
            const label = Math.round(((4 - i) / 4) * max);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={svgW - padding} y2={y} stroke={T.grid} />
                <text x={padding - 10} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: "rgba(255,255,255,.65)" }}>
                  {label}
                </text>
              </g>
            );
          })}

          {buckets.map((b, i) => {
            const v = vals[i] ?? 0;
            const h = (v / max) * plotH;

            const x = padding + i * (barW + gap);
            const y = padding + (plotH - h);

            const labelInside = h >= 34;
            const labelY = labelInside ? y + 18 : Math.max(padding + 12, y - 10);

            return (
              <g key={b}>
                <rect x={x} y={y} width={barW} height={h} rx={12} fill={accent} />
                <rect x={x} y={y} width={barW} height={h} rx={12} fill="transparent" stroke="rgba(122,90,22,.35)" />
                <text
                  x={x + barW / 2}
                  y={labelY}
                  textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 900, fill: "url(#dcBarValueGrad)" }}
                  filter="url(#dcTextGlow)"
                >
                  {v}
                </text>

                <text x={x + barW / 2} y={height - (padding - 14)} textAnchor="middle" style={{ fontSize: 11, fill: "rgba(255,255,255,.85)" }}>
                  {b}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

/* ---------- Favorite mode helpers ---------- */
type ModeStat = { label: string; n: number };

function normalizeModeLabel(k: string) {
  const s = String(k || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "x01" || s === "x01v3") return "X01";
  if (s === "cricket") return "CRICKET";
  if (s === "killer") return "KILLER";
  if (s === "shanghai") return "SHANGHAI";
  return s.toUpperCase();
}

function getModeStats(data: PlayerDashboardStats, x01MultiLegsSets?: X01MultiLegsSets | null): ModeStat[] {
  const sbm = data.sessionsByMode;
  if (sbm && typeof sbm === "object") {
    const entries = Object.entries(sbm)
      .map(([k, v]) => ({ label: normalizeModeLabel(k) || String(k).toUpperCase(), n: Number(v) || 0 }))
      .filter((x) => x.n > 0);
    entries.sort((a, b) => b.n - a.n);
    return entries;
  }

  const stats: ModeStat[] = [];
  const x01Sessions = Array.isArray(data.evolution) ? data.evolution.length : 0;
  if (x01Sessions > 0) stats.push({ label: "X01", n: x01Sessions });

  const duoM = Number((x01MultiLegsSets as any)?.duo?.matches ?? 0);
  const multiM = Number((x01MultiLegsSets as any)?.multi?.matches ?? 0);
  const teamM = Number((x01MultiLegsSets as any)?.team?.matches ?? 0);

  if (duoM > 0) stats.push({ label: "X01 DUO", n: duoM });
  if (teamM > 0) stats.push({ label: "X01 TEAM", n: teamM });
  if (multiM > 0) stats.push({ label: "X01 MULTI", n: multiM });

  stats.sort((a, b) => b.n - a.n);
  return stats;
}

function computeFavoriteModeLabel(stats: ModeStat[]): string {
  return stats.length ? stats[0].label : "—";
}
function computeFavoriteModeCount(stats: ModeStat[]): number {
  return stats.length ? stats[0].n || 0 : 0;
}

// ✅ Top modes EN PILE (pas de carrousel)
function ModeRankingStack({
  stats,
  accent,
  accentSoft,
}: {
  stats: ModeStat[];
  accent: string;
  accentSoft: string;
}) {
  if (!stats.length) return null;

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "22px 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.02)",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const rankBadge = (i: number): React.CSSProperties => ({
    width: 20,
    height: 20,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 12,
    color: "#111",
    background: i === 0 ? `linear-gradient(180deg, ${accent}, rgba(246,194,86,.65))` : "rgba(255,255,255,.14)",
    boxShadow: i === 0 ? `0 0 14px ${accentSoft}` : "none",
  });

  return (
    <div style={{ display: "grid", gap: 6, width: "100%", maxWidth: "100%" }}>
      {stats.map((m, i) => (
        <div key={`${m.label}-${i}`} style={rowStyle}>
          <div style={rankBadge(i)}>{i + 1}</div>
          <div style={{ fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 11, color: T.text }}>
            {m.label}
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, color: accent, textShadow: `0 0 10px ${accentSoft}`, whiteSpace: "nowrap" }}>
            <span className="dc-shimmer-val">{m.n}</span> sess.
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Composant principal ---------- */
export default function StatsPlayerDashboard({ data, x01MultiLegsSets }: StatsPlayerDashboardProps) {
  useInjectStatsNameCss();

  const { theme } = useTheme();
  const accent = theme?.primary ?? T.gold;
  const accentSoft = (theme as any)?.accent20 ?? `${accent}33`;

  if (!data) {
    return (
      <div style={{ background: "rgba(20,20,20,.8)", padding: 16, borderRadius: 16, textAlign: "center", color: T.text }}>
        Aucune donnée à afficher.
      </div>
    );
  }

  const profileName = data.playerName?.trim() || "—";

  const avg3 = Number.isFinite(Number(data.avg3Overall)) && Number(data.avg3Overall) >= 0 ? Number(data.avg3Overall) : 0;
  const bestVisit = Number.isFinite(Number(data.bestVisit)) && Number(data.bestVisit) >= 0 ? Number(data.bestVisit) : 0;
  const winRate = clamp(Number.isFinite(Number(data.winRatePct)) ? Number(data.winRatePct) : 0, 0, 100);
  const bestCheckout =
    data.bestCheckout != null && Number.isFinite(Number(data.bestCheckout)) && Number(data.bestCheckout) > 0 ? Number(data.bestCheckout) : undefined;

  const distribution: PlayerDistribution = {
    "0-59": Number(data.distribution?.["0-59"] ?? 0),
    "60-99": Number(data.distribution?.["60-99"] ?? 0),
    "100+": Number(data.distribution?.["100+"] ?? 0),
    "140+": Number(data.distribution?.["140+"] ?? 0),
    "180": Number(data.distribution?.["180"] ?? 0),
  };

  const evolution: PlayerGamePoint[] = Array.isArray(data.evolution)
    ? data.evolution
        .filter((p) => p && Number.isFinite(Number((p as any).avg3)))
        .map((p) => ({ date: String((p as any).date ?? ""), avg3: Number((p as any).avg3) }))
    : [];

  const modeStats = useMemo(() => getModeStats(data, x01MultiLegsSets), [data, x01MultiLegsSets]);
  const favoriteMode = useMemo(() => computeFavoriteModeLabel(modeStats), [modeStats]);
  const favoriteModeCount = useMemo(() => computeFavoriteModeCount(modeStats), [modeStats]);

  const [refL, wL] = useContainerWidth<HTMLDivElement>(320);
  const [refB, wB] = useContainerWidth<HTMLDivElement>(320);

  return (
    <div style={pageWrap}>
      <section
        style={
          {
            ...stack,
            color: T.text,
            // @ts-ignore
            "--dc-accent": accent,
            // @ts-ignore
            "--dc-accent-soft": accentSoft,
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <div style={{ ...glassCard, ...fullW, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={iconBadge}>
              <IconBars color={T.gold} />
            </div>
            <div style={{ minWidth: 0 }}>
              <H1>Statistiques</H1>
              <Sub>Analyse des performances par joueur — X01, Cricket & entraînements</Sub>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <span className="dc-stats-name-wrapper" style={{ maxWidth: "100%", display: "block", textAlign: "center" }}>
              <span
                className="dc-stats-name-base"
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: '"Luckiest Guy","Impact","system-ui",sans-serif',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                  textAlign: "center",
                }}
              >
                {profileName}
              </span>
              <span
                className="dc-stats-name-shimmer"
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: '"Luckiest Guy","Impact","system-ui",sans-serif',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                  textAlign: "center",
                }}
              >
                {profileName}
              </span>
            </span>
          </div>

          {/* Mode préféré + Top */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <BlockTitle text="Mode de jeu préféré" accent={accent} accentSoft={accentSoft} style={{ fontSize: 11 }} />
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.14)",
                  background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), rgba(255,255,255,.04)`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.02)",
                  fontWeight: 900,
                  letterSpacing: 0.7,
                  color: accent,
                  textShadow: `0 0 10px ${accentSoft}`,
                  textTransform: "uppercase",
                  fontSize: 11,
                  minWidth: 160,
                  maxWidth: "100%",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span className="dc-shimmer-val">
                  {favoriteMode}
                  {favoriteModeCount > 0 ? ` · ${favoriteModeCount} sessions` : ""}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <BlockTitle text="Top modes" accent={accent} accentSoft={accentSoft} style={{ fontSize: 11, marginBottom: 8 }} />
              <ModeRankingStack stats={modeStats} accent={accent} accentSoft={accentSoft} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ ...fullW, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(1, minmax(0,1fr))" }} className="sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Moyenne / 3 flèches" value={`${avg3.toFixed(1)} pts`} sub="Visites moyennes" icon={<IconBars color={T.gold} />} accent={accent} accentSoft={accentSoft} />
            <Tile label="Meilleure volée" value={`${bestVisit} pts`} sub="Record personnel" icon={<IconTarget color={T.gold} />} accent={accent} accentSoft={accentSoft} />
            <Tile label="Taux de victoire" value={`${winRate.toFixed(0)} %`} sub="Toutes manches" icon={<IconPercent color={T.gold} />} accent={accent} accentSoft={accentSoft} />
            <Tile label="Plus haut checkout" value={bestCheckout != null ? `${bestCheckout}` : "—"} sub="X01" icon={<IconHourglass color={T.gold} />} accent={accent} accentSoft={accentSoft} />
          </div>
        </div>

        {/* Graphs */}
        <div style={{ ...fullW, display: "grid", gap: 12, marginTop: 16 }} className="lg:grid-cols-2">
          <div ref={refL} style={{ width: "100%" }}>
            <LineChart points={evolution} width={wL} accent={accent} accentSoft={accentSoft} />
          </div>
          <div ref={refB} style={{ width: "100%" }}>
            <BarChart data={distribution} width={wB} accent={accent} accentSoft={accentSoft} />
          </div>
        </div>
      </section>
    </div>
  );
}
