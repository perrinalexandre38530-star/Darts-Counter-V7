import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import RankingsTickerHeader from "../../components/RankingsTickerHeader";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";
import { History } from "../../lib/history";
import { loadBabyFootTeams, type BabyFootTeam } from "../../lib/petanqueTeamsStore";
import statsCenterTicker from "../../assets/tickers/ticker_statistics_center_universal.webp";
import { babyFootLevelScoreFromAggregate } from "../../lib/babyFootLevelStarring";
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
import { resolveBabyFootRecord } from "../../lib/babyfootPlayerStats";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ARV";
type ModeKey = "1v1" | "2v2" | "2v1" | "all";
type CenterTab = "dashboard" | "classements" | "details" | "history";
type DetailsSubTab = "solo" | "team";
type RankingView = "general" | "ratio" | "win" | "attack" | "defense" | "clean" | "streak" | "scorers" | "gamelles" | "pissettes" | "demis" | "csc" | "peche" | "rating" | "teams";

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

const DETAIL_SUB_TABS: Array<{ key: DetailsSubTab; label: string; subtitle: string; color: string }> = [
  { key: "solo", label: "INDIVIDUELLES", subtitle: "Solo · 1V1 uniquement", color: C.blue },
  { key: "team", label: "INDIV. PAR ÉQUIPE", subtitle: "2V2 + 2V1 réunis", color: C.green },
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
  { key: "gamelles", label: "GAMELLES", color: C.gold },
  { key: "pissettes", label: "PISSETTES", color: C.orange },
  { key: "demis", label: "DEMIS", color: C.violet },
  { key: "csc", label: "CSC", color: C.pink },
  { key: "peche", label: "PÊCHES", color: C.blue },
  { key: "rating", label: "RATING", color: C.gold },
  { key: "teams", label: "ÉQUIPES", color: C.gold },
];

const DASHBOARD_MATCH_LIMIT = 5;
const HISTORY_MATCH_LIMIT = 10;

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

type ScoreTimelineBucket = {
  key: string;
  label: string;
  short: string;
  color: string;
  count: number;
  pct: number;
};

const SCORE_TIMELINE_TEMPLATE: Array<Omit<ScoreTimelineBucket, "count" | "pct">> = [
  { key: "opening", label: "Entame", short: "0–20%", color: C.blue },
  { key: "build", label: "Montée", short: "20–40%", color: C.green },
  { key: "mid", label: "Cœur du match", short: "40–60%", color: C.gold },
  { key: "money", label: "Money time", short: "60–80%", color: C.orange },
  { key: "finish", label: "Finish", short: "80–100%", color: C.violet },
];

function normalizeLabelKey(value: any) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamLogoSrc(team: BabyFootTeam | null | undefined): string | null {
  if (!team) return null;
  return String(team.logoDataUrl || team.logoUrl || (team as any).avatarUrl || "").trim() || null;
}

function buildTeamLogoByName(teams: BabyFootTeam[]) {
  const out = new Map<string, string>();
  for (const team of Array.isArray(teams) ? teams : []) {
    const key = normalizeLabelKey((team as any)?.name);
    const src = teamLogoSrc(team);
    if (key && src && !out.has(key)) out.set(key, src);
  }
  return out;
}

function isTeamMode(mode: string) {
  return String(mode || "").toLowerCase() !== "1v1";
}

function getTeamLogoForLabel(label: string, teamLogoByName: Map<string, string>) {
  const key = normalizeLabelKey(label);
  return (key && teamLogoByName.get(key)) || null;
}

function matchStartTime(resolved: any, match: BabyFootProfileMatch) {
  const raw = num(resolved?.startedAt ?? resolved?.summary?.startedAt ?? resolved?.createdAt ?? resolved?.summary?.createdAt, 0);
  if (raw > 0) return raw;
  const duration = Math.max(0, num(resolved?.summary?.durationMs ?? resolved?.durationMs ?? match?.durationMs, 0));
  const finished = num(resolved?.finishedAt ?? resolved?.summary?.finishedAt ?? match?.date, 0);
  return finished > 0 && duration > 0 ? finished - duration : 0;
}

function eventElapsedMs(event: any, resolved: any, match: BabyFootProfileMatch, durationMs: number) {
  const directElapsed = num(event?.elapsedMs ?? event?.matchElapsedMs ?? event?.elapsed, 0);
  if (directElapsed > 0) return directElapsed;
  const rawAt = num(event?.at ?? event?.timestamp, 0);
  if (rawAt <= 0) return 0;
  // Anciennes sauvegardes possibles : at peut être déjà un temps relatif au match.
  if (rawAt <= durationMs * 1.25) return rawAt;
  // Sauvegardes actuelles : at est un timestamp Date.now(). On le ramène au temps joué.
  const start = matchStartTime(resolved, match);
  if (start > 0) return Math.max(0, rawAt - start);
  return Math.max(0, rawAt);
}

function buildPlayerScoringTimeline(matches: BabyFootProfileMatch[], profileId: string) {
  const pid = String(profileId || "").trim();
  const buckets: ScoreTimelineBucket[] = SCORE_TIMELINE_TEMPLATE.map((item) => ({ ...item, count: 0, pct: 0 }));
  let total = 0;
  let attributedMatches = 0;
  let unattributedMatches = 0;
  if (!pid) return { buckets, total, topLabels: [] as string[], attributedMatches, unattributedMatches };

  for (const match of Array.isArray(matches) ? matches : []) {
    const resolved = resolveBabyFootRecord(match?.record);
    const events = Array.isArray(resolved?.events) ? resolved.events : [];
    const durationMs = Math.max(1, num(resolved?.summary?.durationMs ?? resolved?.durationMs ?? match?.durationMs, 0));
    let hasAttributedGoal = false;
    let hasUnattributedTeamGoal = false;

    for (const event of events) {
      if (String(event?.t || event?.type || "") !== "goal") continue;
      const scorerId = String(event?.scorerId || event?.playerId || event?.profileId || "").trim();
      // Un but reste 1 but, même si l'action a consommé des bonus de demis.
      // Les bonus restent détaillés dans les stats Demis/Bonus, mais ne gonflent jamais le total de buts perso.
      const goalCount = 1;
      const eventTeam = String(event?.team || event?.side || "").toUpperCase();
      if (eventTeam === String(match?.team || "").toUpperCase() && !scorerId) hasUnattributedTeamGoal = true;
      const sideIds = extractMatchSidePlayerIds(match.record, match.team === "A" ? "A" : "B");
      const isSoloSide = !isTeamMode(match.mode) || sideIds.length <= 1;
      const belongsToPlayer = scorerId === pid || (!scorerId && isSoloSide && sideIds.includes(pid));
      if (!belongsToPlayer) continue;
      const elapsed = eventElapsedMs(event, resolved, match, durationMs);
      const ratio = Math.max(0, Math.min(0.999, elapsed / durationMs));
      const bucketIndex = Math.max(0, Math.min(buckets.length - 1, Math.floor(ratio * buckets.length)));
      buckets[bucketIndex].count += goalCount;
      total += goalCount;
      hasAttributedGoal = true;
    }

    if (hasAttributedGoal) attributedMatches += 1;
    else if (hasUnattributedTeamGoal) unattributedMatches += 1;
  }

  for (const bucket of buckets) bucket.pct = total > 0 ? bucket.count / total : 0;
  const topLabels = buckets
    .filter((bucket) => bucket.count > 0)
    .sort((a, b) => (b.count - a.count) || (b.pct - a.pct))
    .slice(0, 2)
    .map((bucket) => bucket.label);

  return { buckets, total, topLabels, attributedMatches, unattributedMatches };
}


type ProfileStatsSlice = {
  label: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  actualGoals: number;
  pointsTotal: number;
  demi: number;
  demiBonus: number;
  cleanSheets: number;
  goalAv: number;
  goalDef: number;
  goalGb: number;
  goalMil: number;
  gamelle: number;
  pissetteValid: number;
  pissetteRefused: number;
  pecheOff: number;
  pecheDef: number;
  csc: number;
  parachute: number;
};

function emptyProfileStatsSlice(label: string): ProfileStatsSlice {
  return {
    label,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    actualGoals: 0,
    pointsTotal: 0,
    demi: 0,
    demiBonus: 0,
    cleanSheets: 0,
    goalAv: 0,
    goalDef: 0,
    goalGb: 0,
    goalMil: 0,
    gamelle: 0,
    pissetteValid: 0,
    pissetteRefused: 0,
    pecheOff: 0,
    pecheDef: 0,
    csc: 0,
    parachute: 0,
  };
}

function realGoalsOf(row: any): number {
  return Math.max(0, num(row?.actualGoals, num(row?.goals, 0)));
}

function totalPointsOf(row: any): number {
  const realGoals = realGoalsOf(row);
  const points = num(row?.points, 0);
  const demiBonus = Math.max(0, num(row?.demiBonus, 0));
  // points = score réellement crédité au joueur quand la sauvegarde le fournit.
  // fallback : vrais buts + bonus demis pour les anciennes parties.
  return Math.max(points, realGoals + demiBonus, realGoals);
}

function bumpProfileStatsSlice(slice: ProfileStatsSlice, match: BabyFootProfileMatch) {
  const row: any = match.player || {};
  slice.matches += 1;
  if (match.won) slice.wins += 1;
  else if (match.draw) slice.draws += 1;
  else slice.losses += 1;
  slice.goalsFor += num(match.scoreFor, 0);
  slice.goalsAgainst += num(match.scoreAgainst, 0);
  slice.goalDiff += num(match.scoreFor, 0) - num(match.scoreAgainst, 0);
  if (num(match.scoreAgainst, 0) === 0) slice.cleanSheets += 1;
  slice.actualGoals += realGoalsOf(row);
  slice.pointsTotal += totalPointsOf(row);
  slice.demi += Math.max(0, num(row.demi, 0));
  slice.demiBonus += Math.max(0, num(row.demiBonus, 0));
  slice.goalAv += num(row.goalAv, 0);
  slice.goalDef += num(row.goalDef, 0);
  slice.goalGb += num(row.goalGb, 0);
  slice.goalMil += num(row.goalMil, 0);
  slice.gamelle += num(row.gamelle, 0);
  slice.pissetteValid += num(row.pissetteValid, 0);
  slice.pissetteRefused += num(row.pissetteRefused, 0);
  slice.pecheOff += num(row.pecheOff, 0);
  slice.pecheDef += num(row.pecheDef, 0);
  slice.csc += num(row.csc, 0);
  slice.parachute += num(row.parachute, 0);
}

function buildProfileModeSlices(matches: BabyFootProfileMatch[]) {
  const all = emptyProfileStatsSlice("TOTAL");
  const solo = emptyProfileStatsSlice("1V1");
  const team = emptyProfileStatsSlice("ÉQUIPE");
  const twoVTwo = emptyProfileStatsSlice("2V2");
  const twoVOne = emptyProfileStatsSlice("2V1");

  for (const match of Array.isArray(matches) ? matches : []) {
    const modeKey = String(match.mode || "").toLowerCase();
    bumpProfileStatsSlice(all, match);
    if (modeKey === "1v1") bumpProfileStatsSlice(solo, match);
    if (modeKey === "2v2") {
      bumpProfileStatsSlice(team, match);
      bumpProfileStatsSlice(twoVTwo, match);
    } else if (modeKey === "2v1") {
      bumpProfileStatsSlice(team, match);
      bumpProfileStatsSlice(twoVOne, match);
    } else if (isTeamMode(modeKey)) {
      bumpProfileStatsSlice(team, match);
    }
  }

  return { all, solo, team, twoVTwo, twoVOne };
}

function winPctOfSlice(slice: ProfileStatsSlice) {
  return slice.matches ? slice.wins / slice.matches : 0;
}

function avgForSlice(slice: ProfileStatsSlice, value: number) {
  return slice.matches ? value / slice.matches : 0;
}

function ratioForSlice(slice: ProfileStatsSlice): number | null {
  if (!slice.matches) return null;
  if (slice.goalsAgainst <= 0) return slice.goalsFor > 0 ? slice.goalsFor : null;
  return slice.goalsFor / slice.goalsAgainst;
}

function ratingForSlice(slice: ProfileStatsSlice) {
  return babyFootRating({
    matches: slice.matches,
    winRate: winPctOfSlice(slice),
    goalDiff: slice.goalDiff,
    avgGoalsFor: avgForSlice(slice, slice.goalsFor),
    avgGoalsAgainst: avgForSlice(slice, slice.goalsAgainst),
    cleanSheets: slice.cleanSheets,
  });
}

function matchesForDetailsSubTab(matches: BabyFootProfileMatch[], subTab: DetailsSubTab) {
  return (Array.isArray(matches) ? matches : []).filter((match) => {
    const modeKey = String(match.mode || "").toLowerCase();
    return subTab === "solo" ? modeKey === "1v1" : modeKey === "2v2" || modeKey === "2v1" || (modeKey !== "1v1" && isTeamMode(modeKey));
  });
}

function ModeSliceCard({ slice, color }: { slice: ProfileStatsSlice; color: string }) {
  return (
    <div style={{ border: `1px solid ${color}33`, borderRadius: 16, padding: 10, background: `linear-gradient(180deg,${color}10,rgba(255,255,255,.035))`, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div style={{ color, fontSize: 12, fontWeight: 1000, letterSpacing: .7 }}>{slice.label}</div>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>{slice.matches} MJ</div>
      </div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <MiniStat label="Win" value={formatBabyFootPct01(winPctOfSlice(slice))} color={C.green} />
        <MiniStat label="Diff" value={formatSigned(slice.goalDiff)} color={slice.goalDiff >= 0 ? C.green : C.pink} />
        <MiniStat label="Buts" value={slice.actualGoals} color={C.gold} />
        <MiniStat label="Points" value={slice.pointsTotal} color={C.blue} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ borderRadius: 12, padding: "7px 8px", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.07)", minWidth: 0 }}>
      <div style={{ color: C.dim, fontSize: 8, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 1000, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
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
    return <img src={src} alt={alt} className="bf-stats-center-title-img" style={{ width: "100%", maxWidth: "none", height: "auto", display: "block", margin: "0 auto", filter: `drop-shadow(0 0 16px ${color}28)` }} draggable={false} />;
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, maxWidth: "100%", minWidth: 0, padding: "10px 16px", borderRadius: 18, border: `1px solid ${color}66`, background: `linear-gradient(90deg,rgba(0,0,0,.18),${color}16,rgba(0,0,0,.18))`, boxShadow: `0 0 18px ${color}22, inset 0 0 18px ${color}14` }}>
      <span style={{ flex: "0 0 34px", height: 6, borderRadius: 999, background: `linear-gradient(90deg,transparent,${color})`, opacity: .9 }} />
      <span className="bf-stats-center-title" style={{ color, fontSize: 21, lineHeight: 1.05, fontWeight: 1000, letterSpacing: .9, textTransform: "uppercase", textShadow: `0 0 14px ${color}99`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fallbackLabel || alt}</span>
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

function StatHeroAvatar({ profile, size = 84, glowColor = C.gold, showStars = false, starAvg3D = 0 }: { profile: any; size?: number; glowColor?: string; showStars?: boolean; starAvg3D?: number }) {
  const avg3d = Math.max(0, Math.min(180, Number(starAvg3D || 0) || 0));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto", overflow: "visible" }}>
      <ProfileAvatar
        profile={profile}
        size={size}
        ringColor={glowColor}
        showStars={false}
      />
      {showStars && avg3d > 0 ? (
        <div style={{ position: "absolute", inset: 0, transform: "translateX(2px) translateY(-1px)", pointerEvents: "none" }}>
          <ProfileStarRing
            anchorSize={size}
            avg3d={avg3d}
            gapPx={-2}
            starSize={14}
            stepDeg={10}
            animateGlow
          />
        </div>
      ) : null}
    </div>
  );
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

function GhostAvatarBackdrop({
  playerIds,
  profilesById,
  side,
  imageSrc,
}: {
  playerIds: string[];
  profilesById: Map<string, Profile>;
  side: "left" | "right";
  imageSrc?: string | null;
}) {
  const uniqueIds = Array.from(new Set((playerIds || []).map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 3);
  if (!imageSrc && !uniqueIds.length) return null;
  const size = imageSrc ? 144 : 164;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "50%",
        [side]: imageSrc ? -18 : -30,
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: side === "left" ? "row" : "row-reverse",
        alignItems: "center",
        pointerEvents: "none",
        opacity: imageSrc ? .28 : .32,
        filter: imageSrc ? "saturate(1.15)" : "saturate(1.05)",
      } as React.CSSProperties}
    >
      {imageSrc ? (
        <div style={{ width: size, height: size, borderRadius: 30, overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,.05)" }}>
          <img src={imageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ) : uniqueIds.map((id, index) => {
        const profile = profilesById.get(id) || ({ id, name: id } as any);
        return (
          <div key={`${side}-${id}-${index}`} style={{ marginLeft: side === "left" && index > 0 ? -34 : 0, marginRight: side === "right" && index > 0 ? -34 : 0, transform: `scale(${1 - index * 0.08})` }}>
            <div style={{ width: size, height: size, borderRadius: 999, overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,.05)" }}>
              <ProfileAvatar profile={profile as any} size={size} />
            </div>
          </div>
        );
      })}
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
    <div style={{ minWidth: 0, width: "100%", maxWidth: "100%", display: "grid", gridTemplateColumns: "minmax(58px,82px) minmax(0,1fr) minmax(34px,48px)", gap: 7, alignItems: "center" }}>
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
  const padX = 18;
  const padTop = 18;
  const padBottom = 28;
  const safe = values.slice(-DASHBOARD_MATCH_LIMIT);
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
        const maxBarW = Math.max(7, Math.min(17, step * .22));
        const gap = Math.max(3, Math.min(6, step * .07));
        const center = groupX + step / 2;
        const gfH = Math.max(0, (row.gf / maxGoals) * plotHeight);
        const gaH = Math.max(0, (row.ga / maxGoals) * plotHeight);
        return (
          <g key={row.id || index}>
            <rect x={center - maxBarW - gap / 2} y={baseY - gfH} width={maxBarW} height={gfH} rx="4" fill={C.green} opacity=".76" />
            <rect x={center + gap / 2} y={baseY - gaH} width={maxBarW} height={gaH} rx="4" fill={C.pink} opacity=".70" />
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
            <div key={row.id} style={{ minWidth: 0, width: "100%", display: "grid", gridTemplateColumns: "30px minmax(0,1fr) minmax(32px,44px) minmax(36px,46px) minmax(38px,48px)", gap: 5, alignItems: "center", padding: "10px 10px", borderTop: "1px solid rgba(255,255,255,.07)", background: index < 3 ? `linear-gradient(90deg,${podiumColor}15,transparent)` : "transparent" }}>
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
            <div key={team.key} style={{ minWidth: 0, width: "100%", display: "grid", gridTemplateColumns: "28px minmax(0,1fr) minmax(30px,42px) minmax(34px,44px) minmax(36px,46px)", gap: 5, alignItems: "center", borderRadius: 15, padding: "9px 9px", border: "1px solid rgba(255,255,255,.075)", background: index < 3 ? `linear-gradient(90deg,${podiumColor}15,rgba(255,255,255,.025))` : "rgba(255,255,255,.032)" }}>
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
  const currentIndex = Math.max(0, RANKING_VIEWS.findIndex((item) => item.key === active));
  const current = RANKING_VIEWS[currentIndex] || RANKING_VIEWS[0];
  const previous = RANKING_VIEWS[clampIndex(currentIndex - 1, RANKING_VIEWS.length)];
  const next = RANKING_VIEWS[clampIndex(currentIndex + 1, RANKING_VIEWS.length)];
  const goPrevious = () => onChange(previous.key);
  const goNext = () => onChange(next.key);
  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", display: "grid", gap: 10 }}>
      <div style={cardStyle({ padding: 12 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
          {sectionTitle("Classements", current.color)}
          <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>un classement à la fois</div>
        </div>
        <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", gap: 8, alignItems: "center", overflow: "hidden" }}>
          <button type="button" aria-label={`Classement précédent : ${previous.label}`} onClick={goPrevious} style={carouselArrow(current.color)}>‹</button>
          <button
            type="button"
            onClick={goNext}
            title="Classement suivant"
            style={{
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
              borderRadius: 18,
              padding: "11px 10px",
              border: `1px solid ${current.color}cc`,
              background: `linear-gradient(180deg,${current.color}24,rgba(0,0,0,.38))`,
              color: current.color,
              boxShadow: `0 0 18px ${current.color}24, inset 0 0 14px ${current.color}12`,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ color: C.dim, fontSize: 8, fontWeight: 900, letterSpacing: .8, textTransform: "uppercase" }}>Classement actif</div>
            <div style={{ marginTop: 2, fontSize: 18, lineHeight: 1.08, fontWeight: 1000, letterSpacing: .9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current.label}</div>
            <div style={{ marginTop: 3, display: "flex", justifyContent: "center", gap: 5, alignItems: "center" }}>
              {RANKING_VIEWS.map((item) => <span key={item.key} style={{ width: item.key === active ? 16 : 5, height: 5, borderRadius: 999, background: item.key === active ? current.color : "rgba(255,255,255,.20)", transition: "width .18s ease, background .18s ease" }} />)}
            </div>
          </button>
          <button type="button" aria-label={`Classement suivant : ${next.label}`} onClick={goNext} style={carouselArrow(current.color)}>›</button>
        </div>
        <div style={{ marginTop: 8, width: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>
          <button type="button" onClick={goPrevious} style={carouselHintButton()}>{previous.label}</button>
          <button type="button" onClick={goNext} style={carouselHintButton("right")}>{next.label}</button>
        </div>
      </div>

      {active === "general" ? <RankingCard rows={leaderboards.topRanking} /> : null}
      {active === "ratio" ? <Board title="Top ratio" subtitle="BP/BC" rows={leaderboards.topRatio} value={(row) => formatBabyFootRatio(row.ratio)} color={C.gold} /> : null}
      {active === "win" ? <Board title="Top win%" subtitle="victoires" rows={leaderboards.topWinRate} value={(row) => formatBabyFootPct01(row.winRate)} color={C.green} /> : null}
      {active === "attack" ? <Board title="Attaque" subtitle="BP/match" rows={leaderboards.topGoalsPerMatch} value={(row) => formatOne(row.avgGoalsFor)} color={C.blue} /> : null}
      {active === "defense" ? <Board title="Défense" subtitle="BC/match" rows={leaderboards.topDefense} value={(row) => formatOne(row.avgGoalsAgainst)} color={C.pink} /> : null}
      {active === "clean" ? <Board title="Clean sheets" subtitle="zéro encaissé" rows={leaderboards.topCleanSheets} value={(row) => String(row.cleanSheets)} color={C.green} /> : null}
      {active === "streak" ? <Board title="Séries" subtitle="record" rows={leaderboards.topStreaks} value={(row) => `${row.bestWinStreak} wins`} color={C.violet} /> : null}
      {active === "scorers" ? <Board title="Scoreurs" subtitle="buts réels" rows={leaderboards.topPersonalScorers} value={(row) => String(row.actualGoals)} color={C.orange} /> : null}
      {active === "gamelles" ? <Board title="Top gamelles" subtitle="actions" rows={leaderboards.topGamelles} value={(row) => String(row.gamelle)} color={C.gold} /> : null}
      {active === "pissettes" ? <Board title="Top pissettes" subtitle="validées/refusées" rows={leaderboards.topPissettes} value={(row) => `${row.pissetteValid}/${row.pissetteRefused}`} color={C.orange} /> : null}
      {active === "demis" ? <Board title="Top demis" subtitle="demis + bonus" rows={leaderboards.topDemis} value={(row) => `${row.demi} · +${row.demiBonus}`} color={C.violet} /> : null}
      {active === "csc" ? <Board title="CSC" subtitle="contre son camp" rows={leaderboards.topCsc} value={(row) => String(row.csc)} color={C.pink} /> : null}
      {active === "peche" ? <Board title="Pêches" subtitle="off/déf" rows={leaderboards.topPeche} value={(row) => `${row.pecheOff}/${row.pecheDef}`} color={C.blue} /> : null}
      {active === "rating" ? <Board title="Rating" subtitle="forme globale" rows={leaderboards.topRating} value={(row) => String(babyFootRating(row))} color={C.gold} /> : null}
      {active === "teams" ? <TeamBoard rows={leaderboards.topTeams} /> : null}
    </div>
  );
}

function MatchLine({
  match,
  go,
  profilesById,
  teamLogoByName,
  primary = C.gold,
}: {
  match: BabyFootProfileMatch;
  go: Props["go"];
  profilesById: Map<string, Profile>;
  teamLogoByName: Map<string, string>;
  primary?: string;
}) {
  const color = match.won ? C.green : match.draw ? C.gold : C.pink;
  const resultText = match.won ? "VICTOIRE" : match.draw ? "NUL" : "DÉFAITE";
  const diff = match.scoreFor - match.scoreAgainst;
  const leftColor = primary;
  const rightColor = match.draw ? C.gold : match.won ? C.pink : C.green;
  const leftPlayerIds = extractMatchSidePlayerIds(match.record, match.team === "A" ? "A" : "B");
  const rightPlayerIds = extractMatchSidePlayerIds(match.record, match.team === "A" ? "B" : "A");
  const teamMode = isTeamMode(match.mode);
  const leftBackdropSrc = teamMode ? getTeamLogoForLabel(match.teamName, teamLogoByName) : null;
  const rightBackdropSrc = teamMode ? getTeamLogoForLabel(match.opponentName, teamLogoByName) : null;
  const dateLabel = match.date ? new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "Date inconnue";
  const timeLabel = match.date ? new Date(match.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  const leftNameSize = teamMode ? "clamp(14px, 3.8vw, 17px)" : "clamp(15px, 4vw, 18px)";
  const rightNameSize = leftNameSize;
  return (
    <button type="button" onClick={() => go("babyfoot_end" as any, { matchId: match.id, matchPayload: match.record, from: "babyfoot_stats_center" })} style={{ position: "relative", width: "100%", maxWidth: "100%", border: `1px solid ${color}44`, borderRadius: 22, padding: 0, background: `linear-gradient(135deg,${color}12,rgba(255,255,255,.035) 40%,rgba(0,0,0,.34))`, color: C.text, textAlign: "left", cursor: "pointer", overflow: "hidden", boxShadow: `0 12px 26px rgba(0,0,0,.30), inset 0 0 30px ${color}10` }}>
      <GhostAvatarBackdrop playerIds={leftPlayerIds} profilesById={profilesById} side="left" imageSrc={leftBackdropSrc} />
      <GhostAvatarBackdrop playerIds={rightPlayerIds} profilesById={profilesById} side="right" imageSrc={rightBackdropSrc} />
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
            <div style={{ color: leftColor, fontSize: leftNameSize, fontWeight: 1000, lineHeight: 1.05, textShadow: `0 0 12px ${leftColor}55`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{match.teamName}</div>
            <AvatarStrip playerIds={leftPlayerIds} profilesById={profilesById} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "center" }}>
            <ScoreKpiBox value={match.scoreFor} color={leftColor} />
            <div style={{ color: C.muted, fontSize: 20, fontWeight: 1000, lineHeight: 1 }}>—</div>
            <ScoreKpiBox value={match.scoreAgainst} color={rightColor} />
          </div>

          <div style={{ minWidth: 0, display: "grid", gap: 6, justifyItems: "end" }}>
            <div style={{ color: rightColor, fontSize: rightNameSize, fontWeight: 1000, lineHeight: 1.05, textAlign: "right", textShadow: `0 0 12px ${rightColor}55`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", maxWidth: "100%" }}>{match.opponentName}</div>
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

function ScoringTimelineChart({ summary }: { summary: ReturnType<typeof buildPlayerScoringTimeline> }) {
  const buckets = summary.buckets;
  const total = Math.max(0, summary.total || 0);
  const size = 148;
  const cx = 74;
  const cy = 74;
  const r = 58;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>Buts marqués analysés : {total}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(summary.topLabels.length ? summary.topLabels : ["Aucun moment fort détecté"]).map((label, index) => (
            <span key={`${label}-${index}`} style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${index === 0 ? C.gold : C.blue}55`, color: index === 0 ? C.gold : C.blue, background: index === 0 ? `${C.gold}14` : `${C.blue}12`, fontSize: 10, fontWeight: 1000 }}>
              {index === 0 ? "Moment fort" : "Alternative"} · {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 14, alignItems: "center" }}>
        <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 0 12px rgba(255,213,91,.18))" }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="18" />
            {buckets.map((bucket) => {
              const dash = total > 0 ? bucket.pct * circumference : 0;
              const circle = (
                <circle
                  key={bucket.key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={bucket.color}
                  strokeWidth="18"
                  strokeLinecap="butt"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ color: C.text, fontSize: 24, fontWeight: 1100, lineHeight: 1 }}>{total}</div>
              <div style={{ color: C.dim, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>buts</div>
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
          {buckets.map((bucket) => (
            <div key={bucket.key} style={{ minWidth: 0, display: "grid", gridTemplateColumns: "12px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: bucket.color, boxShadow: `0 0 10px ${bucket.color}66` }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: bucket.color, fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bucket.label}</div>
                <div style={{ color: C.dim, fontSize: 9, fontWeight: 850 }}>{bucket.short}</div>
              </div>
              <div style={{ color: bucket.color, fontSize: 12, fontWeight: 1000, minWidth: 54, textAlign: "right" }}>
                {bucket.count} · {total ? Math.round(bucket.pct * 100) : 0}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {summary.unattributedMatches > 0 ? (
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 850 }}>
          {summary.unattributedMatches} match(s) contiennent des buts d’équipe non attribués à un joueur précis : le camembert se base uniquement sur les buts rattachés au joueur.
        </div>
      ) : null}
    </div>
  );
}


export default function BabyFootStatsCenterPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const profiles: Profile[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const activeProfileId = String((store as any)?.activeProfileId || "");
  const active = profiles.find((profile: any) => idOf(profile) === activeProfileId) || profiles[0] || null;
  const scope = String(params?.scope || "active");
  const rankingOnly = scope === "rankings" || params?.onlyRankings === true || String(params?.view || "") === "rankings";
  const localProfilesBase = React.useMemo(() => profiles.filter((profile: any) => idOf(profile) !== activeProfileId), [profiles, activeProfileId]);

  const requestedMode = String(params?.mode || "").toLowerCase();
  const initialMode: ModeKey = requestedMode === "1v1" ? "1v1" : requestedMode === "2v2" ? "2v2" : requestedMode === "2v1" ? "2v1" : "all";
  const requestedPeriod = String(params?.period || params?.periodKey || "").toUpperCase();
  const initialPeriod: PeriodKey = requestedPeriod === "J" || requestedPeriod === "S" || requestedPeriod === "M" || requestedPeriod === "A" || requestedPeriod === "ARV" ? requestedPeriod : "ARV";
  const [period, setPeriod] = React.useState<PeriodKey>(initialPeriod);
  const [mode, setMode] = React.useState<ModeKey>(initialMode);
  const requestedTab = String(params?.tab || "").toLowerCase();
  const initialTab: CenterTab = rankingOnly || requestedTab === "classements" ? "classements" : requestedTab === "details" ? "details" : requestedTab === "history" ? "history" : "dashboard";
  const [tab, setTab] = React.useState<CenterTab>(initialTab);
  const [detailsSubTab, setDetailsSubTab] = React.useState<DetailsSubTab>(initialMode === "2v2" || initialMode === "2v1" ? "team" : "solo");
  const [rankingView, setRankingView] = React.useState<RankingView>("general");
  const [profileIndex, setProfileIndex] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(Boolean(params?.showFilters));
  const [historyRows, setHistoryRows] = React.useState<any[]>(() => Array.isArray((store as any)?.history) ? (store as any).history : []);

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
  const localProfiles = React.useMemo(() => {
    const rankingById = new Map<string, BabyFootPlayerAggregate>();
    for (const row of leaderboards.topRanking || []) rankingById.set(String(row.id), row);
    const nameOf = (profile: any) => String(profile?.name || profile?.displayName || profile?.label || "");
    return localProfilesBase.slice().sort((a: any, b: any) => {
      const ra = rankingById.get(idOf(a));
      const rb = rankingById.get(idOf(b));
      const ua = Number(ra?.matches || 0);
      const ub = Number(rb?.matches || 0);
      if (ua !== ub) return ub - ua;
      return nameOf(a).localeCompare(nameOf(b), "fr", { sensitivity: "base", numeric: true });
    });
  }, [localProfilesBase, leaderboards.topRanking]);
  const selectableProfiles = rankingOnly ? [] : scope === "locals" ? localProfiles : active ? [active] : profiles;

  React.useEffect(() => setProfileIndex(0), [scope, activeProfileId, rankingOnly, localProfiles.length]);

  const profile = selectableProfiles[clampIndex(profileIndex, selectableProfiles.length)] || null;
  const profileId = idOf(profile);
  const profileAgg = React.useMemo(() => computeBabyFootProfileAggregate(matches, profiles, profileId), [matches, profiles, profileId]);
  const profileMatches = React.useMemo(() => profileMatchesFromBabyFootMatches(matches, profileId), [matches, profileId]);
  const rank = React.useMemo(() => leaderboards.topRanking.findIndex((row) => row.id === profileId) + 1, [leaderboards.topRanking, profileId]);
  const periodLabel = PERIODS.find((item) => item.key === period)?.long || "À vie";
  const modeLabel = MODES.find((item) => item.key === mode)?.label || "TOUS";
  const primary = theme?.primary ?? C.gold;
  const profilesById = React.useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of profiles) map.set(idOf(p), p);
    return map;
  }, [profiles]);
  const babyFootTeams = React.useMemo(() => loadBabyFootTeams(), []);
  const teamLogoByName = React.useMemo(() => buildTeamLogoByName(babyFootTeams), [babyFootTeams]);
  const rating = babyFootRating(profileAgg);
  const modeSlices = React.useMemo(() => buildProfileModeSlices(profileMatches), [profileMatches]);
  const currentSlice = modeSlices.all;
  const soloSlice = modeSlices.solo;
  const teamImpact = modeSlices.team;
  const detailsSlice = detailsSubTab === "solo" ? soloSlice : teamImpact;
  const detailMatches = React.useMemo(() => matchesForDetailsSubTab(profileMatches, detailsSubTab), [profileMatches, detailsSubTab]);
  const maxAction = Math.max(1, currentSlice.goalAv, currentSlice.goalDef, currentSlice.goalGb, currentSlice.goalMil, currentSlice.demi, currentSlice.gamelle, currentSlice.pecheOff, currentSlice.pecheDef, currentSlice.pissetteValid, currentSlice.csc, Number(currentSlice.parachute || 0));
  const detailMaxAction = Math.max(1, detailsSlice.goalAv, detailsSlice.goalDef, detailsSlice.goalGb, detailsSlice.goalMil, detailsSlice.demi, detailsSlice.gamelle, detailsSlice.pecheOff, detailsSlice.pecheDef, detailsSlice.pissetteValid, detailsSlice.csc, Number(detailsSlice.parachute || 0));
  const playerGoalsOnly = Math.max(0, Number(currentSlice.actualGoals || 0));
  const playerPointsTotal = Math.max(0, Number(currentSlice.pointsTotal || profileAgg.personalPoints || 0));
  const totalBonusPoints = Math.max(0, playerPointsTotal - playerGoalsOnly);
  const detailPlayerGoalsOnly = Math.max(0, Number(detailsSlice.actualGoals || 0));
  const detailPlayerPointsTotal = Math.max(0, Number(detailsSlice.pointsTotal || 0));
  const detailBonusPoints = Math.max(0, detailPlayerPointsTotal - detailPlayerGoalsOnly);
  const detailShare = detailsSlice.goalsFor > 0 ? Math.round((detailPlayerGoalsOnly / detailsSlice.goalsFor) * 100) : 0;
  const teamPlayerShare = teamImpact.goalsFor > 0 ? Math.round((teamImpact.actualGoals / teamImpact.goalsFor) * 100) : 0;
  const teammateGoals = Math.max(0, teamImpact.goalsFor - teamImpact.actualGoals);
  const totalPissettes = currentSlice.pissetteValid + currentSlice.pissetteRefused;
  const totalPeches = currentSlice.pecheOff + currentSlice.pecheDef;
  const totalParachutes = Number(currentSlice.parachute || 0);
  const detailPissettes = detailsSlice.pissetteValid + detailsSlice.pissetteRefused;
  const detailPeches = detailsSlice.pecheOff + detailsSlice.pecheDef;
  const detailParachutes = Number(detailsSlice.parachute || 0);
  const detailRating = ratingForSlice(detailsSlice);
  const detailRatio = ratioForSlice(detailsSlice);
  const matchLimit = tab === "history" ? HISTORY_MATCH_LIMIT : DASHBOARD_MATCH_LIMIT;
  const visibleProfileMatches = profileMatches.slice(0, matchLimit);
  const scoringTimeline = React.useMemo(() => buildPlayerScoringTimeline(profileMatches, profileId), [profileMatches, profileId]);
  const detailScoringTimeline = React.useMemo(() => buildPlayerScoringTimeline(detailMatches, profileId), [detailMatches, profileId]);

  return (
    <div className="bf-stats-center" style={{ position: "relative", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw", minHeight: "100%", width: "100vw", maxWidth: "100vw", minWidth: 0, overflowX: "hidden", boxSizing: "border-box", padding: "18px max(10px, env(safe-area-inset-right)) 112px max(10px, env(safe-area-inset-left))", color: C.text, background: `radial-gradient(circle at 50% -10%,${primary}1f,transparent 38%)` }}>
      <style>{`
        html, body, #root { max-width: 100vw !important; overflow-x: hidden !important; }
        .container:has(.bf-stats-center) {
          width: 100vw !important;
          max-width: 100vw !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          overflow-x: hidden !important;
        }
        .bf-stats-center, .bf-stats-center * { box-sizing: border-box; min-width: 0; }
        .bf-stats-center { contain: layout paint; }
        .bf-stats-center-row {
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          touch-action: pan-x;
        }
        .bf-stats-center-row::-webkit-scrollbar { display: none; }
        @media (max-width: 560px) {
          .bf-stats-center-title { font-size: 19px !important; letter-spacing: .5px !important; }
          .bf-stats-center-title-img { max-width: none !important; }
          .bf-stats-center-subtitle { font-size: 10px !important; }
        }
        @media (max-width: 380px) {
          .bf-stats-center-title { font-size: 17px !important; letter-spacing: .3px !important; }
        }
      `}</style>
      <div className="bf-stats-center-shell" style={{ width: "min(100%, 720px)", maxWidth: "calc(100vw - 24px)", minWidth: 0, margin: "0 auto", display: "grid", gap: 12, overflow: "visible" }}>
        {rankingOnly ? (
          <RankingsTickerHeader
            onBack={() => go("stats" as any)}
            rightSlot={
              <HeaderIconButton
                active={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}
                title={filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
              >
                <FilterGlyph />
              </HeaderIconButton>
            }
            marginBottom={0}
          />
        ) : (
          <div style={{ position: "relative", minHeight: 64, display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}><BackDot onClick={() => go("stats" as any)} /></div>
            <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
              <HeaderTickerImage
                src={statsCenterTicker}
                alt="Statistics Center"
                fallbackLabel="STATISTICS CENTER"
                color={primary}
              />
            </div>
            <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}>
              <HeaderIconButton active={filtersOpen} onClick={() => setFiltersOpen((v) => !v)} title={filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}>
                <FilterGlyph />
              </HeaderIconButton>
            </div>
          </div>
        )}

        {filtersOpen ? <div style={cardStyle({ display: "grid", gap: 10, padding: 10 })}>
          <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", overflow: "hidden" }}>
            {PERIODS.map((item) => <Pill key={item.key} active={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</Pill>)}
          </div>
          <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", overflow: "hidden" }}>
            {MODES.map((item) => <Pill key={item.key} active={mode === item.key} onClick={() => setMode(item.key)} color={C.blue}>{item.label}</Pill>)}
          </div>
        </div> : null}

        {!rankingOnly && (
        <div style={cardStyle({ overflow: "visible", paddingTop: 30 })}>
          <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) 38px", alignItems: "center", gap: 8, overflow: "visible" }}>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index - 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>‹</button>
            <div style={{ minWidth: 0, maxWidth: "100%", display: "grid", justifyItems: "center", textAlign: "center", overflow: "visible" }}>
              <StatHeroAvatar profile={profile} size={84} glowColor={primary} showStars starAvg3D={babyFootLevelScoreFromAggregate(profileAgg)} />
              <div style={{ marginTop: 10, color: primary, fontSize: "clamp(18px, 5.4vw, 24px)", fontWeight: 1000, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textShadow: `0 0 9px ${primary}66` }}>{(profile as any)?.name || (profile as any)?.displayName || "Aucun profil"}</div>
              <div style={{ marginTop: 5, color: C.muted, fontSize: 10, fontWeight: 850 }}>{rank ? `Rang #${rank}` : "Non classé"} · Rating {rating} · {profileAgg.matches} matchs</div>
              {scope === "locals" ? <div style={{ marginTop: 4, color: C.blue, fontSize: 10, fontWeight: 950, letterSpacing: .7, textTransform: "uppercase" }}>Profils locaux</div> : null}
            </div>
            <button type="button" disabled={selectableProfiles.length < 2} onClick={() => setProfileIndex((index) => clampIndex(index + 1, selectableProfiles.length))} style={arrowButton(C.blue, selectableProfiles.length < 2)}>›</button>
          </div>
          <div className="bf-stats-center-row" style={{ marginTop: 13, width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", gap: 8, overflowX: "auto", overflowY: "hidden", paddingBottom: 2 }}>
            {CENTER_TABS.map((item) => <Pill key={item.key} active={tab === item.key} onClick={() => setTab(item.key)} color={item.key === "classements" ? C.gold : C.green}>{item.label}</Pill>)}
          </div>
        </div>
        )}

        {!rankingOnly && tab === "dashboard" && (
          <>
            <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(136px,100%),1fr))", gap: 10 }}>
              <Kpi label="Rating" value={rating} color={C.gold} hint={`Ratio ${formatBabyFootRatio(profileAgg.ratio)}`} />
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
              <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
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
                <MiniProgress label="Parachutes" value={totalParachutes} max={maxAction} color={C.green} />
              </div>
            </div>
          </>
        )}

        {(rankingOnly || tab === "dashboard" || tab === "classements") && (
          <RankingsDeck leaderboards={leaderboards} active={rankingView} onChange={setRankingView} />
        )}

        {!rankingOnly && tab === "details" && (
          <>
            <div style={cardStyle({ padding: 12 })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                {sectionTitle("Détails séparés par mode", C.gold)}
                <div style={{ color: C.dim, fontSize: 10, fontWeight: 900 }}>solo et équipe ne sont plus mélangés</div>
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {DETAIL_SUB_TABS.map((item) => {
                  const activeSub = detailsSubTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDetailsSubTab(item.key)}
                      style={{
                        minWidth: 0,
                        border: `1px solid ${activeSub ? item.color + "dd" : "rgba(255,255,255,.12)"}`,
                        background: activeSub ? `linear-gradient(180deg,${item.color}24,rgba(0,0,0,.36))` : "rgba(255,255,255,.035)",
                        color: activeSub ? item.color : C.muted,
                        borderRadius: 18,
                        padding: "10px 9px",
                        cursor: "pointer",
                        boxShadow: activeSub ? `0 0 18px ${item.color}22, inset 0 0 14px ${item.color}10` : "none",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "clamp(10px,3vw,13px)", fontWeight: 1000, letterSpacing: .45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                      <div style={{ marginTop: 3, color: C.dim, fontSize: 9, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle(detailsSubTab === "solo" ? "Individuelles · 1V1" : "Individuelles par équipes · 2V2 + 2V1", detailsSubTab === "solo" ? C.blue : C.green)}
              <div style={{ marginTop: 10, width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
                <Kpi label="MJ" value={detailsSlice.matches} color={detailsSubTab === "solo" ? C.blue : C.green} hint={detailsSubTab === "solo" ? "1V1 uniquement" : "2V2 / 2V1"} />
                <Kpi label="Rating" value={detailRating} color={C.gold} hint="niveau du sous-mode" />
                <Kpi label="Ratio" value={formatBabyFootRatio(detailRatio)} color={C.blue} hint="BP / BC" />
                <Kpi label="Win%" value={formatBabyFootPct01(winPctOfSlice(detailsSlice))} color={C.green} hint={`${detailsSlice.wins}V / ${detailsSlice.matches}MJ`} />
                <Kpi label="BP" value={detailsSlice.goalsFor} color={C.green} hint={`${formatOne(avgForSlice(detailsSlice, detailsSlice.goalsFor))}/match`} />
                <Kpi label="BC" value={detailsSlice.goalsAgainst} color={C.pink} hint={`${formatOne(avgForSlice(detailsSlice, detailsSlice.goalsAgainst))}/match`} />
                <Kpi label="Diff" value={formatSigned(detailsSlice.goalDiff)} color={detailsSlice.goalDiff >= 0 ? C.green : C.pink} />
                <Kpi label="Vrais buts" value={detailPlayerGoalsOnly} color={C.gold} hint="sans bonus" />
                <Kpi label="Points total" value={detailPlayerPointsTotal} color={C.blue} hint={detailBonusPoints > 0 ? `+${detailBonusPoints} bonus inclus` : "score brut"} />
                <Kpi label="Contribution" value={`${detailShare}%`} color={C.blue} hint={detailsSubTab === "solo" ? "buts joueur / BP 1V1" : "buts joueur / BP équipe"} />
                <Kpi label="Clean" value={detailsSlice.cleanSheets} color={C.green} hint="sans encaisser" />
                <Kpi label="Demis" value={detailsSlice.demi} color={C.violet} hint={`bonus +${detailsSlice.demiBonus}`} />
                <Kpi label="Gamelles" value={detailsSlice.gamelle} color={C.gold} hint="actions spéciales" />
                <Kpi label="Pissettes" value={`${detailsSlice.pissetteValid}/${detailsSlice.pissetteRefused}`} color={C.orange} hint="validées/refusées" />
                <Kpi label="Pêches" value={detailPeches} color={C.blue} hint={`${detailsSlice.pecheOff} off · ${detailsSlice.pecheDef} déf`} />
                <Kpi label="Parachutes" value={detailParachutes} color={C.green} hint="+2 points si validé" />
                <Kpi label="CSC" value={detailsSlice.csc} color={C.pink} hint="contre son camp" />
              </div>
              {!detailsSlice.matches ? (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 15, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", color: C.muted, fontSize: 11, fontWeight: 850, textAlign: "center" }}>
                  Aucune donnée {detailsSubTab === "solo" ? "1V1" : "équipe 2V2/2V1"} dans le filtre actuel.
                </div>
              ) : null}
            </div>

            {detailsSubTab === "team" ? (
              <div style={cardStyle()}>
                {sectionTitle("Impact en équipe", C.blue)}
                {teamImpact.matches ? (
                  <div style={{ marginTop: 10, width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(102px,100%),1fr))", gap: 8 }}>
                    <Kpi label="MJ équipe" value={teamImpact.matches} color={C.blue} hint="2V2 / 2V1" />
                    <Kpi label="BP équipe" value={teamImpact.goalsFor} color={C.green} hint={`${formatOne(avgForSlice(teamImpact, teamImpact.goalsFor))}/match`} />
                    <Kpi label="BC équipe" value={teamImpact.goalsAgainst} color={C.pink} hint={`${formatOne(avgForSlice(teamImpact, teamImpact.goalsAgainst))}/match`} />
                    <Kpi label="Diff équipe" value={formatSigned(teamImpact.goalDiff)} color={teamImpact.goalDiff >= 0 ? C.green : C.pink} />
                    <Kpi label="Buts joueur" value={teamImpact.actualGoals} color={C.gold} hint={`${teamPlayerShare}% des BP équipe`} />
                    <Kpi label="Points joueur" value={teamImpact.pointsTotal} color={C.blue} hint="bonus inclus" />
                    <Kpi label="Autres BP" value={teammateGoals} color={C.muted} hint="coéquipiers + bonus/CSC" />
                    <Kpi label="Clean" value={teamImpact.cleanSheets} color={C.green} hint="équipe sans encaisser" />
                  </div>
                ) : (
                  <div style={{ marginTop: 10, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", color: C.muted, fontWeight: 850, textAlign: "center" }}>
                    Aucun match en équipe dans le filtre actuel. Les stats 1V1 restent dans l’onglet Individuelles.
                  </div>
                )}
              </div>
            ) : null}

            {detailsSubTab === "team" ? (
              <div style={cardStyle()}>
                {sectionTitle("Répartition équipe par mode", C.gold)}
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 10 }}>
                  <ModeSliceCard slice={modeSlices.twoVTwo} color={C.green} />
                  <ModeSliceCard slice={modeSlices.twoVOne} color={C.violet} />
                </div>
              </div>
            ) : null}

            <div style={cardStyle()}>
              {sectionTitle(detailsSubTab === "solo" ? "Détail par ligne · 1V1" : "Détail par ligne · équipe", C.blue)}
              <div style={{ marginTop: 11, display: "grid", gap: 10 }}>
                <MiniProgress label="Avant" value={detailsSlice.goalAv} max={detailMaxAction} color={C.blue} />
                <MiniProgress label="Défense" value={detailsSlice.goalDef} max={detailMaxAction} color={C.pink} />
                <MiniProgress label="Gardien" value={detailsSlice.goalGb} max={detailMaxAction} color={C.green} />
                <MiniProgress label="Milieu" value={detailsSlice.goalMil} max={detailMaxAction} color={C.violet} />
                <MiniProgress label="Pissettes" value={detailsSlice.pissetteValid} max={detailMaxAction} color={C.orange} />
                <MiniProgress label="Pêches" value={detailPeches} max={detailMaxAction} color={C.blue} />
                <MiniProgress label="Parachutes" value={detailParachutes} max={detailMaxAction} color={C.green} />
              </div>
            </div>

            <div style={cardStyle()}>
              {sectionTitle(detailsSubTab === "solo" ? "Frise des buts · 1V1" : "Frise des buts · équipe", C.gold)}
              <ScoringTimelineChart summary={detailScoringTimeline} />
            </div>
          </>
        )}

        {!rankingOnly && (tab === "dashboard" || tab === "history") && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              {sectionTitle("Derniers matchs", C.gold)}
              <button type="button" onClick={() => go("babyfoot_stats_history" as any)} style={{ border: `1px solid ${C.gold}77`, color: C.gold, background: `${C.gold}14`, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 1000, cursor: "pointer" }}>HISTORIQUE COMPLET</button>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {visibleProfileMatches.map((match) => <MatchLine key={match.id} match={match} go={go} profilesById={profilesById} teamLogoByName={teamLogoByName} primary={primary} />)}
              {profileMatches.length > visibleProfileMatches.length ? <div style={{ padding: "4px 8px", color: C.dim, textAlign: "center", fontSize: 10, fontWeight: 850 }}>{profileMatches.length - visibleProfileMatches.length} match(s) supplémentaire(s) dans l’historique complet.</div> : null}
              {!profileMatches.length ? <div style={{ padding: 18, color: C.muted, textAlign: "center", fontWeight: 850 }}>Aucune partie Baby‑Foot trouvée pour ces filtres.</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function carouselArrow(color: string): React.CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: `1px solid ${color}88`,
    background: `radial-gradient(circle at 35% 30%,${color}2b,rgba(0,0,0,.24))`,
    color,
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 1000,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: `0 0 14px ${color}22`,
  };
}

function carouselHintButton(align: "left" | "right" = "left"): React.CSSProperties {
  return {
    minWidth: 0,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.035)",
    borderRadius: 999,
    padding: "7px 9px",
    color: C.muted,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: .35,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    textAlign: align,
  };
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
