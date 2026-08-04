// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — configuration complète
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import ProfileAvatar from "../components/ProfileAvatar";
import Section from "../components/Section";
import TeamPagedSelector from "../components/TeamPagedSelector";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerFootball from "../assets/tickers/ticker_football.png";
import { loadBotPlayers } from "../lib/bots";
import {
  footballTieBreakerLabel,
  footballVariantLabel,
  normalizeFootballConfig,
  type FootballBotLevel,
  type FootballConfigPayload,
  type FootballParticipantMode,
  type FootballTieBreaker,
  type FootballVariant,
} from "../lib/gameEngines/footballEngine";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { x01MostUsedDartSetIdForProfile } from "./X01ConfigV3";

export type { FootballConfigPayload } from "../lib/gameEngines/footballEngine";

const LS_KEY = "dc_modecfg_football_v2";
const VIEW_KEY = "dc_football_config_view_v2";
const GREEN = "#65e5aa";
const BLUE = "#35d0ff";
const GOLD = "#ffd36b";
const RED = "#ff5b77";
const SOFT = "#aeb8c9";

function readSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}
function unique(values: any[]) {
  return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
}
function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}
function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || "Joueur";
}
function teamLogo(team: any) {
  return team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || null;
}

function RulesContent() {
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: GREEN }}>MATCH</strong><br />Le ballon progresse sur un vrai terrain. Quand ton camp possède le ballon, les secteurs affichés construisent l’attaque. Sans possession, ils servent à défendre.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />Simple = +1 zone, Double = +2, Triple = +3. BULL produit une longue passe et DBULL une accélération maximale.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />Simple repousse le ballon. Double intercepte. Triple intercepte et déclenche une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Dans la surface, un Simple cadré donne une chance au gardien. Triple ou DBULL marque directement. Le gardien doit toucher l’une des zones de parade proposées.</div>
    <div><strong style={{ color: GREEN }}>VARIANTES</strong><br />Match complet, Golden Goal, séance de tirs au but et Classic basé sur BULL puis DOUBLE.</div>
    <div><strong style={{ color: BLUE }}>DONNÉES</strong><br />Chaque fléchette conserve son contexte : possession, position du ballon, action, cible, événement, score et joueur.</div>
  </div>;
}

function ChoiceCard({ active, icon, title, subtitle, color, onClick }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 82, borderRadius: 16, padding: 10, textAlign: "left", cursor: "pointer", color: "#fff", border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `linear-gradient(135deg,${color}25,rgba(255,255,255,.035))` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 22px ${color}20` : "none" }}>
    <div style={{ fontSize: 20 }}>{icon}</div>
    <div style={{ marginTop: 5, color: active ? color : "#fff", fontSize: 10.5, fontWeight: 1100 }}>{title}</div>
    <div style={{ marginTop: 3, color: SOFT, fontSize: 8, lineHeight: 1.35 }}>{subtitle}</div>
  </button>;
}

export default function FootballConfig(props: any) {
  const { theme } = useTheme();
  const { t } = useLang();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(() => ({ ...readSaved(), ...(props?.params?.config || {}) }), []);
  const initial = React.useMemo(() => normalizeFootballConfig(saved), [saved]);
  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((profile: any) => !isBotLike(profile)), [allProfiles]);
  const bots = React.useMemo(() => {
    try { return loadBotPlayers().map((bot: any) => ({ ...bot, id: String(bot.id), name: playerName(bot), isBot: true })); }
    catch { return []; }
  }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...bots], [humanProfiles, bots]);
  const byId = React.useMemo(() => new Map(profilePool.map((profile: any) => [String(profile.id), profile])), [profilePool]);
  const teams = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); }
    catch { return []; }
  }, [allProfiles]);

  const activeProfileId = String(store?.activeProfileId || store?.activeId || store?.activeProfile?.id || "");
  const defaultSelected = React.useMemo(() => {
    if (initial.selectedIds.length) return initial.selectedIds.slice(0, 2);
    const ids = humanProfiles.map((profile: any) => String(profile.id));
    const first = activeProfileId && ids.includes(activeProfileId) ? activeProfileId : ids[0];
    const second = ids.find((id: string) => id !== first);
    return [first, second].filter(Boolean);
  }, []);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem(VIEW_KEY) === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Format", "Participants", "Règles", "Résumé"];
  const [participantMode, setParticipantMode] = React.useState<FootballParticipantMode>(initial.participantMode);
  const [variant, setVariant] = React.useState<FootballVariant>(initial.variant);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(defaultSelected);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(unique(saved.selectedTeamIds || []).slice(0, 2));
  const [botPanel, setBotPanel] = React.useState(Boolean(saved.botPanel));
  const [botLevel, setBotLevel] = React.useState<FootballBotLevel>(initial.botLevel);
  const [halfRounds, setHalfRounds] = React.useState(initial.halfRounds);
  const [extraRounds, setExtraRounds] = React.useState(initial.extraRounds);
  const [tieBreaker, setTieBreaker] = React.useState<FootballTieBreaker>(initial.tieBreaker);
  const [goalkeeperEnabled, setGoalkeeperEnabled] = React.useState(initial.goalkeeperEnabled);
  const [missLosesPossession, setMissLosesPossession] = React.useState(initial.missLosesPossession);
  const [randomOrder, setRandomOrder] = React.useState(initial.randomOrder);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(initial.scoreInputMethod || "keypad");

  function chooseView(next: "guided" | "complete") {
    setViewMode(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  }
  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : previous.length >= 2 ? previous : [...previous, id]);
  }
  function toggleTeam(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedTeamIds((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : previous.length >= 2 ? previous : [...previous, id]);
  }
  function back() {
    if (typeof go === "function") go("games");
    else window.history.back();
  }

  const selectedTeams = selectedTeamIds.map((id) => teams.find((team: any) => String(team.id) === id)).filter(Boolean);
  const effectivePlayerIds = participantMode === "teams"
    ? unique(selectedTeams.flatMap((team: any) => team.playerIds || []))
    : selectedIds;
  const selectedPlayers = effectivePlayerIds.map((id) => byId.get(id) || allProfiles.find((profile: any) => String(profile.id) === id) || { id, name: "Joueur" });
  const valid = participantMode === "players" ? selectedIds.length === 2 : selectedTeams.length === 2 && selectedPlayers.length >= 2;

  function buildPayload(): FootballConfigPayload {
    const playerDartSets = Object.fromEntries(selectedPlayers.map((profile: any) => [String(profile.id), profile?.dartSetId || x01MostUsedDartSetIdForProfile(String(profile.id), humanProfiles) || null]));
    const teamConfigs = participantMode === "teams" ? selectedTeams.map((team: any, index: number) => ({
      id: String(team.id), name: String(team.name || `Équipe ${index + 1}`), color: team.color || (index === 0 ? BLUE : RED),
      logoDataUrl: teamLogo(team), playerIds: unique(team.playerIds || []),
    })) : undefined;
    return normalizeFootballConfig({
      mode: "football", participantMode, variant, selectedIds: effectivePlayerIds,
      playersList: selectedPlayers.map((profile: any) => ({ ...profile, id: String(profile.id), name: playerName(profile) })),
      teamConfigs, playerDartSets, botIds: selectedPlayers.filter(isBotLike).map((profile: any) => String(profile.id)),
      botLevel, halfRounds, extraRounds, tieBreaker, goalkeeperEnabled, missLosesPossession,
      randomOrder, scoreInputMethod,
    });
  }
  function start() {
    if (!valid) return;
    const payload = buildPayload();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, selectedTeamIds, botPanel }));
      recordProfileUsageForMode("football", effectivePlayerIds);
    } catch {}
    if (typeof go === "function") go("football_play", { config: payload });
  }

  const formatSection = <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      <ChoiceCard active={variant === "match"} icon="🏟️" title="MATCH" subtitle="Deux mi-temps, prolongation ou penalties." color={GREEN} onClick={() => setVariant("match")} />
      <ChoiceCard active={variant === "golden_goal"} icon="⚡" title="GOLDEN GOAL" subtitle="Le premier but termine la partie." color={GOLD} onClick={() => setVariant("golden_goal")} />
      <ChoiceCard active={variant === "penalties"} icon="🥅" title="TIRS AU BUT" subtitle="5 tentatives puis mort subite." color={RED} onClick={() => setVariant("penalties")} />
      <ChoiceCard active={variant === "classic"} icon="🎯" title="CLASSIC" subtitle="BULL pour le ballon, DOUBLE pour marquer." color={BLUE} onClick={() => setVariant("classic")} />
    </div>
    <div style={{ marginTop: 10 }}>
      <OptionRow label="Participants"><OptionSelect value={participantMode} options={[{ value: "players", label: "1 contre 1" }, { value: "teams", label: "2 équipes" }]} onChange={setParticipantMode} /></OptionRow>
    </div>
  </>;

  const participantsSection = <>
    {participantMode === "players" ? <>
      <PlayerPagedSelector usageMode="football" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GREEN} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
      <div style={{ marginTop: 9 }}><OptionRow label="Ajouter des BOTS IA"><OptionToggle value={botPanel} onChange={setBotPanel} /></OptionRow></div>
      {botPanel ? <div style={{ marginTop: 9 }}><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={BLUE} pageSize={8} modalTitle="Choisir un BOT" /></div> : null}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {selectedIds.map((id, index) => { const profile = byId.get(id); return <div key={id} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 8, alignItems: "center", borderRadius: 15, padding: 8, border: `1px solid ${index === 0 ? BLUE : RED}66`, background: "rgba(255,255,255,.035)" }}><ProfileAvatar profile={profile} size={42} /><div style={{ minWidth: 0 }}><div style={{ color: index === 0 ? BLUE : RED, fontSize: 8, fontWeight: 1100 }}>CAMP {index + 1}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div></div></div>; })}
      </div>
      <div style={{ marginTop: 9 }}><OptionRow label="Niveau des BOTS"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div>
    </> : <>
      <TeamPagedSelector teams={teams} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={GREEN} pageSize={9} modalTitle="Choisir 2 équipes" chooseLabel="Choisir équipes" listLabel="Équipes sélectionnées" />
      <div style={{ marginTop: 9, color: SOFT, fontSize: 9, lineHeight: 1.4 }}>Tous les membres des deux équipes jouent à tour de rôle. Les buts sont collectifs, les statistiques restent individuelles.</div>
    </>}
  </>;

  const rulesSection = <>
    {variant === "match" || variant === "golden_goal" ? <OptionRow label={variant === "match" ? "Tours par mi-temps" : "Limite avant penalties"}><OptionSelect value={halfRounds} options={[3, 5, 8, 10, 12]} onChange={setHalfRounds} /></OptionRow> : null}
    {variant === "match" ? <>
      <OptionRow label="Égalité"><OptionSelect value={tieBreaker} options={[{ value: "draw", label: "Match nul" }, { value: "golden_goal", label: "Golden Goal" }, { value: "penalties", label: "Tirs au but" }]} onChange={setTieBreaker} /></OptionRow>
      {tieBreaker === "golden_goal" ? <OptionRow label="Tours prolongation"><OptionSelect value={extraRounds} options={[1, 2, 3, 5]} onChange={setExtraRounds} /></OptionRow> : null}
    </> : null}
    {variant !== "penalties" && variant !== "classic" ? <OptionRow label="Gardien sur tirs simples/doubles"><OptionToggle value={goalkeeperEnabled} onChange={setGoalkeeperEnabled} /></OptionRow> : null}
    {variant === "match" || variant === "golden_goal" ? <OptionRow label="0 cible = perte de balle"><OptionToggle value={missLosesPossession} onChange={setMissLosesPossession} /></OptionRow> : null}
    {participantMode === "players" ? <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow> : null}
    <OptionRow label="Saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier" }, { value: "dartboard", label: "Cible tactile" }]} onChange={setScoreInputMethod} /></OptionRow>
  </>;

  const summarySection = <div style={{ display: "grid", gap: 8 }}>
    <div style={{ borderRadius: 16, padding: 11, border: `1px solid ${GREEN}55`, background: `${GREEN}0d` }}>
      <div style={{ color: GREEN, fontSize: 9, fontWeight: 1100, letterSpacing: 1 }}>FORMAT</div>
      <div style={{ marginTop: 4, color: "#fff", fontSize: 14, fontWeight: 1100 }}>{footballVariantLabel(variant)}</div>
      <div style={{ marginTop: 4, color: SOFT, fontSize: 9 }}>{participantMode === "players" ? "1 contre 1" : "2 équipes"}{variant === "match" ? ` · ${halfRounds} tours/mi-temps · ${footballTieBreakerLabel(tieBreaker)}` : ""}</div>
    </div>
    <div style={{ borderRadius: 16, padding: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)" }}>
      <div style={{ color: BLUE, fontSize: 9, fontWeight: 1100, letterSpacing: 1 }}>SÉLECTION</div>
      <div style={{ marginTop: 5, color: valid ? "#fff" : RED, fontSize: 10, fontWeight: 1000 }}>{valid ? (participantMode === "players" ? selectedPlayers.map(playerName).join(" vs ") : selectedTeams.map((team: any) => team.name).join(" vs ")) : participantMode === "players" ? "Sélectionne exactement 2 joueurs/BOTS" : "Sélectionne exactement 2 équipes"}</div>
    </div>
  </div>;

  const sectionMap = [formatSection, participantsSection, rulesSection, summarySection];

  return <div className="page" style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(101,229,170,.17),#07110d 42%,#020604 100%)" }}>
    <PageHeader title="FOOTBALL" tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={back} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<RulesContent />} />} />
    <main style={{ width: "min(760px,100%)", margin: "0 auto", padding: "8px 9px max(18px,env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 9 }}>
        <button type="button" onClick={() => chooseView("guided")} style={{ minHeight: 38, borderRadius: 13, border: `1px solid ${viewMode === "guided" ? GREEN : "rgba(255,255,255,.10)"}`, background: viewMode === "guided" ? `${GREEN}18` : "rgba(255,255,255,.025)", color: viewMode === "guided" ? GREEN : SOFT, fontWeight: 1050 }}>GUIDÉ</button>
        <button type="button" onClick={() => chooseView("complete")} style={{ minHeight: 38, borderRadius: 13, border: `1px solid ${viewMode === "complete" ? BLUE : "rgba(255,255,255,.10)"}`, background: viewMode === "complete" ? `${BLUE}18` : "rgba(255,255,255,.025)", color: viewMode === "complete" ? BLUE : SOFT, fontWeight: 1050 }}>COMPLET</button>
      </div>

      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 5, marginBottom: 9 }}>{steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} style={{ minWidth: 0, minHeight: 32, borderRadius: 10, border: `1px solid ${index === step ? GREEN : "rgba(255,255,255,.08)"}`, background: index === step ? `${GREEN}18` : "rgba(255,255,255,.02)", color: index === step ? GREEN : SOFT, fontSize: 7.5, fontWeight: 1050 }}>{index + 1}. {label}</button>)}</div>
        <Section title={steps[step]}>{sectionMap[step]}</Section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} style={{ minHeight: 43, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: step === 0 ? "rgba(255,255,255,.25)" : "#fff", fontWeight: 1050 }}>← RETOUR</button>
          {step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} style={{ minHeight: 43, borderRadius: 14, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>SUIVANT →</button> : <button type="button" disabled={!valid} onClick={start} style={{ minHeight: 43, borderRadius: 14, border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? `linear-gradient(135deg,${GREEN}30,${BLUE}18)` : "rgba(255,255,255,.025)", color: valid ? GREEN : SOFT, fontWeight: 1150 }}>⚽ COUP D’ENVOI</button>}
        </div>
      </> : <>
        <Section title="Format">{formatSection}</Section>
        <Section title="Participants">{participantsSection}</Section>
        <Section title="Règles">{rulesSection}</Section>
        <Section title="Résumé">{summarySection}</Section>
        <button type="button" disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 48, borderRadius: 15, border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? `linear-gradient(135deg,${GREEN}35,${BLUE}20)` : "rgba(255,255,255,.025)", color: valid ? GREEN : SOFT, fontWeight: 1200, fontSize: 13 }}>⚽ COUP D’ENVOI</button>
      </>}
    </main>
  </div>;
}
