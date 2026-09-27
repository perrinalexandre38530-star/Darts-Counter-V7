// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneWave61State,
  createWave61State,
  getWave61Target,
  normalizeWave61Config,
  pickWave61BotDarts,
  playWave61Visit,
  wave61DartLabel,
  wave61PrimaryMetric,
  type Wave61State,
} from "../lib/gameEngines/wave61Engine";
import {
  Meter,
  ModeEndPanel,
  NewModeInput,
  PlayerCard,
  SOFT,
  VisitTimeline,
  actionStyle,
  isBotProfile,
  panelStyle,
  playerName,
  resolveModeProfiles,
  uiToGameDart,
} from "./newModes/newModePlayShared";

function familyRules(spec: any, preset: any) {
  return <div style={{ display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: preset.accent }}>CONCEPT</b><br />{spec.infoBody}</div>
    <div><b style={{ color: preset.accent }}>MOTEUR V1</b><br />Famille {preset.label}. Les impacts S/D/T/BULL/MISS sont déjà traités individuellement, avec cible dynamique, progression, historique, bots et Undo.</div>
    <div><b style={{ color: "#ffcc80" }}>PHASE DE DÉVELOPPEMENT</b><br />Ce socle est volontairement mutualisé. Les règles signature, événements, animations, sons et statistiques dédiées seront enrichis lors de la passe finale de ce mode.</div>
  </div>;
}

function Align4Board({ state, accent }: any) {
  const board = state?.special?.board;
  if (!Array.isArray(board)) return null;
  const tokenColors: Record<string, string> = {};
  let idx = 0;
  for (const row of board) for (const token of row) if (token && !tokenColors[token]) tokenColors[token] = idx++ % 2 ? "#ff5e78" : accent;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>ALIGN 4 · GRILLE 7 × 6</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, maxWidth: 430, margin: "0 auto" }}>
      {board.flatMap((row: any[], r: number) => row.map((token: string | null, c: number) => <div key={`${r}-${c}`} style={{ aspectRatio: "1", borderRadius: 999, border: "1px solid rgba(255,255,255,.13)", background: token ? tokenColors[token] || accent : "rgba(255,255,255,.045)", boxShadow: token ? `0 0 12px ${tokenColors[token] || accent}66` : "inset 0 2px 8px rgba(0,0,0,.4)" }} />))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 5, color: SOFT, fontSize: 8.5, textAlign: "center" }}>{[1,2,3,4,5,6,7].map((n)=><span key={n}>COL {n}</span>)}</div>
  </div>;
}

function MineBoard({ state, accent }: any) {
  const revealed = new Set((state?.special?.revealed || []).map(Number));
  const mines = new Set((state?.special?.mines || []).map(Number));
  const finished = state?.phase === "finished";
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>DÉMINEUR · 20 SECTEURS</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const shown = revealed.has(n) || finished;
        const mine = mines.has(n);
        return <div key={n} style={{ minHeight: 40, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${shown ? (mine ? "rgba(255,84,84,.55)" : accent + "55") : "rgba(255,255,255,.10)"}`, background: shown ? (mine ? "rgba(255,70,70,.12)" : `${accent}0d`) : "rgba(255,255,255,.035)", color: shown ? (mine ? "#ff8e8e" : "#fff") : "#7d8495", fontWeight: 1000 }}>{shown ? (mine ? "💣" : n) : "?"}</div>;
      })}
    </div>
  </div>;
}

export default function Wave61Play(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const modeId = String(props?.params?.gameId || props?.gameId || resumeRecord?.modeId || resumeRecord?.game?.modeId || "");
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const preset = getWave61Preset(spec.id);
  const rawConfig = props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {};
  const config = React.useMemo(() => normalizeWave61Config(spec.id, rawConfig), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i+1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null;
  const [state, setState] = React.useState<Wave61State>(() => restored?.mode === "wave61" && restored?.modeId === spec.id ? cloneWave61State(restored) : createWave61State(players, spec.id, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<Wave61State[]>([]);
  const [notice, setNotice] = React.useState("");
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const target = getWave61Target(state);
  const accent = preset.accent;

  const buildRecord = React.useCallback((s: Wave61State, status: "in_progress" | "finished") => ({
    id: matchIdRef.current,
    matchId: matchIdRef.current,
    resumeId: matchIdRef.current,
    kind: spec.id,
    mode: spec.id,
    modeId: spec.id,
    sport: "darts",
    status,
    createdAt: s.startedAt,
    updatedAt: Date.now(),
    finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined,
    winnerId: s.winnerId,
    players: profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null })),
    game: { mode: spec.id, modeId: spec.id, engineFamily: s.family, engineVersion: 1 },
    summary: { mode: spec.id, modeId: spec.id, family: s.family, winnerId: s.winnerId, winnerTeamId: s.winnerTeamId, finalScores: s.scores, finalProgress: s.progress, health: s.health, statsByPlayer: s.statsByPlayer, config: s.config },
    resume: { mode: "wave61", modeId: spec.id, config: s.config, state: cloneWave61State(s), updatedAt: Date.now() },
    payload: { kind: spec.id, mode: spec.id, modeId: spec.id, sport: "darts", config: s.config, stateSnapshot: cloneWave61State(s), visits: s.visits, stats: { players: s.statsByPlayer } },
  }), [profiles, spec.id]);

  const persist = React.useCallback((s: Wave61State) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      void History.upsert(buildRecord(s, "finished")).catch(() => {});
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord]);

  const commit = React.useCallback((next: Wave61State, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneWave61State(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const last = next.visits[next.visits.length - 1];
    setNotice(next.phase === "finished" ? `🏆 ${next.players.find((p) => p.id === next.winnerId)?.name || "Victoire"} remporte ${spec.label}` : (last?.events || []).join(" · "));
    persist(next);
  }, [state, spec.label, persist]);

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    commit(playWave61Visit(state, currentThrow.map(uiToGameDart)));
  };

  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    finishedRef.current = false;
    setState(cloneWave61State(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière volée annulée");
    persist(prev);
    return u.slice(0, -1);
  });

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const timer = window.setTimeout(() => {
      try { commit(playWave61Visit(state, pickWave61BotDarts(state, config.botLevel))); }
      finally { botBusy.current = false; }
    }, 620);
    return () => window.clearTimeout(timer);
  }, [state, activeIsBot, activePlayer?.id]);

  React.useEffect(() => { if (state.phase === "playing") persist(state); }, []);

  function replay() {
    matchIdRef.current = `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setMultiplier(1);
    setState(createWave61State(players, spec.id, config));
  }

  const roundLabel = Math.min(config.rounds, state.roundIndex + 1);
  const teamMode = config.participantMode === "teams";

  return <div style={{ minHeight: "calc(var(--vh,1vh) * 100)", paddingBottom: 18, background: `radial-gradient(circle at 50% 0%,${accent}13,transparent 35%)` }}>
    <PageHeader title={spec.label} subtitle={`${preset.label} · moteur V1`} left={<BackDot onClick={() => go?.("wave61_config", { gameId: spec.id })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — règles`} color={accent} glow={`${accent}77`} content={familyRules(spec, preset)} />} />
    <div style={{ padding: "7px 8px 18px", maxWidth: 1040, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(accent + "45"), padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>ROUND {roundLabel}/{config.rounds} · {preset.label.toUpperCase()}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Partie terminée" : `${activePlayer?.name || "—"} joue`}</div></div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(accent, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: `${accent}0d`, border: `1px solid ${accent}2f`, color: "#e9ecf5", fontSize: 10.5, fontWeight: 850 }}>{notice}</div> : null}

      {teamMode ? <div style={{ ...panelStyle("rgba(255,255,255,.08)"), padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(state.teamScores || {}).map(([team, score]: any) => <span key={team} style={{ borderRadius: 999, padding: "5px 9px", border: `1px solid ${team === "A" ? accent + "55" : "#ff657d55"}`, color: team === "A" ? accent : "#ff8fa0", fontSize: 10, fontWeight: 1000 }}>TEAM {team} · {Math.round(Number(score || 0))}</span>)}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const metric = wave61PrimaryMetric(state, p.id);
          const eliminated = !!state.eliminated[p.id];
          const pct = preset.defaultGoal > 0 ? Math.min(100, (Number(state.progress[p.id] || state.scores[p.id] || 0) / Math.max(1, config.goal)) * 100) : 0;
          return <div key={p.id} style={{ display: "grid", gap: 4 }}><PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={accent} value={metric.value} subValue={`${metric.label} · ${metric.sub}${teamMode ? ` · Team ${config.teamByPlayer?.[p.id] || "?"}` : ""}`} badge={eliminated ? "OUT" : null} muted={eliminated} />{preset.defaultGoal > 0 && state.family !== "survival" && state.family !== "combat" ? <Meter value={state.progress[p.id] || state.scores[p.id] || 0} max={config.goal} accent={accent} /> : null}</div>;
        })}
      </div>

      {spec.id === "align_4" ? <Align4Board state={state} accent={accent} /> : null}
      {spec.id === "demineur" ? <MineBoard state={state} accent={accent} /> : null}

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle(accent + "3d"), padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
          <div><div style={{ color: accent, fontSize: 9.5, fontWeight: 1100, letterSpacing: .8 }}>{target ? "OBJECTIF ACTIF" : "OBJECTIF LIBRE"}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 18, fontWeight: 1100 }}>{target?.label || (state.family === "score" ? "Marque le maximum" : spec.id === "align_4" ? "Choisis ta colonne avec le secteur" : "Fais progresser ta mission")}</div><div style={{ marginTop: 4, color: SOFT, fontSize: 9.8, lineHeight: 1.4 }}>{spec.infoBody}</div></div>
          <div style={{ minWidth: 76, minHeight: 76, borderRadius: 18, border: `1px solid ${accent}66`, background: `${accent}0d`, display: "grid", placeItems: "center", textAlign: "center", color: accent, fontWeight: 1100, fontSize: 11 }}>{state.family === "survival" || state.family === "combat" ? "⚔️\nSURVIE" : state.family === "ascent" ? "⛰️\nASCENSION" : state.family === "conquest" ? "🗺️\nCONQUÊTE" : state.family === "deduction" ? "🧩\nINDICES" : state.family === "rhythm" ? "⚡\nCOMBO" : "🎯\nACTION"}</div>
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={accent} /> : <div style={{ ...panelStyle(accent + "35"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: accent }}>{activePlayer?.name}</b> calcule son prochain lancer…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={accent} title="ACTIONS DU MOTEUR" limit={5} />
      </> : <ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{ [state.winnerId || ""]: 1 }} accent={accent} onReplay={replay} onConfig={() => go?.("wave61_config", { gameId: spec.id })} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ color: SOFT, fontSize: 10.5, lineHeight: 1.5 }}>{state.winnerTeamId ? `Team ${state.winnerTeamId} victorieuse · ` : ""}{preset.label} · {state.visits.length} volées enregistrées</div>} />}
    </div>
  </div>;
}
