// ============================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES (Départements / Pays) — PLAY (STEP 5 FIX)
// ✅ Carte cliquable + colorisée + liée au pays choisi en config
// ✅ Pas de texte "AU TOUR DE" : le joueur actif est indiqué visuellement (glow)
// ✅ Utilise le moteur PUR (src/territories/engine.ts)
// ✅ France: base = france_departements.svg (déjà dans le projet) + overlay régions (france_regions.svg)
// ============================================

import React from "react";

import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";

import type { Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { TerritoriesCountry, TerritoriesGameState, TerritoriesPlayer, TerritoriesTeam } from "../territories/types";
import { buildTerritoriesMap } from "../territories/map";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import { normalizeTerritoriesState, selectTerritory, applyVisit, endTurn } from "../territories/engine";

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
};

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

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
  // Config uses EN for England => we map to UK svg pack
  if (m === "EN" || m === "UK" || m === "GB") return "UK";
  if (m === "FR") return "FR";
  if (m === "IT") return "IT";
  if (m === "DE") return "DE";
  if (m === "ES") return "ES";
  if (m === "US") return "US";
  if (m === "CN") return "CN";
  if (m === "AU") return "AU";
  if (m === "JP") return "JP";
  if (m === "RU") return "RU";
  if (m === "WORLD") return "WORLD";
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

function countOwnedByOwnerId(state: TerritoriesGameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of state.map.territories) {
    if (!t.ownerId) continue;
    out[t.ownerId] = (out[t.ownerId] || 0) + 1;
  }
  return out;
}

function countRegionsOwned(state: TerritoriesGameState, ownerId: string): number {
  const byRegion: Record<string, string[]> = {};
  for (const t of state.map.territories) {
    const r = String((t as any).region || "").trim();
    if (!r) continue;
    (byRegion[r] ||= []).push(t.id);
  }
  let n = 0;
  for (const regionId of Object.keys(byRegion)) {
    const tids = byRegion[regionId];
    if (!tids.length) continue;
    const allOwned = tids.every((tid) => {
      const tt = state.map.territories.find((x) => x.id === tid);
      return tt && tt.ownerId === ownerId;
    });
    if (allOwned) n += 1;
  }
  return n;
}


const RULES_TEXT = (objective: number) => `TERRITORIES

But
- Capturer ${objective} territoires.

Déroulement (Mode Libre)
1) Clique sur un territoire sur la carte pour choisir l'objectif.
2) Joue une volée de 3 fléchettes au keypad.
3) Valider : si la règle de capture est remplie, tu prends le territoire.
4) Tour suivant.

Notes
- Le tour n'est pas affiché en texte : l'avatar actif est glow.
- La carte est le coeur du gameplay (clic + couleurs).`;

export default function DepartementsPlay(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  const cfg =
    (props?.params?.config as TerritoriesConfigPayload) ||
    (props?.config as TerritoriesConfigPayload) ||
    safeParse<TerritoriesConfigPayload>(localStorage.getItem("dc_modecfg_departements")) || {
      players: 2,
      teamSize: 1,
      selectedIds: ["Player A", "Player B"],
      botsEnabled: false,
      botLevel: "normal",
      rounds: 12,
      objective: 10,
      mapId: "FR",
    };

  const mapId = String(cfg.mapId || "FR");
  const country = normalizeMapIdToCountry(mapId);
  const maxRounds = Math.max(1, Number(cfg.rounds || 12));
  const targetSelectionMode = (cfg.targetSelectionMode || "free") as "free" | "by_score";
  const victoryMode = (cfg.victoryMode || "territories") as "territories" | "regions" | "time";

  const objectiveTerritories = Math.max(1, Number(cfg.objectiveTerritories ?? cfg.objective ?? 10));
  const objectiveRegions = Math.max(1, Number(cfg.objectiveRegions ?? 3));
  const timeLimitMin = Math.max(1, Number(cfg.timeLimitMin ?? 20));

  // display objective (depends on victory mode)
  const objective = victoryMode === "regions" ? objectiveRegions : victoryMode === "time" ? objectiveTerritories : objectiveTerritories;

  const tickerSrc = findTerritoriesTicker(mapId) || findTerritoriesTicker(country) || undefined;

  // Build players/teams + owner colors
  const { players, teams, ownerColors } = React.useMemo(() => {
    if (cfg.teamSize > 1 && Array.isArray(cfg.selectedIds) && cfg.selectedIds.length) {
      const teamsById = cfg.teamsById || {};
      const team0 = cfg.selectedIds.filter((id) => teamsById[id] === 0);
      const team1 = cfg.selectedIds.filter((id) => teamsById[id] === 1);
      const order = interleaveTeams(team0, team1);

      const t0: TerritoriesTeam = { id: "TEAM0", name: "TEAM Gold", color: "#ffd25a" };
      const t1: TerritoriesTeam = { id: "TEAM1", name: "TEAM Pink", color: "#ff5abe" };

      const ps: TerritoriesPlayer[] = order.map((id) => ({
        id,
        name: shortName(id),
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

    const ids = Array.isArray(cfg.selectedIds) && cfg.selectedIds.length ? cfg.selectedIds : ["Player A", "Player B"];
    const ps: TerritoriesPlayer[] = ids.map((id, i) => ({
      id,
      name: shortName(id),
      color: SOLO_COLORS[i % SOLO_COLORS.length],
      capturedTerritories: [],
    }));

    const colors: Record<string, string> = {};
    for (const p of ps) colors[p.id] = p.color;

    return { players: ps, teams: undefined as any, ownerColors: colors };
  }, [cfg.teamSize, JSON.stringify(cfg.selectedIds), JSON.stringify(cfg.teamsById)]);

  // Engine state
  const initialState = React.useMemo<TerritoriesGameState>(() => {
    const map = buildTerritoriesMap(country);
    const base: TerritoriesGameState = {
      meta: { startedAtMs: Date.now() },
      config: {
        country,
        targetSelectionMode,
        
        captureRule: "exact",
        multiCapture: false,
        minTerritoryValue: 1,
        allowEnemyCapture: true,
        maxRounds,
        victoryCondition:
          victoryMode === "regions"
            ? { type: "regions", value: objectiveRegions }
            : victoryMode === "time"
              ? { type: "time", minutes: timeLimitMin }
              : { type: "territories", value: objectiveTerritories },
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

    const norm = normalizeTerritoriesState(base);
    return norm.state;
  }, [country, maxRounds, objectiveTerritories, objectiveRegions, timeLimitMin, victoryMode, targetSelectionMode, players, teams]);

  const [game, setGame] = React.useState<TerritoriesGameState>(initialState);

  React.useEffect(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
  }, [initialState]);

  const activePlayer = React.useMemo(() => game.players.find((p) => p.id === game.turn.activePlayerId), [game]);
  const activeColor = activePlayer?.color || theme?.accent || "#52f7ff";
  const themeColor = theme?.accent || activeColor;

  // Score input state
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  
  // Time mode: tick every 500ms to detect end (winner = most territories)
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    if (victoryMode !== "time") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [victoryMode]);

  React.useEffect(() => {
    if (victoryMode !== "time") return;
    const started = game.meta?.startedAtMs ?? Date.now();
    const endAt = started + timeLimitMin * 60_000;
    if (nowMs < endAt) return;

    const owned = countOwnedByOwnerId(game);
    const owners = game.teams?.length ? game.teams.map((t2) => t2.id) : game.players.map((p2) => p2.id);
    let bestOwner: string | null = null;
    let bestN = -1;
    let tie = false;
    for (const oid of owners) {
      const n = owned[oid] || 0;
      if (n > bestN) { bestN = n; bestOwner = oid; tie = false; }
      else if (n === bestN) { tie = true; }
    }
    setGame((g) => (g.status === "playing" ? { ...g, status: "game_end" } : g));
  }, [victoryMode, nowMs, timeLimitMin, game]);
const ownedByOwner = React.useMemo(() => countOwnedByOwnerId(game), [game]);

  const selectionLabel = React.useMemo(() => {
    const id = game.turn.selectedTerritoryId;
    if (!id) return "—";
    const ttt = game.map.territories.find((x) => x.id === id);
    return ttt ? `${ttt.name} (${ttt.id})` : id;
  }, [game.turn.selectedTerritoryId, game.map.territories]);

  function goBack() {
    if (props?.go) return props.go("departements_config", { config: cfg });
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function handleMapSelect(territoryId: string) {
    const res = selectTerritory(game, territoryId);
    if (res.error) return;
    setGame(res.state);
  }

  function validateThrow() {
    if (game.status !== "playing") return;

    if (game.config.targetSelectionMode === "free" && !game.turn.selectedTerritoryId) return;
    // by_score mode: no selection needed

    const dartScores = computeVisitScores(currentThrow);
    const r1 = applyVisit(game, dartScores);
    if (r1.error) return;

    let next = r1.state;

    // Victory check
    const ownedNow = countOwnedByOwnerId(next);

    const possibleOwners = next.teams?.length ? next.teams.map((t2) => t2.id) : next.players.map((p2) => p2.id);

    if (victoryMode === "territories") {
      const need = objectiveTerritories;
      const winner = possibleOwners.find((oid) => (ownedNow[oid] || 0) >= need);
      if (winner) {
        setGame({ ...next, status: "game_end" });
        return;
      }
    }

    if (victoryMode === "regions") {
      const need = objectiveRegions;
      const winner = possibleOwners.find((oid) => countRegionsOwned(next, oid) >= need);
      if (winner) {
        setGame({ ...next, status: "game_end" });
        return;
      }
    }

    // time mode is handled by a timer effect (most territories at end)

    const r2 = endTurn(next);
    setGame(r2.state);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050607", color: "#fff", display: "flex", flexDirection: "column" }}>
      <PageHeader
        tickerSrc={tickerSrc}
        tickerAlt="TERRITORIES"
        tickerHeight={92}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles" content={RULES_TEXT(objective)} />}
      />

      {/* Players HUD (no text for turn) */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          {game.players.map((p) => {
            const isActive = p.id === game.turn.activePlayerId;
            return (
              <div
                key={p.id}
                title={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: isActive ? `1px solid ${p.color}` : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isActive ? `0 0 10px ${p.color}` : "none",
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 999, background: p.color, boxShadow: isActive ? `0 0 10px ${p.color}` : "none" }} />
                <div style={{ fontSize: 12, opacity: isActive ? 1 : 0.75 }}>{p.name}</div>
              </div>
            );
          })}
        </div>

        <div style={{ minWidth: 150, textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {t?.("round") || "Round"} {game.roundIndex}/{maxRounds}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {t?.("objective") || "Objectif"}: {objective}
          </div>
        </div>
      </div>

      {/* Selection + progress */}
      <div style={{ padding: "0 12px 8px", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Objectif sélectionné: <span style={{ color: activeColor }}>{selectionLabel}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Possessions:{" "}
          {game.teams?.length
            ? `${game.teams[0].name} ${ownedByOwner[game.teams[0].id] || 0} • ${game.teams[1].name} ${ownedByOwner[game.teams[1].id] || 0}`
            : `${ownedByOwner[game.turn.activePlayerId] || 0}`}
        </div>
      </div>

      {/* MAP */}
      <div style={{ flex: 1, padding: 12 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 18,
            background: "rgba(12, 14, 26, 0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <TerritoriesMapView
            country={country}
            map={game.map}
            ownerColors={ownerColors}
            selectedTerritoryId={game.turn.selectedTerritoryId}
            activeColor={activeColor}
            themeColor={themeColor}
            interactive={game.config.targetSelectionMode === "free" && game.status === "playing"}
            onSelectTerritory={handleMapSelect}
          />
        </div>
      </div>

      {/* KEYPAD */}
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
