// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerPtitHun from "../assets/tickers/ticker_ptit_1.png";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import {
  clonePtitHunState,
  createPtitHunState,
  normalizePtitHunConfig,
  pickPtitHunBotDarts,
  playPtitHunVisit,
  ptitHunDartLabel,
  rankPtitHunPlayers,
  type PtitHunState,
} from "../lib/gameEngines/ptitHunEngine";
import { NewModeInput, isBotProfile, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";

const ACCENT = "#f2c84b";
const ACCENT2 = "#8a5a2b";
const GREEN = "#78f3d4";
const RED = "#ff6f78";
const BLUE = "#88c8ff";

function coachText(state: PtitHunState, activePlayer: any) {
  if (!activePlayer) return "";
  const id = String(activePlayer.id);
  const rules = state.config.rules;
  const st: any = state.statsByPlayer?.[id] || {};
  const score = Number(state.scores?.[id] || 0);
  const shield = Boolean(state.shieldActive?.[id]);
  const clean = Number(state.cleanStreak?.[id] || 0);
  const nextZero = rules.zeroAbsoluteEnabled && rules.dbullEnabled && Number(st.dbulls || 0) === rules.dbullsForZero - 1 && !state.zeroAbsoluteUsed?.[id];
  if (rules.jackpotEnabled && state.jackpotTargets?.length) return `Jackpot actif : ${state.jackpotTargets.map((t: any) => t.label).join(" / ")}. Une seule touche et toute ta volée vaut 0.`;
  if (nextZero) return `Encore un DBULL : le ${rules.dbullsForZero}e remet ton score à 0. Le centre peut renverser toute la partie.`;
  if (shield) return `Bouclier actif : tes prochaines pénalités sont divisées par ${rules.shieldDivider}. Continue de privilégier les petits simples.`;
  if (rules.shieldEnabled && clean === rules.cleanVisitsForShield - 1) return `Encore une volée 100 % petits simples et le Bouclier du Hun devient permanent.`;
  if (score >= 120 && rules.dbullEnabled) return `Ton score monte : le DBULL ÷${rules.dbullDivider} devient très rentable, mais le Bull25 juste autour ferait ×${rules.bull25Factor}.`;
  return `Le petit simple du 1 reste la zone reine : +1 seulement. ${rules.tripleNulEnabled ? "Trois petits 1 = TRIPLE NUL, donc volée à 0." : "Reste au plus près du centre des secteurs."}`;
}

const PTIT1_BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function ptit1Polar(cx: number, cy: number, r: number, deg: number) { const rad = ((deg - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function ptit1RingPath(cx: number, cy: number, ro: number, ri: number, start: number, end: number) { const a = ptit1Polar(cx, cy, ro, start), b = ptit1Polar(cx, cy, ro, end), c = ptit1Polar(cx, cy, ri, end), d = ptit1Polar(cx, cy, ri, start); return `M ${a.x} ${a.y} A ${ro} ${ro} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${ri} ${ri} 0 0 0 ${d.x} ${d.y} Z`; }
function JackpotMiniTarget({ targets }: any) {
  const rows = Array.isArray(targets) ? targets : [];
  return <div aria-label={`Jackpot ${rows.map((t: any) => t.label).join(" ")}`} style={{ width: 88, height: 88, flex: "0 0 auto", borderRadius: 999, padding: 3, background: "radial-gradient(circle,rgba(255,221,80,.14),rgba(0,0,0,.48))", border: "1px solid rgba(255,216,77,.28)", boxShadow: "0 0 22px rgba(255,203,50,.12)" }}>
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="47" fill="#11151c" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="5" />
      <circle cx="50" cy="50" r="7" fill="#214d35" stroke="#8fffb7" strokeWidth="2" />
      {PTIT1_BOARD_ORDER.map((n, idx) => { const a = idx * 18 - 9; const pt = ptit1Polar(50,50,45,a+9); return <g key={n}><line x1="50" y1="50" x2={ptit1Polar(50,50,47,a).x} y2={ptit1Polar(50,50,47,a).y} stroke="rgba(255,255,255,.055)" strokeWidth=".7" /><text x={pt.x} y={pt.y+1.6} textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,.75)" fontWeight="800">{n}</text></g>; })}
      {rows.map((t: any, i: number) => { const idx = Math.max(0, PTIT1_BOARD_ORDER.indexOf(Number(t.number))); const start = idx * 18 - 9, end = start + 18; const d = t.bed === "D" ? ptit1RingPath(50,50,48,40,start,end) : ptit1RingPath(50,50,33,27,start,end); return <path key={`${t.label}-${i}`} d={d} fill={i ? "rgba(76,180,255,.82)" : "rgba(255,216,77,.92)"} stroke="#fff3a7" strokeWidth="1.1" style={{ filter: "drop-shadow(0 0 4px rgba(255,216,77,.8))" }} />; })}
    </svg>
  </div>;
}

function PtitHunRiskBoard({ state, playerId, currentThrow, preview }: any) {
  const rules = state.config.rules;
  const st = state.statsByPlayer?.[playerId] || {};
  const score = Number(state.scores?.[playerId] || 0);
  const shield = Boolean(state.shieldActive?.[playerId]);
  const clean = Number(state.cleanStreak?.[playerId] || 0);
  const dbullGoal = Math.max(1, Number(rules.dbullsForZero || 3));
  const dbulls = Math.min(dbullGoal, Number(st.dbulls || 0));
  const missLabel = rules.missMode === "add" ? `+${rules.missValue}` : `TOTAL ×${rules.missValue}`;
  const cards = [
    ["PETIT", "+ valeur", GREEN], ["GROS", `+ valeur ×${rules.outerSingleFactor}`, "#ffb86b"], ["DOUBLE", `TOTAL ×${rules.doubleFactor}`, RED],
    ["TRIPLE", `TOTAL ×${rules.tripleFactor}`, RED], ["BULL25", `TOTAL ×${rules.bull25Factor}`, "#ff7d8d"],
    ["DBULL", rules.dbullEnabled ? `TOTAL ÷${rules.dbullDivider}` : "+50", BLUE], ["MISS", missLabel, "#ff5266"],
  ];
  const jackpotText = rules.jackpotEnabled && state.jackpotTargets?.length ? state.jackpotTargets.map((t: any) => t.label).join(" · ") : "OFF";
  return <section style={{ borderRadius: 18, padding: 10, border: `1px solid ${ACCENT}44`, background: "radial-gradient(circle at 50% 16%,rgba(242,200,75,.09),transparent 34%),linear-gradient(180deg,rgba(15,17,23,.97),rgba(7,8,12,.98))", boxShadow: "0 12px 34px rgba(0,0,0,.35)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
      <div><div style={{ color: ACCENT, fontSize: 9, letterSpacing: 1.1, fontWeight: 1000 }}>P’TIT 1 · CARTE DES RISQUES</div><div style={{ marginTop: 5, color: "#fff", fontSize: 12, fontWeight: 950 }}>Vise le centre des secteurs. Le petit simple reste la zone de contrôle.</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontSize: 28, fontWeight: 1100, color: ACCENT }}>{score}</div><div style={{ fontSize: 8, color: "#9097aa", fontWeight: 900 }}>LE PLUS PETIT GAGNE</div></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5, marginTop: 9 }}>
      {cards.map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, borderRadius: 11, padding: "6px 4px", textAlign: "center", border: `1px solid ${color}45`, background: `${color}0c` }}><div style={{ color, fontSize: 8, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 2, color: "#fff", fontSize: 8.5, fontWeight: 950, whiteSpace: "nowrap" }}>{value}</div></div>)}
    </div>
    {rules.jackpotEnabled ? <div style={{ marginTop: 8, borderRadius: 14, padding: "8px 9px", border: "1px solid rgba(255,216,77,.55)", background: "radial-gradient(circle at 15% 30%,rgba(255,216,77,.16),transparent 34%),rgba(255,180,30,.055)", boxShadow: "0 0 22px rgba(255,190,35,.08)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><JackpotMiniTarget targets={state.jackpotTargets} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#ffd84d", fontSize: 9, fontWeight: 1100, letterSpacing: .8 }}>✦ JACKPOT · ZONE SPÉCIALE</div><div style={{ marginTop: 3, color: "#fff", fontSize: 21, fontWeight: 1100, letterSpacing: .8, textShadow: "0 0 16px rgba(255,216,77,.55)" }}>{jackpotText}</div><div style={{ marginTop: 3, color: "#e8edf7", fontSize: 9 }}>Double / Triple uniquement · une touche = volée entière à 0</div><div style={{ marginTop: 2, color: "#8c94a8", fontSize: 8 }}>Rotation : {rules.jackpotRefresh === "round" ? "chaque tour complet" : "chaque volée"}</div></div></div></div> : null}
    <div style={{ display: "grid", gridTemplateColumns: rules.zeroAbsoluteEnabled && rules.dbullEnabled && rules.shieldEnabled ? "1fr 1fr" : "1fr", gap: 7, marginTop: 8 }}>
      {rules.zeroAbsoluteEnabled && rules.dbullEnabled ? <div style={{ borderRadius: 12, padding: 8, border: `1px solid ${BLUE}44`, background: `${BLUE}0b` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: BLUE, fontSize: 9 }}>ZÉRO ABSOLU</b><span style={{ color: "#fff", fontSize: 10, fontWeight: 1000 }}>{"●".repeat(dbulls)}{"○".repeat(Math.max(0, dbullGoal - dbulls))}</span></div><div style={{ marginTop: 3, color: "#9fa6b8", fontSize: 8.5 }}>{dbullGoal}e DBULL cumulé → score total 0</div></div> : null}
      {rules.shieldEnabled ? <div style={{ borderRadius: 12, padding: 8, border: `1px solid ${shield ? GREEN : ACCENT}44`, background: `${shield ? GREEN : ACCENT}0b` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: shield ? GREEN : ACCENT, fontSize: 9 }}>BOUCLIER DU HUN</b><span style={{ color: "#fff", fontSize: 10, fontWeight: 1000 }}>{shield ? "🛡 ACTIF" : `${clean}/${rules.cleanVisitsForShield}`}</span></div><div style={{ marginTop: 3, color: "#9fa6b8", fontSize: 8.5 }}>{shield ? `Pénalités des prochaines volées ÷${rules.shieldDivider}` : `${rules.cleanVisitsForShield} volées propres consécutives`}</div></div> : null}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
      {[0, 1, 2].map((i) => { const d = currentThrow?.[i]; const g = d ? uiToGameDart(d) : null; return <div key={i} style={{ borderRadius: 11, padding: "7px 5px", textAlign: "center", border: `1px solid ${d ? ACCENT + "55" : "rgba(255,255,255,.07)"}`, background: d ? `${ACCENT}0c` : "rgba(255,255,255,.02)" }}><div style={{ color: d ? "#fff" : "#626a7d", fontWeight: 1000, fontSize: 10 }}>{g ? ptitHunDartLabel(g) : `FLÉCHETTE ${i + 1}`}</div></div>; })}
    </div>
    {preview ? <div style={{ marginTop: 7, textAlign: "center", color: preview.after <= score || preview.jackpotHit || preview.tripleNul || preview.zeroAbsoluteNow ? GREEN : preview.delta >= 100 ? RED : "#fff", fontSize: 10.5, fontWeight: 1000 }}>APERÇU : {score} → {preview.after}{preview.jackpotHit ? " · JACKPOT ! VOLÉE 0" : preview.petitOnePerfect ? " · P’TIT 1 PARFAIT" : preview.tripleNul ? ` · TRIPLE NUL PETIT ${preview.tripleNulNumber || "?"}` : preview.zeroAbsoluteNow ? " · ZÉRO ABSOLU" : preview.shieldBefore && preview.rawAfter > score ? " · BOUCLIER APPLIQUÉ" : preview.delta > 0 ? ` · +${preview.delta} pts` : preview.delta < 0 ? ` · ${preview.delta} pts` : " · VOLÉE 0"}</div> : null}
  </section>;
}

export default function PtitHunPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizePtitHunConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const recoveredThrow = resumeRecord?.resume?.currentThrow ?? resumeRecord?.payload?.currentThrow;
  const recoveredSingleRing = resumeRecord?.resume?.singleRing ?? resumeRecord?.payload?.singleRing;
  const [state, setState] = React.useState<PtitHunState>(() => restored?.mode === "ptit_hun" ? clonePtitHunState(restored) : createPtitHunState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => { const v = resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier; return v === 2 || v === 3 ? v : 1; });
  const [singleRing, setSingleRing] = React.useState<"inner_single" | "outer_single">(recoveredSingleRing === "outer_single" ? "outer_single" : "inner_single");
  const [undo, setUndo] = React.useState<PtitHunState[]>([]);
  const [notice, setNotice] = React.useState("");
  const [moment, setMoment] = React.useState<any>(null);
  const [playersOpen, setPlayersOpen] = React.useState(false), [statsOpen, setStatsOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false), [rankingOpen, setRankingOpen] = React.useState(false);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), introPlayedRef = React.useRef(false), initialCheckpointRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `ptit1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const colorById = React.useMemo(() => modePlayerColors(state.players, ACCENT), [state.players]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeColor = activePlayer ? colorById.get(String(activePlayer.id)) || ACCENT : ACCENT;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const sfxEnabled = config.sfxEnabled !== false, awenaEnabled = config.awenaEnabled !== false, coachEnabled = config.coachEnabled !== false, firstVisitGuideEnabled = config.firstVisitGuide !== false;
  const nameById = React.useCallback((id: any) => state.players.find((p: any) => String(p.id) === String(id))?.name || "Joueur", [state.players]);

  const buildRecord = React.useCallback((s: PtitHunState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier, ring = singleRing) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const rankings = rankPtitHunPlayers(s).map((r: any) => {
      const p: any = s.players.find((x: any) => String(x.id) === String(r.id)); const st: any = s.statsByPlayer?.[r.id] || {};
      return { id: r.id, name: p?.name || "Joueur", rank: r.rank, score: r.score, tripleNuls: st.tripleNuls || 0, petitOneHits: st.petitOneHits || 0, petitOneTriples: st.petitOneTriples || 0, zeroVisits: st.zeroVisits || 0, jackpotVisits: st.jackpotVisits || 0, jackpotHits: st.jackpotHits || 0, dbulls: st.dbulls || 0, cleanVisits: st.cleanVisits || 0, shield: !!s.shieldActive?.[r.id] };
    });
    const perPlayer = Object.fromEntries((s.players || []).map((p: any) => [p.id, { ...(s.statsByPlayer?.[p.id] || {}), score: Number(s.scores?.[p.id] || 0), shield: !!s.shieldActive?.[p.id], cleanStreak: Number(s.cleanStreak?.[p.id] || 0), zeroAbsoluteUsed: !!s.zeroAbsoluteUsed?.[p.id] }]));
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "ptit_hun", mode: "ptit_hun", sport: "darts", status,
      createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "ptit_hun", rounds: s.config.rules.rounds, startScore: s.config.rules.startScore },
      summary: { mode: "ptit_hun", finished: status === "finished", winnerId: s.winnerId, finalScores: s.scores, rankings, perPlayer, config: s.config, durationMs: Math.max(0, Number((status === "finished" ? (s.finishedAt || Date.now()) : Date.now())) - Number(s.startedAt || Date.now())), totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0) },
      resume: { mode: "ptit_hun", config: s.config, state: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, updatedAt: Date.now() },
      payload: { kind: "ptit_hun", mode: "ptit_hun", sport: "darts", config: s.config, stateSnapshot: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, visits: s.visits, visitHistory: s.visits, stats: { mode: "ptit_hun", players: s.statsByPlayer, finalScores: s.scores } },
    };
  }, [profiles, currentThrow, multiplier, singleRing]);

  const saveInProgress = React.useCallback(async (s: PtitHunState, draft: UIDart[] = currentThrow, m: 1 | 2 | 3 = multiplier, ring = singleRing) => { try { await History.upsert(buildRecord(s, "in_progress", draft, m, ring)); } catch (e) { console.warn("[PTIT_HUN] checkpoint failed", e); } }, [buildRecord, currentThrow, multiplier, singleRing]);
  const persist = React.useCallback((s: PtitHunState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished", [], 1, singleRing);
      if (typeof onFinish === "function") onFinish(rec, { navigate: false }); else void History.upsert(rec).catch(() => {});
    } else void saveInProgress(s, [], 1, singleRing);
  }, [buildRecord, onFinish, saveInProgress, singleRing]);

  React.useEffect(() => { if (initialCheckpointRef.current) return; initialCheckpointRef.current = true; if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier, singleRing); }, [saveInProgress, state, currentThrow, multiplier, singleRing]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void saveInProgress(state, currentThrow, multiplier, singleRing), 180); return () => window.clearTimeout(t); }, [currentThrow, multiplier, singleRing, state.phase, state.activePlayerIndex, saveInProgress]);
  React.useEffect(() => { if (restored?.mode === "ptit_hun" || resumeRecord) return; const start = () => { if (!sfxEnabled || introPlayedRef.current) return; introPlayedRef.current = true; void unlockNewModeAudio(); playNewModeSfx("intro", true); }; try { if ((navigator as any)?.userActivation?.hasBeenActive) { start(); return; } } catch {} window.addEventListener("pointerdown", start, { once: true, capture: true } as any); return () => window.removeEventListener("pointerdown", start, true); }, [sfxEnabled]);
  React.useEffect(() => { awena?.setRuntime?.({ route: "ptit_hun_play", sport: "darts", mode: "ptit_hun", phase: state.phase === "finished" ? "summary" : "play", inGame: state.phase !== "finished", screenLabel: "P’TIT 1 · Partie", playerName: activePlayer?.name, extra: { score: state.scores?.[activePlayer?.id], dbulls: state.statsByPlayer?.[activePlayer?.id]?.dbulls, shield: state.shieldActive?.[activePlayer?.id], cleanStreak: state.cleanStreak?.[activePlayer?.id], jackpots: state.jackpotTargets?.map((t: any) => t.label), rounds: config.rules.rounds } }); }, [awena, state.phase, state.activePlayerIndex, state.scores, state.shieldActive, state.cleanStreak, activePlayer?.id]);

  const commit = React.useCallback((next: PtitHunState, previous = state, forcedNotice?: string) => {
    setUndo((u) => [...u.slice(-39), clonePtitHunState(previous)]); setState(next); setCurrentThrow([]); setMultiplier(1);
    const last: any = next.visits?.[next.visits.length - 1]; let msg = forcedNotice || "";
    let nextMoment: any = null;
    if (!msg && next.phase === "finished" && next.winnerId) { msg = `🏆 ${nameById(next.winnerId)} remporte P’TIT 1 !`; playNewModeSfx("victory", sfxEnabled); }
    else if (!msg && last?.zeroAbsoluteNow) { msg = `💎 ZÉRO ABSOLU ! ${config.rules.dbullsForZero}e DBULL : score remis à 0`; nextMoment = { key: `zero-${last.id}`, playerId: last.playerId, icon: "💎", kicker: "EXPLOIT DU P’TIT HUN", title: "ZÉRO ABSOLU", detail: `${config.rules.dbullsForZero}e DBULL cumulé · score total remis à 0`, tone: "success", durationMs: 2600 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.shieldUnlockedNow) { msg = "🛡 BOUCLIER DU HUN débloqué jusqu’à la fin"; nextMoment = { key: `shield-${last.id}`, playerId: last.playerId, icon: "🛡️", kicker: "3 VOLÉES PROPRES", title: "BOUCLIER DU HUN", detail: `Les prochaines pénalités sont divisées par ${config.rules.shieldDivider}`, tone: "success", durationMs: 2300 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.jackpotHit) { msg = `✦ JACKPOT ${last?.jackpotTargets?.map((t: any) => t.label).join("/") || ""} ! Volée à 0`; nextMoment = { key: `jackpot-${last.id}`, playerId: last.playerId, icon: "✦", kicker: "ZONE SPÉCIALE TOUCHÉE", title: "JACKPOT · VOLÉE 0", detail: `${last?.jackpotTargets?.map((t: any) => t.label).join(" / ") || "Double / Triple"} neutralise toute la volée`, tone: "success", durationMs: 2300 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.petitOnePerfect) { msg = "🎯 P’TIT 1 PARFAIT ! Trois petits 1 : volée à 0"; nextMoment = { key: `ptit1-${last.id}`, playerId: last.playerId, icon: "1️⃣", kicker: "SIGNATURE DU MODE", title: "P’TIT 1 PARFAIT", detail: "Petit 1 · Petit 1 · Petit 1 · volée à 0", tone: "success", durationMs: 2450 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.tripleNul) { msg = `🎯 TRIPLE NUL ! Trois petits ${last?.tripleNulNumber || ""} : volée à 0`; nextMoment = { key: `triple-nul-${last.id}`, playerId: last.playerId, icon: "🎯", kicker: "PRÉCISION PURE", title: "TRIPLE NUL", detail: `3 petits ${last?.tripleNulNumber || "?"} identiques · volée à 0`, tone: "success", durationMs: 2200 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg) msg = (last?.events || []).join(" · ");
    if (nextMoment) setMoment(nextMoment);
    setNotice(msg); persist(next);
  }, [state, nameById, persist, sfxEnabled, config.rules.dbullsForZero, config.rules.shieldDivider]);

  const validate = () => { if (currentThrow.length !== 3 || state.phase === "finished" || activeIsBot) return; commit(playPtitHunVisit(state, currentThrow.map(uiToGameDart))); };
  const doUndo = () => setUndo((u) => { if (!u.length) return u; const prev = u[u.length - 1]; setState(clonePtitHunState(prev)); setCurrentThrow([]); setMultiplier(1); setMoment(null); setNotice("Dernière volée annulée"); finishedRef.current = false; void saveInProgress(prev, [], 1, singleRing); return u.slice(0, -1); });
  const setThrowWithSfx = React.useCallback((update: any) => setCurrentThrow((prev: UIDart[]) => { const next = (typeof update === "function" ? update(prev) : update) || prev; const out = Array.isArray(next) ? next.slice(0, 3) : prev; if (out.length > prev.length) out.slice(prev.length).forEach((d: any, i: number) => window.setTimeout(() => playNewModeDartSfx(d, sfxEnabled), i * 120)); return out; }), [sfxEnabled]);
  React.useEffect(() => { if (!activeIsBot || state.phase === "finished" || botBusy.current) return; botBusy.current = true; const t = window.setTimeout(() => { try { const darts = pickPtitHunBotDarts(state, config.botLevel); const span = playNewModeDartSequence(darts, sfxEnabled); window.setTimeout(() => { try { commit(playPtitHunVisit(state, darts)); } finally { botBusy.current = false; } }, span + 100); } catch { botBusy.current = false; } }, 620); return () => window.clearTimeout(t); }, [state, activeIsBot, activePlayer?.id]);

  function replay() { matchIdRef.current = `ptit1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; finishedRef.current = false; setUndo([]); setNotice(""); setMoment(null); setCurrentThrow([]); setMultiplier(1); const next = createPtitHunState(players, config); setState(next); initialCheckpointRef.current = true; void saveInProgress(next, [], 1, singleRing); if (sfxEnabled) playNewModeSfx("intro", true); }

  const activeStats: any = state.statsByPlayer?.[activePlayer?.id] || {};
  const score = Number(state.scores?.[activePlayer?.id] || 0);
  const round = Math.min(config.rules.rounds, Number(activeStats.visits || 0) + 1);
  const shield = Boolean(state.shieldActive?.[activePlayer?.id]);
  const clean = Number(state.cleanStreak?.[activePlayer?.id] || 0);
  const preview = React.useMemo(() => { if (currentThrow.length !== 3 || !activePlayer) return null; const next = playPtitHunVisit(state, currentThrow.map(uiToGameDart)); return next.visits?.[next.visits.length - 1] || null; }, [currentThrow, state, activePlayer?.id]);
  const ringDecorator = (d: UIDart) => { if ((d as any)?.label) return d; if (Number(d?.v) >= 1 && Number(d?.v) <= 20 && Number(d?.mult) === 1) return { ...d, label: singleRing }; return d; };
  const firstVisitGuide = firstVisitGuideEnabled && !activeIsBot && state.turnIndex === 0 && currentThrow.length === 0;
  const coach = firstVisitGuide ? `1 · Choisis PETIT pour viser la zone simple intérieure. 2 · Le petit 1 vaut +1 ; le gros 1 vaut +${config.rules.outerSingleFactor}. 3 · Double ×${config.rules.doubleFactor}, Triple ×${config.rules.tripleFactor}, Bull25 ×${config.rules.bull25Factor}. 4 · ${config.rules.jackpotEnabled ? `Jackpot ${state.jackpotTargets.map((t: any) => t.label).join("/")} = volée 0.` : config.rules.dbullEnabled ? `DBULL ÷${config.rules.dbullDivider}.` : "Reste dans les petits simples."}` : coachEnabled && !activeIsBot ? coachText(state, activePlayer) : "";
  const ranked = rankPtitHunPlayers(state);
  const rankingRows = ranked.map((r: any) => { const p: any = state.players.find((x: any) => String(x.id) === String(r.id)); const st: any = state.statsByPlayer?.[r.id] || {}; const color = colorById.get(String(r.id)) || ACCENT; return { id: r.id, name: p?.name || "Joueur", profile: profileById.get(String(r.id)) || p, color, value: r.score, suffix: " pts", subtitle: `${st.jackpotVisits || 0} Jackpot · ${st.tripleNuls || 0} Triple Nul · ${st.dbulls || 0}/${config.rules.dbullsForZero} DBULL · ${state.shieldActive?.[r.id] ? "🛡 actif" : `${state.cleanStreak?.[r.id] || 0}/${config.rules.cleanVisitsForShield} bouclier`}`, score: r.score, order: r.rank }; });
  const playersRows = ranked.map((r: any) => { const p: any = state.players.find((x: any) => String(x.id) === String(r.id)); const st: any = state.statsByPlayer?.[r.id] || {}; const color = colorById.get(String(r.id)) || ACCENT; return { id: r.id, name: p?.name || "Joueur", profile: profileById.get(String(r.id)) || p, color, active: String(r.id) === String(activePlayer?.id), status: state.shieldActive?.[r.id] ? "🛡 BOUCLIER ACTIF" : config.rules.shieldEnabled ? `${state.cleanStreak?.[r.id] || 0}/${config.rules.cleanVisitsForShield} VOLÉES PROPRES` : "BOUCLIER OFF", progress: Number(st.visits || 0), progressMax: config.rules.rounds, metrics: [{ label: "SCORE", value: r.score }, { label: "P’TIT 1", value: st.petitOneHits || 0 }, { label: "DBULL", value: st.dbulls || 0 }, { label: "VOLÉES 0", value: st.zeroVisits || 0 }] }; });
  const statsItems = [
    { label: "SCORE", value: score, color: ACCENT }, { label: "P’TIT 1 TOUCHÉS", value: activeStats.petitOneHits || 0, color: ACCENT }, { label: "P’TIT 1 PARFAITS", value: activeStats.petitOneTriples || 0, color: ACCENT },
    { label: "PETITS SIMPLES", value: activeStats.innerSingles || 0, color: GREEN }, { label: "GROS SIMPLES", value: activeStats.outerSingles || 0, color: "#ffb86b" }, { label: "VOLÉES À 0", value: activeStats.zeroVisits || 0, color: GREEN },
    { label: "TRIPLE NUL", value: activeStats.tripleNuls || 0, color: ACCENT }, { label: "VOLÉES PROPRES", value: activeStats.cleanVisits || 0 }, { label: "SÉRIE PROPRE", value: shield ? "🛡 ACTIF" : config.rules.shieldEnabled ? `${clean}/${config.rules.cleanVisitsForShield}` : "OFF", color: shield ? GREEN : ACCENT },
    { label: "DBULL", value: `${activeStats.dbulls || 0}/${config.rules.dbullsForZero}`, color: BLUE }, { label: "JACKPOTS", value: activeStats.jackpotVisits || 0, color: "#ffd84d" }, { label: "ZÉRO ABSOLU", value: activeStats.zeroAbsolute || 0 }, { label: "POINTS ÉVITÉS", value: activeStats.shieldSaved || 0, color: GREEN },
    { label: "DOUBLES", value: activeStats.doubles || 0, color: RED }, { label: "TRIPLES", value: activeStats.triples || 0, color: RED }, { label: "BULL25", value: activeStats.bulls25 || 0, color: RED }, { label: "MISS", value: activeStats.misses || 0, color: RED }, { label: "FLÉCHETTES", value: activeStats.darts || 0 },
  ];
  const awards = React.useMemo(() => { const rows = rankingRows.map((r: any) => ({ ...r, st: state.statsByPlayer?.[r.id] || {} })); const nul = bestBy(rows, (r: any) => -Number(r.score || 0)); const ptit1 = bestBy(rows, (r: any) => Number(r.st.petitOneHits || 0) * 10 + Number(r.st.petitOneTriples || 0) * 100); const zero = bestBy(rows, (r: any) => Number(r.st.zeroVisits || 0) * 100 + Number(r.st.tripleNuls || 0)); const center = bestBy(rows, (r: any) => Number(r.st.dbulls || 0)); return [{ icon: "👑", label: "ROI DES NULS", name: nul?.name || "—", value: `${nul?.score ?? 0} pts`, color: nul?.color }, { icon: "1️⃣", label: "MAÎTRE DU P’TIT 1", name: ptit1?.name || "—", value: `${ptit1?.st?.petitOneHits || 0} touches · ${ptit1?.st?.petitOneTriples || 0} parfait`, color: ptit1?.color }, { icon: "0️⃣", label: "VOLÉES ZÉRO", name: zero?.name || "—", value: `${zero?.st?.zeroVisits || 0} volée(s)`, color: zero?.color }, { icon: "💎", label: "DOMPTEUR DU CENTRE", name: center?.name || "—", value: `${center?.st?.dbulls || 0} DBULL`, color: center?.color }]; }, [rankingRows, state.statsByPlayer]);
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs = Math.max(0, Number((state.finishedAt || Date.now())) - Number(state.startedAt || Date.now()));

  if (state.phase === "finished") {
    const rec = buildRecord(state, "finished", [], 1, singleRing);
    return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1">
      <PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : ACCENT} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
      <PageHeader tickerSrc={tickerPtitHun} tickerAlt="P’TIT 1" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("ptit_hun_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="ptit_hun_play" mode="ptit_hun" screenLabel="P’TIT 1 · Résultat" accent={ACCENT} /></div> : null} />
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}><PremiumEndPanel title="P’TIT 1" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec, mode: "ptit_hun" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "active", initialStatsSubTab: "history", focusMatchId: matchIdRef.current })} onConfig={() => go?.("ptit_hun_config")} onGames={() => go?.("games", { gamesView: "all" })} /></div>
    </div>;
  }

  return <div className="party-mode" style={{ ["--mode-accent" as any]: activeColor }} data-mss-native-play-layout="1">
    <PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || activeColor) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
    <PageHeader tickerSrc={tickerPtitHun} tickerAlt="P’TIT 1" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("ptit_hun_config")} color={activeColor} glow={`${activeColor}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="ptit_hun_play" mode="ptit_hun" screenLabel="P’TIT 1 · Partie" accent={activeColor} /></div> : null} />
    {coach ? <FloatingAdvice text={coach} accent={activeColor} kicker={firstVisitGuide ? "PREMIER TOUR · MODE D’EMPLOI" : "CONSEIL DU P’TIT HUN"} /> : null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={{}} primaryById={(id: string) => state.scores[id] || 0} secondaryById={(id: string) => `${state.statsByPlayer[id]?.jackpotVisits || 0} JP · ${state.statsByPlayer[id]?.dbulls || 0}/${config.rules.dbullsForZero} DBULL · ${state.shieldActive[id] ? "🛡" : config.rules.shieldEnabled ? `${state.cleanStreak[id] || 0}/${config.rules.cleanVisitsForShield}` : "—"}`} />
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={activeColor} eyebrow={`VOLÉE ${round}/${config.rules.rounds} · LE PLUS PETIT SCORE GAGNE`} primary={score} secondary={shield ? "🛡 BOUCLIER DU HUN ACTIF" : `${config.rules.shieldEnabled ? `Bouclier ${clean}/${config.rules.cleanVisitsForShield}` : "Bouclier OFF"} · ${config.rules.zeroAbsoluteEnabled && config.rules.dbullEnabled ? `DBULL ${activeStats.dbulls || 0}/${config.rules.dbullsForZero}` : "DBULL libre"}`} tertiary={`${activeStats.innerSingles || 0} petits simples · ${activeStats.tripleNuls || 0} Triple Nul · ${activeStats.misses || 0} MISS`} progress={Number(activeStats.visits || 0)} progressMax={config.rules.rounds} notice={notice} noticeTone={notice.includes("ZÉRO") || notice.includes("TRIPLE NUL") || notice.includes("BOUCLIER") || notice.includes("JACKPOT") ? "win" : notice.includes("MISS") ? "danger" : "normal"} aside={<div style={{ textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 1100, color: ACCENT }}>1</div><div style={{ fontSize: 8, color: GREEN, fontWeight: 1000 }}>PETIT = +1</div></div>} />
      <PtitHunRiskBoard state={state} playerId={activePlayer?.id} currentThrow={currentThrow} preview={preview} />
      <KpiStrip accent={activeColor} onClick={() => setStatsOpen(true)} items={[["SCORE", score], ["PETITS", activeStats.innerSingles || 0], ["JACKPOT", activeStats.jackpotVisits || 0], ["BOUCLIER", shield ? "ON" : config.rules.shieldEnabled ? `${clean}/${config.rules.cleanVisitsForShield}` : "OFF"]]} />
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerPtitHun} onPlayers={() => setPlayersOpen(true)} onStats={() => setStatsOpen(true)} onLog={() => setLogOpen(true)} onRanking={() => setRankingOpen(true)} />
    </div><div className="party-mode__input">{!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={() => { setCurrentThrow([]); setMultiplier(1); }} preferredMethod={config.scoreInputMethod} dartDecorator={ringDecorator} validateLabel="VALIDER LA VOLÉE" accent={activeColor} maxDarts={3} minDartsToValidate={3} fitMinScale={0.16} keypadSecondaryAction={config.scoreInputMethod === "keypad" ? { icon: singleRing === "inner_single" ? "PETIT" : "GROS", title: singleRing === "inner_single" ? "Petit simple intérieur · valeur normale" : `Gros simple extérieur · valeur ×${config.rules.outerSingleFactor}`, active: true, tone: singleRing === "inner_single" ? "teal" : "danger", onClick: () => setSingleRing((v) => v === "inner_single" ? "outer_single" : "inner_single") } : null} keypadFooterAction={undo.length ? { icon: "↶", title: "UNDO", onClick: doUndo } : null} /> : <BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={config.rules.jackpotEnabled ? `cherche ${state.jackpotTargets.map((t: any) => t.label).join("/")} ou les petits simples…` : "cherche les petits simples et le DBULL…"} icon="1" />}</div></div></main>
    {playersOpen ? <PlayersModal rows={playersRows} onClose={() => setPlayersOpen(false)} /> : null}{statsOpen ? <StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={() => setStatsOpen(false)} /> : null}{logOpen ? <LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={ptitHunDartLabel} title="JOURNAL P’TIT 1" onClose={() => setLogOpen(false)} /> : null}{rankingOpen ? <RankingModal rows={rankingRows} title="CLASSEMENT · LE PLUS NUL D’ABORD" onClose={() => setRankingOpen(false)} /> : null}
  </div>;
}
