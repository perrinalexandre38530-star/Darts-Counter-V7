// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerCrados from "../assets/tickers/ticker_crados.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { cloneCradosState, createCradosState, normalizeCradosConfig, pickCradosBotDarts, playCradosVisit, type CradosState } from "../lib/gameEngines/cradosEngine";
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

const ACCENT = "#b7f247";
const GREEN = "#70e65e";
const BROWN = "#d99a57";
const RED = "#ff6c67";
const PLAYER_COLORS = ["#67d7ff", "#ff74c8", "#ffc857", "#79ef9d", "#b58cff", "#ff8a65", "#56e0d0", "#f3f56a", "#8fb8ff", "#fa8fb1", "#90e7ff", "#d5a6ff"];
const DARTBOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function Rules({ config }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: ACCENT }}>CONTAMINATION</b><br />Simple = 1 couche, Double = 2, Triple = 3. À {config.rules.layersToOwn} couches, le secteur devient CRADO et t'appartient.</div>
    <div><b style={{ color: BROWN }}>SECTEUR ADVERSE</b><br />{config.rules.stealMode === "flip" ? "Mode VOL : tes touches retirent des couches et peuvent retourner le secteur à ta couleur." : "Mode BLOCAGE : toucher un secteur adverse ajoute autant de crasse à ta jauge."}</div>
    <div><b style={{ color: GREEN }}>DOUCHE</b><br />{config.rules.bullWash ? "BULL retire 1 crasse et DBULL en retire 3." : "Le Bull ne nettoie pas dans cette variante."}</div>
    <div><b style={{ color: RED }}>ÉLIMINATION</b><br />À {config.rules.dirtLimit} crasses, tu es éliminé. Le dernier joueur propre gagne.</div>
  </div>;
}

function CradosBoard({ state, profiles, layersToOwn, bullWash }: any) {
  const size = 310;
  const center = size / 2;
  const radius = 116;
  const profileById = new Map((profiles || []).map((p: any) => [String(p.id), p]));
  return <div style={{ display: "grid", justifyItems: "center" }}>
    <div style={{ position: "relative", width: "min(84vw,310px)", maxWidth: size, aspectRatio: "1 / 1", borderRadius: 999, border: "2px solid rgba(183,242,71,.18)", background: "radial-gradient(circle at 50% 50%,rgba(77,128,30,.18) 0 18%,rgba(13,18,13,.96) 19% 56%,rgba(8,10,9,.98) 57%)", boxShadow: "inset 0 0 50px rgba(0,0,0,.85),0 0 26px rgba(183,242,71,.10)", overflow: "hidden" }}>
      {[.38, .56, .74].map((pct, i) => <div key={pct} style={{ position: "absolute", left: "50%", top: "50%", width: `${pct * 100}%`, height: `${pct * 100}%`, transform: "translate(-50%,-50%)", borderRadius: 999, border: `1px solid ${i === 1 ? "rgba(183,242,71,.14)" : "rgba(255,255,255,.08)"}`, pointerEvents: "none" }} />)}
      {DARTBOARD_ORDER.map((n, idx) => {
        const angle = (idx / 20) * Math.PI * 2 - Math.PI / 2;
        const left = center + Math.cos(angle) * radius;
        const top = center + Math.sin(angle) * radius;
        const sec = state.sectors[n] || {};
        const ownerIdx = sec.ownerId ? state.players.findIndex((p: any) => p.id === sec.ownerId) : -1;
        const claimIdx = !sec.ownerId && sec.claimantId ? state.players.findIndex((p: any) => p.id === sec.claimantId) : -1;
        const color = ownerIdx >= 0 ? PLAYER_COLORS[ownerIdx % PLAYER_COLORS.length] : claimIdx >= 0 ? PLAYER_COLORS[claimIdx % PLAYER_COLORS.length] : "#ffffff";
        const ownerName = sec.ownerId ? playerName(profileById.get(String(sec.ownerId)) || state.players[ownerIdx] || {}) : sec.claimantId ? playerName(profileById.get(String(sec.claimantId)) || state.players[claimIdx] || {}) : "Libre";
        return <div key={n} title={`${n} · ${ownerName} · ${Number(sec.layers || 0)}/${layersToOwn} couches`} style={{ position: "absolute", left: `${(left / size) * 100}%`, top: `${(top / size) * 100}%`, transform: "translate(-50%,-50%)", width: 39, minHeight: 39, borderRadius: 12, display: "grid", placeItems: "center", border: `1px solid ${sec.ownerId || sec.claimantId ? color + "aa" : "rgba(255,255,255,.14)"}`, background: sec.ownerId ? color + "24" : sec.claimantId ? color + "12" : "rgba(255,255,255,.035)", boxShadow: sec.ownerId ? `0 0 14px ${color}33` : "0 4px 10px rgba(0,0,0,.32)", color: sec.ownerId || sec.claimantId ? color : "#e9edf5", fontWeight: 1100, fontSize: 13 }}>
          <span>{n}</span>
          <span style={{ position: "absolute", bottom: 3, display: "flex", gap: 1.5 }}>{Array.from({ length: layersToOwn }, (_, j) => <i key={j} style={{ width: 4, height: 4, borderRadius: 99, background: j < Number(sec.layers || 0) ? color : "rgba(255,255,255,.13)" }} />)}</span>
        </div>;
      })}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 86, height: 86, borderRadius: 999, border: `2px solid ${GREEN}55`, background: "radial-gradient(circle,#387425 0 32%,#173213 33% 63%,#0d160c 64%)", boxShadow: `0 0 22px ${GREEN}24`, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div><div style={{ color: GREEN, fontSize: 10, fontWeight: 1100 }}>BULL</div><div style={{ marginTop: 2, color: bullWash ? "#d9ffc8" : SOFT, fontSize: 8.2, fontWeight: 900 }}>{bullWash ? "DOUCHE" : "NEUTRE"}</div></div>
      </div>
    </div>
  </div>;
}

export default function CradosPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeCradosConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<CradosState>(() => restored?.mode === "crados" ? cloneCradosState(restored) : createCradosState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<CradosState[]>([]);
  const [notice, setNotice] = React.useState("");
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `crados-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);

  const buildRecord = React.useCallback((s: CradosState, status: "in_progress" | "finished") => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current,
      kind: "crados", mode: "crados", sport: "darts", status, createdAt: s.startedAt, updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "crados", dirtLimit: s.config.rules.dirtLimit, seriesWins: s.config.seriesWins },
      summary: { mode: "crados", finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer: Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, dirt: Number(s.dirt[id] || 0), eliminated: !!s.eliminated[id], wins: Number(s.legWins[id] || 0) }])) },
      resume: { mode: "crados", config: s.config, state: cloneCradosState(s), updatedAt: Date.now() },
      payload: { kind: "crados", mode: "crados", sport: "darts", config: s.config, stateSnapshot: cloneCradosState(s), visits: s.visits, visitHistory: s.visits, stats: { mode: "crados", players: s.statsByPlayer, legWins: s.legWins, sectors: s.sectors } },
    };
  }, [profiles]);

  const persist = React.useCallback((s: CradosState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished");
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec);
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord, onFinish]);

  const commit = (next: CradosState, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneCradosState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const ev = lastEvents(next.visits);
    let message = ev.length ? ev.join(" · ") : "";
    if (next.phase === "finished" && next.winnerId) message = `🏆 ${next.players.find((p: any) => p.id === next.winnerId)?.name || "Victoire"} est le dernier encore propre`;
    else if (next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${next.players.find((p: any) => p.id === next.lastLegWinnerId)?.name || "Un joueur"} remporte la manche`;
    setNotice(message);
    persist(next);
  };

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    commit(playCradosVisit(state, currentThrow.map(uiToGameDart)));
  };
  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    setState(cloneCradosState(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière volée annulée");
    finishedRef.current = false;
    persist(prev);
    return u.slice(0, -1);
  });

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      try { commit(playCradosVisit(state, pickCradosBotDarts(state, config.botLevel))); }
      finally { botBusy.current = false; }
    }, 680);
    return () => window.clearTimeout(t);
  }, [state, activeIsBot, activePlayer?.id]);

  function replay() {
    matchIdRef.current = `crados-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setState(createCradosState(players, config));
  }

  const legTarget = config.seriesWins * 2 - 1;
  const preview = React.useMemo(() => {
    if (!currentThrow.length || state.phase === "finished") return null;
    try {
      const next = playCradosVisit(state, currentThrow.map(uiToGameDart));
      const row = next.visits[next.visits.length - 1];
      return { events: Array.isArray(row?.events) ? row.events : [], dirtAfter: activePlayer ? Number(next.dirt?.[activePlayer.id] || 0) : 0 };
    } catch { return null; }
  }, [currentThrow, state, activePlayer?.id]);

  return <div style={{ minHeight: "calc(var(--vh, 1vh) * 100)", paddingBottom: 18, background: "radial-gradient(circle at 50% 0%,rgba(143,255,54,.10),transparent 35%)" }}>
    <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" left={<BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<InfoDot title="Règles CRADOS" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config} />} />} />
    <div style={{ padding: "7px 8px 18px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(ACCENT + "50"), padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>MANCHE {state.legIndex + 1} · BO{legTarget}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Match terminé" : `${activePlayer?.name || "—"} contamine la cible`}</div></div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: notice.includes("CRASSE") || notice.includes("éliminé") ? "rgba(128,90,40,.16)" : notice.includes("🏆") ? "rgba(112,230,94,.12)" : "rgba(183,242,71,.10)", border: `1px solid ${notice.includes("🏆") ? "rgba(112,230,94,.32)" : "rgba(183,242,71,.24)"}`, color: notice.includes("éliminé") ? "#ff9c92" : notice.includes("🏆") ? "#c8ffb8" : "#dcff9d", fontSize: 10.5, fontWeight: 900 }}>{notice}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const d = Number(state.dirt[p.id] || 0);
          const dead = !!state.eliminated[p.id];
          const st = state.statsByPlayer[p.id] || {};
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          return <div key={p.id} style={{ display: "grid", gap: 5 }}>
            <PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={color} value={`${d}/${config.rules.dirtLimit}`} subValue={dead ? "TROP CRADO — éliminé" : `${st.sectorsClaimed || 0} secteurs · ${st.dirtWashed || 0} lavés`} badge={dead ? "☠ OUT" : d >= config.rules.dirtLimit * .7 ? "⚠ SALE" : null} wins={state.legWins[p.id] || 0} muted={dead} />
            <Meter value={d} max={config.rules.dirtLimit} accent={color} dangerAt={.72} height={5} />
          </div>;
        })}
      </div>

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle("rgba(255,255,255,.10)"), padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}><div><div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100 }}>CARTE DE CONTAMINATION</div><div style={{ marginTop: 3, color: SOFT, fontSize: 9.5 }}>{config.rules.stealMode === "flip" ? "VOL : attaque les secteurs adverses" : "BLOCAGE : attention aux secteurs adverses"} · {config.rules.layersToOwn} couches = CRADO</div></div><div style={{ fontSize: 30 }}>🤢</div></div>
          <CradosBoard state={state} profiles={profiles} layersToOwn={config.rules.layersToOwn} bullWash={config.rules.bullWash} />
          <div style={{ marginTop: 9, display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>{state.players.map((p: any, i: number) => <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "4px 7px", border: `1px solid ${PLAYER_COLORS[i % PLAYER_COLORS.length]}55`, color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontSize: 8.5, fontWeight: 950 }}><i style={{ width: 7, height: 7, borderRadius: 99, background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />{p.name}</span>)}</div>
          {config.rules.bullWash ? <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ padding: 7, borderRadius: 10, border: "1px solid rgba(112,230,94,.22)", color: GREEN, fontSize: 9.5, fontWeight: 950, textAlign: "center" }}>BULL = DOUCHE −1</div><div style={{ padding: 7, borderRadius: 10, border: "1px solid rgba(112,230,94,.22)", color: GREEN, fontSize: 9.5, fontWeight: 950, textAlign: "center" }}>DBULL = GROSSE DOUCHE −3</div></div> : null}

          {preview?.events?.length ? <div style={{ marginTop: 9, padding: "8px 10px", borderRadius: 12, border: `1px solid ${preview.dirtAfter >= config.rules.dirtLimit ? RED + "66" : ACCENT + "44"}`, background: preview.dirtAfter >= config.rules.dirtLimit ? `${RED}0f` : `${ACCENT}0a` }}><div style={{ color: preview.dirtAfter >= config.rules.dirtLimit ? RED : ACCENT, fontSize: 9.3, fontWeight: 1100 }}>{preview.dirtAfter >= config.rules.dirtLimit ? "⚠ ÉLIMINATION SI VALIDÉ" : "APERÇU DE LA VOLÉE"}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 9.8, lineHeight: 1.45, fontWeight: 850 }}>{preview.events.join(" · ")}</div></div> : null}
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={ACCENT} /> : <div style={{ ...panelStyle(ACCENT + "33"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: ACCENT }}>{activePlayer?.name}</b> choisit où mettre la crasse…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={ACCENT} title="DERNIÈRES CONTAMINATIONS" limit={4} />
      </> : <ModeEndPanel title="CRADOS" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: "crados", from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "crados", focusMatchId: matchIdRef.current })} onConfig={() => go?.("crados_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.sectorsClaimed || 0} secteurs · {st.sectorsStolen || 0} vols · {st.dirtTaken || 0} crasses · {st.dirtWashed || 0} lavées</div>; })}</div>} />}
    </div>
  </div>;
}
