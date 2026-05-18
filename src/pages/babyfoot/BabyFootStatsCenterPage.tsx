// ============================================
// src/pages/babyfoot/BabyFootStatsCenterPage.tsx
// Baby-Foot — Centre de statistiques (ossature VISUELLE identique à StatsHub Darts)
// Objectif (PATCH SAFE):
// - Même rendu/cheminement "Centre de statistiques" que StatsHub (Darts)
// - Onglets: MATCH / FUN / TRAINING / DÉFIS
// - Carrousel modes (1v1 / 2v2 / 2v1 / tous…)
// - Carrousel profils (si scope=locals)
// - Placeholders 100% anti-crash (branchage stats réelles ensuite)
// PATCH (MATCH + FILTRES):
// - Ajout filtres période J / S / M / A / ARV (UI type StatsHub)
// - Pages MATCH différenciées (1v1 / 2v2 / 2v1 / Tous) : +détails (toujours SAFE)
// ============================================

import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";
import { GoldPill } from "../../components/StatsPlayerDashboard";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";
import { buildBabyFootStatSections } from "../../lib/babyfootStatSections";
import type { BabyFootCompareMode, BabyFootStatRow } from "../../lib/babyfootStatSections";

// Effet shimmer à l'intérieur des lettres (même esprit que StatsHub Darts)
const statsNameCss = `
.bf-stats-name-wrapper{position:relative;display:inline-block;font-weight:900;}
.bf-stats-name-base{color:var(--bf-accent,#f6c256);text-shadow:none!important;}
.bf-stats-name-shimmer{position:absolute;inset:0;color:transparent;
  background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.08) 60%, transparent 100%);
  background-size:200% 100%;background-position:0% 0%;
  -webkit-background-clip:text;background-clip:text;
  animation: bfStatsNameShimmer 2.4s linear infinite;pointer-events:none;
}
@keyframes bfStatsNameShimmer{0%{background-position:-80% 0%}100%{background-position:120% 0%}}
`;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type TopTab = "match" | "fun" | "training" | "defis";
type PeriodKey = "J" | "S" | "M" | "A" | "ARV";

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: "match", label: "MATCH" },
  { key: "fun", label: "FUN" },
  { key: "training", label: "TRAINING" },
  { key: "defis", label: "DÉFIS" },
];

const PERIODS: { key: PeriodKey; label: string; hint: string }[] = [
  { key: "J", label: "J", hint: "Jour" },
  { key: "S", label: "S", hint: "Semaine" },
  { key: "M", label: "M", hint: "Mois" },
  { key: "A", label: "A", hint: "Année" },
  { key: "ARV", label: "ARV", hint: "À vie" },
];

const MODES_BY_TAB: Record<TopTab, { key: string; label: string }[]> = {
  match: [
    { key: "1v1", label: "1V1" },
    { key: "2v2", label: "2V2" },
    { key: "2v1", label: "2V1" },
    { key: "all", label: "TOUS" },
  ],
  fun: [
    { key: "fun", label: "FUN" },
    { key: "all", label: "TOUS" },
  ],
  training: [
    { key: "training", label: "TRAINING" },
    { key: "all", label: "TOUS" },
  ],
  defis: [
    { key: "defis", label: "DÉFIS" },
    { key: "all", label: "TOUS" },
  ],
};

function clampIndex(idx: number, len: number) {
  if (len <= 0) return 0;
  const m = idx % len;
  return m < 0 ? m + len : m;
}

function bfPayload(entry: any) {
  const p0 = entry?.payload ?? {};
  return p0?.payload ?? p0;
}

function bfMode(payload: any): "1v1" | "2v2" | "2v1" | "unknown" {
  const raw = String(payload?.mode ?? payload?.summary?.mode ?? "").trim();
  return raw === "1v1" || raw === "2v2" || raw === "2v1" ? raw : "unknown";
}

function bfCutoff(period: PeriodKey) {
  const now = Date.now();
  if (period === "J") return now - 24 * 3600 * 1000;
  if (period === "S") return now - 7 * 24 * 3600 * 1000;
  if (period === "M") return now - 30 * 24 * 3600 * 1000;
  if (period === "A") return now - 365 * 24 * 3600 * 1000;
  return null;
}

type WinnerSide = "left" | "right" | "tie" | "none";

function toNum(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getWinner(left: string | number, right: string | number, compare: BabyFootCompareMode = "high"): WinnerSide {
  if (compare === "none") return "none";
  const l = toNum(left);
  const r = toNum(right);
  if (l === r) return "tie";
  if (compare === "low") return l < r ? "left" : "right";
  return l > r ? "left" : "right";
}

function valueStyle(side: "left" | "right", isBest: boolean): React.CSSProperties {
  const activeColor = side === "left" ? "#d9ff3f" : "#ff67bd";
  const activeGlow = side === "left" ? "rgba(210,255,73,.42)" : "rgba(255,103,189,.34)";
  return {
    minWidth: 52,
    textAlign: side === "left" ? "left" : "right",
    fontSize: 20,
    lineHeight: 1,
    fontWeight: 1100,
    color: isBest ? activeColor : "#f4f5fb",
    textShadow: isBest ? `0 0 12px ${activeGlow}` : "none",
    fontVariantNumeric: "tabular-nums",
  };
}

function underlineHalf(side: "left" | "right", active: boolean) {
  const background = active
    ? side === "left"
      ? "linear-gradient(90deg, rgba(255,207,87,0.00) 0%, rgba(214,255,62,0.95) 62%, rgba(214,255,62,0.22) 100%)"
      : "linear-gradient(270deg, rgba(255,207,87,0.00) 0%, rgba(255,103,189,0.96) 62%, rgba(255,103,189,0.22) 100%)"
    : side === "left"
      ? "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.07) 72%, rgba(255,255,255,0.02) 100%)"
      : "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.07) 72%, rgba(255,255,255,0.02) 100%)";
  const boxShadow = active
    ? side === "left"
      ? "0 0 12px rgba(214,255,62,.18)"
      : "0 0 12px rgba(255,103,189,.16)"
    : "none";
  return <div style={{ flex: 1, height: 3, borderRadius: 999, background, boxShadow }} />;
}

function statLabel(label: string, winner: WinnerSide) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 1000, color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        {underlineHalf("left", winner === "left")}
        <div style={{ width: 10, height: 3, borderRadius: 999, background: "rgba(255,255,255,.08)" }} />
        {underlineHalf("right", winner === "right")}
      </div>
    </div>
  );
}

function boardRow(row: BabyFootStatRow) {
  const winner = getWinner(row.left, row.right, row.compare);
  const leftBest = winner === "left";
  const rightBest = winner === "right";
  return (
    <div key={row.label} style={{ display: "grid", gridTemplateColumns: "68px minmax(0,1fr) 68px", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={valueStyle("left", leftBest)}>{row.left}</div>
      {statLabel(row.label, winner)}
      <div style={{ ...valueStyle("right", rightBest), justifySelf: "end" }}>{row.right}</div>
    </div>
  );
}


function roundStat(value: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type MatchStatsBoardRow = BabyFootStatRow;
type MatchStatsBoardSection = { key: string; title: string; rows: MatchStatsBoardRow[] };

function sectionHeader(label: string) {
  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 4,
        padding: "5px 10px",
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(41,74,255,0.98), rgba(66,111,255,0.56))",
        boxShadow: "0 0 16px rgba(62,104,255,0.28)",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 1100,
        letterSpacing: 1.2,
        color: "#fff",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

function MatchStatsBoard({
  title,
  leftLabel,
  rightLabel,
  softCard,
  sections,
}: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  softCard: React.CSSProperties;
  sections: MatchStatsBoardSection[];
}) {
  return (
    <div style={softCard}>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,.68)" }}>
          Statistiques
        </div>
        <div style={{ fontSize: 16, fontWeight: 1000, color: "#fff", marginTop: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.62)", marginTop: 2 }}>
          {leftLabel} vs {rightLabel}
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.08)",
          background: "linear-gradient(180deg, rgba(10,11,16,.96), rgba(14,16,24,.92))",
          padding: "4px 12px 10px",
          overflow: "hidden",
        }}
      >
        {sections.map((section) => (
          <React.Fragment key={section.key}>
            {sectionHeader(section.title)}
            {section.rows.map((row) => boardRow(row))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function BabyFootStatsCenterPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  // scope: active | locals
  const scope = String(params?.scope || "active");

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  const active: Profile | null =
    profiles.find((p: any) => p.id === activeProfileId) ?? profiles[0] ?? null;

  // Palette proche de StatsHub
  const T = React.useMemo(() => {
    const accent = theme?.primary ?? "#f6c256";
    const accentGlow = theme?.primaryGlow ?? accent;
    const addAlpha = (c: string, aHex: string) => {
      // support: #RRGGBB
      if (typeof c === "string" && c.startsWith("#") && c.length === 7) return `${c}${aHex}`;
      return c;
    };
    return {
      accent,
      accentGlow,
      accent20: addAlpha(accent, "33"),
      accent30: addAlpha(accent, "4D"),
      accent40: addAlpha(accent, "66"),
      accent50: addAlpha(accent, "80"),
      text: theme?.text ?? "#fff",
      text30: "rgba(255,255,255,.30)",
      text40: "rgba(255,255,255,.40)",
      card: theme?.card ?? "rgba(20,20,24,.92)",
      borderSoft: theme?.borderSoft ?? "rgba(255,255,255,.10)",
    };
  }, [theme]);

  const [topTab, setTopTab] = React.useState<TopTab>("match");

  // --- Filtres période (J/S/M/A/ARV) ---
  const [period, setPeriod] = React.useState<PeriodKey>("M");

  // --- Carrousel modes (comme StatsHub, avec prev/next) ---
  const modes = MODES_BY_TAB[topTab] ?? MODES_BY_TAB.match;
  const [modeIdx, setModeIdx] = React.useState(0);

  React.useEffect(() => {
    setModeIdx(0);
  }, [topTab]);

  const currentMode = React.useMemo(() => {
    return modes[clampIndex(modeIdx, modes.length)] ?? { key: "all", label: "TOUS" };
  }, [modes, modeIdx]);

  const currentModeLabel = React.useMemo(() => {
    const left = TOP_TABS.find((x) => x.key === topTab)?.label ?? "MATCH";
    const right = currentMode?.label ?? "TOUS";
    return `${left} — ${right}`;
  }, [currentMode, topTab]);

  const canScrollModes = modes.length > 1;
  const goPrevMode = () => setModeIdx((i) => clampIndex(i - 1, modes.length));
  const goNextMode = () => setModeIdx((i) => clampIndex(i + 1, modes.length));

  // --- Carrousel profils (comme StatsHub) ---
  const filteredPlayers: Profile[] = React.useMemo(() => {
    if (scope === "locals") return profiles;
    return active ? [active] : [];
  }, [scope, profiles, active]);

  const [playerIdx, setPlayerIdx] = React.useState(0);

  React.useEffect(() => {
    setPlayerIdx(0);
  }, [scope, activeProfileId]);

  const selectedProfile: Profile | null =
    filteredPlayers[clampIndex(playerIdx, filteredPlayers.length)] ?? null;

  const canScrollPlayers = filteredPlayers.length > 1;
  const goPrevPlayer = () => setPlayerIdx((i) => clampIndex(i - 1, filteredPlayers.length));
  const goNextPlayer = () => setPlayerIdx((i) => clampIndex(i + 1, filteredPlayers.length));

  // --- Styles (copiés dans l'esprit de StatsHub) ---
  const statsPageWrap: React.CSSProperties = {
    width: "100%",
    maxWidth: 620,
    margin: "0 auto",
  };

  const statsStack: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    background: T.card,
    border: `1px solid ${T.borderSoft}`,
    boxShadow: `
      0 0 0 1px ${T.accent20},
      0 12px 26px rgba(0,0,0,.55)
    `,
    padding: 12,
  };

  const softCard: React.CSSProperties = {
    borderRadius: 18,
    background: "linear-gradient(180deg,rgba(18,18,22,.98),rgba(9,9,12,.96))",
    border: `1px solid ${T.text30}`,
    boxShadow: `
      0 0 0 1px ${T.accent20},
      0 10px 22px rgba(0,0,0,.55)
    `,
    padding: 12,
  };

  const filteredMatchHistory = React.useMemo(() => {
    const allHistory = Array.isArray((store as any)?.history) ? (store as any).history : [];
    const cutoff = bfCutoff(period);
    const selectedId = selectedProfile?.id ? String(selectedProfile.id) : "";

    return allHistory.filter((entry: any) => {
      if (entry?.sport !== "babyfoot" && entry?.kind !== "babyfoot") return false;
      if (entry?.status && entry.status !== "finished") return false;
      if (cutoff != null && Number(entry?.createdAt || 0) < cutoff) return false;
      const payload = bfPayload(entry);
      const mode = bfMode(payload);
      if (topTab === "match" && currentMode?.key && currentMode.key !== "all" && mode !== currentMode.key) return false;
      if (!selectedId) return true;
      const teamAIds = Array.isArray(payload?.teamAProfileIds) ? payload.teamAProfileIds.map(String) : [];
      const teamBIds = Array.isArray(payload?.teamBProfileIds) ? payload.teamBProfileIds.map(String) : [];
      return teamAIds.includes(selectedId) || teamBIds.includes(selectedId);
    });
  }, [currentMode?.key, period, selectedProfile?.id, store, topTab]);

  const kpis = React.useMemo(() => {
    const base = {
      matches: 0,
      goals: 0,
      conceded: 0,
      winrate: 0,
      gpm: 0,
      gcm: 0,
      diff: 0,
      cleanSheets: 0,
      comebacks: 0,
      decisiveGoals: 0,
      decisivePens: 0,
      momentum: 0,
      streakBest: 0,
      streakNow: 0,
      convPct: null as number | null,
      avgDuration: "00:00",
      avgGoalsPerMin: "—",
      sets: 0,
      legs: 0,
      avgGoalsPerLeg: 0,
      gamelle: 0,
      peche: 0,
      pecheOff: 0,
      pecheDef: 0,
      demi: 0,
      pissette: 0,
      demiBonus: 0,
      penalties: 0,
      handicap: 0,
      oppSets: 0,
      oppLegs: 0,
      oppGoals: 0,
      oppAvgGoalsPerLeg: 0,
      oppGamelle: 0,
      oppPeche: 0,
      oppDemi: 0,
      oppPissette: 0,
      oppPenalties: 0,
      oppHandicap: 0,
    };
    if (!filteredMatchHistory.length) return base;

    const selectedId = selectedProfile?.id ? String(selectedProfile.id) : "";
    let matches = 0;
    let wins = 0;
    let goals = 0;
    let conceded = 0;
    let cleanSheets = 0;
    let decisiveGoals = 0;
    let decisivePens = 0;
    let momentum = 0;
    let streakBest = 0;
    let streakNow = 0;
    let currentStreak = 0;
    let totalDuration = 0;
    let totalMinutes = 0;
    let sets = 0;
    let legs = 0;
    let gamelle = 0;
    let peche = 0;
    let pecheOff = 0;
    let pecheDef = 0;
    let demi = 0;
    let pissette = 0;
    let demiBonus = 0;
    let penalties = 0;
    let handicap = 0;
    let oppSets = 0;
    let oppLegs = 0;
    let oppGoals = 0;
    let oppGamelle = 0;
    let oppPeche = 0;
    let oppDemi = 0;
    let oppPissette = 0;
    let oppPenalties = 0;
    let oppHandicap = 0;

    for (const entry of filteredMatchHistory) {
      const payload = bfPayload(entry);
      const teamAIds = Array.isArray(payload?.teamAProfileIds) ? payload.teamAProfileIds.map(String) : [];
      const isA = selectedId ? teamAIds.includes(selectedId) : true;
      const rich = computeBabyFootRichStats(payload);
      const mine = isA ? rich.teamA : rich.teamB;
      const opp = isA ? rich.teamB : rich.teamA;
      const events = Array.isArray(payload?.events) ? payload.events : [];

      matches += 1;
      goals += mine.goals;
      conceded += mine.goalsConceded;
      if (mine.goalsConceded === 0) cleanSheets += 1;
      totalDuration += Number(payload?.summary?.durationMs ?? payload?.durationMs ?? 0) || 0;
      totalMinutes += (Number(payload?.summary?.durationMs ?? payload?.durationMs ?? 0) || 0) / 60000;
      sets += mine.sets;
      legs += mine.legs;
      gamelle += mine.gamelle;
      peche += mine.peche;
      pecheOff += mine.pecheOff;
      pecheDef += mine.pecheDef;
      demi += mine.demi;
      pissette += mine.pissette;
      demiBonus += mine.demiBonus;
      penalties += mine.penalties;
      handicap += mine.handicap;
      oppSets += opp.sets;
      oppLegs += opp.legs;
      oppGoals += opp.goals;
      oppGamelle += opp.gamelle;
      oppPeche += opp.peche;
      oppDemi += opp.demi;
      oppPissette += opp.pissette;
      oppPenalties += opp.penalties;
      oppHandicap += opp.handicap;

      if (mine.score > opp.score) {
        wins += 1;
        currentStreak += 1;
        if (currentStreak > streakBest) streakBest = currentStreak;
      } else {
        currentStreak = 0;
      }

      const decisive = events.filter((event: any) => event?.t === "goal" && event?.team === (isA ? "A" : "B") && (Number(event?.points || 1) > 0));
      decisiveGoals += decisive.length;
      decisivePens += mine.penalties;
      momentum += mine.longestRun >= 2 ? 1 : 0;
    }

    streakNow = currentStreak;
    const avgGoalsPerLeg = legs > 0 ? goals / legs : 0;
    const oppAvgGoalsPerLeg = oppLegs > 0 ? oppGoals / oppLegs : 0;

    return {
      ...base,
      matches,
      goals,
      conceded,
      winrate: matches > 0 ? Math.round((wins / matches) * 100) : 0,
      gpm: matches > 0 ? roundStat(goals / matches) : 0,
      gcm: matches > 0 ? roundStat(conceded / matches) : 0,
      diff: goals - conceded,
      cleanSheets,
      decisiveGoals,
      decisivePens,
      momentum,
      streakBest,
      streakNow,
      avgDuration: formatDuration(totalDuration / Math.max(1, matches)),
      avgGoalsPerMin: totalMinutes > 0 ? `${roundStat(goals / totalMinutes)}` : "—",
      sets,
      legs,
      avgGoalsPerLeg: roundStat(avgGoalsPerLeg),
      gamelle,
      peche,
      pecheOff,
      pecheDef,
      demi,
      pissette,
      demiBonus,
      penalties,
      handicap,
      oppSets,
      oppLegs,
      oppGoals,
      oppAvgGoalsPerLeg: roundStat(oppAvgGoalsPerLeg),
      oppGamelle,
      oppPeche,
      oppDemi,
      oppPissette,
      oppPenalties,
      oppHandicap,
    };
  }, [filteredMatchHistory, selectedProfile?.id]);

  const periodLabel = React.useMemo(() => {
    return PERIODS.find((p) => p.key === period)?.hint ?? "Mois";
  }, [period]);

  const matchBoard = React.useMemo(() => {
    const label = selectedProfile?.name || selectedProfile?.displayName || "Moi";
    const syntheticStats = {
      teamA: {
        name: label,
        score: kpis.goals,
        sets: kpis.sets,
        legs: kpis.legs,
        goals: kpis.goals,
        goalsConceded: kpis.conceded,
        avgGoalsPerLeg: kpis.avgGoalsPerLeg,
        goalDiff: kpis.diff,
        gamelle: kpis.gamelle,
        peche: kpis.peche,
        pecheOff: kpis.pecheOff,
        pecheDef: kpis.pecheDef,
        demi: kpis.demi,
        pissette: kpis.pissette,
        demiBonus: kpis.demiBonus,
        penalties: kpis.penalties,
        handicap: kpis.handicap,
        longestRun: kpis.streakBest,
      },
      teamB: {
        name: 'Adversaires',
        score: kpis.oppGoals,
        sets: kpis.oppSets,
        legs: kpis.oppLegs,
        goals: kpis.oppGoals,
        goalsConceded: kpis.goals,
        avgGoalsPerLeg: kpis.oppAvgGoalsPerLeg,
        goalDiff: -kpis.diff,
        gamelle: kpis.oppGamelle,
        peche: kpis.oppPeche,
        pecheOff: 0,
        pecheDef: 0,
        demi: kpis.oppDemi,
        pissette: kpis.oppPissette,
        demiBonus: 0,
        penalties: kpis.oppPenalties,
        handicap: kpis.oppHandicap,
        longestRun: 0,
      },
      setsEnabled: true,
      totalLegs: kpis.legs,
      totalGoals: kpis.goals + kpis.oppGoals,
      totalGamelle: kpis.gamelle + kpis.oppGamelle,
      totalPeche: kpis.peche + kpis.oppPeche,
      totalDemi: kpis.demi + kpis.oppDemi,
      totalPissette: kpis.pissette + kpis.oppPissette,
    };
    const sections = buildBabyFootStatSections(syntheticStats).map((section) => ({
      key: section.key,
      title: section.title,
      rows: section.rows.map((row) => ({ label: row.label, left: row.left, right: row.right, accent: row.accent, compare: row.compare })),
    }));
    return (
      <MatchStatsBoard
        title="Lecture rapide du mode"
        leftLabel={label}
        rightLabel="Adversaires"
        softCard={softCard}
        sections={sections}
      />
    );
  }, [kpis, selectedProfile?.displayName, selectedProfile?.name, softCard]);

  const matchContent = React.useMemo(() => {
    const modeKey = String(currentMode?.key || "all");

    // KPI packs (SAFE) — on différencie seulement le rendu/les libellés par mode
    if (modeKey === "1v1") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matchBoard}
          <div style={softCard}>
            <SectionTitle title={`Résumé 1V1 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts marqués" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 1v1 branchées sur l'historique baby-foot ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Attaque / Défense" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts / match" value={String(kpis.gpm)} />
              <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
              <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
              <KpiTile label="Buts / min" value={kpis.avgGoalsPerMin} />
              <KpiTile label="Gamelles" value={String(kpis.gamelle)} />
              <KpiTile label="Pêches" value={String(kpis.peche)} />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Moments clés" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts décisifs" value={String(kpis.decisiveGoals)} />
              <KpiTile label="Pénalties décisifs" value={String(kpis.decisivePens)} />
              <KpiTile label="Demi" value={String(kpis.demi)} />
              <KpiTile label="Pissettes" value={String(kpis.pissette)} />
              <KpiTile label="Pêche off." value={String(kpis.pecheOff)} />
              <KpiTile label="Pêche déf." value={String(kpis.pecheDef)} />
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              Notes : les “moments clés” seront calculés best-effort une fois les events disponibles.
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Séries" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Série en cours" value={String(kpis.streakNow)} />
              <KpiTile label="Meilleure série" value={String(kpis.streakBest)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
              <KpiTile label="Indice régularité" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (modeKey === "2v2") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matchBoard}
          <div style={softCard}>
            <SectionTitle title={`Résumé 2V2 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate équipe" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts équipe" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 2v2 : branchage équipe/composition ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Synergie" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Coéquipiers (top)" value="—" />
              <KpiTile label="Répartition buts" value="—" />
              <KpiTile label="Assists" value="—" />
              <KpiTile label="Actions clés" value="—" />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Qualité de jeu" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
              <KpiTile label="Comebacks" value={String(kpis.comebacks)} />
              <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              Notes : la “synergie” nécessite les compositions Team A / Team B dans l’historique.
            </div>
          </div>
        </div>
      );
    }

    if (modeKey === "2v1") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matchBoard}
          <div style={softCard}>
            <SectionTitle title={`Résumé 2V1 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts marqués" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 2v1 : affichage “avantage / handicap” ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Difficulté" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts / match" value={String(kpis.gpm)} />
              <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
              <KpiTile label="Comebacks" value={String(kpis.comebacks)} />
              <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Résilience" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Série en cours" value={String(kpis.streakNow)} />
              <KpiTile label="Meilleure série" value={String(kpis.streakBest)} />
              <KpiTile label="Buts décisifs" value={String(kpis.decisiveGoals)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
            </div>
          </div>
        </div>
      );
    }

    // TOUS
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {matchBoard}
        <div style={softCard}>
          <SectionTitle title={`Résumé (Tous modes MATCH) — ${periodLabel}`} T={T} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiTile label="Matchs" value={String(kpis.matches)} />
            <KpiTile label="Winrate global" value={`${kpis.winrate}%`} />
            <KpiTile label="Buts marqués" value={String(kpis.goals)} />
            <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
            <KpiTile label="Diff. buts" value={String(kpis.diff)} />
            <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
          </div>

          <SectionHint text="(Patch SAFE) — l’agrégation multi-modes sera branchée ensuite." />
        </div>

        <div style={softCard}>
          <SectionTitle title="Qualité de jeu" T={T} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiTile label="Buts / match" value={String(kpis.gpm)} />
            <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
            <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
            <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            Notes : la “conversion tirs” et les stats avancées arrivent une fois les événements disponibles.
          </div>
        </div>
      </div>
    );
  }, [currentMode, kpis, periodLabel, softCard, T]);

  const content = React.useMemo(() => {
    // IMPORTANT: chaque onglet a son propre contenu (même si placeholders SAFE)
    if (topTab === "fun") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Résumé FUN" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Parties FUN" value="0" />
              <KpiTile label="Points FUN" value="0" />
              <KpiTile label="Meilleur run" value="—" />
              <KpiTile label="Régularité" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats FUN à brancher sur l'historique baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Moments" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Séries" value="—" />
              <KpiTile label="Comebacks" value="—" />
              <KpiTile label="Buts express" value="—" />
              <KpiTile label="Actions clés" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (topTab === "training") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Training" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Sessions" value="0" />
              <KpiTile label="Temps total" value="00:00" />
              <KpiTile label="Objectifs" value="0" />
              <KpiTile label="Progression" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats Training à brancher sur sessions/records baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Précision" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Conversion tirs" value="—" />
              <KpiTile label="Buts / min" value="—" />
              <KpiTile label="Meilleur score" value="—" />
              <KpiTile label="Répétabilité" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (topTab === "defis") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Défis" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Défis joués" value="0" />
              <KpiTile label="Défis gagnés" value="0" />
              <KpiTile label="Série (streak)" value="—" />
              <KpiTile label="Difficulté" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats Défis à brancher sur les modes 'Défis' baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Trophées" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Badges" value="—" />
              <KpiTile label="Records" value="—" />
              <KpiTile label="Temps record" value="—" />
              <KpiTile label="Rang" value="—" />
            </div>
          </div>
        </div>
      );
    }

    // MATCH (différencié par mode)
    return matchContent;
  }, [topTab, softCard, T, matchContent]);

  return (
    <div style={{ padding: 16, paddingBottom: 80, background: theme?.bg, color: theme?.text }}>
      <style>{statsNameCss}</style>

      <div style={statsPageWrap}>
        <div style={statsStack}>
          {/* HEADER : titre centré + carrousel modes (IDENTIQUE StatsHub) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => go("stats")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: `1px solid ${T.text30}`,
                  background: "rgba(0,0,0,.45)",
                  color: T.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  flex: "0 0 auto",
                }}
                aria-label="Retour"
              >
                ←
              </button>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  color: T.accent,
                  textShadow: `0 0 10px ${T.accent}, 0 0 22px ${T.accentGlow}`,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                {t?.("bfStatsCenter.title", "Centre de statistiques") ?? "Centre de statistiques"}
              </div>

              <div style={{ width: 32, height: 32, flex: "0 0 auto" }} />
            </div>

            {/* Badge "Dashboard global" — placé SOUS le titre */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: `radial-gradient(circle at 0% 0%, ${T.accent40}, transparent 65%)`,
                  color: T.accent,
                  fontWeight: 900,
                  fontSize: 11,
                  letterSpacing: 0.9,
                  textTransform: "uppercase",
                  textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                  whiteSpace: "nowrap",
                }}
              >
                Dashboard global
              </div>
            </div>

            {/* Filtres période (J/S/M/A/ARV) — comme StatsHub */}
            <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 6 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {PERIODS.map((p) => (
                  <GoldPill
                    key={p.key}
                    active={period === p.key}
                    onClick={() => setPeriod(p.key)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 14,
                      fontSize: 12,
                      minWidth: 44,
                      justifyContent: "center",
                    }}
                    title={p.hint}
                  >
                    {p.label}
                  </GoldPill>
                ))}
              </div>
            </div>

            {/* Carrousel modes */}
            <div
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 18,
                border: `1px solid ${T.accent30}`,
                background: "linear-gradient(180deg,rgba(18,18,22,.98),rgba(9,9,12,.96))",
                boxShadow: `0 0 0 1px ${T.accent20}, 0 8px 20px rgba(0,0,0,.55)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={goPrevMode}
                disabled={!canScrollModes}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: canScrollModes
                    ? `radial-gradient(circle at 30% 30%, ${T.accent40}, transparent 55%)`
                    : "rgba(0,0,0,.45)",
                  color: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollModes ? "pointer" : "default",
                  fontSize: 13,
                }}
              >
                ◀
              </button>

              <div
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: `1px solid ${T.accent}`,
                  background: `radial-gradient(circle at 0% 0%, ${T.accent40}, transparent 65%)`,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.9,
                  color: T.accent,
                  textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentModeLabel}
              </div>

              <button
                type="button"
                onClick={goNextMode}
                disabled={!canScrollModes}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: canScrollModes
                    ? `radial-gradient(circle at 70% 30%, ${T.accent40}, transparent 55%)`
                    : "rgba(0,0,0,.45)",
                  color: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollModes ? "pointer" : "default",
                  fontSize: 13,
                }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* CARROUSEL PROFIL (identique StatsHub) */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              {/* Flèche gauche — MASQUÉE UNIQUEMENT POUR PROFIL ACTIF */}
              {scope !== "locals" ? (
                <div style={{ width: 26, height: 26 }} />
              ) : (
                <button
                  type="button"
                  onClick={goPrevPlayer}
                  disabled={!canScrollPlayers}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: `1px solid ${T.text30}`,
                    background: canScrollPlayers
                      ? `radial-gradient(circle at 30% 30%, ${T.text30}, transparent 55%)`
                      : "rgba(0,0,0,.45)",
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: canScrollPlayers ? "pointer" : "default",
                    fontSize: 13,
                  }}
                >
                  ◀
                </button>
              )}

              {/* Avatar + StarRing + nom */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  minWidth: 0,
                  overflow: "visible",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <StatsPlayerAvatar profile={selectedProfile} theme={theme} />

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: 0.9,
                        textTransform: "uppercase",
                        color: T.accent,
                        textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                      }}
                    >
                      {scope === "locals" ? "Profils locaux" : "Statistiques"}
                    </div>

                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className="bf-stats-name-wrapper" style={{ ...({ "--bf-accent": T.accent } as any) }}>
                        <span className="bf-stats-name-base">{selectedProfile?.name ?? "—"}</span>
                        <span className="bf-stats-name-shimmer">{selectedProfile?.name ?? "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flèche droite */}
              {scope !== "locals" ? (
                <div style={{ width: 26, height: 26 }} />
              ) : (
                <button
                  type="button"
                  onClick={goNextPlayer}
                  disabled={!canScrollPlayers}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: `1px solid ${T.text30}`,
                    background: canScrollPlayers
                      ? `radial-gradient(circle at 70% 30%, ${T.text30}, transparent 55%)`
                      : "rgba(0,0,0,.45)",
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: canScrollPlayers ? "pointer" : "default",
                    fontSize: 13,
                  }}
                >
                  ▶
                </button>
              )}
            </div>

            {/* Tabs (MATCH/FUN/TRAINING/DÉFIS) */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", overflowX: "auto" }}>
              {TOP_TABS.map((tt) => (
                <GoldPill
                  key={tt.key}
                  active={topTab === tt.key}
                  onClick={() => setTopTab(tt.key)}
                  style={{ padding: "7px 10px", borderRadius: 14 }}
                >
                  {tt.label}
                </GoldPill>
              ))}
            </div>
          </div>

          {/* CONTENU */}
          {content}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, T }: { title: string; T: any }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.9,
        textTransform: "uppercase",
        color: T.accent,
        textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
        marginBottom: 10,
      }}
    >
      {title}
    </div>
  );
}

function SectionHint({ text }: { text: string }) {
  return <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.65)" }}>{text}</div>;
}

function StatsPlayerAvatar({ profile, theme }: { profile: any; theme: any }) {
  return (
    <div style={{ position: "relative", width: 58, height: 58, overflow: "visible" }}>
      <div style={{ position: "absolute", inset: -6, pointerEvents: "none" }}>
        <ProfileStarRing size={70} score={0} theme={theme} />
      </div>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 999,
          overflow: "hidden",
          boxShadow: `0 0 0 2px ${theme?.primary}55, 0 0 18px ${theme?.primary}22`,
          background: "rgba(0,0,0,.35)",
        }}
      >
        <ProfileAvatar profile={profile} size={58} />
      </div>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(22,23,28,.92), rgba(17,18,22,.92))",
        border: "1px solid rgba(255,255,255,.10)",
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,.65)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 950, color: "#fff", marginTop: 4 }}>{value}</div>
    </div>
  );
}
