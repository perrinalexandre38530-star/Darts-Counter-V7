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
  dartScoreValue,
  dartsFirefighterDifficultyRules,
  dartsFirefighterTerritoryScoreFactor,
  dartsFirefighterExactExecutionBonus,
  dartsFirefighterSpecialExecutionBonus,
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

const FIREFIGHTER_UN_REGION_FLAGS = import.meta.glob("../assets/flags_un/*.png", { eager: true, import: "default" }) as Record<string, string>;
const FIREFIGHTER_MACRO_MAPS = new Set<TerritoriesCountry>(["AF", "ASIA", "EU", "NA", "SAM", "WORLD", "UN"]);

export const DARTS_FIREFIGHTER_PLAY_UI_VERSION = "7.4.0-tactical-map-wind16-multizone";

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
function uiDartScore(dart?: UiDart) {
  if (!dart) return 0;
  return dartScoreValue(uiToGameDart(dart));
}

function findCheckoutForTarget(targetRaw: number, maxDartsRaw: number): UiDart[] | null {
  const target = Math.max(1, Math.min(180, Number(targetRaw || 0)));
  const maxDarts = Math.max(1, Math.min(3, Number(maxDartsRaw || 3)));
  const options: UiDart[] = [];
  for (let value = 20; value >= 1; value -= 1) {
    options.push({ v: value, mult: 3 }, { v: value, mult: 2 }, { v: value, mult: 1 });
  }
  options.push({ v: 25, mult: 2 }, { v: 25, mult: 1 });
  const scored = options.map((dart) => ({ dart, score: uiDartScore(dart) }));
  for (const a of scored) if (a.score === target) return [a.dart];
  if (maxDarts >= 2) {
    for (const a of scored) for (const b of scored) if (a.score + b.score === target) return [a.dart, b.dart];
  }
  if (maxDarts >= 3) {
    const byScore = new Map<number, UiDart>();
    for (const item of scored) if (!byScore.has(item.score)) byScore.set(item.score, item.dart);
    for (const a of scored) for (const b of scored) {
      const c = byScore.get(target - a.score - b.score);
      if (c) return [a.dart, b.dart, c];
    }
  }
  return null;
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
function statusHeadline(t: FireTerritory) {
  if (t.destroyed) return "TERRITOIRE DÉTRUIT";
  if (t.fireLevel >= 3) return "INCENDIE CRITIQUE";
  if (t.fireLevel === 2) return "FOYER IMPORTANT";
  if (t.fireLevel === 1) return "DÉPART DE FEU";
  if (t.smoke) return "ALERTE FUMÉE";
  if (t.protection >= 3) return "PROTECTION MAXIMALE";
  if (t.protection === 2) return "PROTECTION RENFORCÉE";
  if (t.protection === 1) return "PROTECTION LÉGÈRE";
  return "ZONE SAINE";
}

function statusMeta(territory?: FireTerritory | null) {
  if (!territory) return { icon: "target", value: "—", label: "AUCUNE CIBLE", color: "#97a2b4" };
  if (territory.destroyed) return { icon: "warning", value: "X", label: "DÉTRUIT", color: "#6f7a88" };
  if (territory.fireLevel > 0) return { icon: "fire", value: String(territory.fireLevel), label: `FEU N${territory.fireLevel}`, color: fireTerritoryColor(fireStatus(territory)) };
  if (territory.smoke) return { icon: "smoke", value: "1", label: "FUMÉE", color: "#c8b190" };
  if (territory.protection > 0) return { icon: "shield", value: String(territory.protection), label: `EAU ${territory.protection}`, color: WATER };
  return { icon: "target", value: "0", label: "SAIN", color: "#8da0b8" };
}

function simulateTerritoryImpact(territory: FireTerritory, power: number) {
  let remaining = Math.max(0, Number(power || 0));
  let smoke = Boolean(territory.smoke);
  let fireLevel = Math.max(0, Number(territory.fireLevel || 0));
  let protection = Math.max(0, Number(territory.protection || 0));
  const notes: string[] = [];

  if (smoke && remaining > 0) {
    smoke = false;
    remaining -= 1;
    notes.push("fumée dissipée");
  }
  const reduced = Math.min(fireLevel, remaining);
  if (reduced > 0) {
    const before = fireLevel;
    fireLevel = Math.max(0, fireLevel - reduced);
    remaining -= reduced;
    notes.push(`feu ${before}→${fireLevel}`);
  }
  const room = Math.max(0, 3 - protection);
  const added = Math.min(room, remaining);
  if (added > 0) {
    const before = protection;
    protection = Math.min(3, protection + added);
    notes.push(`eau ${before}→${protection}`);
  }

  if (!notes.length) notes.push("aucun effet direct");
  return {
    smoke,
    fireLevel,
    protection,
    reduced,
    added,
    smokeCleared: Boolean(territory.smoke) && !smoke,
    extinguished: Number(territory.fireLevel || 0) > 0 && fireLevel === 0,
    summary: notes.join(" · "),
  };
}

function estimateWaterPoints(territory: FireTerritory, power: number, state: DartsFirefighterState) {
  const outcome = simulateTerritoryImpact(territory, power);
  let raw = 0;
  if (outcome.smokeCleared) raw += 20;
  raw += Number(outcome.reduced || 0) * 35;
  if (outcome.extinguished) raw += 45 + (territory.critical ? 25 : 0);
  raw += Number(outcome.added || 0) * 15;
  const rules = dartsFirefighterDifficultyRules(state.config.difficulty);
  const tacticalFactor = dartsFirefighterTerritoryScoreFactor(territory, state);
  return Math.round(raw * Number(rules.scoreMultiplier || 1) * tacticalFactor);
}

function applyCurrentCombo(points: number, state: DartsFirefighterState) {
  const comboMultiplier = state.config.comboEnabled !== false ? 1 + Math.min(.75, Number(state.combo || 0) * .05) : 1;
  return Math.round(points * comboMultiplier);
}

function canonicalExactShots(targetRaw: number) {
  const target = Math.max(1, Number(targetRaw || 0));
  const options: UiDart[] = [];
  for (let value = 1; value <= 20; value += 1) {
    options.push({ v: value, mult: 1 }, { v: value, mult: 2 }, { v: value, mult: 3 });
  }
  const shotDifficulty = (dart: UiDart) => dart.mult === 3 ? 30 : dart.mult === 2 ? 18 : 6;
  const comboDifficulty = (darts: UiDart[]) => darts.length * 55 + darts.reduce((sum, dart) => sum + shotDifficulty(dart), 0);
  const makeRow = (darts: UiDart[], note: string) => ({
    label: darts.map(uiLabel).join(" + "),
    power: Math.max(1, ...darts.map((dart) => Number(dart.mult || 1))),
    note,
    darts,
  });
  const out: { label: string; power: number; note?: string; darts: UiDart[] }[] = [];

  const singles = options.filter((dart) => uiDartScore(dart) === target).sort((a, b) => shotDifficulty(b) - shotDifficulty(a));
  if (singles[0]) out.push(makeRow([singles[0]], "tir exact"));

  let bestPair: UiDart[] | null = null;
  let bestPairDifficulty = -1;
  for (let i = 0; i < options.length; i += 1) {
    for (let j = i; j < options.length; j += 1) {
      const pair = [options[i], options[j]];
      if (uiDartScore(pair[0]) + uiDartScore(pair[1]) !== target) continue;
      const difficulty = comboDifficulty(pair);
      if (difficulty > bestPairDifficulty) { bestPair = pair; bestPairDifficulty = difficulty; }
    }
  }
  if (bestPair) out.push(makeRow(bestPair, "combinaison exacte · 2 fléchettes"));

  const bestByScore = new Map<number, UiDart>();
  for (const dart of options) {
    const score = uiDartScore(dart);
    const current = bestByScore.get(score);
    if (!current || shotDifficulty(dart) > shotDifficulty(current)) bestByScore.set(score, dart);
  }
  let bestTriple: UiDart[] | null = null;
  let bestTripleDifficulty = -1;
  for (let i = 0; i < options.length; i += 1) {
    for (let j = i; j < options.length; j += 1) {
      const remain = target - uiDartScore(options[i]) - uiDartScore(options[j]);
      const third = bestByScore.get(remain);
      if (!third) continue;
      const triple = [options[i], options[j], third];
      const difficulty = comboDifficulty(triple);
      if (difficulty > bestTripleDifficulty) { bestTriple = triple; bestTripleDifficulty = difficulty; }
    }
  }
  if (bestTriple) out.push(makeRow(bestTriple, "combinaison exacte · 3 fléchettes"));

  // Déduplique d'éventuelles représentations identiques.
  const unique = out.filter((row, index, rows) => rows.findIndex((candidate) => candidate.label === row.label) === index);
  if (unique.length) return unique.slice(0, 3);

  // Ultime recours : une cible peut nécessiter un Bull. Il est alors consommé
  // par la combinaison et ne déclenche pas son action spéciale.
  const checkout = findCheckoutForTarget(target, 3) || [];
  if (checkout.length) {
    const usesBull = checkout.some((dart) => Number(dart.v) === 25);
    return [{
      label: checkout.map((dart) => uiLabel(dart)).join(" + "),
      power: Math.max(1, ...checkout.map((dart) => Number(dart.mult || 1))),
      note: usesBull ? "combinaison exacte · Bull intégré" : "combinaison exacte",
      darts: checkout,
    }];
  }
  return [];
}

type CanadairImpactPreview = { territory: FireTerritory; power: number; result: string };
type TerritoryActionRow = {
  label: string;
  detail: string;
  result: string;
  color: string;
  points: number;
  best?: boolean;
  kind?: "direct" | "bull" | "canadair";
  impacts?: CanadairImpactPreview[];
};

function buildTerritoryActionRows(territory: FireTerritory, state: DartsFirefighterState): TerritoryActionRow[] {
  const scoreTargetMode = state?.targetMode === "visit_score" || Number(state?.config?.activeTerritories || 0) > 20;
  const rows: TerritoryActionRow[] = [];
  if (territory.destroyed) return [{ label: "—", detail: "Territoire détruit", result: "Intervention locale impossible", color: "#6f7a88", points: 0, best: true }];

  const addDirectRow = (label: string, power: number, detail: string, color: string, darts?: UiDart[]) => {
    const outcome = simulateTerritoryImpact(territory, power);
    const execution = darts?.length ? dartsFirefighterExactExecutionBonus(darts.map(uiToGameDart), territory.target, state) : 0;
    const points = applyCurrentCombo(estimateWaterPoints(territory, power, state) + execution, state);
    const executionHint = execution > 0 ? ` · adresse +${execution}` : "";
    rows.push({ label, detail: `${detail}${executionHint}`, result: outcome.summary, color, points, kind: "direct" });
  };

  if (scoreTargetMode) {
    for (const shot of canonicalExactShots(territory.target)) {
      addDirectRow(shot.label, shot.power, `${territory.target} pts exacts · puissance ${shot.power}${shot.note ? ` · ${shot.note}` : ""}`, shot.power >= 3 ? FIRE : shot.power === 2 ? GOLD : WATER, shot.darts);
    }
  } else {
    addDirectRow(`S${territory.target}`, 1, "1 unité d’eau", WATER);
    addDirectRow(`D${territory.target}`, 2, "2 unités d’eau", GOLD);
    addDirectRow(`T${territory.target}`, 3, "3 unités d’eau", FIRE);
  }

  const bullPower = Math.max(1, Number(state?.config?.bullPower || 2));
  const bullOutcome = simulateTerritoryImpact(territory, bullPower);
  const bullExecution = dartsFirefighterSpecialExecutionBonus("bull", state);
  const bullPoints = applyCurrentCombo(estimateWaterPoints(territory, bullPower, state) + bullExecution, state);
  rows.push({ label: "BULL", detail: `largage ciblé · puissance ${bullPower}`, result: bullOutcome.summary, color: WATER, points: bullPoints, kind: "bull" });

  const canUseCanadair = Boolean(state?.config?.bullAirSupport);
  const centerPower = Math.max(1, Number(state?.config?.canadairCenterPower || 3));
  const neighborPower = Math.max(1, Number(state?.config?.canadairNeighborPower || 1));
  const neighborCount = Math.max(1, Math.min(4, Number(state?.config?.canadairNeighborCount || 3)));
  const gaugeCost = Math.max(0, Number(state?.config?.canadairGaugeCost ?? 35));
  const gaugeReady = !state?.config?.canadairRequiresGauge || Number(state?.brigadeGauge || 0) >= gaugeCost;
  let dbullPoints = 0;
  let dbullResult = simulateTerritoryImpact(territory, bullPower).summary;
  let dbullDetail = `largage précis · puissance ${bullPower}`;
  let dbullKind: TerritoryActionRow["kind"] = "bull";
  let dbullImpacts: CanadairImpactPreview[] = [];

  if (canUseCanadair && gaugeReady) {
    dbullKind = "canadair";
    dbullPoints = estimateWaterPoints(territory, centerPower, state);
    const neighbors = (territory.neighbors || []).slice(0, neighborCount).map((id) => state.territories.find((item) => item.id === id)).filter(Boolean) as FireTerritory[];
    dbullImpacts = [
      { territory, power: centerPower, result: simulateTerritoryImpact(territory, centerPower).summary },
      ...neighbors.map((neighbor) => ({ territory: neighbor, power: neighborPower, result: simulateTerritoryImpact(neighbor, neighborPower).summary })),
    ];
    for (const neighbor of neighbors) dbullPoints += estimateWaterPoints(neighbor, neighborPower, state);
    dbullPoints += dartsFirefighterSpecialExecutionBonus("dbull", state);
    dbullResult = `${simulateTerritoryImpact(territory, centerPower).summary} · ${neighbors.length} voisin${neighbors.length > 1 ? "s" : ""} arrosé${neighbors.length > 1 ? "s" : ""}`;
    dbullDetail = `Canadair · centre ${centerPower} · voisins ${neighborPower} ×${neighbors.length}`;
  } else if (canUseCanadair && !gaugeReady) {
    dbullPoints = estimateWaterPoints(territory, bullPower, state) + dartsFirefighterSpecialExecutionBonus("dbull", state);
    dbullDetail = `Canadair indisponible · jauge ${Math.round(Number(state.brigadeGauge || 0))}/${gaugeCost}`;
  } else {
    dbullPoints = estimateWaterPoints(territory, bullPower, state) + dartsFirefighterSpecialExecutionBonus("dbull", state);
  }
  dbullPoints = Math.min(360, dbullPoints);
  rows.push({ label: "DBULL", detail: dbullDetail, result: dbullResult, color: FIRE, points: applyCurrentCombo(dbullPoints, state), kind: dbullKind, impacts: dbullImpacts });

  rows.sort((a, b) => Number(b.points || 0) - Number(a.points || 0) || Number((b.label === "DBULL")) - Number((a.label === "DBULL")));
  if (rows[0]) rows[0].best = true;
  return rows;
}

const WIND_16_UI = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"] as const;
function windMeta(state: DartsFirefighterState) {
  const raw = String(state?.windLabel || "").toUpperCase();
  const explicitSource = String((state as any)?.windFromCode || "").toUpperCase();
  const sourceIndex = WIND_16_UI.indexOf(explicitSource as any) >= 0
    ? WIND_16_UI.indexOf(explicitSource as any)
    : (() => {
        const arrow = raw.match(/(NNE|ENE|ESE|SSE|SSO|OSO|ONO|NNO|NE|SE|SO|NO|N|E|S|O)\s*[→>-]/);
        if (arrow) return Math.max(0, WIND_16_UI.indexOf(arrow[1] as any));
        if (raw.includes("OUEST")) return 12;
        if (raw.includes("EST")) return 4;
        if (raw.includes("NORD")) return 0;
        if (raw.includes("SUD")) return 8;
        return 4;
      })();
  const source = WIND_16_UI[sourceIndex] || "E";
  const targetIndex = (sourceIndex + 8) % 16;
  const target = String((state as any)?.windToCode || WIND_16_UI[targetIndex]);
  const resolvedTargetIndex = Math.max(0, WIND_16_UI.indexOf(target as any));
  const strength = raw.includes("FORT") ? "FORT" : raw.includes("LÉGER") ? "LÉGER" : "BRISE";
  const changeEvery = Math.max(1, Number(state?.config?.windChangeEvery || 3));
  const progress = Number(state?.propagationIndex || 0) % changeEvery;
  const turnsLeft = progress === 0 ? changeEvery : changeEvery - progress;
  const rotation = resolvedTargetIndex * 22.5;
  return { source, target, sourceIndex, targetIndex: resolvedTargetIndex, strength, turnsLeft, rotation };
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

function findFirefighterUnRegionFlag(territory?: FireTerritory | null): string | null {
  const wanted = String(territory?.id || "").replace(/^UN-/i, "").trim().toLowerCase();
  if (!wanted) return null;
  for (const [path, src] of Object.entries(FIREFIGHTER_UN_REGION_FLAGS)) {
    const filename = String(path.split("/").pop() || "").replace(/\.png$/i, "").toLowerCase();
    if (filename === wanted) return src;
  }
  return null;
}

function getObjectiveCountryFlag(country: TerritoriesCountry, territory?: FireTerritory | null): string | null {
  if (!territory || !FIREFIGHTER_MACRO_MAPS.has(country)) return null;
  if (country === "UN") return findFirefighterUnRegionFlag(territory);
  let code = extractTerritoryFlagCode(country, territory);
  if (code === "KV") code = "XK";
  if (code === "UK") code = "GB";
  return getCountryFlagSrc(code);
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

function TerritorySilhouetteBadge(props: { country: TerritoriesCountry; territory: FireTerritory; color: string; height?: number; showValue?: boolean; visualMode?: "flag" | "status"; }) {
  const geometry = React.useMemo(() => getTerritoryShapeGeometry(props.country, props.territory.id, props.territory.svgPathId), [props.country, props.territory.id, props.territory.svgPathId]);
  const flagSrc = props.visualMode === "status" ? undefined : (getTerritoryDepartmentVisual(props.country, props.territory) || getMapBadgeAsset(props.country, props.territory) || undefined);
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
      {flagSrc ? <image href={flagSrc} x={bounds.x - bounds.width * 0.06} y={bounds.y - bounds.height * 0.06} width={bounds.width * 1.12} height={bounds.height * 1.12} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} style={{ filter: "saturate(1.08) contrast(1.02)" }} /> : <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={props.color} fillOpacity={props.visualMode === "status" ? .86 : 1} clipPath={`url(#${clipId})`} />}
      <path {...commonPathProps} fill={flagSrc ? "rgba(255,255,255,0.03)" : (props.visualMode === "status" ? `${props.color}55` : `${props.color}18`)} stroke="rgba(255,255,255,.98)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter={`url(#${glowId})`} />
      {props.showValue === false ? null : <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize={center.fontSize} fontWeight="1000" fill="#fff" stroke="rgba(0,0,0,.84)" strokeWidth={Math.max(1.4, center.fontSize * 0.08)} paintOrder="stroke fill" style={{ filter: `drop-shadow(0 0 7px ${props.color})` }}>{props.territory.target}</text>}
    </svg>
  );
}

function AdjacentTerritoryRail({ neighbors, country, onSelect }: { neighbors: FireTerritory[]; country: TerritoriesCountry; onSelect?: (id: string) => void }) {
  if (!neighbors.length) return <div className="dff-adjacent-empty">Aucune zone adjacente menacée actuellement.</div>;
  const rows = neighbors.length > 2 ? [...neighbors, ...neighbors] : neighbors;
  return <div className="dff-adjacent-rail" aria-label="Zones adjacentes menacées">
    <div className={`dff-adjacent-track ${neighbors.length > 2 ? "is-animated" : ""}`}>
      {rows.map((neighbor, index) => {
        const color = fireTerritoryColor(fireStatus(neighbor));
        const duplicated = index >= neighbors.length;
        return <button key={`${neighbor.id}-${index}`} type="button" className="dff-adjacent-card" style={{ borderColor: `${color}60` }} aria-hidden={duplicated ? true : undefined} tabIndex={duplicated ? -1 : 0} onClick={() => onSelect?.(neighbor.id)} title={`Ouvrir ${neighbor.name}`}>
          <div className="dff-adjacent-card__top">
            <div className="dff-adjacent-card__shape"><TerritorySilhouetteBadge country={country} territory={neighbor} color={color} height={38} showValue={false} visualMode="status" /></div>
            <strong style={{ color }}>{neighbor.target}</strong>
          </div>
          <span>{neighbor.name}</span>
        </button>;
      })}
    </div>
  </div>;
}

function CanadairImpactStrip({ impacts, country }: { impacts?: CanadairImpactPreview[]; country: TerritoriesCountry }) {
  const rows = (impacts || []).slice(0, 5);
  if (!rows.length) return null;
  return <div className="dff-canadair-impact" aria-label="Territoires concernés par le Canadair">
    {rows.map((impact, index) => {
      const color = fireTerritoryColor(fireStatus(impact.territory));
      const outcome = simulateTerritoryImpact(impact.territory, impact.power);
      const before = impact.territory.fireLevel > 0 ? `🔥${impact.territory.fireLevel}` : impact.territory.smoke ? "💨" : `💧${impact.territory.protection}`;
      const after = outcome.fireLevel > 0 ? `🔥${outcome.fireLevel}` : outcome.smoke ? "💨" : outcome.protection > 0 ? `💧${outcome.protection}` : "✓";
      return <div key={`${impact.territory.id}-${index}`} className={`dff-canadair-impact__item ${index === 0 ? "is-center" : ""}`} style={{ borderColor: `${color}55` }}>
        <div className="dff-canadair-impact__shape"><TerritorySilhouetteBadge country={country} territory={impact.territory} color={color} height={32} showValue={false} visualMode="status" /></div>
        <b>{impact.territory.target}</b>
        <span>{before}→{after}</span>
      </div>;
    })}
  </div>;
}

function TerritoryInsightBody({ territory, state, country, compact = false, onClear, onOpenAdvice, onSelectTerritory }: any) {
  const color = fireTerritoryColor(fireStatus(territory));
  const status = statusLabel(territory);
  const meta = statusMeta(territory);
  const neighbors = territory.neighbors.map((id: string) => state.territories.find((item: FireTerritory) => item.id === id)).filter(Boolean).slice(0, 10);
  const threatenedNeighbors = neighbors.filter((neighbor: FireTerritory) => neighbor.fireLevel > 0 || neighbor.smoke || state.forecastTerritoryIds.includes(neighbor.id));
  const adjacentHot = threatenedNeighbors.length;
  const threatened = state.forecastTerritoryIds.includes(territory.id) || adjacentHot > 0;
  const stageSrc = statusTickerSrc(territory);
  return <div className={`dff-territory-panel ${compact ? "is-compact" : ""}`} style={{ borderColor: `${color}65` }}>
    <section className="dff-territory-panel__header" style={{ borderColor: `${color}42` }}>
      <img className="dff-territory-panel__header-bg" src={stageSrc} alt="" aria-hidden />
      <div className="dff-territory-panel__header-shade" />
      <div className="dff-territory-panel__shape"><TerritorySilhouetteBadge country={country} territory={territory} color={color} height={compact ? 82 : 96} showValue /></div>
      <div className="dff-territory-panel__identity">
        <div className="dff-territory-panel__title-row">
          <small>TERRITOIRE SÉLECTIONNÉ</small>
          {onClear ? <button type="button" className="dff-territory-panel__clear" onClick={onClear} aria-label="Désélectionner ce territoire" title="Désélectionner"><OutlineIcon name="close" size={16} /></button> : null}
        </div>
        <strong>{territory.name}</strong>
        <div className="dff-card-status-row dff-card-status-row--left">
          <span className="dff-card-status-pill" style={{ borderColor: `${meta.color}66`, color: meta.color, background: `${meta.color}16` }}><OutlineIcon name={meta.icon} size={13} /><b>{meta.value}</b><small>{meta.label}</small></span>
          {territory.critical ? <span className="dff-card-status-pill is-critical"><OutlineIcon name="warning" size={12} /><b>!</b><small>CRITIQUE</small></span> : null}
        </div>
      </div>
    </section>

    <section className="dff-territory-status-banner" style={{ borderColor: `${color}65` }}>
      <img src={stageSrc} alt="" aria-hidden />
      <div className="dff-territory-status-banner__shade" />
      <div className="dff-territory-status-banner__copy">
        <strong>{statusHeadline(territory)}</strong>
        <span>{status}{territory.critical ? " · PRIORITÉ ABSOLUE" : ""}</span>
      </div>
    </section>

    <section className="dff-territory-operations">
      <div className="dff-territory-operations__title"><OutlineIcon name="journal" size={17} /><span>INFORMATIONS OPÉRATIONNELLES</span></div>
      <div className="dff-territory-kpi-grid">
        <MiniKpi icon="fire" label="FEU" value={`${territory.fireLevel}/3`} hint={territory.fireLevel ? "Intensité" : "Aucun foyer"} color={FIRE} />
        <MiniKpi icon="smoke" label="FUMÉE" value={territory.smoke ? "OUI" : "NON"} hint={territory.smoke ? "Départ imminent" : "Aucune alerte"} color="#c3cad5" />
        <MiniKpi icon="shield" label="PROTECTION" value={`${territory.protection}/3`} hint={territory.protection ? "Pare-feu actif" : "Aucune défense"} color={WATER} />
        <MiniKpi icon="warning" label="MENACE" value={threatened ? "ÉLEVÉE" : "STABLE"} hint={threatened ? `${adjacentHot} zone${adjacentHot > 1 ? "s" : ""} exposée${adjacentHot > 1 ? "s" : ""}` : "Front éloigné"} color={GOLD} />
        <MiniKpi icon="map" label="ADJACENTS" value={neighbors.length} hint="Contact direct" color={GREEN} />
      </div>
    </section>

    <section className="dff-adjacent-section">
      <div className="dff-adjacent-section__title">ZONES ADJACENTES MENACÉES</div>
      <AdjacentTerritoryRail neighbors={threatenedNeighbors} country={country} onSelect={onSelectTerritory} />
    </section>
    {compact && onOpenAdvice ? <section className="dff-map-territory-action"><button type="button" onClick={onOpenAdvice}><OutlineIcon name="target" size={18} /><span>ACTIONS</span></button></section> : null}
  </div>;
}

function Rules({ config }: { config: DartsFirefighterConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: FIRE }}>OBJECTIF</strong><br />{config.objective === "survival" ? `Résiste pendant ${config.maxRounds} rounds.` : config.objective === "protect_critical" ? `Protège les zones critiques pendant ${config.maxRounds} rounds.` : "Éteins tous les foyers avant la limite."}</div>
    <div><strong style={{ color: WATER }}>PUISSANCE</strong><br />Simple 1 · Double 2 · Triple 3. Le surplus crée une protection qui absorbe une future propagation.</div>
    <div><strong style={{ color: GOLD }}>CIBLES</strong><br />{Number(config.activeTerritories || 0) > 20 ? "Carte étendue : le moteur teste toutes les combinaisons possibles de 1 à 3 fléchettes numérotées et retient UNE seule intervention normale, la plus intéressante parmi les cibles exactes atteignables. D1 + T4 + S8 peut donc viser 2, 8, 10, 12, 14, 20 ou 22 selon les cibles actives ; jamais trois territoires différents sur la même volée normale." : config.multiInterventionPerDart !== false ? "Carte 1-20 en mode multi-zones : chaque fléchette agit séparément sur son secteur. D1, T4 et S8 interviennent donc sur les territoires 1, 4 et 8." : "Carte 1-20 en mode intervention unique : une seule action normale est retenue dans la volée ; Bull et DBull restent séparés."}</div>
    <div><strong style={{ color: WATER }}>BULL / DBULL</strong><br />{`Bull et DBull sont d’abord réservés aux actions spéciales. Ainsi T19 + DBULL + D16 peut produire 89 points exacts avec T19+D16 ET un DBULL séparé. Si une cible exacte n’est atteignable qu’en comptant le Bull/DBull dans son total, celui-ci est alors consommé par la combinaison et ne déclenche pas de largage. ${config.bullTargetMode === "priority" ? "Le largage spécial vise automatiquement la priorité tactique." : "Le largage spécial vise la zone sélectionnée."} ${config.bullAirSupport ? "Le Double Bull appelle le Canadair si la jauge le permet." : "Canadair désactivé."}`}</div>
    <div><strong style={{ color: FIRE }}>VENT</strong><br />{config.windEnabled ? `Vent ${config.windStrength || "normal"}, changement tous les ${config.windChangeEvery || 3} cycles.` : "Vent désactivé."}</div>
  </div>;
}

function buildBotVisit(state: DartsFirefighterState, level: string): { darts: UiDart[]; selectedId: string | null } {
  const targets = [...state.territories].filter((t) => t.playable && !t.destroyed)
    .sort((a, b) => Number(b.critical) - Number(a.critical) || b.fireLevel - a.fireLevel || Number(b.smoke) - Number(a.smoke) || a.protection - b.protection);
  const target = targets[0] || null;
  const dartsPerTurn = Math.max(1, Math.min(3, Number(state.config.dartsPerTurn || 3)));
  const scoreTargetMode = state.targetMode === "visit_score" || Number(state.config.activeTerritories || 0) > 20;

  if (scoreTargetMode && target) {
    const checkout = findCheckoutForTarget(target.target, dartsPerTurn);
    const successChance = level === "hard" ? .90 : level === "easy" ? .48 : .72;
    if (checkout && Math.random() < successChance) return { darts: checkout, selectedId: target.id };
    if (checkout?.length) {
      const missed = checkout.map((dart) => ({ ...dart }));
      const last = missed.length - 1;
      const candidate = missed[last];
      if (candidate?.v === 25) missed[last] = { v: 20, mult: 1 };
      else missed[last] = { v: Math.max(1, Math.min(20, Number(candidate?.v || 1) + (Math.random() < .5 ? -1 : 1))), mult: candidate?.mult || 1 };
      return { darts: missed, selectedId: target.id };
    }
  }

  const missChance = level === "hard" ? .04 : level === "easy" ? .25 : .11;
  const bullChance = level === "hard" ? .18 : level === "easy" ? .04 : .10;
  const darts: UiDart[] = [];
  for (let i = 0; i < dartsPerTurn; i += 1) {
    const r = Math.random();
    if (r < missChance) darts.push({ v: 0, mult: 1 });
    else if (r < missChance + bullChance) darts.push({ v: 25, mult: level === "hard" && Math.random() > .48 ? 2 : 1 });
    else {
      const multiplier = level === "hard" ? (Math.random() < .55 ? 3 : 2) : level === "easy" ? (Math.random() < .78 ? 1 : 2) : (Math.random() < .34 ? 3 : Math.random() < .55 ? 2 : 1);
      darts.push({ v: Math.max(1, Math.min(20, target?.target || (1 + Math.floor(Math.random() * 20)))), mult: multiplier as any });
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
  estimatedPoints?: number;
};

type TacticalPlan = {
  primary: TacticalSuggestion | null;
  alternatives: TacticalSuggestion[];
  clusterCount: number;
};

function directShotForTerritory(territory: FireTerritory, forecasted: boolean, scoreTargetMode = false): TacticalSuggestion {
  const requiredPower = territory.fireLevel > 0 || territory.smoke
    ? Math.min(3, Math.max(1, Number(territory.fireLevel || 0) + (territory.smoke ? 1 : 0)))
    : Math.max(1, 3 - Number(territory.protection || 0));
  const bed = requiredPower >= 3 ? "T" : requiredPower === 2 ? "D" : "S";
  const shot = scoreTargetMode ? `${territory.target} PTS` : `${bed}${territory.target}`;
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
  if (scoreTargetMode) action = `${territory.target} points exacts · ${action}`;
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

function estimateSuggestionPoints(suggestion: TacticalSuggestion, state: DartsFirefighterState) {
  const rows = buildTerritoryActionRows(suggestion.territory, state);
  if (suggestion.kind === "canadair") return Number(rows.find((row) => row.kind === "canadair")?.points || 0);
  const directRows = rows.filter((row) => row.kind === "direct");
  return Number((directRows.sort((a, b) => b.points - a.points)[0] || rows[0])?.points || 0);
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
  const scoreTargetMode = state.targetMode === "visit_score" || Number(config.activeTerritories || 0) > 20;
  const firstSuggestion: TacticalSuggestion = canadairReady && clusterCount >= 3
    ? {
        territory: danger,
        shot: "DBULL",
        power: 3,
        action: `Déclencher le Canadair sur ${danger.name}`,
        reason: `${clusterCount} foyers groupés · jauge ${Math.round(state.brigadeGauge)}%`,
        color: WATER,
        kind: "canadair",
      }
    : directShotForTerritory(danger, forecast.has(danger.id), scoreTargetMode);
  const candidateRows: TacticalSuggestion[] = [
    firstSuggestion,
    ...ranked
      .filter((territory) => territory.id !== danger.id && (territory.fireLevel > 0 || territory.smoke || forecast.has(territory.id) || territory.critical))
      .slice(0, 5)
      .map((territory) => directShotForTerritory(territory, forecast.has(territory.id), scoreTargetMode)),
  ];
  const scored = candidateRows
    .map((suggestion) => ({ ...suggestion, estimatedPoints: estimateSuggestionPoints(suggestion, state) }))
    .sort((a, b) => Number(b.estimatedPoints || 0) - Number(a.estimatedPoints || 0)
      || Number(b.territory.fireLevel || 0) - Number(a.territory.fireLevel || 0)
      || Number(b.territory.target || 0) - Number(a.territory.target || 0));
  return { primary: scored[0] || null, alternatives: scored.slice(1, 4), clusterCount };
}

function dedupeTacticalSuggestions(rows: Array<TacticalSuggestion | null | undefined>) {
  const seen = new Set<string>();
  return rows.filter((item): item is TacticalSuggestion => {
    if (!item?.territory?.id) return false;
    const key = String(item.territory.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const country = React.useMemo(() => toCountry(config.mapId), [config.mapId]);
  const rawMap = React.useMemo(() => buildTerritoriesMap(country), [country]);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const resumeState = resumeRecord?.payload?.stateSnapshot || resumeRecord?.resume?.state || resumeRecord?.payload?.resume?.state || null;
  const initialState = React.useMemo(() => {
    if (resumeState && typeof resumeState === "object" && Array.isArray(resumeState.territories) && Array.isArray(resumeState.players)) {
      try { return cloneDartsFirefighterState({ ...resumeState, config: { ...config, ...(resumeState.config || {}) }, finished: false, finishedAt: null }); } catch {}
    }
    const created = createDartsFirefighterState(players, config, rawMap);
    // Aucun territoire n’est présélectionné : la carte reste neutre tant que le joueur
    // ne choisit pas une zone ou ne saisit pas une cible au keypad.
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
  const [showActionPlanner, setShowActionPlanner] = React.useState(false);
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
    const territory = state.territories.find((zone) => zone.id === id) || null;
    if (!territory || !territory.playable || territory.destroyed) return;
    setState((prev) => selectFireTerritory(prev, id));
    setNotice(`${territory.name} · ${state.targetMode === "visit_score" ? `cible ${territory.target} pts` : `secteur ${territory.target}`} · ${statusLabel(territory)}`);
  }
  function clearTerritorySelection() {
    if (state.finished || !state.selectedTerritoryId) return;
    setState((prev) => selectFireTerritory(prev, null));
    setNotice("Cible Bull / Canadair désélectionnée.");
  }
  function toggleTerritorySelection(id: string) {
    if (String(state.selectedTerritoryId || "") === String(id || "")) {
      clearTerritorySelection();
      return;
    }
    selectTerritory(id);
  }
  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.finished || throwDarts.length >= Number(config.dartsPerTurn || 3)) return;
    const dart = { v: Number(v) || 0, mult: (mult || multiplier) as 1 | 2 | 3 };

    const scoreTargetMode = state.targetMode === "visit_score" || Number(config.activeTerritories || 0) > 20;
    if (!scoreTargetMode && dart.v >= 1 && dart.v <= 20) {
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
    if (scoreTargetMode) {
      const raw = next.reduce((sum, item) => sum + uiDartScore(item), 0);
      const selected = state.territories.find((territory) => territory.id === state.selectedTerritoryId) || null;
      setNotice(selected ? `${raw}/${selected.target} pts · ${selected.name}` : `${raw} pts · sélectionne une zone ou valide pour chercher la cible correspondante`);
    }
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
    const important = [...(visit?.events || [])].reverse().find((event: any) => scoreTargetMode
      ? ["extinguished","destroyed","spread_blocked","canadair","spread","water","useless"].includes(event.type)
      : ["extinguished","destroyed","spread_blocked","canadair","spread"].includes(event.type));
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
      singles: playerRows.reduce((sum, row) => sum + Number(row.singles || 0), 0),
      doubles: playerRows.reduce((sum, row) => sum + Number(row.doubles || 0), 0),
      triples: playerRows.reduce((sum, row) => sum + Number(row.triples || 0), 0),
      smokeCleared: playerRows.reduce((sum, row) => sum + Number(row.smokeCleared || 0), 0),
      uselessDarts: playerRows.reduce((sum, row) => sum + Number(row.uselessDarts || 0), 0),
      criticalInterventions: playerRows.reduce((sum, row) => sum + Number(row.criticalInterventions || 0), 0),
      bestVisitScore: Math.max(0, ...playerRows.map((row) => Number(row.bestVisitScore || 0))),
      exactTargetAttempts: state.history.filter((visit) => visit.targetMode === "visit_score").length,
      exactTargetHits: state.history.filter((visit) => visit.targetMode === "visit_score" && Number(visit.matchedTargetScore || 0) > 0).length,
      maxCombo: Math.max(0, state.combo, ...state.history.map((visit) => Number(visit.comboAfter || 0))),
      missionGrade: missionGrade?.grade || null,
      missionRating: missionGrade?.rating || 0,
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
      targetMode: state.targetMode || (Number(config.activeTerritories || 0) > 20 ? "visit_score" : "sector"),
      targetCalibration: state.targetCalibration || null,
      hitsBySegment: playerRows.reduce((acc, row) => { Object.entries(row.hitsBySegment || {}).forEach(([key, value]) => { acc[key] = Number(acc[key] || 0) + Number(value || 0); }); return acc; }, {} as Record<string, number>),
      finalStatusCounts: state.territories.filter((territory) => territory.playable).reduce((acc, territory) => { const key = String(fireStatus(territory) || "safe"); acc[key] = Number(acc[key] || 0) + 1; return acc; }, {} as Record<string, number>),
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
  const currentVisitPoints = throwDarts.reduce((sum, dart) => sum + uiDartScore(dart), 0);
  const scoreTargetMode = state.targetMode === "visit_score" || Number(config.activeTerritories || 0) > 20;
  const selectedScoreTarget = state.territories.find((territory) => territory.id === state.selectedTerritoryId && territory.playable && !territory.destroyed) || null;
  const maxDartsThisVisit = Math.max(1, Math.min(3, Number(config.dartsPerTurn || 3)));
  const canValidateVisit = throwDarts.length > 0 && !botThinking && !state.finished;
  const validateVisitLabel = throwDarts.length > 0 ? `VALIDER ${throwDarts.length}/${maxDartsThisVisit}` : "VALIDER";
  const centerScore = scoreTargetMode
    ? <div className="dff-play__water-score"><strong>🎯{currentVisitPoints}</strong><small>{selectedScoreTarget ? `/${selectedScoreTarget.target}` : `${throwDarts.length}/${maxDartsThisVisit}`}</small></div>
    : <div className="dff-play__water-score"><strong>💧{currentWater}</strong><small>{throwDarts.length}/{maxDartsThisVisit}</small></div>;
  const suggestions = dedupeTacticalSuggestions([primarySuggestion, ...(tacticalPlan.alternatives || [])]).slice(0, Math.max(1, Number(config.dartsPerTurn || 3)));
  const objectiveFlagSrc = getObjectiveCountryFlag(country, primarySuggestion?.territory || focusTerritory);
  const focusMeta = statusMeta(focusTerritory);

  return <div className="dff-play" data-firefighter-play-version={DARTS_FIREFIGHTER_PLAY_UI_VERSION} style={{ minHeight: "100dvh", color: text, background: `radial-gradient(circle at 50% -6%,${FIRE}22 0,${theme?.bg || "#080a11"} 42%,#020305 100%)`, paddingBottom: "calc(8px + env(safe-area-inset-bottom))", overflowX: "hidden" }}>
    <PageHeader
      tickerSrc={tickerFirefighter}
      tickerAlt="DARTS FIREFIGHTER"
      tickerHeight={68}
      tickerBottomGap={6}
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
        <CompactInfoCard title="OBJECTIF" value={primarySuggestion?.territory?.target || "—"} subtitle={null} color={primarySuggestion?.territory ? fireTerritoryColor(fireStatus(primarySuggestion.territory)) : (primarySuggestion?.color || WATER)} backgroundSrc={objectiveFlagSrc || undefined} badgeSrc={objectiveFlagSrc || undefined} onClick={() => setShowObjective(true)} />
        <CompactInfoCard title="TERRITOIRE" value={focusTerritory?.name || "AUCUN"} subtitle={focusTerritory ? <div className="dff-card-status-row"><span className="dff-card-status-pill is-compact" style={{ borderColor: `${focusMeta.color}66`, color: focusMeta.color, background: `${focusMeta.color}16` }}><OutlineIcon name={focusMeta.icon} size={13} /><b>{focusMeta.value}</b></span>{focusTerritory?.critical ? <span className="dff-card-status-pill is-critical"><OutlineIcon name="warning" size={12} /><b>!</b></span> : null}</div> : null} color={focusTerritory ? fireTerritoryColor(fireStatus(focusTerritory)) : activeColor} backgroundSrc={(getTerritoryDepartmentVisual(country, focusTerritory) || getMapBadgeAsset(country, focusTerritory) || undefined)} valueClassName="is-territory" cardClassName="is-territory-card" onClick={() => setShowTerritory(true)} />
        <FirefighterMapCard country={country} mapLabel={mapLabel} territory={focusTerritory} onClick={() => setShowMap(true)} />
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

    {showObjective ? <ObjectiveModal primary={primarySuggestion} alternatives={tacticalPlan.alternatives} config={config} state={state} country={country} onSelect={(id: string) => { selectTerritory(id); setShowObjective(false); }} onClose={() => setShowObjective(false)} /> : null}
    {showTerritory ? <TerritoryModal territory={focusTerritory} state={state} country={country} onOpenMap={(id: string) => { if (id) selectTerritory(id); setShowTerritory(false); setShowMap(true); }} onClear={clearTerritorySelection} onSelectTerritory={selectTerritory} onOpenAdvice={() => setShowActionPlanner(true)} onClose={() => setShowTerritory(false)} /> : null}
    {showMap ? <FirefighterMapModal state={state} country={country} map={fireMap} mapLabel={mapLabel} onClose={() => setShowMap(false)} onSelect={selectTerritory} onClearSelection={clearTerritorySelection} onOpenAdvice={() => setShowActionPlanner(true)} /> : null}
    {showTargets ? <TargetsModal state={state} country={country} onClose={() => setShowTargets(false)} onSelect={toggleTerritorySelection} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showStats ? <StatsModal state={state} currentStats={currentStats} activeProfile={activeProfile} config={config} onClose={() => setShowStats(false)} /> : null}
    {showActionPlanner && focusTerritory ? <ActionPlannerModal territory={focusTerritory} state={state} country={country} onClose={() => setShowActionPlanner(false)} /> : null}
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
        <div className="dff-play__turn-copy"><div style={{ color: active ? color : "#c4cad4" }}>{playerName(profile)}</div><small><b style={{ color: active ? color : "#d7dce6" }}>{Number(stats.score || 0)} pts</b> · {Number(stats.fireReduced || 0)} eau · {Number(stats.firesExtinguished || 0)} feux</small></div>
        {active ? <span className="dff-play__turn-arrow" style={{ color }}>›</span> : null}
      </div>;
    })}
  </div>;
}

function HeaderMiniStat({ label, value, color }: any) {
  return <div className="dff-play__mini-stat" style={{ borderColor: `${color}35`, background: `${color}0d` }}><div>{label}</div><strong style={{ color }}>{value}</strong></div>;
}

function CompactInfoCard({ title, value, subtitle, color, onClick, backgroundSrc, badgeSrc, valueClassName = "", cardClassName = "" }: any) {
  const compactValue = title === "OBJECTIF" && String(value || "").trim() !== "—";
  const hasVisualBackground = Boolean(backgroundSrc);
  return <button className={`dff-play__info-card ${hasVisualBackground ? "has-visual-background" : ""} ${cardClassName}`.trim()} type="button" onClick={onClick} style={{ borderColor: `${color}58`, background: `radial-gradient(circle at 50% 130%,${color}1d,rgba(3,5,10,.97) 68%)` }}>
    {backgroundSrc ? <img src={backgroundSrc} alt="" aria-hidden className="dff-play__info-background" /> : null}
    <div className="dff-play__info-shade" />
    <span className="dff-play__info-title" style={{ color }}>{title}</span>
    {badgeSrc ? <span className="dff-play__info-badge"><img src={badgeSrc} alt="" aria-hidden /></span> : null}
    <strong className={`dff-play__info-value ${valueClassName}`.trim()} style={{ color: compactValue ? color : (title === "OBJECTIF" ? GOLD : "#fff"), fontSize: compactValue ? 26 : undefined }}>{value}</strong>
    {subtitle ? <span className="dff-play__info-subtitle">{subtitle}</span> : null}
  </button>;
}

function FirefighterMapCard({ country, mapLabel, territory, onClick }: any) {
  const countryFlag = getCountryMapFlag(country);
  const territoryColor = territory ? fireTerritoryColor(fireStatus(territory)) : FIRE;
  return <button className="dff-play__info-card dff-play__map-card is-simple" type="button" onClick={onClick} style={{ borderColor: `${territoryColor}58` }}>
    {countryFlag ? <img src={countryFlag} alt="" aria-hidden className="dff-play__map-flag-background" /> : null}
    <div className="dff-play__map-shade" />
    <span className="dff-play__info-title dff-play__map-title" style={{ color: territoryColor }}>CARTE</span>
    {!countryFlag ? <strong className="dff-play__map-label">{mapLabel}</strong> : null}
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
  if (name === "wind") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M3 8h10a3 3 0 1 0-3-3"/><path {...p} d="M2 12h15a3 3 0 1 1-3 3"/><path {...p} d="M4 16h7"/></svg>;
  if (name === "map") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" /></svg>;
  if (name === "clear") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9" /><path {...p} d="M12 10v6M12 7h.01" /></svg>;
}

function OutlineActionButton({ name, label, color, onClick }: any) {
  return <button type="button" className="dff-play__outline-action" onClick={onClick} style={{ color, borderColor: `${color}52`, background: `${color}0c` }} title={label}><OutlineIcon name={name} size={19} /><span>{label}</span></button>;
}

function FloatingPanel({ title, subtitle, accent = WATER, onClose, children, wide = false, panelClassName = "", bodyClassName = "" }: any) {
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return <div className="dff-modal" role="dialog" aria-modal="true" onClick={onClose}>
    <div className={`dff-modal__panel ${wide ? "is-wide" : ""} ${panelClassName}`.trim()} onClick={(event) => event.stopPropagation()} style={{ borderColor: `${accent}66` }}>
      <header className="dff-modal__header"><div><div className="dff-modal__title" style={{ color: accent }}>{title}</div>{subtitle ? <div className="dff-modal__subtitle">{subtitle}</div> : null}</div><button type="button" className="dff-modal__close" onClick={onClose} aria-label="Fermer"><OutlineIcon name="close" size={24} /></button></header>
      <div className={`dff-modal__body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  </div>;
}

function ObjectiveModal({ primary, alternatives, config, state, country, onSelect, onClose }: any) {
  const rows = dedupeTacticalSuggestions([primary, ...(alternatives || [])]);
  return <FloatingPanel title="OBJECTIFS CONSEILLÉS" subtitle="Touchez une cible pour préparer vos options d’intervention." accent={primary?.color || WATER} onClose={onClose}>
    <div className="dff-objective-list">{rows.length ? rows.map((suggestion: TacticalSuggestion, index: number) => {
      const territoryColor = fireTerritoryColor(fireStatus(suggestion.territory));
      const meta = statusMeta(suggestion.territory);
      const actionRows = buildTerritoryActionRows(suggestion.territory, state);
      const canadairRow = suggestion.kind === "canadair" ? actionRows.find((row) => row.kind === "canadair") : null;
      const points = Number(suggestion.estimatedPoints || estimateSuggestionPoints(suggestion, state));
      return <button key={`${suggestion.territory.id}-${index}`} type="button" className={`dff-objective-row ${suggestion.kind === "canadair" ? "is-canadair" : ""}`} onClick={() => onSelect(suggestion.territory.id)} style={{ borderColor: `${territoryColor}55` }}>
        {suggestion.kind === "canadair" ? <><img src={levelFire2} className="dff-canadair-scene" alt="" aria-hidden /><div className="dff-canadair-watermark" aria-hidden><span>✈</span><i>💧 💧 💧</i></div></> : null}
        <strong style={{ color: territoryColor }}>{suggestion.territory.target}</strong>
        <div className="dff-objective-row__copy"><b>{suggestion.territory.name}</b><span>{suggestion.action}</span><small><span className="dff-inline-status-pill is-compact" style={{ color: meta.color }}><OutlineIcon name={meta.icon} size={12} /><b>{meta.value}</b></span></small>{canadairRow?.impacts?.length ? <CanadairImpactStrip impacts={canadairRow.impacts} country={country} /> : null}</div>
        <div className="dff-objective-row__points"><b>+{points}</b><small>PTS</small></div>
      </button>;
    }) : <div className="dff-empty">Aucune urgence détectée.</div>}</div>
    <div className="dff-help-box"><b>RÈGLE CLAIRE</b>{Number(config.activeTerritories || 0) > 20 ? <><span>Grande carte : une seule intervention normale est résolue par volée à partir des fléchettes numérotées. Bull/DBull restent séparés s’ils ne sont pas consommés par la combinaison exacte.</span><span>La première carte est l’action estimée la plus rentable selon danger, difficulté du geste, taille de la cible et effet réel.</span></> : <><span>Petite carte : {config.multiInterventionPerDart !== false ? "mode multi-zones actif, chaque fléchette numérotée peut agir sur un territoire différent." : "une seule intervention normale par volée."}</span><span>Simple = 1 eau · Double = 2 · Triple = 3.</span></>}</div>
  </FloatingPanel>;
}

function TerritoryModal({ territory, state, country, onOpenMap, onClear, onSelectTerritory, onOpenAdvice, onClose }: any) {
  if (!territory) return <FloatingPanel title="TERRITOIRE" subtitle="Aucune zone ciblée." accent={WATER} onClose={onClose}><div className="dff-empty">Sélectionne une suggestion ou une zone sur la carte.</div><button type="button" className="dff-modal__primary" onClick={onOpenMap}><OutlineIcon name="map" /> OUVRIR LA CARTE</button></FloatingPanel>;
  const color = fireTerritoryColor(fireStatus(territory));
  return <FloatingPanel title={territory.name} subtitle={null} accent={color} onClose={onClose}>
    <TerritoryInsightBody territory={territory} state={state} country={country} onClear={state.selectedTerritoryId ? onClear : undefined} onOpenAdvice={onOpenAdvice} onSelectTerritory={onSelectTerritory} />
    <div className="dff-modal__actions"><button type="button" onClick={() => onOpenMap?.(territory.id)}><OutlineIcon name="map" /> VOIR SUR LA CARTE</button>{state.selectedTerritoryId ? <button type="button" onClick={onClear}><OutlineIcon name="close" /> DÉSÉLECTIONNER</button> : null}{onOpenAdvice ? <button type="button" onClick={onOpenAdvice}><OutlineIcon name="target" /> ACTIONS</button> : null}</div>
  </FloatingPanel>;
}

function WindCompass({ enabled, state }: { enabled: boolean; state: DartsFirefighterState }) {
  const meta = windMeta(state);
  return <div className={`dff-wind-compass ${enabled ? "is-on" : "is-off"}`} aria-label={enabled ? `Vent de ${meta.source} vers ${meta.target} · ${meta.strength}` : "Vent désactivé"}>
    <div className="dff-wind-compass__head">
      <span className="dff-wind-compass__navicon" aria-hidden><OutlineIcon name="wind" size={16} /></span>
      <div className="dff-wind-compass__copy"><b>VENT</b><span>{enabled ? `${meta.source} → ${meta.target}` : "DÉSACTIVÉ"}</span></div>
    </div>
    <div className="dff-wind-compass__rose" aria-hidden>
      {WIND_16_UI.map((code, index) => {
        const angle = (index * Math.PI) / 8;
        const radius = 43;
        const x = 50 + Math.sin(angle) * radius;
        const y = 50 - Math.cos(angle) * radius;
        const activeFrom = enabled && index === meta.sourceIndex;
        const activeTo = enabled && index === meta.targetIndex;
        return <span key={code} className={`dff-wind-compass__dir ${activeFrom ? "is-from" : ""} ${activeTo ? "is-to" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>{code}</span>;
      })}
      <svg className="dff-wind-compass__star" viewBox="0 0 80 80">
        <g fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.1">
          <circle cx="40" cy="40" r="23" />
          <circle cx="40" cy="40" r="13" />
          <path d="M40 7 46 31 40 73 34 31Z" fill="currentColor" fillOpacity=".12" />
          <path d="M7 40 31 34 73 40 31 46Z" fill="currentColor" fillOpacity=".10" />
          <path d="M17 17 35 31 63 63 31 45Z" fill="currentColor" fillOpacity=".06" />
          <path d="M63 17 45 31 17 63 39 45Z" fill="currentColor" fillOpacity=".06" />
        </g>
      </svg>
      <svg className="dff-wind-compass__arrow" viewBox="0 0 40 40" style={{ transform: `rotate(${meta.rotation}deg)` }}>
        <path d="M20 31V10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="m12 17 8-9 8 9" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="26" r="3" fill="currentColor" opacity=".92" />
      </svg>
    </div>
    <div className="dff-wind-compass__meta"><span>PUISS. <b>{enabled ? meta.strength : "OFF"}</b></span><span>CHGT <b>{enabled ? `${meta.turnsLeft}T` : "—"}</b></span></div>
  </div>;
}

function ActionPlannerModal({ territory, state, country, onClose }: any) {
  const color = fireTerritoryColor(fireStatus(territory));
  const rows = buildTerritoryActionRows(territory, state);
  return <FloatingPanel title="ACTIONS POSSIBLES" subtitle={territory ? `${territory.name} · cible ${territory.target}` : ""} accent={color} onClose={onClose}>
    <div className="dff-action-planner">{rows.map((row, index) => <article key={`${row.label}-${index}`} className={`dff-action-row ${row.best ? "is-best" : ""} ${row.kind === "canadair" ? "is-canadair" : ""}`} style={{ borderColor: `${row.color}66`, background: `linear-gradient(180deg, ${row.color}${row.best ? "1d" : "12"}, rgba(5,8,14,.74))` }}>
      {row.kind === "canadair" ? <><img src={levelFire2} className="dff-canadair-scene" alt="" aria-hidden /><div className="dff-canadair-watermark" aria-hidden><span>✈</span><i>💧 💧 💧</i></div></> : null}
      <header>
        <div className="dff-action-row__name"><strong style={{ color: row.color }}>{row.label}</strong>{row.best ? <span>MEILLEURE ACTION</span> : null}</div>
        <div className="dff-action-row__score"><b>+{row.points}</b><small>PTS</small></div>
      </header>
      <div className="dff-action-row__detail">{row.detail}</div>
      <p>{row.result}</p>
      {row.kind === "canadair" ? <CanadairImpactStrip impacts={row.impacts} country={country} /> : null}
    </article>)}</div>
    <div className="dff-help-box"><b>POINTS ESTIMÉS</b><span>Le score combine difficulté d’exécution, danger réel, taille de la cible et effet obtenu.</span><span>Une combinaison exacte difficile peut dépasser un DBULL isolé. Le Canadair prend l’avantage seulement s’il produit réellement plusieurs effets utiles.</span><span>La meilleure action disponible est toujours placée en première position.</span></div>
  </FloatingPanel>;
}

function FirefighterMapModal({ state, country, map, mapLabel, onClose, onSelect, onClearSelection, onOpenAdvice }: any) {
  const countryFlag = getCountryMapFlag(country);
  const [showMapControls, setShowMapControls] = React.useState(false);
  const [detailsTerritoryId, setDetailsTerritoryId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const selectedTarget = state.territories.find((territory: FireTerritory) => territory.id === state.selectedTerritoryId) || null;
  const detailsTerritory = state.territories.find((territory: FireTerritory) => territory.id === detailsTerritoryId) || null;
  const accent = detailsTerritory ? fireTerritoryColor(fireStatus(detailsTerritory)) : selectedTarget ? fireTerritoryColor(fireStatus(selectedTarget)) : FIRE;
  const filterIds = statusFilter ? state.territories.filter((territory: FireTerritory) => territory.playable && fireStatus(territory) === statusFilter).map((territory: FireTerritory) => territory.id) : [];
  const filterButtons = [
    { key: "smoke", label: "💨", value: "1" },
    { key: "fire1", label: "🔥", value: "1" },
    { key: "fire2", label: "🔥", value: "2" },
    { key: "fire3", label: "🔥", value: "3" },
    { key: "protected", label: "💧", value: "1-3" },
  ];
  const handleMapSelect = (id: string) => { onSelect?.(id); setDetailsTerritoryId(id); };
  const clearDetails = () => { setDetailsTerritoryId(null); onClearSelection?.(); };
  return <FloatingPanel title="CARTE D’INTERVENTION" subtitle={mapLabel} accent={accent} onClose={onClose} wide panelClassName="dff-map-panel" bodyClassName="dff-map-panel__body">
    <div className={`dff-map-modal ${detailsTerritory ? "has-territory" : ""}`}>
      {!detailsTerritory ? <div className="dff-map-legend">{filterButtons.map((item) => {
        const count = state.territories.filter((territory: FireTerritory) => territory.playable && fireStatus(territory) === item.key).length;
        return <button key={item.key} type="button" className={`dff-map-legend__chip is-${item.key} ${statusFilter === item.key ? "is-active" : ""}`} onClick={() => setStatusFilter((current) => current === item.key ? null : item.key)} title={`Mettre en surbrillance : ${item.key}`}><span>{item.label}</span><b>{item.value}</b><small>{count}</small></button>;
      })}</div> : null}
      <div className="dff-map-modal__viewport-wrap">
        {!detailsTerritory && countryFlag ? <div className="dff-map-modal__country-badge"><img src={countryFlag} alt="" aria-hidden /></div> : null}
        {!detailsTerritory ? <WindCompass enabled={Boolean(state.config?.windEnabled)} state={state} /> : null}
        <div className="dff-map-modal__viewport"><TerritoriesMapView country={country} map={map} ownerColors={FIRE_STATUS_OWNER_COLORS} selectedTerritoryId={state.selectedTerritoryId || undefined} highlightTerritoryIds={filterIds} activeColor={WATER} themeColor={FIRE} interactive={!state.finished && !detailsTerritory} onSelectTerritory={handleMapSelect} isSelectableTerritoryId={(id) => Boolean(state.territories.find((territory: FireTerritory) => territory.id === id && territory.playable && !territory.destroyed))} showViewportControls={showMapControls} showViewportHint={false} style={{ width: "100%", height: "100%" }} /></div>
        {detailsTerritory ? <div className="dff-map-territory-overlay" role="region" aria-label={`Détails de ${detailsTerritory.name}`}><TerritoryInsightBody territory={detailsTerritory} state={state} country={country} compact onClear={clearDetails} onOpenAdvice={() => onOpenAdvice?.(detailsTerritory)} onSelectTerritory={(id: string) => { onSelect?.(id); setDetailsTerritoryId(id); }} /></div> : null}
        {!detailsTerritory ? <button type="button" className={`dff-map-controls-toggle ${showMapControls ? "is-active" : ""}`} onClick={() => setShowMapControls((value) => !value)}>{showMapControls ? "MASQUER COMMANDES" : "COMMANDES CARTE"}</button> : null}
      </div>
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

function TargetsModal({ state, country, onClose, onSelect }: any) {
  const rows = state.territories.filter((territory: FireTerritory) => territory.playable).sort((a: FireTerritory, b: FireTerritory) => a.target - b.target);
  return <FloatingPanel title="CIBLES DE LA MISSION" subtitle="Touchez une zone pour la sélectionner ou la désélectionner." accent={GOLD} onClose={onClose} wide>
    <div className="dff-target-grid">{rows.map((territory: FireTerritory) => {
      const status = fireStatus(territory);
      const color = fireTerritoryColor(status);
      const active = state.selectedTerritoryId === territory.id;
      const meta = statusMeta(territory);
      const isSafe = status === "safe";
      return <button key={territory.id} type="button" disabled={territory.destroyed} className={`dff-target-row is-${status} ${active ? "is-selected" : ""}`} onClick={() => onSelect(territory.id)} style={{ borderColor: active ? WATER : (isSafe ? "rgba(255,255,255,.12)" : `${color}88`), boxShadow: active ? `0 0 16px ${WATER}35` : (isSafe ? "none" : `0 0 16px ${color}18`) }}>
        <div className="dff-target-row__shape"><TerritorySilhouetteBadge country={country} territory={territory} color={isSafe ? "#5c6470" : color} height={42} showValue={false} visualMode="status" /></div>
        <strong style={{ color: isSafe ? "#aab1bd" : GOLD }}>{territory.target}</strong>
        <div className="dff-target-row__copy"><b>{territory.name}</b>{!isSafe ? <span style={{ color }}><OutlineIcon name={meta.icon} size={12} /><strong>{meta.value}</strong>{territory.critical ? <em>CRITIQUE</em> : null}</span> : <span className="is-safe-label">SAIN</span>}</div>
      </button>;
    })}</div>
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
