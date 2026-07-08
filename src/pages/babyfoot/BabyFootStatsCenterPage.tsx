import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import { History } from "../../lib/history";
import {
  babyFootRating,
  computeBabyFootLeaderboards,
  computeBabyFootProfileAggregate,
  formatBabyFootPct01,
  formatBabyFootRatio,
  normalizeBabyFootMatches,
  profileMatchesFromBabyFootMatches,
  type BabyFootModeFilter,
  type BabyFootPeriodFilter,
  type BabyFootPlayerAggregate,
  type BabyFootProfileMatch,
  type BabyFootLeaderboardBundle,
} from "../../lib/babyfootStatsAggregate";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ARV";
type ModeKey = "1v1" | "2v2" | "2v1" | "all";
type CenterTab = "dashboard" | "classements" | "details" | "history";
type RankingView = "general" | "ratio" | "win" | "attack" | "defense" | "clean" | "streak" | "scorers" | "teams";

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
  { key: "1v1", label: "1V1" },
  { key: "2v2", label: "2V2" },
  { key: "2v1", label: "2V1" },
  { key: "all", label: "TOUS" },
];

const CENTER_TABS: Array<{ key: CenterTab; label: string }> = [
  { key: "dashboard", label: "DASHBOARD" },
  { key: "classements", label: "CLASSEMENTS" },
  { key: "details", label: "DÉTAILS" },
  { key: "history", label: "MATCHS" },
];

const RANKING_VIEWS: Array<{ key: RankingView; label: string; color: string }> = [
  { key: "general", label: "GÉNÉRAL", color: C.gold },
  { key: "ratio", label: "RATIO", color: C.gold },
  { key: "win", label: "WIN%", color: C.green },
  { key: "attack", label: "ATTAQUE", color: C.blue },
  { key: "defense", label: "DÉFENSE", color: C.pink },
  { key: "clean", label: "CLEAN", color: C.green },
  { key: "streak", label: "SÉRIES", color: C.violet },
  { key: "scorers", label: "SCOREURS", color: C.orange },
  { key: "teams", label: "ÉQUIPES", color: C.gold },
];

function idOf(profile: any) {
  return String(profile?.id || profile?.profileId || profile?.playerId || "").trim();
}

function clampIndex(index: number, length: number) {
  if (!length) return 0;
  const value = index % length;
  return value < 0 ? value + length : value;
}

function num(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    <div style={{ minWidth: 0, borderRadius: 17, padding: "11px 9px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.075)", textAlign: "center" }}>
      <div style={{ color: C.muted, fontSize: 9, fontWeight: 950, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, marginTop: 4, fontSize: 22, lineHeight: 1.05, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {hint ? <div style={{ color: C.dim, marginTop: 4, fontSize: 9, fontWeight: 800 }}>{hint}</div> : null}
    </div>
  );
}

function MiniProgress({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0,1fr) 54px", gap: 9, alignItems: "center" }}>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 900 }}>{label}</div>
      <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 12px ${color}55` }} />
      </div>
      <div style={{ color, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{value}{suffix}</div>
    </div>
  );
}

function FormDots({ form }: { form: Array<"W" | "D" | "L"> }) {
  const list = form.length ? form : [];
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
      {list.length ? list.map((item, index) => {
        const color = item === "W" ? C.green : item === "D" ? C.gold : C.pink;
        return <span key={`${item}-${index}`} title={item} style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", color: "#07100b", background: color, fontSize: 10, fontWeight: 1000, boxShadow: `0 0 10px ${color}55` }}>{item}</span>;
      }) : <span style={{ color: C.dim, fontSize: 11, fontWeight: 900 }}>—</span>}
    </div>
  );
}

function TrendChart({ values }: { values: BabyFootPlayerAggregate["trend"] }) {
  const width = 440;
  const height = 154;
  const pad = 18;
  const safe = values.slice(-12);
  const maxAbs = Math.max(1, ...safe.map((row) => Math.abs(row.diff)), ...safe.map((row) => row.gf), ...safe.map((row) => row.ga));
  const zeroY = height / 2;
  const step = safe.length > 1 ? (width - pad * 2) / (safe.length - 1) : 0;
  const points = safe.map((row, index) => {
    const x = safe.length === 1 ? width / 2 : pad + index * step;
    const y = zeroY - (row.diff / maxAbs) * (height / 2 - pad);
    return [x, y] as const;
  });
  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Courbe de différence de buts" style={{ width: "100%", height: 154, display: "block" }}>
      <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,.16)" strokeWidth="1" />
      {[.25, .75].map((ratio) => <line key={ratio} x1={pad} x2={width - pad} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,.06)" strokeWidth="1" />)}
      {safe.map((row, index) => {
        const x = safe.length === 1 ? width / 2 : pad + index * step;
        const barW = Math.max(9, Math.min(18, step * .32 || 14));
        const gfH = (row.gf / maxAbs) * (height / 2 - pad);
        const gaH = (row.ga / maxAbs) * (height / 2 - pad);
        return (
          <g key={row.id || index}>
            <rect x={x - barW - 1} y={zeroY - gfH} width={barW} height={gfH} rx="4" fill={C.green} opacity=".72" />
            <rect x={x + 1} y={zeroY} width={barW} height={gaH} rx="4" fill={C.pink} opacity=".66" />
          </g>
        );
      })}
      {polyline ? <polyline points={polyline} fill="none" stroke={C.gold} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${C.gold}88)` }} /> : null}
      {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="4" fill="#101115" stroke={C.gold} strokeWidth="3" />)}
    </svg>
  );
}

function Board({ title, subtitle, rows, value, color = C.gold }: { title: string; subtitle?: string; rows: BabyFootPlayerAggregate[]; value: (row: BabyFootPlayerAggregate) => string; color?: string }) {
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        {sectionTitle(title, color)}
        {subtitle ? <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>{subtitle}</div> : null}
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.length ? rows.slice(0, 8).map((row, index) => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) auto", gap: 9, alignItems: "center", borderRadius: 14, padding: "8px 9px", border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.032)" }}>
            <div style={{ color, fontWeight: 1000, textAlign: "center" }}>{index + 1}</div>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <ProfileAvatar profile={row as any} size={28} />
              <div style={{ minWidth: 0, color: C.text, fontSize: 12, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
            </div>
            <div style={{ color, fontSize: 12, fontWeight: 1000 }}>{value(row)}</div>
          </div>
        )) : <div style={{ padding: 14, color: C.muted, fontSize: 12, textAlign: "center", fontWeight: 800 }}>Pas assez de données.</div>}
      </div>
    </div>
  );
}

function RankingCard({ rows }: { rows: BabyFootPlayerAggregate[] }) {
  return (
    <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
      <div style={{ padding: "14px 14px 10px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        {sectionTitle("Carte classement", C.gold)}
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>Pts · Diff · Ratio</div>
      </div>
      <div style={{ display: "grid" }}>
        {rows.length ? rows.slice(0, 12).map((row, index) => {
          const podiumColor = index === 0 ? C.gold : index === 1 ? C.blue : index === 2 ? C.orange : C.muted;
          return (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1.35fr) 54px 52px 52px", gap: 7, alignItems: "center", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.07)", background: index < 3 ? `linear-gradient(90deg,${podiumColor}15,transparent)` : "transparent" }}>
              <div style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", color: index < 3 ? "#14110a" : C.text, background: index < 3 ? podiumColor : "rgba(255,255,255,.08)", fontSize: 12, fontWeight: 1000 }}>{index + 1}</div>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <ProfileAvatar profile={row as any} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                  <div style={{ marginTop: 1, color: C.dim, fontSize: 9, fontWeight: 850 }}>{row.wins}V/{row.draws}N/{row.losses}D · {row.matches} MJ</div>
                </div>
              </div>
              <div style={{ color: C.gold, textAlign: "right", fontSize: 13, fontWeight: 1000 }}>{row.points}</div>
              <div style={{ color: row.goalDiff >= 0 ? C.green : C.pink, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{formatSigned(row.goalDiff)}</div>
              <div style={{ color: C.blue, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{formatBabyFootRatio(row.ratio)}</div>
            </div>
          );
        }) : <div style={{ padding: 18, color: C.muted, fontWeight: 850, textAlign: "center" }}>Aucun classement Baby‑Foot disponible.</div>}
      </div>
    </div>
  );
}

function TeamBoard({ rows }: { rows: BabyFootLeaderboardBundle["topTeams"] }) {
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        {sectionTitle("Classement équipes", C.gold)}
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>Pts · Diff · Ratio</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.length ? rows.slice(0, 10).map((team, index) => {
          const podiumColor = index === 0 ? C.gold : index === 1 ? C.blue : index === 2 ? C.orange : C.muted;
          return (
            <div key={team.key} style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr) 46px 46px 48px", gap: 8, alignItems: "center", borderRadius: 15, padding: "9px 10px", border: "1px solid rgba(255,255,255,.075)", background: index < 3 ? `linear-gradient(90deg,${podiumColor}15,rgba(255,255,255,.025))` : "rgba(255,255,255,.032)" }}>
              <div style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", color: index < 3 ? "#14110a" : C.text, background: index < 3 ? podiumColor : "rgba(255,255,255,.08)", fontSize: 12, fontWeight: 1000 }}>{index + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.label}</div>
                <div style={{ marginTop: 1, color: C.dim, fontSize: 9, fontWeight: 850 }}>{team.wins}V/{team.draws}N/{team.losses}D · {team.matches} MJ</div>
              </div>
              <div style={{ color: C.gold, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{team.points}</div>
              <div style={{ color: team.goalDiff >= 0 ? C.green : C.pink, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{formatSigned(team.goalDiff)}</div>
              <div style={{ color: C.blue, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{formatBabyFootRatio(team.ratio)}</div>
            </div>
          );
        }) : <div style={{ padding: 14, color: C.muted, textAlign: "center", fontWeight: 850 }}>Pas encore assez de compositions récurrentes.</div>}
      </div>
    </div>
  );
}

function RankingsDeck({ leaderboards, active, onChange }: { leaderboards: BabyFootLeaderboardBundle; active: RankingView; onChange: (view: RankingView) => void }) {
  const current = RANKING_VIEWS.find((item) => item.key === active) || RANKING_VIEWS[0];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={cardStyle({ padding: 10 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 9 }}>
          {sectionTitle("Classements", current.color)}
          <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>fais défiler les intitulés</div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" as any }}>
          {RANKING_VIEWS.map((item) => (
            <Pill key={item.key} active={active === item.key} onClick={() => onChange(item.key)} color={item.color}>{item.label}</Pill>
          ))}
        </div>
      </div>

      {active === "general" ? <RankingCard rows={leaderboards.topRanking} /> : null}
      {active === "ratio" ? <Board title="Top ratio" subtitle="BP/BC" rows={leaderboards.topRatio} value={(row) => formatBabyFootRatio(row.ratio)} color={C.gold} /> : null}
      {active === "win" ? <Board title="Top win%" subtitle="victoires" rows={leaderboards.topWinRate} value={(row) => formatBabyFootPct01(row.winRate)} color={C.green} /> : null}
      {active === "attack" ? <Board title="Attaque" subtitle="BP/match" rows={leaderboards.topGoalsPerMatch} value={(row) => formatOne(row.avgGoalsFor)} color={C.blue} /> : null}
      {active === "defense" ? <Board title="Défense" subtitle="BC/match" rows={leaderboards.topDefense} value={(row) => formatOne(row.avgGoalsAgainst)} color={C.pink} /> : null}
      {active === "clean" ? <Board title="Clean sheets" subtitle="zéro encaissé" rows={leaderboards.topCleanSheets} value={(row) => String(row.cleanSheets)} color={C.green} /> : null}
      {active === "streak" ? <Board title="Séries" subtitle="record" rows={leaderboards.topStreaks} value={(row) => `${row.bestWinStreak} wins`} color={C.violet} /> : null}
      {active === "scorers" ? <Board title="Scoreurs" subtitle="buts perso" rows={leaderboards.topPersonalScorers} value={(row) => String(row.personalPoints || row.actualGoals)} color={C.orange} /> : null}
      {active === "teams" ? <TeamBoard rows={leaderboards.topTeams} /> : null}
    </div>
  );
}

function MatchLine({ match, go }: { match: BabyFootProfileMatch; go: Props["go"] }) {
  const color = match.won ? C.green : match.draw ? C.gold : C.pink;
  return (
    <button type="button" onClick={() => go("babyfoot_end" as any, { matchId: match.id, matchPayload: match.record, from: "babyfoot_stats_center" })} style={{ width: "100%", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 10, background: "rgba(255,255,255,.03)", color: C.text, textAlign: "left", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color, fontSize: 11, fontWeight: 1000 }}>{match.won ? "VICTOIRE" : match.draw ? "NUL" : "DÉFAITE"} · {match.mode.toUpperCase()}</div>
          <div style={{ marginTop: 3, fontSize: 13, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.teamName} {match.scoreFor} — {match.scoreAgainst} {match.opponentName}</div>
          <div style={{ marginTop: 3, color: C.muted, fontSize: 10 }}>{formatDate(match.date)} · {formatDuration(match.durationMs)}</div>
        </div>
        <div style={{ flex: "0 0 auto", minWidth: 58, textAlign: "center", borderRadius: 12, padding: "7px 8px", border: `1px solid ${color}66`, background: `${color}0d` }}>
          <div style={{ color: C.muted, fontSize: 8, fontWeight: 900 }}>DIFF</div>
          <div style={{ color, fontSize: 18, fontWeight: 1000 }}>{formatSigned(match.scoreFor - match.scoreAgainst)}</div>
        </div>
      </div>
    </button>
  );
}

export default function BabyFootStatsCenterPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const profiles: Profile[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const activeProfileId = String((store as any)?.activeProfileId || "");
  const active = profiles.find((profile: any) => idOf(profile) === activeProfileId) || profiles[0] || null;
  const scope = String(params?.scope || "active");
  const selectableProfiles = scope === "locals" ? profiles : active ? [active] : profiles;

  const requestedMode = String(params?.mode || "").toLowerCase();
  const initialMode: ModeKey = requestedMode === "1v1" ? "1v1" : requestedMode === "2v2" ? "2v2" : requestedMode === "2v1" ? "2v1" : "all";
  const requestedPeriod = String(params?.period || params?.periodKey || "").toUpperCase();
  const initialPeriod: PeriodKey = requestedPeriod === "J" || requestedPeriod === "S" || requestedPeriod === "M" || requestedPeriod === "A" || requestedPeriod === "ARV" ? requestedPeriod : "ARV";
  const [period, setPeriod] = React.useState<PeriodKey>(initialPeriod);
  const [mode, setMode] = React.useState<ModeKey>(initialMode);
  const requestedTab = String(params?.tab || "").toLowerCase();
  const initialTab: CenterTab = requestedTab === "classements" ? "classements" : requestedTab === "details" ? "details" : requestedTab === "history" ? "history" : "dashboard";
  const [tab, setTab] = React.useState<CenterTab>(initialTab);
  const [rankingView, setRankingView] = React.useState<RankingView>("general");
  const [profileIndex, setProfileIndex] = React.useState(0);
  const [historyRows, setHistoryRows] = React.useState<any[]>(() => Array.isArray((store as any)?.history) ? (store as any).history : []);

  const profile = selectableProfiles[clampIndex(profileIndex, selectableProfiles.length)] || null;
  const profileId = idOf(profile);

  React.useEffect(() => setProfileIndex(0), [scope, activeProfileId]);

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
    load();
    window.addEventListener("dc-history-updated", load as EventListener);
    window.addEventListener("dc-stats-index-updated", load as EventListener);
    window.addEventListener("storage", load as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("dc-history-updated", load as EventListener);
      window.removeEventListener("dc-stats-index-updated", load as EventListener);
      window.removeEventListener("storage", load as EventListener);
    };
  }, [store]);

  const matches = React.useMemo(() => normalizeBabyFootMatches(historyRows, { period: period as BabyFootPeriodFilter, mode: mode as BabyFootModeFilter }), [historyRows, period, mode]);
  const leaderboards = React.useMemo(() => computeBabyFootLeaderboards(matches, profiles), [matches, profiles]);
  const profileAgg = React.useMemo(() => computeBabyFootProfileAggregate(matches, profiles, profileId), [matches, profiles, profileId]);
  const profileMatches = React.useMemo(() => profileMatchesFromBabyFootMatches(matches, profileId), [matches, profileId]);
  const rank = React.useMemo(() => leaderboards.topRanking.findIndex((row) => row.id === profileId) + 1, [leaderboards.topRanking, profileId]);
  const periodLabel = PERIODS.find((item) => item.key === period)?.long || "À vie";
  const modeLabel = MODES.find((item) => item.key === mode)?.label || "TOUS";
  const primary = theme?.primary ?? C.gold;
  const rating = babyFootRating(profileAgg);
  const maxAction = Math.max(1, profileAgg.goalAv, profileAgg.goalDef, profileAgg.goalGb, profileAgg.goalMil, profileAgg.demi, profileAgg.gamelle, profileAgg.pecheOff, profileAgg.pecheDef, profileAgg.pissetteValid, profileAgg.csc);

  return (
    <div style={{ minHeight: "100%", padding: "18px 14px 112px", color: C.text, background: `radial-gradient(circle at 50% -10%,${primary}1f,transparent 38%)` }}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ position: "relative", minHeight: 56, display: "grid", placeItems: "center" }}>
          <div style={{ position: "absolute", left: 0, top: 0 }}><BackDot onClick={() => go("stats" as any)} /></div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.gold, fontSize: 23, fontWeight: 1000, letterSpacing: 1, textShadow: `0 0 12px ${C.gold}99` }}>CENTRE DE STATISTIQUES</div>
            <div style={{ marginTop: 3, color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: 1.4 }}>BABY‑FOOT · {periodLabel} · {modeLabel}</div>
          </div>
        </div>

        <div style={cardStyle({ display: "grid", gap: 12 })}>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
            {PERIODS.map((item) => <Pill key={item.key} active={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</Pill>)}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
            {MODES.map((item) => <Pill key={item.key} active={mode === item.key} onClick={() => setMode(item.key)} color={C.blue}>{item.label}</Pill>)}
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) 38px", alignItems: "center", gap: 8 }}>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index - 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>‹</button>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: 999, padding: 3, background: `linear-gradient(180deg,${C.gold},${C.gold}33)`, boxShadow: `0 0 18px ${C.gold}44`, flex: "0 0 auto" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", background: "#111" }}><ProfileAvatar profile={profile} size={66} /></div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.blue, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>{scope === "locals" ? "Profils locaux" : "Profil actif"}</div>
                <div style={{ marginTop: 2, color: C.gold, fontSize: 22, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: `0 0 9px ${C.gold}66` }}>{(profile as any)?.name || (profile as any)?.displayName || "Aucun profil"}</div>
                <div style={{ marginTop: 3, color: C.muted, fontSize: 10 }}>{rank ? `Rang #${rank}` : "Non classé"} · Rating {rating} · {profileAgg.matches} matchs</div>
              </div>
            </div>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index + 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>›</button>
          </div>
          <div style={{ marginTop: 13, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {CENTER_TABS.map((item) => <Pill key={item.key} active={tab === item.key} onClick={() => setTab(item.key)} color={item.key === "classements" ? C.gold : C.green}>{item.label}</Pill>)}
          </div>
        </div>

        {(tab === "dashboard" || tab === "details") && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              <Kpi label="Ratio" value={formatBabyFootRatio(profileAgg.ratio)} color={C.gold} hint="BP / BC" />
              <Kpi label="Win%" value={formatBabyFootPct01(profileAgg.winRate)} color={C.green} hint={`${profileAgg.wins}V / ${profileAgg.matches}MJ`} />
              <Kpi label="BP / match" value={formatOne(profileAgg.avgGoalsFor)} color={C.blue} hint={`${profileAgg.goalsFor} buts pour`} />
              <Kpi label="BC / match" value={formatOne(profileAgg.avgGoalsAgainst)} color={C.pink} hint={`${profileAgg.goalsAgainst} encaissés`} />
              <Kpi label="Série" value={profileAgg.currentWinStreak} color={C.violet} hint={`record ${profileAgg.bestWinStreak}`} />
              <Kpi label="Cleansheet" value={profileAgg.cleanSheets} color={C.green} hint="matchs sans encaisser" />
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                {sectionTitle("Forme et efficacité", C.gold)}
                <FormDots form={profileAgg.form} />
              </div>
              <TrendChart values={profileAgg.trend} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                <Kpi label="Diff" value={formatSigned(profileAgg.goalDiff)} color={profileAgg.goalDiff >= 0 ? C.green : C.pink} />
                <Kpi label="Best BP" value={profileAgg.bestGoalsFor} color={C.blue} />
                <Kpi label="Durée moy." value={formatDuration(profileAgg.avgDurationMs)} color={C.gold} />
              </div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle("Répartition technique", C.blue)}
              <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
                <MiniProgress label="Buts AV" value={profileAgg.goalAv} max={maxAction} color={C.blue} />
                <MiniProgress label="Buts DEF" value={profileAgg.goalDef} max={maxAction} color={C.pink} />
                <MiniProgress label="Buts GB" value={profileAgg.goalGb} max={maxAction} color={C.green} />
                <MiniProgress label="Demis" value={profileAgg.demi} max={maxAction} color={C.violet} />
                <MiniProgress label="Gamelles" value={profileAgg.gamelle} max={maxAction} color={C.gold} />
                <MiniProgress label="Pissettes" value={profileAgg.pissetteValid} max={maxAction} color={C.orange} />
              </div>
            </div>
          </>
        )}

        {(tab === "dashboard" || tab === "classements") && (
          <RankingsDeck leaderboards={leaderboards} active={rankingView} onChange={setRankingView} />
        )}

        {tab === "details" && (
          <>
            <div style={cardStyle()}>
              {sectionTitle("Stats avancées", C.green)}
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                <Kpi label="Buts perso" value={profileAgg.personalPoints} color={C.gold} />
                <Kpi label="Attr." value={`${profileAgg.attributedMatches}/${profileAgg.matches}`} color={C.blue} />
                <Kpi label="Pénos" value={`${profileAgg.penaltyGoals}/${profileAgg.penalties}`} color={C.violet} />
                <Kpi label="Pêche off." value={profileAgg.pecheOff} color={C.blue} />
                <Kpi label="Pêche déf." value={profileAgg.pecheDef} color={C.pink} />
                <Kpi label="CSC" value={profileAgg.csc} color={C.pink} />
              </div>
            </div>
            <div style={cardStyle()}>
              {sectionTitle("Classement équipes", C.gold)}
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {leaderboards.topTeams.length ? leaderboards.topTeams.map((team, index) => (
                  <div key={team.key} style={{ borderRadius: 16, padding: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0, color: C.text, fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>#{index + 1} · {team.label}</div>
                      <div style={{ color: C.gold, fontWeight: 1000 }}>{team.points} pts</div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", color: C.muted, fontSize: 10, fontWeight: 900 }}>
                      <span>{team.matches} MJ</span><span>•</span><span>{formatBabyFootPct01(team.winRate)}</span><span>•</span><span>Diff {formatSigned(team.goalDiff)}</span><span>•</span><span>Ratio {formatBabyFootRatio(team.ratio)}</span>
                    </div>
                  </div>
                )) : <div style={{ padding: 14, color: C.muted, textAlign: "center", fontWeight: 850 }}>Pas encore assez de compositions récurrentes.</div>}
              </div>
            </div>
          </>
        )}

        {(tab === "dashboard" || tab === "history") && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              {sectionTitle("Derniers matchs", C.gold)}
              <button type="button" onClick={() => go("babyfoot_stats_history" as any)} style={{ border: `1px solid ${C.gold}77`, color: C.gold, background: `${C.gold}14`, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 1000, cursor: "pointer" }}>HISTORIQUE COMPLET</button>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {profileMatches.slice(0, tab === "history" ? 18 : 7).map((match) => <MatchLine key={match.id} match={match} go={go} />)}
              {!profileMatches.length ? <div style={{ padding: 18, color: C.muted, textAlign: "center", fontWeight: 850 }}>Aucune partie Baby‑Foot trouvée pour ces filtres.</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
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
