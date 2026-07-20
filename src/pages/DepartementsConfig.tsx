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

  // Participants
  teamSize: 1 | 2 | 3;
  teamCount?: number;
  selectedIds: string[];
  teamsById?: Record<string, number>;

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
  mapId: string;
  participantMode?: "players" | "teams";
  teamSourceMode?: "manual" | "saved" | "auto";
  selectedTeamIds?: string[];
  selectedTeamPlayerIds?: Record<string, string[]>;
  playerDartSets?: Record<string, string | null>;

  // Rules
  gameMode?: "classic" | "fortress";
  fortressVictoryMode?: "majority" | "conquest";
  maxFortressesPerOwner?: number;
  targetSelectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryMode?: "territories" | "regions" | "time";
  objectiveTerritories?: number;
  objectiveRegions?: number;
  winTerritories?: number;
  winRegions?: number;
  timeLimitMin?: number;
};

const INFO_TEXT = `TERRITORIES / DÉPARTEMENTS

Deux modes de jeu

1. CONQUÊTE CLASSIQUE
- La carte commence neutre.
- Choisis ou obtiens une cible, puis réalise le score demandé sur une volée de 1 à 3 fléchettes.
- Tu peux capturer un territoire libre ou reprendre un territoire adverse.

2. FORTERESSES
- Chaque joueur ou équipe reçoit strictement le même nombre de territoires dès le départ. Si la carte ne se divise pas parfaitement, le petit surplus reste neutre et pourra être conquis.
- Chaque camp possède une couleur différente.
- En réalisant exactement la valeur de l'un de tes territoires, tu y places une forteresse.
- Le nombre maximal de forteresses actives est configurable pour chaque joueur ou équipe. Quand la limite est atteinte, une nouvelle forteresse déplace automatiquement la plus ancienne.
- Pour voler un territoire adverse non protégé : réalise exactement sa valeur.
- Pour voler un territoire protégé : une première réussite exacte brise la forteresse, puis une seconde réussite exacte conquiert le territoire.

Participants
- Joueurs : de 2 à 10 participants, profils locaux et Bots IA compris.
- Équipes : de 2 à 4 équipes de 2 ou 3 joueurs, avec un maximum de 10 participants au total.

Sélection de cible
- LIBRE : tu choisis précisément le territoire sur la carte.
- PAR LE SCORE : la valeur totale de la volée détermine automatiquement un territoire compatible.

Règle de capture
- EXACT : le total doit être strictement égal à la valeur du territoire.
- GTE (Greater Than or Equal) : le total peut être égal ou supérieur. Exemple : pour une valeur 46, 46, 47 ou 60 réussissent.
- Le mode FORTERESSES impose toujours EXACT.

Conditions de victoire
- OBJECTIF TERRITOIRES : victoire immédiate dès le nombre demandé atteint.
- OBJECTIF RÉGIONS : France uniquement ; une région est possédée quand tous ses départements ont la même couleur.
- TEMPS : à la fin du chrono, le camp qui possède le plus de territoires gagne.
- MAJORITÉ : à la fin des rounds, le camp qui possède le plus de territoires gagne.
- CONQUÊTE TOTALE : la partie continue jusqu'à ce qu'un camp possède toute la carte.
`;




const HELP_GAME_MODE = `Mode de jeu

CONQUÊTE CLASSIQUE
- La carte commence sans propriétaire.
- Chaque réussite capture directement la cible selon la règle EXACT ou GTE.

FORTERESSES
- Chaque camp reçoit strictement le même nombre de territoires, colorés dès le départ. Un éventuel surplus indivisible reste neutre.
- Marque exactement la valeur d'un de tes territoires pour y placer une forteresse.
- Le nombre de forteresses simultanées est configurable par joueur/équipe. Une nouvelle protection déplace la plus ancienne uniquement lorsque la limite choisie est déjà atteinte.
- Une attaque exacte brise d'abord une forteresse ennemie ; une nouvelle attaque exacte conquiert ensuite le territoire.`;

const HELP_ROUNDS = `Rounds
- Un round est terminé quand tous les joueurs ont joué une fois.
- En CLASSIQUE, les rounds servent aussi de limite : si personne n'a atteint l'objectif, le plus grand nombre de possessions l'emporte.
- En FORTERESSES + MAJORITÉ, le classement final est calculé exactement à la fin du dernier round.
- En CONQUÊTE TOTALE, la limite de rounds ne termine pas la partie.`;

const HELP_OBJECTIF_REGIONS = `Objectif (régions)
- Disponible sur la carte France.
- Une région est gagnée seulement lorsque tous ses départements appartiennent au même joueur ou à la même équipe.
- La victoire est immédiate dès que le nombre de régions demandé est atteint.`;

const HELP_VICTORY = `Condition de victoire — mode Classique

TERRITOIRES
- Victoire immédiate dès que le nombre de territoires demandé est atteint.
- Si les rounds se terminent avant, le plus grand nombre de territoires l'emporte.

RÉGIONS (France uniquement)
- Victoire immédiate dès que le nombre de régions complètes demandé est atteint.

TEMPS
- La partie s'arrête à la fin du chrono.
- Le joueur ou l'équipe qui possède le plus de territoires gagne.`;

const HELP_FORTRESS_VICTORY = `Condition de victoire — mode Forteresses

MAJORITÉ AUX ROUNDS
- Tous les camps jouent le nombre de rounds choisi.
- À la fin, celui qui possède le plus de territoires gagne.

CONQUÊTE TOTALE
- Aucun objectif chiffré et aucune fin automatique aux rounds.
- La partie se termine uniquement lorsqu'un joueur ou une équipe possède toute la carte.`;

const HELP_FORTRESS_LIMIT = `Nombre maximal de forteresses

- Cette limite s'applique séparément à chaque joueur ou équipe, afin que tous les camps disposent du même potentiel défensif.
- Exemple : valeur 3 = chaque camp peut protéger jusqu'à 3 de ses territoires en même temps.
- Tant que la limite n'est pas atteinte, chaque score exact sur un territoire allié ajoute une nouvelle forteresse.
- Une fois la limite atteinte, protéger un nouveau territoire déplace automatiquement la forteresse la plus ancienne.
- Une forteresse brisée libère immédiatement une place.`;

const HELP_OBJECTIF = `Objectif (territoires)
- Nombre de territoires à posséder pour gagner immédiatement.
- Exemple : objectif 10 = la partie s'arrête dès qu'un camp contrôle son 10e territoire.
- Si personne n'y arrive avant la fin des rounds, le plus grand nombre de possessions l'emporte.`;

const HELP_TIME = `Temps de partie
- Le chrono démarre au lancement de la partie.
- À son expiration, la partie s'arrête au prochain contrôle de fin de tour.
- Le joueur ou l'équipe qui possède le plus de territoires gagne ; une égalité de possession donne une égalité.`;

const HELP_SELECTION = `Sélection de cible

LIBRE
- Tu touches la carte pour choisir exactement le territoire à attaquer ou à défendre.
- C'est le choix le plus stratégique, recommandé pour FORTERESSES.

PAR LE SCORE
- Tu ne choisis pas obligatoirement la cible.
- Le total de ta volée recherche automatiquement un territoire dont la valeur correspond à la règle de capture.
- S'il existe plusieurs territoires compatibles, le jeu en sélectionne un automatiquement.`;

const HELP_CAPTURE = `Règle de capture

EXACT
- Le total de la volée doit être strictement égal à la valeur affichée.
- Exemple : territoire 46 → il faut faire exactement 46.

GTE = GREATER THAN OR EQUAL = SUPÉRIEUR OU ÉGAL
- Le total peut être égal OU supérieur à la valeur affichée.
- Exemple : territoire 46 → 46, 47, 60 ou 100 réussissent ; 45 échoue.
- En mode PAR LE SCORE, le jeu attribue le territoire de plus grande valeur accessible avec le total réalisé.

FORTERESSES
- La règle est automatiquement verrouillée sur EXACT pour les attaques, les défenses et la destruction d'une forteresse.`;

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
  const [teamCount, setTeamCount] = React.useState<number>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dc_modecfg_departements") || "null");
      const value = Math.floor(Number(parsed?.teamCount || 2));
      return Math.max(2, Math.min(4, value));
    } catch {
      return 2;
    }
  });
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
      const savedCount = Math.max(2, Math.min(4, Math.floor(Number(parsed?.teamCount || 2))));
      return Array.isArray(parsed?.selectedTeamIds)
        ? parsed.selectedTeamIds.map(String).filter((id: string) => !isTemporaryTeamSelectionId(id)).slice(0, savedCount)
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
  const [gameMode, setGameMode] = React.useState<"classic" | "fortress">("classic");
  const [fortressVictoryMode, setFortressVictoryMode] = React.useState<"majority" | "conquest">("majority");
  const [maxFortressesPerOwner, setMaxFortressesPerOwner] = React.useState<number>(2);

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
      if (parsed?.teamCount != null) setTeamCount(Math.max(2, Math.min(4, Math.floor(Number(parsed.teamCount) || 2))));
      if (parsed?.participantMode === "players" || parsed?.participantMode === "teams") setParticipantMode(parsed.participantMode);
      if (parsed?.teamSourceMode === "manual" || parsed?.teamSourceMode === "saved" || parsed?.teamSourceMode === "auto") {
        setTeamSourceMode(parsed.teamSourceMode);
      }
      if (Array.isArray(parsed?.selectedTeamIds)) {
        const savedCount = Math.max(2, Math.min(4, Math.floor(Number(parsed?.teamCount || 2))));
        setSelectedTeamIds(parsed.selectedTeamIds.map(String).filter((id: string) => !isTemporaryTeamSelectionId(id)).slice(0, savedCount));
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

      const gm = parsed?.gameMode;
      if (gm === "classic" || gm === "fortress") setGameMode(gm);

      const fvm = parsed?.fortressVictoryMode;
      if (fvm === "majority" || fvm === "conquest") setFortressVictoryMode(fvm);

      if (parsed?.maxFortressesPerOwner != null) {
        setMaxFortressesPerOwner(Math.max(1, Math.min(10, Math.floor(Number(parsed.maxFortressesPerOwner) || 2))));
      }

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
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 10);
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
    () => sortProfilesByModeUsage(storeProfiles.filter((p) => p && !isBotLike(p)), "territories", (store as any)?.activeProfileId),
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

  const maxPlayers = participantMode === "teams" ? Math.min(10, teamSize * teamCount) : 10;
  const minPlayers = participantMode === "teams" ? teamSize * teamCount : 2;

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
    if (next === "teams") setTeamCount(2);
    if (next === "players") setTeamSourceMode("manual");
  }

  function chooseTeamSize(next: 2 | 3) {
    if (teamSize === next) return;
    resetParticipants();
    setTeamSize(next);
    const maxCountForSize = Math.max(2, Math.min(4, Math.floor(10 / next)));
    setTeamCount((current) => Math.min(current, maxCountForSize));
  }

  function chooseTeamCount(next: number) {
    const safe = Math.max(2, Math.min(4, Math.floor(Number(next) || 2)));
    if (safe === teamCount || safe * teamSize > 10) return;
    resetParticipants();
    setTeamCount(safe);
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
          const counts = Array.from({ length: teamCount }, () => 0);
          for (const currentId of prev) {
            const teamIndex = current[currentId];
            if (typeof teamIndex === "number" && teamIndex >= 0 && teamIndex < teamCount) counts[teamIndex] += 1;
          }
          let nextTeam = 0;
          for (let i = 1; i < counts.length; i += 1) if (counts[i] < counts[nextTeam]) nextTeam = i;
          return { ...current, [pid]: nextTeam };
        });
      }
      return [...prev, pid];
    });
  }

  function setManualPlayerTeam(id: string, teamIndex: 0 | 1 | 2 | 3) {
    if (!selectedIds.includes(id)) return;
    setTeamsById((prev) => ({ ...prev, [id]: teamIndex }));
  }

  function addStoredTeam(baseTeamId: string, playerIds: string[]) {
    if (selectedTeamIds.length >= teamCount) return;
    const instanceId = nextTeamInstanceId({ id: baseTeamId }, selectedTeamIds);
    const chosen = Array.from(new Set((playerIds || []).map(String).filter(Boolean))).slice(0, teamSize);
    setSelectedTeamIds((prev) => [...prev, instanceId].slice(0, teamCount));
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
    const groups = selectedTeamIds.slice(0, teamCount).map((teamId) =>
      (selectedTeamPlayerIds[teamId] || []).map(String).slice(0, teamSize),
    );
    const ids = Array.from(new Set(groups.flat()));
    const assignments: Record<string, number> = {};
    groups.forEach((group, teamIndex) => group.forEach((id) => { assignments[id] = teamIndex; }));
    setSelectedIds(ids);
    setTeamsById(assignments);
  }, [participantMode, teamSourceMode, teamSize, teamCount, selectedTeamIds, selectedTeamPlayerIds]);

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

  const neededTeams = React.useMemo(() => (teamSize === 1 ? 0 : teamCount), [teamSize, teamCount]);

  // Team slots model (2 to 4 teams)
  const slots = React.useMemo(() => {
    if (teamSize === 1) return [];
    const out: Array<Array<string | null>> = Array.from({ length: teamCount }, () =>
      Array.from({ length: teamSize }, () => null)
    );
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= teamCount) continue;
      for (let s = 0; s < teamSize; s++) {
        if (!out[te][s]) {
          out[te][s] = id;
          break;
        }
      }
    }
    return out;
  }, [teamSize, teamCount, selectedIds, teamsById]);

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

    for (let te = 0; te < teamCount; te++) {
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
      // - Équipes: on exige exactement teamCount équipes complètes
      if (teamSize === 1 && prev.length >= minPlayers) return prev;
      if (teamSize > 1 && prev.length >= teamSize * teamCount) return prev;

      let next = [...prev];

      // fill to target
      const target = teamSize === 1 ? minPlayers : teamSize * teamCount;
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

    if (selectedIds.length !== teamSize * teamCount) return false;

    if (teamSourceMode !== "manual") {
      if (selectedTeamIds.length !== teamCount) return false;
      const chosen = selectedTeamIds.map((id) => selectedTeamPlayerIds[id] || []);
      if (chosen.some((ids) => ids.length !== teamSize)) return false;
      if (new Set(chosen.flat().map(String)).size !== teamSize * teamCount) return false;
    }

    // Every selected id must be assigned and each team must have exactly teamSize members
    const counts = Array.from({ length: teamCount }, () => 0);
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= teamCount) return false;
      counts[te] += 1;
    }
    return counts.every((count) => count === teamSize);
  }, [selectedIds, minPlayers, maxPlayers, participantMode, teamSize, teamCount, teamSourceMode, selectedTeamIds, selectedTeamPlayerIds, teamsById]);

  const payload: TerritoriesConfigPayload = {
    players: selectedIds.length,
    teamSize,
    teamCount: participantMode === "teams" ? teamCount : 1,
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
    gameMode,
    fortressVictoryMode,
    maxFortressesPerOwner,
    captureRule: gameMode === "fortress" ? "exact" : captureRule,
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
    const ids = ["gold", "pink", "blue", "green"] as const;
    const next: Record<string, "gold" | "pink" | "blue" | "green" | null> = {};
    for (const id of selectedIds) {
      const index = teamsById[id];
      next[id] = typeof index === "number" && index >= 0 && index < ids.length ? ids[index] : null;
    }
    return next;
  }, [selectedIds, teamsById]);

  const setX01PlayerTeam = React.useCallback((playerId: string, teamId: "gold" | "pink" | "blue" | "green") => {
    const index = ({ gold: 0, pink: 1, blue: 2, green: 3 } as const)[teamId];
    if (index < teamCount) setManualPlayerTeam(String(playerId), index as 0 | 1 | 2 | 3);
  }, [selectedIds, teamCount]);

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
                "JOUEURS : sélection libre de 2 à 10 participants, avec profils locaux et Bots IA.\n\nÉQUIPES : choisis 2 à 4 équipes de 2 ou 3 joueurs, sans dépasser 10 participants. Composition manuelle, équipes enregistrées ou brassage automatique."
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
                  usageMode="territories"
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
                Joueurs par équipe
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <X01PillButton label="2 joueurs" active={teamSize === 2} onClick={() => chooseTeamSize(2)} primary={primary} primarySoft={primarySoft} />
                <X01PillButton label="3 joueurs" active={teamSize === 3} onClick={() => chooseTeamSize(3)} primary={primary} primarySoft={primarySoft} />
              </div>
            </div>

            <div>
              <div style={{ color: "#aeb2d3", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Nombre d'équipes
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[2, 3, 4].filter((count) => count * teamSize <= 10).map((count) => (
                  <X01PillButton
                    key={count}
                    label={`${count} équipes`}
                    active={teamCount === count}
                    onClick={() => chooseTeamCount(count)}
                    primary={primary}
                    primarySoft={primarySoft}
                  />
                ))}
              </div>
              <div style={{ marginTop: 7, color: "#8f94b2", fontSize: 11 }}>
                {teamCount} × {teamSize} = {teamCount * teamSize} participants
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
              teamCountOverride={teamCount}
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
                : `Sélectionne exactement ${teamCount} équipes de ${teamSize} joueurs.`}
          </div>
        </div>
      </Section>

      {/* Rules */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("config.rules", "Règles")}</span>
            <InfoMini
              title="Règles TERRITORIES"
              content={INFO_TEXT}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Mode de jeu</span>
            <InfoMini title="Mode de jeu" content={HELP_GAME_MODE} onOpen={(title, content) => setInfoModal({ title, content })} />
          </div>
        }>
          <OptionSelect
            value={gameMode}
            options={[
              { value: "classic", label: "Conquête classique" },
              { value: "fortress", label: "Forteresses" },
            ]}
            onChange={setGameMode as any}
          />
        </OptionRow>

        {gameMode === "fortress" ? (
          <div style={{ margin: "8px 0 12px", borderRadius: 16, padding: "12px 14px", border: `1px solid ${primary}55`, background: `${primary}0f` }}>
            <div style={{ color: primary, fontSize: 12, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Répartition équitable activée
            </div>
            <div style={{ marginTop: 6, color: "#d7dcf2", fontSize: 11.5, lineHeight: 1.45 }}>
              La carte sera partagée automatiquement entre les {participantMode === "teams" ? `${teamCount} équipes` : `${selectedIds.length || 2} joueurs`}.
              Chaque camp commencera avec exactement le même nombre de territoires et sa propre couleur. Si la division laisse un petit surplus, ces territoires resteront neutres au départ. Chaque camp pourra maintenir jusqu'à {maxFortressesPerOwner} forteresse{maxFortressesPerOwner > 1 ? "s" : ""} active{maxFortressesPerOwner > 1 ? "s" : ""}.
            </div>
          </div>
        ) : null}

        {gameMode === "fortress" ? (
          <OptionRow label={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Forteresses max. / camp</span>
              <InfoMini title="Nombre maximal de forteresses" content={HELP_FORTRESS_LIMIT} onOpen={(title, content) => setInfoModal({ title, content })} />
            </div>
          }>
            <OptionSelect
              value={maxFortressesPerOwner}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              onChange={(value: any) => setMaxFortressesPerOwner(Math.max(1, Math.min(10, Number(value) || 2)))}
            />
          </OptionRow>
        ) : null}

        {(gameMode === "classic" || fortressVictoryMode === "majority") ? (
          <OptionRow label={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>{t("config.rounds", "Rounds")}</span>
              <InfoMini title="Rounds" content={HELP_ROUNDS} onOpen={(title, content) => setInfoModal({ title, content })} />
            </div>
          }>
            <OptionSelect value={rounds} options={[6, 8, 10, 12, 15, 20, 25]} onChange={setRounds} />
          </OptionRow>
        ) : (
          <OptionRow label={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Durée</span>
              <InfoMini title="Conquête totale" content={HELP_FORTRESS_VICTORY} onOpen={(title, content) => setInfoModal({ title, content })} />
            </div>
          }>
            <span style={{ color: primary, fontWeight: 950 }}>Jusqu'à conquête totale</span>
          </OptionRow>
        )}

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.targetMode", "Sélection de cible")}</span>
            <InfoMini title="Sélection de cible" content={HELP_SELECTION} onOpen={(title, content) => setInfoModal({ title, content })} />
          </div>
        }>
          <OptionSelect
            value={targetSelectionMode}
            options={[
              { value: "free", label: "Libre — choix sur la carte" },
              { value: "by_score", label: "Par le score — automatique" },
            ]}
            onChange={setTargetSelectionMode as any}
          />
        </OptionRow>

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.captureRule", "Règle de capture")}</span>
            <InfoMini title="Règle de capture — EXACT / GTE" content={HELP_CAPTURE} onOpen={(title, content) => setInfoModal({ title, content })} />
          </div>
        }>
          <OptionSelect
            value={gameMode === "fortress" ? "exact" : captureRule}
            options={[
              { value: "exact", label: "EXACT — score strictement égal" },
              { value: "gte", label: "GTE — supérieur ou égal" },
            ]}
            onChange={setCaptureRule as any}
            disabled={gameMode === "fortress"}
          />
        </OptionRow>

        {gameMode === "classic" ? (
          <>
            <OptionRow label={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>{t("territories.victoryMode", "Condition de victoire")}</span>
                <InfoMini title="Condition de victoire" content={HELP_VICTORY} onOpen={(title, content) => setInfoModal({ title, content })} />
              </div>
            }>
              <OptionSelect
                value={victoryMode}
                options={String(mapId || "").toUpperCase() === "FR"
                  ? [
                      { value: "territories", label: "Objectif territoires" },
                      { value: "regions", label: "Objectif régions" },
                      { value: "time", label: "Temps — majorité finale" },
                    ]
                  : [
                      { value: "territories", label: "Objectif territoires" },
                      { value: "time", label: "Temps — majorité finale" },
                    ]}
                onChange={setVictoryMode as any}
              />
            </OptionRow>

            {victoryMode === "territories" ? (
              <OptionRow label={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{t("territories.objective", "Objectif (territoires)")}</span>
                  <InfoMini title="Objectif (territoires)" content={HELP_OBJECTIF} onOpen={(title, content) => setInfoModal({ title, content })} />
                </div>
              }>
                <OptionSelect value={objective} options={[5, 6, 8, 10, 12, 15, 18, 20, 25]} onChange={setObjective} />
              </OptionRow>
            ) : null}

            {victoryMode === "regions" && String(mapId || "").toUpperCase() === "FR" ? (
              <OptionRow label={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{t("territories.objectiveRegions", "Objectif (régions)")}</span>
                  <InfoMini title="Objectif (régions)" content={HELP_OBJECTIF_REGIONS} onOpen={(title, content) => setInfoModal({ title, content })} />
                </div>
              }>
                <OptionSelect value={objectiveRegions} options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} onChange={setObjectiveRegions} />
              </OptionRow>
            ) : null}

            {victoryMode === "time" ? (
              <OptionRow label={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{t("territories.timeLimit", "Temps de partie")}</span>
                  <InfoMini title="Temps de partie" content={HELP_TIME} onOpen={(title, content) => setInfoModal({ title, content })} />
                </div>
              }>
                <OptionSelect value={timeLimitMin} options={[10, 15, 20, 30, 45, 60]} onChange={setTimeLimitMin} />
              </OptionRow>
            ) : null}
          </>
        ) : (
          <OptionRow label={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Condition de victoire</span>
              <InfoMini title="Victoire — Forteresses" content={HELP_FORTRESS_VICTORY} onOpen={(title, content) => setInfoModal({ title, content })} />
            </div>
          }>
            <OptionSelect
              value={fortressVictoryMode}
              options={[
                { value: "majority", label: "Majorité à la fin des rounds" },
                { value: "conquest", label: "Conquête totale de la carte" },
              ]}
              onChange={setFortressVictoryMode as any}
            />
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
