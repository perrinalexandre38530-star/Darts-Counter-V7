// @ts-nocheck
// =============================================================
// src/pages/batard/BatardConfig.tsx
// BÂTARD — Config V7 (align GolfConfig / X01ConfigV3)
// - 2 carrousels : PROFILS humains (actif + locaux) + BOTS PRO (toggle)
// - KPIs en tête (joueurs, règles, séquence)
// - Séquence compacte (chips) + éditeur round sélectionné
// - InfoMini “style Territories” : bouton i + panneau full-width sous la ligne
// - InfoDot global (header)
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

// -------------------------------------------------------------
// Info texts — version précise
// -------------------------------------------------------------
const INFO_TEXT = `BÂTARD — règles (clair & concret)

1) Ce que tu configures ici
- Tu choisis une LISTE DE ROUNDS (la “séquence”).
- Chaque round définit QUELLES FLÈCHES comptent comme “valides”.
- Selon le mode de victoire, la partie se termine différemment.

2) Comment se joue un round
- Une flèche est “valide” si elle respecte :
  A) le multiplier (ANY / SINGLE / DOUBLE / TRIPLE)
  B) et éventuellement la target (1..20) ou Bull-only.
- Si tu fais 0 flèche valide sur tout le round → on applique “Échec (0 valide)”.

3) Preset vs Custom
- Preset : séquence + règles prédéfinies (verrouillées).
- Custom : tu peux éditer (ajout / suppression / déplacement / duplication).

4) Victoire
- Score max : on joue toute la séquence → meilleur total gagne.
- Course (finish) : le 1er qui termine la séquence gagne.

5) Échec (0 valide)
- Aucun : rien.
- Malus : -X points.
- Recul : -Y rounds.
- Freeze : rejouer le round.`;

const TXT_PRESET = `Preset = configuration “packagée”.

Classic (Bar)
- Séquence courte & simple.
- Idéal pour jouer au bar en Score max.

Progressif
- Séquence pensée “progression”.
- Marche très bien en Course (finish).

Punition
- Plus punitif (échec plus impactant selon preset).

Custom
- Tu règles tout à la main : séquence + options.`;

const TXT_CUSTOM = `Mode Custom = déverrouillage.

OFF
- Tu peux LIRE la séquence, mais pas la modifier.

ON
- Tu peux : ajouter / supprimer / déplacer / dupliquer des rounds.
- Tu peux éditer : label / multiplier / target / bull-only.`;

const TXT_WIN = `Condition de victoire = fin de partie.

Score max
- On joue TOUS les rounds.
- Le meilleur total gagne.

Course (finish)
- Objectif : terminer la séquence.
- Le 1er qui atteint le dernier round gagne.`;

const TXT_FAIL = `Échec (0 valide) = règle appliquée si tu fais ZÉRO flèche valide sur le round.

Aucun
- Rien ne se passe.

Malus (-X)
- Tu perds X points.

Recul (-Y rounds)
- Tu recules de Y rounds dans la séquence.

Freeze (rejouer)
- Tu restes sur le même round (tu le rejoues).`;

const TXT_FAIL_VALUE = `Valeur = le X ou le Y.

Si “Malus (-X)”
- X = nombre de points retirés.

Si “Recul (-Y rounds)”
- Y = nombre de rounds de retour.`;

const TXT_SEQUENCE = `Séquence = liste ORDONNÉE de rounds.

Chips (résumé)
- S20 / D20 / T20 = simple/double/triple 20
- BULL = bull (25/50)
- ANY = libre
- D(any) = n’importe quelle double
- T(any) = n’importe quelle triple

Éditeur (round sélectionné)
- Label : nom (visuel seulement)
- Multiplier : contrainte S/D/T/ANY
- Target : vide = libre (1..20), sinon numéro imposé
- Bull only : uniquement Bull (25/50)

Verrouillage
- En preset (Custom OFF) → séquence verrouillée.
- Active Mode Custom pour modifier.`;

const TXT_R_LABEL = `Label = nom du round.

Impact : VISUEL uniquement.
Exemples : “Double 20”, “Bull”, “Any triple”…`;

const TXT_R_MULT = `Multiplier = contrainte sur le multiplicateur.

ANY : simple/double/triple acceptés
SINGLE : uniquement simples
DOUBLE : uniquement doubles
TRIPLE : uniquement triples`;

const TXT_R_TARGET = `Target = numéro imposé.

Vide : n’importe quel numéro (1..20)
20 : seulement le 20 (avec la contrainte Multiplier)

Exemples
- DOUBLE + 20 = D20 uniquement
- DOUBLE + (vide) = n’importe quelle double`;

const TXT_R_BULL = `Bull only

ON : seules les touches Bull (25/50) valident ce round.
Usage : round “BULL” pur (souvent en fin de séquence).`;

// -------------------------------------------------------------
// InfoMini “style Territories” (bouton + panneau sous la ligne)
// -------------------------------------------------------------
function InfoMiniBtn({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? "Info"}
      aria-label={title ?? "Info"}
      style={{
        width: 26,
        height: 26,
        borderRadius: 10,
        border: active
          ? "1px solid rgba(255,210,110,0.8)"
          : "1px solid rgba(255,255,255,0.14)",
        background: active
          ? "radial-gradient(circle at 30% 20%, rgba(255,230,170,0.34), rgba(0,0,0,0.18))"
          : "rgba(0,0,0,0.20)",
        color: active ? "#ffe4a8" : "rgba(255,255,255,0.78)",
        fontWeight: 950,
        fontSize: 12,
        lineHeight: "26px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: active
          ? "0 0 14px rgba(255,185,70,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.06)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      i
    </button>
  );
}

function InfoMiniPanel({ open, text }: { open: boolean; text: string }) {
  return (
    <div
      style={{
        maxHeight: open ? 260 : 0,
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height .20s ease, opacity .16s ease",
      }}
    >
      <div
        style={{
          marginTop: 8,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.36))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          fontSize: 12,
          lineHeight: 1.25,
          color: "rgba(255,255,255,0.84)",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}

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
  const bg = (theme as any)?.bg ?? "#0b0d14";
  const cardBg =
    "radial-gradient(120% 160% at 0% 0%, rgba(125,255,202,0.14), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.34))";

  // -----------------------------------------------------------
  // InfoMini open state (one at a time)
  // -----------------------------------------------------------
  const [openInfoId, setOpenInfoId] = React.useState<string | null>(null);
  const toggleInfo = (id: string) =>
    setOpenInfoId((cur) => (cur === id ? null : id));

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
  const [winMode, setWinMode] = React.useState<BatardWinMode>(presetCfg.winMode);
  const [failPolicy, setFailPolicy] = React.useState<BatardFailPolicy>(
    presetCfg.failPolicy
  );
  const [failValue, setFailValue] = React.useState<number>(presetCfg.failValue ?? 0);
  const [rounds, setRounds] = React.useState<BatardRound[]>(presetCfg.rounds || []);

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
      if (prev.length + selectedHumanIds.length >= 8) return prev;
      return [...prev, id];
    });
  }

  const playersCount =
    selectedHumanIds.length + (botsEnabled ? selectedBotIds.length : 0);

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
        label: "Round",
        multiplierRule: "ANY",
      } as any,
    ]);
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
  }, [
    playersCount,
    botsEnabled,
    botLevel,
    presetId,
    rulesCfg,
    selectedHumanIds,
    selectedBotIds,
  ]);

  function start() {
    if (playersCount < 2) return;
    if (props?.setTab) return props.setTab("batard_play", { config: payload, store });
  }

  // -----------------------------------------------------------
  // Render helpers
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

  const chipBase = {
    flexShrink: 0,
    minWidth: 66,
    height: 46,
    padding: "0 12px",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
  } as const;

  const chipActive = {
    border: `1px solid ${primary}cc`,
    background: `radial-gradient(120% 150% at 30% 20%, rgba(125,255,202,0.22), rgba(0,0,0,0.28))`,
    boxShadow: `0 0 18px ${primary}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
  } as const;

  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      <PageHeader
        title={""}
        subtitle={""}
        left={
          <BackDot onClick={() => (props?.setTab ? props.setTab("games") : null)} />
        }
        right={<InfoDot title="BÂTARD — règles" content={INFO_TEXT} />}
        tickerSrc={tickerBatard}
        tickerAlt="BÂTARD"
        tickerHeight={92}
      />

      <div style={{ padding: "10px 12px 92px" }}>
        {/* KPIs */}
        <div style={kpiStyle}>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 800 }}>JOUEURS</div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>{playersCount}/8</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {botsEnabled
                ? `${selectedHumanIds.length} humains + ${selectedBotIds.length} bots`
                : `${selectedHumanIds.length} humains`}
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
              <InfoMiniBtn active={openInfoId === "players"} onClick={() => toggleInfo("players")} title="Aide sélection" />
            </div>
            <InfoMiniPanel
              open={openInfoId === "players"}
              text={`Sélection joueurs\n\n- Tape un médaillon pour ajouter/retirer\n- Max 8 joueurs (humains + bots)\n- Badge ACTIF = profil actif de l'app (repère visuel)`}
            />

            {humanProfiles.length > 0 ? (
              <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, paddingTop: 6 }}>
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
                          border: isActiveProfile
                            ? `2px solid rgba(255,215,120,0.95)`
                            : "1px solid rgba(255,255,255,0.10)",
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

            <OptionRow
              label="Bots IA"
              hint="Ajoute des bots PRO (prédéfinis)."
              right={<InfoMiniBtn active={openInfoId === "bots"} onClick={() => toggleInfo("bots")} title="Aide bots" />}
            >
              <OptionToggle
                value={botsEnabled}
                onChange={(v) => {
                  setBotsEnabled(v);
                  if (!v) setSelectedBotIds([]);
                }}
              />
            </OptionRow>
            <InfoMiniPanel
              open={openInfoId === "bots"}
              text={`Bots IA\n\n- Active pour afficher le carrousel de bots PRO\n- Tu peux mixer humains + bots\n- Limite globale : 8 joueurs\n- Si tu désactives Bots IA : les bots sélectionnés sont retirés`}
            />

            {botsEnabled && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <OptionRow
                  label="Niveau bot"
                  hint="Difficulté globale des bots."
                  right={<InfoMiniBtn active={openInfoId === "botLevel"} onClick={() => toggleInfo("botLevel")} title="Aide niveau" />}
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
                <InfoMiniPanel
                  open={openInfoId === "botLevel"}
                  text={`Niveau bot\n\n- Réglage global de difficulté\n- Sert de modificateur (si l'engine l'utilise)`}
                />

                <div className="dc-scroll-thin" style={{ display: "flex", gap: 14, overflowX: "auto", overflowY: "visible", paddingBottom: 10, paddingTop: 6 }}>
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
                        title="Tape pour ajouter/retirer"
                      >
                        <div
                          style={{
                            width: 78,
                            height: 78,
                            borderRadius: "50%",
                            overflow: "hidden",
                            boxShadow: active ? "0 0 26px rgba(255,192,0,0.65)" : "0 0 14px rgba(0,0,0,0.65)",
                            background: active
                              ? "radial-gradient(circle at 30% 20%, #fff7cc, #ffb000)"
                              : "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.16), rgba(0,0,0,0.55))",
                            border: active ? "2px solid rgba(255,215,120,0.95)" : "1px solid rgba(255,255,255,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", filter: active ? "none" : "grayscale(60%) brightness(0.75)", opacity: active ? 1 : 0.85 }}>
                            <ProfileAvatar profile={{ id: b.id, name: b.displayName ?? b.name ?? "Bot", avatarUrl: avatar }} size={78} showStars={false} />
                          </div>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, textAlign: "center", color: active ? "#f6f2e9" : "#7e8299", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.displayName ?? b.name ?? "Bot"}
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
        <Section title={"RÈGLES"}>
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <OptionRow label={"Preset"} hint={"Choisis une base."} right={<InfoMiniBtn active={openInfoId === "preset"} onClick={() => toggleInfo("preset")} title="Aide preset" />}>
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
            <InfoMiniPanel open={openInfoId === "preset"} text={TXT_PRESET} />

            <OptionRow label={"Mode Custom"} hint={"Déverrouille l’édition (séquence + options)."} right={<InfoMiniBtn active={openInfoId === "custom"} onClick={() => toggleInfo("custom")} title="Aide custom" />}>
              <OptionToggle value={customEnabled || presetId === "custom"} onChange={(v) => setCustomEnabled(v)} />
            </OptionRow>
            <InfoMiniPanel open={openInfoId === "custom"} text={TXT_CUSTOM} />

            <OptionRow label={"Condition de victoire"} hint={"Score max ou course au finish."} right={<InfoMiniBtn active={openInfoId === "win"} onClick={() => toggleInfo("win")} title="Aide victoire" />}>
              <OptionSelect
                value={winMode}
                onChange={(v) => setWinMode(v)}
                options={[
                  { label: "Score max", value: "SCORE_MAX" },
                  { label: "Course (finish)", value: "RACE_TO_FINISH" },
                ]}
              />
            </OptionRow>
            <InfoMiniPanel open={openInfoId === "win"} text={TXT_WIN} />

            <OptionRow label={"Échec (0 valide)"} hint={"Règle si aucune flèche ne valide le round."} right={<InfoMiniBtn active={openInfoId === "fail"} onClick={() => toggleInfo("fail")} title="Aide échec" />}>
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
            <InfoMiniPanel open={openInfoId === "fail"} text={TXT_FAIL} />

            {(failPolicy === "MINUS_POINTS" || failPolicy === "BACK_ROUND") && (
              <>
                <OptionRow
                  label={failPolicy === "MINUS_POINTS" ? "Valeur malus (X)" : "Recul rounds (Y)"}
                  hint={"Ajuste la valeur."}
                  right={<InfoMiniBtn active={openInfoId === "failValue"} onClick={() => toggleInfo("failValue")} title="Aide valeur" />}
                >
                  <input
                    type="number"
                    value={failValue}
                    onChange={(e) => setFailValue(Math.max(0, Number(e.target.value || 0)))}
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
                <InfoMiniPanel open={openInfoId === "failValue"} text={TXT_FAIL_VALUE} />
              </>
            )}
          </div>
        </Section>

        {/* SÉQUENCE */}
        <Section title={"SÉQUENCE (ROUNDS)"} right={<InfoMiniBtn active={openInfoId === "sequence"} onClick={() => toggleInfo("sequence")} title="Aide séquence" />}>
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <InfoMiniPanel open={openInfoId === "sequence"} text={TXT_SEQUENCE} />

            <div style={{ fontSize: 12, opacity: 0.82, marginTop: openInfoId === "sequence" ? 10 : 0, marginBottom: 10 }}>
              {editingEnabled ? "Sélectionne un chip pour éditer le round." : "Séquence verrouillée → active Mode Custom pour modifier."}
            </div>

            <div className="dc-scroll-thin" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
              {rounds.map((r, i) => {
                const active = i === selectedRoundIndex;
                const short = roundShort(r);
                return (
                  <div
                    key={(r as any).id || i}
                    role={"button"}
                    onClick={() => setSelectedRoundIndex(i)}
                    style={{
                      ...chipBase,
                      ...(active ? chipActive : null),
                      transform: active ? "scale(1.03)" : "scale(1)",
                      transition: "transform .14s ease, box-shadow .14s ease, border-color .14s ease",
                    }}
                    title={(r as any).label || ""}
                  >
                    <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 900 }}>#{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.4 }}>{short}</div>
                  </div>
                );
              })}
            </div>

            {selectedRound && (
              <div style={{ marginTop: 10, borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 13 }}>Round #{selectedRoundIndex + 1}</div>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850 }}>Label</div>
                      <InfoMiniBtn active={openInfoId === "rLabel"} onClick={() => toggleInfo("rLabel")} title="Aide label" />
                    </div>
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
                    <InfoMiniPanel open={openInfoId === "rLabel"} text={TXT_R_LABEL} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850 }}>Multiplier</div>
                      <InfoMiniBtn active={openInfoId === "rMult"} onClick={() => toggleInfo("rMult")} title="Aide multiplier" />
                    </div>
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
                    <InfoMiniPanel open={openInfoId === "rMult"} text={TXT_R_MULT} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 850 }}>Target</div>
                      <InfoMiniBtn active={openInfoId === "rTarget"} onClick={() => toggleInfo("rTarget")} title="Aide target" />
                    </div>
                    <select
                      value={String((selectedRound as any).target ?? "")}
                      onChange={(e) =>
                        updateRound(selectedRoundIndex, { target: e.target.value ? Number(e.target.value) : undefined } as any)
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
                    <InfoMiniPanel open={openInfoId === "rTarget"} text={TXT_R_TARGET} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <OptionRow
                      label="Bull only"
                      hint="25/50 uniquement"
                      right={<InfoMiniBtn active={openInfoId === "rBull"} onClick={() => toggleInfo("rBull")} title="Aide bull" />}
                    >
                      <OptionToggle
                        value={Boolean((selectedRound as any).bullOnly)}
                        onChange={(v) => updateRound(selectedRoundIndex, { bullOnly: v } as any)}
                        disabled={!editingEnabled}
                      />
                    </OptionRow>
                    <InfoMiniPanel open={openInfoId === "rBull"} text={TXT_R_BULL} />
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
            Lancer la partie
          </button>
        </div>
      </div>
    </div>
  );
}
