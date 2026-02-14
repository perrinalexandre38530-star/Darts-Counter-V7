// @ts-nocheck
// =============================================================
// src/pages/batard/BatardConfig.tsx
// BÂTARD — Config V7 (align GolfConfig / X01ConfigV3)
// - Header: BackDot (gauche) -> menu Games, InfoDot (droite), ticker plein-largeur
// - Carrousel profils humains (locals + profil actif si dispo) + carrousel Bots PRO (toggle)
// - Infomini (InfoDot mini) sur chaque option + InfoDot dédié “Séquence”
// - Séquence compacte (chips) + KPIs + éditeur du round sélectionné
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
  BATARD_PRESETS,
} from "../../lib/batard/batardPresets";

import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  return false;
}

function roundShort(r: BatardRound) {
  if (!r) return "";
  if ((r as any).bullOnly || (r as any).type === "TARGET_BULL") return "BULL";
  const trg = (r as any).target;
  const m = (r as any).multiplierRule || "ANY";
  const mChar = m === "SINGLE" ? "S" : m === "DOUBLE" ? "D" : m === "TRIPLE" ? "T" : "A";
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

// -------------------------------------------------------------
// Payload type (V7)
// -------------------------------------------------------------
export type BatardConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: "easy" | "normal" | "hard";
  presetId: "classic" | "progressif" | "punition" | "custom";
  batard: BatardRulesConfig;
  selectedHumanIds?: string[];
  selectedBotIds?: string[];
};

// -------------------------------------------------------------
// Info texts
// -------------------------------------------------------------
const INFO_TEXT = `BÂTARD (mode variantes)

📌 Principe
- Une partie est une suite de "rounds" (défis) : ex. Simple 20, Double 20, Bull, Any…
- Chaque round définit ce qui est “valide” (cible + multiplicateur + BullOnly).
- Les points s’additionnent selon les flèches valides (mode Score max) ou servent à “avancer” (mode Course).

⚙️ Presets
- Classic (Bar) : suite courte + Score max.
- Progressif : séquence qui monte (1→20→Bull) en course.
- Punition : contraintes + sanctions si tu rates.

🧩 Custom
- Déverrouille l’édition : séquence + règles d’échec + condition de victoire.

🏁 Victoire
- Score max : on joue toute la séquence (N rounds) → meilleur total.
- Course (finish) : premier à terminer la séquence gagne.

💥 Échec (0 valide)
- Aucun : rien
- Malus : -X points
- Recul : -Y rounds (retour en arrière)
- Freeze : on rejoue le même round
`;

const INFO_SEQUENCE = `Séquence (Rounds)

✅ Les “chips” = la timeline des rounds.
- #1, #2, #3… : ordre des défis
- S/D/T = multiplicateur requis (Single/Double/Triple)
- BULL = BullOnly (25/50 seulement)
- ANY = tout est accepté

✍️ Éditer (Custom)
1) Active “Mode Custom”
2) Tape un chip (ex: #3) → tu édites CE round
3) Multiplier = SINGLE/DOUBLE/TRIPLE/ANY
4) Target = 1..20 ou “libre” (sans numéro)
5) BullOnly = cible Bull uniquement (25/50)

💡 Conseil
- Pour un round “Double 20” : Multiplier=DOUBLE + Target=20
- Pour “Any 19” : Multiplier=ANY + Target=19
- Pour “Bull” : BullOnly=ON (Target peut rester vide)
`;

// =============================================================
// Component
// =============================================================
export default function BatardConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];

  // ✅ profil actif (souvent online) – on l’ajoute visuellement si présent
  const activeProfile =
    (store as any)?.activeProfile ??
    (store as any)?.profile ??
    (store as any)?.userProfile ??
    null;

  const mergedProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const p of storeProfiles) if (p?.id) map.set(String(p.id), p);
    if (activeProfile?.id && !map.has(String(activeProfile.id))) {
      map.set(String(activeProfile.id), { ...activeProfile });
    }
    return Array.from(map.values());
  }, [storeProfiles, activeProfile]);

  const humanProfiles = mergedProfiles.filter((p) => !isBotLike(p));

  const primary = (theme as any)?.primary ?? "#7dffca";
  const bg = (theme as any)?.bg ?? "#0b0d14";
  const cardBg =
    "radial-gradient(120% 160% at 0% 0%, rgba(125,255,202,0.14), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.34))";

  // -----------------------------------------------------------
  // Preset / Rules state
  // -----------------------------------------------------------
  const [presetId, setPresetId] = React.useState<"classic" | "progressif" | "punition" | "custom">("classic");

  const presetCfg = React.useMemo(() => {
    if (presetId === "progressif") return progressifPreset;
    if (presetId === "punition") return punitionPreset || classicPreset;
    return classicPreset;
  }, [presetId]);

  const [customEnabled, setCustomEnabled] = React.useState(false);

  const [winMode, setWinMode] = React.useState<BatardWinMode>(presetCfg.winMode);
  const [failPolicy, setFailPolicy] = React.useState<BatardFailPolicy>(presetCfg.failPolicy);
  const [failValue, setFailValue] = React.useState<number>(presetCfg.failValue ?? 0);
  const [rounds, setRounds] = React.useState<BatardRound[]>(presetCfg.rounds || []);

  // Sync when preset changes (unless custom)
  React.useEffect(() => {
    if (presetId === "custom") return;
    setCustomEnabled(false);
    setWinMode(presetCfg.winMode);
    setFailPolicy(presetCfg.failPolicy);
    setFailValue(presetCfg.failValue ?? 0);
    setRounds(presetCfg.rounds || []);
  }, [presetId, presetCfg]);

  // -----------------------------------------------------------
  // Players / Bots selection
  // -----------------------------------------------------------
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<"easy" | "normal" | "hard">("normal");

  const [selectedHumanIds, setSelectedHumanIds] = React.useState<string[]>(() => {
    return humanProfiles.slice(0, 2).map((p) => String(p.id));
  });

  // seed default when profiles arrive later
  React.useEffect(() => {
    if (selectedHumanIds.length > 0) return;
    const seed = humanProfiles.slice(0, 2).map((p) => String(p.id));
    if (seed.length) setSelectedHumanIds(seed);
  }, [humanProfiles.length]); // eslint-disable-line

  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);

  function toggleHuman(id: string) {
    setSelectedHumanIds((prev) => {
      const on = prev.includes(id);
      if (on) return prev.filter((x) => x !== id);
      if (prev.length + (botsEnabled ? selectedBotIds.length : 0) >= 8) return prev;
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

  // if bots disabled -> clear bots selection (UI stays clean)
  React.useEffect(() => {
    if (botsEnabled) return;
    if (selectedBotIds.length) setSelectedBotIds([]);
  }, [botsEnabled]); // eslint-disable-line

  const playersCount = selectedHumanIds.length + (botsEnabled ? selectedBotIds.length : 0);

  // -----------------------------------------------------------
  // Sequence UI helpers
  // -----------------------------------------------------------
  const [selectedRoundIndex, setSelectedRoundIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedRoundIndex((i) => Math.max(0, Math.min(i, Math.max(0, rounds.length - 1))));
  }, [rounds.length]);

  const isEditable = presetId === "custom" || customEnabled;

  function addRound() {
    setRounds((prev) => [
      ...prev,
      {
        id: uid(),
        label: "Any",
        multiplierRule: "ANY",
      } as any,
    ]);
    setSelectedRoundIndex(rounds.length);
  }

  function dupRound(i: number) {
    setRounds((prev) => {
      const r = prev[i];
      if (!r) return prev;
      const copy: BatardRound = { ...(r as any), id: uid(), label: ((r as any).label || "Round") + " (copy)" } as any;
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
    setSelectedRoundIndex((cur) => Math.max(0, Math.min(rounds.length - 1, cur + dir)));
  }

  function updateRound(i: number, patch: Partial<BatardRound>) {
    setRounds((prev) => prev.map((r, idx) => (idx === i ? ({ ...(r as any), ...(patch as any) } as any) : r)));
  }

  const selectedRound = rounds[selectedRoundIndex];

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
  // Styles
  // -----------------------------------------------------------
  const kpiGrid = {
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

  const pill = (active: boolean) =>
    ({
      height: 32,
      padding: "0 10px",
      borderRadius: 999,
      border: active ? `1px solid ${primary}aa` : "1px solid rgba(255,255,255,0.12)",
      background: active ? "rgba(125,255,202,0.14)" : "rgba(0,0,0,0.16)",
      color: active ? "#f6f2e9" : "rgba(255,255,255,0.70)",
      fontWeight: 900,
      fontSize: 12,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      userSelect: "none",
    } as const);

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      {/* ✅ Header demandé */}
      <PageHeader
        tickerSrc={tickerBatard}
        tickerAlt="BÂTARD"
        tickerHeight={92}
        left={<BackDot onClick={() => (props?.setTab ? props.setTab("gameSelect") : null)} />}
        right={<InfoDot title="Règles BÂTARD" text={INFO_TEXT} />}
      />

      <div style={{ padding: "10px 12px 96px" }}>
        {/* KPIs */}
        <div style={kpiGrid}>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 900 }}>JOUEURS</div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>{playersCount}/8</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              {botsEnabled ? `${selectedHumanIds.length} humains + ${selectedBotIds.length} bots` : `${selectedHumanIds.length} humains`}
            </div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 900 }}>RÈGLES</div>
            <div style={{ fontSize: 14, fontWeight: 950 }}>{WIN_LABEL[winMode]}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Échec: {FAIL_LABEL[failPolicy]}</div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 900 }}>SÉQUENCE</div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>{rounds.length}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{isEditable ? "éditable" : "preset"}</div>
          </div>
        </div>

        {/* JOUEURS */}
        <Section title={t("players") || "JOUEURS"}>
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <OptionRow
              label="Sélection"
              hint="Choisis 2 à 8 joueurs."
              right={<InfoDot title="Sélection joueurs" text="Tape un avatar pour (dés)sélectionner. Max 8 joueurs. Min 2." mini />}
            >
              <div style={{ fontWeight: 950, opacity: 0.9 }}>{playersCount}/8</div>
            </OptionRow>

            {/* Humans carousel */}
            {humanProfiles.length > 0 ? (
              <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10 }}>
                {humanProfiles.map((p) => {
                  const id = String(p.id);
                  const active = selectedHumanIds.includes(id);
                  return (
                    <div
                      key={id}
                      role="button"
                      onClick={() => toggleHuman(id)}
                      style={{ minWidth: 108, maxWidth: 108, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, cursor: "pointer" }}
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
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            overflow: "hidden",
                            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                            opacity: active ? 1 : 0.65,
                            transition: "filter .2s ease, opacity .2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} showStars={false} />
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", color: active ? "#f6f2e9" : "#7e8299", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name || "Joueur"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "8px 2px", fontSize: 12, opacity: 0.85 }}>
                Aucun profil local trouvé. Va dans <b>Profils</b> pour en créer (et/ou connecte-toi pour le profil actif).
              </div>
            )}

            <OptionRow
              label="Bots IA"
              hint="Affiche les bots et autorise leur sélection."
              right={<InfoDot title="Bots IA" text="Active les bots pour compléter une partie. Tu peux mixer humains + bots (max 8 joueurs)." mini />}
            >
              <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
            </OptionRow>

            {botsEnabled ? (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <OptionRow
                  label="Niveau bot"
                  hint="Difficulté globale des bots."
                  right={<InfoDot title="Niveau bot" text="Facile / Normal / Difficile. (Le moteur IA pourra affiner par bot plus tard.)" mini />}
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

                {/* ✅ Bots carousel (comme demandé) */}
                <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
                  {PRO_BOTS.map((b: any) => {
                    const id = String(b.id);
                    const active = selectedBotIds.includes(id);
                    const avatar = getProBotAvatar(b.avatarKey) ?? null;
                    const botProfile = { id, name: b.displayName, isBot: true, botLevel: botLevel, avatar: avatar };
                    return (
                      <div
                        key={id}
                        role="button"
                        onClick={() => toggleBot(id)}
                        style={{ minWidth: 108, maxWidth: 108, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, cursor: "pointer" }}
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
                            opacity: active ? 1 : 0.78,
                          }}
                        >
                          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
                            <ProfileAvatar profile={botProfile} size={78} showStars={false} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", color: active ? "#f6f2e9" : "#7e8299", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.displayName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        {/* RÈGLES */}
        <Section title="RÈGLES">
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            <OptionRow
              label="Preset"
              hint="Choisis une base, puis passe en Custom pour modifier."
              right={<InfoDot title="Preset" text="Classic / Progressif / Punition appliquent une séquence + règles. Custom déverrouille l’édition." mini />}
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
              right={<InfoDot title="Custom" text="Active pour éditer la séquence et les options. En preset, la séquence reste verrouillée." mini />}
            >
              <OptionToggle value={isEditable} onChange={(v) => setCustomEnabled(v)} />
            </OptionRow>

            <OptionRow
              label="Condition de victoire"
              hint="Score max ou course au finish."
              right={<InfoDot title="Victoire" text="Score max: meilleur total à la fin. Course: premier à terminer la séquence." mini />}
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
              right={<InfoDot title="Échec" text="Aucun: rien. Malus: -X points. Recul: -Y rounds. Freeze: rejouer le round." mini />}
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

            {(failPolicy === "MINUS_POINTS" || failPolicy === "BACK_ROUND") ? (
              <OptionRow
                label={failPolicy === "MINUS_POINTS" ? "Valeur malus" : "Recul rounds"}
                hint="Ajuste la valeur (X ou Y)."
                right={<InfoDot title="Valeur" text="Malus: points retirés. Recul: nombre de rounds à remonter dans la séquence." mini />}
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
            ) : null}
          </div>
        </Section>

        {/* SÉQUENCE */}
        <Section
          title="SÉQUENCE (ROUNDS)"
          right={<InfoDot title="Aide — Séquence" text={INFO_SEQUENCE} mini />}
        >
          <div style={{ borderRadius: 18, padding: 12, background: cardBg, border: "1px solid rgba(255,255,255,0.12)" }}>
            {/* Mini KPIs sequence */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={pill(true)}>
                Rounds <span style={{ opacity: 0.9 }}>{rounds.length}</span>
              </div>
              <div style={pill(winMode === "SCORE_MAX")}>Score max</div>
              <div style={pill(winMode === "RACE_TO_FINISH")}>Course</div>
              <div style={pill(failPolicy !== "NONE")}>{failPolicy === "NONE" ? "Sans échec" : `Échec: ${FAIL_LABEL[failPolicy]}`}</div>
              <div style={pill(isEditable)}>{isEditable ? "Édition ON" : "Édition OFF"}</div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 10, lineHeight: 1.25 }}>
              {!isEditable ? (
                <>
                  En preset, la séquence est verrouillée. Active <b>Mode Custom</b> pour modifier.
                </>
              ) : (
                <>
                  Tape un chip pour éditer le round. Les chips résument la cible (S/D/T/BULL/ANY).
                </>
              )}
            </div>

            {/* Chips timeline */}
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
                      minWidth: 70,
                      height: 46,
                      padding: "0 12px",
                      borderRadius: 14,
                      border: active ? `1px solid ${primary}aa` : "1px solid rgba(255,255,255,0.12)",
                      background: active ? `linear-gradient(180deg, rgba(125,255,202,0.22), rgba(0,0,0,0.28))` : "rgba(0,0,0,0.18)",
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
                    <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 0.4 }}>{short}</div>
                  </div>
                );
              })}
            </div>

            {/* Round editor */}
            {selectedRound ? (
              <div style={{ marginTop: 10, borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 13 }}>
                    Round #{selectedRoundIndex + 1} — {(selectedRound as any).label || "Round"}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="dc-btn" onClick={() => moveRound(selectedRoundIndex, -1)} disabled={!isEditable || selectedRoundIndex === 0}>
                      ↑
                    </button>
                    <button className="dc-btn" onClick={() => moveRound(selectedRoundIndex, +1)} disabled={!isEditable || selectedRoundIndex >= rounds.length - 1}>
                      ↓
                    </button>
                    <button className="dc-btn" onClick={() => dupRound(selectedRoundIndex)} disabled={!isEditable}>
                      Dupliquer
                    </button>
                    <button className="dc-btn-danger" onClick={() => removeRound(selectedRoundIndex)} disabled={!isEditable || rounds.length <= 1}>
                      Supprimer
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Label</div>
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
                      disabled={!isEditable}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Multiplier</div>
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
                      disabled={!isEditable}
                    >
                      <option value="ANY">ANY</option>
                      <option value="SINGLE">SINGLE</option>
                      <option value="DOUBLE">DOUBLE</option>
                      <option value="TRIPLE">TRIPLE</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>Target</div>
                    <select
                      value={String((selectedRound as any).target ?? "")}
                      onChange={(e) => updateRound(selectedRoundIndex, { target: e.target.value ? Number(e.target.value) : undefined } as any)}
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
                      disabled={!isEditable}
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
                      right={<InfoDot title="Bull only" text="Si activé, seules les touches Bull (25/50) valident ce round." mini />}
                    >
                      <OptionToggle value={Boolean((selectedRound as any).bullOnly)} onChange={(v) => updateRound(selectedRoundIndex, { bullOnly: v } as any)} disabled={!isEditable} />
                    </OptionRow>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button className="dc-btn" onClick={addRound} disabled={!isEditable}>
                    + Ajouter un round
                  </button>
                </div>
              </div>
            ) : null}
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
            background: "linear-gradient(180deg, rgba(11,13,20,0), rgba(11,13,20,0.92) 35%, rgba(11,13,20,0.98))",
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
              background: playersCount < 2 ? "rgba(255,255,255,0.06)" : `linear-gradient(90deg, ${primary}aa, rgba(255,255,255,0.10))`,
              color: playersCount < 2 ? "rgba(255,255,255,0.35)" : "#0b0d14",
              fontWeight: 1000,
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
