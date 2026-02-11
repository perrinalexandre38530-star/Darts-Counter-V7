// =============================================================
// src/pages/babyfoot/BabyFootStatsHistoryPage.tsx
// Baby-Foot — Historique + STATS (LOCAL) — V4.5 + V4.6 + V4.7 (FULL)
// ✅ V4.5: filtres période + mode (1v1/2v2/2v1/all) + recherche
// ✅ V4.6: stats équipes (compositions réelles Team A/Team B)
// ✅ V4.7: duels (comparatif joueur vs joueur)
// ⚠️ Tolérant aux payloads (V2/V3/V4): summary / events / penalties / sets…
// Source: store.history (App.tsx pushBabyFootHistory)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import { computeDecisiveGoals, computeMomentum, computePenaltyImpact, computeShotConversion } from "../../lib/babyfootQualityStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

type TeamId = "A" | "B";

function safeNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function fmt(ms?: number) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function getPayload(h: any) {
  // history record may be { payload: state } or { payload: { payload: state } }
  const p0 = h?.payload ?? {};
  const p1 = p0?.payload ?? p0;
  return p1 ?? {};
}

function getEvents(payload: any): any[] {
  const ev = payload?.events ?? payload?.payload?.events ?? payload?.summary?.events ?? [];
  return Array.isArray(ev) ? ev : [];
}

function getMode(payload: any): "1v1" | "2v2" | "2v1" | "unknown" {
  const m = String(payload?.mode ?? payload?.meta?.mode ?? payload?.summary?.mode ?? "").trim();
  if (m === "1v1" || m === "2v2" || m === "2v1") return m;
  return "unknown";
}

function getTeams(payload: any) {
  const teamA = payload?.teamA ?? payload?.summary?.teamA ?? "TEAM A";
  const teamB = payload?.teamB ?? payload?.summary?.teamB ?? "TEAM B";
  const scoreA = safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0);
  const scoreB = safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0);
  const teamAIds = Array.isArray(payload?.teamAProfileIds) ? payload.teamAProfileIds : [];
  const teamBIds = Array.isArray(payload?.teamBProfileIds) ? payload.teamBProfileIds : [];
  return { teamA, teamB, scoreA, scoreB, teamAIds, teamBIds };
}

function getWinnerTeam(payload: any): TeamId | null {
  const w = payload?.winnerTeam ?? payload?.winner ?? payload?.summary?.winnerTeam ?? null;
  if (w === "A" || w === "B") return w;
  const { scoreA, scoreB } = getTeams(payload);
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? "A" : "B";
}

function teamKey(ids: string[]) {
  const a = (Array.isArray(ids) ? ids : []).filter(Boolean).slice(0, 4).sort();
  return a.join("|") || "—";
}

function computePenalties(payload: any) {
  const p = payload?.penalties ?? payload?.summary?.penalties ?? null;
  if (p && typeof p === "object") {
    return {
      shotsA: safeNum(p.shotsA, 0),
      shotsB: safeNum(p.shotsB, 0),
      goalsA: safeNum(p.goalsA, 0),
      goalsB: safeNum(p.goalsB, 0),
    };
  }
  // derive from events
  const ev = getEvents(payload);
  let shotsA = 0, shotsB = 0, goalsA = 0, goalsB = 0;
  for (const e of ev) {
    if (e?.t !== "penalty") continue;
    const team = e?.team;
    const scored = !!e?.scored;
    if (team === "A") { shotsA += 1; if (scored) goalsA += 1; }
    if (team === "B") { shotsB += 1; if (scored) goalsB += 1; }
  }
  if (shotsA + shotsB === 0) return null;
  return { shotsA, shotsB, goalsA, goalsB };
}

function pill(theme: any, active?: boolean): React.CSSProperties {
  const border = theme?.borderSoft ?? theme?.border ?? "rgba(255,255,255,0.14)";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(255,255,255,0.26)" : border}`,
    background: active ? "rgba(255,255,255,0.10)" : (theme?.card ?? "rgba(255,255,255,0.06)"),
    color: theme?.text ?? "#fff",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    cursor: "pointer",
    userSelect: "none",
  };
}

export default function BabyFootStatsHistoryPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fb: string) => fb);

  const playersRef = React.useRef<HTMLDivElement | null>(null);
  const rankingsRef = React.useRef<HTMLDivElement | null>(null);
  const teamsRef = React.useRef<HTMLDivElement | null>(null);
  const duelsRef = React.useRef<HTMLDivElement | null>(null);
  const historyRef = React.useRef<HTMLDivElement | null>(null);

  const scrollTo = React.useCallback((key: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement>> = {
      players: playersRef,
      rankings: rankingsRef,
      teams: teamsRef,
      duels: duelsRef,
      history: historyRef,
    };
    const ref = map[key];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  React.useEffect(() => {
    const section = String(params?.section ?? "").trim();
    if (!section) return;
    // petite latence pour laisser le layout se poser
    const id = window.setTimeout(() => scrollTo(section), 60);
    return () => window.clearTimeout(id);
  }, [params?.section, scrollTo]);

  // ---------------- V4.5 filters
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");
  const [mode, setMode] = useState<"all" | "1v1" | "2v2" | "2v1">("all");
  const [q, setQ] = useState("");

  // ---------------- V4.7 duel selectors
  const [duelA, setDuelA] = useState<string>("");
  const [duelB, setDuelB] = useState<string>("");

  const profilesById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of (store?.profiles ?? [])) if (p?.id) map[p.id] = p;
    return map;
  }, [store?.profiles]);

  const all = useMemo(() => {
    const list = (store?.history ?? []).filter((h: any) => h?.sport === "babyfoot" || h?.kind === "babyfoot");
    return list.sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
  }, [store?.history]);

  const availableModes = useMemo(() => {
    const s = new Set<string>();
    for (const h of all) {
      const m = getMode(getPayload(h));
      if (m === "1v1" || m === "2v2" || m === "2v1") s.add(m);
    }
    const arr = Array.from(s) as Array<"1v1" | "2v2" | "2v1">;
    arr.sort((a, b) => (a === "1v1" ? -1 : a.localeCompare(b)));
    return arr;
  }, [all]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const days = period === "all" ? null : period === "7" ? 7 : period === "30" ? 30 : 90;
    const cutoff = days != null ? now - days * 24 * 3600 * 1000 : null;
    const s = q.trim().toLowerCase();

    return all.filter((h: any) => {
      if (h?.status && h.status !== "finished") return false;
      if (cutoff != null && (h?.createdAt || 0) < cutoff) return false;

      const payload = getPayload(h);
      const m = getMode(payload);
      if (mode !== "all" && m !== mode) return false;

      if (!s) return true;
      const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
      const names = players.map((p: any) => (p?.name || profilesById[p?.id]?.name || "").toLowerCase()).join(" ");
      const teams = `${payload?.teamA ?? ""} ${payload?.teamB ?? ""}`.toLowerCase();
      return names.includes(s) || teams.includes(s);
    });
  }, [all, period, mode, q, profilesById]);

  const playerOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const h of filtered) {
      const payload = getPayload(h);
      const { teamAIds, teamBIds } = getTeams(payload);
      for (const id of teamAIds) ids.add(id);
      for (const id of teamBIds) ids.add(id);

      const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
      for (const p of players) if (p?.id) ids.add(p.id);
    }

    const arr = Array.from(ids).map((id) => ({
      id,
      name: (profilesById[id]?.name ?? "").trim() || id.slice(0, 6),
    }));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [filtered, profilesById]);

  useEffect(() => {
    if (!duelA && playerOptions.length) setDuelA(playerOptions[0].id);
    if (!duelB && playerOptions.length > 1) setDuelB(playerOptions[1].id);
  }, [playerOptions, duelA, duelB]);

  const agg = useMemo(() => {
    type P = {
      id: string;
      name: string;
      played: number;
      wins: number;
      goals: number; // from events goal scorerId
      pensShots: number;
      pensGoals: number;
      bestStreak: number;
      currentStreak: number;
      decisiveGoals: number;
      momentumBursts: number;

      // ✅ V5.1
      points: number;
      draws: number;
      losses: number;
      gf: number;
      ga: number;
    };
    type Tm = {
      key: string;
      label: string;
      ids: string[];
      played: number;
      wins: number;
      gf: number;
      ga: number;
      pensShots: number;
      pensGoals: number;

      // ✅ V5.1
      points: number;
      draws: number;
      losses: number;
    };

    const byPlayer: Record<string, P> = {};
    const byTeam: Record<string, Tm> = {};
    const currentStreak: Record<string, number> = {};
    const bestStreak: Record<string, number> = {};

    let matches = 0;
    let goals = 0;
    let totalDurationMs = 0;

    // ✅ V4.8.1 Qualité de jeu (best-effort / tolérant)
    let decisiveTotal = 0;
    let penaltyDecisiveTotal = 0;
    let momentumTotal = 0;
    let convShots = 0;
    let convGoals = 0;

    const chrono = [...filtered].sort((a: any, b: any) => (a?.createdAt || 0) - (b?.createdAt || 0));

    const ensurePlayer = (id: string) => {
      if (!id) return null;
      if (!byPlayer[id]) {
        byPlayer[id] = {
          id,
          name: (profilesById[id]?.name ?? "").trim() || id.slice(0, 6),
          played: 0,
          wins: 0,
          goals: 0,
          pensShots: 0,
          pensGoals: 0,

          points: 0,
          draws: 0,
          losses: 0,
          bestStreak: 0,
          currentStreak: 0,
          decisiveGoals: 0,
          momentumBursts: 0,

          points: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
        };
      }
      return byPlayer[id];
    };

    const ensureTeam = (ids: string[], label: string) => {
      const key = teamKey(ids);
      if (!byTeam[key]) {
        byTeam[key] = {
          key,
          label,
          ids: (ids || []).filter(Boolean),
          played: 0,
          wins: 0,
          gf: 0,
          ga: 0,
          pensShots: 0,
          pensGoals: 0,

          points: 0,
          draws: 0,
          losses: 0,
        };
      }
      return byTeam[key];
    };

    for (const h of chrono) {
      const payload = getPayload(h);
      const { teamA, teamB, scoreA, scoreB, teamAIds, teamBIds } = getTeams(payload);
      const dur = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);
      const winner = getWinnerTeam(payload);

      const ev = getEvents(payload);

      matches += 1;
      goals += Math.max(0, scoreA) + Math.max(0, scoreB);
      totalDurationMs += Math.max(0, dur);

      // Players
      for (const id of new Set([...teamAIds, ...teamBIds])) {
        const p = ensurePlayer(id);
        if (!p) continue;
        p.played += 1;
        const won = winner ? (winner === "A" ? teamAIds.includes(id) : teamBIds.includes(id)) : false;
        if (won) p.wins += 1;

        // V5.1 points (W=3, D=1)
        if (!winner) { p.draws += 1; p.points += 1; }
        else if (won) p.points += 3;
        else p.losses += 1;

        // GF/GA approximated by team score
        const inA = teamAIds.includes(id);
        p.gf += inA ? scoreA : scoreB;
        p.ga += inA ? scoreB : scoreA;
      }

      // Goals (scorerId)
      for (const e of getEvents(payload)) {
        if (e?.t !== "goal") continue;
        const pid = e?.scorerId;
        if (!pid) continue;
        const p = ensurePlayer(pid);
        if (!p) continue;
        p.goals += 1;
      }

      // Penalties
      const pen = computePenalties(payload);
      if (pen) {
        // team level (by composition)
        const tA = ensureTeam(teamAIds, teamA);
        const tB = ensureTeam(teamBIds, teamB);
        tA.pensShots += pen.shotsA; tA.pensGoals += pen.goalsA;
        tB.pensShots += pen.shotsB; tB.pensGoals += pen.goalsB;

        // player level if shooterId present
        for (const e of getEvents(payload)) {
          if (e?.t !== "penalty") continue;
          const pid = e?.scorerId ?? e?.shooterId;
          if (!pid) continue;
          const p = ensurePlayer(pid);
          if (!p) continue;
          p.pensShots += 1;
          if (e?.scored) p.pensGoals += 1;
        }
      }

      // Teams by composition
      const tA = ensureTeam(teamAIds, teamA);
      const tB = ensureTeam(teamBIds, teamB);
      tA.played += 1; tB.played += 1;
      tA.gf += scoreA; tA.ga += scoreB;
      tB.gf += scoreB; tB.ga += scoreA;
      if (winner === "A") tA.wins += 1;
      if (winner === "B") tB.wins += 1;

      // V5.1 points (W=3, D=1)
      if (!winner) { tA.draws += 1; tB.draws += 1; tA.points += 1; tB.points += 1; }
      else if (winner === "A") { tA.points += 3; tB.losses += 1; }
      else { tB.points += 3; tA.losses += 1; }


// ✅ V4.8.1 Qualité de jeu

// Buts décisifs (égalisation / but final) — nécessite scorerId pour attribution joueur
const decisive = computeDecisiveGoals({ events: ev as any, scoreA, scoreB });
decisiveTotal += decisive.length;
for (const g of decisive as any[]) {
  const pid = g?.scorerId;
  if (!pid) continue;
  const p = ensurePlayer(pid);
  if (p) p.decisiveGoals += 1;
}

// Momentum (bursts de buts dans une fenêtre)
const bursts = computeMomentum(ev as any, 20000);
if (Array.isArray(bursts) && bursts.length) {
  momentumTotal += bursts.reduce((acc: number, b: any) => acc + (b?.count || 0), 0);
  for (const b of bursts) {
    // attribution approximative : tout scorerId présent dans la fenêtre
    const ids = new Set<string>(
      (ev as any[]).filter((e: any) => e?.t === "goal" && e?.at >= b.from && e?.at <= b.to).map((e: any) => e?.scorerId).filter(Boolean)
    );
    ids.forEach((id) => {
      const p = ensurePlayer(id);
      if (p) p.momentumBursts += 1;
    });
  }
}

// Penalties décisifs (match décidé aux TAB)
const penImpact = computePenaltyImpact({ events: ev as any, scoreA, scoreB });
if (penImpact) penaltyDecisiveTotal += 1;

// Conversion tirs (si events "shot" existent)
const conv = computeShotConversion(ev as any);
if (conv?.shots > 0) {
  convShots += conv.shots;
  convGoals += conv.goals;
}
      // streaks per player (wins only; draw resets)
      for (const id of new Set([...teamAIds, ...teamBIds])) {
        if (!winner) {
          currentStreak[id] = 0;
        } else {
          const won = winner === "A" ? teamAIds.includes(id) : teamBIds.includes(id);
          currentStreak[id] = won ? (currentStreak[id] || 0) + 1 : 0;
        }
        bestStreak[id] = Math.max(bestStreak[id] || 0, currentStreak[id] || 0);
      }
    }

    for (const id of Object.keys(byPlayer)) {
      byPlayer[id].bestStreak = bestStreak[id] || 0;
      byPlayer[id].currentStreak = currentStreak[id] || 0;
    }

    const players = Object.values(byPlayer);
    const teams = Object.values(byTeam);

    const topWinrate = [...players]
      .filter((p) => p.played >= 5)
      .sort((a, b) => (b.wins / Math.max(1, b.played)) - (a.wins / Math.max(1, a.played)))
      .slice(0, 8);

    const topGoals = [...players].sort((a, b) => b.goals - a.goals).slice(0, 8);

    const topGPM = [...players]
      .filter((p) => p.played >= 3)
      .sort((a, b) => (b.goals / Math.max(1, b.played)) - (a.goals / Math.max(1, a.played)))
      .slice(0, 8);

    const streaks = [...players]
      .filter((p) => p.bestStreak > 0)
      .sort((a, b) => b.bestStreak - a.bestStreak || b.currentStreak - a.currentStreak)
      .slice(0, 8);

    const topTeams = [...teams]
      .filter((tm) => tm.played >= 3)
      .sort((a, b) => (b.wins / Math.max(1, b.played)) - (a.wins / Math.max(1, a.played)) || ((b.gf - b.ga) - (a.gf - a.ga)))
      .slice(0, 8);

    // ✅ V5.1 Classements (points)
    const topPlayersPoints = [...players]
      .filter((p) => p.played >= 3)
      .sort((a, b) => (b.points - a.points) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.goals - a.goals))
      .slice(0, 12);

    const topTeamsPoints = [...teams]
      .filter((tm) => tm.played >= 3)
      .sort((a, b) => (b.points - a.points) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf))
      .slice(0, 12);

	    // ✅ V4.8.1 Conversion tirs (best-effort)
	    // computeShotConversion() n'est alimenté que si le payload contient des events "shot".
	    // On expose un pourcentage global (0..1) ou null si non mesurable.
	    const convPct = convShots > 0 ? convGoals / convShots : null;

      // ✅ SAFE (anti-crash): tops "quality" babyfoot.
      // Même si aucune donnée n'est dispo, ces arrays existent et évitent les ReferenceError.
      const topDecisive = [...players]
        .filter((p: any) => (p?.decisiveGoals || 0) > 0)
        .sort((a: any, b: any) => (b?.decisiveGoals || 0) - (a?.decisiveGoals || 0))
        .slice(0, 8);

      const topMomentum = [...players]
        .filter((p: any) => (p?.momentumBursts || 0) > 0)
        .sort((a: any, b: any) => (b?.momentumBursts || 0) - (a?.momentumBursts || 0))
        .slice(0, 8);

    return {
      matches,
      goals,
      avgGoals: matches ? goals / matches : 0,
      avgDurMs: matches ? totalDurationMs / matches : 0,
      players,
      teams,
      topWinrate,
      topGoals,
      topGPM,
      streaks,
      topTeams,
      topPlayersPoints,
      topTeamsPoints,
      decisiveTotal,
      penaltyDecisiveTotal,
      momentumTotal,
      convPct,
      topDecisive,
      topMomentum,
    };
  }, [filtered, profilesById]);

  const duel = useMemo(() => {
    if (!duelA || !duelB || duelA === duelB) return null;

    let matches = 0;
    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    let aGoals = 0;
    let bGoals = 0;

    for (const h of filtered) {
      const payload = getPayload(h);
      const { teamAIds, teamBIds } = getTeams(payload);

      const hasA = teamAIds.includes(duelA) || teamBIds.includes(duelA);
      const hasB = teamAIds.includes(duelB) || teamBIds.includes(duelB);
      if (!hasA || !hasB) continue;

      matches += 1;

      const winner = getWinnerTeam(payload);
      if (!winner) draws += 1;
      else {
        const aInA = teamAIds.includes(duelA);
        const aWon = winner === "A" ? aInA : !aInA;
        if (aWon) aWins += 1;
        else bWins += 1;
      }

      for (const e of getEvents(payload)) {
        if (e?.t !== "goal") continue;
        if (e?.scorerId === duelA) aGoals += 1;
        if (e?.scorerId === duelB) bGoals += 1;
      }
    }

    return { matches, aWins, bWins, draws, aGoals, bGoals };
  }, [duelA, duelB, filtered]);

  const modeLabel = mode === "all" ? "Tous" : mode.toUpperCase();
  const periodLabel = period === "all" ? "Total" : `${period}j`;

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>{t("babyfoot.stats.title", "BABY-FOOT — STATS")}</div>
        <div />
      </div>

      {/* Quick nav (même logique que les onglets...): accès direct sections */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "0 2px",
          marginTop: 6,
          marginBottom: 10,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={pill(theme, false)} onClick={() => scrollTo("players")}>Joueurs</div>
        <div style={pill(theme, false)} onClick={() => scrollTo("rankings")}>Classements</div>
        <div style={pill(theme, false)} onClick={() => scrollTo("teams")}>Équipes</div>
        <div style={pill(theme, false)} onClick={() => scrollTo("duels")}>Duels</div>
        <div style={pill(theme, false)} onClick={() => scrollTo("history")}>Historique</div>
      </div>

      {/* Filters */}
      <div style={card(theme)}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 950, opacity: 0.9 }}>Période</div>
          {(["7", "30", "90", "all"] as const).map((p) => (
            <div key={p} style={pill(theme, period === p)} onClick={() => setPeriod(p)}>
              {p === "all" ? "Total" : `${p}j`}
            </div>
          ))}

          <div style={{ width: 10 }} />
          <div style={{ fontWeight: 950, opacity: 0.9 }}>Mode</div>
          <select style={select(theme)} value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="all">Tous</option>
            {availableModes.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <input
            style={search(theme)}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche (joueur / team…)"
          />
          <div style={pill(theme, true)}>
            {filtered.length} matchs • {modeLabel} • {periodLabel}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 10, ...card(theme) }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 10 }}>Résumé</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <KPI theme={theme} label="Matchs" value={String(agg.matches)} />
          <KPI theme={theme} label="Buts" value={String(agg.goals)} />
          <KPI theme={theme} label="Buts / match" value={agg.avgGoals.toFixed(1)} />
          <KPI theme={theme} label="Durée moyenne" value={fmt(agg.avgDurMs)} />
        </div>
      </div>

{/* Qualité */}
<div style={sectionTitle}>Qualité de jeu</div>
<div style={{ marginTop: 10, ...card(theme) }}>
  <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 10 }}>Qualité</div>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    <KPI theme={theme} label="Buts décisifs" value={String((agg as any).decisiveTotal ?? 0)} />
    <KPI theme={theme} label="Penalties décisifs" value={String((agg as any).penaltyDecisiveTotal ?? 0)} />
    <KPI theme={theme} label="Momentum (bursts)" value={String((agg as any).momentumTotal ?? 0)} />
    <KPI
      theme={theme}
      label="Conversion tirs"
      value={(agg as any).convPct == null ? "—" : `${Math.round(((agg as any).convPct as number) * 100)}%`}
    />
  </div>

  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    <Board
      theme={theme}
      title="Top buts décisifs"
      subtitle="(scorerId)"
      rows={(((agg as any).topDecisive ?? []) as any[]).map((p: any) => ({
        id: p.id,
        left: p.name,
        right: `${p.decisiveGoals}`,
      }))}
    />
    <Board
      theme={theme}
      title="Top momentum"
      subtitle="bursts"
      rows={(((agg as any).topMomentum ?? []) as any[]).map((p: any) => ({
        id: p.id,
        left: p.name,
        right: `${p.momentumBursts}`,
      }))}
    />
  </div>

  <div style={{ marginTop: 10, opacity: 0.72, fontWeight: 800, fontSize: 12, lineHeight: 1.35 }}>
    Notes : la conversion nécessite des events <code>shot</code>. Les buts décisifs sont calculés en best-effort (égalisation / but final).
  </div>
</div>

      {/* Players */}
      <div ref={playersRef} style={sectionTitle}>Joueurs</div>
      <div style={grid2}>
        <Board
          theme={theme}
          title="Top winrate"
          subtitle="≥ 5 matchs"
          rows={agg.topWinrate.map((p) => ({
            id: p.id,
            left: p.name,
            right: `${Math.round((p.wins / Math.max(1, p.played)) * 100)}% • ${p.wins}/${p.played}`,
          }))}
        />
        <Board
          theme={theme}
          title="Top buteurs"
          subtitle="Goals"
          rows={agg.topGoals.map((p) => ({ id: p.id, left: p.name, right: `${p.goals} buts` }))}
        />
        <Board
          theme={theme}
          title="Buts / match"
          subtitle="≥ 3 matchs"
          rows={agg.topGPM.map((p) => ({ id: p.id, left: p.name, right: `${(p.goals / Math.max(1, p.played)).toFixed(2)}` }))}
        />
        <div style={card(theme)}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>Séries</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {agg.streaks.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 800 }}>Pas assez de données.</div>
            ) : (
              agg.streaks.map((p) => (
                <div key={p.id} style={rowItem(theme)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <ProfileAvatar profile={{ id: p.id }} size={28} />
                    <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  </div>
                  <div style={{ fontWeight: 950, opacity: 0.95 }}>Best {p.bestStreak} • Actuelle {p.currentStreak}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      {/* Rankings */}
      <div ref={rankingsRef} style={sectionTitle}>Classements</div>
      <div style={grid2}>
        <Board
          theme={theme}
          title="Classement joueurs"
          subtitle="Points (W=3 / D=1)"
          rows={agg.topPlayersPoints.map((p: any) => ({
            id: p.id,
            left: p.name,
            right: `${p.points} pts • ${p.wins}V/${p.draws}N/${p.losses}D • GD ${(p.gf - p.ga) >= 0 ? "+" : ""}${p.gf - p.ga}`,
          }))}
        />

        <div style={card(theme)}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>Classement équipes</div>
            <div style={{ opacity: 0.65, fontWeight: 900, fontSize: 12 }}>Points (compositions)</div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {agg.topTeamsPoints.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 800 }}>Pas assez de données (≥ 3 matchs).</div>
            ) : (
              agg.topTeamsPoints.map((tm: any) => {
                const gd = (tm.gf - tm.ga) || 0;
                return (
                  <div key={tm.key} style={rowItem(theme)}>
                    <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tm.label} <span style={{ opacity: 0.6, fontWeight: 900 }}>• {tm.ids?.length || 0} j.</span>
                    </div>
                    <div style={{ fontWeight: 950, opacity: 0.95 }}>
                      {tm.points} pts • {tm.wins}V/{tm.draws}N/{tm.losses}D • GD {gd >= 0 ? "+" : ""}{gd}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Teams */}
      <div ref={teamsRef} style={sectionTitle}>Équipes</div>
      <div style={{ marginTop: 10, ...card(theme) }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>Top équipes (compositions)</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {agg.topTeams.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 800 }}>Pas assez de matchs (≥ 3) pour des stats équipes.</div>
          ) : (
            agg.topTeams.map((tm) => {
              const wr = tm.wins / Math.max(1, tm.played);
              const diff = tm.gf - tm.ga;
              const penPct = tm.pensShots > 0 ? tm.pensGoals / tm.pensShots : null;
              return (
                <div key={tm.key} style={teamCard(theme)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 1000 }}>
                      {tm.label} <span style={{ opacity: 0.55, fontWeight: 900 }}>• {tm.ids.length} joueur(s)</span>
                    </div>
                    <div style={pill(theme, true)}>{Math.round(wr * 100)}%</div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <StatChip theme={theme} label="W/L" value={`${tm.wins}/${tm.played}`} />
                    <StatChip theme={theme} label="DIFF" value={`${diff >= 0 ? "+" : ""}${diff}`} />
                    <StatChip theme={theme} label="B/M" value={(tm.gf / Math.max(1, tm.played)).toFixed(1)} />
                    <StatChip theme={theme} label="PEN" value={penPct == null ? "—" : `${Math.round(penPct * 100)}% (${tm.pensGoals}/${tm.pensShots})`} />
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tm.ids.slice(0, 4).map((id) => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ProfileAvatar profile={{ id }} size={26} />
                        <div style={{ fontWeight: 900, opacity: 0.85 }}>{(profilesById[id]?.name ?? "").trim() || id.slice(0, 6)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Duels */}
      <div ref={duelsRef} style={sectionTitle}>Duels</div>
      <div style={{ marginTop: 10, ...card(theme) }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>Joueur vs Joueur</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select style={select(theme)} value={duelA} onChange={(e) => setDuelA(e.target.value)}>
              {playerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div style={{ fontWeight: 950, opacity: 0.7 }}>VS</div>
            <select style={select(theme)} value={duelB} onChange={(e) => setDuelB(e.target.value)}>
              {playerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!duel || duelA === duelB ? (
          <div style={{ marginTop: 10, opacity: 0.7, fontWeight: 800 }}>Choisis 2 joueurs différents.</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <DuelSide theme={theme} id={duelA} profilesById={profilesById} stats={{
                matches: duel.matches, wins: duel.aWins, draws: duel.draws, goals: duel.aGoals
              }} />
              <DuelSide theme={theme} id={duelB} profilesById={profilesById} stats={{
                matches: duel.matches, wins: duel.bWins, draws: duel.draws, goals: duel.bGoals
              }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 950, opacity: 0.85, marginBottom: 6 }}>Head-to-head</div>
              <div style={barOuter(theme)}>
                {(() => {
                  const m = Math.max(1, duel.matches);
                  const aP = clamp01(duel.aWins / m);
                  const dP = clamp01(duel.draws / m);
                  const bP = clamp01(duel.bWins / m);
                  return (
                    <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${aP * 100}%`, background: "rgba(124,255,196,0.55)" }} />
                      <div style={{ width: `${dP * 100}%`, background: "rgba(255,255,255,0.18)" }} />
                      <div style={{ width: `${bP * 100}%`, background: "rgba(255,102,204,0.55)" }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div ref={historyRef} style={sectionTitle}>Historique</div>
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {filtered.map((h: any) => {
          const payload = getPayload(h);
          const { teamA, teamB, scoreA, scoreB } = getTeams(payload);
          const dur = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);
          const players = Array.isArray(h?.players) ? h.players : Array.isArray(payload?.players) ? payload.players : [];
          return (
            <div key={h.id} style={historyRow(theme)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>{teamA} <span style={{ opacity: 0.6 }}>vs</span> {teamB}</div>
                <div style={pill(theme, true)}>{fmt(dur)}</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "center", marginTop: 10 }}>
                <div style={{ fontSize: 28, fontWeight: 950 }}>{scoreA}</div>
                <div style={{ opacity: 0.6, fontWeight: 900 }}>—</div>
                <div style={{ fontSize: 28, fontWeight: 950 }}>{scoreB}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                {players.slice(0, 6).map((p: any) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <ProfileAvatar profile={p} size={26} />
                    <div style={{ opacity: 0.8, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p?.name || profilesById[p?.id]?.name || p?.id?.slice(0, 6)}
                    </div>
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

/* ---------- small components ---------- */

function KPI({ theme, label, value }: { theme: any; label: string; value: string }) {
  return (
    <div style={kpi(theme)}>
      <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: 0.6 }}>{value}</div>
    </div>
  );
}

function Board({
  theme,
  title,
  subtitle,
  rows,
}: {
  theme: any;
  title: string;
  subtitle?: string;
  rows: Array<{ id: string; left: string; right: string }>;
}) {
  return (
    <div style={card(theme)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>{title}</div>
        {subtitle ? <div style={{ opacity: 0.65, fontWeight: 900, fontSize: 12 }}>{subtitle}</div> : null}
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7, fontWeight: 800 }}>Pas assez de données.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={rowItem(theme)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <ProfileAvatar profile={{ id: r.id }} size={28} />
                <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis" }}>{r.left}</div>
              </div>
              <div style={{ fontWeight: 950, opacity: 0.95 }}>{r.right}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatChip({ theme, label, value }: { theme: any; label: string; value: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: theme?.text ?? "#fff",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.3,
      }}
    >
      <span style={{ opacity: 0.65 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function DuelSide({ theme, id, profilesById, stats }: any) {
  const name = (profilesById?.[id]?.name ?? "").trim() || String(id).slice(0, 6);
  return (
    <div style={duelSide(theme)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ProfileAvatar profile={{ id }} size={34} />
        <div style={{ fontWeight: 1000 }}>{name}</div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <StatLine label="Matchs" value={String(stats?.matches ?? 0)} />
        <StatLine label="Victoires" value={String(stats?.wins ?? 0)} />
        <StatLine label="Nuls" value={String(stats?.draws ?? 0)} />
        <StatLine label="Buts (scorés)" value={String(stats?.goals ?? 0)} />
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ opacity: 0.72, fontWeight: 900 }}>{label}</div>
      <div style={{ fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

/* ---------- styles ---------- */

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  paddingBottom: 90,
  background: theme?.bg ?? "#05060a",
  color: theme?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = { textAlign: "center", fontWeight: 900, letterSpacing: 1, opacity: 0.95 };

const card = (theme: any) => ({
  borderRadius: 18,
  border: `1px solid ${theme?.borderSoft ?? theme?.border ?? "rgba(255,255,255,0.14)"}`,
  background: theme?.card ?? "rgba(255,255,255,0.06)",
  padding: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const select = (theme: any) => ({
  height: 34,
  borderRadius: 12,
  border: `1px solid ${theme?.borderSoft ?? theme?.border ?? "rgba(255,255,255,0.14)"}`,
  background: "rgba(0,0,0,0.20)",
  color: theme?.text ?? "#fff",
  padding: "0 10px",
  fontWeight: 900,
  outline: "none",
});

const search = (theme: any) => ({
  height: 40,
  borderRadius: 12,
  border: `1px solid ${theme?.borderSoft ?? theme?.border ?? "rgba(255,255,255,0.14)"}`,
  background: "rgba(0,0,0,0.20)",
  color: theme?.text ?? "#fff",
  padding: "0 12px",
  fontWeight: 800,
  outline: "none",
});

const kpi = (theme: any) => ({
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 10,
});

const sectionTitle: any = { marginTop: 14, fontWeight: 1000, letterSpacing: 0.8, opacity: 0.95 };

const grid2: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 };

const rowItem = (theme: any) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 10,
});

const teamCard = (theme: any) => ({
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 12,
});

const duelSide = (theme: any) => ({
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.18)",
  padding: 12,
});

const barOuter = (theme: any) => ({
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  padding: 4,
});

const historyRow = (theme: any) => ({
  borderRadius: 18,
  border: `1px solid ${theme?.borderSoft ?? theme?.border ?? "rgba(255,255,255,0.14)"}`,
  background: theme?.card ?? "rgba(255,255,255,0.06)",
  padding: 12,
});