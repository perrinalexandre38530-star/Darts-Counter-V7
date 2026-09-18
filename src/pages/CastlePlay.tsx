// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import tickerCastle from "../assets/tickers/ticker_castle.png";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  assignCastleNumber,
  cloneCastleState,
  createCastleState,
  normalizeCastleConfig,
  pickCastleBotDarts,
  playCastleVisit,
  type CastleState,
} from "../lib/gameEngines/castleEngine";
import {
  NewModeInput,
  PlayerCard,
  ModeEndPanel,
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
const RED = "#ff633f";
const GREEN = "#67e7a9";

function Rules({ config }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: ACCENT }}>CONSTRUIRE</b><br />Ton numéro personnel fait monter ton château : Simple +1, Double +2, Triple +3.</div>
    <div><b style={{ color: RED }}>ATTAQUER</b><br />{config.rules.attacksEnabled ? "Le numéro d’un adversaire lui retire 1 / 2 / 3 briques." : "Les attaques sont désactivées dans cette partie."}</div>
    <div><b style={{ color: GREEN }}>VICTOIRE</b><br />Le premier à atteindre {config.rules.targetBricks} briques gagne la manche. Il faut {config.seriesWins} victoire{config.seriesWins > 1 ? "s" : ""} pour gagner le match.</div>
  </div>;
}

function castleRows(target: number) {
  if (target === 10) return [4, 3, 2, 1];
  if (target === 20) return [6, 5, 4, 3, 2];
  return [5, 4, 3, 2, 1];
}

function CastleMeter({ value, target, accent = ACCENT, compact = false }: any) {
  const bottomRows = castleRows(Number(target));
  const topRows = [...bottomRows].reverse();
  const filledValue = Math.max(0, Math.min(Number(target) || 0, Number(value) || 0));
  return <div aria-label={`${filledValue} briques sur ${target}`} style={{ display: "grid", gap: compact ? 2 : 3, justifyItems: "center" }}>
    {topRows.map((size, topIndex) => {
      const rowInBottomOrder = bottomRows.length - 1 - topIndex;
      const below = bottomRows.slice(0, rowInBottomOrder).reduce((sum, n) => sum + n, 0);
      const filled = Math.max(0, Math.min(size, filledValue - below));
      return <div key={`${size}-${topIndex}`} style={{ display: "grid", gridTemplateColumns: `repeat(${size}, ${compact ? 9 : 15}px)`, gap: compact ? 2 : 3 }}>
        {Array.from({ length: size }, (_, idx) => {
          const on = idx < filled;
          return <span key={idx} style={{
            width: compact ? 9 : 15,
            height: compact ? 6 : 10,
            borderRadius: compact ? 2 : 3,
            boxSizing: "border-box",
            border: `1px solid ${on ? accent : "rgba(255,255,255,.15)"}`,
            background: on ? `linear-gradient(180deg,${accent},${RED})` : "rgba(255,255,255,.045)",
            boxShadow: on && !compact ? `0 0 8px ${accent}55` : "none",
          }} />;
        })}
      </div>;
    })}
  </div>;
}

export default function CastlePlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeCastleConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<CastleState>(() => restored?.mode === "castle" ? cloneCastleState(restored) : createCastleState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<CastleState[]>([]);
  const [notice, setNotice] = React.useState("");
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `castle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));

  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const activePlayer = state.players[state.phase === "assignment" ? state.assignmentIndex : state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const nameById = React.useCallback((id: string | null | undefined) => {
    const p = state.players.find((row: any) => String(row.id) === String(id));
    return p?.name || "Joueur";
  }, [state.players]);

  const buildRecord = React.useCallback((s: CastleState, status: "in_progress" | "finished") => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      resumeId: matchIdRef.current,
      kind: "castle",
      mode: "castle",
      sport: "darts",
      status,
      createdAt: s.startedAt,
      updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined,
      winnerId: s.winnerId,
      players: rows,
      game: { mode: "castle", targetBricks: s.config.rules.targetBricks, seriesWins: s.config.seriesWins },
      summary: {
        mode: "castle",
        finished: status === "finished",
        winnerId: s.winnerId,
        legWins: s.legWins,
        targetBricks: s.config.rules.targetBricks,
        config: s.config,
        perPlayer: Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, bricks: Number(s.bricks[id] || 0), target: Number(s.targets[id] || 0), wins: Number(s.legWins[id] || 0) }])),
      },
      resume: { mode: "castle", config: s.config, state: cloneCastleState(s), updatedAt: Date.now() },
      payload: { kind: "castle", mode: "castle", sport: "darts", config: s.config, stateSnapshot: cloneCastleState(s), visits: s.visits, visitHistory: s.visits, stats: { mode: "castle", players: s.statsByPlayer, legWins: s.legWins } },
    };
  }, [profiles]);

  const persist = React.useCallback((s: CastleState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished");
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec);
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord, onFinish]);

  const commit = (next: CastleState, previous = state, forcedNotice?: string) => {
    setUndo((u) => [...u.slice(-39), cloneCastleState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    let message = forcedNotice || "";
    if (!message && next.phase === "finished" && next.winnerId) message = `🏆 ${nameById(next.winnerId)} remporte le match !`;
    else if (!message && next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🏰 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex + 1} · nouvelle manche`;
    else if (!message) message = lastEvents(next.visits).join(" · ");
    setNotice(message);
    persist(next);
  };

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    if (state.phase === "assignment") {
      const dart = uiToGameDart(currentThrow[0]);
      if (!dart?.number || !["S", "D", "T"].includes(String(dart.bed))) {
        setNotice("🎯 MISS / BULL : aucun numéro attribué. Relance une fléchette sur un secteur 1–20.");
        setCurrentThrow([]);
        setMultiplier(1);
        return;
      }
      const next = assignCastleNumber(state, dart);
      const assigned = next.targets[activePlayer?.id];
      const suffix = next.phase === "playing" ? " · Tous les numéros sont attribués, la bataille commence !" : "";
      commit(next, state, `${activePlayer?.name || "Joueur"} → secteur ${assigned}${suffix}`);
      return;
    }
    commit(playCastleVisit(state, currentThrow.map(uiToGameDart)));
  };

  const doUndo = () => {
    setUndo((u) => {
      if (!u.length) return u;
      const prev = u[u.length - 1];
      setState(cloneCastleState(prev));
      setCurrentThrow([]);
      setMultiplier(1);
      setNotice("Dernière action annulée");
      finishedRef.current = false;
      persist(prev);
      return u.slice(0, -1);
    });
  };

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      try {
        if (state.phase === "assignment") {
          const d = pickCastleBotDarts(state, config.botLevel)[0];
          const next = assignCastleNumber(state, d);
          const assigned = next.targets[activePlayer?.id];
          commit(next, state, `${activePlayer?.name || "BOT"} → secteur ${assigned}${next.phase === "playing" ? " · La bataille commence !" : ""}`);
        } else {
          commit(playCastleVisit(state, pickCastleBotDarts(state, config.botLevel)));
        }
      } finally {
        botBusy.current = false;
      }
    }, 650);
    return () => window.clearTimeout(t);
  }, [state, activeIsBot, activePlayer?.id]);

  function replay() {
    matchIdRef.current = `castle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setState(createCastleState(players, config));
  }

  const legTarget = state.config.seriesWins * 2 - 1;
  const activeBricks = Number(state.bricks[activePlayer?.id] || 0);

  return <div style={{ minHeight: "calc(var(--vh, 1vh) * 100)", paddingBottom: 18, background: "radial-gradient(circle at 50% 0%,rgba(255,179,63,.10),transparent 34%)" }}>
    <PageHeader tickerSrc={tickerCastle} tickerAlt="CASTLE" left={<BackDot onClick={() => go?.("castle_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<InfoDot title="Règles CASTLE" color={ACCENT} glow={`${ACCENT}77`} content={<Rules config={config} />} />} />
    <div style={{ padding: "7px 8px 18px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(ACCENT + "50"), padding: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}>
        <div>
          <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>MANCHE {state.legIndex + 1} · BO{legTarget}</div>
          <div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "assignment" ? "Attribution des numéros — main opposée" : state.phase === "finished" ? "Match terminé" : `${activePlayer?.name || "—"} construit / attaque`}</div>
        </div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(ACCENT, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: notice.includes("🏆") ? "rgba(103,231,169,.12)" : "rgba(255,179,63,.10)", border: `1px solid ${notice.includes("🏆") ? "rgba(103,231,169,.35)" : "rgba(255,179,63,.24)"}`, color: notice.includes("🏆") ? "#b9ffd9" : "#ffd891", fontSize: 10.5, fontWeight: 850 }}>{notice}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const target = state.targets[p.id];
          const bricks = Number(state.bricks[p.id] || 0);
          return <div key={p.id} style={{ display: "grid", gap: 5 }}>
            <PlayerCard profile={prof} active={state.phase !== "finished" && ((state.phase === "assignment" ? state.assignmentIndex : state.activePlayerIndex) === i)} accent={ACCENT} value={`${bricks}/${state.config.rules.targetBricks}`} subValue={target ? `Cible personnelle : ${target}` : "Numéro à attribuer"} badge={target ? `N° ${target}` : state.phase === "assignment" && state.assignmentIndex === i ? "LANCE" : null} wins={state.legWins[p.id] || 0} />
            {target ? <div style={{ ...panelStyle("rgba(255,255,255,.07)"), padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}><CastleMeter value={bricks} target={state.config.rules.targetBricks} compact /></div> : null}
          </div>;
        })}
      </div>

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle("rgba(255,255,255,.10)"), padding: 10 }}>
          {state.phase === "assignment" ? <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
            <ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={ACCENT} />
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100 }}>ATTRIBUTION DU NUMÉRO</div>
              <div style={{ marginTop: 4, color: "#fff", fontSize: 15, fontWeight: 1000 }}>{activePlayer?.name}</div>
              <div style={{ marginTop: 3, color: SOFT, fontSize: 10.5 }}>1 fléchette avec la main opposée. Un secteur 1–20 valide ton numéro. MISS / BULL = relance. En cas de doublon avec un autre joueur, le prochain secteur libre est utilisé.</div>
            </div>
          </div> : <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1100 }}>CHÂTEAU ACTIF · N° {state.targets[activePlayer?.id]}</div>
                <div style={{ marginTop: 3, color: "#fff", fontSize: 17, fontWeight: 1050 }}>{activeBricks}/{state.config.rules.targetBricks} briques</div>
                <div style={{ marginTop: 5, color: SOFT, fontSize: 9.5 }}>Ton numéro construit · {state.config.rules.attacksEnabled ? "les numéros adverses détruisent leurs briques" : "attaque désactivée"}.</div>
              </div>
              <CastleMeter value={activeBricks} target={state.config.rules.targetBricks} />
            </div>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5 }}>
              {state.players.map((p: any) => {
                const own = p.id === activePlayer?.id;
                return <span key={p.id} style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${own ? ACCENT + "88" : RED + "55"}`, background: own ? `${ACCENT}16` : `${RED}0d`, color: own ? ACCENT : "#ffaaa0", fontSize: 9.5, fontWeight: 1000 }}>{own ? "🏰" : "⚔️"} {p.name} · {state.targets[p.id]}</span>;
              })}
            </div>
          </>}
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel={state.phase === "assignment" ? "ATTRIBUER" : "VALIDER LA VOLÉE"} accent={ACCENT} maxDarts={state.phase === "assignment" ? 1 : 3} /> : <div style={{ ...panelStyle(ACCENT + "33"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: ACCENT }}>{activePlayer?.name}</b> prépare sa volée…</div>}
      </> : <ModeEndPanel title="CASTLE" winner={state.winnerId} profiles={profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onConfig={() => go?.("castle_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.builds || 0} construites · {st.damage || 0} dégâts</div>; })}</div>} />}
    </div>
  </div>;
}
