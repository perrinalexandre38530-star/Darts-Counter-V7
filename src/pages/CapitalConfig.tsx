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
import { SCORE_INPUT_LS_KEY, type ScoreInputMethod } from "../lib/scoreInput/types";

type BotLevel = "easy" | "normal" | "hard";
type BotRisk = "safe" | "normal" | "aggressive";
type RulesPreset = "official" | "fun";

export type CapitalModeKind = "official" | "custom";
export type CapitalStartOrderMode = "random" | "fixed";

export type CapitalContractID =
  | "capital"
  | "n20"
  | "triple_any"
  | "n19"
  | "double_any"
  | "n18"
  | "side"
  | "n17"
  | "suite"
  | "n16"
  | "colors_3"
  | "n15"
  | "exact_57"
  | "n14"
  | "center";

export type CapitalConfigPayload = {
  // ✅ Participants (profils + bots)
  players: number; // total slots (humains + bots)
  selectedIds: string[]; // ordre = ordre de jeu (si fixed) ; sinon ordre initial
  startOrderMode: CapitalStartOrderMode;

  // Bots
  botsEnabled: boolean;
  botLevel: BotLevel;

  // ✅ Bots - comportement (ajout)
  botsAutoPlay?: boolean;
  botTurnDelayMs?: number; // délai avant action bot (visuel)
  botRisk?: BotRisk; // prise de risque / agressivité

  // Mode / Contrats
  mode: CapitalModeKind;
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

const OFFICIAL_CONTRACTS: CapitalContractID[] = [
  "capital",
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
];

const INFO_TEXT = `RÈGLE OFFICIELLE — CAPITAL (15 contrats)

Avant les contrats, chaque joueur lance 3 fléchettes pour se constituer son CAPITAL (score de départ).
Ensuite, chaque contrat se joue en 1 volée de 3 fléchettes :

- ✅ Contrat réussi → on AJOUTE le total de la volée au score
- ❌ Contrat raté → le score est DIVISÉ PAR 2 (arrondi à l’entier inférieur)

Liste officielle des contrats :
1) Capital
2) 20
3) Triple
4) 19
5) Double
6) 18
7) Side
8) 17
9) Suite
10) 16
11) Couleur
12) 15
13) 57
14) 14
15) Centre`;

function labelOf(id: CapitalContractID): string {
  switch (id) {
    case "capital":
      return "Capital";
    case "n20":
      return "20 (au moins un 20)";
    case "triple_any":
      return "Triple (au moins un triple)";
    case "n19":
      return "19 (au moins un 19)";
    case "double_any":
      return "Double (au moins un double)";
    case "n18":
      return "18 (au moins un 18)";
    case "side":
      return "Side (3 secteurs côte à côte)";
    case "n17":
      return "17 (au moins un 17)";
    case "suite":
      return "Suite (3 numéros consécutifs)";
    case "n16":
      return "16 (au moins un 16)";
    case "colors_3":
      return "Couleur (3 couleurs différentes)";
    case "n15":
      return "15 (au moins un 15)";
    case "exact_57":
      return "57 (total exact)";
    case "n14":
      return "14 (au moins un 14)";
    case "center":
      return "Centre (25 ou 50)";
    default:
      return String(id);
  }
}

const LS_BOTS_KEY = "dc_bots_v1";

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
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((b: any) => b?.id)
      .map((b: any) => ({
        id: String(b.id),
        name: String(b?.name || "BOT"),
        nickname: String(b?.name || "BOT"),
        avatarDataUrl: b?.avatarDataUrl || b?.avatar || null,
        isBot: true,
        botKind: "custom",
        botLevel: b?.botLevel ?? undefined,
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

  const locals = useMemo(
    () => safeStoreProfiles(store).filter((p: any) => !p?.isBot),
    [store]
  );
  const activeProfileId = useMemo(() => safeActiveProfileId(store), [store]);
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

  // ------------------ Config core ------------------
  const [players, setPlayers] = useState<number>(2);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");

  // ✅ Ajout : presets de règles (remplit automatiquement les toggles)
  const [rulesPreset, setRulesPreset] = useState<RulesPreset>("official");

  // ✅ Ajout : bots comportement
  const [botsAutoPlay, setBotsAutoPlay] = useState<boolean>(true);
  const [botTurnDelayMs, setBotTurnDelayMs] = useState<number>(650);
  const [botRisk, setBotRisk] = useState<BotRisk>("normal");

  const [startOrderMode, setStartOrderMode] =
    useState<CapitalStartOrderMode>("random");

  // ✅ Ajout : timer par tour
  const [turnTimerSec, setTurnTimerSec] = useState<number>(0);

  const [inputMethod, setInputMethod] = useState<ScoreInputMethod>(() => {
    try {
      const v = (localStorage.getItem(SCORE_INPUT_LS_KEY) || "keypad") as any;
      return (["keypad", "dartboard", "presets"].includes(v) ? v : "keypad") as any;
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
  const [mode, setMode] = useState<CapitalModeKind>("official");
  const [includeCapital, setIncludeCapital] = useState<boolean>(true);

  // ✅ Ajout : limite du nombre de contrats (custom)
  const [maxCustomContracts, setMaxCustomContracts] = useState<number>(15);

  // ------------------ Victoire / règles ------------------
  const [victoryMode, setVictoryMode] = useState<
    "best_after_contracts" | "first_to_target"
  >("best_after_contracts");
  const [targetScore, setTargetScore] = useState<number>(700);
  const [tieBreaker, setTieBreaker] = useState<"none" | "last_contract_total">(
    "last_contract_total"
  );
  const [failDivideBy2, setFailDivideBy2] = useState<boolean>(true);
  const [startingCapital, setStartingCapital] = useState<number>(301);

  const [customContracts, setCustomContracts] = useState<CapitalContractID[]>([
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
  ]);

  // ✅ Presets : applique des defaults sans empêcher l'édition
  React.useEffect(() => {
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

  const payload: CapitalConfigPayload = useMemo(() => {
    const cappedPlayers = clamp(players, 1, 12);
    const cfg: CapitalConfigPayload = {
      players: cappedPlayers,
      selectedIds,
      startOrderMode,
      botsEnabled,
      botLevel,

      botsAutoPlay: botsEnabled ? botsAutoPlay : undefined,
      botTurnDelayMs: botsEnabled ? clamp(botTurnDelayMs, 0, 6000) : undefined,
      botRisk: botsEnabled ? botRisk : undefined,

      mode,
      includeCapital,
      maxCustomContracts: mode === "custom" ? clamp(maxCustomContracts, 1, 30) : undefined,
      customContracts: mode === "official" ? OFFICIAL_CONTRACTS : customList,

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
    startOrderMode,
    botsEnabled,
    botLevel,
    botsAutoPlay,
    botTurnDelayMs,
    botRisk,
    mode,
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
    if (go) return go("games");
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    try {
      localStorage.setItem(SCORE_INPUT_LS_KEY, inputMethod);
    } catch {}
    const cfg: any = { ...payload };
    if (cfg.startOrderMode === "random") {
      cfg.selectedIds = shuffleCopy(cfg.selectedIds);
    }
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
    const pool: CapitalContractID[] = [
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
    ];
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

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      {/* ============================= */}
      {/* PARTICIPANTS */}
      {/* ============================= */}
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
              { value: "fixed", label: "Ordre défini" },
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

      {/* ============================= */}
      {/* MODE / CONTRATS */}
      {/* ============================= */}
      <Section title={t("config.mode", "Mode")}>
        <OptionRow label="Version">
          <OptionSelect
            value={mode}
            options={[
              { value: "official", label: "Officiel (15 contrats)" },
              { value: "custom", label: "Custom (personnalisé)" },
            ]}
            onChange={setMode}
          />
        </OptionRow>

        {mode === "official" && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8, lineHeight: 1.3 }}>
            Séquence officielle :
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {OFFICIAL_CONTRACTS.map((c, i) => (
                <div key={c} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 26, textAlign: "right", opacity: 0.7, fontWeight: 900 }}>
                    #{i + 1}
                  </div>
                  <div style={{ fontWeight: 900 }}>{labelOf(c)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "custom" && (
          <>
            <OptionRow label={`Inclure le contrat "Capital" en 1er`}>
              <OptionToggle value={includeCapital} onChange={setIncludeCapital} />
            </OptionRow>

            {/* ✅ Ajout : limite nb contrats */}
            <OptionRow label="Limite nb contrats (custom)">
              <OptionSelect
                value={maxCustomContracts}
                options={[
                  { value: 5, label: "5" },
                  { value: 8, label: "8" },
                  { value: 10, label: "10" },
                  { value: 12, label: "12" },
                  { value: 15, label: "15" },
                  { value: 18, label: "18" },
                  { value: 20, label: "20" },
                  { value: 25, label: "25" },
                  { value: 30, label: "30 (max)" },
                ]}
                onChange={(v: any) => setMaxCustomContracts(Number(v))}
              />
            </OptionRow>

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

      {/* ============================= */}
      {/* VICTOIRE / RÈGLES */}
      {/* ============================= */}
      <Section title="Victoire / Règles">
        {/* ✅ Ajout : preset règles */}
        <OptionRow label="Preset règles">
          <OptionSelect
            value={rulesPreset}
            options={[
              { value: "official", label: "Officiel" },
              { value: "fun", label: "Fun (libre)" },
            ]}
            onChange={(v: any) => setRulesPreset(v)}
          />
        </OptionRow>

        <OptionRow label="Condition de victoire">
          <OptionSelect
            value={victoryMode}
            options={[
              { value: "best_after_contracts", label: "Meilleur score après contrats (officiel)" },
              { value: "first_to_target", label: "Premier à atteindre un score cible" },
            ]}
            onChange={(v: any) => setVictoryMode(v)}
          />
        </OptionRow>

        {victoryMode === "first_to_target" && (
          <OptionRow label="Score cible">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={String(targetScore)}
                onChange={(e) => setTargetScore(Number(e.target.value || 0))}
                type="number"
                min={50}
                max={5000}
                style={{
                  width: 120,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#f6f2e9",
                  fontWeight: 900,
                }}
              />
              <div style={{ fontSize: 12, opacity: 0.75 }}>ex: 500 / 700 / 1000</div>
            </div>
          </OptionRow>
        )}

        <OptionRow label="Tie-break (si égalité)">
          <OptionSelect
            value={tieBreaker}
            options={[
              { value: "last_contract_total", label: "Meilleur total sur le dernier contrat" },
              { value: "none", label: "Aucun (égalité)" },
            ]}
            onChange={(v: any) => setTieBreaker(v)}
          />
        </OptionRow>

        <OptionRow label="Règle /2 en cas d'échec">
          <OptionToggle value={failDivideBy2} onChange={setFailDivideBy2} />
        </OptionRow>

        {!includeCapital && (
          <OptionRow label="Capital de départ (si Capital OFF)">
            <input
              value={String(startingCapital)}
              onChange={(e) => setStartingCapital(Number(e.target.value || 0))}
              type="number"
              min={0}
              max={5000}
              style={{
                width: 140,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "#f6f2e9",
                fontWeight: 900,
              }}
            />
          </OptionRow>
        )}

        {/* ✅ Ajout : timer */}
        <OptionRow label="Timer par tour">
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
        </OptionRow>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
          ✅ Officiel : Capital ON + /2 ON + Meilleur score après contrats. (Timer OFF)
        </div>
      </Section>

      {/* ============================= */}
      {/* SAISIE */}
      {/* ============================= */}
      <Section title="Saisie">
        <OptionRow label="Mode de saisie">
          <OptionSelect
            value={inputMethod}
            options={[
              { value: "keypad", label: "Keypad (clavier)" },
              { value: "dartboard", label: "Cible (dartboard)" },
              { value: "presets", label: "Presets" },
            ]}
            onChange={setInputMethod}
          />
        </OptionRow>
      </Section>

      <div style={{ padding: 12 }}>
        <button
          onClick={start}
          style={{
            width: "100%",
            borderRadius: 16,
            padding: "14px 14px",
            fontSize: 14,
            fontWeight: 1000,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.10)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          {t("config.start", "Démarrer")}
        </button>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Officiel = séquence fixe des 15 contrats. Custom = tu choisis l’ordre et les contrats.
        </div>
      </div>
    </div>
  );
}
