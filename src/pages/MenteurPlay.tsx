// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerMenteur from "../assets/tickers/ticker_menteur.png";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  callMenteur,
  cloneMenteurState,
  createMenteurState,
  isMenteurConditionSatisfied,
  isMenteurContractSatisfied,
  menteurConditionLabel,
  normalizeMenteurConfig,
  pickMenteurBotAction,
  pickMenteurBotDarts,
  playMenteurVisit,
  raiseMenteurBid,
  raiseMenteurBidTo,
  scoreMenteurVisit,
  type MenteurState,
} from "../lib/gameEngines/menteurEngine";
import {
  Meter,
  ModeEndPanel,
  NewModeInput,
  PlayerCard,
  VisitTimeline,
  actionStyle,
  isBotProfile,
  lastEvents,
  panelStyle,
  playerName,
  resolveModeProfiles,
  SOFT,
  uiToGameDart,
} from "./newModes/newModePlayShared";

const ACCENT = "#ffbf37";
const RED = "#ff5e4d";
const BLUE = "#5ac8ff";
const GREEN = "#72efb1";

function Rules({ config }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: ACCENT }}>ENCHÈRE</b><br />Annonce un score supérieur. Le pas minimal est de {config.rules.raiseStep} points.</div>
    <div><b style={{ color: BLUE }}>CONTRAT</b><br />{config.rules.contractDeck === "score" ? "Score minimum uniquement." : config.rules.contractDeck === "mixed" ? "Le score peut être accompagné d'un Double ou d'un Triple." : "Le score peut être accompagné d'un Double, Triple, Bull ou de 3 numéros différents."}</div>
    <div><b style={{ color: RED }}>MENTEUR !</b><br />Défie le dernier annonceur. Il doit réaliser le score annoncé et la condition en 3 fléchettes. Le perdant du duel perd une vie.</div>
    <div><b style={{ color: GREEN }}>VICTOIRE</b><br />À 0 vie, élimination. Le dernier joueur vivant gagne la manche.</div>
  </div>;
}

export default function MenteurPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeMenteurConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<MenteurState>(() => restored?.mode === "menteur" ? cloneMenteurState(restored) : createMenteurState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<MenteurState[]>([]);
  const [notice, setNotice] = React.useState("");
  const [customBid, setCustomBid] = React.useState(30);
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `menteur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);

  const buildRecord = React.useCallback((s: MenteurState, status: "in_progress" | "finished") => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current,
      kind: "menteur", mode: "menteur", sport: "darts", status, createdAt: s.startedAt, updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "menteur", lives: s.config.rules.lives, seriesWins: s.config.seriesWins },
      summary: { mode: "menteur", finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer: Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, lives: Number(s.lives[id] || 0), eliminated: !!s.eliminated[id], wins: Number(s.legWins[id] || 0) }])) },
      resume: { mode: "menteur", config: s.config, state: cloneMenteurState(s), updatedAt: Date.now() },
      payload: { kind: "menteur", mode: "menteur", sport: "darts", config: s.config, stateSnapshot: cloneMenteurState(s), visits: s.visits, visitHistory: s.visits, stats: { mode: "menteur", players: s.statsByPlayer, legWins: s.legWins } },
    };
  }, [profiles]);

  const persist = React.useCallback((s: MenteurState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished");
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec);
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord, onFinish]);

  const commit = (next: MenteurState, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneMenteurState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const ev = lastEvents(next.visits);
    let message = ev.length ? ev.join(" · ") : "";
    if (next.phase === "finished" && next.winnerId) message = `🏆 ${next.players.find((p: any) => p.id === next.winnerId)?.name || "Victoire"} remporte MENTEUR`;
    else if (next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${next.players.find((p: any) => p.id === next.lastLegWinnerId)?.name || "Un joueur"} remporte la manche`;
    setNotice(message);
    persist(next);
  };

  const validate = () => {
    if (!currentThrow.length || state.phase !== "challenge" || activeIsBot) return;
    commit(playMenteurVisit(state, currentThrow.map(uiToGameDart)));
  };
  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    setState(cloneMenteurState(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière action annulée");
    finishedRef.current = false;
    persist(prev);
    return u.slice(0, -1);
  });
  const raise = (n: number) => commit(raiseMenteurBid(state, n));
  const raiseTo = (n: number) => commit(raiseMenteurBidTo(state, n));
  const call = () => state.lastBidderId && commit(callMenteur(state));

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      try {
        if (state.phase === "auction") {
          const a = pickMenteurBotAction(state, config.botLevel);
          commit(a.type === "liar" ? callMenteur(state) : raiseMenteurBid(state, a.amount));
        } else commit(playMenteurVisit(state, pickMenteurBotDarts(state, config.botLevel)));
      } finally { botBusy.current = false; }
    }, 680);
    return () => window.clearTimeout(t);
  }, [state, activeIsBot, activePlayer?.id]);

  function replay() {
    matchIdRef.current = `menteur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setState(createMenteurState(players, config));
  }

  const legTarget = config.seriesWins * 2 - 1;
  const step = config.rules.raiseStep;
  const opening = state.lastBidderId == null;
  const minBid = opening ? 30 : Math.min(180, state.bid + step);
  React.useEffect(() => { setCustomBid(minBid); }, [minBid, state.activePlayerIndex, state.phase]);
  const quickTargets = [minBid, Math.min(180, minBid + step * 2), Math.min(180, minBid + step * 4)].filter((v, i, arr) => arr.indexOf(v) === i);
  const previewDarts = currentThrow.map(uiToGameDart);
  const previewScore = scoreMenteurVisit(previewDarts);
  const previewScoreOk = previewScore >= state.bid;
  const previewConditionOk = isMenteurConditionSatisfied(state.condition, previewDarts);
  const previewContractOk = currentThrow.length ? isMenteurContractSatisfied(state, previewDarts) : false;

  return <div style={{ minHeight: "calc(var(--vh, 1vh) * 100)", paddingBottom: 18, background: "radial-gradient(circle at 50% 0%,rgba(255,92,65,.10),transparent 35%)" }}>
    <PageHeader tickerSrc={tickerMenteur} tickerAlt="MENTEUR" left={<BackDot onClick={() => go?.("menteur_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<InfoDot title="Règles MENTEUR" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config} />} />} />
    <div style={{ padding: "7px 8px 18px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(ACCENT + "50"), padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>MANCHE {state.legIndex + 1} · BO{legTarget}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Match terminé" : state.phase === "auction" ? `${activePlayer?.name || "—"} : surenchérir ou MENTEUR !` : `${activePlayer?.name || "—"} doit prouver son annonce`}</div></div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: notice.includes("MENTEUR") || notice.includes("mensonge") ? "rgba(255,80,75,.14)" : notice.includes("🏆") ? "rgba(114,239,177,.12)" : "rgba(255,191,55,.10)", border: `1px solid ${notice.includes("MENTEUR") || notice.includes("mensonge") ? "rgba(255,94,77,.34)" : notice.includes("🏆") ? "rgba(114,239,177,.32)" : "rgba(255,191,55,.24)"}`, color: notice.includes("MENTEUR") || notice.includes("mensonge") ? "#ff9b94" : notice.includes("🏆") ? "#baffd8" : "#ffe0a0", fontSize: 10.5, fontWeight: 900 }}>{notice}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const l = Number(state.lives[p.id] || 0);
          const dead = !!state.eliminated[p.id];
          const st = state.statsByPlayer[p.id] || {};
          return <div key={p.id} style={{ display: "grid", gap: 5 }}>
            <PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={ACCENT} value={`${l} ♥`} subValue={dead ? "Éliminé" : `${st.raises || 0} enchères · ${st.contractsProven || 0} preuves`} badge={state.lastBidderId === p.id ? "DERNIER BID" : dead ? "OUT" : null} wins={state.legWins[p.id] || 0} muted={dead} />
            <Meter value={l} max={config.rules.lives} accent={l <= 1 ? RED : ACCENT} dangerAt={1.1} height={5} />
          </div>;
        })}
      </div>

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle("rgba(255,255,255,.10)"), padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100 }}>CONTRAT ACTUEL</div>
              <div style={{ marginTop: 3, color: "#fff", fontSize: 29, fontWeight: 1100 }}>{state.bid || "—"} <span style={{ fontSize: 11, color: SOFT }}>{state.bid ? "POINTS MINIMUM" : "AUCUNE ANNONCE"}</span></div>
              <div style={{ marginTop: 4, color: BLUE, fontSize: 10, fontWeight: 1000 }}>{menteurConditionLabel(state.condition)}</div>
              {state.lastBidderId ? <div style={{ marginTop: 4, color: SOFT, fontSize: 9.5 }}>Dernier annonceur : <b style={{ color: "#fff" }}>{state.players.find((p) => p.id === state.lastBidderId)?.name}</b></div> : null}
            </div>
            <div style={{ width: 94, height: 94, borderRadius: 999, border: `2px solid ${state.phase === "challenge" ? RED : ACCENT}88`, boxShadow: `0 0 24px ${state.phase === "challenge" ? RED : ACCENT}22`, background: "radial-gradient(circle,#40210c,#100b09 70%)", display: "grid", placeItems: "center", textAlign: "center" }}><div style={{ fontSize: 31 }}>🤥</div><div style={{ marginTop: -12, color: state.phase === "challenge" ? RED : ACCENT, fontSize: 9, fontWeight: 1100 }}>{state.phase === "challenge" ? "DUEL" : "BLUFF"}</div></div>
          </div>
          <div style={{ marginTop: 9 }}><Meter value={state.bid} max={180} accent={ACCENT} dangerAt={.9} height={7} /></div>

          {state.phase === "challenge" ? <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 12, border: `1px solid ${previewContractOk ? GREEN + "66" : RED + "33"}`, background: previewContractOk ? `${GREEN}0f` : `${RED}08`, display: "grid", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ color: previewContractOk ? GREEN : RED, fontSize: 9.5, fontWeight: 1100 }}>{previewContractOk ? "CONTRAT PROUVÉ" : "PREUVE EN COURS"}</div><div style={{ marginTop: 2, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{previewScore} / {state.bid} points</div></div><div style={{ color: previewContractOk ? GREEN : SOFT, fontSize: 10, fontWeight: 950 }}>{currentThrow.length}/3 fléchettes</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ borderRadius: 9, padding: 6, border: `1px solid ${previewScoreOk ? GREEN + "55" : "rgba(255,255,255,.10)"}`, color: previewScoreOk ? GREEN : SOFT, fontSize: 9, fontWeight: 950, textAlign: "center" }}>{previewScoreOk ? "✓" : "○"} SCORE ≥ {state.bid}</div><div style={{ borderRadius: 9, padding: 6, border: `1px solid ${previewConditionOk ? GREEN + "55" : "rgba(255,255,255,.10)"}`, color: previewConditionOk ? GREEN : SOFT, fontSize: 9, fontWeight: 950, textAlign: "center" }}>{previewConditionOk ? "✓" : "○"} {menteurConditionLabel(state.condition)}</div></div>
          </div> : null}

          {state.phase === "auction" && !activeIsBot ? <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.08)", display: "grid", gap: 7 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, quickTargets.length)},1fr)`, gap: 6 }}>{quickTargets.map((target: number) => <button key={target} type="button" disabled={state.bid >= 180} onClick={() => raiseTo(target)} style={actionStyle(ACCENT, state.bid >= 180)}><span style={{ display: "block", fontSize: 8.5, color: SOFT }}>{opening ? "ANNONCER" : "SURENCHÉRIR"}</span>{target}</button>)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(70px,1fr) auto minmax(120px,1.3fr)", gap: 6, alignItems: "stretch" }}>
              <button type="button" onClick={() => setCustomBid((v) => Math.max(minBid, v - step))} disabled={customBid <= minBid} style={actionStyle(ACCENT, customBid <= minBid)}>−{step}</button>
              <div style={{ minHeight: 40, borderRadius: 12, border: `1px solid ${ACCENT}55`, background: `${ACCENT}0d`, display: "grid", placeItems: "center", color: "#fff", fontSize: 17, fontWeight: 1100 }}>{customBid}</div>
              <button type="button" onClick={() => setCustomBid((v) => Math.min(180, v + step))} disabled={customBid >= 180} style={actionStyle(ACCENT, customBid >= 180)}>+{step}</button>
              <button type="button" onClick={() => raiseTo(customBid)} disabled={state.bid >= 180} style={{ ...actionStyle(GREEN, state.bid >= 180), fontSize: 10 }}>VALIDER L'ANNONCE</button>
            </div>
            <button type="button" disabled={!state.lastBidderId} onClick={call} style={{ ...actionStyle(RED, !state.lastBidderId), minHeight: 50, fontSize: 15 }}>🤥 MENTEUR !</button>
          </div> : null}
        </div>

        {state.phase === "challenge" ? (!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="PROUVER L'ANNONCE" accent={ACCENT} /> : <div style={{ ...panelStyle(ACCENT + "33"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: ACCENT }}>{activePlayer?.name}</b> tente de prouver {state.bid} points…</div>) : activeIsBot ? <div style={{ ...panelStyle(ACCENT + "33"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: ACCENT }}>{activePlayer?.name}</b> analyse le bluff…</div> : null}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="DERNIERS BLUFFS" limit={5} />
      </> : <ModeEndPanel title="MENTEUR" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: "menteur", from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "menteur", focusMatchId: matchIdRef.current })} onConfig={() => go?.("menteur_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.raises || 0} enchères · {st.liarCalls || 0} appels · {st.contractsProven || 0} preuves · best {st.bestVisit || 0}</div>; })}</div>} />}
    </div>
  </div>;
}
