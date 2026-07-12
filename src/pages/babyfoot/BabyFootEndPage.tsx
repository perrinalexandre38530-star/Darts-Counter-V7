// @ts-nocheck
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerBabyFootLigue from "../../assets/tickers/ticker_babyfoot_ligue.png";
import tickerBabyFootTournoi from "../../assets/tickers/ticker_babyfoot_tournoi.png";
import tickerBabyFootMatch from "../../assets/tickers/ticker_babyfoot_match.png";
import { History } from "../../lib/history";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";
import { extractBabyFootPlayerStatsRows, resolveBabyFootRecord } from "../../lib/babyfootPlayerStats";
import { babyFootPenaltyLossByTeam, deriveBabyFootScoreFromRecord } from "../../lib/babyfootScoreRules";
import { loadBabyFootTeams } from "../../lib/petanqueTeamsStore";
import { loadBabyFootLeagues } from "../../lib/babyfootLeagueStore";
import { getTournamentLocal } from "../../lib/tournaments/storeLocal";
import trophyCup from "../../ui_assets/trophy-cup.png";

type Props = { go: (tab: any, params?: any) => void; store?: any; params?: any };
type AnyMatch = Record<string, any>;
type TeamId = "A" | "B";
type StatsView = "global" | "individual" | "momentum";

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function objectOrEmpty(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function pickMatch(store: any, params: any): AnyMatch | null {
  const id = String(params?.matchId || params?.focusMatchId || params?.matchPayload?.id || params?.matchPayload?.matchId || "").trim();
  const list = Array.isArray(store?.history) ? store.history : [];
  if (!id) return params?.matchPayload || list.find((m: any) => String(m?.sport || m?.kind || "").includes("babyfoot")) || null;
  return params?.matchPayload || list.find((m: any) => String(m?.id || m?.matchId) === id || String(m?.payload?.matchId || m?.payload?.id) === id) || null;
}

function mergeHistoryMatch(routeMatch: AnyMatch | null, idbMatch: AnyMatch | null): AnyMatch | null {
  if (!routeMatch && !idbMatch) return null;
  const a = objectOrEmpty(routeMatch);
  const b = objectOrEmpty(idbMatch);
  const aPayload = objectOrEmpty(a.payload);
  const bPayload = objectOrEmpty(b.payload);
  const payloadSummary = {
    ...objectOrEmpty(aPayload.summary),
    ...objectOrEmpty(bPayload.summary),
  };
  const summary = {
    ...objectOrEmpty(a.summary),
    ...objectOrEmpty(b.summary),
    ...payloadSummary,
  };
  const payload = {
    ...aPayload,
    ...bPayload,
    summary,
  };
  const players = [
    ...(Array.isArray(payload.players) ? payload.players : []),
    ...(Array.isArray(b.players) ? b.players : []),
    ...(Array.isArray(a.players) ? a.players : []),
  ];
  const seen = new Set<string>();
  const dedupedPlayers = players.filter((p: any, index: number) => {
    const key = String(p?.id || p?.playerId || p?.profileId || p?.name || `row-${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (dedupedPlayers.length) payload.players = dedupedPlayers;
  return { ...a, ...b, summary, payload, players: dedupedPlayers.length ? dedupedPlayers : (b.players || a.players || []) };
}

function getPayload(match: AnyMatch | null) {
  const nested = objectOrEmpty(match?.payload);
  return Object.keys(nested).length ? nested : objectOrEmpty(match);
}

function getSummary(match: AnyMatch | null, payload: any) {
  return {
    ...objectOrEmpty(match?.summary),
    ...objectOrEmpty(payload?.summary),
  };
}

function parseBabyFootScoreLine(line: any): { scoreA: number; scoreB: number } | null {
  const text = String(line ?? "").trim();
  if (!text) return null;
  const colon = Array.from(text.matchAll(/:\s*(-?\d+)/g)).map((m) => Number(m[1]));
  if (colon.length >= 2 && Number.isFinite(colon[0]) && Number.isFinite(colon[1])) return { scoreA: Math.max(0, colon[0]), scoreB: Math.max(0, colon[1]) };
  const dash = text.match(/(-?\d+)\s*(?:—|-|–|\/)\s*(-?\d+)/);
  if (dash) {
    const a = Number(dash[1]);
    const b = Number(dash[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return { scoreA: Math.max(0, a), scoreB: Math.max(0, b) };
  }
  return null;
}

function getBabyFootDisplayScorePair(summary: any, payload: any, match: any, params: any) {
  const fromLine = parseBabyFootScoreLine(summary?.scoreLine ?? summary?.scoreline ?? payload?.scoreLine ?? payload?.scoreline ?? match?.summary?.scoreLine ?? match?.summary?.scoreline);
  if (fromLine) return fromLine;
  const stA = payload?.stats?.teamA?.score ?? payload?.stats?.teamA?.sc ?? payload?.stats?.teama?.score ?? payload?.stats?.teama?.sc;
  const stB = payload?.stats?.teamB?.score ?? payload?.stats?.teamB?.sc ?? payload?.stats?.teamb?.score ?? payload?.stats?.teamb?.sc;
  if (Number.isFinite(Number(stA)) && Number.isFinite(Number(stB))) return { scoreA: Math.max(0, Number(stA)), scoreB: Math.max(0, Number(stB)) };
  return {
    scoreA: n(summary?.scoreA ?? summary?.scorea ?? payload?.scoreA ?? payload?.scorea ?? match?.scoreA ?? match?.scorea ?? params?.scoreA),
    scoreB: n(summary?.scoreB ?? summary?.scoreb ?? payload?.scoreB ?? payload?.scoreb ?? match?.scoreB ?? match?.scoreb ?? params?.scoreB),
  };
}

function fmtDate(ts: any) {
  const d = new Date(n(ts, Date.now()));
  return d.toLocaleString("fr-FR");
}

function fmtDuration(ms: any) {
  const total = Math.max(0, Math.floor(n(ms) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDurationFancy(ms: any) {
  const total = Math.max(0, Math.floor(n(ms) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}''`;
  return `${m}'${String(s).padStart(2, "0")}''`;
}

function playerId(p: any) {
  return String(p?.id || p?.playerId || p?.profileId || "").trim();
}

function playerName(p: any) {
  return String(p?.name || p?.displayName || p?.nickname || p?.surname || playerId(p) || "Joueur").trim();
}

function avatarOf(p: any) {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar_url || p?.avatar || null;
}

function allPlayers(match: any, payload: any) {
  const candidates = [payload?.players, match?.players, payload?.summary?.players, match?.summary?.players];
  const source = candidates.find((v) => Array.isArray(v) && v.length) || [];
  return source.filter(Boolean);
}

function teamIds(payload: any, summary: any, team: TeamId) {
  const raw = team === "A"
    ? payload?.teamAProfileIds ?? summary?.teamAProfileIds
    : payload?.teamBProfileIds ?? summary?.teamBProfileIds;
  return Array.isArray(raw) ? raw.map(String) : [];
}

function teamPlayers(players: any[], payload: any, summary: any, team: TeamId) {
  const ids = teamIds(payload, summary, team);
  if (ids.length) return players.filter((p: any) => ids.includes(playerId(p)));
  return players.filter((p: any) => String(p?.team || "").toUpperCase() === team || Number(p?.teamIndex) === (team === "A" ? 0 : 1));
}

function getEventsFrom(payload: any, summary: any, match: any): any[] {
  const sources = [payload?.events, summary?.events, match?.events, match?.payload?.events, match?.payload?.summary?.events];
  const hit = sources.find((v) => Array.isArray(v) && v.length);
  return Array.isArray(hit) ? [...hit].sort((a, b) => n(a?.at) - n(b?.at)) : [];
}

function teamForPlayer(players: any[], payload: any, summary: any, pid: string): TeamId | null {
  if (teamIds(payload, summary, "A").includes(pid)) return "A";
  if (teamIds(payload, summary, "B").includes(pid)) return "B";
  const p = players.find((row) => playerId(row) === pid);
  if (String(p?.team || "").toUpperCase() === "A" || Number(p?.teamIndex) === 0) return "A";
  if (String(p?.team || "").toUpperCase() === "B" || Number(p?.teamIndex) === 1) return "B";
  return null;
}

function buildIndividualRows(match: any, payload: any, summary: any, events: any[], winnerTeam: string) {
  const winner = winnerTeam === "A" || winnerTeam === "B" ? winnerTeam : null;
  const record = resolveBabyFootRecord({
    ...objectOrEmpty(match),
    summary: { ...objectOrEmpty(match?.summary), ...objectOrEmpty(summary), winnerTeam: winner ?? summary?.winnerTeam },
    payload: {
      ...objectOrEmpty(match?.payload),
      ...objectOrEmpty(payload),
      summary: { ...objectOrEmpty(match?.payload?.summary), ...objectOrEmpty(summary), winnerTeam: winner ?? summary?.winnerTeam },
      events: Array.isArray(events) ? events : [],
    },
  });
  return extractBabyFootPlayerStatsRows(record);
}

function playerNameFromPayload(payload: any, match: any, id: any) {
  const pid = String(id || "").trim();
  if (!pid) return "";
  const hit = allPlayers(match, payload).find((p: any) => playerId(p) === pid);
  return hit ? playerName(hit) : "";
}

function actionSubject(team: string, player: string) {
  const cleanTeam = String(team || "").trim();
  const cleanPlayer = String(player || "").trim();
  return cleanTeam || cleanPlayer || "";
}

function recordTeamLogo(payload: any, summary: any, team: TeamId) {
  const prefix = team === "A" ? "teamA" : "teamB";
  const direct =
    payload?.[`${prefix}LogoDataUrl`] ||
    summary?.[`${prefix}LogoDataUrl`] ||
    payload?.[`${prefix}LogoUrl`] ||
    summary?.[`${prefix}LogoUrl`] ||
    payload?.[`${prefix}AvatarUrl`] ||
    summary?.[`${prefix}AvatarUrl`] ||
    null;
  if (direct) return direct;
  try {
    const refId = String(payload?.[`${prefix}RefId`] ?? summary?.[`${prefix}RefId`] ?? "").trim();
    const name = String(payload?.[prefix] ?? summary?.[prefix] ?? "").trim().toUpperCase();
    const found = loadBabyFootTeams().find((row: any) =>
      (refId && String(row?.id || "") === refId) || String(row?.name || "").trim().toUpperCase() === name
    );
    return found?.logoDataUrl || found?.logoUrl || found?.regionLogoDataUrl || null;
  } catch {
    return null;
  }
}

function actionLabel(ev: any, payload: any, match: any, teamA: string, teamB: string, logoReplacesTeamName = false) {
  const team = ev?.team === "A" ? teamA : ev?.team === "B" ? teamB : "";
  const player = playerNameFromPayload(payload, match, ev?.scorerId) || playerNameFromPayload(payload, match, ev?.ownGoalById);
  const who = logoReplacesTeamName ? "" : actionSubject(team, player);
  const whoSuffix = who ? ` · ${who}` : "";
  if (ev?.t === "start") return "Début du match";
  if (ev?.t === "finish") return `Fin du match${ev?.winner ? ` · victoire ${ev.winner === "A" ? teamA : teamB}` : " · match nul"}`;
  if (ev?.t === "phase") return `Passage en ${String(ev?.phase || "phase").toUpperCase()}`;
  if (ev?.t === "set_win") return `Set gagné${whoSuffix}`;
  if (ev?.t === "demi") {
    const penalty = Math.max(0, n(ev?.lastBallPenalty));
    return `Demi${whoSuffix}${penalty ? ` · -${penalty} pts (dernière balle)` : ""}`;
  }
  if (ev?.t === "undo") return "Dernière action annulée";
  if (ev?.t === "special") {
    const map: Record<string, string> = { gamelle: "Gamelle", peche_off: "Pêche offensive", peche_def: "Pêche défensive", pissette: ev?.counted ? "Pissette validée" : "Pissette refusée", parachute: "Parachute", csc: "CSC" };
    const delta = n(ev?.scoreDeltaA) || n(ev?.scoreDeltaB) ? ` · score ${n(ev?.scoreDeltaA) >= 0 ? "+" : ""}${n(ev?.scoreDeltaA)}/${n(ev?.scoreDeltaB) >= 0 ? "+" : ""}${n(ev?.scoreDeltaB)}` : "";
    return `${map[String(ev?.kind || "")] || String(ev?.kind || "Action")}${whoSuffix}${delta}`;
  }
  if (ev?.t === "goal") {
    const line = ev?.sourceLine ? ` ${String(ev.sourceLine).toUpperCase()}` : "";
    const kind = ev?.kind === "gamelle" ? "Gamelle" : ev?.kind === "pissette" ? "Pissette" : ev?.kind === "csc" ? "CSC" : ev?.kind === "parachute" ? "Parachute" : `But${line}`;
    const pts = Math.max(1, n(ev?.points, 1));
    const bonus = Math.max(0, n(ev?.demiBonusApplied));
    return `${kind}${whoSuffix}${pts > 1 ? ` · +${pts} pts` : ""}${bonus ? ` (${bonus} bonus demi)` : ""}`;
  }
  return String(ev?.label || ev?.type || ev?.kind || "Action");
}

function buildTimelineRows(events: any[], payload: any, summary: any, match: any, teamA: string, teamB: string) {
  const startEvent = events.find((ev) => ev?.t === "start" && ev?.at);
  const start = n(startEvent?.at ?? payload?.startedAt ?? summary?.startedAt ?? payload?.createdAt ?? match?.createdAt, 0);
  const mode = String(payload?.mode ?? summary?.mode ?? match?.mode ?? "").toLowerCase();
  const isTwoVsTwo = mode === "2v2" || teamIds(payload, summary, "A").length > 1 || teamIds(payload, summary, "B").length > 1;
  let scoreA = Math.max(0, n(payload?.handicapB ?? summary?.handicapB, 0));
  let scoreB = Math.max(0, n(payload?.handicapA ?? summary?.handicapA, 0));
  return events.map((ev: any, index: number) => {
    let deltaA = 0;
    let deltaB = 0;
    if (ev?.t === "goal") {
      const pts = Math.max(1, n(ev?.points, 1));
      if (ev?.team === "A") deltaA += pts;
      if (ev?.team === "B") deltaB += pts;
    } else if (ev?.t === "special") {
      deltaA += n(ev?.scoreDeltaA, 0);
      deltaB += n(ev?.scoreDeltaB, 0);
    } else if (ev?.t === "demi") {
      const penalty = Math.max(0, n(ev?.lastBallPenalty, 0));
      deltaA += n(ev?.scoreDeltaA, ev?.team === "A" && penalty ? -penalty : 0);
      deltaB += n(ev?.scoreDeltaB, ev?.team === "B" && penalty ? -penalty : 0);
    }

    if (ev?.t === "set_win") {
      scoreA = Math.max(0, n(payload?.handicapB ?? summary?.handicapB, 0));
      scoreB = Math.max(0, n(payload?.handicapA ?? summary?.handicapA, 0));
    } else {
      scoreA = Math.max(0, scoreA + deltaA);
      scoreB = Math.max(0, scoreB + deltaB);
    }

    const elapsed = start && ev?.at ? Math.max(0, n(ev.at) - start) : 0;
    const actorId = String(ev?.scorerId || ev?.ownGoalById || "").trim();
    const actor = actorId ? allPlayers(match, payload).find((p: any) => playerId(p) === actorId) : null;
    return {
      key: `${ev?.t || "event"}-${ev?.at || index}-${index}`,
      time: fmtDuration(elapsed),
      elapsedMs: elapsed,
      label: actionLabel(ev, payload, match, teamA, teamB, isTwoVsTwo),
      score: `${scoreA}-${scoreB}`,
      team: ev?.team || null,
      teamLogo: ev?.team === "A" ? recordTeamLogo(payload, summary, "A") : ev?.team === "B" ? recordTeamLogo(payload, summary, "B") : null,
      isTwoVsTwo,
      type: ev?.t,
      kind: ev?.kind || null,
      counted: ev?.counted,
      penalty: Math.max(0, n(ev?.lastBallPenalty, 0)),
      deltaA,
      deltaB,
      actorAvatar: actor ? avatarOf(actor) : null,
      actorName: actor ? playerName(actor) : "",
      weight: Math.max(1, Math.abs(deltaA) + Math.abs(deltaB) || (ev?.t === "demi" ? 1 : 0)),
    };
  });
}

function buildMomentumEntries(timelineRows: any[]) {
  return (Array.isArray(timelineRows) ? timelineRows : []).filter((row: any) => {
    if (!row || !row.type) return false;
    if (row.type === "goal") return true;
    if (row.type === "demi") return row.counted !== false;
    if (row.type === "special") return true;
    return false;
  });
}

function buildTimeTicks(totalMs: number, periodCount = 5) {
  const safeTotal = Math.max(0, Number(totalMs) || 0);
  const periods = Math.max(1, Math.floor(periodCount));
  return Array.from({ length: periods + 1 }, (_, index) => {
    const ratio = index / periods;
    return { ratio, label: fmtDuration(Math.round(safeTotal * ratio)), edge: index === 0 ? "start" : index === periods ? "end" : "middle" };
  });
}


function normalizeView(raw: any): StatsView {
  const v = String(raw || "global");
  return v === "individual" || v === "momentum" ? v : "global";
}

function buildSetSummaries(events: any[], source: any) {
  const baseA = Math.max(0, n(source?.handicapB ?? source?.summary?.handicapB, 0));
  const baseB = Math.max(0, n(source?.handicapA ?? source?.summary?.handicapA, 0));
  let scoreA = baseA;
  let scoreB = baseB;
  let setNo = 1;
  const sets: any[] = [];
  (Array.isArray(events) ? events : []).forEach((raw: any) => {
    const ev = raw || {};
    const t = String(ev.t || "").toLowerCase();
    if (t === "goal") {
      const pts = Math.max(1, n(ev.points, 1));
      if (ev.team === "A") scoreA += pts;
      if (ev.team === "B") scoreB += pts;
    } else if (t === "special" || t === "demi") {
      scoreA = Math.max(0, scoreA + n(ev.scoreDeltaA, 0));
      scoreB = Math.max(0, scoreB + n(ev.scoreDeltaB, 0));
      if (t === "demi" && !n(ev.scoreDeltaA, 0) && !n(ev.scoreDeltaB, 0)) {
        const penalty = Math.max(0, n(ev.lastBallPenalty, 0));
        if (penalty > 0) {
          if (ev.team === "A") scoreA = Math.max(0, scoreA - penalty);
          if (ev.team === "B") scoreB = Math.max(0, scoreB - penalty);
        }
      }
    }
    if (t === "set_win") {
      const winner = scoreA === scoreB ? (ev.team || null) : scoreA > scoreB ? "A" : "B";
      sets.push({ setNo, scoreA, scoreB, winnerTeam: winner, at: ev.at || 0 });
      setNo += 1;
      scoreA = baseA;
      scoreB = baseB;
    }
  });
  return sets;
}

function scoreRowTime(ts: any) {
  try {
    const d = new Date(n(ts, Date.now()));
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return fmtDate(ts);
  }
}

function resolveCompetitionBanner(params: any, payload: any, summary: any, match: any) {
  const leagueId = String(params?.leagueId || payload?.leagueId || summary?.leagueId || match?.leagueId || "").trim();
  if (leagueId) {
    const league = loadBabyFootLeagues().find((row: any) => String(row?.id || "") === leagueId);
    return {
      type: "league",
      label: "Ligue",
      name: String(league?.name || "Ligue Baby-Foot"),
      logo: league?.logoDataUrl || null,
      cover: league?.coverDataUrl || league?.coverUrl || tickerBabyFootLigue,
    };
  }
  const tournamentId = String(params?.tournamentId || payload?.tournamentId || summary?.tournamentId || match?.tournamentId || "").trim();
  if (tournamentId) {
    const tournament = getTournamentLocal(tournamentId);
    return {
      type: "tournament",
      label: "Tournoi",
      name: String(tournament?.name || "Tournoi Baby-Foot"),
      logo: tournament?.logoDataUrl || tournament?.logoUrl || tournament?.avatarDataUrl || null,
      cover: tournament?.coverDataUrl || tournament?.coverUrl || tickerBabyFootTournoi,
    };
  }
  return {
    type: "friendly",
    label: "Amical",
    name: "Match amical",
    logo: null,
    cover: tickerBabyFootMatch,
  };
}

function iconButtonBase(theme: any, active: boolean): React.CSSProperties {
  return {
    minHeight: 50,
    borderRadius: 16,
    border: `1px solid ${active ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
    background: active ? `${theme.primary}18` : "rgba(255,255,255,.04)",
    color: active ? theme.primary : theme.textSoft,
    boxShadow: active ? `0 0 18px ${theme.primary}22, inset 0 0 14px ${theme.primary}12` : "none",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transition: "all .18s ease",
  };
}

function InlineIcon({ kind, color = "currentColor", size = 22 }: { kind: string; color?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "global") return <svg {...common}><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" /></svg>;
  if (kind === "individual") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 4.13a4 4 0 0 1 0 7.75" /></svg>;
  if (kind === "momentum") return <svg {...common}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>;
  if (kind === "list") return <svg {...common}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="4" cy="6" r="1" fill={color} stroke="none" /><circle cx="4" cy="12" r="1" fill={color} stroke="none" /><circle cx="4" cy="18" r="1" fill={color} stroke="none" /></svg>;
  return null;
}

function statLowerIsBetter(label: string) {
  return ["Points encaissés", "Points perdus", "Demi dernière balle", "Pissettes refusées", "CSC"].includes(label);
}

function finishRuleLabel(summary: any, payload: any) {
  const scoreMode = String(summary?.scoreMode || payload?.scoreMode || "target").toLowerCase();
  const target = Math.max(1, n(summary?.target ?? payload?.target, 10));
  let base = `${target} buts`;
  if (scoreMode === "chrono") {
    const sec = n(summary?.matchDurationSec ?? payload?.matchDurationSec, 0);
    base = sec > 0 ? `Temps · ${fmtDuration(sec * 1000)}` : "Temps";
  } else if (scoreMode === "balls5") base = "Finish · 5 balles";
  else if (scoreMode === "balls10") base = "Finish · 10 balles";
  else if (scoreMode === "balls11") base = "Finish · 11 balles";
  else base = `Finish · ${target} buts`;
  if (summary?.setsEnabled ?? payload?.setsEnabled) {
    const bestOf = Math.max(1, n(summary?.setsBestOf ?? payload?.setsBestOf, 1));
    return `BO${bestOf} sets · ${base}`;
  }
  return base;
}

function statBestSide(label: string, left: any, right: any) {
  const ln = Number(String(left).replace("+", ""));
  const rn = Number(String(right).replace("+", ""));
  if (!Number.isFinite(ln) || !Number.isFinite(rn) || ln === rn) return null;
  if (label === "Demi dernière balle") {
    const leftLoss = Math.abs(ln);
    const rightLoss = Math.abs(rn);
    if (leftLoss === rightLoss) return null;
    return leftLoss < rightLoss ? "left" : "right";
  }
  const lowerBetter = statLowerIsBetter(label);
  if (lowerBetter) return ln < rn ? "left" : "right";
  return ln > rn ? "left" : "right";
}

function buildNeonWidths(rows: any[]) {
  const magnitudes = rows.map(([label, left, right]: any) => ({
    label,
    left,
    right,
    leftN: Math.abs(Number(String(left).replace("+", "")) || 0),
    rightN: Math.abs(Number(String(right).replace("+", "")) || 0),
  }));
  const maxVal = Math.max(1, ...magnitudes.flatMap((row: any) => [row.leftN, row.rightN]));
  return magnitudes.map((row: any) => ({
    ...row,
    leftW: `${Math.max(8, (row.leftN / maxVal) * 100)}%`,
    rightW: `${Math.max(8, (row.rightN / maxVal) * 100)}%`,
    bestSide: statBestSide(row.label, row.left, row.right),
  }));
}



function teamIdentityImage(teamName: string, players: any[], teamLogo?: string | null) {
  return teamLogo || avatarOf((players || [])[0]) || null;
}

function TeamIdentityBadge({ theme, image, fallback, accent, size = 42, shape = "circle" }: any) {
  return (
    <div style={{ width: size, height: size, borderRadius: shape === "round" ? 14 : 999, border: `1px solid ${accent}66`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.05)", boxShadow: `0 0 14px ${accent}33` }}>
      {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontSize: Math.max(14, size * .34), fontWeight: 1100 }}>{String(fallback || "?").slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

function IconTextPill({ theme, icon, text, accent, image, faint = false }: any) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, borderRadius: 999, padding: "5px 10px", border: `1px solid ${accent}44`, background: faint ? "rgba(255,255,255,.03)" : `${accent}12`, color: theme.text }}>
      {image ? <img src={image} alt="" style={{ width: 18, height: 18, objectFit: "contain", flex: "0 0 auto" }} /> : icon ? <span style={{ color: accent }}>{icon}</span> : null}
      <span style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 11, fontWeight: 1000 }}>{text}</span>
    </div>
  );
}

function TeamMomentumIdentity({ theme, image, label, accent, align = "left" }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: align === "right" ? "flex-end" : "flex-start", minWidth: 0 }}>
      <TeamIdentityBadge theme={theme} image={image} fallback={label} accent={accent} size={36} shape={image && String(label || "").toUpperCase().startsWith("TEAM") ? "round" : "circle"} />
    </div>
  );
}
export default function BabyFootEndPage({ go, store, params }: Props) {
  const { theme } = useTheme();
  const requestedId = String(params?.matchId || params?.focusMatchId || params?.matchPayload?.id || params?.matchPayload?.matchId || "").trim();
  const routeMatch = pickMatch(store, params);
  const [idbMatch, setIdbMatch] = React.useState<AnyMatch | null>(null);
  const [loading, setLoading] = React.useState(Boolean(requestedId));
  const [view, setView] = React.useState<StatsView>(() => {
    const raw = String(params?.statsView || "global");
    return raw === "individual" || raw === "momentum" ? raw : "global";
  });
  const [individualTeam, setIndividualTeam] = React.useState<TeamId>("A");

  React.useEffect(() => {
    let alive = true;
    if (!requestedId) {
      setIdbMatch(null);
      setLoading(false);
      return () => { alive = false; };
    }
    setLoading(true);
    Promise.resolve((History as any).get?.(requestedId))
      .then((row: any) => { if (alive) setIdbMatch(row || null); })
      .catch(() => { if (alive) setIdbMatch(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [requestedId]);

  const match = React.useMemo(() => mergeHistoryMatch(routeMatch, idbMatch), [routeMatch, idbMatch]);
  const resolvedMatch = React.useMemo(() => resolveBabyFootRecord(match), [match]);
  const payload = resolvedMatch;
  const summary = getSummary(resolvedMatch, resolvedMatch);
  const players = allPlayers(match, payload);
  const events = getEventsFrom(payload, summary, match);
  const eventScore = React.useMemo(() => deriveBabyFootScoreFromRecord({ ...objectOrEmpty(match), ...objectOrEmpty(payload), summary: { ...objectOrEmpty(summary), events }, events }), [match, payload, summary, events]);
  const fallbackDisplayScore = getBabyFootDisplayScorePair(summary, payload, match, params);
  const displayScore = eventScore.hasScoringEvents ? eventScore : fallbackDisplayScore;
  const scoreA = displayScore.scoreA;
  const scoreB = displayScore.scoreB;
  const teamA = String(summary?.teamA || payload?.teamA || match?.teamA || params?.teamA || "Équipe A");
  const teamB = String(summary?.teamB || payload?.teamB || match?.teamB || params?.teamB || "Équipe B");
  const winnerTeam = String(summary?.winnerTeam || payload?.winnerTeam || match?.winnerTeam || (scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "D"));
  const winnerLabel = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : "Match nul";
  const durationMs = summary?.durationMs ?? payload?.durationMs ?? match?.durationMs ?? params?.durationMs;
  const teamAPlayers = teamPlayers(players, payload, summary, "A");
  const teamBPlayers = teamPlayers(players, payload, summary, "B");
  const teamALogo = recordTeamLogo(payload, summary, "A");
  const teamBLogo = recordTeamLogo(payload, summary, "B");

  const richStats = React.useMemo(() => {
    return computeBabyFootRichStats({
      ...payload,
      scoreA,
      scoreB,
      events,
      summary: { ...summary, scoreA, scoreB, events, specialStats: summary?.specialStats || payload?.specialStats, stats: summary?.stats || payload?.stats },
    });
  }, [payload, summary, scoreA, scoreB, events]);

  const individualRows = React.useMemo(
    () => buildIndividualRows(match, payload, summary, events, winnerTeam),
    [match, payload, summary, events, winnerTeam]
  );
  const individualA = individualRows.filter((row) => row.team === "A");
  const individualB = individualRows.filter((row) => row.team === "B");
  const visibleIndividuals = individualTeam === "A" ? individualA : individualB;
  React.useEffect(() => {
    if (individualTeam === "A" && !individualA.length && individualB.length) setIndividualTeam("B");
    if (individualTeam === "B" && !individualB.length && individualA.length) setIndividualTeam("A");
  }, [individualA.length, individualB.length, individualTeam]);

  const timelineRows = React.useMemo(() => buildTimelineRows(events, payload, summary, match, teamA, teamB), [events, payload, summary, match, teamA, teamB]);
  const backToLeague = params?.fromLeague || params?.leagueId || payload?.fromLeague || payload?.leagueId;
  const leagueParams = { leagueId: String(params?.leagueId || payload?.leagueId || ""), view: "detail", tab: "calendar" };
  const competitionBanner = React.useMemo(() => resolveCompetitionBanner(params, payload, summary, match), [params, payload, summary, match]);
  const matchId = String(payload?.matchId || match?.id || match?.matchId || requestedId || "");
  const goBack = () => backToLeague ? go("babyfoot_league" as any, leagueParams) : go("babyfoot_stats_history" as any, { focusMatchId: matchId });

  const infoContent = (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.5 }}>
      <div><strong>Stats globales</strong> compare les deux équipes : buts par ligne, demis, gamelles, pêches, pissettes, parachutes, CSC et dynamique du score.</div>
      <div><strong>Stats individuelles</strong> détaille les actions attribuées à chaque joueur.</div>
      <div><strong>Momentum</strong> visualise les temps forts du match, tandis que <strong>Détails</strong> conserve la liste des moments clés comme avant.</div>
      <div style={{ opacity: .72 }}>Les anciennes parties dépourvues de journal d’actions ne peuvent pas être reconstruites rétroactivement.</div>
    </div>
  );

  if (!match && !loading) {
    return (
      <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: 16 }}>
        <HeaderAboveTicker theme={theme} onBack={goBack} infoContent={infoContent} matchTime={payload?.finishedAt || summary?.finishedAt || match?.finishedAt || match?.updatedAt} competitionBanner={competitionBanner} />
        <section style={{ ...panel(theme), marginTop: 14 }}>
          <div style={sectionTitle(theme)}>Match introuvable</div>
          <div style={small(theme)}>La carte existe peut-être encore dans la liste légère, mais le détail de la partie n’est plus présent dans IndexedDB.</div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: "14px 14px 96px", boxSizing: "border-box" }}>
      <HeaderAboveTicker theme={theme} onBack={goBack} infoContent={infoContent} matchTime={payload?.finishedAt || summary?.finishedAt || match?.finishedAt || match?.updatedAt} competitionBanner={competitionBanner} />

      <section style={{ ...panel(theme), marginTop: 14, padding: 10 }}>
        <ScoreHeroCard
          theme={theme}
          teamA={teamA}
          teamB={teamB}
          playersA={teamAPlayers}
          playersB={teamBPlayers}
          scoreA={scoreA}
          scoreB={scoreB}
          winnerLabel={winnerLabel}
          durationMs={durationMs}
          mode={String(summary?.mode || payload?.mode || params?.mode || "babyfoot").toUpperCase()}
          finishedAt={payload?.finishedAt || summary?.finishedAt || match?.finishedAt || match?.updatedAt}
          summary={summary}
          payload={payload}
          events={events}
        />
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <StatsViewSelector theme={theme} view={view} setView={setView} />
        {view === "global" ? (
          <GlobalStatsView
            theme={theme}
            teamA={teamA}
            teamB={teamB}
            playersA={teamAPlayers}
            playersB={teamBPlayers}
            teamALogo={teamALogo}
            teamBLogo={teamBLogo}
            scoreA={scoreA}
            scoreB={scoreB}
            stats={richStats}
            durationMs={durationMs}
            summary={summary}
            events={events}
          />
        ) : view === "individual" ? (
          <IndividualStatsView
            theme={theme}
            team={individualTeam}
            setTeam={setIndividualTeam}
            teamA={teamA}
            teamB={teamB}
            teamALogo={teamALogo}
            teamBLogo={teamBLogo}
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            rows={visibleIndividuals}
          />
        ) : (
          <MomentumView
            theme={theme}
            teamA={teamA}
            teamB={teamB}
            teamALogo={teamALogo}
            teamBLogo={teamBLogo}
            playersA={teamAPlayers}
            playersB={teamBPlayers}
            scoreA={scoreA}
            scoreB={scoreB}
            timelineRows={timelineRows}
            durationMs={durationMs}
          />
        )}
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={sectionTitle(theme)}>Navigation</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button style={primaryBtn(theme)} onClick={() => go("babyfoot_stats_history" as any, { focusMatchId: matchId })}>HISTORIQUE</button>
          <button style={ghostBtn(theme)} onClick={() => go("babyfoot_stats_center" as any, { mode: summary?.mode || payload?.mode || "all", focusMatchId: matchId })}>STATS BABY</button>
          {backToLeague ? <button style={{ ...ghostBtn(theme), gridColumn: "1 / -1" }} onClick={() => go("babyfoot_league" as any, leagueParams)}>RETOUR LIGUE</button> : null}
        </div>
      </section>
    </div>
  );
}

function HeaderAboveTicker({ theme, onBack, infoContent, matchTime, competitionBanner }: any) {
  const banner = competitionBanner || { type: "friendly", label: "Amical", name: "Match amical", cover: tickerBabyFootMatch, logo: null };
  return (
    <header>
      <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 52px", alignItems: "center", gap: 10, marginBottom: 10, minHeight: 48 }}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}><BackDot onClick={onBack} size={44} /></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: theme.primary, fontWeight: 1100, letterSpacing: 1.1, textTransform: "uppercase", fontSize: 15, textShadow: `0 0 14px ${theme.primary}66` }}>RÉSULTAT BABY-FOOT</div>
          {matchTime ? <div style={{ marginTop: 3, fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,.62)" }}>{scoreRowTime(matchTime)}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><InfoDot title="Stats du match Baby-Foot" content={infoContent} size={44} glow={`${theme.primary}88`} /></div>
      </div>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, boxShadow: `0 0 28px ${theme.primary}22`, aspectRatio: "800 / 200", minHeight: 92 }}>
        <img src={banner.cover || tickerBabyFootMatch} alt={banner.name || "Baby-Foot"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: banner.type === "friendly" ? "linear-gradient(90deg, rgba(0,0,0,.22), transparent 24%, transparent 76%, rgba(0,0,0,.22))" : "linear-gradient(90deg, rgba(0,0,0,.48), rgba(0,0,0,.12) 28%, rgba(0,0,0,.12) 72%, rgba(0,0,0,.48))" }} />
        {banner.type !== "friendly" ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", alignContent: "center", justifyItems: "center", gap: 5, padding: 12 }}>
            {banner.logo ? <div style={{ width: 52, height: 52, borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.primary}66`, background: "rgba(3,8,16,.66)", boxShadow: `0 0 18px ${theme.primary}22` }}><img src={banner.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div> : null}
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8 }}>{banner.label}</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 1100, textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,.45)", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.1 }}>{banner.name}</div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "center" }}>
            <div style={{ borderRadius: 999, padding: "6px 14px", border: `1px solid ${theme.primary}66`, background: "rgba(2,10,22,.56)", color: theme.primary, fontSize: 11, fontWeight: 1100, letterSpacing: .8, textTransform: "uppercase", boxShadow: `0 0 16px ${theme.primary}20` }}>Amical</div>
          </div>
        )}
      </div>
    </header>
  );
}

function StatsViewSelector({ theme, view, setView }: any) {
  const item = (key: StatsView, icon: string, label: string) => (
    <button type="button" aria-label={label} title={label} onClick={() => setView(key)} style={iconButtonBase(theme, view === key)}>
      <InlineIcon kind={icon} color={view === key ? theme.primary : theme.textSoft} size={22} />
    </button>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
      {item("global", "global", "Stats globales")}
      {item("individual", "individual", "Stats individuelles")}
      {item("momentum", "momentum", "Momentum")}
    </div>
  );
}


function ScoreHeroCard({ theme, teamA, teamB, playersA, playersB, scoreA, scoreB, winnerLabel, durationMs, mode, finishedAt, summary, payload, events }: any) {
  const isTeamMode = String(mode || "").includes("2V2") || (Array.isArray(playersA) && playersA.length > 1) || (Array.isArray(playersB) && playersB.length > 1);
  const teamALogo = recordTeamLogo(payload, summary, "A");
  const teamBLogo = recordTeamLogo(payload, summary, "B");
  const leftBackdrop = teamALogo || avatarOf((playersA || [])[0]) || null;
  const rightBackdrop = teamBLogo || avatarOf((playersB || [])[0]) || null;
  const winnerAccent = scoreA === scoreB ? "#ffd76a" : scoreA > scoreB ? "#78ff9f" : "#ff70bd";
  const diff = scoreA - scoreB;
  const setsEnabled = !!(summary?.setsEnabled ?? payload?.setsEnabled);
  const bestOf = Math.max(1, Math.floor(n(summary?.setsBestOf ?? payload?.setsBestOf, 1)));
  const setsA = Math.max(0, n(summary?.setsA ?? payload?.setsA, 0));
  const setsB = Math.max(0, n(summary?.setsB ?? payload?.setsB, 0));
  const needed = Math.max(1, Math.floor(bestOf / 2) + 1);
  const indicatorSlots = Math.max(needed, bestOf);
  const setSummaries = setsEnabled ? buildSetSummaries(events, { ...payload, summary }) : [];
  const winnerSide = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
  const finishRule = finishRuleLabel(summary, payload);
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 24, border: `1px solid ${winnerAccent}44`, background: `linear-gradient(135deg,${winnerAccent}10,rgba(255,255,255,.03) 42%,rgba(0,0,0,.34))`, boxShadow: `0 16px 36px rgba(0,0,0,.34), inset 0 0 30px ${winnerAccent}10` }}>
      {leftBackdrop ? <div aria-hidden="true" style={{ position: "absolute", left: -34, top: "54%", transform: "translateY(-50%)", opacity: .13, pointerEvents: "none", filter: "grayscale(1) brightness(.9)" }}><img src={leftBackdrop} alt="" style={{ width: 200, height: 200, objectFit: isTeamMode ? "contain" : "cover", borderRadius: isTeamMode ? 34 : 999 }} /></div> : null}
      {rightBackdrop ? <div aria-hidden="true" style={{ position: "absolute", right: -34, top: "54%", transform: "translateY(-50%)", opacity: .13, pointerEvents: "none", filter: "grayscale(1) brightness(.9)" }}><img src={rightBackdrop} alt="" style={{ width: 200, height: 200, objectFit: isTeamMode ? "contain" : "cover", borderRadius: isTeamMode ? 34 : 999 }} /></div> : null}
      <div style={{ position: "relative", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: winnerAccent, border: `1px solid ${winnerAccent}55`, background: `${winnerAccent}12`, borderRadius: 999, padding: "4px 10px", fontSize: 10, fontWeight: 1000 }}>{mode}</span>
          <span style={{ color: "rgba(255,255,255,.92)", border: `1px solid rgba(255,255,255,.14)`, background: "rgba(255,255,255,.05)", borderRadius: 999, padding: "4px 10px", fontSize: 10, fontWeight: 1000 }}>{finishRule}</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center" }}>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 62, gap: 6 }}>
            <div style={{ color: theme.primary, fontSize: isTeamMode ? "clamp(10px, 2.9vw, 15px)" : "clamp(11px, 3vw, 16px)", fontWeight: 1000, lineHeight: 1.08, textShadow: `0 0 12px ${theme.primary}55`, whiteSpace: "normal", overflowWrap: "anywhere", alignSelf: "flex-start", maxWidth: "100%", textTransform: "uppercase" }}>{teamA}</div>
            {setsEnabled ? <SetDots color={theme.primary} won={setsA} total={indicatorSlots} align="left" /> : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, justifySelf: "center" }}>
            <ScoreKpiMini value={scoreA} color={theme.primary} trophySide={winnerSide === "A" ? "left" : undefined} />
            <ScoreKpiMini value={scoreB} color="#ff70bd" trophySide={winnerSide === "B" ? "right" : undefined} />
          </div>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", minHeight: 62, gap: 6 }}>
            <div style={{ color: "#ff70bd", fontSize: isTeamMode ? "clamp(10px, 2.9vw, 15px)" : "clamp(11px, 3vw, 16px)", fontWeight: 1000, lineHeight: 1.08, textAlign: "right", textShadow: "0 0 12px rgba(255,89,176,.55)", whiteSpace: "normal", overflowWrap: "anywhere", minWidth: 0, alignSelf: "flex-end", maxWidth: "100%", textTransform: "uppercase" }}>{teamB}</div>
            {setsEnabled ? <SetDots color="#ff70bd" won={setsB} total={indicatorSlots} align="right" /> : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
            <div style={{ color: "rgba(255,255,255,.78)", fontSize: 11, fontWeight: 900 }}>Temps de jeu : {fmtDurationFancy(durationMs)}</div>
          </div>
          <div style={{ justifySelf: "end", borderRadius: 14, padding: "6px 10px", border: `1px solid ${winnerAccent}66`, background: `radial-gradient(circle at 50% 25%,${winnerAccent}20,rgba(0,0,0,.18))` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ color: "rgba(255,255,255,.6)", fontSize: 9, fontWeight: 1000, letterSpacing: .7 }}>DIFF</span>
              <span style={{ color: winnerAccent, fontSize: 16, fontWeight: 1000 }}>{diff >= 0 ? `+${diff}` : String(diff)}</span>
            </div>
          </div>
        </div>

        {setsEnabled ? <SetSummaryTable theme={theme} teamA={teamA} teamB={teamB} rows={setSummaries} /> : null}
      </div>
    </div>
  );
}

function SetDots({ color, won, total, align }: any) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: align === "right" ? "flex-end" : "flex-start", alignItems: "center", minHeight: 12 }}>
      {Array.from({ length: Math.max(1, total) }).map((_, index) => {
        const filled = index < won;
        return <span key={index} style={{ width: 9, height: 9, borderRadius: 999, background: filled ? color : "transparent", border: `1px solid ${filled ? color : color + '88'}`, boxShadow: filled ? `0 0 10px ${color}` : "none", opacity: filled ? 1 : .7 }} />;
      })}
    </div>
  );
}

function SetSummaryTable({ theme, teamA, teamB, rows }: any) {
  if (!rows?.length) return null;
  return (
    <div style={{ marginTop: 12, borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(7,12,22,.52)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 46px", gap: 8, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.62)", fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .6 }}>
        <div>Set</div>
        <div style={{ textAlign: "center" }}>{teamA} / {teamB}</div>
        <div style={{ textAlign: "right" }}>Gagné</div>
      </div>
      {rows.map((row: any, index: number) => (
        <div key={`${row.setNo}-${index}`} style={{ display: "grid", gridTemplateColumns: "60px 1fr 46px", gap: 8, alignItems: "center", padding: "8px 10px", borderTop: index ? "1px solid rgba(255,255,255,.06)" : "none" }}>
          <div style={{ color: theme.textSoft, fontSize: 11, fontWeight: 1000 }}>#{row.setNo}</div>
          <div style={{ textAlign: "center", fontWeight: 1100 }}><span style={{ color: theme.primary }}>{row.scoreA}</span><span style={{ color: "rgba(255,255,255,.6)" }}> - </span><span style={{ color: "#ff70bd" }}>{row.scoreB}</span></div>
          <div style={{ textAlign: "right", fontWeight: 1100, color: row.winnerTeam === "A" ? theme.primary : "#ff70bd" }}>{row.winnerTeam === "A" ? "A" : row.winnerTeam === "B" ? "B" : "—"}</div>
        </div>
      ))}
    </div>
  );
}

function ScoreKpiMini({ value, color, trophySide }: { value: number; color: string; trophySide?: "left" | "right" }) {
  return (
    <div style={{ position: "relative", minWidth: 44, borderRadius: 14, padding: "8px 10px", border: `1px solid ${color}55`, background: `linear-gradient(180deg,${color}16,rgba(255,255,255,.04))`, boxShadow: `0 0 14px ${color}20 inset`, textAlign: "center" }}>
      {trophySide ? (
        <img
          src={trophyCup}
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            [trophySide]: -18,
            transform: "translateY(-50%)",
            width: 30,
            height: 30,
            objectFit: "contain",
            filter: "drop-shadow(0 0 8px rgba(255,215,106,.6))",
          } as React.CSSProperties}
        />
      ) : null}
      <div style={{ color, fontSize: 24, lineHeight: .95, fontWeight: 1000, textShadow: `0 0 12px ${color}44`, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function MomentumView({ theme, teamA, teamB, teamALogo, teamBLogo, playersA, playersB, scoreA, scoreB, timelineRows, durationMs }: any) {
  const [subView, setSubView] = React.useState<"momentum" | "journal">("momentum");
  const entries = buildMomentumEntries(timelineRows);
  if (!entries.length && !timelineRows.length) {
    return (
      <div style={{ ...small(theme), padding: 12, borderRadius: 14, border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.18)"}`, background: "rgba(255,255,255,.025)" }}>
        Aucun momentum n’est disponible sur cette sauvegarde.
      </div>
    );
  }

  const totalMs = Math.max(1000, n(durationMs, 0), ...entries.map((row: any) => n(row?.elapsedMs, 0)), ...timelineRows.map((row: any) => n(row?.elapsedMs, 0)));
  const ticks = buildTimeTicks(totalMs, 5);
  const baseY = 122;
  const chartH = 260;
  const periods = [
    { key: "start", label: "Entame", short: "0-20%", from: 0, to: .2, color: "#45b8ff" },
    { key: "rise", label: "Montée", short: "20-40%", from: .2, to: .4, color: "#77ff99" },
    { key: "heart", label: "Cœur", short: "40-60%", from: .4, to: .6, color: "#ffd45c" },
    { key: "money", label: "Money time", short: "60-80%", from: .6, to: .8, color: "#ffb35c" },
    { key: "finish", label: "Finish", short: "80-100%", from: .8, to: 1, color: "#b78cff" },
  ];
  const chartPadPct = 4;
  const chartScalePct = 100 - chartPadPct * 2;
  const xPct = (ratio: number) => chartPadPct + Math.max(0, Math.min(1, ratio)) * chartScalePct;
  const periodFor = (ratio: number) => periods.find((p: any, index: number) =>
    ratio >= p.from && (index === periods.length - 1 ? ratio <= p.to : ratio < p.to)
  ) || periods[periods.length - 1];
  const periodCounts = periods.map((period: any) => ({
    ...period,
    count: entries.filter((row: any) => {
      const ratio = Math.max(0, Math.min(1, n(row.elapsedMs, 0) / totalMs));
      const isLast = period.key === periods[periods.length - 1].key;
      return ratio >= period.from && (isLast ? ratio <= period.to : ratio < period.to);
    }).length,
  }));

  let runStart = 0;
  const runMeta = entries.map((row: any, index: number) => {
    if (index === 0 || entries[index - 1]?.team !== row.team || !row.team) runStart = index;
    let runEnd = index;
    while (runEnd + 1 < entries.length && entries[runEnd + 1]?.team === row.team && row.team) runEnd += 1;
    const runLength = Math.max(1, runEnd - runStart + 1);
    const position = index - runStart;
    const center = (runLength - 1) / 2;
    const mountain = runLength <= 1 ? 0 : 1 - Math.min(1, Math.abs(position - center) / Math.max(.5, center));
    return { runLength, mountain };
  });

  const tabBtn = (active: boolean): React.CSSProperties => ({
    borderRadius: 16,
    padding: "12px 10px",
    border: `1px solid ${active ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
    background: active ? `${theme.primary}18` : "rgba(255,255,255,.04)",
    color: active ? theme.primary : theme.text,
    fontWeight: 1100,
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: .5,
  });

  const aImage = teamIdentityImage(teamA, playersA, teamALogo);
  const bImage = teamIdentityImage(teamB, playersB, teamBLogo);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <button type="button" onClick={() => setSubView("momentum")} style={tabBtn(subView === "momentum")}>MOMENTUM</button>
        <button type="button" onClick={() => setSubView("journal")} style={tabBtn(subView === "journal")}>JOURNAL</button>
      </div>

      {subView === "journal" ? (
        <div style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "linear-gradient(180deg, rgba(5,16,34,.92), rgba(2,8,18,.86))", padding: 12, boxShadow: `0 0 26px ${theme.primary}12 inset` }}>
          <div style={{ ...sectionTitle(theme), display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span>Journal des actions</span>
            <span style={{ fontSize: 11, color: theme.primary }}>{timelineRows.length} action{timelineRows.length > 1 ? "s" : ""}</span>
          </div>
          <MatchTimelineDetails theme={theme} timelineRows={timelineRows} />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
            <TeamMomentumIdentity theme={theme} image={aImage} label={teamA} accent={theme.primary} align="left" />
            <div style={{ padding: "8px 12px", borderRadius: 16, border: `1px solid ${theme.primary}55`, background: "rgba(255,255,255,.035)", fontWeight: 1100, fontSize: 22, color: theme.text, boxShadow: `0 0 22px ${theme.primary}18 inset` }}>{scoreA} - {scoreB}</div>
            <TeamMomentumIdentity theme={theme} image={bImage} label={teamB} accent="#ff59b0" align="right" />
          </div>

          <div style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "linear-gradient(180deg, rgba(5,16,34,.92), rgba(2,8,18,.86))", padding: 12, boxShadow: `0 0 26px ${theme.primary}12 inset` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ color: theme.text, fontWeight: 1000, letterSpacing: .9, textTransform: "uppercase" }}>Momentum</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, fontWeight: 900, color: theme.textSoft }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }} />{teamA}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff59b0", boxShadow: "0 0 10px rgba(255,89,176,.8)" }} />{teamB}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "#ffd76a", boxShadow: "0 0 10px rgba(255,215,106,.8)" }} />Demi pénalisant</span>
              </div>
            </div>

            <div style={{ position: "relative", height: chartH, overflow: "hidden", borderRadius: 16, background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}` }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.16), transparent 30%, transparent 70%, rgba(0,0,0,.18))" }} />
              {periods.map((period: any) => (
                <div key={period.key} style={{ position: "absolute", left: `${xPct(period.from)}%`, width: `${Math.max(0, (period.to - period.from) * chartScalePct)}%`, top: 0, bottom: 0, background: `linear-gradient(180deg, ${period.color}12, transparent 42%, transparent 58%, ${period.color}10)`, borderLeft: `1px solid ${period.color}22` }} />
              ))}
              <div style={{ position: "absolute", left: 12, right: 12, top: baseY, height: 2, background: "linear-gradient(90deg, rgba(69,184,255,.65), rgba(255,255,255,.45), rgba(255,89,176,.65))", boxShadow: `0 0 10px ${theme.primary}33` }} />
              {ticks.map((tick: any) => (
                <React.Fragment key={`${tick.ratio}-${tick.label}`}>
                  <div style={{ position: "absolute", top: 18, bottom: 24, left: `${xPct(tick.ratio)}%`, width: 1, background: `${periodFor(tick.ratio).color}33` }} />
                  <div style={{ position: "absolute", bottom: 7, left: `${xPct(tick.ratio)}%`, transform: tick.edge === "start" ? "none" : tick.edge === "end" ? "translateX(-100%)" : "translateX(-50%)", fontSize: 10, fontWeight: 1000, color: periodFor(Math.min(.999999, tick.ratio)).color, textShadow: `0 0 8px ${periodFor(Math.min(.999999, tick.ratio)).color}66`, whiteSpace: "nowrap" }}>{tick.label}</div>
                </React.Fragment>
              ))}
              {entries.map((row: any, index: number) => {
                const ratio = Math.max(0, Math.min(1, n(row.elapsedMs, 0) / totalMs));
                const x = xPct(ratio);
                const isPenalty = row.type === "demi" && row.penalty > 0;
                const team = row.team === "B" ? "B" : "A";
                const sideAccent = isPenalty ? "#ffd76a" : team === "B" ? "#ff59b0" : theme.primary;
                const period = periodFor(ratio);
                const accent = isPenalty ? "#ffd76a" : period.color;
                const run = runMeta[index] || { runLength: 1, mountain: 0 };
                const weight = Math.max(1, n(row.weight, 1));
                const barHeight = Math.min(96, 24 + (run.runLength > 1 ? 22 : 0) + run.mountain * 48 + Math.min(22, (weight - 1) * 12));
                const barWidth = Math.max(5, Math.min(14, 7 + Math.min(6, weight * 2)));
                const bottom = chartH - baseY;
                const top = baseY;
                return (
                  <div key={row.key || index} title={`${row.time} · ${row.label} · ${row.score}`} style={{ position: "absolute", left: `calc(${x}% - ${Math.round(barWidth / 2)}px)`, insetBlock: 0 }}>
                    <div style={{ position: "absolute", left: 0, width: barWidth, borderRadius: 999, background: `linear-gradient(180deg, ${sideAccent}, ${accent}cc)`, boxShadow: `0 0 14px ${sideAccent}`, opacity: .96, ...(team === "A" ? { bottom: `${bottom}px`, height: barHeight } : { top: `${top}px`, height: barHeight }) }} />
                    {isPenalty ? <div style={{ position: "absolute", left: `calc(50% - 11px)`, top: team === "A" ? baseY - barHeight - 20 : baseY + barHeight + 2, width: 22, height: 22, lineHeight: "22px", borderRadius: 999, border: `1px solid ${sideAccent}99`, background: "rgba(4,9,18,.88)", color: sideAccent, textAlign: "center", fontSize: 11, fontWeight: 1100, boxShadow: `0 0 12px ${sideAccent}33` }}>½</div> : null}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
              {periodCounts.map((period: any) => (
                <div key={period.key} style={{ display: "grid", gridTemplateColumns: "78px minmax(0,1fr) 42px", gap: 8, alignItems: "center", fontSize: 10, fontWeight: 900 }}>
                  <div style={{ color: period.color }}><div style={{ fontSize: 11, fontWeight: 1100 }}>{period.label}</div><div style={{ color: theme.textSoft }}>{period.short}</div></div>
                  <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}>
                    <div style={{ width: `${entries.length ? (period.count / entries.length) * 100 : 0}%`, height: "100%", background: period.color, boxShadow: `0 0 10px ${period.color}66` }} />
                  </div>
                  <div style={{ color: period.color, textAlign: "right", fontSize: 12, fontWeight: 1100 }}>{period.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MatchTimelineDetails({ theme, timelineRows }: any) {
  return timelineRows.length ? (
    <div style={{ display: "grid", gap: 10, maxHeight: 480, overflow: "auto", padding: "4px 2px 4px 2px" }}>
      {timelineRows.map((row: any, i: number) => {
        const accent = row.type === "demi" && row.penalty > 0 ? "#ffd76a" : row.team === "B" ? "#ff59b0" : row.team === "A" ? theme.primary : "#82cfff";
        const tag = row.type === "goal" ? (row.kind === "csc" ? "CSC" : row.kind === "parachute" ? "PARACHUTE" : row.kind === "pissette" ? "PISSETTE" : row.kind === "gamelle" ? "GAMELLE" : "BUT") : row.type === "demi" ? (row.penalty > 0 ? "DEMI -2" : "DEMI") : row.type === "special" ? String(row.kind || "ACTION").replace(/_/g, " ").toUpperCase() : "INFO";
        return (
          <div key={row.key || i} style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr) 56px", gap: 10, alignItems: "stretch" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <div style={{ minWidth: 48, borderRadius: 999, padding: "6px 8px", textAlign: "center", border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, fontSize: 11, fontWeight: 1100, boxShadow: `0 0 12px ${accent}22 inset` }}>{row.time}</div>
            </div>
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, padding: "10px 12px 10px 16px", border: `1px solid ${accent}55`, background: `linear-gradient(180deg, ${accent}14, rgba(255,255,255,.02))`, boxShadow: `0 0 16px ${accent}10 inset` }}>
              <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 999, background: accent, boxShadow: `0 0 10px ${accent}` }} />
              {row.actorAvatar ? <img aria-hidden="true" src={row.actorAvatar} alt="" style={{ position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)", width: 88, height: 88, objectFit: "cover", borderRadius: 999, opacity: .28, filter: "saturate(.9) brightness(.85)", pointerEvents: "none", boxShadow: `0 0 18px ${accent}22` }} /> : null}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ borderRadius: 999, padding: "3px 8px", background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 9, fontWeight: 1100, letterSpacing: .5 }}>{tag}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingRight: row.actorAvatar ? 36 : 0 }}>
                {row.isTwoVsTwo && row.teamLogo ? <img src={row.teamLogo} alt="" style={{ width: 28, height: 28, flex: "0 0 auto", objectFit: "contain", borderRadius: 9, border: `1px solid ${accent}66`, background: "rgba(0,0,0,.24)", padding: 2, boxSizing: "border-box", boxShadow: `0 0 10px ${accent}33` }} /> : null}
                <div style={{ minWidth: 0, color: theme.text, fontSize: 12, fontWeight: 900, lineHeight: 1.28, overflowWrap: "anywhere" }}>{row.label}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ minWidth: 50, borderRadius: 12, padding: "8px 8px", textAlign: "center", border: `1px solid ${accent}33`, background: "rgba(255,255,255,.03)", color: theme.text, fontSize: 14, fontWeight: 1100 }}>{row.score}</div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ ...small(theme), padding: 12, borderRadius: 14, border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.18)"}`, background: "rgba(255,255,255,.025)" }}>
      Aucun journal détaillé n’est présent dans cette ancienne sauvegarde. Les prochains matchs enregistreront chaque but, demi, gamelle, pêche, pissette, parachute et CSC.
    </div>
  );
}

function GlobalStatsView({ theme, teamA, teamB, playersA, playersB, teamALogo, teamBLogo, scoreA, scoreB, stats, durationMs, summary, events }: any) {
  const a = objectOrEmpty(stats?.teamA);
  const b = objectOrEmpty(stats?.teamB);
  const losses = babyFootPenaltyLossByTeam(events || []);
  const rows = [
    ["Score final", scoreA, scoreB],
    ["Sets gagnés", n(summary?.setsA ?? a.sets), n(summary?.setsB ?? b.sets)],
    ["Manches gagnées", n(a.legs), n(b.legs)],
    ["Points marqués", n(a.goals), n(b.goals)],
    ["Points encaissés", n(a.goalsConceded), n(b.goalsConceded)],
    ["Points perdus", n(losses.A.total), n(losses.B.total)],
    ["Demi dernière balle", n(losses.A.demi) ? `-${n(losses.A.demi)}` : 0, n(losses.B.demi) ? `-${n(losses.B.demi)}` : 0],
    ["Moyenne / manche", Number(n(a.avgGoalsPerLeg).toFixed(1)), Number(n(b.avgGoalsPerLeg).toFixed(1))],
    ["Différence", signed(n(a.goalDiff)), signed(n(b.goalDiff))],
    ["Buts AV", n(a.goalAv), n(b.goalAv)],
    ["Buts DEF", n(a.goalDef), n(b.goalDef)],
    ["Buts GB", n(a.goalGb), n(b.goalGb)],
    ["Demis", n(a.demi), n(b.demi)],
    ["Bonus demis", n(a.demiBonus), n(b.demiBonus)],
    ["Gamelles", n(a.gamelle), n(b.gamelle)],
    ["Pêches offensives", n(a.pecheOff), n(b.pecheOff)],
    ["Pêches défensives", n(a.pecheDef), n(b.pecheDef)],
    ["Pissettes validées", n(a.pissetteValid), n(b.pissetteValid)],
    ["Pissettes refusées", n(a.pissetteRefused), n(b.pissetteRefused)],
    ["CSC", n(a.csc), n(b.csc)],
    ["Parachutes", n((a as any).parachute), n((b as any).parachute)],
    ["Plus longue série", n(a.longestRun), n(b.longestRun)],
    ["Égalisations", n(a.equalizations), n(b.equalizations)],
    ["Changements leader", n(a.leadChanges), n(b.leadChanges)],
    ["Handicap", n(a.handicap), n(b.handicap)],
  ];
  const neonRows = buildNeonWidths(rows);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <StatBox theme={theme} label="TOTAL POINTS" value={String(scoreA + scoreB)} />
        <StatBox theme={theme} label="DURÉE" value={fmtDuration(durationMs)} />
        <StatBox theme={theme} label="ÉCART" value={String(Math.abs(scoreA - scoreB))} />
      </div>
      <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "linear-gradient(180deg, rgba(18,25,43,.92), rgba(6,10,20,.96))", boxShadow: `0 0 28px ${theme.primary}12 inset` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr 1fr", alignItems: "center", gap: 8, padding: "12px 10px", background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01))", borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}` }}>
          <TeamHeaderMini theme={theme} name={teamA} players={playersA} teamLogo={teamALogo} align="left" />
          <div style={{ textAlign: "center", fontSize: 14, fontWeight: 1100, color: theme.primary, textShadow: `0 0 10px ${theme.primary}44` }}>Stat</div>
          <TeamHeaderMini theme={theme} name={teamB} players={playersB} teamLogo={teamBLogo} align="right" />
        </div>
        {neonRows.map((row: any, index: number) => {
          const leftBest = row.bestSide === "left";
          const rightBest = row.bestSide === "right";
          return (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(70px,1fr) minmax(110px,1.15fr) minmax(70px,1fr)", alignItems: "center", minHeight: 40, borderTop: index ? "1px solid rgba(255,255,255,.06)" : "none" }}>
              <div style={{ position: "relative", padding: "8px 10px 8px 16px", textAlign: "left", fontWeight: 1100, color: leftBest ? theme.primary : theme.text }}>
                {leftBest ? <div style={{ position: "absolute", left: 34, right: 12, top: "50%", transform: "translateY(-50%)", height: 2, background: `linear-gradient(90deg, ${theme.primary}22, ${theme.primary})`, boxShadow: `0 0 12px ${theme.primary}` }} /> : null}
                <span style={{ position: "relative", zIndex: 1 }}>{row.left}</span>
              </div>
              <div style={{ padding: "8px 6px", textAlign: "center", fontSize: 11, fontWeight: 900, color: theme.textSoft, lineHeight: 1.1 }}>{row.label}</div>
              <div style={{ position: "relative", padding: "8px 16px 8px 10px", textAlign: "right", fontWeight: 1100, color: rightBest ? "#ff70bd" : theme.text }}>
                {rightBest ? <div style={{ position: "absolute", left: 12, right: 34, top: "50%", transform: "translateY(-50%)", height: 2, background: "linear-gradient(90deg, #ff70bd, rgba(255,89,176,.22))", boxShadow: "0 0 12px rgba(255,89,176,.9)" }} /> : null}
                <span style={{ position: "relative", zIndex: 1 }}>{row.right}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndividualStatsView({ theme, team, setTeam, teamA, teamB, teamALogo, teamBLogo, teamAPlayers, teamBPlayers, rows }: any) {
  const toggle = () => setTeam(team === "A" ? "B" : "A");
  const teamName = team === "A" ? teamA : teamB;
  const accent = team === "A" ? theme.primary : "#ff59b0";
  const teamLogo = team === "A" ? teamALogo : teamBLogo;
  const teamPlayers = team === "A" ? teamAPlayers : teamBPlayers;
  const canCompare = rows.length >= 2;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={toggle} style={arrowBtn(theme)}>‹</button>
        <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 0, maxWidth: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", borderRadius: 18, border: `1px solid ${accent}55`, background: `linear-gradient(180deg, ${accent}16, rgba(255,255,255,.04))`, boxShadow: `0 0 18px ${accent}18 inset` }}>
            {teamLogo ? <TeamIdentityBadge theme={theme} image={teamLogo} fallback={teamName} accent={accent} size={42} shape="round" /> : <AvatarStack theme={theme} players={teamPlayers} align="left" size={28} />}
            <div style={{ minWidth: 0, color: accent, fontSize: 13, fontWeight: 1100, textTransform: "uppercase", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "center" }}>{teamName}</div>
          </div>
        </div>
        <button type="button" onClick={toggle} style={arrowBtn(theme)}>›</button>
      </div>
      {rows.length ? (
        canCompare ? (
          <PlayerStatsComparisonTable theme={theme} team={team} teamName={teamName} teamLogo={teamLogo} rows={rows.slice(0, 2)} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((row: any, index: number) => <PlayerStatsCard key={row.id} theme={theme} row={row} accent={individualPlayerAccent(team, index, theme)} teamLogo={teamLogo} />)}
          </div>
        )
      ) : (
        <div style={{ ...small(theme), padding: 12 }}>Aucune statistique individuelle n’a été attribuée aux joueurs de cette équipe.</div>
      )}
      <div style={{ marginTop: 10, ...small(theme) }}>Les nouvelles actions sont enregistrées avec le joueur choisi. Une ligne « non attribué » n’apparaît que pour une ancienne partie ou une composition sans profil exploitable.</div>
    </div>
  );
}

function individualPlayerAccent(team: TeamId, index: number, theme: any) {
  const paletteA = [theme.primary, "#7ff6ff", "#9cffc7"];
  const paletteB = ["#ff59b0", "#ff8fd0", "#ffc37a"];
  return (team === "A" ? paletteA : paletteB)[index] || (team === "A" ? theme.primary : "#ff59b0");
}

function buildPlayerStatSnapshot(row: any) {
  const bonusOff = n((row as any).bonusDemiAv);
  const bonusDef = n((row as any).bonusDemiDef) + n((row as any).bonusDemiGb) + n((row as any).bonusDemiMil);
  const parachuteOff = n((row as any).parachuteAv);
  const parachuteDef = n((row as any).parachuteDef) + n((row as any).parachuteGb) + n((row as any).parachuteMil) || Math.max(0, n(row.parachute) - parachuteOff);
  const gamelleOff = n((row as any).gamelleAv) || (!n((row as any).gamelleDef) && !n((row as any).gamelleGb) && !n((row as any).gamelleMil) ? n(row.gamelle) : 0);
  const gamelleDef = n((row as any).gamelleDef) + n((row as any).gamelleGb) + n((row as any).gamelleMil);
  return {
    bonusOff,
    bonusDef,
    parachuteOff,
    parachuteDef,
    gamelleOff,
    gamelleDef,
    rows: [
      ["Points", n(row.points ?? row.goals)],
      ["Buts AV", n(row.goalAv ?? row.av)],
      ["Pêche off.", n(row.pecheOff)],
      ["Pissettes +", n(row.pissetteValid)],
      ["Bonus demi +", bonusOff],
      ["Parachutes AV", parachuteOff],
      ["Gamelles AV", gamelleOff],
      ["Buts DEF", n(row.goalDef ?? row.def)],
      ["Buts GB", n(row.goalGb ?? row.gb)],
      ["Pêche déf.", n(row.pecheDef)],
      ["Bonus demi DEF", bonusDef],
      ["Parachutes DEF/GB", parachuteDef],
      ["Gamelles DEF/GB", gamelleDef],
      ["Demis", n(row.demi)],
      ["Demis dernière balle", n((row as any).demiLastBallCount)],
      ["Pts perdus demi", n((row as any).demiLastBallLoss)],
      ["Gamelles - pts", n((row as any).gamellePenaltyPoints)],
      ["CSC", n(row.csc ?? row.ownGoals)],
      ["Pissettes -", n(row.pissetteRefused)],
    ],
  };
}

function PlayerStatsComparisonTable({ theme, team, teamName, teamLogo, rows }: any) {
  const left = rows[0];
  const right = rows[1];
  const leftAccent = individualPlayerAccent(team, 0, theme);
  const rightAccent = individualPlayerAccent(team, 1, theme);
  const leftSnap = buildPlayerStatSnapshot(left);
  const rightSnap = buildPlayerStatSnapshot(right);
  const entries = leftSnap.rows.map(([label, value]: any, index: number) => ({ label, left: value, right: rightSnap.rows[index]?.[1] ?? 0 }));
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "linear-gradient(180deg, rgba(18,25,43,.92), rgba(6,10,20,.96))", boxShadow: `0 0 28px ${leftAccent}12 inset` }}>
      {teamLogo ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", opacity: .09, filter: "grayscale(1) brightness(.95)" }}><img src={teamLogo} alt="" style={{ width: 260, height: 260, objectFit: "contain" }} /></div> : null}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr .95fr 1fr", alignItems: "center", gap: 8, padding: "12px 10px", background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01))", borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}` }}>
        <PlayerMiniHeader theme={theme} row={left} accent={leftAccent} align="left" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 1100, color: accentForTeam(team, theme), textTransform: "uppercase", whiteSpace: "normal", overflowWrap: "anywhere" }}>{teamName}</div>
          <div style={{ marginTop: 2, fontSize: 11, fontWeight: 1000, color: theme.textSoft }}>Stat</div>
        </div>
        <PlayerMiniHeader theme={theme} row={right} accent={rightAccent} align="right" />
      </div>
      {entries.map((entry: any, index: number) => {
        const leftBest = Number(entry.left) > Number(entry.right);
        const rightBest = Number(entry.right) > Number(entry.left);
        return (
          <div key={entry.label} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(66px,1fr) minmax(110px,1.15fr) minmax(66px,1fr)", alignItems: "center", minHeight: 38, borderTop: index ? "1px solid rgba(255,255,255,.06)" : "none" }}>
            <div style={{ position: "relative", padding: "8px 10px 8px 14px", textAlign: "left", fontWeight: 1100, color: leftBest ? leftAccent : theme.text }}>
              {leftBest ? <div style={{ position: "absolute", left: 30, right: 10, top: "50%", transform: "translateY(-50%)", height: 2, background: `linear-gradient(90deg, ${leftAccent}22, ${leftAccent})`, boxShadow: `0 0 12px ${leftAccent}` }} /> : null}
              <span style={{ position: "relative", zIndex: 1 }}>{entry.left}</span>
            </div>
            <div style={{ padding: "8px 6px", textAlign: "center", fontSize: 11, fontWeight: 900, color: theme.textSoft, lineHeight: 1.1 }}>{entry.label}</div>
            <div style={{ position: "relative", padding: "8px 14px 8px 10px", textAlign: "right", fontWeight: 1100, color: rightBest ? rightAccent : theme.text }}>
              {rightBest ? <div style={{ position: "absolute", left: 10, right: 30, top: "50%", transform: "translateY(-50%)", height: 2, background: `linear-gradient(90deg, ${rightAccent}, ${rightAccent}22)`, boxShadow: `0 0 12px ${rightAccent}` }} /> : null}
              <span style={{ position: "relative", zIndex: 1 }}>{entry.right}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerMiniHeader({ theme, row, accent, align }: any) {
  const avatar = (
    <div style={{ width: 42, height: 42, borderRadius: 999, border: `1px solid ${accent}77`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", flex: "0 0 auto", boxShadow: `0 0 14px ${accent}28` }}>
      {row?.avatar ? <img src={row.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 1100 }}>{String(row?.name || "?").slice(0, 2).toUpperCase()}</span>}
    </div>
  );
  const label = <div style={{ minWidth: 0, color: accent, fontWeight: 1100, fontSize: 14, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textAlign: align }}>{row?.name}</div>;
  return (
    <div style={{ minWidth: 0, width: "100%", display: "grid", gridTemplateColumns: align === "left" ? "auto minmax(0,1fr)" : "minmax(0,1fr) auto", alignItems: "center", gap: 8 }}>
      {align === "left" ? <><div>{avatar}</div><div>{label}</div></> : <><div>{label}</div><div style={{ justifySelf: "end" }}>{avatar}</div></>}
    </div>
  );
}

function accentForTeam(team: TeamId, theme: any) {
  return team === "A" ? theme.primary : "#ff59b0";
}

function PlayerStatsCard({ theme, row, accent, teamLogo }: any) {
  const snapshot = buildPlayerStatSnapshot(row);
  const groups = [
    {
      key: "off",
      title: "Offensif",
      items: snapshot.rows.slice(0, 7),
    },
    {
      key: "def",
      title: "Défensif",
      items: snapshot.rows.slice(7, 13),
    },
    {
      key: "pen",
      title: "Pénalisant / divers",
      items: snapshot.rows.slice(13),
    },
  ];
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 17, padding: 11, border: `1px solid ${accent}4d`, background: `linear-gradient(180deg, ${accent}10, rgba(255,255,255,.025))` }}>
      {teamLogo ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", opacity: .08, filter: "grayscale(1) brightness(.95)" }}><img src={teamLogo} alt="" style={{ width: 250, height: 250, objectFit: "contain" }} /></div> : null}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${accent}77`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", flex: "0 0 auto" }}>
          {row.avatar ? <img src={row.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 1100 }}>{String(row.name || "?").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: accent, fontWeight: 1100, fontSize: 15, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{row.name}</div>
          {row.collective ? <div style={{ marginTop: 3, fontSize: 10, color: theme.textSoft, fontWeight: 900 }}>ANCIENNE PARTIE · NON ATTRIBUÉ</div> : null}
        </div>
      </div>
      <div style={{ position: "relative", marginTop: 10, display: "grid", gap: 10 }}>
        {groups.map((group: any) => (
          <div key={group.key}>
            <div style={{ marginBottom: 6, color: theme.textSoft, fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .7 }}>{group.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
              {group.items.map(([label, value]: any) => (
                <div key={label} style={{ minWidth: 0, borderRadius: 12, padding: "8px 6px", background: "rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: theme.textSoft, fontWeight: 900, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{label}</div>
                  <div style={{ marginTop: 2, color: accent, fontSize: 16, fontWeight: 1100 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBlock({ theme, name, players, align }: { theme: any; name: string; players: any[]; align: "left" | "right" }) {
  return (
    <div style={{ display: "grid", justifyItems: align === "left" ? "start" : "end", gap: 7, minWidth: 0 }}>
      <AvatarStack theme={theme} players={players} align={align} size={52} />
      <div style={{ maxWidth: 128, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: align, fontWeight: 1100, color: theme.primary, textTransform: "uppercase", fontSize: 12 }}>{name}</div>
    </div>
  );
}

function TeamHeaderMini({ theme, name, players, teamLogo, align }: any) {
  const accent = align === "left" ? theme.primary : "#ff70bd";
  return (
    <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 6, flexDirection: align === "left" ? "row" : "row-reverse" }}>
      <AvatarStack theme={theme} players={players} align={align} size={30} />
      <div style={{ minWidth: 0, fontSize: 10, fontWeight: 1100, color: accent, textAlign: align, textTransform: "uppercase", letterSpacing: .2, lineHeight: 1.12, whiteSpace: "normal", overflowWrap: "anywhere", maxWidth: "100%" }}>{name}</div>
    </div>
  );
}

function AvatarStack({ theme, players, align, size }: any) {
  const visible = (Array.isArray(players) ? players : []).slice(0, 2);
  if (!visible.length) {
    return <div style={{ width: size, height: size, borderRadius: 999, border: `1px solid ${theme.primary}66`, display: "grid", placeItems: "center", color: theme.primary, fontWeight: 1100, background: "rgba(255,255,255,.05)" }}>?</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: align === "left" ? "row" : "row-reverse", paddingLeft: align === "left" ? 0 : 8, paddingRight: align === "right" ? 0 : 8 }}>
      {visible.map((p: any, index: number) => {
        const img = avatarOf(p);
        return (
          <div key={playerId(p) || index} style={{ width: size, height: size, marginLeft: align === "left" && index ? -12 : 0, marginRight: align === "right" && index ? -12 : 0, borderRadius: 999, border: `2px solid ${theme.primary}88`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", boxShadow: `0 0 14px ${theme.primary}3f`, zIndex: 3 - index }}>
            {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontWeight: 1000, color: theme.primary }}>{playerName(p).slice(0, 2).toUpperCase()}</span>}
          </div>
        );
      })}
    </div>
  );
}

function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function panel(theme: any): React.CSSProperties { return { borderRadius: 20, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: theme.card ?? "rgba(14,16,28,.92)", padding: 12, boxShadow: "0 18px 48px rgba(0,0,0,.35)" }; }
function sectionTitle(theme: any): React.CSSProperties { return { fontWeight: 1100, fontSize: 18, marginBottom: 10, color: theme.text }; }
function small(theme: any): React.CSSProperties { return { color: theme.textSoft ?? "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }; }
function primaryBtn(theme: any): React.CSSProperties { return { borderRadius: 14, border: `1px solid ${theme.primary}`, background: `${theme.primary}22`, color: theme.text, minHeight: 48, padding: "0 12px", fontWeight: 1100, cursor: "pointer", boxShadow: `0 0 18px ${theme.primary}33` }; }
function ghostBtn(theme: any): React.CSSProperties { return { borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(255,255,255,.06)", color: theme.text, minHeight: 48, padding: "0 12px", fontWeight: 1000, cursor: "pointer" }; }
function arrowBtn(theme: any): React.CSSProperties { return { width: 42, height: 42, borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(255,255,255,.055)", color: theme.primary, fontSize: 28, lineHeight: 1, fontWeight: 700, cursor: "pointer" }; }
function StatBox({ theme, label, value }: { theme: any; label: string; value: string }) { return <div style={{ minWidth: 0, borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, background: "rgba(0,0,0,.18)", padding: "9px 7px", textAlign: "center" }}><div style={{ fontSize: 9, color: theme.textSoft, fontWeight: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 2, fontSize: 19, color: theme.primary, fontWeight: 1100 }}>{value}</div></div>; }
