import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerCapital from "../assets/tickers/ticker_capital.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type BotLevel = "easy" | "normal" | "hard";
export type CapitalModeKind = "official" | "custom";

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
  botsEnabled: boolean;
  botLevel: BotLevel;

  mode: CapitalModeKind;
  customContracts?: CapitalContractID[];
  includeCapital?: boolean;
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
    case "capital": return "Capital";
    case "n20": return "20 (au moins un 20)";
    case "triple_any": return "Triple (au moins un triple)";
    case "n19": return "19 (au moins un 19)";
    case "double_any": return "Double (au moins un double)";
    case "n18": return "18 (au moins un 18)";
    case "side": return "Side (3 secteurs côte à côte)";
    case "n17": return "17 (au moins un 17)";
    case "suite": return "Suite (3 numéros consécutifs)";
    case "n16": return "16 (au moins un 16)";
    case "colors_3": return "Couleur (3 couleurs différentes)";
    case "n15": return "15 (au moins un 15)";
    case "exact_57": return "57 (total exact)";
    case "n14": return "14 (au moins un 14)";
    case "center": return "Centre (25 ou 50)";
    default: return String(id);
  }
}

export default function CapitalConfig(props: any) {
  const { t } = useLang();
  useTheme();

  const [players, setPlayers] = useState<number>(2);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");

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

  const payload: CapitalConfigPayload = useMemo(() => {
    return {
      players,
      botsEnabled,
      botLevel,
      mode,
      includeCapital,
      customContracts,
    };
  }, [players, botsEnabled, botLevel, mode, includeCapital, customContracts]);

  const customList = useMemo<CapitalContractID[]>(() => {
    let out = [...customContracts];
    // sécurité : max 30
    out = out.slice(0, 30);
    if (includeCapital) {
      out = out.filter((x) => x !== "capital");
      out.unshift("capital");
    } else {
      out = out.filter((x) => x !== "capital");
    }
    return out;
  }, [customContracts, includeCapital]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // App.tsx wiring: tab "capital_play"
    if (props?.setTab) return props.setTab("capital_play", { config: payload });
  }

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

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect value={players} options={[1, 2, 3, 4, 5, 6, 7, 8]} onChange={setPlayers} />
        </OptionRow>

        <OptionRow label={t("config.bots", "Bots")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
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
        )}
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

        {mode === "custom" && (
          <>
            <OptionRow label={`Inclure le contrat "Capital" en 1er`}>
              <OptionToggle value={includeCapital} onChange={setIncludeCapital} />
            </OptionRow>

            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
              Ordre actuel ({customList.length} contrats) :
            </div>

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
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                        #{idx + 1}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {labelOf(id)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        disabled={idx === 0 || locked}
                        onClick={() => {
                          setCustomContracts((prev) => {
                            // prev n'inclut pas forcément capital; on reconstruit sur customList sans capital lock
                            const list = customList.filter((x) => x !== "capital");
                            // idx in customList; map to list index (sans capital)
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
