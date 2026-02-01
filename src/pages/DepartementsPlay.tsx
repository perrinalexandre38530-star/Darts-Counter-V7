// ============================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES (Départements / Pays) — PLAY
// ✅ Carte cliquable + colorisée + liée au pays choisi en config
// ✅ Pas de texte "AU TOUR DE" : le joueur actif est indiqué visuellement (glow)
// ✅ France: base = france_departements.svg (déjà dans le projet)
//    + overlay régions = france_regions.svg (traits couleur thème)
// ✅ Options supportées (config):
//    - Cible: choisir avant (free) OU attribution par score (by_score)
//    - Victoire: X territoires OU X régions (FR) OU au temps
// ============================================

import React from "react";

import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";
import ProfileAvatar from "../components/ProfileAvatar";

import type { Dart as UIDart } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type {
  TerritoriesCountry,
  TerritoriesGameState,
  TerritoriesPlayer,
  TerritoriesTeam,
  TerritoriesVictoryCondition,
} from "../territories/types";
import { buildTerritoriesMap } from "../territories/map";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import { normalizeTerritoriesState, selectTerritory, applyVisit, endTurn, countOwnedByOwnerId } from "../territories/engine";

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

  // NEW options
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

type PlayerLiveStats = { darts: number; steals: number; lost: number };

const RULES_TEXT = (cfg: {
  objective: number;
  selectionMode: "free" | "by_score";
  captureRule: "exact" | "gte";
  victoryMode: "territories" | "regions" | "time";
  winTerritories: number;
  winRegions: number;
  timeLimitMin: number;
}) => {
  const { objective, selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin } = cfg;
  const cap = captureRule === "gte" ? "≥" : "=";
  return `TERRITORIES

But
- Capturer des territoires selon la condition de victoire.

Cible
- ${selectionMode === "free" ? "Choisir la cible sur la carte avant la volée" : "Ne pas choisir : le score de la volée attribue la cible"}

Capture
- Règle: score ${cap} valeur du territoire (sur 3 fléchettes).

Victoire
- ${
    victoryMode === "territories"
      ? `Atteindre ${winTerritories} territoires.`
      : victoryMode === "regions"
        ? `Atteindre ${winRegions} régions (France : une région est gagnée quand tous ses départements sont capturés).`
        : `Temps: ${timeLimitMin} min, celui qui a le plus de territoires gagne.`
  }

Notes
- Le tour n'est pas affiché en texte : l'avatar actif est glow.
- La carte est le cœur du gameplay (clic + couleurs).`;
};

export default function DepartementsPlay(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  // Profiles store (for names + avatars)
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

  const selectionMode: "free" | "by_score" = effectiveCfg.targetSelectionMode === "by_score" ? "by_score" : "free";
  const captureRule: "exact" | "gte" = effectiveCfg.captureRule === "gte" ? "gte" : "exact";
  const victoryMode: "territories" | "regions" | "time" =
    effectiveCfg.victoryMode === "regions" ? "regions" : effectiveCfg.victoryMode === "time" ? "time" : "territories";
  const winTerritories = Math.max(1, Number(effectiveCfg.winTerritories || effectiveCfg.objective || 10));
  const winRegions = Math.max(1, Number(effectiveCfg.winRegions || 3));
  const timeLimitMin = Math.max(1, Number(effectiveCfg.timeLimitMin || 20));

  const tickerSrc = findTerritoriesTicker(mapId) || findTerritoriesTicker(country) || undefined;

  // Build players/teams + owner colors
  const { players, teams, ownerColors } = React.useMemo(() => {
    if (effectiveCfg.teamSize > 1 && Array.isArray(effectiveCfg.selectedIds) && effectiveCfg.selectedIds.length) {
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

    const ids = Array.isArray(effectiveCfg.selectedIds) && effectiveCfg.selectedIds.length ? effectiveCfg.selectedIds : ["Player A", "Player B"];
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

  // Engine state
  const initialState = React.useMemo<TerritoriesGameState>(() => {
    const map = buildTerritoriesMap(country);
    const base: TerritoriesGameState = {
      config: {
        country,
        targetSelectionMode: selectionMode === "by_score" ? "by_score" : "free",
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

    const norm = normalizeTerritoriesState(base);
    return norm.state;
  }, [country, maxRounds, victoryCondition, selectionMode, captureRule, players, teams]);

  const [game, setGame] = React.useState<TerritoriesGameState>(initialState);

  // Score input state
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerLiveStats>>(() => {
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, steals: 0, lost: 0 };
    return out;
  });

  React.useEffect(() => {
    setGame(initialState);
    setCurrentThrow([]);
    setMultiplier(1);
    const out: Record<string, PlayerLiveStats> = {};
    for (const p of players) out[p.id] = { darts: 0, steals: 0, lost: 0 };
    setPlayerStats(out);
  }, [initialState, players]);

  const activePlayer = React.useMemo(() => game.players.find((p) => p.id === game.turn.activePlayerId), [game]);
  const activeColor = activePlayer?.color || theme?.accent || "#52f7ff";
  const themeColor = theme?.accent || activeColor;

  const ownedByOwner = React.useMemo(() => countOwnedByOwnerId(game), [game]);

  const selectionLabel = React.useMemo(() => {
    const id = game.turn.selectedTerritoryId;
    if (!id) return "—";
    const ttt = game.map.territories.find((x) => x.id === id);
    return ttt ? `${ttt.name} • ${ttt.value} (${ttt.id})` : id;
  }, [game.turn.selectedTerritoryId, game.map.territories]);

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
    if (game.status !== "playing") return;

    // Free mode requires a selected territory
    if (game.config.targetSelectionMode === "free" && !game.turn.selectedTerritoryId) return;

    const dartScores = computeVisitScores(currentThrow);

    // Stats snapshot before applying
    const activeId = game.turn.activePlayerId;
    const beforeTid = game.turn.selectedTerritoryId;
    const beforeTerritory = beforeTid ? game.map.territories.find((t) => t.id === beforeTid) : undefined;
    const beforeOwner = beforeTerritory?.ownerId;

    const r1 = applyVisit(game, dartScores);
    if (r1.error) return;
    const next = r1.state;

    // Update live per-player stats
    setPlayerStats((prev) => {
      const out = { ...prev };
      const cur = out[activeId] || { darts: 0, steals: 0, lost: 0 };
      cur.darts += 3;
      out[activeId] = cur;

      const captured = r1.events?.some((e) => e.type === "territory_captured");
      if (captured) {
        if (beforeOwner && beforeOwner !== activeId && out[beforeOwner]) {
          out[activeId] = { ...out[activeId], steals: (out[activeId]?.steals || 0) + 1 };
          out[beforeOwner] = { ...out[beforeOwner], lost: (out[beforeOwner]?.lost || 0) + 1 };
        }
      }
      return out;
    });

    if (next.status !== "playing") {
      // victory/time end handled by engine
      setGame(next);
      setCurrentThrow([]);
      setMultiplier(1);
      return;
    }

    const r2 = endTurn(next);
    setGame(r2.state);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  // Time remaining (for UI only)
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

  const showValues = true;

  return (
    <div style={{ minHeight: "100vh", background: "#050607", color: "#fff", display: "flex", flexDirection: "column" }}>
      <PageHeader
        tickerSrc={tickerSrc}
        tickerAlt="TERRITORIES"
        tickerHeight={92}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles" content={RULES_TEXT({ objective: winTerritories, selectionMode, captureRule, victoryMode, winTerritories, winRegions, timeLimitMin })} />}
      />

      {/* ACTIVE PLAYER HUD (no "AU TOUR DE" text) */}
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: "10px 10px",
            borderRadius: 18,
            background: "rgba(12, 14, 26, 0.55)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Active medallion */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 190 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 999,
                overflow: "hidden",
                boxShadow: `0 0 22px ${activeColor}aa`,
                outline: `2px solid ${activeColor}66`,
                outlineOffset: 2,
                flexShrink: 0,
              }}
            >
              <ProfileAvatar
                profile={profileById[game.turn.activePlayerId] ?? { id: game.turn.activePlayerId, name: activePlayer?.name }}
                size={58}
                ringColor={activeColor}
                textColor="#fff"
                showStars={false}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activePlayer?.name || "Player"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12 }}>
                  🗺️ {activePlayer ? activePlayer.capturedTerritories.length : 0}
                </div>
                <div style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12 }}>
                  🎯 {playerStats[game.turn.activePlayerId]?.darts || 0}
                </div>
                <div style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12 }}>
                  🥷 {playerStats[game.turn.activePlayerId]?.steals || 0}
                </div>
                <div style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12 }}>
                  💥 {playerStats[game.turn.activePlayerId]?.lost || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Team / ownership summary */}
          <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            {game.teams?.length ? (
              <>
                <div style={{ minWidth: 140, padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.25)", border: `1px solid ${game.teams[0].color}55` }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{game.teams[0].name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: game.teams[0].color }}>
                    {(ownedByOwner[game.teams[0].id] || 0)}/{victoryMode === "territories" ? winTerritories : victoryMode === "regions" ? winRegions : winTerritories}
                  </div>
                </div>
                <div style={{ minWidth: 140, padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.25)", border: `1px solid ${game.teams[1].color}55` }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{game.teams[1].name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: game.teams[1].color }}>
                    {(ownedByOwner[game.teams[1].id] || 0)}/{victoryMode === "territories" ? winTerritories : victoryMode === "regions" ? winRegions : winTerritories}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ minWidth: 180, padding: "10px 12px", borderRadius: 14, background: "rgba(0,0,0,0.25)", border: `1px solid ${activeColor}55` }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Possessions</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: activeColor }}>
                  {(ownedByOwner[game.turn.activePlayerId] || 0)}/{victoryMode === "territories" ? winTerritories : winTerritories}
                </div>
              </div>
            )}
          </div>

          {/* Round / objective */}
          <div style={{ minWidth: 150, textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {t?.("round") || "Round"} {game.roundIndex}/{maxRounds}
            </div>
            {victoryMode === "time" ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>{t?.("time") || "Temps"}: {timeRemaining ?? "—"}</div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.85 }}>{t?.("objective") || "Objectif"}: {victoryMode === "regions" ? `${winRegions} régions` : `${winTerritories} territoires`}</div>
            )}
          </div>
        </div>
      </div>

      {/* TERRITORY VALUES (info modal) */}
      {showValues && (
        <div style={{ padding: "0 12px 4px", display: "flex", justifyContent: "flex-end" }}>
          <InfoDot
            title="Valeurs des territoires"
            content={
              <div style={{ maxHeight: "70vh", overflow: "auto" }} className="dc-scroll-thin">
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>Valeurs des territoires</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>Chaque territoire a une valeur cible (score total sur une volée).</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...game.map.territories]
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
                        <div style={{ minWidth: 52, textAlign: "center", fontWeight: 900, color: themeColor }}>{tt.value}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tt.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>{tt.id}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            }
          />
        </div>
      )}

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
