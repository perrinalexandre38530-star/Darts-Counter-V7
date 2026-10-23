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
import { cloneBssState, createBssState, evaluateBssVisit, normalizeBssConfig, pickBssBotDarts, playBssVisit, type BssState } from "../lib/gameEngines/bssKingEngine";
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

function BssLineIcon({ name, size = 23 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "rules") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path {...p} d="M8 8h7M8 12h7M8 16h4"/></svg>;
  if (name === "points") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M13 2 5 13h6l-1 9 9-13h-6l0-7Z"/></svg>;
  if (name === "ranking") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z"/><path {...p} d="M6 5H4v2a4 4 0 0 0 4 4M18 5h2v2a4 4 0 0 1-4 4M12 12v3M9 20h6M10 15h4"/></svg>;
  if (name === "journal") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="5" y="3" width="14" height="18" rx="2"/><path {...p} d="M9 3v18M12 8h4M12 12h4M12 16h3"/></svg>;
  if (name === "beer") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 7h10v13H5zM15 10h2.3a2.7 2.7 0 0 1 0 5.4H15M7 4.5c0-1.2 1-2.2 2.2-2.2.8 0 1.5.4 1.9 1 .4-.4.9-.6 1.5-.6A2.4 2.4 0 0 1 15 5.1V7H7V4.5Z"/><path {...p} d="M8 10v7M11 10v7"/></svg>;
  if (name === "chaos") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m12 2 2.1 5.1L20 8l-4.2 4 1 5.8-4.8-2.7-4.8 2.7 1-5.8L4 8l5.9-.9L12 2Z"/><path {...p} d="m9.5 10 5 4M14.5 10l-5 4"/></svg>;
  if (name === "crown") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m4 8 4 3 4-6 4 6 4-3-2 10H6L4 8Z"/><path {...p} d="M7 21h10"/></svg>;
  if (name === "target") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>;
  if (name === "shield") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 19 6v5c0 4.8-2.7 8.2-7 10-4.3-1.8-7-5.2-7-10V6l7-3Z"/><path {...p} d="M9 12h6"/></svg>;
  if (name === "close") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m6 6 12 12M18 6 6 18"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="M12 8v5M12 16h.01"/></svg>;
}
function ToolIconButton({ name, label, onClick, active, accent }: any) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`bss-tool-icon ${active ? "is-active" : ""}`} style={{ ["--tool-accent" as any]: accent }}><BssLineIcon name={name} size={23}/></button>;
}
function ModalTabs({ items, value, onChange, accent }: any) {
  return <div className="bss-modal-tabs">{items.map((it:any)=><button key={it.id} type="button" onClick={()=>onChange(it.id)} className={value===it.id?"is-active":""} style={{ ["--tab-accent" as any]: accent }}>{it.label}</button>)}</div>;
}
function StatusPill({ icon, label, value, color, muted = false }: any) {
  return <div className="bss-status-pill" style={{ ["--pill-color" as any]: color, opacity: muted ? .72 : 1 }}><span><BssLineIcon name={icon} size={17}/></span><div><small>{label}</small><b>{value}</b></div></div>;
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
  const [overlay, setOverlay] = React.useState<null | "rules" | "points" | "ranking" | "journal" | "objective">(null);
  const [overlayTab, setOverlayTab] = React.useState("main");
  const playerStripRef = React.useRef<HTMLDivElement | null>(null);
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
  const currentGameDarts = React.useMemo(() => currentThrow.map(uiToGameDart), [currentThrow]);
  const liveVisitScore = React.useMemo(() => currentGameDarts.reduce((sum: number, d: any) => {
    if (!d || d.bed === "MISS") return sum;
    if (d.bed === "IB") return sum + 50;
    if (d.bed === "OB") return sum + 25;
    const n = Number(d.number || 0);
    return sum + n * (d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1);
  }, 0), [currentGameDarts]);
  const liveBssPoints = React.useMemo(() => evaluateBssVisit(currentGameDarts, challenge as any), [currentGameDarts, challenge]);
  const throneLabel = config.rules.throneFinish === "dbull" ? "DBULL ONLY" : "BULL / DBULL";
  const modeMood = config.rules.chaosEnabled ? "CHAOS ACTIVÉ" : "MODE CLASSIQUE";
  const ranking = React.useMemo(() => [...state.players].map((p: any, i: number) => ({ p, badges: Number(state.badges[p.id] || 0), influence: Number(state.influence[p.id] || 0), i })).sort((a, b) => b.badges - a.badges || b.influence - a.influence || a.i - b.i), [state.players, state.badges, state.influence]);
  const roundHistory = React.useMemo(() => {
    const map = new Map<number, any[]>();
    for (const v of state.visits || []) {
      const r = Number(v?.round || 0);
      if (!r) continue;
      const rows = map.get(r) || [];
      rows.push(v);
      map.set(r, rows);
    }
    return [...map.entries()].sort((a,b)=>b[0]-a[0]).map(([round, visits]) => {
      const scoreById: Record<string, number> = {};
      for (const v of visits) scoreById[String(v.playerId)] = Number(v.score || 0);
      const rows = state.players.map((p:any, i:number)=>({ p, score:Number(scoreById[p.id] || 0), i })).sort((a,b)=>b.score-a.score||a.i-b.i);
      const best = rows[0]?.score || 0;
      const winners = best > 0 ? rows.filter((x:any)=>x.score===best) : [];
      return { round, rows, best, winnerId: winners.length === 1 ? winners[0].p.id : null, tie: winners.length > 1, complete: visits.length >= state.players.length };
    });
  }, [state.visits, state.players]);
  const currentRoundRanking = React.useMemo(() => state.players.map((p:any,i:number)=>({p,score:Number(state.roundScores[p.id]||0),played:(state.roundPlayedIds||[]).includes(p.id),i})).sort((a,b)=>b.score-a.score||a.i-b.i), [state.players,state.roundScores,state.roundPlayedIds]);
  const winner = state.winnerId ? profileById.get(String(state.winnerId)) || state.players.find((p: any) => p.id === state.winnerId) : null;

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

  React.useEffect(() => {
    const el = playerStripRef.current?.querySelector(`[data-bss-player-id="${String(active?.id || "")}"]`) as HTMLElement | null;
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }), 40);
  }, [active?.id, state.round]);
  React.useEffect(() => {
    if (!overlay) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOverlay(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);
  React.useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2700);
    return () => window.clearTimeout(t);
  }, [notice]);

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

  return <div className="bss19-play" style={{ ["--bss-accent" as any]: activeColor }} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerBssKing} tickerAlt="BSS KING" tickerHeight={68} tickerFit="cover" tickerBottomGap={4} left={<div style={{ marginLeft: 7 }}><BackDot onClick={backToConfig} color={activeColor} glow={`${activeColor}88`} /></div>} right={awena?.enabled !== false ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="bss_king_play" mode="bss_king" screenLabel="BSS KING · Partie" accent={activeColor} /></div> : null} />

    <div className="bss-player-ribbon" ref={playerStripRef} aria-label="Résumé des joueurs">
      {state.players.map((p:any, idx:number) => {
        const prof = profileById.get(String(p.id)) || p;
        const on = String(p.id) === String(active?.id);
        const badges = Number(state.badges[p.id] || 0);
        const pts = Number(state.influence[p.id] || 0);
        const throne = Boolean(state.throneReady?.[p.id]);
        const color = COLORS[idx % COLORS.length];
        return <button type="button" key={p.id} data-bss-player-id={String(p.id)} onClick={() => { setOverlayTab("global"); setOverlay("ranking"); }} className={`bss-ribbon-player ${on ? "is-active" : ""} ${throne ? "is-throne" : ""}`} style={{ ["--player-color" as any]: on ? activeColor : color }}>
          <ProfileAvatar profile={prof} size={36} showStars={false} ringColor={on ? activeColor : throne ? GOLD : "rgba(255,255,255,.18)"} />
          <div className="bss-ribbon-copy"><b>{p.name}</b><span><i>◆</i> {badges} <em>éc.</em> · <i>⚡</i> {pts} <em>pts BSS</em></span></div>
          {on ? <strong>À TOI</strong> : null}
        </button>;
      })}
    </div>

    <main className="bss19-main">
      {notice ? <div className="bss-turn-toast"><BssLineIcon name="beer" size={20}/><div><b>TOURNÉE</b><span>{notice}</span></div></div> : null}

      {overlay ? <div className="bss-modal-backdrop" onMouseDown={() => setOverlay(null)} role="presentation">
        <section className="bss-modal" onMouseDown={(e)=>e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="bss-modal-head">
            <div className="bss-modal-head-icon"><BssLineIcon name={overlay === "ranking" ? "ranking" : overlay === "journal" ? "journal" : overlay === "points" ? "points" : overlay === "objective" ? "target" : "rules"} size={25}/></div>
            <div><small>{overlay === "rules" ? "RÈGLES BSS KING" : overlay === "points" ? "POINTS BSS" : overlay === "ranking" ? "CLASSEMENTS" : overlay === "journal" ? "JOURNAL" : "OBJECTIF"}</small><h3>{overlay === "rules" ? "Comment gagner la partie" : overlay === "points" ? "Comprendre les points BSS" : overlay === "ranking" ? "Suivre toute la partie" : overlay === "journal" ? "Historique des actions" : objective.goal}</h3></div>
            <button type="button" className="bss-modal-close" onClick={() => setOverlay(null)} aria-label="Fermer"><BssLineIcon name="close" size={21}/></button>
          </div>

          {overlay === "objective" ? <>
            <ModalTabs accent={activeColor} value={overlayTab} onChange={setOverlayTab} items={[{id:"main",label:"OBJECTIF"},{id:"scale",label:"BARÈME"},{id:"all",label:"TOUS LES DÉFIS"},{id:"win",label:"VICTOIRE"}]}/>
            <div className="bss-modal-body">
              {overlayTab === "main" ? <div className="bss-objective-detail"><span>OBJECTIF ACTUEL · TOURNÉE {state.round}</span><h2>{objective.goal}</h2><p>{objective.scoring}</p><div className="bss-objective-callout">{winReminder}</div></div> : null}
              {overlayTab === "scale" ? <div className="bss-list-cards">{pointsHelp.map((line:string,i:number)=><div key={i}><b>{i===0?"POINTS BSS":i===1?"À QUOI SERVENT-ILS ?":`RÈGLE ${i-1}`}</b><span>{line}</span></div>)}</div> : null}
              {overlayTab === "all" ? <div className="bss-objective-grid">{[
                {kind:"open",title:"TOURNÉE LIBRE"},{kind:"target",target:20,title:"SECTEUR IMPOSÉ"},{kind:"double",title:"DOUBLES"},{kind:"triple",title:"TRIPLES"},{kind:"bull",title:"CENTRE"},{kind:"low",title:"1 À 10"},{kind:"high",title:"11 À 20"},{kind:"throne",title:"TRÔNE"}
              ].map((c:any)=>{const d=bssObjective(c,config.rules.throneFinish);return <div key={c.kind}><small>{c.title}</small><b>{d.goal}</b><p>{d.scoring}</p></div>})}</div> : null}
              {overlayTab === "win" ? <div className="bss-win-steps">{[
                ["1","JOUE LA TOURNÉE","Tous les joueurs tentent le même objectif avec jusqu’à 3 fléchettes."],
                ["2","GAGNE L’ÉCUSSON","Le seul meilleur score de la tournée gagne 1 écusson BSS."],
                ["3","DÉBLOQUE LE TRÔNE",`Atteins ${config.rules.badgesToThrone} écussons pour passer en phase de couronnement.`],
                ["4","DEVIENS KING",config.rules.throneFinish === "dbull" ? "Touche le DBULL 50 pendant ta tentative de Trône." : "Touche Bull 25 ou DBULL 50 pendant ta tentative de Trône."]
              ].map((x:any)=><div key={x[0]}><i>{x[0]}</i><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</div> : null}
            </div>
          </> : null}

          {overlay === "rules" ? <div className="bss-modal-body"><div className="bss-win-steps">{[
            ["1","MÊME DÉFI POUR TOUS","Chaque tournée impose exactement le même objectif à tous les joueurs."],
            ["2","MEILLEUR SCORE = ÉCUSSON","Le seul meilleur score de la tournée gagne 1 écusson. Égalité en tête : aucun écusson."],
            ["3","ÉCUSSONS = ACCÈS AU TRÔNE",`À ${config.rules.badgesToThrone} écussons, la prochaine tentative du joueur devient une tentative de Trône.`],
            ["4","BULL FINAL = VICTOIRE",config.rules.throneFinish === "dbull" ? "DBULL 50 obligatoire pour devenir BSS KING." : "Bull 25 ou DBULL 50 suffit pour devenir BSS KING."]
          ].map((x:any)=><div key={x[0]}><i>{x[0]}</i><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</div></div> : null}

          {overlay === "points" ? <div className="bss-modal-body"><div className="bss-points-hero"><BssLineIcon name="points" size={34}/><div><b>POINTS BSS</b><span>Ils correspondent aux points gagnés en respectant l’objectif de chaque tournée. Ils s’additionnent sur toute la partie et départagent les joueurs à nombre d’écussons égal.</span></div></div><div className="bss-list-cards">{pointsHelp.map((line:string,i:number)=><div key={i}><b>{i===0?"TOTAL BSS":i===1?"DÉPARTAGE":`BARÈME ${i-1}`}</b><span>{line}</span></div>)}</div></div> : null}

          {overlay === "ranking" ? <>
            <ModalTabs accent={activeColor} value={overlayTab} onChange={setOverlayTab} items={[{id:"global",label:"GLOBAL"},{id:"round",label:"TOURNÉE"},{id:"history",label:"HISTORIQUE"},{id:"progress",label:"TRÔNE"}]}/>
            <div className="bss-modal-body">
              {overlayTab === "global" ? <div className="bss-ranking-list">{ranking.map(({p,badges,influence}:any,idx:number)=>{const prof=profileById.get(String(p.id))||p;const on=String(p.id)===String(active?.id);return <div key={p.id} className={on?"is-active":""}><strong>{idx+1}</strong><ProfileAvatar profile={prof} size={40} showStars={false} ringColor={on?activeColor:"rgba(255,255,255,.14)"}/><div><b>{p.name}</b><span>{badges} écusson{badges!==1?"s":""} · {influence} pts BSS</span></div><em>{state.throneReady?.[p.id]?"TRÔNE":""}</em></div>})}</div> : null}
              {overlayTab === "round" ? <div className="bss-ranking-list">{currentRoundRanking.map(({p,score,played}:any,idx:number)=>{const prof=profileById.get(String(p.id))||p;const on=String(p.id)===String(active?.id);return <div key={p.id} className={on?"is-active":""}><strong>{idx+1}</strong><ProfileAvatar profile={prof} size={40} showStars={false} ringColor={on?activeColor:"rgba(255,255,255,.14)"}/><div><b>{p.name}</b><span>{played?"Tournée jouée":"À jouer"}</span></div><em>{score} pts</em></div>})}</div> : null}
              {overlayTab === "history" ? <div className="bss-round-history">{roundHistory.length ? roundHistory.map((r:any)=><div key={r.round}><header><b>TOURNÉE {r.round}</b><span>{r.winnerId ? `${state.players.find((p:any)=>p.id===r.winnerId)?.name || "Joueur"} +1 écusson` : r.tie ? "Égalité · aucun écusson" : r.complete ? "Aucun écusson" : "En cours"}</span></header><section>{r.rows.map((x:any)=><span key={x.p.id} className={r.winnerId===x.p.id?"is-winner":""}>{x.p.name}<b>{x.score}</b></span>)}</section></div>) : <p className="bss-empty">Aucune tournée terminée pour le moment.</p>}</div> : null}
              {overlayTab === "progress" ? <div className="bss-throne-progress">{ranking.map(({p,badges,influence}:any)=>{const prof=profileById.get(String(p.id))||p;const ratio=Math.min(1,badges/Math.max(1,config.rules.badgesToThrone));return <div key={p.id}><ProfileAvatar profile={prof} size={42} showStars={false} ringColor={state.throneReady?.[p.id]?GOLD:"rgba(255,255,255,.16)"}/><div><b>{p.name}</b><span>{badges}/{config.rules.badgesToThrone} écussons · {influence} pts BSS</span><i><u style={{width:`${ratio*100}%`}}/></i></div><strong>{state.throneReady?.[p.id]?"👑":""}</strong></div>})}</div> : null}
            </div>
          </> : null}

          {overlay === "journal" ? <div className="bss-modal-body"><div className="bss-journal">{state.events.slice().reverse().map((e:string,i:number)=><div key={`${e}-${i}`} className={i===0?"is-latest":""}><i/><span>{e}</span></div>)}</div></div> : null}
        </section>
      </div> : null}

      <div className="bss-main-grid">
        <div className="bss-left-column">
          <section className="bss-active-card">
            <div className="bss-active-watermark"><ProfileAvatar profile={activeProfile} size={170} showStars={false} ringColor="transparent" /></div>
            <div className="bss-active-shade" />
            <div className="bss-status-row">
              <StatusPill icon="beer" label="TOURNÉE" value={state.round} color={GOLD}/>
              <StatusPill icon="chaos" label="CHAOS" value={config.rules.chaosEnabled ? "ACTIF" : "OFF"} color={config.rules.chaosEnabled ? "#59e18b" : "#ff5b65"}/>
              <StatusPill icon="crown" label="COURONNEMENT" value={throneLabel} color={GOLD}/>
            </div>
            <div className="bss-active-content">
              <div className="bss-score-side">
                <div className="bss-active-kicker">JOUEUR ACTIF</div>
                <div className="bss-active-name">{active?.name}</div>
                <div className="bss-score-metrics">
                  <div className="bss-live-score"><b>{liveBssPoints}</b><span>SCORE BSS · TOURNÉE</span></div>
                  <div className="bss-shape-metric is-shield"><BssLineIcon name="shield" size={22}/><b>{activeBadges}</b><span>ÉCUSSONS</span></div>
                  <div className="bss-shape-metric is-pack"><BssLineIcon name="beer" size={22}/><b>{Number(state.influence[active?.id] || 0)}</b><span>PTS BSS</span></div>
                </div>
              </div>
              <button type="button" className="bss-objective-card" onClick={() => { setOverlayTab("main"); setOverlay("objective"); }}>
                <div className="bss-objective-icon"><BssLineIcon name="target" size={27}/></div>
                <small>OBJECTIF MAINTENANT</small>
                <b>{objective.goal}</b>
                <span>{challenge?.kind === "target" ? `Secteur ${challenge.target} uniquement` : challenge?.title || "Défi BSS"}</span>
                <em>TOUCHER POUR LES DÉTAILS ›</em>
              </button>
            </div>
          </section>

          <div className="bss-tool-row" aria-label="Informations de partie">
            <ToolIconButton name="rules" label="Règles" active={overlay === "rules"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("rules"); }}/>
            <ToolIconButton name="points" label="Points BSS" active={overlay === "points"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("points"); }}/>
            <ToolIconButton name="ranking" label="Classement" active={overlay === "ranking"} accent={activeColor} onClick={() => { setOverlayTab("global"); setOverlay("ranking"); }}/>
            <ToolIconButton name="journal" label="Journal" active={overlay === "journal"} accent={activeColor} onClick={() => { setOverlayTab("main"); setOverlay("journal"); }}/>
          </div>
        </div>

        <div className="bss-input-column">
          {!activeIsBot ? <NewModeInput
            currentThrow={currentThrow}
            setCurrentThrow={setCurrentThrow}
            multiplier={multiplier}
            setMultiplier={setMultiplier}
            onValidate={validate}
            onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
            preferredMethod={config.scoreInputMethod}
            minDartsToValidate={1}
            validateLabel={throneMode ? "TENTER LE TRÔNE" : "VALIDER LA TOURNÉE"}
            accent={activeColor}
            fitMinScale={0.52}
            centerSlot={<div className="bss-keypad-live"><b>{liveVisitScore}</b><span>SCORE VOLÉE</span><em>+{liveBssPoints} PTS BSS</em></div>}
          /> : <div className="bss-bot-panel"><ProfileAvatar profile={activeProfile} size={88} showStars={false} ringColor={activeColor}/><b>{active?.name}</b><span>Le BOT BSS prépare sa tournée…</span></div>}
        </div>
      </div>
    </main>

    <style>{`
      .bss19-play{position:fixed;inset:0;width:100vw;height:100dvh;max-height:100dvh;overflow:hidden;display:flex;flex-direction:column;background:radial-gradient(circle at 50% 0%,rgba(215,72,85,.17),transparent 32%),${BG};background-image:linear-gradient(180deg,rgba(9,8,11,.82),rgba(9,8,11,.96)),url(${bssBg});background-size:cover;background-position:center;color:#fff;box-sizing:border-box;overscroll-behavior:none}
      .bss19-play *{box-sizing:border-box}
      .bss-player-ribbon{flex:0 0 72px;min-height:72px;display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;padding:5px 9px 6px;scroll-snap-type:x proximity;scrollbar-width:none;background:linear-gradient(90deg,rgba(7,8,12,.97),rgba(18,15,19,.96),rgba(7,8,12,.97));border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.08)}
      .bss-player-ribbon::-webkit-scrollbar{display:none}
      .bss-ribbon-player{scroll-snap-align:center;position:relative;flex:0 0 120px;height:60px;min-width:120px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(22,20,24,.96),rgba(8,8,11,.98));color:#fff;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:7px;padding:5px 7px;text-align:left;cursor:pointer;transition:.18s ease;box-shadow:inset 0 0 0 1px rgba(255,255,255,.015)}
      .bss-ribbon-player.is-active{flex-basis:136px;border-color:var(--player-color);background:linear-gradient(180deg,color-mix(in srgb,var(--player-color) 16%,rgba(20,18,23,.98)),rgba(7,8,11,.98));box-shadow:0 0 18px color-mix(in srgb,var(--player-color) 24%,transparent)}
      .bss-ribbon-player.is-throne:not(.is-active){border-color:rgba(240,199,106,.45)}
      .bss-ribbon-copy{min-width:0}.bss-ribbon-copy b{display:block;font-size:8.7px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bss-ribbon-copy span{display:block;margin-top:4px;color:#a8a1aa;font-size:7.5px;white-space:nowrap}.bss-ribbon-copy i{font-style:normal;color:var(--player-color);font-weight:1100}.bss-ribbon-copy em{font-style:normal;color:#74707a}
      .bss-ribbon-player>strong{position:absolute;right:5px;top:4px;padding:2px 5px;border-radius:999px;background:var(--player-color);color:#05070a;font-size:6.1px;font-weight:1200;letter-spacing:.4px}
      .bss19-main{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;padding:6px 9px 9px}
      .bss-main-grid{height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,.92fr) minmax(380px,1.08fr);gap:8px}
      .bss-left-column{min-height:0;display:flex;flex-direction:column;gap:6px;align-items:stretch;overflow:hidden}.bss-input-column{min-height:0;overflow:hidden}
      .bss-active-card{position:relative;flex:0 0 auto;min-height:238px;overflow:hidden;border-radius:17px;border:1px solid color-mix(in srgb,var(--bss-accent) 48%,rgba(255,255,255,.08));background:linear-gradient(135deg,rgba(19,18,23,.98),rgba(7,8,11,.98));box-shadow:0 12px 34px rgba(0,0,0,.32),0 0 22px color-mix(in srgb,var(--bss-accent) 10%,transparent)}
      .bss-active-watermark{position:absolute;left:-28px;bottom:-40px;opacity:.14;transform:scale(1.35);filter:saturate(.8);pointer-events:none}.bss-active-shade{position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--bss-accent) 8%,transparent),rgba(0,0,0,.05) 42%,rgba(0,0,0,.36));pointer-events:none}
      .bss-status-row{position:relative;z-index:2;height:49px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:7px 7px 0}
      .bss-status-pill{min-width:0;height:38px;border-radius:11px;border:1px solid color-mix(in srgb,var(--pill-color) 42%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--pill-color) 8%,rgba(3,5,8,.62));display:grid;grid-template-columns:27px minmax(0,1fr);align-items:center;padding:4px 6px;gap:5px}.bss-status-pill>span{color:var(--pill-color);display:grid;place-items:center}.bss-status-pill div{min-width:0}.bss-status-pill small{display:block;color:#83808a;font-size:6.1px;font-weight:1000;letter-spacing:.55px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bss-status-pill b{display:block;margin-top:2px;color:var(--pill-color);font-size:8.4px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bss-active-content{position:relative;z-index:2;height:calc(100% - 49px);display:grid;grid-template-columns:minmax(0,1.12fr) minmax(145px,.88fr);gap:7px;padding:5px 7px 8px}.bss-score-side{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.bss-active-kicker{color:var(--bss-accent);font-size:7.4px;font-weight:1100;letter-spacing:1.1px}.bss-active-name{max-width:100%;margin-top:1px;font-size:14px;font-weight:1200;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase}
      .bss-score-metrics{width:100%;display:grid;grid-template-columns:minmax(0,1.25fr) 62px 68px;gap:5px;align-items:center;margin-top:7px}.bss-live-score{height:82px;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 32%,rgba(255,255,255,.07));background:rgba(0,0,0,.28);display:flex;flex-direction:column;align-items:center;justify-content:center}.bss-live-score b{color:var(--bss-accent);font-size:clamp(42px,6vw,62px);line-height:.82;font-weight:1200;text-shadow:0 0 22px color-mix(in srgb,var(--bss-accent) 34%,transparent)}.bss-live-score span{margin-top:8px;color:#8c8993;font-size:6.6px;font-weight:1000;letter-spacing:.6px}
      .bss-shape-metric{height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;background:rgba(8,9,12,.82);border:1px solid rgba(255,255,255,.12);filter:drop-shadow(0 5px 10px rgba(0,0,0,.28))}.bss-shape-metric.is-shield{clip-path:polygon(50% 0,94% 17%,86% 70%,50% 100%,14% 70%,6% 17%);background:linear-gradient(180deg,rgba(240,199,106,.20),rgba(10,9,12,.94));color:${GOLD}}.bss-shape-metric.is-pack{clip-path:polygon(8% 12%,22% 12%,27% 0,73% 0,78% 12%,92% 12%,96% 94%,4% 94%);background:linear-gradient(180deg,color-mix(in srgb,var(--bss-accent) 18%,rgba(10,9,12,.96)),rgba(7,8,11,.96));color:var(--bss-accent)}.bss-shape-metric b{font-size:18px;line-height:1;font-weight:1200}.bss-shape-metric span{margin-top:3px;font-size:5.9px;font-weight:1100;letter-spacing:.4px;color:#fff}
      .bss-objective-card{min-width:0;height:100%;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 42%,rgba(255,255,255,.08));background:linear-gradient(180deg,color-mix(in srgb,var(--bss-accent) 10%,rgba(7,9,13,.94)),rgba(5,7,10,.97));color:#fff;padding:10px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;box-shadow:inset 0 0 30px color-mix(in srgb,var(--bss-accent) 5%,transparent)}.bss-objective-icon{width:38px;height:38px;border-radius:999px;display:grid;place-items:center;color:var(--bss-accent);border:1px solid color-mix(in srgb,var(--bss-accent) 42%,transparent);background:color-mix(in srgb,var(--bss-accent) 9%,rgba(0,0,0,.35))}.bss-objective-card small{margin-top:6px;color:var(--bss-accent);font-size:6.5px;font-weight:1100;letter-spacing:.7px}.bss-objective-card>b{margin-top:4px;font-size:clamp(11px,1.35vw,16px);line-height:1.06;font-weight:1200}.bss-objective-card>span{margin-top:5px;color:#95919a;font-size:7.2px;line-height:1.25}.bss-objective-card>em{margin-top:8px;color:#fff;font-style:normal;font-size:6.3px;font-weight:1000;letter-spacing:.45px;opacity:.7}
      .bss-tool-row{flex:0 0 50px;display:flex;gap:6px;align-items:center;justify-content:center;padding:3px 5px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,15,19,.92),rgba(7,8,11,.96))}.bss-tool-icon{width:44px;height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(21,22,28,.98),rgba(6,8,12,.98));color:#cfd5df;display:grid;place-items:center;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.015)}.bss-tool-icon.is-active,.bss-tool-icon:hover{color:var(--tool-accent);border-color:color-mix(in srgb,var(--tool-accent) 55%,rgba(255,255,255,.08));box-shadow:0 0 15px color-mix(in srgb,var(--tool-accent) 18%,transparent)}
      .bss-input-column>[data-mss-play-input="1"]{height:100%!important}.bss-keypad-live{min-width:76px;text-align:center;display:grid;place-items:center;line-height:1}.bss-keypad-live b{color:#fff;font-size:18px;font-weight:1200}.bss-keypad-live span{margin-top:2px;color:#8e96a7;font-size:6.2px;font-weight:1000;letter-spacing:.5px}.bss-keypad-live em{margin-top:4px;color:var(--bss-accent);font-size:8px;font-style:normal;font-weight:1100}.bss-bot-panel{height:100%;min-height:0;border-radius:17px;border:1px solid color-mix(in srgb,var(--bss-accent) 38%,rgba(255,255,255,.08));background:linear-gradient(180deg,rgba(14,16,22,.97),rgba(5,7,10,.98));display:flex;flex-direction:column;align-items:center;justify-content:center}.bss-bot-panel>b{margin-top:9px;color:var(--bss-accent);font-size:20px}.bss-bot-panel>span{margin-top:5px;color:#969cac;font-size:10px}
      .bss-turn-toast{position:absolute;z-index:40;left:50%;top:8px;transform:translateX(-50%);width:min(520px,calc(100% - 18px));min-height:48px;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 45%,rgba(255,255,255,.08));background:rgba(8,9,12,.94);backdrop-filter:blur(10px);box-shadow:0 16px 42px rgba(0,0,0,.45);display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:8px;padding:7px 11px;color:var(--bss-accent);animation:bssToastIn .2s ease-out}.bss-turn-toast div{min-width:0}.bss-turn-toast b{display:block;font-size:7px;letter-spacing:.8px}.bss-turn-toast span{display:block;margin-top:2px;color:#fff;font-size:9.6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@keyframes bssToastIn{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}
      .bss-modal-backdrop{position:fixed;z-index:10000;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(5px);display:grid;place-items:center;padding:14px}.bss-modal{width:min(760px,100%);max-height:min(82dvh,760px);overflow:hidden;border-radius:19px;border:1px solid color-mix(in srgb,var(--bss-accent) 44%,rgba(255,255,255,.10));background:linear-gradient(180deg,rgba(21,18,22,.995),rgba(7,8,11,.995));box-shadow:0 26px 80px rgba(0,0,0,.65);display:flex;flex-direction:column}.bss-modal-head{flex:0 0 auto;display:grid;grid-template-columns:42px minmax(0,1fr) 38px;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.bss-modal-head-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--bss-accent);background:color-mix(in srgb,var(--bss-accent) 9%,rgba(0,0,0,.4));border:1px solid color-mix(in srgb,var(--bss-accent) 35%,transparent)}.bss-modal-head small{display:block;color:var(--bss-accent);font-size:7.5px;font-weight:1100;letter-spacing:.9px}.bss-modal-head h3{margin:2px 0 0;font-size:15px;line-height:1.1}.bss-modal-close{width:36px;height:36px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;display:grid;place-items:center;cursor:pointer}.bss-modal-tabs{flex:0 0 auto;display:flex;gap:5px;padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto;scrollbar-width:none}.bss-modal-tabs::-webkit-scrollbar{display:none}.bss-modal-tabs button{flex:0 0 auto;min-width:88px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#959ba8;font-size:7.6px;font-weight:1100;letter-spacing:.35px;cursor:pointer}.bss-modal-tabs button.is-active{color:var(--tab-accent);border-color:color-mix(in srgb,var(--tab-accent) 50%,transparent);background:color-mix(in srgb,var(--tab-accent) 9%,rgba(0,0,0,.35))}.bss-modal-body{min-height:0;overflow:auto;padding:11px 12px 14px}
      .bss-objective-detail{text-align:center;padding:9px}.bss-objective-detail>span{color:var(--bss-accent);font-size:8px;font-weight:1100;letter-spacing:.8px}.bss-objective-detail h2{margin:7px 0 0;font-size:clamp(22px,4vw,36px)}.bss-objective-detail p{max-width:620px;margin:8px auto 0;color:#b2adb5;font-size:11px;line-height:1.55}.bss-objective-callout{margin:12px auto 0;max-width:620px;border-radius:13px;border:1px solid rgba(240,199,106,.25);background:rgba(240,199,106,.07);padding:9px 10px;color:${GOLD};font-size:9.8px;font-weight:900}
      .bss-list-cards{display:grid;gap:7px}.bss-list-cards>div{border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.03);padding:9px 10px}.bss-list-cards b{display:block;color:var(--bss-accent);font-size:8px;letter-spacing:.55px}.bss-list-cards span{display:block;margin-top:3px;color:#ddd8df;font-size:10px;line-height:1.45}.bss-objective-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bss-objective-grid>div{border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);padding:9px}.bss-objective-grid small{color:var(--bss-accent);font-size:7px;font-weight:1100}.bss-objective-grid b{display:block;margin-top:3px;font-size:10.5px}.bss-objective-grid p{margin:4px 0 0;color:#96919a;font-size:8.7px;line-height:1.35}
      .bss-win-steps{display:grid;gap:7px}.bss-win-steps>div{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);padding:8px 9px}.bss-win-steps i{width:31px;height:31px;border-radius:999px;display:grid;place-items:center;background:var(--bss-accent);color:#071014;font-style:normal;font-weight:1200}.bss-win-steps b{display:block;font-size:9px}.bss-win-steps span{display:block;margin-top:2px;color:#a29da6;font-size:8.8px;line-height:1.35}.bss-points-hero{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;border-radius:14px;border:1px solid color-mix(in srgb,var(--bss-accent) 38%,rgba(255,255,255,.08));background:color-mix(in srgb,var(--bss-accent) 8%,rgba(0,0,0,.25));padding:10px;margin-bottom:8px;color:var(--bss-accent)}.bss-points-hero b{display:block}.bss-points-hero span{display:block;margin-top:3px;color:#ddd8df;font-size:9.3px;line-height:1.4}
      .bss-ranking-list{display:grid;gap:6px}.bss-ranking-list>div{display:grid;grid-template-columns:28px 42px minmax(0,1fr) auto;gap:8px;align-items:center;border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.025);padding:7px 8px}.bss-ranking-list>div.is-active{border-color:color-mix(in srgb,var(--bss-accent) 55%,transparent);background:color-mix(in srgb,var(--bss-accent) 8%,rgba(0,0,0,.2))}.bss-ranking-list>div>strong{color:${GOLD};text-align:center}.bss-ranking-list b{display:block;font-size:10px}.bss-ranking-list span{display:block;margin-top:2px;color:#908b94;font-size:8px}.bss-ranking-list em{font-style:normal;color:var(--bss-accent);font-size:8.5px;font-weight:1100}.bss-round-history{display:grid;gap:8px}.bss-round-history>div{border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.025);overflow:hidden}.bss-round-history header{display:flex;justify-content:space-between;gap:8px;padding:7px 9px;background:rgba(255,255,255,.035)}.bss-round-history header b{color:var(--bss-accent);font-size:8px}.bss-round-history header span{color:#aaa4ad;font-size:7.5px}.bss-round-history section{display:flex;gap:4px;overflow-x:auto;padding:7px}.bss-round-history section span{flex:0 0 auto;min-width:90px;border-radius:9px;border:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.18);padding:5px 7px;color:#aaa4ad;font-size:7.5px}.bss-round-history section span b{float:right;color:#fff;font-size:9px}.bss-round-history section span.is-winner{border-color:rgba(240,199,106,.38);color:${GOLD}}.bss-empty{text-align:center;color:#8d8891;font-size:9px;padding:24px}.bss-throne-progress{display:grid;gap:7px}.bss-throne-progress>div{display:grid;grid-template-columns:44px minmax(0,1fr) 30px;gap:9px;align-items:center;border-radius:12px;padding:7px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.bss-throne-progress b{font-size:9.5px}.bss-throne-progress span{display:block;margin-top:2px;color:#908b95;font-size:7.6px}.bss-throne-progress i{display:block;margin-top:5px;height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.bss-throne-progress u{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--bss-accent),${GOLD})}.bss-throne-progress strong{text-align:center;font-size:17px}.bss-journal{display:grid;gap:0}.bss-journal>div{display:grid;grid-template-columns:8px minmax(0,1fr);gap:8px;padding:8px 2px;border-top:1px solid rgba(255,255,255,.055)}.bss-journal>div:first-child{border-top:0}.bss-journal i{width:7px;height:7px;border-radius:99px;background:rgba(255,255,255,.18);margin-top:3px}.bss-journal .is-latest i{background:var(--bss-accent);box-shadow:0 0 10px color-mix(in srgb,var(--bss-accent) 70%,transparent)}.bss-journal span{font-size:9px;line-height:1.4;color:#aaa5ad}.bss-journal .is-latest span{color:#fff}
      @media (max-width:980px){.bss-player-ribbon{flex-basis:68px;min-height:68px}.bss19-main{padding:4px 6px 6px}.bss-main-grid{grid-template-columns:1fr;grid-template-rows:auto 50px minmax(0,1fr);gap:5px}.bss-left-column{display:contents}.bss-active-card{grid-row:1;min-height:168px}.bss-tool-row{grid-row:2;height:50px}.bss-input-column{grid-row:3;min-height:0}.bss-active-content{grid-template-columns:minmax(0,1.16fr) minmax(138px,.84fr)}.bss-status-row{height:43px;padding-top:5px}.bss-status-pill{height:34px}.bss-active-content{height:calc(100% - 43px)}.bss-score-metrics{grid-template-columns:minmax(0,1.2fr) 56px 62px}.bss-live-score{height:69px}.bss-shape-metric{height:64px}.bss-live-score b{font-size:43px}.bss-ribbon-player{flex-basis:112px;min-width:112px}.bss-ribbon-player.is-active{flex-basis:128px}}
      @media (max-width:620px){.bss-player-ribbon{padding-left:6px;padding-right:6px}.bss-ribbon-player{flex-basis:104px;min-width:104px;height:56px}.bss-ribbon-player.is-active{flex-basis:122px}.bss-ribbon-copy span em{display:none}.bss-active-card{min-height:172px}.bss-status-pill{grid-template-columns:22px minmax(0,1fr);padding:3px 4px}.bss-status-pill small{font-size:5.5px}.bss-status-pill b{font-size:7.4px}.bss-active-content{grid-template-columns:minmax(0,1.08fr) minmax(128px,.92fr);gap:5px;padding:4px 5px 6px}.bss-active-name{font-size:12px}.bss-score-metrics{grid-template-columns:minmax(0,1fr) 50px 54px;gap:3px;margin-top:4px}.bss-live-score{height:65px}.bss-live-score b{font-size:38px}.bss-shape-metric{height:60px}.bss-shape-metric b{font-size:15px}.bss-objective-card{padding:7px 5px}.bss-objective-icon{width:31px;height:31px}.bss-objective-card>b{font-size:10px}.bss-objective-card>span{font-size:6.6px}.bss-tool-row{justify-content:space-around}.bss-tool-icon{width:42px;height:42px}.bss-modal-backdrop{padding:7px}.bss-modal{max-height:88dvh}.bss-objective-grid{grid-template-columns:1fr}.bss-modal-tabs button{min-width:82px}}
      @media (max-height:720px) and (orientation:landscape){.bss-player-ribbon{flex:0 0 58px;min-height:58px}.bss-ribbon-player{height:50px}.bss-main-grid{grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);grid-template-rows:1fr}.bss-left-column{display:flex}.bss-active-card{min-height:0;height:min(278px,calc(100dvh - 140px))}.bss-tool-row{flex:0 0 46px;height:46px}.bss-tool-icon{width:40px;height:40px}}
    `}</style>
  </div>;
}
