// src/pages/DepartementsConfig.tsx
import React from "react";
import { loadBotPlayers } from "../lib/bots";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import BotPagedSelector from "../components/BotPagedSelector";
import {
  PillButton as X01PillButton,
  PlayerDartBadge,
  SelectedParticipantsCompactBlock,
  TeamsSection as X01TeamsSection,
  x01BumpPlayerDartSetUsage,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS, type TerritoryMap } from "../lib/territories/maps";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../lib/profileUsage";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { nextTeamInstanceId } from "../lib/teamSelectionInstances";
import { bumpDartSetUsage } from "../lib/dartSetsStore";

type BotLevel = "easy" | "normal" | "hard";

export type TerritoriesConfigPayload = {
  players: number;

  // ✅ Teams
  teamSize: 1 | 2 | 3;
  // ✅ Selected players (humans + bots)
  selectedIds: string[];
  // ✅ Team assignment (only when teamSize > 1)
  teamsById?: Record<string, number>;

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number; // nb territoires à posséder pour gagner
  mapId: string;
  participantMode?: "players" | "teams";
  teamSourceMode?: "manual" | "saved" | "auto";
  selectedTeamIds?: string[];
  selectedTeamPlayerIds?: Record<string, string[]>;
  playerDartSets?: Record<string, string | null>;
  targetSelectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryMode?: "territories" | "regions" | "time";
  objectiveTerritories?: number;
  objectiveRegions?: number;
  winTerritories?: number;
  winRegions?: number;
  timeLimitMin?: number;
};

const INFO_TEXT = `TERRITORIES (Départements)

Objectif
- Posséder X territoires (réglage "Objectif") ou, à la fin des Rounds, être l’équipe/la personne qui en possède le plus.

Déroulement (en match)
1) Le header indique qui doit jouer (TEAM Gold / TEAM Pink, ou joueur en Solo).
2) Choisis un territoire à attaquer (carte + liste).
3) Joue une volée de 3 fléchettes : chaque flèche = 1 "touche".
4) À 3 touches, le territoire est capturé par l’équipe/joueur.

Règles importantes
- Une touche sur un territoire déjà capturé n’a pas d’effet (sauf si une variante est ajoutée plus tard).
- En mode équipes, l’influence et les captures sont comptées par TEAM.

Conseils
- Utilise la carte pour repérer rapidement les zones déjà prises / encore libres.
`;



const HELP_OBJECTIF_REGIONS = `Objectif (régions)
- Nombre de régions à posséder pour gagner quand la condition de victoire est REGIONS.`;
const HELP_VICTORY = `Condition de victoire
TERRITORIES
- Gagne en atteignant l'objectif (territoires).

REGIONS (FR uniquement)
- Gagne en atteignant l'objectif (régions).

TIME
- Gagne au temps : à la fin, le joueur/équipe avec le plus de possessions est gagnant.`;
const HELP_OBJECTIF = `Objectif (territoires)
- Nombre de territoires à posséder pour gagner.
- Victoire immédiate dès que l'objectif est atteint.
- Si les rounds se terminent avant : le joueur/équipe avec le plus de possessions gagne.`;

const HELP_SELECTION = `Sélection de cible
FREE : vous choisissez le territoire.
IMPOSED : le territoire est imposé.
BY SCORE : le territoire est déterminé automatiquement par le score.
(La sélection carte est informative uniquement.)`;

const HELP_CAPTURE = `Règle de capture
EXACT : le score doit être exactement égal.
D'autres règles peuvent autoriser une marge.`;

// Alphabetical order (carousel)
const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTerritoriesTicker(tickerId: string): string | null {
  const id = String(tickerId || "").toLowerCase();
  const suffix = `/ticker_territories_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.toLowerCase().endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

const FLAG_GLOB = import.meta.glob("../assets/flags/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

function findFlagForMapId(mapId: string): string | null {
  const id = String(mapId || "").toUpperCase();
  const suffix = `/${id}.png`;
  for (const k of Object.keys(FLAG_GLOB)) {
    if (k.toUpperCase().endsWith(suffix)) return FLAG_GLOB[k];
  }
  return null;
}

function clampTeamSize(v: any): 1 | 2 | 3 {
  const n = Number(v);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function isAutoGeneratedTeam(team: any): boolean {
  const id = String(team?.id || team?.baseTeamId || "");
  return team?.temporary === true || team?.generated === true || team?.autoGenerated === true || id.startsWith("tmp_shuffle_");
}

function isTemporaryTeamSelectionId(id: any): boolean {
  return String(id || "").split("__slot_")[0].startsWith("tmp_shuffle_");
}

function withoutTemporaryTeamSelections(value: any): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, string[]> = {};
  for (const [rawId, rawPlayers] of Object.entries(value)) {
    if (isTemporaryTeamSelectionId(rawId)) continue;
    next[String(rawId)] = Array.isArray(rawPlayers) ? rawPlayers.map(String).filter(Boolean) : [];
  }
  return next;
}

type BotLite = { id: string; name: string; avatarDataUrl: string | null; botLevel?: string };

const PRO_BOTS: BotLite[] = [
  { id: "pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine as any },
  { id: "pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid as any },
  { id: "pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand as any },
  { id: "pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower as any },

  { id: "pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney as any },
  { id: "pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot as any },
  { id: "pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney as any },
  { id: "pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan as any },

  { id: "pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing as any },
  { id: "pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy as any },
  { id: "pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret as any },

  { id: "pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp as any },
  { id: "pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood as any },
  { id: "pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple as any },
  { id: "pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace as any },

  { id: "pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant as any },
  { id: "pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage as any },
  { id: "pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart as any },
  { id: "pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer as any },
];

function readUserBotsFromLS(): BotLite[] {
  try {
    return loadBotPlayers().map((b: any) => ({
      id: String(b.id),
      name: b?.name || "BOT",
      avatarDataUrl: b?.avatarDataUrl ?? b?.avatarUrl ?? b?.avatar ?? null,
      avatarUrl: b?.avatarUrl ?? b?.avatar ?? null,
      avatar: b?.avatar ?? b?.avatarUrl ?? b?.avatarDataUrl ?? null,
      botLevel: b?.botLevel ?? b?.level ?? "",
    })).filter((b: any) => !!b.id);
  } catch {
    return [];
  }
}

function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  // IMPORTANT : un profil humain peut avoir un champ `level` ou `botLevel`
  // utilisé uniquement pour son starring. X01 ne filtre les humains que sur
  // le marqueur explicite isBot ; on conserve exactement ce comportement ici.
  return false;
}

function botToFakeProfile(b: BotLite) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: (b as any).avatarDataUrl ?? (b as any).avatarUrl ?? (b as any).avatar ?? null,
    avatarUrl: (b as any).avatarUrl ?? (b as any).avatar ?? null,
    avatar: (b as any).avatar ?? (b as any).avatarUrl ?? (b as any).avatarDataUrl ?? null,
    isBot: true,
    botLevel: b.botLevel || "",
  } as any;
}

// ---------- Inline Info (simple modal)
function InfoMini({
  title,
  content,
  onOpen,
}: {
  title: string;
  content: string;
  onOpen: (t: string, c: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(title, content)}
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 1000,
        lineHeight: "22px",
        textAlign: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
      aria-label="info"
      title={title}
    >
      i
    </button>
  );
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;

  const primary = (theme as any)?.primary ?? "#7dffca";
  const primarySoft = (theme as any)?.primarySoft ?? "rgba(125,255,202,0.16)";

  // ---------- state
  const [mapId, setMapId] = React.useState<string>(() => "FR");

  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);
  const [participantMode, setParticipantMode] = React.useState<"players" | "teams">(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      return parsed?.participantMode === "teams" || Number(parsed?.teamSize) > 1 ? "teams" : "players";
    } catch {
      return "players";
    }
  });
  const [teamSourceMode, setTeamSourceMode] = React.useState<"manual" | "saved" | "auto">(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      return parsed?.teamSourceMode === "saved" || parsed?.teamSourceMode === "auto" ? parsed.teamSourceMode : "manual";
    } catch {
      return "manual";
    }
  });
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      return Array.isArray(parsed?.selectedTeamIds)
        ? parsed.selectedTeamIds.map(String).filter((id: string) => !isTemporaryTeamSelectionId(id)).slice(0, 2)
        : [];
    } catch {
      return [];
    }
  });
  const [selectedTeamPlayerIds, setSelectedTeamPlayerIds] = React.useState<Record<string, string[]>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      return withoutTemporaryTeamSelections(parsed?.selectedTeamPlayerIds);
    } catch {
      return {};
    }
  });
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);

  const [targetSelectionMode, setTargetSelectionMode] = React.useState<"free" | "by_score">("free");
  const [captureRule, setCaptureRule] = React.useState<"exact" | "gte">("exact");
  const [victoryMode, setVictoryMode] = React.useState<"territories" | "regions" | "time">("territories");
  const [objectiveRegions, setObjectiveRegions] = React.useState<number>(3);
  const [timeLimitMin, setTimeLimitMin] = React.useState<number>(20);

  // Load previously saved config (not only selectedIds)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return;
      const parsed: any = JSON.parse(raw);

      if (parsed?.mapId) setMapId(String(parsed.mapId));
      if (parsed?.teamSize) setTeamSize(parsed.teamSize);
      if (parsed?.participantMode === "players" || parsed?.participantMode === "teams") setParticipantMode(parsed.participantMode);
      if (parsed?.teamSourceMode === "manual" || parsed?.teamSourceMode === "saved" || parsed?.teamSourceMode === "auto") {
        setTeamSourceMode(parsed.teamSourceMode);
      }
      if (Array.isArray(parsed?.selectedTeamIds)) {
        setSelectedTeamIds(parsed.selectedTeamIds.map(String).filter((id: string) => !isTemporaryTeamSelectionId(id)).slice(0, 2));
      }
      if (parsed?.selectedTeamPlayerIds && typeof parsed.selectedTeamPlayerIds === "object") {
        setSelectedTeamPlayerIds(withoutTemporaryTeamSelections(parsed.selectedTeamPlayerIds));
      }
      if (typeof parsed?.botsEnabled === "boolean") setBotsEnabled(parsed.botsEnabled);
      if (parsed?.botLevel) setBotLevel(parsed.botLevel);
      if (parsed?.rounds) setRounds(Number(parsed.rounds) || 12);

      // Objective / win territories (support legacy keys)
      const objT = parsed?.winTerritories ?? parsed?.objectiveTerritories ?? parsed?.objective;
      if (objT != null) setObjective(Math.max(1, Number(objT) || 10));

      const tsm = parsed?.targetSelectionMode;
      if (tsm === "free" || tsm === "by_score") setTargetSelectionMode(tsm);

      const cr = parsed?.captureRule;
      if (cr === "exact" || cr === "gte") setCaptureRule(cr);

      const vm = parsed?.victoryMode;
      if (vm === "territories" || vm === "regions" || vm === "time") setVictoryMode(vm);

      const objR = parsed?.winRegions ?? parsed?.objectiveRegions;
      if (objR != null) setObjectiveRegions(Math.max(1, Number(objR) || 3));

      if (parsed?.timeLimitMin != null) setTimeLimitMin(Math.max(1, Number(parsed.timeLimitMin) || 20));

      if (parsed?.teamsById && typeof parsed.teamsById === "object") setTeamsById(parsed.teamsById);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disable Regions victory unless FR (until we have proper region grouping for other maps)
  React.useEffect(() => {
    const isFR = String(mapId || "").toUpperCase() === "FR";
    if (!isFR && victoryMode === "regions") setVictoryMode("territories");
  }, [mapId, victoryMode]);
  // selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 6);
    } catch {}
    return [];
  });
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      return parsed?.playerDartSets && typeof parsed.playerDartSets === "object" ? parsed.playerDartSets : {};
    } catch {
      return {};
    }
  });
  const [autoDartSetPicker, setAutoDartSetPicker] = React.useState<{ profileId: string; seq: number } | null>(null);
  const playersTouchedRef = React.useRef(false);

  // Team assignment (Option A: Teams panel with slots)
  const [teamsById, setTeamsById] = React.useState<Record<string, number>>({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  // Inline info modal
  const [infoModal, setInfoModal] = React.useState<{ title: string; content: string } | null>(null);

  // Map carousel (infinite loop feel)
  const mapStripRef = React.useRef<HTMLDivElement | null>(null);
  const mapCardWidthRef = React.useRef<number>(0);

  const maps = React.useMemo(() => {
    return Object.keys(TERRITORY_MAPS)
      .map((id) => ({ id, ...(TERRITORY_MAPS as any)[id] }))
      .filter((m) => !!m)
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), "fr"));
  }, []);

  const loopMaps = React.useMemo(() => {
    // triple list to allow scroll-wrap
    return [...maps, ...maps, ...maps];
  }, [maps]);

  React.useLayoutEffect(() => {
    const el = mapStripRef.current;
    if (!el) return;
    // Move initial scroll to the middle copy
    requestAnimationFrame(() => {
      const third = el.scrollWidth / 3;
      el.scrollLeft = third;
      // Estimate card width (first child)
      const first = el.querySelector<HTMLElement>("[data-map-card='1']");
      if (first) mapCardWidthRef.current = first.getBoundingClientRect().width;
    });
  }, [loopMaps.length]);

  const onMapStripScroll = React.useCallback(() => {
    const el = mapStripRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    if (el.scrollLeft < third * 0.35) el.scrollLeft += third;
    else if (el.scrollLeft > third * 1.65) el.scrollLeft -= third;
  }, []);

  const cycleMap = React.useCallback(
    (dir: -1 | 1) => {
      let idx = maps.findIndex((m) => m.id === mapId);
              if (idx < 0) idx = 0;
              const n = maps.length || 1;
      const nextId = maps[(idx + dir + n) % n]?.id ?? maps[0]?.id;
      setMapId(nextId);

      // Also scroll to keep it centered-ish
      const el = mapStripRef.current;
      if (!el) return;
      const cw = mapCardWidthRef.current || 240;
      el.scrollBy({ left: dir * (cw + 14), behavior: "smooth" });
    },
    [mapId]
  );

  // bots list (PRO + bots personnalisés)
  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    const custom = readUserBotsFromLS();
    const merged: BotLite[] = [];
    const pushUnique = (b: BotLite) => {
      if (!b?.id) return;
      if (merged.some((x) => x.id === b.id)) return;
      merged.push(b);
    };
    PRO_BOTS.forEach(pushUnique);
    custom.forEach(pushUnique);
    setUserBots(merged);
  }, []);

  // store profiles (humans)
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const humanProfiles = React.useMemo(
    () => sortProfilesByModeUsage(storeProfiles.filter((p) => p && !isBotLike(p)), "x01", (store as any)?.activeProfileId),
    [storeProfiles, (store as any)?.activeProfileId]
  );

  const selectedParticipantProfiles = React.useMemo(() => {
    const humansById = new Map((humanProfiles || []).map((p: any) => [String(p?.id), p]));
    const botsById = new Map((userBots || []).map((b: any) => [String(b?.id), botToFakeProfile(b)]));
    return (selectedIds || []).map((rawId) => {
      const id = String(rawId || "");
      const human = humansById.get(id);
      if (human) return { id, kind: "player", name: human?.name || human?.displayName || "Joueur", profile: human };
      const bot = botsById.get(id);
      if (bot) return { id, kind: "bot", name: bot?.name || "BOT IA", profile: bot };
      return null;
    }).filter(Boolean);
  }, [selectedIds, humanProfiles, userBots]);

  React.useEffect(() => {
    if (playersTouchedRef.current || !humanProfiles.length) return;
    setSelectedIds((prev) => {
      const available = new Set(humanProfiles.map((p: any) => String(p?.id || "")));
      const valid = (prev || []).filter((id) => available.has(String(id)));
      if (valid.length) return valid;
      const activeId = String((store as any)?.activeProfileId || "");
      const ordered = activeId
        ? [...humanProfiles].sort((a: any, b: any) => Number(String(b?.id) === activeId) - Number(String(a?.id) === activeId))
        : humanProfiles;
      return ordered.slice(0, Math.min(2, ordered.length)).map((p: any) => String(p.id));
    });
  }, [humanProfiles, (store as any)?.activeProfileId]);

  const handleChangePlayerDartSet = React.useCallback((profileId: string, dartSetId: string | null) => {
    const pid = String(profileId || "").trim();
    const dsid = dartSetId ? String(dartSetId) : null;
    if (!pid) return;
    setPlayerDartSets((prev) => ({ ...prev, [pid]: dsid }));
    if (dsid) {
      x01BumpPlayerDartSetUsage(pid, dsid);
      try { bumpDartSetUsage(dsid); } catch {}
    }
  }, []);

  const openDartSetPickerAfterPlayerSelection = React.useCallback((id: any, meta?: any) => {
    const pid = String(id || "").trim();
    if (!pid || meta?.selected === false) return;
    if (!humanProfiles.some((p: any) => String(p?.id) === pid)) return;
    setAutoDartSetPicker({ profileId: pid, seq: Date.now() });
  }, [humanProfiles]);

  const [storedDartsTeams, setStoredDartsTeams] = React.useState<any[]>(() => {
    try {
      return loadTeamsBySport("darts").filter((team: any) =>
        Array.isArray(team?.playerIds) && team.playerIds.length > 0 && !isAutoGeneratedTeam(team)
      );
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const refreshTeams = () => {
      try {
        setStoredDartsTeams(loadTeamsBySport("darts").filter((team: any) =>
          Array.isArray(team?.playerIds) && team.playerIds.length > 0 && !isAutoGeneratedTeam(team)
        ));
      } catch {
        setStoredDartsTeams([]);
      }
    };
    window.addEventListener("storage", refreshTeams);
    window.addEventListener("focus", refreshTeams);
    return () => {
      window.removeEventListener("storage", refreshTeams);
      window.removeEventListener("focus", refreshTeams);
    };
  }, []);

  const maxPlayers = participantMode === "teams" ? teamSize * 2 : 6;
  const minPlayers = participantMode === "teams" ? teamSize * 2 : 2;

  // (maps) is already memoized above (alphabetical order)

  function goBack() {
    if ((props as any)?.go) return (props as any).go("games");
    if ((props as any)?.setTab) return (props as any).setTab("games");
    window.history.back();
  }

  function resetParticipants() {
    playersTouchedRef.current = true;
    setAutoDartSetPicker(null);
    setSelectedIds([]);
    setTeamsById({});
    setPendingId(null);
    setSelectedTeamIds([]);
    setSelectedTeamPlayerIds({});
  }

  function chooseParticipantMode(next: "players" | "teams") {
    if (next === participantMode) return;
    resetParticipants();
    setParticipantMode(next);
    setTeamSize(next === "players" ? 1 : 2);
    if (next === "players") setTeamSourceMode("manual");
  }

  function chooseTeamSize(next: 2 | 3) {
    if (teamSize === next) return;
    resetParticipants();
    setTeamSize(next);
  }

  function chooseTeamSource(next: "manual" | "saved" | "auto") {
    if (teamSourceMode === next) return;
    resetParticipants();
    setTeamSourceMode(next);
  }

  function togglePlayer(id: string) {
    const pid = String(id || "");
    playersTouchedRef.current = true;
    setSelectedIds((prev) => {
      const exists = prev.includes(pid);
      if (exists) {
        const next = prev.filter((x) => x !== pid);
        setTeamsById((tb) => {
          const n = { ...tb };
          delete n[pid];
          return n;
        });
        setPendingId((p) => (p === pid ? null : p));
        return next;
      }
      if (prev.length >= maxPlayers) return prev;
      if (humanProfiles.some((p: any) => String(p?.id) === pid)) {
        const preferred = x01MostUsedDartSetIdForProfile(pid, humanProfiles);
        setPlayerDartSets((old) => Object.prototype.hasOwnProperty.call(old, pid) ? old : { ...old, [pid]: preferred });
      }
      if (participantMode === "teams" && teamSourceMode === "manual") {
        setTeamsById((current) => {
          const counts = [0, 0];
          for (const pid of prev) {
            const teamIndex = current[pid];
            if (teamIndex === 0 || teamIndex === 1) counts[teamIndex] += 1;
          }
          const nextTeam = counts[0] <= counts[1] ? 0 : 1;
          return { ...current, [pid]: nextTeam };
        });
      }
      return [...prev, pid];
    });
  }

  function setManualPlayerTeam(id: string, teamIndex: 0 | 1) {
    if (!selectedIds.includes(id)) return;
    setTeamsById((prev) => ({ ...prev, [id]: teamIndex }));
  }

  function addStoredTeam(baseTeamId: string, playerIds: string[]) {
    if (selectedTeamIds.length >= 2) return;
    const instanceId = nextTeamInstanceId({ id: baseTeamId }, selectedTeamIds);
    const chosen = Array.from(new Set((playerIds || []).map(String).filter(Boolean))).slice(0, teamSize);
    setSelectedTeamIds((prev) => [...prev, instanceId].slice(0, 2));
    setSelectedTeamPlayerIds((prev) => ({ ...prev, [instanceId]: chosen }));
  }

  function removeStoredTeam(instanceId: string) {
    setSelectedTeamIds((prev) => prev.filter((id) => id !== instanceId));
    setSelectedTeamPlayerIds((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  }

  function toggleStoredTeamFromX01(baseTeamId: string) {
    const baseId = String(baseTeamId || "");
    const team = storedDartsTeams.find((item: any) => String(item?.id || item?.baseTeamId || "") === baseId);
    if (!team) return;
    const playerIds = Array.isArray(team?.playerIds) ? team.playerIds.map(String).filter(Boolean).slice(0, teamSize) : [];
    addStoredTeam(baseId, playerIds);
  }

  function toggleStoredTeamMemberFromX01(instanceId: string, playerId: string) {
    const tid = String(instanceId || "");
    const pid = String(playerId || "");
    if (!tid || !pid) return;
    setSelectedTeamPlayerIds((prev) => {
      const current = Array.isArray(prev[tid]) ? prev[tid].map(String) : [];
      const next = current.includes(pid)
        ? current.filter((id) => id !== pid)
        : current.length < teamSize
          ? [...current, pid]
          : current;
      return { ...prev, [tid]: next };
    });
  }

  React.useEffect(() => {
    if (participantMode !== "teams" || teamSourceMode === "manual") return;
    const first = (selectedTeamPlayerIds[selectedTeamIds[0] || ""] || []).map(String);
    const second = (selectedTeamPlayerIds[selectedTeamIds[1] || ""] || []).map(String);
    const ids = Array.from(new Set([...first, ...second]));
    const assignments: Record<string, number> = {};
    first.forEach((id) => { assignments[id] = 0; });
    second.forEach((id) => { assignments[id] = 1; });
    setSelectedIds(ids);
    setTeamsById(assignments);
  }, [participantMode, teamSourceMode, teamSize, selectedTeamIds, selectedTeamPlayerIds]);

  // keep teamsById clean when players removed
  React.useEffect(() => {
    setTeamsById((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!selectedIds.includes(k)) delete next[k];
      }
      return next;
    });
    if (pendingId && !selectedIds.includes(pendingId)) setPendingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // If bots disabled, remove bot ids from selection
  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(userBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
    setTeamsById((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (botIds.has(id)) delete next[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botsEnabled, userBots]);

  // ✅ Toujours 2 TEAMS en mode équipes (Team 1 + Team 2)
  const neededTeams = React.useMemo(() => {
    if (teamSize === 1) return 0;
    return 2;
  }, [teamSize]);

  // Team slots model (2 teams fixes)
  const slots = React.useMemo(() => {
    if (teamSize === 1) return [];
    const out: Array<Array<string | null>> = Array.from({ length: 2 }, () =>
      Array.from({ length: teamSize }, () => null)
    );
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= 2) continue;
      for (let s = 0; s < teamSize; s++) {
        if (!out[te][s]) {
          out[te][s] = id;
          break;
        }
      }
    }
    return out;
  }, [teamSize, selectedIds, teamsById]);

  const unassigned = React.useMemo(() => {
    if (teamSize === 1) return [];
    const assigned = new Set<string>();
    for (const team of slots) for (const id of team) if (id) assigned.add(id);
    return selectedIds.filter((id) => !assigned.has(id));
  }, [slots, selectedIds, teamSize]);

  function assignToTeam(teamIndex: number) {
    if (teamSize === 1) return;
    if (!pendingId) return;
    setTeamsById((prev) => ({ ...prev, [pendingId]: teamIndex }));
    setPendingId(null);
  }

  function unassignId(id: string) {
    setTeamsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingId(null);
  }

  function autoFillTeams() {
    if (teamSize === 1) return;
    const ids = [...unassigned]; // ✅ inclut humains + bots sélectionnés
    if (!ids.length) return;

    for (let te = 0; te < 2; te++) {
      for (let s = 0; s < teamSize; s++) {
        if (slots[te]?.[s]) continue;
        if (!ids.length) return;
        const id = ids.shift()!;
        setTeamsById((prev) => ({ ...prev, [id]: te }));
      }
    }
    setPendingId(null);
  }

  function autoCompleteWithBots() {
    // Ne rien faire si la sélection est déjà complète/valide (évite d'ajouter un bot inutilement)
    if (selectionValid) return;
    if (!botsEnabled) return;
    const botIds = userBots.map((b) => b.id).filter(Boolean);
    if (!botIds.length) return;

    setSelectedIds((prev) => {
      // ✅ Ne rien ajouter si la sélection est déjà suffisante
      // - Solo: minPlayers atteint
      // - Équipes: on exige exactement 2 teams => teamSize*2 joueurs
      if (teamSize === 1 && prev.length >= minPlayers) return prev;
      if (teamSize > 1 && prev.length >= teamSize * 2) return prev;

      let next = [...prev];

      // fill to target
      const target = teamSize === 1 ? minPlayers : teamSize * 2;
      for (const id of botIds) {
        if (next.length >= maxPlayers) break;
        if (next.length >= target) break;
        if (!next.includes(id)) next.push(id);
      }

      return next;
    });

    // ✅ et on auto-remplit les teams (humains + bots)
    setTimeout(() => {
      try {
        autoFillTeams();
      } catch {}
    }, 0);
  }

  const selectionValid = React.useMemo(() => {
    if (selectedIds.length < minPlayers) return false;
    if (selectedIds.length > maxPlayers) return false;

    if (participantMode === "players") return true;

    // ✅ mode équipes = EXACTEMENT 2 teams, donc EXACTEMENT 2 * teamSize joueurs
    if (selectedIds.length !== teamSize * 2) return false;

    if (teamSourceMode !== "manual") {
      if (selectedTeamIds.length !== 2) return false;
      const chosen = selectedTeamIds.map((id) => selectedTeamPlayerIds[id] || []);
      if (chosen.some((ids) => ids.length !== teamSize)) return false;
      if (new Set(chosen.flat().map(String)).size !== teamSize * 2) return false;
    }

    // Every selected id must be assigned and each team must have exactly teamSize members
    const counts = [0, 0];
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te > 1) return false;
      counts[te]++;
    }
    return counts[0] === teamSize && counts[1] === teamSize;
  }, [selectedIds, minPlayers, maxPlayers, participantMode, teamSize, teamSourceMode, selectedTeamIds, selectedTeamPlayerIds, teamsById]);

  const payload: TerritoriesConfigPayload = {
    players: selectedIds.length,
    teamSize,
    selectedIds,
    teamsById: participantMode === "players" ? undefined : teamsById,
    participantMode,
    teamSourceMode,
    selectedTeamIds: participantMode === "teams" && teamSourceMode !== "manual" ? selectedTeamIds : undefined,
    selectedTeamPlayerIds: participantMode === "teams" && teamSourceMode !== "manual" ? selectedTeamPlayerIds : undefined,
    playerDartSets,
    botsEnabled,
    botLevel,
    rounds,
    // Legacy keys (kept): objective/objectiveTerritories
    objective,
    objectiveTerritories: objective,

    // ✅ Engine/play keys
    winTerritories: objective,
    winRegions: objectiveRegions,
    captureRule,
    targetSelectionMode,
    victoryMode,
    objectiveRegions,
    timeLimitMin,
    mapId,
  };

  function start() {
    if (!selectionValid) return;
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    try { recordProfileUsageForMode("territories", selectedIds); } catch {}
    if ((props as any)?.go) return (props as any).go("departements_play", { config: payload });
    if ((props as any)?.setTab) return (props as any).setTab("departements_play", { config: payload });
  }

  const cardBg = "rgba(10, 12, 24, 0.96)";

  const x01TeamAssignments = React.useMemo(() => {
    const next: Record<string, "gold" | "pink" | null> = {};
    for (const id of selectedIds) {
      next[id] = teamsById[id] === 0 ? "gold" : teamsById[id] === 1 ? "pink" : null;
    }
    return next;
  }, [selectedIds, teamsById]);

  const setX01PlayerTeam = React.useCallback((playerId: string, teamId: "gold" | "pink" | "blue" | "green") => {
    if (teamId === "gold") setManualPlayerTeam(String(playerId), 0);
    if (teamId === "pink") setManualPlayerTeam(String(playerId), 1);
  }, [selectedIds]);

  return (
    <div className="page" style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* Inline info modal */}
      {infoModal && (
        <div
          onClick={() => setInfoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(10,12,24,0.96)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1100, letterSpacing: 0.6 }}>{infoModal.title}</div>
              <button
                onClick={() => setInfoModal(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.35, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {infoModal.content}
            </div>
          </div>
        </div>
      )}

      {/* MAPS CAROUSEL */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.map", "Carte (pays)")}</span>
            <InfoMini
              title="Carte (pays)"
              content={"La carte choisie définit la liste des territoires (zones) utilisés pendant la partie, et le ticker affiché."}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        
          {/* Full-bleed carousel (ticker = full width) */}
          <div
            style={{
              position: "relative",
              width: "calc(100% + 24px)",
              marginLeft: -12,
              marginRight: -12,
            }}
          >
            {/* Infinite-feel strip */}
            <div
              ref={mapStripRef}
              className="dc-scroll-thin"
              style={{
                display: "flex",
                gap: 0,
                overflowX: "auto",
                paddingBottom: 10,
                flex: 1,
                scrollSnapType: "x mandatory",
              }}
              onScroll={() => {
                const el = mapStripRef.current;
                if (!el) return;
                const third = el.scrollWidth / 3;
                if (!third) return;
                if (el.scrollLeft < third * 0.3) el.scrollLeft += third;
                else if (el.scrollLeft > third * 1.7) el.scrollLeft -= third;
              }}
            >
              {loopMaps.map((m, idx) => {
                const selected = m.id === mapId;
                const src = findTerritoriesTicker(m.tickerId);

                return (
                  <div
                    key={idx + "-" + m.id}
                    data-map-card
                    style={{
                      scrollSnapAlign: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      minWidth: "100%",
                      maxWidth: "100%",
                      paddingLeft: 12,
                      paddingRight: 12,
                    }}
                    onClick={() => setMapId(m.id)}
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        border: selected ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
                        boxShadow: selected
                          ? "0 0 18px rgba(255,255,255,0.10), 0 0 42px rgba(255,255,255,0.06)"
                          : "0 10px 24px rgba(0,0,0,0.35)",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      {/* Title row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          gap: 12,
                          background: "rgba(0,0,0,0.35)",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              border: "1px solid rgba(255,255,255,0.25)",
                              background: selected ? "rgba(255,255,255,0.18)" : "transparent",
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ fontWeight: 900, letterSpacing: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {m.name}
                          </div>
                        </div>
                        <div style={{ opacity: 0.75, fontWeight: 900, letterSpacing: 1.2 }}>{m.id}</div>
                      </div>

                      {/* Ticker image full width */}
                      <div style={{ width: "100%", aspectRatio: "800 / 230", background: "rgba(0,0,0,0.30)" }}>
                        {src ? (
                          <img
                            src={src}
                            alt={m.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", opacity: 0.7, fontWeight: 900 }}>
                            ticker {m.id}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overlay arrows (on top of ticker) */}
            <button
              onClick={() => cycleMap(-1)}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-20%)",
                width: 44,
                height: 44,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.55)",
                boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
                color: "#fff",
                fontSize: 22,
                fontWeight: 900,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                zIndex: 5,
              }}
              aria-label="Précédent"
              title="Précédent"
            >
              ‹
            </button>

            <button
              onClick={() => cycleMap(1)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-20%)",
                width: 44,
                height: 44,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.55)",
                boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
                color: "#fff",
                fontSize: 22,
                fontWeight: 900,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                zIndex: 5,
              }}
              aria-label="Suivant"
              title="Suivant"
            >
              ›
            </button>
          </div>

      </Section>

      {/* PARTICIPANTS — même système visuel que X01 */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("config.participants", "Participants")}</span>
            <InfoMini
              title="Joueurs / Équipes"
              content={
                "JOUEURS : sélection libre de 2 à 6 participants, avec profils locaux et Bots IA.\n\nÉQUIPES : choisis un format 2v2 ou 3v3, puis compose les deux équipes manuellement, depuis tes équipes enregistrées, ou avec un brassage automatique."
              }
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, minWidth: 0, maxWidth: "100%" }}>
          <X01PillButton
            label="Joueurs"
            active={participantMode === "players"}
            onClick={() => chooseParticipantMode("players")}
            primary={primary}
            primarySoft={primarySoft}
          />
          <X01PillButton
            label="Équipes"
            active={participantMode === "teams"}
            onClick={() => chooseParticipantMode("teams")}
            primary={primary}
            primarySoft={primarySoft}
          />
        </div>

        {participantMode === "players" ? (
          <div style={{ display: "grid", gap: 14 }}>
            {humanProfiles.length > 0 ? (
              <>
                <SelectedParticipantsCompactBlock
                  items={selectedParticipantProfiles}
                  accent={primary}
                  onRemove={togglePlayer}
                  playerDartSets={playerDartSets}
                  onDartSetChange={handleChangePlayerDartSet}
                  allProfiles={humanProfiles}
                />
                <PlayerPagedSelector
                  usageMode="x01"
                  profiles={humanProfiles}
                  selectedIds={selectedIds}
                  onToggle={togglePlayer}
                  onAfterToggle={openDartSetPickerAfterPlayerSelection}
                  accent={primary}
                  pageSize={9}
                  modalTitle="Choisir des joueurs"
                  onClose={() => setAutoDartSetPicker(null)}
                  renderAvatarOverlay={(p: any) => (
                    <PlayerDartBadge
                      profileId={String(p.id)}
                      dartSetId={playerDartSets[String(p.id)] ?? null}
                      onChange={(id) => handleChangePlayerDartSet(String(p.id), id)}
                      compact
                      allProfiles={humanProfiles}
                      autoOpenToken={autoDartSetPicker?.profileId === String(p.id) ? autoDartSetPicker.seq : null}
                    />
                  )}
                  showSelectedSummary={false}
                />
              </>
            ) : (
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: 12, color: "#aeb2d3", fontSize: 12 }}>
                Aucun profil local. Crée d’abord tes joueurs dans le menu Profils.
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
              <OptionRow
                label={
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span>Bots IA</span>
                    <InfoMini
                      title="Bots IA"
                      content="Active ce bloc pour ajouter un ou plusieurs adversaires virtuels à la sélection."
                      onOpen={(title, content) => setInfoModal({ title, content })}
                    />
                  </div>
                }
              >
                <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
              </OptionRow>
              {botsEnabled ? (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  <OptionRow label="Difficulté IA">
                    <OptionSelect
                      value={botLevel}
                      options={[
                        { value: "easy", label: "Easy" },
                        { value: "normal", label: "Normal" },
                        { value: "hard", label: "Hard" },
                      ]}
                      onChange={setBotLevel}
                    />
                  </OptionRow>
                  <BotPagedSelector
                    bots={userBots}
                    selectedIds={selectedIds}
                    onToggle={togglePlayer}
                    accent={primary}
                    pageSize={4}
                    showCheckbox={false}
                    label="BOTS IA"
                    modalTitle="Choisir des BOTS IA"
                    showSelectedSummary={false}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14, width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
            <div>
              <div style={{ color: "#aeb2d3", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Format des équipes
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <X01PillButton label="2 v 2" active={teamSize === 2} onClick={() => chooseTeamSize(2)} primary={primary} primarySoft={primarySoft} />
                <X01PillButton label="3 v 3" active={teamSize === 3} onClick={() => chooseTeamSize(3)} primary={primary} primarySoft={primarySoft} />
              </div>
            </div>

            <X01TeamsSection
              profiles={humanProfiles}
              selectableProfiles={humanProfiles}
              selectedIds={selectedIds}
              teamAssignments={x01TeamAssignments}
              setPlayerTeam={setX01PlayerTeam}
              togglePlayer={togglePlayer}
              playerDartSets={playerDartSets}
              handleChangePlayerDartSet={handleChangePlayerDartSet}
              autoDartSetPicker={autoDartSetPicker}
              setAutoDartSetPicker={setAutoDartSetPicker}
              allProfiles={humanProfiles}
              sourceMode={teamSourceMode}
              setSourceMode={chooseTeamSource}
              storedTeams={storedDartsTeams}
              selectedStoredTeamIds={selectedTeamIds}
              toggleStoredTeam={toggleStoredTeamFromX01}
              addStoredTeamSelection={addStoredTeam}
              removeStoredTeamSelection={removeStoredTeam}
              botTeams={[]}
              botTeamsPanelEnabled={false}
              selectedBotTeamIds={[]}
              savedTeamMemberSelections={selectedTeamPlayerIds}
              toggleSavedTeamMember={toggleStoredTeamMemberFromX01}
              teamSizeOverride={teamSize}
              teamCountOverride={2}
              allowSaveGeneratedTeams={false}
              primary={primary}
              primarySoft={primarySoft}
            />
          </div>
        )}

        <div style={{ marginTop: 14, borderRadius: 15, padding: "10px 12px", border: `1px solid ${selectionValid ? `${primary}55` : "rgba(255,120,150,.28)"}`, background: selectionValid ? `${primary}10` : "rgba(255,80,120,.07)" }}>
          <div style={{ color: selectionValid ? primary : "#ffb2c8", fontSize: 12, fontWeight: 950 }}>
            {selectionValid
              ? `Sélection prête · ${selectedIds.length} participant${selectedIds.length > 1 ? "s" : ""}`
              : participantMode === "players"
                ? `Sélectionne entre 2 et ${maxPlayers} joueurs.`
                : `Sélectionne exactement 2 équipes de ${teamSize} joueurs.`}
          </div>
        </div>
      </Section>

      {/* Rules */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("config.rules", "Règles")}</span>
            <InfoMini
              title="Règles"
              content={"Rounds = nombre de tours maximum. Objectif = territoires à posséder pour gagner."}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.objective", "Objectif (territoires)")}</span>
            <InfoMini
              title="Objectif (territoires)"
              content={HELP_OBJECTIF}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
        </OptionRow>

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.targetMode", "Sélection de cible")}</span>
            <InfoMini
              title="Sélection de cible"
              content={HELP_SELECTION}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }>
          <OptionSelect
            value={targetSelectionMode}
            options={["free", "by_score"]}
            onChange={setTargetSelectionMode as any}
          />
        </OptionRow>

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.captureRule", "Règle de capture")}</span>
            <InfoMini
              title="Règle de capture"
              content={HELP_CAPTURE}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }>
          <OptionSelect value={captureRule} options={["exact", "gte"]} onChange={setCaptureRule as any} />
        </OptionRow>

        <OptionRow label={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>{t("territories.victoryMode", "Condition de victoire")}</span><InfoMini title="Condition de victoire" content={HELP_VICTORY} onOpen={(t, c) => setInfoModal({ title: t, content: c })} /></div>}>
          <OptionSelect
            value={victoryMode}
            options={String(mapId || "").toUpperCase() === "FR" ? ["territories", "regions", "time"] : ["territories", "time"]}
            onChange={setVictoryMode as any}
          />
        </OptionRow>

        {victoryMode === "regions" && String(mapId || "").toUpperCase() === "FR" && (
          <OptionRow label={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>{t("territories.objectiveRegions", "Objectif (régions)")}</span><InfoMini title="Objectif (régions)" content={HELP_OBJECTIF_REGIONS} onOpen={(t, c) => setInfoModal({ title: t, content: c })} /></div>}>
            <OptionSelect value={objectiveRegions} options={[1,2,3,4,5,6,7,8,9,10]} onChange={setObjectiveRegions} />
          </OptionRow>
        )}

        {victoryMode === "time" && (
          <OptionRow label={t("territories.timeLimit", "Temps de partie")}>
            <OptionSelect value={timeLimitMin} options={[15,20,30,60]} onChange={setTimeLimitMin} />
          </OptionRow>
        )}
      </Section>

      {/* ✅ Bouton EXACTEMENT “famille X01” */}
      <Section>
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(112px + env(safe-area-inset-bottom))",
            padding: "0 12px",
            zIndex: 30,
          }}
        >
          <button
            onClick={start}
            disabled={!selectionValid}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: selectionValid
                ? "linear-gradient(90deg, " + primary + ", #ffe9a3)"
                : "rgba(255,255,255,0.06)",
              boxShadow: selectionValid
                ? "0 0 18px " + primary + "66, 0 0 42px " + primary + "30, 0 10px 24px rgba(0,0,0,0.40)"
                : "0 10px 24px rgba(0,0,0,0.40)",
              color: selectionValid ? "#0b0a12" : "rgba(255,255,255,0.55)",
              fontWeight: 1100,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              cursor: selectionValid ? "pointer" : "not-allowed",
            }}
          >
            {t("config.startGame", "LANCER LA PARTIE")}
          </button>
        </div>
      </Section>
    </div>
  );
}
