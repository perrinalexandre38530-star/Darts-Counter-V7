import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileMedallionCarousel from "../components/ProfileMedallionCarousel";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Store, Profile } from "../lib/types";
import { SCORE_INPUT_LS_KEY, type ScoreInputMethod } from "../lib/scoreInput/types";

// ✅ avatars BOTS PRO (déjà présents dans le repo)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";

type BotLevel = "easy" | "normal" | "hard";
export type CapitalModeKind = "official" | "custom";
export type StartOrder = "random" | "fixed";

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
  players: number;

  /** Participants */
  activeProfileId?: string | null;
  selectedProfileIds?: string[];
  selectedBotIds?: string[];

  botsEnabled: boolean;
  botLevel: BotLevel;

  /** Règles / modes */
  mode: CapitalModeKind;
  customContracts?: CapitalContractID[];
  includeCapital?: boolean;

  /** Options de partie */
  startOrder?: StartOrder;
  scoreInputMethod?: ScoreInputMethod;
};

type BotLite = {
  id: string;
  name: string;
  avatarUrl: string;
  kind: "pro" | "user";
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

function clampInt(v: number, min: number, max: number, fallback: number) {
  const n = Number.isFinite(v) ? Math.trunc(v) : fallback;
  return Math.max(min, Math.min(max, n));
}

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

function safeReadUserBots(): BotLite[] {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? "Bot"),
        avatarUrl: String(b?.avatarDataUrl ?? b?.avatarUrl ?? ""),
        kind: "user" as const,
      }))
      .filter((b: BotLite) => !!b.id && !!b.avatarUrl);
  } catch {
    return [];
  }
}

function safeWriteScoreInputMethod(method: ScoreInputMethod) {
  try {
    localStorage.setItem(SCORE_INPUT_LS_KEY, method);
  } catch {
    // ignore
  }
}

export default function CapitalConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme() as any;
  const primary: string = theme?.theme?.primary || theme?.primary || "#7dffca";

  const store: Store | undefined = props?.store;
  const localProfiles: Profile[] = (store?.profiles || []) as any;

  const initialActiveId = (store?.activeProfileId as any) || (localProfiles[0]?.id as any) || null;

  const [players, setPlayers] = useState<number>(2);

  // ✅ Profil actif (joueur 1)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(initialActiveId);

  // ✅ Participants profils (inclut toujours le profil actif)
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(() => {
    return initialActiveId ? [String(initialActiveId)] : [];
  });

  // ✅ Bots
  const [botsEnabled, setBotsEnabled] = useState<boolean>(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);

  // ✅ Options de partie
  const [startOrder, setStartOrder] = useState<StartOrder>("random");
  const [scoreInputMethod, setScoreInputMethod] = useState<ScoreInputMethod>(() => {
    try {
      const v = localStorage.getItem(SCORE_INPUT_LS_KEY) as ScoreInputMethod | null;
      return v || "keypad";
    } catch {
      return "keypad";
    }
  });

  const [mode, setMode] = useState<CapitalModeKind>("official");
  const [includeCapital, setIncludeCapital] = useState<boolean>(true);

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

  const proBots: BotLite[] = useMemo(
    () => [
      { id: "bot_pro_green_machine", name: "Green Machine", avatarUrl: avatarGreenMachine, kind: "pro" },
      { id: "bot_pro_snake_king", name: "Snake King", avatarUrl: avatarSnakeKing, kind: "pro" },
      { id: "bot_pro_wonder_kid", name: "Wonder Kid", avatarUrl: avatarWonderKid, kind: "pro" },
      { id: "bot_pro_ice_man", name: "Ice Man", avatarUrl: avatarIceMan, kind: "pro" },
      { id: "bot_pro_the_power", name: "The Power", avatarUrl: avatarThePower, kind: "pro" },
      { id: "bot_pro_hollywood", name: "Hollywood", avatarUrl: avatarHollywood, kind: "pro" },
    ],
    []
  );

  const userBots = useMemo(() => safeReadUserBots(), []);

  const allBots = useMemo(() => {
    const seen = new Set<string>();
    const out: BotLite[] = [];
    [...proBots, ...userBots].forEach((b) => {
      if (!b?.id || seen.has(b.id)) return;
      seen.add(b.id);
      out.push(b);
    });
    return out;
  }, [proBots, userBots]);

  const profileItems = useMemo(() => {
    return (localProfiles || []).map((p) => ({
      id: String(p.id),
      name: p.name || "Profil",
      profile: p,
    }));
  }, [localProfiles]);

  const botItems = useMemo(() => {
    return allBots.map((b) => ({
      id: b.id,
      name: b.name,
      profile: {
        id: b.id,
        name: b.name,
        avatarUrl: b.avatarUrl,
        avatarDataUrl: null,
      },
    }));
  }, [allBots]);

  // ✅ liste custom (contrats)
  const customList = useMemo<CapitalContractID[]>(() => {
    let out = [...customContracts].slice(0, 30);
    if (includeCapital) {
      out = out.filter((x) => x !== "capital");
      out.unshift("capital");
    } else {
      out = out.filter((x) => x !== "capital");
    }
    return out;
  }, [customContracts, includeCapital]);

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

  // ✅ helpers participants
  const totalSelected = selectedProfileIds.length + (botsEnabled ? selectedBotIds.length : 0);
  const remainingSlots = Math.max(0, players - totalSelected);

  function toggleLocalProfile(id: string) {
    const sid = String(id);
    setSelectedProfileIds((prev) => {
      // Profil actif toujours forcé
      const forced = activeProfileId ? String(activeProfileId) : null;
      const has = prev.includes(sid);

      if (has) {
        // on ne retire pas le profil actif
        if (forced && sid === forced) return prev;
        return prev.filter((x) => x !== sid);
      }

      // ajout : limiter au nombre de joueurs (en gardant place pour bots si activés)
      const maxProfiles = clampInt(players - (botsEnabled ? selectedBotIds.length : 0), 1, 8, 2);
      const out = [...prev, sid];
      // enforce active at front
      let normalized = out;
      if (forced) {
        normalized = normalized.filter((x) => x !== forced);
        normalized.unshift(forced);
      }
      return normalized.slice(0, maxProfiles);
    });
  }

  function setActiveProfile(id: string) {
    const sid = String(id);
    setActiveProfileId(sid);
    setSelectedProfileIds((prev) => {
      const without = prev.filter((x) => x !== sid);
      const out = [sid, ...without];
      // trim to players (minus bots)
      const maxProfiles = clampInt(players - (botsEnabled ? selectedBotIds.length : 0), 1, 8, 2);
      return out.slice(0, maxProfiles);
    });
  }

  function toggleBot(id: string) {
    const sid = String(id);
    if (!botsEnabled) return;
    setSelectedBotIds((prev) => {
      const has = prev.includes(sid);
      if (has) return prev.filter((x) => x !== sid);
      const maxBots = clampInt(players - selectedProfileIds.length, 0, 8, 0);
      return [...prev, sid].slice(0, maxBots);
    });
  }

  // auto-trim quand players change
  function onPlayersChange(next: number) {
    const p = clampInt(next, 1, 8, 2);
    setPlayers(p);
    // trim profiles
    setSelectedProfileIds((prev) => {
      const forced = activeProfileId ? String(activeProfileId) : null;
      let out = [...prev];
      if (forced) {
        out = out.filter((x) => x !== forced);
        out.unshift(forced);
      }
      const maxProfiles = clampInt(p - (botsEnabled ? selectedBotIds.length : 0), 1, 8, 2);
      return out.slice(0, maxProfiles);
    });
    // trim bots
    setSelectedBotIds((prev) => {
      const maxBots = botsEnabled ? clampInt(p - selectedProfileIds.length, 0, 8, 0) : 0;
      return prev.slice(0, maxBots);
    });
  }

  const payload: CapitalConfigPayload = useMemo(() => {
    return {
      players,
      activeProfileId,
      selectedProfileIds,
      selectedBotIds: botsEnabled ? selectedBotIds : [],
      botsEnabled,
      botLevel,
      mode,
      includeCapital,
      customContracts,
      startOrder,
      scoreInputMethod,
    };
  }, [
    players,
    activeProfileId,
    selectedProfileIds,
    selectedBotIds,
    botsEnabled,
    botLevel,
    mode,
    includeCapital,
    customContracts,
    startOrder,
    scoreInputMethod,
  ]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // ✅ fige la méthode de saisie choisie (ScoreInputHub lit SCORE_INPUT_LS_KEY)
    safeWriteScoreInputMethod(scoreInputMethod);

    if (props?.setTab) return props.setTab("capital_play", { config: payload });
    if (typeof props?.go === "function") return props.go("capital_play", { config: payload });
    if (typeof props?.onStart === "function") return props.onStart(payload);
  }

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      {/* ✅ PROFILS / PARTICIPANTS */}
      <Section title="Profils">
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
          Profil actif (joueur 1)
        </div>

        <ProfileMedallionCarousel
          items={profileItems}
          selectedIds={activeProfileId ? [String(activeProfileId)] : []}
          onToggle={(id) => setActiveProfile(id)}
          primary={primary}
          grayscaleInactive={true}
          padLeft={8}
        />

        <div style={{ marginTop: 12, marginBottom: 8, fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
          Participants (profils locaux) — {selectedProfileIds.length}/{Math.max(1, players - (botsEnabled ? selectedBotIds.length : 0))}
        </div>

        <ProfileMedallionCarousel
          items={profileItems}
          selectedIds={selectedProfileIds}
          onToggle={(id) => toggleLocalProfile(id)}
          primary={primary}
          grayscaleInactive={true}
          padLeft={8}
        />

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          Slots restants : {remainingSlots} {botsEnabled ? "(tu peux compléter avec des bots)" : ""}
        </div>
      </Section>

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect value={players} options={[1, 2, 3, 4, 5, 6, 7, 8]} onChange={onPlayersChange} />
        </OptionRow>

        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={(v) => {
            setBotsEnabled(v);
            if (!v) setSelectedBotIds([]);
          }} />
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

            <div style={{ marginTop: 6, marginBottom: 8, fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
              Sélection des bots — {selectedBotIds.length}/{Math.max(0, players - selectedProfileIds.length)}
            </div>

            <ProfileMedallionCarousel
              items={botItems}
              selectedIds={selectedBotIds}
              onToggle={(id) => toggleBot(id)}
              primary={primary}
              grayscaleInactive={true}
              padLeft={8}
            />
          </>
        )}
      </Section>

      {/* ✅ OPTIONS DE PARTIE */}
      <Section title="Réglages de partie">
        <OptionRow label="Ordre de départ">
          <OptionSelect
            value={startOrder}
            options={[
              { value: "random", label: "Aléatoire" },
              { value: "fixed", label: "Ordre défini (sélection)" },
            ]}
            onChange={setStartOrder}
          />
        </OptionRow>

        <OptionRow label="Mode de saisie">
          <OptionSelect
            value={scoreInputMethod}
            options={[
              { value: "keypad", label: "Keypad" },
              { value: "dartboard", label: "Cible (dartboard)" },
              { value: "presets", label: "Presets (barre)" },
            ]}
            onChange={setScoreInputMethod as any}
          />
        </OptionRow>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
          Astuce : tu peux masquer les onglets en match (ScoreInputHub) et figer la méthode via ce menu.
        </div>
      </Section>

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

        {/* ✅ aperçu OFFICIEL (pour que ce ne soit pas "vide") */}
        {mode === "official" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Séquence officielle (15 contrats)</div>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {OFFICIAL_CONTRACTS.map((id, idx) => (
                <div
                  key={id}
                  style={{
                    borderRadius: 14,
                    padding: "10px 10px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>#{idx + 1}</div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {labelOf(id)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>✔</div>
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

            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>Ordre actuel ({customList.length} contrats) :</div>

            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {customList.map((id, idx) => {
                const locked = id === "capital" && includeCapital;
                return (
                  <div
                    key={`${id}-${idx}`}
                    style={{
                      borderRadius: 14,
                      padding: "10px 10px",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>#{idx + 1}</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
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
                          setCustomContracts(() => {
                            const list = customList.filter((x) => x !== "capital");
                            const mapped = includeCapital ? idx - 1 : idx;
                            if (mapped <= 0) return list as any;
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
                          setCustomContracts(() => {
                            const list = customList.filter((x) => x !== "capital");
                            const mapped = includeCapital ? idx - 1 : idx;
                            if (mapped < 0 || mapped >= list.length - 1) return list as any;
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
                          setCustomContracts(() => {
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
                  setCustomContracts(() => {
                    const base = customList.filter((x) => x !== "capital");
                    if (base.includes(addPick)) return base as any;
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

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Astuce : garde “Capital” en 1er, sinon tout le monde démarre à 0 (et le /2 ne sert à rien).
            </div>
          </>
        )}
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
