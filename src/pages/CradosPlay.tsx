// @ts-nocheck
import React from "react";
import { createPortal } from "react-dom";
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
import { playCradosDartSequence, playCradosDartSfx, playCradosSfx, unlockCradosAudio } from "../lib/cradosSfx";
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
const PLAYER_COLORS = [
  "#168CFF", // BLEU OCÉAN
  "#FFD21A", // JAUNE OR
  "#39D36F", // VERT NATURE
  "#D92C3A", // ROUGE SANG
  "#C83DFF", // VIOLET MAGENTA
  "#FF7A1A", // ORANGE
  "#FF3FA7", // ROSE FLUO
  "#F7F8FA", // BLANC
  "#19E6FF", // CYAN
  "#9A603A", // MARRON
];
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
const TOUCH_COLORS: Record<string, string> = {
  S: "#FFFFFF",
  D: "#BFEAFF",
  T: "#FFCCFF",
  BULL: "#8BE0B8",
  DBULL: "#50E68C",
  MISS: "#FFC63A",
};

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
          ...(awena?.runtime?.extra || {}),
          awenaRememberedMode: "crados",
          awenaKnowledgeTopic: "screen:crados_play",
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

function RankingIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 4h8v3.5c0 3-1.7 5.2-4 5.2s-4-2.2-4-5.2V4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M8 6H5.5C5.5 9 6.7 10.5 9 10.8M16 6h2.5c0 3-1.2 4.5-3.5 4.8M12 12.7V17M9 20h6M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
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
  const portraitTouchedSides = detailSides.filter((entry: any) => Number(entry.touches || 0) > 0);

  return <div className={`crados-tactical-board${rightSides.length ? "" : " is-left-only"}${portraitTouchedSides.length ? " has-portrait-touches" : " no-portrait-touches"}`}>
    <div className="crados-tactical-board__side crados-tactical-board__side--left">
      {leftSides.map(({ side, color, profile, touches }: any) => <div key={`left-${side.id}`} className="crados-tactical-board__side-item">
        <div className="crados-tactical-board__side-avatar" style={{ background: color, boxShadow: `inset 0 0 18px ${color}55, 0 0 14px ${color}1f` }}><ProfileAvatar profile={profile || side} size={36} showStars={false} ringColor={color} noFrame /></div>
        <div className="crados-tactical-board__side-count" style={{ borderColor: `${color}88`, color }}>{touches}</div>
      </div>)}
    </div>

    <div className="crados-tactical-board__top-strip" aria-label="Touches par joueur sur la zone sélectionnée">
      {portraitTouchedSides.map(({ side, color, profile, touches }: any) => <div key={`portrait-top-${side.id}`} className="crados-tactical-board__top-item">
        <div className="crados-tactical-board__side-avatar" style={{ background: color, boxShadow: `inset 0 0 18px ${color}55, 0 0 14px ${color}1f` }}><ProfileAvatar profile={profile || side} size={36} showStars={false} ringColor={color} noFrame /></div>
        <div className="crados-tactical-board__side-count" style={{ borderColor: `${color}88`, color }}>{touches}</div>
      </div>)}
    </div>

    <div className="crados-tactical-board__side crados-tactical-board__side--portrait">
      {portraitTouchedSides.map(({ side, color, profile, touches }: any) => <div key={`portrait-${side.id}`} className="crados-tactical-board__side-item">
        <div className="crados-tactical-board__side-avatar" style={{ background: color, boxShadow: `inset 0 0 18px ${color}55, 0 0 14px ${color}1f` }}><ProfileAvatar profile={profile || side} size={36} showStars={false} ringColor={color} noFrame /></div>
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
  const modal = <div className="crados-board-modal" role="dialog" aria-modal="true" aria-label="Carte tactique CRADOS" onClick={onClose}>
    <div className="crados-board-modal__card" onClick={(event) => event.stopPropagation()}>
      <header><div><b>CARTE DES ZONES</b></div><div className="crados-board-modal__actions"><CradosAwenaButton /><button type="button" onClick={onClose} aria-label="Fermer">×</button></div></header>
      <div className="crados-board-modal__filters">
        <button type="button" className={`crados-board-modal__filter-chip${filterSideId === "all" ? " is-active" : ""}`} style={{ ["--filter-color" as any]: ACCENT }} onClick={() => setFilterSideId("all")}>TOUT</button>
        <button type="button" className={`crados-board-modal__filter-chip${filterSideId === "free" ? " is-active" : ""}`} style={{ ["--filter-color" as any]: "#8e9891" }} onClick={() => setFilterSideId("free")}><i style={{ background: "#889088" }} />LIBRES</button>
        {sides.map((side: any) => {
          const color = colorBySideId.get(String(side.id)) || ACCENT;
          const prof = profileBySideId?.get?.(String(side.id)) || side;
          const active = filterSideId === String(side.id);
          const allVisible = filterSideId === "all";
          return <button key={side.id} type="button" className={`crados-board-modal__avatar-filter${active ? " is-active" : ""}${allVisible ? " is-all-visible" : ""}`} style={{ ["--filter-color" as any]: color }} onClick={() => setFilterSideId(String(side.id))} aria-label={`Filtrer ${side.name}`} title={side.name}><span style={{ borderColor: color }}><ProfileAvatar profile={prof} size={26} showStars={false} ringColor={color} noFrame /></span></button>;
        })}
      </div>
      <div className="crados-board-modal__body"><CradosTacticalBoard state={state} sides={sides} sideById={sideById} colorBySideId={colorBySideId} profileBySideId={profileBySideId} activeSideId={activeSideId} config={config} selectedSector={selectedSector} onSelect={onSelect} filterSideId={filterSideId} /></div>
      <div className="crados-board-modal__legend"><span><i className="is-free" />Libre</span><span><i className="is-progress" />Contamination en cours</span><span><i className="is-owned" />Zone possédée</span><span>BULL = douche {config.rules.bullWash ? "−1 · DBULL −3" : "désactivée"}</span></div>
    </div>
  </div>;
  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
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
      <div className="crados-log-modal__legend-fixed">
        {['S', 'D', 'T', 'BULL', 'DBULL', 'MISS'].map((label) => <span key={label} style={{ color: TOUCH_COLORS[label], borderColor: `${TOUCH_COLORS[label]}66` }}>{label}</span>)}
      </div>
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

function CradosSummaryStrip({ state, profiles, profileById, colorByPlayerId, colorBySideId, config, teamMode }: any) {
  return <div className="crados-summary-strip" aria-label="Résumé des joueurs CRADOS">
    {state.players.slice(0, 10).map((p: any, i: number) => {
      const prof = profileById.get(String(p.id)) || profiles[i] || p;
      const sideId = cradosSideIdForPlayer(state, p.id);
      const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
      const dirt = Number(state.dirt?.[sideId] || 0);
      const active = state.phase !== "finished" && state.activePlayerIndex === i;
      return <div key={p.id} className={`crados-summary-strip__item${active ? " is-active" : ""}`} style={{ borderColor: `${color}${active ? "dd" : "66"}`, boxShadow: active ? `0 0 16px ${color}44` : "none" }}>
        <div className="crados-summary-strip__avatar" style={{ borderColor: color }}><ProfileAvatar profile={prof} size={34} showStars={false} ringColor={color} noFrame /></div>
        <div className="crados-summary-strip__score" style={{ color }}>{dirt}<small>/{config.rules.dirtLimit}</small></div>
      </div>;
    })}
  </div>;
}

function buildCradosRanking({ state, profiles, profileById, colorByPlayerId, colorBySideId, teamMode }: any) {
  const rows = state.players.map((p: any, i: number) => {
    const prof = profileById.get(String(p.id)) || profiles[i] || p;
    const sideId = cradosSideIdForPlayer(state, p.id);
    const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
    const st = state.statsByPlayer?.[p.id] || {};
    return {
      id: String(p.id),
      name: playerName(prof),
      profile: prof,
      sideId,
      color,
      dirt: Number(state.dirt?.[sideId] || 0),
      zones: Number(st.sectorsClaimed || 0),
      steals: Number(st.sectorsStolen || 0),
      layers: Number(st.layersPlaced || 0),
      darts: Number(st.darts || 0),
      visits: Number(st.visits || 0),
      dirtTaken: Number(st.dirtTaken || 0),
      dirtWashed: Number(st.dirtWashed || 0),
      dirtInflicted: Number(st.dirtInflicted || 0),
      bulls: Number(st.bulls || 0),
      dbulls: Number(st.dbulls || 0),
      misses: Number(st.misses || 0),
      bestVisitImpact: Number(st.bestVisitImpact || 0),
      legs: Number(state.legWins?.[sideId] || 0),
      eliminated: !!state.eliminated?.[sideId],
      order: i,
    };
  });
  return rows.sort((a: any, b: any) => Number(a.eliminated) - Number(b.eliminated) || a.dirt - b.dirt || b.zones - a.zones || b.legs - a.legs || a.order - b.order);
}

function RankingModal({ rows, dirtLimit, onClose }: any) {
  return <div className="crados-players-modal" role="dialog" aria-modal="true" aria-label="Classement CRADOS" onClick={onClose}>
    <div className="crados-players-modal__card crados-ranking-modal" onClick={(e) => e.stopPropagation()}>
      <header><div><b>CLASSEMENT</b><span>Moins de crasse = meilleure position</span></div><button type="button" onClick={onClose} aria-label="Fermer">×</button></header>
      <div className="crados-ranking-modal__list">
        {rows.map((row: any, index: number) => <div key={row.id} className="crados-ranking-modal__row" style={{ borderColor: `${row.color}55` }}>
          <div className="crados-ranking-modal__rank" style={{ color: row.color }}>#{index + 1}</div>
          <div className="crados-ranking-modal__avatar" style={{ borderColor: row.color }}><ProfileAvatar profile={row.profile} size={42} showStars={false} ringColor={row.color} noFrame /></div>
          <div className="crados-ranking-modal__name"><b style={{ color: row.color }}>{String(row.name || "—").toUpperCase()}</b><span>{row.eliminated ? "ÉLIMINÉ" : `${row.zones} zone${row.zones > 1 ? "s" : ""}`}</span></div>
          <div className="crados-ranking-modal__score" style={{ color: row.color }}>{row.dirt}<small>/{dirtLimit}</small></div>
        </div>)}
      </div>
    </div>
  </div>;
}

function ActivePlayerCard({ state, activePlayer, activeProfile, activeIsBot, activeBotLevel, color, config, activeSideId, activeSide, teamMode, onOpenBoard, coachHint }: any) {
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const avatarSrc = profileImageSrc(activeProfile || activePlayer);
  const headerLabel = state.phase === "finished" ? "PARTIE TERMINÉE" : teamMode ? activeSide?.name || "ÉQUIPE" : activeIsBot ? `BOT IA · NIV. ${activeBotLevel || config.botLevel}` : "";
  return <section className="crados-active" style={{ borderColor: `${color}68`, boxShadow: `0 15px 34px rgba(0,0,0,.34),inset 0 0 44px ${color}0c` }}>
    <div className="crados-active__ghost" aria-hidden>{avatarSrc ? <img src={avatarSrc} alt="" /> : <ProfileAvatar profile={activeProfile || activePlayer} size={112} showStars={false} ringColor={color} noFrame />}</div>
    <div className="crados-active__main">
      {headerLabel ? <div className="crados-active__eyebrow" style={{ color }}>{headerLabel}</div> : null}
      <div className="crados-active__name" style={{ color }}>{String(activePlayer?.name || "—").toUpperCase()}</div>
      <div className="crados-active__turn" style={{ borderColor: `${color}66`, color }}>TOUR {currentCradosRound(state)} · VOLÉE {Number(state.turnIndex || 0) + 1}</div>
      <div className="crados-active__percent" style={{ color }}>{dirt}</div>
      {!activeIsBot && coachHint?.visual ? <div className="crados-active__coach" style={{ color }}>🎯 {coachHint.visual}</div> : null}
      <CradosDirtMeter value={dirt} max={config.rules.dirtLimit} color={color} />
      <div className="crados-active__leg" style={{ color }}>{`MANCHE ${Number(state.legIndex || 0) + 1} · TOUR ${currentCradosRound(state)} · VOLÉE ${Number(state.turnIndex || 0) + 1} · ${state.legWins?.[activeSideId] || 0}/${config.seriesWins}`}</div>
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
        return <div key={p.id} className={state.activePlayerIndex === i ? "is-active" : ""} style={{ borderColor: color, opacity: state.eliminated[sideId] ? .38 : 1 }}><ProfileAvatar profile={prof} size={48} showStars={false} ringColor={color} noFrame /></div>;
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

function CradosEndPanel({ state, profiles, sideProfiles, rankingRows, teamMode, colorByPlayerId, colorBySideId, config, onReplay, onStats, onHistory, onConfig, onGames }: any) {
  const winnerId = String(state.winnerId || "");
  const winnerProfile = (teamMode ? sideProfiles : profiles).find((p: any) => String(p.id) === winnerId) || (teamMode ? sideProfiles : profiles)[0];
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.darts || 0), 0);
  const totalZones = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.sectorsClaimed || 0), 0);
  const totalSteals = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.sectorsStolen || 0), 0);
  const totalWashed = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.dirtWashed || 0), 0);
  const totalInflicted = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.dirtInflicted || 0), 0);
  const totalHits = Object.values(state.statsByPlayer || {}).reduce((a: number, st: any) => a + Number(st?.hits || 0), 0);
  const accuracy = totalDarts ? Math.round((totalHits / totalDarts) * 100) : 0;
  const durationMs = Math.max(0, Number(state.finishedAt || Date.now()) - Number(state.startedAt || Date.now()));
  const durationMin = Math.max(1, Math.round(durationMs / 60000));
  return <div className="crados-end">
    <section className="crados-end__hero">
      <div className="crados-end__slime">CRADOS TERMINÉ !</div>
      <div className="crados-end__winner"><ProfileAvatar profile={winnerProfile} size={92} showStars={false} ringColor={rankingRows?.[0]?.color || ACCENT} noFrame /></div>
      <div className="crados-end__title" style={{ color: rankingRows?.[0]?.color || ACCENT }}>{String(winnerProfile?.name || "VICTOIRE").toUpperCase()}</div>
      <div className="crados-end__subtitle">reste le plus propre après {durationMin} min · {totalDarts} fléchettes</div>
    </section>
    <section className="crados-end__kpis">
      {[['ZONES', totalZones], ['VOLS', totalSteals], ['CRASSE INFLIGÉE', totalInflicted], ['CRASSE LAVÉE', totalWashed], ['PRÉCISION', `${accuracy}%`], ['MANCHES', Number(state.legWins?.[winnerId] || 0)]].map(([label,value]) => <div key={String(label)}><span>{label}</span><b>{value}</b></div>)}
    </section>
    <section className="crados-end__ranking">
      <header><b>CLASSEMENT FINAL</b><span>moins de crasse = mieux classé</span></header>
      <div>{(rankingRows || []).map((row: any, index: number) => <div key={row.id} className="crados-end__rankrow" style={{ borderColor: `${row.color}55` }}><strong style={{ color: row.color }}>#{index+1}</strong><span className="crados-end__rankavatar" style={{ borderColor: row.color }}><ProfileAvatar profile={row.profile} size={42} showStars={false} ringColor={row.color} noFrame /></span><b style={{ color: row.color }}>{String(row.name || '').toUpperCase()}</b><em style={{ color: row.color }}>{row.dirt}/{config.rules.dirtLimit}</em><small>{row.zones} zones · {row.legs} manches</small></div>)}</div>
    </section>
    <section className="crados-end__details">
      <header><b>STATS COMPLÈTES DE LA PARTIE</b><span>tous les compteurs enregistrés</span></header>
      <div><table><thead><tr>{["Joueur","Darts","Tours","Couches","Zones","Vols","Infligée","Reçue","Lavée","Bull","DBull","Miss","Best","Manches"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{(rankingRows || []).map((row: any) => <tr key={row.id}><td><span style={{ color: row.color }}>{String(row.name || "").toUpperCase()}</span></td><td>{row.darts}</td><td>{row.visits}</td><td>{row.layers}</td><td>{row.zones}</td><td>{row.steals}</td><td>{row.dirtInflicted}</td><td>{row.dirtTaken}</td><td>{row.dirtWashed}</td><td>{row.bulls}</td><td>{row.dbulls}</td><td>{row.misses}</td><td>{row.bestVisitImpact}</td><td>{row.legs}</td></tr>)}</tbody></table></div>
    </section>
    <section className="crados-end__actions">
      <button type="button" onClick={onStats}>📊 STATS DÉTAILLÉES</button><button type="button" onClick={onHistory}>🕘 HISTORIQUE</button><button type="button" onClick={onReplay}>↻ REJOUER</button><button type="button" onClick={onConfig}>⚙ CONFIGURATION</button><button type="button" className="is-wide" onClick={onGames}>RETOUR AUX JEUX</button>
    </section>
  </div>;
}

function compactResumeProfile(profile: any) {
  if (!profile || typeof profile !== "object") return profile;
  const avatar = profile.avatarDataUrl ?? profile.avatarUrl ?? profile.avatar ?? profile.photoURL ?? profile.photoUrl ?? null;
  const safeAvatar = typeof avatar === "string" && !avatar.startsWith("data:") && !avatar.startsWith("blob:") && avatar.length < 2048 ? avatar : null;
  return {
    id: String(profile.id ?? profile.profileId ?? ""),
    name: playerName(profile),
    displayName: profile.displayName ?? profile.display_name ?? undefined,
    isBot: Boolean(profile.isBot || profile.bot || profile.kind === "bot" || profile.botLevel),
    bot: Boolean(profile.bot),
    kind: profile.kind,
    botLevel: profile.botLevel,
    country: profile.country,
    avatarUrl: safeAvatar || undefined,
  };
}

function compactCradosResumeConfig(raw: any) {
  const cfg: any = normalizeCradosConfig(raw || {});
  return {
    ...cfg,
    playersList: Array.isArray(cfg.playersList) ? cfg.playersList.map(compactResumeProfile) : [],
    teams: Array.isArray(cfg.teams) ? cfg.teams.map((team: any) => ({
      id: String(team?.id || ""),
      name: String(team?.name || "Équipe"),
      color: team?.color ?? null,
      playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
      isBotTeam: Boolean(team?.isBotTeam),
      isCradosFamily: Boolean(team?.isCradosFamily),
      logoDataUrl: typeof team?.logoDataUrl === "string" && !team.logoDataUrl.startsWith("data:") && !team.logoDataUrl.startsWith("blob:") && team.logoDataUrl.length < 2048 ? team.logoDataUrl : null,
    })) : [],
  };
}

function compactCradosResumeState(state: CradosState) {
  const snap: any = cloneCradosState(state);
  snap.config = compactCradosResumeConfig(snap.config);
  return snap;
}

function extractCradosResumeState(record: any, params: any) {
  const candidates = [
    params?.snapshot,
    record?.resume?.state,
    record?.resume?.livePayload?.stateSnapshot,
    record?.resume?.livePayload?.state,
    record?.payload?.stateSnapshot,
    record?.payload?.state,
    record?.payload?.resume?.state,
  ];
  return candidates.find((candidate: any) => candidate && candidate.mode === "crados") || null;
}

function currentCradosRound(state: any) {
  const participantCount = Math.max(1, Number(state?.players?.length || 1));
  return Math.floor(Number(state?.turnIndex || 0) / participantCount) + 1;
}

function buildCradosCoachHint(state: any, activeSideIdRaw: any, activeNameRaw: any) {
  if (!state || state.phase !== "playing") return { visual: "", speech: "" };
  const sideId = String(activeSideIdRaw || "");
  const activeName = String(activeNameRaw || "Joueur");
  const rules = state?.config?.rules || {};
  const limit = Math.max(1, Number(rules.dirtLimit || 10));
  const dirt = Number(state?.dirt?.[sideId] || 0);
  const layersToOwn = Math.max(1, Number(rules.layersToOwn || 3));
  const round = currentCradosRound(state);

  if (rules.bullWash !== false && dirt >= Math.max(2, Math.ceil(limit * .55))) {
    return {
      visual: `AWENA · BULL POUR TE NETTOYER`,
      speech: `${activeName}, tour ${round}. Tu as beaucoup de crasse. Vise le Bull.`,
    };
  }

  const sectors = DARTBOARD_ORDER.map((n) => ({ n, sec: state?.sectors?.[n] || {} }));
  const progressing = sectors
    .map(({ n, sec }) => {
      const progress = rules.sectorRaceMode === "race"
        ? Number(sec?.pressureBySide?.[sideId] || 0)
        : String(sec?.claimantId || "") === sideId ? Number(sec?.layers || 0) : 0;
      return { n, sec, progress };
    })
    .filter((row) => !row.sec?.ownerId && row.progress > 0)
    .sort((a, b) => b.progress - a.progress || DARTBOARD_ORDER.indexOf(a.n) - DARTBOARD_ORDER.indexOf(b.n));
  if (progressing.length) {
    const best = progressing[0];
    const remaining = Math.max(1, layersToOwn - best.progress);
    return {
      visual: `AWENA · VISE N°${best.n} · ${best.progress}/${layersToOwn}`,
      speech: `${activeName}, tour ${round}. Vise le ${best.n}. Encore ${remaining} touche${remaining > 1 ? "s" : ""}.`,
    };
  }

  if (rules.stealMode === "flip") {
    const enemy = sectors
      .filter(({ sec }) => sec?.ownerId && String(sec.ownerId) !== sideId)
      .sort((a, b) => Number(a.sec?.layers || layersToOwn) - Number(b.sec?.layers || layersToOwn));
    if (enemy.length) {
      return {
        visual: `AWENA · ATTAQUE N°${enemy[0].n}`,
        speech: `${activeName}, tour ${round}. Attaque le ${enemy[0].n}, zone adverse fragile.`,
      };
    }
  }

  const free = sectors.filter(({ sec }) => !sec?.ownerId && !sec?.claimantId);
  if (free.length) {
    const target = free[Number(state?.turnIndex || 0) % free.length]?.n || free[0].n;
    return {
      visual: `AWENA · VISE N°${target} · LIBRE`,
      speech: `${activeName}, tour ${round}. Vise le ${target}, secteur libre.`,
    };
  }

  if (rules.bullWash !== false && dirt > 0) {
    return {
      visual: `AWENA · BULL POUR TE NETTOYER`,
      speech: `${activeName}, tour ${round}. Tente le Bull pour te nettoyer.`,
    };
  }

  return {
    visual: `AWENA · JOUE PRUDENT`,
    speech: `${activeName}, tour ${round}. Évite les zones adverses et joue prudent.`,
  };
}

export default function CradosPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const initialResumeState = extractCradosResumeState(resumeRecord, props?.params);
  const config = React.useMemo(() => normalizeCradosConfig(props?.params?.config || resumeRecord?.resume?.config || initialResumeState?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store).slice(0, 10), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = initialResumeState;
  const [state, setState] = React.useState<CradosState>(() => restored?.mode === "crados" ? cloneCradosState(restored) : createCradosState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => {
    const draft = resumeRecord?.resume?.currentThrow ?? resumeRecord?.resume?.livePayload?.currentThrow;
    return Array.isArray(draft) ? draft.slice(0, 3) : [];
  });
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => {
    const raw = resumeRecord?.resume?.multiplier ?? resumeRecord?.resume?.livePayload?.multiplier;
    return raw === 2 || raw === 3 ? raw : 1;
  });
  const [undo, setUndo] = React.useState<CradosState[]>([]);
  const [notice, setNotice] = React.useState("");
  const [playersOpen, setPlayersOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [boardOpen, setBoardOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [rankingOpen, setRankingOpen] = React.useState(false);
  const [selectedSector, setSelectedSector] = React.useState(20);
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const initialCheckpointRef = React.useRef(false);
  const historyHydratedRef = React.useRef(Boolean(restored));
  const coachSpokenKeyRef = React.useRef("");
  const introPlayedRef = React.useRef(false);
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
  const rankingRows = React.useMemo(() => buildCradosRanking({ state, profiles, profileById, colorByPlayerId, colorBySideId, teamMode }), [state.players, state.dirt, state.eliminated, state.statsByPlayer, state.legWins, profiles, profileById, colorByPlayerId, colorBySideId, teamMode]);

  const sideStats = React.useMemo(() => Object.fromEntries(sides.map((side: any) => {
    const ids = Array.isArray(side?.playerIds) ? side.playerIds.map(String) : [String(side.id)];
    const rows = ids.map((id: string) => state.statsByPlayer[id] || {});
    const sum = (key: string) => rows.reduce((total: number, row: any) => total + Number(row?.[key] || 0), 0);
    const max = (key: string) => rows.reduce((value: number, row: any) => Math.max(value, Number(row?.[key] || 0)), 0);
    return [String(side.id), {
      darts: sum("darts"), visits: sum("visits"), hits: sum("hits"), misses: sum("misses"),
      singles: sum("singles"), doubles: sum("doubles"), triples: sum("triples"), bulls: sum("bulls"), dbulls: sum("dbulls"),
      layersPlaced: sum("layersPlaced"), sectorsClaimed: sum("sectorsClaimed"), sectorsStolen: sum("sectorsStolen"),
      dirtTaken: sum("dirtTaken"), dirtWashed: sum("dirtWashed"), dirtInflicted: sum("dirtInflicted"), bullSplashInflicted: sum("bullSplashInflicted"),
      freeSectorHits: sum("freeSectorHits"), ownSectorHits: sum("ownSectorHits"), opponentSectorHits: sum("opponentSectorHits"),
      cleanVisits: sum("cleanVisits"), dirtyVisits: sum("dirtyVisits"), eliminationsCaused: sum("eliminationsCaused"), legsWon: sum("legsWon"),
      maxDirt: max("maxDirt"), bestVisitImpact: max("bestVisitImpact"),
    }];
  })), [sides, state.statsByPlayer]);

  const buildRecord = React.useCallback((s: CradosState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const isTeams = isCradosTeamMode(s);
    const perPlayer = Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => {
      const sideId = cradosSideIdForPlayer(s, id);
      return [id, { ...st, teamId: isTeams ? sideId : null, dirt: Number(s.dirt[sideId] || 0), eliminated: !!s.eliminated[sideId], wins: Number(s.legWins[sideId] || 0) }];
    }));
    const perTeam = isTeams ? Object.fromEntries((s.config.teams || []).map((team: any) => {
      const memberStats = (team.playerIds || []).map((id: string) => s.statsByPlayer[id] || {});
      const sum = (key: string) => memberStats.reduce((total: number, row: any) => total + Number(row?.[key] || 0), 0);
      const max = (key: string) => memberStats.reduce((value: number, row: any) => Math.max(value, Number(row?.[key] || 0)), 0);
      return [String(team.id), {
        id: String(team.id), name: team.name, playerIds: team.playerIds || [], dirt: Number(s.dirt[team.id] || 0), eliminated: !!s.eliminated[team.id], wins: Number(s.legWins[team.id] || 0),
        darts: sum("darts"), visits: sum("visits"), hits: sum("hits"), misses: sum("misses"),
        singles: sum("singles"), doubles: sum("doubles"), triples: sum("triples"), bulls: sum("bulls"), dbulls: sum("dbulls"),
        layersPlaced: sum("layersPlaced"), sectorsClaimed: sum("sectorsClaimed"), sectorsStolen: sum("sectorsStolen"),
        dirtTaken: sum("dirtTaken"), dirtWashed: sum("dirtWashed"), dirtInflicted: sum("dirtInflicted"), bullSplashInflicted: sum("bullSplashInflicted"),
        freeSectorHits: sum("freeSectorHits"), ownSectorHits: sum("ownSectorHits"), opponentSectorHits: sum("opponentSectorHits"),
        cleanVisits: sum("cleanVisits"), dirtyVisits: sum("dirtyVisits"), eliminationsCaused: sum("eliminationsCaused"), legsWon: sum("legsWon"),
        maxDirt: max("maxDirt"), bestVisitImpact: max("bestVisitImpact"),
      }];
    })) : undefined;
    const compactConfig = compactCradosResumeConfig(s.config);
    const resumeState = compactCradosResumeState(s);
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current,
      kind: "crados", mode: "crados", sport: "darts", status, createdAt: s.startedAt, updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, winnerTeamId: isTeams ? s.winnerId : undefined, players: rows, teams: isTeams ? s.config.teams : undefined,
      game: { mode: "crados", gameMode: isTeams ? "teams" : "players", dirtLimit: s.config.rules.dirtLimit, seriesWins: s.config.seriesWins },
      summary: {
        mode: "crados", teamMode: isTeams, finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer, perTeam,
        durationMs: Math.max(0, Number((status === "finished" ? (s.finishedAt || Date.now()) : Date.now())) - Number(s.startedAt || Date.now())),
        totalVisits: Number(s.visits?.length || 0),
        totalDarts: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.darts || 0), 0),
        totalLayers: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.layersPlaced || 0), 0),
        totalZones: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.sectorsClaimed || 0), 0),
        totalSteals: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.sectorsStolen || 0), 0),
        totalDirtInflicted: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.dirtInflicted || 0), 0),
        totalDirtWashed: Object.values(s.statsByPlayer || {}).reduce((sum: number, row: any) => sum + Number(row?.dirtWashed || 0), 0),
        ranking: buildCradosRanking({ state: s, profiles, profileById: new Map(profiles.map((p: any) => [String(p.id), p])), colorByPlayerId, colorBySideId, teamMode: isTeams }),
      },
      resume: { mode: "crados", config: compactConfig, state: resumeState, currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, updatedAt: Date.now() },
      payload: {
        kind: "crados", mode: "crados", sport: "darts", config: status === "finished" ? s.config : compactConfig, teams: isTeams ? compactConfig.teams : undefined,
        stateSnapshot: status === "finished" ? cloneCradosState(s) : resumeState, currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, visits: s.visits, visitHistory: s.visits,
        stats: { mode: "crados", teamMode: isTeams, players: perPlayer, teams: perTeam, legWins: s.legWins, sectors: s.sectors },
      },
    };
  }, [profiles, currentThrow, multiplier, colorByPlayerId, colorBySideId]);

  const saveInProgress = React.useCallback(async (s: CradosState, draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier, announce = false) => {
    if (s.phase !== "playing") return;
    try {
      await History.upsertInProgressCheckpoint(buildRecord(s, "in_progress", draft, draftMultiplier));
      if (announce && typeof window !== "undefined") window.dispatchEvent(new Event("dc-history-updated"));
    } catch (error) {
      console.warn("[CRADOS] checkpoint save failed", error);
    }
  }, [buildRecord, currentThrow, multiplier]);

  const persist = React.useCallback((s: CradosState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished", [], 1);
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec).catch((error) => console.warn("[CRADOS] final history save failed", error));
    } else void saveInProgress(s, [], 1, true);
  }, [buildRecord, onFinish, saveInProgress]);

  React.useEffect(() => {
    if (initialCheckpointRef.current) return;
    initialCheckpointRef.current = true;
    if (state.phase === "playing") void saveInProgress(state, currentThrow, multiplier, true);
  }, [saveInProgress, state, currentThrow, multiplier]);

  React.useEffect(() => {
    if (state.phase !== "playing") return;
    const timer = window.setTimeout(() => {
      void saveInProgress(state, currentThrow, multiplier, false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [currentThrow, multiplier, state, saveInProgress]);

  React.useEffect(() => {
    if (historyHydratedRef.current) return;
    const resumeId = String(props?.params?.resumeId || resumeRecord?.id || resumeRecord?.matchId || "").trim();
    if (!resumeId) return;
    let cancelled = false;
    void History.get(resumeId).then((full: any) => {
      if (cancelled || !full) return;
      const recovered = extractCradosResumeState(full, { snapshot: props?.params?.snapshot });
      if (!recovered || recovered.mode !== "crados") return;
      historyHydratedRef.current = true;
      matchIdRef.current = String(full?.id || full?.matchId || resumeId);
      setState(cloneCradosState(recovered));
      const recoveredThrow = full?.resume?.currentThrow ?? full?.resume?.livePayload?.currentThrow ?? full?.payload?.currentThrow;
      setCurrentThrow(Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
      const recoveredMultiplier = full?.resume?.multiplier ?? full?.resume?.livePayload?.multiplier ?? full?.payload?.multiplier;
      setMultiplier(recoveredMultiplier === 2 || recoveredMultiplier === 3 ? recoveredMultiplier : 1);
      setUndo([]);
      setNotice("Partie CRADOS reprise depuis l’historique");
      initialCheckpointRef.current = true;
    }).catch((error) => console.warn("[CRADOS] history resume failed", error));
    return () => { cancelled = true; };
  }, [props?.params?.resumeId, props?.params?.snapshot, resumeRecord]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => {
      if (state.phase === "playing") void saveInProgress(state, currentThrow, multiplier, false);
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, currentThrow, multiplier, saveInProgress]);

  const setCurrentThrowWithSfx = React.useCallback((update: any) => {
    setCurrentThrow((previous: UIDart[]) => {
      const resolved = typeof update === "function" ? update(previous) : update;
      const next = Array.isArray(resolved) ? resolved.slice(0, 3) : previous;
      if (next.length > previous.length) {
        const added = next.slice(previous.length);
        added.forEach((dart: UIDart, index: number) => {
          if (index === 0) playCradosDartSfx(dart);
          else window.setTimeout(() => playCradosDartSfx(dart), index * 140);
        });
      }
      return next;
    });
  }, []);

  // Même principe que Killer : le jingle démarre dès que l'autoplay est autorisé.
  // Une reprise depuis l'historique ne relance pas le jingle de début.
  React.useEffect(() => {
    if (restored?.mode === "crados" || resumeRecord) return;

    const startIntro = () => {
      try { void unlockCradosAudio(); } catch {}
      if (introPlayedRef.current) return;
      introPlayedRef.current = true;
      try { playCradosSfx("start"); } catch {}
    };

    try {
      const activation: any = (navigator as any)?.userActivation;
      if (activation?.hasBeenActive) {
        startIntro();
        return;
      }
    } catch {}

    const onFirstGesture = () => startIntro();
    window.addEventListener("pointerdown", onFirstGesture, { once: true, capture: true } as any);
    window.addEventListener("touchstart", onFirstGesture, { once: true, capture: true } as any);
    window.addEventListener("mousedown", onFirstGesture, { once: true, capture: true } as any);
    window.addEventListener("keydown", onFirstGesture, { once: true, capture: true } as any);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("touchstart", onFirstGesture, true);
      window.removeEventListener("mousedown", onFirstGesture, true);
      window.removeEventListener("keydown", onFirstGesture, true);
    };
  }, []);

  const coachHint = React.useMemo(() => buildCradosCoachHint(state, activeSideId, activePlayer?.name), [state.turnIndex, state.legIndex, state.sectors, state.dirt, state.phase, activeSideId, activePlayer?.name, config]);

  React.useEffect(() => {
    if (!awena || !activePlayer || activeIsBot || state.phase !== "playing") return;
    const key = `${state.legIndex}:${state.turnIndex}:${activePlayer.id}`;
    if (coachSpokenKeyRef.current === key || !coachHint.speech) return;
    coachSpokenKeyRef.current = key;
    const timer = window.setTimeout(() => { void awena.say?.(coachHint.speech); }, 320);
    return () => window.clearTimeout(timer);
  }, [awena, state.legIndex, state.turnIndex, state.phase, activePlayer?.id, activeIsBot, coachHint.speech]);

  const commit = React.useCallback((next: CradosState, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneCradosState(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const ev = lastEvents(next.visits);
    let message = ev.length ? ev.join(" · ") : "";
    if (next.phase === "finished" && next.winnerId) message = `🏆 ${cradosSideName(next, next.winnerId) || "Victoire"} est ${isCradosTeamMode(next) ? "la dernière équipe encore propre" : "le dernier encore propre"}`;
    else if (next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${cradosSideName(next, next.lastLegWinnerId) || "Un joueur"} remporte la manche`;

    if (next.phase === "finished" && previous.phase !== "finished") {
      try { playCradosSfx("victory"); } catch {}
    } else if (next.phase === "playing" && Number(next.turnIndex) !== Number(previous.turnIndex)) {
      try { playCradosSfx("turn"); } catch {}
    }
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
      try {
        const darts = pickCradosBotDarts(state, activeBotLevel || config.botLevel);
        const audioSpan = playCradosDartSequence(darts);
        window.setTimeout(() => {
          try { commit(playCradosVisit(state, darts)); }
          finally { botBusy.current = false; }
        }, audioSpan + 120);
      } catch {
        botBusy.current = false;
      }
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
    setRankingOpen(false);
    introPlayedRef.current = true;
    try { void unlockCradosAudio(); playCradosSfx("start"); } catch {}
    const next = createCradosState(players, config);
    setState(next);
    initialCheckpointRef.current = true;
    void saveInProgress(next, [], 1, true);
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
        round: currentCradosRound(state),
        visitNumber: Number(state.turnIndex || 0) + 1,
        coachTarget: coachHint.visual,
        seriesWins: Number(config.seriesWins || 1),
        sectorsClaimed: Number(stats.sectorsClaimed || 0),
        sectorsStolen: Number(stats.sectorsStolen || 0),
        dirtWashed: Number(stats.dirtWashed || 0),
        awenaRememberedMode: "crados",
        awenaKnowledgeTopic: "screen:crados_play",
        cradosPageHint: "active-play",
      },
    });
  }, [awena, state.phase, state.legIndex, state.turnIndex, state.dirt, state.statsByPlayer, activePlayer?.id, activePlayer?.name, activeSideId, activeSide?.name, teamMode, config, coachHint.visual]);

  if (state.phase === "finished") {
    return <div className="crados-play crados-play--finished" data-mss-native-play-layout="1">
      <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={10} left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={<div style={{ marginRight: 7 }}><CradosAwenaButton /></div>} />
      <div className="crados-play__finished-wrap"><CradosEndPanel state={state} profiles={profiles} sideProfiles={sideProfiles} rankingRows={rankingRows} teamMode={teamMode} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} config={config} onReplay={replay} onStats={() => go?.("statsHub", { mode: "crados", playerId: state.players?.find((p: any) => String(p.id) === String(state.winnerId))?.id || state.players?.[0]?.id, focusMatchId: matchIdRef.current })} onHistory={() => go?.("statsHub", { tab: "history", mode: "crados", focusMatchId: matchIdRef.current })} onConfig={() => go?.("crados_config")} onGames={() => go?.("games", { gamesView: "all" })} /></div>
    </div>;
  }

  return <div className="crados-play" data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={10} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={<div style={{ marginRight: 7 }}><CradosAwenaButton /></div>} />

    <main className="crados-play__body">
      <div className="crados-play__stage">
        <div className="crados-play__left">
          <CradosSummaryStrip state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} config={config} teamMode={teamMode} />
          <ActivePlayerCard state={state} activePlayer={activePlayer} activeProfile={activeProfile} activeIsBot={activeIsBot} activeBotLevel={activeBotLevel} color={activeColor} config={config} activeSideId={activeSideId} activeSide={activeSide} teamMode={teamMode} onOpenBoard={() => setBoardOpen(true)} coachHint={coachHint} />
          <KpiStatsStrip state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} config={config} teamMode={teamMode} color={activeColor} onClick={() => setStatsOpen(true)} />
          <div className="crados-play__quick-row">
            <button type="button" className="crados-stats-button crados-ranking-button" onClick={() => setRankingOpen(true)} aria-label="Ouvrir le classement"><RankingIcon size={23} /></button>
            <PlayersButton state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} onClick={() => setPlayersOpen(true)} teamMode={teamMode} />
            <button type="button" className="crados-stats-button" onClick={() => setLogOpen(true)} aria-label="Ouvrir le journal"><LogIcon size={23} /></button>
          </div>
          <KpiStatsStrip className="crados-kpi-strip crados-landscape-stats" state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} config={config} teamMode={teamMode} color={activeColor} onClick={() => setStatsOpen(true)} items={[["COUCHES", (state.statsByPlayer?.[activePlayer?.id || ""] || {}).layersPlaced || 0], ["LAVÉES", ((teamMode ? sideStats[String(activeSideId)] : state.statsByPlayer?.[activePlayer?.id || ""]) || {}).dirtWashed || 0], ["TOURS", (state.statsByPlayer?.[activePlayer?.id || ""] || {}).visits || 0], ["MANCHES", state.legWins?.[activeSideId] || 0]]} />
        </div>

        <div className="crados-play__input">
          {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleKeypadCancel} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER" accent={activeColor} fitMinScale={0.16} /> : <div className="crados-play__bot-turn" style={{ borderColor: `${activeColor}55`, boxShadow: `inset 0 0 34px ${activeColor}0d` }}><ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={activeColor} /><div><b style={{ color: activeColor }}>{teamMode ? `${activeSide?.name || "Équipe"} · ${activePlayer?.name || "BOT"}` : activePlayer?.name}</b><span>répand sa crasse sur la cible…</span></div><i>🤢</i></div>}
        </div>
      </div>
    </main>

    {playersOpen ? <PlayersModal state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} config={config} onClose={() => setPlayersOpen(false)} teamMode={teamMode} sideById={sideById} /> : null}
    {statsOpen ? <StatsModal state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} color={activeColor} config={config} teamMode={teamMode} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal state={state} onClose={() => setLogOpen(false)} profileById={profileById} profileBySideId={profileBySideId} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} teamMode={teamMode} sideById={sideById} /> : null}
    {rankingOpen ? <RankingModal rows={rankingRows} dirtLimit={config.rules.dirtLimit} onClose={() => setRankingOpen(false)} /> : null}
    {boardOpen ? <TacticalBoardModal state={state} sides={sides} sideById={sideById} colorBySideId={colorBySideId} profileBySideId={profileBySideId} activeSideId={activeSideId} config={config} selectedSector={selectedSector} onSelect={setSelectedSector} onClose={() => setBoardOpen(false)} /> : null}
  </div>;
}
