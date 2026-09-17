// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import BotPagedSelector from "../../components/BotPagedSelector";
import InfoDot from "../../components/InfoDot";
import OptionRow from "../../components/OptionRow";
import OptionSelect from "../../components/OptionSelect";
import OptionToggle from "../../components/OptionToggle";
import PageHeader from "../../components/PageHeader";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import Section from "../../components/Section";
import { useTheme } from "../../contexts/ThemeContext";
import { loadBotPlayers } from "../../lib/bots";
import { recordProfileUsageForMode } from "../../lib/profileUsage";
import { X01_PRO_BOTS } from "../X01ConfigV3";

export type NewDartsModeId = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur" | "crados";
type BotLevel = "easy" | "normal" | "hard";
type ConfigViewMode = "guided" | "complete";

type ModeDefinition = {
  id: NewDartsModeId;
  title: string;
  ticker: string;
  accent: string;
  accent2: string;
  minPlayers: number;
  maxPlayers: number;
  playTab: string;
  guidedSteps: string[];
  rulesContent: React.ReactNode;
};

type Props = {
  mode: NewDartsModeId;
  definition: ModeDefinition;
  store?: any;
  go?: (tab: any, params?: any) => void;
  setTab?: (tab: any, params?: any) => void;
  params?: any;
};

const LS_PREFIX = "dc_modecfg_new_darts_v1_";

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}

function avatarOf(value: any): string | null {
  return value?.avatarDataUrl ?? value?.avatarUrl ?? value?.avatar ?? value?.photoDataUrl ?? null;
}

function normalizeProfile(profile: any, isBot = false) {
  return {
    ...profile,
    id: String(profile?.id || profile?.profileId || `profile-${Math.random().toString(36).slice(2, 9)}`),
    name: String(profile?.name || profile?.displayName || (isBot ? "BOT" : "Joueur")),
    avatarDataUrl: avatarOf(profile),
    isBot: isBot || !!profile?.isBot,
  };
}

function readSaved(mode: NewDartsModeId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${LS_PREFIX}${mode}`) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSaved(mode: NewDartsModeId, value: any) {
  try { localStorage.setItem(`${LS_PREFIX}${mode}`, JSON.stringify(value)); } catch {}
}

function Pill({ children, active, onClick, accent }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 36,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? accent : "rgba(255,255,255,.11)"}`,
        background: active ? `${accent}20` : "rgba(255,255,255,.035)",
        color: active ? "#fff" : "#c7cad9",
        fontWeight: 900,
        fontSize: 11.5,
        boxShadow: active ? `0 0 18px ${accent}33` : "none",
      }}
    >{children}</button>
  );
}

function SummaryLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, fontSize: 11.5 }}><span style={{ color: "#8f94b5" }}>{label}</span><strong style={{ color: "#fff", textAlign: "right" }}>{value}</strong></div>;
}

export default function NewDartsModeConfig(props: Props) {
  const { mode, definition } = props;
  const { theme } = useTheme();
  const go = props.go ?? props.setTab;
  const store = props.store ?? props.params?.store ?? null;
  const saved = React.useMemo(() => readSaved(mode), [mode]);
  const accent = definition.accent || theme?.primary || "#ffb13b";
  const accent2 = definition.accent2 || theme?.accent2 || theme?.accent1 || accent;
  const soft = theme?.textSoft || "#aeb2d3";

  const [viewMode, setViewMode] = React.useState<ConfigViewMode>(() => {
    try { return localStorage.getItem(`dc_${mode}_config_view_mode`) === "complete" ? "complete" : "guided"; } catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.map(String).slice(0, definition.maxPlayers) : []);
  const [botsOpen, setBotsOpen] = React.useState(saved.botsOpen === true);
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [seriesWins, setSeriesWins] = React.useState<1 | 2 | 3>(saved.seriesWins === 2 || saved.seriesWins === 3 ? saved.seriesWins : 1);

  // CASTLE
  const [castleBricks, setCastleBricks] = React.useState(saved.castleBricks === 10 || saved.castleBricks === 20 ? saved.castleBricks : 15);
  const [castleAssignment, setCastleAssignment] = React.useState<"random" | "offhand">(saved.castleAssignment === "offhand" ? "offhand" : "random");
  const [castleAttacks, setCastleAttacks] = React.useState(saved.castleAttacks !== false);
  const [castleReassignEachLeg, setCastleReassignEachLeg] = React.useState(saved.castleReassignEachLeg !== false);

  // GOTCHA
  const [gotchaTarget, setGotchaTarget] = React.useState([201,301,401,501,601,701].includes(Number(saved.gotchaTarget)) ? Number(saved.gotchaTarget) : 301);
  const [gotchaOut, setGotchaOut] = React.useState<"straight" | "double" | "master">(["double","master"].includes(saved.gotchaOut) ? saved.gotchaOut : "straight");
  const [gotchaMaxRounds, setGotchaMaxRounds] = React.useState([0,15,20,50,80].includes(Number(saved.gotchaMaxRounds)) ? Number(saved.gotchaMaxRounds) : 0);
  const [gotchaBust, setGotchaBust] = React.useState<"turn" | "zero">(saved.gotchaBust === "zero" ? "zero" : "turn");

  // HARE & HOUNDS
  const [houndStart, setHoundStart] = React.useState<5 | 12>(saved.houndStart === 12 ? 12 : 5);
  const [hareTargetZone, setHareTargetZone] = React.useState<"any" | "double" | "triple">(["double","triple"].includes(saved.hareTargetZone) ? saved.hareTargetZone : "any");
  const [hareRoleMode, setHareRoleMode] = React.useState<"first" | "random" | "rotate">(["random","rotate"].includes(saved.hareRoleMode) ? saved.hareRoleMode : "first");
  const [hareDirection, setHareDirection] = React.useState<"clockwise" | "counter">(saved.hareDirection === "counter" ? "counter" : "clockwise");

  // PENDU
  const [penduPartsToLose, setPenduPartsToLose] = React.useState<6 | 8>(saved.penduPartsToLose === 8 ? 8 : 6);
  const [penduChallengeMode, setPenduChallengeMode] = React.useState<"caller" | "random" | "mixed">(["random", "mixed"].includes(saved.penduChallengeMode) ? saved.penduChallengeMode : "caller");
  const [penduTargetFamily, setPenduTargetFamily] = React.useState<"segments" | "scores" | "mixed">(["scores", "mixed"].includes(saved.penduTargetFamily) ? saved.penduTargetFamily : "segments");
  const [penduExecution, setPenduExecution] = React.useState<"strict" | "flex">(saved.penduExecution === "flex" ? "flex" : "strict");

  // MENTEUR
  const [menteurLives, setMenteurLives] = React.useState<3 | 5 | 7>(saved.menteurLives === 3 || saved.menteurLives === 7 ? saved.menteurLives : 5);
  const [menteurContractDeck, setMenteurContractDeck] = React.useState<"score" | "mixed" | "advanced">(["mixed", "advanced"].includes(saved.menteurContractDeck) ? saved.menteurContractDeck : "score");
  const [menteurRaiseStep, setMenteurRaiseStep] = React.useState<5 | 10 | 20>(saved.menteurRaiseStep === 10 || saved.menteurRaiseStep === 20 ? saved.menteurRaiseStep : 5);
  const [menteurBullAllowed, setMenteurBullAllowed] = React.useState(saved.menteurBullAllowed !== false);

  // CRADOS
  const [cradosDirtLimit, setCradosDirtLimit] = React.useState<10 | 15 | 20>(saved.cradosDirtLimit === 15 || saved.cradosDirtLimit === 20 ? saved.cradosDirtLimit : 10);
  const [cradosLayersToOwn, setCradosLayersToOwn] = React.useState<2 | 3 | 4>(saved.cradosLayersToOwn === 2 || saved.cradosLayersToOwn === 4 ? saved.cradosLayersToOwn : 3);
  const [cradosBullWash, setCradosBullWash] = React.useState(saved.cradosBullWash !== false);
  const [cradosStealMode, setCradosStealMode] = React.useState<"block" | "flip">(saved.cradosStealMode === "flip" ? "flip" : "block");

  const humanProfiles = React.useMemo(() => {
    const raw = Array.isArray(store?.profiles) ? store.profiles : [];
    return raw.filter((p: any) => !isBotLike(p)).map((p: any) => normalizeProfile(p, false));
  }, [store?.profiles]);

  const [bots, setBots] = React.useState<any[]>([]);
  React.useEffect(() => {
    const map = new Map<string, any>();
    (X01_PRO_BOTS || []).forEach((b: any) => map.set(String(b.id), normalizeProfile(b, true)));
    try { loadBotPlayers().forEach((b: any) => map.set(String(b.id), normalizeProfile(b, true))); } catch {}
    setBots([...map.values()]);
  }, []);

  const profileById = React.useMemo(() => {
    const map = new Map<string, any>();
    [...humanProfiles, ...bots].forEach((p: any) => map.set(String(p.id), p));
    return map;
  }, [humanProfiles, bots]);

  const selectedProfiles = selectedIds.map((id) => profileById.get(String(id))).filter(Boolean);
  const botCount = selectedProfiles.filter(isBotLike).length;
  const validSelection = selectedIds.length >= definition.minPlayers && selectedIds.length <= definition.maxPlayers;
  const maxReached = selectedIds.length >= definition.maxPlayers;

  function togglePlayer(idRaw: any) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= definition.maxPlayers) return prev;
      return [...prev, id];
    });
  }

  React.useEffect(() => {
    const snapshot = {
      selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins,
      castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg,
      gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust,
      houndStart, hareTargetZone, hareRoleMode, hareDirection,
      penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution,
      menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed,
      cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode,
    };
    writeSaved(mode, snapshot);
  }, [mode, selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins, castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg, gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust, houndStart, hareTargetZone, hareRoleMode, hareDirection, penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution, menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed, cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode]);

  function selectView(value: ConfigViewMode) {
    setViewMode(value);
    try { localStorage.setItem(`dc_${mode}_config_view_mode`, value); } catch {}
  }

  function backToGames() {
    if (typeof props?.params?.onBack === "function") return props.params.onBack();
    if (typeof go === "function") return go("games", { gamesView: "all" });
    window.history.back();
  }

  function modeRulesPayload() {
    if (mode === "castle") return { targetBricks: castleBricks, numberAssignment: castleAssignment, attacksEnabled: castleAttacks, reassignEachLeg: castleReassignEachLeg };
    if (mode === "gotcha") return { targetScore: gotchaTarget, outMode: gotchaOut, maxRounds: gotchaMaxRounds, bustRule: gotchaBust, gotchaReset: "zero" };
    if (mode === "hare_hounds") return { houndStart, targetZone: hareTargetZone, roleMode: hareRoleMode, direction: hareDirection, hareStart: 20 };
    if (mode === "pendu") return { partsToLose: penduPartsToLose, challengeMode: penduChallengeMode, targetFamily: penduTargetFamily, executionMode: penduExecution };
    if (mode === "menteur") return { lives: menteurLives, contractDeck: menteurContractDeck, raiseStep: menteurRaiseStep, bullAllowed: menteurBullAllowed };
    return { dirtLimit: cradosDirtLimit, layersToOwn: cradosLayersToOwn, bullWash: cradosBullWash, stealMode: cradosStealMode };
  }

  function start() {
    if (!validSelection || typeof go !== "function") return;
    const orderedIds = randomOrder ? [...selectedIds].sort(() => Math.random() - 0.5) : [...selectedIds];
    const playersList = orderedIds.map((id) => profileById.get(String(id))).filter(Boolean).map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur" }));
    const payload = {
      mode,
      selectedIds: orderedIds,
      players: orderedIds.length,
      playersList,
      botIds: playersList.filter(isBotLike).map((p: any) => String(p.id)),
      botsEnabled: playersList.some(isBotLike),
      botLevel,
      randomOrder,
      scoreInputMethod,
      seriesWins,
      rules: modeRulesPayload(),
      menuVersion: 1,
    };
    try { recordProfileUsageForMode(mode, orderedIds); } catch {}
    go(definition.playTab, { config: payload });
  }

  const selectorCard: React.CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "15px 12px", marginBottom: 12, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${accent}33` };
  const panel: React.CSSProperties = { borderRadius: 16, padding: 11, background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.24))", border: "1px solid rgba(255,255,255,.09)" };

  const participantsBlock = <>
    <section style={selectorCard}>
      <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Participants</div>
      <PlayerPagedSelector usageMode={mode} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ color: validSelection ? accent : "#ff9baa", fontSize: 11.5, fontWeight: 900 }}>{validSelection ? `${selectedIds.length} participant${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}` : `Sélectionne ${definition.minPlayers} à ${definition.maxPlayers} participants.`}</div>
        <button type="button" onClick={() => setBotsOpen((v) => !v)} style={{ minHeight: 34, borderRadius: 999, border: `1px solid ${accent}77`, background: botsOpen ? `${accent}1d` : "rgba(255,255,255,.04)", color: accent, fontWeight: 900, padding: "6px 11px" }}>{botsOpen ? "☑ BOTS IA" : "☐ BOTS IA"}</button>
      </div>
      {maxReached ? <div style={{ marginTop: 8, color: soft, fontSize: 10.5 }}>Maximum atteint : {definition.maxPlayers} participants.</div> : null}
    </section>
    {botsOpen ? <section style={selectorCard}><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} />{botCount > 0 ? <div style={{ marginTop: 10 }}><OptionRow label="Difficulté IA"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}</section> : null}
  </>;

  const matchBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Format de match</div>
    <div style={panel}>
      <OptionRow label="Série"><OptionSelect value={seriesWins} options={[{ value: 1, label: "BO1 — 1 victoire" }, { value: 2, label: "BO3 — 2 victoires" }, { value: 3, label: "BO5 — 3 victoires" }]} onChange={(v: any) => setSeriesWins(Number(v) as any)} /></OptionRow>
      <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    </div>
  </section>;

  const castleBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles CASTLE</div>
    <div style={panel}>
      <OptionRow label="Taille du château"><OptionSelect value={castleBricks} options={[{ value: 10, label: "10 briques — rapide" }, { value: 15, label: "15 briques — classique" }, { value: 20, label: "20 briques — endurance" }]} onChange={(v: any) => setCastleBricks(Number(v))} /></OptionRow>
      <OptionRow label="Attribution des numéros"><OptionSelect value={castleAssignment} options={[{ value: "random", label: "Aléatoire unique" }, { value: "offhand", label: "Lancer main opposée" }]} onChange={setCastleAssignment} /></OptionRow>
      <OptionRow label="Attaque des châteaux adverses"><OptionToggle value={castleAttacks} onChange={setCastleAttacks} /></OptionRow>
      <OptionRow label="Nouveaux numéros à chaque manche"><OptionToggle value={castleReassignEachLeg} onChange={setCastleReassignEachLeg} /></OptionRow>
    </div>
  </section>;

  const gotchaBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles GOTCHA</div>
    <div style={panel}>
      <OptionRow label="Score cible"><OptionSelect value={gotchaTarget} options={[201,301,401,501,601,701]} onChange={(v: any) => setGotchaTarget(Number(v))} /></OptionRow>
      <OptionRow label="Sortie"><OptionSelect value={gotchaOut} options={[{ value: "straight", label: "Straight — n'importe quelle zone" }, { value: "double", label: "Double Out" }, { value: "master", label: "Master Out — D ou T" }]} onChange={setGotchaOut} /></OptionRow>
      <OptionRow label="Limite de rounds"><OptionSelect value={gotchaMaxRounds} options={[{ value: 0, label: "Illimitée" }, { value: 15, label: "15 rounds" }, { value: 20, label: "20 rounds" }, { value: 50, label: "50 rounds" }, { value: 80, label: "80 rounds" }]} onChange={(v: any) => setGotchaMaxRounds(Number(v))} /></OptionRow>
      <OptionRow label="Bust au-dessus de la cible"><OptionSelect value={gotchaBust} options={[{ value: "turn", label: "Retour au début de la volée" }, { value: "zero", label: "Hardcore — retour à 0" }]} onChange={setGotchaBust} /></OptionRow>
    </div>
    <div style={{ marginTop: 9, color: soft, fontSize: 10.7, lineHeight: 1.45 }}>GOTCHA reste actif : égaler exactement le total d'un adversaire le renvoie à 0.</div>
  </section>;

  const hareBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles HARE & HOUNDS</div>
    <div style={panel}>
      <OptionRow label="Départ du Lièvre"><OptionSelect value={20} options={[{ value: 20, label: "20 — classique" }]} onChange={() => {}} /></OptionRow>
      <OptionRow label="Départ du/des Limier(s)"><OptionSelect value={houndStart} options={[{ value: 5, label: "5 — poursuite serrée" }, { value: 12, label: "12 — avance du Lièvre" }]} onChange={(v: any) => setHoundStart(Number(v) === 12 ? 12 : 5)} /></OptionRow>
      <OptionRow label="Zone valide"><OptionSelect value={hareTargetZone} options={[{ value: "any", label: "Toute la tranche S/D/T" }, { value: "double", label: "Doubles uniquement" }, { value: "triple", label: "Triples uniquement" }]} onChange={setHareTargetZone} /></OptionRow>
      <OptionRow label="Attribution du Lièvre"><OptionSelect value={hareRoleMode} options={[{ value: "first", label: "1er joueur sélectionné" }, { value: "random", label: "Aléatoire" }, { value: "rotate", label: "Rotation à chaque manche" }]} onChange={setHareRoleMode} /></OptionRow>
      <OptionRow label="Sens de poursuite"><OptionSelect value={hareDirection} options={[{ value: "clockwise", label: "Horaire — classique" }, { value: "counter", label: "Anti-horaire — variante" }]} onChange={setHareDirection} /></OptionRow>
    </div>
  </section>;

  const penduBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles PENDU</div>
    <div style={panel}>
      <OptionRow label="Erreurs avant élimination"><OptionSelect value={penduPartsToLose} options={[{ value: 6, label: "6 parties — pendu classique" }, { value: 8, label: "8 parties — version longue" }]} onChange={(v: any) => setPenduPartsToLose(Number(v) === 8 ? 8 : 6)} /></OptionRow>
      <OptionRow label="Création des défis"><OptionSelect value={penduChallengeMode} options={[{ value: "caller", label: "Annonce libre par le joueur actif" }, { value: "random", label: "Défi tiré au hasard" }, { value: "mixed", label: "Mixte — libre + aléatoire" }]} onChange={setPenduChallengeMode} /></OptionRow>
      <OptionRow label="Famille de défis"><OptionSelect value={penduTargetFamily} options={[{ value: "segments", label: "Segments exacts" }, { value: "scores", label: "Scores / objectifs" }, { value: "mixed", label: "Mixte" }]} onChange={setPenduTargetFamily} /></OptionRow>
      <OptionRow label="Validation"><OptionSelect value={penduExecution} options={[{ value: "strict", label: "Stricte — défi exact" }, { value: "flex", label: "Souple — défi ou mieux" }]} onChange={setPenduExecution} /></OptionRow>
    </div>
  </section>;

  const menteurBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles MENTEUR</div>
    <div style={panel}>
      <OptionRow label="Vies"><OptionSelect value={menteurLives} options={[3,5,7]} onChange={(v: any) => setMenteurLives(Number(v) === 3 ? 3 : Number(v) === 7 ? 7 : 5)} /></OptionRow>
      <OptionRow label="Contrats"><OptionSelect value={menteurContractDeck} options={[{ value: "score", label: "Scores uniquement" }, { value: "mixed", label: "Mixte — scores + zones" }, { value: "advanced", label: "Avancé — inclut combos / checkout" }]} onChange={setMenteurContractDeck} /></OptionRow>
      <OptionRow label="Pas minimal de surenchère"><OptionSelect value={menteurRaiseStep} options={[5,10,20]} onChange={(v: any) => setMenteurRaiseStep(Number(v) === 10 ? 10 : Number(v) === 20 ? 20 : 5)} /></OptionRow>
      <OptionRow label="Bull autorisé dans les annonces"><OptionToggle value={menteurBullAllowed} onChange={setMenteurBullAllowed} /></OptionRow>
    </div>
  </section>;

  const cradosBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles CRADOS</div>
    <div style={panel}>
      <OptionRow label="Jauge de crasse"><OptionSelect value={cradosDirtLimit} options={[10,15,20]} onChange={(v: any) => setCradosDirtLimit(Number(v) === 15 ? 15 : Number(v) === 20 ? 20 : 10)} /></OptionRow>
      <OptionRow label="Couches pour salir un secteur"><OptionSelect value={cradosLayersToOwn} options={[{ value: 2, label: "2 couches — rapide" }, { value: 3, label: "3 couches — classique" }, { value: 4, label: "4 couches — endurance" }]} onChange={(v: any) => setCradosLayersToOwn(Number(v) === 2 ? 2 : Number(v) === 4 ? 4 : 3)} /></OptionRow>
      <OptionRow label="Bull douche / nettoyage"><OptionToggle value={cradosBullWash} onChange={setCradosBullWash} /></OptionRow>
      <OptionRow label="Action sur secteur adverse"><OptionSelect value={cradosStealMode} options={[{ value: "block", label: "Blocage — secteur sale piégé" }, { value: "flip", label: "Vol — la propriété peut changer" }]} onChange={setCradosStealMode} /></OptionRow>
    </div>
  </section>;

  const inputBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Saisie</div>
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "KEYPAD" }, { value: "dartboard", label: "CIBLE INTERACTIVE" }]} onChange={setScoreInputMethod} /></OptionRow>
  </section>;

  const boLabel = seriesWins === 1 ? "BO1" : seriesWins === 2 ? "BO3" : "BO5";
  const summaryBlock = <section style={{ ...selectorCard, border: `1px solid ${validSelection ? accent + "66" : "rgba(255,120,150,.30)"}` }}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Résumé</div>
    <div style={{ ...panel, display: "grid", gap: 8 }}>
      <SummaryLine label="Mode" value={definition.title} />
      <SummaryLine label="Participants" value={`${selectedIds.length} / ${definition.maxPlayers}${botCount ? ` · ${botCount} BOT${botCount > 1 ? "S" : ""}` : ""}`} />
      <SummaryLine label="Format" value={boLabel} />
      <SummaryLine label="Saisie" value={scoreInputMethod === "dartboard" ? "Cible interactive" : "Keypad"} />
      {mode === "castle" ? <><SummaryLine label="Objectif" value={`${castleBricks} briques`} /><SummaryLine label="Combat" value={castleAttacks ? "Construction + attaque" : "Construction seule"} /></> : null}
      {mode === "gotcha" ? <><SummaryLine label="Cible" value={gotchaTarget} /><SummaryLine label="Sortie" value={gotchaOut === "straight" ? "Straight" : gotchaOut === "double" ? "Double" : "Master"} /></> : null}
      {mode === "hare_hounds" ? <><SummaryLine label="Départs" value={`Lièvre 20 · Limier ${houndStart}`} /><SummaryLine label="Zone" value={hareTargetZone === "any" ? "S/D/T" : hareTargetZone === "double" ? "Doubles" : "Triples"} /></> : null}
      {mode === "pendu" ? <><SummaryLine label="Élimination" value={`${penduPartsToLose} erreurs`} /><SummaryLine label="Défis" value={penduTargetFamily === "segments" ? "Segments" : penduTargetFamily === "scores" ? "Scores" : "Mixte"} /></> : null}
      {mode === "menteur" ? <><SummaryLine label="Vies" value={`${menteurLives}`} /><SummaryLine label="Contrats" value={menteurContractDeck === "score" ? "Scores" : menteurContractDeck === "mixed" ? "Mixte" : "Avancé"} /></> : null}
      {mode === "crados" ? <><SummaryLine label="Crasse max" value={`${cradosDirtLimit}`} /><SummaryLine label="Contamination" value={`${cradosLayersToOwn} couche${cradosLayersToOwn > 1 ? "s" : ""} / secteur`} /></> : null}
    </div>
    {!validSelection ? <div style={{ marginTop: 10, color: "#ff9baa", fontSize: 11.5, fontWeight: 900, textAlign: "center" }}>Sélectionne au moins {definition.minPlayers} participants pour continuer.</div> : null}
  </section>;

  const modeBlock = mode === "castle" ? castleBlock : mode === "gotcha" ? gotchaBlock : mode === "hare_hounds" ? hareBlock : mode === "pendu" ? penduBlock : mode === "menteur" ? menteurBlock : cradosBlock;
  const steps = definition.guidedSteps;
  const maxStep = steps.length - 1;

  return <div style={{ minHeight: "100dvh", width: "100%", overflowX: "hidden", paddingBottom: 92 }}>
    <PageHeader tickerSrc={definition.ticker} tickerAlt={definition.title} left={<BackDot onClick={backToGames} color={accent} glow={`${accent}88`} title="Retour" />} right={<InfoDot title={`Règles ${definition.title}`} color={accent} glow={`${accent}77`} content={definition.rulesContent} />} />
    <div style={{ padding: "8px 8px 0", maxWidth: 980, margin: "0 auto" }}>
      <section style={{ ...selectorCard, border: `1px solid ${accent}66`, boxShadow: `0 0 24px ${accent}18, 0 14px 34px rgba(0,0,0,.48)` }}>
        <div style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration {definition.title}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Pill active={viewMode === "guided"} onClick={() => selectView("guided")} accent={accent}>Guidée</Pill><Pill active={viewMode === "complete"} onClick={() => selectView("complete")} accent={accent}>Complète</Pill></div>
        <div style={{ marginTop: 8, color: soft, fontSize: 11 }}>Le menu est prêt pour le moteur de jeu : participants, règles, format et saisie sont déjà persistés.</div>
      </section>

      {viewMode === "guided" ? <>
        <section style={selectorCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}><div><div style={{ color: accent, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div><div style={{ marginTop: 3, color: soft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{steps.length} · {steps[guidedStep]}</div></div><div style={{ display: "flex", gap: 4 }}>{steps.map((label, idx) => <button key={label} type="button" onClick={() => setGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? accent : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? `${accent}20` : "rgba(255,255,255,.03)", color: idx === guidedStep ? accent : "#aeb2d3", fontSize: 9.5, fontWeight: 950 }}>{idx + 1}</button>)}</div></div>
          <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / steps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${accent}, ${accent2})` }} /></div>
        </section>
        {guidedStep === 0 ? participantsBlock : null}
        {guidedStep === 1 ? modeBlock : null}
        {guidedStep === 2 ? matchBlock : null}
        {guidedStep === 3 ? inputBlock : null}
        {guidedStep === 4 ? summaryBlock : null}
        <div style={{ display: "flex", gap: 9, marginBottom: 12 }}><button type="button" disabled={guidedStep === 0} onClick={() => setGuidedStep((s) => Math.max(0, s - 1))} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button><button type="button" disabled={guidedStep === maxStep} onClick={() => setGuidedStep((s) => Math.min(maxStep, s + 1))} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: `1px solid ${accent}`, background: `${accent}18`, color: guidedStep === maxStep ? "#565b76" : accent, fontWeight: 950 }}>Suivant →</button></div>
      </> : <>{participantsBlock}{modeBlock}{matchBlock}{inputBlock}{summaryBlock}</>}

      {(viewMode === "complete" || guidedStep === maxStep) ? <div style={{ padding: "4px 4px 16px" }}><button type="button" disabled={!validSelection} onClick={start} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${accent}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${accent}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${accent}55, 0 10px 24px rgba(0,0,0,.40)` : "none", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER {definition.title}</button><div style={{ marginTop: 8, color: soft, fontSize: 10.5, textAlign: "center" }}>Le bouton ouvre l'écran de jeu dédié préparé pour la prochaine étape d'implémentation.</div></div> : null}
    </div>
  </div>;
}
