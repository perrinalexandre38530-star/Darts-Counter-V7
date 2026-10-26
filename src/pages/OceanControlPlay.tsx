// @ts-nocheck
// =============================================================
// OCEAN CONTROL — écran de jeu compact + panneaux flottants
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad"; // conservé pour le contrat d’intégration historique
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import type { GameDart } from "../lib/types-game";
import {
  buildOceanControlMatchStats,
  cloneOceanControlState,
  createOceanControlState,
  getOceanActivePlayer,
  getOceanNextUnplacedShip,
  getOceanOwnerForPlayer,
  getOceanPlacementOwner,
  getOceanTargetOwner,
  normalizeOceanControlConfig,
  oceanControlAccuracy,
  oceanControlDifficultyLabel,
  oceanControlFleetLabel,
  oceanControlLatestSonarScan,
  oceanControlRemainingCells,
  oceanControlRemainingDecks,
  oceanControlTacticalHint,
  oceanControlVariantLabel,
  pickOceanControlBotDarts,
  placeOceanControlShip,
  playOceanControlVisit,
  resetOceanPlacementOwner,
  selectOceanControlFocus,
  selectOceanControlTarget,
  type OceanControlConfigPayload,
  type OceanControlOrientation,
  type OceanControlState,
} from "../lib/gameEngines/oceanControlEngine";
import { History } from "../lib/history";
import { playImpactFromDart, playSfx, playUiClickSoft, playUiConfirm, setSfxEnabled as setGlobalSfxEnabled, unlockAudio } from "../lib/sfx";
import { oceanControlMissionSummary } from "../lib/oceanControlMission";
import { buildOceanControlCompetitiveTable, oceanControlCompetitiveScore } from "../lib/oceanControlCompetitive";
import { buildOceanControlRivalrySnapshot } from "../lib/oceanControlRivalry";
import tickerOcean from "../assets/tickers/ticker_ocean_control.png";
import OceanControlEnd from "./OceanControlEnd";
import "../styles/ocean-control-play.css";

type UiDart = { v: number; mult: 1 | 2 | 3 };
type Overlay = null | "map" | "fleet" | "targets" | "intel" | "stats" | "log";

const BLUE = "#30b9ff", CYAN = "#65e9ff", GREEN = "#65e5aa", GOLD = "#f5ca68", RED = "#ff6573", SOFT = "#aab4c7";
const PLAYER_COLORS = [BLUE, "#ff6b74", GREEN, GOLD, "#a78bfa", "#ff63b8", "#6de1d2", "#d4d8e5"];

function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties { return { borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}`, boxShadow: "0 14px 34px rgba(0,0,0,.28)", boxSizing: "border-box" }; }
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function uiToGameDart(dart: UiDart): GameDart { if (!dart || dart.v === 0) return { bed: "MISS" }; if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" }; return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart; }
function gameToUiDart(dart: GameDart): UiDart { if (dart.bed === "MISS") return { v: 0, mult: 1 }; if (dart.bed === "OB") return { v: 25, mult: 1 }; if (dart.bed === "IB") return { v: 25, mult: 2 }; return { v: Number(dart.number || 0), mult: dart.bed === "T" ? 3 : dart.bed === "D" ? 2 : 1 }; }
function normalizeConfig(props: any): OceanControlConfigPayload { const record = props?.params?.rec || props?.params?.record || props?.params?.match || null; const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {}; return normalizeOceanControlConfig(raw); }

function Rules({ config }: { config: OceanControlConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: BLUE }}>{oceanControlVariantLabel(config.variant).toUpperCase()}</strong><br />Détruis la flotte adverse en attaquant les secteurs 1 à 20.</div>
    <div><strong style={{ color: CYAN }}>ARMES</strong><br />{config.variant === "tactical" ? "Simple = 1 zone · Double = 2 zones · Triple = ligne de 3." : "S, D et T attaquent une seule zone."}</div>
    <div><strong style={{ color: GREEN }}>SONAR</strong><br />Sélectionne une zone sur la grille puis touche le Bull pour analyser les cases voisines.</div>
    <div><strong style={{ color: GOLD }}>DBULL</strong><br />Déclenche une frappe de précision uniquement sur la zone focus sélectionnée.</div>
  </div>;
}

function shipVisualMeta(ship: any) {
  const name = String(ship?.name || "").toLowerCase();
  const length = Number(ship?.length || 0);
  if (name.includes("porte") || name.includes("carrier") || length >= 5) return { kind: "carrier", label: "Porte-avions", emoji: "🛳️" };
  if (name.includes("sous") || name.includes("sub")) return { kind: "submarine", label: "Sous-marin", emoji: "🫧" };
  if (name.includes("destroy") || name.includes("torp")) return { kind: "destroyer", label: "Destroyer", emoji: "🚤" };
  if (name.includes("crois") || name.includes("cruis")) return { kind: "cruiser", label: "Croiseur", emoji: "⛴️" };
  if (length <= 2) return { kind: "patrol", label: "Patrouilleur", emoji: "🛥️" };
  if (length === 3) return { kind: "destroyer", label: "Destroyer", emoji: "🚤" };
  if (length === 4) return { kind: "cruiser", label: "Croiseur", emoji: "⛴️" };
  return { kind: "carrier", label: "Porte-avions", emoji: "🛳️" };
}


function oceanPreviewNeighbors(cell: number): number[] {
  if (cell < 0 || cell >= 20) return [];
  const row = Math.floor(cell / 5), col = cell % 5;
  const out = [cell];
  if (row > 0) out.push(cell - 5);
  if (row < 3) out.push(cell + 5);
  if (col > 0) out.push(cell - 1);
  if (col < 4) out.push(cell + 1);
  return out;
}

function oceanPreviewTacticalCells(cell: number, mult: number, tactical: boolean): number[] {
  if (cell < 0 || cell >= 20) return [];
  if (!tactical || mult === 1) return [cell];
  const row = Math.floor(cell / 5), col = cell % 5;
  if (mult === 2) {
    if (col < 4) return [cell, cell + 1];
    if (col > 0) return [cell, cell - 1];
    return [cell];
  }
  if (mult === 3) {
    const rowStart = row * 5;
    const candidates = col <= 2 ? [cell, cell + 1, cell + 2] : [cell - 2, cell - 1, cell];
    return candidates.filter((value) => value >= rowStart && value < rowStart + 5);
  }
  return [cell];
}

function oceanSalvoPreview(state: any, darts: UiDart[], tactical: boolean) {
  const focusCell = state?.focusNumber ? state.gridNumbers.indexOf(Number(state.focusNumber)) : -1;
  const plannedCells: Record<string, number> = {};
  const rows = [0, 1, 2].map((index) => {
    const dart = darts[index];
    if (!dart) return { index, label: "—", detail: "EN ATTENTE", numbers: [] as number[], tone: "idle" };
    if (Number(dart.v) === 0) return { index, label: "MISS", detail: "TIR PERDU", numbers: [] as number[], tone: "miss" };

    let cells: number[] = [];
    let detail = "";
    let tone = "attack";
    if (Number(dart.v) === 25) {
      if (Number(dart.mult) === 2) {
        tone = "dbull";
        cells = focusCell >= 0 ? [focusCell] : [];
        detail = focusCell >= 0 ? `FRAPPE FOCUS ${state.focusNumber}` : "FOCUS REQUIS";
      } else {
        tone = "sonar";
        cells = focusCell >= 0 ? oceanPreviewNeighbors(focusCell) : [];
        detail = focusCell >= 0 ? `SONAR AUTOUR DU ${state.focusNumber}` : "FOCUS REQUIS";
      }
    } else {
      const cell = state.gridNumbers.indexOf(Number(dart.v));
      cells = oceanPreviewTacticalCells(cell, Number(dart.mult), tactical);
      const prefix = Number(dart.mult) === 3 ? "SALVE TRIPLE" : Number(dart.mult) === 2 ? "SALVE DOUBLE" : "TIR SIMPLE";
      detail = cells.length ? `${prefix} · ${cells.length} ZONE${cells.length > 1 ? "S" : ""}` : "HORS GRILLE";
      tone = Number(dart.mult) === 3 ? "triple" : Number(dart.mult) === 2 ? "double" : "simple";
    }
    const numbers = cells.map((cell) => Number(state.gridNumbers[cell])).filter(Boolean);
    cells.forEach((cell) => { if (!plannedCells[String(cell)]) plannedCells[String(cell)] = index + 1; });
    return { index, label: dartPreviewLabel(dart), detail, numbers, tone };
  });
  return { rows, plannedCells };
}

function SalvoPreview({ preview }: any) {
  return <div className="ocean-salvo-preview" aria-label="Prévisualisation de la volée">
    <div className="ocean-salvo-preview__head"><div><span>⚔️ VOLÉE EN PRÉPARATION</span><strong>VOIS L’EFFET AVANT DE VALIDER</strong></div><small>Les repères D1 / D2 / D3 apparaissent sur la carte.</small></div>
    <div className="ocean-salvo-preview__slots">
      {preview.rows.map((row: any) => <div key={row.index} className={`ocean-salvo-slot is-${row.tone}`}>
        <b>D{row.index + 1}</b>
        <div><strong>{row.label}</strong><small>{row.detail}</small></div>
        <em>{row.numbers.length ? row.numbers.join(" · ") : row.tone === "idle" ? "—" : "AUCUNE ZONE"}</em>
      </div>)}
    </div>
  </div>;
}

function StatusLegend() {
  return <div className="ocean-status-legend">
    <span><i className="is-unknown" />Inconnue</span>
    <span><i className="is-miss" />À l’eau</span>
    <span><i className="is-hit" />Touchée</span>
    <span><i className="is-sunk" />Coulée</span>
    <span><i className="is-planned" />Prévue</span>
  </div>;
}

function ShipStrip({ owner, reveal = false, color = BLUE }: any) {
  return <div className="ocean-ship-strip">{(owner?.ships || []).map((ship: any) => {
    const meta = shipVisualMeta(ship);
    return <div key={ship.id} title={ship.name} className={`ocean-ship-card ${ship.sunk ? "is-sunk" : ""}`} style={{ ["--ship-accent" as any]: color }}>
      <div className={`ocean-ship-card__art is-${meta.kind}`}>
        {ship.sunk ? <span className="ocean-ship-card__wreck">💥</span> : <span className={`ocean-ship-silhouette is-${meta.kind}`} aria-hidden="true"><span className="hull" /><span className="bridge" /><span className="wake" /></span>}
      </div>
      <div className="ocean-ship-card__meta">
        <div className="ocean-ship-card__name">{ship.name || meta.label}</div>
        <div className="ocean-ship-card__type">{meta.label}</div>
        <div className="ocean-ship-card__hp">{ship.hits.length}/{ship.length} zones</div>
      </div>
      {!reveal && !ship.sunk ? <div className="ocean-ship-card__fog">SECRET</div> : null}
    </div>;
  })}</div>;
}

function OceanGrid({ state, owner, own = false, onFocus, placement = false, placementShip, onPlace, validPlacementStarts = null, sonarScan = null, recentCells = [], shipColor = BLUE, compact = false, heatmap = null, plannedCells = {} }: any) {
  const difficulty = state.config.difficulty;
  return <div className="ocean-control-grid">{Array.from({ length: 20 }, (_, cell) => {
    const number = state.gridNumbers[cell];
    const status = owner?.attackedCells?.[String(cell)] || null;
    const ship = own ? owner?.ships?.find((row: any) => row.cells.includes(cell)) : null;
    const shipMeta = ship ? shipVisualMeta(ship) : null;
    const focused = Number(state.focusNumber) === Number(number);
    const scanned = Boolean(!own && sonarScan?.targetOwnerId === owner?.id && sonarScan?.cells?.includes(cell));
    const scanCenter = Boolean(scanned && sonarScan?.centerCell === cell);
    const recent = Boolean(recentCells?.includes(cell));
    const showNumber = difficulty !== "admiral" || status || focused || placement || own;
    const heatValue = Math.max(0, Number(heatmap?.counts?.[String(number)] || 0));
    const heatMax = Math.max(1, Number(heatmap?.max || 1));
    const heat = Math.min(1, heatValue / heatMax);
    const plannedOrder = Math.max(0, Number(plannedCells?.[String(cell)] || 0));
    const hasPlacementGuide = placement && placementShip && Array.isArray(validPlacementStarts);
    const placementValid = !hasPlacementGuide || validPlacementStarts.includes(cell);
    const className = ["ocean-control-cell", compact ? "is-compact" : "", status ? `is-${status}` : "", focused ? "is-focused" : "", ship ? "has-ship" : "", placement ? "is-placement" : "", hasPlacementGuide ? (placementValid ? "is-placement-valid" : "is-placement-invalid") : "", scanned ? "is-sonar-scan" : "", scanCenter ? "is-sonar-center" : "", recent ? "is-recent-impact" : "", heatValue > 0 ? "has-heat" : "", plannedOrder ? "is-planned" : ""].filter(Boolean).join(" ");
    return <button key={cell} type="button" className={className} disabled={Boolean(hasPlacementGuide && !placementValid)} style={{ ["--heat" as any]: heat, ["--ship-color" as any]: shipColor }} onClick={() => placement ? onPlace?.(cell) : onFocus?.(number)} aria-label={`Zone ${number}${status ? ` · ${status}` : ""}${placement && placementValid ? " · départ possible" : ""}`}>
      <span className="ocean-cell-water" aria-hidden="true" />
      <span className="ocean-cell-number">{showNumber ? number : "•"}</span>
      {focused ? <span className="ocean-cell-focus-ring" aria-hidden="true" /> : null}
      {scanned ? <span className={`ocean-cell-sonar-ring ${scanCenter ? "is-center" : ""}`} aria-hidden="true" /> : null}
      {ship ? <span className={`ocean-cell-vessel vessel-${Math.min(4, Math.max(2, Number(ship.length || 2)))} is-${shipMeta?.kind || "carrier"}`} style={{ ["--ship-color" as any]: shipColor }} aria-hidden="true" /> : null}
      {status === "miss" ? <span className="ocean-cell-splash" aria-hidden="true" /> : null}
      {status === "hit" ? <span className="ocean-cell-blast" aria-hidden="true" /> : null}
      {status === "sunk" ? <span className="ocean-cell-blast is-sunk" aria-hidden="true" /> : null}
      <span className="ocean-cell-mark">{status === "miss" ? "≈" : status === "hit" ? "✹" : status === "sunk" ? "💥" : ""}</span>
      {heatValue > 0 && !own ? <span className="ocean-cell-heat-badge" title={`${heatValue} pression${heatValue > 1 ? "s" : ""} sur cette zone`}>{heatValue}</span> : null}
      {scanCenter ? <span className="ocean-cell-sonar-badge">{sonarScan.contactCount}</span> : null}
      {plannedOrder ? <span className="ocean-cell-plan-badge">D{plannedOrder}</span> : null}
      {placement && placementShip ? <span className="ocean-cell-coord">{String.fromCharCode(65 + Math.floor(cell / 5))}{(cell % 5) + 1}</span> : null}
    </button>;
  })}</div>;
}

function feedbackFromVisit(visit: any) {
  const events = Array.isArray(visit?.events) ? visit.events : [];
  const priority = ["battle_win", "sunk", "strike", "hit", "sonar", "water", "duplicate", "miss"];
  const event = priority.map((type) => events.find((row: any) => row.type === type)).find(Boolean) || events[0];
  if (!event) return null;
  const map: any = {
    battle_win: { icon: "🏆", tone: "win" },
    sunk: { icon: "💥", tone: "sunk" },
    strike: { icon: "🎯", tone: "strike" },
    hit: { icon: "🔥", tone: "hit" },
    sonar: { icon: "📡", tone: "sonar" },
    water: { icon: "🌊", tone: "water" },
    duplicate: { icon: "↻", tone: "duplicate" },
    miss: { icon: "✕", tone: "miss" },
  };
  const visual = map[event.type] || map.miss;
  return { ...visual, label: event.label, id: `${visit?.id || Date.now()}-${event.type}` };
}

function ImpactFeedback({ feedback }: any) {
  if (!feedback) return null;
  return <div key={feedback.id} className={`ocean-impact-feedback is-${feedback.tone}`} role="status" aria-live="polite"><span>{feedback.icon}</span><strong>{feedback.label}</strong></div>;
}

function weaponEffectLabel(kind: "S" | "D" | "T" | "B" | "DB", tactical = true) {
  if (kind === "B") return "SONAR · analyse les cases autour du focus";
  if (kind === "DB") return "FRAPPE PRÉCISE · vise la zone focus";
  if (!tactical) return "ATTAQUE · 1 zone";
  if (kind === "D") return "SALVE DOUBLE · 2 zones adjacentes";
  if (kind === "T") return "SALVE TRIPLE · ligne de 3 zones";
  return "TIR SIMPLE · 1 zone";
}

function visitResultItems(visit: any) {
  const events = Array.isArray(visit?.events) ? visit.events : [];
  const out: any[] = [];
  events.forEach((event: any) => {
    const type = String(event?.type || "");
    const key = `${type}-${event?.cell ?? event?.number ?? out.length}`;
    if (type === "battle_win") out.push({ key, icon: "🏆", label: "BATAILLE GAGNÉE", tone: "win" });
    else if (type === "sunk") out.push({ key, icon: "💥", label: `NAVIRE COULÉ${event?.shipName ? ` · ${event.shipName}` : ""}`, tone: "sunk" });
    else if (type === "strike") out.push({ key, icon: "🎯", label: "FRAPPE DBULL", tone: "strike" });
    else if (type === "hit") out.push({ key, icon: "🔥", label: `TOUCHÉ${event?.number ? ` · ${event.number}` : ""}`, tone: "hit" });
    else if (type === "sonar") out.push({ key, icon: "📡", label: `${Number(event?.contactCount || 0)} CONTACT${Number(event?.contactCount || 0) > 1 ? "S" : ""} SONAR`, tone: "sonar" });
    else if (type === "water" || type === "miss") out.push({ key, icon: "🌊", label: "À L’EAU", tone: "water" });
    else if (type === "duplicate") out.push({ key, icon: "↻", label: "ZONE DÉJÀ JOUÉE", tone: "duplicate" });
  });
  return out.slice(0, 4);
}

function GameplayWeaponGuide({ multiplier, tactical, focusNumber, onSelect, disabled }: any) {
  const items = [
    { id: "S", mult: 1, icon: "S", title: "SIMPLE", detail: weaponEffectLabel("S", tactical), color: BLUE },
    { id: "D", mult: 2, icon: "D", title: "DOUBLE", detail: weaponEffectLabel("D", tactical), color: GREEN },
    { id: "T", mult: 3, icon: "T", title: "TRIPLE", detail: weaponEffectLabel("T", tactical), color: RED },
    { id: "B", mult: 1, icon: "B", title: "BULL", detail: weaponEffectLabel("B", tactical), color: CYAN, special: true },
    { id: "DB", mult: 2, icon: "DB", title: "DBULL", detail: weaponEffectLabel("DB", tactical), color: GOLD, special: true },
  ];
  return <div className="ocean-gameplay-weapons" aria-label="Effet des armes">
    {items.map((item: any) => {
      const active = item.special ? false : Number(multiplier) === Number(item.mult);
      return <button key={item.id} type="button" disabled={disabled} className={`ocean-gameplay-weapon ${active ? "is-active" : ""} ${item.special ? "is-special" : ""}`} style={{ ["--weapon-color" as any]: item.color }} onClick={() => onSelect?.(item)}>
        <span className="ocean-gameplay-weapon__icon">{item.icon}</span>
        <span className="ocean-gameplay-weapon__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        {item.special && !focusNumber ? <em>CHOISIR UNE ZONE</em> : null}
      </button>;
    })}
  </div>;
}

function FirstRunGuide({ onClose }: any) {
  return <div className="ocean-first-run-guide">
    <div className="ocean-first-run-guide__head"><div><span>⚓ PREMIÈRE BATAILLE</span><strong>OCEAN CONTROL EN 30 SECONDES</strong></div><button type="button" onClick={onClose}>×</button></div>
    <div className="ocean-first-run-guide__steps">
      <div><b>1</b><span><strong>LANCE TES FLÉCHETTES</strong><small>S / D / T attaquent directement le secteur réellement touché sur la cible.</small></span></div>
      <div><b>2</b><span><strong>FOCUS POUR LES ARMES SPÉCIALES</strong><small>Avant Bull ou DBull, ouvre la carte et choisis la zone à scanner ou frapper.</small></span></div>
      <div><b>3</b><span><strong>VÉRIFIE PUIS VALIDE</strong><small>La prévisualisation D1 / D2 / D3 montre les zones affectées avant application.</small></span></div>
    </div>
    <button type="button" className="ocean-first-run-guide__ok" onClick={onClose}>J’AI COMPRIS · JOUER</button>
  </div>;
}


function TurnImpactMap({ debrief }: any) {
  const events = Array.isArray(debrief?.events) ? debrief.events : [];
  const numbers = Array.isArray(debrief?.gridNumbers) && debrief.gridNumbers.length === 20
    ? debrief.gridNumbers
    : Array.from({ length: 20 }, (_, index) => index + 1);
  const sonarEvents = events.filter((event: any) => event?.type === "sonar");
  const scannedCells = new Set<number>(sonarEvents.flatMap((event: any) => Array.isArray(event?.scanCells) ? event.scanCells : []));
  const sonarCenters = new Set<number>(sonarEvents.map((event: any) => Number(event?.cell)).filter((cell: number) => Number.isInteger(cell)));
  const byCell = new Map<number, any[]>();
  events.forEach((event: any) => {
    const cell = Number(event?.cell);
    if (!Number.isInteger(cell)) return;
    byCell.set(cell, [...(byCell.get(cell) || []), event]);
  });
  const priority = ["sunk", "hit", "water", "duplicate", "strike"];
  return <div className="ocean-resolution-map-wrap">
    <div className="ocean-resolution-map-head"><div><span>CARTE D’IMPACT</span><strong>LA VOLÉE EN UN COUP D’ŒIL</strong></div><small>Les animations montrent uniquement ce que la volée a réellement révélé.</small></div>
    <div className="ocean-resolution-map" aria-label="Carte des impacts de la volée">
      {numbers.map((number: number, cell: number) => {
        const cellEvents = byCell.get(cell) || [];
        const primary = priority.map((type) => cellEvents.find((event: any) => event?.type === type)).find(Boolean);
        const type = String(primary?.type || "");
        const scanned = scannedCells.has(cell);
        const sonarCenter = sonarCenters.has(cell);
        const strike = cellEvents.some((event: any) => event?.type === "strike");
        const className = ["ocean-resolution-cell", type ? `is-${type}` : "", scanned ? "is-scanned" : "", sonarCenter ? "is-sonar-center" : "", strike ? "is-strike" : ""].filter(Boolean).join(" ");
        const icon = type === "sunk" ? "💥" : type === "hit" ? "🔥" : type === "water" ? "💧" : type === "duplicate" ? "↻" : strike ? "🎯" : sonarCenter ? "📡" : "";
        return <div key={cell} className={className} style={{ ["--impact-delay" as any]: `${cell * 18}ms` }}>
          <span className="ocean-resolution-cell__number">{number}</span>
          {scanned ? <i className="ocean-resolution-cell__sonar" aria-hidden="true" /> : null}
          {type === "water" ? <i className="ocean-resolution-cell__splash" aria-hidden="true" /> : null}
          {(type === "hit" || type === "sunk") ? <i className="ocean-resolution-cell__blast" aria-hidden="true" /> : null}
          {icon ? <b className="ocean-resolution-cell__icon">{icon}</b> : null}
        </div>;
      })}
    </div>
    <div className="ocean-resolution-map-legend"><span className="is-hit">🔥 Touché</span><span className="is-sunk">💥 Coulé</span><span className="is-water">💧 À l’eau</span><span className="is-sonar">📡 Sonar</span><span className="is-duplicate">↻ Déjà joué</span></div>
  </div>;
}

function TurnResolutionScreen({ debrief, onContinue, onUndo }: any) {
  if (!debrief) return null;
  if (debrief.stage === "handoff") {
    return <div className="ocean-turn-resolution-screen is-handoff" style={{ ["--resolution-color" as any]: debrief.color || CYAN }}>
      <div className="ocean-handoff-card">
        <span className="ocean-handoff-lock">🔒</span>
        <span className="ocean-handoff-kicker">PASSAGE DE COMMANDEMENT</span>
        <strong>PASSE L’APPAREIL À<br /><b>{debrief.nextName || "COMMANDANT SUIVANT"}</b></strong>
        <small>La résolution précédente est masquée. Le commandant suivant peut reprendre la bataille sans voir d’information privée sur la flotte adverse.</small>
        {debrief.nextProfile ? <ProfileAvatar profile={debrief.nextProfile} size={74} /> : null}
        <button type="button" onClick={onContinue}>JE SUIS {String(debrief.nextName || "PRÊT").toUpperCase()} · CONTINUER</button>
      </div>
    </div>;
  }

  const items = Array.isArray(debrief.items) ? debrief.items : [];
  return <div className="ocean-turn-resolution-screen" style={{ ["--resolution-color" as any]: debrief.color || CYAN }}>
    <div className="ocean-turn-resolution-card">
      <div className="ocean-turn-resolution-head">
        <div>
          <span>⚓ RÉSOLUTION DE VOLÉE</span>
          <strong>{debrief.actorName}</strong>
          <small>B{debrief.battle} · T{debrief.round} · cible {debrief.targetName}</small>
        </div>
        <span className="ocean-turn-resolution-grade">{debrief.darts?.join(" / ") || "—"}</span>
      </div>

      <div className={`ocean-turn-resolution-hero is-${debrief.tone || "neutral"}`}>
        <span>{debrief.icon}</span>
        <div>
          <small>RÉSULTAT</small>
          <strong>{debrief.title}</strong>
          <p>{debrief.detail}</p>
        </div>
      </div>

      <div className="ocean-turn-resolution-darts" aria-label="Fléchettes de la volée">
        {[0, 1, 2].map((index) => <div key={index} className={debrief.darts?.[index] ? "is-played" : ""}>
          <span>D{index + 1}</span>
          <strong>{debrief.darts?.[index] || "—"}</strong>
        </div>)}
      </div>

      <TurnImpactMap debrief={debrief} />

      <div className="ocean-turn-resolution-events">
        {items.length ? items.map((item: any) => <div key={item.key} className={`is-${item.tone}`}>

          <span>{item.icon}</span><strong>{item.label}</strong>
        </div>) : <div className="is-neutral"><span>•</span><strong>AUCUN EFFET TACTIQUE</strong></div>}
      </div>

      <div className="ocean-turn-resolution-kpis">
        <div><span>IMPACTS</span><strong>{debrief.hitCount}</strong><small>{debrief.hitZones?.length ? `zones ${debrief.hitZones.join(", ")}` : "aucun contact"}</small></div>
        <div><span>COULÉS</span><strong>{debrief.sunkCount}</strong><small>{debrief.shipNames?.length ? debrief.shipNames.join(" · ") : "aucun navire"}</small></div>
        <div><span>SONAR</span><strong>{debrief.contactCount}</strong><small>{debrief.sonarUsed ? "contacts détectés" : "non utilisé"}</small></div>
        <div><span>FLOTTE CIBLE</span><strong>{debrief.targetShipsAfter ?? "—"}</strong><small>navires restants</small></div>
      </div>

      <div className="ocean-turn-resolution-next">
        <span>{debrief.finished ? "🏆 FIN DE PARTIE" : debrief.battleWon ? "⚔️ BATAILLE TERMINÉE" : "➡️ PROCHAINE ACTION"}</span>
        <strong>{debrief.finished ? "Ouvrir le débrief final" : debrief.phaseAfter === "placement" ? "Déployer la flotte de la prochaine bataille" : debrief.nextIsBot ? `${debrief.nextName} va jouer` : debrief.nextName ? `Passer à ${debrief.nextName}` : "Continuer la bataille"}</strong>
        <small>{debrief.finished ? "La dernière volée est enregistrée." : debrief.nextIsBot ? "Le BOT jouera dès que tu fermes cette résolution." : "Valide ce résultat avant de passer au commandant suivant."}</small>
      </div>

      <div className="ocean-turn-resolution-actions">
        <button type="button" className="is-undo" onClick={onUndo}>↶ ANNULER LA VOLÉE</button>
        <button type="button" className="is-continue" onClick={onContinue}>
          {debrief.finished ? "VOIR LE DÉBRIEF FINAL" : debrief.phaseAfter === "placement" ? "BATAILLE SUIVANTE" : debrief.nextIsBot ? "LAISSER JOUER LE BOT" : "COMMANDANT SUIVANT"}
        </button>
      </div>
    </div>
  </div>;
}

function QuickButton({ icon, label, value, color, onClick }: any) {
  return <button type="button" onClick={onClick} className="ocean-float-action" style={{ borderColor: `${color}66`, background: `linear-gradient(180deg,${color}20,rgba(3,10,16,.96))` }} title={`${label} · ${value}`}>
    <span className="ocean-float-action__icon" style={{ color }}>{icon}</span>
    <span className="ocean-float-action__label">{label}</span>
    <span className="ocean-float-action__badge" style={{ borderColor: `${color}66`, color }}>{String(value).split(" ")[0]}</span>
  </button>;
}

function dartPreviewLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (Number(dart.v) === 0) return "MISS";
  if (Number(dart.v) === 25) return dart.mult === 2 ? "DB" : "B";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function playOceanResultSfx(visit: any, finished = false) {
  if (finished) { playSfx("180", { volume: .92 }); return; }
  const events = Array.isArray(visit?.events) ? visit.events : [];
  if (events.some((event: any) => event?.type === "battle_win" || event?.type === "sunk")) { playSfx("180", { volume: .9 }); return; }
  if (events.some((event: any) => event?.type === "strike")) { playSfx("dbull", { volume: .86 }); return; }
  if (events.some((event: any) => event?.type === "sonar")) { playSfx("bull", { volume: .72 }); return; }
  if (events.some((event: any) => event?.type === "hit")) { playSfx("hit", { volume: .82 }); return; }
  if (events.some((event: any) => ["water", "duplicate", "miss"].includes(event?.type))) { playSfx("bust", { volume: .7 }); return; }
  playUiConfirm();
}

function CompactDartPad({ currentThrow, multiplier, onSimple, onDouble, onTriple, onNumber, onBull, onCancel, onBackspace, onValidate, noticeSlot, disabled = false }: any) {
  const { lang } = useLang();
  const bull25Label = lang === "fr" ? "1/2 BULL" : "BULL";
  const bull50Label = lang === "fr" ? "BULL" : "DBULL";
  const rows = [
    [0, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
  ];

  return <div className="ocean-compact-pad">
    <div className="ocean-pad-statusline">
      <div className="ocean-pad-statusline__notice">{noticeSlot}</div>
      <div className="ocean-pad-preview-strip">
        {[0, 1, 2].map((index) => <span key={index} className="ocean-pad-preview-chip">{dartPreviewLabel(currentThrow[index])}</span>)}
      </div>
    </div>

    <div className="ocean-pad-action-row">
      <button type="button" className={`ocean-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""}`} onClick={onSimple} disabled={disabled}>SIMPLE</button>
      <button type="button" className={`ocean-pad-mode ${multiplier === 2 ? "is-active is-double" : ""}`} onClick={onDouble} disabled={disabled}>DOUBLE</button>
      <button type="button" className={`ocean-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""}`} onClick={onTriple} disabled={disabled}>TRIPLE</button>
      <button type="button" className="ocean-pad-undo" onClick={onCancel} disabled={disabled}>↶</button>
    </div>

    <div className="ocean-pad-grid-rows">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="ocean-pad-grid-row">{row.map((n) => <button key={n} type="button" className={`ocean-pad-cell ${n === 0 ? "is-miss" : ""}`} onClick={() => onNumber(n)} disabled={disabled} title={n === 0 ? "MISS" : String(n)}>{n === 0 ? "MISS" : n}</button>)}</div>)}
    </div>

    <div className="ocean-pad-footer-row ocean-pad-footer-row--dual-bull">
      <button type="button" className="ocean-pad-bull is-bull25" onClick={() => onBull(25)} disabled={disabled}>{bull25Label}</button>
      <button type="button" className="ocean-pad-bull is-dbull" onClick={() => onBull(50)} disabled={disabled}>{bull50Label}</button>
      <button type="button" className="ocean-pad-backspace" onClick={onBackspace} disabled={disabled || !currentThrow.length}>⌫</button>
      <button type="button" className="ocean-pad-validate" onClick={onValidate} disabled={disabled || !currentThrow.length}>VALIDER</button>
    </div>
  </div>;
}

function Kpi({ label, value, color = BLUE, detail }: any) { return <div style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", minWidth: 0 }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 19, fontWeight: 1100 }}>{value}</div>{detail ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.42)", fontSize: 7.3 }}>{detail}</div> : null}</div>; }

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,3,8,.86)", backdropFilter: "blur(9px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px 8px max(8px,env(safe-area-inset-bottom))" }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div style={{ width: "min(820px,100%)", maxHeight: "88dvh", overflow: "hidden", borderRadius: "23px 23px 15px 15px", background: "linear-gradient(180deg,#111c29,#05080c)", border: `1px solid ${color}55`, boxShadow: "0 28px 90px rgba(0,0,0,.72)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 13px", borderBottom: "1px solid rgba(255,255,255,.08)" }}><div style={{ minWidth: 0 }}><div style={{ color, fontSize: 11.5, fontWeight: 1100, letterSpacing: .75 }}>{title}</div>{subtitle ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.5 }}>{subtitle}</div> : null}</div><button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.045)", color: "#fff", fontSize: 18 }}>×</button></div>
      <div className="dc-scroll-thin" style={{ maxHeight: "calc(88dvh - 65px)", overflowY: "auto", padding: 12 }}>{children}</div>
    </div>
  </div>;
}

function oceanPlacementCandidateCells(start: number, length: number, orientation: OceanControlOrientation): number[] {
  const row = Math.floor(start / 5);
  const col = start % 5;
  if (orientation === "horizontal") {
    if (col + length > 5) return [];
    return Array.from({ length }, (_, index) => start + index);
  }
  if (row + length > 4) return [];
  return Array.from({ length }, (_, index) => start + index * 5);
}

function oceanPlacementValidStarts(owner: any, ship: any, orientation: OceanControlOrientation): number[] {
  if (!owner || !ship) return [];
  const occupied = new Set<number>((owner.ships || []).flatMap((row: any) => row.cells || []));
  return Array.from({ length: 20 }, (_, start) => start).filter((start) => {
    const cells = oceanPlacementCandidateCells(start, Number(ship.length || 0), orientation);
    return cells.length === Number(ship.length || 0) && cells.every((cell) => !occupied.has(cell));
  });
}

function PlacementScreen({ state, profilesById, ready, onReady, orientation, setOrientation, onPlace, onReset, onAuto, notice }: any) {
  const owner = getOceanPlacementOwner(state);
  const ship = getOceanNextUnplacedShip(state);
  const memberProfiles = (owner?.memberIds || []).map((id: string) => profilesById.get(String(id))).filter(Boolean);
  if (!owner) return null;

  const ships = owner.ships || [];
  const placedShips = ships.filter((row: any) => Array.isArray(row.cells) && row.cells.length === Number(row.length || 0)).length;
  const totalShips = Math.max(1, ships.length);
  const placementPercent = Math.round((placedShips / totalShips) * 100);
  const validStarts = oceanPlacementValidStarts(owner, ship, orientation);
  const shipMeta = ship ? shipVisualMeta(ship) : null;

  if (!ready) return <main className="ocean-placement-privacy">
    <section className="ocean-placement-privacy-card">
      <div className="ocean-placement-lock"><span>🔒</span><i /></div>
      <span className="ocean-placement-eyebrow">DÉPLOIEMENT SECRET</span>
      <strong>{owner.name}</strong>
      <p>Passe l’appareil au commandant de cette flotte. Les adversaires ne doivent pas voir la position des navires.</p>
      <div className="ocean-placement-privacy-steps">
        <div><b>1</b><span>Passe l’appareil</span></div>
        <div><b>2</b><span>Cache l’écran</span></div>
        <div><b>3</b><span>Déverrouille la grille</span></div>
      </div>
      <div className="ocean-placement-members">{memberProfiles.map((profile: any) => <ProfileAvatar key={profile.id} profile={profile} size={44} />)}</div>
      <button type="button" onClick={onReady}>JE SUIS PRÊT · AFFICHER MA GRILLE</button>
    </section>
  </main>;

  return <main className="ocean-placement-page">
    <section className="ocean-placement-command">
      <div className="ocean-placement-command__head">
        <div><span>⚓ PLACEMENT SECRET</span><strong>{owner.name}</strong><small>Pose toute ta flotte. Les cases lumineuses sont des départs valides.</small></div>
        <b>{placedShips}/{totalShips}</b>
      </div>
      <div className="ocean-placement-progress"><i style={{ width: `${placementPercent}%` }} /></div>
      <div className="ocean-placement-flow">
        <span className="is-done"><b>1</b> ORIENTATION</span>
        <span className={ship ? "is-active" : "is-done"}><b>2</b> CASE DE DÉPART</span>
        <span className={placedShips === totalShips ? "is-done" : ""}><b>3</b> FLOTTE PRÊTE</span>
      </div>
    </section>

    <div className="ocean-placement-layout">
      <section className="ocean-placement-board-card">
        <div className="ocean-placement-board-head">
          <div><span>GRILLE DE DÉPLOIEMENT</span><strong>{ship ? `Place ${ship.name}` : "Flotte prête"}</strong></div>
          <em>{validStarts.length} départ{validStarts.length > 1 ? "s" : ""} possible{validStarts.length > 1 ? "s" : ""}</em>
        </div>
        <div className="ocean-placement-board-tip"><b>TOUCHE UNE CASE LUMINEUSE</b><span>Le navire partira de cette case dans le sens {orientation === "horizontal" ? "horizontal →" : "vertical ↓"}.</span></div>
        <OceanGrid state={state} owner={owner} own placement placementShip={ship} validPlacementStarts={validStarts} onPlace={onPlace} />
        <div className="ocean-placement-grid-legend"><span><i className="is-valid" />Départ possible</span><span><i className="is-occupied" />Navire placé</span><span><i className="is-blocked" />Impossible</span></div>
        {notice ? <div className="ocean-placement-notice" role="status" aria-live="polite">{notice}</div> : null}
      </section>

      <aside className="ocean-placement-console">
        <section className="ocean-placement-current" style={{ ["--ship-accent" as any]: CYAN }}>
          <span className="ocean-placement-section-label">NAVIRE À PLACER</span>
          {ship ? <>
            <div className="ocean-placement-current__ship">
              <div className={`ocean-ship-card__art is-${shipMeta?.kind || "carrier"}`}><span className={`ocean-ship-silhouette is-${shipMeta?.kind || "carrier"}`} aria-hidden="true"><span className="hull" /><span className="bridge" /><span className="wake" /></span></div>
              <div><strong>{ship.name}</strong><small>{shipMeta?.label} · {ship.length} zones</small></div>
            </div>
            <div className="ocean-placement-decks">{Array.from({ length: Number(ship.length || 0) }, (_, index) => <i key={index} />)}</div>
          </> : <div className="ocean-placement-ready"><b>✓</b><strong>FLOTTE PRÊTE</strong><small>Le combat va pouvoir commencer.</small></div>}
        </section>

        <section className="ocean-placement-orientation">
          <span className="ocean-placement-section-label">ORIENTATION</span>
          <div>
            <button type="button" className={orientation === "horizontal" ? "is-active" : ""} onClick={() => setOrientation("horizontal")}><b>↔</b><strong>HORIZONTAL</strong><small>vers la droite</small></button>
            <button type="button" className={orientation === "vertical" ? "is-active" : ""} onClick={() => setOrientation("vertical")}><b>↕</b><strong>VERTICAL</strong><small>vers le bas</small></button>
          </div>
        </section>

        <section className="ocean-placement-fleet-manifest">
          <span className="ocean-placement-section-label">MA FLOTTE</span>
          <div>{ships.map((row: any, index: number) => {
            const meta = shipVisualMeta(row);
            const placed = Array.isArray(row.cells) && row.cells.length === Number(row.length || 0);
            const current = ship?.id === row.id;
            return <div key={row.id} className={`${placed ? "is-placed" : ""} ${current ? "is-current" : ""}`}><b>{placed ? "✓" : index + 1}</b><span><strong>{row.name}</strong><small>{meta.label} · {row.length} zones</small></span><em>{placed ? "PLACÉ" : current ? "À POSER" : "EN ATTENTE"}</em></div>;
          })}</div>
        </section>

        <div className="ocean-placement-actions">
          <button type="button" className="is-reset" onClick={onReset}>↶ RECOMMENCER</button>
          <button type="button" className="is-auto" onClick={onAuto}>⚡ PLACEMENT AUTO</button>
        </div>
      </aside>
    </div>
  </main>;
}

export default function OceanControlPlay(props: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: Math.max(2, config.players) }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => { const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null; return snapshot?.mode === "ocean_control" ? cloneOceanControlState(snapshot) : createOceanControlState(players, config); }, []);

  const [state, setState] = React.useState<OceanControlState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<OceanControlState[]>([]);
  const [notice, setNotice] = React.useState(oceanControlTacticalHint(initialState));
  const [impactFeedback, setImpactFeedback] = React.useState<any>(null);
  const [turnDebrief, setTurnDebrief] = React.useState<any>(null);
  const [showGameplayHelp, setShowGameplayHelp] = React.useState<boolean>(() => {
    try { return localStorage.getItem("dc_ocean_control_gameplay_help_v1") !== "dismissed" && !resumeRecord; }
    catch { return !resumeRecord; }
  });
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const [placementReady, setPlacementReady] = React.useState(false);
  const [placementNotice, setPlacementNotice] = React.useState("Choisis une orientation puis une case lumineuse.");
  const [orientation, setOrientation] = React.useState<OceanControlOrientation>("horizontal");
  const placementOwnerIdRef = React.useRef(getOceanPlacementOwner(initialState)?.id || "");
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `ocean-control-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getOceanActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeStats = state.statsByPlayer[String(activePlayer?.id || "")] || {};
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const ownerColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    state.owners.forEach((owner: any, index: number) => {
      const firstMemberId = owner?.memberIds?.[0];
      const playerIndex = players.findIndex((player) => String(player.id) === String(firstMemberId));
      map.set(owner.id, PLAYER_COLORS[(playerIndex >= 0 ? playerIndex : index) % PLAYER_COLORS.length]);
    });
    return map;
  }, [state.owners, players]);
  const ownOwner = activePlayer ? getOceanOwnerForPlayer(state, activePlayer.id) : null;
  const targetOwner = getOceanTargetOwner(state);
  const lastVisit = state.visits[state.visits.length - 1];

  function backToConfig() { if (typeof go === "function") go("ocean_control_config", config); }
  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.phase !== "playing" || throwDarts.length >= 3) return;
    const dart = { v: Number(v) || 0, mult: (mult || multiplier) as any };
    if (config.sfxEnabled !== false) playImpactFromDart({ value: dart.v, mult: dart.mult });
    setThrowDarts((prev) => [...prev, dart].slice(0, 3));
  }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3);
    if (!darts.length || state.phase !== "playing" || turnDebrief) return;
    const before = cloneOceanControlState(state);
    setUndoStack((prev) => [...prev.slice(-29), before]);
    const next = playOceanControlVisit(state, darts.map(uiToGameDart));
    const visit = next.visits[next.visits.length - 1];
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || oceanControlTacticalHint(next));
    setImpactFeedback(feedbackFromVisit(visit));
    setTurnDebrief(makeTurnDebrief(before, next, visit));
    if (config.sfxEnabled !== false) playOceanResultSfx(visit, next.phase === "finished");
  }

  function cancelOrUndo() { if (throwDarts.length) { if (config.sfxEnabled !== false) playUiClickSoft(); setThrowDarts([]); setMultiplier(1); setImpactFeedback(null); setNotice("Volée effacée."); return; } const previous = undoStack[undoStack.length - 1]; if (!previous) { setNotice("Aucune action à annuler."); return; } if (config.sfxEnabled !== false) playUiClickSoft(); setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowEnd(false); setImpactFeedback(null); autoSavedRef.current = ""; setNotice("Dernière volée annulée."); }
  function resetMatch() { if (config.sfxEnabled !== false) playUiConfirm(); matchIdRef.current = `ocean-control-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const next = createOceanControlState(players, config); setState(next); setThrowDarts([]); setUndoStack([]); setShowEnd(false); setOverlay(null); setPlacementReady(false); setImpactFeedback(null); setTurnDebrief(null); setNotice(oceanControlTacticalHint(next)); autoSavedRef.current = ""; }
  function chooseTarget(ownerId: string) { if (config.sfxEnabled !== false) playUiConfirm(); setState((prev) => selectOceanControlTarget(prev, ownerId)); setOverlay(null); }
  function chooseFocus(number: number) { if (config.sfxEnabled !== false) playUiClickSoft(); setState((prev) => selectOceanControlFocus(prev, number)); setNotice(`Zone ${number} sélectionnée pour le sonar / DBULL.`); }
  function makeTurnDebrief(before: OceanControlState, next: OceanControlState, visit: any) {
    const actor = getOceanActivePlayer(before);
    const actorProfile = profilesById.get(String(actor?.id || "")) || actor;
    const targetBefore = before.owners.find((owner: any) => String(owner.id) === String(visit?.targetOwnerId || ""));
    const sameBattle = Number(next.battleNumber) === Number(before.battleNumber);
    const targetAfter = sameBattle ? next.owners.find((owner: any) => String(owner.id) === String(visit?.targetOwnerId || "")) : null;
    const nextPlayer = next.phase === "playing" ? getOceanActivePlayer(next) : null;
    const nextProfile = nextPlayer ? (profilesById.get(String(nextPlayer.id)) || nextPlayer) : null;
    const events = Array.isArray(visit?.events) ? visit.events : [];
    const hitEvents = events.filter((event: any) => event?.type === "hit" || event?.type === "sunk");
    const sunkEvents = events.filter((event: any) => event?.type === "sunk");
    const sonarEvents = events.filter((event: any) => event?.type === "sonar");
    const waterEvents = events.filter((event: any) => event?.type === "water" || event?.type === "miss");
    const duplicateEvents = events.filter((event: any) => event?.type === "duplicate");
    const battleWon = events.some((event: any) => event?.type === "battle_win");
    const strike = events.some((event: any) => event?.type === "strike");
    const contactCount = sonarEvents.reduce((sum: number, event: any) => sum + Number(event?.contactCount || 0), 0);
    const hitZones = Array.from(new Set(hitEvents.map((event: any) => Number(event?.number || 0)).filter((value: number) => value > 0)));
    const shipNames = Array.from(new Set(sunkEvents.map((event: any) => String(event?.shipName || "")).filter(Boolean)));
    const title = battleWon
      ? "OCÉAN SOUS CONTRÔLE"
      : sunkEvents.length
        ? `${sunkEvents.length} NAVIRE${sunkEvents.length > 1 ? "S" : ""} COULÉ${sunkEvents.length > 1 ? "S" : ""}`
        : hitEvents.length
          ? `${hitEvents.length} IMPACT${hitEvents.length > 1 ? "S" : ""} CONFIRMÉ${hitEvents.length > 1 ? "S" : ""}`
          : sonarEvents.length
            ? contactCount > 0 ? `${contactCount} CONTACT${contactCount > 1 ? "S" : ""} SONAR` : "ZONE SONAR CLAIRE"
            : duplicateEvents.length
              ? "ZONE DÉJÀ CONTRÔLÉE"
              : "À L’EAU";
    const tone = battleWon ? "win" : sunkEvents.length ? "sunk" : hitEvents.length ? "hit" : sonarEvents.length ? "sonar" : duplicateEvents.length ? "duplicate" : "water";
    const color = battleWon ? GOLD : sunkEvents.length ? RED : hitEvents.length ? "#ff7a45" : sonarEvents.length ? CYAN : duplicateEvents.length ? "#a78bfa" : BLUE;
    const icon = battleWon ? "🏆" : sunkEvents.length ? "💥" : hitEvents.length ? "🔥" : sonarEvents.length ? "📡" : duplicateEvents.length ? "↻" : "🌊";
    const detail = battleWon
      ? `${targetBefore?.name || "La flotte ennemie"} est neutralisée.`
      : sunkEvents.length
        ? `${shipNames.join(" · ") || "Bâtiment ennemi"} détruit${shipNames.length > 1 ? "s" : ""}.`
        : hitEvents.length
          ? `${hitZones.length ? `Zones ${hitZones.join(", ")} touchées.` : "Impact sur la flotte ennemie."}`
          : sonarEvents.length
            ? contactCount > 0 ? "Le sonar révèle une zone prioritaire pour la prochaine attaque." : "Aucun bâtiment détecté dans la zone analysée."
            : waterEvents.length
              ? `${waterEvents.length} tir${waterEvents.length > 1 ? "s" : ""} sans contact.`
              : "Volée résolue.";
    return {
      id: `${visit?.id || Date.now()}-resolution`,
      stage: "result",
      actorId: actor?.id || visit?.playerId || null,
      actorName: playerName(actorProfile),
      actorProfile,
      actorIsBot: isBot(actorProfile, botIds),
      targetName: targetBefore?.name || "Flotte ennemie",
      battle: visit?.battle || before.battleNumber,
      round: visit?.round || before.roundIndex,
      darts: Array.isArray(visit?.labels) ? visit.labels : [],
      events: events.map((event: any) => ({ ...event, scanCells: Array.isArray(event?.scanCells) ? [...event.scanCells] : event?.scanCells })),
      gridNumbers: [...(before.gridNumbers || [])],
      items: visitResultItems(visit),
      title,
      detail,
      tone,
      color,
      icon,
      hitCount: hitEvents.length,
      sunkCount: sunkEvents.length,
      sonarUsed: sonarEvents.length > 0,
      contactCount,
      hitZones,
      shipNames,
      strike,
      targetShipsAfter: battleWon ? 0 : targetAfter ? oceanControlRemainingDecks(targetAfter) : null,
      battleWon,
      finished: next.phase === "finished",
      phaseAfter: next.phase,
      nextPlayerId: nextPlayer?.id || null,
      nextName: nextProfile ? playerName(nextProfile) : null,
      nextProfile,
      nextIsBot: nextProfile ? isBot(nextProfile, botIds) : false,
    };
  }

  function continueTurnDebrief() {
    if (!turnDebrief) return;
    if (turnDebrief.stage === "handoff") {
      setTurnDebrief(null);
      return;
    }
    if (turnDebrief.finished) {
      setTurnDebrief(null);
      setShowEnd(true);
      return;
    }
    const needsHandoff = state.phase === "playing"
      && turnDebrief.nextPlayerId
      && String(turnDebrief.nextPlayerId) !== String(turnDebrief.actorId)
      && !turnDebrief.nextIsBot;
    if (needsHandoff) {
      setTurnDebrief({ ...turnDebrief, stage: "handoff" });
      return;
    }
    setTurnDebrief(null);
  }

  function undoResolvedVisit() {
    setTurnDebrief(null);
    setShowEnd(false);
    cancelOrUndo();
  }
  function dismissGameplayHelp() { setShowGameplayHelp(false); try { localStorage.setItem("dc_ocean_control_gameplay_help_v1", "dismissed"); } catch {} }
  function handlePlace(cell: number) {
    const beforeOwner = getOceanPlacementOwner(state);
    const beforeOwnerId = beforeOwner?.id;
    const beforePlaced = (beforeOwner?.ships || []).filter((row: any) => row.cells?.length === row.length).length;
    const next = placeOceanControlShip(state, cell, orientation);
    const nextOwner = next.owners.find((row: any) => row.id === beforeOwnerId);
    const afterPlaced = (nextOwner?.ships || []).filter((row: any) => row.cells?.length === row.length).length;
    const afterOwner = getOceanPlacementOwner(next)?.id;
    if (afterPlaced <= beforePlaced) {
      setPlacementNotice("Placement impossible ici. Choisis une case lumineuse ou change l’orientation.");
      return;
    }
    if (config.sfxEnabled !== false) playUiConfirm();
    setState(next);
    setPlacementNotice(next.phase === "placement" && beforeOwnerId === afterOwner ? "Navire placé. Passe au suivant." : "Flotte verrouillée. Passe l’appareil au commandant suivant.");
    if (beforeOwnerId !== afterOwner || next.phase !== "placement") setPlacementReady(false);
  }
  function autoPlaceCurrentOwner() {
    let next = cloneOceanControlState(state); let safety = 0; const ownerId = getOceanPlacementOwner(state)?.id;
    while (next.phase === "placement" && getOceanPlacementOwner(next)?.id === ownerId && safety < 300) {
      const ship = getOceanNextUnplacedShip(next); if (!ship) break;
      const cell = Math.floor(Math.random() * 20); const orient = Math.random() > .5 ? "horizontal" : "vertical";
      const candidate = placeOceanControlShip(next, cell, orient as any);
      if (JSON.stringify(candidate) !== JSON.stringify(next)) next = candidate; safety += 1;
    }
    if (config.sfxEnabled !== false) playUiConfirm();
    setState(next); setPlacementNotice("Placement automatique terminé."); setPlacementReady(false);
  }

  React.useEffect(() => {
    const ownerId = getOceanPlacementOwner(state)?.id || "";
    if (ownerId !== placementOwnerIdRef.current) { placementOwnerIdRef.current = ownerId; setPlacementReady(false); setPlacementNotice("Choisis une orientation puis une case lumineuse."); }
  }, [state.placementOwnerIndex, state.phase]);
  React.useEffect(() => { setGlobalSfxEnabled(config.sfxEnabled !== false); }, [config.sfxEnabled]);

  React.useEffect(() => {
    if (config.sfxEnabled === false) return;
    const start = () => { void unlockAudio(); window.removeEventListener("pointerdown", start, true); };
    try { if ((navigator as any)?.userActivation?.hasBeenActive) { void unlockAudio(); return; } } catch {}
    window.addEventListener("pointerdown", start, { once: true, capture: true } as any);
    return () => window.removeEventListener("pointerdown", start, true);
  }, [config.sfxEnabled]);


  React.useEffect(() => {
    if (state.phase !== "placement") return;
    const owner = getOceanPlacementOwner(state); if (!owner) return;
    const allBot = owner.memberIds.every((id) => isBot(profilesById.get(String(id)), botIds));
    if (!allBot) return;
    const timer = window.setTimeout(autoPlaceCurrentOwner, 350);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.placementOwnerIndex]);

  React.useEffect(() => {
    if (state.phase !== "playing" || !activePlayer || !isBot(activeProfile, botIds) || botThinking || turnDebrief) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const plan = pickOceanControlBotDarts(state, config.botLevel);
      let prepared = plan.focusNumber ? selectOceanControlFocus(state, plan.focusNumber) : state;
      const next = playOceanControlVisit(prepared, plan.darts);
      setUndoStack((prev) => [...prev.slice(-29), cloneOceanControlState(state)]); setState(next); setThrowDarts([]); setBotThinking(false);
      const visit = next.visits[next.visits.length - 1]; setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || "Volée BOT validée."); setImpactFeedback(feedbackFromVisit(visit)); setTurnDebrief(makeTurnDebrief(state, next, visit)); if (config.sfxEnabled !== false) playOceanResultSfx(visit, next.phase === "finished");
    }, 650);
    return () => { window.clearTimeout(timer); setBotThinking(false); };
  }, [state.activePlayerIndex, state.roundIndex, state.battleNumber, state.phase, turnDebrief?.id, turnDebrief?.stage]);

  React.useEffect(() => { if (!overlay) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOverlay(null); }; window.addEventListener("keydown", onKey); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); }; }, [overlay]);
  React.useEffect(() => { if (!impactFeedback) return; const timer = window.setTimeout(() => setImpactFeedback(null), 1650); return () => window.clearTimeout(timer); }, [impactFeedback?.id]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished"; const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player; const stats = state.statsByPlayer[player.id] || {}; const owner = getOceanOwnerForPlayer(state, player.id);
      const visits = state.visits.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart, dartIndex) => ({ ...dart, label: visit.labels[dartIndex], battle: visit.battle, round: visit.round, visit: visit.visit, dartIndex: dartIndex + 1, events: visit.events })));
      const won = finished && state.winnerPlayerIds.includes(player.id);
      const mission = oceanControlMissionSummary(stats, config);
      const competitive = oceanControlCompetitiveScore(stats, config, { won });
      return { id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null, dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, color: PLAYER_COLORS[index % PLAYER_COLORS.length], ownerId: owner?.id || null, ownerName: owner?.name || null, rank: won ? 1 : 2, win: won, winner: won, ...stats, accuracy: oceanControlAccuracy(stats), mission, commandScore: competitive.score, commandGrade: competitive.grade, commandGradeColor: competitive.gradeColor, commandProfile: competitive, visitsHistory: visits, visitHistory: visits, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) } };
    });
    const commandStandings = playerRows.slice().sort((a: any, b: any) => Number(b.win) - Number(a.win) || Number(b.commandScore || 0) - Number(a.commandScore || 0) || Number(b.shipsSunk || 0) - Number(a.shipsSunk || 0) || Number(b.shipHits || 0) - Number(a.shipHits || 0)).map((row: any, index: number) => ({ ...row, commandRank: index + 1 }));
    const commandRankById = new Map(commandStandings.map((row: any) => [String(row.id), Number(row.commandRank)]));
    const commandLeaderScore = Number(commandStandings[0]?.commandScore || 0);
    playerRows.forEach((row: any) => {
      row.commandRank = commandRankById.get(String(row.id)) || 0;
      row.commandDeltaToLeader = Number(row.commandScore || 0) - commandLeaderScore;
    });
    const commandDuel = commandStandings.length >= 2 ? {
      leaderPlayerId: commandStandings[0].id,
      leaderName: commandStandings[0].name,
      leaderScore: Number(commandStandings[0].commandScore || 0),
      leaderGrade: commandStandings[0].commandGrade,
      rivalPlayerId: commandStandings[1].id,
      rivalName: commandStandings[1].name,
      rivalScore: Number(commandStandings[1].commandScore || 0),
      rivalGrade: commandStandings[1].commandGrade,
      gap: Number(commandStandings[0].commandScore || 0) - Number(commandStandings[1].commandScore || 0),
    } : null;
    const matchStats = buildOceanControlMatchStats(state);
    const summary = { kind: "ocean_control", mode: "ocean_control", sport: "darts", variant: config.variant, variantLabel: oceanControlVariantLabel(config.variant), finished, statisticsVersion: 5, telemetryVersion: 2, winnerId: finished ? state.winnerPlayerIds[0] || null : null, winnerIds: finished ? state.winnerPlayerIds : [], winnerOwnerIds: finished ? state.winnerOwnerIds : [], winnerName: finished ? state.owners.filter((owner) => state.winnerOwnerIds.includes(owner.id)).map((owner) => owner.name).join(" / ") : null, battlesPlayed: state.battleNumber, configuredWins: config.winsNeeded, players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999) || Number(a.commandRank || 999) - Number(b.commandRank || 999)) : [], commandStandings: commandStandings.map((row: any) => ({ playerId: row.id, name: row.name, commandRank: row.commandRank, commandScore: row.commandScore, commandGrade: row.commandGrade, commandDeltaToLeader: row.commandDeltaToLeader, missionPercent: row?.mission?.percent || 0, accuracy: row.accuracy, shipsSunk: row.shipsSunk, shipHits: row.shipHits })), commandDuel, visits: state.visits, sonarScans: state.sonarScans || [], battleHistory: state.battleHistory || [], matchStats, config, scoreByOwner: state.scoreByOwner, scoreLine: `${oceanControlVariantLabel(config.variant)} · ${matchStats.shipsSunk} navires coulés · ${matchStats.totalDarts} fléchettes`, game: { mode: "ocean_control", variant: config.variant, winsNeeded: config.winsNeeded } };
    return { id: matchIdRef.current, matchId: matchIdRef.current, kind: "ocean_control", mode: "ocean_control", sport: "darts", status, statisticsVersion: 5, telemetryVersion: 2, createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now, ...(finished ? { finishedAt: now, endedAt: now } : {}), winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName, players: playerRows, resumeId: matchIdRef.current, resume: { config, state: cloneOceanControlState(state), updatedAt: now }, game: summary.game, summary, payload: { kind: "ocean_control", mode: "ocean_control", sport: "darts", variant: config.variant, statisticsVersion: 5, telemetryVersion: 2, config, players: playerRows, summary, visits: state.visits, visitHistory: state.visits, sonarScans: state.sonarScans || [], battleHistory: state.battleHistory || [], stateSnapshot: cloneOceanControlState(state), stats: { sport: "darts", mode: "ocean_control", variant: config.variant, players: playerRows, match: matchStats, global: matchStats } } };
  }

  React.useEffect(() => { if (state.phase === "finished" || state.visits.length === 0) return; const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 280); return () => window.clearTimeout(timer); }, [state]);
  React.useEffect(() => { if (state.phase !== "finished") return; if (!turnDebrief) setShowEnd(true); if (autoSavedRef.current === matchIdRef.current) return; autoSavedRef.current = matchIdRef.current; try { onFinish?.(buildHistoryRecord("finished"), { navigate: false }); } catch {} }, [state.phase, turnDebrief?.id]);

  const remainingShips = oceanControlRemainingDecks(targetOwner);
  const remainingCells = oceanControlRemainingCells(targetOwner);
  const totalTargetCells = targetOwner?.ships?.reduce((sum: number, ship: any) => sum + Number(ship.length || 0), 0) || 1;
  const targetDamagePercent = Math.max(0, Math.min(100, Math.round(((totalTargetCells - remainingCells) / totalTargetCells) * 100)));
  const latestSonar = oceanControlLatestSonarScan(state, targetOwner?.id);
  const sonarScansForTarget = (state.sonarScans || []).filter((scan) => scan.targetOwnerId === targetOwner?.id).slice(-8).reverse();
  const recentCells = lastVisit?.targetOwnerId === targetOwner?.id ? Array.from(new Set((lastVisit?.events || []).map((event: any) => event.cell).filter((cell: any) => Number.isInteger(cell)))) : [];
  const targetHeatmap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (state.visits || []).forEach((visit: any) => {
      if (String(visit?.targetOwnerId || "") !== String(targetOwner?.id || "")) return;
      (visit?.events || []).forEach((event: any) => {
        if (!["hit", "sunk", "water", "duplicate", "strike"].includes(String(event?.type || ""))) return;
        const number = Number(event?.number || 0);
        if (number < 1 || number > 20) return;
        counts[String(number)] = (counts[String(number)] || 0) + 1;
      });
    });
    return { counts, max: Math.max(1, ...Object.values(counts).map(Number)) };
  }, [state.visits, targetOwner?.id]);
  const battlePhase = React.useMemo(() => {
    if (targetDamagePercent >= 72) return { label: "FINITION", detail: "Flotte adverse proche de la rupture", color: RED, icon: "🔥" };
    if (targetDamagePercent >= 30) return { label: "ENGAGEMENT", detail: "La bataille est pleinement engagée", color: GOLD, icon: "⚔️" };
    return { label: "RECONNAISSANCE", detail: "Cartographie et recherche des premiers contacts", color: CYAN, icon: "📡" };
  }, [targetDamagePercent]);
  const tacticalRecommendation = React.useMemo(() => {
    if (!targetOwner) return null;
    const unknown = (state.gridNumbers || []).map((number: number, cell: number) => ({ number, cell })).filter((row: any) => !targetOwner?.attackedCells?.[String(row.cell)]);
    if (!unknown.length) return null;
    const sonarCandidates = latestSonar?.contactCount > 0 ? unknown.filter((row: any) => latestSonar?.cells?.includes(row.cell)) : [];
    const pool = sonarCandidates.length ? sonarCandidates : unknown;
    const sorted = pool.slice().sort((a: any, b: any) => {
      const heatA = Number(targetHeatmap?.counts?.[String(a.number)] || 0);
      const heatB = Number(targetHeatmap?.counts?.[String(b.number)] || 0);
      if (sonarCandidates.length) return heatB - heatA || a.number - b.number;
      return heatA - heatB || a.number - b.number;
    });
    const best = sorted[0];
    return best ? { ...best, source: sonarCandidates.length ? "sonar" : "exploration", heat: Number(targetHeatmap?.counts?.[String(best.number)] || 0) } : null;
  }, [state.gridNumbers, targetOwner?.id, targetOwner?.attackedCells, latestSonar?.id, latestSonar?.contactCount, targetHeatmap]);
  const combatMomentum = React.useMemo(() => {
    const visits = (state.visits || []).filter((visit: any) => String(visit?.playerId || "") === String(activePlayer?.id || "")).slice(-3);
    let score = 0;
    visits.forEach((visit: any) => (visit?.events || []).forEach((event: any) => {
      if (event?.type === "battle_win") score += 6;
      else if (event?.type === "sunk") score += 4;
      else if (event?.type === "strike") score += 3;
      else if (event?.type === "hit") score += 2;
      else if (event?.type === "sonar" && Number(event?.contactCount || 0) > 0) score += 1;
      else if (["water", "duplicate", "miss"].includes(String(event?.type || ""))) score -= 1;
    }));
    if (!visits.length) return { label: "EN ATTENTE", detail: "Première volée à jouer", color: SOFT, icon: "◌", score: 0 };
    if (score >= 8) return { label: "DOMINATION", detail: "Pression maximale", color: GREEN, icon: "▲", score };
    if (score >= 4) return { label: "PRESSION", detail: "Avantage tactique", color: GOLD, icon: "↗", score };
    if (score >= 0) return { label: "ÉQUILIBRE", detail: "Bataille ouverte", color: CYAN, icon: "◆", score };
    return { label: "REPLI", detail: "Reprendre l’initiative", color: RED, icon: "▼", score };
  }, [state.visits, activePlayer?.id]);
  const commandRadar = React.useMemo(() => {
    const precision = Math.max(0, Math.min(100, oceanControlAccuracy(activeStats)));
    const damage = Math.max(0, Math.min(100, targetDamagePercent));
    const sonarEfficiency = Number(activeStats?.sonarUses || 0) > 0 ? Math.min(100, Math.round((Number(activeStats?.sonarContacts || 0) / Math.max(1, Number(activeStats?.sonarUses || 0) * 3)) * 100)) : 0;
    const tempo = Number(activeStats?.visits || 0) > 0 ? Math.min(100, Math.round((Number(activeStats?.successfulVisits || 0) / Math.max(1, Number(activeStats?.visits || 0))) * 100)) : 0;
    const streak = Math.min(100, Number(activeStats?.bestHitStreak || 0) * 20);
    return [
      { label: "PRÉCISION", value: precision, color: GREEN },
      { label: "DÉGÂTS", value: damage, color: RED },
      { label: "SONAR", value: sonarEfficiency, color: CYAN },
      { label: "TEMPO", value: tempo, color: BLUE },
      { label: "SÉRIE", value: streak, color: GOLD },
    ];
  }, [activeStats, targetDamagePercent]);
  const activeMission = React.useMemo(() => oceanControlMissionSummary(activeStats, config), [activeStats, config]);
  const liveCommandStandings = React.useMemo(() => buildOceanControlCompetitiveTable(state.players, state.statsByPlayer, config, state.phase === "finished" ? state.winnerPlayerIds : []), [state.players, state.statsByPlayer, state.phase, state.winnerPlayerIds, config]);
  const activeCommandEntry = liveCommandStandings.find((row: any) => String(row.playerId) === String(activePlayer?.id || "")) || null;
  const liveRivalry = React.useMemo(() => buildOceanControlRivalrySnapshot(liveCommandStandings, activePlayer?.id), [liveCommandStandings, activePlayer?.id]);
  const scoreLine = state.owners.map((owner) => `${owner.name} ${state.scoreByOwner[owner.id] || 0}`).join(" · ");
  const targetColor = ownerColorMap.get(String(targetOwner?.id || "")) || RED;
  const ownColor = ownerColorMap.get(String(ownOwner?.id || "")) || activeColor;
  const lastResultItems = visitResultItems(lastVisit);
  const salvoPreview = React.useMemo(() => oceanSalvoPreview(state, throwDarts, config.variant === "tactical"), [state.gridNumbers, state.focusNumber, throwDarts, config.variant]);
  const selectedWeapon = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  const currentWeaponEffect = weaponEffectLabel(selectedWeapon as any, config.variant === "tactical");
  const gameplayStep = botThinking
    ? { step: "BOT", icon: "🤖", title: "LE BOT JOUE", detail: "Observe le résultat de sa volée.", action: "Aucune action requise", tone: GOLD }
    : !targetOwner
      ? { step: "1", icon: "🎯", title: "CHOISIS UNE FLOTTE ENNEMIE", detail: "Sélectionne l’adversaire que tu veux attaquer.", action: "CHOISIR UNE CIBLE", tone: RED }
      : throwDarts.length === 0
        ? { step: "1", icon: "🎯", title: "LANCE TA VOLÉE", detail: state.focusNumber ? `Focus spécial ${state.focusNumber} prêt pour Bull / DBull. S / D / T attaquent directement le secteur touché.` : "S / D / T attaquent directement le secteur touché. Pour Bull / DBull, choisis d’abord un focus sur la carte.", action: "SAISIR LA 1re FLÉCHETTE", tone: GREEN }
        : throwDarts.length < 3
          ? { step: "2", icon: "🎯", title: `CONTINUE · ${throwDarts.length}/3 FLÉCHETTES`, detail: `Déjà saisi : ${throwDarts.map(dartPreviewLabel).join(" / ")}. Vérifie l’effet D1 / D2 / D3 avant validation.`, action: `IL RESTE ${3 - throwDarts.length}`, tone: BLUE }
          : { step: "3", icon: "✓", title: "VOLÉE PRÊTE", detail: `${throwDarts.map(dartPreviewLabel).join(" / ")} · vérifie les zones prévues sur la carte puis valide.`, action: "VALIDER LA VOLÉE", tone: GREEN };
  const noticeSlot = <div style={{ color: botThinking ? GOLD : SOFT, fontSize: 8.2, fontWeight: 900, textAlign: "center", lineHeight: 1.2 }}>{botThinking ? "BOT EN APPROCHE…" : notice}</div>;

  if (turnDebrief) return <div className="ocean-turn-resolution-page" style={{ color: theme?.text || "#fff" }}>
    <PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" tickerHeight={60} tickerBottomGap={2} left={<BackDot onClick={backToConfig} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Résolution de volée" color={CYAN} glow={`${CYAN}88`} content={<Rules config={config} />} />} />
    <TurnResolutionScreen debrief={turnDebrief} onContinue={continueTurnDebrief} onUndo={undoResolvedVisit} />
  </div>;

  if (state.phase === "placement") return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(48,185,255,.22),#07101b 43%,#020507 100%)" }}><PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" tickerHeight={78} tickerBottomGap={6} left={<BackDot onClick={backToConfig} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Placement de la flotte" color={CYAN} glow={`${CYAN}88`} content={<Rules config={config} />} />} /><PlacementScreen state={state} profilesById={profilesById} ready={placementReady} onReady={() => { setPlacementReady(true); setPlacementNotice("Choisis une orientation puis une case lumineuse."); }} orientation={orientation} setOrientation={(nextOrientation: OceanControlOrientation) => { setOrientation(nextOrientation); setPlacementNotice(nextOrientation === "horizontal" ? "Horizontal sélectionné : le navire part vers la droite." : "Vertical sélectionné : le navire descend."); }} onPlace={handlePlace} onReset={() => { setState((prev) => resetOceanPlacementOwner(prev)); setPlacementNotice("Flotte effacée. Recommence le placement."); }} onAuto={autoPlaceCurrentOwner} notice={placementNotice} /></div>;

  return <div className="ocean-control-page" style={{ color: theme?.text || "#fff" }}>
    <PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" tickerHeight={60} tickerBottomGap={2} left={<BackDot onClick={backToConfig} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Règles OCEAN CONTROL" color={CYAN} glow={`${CYAN}88`} content={<Rules config={config} />} />} />

    <main className="ocean-control-main">
      <section className="ocean-commander-panel" style={{ borderColor: `${activeColor}66` }}>
        <div className="ocean-commander-bar">
          <ProfileAvatar profile={activeProfile} size={36} />
          <div className="ocean-commander-identity">
            <div className="ocean-commander-name" style={{ color: activeColor }}>{playerName(activeProfile)}</div>
            <div className="ocean-commander-meta">{ownOwner?.name} · Bataille {state.battleNumber}</div>
            <div className="ocean-commander-target">CIBLE · {targetOwner?.name || "—"}</div>
          </div>
          <div className="ocean-commander-metrics">
            <div className="ocean-mini-kpi"><span>NAVIRES</span><strong style={{ color: RED }}>{remainingShips}</strong></div>
            <div className="ocean-mini-kpi"><span>FOCUS</span><strong style={{ color: state.focusNumber ? GOLD : SOFT }}>{state.focusNumber || "—"}</strong></div>
            <div className="ocean-mini-kpi"><span>VOLÉE</span><strong style={{ color: CYAN }}>{throwDarts.length}/3</strong></div>
            <div className="ocean-mini-kpi"><span>RANG</span><strong style={{ color: activeCommandEntry?.gradeColor || SOFT }}>#{activeCommandEntry?.rank || "—"}{liveRivalry ? <small className="ocean-rank-delta" style={{ color: liveRivalry.color }}>{liveRivalry.delta > 0 ? ` +${liveRivalry.delta}` : liveRivalry.delta < 0 ? ` ${liveRivalry.delta}` : " ="}</small> : null}</strong></div>
          </div>
        </div>
        <div className="ocean-match-scoreline"><span>BO{config.winsNeeded * 2 - 1}</span><strong>{scoreLine}</strong><span>{oceanControlDifficultyLabel(config.difficulty)} · OBJ {activeMission.completed}/{activeMission.total}</span></div>
        <div className="ocean-live-command-strip">
          <div className="ocean-live-command-phase" style={{ borderColor: `${battlePhase.color}55`, color: battlePhase.color }}><span>{battlePhase.icon}</span><strong>{battlePhase.label}</strong><small>{battlePhase.detail}</small></div>
          <button type="button" className="ocean-live-command-reco" disabled={!tacticalRecommendation} onClick={() => tacticalRecommendation && chooseFocus(tacticalRecommendation.number)} style={{ borderColor: `${GOLD}55` }}><span>🧭</span><strong>ZONE CONSEILLÉE {tacticalRecommendation?.number || "—"}</strong><small>{tacticalRecommendation?.source === "sonar" ? "Contact sonar à exploiter" : "Zone encore peu travaillée"}</small></button>
          <div className="ocean-live-command-momentum" style={{ borderColor: `${combatMomentum.color}55`, color: combatMomentum.color }}><span>{combatMomentum.icon}</span><strong>{combatMomentum.label}</strong><small>{combatMomentum.detail} · Mission {activeMission.percent}%</small></div>
        </div>
        <div className="ocean-fleet-score-strip" aria-label="État des flottes">
          {state.owners.map((owner: any, index: number) => {
            const color = ownerColorMap.get(String(owner.id)) || PLAYER_COLORS[index % PLAYER_COLORS.length];
            const isTarget = String(owner.id) === String(targetOwner?.id || "");
            const isOwn = String(owner.id) === String(ownOwner?.id || "");
            const ships = oceanControlRemainingDecks(owner);
            return <button key={owner.id} type="button" disabled={isOwn || owner.eliminated} onClick={() => !isOwn && !owner.eliminated && chooseTarget(owner.id)} className={`ocean-fleet-score-chip ${isTarget ? "is-target" : ""} ${owner.eliminated ? "is-eliminated" : ""}`} style={{ ["--fleet-color" as any]: color }}><span className="ocean-fleet-score-chip__dot" /><strong>{owner.name}</strong><span>{state.scoreByOwner[owner.id] || 0} pts · {ships} nav.</span></button>;
          })}
        </div>
      </section>

      {showGameplayHelp && state.visits.length === 0 && state.phase === "playing" ? <FirstRunGuide onClose={dismissGameplayHelp} /> : null}

      <section className="ocean-next-action" style={{ ["--action-color" as any]: gameplayStep.tone }}>
        <div className="ocean-next-action__step"><span>{gameplayStep.step}</span><small>ÉTAPE</small></div>
        <div className="ocean-next-action__copy"><span>{gameplayStep.icon} QUE FAIRE MAINTENANT ?</span><strong>{gameplayStep.title}</strong><small>{gameplayStep.detail}</small></div>
        <button type="button" disabled={botThinking} onClick={() => {
          if (!targetOwner) setOverlay("targets");
          else if (throwDarts.length >= 3) commitVisit();
          else setOverlay(null);
        }}>{gameplayStep.action}</button>
      </section>

      <section className="ocean-last-result" aria-live="polite">
        <div className="ocean-last-result__head"><span>DERNIER RÉSULTAT</span><strong>{lastVisit ? `B${lastVisit.battle} · T${lastVisit.round}` : "EN ATTENTE"}</strong></div>
        <div className="ocean-last-result__items">
          {lastResultItems.length ? lastResultItems.map((item: any) => <span key={item.key} className={`is-${item.tone}`}><i>{item.icon}</i><strong>{item.label}</strong></span>) : <span className="is-idle"><i>🎯</i><strong>Choisis une zone puis lance ta première volée.</strong></span>}
        </div>
      </section>

      <section className="ocean-grid-panel">
        <div className="ocean-grid-heading">
          <div>
            <strong>CARTE TACTIQUE · GRILLE ENNEMIE</strong>
            <span>{remainingCells} zones intactes · {targetDamagePercent}% détruit</span>
          </div>
          <button type="button" className="ocean-grid-help" onClick={() => setOverlay("intel")}>{latestSonar ? `SONAR ${latestSonar.contactCount}` : oceanControlVariantLabel(config.variant)}</button>
        </div>
        <div className="ocean-target-progress" aria-label={`${targetDamagePercent}% de la flotte ennemie détruite`}><span style={{ width: `${targetDamagePercent}%` }} /></div>
        <div className="ocean-map-launcher" role="button" tabIndex={0} onClick={() => setOverlay("map")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOverlay("map"); } }}>
          <div className="ocean-map-launcher__hero">
            <div>
              <strong>OUVRIR LA CARTE ENNEMIE</strong>
              <span>{battlePhase.icon} {battlePhase.label} · {tacticalRecommendation ? `zone conseillée ${tacticalRecommendation.number}` : "analyse en cours"}</span>
            </div>
            <button type="button" className="ocean-map-launcher__cta" onClick={(event) => { event.stopPropagation(); setOverlay("map"); }}>OUVRIR</button>
          </div>
          <div className="ocean-map-launcher__preview">
            <OceanGrid state={state} owner={targetOwner} onFocus={(number: number) => { chooseFocus(number); setOverlay("map"); }} sonarScan={latestSonar} recentCells={recentCells} shipColor={targetColor} heatmap={targetHeatmap} plannedCells={salvoPreview.plannedCells} compact />
          </div>
          <div className="ocean-map-legend-row"><StatusLegend /><span className="ocean-heat-legend"><i /> Pression de tir</span></div>
        </div>
        <ImpactFeedback feedback={impactFeedback} />
        <div className="ocean-floating-dock" aria-label="Informations de partie">
          <QuickButton icon="🗺️" label="CARTE" value={`${state.focusNumber || "—"}`} color={targetColor} onClick={() => setOverlay("map")} />
          <QuickButton icon="⚓" label="FLOTTE" value={`${oceanControlRemainingDecks(ownOwner)} navires`} color={ownColor} onClick={() => setOverlay("fleet")} />
          <QuickButton icon="🎯" label="CIBLES" value={`${state.owners.filter((owner) => owner.id !== ownOwner?.id && !owner.eliminated).length} ennemies`} color={RED} onClick={() => setOverlay("targets")} />
          <QuickButton icon="📡" label="SONAR" value={`${latestSonar?.contactCount ?? 0} contacts`} color={CYAN} onClick={() => setOverlay("intel")} />
          <QuickButton icon="📊" label="STATS" value={`${oceanControlAccuracy(activeStats)}% précision`} color={GOLD} onClick={() => setOverlay("stats")} />
          <QuickButton icon="📖" label="JOURNAL" value={`${state.visits.length} volées`} color="#a78bfa" onClick={() => setOverlay("log")} />
        </div>
      </section>

      <section className="ocean-fire-control-panel">
        <div className="ocean-fire-control-head">
          <div>
            <strong>POSTE DE TIR</strong>
            <span>Simple, double, triple, sonar Bull et frappe DBULL.</span>
          </div>
          <div className="ocean-weapon-pips">
            <span className="is-simple">S</span>
            <span className="is-double">D</span>
            <span className="is-triple">T</span>
            <span className="is-bull">B</span>
            <span className="is-dbull">DB</span>
          </div>
        </div>
        <GameplayWeaponGuide multiplier={multiplier} tactical={config.variant === "tactical"} focusNumber={state.focusNumber} disabled={botThinking} onSelect={(item: any) => {
          if (item.id === "B") {
            setMultiplier(1);
            if (!state.focusNumber) { setNotice("Bull = sonar : choisis d’abord la zone à scanner."); setOverlay("map"); }
            else setNotice(`Bull = SONAR autour de la zone ${state.focusNumber}.`);
          }
          else if (item.id === "DB") {
            setMultiplier(2);
            if (!state.focusNumber) { setNotice("DBULL = frappe précise : choisis d’abord la zone à frapper."); setOverlay("map"); }
            else setNotice(`DBULL = frappe de précision sur la zone ${state.focusNumber}.`);
          }
          else { setMultiplier(item.mult); setNotice(item.detail); }
        }} />
        <div className="ocean-focus-readout">
          <span>FOCUS SPÉCIAL</span><strong style={{ color: state.focusNumber ? GOLD : SOFT }}>{state.focusNumber || "AUCUN"}</strong><small>{state.focusNumber ? "Bull = scanner autour · DBull = frapper cette zone · S/D/T restent libres." : "Optionnel pour S/D/T · obligatoire avant Bull ou DBull."}</small>
          <button type="button" onClick={() => setOverlay("map")}>{state.focusNumber ? "CHANGER" : "CHOISIR UNE ZONE"}</button>
        </div>
        <SalvoPreview preview={salvoPreview} />
        {config.scoreInputMethod === "dartboard" ? <div className="ocean-dartboard-input">
          <div className="ocean-pad-statusline">
            <div className="ocean-pad-statusline__notice">{noticeSlot}</div>
            <div className="ocean-pad-preview-strip">{[0, 1, 2].map((index) => <span key={index} className="ocean-pad-preview-chip">{dartPreviewLabel(throwDarts[index])}</span>)}</div>
          </div>
          <DartboardClickable onHit={(segment, mult) => addDart(segment, mult)} multiplier={multiplier} size={Math.min(205, typeof window !== "undefined" ? window.innerWidth - 118 : 200)} disabled={botThinking} />
          <div className="ocean-pad-action-row">
            <button type="button" className={`ocean-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""}`} onClick={() => setMultiplier(1)} disabled={botThinking}>SIMPLE</button>
            <button type="button" className={`ocean-pad-mode ${multiplier === 2 ? "is-active is-double" : ""}`} onClick={() => setMultiplier(2)} disabled={botThinking}>DOUBLE</button>
            <button type="button" className={`ocean-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""}`} onClick={() => setMultiplier(3)} disabled={botThinking}>TRIPLE</button>
            <button type="button" className="ocean-pad-undo" onClick={cancelOrUndo} disabled={botThinking}>↶</button>
          </div>
          <div className="ocean-pad-footer-row ocean-pad-footer-row--dual-bull">
            <button type="button" className="ocean-pad-bull is-bull25" onClick={() => addDart(25, 1)} disabled={botThinking}>{lang === "fr" ? "1/2 BULL" : "BULL"}</button>
            <button type="button" className="ocean-pad-bull is-dbull" onClick={() => addDart(25, 2)} disabled={botThinking}>{lang === "fr" ? "BULL" : "DBULL"}</button>
            <button type="button" className="ocean-pad-backspace" onClick={() => setThrowDarts((prev) => prev.slice(0, -1))} disabled={botThinking || !throwDarts.length}>⌫</button>
            <button onClick={() => commitVisit()} disabled={!throwDarts.length || botThinking} className="ocean-pad-validate">VALIDER</button>
          </div>
        </div> : <CompactDartPad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={(bull: 25 | 50) => addDart(25, bull === 50 ? 2 : 1)} onValidate={() => commitVisit()} noticeSlot={noticeSlot} disabled={botThinking} />}
      </section>
    </main>

    {overlay === "map" ? <OverlayShell title="CARTE ENNEMIE" subtitle={`${targetOwner?.name || "Aucune cible"} · Focus ${state.focusNumber || "—"}`} color={targetColor} onClose={() => setOverlay(null)}><div className="ocean-map-howto"><b>1</b><div><strong>TOUCHE UNE CASE 1–20</strong><small>Elle devient uniquement le focus des armes spéciales : Bull scanne autour, DBull frappe cette zone. Les tirs S/D/T attaquent toujours la valeur réellement touchée.</small></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}><Kpi label="NAVIRES RESTANTS" value={remainingShips} color={RED} /><Kpi label="ZONES INTACTES" value={remainingCells} color={CYAN} /><Kpi label="DÉGÂTS" value={`${targetDamagePercent}%`} color={GOLD} /></div><div className="ocean-map-command-card" style={{ borderColor: `${battlePhase.color}44` }}><div><span style={{ color: battlePhase.color }}>{battlePhase.icon} {battlePhase.label}</span><strong>{tacticalRecommendation ? `Priorité zone ${tacticalRecommendation.number}` : "Aucune zone disponible"}</strong><small>{tacticalRecommendation?.source === "sonar" ? `Le dernier sonar a détecté ${latestSonar?.contactCount || 0} contact(s) dans ce secteur.` : "Le système recommande une zone encore peu explorée pour élargir la couverture."}</small></div><button type="button" disabled={!tacticalRecommendation} onClick={() => tacticalRecommendation && chooseFocus(tacticalRecommendation.number)}>FOCUS {tacticalRecommendation?.number || "—"}</button></div><div className="ocean-map-overlay-toolbar"><button type="button" className="ocean-map-overlay-tool" onClick={() => setOverlay("intel")}>📡 Centre tactique</button><button type="button" className="ocean-map-overlay-tool" onClick={() => setOverlay("targets")}>🎯 Changer de cible</button><button type="button" className="ocean-map-overlay-tool" onClick={cancelOrUndo}>↶ Annuler</button></div><div className="ocean-map-overlay-grid"><OceanGrid state={state} owner={targetOwner} onFocus={chooseFocus} sonarScan={latestSonar} recentCells={recentCells} shipColor={targetColor} heatmap={targetHeatmap} plannedCells={salvoPreview.plannedCells} /></div><div className="ocean-map-legend-row"><StatusLegend /><span className="ocean-heat-legend"><i /> Pression de tir</span></div><div className="ocean-map-overlay-footnote">Sélectionne une case pour définir le focus du sonar ou de la DBULL. Avant validation, D1 / D2 / D3 montrent directement les zones que ta volée va affecter.</div></OverlayShell> : null}
    {overlay === "fleet" ? <OverlayShell title="MA FLOTTE" subtitle={`${ownOwner?.name} · ${scoreLine}`} color={GREEN} onClose={() => setOverlay(null)}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}><Kpi label="NAVIRES ACTIFS" value={oceanControlRemainingDecks(ownOwner)} color={GREEN} /><Kpi label="ZONES INTACTES" value={oceanControlRemainingCells(ownOwner)} color={CYAN} /><Kpi label="MANCHES" value={state.scoreByOwner[ownOwner?.id || ""] || 0} color={GOLD} /></div><ShipStrip owner={ownOwner} reveal color={ownColor} /><div style={{ marginTop: 10 }}><OceanGrid state={state} owner={ownOwner} own onFocus={() => {}} shipColor={ownColor} /></div></OverlayShell> : null}
    {overlay === "targets" ? <OverlayShell title="CHOISIR UNE FLOTTE ENNEMIE" subtitle="Change la cible de la prochaine volée" color={RED} onClose={() => setOverlay(null)}><div style={{ display: "grid", gap: 8 }}>{state.owners.filter((owner) => owner.id !== ownOwner?.id).map((owner) => { const total = owner.ships.reduce((sum, ship) => sum + ship.length, 0) || 1; const left = oceanControlRemainingCells(owner); const damage = Math.round(((total - left) / total) * 100); return <button key={owner.id} disabled={owner.eliminated} onClick={() => chooseTarget(owner.id)} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 11, borderRadius: 15, border: `1px solid ${state.targetOwnerId === owner.id ? RED : "rgba(255,255,255,.09)"}`, background: state.targetOwnerId === owner.id ? `${RED}14` : "rgba(255,255,255,.03)", color: owner.eliminated ? "rgba(255,255,255,.3)" : "#fff", textAlign: "left" }}><div><div style={{ fontWeight: 1100 }}>{owner.name}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{oceanControlRemainingDecks(owner)} navires · {left} zones · {damage}% détruit</div><div style={{ marginTop: 6, height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ width: `${damage}%`, height: "100%", background: `linear-gradient(90deg,${GOLD},${RED})` }} /></div></div><strong style={{ color: owner.eliminated ? RED : CYAN }}>{owner.eliminated ? "COULÉE" : state.targetOwnerId === owner.id ? "CIBLE" : "VISER"}</strong></button>; })}</div></OverlayShell> : null}
    {overlay === "intel" ? <OverlayShell title="CENTRE TACTIQUE" subtitle={`${targetOwner?.name || "Aucune cible"} · ${remainingCells} zones intactes`} color={CYAN} onClose={() => setOverlay(null)}>
      <div className="ocean-intel-mission"><span>🧭</span><div><strong>RECOMMANDATION DU COMMANDANT</strong><p>{oceanControlTacticalHint(state)}</p></div></div>
      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}><Kpi label="DÉGÂTS" value={`${targetDamagePercent}%`} color={RED} detail={`${totalTargetCells - remainingCells}/${totalTargetCells} zones`} /><Kpi label="DERNIER SONAR" value={latestSonar ? latestSonar.contactCount : "—"} color={CYAN} detail={latestSonar ? `autour du ${latestSonar.focusNumber}` : "aucun balayage"} /><Kpi label="SÉRIE D’IMPACTS" value={activeStats.currentHitStreak || 0} color={GOLD} detail={`record ${activeStats.bestHitStreak || 0}`} /></div>
      <div className="ocean-intel-section"><strong>HISTORIQUE SONAR</strong>{sonarScansForTarget.length ? <div className="ocean-sonar-history">{sonarScansForTarget.map((scan) => <button key={scan.id} type="button" onClick={() => { setState((prev) => selectOceanControlFocus(prev, scan.focusNumber)); setOverlay(null); }} className={`ocean-sonar-card ${scan.contactCount ? "has-contact" : "is-clear"}`}><span>📡 {scan.focusNumber}</span><strong>{scan.contactCount}</strong><small>{scan.contactCount ? `contact${scan.contactCount > 1 ? "s" : ""}` : "zone claire"}</small></button>)}</div> : <div className="ocean-intel-empty">Aucun balayage enregistré sur cette flotte. Sélectionne une zone puis touche le Bull.</div>}</div>
      <div className="ocean-intel-section"><strong>RADAR DE COMMANDEMENT</strong><div className="ocean-command-radar">{commandRadar.map((metric: any) => <div key={metric.label} className="ocean-command-radar-row"><span>{metric.label}</span><div><i style={{ width: `${metric.value}%`, background: `linear-gradient(90deg,${metric.color}88,${metric.color})` }} /></div><strong style={{ color: metric.color }}>{metric.value}</strong></div>)}</div><div className="ocean-command-radar-footer"><span style={{ color: combatMomentum.color }}>{combatMomentum.icon} {combatMomentum.label}</span><small>Lecture calculée sur les dernières volées et l’état de la flotte ciblée.</small></div></div>
      <div className="ocean-intel-section"><div className="ocean-command-standings-head"><div><strong>CLASSEMENT DE COMMANDEMENT</strong><small>Indice temps réel · précision, mission, dégâts, sonar et tempo</small></div><span>{activeCommandEntry ? `#${activeCommandEntry.rank} · ${activeCommandEntry.score} pts` : "—"}</span></div><div className="ocean-command-standings">{liveCommandStandings.map((entry: any) => <div key={entry.playerId} className={`ocean-command-standing-row ${String(entry.playerId) === String(activePlayer?.id || "") ? "is-active" : ""}`} style={{ ["--rank-color" as any]: entry.gradeColor }}><b>#{entry.rank}</b><div><strong>{entry.name}</strong><small>{entry.accuracy}% précision · mission {entry.missionPercent}% · {entry.shipsSunk} navire{entry.shipsSunk > 1 ? "s" : ""}</small></div><span style={{ color: entry.gradeColor }}>{entry.grade}</span><em>{entry.score}</em></div>)}</div></div>
      {liveRivalry ? <div className="ocean-intel-section ocean-rivalry-section" style={{ ["--rivalry-color" as any]: liveRivalry.color }}><div className="ocean-rivalry-head"><div><strong>RIVAL DIRECT</strong><small>{liveRivalry.detail}</small></div><span style={{ color: liveRivalry.color }}>{liveRivalry.label}</span></div><div className="ocean-rivalry-duel"><div className="ocean-rivalry-player is-active"><b>{liveRivalry.active.grade}</b><div><strong>{liveRivalry.active.name}</strong><small>#{liveRivalry.active.rank} · {liveRivalry.active.score} pts</small></div></div><div className="ocean-rivalry-vs">VS</div><div className="ocean-rivalry-player"><b>{liveRivalry.rival.grade}</b><div><strong>{liveRivalry.rival.name}</strong><small>#{liveRivalry.rival.rank} · {liveRivalry.rival.score} pts</small></div></div></div><div className="ocean-rivalry-metrics">{liveRivalry.metrics.map((metric: any) => <div key={metric.id} className="ocean-rivalry-metric"><span>{metric.label}</span><div className="ocean-rivalry-metric__track"><i className="is-active" style={{ width: `${metric.active}%`, background: metric.color }} /><i className="is-rival" style={{ width: `${metric.rival}%` }} /></div><b style={{ color: metric.delta >= 0 ? GREEN : RED }}>{metric.delta > 0 ? "+" : ""}{metric.delta}</b></div>)}</div><div className="ocean-rivalry-footer"><span>POINT FORT · <strong style={{ color: liveRivalry.strongestMetric?.color }}>{liveRivalry.strongestMetric?.label || "—"}</strong></span><span>À TRAVAILLER · <strong style={{ color: liveRivalry.weakestMetric?.color }}>{liveRivalry.weakestMetric?.label || "—"}</strong></span></div></div> : null}
      <div className="ocean-intel-section"><div className="ocean-mission-header"><div><strong>OBJECTIFS DE MISSION</strong><small>{activeMission.label}</small></div><span>{activeMission.completed}/{activeMission.total} · {activeMission.percent}%</span></div><div className="ocean-mission-progress"><i style={{ width: `${activeMission.percent}%` }} /></div><div className="ocean-mission-grid">{activeMission.objectives.map((objective: any) => <div key={objective.id} className={`ocean-mission-card ${objective.complete ? "is-complete" : ""}`} style={{ ["--mission-color" as any]: objective.color }}><span className="ocean-mission-card__icon">{objective.complete ? "✓" : objective.icon}</span><div><strong>{objective.label}</strong><small>{objective.detail}</small><div className="ocean-mission-card__bar"><i style={{ width: `${objective.progress}%` }} /></div></div><b>{Math.min(objective.value, objective.target)}/{objective.target}</b></div>)}</div>{activeMission.next ? <div className="ocean-mission-next"><span>PROCHAIN OBJECTIF</span><strong>{activeMission.next.icon} {activeMission.next.label}</strong><small>{activeMission.next.detail}</small></div> : <div className="ocean-mission-next is-complete"><span>MISSION</span><strong>🏆 TOUS LES OBJECTIFS VALIDÉS</strong><small>Débrief parfait sur les objectifs tactiques.</small></div>}</div>
      <div className="ocean-intel-section"><strong>ARSENAL TACTIQUE</strong><div className="ocean-weapon-grid"><div><b>S</b><span>1 zone</span></div><div><b>D</b><span>2 zones</span></div><div><b>T</b><span>ligne de 3</span></div><div><b>BULL</b><span>sonar</span></div><div><b>DB</b><span>frappe ciblée</span></div></div></div>
      {(state.battleHistory || []).length ? <div className="ocean-intel-section"><strong>MANCHES TERMINÉES</strong><div style={{ display: "grid", gap: 6 }}>{[...(state.battleHistory || [])].reverse().map((battle) => { const winner = state.owners.find((owner) => owner.id === battle.winnerOwnerId); return <div key={`${battle.battle}-${battle.finishedAt}`} className="ocean-battle-row"><span>B{battle.battle}</span><strong>{winner?.name || "Flotte"}</strong><small>{battle.hits} impacts · {battle.shipsSunk} navires · {battle.darts} fléchettes</small></div>; })}</div></div> : null}
    </OverlayShell> : null}
    {overlay === "stats" ? <OverlayShell title={`STATS · ${playerName(activeProfile).toUpperCase()}`} subtitle={oceanControlVariantLabel(config.variant)} color={GOLD} onClose={() => setOverlay(null)}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 8 }}><Kpi label="RANG LIVE" value={`#${activeCommandEntry?.rank || "—"}`} color={activeCommandEntry?.gradeColor || GOLD} detail={`${activeCommandEntry?.score || 0} pts`} /><Kpi label="GRADE" value={activeCommandEntry?.grade || "—"} color={activeCommandEntry?.gradeColor || GOLD} detail="indice commandement" /><Kpi label="MISSION" value={`${activeMission.percent}%`} color={activeMission.percent >= 100 ? GREEN : CYAN} detail={`${activeMission.completed}/${activeMission.total} objectifs`} /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><Kpi label="PRÉCISION" value={`${oceanControlAccuracy(activeStats)}%`} color={GREEN} detail={`${activeStats.shipHits || 0}/${activeStats.validShots || 0} tirs`} /><Kpi label="NAVIRES COULÉS" value={activeStats.shipsSunk || 0} color={RED} /><Kpi label="SONARS" value={activeStats.sonarUses || 0} color={CYAN} detail={`${activeStats.sonarContacts || 0} contacts`} /><Kpi label="FRAPPES DBULL" value={activeStats.precisionStrikes || 0} color={GOLD} /><Kpi label="VOLÉES RÉUSSIES" value={activeStats.successfulVisits || 0} color={BLUE} /><Kpi label="VOLÉES PARFAITES" value={activeStats.perfectVisits || 0} color={GREEN} /><Kpi label="MEILLEURE SÉRIE" value={activeStats.bestHitStreak || 0} color={GOLD} detail={`${activeStats.bestVisitHits || 0} hits sur une volée`} /><Kpi label="MULTI-IMPACTS" value={activeStats.multiHitVisits || 0} color="#a78bfa" /><Kpi label="ZONES TOUCHÉES" value={activeStats.shipHits || 0} color={BLUE} /><Kpi label="À L’EAU" value={activeStats.waterShots || 0} color={SOFT} /><Kpi label="DOUBLONS" value={activeStats.duplicateShots || 0} color={RED} /><Kpi label="FLÉCHETTES" value={activeStats.darts || 0} color="#fff" /></div></OverlayShell> : null}
    {overlay === "log" ? <OverlayShell title="JOURNAL DE BORD" subtitle={`${state.visits.length} volée${state.visits.length > 1 ? "s" : ""} · ${state.battleHistory?.length || 0} manche${(state.battleHistory?.length || 0) > 1 ? "s" : ""}`} color={CYAN} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
        <Kpi label="Volées" value={state.visits.length} color={BLUE} />
        <Kpi label="Impacts" value={activeStats.shipHits || 0} color={RED} />
        <Kpi label="Sonars" value={activeStats.sonarUses || 0} color={CYAN} />
        <Kpi label="Précision" value={`${oceanControlAccuracy(activeStats)}%`} color={GREEN} />
      </div>
      {(state.battleHistory || []).length ? <div style={{ marginBottom: 10, display: "grid", gap: 6 }}>
        {[...(state.battleHistory || [])].slice().reverse().map((battle: any) => { const winner = state.owners.find((owner: any) => owner.id === battle.winnerOwnerId); return <div key={`${battle.battle}-${battle.finishedAt}`} style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><strong style={{ color: GOLD }}>B{battle.battle}</strong><div><div style={{ fontSize: 9.2, fontWeight: 1050 }}>{winner?.name || "Flotte"}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 7.5 }}>{battle.visits} volées · {battle.hits} impacts · {battle.shipsSunk} navires</div></div><div style={{ textAlign: "right", color: CYAN, fontSize: 8.3, fontWeight: 1000 }}>{battle.darts} fl.</div></div>; })}
      </div> : null}
      <div style={{ display: "grid", gap: 7 }}>{[...state.visits].reverse().map((visit) => { const topEvent = (visit.events || []).find((event: any) => ["battle_win", "sunk", "strike", "hit", "sonar"].includes(event.type)) || visit.events?.[0]; const accent = topEvent?.type === "battle_win" ? GOLD : topEvent?.type === "sunk" ? RED : topEvent?.type === "strike" ? GOLD : topEvent?.type === "sonar" ? CYAN : BLUE; return <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${accent}33` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · B{visit.battle} · T{visit.round}</strong><strong style={{ color: accent }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>{(visit.events || []).slice(0, 5).map((event: any, index: number) => <span key={index} style={{ borderRadius: 999, padding: "3px 7px", fontSize: 6.8, fontWeight: 1000, color: accent, border: `1px solid ${accent}44`, background: `${accent}12` }}>{event.type === "sonar" ? "📡" : event.type === "sunk" ? "💥" : event.type === "strike" ? "🎯" : event.type === "hit" ? "🔥" : event.type === "battle_win" ? "🏆" : "•"} {event.label}</span>)}</div><div style={{ marginTop: 6, color: "#cfd8e4", fontSize: 8.2, lineHeight: 1.4 }}>{visit.events.map((event: any) => event.label).join(" · ") || "Aucun impact"}</div></div>; })}</div>
    </OverlayShell> : null}

    {showEnd && state.phase === "finished" ? <OceanControlEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "ocean_control" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}
