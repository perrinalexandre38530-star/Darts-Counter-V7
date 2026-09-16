// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — CONFIG V3
// Aligné sur le standard X01ConfigV3 :
// - ticker + BackDot + InfoDot
// - configuration GUIDÉE / COMPLÈTE
// - joueurs individuels / équipes
// - PlayerPagedSelector + BotPagedSelector
// - équipes enregistrées, équipes IA, manuel, brassage auto
// - variantes, vies, zones spéciales, bonus 3e fléchette
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import BotPagedSelector from "../components/BotPagedSelector";
import SelectionStickyBanner from "../components/SelectionStickyBanner";
import { applyResolvedBotCountries } from "../lib/botCountries";
import { loadBotPlayers } from "../lib/bots";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { BOT_PRO_TEAMS } from "../lib/botTeams";
import { generateShuffledTeams, rememberGeneratedTeams } from "../lib/teamAutoShuffle";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { makeGros6Segment, randomGros6StartTarget } from "../lib/gros6Engine";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.png";

import botTeamEliteLogo from "../assets/ui/competition_bot_team_elite.webp";
import botTeamProLogo from "../assets/ui/competition_bot_team_pro.webp";
import botTeamChallengerLogo from "../assets/ui/competition_bot_team_challenger.webp";
import botTeamMixLogo from "../assets/ui/competition_bot_team_mix.webp";
import botTeamRisingLogo from "../assets/ui/competition_bot_team_rising.webp";

import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";

type ParticipantMode = "players" | "teams";
type ConfigViewMode = "guided" | "complete";
type TeamsSourceMode = "saved" | "manual" | "auto";
type TeamLifeMode = "individual" | "shared";
type SelectionPolicy = "open" | "pro";
type StartingTargetMode = "s6" | "random";

const TEAM_SLOTS = [
  { id: "gold", name: "GOLD", color: "#ffd75a" },
  { id: "pink", name: "PINK", color: "#ff59d6" },
  { id: "blue", name: "BLUE", color: "#4ebcff" },
  { id: "green", name: "GREEN", color: "#60f28b" },
];

const BOT_TEAM_LOGO_BY_KEY = {
  elite: botTeamEliteLogo,
  pro: botTeamProLogo,
  challenger: botTeamChallengerLogo,
  mix: botTeamMixLogo,
  rising: botTeamRisingLogo,
};

const PRO_BOTS = applyResolvedBotCountries([
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower },
  { id: "bot_pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney },
  { id: "bot_pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot },
  { id: "bot_pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple },
  { id: "bot_pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace },
  { id: "bot_pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant },
  { id: "bot_pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage },
  { id: "bot_pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart },
  { id: "bot_pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer },
]);

const PRO_BOT_BY_NAME = new Map(PRO_BOTS.map((bot) => [String(bot.name).toLowerCase(), bot]));

const PRESETS = [
  {
    id: "mss",
    label: "Gros 6 MSS",
    detail: "5 vies • strict • Bull • zones spéciales • bonus 3e fléchette",
    values: { startingLives: 5, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "classic",
    label: "Classique",
    detail: "5 vies • S/D/T distincts • départ S6",
    values: { startingLives: 5, targetRule: "strict", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "easy",
    label: "Facile",
    detail: "Même valeur acceptée en simple/double/triple",
    values: { startingLives: 5, targetRule: "value", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "pro",
    label: "PRO",
    detail: "Cibles imposées limitées aux doubles/triples et Bulls",
    values: { startingLives: 5, targetRule: "strict", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "pro", startingTargetMode: "s6" },
  },
  {
    id: "sudden",
    label: "Sudden Death",
    detail: "1 seule vie • pression maximale",
    values: { startingLives: 1, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "endurance",
    label: "Endurance",
    detail: "10 vies • partie longue",
    values: { startingLives: 10, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
];

function avatarOf(value: any): string | null {
  return value?.avatarDataUrl ?? value?.avatarUrl ?? value?.avatar ?? value?.photoDataUrl ?? null;
}

function sanitizePlayer(player: any, isBot = false) {
  return {
    ...player,
    id: String(player?.id || player?.profileId || `gros6-${Math.random().toString(36).slice(2, 10)}`),
    name: String(player?.name || player?.displayName || "Joueur"),
    avatarDataUrl: avatarOf(player),
    isBot: isBot || !!player?.isBot,
    botLevel: player?.botLevel ?? player?.level ?? null,
  };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function PillButton({ label, active, onClick, primary, primarySoft, disabled = false, compact = false }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${active ? primary : "rgba(255,255,255,.10)"}`,
        background: active ? primarySoft : "rgba(255,255,255,.035)",
        color: disabled ? "#747991" : active ? "#fff" : "#d5d8e8",
        padding: compact ? "6px 10px" : "8px 12px",
        fontSize: compact ? 11 : 12,
        fontWeight: active ? 950 : 800,
        cursor: disabled ? "default" : "pointer",
        boxShadow: active ? `0 0 18px ${primary}44` : "none",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, subtitle, primary, children }: any) {
  return (
    <section style={{ background: "rgba(10,12,24,.94)", borderRadius: 18, padding: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,.05)", boxShadow: "0 16px 40px rgba(0,0,0,.55)" }}>
      <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary, marginBottom: subtitle ? 4 : 10 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 11, color: "#9298bb", lineHeight: 1.4, marginBottom: 12 }}>{subtitle}</div> : null}
      {children}
    </section>
  );
}

function TeamCard({ team, active, primary, onClick, members, memberSelection, onToggleMember }: any) {
  const logo = team?.logoDataUrl || team?.logoUrl || team?.avatarUrl || null;
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${active ? primary : "rgba(255,255,255,.09)"}`,
        background: active ? `${primary}16` : "rgba(255,255,255,.035)",
        boxShadow: active ? `0 0 20px ${primary}35` : "none",
        padding: 12,
        display: "grid",
        gap: 9,
      }}
    >
      <button type="button" onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "54px 1fr", gap: 10, alignItems: "center" }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", border: `1px solid ${active ? primary : "rgba(255,255,255,.10)"}`, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "center" }}>
          {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>🎯</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team?.name || "Équipe"}</div>
          <div style={{ color: "#9298bb", fontSize: 11, marginTop: 3 }}>{members?.length || 0} joueur{members?.length > 1 ? "s" : ""}</div>
        </div>
      </button>

      {active && Array.isArray(members) && members.length > 0 ? (
        <div style={{ display: "grid", gap: 6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 10, color: "#8990ae", textTransform: "uppercase", letterSpacing: .8, fontWeight: 900 }}>Joueurs retenus</div>
          {members.map((member: any) => {
            const checked = memberSelection?.includes(String(member.id));
            return (
              <button key={member.id} type="button" onClick={() => onToggleMember?.(String(member.id))} style={{ border: 0, background: "transparent", color: "#fff", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, border: `1px solid ${checked ? primary : "rgba(255,255,255,.20)"}`, background: checked ? `${primary}44` : "rgba(255,255,255,.04)", display: "grid", placeItems: "center", fontSize: 11 }}>{checked ? "✓" : ""}</span>
                <ProfileAvatar name={member.name} avatarDataUrl={member.avatarDataUrl} size={28} />
                <span style={{ fontSize: 11, fontWeight: 800 }}>{member.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function Gros6Config({ store, go }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const primary = theme.primary || "#ff9d25";
  const primarySoft = `${primary}20`;

  const humanProfiles = React.useMemo(() => (Array.isArray(store?.profiles) ? store.profiles : []).map((p: any) => sanitizePlayer(p, false)), [store?.profiles]);
  const userBots = React.useMemo(() => {
    try { return loadBotPlayers().map((b: any) => sanitizePlayer({ ...b, isUserBot: true, source: "home" }, true)); } catch { return []; }
  }, []);
  const botProfiles = React.useMemo(() => {
    const merged = [...PRO_BOTS.map((b: any) => sanitizePlayer({ ...b, isProBot: true, source: "pro" }, true)), ...userBots];
    const seen = new Set<string>();
    return merged.filter((bot: any) => {
      const id = String(bot.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [userBots]);

  const allSelectable = React.useMemo(() => [...humanProfiles, ...botProfiles], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allSelectable.map((p: any) => [String(p.id), p])), [allSelectable]);

  const storedTeams = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); } catch { return []; }
  }, []);
  const botTeams = React.useMemo(() => BOT_PRO_TEAMS.map((team: any) => ({
    id: `gros6_botteam_${team.key}`,
    key: team.key,
    name: team.name,
    isBotTeam: true,
    botLevel: `${team.botLevel}/5`,
    logoDataUrl: BOT_TEAM_LOGO_BY_KEY[team.key] || null,
    members: (team.members || []).map((member: any) => {
      const pro = PRO_BOT_BY_NAME.get(String(member.name).toLowerCase());
      return sanitizePlayer({ ...(pro || {}), ...member, id: pro?.id || member.id, isBot: true, botLevel: `${member.botLevel}/5`, avatarDataUrl: pro?.avatarDataUrl || null }, true);
    }),
  })), []);

  const [configViewMode, setConfigViewMode] = React.useState<ConfigViewMode>(() => {
    try { return localStorage.getItem("dc_gros6_config_view_mode") === "complete" ? "complete" : "guided"; } catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>("players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>("saved");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedSavedTeamIds, setSelectedSavedTeamIds] = React.useState<string[]>([]);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>([]);
  const [teamMemberSelections, setTeamMemberSelections] = React.useState<Record<string, string[]>>({});
  const [manualAssignments, setManualAssignments] = React.useState<Record<string, string | null>>({});
  const [autoTeamCount, setAutoTeamCount] = React.useState(2);
  const [autoTeamSize, setAutoTeamSize] = React.useState(2);
  const [autoShuffleMode, setAutoShuffleMode] = React.useState<"balanced" | "random">("balanced");
  const [autoTeams, setAutoTeams] = React.useState<any[]>([]);

  const [presetId, setPresetId] = React.useState("mss");
  const [startingLives, setStartingLives] = React.useState(5);
  const [targetRule, setTargetRule] = React.useState<"strict" | "value">("strict");
  const [allowBull, setAllowBull] = React.useState(true);
  const [allowSpecialZones, setAllowSpecialZones] = React.useState(true);
  const [allowOuterRing, setAllowOuterRing] = React.useState(true);
  const [selectionPolicy, setSelectionPolicy] = React.useState<SelectionPolicy>("open");
  const [startingTargetMode, setStartingTargetMode] = React.useState<StartingTargetMode>("s6");
  const [thirdDartBonusSelection, setThirdDartBonusSelection] = React.useState(true);
  const [thirdDartBonusCount, setThirdDartBonusCount] = React.useState(3);
  const [randomStartOrder, setRandomStartOrder] = React.useState(false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "visit_score" | "dartboard" | "presets" | "voice">("keypad");
  const [teamLifeMode, setTeamLifeMode] = React.useState<TeamLifeMode>("individual");
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    try { localStorage.setItem("dc_gros6_config_view_mode", configViewMode); } catch {}
  }, [configViewMode]);

  const selectedPlayers = React.useMemo(() => selectedIds.map((id) => byId.get(String(id))).filter(Boolean), [selectedIds, byId]);

  const togglePlayer = React.useCallback((id: string) => {
    setError("");
    setSelectedIds((prev) => prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]);
  }, []);

  const resolveStoredTeamMembers = React.useCallback((team: any) => {
    const ids = Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [];
    return ids.map((id: string) => byId.get(id)).filter(Boolean);
  }, [byId]);

  const toggleTeam = React.useCallback((team: any, kind: "saved" | "bot") => {
    const id = String(team.id);
    const setFn = kind === "saved" ? setSelectedSavedTeamIds : setSelectedBotTeamIds;
    setFn((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      const members = kind === "saved" ? resolveStoredTeamMembers(team) : (team.members || []);
      setTeamMemberSelections((bag) => ({ ...bag, [id]: members.map((m: any) => String(m.id)) }));
      return [...prev, id];
    });
  }, [resolveStoredTeamMembers]);

  const toggleTeamMember = React.useCallback((teamId: string, playerId: string) => {
    setTeamMemberSelections((prev) => {
      const current = Array.isArray(prev[teamId]) ? prev[teamId] : [];
      return { ...prev, [teamId]: current.includes(playerId) ? current.filter((x) => x !== playerId) : [...current, playerId] };
    });
  }, []);

  const applyPreset = React.useCallback((preset: any) => {
    setPresetId(preset.id);
    const v = preset.values;
    setStartingLives(v.startingLives);
    setTargetRule(v.targetRule);
    setAllowBull(v.allowBull);
    setAllowSpecialZones(v.allowSpecialZones);
    setAllowOuterRing(v.allowOuterRing !== false);
    setThirdDartBonusSelection(v.thirdDartBonusSelection);
    setThirdDartBonusCount(v.thirdDartBonusCount);
    setSelectionPolicy(v.selectionPolicy);
    setStartingTargetMode(v.startingTargetMode);
  }, []);

  const generateAuto = React.useCallback(() => {
    setError("");
    const required = autoTeamCount * autoTeamSize;
    if (selectedPlayers.length !== required) {
      setError(`Brassage auto : sélectionne exactement ${required} joueurs (${autoTeamCount} équipes × ${autoTeamSize}).`);
      return;
    }
    const generated = generateShuffledTeams({ players: selectedPlayers, teamCount: autoTeamCount, teamSize: autoTeamSize, mode: autoShuffleMode, sport: "darts", accent: primary });
    rememberGeneratedTeams(generated);
    setAutoTeams(generated);
  }, [autoTeamCount, autoTeamSize, selectedPlayers, autoShuffleMode, primary]);

  React.useEffect(() => {
    if (teamsSourceMode !== "auto") return;
    setAutoTeams([]);
  }, [selectedIds, autoTeamCount, autoTeamSize, autoShuffleMode, teamsSourceMode]);

  const guidedSteps = ["Type de partie", "Participants", "Vies & variante", "Cibles & zones", "Options & lancement"];
  const guidedSelectionLabel = participantMode === "players"
    ? `${selectedPlayers.length} joueur${selectedPlayers.length > 1 ? "s" : ""}`
    : teamsSourceMode === "saved"
      ? `${selectedSavedTeamIds.length + selectedBotTeamIds.length} équipe${selectedSavedTeamIds.length + selectedBotTeamIds.length > 1 ? "s" : ""}`
      : teamsSourceMode === "manual"
        ? `${selectedPlayers.length} joueur${selectedPlayers.length > 1 ? "s" : ""}`
        : `${autoTeams.length || autoTeamCount} équipe${(autoTeams.length || autoTeamCount) > 1 ? "s" : ""}`;

  function buildSelectedTeams() {
    if (teamsSourceMode === "saved") {
      const teams: any[] = [];
      for (const id of selectedSavedTeamIds) {
        const team = storedTeams.find((t: any) => String(t.id) === id);
        if (!team) continue;
        const all = resolveStoredTeamMembers(team);
        const chosenIds = teamMemberSelections[id] || all.map((m: any) => String(m.id));
        const players = all.filter((m: any) => chosenIds.includes(String(m.id)));
        if (players.length) teams.push({ id: String(team.id), name: team.name, logoDataUrl: team.logoDataUrl || team.logoUrl || null, players });
      }
      for (const id of selectedBotTeamIds) {
        const team = botTeams.find((t: any) => String(t.id) === id);
        if (!team) continue;
        const all = team.members || [];
        const chosenIds = teamMemberSelections[id] || all.map((m: any) => String(m.id));
        const players = all.filter((m: any) => chosenIds.includes(String(m.id)));
        if (players.length) teams.push({ id: String(team.id), name: team.name, logoDataUrl: team.logoDataUrl || null, isBotTeam: true, players });
      }
      return teams;
    }

    if (teamsSourceMode === "manual") {
      return TEAM_SLOTS.map((slot) => ({
        id: `gros6_manual_${slot.id}`,
        name: `Équipe ${slot.name}`,
        color: slot.color,
        players: selectedPlayers.filter((player: any) => manualAssignments[String(player.id)] === slot.id),
      })).filter((team) => team.players.length > 0);
    }

    return (autoTeams || []).map((team: any) => ({
      ...team,
      players: (team.playerIds || []).map((id: any) => byId.get(String(id))).filter(Boolean),
    })).filter((team: any) => team.players.length > 0);
  }

  function validateAndBuild() {
    setError("");
    if (participantMode === "players") {
      if (selectedPlayers.length < 2) return { error: "Sélectionne au moins 2 joueurs." };
      return { teams: null, players: selectedPlayers.map((p: any) => sanitizePlayer(p, !!p.isBot)) };
    }

    if (teamsSourceMode === "auto" && !autoTeams.length) return { error: "Génère d'abord les équipes du brassage auto." };
    const teams = buildSelectedTeams();
    if (teams.length < 2) return { error: "Sélectionne ou compose au moins 2 équipes." };
    if (teams.some((team) => !Array.isArray(team.players) || team.players.length < 1)) return { error: "Chaque équipe doit contenir au moins 1 joueur." };

    if (teamsSourceMode === "manual") {
      const assigned = new Set(teams.flatMap((team) => team.players.map((player: any) => String(player.id))));
      if (assigned.size !== selectedPlayers.length) return { error: "Tous les joueurs sélectionnés doivent être affectés à une équipe." };
    }

    let orderedTeams = randomStartOrder ? shuffle(teams) : [...teams];
    if (randomStartOrder) orderedTeams = orderedTeams.map((team) => ({ ...team, players: shuffle(team.players) }));
    const maxMembers = Math.max(...orderedTeams.map((team) => team.players.length));
    const flattened: any[] = [];
    for (let memberIndex = 0; memberIndex < maxMembers; memberIndex += 1) {
      for (const team of orderedTeams) {
        const player = team.players[memberIndex];
        if (!player) continue;
        flattened.push({
          ...sanitizePlayer(player, !!player.isBot),
          teamId: String(team.id),
          teamName: String(team.name),
          teamLogoDataUrl: team.logoDataUrl || team.logoUrl || null,
        });
      }
    }
    const normalizedTeams = orderedTeams.map((team) => ({
      id: String(team.id),
      name: String(team.name),
      logoDataUrl: team.logoDataUrl || team.logoUrl || null,
      isBotTeam: !!team.isBotTeam,
      playerIds: team.players.map((p: any) => String(p.id)),
    }));
    return { teams: normalizedTeams, players: flattened };
  }

  const launch = React.useCallback(() => {
    const built: any = validateAndBuild();
    if (built.error) {
      setError(built.error);
      return;
    }
    let players = [...built.players];
    if (participantMode === "players" && randomStartOrder) players = shuffle(players);
    const startingTarget = startingTargetMode === "random"
      ? randomGros6StartTarget({ selectionPolicy, allowBull, allowSpecialZones, allowOuterRing })
      : makeGros6Segment("S", 6);
    const config = {
      id: `gros6-${Date.now()}`,
      mode: "gros_6",
      createdAt: Date.now(),
      participantMode,
      teamsSourceMode: participantMode === "teams" ? teamsSourceMode : undefined,
      teamLifeMode: participantMode === "teams" ? teamLifeMode : undefined,
      startingLives,
      targetRule,
      allowBull,
      allowSpecialZones,
      allowOuterRing,
      selectionPolicy,
      startingTargetMode,
      startingTarget,
      randomStartOrder,
      thirdDartBonusSelection,
      thirdDartBonusCount,
      scoreInputDefaultMethod: scoreInputMethod,
      presetId,
      players,
      teams: built.teams || undefined,
    };
    try { recordProfileUsageForMode("gros_6", players.map((p: any) => String(p.id))); } catch {}
    go?.("gros_6_play", { config });
  }, [participantMode, teamsSourceMode, teamLifeMode, startingLives, targetRule, allowBull, allowSpecialZones, allowOuterRing, selectionPolicy, startingTargetMode, randomStartOrder, thirdDartBonusSelection, thirdDartBonusCount, scoreInputMethod, presetId, go, selectedIds, selectedSavedTeamIds, selectedBotTeamIds, teamMemberSelections, manualAssignments, autoTeams]);

  const ParticipantsSelector = () => (
    <Section title={participantMode === "players" ? "2. Joueurs" : "2. Participants des équipes"} subtitle={participantMode === "players" ? "Sélectionne les profils locaux puis, si besoin, des BOTS IA." : teamsSourceMode === "saved" ? "Choisis des équipes déjà enregistrées ou des équipes BOTS IA." : "Sélectionne d'abord les joueurs utilisés pour la composition des équipes."} primary={primary}>
      {participantMode === "teams" && teamsSourceMode === "saved" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: primary, marginBottom: 8 }}>Équipes enregistrées</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
              {storedTeams.map((team: any) => {
                const members = resolveStoredTeamMembers(team);
                return <TeamCard key={team.id} team={team} members={members} active={selectedSavedTeamIds.includes(String(team.id))} primary={primary} onClick={() => toggleTeam(team, "saved")} memberSelection={teamMemberSelections[String(team.id)] || members.map((m: any) => String(m.id))} onToggleMember={(pid: string) => toggleTeamMember(String(team.id), pid)} />;
              })}
              {!storedTeams.length ? <div style={{ color: "#9298bb", fontSize: 12 }}>Aucune équipe Darts enregistrée.</div> : null}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: primary, marginBottom: 8 }}>Équipes BOTS IA</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
              {botTeams.map((team: any) => <TeamCard key={team.id} team={team} members={team.members} active={selectedBotTeamIds.includes(String(team.id))} primary={primary} onClick={() => toggleTeam(team, "bot")} memberSelection={teamMemberSelections[String(team.id)] || team.members.map((m: any) => String(m.id))} onToggleMember={(pid: string) => toggleTeamMember(String(team.id), pid)} />)}
            </div>
          </div>
        </div>
      ) : (
        <>
          {selectedPlayers.length ? (
            <SelectionStickyBanner
              title="Participants sélectionnés"
              accent={primary}
              items={selectedPlayers.map((p: any) => ({ id: String(p.id), name: p.name, avatarDataUrl: avatarOf(p), subtitle: p.isBot ? `BOT ${p.botLevel || ""}` : "Joueur" }))}
            />
          ) : null}
          <PlayerPagedSelector
            usageMode="gros_6"
            profiles={humanProfiles}
            selectedIds={selectedIds}
            onToggle={togglePlayer}
            accent={primary}
            pageSize={9}
            modalTitle="Choisir des joueurs"
            showSelectedSummary={false}
          />
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <BotPagedSelector
              bots={botProfiles}
              selectedIds={selectedIds}
              onToggle={togglePlayer}
              accent={primary}
              label="BOTS IA"
              showCheckbox={false}
              showSelectedSummary={false}
            />
          </div>

          {participantMode === "teams" && teamsSourceMode === "manual" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: primary }}>Affectation manuelle</div>
              {selectedPlayers.map((player: any) => (
                <div key={player.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 10, display: "grid", gridTemplateColumns: "minmax(120px,1fr) auto", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProfileAvatar name={player.name} avatarDataUrl={avatarOf(player)} size={34} /><span style={{ fontSize: 12, fontWeight: 900 }}>{player.name}</span></div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {TEAM_SLOTS.map((slot) => <button key={slot.id} type="button" onClick={() => setManualAssignments((prev) => ({ ...prev, [String(player.id)]: slot.id }))} style={{ borderRadius: 999, border: `1px solid ${manualAssignments[String(player.id)] === slot.id ? slot.color : "rgba(255,255,255,.10)"}`, background: manualAssignments[String(player.id)] === slot.id ? `${slot.color}25` : "rgba(255,255,255,.03)", color: slot.color, padding: "6px 9px", fontSize: 10, fontWeight: 950, cursor: "pointer" }}>{slot.name}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {participantMode === "teams" && teamsSourceMode === "auto" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#c8cbe4", fontSize: 11 }}>Équipes</span>
                {[2,3,4].map((n) => <PillButton key={`tc-${n}`} label={String(n)} active={autoTeamCount === n} onClick={() => setAutoTeamCount(n)} primary={primary} primarySoft={primarySoft} compact />)}
                <span style={{ color: "#c8cbe4", fontSize: 11, marginLeft: 6 }}>Joueurs / équipe</span>
                {[2,3,4].map((n) => <PillButton key={`ts-${n}`} label={String(n)} active={autoTeamSize === n} onClick={() => setAutoTeamSize(n)} primary={primary} primarySoft={primarySoft} compact />)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PillButton label="Équilibré" active={autoShuffleMode === "balanced"} onClick={() => setAutoShuffleMode("balanced")} primary={primary} primarySoft={primarySoft} />
                <PillButton label="Aléatoire" active={autoShuffleMode === "random"} onClick={() => setAutoShuffleMode("random")} primary={primary} primarySoft={primarySoft} />
                <button type="button" onClick={generateAuto} style={{ borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}20`, color: "#fff", padding: "8px 13px", fontWeight: 950, cursor: "pointer" }}>GÉNÉRER / REBRASSER</button>
              </div>
              <div style={{ fontSize: 11, color: "#9298bb" }}>Il faut exactement {autoTeamCount * autoTeamSize} joueurs sélectionnés pour ce format.</div>
              {autoTeams.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                  {autoTeams.map((team: any) => (
                    <div key={team.id} style={{ borderRadius: 16, border: `1px solid ${primary}55`, background: `${primary}0e`, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        <img src={team.logoDataUrl} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }} />
                        <div><div style={{ fontWeight: 950, fontSize: 12 }}>{team.name}</div><div style={{ fontSize: 10, color: "#9298bb" }}>{team.shuffleMode === "balanced" ? "Équilibrée" : "Aléatoire"} • puissance {team.teamPower}</div></div>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#d6d8e7", lineHeight: 1.45 }}>{(team.playerIds || []).map((id: any) => byId.get(String(id))?.name || id).join(" • ")}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Section>
  );

  const PartyTypeSection = () => (
    <Section title="1. Type de partie" subtitle="Choisis si le Gros 6 se joue en individuel ou par équipes." primary={primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: participantMode === "teams" ? 14 : 0 }}>
        <button type="button" onClick={() => setParticipantMode("players")} style={{ borderRadius: 18, border: `1px solid ${participantMode === "players" ? primary : "rgba(255,255,255,.10)"}`, background: participantMode === "players" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff", padding: 14, textAlign: "left", cursor: "pointer" }}><div style={{ color: primary, fontWeight: 950, fontSize: 18 }}>Joueurs</div><div style={{ color: "#aeb2d3", fontSize: 12, marginTop: 4 }}>Duel ou multi-joueurs.</div></button>
        <button type="button" onClick={() => setParticipantMode("teams")} style={{ borderRadius: 18, border: `1px solid ${participantMode === "teams" ? primary : "rgba(255,255,255,.10)"}`, background: participantMode === "teams" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff", padding: 14, textAlign: "left", cursor: "pointer" }}><div style={{ color: primary, fontWeight: 950, fontSize: 18 }}>Équipes</div><div style={{ color: "#aeb2d3", fontSize: 12, marginTop: 4 }}>Manuel, enregistré, IA ou brassage auto.</div></button>
      </div>
      {participantMode === "teams" ? (
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Source des équipes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Équipes enregistrées / IA" active={teamsSourceMode === "saved"} onClick={() => setTeamsSourceMode("saved")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Manuel" active={teamsSourceMode === "manual"} onClick={() => setTeamsSourceMode("manual")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Brassage auto" active={teamsSourceMode === "auto"} onClick={() => setTeamsSourceMode("auto")} primary={primary} primarySoft={primarySoft} />
          </div>
        </div>
      ) : null}
    </Section>
  );

  const LivesSection = () => (
    <Section title="3. Vies & variante" subtitle="Les presets appliquent un ensemble cohérent de règles, puis chaque réglage reste modifiable." primary={primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 8, marginBottom: 14 }}>
        {PRESETS.map((preset) => (
          <button key={preset.id} type="button" onClick={() => applyPreset(preset)} style={{ borderRadius: 15, border: `1px solid ${presetId === preset.id ? primary : "rgba(255,255,255,.08)"}`, background: presetId === preset.id ? primarySoft : "rgba(255,255,255,.025)", color: "#fff", padding: 11, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 950, color: presetId === preset.id ? primary : "#fff" }}>{preset.label}</div>
            <div style={{ fontSize: 10.5, color: "#9298bb", marginTop: 4, lineHeight: 1.35 }}>{preset.detail}</div>
          </button>
        ))}
      </div>
      <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Vies de départ</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: participantMode === "teams" ? 14 : 0 }}>
        {[1,3,5,7,10,15,20].map((n) => <PillButton key={n} label={`${n} vie${n > 1 ? "s" : ""}`} active={startingLives === n} onClick={() => { setStartingLives(n); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />)}
      </div>
      {participantMode === "teams" ? (
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Gestion des vies par équipes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Vies individuelles" active={teamLifeMode === "individual"} onClick={() => setTeamLifeMode("individual")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Réserve commune" active={teamLifeMode === "shared"} onClick={() => setTeamLifeMode("shared")} primary={primary} primarySoft={primarySoft} />
          </div>
          <div style={{ marginTop: 7, color: "#8f94b5", fontSize: 10.5 }}>{teamLifeMode === "shared" ? `Chaque équipe partage ${startingLives} vies.` : `Chaque joueur possède ${startingLives} vies. L'équipe reste en jeu tant qu'un de ses membres survit.`}</div>
        </div>
      ) : null}
    </Section>
  );

  const TargetsSection = () => (
    <Section title="4. Cibles & zones" subtitle="Le moteur gère les segments classiques et les zones fermées/extérieures demandées." primary={primary}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Validation de la cible</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Strict : S / D / T distincts" active={targetRule === "strict"} onClick={() => { setTargetRule("strict"); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Facile : même valeur" active={targetRule === "value"} onClick={() => { setTargetRule("value"); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
          </div>
        </div>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Cibles autorisées</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label={allowBull ? "Bull / DBull ON" : "Bull / DBull OFF"} active={allowBull} onClick={() => { setAllowBull((v) => !v); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
            <PillButton label={allowSpecialZones ? "Zones fermées ON" : "Zones fermées OFF"} active={allowSpecialZones} onClick={() => { setAllowSpecialZones((v) => !v); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
            <PillButton label={allowOuterRing ? "Contour extérieur ON" : "Contour extérieur OFF"} active={allowOuterRing} onClick={() => { setAllowOuterRing((v) => !v); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} disabled={!allowSpecialZones} compact />
          </div>
          <div style={{ color: "#8f94b5", fontSize: 10.5, lineHeight: 1.4, marginTop: 7 }}>Zones fermées : gros/petit 6, gros/petit 8, zones 9, 10, 16, 18, 19, 20. Le contour extérieur peut être activé ou coupé séparément.</div>
        </div>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Cible imposable</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Libre" active={selectionPolicy === "open"} onClick={() => { setSelectionPolicy("open"); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
            <PillButton label="PRO : doubles / triples / Bulls" active={selectionPolicy === "pro"} onClick={() => { setSelectionPolicy("pro"); setPresetId("custom"); }} primary={primary} primarySoft={primarySoft} />
          </div>
        </div>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Première cible</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="S6 classique" active={startingTargetMode === "s6"} onClick={() => setStartingTargetMode("s6")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Aléatoire" active={startingTargetMode === "random"} onClick={() => setStartingTargetMode("random")} primary={primary} primarySoft={primarySoft} />
          </div>
        </div>
      </div>
    </Section>
  );

  const OptionsSection = () => (
    <Section title="5. Options & lancement" subtitle="Le bonus 3e fléchette demandé est activé par défaut : une validation sur D3 ouvre une nouvelle volée de sélection." primary={primary}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Validation sur la dernière fléchette</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label={thirdDartBonusSelection ? "Bonus ON" : "Bonus OFF"} active={thirdDartBonusSelection} onClick={() => setThirdDartBonusSelection((v) => !v)} primary={primary} primarySoft={primarySoft} />
            {[1,2,3].map((n) => <PillButton key={n} label={`${n} fléchette${n > 1 ? "s" : ""}`} active={thirdDartBonusCount === n} onClick={() => setThirdDartBonusCount(n)} primary={primary} primarySoft={primarySoft} disabled={!thirdDartBonusSelection} compact />)}
          </div>
        </div>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Ordre de départ</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Ordre sélectionné" active={!randomStartOrder} onClick={() => setRandomStartOrder(false)} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Aléatoire" active={randomStartOrder} onClick={() => setRandomStartOrder(true)} primary={primary} primarySoft={primarySoft} />
          </div>
        </div>
        <div>
          <div style={{ color: "#c8cbe4", fontSize: 11, marginBottom: 7 }}>Mode de saisie en partie</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="KEYPAD" active={scoreInputMethod === "keypad"} onClick={() => setScoreInputMethod("keypad")} primary={primary} primarySoft={primarySoft} compact />
            <PillButton label="SCORE VOLÉE" active={scoreInputMethod === "visit_score"} onClick={() => setScoreInputMethod("visit_score")} primary={primary} primarySoft={primarySoft} compact />
            <PillButton label="CIBLE" active={scoreInputMethod === "dartboard"} onClick={() => setScoreInputMethod("dartboard")} primary={primary} primarySoft={primarySoft} compact />
            <PillButton label="PRESETS" active={scoreInputMethod === "presets"} onClick={() => setScoreInputMethod("presets")} primary={primary} primarySoft={primarySoft} compact />
            <PillButton label="VOICE" active={scoreInputMethod === "voice"} onClick={() => setScoreInputMethod("voice")} primary={primary} primarySoft={primarySoft} compact />
          </div>
        </div>

        <div style={{ borderRadius: 16, border: `1px solid ${primary}33`, background: `${primary}0b`, padding: 12 }}>
          <div style={{ color: primary, fontSize: 11, fontWeight: 950, letterSpacing: .8, textTransform: "uppercase", marginBottom: 7 }}>Récapitulatif</div>
          <div style={{ color: "#d7d9e9", fontSize: 11, lineHeight: 1.55 }}>
            {participantMode === "players" ? `Individuel • ${selectedPlayers.length} joueur(s)` : `Équipes • ${teamsSourceMode} • ${guidedSelectionLabel}`}<br />
            {startingLives} vie(s) • {targetRule === "strict" ? "S/D/T stricts" : "valeur libre"} • {selectionPolicy === "pro" ? "sélection PRO" : "sélection libre"}<br />
            Bull {allowBull ? "ON" : "OFF"} • Zones spéciales {allowSpecialZones ? "ON" : "OFF"} • Contour ext. {allowOuterRing ? "ON" : "OFF"} • Départ {startingTargetMode === "s6" ? "S6" : "aléatoire"}<br />
            Bonus D3 : {thirdDartBonusSelection ? `${thirdDartBonusCount} fléchette(s)` : "OFF"}{participantMode === "teams" ? ` • vies ${teamLifeMode === "shared" ? "communes" : "individuelles"}` : ""}<br />
            Saisie : {scoreInputMethod === "visit_score" ? "Score volée" : scoreInputMethod === "dartboard" ? "Cible" : scoreInputMethod === "presets" ? "Presets" : scoreInputMethod === "voice" ? "Voice" : "Keypad"}
          </div>
        </div>

        {error ? <div style={{ borderRadius: 14, border: "1px solid rgba(255,91,112,.55)", background: "rgba(120,13,31,.24)", color: "#ffd4dc", padding: 10, fontSize: 11, fontWeight: 800 }}>{error}</div> : null}
        <button type="button" onClick={launch} style={{ border: 0, borderRadius: 16, padding: "15px 18px", background: `linear-gradient(135deg, ${primary}, #ffcb4a)`, color: "#151018", fontWeight: 1000, fontSize: 15, cursor: "pointer", boxShadow: `0 0 28px ${primary}55` }}>LANCER LE GROS 6</button>
      </div>
    </Section>
  );

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg || theme.bg || "#070912", color: theme.text || "#fff", display: "flex", flexDirection: "column", padding: 12 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 60, margin: "-12px -12px 12px", background: theme.pageBg || theme.bg || "#070912", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ position: "relative", height: 92, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img src={(lang === "fr" ? tickerGros6 : tickerBig6) as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("games")} size={42} color={primary} glow={`${primary}AA`} /></div>
            <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} title="Règles du Gros 6" size={42} color={primary} glow={`${primary}AA`} /></div>
          </div>
        </div>
      </header>

      <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto" }}>
        <section style={{ background: "rgba(10,12,24,.94)", borderRadius: 18, padding: 12, marginBottom: 14, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${primary}33` }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: primary }}>Configuration GROS 6</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => setConfigViewMode("guided")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Complète" active={configViewMode === "complete"} onClick={() => setConfigViewMode("complete")} primary={primary} primarySoft={primarySoft} />
          </div>
          <div style={{ fontSize: 11, color: "#9298bb", lineHeight: 1.35, marginTop: 8 }}>Guidée = étape par étape. Complète = tous les réglages sur une seule page, dans la même logique que X01.</div>
        </section>

        {configViewMode === "guided" ? (
          <>
            <section style={{ background: "rgba(10,12,24,.94)", borderRadius: 18, padding: 12, marginBottom: 14, border: `1px solid ${primary}33` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div><div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary }}>Configuration guidée</div><div style={{ marginTop: 4, fontSize: 11, color: "#9298bb" }}>Étape {guidedStep + 1}/{guidedSteps.length} • {guidedSteps[guidedStep]} • {guidedSelectionLabel}</div></div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{guidedSteps.map((label, index) => <button key={label} type="button" onClick={() => setGuidedStep(index)} title={label} style={{ minWidth: 28, height: 28, borderRadius: 999, border: `1px solid ${index === guidedStep ? primary : "rgba(255,255,255,.10)"}`, background: index === guidedStep ? primarySoft : index < guidedStep ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", color: index === guidedStep ? primary : "#b7bbd6", fontSize: 10, fontWeight: 950, cursor: "pointer" }}>{index + 1}</button>)}</div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${((guidedStep + 1) / guidedSteps.length) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${primary}, #ffe9a3)` }} /></div>
            </section>

            {guidedStep === 0 ? <PartyTypeSection /> : null}
            {guidedStep === 1 ? <ParticipantsSelector /> : null}
            {guidedStep === 2 ? <LivesSection /> : null}
            {guidedStep === 3 ? <TargetsSection /> : null}
            {guidedStep === 4 ? <OptionsSection /> : null}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
              <button type="button" disabled={guidedStep === 0} onClick={() => setGuidedStep((step) => Math.max(0, step - 1))} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: guidedStep === 0 ? "#60657c" : "#fff", padding: "9px 14px", fontWeight: 900, cursor: guidedStep === 0 ? "default" : "pointer" }}>← PRÉCÉDENT</button>
              {guidedStep < guidedSteps.length - 1 ? <button type="button" onClick={() => setGuidedStep((step) => Math.min(guidedSteps.length - 1, step + 1))} style={{ borderRadius: 999, border: `1px solid ${primary}`, background: primarySoft, color: "#fff", padding: "9px 14px", fontWeight: 950, cursor: "pointer" }}>SUIVANT →</button> : null}
            </div>
          </>
        ) : (
          <>
            <PartyTypeSection />
            <ParticipantsSelector />
            <LivesSection />
            <TargetsSection />
            <OptionsSection />
          </>
        )}
      </div>

      {rulesOpen ? (
        <div onClick={() => setRulesOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(720px,96vw)", maxHeight: "86vh", overflow: "auto", borderRadius: 20, border: `1px solid ${primary}66`, background: "linear-gradient(180deg,rgba(13,16,31,.99),rgba(5,7,16,.99))", padding: 18, boxShadow: `0 0 44px ${primary}33` }}>
            <div style={{ color: primary, fontWeight: 1000, fontSize: 20, marginBottom: 10 }}>RÈGLES — GROS 6</div>
            <div style={{ color: "#e2e4ef", fontSize: 13, lineHeight: 1.6 }}>
              La première cible est S6. Chaque joueur a 3 fléchettes pour toucher la cible. Un échec coûte une vie. Dès qu'une cible est validée, les fléchettes restantes servent à définir la cible du joueur suivant. Dans MULTISPORTS SCORING, la variante étendue permet aussi d'imposer l'extérieur du cercle des chiffres et le rond fermé de chacun des numéros 1 à 20. Si la cible est touchée avec la 3e fléchette, le bonus configuré fournit une nouvelle volée de sélection — 3 fléchettes par défaut.
            </div>
            <button type="button" onClick={() => setRulesOpen(false)} style={{ marginTop: 16, borderRadius: 999, border: `1px solid ${primary}`, background: primarySoft, color: "#fff", padding: "8px 13px", fontWeight: 950, cursor: "pointer" }}>FERMER</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
