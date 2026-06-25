import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import { GoldPill } from "../../components/StatsPlayerDashboard";
import { History } from "../../lib/history";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";
import {
  extractBabyFootPlayerStatsRows,
  playerStatActivity,
  resolveBabyFootRecord,
  type BabyFootPlayerStatRow,
} from "../../lib/babyfootPlayerStats";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ARV";
type ModeKey = "1v1" | "2v2" | "2v1" | "all";
type TopTab = "match" | "fun" | "training" | "defis";

type MatchRow = {
  id: string;
  date: number;
  record: any;
  mode: string;
  team: "A" | "B";
  teamName: string;
  opponentName: string;
  scoreFor: number;
  scoreAgainst: number;
  won: boolean;
  draw: boolean;
  player: BabyFootPlayerStatRow | null;
  attributed: boolean;
  durationMs: number;
};

const C = {
  gold: "#F6C256",
  blue: "#47B5FF",
  pink: "#FF6FB5",
  green: "#7CFF9A",
  violet: "#B995FF",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,.66)",
  faint: "rgba(255,255,255,.10)",
  panel: "linear-gradient(180deg,rgba(17,18,22,.97),rgba(9,10,14,.97))",
  panelSoft: "linear-gradient(180deg,rgba(20,22,29,.96),rgba(11,12,18,.96))",
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

const TOP_TABS: Array<{ key: TopTab; label: string }> = [
  { key: "match", label: "MATCH" },
  { key: "fun", label: "FUN" },
  { key: "training", label: "TRAINING" },
  { key: "defis", label: "DÉFIS" },
];

function clampIndex(index: number, length: number) {
  if (!length) return 0;
  const value = index % length;
  return value < 0 ? value + length : value;
}

function num(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function idOf(profile: any) {
  return String(profile?.id || profile?.profileId || profile?.playerId || "").trim();
}

function playedAt(record: any) {
  const data = resolveBabyFootRecord(record);
  const candidates = [
    data.finishedAt,
    data.summary?.finishedAt,
    record?.finishedAt,
    record?.updatedAt,
    data.startedAt,
    data.createdAt,
    record?.createdAt,
  ];
  for (const candidate of candidates) {
    const numeric = num(candidate, 0);
    const value = numeric > 0 ? numeric : (typeof candidate === "string" ? Date.parse(candidate) : 0);
    if (value > 0) return value < 1e12 ? value * 1000 : value;
  }
  return 0;
}

function cutoff(period: PeriodKey) {
  const now = Date.now();
  if (period === "J") return now - 24 * 60 * 60 * 1000;
  if (period === "S") return now - 7 * 24 * 60 * 60 * 1000;
  if (period === "M") return now - 30 * 24 * 60 * 60 * 1000;
  if (period === "A") return now - 365 * 24 * 60 * 60 * 1000;
  return 0;
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(num(ms) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeRows(...sources: any[][]) {
  const byId = new Map<string, any>();
  const score = (row: any) => {
    const data = resolveBabyFootRecord(row);
    return (Array.isArray(data.events) ? data.events.length * 4 : 0)
      + Object.keys(data.playerStats || {}).length * 5
      + (Array.isArray(data.players) ? data.players.length : 0)
      + (row?.payload ? 3 : 0);
  };
  for (const source of sources) {
    for (const row of Array.isArray(source) ? source : []) {
      const id = String(row?.id || row?.matchId || "").trim();
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
    boxShadow: "0 12px 30px rgba(0,0,0,.40)",
    backdropFilter: "blur(10px)",
    ...extra,
  };
}

function sectionTitle(label: string, color = C.gold) {
  return (
    <div style={{
      marginBottom: 10,
      color,
      fontSize: 13,
      fontWeight: 1000,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      textShadow: `0 0 10px ${color}77`,
    }}>
      {label}
    </div>
  );
}

function Kpi({ label, value, color = C.text, hint }: { label: string; value: React.ReactNode; color?: string; hint?: string }) {
  return (
    <div style={{
      minWidth: 0,
      borderRadius: 16,
      padding: "10px 9px",
      background: "rgba(255,255,255,.035)",
      border: "1px solid rgba(255,255,255,.07)",
      textAlign: "center",
    }}>
      <div style={{ color: C.muted, fontSize: 9, fontWeight: 900, letterSpacing: .55, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, marginTop: 3, fontSize: 20, lineHeight: 1.05, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {hint ? <div style={{ color: "rgba(255,255,255,.42)", marginTop: 4, fontSize: 9 }}>{hint}</div> : null}
    </div>
  );
}

function StatGroup({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle(), borderColor: `${color}66`, boxShadow: `0 10px 26px rgba(0,0,0,.35), 0 0 16px ${color}18` }}>
      <div style={{ color, textAlign: "center", fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}>{children}</div>
    </div>
  );
}

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "62px minmax(0,1fr) 42px", gap: 8, alignItems: "center" }}>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 900 }}>{label}</div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${color},${color}77)`, boxShadow: `0 0 12px ${color}66` }} />
      </div>
      <div style={{ color, textAlign: "right", fontSize: 12, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const width = 420;
  const height = 128;
  const pad = 15;
  const safe = values.length ? values : [0];
  const max = Math.max(1, ...safe);
  const points = safe.map((value, index) => {
    const x = safe.length === 1 ? width / 2 : pad + (index / (safe.length - 1)) * (width - pad * 2);
    const y = height - pad - (value / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Courbe des points personnels" style={{ width: "100%", height: 132, display: "block" }}>
      <defs>
        <linearGradient id="bfTrendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity=".34" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[.25, .5, .75].map((ratio) => <line key={ratio} x1={pad} x2={width - pad} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,.07)" strokeWidth="1" />)}
      <polygon points={area} fill="url(#bfTrendArea)" />
      <polyline points={line} fill="none" stroke={C.gold} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${C.gold}88)` }} />
      {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="4" fill="#101115" stroke={C.gold} strokeWidth="3" />)}
    </svg>
  );
}

export default function BabyFootStatsCenterPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const scope = String(params?.scope || "active");
  const profiles: Profile[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const activeProfileId = String((store as any)?.activeProfileId || "");
  const active = profiles.find((profile: any) => idOf(profile) === activeProfileId) || profiles[0] || null;
  const selectableProfiles = scope === "locals" ? profiles : active ? [active] : profiles;

  const [profileIndex, setProfileIndex] = React.useState(0);
  const requestedMode = String(params?.mode || "").toLowerCase();
  const requestedModeIndex = Math.max(0, MODES.findIndex((item) => item.key === requestedMode));
  const [period, setPeriod] = React.useState<PeriodKey>("M");
  const [modeIndex, setModeIndex] = React.useState(requestedMode ? requestedModeIndex : MODES.length - 1);
  const [topTab, setTopTab] = React.useState<TopTab>("match");
  const [historyRows, setHistoryRows] = React.useState<any[]>(() => Array.isArray((store as any)?.history) ? (store as any).history : []);

  const profile = selectableProfiles[clampIndex(profileIndex, selectableProfiles.length)] || null;
  const profileId = idOf(profile);
  const mode = MODES[clampIndex(modeIndex, MODES.length)] || MODES[3];

  React.useEffect(() => setProfileIndex(0), [scope, activeProfileId]);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      const fromStore = Array.isArray((store as any)?.history) ? (store as any).history : [];
      try {
        const full = typeof (History as any).getAll === "function" ? await (History as any).getAll() : await (History as any).list();
        if (alive) setHistoryRows(mergeRows(fromStore, Array.isArray(full) ? full : []));
      } catch {
        if (alive) setHistoryRows(fromStore);
      }
    };
    load();
    window.addEventListener("dc-history-updated", load as EventListener);
    window.addEventListener("dc-stats-index-updated", load as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("dc-history-updated", load as EventListener);
      window.removeEventListener("dc-stats-index-updated", load as EventListener);
    };
  }, [store]);

  const matches = React.useMemo<MatchRow[]>(() => {
    if (!profileId) return [];
    const after = cutoff(period);
    const rows: MatchRow[] = [];
    for (const record of historyRows) {
      const data = resolveBabyFootRecord(record);
      const sport = String(data.sport || data.kind || record?.sport || record?.kind || "").toLowerCase();
      if (!sport.includes("babyfoot") && !sport.includes("baby-foot")) continue;
      if (record?.status && record.status !== "finished") continue;
      const date = playedAt(record);
      if (after && date < after) continue;
      const currentMode = String(data.mode || data.summary?.mode || "").toLowerCase();
      if (mode.key !== "all" && currentMode !== mode.key) continue;
      const teamAIds = Array.isArray(data.teamAProfileIds || data.summary?.teamAProfileIds) ? (data.teamAProfileIds || data.summary?.teamAProfileIds).map(String) : [];
      const teamBIds = Array.isArray(data.teamBProfileIds || data.summary?.teamBProfileIds) ? (data.teamBProfileIds || data.summary?.teamBProfileIds).map(String) : [];
      const team: "A" | "B" | null = teamAIds.includes(profileId) ? "A" : teamBIds.includes(profileId) ? "B" : null;
      if (!team) continue;
      const rich = computeBabyFootRichStats(data);
      const side = team === "A" ? rich.teamA : rich.teamB;
      const opponent = team === "A" ? rich.teamB : rich.teamA;
      const stats = extractBabyFootPlayerStatsRows(data);
      const playerStat = stats.find((row) => row.id === profileId || row.profileId === profileId || row.playerId === profileId) || null;
      const attributed = !!playerStat && playerStatActivity(playerStat) > 0;
      rows.push({
        id: String(record?.id || record?.matchId || data.id || data.matchId || `${date}`),
        date,
        record,
        mode: currentMode || "babyfoot",
        team,
        teamName: String(team === "A" ? data.teamA || data.summary?.teamA || rich.teamA.name : data.teamB || data.summary?.teamB || rich.teamB.name),
        opponentName: String(team === "A" ? data.teamB || data.summary?.teamB || rich.teamB.name : data.teamA || data.summary?.teamA || rich.teamA.name),
        scoreFor: num(side.score, num(side.goals, 0)),
        scoreAgainst: num(opponent.score, num(opponent.goals, 0)),
        won: num(side.score, 0) > num(opponent.score, 0),
        draw: num(side.score, 0) === num(opponent.score, 0),
        player: playerStat,
        attributed,
        durationMs: num(data.durationMs ?? data.summary?.durationMs, 0),
      });
    }
    return rows.sort((a, b) => b.date - a.date);
  }, [historyRows, mode.key, period, profileId]);

  const totals = React.useMemo(() => {
    const result = {
      matches: matches.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      teamPoints: 0,
      conceded: 0,
      personalPoints: 0,
      actualGoals: 0,
      av: 0,
      def: 0,
      gb: 0,
      demi: 0,
      bonusDemi: 0,
      gamelle: 0,
      pecheOff: 0,
      pecheDef: 0,
      pissetteValid: 0,
      pissetteRefused: 0,
      csc: 0,
      penalties: 0,
      penaltyGoals: 0,
      bestPersonal: 0,
      bestTeam: 0,
      avgDuration: 0,
      attributedMatches: 0,
      bestWinStreak: 0,
      currentWinStreak: 0,
    };
    let duration = 0;
    let streak = 0;
    const chronological = [...matches].sort((a, b) => a.date - b.date);
    for (const match of matches) {
      if (match.won) result.wins += 1;
      else if (match.draw) result.draws += 1;
      else result.losses += 1;
      result.teamPoints += match.scoreFor;
      result.conceded += match.scoreAgainst;
      result.bestTeam = Math.max(result.bestTeam, match.scoreFor);
      duration += match.durationMs;
      const row = match.player;
      if (row && match.attributed) {
        result.attributedMatches += 1;
        result.personalPoints += num(row.points, num(row.goals, 0));
        result.actualGoals += num(row.goals, 0);
        result.av += num(row.goalAv, 0);
        result.def += num(row.goalDef, 0);
        result.gb += num(row.goalGb, 0);
        result.demi += num(row.demi, 0);
        result.bonusDemi += num(row.demiBonus, 0);
        result.gamelle += num(row.gamelle, 0);
        result.pecheOff += num(row.pecheOff, 0);
        result.pecheDef += num(row.pecheDef, 0);
        result.pissetteValid += num(row.pissetteValid, 0);
        result.pissetteRefused += num(row.pissetteRefused, 0);
        result.csc += num(row.csc, 0);
        result.penalties += num(row.penalties, 0);
        result.penaltyGoals += num(row.penaltyGoals, 0);
        result.bestPersonal = Math.max(result.bestPersonal, num(row.points, num(row.goals, 0)));
      }
    }
    for (const match of chronological) {
      if (match.won) {
        streak += 1;
        result.bestWinStreak = Math.max(result.bestWinStreak, streak);
      } else streak = 0;
    }
    result.currentWinStreak = streak;
    result.winRate = result.matches ? Math.round((result.wins / result.matches) * 100) : 0;
    result.avgDuration = result.matches ? duration / result.matches : 0;
    return result;
  }, [matches]);

  const personalTrend = React.useMemo(() => [...matches].reverse().slice(-12).map((match) => match.attributed ? num(match.player?.points, num(match.player?.goals, 0)) : 0), [matches]);
  const goalDistributionTotal = totals.av + totals.def + totals.gb + totals.demi;
  const periodLabel = PERIODS.find((item) => item.key === period)?.long || "À vie";
  const unattributed = Math.max(0, totals.matches - totals.attributedMatches);

  return (
    <div style={{ minHeight: "100%", padding: "18px 14px 110px", color: C.text, background: "radial-gradient(circle at 50% -10%,rgba(246,194,86,.10),transparent 36%)" }}>
      <div style={{ width: "100%", maxWidth: 680, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ position: "relative", minHeight: 52, display: "grid", placeItems: "center" }}>
          <div style={{ position: "absolute", left: 0, top: 0 }}><BackDot onClick={() => go("statsHub" as any)} /></div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.gold, fontSize: 23, fontWeight: 1000, letterSpacing: 1, textShadow: `0 0 12px ${C.gold}99` }}>CENTRE DE STATISTIQUES</div>
            <div style={{ marginTop: 3, color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: 1.4 }}>BABY-FOOT</div>
          </div>
        </div>

        <div style={cardStyle({ textAlign: "center" })}>
          <div style={{ color: C.gold, fontSize: 17, fontWeight: 1000, letterSpacing: 1.1, textShadow: `0 0 10px ${C.gold}88` }}>BABY-FOOT MULTI</div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
            {PERIODS.map((item) => (
              <GoldPill key={item.key} active={period === item.key} onClick={() => setPeriod(item.key)} style={{ minWidth: item.key === "ARV" ? 56 : 42, padding: "7px 12px", fontSize: 11 }}>{item.label}</GoldPill>
            ))}
          </div>
        </div>

        <div style={cardStyle({ padding: 10 })}>
          <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", gap: 8, alignItems: "center" }}>
            <button type="button" onClick={() => setModeIndex((index) => clampIndex(index - 1, MODES.length))} style={arrowButton(C.gold)}>‹</button>
            <div style={{ borderRadius: 999, padding: "9px 12px", textAlign: "center", color: C.gold, fontSize: 14, fontWeight: 1000, letterSpacing: 1, border: `1px solid ${C.gold}88`, background: `linear-gradient(90deg,${C.gold}18,rgba(0,0,0,.15),${C.gold}18)`, boxShadow: `inset 0 0 18px ${C.gold}14` }}>MATCH — {mode.label}</div>
            <button type="button" onClick={() => setModeIndex((index) => clampIndex(index + 1, MODES.length))} style={arrowButton(C.gold)}>›</button>
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) 38px", alignItems: "center", gap: 8 }}>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index - 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>‹</button>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 68, height: 68, borderRadius: 999, padding: 3, background: `linear-gradient(180deg,${C.gold},${C.gold}33)`, boxShadow: `0 0 18px ${C.gold}44`, flex: "0 0 auto" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", background: "#111" }}><ProfileAvatar profile={profile} size={62} /></div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.blue, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase" }}>{scope === "locals" ? "Profils locaux" : "Statistiques"}</div>
                <div style={{ marginTop: 2, color: C.gold, fontSize: 21, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: `0 0 9px ${C.gold}66` }}>{(profile as any)?.name || (profile as any)?.displayName || "Aucun profil"}</div>
                <div style={{ marginTop: 3, color: C.muted, fontSize: 10 }}>{periodLabel} · {mode.label}</div>
              </div>
            </div>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index + 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>›</button>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {TOP_TABS.map((item) => <GoldPill key={item.key} active={topTab === item.key} onClick={() => setTopTab(item.key)} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{item.label}</GoldPill>)}
          </div>
        </div>

        {topTab !== "match" ? (
          <div style={cardStyle({ textAlign: "center", padding: 26 })}>
            <div style={{ color: C.gold, fontSize: 16, fontWeight: 1000 }}>{TOP_TABS.find((item) => item.key === topTab)?.label}</div>
            <div style={{ marginTop: 8, color: C.muted, fontSize: 13 }}>Aucune statistique enregistrée dans cette catégorie pour le moment.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              <StatGroup title="Cumul" color={C.blue}>
                <Kpi label="Matchs" value={totals.matches} color={C.blue} />
                <Kpi label="Victoires" value={totals.wins} color={C.blue} />
                <Kpi label="Points équipe" value={totals.teamPoints} color={C.blue} />
                <Kpi label="Points personnels" value={totals.personalPoints} color={C.blue} />
              </StatGroup>
              <StatGroup title="Moyennes" color={C.pink}>
                <Kpi label="Winrate" value={`${totals.winRate}%`} color={C.pink} />
                <Kpi label="Pts équipe / match" value={totals.matches ? (totals.teamPoints / totals.matches).toFixed(1) : "0.0"} color={C.pink} />
                <Kpi label="Pts perso / match" value={totals.attributedMatches ? (totals.personalPoints / totals.attributedMatches).toFixed(1) : "0.0"} color={C.pink} />
                <Kpi label="Durée moyenne" value={formatDuration(totals.avgDuration)} color={C.pink} />
              </StatGroup>
              <StatGroup title="Records" color={C.gold}>
                <Kpi label="Best perso" value={totals.bestPersonal} color={C.gold} />
                <Kpi label="Best équipe" value={totals.bestTeam} color={C.gold} />
                <Kpi label="Série victoires" value={totals.bestWinStreak} color={C.gold} />
                <Kpi label="Série actuelle" value={totals.currentWinStreak} color={C.gold} />
              </StatGroup>
              <StatGroup title="Attribution" color={C.green}>
                <Kpi label="Matchs détaillés" value={totals.attributedMatches} color={C.green} />
                <Kpi label="Non attribués" value={unattributed} color={unattributed ? C.pink : C.green} />
                <Kpi label="Buts réels" value={totals.actualGoals} color={C.green} />
                <Kpi label="Écart équipe" value={totals.teamPoints - totals.conceded >= 0 ? `+${totals.teamPoints - totals.conceded}` : totals.teamPoints - totals.conceded} color={C.green} />
              </StatGroup>
            </div>

            {unattributed > 0 ? (
              <div style={{ borderRadius: 16, padding: "10px 12px", border: `1px solid ${C.gold}55`, background: `${C.gold}0d`, color: C.muted, fontSize: 11, lineHeight: 1.45 }}>
                {unattributed} ancienne{unattributed > 1 ? "s" : ""} partie{unattributed > 1 ? "s" : ""} ne contient pas l’auteur de chaque action. Elles comptent pour les résultats d’équipe, mais ne sont pas inventées dans les statistiques individuelles.
              </div>
            ) : null}

            <div style={cardStyle()}>
              {sectionTitle("Répartition des actions", C.blue)}
              <div style={{ display: "grid", gap: 12 }}>
                <DistributionBar label="Buts AV" value={totals.av} total={goalDistributionTotal} color={C.blue} />
                <DistributionBar label="Buts DEF" value={totals.def} total={goalDistributionTotal} color={C.pink} />
                <DistributionBar label="Buts GB" value={totals.gb} total={goalDistributionTotal} color={C.green} />
                <DistributionBar label="Demis" value={totals.demi} total={goalDistributionTotal} color={C.violet} />
              </div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle("Courbe de forme — points personnels", C.gold)}
              <TrendChart values={personalTrend} />
              <div style={{ textAlign: "center", color: C.muted, fontSize: 10 }}>12 dernières parties de la période sélectionnée</div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle("Statistiques détaillées", C.green)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                <Kpi label="Bonus demi" value={totals.bonusDemi} color={C.violet} />
                <Kpi label="Gamelles" value={totals.gamelle} color={C.gold} />
                <Kpi label="Pêche off." value={totals.pecheOff} color={C.blue} />
                <Kpi label="Pêche déf." value={totals.pecheDef} color={C.pink} />
                <Kpi label="Pissettes OK" value={totals.pissetteValid} color={C.green} />
                <Kpi label="Pissettes refusées" value={totals.pissetteRefused} color={C.pink} />
                <Kpi label="CSC" value={totals.csc} color={C.pink} />
                <Kpi label="Penaltys" value={`${totals.penaltyGoals}/${totals.penalties}`} color={C.gold} />
                <Kpi label="Défaites" value={totals.losses} color={C.pink} />
              </div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle("Dernières parties", C.gold)}
              <div style={{ display: "grid", gap: 8 }}>
                {matches.slice(0, 8).map((match) => (
                  <button key={match.id} type="button" onClick={() => go("babyfoot_end" as any, { matchId: match.id, matchPayload: match.record, from: "babyfoot_stats_center" })} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 10, background: "rgba(255,255,255,.03)", color: "#fff", textAlign: "left", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: match.won ? C.green : match.draw ? C.gold : C.pink, fontSize: 11, fontWeight: 1000 }}>{match.won ? "VICTOIRE" : match.draw ? "NUL" : "DÉFAITE"} · {match.mode.toUpperCase()}</div>
                        <div style={{ marginTop: 3, fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.teamName} {match.scoreFor} — {match.scoreAgainst} {match.opponentName}</div>
                        <div style={{ marginTop: 3, color: C.muted, fontSize: 10 }}>{formatDate(match.date)} · {formatDuration(match.durationMs)}</div>
                      </div>
                      <div style={{ flex: "0 0 auto", minWidth: 58, textAlign: "center", borderRadius: 12, padding: "7px 8px", border: `1px solid ${match.attributed ? C.gold + "66" : C.faint}`, background: match.attributed ? `${C.gold}0d` : "rgba(255,255,255,.025)" }}>
                        <div style={{ color: C.muted, fontSize: 8, fontWeight: 900 }}>PTS PERSO</div>
                        <div style={{ color: match.attributed ? C.gold : C.muted, fontSize: 18, fontWeight: 1000 }}>{match.attributed ? num(match.player?.points, num(match.player?.goals, 0)) : "—"}</div>
                      </div>
                    </div>
                  </button>
                ))}
                {!matches.length ? <div style={{ padding: 18, textAlign: "center", color: C.muted }}>Aucune partie Baby-foot trouvée pour ces filtres.</div> : null}
              </div>
            </div>

            <button type="button" onClick={() => go("babyfoot_stats_history" as any)} style={{ minHeight: 52, borderRadius: 17, border: `1px solid ${C.gold}88`, background: `linear-gradient(180deg,${C.gold}22,rgba(15,15,18,.96))`, color: C.gold, fontWeight: 1000, letterSpacing: .8, cursor: "pointer", boxShadow: `0 0 18px ${C.gold}22` }}>OUVRIR L’HISTORIQUE BABY-FOOT</button>
          </>
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
