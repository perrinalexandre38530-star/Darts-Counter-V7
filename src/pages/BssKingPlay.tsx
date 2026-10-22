// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import bssArt from "../assets/bss/bss_original.jpg";
import bssBg from "../assets/bss/bss_bg.webp";
import bssThrone from "../assets/bss/bss_throne.png";
import bssPentagram from "../assets/bss/bss_pentagram.png";
import bssGearSkull from "../assets/bss/bss_gear_skull.png";
import bssSkullCross from "../assets/bss/bss_skull_cross.png";
import tickerBssKing from "../assets/tickers/ticker_bss_king.webp";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { NewModeInput, dartLabel, isBotProfile, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import { cloneBssState, createBssState, normalizeBssConfig, pickBssBotDarts, playBssVisit, type BssState } from "../lib/gameEngines/bssKingEngine";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { PremiumAwenaButton } from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";

const GOLD = "#f0c76a";
const RED = "#d74855";
const BG = "#09080b";
const SOFT = "#a9a1a5";
const COLORS = ["#f0c76a", "#ff667a", "#65d7ff", "#7df2a7", "#bc8cff", "#ff9b54", "#f9ed69", "#6de4da", "#ff7dd1", "#9dc3ff"];
const SHELL_BG = { backgroundImage: `linear-gradient(180deg, rgba(9,8,11,.82), rgba(9,8,11,.96)), url(${bssBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } as const;

function panel(extra: any = {}) {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.09)",
    borderRadius: 18,
    background: "linear-gradient(180deg,rgba(24,20,24,.96),rgba(10,9,12,.985))",
    boxShadow: "0 12px 30px rgba(0,0,0,.34)",
    ...extra,
  };
}
function scoreLabel(d: any) { try { return dartLabel(d); } catch { return "—"; } }
function tagStyle(border: string, bg: string, fg = "#fff") {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: fg, fontSize: 10, fontWeight: 1000, letterSpacing: .4 } as const;
}

function bssObjective(challenge: any, throneFinish: "bull" | "dbull") {
  if (challenge?.kind === "throne") return throneFinish === "dbull"
    ? { goal: "TOUCHE LE DBULL 50", scoring: "En phase TRÔNE, un seul DBULL 50 suffit. Les points ne comptent plus : la touche fait gagner immédiatement la partie." }
    : { goal: "TOUCHE LE BULL", scoring: "En phase TRÔNE, un Bull 25 ou un DBULL 50 suffit. Les points ne comptent plus : la touche fait gagner immédiatement la partie." };
  if (challenge?.kind === "target") return { goal: `VISE UNIQUEMENT LE ${challenge.target}`, scoring: `Seul le secteur ${challenge.target} compte : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS.` };
  if (challenge?.kind === "double") return { goal: "VISE LES DOUBLES", scoring: "Chaque Double touché vaut 3 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "triple") return { goal: "VISE LES TRIPLES", scoring: "Chaque Triple touché vaut 4 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "bull") return { goal: "VISE LE CENTRE", scoring: "Bull 25 = 2 points BSS · DBULL 50 = 5 points BSS. Tout le reste vaut 0." };
  if (challenge?.kind === "low") return { goal: "VISE LES SECTEURS 1 À 10", scoring: "Seuls 1 à 10 comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  if (challenge?.kind === "high") return { goal: "VISE LES SECTEURS 11 À 20", scoring: "Seuls 11 à 20 comptent : Simple = 1 · Double = 2 · Triple = 3 point(s) BSS." };
  return { goal: "FAIS LE PLUS DE POINTS POSSIBLE", scoring: "Tournée libre : Simple = 1 · Double = 2 · Triple = 3 · Bull 25 = 2 · DBULL 50 = 4 points BSS." };
}

function getPointsHelp(challenge: any, throneFinish: "bull" | "dbull") {
  const rows = [
    "Les points BSS = le total cumulé de tes points gagnés pendant les tournées.",
    "Ils servent à mesurer ta domination et à départager le classement si plusieurs joueurs ont le même nombre d’écussons.",
  ];
  if (challenge?.kind === "open") rows.push("Tournée libre : S=1 · D=2 · T=3 · Bull=2 · DBull=4.");
  if (challenge?.kind === "target") rows.push(`Défi secteur ${challenge.target} : seul ce secteur compte · S=1 · D=2 · T=3.`);
  if (challenge?.kind === "double") rows.push("Défi Double : chaque Double touché vaut 3 points BSS.");
  if (challenge?.kind === "triple") rows.push("Défi Triple : chaque Triple touché vaut 4 points BSS.");
  if (challenge?.kind === "bull") rows.push("Défi Bull : Bull 25 = 2 points BSS · DBULL 50 = 5 points BSS.");
  if (challenge?.kind === "low") rows.push("Défi 1 à 10 : seuls les secteurs 1 à 10 comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "high") rows.push("Défi 11 à 20 : seuls les secteurs 11 à 20 comptent · S=1 · D=2 · T=3.");
  if (challenge?.kind === "throne") rows.push(throneFinish === "dbull" ? "Phase TRÔNE : les points ne comptent plus, il faut toucher le DBULL 50." : "Phase TRÔNE : les points ne comptent plus, il faut toucher Bull 25 ou DBULL 50.");
  rows.push("Les écussons, eux, ne se gagnent qu’en terminant seul meilleur score de la tournée.");
  return rows;
}

function IconInfoButton({ icon, label, onClick, active, accent }: any) {
  return <button onClick={onClick} style={{
    borderRadius: 14,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.08)"}`,
    background: active ? `${accent}16` : "rgba(255,255,255,.035)",
    color: "#fff",
    padding: "8px 8px 9px",
    display: "grid",
    gridTemplateColumns: "24px minmax(0,1fr)",
    gap: 8,
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
  }}>
    <div style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: active ? `${accent}22` : "rgba(255,255,255,.06)", border: `1px solid ${active ? accent : "rgba(255,255,255,.10)"}`, fontSize: 13 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.3, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: 8.2, color: SOFT }}>{active ? "Ouvert" : "Ouvrir"}</div>
    </div>
  </button>;
}

export default function BssKingPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab, store = props?.store, onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeBssConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<BssState>(() => restored?.mode === "bss_king" ? cloneBssState(restored) : createBssState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(resumeRecord?.resume?.currentThrow) ? resumeRecord.resume.currentThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [notice, setNotice] = React.useState("");
  const [overlay, setOverlay] = React.useState<null | "rules" | "points" | "ranking" | "journal">(null);
  const [undo, setUndo] = React.useState<BssState[]>([]);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), checkpointRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `bss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const active = state.players[state.activePlayerIndex], activeProfile = active ? profileById.get(String(active.id)) || active : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const activeBotHitRate = Number(activeProfile?.bssHitRate);
  const configLaunchMode = config.quickParty === true || config.partyMode === "quick" ? "quick" : "arcade";
  const backToConfig = React.useCallback(() => go?.("bss_king_config", { launchMode: configLaunchMode }), [go, configLaunchMode]);
  const activeColor = active ? COLORS[Math.max(0, state.players.findIndex((p: any) => p.id === active.id)) % COLORS.length] : GOLD;
  const throneMode = Boolean(active && state.throneReady?.[active.id]);
  const challenge = throneMode ? { kind: "throne", title: "PRENDS LE TRÔNE", subtitle: config.rules.throneFinish === "dbull" ? "DBULL 50 obligatoire" : "BULL 25 ou DBULL 50", icon: "👑" } : state.challenge;
  const objective = React.useMemo(() => bssObjective(challenge, config.rules.throneFinish), [challenge, config.rules.throneFinish]);
  const pointsHelp = React.useMemo(() => getPointsHelp(challenge, config.rules.throneFinish), [challenge, config.rules.throneFinish]);
  const activeBadges = Number(state.badges[active?.id] || 0);
  const badgesRemaining = Math.max(0, Number(config.rules.badgesToThrone || 0) - activeBadges);
  const winReminder = throneMode
    ? "Phase TRÔNE : ici le score ne compte plus, seule la bonne touche donne la victoire."
    : `${badgesRemaining} écusson${badgesRemaining > 1 ? "s" : ""} avant le TRÔNE · meilleur score de la tournée = 1 écusson.`;
  const currentThrowSummary = currentThrow.length ? currentThrow.map((d: any) => scoreLabel(uiToGameDart(d))).join(" · ") : (throneMode ? "👑 Tente le Trône" : "🎯 Jusqu’à 3 fléchettes");
  const throneLabel = config.rules.throneFinish === "dbull" ? "DBULL ONLY" : "BULL / DBULL";
  const modeMood = config.rules.chaosEnabled ? "CHAOS ACTIVÉ" : "MODE CLASSIQUE";
  const ranking = React.useMemo(() => [...state.players].map((p: any, i: number) => ({ p, badges: Number(state.badges[p.id] || 0), influence: Number(state.influence[p.id] || 0), i })).sort((a, b) => b.badges - a.badges || b.influence - a.influence || a.i - b.i), [state.players, state.badges, state.influence]);
  const winner = state.winnerId ? profileById.get(String(state.winnerId)) || state.players.find((p: any) => p.id === state.winnerId) : null;
  const miniEvents = React.useMemo(() => state.events.slice(-3).reverse(), [state.events]);

  const buildRecord = React.useCallback((s: BssState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const rankingRows = [...s.players].map((p: any, i: number) => ({ id: p.id, name: p.name, badges: Number(s.badges[p.id] || 0), influence: Number(s.influence[p.id] || 0), order: i })).sort((a, b) => b.badges - a.badges || b.influence - a.influence || a.order - b.order);
    const quickParty = s.config.quickParty === true || s.config.partyMode === "quick";
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "bss_king", mode: "bss_king", sport: "darts", status, quickParty, partyMode: quickParty ? "quick" : "arcade", createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "bss_king", badgesToThrone: s.config.rules.badgesToThrone, quickParty },
      summary: { mode: "bss_king", quickParty, partyMode: quickParty ? "quick" : "arcade", finished: status === "finished", winnerId: s.winnerId, badges: s.badges, influence: s.influence, ranking: rankingRows, config: s.config, totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs: Math.max(0, (status === "finished" ? (s.finishedAt || Date.now()) : Date.now()) - Number(s.startedAt || Date.now())) },
      resume: { mode: "bss_king", config: s.config, state: cloneBssState(s), currentThrow: draft.slice(0, 3), updatedAt: Date.now() },
      payload: { kind: "bss_king", mode: "bss_king", sport: "darts", quickParty, partyMode: quickParty ? "quick" : "arcade", config: s.config, stateSnapshot: cloneBssState(s), currentThrow: draft.slice(0, 3), visits: s.visits, stats: { mode: "bss_king", players: s.statsByPlayer, badges: s.badges, influence: s.influence } },
    };
  }, [profiles, currentThrow]);

  const save = React.useCallback(async (s: BssState, draft: UIDart[] = currentThrow) => { try { await History.upsert(buildRecord(s, "in_progress", draft)); } catch (e) { console.warn("[BSS KING] checkpoint failed", e); } }, [buildRecord, currentThrow]);
  React.useEffect(() => { if (checkpointRef.current) return; checkpointRef.current = true; if (state.phase !== "finished") void save(state, currentThrow); }, [save, state, currentThrow]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void save(state, currentThrow), 180); return () => window.clearTimeout(t); }, [state.activePlayerIndex, state.round, currentThrow, save]);
  React.useEffect(() => { if (state.phase !== "finished" || finishedRef.current) return; finishedRef.current = true; const rec = buildRecord(state, "finished", []); if (typeof onFinish === "function") onFinish(rec, { navigate: false }); else void History.upsert(rec).catch(() => { }); }, [state, onFinish, buildRecord]);

  const validate = React.useCallback(() => {
    if (!active || activeIsBot || !currentThrow.length) return;
    const darts = currentThrow.map(uiToGameDart);
    setUndo(v => [...v.slice(-9), cloneBssState(state)]);
    const next = playBssVisit(state, darts);
    const last = next.visits[next.visits.length - 1];
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice(last?.events?.[0] || "");
  }, [active, activeIsBot, currentThrow, state]);

  const doUndo = React.useCallback(() => {
    if (currentThrow.length) { setCurrentThrow(v => v.slice(0, -1)); return; }
    setUndo(v => {
      const copy = [...v], prev = copy.pop();
      if (prev) { setState(prev); setNotice("Dernière tournée annulée"); }
      return copy;
    });
  }, [currentThrow]);

  React.useEffect(() => {
    if (state.phase !== "playing" || !activeIsBot || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      const darts = pickBssBotDarts(state, config.botLevel, Number.isFinite(activeBotHitRate) ? activeBotHitRate : undefined);
      setUndo(v => [...v.slice(-9), cloneBssState(state)]);
      const next = playBssVisit(state, darts);
      const last = next.visits[next.visits.length - 1];
      setState(next);
      setNotice(last?.events?.[0] || "");
      botBusy.current = false;
    }, 620);
    return () => { window.clearTimeout(t); botBusy.current = false; };
  }, [state, activeIsBot, config.botLevel, activeBotHitRate]);

  React.useEffect(() => {
    awena?.setRuntimeContext?.({
      route: "bss_king_play",
      modeId: "bss_king",
      screenLabel: "BSS KING · Partie",
      facts: {
        round: state.round,
        challenge: challenge.title,
        objective: objective.goal,
        scoring: objective.scoring,
        badgesToThrone: config.rules.badgesToThrone,
        activeBadges,
        badgesRemaining,
        throneMode,
        activePlayer: active?.name || "",
        bssPoints: "Les points BSS sont les points cumulés marqués pendant les tournées. Ils servent notamment au départage si des joueurs ont autant d’écussons.",
        scoringExamples: pointsHelp.join(" "),
        howToWin: "Gagner seul une tournée = 1 écusson. Atteindre le quota d’écussons débloque le Trône. Réussir le Bull final configuré = victoire immédiate.",
      }
    });
  }, [awena, state.round, challenge.title, objective.goal, objective.scoring, active?.name, config.rules.badgesToThrone, activeBadges, badgesRemaining, throneMode, pointsHelp]);

  if (state.phase === "finished") return <div style={{ height: "100dvh", overflow: "auto", background: `radial-gradient(circle at 50% 12%,rgba(215,72,85,.24),transparent 34%),${BG}`, ...SHELL_BG, color: "#fff" }}>
    <PageHeader tickerSrc={tickerBssKing} tickerAlt="BSS KING" tickerHeight={72} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={backToConfig} color={GOLD} glow={`${GOLD}88`} /></div>} />
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 90px" }}>
      <section style={panel({ padding: 20, textAlign: "center", border: `1px solid ${GOLD}66`, boxShadow: `0 0 34px ${GOLD}20,0 18px 50px rgba(0,0,0,.5)` })}>
        <img src={bssPentagram} alt="" aria-hidden style={{ position: "absolute", right: -18, top: -18, width: 200, opacity: .08 }} />
        <div style={{ fontSize: 13, fontWeight: 1000, letterSpacing: 2, color: GOLD }}>👑 BSS KING 👑</div>
        <div style={{ display: "grid", placeItems: "center", marginTop: 12 }}><ProfileAvatar profile={winner} size={96} showStars={false} ringColor={GOLD} /></div>
        <div style={{ fontSize: 30, fontWeight: 1100, marginTop: 8 }}>{playerName(winner)}</div>
        <div style={{ color: SOFT, marginTop: 4 }}>s'assoit sur le trône et devient le BSS KING.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <span style={tagStyle(`${GOLD}77`, "rgba(240,199,106,.14)", GOLD)}>COURONNEMENT {throneLabel}</span>
          <span style={tagStyle("rgba(255,255,255,.15)", "rgba(255,255,255,.06)")}>TOURNÉES {state.round}</span>
          <span style={tagStyle("rgba(255,255,255,.15)", "rgba(255,255,255,.06)")}>ÉCUSSONS {state.badges?.[state.winnerId] || 0}</span>
          <span style={tagStyle("rgba(255,255,255,.15)", "rgba(255,255,255,.06)")}>PTS BSS {state.influence?.[state.winnerId] || 0}</span>
        </div>
        <img src={bssArt} alt="Il était une fois les BSS" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 15, marginTop: 16, border: "1px solid rgba(255,255,255,.1)" }} />
        <div style={{ marginTop: 12, fontSize: 11.2, color: SOFT, lineHeight: 1.45 }}>Rappel : les écussons font progresser vers le Trône. Les points BSS représentent le total de points cumulés sur les tournées et servent aussi de départage si nécessaire.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 16 }}>
          <button onClick={() => { const fresh = createBssState(players, config); setState(fresh); setUndo([]); setNotice(""); setOverlay(null); finishedRef.current = false; matchIdRef.current = `bss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }} style={{ padding: 13, borderRadius: 999, border: `1px solid ${GOLD}99`, background: `${GOLD}18`, color: "#fff", fontWeight: 1000 }}>↻ REJOUER</button>
          <button onClick={backToConfig} style={{ padding: 13, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 1000 }}>CONFIGURATION</button>
        </div>
        <button onClick={() => go?.("games", { gamesView: "all" })} style={{ width: "100%", marginTop: 8, padding: 13, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: "#ddd", fontWeight: 900 }}>RETOUR AUX JEUX</button>
      </section>
    </div>
  </div>;

  return <div style={{ height: "100dvh", minHeight: 0, overflow: "hidden", background: `radial-gradient(circle at 50% 0%,rgba(215,72,85,.17),transparent 32%),${BG}`, ...SHELL_BG, color: "#fff", display: "flex", flexDirection: "column" }} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerBssKing} tickerAlt="BSS KING" tickerHeight={68} tickerFit="cover" tickerBottomGap={8} left={<div style={{ marginLeft: 7 }}><BackDot onClick={backToConfig} color={activeColor} glow={`${activeColor}88`} /></div>} right={awena?.enabled !== false ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="bss_king_play" mode="bss_king" screenLabel="BSS KING · Partie" accent={activeColor} /></div> : null} />

    <main style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", padding: "0 10px 10px", position: "relative" }}>
      {overlay ? <div className="bss-floating-panel" style={panel({ position: "absolute", zIndex: 30, top: 8, left: 8, width: "min(460px, calc(100% - 16px))", border: `1px solid ${activeColor}4d`, background: "linear-gradient(180deg,rgba(19,15,19,.985),rgba(10,9,12,.995))", boxShadow: "0 20px 60px rgba(0,0,0,.55)" })}>
        <img src={overlay === "points" ? bssGearSkull : overlay === "ranking" ? bssPentagram : bssSkullCross} alt="" aria-hidden style={{ position: "absolute", right: -20, top: -8, width: 130, opacity: .08 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div>
            <div style={{ fontSize: 9.2, letterSpacing: 1.1, color: activeColor, fontWeight: 1000 }}>{overlay === "rules" ? "RÈGLES RAPIDES" : overlay === "points" ? "POINTS BSS" : overlay === "ranking" ? "CLASSEMENT" : "JOURNAL"}</div>
            <div style={{ fontSize: 17, fontWeight: 1100 }}>{overlay === "rules" ? "Comment gagne-t-on ?" : overlay === "points" ? "Comment on marque et à quoi ça sert" : overlay === "ranking" ? "Ordre du classement actuel" : "Les dernières actions"}</div>
          </div>
          <button onClick={() => setOverlay(null)} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1100 }}>×</button>
        </div>
        <div style={{ padding: 14, maxHeight: "min(60dvh, 540px)", overflow: "auto" }}>
          {overlay === "rules" ? <div style={{ display: "grid", gap: 8 }}>
            {[
              { n: 1, title: "Même défi pour tous", body: "Sur une tournée, tous les joueurs jouent exactement le même objectif." },
              { n: 2, title: "1 écusson pour le meilleur", body: "Le meilleur score de la tournée gagne 1 écusson BSS. Une égalité en tête ne donne aucun écusson." },
              { n: 3, title: "Quota atteint = Trône", body: `Dès ${config.rules.badgesToThrone} écusson${config.rules.badgesToThrone > 1 ? "s" : ""}, le joueur passe en phase TRÔNE.` },
              { n: 4, title: "Le Trône donne la victoire", body: config.rules.throneFinish === "dbull" ? "En phase TRÔNE, il faut toucher le DBULL 50 pour gagner immédiatement." : "En phase TRÔNE, il faut toucher Bull 25 ou DBULL 50 pour gagner immédiatement." },
            ].map((it) => <div key={it.n} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "10px 11px" }}>
              <div style={{ fontSize: 10.2, fontWeight: 1000, color: activeColor }}>ÉTAPE {it.n}</div>
              <div style={{ fontSize: 12.6, fontWeight: 1100, marginTop: 3 }}>{it.title}</div>
              <div style={{ fontSize: 10.6, color: SOFT, lineHeight: 1.5, marginTop: 4 }}>{it.body}</div>
            </div>)}
          </div> : null}

          {overlay === "points" ? <div style={{ display: "grid", gap: 10 }}>
            <div style={{ borderRadius: 14, border: `1px solid ${activeColor}35`, background: `${activeColor}0f`, padding: 12 }}>
              <div style={{ fontSize: 11.2, fontWeight: 1000, color: activeColor }}>DÉFINITION</div>
              <div style={{ fontSize: 11.3, lineHeight: 1.5, color: "#fff", marginTop: 5 }}>Les <b>points BSS</b> sont le total cumulé de tous les points marqués sur les tournées. Ils ne remplacent pas les écussons : ils servent surtout à suivre la performance globale et à <b>départager</b> les joueurs ayant le même nombre d’écussons.</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11.2, fontWeight: 1000, color: GOLD }}>BARÈME DU DÉFI ACTUEL</div>
              <div style={{ fontSize: 12.2, fontWeight: 1100, marginTop: 4 }}>{challenge.title}</div>
              <div style={{ display: "grid", gap: 5, marginTop: 7 }}>{pointsHelp.map((line, i) => <div key={`${line}-${i}`} style={{ fontSize: 10.6, color: i < 2 ? "#fff" : SOFT, lineHeight: 1.45 }}>• {line}</div>)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: "9px 10px" }}><div style={{ fontSize: 9, color: SOFT }}>ÉCUSSONS</div><div style={{ fontSize: 11.2, fontWeight: 1000, marginTop: 2 }}>Récompense de tournée</div><div style={{ fontSize: 9.8, color: SOFT, lineHeight: 1.4, marginTop: 3 }}>Le seul meilleur score de la tournée gagne 1 écusson.</div></div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: "9px 10px" }}><div style={{ fontSize: 9, color: SOFT }}>PTS BSS</div><div style={{ fontSize: 11.2, fontWeight: 1000, marginTop: 2 }}>Total cumulé</div><div style={{ fontSize: 9.8, color: SOFT, lineHeight: 1.4, marginTop: 3 }}>Addition de tous les points gagnés sur les défis joués.</div></div>
            </div>
          </div> : null}

          {overlay === "ranking" ? <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, color: SOFT, lineHeight: 1.5 }}>Le classement suit cet ordre : <b style={{ color: "#fff" }}>1) écussons</b> → <b style={{ color: "#fff" }}>2) points BSS</b> → <b style={{ color: "#fff" }}>3) ordre de jeu</b> si besoin.</div>
            {ranking.map(({ p, badges, influence }: any, idx: number) => {
              const prof = profileById.get(String(p.id)) || p;
              const on = p.id === active?.id;
              return <div key={p.id} style={{ display: "grid", gridTemplateColumns: "26px 42px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 14, border: `1px solid ${on ? activeColor : "rgba(255,255,255,.08)"}`, background: on ? `${activeColor}12` : "rgba(255,255,255,.03)" }}>
                <div style={{ textAlign: "center", fontWeight: 1100, color: on ? activeColor : GOLD }}>{idx + 1}</div>
                <ProfileAvatar profile={prof} size={42} showStars={false} ringColor={on ? activeColor : "rgba(255,255,255,.14)"} />
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 11.6, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><div style={{ fontSize: 9.1, color: SOFT, marginTop: 3 }}>👑 {badges} écusson{badges > 1 ? "s" : ""} · ⚡ {influence} pts BSS</div></div>
                {on ? <span style={tagStyle(`${activeColor}66`, `${activeColor}18`, activeColor)}>ACTIF</span> : null}
              </div>;
            })}
          </div> : null}

          {overlay === "journal" ? <div style={{ display: "grid", gap: 6 }}>{state.events.slice().reverse().map((e: string, i: number) => <div key={`${e}-${i}`} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", padding: "9px 10px", fontSize: 10.4, lineHeight: 1.45, color: i === 0 ? "#fff" : SOFT }}>{e}</div>)}</div> : null}
        </div>
      </div> : null}

      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(0,0.96fr) minmax(360px,1.04fr)", gap: 10 }} className="bss-play-grid">
        <div style={{ minHeight: 0, overflow: "auto", display: "grid", alignContent: "start", gap: 9, paddingBottom: 8 }}>
          <section style={panel({ padding: 11, border: `1px solid ${activeColor}52`, background: `linear-gradient(180deg,${activeColor}10,rgba(10,9,12,.985))` })}>
            <img src={bssPentagram} alt="" aria-hidden style={{ position: "absolute", right: -10, top: -8, width: 100, opacity: .09 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
              <span style={tagStyle(`${activeColor}88`, `${activeColor}18`, activeColor)}>{throneMode ? "👑 PHASE TRÔNE" : `🎯 TOURNÉE ${state.round}`}</span>
              <span style={tagStyle("rgba(255,255,255,.16)", "rgba(255,255,255,.05)")}>{modeMood}</span>
              <span style={tagStyle(`${GOLD}55`, "rgba(240,199,106,.10)", GOLD)}>COURONNEMENT {throneLabel}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
              <ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={activeColor} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: activeColor, fontWeight: 1000, letterSpacing: 1 }}>JOUEUR ACTIF</div>
                <div style={{ fontSize: 22, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active?.name}</div>
                <div style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>{notice || "Lis l’objectif, puis joue jusqu’à 3 fléchettes."}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 1100, color: activeColor }}>{activeBadges}</div>
                <div style={{ fontSize: 8, color: SOFT }}>ÉCUSSONS / {config.rules.badgesToThrone}</div>
              </div>
            </div>

            <div style={{ marginTop: 10, padding: "10px 11px", borderRadius: 14, border: `1px solid ${throneMode ? GOLD : activeColor}55`, background: throneMode ? "rgba(240,199,106,.12)" : `${activeColor}10` }}>
              <div style={{ fontSize: 8.7, fontWeight: 1000, letterSpacing: 1.2, color: throneMode ? GOLD : activeColor }}>🎯 OBJECTIF MAINTENANT</div>
              <div style={{ fontSize: 16, fontWeight: 1100, marginTop: 3 }}>{objective.goal}</div>
              <div style={{ fontSize: 10, color: SOFT, lineHeight: 1.45, marginTop: 4 }}>{objective.scoring}</div>
              <div style={{ fontSize: 9.3, fontWeight: 1000, color: throneMode ? GOLD : "#fff", lineHeight: 1.4, marginTop: 6 }}>{winReminder}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
              <IconInfoButton icon="ℹ️" label="Règles" active={overlay === "rules"} onClick={() => setOverlay(v => v === "rules" ? null : "rules")} accent={activeColor} />
              <IconInfoButton icon="⚡" label="Points BSS" active={overlay === "points"} onClick={() => setOverlay(v => v === "points" ? null : "points")} accent={activeColor} />
              <IconInfoButton icon="👑" label="Classement" active={overlay === "ranking"} onClick={() => setOverlay(v => v === "ranking" ? null : "ranking")} accent={activeColor} />
              <IconInfoButton icon="📝" label="Journal" active={overlay === "journal"} onClick={() => setOverlay(v => v === "journal" ? null : "journal")} accent={activeColor} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "8px 7px", textAlign: "center" }}><div style={{ fontSize: 8.1, color: SOFT }}>TOURNÉE</div><div style={{ fontSize: 15, fontWeight: 1100, color: activeColor, marginTop: 2 }}>{state.roundScores[active?.id] || 0}</div></div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "8px 7px", textAlign: "center" }}><div style={{ fontSize: 8.1, color: SOFT }}>PTS BSS</div><div style={{ fontSize: 15, fontWeight: 1100, marginTop: 2 }}>{state.influence[active?.id] || 0}</div></div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "8px 7px", textAlign: "center" }}><div style={{ fontSize: 8.1, color: SOFT }}>DÉFIS</div><div style={{ fontSize: 15, fontWeight: 1100, marginTop: 2 }}>{state.statsByPlayer[active?.id]?.challengeWins || 0}</div></div>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "8px 7px", textAlign: "center" }}><div style={{ fontSize: 8.1, color: SOFT }}>TRÔNE</div><div style={{ fontSize: 15, fontWeight: 1100, marginTop: 2 }}>{state.statsByPlayer[active?.id]?.throneAttempts || 0}</div></div>
            </div>
          </section>

          <section style={panel({ padding: 9 })}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 1000, letterSpacing: 1 }}>ORDRE & CLASSEMENT</div>
              <button onClick={() => setOverlay(v => v === "ranking" ? null : "ranking")} style={{ borderRadius: 999, padding: "5px 9px", border: `1px solid ${activeColor}40`, background: `${activeColor}10`, color: "#fff", fontSize: 9.2, fontWeight: 1000 }}>détails</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(5, Math.max(2, state.players.length))},minmax(0,1fr))`, gap: 6 }}>
              {ranking.map(({ p, badges, influence }: any) => {
                const prof = profileById.get(String(p.id)) || p;
                const on = p.id === active?.id;
                return <div key={p.id} style={{ padding: "8px 6px", borderRadius: 13, border: `1px solid ${on ? activeColor : "rgba(255,255,255,.08)"}`, background: on ? `${activeColor}10` : "rgba(255,255,255,.025)", textAlign: "center", minWidth: 0 }}>
                  <ProfileAvatar profile={prof} size={34} showStars={false} ringColor={on ? activeColor : "rgba(255,255,255,.16)"} />
                  <div style={{ marginTop: 4, fontSize: 9, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1100, color: on ? activeColor : GOLD }}>👑 {badges}</div>
                  <div style={{ fontSize: 7.7, color: SOFT }}>⚡ {influence} pts</div>
                </div>;
              })}
            </div>
            <div style={{ marginTop: 7, fontSize: 9.4, color: SOFT, lineHeight: 1.4 }}>Classement : d’abord les <b style={{ color: "#fff" }}>écussons</b>, puis les <b style={{ color: "#fff" }}>points BSS</b> en départage.</div>
          </section>

          <section style={panel({ padding: 10 })}>
            <img src={bssSkullCross} alt="" aria-hidden style={{ position: "absolute", right: -10, bottom: -10, width: 94, opacity: .06 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 9.8, color: GOLD, fontWeight: 1000, letterSpacing: 1 }}>DERNIÈRES ACTIONS</div>
              <button onClick={() => setOverlay(v => v === "journal" ? null : "journal")} style={{ borderRadius: 999, padding: "5px 9px", border: `1px solid ${activeColor}40`, background: `${activeColor}10`, color: "#fff", fontSize: 9.2, fontWeight: 1000 }}>ouvrir</button>
            </div>
            <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
              {miniEvents.map((e: string, i: number) => <div key={`${e}-${i}`} style={{ fontSize: 9.7, color: i === 0 ? "#fff" : SOFT, lineHeight: 1.4, borderTop: i ? "1px solid rgba(255,255,255,.05)" : "none", paddingTop: i ? 4 : 0 }}>{e}</div>)}
            </div>
          </section>
        </div>

        <div style={{ minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 8 }}>
          <section style={panel({ padding: 11, border: `1px solid ${activeColor}28`, background: "linear-gradient(135deg,rgba(16,14,18,.98),rgba(32,13,18,.98))" })}>
            <img src={bssThrone} alt="" aria-hidden style={{ position: "absolute", right: 8, top: -6, width: 110, opacity: .15 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: activeColor, fontWeight: 1000, letterSpacing: 1 }}>SAISIE EN COURS</div>
                <div style={{ fontSize: 16, fontWeight: 1100, marginTop: 2 }}>{challenge.title}</div>
                <div style={{ fontSize: 9.9, color: SOFT, lineHeight: 1.45, marginTop: 4 }}>{currentThrowSummary}</div>
              </div>
              <span style={tagStyle(`${activeColor}55`, `${activeColor}14`, activeColor)}>{activeIsBot ? "BOT" : "MANUEL"}</span>
            </div>
          </section>

          <div style={{ minHeight: 0, overflow: "hidden", position: "relative" }}>
            {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={() => { setCurrentThrow([]); setMultiplier(1); }} preferredMethod={config.scoreInputMethod} minDartsToValidate={1} validateLabel={throneMode ? "TENTER LE TRÔNE" : "VALIDER LA TOURNÉE"} accent={activeColor} fitMinScale={0.18} centerSlot={<div style={{ textAlign: "center", fontSize: 10, fontWeight: 1000, color: activeColor }}>{currentThrowSummary}</div>} /> : <div style={{ ...panel({ padding: 18, height: "100%", display: "grid", placeItems: "center", textAlign: "center" }) }}><img src={bssGearSkull} alt="" aria-hidden style={{ position: "absolute", left: -25, bottom: -30, width: 150, opacity: .07 }} /><div><ProfileAvatar profile={activeProfile} size={84} showStars={false} ringColor={activeColor} /><div style={{ fontSize: 20, fontWeight: 1100, marginTop: 10 }}>{active?.name}</div><div style={{ color: SOFT, marginTop: 5 }}>Le BOT BSS prépare sa tournée…</div></div></div>}
            <button onClick={doUndo} disabled={!currentThrow.length && !undo.length} style={{ position: "absolute", right: 18, bottom: 18, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.55)", color: "#fff", fontWeight: 900, opacity: (!currentThrow.length && !undo.length) ? .4 : 1 }}>↶ ANNULER</button>
          </div>
        </div>
      </div>
    </main>

    <style>{`
      @media (max-width: 980px){
        .bss-play-grid{grid-template-columns:1fr!important;grid-template-rows:minmax(0,.94fr) minmax(330px,1.06fr)!important}
        .bss-play-grid>div:first-child{max-height:43dvh}
        .bss-floating-panel{left:8px!important;right:8px!important;width:auto!important}
      }
      @media (max-width: 620px){
        .bss-play-grid{grid-template-rows:minmax(0,.78fr) minmax(350px,1.22fr)!important}
        .bss-play-grid>div:first-child{max-height:39dvh}
      }
      @media (max-width: 520px){
        .bss-play-grid section[style]{border-radius:16px}
      }
    `}</style>
  </div>;
}
