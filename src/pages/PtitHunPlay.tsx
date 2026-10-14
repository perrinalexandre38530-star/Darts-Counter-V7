// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
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
  BotTurn, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, PremiumMomentOverlay, RankingModal, StatsModal, bestBy, modePlayerColors,
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
  const oneIndex = PTIT1_BOARD_ORDER.indexOf(1);
  const oneStart = oneIndex * 18 - 9;
  const oneEnd = oneStart + 18;
  return <div aria-label={`Cible tactique P’TIT 1${rows.length ? ` · Jackpot ${rows.map((t: any) => t.label).join(" ")}` : ""}`} style={{ width: "clamp(76px,22vw,96px)", aspectRatio: "1 / 1", flex: "0 0 auto", borderRadius: 999, padding: 3, background: "radial-gradient(circle,rgba(120,243,212,.10),rgba(255,221,80,.08) 48%,rgba(0,0,0,.52))", border: "1px solid rgba(255,216,77,.28)", boxShadow: "0 0 22px rgba(255,203,50,.10)" }}>
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="47" fill="#10141b" stroke="rgba(255,255,255,.20)" strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,111,120,.28)" strokeWidth="7" />
      <circle cx="50" cy="50" r="36.5" fill="none" stroke="rgba(255,184,107,.16)" strokeWidth="6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,111,120,.28)" strokeWidth="6" />
      <circle cx="50" cy="50" r="17.5" fill="none" stroke="rgba(120,243,212,.12)" strokeWidth="18" />
      <path d={ptit1RingPath(50,50,27,8,oneStart,oneEnd)} fill="rgba(120,243,212,.78)" stroke="#fff0a0" strokeWidth="1.05" style={{ filter: "drop-shadow(0 0 4px rgba(120,243,212,.9))" }} />
      {PTIT1_BOARD_ORDER.map((n, idx) => { const a = idx * 18 - 9; const pt = ptit1Polar(50,50,45,a+9); return <g key={n}><line x1="50" y1="50" x2={ptit1Polar(50,50,47,a).x} y2={ptit1Polar(50,50,47,a).y} stroke="rgba(255,255,255,.065)" strokeWidth=".7" /><text x={pt.x} y={pt.y+1.6} textAnchor="middle" fontSize={n === 1 ? "5.8" : "4.4"} fill={n === 1 ? "#fff3a7" : "rgba(255,255,255,.72)"} fontWeight="900">{n}</text></g>; })}
      {rows.map((t: any, i: number) => { const idx = Math.max(0, PTIT1_BOARD_ORDER.indexOf(Number(t.number))); const start = idx * 18 - 9, end = start + 18; const d = t.bed === "D" ? ptit1RingPath(50,50,48,40,start,end) : ptit1RingPath(50,50,33,27,start,end); return <path key={`${t.label}-${i}`} d={d} fill={i ? "rgba(76,180,255,.88)" : "rgba(255,216,77,.94)"} stroke="#fff" strokeWidth="1.15" style={{ filter: "drop-shadow(0 0 5px rgba(255,216,77,.85))" }} />; })}
      <circle cx="50" cy="50" r="7" fill="#f36a59" stroke="#ffd84d" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="3.2" fill="#78f3d4" stroke="#fff" strokeWidth="1" />
      <text x="50" y="62" textAnchor="middle" fontSize="4.2" fill="#78f3d4" fontWeight="1000">P’TIT 1</text>
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
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 10, alignItems: "center" }}>
      <div><div style={{ color: ACCENT, fontSize: 9, letterSpacing: 1.1, fontWeight: 1000 }}>P’TIT 1 · CARTE DES RISQUES</div><div style={{ marginTop: 5, color: "#fff", fontSize: 12, fontWeight: 950 }}>Vise le centre des secteurs. Le petit simple reste la zone de contrôle.</div><div style={{ marginTop: 3, color: "#8f98ad", fontSize: 8.5 }}>Vert = petit simple · rouge = D/T · or/bleu = Jackpot</div></div>
      <JackpotMiniTarget targets={rules.jackpotEnabled ? state.jackpotTargets : []} />
      <div style={{ textAlign: "right" }}><div style={{ fontSize: 28, fontWeight: 1100, color: ACCENT }}>{score}</div><div style={{ fontSize: 8, color: "#9097aa", fontWeight: 900 }}>LE PLUS PETIT GAGNE</div></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(72px,1fr))", gap: 5, marginTop: 9 }}>
      {cards.map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, borderRadius: 11, padding: "6px 4px", textAlign: "center", border: `1px solid ${color}45`, background: `${color}0c` }}><div style={{ color, fontSize: 8, fontWeight: 1000, whiteSpace: "nowrap" }}>{label}</div><div style={{ marginTop: 2, color: "#fff", fontSize: 8.5, fontWeight: 950, whiteSpace: "nowrap" }}>{value}</div></div>)}
    </div>
    {rules.jackpotEnabled ? <div style={{ marginTop: 8, borderRadius: 14, padding: "8px 9px", border: "1px solid rgba(255,216,77,.55)", background: "radial-gradient(circle at 15% 30%,rgba(255,216,77,.16),transparent 34%),rgba(255,180,30,.055)", boxShadow: "0 0 22px rgba(255,190,35,.08)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#ffd84d", fontSize: 9, fontWeight: 1100, letterSpacing: .8 }}>✦ JACKPOT · ZONE SPÉCIALE</div><div style={{ marginTop: 3, color: "#fff", fontSize: 21, fontWeight: 1100, letterSpacing: .8, textShadow: "0 0 16px rgba(255,216,77,.55)" }}>{jackpotText}</div><div style={{ marginTop: 3, color: "#e8edf7", fontSize: 9 }}>Double / Triple uniquement · une touche = volée entière à 0</div><div style={{ marginTop: 2, color: "#8c94a8", fontSize: 8 }}>Rotation : {rules.jackpotRefresh === "round" ? "chaque tour complet" : "chaque volée"}</div></div></div></div> : null}
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


function FloatingPanel({ title, subtitle, onClose, children }: any) {
  return <div className="party-mode__modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="party-mode__modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(860px,96vw)" }}>
      <header>
        <div><b>{title}</b>{subtitle ? <span>{subtitle}</span> : null}</div>
        <button type="button" onClick={onClose} aria-label="Fermer">×</button>
      </header>
      <div style={{ padding: 8, overflow: "auto" }}>{children}</div>
    </div>
  </div>;
}

function Ptit1MiniKpi({ label, value, color = ACCENT, onClick }: any) {
  const Tag: any = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} style={{ minWidth: 0, height: "100%", border: 0, borderRadius: 10, background: "rgba(0,0,0,.28)", color: "#fff", padding: "4px 3px", textAlign: "center", cursor: onClick ? "pointer" : "default" }}>
    <small style={{ display: "block", color: "#8791a4", fontSize: 6.2, fontWeight: 1000, letterSpacing: .45 }}>{label}</small>
    <b style={{ display: "block", marginTop: 2, color, fontSize: 13.5, lineHeight: 1, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</b>
  </Tag>;
}

function Ptit1DartsRow({ currentThrow, accent }: any) {
  return <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
    {[0,1,2].map((i) => { const dart = currentThrow?.[i]; const gameDart = dart ? uiToGameDart(dart) : null; return <div key={i} style={{ height: 30, minWidth: 0, borderRadius: 9, border: `1px solid ${dart ? accent + "66" : "rgba(255,255,255,.08)"}`, background: dart ? `${accent}12` : "rgba(0,0,0,.22)", display: "grid", placeItems: "center", color: dart ? "#fff" : "#5f6879", fontSize: 9.5, fontWeight: 1000 }}>{gameDart ? ptitHunDartLabel(gameDart) : `D${i+1}`}</div>; })}
  </div>;
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
  const recoveredUndoStack = resumeRecord?.resume?.undoStack ?? resumeRecord?.payload?.undoStack;
  const [state, setState] = React.useState<PtitHunState>(() => restored?.mode === "ptit_hun" ? clonePtitHunState(restored) : createPtitHunState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => { const v = resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier; return v === 2 || v === 3 ? v : 1; });
  const [singleRing, setSingleRing] = React.useState<"inner_single" | "outer_single">(recoveredSingleRing === "outer_single" ? "outer_single" : "inner_single");
  const [undo, setUndo] = React.useState<PtitHunState[]>(() => Array.isArray(recoveredUndoStack) ? recoveredUndoStack.filter((snap: any) => snap?.mode === "ptit_hun").slice(-3).map((snap: any) => clonePtitHunState(snap)) : []);
  const [notice, setNotice] = React.useState("");
  const [moment, setMoment] = React.useState<any>(null);
  const [playersOpen, setPlayersOpen] = React.useState(false), [statsOpen, setStatsOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false), [rankingOpen, setRankingOpen] = React.useState(false), [focusOpen, setFocusOpen] = React.useState(false);
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

  const buildRecord = React.useCallback((s: PtitHunState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier, ring = singleRing, resumeUndo: PtitHunState[] = undo) => {
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
      resume: { mode: "ptit_hun", config: s.config, state: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, undoStack: resumeUndo.slice(-3).map((snap) => clonePtitHunState(snap)), updatedAt: Date.now() },
      payload: { kind: "ptit_hun", mode: "ptit_hun", sport: "darts", config: s.config, stateSnapshot: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, undoStack: resumeUndo.slice(-3).map((snap) => clonePtitHunState(snap)), visits: s.visits, visitHistory: s.visits, stats: { mode: "ptit_hun", players: s.statsByPlayer, finalScores: s.scores } },
    };
  }, [profiles, currentThrow, multiplier, singleRing, undo]);

  const saveInProgress = React.useCallback(async (s: PtitHunState, draft: UIDart[] = currentThrow, m: 1 | 2 | 3 = multiplier, ring = singleRing, resumeUndo: PtitHunState[] = undo) => { try { await History.upsert(buildRecord(s, "in_progress", draft, m, ring, resumeUndo)); } catch (e) { console.warn("[PTIT_HUN] checkpoint failed", e); } }, [buildRecord, currentThrow, multiplier, singleRing, undo]);
  const persist = React.useCallback((s: PtitHunState, resumeUndo: PtitHunState[] = undo) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished", [], 1, singleRing, resumeUndo);
      if (typeof onFinish === "function") onFinish(rec, { navigate: false }); else void History.upsert(rec).catch(() => {});
    } else void saveInProgress(s, [], 1, singleRing, resumeUndo);
  }, [buildRecord, onFinish, saveInProgress, singleRing, undo]);

  React.useEffect(() => { if (initialCheckpointRef.current) return; initialCheckpointRef.current = true; if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier, singleRing); }, [saveInProgress, state, currentThrow, multiplier, singleRing]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void saveInProgress(state, currentThrow, multiplier, singleRing), 180); return () => window.clearTimeout(t); }, [currentThrow, multiplier, singleRing, state.phase, state.activePlayerIndex, saveInProgress]);
  React.useEffect(() => { if (restored?.mode === "ptit_hun" || resumeRecord) return; const start = () => { if (!sfxEnabled || introPlayedRef.current) return; introPlayedRef.current = true; void unlockNewModeAudio(); playNewModeSfx("intro", true); }; try { if ((navigator as any)?.userActivation?.hasBeenActive) { start(); return; } } catch {} window.addEventListener("pointerdown", start, { once: true, capture: true } as any); return () => window.removeEventListener("pointerdown", start, true); }, [sfxEnabled]);
  React.useEffect(() => { awena?.setRuntime?.({ route: "ptit_hun_play", sport: "darts", mode: "ptit_hun", phase: state.phase === "finished" ? "summary" : "play", inGame: state.phase !== "finished", screenLabel: "P’TIT 1 · Partie", playerName: activePlayer?.name, extra: { score: state.scores?.[activePlayer?.id], dbulls: state.statsByPlayer?.[activePlayer?.id]?.dbulls, shield: state.shieldActive?.[activePlayer?.id], cleanStreak: state.cleanStreak?.[activePlayer?.id], jackpots: state.jackpotTargets?.map((t: any) => t.label), rounds: config.rules.rounds } }); }, [awena, state.phase, state.activePlayerIndex, state.scores, state.shieldActive, state.cleanStreak, activePlayer?.id]);

  const commit = React.useCallback((next: PtitHunState, previous = state, forcedNotice?: string) => {
    const nextUndo = [...undo.slice(-39), clonePtitHunState(previous)];
    setUndo(nextUndo); setState(next); setCurrentThrow([]); setMultiplier(1);
    const last: any = next.visits?.[next.visits.length - 1]; let msg = forcedNotice || "";
    let nextMoment: any = null;
    if (!msg && next.phase === "finished" && next.winnerId) { msg = `🏆 ${nameById(next.winnerId)} remporte P’TIT 1 !`; playNewModeSfx("victory", sfxEnabled); }
    else if (!msg && last?.zeroAbsoluteNow) { msg = `💎 ZÉRO ABSOLU ! ${config.rules.dbullsForZero}e DBULL : score remis à 0`; nextMoment = { key: `zero-${last.id}`, playerId: last.playerId, icon: "💎", kicker: "EXPLOIT DU P’TIT HUN", title: "ZÉRO ABSOLU", detail: `${config.rules.dbullsForZero}e DBULL cumulé · score total remis à 0`, tone: "success", durationMs: 2600 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.shieldUnlockedNow) { msg = "🛡 BOUCLIER DU HUN débloqué jusqu’à la fin"; nextMoment = { key: `shield-${last.id}`, playerId: last.playerId, icon: "🛡️", kicker: "3 VOLÉES PROPRES", title: "BOUCLIER DU HUN", detail: `Les prochaines pénalités sont divisées par ${config.rules.shieldDivider}`, tone: "success", durationMs: 2300 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.jackpotHit) { msg = `✦ JACKPOT ${last?.jackpotTargets?.map((t: any) => t.label).join("/") || ""} ! Volée à 0`; nextMoment = { key: `jackpot-${last.id}`, playerId: last.playerId, icon: "✦", kicker: "ZONE SPÉCIALE TOUCHÉE", title: "JACKPOT · VOLÉE 0", detail: `${last?.jackpotTargets?.map((t: any) => t.label).join(" / ") || "Double / Triple"} neutralise toute la volée`, tone: "success", durationMs: 2300 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.petitOnePerfect) { msg = "🎯 P’TIT 1 PARFAIT ! Trois petits 1 : volée à 0"; nextMoment = { key: `ptit1-${last.id}`, playerId: last.playerId, icon: "1️⃣", kicker: "SIGNATURE DU MODE", title: "P’TIT 1 PARFAIT", detail: "Petit 1 · Petit 1 · Petit 1 · volée à 0", tone: "success", durationMs: 2450 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.tripleNul) { msg = `🎯 TRIPLE NUL ! Trois petits ${last?.tripleNulNumber || ""} : volée à 0`; nextMoment = { key: `triple-nul-${last.id}`, playerId: last.playerId, icon: "🎯", kicker: "PRÉCISION PURE", title: "TRIPLE NUL", detail: `3 petits ${last?.tripleNulNumber || "?"} identiques · volée à 0`, tone: "success", durationMs: 2200 }; playNewModeSfx("success", sfxEnabled); }
    else if (!msg && last?.zeroPenaltyFloor) { msg = `⚠️ SCORE À 0 : pénalité relancée depuis ${config.rules.startScore}`; nextMoment = { key: `zero-floor-${last.id}`, playerId: last.playerId, icon: "⚠️", kicker: "0 NE PROTÈGE PAS", title: "ZONE DANGEREUSE", detail: `À 0, les multiplicateurs repartent du capital ${config.rules.startScore}`, tone: "danger", durationMs: 1900 }; playNewModeSfx("danger", sfxEnabled); }
    else if (!msg) msg = (last?.events || []).join(" · ");
    if (nextMoment) setMoment(nextMoment);
    setNotice(msg); persist(next, nextUndo);
  }, [state, undo, nameById, persist, sfxEnabled, config.rules.dbullsForZero, config.rules.shieldDivider, config.rules.startScore]);

  const validate = () => { if (currentThrow.length !== 3 || state.phase === "finished" || activeIsBot) return; commit(playPtitHunVisit(state, currentThrow.map(uiToGameDart))); };
  const doUndo = () => setUndo((u) => { if (!u.length) return u; const prev = u[u.length - 1]; const remaining = u.slice(0, -1); setState(clonePtitHunState(prev)); setCurrentThrow([]); setMultiplier(1); setMoment(null); setNotice("Dernière volée annulée"); finishedRef.current = false; void saveInProgress(prev, [], 1, singleRing, remaining); return remaining; });
  const setThrowWithSfx = React.useCallback((update: any) => setCurrentThrow((prev: UIDart[]) => { const next = (typeof update === "function" ? update(prev) : update) || prev; const out = Array.isArray(next) ? next.slice(0, 3) : prev; if (out.length > prev.length) out.slice(prev.length).forEach((d: any, i: number) => window.setTimeout(() => playNewModeDartSfx(d, sfxEnabled), i * 120)); return out; }), [sfxEnabled]);
  React.useEffect(() => { if (!activeIsBot || state.phase === "finished" || botBusy.current) return; botBusy.current = true; const t = window.setTimeout(() => { try { const darts = pickPtitHunBotDarts(state, config.botLevel); const span = playNewModeDartSequence(darts, sfxEnabled); window.setTimeout(() => { try { commit(playPtitHunVisit(state, darts)); } finally { botBusy.current = false; } }, span + 100); } catch { botBusy.current = false; } }, 620); return () => window.clearTimeout(t); }, [state, activeIsBot, activePlayer?.id]);

  function replay() { matchIdRef.current = `ptit1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; finishedRef.current = false; setUndo([]); setNotice(""); setMoment(null); setCurrentThrow([]); setMultiplier(1); const next = createPtitHunState(players, config); setState(next); initialCheckpointRef.current = true; void saveInProgress(next, [], 1, singleRing, []); if (sfxEnabled) playNewModeSfx("intro", true); }

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

  return <div className="ptit1-play" style={{ ["--ptit-accent" as any]: activeColor }} data-mss-native-play-layout="1">
    <style>{`
      .ptit1-play{position:fixed;inset:0;height:100dvh;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:6px;background:radial-gradient(circle at 12% 10%,color-mix(in srgb,var(--ptit-accent) 9%,transparent),transparent 28%),linear-gradient(180deg,#090b12,#04060a);color:#fff;overscroll-behavior:none;box-sizing:border-box}
      .ptit1-play *{box-sizing:border-box}
      .ptit1-head{position:relative;flex:0 0 clamp(50px,8.5vh,64px);min-height:0;overflow:hidden;border-radius:15px;border:1px solid rgba(255,255,255,.08);background:#080b11}
      .ptit1-head>img{width:100%;height:100%;object-fit:cover;display:block}
      .ptit1-head:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,5,8,.92),transparent 18%,transparent 82%,rgba(4,5,8,.92));pointer-events:none}
      .ptit1-head__controls{position:absolute;z-index:2;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 7px;pointer-events:none}
      .ptit1-head__controls>div{display:flex;align-items:center;gap:6px;pointer-events:auto}
      .ptit1-stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:5px;overflow:hidden}
      .ptit1-left{flex:0 0 auto;display:flex;flex-direction:column;gap:5px;min-height:0}
      .ptit1-active{position:relative;flex:0 0 clamp(102px,18vh,132px);min-height:0;overflow:hidden;border-radius:17px;border:1px solid color-mix(in srgb,var(--ptit-accent) 50%,rgba(255,255,255,.08));background:linear-gradient(135deg,rgba(18,21,31,.98),rgba(6,8,13,.98));box-shadow:0 0 24px color-mix(in srgb,var(--ptit-accent) 13%,transparent)}
      .ptit1-active__grid{position:relative;height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(118px,138px);gap:6px;padding:7px 8px}
      .ptit1-active__mission{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center;padding:2px 4px}
      .ptit1-active__copy{min-width:0;text-align:center}
      .ptit1-active__copy small{display:block;color:#8c95a7;font-size:6.6px;font-weight:1000;letter-spacing:.65px}
      .ptit1-active__copy strong{display:block;margin-top:2px;color:#fff;font-size:clamp(14px,4vw,19px);line-height:1;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ptit1-active__copy b{display:block;margin-top:5px;color:var(--ptit-accent);font-size:clamp(28px,8vw,39px);line-height:.88;font-weight:1100}
      .ptit1-active__copy span{display:block;margin-top:5px;color:#d7deea;font-size:7.2px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ptit1-player-card{position:relative;overflow:hidden;border-radius:14px;border:1px solid color-mix(in srgb,var(--ptit-accent) 45%,rgba(255,255,255,.08));background:linear-gradient(180deg,rgba(10,13,20,.78),rgba(3,5,9,.92));display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6px}
      .ptit1-player-card:before{content:"";position:absolute;inset:0;background-image:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.72)),url(${tickerPtitHun});background-size:cover;background-position:center;opacity:.36}
      .ptit1-player-card>*{position:relative;z-index:1}
      .ptit1-player-card__name{width:100%;text-align:center;color:var(--ptit-accent);font-size:9px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase}
      .ptit1-player-card__meta{width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
      .ptit1-kpis{flex:0 0 44px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:5px;border-radius:13px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,19,28,.96),rgba(5,7,12,.98))}
      .ptit1-tools{flex:0 0 48px;display:grid;grid-template-columns:minmax(0,1fr) repeat(3,42px);gap:5px}
      .ptit1-players{position:relative;overflow:hidden;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:#080b11;padding:4px 8px;cursor:pointer;color:#fff}
      .ptit1-players:before{content:"";position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(0,0,0,.82),rgba(0,0,0,.34),rgba(0,0,0,.82)),url(${tickerPtitHun});background-size:cover;background-position:center;opacity:.64}
      .ptit1-players>div{position:relative;height:100%;display:flex;align-items:center;justify-content:center;gap:0}
      .ptit1-tool{height:48px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(18,21,31,.96),rgba(6,8,14,.98));color:#fff;font-size:16px;display:grid;place-items:center;cursor:pointer}
      .ptit1-visit{flex:0 0 38px;display:grid;place-items:center;padding:4px 7px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,19,28,.96),rgba(5,7,12,.98))}
      .ptit1-input{flex:1 1 auto;min-height:0;overflow:hidden}
      .ptit1-input>div,.ptit1-input [data-mss-score-input-hub="1"]{height:100%;min-height:0;max-width:100%;overflow:hidden}
      @media (orientation:landscape){
        .ptit1-play{gap:5px;padding:5px}
        .ptit1-head{flex-basis:46px;border-radius:12px}
        .ptit1-stage{display:grid;grid-template-columns:minmax(300px,38%) minmax(0,1fr);gap:6px}
        .ptit1-left{height:100%;display:grid;grid-template-rows:minmax(108px,1.45fr) 42px 46px 36px;gap:5px;overflow:hidden}
        .ptit1-active{height:100%;min-height:0;flex:auto}
        .ptit1-active__grid{grid-template-columns:minmax(0,1fr) 118px;padding:6px}
        .ptit1-active__mission{gap:5px}
        .ptit1-active__copy b{font-size:29px;margin-top:3px}.ptit1-active__copy span{margin-top:3px}
        .ptit1-kpis,.ptit1-tools,.ptit1-visit{height:100%;min-height:0;flex:auto}
        .ptit1-tools{grid-template-columns:minmax(0,1fr) repeat(3,38px)}
        .ptit1-tool{height:100%}
        .ptit1-input{height:100%}
      }
      @media (max-height:650px) and (orientation:portrait){
        .ptit1-head{flex-basis:48px}.ptit1-active{flex-basis:96px}.ptit1-kpis{flex-basis:40px}.ptit1-tools{flex-basis:43px}.ptit1-tool{height:43px}.ptit1-visit{flex-basis:34px}
        .ptit1-active__grid{grid-template-columns:minmax(0,1fr) 110px;padding:5px}.ptit1-active__copy b{font-size:27px}.ptit1-active__copy span{font-size:6.5px}
      }
    `}</style>
    <PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || activeColor) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />

    <header className="ptit1-head">
      <img src={tickerPtitHun} alt="P’TIT 1" draggable={false} />
      <div className="ptit1-head__controls">
        <div><BackDot onClick={() => go?.("ptit_hun_config")} color={activeColor} glow={`${activeColor}88`} size={36} /></div>
        <div>
          {awenaEnabled ? <PremiumAwenaButton awena={awena} route="ptit_hun_play" mode="ptit_hun" screenLabel="P’TIT 1 · Partie" accent={activeColor} /> : null}
          <InfoDot onClick={() => setFocusOpen(true)} size={36} color={ACCENT} glow={`${ACCENT}88`} title="Cible et règles P’TIT 1" disableAwenaTakeover />
        </div>
      </div>
    </header>

    <main className="ptit1-stage">
      <div className="ptit1-left">
        <section className="ptit1-active">
          <div className="ptit1-active__grid">
            <div className="ptit1-active__mission">
              <JackpotMiniTarget targets={config.rules.jackpotEnabled ? state.jackpotTargets : []} />
              <div className="ptit1-active__copy">
                <small>{config.rules.jackpotEnabled && state.jackpotTargets?.length ? "JACKPOT À TENTER" : "OBJECTIF"}</small>
                <strong>{config.rules.jackpotEnabled && state.jackpotTargets?.length ? state.jackpotTargets.map((t:any) => t.label).join(" / ") : "PETIT 1"}</strong>
                <b>{score}</b>
                <span>{notice || coach || `Volée ${round}/${config.rules.rounds} · le plus petit score gagne`}</span>
              </div>
            </div>
            <div className="ptit1-player-card">
              <div className="ptit1-player-card__name">{activePlayer?.name || "Joueur"}</div>
              <ProfileAvatar profile={activeProfile} size={46} showStars={false} ringColor={activeColor} />
              <div className="ptit1-player-card__meta">
                <Ptit1MiniKpi label="TOUR" value={`${round}/${config.rules.rounds}`} color="#fff" />
                <Ptit1MiniKpi label="DBULL" value={`${activeStats.dbulls || 0}/${config.rules.dbullsForZero}`} color={BLUE} />
                <Ptit1MiniKpi label="🛡" value={shield ? "ON" : config.rules.shieldEnabled ? `${clean}/${config.rules.cleanVisitsForShield}` : "OFF"} color={shield ? GREEN : ACCENT} />
              </div>
            </div>
          </div>
        </section>

        <section className="ptit1-kpis">
          <Ptit1MiniKpi label="SCORE" value={score} color={activeColor} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label="P’TIT 1" value={activeStats.petitOneHits || 0} color={ACCENT} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label="VOLÉES 0" value={activeStats.zeroVisits || 0} color={GREEN} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label="JACKPOT" value={activeStats.jackpotVisits || 0} color="#ffd84d" onClick={() => setStatsOpen(true)} />
        </section>

        <section className="ptit1-tools">
          <button type="button" className="ptit1-players" onClick={() => setPlayersOpen(true)} aria-label="Ouvrir la liste des joueurs">
            <div>
              {state.players.slice(0, 8).map((p:any) => { const id=String(p.id); const color=colorById.get(id)||ACCENT; return <span key={id} style={{ width: 30, height: 30, marginLeft: -5, borderRadius: 999, overflow: "hidden", border: `2px solid ${color}`, background: "#070910", display: "grid", placeItems: "center", boxShadow: id === String(activePlayer?.id || "") ? `0 0 12px ${color}88` : "none" }}><ProfileAvatar profile={profileById.get(id) || p} size={28} showStars={false} ringColor={color} noFrame /></span>; })}
              <b style={{ marginLeft: 7, color: activeColor, fontSize: 8.5, fontWeight: 1100, letterSpacing: .65 }}>JOUEURS</b>
            </div>
          </button>
          <button type="button" className="ptit1-tool" onClick={() => setRankingOpen(true)} aria-label="Classement">🏆</button>
          <button type="button" className="ptit1-tool" onClick={() => setStatsOpen(true)} aria-label="Statistiques">📊</button>
          <button type="button" className="ptit1-tool" onClick={() => setLogOpen(true)} aria-label="Journal">☷</button>
        </section>

        <section className="ptit1-visit">
          <Ptit1DartsRow currentThrow={currentThrow} accent={activeColor} />
        </section>
      </div>

      <div className="ptit1-input">
        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={() => { setCurrentThrow([]); setMultiplier(1); }} preferredMethod={config.scoreInputMethod} dartDecorator={ringDecorator} validateLabel="VALIDER LA VOLÉE" accent={activeColor} maxDarts={3} minDartsToValidate={3} fitMinScale={0.14} keypadSecondaryAction={config.scoreInputMethod === "keypad" ? { icon: singleRing === "inner_single" ? "PETIT" : "GROS", title: singleRing === "inner_single" ? "Petit simple intérieur · valeur normale" : `Gros simple extérieur · valeur ×${config.rules.outerSingleFactor}`, active: true, tone: singleRing === "inner_single" ? "teal" : "danger", onClick: () => setSingleRing((v) => v === "inner_single" ? "outer_single" : "inner_single") } : null} keypadFooterAction={undo.length ? { icon: "↶", title: "UNDO", onClick: doUndo } : null} /> : <BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={config.rules.jackpotEnabled ? `cherche ${state.jackpotTargets.map((t:any) => t.label).join("/")} ou les petits simples…` : "cherche les petits simples et le DBULL…"} icon="1" />}
      </div>
    </main>

    {playersOpen ? <PlayersModal rows={playersRows} onClose={() => setPlayersOpen(false)} /> : null}
    {statsOpen ? <StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={ptitHunDartLabel} title="JOURNAL P’TIT 1" onClose={() => setLogOpen(false)} /> : null}
    {rankingOpen ? <RankingModal rows={rankingRows} title="CLASSEMENT · LE PLUS NUL D’ABORD" onClose={() => setRankingOpen(false)} /> : null}
    {focusOpen ? <FloatingPanel title="P’TIT 1 · CIBLE & RISQUES" subtitle="Les détails restent hors de l’écran de jeu" onClose={() => setFocusOpen(false)}><PtitHunRiskBoard state={state} playerId={activePlayer?.id} currentThrow={currentThrow} preview={preview} /></FloatingPanel> : null}
  </div>;
}
