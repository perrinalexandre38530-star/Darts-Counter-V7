// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import tickerCrados from "../assets/tickers/ticker_crados.webp";
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
  actionStyle,
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

type PlayTab = "map" | "stats";

function Rules({ config }: any) {
  return <div style={{ display: "grid", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: ACCENT }}>CONTAMINATION</b><br />Simple = 1 couche, Double = 2, Triple = 3. À {config.rules.layersToOwn} couches, le secteur devient CRADO et t'appartient.</div>
    <div><b style={{ color: BROWN }}>SECTEUR ADVERSE</b><br />{config.rules.stealMode === "flip" ? "Mode VOL : tes touches retirent des couches et peuvent retourner le secteur, mais chaque contact adverse te donne +1 CRASSE." : "Mode BLOCAGE : toucher un secteur adverse ajoute autant de crasse à ta jauge."}</div>
    <div><b style={{ color: GREEN }}>DOUCHE</b><br />{config.rules.bullWash ? "BULL retire 1 crasse et DBULL en retire 3." : "Le Bull ne nettoie pas dans cette variante."}</div>
    <div><b style={{ color: RED }}>ÉLIMINATION</b><br />À {config.rules.dirtLimit} crasses, tu es éliminé. Le dernier joueur propre gagne.</div>
    {isCradosTeamMode(config) ? <div><b style={{ color: "#67d7ff" }}>ÉQUIPES</b><br />Les membres alternent leurs volées. Secteurs, crasse et manches sont partagés par l’équipe ; une jauge pleine élimine toute l’équipe.</div> : null}
  </div>;
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

function CradosAwenaButton() {
  const awena = useAwenaOptional();
  return <button
    type="button"
    className="crados-play__awena"
    aria-label="Ouvrir Awena"
    title="Awena"
    onClick={() => awena?.openPanel?.()}
  >
    <span><img src="/awena/awena-avatar.webp" alt="Awena" /></span>
    <i aria-hidden>🎙</i>
  </button>;
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

function CradosTacticalBoard({ state, sides, sideById, colorBySideId, activeSideId, config, selectedSector, onSelect }: any) {
  const selected = state.sectors?.[selectedSector] || {};
  const selectedOwner = selected.ownerId ? sideById.get(String(selected.ownerId)) : null;
  const selectedClaimant = !selected.ownerId && selected.claimantId ? sideById.get(String(selected.claimantId)) : null;
  const cost = sectorCost(selected, String(activeSideId || ""), config.rules.stealMode);
  const selectedColor = selected.ownerId ? colorBySideId.get(String(selected.ownerId)) : selected.claimantId ? colorBySideId.get(String(selected.claimantId)) : ACCENT;
  const layerCount = Number(selected.layers || 0);

  return <div className="crados-tactical-board">
    <div className="crados-tactical-board__visual">
      <div className="crados-tactical-board__caption"><b>CARTE TACTIQUE</b><span>Touche un secteur pour lire son risque</span></div>
      <svg viewBox="0 0 260 260" className="crados-tactical-board__svg" role="img" aria-label="Carte tactique de la cible CRADOS">
        <defs>
          <radialGradient id="cradosBoardBg" cx="50%" cy="48%">
            <stop offset="0%" stopColor="#172112" />
            <stop offset="70%" stopColor="#090d09" />
            <stop offset="100%" stopColor="#020403" />
          </radialGradient>
          <filter id="cradosGlow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx="130" cy="130" r="114" fill="url(#cradosBoardBg)" stroke="rgba(183,242,71,.20)" strokeWidth="2" />
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
          const labelPos = polar(130, 130, 103, idx * 18);
          const layerPos = polar(130, 130, 60, idx * 18);
          const owner = ownerId ? sideById.get(ownerId) : claimantId ? sideById.get(claimantId) : null;
          return <g key={n} onClick={() => onSelect(n)} style={{ cursor: "pointer" }}>
            <path
              d={annularWedge(130, 130, 22, 92, start, end)}
              fill={owned ? `${color}58` : claiming ? `${color}28` : "rgba(255,255,255,.025)"}
              stroke={selectedNow ? color : owned || claiming ? `${color}82` : "rgba(255,255,255,.08)"}
              strokeWidth={selectedNow ? 2.8 : 1}
              filter={selectedNow ? "url(#cradosGlow)" : undefined}
            >
              <title>{`${n} · ${owned ? owner?.name || "CRADO" : claiming ? `contamination ${owner?.name || ""}` : "libre"} · ${Number(sec.layers || 0)}/${config.rules.layersToOwn} couches`}</title>
            </path>
            <text x={labelPos.x} y={labelPos.y + 3} textAnchor="middle" fill={selectedNow || owned || claiming ? color : "#dce3df"} fontSize="10" fontWeight="900">{n}</text>
            {(owned || claiming) ? <text x={layerPos.x} y={layerPos.y + 2.5} textAnchor="middle" fill={color} fontSize="6.3" fontWeight="900">{Number(sec.layers || 0)}/{config.rules.layersToOwn}</text> : null}
          </g>;
        })}
        {[92, 79, 58, 49].map((r, i) => <circle key={r} cx="130" cy="130" r={r} fill="none" stroke={i === 1 || i === 3 ? "rgba(183,242,71,.19)" : "rgba(255,255,255,.11)"} strokeWidth={i === 1 || i === 3 ? 2 : 1} pointerEvents="none" />)}
        <circle cx="130" cy="130" r="20" fill="rgba(42,105,32,.58)" stroke={`${GREEN}77`} strokeWidth="2" />
        <circle cx="130" cy="130" r="8" fill="#4a9a35" stroke="#b9ff9d" strokeWidth="1.5" />
        <text x="130" y="128" textAnchor="middle" fill="#ddffd0" fontSize="5.8" fontWeight="1000">BULL</text>
        <text x="130" y="136" textAnchor="middle" fill={GREEN} fontSize="5.4" fontWeight="900">DOUCHE</text>
      </svg>
    </div>

    <div className="crados-tactical-board__detail" style={{ borderColor: `${selectedColor}66`, boxShadow: `inset 0 0 28px ${selectedColor}10` }}>
      <div className="crados-tactical-board__sector" style={{ color: selectedColor }}>N° {selectedSector}</div>
      <div className="crados-tactical-board__owner">
        {selectedOwner ? `CRADO · ${selectedOwner.name}` : selectedClaimant ? `EN COURS · ${selectedClaimant.name}` : "SECTEUR LIBRE"}
      </div>
      <div className="crados-tactical-board__layers">
        {Array.from({ length: config.rules.layersToOwn }, (_, i) => <span key={i} style={{ background: i < layerCount ? selectedColor : "rgba(255,255,255,.10)", boxShadow: i < layerCount ? `0 0 7px ${selectedColor}66` : "none" }} />)}
      </div>
      <div className="crados-tactical-board__risk" style={{ color: cost.tone }}>{cost.title}</div>
      <div className="crados-tactical-board__risk-short">{cost.short}</div>
      <div className="crados-tactical-board__costs">{cost.rows.map((row: string) => <span key={row}>{row}</span>)}</div>
      {config.rules.bullWash ? <div className="crados-tactical-board__wash">BULL −1 · DBULL −3</div> : <div className="crados-tactical-board__wash crados-tactical-board__wash--off">BULL neutre</div>}
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

function ActivePlayerCard({ state, activePlayer, activeProfile, activeIsBot, activeBotLevel, currentThrow, color, config, undoCount, onUndo, notice, activeSideId, activeSide, teamMode }: any) {
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const stats = activePlayer ? state.statsByPlayer?.[activePlayer.id] || {} : {};
  return <section className="crados-active" style={{ borderColor: `${color}68`, boxShadow: `0 15px 34px rgba(0,0,0,.34),inset 0 0 44px ${color}0c` }}>
    <div className="crados-active__avatar"><ProfileAvatar profile={activeProfile || activePlayer} size={70} showStars={false} ringColor={color} /></div>
    <div className="crados-active__identity">
      <div className="crados-active__eyebrow" style={{ color }}>{state.phase === "finished" ? "PARTIE TERMINÉE" : teamMode ? `${activeSide?.name || "ÉQUIPE"} · MANCHE ${state.legIndex + 1}` : `À TOI DE CRADOSSIER · MANCHE ${state.legIndex + 1}`}</div>
      <div className="crados-active__name">{activePlayer?.name || "—"}</div>
      <div className="crados-active__meta"><span>{activeIsBot ? `BOT IA · NIV. ${activeBotLevel || config.botLevel}` : "JOUEUR ACTIF"}</span><span>{stats.sectorsClaimed || 0} zones</span><span>{state.legWins?.[activeSideId] || 0} manche(s)</span></div>
      <div className="crados-active__darts">{[0, 1, 2].map((i) => <span key={i} style={currentThrow[i] ? { borderColor: `${color}66`, color } : undefined}>{dartLabel(currentThrow[i])}</span>)}</div>
    </div>
    <div className="crados-active__score">
      <div className="crados-active__score-label">CRASSE{teamMode ? " ÉQUIPE" : ""}</div>
      <strong style={{ color: dirt >= config.rules.dirtLimit * .7 ? RED : color }}>{dirt}<small>/{config.rules.dirtLimit}</small></strong>
      <Meter value={dirt} max={config.rules.dirtLimit} accent={color} dangerAt={.72} height={5} />
    </div>
    <div className="crados-active__actions">
      <InfoDot disableAwenaTakeover size={32} title="Règles CRADOS" color={color} glow={`${color}55`} content={<Rules config={config} />} />
      <button type="button" onClick={onUndo} disabled={!undoCount} style={actionStyle(color, !undoCount)} title="Annuler la dernière volée">↶</button>
    </div>
    {notice ? <div className={`crados-active__notice${notice.includes("éliminé") || notice.includes("CRASSE") ? " is-danger" : notice.includes("🏆") ? " is-win" : ""}`}>{notice}</div> : null}
  </section>;
}

function StatsPanel({ state, activePlayer, activeSideId, activeSideStats, color, preview, config, teamMode }: any) {
  const st = activePlayer ? state.statsByPlayer?.[activePlayer.id] || {} : {};
  const dirt = activeSideId ? Number(state.dirt?.[activeSideId] || 0) : 0;
  const latest = (state.visits || []).slice(-2).reverse();
  const source = teamMode ? activeSideStats || {} : st;
  const kpis = [
    ["CRASSE", `${dirt}/${config.rules.dirtLimit}`],
    ["SECTEURS", source.sectorsClaimed || 0],
    ["VOLS", source.sectorsStolen || 0],
    ["COUCHES", teamMode ? st.layersPlaced || 0 : st.layersPlaced || 0],
    ["LAVÉES", source.dirtWashed || 0],
    ["FLÉCHETTES", st.darts || 0],
  ];
  return <div className="crados-stats-panel">
    <div className="crados-stats-panel__grid">{kpis.map(([label, value]) => <div key={String(label)}><span>{label}</span><b style={{ color }}>{value}</b></div>)}</div>
    <div className="crados-stats-panel__feed">
      {preview?.events?.length ? <div className={`crados-stats-panel__preview${preview.dirtAfter >= config.rules.dirtLimit ? " is-danger" : ""}`}><b>{preview.dirtAfter >= config.rules.dirtLimit ? "⚠ SI TU VALIDES" : "APERÇU VOLÉE"}</b><span>{preview.events.join(" · ")}</span></div> : null}
      {latest.length ? latest.map((visit: any) => <div key={visit.id} className="crados-stats-panel__visit"><b>TOUR {visit.turn}</b><span>{Array.isArray(visit.events) && visit.events.length ? visit.events.join(" · ") : "Aucune contamination"}</span></div>) : <div className="crados-stats-panel__empty">Les premières contaminations apparaîtront ici.</div>}
    </div>
  </div>;
}

function PlayersButton({ state, profiles, profileById, colorByPlayerId, colorBySideId, onClick, teamMode }: any) {
  return <button type="button" className="crados-players-button" onClick={onClick} title="Ouvrir la liste des joueurs" style={{ backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.30),rgba(0,0,0,.72)),url(${tickerCrados})` }}>
    <div className="crados-players-button__label"><span>JOUEURS</span><b>{state.players.length}</b></div>
    <div className="crados-players-button__avatars">
      {state.players.slice(0, 10).map((p: any, i: number) => {
        const prof = profileById.get(String(p.id)) || profiles[i] || p;
        const sideId = cradosSideIdForPlayer(state, p.id);
        const color = teamMode ? colorBySideId.get(String(sideId)) || ACCENT : colorByPlayerId.get(String(p.id)) || ACCENT;
        return <div key={p.id} className={state.activePlayerIndex === i ? "is-active" : ""} style={{ borderColor: color, opacity: state.eliminated[sideId] ? .38 : 1 }}><ProfileAvatar profile={prof} size={31} showStars={false} ringColor={color} /></div>;
      })}
    </div>
    <span className="crados-players-button__open">OUVRIR ▸</span>
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
            <div className="crados-players-modal__identity"><b>{playerName(prof)}</b><span>{dead ? "ÉLIMINÉ" : active ? "JOUE MAINTENANT" : teamMode ? side?.name || "ÉQUIPE" : "EN ATTENTE"}</span><Meter value={dirt} max={config.rules.dirtLimit} accent={color} dangerAt={.72} height={4} /></div>
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
  const [playTab, setPlayTab] = React.useState<PlayTab>("map");
  const [playersOpen, setPlayersOpen] = React.useState(false);
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
    setPlayTab("map");
    setState(createCradosState(players, config));
  }

  const preview = React.useMemo(() => {
    if (!currentThrow.length || state.phase === "finished") return null;
    try {
      const next = playCradosVisit(state, currentThrow.map(uiToGameDart));
      const row = next.visits[next.visits.length - 1];
      const sideId = activePlayer ? cradosSideIdForPlayer(next, activePlayer.id) : "";
      return { events: Array.isArray(row?.events) ? row.events : [], dirtAfter: sideId ? Number(next.dirt?.[sideId] || 0) : 0 };
    } catch { return null; }
  }, [currentThrow, state, activePlayer?.id]);

  if (state.phase === "finished") {
    return <div className="crados-play crados-play--finished">
      <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={4} left={<BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<CradosAwenaButton />} />
      <div className="crados-play__finished-wrap"><ModeEndPanel title={teamMode ? "CRADOS — ÉQUIPES" : "CRADOS"} winner={state.winnerId} profiles={teamMode ? sideProfiles : profiles} legWins={state.legWins} accent={ACCENT} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: "crados", from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "crados", focusMatchId: matchIdRef.current })} onConfig={() => go?.("crados_config")} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{teamMode ? sides.map((side: any) => { const st = sideStats[String(side.id)] || {}; return <div key={side.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${(side.color || ACCENT)}44`, fontSize: 9.5, color: SOFT }}><b style={{ color: side.color || "#fff" }}>{side.name}</b><br />{st.sectorsClaimed || 0} secteurs · {st.sectorsStolen || 0} vols · {st.dirtTaken || 0} crasses · {st.dirtWashed || 0} lavées</div>; }) : profiles.map((p: any) => { const st = state.statsByPlayer[p.id] || {}; return <div key={p.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5, color: SOFT }}><b style={{ color: "#fff" }}>{playerName(p)}</b><br />{st.sectorsClaimed || 0} secteurs · {st.sectorsStolen || 0} vols · {st.dirtTaken || 0} crasses · {st.dirtWashed || 0} lavées</div>; })}</div>} /></div>
    </div>;
  }

  return <div className="crados-play">
    <PageHeader tickerSrc={tickerCrados} tickerAlt="CRADOS" tickerHeight={68} tickerBottomGap={4} tickerFit="cover" left={<BackDot onClick={() => go?.("crados_config")} color={ACCENT} glow={`${ACCENT}88`} />} right={<CradosAwenaButton />} />

    <main className="crados-play__body">
      <TurnStrip state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} dirtLimit={config.rules.dirtLimit} teamMode={teamMode} sideById={sideById} />

      <div className="crados-play__stage">
        <div className="crados-play__left">
          <ActivePlayerCard state={state} activePlayer={activePlayer} activeProfile={activeProfile} activeIsBot={activeIsBot} activeBotLevel={activeBotLevel} currentThrow={currentThrow} color={activeColor} config={config} undoCount={undo.length} onUndo={doUndo} notice={notice} activeSideId={activeSideId} activeSide={activeSide} teamMode={teamMode} />

          <section className="crados-tabs">
            <div className="crados-tabs__nav">
              <button type="button" className={playTab === "map" ? "is-active" : ""} onClick={() => setPlayTab("map")} style={playTab === "map" ? { color: activeColor, borderColor: `${activeColor}66`, background: `${activeColor}10` } : undefined}>◎ CIBLE / ZONES</button>
              <button type="button" className={playTab === "stats" ? "is-active" : ""} onClick={() => setPlayTab("stats")} style={playTab === "stats" ? { color: activeColor, borderColor: `${activeColor}66`, background: `${activeColor}10` } : undefined}>▥ STATS</button>
              <span>{teamMode ? "ÉQUIPES · " : ""}{config.rules.stealMode === "flip" ? "VOL" : "BLOCAGE"}</span>
            </div>
            <div className="crados-tabs__panel">
              {playTab === "map" ? <CradosTacticalBoard state={state} sides={sides} sideById={sideById} colorBySideId={colorBySideId} activeSideId={activeSideId} config={config} selectedSector={selectedSector} onSelect={setSelectedSector} /> : <StatsPanel state={state} activePlayer={activePlayer} activeSideId={activeSideId} activeSideStats={sideStats[String(activeSideId)]} color={activeColor} preview={preview} config={config} teamMode={teamMode} />}
            </div>
          </section>

          <PlayersButton state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} onClick={() => setPlayersOpen(true)} teamMode={teamMode} />
        </div>

        <div className="crados-play__input">
          {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={activeColor} /> : <div className="crados-play__bot-turn" style={{ borderColor: `${activeColor}55`, boxShadow: `inset 0 0 34px ${activeColor}0d` }}><ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={activeColor} /><div><b style={{ color: activeColor }}>{teamMode ? `${activeSide?.name || "Équipe"} · ${activePlayer?.name || "BOT"}` : activePlayer?.name}</b><span>répand sa crasse sur la cible…</span></div><i>🤢</i></div>}
        </div>
      </div>
    </main>

    {playersOpen ? <PlayersModal state={state} profiles={profiles} profileById={profileById} colorByPlayerId={colorByPlayerId} colorBySideId={colorBySideId} config={config} onClose={() => setPlayersOpen(false)} teamMode={teamMode} sideById={sideById} /> : null}
  </div>;
}
