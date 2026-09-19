// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerPendu from "../assets/tickers/ticker_pendu.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  clonePenduState,
  createPenduState,
  isPenduChallengeSatisfied,
  normalizePenduConfig,
  penduChallengeLabel,
  pickPenduBotDarts,
  playPenduVisit,
  randomPenduChallenge,
  scorePenduVisit,
  setPenduChallenge,
  type PenduChallenge,
  type PenduState,
} from "../lib/gameEngines/penduEngine";
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

const ACCENT = "#ffb33f";
const RED = "#ff6b57";
const GOLD = "#ffd66a";
const GREEN = "#72efb1";

function Rules({ config }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: ACCENT }}>DÉFI</b><br />Le bourreau tente d'abord le défi affiché. S'il le réussit, tous les autres joueurs encore en jeu doivent le reproduire.</div>
    <div><b style={{ color: RED }}>ERREUR</b><br />Chaque échec ajoute une partie au pendu. À {config.rules.partsToLose} erreurs, le joueur est éliminé.</div>
    <div><b style={{ color: GOLD }}>VALIDATION</b><br />{config.rules.executionMode === "flex" ? "Mode souple : une zone supérieure ou un score supérieur peut valider le défi." : "Mode strict : il faut réaliser exactement le défi demandé."}</div>
    <div><b style={{ color: GREEN }}>VICTOIRE</b><br />Le dernier joueur vivant gagne la manche. Il faut {config.seriesWins} victoire{config.seriesWins > 1 ? "s" : ""} pour gagner le match.</div>
  </div>;
}

function PenduFigure({ errors = 0, max = 6, accent = ACCENT }: any) {
  const e = Math.max(0, Math.min(Number(max) || 6, Number(errors) || 0));
  const long = Number(max) >= 8;
  const visible = {
    rope: long ? e >= 1 : true,
    head: long ? e >= 2 : e >= 1,
    body: long ? e >= 3 : e >= 2,
    leftArm: long ? e >= 4 : e >= 3,
    rightArm: long ? e >= 5 : e >= 4,
    leftLeg: long ? e >= 6 : e >= 5,
    rightLeg: long ? e >= 7 : e >= 6,
    eyes: long ? e >= 8 : e >= 6,
  };
  const body = e >= max ? RED : accent;
  return <div style={{ width: 126, height: 126, borderRadius: 18, border: `1px solid ${body}55`, background: "radial-gradient(circle at 50% 38%,rgba(255,179,63,.12),rgba(5,7,12,.94) 67%)", boxShadow: `inset 0 0 28px ${body}10,0 0 18px ${body}18`, display: "grid", placeItems: "center" }}>
    <svg viewBox="0 0 120 120" width="110" height="110" aria-label={`${e} erreurs sur ${max}`}>
      <path d="M18 105H84M29 105V16H78M78 16V29" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {visible.rope ? <path d="M78 29V37" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.head ? <circle cx="78" cy="47" r="10" fill="none" stroke={body} strokeWidth="3.5" /> : null}
      {visible.body ? <path d="M78 57V81" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.leftArm ? <path d="M78 64L64 72" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.rightArm ? <path d="M78 64L92 72" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.leftLeg ? <path d="M78 81L66 96" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.rightLeg ? <path d="M78 81L90 96" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.eyes ? <><path d="M72 44l4 4m0-4l-4 4M81 44l4 4m0-4l-4 4" stroke={RED} strokeWidth="2" strokeLinecap="round" /><path d="M73 52q5-4 10 0" fill="none" stroke={RED} strokeWidth="2" /></> : null}
    </svg>
  </div>;
}

export default function PenduPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizePenduConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<PenduState>(() => restored?.mode === "pendu" ? clonePenduState(restored) : createPenduState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<PenduState[]>([]);
  const [notice, setNotice] = React.useState("");
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `pendu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);

  const buildRecord = React.useCallback((s: PenduState, status: "in_progress" | "finished") => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current,
      kind: "pendu", mode: "pendu", sport: "darts", status, createdAt: s.startedAt, updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "pendu", partsToLose: s.config.rules.partsToLose, seriesWins: s.config.seriesWins },
      summary: { mode: "pendu", finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer: Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, errors: Number(s.errors[id] || 0), eliminated: !!s.eliminated[id], wins: Number(s.legWins[id] || 0) }])) },
      resume: { mode: "pendu", config: s.config, state: clonePenduState(s), updatedAt: Date.now() },
      payload: { kind: "pendu", mode: "pendu", sport: "darts", config: s.config, stateSnapshot: clonePenduState(s), visits: s.visits, visitHistory: s.visits, stats: { mode: "pendu", players: s.statsByPlayer, legWins: s.legWins } },
    };
  }, [profiles]);

  const persist = React.useCallback((s: PenduState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished");
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec);
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord, onFinish]);

  const commit = (next: PenduState, previous = state) => {
    setUndo((u) => [...u.slice(-39), clonePenduState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const ev = lastEvents(next.visits);
    let message = ev.length ? ev.join(" · ") : "";
    if (next.phase === "finished" && next.winnerId) message = `🏆 ${next.players.find((p: any) => p.id === next.winnerId)?.name || "Victoire"} remporte PENDU`;
    else if (next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${next.players.find((p: any) => p.id === next.lastLegWinnerId)?.name || "Un joueur"} remporte la manche`;
    setNotice(message);
    persist(next);
  };

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    commit(playPenduVisit(state, currentThrow.map(uiToGameDart)));
  };
  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    setState(clonePenduState(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière action annulée");
    finishedRef.current = false;
    persist(prev);
    return u.slice(0, -1);
  });
  const applyChallenge = (c: PenduChallenge) => { const next = setPenduChallenge(state, c); setState(next); persist(next); };

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      try { commit(playPenduVisit(state, pickPenduBotDarts(state, config.botLevel))); }
      finally { botBusy.current = false; }
    }, 680);
    return () => window.clearTimeout(t);
  }, [state, activeIsBot, activePlayer?.id]);

  function replay() {
    matchIdRef.current = `pendu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setState(createPenduState(players, config));
  }

  const challenge = state.challenge;
  const editable = state.phase === "caller" && !activeIsBot && !currentThrow.length && config.rules.challengeMode !== "random";
  const legTarget = config.seriesWins * 2 - 1;
  const challengeHelp = challenge.kind === "score"
    ? (config.rules.executionMode === "flex" ? "Atteins ce score ou plus" : "Réalise exactement ce score")
    : (config.rules.executionMode === "flex" ? "Même numéro, zone égale ou supérieure" : "Touche exactement cette zone");
  const previewDarts = currentThrow.map(uiToGameDart);
  const previewScore = scorePenduVisit(previewDarts);
  const previewOk = currentThrow.length ? isPenduChallengeSatisfied(challenge, previewDarts, config) : false;
  const activeErrors = activePlayer ? Number(state.errors[activePlayer.id] || 0) : 0;

  return <div style={{ minHeight: "calc(var(--vh, 1vh) * 100)", paddingBottom: 18, background: "radial-gradient(circle at 50% 0%,rgba(255,179,63,.10),transparent 34%)" }}>
    <PageHeader tickerSrc={tickerPendu} tickerAlt="PENDU" left={<BackDot onClick={() => go?.("pendu_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<InfoDot title="Règles PENDU" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config} />} />} />
    <div style={{ padding: "7px 8px 18px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(ACCENT + "50"), padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>MANCHE {state.legIndex + 1} · BO{legTarget}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Match terminé" : state.phase === "caller" ? `${activePlayer?.name || "—"} est le bourreau` : `${activePlayer?.name || "—"} reproduit le défi`}</div></div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: notice.includes("PENDU") ? "rgba(255,80,90,.14)" : notice.includes("🏆") ? "rgba(114,239,177,.12)" : "rgba(255,179,63,.10)", border: `1px solid ${notice.includes("PENDU") ? "rgba(255,107,87,.34)" : notice.includes("🏆") ? "rgba(114,239,177,.32)" : "rgba(255,179,63,.24)"}`, color: notice.includes("PENDU") ? "#ff9d9d" : notice.includes("🏆") ? "#baffd8" : "#ffd891", fontSize: 10.5, fontWeight: 900 }}>{notice}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const err = Number(state.errors[p.id] || 0);
          const dead = !!state.eliminated[p.id];
          return <div key={p.id} style={{ display: "grid", gap: 5 }}>
            <PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={ACCENT} value={`${err}/${config.rules.partsToLose}`} subValue={dead ? "PENDU — éliminé" : `${"●".repeat(err)}${"○".repeat(Math.max(0, config.rules.partsToLose - err))}`} badge={dead ? "☠ PENDU" : state.callerPlayerIndex === i ? "BOURREAU" : null} wins={state.legWins[p.id] || 0} muted={dead} />
            <Meter value={err} max={config.rules.partsToLose} accent={ACCENT} dangerAt={.84} height={5} />
          </div>;
        })}
      </div>

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle("rgba(255,255,255,.10)"), padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100 }}>{state.phase === "caller" ? "DÉFI DU BOURREAU" : "DÉFI À REPRODUIRE"}</div>
              <div style={{ marginTop: 3, color: "#fff", fontSize: 29, fontWeight: 1100 }}>{penduChallengeLabel(challenge, config.rules.executionMode)}</div>
              <div style={{ marginTop: 4, color: SOFT, fontSize: 9.5 }}>{challengeHelp}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${state.phase === "caller" ? ACCENT + "55" : GREEN + "55"}`, color: state.phase === "caller" ? ACCENT : GREEN, fontSize: 8.8, fontWeight: 1000 }}>{state.phase === "caller" ? "CRÉER LE DÉFI" : `COPIE ${Math.min(state.copyIndex + 1, state.copyQueue.length)}/${state.copyQueue.length}`}</span>
                <span style={{ borderRadius: 999, padding: "5px 8px", border: "1px solid rgba(255,255,255,.10)", color: SOFT, fontSize: 8.8, fontWeight: 900 }}>{config.rules.executionMode === "flex" ? "MODE SOUPLE" : "MODE STRICT"}</span>
              </div>
            </div>
            <PenduFigure errors={activeErrors} max={config.rules.partsToLose} accent={ACCENT} />
          </div>

          {currentThrow.length ? <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 12, border: `1px solid ${previewOk ? GREEN + "66" : RED + "44"}`, background: previewOk ? `${GREEN}0f` : `${RED}08`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div><div style={{ color: previewOk ? GREEN : GOLD, fontSize: 9.5, fontWeight: 1100 }}>{previewOk ? "DÉFI DÉJÀ VALIDÉ" : "VOLÉE EN COURS"}</div><div style={{ marginTop: 2, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{previewScore} points · {currentThrow.length}/3 fléchettes</div></div>
            <div style={{ color: previewOk ? GREEN : SOFT, fontSize: 10, fontWeight: 950 }}>{previewOk ? "✓ Tu peux valider" : challenge.kind === "score" ? `cible ${challenge.target}` : `cherche ${challenge.bed}${challenge.number}`}</div>
          </div> : null}

          {editable ? <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {config.rules.targetFamily === "mixed" ? <button type="button" style={actionStyle(ACCENT)} onClick={() => applyChallenge(challenge.kind === "score" ? { kind: "segment", number: 20, bed: "S" } : { kind: "score", target: 50 })}>{challenge.kind === "score" ? "SEGMENT" : "SCORE"}</button> : null}
            {challenge.kind === "segment" ? <>
              <button type="button" style={actionStyle(ACCENT)} onClick={() => applyChallenge({ ...challenge, number: ((challenge.number + 18) % 20) + 1 })}>−</button>
              {(["S", "D", "T"] as const).map((b) => <button key={b} type="button" style={{ ...actionStyle(ACCENT), background: challenge.bed === b ? `${ACCENT}36` : `${ACCENT}18` }} onClick={() => applyChallenge({ ...challenge, bed: b })}>{b === "S" ? "SIMPLE" : b === "D" ? "DOUBLE" : "TRIPLE"}</button>)}
              <button type="button" style={actionStyle(ACCENT)} onClick={() => applyChallenge({ ...challenge, number: (challenge.number % 20) + 1 })}>+</button>
            </> : <>
              <button type="button" style={actionStyle(ACCENT)} onClick={() => applyChallenge({ ...challenge, target: Math.max(10, challenge.target - 10) })}>−10</button>
              <button type="button" style={actionStyle(ACCENT)} onClick={() => applyChallenge({ ...challenge, target: Math.min(170, challenge.target + 10) })}>+10</button>
            </>}
            <button type="button" style={{ ...actionStyle(GOLD), marginLeft: "auto" }} onClick={() => applyChallenge(randomPenduChallenge(config))}>🎲 ALÉATOIRE</button>
          </div> : null}
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel={state.phase === "caller" ? "TENTER LE DÉFI" : "REPRODUIRE"} accent={ACCENT} /> : <div style={{ ...panelStyle(ACCENT + "33"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: ACCENT }}>{activePlayer?.name}</b> prépare son défi…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="HISTORIQUE DU PENDU" limit={4} />
      </> : <ModeEndPanel title="PENDU" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: "pendu", from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "pendu", focusMatchId: matchIdRef.current })} onConfig={() => go?.("pendu_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.challengesPassed || 0} réussis · {st.errorsTaken || 0} erreurs · best {st.bestVisit || 0}</div>; })}</div>} />}
    </div>
  </div>;
}
