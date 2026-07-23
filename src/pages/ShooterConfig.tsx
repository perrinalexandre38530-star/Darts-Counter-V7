// @ts-nocheck
// =============================================================
// SHOOTER — configuration complète / guidée
// Sélecteur JOUEURS / ÉQUIPES identique à X01
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
import Section from "../components/Section";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import type {
  ShooterConfigPayload,
  ShooterParticipantMode,
  ShooterTeamConfig,
  ShooterSequencePreset,
  ShooterPenaltyRule,
  ShooterHitZone,
} from "../lib/gameEngines/shooterEngine";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import {
  BotTeamsSection,
  PillButton,
  SelectedParticipantsCompactBlock,
  TeamsSection,
  X01_PRO_BOTS,
  buildX01DartsBotTeams,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";
import tickerShooter from "../assets/tickers/ticker_shooter.png";

type BotLevel = "easy" | "normal" | "hard";
type TeamsSourceMode = "manual" | "saved" | "auto";
type TeamId = "gold" | "pink" | "blue" | "green";
type BotLite = { id: string; name: string; avatarDataUrl?: string | null; avatarUrl?: string | null; avatar?: string | null; botLevel?: string; isBot?: boolean };

export type { ShooterConfigPayload } from "../lib/gameEngines/shooterEngine";

const LS_CFG_KEY = "dc_modecfg_shooter_v2";
const SHOOTER_CYAN = "#38e7ff";
const TEAM_IDS: TeamId[] = ["gold", "pink", "blue", "green"];
const TEAM_LABELS: Record<TeamId, string> = { gold: "Team Gold", pink: "Team Pink", blue: "Team Blue", green: "Team Green" };
const TEAM_COLORS: Record<TeamId, string> = { gold: "#f7c85c", pink: "#ff4fa2", blue: "#4fc3ff", green: "#6dff7c" };
const TEAM_COLOR_CYCLE = ["#f7c85c", "#ff4fa2", "#4fc3ff", "#6dff7c"];

function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers().map((bot: any) => ({
      id: String(bot.id), name: bot?.name || "BOT", avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
      avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null, avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
      botLevel: bot?.botLevel ?? bot?.level ?? "", isBot: true,
    })).filter((bot: BotLite) => Boolean(bot.id));
  } catch { return []; }
}
function isBotLike(profile: any) { return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel); }
function readSavedConfig() { try { const parsed = JSON.parse(localStorage.getItem(LS_CFG_KEY) || "null"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
function teamBaseId(value: any) { return String(value?.baseTeamId || value?.sourceTeamId || value?.id || value || "").split("__slot_")[0]; }
function teamSuffix(index: number) { const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return index < letters.length ? letters[index] : `#${index + 1}`; }
function uniqueIds(ids: any[]) { return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))); }
function interleaveTeams(teams: ShooterTeamConfig[]) { const out: string[] = []; const max = Math.max(0, ...teams.map((team) => team.playerIds.length)); for (let member = 0; member < max; member += 1) for (const team of teams) if (team.playerIds[member]) out.push(team.playerIds[member]); return out; }
function shuffle<T>(items: T[]) { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function presetLabel(preset: ShooterSequencePreset) {
  if (preset === "around") return "Tour 1 → 20";
  if (preset === "pro") return "PRO — pairs 20 → 2";
  if (preset === "random") return "Cibles aléatoires";
  return "Classique — 20 → 15";
}
function zoneLabel(zone: ShooterHitZone) {
  if (zone === "single") return "Simple uniquement";
  if (zone === "double") return "Double uniquement";
  if (zone === "triple") return "Triple uniquement";
  return "Segment complet S/D/T";
}
function penaltyLabel(rule: ShooterPenaltyRule) {
  if (rule === "score") return "− valeur cible au score";
  if (rule === "progress") return "− 1 mark de progression";
  return "Aucune";
}

function RulesContent({ primary }: { primary: string }) {
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: primary }}>OBJECTIF</strong><br />SHOOTER est une course de précision. Chaque joueur ou équipe progresse sur une séquence de cibles et doit la terminer avant les autres.</div>
    <div><strong style={{ color: primary }}>MARKS</strong><br />Sur la cible active : simple = 1 mark, double = 2, triple = 3. BULL = 1 et DBULL = 2. Le nombre de marks requis est configurable.</div>
    <div><strong style={{ color: "#65efb4" }}>POINTS</strong><br />Chaque fléchette valide ajoute aussi sa valeur réelle au score. Les fléchettes hors cible ne rapportent rien.</div>
    <div><strong style={{ color: "#ff9aae" }}>PÉNALITÉ</strong><br />En cas de volée à 0 touche, tu peux choisir : aucune sanction, perte de points ou recul d’un mark.</div>
    <div><strong style={{ color: primary }}>ÉQUIPES</strong><br />En équipe, les joueurs partagent la progression et le score de leur équipe ; leurs statistiques individuelles restent séparées.</div>
    <div><strong style={{ color: "#ffd76a" }}>VICTOIRE</strong><br />Le premier joueur ou la première équipe qui termine la séquence gagne. Avec une limite de rounds, le classement départage progression, marks, score puis précision.</div>
  </div>;
}

export default function ShooterConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSavedConfig, []);
  const primary = theme?.primary || SHOOTER_CYAN;
  const accent2 = theme?.accent2 || theme?.accent1 || primary;
  const primarySoft = theme?.primarySoft || `${primary}20`;
  const themeTextSoft = theme?.textSoft || "#aeb2d3";

  const [configViewMode, setConfigViewMode] = React.useState<"guided" | "complete">(() => { try { return localStorage.getItem("dc_shooter_config_view_mode") === "complete" ? "complete" : "guided"; } catch { return "guided"; } });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const guidedSteps = ["Participants", "Parcours", "Règles", "Saisie", "Résumé"];
  const guidedMaxStep = guidedSteps.length - 1;
  const selectConfigViewMode = React.useCallback((mode: "guided" | "complete") => { setConfigViewMode(mode); try { localStorage.setItem("dc_shooter_config_view_mode", mode); } catch {} }, []);

  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p) => !isBotLike(p)), [storeProfiles]);
  const [participantMode, setParticipantMode] = React.useState<ShooterParticipantMode>(saved.participantMode === "teams" ? "teams" : "players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>(saved.teamsSourceMode === "saved" || saved.teamsSourceMode === "auto" ? saved.teamsSourceMode : "manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 12).map(String) : []);
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>(saved.teamAssignments && typeof saved.teamAssignments === "object" ? saved.teamAssignments : {});
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedStoredTeamIds) ? saved.selectedStoredTeamIds.map(String) : []);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedBotTeamIds) ? saved.selectedBotTeamIds.map(String) : []);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(saved.savedTeamMemberSelections && typeof saved.savedTeamMemberSelections === "object" ? saved.savedTeamMemberSelections : {});
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(saved.botsPanelEnabled === true);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(saved.botTeamsPanelEnabled === true);
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [sequencePreset, setSequencePreset] = React.useState<ShooterSequencePreset>(["around", "pro", "random"].includes(saved.sequencePreset) ? saved.sequencePreset : "classic");
  const [randomTargetCount, setRandomTargetCount] = React.useState<number>(Math.max(3, Math.min(20, Number(saved.randomTargetCount || 10))));
  const [includeBull, setIncludeBull] = React.useState(saved.includeBull !== false);
  const [hitZone, setHitZone] = React.useState<ShooterHitZone>(["single", "double", "triple"].includes(saved.hitZone) ? saved.hitZone : "any");
  const [marksToClear, setMarksToClear] = React.useState<1 | 2 | 3 | 4 | 5 | 6>(([1,2,3,4,5,6].includes(Number(saved.marksToClear)) ? Number(saved.marksToClear) : 3) as any);
  const [maxRounds, setMaxRounds] = React.useState<number>([0,5,10,15,20,25,30].includes(Number(saved.maxRounds)) ? Number(saved.maxRounds) : 15);
  const [penaltyRule, setPenaltyRule] = React.useState<ShooterPenaltyRule>(saved.penaltyRule === "score" || saved.penaltyRule === "progress" ? saved.penaltyRule : "none");
  const [randomOrder, setRandomOrder] = React.useState(Boolean(saved.randomOrder));
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets && typeof saved.playerDartSets === "object" ? saved.playerDartSets : {});
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);

  React.useLayoutEffect(() => { try { window.scrollTo(0, 0); } catch {} }, []);
  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    (X01_PRO_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, { ...bot, isBot: true }));
    setBotProfiles([...map.values()]);
  }, []);
  React.useEffect(() => { if (!selectedIds.length && humanProfiles.length) setSelectedIds(humanProfiles.slice(0, Math.min(2, humanProfiles.length)).map((p) => String(p.id))); }, [humanProfiles, selectedIds.length]);
  React.useEffect(() => { if (hitZone === "triple" && includeBull) setIncludeBull(false); }, [hitZone, includeBull]);
  React.useEffect(() => {
    try { localStorage.setItem(LS_CFG_KEY, JSON.stringify({ participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled, botLevel, sequencePreset, randomTargetCount, includeBull, hitZone, marksToClear, maxRounds, penaltyRule, randomOrder, scoreInputMethod, playerDartSets })); } catch {}
  }, [participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled, botLevel, sequencePreset, randomTargetCount, includeBull, hitZone, marksToClear, maxRounds, penaltyRule, randomOrder, scoreInputMethod, playerDartSets]);

  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles.map((bot) => ({ ...bot, isBot: true }))], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
  const selectedParticipantItems = selectedProfiles.map((profile: any) => ({ id: String(profile.id), kind: isBotLike(profile) ? "bot" : "player", name: profile?.name || profile?.displayName || "Joueur", profile }));
  const teamProfiles = React.useMemo(() => [...new Map(allProfiles.map((p: any) => [String(p.id), p])).values()], [allProfiles]);
  const storedDartsTeams: TeamEntity[] = React.useMemo(() => { try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); } catch { return []; } }, [storeProfiles.length]);
  const botDartsTeams = React.useMemo(() => buildX01DartsBotTeams(botProfiles), [botProfiles]);
  const selectableDartsTeams = React.useMemo(() => [...storedDartsTeams, ...botDartsTeams], [storedDartsTeams, botDartsTeams]);

  const selectedStoredTeams = React.useMemo(() => (selectedStoredTeamIds || []).map((rawId: any, index: number) => {
    const baseId = teamBaseId(rawId); const occurrence = (selectedStoredTeamIds || []).slice(0, index).filter((id: any) => teamBaseId(id) === baseId).length;
    const team = storedDartsTeams.find((c: any) => String(c.id) === baseId) || findRememberedGeneratedTeam(baseId); if (!team) return null;
    const suffix = teamSuffix(occurrence); return { ...team, id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId, baseTeamId: baseId, sourceTeamId: baseId, teamSlotLabel: suffix, name: team.name };
  }).filter(Boolean), [storedDartsTeams, selectedStoredTeamIds]);
  const selectedBotTeams = React.useMemo(() => {
    if (!botTeamsPanelEnabled) return [];
    return (selectedBotTeamIds || []).map((rawId: any, index: number) => {
      const baseId = teamBaseId(rawId); const occurrence = (selectedBotTeamIds || []).slice(0, index).filter((id: any) => teamBaseId(id) === baseId).length;
      const team = botDartsTeams.find((c: any) => String(c.id) === baseId); if (!team) return null;
      const suffix = teamSuffix(occurrence); return { ...team, id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId, baseTeamId: baseId, sourceTeamId: baseId, teamSlotLabel: suffix, name: team.name };
    }).filter(Boolean);
  }, [botDartsTeams, selectedBotTeamIds, botTeamsPanelEnabled]);
  const selectedSavedTeams = React.useMemo(() => [...selectedStoredTeams, ...selectedBotTeams], [selectedStoredTeams, selectedBotTeams]);

  function handleChangePlayerDartSet(profileId: string, dartSetId: string | null) { setPlayerDartSets((prev) => ({ ...prev, [String(profileId)]: dartSetId || null })); }
  function togglePlayer(idRaw: string) {
    const id = String(idRaw || ""); if (!id) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) { setTeamAssignments((a) => { const next = { ...a }; delete next[id]; return next; }); return prev.filter((v) => v !== id); }
      if (prev.length >= 12) return prev;
      if (!isBotLike(byId.get(id)) && !playerDartSets[id]) { const preferred = x01MostUsedDartSetIdForProfile(id, humanProfiles); if (preferred) setPlayerDartSets((sets) => ({ ...sets, [id]: preferred })); }
      return [...prev, id];
    });
  }
  function setPlayerTeam(playerId: string, teamId: TeamId) { setTeamAssignments((prev) => prev[playerId] === teamId ? { ...prev, [playerId]: null } : { ...prev, [playerId]: teamId }); }
  function toggleSavedTeamMember(teamIdRaw: string, playerIdRaw: string) {
    const instanceId = String(teamIdRaw || ""), baseId = teamBaseId(instanceId), playerId = String(playerIdRaw || "");
    const team = selectableDartsTeams.find((c: any) => String(c.id) === baseId) || findRememberedGeneratedTeam(baseId); const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    setSavedTeamMemberSelections((prev) => { const cur = Array.isArray(prev[instanceId]) ? prev[instanceId].map(String) : allIds; return { ...prev, [instanceId]: cur.includes(playerId) ? cur.filter((id) => id !== playerId) : [...cur, playerId] }; });
  }
  function ensureTeamMembers(instanceId: string, teams: any[]) { setSavedTeamMemberSelections((prev) => { if (Array.isArray(prev[instanceId])) return prev; const baseId = teamBaseId(instanceId); const team = teams.find((c: any) => String(c.id || c.baseTeamId) === baseId) || findRememberedGeneratedTeam(baseId); return { ...prev, [instanceId]: uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []) }; }); }
  function addStoredTeamSelection(teamIdRaw: string, playerIds: string[]) { const baseId = String(teamIdRaw || ""), picked = uniqueIds(playerIds); if (!baseId || !picked.length || selectedStoredTeamIds.length >= 4) return; setSelectedStoredTeamIds((prev) => { const same = prev.filter((id) => teamBaseId(id) === baseId); const instanceId = same.length ? `${baseId}__slot_${teamSuffix(same.length)}` : baseId; setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked })); return [...prev, instanceId]; }); }
  function removeStoredTeamSelection(instanceIdRaw: string) { const instanceId = String(instanceIdRaw || ""); setSelectedStoredTeamIds((prev) => prev.filter((id) => String(id) !== instanceId)); setSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[instanceId]; return next; }); }
  function toggleStoredTeam(teamIdRaw: string) { const baseId = String(teamIdRaw || ""); const team = storedDartsTeams.find((c: any) => String(c.id) === baseId); const ids = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []); addStoredTeamSelection(baseId, ids); ensureTeamMembers(baseId, storedDartsTeams); }
  function addBotTeamSelection(teamIdRaw: string, playerIds: string[]) { const baseId = String(teamIdRaw || ""), picked = uniqueIds(playerIds); if (!baseId || !picked.length || selectedBotTeamIds.length >= 4) return; setSelectedBotTeamIds((prev) => { const same = prev.filter((id) => teamBaseId(id) === baseId); const instanceId = same.length ? `${baseId}__slot_${teamSuffix(same.length)}` : baseId; setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked })); return [...prev, instanceId]; }); }
  function removeBotTeamSelection(instanceIdRaw: string) { const instanceId = String(instanceIdRaw || ""); setSelectedBotTeamIds((prev) => prev.filter((id) => String(id) !== instanceId)); setSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[instanceId]; return next; }); }
  function toggleBotTeam(teamIdRaw: string) { const baseId = String(teamIdRaw || ""); const team = botDartsTeams.find((c: any) => String(c.id) === baseId); addBotTeamSelection(baseId, uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []).slice(0, 1)); }
  function externalTeamConfig(team: any, index: number): ShooterTeamConfig {
    const instanceId = String(team?.id || `team-${index}`), allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    const playerIds = uniqueIds(Array.isArray(savedTeamMemberSelections[instanceId]) ? savedTeamMemberSelections[instanceId] : allIds).filter((id) => byId.has(id));
    return { id: instanceId, name: String(team?.name || `Équipe ${index + 1}`), color: team?.color || TEAM_COLOR_CYCLE[index % TEAM_COLOR_CYCLE.length], logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarDataUrl ?? null, playerIds, isBotTeam: Boolean(team?.isBotTeam) };
  }
  const manualTeamConfigs = React.useMemo(() => {
    const humanTeams = TEAM_IDS.map((teamId) => ({ id: teamId, name: TEAM_LABELS[teamId], color: TEAM_COLORS[teamId], playerIds: selectedIds.filter((playerId) => teamAssignments[playerId] === teamId) })).filter((team) => team.playerIds.length > 0);
    return [...humanTeams, ...selectedBotTeams.map(externalTeamConfig).filter((team) => team.playerIds.length > 0)];
  }, [selectedIds, teamAssignments, selectedBotTeams, savedTeamMemberSelections, byId]);
  const savedTeamConfigs = React.useMemo(() => (teamsSourceMode === "auto" ? selectedStoredTeams : selectedSavedTeams).map(externalTeamConfig).filter((team) => team.playerIds.length > 0), [teamsSourceMode, selectedStoredTeams, selectedSavedTeams, savedTeamMemberSelections, byId]);
  const activeTeamConfigs: ShooterTeamConfig[] = teamsSourceMode === "manual" ? manualTeamConfigs : savedTeamConfigs;
  const activeTeamPlayerIds = activeTeamConfigs.flatMap((team) => team.playerIds);
  const activeUniquePlayerIds = uniqueIds(activeTeamPlayerIds);
  const teamSizes = Array.from(new Set(activeTeamConfigs.map((team) => team.playerIds.length)));
  const validPlayers = selectedIds.length >= 1 && selectedIds.length <= 12;
  const validTeams = activeTeamConfigs.length >= 2 && activeTeamConfigs.length <= 4 && teamSizes.length === 1 && (teamSizes[0] || 0) >= 1 && (teamSizes[0] || 0) <= 4 && activeUniquePlayerIds.length === activeTeamPlayerIds.length && activeUniquePlayerIds.length <= 12;
  const validSelection = participantMode === "players" ? validPlayers : validTeams;
  const selectedBotCount = selectedProfiles.filter(isBotLike).length;
  const selectionError = participantMode === "players" ? "Sélectionne entre 1 et 12 joueurs ou BOTS IA." : activeTeamConfigs.length < 2 ? "Sélectionne au moins 2 équipes." : activeTeamConfigs.length > 4 ? "SHOOTER accepte jusqu’à 4 équipes." : teamSizes.length !== 1 ? "Les équipes doivent avoir le même nombre de joueurs." : activeUniquePlayerIds.length !== activeTeamPlayerIds.length ? "Un même profil ne peut pas jouer dans plusieurs équipes." : "Compose 2 à 4 équipes équilibrées, 12 participants maximum.";

  function backToGames() { if (typeof props?.onBack === "function") return props.onBack(); if (typeof go === "function") go("games"); }
  function onStart() {
    if (!validSelection) return;
    const baseIds = participantMode === "teams" ? interleaveTeams(activeTeamConfigs) : [...selectedIds];
    const orderedIds = randomOrder ? shuffle(baseIds) : baseIds;
    const orderedProfiles = orderedIds.map((id) => byId.get(String(id))).filter(Boolean);
    const botIds = orderedProfiles.filter(isBotLike).map((profile: any) => String(profile.id));
    const payload: ShooterConfigPayload = {
      mode: "shooter", participantMode, players: orderedIds.length, selectedIds: orderedIds,
      playersList: orderedProfiles.map((profile: any) => ({ ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur", dartSetId: playerDartSets[String(profile.id)] ?? null })),
      teamConfigs: participantMode === "teams" ? activeTeamConfigs.map((team) => ({ ...team, playerIds: [...team.playerIds] })) : undefined,
      playerDartSets, botIds, botsEnabled: botIds.length > 0, botLevel, sequencePreset, randomTargetCount,
      includeBull: hitZone === "triple" ? false : includeBull, hitZone, marksToClear, maxRounds, penaltyRule, randomOrder, scoreInputMethod,
    };
    try { recordProfileUsageForMode("shooter", orderedIds); } catch {}
    if (typeof go === "function") go("shooter_play", payload);
  }

  const panel: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", overflow: "hidden" };
  const selectorCard: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "16px 12px", marginBottom: 12, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${primary}33` };
  const guidedCard: React.CSSProperties = { ...selectorCard, padding: 14 };
  const participantSummary = participantMode === "teams" ? `${activeTeamConfigs.length} équipe${activeTeamConfigs.length > 1 ? "s" : ""} · ${activeUniquePlayerIds.length} joueur${activeUniquePlayerIds.length > 1 ? "s" : ""}` : `${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""}`;
  const routeSummary = `${presetLabel(sequencePreset)}${includeBull && hitZone !== "triple" ? " + BULL" : ""}`;

  const participantsBlock = <>
    <section style={selectorCard}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary, marginBottom: 10 }}>Participants</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}><PillButton label="Joueurs" active={participantMode === "players"} onClick={() => setParticipantMode("players")} primary={primary} primarySoft={primarySoft} /><PillButton label="Équipes" active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} primary={primary} primarySoft={primarySoft} /></div>
      {participantMode === "players" ? <>
        <SelectedParticipantsCompactBlock items={selectedParticipantItems} accent={primary} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleChangePlayerDartSet} allProfiles={humanProfiles} />
        <PlayerPagedSelector usageMode="shooter" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={false} />
        <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>1 à 12 profils. Sélecteur, équipes et sets de fléchettes identiques à X01.</p>
      </> : <TeamsSection profiles={teamProfiles} selectableProfiles={humanProfiles} selectedIds={selectedIds} teamAssignments={teamAssignments} setPlayerTeam={setPlayerTeam} togglePlayer={togglePlayer} playerDartSets={playerDartSets} handleChangePlayerDartSet={handleChangePlayerDartSet} allProfiles={humanProfiles} sourceMode={teamsSourceMode} setSourceMode={setTeamsSourceMode} storedTeams={storedDartsTeams} selectedStoredTeamIds={selectedStoredTeamIds} toggleStoredTeam={toggleStoredTeam} addStoredTeamSelection={addStoredTeamSelection} removeStoredTeamSelection={removeStoredTeamSelection} botTeams={botDartsTeams} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={toggleBotTeam} removeBotTeamSelection={removeBotTeamSelection} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={primary} primarySoft={primarySoft} />}
      <div style={{ marginTop: 12, borderRadius: 14, padding: "9px 11px", border: `1px solid ${validSelection ? primary + "55" : "rgba(255,120,150,.28)"}`, background: validSelection ? `${primary}0d` : "rgba(255,80,120,.07)" }}><div style={{ color: validSelection ? primary : "#ffb2c8", fontSize: 11.5, fontWeight: 950 }}>{validSelection ? `Sélection prête · ${participantSummary}` : selectionError}</div></div>
    </section>
    {participantMode === "players" ? <section style={{ ...selectorCard, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}><h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary, margin: 0 }}>Bots IA</h3><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => setBotsPanelEnabled((v) => !v)} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}88`, background: botsPanelEnabled ? `${primary}18` : "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11 }}>{botsPanelEnabled ? "☑ ON" : "☐ OFF"}</button><button type="button" onClick={() => typeof go === "function" && go("profiles_bots")} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}`, background: "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11 }}>GÉRER LES BOTS</button></div></div>
      {botsPanelEnabled ? <BotPagedSelector bots={botProfiles as any} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} /> : null}
      {selectedBotCount > 0 ? <div style={{ marginTop: 10 }}><OptionRow label="Difficulté IA"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}
    </section> : teamsSourceMode !== "auto" ? <BotTeamsSection botTeams={botDartsTeams} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={toggleBotTeam} addBotTeamSelection={addBotTeamSelection} removeBotTeamSelection={removeBotTeamSelection} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} profiles={teamProfiles} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={primary} primarySoft={primarySoft} /> : null}
  </>;

  const routeBlock = <section style={guidedCard}>
    <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Parcours de tir</h3>
    <div style={panel}>
      <OptionRow label="Séquence"><OptionSelect value={sequencePreset} options={[{ value: "classic", label: "Classique · 20 → 15" }, { value: "around", label: "Tour · 1 → 20" }, { value: "pro", label: "PRO · pairs 20 → 2" }, { value: "random", label: "Aléatoire" }]} onChange={setSequencePreset} /></OptionRow>
      {sequencePreset === "random" ? <OptionRow label="Nombre de cibles"><OptionSelect value={randomTargetCount} options={[5,7,10,12,15,20]} onChange={(v: any) => setRandomTargetCount(Number(v) || 10)} /></OptionRow> : null}
      <OptionRow label="Terminer par BULL"><OptionToggle value={includeBull} onChange={setIncludeBull} /></OptionRow>
      <OptionRow label="Zone valide"><OptionSelect value={hitZone} options={[{ value: "any", label: "Segment complet S/D/T" }, { value: "single", label: "Simple uniquement" }, { value: "double", label: "Double uniquement" }, { value: "triple", label: "Triple uniquement" }]} onChange={setHitZone} /></OptionRow>
      {hitZone === "triple" ? <div style={{ marginTop: 8, color: "#ffcf78", fontSize: 10.5 }}>Le BULL est automatiquement désactivé en mode « Triple uniquement ».</div> : null}
    </div>
  </section>;

  const rulesBlock = <section style={guidedCard}>
    <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Règles & difficulté</h3>
    <div style={panel}>
      <OptionRow label="Marks pour valider"><OptionSelect value={marksToClear} options={[1,2,3,4,5,6]} onChange={(v: any) => setMarksToClear(Number(v) as any)} /></OptionRow>
      <OptionRow label="Limite de rounds"><OptionSelect value={maxRounds} options={[{ value: 0, label: "Illimitée" }, 5,10,15,20,25,30]} onChange={(v: any) => setMaxRounds(Number(v) || 0)} /></OptionRow>
      <OptionRow label="Échec 0/3"><OptionSelect value={penaltyRule} options={[{ value: "none", label: "Aucune pénalité" }, { value: "score", label: "− valeur cible au score" }, { value: "progress", label: "− 1 mark de progression" }]} onChange={setPenaltyRule} /></OptionRow>
      <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
      <div style={{ marginTop: 9, padding: 10, borderRadius: 12, background: `${primary}0d`, border: `1px solid ${primary}30`, color: "#cfd4ea", fontSize: 10.8, lineHeight: 1.45 }}>Chaque joueur lance 3 fléchettes sur sa cible active. S=1 mark, D=2, T=3. Dès que le quota est atteint, il passe à la cible suivante.</div>
    </div>
  </section>;

  const inputBlock = <section style={guidedCard}>
    <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Saisie</h3>
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad X01" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
    <div style={{ marginTop: 10, color: themeTextSoft, fontSize: 10.8, lineHeight: 1.45 }}>Chaque impact S/D/T/BULL/DBULL/MISS est conservé pour l’historique et les statistiques détaillées.</div>
  </section>;

  const summaryBlock = <section style={{ ...guidedCard, border: `1px solid ${validSelection ? primary + "66" : "rgba(255,255,255,.08)"}` }}>
    <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Résumé</h3>
    <div style={{ display: "grid", gap: 7, padding: 11, borderRadius: 14, background: `${primary}0c`, border: `1px solid ${primary}33`, fontSize: 11.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Participants</span><b>{participantSummary}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Parcours</span><b>{routeSummary}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Zone</span><b>{zoneLabel(hitZone)}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Validation</span><b>{marksToClear} mark{marksToClear > 1 ? "s" : ""}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>0/3</span><b>{penaltyLabel(penaltyRule)}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Rounds</span><b>{maxRounds ? maxRounds : "Illimités"}</b></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Saisie</span><b>{scoreInputMethod === "dartboard" ? "Cible" : "Keypad"}</b></div>
    </div>
    {!validSelection ? <div style={{ marginTop: 10, fontSize: 11.5, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
  </section>;

  return <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", paddingBottom: 92 }}>
    <PageHeader tickerSrc={tickerShooter} tickerAlt="SHOOTER" left={<BackDot onClick={backToGames} color={primary} glow={`${primary}88`} title="Retour" />} right={<InfoDot title="Règles de SHOOTER" color={theme?.accent1 || primary} glow={`${theme?.accent1 || primary}77`} content={<RulesContent primary={primary} />} />} />
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 8px 0", overflowX: "hidden" }}>
      <section style={{ ...selectorCard, border: `1px solid ${primary}66`, boxShadow: `0 0 24px ${primary}18, 0 14px 34px rgba(0,0,0,.48)` }}>
        <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration SHOOTER</div>
        <div style={{ display: "flex", gap: 8 }}><PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => selectConfigViewMode("guided")} primary={primary} primarySoft={primarySoft} /><PillButton label="Complète" active={configViewMode === "complete"} onClick={() => selectConfigViewMode("complete")} primary={primary} primarySoft={primarySoft} /></div>
        <div style={{ marginTop: 8, color: themeTextSoft, fontSize: 11 }}>Guidée : étape par étape. Complète : tous les réglages sur une seule page.</div>
      </section>

      {configViewMode === "guided" ? <section style={{ ...selectorCard, border: `1px solid ${primary}55` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}><div><div style={{ color: primary, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div><div style={{ marginTop: 3, color: themeTextSoft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{guidedSteps.length} · {guidedSteps[guidedStep]}</div></div><div style={{ display: "flex", gap: 4 }}>{guidedSteps.map((label, idx) => <button key={label} type="button" onClick={() => setGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? primary : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? primarySoft : "rgba(255,255,255,.03)", color: idx === guidedStep ? primary : "#aeb2d3", fontSize: 9.5, fontWeight: 950 }}>{idx + 1}</button>)}</div></div>
        <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / guidedSteps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${primary}, ${accent2})` }} /></div>
      </section> : null}

      {configViewMode === "guided" ? <>
        {guidedStep === 0 ? participantsBlock : null}{guidedStep === 1 ? routeBlock : null}{guidedStep === 2 ? rulesBlock : null}{guidedStep === 3 ? inputBlock : null}{guidedStep === 4 ? summaryBlock : null}
        <div style={{ display: "flex", gap: 9, margin: "0 0 12px" }}><button type="button" onClick={() => setGuidedStep((s) => Math.max(0, s - 1))} disabled={guidedStep === 0} style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button><button type="button" onClick={() => setGuidedStep((s) => Math.min(guidedMaxStep, s + 1))} disabled={guidedStep === guidedMaxStep} style={{ flex: 1, height: 42, borderRadius: 999, border: `1px solid ${primary}`, background: primarySoft, color: guidedStep === guidedMaxStep ? "#565b76" : primary, fontWeight: 950 }}>Suivant →</button></div>
      </> : <>{participantsBlock}<Section title="PARCOURS & RÈGLES"><div style={panel}><OptionRow label="Séquence"><OptionSelect value={sequencePreset} options={[{ value: "classic", label: "Classique · 20 → 15" }, { value: "around", label: "Tour · 1 → 20" }, { value: "pro", label: "PRO · pairs 20 → 2" }, { value: "random", label: "Aléatoire" }]} onChange={setSequencePreset} /></OptionRow>{sequencePreset === "random" ? <OptionRow label="Nombre de cibles"><OptionSelect value={randomTargetCount} options={[5,7,10,12,15,20]} onChange={(v: any) => setRandomTargetCount(Number(v) || 10)} /></OptionRow> : null}<OptionRow label="Terminer par BULL"><OptionToggle value={includeBull} onChange={setIncludeBull} /></OptionRow><OptionRow label="Zone valide"><OptionSelect value={hitZone} options={[{ value: "any", label: "Segment complet S/D/T" }, { value: "single", label: "Simple uniquement" }, { value: "double", label: "Double uniquement" }, { value: "triple", label: "Triple uniquement" }]} onChange={setHitZone} /></OptionRow><OptionRow label="Marks pour valider"><OptionSelect value={marksToClear} options={[1,2,3,4,5,6]} onChange={(v: any) => setMarksToClear(Number(v) as any)} /></OptionRow><OptionRow label="Limite de rounds"><OptionSelect value={maxRounds} options={[{ value: 0, label: "Illimitée" },5,10,15,20,25,30]} onChange={(v: any) => setMaxRounds(Number(v) || 0)} /></OptionRow><OptionRow label="Échec 0/3"><OptionSelect value={penaltyRule} options={[{ value: "none", label: "Aucune pénalité" }, { value: "score", label: "− valeur cible au score" }, { value: "progress", label: "− 1 mark de progression" }]} onChange={setPenaltyRule} /></OptionRow><OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow><OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad X01" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow></div></Section>{summaryBlock}</>}

      {(configViewMode === "complete" || guidedStep === guidedMaxStep) ? <div style={{ padding: "4px 4px 14px" }}><button type="button" disabled={!validSelection} onClick={onStart} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${primary}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${primary}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${primary}55, 0 10px 24px rgba(0,0,0,.40)` : "none", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER SHOOTER</button>{!validSelection ? <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}</div> : null}
    </div>
  </div>;
}
