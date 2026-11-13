// src/pages/CapitalConfig.tsx
// CAPITAL — Config écran (cohérent avec les autres menus config)
// - Sélection profils locaux (carousel)
// - Sélection bots IA (carousel + avatars)
// - Ordre de départ (aléatoire / défini + réordonnancement)
// - Mode (Officiel / Custom contrats)
// - Mode de saisie (keypad / dartboard / presets)
//
// PATCH (ajouts SANS rien casser) :
// - Victoire / tie-break / règle /2 : conservé + nettoyé (suppression du doublon dans payload)
// - Timers (tour) + comportements bots (vitesse/auto-play/risk) + limite nb contrats custom (configurable)
// - Presets de règles (Officiel / Fun) qui remplissent les options rapidement (sans empêcher l’édition)

import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import InfoMini from "../components/InfoMini";
import PageHeader from "../components/PageHeader";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { PRO_BOTS, proBotToProfile } from "../lib/botsPro";
import { getProBotAvatar } from "../lib/botsProAvatars";
import { loadBotPlayers } from "../lib/bots";
import { SCORE_INPUT_LS_KEY, type ScoreInputMethod } from "../lib/scoreInput/types";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../lib/profileUsage";
import {
  CAPITAL_CONTRACT_META,
  CAPITAL_GRID_PRESETS,
  CAPITAL_CUSTOM_VARIANT_LABEL,
  CAPITAL_PRESET_ORDER,
  CAPITAL_PRESET_GROUPS,
  CAPITAL_COMMITTEE_REPLACEMENTS,
  canonicalCapitalGridPreset,
  capitalPresetContracts,
  CAPITAL_SELECTABLE_CONTRACTS,
  capitalExactScorePossible,
  type CapitalContractId,
  type CapitalGridPresetId,
} from "../lib/capitalGame";
import {
  loadCapitalSavedVariants,
  persistCapitalSavedVariants,
  type CapitalSavedVariant,
} from "../lib/capitalSavedVariants";
import NativeStartOrderConfig, { type NativeStartOrderMode } from "../components/NativeStartOrderConfig";
import CapitalParticipantsX01, {
  type CapitalParticipantSelection,
} from "./CapitalParticipantsX01";

type BotLevel = "easy" | "normal" | "hard";
type BotRisk = "safe" | "normal" | "aggressive";
type RulesPreset = "official" | "fun";

export type CapitalModeKind = "official" | "custom";
export type CapitalStartOrderMode = "random" | "fixed" | "alternate" | "manual" | "bull";

export type CapitalContractID = CapitalContractId;

export type CapitalConfigPayload = {
  // ✅ Participants (profils + bots)
  players: number; // total slots (humains + bots)
  selectedIds: string[]; // ordre = ordre de jeu (si fixed) ; sinon ordre initial
  startOrderMode: CapitalStartOrderMode;
  startOrderApplied?: boolean;
  participantMode?: "players" | "teams";
  teamsSourceMode?: "manual" | "saved" | "auto";
  playersList?: any[];
  teams?: Array<{
    id: string;
    name: string;
    color?: string | null;
    logoDataUrl?: string | null;
    playerIds: string[];
    players: string[];
  }>;
  playerDartSets?: Record<string, string | null>;

  // Bots
  botsEnabled: boolean;
  botLevel: BotLevel;

  // ✅ Bots - comportement (ajout)
  botsAutoPlay?: boolean;
  botTurnDelayMs?: number; // délai avant action bot (visuel)
  botRisk?: BotRisk; // prise de risque / agressivité

  // Mode / Contrats
  mode: CapitalModeKind;
  gridVariant?: CapitalGridPresetId;
  savedVariantId?: string;
  savedVariantName?: string;
  committeeSpecialContract?: CapitalContractID;
  exactTarget?: number;
  shanghaiBonus?: number;
  packetAllowMultipliers?: boolean;
  customContracts?: CapitalContractID[];
  includeCapital?: boolean;

  // ✅ Custom - limite nombre de contrats (ajout)
  maxCustomContracts?: number;

  // Saisie
  inputMethod: ScoreInputMethod;

  // ✅ Victoire / tie-break
  victoryMode?: "best_after_contracts" | "first_to_target";
  targetScore?: number;
  tieBreaker?: "none" | "last_contract_total";

  // ✅ Règles
  failDivideBy2?: boolean; // true=officiel (/2), false=pas de /2
  startingCapital?: number; // si includeCapital=false, score initial

  // ✅ Timer (ajout)
  turnTimerSec?: number; // 0 = off
};

const OFFICIAL_CONTRACTS: CapitalContractID[] = CAPITAL_GRID_PRESETS.clubs15.contracts;

const INFO_TEXT = `CAPITAL — 4 CATÉGORIES

• CLUB : OFFICIEL, MIROIR et HÉRITAGE.
• BAR : DIAGONALE, PELUCHE, SHANGHAI, 42, ÉCONOME et À LA CARTE.
• NIVEAU : STANDARD (chiffres et contrats accessibles), CHALLENGER (chiffres et contrats difficiles), EXPERT (défis techniques seuls), LÉGENDES (tous les contrats).
• MON CAPITAL : créer, nommer, enregistrer, retrouver, modifier et supprimer ses propres variantes.
• Les appellations géographiques n'impliquent pas une homologation fédérale.

RÈGLES DU CAPITAL
3 fléchettes constituent le capital de départ. Chaque contrat réussi ajoute le score de la volée. En cas d'échec, le capital est divisé par 2 (réglage désactivable).
Exception Poubelle : 3 fléchettes PLANTÉES hors zone de score valident le contrat sans ajouter de point ni perdre de capital.

Saisies particulières :
- Diagonale : seul le BULL25 extérieur est accepté au milieu ; le DBULL50 est interdit.
- Couronne : saisir chaque fléchette avec S EXT activé.
- Poubelle : bouton HORS CIBLE, différent du MISS au sol.
- Mauvaise main : confirmer que les 3 fléchettes ont été lancées de la main non directrice.
- Score exact libre : renseigner un objectif entre 1 et 180.
Toutes les règles restent disponibles depuis le panneau d'information des contrats.`


const CAPITAL_OPTION_HELP: Record<string, string> = {
  botLevel: "Définit la précision générale des bots pendant leurs volées.",
  botsAutoPlay: "Activé : les bots jouent automatiquement leur tour. Désactivé : tu saisis leurs fléchettes manuellement.",
  botSpeed: "Règle le délai avant qu’un bot joue automatiquement. Cela ne change pas sa difficulté.",
  botRisk: "Prudente favorise la sécurité ; Agressive tente davantage de doubles, triples et gros scores.",
  startOrder: "ALÉATOIRE mélange une fois. ALTERNÉ conserve l’ordre de sélection. MANUEL et BULL ouvrent le tableau commun de choix d’ordre avant le jeu.",
  version: "Quatre catégories : CLUB, BAR, NIVEAU et MON CAPITAL. Dans MON CAPITAL, pars d’une grille, modifie-la et enregistre-la sous un nom pour la retrouver.",
  includeCapital: "Ajoute le contrat CAPITAL en première manche afin que chaque joueur construise son capital de départ avec 3 fléchettes.",
  maxContracts: "Limite les contrats personnalisés, sans compter le Capital de départ optionnel.",
  preset: "Classique conserve la règle de pénalité /2. Fun permet de jouer sans pénalité avec un score cible.",
  victory: "Meilleur score (Officiel) : la partie va au bout des contrats et le plus gros capital gagne. Score cible : le premier joueur qui atteint ou dépasse la cible gagne immédiatement.",
  target: "Score à atteindre ou dépasser pour gagner lorsque le mode Score cible est sélectionné.",
  tieBreak: "En cas d’égalité finale, compare le total réalisé sur le dernier contrat. Aucun conserve l’égalité.",
  failHalf: "Activé : un contrat raté divise le capital du joueur par 2, avec arrondi inférieur. C’est la règle officielle.",
  startingCapital: "Capital donné au départ lorsque le contrat CAPITAL initial est désactivé.",
  timer: "Temps disponible pour jouer une volée. Off désactive le chrono ; à expiration la volée est traitée comme trois MISS.",
  input: "Keypad ou cible : validation automatique des contrats grâce aux impacts. Score volée : saisis le total (0 à 180), puis confirme réussite/échec du contrat ; aucun secteur n’est inventé dans les statistiques.",
};

function capitalLibraryButtonStyle(primary: boolean): React.CSSProperties {
  return {
    borderRadius: 11, padding: "11px 8px", cursor: "pointer", fontSize: 11, fontWeight: 950,
    color: "#fff", border: primary ? "1px solid rgba(53,216,255,.65)" : "1px solid rgba(255,255,255,.23)",
    background: primary ? "rgba(53,216,255,.19)" : "rgba(255,255,255,.06)",
  };
}

function CapitalOptionCard({
  label,
  info,
  onInfo,
  children,
  stacked = false,
}: {
  label: string;
  info: string;
  onInfo: (title: string, content: string) => void;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={stacked ? "capital-option-row capital-option-stack" : "capital-option-row"}
      style={{
        display: "grid",
        gridTemplateColumns: stacked ? "1fr" : "minmax(0,1fr) auto",
        gap: stacked ? 8 : 10,
        alignItems: stacked ? "stretch" : "center",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ minWidth: 0, fontWeight: 900, fontSize: 12, lineHeight: 1.15, opacity: 0.95 }}>
          {label}
        </div>
        <InfoMini title={label} content={info} onOpen={onInfo} size={18} />
      </div>
      <div className="capital-option-control" style={{ minWidth: 0, width: stacked ? "100%" : "auto" }}>
        {children}
      </div>
    </div>
  );
}

function labelOf(id: CapitalContractID): string {
  const row = CAPITAL_CONTRACT_META[id];
  return row?.label || String(id);
}

function safeStoreProfiles(store: any): any[] {
  const profiles =
    store?.profiles ??
    store?.profilesStore?.profiles ??
    store?.profileStore?.profiles ??
    store?.profiles_v7 ??
    [];
  return Array.isArray(profiles) ? profiles : [];
}

function safeActiveProfileId(store: any): string | null {
  const id =
    store?.activeProfileId ??
    store?.profilesStore?.activeProfileId ??
    store?.profileStore?.activeProfileId ??
    store?.activeProfile?.id ??
    null;
  return id ? String(id) : null;
}

function safeCustomBotsProfiles(): any[] {
  try {
    return loadBotPlayers().map((b: any) => ({
      ...b,
      id: String(b.id),
      name: String(b?.name || "BOT"),
      nickname: String(b?.name || "BOT"),
      avatarDataUrl: b?.avatarDataUrl || b?.avatarUrl || b?.avatar || null,
      avatarUrl: b?.avatarUrl || b?.avatar || null,
      avatar: b?.avatar || b?.avatarUrl || b?.avatarDataUrl || null,
      isBot: true,
      botKind: "custom",
      botLevel: b?.botLevel ?? b?.level ?? undefined,
    }));
  } catch {
    return [];
  }
}

function uniqIds(list: string[]) {
  const out: string[] = [];
  const set = new Set<string>();
  for (const id of list) {
    const k = String(id || "");
    if (!k || set.has(k)) continue;
    set.add(k);
    out.push(k);
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function shuffleCopy<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export default function CapitalConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  const store = props?.store;
  const go = props?.go || props?.setTab;
  const restoredConfig: Partial<CapitalConfigPayload> = props?.params?.config || {};
  const useCanonicalParticipants = true;
  const [viewMode, setViewMode] = useState<"guided" | "complete">("guided");
  const [guidedStep, setGuidedStep] = useState<0 | 1 | 2 | 3>(0);
  const [configError, setConfigError] = useState("");
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

  const activeProfileId = useMemo(() => safeActiveProfileId(store), [store]);
  const locals = useMemo(
    () => sortProfilesByModeUsage(safeStoreProfiles(store).filter((p: any) => !p?.isBot), "capital", activeProfileId),
    [store, activeProfileId]
  );
  const activeProfile = useMemo(
    () => locals.find((p: any) => p.id === activeProfileId) || locals[0] || null,
    [locals, activeProfileId]
  );

  // Bots pool = PRO_BOTS + bots custom (dc_bots_v1)
  const proBots = useMemo(
    () =>
      PRO_BOTS.map((b) => {
        const p: any = proBotToProfile(b) as any;
        // Inject avatarDataUrl pour que ProfileAvatar affiche l'image (comme les autres menus)
        p.avatarDataUrl = getProBotAvatar((b as any).avatarKey);
        // compat: certains écrans utilisent id "bot_*"
        p.legacyId = `bot_${String((b as any).id)}`;
        return p;
      }),
    []
  );
  const customBots = useMemo(() => safeCustomBotsProfiles(), []);
  const allBots = useMemo(() => {
    const all = [...proBots, ...customBots];
    const m = new Map<string, any>();
    for (const b of all) {
      const id = String(b?.id || "");
      if (!id) continue;
      if (!m.has(id)) m.set(id, b);
    }
    return Array.from(m.values());
  }, [proBots, customBots]);

  const [canonicalSelection, setCanonicalSelection] = useState<CapitalParticipantSelection | null>(null);
  const handleCanonicalSelection = React.useCallback((selection: CapitalParticipantSelection) => {
    setCanonicalSelection(selection);
    if (selection.valid) setConfigError("");
  }, []);

  // ------------------ Config core ------------------
  const [players, setPlayers] = useState<number>(typeof restoredConfig.players === "number" ? restoredConfig.players : 2);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(restoredConfig.botsEnabled === true);
  const [botLevel, setBotLevel] = useState<BotLevel>(restoredConfig.botLevel || "normal");

  // ✅ Ajout : presets de règles (remplit automatiquement les toggles)
  const [rulesPreset, setRulesPreset] = useState<RulesPreset>("official");

  // ✅ Ajout : bots comportement
  const [botsAutoPlay, setBotsAutoPlay] = useState<boolean>(restoredConfig.botsAutoPlay !== false);
  const [botTurnDelayMs, setBotTurnDelayMs] = useState<number>(restoredConfig.botTurnDelayMs ?? 650);
  const [botRisk, setBotRisk] = useState<BotRisk>(restoredConfig.botRisk || "normal");

  const [startOrderMode, setStartOrderMode] =
    useState<CapitalStartOrderMode>(restoredConfig.startOrderMode || "random");

  // ✅ Ajout : timer par tour
  const [turnTimerSec, setTurnTimerSec] = useState<number>(restoredConfig.turnTimerSec ?? 0);

  const [inputMethod, setInputMethod] = useState<ScoreInputMethod>(() => {
    try {
      const v = (restoredConfig.inputMethod || localStorage.getItem(SCORE_INPUT_LS_KEY) || "keypad") as any;
      return (["keypad", "dartboard", "presets", "visit_score"].includes(v) ? v : "keypad") as any;
    } catch {
      return "keypad";
    }
  });

  // ------------------ Participants (humans + bots) ------------------
  const [selectedHumanIds, setSelectedHumanIds] = useState<string[]>(() => {
    if (activeProfile?.id) return [String(activeProfile.id)];
    if (locals?.[0]?.id) return [String(locals[0].id)];
    return [];
  });
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);

  const selectedIds = useMemo(() => {
    const base = [...selectedHumanIds, ...(botsEnabled ? selectedBotIds : [])];
    return uniqIds(base).slice(0, clamp(players, 1, 12));
  }, [selectedHumanIds, selectedBotIds, botsEnabled, players]);

  // Keep "players" consistent with selection
  React.useEffect(() => {
    const min = Math.max(1, selectedIds.length || 1);
    if (players < min) setPlayers(min);
  }, [selectedIds, players]);

  // When players changes, trim bots/humans if needed
  React.useEffect(() => {
    const max = clamp(players, 1, 12);
    const total = uniqIds([...selectedHumanIds, ...(botsEnabled ? selectedBotIds : [])]);
    if (total.length <= max) return;

    const keepHumans = selectedHumanIds.slice(
      0,
      Math.max(1, Math.min(selectedHumanIds.length, max))
    );
    const roomForBots = Math.max(0, max - keepHumans.length);
    const keepBots = (botsEnabled ? selectedBotIds : []).slice(0, roomForBots);

    setSelectedHumanIds(keepHumans);
    setSelectedBotIds(keepBots);
  }, [players, botsEnabled, selectedHumanIds, selectedBotIds]);

  // ------------------ Mode / Contrats ------------------
  const [mode, setMode] = useState<CapitalModeKind>(restoredConfig.mode || "official");
  const [gridVariant, setGridVariant] = useState<CapitalGridPresetId>(
    canonicalCapitalGridPreset(restoredConfig.gridVariant)
  );
  const [committeeSpecialContract, setCommitteeSpecialContract] = useState<CapitalContractID>(
    restoredConfig.committeeSpecialContract && CAPITAL_COMMITTEE_REPLACEMENTS.includes(restoredConfig.committeeSpecialContract)
      ? restoredConfig.committeeSpecialContract : "exact_69"
  );
  const activeGridContracts = useMemo(
    () => capitalPresetContracts(gridVariant, committeeSpecialContract), [gridVariant, committeeSpecialContract]
  );
  const customWasInitialized = React.useRef(restoredConfig.mode === "custom");
  // Trois catégories de grilles + MON CAPITAL pour les variantes enregistrées.
  const selectedVariant: CapitalGridPresetId | "custom" = mode === "custom" ? "custom" : gridVariant;
  const selectedCategory = mode === "custom" ? "custom" : CAPITAL_GRID_PRESETS[gridVariant].category;
  const selectedPresetGroup = CAPITAL_PRESET_GROUPS.find(group => group.category === selectedCategory);
  const handleCategoryChange = (category: typeof selectedCategory) => {
    if (category === "custom") {
      handleVariantChange("custom");
      return;
    }
    const group = CAPITAL_PRESET_GROUPS.find(item => item.category === category);
    if (!group) return;
    // Une variante déjà sélectionnée dans la catégorie ne doit pas être réinitialisée.
    const next = group.contracts.includes(gridVariant) ? gridVariant : group.contracts[0];
    handleVariantChange(next);
  };
  const handleVariantChange = (value: CapitalGridPresetId | "custom") => {
    setConfigError("");
    if (value === "custom") {
      if (!customWasInitialized.current) {
        const base = capitalPresetContracts(gridVariant, committeeSpecialContract).filter(id => id !== "capital");
        setCustomContracts(base);
        setMaxCustomContracts(Math.max(15, base.length));
        setIncludeCapital(true);
        customWasInitialized.current = true;
      }
      setMode("custom");
      return;
    }
    setGridVariant(canonicalCapitalGridPreset(value));
    setMode("official");
  };
  const [includeCapital, setIncludeCapital] = useState<boolean>(restoredConfig.includeCapital !== false);

  // ✅ Ajout : limite du nombre de contrats (custom)
  const [maxCustomContracts, setMaxCustomContracts] = useState<number>(restoredConfig.maxCustomContracts ?? 15);

  // ------------------ Victoire / règles ------------------
  const [victoryMode, setVictoryMode] = useState<
    "best_after_contracts" | "first_to_target"
  >(restoredConfig.victoryMode || "best_after_contracts");
  const [targetScore, setTargetScore] = useState<number>(restoredConfig.targetScore ?? 700);
  const [tieBreaker, setTieBreaker] = useState<"none" | "last_contract_total">(
    restoredConfig.tieBreaker || "last_contract_total"
  );
  const [failDivideBy2, setFailDivideBy2] = useState<boolean>(restoredConfig.failDivideBy2 !== false);
  const [startingCapital, setStartingCapital] = useState<number>(restoredConfig.startingCapital ?? 301);
  const [exactTarget, setExactTarget] = useState<number>(restoredConfig.exactTarget ?? 42);
  const [shanghaiBonus, setShanghaiBonus] = useState<number>(restoredConfig.shanghaiBonus ?? 0);
  const [packetAllowMultipliers, setPacketAllowMultipliers] = useState<boolean>(restoredConfig.packetAllowMultipliers === true);

  const [customContracts, setCustomContracts] = useState<CapitalContractID[]>(() => Array.isArray(restoredConfig.customContracts) && restoredConfig.customContracts.length ? restoredConfig.customContracts.filter((id) => id !== "capital") : [
    "n20",
    "triple_any",
    "n19",
    "double_any",
    "n18",
    "side",
    "n17",
    "suite",
    "n16",
    "colors_3",
    "n15",
    "exact_57",
    "n14",
    "center",
    "peluche",
  ]);

  // MON CAPITAL : stockage durable dans la bibliothèque locale (distinct de l'Historique V4).
  const [savedVariants, setSavedVariants] = useState<CapitalSavedVariant[]>(loadCapitalSavedVariants);
  const [savedVariantId, setSavedVariantId] = useState<string>(restoredConfig.savedVariantId || "");
  const [savedVariantName, setSavedVariantName] = useState<string>(restoredConfig.savedVariantName || "");
  const [savedNotice, setSavedNotice] = useState<string>("");

  const restoredPresetRef = React.useRef(Boolean(props?.params?.config));

  // ✅ Presets : applique des defaults sans empêcher l'édition
  React.useEffect(() => {
    if (restoredPresetRef.current) {
      restoredPresetRef.current = false;
      return;
    }
    if (rulesPreset === "official") {
      setVictoryMode("best_after_contracts");
      setTieBreaker("last_contract_total");
      setFailDivideBy2(true);
      setIncludeCapital(true);
      // timer OFF par défaut en officiel
    } else if (rulesPreset === "fun") {
      setVictoryMode("first_to_target");
      setTargetScore((v) => (v ? v : 700));
      setTieBreaker("none");
      setFailDivideBy2(false);
      // laisse includeCapital tel quel, fun = liberté
    }
  }, [rulesPreset]);

  const customList = useMemo<CapitalContractID[]>(() => {
    let out = [...customContracts].slice(0, clamp(maxCustomContracts, 1, 30));
    if (includeCapital) {
      out = out.filter((x) => x !== "capital");
      out.unshift("capital");
    } else {
      out = out.filter((x) => x !== "capital");
    }
    return out;
  }, [customContracts, includeCapital, maxCustomContracts]);

  const selectedSavedVariant = savedVariants.find((item) => item.id === savedVariantId);
  const appliedVariantMatches = !!selectedSavedVariant &&
    selectedSavedVariant.name === savedVariantName.trim() &&
    selectedSavedVariant.basePreset === gridVariant &&
    JSON.stringify(selectedSavedVariant.contracts) === JSON.stringify(customList.filter(id => id !== "capital")) &&
    selectedSavedVariant.includeCapital === includeCapital &&
    selectedSavedVariant.maxCustomContracts === maxCustomContracts &&
    selectedSavedVariant.exactTarget === exactTarget &&
    selectedSavedVariant.shanghaiBonus === shanghaiBonus &&
    selectedSavedVariant.packetAllowMultipliers === packetAllowMultipliers &&
    selectedSavedVariant.failDivideBy2 === failDivideBy2 &&
    selectedSavedVariant.startingCapital === startingCapital &&
    selectedSavedVariant.victoryMode === victoryMode &&
    selectedSavedVariant.targetScore === targetScore &&
    selectedSavedVariant.tieBreaker === tieBreaker &&
    selectedSavedVariant.committeeSpecialContract === (gridVariant === "committee_other17" ? committeeSpecialContract : undefined);

  const loadNamedVariant = (id: string) => {
    const item = savedVariants.find(entry => entry.id === id);
    if (!item) return;
    setMode("custom");
    customWasInitialized.current = true;
    setGridVariant(item.basePreset);
    setCustomContracts([...item.contracts]);
    setMaxCustomContracts(item.maxCustomContracts);
    setIncludeCapital(item.includeCapital);
    setExactTarget(item.exactTarget);
    setShanghaiBonus(item.shanghaiBonus);
    setPacketAllowMultipliers(item.packetAllowMultipliers);
    setFailDivideBy2(item.failDivideBy2);
    setStartingCapital(item.startingCapital);
    setVictoryMode(item.victoryMode);
    setTargetScore(item.targetScore);
    setTieBreaker(item.tieBreaker);
    if (item.committeeSpecialContract) setCommitteeSpecialContract(item.committeeSpecialContract);
    setSavedVariantId(item.id);
    setSavedVariantName(item.name);
    setSavedNotice(`« ${item.name} » chargée. Tu peux la jouer ou la modifier.`);
    setConfigError("");
  };

  const resetNamedVariantFromBase = () => {
    const from = capitalPresetContracts(gridVariant, committeeSpecialContract);
    setCustomContracts(from.filter(id => id !== "capital"));
    setMaxCustomContracts(Math.min(30, Math.max(15, from.length)));
    setIncludeCapital(from.includes("capital"));
    setSavedVariantId("");
    setSavedVariantName("");
    setSavedNotice("Nouvelle grille à personnaliser. Nomme-la puis enregistre-la.");
  };

  const saveNamedVariant = (asNew = false) => {
    const name = savedVariantName.trim();
    if (!name || name.length > 48) {
      setSavedNotice("Saisis un nom de 1 à 48 caractères avant d’enregistrer.");
      return;
    }
    if (customList.filter(id => id !== "capital").length === 0) {
      setSavedNotice("Ajoute au moins un contrat avant d’enregistrer.");
      return;
    }
    if (customList.includes("exact_custom") && !capitalExactScorePossible(exactTarget)) {
      setSavedNotice("Le score exact libre n’est pas réalisable : corrige-le avant l’enregistrement.");
      return;
    }
    const updating = !asNew && selectedSavedVariant;
    const duplicate = savedVariants.find(item => item.id !== (updating ? selectedSavedVariant.id : "") && item.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"));
    if (duplicate) {
      setSavedNotice("Ce nom existe déjà. Choisis un autre nom ou charge la variante existante.");
      return;
    }
    if (!updating && savedVariants.length >= 100) {
      setSavedNotice("Limite de 100 variantes personnelles atteinte. Supprime une ancienne variante.");
      return;
    }
    const now = Date.now();
    const item: CapitalSavedVariant = {
      id: updating ? selectedSavedVariant.id : `capital_${now}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      basePreset: gridVariant,
      contracts: customList.filter(id => id !== "capital"),
      includeCapital,
      maxCustomContracts: Math.max(maxCustomContracts, customList.length - (includeCapital ? 1 : 0)),
      exactTarget, shanghaiBonus, packetAllowMultipliers,
      failDivideBy2, startingCapital, victoryMode, targetScore, tieBreaker,
      committeeSpecialContract: gridVariant === "committee_other17" ? committeeSpecialContract : undefined,
      createdAt: updating ? selectedSavedVariant.createdAt : now,
      updatedAt: now,
    };
    const next = updating ? savedVariants.map(entry => entry.id === item.id ? item : entry) : [...savedVariants, item];
    if (!persistCapitalSavedVariants(next)) {
      setSavedNotice("Enregistrement impossible : stockage local indisponible ou saturé. Aucune variante n’a été supprimée.");
      return;
    }
    setSavedVariants(next);
    setSavedVariantId(item.id);
    setSavedVariantName(item.name);
    setSavedNotice(`« ${item.name} » enregistrée dans MON CAPITAL.`);
    setConfigError("");
  };

  const deleteNamedVariant = () => {
    if (!selectedSavedVariant) return;
    if (!window.confirm(`Supprimer définitivement « ${selectedSavedVariant.name} » de MON CAPITAL ?`)) return;
    const next = savedVariants.filter(item => item.id !== selectedSavedVariant.id);
    if (!persistCapitalSavedVariants(next)) {
      setSavedNotice("Suppression impossible : stockage local indisponible.");
      return;
    }
    setSavedVariants(next);
    setSavedVariantId("");
    setSavedVariantName("");
    setSavedNotice("Variante supprimée de MON CAPITAL ; la grille courante reste jouable.");
  };

  const payload: CapitalConfigPayload = useMemo(() => {
    const cappedPlayers = clamp(players, 1, 12);
    const canonicalIds = canonicalSelection?.selectedIds || [];
    const canonicalBotsEnabled = canonicalSelection?.botsEnabled || false;
    const cfg: CapitalConfigPayload = {
      players: useCanonicalParticipants ? canonicalIds.length : cappedPlayers,
      selectedIds: useCanonicalParticipants ? canonicalIds : selectedIds,
      startOrderMode,
      startOrderApplied: false,
      participantMode: canonicalSelection?.participantMode || "players",
      teamsSourceMode: canonicalSelection?.teamsSourceMode,
      playersList: canonicalSelection?.playersList || [],
      teams: canonicalSelection?.teams || [],
      playerDartSets: canonicalSelection?.playerDartSets || {},
      botsEnabled: useCanonicalParticipants ? canonicalBotsEnabled : botsEnabled,
      botLevel,

      botsAutoPlay: (useCanonicalParticipants ? canonicalBotsEnabled : botsEnabled) ? botsAutoPlay : undefined,
      botTurnDelayMs: (useCanonicalParticipants ? canonicalBotsEnabled : botsEnabled) ? clamp(botTurnDelayMs, 0, 6000) : undefined,
      botRisk: (useCanonicalParticipants ? canonicalBotsEnabled : botsEnabled) ? botRisk : undefined,

      mode,
      gridVariant,
      savedVariantId: mode === "custom" && appliedVariantMatches ? savedVariantId : undefined,
      savedVariantName: mode === "custom" ? (savedVariantName.trim() || undefined) : undefined,
      committeeSpecialContract: gridVariant === "committee_other17" ? committeeSpecialContract : undefined,
      exactTarget: clamp(exactTarget, 1, 180),
      shanghaiBonus: clamp(shanghaiBonus, 0, 500),
      packetAllowMultipliers,
      includeCapital,
      maxCustomContracts: mode === "custom" ? clamp(maxCustomContracts, 1, 30) : undefined,
      customContracts: mode === "official" ? activeGridContracts : customList,

      inputMethod,

      victoryMode,
      targetScore:
        victoryMode === "first_to_target" ? clamp(targetScore, 50, 5000) : undefined,
      tieBreaker,

      failDivideBy2,
      startingCapital: includeCapital ? undefined : clamp(startingCapital, 0, 5000),

      turnTimerSec: clamp(turnTimerSec, 0, 120),
    };

    return cfg;
  }, [
    players,
    selectedIds,
    canonicalSelection,
    startOrderMode,
    botsEnabled,
    botLevel,
    botsAutoPlay,
    botTurnDelayMs,
    botRisk,
    mode,
    gridVariant,
    savedVariantId,
    savedVariantName,
    appliedVariantMatches,
    activeGridContracts,
    committeeSpecialContract,
    exactTarget,
    shanghaiBonus,
    packetAllowMultipliers,
    includeCapital,
    maxCustomContracts,
    customList,
    inputMethod,
    victoryMode,
    targetScore,
    tieBreaker,
    failDivideBy2,
    startingCapital,
    turnTimerSec,
  ]);

  // ------------------ UI helpers ------------------
  function goBack() {
    if (go) return go(props?.params?.returnTab || "games");
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    const playedContracts = mode === "official" ? activeGridContracts : customList;
    if (playedContracts.includes("exact_custom") && !capitalExactScorePossible(exactTarget)) {
      setConfigError("Le score exact choisi n’est pas réalisable avec 3 fléchettes. Choisis un autre objectif (1 à 180).");
      return;
    }
    if (useCanonicalParticipants && !canonicalSelection?.valid) {
      setConfigError(canonicalSelection?.error || "Sélectionne au moins deux participants.");
      setViewMode("guided");
      setGuidedStep(0);
      return;
    }
    try {
      localStorage.setItem(SCORE_INPUT_LS_KEY, inputMethod);
    } catch {}
    const cfg: any = { ...payload };
    if (cfg.startOrderMode === "random") {
      if (cfg.participantMode === "teams" && Array.isArray(cfg.teams) && cfg.teams.length) {
        const shuffledTeams = shuffleCopy(cfg.teams).map((team: any) => ({
          ...team,
          players: shuffleCopy(team.players || team.playerIds || []),
        }));
        const maximum = Math.max(0, ...shuffledTeams.map((team: any) => team.players.length));
        const ordered: string[] = [];
        for (let memberIndex = 0; memberIndex < maximum; memberIndex += 1) {
          shuffledTeams.forEach((team: any) => {
            if (team.players[memberIndex]) ordered.push(String(team.players[memberIndex]));
          });
        }
        cfg.selectedIds = ordered;
      } else {
        cfg.selectedIds = shuffleCopy(cfg.selectedIds);
      }
    }
    cfg.playersList = cfg.selectedIds
      .map((id: string) => (cfg.playersList || []).find((player: any) => String(player.id) === String(id)))
      .filter(Boolean);
    cfg.players = cfg.selectedIds.length;
    cfg.startOrderApplied = true;
    try { recordProfileUsageForMode("capital", cfg.selectedIds || selectedIds); } catch {}
    if (props?.setTab) return props.setTab("capital_play", { config: cfg });
    if (go) return go("capital_play", { config: cfg });
  }

  // available humans/bots to add
  const availableHumans = useMemo(() => {
    const used = new Set(selectedHumanIds);
    return (locals || []).filter((p: any) => p?.id && !used.has(String(p.id)));
  }, [locals, selectedHumanIds]);

  const availableBots = useMemo(() => {
    const used = new Set(selectedBotIds);
    return (allBots || []).filter((b: any) => b?.id && !used.has(String(b.id)));
  }, [allBots, selectedBotIds]);

  const [addHumanPick, setAddHumanPick] = useState<string>(() =>
    String(availableHumans?.[0]?.id || "")
  );
  const [addBotPick, setAddBotPick] = useState<string>(() =>
    String(availableBots?.[0]?.id || "")
  );

  React.useEffect(() => {
    if (!addHumanPick && availableHumans?.[0]?.id) setAddHumanPick(String(availableHumans[0].id));
  }, [availableHumans, addHumanPick]);

  React.useEffect(() => {
    if (!addBotPick && availableBots?.[0]?.id) setAddBotPick(String(availableBots[0].id));
  }, [availableBots, addBotPick]);

  // Resolve id -> profile/bot object for display
  const idToEntity = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of locals) m.set(String(p.id), p);
    for (const b of allBots) m.set(String(b.id), b);
    return m;
  }, [locals, allBots]);

  // ------- contracts add pool -------
  const availableToAdd = useMemo(() => {
    const used = new Set(customList);
    const pool: CapitalContractID[] = CAPITAL_SELECTABLE_CONTRACTS;
    return pool.filter((id) => !used.has(id));
  }, [customList]);

  const [addPick, setAddPick] = useState<CapitalContractID>("n20");

  React.useEffect(() => {
    if (availableToAdd.length === 0) return;
    if (!availableToAdd.includes(addPick)) setAddPick(availableToAdd[0]);
  }, [availableToAdd, addPick]);

  // --------- styles helpers ----------
  const ring = theme?.primary || "rgba(255,198,58,0.55)";
  const cardBorder = "1px solid rgba(255,255,255,0.10)";
  const cardBg = "rgba(255,255,255,0.04)";
  const accent = theme?.primary || "#42d6ff";
  const showParticipants = viewMode === "complete" || guidedStep === 0;
  const showMode = viewMode === "complete" || guidedStep === 1;
  const showOptions = viewMode === "complete" || guidedStep === 2;
  const showRecap = viewMode === "complete" || guidedStep === 3;
  const canStart = !useCanonicalParticipants || Boolean(canonicalSelection?.valid);
  const pillStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 14,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.12)"}`,
    background: active ? `${accent}22` : "rgba(255,255,255,.04)",
    color: active ? "#fff" : "#aeb3c7",
    padding: "11px 12px",
    fontWeight: 950,
  });
  const openOptionInfo = (title: string, content: string) => setInfoModal({ title, content });

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        difficultyGameId="capital"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      <style>{`
        .capital-option-row + .capital-option-row { margin-top: 8px; }
        .capital-option-control select {
          max-width: min(52vw, 290px);
          font-size: 12px !important;
          font-weight: 850 !important;
          line-height: 1.15;
        }
        .capital-option-stack .capital-option-control select {
          width: 100%;
          max-width: 100%;
          min-width: 0 !important;
        }
        @media (max-width: 430px) {
          .capital-option-control select {
            max-width: 48vw;
            padding: 9px 10px !important;
          }
          .capital-option-stack .capital-option-control select { max-width: 100%; }
        }
      `}</style>

      {infoModal ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setInfoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,.72)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(520px, 94vw)",
              borderRadius: 18,
              border: `1px solid ${accent}88`,
              background: "linear-gradient(180deg, rgba(8,20,29,.98), rgba(4,10,16,.98))",
              boxShadow: `0 0 28px ${accent}30, 0 24px 80px rgba(0,0,0,.65)`,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: accent, fontSize: 14, fontWeight: 1000 }}>{infoModal.title}</div>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: `1px solid ${accent}88`,
                  background: `${accent}18`,
                  color: accent,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, opacity: .9, whiteSpace: "pre-wrap" }}>
              {infoModal.content}
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" onClick={() => setViewMode("guided")} style={pillStyle(viewMode === "guided")}>Configuration guidée</button>
          <button type="button" onClick={() => setViewMode("complete")} style={pillStyle(viewMode === "complete")}>Configuration complète</button>
        </div>
        {viewMode === "guided" ? (
          <div style={{ marginTop: 10, padding: 11, borderRadius: 15, background: `${accent}10`, border: `1px solid ${accent}38` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 950 }}>
              <span style={{ color: accent }}>Étape {guidedStep + 1}/4</span>
              <span>{["Participants", "Contrats", "Options", "Récapitulatif"][guidedStep]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5, marginTop: 8 }}>
              {[0, 1, 2, 3].map((step) => <div key={step} style={{ height: 4, borderRadius: 999, background: step <= guidedStep ? accent : "rgba(255,255,255,.10)" }} />)}
            </div>
          </div>
        ) : null}
      </div>

      {showParticipants ? (
        <>
          <CapitalParticipantsX01
            humans={locals}
            bots={allBots}
            accent={accent}
            accentSoft={`${accent}20`}
            initialSelectedIds={Array.isArray(restoredConfig.selectedIds) && restoredConfig.selectedIds.length ? restoredConfig.selectedIds : activeProfile?.id ? [String(activeProfile.id)] : []}
            initialConfig={restoredConfig}
            onChange={handleCanonicalSelection}
          />
          {canonicalSelection?.botsEnabled ? (
            <Section title="Comportement des bots">
              <CapitalOptionCard label="Niveau bots" info={CAPITAL_OPTION_HELP.botLevel} onInfo={openOptionInfo}><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></CapitalOptionCard>
              <CapitalOptionCard label="Bots auto-play" info={CAPITAL_OPTION_HELP.botsAutoPlay} onInfo={openOptionInfo}><OptionToggle value={botsAutoPlay} onChange={setBotsAutoPlay} /></CapitalOptionCard>
              <CapitalOptionCard label="Vitesse bots" info={CAPITAL_OPTION_HELP.botSpeed} onInfo={openOptionInfo}><OptionSelect value={botTurnDelayMs} options={[{ value: 250, label: "Très rapide" }, { value: 450, label: "Rapide" }, { value: 650, label: "Normal" }, { value: 900, label: "Lent" }, { value: 1300, label: "Très lent" }]} onChange={(value: any) => setBotTurnDelayMs(Number(value))} /></CapitalOptionCard>
              <CapitalOptionCard label="Prise de risque" info={CAPITAL_OPTION_HELP.botRisk} onInfo={openOptionInfo}><OptionSelect value={botRisk} options={[{ value: "safe", label: "Prudente" }, { value: "normal", label: "Normale" }, { value: "aggressive", label: "Agressive" }]} onChange={(value: any) => setBotRisk(value)} /></CapitalOptionCard>
            </Section>
          ) : null}
          <Section title="Départ">
            <NativeStartOrderConfig
              initialMode={(startOrderMode === "fixed" ? "alternate" : startOrderMode) as NativeStartOrderMode}
              onModeChange={(value) => setStartOrderMode(value === "alternate" ? "fixed" : value)}
            />
          </Section>
        </>
      ) : null}

      {/* ============================= */}
      {/* PARTICIPANTS */}
      {/* ============================= */}
      {!useCanonicalParticipants ? <>
      <Section title="Participants">
        <OptionRow
          label={t("config.playerCount", "Nombre de joueurs (total)")}
          hint="Humains + bots"
        >
          <OptionSelect
            value={players}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
            onChange={setPlayers}
          />
        </OptionRow>

        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
          Profils locaux
        </div>

        <div
          className="dc-scroll-thin"
          style={{
            marginTop: 10,
            display: "flex",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 10,
            paddingLeft: 6,
            paddingRight: 6,
          }}
        >
          {(locals || []).map((p: any) => {
            const id = String(p.id);
            const selected = selectedHumanIds.includes(id);
            const locked = id === String(activeProfile?.id || "");
            return (
              <button
                key={id}
                type="button"
                title={p?.name || "Joueur"}
                onClick={() => {
                  setSelectedHumanIds((prev) => {
                    const exists = prev.includes(id);
                    if (exists) {
                      if (prev.length === 1) return prev; // jamais 0
                      if (locked) return prev; // actif verrouillé
                      return prev.filter((x) => x !== id);
                    }
                    if (
                      uniqIds([...prev, ...(botsEnabled ? selectedBotIds : [])]).length >=
                      players
                    )
                      return prev;
                    return [...prev, id];
                  });
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  flex: "0 0 auto",
                  width: 86,
                }}
              >
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: "50%",
                    position: "relative",
                    margin: "0 auto",
                  }}
                >
                  {selected && (
                    <div
                      style={{
                        position: "absolute",
                        inset: -10,
                        borderRadius: "50%",
                        background:
                          "conic-gradient(from 180deg, rgba(255,198,58,0), rgba(255,198,58,.40), rgba(255,79,216,.22), rgba(255,198,58,0))",
                        filter: "blur(12px)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: selected ? `1px solid ${ring}` : "1px solid rgba(255,255,255,0.12)",
                      background: "#111320",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      filter: selected ? "none" : "grayscale(100%) brightness(0.55)",
                      opacity: selected ? 1 : 0.65,
                      transition: "filter .2s ease, opacity .2s ease",
                    }}
                  >
                    <ProfileAvatar profile={p} size={78} showStars={false} />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 900,
                    textAlign: "center",
                    color: selected ? "#f6f2e9" : "#7e8299",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p?.nickname || p?.name || "Joueur"}
                  {locked ? <span style={{ marginLeft: 6, opacity: 0.75 }}>★</span> : null}
                </div>
              </button>
            );
          })}
        </div>

        {availableHumans.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <OptionSelect
                value={addHumanPick}
                options={availableHumans.map((p: any) => ({
                  value: String(p.id),
                  label: p.nickname ?? p.name ?? "Joueur",
                }))}
                onChange={(v) => setAddHumanPick(String(v))}
              />
            </div>
            <button
              onClick={() => {
                if (!addHumanPick) return;
                setSelectedHumanIds((prev) => {
                  if (prev.includes(addHumanPick)) return prev;
                  if (
                    uniqIds([...prev, addHumanPick, ...(botsEnabled ? selectedBotIds : [])])
                      .length > players
                  )
                    return prev;
                  return [...prev, addHumanPick];
                });
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                fontWeight: 1000,
              }}
            >
              + Ajouter
            </button>
          </div>
        )}
      </Section>

      {/* ============================= */}
      {/* BOTS */}
      {/* ============================= */}
      <Section title="Bots IA">
        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
          <>
            <OptionRow label={t("config.botLevel", "Niveau bots")}>
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

            {/* ✅ Ajout : comportement bots */}
            <OptionRow label="Bots auto-play (jouent tout seuls)">
              <OptionToggle value={botsAutoPlay} onChange={setBotsAutoPlay} />
            </OptionRow>

            <OptionRow label="Vitesse bots">
              <OptionSelect
                value={botTurnDelayMs}
                options={[
                  { value: 250, label: "Très rapide" },
                  { value: 450, label: "Rapide" },
                  { value: 650, label: "Normal" },
                  { value: 900, label: "Lent" },
                  { value: 1300, label: "Très lent" },
                ]}
                onChange={(v: any) => setBotTurnDelayMs(Number(v))}
              />
            </OptionRow>

            <OptionRow label="Prise de risque bots">
              <OptionSelect
                value={botRisk}
                options={[
                  { value: "safe", label: "Safe" },
                  { value: "normal", label: "Normal" },
                  { value: "aggressive", label: "Aggressive" },
                ]}
                onChange={(v: any) => setBotRisk(v)}
              />
            </OptionRow>

            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
              Bots disponibles
            </div>

            <div
              className="dc-scroll-thin"
              style={{
                marginTop: 10,
                display: "flex",
                gap: 14,
                overflowX: "auto",
                paddingBottom: 10,
                paddingLeft: 6,
                paddingRight: 6,
              }}
            >
              {(allBots || []).map((b: any) => {
                const id = String(b.id);
                const selected = selectedBotIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    title={b?.name || "BOT"}
                    onClick={() => {
                      setSelectedBotIds((prev) => {
                        const exists = prev.includes(id);
                        if (exists) return prev.filter((x) => x !== id);
                        if (uniqIds([...selectedHumanIds, ...prev, id]).length > players) return prev;
                        return [...prev, id];
                      });
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      flex: "0 0 auto",
                      width: 86,
                    }}
                  >
                    <div
                      style={{
                        width: 78,
                        height: 78,
                        borderRadius: "50%",
                        position: "relative",
                        margin: "0 auto",
                      }}
                    >
                      {selected && (
                        <div
                          style={{
                            position: "absolute",
                            inset: -10,
                            borderRadius: "50%",
                            background:
                              "conic-gradient(from 180deg, rgba(255,198,58,0), rgba(255,198,58,.35), rgba(80,160,255,.22), rgba(255,198,58,0))",
                            filter: "blur(12px)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: selected ? `1px solid ${ring}` : "1px solid rgba(255,255,255,0.12)",
                          background: "#111320",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          filter: selected ? "none" : "grayscale(100%) brightness(0.55)",
                          opacity: selected ? 1 : 0.65,
                          transition: "filter .2s ease, opacity .2s ease",
                        }}
                      >
                        <ProfileAvatar profile={b} size={78} showStars={false} />
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 900,
                        textAlign: "center",
                        color: selected ? "#f6f2e9" : "#7e8299",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b?.nickname || b?.name || "BOT"}
                    </div>
                  </button>
                );
              })}
            </div>

            {availableBots.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <OptionSelect
                    value={addBotPick}
                    options={availableBots.map((b: any) => ({
                      value: String(b.id),
                      label: b.nickname ?? b.name ?? "BOT",
                    }))}
                    onChange={(v) => setAddBotPick(String(v))}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!addBotPick) return;
                    setSelectedBotIds((prev) => {
                      if (prev.includes(addBotPick)) return prev;
                      if (uniqIds([...selectedHumanIds, ...prev, addBotPick]).length > players) return prev;
                      return [...prev, addBotPick];
                    });
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)",
                    fontWeight: 1000,
                  }}
                >
                  + Ajouter
                </button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ============================= */}
      {/* DÉPART */}
      {/* ============================= */}
      <Section title="Départ">
        <OptionRow label="Ordre de départ">
          <OptionSelect
            value={startOrderMode}
            options={[
              { value: "random", label: "Aléatoire" },
              { value: "fixed", label: "Alterné / sélection" },
              { value: "manual", label: "Manuel" },
              { value: "bull", label: "Bull" },
            ]}
            onChange={(v) => setStartOrderMode(v)}
          />
        </OptionRow>

        {startOrderMode === "fixed" && (
          <>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Réorganise l’ordre (glisser-déposer ou ↑ ↓). {selectedIds.length} participant(s).
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {selectedIds.map((id, idx) => {
                const ent = idToEntity.get(String(id));
                const name = ent?.nickname ?? ent?.name ?? "Joueur";
                const isLocked = String(id) === String(activeProfile?.id || "");
                return (
                  <div
                    key={`${id}-${idx}`}
                    style={{
                      borderRadius: 14,
                      padding: "10px 10px",
                      border: cardBorder,
                      background: cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <ProfileAvatar profile={ent} size={38} showStars={false} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                          #{idx + 1} {isLocked ? "• Actif" : ""}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 1000,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        disabled={idx === 0 || isLocked}
                        onClick={() => {
                          const a = [...selectedIds];
                          if (idx <= 0) return;
                          const tmp = a[idx - 1];
                          a[idx - 1] = a[idx];
                          a[idx] = tmp;

                          const humans: string[] = [];
                          const bots: string[] = [];
                          for (const pid of a) {
                            const ent2 = idToEntity.get(String(pid));
                            if (ent2?.isBot) bots.push(String(pid));
                            else humans.push(String(pid));
                          }
                          setSelectedHumanIds(humans.length ? humans : selectedHumanIds);
                          setSelectedBotIds(bots);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.25)",
                          opacity: idx === 0 || isLocked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ↑
                      </button>
                      <button
                        disabled={idx === selectedIds.length - 1 || isLocked}
                        onClick={() => {
                          const a = [...selectedIds];
                          if (idx >= a.length - 1) return;
                          const tmp = a[idx + 1];
                          a[idx + 1] = a[idx];
                          a[idx] = tmp;

                          const humans: string[] = [];
                          const bots: string[] = [];
                          for (const pid of a) {
                            const ent2 = idToEntity.get(String(pid));
                            if (ent2?.isBot) bots.push(String(pid));
                            else humans.push(String(pid));
                          }
                          setSelectedHumanIds(humans.length ? humans : selectedHumanIds);
                          setSelectedBotIds(bots);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.25)",
                          opacity: idx === selectedIds.length - 1 || isLocked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ↓
                      </button>
                      <button
                        disabled={isLocked}
                        onClick={() => {
                          if (isLocked) return;
                          const ent2 = idToEntity.get(String(id));
                          if (ent2?.isBot)
                            setSelectedBotIds((prev) => prev.filter((x) => x !== String(id)));
                          else
                            setSelectedHumanIds((prev) =>
                              prev.length <= 1 ? prev : prev.filter((x) => x !== String(id))
                            );
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,80,120,0.25)",
                          background: "rgba(255,80,120,0.10)",
                          opacity: isLocked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Section>
      </> : null}

      {/* ============================= */}
      {/* MODE / CONTRATS */}
      {/* ============================= */}
      {showMode ? (
      <Section title={t("config.mode", "Mode")}>
        <CapitalOptionCard label="Catégorie CAPITAL" info={CAPITAL_OPTION_HELP.version} onInfo={openOptionInfo} stacked>
          <div role="group" aria-label="Catégorie de variante CAPITAL" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))", gap: 7 }}>
            {[...CAPITAL_PRESET_GROUPS.map(group => ({ value: group.category, label: group.label })), { value: "custom", label: "MON CAPITAL" }].map(item => {
              const active = selectedCategory === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleCategoryChange(item.value as typeof selectedCategory)}
                  style={{ minHeight: 43, padding: "8px 6px", borderRadius: 11,
                    border: active ? "1px solid rgba(53,216,255,.65)" : "1px solid rgba(255,255,255,.17)",
                    background: active ? "rgba(53,216,255,.18)" : "rgba(255,255,255,.05)",
                    color: "#fff", fontWeight: 950, fontSize: 10.5, letterSpacing: .35,
                    boxShadow: active ? "inset 0 0 0 1px rgba(53,216,255,.17)" : "none",
                    cursor: "pointer" }}
                >{item.label}</button>
              );
            })}
          </div>
        </CapitalOptionCard>

        {mode === "official" && selectedPresetGroup && (
          <CapitalOptionCard label={selectedPresetGroup.contracts.length > 1 ? "Choisis la variante" : "Variante sélectionnée"} info="Les grilles de chaque catégorie sont regroupées ici. Les contrats et leur ordre restent inchangés." onInfo={openOptionInfo} stacked>
            {selectedPresetGroup.contracts.length > 1 ? (
              <OptionSelect
                value={selectedVariant}
                options={selectedPresetGroup.contracts.map(id => ({ value: id, label: CAPITAL_GRID_PRESETS[id].label }))}
                onChange={(value: any) => handleVariantChange(value as CapitalGridPresetId)}
              />
            ) : (
              <div style={{ borderRadius: 12, padding: "11px 12px", fontSize: 12, fontWeight: 900, border: "1px solid rgba(255,255,255,.13)", background: "rgba(255,255,255,.06)" }}>
                {CAPITAL_GRID_PRESETS[gridVariant].label}
              </div>
            )}
          </CapitalOptionCard>
        )}

        {mode === "custom" && (
          <CapitalOptionCard label={`MON CAPITAL · ${savedVariants.length} variante(s) enregistrée(s)`} info="Retrouve ici tes variantes nommées. Sélectionner une variante recharge ses contrats et ses règles. Les modèles CLUB/BAR/NIVEAU ne sont jamais modifiés." onInfo={openOptionInfo} stacked>
            {savedVariants.length > 0 ? (
              <OptionSelect
                value={savedVariantId}
                options={[{ value: "", label: "— Nouvelle variante / grille en cours —" }, ...savedVariants.map(item => ({ value: item.id, label: `${item.name} · ${item.contracts.length + (item.includeCapital ? 1 : 0)} tours` }))]}
                onChange={(id: any) => id ? loadNamedVariant(String(id)) : resetNamedVariantFromBase()}
              />
            ) : <div style={{ fontSize: 12, opacity: .75 }}>Aucune variante enregistrée. Choisis une base, personnalise-la, puis donne-lui un nom.</div>}
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label htmlFor="capital-personal-name" style={{ fontSize: 11, fontWeight: 900 }}>Nom de ma variante</label>
              <input
                id="capital-personal-name" type="text" maxLength={48} value={savedVariantName}
                placeholder="Ex. Capital du vendredi"
                onChange={(e) => { setSavedVariantName(e.target.value); setSavedNotice(""); }}
                style={{ width: "100%", boxSizing: "border-box", borderRadius: 11, padding: "11px 12px", background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", fontWeight: 850 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 7 }}>
                <button type="button" onClick={() => saveNamedVariant(false)} style={capitalLibraryButtonStyle(true)}>
                  {selectedSavedVariant ? "Enregistrer les modifications" : "Enregistrer ma variante"}
                </button>
                {selectedSavedVariant && <button type="button" onClick={() => saveNamedVariant(true)} style={capitalLibraryButtonStyle(false)}>Enregistrer une copie</button>}
                {selectedSavedVariant && <button type="button" onClick={deleteNamedVariant} style={capitalLibraryButtonStyle(false)}>Supprimer</button>}
              </div>
              {selectedSavedVariant && <div style={{ fontSize: 11, opacity: .8 }}>
                {appliedVariantMatches ? "Variante enregistrée à jour." : "Modifications non enregistrées : clique sur Enregistrer pour les conserver."}
                <span> Pour renommer, modifie le nom puis enregistre.</span>
              </div>}
              {savedNotice && <div role="status" style={{ fontSize: 11.5, fontWeight: 850, color: "#9de7ff" }}>{savedNotice}</div>}
              <div style={{ fontSize: 10.5, opacity: .65 }}>Variantes conservées sur cet appareil. Leur synchronisation entre appareils n’est pas automatique.</div>
            </div>
          </CapitalOptionCard>
        )}

        {mode === "custom" && (
          <CapitalOptionCard label="MON CAPITAL · Base pour une nouvelle grille" info="Choisis une grille CLUB, BAR ou NIVEAU, puis clique sur Créer depuis cette base pour en faire une copie modifiable et enregistrable sous un nom." onInfo={openOptionInfo} stacked>
            <OptionSelect
              value={gridVariant}
              options={CAPITAL_PRESET_ORDER.map(id => ({ value: id, label: `${CAPITAL_PRESET_GROUPS.find(group => group.category === CAPITAL_GRID_PRESETS[id].category)?.label || "CAPITAL"} — ${CAPITAL_GRID_PRESETS[id].label}` }))}
              onChange={(value: any) => setGridVariant(value as CapitalGridPresetId)}
            />
          </CapitalOptionCard>
        )}

        {gridVariant === "committee_other17" && (
          <CapitalOptionCard label="Contrat de remplacement (Peluche)" info="Choisis le contrat appliqué aux autres variantes régionales. Il prend exactement la place de Peluche dans les 17 tours." onInfo={openOptionInfo} stacked>
            <OptionSelect
              value={committeeSpecialContract}
              options={CAPITAL_COMMITTEE_REPLACEMENTS.map(id => ({ value: id, label: labelOf(id) }))}
              onChange={(v: any) => setCommitteeSpecialContract(v as CapitalContractID)}
            />
          </CapitalOptionCard>
        )}

        <div style={{ margin: "7px 0 9px", fontSize: 11, lineHeight: 1.35, opacity: .75 }}>
          {CAPITAL_GRID_PRESETS[gridVariant].description}
          {mode === "custom" ? ` · ${customList.length} contrat(s) dans ta liste modifiable.` : ""}
        </div>

        {mode === "official" && (
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.35 }}>
            <b>{activeGridContracts.length} tours</b>
            <div style={{ marginTop: 8, display: "grid", gap: 5, maxHeight: 285, overflowY: "auto" }}>
              {activeGridContracts.map((id, i) => (
                <div key={`${id}-${i}`} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ width: 24, flexShrink: 0, textAlign: "right", opacity: .6 }}>#{i + 1}</span>
                  <span><b>{CAPITAL_CONTRACT_META[id].label}</b> <span style={{ opacity: .65, fontSize: 10 }}>{CAPITAL_CONTRACT_META[id].rule}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "custom" ? (
          <button type="button" onClick={() => {
            resetNamedVariantFromBase();
          }} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(53,216,255,.11)", border: "1px solid rgba(53,216,255,.4)", fontWeight: 950, color: "#fff", width: "100%" }}>
            Créer une nouvelle variante depuis cette base ({activeGridContracts.length} contrats)
          </button>
        ) : null}

        {(mode === "custom" ? customList : activeGridContracts).includes("shanghai") && (
          <CapitalOptionCard label="Bonus Shanghai" info="Certaines variantes locales ajoutent un bonus en cas de Shanghai complet ; par défaut aucun bonus." onInfo={openOptionInfo}>
            <OptionSelect value={shanghaiBonus} options={[0, 25, 50, 100].map((n) => ({ value: n, label: n ? `+${n} points` : "Sans bonus" }))} onChange={(v: any) => setShanghaiBonus(Number(v))} />
          </CapitalOptionCard>
        )}
        {(mode === "custom" ? customList : activeGridContracts).includes("packet") && (
          <CapitalOptionCard label="Paquet : autoriser D / T" info="Par défaut trois simples identiques. Activer pour accepter également trois doubles identiques ou trois triples identiques." onInfo={openOptionInfo}>
            <OptionToggle value={packetAllowMultipliers} onChange={setPacketAllowMultipliers} />
          </CapitalOptionCard>
        )}
        {(mode === "custom" ? customList : activeGridContracts).includes("exact_custom") && (
          <CapitalOptionCard label="Objectif du Score exact libre" info="Nombre à atteindre exactement en une à trois fléchettes." onInfo={openOptionInfo}>
            <input aria-label="Score exact libre" type="number" min={1} max={180} value={exactTarget}
              onChange={(e) => setExactTarget(Number(e.target.value))}
              style={{ width: 95, padding: "9px 10px", borderRadius: 10, color: "#fff", background: "rgba(0,0,0,.32)", border: `1px solid ${capitalExactScorePossible(exactTarget) ? "rgba(255,255,255,.23)" : "#ff7b8d"}` }} />
          </CapitalOptionCard>
        )}
        {mode === "custom" && (
          <>
            <CapitalOptionCard label="Contrat Capital au départ" info={CAPITAL_OPTION_HELP.includeCapital} onInfo={openOptionInfo}>
              <OptionToggle value={includeCapital} onChange={setIncludeCapital} />
            </CapitalOptionCard>

            {/* ✅ Ajout : limite nb contrats */}
            <CapitalOptionCard label="Limite contrats (hors CAP)" info={CAPITAL_OPTION_HELP.maxContracts} onInfo={openOptionInfo}>
              <OptionSelect
                value={maxCustomContracts}
                options={[
                  { value: 5, label: "5" },
                  { value: 8, label: "8" },
                  { value: 10, label: "10" },
                  { value: 12, label: "12" },
                  { value: 15, label: "15" },
                  { value: 16, label: "16" },
                  { value: 17, label: "17" },
                  { value: 18, label: "18" },
                  { value: 20, label: "20" },
                  { value: 25, label: "25" },
                  { value: 30, label: "30 (max)" },
                ]}
                onChange={(v: any) => setMaxCustomContracts(Number(v))}
              />
            </CapitalOptionCard>

            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
              Ordre actuel ({customList.length} contrats)
            </div>

            {/* ✅ Compact : 1 ligne = label + controls */}
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {customList.map((id, idx) => {
                const locked = id === "capital" && includeCapital;
                return (
                  <div
                    key={`${id}-${idx}`}
                    style={{
                      borderRadius: 14,
                      padding: "10px 10px",
                      border: cardBorder,
                      background: cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, opacity: 0.70, fontWeight: 900 }}>#{idx + 1}</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 1000,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {labelOf(id)}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 10, opacity: .62, lineHeight: 1.25 }}>
                        {CAPITAL_CONTRACT_META[id]?.rule}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        disabled={idx === 0 || locked}
                        onClick={() => {
                          setCustomContracts((prev) => {
                            const list = customList.filter((x) => x !== "capital");
                            const mapped = includeCapital ? idx - 1 : idx;
                            if (mapped <= 0) return prev;
                            const a = [...list];
                            const tmp = a[mapped - 1];
                            a[mapped - 1] = a[mapped];
                            a[mapped] = tmp;
                            return a as any;
                          });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.25)",
                          opacity: idx === 0 || locked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ↑
                      </button>
                      <button
                        disabled={idx === customList.length - 1 || locked}
                        onClick={() => {
                          setCustomContracts((prev) => {
                            const list = customList.filter((x) => x !== "capital");
                            const mapped = includeCapital ? idx - 1 : idx;
                            if (mapped < 0 || mapped >= list.length - 1) return prev;
                            const a = [...list];
                            const tmp = a[mapped + 1];
                            a[mapped + 1] = a[mapped];
                            a[mapped] = tmp;
                            return a as any;
                          });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.25)",
                          opacity: idx === customList.length - 1 || locked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ↓
                      </button>
                      <button
                        disabled={locked}
                        onClick={() => {
                          if (locked) return;
                          setCustomContracts((prev) => {
                            const list = customList.filter((x) => x !== "capital");
                            const mapped = includeCapital ? idx - 1 : idx;
                            const a = list.filter((_, i) => i !== mapped);
                            return a as any;
                          });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,80,120,0.25)",
                          background: "rgba(255,80,120,0.10)",
                          opacity: locked ? 0.4 : 1,
                          fontWeight: 900,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <OptionSelect
                  value={addPick}
                  options={availableToAdd.map((id) => ({ value: id, label: labelOf(id) }))}
                  onChange={(v) => setAddPick(v)}
                  disabled={availableToAdd.length === 0}
                />
              </div>
              <button
                disabled={availableToAdd.length === 0}
                onClick={() => {
                  setCustomContracts((prev) => {
                    const base = customList.filter((x) => x !== "capital");
                    if (base.includes(addPick)) return prev;
                    // Un ajout ne doit jamais être masqué par l'ancienne limite (15 par défaut).
                    const required = Math.min(30, base.length + 1);
                    const steps = [5, 8, 10, 12, 15, 16, 17, 18, 20, 25, 30];
                    if (required > maxCustomContracts) {
                      setMaxCustomContracts(steps.find((step) => step >= required) || 30);
                    }
                    return [...base, addPick] as any;
                  });
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  fontWeight: 1000,
                  opacity: availableToAdd.length === 0 ? 0.4 : 1,
                }}
              >
                + Ajouter
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Astuce : garde “Capital” en 1er, sinon tout le monde démarre à 0 (et le /2 ne sert à rien).
            </div>
          </>
        )}
      </Section>
      ) : null}

      {/* ============================= */}
      {/* VICTOIRE / RÈGLES */}
      {/* ============================= */}
      {showOptions ? (
      <Section title="Victoire / Règles">
        <CapitalOptionCard label="Preset règles" info={CAPITAL_OPTION_HELP.preset} onInfo={openOptionInfo}>
          <OptionSelect
            value={rulesPreset}
            options={[
              { value: "official", label: "Officiel" },
              { value: "fun", label: "Fun" },
            ]}
            onChange={(v: any) => setRulesPreset(v)}
          />
        </CapitalOptionCard>

        <CapitalOptionCard label="Condition de victoire" info={CAPITAL_OPTION_HELP.victory} onInfo={openOptionInfo} stacked>
          <OptionSelect
            value={victoryMode}
            options={[
              { value: "best_after_contracts", label: "Meilleur score (Officiel)" },
              { value: "first_to_target", label: "Score cible" },
            ]}
            onChange={(v: any) => setVictoryMode(v)}
          />
        </CapitalOptionCard>

        {victoryMode === "first_to_target" && (
          <CapitalOptionCard label="Score cible" info={CAPITAL_OPTION_HELP.target} onInfo={openOptionInfo}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={String(targetScore)}
                onChange={(e) => setTargetScore(Number(e.target.value || 0))}
                type="number"
                min={50}
                max={5000}
                style={{
                  width: 104,
                  padding: "9px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#f6f2e9",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              />
              <div style={{ fontSize: 10.5, opacity: 0.68 }}>ex. 500</div>
            </div>
          </CapitalOptionCard>
        )}

        <CapitalOptionCard label="Tie-break" info={CAPITAL_OPTION_HELP.tieBreak} onInfo={openOptionInfo} stacked>
          <OptionSelect
            value={tieBreaker}
            options={[
              { value: "last_contract_total", label: "Meilleur total — dernier contrat" },
              { value: "none", label: "Aucun" },
            ]}
            onChange={(v: any) => setTieBreaker(v)}
          />
        </CapitalOptionCard>

        <CapitalOptionCard label="Échec : division /2" info={CAPITAL_OPTION_HELP.failHalf} onInfo={openOptionInfo}>
          <OptionToggle value={failDivideBy2} onChange={setFailDivideBy2} />
        </CapitalOptionCard>

        {!includeCapital && (
          <CapitalOptionCard label="Capital de départ" info={CAPITAL_OPTION_HELP.startingCapital} onInfo={openOptionInfo}>
            <input
              value={String(startingCapital)}
              onChange={(e) => setStartingCapital(Number(e.target.value || 0))}
              type="number"
              min={0}
              max={5000}
              style={{
                width: 104,
                padding: "9px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "#f6f2e9",
                fontSize: 12,
                fontWeight: 900,
              }}
            />
          </CapitalOptionCard>
        )}

        <CapitalOptionCard label="Timer par tour" info={CAPITAL_OPTION_HELP.timer} onInfo={openOptionInfo}>
          <OptionSelect
            value={turnTimerSec}
            options={[
              { value: 0, label: "Off" },
              { value: 15, label: "15 s" },
              { value: 20, label: "20 s" },
              { value: 30, label: "30 s" },
              { value: 45, label: "45 s" },
              { value: 60, label: "60 s" },
            ]}
            onChange={(v: any) => setTurnTimerSec(Number(v))}
          />
        </CapitalOptionCard>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
          ✅ Officiel : Capital ON + /2 ON + Meilleur score. Timer OFF.
        </div>
      </Section>
      ) : null}

      {/* ============================= */}
      {/* SAISIE */}
      {/* ============================= */}
      {showOptions ? (
      <Section title="Saisie">
        <CapitalOptionCard label="Mode de saisie" info={CAPITAL_OPTION_HELP.input} onInfo={openOptionInfo}>
          <OptionSelect
            value={inputMethod}
            options={[
              { value: "keypad", label: "Keypad" },
              { value: "dartboard", label: "Cible" },
              { value: "presets", label: "Presets" },
              { value: "visit_score", label: "Score volée" },
            ]}
            onChange={setInputMethod}
          />
        </CapitalOptionCard>
      </Section>
      ) : null}

      {showRecap ? (
        <Section title="Récapitulatif">
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            {[
              ["Participants", canonicalSelection?.participantMode === "teams" ? `${canonicalSelection?.teams.length || 0} équipes • ${canonicalSelection?.selectedIds.length || 0} joueurs` : `${canonicalSelection?.selectedIds.length || 0} joueurs`],
              ["Mode", mode === "official" ? CAPITAL_GRID_PRESETS[gridVariant].label : `${savedVariantName.trim() || CAPITAL_CUSTOM_VARIANT_LABEL} • ${customList.length} contrats${selectedSavedVariant && !appliedVariantMatches ? " (non enregistré)" : ""}`],
              ["Échec", failDivideBy2 ? "Capital divisé par 2" : "Aucune division"],
              ["Victoire", victoryMode === "first_to_target" ? `Score cible ${targetScore}` : "Meilleur capital final"],
              ["Départ", ({ random: "Aléatoire", fixed: "Alterné / sélection", alternate: "Alterné / sélection", manual: "Manuel", bull: "Bull" } as Record<CapitalStartOrderMode, string>)[startOrderMode]],
              ["Saisie", String(inputMethod).toUpperCase()],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "105px 1fr", gap: 8, padding: 9, borderRadius: 13, background: "rgba(255,255,255,.035)" }}>
                <span style={{ opacity: .65 }}>{label}</span><b>{value}</b>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {configError ? <div style={{ margin: "8px 16px", color: "#ff8aa6", fontSize: 12, fontWeight: 900 }}>{configError}</div> : null}

      {viewMode === "guided" && guidedStep < 3 ? (
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: guidedStep > 0 ? "1fr 1fr" : "1fr", gap: 9 }}>
          {guidedStep > 0 ? <button type="button" onClick={() => { setGuidedStep((guidedStep - 1) as any); setConfigError(""); }} style={pillStyle(false)}>Précédent</button> : null}
          <button type="button" onClick={() => {
            if (guidedStep === 0 && !canonicalSelection?.valid) {
              setConfigError(canonicalSelection?.error || "Sélectionne les participants.");
              return;
            }
            setGuidedStep((guidedStep + 1) as any);
            setConfigError("");
          }} style={pillStyle(true)}>Suivant</button>
        </div>
      ) : null}

      {showRecap ? (
        <div style={{ padding: "2px 12px 104px" }}>
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.68, lineHeight: 1.35 }}>
            Quatre catégories : CLUB, BAR, NIVEAU et MON CAPITAL. Enregistre tes grilles personnelles sous un nom pour les retrouver dans MON CAPITAL.
          </div>
        </div>
      ) : null}

      {showRecap ? (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, zIndex: 80, padding: "6px 12px 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onClick={start}
              disabled={!canStart}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 999,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: "uppercase",
                background: canStart ? `linear-gradient(90deg, ${accent}, #ffe9a3)` : "rgba(120,120,120,0.5)",
                color: canStart ? "#151515" : "#2b2b52",
                boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
                opacity: canStart ? 1 : 0.6,
                cursor: canStart ? "pointer" : "default",
              }}
            >
              {t("x01v3.start", "Lancer la partie")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
