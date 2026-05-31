import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useStore } from "../../contexts/StoreContext";
import { onlineApi } from "../../lib/onlineApi";
import { History } from "../../lib/history";
import { markNasSyncDirty } from "../../lib/manualNasSync";
import { scheduleStatsIndexRefresh } from "../../lib/stats/rebuildStatsFromHistory";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import ProfileAvatar from "../../components/ProfileAvatar";
import BabyFootEndGameSummary from "../../components/BabyFootEndGameSummary";
import BabyFootSetsBar from "../../components/BabyFootSetsBar";
import BabyFootDuelScoreCard from "../../components/babyfoot/BabyFootDuelScoreCard";
import BabyFootLiveHeader from "../../components/babyfoot/BabyFootLiveHeader";
import BabyFootLiveStatsCard from "../../components/babyfoot/BabyFootLiveStatsCard";
import BabyFootPhasePanel from "../../components/babyfoot/BabyFootPhasePanel";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";
import {
  addBabyFootLeagueManualMatch,
  loadBabyFootLeagues,
  setBabyFootFixtureScore,
  type BabyFootLeague,
} from "../../lib/babyfootLeagueStore";
import { submitBabyFootLeagueOnlineResult } from "../../lib/babyfootLeagueOnlineApi";

import { sendCastSnapshot } from "../../cast/googleCast";
import {
  addGoal,
  addPenaltyShot,
  addSpecialScoreEvent,
  type BabyFootGoalSource,
  computeDurationMs,
  finishByTime,
  loadBabyFootState,
  pauseClock,
  startClock,
  startIfNeeded,
  startMatch,
  undo as undoGoal,
  type BabyFootEvent,
  type BabyFootState,
  type BabyFootTeamId,
} from "../../lib/babyfootStore";

const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function pickTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const candidate of candidates) {
    const suffixA = `/ticker_${candidate}.png`;
    const suffixB = `/ticker-${candidate}.png`;
    for (const key of Object.keys(TICKERS)) {
      if (key.endsWith(suffixA) || key.endsWith(suffixB)) return TICKERS[key];
    }
  }
  return null;
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

type ProfileLike = {
  id?: string;
  name?: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
} | null;

type GoalLikeEvent = Extract<BabyFootEvent, { t: "goal" }>;
type FinishLikeEvent = Extract<BabyFootEvent, { t: "finish" }>;

type ReconstructedScore = { scoreA: number; scoreB: number };

type ScoreVisual = {
  name: string;
  imageSrc?: string | null;
  roleLabel: string;
};

type PlayTab = "score" | "compo" | "stats" | "individual" | "actions";
type QuickAction = "goal" | "demi" | "gamelle" | "peche_off" | "peche_def" | "pissette" | "csc";

function tourResultKey(tournamentId: unknown, matchId: unknown) {
  return `bf_tour_result_${String(tournamentId || "")}_${String(matchId || "")}`;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function lastPhaseAt(state: BabyFootState, phase: string) {
  const reversed = [...(state.events || [])].reverse();
  const found = reversed.find((event) => event?.t === "phase" && event?.phase === phase);
  return found?.at ?? null;
}

function getGoalEvents(events: BabyFootEvent[]) {
  return events.filter((event): event is GoalLikeEvent => event.t === "goal");
}

function getFinishEvent(events: BabyFootEvent[]) {
  const reversed = [...events].reverse();
  return reversed.find((event): event is FinishLikeEvent => event.t === "finish") ?? null;
}

function reconstructDisplayedScore(state: BabyFootState): ReconstructedScore {
  if (!state.setsEnabled) {
    return { scoreA: state.scoreA, scoreB: state.scoreB };
  }

  // Handicap = malus : le score initial est attribué à l’adversaire.
  const baseA = Math.max(0, Number(state.handicapB) || 0);
  const baseB = Math.max(0, Number(state.handicapA) || 0);
  const events = state.events || [];
  const finishEvent = getFinishEvent(events);
  const setWinIndexes = events.reduce<number[]>((acc, event, index) => {
    if (event.t === "set_win") acc.push(index);
    return acc;
  }, []);

  let startIndex = -1;
  if (finishEvent?.reason === "sets" && setWinIndexes.length > 0) {
    startIndex = setWinIndexes.length >= 2 ? setWinIndexes[setWinIndexes.length - 2] ?? -1 : -1;
  } else if (setWinIndexes.length > 0) {
    startIndex = setWinIndexes[setWinIndexes.length - 1] ?? -1;
  }

  let scoreA = baseA;
  let scoreB = baseB;
  for (let index = startIndex + 1; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    if (event.t === "goal") {
      if (event.team === "A") scoreA += 1;
      if (event.team === "B") scoreB += 1;
    }
  }

  return { scoreA, scoreB };
}

function computeMomentumLabel(goalEvents: GoalLikeEvent[], teamA: string, teamB: string) {
  if (!goalEvents.length) return "Match équilibré";
  const last = goalEvents[goalEvents.length - 1];
  if (!last) return "Match équilibré";

  let streak = 0;
  for (let index = goalEvents.length - 1; index >= 0; index -= 1) {
    const event = goalEvents[index];
    if (!event || event.team !== last.team) break;
    streak += 1;
  }

  const teamName = last.team === "A" ? teamA : teamB;
  return streak > 1 ? `${teamName} sur ${streak} buts de suite` : `${teamName} a repris la main`;
}

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 16,
    border: "1px solid rgba(120,150,255,0.14)",
    background: "linear-gradient(180deg, rgba(14,18,36,0.96), rgba(8,10,24,0.98))",
    boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
  };
}

function actionStyle(tone: "neutral" | "danger" | "primary", disabled = false): React.CSSProperties {
  const bg =
    tone === "primary"
      ? "linear-gradient(180deg, rgba(199,255,38,0.24), rgba(199,255,38,0.10))"
      : tone === "danger"
      ? "linear-gradient(180deg, rgba(255,89,176,0.16), rgba(255,89,176,0.06))"
      : "rgba(255,255,255,0.04)";

  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: disabled ? "rgba(255,255,255,0.04)" : bg,
    color: disabled ? "rgba(255,255,255,0.42)" : tone === "danger" ? "#ff77b9" : "#fff",
    fontSize: 15,
    fontWeight: 1000,
    letterSpacing: 0.2,
    cursor: disabled ? "default" : "pointer",
  };
}

function normalizeSrc(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && v && typeof (v as any).default === "string") {
    return ((v as any).default as string).trim() || null;
  }
  return null;
}

function profileImage(profile: ProfileLike): string | null {
  if (!profile) return null;
  return normalizeSrc(profile.avatarDataUrl) || normalizeSrc(profile.avatarUrl) || null;
}

function MiniCompositionCard({
  label,
  name,
  imageSrc,
  accent,
}: {
  label: string;
  name: string;
  imageSrc?: string | null;
  accent: string;
}) {
  return (
    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 999,
          padding: 2,
          flex: "0 0 auto",
          background: `linear-gradient(180deg, ${accent}bb, ${accent}22)`,
          boxShadow: `0 0 16px ${accent}28`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.30)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {imageSrc ? (
            <img src={imageSrc} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 1100 }}>{name.trim().slice(0, 1).toUpperCase() || "?"}</span>
          )}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 0.85, textTransform: "uppercase", color: accent }}>{label}</div>
        <div title={name} style={{ marginTop: 2, fontSize: 16, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      </div>
    </div>
  );
}

function TeamCompositionColumn({
  title,
  accent,
  teamName,
  teamLogo,
  playerIds,
  getProfile,
}: {
  title: string;
  accent: string;
  teamName: string;
  teamLogo?: string | null;
  playerIds: string[];
  getProfile: (id: string) => ProfileLike;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 999,
            padding: 2,
            background: `linear-gradient(180deg, ${accent}bb, ${accent}25)`,
            boxShadow: `0 0 16px ${accent}2a`,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 999,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {teamLogo ? (
              <img src={teamLogo} alt={teamName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 1100 }}>{teamName.trim().slice(0, 1).toUpperCase() || "?"}</span>
            )}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 0.9, color: accent, textTransform: "uppercase" }}>{title}</div>
          <div
            title={teamName}
            style={{
              marginTop: 2,
              fontSize: 16,
              fontWeight: 1100,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {teamName}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {playerIds.map((id) => {
          const profile = getProfile(id);
          return <ProfileAvatar key={id} profile={profile || { id, name: id }} size={34} />;
        })}
      </div>
    </div>
  );
}

function tinyActionBtn(disabled = false): React.CSSProperties {
  return {
    minHeight: 34, borderRadius: 12, padding: "0 12px", border: "1px solid rgba(255,255,255,.10)",
    background: disabled ? "rgba(255,255,255,.04)" : "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.035))",
    color: "#fff", fontWeight: 1000, cursor: disabled ? "not-allowed" : "pointer"
  };
}

function tileStyle(accent = "#c7ff26"): React.CSSProperties {
  return {
    minHeight: 42, borderRadius: 14, border: `1px solid ${accent}44`,
    background: `linear-gradient(180deg, ${accent}20, rgba(255,255,255,.035))`,
    color: "#fff", fontWeight: 1100, fontSize: 11, letterSpacing: .2, cursor: "pointer",
    boxShadow: `0 0 16px ${accent}18`,
  };
}

function QuickTeamPad({ label, accent, onPick }: { label: string; accent: string; onPick: (source: BabyFootGoalSource) => void }) {
  return (
    <div style={{ borderRadius: 18, padding: 10, border: `1px solid ${accent}40`, background: `linear-gradient(180deg, ${accent}16, rgba(255,255,255,.025))` }}>
      <div style={{ color: accent, fontWeight: 1100, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <button type="button" style={tileStyle(accent)} onClick={() => onPick("AV")}>⚽ AV</button>
        <button type="button" style={tileStyle(accent)} onClick={() => onPick("DEF")}>🛡 DEF</button>
        <button type="button" style={tileStyle(accent)} onClick={() => onPick("GB")}>🥅 GB</button>
        <button type="button" style={tileStyle(accent)} onClick={() => onPick("MIL")}>⚡ DEMI</button>
      </div>
    </div>
  );
}

function ActionTiles({
  state,
  onAction,
}: {
  state: BabyFootState;
  onAction: (action: QuickAction, source: BabyFootGoalSource) => void;
}) {
  const pissetteLabel =
    state.pissetteRule === "point"
      ? "PISSETTE +1"
      : state.pissetteRule === "forbidden_stat"
      ? "PISSETTE REFUS"
      : "PISSETTE STAT";
  const gamelleLabel =
    state.gamelleRule === "plus_one_scoring_team"
      ? "GAMELLE +1"
      : state.gamelleRule === "minus_one_conceding_team"
      ? "GAMELLE -1"
      : "GAMELLE STAT";
  const pecheOffLabel =
    state.pecheOffRule === "minus_one_conceding_team"
      ? "PÊCHE OFF -1"
      : state.pecheOffRule === "stat_only"
      ? "PÊCHE OFF STAT"
      : "PÊCHE OFF ✕";
  const pecheDefLabel =
    state.pecheDefRule === "cancel_goal"
      ? "PÊCHE DEF ANNUL."
      : state.pecheDefRule === "stat_only"
      ? "PÊCHE DEF STAT"
      : "PÊCHE DEF ✕";

  const tiles: Array<{ label: string; action: QuickAction; source: BabyFootGoalSource; accent?: string; muted?: boolean }> = [
    { label: "BUT AV", action: "goal", source: "AV", accent: "#c7ff26" },
    { label: "BUT DEF", action: "goal", source: "DEF", accent: "#8dd7ff" },
    { label: "BUT GB", action: "goal", source: "GB", accent: "#ffd36b" },
    { label: "DEMI", action: "demi", source: "MIL", accent: "#b78cff", muted: state.demiRule === "forbidden" },
    { label: gamelleLabel, action: "gamelle", source: "AV", accent: "#ffcf5a", muted: state.gamelleRule === "stat_only" },
    { label: pecheOffLabel, action: "peche_off", source: "AV", accent: "#ff8b5a", muted: state.pecheOffRule === "forbidden" },
    { label: pecheDefLabel, action: "peche_def", source: "DEF", accent: "#5ad7ff", muted: state.pecheDefRule === "forbidden" },
    { label: pissetteLabel, action: "pissette", source: "AV", accent: "#ff59b0", muted: state.pissetteRule !== "point" },
    { label: "CSC", action: "csc", source: "AV", accent: "#ff4f6d" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
      {tiles.map((tile) => (
        <button
          key={tile.label}
          type="button"
          onClick={() => onAction(tile.action, tile.source)}
          style={{ ...tileStyle(tile.accent), opacity: tile.muted ? 0.62 : 1 }}
        >
          {tile.label}
        </button>
      ))}
    </div>
  );
}

function IndividualStatsTabs({ rows }: { rows: Array<{ id: string; name: string; team: BabyFootTeamId; goals: number; av: number; def: number; gb: number; demi: number; ptsDemi: number; gamelle: number; pecheOff: number; pecheDef: number; pissette: number; csc: number }> }) {
  const [tab, setTab] = useState<"A" | "B" | "ALL">("ALL");
  const filtered = rows.filter((row) => tab === "ALL" || row.team === tab);
  const statItems = (row: typeof rows[number]) => [
    ["Buts", row.goals],
    ["AV", row.av],
    ["DEF", row.def],
    ["GB", row.gb],
    ["Demis", row.demi],
    ["Pts demi", row.ptsDemi],
    ["Gamelle", row.gamelle],
    ["Pêche +", row.pecheOff],
    ["Pêche -", row.pecheDef],
    ["Pissette", row.pissette],
    ["CSC", row.csc],
  ] as const;

  return (
    <div style={shellCard()}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 1100, letterSpacing: 1, color: "rgba(255,255,255,.7)", textTransform: "uppercase" }}>Stats individuelles</div>
          <div style={{ marginTop: 4, fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.48)" }}>Vue séparée équipe / joueur — aucun tableau horizontal.</div>
        </div>
        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
          {(["ALL", "A", "B"] as const).map((key) => <button key={key} type="button" onClick={() => setTab(key)} style={{ ...tinyActionBtn(false), minHeight: 30, padding: "0 9px", color: tab === key ? "#d9ff57" : "#fff" }}>{key === "ALL" ? "Tous" : `Team ${key}`}</button>)}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((row) => {
          const accent = row.team === "A" ? "#c7ff26" : "#ff59b0";
          return (
            <div key={row.id} style={{ borderRadius: 16, padding: 10, border: `1px solid ${accent}40`, background: `linear-gradient(180deg, ${accent}12, rgba(255,255,255,.025))`, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0, color: accent, fontSize: 12, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                <div style={{ flex: "0 0 auto", borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, color: accent, border: `1px solid ${accent}55`, background: `${accent}12` }}>TEAM {row.team}</div>
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
                {statItems(row).map(([label, value]) => (
                  <div key={label} style={{ minWidth: 0, borderRadius: 12, padding: "7px 8px", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ minWidth: 0, color: "rgba(255,255,255,.58)", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    <strong style={{ flex: "0 0 auto", color: "#fff", fontSize: 11 }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildBabyFootPlayerStatsForHistory(input: {
  players: Array<{ id: string; name?: string; team?: BabyFootTeamId }>;
  events: BabyFootEvent[];
  teamAIds: string[];
  teamBIds: string[];
  winnerTeam: BabyFootTeamId | null;
}) {
  const byId: Record<string, any> = {};
  const ensure = (id: any, fallback?: any) => {
    const pid = String(id || "").trim();
    if (!pid) return null;
    if (!byId[pid]) {
      const p = input.players.find((row) => String(row?.id || "") === pid) || null;
      const team: BabyFootTeamId | null = input.teamAIds.includes(pid) ? "A" : input.teamBIds.includes(pid) ? "B" : (fallback?.team || null);
      byId[pid] = {
        id: pid,
        playerId: pid,
        profileId: pid,
        name: p?.name || fallback?.name || pid,
        team,
        matches: 1,
        wins: input.winnerTeam && team === input.winnerTeam ? 1 : 0,
        losses: input.winnerTeam && team && team !== input.winnerTeam ? 1 : 0,
        goals: 0,
        goalsConceded: 0,
        goalAv: 0,
        goalDef: 0,
        goalGb: 0,
        goalMil: 0,
        gamelle: 0,
        peche: 0,
        pecheOff: 0,
        pecheDef: 0,
        demi: 0,
        demiBonus: 0,
        pissette: 0,
        pissetteValid: 0,
        pissetteRefused: 0,
        csc: 0,
        ownGoals: 0,
        penalties: 0,
        penaltyGoals: 0,
        penaltyMisses: 0,
      };
    }
    return byId[pid];
  };

  for (const p of input.players || []) ensure(p?.id, p);

  const bumpLine = (row: any, line: any, amount = 1) => {
    const src = String(line || "AV").toUpperCase();
    if (src === "DEF") row.goalDef += amount;
    else if (src === "GB") row.goalGb += amount;
    else if (src === "MIL") row.goalMil += amount;
    else row.goalAv += amount;
  };

  for (const ev of input.events || []) {
    const anyEv: any = ev as any;
    if (anyEv?.t === "goal") {
      const pts = Math.max(1, Number(anyEv.points || 1) || 1);
      const scorer = ensure(anyEv.scorerId, { team: anyEv.team });
      if (scorer) {
        scorer.goals += pts;
        if (anyEv.kind === "gamelle") scorer.gamelle += 1;
        if (anyEv.kind === "peche") { scorer.peche += 1; scorer.pecheOff += 1; }
        if (anyEv.kind === "pissette") { scorer.pissette += 1; scorer.pissetteValid += 1; }
        bumpLine(scorer, anyEv.sourceLine, pts);
      }
      const own = ensure(anyEv.ownGoalById, { team: anyEv.ownGoalTeam });
      if (own) { own.ownGoals += 1; own.csc += 1; }
    } else if (anyEv?.t === "demi") {
      const scorer = ensure(anyEv.scorerId, { team: anyEv.team });
      if (scorer) scorer.demi += 1;
    } else if (anyEv?.t === "special") {
      const scorer = ensure(anyEv.scorerId, { team: anyEv.team });
      if (!scorer) continue;
      if (anyEv.kind === "gamelle") scorer.gamelle += 1;
      if (anyEv.kind === "peche_off") { scorer.peche += 1; scorer.pecheOff += 1; }
      if (anyEv.kind === "peche_def") { scorer.peche += 1; scorer.pecheDef += 1; }
      if (anyEv.kind === "pissette") { scorer.pissette += 1; if (anyEv.counted) scorer.pissetteValid += 1; else scorer.pissetteRefused += 1; }
      if (anyEv.kind === "csc") { scorer.csc += 1; scorer.ownGoals += 1; }
      scorer.demiBonus += Math.max(0, Number(anyEv.demiBonusApplied || 0) || 0);
    } else if (anyEv?.t === "pen_shot") {
      const scorer = ensure(anyEv.scorerId, { team: anyEv.team });
      if (scorer) {
        scorer.penalties += 1;
        if (anyEv.scored) scorer.penaltyGoals += 1;
        else scorer.penaltyMisses += 1;
      }
    }
  }

  for (const row of Object.values(byId)) {
    const oppIds = row.team === "A" ? input.teamBIds : row.team === "B" ? input.teamAIds : [];
    const oppGoals = Object.values(byId).filter((r: any) => oppIds.includes(String((r as any).id))).reduce((sum: number, r: any) => sum + (Number(r.goals || 0) || 0), 0);
    row.goalsConceded = oppGoals;
    row.goalDiff = (Number(row.goals || 0) || 0) - oppGoals;
  }

  return byId;
}

export default function BabyFootPlay({ go, onFinish, params }: Props) {
  const { theme } = useTheme();
  const { store } = useStore() as any;

  const [state, setState] = useState<BabyFootState>(() => startIfNeeded());
  const [now, setNow] = useState(Date.now());
  const [pickTeam, setPickTeam] = useState<BabyFootTeamId | null>(null);
  const [pickGoalSource, setPickGoalSource] = useState<BabyFootGoalSource>("AV");
  const [cscAwardedTeam, setCscAwardedTeam] = useState<BabyFootTeamId | null>(null);
  const [activeTab, setActiveTab] = useState<PlayTab>("score");
  const leagueResultSavedRef = useRef(false);
  const historySavedMatchRef = useRef<string | null>(null);
  const [leagueSaveChoice, setLeagueSaveChoice] = useState("");
  const [leagueSaveDone, setLeagueSaveDone] = useState<string | null>(null);
  const isOnlineBabyFoot = Boolean((params as any)?.online || (params as any)?.lobbyCode);
  const onlineLobbyCode = String((params as any)?.lobbyCode || "").trim().toUpperCase();
  const onlineStatePushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => setState(loadBabyFootState());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const profiles = (store?.profiles || []) as any[];
  const getProfile = (id: string): ProfileLike => profiles.find((profile) => profile?.id === id) || null;

  const teamAIds = state.teamAProfileIds || [];
  const teamBIds = state.teamBProfileIds || [];

  const players = useMemo(() => {
    const makePlayer = (id: string, team: BabyFootTeamId, teamIndex: number) => {
      const profile: any = getProfile(id);
      return {
        id,
        profileId: id,
        name: profile?.name || profile?.displayName || profile?.nickname || id,
        avatarUrl: profile?.avatarUrl || profile?.avatar_url || profile?.avatar || null,
        avatarDataUrl: profile?.avatarDataUrl || profile?.avatar_data_url || null,
        team,
        teamIndex,
      };
    };
    return [
      ...teamAIds.map((id) => makePlayer(id, "A", 0)),
      ...teamBIds.map((id) => makePlayer(id, "B", 1)),
    ];
  }, [teamAIds.join("|"), teamBIds.join("|"), profiles]);

  const durationMs = computeDurationMs(state);
  const hasClockStarted = !!state.startedAt;
  const regularStart = state.startedAt ?? state.createdAt;
  const regularLimitMs = state.matchDurationSec ? state.matchDurationSec * 1000 : null;
  const regularElapsed = hasClockStarted ? Math.max(0, now - regularStart) : 0;
  const regularRemain = regularLimitMs != null ? (hasClockStarted ? Math.max(0, regularLimitMs - regularElapsed) : regularLimitMs) : null;

  const otStart = lastPhaseAt(state, "overtime") ?? regularStart;
  const otLimitMs = state.overtimeSec != null ? Math.max(0, state.overtimeSec) * 1000 : null;
  const otRemain = otLimitMs != null ? (hasClockStarted ? Math.max(0, otLimitMs - Math.max(0, now - otStart)) : otLimitMs) : null;

  const canUndo = !state.finished && Array.isArray(state.events) && state.events.length > 0;
  const goalEvents = useMemo(() => getGoalEvents(state.events || []), [state.events]);
  const displayedScore = useMemo(() => reconstructDisplayedScore(state), [state]);

  const richStats = useMemo(
    () =>
      computeBabyFootRichStats({
        ...state,
        scoreA: displayedScore.scoreA,
        scoreB: displayedScore.scoreB,
        summary: {
          ...state,
          scoreA: displayedScore.scoreA,
          scoreB: displayedScore.scoreB,
          penalties: state.penalties ? { ...state.penalties } : null,
          specialStats: state.specialStats,
        },
      }),
    [displayedScore.scoreA, displayedScore.scoreB, state]
  );

  const goalCountA = richStats.teamA.goals;
  const goalCountB = richStats.teamB.goals;
  const totalGoals = richStats.totalGoals;
  const penaltiesA = richStats.teamA.penalties;
  const penaltiesB = richStats.teamB.penalties;

  const lastGoalEvent = goalEvents.length ? goalEvents[goalEvents.length - 1] : null;
  const lastGoalTeamName = lastGoalEvent?.team === "A" ? state.teamA : lastGoalEvent?.team === "B" ? state.teamB : null;
  const lastGoalScorer = lastGoalEvent?.scorerId ? getProfile(lastGoalEvent.scorerId)?.name || lastGoalEvent.scorerId : null;
  const lastGoalLabel = lastGoalEvent ? (lastGoalScorer ? `${lastGoalScorer} • ${lastGoalTeamName}` : `But ${lastGoalTeamName}`) : "Aucun but pour le moment";

  const leaderLabel =
    displayedScore.scoreA === displayedScore.scoreB
      ? "Égalité"
      : displayedScore.scoreA > displayedScore.scoreB
      ? state.teamA
      : state.teamB;

  const momentumLabel = computeMomentumLabel(goalEvents, state.teamA, state.teamB);
  const cadenceLabel = (() => {
    const mins = durationMs / 60000;
    if (mins <= 0 || totalGoals === 0) return "0 but/min";
    return `${(totalGoals / mins).toFixed(2)} but/min`;
  })();

  const finishEvent = getFinishEvent(state.events || []);
  const finishReasonLabel = (() => {
    switch (finishEvent?.reason) {
      case "sets":
        return "Victoire aux sets";
      case "target":
        return "Target atteinte";
      case "penalties":
        return "Victoire aux penalties";
      case "golden":
        return "Golden goal";
      case "time":
        return "Fin du temps";
      default:
        return undefined;
    }
  })();

  const phaseLabel = state.finished ? "MATCH" : state.phase === "penalties" ? "PENALTIES" : state.phase === "overtime" ? "OVERTIME" : "MATCH";
  const clockLabel = !hasClockStarted
    ? "00:00"
    : state.finished
    ? fmt(durationMs)
    : state.phase === "overtime"
    ? fmt(otRemain ?? 0)
    : regularLimitMs != null
    ? fmt(regularRemain ?? 0)
    : fmt(durationMs);
  const secondaryLabel = state.setsEnabled ? `BO${state.setsBestOf || 3}` : `Target ${state.target}`;

  const liveContext = [
    `Leader ${leaderLabel}`,
    regularLimitMs != null ? `Chrono ${fmt(regularLimitMs)}` : "Sans chrono fixe",
    `Mode ${state.mode}`,
  ].filter((entry): entry is string => Boolean(entry));

  const infoBody =
    "Page live Baby-Foot.\n\n" +
    "• Lecture : démarre ou reprend le chrono\n" +
    "• Pause : interrompt le chrono en cas d'arrêt du match\n" +
    "• Onglets : Score / Compo / Stats / Actions\n" +
    "• + BUT A / B : ajoute un but à l'équipe\n" +
    "• Fin du match : clôture la rencontre";

  useEffect(() => {
    try {
      sendCastSnapshot({
        game: "babyfoot",
        title: "Baby-Foot",
        status: state.finished ? "finished" : "live",
        players: [
          { id: "A", name: String(state.teamA || "Équipe A"), score: Number(displayedScore.scoreA || 0), active: false },
          { id: "B", name: String(state.teamB || "Équipe B"), score: Number(displayedScore.scoreB || 0), active: false },
        ],
        meta: { phase: state.phase, setsA: Number(state.setsA || 0), setsB: Number(state.setsB || 0), mode: state.mode },
        updatedAt: Date.now(),
      });
    } catch {
      // noop
    }
  }, [displayedScore.scoreA, displayedScore.scoreB, state]);

  useEffect(() => {
    if (!isOnlineBabyFoot || !onlineLobbyCode) return;
    if (onlineStatePushTimerRef.current) window.clearTimeout(onlineStatePushTimerRef.current);
    onlineStatePushTimerRef.current = window.setTimeout(() => {
      onlineApi.updateMatchState({
        lobbyCode: onlineLobbyCode,
        status: state.finished ? "ended" : "started",
        state: {
          ...state,
          sport: "babyfoot",
          mode: "babyfoot",
          onlineMode: "babyfoot",
          online: true,
          lobbyCode: onlineLobbyCode,
          scoreA: displayedScore.scoreA,
          scoreB: displayedScore.scoreB,
          updatedAt: Date.now(),
        },
      } as any).catch((error) => console.warn("[BabyFootPlay] unable to publish online state", error));
    }, 550);
    return () => {
      if (onlineStatePushTimerRef.current) window.clearTimeout(onlineStatePushTimerRef.current);
    };
  }, [displayedScore.scoreA, displayedScore.scoreB, isOnlineBabyFoot, onlineLobbyCode, state]);

  useEffect(() => {
    if (state.finished) return;
    if (state.phase === "play" && regularLimitMs != null && regularRemain === 0) {
      setState(finishByTime());
      return;
    }
    if (state.phase === "overtime" && otLimitMs != null && otRemain === 0) setState(finishByTime());
  }, [otLimitMs, otRemain, regularLimitMs, regularRemain, state.finished, state.phase]);

  useEffect(() => {
    if (!state.finished) return;

    const winnerTeam: BabyFootTeamId =
      (state.winner as BabyFootTeamId | null) || (displayedScore.scoreA >= displayedScore.scoreB ? "A" : "B");
    const winnerId = winnerTeam === "A" ? teamAIds[0] || null : teamBIds[0] || null;

    const payload = {
      kind: "babyfoot",
      sport: "babyfoot",
      matchId: state.matchId,
      id: state.matchId,
      createdAt: state.createdAt,
      finishedAt: state.finishedAt ?? Date.now(),
      winnerId,
      winnerTeam,
      teamA: state.teamA,
      teamB: state.teamB,
      teamARefId: state.teamARefId ?? null,
      teamBRefId: state.teamBRefId ?? null,
      teamAProfileIds: [...(state.teamAProfileIds || [])],
      teamBProfileIds: [...(state.teamBProfileIds || [])],
      mode: state.mode,
      scoreA: displayedScore.scoreA,
      scoreB: displayedScore.scoreB,
      setsEnabled: state.setsEnabled,
      setsA: state.setsA,
      setsB: state.setsB,
      target: state.target,
      setTarget: state.setTarget,
      setsBestOf: state.setsBestOf,
      handicapA: state.handicapA ?? 0,
      handicapB: state.handicapB ?? 0,
      rulesPreset: state.rulesPreset,
      demiRule: state.demiRule,
      pissetteRule: state.pissetteRule,
      gamelleRule: state.gamelleRule,
      pecheOffRule: state.pecheOffRule,
      pecheDefRule: state.pecheDefRule,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        avatarUrl: player.avatarUrl ?? null,
        avatarDataUrl: player.avatarDataUrl ?? null,
        teamIndex: teamAIds.includes(String(player.id)) ? 0 : teamBIds.includes(String(player.id)) ? 1 : undefined,
        team: teamAIds.includes(String(player.id)) ? "A" : teamBIds.includes(String(player.id)) ? "B" : undefined,
      })),
      summary: {
        teamA: state.teamA,
        teamB: state.teamB,
        teamARefId: state.teamARefId ?? null,
        teamBRefId: state.teamBRefId ?? null,
        teamAProfileIds: [...(state.teamAProfileIds || [])],
        teamBProfileIds: [...(state.teamBProfileIds || [])],
        scoreA: displayedScore.scoreA,
        scoreB: displayedScore.scoreB,
        setsEnabled: state.setsEnabled,
        setsA: state.setsA,
        setsB: state.setsB,
        penalties: state.penalties ? { ...state.penalties } : null,
        durationMs,
        mode: state.mode,
        target: state.target,
        setTarget: state.setTarget,
        setsBestOf: state.setsBestOf,
        handicapA: state.handicapA ?? 0,
        handicapB: state.handicapB ?? 0,
        rulesPreset: state.rulesPreset,
        demiRule: state.demiRule,
        pissetteRule: state.pissetteRule,
        gamelleRule: state.gamelleRule,
        pecheOffRule: state.pecheOffRule,
        pecheDefRule: state.pecheDefRule,
        specialStats: state.specialStats,
        stats: richStats,
      },
      events: state.events || [],
      leagueId: (params as any)?.leagueId || null,
      fixtureId: (params as any)?.fixtureId || null,
      fromLeague: Boolean((params as any)?.fromLeague),
      online: isOnlineBabyFoot,
      onlineMode: isOnlineBabyFoot ? "babyfoot" : undefined,
      lobbyCode: onlineLobbyCode || undefined,
      source: isOnlineBabyFoot ? "online" : undefined,
      stayOnBabyFootPlayAfterFinish: true,
    };

    const tournamentId = (params as any)?.tournamentId;
    if (tournamentId) {
      try {
        localStorage.setItem(
          tourResultKey(tournamentId, state.matchId),
          JSON.stringify({
            at: Date.now(),
            winnerTeam,
            scoreA: displayedScore.scoreA,
            scoreB: displayedScore.scoreB,
            setsA: state.setsA,
            setsB: state.setsB,
          })
        );
      } catch {
        // noop
      }
    }

    const leagueId = (params as any)?.leagueId;
    const fixtureId = (params as any)?.fixtureId;
    if (leagueId && fixtureId && !leagueResultSavedRef.current) {
      leagueResultSavedRef.current = true;
      try {
        setBabyFootFixtureScore(String(leagueId), String(fixtureId), displayedScore.scoreA, displayedScore.scoreB);
        const league = loadBabyFootLeagues().find((l) => l.id === String(leagueId));
        const fixture = league?.fixtures.find((f) => f.id === String(fixtureId));
        if (league && fixture) {
          submitBabyFootLeagueOnlineResult(league as any, {
            fixtureId: String(fixtureId),
            homeId: fixture.homeId,
            awayId: fixture.awayId,
            scoreHome: displayedScore.scoreA,
            scoreAway: displayedScore.scoreB,
            playedAt: state.finishedAt ?? Date.now(),
            source: "calendar",
            stats: richStats,
          }).catch((error) => console.warn("[BabyFootPlay] unable to sync online league fixture score", error));
        }
      } catch (e) {
        console.warn("[BabyFootPlay] unable to save league fixture score", e);
      }
    }

    if (isOnlineBabyFoot && onlineLobbyCode) {
      onlineApi.endMatch({ lobbyCode: onlineLobbyCode, finalState: payload } as any).catch((error) =>
        console.warn("[BabyFootPlay] unable to close online babyfoot match", error)
      );
    }

    if (historySavedMatchRef.current !== state.matchId) {
      historySavedMatchRef.current = state.matchId;
      const playerStats = buildBabyFootPlayerStatsForHistory({
        players: payload.players as any,
        events: state.events || [],
        teamAIds,
        teamBIds,
        winnerTeam: state.winner || (displayedScore.scoreA > displayedScore.scoreB ? "A" : displayedScore.scoreB > displayedScore.scoreA ? "B" : null),
      });
      const historyPayload = {
        ...payload,
        playerStats,
        summary: {
          ...(payload.summary || {}),
          finished: true,
          playerStats,
        },
      };
      History.upsert({
        id: state.matchId,
        matchId: state.matchId,
        kind: "babyfoot",
        sport: "babyfoot",
        status: "finished",
        game: { mode: "babyfoot", babyfootMode: state.mode },
        players: payload.players as any,
        winnerId,
        createdAt: Number(state.createdAt || Date.now()),
        updatedAt: Number(state.finishedAt || Date.now()),
        finishedAt: Number(state.finishedAt || Date.now()),
        summary: historyPayload.summary,
        payload: historyPayload,
      } as any)
        .then(() => {
          try { markNasSyncDirty("babyfoot-match-finished"); } catch {}
          try { scheduleStatsIndexRefresh({ reason: "babyfoot-match-finished" }); } catch {}
          try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { sport: "babyfoot", id: state.matchId } })); } catch {}
        })
        .catch((error) => {
          historySavedMatchRef.current = null;
          console.warn("[BabyFootPlay] unable to persist babyfoot match in History", error);
        });
    }

    onFinish?.(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedScore.scoreA, displayedScore.scoreB, durationMs, players, state.finished]);

  const headerTicker = useMemo(
    () => pickTicker(`babyfoot_${state.mode}`) || pickTicker("babyfoot_match") || pickTicker("babyfoot_games"),
    [state.mode]
  );

  const isPickScorerNeeded = (team: BabyFootTeamId) => (team === "A" ? teamAIds : teamBIds).length > 1;
  const openQuickSheet = (team: BabyFootTeamId, source: BabyFootGoalSource = "AV") => {
    if (state.finished || state.phase === "penalties") return;
    setPickGoalSource(source);
    setPickTeam(team);
  };

  const closeQuickSheet = () => {
    setPickGoalSource("AV");
    setPickTeam(null);
    setCscAwardedTeam(null);
  };

  const openCscPicker = (awardedTeam: BabyFootTeamId) => {
    if (state.finished || state.phase === "penalties") return;
    setCscAwardedTeam(awardedTeam);
  };

  const applyCsc = (awardedTeam: BabyFootTeamId, guiltyPlayerId?: string | null) => {
    if (state.finished || state.phase === "penalties") return;
    const guiltyTeam: BabyFootTeamId = awardedTeam === "A" ? "B" : "A";
    setState(addSpecialScoreEvent(guiltyTeam, "csc", guiltyPlayerId ?? null, "AV"));
    closeQuickSheet();
  };

  const applyQuickAction = (team: BabyFootTeamId, action: QuickAction, playerId?: string | null, source: BabyFootGoalSource = pickGoalSource) => {
    if (state.finished || state.phase === "penalties") return;
    if (action === "csc") {
      openCscPicker(team);
      return;
    }
    if (action === "goal") setState(addGoal(team, playerId ?? null, source));
    else setState(addSpecialScoreEvent(team, action as any, playerId ?? null, action === "demi" ? "MIL" : source));
    closeQuickSheet();
  };

  const teamAProfile = teamAIds[0] ? getProfile(teamAIds[0]) : null;
  const teamBProfile = teamBIds[0] ? getProfile(teamBIds[0]) : null;
  const isOneVsOne = state.mode === "1v1" && teamAIds.length <= 1 && teamBIds.length <= 1;
  const hasTeamIndividualStats = state.mode === "2v1" || state.mode === "2v2" || teamAIds.length > 1 || teamBIds.length > 1;

  const visualA: ScoreVisual = {
    name: isOneVsOne ? teamAProfile?.name || state.teamA : state.teamA,
    imageSrc: isOneVsOne ? profileImage(teamAProfile) : normalizeSrc(state.teamALogoDataUrl) || profileImage(teamAProfile),
    roleLabel: isOneVsOne ? "Joueur A" : "Équipe A",
  };
  const visualB: ScoreVisual = {
    name: isOneVsOne ? teamBProfile?.name || state.teamB : state.teamB,
    imageSrc: isOneVsOne ? profileImage(teamBProfile) : normalizeSrc(state.teamBLogoDataUrl) || profileImage(teamBProfile),
    roleLabel: isOneVsOne ? "Joueur B" : "Équipe B",
  };

  const infiniteLeagueChoices = useMemo(() => {
    if (!state.finished) return [] as BabyFootLeague[];
    try {
      const scope = state.mode === "1v1" ? "solo" : "team";
      return loadBabyFootLeagues().filter((league) => league.kind === "infinite" && league.scope === scope);
    } catch {
      return [] as BabyFootLeague[];
    }
  }, [state.finished, state.mode]);

  const saveFinishedMatchToInfiniteLeague = () => {
    const league = infiniteLeagueChoices.find((l) => l.id === leagueSaveChoice);
    if (!league) return;
    const findBy = (name: string, ref?: string | null, profileId?: string | null) => {
      const n = String(name || "").trim().toLowerCase();
      const r = String(ref || profileId || "").trim();
      return league.participants.find((p) =>
        (r && (String(p.refId || "") === r || String(p.id) === r)) ||
        String(p.name || "").trim().toLowerCase() === n
      ) || null;
    };
    const a = findBy(visualA.name, state.teamARefId ?? null, teamAIds[0] || null);
    const b = findBy(visualB.name, state.teamBRefId ?? null, teamBIds[0] || null);
    if (!a || !b || a.id === b.id) {
      alert("Impossible d’ajouter ce match : les deux joueurs/camps doivent déjà exister dans la ligue infinie choisie.");
      return;
    }
    const playedAt = state.finishedAt ?? Date.now();
    addBabyFootLeagueManualMatch(league.id, a.id, b.id, displayedScore.scoreA, displayedScore.scoreB, { playedAt });
    submitBabyFootLeagueOnlineResult(league as any, {
      homeId: a.id,
      awayId: b.id,
      scoreHome: displayedScore.scoreA,
      scoreAway: displayedScore.scoreB,
      playedAt,
      source: "manual",
      stats: richStats,
    }).catch((error) => console.warn("[BabyFootPlay] unable to sync online infinite league result", error));
    setLeagueSaveDone(league.name);
  };

  const winnerLabel = state.winner === "A" ? visualA.name : state.winner === "B" ? visualB.name : "Match nul";
  const detailsLine = [finishReasonLabel, `Durée ${fmt(durationMs)}`, state.mode].filter(Boolean).join(" • ");
  const finishedEndPayload = {
    kind: "babyfoot",
    sport: "babyfoot",
    matchId: state.matchId,
    id: state.matchId,
    createdAt: state.createdAt,
    finishedAt: state.finishedAt ?? Date.now(),
    winnerTeam: state.winner || (displayedScore.scoreA > displayedScore.scoreB ? "A" : displayedScore.scoreB > displayedScore.scoreA ? "B" : "D"),
    teamA: state.teamA,
    teamB: state.teamB,
    teamAProfileIds: [...(state.teamAProfileIds || [])],
    teamBProfileIds: [...(state.teamBProfileIds || [])],
    mode: state.mode,
    scoreA: displayedScore.scoreA,
    scoreB: displayedScore.scoreB,
    durationMs,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      avatarUrl: player.avatarUrl ?? null,
      avatarDataUrl: player.avatarDataUrl ?? null,
      teamIndex: teamAIds.includes(String(player.id)) ? 0 : teamBIds.includes(String(player.id)) ? 1 : undefined,
      team: teamAIds.includes(String(player.id)) ? "A" : teamBIds.includes(String(player.id)) ? "B" : undefined,
    })),
    summary: {
      teamA: state.teamA,
      teamB: state.teamB,
      scoreA: displayedScore.scoreA,
      scoreB: displayedScore.scoreB,
      durationMs,
      mode: state.mode,
      stats: richStats,
      specialStats: state.specialStats,
      target: state.target,
      setsEnabled: state.setsEnabled,
      setsA: state.setsA,
      setsB: state.setsB,
    },
    events: state.events || [],
    leagueId: (params as any)?.leagueId || null,
    fixtureId: (params as any)?.fixtureId || null,
    fromLeague: Boolean((params as any)?.fromLeague),
  };

  const individualStats = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; team: BabyFootTeamId; goals: number; av: number; def: number; gb: number; demi: number; ptsDemi: number; gamelle: number; pecheOff: number; pecheDef: number; pissette: number; csc: number }>();
    const ensure = (id: string | null | undefined, team: BabyFootTeamId) => {
      const safeId = id || `${team}-collectif`;
      const profile = id ? getProfile(id) : null;
      if (!byId.has(safeId)) byId.set(safeId, { id: safeId, name: profile?.name || (team === "A" ? visualA.name : visualB.name), team, goals: 0, av: 0, def: 0, gb: 0, demi: 0, ptsDemi: 0, gamelle: 0, pecheOff: 0, pecheDef: 0, pissette: 0, csc: 0 });
      return byId.get(safeId)!;
    };
    for (const id of teamAIds) ensure(id, "A");
    for (const id of teamBIds) ensure(id, "B");
    for (const event of state.events || []) {
      if (event?.t !== "goal" && event?.t !== "demi" && event?.t !== "special") continue;
      if (event.t === "goal" && (event as any).kind === "csc") {
        const guiltyTeam = ((event as any).ownGoalTeam || ((event as any).team === "A" ? "B" : "A")) as BabyFootTeamId;
        const ownRow = ensure((event as any).ownGoalById, guiltyTeam);
        ownRow.csc += 1;
        continue;
      }
      const row = ensure((event as any).scorerId, (event as any).team);
      if (event.t === "goal") {
        row.goals += Math.max(1, Number((event as any).points) || 1);
        row.ptsDemi += Math.max(0, Number((event as any).demiBonusApplied) || 0);
        if ((event as any).sourceLine === "AV") row.av += 1;
        if ((event as any).sourceLine === "DEF") row.def += 1;
        if ((event as any).sourceLine === "GB") row.gb += 1;
        if ((event as any).sourceLine === "MIL") row.demi += 1;
      }
      if (event.t === "demi") row.demi += 1;
      if (event.t === "special") {
        if ((event as any).kind === "gamelle") row.gamelle += 1;
        if ((event as any).kind === "peche_off") row.pecheOff += 1;
        if ((event as any).kind === "peche_def") row.pecheDef += 1;
        if ((event as any).kind === "pissette") row.pissette += 1;
        if ((event as any).kind === "csc") row.csc += 1;
      }
    }
    return Array.from(byId.values()).filter((row) => row.name);
  }, [state.events, teamAIds.join("|"), teamBIds.join("|"), visualA.name, visualB.name]);

  const leagueReturnParams = params?.fromLeague && params?.leagueId
    ? { leagueId: String(params.leagueId), view: "detail", tab: "calendar" }
    : null;
  const returnAfterPlay = () => {
    if (leagueReturnParams) go("babyfoot_league" as any, leagueReturnParams);
    else go("babyfoot_menu");
  };

  return (
    <div className="page" style={{ background: theme.bg, color: theme.text }}>
      <PageHeader
        tickerSrc={headerTicker || undefined}
        tickerAlt="Baby-Foot — Play"
        tickerHeight={94}
        left={<BackDot onClick={returnAfterPlay} />}
        right={<InfoDot title="Baby-Foot" content={infoBody} glow={(theme?.colors?.primary ?? "#9dff57") + "88"} />}
      />

      <div style={{ padding: 10, paddingBottom: 24, overflowX: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", display: "grid", gap: 14 }}>
          <div style={{ position: "sticky", top: 8, zIndex: 12 }}>
            <BabyFootLiveHeader
              phaseLabel={phaseLabel}
              modeLabel={state.mode}
              clockLabel={clockLabel}
              secondaryLabel={secondaryLabel}
              clockRunning={!!state.clockRunning}
              hasStarted={hasClockStarted}
              onStartClock={() => setState(startClock())}
              onPauseClock={() => setState(pauseClock())}
              tabs={[
                { key: "score", label: "Score" },
                { key: "compo", label: "Compo" },
                { key: "stats", label: "Stats" },
                ...(hasTeamIndividualStats ? [{ key: "individual", label: "Indiv." }] : []),
                { key: "actions", label: "Actions" },
              ]}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key as PlayTab)}
            />
          </div>

          {activeTab === "score" ? (
            <>
              {state.setsEnabled ? (
                <BabyFootSetsBar
                  setsA={state.setsA || 0}
                  setsB={state.setsB || 0}
                  bestOf={state.setsBestOf || 3}
                  currentSet={state.setIndex || 1}
                  teamAName={visualA.name}
                  teamBName={visualB.name}
                />
              ) : null}

              <BabyFootDuelScoreCard
                visualA={visualA}
                visualB={visualB}
                scoreA={displayedScore.scoreA}
                scoreB={displayedScore.scoreB}
                setsEnabled={state.setsEnabled}
                setsA={state.setsA || 0}
                setsB={state.setsB || 0}
                setTarget={state.setTarget || state.target}
                target={state.target}
                handicapA={state.handicapA}
                handicapB={state.handicapB}
                onAddGoalA={() => openQuickSheet("A", "AV")}
                onAddGoalB={() => openQuickSheet("B", "AV")}
                goalsDisabled={state.finished || state.phase === "penalties"}
              />

              {(state.pendingDemiBonus || 0) > 0 ? (
                <div style={{
                  marginTop: 10,
                  borderRadius: 16,
                  padding: "10px 12px",
                  border: "1px solid rgba(183,140,255,.45)",
                  background: "linear-gradient(180deg, rgba(183,140,255,.18), rgba(255,255,255,.035))",
                  boxShadow: "0 0 18px rgba(183,140,255,.18)",
                  color: "#fff",
                  fontWeight: 1000,
                  textAlign: "center",
                  fontSize: 12,
                }}>
                  ⚡ {state.pendingDemiBonus} point{state.pendingDemiBonus > 1 ? "s" : ""} demi en suspens — prochain BUT AV/DEF/GB = +{1 + state.pendingDemiBonus}
                </div>
              ) : null}

              <div style={{ ...shellCard(), marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 1100, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,.68)" }}>Saisie rapide</div>
                  <button type="button" onClick={() => setState(undoGoal())} disabled={!canUndo} style={{ ...tinyActionBtn(!canUndo), opacity: canUndo ? 1 : 0.45 }}>↶ Annuler</button>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <QuickTeamPad label={visualA.name} accent="#c7ff26" onPick={(source) => openQuickSheet("A", source)} />
                  <QuickTeamPad label={visualB.name} accent="#ff59b0" onPick={(source) => openQuickSheet("B", source)} />
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "compo" ? (
            <div style={shellCard()}>
              <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>
                Composition
              </div>

              {isOneVsOne ? (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14, alignItems: "center" }}>
                  <MiniCompositionCard label="Joueur A" name={visualA.name} imageSrc={visualA.imageSrc} accent="#c7ff26" />
                  <div style={{ width: 1, alignSelf: "stretch", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent)" }} />
                  <MiniCompositionCard label="Joueur B" name={visualB.name} imageSrc={visualB.imageSrc} accent="#ff59b0" />
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14, alignItems: "stretch" }}>
                  <TeamCompositionColumn
                    title="Équipe A"
                    accent="#c7ff26"
                    teamName={state.teamA}
                    teamLogo={normalizeSrc(state.teamALogoDataUrl)}
                    playerIds={teamAIds}
                    getProfile={getProfile}
                  />
                  <div style={{ width: 1, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent)" }} />
                  <TeamCompositionColumn
                    title="Équipe B"
                    accent="#ff59b0"
                    teamName={state.teamB}
                    teamLogo={normalizeSrc(state.teamBLogoDataUrl)}
                    playerIds={teamBIds}
                    getProfile={getProfile}
                  />
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "stats" ? (
            <>
              <BabyFootLiveStatsCard
                teamAName={visualA.name}
                teamBName={visualB.name}
                teamAImageSrc={visualA.imageSrc}
                teamBImageSrc={visualB.imageSrc}
                goalsA={goalCountA}
                goalsB={goalCountB}
                totalGoals={totalGoals}
                durationLabel={fmt(durationMs)}
                lastGoalLabel={lastGoalLabel}
                momentumLabel={momentumLabel}
                cadenceLabel={cadenceLabel}
                stats={richStats}
              />
            </>
          ) : null}

          {activeTab === "individual" && hasTeamIndividualStats ? (
            <IndividualStatsTabs rows={individualStats} />
          ) : null}

          {activeTab === "actions" ? (
            <>
              <BabyFootPhasePanel
                state={state}
                lastGoalLabel={lastGoalLabel}
                liveContext={liveContext}
                onPenaltyShot={(team, scored) => setState(addPenaltyShot(team, scored))}
              />

              <div style={shellCard()}>
                <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, color: "rgba(255,255,255,0.66)", textTransform: "uppercase" }}>
                  Actions
                </div>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button type="button" onClick={() => setState(undoGoal())} disabled={!canUndo} style={actionStyle("neutral", !canUndo)}>
                    Annuler
                  </button>
                  <button type="button" onClick={() => setState(finishByTime())} disabled={state.finished} style={actionStyle("danger", state.finished)}>
                    Fin du match
                  </button>
                  <button type="button" onClick={() => setState(startMatch())} style={actionStyle("primary")}>
                    Nouvelle partie
                  </button>
                  <button type="button" onClick={() => go("babyfoot_stats_center")} style={actionStyle("neutral")}>
                    Stats
                  </button>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button type="button" onClick={() => go("babyfoot_config")} style={actionStyle("neutral")}>
                      Configuration
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {pickTeam ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 80,
          }}
          onClick={closeQuickSheet}
        >
          <div style={{ ...shellCard(), width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            {!cscAwardedTeam ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 1100 }}>Bloc flottant — {pickTeam === "A" ? visualA.name : visualB.name}</div>
                <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.74)" }}>
                  Choisis le joueur puis l’action. Le bouton CSC ouvre le choix du joueur adverse fautif.
                </div>
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,.74)" }}>
                  Règles actives : pissette {state.pissetteRule === "point" ? "validée +1" : state.pissetteRule === "forbidden_stat" ? "refusée" : "stat seulement"} · gamelle {state.gamelleRule === "plus_one_scoring_team" ? "+1" : state.gamelleRule === "minus_one_conceding_team" ? "-1 subi" : "stat"} · pêche off {state.pecheOffRule === "minus_one_conceding_team" ? "-1 subi" : state.pecheOffRule === "stat_only" ? "stat" : "interdite"} · pêche def {state.pecheDefRule === "cancel_goal" ? "annule le dernier but adverse" : state.pecheDefRule === "stat_only" ? "stat" : "interdite"}.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 0.8, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>Joueur / équipe</div>
                  {(pickTeam === "A" ? teamAIds : teamBIds).length ? (pickTeam === "A" ? teamAIds : teamBIds).map((playerId) => {
                    const profile = getProfile(playerId);
                    const label = profile?.name || playerId;
                    return (
                      <div key={playerId} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8, padding: 10, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 1100 }}>
                          <ProfileAvatar profile={profile || { id: playerId, name: playerId }} size={34} />
                          <span>{label}</span>
                        </div>
                        <ActionTiles state={state} onAction={(action, source) => applyQuickAction(pickTeam, action, playerId, source)} />
                      </div>
                    );
                  }) : (
                    <ActionTiles state={state} onAction={(action, source) => applyQuickAction(pickTeam, action, null, source)} />
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 1100 }}>CSC — point pour {cscAwardedTeam === "A" ? visualA.name : visualB.name}</div>
                <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.74)" }}>
                  Sélectionne le joueur adverse qui a marqué contre son camp. Le point sera ajouté automatiquement à l’équipe opposée.
                </div>
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  {(cscAwardedTeam === "A" ? teamBIds : teamAIds).length ? (cscAwardedTeam === "A" ? teamBIds : teamAIds).map((playerId) => {
                    const profile = getProfile(playerId);
                    const label = profile?.name || playerId;
                    return (
                      <button key={playerId} type="button" onClick={() => applyCsc(cscAwardedTeam, playerId)} style={{ minWidth: 0, borderRadius: 18, padding: 10, border: "1px solid rgba(255,79,109,.40)", background: "linear-gradient(180deg, rgba(255,79,109,.16), rgba(255,255,255,.035))", color: "#fff", display: "grid", gap: 8, justifyItems: "center", cursor: "pointer" }}>
                        <ProfileAvatar profile={profile || { id: playerId, name: playerId }} size={54} />
                        <span style={{ maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 12, fontWeight: 1100 }}>{label}</span>
                      </button>
                    );
                  }) : (
                    <button type="button" onClick={() => applyCsc(cscAwardedTeam, null)} style={{ ...actionStyle("danger"), gridColumn: "1 / -1" }}>
                      CSC collectif adverse
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => setCscAwardedTeam(null)} style={{ ...actionStyle("neutral"), marginTop: 12 }}>
                  Retour aux actions
                </button>
              </>
            )}

            <button type="button" onClick={closeQuickSheet} style={{ ...actionStyle("neutral"), marginTop: 14 }}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      {state.finished ? (
        <BabyFootEndGameSummary
          open={true}
          theme={theme}
          winnerLabel={winnerLabel}
          scoreLine={state.setsEnabled ? `${state.setsA || 0}–${state.setsB || 0} sets • ${displayedScore.scoreA}–${displayedScore.scoreB}` : `${displayedScore.scoreA}–${displayedScore.scoreB}`}
          detailsLine={detailsLine}
          onReplay={() => setState(startMatch())}
          onStats={() => go("babyfoot_end" as any, { matchId: state.matchId, matchPayload: finishedEndPayload, leagueId: (params as any)?.leagueId || null, fixtureId: (params as any)?.fixtureId || null, fromLeague: Boolean((params as any)?.fromLeague), online: isOnlineBabyFoot, onlineMode: isOnlineBabyFoot ? "babyfoot" : undefined, lobbyCode: onlineLobbyCode || undefined })}
          onClose={returnAfterPlay}
        >
          {infiniteLeagueChoices.length ? (
            <div style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, borderRadius: 16, padding: 10, background: "rgba(255,255,255,.055)" }}>
              <div style={{ fontWeight: 1000, color: theme.primary, marginBottom: 6 }}>AJOUTER À UNE LIGUE INFINIE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <select value={leagueSaveChoice} onChange={(e) => setLeagueSaveChoice(e.target.value)} style={{ minWidth: 0, borderRadius: 12, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(0,0,0,.35)", color: theme.text, padding: "10px", fontWeight: 900 }}>
                  <option value="">Choisir une ligue</option>
                  {infiniteLeagueChoices.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
                </select>
                <button type="button" disabled={!leagueSaveChoice || Boolean(leagueSaveDone)} onClick={saveFinishedMatchToInfiniteLeague} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, background: `${theme.primary}22`, color: theme.text, padding: "0 12px", fontWeight: 1000 }}>
                  AJOUTER
                </button>
              </div>
              {leagueSaveDone ? <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: theme.primary }}>Match ajouté dans {leagueSaveDone}.</div> : null}
            </div>
          ) : null}
        </BabyFootEndGameSummary>
      ) : null}
    </div>
  );
}
