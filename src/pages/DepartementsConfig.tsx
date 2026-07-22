// src/pages/DepartementsConfig.tsx
import React from "react";
import { loadBotPlayers } from "../lib/bots";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
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
import {
  recordTerritoriesMapUsage,
  resolvePreferredTerritoriesMapId,
} from "../territories/mapPreferences";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../lib/profileUsage";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { nextTeamInstanceId } from "../lib/teamSelectionInstances";
import { bumpDartSetUsage } from "../lib/dartSetsStore";
import { buildTerritoryValueCalibration } from "../territories/territoryValueBalancing";

type BotLevel = "easy" | "normal" | "hard";

const TERRITORY_MAP_IDS = Object.keys(TERRITORY_MAPS);

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
  participantProfiles?: Record<string, { name: string; avatarDataUrl?: string | null; isBot?: boolean; botLevel?: string | null }>;

  // Rules
  gameMode?: "classic" | "fortress";
  fortressVictoryMode?: "majority" | "value" | "conquest";
  maxFortressesPerOwner?: number;
  targetSelectionMode?: "free" | "by_score";
  captureRule?: "exact" | "gte";
  victoryMode?: "territories" | "regions" | "time";
  objectiveTerritories?: number;
  objectiveRegions?: number;
  winTerritories?: number;
  winRegions?: number;
  timeLimitMin?: number;
  bullReplayEnabled?: boolean;
  missPassTurn?: boolean;
  // Valeurs de territoires calibrées automatiquement selon les participants.
  valueSkillAverage3?: number;
  valueTargetMin?: number;
  valueTargetMax?: number;
  valueDifficultyLabel?: string;
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
- VOLÉE DIRECTE : joue immédiatement sans sélectionner de cible ; le total de la volée désigne automatiquement l’unique territoire portant cette valeur.

Valeurs des territoires
- Elles sont calculées selon la surface réelle : les grands territoires demandent les scores les plus élevés.
- La difficulté s'adapte automatiquement au niveau des participants sélectionnés. Chaque territoire jouable reçoit une valeur différente.
- Au-delà de 180 territoires, 180 cibles sont retenues pour la partie et les autres restent visibles mais grisées et non jouables.

Règle de capture
- EXACT : le total doit être strictement égal à la valeur du territoire.
- GTE (Greater Than or Equal) : le total peut être égal ou supérieur. Exemple : pour une valeur 46, 46, 47 ou 60 réussissent.
- Le mode FORTERESSES impose toujours EXACT.

Règles spéciales de lancer
- BULL / DBULL = REJOUER 1X : si activé, un Bull ou Double Bull donne une nouvelle volée au même joueur, une seule fois avant de rendre la main.
- MISS = PASSE SON TOUR : si activé, une fléchette manquée (0) termine immédiatement le tour.
- Un joueur peut VALIDER sa volée à tout moment après 1 ou 2 fléchettes : il n'est jamais obligé de lancer ses 3 fléchettes.

Conditions de victoire
- OBJECTIF TERRITOIRES : victoire immédiate dès le nombre demandé atteint.
- OBJECTIF RÉGIONS : France uniquement ; une région est possédée quand tous ses départements ont la même couleur.
- TEMPS : à la fin du chrono, le camp qui possède le plus de territoires gagne.
- MAJORITÉ EN NOMBRE : à la fin des rounds, le camp qui possède le plus de territoires gagne.
- MAJORITÉ EN VALEUR : à la fin des rounds, le camp dont les territoires totalisent le plus de points gagne.
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
- En FORTERESSES + MAJORITÉ EN NOMBRE ou EN VALEUR, le classement final est calculé exactement à la fin du dernier round.
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

MAJORITÉ EN NOMBRE
- Tous les camps jouent le nombre de rounds choisi.
- À la fin, celui qui possède le plus de territoires gagne.

MAJORITÉ EN VALEUR
- Tous les camps jouent le nombre de rounds choisi.
- Chaque territoire rapporte sa valeur cible.
- La distribution de départ équilibre à la fois le nombre de territoires et leur valeur cumulée entre les camps.
- À la fin, le camp dont les territoires possédés totalisent la plus grande valeur gagne.
- Un grand territoire pèse donc davantage qu'un petit territoire.

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

VOLÉE DIRECTE — SANS SÉLECTION
- Tu joues immédiatement ta volée, sans ouvrir la carte et sans choisir de territoire avant de lancer.
- Le total de la volée recherche automatiquement l'unique territoire portant cette valeur.
- En FORTERESSES : ton propre territoire construit une forteresse, une forteresse adverse est brisée, et un territoire adverse non protégé est conquis.
- Si aucune valeur ne correspond au score réalisé, aucun territoire ne change de propriétaire.`;



const HELP_SPECIAL_THROWS = `Règles spéciales de lancer

BULL / DBULL = REJOUER 1X
- Un Bull (25) ou Double Bull (50) validé donne immédiatement une nouvelle volée au même joueur.
- Ce bonus ne peut être utilisé qu'une seule fois avant de passer au joueur suivant : un second Bull pendant la volée bonus ne redonne pas une troisième volée.

MISS = PASSE SON TOUR
- Une fléchette manquée (0) termine immédiatement le tour et donne la main au joueur suivant.
- Les fléchettes déjà saisies dans cette volée sont abandonnées : aucune capture n'est validée sur cette volée interrompue.

ARRÊTER SA VOLÉE
- Le joueur peut appuyer sur VALIDER après 1, 2 ou 3 fléchettes.
- Il n'est jamais obligé de lancer les trois fléchettes si son score cible est déjà atteint.`;

const HELP_VALUE_BALANCE = `Valeurs adaptatives des territoires

- Chaque territoire jouable reçoit une valeur strictement unique : aucun doublon n'est possible.
- Les territoires sont classés selon leur surface réelle sur la carte : plus un territoire est grand, plus sa valeur est élevée.
- Une carte de plus de 180 territoires sélectionne les 180 territoires les plus lisibles et grise les autres pour la partie en cours.
- La plage de scores est calculée automatiquement à partir du niveau des joueurs et Bots sélectionnés.
- Le joueur le moins fort est volontairement pris en compte pour que les plus grandes cibles restent difficiles, mais atteignables.
- Les valeurs sont fixées au lancement et restent identiques pour tous pendant toute la partie.`;

const HELP_CAPTURE = `Règle de capture

EXACT
- Le total de la volée doit être strictement égal à la valeur affichée.
- Exemple : territoire 46 → il faut faire exactement 46.

GTE = GREATER THAN OR EQUAL = SUPÉRIEUR OU ÉGAL
- Le total peut être égal OU supérieur à la valeur affichée.
- Exemple : territoire 46 → 46, 47, 60 ou 100 réussissent ; 45 échoue.
- En mode VOLÉE DIRECTE, le score total désigne directement l’unique territoire portant cette valeur ; aucune sélection préalable n’est nécessaire.

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

function hexToRgba(hex: string, alpha: number) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(125,255,202,${alpha})`;
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
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
        border: "1px solid color-mix(in srgb, var(--dc-accent) 58%, transparent)",
        background: "color-mix(in srgb, var(--dc-accent) 10%, rgba(0,0,0,0.28))",
        color: "var(--dc-accent)",
        boxShadow: "0 0 10px color-mix(in srgb, var(--dc-accent) 28%, transparent)",
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
  const { t, lang } = useLang();
  const { theme } = useTheme();

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const incomingConfig = ((props as any)?.params?.config || (props as any)?.config || null) as
    | Partial<TerritoriesConfigPayload>
    | null;

  const primary = theme?.primary ?? "#7dffca";
  const primarySoft = hexToRgba(primary, 0.16);
  const primarySoftStrong = hexToRgba(primary, 0.24);
  const primaryGlow = hexToRgba(primary, 0.38);
  const primaryGlowSoft = hexToRgba(primary, 0.16);
  const [configViewMode, setConfigViewMode] = React.useState<"guided" | "complete">(() => {
    try { return localStorage.getItem("dc_territories_config_view_mode") === "complete" ? "complete" : "guided"; }
    catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const guidedSteps = ["Carte", "Participants", "Mode", "Règles", "Victoire"];
  const guidedMaxStep = guidedSteps.length - 1;
  const selectConfigViewMode = React.useCallback((mode: "guided" | "complete") => {
    setConfigViewMode(mode);
    try { localStorage.setItem("dc_territories_config_view_mode", mode); } catch {}
  }, []);

  // ---------- state
  const mapTouchedRef = React.useRef(false);
  const [mapId, setMapId] = React.useState<string>(() => {
    const returnedMapId = String(incomingConfig?.mapId || "").toUpperCase().trim();
    if (returnedMapId && TERRITORY_MAP_IDS.includes(returnedMapId)) return returnedMapId;
    return resolvePreferredTerritoriesMapId(lang, TERRITORY_MAP_IDS);
  });

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
  const [fortressVictoryMode, setFortressVictoryMode] = React.useState<"majority" | "value" | "conquest">("majority");
  const [maxFortressesPerOwner, setMaxFortressesPerOwner] = React.useState<number>(2);

  const [targetSelectionMode, setTargetSelectionMode] = React.useState<"free" | "by_score">("free");
  const [captureRule, setCaptureRule] = React.useState<"exact" | "gte">("exact");
  const [victoryMode, setVictoryMode] = React.useState<"territories" | "regions" | "time">("territories");
  const [objectiveRegions, setObjectiveRegions] = React.useState<number>(3);
  const [timeLimitMin, setTimeLimitMin] = React.useState<number>(20);
  const [bullReplayEnabled, setBullReplayEnabled] = React.useState<boolean>(false);
  const [missPassTurn, setMissPassTurn] = React.useState<boolean>(false);

  // Load previously saved config (not only selectedIds)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return;
      const parsed: any = JSON.parse(raw);

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
      if (fvm === "majority" || fvm === "value" || fvm === "conquest") setFortressVictoryMode(fvm);

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
      if (typeof parsed?.bullReplayEnabled === "boolean") setBullReplayEnabled(parsed.bullReplayEnabled);
      if (typeof parsed?.missPassTurn === "boolean") setMissPassTurn(parsed.missPassTurn);

      if (parsed?.teamsById && typeof parsed.teamsById === "object") setTeamsById(parsed.teamsById);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le contexte de langue est chargé après le premier rendu. Tant que le
  // joueur n'a pas manipulé le carrousel, on recalcule donc la préférence :
  // carte la plus utilisée, puis pays/continent correspondant à la langue.
  React.useEffect(() => {
    if (mapTouchedRef.current) return;
    setMapId(resolvePreferredTerritoriesMapId(lang, TERRITORY_MAP_IDS));
  }, [lang]);

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

  // Map carousel : la carte réellement centrée est TOUJOURS la carte
  // sélectionnée. Le joueur n'a plus besoin de cliquer une seconde fois sur
  // le ticker déjà visible pour que cette carte soit envoyée au mode PLAY.
  const mapStripRef = React.useRef<HTMLDivElement | null>(null);
  const mapScrollFrameRef = React.useRef<number | null>(null);
  const mapProgrammaticScrollRef = React.useRef(false);
  const mapProgrammaticTimerRef = React.useRef<number | null>(null);

  const maps = React.useMemo(() => {
    return Object.keys(TERRITORY_MAPS)
      .map((id) => ({ id, ...(TERRITORY_MAPS as any)[id] }))
      .filter((m) => !!m)
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), "fr"));
  }, []);

  const loopMaps = React.useMemo(() => {
    // Trois copies permettent une navigation circulaire sans fin visible.
    return [...maps, ...maps, ...maps];
  }, [maps]);

  const markProgrammaticMapScroll = React.useCallback((durationMs = 80) => {
    mapProgrammaticScrollRef.current = true;
    if (mapProgrammaticTimerRef.current != null) {
      window.clearTimeout(mapProgrammaticTimerRef.current);
    }
    mapProgrammaticTimerRef.current = window.setTimeout(() => {
      mapProgrammaticScrollRef.current = false;
      mapProgrammaticTimerRef.current = null;
    }, durationMs);
  }, []);

  const centerMapInStrip = React.useCallback((targetMapId: string, behavior: ScrollBehavior = "auto") => {
    const strip = mapStripRef.current;
    if (!strip) return;

    const cards = Array.from(strip.querySelectorAll<HTMLElement>("[data-map-card='1']"));
    const target = cards.find((card) =>
      card.dataset.mapCopy === "1" && card.dataset.mapId === String(targetMapId),
    );
    if (!target) return;

    const nextLeft = target.offsetLeft - (strip.clientWidth - target.offsetWidth) / 2;
    markProgrammaticMapScroll(behavior === "smooth" ? 420 : 90);
    strip.scrollTo({ left: nextLeft, behavior });
  }, [markProgrammaticMapScroll]);

  const selectMap = React.useCallback((nextMapId: string, behavior: ScrollBehavior = "smooth") => {
    mapTouchedRef.current = true;
    setMapId(String(nextMapId));
    requestAnimationFrame(() => centerMapInStrip(String(nextMapId), behavior));
  }, [centerMapInStrip]);

  // À l'ouverture et après le chargement de la langue, le carrousel se place
  // exactement sur la carte sélectionnée, dans la copie centrale.
  React.useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => centerMapInStrip(mapId, "auto"));
    return () => cancelAnimationFrame(frame);
  }, [centerMapInStrip, loopMaps.length, mapId]);

  React.useEffect(() => () => {
    if (mapScrollFrameRef.current != null) cancelAnimationFrame(mapScrollFrameRef.current);
    if (mapProgrammaticTimerRef.current != null) window.clearTimeout(mapProgrammaticTimerRef.current);
  }, []);

  const onMapStripScroll = React.useCallback(() => {
    const strip = mapStripRef.current;
    if (!strip) return;

    const third = strip.scrollWidth / 3;
    if (third > 0) {
      if (strip.scrollLeft < third * 0.35) {
        markProgrammaticMapScroll();
        strip.scrollLeft += third;
      } else if (strip.scrollLeft > third * 1.65) {
        markProgrammaticMapScroll();
        strip.scrollLeft -= third;
      }
    }

    if (mapScrollFrameRef.current != null) cancelAnimationFrame(mapScrollFrameRef.current);
    mapScrollFrameRef.current = requestAnimationFrame(() => {
      const currentStrip = mapStripRef.current;
      if (!currentStrip) return;

      const stripRect = currentStrip.getBoundingClientRect();
      const stripCenter = stripRect.left + stripRect.width / 2;
      const cards = Array.from(currentStrip.querySelectorAll<HTMLElement>("[data-map-card='1']"));
      let nearest: HTMLElement | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - stripCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = card;
        }
      }

      const centeredMapId = nearest?.dataset.mapId;
      if (!centeredMapId || centeredMapId === mapId) return;
      if (mapProgrammaticScrollRef.current) return;
      mapTouchedRef.current = true;
      setMapId(centeredMapId);
    });
  }, [mapId, markProgrammaticMapScroll]);

  const cycleMap = React.useCallback((dir: -1 | 1) => {
    let index = maps.findIndex((map) => map.id === mapId);
    if (index < 0) index = 0;
    const count = maps.length || 1;
    const nextId = maps[(index + dir + count) % count]?.id ?? maps[0]?.id;
    if (nextId) selectMap(nextId, "smooth");
  }, [mapId, maps, selectMap]);

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

  const territoryValueCalibration = React.useMemo(
    () => buildTerritoryValueCalibration(
      selectedParticipantProfiles.map((entry: any) => entry?.profile).filter(Boolean),
      botLevel,
    ),
    [selectedParticipantProfiles, botLevel],
  );

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
    participantProfiles: Object.fromEntries((selectedParticipantProfiles as any[]).map((item: any) => [
      String(item.id),
      {
        name: String(item.name || item.profile?.name || "Joueur"),
        avatarDataUrl: item.profile?.avatarDataUrl ?? item.profile?.avatarUrl ?? item.profile?.avatar ?? null,
        isBot: item.kind === "bot",
        botLevel: item.profile?.botLevel ?? item.profile?.level ?? null,
      },
    ])),
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
    bullReplayEnabled,
    missPassTurn,
    mapId,
    valueSkillAverage3: territoryValueCalibration.referenceAvg3,
    valueTargetMin: territoryValueCalibration.minTarget,
    valueTargetMax: territoryValueCalibration.maxTarget,
    valueDifficultyLabel: territoryValueCalibration.label,
  };

  function start() {
    if (!selectionValid) return;
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    try { recordTerritoriesMapUsage(mapId); } catch {}
    try { recordProfileUsageForMode("territories", selectedIds); } catch {}
    if ((props as any)?.go) return (props as any).go("departements_play", { config: payload });
    if ((props as any)?.setTab) return (props as any).setTab("departements_play", { config: payload });
  }

  const cardBg = `linear-gradient(180deg, ${hexToRgba(theme.card, 0.96)}, ${hexToRgba(theme.bg, 0.94)})`;

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

  const activeMapLabel = React.useMemo(() => String(maps.find((map) => map.id === mapId)?.name || mapId), [maps, mapId]);
  const guidedParticipantLabel = participantMode === "teams"
    ? `${teamCount} équipes · ${teamSize} joueurs`
    : `${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""}`;
  const guidedVictoryLabel = gameMode === "fortress"
    ? fortressVictoryMode === "value" ? "Majorité en valeur" : fortressVictoryMode === "conquest" ? "Conquête totale" : "Majorité territoires"
    : victoryMode === "regions" ? `Objectif ${objectiveRegions} régions` : victoryMode === "time" ? `${timeLimitMin} min` : `Objectif ${objective} territoires`;

  return (
    <div className="page" style={{ width: "calc(100% + 32px)", maxWidth: "none", minWidth: 0, overflowX: "hidden", margin: "-18px -16px 0", paddingBottom: 86 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(112px, 18vw, 138px)",
          overflow: "hidden",
          background: "#05070b",
          borderBottom: `1px solid ${primary}44`,
          marginBottom: 8,
        }}
      >
        <img src={tickerDepartements} alt="TERRITORIES" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.36), transparent 24%, transparent 76%, rgba(0,0,0,.36))" }} />
        <div style={{ position: "absolute", left: 10, top: "calc(env(safe-area-inset-top) + 7px)", zIndex: 2 }}><BackDot onClick={goBack} /></div>
        <div style={{ position: "absolute", right: 10, top: "calc(env(safe-area-inset-top) + 7px)", zIndex: 2 }}><InfoDot title="Règles TERRITORIES" content={INFO_TEXT} color={primary} glow={`${primary}88`} /></div>
      </div>

      <div style={{ padding: "0 8px" }}>
        <section style={{ background: cardBg, borderRadius: 18, padding: 12, marginBottom: 12, border: `1px solid ${hexToRgba(primary, 0.62)}`, boxShadow: `0 0 24px ${primaryGlowSoft}, 0 14px 34px rgba(0,0,0,.48)` }}>
          <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration Territories</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <X01PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => selectConfigViewMode("guided")} primary={primary} primarySoft={primarySoft} />
            <X01PillButton label="Complète" active={configViewMode === "complete"} onClick={() => selectConfigViewMode("complete")} primary={primary} primarySoft={primarySoft} />
          </div>
          <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 11, lineHeight: 1.35 }}>Guidée : les choix essentiels étape par étape. Complète : tous les paramètres avancés sur une seule page.</div>
        </section>

        {configViewMode === "guided" ? (
          <section style={{ background: cardBg, borderRadius: 18, padding: 12, marginBottom: 12, border: `1px solid ${hexToRgba(primary, 0.58)}`, boxShadow: `0 0 22px ${primaryGlowSoft}, 0 14px 34px rgba(0,0,0,.48)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
              <div>
                <div style={{ color: primary, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div>
                <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{guidedSteps.length} · {guidedSteps[guidedStep]}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {guidedSteps.map((label, idx) => <button key={label} type="button" onClick={() => setGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? primary : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? primarySoft : idx < guidedStep ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", color: idx === guidedStep ? primary : "#aeb2d3", fontSize: 9.5, fontWeight: 950, cursor: "pointer" }}>{idx + 1}</button>)}
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / guidedSteps.length) * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${primary}, ${theme.accent2 || primary})`, transition: "width .18s ease" }} /></div>
          </section>
        ) : null}

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
              border: `1px solid ${hexToRgba(primary, 0.52)}`,
              background: cardBg,
              boxShadow: `0 0 28px ${primaryGlowSoft}, 0 24px 80px rgba(0,0,0,0.55)`,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1100, letterSpacing: 0.6, color: primary, textShadow: `0 0 10px ${primaryGlow}` }}>{infoModal.title}</div>
              <button
                onClick={() => setInfoModal(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: `1px solid ${hexToRgba(primary, 0.55)}`,
                  background: primarySoft,
                  color: primary,
                  boxShadow: `0 0 12px ${primaryGlowSoft}`,
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
      {(configViewMode === "complete" || guidedStep === 0) ? (
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
              onScroll={onMapStripScroll}
            >
              {loopMaps.map((m, idx) => {
                const selected = m.id === mapId;
                const src = findTerritoriesTicker(m.tickerId);

                return (
                  <div
                    key={idx + "-" + m.id}
                    data-map-card="1"
                    data-map-id={m.id}
                    data-map-copy={String(Math.floor(idx / Math.max(1, maps.length)))}
                    style={{
                      scrollSnapAlign: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      minWidth: "100%",
                      maxWidth: "100%",
                      paddingLeft: 12,
                      paddingRight: 12,
                    }}
                    onClick={() => selectMap(m.id)}
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        border: selected ? `1px solid ${hexToRgba(primary, 0.72)}` : "1px solid rgba(255,255,255,0.10)",
                        boxShadow: selected
                          ? `0 0 18px ${primaryGlow}, 0 0 42px ${primaryGlowSoft}`
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
                              border: `1px solid ${selected ? primary : "rgba(255,255,255,0.25)"}`,
                              background: selected ? primarySoftStrong : "transparent",
                              boxShadow: selected ? `0 0 10px ${primaryGlow}` : "none",
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
                border: `1px solid ${hexToRgba(primary, 0.50)}`,
                background: "rgba(0,0,0,0.55)",
                boxShadow: `0 0 14px ${primaryGlowSoft}, 0 10px 22px rgba(0,0,0,0.45)`,
                color: primary,
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
                border: `1px solid ${hexToRgba(primary, 0.50)}`,
                background: "rgba(0,0,0,0.55)",
                boxShadow: `0 0 14px ${primaryGlowSoft}, 0 10px 22px rgba(0,0,0,0.45)`,
                color: primary,
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
      ) : null}

      {/* PARTICIPANTS — même système visuel que X01 */}
      {(configViewMode === "complete" || guidedStep === 1) ? (
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
      ) : null}

      {configViewMode === "guided" && guidedStep === 2 ? (
        <section style={{ background: cardBg, borderRadius: 18, padding: 14, marginBottom: 14, border: `1px solid ${primary}33`, boxShadow: "0 16px 40px rgba(0,0,0,.52)" }}>
          <h3 style={{ margin: "0 0 7px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>3. Mode de jeu</h3>
          <div style={{ color: "#aeb2d3", fontSize: 11.5, lineHeight: 1.4, marginBottom: 12 }}>Choisis la philosophie de la partie puis sa durée.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 9, marginBottom: 12 }}>
            <button type="button" onClick={() => setGameMode("classic")} style={{ minHeight: 74, borderRadius: 16, padding: 12, textAlign: "left", cursor: "pointer", border: `1px solid ${gameMode === "classic" ? primary : "rgba(255,255,255,.10)"}`, background: gameMode === "classic" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff" }}><div style={{ color: primary, fontSize: 15, fontWeight: 950 }}>Conquête</div><div style={{ marginTop: 4, fontSize: 10.5, color: "#aeb2d3" }}>Carte neutre, capture directe.</div></button>
            <button type="button" onClick={() => setGameMode("fortress")} style={{ minHeight: 74, borderRadius: 16, padding: 12, textAlign: "left", cursor: "pointer", border: `1px solid ${gameMode === "fortress" ? primary : "rgba(255,255,255,.10)"}`, background: gameMode === "fortress" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff" }}><div style={{ color: primary, fontSize: 15, fontWeight: 950 }}>Forteresses</div><div style={{ marginTop: 4, fontSize: 10.5, color: "#aeb2d3" }}>Territoires partagés et défendables.</div></button>
          </div>
          {(gameMode === "classic" || fortressVictoryMode !== "conquest") ? <OptionRow label="Rounds"><OptionSelect value={rounds} options={[6,8,10,12,15,20,25]} onChange={setRounds} /></OptionRow> : null}
          {gameMode === "fortress" ? <OptionRow label="Forteresses max. / camp"><OptionSelect value={maxFortressesPerOwner} options={[1,2,3,4,5,6,7,8,9,10]} onChange={(value:any) => setMaxFortressesPerOwner(Math.max(1,Math.min(10,Number(value)||2)))} /></OptionRow> : null}
        </section>
      ) : null}

      {configViewMode === "guided" && guidedStep === 3 ? (
        <section style={{ background: cardBg, borderRadius: 18, padding: 14, marginBottom: 14, border: `1px solid ${primary}33`, boxShadow: "0 16px 40px rgba(0,0,0,.52)" }}>
          <h3 style={{ margin: "0 0 7px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>4. Règles de jeu</h3>
          <OptionRow label="Sélection de cible"><OptionSelect value={targetSelectionMode} options={[{value:"free",label:"Libre — choix sur la carte"},{value:"by_score",label:"Volée directe — sans sélection"}]} onChange={setTargetSelectionMode as any} /></OptionRow>
          <OptionRow label="Règle de capture"><OptionSelect value={gameMode === "fortress" ? "exact" : captureRule} options={[{value:"exact",label:"EXACT — score égal"},{value:"gte",label:"GTE — supérieur ou égal"}]} onChange={setCaptureRule as any} disabled={gameMode === "fortress"} /></OptionRow>
          <OptionRow label="Bull / DBull = rejouer 1×"><OptionToggle value={bullReplayEnabled} onChange={setBullReplayEnabled} /></OptionRow>
          <OptionRow label="MISS = passe son tour"><OptionToggle value={missPassTurn} onChange={setMissPassTurn} /></OptionRow>
          <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 12, background: `${primary}0d`, border: `1px solid ${primary}30`, color: "#cfd4ea", fontSize: 10.8, lineHeight: 1.4 }}>Le joueur peut toujours appuyer sur VALIDER après 1, 2 ou 3 fléchettes.</div>
        </section>
      ) : null}

      {configViewMode === "guided" && guidedStep === 4 ? (
        <section style={{ background: cardBg, borderRadius: 18, padding: 14, marginBottom: 14, border: `1px solid ${selectionValid ? primary + "66" : "rgba(255,255,255,.08)"}`, boxShadow: "0 16px 40px rgba(0,0,0,.52)" }}>
          <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>5. Victoire & récapitulatif</h3>
          {gameMode === "classic" ? (
            <>
              <OptionRow label="Condition de victoire"><OptionSelect value={victoryMode} options={String(mapId).toUpperCase() === "FR" ? [{value:"territories",label:"Objectif territoires"},{value:"regions",label:"Objectif régions"},{value:"time",label:"Temps — majorité"}] : [{value:"territories",label:"Objectif territoires"},{value:"time",label:"Temps — majorité"}]} onChange={setVictoryMode as any} /></OptionRow>
              {victoryMode === "territories" ? <OptionRow label="Objectif"><OptionSelect value={objective} options={[5,6,8,10,12,15,18,20,25]} onChange={setObjective} /></OptionRow> : null}
              {victoryMode === "regions" ? <OptionRow label="Régions"><OptionSelect value={objectiveRegions} options={[1,2,3,4,5,6,7,8,9,10]} onChange={setObjectiveRegions} /></OptionRow> : null}
              {victoryMode === "time" ? <OptionRow label="Temps"><OptionSelect value={timeLimitMin} options={[10,15,20,30,45,60]} onChange={setTimeLimitMin} /></OptionRow> : null}
            </>
          ) : <OptionRow label="Condition de victoire"><OptionSelect value={fortressVictoryMode} options={[{value:"majority",label:"Majorité — territoires"},{value:"value",label:"Majorité — valeur"},{value:"conquest",label:"Conquête totale"}]} onChange={setFortressVictoryMode as any} /></OptionRow>}
          <div style={{ marginTop: 12, display: "grid", gap: 7, padding: 11, borderRadius: 14, background: `${primary}0c`, border: `1px solid ${primary}33`, fontSize: 11.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Carte</span><b>{activeMapLabel}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Participants</span><b>{guidedParticipantLabel}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Mode</span><b>{gameMode === "fortress" ? "Forteresses" : "Conquête"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Cible</span><b>{targetSelectionMode === "by_score" ? "Volée directe" : "Libre"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Victoire</span><b>{guidedVictoryLabel}</b></div>
          </div>
        </section>
      ) : null}

      {configViewMode === "guided" ? (
        <div style={{ display: "flex", gap: 9, margin: "0 0 14px" }}>
          <button type="button" onClick={() => setGuidedStep((step) => Math.max(0, step - 1))} disabled={guidedStep === 0} style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: guidedStep === 0 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.065)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button>
          <button type="button" onClick={() => setGuidedStep((step) => Math.min(guidedMaxStep, step + 1))} disabled={guidedStep === guidedMaxStep} style={{ flex: 1, height: 42, borderRadius: 999, border: `1px solid ${primary}`, background: guidedStep === guidedMaxStep ? "rgba(255,255,255,.025)" : primarySoft, color: guidedStep === guidedMaxStep ? "#565b76" : primary, fontWeight: 950 }}>Suivant →</button>
        </div>
      ) : null}

      {/* Rules */}
      {configViewMode === "complete" ? (
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

        {(gameMode === "classic" || fortressVictoryMode !== "conquest") ? (
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
              { value: "by_score", label: "Volée directe — sans sélection" },
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


        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Règles spéciales</span>
            <InfoMini title="Bull / DBull / Miss / arrêt de volée" content={HELP_SPECIAL_THROWS} onOpen={(title, content) => setInfoModal({ title, content })} />
          </div>
        }>
          <div style={{ display: "grid", gap: 8, minWidth: 190 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 11, fontWeight: 900 }}>
              <span>BULL / DBULL = rejouer 1×</span>
              <OptionToggle value={bullReplayEnabled} onChange={setBullReplayEnabled} />
            </label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 11, fontWeight: 900 }}>
              <span>MISS = passe son tour</span>
              <OptionToggle value={missPassTurn} onChange={setMissPassTurn} />
            </label>
          </div>
        </OptionRow>

        <OptionRow label={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Valeurs des territoires</span>
            <InfoMini title="Valeurs adaptatives" content={HELP_VALUE_BALANCE} onOpen={(title, content) => setInfoModal({ title, content })} />
          </div>
        }>
          <div style={{ textAlign: "right", lineHeight: 1.15 }}>
            <div style={{ color: primary, fontWeight: 1000, fontSize: 12 }}>
              {territoryValueCalibration.label} · {territoryValueCalibration.minTarget}–{territoryValueCalibration.maxTarget}
            </div>
            <div style={{ marginTop: 3, color: "#aeb5cc", fontSize: 10.5, fontWeight: 850 }}>
              Surface + niveau du groupe
            </div>
          </div>
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
                { value: "majority", label: "Majorité — nombre de territoires" },
                { value: "value", label: "Majorité — valeur cumulée" },
                { value: "conquest", label: "Conquête totale de la carte" },
              ]}
              onChange={setFortressVictoryMode as any}
            />
          </OptionRow>
        )}

        {gameMode === "fortress" && fortressVictoryMode === "value" ? (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${primary}55`,
              background: `${primary}10`,
              color: "#dfe5f5",
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: primary }}>Victoire à la valeur :</strong> chaque territoire rapporte sa valeur cible. La distribution initiale équilibre le nombre et la valeur entre les camps, puis le classement final additionne les valeurs possédées.
          </div>
        ) : null}
      </Section>
      ) : null}

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
              border: selectionValid ? `1px solid ${hexToRgba(primary, 0.78)}` : "1px solid rgba(255,255,255,0.10)",
              background: selectionValid
                ? `linear-gradient(90deg, ${primary}, ${theme.accent2 || primary})`
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
    </div>
  );
}
