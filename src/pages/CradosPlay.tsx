// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import tickerCrados from "../assets/tickers/ticker_crados.webp";
import cradosDirtBar from "../assets/crados/crados_dirt_progress.png";
import cradosRadarBoard from "../assets/crados/crados_radar_board.png";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { cloneCradosState, createCradosState, normalizeCradosConfig, pickCradosBotDarts, playCradosVisit, cradosSideIdForPlayer, cradosSideName, isCradosTeamMode, type CradosState } from "../lib/gameEngines/cradosEngine";
import { cradosBotLevelForProfile } from "../lib/dartsCradosBots";
import {
  Meter,
  ModeEndPanel,
  NewModeInput,
  isBotProfile,
  lastEvents,
  playerName,
  resolveModeProfiles,
  SOFT,
  uiToGameDart,
} from "./newModes/newModePlayShared";
import "./CradosPlay.css";

const ACCENT = "#b7f247";
const GREEN = "#70e65e";
const BROWN = "#d99a57";
const RED = "#ff6c67";
const PLAYER_COLORS = ["#67d7ff", "#ff74c8", "#ffc857", "#79ef9d", "#b58cff", "#ff8a65", "#56e0d0", "#f3f56a", "#8fb8ff", "#fa8fb1"];
const DARTBOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const CRADOS_BOARD = {
  cx: 130,
  cy: 130,
  outer: 114,
  artOuter: 98,
  wedgeInner: 15.5,
  doubleInner: 86,
  trebleOuter: 58,
  trebleInner: 49,
  outerSingleMid: 72,
  innerSingleMid: 33.5,
  bullOuter: 11.8,
  bullInner: 4.0,
  label: 107.8,
};
const CRADOS_BOARD_IMAGE = { x: CRADOS_BOARD.cx - CRADOS_BOARD.artOuter, y: CRADOS_BOARD.cy - CRADOS_BOARD.artOuter, size: CRADOS_BOARD.artOuter * 2 };
const TOUCH_COLORS: Record<string, string> = { S: "#67d7ff", D: "#6fd6ff", T: "#d17bff", BULL: "#50e68c", DBULL: "#2bf08b", MISS: "#ffb54d" };

type PlayTab = "map" | "stats";

function visitDartLabel(d: any) {
  if (!d || d.bed === "MISS" || Number(d.v) === 0) return "MISS";
  if (d.bed === "OB" || (Number(d.v) === 25 && Number(d.mult) !== 2)) return "BULL";
  if (d.bed === "IB" || (Number(d.v) === 25 && Number(d.mult) === 2)) return "DBULL";
  const mult = d.bed === "T" || Number(d.mult) === 3 ? "T" : d.bed === "D" || Number(d.mult) === 2 ? "D" : "S";
  const value = Number(d.number || d.v || 0);
  return `${mult}${value}`;
}
function visitDartTone(d: any) {
  const label = visitDartLabel(d);
  if (label === "MISS") return TOUCH_COLORS.MISS;
  if (label === "BULL") return TOUCH_COLORS.BULL;
  if (label === "DBULL") return TOUCH_COLORS.DBULL;
  return TOUCH_COLORS[label[0]] || "#d7dfd7";
}

function seededPalette(seedValue: string, count: number) {
  let seed = 2166136261;
  for (let i = 0; i < seedValue.length; i += 1) {
    seed ^= seedValue.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rows = [...PLAYER_COLORS];
  const random = () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.slice(0, Math.min(10, Math.max(1, count)));
}

function dartLabel(d: UIDart | undefined) {
  if (!d) return "—";
  if (Number(d.v) === 0) return "MISS";
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? "DB" : "B";
  return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${d.v}`;
}

function profileImageSrc(profile: any) {
  return profile?.avatarDataUrl || profile?.photoDataUrl || profile?.logoDataUrl || profile?.avatar || profile?.photoURL || profile?.photoUrl || profile?.image || "";
}

function scoreSectorDartsForVisit(visit: any, sectorKey: any) {
  const darts = Array.isArray(visit?.darts) ? visit.darts : [];
  let total = 0;
  for (const d of darts) {
    if (!d || d.bed === "MISS" || Number(d.v) === 0) continue;
    if (sectorKey === "bull") {
      if (d.bed === "OB" || (Number(d.v) === 25 && Number(d.mult) !== 2)) total += 1;
      else if (d.bed === "IB" || (Number(d.v) === 25 && Number(d.mult) === 2)) total += 3;
      continue;
    }
    const value = Number(d.number || d.v || d.n || 0);
    const mult = d.bed === "T" ? 3 : d.bed === "D" ? 2 : d.bed === "S" ? 1 : Number(d.mult || 1);
    if (value === Number(sectorKey)) total += mult;
  }
  return total;
}

function sectorTouchesBySide(state: any, sideId: string, sectorKey: any) {
  return (state?.visits || []).reduce((sum: number, visit: any) => String(visit?.sideId || "") === String(sideId) ? sum + scoreSectorDartsForVisit(visit, sectorKey) : sum, 0);
}

function CradosAwenaButton() {
  const awena = useAwenaOptional();
  return <button
    type="button"
    className="crados-play__awena"
    aria-label="Demander de l’aide à Awena sur CRADOS"
    title="Awena · aide CRADOS"
    onClick={() => {
      awena?.setRuntime?.({
        route: "crados_play",
        sport: "darts",
        mode: "crados",
        phase: "play",
        inGame: true,
        screenLabel: "CRADOS · Partie",
        extra: {
          awenaRememberedMode: "crados",
          awenaModeTopic: "rules",
          cradosPageHint: "active-play",
        },
      });
      awena?.openPanel?.();
    }}
  >
    <span><img src="/awena/awena-avatar.webp" alt="Awena" /></span>
    <i aria-hidden>🎙</i>
  </button>;
}

function StatsTrendIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19V6M4 19h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m7 15 4-4 3 2 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 7H19v2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function LogIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6.5 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 4.5V8h3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 11h8M8 14h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function CradosDirtMeter({ value, max, color }: any) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const pct = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
  return <div className="crados-dirt-meter" aria-label={`Crasse ${safeValue} sur ${safeMax}`}>
    <div className="crados-dirt-meter__track" style={{ backgroundImage: `url(${cradosDirtBar})` }} />
    <div className="crados-dirt-meter__fill" style={{ width: `${pct}%`, backgroundImage: `url(${cradosDirtBar})`, boxShadow: pct > 65 ? `0 0 12px ${pct >= 72 ? RED : color}55` : "none" }} />
    <div className="crados-dirt-meter__grime" aria-hidden />
  </div>;
}

function sectorCost(sec: any, activeId: string, stealMode: string) {
  if (!sec?.ownerId) return { tone: ACCENT, title: "ZONE LIBRE", short: "+1 / +2 / +3 couches", rows: ["S = +1 couche", "D = +2 couches", "T = +3 couches"] };
  if (String(sec.ownerId) === String(activeId)) return { tone: GREEN, title: "TA ZONE", short: "0 crasse", rows: ["S = 0 crasse", "D = 0 crasse", "T = 0 crasse"] };
  if (stealMode === "flip") return { tone: BROWN, title: "ZONE ADVERSE · VOL", short: "+1 crasse / contact", rows: ["S = −1 couche · +1 crasse", "D = −2 couches · +1 crasse", "T = −3 couches · +1 crasse"] };
  return { tone: RED, title: "ZONE ADVERSE · BLOCAGE", short: "S +1 · D +2 · T +3 crasse", rows: ["S = +1 crasse", "D = +2 crasses", "T = +3 crasses"] };
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function annularWedge(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  const p1 = polar(cx, cy, outer, start);
  const p2 = polar(cx, cy, outer, end);
  const p3 = polar(cx, cy, inner, end);
  const p4 = polar(cx, cy, inner, start);
  return `M ${p1.x} ${p1.y} A ${outer} ${outer} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${inner} ${inner} 0 0 0 ${p4.x} ${p4.y} Z`;
}
function boardSectorPath(start: number, end: number) {
  return annularWedge(CRADOS_BOARD.cx, CRADOS_BOARD.cy, CRADOS_BOARD.wedgeInner, CRADOS_BOARD.artOuter, start, end);
}

function CradosTacticalBoard({ state, sides, sideById, colorBySideId, profileBySideId, activeSideId, config, selectedSector, onSelect, filterSideId = "all" }: any) {
  const sectorKey = String(selectedSector) === "bull" ? "bull" : Number(selectedSector || 20);
  const selected = sectorKey === "bull" ? null : state.sectors?.[sectorKey] || {};
  const layersToOwn = Math.max(1, Number(config.rules.layersToOwn || 3));
  const detailSides = (sides || []).map((side: any) => ({
    side,
    color: colorBySideId.get(String(side.id)) || ACCENT,
    profile: profileBySideId?.get?.(String(side.id)),
    touches: sectorTouchesBySide(state, String(side.id), sectorKey),
  }));
  const leftCount = detailSides.length <= 5 ? detailSides.length : Math.ceil(detailSides.length / 2);
  const leftSides = detailSides.slice(0, leftCount);
  const rightSides = detailSides.slice(leftCount);

  return <div className={`crados-tactical-board${rightSides.length ? "" : " is-left-only"}`}>
    <div className="crados-tactical-board__side crados-tactical-board__side--left">
      {leftSides.map(({ side, color, profile, touches }: any) => <div key={`left-${side.id}`} className="crados-tactical-board__side-item">
        <div className="crados-tactical-board__side-avatar" style={{ background: color, boxShadow: `inset 0 0 18px ${color}55, 0 0 14px ${color}1f` }}><ProfileAvatar profile={profile || side} size={36} showStars={false} ringColor={color} /></div>
        <div className="crados-tactical-board__side-count" style={{ borderColor: `${color}88`, color }}>{touches}</div>
      </div>)}
    </div>

    <div className="crados-tactical-board__visual">
      <svg viewBox="0 0 260 260" className="crados-tactical-board__svg" role="img" aria-label="Carte tactique de la cible CRADOS">
        <defs>
          <clipPath id="cradosBoardClip"><circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} /></clipPath>
          <radialGradient id="cradosBoardShade" cx="50%" cy="48%">
            <stop offset="0%" stopColor="rgba(255,255,255,.05)" />
            <stop offset="72%" stopColor="rgba(8,11,8,.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,.34)" />
          </radialGradient>
          <filter id="cradosGlow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g clipPath="url(#cradosBoardClip)">
          <image href={cradosRadarBoard} x={CRADOS_BOARD_IMAGE.x} y={CRADOS_BOARD_IMAGE.y} width={CRADOS_BOARD_IMAGE.size} height={CRADOS_BOARD_IMAGE.size} preserveAspectRatio="xMidYMid meet" />
          <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} fill="url(#cradosBoardShade)" />
          {DARTBOARD_ORDER.map((n, idx) => {
            const start = idx * 18 - 9;
            const end = idx * 18 + 9;
            const sec = state.sectors?.[n] || {};
            const ownerId = sec.ownerId ? String(sec.ownerId) : "";
            const claimantId = !ownerId && sec.claimantId ? String(sec.claimantId) : "";
            const color = ownerId ? colorBySideId.get(ownerId) : claimantId ? colorBySideId.get(claimantId) : "#ffffff";
            const owned = Boolean(ownerId);
            const claiming = Boolean(claimantId);
            const selectedNow = Number(selectedSector) === Number(n);
            const visibleForFilter = filterSideId === "all" || (filterSideId === "free" ? (!ownerId && !claimantId) : (ownerId === String(filterSideId) || claimantId === String(filterSideId)));
            const labelPos = polar(CRADOS_BOARD.cx, CRADOS_BOARD.cy, CRADOS_BOARD.label, idx * 18);
            return <g key={n} onClick={() => onSelect(n)} style={{ cursor: "pointer" }} opacity={visibleForFilter ? 1 : .12}>
              <path d={boardSectorPath(start, end)} fill={selectedNow ? `${color}24` : owned ? `${color}20` : claiming ? `${color}14` : "rgba(255,255,255,.015)"} stroke={selectedNow ? color : owned || claiming ? `${color}9a` : "rgba(255,255,255,.03)"} strokeWidth={selectedNow ? 2.6 : owned || claiming ? 1.1 : .65} filter={selectedNow ? "url(#cradosGlow)" : undefined} />
              {Array.from({ length: layersToOwn }, (_, layerIndex) => {
                const t = layerIndex / layersToOwn;
                const t2 = (layerIndex + 1) / layersToOwn;
                const inner = CRADOS_BOARD.wedgeInner + (CRADOS_BOARD.artOuter - CRADOS_BOARD.wedgeInner) * t;
                const outer = CRADOS_BOARD.wedgeInner + (CRADOS_BOARD.artOuter - CRADOS_BOARD.wedgeInner) * t2 - 1.1;
                const activeLayer = Number(sec.layers || 0) > layerIndex;
                return <path key={`${n}-${layerIndex}`} d={annularWedge(CRADOS_BOARD.cx, CRADOS_BOARD.cy, inner, outer, start + .42, end - .42)} fill={activeLayer ? `${color}${owned ? "74" : "34"}` : "rgba(255,255,255,.005)"} stroke={activeLayer ? `${color}8d` : "rgba(255,255,255,.02)"} strokeWidth={activeLayer ? 1.05 : .45} />;
              })}
              <text x={labelPos.x} y={labelPos.y + 3} textAnchor="middle" fill={selectedNow || owned || claiming ? color : "#f4efe5"} fontSize="10" fontWeight="1000">{n}</text>
            </g>;
          })}
          <g onClick={() => onSelect("bull")} style={{ cursor: "pointer" }}>
            <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.bullOuter} fill={String(selectedSector) === "bull" ? "rgba(122,255,86,.18)" : "rgba(20,40,18,.03)"} stroke={String(selectedSector) === "bull" ? `${GREEN}d8` : `${GREEN}66`} strokeWidth={String(selectedSector) === "bull" ? 2.6 : 1.2} filter={String(selectedSector) === "bull" ? "url(#cradosGlow)" : undefined} />
            <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.bullInner} fill={String(selectedSector) === "bull" ? "rgba(255,82,82,.28)" : "rgba(255,255,255,.02)"} stroke="rgba(255,228,228,.58)" strokeWidth=".85" />
          </g>
        </g>
        <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} fill="none" stroke="rgba(183,242,71,.17)" strokeWidth="1.8" />
      </svg>
    </div>

    <div className="crados-tactical-board__side crados-tactical-board__side--right">
      {rightSides.map(({ side, color, profile, touches }: any) => <div key={`right-${side.id}`} className="crados-tactical-board__side-item crados-tactical-board__side-item--right">
        <div className="crados-tactical-board__side-count" style={{ borderColor: `${color}88`, color }}>{touches}</div>
        <div className="crados-tactical-board__side-avatar" style={{ background: color, boxShadow: `inset 0 0 18px ${color}55, 0 0 14px ${color}1f` }}><ProfileAvatar profile={profile || side} size={36} showStars={false} ringColor={color} /></div>
      </div>)}
    </div>
  </div>;
}

function CradosMiniRadar({ state, activeSideId, color, onOpen }: any) {
  return <button type="button" className="crados-mini-radar" onClick={onOpen} title="Ouvrir la carte tactique" aria-label="Ouvrir la carte tactique des zones">
    <svg viewBox="0 0 260 260" role="img" aria-label="Mini radar des zones possédées">
      <defs>
        <clipPath id="cradosMiniClip"><circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} /></clipPath>
      </defs>
      <g clipPath="url(#cradosMiniClip)">
        <image href={cradosRadarBoard} x={CRADOS_BOARD_IMAGE.x} y={CRADOS_BOARD_IMAGE.y} width={CRADOS_BOARD_IMAGE.size} height={CRADOS_BOARD_IMAGE.size} preserveAspectRatio="xMidYMid meet" />
        <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} fill="rgba(0,0,0,.42)" />
        {DARTBOARD_ORDER.map((n, idx) => {
          const sec = state.sectors?.[n] || {};
          const ownerId = sec.ownerId ? String(sec.ownerId) : "";
          const claimantId = !ownerId && sec.claimantId ? String(sec.claimantId) : "";
          const mine = ownerId === String(activeSideId) || claimantId === String(activeSideId);
          return <path key={n} d={boardSectorPath(idx * 18 - 9, idx * 18 + 9)} fill={mine ? `${color}${ownerId ? "70" : "3a"}` : "rgba(255,255,255,.018)"} stroke={mine ? `${color}aa` : "rgba(255,255,255,.03)"} strokeWidth={mine ? 1.8 : .6} />;
        })}
        <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.bullOuter} fill="rgba(70,150,55,.18)" stroke="rgba(112,230,94,.45)" strokeWidth="1.2" />
        <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.bullInner} fill="rgba(192,255,177,.35)" stroke="rgba(240,255,236,.6)" strokeWidth=".85" />
      </g>
      <circle cx={CRADOS_BOARD.cx} cy={CRADOS_BOARD.cy} r={CRADOS_BOARD.outer} fill="none" stroke={`${color}66`} strokeWidth="3" />
    </svg>
  </button>;
}
function TacticalBoardModal({ state, sides, sideById, colorBySideId, profileBySideId, activeSideId, config, selectedSector, onSelect, onClose }: any) {
  const [filterSideId, setFilterSideId] = React.useState("all");
  return <div className="crados-board-modal" role="dialog" aria-modal="true" aria-label="Carte tactique CRADOS" onClick={onClose}>
    <div className="crados-board-modal__card" onClick={(event) => event.stopPropagation()}>
      <header><div><b>CARTE DES ZONES</b></div><div className="crados-board-modal__actions"><CradosAwenaButton /><button type="button" onClick={onClose} aria-label="Fermer">×</button></div></header>
      <div className="crados-board-modal__filters">
        <button type="button" className={`crados-board-modal__filter-chip${filterSideId === "all" ? " is-active" : ""}`} style={{ ["--filter-color" as any]: ACCENT }} onClick={() => setFilterSideId("all")}>TOUT</button>
        <button type="button" className={`crados-board-modal__filter-chip${filterSideId === "free" ? " is-active" : ""}`} style={{ ["--filter-color" as any]: "#8e9891" }} onClick={() => setFilterSideId("free")}><i style={{ background: "#889088" }} />LIBRES</button>
        {sides.map((side: any) => {
          const color = colorBySideId.get(String(side.id)) || ACCENT;
          const prof = profileBySideId?.get?.(String(side.id)) || side;
          return <button key={side.id} type="button" className={`crados-board-modal__avatar-filter${filterSideId === String(side.id) ? " is-active" : ""}`} style={{ ["--filter-color" as any]: color }} onClick={() => setFilterSideId(String(side.id))} aria-label={`Filtrer ${side.name}`} title={side.name}><span style={{ borderColor: color }}><ProfileAvatar profile={prof} size={26} showStars={false} ringColor={color} /></span></button>;
        })}
      </div>
      <div className="crados-board-modal__body"><CradosTacticalBoard state={state} sides={sides} sideById={sideById} colorBySideId={colorBySideId} profileBySideId={profileBySideId} activeSideId={activeSideId} config={config} selectedSector={selectedSector} onSelect={onSelect} filterSideId={filterSideId} /></div>
      <div className="crados-board-modal__legend"><span><i className="is-free" />Libre</span><span><i className="is-progress" />Contamination en cours</span><span><i className="is-owned" />Zone possédée</span><span>BULL = douche {config.rules.bullWash ? "−1 · DBULL −3" : "désactivée"}</span></div>
    </div>
  </div>;
}

function StatsModal({ state, activePlayer, activeSideId, activeSideStats, color, config, teamMode, onClose }: any) {
  return <div className="crados-players-modal" role="dialog" aria-modal="true" aria-label="Statistiques CRADOS" onClick={onClose}>
    <div className="crados-players-modal__card crados-players-modal__card--stats" onClick={(e) => e.stopPropagation()}>
      <header><div><b>STATS ESSENTIELLES</b><span>{teamMode ? "Équipe active" : "Joueur actif"}</span></div><button type="button" onClick={onClose} aria-label="Fermer">×</button></header>
      <div className="crados-stats-modal__body"><StatsPanel state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={activeSideStats} color={color} config={config} teamMode={teamMode} /></div>
    </div>
  </div>;
}

function LogModal({ state, onClose, profileById, profileBySideId, colorByPlayerId, colorBySideId, teamMode, sideById }: any) {
  const rows = [...(state?.visits || [])].slice(-18).reverse();
  return <div className="crados-players-modal" role="dialog" aria-modal="true" aria-label="Journal CRADOS" onClick={onClose}>
    <div className="crados-players-modal__card crados-players-modal__card--stats" onClick={(e) => e.stopPropagation()}>
      <header><div><b>JOURNAL DE PARTIE</b><span>Dernières actions enregistrées</span></div><button type="button" onClick={onClose} aria-label="Fermer">×</button></header>
      <div className="crados-log-modal__body">
        {rows.length ? rows.map((visit: any) => {
          const playerId = String(visit?.playerId || "");
          const sideId = String(visit?.sideId || playerId);
          const profile = profileById?.get?.(playerId) || { id: playerId, name: playerId };
          const sideProfile = profileBySideId?.get?.(sideId) || profile;
          const accent = teamMode ? colorBySideId?.get?.(sideId) || ACCENT : colorByPlayerId?.get?.(playerId) || ACCENT;
          const delta = Number(visit?.dirtAfter || 0) - Number(visit?.dirtBefore || 0);
          const dirtLabel = delta > 0 ? `+${delta} crasse` : delta < 0 ? `${delta} crasse` : 'stable';
          const owner = sideById?.get?.(sideId);
          const darts = Array.isArray(visit?.darts) ? visit.darts : [];
          return <div key={visit.id} className="crados-log-modal__row" style={{ borderColor: `${accent}4a`, boxShadow: `inset 0 0 20px ${accent}12` }}>
            <div className="crados-log-modal__head">
              <div className="crados-log-modal__identity">
                <div className="crados-log-modal__avatar" style={{ borderColor: accent }}><ProfileAvatar profile={teamMode ? sideProfile : profile} size={36} showStars={false} ringColor={accent} /></div>
                <div className="crados-log-modal__who">
                  <b style={{ color: accent }}>{playerName(profile)}</b>
                  <span>{teamMode ? `${owner?.name || 'Équipe'} · tour ${visit?.turn || '—'}` : `Tour ${visit?.turn || '—'} · manche ${visit?.leg || '—'}`}</span>
                </div>
              </div>
              <div className="crados-log-modal__delta" style={{ color: delta > 0 ? '#ff9f8c' : delta < 0 ? '#8ff0b4' : '#a9b4ac' }}>{dirtLabel}</div>
            </div>
            <div className="crados-log-modal__darts">
              {darts.length ? darts.map((dart: any, idx: number) => {
                const label = visitDartLabel(dart);
                const tone = visitDartTone(dart);
                return <span key={`${visit.id}-${idx}`} className="crados-log-modal__dart" style={{ borderColor: `${tone}66`, color: tone, boxShadow: `inset 0 0 12px ${tone}1f` }}>{label}</span>;
              }) : <span className="crados-log-modal__dart is-empty">Aucune fléchette</span>}
            </div>
            <div className="crados-log-modal__legend-strip">
              {['S', 'D', 'T', 'BULL', 'DBULL', 'MISS'].map((label) => <span key={label} style={{ color: TOUCH_COLORS[label], borderColor: `${TOUCH_COLORS[label]}40` }}>{label}</span>)}
            </div>
            <div className="crados-log-modal__events">
              {Array.isArray(visit.events) && visit.events.length ? visit.events.map((event: string, idx: number) => <span key={`${visit.id}-ev-${idx}`}>{event}</span>) : <span>Aucune action notable</span>}
            </div>
          </div>;
        }) : <div className="crados-log-modal__empty">Aucune action pour le moment.</div>}
      </div>
    </div>
  </div>;
}

function TurnStrip({ state, profiles, profileById, colorByPlayerId, colorBySideId, dirtLimit, teamMode, sideById }: any) {
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  React.useEffect(() => {
    const p = state.players?.[state.activePlayerIndex];
    if (!p) return;
    refs.current[String(p.id)]?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [state.activePlayerIndex, state.players?.length]);
  return <div className="crados-turn-strip" aria-label="Ordre de tour CRADOS">
    {state.players.map((p: any, i: number) => {
      const prof = profileById.get(String(p.id)) || p;
      const active = state.phase !== "finished" && state.activePlayerIndex === i;
      const sideId = cradosSideIdForPlayer(state, p.id);
      const side = sideById.get(String(sideId));
      const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
      const dirt = Number(state.dirt[sideId] || 0);
      const st = state.statsByPlayer[p.id] || {};
      const dead = !!state.eliminated[sideId];
      return <div ref={(node) => { refs.current[String(p.id)] = node; }} key={p.id} className={`crados-turn-strip__player${active ? " is-active" : ""}${dead ? " is-out" : ""}`} style={{ borderColor: active ? color : "rgba(255,255,255,.10)", boxShadow: active ? `0 0 0 1px ${color}55,0 0 18px ${color}25` : "none" }}>
        <div className="crados-turn-strip__rank" style={{ color }}>#{i + 1}</div>
        <ProfileAvatar profile={prof} size={36} showStars={false} ringColor={active ? color : `${color}88`} />
        <div className="crados-turn-strip__body">
          <b>{playerName(prof)}</b>
          <div><span style={{ color }}>{dirt}/{dirtLimit}</span> crasse · {st.sectorsClaimed || 0} zones{teamMode ? ` · ${side?.name || "Équipe"}` : ""}</div>
          <Meter value={dirt} max={dirtLimit} accent={color} dangerAt={.72} height={3} />
        </div>
        {dead ? <span className="crados-turn-strip__out">OUT</span> : null}
      </div>;
    })}
  </div>;
}

function ActivePlayerCard({ state, activePlayer, activeProfile, activeIsBot, activeBotLevel, color, config, activeSideId, activeSide, teamMode, onOpenBoard }: any) {
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const dirtPct = Math.max(0, Math.min(100, Math.round((dirt / Math.max(1, Number(config.rules.dirtLimit || 1))) * 100)));
  const avatarSrc = profileImageSrc(activeProfile || activePlayer);
  const headerLabel = state.phase === "finished" ? "PARTIE TERMINÉE" : teamMode ? activeSide?.name || "ÉQUIPE" : activeIsBot ? `BOT IA · NIV. ${activeBotLevel || config.botLevel}` : "";
  return <section className="crados-active" style={{ borderColor: `${color}68`, boxShadow: `0 15px 34px rgba(0,0,0,.34),inset 0 0 44px ${color}0c` }}>
    <div className="crados-active__ghost" aria-hidden>{avatarSrc ? <img src={avatarSrc} alt="" /> : <ProfileAvatar profile={activeProfile || activePlayer} size={112} showStars={false} ringColor={color} />}</div>
    <div className="crados-active__main">
      {headerLabel ? <div className="crados-active__eyebrow" style={{ color }}>{headerLabel}</div> : null}
      <div className="crados-active__name" style={{ color }}>{String(activePlayer?.name || "—").toUpperCase()}</div>
      <div className="crados-active__percent" style={{ color: dirtPct >= 70 ? RED : color }}>{dirtPct}</div>
      <CradosDirtMeter value={dirt} max={config.rules.dirtLimit} color={color} />
      <div className="crados-active__leg" style={{ color }}>{`MANCHE ${Number(state.legIndex || 0) + 1} - ${state.legWins?.[activeSideId] || 0}/${config.seriesWins} remportée${Number(config.seriesWins || 1) > 1 ? 's' : ''}`}</div>
    </div>
    <div className="crados-active__radar"><CradosMiniRadar state={state} activeSideId={activeSideId} color={color} onOpen={onOpenBoard} /></div>
  </section>;
}

function statsRows({ state, activePlayer, activeSideId, activeSideStats, config, teamMode }: any) {
  const st = activePlayer ? state.statsByPlayer?.[activePlayer.id] || {} : {};
  const source = teamMode ? activeSideStats || {} : st;
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const pct = Math.max(0, Math.min(100, Math.round((dirt / Math.max(1, Number(config.rules.dirtLimit || 1))) * 100)));
  return [
    { label: "CRASSE", value: `${dirt}/${config.rules.dirtLimit}`, empty: dirt <= 0 },
    { label: "CRASSE %", value: `${pct}%`, empty: pct <= 0 },
    { label: "SECTEURS", value: Number(source.sectorsClaimed || 0), empty: !Number(source.sectorsClaimed || 0) },
    { label: "VOLS", value: Number(source.sectorsStolen || 0), empty: !Number(source.sectorsStolen || 0) },
    { label: "COUCHES", value: Number(st.layersPlaced || 0), empty: !Number(st.layersPlaced || 0) },
    { label: "LAVÉES", value: Number(source.dirtWashed || 0), empty: !Number(source.dirtWashed || 0) },
    { label: "FLÉCHETTES", value: Number(st.darts || 0), empty: !Number(st.darts || 0) },
    { label: "TOURS", value: Number(st.visits || 0), empty: !Number(st.visits || 0) },
    { label: "MANCHES", value: Number(state.legWins?.[activeSideId] || 0), empty: !Number(state.legWins?.[activeSideId] || 0) },
  ];
}

function StatsPanel({ state, activePlayer, activeSideId, activeSideStats, color, config, teamMode }: any) {
  const rows = statsRows({ state, activePlayer, activeSideId, activeSideStats, config, teamMode });
  return <div className="crados-stats-panel">
    <div className="crados-stats-panel__grid">{rows.map((row: any) => <div key={row.label} className={row.empty ? "is-empty" : ""}><span>{row.label}</span><b style={{ color: row.empty ? undefined : color }}>{row.value}</b></div>)}</div>
  </div>;
}

function KpiStatsStrip({ state, activePlayer, activeSideId, activeSideStats, config, teamMode, color, onClick, items, className = "crados-kpi-strip" }: any) {
  const st = activePlayer ? state.statsByPlayer?.[activePlayer.id] || {} : {};
  const source = teamMode ? activeSideStats || {} : st;
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const pct = Math.max(0, Math.min(100, Math.round((dirt / Math.max(1, Number(config.rules.dirtLimit || 1))) * 100)));
  const resolvedItems = items || [["CRASSE", `${pct}%`], ["ZONES", source.sectorsClaimed || 0], ["VOLS", source.sectorsStolen || 0], ["DARTS", st.darts || 0]];
  return <button type="button" className={className} onClick={onClick} aria-label="Ouvrir toutes les statistiques">
    {resolvedItems.map(([label, value]: any) => <span key={String(label)}><small>{label}</small><b style={{ color }}>{value}</b></span>)}
  </button>;
}

function PlayersButton({ state, profiles, profileById, colorByPlayerId, colorBySideId, onClick, teamMode }: any) {
  return <button type="button" className="crados-players-button" onClick={onClick} title="Liste des joueurs" style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.70),rgba(0,0,0,.24),rgba(0,0,0,.70)),url(${tickerCrados})` }}>
    <div className="crados-players-button__avatars">
      {state.players.slice(0, 10).map((p: any, i: number) => {
        const prof = profileById.get(String(p.id)) || profiles[i] || p;
        const sideId = cradosSideIdForPlayer(state, p.id);
        const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
        return <div key={p.id} className={state.activePlayerIndex === i ? "is-active" : ""} style={{ borderColor: color, opacity: state.eliminated[sideId] ? .38 : 1 }}><ProfileAvatar profile={prof} size={31} showStars={false} ringColor={color} /></div>;
      })}
    </div>
    <div className="crados-players-button__label"><b>{state.players.length}</b></div>
  </button>;
}

function PlayersModal({ state, profiles, profileById, colorByPlayerId, colorBySideId, config, onClose, teamMode, sideById }: any) {
  return <div className="crados-players-modal" role="dialog" aria-modal="true" aria-label="Liste des joueurs CRADOS" onClick={onClose}>
    <div className="crados-players-modal__card" onClick={(e) => e.stopPropagation()}>
      <header><div><b>ORDRE DE JEU</b><span>{teamMode ? "Score CRASSE partagé par équipe · zones personnelles" : "Score CRASSE, zones et manches"}</span></div><button type="button" onClick={onClose} aria-label="Fermer">×</button></header>
      <div className="crados-players-modal__list">
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || profiles[i] || p;
          const sideId = cradosSideIdForPlayer(state, p.id);
          const side = sideById.get(String(sideId));
          const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
          const dirt = Number(state.dirt[sideId] || 0);
          const st = state.statsByPlayer[p.id] || {};
          const active = state.phase !== "finished" && state.activePlayerIndex === i;
          const dead = !!state.eliminated[sideId];
          return <div key={p.id} className={`crados-players-modal__row${active ? " is-active" : ""}${dead ? " is-out" : ""}`} style={{ borderColor: active ? `${color}aa` : "rgba(255,255,255,.09)", boxShadow: active ? `0 0 22px ${color}22` : "none" }}>
            <div className="crados-players-modal__order" style={{ color }}>#{i + 1}</div>
            <ProfileAvatar profile={prof} size={43} showStars={false} ringColor={color} />
            <div className="crados-players-modal__identity"><b>{playerName(prof)}</b><span>{dead ? "ÉLIMINÉ" : active ? "JOUE MAINTENANT" : teamMode ? side?.name || "ÉQUIPE" : "EN ATTENTE"}</span><CradosDirtMeter value={dirt} max={config.rules.dirtLimit} color={color} /></div>
            <div className="crados-players-modal__numbers">
              <div><span>SCORE</span><b style={{ color: dirt >= config.rules.dirtLimit * .7 ? RED : color }}>{dirt}/{config.rules.dirtLimit}</b></div>
              <div><span>ZONES</span><b>{st.sectorsClaimed || 0}</b></div>
              <div><span>VOLS</span><b>{st.sectorsStolen || 0}</b></div>
              <div><span>MANCHES</span><b>{state.legWins[sideId] || 0}</b></div>
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

export default function CradosPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeCradosConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store).slice(0, 10), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const [state, setState] = React.useState<CradosState>(() => restored?.mode === "crados" ? cloneCradosState(restored) : createCradosState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<CradosState[]>([]);
  const [notice, setNotice] = React.useState("");
  const [playersOpen, setPlayersOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [boardOpen, setBoardOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [selectedSector, setSelectedSector] = React.useState(20);
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `crados-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const teamMode = isCradosTeamMode(config);
  const teams = React.useMemo(() => teamMode ? (config.teams || []) : [], [teamMode, config]);
  const playerPalette = React.useMemo(() => seededPalette(`${state.startedAt || matchIdRef.current}-players-${state.players.map((p: any) => p.id).join("|")}`, state.players.length), [state.startedAt, state.players.length]);
  const colorByPlayerId = React.useMemo(() => new Map(state.players.map((p: any, i: number) => [String(p.id), playerPalette[i % playerPalette.length] || ACCENT])), [state.players, playerPalette]);
  const sidePalette = React.useMemo(() => seededPalette(`${state.startedAt || matchIdRef.current}-sides-${teamMode ? teams.map((t: any) => t.id).join("|") : state.players.map((p: any) => p.id).join("|")}`, teamMode ? teams.length : state.players.length), [state.startedAt, teamMode, teams, state.players.length]);
  const sides = React.useMemo(() => {
    if (teamMode) return teams.map((team: any, index: number) => ({ id: String(team.id), name: String(team.name || `Équipe ${index + 1}`), color: team.color || sidePalette[index % sidePalette.length] || ACCENT, avatarDataUrl: team.logoDataUrl ?? null, playerIds: (team.playerIds || []).map(String) }));
    return state.players.map((p: any, index: number) => ({ id: String(p.id), name: p.name, color: colorByPlayerId.get(String(p.id)) || sidePalette[index % sidePalette.length] || ACCENT, avatarDataUrl: profileById.get(String(p.id))?.avatarDataUrl ?? null, playerIds: [String(p.id)] }));
  }, [teamMode, teams, state.players, profileById, colorByPlayerId, sidePalette]);
  const sideById = React.useMemo(() => new Map(sides.map((side: any) => [String(side.id), side])), [sides]);
  const colorBySideId = React.useMemo(() => new Map(sides.map((side: any) => [String(side.id), side.color || ACCENT])), [sides]);
  const sideProfiles = React.useMemo(() => sides.map((side: any) => ({ id: side.id, name: side.name, avatarDataUrl: side.avatarDataUrl })), [sides]);
  const profileBySideId = React.useMemo(() => new Map(sides.map((side: any) => {
    const sideProfile = side.avatarDataUrl ? { id: side.id, name: side.name, avatarDataUrl: side.avatarDataUrl } : (profileById.get(String(side.playerIds?.[0] || side.id)) || { id: side.id, name: side.name, avatarDataUrl: null });
    return [String(side.id), sideProfile];
  })), [sides, profileById]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const activeBotLevel = activeIsBot ? cradosBotLevelForProfile(activeProfile, config.botLevel) : 0;
  const activeSideId = activePlayer ? cradosSideIdForPlayer(state, activePlayer.id) : "";
  const activeSide = sideById.get(String(activeSideId));
  const activeColor = teamMode ? colorBySideId.get(String(activeSideId)) || ACCENT : activePlayer ? colorByPlayerId.get(String(activePlayer.id)) || ACCENT : ACCENT;

  const sideStats = React.useMemo(() => Object.fromEntries(sides.map((side: any) => {
    const ids = Array.isArray(side?.playerIds) ? side.playerIds.map(String) : [String(side.id)];
    const rows = ids.map((id: string) => state.statsByPlayer[id] || {});
    return [String(side.id), {
      sectorsClaimed: rows.reduce((sum: number, row: any) => sum + Number(row.sectorsClaimed || 0), 0),
      sectorsStolen: rows.reduce((sum: number, row: any) => sum + Number(row.sectorsStolen || 0), 0),
      dirtTaken: rows.reduce((sum: number, row: any) => sum + Number(row.dirtTaken || 0), 0),
      dirtWashed: rows.reduce((sum: number, row: any) => sum + Number(row.dirtWashed || 0), 0),
    }];
  })), [sides, state.statsByPlayer]);

  const buildRecord = React.useCallback((s: CradosState, status: "in_progress" | "finished") => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const isTeams = isCradosTeamMode(s);
    const perPlayer = Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => {
      const sideId = cradosSideIdForPlayer(s, id);
      return [id, { ...st, teamId: isTeams ? sideId : null, dirt: Number(s.dirt[sideId] || 0), eliminated: !!s.eliminated[sideId], wins: Number(s.legWins[sideId] || 0) }];
    }));
    const perTeam = isTeams ? Object.fromEntries((s.config.teams || []).map((team: any) => {
      const memberStats = (team.playerIds || []).map((id: string) => s.statsByPlayer[id] || {});
      return [String(team.id), {
        id: String(team.id), name: team.name, playerIds: team.playerIds || [], dirt: Number(s.dirt[team.id] || 0), eliminated: !!s.eliminated[team.id], wins: Number(s.legWins[team.id] || 0),
        sectorsClaimed: memberStats.reduce((sum: number, row: any) => sum + Number(row.sectorsClaimed || 0), 0),
        sectorsStolen: memberStats.reduce((sum: number, row: any) => sum + Number(row.sectorsStolen || 0), 0),
        dirtTaken: memberStats.reduce((sum: number, row: any) => sum + Number(row.dirtTaken || 0), 0),
        dirtWashed: memberStats.reduce((sum: number, row: any) => sum + Number(row.dirtWashed || 0), 0),
      }];
    })) : undefined;
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current,
      kind: "crados", mode: "crados", sport: "darts", status, createdAt: s.startedAt, updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, winnerTeamId: isTeams ? s.winnerId : undefined, players: rows, teams: isTeams ? s.config.teams : undefined,
      game: { mode: "crados", gameMode: isTeams ? "teams" : "players", dirtLimit: s.config.rules.dirtLimit, seriesWins: s.config.seriesWins },
      summary: { mode: "crados", teamMode: isTeams, finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer, perTeam },
      resume: { mode: "crados", config: s.config, state: cloneCradosState(s), updatedAt: Date.now() },
      payload: { kind: "crados", mode: "crados", sport: "darts", config: s.config, teams: isTeams ? s.config.teams : undefined, stateSnapshot: cloneCradosState(s), visits: s.visits, visitHistory: s.visits, stats: { mode: "crados", teamMode: isTeams, players: s.statsByPlayer, teams: perTeam, legWins: s.legWins, sectors: s.sectors } },
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

  const commit = React.useCallback((next: CradosState, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneCradosState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const ev = lastEvents(next.visits);
    let message = ev.length ? ev.join(" · ") : "";
    if (next.phase === "finished" && next.winnerId) message = `🏆 ${cradosSideName(next, next.winnerId) || "Victoire"} est ${isCradosTeamMode(next) ? "la dernière équipe encore propre" : "le dernier encore propre"}`;
    else if (next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${cradosSideName(next, next.lastLegWinnerId) || "Un joueur"} remporte la manche`;
    setNotice(message);
    persist(next);
  }, [state, persist]);

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
  const handleKeypadCancel = () => {
    if (currentThrow.length) {
      setCurrentThrow([]);
      setMultiplier(1);
      setNotice("Saisie en cours annulée");
      return;
    }
    doUndo();
  };

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const t = window.setTimeout(() => {
      try { commit(playCradosVisit(state, pickCradosBotDarts(state, activeBotLevel || config.botLevel))); }
      finally { botBusy.current = false; }
    }, 680);
    return () => window.clearTimeout(t);
  }, [state, activeIsBot, activePlayer?.id, activeBotLevel]);

  function replay() {
    matchIdRef.current = `crados-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setSelectedSector(20);
    setBoardOpen(false);
    setStatsOpen(false);
    setLogOpen(false);
    setState(createCradosState(players, config));
  }

  React.useEffect(() => {
    const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
    const dirtLimit = Math.max(1, Number(config.rules?.dirtLimit || 1));
    const stats = activePlayer ? state.statsByPlayer?.[activePlayer.id] || {} : {};
    awena?.setRuntime?.({
      route: "crados_play",
      sport: "darts",
      mode: "crados",
      phase: state.phase === "finished" ? "summary" : "play",
      inGame: state.phase !== "finished",
      screenLabel: "CRADOS · Partie",
      playerName: activePlayer?.name || undefined,
      extra: {
        teamMode,
        activeSide: activeSide?.name || activePlayer?.name || "",
        dirt,
        dirtLimit,
        dirtPercent: Math.round((dirt / dirtLimit) * 100),
        layersToOwn: Number(config.rules?.layersToOwn || 3),
        stealMode: config.rules?.stealMode || "block",
        bullWash: config.rules?.bullWash !== false,
        leg: Number(state.legIndex || 0) + 1,
        seriesWins: Number(config.seriesWins || 1),
        sectorsClaimed: Number(stats.sectorsClaimed || 0),
        sectorsStolen: Number(stats.sectorsStolen || 0),
        dirtWashed: Number(stats.dirtWashed || 0),
        awenaRememberedMode: "crados",
        cradosPageHint: "active-play",
      },
    });
  }, [awena, state.phase, state.legIndex, state.dirt, state.statsByPlayer, activePlayer?.id, activePlayer?.name, activeSideId, activeSide?.name, teamMode, config]);

  if (state.phase === "finished") {
    return <div className="crados-play crados-play--finished" data-mss-native-play-layout="1">
      <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={8} left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={<div style={{ marginRight: 7 }}><CradosAwenaButton /></div>} />
      <div className="crados-play__finished-wrap"><ModeEndPanel title={teamMode ? "CRADOS — ÉQUIPES" : "CRADOS"} winner={state.winnerId} profiles={teamMode ? sideProfiles : profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: "crados", from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "crados", focusMatchId: matchIdRef.current })} onConfig={() => go?.("crados_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{teamMode ? sides.map((side: any) => { const st = sideStats[String(side.id)] || {}; return <div key={side.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${(side.color || ACCENT)}44`, fontSize: 9.5, color: SOFT }}><b style={{ color: side.color || "#fff" }}>{side.name}</b><br />{st.sectorsClaimed || 0} secteurs · {st.sectorsStolen || 0} vols · {st.dirtTaken || 0} crasses · {st.dirtWashed || 0} lavées</div>; }) : profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.sectorsClaimed || 0} secteurs · {st.sectorsStolen || 0} vols · {st.dirtTaken || 0} crasses · {st.dirtWashed || 0} lavées</div>; })}</div>} /></div>
    </div>;
  }

  return <div className="crados-play" data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={<div style={{ marginRight: 7 }}><CradosAwenaButton /></div>} />

    <main className="crados-play__body">
      <div className="crados-play__stage">
        <div className="crados-play__left">
          <ActivePlayerCard state={state} activePlayer={activePlayer} activeProfile={activeProfile} activeIsBot={activeIsBot} activeBotLevel={activeBotLevel} color={activeColor} config={config} activeSideId={activeSideId} activeSide={activeSide} teamMode={teamMode} onOpenBoard={() => setBoardOpen(true)} />
          <KpiStatsStrip state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} config={config} teamMode={teamMode} color={activeColor} onClick={() => setStatsOpen(true)} />
          <div className="crados-play__quick-row">
            <PlayersButton state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} onClick={() => setPlayersOpen(true)} teamMode={teamMode} />
            <button type="button" className="crados-stats-button" onClick={() => setLogOpen(true)} aria-label="Ouvrir le journal"><LogIcon size={23} /></button>
          </div>
          <KpiStatsStrip className="crados-landscape-stats" state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} config={config} teamMode={teamMode} color={activeColor} onClick={() => setStatsOpen(true)} items={[["COUCHES", (state.statsByPlayer?.[activePlayer?.id || ""] || {}).layersPlaced || 0], ["LAVÉES", ((teamMode ? sideStats[String(activeSideId)] : state.statsByPlayer?.[activePlayer?.id || ""]) || {}).dirtWashed || 0], ["TOURS", (state.statsByPlayer?.[activePlayer?.id || ""] || {}).visits || 0], ["MANCHES", state.legWins?.[activeSideId] || 0]]} />
        </div>

        <div className="crados-play__input">
          {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleKeypadCancel} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER" accent={activeColor} fitMinScale={0.16} /> : <div className="crados-play__bot-turn" style={{ borderColor: `${activeColor}55`, boxShadow: `inset 0 0 34px ${activeColor}0d` }}><ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={activeColor} /><div><b style={{ color: activeColor }}>{teamMode ? `${activeSide?.name || "Équipe"} · ${activePlayer?.name || "BOT"}` : activePlayer?.name}</b><span>répand sa crasse sur la cible…</span></div><i>🤢</i></div>}
        </div>
      </div>
    </main>

    {playersOpen ? <PlayersModal state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} config={config} onClose={() => setPlayersOpen(false)} teamMode={teamMode} sideById={sideById} /> : null}
    {statsOpen ? <StatsModal state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} color={activeColor} config={config} teamMode={teamMode} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal state={state} onClose={() => setLogOpen(false)} profileById={profileById} profileBySideId={profileBySideId} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} teamMode={teamMode} sideById={sideById} /> : null}
    {boardOpen ? <TacticalBoardModal state={state} sides={sides} sideById={sideById} colorBySideId={colorBySideId} profileBySideId={profileBySideId} activeSideId={activeSideId} config={config} selectedSector={selectedSector} onSelect={setSelectedSector} onClose={() => setBoardOpen(false)} /> : null}
  </div>;
}
