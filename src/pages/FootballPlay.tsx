// @ts-nocheck
// =============================================================
// DARTS FOOTBALL V13 — plan tactique conseillé + aperçu avant validation
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad"; // contrat historique conservé, remplacé visuellement par CompactFootballPad
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  buildFootballMatchStats,
  cloneFootballState,
  createFootballState,
  footballAccuracy,
  footballActionLabel,
  footballTacticalHint,
  footballVariantLabel,
  footballZoneLabel,
  getFootballAction,
  getFootballActivePlayer,
  getFootballActiveSide,
  getFootballPossessionSide,
  getFootballTargets,
  normalizeFootballConfig,
  pickFootballBotDarts,
  playFootballVisit,
  type FootballAction,
  type FootballConfigPayload,
  type FootballState,
} from "../lib/gameEngines/footballEngine";
import { buildFootballMomentumFromState, footballPerformanceRating } from "../lib/footballInsights";
import { buildDartsTelemetry } from "../lib/dartsTelemetry";
import { History } from "../lib/history";
import tickerFootball from "../assets/tickers/ticker_football.png";
import FootballEnd from "./FootballEnd";
import "../styles/football-play.css";

const GREEN = "#65e5aa";
const BLUE = "#35d0ff";
const RED = "#ff5b77";
const GOLD = "#ffd36b";
const SOFT = "#aeb8c9";
const WHITE = "#f7fbff";
const PLAYER_COLORS = [BLUE, RED, GREEN, GOLD, "#a78bfa", "#ff70c5", "#65e6d6", "#d7dde8"];
const GUIDE_KEY = "mss:football:guide-v12";

type UiDart = { v: number; mult: 1 | 2 | 3 };
type Overlay = null | "stats" | "log" | "teams";

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}

function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}

function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}

function gameDartLabel(dart: GameDart) {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number}`;
}

function normalizeConfig(props: any): FootballConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const decoded = record?.decoded || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || decoded?.config || decoded?.payload?.config || record?.config || props?.config || props?.params || {};
  return normalizeFootballConfig(raw);
}

function buildHitsBySegment(visits: any[]) {
  const out: Record<string, number> = {};
  visits.forEach((visit) => (visit.darts || []).forEach((dart: GameDart) => {
    const label = gameDartLabel(dart);
    out[label] = Number(out[label] || 0) + 1;
  }));
  return out;
}

function actionColor(action: FootballAction) {
  if (action === "defense") return RED;
  if (action === "goalkeeper" || action === "shot" || action === "penalty" || action === "classic_shot") return GOLD;
  if (action === "classic_possession") return BLUE;
  return GREEN;
}

function actionMeta(action: FootballAction) {
  if (action === "attack") return { title: "CONSTRUIS L’ATTAQUE", subtitle: "Touche une cible pour avancer vers le but", effects: ["S · +1 ZONE", "D · +2 ZONES", "T · +3 ZONES"] };
  if (action === "defense") return { title: "RÉCUPÈRE LE BALLON", subtitle: "Stoppe la progression adverse", effects: ["S · REPOUSSE", "D · INTERCEPTE", "T · CONTRE"] };
  if (action === "shot") return { title: "FRAPPE AU BUT", subtitle: "Touche une zone de tir", effects: ["S · CADRÉ", "D · PUISSANT", "T · BUT DIRECT"] };
  if (action === "goalkeeper") return { title: "FAIS L’ARRÊT", subtitle: "Une seule zone de parade suffit", effects: ["CIBLE · ARRÊT", "HORS CIBLE · BUT", "3 FLÉCHETTES"] };
  if (action === "penalty") return { title: "TIRE LE PENALTY", subtitle: "Une cible touchée = but", effects: ["CIBLE · BUT", "HORS CIBLE · RATÉ", "MORT SUBITE"] };
  if (action === "classic_possession") return { title: "PRENDS LA POSSESSION", subtitle: "Touche le centre de la cible", effects: ["BULL · BALLON", "DBULL · BALLON", "SINON · RIEN"] };
  return { title: "MARQUE LE BUT", subtitle: "N’importe quel double est valable", effects: ["DOUBLE · BUT", "DBULL · BUT", "SINON · PERDU"] };
}

function actionIcon(action: FootballAction) {
  if (action === "attack") return "➜";
  if (action === "defense") return "🛡️";
  if (action === "shot" || action === "classic_shot") return "🥅";
  if (action === "goalkeeper") return "🧤";
  if (action === "penalty") return "🎯";
  return "⚽";
}

function actionMissHint(state: FootballState, action: FootballAction) {
  if (action === "attack") return state.config.missLosesPossession ? "Aucune cible sur la volée = ballon perdu." : "Aucune cible = pas de progression, mais la possession reste en jeu.";
  if (action === "defense") return "Hors cible = pressing manqué, l’adversaire garde le ballon.";
  if (action === "shot") return "Hors cible = tir non cadré. Une cible S/D ouvre la parade du gardien.";
  if (action === "goalkeeper") return "Aucune zone de parade touchée = le but est accordé.";
  if (action === "penalty") return "Aucune cible touchée = penalty raté.";
  if (action === "classic_possession") return "Bull manqué = la possession ne change pas.";
  return "Aucun double = frappe manquée et ballon perdu.";
}

function actionFlow(action: FootballAction) {
  if (action === "defense") return { steps: ["DÉFENDRE", "RÉCUPÉRER", "CONTRER", "ATTAQUER"], active: 0 };
  if (action === "shot") return { steps: ["POSSESSION", "SURFACE", "TIR", "BUT"], active: 2 };
  if (action === "goalkeeper") return { steps: ["TIR SUBI", "PARADE", "RELANCE", "ATTAQUE"], active: 1 };
  if (action === "penalty") return { steps: ["PLACER", "VISER", "TIRER", "BUT"], active: 2 };
  if (action === "classic_possession") return { steps: ["BULL", "BALLON", "DOUBLE", "BUT"], active: 0 };
  if (action === "classic_shot") return { steps: ["BALLON", "DOUBLE", "BUT", "VICTOIRE"], active: 1 };
  return { steps: ["POSSESSION", "PROGRESSER", "SURFACE", "TIR"], active: 1 };
}

function contextualCoachTip(state: FootballState, action: FootballAction, targets: number[]) {
  const targetText = targets.length ? targets.slice(0, 3).join(" · ") : "";
  if (action === "attack") {
    if (state.ballPosition === 3) return `Depuis le milieu, sécurise ${targetText || "une cible"} en simple ou accélère avec un double.`;
    if (state.ballPosition <= 2 || state.ballPosition >= 4) return `Tu approches de la surface : un double ou un triple peut créer immédiatement une occasion.`;
    return `Construis proprement : une cible touchée suffit pour faire avancer le ballon.`;
  }
  if (action === "defense") return `Le simple repousse. Le double récupère le ballon. Le triple récupère ET lance la contre-attaque.`;
  if (action === "shot") return `Pour éviter la parade du gardien, cherche le triple ou le DBULL. S/D donnent un tir cadré.`;
  if (action === "goalkeeper") return `Une seule cible de parade touchée suffit : privilégie la zone la plus confortable.`;
  if (action === "penalty") return `Pas besoin de forcer : une seule cible valide transforme le penalty.`;
  if (action === "classic_possession") return `Le ballon se gagne au centre : BULL ou DBULL uniquement.`;
  return `Tu as le ballon : un DOUBLE valide suffit pour marquer.`;
}

function uiDartIsUseful(dart: UiDart, action: FootballAction, targets: number[]) {
  if (!dart || Number(dart.v) === 0) return false;
  if (action === "classic_possession") return Number(dart.v) === 25;
  if (action === "classic_shot") return Number(dart.v) === 25 ? dart.mult === 2 : dart.mult === 2;
  if (Number(dart.v) === 25) return true;
  return targets.includes(Number(dart.v));
}

type FootballRecommendation = {
  intent: "safe" | "balanced" | "bold";
  label: string;
  targetLabel: string;
  target: number | null;
  multiplier: 1 | 2 | 3 | null;
  outcome: string;
  reason: string;
  color: string;
};

function footballTacticalRecommendation(state: FootballState, action: FootballAction, targets: number[]): FootballRecommendation {
  const activeSide = getFootballActiveSide(state);
  const sideIndex = Math.max(0, state.sides.findIndex((side: any) => String(side.id) === String(activeSide?.id)));
  const otherIndex = sideIndex === 0 ? 1 : 0;
  const ownScore = Number(state.scoreBySide[state.sides[sideIndex]?.id] || 0);
  const otherScore = Number(state.scoreBySide[state.sides[otherIndex]?.id] || 0);
  const lateRound = Number(state.roundInPeriod || 0) >= Math.max(1, Math.ceil(Number(state.config.halfRounds || 1) * .66));
  const lateMatch = state.stage === "penalties" || state.stage === "extra_time" || (Number(state.period || 1) >= 2 && lateRound);
  let intent: FootballRecommendation["intent"] = "balanced";
  if (lateMatch && ownScore < otherScore) intent = "bold";
  else if (lateMatch && ownScore > otherScore) intent = "safe";

  const primaryTarget = targets[0] || null;
  const intentLabel = intent === "safe" ? "SÉCURISE" : intent === "bold" ? "TENTE LE COUP" : "JOUE ÉQUILIBRÉ";
  const color = intent === "safe" ? GREEN : intent === "bold" ? GOLD : BLUE;
  const reason = lateMatch
    ? ownScore < otherScore ? "Tu es derrière : cherche l’action qui peut renverser le match." : ownScore > otherScore ? "Tu mènes : privilégie l’action la plus fiable." : "Le match est serré : garde un bon équilibre risque / récompense."
    : "Le match est encore ouvert : privilégie une action rentable sans tout risquer.";

  if (action === "classic_possession") return { intent: "safe", label: "PRENDS LE BALLON", targetLabel: "BULL", target: 25, multiplier: 1, outcome: "POSSESSION", reason: "Le centre suffit pour récupérer le ballon.", color: BLUE };
  if (action === "classic_shot") return { intent, label: intentLabel, targetLabel: "DOUBLE", target: null, multiplier: 2, outcome: "BUT", reason: "Choisis le double que tu maîtrises le mieux.", color: GOLD };
  if (action === "goalkeeper") return { intent: "safe", label: "FERME L’ANGLE", targetLabel: primaryTarget ? `S${primaryTarget}` : "ZONE", target: primaryTarget, multiplier: 1, outcome: "ARRÊT", reason: "Une seule zone de parade touchée suffit pour stopper le tir.", color: GOLD };
  if (action === "penalty") return { intent: "safe", label: "PLACE TON TIR", targetLabel: primaryTarget ? `S${primaryTarget}` : "CIBLE", target: primaryTarget, multiplier: 1, outcome: "BUT", reason: "Une cible valide suffit : inutile de forcer le multiplicateur.", color: GOLD };

  const multiplier = (intent === "safe" ? 1 : intent === "bold" ? 3 : 2) as 1 | 2 | 3;
  const prefix = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  const targetLabel = primaryTarget ? `${prefix}${primaryTarget}` : prefix;
  if (action === "defense") return { intent, label: intentLabel, targetLabel, target: primaryTarget, multiplier, outcome: multiplier === 1 ? "REPOUSSE" : multiplier === 2 ? "INTERCEPTION" : "INTERCEPTION + CONTRE", reason, color };
  if (action === "shot") return { intent, label: intentLabel, targetLabel, target: primaryTarget, multiplier, outcome: multiplier === 3 ? "BUT DIRECT" : multiplier === 2 ? "TIR PUISSANT" : "TIR CADRÉ", reason, color };
  return { intent, label: intentLabel, targetLabel, target: primaryTarget, multiplier, outcome: multiplier === 1 ? "+1 ZONE" : multiplier === 2 ? "+2 ZONES" : "+3 ZONES", reason, color };
}

function footballInputProjection(state: FootballState, darts: UiDart[]) {
  if (!darts.length || state.phase === "finished") return null;
  try {
    const preview = playFootballVisit(state, darts.map(uiToGameDart));
    const visit = preview.visits[preview.visits.length - 1];
    if (!visit) return null;
    const result = visitOutcomeMeta(visit);
    const beforeSide = state.sides[state.possessionSideIndex];
    const afterSide = preview.sides[preview.possessionSideIndex];
    return {
      preview,
      visit,
      result,
      beforeSide,
      afterSide,
      possessionChanged: String(beforeSide?.id || "") !== String(afterSide?.id || ""),
      ballBefore: state.ballPosition,
      ballAfter: preview.ballPosition,
      scoreBefore: state.sides.map((side: any) => Number(state.scoreBySide[side.id] || 0)),
      scoreAfter: preview.sides.map((side: any) => Number(preview.scoreBySide[side.id] || 0)),
    };
  } catch {
    return null;
  }
}

function visitOutcomeMeta(visit: any) {
  if (!visit) return { icon: "⚽", title: "COUP D’ENVOI", color: GREEN, detail: "Construis la première action." };
  const types = new Set((visit.events || []).map((event: any) => String(event.type)));
  if (types.has("goal") || types.has("penalty_goal")) return { icon: "⚽", title: "BUT !", color: GOLD, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("save")) return { icon: "🧤", title: "ARRÊT", color: GOLD, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("interception") || types.has("possession")) return { icon: "⚡", title: "BALLON RÉCUPÉRÉ", color: BLUE, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("shot_on_target")) return { icon: "🥅", title: "TIR CADRÉ", color: GOLD, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("counter")) return { icon: "↗", title: "CONTRE-ATTAQUE", color: GREEN, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("advance")) return { icon: "➜", title: "PROGRESSION", color: GREEN, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("clearance")) return { icon: "🛡️", title: "BALLON REPOUSSÉ", color: RED, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("turnover")) return { icon: "↔", title: "BALLON PERDU", color: RED, detail: (visit.events || []).map((event: any) => event.label).join(" · ") };
  if (types.has("penalty_miss") || types.has("shot_miss") || types.has("failed") || types.has("miss")) return { icon: "✕", title: "ACTION MANQUÉE", color: RED, detail: (visit.events || []).map((event: any) => event.label).join(" · ") || "Aucune cible validée." };
  return { icon: "✓", title: "VOLÉE TERMINÉE", color: SOFT, detail: (visit.events || []).map((event: any) => event.label).join(" · ") || "Action enregistrée." };
}

function FootballTransition({ state, onGuide }: { state: FootballState; onGuide: () => void }) {
  const visit = state.visits[state.visits.length - 1];
  const result = visitOutcomeMeta(visit);
  const action = getFootballAction(state);
  const nextMeta = actionMeta(action);
  const nextColor = actionColor(action);
  const possessionChanged = Boolean(visit && visit.possessionSideIdBefore !== visit.possessionSideIdAfter);

  return <section className="football-transition football-glass">
    <div className="football-transition__result">
      <span className="football-transition__icon" style={{ color: result.color, borderColor: `${result.color}55`, background: `${result.color}12` }}>{result.icon}</span>
      <div>
        <small>VOLÉE PRÉCÉDENTE</small>
        <strong style={{ color: result.color }}>{result.title}</strong>
        <p>{result.detail}</p>
      </div>
    </div>
    <div className="football-transition__arrow">→</div>
    <div className="football-transition__next">
      <div>
        <small>MAINTENANT</small>
        <strong style={{ color: nextColor }}>{nextMeta.title}</strong>
        <p>{possessionChanged ? "La possession a changé. " : ""}{nextMeta.subtitle}</p>
      </div>
      <button type="button" className="football-transition__help" onClick={onGuide} aria-label="Revoir le guide de jeu">?</button>
    </div>
  </section>;
}

const GUIDE_STEPS = [
  { icon: "🏟️", title: "LIS LE TERRAIN", text: "Le ballon, le sens de l’attaque et le but à viser sont toujours visibles. La zone éclairée est la position actuelle." },
  { icon: "🧭", title: "SUIS LE PLAN DE JEU", text: "Le bandeau PLAN DE JEU te montre l’étape actuelle : possession, progression, surface, tir ou défense." },
  { icon: "🎯", title: "VISE CE QUI EST INDIQUÉ", text: "TON ACTION affiche uniquement les secteurs utiles maintenant, avec l’effet du simple, du double et du triple." },
  { icon: "👁", title: "REGARDE L’APERÇU", text: "Dès que tu saisis une fléchette, APERÇU SI TU VALIDES MAINTENANT te montre le résultat probable : progression, possession ou score." },
  { icon: "✅", title: "VALIDE TA VOLÉE", text: "Les fléchettes utiles passent au vert avant validation. Après la volée, le résultat et la prochaine mission sont affichés côte à côte." },
];

function FootballGuide({ step, onStep, onClose }: { step: number; onStep: (value: number) => void; onClose: () => void }) {
  const item = GUIDE_STEPS[Math.max(0, Math.min(GUIDE_STEPS.length - 1, step))];
  return <div className="football-guide-backdrop" role="dialog" aria-modal="true" aria-label="Guide Darts Football">
    <div className="football-guide">
      <div className="football-guide__top">
        <span>GUIDE EXPRESS · {step + 1}/{GUIDE_STEPS.length}</span>
        <button type="button" onClick={onClose}>PASSER</button>
      </div>
      <div className="football-guide__icon">{item.icon}</div>
      <h2>{item.title}</h2>
      <p>{item.text}</p>
      <div className="football-guide__dots">{GUIDE_STEPS.map((_, index) => <span key={index} className={index === step ? "is-active" : ""} />)}</div>
      <div className="football-guide__actions">
        <button type="button" disabled={step === 0} onClick={() => onStep(Math.max(0, step - 1))}>← RETOUR</button>
        {step < GUIDE_STEPS.length - 1
          ? <button type="button" className="is-primary" onClick={() => onStep(step + 1)}>SUIVANT →</button>
          : <button type="button" className="is-primary" onClick={onClose}>⚽ JOUER</button>}
      </div>
    </div>
  </div>;
}

function FootballFlow({ state }: { state: FootballState }) {
  const action = getFootballAction(state);
  const flow = actionFlow(action);
  const color = actionColor(action);
  return <section className="football-flow football-glass" aria-label="Étapes de l’action en cours">
    <div className="football-flow__label" style={{ color }}>PLAN DE JEU</div>
    <div className="football-flow__steps">{flow.steps.map((step, index) => <React.Fragment key={step}>
      <span className={`football-flow__step ${index === flow.active ? "is-active" : ""} ${index < flow.active ? "is-done" : ""}`} style={index === flow.active ? { color, borderColor: `${color}88`, background: `${color}12` } : undefined}>{step}</span>
      {index < flow.steps.length - 1 ? <b className="football-flow__arrow">›</b> : null}
    </React.Fragment>)}</div>
  </section>;
}

function Rules({ config }: { config: FootballConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: GREEN }}>{footballVariantLabel(config.variant).toUpperCase()}</strong><br />La mission affichée change automatiquement selon la possession et la position du ballon.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />S = +1 zone, D = +2, T = +3. BULL et DBULL produisent une longue passe.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />S repousse, D intercepte, T intercepte et lance une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Triple ou DBULL marque directement. Un tir S/D peut ouvrir une volée de gardien.</div>
    <div><strong style={{ color: GREEN }}>ANNULER</strong><br />Efface la volée en cours ; à vide, restaure la dernière volée validée.</div>
  </div>;
}

function FootballField({ state }: { state: FootballState }) {
  const ballLeft = `${Math.max(4, Math.min(96, (state.ballPosition / 6) * 100))}%`;
  const possession = getFootballPossessionSide(state);
  const possessionIndex = state.possessionSideIndex;
  const zones = ["BUT", "SURFACE", "DÉFENSE", "MILIEU", "ATTAQUE", "SURFACE", "BUT"];
  const leftColor = state.sides[0]?.color || BLUE;
  const rightColor = state.sides[1]?.color || RED;
  const directionStep = possessionIndex === 0 ? 1 : -1;
  const nextZone = Math.max(0, Math.min(6, state.ballPosition + directionStep));
  const hasPassed = (index: number) => possessionIndex === 0 ? index < state.ballPosition : index > state.ballPosition;

  return <div className="football-field football-glass">
    <div className="football-field__outline" />
    <div className="football-field__midline" />
    <div className="football-field__circle" />
    <div className="football-field__box is-left" />
    <div className="football-field__box is-right" />
    <div className="football-field__goal is-left" style={{ color: leftColor }} />
    <div className="football-field__goal is-right" style={{ color: rightColor }} />
    <div className="football-field__team is-left" style={{ color: leftColor }}>{state.sides[0]?.name}</div>
    <div className="football-field__team is-right" style={{ color: rightColor }}>{state.sides[1]?.name}</div>
    <div className={`football-field__direction ${possessionIndex === 0 ? "is-right" : "is-left"}`} style={{ color: possession?.color || GREEN }}>{possessionIndex === 0 ? "➜➜" : "➜➜"}</div>
    <div className={`football-field__objective ${possessionIndex === 0 ? "is-right" : "is-left"}`} style={{ color: possession?.color || GREEN }}>{possessionIndex === 0 ? "BUT À ATTAQUER ➜" : "← BUT À ATTAQUER"}</div>
    <div className="football-field__status" style={{ color: possession?.color || GREEN }}>⚡ {possession?.name} · BALLON {footballZoneLabel(state.ballPosition)}</div>
    <div className="football-field__ball" style={{ left: ballLeft, ["--football-possession-glow" as any]: `${possession?.color || GREEN}66` }}>
      <div className="football-field__ball-core">⚽</div>
    </div>
    <div className="football-field__zones">{zones.map((zone, index) => <span
      key={`${zone}-${index}`}
      className={`football-field__zone ${index === state.ballPosition ? "is-active" : ""} ${index === nextZone ? "is-next" : ""} ${hasPassed(index) ? "is-passed" : ""}`}
      style={{ ["--football-zone-color" as any]: possession?.color || GREEN }}
    >{zone}</span>)}</div>
  </div>;
}

function MissionCard({ state, recommendation }: { state: FootballState; recommendation: FootballRecommendation }) {
  const action = getFootballAction(state);
  const meta = actionMeta(action);
  const color = actionColor(action);
  const targets = getFootballTargets(state, action);
  const specialTargets = action === "classic_possession" ? ["BULL", "DBULL"] : action === "classic_shot" ? ["TOUT DOUBLE", "DBULL"] : [];
  const visibleTargets = specialTargets.length ? specialTargets : targets;

  return <section className="football-mission-card football-glass" style={{ borderColor: `${color}66` }}>
    <div className="football-mission-head">
      <div className="football-mission-identity">
        <span className="football-mission-icon" style={{ color, borderColor: `${color}55`, background: `${color}12` }}>{actionIcon(action)}</span>
        <div><div className="football-mission-eyebrow" style={{ color }}>TON ACTION</div><div className="football-mission-title" style={{ color }}>{meta.title}</div></div>
      </div>
      <div className="football-mission-turn">{state.stage === "penalties" ? `TIR ${Math.floor(state.turnCount / 2) + 1}` : `P${state.period} · T${state.roundInPeriod}`}</div>
    </div>
    <div className="football-mission-subtitle">{meta.subtitle}</div>

    <div className="football-mission-section-label">À VISER MAINTENANT</div>
    <div className="football-targets">
      {visibleTargets.map((target: any, index: number) => <span key={String(target)} className={`football-target-chip ${index === 0 ? "is-primary" : ""}`} style={{ color }}>{target}</span>)}
    </div>

    {state.config.coachHints !== false ? <div className="football-recommended-play" style={{ ["--football-plan-color" as any]: recommendation.color }}>
      <div className="football-recommended-play__head"><span>🧠 PLAN CONSEILLÉ</span><strong>{recommendation.label}</strong></div>
      <div className="football-recommended-play__main">
        <b>{recommendation.targetLabel}</b>
        <span>→</span>
        <strong>{recommendation.outcome}</strong>
      </div>
      <p>{recommendation.reason}</p>
    </div> : null}

    {state.config.coachHints !== false ? <>
      <div className="football-mission-section-label">SI TU TOUCHES</div>
      <div className="football-effects">{meta.effects.map((effect) => {
        const [head, ...tail] = String(effect).split("·");
        return <span key={effect} className="football-effect"><strong>{head.trim()}</strong><small>{tail.join("·").trim()}</small></span>;
      })}</div>
      <div className="football-coach-tip"><span>💡 CONSEIL</span><strong>{contextualCoachTip(state, action, targets)}</strong></div>
      <div className="football-miss-hint"><span>✕ SI TU RATES</span><strong>{actionMissHint(state, action)}</strong></div>
    </> : null}
  </section>;
}

function FootballProjectionStrip({ projection }: { projection: any }) {
  if (!projection) return null;
  const { result, preview, afterSide, possessionChanged, ballBefore, ballAfter, scoreBefore, scoreAfter } = projection;
  const scoreChanged = scoreBefore[0] !== scoreAfter[0] || scoreBefore[1] !== scoreAfter[1];
  const ballChanged = ballBefore !== ballAfter;
  return <div className="football-projection" style={{ ["--football-projection-color" as any]: result.color }}>
    <div className="football-projection__head"><span>👁 APERÇU SI TU VALIDES MAINTENANT</span><strong style={{ color: result.color }}>{result.icon} {result.title}</strong></div>
    <div className="football-projection__facts">
      {scoreChanged ? <span><small>SCORE</small><b>{scoreAfter[0]} - {scoreAfter[1]}</b></span> : null}
      {ballChanged ? <span><small>BALLON</small><b>{footballZoneLabel(ballBefore)} → {footballZoneLabel(ballAfter)}</b></span> : null}
      {possessionChanged ? <span><small>POSSESSION</small><b>{afterSide?.name || "Adversaire"}</b></span> : null}
      {!scoreChanged && !ballChanged && !possessionChanged ? <span><small>RÉSULTAT</small><b>{result.detail || "Action enregistrée"}</b></span> : null}
      {preview.phase === "finished" ? <span className="is-final"><small>ISSUE</small><b>FIN DU MATCH</b></span> : null}
    </div>
  </div>;
}

function QuickAction({ icon, label, value, color, onClick }: any) {
  return <button type="button" className="football-quick-action" onClick={onClick} style={{ border: `1px solid ${color}55`, background: `linear-gradient(180deg,${color}14,rgba(2,8,5,.94))` }}>
    <span className="football-quick-action__icon">{icon}</span>
    <span className="football-quick-action__label">{label}</span>
    <strong className="football-quick-action__value" style={{ color }}>{value}</strong>
  </button>;
}

function dartPreviewLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (Number(dart.v) === 0) return "MISS";
  if (Number(dart.v) === 25) return dart.mult === 2 ? "DB" : "B";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function CompactFootballPad({ currentThrow, multiplier, targets, targetColor, action, notice, recommendation, projection, onSimple, onDouble, onTriple, onNumber, onBull, onCancel, onBackspace, onValidate, disabled }: any) {
  const rows = [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13], [14, 15, 16, 17, 18, 19, 20]];
  const targetSet = new Set(action === "classic_shot" || action === "classic_possession" ? [] : targets);
  const selectedEffect = actionMeta(action).effects[Math.max(0, Math.min(2, Number(multiplier || 1) - 1))] || "";
  const usefulCount = currentThrow.filter((dart: UiDart) => uiDartIsUseful(dart, action, targets)).length;

  return <div className="football-compact-pad">
    <div className="football-pad-status">
      <div className="football-pad-notice" style={{ color: String(notice || "").includes("BUT") ? GOLD : SOFT }}>{notice || "Saisis jusqu’à trois fléchettes puis valide la volée."}</div>
      <div className="football-pad-preview">{[0, 1, 2].map((index) => {
        const dart = currentThrow[index];
        const useful = dart ? uiDartIsUseful(dart, action, targets) : false;
        return <span key={index} className={`football-pad-preview-chip ${dart ? (useful ? "is-useful" : "is-off-target") : ""}`}>{dart ? <>{dartPreviewLabel(dart)} <b>{useful ? "✓" : "×"}</b></> : "—"}</span>;
      })}</div>
    </div>

    <div className={`football-pad-live-feedback ${currentThrow.length && usefulCount === 0 ? "is-warning" : ""}`}>
      <strong>{currentThrow.length ? `${usefulCount}/${currentThrow.length} FLÉCHETTE${currentThrow.length > 1 ? "S" : ""} UTILE${usefulCount > 1 ? "S" : ""}` : "PRÊT À JOUER"}</strong>
      <span>{currentThrow.length ? `${3 - currentThrow.length} fléchette${3 - currentThrow.length > 1 ? "s" : ""} restante${3 - currentThrow.length > 1 ? "s" : ""}` : "Les secteurs marqués CIBLE sont ceux qui font avancer l’action."}</span>
    </div>

    <FootballProjectionStrip projection={projection} />

    <div className="football-pad-choice"><span>CHOIX ACTUEL</span><strong style={{ color: targetColor }}>{selectedEffect}</strong>{recommendation ? <em>PLAN · {recommendation.targetLabel}</em> : null}</div>

    <div className="football-pad-modes">
      <button type="button" className={`football-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""} ${recommendation?.multiplier === 1 ? "is-recommended" : ""}`} onClick={onSimple} disabled={disabled}><span>SIMPLE</span><small>SÛR</small></button>
      <button type="button" className={`football-pad-mode ${multiplier === 2 ? "is-active is-double" : ""} ${recommendation?.multiplier === 2 ? "is-recommended" : ""}`} onClick={onDouble} disabled={disabled}><span>DOUBLE</span><small>FORT</small></button>
      <button type="button" className={`football-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""} ${recommendation?.multiplier === 3 ? "is-recommended" : ""}`} onClick={onTriple} disabled={disabled}><span>TRIPLE</span><small>MAX</small></button>
      <button type="button" className="football-pad-undo" onClick={onCancel} disabled={disabled}>↶</button>
    </div>

    {rows.map((row, rowIndex) => <div key={rowIndex} className="football-pad-row">{row.map((number) => <button
      key={number}
      type="button"
      className={`football-pad-cell ${number === 0 ? "is-miss" : ""} ${targetSet.has(number) ? "is-target" : ""} ${recommendation?.target === number ? "is-recommended" : ""}`}
      style={targetSet.has(number) ? { ["--football-target-color" as any]: targetColor } : undefined}
      onClick={() => onNumber(number)}
      disabled={disabled}
    >{number === 0 ? "MISS" : <><span>{number}</span>{recommendation?.target === number ? <small>PLAN</small> : targetSet.has(number) ? <small>CIBLE</small> : null}</>}</button>)}</div>)}

    <div className="football-pad-footer">
      <button type="button" className={`football-pad-bull ${multiplier === 2 ? "is-dbull" : ""} ${recommendation?.target === 25 ? "is-recommended" : ""}`} onClick={onBull} disabled={disabled}>{multiplier === 2 ? "DBULL" : "BULL"}</button>
      <button type="button" className="football-pad-backspace" onClick={onBackspace} disabled={disabled || !currentThrow.length}>⌫</button>
      <button type="button" className="football-pad-validate" onClick={onValidate} disabled={disabled || !currentThrow.length}>VALIDER · {currentThrow.length}/3</button>
    </div>
  </div>;
}

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  React.useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, []);

  return <div role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.78)", backdropFilter: "blur(7px)" }}>
    <div style={{ width: "min(620px,100%)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 22, padding: 13, border: `1px solid ${color}77`, background: "linear-gradient(180deg,#101713,#050806)", boxShadow: `0 0 45px ${color}22` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div><div style={{ color, fontSize: 12, fontWeight: 1150, letterSpacing: 1 }}>{title}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{subtitle}</div></div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${color}66`, background: `${color}12`, color, fontWeight: 1100 }}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

function Kpi({ label, value, detail, color = GREEN }: any) {
  return <div style={{ borderRadius: 14, padding: 10, border: `1px solid ${color}44`, background: `${color}0c` }}>
    <div style={{ color: SOFT, fontSize: 7, fontWeight: 1000 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1150 }}>{value}</div>
    {detail ? <div style={{ marginTop: 2, color: SOFT, fontSize: 7 }}>{detail}</div> : null}
  </div>;
}

function sideStat(state: FootballState, sideIndex: number, key: string) {
  const side = state.sides[sideIndex];
  return (side?.playerIds || []).reduce((total: number, id: string) => total + Number((state.statsByPlayer[id] as any)?.[key] || 0), 0);
}

function possessionPercent(state: FootballState, sideIndex: number) {
  if (!state.visits.length) return 50;
  const sideId = state.sides[sideIndex]?.id;
  const touches = state.visits.filter((visit: any) => visit.possessionSideIdBefore === sideId).length;
  return Math.round((touches / state.visits.length) * 100);
}

function sideEfficiency(state: FootballState, sideIndex: number) {
  const darts = sideStat(state, sideIndex, "darts");
  const successful = sideStat(state, sideIndex, "successfulActions");
  const shots = sideStat(state, sideIndex, "shots");
  const goals = sideStat(state, sideIndex, "goals");
  const defenseVisits = sideStat(state, sideIndex, "defenseVisits");
  const interceptions = sideStat(state, sideIndex, "interceptions");
  const keeperVisits = sideStat(state, sideIndex, "goalkeeperVisits");
  const saves = sideStat(state, sideIndex, "saves");
  const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;
  return {
    accuracy: pct(successful, darts),
    conversion: pct(goals, shots),
    defense: pct(interceptions, defenseVisits),
    keeper: pct(saves, keeperVisits),
  };
}

function buildMatchHighlights(state: FootballState, rows: any[]) {
  const by = (score: (row: any) => number) => [...rows].sort((a, b) => score(b) - score(a))[0] || null;
  return {
    mvp: by((row) => Number(row.goals || 0) * 12 + Number(row.saves || 0) * 6 + Number(row.interceptions || 0) * 4 + Number(row.successfulActions || 0) + Number(row.counterAttacks || 0) * 2),
    topScorer: by((row) => Number(row.goals || 0)),
    topKeeper: by((row) => Number(row.saves || 0)),
    topDefender: by((row) => Number(row.interceptions || 0) + Number(row.tackles || 0) * .35),
    mostAccurate: by((row) => Number(row.accuracy || 0)),
    longestProgress: by((row) => Number(row.bestProgress || 0)),
  };
}

export default function FootballPlay(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const onFinish = props?.onFinish;
  const config = React.useMemo(() => normalizeConfig(props), []);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || profile?.profileId || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length >= 2 ? ordered : [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => {
    const decoded = resumeRecord?.decoded || null;
    const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.stateSnapshot || decoded?.stateSnapshot || decoded?.payload?.stateSnapshot || null;
    return snapshot?.mode === "football" ? cloneFootballState(snapshot) : createFootballState(players, config);
  }, []);
  const [state, setState] = React.useState<FootballState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<FootballState[]>([]);
  const [notice, setNotice] = React.useState(footballTacticalHint(initialState));
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const [guideStep, setGuideStep] = React.useState(0);
  const [showGuide, setShowGuide] = React.useState(() => {
    if (config.coachHints === false || resumeRecord) return false;
    try { return localStorage.getItem(GUIDE_KEY) !== "1"; } catch { return false; }
  });
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const activePlayer = getFootballActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeSide = getFootballActiveSide(state);
  const activeStats = state.statsByPlayer[String(activePlayer?.id || "")] || {};
  const actionNow = getFootballAction(state);
  const targetsNow = getFootballTargets(state, actionNow);
  const currentActionColor = actionColor(actionNow);
  const tacticalRecommendation = React.useMemo(() => footballTacticalRecommendation(state, actionNow, targetsNow), [state, actionNow, targetsNow.join("|")]);
  const inputProjection = React.useMemo(() => footballInputProjection(state, throwDarts), [state, throwDarts]);
  const score0 = Number(state.scoreBySide[state.sides[0]?.id] || 0);
  const score1 = Number(state.scoreBySide[state.sides[1]?.id] || 0);
  const lastVisit = state.visits[state.visits.length - 1];
  const lastEvent = lastVisit?.events?.map((event: any) => event.label).join(" · ") || "Coup d’envoi : construis la première attaque.";
  const stageLabel = state.stage === "penalties" ? "TIRS AU BUT" : state.stage === "extra_time" ? "PROLONGATION" : config.variant === "first_to" ? `PREMIER À ${config.goalTarget}` : config.variant === "classic" ? `CLASSIC · ${config.goalTarget} BUTS` : config.variant === "golden_goal" ? "GOLDEN GOAL" : `PÉRIODE ${state.period}`;
  const roundLimit = state.stage === "extra_time" ? config.extraRounds : config.halfRounds;
  const penaltyDone = Math.max((state.penaltyAttemptsBySide[state.sides[0]?.id] || []).length, (state.penaltyAttemptsBySide[state.sides[1]?.id] || []).length);
  const progressPercent = state.stage === "penalties" ? Math.min(100, (penaltyDone / Math.max(1, config.penaltyShots)) * 100) : (config.variant === "first_to" || config.variant === "classic") ? Math.min(100, (Math.max(score0, score1) / Math.max(1, config.goalTarget)) * 100) : Math.min(100, (state.roundInPeriod / Math.max(1, roundLimit)) * 100);
  const possession0 = possessionPercent(state, 0);
  const possession1 = 100 - possession0;
  const efficiency0 = sideEfficiency(state, 0);
  const efficiency1 = sideEfficiency(state, 1);
  const momentum = buildFootballMomentumFromState(state, 6);
  const activeRating = footballPerformanceRating(activeStats);
  const momentumLeader = momentum.leaderSideId
    ? state.sides.find((side: any) => String(side.id) === String(momentum.leaderSideId))
    : null;

  function closeGuide() {
    try { localStorage.setItem(GUIDE_KEY, "1"); } catch {}
    setShowGuide(false);
    setGuideStep(0);
  }

  function backToConfig() {
    if (typeof go === "function") go("football_config", { config });
  }

  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.phase === "finished" || throwDarts.length >= 3) return;
    setThrowDarts((previous) => [...previous, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, 3));
  }

  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3);
    if (!darts.length || state.phase === "finished") return;
    setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
    const next = playFootballVisit(state, darts.map(uiToGameDart));
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || footballTacticalHint(next));
    if (next.phase === "finished") setShowEnd(true);
  }

  function cancelOrUndo() {
    if (throwDarts.length) {
      setThrowDarts([]);
      setMultiplier(1);
      setNotice("Volée effacée.");
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) {
      setNotice("Aucune volée à annuler.");
      return;
    }
    setState(previous);
    setUndoStack((stack) => stack.slice(0, -1));
    setShowEnd(false);
    autoSavedRef.current = "";
    setNotice("Dernière volée annulée.");
  }

  function resetMatch() {
    matchIdRef.current = `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = createFootballState(players, config);
    setState(next);
    setThrowDarts([]);
    setUndoStack([]);
    setOverlay(null);
    setShowEnd(false);
    setNotice(footballTacticalHint(next));
    autoSavedRef.current = "";
  }

  React.useEffect(() => {
    if (state.phase === "finished" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const gameDarts = pickFootballBotDarts(state, config.botLevel);
      setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
      const next = playFootballVisit(state, gameDarts);
      setState(next);
      setThrowDarts([]);
      setMultiplier(1);
      setBotThinking(false);
      const visit = next.visits[next.visits.length - 1];
      setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || "Volée BOT validée.");
      if (next.phase === "finished") setShowEnd(true);
    }, 650);
    return () => {
      window.clearTimeout(timer);
      setBotThinking(false);
    };
  }, [state.activeSideIndex, state.turnCount, state.phase, state.pendingShot?.target]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished";
    const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player: any, index: number) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || {};
      const sideIndex = state.sideByPlayer[player.id] ?? 0;
      const side = state.sides[sideIndex];
      const visits = state.visits.filter((visit: any) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit: any) => visit.darts.map((dart: any, dartIndex: number) => ({ ...dart, label: visit.labels[dartIndex], period: visit.period, round: visit.round, turn: visit.turn, action: visit.action, targets: visit.targets, events: visit.events, dartIndex: dartIndex + 1 })));
      const won = finished && state.winnerPlayerIds.includes(player.id);
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: side?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        sideId: side?.id,
        sideName: side?.name,
        rank: won ? 1 : state.draw ? 1 : 2,
        win: won,
        winner: won,
        ...stats,
        accuracy: footballAccuracy(stats),
        visitsHistory: visits,
        visitHistory: visits,
        dartsDetail,
        hitsBySegment: buildHitsBySegment(visits),
        score: Number(state.scoreBySide[side?.id] || 0),
      };
    });
    const matchStats = buildFootballMatchStats(state);
    const winnerSides = state.sides.filter((side) => state.winnerSideIds.includes(side.id));
    const records = buildMatchHighlights(state, playerRows);
    const summary: any = {
      kind: "football",
      mode: "football",
      sport: "darts",
      variant: config.variant,
      variantLabel: footballVariantLabel(config.variant),
      finished,
      draw: state.draw,
      statisticsVersion: 4,
      telemetryVersion: 1,
      records,
      winnerId: finished ? state.winnerPlayerIds[0] || null : null,
      winnerIds: finished ? state.winnerPlayerIds : [],
      winnerSideIds: finished ? state.winnerSideIds : [],
      winnerName: finished ? (state.draw ? "Match nul" : winnerSides.map((side) => side.name).join(" / ")) : null,
      players: playerRows,
      perPlayer: playerRows,
      rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      visits: state.visits,
      matchStats,
      config,
      scoreBySide: state.scoreBySide,
      scoreLine: `${state.sides[0]?.name} ${score0} - ${score1} ${state.sides[1]?.name}`,
      game: { mode: "football", variant: config.variant, halfRounds: config.halfRounds, tieBreaker: config.tieBreaker, goalTarget: config.goalTarget, penaltyShots: config.penaltyShots, targetDifficulty: config.targetDifficulty },
    };
    const record: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "football",
      mode: "football",
      sport: "darts",
      status,
      statisticsVersion: 4,
      telemetryVersion: 1,
      createdAt: state.startedAt,
      startedAt: state.startedAt,
      updatedAt: now,
      ...(finished ? { finishedAt: now, endedAt: now } : {}),
      winnerId: summary.winnerId,
      winnerIds: summary.winnerIds,
      winnerName: summary.winnerName,
      players: playerRows,
      resumeId: matchIdRef.current,
      resume: { config, state: cloneFootballState(state), updatedAt: now },
      game: summary.game,
      summary,
      payload: {
        kind: "football",
        mode: "football",
        sport: "darts",
        variant: config.variant,
        statisticsVersion: 4,
        telemetryVersion: 1,
        config,
        players: playerRows,
        summary,
        visits: state.visits,
        visitHistory: state.visits,
        events: state.visits,
        stateSnapshot: cloneFootballState(state),
        stats: { sport: "darts", mode: "football", variant: config.variant, players: playerRows, match: matchStats, global: matchStats },
      },
    };
    const telemetry = buildDartsTelemetry(record, record.payload);
    if (telemetry) {
      record.payload.telemetry = telemetry;
      record.payload.dartTelemetry = telemetry;
      record.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      record.summary.telemetryExact = true;
      record.summary.telemetryCoverage = "full";
    }
    return record;
  }

  React.useEffect(() => {
    if (state.phase === "finished" || state.visits.length === 0) return;
    const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 260);
    return () => window.clearTimeout(timer);
  }, [state]);

  React.useEffect(() => {
    if (state.phase !== "finished") return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try {
      onFinish?.(buildHistoryRecord("finished"), { navigate: false });
    } catch {
      void (History as any).upsert(buildHistoryRecord("finished"));
    }
  }, [state.phase]);

  const inputDisabled = botThinking || state.phase === "finished" || throwDarts.length >= 3;

  return <div className="football-play-page" style={{ color: theme?.text || WHITE }}>
    <PageHeader tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={backToConfig} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<Rules config={config} />} />} />

    <main className="football-play-main">
      <section className="football-scoreboard football-glass">
        <div className="football-score-team">
          <div className="football-score-team__name" style={{ color: state.sides[0]?.color || BLUE }}>{state.sides[0]?.name}</div>
          <div className="football-score-team__score">{score0}</div>
        </div>
        <div className="football-score-center">
          <div className="football-score-center__stage">{stageLabel}</div>
          <div className="football-score-center__meta">{footballVariantLabel(config.variant)} · TOUR {state.roundInPeriod}</div>
          <div className="football-score-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        <div className="football-score-team is-away">
          <div className="football-score-team__name" style={{ color: state.sides[1]?.color || RED }}>{state.sides[1]?.name}</div>
          <div className="football-score-team__score">{score1}</div>
        </div>
      </section>

      <FootballField state={state} />
      <FootballFlow state={state} />

      <FootballTransition state={state} onGuide={() => { setGuideStep(0); setShowGuide(true); }} />

      <div className="football-command-row">
        <section className="football-player-card football-glass" style={{ borderColor: `${activeSide?.color || GREEN}55` }}>
          <ProfileAvatar profile={activeProfile} size={38} />
          <div style={{ minWidth: 0 }}>
            <div className="football-player-card__eyebrow" style={{ color: activeSide?.color || GREEN }}>{botThinking ? "BOT EN RÉFLEXION" : "JOUEUR ACTIF"}</div>
            <div className="football-player-card__name">{playerName(activeProfile)}</div>
            <div className="football-player-card__stats">{activeStats.goals || 0} but · {activeStats.shotsOnTarget || 0} cadré · {activeStats.interceptions || 0} interception · <strong style={{ color: GOLD }}>NOTE {activeRating.toFixed(1)}</strong></div>
          </div>
        </section>
        <MissionCard state={state} recommendation={tacticalRecommendation} />
      </div>

      <section className="football-input-zone">
        {config.scoreInputMethod === "dartboard" ? <div className="football-dartboard-shell football-glass">
          <div style={{ width: "100%", color: String(notice || "").includes("BUT") ? GOLD : SOFT, fontSize: 7, fontWeight: 900, textAlign: "center", lineHeight: 1.3 }}>{notice}</div>
          <DartboardClickable onHit={(segment, mult) => addDart(segment, mult)} multiplier={multiplier} size={Math.min(260, typeof window !== "undefined" ? window.innerWidth - 30 : 250)} disabled={inputDisabled} />
          <FootballProjectionStrip projection={inputProjection} />
          <div className="football-dartboard-actions">
            <button type="button" onClick={cancelOrUndo} className="football-dartboard-action" style={{ border: `1px solid ${RED}66`, background: `${RED}12`, color: RED }}>↶ ANNULER</button>
            <div style={{ display: "grid", placeItems: "center", color: activeSide?.color || GREEN, fontSize: 13, fontWeight: 1200 }}>{throwDarts.length}/3</div>
            <button type="button" disabled={!throwDarts.length} onClick={() => commitVisit()} className="football-dartboard-action" style={{ border: `1px solid ${GOLD}88`, background: "linear-gradient(180deg,#ffd36b,#ffad00)", color: "#171008" }}>VALIDER</button>
          </div>
        </div> : <CompactFootballPad
          currentThrow={throwDarts}
          multiplier={multiplier}
          targets={targetsNow}
          targetColor={currentActionColor}
          action={actionNow}
          notice={notice || lastEvent}
          recommendation={tacticalRecommendation}
          projection={inputProjection}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onCancel={cancelOrUndo}
          onBackspace={() => setThrowDarts((previous) => previous.slice(0, -1))}
          onNumber={(number: number) => addDart(number)}
          onBull={() => addDart(25)}
          onValidate={() => commitVisit()}
          disabled={botThinking || state.phase === "finished"}
        />}
      </section>

      <section className="football-quick-actions">
        <QuickAction icon="⚽" label="TABLEAU DU MATCH" value={`${score0}-${score1}`} color={BLUE} onClick={() => setOverlay("teams")} />
        <QuickAction icon="📊" label="MES STATISTIQUES" value={`${footballAccuracy(activeStats)}%`} color={GREEN} onClick={() => setOverlay("stats")} />
        <QuickAction icon="🕘" label="DERNIÈRE ACTION" value={state.visits.length} color={GOLD} onClick={() => setOverlay("log")} />
      </section>

    </main>

    {overlay === "stats" ? <OverlayShell title={`STATS · ${playerName(activeProfile).toUpperCase()}`} subtitle={`${footballActionLabel(actionNow)} · ${activeSide?.name}`} color={GREEN} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label="PRÉCISION ACTIONS" value={`${footballAccuracy(activeStats)}%`} color={GREEN} />
        <Kpi label="NOTE LIVE" value={`${activeRating.toFixed(1)}/10`} color={GOLD} detail="performance sur ce match" />
        <Kpi label="BUTS" value={activeStats.goals || 0} color={GOLD} />
        <Kpi label="TIRS CADRÉS" value={activeStats.shotsOnTarget || 0} color={BLUE} />
        <Kpi label="ARRÊTS" value={activeStats.saves || 0} color={GOLD} />
        <Kpi label="INTERCEPTIONS" value={activeStats.interceptions || 0} color={RED} />
        <Kpi label="TACLES" value={activeStats.tackles || 0} color={RED} />
        <Kpi label="PROGRESSION" value={activeStats.advances || 0} color={GREEN} detail={`meilleure action +${activeStats.bestProgress || 0}`} />
        <Kpi label="FLÉCHETTES" value={activeStats.darts || 0} color={WHITE} />
      </div>
    </OverlayShell> : null}

    {overlay === "teams" ? <OverlayShell title="FEUILLE DE MATCH" subtitle={`${footballVariantLabel(config.variant)} · ${state.visits.length} volées`} color={BLUE} onClose={() => setOverlay(null)}>
      <section className="football-momentum football-glass" style={{ marginBottom: 9 }}>
        <div className="football-momentum__head"><span style={{ color: state.sides[0]?.color || BLUE }}>{momentum.leftPct}%</span><strong>{momentumLeader ? `TEMPS FORT · ${momentumLeader.name}` : `RYTHME · ${momentum.label}`}</strong><span style={{ color: state.sides[1]?.color || RED }}>{momentum.rightPct}%</span></div>
        <div className="football-momentum__bar"><span className="is-left" style={{ width: `${momentum.leftPct}%`, background: state.sides[0]?.color || BLUE }} /><span className="is-right" style={{ width: `${momentum.rightPct}%`, background: state.sides[1]?.color || RED }} /></div>
        <div className="football-momentum__foot">DYNAMIQUE DES {Math.max(1, momentum.window)} DERNIÈRES VOLÉES</div>
      </section>
      <div className="football-match-readout">
        <div><span>POSSESSION</span><strong>{possession0}% · {possession1}%</strong></div>
        <div><span>TIRS CADRÉS</span><strong>{sideStat(state, 0, "shotsOnTarget")} · {sideStat(state, 1, "shotsOnTarget")}</strong></div>
        <div><span>LECTURE</span><strong>{momentumLeader ? `${momentumLeader.name} pousse` : "Match équilibré"}</strong></div>
      </div>
      <div style={{ display: "grid", gap: 9 }}>{state.sides.map((side: any) => <div key={side.id} style={{ borderRadius: 16, padding: 10, border: `1px solid ${side.color}55`, background: `${side.color}0d` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: side.color }}>{side.name}</strong><strong style={{ color: WHITE, fontSize: 18 }}>{state.scoreBySide[side.id] || 0}</strong></div>
        {(() => {
          const sideIndex = state.sides.indexOf(side);
          const efficiency = sideIndex === 0 ? efficiency0 : efficiency1;
          return <>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
              {[
                ["TIRS", sideStat(state, sideIndex, "shots")],
                ["CAD.", sideStat(state, sideIndex, "shotsOnTarget")],
                ["ARRÊTS", sideStat(state, sideIndex, "saves")],
                ["INT.", sideStat(state, sideIndex, "interceptions")],
              ].map(([label, value]: any) => <div key={label} style={{ borderRadius: 9, padding: 5, textAlign: "center", background: "rgba(0,0,0,.18)" }}><div style={{ color: SOFT, fontSize: 5.7 }}>{label}</div><strong style={{ color: side.color, fontSize: 10 }}>{value}</strong></div>)}
            </div>
            <div style={{ marginTop: 5, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
              {[
                ["PRÉC.", `${efficiency.accuracy}%`],
                ["CONV.", `${efficiency.conversion}%`],
                ["DÉF.", `${efficiency.defense}%`],
                ["GARD.", `${efficiency.keeper}%`],
              ].map(([label, value]: any) => <div key={label} style={{ borderRadius: 8, padding: 4, textAlign: "center", background: `${side.color}0b`, border: `1px solid ${side.color}22` }}><strong style={{ color: side.color, fontSize: 8.2 }}>{value}</strong><div style={{ color: SOFT, fontSize: 5.2 }}>{label}</div></div>)}
            </div>
          </>;
        })()}
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{side.playerIds.map((id: string) => {
          const profile = profilesById.get(id);
          const stats = state.statsByPlayer[id] || {};
          return <div key={id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
            <ProfileAvatar profile={profile} size={30} />
            <span style={{ color: WHITE, fontSize: 9, fontWeight: 1000 }}>{playerName(profile)}</span>
            <span style={{ color: SOFT, fontSize: 8 }}>{stats.goals || 0}B · {stats.shotsOnTarget || 0}TC · {stats.interceptions || 0}INT</span>
          </div>;
        })}</div>
      </div>)}</div>
    </OverlayShell> : null}

    {overlay === "log" ? <OverlayShell title="FIL DU MATCH" subtitle={`${state.visits.length} action${state.visits.length > 1 ? "s" : ""}`} color={GOLD} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gap: 7 }}>
        {!state.visits.length ? <div style={{ color: SOFT, fontSize: 10, padding: 10 }}>Le coup d’envoi vient d’être donné. Aucune action enregistrée.</div> : null}
        {[...state.visits].reverse().map((visit: any) => <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: state.sides.find((side) => side.id === visit.sideId)?.color || WHITE, fontSize: 9 }}>{playerName(profilesById.get(String(visit.playerId)))} · P{visit.period} T{visit.round}</strong><strong style={{ color: actionColor(visit.action), fontSize: 8 }}>{footballActionLabel(visit.action)}</strong></div>
          <div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{visit.labels.join(" / ")}</div>
          <div style={{ marginTop: 4, color: WHITE, fontSize: 8.2, lineHeight: 1.4 }}>{visit.events.map((event: any) => event.label).join(" · ") || "Aucun événement"}</div>
        </div>)}
      </div>
    </OverlayShell> : null}

    {showGuide && state.phase !== "finished" ? <FootballGuide step={guideStep} onStep={setGuideStep} onClose={closeGuide} /> : null}

    {showEnd && state.phase === "finished" ? <FootballEnd
      state={state}
      profilesById={profilesById}
      onClose={() => setShowEnd(false)}
      onReplay={resetMatch}
      onStats={() => {
        const focusId = state.players[0]?.id;
        if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialStatsSubTab: "football", initialPlayerId: focusId, playerId: focusId });
      }}
      onHistory={() => {
        try {
          onFinish?.(buildHistoryRecord("finished"), { navigate: true });
        } catch {
          if (typeof go === "function") go("statsHub", { tab: "history" });
        }
      }}
    /> : null}
  </div>;
}
