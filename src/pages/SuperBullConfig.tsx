// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import TeamPagedSelector from "../components/TeamPagedSelector";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { loadBotPlayers } from "../lib/bots";
import { loadTeamsBySport, resolveTeamLogo } from "../lib/petanqueTeamsStore";

export type SuperBullConfigPayload = CommonConfig & {
  entryMode?: "quick" | "arcade";
  participantSource?: "players" | "teams";
  selectedIds?: string[];
  selectedTeamIds?: string[];
  players?: any[];
};

type EntryMode = "quick" | "arcade";

type SavedState = {
  entryMode?: EntryMode;
  quick?: Partial<CommonConfig> & { playersCount?: number };
  arcade?: Partial<CommonConfig> & {
    participantSource?: "players" | "teams";
    selectedIds?: string[];
    selectedTeamIds?: string[];
    botsPanelEnabled?: boolean;
    botIds?: string[];
  };
};

const STORAGE_KEY = "msc.super_bull.last_config.v3";
const MAX_PLAYERS = 4;
const ROUND_OPTIONS = [5, 10, 15, 20];
const OBJECTIVE_OPTIONS = [0, 100, 150, 200, 300, 500];
const PLAYER_OPTIONS = [1, 2, 3, 4];
const presets = [
  { id: "sprint", label: "SPRINT", sub: "5 rounds · objectif 100", rounds: 5, objective: 100 },
  { id: "standard", label: "STANDARD", sub: "10 rounds · objectif 200", rounds: 10, objective: 200 },
  { id: "expert", label: "EXPERT", sub: "15 rounds · objectif 500", rounds: 15, objective: 500 },
  { id: "score", label: "SCORE PUR", sub: "10 rounds · sans objectif", rounds: 10, objective: 0 },
] as const;

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}

function loadUserBots() {
  try {
    return loadBotPlayers()
      .map((bot: any) => ({
        ...bot,
        id: String(bot?.id || ""),
        name: bot?.name || "BOT",
        avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
        avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null,
        avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
        botLevel: bot?.botLevel ?? bot?.level ?? "normal",
        isBot: true,
      }))
      .filter((bot: any) => Boolean(bot.id));
  } catch {
    return [];
  }
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.quick || parsed.arcade || parsed.entryMode) return parsed as SavedState;
    return {
      entryMode: "quick",
      quick: parsed,
    };
  } catch {
    return {};
  }
}

function avatarSrcOf(profile: any) {
  return profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? profile?.photoUrl ?? null;
}

function directTeamLogo(team: any) {
  return team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarUrl ?? team?.imageUrl ?? team?.regionLogoDataUrl ?? team?.regionLogoUrl ?? null;
}

function pillStyle(active: boolean, accent = "#29deff"): React.CSSProperties {
  return {
    minHeight: 40,
    borderRadius: 999,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.12)"}`,
    background: active ? `linear-gradient(135deg, ${accent}24, rgba(255,255,255,.08))` : "rgba(255,255,255,.06)",
    color: active ? accent : "#eef8ff",
    fontWeight: 1000,
    letterSpacing: .7,
    padding: "0 14px",
    cursor: "pointer",
    boxShadow: active ? `0 0 18px ${accent}22` : "none",
  };
}

function segmentedButtonStyle(active: boolean, accent = "#29deff"): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.10)"}`,
    background: active ? `linear-gradient(145deg, ${accent}24, rgba(255,255,255,.05))` : "rgba(7,13,22,.88)",
    color: active ? accent : "#f4fbff",
    cursor: "pointer",
    padding: "10px 12px",
    textAlign: "left",
    boxShadow: active ? `0 0 22px ${accent}18` : "none",
  };
}

function cardStyle(accent = "#29deff"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: `1px solid ${accent}2f`,
    background: "linear-gradient(180deg, rgba(8,14,24,.94), rgba(5,9,16,.92))",
    boxShadow: "0 18px 36px rgba(0,0,0,.38)",
    padding: 14,
  };
}

function valueCard(label: string, value: React.ReactNode) {
  return (
    <div style={{ padding: 10, borderRadius: 16, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.09)", minHeight: 74 }}>
      <div style={{ color: "#93a9bb", fontSize: 10, fontWeight: 1000, letterSpacing: 1 }}>{label}</div>
      <div style={{ marginTop: 7, color: "#ffffff", fontSize: 16, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

export default function SuperBullConfig(props: any) {
  const spec = SIMPLE_ROUND_VARIANTS.super_bull;
  const store = props?.store ?? props?.params?.store ?? null;
  const saved = React.useMemo(loadSavedState, []);
  const forcedLaunchMode: EntryMode | null = props?.params?.launchMode === "quick" ? "quick" : props?.params?.launchMode === "arcade" ? "arcade" : null;
  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p) => !isBotLike(p)), [storeProfiles]);
  const botProfiles = React.useMemo(loadUserBots, []);
  const teamCatalog = React.useMemo(() => {
    try {
      return (loadTeamsBySport("darts") || []).filter(
        (team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0
      );
    } catch {
      return [];
    }
  }, []);
  const allArcadeItems = React.useMemo(() => [...humanProfiles, ...botProfiles], [humanProfiles, botProfiles]);
  const profileById = React.useMemo(() => new Map(allArcadeItems.map((p: any) => [String(p.id), p])), [allArcadeItems]);
  const teamById = React.useMemo(() => new Map(teamCatalog.map((team: any) => [String(team.id), team])), [teamCatalog]);
  const humanProfileById = React.useMemo(() => new Map(humanProfiles.map((p: any) => [String(p.id), p])), [humanProfiles]);

  const legacyInitial = React.useMemo(() => ({ ...spec.defaults, ...(props?.params?.config || {}) }), [props?.params?.config, spec.defaults]);
  const initialQuick = { ...legacyInitial, ...(saved.quick || {}) } as any;
  const initialArcade = { ...legacyInitial, ...(saved.arcade || {}) } as any;

  const [entryMode, setEntryMode] = React.useState<EntryMode>(forcedLaunchMode || (saved.entryMode === "arcade" ? "arcade" : "quick"));
  const [participantSource, setParticipantSource] = React.useState<"players" | "teams">(initialArcade.participantSource === "teams" ? "teams" : "players");

  const [players, setPlayers] = React.useState(Number(initialQuick.playersCount || initialQuick.players) || 1);
  const [botsEnabled, setBotsEnabled] = React.useState(!!initialQuick.botsEnabled);
  const [botLevel, setBotLevel] = React.useState<any>(initialQuick.botLevel || initialArcade.botLevel || "normal");
  const [humansCount, setHumansCount] = React.useState(Number(initialQuick.humansCount || 1));
  const [rounds, setRounds] = React.useState(Number(initialQuick.rounds || initialArcade.rounds) || 10);
  const [objective, setObjective] = React.useState(Number(initialQuick.objective ?? initialArcade.objective ?? 200));

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => Array.isArray(initialArcade.selectedIds) ? initialArcade.selectedIds.map(String).slice(0, MAX_PLAYERS) : []);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(() => Array.isArray(initialArcade.selectedTeamIds) ? initialArcade.selectedTeamIds.map(String).slice(0, MAX_PLAYERS) : []);
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(initialArcade.botsPanelEnabled === true);
  const [teamLogoById, setTeamLogoById] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let alive = true;
    if (!teamCatalog.length) return () => { alive = false; };
    Promise.all(teamCatalog.map(async (team: any) => {
      try { return [String(team.id), await resolveTeamLogo(team, true)] as const; }
      catch { return [String(team.id), String(directTeamLogo(team) || "")] as const; }
    })).then((entries) => {
      if (!alive) return;
      setTeamLogoById(Object.fromEntries(entries.filter(([, src]) => Boolean(src))));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [teamCatalog]);

  const selectedArcadeItems = React.useMemo(
    () => selectedIds.map((id) => profileById.get(String(id))).filter(Boolean),
    [selectedIds, profileById]
  );
  const selectedHumans = React.useMemo(() => selectedArcadeItems.filter((p: any) => !isBotLike(p)), [selectedArcadeItems]);
  const selectedBots = React.useMemo(() => selectedArcadeItems.filter((p: any) => isBotLike(p)), [selectedArcadeItems]);
  const selectedTeams = React.useMemo(() => selectedTeamIds.map((id) => teamById.get(String(id))).filter(Boolean), [selectedTeamIds, teamById]);
  const teamParticipants = React.useMemo(() => selectedTeams.map((team: any, i: number) => {
    const memberIds = Array.isArray(team?.playerIds) ? team.playerIds.map(String).filter(Boolean) : [];
    const memberNames = memberIds.map((id: string) => humanProfileById.get(id)?.name).filter(Boolean).map(String);
    return {
      id: `team:${String(team?.id ?? i + 1)}`,
      name: String(team?.name || `Équipe ${i + 1}`),
      avatarDataUrl: teamLogoById[String(team?.id)] || directTeamLogo(team),
      isBot: false,
      isTeam: true,
      teamId: String(team?.id ?? ""),
      teamMemberIds: memberIds,
      teamMemberNames: memberNames,
    };
  }), [selectedTeams, humanProfileById, teamLogoById]);
  const validArcade = participantSource === "teams" ? teamParticipants.length >= 1 : selectedArcadeItems.length >= 1;
  const validQuick = players >= 1;
  const canStart = entryMode === "quick" ? validQuick : validArcade;

  const quickCfg = React.useMemo(() => ({
    players,
    playersCount: players,
    botsEnabled,
    botLevel,
    humansCount: botsEnabled ? Math.min(Math.max(1, humansCount), Math.max(1, players - 1)) : players,
    rounds,
    objective,
    entryMode: "quick",
    quickParty: true,
    partyMode: "quick",
    profileStatsDeferred: true,
    temporaryParticipants: true,
    audio: { arcadeEnabled: false, hitEnabled: false, voiceEnabled: false, sfxVolume: 0 },
  }), [players, botsEnabled, botLevel, humansCount, rounds, objective]);

  const arcadeCfg = React.useMemo(() => ({
    players: participantSource === "teams" ? teamParticipants : selectedArcadeItems.map((p: any, i: number) => ({
        id: String(p?.id ?? `p${i + 1}`),
        name: String(p?.name ?? `Joueur ${i + 1}`),
        avatarDataUrl: avatarSrcOf(p),
        isBot: isBotLike(p),
        botLevel: p?.botLevel ?? p?.level ?? botLevel,
      })),
    participantSource,
    teamMode: participantSource === "teams",
    selectedTeamIds,
    teams: participantSource === "teams" ? teamParticipants.map((team: any) => ({
      id: team.teamId,
      name: team.name,
      logoDataUrl: team.avatarDataUrl,
      playerIds: team.teamMemberIds,
      playerNames: team.teamMemberNames,
    })) : [],
    selectedIds,
    playersCount: participantSource === "teams" ? teamParticipants.length : selectedArcadeItems.length,
    botsEnabled: participantSource === "players" && selectedBots.length > 0,
    humansCount: participantSource === "teams" ? teamParticipants.length : Math.max(0, selectedHumans.length),
    botLevel,
    rounds,
    objective,
    entryMode: "arcade",
    quickParty: false,
    partyMode: "arcade",
    profileStatsDeferred: false,
    temporaryParticipants: false,
    botsPanelEnabled,
  }), [participantSource, teamParticipants, selectedTeamIds, selectedArcadeItems, selectedIds, selectedBots.length, selectedHumans.length, botLevel, rounds, objective, botsPanelEnabled]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        entryMode,
        quick: quickCfg,
        arcade: {
          participantSource,
          selectedIds,
          selectedTeamIds,
          botLevel,
          rounds,
          objective,
          botsPanelEnabled,
        },
      }));
    } catch {}
  }, [entryMode, quickCfg, participantSource, selectedIds, selectedTeamIds, botLevel, rounds, objective, botsPanelEnabled]);

  const toggleSelected = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  }, []);

  const toggleTeamSelected = React.useCallback((idRaw: string) => {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedTeamIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  }, []);

  const back = React.useCallback(() => {
    if (props?.setTab) return props.setTab(forcedLaunchMode ? "super_bull_config" : "games");
    window.history.back();
  }, [props, forcedLaunchMode]);

  const start = React.useCallback(() => {
    const cfg = entryMode === "quick" ? quickCfg : arcadeCfg;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        entryMode,
        quick: quickCfg,
        arcade: {
          participantSource,
          selectedIds,
          selectedTeamIds,
          botLevel,
          rounds,
          objective,
          botsPanelEnabled,
        },
      }));
    } catch {}
    if (props?.setTab) {
      return props.setTab("super_bull_play", {
        config: cfg,
        ...(entryMode === "arcade" ? { players: arcadeCfg.players } : {}),
      });
    }
  }, [entryMode, quickCfg, arcadeCfg, participantSource, selectedIds, selectedTeamIds, botLevel, rounds, objective, botsPanelEnabled, props]);

  const summaryLabel = entryMode === "quick"
    ? `${players} joueur${players > 1 ? "s" : ""}${botsEnabled ? ` · ${Math.max(0, players - Math.min(Math.max(1, humansCount), Math.max(1, players - 1)))} BOT(S)` : ""}`
    : participantSource === "teams"
      ? `${teamParticipants.length} équipe${teamParticipants.length > 1 ? "s" : ""}`
      : `${selectedArcadeItems.length} participant(s)${selectedBots.length ? ` · ${selectedBots.length} BOT(S)` : ""}`;

  return (
    <div
      className="super-bull-config-screen"
      style={{
        height: "100dvh",
        minHeight: 0,
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "calc(112px + env(safe-area-inset-bottom, 0px))",
        background: "radial-gradient(circle at top, rgba(22,46,78,.32), rgba(4,8,14,.98) 44%)",
      }}
    >
      <PageHeader
        title="SUPER BULL"
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={back} />}
        right={<InfoDot title="Règles SUPER BULL" content="3 fléchettes par volée. BULL25 = 25 points, BULL50 = 50 points, toute autre zone = MISS. Le premier à atteindre l'objectif gagne. Sans objectif, le meilleur total à la fin des rounds gagne. En cas d'égalité : score, BULL50, centres, meilleure série puis volées parfaites." />}
      />

      <div style={{ padding: "8px 8px 14px", display: "grid", gap: 10 }}>
        {!forcedLaunchMode ? <section style={{ ...cardStyle(), border: "1px solid rgba(41,222,255,.44)" }}>
          <div style={{ color: "#29deff", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Entrée du mode</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setEntryMode("quick")} style={segmentedButtonStyle(entryMode === "quick")}> 
              <div style={{ fontSize: 14, fontWeight: 1000 }}>⚡ PARTIE RAPIDE</div>
              <div style={{ marginTop: 4, fontSize: 10.5, opacity: .8 }}>Sans profil · joueurs temporaires · démarrage immédiat</div>
            </button>
            <button type="button" onClick={() => setEntryMode("arcade")} style={segmentedButtonStyle(entryMode === "arcade", "#ffd76a")}> 
              <div style={{ fontSize: 14, fontWeight: 1000 }}>🎮 ARCADE</div>
              <div style={{ marginTop: 4, fontSize: 10.5, opacity: .8 }}>Profils / avatars · sélection des participants · BOTS</div>
            </button>
          </div>
        </section> : null}

        {forcedLaunchMode ? <section style={{ ...cardStyle(forcedLaunchMode === "arcade" ? "#ffd76a" : "#29deff"), padding: 12 }}>
          <div style={{ textAlign: "center", fontWeight: 1100, fontSize: 18, letterSpacing: .7 }}>
            {forcedLaunchMode === "quick" ? "⚡ PARTIE RAPIDE SUPER BULL" : "🎮 SUPER BULL · ARCADE"}
          </div>
          <div style={{ marginTop: 4, textAlign: "center", color: "#9fb1c0", fontSize: 10.5, fontWeight: 850 }}>
            {forcedLaunchMode === "quick" ? "SANS PROFIL · JOUEURS TEMPORAIRES · RÉGLAGES ESSENTIELS" : "PROFILS · AVATARS · BOTS · STATISTIQUES LIÉES AUX JOUEURS"}
          </div>
        </section> : null}

        <section style={cardStyle()}>
          <div style={{ color: "#29deff", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Format de partie</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
            {presets.map((preset) => {
              const active = rounds === preset.rounds && objective === preset.objective;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { setRounds(preset.rounds); setObjective(preset.objective); }}
                  style={{
                    minHeight: 74,
                    borderRadius: 18,
                    border: `1px solid ${active ? "#29deff" : "rgba(255,255,255,.10)"}`,
                    background: active ? "linear-gradient(145deg, rgba(41,222,255,.18), rgba(255,255,255,.07))" : "rgba(255,255,255,.055)",
                    color: "#fff",
                    textAlign: "left",
                    padding: "12px 10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 1000, letterSpacing: .7 }}>{preset.label}</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: .78 }}>{preset.sub}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {valueCard("ROUNDS", (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ROUND_OPTIONS.map((value) => <button key={value} type="button" onClick={() => setRounds(value)} style={pillStyle(rounds === value)}>{value}</button>)}
              </div>
            ))}
            {valueCard("OBJECTIF", (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {OBJECTIVE_OPTIONS.map((value) => <button key={value} type="button" onClick={() => setObjective(value)} style={pillStyle(objective === value, "#ffd76a")}>{value === 0 ? "SCORE" : value}</button>)}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid rgba(41,222,255,.18)", background: "rgba(41,222,255,.08)", fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,.84)" }}>
            <b style={{ color: "#29deff" }}>BULL25 = 25 pts · BULL50 = 50 pts · MISS = 0 pt</b><br />
            {objective > 0 ? `Victoire immédiate à ${objective} points.` : `Pas d'objectif : classement final après ${rounds} rounds.`} Trois fléchettes obligatoires à chaque volée.
          </div>
        </section>

        {entryMode === "quick" ? (
          <section style={cardStyle()}>
            <div style={{ color: "#29deff", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Participants temporaires</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {valueCard("NOMBRE DE JOUEURS", (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PLAYER_OPTIONS.map((value) => <button key={value} type="button" onClick={() => setPlayers(value)} style={pillStyle(players === value)}>{value} joueur{value > 1 ? "s" : ""}</button>)}
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: botsEnabled && players > 1 ? "1fr 1fr" : "1fr", gap: 10 }}>
                {valueCard("BOTS IA", (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setBotsEnabled(false)} style={pillStyle(!botsEnabled)}>NON</button>
                    <button type="button" onClick={() => setBotsEnabled(true)} style={pillStyle(botsEnabled, "#ffd76a")}>OUI</button>
                  </div>
                ))}
                {botsEnabled && players > 1 ? valueCard("JOUEURS HUMAINS", (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Array.from({ length: Math.max(1, players - 1) }, (_, i) => i + 1).map((value) => (
                      <button key={value} type="button" onClick={() => setHumansCount(value)} style={pillStyle(Math.min(Math.max(1, humansCount), Math.max(1, players - 1)) === value, "#ffd76a")}>{value}</button>
                    ))}
                  </div>
                )) : null}
              </div>
              {botsEnabled ? valueCard("DIFFICULTÉ IA", (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[{ id: "easy", label: "FACILE" }, { id: "normal", label: "NORMAL" }, { id: "hard", label: "DIFFICILE" }].map((level) => (
                    <button key={level.id} type="button" onClick={() => setBotLevel(level.id)} style={pillStyle(botLevel === level.id, "#ffd76a")}>{level.label}</button>
                  ))}
                </div>
              )) : null}
            </div>
          </section>
        ) : (
          <>
            <section style={cardStyle()}>
              <div style={{ color: "#ffd76a", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Arcade · Participants</div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setParticipantSource("players")} style={segmentedButtonStyle(participantSource === "players", "#29deff")}>
                  <div style={{ fontSize: 13, fontWeight: 1000 }}>👤 JOUEURS</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: .78 }}>Profils + BOTS IA</div>
                </button>
                <button type="button" onClick={() => setParticipantSource("teams")} style={segmentedButtonStyle(participantSource === "teams", "#ffd76a")}>
                  <div style={{ fontSize: 13, fontWeight: 1000 }}>🛡️ ÉQUIPES</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: .78 }}>Teams enregistrées · score collectif</div>
                </button>
              </div>
              {participantSource === "players" ? <>
                <div style={{ marginTop: 10, color: "#a6b9c8", fontSize: 11, lineHeight: 1.45 }}>
                  Sélectionne de 1 à {MAX_PLAYERS} participants avec leurs avatars et profils. L’ordre de sélection devient l’ordre de jeu.
                </div>
                <div style={{ marginTop: 10 }}>
                  <PlayerPagedSelector
                    usageMode="super_bull"
                    profiles={humanProfiles}
                    selectedIds={selectedIds}
                    onToggle={toggleSelected}
                    accent="#29deff"
                    pageSize={9}
                    modalTitle="Choisir les joueurs SUPER BULL"
                    showSelectedSummary={true}
                  />
                </div>
                {!humanProfiles.length ? <div style={{ marginTop: 10, color: "#ffb8c7", fontSize: 11.5, fontWeight: 850 }}>Aucun profil local disponible pour le moment.</div> : null}
              </> : <>
                <div style={{ marginTop: 10, color: "#a6b9c8", fontSize: 11, lineHeight: 1.45 }}>
                  Chaque équipe devient un participant de score SUPER BULL. Son logo, son nom et la liste de ses membres sont conservés dans la partie, l’historique et la reprise.
                </div>
                <div style={{ marginTop: 10 }}>
                  <TeamPagedSelector
                    teams={teamCatalog}
                    selectedIds={selectedTeamIds}
                    onToggle={toggleTeamSelected}
                    accent="#ffd76a"
                    pageSize={9}
                    modalTitle="Choisir les équipes SUPER BULL"
                    chooseLabel="Choisir équipes"
                    listLabel="Liste équipes"
                  />
                </div>
                {!teamCatalog.length ? <div style={{ marginTop: 10, color: "#ffb8c7", fontSize: 11.5, fontWeight: 850 }}>Aucune équipe Darts enregistrée pour le moment.</div> : null}
                {selectedTeamIds.length >= MAX_PLAYERS ? <div style={{ marginTop: 10, color: "#ffd76a", fontSize: 11.5, fontWeight: 850 }}>Maximum {MAX_PLAYERS} équipes pour SUPER BULL.</div> : null}
              </>}
            </section>

            {participantSource === "players" ? <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ color: "#ffd76a", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Arcade · BOTS IA</div>
                  <div style={{ marginTop: 4, color: "#a6b9c8", fontSize: 11 }}>Optionnel : ajoute des bots au roster Arcade (max total {MAX_PLAYERS}).</div>
                </div>
                <button type="button" onClick={() => setBotsPanelEnabled((v) => !v)} style={pillStyle(botsPanelEnabled, "#ffd76a")}>{botsPanelEnabled ? "MASQUER" : "AFFICHER"}</button>
              </div>
              {botsPanelEnabled ? <div style={{ marginTop: 10 }}>
                <BotPagedSelector bots={botProfiles} selectedIds={selectedIds} onToggle={toggleSelected} accent="#ffd76a" label="BOTS IA" showCheckbox={false} showSelectedSummary={false} />
              </div> : null}
              {selectedIds.length >= MAX_PLAYERS ? <div style={{ marginTop: 10, color: "#ffd76a", fontSize: 11.5, fontWeight: 850 }}>Roster complet : retire un participant pour en ajouter un autre.</div> : null}
            </section> : null}
          </>
        )}

        <section style={cardStyle()}>
          <div style={{ color: entryMode === "arcade" ? "#ffd76a" : "#29deff", fontSize: 12, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>Résumé prêt à lancer</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}><span style={{ color: "#8ca3b5" }}>Mode</span><b>{entryMode === "quick" ? "PARTIE RAPIDE" : "ARCADE"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}><span style={{ color: "#8ca3b5" }}>Participants</span><b>{summaryLabel}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}><span style={{ color: "#8ca3b5" }}>Règle</span><b>{objective > 0 ? `${objective} pts à atteindre` : `${rounds} rounds · score final`}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}><span style={{ color: "#8ca3b5" }}>Saisie</span><b>BULL25 · BULL50 · MISS</b></div>
          </div>
          {!canStart ? <div style={{ marginTop: 10, color: "#ff9cb1", fontSize: 11.5, fontWeight: 900, textAlign: "center" }}>{entryMode === "arcade" ? "Sélectionne au moins 1 profil ou BOT pour lancer SUPER BULL." : "Choisis au moins 1 joueur."}</div> : null}
        </section>

        <div style={{ padding: "2px 2px 12px" }}>
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            style={{
              width: "100%",
              minHeight: 54,
              borderRadius: 999,
              border: canStart ? `1px solid ${entryMode === "arcade" ? "#ffd76a" : "#29deff"}` : "1px solid rgba(255,255,255,.10)",
              background: canStart ? `linear-gradient(90deg, ${entryMode === "arcade" ? "#ffd76a" : "#29deff"}, #ffffff)` : "rgba(255,255,255,.07)",
              color: canStart ? "#06111d" : "rgba(255,255,255,.46)",
              fontWeight: 1100,
              fontSize: 15,
              letterSpacing: 1,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart ? `0 0 24px ${entryMode === "arcade" ? "#ffd76a55" : "#29deff44"}` : "none",
            }}
          >
            {entryMode === "quick" ? "LANCER SUPER BULL · PARTIE RAPIDE" : "LANCER SUPER BULL · ARCADE"}
          </button>
        </div>
      </div>
      <style>{`
        .super-bull-config-screen {
          scrollbar-gutter: stable;
          touch-action: pan-y;
        }
        @media (orientation: landscape) {
          .super-bull-config-screen {
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior-y: contain;
            -webkit-overflow-scrolling: touch;
            padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </div>
  );
}
