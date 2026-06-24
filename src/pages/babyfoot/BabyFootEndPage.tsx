// @ts-nocheck
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerBabyFootLigue from "../../assets/tickers/ticker_babyfoot_ligue.png";
import { History } from "../../lib/history";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";

type Props = { go: (tab: any, params?: any) => void; store?: any; params?: any };
type AnyMatch = Record<string, any>;
type TeamId = "A" | "B";
type StatsView = "global" | "individual";

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
  const players = allPlayers(match, payload);
  const rawStats = objectOrEmpty(payload?.playerStats || summary?.playerStats || match?.playerStats);
  const byId = new Map<string, any>();

  const ensure = (id: any, teamHint?: TeamId | null, nameHint?: string) => {
    const pid = String(id || "").trim();
    if (!pid) return null;
    if (!byId.has(pid)) {
      const p = players.find((row) => playerId(row) === pid) || {};
      const team = teamForPlayer(players, payload, summary, pid) || teamHint || "A";
      byId.set(pid, {
        id: pid,
        name: nameHint || playerName(p),
        avatar: avatarOf(p),
        team,
        matches: 1,
        wins: winnerTeam === team ? 1 : 0,
        losses: winnerTeam && winnerTeam !== "D" && winnerTeam !== team ? 1 : 0,
        goals: 0,
        goalsConceded: 0,
        goalAv: 0,
        goalDef: 0,
        goalGb: 0,
        goalMil: 0,
        demi: 0,
        demiBonus: 0,
        gamelle: 0,
        peche: 0,
        pecheOff: 0,
        pecheDef: 0,
        pissette: 0,
        pissetteValid: 0,
        pissetteRefused: 0,
        csc: 0,
        penalties: 0,
        penaltyGoals: 0,
        penaltyMisses: 0,
      });
    }
    return byId.get(pid);
  };

  players.forEach((p: any) => ensure(playerId(p), teamForPlayer(players, payload, summary, playerId(p)), playerName(p)));

  const rawEntries = Object.entries(rawStats);
  if (rawEntries.length) {
    rawEntries.forEach(([id, row]: [string, any]) => {
      const target = ensure(id, row?.team, row?.name);
      if (!target) return;
      Object.assign(target, {
        ...target,
        ...objectOrEmpty(row),
        id,
        name: row?.name || target.name,
        avatar: target.avatar,
        team: row?.team || target.team,
      });
    });
  } else {
    const ensureCollective = (team: TeamId) => ensure(`${team}-collectif`, team, team === "A" ? `${summary?.teamA || payload?.teamA || "Équipe A"} · collectif` : `${summary?.teamB || payload?.teamB || "Équipe B"} · collectif`);
    for (const ev of events) {
      const team = ev?.team === "B" ? "B" : "A";
      if (ev?.t === "goal" && ev?.kind === "csc") {
        const guiltyTeam = ev?.ownGoalTeam || (team === "A" ? "B" : "A");
        const own = ev?.ownGoalById ? ensure(ev.ownGoalById, guiltyTeam) : ensureCollective(guiltyTeam);
        if (own) own.csc += 1;
        const awarded = ev?.scorerId ? ensure(ev.scorerId, team) : ensureCollective(team);
        if (awarded) awarded.goals += Math.max(1, n(ev?.points, 1));
        continue;
      }
      const row = ev?.scorerId ? ensure(ev.scorerId, team) : ensureCollective(team);
      if (!row) continue;
      if (ev?.t === "goal") {
        row.goals += Math.max(1, n(ev?.points, 1));
        row.demiBonus += Math.max(0, n(ev?.demiBonusApplied));
        const line = String(ev?.sourceLine || "AV").toUpperCase();
        if (line === "DEF") row.goalDef += 1;
        else if (line === "GB") row.goalGb += 1;
        else if (line === "MIL") row.goalMil += 1;
        else row.goalAv += 1;
        if (ev?.kind === "gamelle") row.gamelle += 1;
        if (ev?.kind === "peche") { row.peche += 1; row.pecheOff += 1; }
        if (ev?.kind === "pissette") { row.pissette += 1; row.pissetteValid += 1; }
      } else if (ev?.t === "demi") {
        row.demi += 1;
      } else if (ev?.t === "special") {
        if (ev?.kind === "gamelle") row.gamelle += 1;
        if (ev?.kind === "peche_off") { row.peche += 1; row.pecheOff += 1; }
        if (ev?.kind === "peche_def") { row.peche += 1; row.pecheDef += 1; }
        if (ev?.kind === "pissette") {
          row.pissette += 1;
          if (ev?.counted) row.pissetteValid += 1;
          else row.pissetteRefused += 1;
        }
        if (ev?.kind === "csc") row.csc += 1;
      } else if (ev?.t === "pen_shot") {
        row.penalties += 1;
        if (ev?.scored) row.penaltyGoals += 1;
        else row.penaltyMisses += 1;
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.team.localeCompare(b.team) || String(a.name).localeCompare(String(b.name), "fr"));
}

function playerNameFromPayload(payload: any, match: any, id: any) {
  const pid = String(id || "").trim();
  if (!pid) return "";
  const hit = allPlayers(match, payload).find((p: any) => playerId(p) === pid);
  return hit ? playerName(hit) : "";
}

function actionLabel(ev: any, payload: any, match: any, teamA: string, teamB: string) {
  const team = ev?.team === "A" ? teamA : ev?.team === "B" ? teamB : "";
  const player = playerNameFromPayload(payload, match, ev?.scorerId) || playerNameFromPayload(payload, match, ev?.ownGoalById);
  const who = player ? ` · ${player}` : "";
  if (ev?.t === "start") return "Début du match";
  if (ev?.t === "finish") return `Fin du match${ev?.winner ? ` · victoire ${ev.winner === "A" ? teamA : teamB}` : " · match nul"}`;
  if (ev?.t === "phase") return `Passage en ${String(ev?.phase || "phase").toUpperCase()}`;
  if (ev?.t === "set_win") return `Set gagné · ${team}`;
  if (ev?.t === "pen_shot") return `Penalty ${ev?.scored ? "marqué" : "raté"} · ${team}${who}`;
  if (ev?.t === "demi") return `Demi · ${team}${who}`;
  if (ev?.t === "undo") return "Dernière action annulée";
  if (ev?.t === "special") {
    const map: Record<string, string> = { gamelle: "Gamelle", peche_off: "Pêche offensive", peche_def: "Pêche défensive", pissette: ev?.counted ? "Pissette validée" : "Pissette refusée", csc: "CSC" };
    const delta = n(ev?.scoreDeltaA) || n(ev?.scoreDeltaB) ? ` · score ${n(ev?.scoreDeltaA) >= 0 ? "+" : ""}${n(ev?.scoreDeltaA)}/${n(ev?.scoreDeltaB) >= 0 ? "+" : ""}${n(ev?.scoreDeltaB)}` : "";
    return `${map[String(ev?.kind || "")] || String(ev?.kind || "Action")} · ${team}${who}${delta}`;
  }
  if (ev?.t === "goal") {
    const line = ev?.sourceLine ? ` ${String(ev.sourceLine).toUpperCase()}` : "";
    const kind = ev?.kind === "gamelle" ? "Gamelle" : ev?.kind === "pissette" ? "Pissette" : ev?.kind === "csc" ? "CSC" : `But${line}`;
    const pts = Math.max(1, n(ev?.points, 1));
    const bonus = Math.max(0, n(ev?.demiBonusApplied));
    return `${kind} · ${team}${who}${pts > 1 ? ` · +${pts} pts` : ""}${bonus ? ` (${bonus} bonus demi)` : ""}`;
  }
  return String(ev?.label || ev?.type || ev?.kind || "Action");
}

function buildTimelineRows(events: any[], payload: any, summary: any, match: any, teamA: string, teamB: string) {
  const startEvent = events.find((ev) => ev?.t === "start" && ev?.at);
  const start = n(startEvent?.at ?? payload?.startedAt ?? summary?.startedAt ?? payload?.createdAt ?? match?.createdAt, 0);
  let scoreA = Math.max(0, n(payload?.handicapB ?? summary?.handicapB, 0));
  let scoreB = Math.max(0, n(payload?.handicapA ?? summary?.handicapA, 0));
  return events.map((ev: any, index: number) => {
    if (ev?.t === "goal") {
      const pts = Math.max(1, n(ev?.points, 1));
      if (ev?.team === "A") scoreA += pts;
      if (ev?.team === "B") scoreB += pts;
    } else if (ev?.t === "special") {
      scoreA = Math.max(0, scoreA + n(ev?.scoreDeltaA, 0));
      scoreB = Math.max(0, scoreB + n(ev?.scoreDeltaB, 0));
    } else if (ev?.t === "set_win") {
      scoreA = Math.max(0, n(payload?.handicapB ?? summary?.handicapB, 0));
      scoreB = Math.max(0, n(payload?.handicapA ?? summary?.handicapA, 0));
    }
    const elapsed = start && ev?.at ? Math.max(0, n(ev.at) - start) : 0;
    return {
      key: `${ev?.t || "event"}-${ev?.at || index}-${index}`,
      time: fmtDuration(elapsed),
      label: actionLabel(ev, payload, match, teamA, teamB),
      score: `${scoreA}-${scoreB}`,
      team: ev?.team || null,
      type: ev?.t,
    };
  });
}

export default function BabyFootEndPage({ go, store, params }: Props) {
  const { theme } = useTheme();
  const requestedId = String(params?.matchId || params?.focusMatchId || params?.matchPayload?.id || params?.matchPayload?.matchId || "").trim();
  const routeMatch = pickMatch(store, params);
  const [idbMatch, setIdbMatch] = React.useState<AnyMatch | null>(null);
  const [loading, setLoading] = React.useState(Boolean(requestedId));
  const [view, setView] = React.useState<StatsView>(String(params?.statsView || "global") === "individual" ? "individual" : "global");
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
  const payload = getPayload(match);
  const summary = getSummary(match, payload);
  const players = allPlayers(match, payload);
  const events = getEventsFrom(payload, summary, match);
  const scoreA = n(summary?.scoreA ?? payload?.scoreA ?? match?.scoreA ?? params?.scoreA);
  const scoreB = n(summary?.scoreB ?? payload?.scoreB ?? match?.scoreB ?? params?.scoreB);
  const teamA = String(summary?.teamA || payload?.teamA || match?.teamA || params?.teamA || "Équipe A");
  const teamB = String(summary?.teamB || payload?.teamB || match?.teamB || params?.teamB || "Équipe B");
  const winnerTeam = String(summary?.winnerTeam || payload?.winnerTeam || match?.winnerTeam || (scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "D"));
  const winnerLabel = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : "Match nul";
  const durationMs = summary?.durationMs ?? payload?.durationMs ?? match?.durationMs ?? params?.durationMs;
  const teamAPlayers = teamPlayers(players, payload, summary, "A");
  const teamBPlayers = teamPlayers(players, payload, summary, "B");

  const richStats = React.useMemo(() => {
    const saved = summary?.stats || payload?.stats;
    if (saved?.teamA && saved?.teamB) return saved;
    return computeBabyFootRichStats({
      ...payload,
      scoreA,
      scoreB,
      events,
      summary: { ...summary, scoreA, scoreB, events, specialStats: summary?.specialStats || payload?.specialStats },
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
  const matchId = String(payload?.matchId || match?.id || match?.matchId || requestedId || "");
  const goBack = () => backToLeague ? go("babyfoot_league" as any, leagueParams) : go("babyfoot_stats_history" as any, { focusMatchId: matchId });

  const infoContent = (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.5 }}>
      <div><strong>Stats globales</strong> compare les deux équipes : buts par ligne, demis, gamelles, pêches, pissettes, CSC, penalties et dynamique du score.</div>
      <div><strong>Stats individuelles</strong> détaille les actions attribuées à chaque joueur.</div>
      <div><strong>Fil du match</strong> reprend chaque action enregistrée avec son temps et le score après l’action.</div>
      <div style={{ opacity: .72 }}>Les anciennes parties dépourvues de journal d’actions ne peuvent pas être reconstruites rétroactivement.</div>
    </div>
  );

  if (!match && !loading) {
    return (
      <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: 16 }}>
        <HeaderAboveTicker theme={theme} onBack={goBack} infoContent={infoContent} />
        <section style={{ ...panel(theme), marginTop: 14 }}>
          <div style={sectionTitle(theme)}>Match introuvable</div>
          <div style={small(theme)}>La carte existe peut-être encore dans la liste légère, mais le détail de la partie n’est plus présent dans IndexedDB.</div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: "14px 14px 96px", boxSizing: "border-box" }}>
      <HeaderAboveTicker theme={theme} onBack={goBack} infoContent={infoContent} />

      <section style={{ ...panel(theme), marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <TeamBlock theme={theme} name={teamA} players={teamAPlayers} align="left" />
          <div style={{ textAlign: "center", minWidth: 88 }}>
            <div style={{ fontSize: 11, fontWeight: 1000, color: theme.primary, letterSpacing: 1.2 }}>FIN DE MATCH</div>
            <div style={{ marginTop: 4, fontSize: "clamp(34px, 10vw, 52px)", lineHeight: 1, fontStyle: "italic", fontWeight: 1100, color: theme.primary, textShadow: `0 0 18px ${theme.primary}` }}>{scoreA} - {scoreB}</div>
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, opacity: .74 }}>{fmtDate(payload?.finishedAt || summary?.finishedAt || match?.finishedAt || match?.updatedAt)}</div>
          </div>
          <TeamBlock theme={theme} name={teamB} players={teamBPlayers} align="right" />
        </div>
        <div style={{ marginTop: 14, borderRadius: 16, padding: 12, background: `${theme.primary}12`, border: `1px solid ${theme.primary}55`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 1000, color: theme.primary }}>VAINQUEUR</div>
            <div style={{ fontSize: 22, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis" }}>{winnerLabel}</div>
          </div>
          <div style={{ textAlign: "right", fontWeight: 900, opacity: .82, flex: "0 0 auto" }}>{String(summary?.mode || payload?.mode || params?.mode || "babyfoot").toUpperCase()}<br />{fmtDuration(durationMs)}</div>
        </div>
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
            scoreA={scoreA}
            scoreB={scoreB}
            stats={richStats}
            durationMs={durationMs}
            summary={summary}
          />
        ) : (
          <IndividualStatsView
            theme={theme}
            team={individualTeam}
            setTeam={setIndividualTeam}
            teamA={teamA}
            teamB={teamB}
            rows={visibleIndividuals}
          />
        )}
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={{ ...sectionTitle(theme), display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span>Fil chronologique du match</span>
          <span style={{ fontSize: 11, color: theme.primary }}>{timelineRows.length} action{timelineRows.length > 1 ? "s" : ""}</span>
        </div>
        {timelineRows.length ? (
          <div style={{ display: "grid", gap: 8, maxHeight: 480, overflow: "auto", padding: "4px 2px 4px 8px" }}>
            {timelineRows.map((row: any, i: number) => {
              const accent = row.team === "B" ? "#ff59b0" : row.team === "A" ? theme.primary : "#82cfff";
              return (
                <div key={row.key || i} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 44px", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 1000, color: accent, textAlign: "right" }}>{row.time}</div>
                  <div style={{ position: "relative", borderRadius: 14, padding: "9px 10px 9px 16px", border: `1px solid ${accent}55`, background: `${accent}12`, fontSize: 12, fontWeight: 900, lineHeight: 1.25 }}>
                    <span style={{ position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: 999, background: accent, boxShadow: `0 0 12px ${accent}` }} />
                    {row.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 1100, color: theme.text, textAlign: "center" }}>{row.score}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ ...small(theme), padding: 12, borderRadius: 14, border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.18)"}`, background: "rgba(255,255,255,.025)" }}>
            Aucun journal détaillé n’est présent dans cette ancienne sauvegarde. Les prochains matchs enregistreront chaque but, demi, gamelle, pêche, pissette, CSC et penalty.
          </div>
        )}
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={sectionTitle(theme)}>Navigation</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button style={primaryBtn(theme)} onClick={() => go("babyfoot_stats_history" as any, { focusMatchId: matchId })}>HISTORIQUE</button>
          <button style={ghostBtn(theme)} onClick={() => go("babyfoot_stats_center" as any)}>STATS BABY</button>
          {backToLeague ? <button style={{ ...ghostBtn(theme), gridColumn: "1 / -1" }} onClick={() => go("babyfoot_league" as any, leagueParams)}>RETOUR LIGUE</button> : null}
        </div>
      </section>
    </div>
  );
}

function HeaderAboveTicker({ theme, onBack, infoContent }: any) {
  return (
    <header>
      <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 52px", alignItems: "center", gap: 10, marginBottom: 10, minHeight: 48 }}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}><BackDot onClick={onBack} size={44} /></div>
        <div style={{ textAlign: "center", color: theme.primary, fontWeight: 1100, letterSpacing: 1.1, textTransform: "uppercase", fontSize: 15, textShadow: `0 0 14px ${theme.primary}66` }}>RÉSULTAT BABY-FOOT</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><InfoDot title="Stats du match Baby-Foot" content={infoContent} size={44} glow={`${theme.primary}88`} /></div>
      </div>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, boxShadow: `0 0 28px ${theme.primary}22`, aspectRatio: "800 / 200", minHeight: 92 }}>
        <img src={tickerBabyFootLigue} alt="Baby-Foot" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, rgba(0,0,0,.22), transparent 24%, transparent 76%, rgba(0,0,0,.22))" }} />
      </div>
    </header>
  );
}

function StatsViewSelector({ theme, view, setView }: any) {
  const item = (key: StatsView, label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      style={{
        minHeight: 46,
        borderRadius: 14,
        border: `1px solid ${view === key ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
        background: view === key ? `${theme.primary}20` : "rgba(255,255,255,.045)",
        color: view === key ? theme.primary : theme.text,
        boxShadow: view === key ? `0 0 18px ${theme.primary}2f` : "none",
        fontWeight: 1100,
        fontSize: 12,
        cursor: "pointer",
      }}
    >{label}</button>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      {item("global", "STATS GLOBALES")}
      {item("individual", "STATS INDIVIDUELLES")}
    </div>
  );
}

function GlobalStatsView({ theme, teamA, teamB, playersA, playersB, scoreA, scoreB, stats, durationMs, summary }: any) {
  const a = objectOrEmpty(stats?.teamA);
  const b = objectOrEmpty(stats?.teamB);
  const rows = [
    ["Score final", scoreA, scoreB],
    ["Sets gagnés", n(summary?.setsA ?? a.sets), n(summary?.setsB ?? b.sets)],
    ["Manches gagnées", n(a.legs), n(b.legs)],
    ["Points marqués", n(a.goals), n(b.goals)],
    ["Points encaissés", n(a.goalsConceded), n(b.goalsConceded)],
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
    ["Penaltys marqués", n(a.penalties), n(b.penalties)],
    ["Plus longue série", n(a.longestRun), n(b.longestRun)],
    ["Égalisations", n(a.equalizations), n(b.equalizations)],
    ["Prises de tête", n(a.leadChanges), n(b.leadChanges)],
    ["Handicap", n(a.handicap), n(b.handicap)],
  ];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <StatBox theme={theme} label="TOTAL POINTS" value={String(scoreA + scoreB)} />
        <StatBox theme={theme} label="DURÉE" value={fmtDuration(durationMs)} />
        <StatBox theme={theme} label="ÉCART" value={String(Math.abs(scoreA - scoreB))} />
      </div>
      <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(0,0,0,.16)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr 1fr", alignItems: "center", gap: 8, padding: "12px 10px", background: `${theme.primary}0d`, borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}` }}>
          <TeamHeaderMini theme={theme} name={teamA} players={playersA} align="left" />
          <div style={{ textAlign: "center", fontSize: 11, fontWeight: 1100, color: theme.textSoft }}>COMPARATIF</div>
          <TeamHeaderMini theme={theme} name={teamB} players={playersB} align="right" />
        </div>
        {rows.map(([label, left, right]: any, index: number) => {
          const ln = Number(String(left).replace("+", ""));
          const rn = Number(String(right).replace("+", ""));
          const leftBest = Number.isFinite(ln) && Number.isFinite(rn) && ln > rn;
          const rightBest = Number.isFinite(ln) && Number.isFinite(rn) && rn > ln;
          return (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr", alignItems: "center", minHeight: 38, borderTop: index ? "1px solid rgba(255,255,255,.07)" : "none" }}>
              <div style={{ padding: "8px 10px", color: leftBest ? theme.primary : theme.text, fontWeight: 1100, background: leftBest ? `linear-gradient(90deg, ${theme.primary}16, transparent)` : "transparent" }}>{left}</div>
              <div style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 900, color: theme.textSoft, lineHeight: 1.1 }}>{label}</div>
              <div style={{ padding: "8px 10px", textAlign: "right", color: rightBest ? "#ff70bd" : theme.text, fontWeight: 1100, background: rightBest ? "linear-gradient(270deg, rgba(255,89,176,.12), transparent)" : "transparent" }}>{right}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndividualStatsView({ theme, team, setTeam, teamA, teamB, rows }: any) {
  const toggle = () => setTeam(team === "A" ? "B" : "A");
  const teamName = team === "A" ? teamA : teamB;
  const accent = team === "A" ? theme.primary : "#ff59b0";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={toggle} style={arrowBtn(theme)}>‹</button>
        <div style={{ minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: theme.textSoft, fontWeight: 900 }}>ÉQUIPE {team}</div>
          <div style={{ color: accent, fontWeight: 1100, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textShadow: `0 0 12px ${accent}55` }}>{teamName}</div>
        </div>
        <button type="button" onClick={toggle} style={arrowBtn(theme)}>›</button>
      </div>
      {rows.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row: any) => <PlayerStatsCard key={row.id} theme={theme} row={row} accent={accent} />)}
        </div>
      ) : (
        <div style={{ ...small(theme), padding: 12 }}>Aucune statistique individuelle n’a été attribuée aux joueurs de cette équipe.</div>
      )}
      <div style={{ marginTop: 10, ...small(theme) }}>Les actions saisies sans choisir de joueur apparaissent sous une ligne « collectif » afin de ne perdre aucune statistique.</div>
    </div>
  );
}

function PlayerStatsCard({ theme, row, accent }: any) {
  const stats = [
    ["Points", n(row.goals)],
    ["AV", n(row.goalAv ?? row.av)],
    ["DEF", n(row.goalDef ?? row.def)],
    ["GB", n(row.goalGb ?? row.gb)],
    ["Demi", n(row.demi)],
    ["Bonus demi", n(row.demiBonus ?? row.ptsDemi)],
    ["Gamelle", n(row.gamelle)],
    ["Pêche off.", n(row.pecheOff)],
    ["Pêche déf.", n(row.pecheDef)],
    ["Pissette", `${n(row.pissetteValid)}/${n(row.pissetteRefused)}`],
    ["CSC", n(row.csc ?? row.ownGoals)],
    ["Penalty", `${n(row.penaltyGoals)}/${n(row.penalties)}`],
  ];
  return (
    <div style={{ borderRadius: 17, padding: 11, border: `1px solid ${accent}4d`, background: `linear-gradient(180deg, ${accent}10, rgba(255,255,255,.025))` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${accent}77`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", flex: "0 0 auto" }}>
          {row.avatar ? <img src={row.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 1100 }}>{String(row.name || "?").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: accent, fontWeight: 1100, fontSize: 15, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{row.name}</div>
          <div style={{ marginTop: 3, fontSize: 10, color: theme.textSoft, fontWeight: 900 }}>{n(row.wins) ? "VICTOIRE" : n(row.losses) ? "DÉFAITE" : "MATCH NUL"}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
        {stats.map(([label, value]) => (
          <div key={label} style={{ minWidth: 0, borderRadius: 12, padding: "7px 6px", background: "rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: theme.textSoft, fontWeight: 900, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{label}</div>
            <div style={{ marginTop: 2, color: accent, fontSize: 16, fontWeight: 1100 }}>{value}</div>
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

function TeamHeaderMini({ theme, name, players, align }: any) {
  return (
    <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 7, flexDirection: align === "left" ? "row" : "row-reverse" }}>
      <AvatarStack theme={theme} players={players} align={align} size={32} />
      <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 1100, color: align === "left" ? theme.primary : "#ff70bd", textAlign: align }}>{name}</div>
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
