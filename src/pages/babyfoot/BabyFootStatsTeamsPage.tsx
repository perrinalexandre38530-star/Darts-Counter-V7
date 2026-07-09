import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import { History } from "../../lib/history";
import { loadBabyFootTeams, type BabyFootTeam } from "../../lib/petanqueTeamsStore";
import teamStatsTicker from "../../assets/tickers/ticker_babyfoot_team_statistics.svg";
import {
  babyFootTeamRating,
  computeBabyFootTeamStatsBundle,
  formatBabyFootRatio,
  type BabyFootTeamDetailedAggregate,
  type BabyFootTeamPlayerContribution,
  type BabyFootTeamScopeMatch,
} from "../../lib/babyfootTeamStats";
import { formatBabyFootPct01, type BabyFootModeFilter, type BabyFootPeriodFilter } from "../../lib/babyfootStatsAggregate";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ARV";
type ModeKey = "2v2" | "2v1" | "all";
type TeamTab = "dashboard" | "players" | "details" | "matches";

const C = {
  gold: "#F6C256",
  blue: "#47B5FF",
  pink: "#FF6FB5",
  green: "#7CFF9A",
  violet: "#B995FF",
  orange: "#FFB15C",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,.66)",
  dim: "rgba(255,255,255,.42)",
  faint: "rgba(255,255,255,.10)",
  panel: "linear-gradient(180deg,rgba(17,18,24,.97),rgba(8,9,14,.98))",
  panel2: "linear-gradient(180deg,rgba(26,28,36,.95),rgba(10,11,17,.98))",
};

const PERIODS: Array<{ key: PeriodKey; label: string; long: string }> = [
  { key: "J", label: "J", long: "Jour" },
  { key: "S", label: "S", long: "Semaine" },
  { key: "M", label: "M", long: "Mois" },
  { key: "A", label: "A", long: "Année" },
  { key: "ARV", label: "ARV", long: "À vie" },
];

const MODES: Array<{ key: ModeKey; label: string }> = [
  { key: "2v2", label: "2V2" },
  { key: "2v1", label: "2V1" },
  { key: "all", label: "TOUS" },
];

const TABS: Array<{ key: TeamTab; label: string; color: string }> = [
  { key: "dashboard", label: "DASHBOARD", color: C.green },
  { key: "players", label: "JOUEURS", color: C.blue },
  { key: "details", label: "DÉTAILS", color: C.gold },
  { key: "matches", label: "MATCHS", color: C.violet },
];

const DASHBOARD_MATCH_LIMIT = 5;
const MATCHES_LIMIT = 10;

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function idOf(profile: any) {
  return String(profile?.id || profile?.profileId || profile?.playerId || "").trim();
}

function num(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampIndex(index: number, length: number) {
  if (!length) return 0;
  const value = index % length;
  return value < 0 ? value + length : value;
}

function formatOne(value: number) {
  return Number(value || 0).toFixed(1);
}

function formatSigned(value: number) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(num(ms) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDurationLabel(ms: number) {
  const seconds = Math.max(0, Math.round(num(ms) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `Temps de jeu : ${minutes}'${String(rest).padStart(2, "0")}''`;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "Date inconnue";
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function mergeRows(...sources: any[][]) {
  const byId = new Map<string, any>();
  const score = (row: any) => {
    const payload = row?.payload || row;
    return (row?.payload ? 8 : 0) + (Array.isArray(payload?.events) ? payload.events.length * 3 : 0) + (Array.isArray(payload?.players) ? payload.players.length : 0);
  };
  for (const source of sources) {
    for (const row of Array.isArray(source) ? source : []) {
      const id = String(row?.id || row?.matchId || row?.payload?.id || row?.payload?.matchId || "").trim();
      if (!id) continue;
      const previous = byId.get(id);
      if (!previous || score(row) >= score(previous)) byId.set(id, row);
    }
  }
  return Array.from(byId.values());
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    borderRadius: 22,
    padding: 14,
    background: C.panel,
    border: `1px solid ${C.faint}`,
    boxShadow: "0 14px 34px rgba(0,0,0,.42)",
    backdropFilter: "blur(10px)",
    ...extra,
  };
}

function sectionTitle(label: string, color = C.gold) {
  return (
    <div style={{ color, fontSize: 13, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase", textShadow: `0 0 12px ${color}66` }}>
      {label}
    </div>
  );
}

function HeaderTickerImage({ src, alt, fallbackLabel, color = C.gold }: { src?: string | null; alt: string; fallbackLabel?: string; color?: string }) {
  if (src) {
    return <img src={src} alt={alt} className="bf-stats-teams-title-img" style={{ width: "100%", maxWidth: 420, height: "auto", display: "block", margin: "0 auto", filter: `drop-shadow(0 0 16px ${color}28)` }} draggable={false} />;
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, maxWidth: "100%", minWidth: 0, padding: "10px 16px", borderRadius: 18, border: `1px solid ${color}66`, background: `linear-gradient(90deg,rgba(0,0,0,.18),${color}16,rgba(0,0,0,.18))`, boxShadow: `0 0 18px ${color}22, inset 0 0 18px ${color}14` }}>
      <span style={{ flex: "0 0 34px", height: 6, borderRadius: 999, background: `linear-gradient(90deg,transparent,${color})`, opacity: .9 }} />
      <span className="bf-stats-teams-title" style={{ color, fontSize: 21, lineHeight: 1.05, fontWeight: 1000, letterSpacing: .9, textTransform: "uppercase", textShadow: `0 0 14px ${color}99`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fallbackLabel || alt}</span>
    </div>
  );
}

function HeaderIconButton({ active = false, onClick, children, title, color = C.blue }: { active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 46,
        height: 46,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${active ? color + "aa" : color + "55"}`,
        color,
        background: active ? `radial-gradient(circle at 35% 30%,${color}26,rgba(0,0,0,.22))` : `rgba(7,16,26,.72)`,
        cursor: "pointer",
        boxShadow: active ? `0 0 18px ${color}33, inset 0 0 14px ${color}12` : `0 0 14px ${color}18`,
      }}
    >
      {children}
    </button>
  );
}

function FilterGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Pill({ active, children, onClick, color = C.gold }: { active?: boolean; children: React.ReactNode; onClick?: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? color + "cc" : "rgba(255,255,255,.13)"}`,
        background: active ? `linear-gradient(180deg,${color}26,rgba(0,0,0,.32))` : "rgba(255,255,255,.045)",
        color: active ? color : "rgba(255,255,255,.76)",
        boxShadow: active ? `0 0 16px ${color}22, inset 0 0 14px ${color}12` : "none",
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 11,
        fontWeight: 1000,
        letterSpacing: .7,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Kpi({ label, value, color = C.text, hint }: { label: string; value: React.ReactNode; color?: string; hint?: string }) {
  return (
    <div style={{ minWidth: 0, width: "100%", maxWidth: "100%", overflow: "hidden", borderRadius: 17, padding: "11px 9px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.075)", textAlign: "center" }}>
      <div style={{ color: C.muted, fontSize: 9, fontWeight: 950, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, marginTop: 4, fontSize: 22, lineHeight: 1.05, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {hint ? <div style={{ color: C.dim, marginTop: 4, fontSize: 9, fontWeight: 800 }}>{hint}</div> : null}
    </div>
  );
}

function MiniProgress({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ minWidth: 0, width: "100%", maxWidth: "100%", display: "grid", gridTemplateColumns: "minmax(62px,92px) minmax(0,1fr) minmax(34px,52px)", gap: 7, alignItems: "center" }}>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 900 }}>{label}</div>
      <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 12px ${color}55` }} />
      </div>
      <div style={{ color, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{value}{suffix}</div>
    </div>
  );
}

function TeamHeroMedallion({ team, size = 88, glowColor = C.gold }: { team: BabyFootTeamDetailedAggregate | null; size?: number; glowColor?: string }) {
  const label = String(team?.label || "Équipe").trim();
  const initials = label.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "T";
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: `radial-gradient(circle at 50% 38%,${glowColor}22,rgba(0,0,0,.08) 60%)`, boxShadow: `0 0 0 1px ${glowColor}66, 0 0 18px ${glowColor}50, 0 0 32px ${glowColor}22` }} />
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 999, padding: 4, background: "rgba(8,10,18,.92)", boxShadow: `inset 0 0 0 1px ${glowColor}55` }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", background: "#101116", display: "grid", placeItems: "center" }}>
          {team?.logoUrl ? <img src={team.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: glowColor, fontSize: Math.round(size * .32), fontWeight: 1000 }}>{initials}</span>}
        </div>
      </div>
    </div>
  );
}

function FormDots({ form }: { form: Array<"W" | "D" | "L"> }) {
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
      {form.length ? form.map((item, index) => {
        const color = item === "W" ? C.green : item === "D" ? C.gold : C.pink;
        return <span key={`${item}-${index}`} title={item} style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", color: "#07100b", background: color, fontSize: 10, fontWeight: 1000, boxShadow: `0 0 10px ${color}55` }}>{item}</span>;
      }) : <span style={{ color: C.dim, fontSize: 11, fontWeight: 900 }}>—</span>}
    </div>
  );
}

function TrendChart({ values }: { values: BabyFootTeamDetailedAggregate["trend"] }) {
  const width = 440;
  const height = 154;
  const padX = 18;
  const padTop = 18;
  const padBottom = 28;
  const safe = values.slice(-5);
  const maxGoals = Math.max(1, ...safe.map((row) => row.gf), ...safe.map((row) => row.ga));
  const plotHeight = height - padTop - padBottom;
  const baseY = height - padBottom;
  const step = safe.length > 0 ? (width - padX * 2) / safe.length : width - padX * 2;
  const diffMax = Math.max(1, ...safe.map((row) => Math.abs(row.diff)));
  const diffPoints = safe.map((row, index) => {
    const groupX = padX + step * index;
    const x = groupX + step / 2;
    const y = padTop + plotHeight / 2 - (row.diff / diffMax) * (plotHeight / 2 - 8);
    return [x, y] as const;
  });
  const polyline = diffPoints.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Comparaison buts pour et buts contre" style={{ width: "100%", height: 154, display: "block" }}>
      <line x1={padX} x2={width - padX} y1={baseY} y2={baseY} stroke="rgba(255,255,255,.16)" strokeWidth="1" />
      {[.25, .5, .75].map((ratio) => <line key={ratio} x1={padX} x2={width - padX} y1={padTop + plotHeight * ratio} y2={padTop + plotHeight * ratio} stroke="rgba(255,255,255,.06)" strokeWidth="1" />)}
      {safe.map((row, index) => {
        const groupX = padX + step * index;
        const barW = Math.max(7, Math.min(17, step * .22));
        const gap = Math.max(3, Math.min(6, step * .07));
        const center = groupX + step / 2;
        const gfH = Math.max(0, (row.gf / maxGoals) * plotHeight);
        const gaH = Math.max(0, (row.ga / maxGoals) * plotHeight);
        return (
          <g key={row.id || index}>
            <rect x={center - barW - gap / 2} y={baseY - gfH} width={barW} height={gfH} rx="4" fill={C.green} opacity=".76" />
            <rect x={center + gap / 2} y={baseY - gaH} width={barW} height={gaH} rx="4" fill={C.pink} opacity=".70" />
          </g>
        );
      })}
      {polyline ? <polyline points={polyline} fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${C.gold}88)` }} /> : null}
      {diffPoints.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="3.5" fill="#101115" stroke={C.gold} strokeWidth="2.5" />)}
      <g transform={`translate(${padX},${height - 13})`}>
        <rect x="0" y="-7" width="9" height="9" rx="2" fill={C.green} opacity=".76" />
        <text x="14" y="1" fill="rgba(255,255,255,.62)" fontSize="9" fontWeight="800">BP</text>
        <rect x="44" y="-7" width="9" height="9" rx="2" fill={C.pink} opacity=".70" />
        <text x="58" y="1" fill="rgba(255,255,255,.62)" fontSize="9" fontWeight="800">BC</text>
        <circle cx="94" cy="-2.5" r="3" fill="#101115" stroke={C.gold} strokeWidth="2" />
        <text x="104" y="1" fill="rgba(255,255,255,.62)" fontSize="9" fontWeight="800">Diff</text>
      </g>
    </svg>
  );
}

function PlayerRow({ row, profilesById }: { row: BabyFootTeamPlayerContribution; profilesById: Map<string, Profile> }) {
  const profile = profilesById.get(row.id) || ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl } as any);
  const totalPissettes = row.pissetteValid + row.pissetteRefused;
  const totalPeches = row.pecheOff + row.pecheDef;
  return (
    <div style={{ borderRadius: 17, padding: 11, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
        <ProfileAvatar profile={profile as any} size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
          <div style={{ color: C.dim, marginTop: 2, fontSize: 10, fontWeight: 850 }}>{row.matches} MJ · {row.wins}V/{row.draws}N/{row.losses}D · contribution {row.contributionPct}%</div>
        </div>
        <div style={{ color: C.gold, fontSize: 18, fontWeight: 1000, textAlign: "right" }}>{row.personalPoints}</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(90px,100%),1fr))", gap: 7 }}>
        <Kpi label="BP équipe" value={row.teamGoalsFor} color={C.green} hint={`${formatOne(row.avgGoalsFor)}/M`} />
        <Kpi label="BC équipe" value={row.teamGoalsAgainst} color={C.pink} hint={`${formatOne(row.avgGoalsAgainst)}/M`} />
        <Kpi label="Buts perso" value={row.personalPoints} color={C.gold} hint={`${row.actualGoals} vrais`} />
        <Kpi label="AV/DEF/GB" value={`${row.goalAv}/${row.goalDef}/${row.goalGb}`} color={C.blue} />
        <Kpi label="Demis" value={row.demi} color={C.violet} hint={`bonus +${row.demiBonus}`} />
        <Kpi label="Fun" value={`${row.gamelle}/${totalPissettes}/${totalPeches}`} color={C.orange} hint="gam/piss/pêches" />
        <Kpi label="CSC" value={row.csc} color={C.pink} />
      </div>
    </div>
  );
}

function PlayerFunTotal(row: BabyFootTeamPlayerContribution) {
  return row.gamelle + row.pissetteValid + row.pissetteRefused + row.pecheOff + row.pecheDef + row.demi + row.csc;
}

function topPlayer(rows: BabyFootTeamPlayerContribution[], valueOf: (row: BabyFootTeamPlayerContribution) => number) {
  return [...rows].sort((a, b) => valueOf(b) - valueOf(a) || b.matches - a.matches || a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }))[0] || null;
}

function PlayerBadge({ row, profilesById, color, label, value }: { row: BabyFootTeamPlayerContribution | null; profilesById: Map<string, Profile>; color: string; label: string; value: React.ReactNode }) {
  const profile = row ? (profilesById.get(row.id) || ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl } as any)) : null;
  return (
    <div style={{ minWidth: 0, borderRadius: 16, padding: 10, background: `linear-gradient(180deg,${color}14,rgba(255,255,255,.035))`, border: `1px solid ${color}44` }}>
      <div style={{ color, fontSize: 9, fontWeight: 1000, letterSpacing: .6, textTransform: "uppercase" }}>{label}</div>
      {row ? (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", alignItems: "center", gap: 8 }}>
          <ProfileAvatar profile={profile as any} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{row.name}</div>
            <div style={{ color: C.dim, fontSize: 9, fontWeight: 850 }}>{row.matches} MJ</div>
          </div>
          <div style={{ color, fontSize: 17, fontWeight: 1000, textAlign: "right" }}>{value}</div>
        </div>
      ) : <div style={{ color: C.dim, marginTop: 10, fontSize: 12, fontWeight: 850 }}>—</div>}
    </div>
  );
}

function PlayerCompareBars({
  title,
  subtitle,
  rows,
  profilesById,
  color,
  valueOf,
  formatValue,
  limit = 6,
}: {
  title: string;
  subtitle?: string;
  rows: BabyFootTeamPlayerContribution[];
  profilesById: Map<string, Profile>;
  color: string;
  valueOf: (row: BabyFootTeamPlayerContribution) => number;
  formatValue?: (value: number, row: BabyFootTeamPlayerContribution) => React.ReactNode;
  limit?: number;
}) {
  const sorted = [...rows]
    .sort((a, b) => valueOf(b) - valueOf(a) || b.matches - a.matches || a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }))
    .slice(0, limit);
  const max = Math.max(1, ...sorted.map(valueOf));
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        {sectionTitle(title, color)}
        {subtitle ? <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>{subtitle}</div> : null}
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {sorted.length ? sorted.map((row, index) => {
          const value = valueOf(row);
          const pct = Math.max(0, Math.min(100, (value / max) * 100));
          const profile = profilesById.get(row.id) || ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl } as any);
          return (
            <div key={`${title}-${row.id}`} style={{ minWidth: 0, display: "grid", gridTemplateColumns: "26px 34px minmax(0,1fr) minmax(42px,auto)", gap: 8, alignItems: "center" }}>
              <div style={{ color: index === 0 ? C.gold : C.muted, fontSize: 14, fontWeight: 1000, textAlign: "center" }}>{index + 1}</div>
              <ProfileAvatar profile={profile as any} size={30} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                </div>
                <div style={{ marginTop: 4, height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 12px ${color}55` }} />
                </div>
              </div>
              <div style={{ color, fontSize: 13, fontWeight: 1000, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatValue ? formatValue(value, row) : value}</div>
            </div>
          );
        }) : <div style={{ color: C.muted, textAlign: "center", padding: 14, fontWeight: 850 }}>Aucun joueur à comparer avec ces filtres.</div>}
      </div>
    </div>
  );
}

function PlayerRankingTable({ rows, profilesById }: { rows: BabyFootTeamPlayerContribution[]; profilesById: Map<string, Profile> }) {
  const sorted = [...rows].sort((a, b) => b.personalPoints - a.personalPoints || b.contributionPct - a.contributionPct || b.teamGoalDiff - a.teamGoalDiff || a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }));
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        {sectionTitle("Classement interne joueurs", C.gold)}
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>Buts · contrib · diff</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
        {sorted.map((row, index) => {
          const profile = profilesById.get(row.id) || ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl } as any);
          return (
            <div key={`ranking-${row.id}`} style={{ display: "grid", gridTemplateColumns: "28px 34px minmax(0,1fr) 46px 46px 46px", alignItems: "center", gap: 7, padding: "8px 6px", borderRadius: 14, background: index === 0 ? `${C.gold}13` : "rgba(255,255,255,.03)", border: `1px solid ${index === 0 ? C.gold + "33" : "rgba(255,255,255,.06)"}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: index === 0 ? C.gold : "rgba(255,255,255,.08)", color: index === 0 ? "#14100A" : C.muted, fontSize: 12, fontWeight: 1000 }}>{index + 1}</div>
              <ProfileAvatar profile={profile as any} size={30} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                <div style={{ color: C.dim, fontSize: 9, fontWeight: 850 }}>{row.matches} MJ · {row.wins}V/{row.losses}D</div>
              </div>
              <div style={{ color: C.gold, fontSize: 13, fontWeight: 1000, textAlign: "right" }}>{row.personalPoints}</div>
              <div style={{ color: C.blue, fontSize: 13, fontWeight: 1000, textAlign: "right" }}>{row.contributionPct}%</div>
              <div style={{ color: row.teamGoalDiff >= 0 ? C.green : C.pink, fontSize: 13, fontWeight: 1000, textAlign: "right" }}>{formatSigned(row.teamGoalDiff)}</div>
            </div>
          );
        })}
        {!sorted.length ? <div style={{ color: C.muted, textAlign: "center", padding: 14, fontWeight: 850 }}>Aucun joueur n’a encore joué dans cette équipe.</div> : null}
      </div>
    </div>
  );
}

function TeamPlayerLeaderboards({ team, profilesById }: { team: BabyFootTeamDetailedAggregate; profilesById: Map<string, Profile> }) {
  const players = team.players || [];
  const scorer = topPlayer(players, (row) => row.personalPoints);
  const contribution = topPlayer(players, (row) => row.contributionPct);
  const av = topPlayer(players, (row) => row.goalAv);
  const defense = topPlayer(players, (row) => row.goalDef + row.goalGb);
  const fun = topPlayer(players, PlayerFunTotal);
  return (
    <>
      <div style={cardStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          {sectionTitle("Leaders de l'équipe", C.blue)}
          <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>{players.length} joueur(s)</div>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 8 }}>
          <PlayerBadge row={scorer} profilesById={profilesById} color={C.gold} label="Top scoreur" value={scorer?.personalPoints ?? "—"} />
          <PlayerBadge row={contribution} profilesById={profilesById} color={C.blue} label="Contribution" value={contribution ? `${contribution.contributionPct}%` : "—"} />
          <PlayerBadge row={av} profilesById={profilesById} color={C.green} label="Meilleur AV" value={av?.goalAv ?? "—"} />
          <PlayerBadge row={defense} profilesById={profilesById} color={C.pink} label="Déf / GB" value={defense ? `${defense.goalDef}/${defense.goalGb}` : "—"} />
          <PlayerBadge row={fun} profilesById={profilesById} color={C.orange} label="Fun" value={fun ? PlayerFunTotal(fun) : "—"} />
        </div>
      </div>
      <PlayerCompareBars title="Scoreurs de l'équipe" subtitle="buts + bonus" rows={players} profilesById={profilesById} color={C.gold} valueOf={(row) => row.personalPoints} />
      <PlayerCompareBars title="Contribution au collectif" subtitle="part du BP équipe" rows={players} profilesById={profilesById} color={C.blue} valueOf={(row) => row.contributionPct} formatValue={(value) => `${value}%`} />
      <PlayerCompareBars title="Jeu offensif AV" subtitle="buts avant" rows={players} profilesById={profilesById} color={C.green} valueOf={(row) => row.goalAv} />
      <PlayerCompareBars title="Défense / gardien" subtitle="DEF + GB" rows={players} profilesById={profilesById} color={C.pink} valueOf={(row) => row.goalDef + row.goalGb} formatValue={(_, row) => `${row.goalDef}/${row.goalGb}`} />
      <PlayerCompareBars title="Actions spéciales" subtitle="demis, gamelles, pissettes, pêches, CSC" rows={players} profilesById={profilesById} color={C.orange} valueOf={PlayerFunTotal} />
      <PlayerRankingTable rows={players} profilesById={profilesById} />
    </>
  );
}

function normalizeEntityName(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamAccentColor(label?: string | null) {
  const name = normalizeEntityName(label);
  if (name.includes("gold")) return C.gold;
  if (name.includes("pink") || name.includes("rose")) return C.pink;
  if (name.includes("blue") || name.includes("bleu")) return C.blue;
  if (name.includes("green") || name.includes("vert")) return C.green;
  return C.gold;
}

function extractMatchSidePlayerIds(record: any, side: "A" | "B") {
  const suffix = side === "A" ? "A" : "B";
  const ids = new Set<string>();
  const roots = [record, record?.data, record?.payload, record?.payload?.data, record?.payload?.payload, record?.summary].filter(Boolean);
  const pushMany = (value: any) => {
    const list = Array.isArray(value) ? value : [];
    for (const item of list) {
      const id = String(item?.id || item?.playerId || item?.profileId || item || "").trim();
      if (id) ids.add(id);
    }
  };
  for (const root of roots) {
    pushMany(root?.[`team${suffix}ProfileIds`]);
    pushMany(root?.[`team${suffix}PlayerIds`]);
    pushMany(root?.[`team${suffix}Players`]);
    pushMany(root?.[`team${suffix}Profiles`]);
    pushMany(root?.[`players${suffix}`]);
    const players = Array.isArray(root?.players) ? root.players : Array.isArray(root?.summary?.players) ? root.summary.players : [];
    for (const player of players) {
      const team = String(player?.team || player?.side || player?.lane || "").toUpperCase();
      if (team === suffix) {
        const id = String(player?.id || player?.playerId || player?.profileId || "").trim();
        if (id) ids.add(id);
      }
    }
  }
  return Array.from(ids);
}

function AvatarStrip({ playerIds, profilesById, max = 4 }: { playerIds: string[]; profilesById: Map<string, Profile>; max?: number }) {
  const uniqueIds = Array.from(new Set((playerIds || []).map((id) => String(id || "").trim()).filter(Boolean))).slice(0, max);
  const extra = Math.max(0, (playerIds || []).length - uniqueIds.length);
  return (
    <div style={{ display: "flex", alignItems: "center", minHeight: 28 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {uniqueIds.map((id, index) => {
          const profile = profilesById.get(id) || ({ id, name: id } as any);
          return (
            <div key={`${id}-${index}`} style={{ marginLeft: index === 0 ? 0 : -7, borderRadius: 999, boxShadow: "0 0 0 2px rgba(8,9,14,.92)" }}>
              <ProfileAvatar profile={profile as any} size={24} />
            </div>
          );
        })}
      </div>
      {extra > 0 ? <span style={{ marginLeft: 7, color: C.dim, fontSize: 9, fontWeight: 900 }}>+{extra}</span> : null}
    </div>
  );
}

function ScoreKpiBox({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ minWidth: 54, borderRadius: 16, padding: "10px 8px", border: `1px solid ${color}66`, background: `linear-gradient(180deg,${color}20,rgba(255,255,255,.035))`, boxShadow: `0 0 16px ${color}20 inset`, textAlign: "center" }}>
      <div style={{ color, fontSize: 28, lineHeight: 1, fontWeight: 1000, textShadow: `0 0 12px ${color}55`, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function MatchLine({ match, go, team, teams, profilesById }: { match: BabyFootTeamScopeMatch; go: Props["go"]; team: BabyFootTeamDetailedAggregate; teams: BabyFootTeamDetailedAggregate[]; profilesById: Map<string, Profile> }) {
  const color = match.won ? C.green : match.draw ? C.gold : C.pink;
  const resultText = match.won ? "VICTOIRE" : match.draw ? "NUL" : "DÉFAITE";
  const diff = match.scoreFor - match.scoreAgainst;
  const opponent = teams.find((row) => row.key !== team.key && normalizeEntityName(row.label) === normalizeEntityName(match.opponentName)) || null;
  const leftColor = teamAccentColor(match.teamName || team.label);
  const rightColor = teamAccentColor(match.opponentName || opponent?.label || "");
  const leftPlayerIds = Array.from(new Set((match.playerIds || []).map(String).filter(Boolean)));
  const rightSide = match.side === "A" ? "B" : "A";
  const rightPlayerIds = extractMatchSidePlayerIds(match.record, rightSide).length
    ? extractMatchSidePlayerIds(match.record, rightSide)
    : Array.from(new Set((opponent?.rosterIds || []).map(String).filter(Boolean)));
  const dateLabel = match.date ? new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "Date inconnue";
  const timeLabel = match.date ? new Date(match.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <button type="button" onClick={() => go("babyfoot_end" as any, { matchId: match.id, matchPayload: match.record, from: "babyfoot_stats_teams" })} style={{ position: "relative", width: "100%", border: `1px solid ${color}44`, borderRadius: 22, padding: 0, background: `linear-gradient(135deg,${color}12,rgba(255,255,255,.035) 40%,rgba(0,0,0,.34))`, color: C.text, textAlign: "left", cursor: "pointer", overflow: "hidden", boxShadow: `0 12px 26px rgba(0,0,0,.30), inset 0 0 30px ${color}10` }}>
      {team?.logoUrl ? <img src={team.logoUrl} alt="" style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 120, height: 120, objectFit: "contain", opacity: .09, filter: "grayscale(0.05)" }} /> : null}
      {opponent?.logoUrl ? <img src={opponent.logoUrl} alt="" style={{ position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)", width: 120, height: 120, objectFit: "contain", opacity: .09, filter: "grayscale(0.05)" }} /> : null}
      <div style={{ position: "relative", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#07100b", background: color, borderRadius: 999, padding: "5px 10px", fontSize: 10, fontWeight: 1000, letterSpacing: .6 }}>{resultText}</span>
            <span style={{ color, border: `1px solid ${color}55`, background: `${color}12`, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000 }}>{match.mode.toUpperCase()}</span>
          </div>
          <div style={{ color: C.dim, fontSize: 10, fontWeight: 900, textAlign: "right" }}>{dateLabel}{timeLabel ? ` · ${timeLabel}` : ""}</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
            <div style={{ color: leftColor, fontSize: 18, fontWeight: 1000, lineHeight: 1.05, textShadow: `0 0 12px ${leftColor}55`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{match.teamName}</div>
            <AvatarStrip playerIds={leftPlayerIds} profilesById={profilesById} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "center" }}>
            <ScoreKpiBox value={match.scoreFor} color={leftColor} />
            <div style={{ color: C.muted, fontSize: 20, fontWeight: 1000, lineHeight: 1 }}>—</div>
            <ScoreKpiBox value={match.scoreAgainst} color={rightColor} />
          </div>

          <div style={{ minWidth: 0, display: "grid", gap: 6, justifyItems: "end" }}>
            <div style={{ color: rightColor, fontSize: 18, fontWeight: 1000, lineHeight: 1.05, textAlign: "right", textShadow: `0 0 12px ${rightColor}55`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{match.opponentName}</div>
            <div style={{ justifySelf: "end" }}><AvatarStrip playerIds={rightPlayerIds} profilesById={profilesById} /></div>
          </div>
        </div>

        <div style={{ marginTop: 11, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: C.dim, fontSize: 10, fontWeight: 850 }}>
            <span>{formatDurationLabel(match.durationMs)}</span>
          </div>
          <div style={{ borderRadius: 14, padding: "6px 10px", border: `1px solid ${color}66`, background: `radial-gradient(circle at 50% 25%,${color}20,rgba(0,0,0,.18))` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ color: C.muted, fontSize: 9, fontWeight: 1000, letterSpacing: .7 }}>DIFF</span>
              <span style={{ color, fontSize: 18, fontWeight: 1000 }}>{formatSigned(diff)}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function arrowButton(color: string, disabled = false): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${disabled ? "rgba(255,255,255,.10)" : color + "77"}`,
    background: disabled ? "rgba(255,255,255,.025)" : `radial-gradient(circle at 35% 30%,${color}28,rgba(0,0,0,.18))`,
    color: disabled ? "rgba(255,255,255,.22)" : color,
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 900,
    cursor: disabled ? "default" : "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: disabled ? "none" : `0 0 14px ${color}22`,
  };
}

export default function BabyFootStatsTeamsPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const profiles: Profile[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const requestedMode = String(params?.mode || "").toLowerCase();
  const initialMode: ModeKey = requestedMode === "2v2" ? "2v2" : requestedMode === "2v1" ? "2v1" : "all";
  const requestedPeriod = String(params?.period || params?.periodKey || "").toUpperCase();
  const initialPeriod: PeriodKey = requestedPeriod === "J" || requestedPeriod === "S" || requestedPeriod === "M" || requestedPeriod === "A" || requestedPeriod === "ARV" ? requestedPeriod : "ARV";
  const [period, setPeriod] = React.useState<PeriodKey>(initialPeriod);
  const [mode, setMode] = React.useState<ModeKey>(initialMode);
  const [tab, setTab] = React.useState<TeamTab>("dashboard");
  const [teamIndex, setTeamIndex] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(Boolean(params?.showFilters));
  const [historyRows, setHistoryRows] = React.useState<any[]>(() => Array.isArray((store as any)?.history) ? (store as any).history : []);
  const [catalogTeams, setCatalogTeams] = React.useState<BabyFootTeam[]>(() => loadBabyFootTeams());

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      const fromStore = Array.isArray((store as any)?.history) ? (store as any).history : [];
      try {
        const api: any = History as any;
        let fromHistory: any[] = [];
        if (typeof api.getAll === "function") fromHistory = await api.getAll();
        else if (typeof api.list === "function") {
          const light = await api.list();
          fromHistory = await Promise.all((Array.isArray(light) ? light : []).map(async (row: any) => {
            const id = String(row?.id || row?.matchId || "").trim();
            return id && typeof api.get === "function" ? ((await api.get(id).catch(() => null)) || row) : row;
          }));
        }
        if (alive) setHistoryRows(mergeRows(fromStore, fromHistory));
      } catch {
        if (alive) setHistoryRows(fromStore);
      }
    };
    const reloadTeams = () => setCatalogTeams(loadBabyFootTeams());
    load();
    window.addEventListener("dc-history-updated", load as EventListener);
    window.addEventListener("dc-stats-index-updated", load as EventListener);
    window.addEventListener("dc-teams-updated", reloadTeams as EventListener);
    window.addEventListener("dc:teams-changed", reloadTeams as EventListener);
    window.addEventListener("storage", load as EventListener);
    window.addEventListener("storage", reloadTeams as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("dc-history-updated", load as EventListener);
      window.removeEventListener("dc-stats-index-updated", load as EventListener);
      window.removeEventListener("dc-teams-updated", reloadTeams as EventListener);
      window.removeEventListener("dc:teams-changed", reloadTeams as EventListener);
      window.removeEventListener("storage", load as EventListener);
      window.removeEventListener("storage", reloadTeams as EventListener);
    };
  }, [store]);

  const bundle = React.useMemo(
    () => computeBabyFootTeamStatsBundle(historyRows, profiles, catalogTeams, { period: period as BabyFootPeriodFilter, mode: mode as BabyFootModeFilter }),
    [historyRows, profiles, catalogTeams, period, mode],
  );
  const teams = bundle.teams;
  const topKeys = React.useMemo(() => new Map(bundle.topTeams.map((team, index) => [team.key, index + 1])), [bundle.topTeams]);
  const profilesById = React.useMemo(() => {
    const map = new Map<string, Profile>();
    for (const profile of profiles) {
      const id = idOf(profile);
      if (id) map.set(id, profile);
    }
    return map;
  }, [profiles]);

  React.useEffect(() => setTeamIndex(0), [period, mode, teams.length]);

  const team = teams[clampIndex(teamIndex, teams.length)] || null;
  const rank = team ? topKeys.get(team.key) || 0 : 0;
  const periodLabel = PERIODS.find((item) => item.key === period)?.long || "À vie";
  const modeLabel = MODES.find((item) => item.key === mode)?.label || "TOUS";
  const primary = theme?.primary ?? C.gold;
  const rating = team ? babyFootTeamRating(team) : 0;
  const maxAction = Math.max(1, team?.goalAv || 0, team?.goalDef || 0, team?.goalGb || 0, team?.demi || 0, team?.demiBonus || 0, team?.gamelle || 0, team?.pecheOff || 0, team?.pecheDef || 0, team?.pissetteValid || 0, team?.pissetteRefused || 0, team?.csc || 0, team?.goalsConcededAv || 0, team?.goalsConcededDef || 0, team?.goalsConcededGb || 0);
  const totalPissettes = (team?.pissetteValid || 0) + (team?.pissetteRefused || 0);
  const totalPeches = (team?.pecheOff || 0) + (team?.pecheDef || 0);
  const visibleMatches = (team?.matchList || []).slice(0, tab === "matches" ? MATCHES_LIMIT : DASHBOARD_MATCH_LIMIT);

  return (
    <div className="bf-team-stats" style={{ position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw", minHeight: "100%", width: "100vw", maxWidth: "100vw", minWidth: 0, overflowX: "hidden", boxSizing: "border-box", padding: "18px max(10px, env(safe-area-inset-right)) 112px max(10px, env(safe-area-inset-left))", color: C.text, background: `radial-gradient(circle at 50% -10%,${primary}1f,transparent 38%)` }}>
      <style>{`
        html, body, #root { max-width: 100vw !important; overflow-x: hidden !important; }
        .container:has(.bf-team-stats) {
          width: 100vw !important;
          max-width: 100vw !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          overflow-x: hidden !important;
        }
        .bf-team-stats, .bf-team-stats * { box-sizing: border-box; min-width: 0; }
        .bf-team-stats { contain: layout paint; }
        .bf-team-title { font-size: 22px; }
        @media (max-width: 560px) {
          .bf-team-title { font-size: 19px !important; letter-spacing: .5px !important; }
          .bf-stats-teams-title-img { max-width: min(100%, 360px) !important; }
          .bf-team-subtitle { font-size: 10px !important; }
        }
        @media (max-width: 380px) {
          .bf-team-title { font-size: 17px !important; letter-spacing: .3px !important; }
        }
      `}</style>
      <div style={{ width: "min(100%, 720px)", maxWidth: "calc(100vw - 24px)", minWidth: 0, margin: "0 auto", display: "grid", gap: 12, overflow: "hidden" }}>
        <div style={{ position: "relative", minHeight: 62, display: "grid", placeItems: "center", paddingInline: 4 }}>
          <div style={{ position: "absolute", left: 4, top: 3 }}><BackDot onClick={() => go("stats" as any)} /></div>
          <div style={{ textAlign: "center", minWidth: 0, width: "100%", paddingInline: 56 }}>
            <HeaderTickerImage src={teamStatsTicker} alt="Team Statistics" fallbackLabel="TEAM STATISTICS" color={primary} />
          </div>
          <div style={{ position: "absolute", right: 4, top: 6 }}>
            <HeaderIconButton active={filtersOpen} onClick={() => setFiltersOpen((v) => !v)} title={filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}>
              <FilterGlyph />
            </HeaderIconButton>
          </div>
        </div>

        {filtersOpen ? <div style={cardStyle({ display: "grid", gap: 10, padding: 10 })}>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", overflow: "hidden" }}>
            {PERIODS.map((item) => <Pill key={item.key} active={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</Pill>)}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", overflow: "hidden" }}>
            {MODES.map((item) => <Pill key={item.key} active={mode === item.key} onClick={() => setMode(item.key)} color={C.blue}>{item.label}</Pill>)}
          </div>
        </div> : null}

        <div style={cardStyle()}>
          <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) 38px", alignItems: "center", gap: 8 }}>
            <button type="button" disabled={teams.length < 2} onClick={() => setTeamIndex((index) => clampIndex(index - 1, teams.length))} style={arrowButton(C.blue, teams.length < 2)}>‹</button>
            <div style={{ minWidth: 0, maxWidth: "100%", display: "grid", justifyItems: "center", textAlign: "center", overflow: "hidden" }}>
              <TeamHeroMedallion team={team} size={88} glowColor={primary} />
              <div style={{ marginTop: 10, color: primary, fontSize: 24, fontWeight: 1000, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textShadow: `0 0 9px ${primary}66` }}>{team?.label || "Aucune équipe"}</div>
              <div style={{ marginTop: 5, color: C.muted, fontSize: 10, fontWeight: 850 }}>{rank ? `Rang #${rank}` : "Non classée"} · Rating {rating} · {team?.matches || 0} matchs</div>
            </div>
            <button type="button" disabled={teams.length < 2} onClick={() => setTeamIndex((index) => clampIndex(index + 1, teams.length))} style={arrowButton(C.blue, teams.length < 2)}>›</button>
          </div>
          <div style={{ marginTop: 13, width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", overflow: "hidden", paddingBottom: 2 }}>
            {TABS.map((item) => <Pill key={item.key} active={tab === item.key} onClick={() => setTab(item.key)} color={item.color}>{item.label}</Pill>)}
          </div>
        </div>

        {team ? (
          <>
            {tab === "dashboard" && (
              <>
                <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(136px,100%),1fr))", gap: 10 }}>
                  <Kpi label="Ratio" value={formatBabyFootRatio(team.ratio)} color={C.gold} hint="BP / BC" />
                  <Kpi label="Win%" value={formatBabyFootPct01(team.winRate)} color={C.green} hint={`${team.wins}V / ${team.matches}MJ`} />
                  <Kpi label="BP / match" value={formatOne(team.avgGoalsFor)} color={C.blue} hint={`${team.goalsFor} buts pour`} />
                  <Kpi label="BC / match" value={formatOne(team.avgGoalsAgainst)} color={C.pink} hint={`${team.goalsAgainst} encaissés`} />
                  <Kpi label="Série" value={team.currentWinStreak} color={C.violet} hint={`record ${team.bestWinStreak}`} />
                  <Kpi label="Cleansheet" value={team.cleanSheets} color={C.green} hint="matchs sans encaisser" />
                </div>

                <div style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    {sectionTitle("Forme et efficacité", C.gold)}
                    <FormDots form={team.form} />
                  </div>
                  <TrendChart values={team.trend} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
                    <Kpi label="Diff" value={formatSigned(team.goalDiff)} color={team.goalDiff >= 0 ? C.green : C.pink} />
                    <Kpi label="Best BP" value={team.bestGoalsFor} color={C.blue} />
                    <Kpi label="Durée moy." value={formatDuration(team.avgDurationMs)} color={C.gold} />
                  </div>
                </div>

                <div style={cardStyle()}>
                  {sectionTitle("Répartition technique équipe", C.blue)}
                  <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
                    <MiniProgress label="Buts AV" value={team.goalAv} max={maxAction} color={C.blue} />
                    <MiniProgress label="Buts DEF" value={team.goalDef} max={maxAction} color={C.pink} />
                    <MiniProgress label="Buts GB" value={team.goalGb} max={maxAction} color={C.green} />
                    <MiniProgress label="Demis" value={team.demi} max={maxAction} color={C.violet} />
                    <MiniProgress label="Gamelles" value={team.gamelle} max={maxAction} color={C.gold} />
                    <MiniProgress label="Pissettes" value={totalPissettes} max={maxAction} color={C.orange} />
                    <MiniProgress label="Pêches" value={totalPeches} max={maxAction} color={C.blue} />
                    <MiniProgress label="CSC" value={team.csc} max={maxAction} color={C.pink} />
                  </div>
                </div>
              </>
            )}

            {tab === "dashboard" && (
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  {sectionTitle("Leaders rapides", C.blue)}
                  <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>ouvre Joueurs pour comparer</div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 8 }}>
                  <PlayerBadge row={topPlayer(team.players, (row) => row.personalPoints)} profilesById={profilesById} color={C.gold} label="Top scoreur" value={topPlayer(team.players, (row) => row.personalPoints)?.personalPoints ?? "—"} />
                  <PlayerBadge row={topPlayer(team.players, (row) => row.contributionPct)} profilesById={profilesById} color={C.blue} label="Contribution" value={topPlayer(team.players, (row) => row.contributionPct) ? `${topPlayer(team.players, (row) => row.contributionPct)?.contributionPct}%` : "—"} />
                  <PlayerBadge row={topPlayer(team.players, PlayerFunTotal)} profilesById={profilesById} color={C.orange} label="Actions spéciales" value={topPlayer(team.players, PlayerFunTotal) ? PlayerFunTotal(topPlayer(team.players, PlayerFunTotal) as BabyFootTeamPlayerContribution) : "—"} />
                </div>
              </div>
            )}

            {tab === "players" && <TeamPlayerLeaderboards team={team} profilesById={profilesById} />}

            {tab === "details" && (
              <>
                <div style={cardStyle()}>
                  {sectionTitle("Lecture détaillée", C.blue)}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(112px,100%),1fr))", gap: 8 }}>
                    <Kpi label="Diff / match" value={formatOne(team.goalDiff / Math.max(1, team.matches))} color={team.goalDiff >= 0 ? C.green : C.pink} hint="écart moyen" />
                    <Kpi label="Intensité" value={formatOne((team.goalsFor + team.goalsAgainst) / Math.max(1, team.matches))} color={C.gold} hint="buts totaux/M" />
                    <Kpi label="Clean rate" value={formatBabyFootPct01(team.matches ? team.cleanSheets / team.matches : 0)} color={C.green} hint={`${team.cleanSheets}/${team.matches} MJ`} />
                    <Kpi label="Fun / match" value={formatOne((team.demi + team.gamelle + totalPissettes + totalPeches + team.csc) / Math.max(1, team.matches))} color={C.orange} hint="actions spéciales" />
                  </div>
                </div>
                <div style={cardStyle()}>
                  {sectionTitle("Répartition technique équipe", C.blue)}
                  <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
                    <MiniProgress label="Buts AV" value={team.goalAv} max={maxAction} color={C.blue} />
                    <MiniProgress label="Buts DEF" value={team.goalDef} max={maxAction} color={C.pink} />
                    <MiniProgress label="Buts GB" value={team.goalGb} max={maxAction} color={C.green} />
                    <MiniProgress label="Demis" value={team.demi} max={maxAction} color={C.violet} />
                    <MiniProgress label="Gamelles" value={team.gamelle} max={maxAction} color={C.gold} />
                    <MiniProgress label="Pissettes" value={totalPissettes} max={maxAction} color={C.orange} />
                    <MiniProgress label="Pêches" value={totalPeches} max={maxAction} color={C.blue} />
                    <MiniProgress label="CSC" value={team.csc} max={maxAction} color={C.pink} />
                  </div>
                </div>
                <div style={cardStyle()}>
                  {sectionTitle("Stats avancées équipe", C.green)}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
                    <Kpi label="Points" value={team.points} color={C.gold} hint={`${team.wins}V/${team.draws}N/${team.losses}D`} />
                    <Kpi label="Rating" value={rating} color={C.gold} hint="forme globale" />
                    <Kpi label="Plus grosse série" value={team.bestWinStreak} color={C.violet} hint="wins consécutifs" />
                    <Kpi label="Plus gros BP" value={team.bestGoalsFor} color={C.blue} />
                    <Kpi label="Best diff" value={formatSigned(team.bestGoalDiff)} color={team.bestGoalDiff >= 0 ? C.green : C.pink} />
                    <Kpi label="Longest run" value={team.longestRun} color={C.orange} hint="buts de suite" />
                    <Kpi label="Égalisations" value={team.equalizations} color={C.blue} />
                    <Kpi label="Lead changes" value={team.leadChanges} color={C.violet} />
                    <Kpi label="Handicap" value={team.handicap} color={C.muted} />
                  </div>
                </div>
                <div style={cardStyle()}>
                  {sectionTitle("Buts encaissés par ligne", C.pink)}
                  <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
                    <MiniProgress label="BC AV" value={team.goalsConcededAv} max={maxAction} color={C.blue} />
                    <MiniProgress label="BC DEF" value={team.goalsConcededDef} max={maxAction} color={C.pink} />
                    <MiniProgress label="BC GB" value={team.goalsConcededGb} max={maxAction} color={C.green} />
                  </div>
                </div>
                <div style={cardStyle()}>
                  {sectionTitle("Fun / règles spéciales", C.orange)}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
                    <Kpi label="Demis" value={team.demi} color={C.violet} hint={`bonus +${team.demiBonus}`} />
                    <Kpi label="Gamelles" value={team.gamelle} color={C.gold} />
                    <Kpi label="Pissettes" value={`${team.pissetteValid}/${team.pissetteRefused}`} color={C.orange} hint="valid/refus" />
                    <Kpi label="Pêches" value={totalPeches} color={C.blue} hint={`${team.pecheOff} off · ${team.pecheDef} déf`} />
                    <Kpi label="CSC" value={team.csc} color={C.pink} />
                    <Kpi label="Pénos" value={team.penalties} color={C.violet} />
                  </div>
                </div>
              </>
            )}

            {(tab === "dashboard" || tab === "matches") && (
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  {sectionTitle("Derniers matchs de l'équipe", C.gold)}
                  <button type="button" onClick={() => go("babyfoot_stats_history" as any, { section: "teams", teamKey: team.key })} style={{ border: `1px solid ${C.gold}77`, color: C.gold, background: `${C.gold}14`, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 1000, cursor: "pointer" }}>HISTORIQUE COMPLET</button>
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {visibleMatches.map((match) => <MatchLine key={`${match.id}-${match.side}`} match={match} go={go} team={team} teams={teams} profilesById={profilesById} />)}
                  {team.matchList.length > visibleMatches.length ? <div style={{ padding: "4px 8px", color: C.dim, textAlign: "center", fontSize: 10, fontWeight: 850 }}>{team.matchList.length - visibleMatches.length} match(s) supplémentaire(s) dans l’historique complet.</div> : null}
                  {!team.matchList.length ? <div style={{ padding: 18, color: C.muted, textAlign: "center", fontWeight: 850 }}>Aucune partie Baby‑Foot trouvée pour cette équipe avec ces filtres.</div> : null}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={cardStyle()}>
            <div style={{ padding: 18, color: C.muted, textAlign: "center", fontWeight: 850 }}>Aucune équipe Baby‑Foot disponible.</div>
          </div>
        )}
      </div>
    </div>
  );
}
