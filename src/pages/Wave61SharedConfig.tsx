// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { PremiumAwenaButton } from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { loadBotPlayers, subscribeBotsChange } from "../lib/bots";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { getTicker } from "../lib/tickers";
import { WAVE61_ENGINE_VERSION } from "../lib/gameEngines/wave61Engine";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import {
  BotTeamsSection,
  PillButton,
  TeamsSection,
  X01_PRO_BOTS,
  buildX01DartsBotTeams,
} from "./X01ConfigV3";


export type Wave61DedicatedOption = {
  key: string;
  label: string;
  type: "select" | "toggle" | "number";
  defaultValue: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
};

function isBotLike(p: any) { return Boolean(p?.isBot || p?.bot || p?.kind === "bot" || p?.botLevel); }
function avatarOf(p: any) { return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoDataUrl ?? null; }
function normalizeProfile(p: any, isBot = false) { return { ...p, id: String(p?.id || p?.profileId || ""), name: String(p?.name || p?.displayName || (isBot ? "BOT" : "Joueur")), avatarDataUrl: avatarOf(p), isBot: isBot || !!p?.isBot }; }
function shuffle<T>(items: T[]) { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

export default function Wave61SharedConfig(props: any) {
  const go = props?.go ?? props?.setTab;
  const awena = useAwenaOptional();
  const store = props?.store ?? props?.params?.store ?? null;
  const rawModeId = String(props?.forcedModeId || props?.params?.gameId || props?.gameId || "");
  const modeId = rawModeId === "galaxyes" ? "galaxies" : rawModeId;
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const preset = getWave61Preset(spec.id);
  const { theme } = useTheme();
  const accent = preset.accent || theme?.primary || "#ffb13b";
  const key = `dc_wave61_cfg_${spec.id}`;
  const saved = React.useMemo(() => { try { const parsed = JSON.parse(localStorage.getItem(key) || "null"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }, [key]);
  const dedicatedOptions: Wave61DedicatedOption[] = Array.isArray(props?.dedicatedOptions) ? props.dedicatedOptions : [];
  const dedicatedIntro = String(props?.dedicatedIntro || "");
  const dedicatedDefaults = React.useMemo(() => Object.fromEntries(dedicatedOptions.map((option) => [option.key, option.defaultValue])), [spec.id]);
  const [modeOptions, setModeOptions] = React.useState<Record<string, any>>(() => {
    const savedModeOptions = saved?.modeOptions && typeof saved.modeOptions === "object" ? { ...saved.modeOptions } : {};
    // GREEN VS RED V221 migration: the former transferMissMultiplier field already behaved
    // as a fixed value in hit-count scoring. Preserve the user's saved setting explicitly.
    if (spec.id === "green_vs_red" && savedModeOptions.transferMissPoints == null && savedModeOptions.transferMissMultiplier != null) {
      savedModeOptions.transferMissPoints = Number(savedModeOptions.transferMissMultiplier);
    }
    return { ...dedicatedDefaults, ...savedModeOptions };
  });

  const storeProfiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p: any) => !isBotLike(p)).map((p: any) => normalizeProfile(p)), [storeProfiles]);
  const [storedBotProfiles, setStoredBotProfiles] = React.useState<any[]>(() => {
    try { return loadBotPlayers(); } catch { return []; }
  });
  React.useEffect(() => subscribeBotsChange(() => {
    try { setStoredBotProfiles(loadBotPlayers()); } catch { setStoredBotProfiles([]); }
  }), []);
  const botProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const bot of X01_PRO_BOTS || []) {
      const normalized = normalizeProfile({ ...bot, isBot: true, bot: true, source: "pro", isProBot: true }, true);
      if (normalized.id) map.set(normalized.id, normalized);
    }
    for (const bot of storedBotProfiles || []) {
      const id = String(bot?.id || "");
      if (!id) continue;
      const isAwena = id === "bot_awena_official";
      const normalized = normalizeProfile({
        ...bot,
        isBot: true,
        bot: true,
        source: isAwena ? "awena" : "cpu",
        isUserBot: !isAwena,
        groupLabel: isAwena ? "AWENA BOT" : "CPU Home",
      }, true);
      map.set(normalized.id, { ...(map.get(normalized.id) || {}), ...normalized });
    }
    for (const profile of storeProfiles || []) {
      if (!isBotLike(profile)) continue;
      const id = String(profile?.id || "");
      if (!id) continue;
      const isAwena = id === "bot_awena_official";
      const normalized = normalizeProfile({
        ...profile,
        isBot: true,
        bot: true,
        source: isAwena ? "awena" : (String(profile?.source || "cpu") || "cpu"),
        isUserBot: !isAwena && !/^bot_pro_/i.test(id),
        groupLabel: isAwena ? "AWENA BOT" : (/^bot_pro_/i.test(id) ? undefined : "CPU Home"),
      }, true);
      map.set(normalized.id, { ...(map.get(normalized.id) || {}), ...normalized });
    }
    return [...map.values()];
  }, [storedBotProfiles, storeProfiles]);
  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles], [humanProfiles, botProfiles]);
  const profileById = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);

  const lockedRounds = spec.id === "nine_dart_century" ? 3 : spec.id === "double_down" ? 9 : spec.id === "green_vs_red" ? 11 : spec.id === "athletisme" ? 6 : null;
  const lockedGoal = spec.id === "nine_dart_century" ? 100 : spec.id === "shove_a_penny" ? 7 * Math.max(2, Number(modeOptions?.marksPerBox || 3)) : spec.id === "green_vs_red" ? 11 : spec.id === "eperviers" ? Math.max(50, Number(modeOptions?.crossingGoal || 100)) : spec.id === "iceberg" ? Math.max(2, Number(modeOptions?.compartmentGoal || 5)) : spec.id === "apocalypse" ? Math.max(50, Number(modeOptions?.refugeGoal || 100)) : spec.id === "mont_blanc" ? 4809 : spec.id === "everest" ? 8849 : spec.id === "summit_14" ? 14 : null;
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.map(String).slice(0, spec.maxPlayers) : []);
  const [botsOpen, setBotsOpen] = React.useState(saved.botsOpen === true);
  const [participantMode, setParticipantMode] = React.useState<"players" | "teams">(saved.participantMode === "teams" && spec.supportsTeams ? "teams" : "players");
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, "gold" | "pink" | "blue" | "green" | null>>(saved.teamAssignments && typeof saved.teamAssignments === "object" ? saved.teamAssignments : {});
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<"manual" | "saved" | "auto">(saved.teamsSourceMode === "saved" || saved.teamsSourceMode === "auto" ? saved.teamsSourceMode : "manual");
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedStoredTeamIds) ? saved.selectedStoredTeamIds.map(String) : []);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(saved.botTeamsPanelEnabled === true);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedBotTeamIds) ? saved.selectedBotTeamIds.map(String) : []);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(saved.savedTeamMemberSelections && typeof saved.savedTeamMemberSelections === "object" ? saved.savedTeamMemberSelections : {});
  const greenRedFormat = spec.id === "green_vs_red" ? String(modeOptions?.matchFormat || "duel") : "";
  const greenRedTeamSize = spec.id === "green_vs_red" && [2, 3, 4].includes(Number(modeOptions?.teamPlayersPerSide))
    ? Number(modeOptions?.teamPlayersPerSide)
    : 2;
  const effectiveParticipantMode: "players" | "teams" = spec.id === "green_vs_red"
    ? (greenRedFormat === "teams" ? "teams" : "players")
    : participantMode;
  const [difficulty, setDifficulty] = React.useState<"easy" | "normal" | "hard">(saved.difficulty === "easy" || saved.difficulty === "hard" ? saved.difficulty : "normal");
  const [botLevel, setBotLevel] = React.useState<"easy" | "normal" | "hard">(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState(Number(lockedRounds ?? saved.rounds ?? preset.defaultRounds));
  const [goal, setGoal] = React.useState(Number(lockedGoal ?? saved.goal ?? preset.defaultGoal));
  const [lives, setLives] = React.useState(Number(saved.lives ?? preset.defaultLives));
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [targetAdviceEnabled, setTargetAdviceEnabled] = React.useState(saved.targetAdviceEnabled !== false);
  const [awenaCommentaryEnabled, setAwenaCommentaryEnabled] = React.useState(saved.awenaCommentaryEnabled !== false);
  const [wave61SfxEnabled, setWave61SfxEnabled] = React.useState(saved.wave61SfxEnabled !== false);

  React.useEffect(() => {
    if (selectedIds.length) return;
    const active = String(store?.activeProfileId || "");
    const first = humanProfiles.find((p: any) => String(p.id) === active) || humanProfiles[0];
    const second = humanProfiles.find((p: any) => p.id !== first?.id) || botProfiles[1] || botProfiles[0];
    const seed = [first?.id, preset.minPlayers > 1 ? second?.id : null].filter(Boolean).map(String);
    if (seed.length) setSelectedIds(seed.slice(0, spec.maxPlayers));
  }, [humanProfiles.length, botProfiles.length]);

  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ selectedIds, botsOpen, participantMode, teamAssignments, teamsSourceMode, selectedStoredTeamIds, botTeamsPanelEnabled, selectedBotTeamIds, savedTeamMemberSelections, difficulty, botLevel, rounds, goal, lives, randomOrder, scoreInputMethod, modeOptions, targetAdviceEnabled, awenaCommentaryEnabled, wave61SfxEnabled })); } catch {}
  }, [key, selectedIds, botsOpen, participantMode, teamAssignments, teamsSourceMode, selectedStoredTeamIds, botTeamsPanelEnabled, selectedBotTeamIds, savedTeamMemberSelections, difficulty, botLevel, rounds, goal, lives, randomOrder, scoreInputMethod, modeOptions, targetAdviceEnabled, awenaCommentaryEnabled, wave61SfxEnabled]);

  function togglePlayer(rawId: any) {
    const id = String(rawId || "");
    if (!id) return;
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : prev.length >= spec.maxPlayers ? prev : [...prev, id];
      if (exists) setTeamAssignments((old) => { const copy = { ...old }; delete copy[id]; return copy; });
      return next;
    });
  }

  function setPlayerTeam(playerId: string, teamId: "gold" | "pink" | "blue" | "green") {
    setTeamAssignments((prev) => ({ ...prev, [playerId]: prev[playerId] === teamId ? null : teamId }));
  }

  const teamBaseId = (value: any) => String(value?.baseTeamId || value?.sourceTeamId || value?.id || value || "").split("__slot_")[0];
  const teamSuffix = (index: number) => index < 26 ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[index] : `#${index + 1}`;
  const uniqueIds = (ids: any[]) => Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));

  const storedDartsTeams = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); }
    catch { return []; }
  }, [allProfiles]);
  const botDartsTeams = React.useMemo(() => buildX01DartsBotTeams(botProfiles), [botProfiles]);
  const selectableDartsTeams = React.useMemo(() => [...storedDartsTeams, ...botDartsTeams], [storedDartsTeams, botDartsTeams]);

  function toggleSavedTeamMember(teamId: string, playerId: string) {
    setSavedTeamMemberSelections((prev) => {
      const tid = String(teamId || "");
      const base = teamBaseId(tid);
      const team: any = selectableDartsTeams.find((t: any) => String(t?.id || "") === base);
      const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
      const current = Array.isArray(prev[tid]) ? prev[tid] : allIds;
      const pid = String(playerId || "");
      return { ...prev, [tid]: current.includes(pid) ? current.filter((id) => id !== pid) : [...current, pid] };
    });
  }
  function ensureTeamMembers(instanceId: string, teamList: any[]) {
    setSavedTeamMemberSelections((prev) => {
      if (prev[instanceId]) return prev;
      const base = teamBaseId(instanceId);
      const team = (teamList || []).find((t: any) => String(t?.id || t?.baseTeamId || "") === base);
      return { ...prev, [instanceId]: uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []) };
    });
  }
  function addStoredTeamSelection(teamId: string, playerIds: string[]) {
    const base = String(teamId || "");
    const picked = uniqueIds(playerIds);
    if (!base || !picked.length) return;
    setSelectedStoredTeamIds((prev) => {
      const same = prev.filter((id) => teamBaseId(id) === base);
      const instanceId = same.length ? `${base}__slot_${teamSuffix(same.length)}` : base;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked }));
      return [...prev, instanceId];
    });
  }
  function removeStoredTeamSelection(instanceId: string) {
    const tid = String(instanceId || "");
    setSelectedStoredTeamIds((prev) => prev.filter((id) => String(id) !== tid));
    setSavedTeamMemberSelections((prev) => { const copy = { ...prev }; delete copy[tid]; return copy; });
  }
  function toggleStoredTeam(teamId: string) {
    const base = String(teamId || "");
    const team: any = storedDartsTeams.find((t: any) => String(t?.id || "") === base);
    setSelectedStoredTeamIds((prev) => {
      const same = prev.filter((id) => teamBaseId(id) === base);
      const instanceId = same.length ? `${base}__slot_${teamSuffix(same.length)}` : base;
      return [...prev, instanceId];
    });
    ensureTeamMembers(base, storedDartsTeams);
  }
  function addBotTeamSelection(teamId: string, playerIds: string[]) {
    const base = String(teamId || "");
    const picked = uniqueIds(playerIds);
    if (!base || !picked.length) return;
    setSelectedBotTeamIds((prev) => {
      const same = prev.filter((id) => teamBaseId(id) === base);
      const instanceId = same.length ? `${base}__slot_${teamSuffix(same.length)}` : base;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked }));
      return [...prev, instanceId];
    });
  }
  function removeBotTeamSelection(instanceId: string) {
    const tid = String(instanceId || "");
    setSelectedBotTeamIds((prev) => prev.filter((id) => String(id) !== tid));
    setSavedTeamMemberSelections((prev) => { const copy = { ...prev }; delete copy[tid]; return copy; });
  }
  function toggleBotTeam(teamId: string) {
    const base = String(teamId || "");
    const team: any = botDartsTeams.find((t: any) => String(t?.id || "") === base);
    const ids = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    addBotTeamSelection(base, ids.length ? [ids[0]] : []);
  }

  const resolveTeamInstances = React.useCallback((ids: string[], source: any[]) => ids.map((instanceId) => {
    const base = teamBaseId(instanceId);
    const team: any = source.find((t: any) => String(t?.id || "") === base);
    if (!team) return null;
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    const playerIds = uniqueIds(Array.isArray(savedTeamMemberSelections[instanceId]) ? savedTeamMemberSelections[instanceId] : allIds).filter((id) => profileById.has(id));
    return { ...team, id: instanceId, baseTeamId: base, playerIds };
  }).filter(Boolean), [savedTeamMemberSelections, profileById]);

  const selectedStoredTeams = React.useMemo(() => resolveTeamInstances(selectedStoredTeamIds, storedDartsTeams), [resolveTeamInstances, selectedStoredTeamIds, storedDartsTeams]);
  const selectedBotTeams = React.useMemo(() => resolveTeamInstances(selectedBotTeamIds, botDartsTeams), [resolveTeamInstances, selectedBotTeamIds, botDartsTeams]);

  const manualTeamConfigs = React.useMemo(() => {
    const ids: Array<"gold" | "pink" | "blue" | "green"> = ["gold", "pink", "blue", "green"];
    const labels: any = { gold: "Team Gold", pink: "Team Pink", blue: "Team Blue", green: "Team Green" };
    const human = ids.map((teamId) => ({ id: teamId, name: labels[teamId], playerIds: selectedIds.filter((pid) => teamAssignments[pid] === teamId) })).filter((t) => t.playerIds.length);
    return [...human, ...selectedBotTeams];
  }, [selectedIds, teamAssignments, selectedBotTeams]);
  const savedTeamConfigs = React.useMemo(() => [...selectedStoredTeams, ...selectedBotTeams], [selectedStoredTeams, selectedBotTeams]);
  const activeTeamConfigs = teamsSourceMode === "manual" ? manualTeamConfigs : savedTeamConfigs;
  const activeTeamPlayerIds = uniqueIds(activeTeamConfigs.flatMap((team: any) => team.playerIds || []));
  const activeTeamProfiles = activeTeamPlayerIds.map((id) => profileById.get(id)).filter(Boolean);

  const selectedProfiles = selectedIds.map((id) => profileById.get(id)).filter(Boolean);
  const minPlayers = Math.min(spec.maxPlayers, preset.minPlayers);
  const teamSizes = activeTeamConfigs.map((team: any) => Number(team?.playerIds?.length || 0)).filter(Boolean);
  const activeTeamIdsFlat = activeTeamConfigs.flatMap((team: any) => (team?.playerIds || []).map(String));
  const teamIdsUnique = new Set(activeTeamIdsFlat);
  const greenRedTeamsValid = activeTeamConfigs.length === 2
    && teamSizes.length === 2
    && teamSizes[0] === teamSizes[1]
    && [2, 3, 4].includes(teamSizes[0])
    && teamIdsUnique.size === activeTeamIdsFlat.length;
  const greenRedCountValid = spec.id !== "green_vs_red"
    ? true
    : greenRedFormat === "teams"
      ? greenRedTeamsValid
      : greenRedFormat === "multi_random"
        ? selectedProfiles.length >= 3 && selectedProfiles.length <= 10
        : selectedProfiles.length === 2;
  const participantProfiles = spec.id === "green_vs_red" && greenRedFormat === "teams" ? activeTeamProfiles : selectedProfiles;
  const valid = participantProfiles.length >= minPlayers && greenRedCountValid;
  const botCount = participantProfiles.filter(isBotLike).length;
  const familyText = `${preset.label} · moteur mutualisé V${WAVE61_ENGINE_VERSION}`;
  const modeTicker = React.useMemo(() => getTicker(spec.id), [spec.id]);

  function start() {
    if (!valid || typeof go !== "function") return;
    const teamByPlayer: Record<string, string> = {};
    let orderedIds: string[] = [];
    if (spec.id === "green_vs_red" && greenRedFormat === "teams") {
      const [greenTeam, redTeam] = activeTeamConfigs;
      const greenIds = uniqueIds(greenTeam?.playerIds || []);
      const redIds = uniqueIds(redTeam?.playerIds || []);
      const g = randomOrder ? shuffle(greenIds) : greenIds;
      const r = randomOrder ? shuffle(redIds) : redIds;
      const max = Math.max(g.length, r.length);
      for (let i = 0; i < max; i++) {
        if (g[i]) { orderedIds.push(g[i]); teamByPlayer[g[i]] = "A"; }
        if (r[i]) { orderedIds.push(r[i]); teamByPlayer[r[i]] = "B"; }
      }
    } else {
      const baseIds = selectedProfiles.map((p: any) => String(p.id));
      orderedIds = randomOrder ? shuffle(baseIds) : baseIds;
      if (effectiveParticipantMode === "teams") orderedIds.forEach((id, index) => { teamByPlayer[id] = index % 2 === 0 ? "A" : "B"; });
    }
    const playersList = orderedIds.map((id) => profileById.get(id)).filter(Boolean).map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur" }));
    const greenRedVariantId = spec.id === "green_vs_red"
      ? `gvr:${String(modeOptions?.contractRule || "official_unique")}:${String(modeOptions?.scoreModel || "hit_count")}:${String(modeOptions?.bullAccess || "final_only")}:${String(modeOptions?.penaltyModel || "transfer")}:${String(modeOptions?.bullRule || "classic")}:base${Number(modeOptions?.transferBaseErrorPoints ?? 1)}:opp${Number(modeOptions?.transferOppMultiplier ?? 2)}:miss${Number(modeOptions?.transferMissPoints ?? modeOptions?.transferMissMultiplier ?? 2)}`
      : undefined;
    const payload = {
      modeId: spec.id,
      variantId: greenRedVariantId,
      selectedIds: orderedIds,
      players: orderedIds.length,
      playersList,
      botIds: playersList.filter(isBotLike).map((p: any) => String(p.id)),
      botsEnabled: playersList.some(isBotLike),
      participantMode: effectiveParticipantMode,
      teamByPlayer,
      difficulty,
      botLevel,
      rounds: Number(lockedRounds ?? Math.max(1, Math.min(60, Number(rounds) || preset.defaultRounds))),
      goal: Number(lockedGoal ?? Math.max(0, Number(goal) || 0)),
      lives: Math.max(0, Math.min(9, Number(lives) || 0)),
      randomOrder,
      scoreInputMethod,
      modeOptions,
      targetAdviceEnabled,
      awenaCommentaryEnabled,
      wave61SfxEnabled,
      engineFamily: preset.family,
      engineVersion: WAVE61_ENGINE_VERSION,
    };
    try { recordProfileUsageForMode(spec.id, orderedIds); } catch {}
    go("wave61_play", { gameId: spec.id, config: payload });
  }

  const card: React.CSSProperties = { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(16,18,30,.96),rgba(7,9,16,.98))", border: `1px solid ${accent}35`, boxShadow: "0 15px 36px rgba(0,0,0,.38)" };
  const pill = (active: boolean): React.CSSProperties => ({ minHeight: 36, padding: "7px 12px", borderRadius: 999, border: `1px solid ${active ? accent : "rgba(255,255,255,.12)"}`, background: active ? `${accent}1c` : "rgba(255,255,255,.035)", color: active ? "#fff" : "#aeb5c8", fontWeight: 950 });

  return <div className="page wave61-config-screen" data-wave61-config="1" style={{ minHeight: "100dvh", paddingBottom: 88, background: `radial-gradient(circle at 50% 0%,${accent}14,transparent 34%)` }}>
    <div className="wave61-config-header"><PageHeader tickerSrc={modeTicker || undefined} tickerAlt={spec.label} title={modeTicker ? undefined : spec.label} subtitle={modeTicker ? undefined : familyText} tickerHeight={82} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("games", { gamesView: "all" })} color={accent} glow={`${accent}88`} /></div>} right={awena?.enabled !== false ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route={`${spec.id}_config`} mode={spec.id} screenLabel={`${spec.label} · Configuration`} accent={accent} /></div> : null} /></div>
    <div className="wave61-config-body" style={{ padding: "8px 10px 20px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 10, width: "100%", minWidth: 0, overflowX: "hidden" }}>
      <section className="wave61-config-participants" style={spec.id === "green_vs_red" && greenRedFormat === "teams" ? { padding:0, background:"transparent", border:"none", boxShadow:"none" } : card}>
        {spec.id === "green_vs_red" ? <>
          <div style={greenRedFormat === "teams" ? { ...card, marginBottom:10 } : undefined}>
            <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Participants</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:greenRedFormat === "teams" ? 10 : 12}}>
              <PillButton label="Joueurs" active={greenRedFormat!=="teams"} onClick={()=>setModeOptions((prev)=>({...prev,matchFormat:greenRedFormat==="teams"?"duel":greenRedFormat}))} primary={accent} primarySoft={`${accent}1c`} />
              <PillButton label="Équipes" active={greenRedFormat==="teams"} onClick={()=>setModeOptions((prev)=>({...prev,matchFormat:"teams"}))} primary={accent} primarySoft={`${accent}1c`} />
            </div>
            {greenRedFormat === "teams" ? <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7}}>
              {[2,3,4].map((size)=><button key={size} type="button" onClick={()=>setModeOptions((prev)=>({...prev,teamPlayersPerSide:size}))} style={{...pill(greenRedTeamSize===size),minWidth:0,padding:"7px 6px"}}>{size}v{size}<div style={{fontSize:8,opacity:.72,marginTop:1}}>{size*2} joueurs</div></button>)}
            </div> : null}
          </div>

          {greenRedFormat !== "teams" ? <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <PillButton label="Duel 1v1" active={greenRedFormat==="duel"} onClick={()=>{setModeOptions((prev)=>({...prev,matchFormat:"duel"}));setSelectedIds((prev)=>prev.slice(0,2));}} primary={accent} primarySoft={`${accent}1c`} />
              <PillButton label="Multi · 3 à 10" active={greenRedFormat==="multi_random"} onClick={()=>setModeOptions((prev)=>({...prev,matchFormat:"multi_random"}))} primary={accent} primarySoft={`${accent}1c`} />
            </div>
            <PlayerPagedSelector usageMode={spec.id} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={true} />
            <div style={{ marginTop: 10, color: valid ? accent : "#ff97aa", fontSize: 11, fontWeight: 900 }}>{valid ? `${selectedProfiles.length} participant(s) prêt(s)${botCount ? ` · ${botCount} BOT(S)` : ""}` : greenRedFormat === "multi_random" ? "GREEN VS RED MULTI accepte de 3 à 10 participants." : "GREEN VS RED DUEL demande exactement 2 participants."}</div>
          </> : <>
            <TeamsSection
              profiles={allProfiles as any}
              selectableProfiles={humanProfiles as any}
              selectedIds={selectedIds}
              teamAssignments={teamAssignments as any}
              setPlayerTeam={setPlayerTeam as any}
              togglePlayer={togglePlayer}
              playerDartSets={{}}
              handleChangePlayerDartSet={()=>{}}
              allProfiles={humanProfiles as any}
              sourceMode={teamsSourceMode}
              setSourceMode={setTeamsSourceMode as any}
              storedTeams={storedDartsTeams as any}
              selectedStoredTeamIds={selectedStoredTeamIds}
              toggleStoredTeam={toggleStoredTeam}
              addStoredTeamSelection={addStoredTeamSelection}
              removeStoredTeamSelection={removeStoredTeamSelection}
              botTeams={botDartsTeams}
              botTeamsPanelEnabled={botTeamsPanelEnabled}
              setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
              selectedBotTeamIds={selectedBotTeamIds}
              toggleBotTeam={toggleBotTeam}
              addBotTeamSelection={addBotTeamSelection}
              removeBotTeamSelection={removeBotTeamSelection}
              savedTeamMemberSelections={savedTeamMemberSelections}
              toggleSavedTeamMember={toggleSavedTeamMember}
              teamCountOverride={2}
              teamSizeOverride={greenRedTeamSize}
              allowSaveGeneratedTeams={true}
              primary={accent}
              primarySoft={`${accent}1c`}
            />
            <div style={{ marginTop: 10, color: valid ? accent : "#ff97aa", fontSize: 11, fontWeight: 900 }}>
              {valid ? `2 équipes prêtes · ${activeTeamPlayerIds.length} joueurs · ${teamSizes[0]} vs ${teamSizes[1]}` : `Choisis exactement 2 équipes de ${greenRedTeamSize} joueurs (${greenRedTeamSize}v${greenRedTeamSize}).`}
            </div>
          </>}
        </> : <>
          <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Participants</div>
          {spec.supportsTeams ? <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><button style={pill(participantMode === "players")} onClick={() => setParticipantMode("players")}>JOUEURS</button><button style={pill(participantMode === "teams")} onClick={() => setParticipantMode("teams")}>2 ÉQUIPES AUTO</button></div> : null}
          <PlayerPagedSelector usageMode={spec.id} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={true} />
          {spec.supportsBots ? <div style={{ marginTop: 10 }}><button type="button" onClick={() => setBotsOpen((v) => !v)} style={pill(botsOpen)}>{botsOpen ? "☑ BOTS OUVERTS" : "☐ AJOUTER DES BOTS"}</button>{botsOpen ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={botProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS X01 · PRO / CPU / AWENA" showCheckbox={false} showSelectedSummary={false} /></div> : null}</div> : null}
          <div style={{ marginTop: 10, color: valid ? accent : "#ff97aa", fontSize: 11, fontWeight: 900 }}>{valid ? `${selectedProfiles.length} participant(s) prêt(s)${botCount ? ` · ${botCount} BOT(S)` : ""}` : `Sélectionne au moins ${minPlayers} participant(s).`}</div>
          {effectiveParticipantMode === "teams" ? <div style={{ marginTop: 7, color: "#9299ad", fontSize: 10.5 }}>Répartition Wave61 automatique A/B en alternance.</div> : null}
        </>}
      </section>

      {spec.id === "green_vs_red" && spec.supportsBots && greenRedFormat !== "teams" ? <section className="wave61-config-bots" style={card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:9}}>
          <div><div style={{color:accent,fontSize:11,fontWeight:1000,letterSpacing:1,textTransform:"uppercase"}}>Bots IA</div><div style={{color:"#7f8798",fontSize:9.5,marginTop:2}}>Même sélecteur BOT que X01.</div></div>
          <button type="button" aria-pressed={botsOpen} onClick={()=>setBotsOpen((v)=>!v)} style={{...pill(botsOpen),minHeight:32,padding:"5px 10px"}}>{botsOpen?"☑ ON":"☐ OFF"}</button>
        </div>
        {botsOpen ? <BotPagedSelector bots={botProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS X01 · PRO / CPU / AWENA" showCheckbox={false} showSelectedSummary={false} /> : null}
      </section> : spec.id === "green_vs_red" && greenRedFormat === "teams" && teamsSourceMode !== "auto" ? <BotTeamsSection
        botTeams={botDartsTeams}
        selectedBotTeamIds={selectedBotTeamIds}
        toggleBotTeam={toggleBotTeam}
        addBotTeamSelection={addBotTeamSelection}
        removeBotTeamSelection={removeBotTeamSelection}
        botTeamsPanelEnabled={botTeamsPanelEnabled}
        setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
        profiles={allProfiles as any}
        savedTeamMemberSelections={savedTeamMemberSelections}
        toggleSavedTeamMember={toggleSavedTeamMember}
        primary={accent}
        primarySoft={`${accent}1c`}
      /> : null}

      <section className="wave61-config-engine" style={card}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Moteur · {preset.label}</div>
        <OptionRow label="Difficulté"><OptionSelect value={difficulty} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setDifficulty} /></OptionRow>
        {botCount ? <OptionRow label="Niveau BOT"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow> : null}
        <OptionRow label={`Nombre de rounds${lockedRounds ? " · verrouillé" : ""}`}><input type="number" min={1} max={60} value={lockedRounds ?? rounds} disabled={lockedRounds != null} onChange={(e) => setRounds(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: lockedRounds != null ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.28)", color: lockedRounds != null ? "#9ba2b3" : "#fff", padding: "8px 9px", fontWeight: 900 }} /></OptionRow>
        {preset.defaultGoal > 0 ? <OptionRow label={`Objectif moteur${lockedGoal ? " · verrouillé" : ""}`}><input type="number" min={1} max={9999} value={lockedGoal ?? goal} disabled={lockedGoal != null} onChange={(e) => setGoal(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: lockedGoal != null ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.28)", color: lockedGoal != null ? "#9ba2b3" : "#fff", padding: "8px 9px", fontWeight: 900 }} /></OptionRow> : null}
        {preset.defaultLives > 0 ? <OptionRow label="Vies"><OptionSelect value={lives} options={[3,4,5,6,7]} onChange={(v: any) => setLives(Number(v))} /></OptionRow> : null}
        <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
        <OptionRow label="Saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
      </section>

      <section className="wave61-config-assistance" style={{ ...card, borderColor: `${accent}45` }}>
        <div className="wave61-config-awena-card" aria-hidden="true">
          <img src="/awena/awena-avatar.webp" alt="" />
          <div><b>AWENA VOUS EXPLIQUE</b><span>{spec.infoBody}</span></div>
        </div>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Assistance & ambiance</div>
        <div style={{ color: "#aeb5c8", fontSize: 10.5, lineHeight: 1.45, marginBottom: 6 }}>Ces réglages sont communs à tout le catalogue Wave61 et restent mémorisés séparément pour chaque jeu.</div>
        <OptionRow label="Conseil de cible · 3 secondes"><OptionToggle value={targetAdviceEnabled} onChange={setTargetAdviceEnabled} /></OptionRow>
        <OptionRow label="Awena · conseils & commentaires brefs"><OptionToggle value={awenaCommentaryEnabled} onChange={setAwenaCommentaryEnabled} /></OptionRow>
        <OptionRow label="Bruitages Wave61"><OptionToggle value={wave61SfxEnabled} onChange={setWave61SfxEnabled} /></OptionRow>
      </section>

      {dedicatedOptions.length ? <section className="wave61-config-dedicated" style={{ ...card, borderColor: `${accent}4d` }}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Réglages propres à {spec.label}</div>
        {dedicatedIntro ? <div style={{ color: "#aeb5c8", fontSize: 10.5, lineHeight: 1.5, marginBottom: 8 }}>{dedicatedIntro}</div> : null}
        {spec.id === "green_vs_red" ? (() => {
          const optionMap = new Map(dedicatedOptions.map((option) => [option.key, option]));
          const groups = [
            { title: "FORMAT & MANCHES", keys: ["seriesFormat"] },
            { title: "RÈGLE DE VOLÉE", keys: ["contractRule", "scoreModel"] },
            { title: "BULL", keys: ["bullAccess", "bullRule", "greenBullBonus", "redBullBonus"] },
            { title: "PÉNALITÉS", keys: ["penaltyModel", "transferBaseErrorPoints", "transferOppMultiplier", "transferMissPoints"] },
          ];
          return <div style={{ display:"grid", gap:9 }}>
            {groups.map((group) => <div key={group.title} style={{ borderRadius:14, border:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.025)", padding:8, minWidth:0 }}>
              <div style={{ color:accent, fontSize:9, fontWeight:1100, letterSpacing:.8, marginBottom:5 }}>{group.title}</div>
              {group.keys.map((key) => optionMap.get(key)).filter(Boolean).map((option:any) => {
                const value = modeOptions?.[option.key] ?? option.defaultValue;
                const setValue = (next:any) => setModeOptions((prev) => ({ ...prev, [option.key]: next }));
                return <div key={option.key} style={{ marginBottom:4 }}>
                  <OptionRow label={option.label}>{option.type === "toggle" ? <OptionToggle value={!!value} onChange={setValue} /> : option.type === "number" ? <input type="number" min={option.min} max={option.max} step={option.step || 1} value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ width:72, borderRadius:10, border:"1px solid rgba(255,255,255,.14)", background:"rgba(0,0,0,.28)", color:"#fff", padding:"8px 7px", fontWeight:900 }} /> : <OptionSelect value={value} options={option.options || []} onChange={setValue} />}</OptionRow>
                  {option.help ? <div style={{ color:"#777f91", fontSize:9.1, lineHeight:1.35, padding:"0 4px 5px" }}>{option.help}</div> : null}
                </div>;
              })}
            </div>)}
          </div>;
        })() : dedicatedOptions.map((option) => {
          const value = modeOptions?.[option.key] ?? option.defaultValue;
          const setValue = (next: any) => setModeOptions((prev) => ({ ...prev, [option.key]: next }));
          return <div key={option.key} style={{ marginBottom: 4 }}>
            <OptionRow label={option.label}>{option.type === "toggle" ? <OptionToggle value={!!value} onChange={setValue} /> : option.type === "number" ? <input type="number" min={option.min} max={option.max} step={option.step || 1} value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.28)", color: "#fff", padding: "8px 9px", fontWeight: 900 }} /> : <OptionSelect value={value} options={option.options || []} onChange={setValue} />}</OptionRow>
            {option.help ? <div style={{ color: "#777f91", fontSize: 9.3, lineHeight: 1.35, padding: "0 4px 5px" }}>{option.help}</div> : null}
          </div>;
        })}
      </section> : null}

      <section className="wave61-config-launch" style={{ ...card, borderColor: valid ? `${accent}66` : "rgba(255,255,255,.08)" }}>
        <div style={{ color: "#aeb5c8", fontSize: 11, lineHeight: 1.55 }}><b style={{ color: "#fff" }}>{spec.label}</b> utilise désormais le moteur <b style={{ color: accent }}>{preset.label}</b>. La sauvegarde/reprise, l'Undo, les bots, le scoring par dart et l'écran de fin sont branchés dans le socle commun.</div>
        <button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 48, marginTop: 12, borderRadius: 14, border: `1px solid ${valid ? accent : "rgba(255,255,255,.1)"}`, background: valid ? `linear-gradient(180deg,${accent}33,${accent}12)` : "rgba(255,255,255,.03)", color: valid ? "#fff" : "#5e6474", fontWeight: 1100, letterSpacing: .8 }}>LANCER {spec.label}</button>
      </section>
    </div>
  </div>;
}
