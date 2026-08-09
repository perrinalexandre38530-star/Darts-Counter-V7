// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — CONFIGURATION V3
// Configuration guidée + complète, reliée au moteur de jeu.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import { TERRITORY_MAPS } from "../lib/territories/maps";
import { buildTerritoriesMap } from "../territories/map";
import { buildTerritoryValueCalibration } from "../territories/territoryValueBalancing";
import { buildUniqueTerritoryValues, MAX_PLAYABLE_TERRITORIES } from "../territories/territoryValueRules";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import {
  dartsFirefighterDifficultyRules,
  difficultyLabel,
  normalizeDartsFirefighterConfig,
  type DartsFirefighterConfigPayload,
  type DartsFirefighterDifficulty,
} from "../lib/gameEngines/dartsFirefighterEngine";
import {
  PillButton,
  SelectedParticipantsCompactBlock,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";
import missionExpressBg from "../assets/firefighter_missions/mission_express.webp";
import missionWildfireBg from "../assets/firefighter_missions/mission_wildfire.webp";
import missionCivilProtectionBg from "../assets/firefighter_missions/mission_civil_protection.webp";
import missionInfernoBg from "../assets/firefighter_missions/mission_inferno.webp";
import missionCustomBg from "../assets/firefighter_missions/mission_custom.webp";

const LS_KEY = "dc_modecfg_darts_firefighter_v3";
const LEGACY_LS_KEYS = ["dc_modecfg_darts_firefighter_v2", "dc_modecfg_darts_firefighter_v1"];
const VIEW_KEY = "dc_firefighter_config_view_v3";
const FIRE = "#ff6128";
const FIRE_2 = "#ff9b32";
const WATER = "#27c9ff";
const GOLD = "#ffd66b";
const GREEN = "#61e8a9";
const RED = "#ff6472";

type BotLevel = "easy" | "normal" | "hard";
type ViewMode = "guided" | "complete";
type StepKey = "mission" | "brigade" | "territory" | "ignition" | "propagation" | "resources" | "input" | "summary";

function readSaved() {
  for (const key of [LS_KEY, ...LEGACY_LS_KEYS]) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (value && typeof value === "object") return value;
    } catch {}
  }
  return {};
}
function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}
function unique(ids: any[]) {
  return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
}
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function pct(value: number) { return `${Math.round(Number(value || 0) * 100)} %`; }

const MAP_OPTIONS = Object.values(TERRITORY_MAPS)
  .filter((map: any) => map?.id)
  .sort((a: any, b: any) => {
    const priority = ["FR", "EU", "WORLD", "UN"];
    const ai = priority.indexOf(a.id);
    const bi = priority.indexOf(b.id);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "fr");
  })
  .map((map: any) => ({ value: map.id, label: map.name || map.id }));

const PRESETS: Array<{ id: string; icon: string; title: string; subtitle: string; accent: string; patch: any }> = [
  {
    id: "express", icon: "⚡", title: "Intervention express", subtitle: "Mission courte, lisible et accessible", accent: GOLD,
    patch: {
      difficulty: "recruit", objective: "extinguish_all", activeTerritories: 12, initialFires: 2, initialFireLevel: "mixed", initialSmoke: 0,
      firePlacement: "random", initialProtectedTerritories: 2, criticalTerritories: 1, criticalLossEndsMission: true, maxRounds: 10, destructionLimit: 5,
      propagationTiming: "after_round", maxSpreadsPerCycle: 1, reinforcementEveryRounds: 0, reinforcementCount: 1, windEnabled: true, windStrength: "light", windChangeEvery: 3, forecastEnabled: true,
      forecastCount: 3, dartsPerTurn: 3, missEndsTurn: false, comboEnabled: true, perfectVisitBonus: 150,
      bullAirSupport: true, bullPower: 2, canadairCenterPower: 3, canadairNeighborPower: 1, canadairNeighborCount: 2,
      canadairRequiresGauge: false, canadairGaugeCost: 35, startingBrigadeGauge: 25, targetOrder: "sequential",
    },
  },
  {
    id: "wildfire", icon: "🔥", title: "Feu de forêt", subtitle: "La mission équilibrée de référence", accent: FIRE,
    patch: {
      difficulty: "firefighter", objective: "extinguish_all", activeTerritories: 20, initialFires: 4, initialFireLevel: "mixed", initialSmoke: 2,
      firePlacement: "clustered", initialProtectedTerritories: 1, criticalTerritories: 2, criticalLossEndsMission: true, maxRounds: 18, destructionLimit: 4,
      propagationTiming: "after_visit", maxSpreadsPerCycle: 2, reinforcementEveryRounds: 0, reinforcementCount: 1, windEnabled: true, windStrength: "normal", windChangeEvery: 3, forecastEnabled: true,
      forecastCount: 4, dartsPerTurn: 3, missEndsTurn: false, comboEnabled: true, perfectVisitBonus: 200,
      bullAirSupport: true, bullPower: 2, canadairCenterPower: 3, canadairNeighborPower: 1, canadairNeighborCount: 3,
      canadairRequiresGauge: false, canadairGaugeCost: 35, startingBrigadeGauge: 15, targetOrder: "sequential",
    },
  },
  {
    id: "civil_protection", icon: "🛡️", title: "Protection civile", subtitle: "Tenir les zones critiques jusqu’aux renforts", accent: WATER,
    patch: {
      difficulty: "commander", objective: "protect_critical", activeTerritories: 16, initialFires: 3, initialFireLevel: 2, initialSmoke: 2,
      firePlacement: "critical_first", initialProtectedTerritories: 3, criticalTerritories: 4, criticalLossEndsMission: true, maxRounds: 16, destructionLimit: 3,
      propagationTiming: "after_visit", maxSpreadsPerCycle: 2, reinforcementEveryRounds: 4, reinforcementCount: 1, windEnabled: true, windStrength: "normal", windChangeEvery: 2, forecastEnabled: true,
      forecastCount: 5, dartsPerTurn: 3, missEndsTurn: false, comboEnabled: true, perfectVisitBonus: 250,
      bullAirSupport: true, bullPower: 2, canadairCenterPower: 3, canadairNeighborPower: 1, canadairNeighborCount: 4,
      canadairRequiresGauge: true, canadairGaugeCost: 35, startingBrigadeGauge: 35, targetOrder: "random",
    },
  },
  {
    id: "inferno_survival", icon: "☠️", title: "Survie Inferno", subtitle: "Résister à un incendie qui ne s’arrête jamais", accent: RED,
    patch: {
      difficulty: "inferno", objective: "survival", activeTerritories: 20, initialFires: 6, initialFireLevel: 3, initialSmoke: 3,
      firePlacement: "clustered", initialProtectedTerritories: 0, criticalTerritories: 3, criticalLossEndsMission: true, maxRounds: 20, destructionLimit: 2,
      propagationTiming: "after_visit", maxSpreadsPerCycle: 4, reinforcementEveryRounds: 2, reinforcementCount: 2, windEnabled: true, windStrength: "strong", windChangeEvery: 1, forecastEnabled: true,
      forecastCount: 4, dartsPerTurn: 3, missEndsTurn: true, comboEnabled: true, perfectVisitBonus: 350,
      bullAirSupport: true, bullPower: 2, canadairCenterPower: 3, canadairNeighborPower: 2, canadairNeighborCount: 4,
      canadairRequiresGauge: true, canadairGaugeCost: 45, startingBrigadeGauge: 0, targetOrder: "random",
    },
  },
];

const MISSION_BACKGROUNDS: Record<string, string> = {
  express: missionExpressBg,
  wildfire: missionWildfireBg,
  civil_protection: missionCivilProtectionBg,
  inferno_survival: missionInfernoBg,
  custom: missionCustomBg,
};

const MISSION_META: Record<string, { kicker: string; chips: string[] }> = {
  express: { kicker: "DÉPLOIEMENT RAPIDE", chips: ["COURTE", "ACCESSIBLE", "RENFORTS MOBILES"] },
  wildfire: { kicker: "FRONT DE FEU", chips: ["ÉQUILIBRÉE", "PROPAGATION", "CARTE ÉTENDUE"] },
  civil_protection: { kicker: "DÉFENSE PRIORITAIRE", chips: ["ZONES CRITIQUES", "RENFORTS", "COOPÉRATION"] },
  inferno_survival: { kicker: "SURVIE EXTRÊME", chips: ["INFERNO", "VENT FORT", "PRESSION MAX"] },
  custom: { kicker: "CENTRE DE COMMANDEMENT", chips: ["PARAMÈTRES LIBRES", "CARTE LIBRE", "OBJECTIF LIBRE"] },
};

const STEP_META: Array<{ key: StepKey; title: string; short: string; icon: string; subtitle: string }> = [
  { key: "mission", title: "Mission", short: "MISSION", icon: "🚨", subtitle: "Choisis le scénario et l’objectif de l’intervention." },
  { key: "brigade", title: "Brigade", short: "BRIGADE", icon: "👨‍🚒", subtitle: "Compose l’équipe, ajoute des Bots et attribue les sets." },
  { key: "territory", title: "Territoire", short: "CARTE", icon: "🗺️", subtitle: "Sélectionne la carte, les zones actives et leurs secteurs." },
  { key: "ignition", title: "Départ du feu", short: "FEU", icon: "🔥", subtitle: "Définis les foyers, la fumée et les zones critiques." },
  { key: "propagation", title: "Propagation", short: "VENT", icon: "🌬️", subtitle: "Règle la vitesse du feu, le vent et les prévisions." },
  { key: "resources", title: "Moyens", short: "MOYENS", icon: "🚒", subtitle: "Configure l’eau, le Bull, le Canadair et la jauge." },
  { key: "input", title: "Partie", short: "PARTIE", icon: "🎯", subtitle: "Règle la volée, la saisie, le MISS et les bonus." },
  { key: "summary", title: "Résumé", short: "RÉSUMÉ", icon: "✅", subtitle: "Vérifie l’ensemble de la mission avant le départ." },
];

function ChoiceCard({ active, icon, title, subtitle, accent, onClick, badge }: any) {
  return <button type="button" onClick={onClick} style={{
    width: "100%", minHeight: 82, padding: 10, borderRadius: 15, textAlign: "left", cursor: "pointer",
    border: `1px solid ${active ? accent : "rgba(255,255,255,.10)"}`,
    background: active ? `linear-gradient(135deg,${accent}24,rgba(255,255,255,.04))` : "rgba(255,255,255,.035)",
    boxShadow: active ? `0 0 20px ${accent}22` : "none", color: "#fff",
  }}>
    <div style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr)", gap: 8, alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: `${accent}18`, border: `1px solid ${accent}55`, fontSize: 17 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}><strong style={{ color: active ? accent : "#fff", fontSize: 11.5 }}>{title}</strong>{badge ? <span style={{ color: accent, fontSize: 7.5, fontWeight: 1000 }}>{badge}</span> : null}</div>
        <div style={{ marginTop: 3, color: "#9da4b7", fontSize: 8.8, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
    </div>
  </button>;
}

function MissionPresetCard({ active, icon, title, subtitle, accent, onClick, badge, background, kicker, chips, objective }: any) {
  return <button type="button" onClick={onClick} style={{
    position: "relative", overflow: "hidden", isolation: "isolate",
    flex: "0 0 clamp(248px,76vw,310px)", width: "clamp(248px,76vw,310px)", minHeight: 184,
    padding: 12, borderRadius: 18, textAlign: "left", cursor: "pointer", scrollSnapAlign: "start",
    border: `1px solid ${active ? accent : "rgba(255,255,255,.12)"}`,
    background: "rgba(6,9,15,.96)", color: "#fff",
    boxShadow: active ? `0 0 28px ${accent}36, inset 0 0 0 1px ${accent}28` : "0 10px 24px rgba(0,0,0,.24)",
    transform: active ? "translateY(-1px)" : "none", transition: "border-color .18s ease, box-shadow .18s ease, transform .18s ease",
  }}>
    <img src={background} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: active ? .46 : .31, filter: active ? "saturate(1.08) contrast(1.04)" : "saturate(.88) contrast(1.02)" }} />
    <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(3,6,10,.06) 0%,rgba(3,6,10,.38) 39%,rgba(3,6,10,.96) 100%)" }} />
    <span aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 16% 8%,${accent}25,transparent 42%)` }} />
    <span style={{ position: "relative", zIndex: 1, minHeight: 158, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 9, alignItems: "center", minWidth: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `${accent}25`, border: `1px solid ${accent}72`, fontSize: 19, backdropFilter: "blur(3px)" }}>{icon}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: accent, fontSize: 7.8, fontWeight: 1100, letterSpacing: .85 }}>{kicker}</span>
            <strong style={{ display: "block", marginTop: 2, color: "#fff", fontSize: 14, lineHeight: 1.12, textShadow: "0 2px 8px rgba(0,0,0,.8)" }}>{title}</strong>
          </span>
        </span>
        <span style={{ flex: "0 0 auto", padding: "5px 8px", borderRadius: 999, background: `${accent}22`, border: `1px solid ${accent}58`, color: active ? "#fff" : accent, fontSize: 7.2, fontWeight: 1100, letterSpacing: .5 }}>{badge}</span>
      </span>
      <span style={{ display: "block", color: "#e5e9f1", fontSize: 8.8, lineHeight: 1.38, textShadow: "0 2px 7px rgba(0,0,0,.8)" }}>{subtitle}</span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {(chips || []).map((chip: string) => <span key={chip} style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(2,5,9,.52)", border: "1px solid rgba(255,255,255,.13)", color: "#f3f6fb", fontSize: 6.8, fontWeight: 1000, backdropFilter: "blur(3px)" }}>{chip}</span>)}
      </span>
      <span style={{ display: "block", marginTop: "auto", padding: "8px 9px", borderRadius: 12, background: "rgba(2,5,9,.58)", border: `1px solid ${active ? accent + "4d" : "rgba(255,255,255,.10)"}`, backdropFilter: "blur(4px)" }}>
        <span style={{ display: "block", color: active ? accent : "#b8c0cf", fontSize: 6.7, fontWeight: 1100, letterSpacing: .55 }}>OBJECTIF DE MISSION</span>
        <span style={{ display: "block", marginTop: 3, color: "#fff", fontSize: 8.2, lineHeight: 1.3, fontWeight: 900 }}>{objective}</span>
      </span>
    </span>
  </button>;
}

function ConfigAccordion({ title, subtitle, icon, color = WATER, badge, defaultOpen = false, children }: any) {
  return <details open={defaultOpen || undefined} style={{
    borderRadius: 14,
    border: `1px solid ${color}34`,
    background: "rgba(255,255,255,.025)",
    overflow: "hidden",
  }}>
    <summary style={{
      minHeight: 48,
      padding: "8px 10px",
      cursor: "pointer",
      listStyle: "none",
      display: "grid",
      gridTemplateColumns: "30px minmax(0,1fr) auto",
      gap: 8,
      alignItems: "center",
      userSelect: "none",
    }}>
      <span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: `${color}16`, border: `1px solid ${color}48`, fontSize: 15 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: "block", color: "#f5f7fb", fontSize: 10.2, lineHeight: 1.2 }}>{title}</strong>
        {subtitle ? <small style={{ display: "block", marginTop: 2, color: "#8f98aa", fontSize: 7.6, lineHeight: 1.3 }}>{subtitle}</small> : null}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {badge ? <b style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color, fontSize: 7, letterSpacing: .35 }}>{badge}</b> : null}
        <span style={{ color, fontSize: 13, fontWeight: 1100 }}>⌄</span>
      </span>
    </summary>
    <div style={{ padding: "2px 8px 9px", display: "grid", gap: 7 }}>{children}</div>
  </details>;
}

function PresetConfigurationNotice({ preset, config, onCustomize }: any) {
  if (!preset) return null;
  const objective = config.objective === "survival" ? `Survivre ${config.maxRounds} rounds` : config.objective === "protect_critical" ? `Protéger ${config.criticalTerritories} zones critiques` : "Éteindre tous les foyers";
  return <div style={{ marginTop: 9, padding: 10, borderRadius: 14, border: `1px solid ${preset.accent}46`, background: `linear-gradient(135deg,${preset.accent}13,rgba(4,7,12,.88))`, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: preset.accent, fontSize: 8, fontWeight: 1100, letterSpacing: .5 }}>MISSION PRÉCONFIGURÉE</div>
      <div style={{ marginTop: 3, color: "#fff", fontSize: 10.2, fontWeight: 1000 }}>{preset.title} · {difficultyLabel(config.difficulty)}</div>
      <div style={{ marginTop: 3, color: "#9da6b8", fontSize: 7.8, lineHeight: 1.35 }}>{objective}. Les réglages secondaires sont déjà optimisés pour ce scénario.</div>
    </div>
    <button type="button" onClick={onCustomize} style={{ minHeight: 34, padding: "0 10px", borderRadius: 11, border: `1px solid ${preset.accent}66`, background: `${preset.accent}15`, color: preset.accent, fontSize: 7.5, fontWeight: 1100 }}>PERSONNALISER</button>
  </div>;
}

function SectionTitle({ icon, title, subtitle, color = WATER }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 9, alignItems: "center", marginBottom: 10 }}>
    <div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", fontSize: 17, background: `${color}16`, border: `1px solid ${color}50` }}>{icon}</div>
    <div><div style={{ color, fontSize: 12.2, fontWeight: 1100, letterSpacing: .7 }}>{title}</div><div style={{ marginTop: 2, color: "#939bae", fontSize: 8.7, lineHeight: 1.35 }}>{subtitle}</div></div>
  </div>;
}

function MiniMetric({ label, value, color = "#fff", icon }: any) {
  return <div style={{ padding: "8px 4px", borderRadius: 12, textAlign: "center", background: `${color}0e`, border: `1px solid ${color}35`, minWidth: 0 }}>
    <div style={{ fontSize: 12 }}>{icon}</div><div style={{ marginTop: 1, color, fontSize: 13, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div><div style={{ marginTop: 2, color: "#8f96a8", fontSize: 6.7, fontWeight: 1000, letterSpacing: .35 }}>{label}</div>
  </div>;
}

function Rules({ config }: { config: any }) {
  const objective = config.objective === "survival" ? "Résister jusqu’à la fin des rounds." : config.objective === "protect_critical" ? "Protéger les zones critiques jusqu’aux renforts." : "Éteindre tous les foyers.";
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: FIRE }}>OBJECTIF</strong><br />{objective}</div>
    <div><strong style={{ color: WATER }}>PUISSANCE D’EAU</strong><br />Simple = 1 · Double = 2 · Triple = 3. Le surplus refroidit et protège la zone.</div>
    <div><strong style={{ color: GOLD }}>PROPAGATION</strong><br />Le feu grandit selon la difficulté, le vent et la fréquence choisie. Une protection absorbe une propagation.</div>
    <div><strong style={{ color: WATER }}>BULL / DBULL</strong><br />Le Bull intervient sur la zone sélectionnée ou prioritaire. Le Double Bull peut appeler le Canadair.</div>
    <div><strong style={{ color: GREEN }}>BRIGADE</strong><br />Tous les joueurs partagent la carte et le score, avec des statistiques individuelles complètes.</div>
  </div>;
}

export default function DartsFirefighterConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(() => {
    const stored = readSaved();
    const incoming = props?.params?.config || (props?.params?.mode === "darts_firefighter" ? props.params : null) || props?.config || {};
    return { ...stored, ...(incoming && typeof incoming === "object" ? incoming : {}) };
  }, []);
  const primary = theme?.primary || FIRE;
  const soft = theme?.textSoft || "#aeb2c8";
  const bg = theme?.bg || "#070912";

  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => {
    try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); }
    catch { return []; }
  }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const initialConfig = React.useMemo(() => normalizeDartsFirefighterConfig(saved), []);
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => localStorage.getItem(VIEW_KEY) === "complete" ? "complete" : "guided");
  const [stepIndex, setStepIndex] = React.useState(0);
  const [config, setConfig] = React.useState<any>(initialConfig);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || initialConfig.selectedIds || []).slice(0, 8));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});
  const [showExpert, setShowExpert] = React.useState(Boolean(saved.showExpert));

  const mapTerritoryCount = React.useMemo(() => {
    try { return Math.max(1, Number(buildTerritoriesMap(String(config?.mapId || "FR") as any).territories?.length || 1)); }
    catch { return 20; }
  }, [config?.mapId]);
  const playableTerritoryCap = Math.min(mapTerritoryCount, MAX_PLAYABLE_TERRITORIES);
  const territoryOptions = React.useMemo(() => {
    const presets = [8, 12, 16, 20].filter((value, index, rows) => value < playableTerritoryCap && rows.indexOf(value) === index);
    const values = Array.from(new Set([...presets, playableTerritoryCap])).sort((a, b) => a - b);
    return values.map((value) => ({
      value,
      label: value === playableTerritoryCap
        ? `${value} · ${mapTerritoryCount <= MAX_PLAYABLE_TERRITORIES ? "Carte complète" : "Maximum jouable"}`
        : value <= 12
          ? `${value} · Mission rapide`
          : value <= 20
            ? `${value} · Standard`
            : `${value} · Grande carte`,
    }));
  }, [playableTerritoryCap, mapTerritoryCount]);

  const selectedItems = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  const targetCalibration = React.useMemo(() => buildTerritoryValueCalibration(selectedItems, botLevel), [selectedIds.join("|"), botLevel, profilePool.length]);
  const calibratedTargetValues = React.useMemo(() => Number(config?.activeTerritories || 0) > 20
    ? buildUniqueTerritoryValues(Number(config.activeTerritories || 0), targetCalibration.minTarget, targetCalibration.maxTarget)
    : [], [config.activeTerritories, targetCalibration.minTarget, targetCalibration.maxTarget]);
  const targetRangeMin = calibratedTargetValues.length ? Math.min(...calibratedTargetValues) : 1;
  const targetRangeMax = calibratedTargetValues.length ? Math.max(...calibratedTargetValues) : Number(config?.activeTerritories || 20);
  const sectorSummary = Number(config?.activeTerritories || 0) > 20
    ? `${targetRangeMin}-${targetRangeMax} · UNIQUES`
    : (config?.targetOrder === "random" ? "MÉLANGÉS" : `1-${config?.activeTerritories || 20}`);
  const selectedBots = selectedItems.filter(isBotLike);
  const valid = selectedIds.length >= 1 && selectedIds.length <= 8;
  const activeMissionPreset = PRESETS.find((preset) => preset.id === config.missionPreset) || null;
  const isCustomMission = config.missionPreset === "custom";
  const guidedPresetLocked = viewMode === "guided" && !isCustomMission;
  const guidedAutoOpen = viewMode === "complete" || isCustomMission;
  const step = STEP_META[stepIndex] || STEP_META[0];
  const rules = dartsFirefighterDifficultyRules(config.difficulty);

  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.065),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)" };
  const block: React.CSSProperties = { ...card, marginBottom: 10, background: "rgba(7,10,18,.96)", border: `1px solid ${primary}35` };

  function chooseView(next: ViewMode) {
    setViewMode(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  }
  function setField(key: string, value: any, markCustom = true) {
    setConfig((prev: any) => ({ ...prev, [key]: value, ...(markCustom ? { missionPreset: "custom" } : {}) }));
  }
  function setDifficulty(value: DartsFirefighterDifficulty) {
    const nextRules = dartsFirefighterDifficultyRules(value);
    setConfig((prev: any) => ({ ...prev, difficulty: value, missionPreset: "custom", growthChance: nextRules.growChance, spreadChance: nextRules.spreadChance, smokeChance: nextRules.smokeChance, protectionDecay: nextRules.protectionDecay, destructionTurns: nextRules.destructionTurns, destructionLimit: nextRules.destructionLimit }));
  }
  function applyPreset(preset: any) {
    const nextRules = dartsFirefighterDifficultyRules(preset.patch.difficulty);
    setConfig((prev: any) => ({ ...prev, ...preset.patch, missionPreset: preset.id, growthChance: nextRules.growChance, spreadChance: nextRules.spreadChance, smokeChance: nextRules.smokeChance, protectionDecay: nextRules.protectionDecay, destructionTurns: nextRules.destructionTurns }));
  }
  function togglePlayer(id: string) {
    const key = String(id);
    setSelectedIds((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : prev.length >= 8 ? prev : [...prev, key]);
    setPlayerDartSets((prev) => Object.prototype.hasOwnProperty.call(prev, key) ? prev : ({ ...prev, [key]: x01MostUsedDartSetIdForProfile(key) || null }));
  }
  function handleDartSet(id: string, dartSetId: string | null) { setPlayerDartSets((prev) => ({ ...prev, [String(id)]: dartSetId || null })); }
  function back() { if (typeof go === "function") go("games"); }
  function resetConfiguration() {
    const wildfire = PRESETS.find((preset) => preset.id === "wildfire");
    const fresh = normalizeDartsFirefighterConfig({ ...(wildfire?.patch || {}), missionPreset: "wildfire" });
    setConfig(fresh);
    setSelectedIds([]);
    setPlayerDartSets({});
    setBotsPanel(false);
    setBotLevel("normal");
    setShowExpert(false);
    setStepIndex(0);
    chooseView("guided");
    try { localStorage.removeItem(LS_KEY); } catch {}
  }

  React.useEffect(() => {
    setConfig((prev: any) => {
      const activeTerritories = Math.max(8, Math.min(playableTerritoryCap, Number(prev.activeTerritories || playableTerritoryCap)));
      return {
        ...prev,
        activeTerritories,
        initialFires: Math.min(prev.initialFires, Math.max(1, Math.floor(activeTerritories / 2))),
        initialSmoke: Math.min(prev.initialSmoke, Math.max(0, activeTerritories - prev.initialFires)),
        initialProtectedTerritories: Math.min(prev.initialProtectedTerritories, Math.max(0, activeTerritories - prev.initialFires - prev.initialSmoke)),
        criticalTerritories: Math.min(prev.criticalTerritories, Math.max(0, Math.floor(activeTerritories / 2))),
      };
    });
  }, [config.activeTerritories, playableTerritoryCap]);

  React.useEffect(() => {
    if (config.objective === "protect_critical" && config.criticalTerritories < 1) setConfig((prev: any) => ({ ...prev, criticalTerritories: 2, criticalLossEndsMission: true }));
  }, [config.objective]);

  function start() {
    if (!valid) return;
    const ids = config.randomOrder ? shuffle(selectedIds) : [...selectedIds];
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({
      ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Pompier",
      dartSetId: playerDartSets[String(profile.id)] ?? null, isBot: isBotLike(profile),
    }));
    const botIds = playersList.filter(isBotLike).map((p: any) => String(p.id));
    const payload: DartsFirefighterConfigPayload = normalizeDartsFirefighterConfig({
      ...config,
      mode: "darts_firefighter",
      players: ids.length,
      selectedIds: ids,
      playersList,
      playerDartSets,
      botIds,
      botsEnabled: botIds.length > 0,
      botLevel,
      criticalLossEndsMission: config.objective === "protect_critical" ? true : config.criticalLossEndsMission,
    });
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel, showExpert })); } catch {}
    try { recordProfileUsageForMode("darts_firefighter", ids); } catch {}
    if (typeof go === "function") go("darts_firefighter_play", payload);
  }

  const missionBlock = <section style={block}>
    <SectionTitle icon="🚨" title="TYPE DE MISSION" subtitle="Fais défiler les cartes et sélectionne un scénario prêt à jouer." color={FIRE} />
    <div style={{ margin: "0 -2px", padding: "2px 2px 7px", display: "flex", gap: 10, overflowX: "auto", overflowY: "visible", scrollSnapType: "x mandatory", scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}>
      {PRESETS.map((preset) => {
        const meta = MISSION_META[preset.id] || MISSION_META.custom;
        const objective = preset.patch.objective === "survival"
          ? `Résister pendant ${preset.patch.maxRounds} rounds malgré les nouveaux départs.`
          : preset.patch.objective === "protect_critical"
            ? `Protéger ${preset.patch.criticalTerritories} zones critiques jusqu’aux renforts.`
            : `Éteindre les foyers avant la limite de ${preset.patch.maxRounds} rounds.`;
        return <MissionPresetCard
          key={preset.id}
          active={config.missionPreset === preset.id}
          icon={preset.icon}
          title={preset.title}
          subtitle={preset.subtitle}
          accent={preset.accent}
          background={MISSION_BACKGROUNDS[preset.id]}
          kicker={meta.kicker}
          chips={[...meta.chips, `${preset.patch.activeTerritories} ZONES`]}
          objective={objective}
          badge={config.missionPreset === preset.id ? "ACTIF" : "PRÉRÉGLAGE"}
          onClick={() => applyPreset(preset)}
        />;
      })}
      <MissionPresetCard
        active={isCustomMission}
        icon="⚙️"
        title="Mission personnalisée"
        subtitle="Crée une intervention entièrement sur mesure avec les paramètres des étapes suivantes."
        accent="#b4a2ff"
        background={MISSION_BACKGROUNDS.custom}
        kicker={MISSION_META.custom.kicker}
        chips={MISSION_META.custom.chips}
        objective="Choisis librement la carte, les foyers, la propagation, les moyens et la condition de victoire."
        badge={isCustomMission ? "ACTIF" : "LIBRE"}
        onClick={() => setField("missionPreset", "custom", false)}
      />
    </div>
    <div style={{ marginTop: 3, color: "#7f8797", fontSize: 7.5, fontWeight: 900, textAlign: "center", letterSpacing: .35 }}>GLISSE HORIZONTALEMENT POUR VOIR TOUTES LES MISSIONS</div>
    {guidedPresetLocked ? <PresetConfigurationNotice preset={activeMissionPreset} config={config} onCustomize={() => setField("missionPreset", "custom", false)} /> : null}
    {!guidedPresetLocked ? <div style={{ marginTop: 9, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Objectif principal" subtitle="Détermine la condition de victoire" icon="🎯" color={WATER} badge={config.objective === "survival" ? "SURVIE" : config.objective === "protect_critical" ? "DÉFENSE" : "EXTINCTION"} defaultOpen={isCustomMission}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 6 }}>
          <ChoiceCard active={config.objective === "extinguish_all"} icon="💧" title="Tout éteindre" subtitle="Victoire lorsque la carte ne contient plus aucun incident." accent={WATER} onClick={() => setField("objective", "extinguish_all")} />
          <ChoiceCard active={config.objective === "protect_critical"} icon="🏥" title="Protéger" subtitle="Tenir les zones critiques jusqu’à l’arrivée des renforts." accent={GOLD} onClick={() => setField("objective", "protect_critical")} />
          <ChoiceCard active={config.objective === "survival"} icon="🔥" title="Survivre" subtitle="Résister jusqu’au dernier round malgré les nouveaux départs." accent={RED} onClick={() => setField("objective", "survival")} />
        </div>
      </ConfigAccordion>
      <ConfigAccordion title="Niveau général" subtitle="Charge un comportement de feu cohérent" icon="📈" color={FIRE_2} badge={difficultyLabel(config.difficulty).toUpperCase()}>
        <OptionRow label="Difficulté générale" hint="Ajuste automatiquement les probabilités du moteur"><OptionSelect value={config.difficulty} options={[{ value: "recruit", label: "Recrue" }, { value: "firefighter", label: "Pompier" }, { value: "commander", label: "Commandant" }, { value: "inferno", label: "Inferno" }]} onChange={setDifficulty} /></OptionRow>
      </ConfigAccordion>
    </div> : null}
  </section>;

  const brigadeBlock = <section style={block}>
    <SectionTitle icon="👨‍🚒" title="BRIGADE D’INTERVENTION" subtitle="Compose l’équipe sans afficher tous les sélecteurs en permanence." color={WATER} />
    <SelectedParticipantsCompactBlock items={selectedItems} accent={WATER} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Ajouter des pompiers" subtitle="Profils locaux et joueur actif" icon="👨‍🚒" color={WATER} badge={`${selectedIds.length}/8`} defaultOpen={!selectedIds.length}>
        <PlayerPagedSelector usageMode="darts_firefighter" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={WATER} pageSize={9} modalTitle="Choisir les pompiers" showSelectedSummary={false} />
      </ConfigAccordion>
      <ConfigAccordion title="Bots pompiers" subtitle="Ajouter et régler les équipiers IA" icon="🤖" color={WATER} badge={selectedBots.length ? `${selectedBots.length} ACTIF${selectedBots.length > 1 ? "S" : ""}` : "OPTIONNEL"} defaultOpen={botsPanel || Boolean(selectedBots.length)}>
        <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ minHeight: 36, borderRadius: 11, border: `1px solid ${WATER}66`, background: botsPanel ? `${WATER}18` : "rgba(255,255,255,.035)", color: WATER, fontWeight: 1000 }}>🤖 SÉLECTION DES BOTS {botsPanel ? "▲" : "▼"}</button>
        {botsPanel ? <BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={WATER} label="BOTS POMPIERS" showCheckbox={false} showSelectedSummary={false} /> : null}
        {selectedBots.length ? <OptionRow label="Niveau tactique des Bots" hint="Précision et choix des zones prioritaires"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Recrue" }, { value: "normal", label: "Confirmé" }, { value: "hard", label: "Élite" }]} onChange={setBotLevel} /></OptionRow> : null}
      </ConfigAccordion>
      <ConfigAccordion title="Ordre de passage" subtitle="Réglage secondaire de la brigade" icon="🔀" color={GREEN} badge={config.randomOrder ? "ALÉATOIRE" : "FIXE"}>
        <OptionRow label="Ordre de passage aléatoire" hint="Mélange la brigade au lancement"><OptionToggle value={Boolean(config.randomOrder)} onChange={(v) => setField("randomOrder", v)} /></OptionRow>
      </ConfigAccordion>
    </div>
  </section>;

  const territoryBlock = <section style={block}>
    <SectionTitle icon="🗺️" title="TERRITOIRE D’INTERVENTION" subtitle="Le résumé reste visible ; les options se déplient seulement si nécessaire." color={GOLD} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><MiniMetric icon="🗺️" label="CARTE" value={TERRITORY_MAPS[config.mapId]?.name || config.mapId} color={GOLD} /><MiniMetric icon="📍" label="ZONES" value={`${config.activeTerritories}/${mapTerritoryCount}`} color={WATER} /><MiniMetric icon="🎯" label={Number(config.activeTerritories) > 20 ? "CIBLES" : "SECTEURS"} value={sectorSummary} color={FIRE_2} /></div>
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Carte et taille de mission" subtitle="Pays, continent et nombre de zones actives" icon="🗺️" color={GOLD} badge={`${config.activeTerritories} ZONES`} defaultOpen={guidedAutoOpen}>
        <OptionRow label="Carte" hint="Pays, continent ou carte mondiale"><OptionSelect value={config.mapId} options={MAP_OPTIONS} onChange={(v) => setField("mapId", v)} /></OptionRow>
        <OptionRow label="Zones actives" hint="De la mini-mission à la carte complète"><OptionSelect value={config.activeTerritories} options={territoryOptions} onChange={(v) => setField("activeTerritories", Number(v))} /></OptionRow>
      </ConfigAccordion>
      {Number(config.activeTerritories) > 20 ? <ConfigAccordion title="Cibles uniques automatiques" subtitle="Une valeur différente par territoire, calculée selon sa surface et le niveau de la brigade" icon="🎯" color={FIRE_2} badge={sectorSummary}>
        <div style={{ display: "grid", gap: 7, padding: "2px 1px" }}>
          <div style={{ padding: 9, borderRadius: 12, background: `${FIRE_2}0d`, border: `1px solid ${FIRE_2}30`, color: "#dce3ee", fontSize: 8.8, lineHeight: 1.45 }}>
            <strong style={{ color: FIRE_2 }}>AUCUN DOUBLON.</strong> Les {config.activeTerritories} territoires reçoivent chacun un score exact unique atteignable en 1 à 3 fléchettes. Les petites zones reçoivent les cibles les plus accessibles ; les grandes les plus exigeantes.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
            <MiniMetric icon="👤" label="NIVEAU BRIGADE" value={targetCalibration.label.toUpperCase()} color={WATER} />
            <MiniMetric icon="📊" label="MOY. 3 FL." value={Math.round(targetCalibration.referenceAvg3)} color={GREEN} />
            <MiniMetric icon="🎯" label="PLAGE CIBLES" value={`${targetRangeMin}-${targetRangeMax}`} color={FIRE_2} />
          </div>
          <div style={{ color: "#929bad", fontSize: 7.8, lineHeight: 1.4 }}>Le niveau est calculé au lancement à partir des statistiques des joueurs sélectionnés et du niveau des Bots. Pour une brigade débutante, le moteur privilégie les scores les plus accessibles ; pour une brigade experte, il décale les objectifs vers des scores plus exigeants.</div>
        </div>
      </ConfigAccordion> : <ConfigAccordion title="Numérotation des secteurs" subtitle="Un secteur unique par territoire" icon="🎯" color={FIRE_2} badge={sectorSummary}>
        <OptionRow label="Attribution des secteurs" hint="Avec 20 zones ou moins, chaque territoire conserve un secteur 1 à 20 unique"><OptionSelect value={config.targetOrder} options={[{ value: "sequential", label: "Ordre logique" }, { value: "random", label: "Répartition aléatoire" }]} onChange={(v) => setField("targetOrder", v)} /></OptionRow>
      </ConfigAccordion>}
    </div>
  </section>;

  const ignitionBlock = <section style={block}>
    <SectionTitle icon="🔥" title="DÉPART DE L’INCENDIE" subtitle="Les valeurs principales sont résumées ; les détails restent repliés." color={FIRE} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}><MiniMetric icon="🔥" label="FOYERS" value={config.initialFires} color={FIRE} /><MiniMetric icon="💨" label="FUMÉES" value={config.initialSmoke} color={GOLD} /><MiniMetric icon="🛡️" label="PROTÉGÉES" value={config.initialProtectedTerritories} color={WATER} /><MiniMetric icon="⏱️" label="ROUNDS" value={config.maxRounds} color={GREEN} /></div>
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Situation de départ" subtitle="Foyers, intensité et fumée initiale" icon="🔥" color={FIRE} badge={`${config.initialFires} FEU${config.initialFires > 1 ? "X" : ""}`} defaultOpen={guidedAutoOpen}>
        <OptionRow label="Foyers initiaux" hint="Territoires déjà en feu au lancement"><OptionSelect value={config.initialFires} options={Array.from({ length: Math.min(8, Math.max(1, Math.floor(config.activeTerritories / 2))) }, (_, i) => i + 1)} onChange={(v) => setField("initialFires", Number(v))} /></OptionRow>
        <OptionRow label="Intensité initiale" hint="Niveau de feu appliqué aux foyers"><OptionSelect value={String(config.initialFireLevel)} options={[{ value: "mixed", label: "Mix adapté à la difficulté" }, { value: "1", label: "Niveau 1" }, { value: "2", label: "Niveau 2" }, { value: "3", label: "Niveau 3" }]} onChange={(v) => setField("initialFireLevel", v === "mixed" ? v : Number(v))} /></OptionRow>
        <OptionRow label="Zones enfumées" hint="Départs de feu imminents en plus des flammes"><OptionSelect value={config.initialSmoke} options={Array.from({ length: Math.min(8, Math.max(0, config.activeTerritories - config.initialFires)) + 1 }, (_, i) => i)} onChange={(v) => setField("initialSmoke", Number(v))} /></OptionRow>
      </ConfigAccordion>
      {(config.objective === "protect_critical" || isCustomMission || viewMode === "complete" || config.initialProtectedTerritories > 0) ? <ConfigAccordion title="Protection et zones critiques" subtitle="Défenses initiales et infrastructures prioritaires" icon="🛡️" color={WATER} badge={`${config.criticalTerritories} CRITIQUE${config.criticalTerritories > 1 ? "S" : ""}`}>
        <OptionRow label="Zones pré-protégées" hint="Territoires sains déjà arrosés au lancement"><OptionSelect value={config.initialProtectedTerritories} options={Array.from({ length: Math.min(8, config.activeTerritories) + 1 }, (_, i) => i)} onChange={(v) => setField("initialProtectedTerritories", Number(v))} /></OptionRow>
        <OptionRow label="Zones critiques" hint="Hôpitaux, villages ou infrastructures à sauver"><OptionSelect value={config.criticalTerritories} options={Array.from({ length: Math.min(8, Math.floor(config.activeTerritories / 2)) + 1 }, (_, i) => i)} onChange={(v) => setField("criticalTerritories", Number(v))} /></OptionRow>
        <OptionRow label="Perte critique = défaite" hint="Termine immédiatement la mission"><OptionToggle value={Boolean(config.criticalLossEndsMission)} onChange={(v) => setField("criticalLossEndsMission", v)} disabled={config.objective === "protect_critical"} /></OptionRow>
      </ConfigAccordion> : null}
      <ConfigAccordion title="Répartition et limites" subtitle="Placement des foyers, tolérance et durée" icon="⚙️" color={FIRE_2} badge={`${config.maxRounds} ROUNDS`}>
        <OptionRow label="Disposition des foyers" hint="Répartition de la situation initiale"><OptionSelect value={config.firePlacement} options={[{ value: "random", label: "Aléatoire" }, { value: "clustered", label: "Front de feu groupé" }, { value: "critical_first", label: "Près des zones critiques" }]} onChange={(v) => setField("firePlacement", v)} /></OptionRow>
        <OptionRow label="Territoires détruits tolérés" hint="Seuil global avant défaite"><OptionSelect value={config.destructionLimit} options={[1,2,3,4,5,6,7,8]} onChange={(v) => setField("destructionLimit", Number(v))} /></OptionRow>
        <OptionRow label="Durée maximale" hint={config.objective === "extinguish_all" ? "Échec si le feu subsiste après la limite" : "Victoire si la brigade tient jusqu’à cette limite"}><OptionSelect value={config.maxRounds} options={[6,8,10,12,15,18,20,25,30,40,50]} onChange={(v) => setField("maxRounds", Number(v))} /></OptionRow>
      </ConfigAccordion>
    </div>
  </section>;

  const propagationBlock = <section style={block}>
    <SectionTitle icon="🌬️" title="PROPAGATION ET VENT" subtitle="Le moteur reste préconfiguré ; ouvre uniquement la rubrique à modifier." color={WATER} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}><MiniMetric icon="📈" label="CROISSANCE" value={pct(config.growthChance)} color={FIRE_2} /><MiniMetric icon="🔥" label="PROPAGATION" value={pct(config.spreadChance)} color={FIRE} /><MiniMetric icon="💨" label="FUMÉE" value={pct(config.smokeChance)} color={GOLD} /><MiniMetric icon="🛡️" label="USURE" value={pct(config.protectionDecay)} color={WATER} /></div>
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Rythme de propagation" subtitle="Moment et nombre maximal de nouvelles zones" icon="🔥" color={FIRE} badge={config.propagationTiming === "after_round" ? "PAR ROUND" : "PAR JOUEUR"} defaultOpen={guidedAutoOpen}>
        <OptionRow label="Propagation" hint="Moment où la carte évolue"><OptionSelect value={config.propagationTiming} options={[{ value: "after_visit", label: "Après chaque joueur" }, { value: "after_round", label: "Après la brigade complète" }]} onChange={(v) => setField("propagationTiming", v)} /></OptionRow>
        <OptionRow label="Propagations maximales" hint="Nombre de nouvelles zones atteintes par cycle"><OptionSelect value={config.maxSpreadsPerCycle} options={[1,2,3,4,5,6]} onChange={(v) => setField("maxSpreadsPerCycle", Number(v))} /></OptionRow>
      </ConfigAccordion>
      {(config.objective === "survival" || isCustomMission || viewMode === "complete" || Number(config.reinforcementEveryRounds) > 0) ? <ConfigAccordion title="Nouveaux départs" subtitle="Vagues de fumée ou foyers supplémentaires" icon="💨" color={GOLD} badge={Number(config.reinforcementEveryRounds) > 0 ? `TOUS LES ${config.reinforcementEveryRounds}` : "OFF"}>
        <OptionRow label="Nouveaux départs programmés" hint="Ajoute des fumées à intervalles réguliers"><OptionSelect value={config.reinforcementEveryRounds} options={[{ value: 0, label: "Désactivés" }, { value: 1, label: "Chaque round" }, { value: 2, label: "Tous les 2 rounds" }, { value: 3, label: "Tous les 3 rounds" }, { value: 4, label: "Tous les 4 rounds" }, { value: 5, label: "Tous les 5 rounds" }]} onChange={(v) => setField("reinforcementEveryRounds", Number(v))} /></OptionRow>
        {Number(config.reinforcementEveryRounds) > 0 ? <OptionRow label="Nouveaux foyers potentiels" hint="Nombre de zones enfumées à chaque vague"><OptionSelect value={config.reinforcementCount} options={[1,2,3,4]} onChange={(v) => setField("reinforcementCount", Number(v))} /></OptionRow> : null}
      </ConfigAccordion> : null}
      <ConfigAccordion title="Vent et prévisions" subtitle="Orientation du danger et zones menacées" icon="🌬️" color={WATER} badge={config.windEnabled ? String(config.windStrength || "normal").toUpperCase() : "VENT OFF"}>
        <OptionRow label="Vent dynamique" hint="Oriente le territoire menacé"><OptionToggle value={Boolean(config.windEnabled)} onChange={(v) => setField("windEnabled", v)} /></OptionRow>
        {config.windEnabled ? <>
          <OptionRow label="Force du vent" hint="Distance de propagation préférentielle"><OptionSelect value={config.windStrength} options={[{ value: "light", label: "Brise" }, { value: "normal", label: "Vent normal" }, { value: "strong", label: "Vent violent" }]} onChange={(v) => setField("windStrength", v)} /></OptionRow>
          <OptionRow label="Changement du vent" hint="Nombre de cycles de propagation"><OptionSelect value={config.windChangeEvery} options={[1,2,3,4,5,6,8,10].map((n) => ({ value: n, label: `Tous les ${n} cycle${n > 1 ? "s" : ""}` }))} onChange={(v) => setField("windChangeEvery", Number(v))} /></OptionRow>
        </> : null}
        <OptionRow label="Prévision des menaces" hint="Affiche les prochaines zones exposées"><OptionToggle value={Boolean(config.forecastEnabled)} onChange={(v) => setField("forecastEnabled", v)} /></OptionRow>
        {config.forecastEnabled ? <OptionRow label="Menaces affichées" hint="Nombre maximal de territoires prévus"><OptionSelect value={config.forecastCount} options={[1,2,3,4,5,6]} onChange={(v) => setField("forecastCount", Number(v))} /></OptionRow> : null}
      </ConfigAccordion>
      <ConfigAccordion title="Réglages experts du moteur" subtitle="Probabilités fines et usure des protections" icon="⚙️" color={RED} badge="AVANCÉ">
        <OptionRow label="Croissance du feu" hint="Chance de gagner un niveau à chaque cycle"><OptionSelect value={config.growthChance} options={[.15,.25,.35,.45,.55,.65,.75,.9].map((n) => ({ value: n, label: pct(n) }))} onChange={(v) => setField("growthChance", Number(v))} /></OptionRow>
        <OptionRow label="Chance de propagation" hint="Pour un foyer de niveau 3"><OptionSelect value={config.spreadChance} options={[.2,.35,.45,.55,.65,.75,.85,.95].map((n) => ({ value: n, label: pct(n) }))} onChange={(v) => setField("spreadChance", Number(v))} /></OptionRow>
        <OptionRow label="Propagation par fumée" hint="Sinon la zone prend feu directement"><OptionSelect value={config.smokeChance} options={[.25,.4,.55,.7,.8,.9,1].map((n) => ({ value: n, label: pct(n) }))} onChange={(v) => setField("smokeChance", Number(v))} /></OptionRow>
        <OptionRow label="Destruction d’un feu N3" hint="Cycles avant perte du territoire"><OptionSelect value={config.destructionTurns} options={[1,2,3,4,5,6].map((n) => ({ value: n, label: `${n} cycle${n > 1 ? "s" : ""}` }))} onChange={(v) => setField("destructionTurns", Number(v))} /></OptionRow>
        <OptionRow label="Usure des protections" hint="Chance de perdre une protection naturellement"><OptionSelect value={config.protectionDecay} options={[0,.1,.2,.3,.4,.5,.6,.75].map((n) => ({ value: n, label: pct(n) }))} onChange={(v) => setField("protectionDecay", Number(v))} /></OptionRow>
      </ConfigAccordion>
    </div>
  </section>;

  const resourcesBlock = <section style={block}>
    <SectionTitle icon="🚒" title="MOYENS D’INTERVENTION" subtitle="Le Bull et le Canadair sont séparés en deux rubriques simples." color={GOLD} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><MiniMetric icon="🎯" label="BULL" value={`${config.bullPower} EAU`} color={WATER} /><MiniMetric icon="✈️" label="CANADAIR" value={config.bullAirSupport ? "ACTIF" : "OFF"} color={GOLD} /><MiniMetric icon="🚒" label="JAUGE" value={`${config.startingBrigadeGauge}%`} color={GREEN} /></div>
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Intervention au Bull" subtitle="Cible et puissance du largage précis" icon="🎯" color={WATER} badge={`${config.bullPower} UNITÉ${config.bullPower > 1 ? "S" : ""}`} defaultOpen={guidedAutoOpen}>
        <OptionRow label="Cible du Bull" hint="Zone choisie sur la carte ou priorité automatique"><OptionSelect value={config.bullTargetMode} options={[{ value: "selected", label: "Zone sélectionnée" }, { value: "priority", label: "Danger prioritaire" }]} onChange={(v) => setField("bullTargetMode", v)} /></OptionRow>
        <OptionRow label="Puissance du Bull" hint="Unités d’eau du largage précis"><OptionSelect value={config.bullPower} options={[{ value: 1, label: "1 unité" }, { value: 2, label: "2 unités" }, { value: 3, label: "3 unités" }]} onChange={(v) => setField("bullPower", Number(v))} /></OptionRow>
      </ConfigAccordion>
      <ConfigAccordion title="Canadair au Double Bull" subtitle="Étendue, puissance et consommation de jauge" icon="✈️" color={GOLD} badge={config.bullAirSupport ? "ACTIF" : "DÉSACTIVÉ"}>
        <OptionRow label="DBULL appelle le Canadair" hint="Sinon le Double Bull agit comme un Bull renforcé"><OptionToggle value={Boolean(config.bullAirSupport)} onChange={(v) => setField("bullAirSupport", v)} /></OptionRow>
        {config.bullAirSupport ? <>
          <OptionRow label="Puissance au centre" hint="Zone principale du largage"><OptionSelect value={config.canadairCenterPower} options={[{ value: 2, label: "2 unités" }, { value: 3, label: "3 unités" }]} onChange={(v) => setField("canadairCenterPower", Number(v))} /></OptionRow>
          <OptionRow label="Zones voisines arrosées" hint="Étendue latérale du largage"><OptionSelect value={config.canadairNeighborCount} options={[1,2,3,4]} onChange={(v) => setField("canadairNeighborCount", Number(v))} /></OptionRow>
          <OptionRow label="Puissance latérale" hint="Unités d’eau sur chaque voisin"><OptionSelect value={config.canadairNeighborPower} options={[{ value: 1, label: "1 unité" }, { value: 2, label: "2 unités" }]} onChange={(v) => setField("canadairNeighborPower", Number(v))} /></OptionRow>
          <OptionRow label="Jauge Brigade initiale" hint="Réserve disponible au début de la mission"><OptionSelect value={config.startingBrigadeGauge} options={[0,10,20,25,35,50,75,100].map((n) => ({ value: n, label: `${n} %` }))} onChange={(v) => setField("startingBrigadeGauge", Number(v))} /></OptionRow>
          <OptionRow label="Canadair lié à la jauge" hint="Le DBULL déclenche l’avion uniquement si la réserve est suffisante"><OptionToggle value={Boolean(config.canadairRequiresGauge)} onChange={(v) => setField("canadairRequiresGauge", v)} /></OptionRow>
          {config.canadairRequiresGauge ? <OptionRow label="Coût de la mission aérienne" hint="Points consommés dans la jauge Brigade"><OptionSelect value={config.canadairGaugeCost} options={[20,25,30,35,40,45,50,60]} onChange={(v) => setField("canadairGaugeCost", Number(v))} /></OptionRow> : null}
        </> : null}
      </ConfigAccordion>
    </div>
  </section>;

  const inputBlock = <section style={block}>
    <SectionTitle icon="🎯" title="DÉROULEMENT DE LA PARTIE" subtitle="Deux rubriques remplacent la longue liste d’options." color={WATER} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><MiniMetric icon="🎯" label="VOLÉE" value={`${config.dartsPerTurn} MAX`} color={WATER} /><MiniMetric icon="💧" label="MISS" value={config.missEndsTurn ? "FATAL" : "NORMAL"} color={FIRE} /><MiniMetric icon="⌨️" label="SAISIE" value={config.scoreInputMethod === "dartboard" ? "CIBLE" : "CLAVIER"} color={GREEN} /></div>
    <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
      <ConfigAccordion title="Volée et MISS" subtitle="Nombre de fléchettes et fin anticipée" icon="🎯" color={WATER} badge={`${config.dartsPerTurn} FLÉCHETTE${config.dartsPerTurn > 1 ? "S" : ""}`} defaultOpen={guidedAutoOpen}>
        <OptionRow label="Maximum par volée" hint={Number(config.activeTerritories) > 20 ? "3 fléchettes maximum nécessaires pour garantir une cible unique atteignable ; tu peux toujours valider après 1 ou 2." : "Tu peux valider librement après 1, 2 ou 3 fléchettes"}><OptionSelect value={Number(config.activeTerritories) > 20 ? 3 : config.dartsPerTurn} options={Number(config.activeTerritories) > 20 ? [{ value: 3, label: "3 · Cibles uniques (validation anticipée autorisée)" }] : [{ value: 1, label: "1 · Intervention éclair" }, { value: 2, label: "2 · Tactique" }, { value: 3, label: "3 · Standard" }]} onChange={(v) => setField("dartsPerTurn", Number(v))} /></OptionRow>
        <OptionRow label="MISS termine la volée" hint="Les fléchettes restantes ne sont pas jouées"><OptionToggle value={Boolean(config.missEndsTurn)} onChange={(v) => setField("missEndsTurn", v)} /></OptionRow>
      </ConfigAccordion>
      <ConfigAccordion title="Score et méthode de saisie" subtitle="Combo, bonus et clavier/cible" icon="🏆" color={GREEN} badge={config.scoreInputMethod === "dartboard" ? "CIBLE" : "CLAVIER"}>
        <OptionRow label="Multiplicateur de brigade" hint="Les interventions utiles consécutives augmentent le score"><OptionToggle value={Boolean(config.comboEnabled)} onChange={(v) => setField("comboEnabled", v)} /></OptionRow>
        <OptionRow label="Bonus volée parfaite" hint="Toutes les fléchettes produisent une action utile"><OptionSelect value={config.perfectVisitBonus} options={[0,50,100,150,200,250,300,400,500]} onChange={(v) => setField("perfectVisitBonus", Number(v))} /></OptionRow>
        <OptionRow label="Méthode de saisie" hint="Clavier classique ou cible interactive"><OptionSelect value={config.scoreInputMethod} options={[{ value: "keypad", label: "Clavier" }, { value: "dartboard", label: "Cible interactive" }]} onChange={(v) => setField("scoreInputMethod", v)} /></OptionRow>
      </ConfigAccordion>
    </div>
  </section>;

  const summaryBlock = <section style={{ ...block, borderColor: `${FIRE}6b`, background: `linear-gradient(135deg,${FIRE}16,${WATER}0d)` }}>
    <SectionTitle icon="✅" title="ORDRE DE MISSION" subtitle="Tous les réglages ci-dessous seront appliqués au lancement." color={GREEN} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
      <MiniMetric icon="👨‍🚒" label="BRIGADE" value={selectedIds.length || "—"} color={WATER} />
      <MiniMetric icon="🗺️" label="ZONES" value={config.activeTerritories} color={GOLD} />
      <MiniMetric icon="🔥" label="FOYERS" value={`${config.initialFires}+${config.initialSmoke}💨`} color={FIRE} />
      <MiniMetric icon="⏱️" label="ROUNDS" value={config.maxRounds} color={GREEN} />
    </div>
    <div style={{ marginTop: 8, padding: 10, borderRadius: 13, background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.08)", display: "grid", gap: 5, fontSize: 9.2 }}>
      <div><strong style={{ color: FIRE_2 }}>MISSION :</strong> {PRESETS.find((p) => p.id === config.missionPreset)?.title || "Personnalisée"} · {difficultyLabel(config.difficulty)}</div>
      <div><strong style={{ color: WATER }}>OBJECTIF :</strong> {config.objective === "survival" ? `Survivre ${config.maxRounds} rounds` : config.objective === "protect_critical" ? `Protéger ${config.criticalTerritories} zones critiques` : "Éteindre tous les foyers"}</div>
      <div><strong style={{ color: GOLD }}>CARTE :</strong> {TERRITORY_MAPS[config.mapId]?.name || config.mapId} · {config.activeTerritories}/{mapTerritoryCount} zones · {Number(config.activeTerritories) > 20 ? `cibles uniques ${targetRangeMin}-${targetRangeMax} · niveau ${targetCalibration.label}` : `secteurs ${config.targetOrder === "random" ? "aléatoires" : "ordonnés"}`}</div>
      <div><strong style={{ color: FIRE }}>INCENDIE :</strong> {config.initialFires} foyers · {config.initialSmoke} fumées · {config.initialProtectedTerritories} zones protégées · propagation {config.propagationTiming === "after_round" ? "après chaque round" : "après chaque joueur"}</div>
      <div><strong style={{ color: WATER }}>MOYENS :</strong> Bull puissance {config.bullPower} · jauge initiale {config.startingBrigadeGauge}% · Canadair {config.bullAirSupport ? `${config.canadairNeighborCount} voisins` : "désactivé"}</div>
      <div><strong style={{ color: GREEN }}>VOLÉE :</strong> jusqu’à {config.dartsPerTurn} fléchette{config.dartsPerTurn > 1 ? "s" : ""}, validation possible à tout moment · {config.scoreInputMethod === "dartboard" ? "cible interactive" : "clavier"} · MISS {config.missEndsTurn ? "fatal" : "normal"}</div>
    </div>
    {!valid ? <div style={{ marginTop: 9, color: "#ff9aa8", textAlign: "center", fontSize: 10, fontWeight: 1000 }}>⚠ Sélectionne au moins un pompier dans l’étape Brigade.</div> : null}
  </section>;

  const blocks: Record<StepKey, React.ReactNode> = { mission: missionBlock, brigade: brigadeBlock, territory: territoryBlock, ignition: ignitionBlock, propagation: propagationBlock, resources: resourcesBlock, input: inputBlock, summary: summaryBlock };

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -12%,${FIRE}28 0,${bg} 42%,#020306 100%)`, paddingBottom: 18 }}>
    <PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={back} color={FIRE} glow={`${FIRE}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS FIREFIGHTER" color={WATER} glow={`${WATER}88`} content={<Rules config={config} />} /></div>} />
    <main style={{ width: "min(920px,100%)", margin: "0 auto", padding: "8px 8px 18px", boxSizing: "border-box" }}>
      <section style={{ ...card, padding: 8, marginBottom: 9, background: "rgba(5,8,15,.92)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <PillButton label="CONFIGURATION GUIDÉE" active={viewMode === "guided"} onClick={() => chooseView("guided")} primary={FIRE} primarySoft={`${FIRE}18`} />
          <PillButton label="CONFIGURATION COMPLÈTE" active={viewMode === "complete"} onClick={() => chooseView("complete")} primary={WATER} primarySoft={`${WATER}18`} />
        </div>
      </section>
      <section style={{ ...card, padding: 9, marginBottom: 9, background: `linear-gradient(135deg,${FIRE}14,${WATER}10)`, border: `1px solid ${WATER}35` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div><div style={{ color: "#fff", fontSize: 10.8, fontWeight: 1100 }}>CONFIGURATION FIREFIGHTER V4</div><div style={{ marginTop: 2, color: soft, fontSize: 8.5 }}>8 étapes · volées flexibles 1–3 · 4 scénarios · réglages moteur complets</div></div>
          <button type="button" onClick={resetConfiguration} style={{ borderRadius: 999, padding: "7px 10px", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#dfe5ef", fontSize: 8.2, fontWeight: 1000 }}>RÉINITIALISER</button>
        </div>
      </section>

      {viewMode === "guided" ? <>
        <section style={{ ...card, padding: 9, marginBottom: 9, background: "rgba(5,8,15,.94)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}><div style={{ color: step.key === "ignition" ? FIRE : WATER, fontSize: 11.5, fontWeight: 1100 }}>CONFIGURATION GUIDÉE</div><div style={{ marginTop: 2, color: soft, fontSize: 8.8 }}>Étape {stepIndex + 1}/{STEP_META.length} · {step.title}</div></div>
            <div style={{ display: "flex", gap: 4 }}>{STEP_META.map((item, index) => <button key={item.key} type="button" title={item.title} onClick={() => setStepIndex(index)} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${index === stepIndex ? (item.key === "ignition" ? FIRE : WATER) : "rgba(255,255,255,.10)"}`, background: index === stepIndex ? `${item.key === "ignition" ? FIRE : WATER}18` : index < stepIndex ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.025)", color: index === stepIndex ? "#fff" : "#858da0", fontSize: 8.5, fontWeight: 1000 }}>{index + 1}</button>)}</div>
          </div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "32px minmax(0,1fr)", gap: 8, alignItems: "center", padding: 8, borderRadius: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ fontSize: 20, textAlign: "center" }}>{step.icon}</div><div><div style={{ color: "#fff", fontSize: 10.5, fontWeight: 1050 }}>{step.title.toUpperCase()}</div><div style={{ marginTop: 2, color: "#939bae", fontSize: 8.5, lineHeight: 1.35 }}>{step.subtitle}</div></div></div>
        </section>
        {blocks[step.key]}
        <div style={{ display: "grid", gridTemplateColumns: stepIndex === 0 ? "1fr" : "1fr 1fr", gap: 8 }}>
          {stepIndex > 0 ? <button type="button" onClick={() => setStepIndex((v) => Math.max(0, v - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>← PRÉCÉDENT</button> : null}
          {stepIndex < STEP_META.length - 1 ? <button type="button" onClick={() => setStepIndex((v) => Math.min(STEP_META.length - 1, v + 1))} disabled={step.key === "brigade" && !valid} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${(step.key === "brigade" && !valid) ? "#555" : WATER}`, background: (step.key === "brigade" && !valid) ? "#23262d" : `linear-gradient(135deg,${WATER}24,${FIRE}18)`, color: (step.key === "brigade" && !valid) ? "#777" : "#fff", fontWeight: 1000 }}>SUIVANT →</button> : <button type="button" disabled={!valid} onClick={start} style={{ minHeight: 49, borderRadius: 14, border: `1px solid ${valid ? FIRE : "#555"}`, background: valid ? `linear-gradient(135deg,${FIRE},#d73c15)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${FIRE}55` : "none" }}>🔥 LANCER L’INTERVENTION</button>}
        </div>
      </> : <>
        {missionBlock}{brigadeBlock}{territoryBlock}{ignitionBlock}{propagationBlock}{resourcesBlock}{inputBlock}{summaryBlock}
        <button type="button" disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 54, borderRadius: 16, border: `1px solid ${valid ? FIRE : "#555"}`, background: valid ? `linear-gradient(135deg,${FIRE},#d73c15)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${FIRE}55` : "none" }}>🔥 LANCER DARTS FIREFIGHTER</button>
      </>}
    </main>
  </div>;
}
