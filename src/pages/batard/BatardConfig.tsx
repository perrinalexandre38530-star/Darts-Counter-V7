// @ts-nocheck
// =============================================================
// src/pages/batard/BatardConfig.tsx
// BÂTARD — Config V7 (align GolfConfig / X01ConfigV3)
// - 2 carrousels : PROFILS humains (actif + locaux) + BOTS PRO (toggle)
// - KPIs en tête (joueurs, règles, séquence)
// - Séquence compacte (chips) + éditeur round sélectionné
// - InfoDot mini sur chaque option + InfoDot global (header)
// =============================================================

import React from "react";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import OptionRow from "../../components/OptionRow";
import OptionToggle from "../../components/OptionToggle";
import OptionSelect from "../../components/OptionSelect";
import ProfileAvatar from "../../components/ProfileAvatar";

import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";

import tickerBatard from "../../assets/tickers/ticker_bastard.png";

import type {
  BatardConfig as BatardRulesConfig,
  BatardFailPolicy,
  BatardMultiplierRule,
  BatardRound,
  BatardWinMode,
} from "../../lib/batard/batardTypes";
import {
  classicPreset,
  progressifPreset,
  punitionPreset,
} from "../../lib/batard/batardPresets";

import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function isBotProfile(p: any) {
  if (!p) return false;
  if (p.isBot === true) return true;
  if (p.kind === "bot" || p.type === "bot") return true;
  const id = String(p.id ?? "");
  if (id.startsWith("bot_")) return true;
  return false;
}

function roundShort(r: BatardRound) {
  if (!r) return "";
  if ((r as any).bullOnly || (r as any).type === "TARGET_BULL") return "BULL";
  const trg = (r as any).target;
  const m = (r as any).multiplierRule || "ANY";
  const mChar =
    m === "SINGLE" ? "S" : m === "DOUBLE" ? "D" : m === "TRIPLE" ? "T" : "A";
  if (typeof trg === "number" && trg > 0) return `${mChar}${trg}`;
  return m === "DOUBLE" ? "D(any)" : m === "TRIPLE" ? "T(any)" : "ANY";
}

const WIN_LABEL: Record<BatardWinMode, string> = {
  SCORE_MAX: "Score max",
  RACE_TO_FINISH: "Course (finish)",
};

const FAIL_LABEL: Record<BatardFailPolicy, string> = {
  NONE: "Aucun",
  MINUS_POINTS: "Malus",
  BACK_ROUND: "Recul",
  FREEZE: "Freeze",
};

export type BatardConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: "easy" | "normal" | "hard";
  batard: BatardRulesConfig;
  presetId: "classic" | "progressif" | "punition" | "custom";
  selectedHumanIds?: string[];
  selectedBotIds?: string[];
};

const INFO_TEXT = `BÂTARD (mode variantes)

📌 Principe
- Une partie est une suite de "rounds" (défis) : ex. Simple 20, Double 20, Bull, Any…
- Chaque round définit ce qui est "valide" (cible + multiplicateur, ou bull only).
- Le score / la progression dépend du mode de victoire + des règles d’échec.

⚙️ Presets
- Classic (Bar) : séquence courte + Score max
- Progressif : progression + course au finish
- Punition : contraintes + malus

🧩 Custom
- Déverrouille l’édition : séquence + options (victoire / échec).

🏁 Victoire
- Score max : on joue toute la séquence → meilleur total.
- Course (finish) : premier à terminer la séquence gagne.

💥 Échec (0 valide)
- Aucun : rien
- Malus : -X points
- Recul : -Y rounds
- Freeze : rejouer le même round
`;

const INFO_SEQUENCE = `Séquence = liste de rounds (défis)

Chaque round a :
- Label : nom lisible (ex "Double 20")
- Multiplier : ANY / SINGLE / DOUBLE / TRIPLE
- Target : 1..20 ou libre (si vide = "n'importe quel numéro")
- Bull only : si activé, seules les touches Bull (25/50) valident

Chips (résumé rapide) :
- S20 = simple 20
- D20 = double 20
- T20 = triple 20
- BULL = bull (25/50)
- ANY / D(any) / T(any) = libre + contrainte multiplicateur

En preset : la séquence est verrouillée.
Passe en Custom pour modifier (ajout, suppression, déplacement, duplication).`;

export default function BatardConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles)
    ? (store as any).profiles
    : [];

  const humanProfiles = storeProfiles.filter((p) => !isBotProfile(p));
  const activeProfileId = (store as any)?.activeProfileId ?? null;

  const primary = (theme as any)?.primary ?? "#7dffca";
  const cardBg =
    "radial-gradient(120% 160% at 0% 0%, rgba(125,255,202,0.14), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.34))";

  // -----------------------------------------------------------
  // Preset / Rules state
  // -----------------------------------------------------------
  const [presetId, setPresetId] = React.useState<
    "classic" | "progressif" | "punition" | "custom"
  >("classic");

  const presetCfg = React.useMemo(() => {
    if (presetId === "progressif") return progressifPreset;
    if (presetId === "punition") return punitionPreset || classicPreset;
    return classicPreset;
  }, [presetId]);

  const [customEnabled, setCustomEnabled] = React.useState(false);

  const [winMode, setWinMode] = React.useState<BatardWinMode>(
    presetCfg.winMode
  );
  const [failPolicy, setFailPolicy] = React.useState<BatardFailPolicy>(
    presetCfg.failPolicy
  );
  const [failValue, setFailValue] = React.useState<number>(
    presetCfg.failValue ?? 0
  );
  const [rounds, setRounds] = React.useState<BatardRound[]>(
    presetCfg.rounds || []
  );

  React.useEffect(() => {
    if (presetId === "custom") return;
    setCustomEnabled(false);
    setWinMode(presetCfg.winMode);
    setFailPolicy(presetCfg.failPolicy);
    setFailValue(presetCfg.failValue ?? 0);
    setRounds(presetCfg.rounds || []);
  }, [presetId, presetCfg]);

  const editingEnabled = presetId === "custom" || customEnabled;

  // -----------------------------------------------------------
  // Players / Bots selection
  // -----------------------------------------------------------
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<"easy" | "normal" | "hard">(
    "normal"
  );

  const [selectedHumanIds, setSelectedHumanIds] = React.useState<string[]>([]);
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);

  // Seed default selection: active profile first, then next humans until 2.
  React.useEffect(() => {
    // If already selected, keep.
    if (selectedHumanIds.length > 0) return;

    const ids = humanProfiles.map((p) => String(p.id));
    if (ids.length === 0) return;

    const out: string[] = [];
    if (activeProfileId != null) {
      const a = String(activeProfileId);
      if (ids.includes(a)) out.push(a);
    }
    for (const id of ids) {
      if (out.length >= 2) break;
      if (!out.includes(id)) out.push(id);
    }
    if (out.length) setSelectedHumanIds(out);
  }, [humanProfiles.length, activeProfileId]);

  function toggleHuman(id: string) {
    setSelectedHumanIds((prev) => {
      const on = prev.includes(id);
      if (on) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }

  function toggleBot(id: string) {
    setSelectedBotIds((prev) => {
      const on = prev.includes(id);
      if (on) return prev.filter((x) => x !== id);
      // global max 8
      if (prev.length + selectedHumanIds.length >= 8) return prev;
      return [...prev, id];
    });
  }

  const playersCount = selectedHumanIds.length + (botsEnabled ? selectedBotIds.length : 0);

  // -----------------------------------------------------------
  // Sequence UI helpers
  // -----------------------------------------------------------
  const [selectedRoundIndex, setSelectedRoundIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedRoundIndex((i) =>
      Math.max(0, Math.min(i, Math.max(0, rounds.length - 1)))
    );
  }, [rounds.length]);

  function addRound() {
    setRounds((prev) => [
      ...prev,
      {
        id: uid(),
        label: "Score Max",
        multiplierRule: "ANY",
      } as any,
    ]);
    // select last
    setSelectedRoundIndex(rounds.length);
  }

  function dupRound(i: number) {
    setRounds((prev) => {
      const r = prev[i];
      if (!r) return prev;
      const copy: BatardRound = {
        ...(r as any),
        id: uid(),
        label: ((r as any).label || "Round") + " (copy)",
      } as any;
      const out = [...prev];
      out.splice(i + 1, 0, copy);
      return out;
    });
    setSelectedRoundIndex(i + 1);
  }

  function removeRound(i: number) {
    setRounds((prev) => prev.filter((_, idx) => idx !== i));
    setSelectedRoundIndex((cur) => (cur > 0 ? cur - 1 : 0));
  }

  function moveRound(i: number, dir: -1 | 1) {
    setRounds((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const out = [...prev];
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
      return out;
    });
    setSelectedRoundIndex((cur) =>
      Math.max(0, Math.min(rounds.length - 1, cur + dir))
    );
  }

  function updateRound(i: number, patch: Partial<BatardRound>) {
    setRounds((prev) =>
      prev.map((r, idx) =>
        idx === i ? ({ ...(r as any), ...(patch as any) } as any) : r
      )
    );
  }

  // -----------------------------------------------------------
  // Payload + Start
  // -----------------------------------------------------------
  const rulesCfg: BatardRulesConfig = React.useMemo(() => {
    return {
      winMode,
      failPolicy,
      failValue,
      rounds,
      scoreOnlyValid: true,
      minValidHitsToAdvance: 1,
    } as any;
  }, [winMode, failPolicy, failValue, rounds]);

  const payload: BatardConfigPayload = React.useMemo(() => {
    return {
      players: Math.max(0, playersCount),
      botsEnabled,
      botLevel,
      presetId,
      batard: rulesCfg,
      selectedHumanIds,
      selectedBotIds: botsEnabled ? selectedBotIds : [],
    };
  }, [playersCount, botsEnabled, botLevel, presetId, rulesCfg, selectedHumanIds, selectedBotIds]);

  function start() {
    if (playersCount < 2) return;
    if (props?.setTab) return props.setTab("batard_play", { config: payload, store });
  }

  // -----------------------------------------------------------
  // Render helpers (KPI)
  // -----------------------------------------------------------
  const kpiStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 10,
  } as const;

  const kpiCard = {
    borderRadius: 14,
    padding: "10px 12px",
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  } as const;

  const selectedRound = rounds[selectedRoundIndex];

  return (
    <div style={{ minHeight: "100vh", background: (theme as any)?.bg ?? "#0b0d14" }}>
      <PageHeader
        title=""
        subtitle=""
        left={<BackDot onClick={() => (props?.setTab ? props.setTab("games") : null)} />}
        right={<InfoDot title="Règles BÂTARD" content={INFO_TEXT} />}
        tickerSrc={tickerBatard}
        tickerAlt="BÂTARD"
        tickerHeight={92}
      />

      <div style={{ padding: "10px 12px 90px" }}>
        {/* KPIs */}
        <div style={kpiStyle}>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 800 }}>JOUEURS</div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>{playersCount}/8</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {botsEnabled ? `${selectedHumanIds.length} humains + ${selectedBotIds.length} bots` : `${selectedHumanIds.length} humains`}
            </div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 800 }}>RÈGLES</div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{WIN_LABEL[winMode]}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Échec: {FAIL_LABEL[failPolicy]}</div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 800 }}>SÉQUENCE</div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>{rounds.length}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{editingEnabled ? "custom" : "preset"}</div>
          </div>
        </div>

        {/* JOUEURS */}
        <Section title={t("players") || "JOUEURS"}>
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
                Sélection : {playersCount}/8 — min 2
              </div>
              <InfoDot
                title="Sélection joueurs"
                content="Tape un médaillon pour sélectionner/désélectionner. Max 8 joueurs. Tu peux mixer humains + bots."
                kind="mini" />
            </div>

            {/* Humans carousel (actif + locaux) */}
            {humanProfiles.length > 0 ? (
              <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10 }}>
                {humanProfiles.map((p) => {
                  const id = String(p.id);
                  const active = selectedHumanIds.includes(id);
                  const isActiveProfile = activeProfileId != null && String(activeProfileId) === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleHuman(id)}
                      style={{
                        minWidth: 96,
                        maxWidth: 96,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                      title={isActiveProfile ? "Profil actif" : ""}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                          background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: isActiveProfile ? `2px solid rgba(255,215,120,0.95)` : "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            overflow: "hidden",
                            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                            opacity: active ? 1 : 0.6,
                            transition: "filter .2s ease, opacity .2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} showStars={false} />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: "center",
                          color: active ? "#f6f2e9" : "#7e8299",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name || "Joueur"}
                      </div>

                      {isActiveProfile && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 9,
                            fontWeight: 900,
                            letterSpacing: 0.7,
                            textTransform: "uppercase",
                            background: "radial-gradient(circle at 30% 0, #ffe7a8, #ffb000)",
                            color: "#1a1205",
                            boxShadow: "0 0 10px rgba(255,176,0,0.45)",
                            border: "1px solid rgba(255,230,170,0.9)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ACTIF
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "8px 2px", fontSize: 12, opacity: 0.8 }}>
                Aucun profil local trouvé. Va dans <b>Profils</b> pour en créer (ou connecte-toi pour avoir le profil actif).
              </div>
            )}

            {/* Bots toggle + carousel (PRO) */}
            <OptionRow
              label="Bots IA"
              hint="Ajoute des bots PRO (prédéfinis)."
              right={<InfoDot title="Bots IA" content="Active pour afficher le carrousel des bots. Tu peux mixer humains + bots (max 8 joueurs)." kind="mini" />}
            >
              <OptionToggle value={botsEnabled} onChange={(v) => { setBotsEnabled(v); if (!v) setSelectedBotIds([]); }} />
            </OptionRow>

            {botsEnabled && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <OptionRow
                  label="Niveau bot"
                  hint="Difficulté globale des bots."
                  right={<InfoDot title="Niveau bot" content="Ce niveau sert à régler la difficulté globale (si l'engine en tient compte). Les bots PRO restent visibles." kind="mini" />}
                >
                  <OptionSelect
                    value={botLevel}
                    onChange={(v) => setBotLevel(v)}
                    options={[
                      { label: "Facile", value: "easy" },
                      { label: "Normal", value: "normal" },
                      { label: "Difficile", value: "hard" },
                    ]}
                  />
                </OptionRow>

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    overflowY: "visible",
                    paddingBottom: 10,
                    paddingTop: 10,
                  }}
                  className="dc-scroll-thin"
                >
                  {PRO_BOTS.map((b: any) => {
                    const id = String(b.id);
                    const active = selectedBotIds.includes(id);
                    const avatar = getProBotAvatar(b.avatarKey);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleBot(id)}
                        style={{
                          minWidth: 96,
                          maxWidth: 96,
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 78,
                            height: 78,
                            borderRadius: "50%",
                            overflow: "hidden",
                            boxShadow: active ? `0 0 26px rgba(255,192,0,0.65)` : "0 0 14px rgba(0,0,0,0.65)",
                            background: active
                              ? "radial-gradient(circle at 30% 20%, #fff7cc, #ffb000)"
                              : "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.16), rgba(0,0,0,0.55))",
                            border: active ? "2px solid rgba(255,215,120,0.95)" : "1px solid rgba(255,255,255,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              overflow: "hidden",
                              filter: active ? "none" : "grayscale(60%) brightness(0.75)",
                              opacity: active ? 1 : 0.85,
                            }}
                          >
                            <ProfileAvatar
                              profile={{ id: b.id, name: b.name, avatar }}
                              size={78}
                              showStars={false}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textAlign: "center",
                            color: active ? "#f6f2e9" : "#7e8299",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.name}
                        </div>

                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 9,
                            fontWeight: 900,
                            letterSpacing: 0.7,
                            textTransform: "uppercase",
                            background: "radial-gradient(circle at 30% 0, #ffe7a8, #ffb000)",
                            color: "#1a1205",
                            boxShadow: "0 0 10px rgba(255,176,0,0.45)",
                            border: "1px solid rgba(255,230,170,0.9)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          PRO
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* RÈGLES */}
        <Section title="RÈGLES">
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <OptionRow
              label="Preset"
              hint="Choisis une base, puis passe en Custom pour modifier."
              right={<InfoDot title="Preset" content="Classic / Progressif / Punition appliquent une séquence + règles. Custom déverrouille l’édition." kind="mini" />}
            >
              <OptionSelect
                value={presetId}
                onChange={(v) => setPresetId(v)}
                options={[
                  { label: "Classic (Bar)", value: "classic" },
                  { label: "Progressif", value: "progressif" },
                  { label: "Punition", value: "punition" },
                  { label: "Custom", value: "custom" },
                ]}
              />
            </OptionRow>

            <OptionRow
              label="Mode Custom"
              hint="Déverrouille l’édition (séquence + options)."
              right={<InfoDot title="Custom" content="Active pour éditer la séquence et les options. En preset, la séquence reste verrouillée." kind="mini" />}
            >
              <OptionToggle value={customEnabled || presetId === "custom"} onChange={(v) => setCustomEnabled(v)} />
            </OptionRow>

            <OptionRow
              label="Condition de victoire"
              hint="Score max ou course au finish."
              right={<InfoDot title="Victoire" content="Score max: meilleur total à la fin. Course: premier à terminer la séquence." kind="mini" />}
            >
              <OptionSelect
                value={winMode}
                onChange={(v) => setWinMode(v)}
                options={[
                  { label: "Score max", value: "SCORE_MAX" },
                  { label: "Course (finish)", value: "RACE_TO_FINISH" },
                ]}
              />
            </OptionRow>

            <OptionRow
              label="Échec (0 valide)"
              hint="Que faire si aucune flèche ne valide le round."
              right={<InfoDot title="Échec" content="Aucun: rien. Malus: -X points. Recul: -Y rounds. Freeze: rejouer le round." kind="mini" />}
            >
              <OptionSelect
                value={failPolicy}
                onChange={(v) => setFailPolicy(v)}
                options={[
                  { label: "Aucun", value: "NONE" },
                  { label: "Malus (-X)", value: "MINUS_POINTS" },
                  { label: "Recul (-Y rounds)", value: "BACK_ROUND" },
                  { label: "Freeze (rejouer)", value: "FREEZE" },
                ]}
              />
            </OptionRow>

            {(failPolicy === "MINUS_POINTS" || failPolicy === "BACK_ROUND") && (
              <OptionRow
                label={failPolicy === "MINUS_POINTS" ? "Valeur malus" : "Recul rounds"}
                hint="Ajuste la valeur (X ou Y)."
                right={<InfoDot title="Valeur" content="Pour Malus: X points retirés. Pour Recul: Y rounds de retour." kind="mini" />}
              >
                <input
                  type="number"
                  value={failValue}
                  onChange={(e) =>
                    setFailValue(Math.max(0, Number(e.target.value || 0)))
                  }
                  style={{
                    width: 120,
                    height: 44,
                    borderRadius: 14,
                    padding: "0 12px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.22)",
                    color: "rgba(255,255,255,0.92)",
                    outline: "none",
                  }}
                />
              </OptionRow>
            )}
          </div>
        </Section>

        {/* SÉQUENCE */}
        <Section
          title="SÉQUENCE (ROUNDS)"
          right={<InfoDot title="Séquence" content={INFO_SEQUENCE} kind="mini" />}
        >
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 10, lineHeight: 1.25 }}>
              {!editingEnabled ? (
                <>
                  En preset, la séquence est verrouillée. Active <b>Custom</b> pour modifier.
                </>
              ) : (
                <>
                  Tape un chip pour éditer le round. Les chips résument la cible (S/D/T/BULL/ANY).
                </>
              )}
            </div>

            {/* Compact chips */}
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
              {rounds.map((r, i) => {
                const active = i === selectedRoundIndex;
                const short = roundShort(r);
                return (
                  <div
                    key={(r as any).id || i}
                    role="button"
                    onClick={() => setSelectedRoundIndex(i)}
                    style={{
                      flexShrink: 0,
                      minWidth: 62,
                      height: 44,
                      padding: "0 12px",
                      borderRadius: 14,
                      border: active ? `1px solid ${primary}aa` : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? `linear-gradient(180deg, rgba(125,255,202,0.22), rgba(0,0,0,0.28))`
                        : "rgba(0,0,0,0.18)",
                      boxShadow: active ? `0 0 18px ${primary}55` : "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title={(r as any).label || ""}
                  >
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900 }}>#{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.4 }}>{short}</div>
                  </div>
                );
              })}
            </div>

            {/* Round editor */}
            {selectedRound && (
              <div style={{ marginTop: 10, borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 13 }}>
                    Round #{selectedRoundIndex + 1} — {(selectedRound as any).label || "Round"}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="dc-btn" onClick={() => moveRound(selectedRoundIndex, -1)} disabled={!editingEnabled || selectedRoundIndex === 0}>
                      ↑
                    </button>
                    <button className="dc-btn" onClick={() => moveRound(selectedRoundIndex, +1)} disabled={!editingEnabled || selectedRoundIndex >= rounds.length - 1}>
                      ↓
                    </button>
                    <button className="dc-btn" onClick={() => dupRound(selectedRoundIndex)} disabled={!editingEnabled}>
                      Dupliquer
                    </button>
                    <button className="dc-btn-danger" onClick={() => removeRound(selectedRoundIndex)} disabled={!editingEnabled || rounds.length <= 1}>
                      Supprimer
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850, marginBottom: 6 }}>Label</div>
                    <input
                      value={(selectedRound as any).label || ""}
                      onChange={(e) => updateRound(selectedRoundIndex, { label: e.target.value } as any)}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 14,
                        padding: "0 12px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.22)",
                        color: "rgba(255,255,255,0.92)",
                        outline: "none",
                      }}
                      placeholder="Ex: Double 20"
                      disabled={!editingEnabled}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850, marginBottom: 6 }}>Multiplier</div>
                    <select
                      value={((selectedRound as any).multiplierRule || "ANY") as BatardMultiplierRule}
                      onChange={(e) => updateRound(selectedRoundIndex, { multiplierRule: e.target.value as any } as any)}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 14,
                        padding: "0 12px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.22)",
                        color: "rgba(255,255,255,0.92)",
                        outline: "none",
                      }}
                      disabled={!editingEnabled}
                    >
                      <option value="ANY">ANY</option>
                      <option value="SINGLE">SINGLE</option>
                      <option value="DOUBLE">DOUBLE</option>
                      <option value="TRIPLE">TRIPLE</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850, marginBottom: 6 }}>Target</div>
                    <select
                      value={String((selectedRound as any).target ?? "")}
                      onChange={(e) =>
                        updateRound(selectedRoundIndex, {
                          target: e.target.value ? Number(e.target.value) : undefined,
                        } as any)
                      }
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 14,
                        padding: "0 12px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.22)",
                        color: "rgba(255,255,255,0.92)",
                        outline: "none",
                      }}
                      disabled={!editingEnabled}
                    >
                      <option value="">(libre)</option>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <OptionRow
                      label="Bull only"
                      hint="Cible bull uniquement (25/50)."
                      right={<InfoDot title="Bull only" content="Si activé, seules les touches Bull (25/50) valident ce round." kind="mini" />}
                    >
                      <OptionToggle
                        value={Boolean((selectedRound as any).bullOnly)}
                        onChange={(v) => updateRound(selectedRoundIndex, { bullOnly: v } as any)}
                        disabled={!editingEnabled}
                      />
                    </OptionRow>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button className="dc-btn" onClick={addRound} disabled={!editingEnabled}>
                    + Ajouter un round
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Start bar */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 12px",
            background:
              "linear-gradient(180deg, rgba(11,13,20,0), rgba(11,13,20,0.92) 35%, rgba(11,13,20,0.98))",
          }}
        >
          <button
            onClick={start}
            disabled={playersCount < 2}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background:
                playersCount < 2
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(90deg, ${primary}aa, rgba(255,255,255,0.10))`,
              color: playersCount < 2 ? "rgba(255,255,255,0.35)" : "#0b0d14",
              fontWeight: 950,
              letterSpacing: 0.4,
              boxShadow: playersCount < 2 ? "none" : `0 10px 28px ${primary}30`,
              cursor: playersCount < 2 ? "not-allowed" : "pointer",
            }}
          >
            Démarrer la partie
          </button>
        </div>
      </div>
    </div>
  );
}
