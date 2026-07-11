// @ts-nocheck
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerBabyFootLigue from "../../assets/tickers/ticker_babyfoot_ligue.png";
import { History } from "../../lib/history";
import { computeBabyFootRichStats } from "../../lib/babyfootRichStats";
import { extractBabyFootPlayerStatsRows, resolveBabyFootRecord } from "../../lib/babyfootPlayerStats";

type Props = { go: (tab: any, params?: any) => void; store?: any; params?: any };
type AnyMatch = Record<string, any>;
type TeamId = "A" | "B";
type StatsView = "global" | "individual";
type MatchFeedTab = "momentum" | "details";

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

function actionLabel(ev: any, payload: any, match: any, teamA: string, teamB: string) {
  const team = ev?.team === "A" ? teamA : ev?.team === "B" ? teamB : "";
  const player = playerNameFromPayload(payload, match, ev?.scorerId) || playerNameFromPayload(payload, match, ev?.ownGoalById);
  const who = player ? ` · ${player}` : "";
  if (ev?.t === "start") return "Début du match";
  if (ev?.t === "finish") return `Fin du match${ev?.winner ? ` · victoire ${ev.winner === "A" ? teamA : teamB}` : " · match nul"}`;
  if (ev?.t === "phase") return `Passage en ${String(ev?.phase || "phase").toUpperCase()}`;
  if (ev?.t === "set_win") return `Set gagné · ${team}`;
  if (ev?.t === "demi") {
    const penalty = Math.max(0, n(ev?.lastBallPenalty));
    return `Demi · ${team}${who}${penalty ? ` · -${penalty} pts (dernière balle)` : ""}`;
  }
  if (ev?.t === "undo") return "Dernière action annulée";
  if (ev?.t === "special") {
    const map: Record<string, string> = { gamelle: "Gamelle", peche_off: "Pêche offensive", peche_def: "Pêche défensive", pissette: ev?.counted ? "Pissette validée" : "Pissette refusée", parachute: "Parachute", csc: "CSC" };
    const delta = n(ev?.scoreDeltaA) || n(ev?.scoreDeltaB) ? ` · score ${n(ev?.scoreDeltaA) >= 0 ? "+" : ""}${n(ev?.scoreDeltaA)}/${n(ev?.scoreDeltaB) >= 0 ? "+" : ""}${n(ev?.scoreDeltaB)}` : "";
    return `${map[String(ev?.kind || "")] || String(ev?.kind || "Action")} · ${team}${who}${delta}`;
  }
  if (ev?.t === "goal") {
    const line = ev?.sourceLine ? ` ${String(ev.sourceLine).toUpperCase()}` : "";
    const kind = ev?.kind === "gamelle" ? "Gamelle" : ev?.kind === "pissette" ? "Pissette" : ev?.kind === "csc" ? "CSC" : ev?.kind === "parachute" ? "Parachute" : `But${line}`;
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
    return {
      key: `${ev?.t || "event"}-${ev?.at || index}-${index}`,
      time: fmtDuration(elapsed),
      elapsedMs: elapsed,
      label: actionLabel(ev, payload, match, teamA, teamB),
      score: `${scoreA}-${scoreB}`,
      team: ev?.team || null,
      type: ev?.t,
      kind: ev?.kind || null,
      counted: ev?.counted,
      penalty: Math.max(0, n(ev?.lastBallPenalty, 0)),
      deltaA,
      deltaB,
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

function buildTimeTicks(totalMs: number, count = 5) {
  const safeTotal = Math.max(0, Number(totalMs) || 0);
  const points = Math.max(2, Math.floor(count));
  return Array.from({ length: points }, (_, index) => {
    const ratio = points <= 1 ? 0 : index / (points - 1);
    return { ratio, label: fmtDuration(Math.round(safeTotal * ratio)) };
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
  const [matchFeedTab, setMatchFeedTab] = React.useState<MatchFeedTab>(String(params?.matchFeedTab || "momentum") === "details" ? "details" : "momentum");

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
      <div><strong>Stats globales</strong> compare les deux équipes : buts par ligne, demis, gamelles, pêches, pissettes, parachutes, CSC et dynamique du score.</div>
      <div><strong>Stats individuelles</strong> détaille les actions attribuées à chaque joueur.</div>
      <div><strong>Momentum</strong> visualise les temps forts du match, tandis que <strong>Détails</strong> conserve la liste des moments clés comme avant.</div>
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
          <span>Temps forts du match</span>
          <span style={{ fontSize: 11, color: theme.primary }}>{timelineRows.length} action{timelineRows.length > 1 ? "s" : ""}</span>
        </div>
        <MatchFeedSelector theme={theme} view={matchFeedTab} setView={setMatchFeedTab} />
        {matchFeedTab === "momentum" ? (
          <MomentumView
            theme={theme}
            teamA={teamA}
            teamB={teamB}
            scoreA={scoreA}
            scoreB={scoreB}
            timelineRows={timelineRows}
            durationMs={durationMs}
          />
        ) : (
          <MatchTimelineDetails theme={theme} timelineRows={timelineRows} />
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


function MatchFeedSelector({ theme, view, setView }: any) {
  const item = (key: MatchFeedTab, label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      style={{
        minHeight: 42,
        borderRadius: 14,
        border: `1px solid ${view === key ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
        background: view === key ? `${theme.primary}18` : "rgba(255,255,255,.04)",
        color: view === key ? theme.primary : theme.text,
        boxShadow: view === key ? `0 0 18px ${theme.primary}25` : "none",
        fontWeight: 1000,
        fontSize: 12,
        cursor: "pointer",
      }}
    >{label}</button>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, marginBottom: 12 }}>
      {item("momentum", "MOMENTUM")}
      {item("details", "DÉTAILS")}
    </div>
  );
}

function MomentumView({ theme, teamA, teamB, scoreA, scoreB, timelineRows, durationMs }: any) {
  const entries = buildMomentumEntries(timelineRows);
  if (!entries.length) {
    return (
      <div style={{ ...small(theme), padding: 12, borderRadius: 14, border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.18)"}`, background: "rgba(255,255,255,.025)" }}>
        Aucun momentum n’est disponible sur cette sauvegarde. Consulte l’onglet Détails pour la liste des actions si elle existe.
      </div>
    );
  }

  const totalMs = Math.max(
    1000,
    n(durationMs, 0),
    ...entries.map((row: any) => n(row?.elapsedMs, 0))
  );
  const ticks = buildTimeTicks(totalMs, 5);
  const baseY = 116;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: theme.primary, fontWeight: 1100, fontSize: 14, textShadow: `0 0 12px ${theme.primary}55`, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{teamA}</div>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 16, border: `1px solid ${theme.primary}55`, background: "rgba(255,255,255,.035)", fontWeight: 1100, fontSize: 22, color: theme.text, boxShadow: `0 0 22px ${theme.primary}18 inset` }}>{scoreA} - {scoreB}</div>
        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ color: "#ff59b0", fontWeight: 1100, fontSize: 14, textShadow: "0 0 12px rgba(255,89,176,.45)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{teamB}</div>
        </div>
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

        <div style={{ position: "relative", height: 250, overflow: "hidden", borderRadius: 16, background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.16), transparent 30%, transparent 70%, rgba(0,0,0,.18))" }} />
          <div style={{ position: "absolute", left: 14, right: 14, top: baseY, height: 2, background: `linear-gradient(90deg, ${theme.primary}, rgba(255,255,255,.28), #ff59b0)`, boxShadow: `0 0 14px ${theme.primary}33` }} />

          {ticks.map((tick: any) => (
            <React.Fragment key={`tick-${tick.ratio}`}>
              <div style={{ position: "absolute", left: `calc(${tick.ratio * 100}% - 1px)`, top: 16, bottom: 24, width: 1, background: "rgba(255,255,255,.08)" }} />
              <div style={{ position: "absolute", left: `calc(${tick.ratio * 100}% - 18px)`, bottom: 4, width: 36, textAlign: "center", fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,.6)" }}>{tick.label}</div>
            </React.Fragment>
          ))}

          {entries.map((row: any, index: number) => {
            const team = row.team === "B" ? "B" : "A";
            const isPenalty = row.type === "demi" && row.penalty > 0;
            const accent = isPenalty ? "#ffd76a" : team === "A" ? theme.primary : "#ff59b0";
            const x = totalMs > 0 ? (n(row.elapsedMs, 0) / totalMs) * 100 : 0;
            const strength = Math.max(1, n(row.weight, 1));
            const barHeight = Math.min(90, 26 + (strength - 1) * 18 + (row.type === "goal" ? 10 : 0) + (isPenalty ? 8 : 0));
            const barWidth = Math.max(6, Math.min(12, 5 + strength * 2));
            const scoreTop = team === "A" ? baseY - barHeight - 26 : baseY + barHeight + 10;
            const labelTop = team === "A" ? baseY - barHeight - 8 : baseY + barHeight - 2;
            const symbol = isPenalty ? `-${row.penalty}` : row.type === "demi" ? "½" : row.kind === "csc" ? "CSC" : "⚽";
            return (
              <div key={row.key || index} title={`${row.time} · ${row.label} · ${row.score}`} style={{ position: "absolute", left: `calc(${x}% - ${Math.round(barWidth / 2)}px)`, insetBlock: 0 }}>
                <div style={{ position: "absolute", left: 0, width: barWidth, borderRadius: 999, background: `linear-gradient(180deg, ${accent}, ${accent}aa)`, boxShadow: `0 0 14px ${accent}`, opacity: .96, ...(team === "A" ? { bottom: `${250 - baseY}px`, height: barHeight } : { top: `${baseY}px`, height: barHeight }) }} />
                <div style={{ position: "absolute", left: `calc(50% - ${isPenalty ? 14 : 11}px)`, top: scoreTop, minWidth: isPenalty ? 28 : 22, padding: isPenalty ? "2px 5px" : "0 4px", height: isPenalty ? "auto" : 22, lineHeight: isPenalty ? 1.35 : "22px", borderRadius: 999, border: `1px solid ${accent}99`, background: "rgba(4,9,18,.88)", color: accent, textAlign: "center", fontSize: isPenalty ? 10 : 11, fontWeight: 1100, boxShadow: `0 0 12px ${accent}22` }}>{symbol}</div>
                <div style={{ position: "absolute", left: "50%", top: labelTop, transform: `translate(${team === "A" ? "-10%" : "-90%"}, ${team === "A" ? "-100%" : "0"})`, maxWidth: 108, fontSize: 10, fontWeight: 900, color: accent, textShadow: `0 0 10px ${accent}44`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.time}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {entries.slice(-4).reverse().map((row: any) => {
            const accent = row.type === "demi" && row.penalty > 0 ? "#ffd76a" : row.team === "B" ? "#ff59b0" : theme.primary;
            return (
              <div key={`summary-${row.key}`} style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 8, alignItems: "center", fontSize: 11, fontWeight: 900 }}>
                <div style={{ color: accent }}>{row.time}</div>
                <div style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: theme.text }}>{row.label}</div>
                <div style={{ color: theme.textSoft }}>{row.score}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchTimelineDetails({ theme, timelineRows }: any) {
  return timelineRows.length ? (
    <div style={{ display: "grid", gap: 8, maxHeight: 480, overflow: "auto", padding: "4px 2px 4px 8px" }}>
      {timelineRows.map((row: any, i: number) => {
        const accent = row.type === "demi" && row.penalty > 0 ? "#ffd76a" : row.team === "B" ? "#ff59b0" : row.team === "A" ? theme.primary : "#82cfff";
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
      Aucun journal détaillé n’est présent dans cette ancienne sauvegarde. Les prochains matchs enregistreront chaque but, demi, gamelle, pêche, pissette, parachute et CSC.
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
    ["Parachutes", n((a as any).parachute), n((b as any).parachute)],
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
      <div style={{ marginTop: 10, ...small(theme) }}>Les nouvelles actions sont enregistrées avec le joueur choisi. Une ligne « non attribué » n’apparaît que pour une ancienne partie ou une composition sans profil exploitable.</div>
    </div>
  );
}

function PlayerStatsCard({ theme, row, accent }: any) {
  const stats = [
    ["Points", n(row.points ?? row.goals)],
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
    ["Parachute", n(row.parachute)],
  ];
  return (
    <div style={{ borderRadius: 17, padding: 11, border: `1px solid ${accent}4d`, background: `linear-gradient(180deg, ${accent}10, rgba(255,255,255,.025))` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${accent}77`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", flex: "0 0 auto" }}>
          {row.avatar ? <img src={row.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 1100 }}>{String(row.name || "?").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: accent, fontWeight: 1100, fontSize: 15, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{row.name}</div>
          <div style={{ marginTop: 3, fontSize: 10, color: theme.textSoft, fontWeight: 900 }}>{row.collective ? "ANCIENNE PARTIE · NON ATTRIBUÉ" : n(row.wins) ? "VICTOIRE" : n(row.losses) ? "DÉFAITE" : "MATCH NUL"}</div>
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
