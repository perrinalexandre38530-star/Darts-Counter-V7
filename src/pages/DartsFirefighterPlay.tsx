// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — PLAY / TERRITORIES LAYOUT
// Interface compacte, guidée, carte intégrée, keypad immédiatement accessible.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import { buildTerritoriesMap, getBaseSvgForCountry } from "../territories/map";
import type { TerritoriesCountry } from "../territories/types";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import {
  FIRE_STATUS_OWNER_COLORS,
  activeIncidents,
  buildFireMapForView,
  cloneDartsFirefighterState,
  computeDartsFirefighterMissionGrade,
  createDartsFirefighterState,
  dartLabel,
  difficultyLabel,
  finishReasonLabel,
  fireStatus,
  fireTerritoryColor,
  getActivePlayer,
  playDartsFirefighterVisit,
  normalizeDartsFirefighterConfig,
  protectedCount,
  selectFireTerritory,
  totalFire,
  type DartsFirefighterConfigPayload,
  type DartsFirefighterState,
  type FireTerritory,
} from "../lib/gameEngines/dartsFirefighterEngine";
import { pushDartsFirefighterStats } from "../lib/dartsFirefighterStats";
import { History } from "../lib/history";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";
import DartsFirefighterEnd from "./DartsFirefighterEnd";
import { getCountryFlagSrc, getRegionFlagSrc } from "../lib/geoAssets";
import { getFrenchDepartmentFlagUrl } from "../territories/frDepartmentFlags";
import levelSafe from "../assets/firefighter_levels/safe.png";
import levelProtected1 from "../assets/firefighter_levels/protected1.png";
import levelProtected2 from "../assets/firefighter_levels/protected2.png";
import levelProtected3 from "../assets/firefighter_levels/protected3.png";
import levelSmoke from "../assets/firefighter_levels/smoke.png";
import levelFire1 from "../assets/firefighter_levels/fire1.png";
import levelFire2 from "../assets/firefighter_levels/fire2.png";
import levelCritical from "../assets/firefighter_levels/critical.png";
import "../styles/darts-firefighter-play.css";

export const DARTS_FIREFIGHTER_PLAY_UI_VERSION = "7.1.0-fullmap-territory-panels";

type UiDart = { v: number; mult: 1 | 2 | 3 };

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const RED = "#ff4c55";
const GREEN = "#5ce6a8";
const PLAYER_COLORS = ["#25c9ff", "#ffbf45", "#ff6aa9", "#8d7dff", "#62e9aa", "#ff8a5b", "#d4d8e5", "#66a7ff"];
const FR_DEPARTMENT_TO_REGION: Record<string, string> = {
  "01": "ARA", "03": "ARA", "07": "ARA", "15": "ARA", "26": "ARA", "38": "ARA", "42": "ARA", "43": "ARA", "63": "ARA", "69": "ARA", "73": "ARA", "74": "ARA",
  "21": "BFC", "25": "BFC", "39": "BFC", "58": "BFC", "70": "BFC", "71": "BFC", "89": "BFC", "90": "BFC",
  "22": "BRE", "29": "BRE", "35": "BRE", "56": "BRE",
  "18": "CVL", "28": "CVL", "36": "CVL", "37": "CVL", "41": "CVL", "45": "CVL",
  "2A": "COR", "2B": "COR",
  "08": "GES", "10": "GES", "51": "GES", "52": "GES", "54": "GES", "55": "GES", "57": "GES", "67": "GES", "68": "GES", "88": "GES",
  "02": "HDF", "59": "HDF", "60": "HDF", "62": "HDF", "80": "HDF",
  "75": "IDF", "77": "IDF", "78": "IDF", "91": "IDF", "92": "IDF", "93": "IDF", "94": "IDF", "95": "IDF",
  "14": "NOR", "27": "NOR", "50": "NOR", "61": "NOR", "76": "NOR",
  "16": "NAQ", "17": "NAQ", "19": "NAQ", "23": "NAQ", "24": "NAQ", "33": "NAQ", "40": "NAQ", "47": "NAQ", "64": "NAQ", "79": "NAQ", "86": "NAQ", "87": "NAQ",
  "09": "OCC", "11": "OCC", "12": "OCC", "30": "OCC", "31": "OCC", "32": "OCC", "34": "OCC", "46": "OCC", "48": "OCC", "65": "OCC", "66": "OCC", "81": "OCC", "82": "OCC",
  "44": "PDL", "49": "PDL", "53": "PDL", "72": "PDL", "85": "PDL",
  "04": "PAC", "05": "PAC", "06": "PAC", "13": "PAC", "83": "PAC", "84": "PAC",
  "971": "GP", "972": "MQ", "973": "GF", "974": "RE", "976": "YT",
};

function toCountry(mapId: string): TerritoriesCountry {
  const id = String(mapId || "FR").toUpperCase();
  if (id === "EN") return "UK";
  const supported = new Set(["FR","AF","AR","ASIA","AT","BE","BR","CA","HR","CZ","DK","EG","EU","FI","GR","IS","IN","MX","NL","NA","NO","PL","SA","SAM","KR","SE","CH","UA","UN","IT","DE","ES","US","CN","AU","JP","RU","WORLD","UK"]);
  return (supported.has(id) ? id : "FR") as TerritoriesCountry;
}
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Pompier"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 10, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.27))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }
function actionButton(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}16`, color, fontWeight: 1050, cursor: "pointer" }; }
function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function uiLabel(dart?: UiDart) {
  if (!dart) return "—";
  return dartLabel(uiToGameDart(dart));
}
function statusLabel(t: FireTerritory) {
  if (t.destroyed) return "DÉTRUIT";
  if (t.fireLevel > 0) return `FEU N${t.fireLevel}`;
  if (t.smoke) return "FUMÉE";
  if (t.protection > 0) return `PROTÉGÉ ${t.protection}`;
  return "SAIN";
}
function statusIcon(t: FireTerritory) {
  if (t.destroyed) return "⬛";
  if (t.fireLevel === 3) return "🔥🔥🔥";
  if (t.fireLevel === 2) return "🔥🔥";
  if (t.fireLevel === 1) return "🔥";
  if (t.smoke) return "💨";
  if (t.protection > 0) return "💧";
  return "✓";
}
function normalizeConfig(props: any): DartsFirefighterConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {};
  return normalizeDartsFirefighterConfig(raw);
}

function extractTerritoryFlagCode(country: TerritoriesCountry, territory?: FireTerritory | null) {
  const raw = String(territory?.id || "").toUpperCase();
  if (!raw) return country;
  if (country === "WORLD") {
    const worldCode = raw.replace(/^WORLD-/, "").split("-")[0];
    return worldCode || country;
  }
  if (country === "UK") return "GB";
  const byPrefix = raw.split("-")[0];
  return byPrefix || country;
}

function extractFrRegionCode(territory?: FireTerritory | null) {
  const raw = String(territory?.id || "").toUpperCase();
  const match = /^FR-([0-9]{2,3}|2A|2B)/.exec(raw);
  if (!match) return null;
  return FR_DEPARTMENT_TO_REGION[match[1]] || null;
}

function getMapBadgeAsset(country: TerritoriesCountry, territory?: FireTerritory | null) {
  if (country === "FR") {
    const region = extractFrRegionCode(territory);
    if (region) return getRegionFlagSrc(`FR-${region}`) || getCountryFlagSrc("FR");
    return getCountryFlagSrc("FR");
  }
  return getCountryFlagSrc(extractTerritoryFlagCode(country, territory));
}

function getCountryMapFlag(country: TerritoriesCountry) {
  if (country === "UK") return getCountryFlagSrc("GB");
  if (country === "WORLD") return getCountryFlagSrc("WORLD") || getCountryFlagSrc("UN") || getCountryFlagSrc("EU");
  return getCountryFlagSrc(String(country || "FR").toUpperCase()) || getCountryFlagSrc("FR");
}

function getTerritoryDepartmentVisual(country: TerritoriesCountry, territory?: FireTerritory | null) {
  if (!territory) return null;
  if (country === "FR") return getFrenchDepartmentFlagUrl(territory.id) || null;
  return null;
}

function statusTickerSrc(territory?: FireTerritory | null) {
  if (!territory) return levelSafe;
  if (territory.destroyed || territory.fireLevel >= 3) return levelCritical;
  if (territory.fireLevel === 2) return levelFire2;
  if (territory.fireLevel === 1) return levelFire1;
  if (territory.smoke) return levelSmoke;
  if (territory.protection >= 3) return levelProtected3;
  if (territory.protection === 2) return levelProtected2;
  if (territory.protection === 1) return levelProtected1;
  return levelSafe;
}

type TerritoryShapeGeometry = {
  d: string;
  transform?: string;
  fillRule?: "nonzero" | "evenodd";
  clipRule?: "nonzero" | "evenodd";
};

function getTerritoryShapeGeometry(country: TerritoriesCountry, territoryId: string, svgPathId?: string): TerritoryShapeGeometry | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const raw = getBaseSvgForCountry(country);
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    const paths = Array.from(doc.querySelectorAll("path"));
    const wantedPathId = String(svgPathId || "").trim();
    const wantedTerritoryId = String(territoryId || "").trim();
    const wantedDepartment = wantedTerritoryId.startsWith("FR-") ? wantedTerritoryId.slice(3) : wantedPathId;
    const path = paths.find((candidate) => {
      if (country === "FR") return String(candidate.getAttribute("data-numerodepartement") || "") === wantedDepartment;
      return String(candidate.getAttribute("id") || "") === wantedPathId || String(candidate.getAttribute("id") || "") === wantedTerritoryId;
    });
    const d = path?.getAttribute("d");
    if (!path || !d) return null;
    const normalizeRule = (value: string | null): "nonzero" | "evenodd" | undefined =>
      value === "evenodd" ? "evenodd" : value === "nonzero" ? "nonzero" : undefined;
    return {
      d,
      transform: path.getAttribute("transform") || undefined,
      fillRule: normalizeRule(path.getAttribute("fill-rule")),
      clipRule: normalizeRule(path.getAttribute("clip-rule")),
    };
  } catch {
    return null;
  }
}

function TerritorySilhouetteBadge(props: { country: TerritoriesCountry; territory: FireTerritory; color: string; height?: number; showValue?: boolean; }) {
  const geometry = React.useMemo(() => getTerritoryShapeGeometry(props.country, props.territory.id, props.territory.svgPathId), [props.country, props.territory.id, props.territory.svgPathId]);
  const flagSrc = getTerritoryDepartmentVisual(props.country, props.territory) || getMapBadgeAsset(props.country, props.territory) || undefined;
  const measureRef = React.useRef<SVGPathElement | null>(null);
  const [bounds, setBounds] = React.useState({ x: 0, y: 0, width: 100, height: 100 });
  const [viewBox, setViewBox] = React.useState("0 0 100 100");
  const [center, setCenter] = React.useState({ x: 50, y: 50, fontSize: 34 });
  const clipId = React.useId().replace(/:/g, "");
  const glowId = `${clipId}-glow`;

  React.useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    try {
      const bbox = node.getBBox();
      if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) return;
      const pad = Math.max(bbox.width, bbox.height) * 0.12;
      const x = bbox.x - pad;
      const y = bbox.y - pad;
      const width = bbox.width + pad * 2;
      const height = bbox.height + pad * 2;
      setBounds({ x, y, width, height });
      setViewBox(`${x} ${y} ${width} ${height}`);
      setCenter({ x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2, fontSize: Math.max(12, Math.min(bbox.width, bbox.height) * 0.33) });
    } catch {}
  }, [geometry?.d, geometry?.transform]);

  if (!geometry) {
    return <div className="dff-territory-shape-fallback" style={{ borderColor: `${props.color}50`, boxShadow: `0 0 18px ${props.color}30` }}>{props.showValue === false ? null : props.territory.target}</div>;
  }

  const commonPathProps = { d: geometry.d, transform: geometry.transform, fillRule: geometry.fillRule, clipRule: geometry.clipRule } as const;
  return (
    <svg viewBox={viewBox} role="img" aria-label={`Territoire ${props.territory.name}`} style={{ width: "100%", height: props.height ?? 116, display: "block", overflow: "visible" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path {...commonPathProps} /></clipPath>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path ref={measureRef} {...commonPathProps} fill="transparent" stroke="transparent" />
      {flagSrc ? <image href={flagSrc} x={bounds.x - bounds.width * 0.06} y={bounds.y - bounds.height * 0.06} width={bounds.width * 1.12} height={bounds.height * 1.12} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} style={{ filter: "saturate(1.08) contrast(1.02)" }} /> : <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={props.color} clipPath={`url(#${clipId})`} />}
      <path {...commonPathProps} fill={flagSrc ? "rgba(255,255,255,0.03)" : `${props.color}18`} stroke="rgba(255,255,255,.98)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter={`url(#${glowId})`} />
      {props.showValue === false ? null : <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize={center.fontSize} fontWeight="1000" fill="#fff" stroke="rgba(0,0,0,.84)" strokeWidth={Math.max(1.4, center.fontSize * 0.08)} paintOrder="stroke fill" style={{ filter: `drop-shadow(0 0 7px ${props.color})` }}>{props.territory.target}</text>}
    </svg>
  );
}

function TerritoryInsightBody({ territory, state, country, compact = false }: any) {
  const color = fireTerritoryColor(fireStatus(territory));
  const status = statusLabel(territory);
  const neighbors = territory.neighbors.map((id: string) => state.territories.find((item: FireTerritory) => item.id === id)).filter(Boolean).slice(0, compact ? 6 : 8);
  const adjacentHot = neighbors.filter((neighbor: FireTerritory) => neighbor.fireLevel > 0 || neighbor.smoke).length;
  const threatened = state.forecastTerritoryIds.includes(territory.id) || adjacentHot > 0;
  const stageSrc = statusTickerSrc(territory);
  const recommendedAction = territory.destroyed
    ? "Zone perdue : concentre l’intervention sur les territoires en bordure pour éviter l’embrasement général."
    : territory.fireLevel >= 3
      ? `Urgence absolue : T${territory.target} ou Canadair recommandés pour casser le front de flammes.`
      : territory.fireLevel === 2
        ? `Foyer établi : vise D${territory.target} ou T${territory.target} pour reprendre la main rapidement.`
        : territory.fireLevel === 1 || territory.smoke
          ? `Intervention préventive : S${territory.target} suffit, le surplus servira à créer un pare-feu.`
          : territory.protection > 0
            ? "Zone refroidie : maintiens la protection si les voisins s’enflamment."
            : "Zone saine : un tir de confort peut préparer une ligne de défense.";
  return <div className={`dff-territory-stage ${compact ? "is-compact" : ""}`} style={{ borderColor: `${color}55` }}>
    <img className="dff-territory-stage__bg" src={stageSrc} alt="" aria-hidden />
    <div className="dff-territory-stage__shade" />
    <div className="dff-territory-stage__hero">
      <div className="dff-territory-stage__shape"><TerritorySilhouetteBadge country={country} territory={territory} color={color} showValue /></div>
      <div className="dff-territory-stage__meta">
        <small>TERRITOIRE CIBLÉ</small>
        <strong>{territory.name}</strong>
        <span style={{ color }}>{status}{territory.critical ? " · CRITIQUE" : ""}</span>
        <em>{territory.critical ? "Zone critique à défendre en priorité" : `Zone ${territory.target} du périmètre actif`}</em>
      </div>
    </div>
    <div className={`dff-territory-stage__kpis ${compact ? "is-compact" : ""}`}>
      <MiniKpi icon="fire" label="FEU" value={`${territory.fireLevel}/3`} hint={territory.fireLevel ? "Intensité du foyer" : "Aucun foyer"} color={FIRE} />
      <MiniKpi icon="smoke" label="FUMÉE" value={territory.smoke ? "OUI" : "NON"} hint={territory.smoke ? "Risque imminent" : "Alerte absente"} color="#b8c0cd" />
      <MiniKpi icon="shield" label="PROTECTION" value={`${territory.protection}/3`} hint={territory.protection ? "Pare-feu disponible" : "Aucune défense"} color={WATER} />
      <MiniKpi icon="warning" label="MENACE" value={threatened ? "ÉLEVÉE" : "STABLE"} hint={threatened ? `${adjacentHot} voisin${adjacentHot > 1 ? "s" : ""} sous tension` : "Aucun front proche"} color={GOLD} />
      <MiniKpi icon="map" label="ADJACENTS" value={neighbors.length} hint={neighbors.length ? "Territoires au contact" : "Zone isolée"} color={GREEN} />
    </div>
    <div className="dff-territory-advice dff-territory-advice--overlay" style={{ borderColor: `${color}45`, background: `${color}0f` }}><OutlineIcon name={territory.fireLevel > 0 ? "fire" : territory.protection > 0 ? "shield" : "target"} size={20} /><div><b>PRIORITÉ TACTIQUE</b><span>{recommendedAction}</span></div></div>
    {neighbors.length ? <div className="dff-neighbors dff-neighbors--detailed"><b>ZONES ADJACENTES EN CONTACT DIRECT</b><div>{neighbors.map((neighbor: FireTerritory) => <span key={neighbor.id} style={{ borderColor: `${fireTerritoryColor(fireStatus(neighbor))}55` }}>{neighbor.name}</span>)}</div></div> : null}
  </div>;
}

function Rules({ config }: { config: DartsFirefighterConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: FIRE }}>OBJECTIF</strong><br />{config.objective === "survival" ? `Résiste pendant ${config.maxRounds} rounds.` : config.objective === "protect_critical" ? `Protège les zones critiques pendant ${config.maxRounds} rounds.` : "Éteins tous les foyers avant la limite."}</div>
    <div><strong style={{ color: WATER }}>PUISSANCE</strong><br />Simple 1 · Double 2 · Triple 3. Le surplus crée une protection qui absorbe une future propagation.</div>
    <div><strong style={{ color: GOLD }}>CIBLES</strong><br />Chaque territoire actif porte un numéro de secteur. Une touche agit automatiquement sur le territoire correspondant.</div>
    <div><strong style={{ color: WATER }}>BULL</strong><br />{`Bull = ${config.bullPower || 2} unités sur ${config.bullTargetMode === "priority" ? "la priorité automatique" : "la zone sélectionnée"}. ${config.bullAirSupport ? "Le Double Bull appelle le Canadair." : "Canadair désactivé."}`}</div>
    <div><strong style={{ color: FIRE }}>VENT</strong><br />{config.windEnabled ? `Vent ${config.windStrength || "normal"}, changement tous les ${config.windChangeEvery || 3} cycles.` : "Vent désactivé."}</div>
  </div>;
}

function buildBotVisit(state: DartsFirefighterState, level: string): { darts: UiDart[]; selectedId: string | null } {
  const targets = [...state.territories].filter((t) => t.playable && !t.destroyed)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection);
  const target = targets[0] || null;
  const missChance = level === "hard" ? .04 : level === "easy" ? .25 : .11;
  const bullChance = level === "hard" ? .18 : level === "easy" ? .04 : .10;
  const darts: UiDart[] = [];
  const dartsPerTurn = Math.max(1, Math.min(3, Number(state.config.dartsPerTurn || 3)));
  for (let i = 0; i < dartsPerTurn; i += 1) {
    const r = Math.random();
    if (r < missChance) darts.push({ v: 0, mult: 1 });
    else if (r < missChance + bullChance) darts.push({ v: 25, mult: level === "hard" && Math.random() > .48 ? 2 : 1 });
    else {
      const multiplier = level === "hard" ? (Math.random() < .55 ? 3 : 2) : level === "easy" ? (Math.random() < .78 ? 1 : 2) : (Math.random() < .34 ? 3 : Math.random() < .55 ? 2 : 1);
      darts.push({ v: target?.target || (1 + Math.floor(Math.random() * 20)), mult: multiplier as any });
    }
  }
  return { darts, selectedId: target?.id || null };
}


type TacticalSuggestion = {
  territory: FireTerritory;
  shot: string;
  power: number;
  action: string;
  reason: string;
  color: string;
  kind: "direct" | "bull" | "canadair";
};

type TacticalPlan = {
  primary: TacticalSuggestion | null;
  alternatives: TacticalSuggestion[];
  clusterCount: number;
};

function directShotForTerritory(territory: FireTerritory, forecasted: boolean): TacticalSuggestion {
  const requiredPower = territory.fireLevel > 0 || territory.smoke
    ? Math.min(3, Math.max(1, Number(territory.fireLevel || 0) + (territory.smoke ? 1 : 0)))
    : Math.max(1, 3 - Number(territory.protection || 0));
  const bed = requiredPower >= 3 ? "T" : requiredPower === 2 ? "D" : "S";
  const shot = `${bed}${territory.target}`;
  let action = "Créer un pare-feu";
  if (territory.smoke && territory.fireLevel > 0) action = "Dissiper la fumée et réduire le feu";
  else if (territory.smoke) action = "Dissiper la fumée";
  else if (territory.fireLevel === 3) action = "Frapper le foyer principal";
  else if (territory.fireLevel === 2) action = "Éteindre le foyer actif";
  else if (territory.fireLevel === 1) action = "Éteindre le départ de feu";
  else if (forecasted) action = "Bloquer la prochaine propagation";
  const reasonBits = [
    territory.critical ? "ZONE CRITIQUE" : "",
    territory.fireLevel ? `FEU N${territory.fireLevel}` : "",
    territory.smoke ? "FUMÉE" : "",
    forecasted ? "MENACÉE" : "",
  ].filter(Boolean);
  return {
    territory,
    shot,
    power: requiredPower,
    action,
    reason: reasonBits.join(" · ") || `PROTECTION ${territory.protection}/3`,
    color: fireTerritoryColor(fireStatus(territory)),
    kind: "direct",
  };
}

function buildTacticalPlan(state: DartsFirefighterState, config: DartsFirefighterConfigPayload): TacticalPlan {
  const playable = state.territories.filter((territory) => territory.playable && !territory.destroyed);
  if (!playable.length) return { primary: null, alternatives: [], clusterCount: 0 };
  const forecast = new Set(state.forecastTerritoryIds || []);
  const objectiveProtect = config.objective === "protect_critical";
  const ranked = [...playable].sort((a, b) => {
    const score = (territory: FireTerritory) =>
      Number(territory.fireLevel || 0) * 130
      + Number(territory.smoke) * 54
      + Number(territory.critical) * (objectiveProtect ? 155 : 90)
      + Number(forecast.has(territory.id)) * 78
      + Math.max(0, 3 - Number(territory.protection || 0)) * (territory.critical ? 13 : 5)
      - Number(territory.protection || 0) * 2;
    return score(b) - score(a) || Number(b.critical) - Number(a.critical) || Number(b.fireLevel) - Number(a.fireLevel);
  });
  const danger = ranked.find((territory) => territory.fireLevel > 0 || territory.smoke)
    || ranked.find((territory) => forecast.has(territory.id))
    || ranked.find((territory) => territory.critical)
    || ranked[0];
  const incidentIds = new Set(playable.filter((territory) => territory.fireLevel > 0 || territory.smoke).map((territory) => territory.id));
  const clusterCount = danger
    ? [danger.id, ...(danger.neighbors || [])].filter((id) => incidentIds.has(id)).length
    : 0;
  const gaugeCost = Math.max(0, Number(config.canadairGaugeCost ?? 35));
  const canadairReady = config.bullAirSupport !== false
    && (!config.canadairRequiresGauge || Number(state.brigadeGauge || 0) >= gaugeCost);
  const directPrimary = directShotForTerritory(danger, forecast.has(danger.id));
  const primary: TacticalSuggestion = canadairReady && clusterCount >= 3
    ? {
        territory: danger,
        shot: "DBULL",
        power: 3,
        action: `Déclencher le Canadair sur ${danger.name}`,
        reason: `${clusterCount} foyers groupés · jauge ${Math.round(state.brigadeGauge)}%`,
        color: WATER,
        kind: "canadair",
      }
    : directPrimary;
  const alternatives = ranked
    .filter((territory) => territory.id !== danger.id && (territory.fireLevel > 0 || territory.smoke || forecast.has(territory.id) || territory.critical))
    .slice(0, 2)
    .map((territory) => directShotForTerritory(territory, forecast.has(territory.id)));
  if (primary.kind === "canadair") alternatives.unshift(directPrimary);
  return { primary, alternatives: alternatives.slice(0, 3), clusterCount };
}

export default function DartsFirefighterPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || WATER;
  const text = theme?.text || "#f7f8fb";
  const soft = theme?.textSoft || "#a6adbd";
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

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
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Pompier ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null, dartSetId: config.playerDartSets?.[String(profile.id)] ?? profile?.dartSetId ?? null, isBot: isBot(profile, botIds) })), [profiles, botIds]);
  const profilesById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const rawMap = React.useMemo(() => buildTerritoriesMap(toCountry(config.mapId)), [config.mapId]);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const resumeState = resumeRecord?.payload?.stateSnapshot || resumeRecord?.resume?.state || resumeRecord?.payload?.resume?.state || null;
  const initialState = React.useMemo(() => {
    if (resumeState && typeof resumeState === "object" && Array.isArray(resumeState.territories) && Array.isArray(resumeState.players)) {
      try { return cloneDartsFirefighterState({ ...resumeState, config: { ...config, ...(resumeState.config || {}) }, finished: false, finishedAt: null }); } catch {}
    }
    const created = createDartsFirefighterState(players, config, rawMap);
    // Aucun territoire n’est présélectionné : la carte reste neutre tant que le joueur
    // ne choisit pas une zone ou ne saisit pas un secteur au keypad.
    created.selectedTerritoryId = null;
    return created;
  }, [rawMap]);

  const [state, setState] = React.useState<DartsFirefighterState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<DartsFirefighterState[]>([]);
  const [notice, setNotice] = React.useState("Sélectionne une zone pour préparer un Bull ou un Canadair.");
  const [showEnd, setShowEnd] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [showTargets, setShowTargets] = React.useState(false);
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [showObjective, setShowObjective] = React.useState(false);
  const [showTerritory, setShowTerritory] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `darts-firefighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  React.useEffect(() => {
    try {
      document.documentElement.dataset.dartsFirefighterPlay = DARTS_FIREFIGHTER_PLAY_UI_VERSION;
      console.info(`[DARTS FIREFIGHTER] PLAY UI ${DARTS_FIREFIGHTER_PLAY_UI_VERSION}`);
    } catch {}
    return () => {
      try { delete document.documentElement.dataset.dartsFirefighterPlay; } catch {}
    };
  }, []);

  const activePlayer = getActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const selectedTerritory = state.territories.find((t) => t.id === state.selectedTerritoryId) || null;
  const fireMap = React.useMemo(() => buildFireMapForView(state), [state]);
  const incidents = activeIncidents(state);
  const fireLoad = totalFire(state);
  const protections = protectedCount(state);
  const latestVisit = state.history[state.history.length - 1];
  const currentStats = state.playerStats[activePlayer?.id] || {};
  const projectedLabels = throwDarts.map(uiLabel);
  const forecastTerritories = config.forecastEnabled
    ? state.forecastTerritoryIds.map((id) => state.territories.find((territory) => territory.id === id)).filter(Boolean)
    : [];

  function backToConfig() {
    if (typeof go === "function") go("darts_firefighter_config", config);
  }
  function selectTerritory(id: string) {
    if (state.finished) return;
    const same = String(state.selectedTerritoryId || "") === String(id || "");
    const nextId = same ? null : id;
    const territory = state.territories.find((zone) => zone.id === id) || null;
    setState((prev) => selectFireTerritory(prev, nextId));
    if (same) setNotice("Cible Bull / Canadair désélectionnée.");
    else if (territory) setNotice(`${territory.name} · secteur ${territory.target} · ${statusLabel(territory)}`);
  }
  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.finished || throwDarts.length >= Number(config.dartsPerTurn || 3)) return;
    const dart = { v: Number(v) || 0, mult: (mult || multiplier) as 1 | 2 | 3 };

    // Un chiffre agit toujours sur le territoire portant ce secteur. La sélection de
    // carte ne bloque jamais le keypad : elle suit simplement le dernier secteur saisi
    // pour garder l’interface compréhensible. Elle ne sert directement qu’au Bull/DBull.
    if (dart.v >= 1 && dart.v <= 20) {
      const matching = state.territories.find((territory) => territory.playable && !territory.destroyed && territory.target === dart.v) || null;
      if (matching && matching.id !== state.selectedTerritoryId) {
        setState((prev) => selectFireTerritory(prev, matching.id));
        setNotice(`${uiLabel(dart)} agit sur ${matching.name} · ${statusLabel(matching)}`);
      } else if (!matching && state.selectedTerritoryId) {
        setState((prev) => selectFireTerritory(prev, null));
        setNotice(`${uiLabel(dart)} ne correspond à aucun territoire actif.`);
      }
    }

    const next = [...throwDarts, dart].slice(0, Number(config.dartsPerTurn || 3));
    setThrowDarts(next);
    if (dart.v === 0 && config.missEndsTurn) window.setTimeout(() => commitVisit(next), 0);
  }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, Number(config.dartsPerTurn || 3));
    if (!darts.length || state.finished) return;
    setUndoStack((prev) => [...prev.slice(-19), cloneDartsFirefighterState(state)]);
    const next = playDartsFirefighterVisit(state, darts.map(uiToGameDart));
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    const visit = next.history[next.history.length - 1];
    const important = [...(visit?.events || [])].reverse().find((event: any) => ["extinguished","destroyed","spread_blocked","canadair","spread"].includes(event.type));
    setNotice(important?.label || `Volée validée · ${visit?.score >= 0 ? "+" : ""}${visit?.score || 0} pts`);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    setShowEnd(false);
    autoSavedRef.current = "";
    setNotice("Dernière volée annulée.");
  }
  function resetMatch() {
    matchIdRef.current = `darts-firefighter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
    const fresh = createDartsFirefighterState(players, config, rawMap);
    fresh.selectedTerritoryId = null;
    setState(fresh);
    setThrowDarts([]);
    setUndoStack([]);
    setShowEnd(false);
    setNotice("Nouvelle intervention engagée.");
  }

  React.useEffect(() => {
    if (!activePlayer || !isBot(activeProfile, botIds) || state.finished || botThinking || throwDarts.length) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const plan = buildBotVisit(state, config.botLevel || "normal");
      let prepared = state;
      if (plan.selectedId) prepared = selectFireTerritory(prepared, plan.selectedId);
      setUndoStack((prev) => [...prev.slice(-19), cloneDartsFirefighterState(state)]);
      const next = playDartsFirefighterVisit(prepared, plan.darts.map(uiToGameDart));
      setState(next);
      const visit = next.history[next.history.length - 1];
      setNotice(`BOT ${activePlayer.name} · ${visit?.labels?.join(" / ")} · ${visit?.score >= 0 ? "+" : ""}${visit?.score || 0}`);
      setBotThinking(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.turnIndex, state.finished, activePlayer?.id]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const recordStatus = statusOverride || (state.finished ? "finished" : "in_progress");
    const isFinished = recordStatus === "finished";
    const now = isFinished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.playerStats[player.id] || {};
      const visits = state.history.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart: GameDart, dartIndex: number) => ({ ...dart, label: visit.labels[dartIndex], visitId: visit.id, round: visit.round, dartIndex: dartIndex + 1 })));
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        win: isFinished && state.won, winner: isFinished && state.won, rank: index + 1,
        ...stats,
        accuracy: pct(stats.hits, stats.darts),
        visitsHistory: visits, visitHistory: visits, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) },
      };
    });
    [...playerRows].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).forEach((row, index) => { row.rank = index + 1; });
    const totalDarts = playerRows.reduce((sum, row) => sum + Number(row.darts || 0), 0);
    const totalHits = playerRows.reduce((sum, row) => sum + Number(row.hits || 0), 0);
    const totalScore = Number(state.score || 0);
    const canadairs = state.history.flatMap((visit) => visit.events || []).filter((event) => event.type === "canadair").length;
    const missionGrade = isFinished ? computeDartsFirefighterMissionGrade(state) : null;
    const matchStats = {
      statisticsVersion: 2, telemetryVersion: 2,
      score: totalScore,
      durationMs: Math.max(0, now - state.startedAt),
      totalDarts, totalHits, accuracy: pct(totalHits, totalDarts),
      totalVisits: state.history.length,
      totalFireReduced: playerRows.reduce((sum, row) => sum + Number(row.fireReduced || 0), 0),
      totalExtinguished: state.totalExtinguished,
      totalDestroyed: state.totalDestroyed,
      totalSpread: state.totalSpread,
      propagationBlocked: state.propagationBlocked,
      protectionsPlaced: playerRows.reduce((sum, row) => sum + Number(row.protectionsPlaced || 0), 0),
      waterApplied: playerRows.reduce((sum, row) => sum + Number(row.waterApplied || 0), 0),
      canadairs,
      bulls: playerRows.reduce((sum, row) => sum + Number(row.bulls || 0), 0),
      dbulls: playerRows.reduce((sum, row) => sum + Number(row.dbulls || 0), 0),
      misses: playerRows.reduce((sum, row) => sum + Number(row.misses || 0), 0),
      perfectVisits: playerRows.reduce((sum, row) => sum + Number(row.perfectVisits || 0), 0),
      earlyValidatedVisits: playerRows.reduce((sum, row) => sum + Number(row.earlyValidatedVisits || 0), 0),
      dartsSaved: playerRows.reduce((sum, row) => sum + Number(row.dartsSaved || 0), 0),
      oneDartVisits: playerRows.reduce((sum, row) => sum + Number(row.oneDartVisits || 0), 0),
      twoDartVisits: playerRows.reduce((sum, row) => sum + Number(row.twoDartVisits || 0), 0),
      threeDartVisits: playerRows.reduce((sum, row) => sum + Number(row.threeDartVisits || 0), 0),
      missionGrade: missionGrade?.grade || null,
      missionRating: missionGrade?.rating || 0,
      bestVisitScore: Math.max(0, ...playerRows.map((row) => Number(row.bestVisitScore || 0))),
      roundsPlayed: Math.max(1, state.roundIndex || 1),
      activeTerritories: config.activeTerritories,
      objective: config.objective,
      missionPreset: config.missionPreset,
      dartsPerTurn: config.dartsPerTurn,
      propagationTiming: config.propagationTiming,
      windStrength: config.windStrength,
      destructionLimit: config.destructionLimit,
      incidentsRemaining: activeIncidents(state),
      protectedTerritories: protectedCount(state),
    };
    const finalTerritories = state.territories.filter((t) => t.playable).map((t) => ({ id: t.id, name: t.name, target: t.target, critical: t.critical, fireLevel: t.fireLevel, smoke: t.smoke, protection: t.protection, destroyed: t.destroyed, status: fireStatus(t), neighbors: t.neighbors }));
    const summary = {
      kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts", finished: isFinished,
      statisticsVersion: 2, telemetryVersion: 2,
      won: isFinished && state.won, winnerId: isFinished && state.won ? state.players[0]?.id || null : null,
      winnerIds: isFinished && state.won ? state.players.map((player) => String(player.id)) : [],
      winnerName: isFinished ? (state.won ? "BRIGADE D’INTERVENTION" : "INCENDIE") : null,
      score: totalScore, mapId: config.mapId, difficulty: config.difficulty,
      missionPreset: config.missionPreset, objective: config.objective,
      activeTerritories: config.activeTerritories, initialFires: config.initialFires, initialSmoke: config.initialSmoke, initialFireLevel: config.initialFireLevel, criticalTerritories: config.criticalTerritories,
      propagationTiming: config.propagationTiming, windStrength: config.windStrength, dartsPerTurn: config.dartsPerTurn, targetOrder: config.targetOrder,
      roundsPlayed: matchStats.roundsPlayed, durationMs: matchStats.durationMs,
      finishReason: state.finishReason, totalExtinguished: state.totalExtinguished, totalDestroyed: state.totalDestroyed,
      totalSpread: state.totalSpread, propagationBlocked: state.propagationBlocked,
      missionGrade: missionGrade?.grade || null, missionRating: missionGrade?.rating || 0,
      dartsSaved: matchStats.dartsSaved, earlyValidatedVisits: matchStats.earlyValidatedVisits,
      players: playerRows, perPlayer: playerRows, rankings: isFinished ? [...playerRows].sort((a, b) => b.score - a.score) : [],
      matchStats, finalTerritories, visits: state.history,
      scoreLine: `${isFinished ? (state.won ? "VICTOIRE" : "DÉFAITE") : "EN COURS"}${missionGrade ? ` · GRADE ${missionGrade.grade}` : ""} · ${totalScore} pts · ${state.totalExtinguished} feux éteints · ${state.totalDestroyed} zones perdues`,
      game: { mode: "darts_firefighter", mapId: config.mapId, difficulty: config.difficulty },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current,
      kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts", status: recordStatus,
      statisticsVersion: 2, telemetryVersion: 2,
      createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now,
      ...(isFinished ? { finishedAt: now, endedAt: now } : {}),
      winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName, players: playerRows,
      resumeId: matchIdRef.current,
      resume: { config, state: cloneDartsFirefighterState(state), updatedAt: now },
      game: summary.game, summary,
      payload: {
        kind: "darts_firefighter", mode: "darts_firefighter", sport: "darts",
        statisticsVersion: 2, telemetryVersion: 2, won: state.won, finishReason: state.finishReason,
        config, players: playerRows, summary, visits: state.history, visitHistory: state.history,
        stateSnapshot: cloneDartsFirefighterState(state),
        finalTerritories,
        state: { score: state.score, roundIndex: state.roundIndex, turnIndex: state.turnIndex, combo: state.combo, brigadeGauge: state.brigadeGauge, windOffset: state.windOffset, windLabel: state.windLabel, totalExtinguished: state.totalExtinguished, totalDestroyed: state.totalDestroyed, totalSpread: state.totalSpread, propagationBlocked: state.propagationBlocked, finishReason: state.finishReason },
        stats: { sport: "darts", mode: "darts_firefighter", players: playerRows, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => {
    if (state.finished || state.history.length === 0) return;
    const timer = window.setTimeout(() => {
      try {
        void (History as any).upsert(buildHistoryRecord("in_progress"));
        window.dispatchEvent(new Event("dc-history-updated"));
      } catch {}
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.turnIndex, state.roundIndex, state.score, state.finished]);

  React.useEffect(() => {
    if (!state.finished) return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    const record = buildHistoryRecord("finished");
    try { pushDartsFirefighterStats(record); } catch {}
    try { onFinish?.(record, { navigate: false }); } catch {}
  }, [state.finished]);

  const tacticalPlan = React.useMemo(() => buildTacticalPlan(state, config), [state, config]);
  const primarySuggestion = tacticalPlan.primary;
  const focusTerritory = selectedTerritory || primarySuggestion?.territory || null;
  const mapLabel = String((rawMap as any)?.name || (rawMap as any)?.label || config.mapId || "Carte");



  const currentWater = throwDarts.reduce((sum, dart) => sum + (dart.v === 0 ? 0 : dart.v === 25 ? (dart.mult === 2 ? 3 : 2) : dart.mult), 0);
  const maxDartsThisVisit = Math.max(1, Math.min(3, Number(config.dartsPerTurn || 3)));
  const canValidateVisit = throwDarts.length > 0 && !botThinking && !state.finished;
  const validateVisitLabel = throwDarts.length > 0 ? `VALIDER ${throwDarts.length}/${maxDartsThisVisit}` : "VALIDER";
  const centerScore = <div className="dff-play__water-score"><strong>💧{currentWater}</strong><small>{throwDarts.length}/{maxDartsThisVisit}</small></div>;
  const suggestions = [primarySuggestion, ...(tacticalPlan.alternatives || [])].filter(Boolean).slice(0, Math.max(1, Number(config.dartsPerTurn || 3)));

  return <div className="dff-play" data-firefighter-play-version={DARTS_FIREFIGHTER_PLAY_UI_VERSION} style={{ minHeight: "100dvh", color: text, background: `radial-gradient(circle at 50% -6%,${FIRE}22 0,${theme?.bg || "#080a11"} 42%,#020305 100%)`, paddingBottom: "calc(8px + env(safe-area-inset-bottom))", overflowX: "hidden" }}>
    <PageHeader
      tickerSrc={tickerFirefighter}
      tickerAlt="DARTS FIREFIGHTER"
      tickerHeight={68}
      tickerBottomGap={24}
      tickerFit="cover"
      left={<div style={{ marginLeft: 4 }}><BackDot onClick={backToConfig} color={FIRE} glow={`${FIRE}88`} title="Retour configuration" /></div>}
      right={<div style={{ marginRight: 4 }}><InfoDot title="Règles DARTS FIREFIGHTER" color={WATER} glow={`${WATER}88`} content={<Rules config={config} />} /></div>}
    />

    {state.players.length > 1 ? <FirefighterTurnCarousel players={state.players} activePlayerId={activePlayer?.id} profilesById={profilesById} playerStats={state.playerStats} /> : null}

    <main className="dff-play__main">
      <section className="dff-play__player" style={{ borderColor: `${activeColor}66` }}>
        <div className="dff-play__player-top">
          <div className="dff-play__avatar-wrap"><ProfileAvatar profile={activeProfile as any} size={78} ringColor={activeColor} showStars={false} /></div>
          <div className="dff-play__identity">
            <div className="dff-play__eyebrow" style={{ color: botThinking ? WATER : activeColor }}>{botThinking ? "BOT EN INTERVENTION" : "POMPIER ACTIF"}</div>
            <div className="dff-play__player-name" style={{ color: activeColor }}>{playerName(activeProfile)}</div>
            <div className="dff-play__score">{state.score}</div>
            <div className="dff-play__score-caption">SCORE BRIGADE · COMBO x{config.comboEnabled === false ? "1.00" : (1 + Math.min(.75, state.combo * .05)).toFixed(2)}</div>
          </div>
          <button type="button" className="dff-play__stats-summary" onClick={() => setShowStats(true)} aria-label="Ouvrir les statistiques de la mission">
            <HeaderMiniStat label="ROUND" value={`${Math.min(config.maxRounds, state.roundIndex + 1)}/${config.maxRounds}`} color={FIRE} />
            <HeaderMiniStat label="FEUX" value={incidents} color="#ff9c32" />
            <HeaderMiniStat label="PRESSION" value={`${Math.round(state.brigadeGauge)}%`} color={WATER} />
            <HeaderMiniStat label="PERDUS" value={state.totalDestroyed} color={RED} />
          </button>
        </div>
        <div className="dff-play__suggestions" aria-label="Suggestions de tir">
          {suggestions.length ? suggestions.map((suggestion: TacticalSuggestion, index: number) => { const territoryColor = fireTerritoryColor(fireStatus(suggestion.territory)); return <button key={`${suggestion.territory.id}-${suggestion.shot}-${index}`} type="button" className={`dff-play__suggestion ${index === 0 ? "is-primary" : ""}`} onClick={() => selectTerritory(suggestion.territory.id)} style={{ borderColor: `${territoryColor}66`, color: territoryColor, boxShadow: index === 0 ? `0 0 13px ${territoryColor}28` : "none", background: `linear-gradient(180deg, ${territoryColor}18, rgba(0,0,0,.28))` }} title={`${suggestion.action} · ${suggestion.territory.name}`}><span>{suggestion.territory.target}</span></button>; }) : <span className="dff-play__suggestion-empty">AUCUNE PRIORITÉ</span>}
        </div>
        <div className="dff-play__status-line">
          <span>{config.windEnabled ? state.windLabel : "VENT COUPÉ"}</span><span>CHARGE {fireLoad.toFixed(1)}</span><span>{protections} PROTÉGÉ{protections > 1 ? "S" : ""}</span>
        </div>
      </section>

      <section className="dff-play__cards">
        <CompactInfoCard title="OBJECTIF" value={primarySuggestion?.territory?.target || "—"} subtitle={primarySuggestion?.action || "Analyse en cours"} color={primarySuggestion?.territory ? fireTerritoryColor(fireStatus(primarySuggestion.territory)) : (primarySuggestion?.color || WATER)} onClick={() => setShowObjective(true)} />
        <CompactInfoCard title="TERRITOIRE" value={focusTerritory?.name || "AUCUN"} subtitle={focusTerritory ? `Secteur ${focusTerritory.target} · ${statusLabel(focusTerritory)}${focusTerritory.critical ? " · ZONE CRITIQUE" : ""}` : "Touchez une suggestion ou la carte"} color={focusTerritory ? fireTerritoryColor(fireStatus(focusTerritory)) : activeColor} backgroundSrc={getTerritoryDepartmentVisual(toCountry(config.mapId), focusTerritory) || undefined} valueClassName="is-territory" onClick={() => setShowTerritory(true)} />
        <FirefighterMapCard country={toCountry(config.mapId)} mapLabel={mapLabel} territory={focusTerritory} onClick={() => setShowMap(true)} />
      </section>

      <section className="dff-play__utility">
        <div className={`dff-play__notice ${String(notice || "").toUpperCase().includes("DÉTRUIT") || String(notice || "").toUpperCase().includes("PROPAG") ? "is-danger" : ""}`}>{notice}</div>
        <OutlineActionButton name="target" label="Cibles" color={GOLD} onClick={() => setShowTargets(true)} />
        <OutlineActionButton name="journal" label="Journal" color={WATER} onClick={() => setShowTimeline(true)} />
        <OutlineActionButton name="stats" label="Stats" color={GREEN} onClick={() => setShowStats(true)} />
      </section>

      <section className="dff-play__input">
        <ScoreInputHub
          currentThrow={throwDarts as any}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onCancel={cancelOrUndo}
          onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))}
          onNumber={(number) => addDart(number)}
          onBull={() => addDart(25)}
          onValidate={() => commitVisit()}
          onDirectDart={(dart: any) => addDart(Number(dart?.v || 0), Number(dart?.mult || 1) as 1 | 2 | 3)}
          onSetVisitDarts={(darts: any[]) => setThrowDarts((Array.isArray(darts) ? darts : []).slice(0, Number(config.dartsPerTurn || 3)) as UiDart[])}
          preferredMethod={config.scoreInputMethod === "dartboard" ? "dartboard" : "keypad"}
          enablePresets={false}
          centerSlot={centerScore}
          validateLabel={validateVisitLabel}
          validateDisabled={!canValidateVisit}
          disabled={botThinking || state.finished}
          switcherMode="hidden"
          hideSwitcher
          showPlaceholders={false}
          lockContentHeight
          fitToParent
        />
      </section>
    </main>

    {showObjective ? <ObjectiveModal primary={primarySuggestion} alternatives={tacticalPlan.alternatives} config={config} onSelect={(id: string) => { selectTerritory(id); setShowObjective(false); }} onClose={() => setShowObjective(false)} /> : null}
    {showTerritory ? <TerritoryModal territory={focusTerritory} state={state} country={country} onOpenMap={() => { setShowTerritory(false); setShowMap(true); }} onClear={() => { if (state.selectedTerritoryId) selectTerritory(state.selectedTerritoryId); }} onClose={() => setShowTerritory(false)} /> : null}
    {showMap ? <FirefighterMapModal state={state} country={toCountry(config.mapId)} map={fireMap} mapLabel={mapLabel} profilesById={profilesById} activePlayerId={activePlayer?.id} onClose={() => setShowMap(false)} onSelect={selectTerritory} /> : null}
    {showTargets ? <TargetsModal state={state} onClose={() => setShowTargets(false)} onSelect={selectTerritory} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showStats ? <StatsModal state={state} currentStats={currentStats} activeProfile={activeProfile} config={config} onClose={() => setShowStats(false)} /> : null}
    {showEnd && state.finished ? <DartsFirefighterEnd state={state} profilesById={profilesById} onReplay={resetMatch} onStats={() => go?.("statsHub", { initialStatsSubTab: "darts_firefighter" })} onHistory={() => go?.("history")} onClose={() => go?.("games")} /> : null}
  </div>;
}

function FirefighterTurnCarousel({ players, activePlayerId, profilesById, playerStats }: any) {
  return <div className="dff-play__turns" aria-label="Ordre de passage">
    {(players || []).map((player: any, index: number) => {
      const active = String(player?.id) === String(activePlayerId);
      const profile = profilesById?.get?.(String(player?.id)) || player;
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      const stats = playerStats?.[player?.id] || {};
      return <div key={String(player?.id || index)} className={`dff-play__turn ${active ? "is-active" : ""}`} style={{ borderColor: active ? color : "rgba(255,255,255,.10)", boxShadow: active ? `0 0 14px ${color}45` : "none" }}>
        <ProfileAvatar profile={profile} size={27} ringColor={color} showStars={false} noFrame />
        <div className="dff-play__turn-copy"><div style={{ color: active ? color : "#c4cad4" }}>{playerName(profile)}</div><small>{Number(stats.fireReduced || 0)} eau · {Number(stats.firesExtinguished || 0)} feux</small></div>
        {active ? <span className="dff-play__turn-arrow" style={{ color }}>›</span> : null}
      </div>;
    })}
  </div>;
}

function HeaderMiniStat({ label, value, color }: any) {
  return <div className="dff-play__mini-stat" style={{ borderColor: `${color}35`, background: `${color}0d` }}><div>{label}</div><strong style={{ color }}>{value}</strong></div>;
}

function CompactInfoCard({ title, value, subtitle, color, onClick, backgroundSrc, badgeSrc, valueClassName = "" }: any) {
  const compactValue = title === "OBJECTIF" && String(value || "").trim() !== "—";
  const hasVisualBackground = Boolean(backgroundSrc);
  return <button className={`dff-play__info-card ${hasVisualBackground ? "has-visual-background" : ""}`} type="button" onClick={onClick} style={{ borderColor: `${color}58`, background: `radial-gradient(circle at 50% 130%,${color}1d,rgba(3,5,10,.97) 68%)` }}>
    {backgroundSrc ? <img src={backgroundSrc} alt="" aria-hidden className="dff-play__info-background" /> : null}
    <div className="dff-play__info-shade" />
    <span className="dff-play__info-title" style={{ color }}>{title}</span>
    {badgeSrc ? <span className="dff-play__info-badge"><img src={badgeSrc} alt="" aria-hidden /></span> : null}
    <strong className={`dff-play__info-value ${valueClassName}`.trim()} style={{ color: compactValue ? color : (title === "OBJECTIF" ? GOLD : "#fff"), fontSize: compactValue ? 26 : undefined }}>{value}</strong>
    <span className="dff-play__info-subtitle">{subtitle}</span>
  </button>;
}

function FirefighterMapCard({ country, mapLabel, territory, onClick }: any) {
  const countryFlag = getCountryMapFlag(country);
  const territoryColor = territory ? fireTerritoryColor(fireStatus(territory)) : FIRE;
  return <button className="dff-play__info-card dff-play__map-card" type="button" onClick={onClick} style={{ borderColor: `${territoryColor}58` }}>
    {countryFlag ? <img src={countryFlag} alt="" aria-hidden className="dff-play__map-flag-background" /> : null}
    <div className="dff-play__map-shade" />
    <span className="dff-play__info-title dff-play__map-title" style={{ color: territoryColor }}>CARTE</span>
    {territory ? <span className="dff-play__map-target" style={{ borderColor: `${territoryColor}88`, color: territoryColor }}>{territory.target}</span> : null}
    <strong className="dff-play__map-label">{territory ? `${territory.name} · ${statusLabel(territory)}` : mapLabel}</strong>
  </button>;
}

function OutlineIcon({ name, size = 21 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "close") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M6 6l12 12M18 6 6 18" /></svg>;
  if (name === "target") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8" /><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></svg>;
  if (name === "journal") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>;
  if (name === "stats") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 20V9M10 20V4M16 20v-7M22 20V7" /></svg>;
  if (name === "fire") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 22c4 0 7-2.8 7-6.7 0-3.1-1.8-5.4-4.8-8.5.1 2.3-.8 3.8-2.2 4.8.2-3.5-1.5-6.4-4.4-8.6.1 4.1-2.6 6.1-2.6 10.5C5 18.4 8.1 22 12 22Z"/><path {...p} d="M9.5 18.5c0-1.8 1-3 2.5-4.5 1.5 1.5 2.5 2.7 2.5 4.5"/></svg>;
  if (name === "smoke") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 8h9a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M5 16h5" /></svg>;
  if (name === "shield") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/><path {...p} d="m9 12 2 2 4-5"/></svg>;
  if (name === "warning") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 2.8 20h18.4L12 3Z"/><path {...p} d="M12 9v5M12 17h.01"/></svg>;
  if (name === "map") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" /></svg>;
  if (name === "clear") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9" /><path {...p} d="M12 10v6M12 7h.01" /></svg>;
}

function OutlineActionButton({ name, label, color, onClick }: any) {
  return <button type="button" className="dff-play__outline-action" onClick={onClick} style={{ color, borderColor: `${color}52`, background: `${color}0c` }} title={label}><OutlineIcon name={name} size={19} /><span>{label}</span></button>;
}

function FloatingPanel({ title, subtitle, accent = WATER, onClose, children, wide = false }: any) {
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return <div className="dff-modal" role="dialog" aria-modal="true" onClick={onClose}>
    <div className={`dff-modal__panel ${wide ? "is-wide" : ""}`} onClick={(event) => event.stopPropagation()} style={{ borderColor: `${accent}66` }}>
      <header className="dff-modal__header"><div><div className="dff-modal__title" style={{ color: accent }}>{title}</div>{subtitle ? <div className="dff-modal__subtitle">{subtitle}</div> : null}</div><button type="button" className="dff-modal__close" onClick={onClose} aria-label="Fermer"><OutlineIcon name="close" size={24} /></button></header>
      <div className="dff-modal__body">{children}</div>
    </div>
  </div>;
}

function ObjectiveModal({ primary, alternatives, config, onSelect, onClose }: any) {
  const rows = [primary, ...(alternatives || [])].filter(Boolean);
  return <FloatingPanel title="OBJECTIFS CONSEILLÉS" subtitle="Touchez une cible pour la préparer au Bull / Canadair." accent={primary?.color || WATER} onClose={onClose}>
    <div className="dff-objective-list">{rows.length ? rows.map((suggestion: TacticalSuggestion, index: number) => { const territoryColor = fireTerritoryColor(fireStatus(suggestion.territory)); return <button key={`${suggestion.territory.id}-${index}`} type="button" className="dff-objective-row" onClick={() => onSelect(suggestion.territory.id)} style={{ borderColor: `${territoryColor}55` }}><strong style={{ color: territoryColor }}>{suggestion.territory.target}</strong><div><b>{suggestion.territory.name}</b><span>{suggestion.action}</span><small>{suggestion.reason}</small></div></button>; }) : <div className="dff-empty">Aucune urgence détectée.</div>}</div>
    <div className="dff-help-box"><b>RÈGLE CLAIRE</b><span>Un chiffre du keypad agit toujours sur le territoire portant ce numéro. La sélection affichée sert au Bull et au Double Bull seulement.</span><span>Simple = 1 eau · Double = 2 · Triple = 3.</span></div>
  </FloatingPanel>;
}

function TerritoryModal({ territory, state, country, onOpenMap, onClear, onClose }: any) {
  if (!territory) return <FloatingPanel title="TERRITOIRE" subtitle="Aucune zone ciblée." accent={WATER} onClose={onClose}><div className="dff-empty">Sélectionne une suggestion, un secteur au keypad ou une zone sur la carte.</div><button type="button" className="dff-modal__primary" onClick={onOpenMap}><OutlineIcon name="map" /> OUVRIR LA CARTE</button></FloatingPanel>;
  const color = fireTerritoryColor(fireStatus(territory));
  return <FloatingPanel title={territory.name} subtitle={`SECTEUR ${territory.target} · ${statusLabel(territory)}`} accent={color} onClose={onClose}>
    <TerritoryInsightBody territory={territory} state={state} country={country} />
    <div className="dff-modal__actions"><button type="button" onClick={onOpenMap}><OutlineIcon name="map" /> VOIR SUR LA CARTE</button>{state.selectedTerritoryId ? <button type="button" onClick={onClear}><OutlineIcon name="clear" /> DÉSÉLECTIONNER</button> : null}</div>
  </FloatingPanel>;
}

function FirefighterMapModal({ state, country, map, mapLabel, profilesById, activePlayerId, onClose, onSelect }: any) {
  const selected = state.territories.find((territory: FireTerritory) => territory.id === state.selectedTerritoryId) || null;
  const badgeSrc = getTerritoryDepartmentVisual(country, selected) || getMapBadgeAsset(country, selected);
  const countryFlag = getCountryMapFlag(country);
  const activePlayer = state.players.find((player: any) => String(player?.id) === String(activePlayerId)) || state.players[0] || null;
  const activeProfile = activePlayer ? (profilesById?.get?.(String(activePlayer.id)) || activePlayer) : null;
  const accent = selected ? fireTerritoryColor(fireStatus(selected)) : FIRE;
  return <FloatingPanel title="CARTE D’INTERVENTION" subtitle={mapLabel} accent={accent} onClose={onClose} wide>
    <div className="dff-map-modal">
      {state.players?.length > 1 ? <div className="dff-map-modal__turns"><FirefighterTurnCarousel players={state.players} activePlayerId={activePlayerId} profilesById={profilesById} playerStats={state.playerStats} /></div> : null}
      <div className="dff-map-modal__viewport-wrap">
        {countryFlag ? <div className="dff-map-modal__country-badge"><img src={countryFlag} alt="" aria-hidden /></div> : null}
        {selected ? <div className="dff-map-modal__territory-hero" style={{ borderColor: `${accent}55` }}>
          {badgeSrc ? <div className="dff-map-modal__territory-badge"><img src={badgeSrc} alt="" aria-hidden /></div> : <div className="dff-map-modal__territory-badge is-fallback">{selected.target}</div>}
          <div className="dff-map-modal__territory-meta"><strong style={{ color: GOLD }}>{selected.target}</strong><span>{selected.name}</span><small style={{ color: accent }}>{statusLabel(selected)}{selected.critical ? " · CRITIQUE" : ""}</small></div>
          {activeProfile ? <div className="dff-map-modal__territory-avatar"><ProfileAvatar profile={activeProfile as any} size={54} ringColor={accent} showStars={false} noFrame /></div> : null}
        </div> : null}
        <div className="dff-map-modal__viewport"><TerritoriesMapView country={country} map={map} ownerColors={FIRE_STATUS_OWNER_COLORS} selectedTerritoryId={state.selectedTerritoryId || undefined} activeColor={WATER} themeColor={FIRE} interactive={!state.finished} onSelectTerritory={onSelect} isSelectableTerritoryId={(id) => Boolean(state.territories.find((territory: FireTerritory) => territory.id === id && territory.playable && !territory.destroyed))} style={{ width: "100%", height: "100%" }} /></div>
      </div>
      <div className={`dff-map-modal__footer ${selected ? "has-selection" : ""}`}>{selected ? <><div className="dff-map-selected-wrap"><TerritoryInsightBody territory={selected} state={state} country={country} compact /></div><button type="button" className="dff-map-clear" onClick={() => onSelect(selected.id)}><OutlineIcon name="close" size={18} /> DÉSÉLECTIONNER</button></> : <div className="dff-map-hint">Touchez une zone pour la sélectionner. Touchez-la une seconde fois pour la désélectionner.</div>}</div>
    </div>
  </FloatingPanel>;
}

function MiniKpi({ icon, label, value, hint, color }: any) {
  const detailed = Boolean(icon || hint);
  return <div className={`dff-mini-kpi ${detailed ? "is-detailed" : ""}`} style={{ borderColor: `${color}42`, background: `${color}0c` }}>
    {icon ? <span className="dff-mini-kpi__icon" style={{ color }}><OutlineIcon name={icon} size={18} /></span> : null}
    <strong style={{ color }}>{value}</strong>
    <span className="dff-mini-kpi__label">{label}</span>
    {hint ? <small>{hint}</small> : null}
  </div>;
}

function TargetsModal({ state, onClose, onSelect }: any) {
  const rows = state.territories.filter((territory: FireTerritory) => territory.playable).sort((a: FireTerritory, b: FireTerritory) => a.target - b.target);
  return <FloatingPanel title="CIBLES DE LA MISSION" subtitle="Touchez une zone pour la sélectionner ou la désélectionner." accent={GOLD} onClose={onClose} wide>
    <div className="dff-target-grid">{rows.map((territory: FireTerritory) => { const color = fireTerritoryColor(fireStatus(territory)); const active = state.selectedTerritoryId === territory.id; return <button key={territory.id} type="button" disabled={territory.destroyed} className={`dff-target-row ${active ? "is-selected" : ""}`} onClick={() => onSelect(territory.id)} style={{ borderColor: active ? WATER : `${color}50`, boxShadow: active ? `0 0 14px ${WATER}30` : "none" }}><strong style={{ color: GOLD }}>{territory.target}</strong><div><b>{territory.name}</b><span style={{ color }}>{statusLabel(territory)}{territory.critical ? " · CRITIQUE" : ""}</span></div></button>; })}</div>
  </FloatingPanel>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  const rows = [...state.history].reverse();
  return <FloatingPanel title="JOURNAL D’INTERVENTION" subtitle={`${rows.length} volée${rows.length > 1 ? "s" : ""}`} accent={WATER} onClose={onClose} wide>
    <div className="dff-timeline">{rows.length ? rows.map((visit: any) => { const profile = profilesById.get(String(visit.playerId)); const danger = visit.events.some((event: any) => event.type === "destroyed" || event.type === "spread"); return <article key={visit.id} style={{ borderColor: `${danger ? RED : WATER}38` }}><header><strong>{playerName(profile)} · R{visit.round} · {visit.labels.join(" / ")}</strong><b style={{ color: visit.score >= 0 ? GREEN : RED }}>{visit.score >= 0 ? "+" : ""}{visit.score}</b></header><small>Charge {visit.totalFireBefore.toFixed(1)} → {visit.totalFireAfter.toFixed(1)} · combo {visit.comboBefore} → {visit.comboAfter}</small><p>{visit.events.slice(-4).map((event: any) => event.label).join(" · ") || "Aucun effet"}</p></article>; }) : <div className="dff-empty">Aucune volée enregistrée.</div>}</div>
  </FloatingPanel>;
}

function StatsModal({ state, currentStats, activeProfile, config, onClose }: any) {
  const totalDarts = Object.values(state.playerStats || {}).reduce((sum: number, stats: any) => sum + Number(stats?.darts || 0), 0);
  const totalHits = Object.values(state.playerStats || {}).reduce((sum: number, stats: any) => sum + Number(stats?.hits || 0), 0);
  return <FloatingPanel title="STATISTIQUES DE MISSION" subtitle={playerName(activeProfile)} accent={GREEN} onClose={onClose}>
    <div className="dff-stats-grid"><MiniKpi label="SCORE" value={state.score} color={GOLD} /><MiniKpi label="PRÉCISION" value={`${pct(totalHits, totalDarts)}%`} color={GREEN} /><MiniKpi label="FEUX ÉTEINTS" value={state.totalExtinguished} color={WATER} /><MiniKpi label="ZONES PERDUES" value={state.totalDestroyed} color={RED} /><MiniKpi label="EAU JOUEUR" value={Number(currentStats?.waterApplied || 0)} color={WATER} /><MiniKpi label="PARE-FEUX" value={Number(currentStats?.protectionsPlaced || 0)} color={GREEN} /><MiniKpi label="PROPAGATIONS" value={state.totalSpread} color={FIRE} /><MiniKpi label="BLOQUÉES" value={state.propagationBlocked} color={GOLD} /></div>
    <div className="dff-help-box"><b>MISSION</b><span>{difficultyLabel(config.difficulty)} · {config.maxRounds} rounds · jusqu’à {config.dartsPerTurn} fléchette{Number(config.dartsPerTurn) > 1 ? "s" : ""} par volée.</span><span>{config.windEnabled ? state.windLabel : "Vent désactivé"} · charge actuelle {totalFire(state).toFixed(1)}.</span></div>
  </FloatingPanel>;
}
