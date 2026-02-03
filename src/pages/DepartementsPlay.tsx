// ============================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES (Départements / Pays) — PLAY
// ✅ Carte cliquable + colorisée + liée au pays choisi en config
// ✅ KPI Objectif + Territoire (neon) au-dessus de la map (sans doublon)
// ✅ Bouton "i" sur la map : ouvre la liste valeurs (territoire ↔ numéro)
// ✅ Frame map uniforme (toutes les maps s'adaptent au même cadre)
// ✅ Config appliquée : targetSelectionMode / captureRule / victoryMode / winRegions (FR) / time
// ============================================

import React from "react";

import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";
import ProfileAvatar from "../components/ProfileAvatar";

import type { Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";

import type {
  TerritoriesCountry,
  TerritoriesGameState,
  TerritoriesPlayer,
  TerritoriesTeam,
  TerritoriesVictoryCondition,
} from "../territories/types";
import { buildTerritoriesMap } from "../territories/map";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import {
  normalizeTerritoriesState,
  selectTerritory,
  applyVisit,
  endTurn,
  countOwnedByOwnerId,
} from "../territories/engine";

// Config payload saved by DepartementsConfig.tsx
export type TerritoriesConfigPayload = {
  players: number;
  teamSize: 1 | 2 | 3;
  selectedIds: string[];
  teamsById?: Record<string, number>;
  botsEnabled: boolean;
  botLevel: "easy" | "normal" | "hard";
  rounds: number;
  objective: number;
  mapId: string; // FR / EN / IT / ...

  // Options
  targetSelectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryMode?: "territories" | "regions" | "time";
  winTerritories?: number;
  winRegions?: number;
  timeLimitMin?: number;
};

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// France regions icons (used in values modal)
const regionsFrGlob = import.meta.glob("../assets/regions_fr/FR-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

// INSEE region codes => (short icon code + display name)
const FR_REGION_META: Record<string, { code: string; name: string }> = {
  "FR-11": { code: "IDF", name: "Île-de-France" },
  "FR-24": { code: "CVL", name: "Centre-Val de Loire" },
  "FR-27": { code: "BFC", name: "Bourgogne-Franche-Comté" },
  "FR-28": { code: "NOR", name: "Normandie" },
  "FR-32": { code: "HDF", name: "Hauts-de-France" },
  "FR-44": { code: "GES", name: "Grand Est" },
  "FR-52": { code: "PDL", name: "Pays de la Loire" },
  "FR-53": { code: "BRE", name: "Bretagne" },
  "FR-75": { code: "NAQ", name: "Nouvelle-Aquitaine" },
  "FR-76": { code: "OCC", name: "Occitanie" },
  "FR-84": { code: "ARA", name: "Auvergne-Rhône-Alpes" },
  "FR-93": { code: "PAC", name: "Provence-Alpes-Côte d’Azur" },
  "FR-94": { code: "COR", name: "Corse" },
};

function findFrRegionIcon(regionCode: string): string | null {
  const code = String(regionCode || "").toUpperCase().trim();
  if (!code) return null;
  const suffix = `/FR-${code}.png`;
  for (const k of Object.keys(regionsFrGlob)) {
    if (k.toUpperCase().endsWith(suffix.toUpperCase())) return regionsFrGlob[k];
  }
  return null;
}

function findTerritoriesTicker(mapId: string): string | null {
  const id = String(mapId || "").toLowerCase();
  const suffix = `/ticker_territories_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.toLowerCase().endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeMapIdToCountry(mapId?: string): TerritoriesCountry {
  const m = String(mapId || "FR").toUpperCase().trim();
  if (m === "EN" || m === "GB" || m === "UK") return "UK";
  if (m === "WORLD") return "WORLD";

  const supported: TerritoriesCountry[] = [
    "FR",
    "UK",
    "IT",
    "DE",
    "ES",
    "US",
    "CN",
    "AU",
    "JP",
    "RU",
    "WORLD",
    "AF",
    "AR",
    "ASIA",
    "AT",
    "BE",
    "BR",
    "CA",
    "HR",
    "CZ",
    "DK",
    "EG",
    "EU",
    "FI",
    "GR",
    "IS",
    "IN",
    "MX",
    "NL",
    "NA",
    "NO",
    "PL",
    "SA",
    "SAM",
    "KR",
    "SE",
    "CH",
    "UA",
    "UN",
  ];

  if (supported.includes(m as TerritoriesCountry)) return m as TerritoriesCountry;
  return "FR";
}

function shortName(id: string) {
  const s = String(id || "").trim();
  if (!s) return "Player";
  if (s.length <= 12) return s;
  return `${s.slice(0, 12)}…`;
}

const SOLO_COLORS = ["#ffd25a", "#ff5abe", "#52f7ff", "#7cff6b", "#c38bff", "#ff8f52"];

function interleaveTeams(team0: string[], team1: string[]) {
  const out: string[] = [];
  const n = Math.max(team0.length, team1.length);
  for (let i = 0; i < n; i++) {
    if (team0[i]) out.push(team0[i]);
    if (team1[i]) out.push(team1[i]);
  }
  return out;
}

function dartScore(d: UIDart) {
  if (!d) return 0;
  if (d.v === 0) return 0;
  if (d.v === 25) return d.mult === 2 ? 50 : 25;
  return d.v * (d.mult || 1);
}

function computeVisitScores(darts: UIDart[]) {
  const norm: UIDart[] = [...(darts || [])];
  while (norm.length < 3) norm.push({ v: 0, mult: 1 });
  return norm.slice(0, 3).map(dartScore);
}

type PlayerLiveStats = { darts: number; captures: number; steals: number; lost: number };

const RULES_TEXT = (cfg: {
  selectionMode: "free" | "by_score";
  captureRule: "exact" | "gte";
  victoryMode: "territories" | "regions" | "time";
  winTerritories: number;
  winRegions: number;
  timeLimitMin: number;
}) => {
  const { selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin } = cfg;
  const cap = captureRule === "gte" ? "≥" : "=";
  return `TERRITORIES\n\nBut\n- Capturer des territoires selon la condition de victoire.\n\nCible\n- ${
    selectionMode === "free"
      ? "Choisir la cible sur la carte avant la volée"
      : "Ne pas choisir : le score de la volée attribue la cible (aléatoire si plusieurs territoires ont la même valeur)"
  }\n\nCapture\n- Règle: score ${cap} valeur du territoire (sur 3 fléchettes).\n\nVictoire\n- ${
    victoryMode === "territories"
      ? `Atteindre ${winTerritories} territoires.`
      : victoryMode === "regions"
        ? `Atteindre ${winRegions} régions (France : une région est gagnée quand tous ses départements sont capturés).`
        : `Temps: ${timeLimitMin} min, celui qui a le plus de territoires gagne.`
  }\n\nNotes\n- L'avatar actif est glow.\n- La carte est le cœur du gameplay (clic + couleurs).`;
};

export default function DepartementsPlay(props: any) {
  const { theme } = useTheme();

  // Profiles store (names + avatars)
  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const profileById = React.useMemo(() => {
    const out: Record<string, any> = {};
    for (const p of storeProfiles) {
      if (!p?.id) continue;
      out[String(p.id)] = p;
    }
    return out;
  }, [storeProfiles]);

  const cfg:
    | TerritoriesConfigPayload
    | null =
    (props?.params?.config as TerritoriesConfigPayload) ||
    (props?.config as TerritoriesConfigPayload) ||
    safeParse<TerritoriesConfigPayload>(localStorage.getItem("dc_modecfg_departements"));

  const effectiveCfg: TerritoriesConfigPayload = cfg || {
    players: 2,
    teamSize: 1,
    selectedIds: ["Player A", "Player B"],
    botsEnabled: false,
    botLevel: "normal",
    rounds: 12,
    objective: 10,
    mapId: "FR",
    targetSelectionMode: "free",
    captureRule: "exact",
    victoryMode: "territories",
    winTerritories: 10,
    winRegions: 3,
    timeLimitMin: 20,
  };

  const mapId = String(effectiveCfg.mapId || "FR");
  const country = normalizeMapIdToCountry(mapId);

  const maxRounds = Math.max(1, Number(effectiveCfg.rounds || 12));

  const selectionMode: "free" | "by_score" =
    effectiveCfg.targetSelectionMode === "by_score" ? "by_score" : "free";
  const captureRule: "exact" | "gte" = effectiveCfg.captureRule === "gte" ? "gte" : "exact";

  // Regions only for FR (hard gate)
  const requestedVictoryMode =
    effectiveCfg.victoryMode === "regions"
      ? "regions"
      : effectiveCfg.victoryMode === "time"
        ? "time"
        : "territories";
  const victoryMode: "territories" | "regions" | "time" =
    country === "FR" ? requestedVictoryMode : requestedVictoryMode === "regions" ? "territories" : requestedVictoryMode;

  const winTerritories = Math.max(
    1,
    Number(effectiveCfg.winTerritories || (effectiveCfg as any).objectiveTerritories || effectiveCfg.objective || 10),
  );
  const winRegions = Math.max(1, Number(effectiveCfg.winRegions || (effectiveCfg as any).objectiveRegions || 3));
  const timeLimitMin = Math.max(1, Number(effectiveCfg.timeLimitMin || 20));

  const tickerSrc = findTerritoriesTicker(mapId) || findTerritoriesTicker(country) || undefined;

  // Players/teams + owner colors
  const { players, teams, ownerColors } = React.useMemo(() => {
    if (
      effectiveCfg.teamSize > 1 &&
      Array.isArray(effectiveCfg.selectedIds) &&
      effectiveCfg.selectedIds.length
    ) {
      const teamsById = effectiveCfg.teamsById || {};
      const team0 = effectiveCfg.selectedIds.filter((id) => teamsById[id] === 0);
      const team1 = effectiveCfg.selectedIds.filter((id) => teamsById[id] === 1);
      const order = interleaveTeams(team0, team1);

      const t0: TerritoriesTeam = { id: "TEAM0", name: "TEAM Gold", color: "#ffd25a" };
      const t1: TerritoriesTeam = { id: "TEAM1", name: "TEAM Pink", color: "#ff5abe" };

      const ps: TerritoriesPlayer[] = order.map((id) => ({
        id,
        name: profileById[id]?.name || profileById[id]?.displayName || shortName(id),
        color: teamsById[id] === 1 ? t1.color : t0.color,
        teamId: teamsById[id] === 1 ? t1.id : t0.id,
        capturedTerritories: [],
      }));

      return {
        players: ps,
        teams: [t0, t1],
        ownerColors: { [t0.id]: t0.color, [t1.id]: t1.color } as Record<string, string>,
      };
    }

    const ids =
      Array.isArray(effectiveCfg.selectedIds) && effectiveCfg.selectedIds.length
        ? effectiveCfg.selectedIds
        : ["Player A", "Player B"];

    const ps: TerritoriesPlayer[] = ids.map((id, i) => ({
      id,
      name: profileById[id]?.name || profileById[id]?.displayName || shortName(id),
      color: SOLO_COLORS[i % SOLO_COLORS.length],
      capturedTerritories: [],
    }));

    const colors: Record<string, string> = {};
    for (const p of ps) colors[p.id] = p.color;
    return { players: ps, teams: undefined as any, ownerColors: colors };
  }, [effectiveCfg.teamSize, JSON.stringify(effectiveCfg.selectedIds), JSON.stringify(effectiveCfg.teamsById), profileById]);

  const victoryCondition: TerritoriesVictoryCondition = React.useMemo(() => {
    if (victoryMode === "regions") return { type: "regions", regions: winRegions };
    if (victoryMode === "time") return { type: "time", durationMs: timeLimitMin * 60 * 1000 };
    return { type: "territories", count: winTerritories };
  }, [victoryMode, winTerritories, winRegions, timeLimitMin]);

  const initialState = React.useMemo<TerritoriesGameState>(() => {
    const map = buildTerritoriesMap(country);
    const base: TerritoriesGameState = {
      config: {
        country,
        targetSelectionMode: selectionMode,
        captureRule,
        multiCapture: false,
        minTerritoryValue: 1,
        allowEnemyCapture: true,
        maxRounds,
        victoryCondition,
        voiceAnnouncements: false,
      },
      players,
      teams,
      map,
      turnIndex: 0,
      roundIndex: 1,
      turn: {
        activePlayerId: players[0]?.id || "P1",
        selectedTerritoryId: undefined,
        dartsThrown: 0,
        capturedThisTurn: [],
      },
      status: "playing",
    };

    return normalizeTerritoriesState(base).state;
  }, [country, selectionMode, captureRule, maxRounds, victoryCondition, players, teams]);

  const [game, setGame] = React.useState<TerritoriesGameState>(initialState);
  const submitLockRef = React.useRef(false);

  // Score input state
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerLiveStats>>(() => {
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, captures: 0, steals: 0, lost: 0 };
    return out;
  });

  React.useEffect(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, captures: 0, steals: 0, lost: 0 };
    setPlayerStats(out);
  }, [initialState, players]);

  const activePlayer = React.useMemo(
    () => game.players.find((p) => p.id === game.turn.activePlayerId),
    [game.players, game.turn.activePlayerId],
  );
  const activeColor = activePlayer?.color || theme?.accent || "#52f7ff";
  const themeColor = theme?.accent || activeColor;

  const ownedByOwner = React.useMemo(() => countOwnedByOwnerId(game), [game]);

  const selectedTerritory = React.useMemo(() => {
    const id = game.turn.selectedTerritoryId;
    if (!id) return null;
    return game.map.territories.find((x) => x.id === id) || null;
  }, [game.turn.selectedTerritoryId, game.map.territories]);

  const objectiveValueLabel = selectedTerritory ? String(selectedTerritory.value) : "—";
  const territoryNameLabel = selectedTerritory ? selectedTerritory.name : "—";

  const isFrRegionsVictory = country === "FR" && victoryMode === "regions";

  // Owned regions (FR) — a region is owned when ALL its departments share the same owner.
  const ownedRegionsByOwner = React.useMemo(() => {
    if (!isFrRegionsVictory) return null;

    const byRegion = new Map<string, any[]>();
    for (const tt of game.map.territories) {
      const regionId = String((tt as any).region || "FR-00");
      const arr = byRegion.get(regionId) || [];
      arr.push(tt);
      byRegion.set(regionId, arr);
    }

    const regionOwner: Record<string, string | undefined> = {};
    for (const [regionId, terrs] of byRegion.entries()) {
      if (!terrs.length) continue;
      const first = terrs[0]?.ownerId ? String(terrs[0].ownerId) : "";
      if (!first) {
        regionOwner[regionId] = undefined;
        continue;
      }
      const allSame = terrs.every((t) => (t?.ownerId ? String(t.ownerId) : "") === first);
      regionOwner[regionId] = allSame ? first : undefined;
    }

    const possibleOwners = game.teams?.length ? game.teams.map((t) => t.id) : game.players.map((p) => p.id);
    const counts: Record<string, number> = {};
    for (const oid of possibleOwners) counts[String(oid)] = 0;

    for (const rid of Object.keys(regionOwner)) {
      const owner = regionOwner[rid];
      if (owner && counts[owner] != null) counts[owner] += 1;
    }

    return counts;
  }, [isFrRegionsVictory, game.map.territories, game.players, game.teams]);

  const valuesByRegion = React.useMemo(() => {
    if (!isFrRegionsVictory) return null;
    const groups = new Map<string, any[]>();
    for (const tt of game.map.territories) {
      const key = String((tt as any).region || "FR-00");
      const arr = groups.get(key) || [];
      arr.push(tt);
      groups.set(key, arr);
    }

    const out = [...groups.entries()].map(([regionId, items]) => {
      const meta = FR_REGION_META[regionId as keyof typeof FR_REGION_META];
      const name = meta?.name || regionId;
      const icon = meta?.code ? findFrRegionIcon(meta.code) : undefined;
      const sorted = [...items].sort((a, b) => (a.value - b.value) || String(a.name).localeCompare(String(b.name)));
      return { regionId, name, icon, items: sorted };
    });
    out.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    return out;
  }, [isFrRegionsVictory, game.map.territories]);

  const regionGroupsForValues = React.useMemo(() => {
    if (!valuesByRegion) return null;
    return valuesByRegion.map((g) => {
      const meta = FR_REGION_META[g.regionId as keyof typeof FR_REGION_META];
      return {
        key: g.regionId,
        name: g.name,
        code: meta?.code || "",
        iconSrc: meta?.code ? findFrRegionIcon(meta.code) : null,
        items: g.items,
      };
    });
  }, [valuesByRegion]);

  const classement = React.useMemo(() => {
    const rows = game.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      owned: (ownedByOwner[p.id] || 0) as number,
    }));
    rows.sort((a, b) => b.owned - a.owned || a.name.localeCompare(b.name));
    return rows;
  }, [game.players, ownedByOwner]);

  function goBack() {
    if (props?.go) return props.go("departements_config", { config: effectiveCfg });
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function handleMapSelect(territoryId: string) {
    const res = selectTerritory(game, territoryId);
    if (res.error) return;
    setGame(res.state);
  }

  function validateThrow() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setTimeout(() => (submitLockRef.current = false), 250);

    if (game.status !== "playing") return;

    // Free mode requires a selected territory
    if (game.config.targetSelectionMode === "free" && !game.turn.selectedTerritoryId) return;

    const dartScores = computeVisitScores(currentThrow);

    // Snapshot before applying
    const activeId = game.turn.activePlayerId;
    // Snapshot (pre-visit) of the territory that will be captured (if any).
    // In by_score mode, the captured territory is derived from the score, not from selectedTerritoryId.

    const r1 = applyVisit(game, dartScores);
    if (r1.error) return;
    const next = r1.state;

    const capturedEvent = (r1.events as any[])?.find((e) => e?.type === "territory_captured");
    const capturedTid: string | undefined = capturedEvent?.territoryId;
    const beforeOwner = capturedTid ? game.map.territories.find((t) => t.id === capturedTid)?.ownerId : undefined;

    setPlayerStats((prev) => {
      const out = { ...prev };
      const cur = out[activeId] || { darts: 0, captures: 0, steals: 0, lost: 0 };
      cur.darts += 3;
      out[activeId] = cur;

      const captured = r1.events?.some((e) => e.type === "territory_captured");
      if (captured) {
        out[activeId] = { ...out[activeId], captures: (out[activeId]?.captures || 0) + 1 };
        if (beforeOwner && beforeOwner !== activeId) {
          if (!out[beforeOwner]) out[beforeOwner] = { darts: 0, captures: 0, steals: 0, lost: 0 };
          out[activeId] = { ...out[activeId], steals: (out[activeId]?.steals || 0) + 1 };
          out[beforeOwner] = { ...out[beforeOwner], lost: (out[beforeOwner]?.lost || 0) + 1 };
        }
      }
      return out;
    });

    setGame(next);
    setCurrentThrow([]);
    setMultiplier(1);

    if (next.status !== "playing") return;
    setGame(endTurn(next).state);
  }

  // Time remaining (UI only)
  const timeRemaining = React.useMemo(() => {
    if (game.config.victoryCondition.type !== "time") return null;
    const start = game.startedAtMs || Date.now();
    const dur = game.config.victoryCondition.durationMs;
    const elapsed = Date.now() - start;
    const left = Math.max(0, dur - elapsed);
    const mm = Math.floor(left / 60000);
    const ss = Math.floor((left % 60000) / 1000);
    return `${mm}:${String(ss).padStart(2, "0")}`;
  }, [game.config.victoryCondition, game.startedAtMs, game.turnIndex]);

  const possessionsForActive = React.useMemo(() => {
    if (!activePlayer) return 0;
    if (victoryMode === "regions" && ownedRegionsByOwner) return ownedRegionsByOwner[activePlayer.id] || 0;
    return ownedByOwner[activePlayer.id] || 0;
  }, [activePlayer, ownedByOwner, ownedRegionsByOwner, victoryMode]);

  const possessionsGoal = React.useMemo(() => {
    if (victoryMode === "regions") return winRegions;
    return winTerritories;
  }, [victoryMode, winRegions, winTerritories]);

  const valuesModalContent = (
    <div style={{ maxHeight: "70vh", overflow: "auto" }} className="dc-scroll-thin">
      <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 8 }}>Valeurs des territoires</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        Chaque territoire a une valeur cible (score total sur une volée).
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isFrRegionsVictory && regionGroupsForValues ? (
          regionGroupsForValues.map((g) => (
            <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {g.iconSrc ? (
                  <img
                    src={g.iconSrc}
                    alt={g.name}
                    style={{ width: 28, height: 28, objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.35))" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    R
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{g.code || g.key}</div>
                </div>
              </div>

              {g.items.map((tt) => (
                <div
                  key={tt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ minWidth: 52, textAlign: "center", fontWeight: 950, color: themeColor }}>{tt.value}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tt.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{tt.id}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          [...game.map.territories]
            .sort((a, b) => (a.value - b.value) || a.name.localeCompare(b.name))
            .map((tt) => (
              <div
                key={tt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ minWidth: 52, textAlign: "center", fontWeight: 950, color: themeColor }}>{tt.value}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tt.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{tt.id}</div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050607", color: "#fff", display: "flex", flexDirection: "column" }}>
      <PageHeader
        tickerSrc={tickerSrc}
        tickerAlt="TERRITORIES"
        tickerHeight={92}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles" content={RULES_TEXT({ selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin })} />}
      />

      {/* ACTIVE PLAYER HEADER (style proche GolfPlay) */}
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            padding: "12px 12px",
            borderRadius: 18,
            background: "rgba(12, 14, 26, 0.55)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Watermark avatar (like X01Play/GolfPlay) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {/* Avatar on the right (transparent) */}
            <div
              style={{
                position: "absolute",
                right: -42,
                top: -24,
                bottom: -24,
                width: "64%",
                display: "grid",
                placeItems: "center",
                opacity: 0.16,
                filter: "saturate(1.06)",
              }}
            >
              {/* Same feel as X01V3: much larger, cropped on the right, heavy fade on the left */}
              <div style={{ transform: "scale(2.05)", transformOrigin: "center" }}>
                <ProfileAvatar
                  profile={profileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name }}
                  size={210}
                  ringColor={activeColor}
                  textColor="#fff"
                  showStars={false}
                />
              </div>
            </div>
            {/* Strong left fade over the avatar */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(12,14,26,0.995) 0%, rgba(12,14,26,0.985) 52%, rgba(12,14,26,0.62) 76%, rgba(12,14,26,0.14) 100%)",
              }}
            />
          </div>

          {/* Left: big avatar + name underneath */}
          <div
            style={{
              width: 164,
              flex: "0 0 auto",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingRight: 6,
            }}
          >
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 999,
                overflow: "hidden",
                boxShadow: `0 0 24px ${activeColor}aa`,
                outline: `2px solid ${activeColor}66`,
                outlineOffset: 2,
              }}
            >
              <ProfileAvatar
                profile={profileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name }}
                size={86}
                ringColor={activeColor}
                textColor="#fff"
                showStars={false}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 15,
                fontWeight: 950,
                color: activeColor,
                textAlign: "center",
                width: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activePlayer?.name || "Player"}
            </div>

            <div style={{ marginTop: 3, fontSize: 11, opacity: 0.8, fontWeight: 800, textAlign: "center" }}>
              {teams?.length ? "Mode Teams" : "Mode Solo"}
              {timeRemaining ? ` • ${timeRemaining}` : ""}
            </div>
          </div>

          {/* Right: stats (labels + values, stacked) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", zIndex: 1 }}>
            <div
              style={{
                // Hard guard against overflow on small screens
                width: "clamp(150px, 44vw, 220px)",
                minWidth: 0,
                padding: "12px 14px 12px 14px",
                borderRadius: 16,
                background: "rgba(0,0,0,0.22)",
                border: `1px solid ${activeColor}55`,
                boxShadow: `0 0 18px ${activeColor}1f`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <StatLine label="Possessions" value={`${possessionsForActive}/${possessionsGoal}`} valueColor={activeColor} />
                <StatLine label="Darts" value={String(playerStats[game.turn.activePlayerId]?.darts || 0)} />
                <StatLine label="Captures" value={String(playerStats[game.turn.activePlayerId]?.captures || 0)} />
                <StatLine label="Steals" value={String(playerStats[game.turn.activePlayerId]?.steals || 0)} />
                <StatLine label="Lost" value={String(playerStats[game.turn.activePlayerId]?.lost || 0)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI: OBJECTIF + TERRITOIRE (single row, neon) */}
      <div style={{ padding: "0 12px 10px", display: "flex", gap: 12 }}>
        <KpiCard title="OBJECTIF" value={objectiveValueLabel} valueColor={activeColor} borderColor={`${activeColor}55`} glowColor={`${activeColor}22`} />
        <KpiCard title="TERRITOIRE" value={territoryNameLabel} valueColor="#fff" borderColor="rgba(255,255,255,0.12)" glowColor="rgba(0,0,0,0.0)" />
      </div>

      {/* MAP (uniform frame) */}
      <div style={{ flex: 1, padding: 12, paddingTop: 2 }}>
        <div
          style={{
            width: "100%",
            height: "clamp(260px, 40vh, 460px)",
            position: "relative",
            borderRadius: 18,
            background: "rgba(12, 14, 26, 0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {/* i button */}
          <div style={{ position: "absolute", left: 12, top: 12, zIndex: 20, pointerEvents: "auto" }}>
            <InfoDot title="Valeurs des territoires" content={valuesModalContent} />
          </div>

          <TerritoriesMapView
            country={country}
            map={game.map}
            ownerColors={ownerColors}
            selectedTerritoryId={game.turn.selectedTerritoryId}
            activeColor={activeColor}
            themeColor={themeColor}
            // ✅ restore click selection (free + by_score). imposed remains non-interactive.
            interactive={game.status === "playing" && game.config.targetSelectionMode !== "imposed"}
            onSelectTerritory={handleMapSelect}
          />
        </div>
      </div>

      {/* KEYPAD (volée X01-like via ScoreInputHub) */}
      <div style={{ paddingBottom: 10 }}>
        <ScoreInputHub
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onNumber={(n) => {
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: n, mult: multiplier }]);
            setMultiplier(1);
          }}
          onBull={() => {
            if (currentThrow.length >= 3) return;
            setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier === 2 ? 2 : 1 }]);
            setMultiplier(1);
          }}
          onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
          onCancel={() => {
            setCurrentThrow([]);
            setMultiplier(1);
          }}
          onValidate={validateThrow}
        />
      </div>
    </div>
  );
}

function KpiCard(props: {
  title: string;
  value: string;
  valueColor: string;
  borderColor: string;
  glowColor: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(0,0,0,0.22)",
        border: `1px solid ${props.borderColor}`,
        boxShadow: `0 0 18px ${props.glowColor}`,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.2, opacity: 0.78, fontWeight: 950 }}>{props.title}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: 20,
          fontWeight: 950,
          color: props.valueColor,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function StatMini(props: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 900, letterSpacing: 0.6 }}>{props.label.toUpperCase()}</div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 950 }}>{props.value}</div>
    </div>
  );
}

function StatLine(props: { label: string; value: string; valueColor?: string }) {
  return (
    <>
      <div style={{ fontSize: 11, opacity: 0.78, fontWeight: 950, letterSpacing: 0.6 }}>{props.label.toUpperCase()}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 950,
          color: props.valueColor || "#fff",
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textAlign: "right",
        }}
      >
        {props.value}
      </div>
    </>
  );
}