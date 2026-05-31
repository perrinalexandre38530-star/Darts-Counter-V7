import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerBabyFootLigue from "../../assets/tickers/ticker_babyfoot_ligue.png";
import { History } from "../../lib/history";

type Props = { go: (tab: any, params?: any) => void; store?: any; params?: any };

type AnyMatch = Record<string, any>;

function pickMatch(store: any, params: any): AnyMatch | null {
  if (params?.matchPayload) return params.matchPayload;
  const id = String(params?.matchId || params?.focusMatchId || "").trim();
  const list = Array.isArray(store?.history) ? store.history : [];
  if (!id) return list.find((m: any) => m?.sport === "babyfoot" || m?.kind === "babyfoot") || null;
  return list.find((m: any) => String(m?.id || m?.matchId) === id || String(m?.payload?.matchId || m?.payload?.id) === id) || null;
}

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function getPayload(match: AnyMatch | null) {
  return match?.payload || match || {};
}

function getSummary(match: AnyMatch | null) {
  return match?.summary || match?.payload?.summary || match?.payload || match || {};
}

function statValue(obj: any, keys: string[], fallback = 0) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return fallback;
}

function fmtDate(ts: any) {
  const d = new Date(n(ts, Date.now()));
  return d.toLocaleString();
}

function fmtDuration(ms: any) {
  const total = Math.max(0, Math.floor(n(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function teamPlayers(payload: any, team: "A" | "B") {
  const ids = team === "A" ? payload?.teamAProfileIds || payload?.summary?.teamAProfileIds : payload?.teamBProfileIds || payload?.summary?.teamBProfileIds;
  const arr = Array.isArray(payload?.players) ? payload.players : [];
  if (Array.isArray(ids) && ids.length) return arr.filter((p: any) => ids.map(String).includes(String(p?.id)));
  return arr.filter((p: any) => String(p?.team || "").toUpperCase() === team || Number(p?.teamIndex) === (team === "A" ? 0 : 1));
}

function avatarOf(p: any) {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
}

function getEventsFrom(payload: any, summary: any, match: any): any[] {
  const sources = [payload?.events, summary?.events, match?.events, match?.payload?.events, match?.payload?.summary?.events];
  const hit = sources.find((v) => Array.isArray(v));
  return Array.isArray(hit) ? hit : [];
}

function playerNameFromPayload(payload: any, id: any) {
  const pid = String(id || "").trim();
  if (!pid) return "";
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const hit = players.find((p: any) => String(p?.id || p?.playerId || p?.profileId || "") === pid);
  return String(hit?.name || hit?.displayName || hit?.nickname || "").trim();
}

function totalStat(stats: any, specialStats: any, keys: string[], sideKeys: string[]) {
  const direct = statValue(stats, keys, NaN);
  if (Number.isFinite(direct)) return direct;
  const nested = n(stats?.teamA?.[sideKeys[0]], 0) + n(stats?.teamB?.[sideKeys[1]], 0);
  if (nested > 0) return nested;
  return n(specialStats?.[sideKeys[2]], 0) + n(specialStats?.[sideKeys[3]], 0);
}

function actionLabel(ev: any, payload: any, teamA: string, teamB: string) {
  const team = ev?.team === "A" ? teamA : ev?.team === "B" ? teamB : "";
  const player = playerNameFromPayload(payload, ev?.scorerId) || playerNameFromPayload(payload, ev?.ownGoalById);
  const who = player ? ` · ${player}` : "";
  if (ev?.t === "start") return "Début du match";
  if (ev?.t === "finish") return `Fin du match${ev?.winner ? ` · ${ev.winner === "A" ? teamA : teamB}` : ""}`;
  if (ev?.t === "phase") return `Phase ${String(ev?.phase || "").toUpperCase()}`;
  if (ev?.t === "set_win") return `Set gagné · ${team}`;
  if (ev?.t === "pen_shot") return `Penalty ${ev?.scored ? "marqué" : "raté"} · ${team}${who}`;
  if (ev?.t === "demi") return `Demi · ${team}${who}`;
  if (ev?.t === "special") {
    const map: Record<string, string> = { gamelle: "Gamelle", peche_off: "Pêche offensive", peche_def: "Pêche défensive", pissette: "Pissette", csc: "CSC" };
    return `${map[String(ev?.kind || "")] || String(ev?.kind || "Action")} · ${team}${who}`;
  }
  if (ev?.t === "goal") {
    const line = ev?.sourceLine ? ` ${String(ev.sourceLine).toUpperCase()}` : "";
    const kind = ev?.kind === "gamelle" ? "Gamelle" : ev?.kind === "pissette" ? "Pissette" : ev?.kind === "csc" ? "CSC" : `But${line}`;
    const pts = n(ev?.points, 1);
    return `${kind} · ${team}${who}${pts > 1 ? ` · +${pts}` : ""}`;
  }
  return String(ev?.label || ev?.type || ev?.kind || "Action");
}

function buildTimelineRows(events: any[], payload: any, summary: any, teamA: string, teamB: string) {
  const start = n(payload?.startedAt ?? summary?.startedAt ?? payload?.createdAt ?? summary?.createdAt, 0);
  let scoreA = Math.max(0, n(payload?.handicapB ?? summary?.handicapB, 0));
  let scoreB = Math.max(0, n(payload?.handicapA ?? summary?.handicapA, 0));
  return (events || []).map((ev: any, index: number) => {
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
      label: actionLabel(ev, payload, teamA, teamB),
      score: `${scoreA}-${scoreB}`,
      team: ev?.team || null,
      raw: ev,
    };
  });
}

export default function BabyFootEndPage({ go, store, params }: Props) {
  const { theme } = useTheme();
  const requestedId = String(params?.matchId || params?.focusMatchId || params?.matchPayload?.id || params?.matchPayload?.matchId || "").trim();
  const [idbMatch, setIdbMatch] = React.useState<AnyMatch | null>(null);

  React.useEffect(() => {
    let alive = true;
    if (params?.matchPayload || !requestedId) {
      setIdbMatch(null);
      return () => { alive = false; };
    }
    (History as any).get?.(requestedId)
      ?.then((row: any) => { if (alive) setIdbMatch(row || null); })
      ?.catch(() => { if (alive) setIdbMatch(null); });
    return () => { alive = false; };
  }, [requestedId, params?.matchPayload]);

  const match = params?.matchPayload || idbMatch || pickMatch(store, params);
  const payload = getPayload(match);
  const summary = getSummary(match);
  const stats = summary?.stats || payload?.summary?.stats || payload?.stats || summary?.specialStats || {};
  const specialStats = summary?.specialStats || payload?.specialStats || payload?.summary?.specialStats || {};
  const scoreA = n(summary?.scoreA ?? payload?.scoreA ?? params?.scoreA);
  const scoreB = n(summary?.scoreB ?? payload?.scoreB ?? params?.scoreB);
  const teamA = String(summary?.teamA || payload?.teamA || params?.teamA || "Équipe A");
  const teamB = String(summary?.teamB || payload?.teamB || params?.teamB || "Équipe B");
  const winnerTeam = String(payload?.winnerTeam || (scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "D"));
  const winnerLabel = winnerTeam === "A" ? teamA : winnerTeam === "B" ? teamB : "Match nul";
  const durationMs = summary?.durationMs ?? payload?.durationMs ?? params?.durationMs;
  const events = getEventsFrom(payload, summary, match);
  const timelineRows = buildTimelineRows(events, payload, summary, teamA, teamB);
  const totalDemi = totalStat(stats, specialStats, ["totalDemi", "totalDemis", "demi", "demis"], ["demi", "demi", "demiA", "demiB"]);
  const totalGamelle = totalStat(stats, specialStats, ["totalGamelle", "totalGamelles", "gamelle", "gamelles"], ["gamelle", "gamelle", "gamelleA", "gamelleB"]);
  const totalPeche = totalStat(stats, specialStats, ["totalPeche", "totalPeches", "peche", "peches"], ["peche", "peche", "pecheOffA", "pecheOffB"]);
  const totalPissette = totalStat(stats, specialStats, ["totalPissette", "totalPissettes", "pissette", "pissettes"], ["pissette", "pissette", "pissetteA", "pissetteB"]);
  const totalGoalAv = n(stats?.teamA?.goalAv, 0) + n(stats?.teamB?.goalAv, 0) + n(specialStats?.goalAvA, 0) + n(specialStats?.goalAvB, 0);
  const totalGoalDef = n(stats?.teamA?.goalDef, 0) + n(stats?.teamB?.goalDef, 0) + n(specialStats?.goalDefA, 0) + n(specialStats?.goalDefB, 0);
  const teamAPlayers = teamPlayers(payload, "A");
  const teamBPlayers = teamPlayers(payload, "B");
  const backToLeague = params?.fromLeague || params?.leagueId || payload?.fromLeague || payload?.leagueId;
  const leagueParams = { leagueId: String(params?.leagueId || payload?.leagueId || ""), view: "detail", tab: "calendar" };

  return (
    <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: "18px 14px 92px", boxSizing: "border-box" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, boxShadow: `0 0 28px ${theme.primary}22` }}>
        <img src={tickerBabyFootLigue} alt="Baby-Foot" style={{ width: "100%", height: 112, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.28), transparent, rgba(0,0,0,.22))" }} />
        <BackDot onClick={() => backToLeague ? go("babyfoot_league" as any, leagueParams) : go("babyfoot_stats_history" as any, { focusMatchId: payload?.matchId || match?.id })} style={{ position: "absolute", left: 10, top: 38 }} />
        <InfoDot title="Fin de match Baby-Foot" body="Cette page conserve le résumé, les stats et l’accès historique du match terminé. Les matchs de ligue peuvent revenir directement au calendrier de la ligue." style={{ position: "absolute", right: 10, top: 38 }} />
      </div>

      <section style={{ ...panel(theme), marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
          <TeamBlock theme={theme} name={teamA} players={teamAPlayers} align="left" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 1000, color: theme.primary, letterSpacing: 1.2 }}>FIN DE MATCH</div>
            <div style={{ marginTop: 4, fontSize: 42, lineHeight: 1, fontStyle: "italic", fontWeight: 1100, color: theme.primary, textShadow: `0 0 18px ${theme.primary}` }}>{scoreA} - {scoreB}</div>
            <div style={{ marginTop: 5, fontSize: 12, fontWeight: 900, opacity: .75 }}>{fmtDate(payload?.finishedAt || match?.updatedAt || params?.finishedAt)}</div>
          </div>
          <TeamBlock theme={theme} name={teamB} players={teamBPlayers} align="right" />
        </div>
        <div style={{ marginTop: 14, borderRadius: 16, padding: 12, background: `${theme.primary}12`, border: `1px solid ${theme.primary}55`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 1000, color: theme.primary }}>VAINQUEUR</div>
            <div style={{ fontSize: 22, fontWeight: 1100 }}>{winnerLabel}</div>
          </div>
          <div style={{ textAlign: "right", fontWeight: 900, opacity: .82 }}>{String(summary?.mode || payload?.mode || params?.mode || "babyfoot").toUpperCase()}<br />{fmtDuration(durationMs)}</div>
        </div>
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={sectionTitle(theme)}>Stats du match</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <StatBox theme={theme} label="Buts" value={String(scoreA + scoreB)} />
          <StatBox theme={theme} label="Durée" value={fmtDuration(durationMs)} />
          <StatBox theme={theme} label="Écart" value={String(Math.abs(scoreA - scoreB))} />
          <StatBox theme={theme} label="Demi" value={String(totalDemi)} />
          <StatBox theme={theme} label="Gamelle" value={String(totalGamelle)} />
          <StatBox theme={theme} label="Pêche" value={String(totalPeche)} />
          <StatBox theme={theme} label="Pissette" value={String(totalPissette)} />
          <StatBox theme={theme} label="Buts AV" value={String(totalGoalAv)} />
          <StatBox theme={theme} label="Buts DEF" value={String(totalGoalDef)} />
        </div>
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={sectionTitle(theme)}>Actions rapides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button style={primaryBtn(theme)} onClick={() => go("babyfoot_stats_history" as any, { focusMatchId: payload?.matchId || match?.id })}>HISTORIQUE</button>
          <button style={ghostBtn(theme)} onClick={() => go("babyfoot_stats_center" as any)}>STATS BABY</button>
          {backToLeague ? <button style={{ ...ghostBtn(theme), gridColumn: "1 / -1" }} onClick={() => go("babyfoot_league" as any, leagueParams)}>RETOUR LIGUE</button> : null}
        </div>
      </section>

      <section style={{ ...panel(theme), marginTop: 12 }}>
        <div style={sectionTitle(theme)}>Frise chronologique du match</div>
        {timelineRows.length ? (
          <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto", paddingLeft: 6 }}>
            {timelineRows.slice(-140).map((row: any, i: number) => {
              const accent = row.team === "B" ? "#ff59b0" : theme.primary;
              return (
                <div key={row.key || i} style={{ display: "grid", gridTemplateColumns: "58px 1fr 48px", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 1000, color: accent, textAlign: "right" }}>{row.time}</div>
                  <div style={{ position: "relative", borderRadius: 14, padding: "9px 10px 9px 16px", border: `1px solid ${accent}55`, background: `${accent}12`, fontSize: 12, fontWeight: 900 }}>
                    <span style={{ position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: 999, background: accent, boxShadow: `0 0 12px ${accent}` }} />
                    {row.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 1100, color: theme.text, textAlign: "center" }}>{row.score}</div>
                </div>
              );
            })}
          </div>
        ) : <div style={{ ...small(theme), padding: 10 }}>Aucun journal détaillé disponible pour ce match.</div>}
      </section>
    </div>
  );
}

function TeamBlock({ theme, name, players, align }: { theme: any; name: string; players: any[]; align: "left" | "right" }) {
  const first = players[0] || {};
  const img = avatarOf(first);
  return (
    <div style={{ display: "grid", justifyItems: align === "left" ? "start" : "end", gap: 6, minWidth: 0 }}>
      <div style={{ width: 54, height: 54, borderRadius: 999, border: `1px solid ${theme.primary}66`, overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(255,255,255,.06)", boxShadow: `0 0 18px ${theme.primary}44` }}>
        {img ? <img src={img} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontWeight: 1000, color: theme.primary }}>{name.slice(0, 2).toUpperCase()}</span>}
      </div>
      <div style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: align, fontWeight: 1100, color: theme.primary, textTransform: "uppercase" }}>{name}</div>
    </div>
  );
}

function panel(theme: any): React.CSSProperties { return { borderRadius: 20, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: theme.card ?? "rgba(14,16,28,.92)", padding: 12, boxShadow: "0 18px 48px rgba(0,0,0,.35)" }; }
function sectionTitle(theme: any): React.CSSProperties { return { fontWeight: 1100, fontSize: 18, marginBottom: 10, color: theme.text }; }
function small(theme: any): React.CSSProperties { return { color: theme.textSoft ?? "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 800, lineHeight: 1.35 }; }
function primaryBtn(theme: any): React.CSSProperties { return { borderRadius: 14, border: `1px solid ${theme.primary}`, background: `${theme.primary}22`, color: theme.text, minHeight: 48, padding: "0 12px", fontWeight: 1100, cursor: "pointer", boxShadow: `0 0 18px ${theme.primary}33` }; }
function ghostBtn(theme: any): React.CSSProperties { return { borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(255,255,255,.06)", color: theme.text, minHeight: 48, padding: "0 12px", fontWeight: 1000, cursor: "pointer" }; }
function StatBox({ theme, label, value }: { theme: any; label: string; value: string }) { return <div style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, background: "rgba(0,0,0,.18)", padding: 10 }}><div style={{ fontSize: 10, color: theme.textSoft, fontWeight: 1000 }}>{label}</div><div style={{ fontSize: 20, color: theme.primary, fontWeight: 1100 }}>{value}</div></div>; }
