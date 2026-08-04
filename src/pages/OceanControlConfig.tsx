// @ts-nocheck
// =============================================================
// OCEAN CONTROL — configuration guidée / complète
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
import TeamPagedSelector from "../components/TeamPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import {
  normalizeOceanControlConfig,
  oceanControlDifficultyLabel,
  oceanControlFleetLabel,
  oceanControlFleetTemplate,
  oceanControlVariantLabel,
  type OceanControlBotLevel,
  type OceanControlConfigPayload,
  type OceanControlDifficulty,
  type OceanControlFleetPreset,
  type OceanControlGridOrder,
  type OceanControlParticipantMode,
  type OceanControlPlacement,
  type OceanControlVariant,
} from "../lib/gameEngines/oceanControlEngine";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { SelectedParticipantsCompactBlock, x01MostUsedDartSetIdForProfile } from "./X01ConfigV3";
import tickerOcean from "../assets/tickers/ticker_ocean_control.png";

const LS_KEY = "dc_modecfg_ocean_control_v1";
const VIEW_KEY = "dc_ocean_control_config_view_v1";
const BLUE = "#30b9ff";
const CYAN = "#65e9ff";
const GREEN = "#65e5aa";
const GOLD = "#f5ca68";
const RED = "#ff6573";
const SOFT = "#aab4c7";

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return value && typeof value === "object" ? value : {}; }
  catch { return {}; }
}
function unique(ids: any[]) { return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))); }
function isBotLike(profile: any) { return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel); }
function shuffle<T>(items: T[]): T[] { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
function blockStyle(accent = BLUE): React.CSSProperties { return { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, marginBottom: 10, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}35`, boxShadow: "0 14px 34px rgba(0,0,0,.26)" }; }

function Rules() {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: BLUE }}>OBJECTIF</strong><br />Détruis tous les navires de la flotte adverse. Les secteurs 1 à 20 correspondent aux vingt zones de l’océan.</div>
    <div><strong style={{ color: CYAN }}>MODE TACTIQUE</strong><br />Simple = une zone, Double = deux zones adjacentes, Triple = une ligne de trois zones.</div>
    <div><strong style={{ color: GREEN }}>SONAR</strong><br />Le Bull analyse la zone sélectionnée et indique le nombre de contacts proches.</div>
    <div><strong style={{ color: GOLD }}>DBULL</strong><br />Le Double Bull déclenche une frappe de précision sur la zone sélectionnée ou sur une cible inconnue.</div>
    <div><strong style={{ color: RED }}>VICTOIRE</strong><br />La première flotte à remporter le nombre de manches choisi prend le contrôle de l’océan.</div>
  </div>;
}

function PresetCard({ active, icon, title, subtitle, color, onClick }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 78, borderRadius: 16, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `linear-gradient(135deg,${color}22,rgba(255,255,255,.035))` : "rgba(255,255,255,.025)", color: "#fff", textAlign: "left", padding: 10, cursor: "pointer", boxShadow: active ? `0 0 20px ${color}18` : "none" }}>
    <div style={{ fontSize: 18 }}>{icon}</div><div style={{ marginTop: 4, color: active ? color : "#fff", fontSize: 10.5, fontWeight: 1100 }}>{title}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8, lineHeight: 1.35 }}>{subtitle}</div>
  </button>;
}

export default function OceanControlConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(() => ({ ...readSaved(), ...(props?.params?.config || {}) }), []);
  const initial = React.useMemo(() => normalizeOceanControlConfig(saved), [saved]);
  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => { try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); } catch { return []; } }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem(VIEW_KEY) === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Flotte", "Commandants", "Armes", "Bataille", "Résumé"];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 8));
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(unique(saved.selectedTeamIds || []).slice(0, 2));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<OceanControlBotLevel>(initial.botLevel);
  const [variant, setVariant] = React.useState<OceanControlVariant>(initial.variant);
  const [difficulty, setDifficulty] = React.useState<OceanControlDifficulty>(initial.difficulty);
  const [participantMode, setParticipantMode] = React.useState<OceanControlParticipantMode>(initial.participantMode);
  const [placement, setPlacement] = React.useState<OceanControlPlacement>(initial.placement);
  const [gridOrder, setGridOrder] = React.useState<OceanControlGridOrder>(initial.gridOrder);
  const [fleetPreset, setFleetPreset] = React.useState<OceanControlFleetPreset>(initial.fleetPreset);
  const [winsNeeded, setWinsNeeded] = React.useState<1 | 2 | 3>(initial.winsNeeded);
  const [sonarEnabled, setSonarEnabled] = React.useState(initial.sonarEnabled);
  const [dbullStrikeEnabled, setDbullStrikeEnabled] = React.useState(initial.dbullStrikeEnabled);
  const [duplicateConsumesDart, setDuplicateConsumesDart] = React.useState(initial.duplicateConsumesDart);
  const [randomOrder, setRandomOrder] = React.useState(initial.randomOrder);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(initial.scoreInputMethod);
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});
  const teamsCatalog = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); }
    catch { return []; }
  }, [allProfiles]);
  const selectedTeams = React.useMemo(() => selectedTeamIds.map((id) => teamsCatalog.find((team: any) => String(team.id) === String(id))).filter(Boolean), [selectedTeamIds, teamsCatalog]);


  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 8 ? prev : [...prev, id]);
    setPlayerDartSets((prev) => Object.prototype.hasOwnProperty.call(prev, id) ? prev : ({ ...prev, [id]: x01MostUsedDartSetIdForProfile(id) || null }));
  }
  function toggleTeam(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedTeamIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id]);
  }
  function handleDartSet(id: string, dartSetId: string | null) { setPlayerDartSets((prev) => ({ ...prev, [String(id)]: dartSetId || null })); }
  function chooseView(next: "guided" | "complete") { setViewMode(next); try { localStorage.setItem(VIEW_KEY, next); } catch {} }
  function back() { if (typeof go === "function") go("games"); }

  const teamMemberIds = React.useMemo(() => unique(selectedTeams.flatMap((team: any) => Array.isArray(team?.playerIds) ? team.playerIds : [])).slice(0, 12), [selectedTeams]);
  const effectiveSelectedIds = participantMode === "teams" ? teamMemberIds : selectedIds;
  const selectedItems = effectiveSelectedIds.map((id) => byId.get(id)).filter(Boolean);
  const selectedBots = selectedItems.filter(isBotLike);
  const minimum = 2;
  const valid = participantMode === "teams"
    ? selectedTeamIds.length === 2 && selectedItems.length >= 2 && selectedItems.length <= 12
    : selectedIds.length >= minimum && selectedIds.length <= 8;
  const fleet = oceanControlFleetTemplate(fleetPreset);
  const totalCells = fleet.reduce((sum, ship) => sum + ship.length, 0);

  function start() {
    if (!valid) return;
    const baseIds = participantMode === "teams" ? teamMemberIds : selectedIds;
    const ids = randomOrder && participantMode === "players" ? shuffle(baseIds) : [...baseIds];
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({ ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur", dartSetId: playerDartSets[String(profile.id)] ?? null, isBot: isBotLike(profile) }));
    const botIds = playersList.filter(isBotLike).map((profile: any) => String(profile.id));
    const teamByPlayer: Record<string, string> = {};
    if (participantMode === "teams") selectedTeams.forEach((team: any) => (team?.playerIds || []).forEach((id: any) => { if (ids.includes(String(id))) teamByPlayer[String(id)] = String(team?.name || "ÉQUIPE"); }));
    const payload: OceanControlConfigPayload = normalizeOceanControlConfig({
      mode: "ocean_control", variant, difficulty, players: ids.length, selectedIds: ids, playersList, playerDartSets,
      botIds, botsEnabled: botIds.length > 0, botLevel, participantMode, teamByPlayer, placement, gridOrder,
      fleetPreset, winsNeeded, dartsPerTurn: 3, sonarEnabled, dbullStrikeEnabled, duplicateConsumesDart,
      randomOrder, scoreInputMethod,
    });
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel, selectedTeamIds })); } catch {}
    try { recordProfileUsageForMode("ocean_control", ids); } catch {}
    if (typeof go === "function") go("ocean_control_play", payload);
  }

  const participantsBlock = <section style={blockStyle(BLUE)}>
    <div style={{ color: BLUE, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 9 }}>COMMANDANTS DE FLOTTE</div>
    <OptionRow label="Organisation" hint="Flottes individuelles ou Teams Darts enregistrées"><OptionSelect value={participantMode} onChange={setParticipantMode} options={[{ value: "players", label: "Joueurs" }, { value: "teams", label: "Équipes" }]} /></OptionRow>
    {participantMode === "players" ? <>
      <SelectedParticipantsCompactBlock items={selectedItems} accent={BLUE} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
      <PlayerPagedSelector usageMode="ocean_control" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={BLUE} pageSize={9} modalTitle="Choisir les commandants" showSelectedSummary={false} />
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ minHeight: 38, borderRadius: 12, border: `1px solid ${CYAN}66`, background: `${CYAN}12`, color: CYAN, fontWeight: 1000, padding: "0 13px", cursor: "pointer" }}>🤖 BOTS {selectedBots.length ? `(${selectedBots.length})` : ""}</button>
        <div style={{ color: valid ? GREEN : RED, fontSize: 9, fontWeight: 1000 }}>{selectedIds.length}/8 · minimum {minimum}</div>
      </div>
      {botsPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={CYAN} pageSize={8} modalTitle="Ajouter un commandant BOT" /></div> : null}
    </> : <>
      <div style={{ marginBottom: 9, borderRadius: 13, padding: 9, color: SOFT, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9 }}>{selectedTeams.length ? selectedTeams.map((team: any) => team.name).join(" · ") : "Sélectionne au moins deux Teams Darts."}</div>
      <TeamPagedSelector teams={teamsCatalog} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={BLUE} pageSize={9} modalTitle="Choisir les flottes" chooseLabel="Choisir équipes" listLabel="Liste équipes" />
      <div style={{ marginTop: 9, color: valid ? GREEN : RED, fontSize: 9, fontWeight: 1000 }}>{selectedTeamIds.length}/2 équipes · {selectedItems.length} commandants</div>
    </>}
  </section>;

  const fleetBlock = <section style={blockStyle(CYAN)}>
    <div style={{ color: CYAN, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 9 }}>FORMAT DE LA FLOTTE</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
      <PresetCard active={fleetPreset === "quick"} icon="⚡" title="ESCARMOUCHE" subtitle="3 navires · 7 cases" color={GREEN} onClick={() => setFleetPreset("quick")} />
      <PresetCard active={fleetPreset === "standard"} icon="⚓" title="STANDARD" subtitle="4 navires · 12 cases" color={BLUE} onClick={() => setFleetPreset("standard")} />
      <PresetCard active={fleetPreset === "armada"} icon="🛳️" title="ARMADA" subtitle="5 navires · 14 cases" color={GOLD} onClick={() => setFleetPreset("armada")} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>{fleet.map((ship) => <div key={ship.id} style={{ borderRadius: 13, padding: 8, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 18 }}>{ship.icon}</div><div style={{ color: "#fff", fontSize: 9.5, fontWeight: 1050 }}>{ship.name}</div><div style={{ color: SOFT, fontSize: 8 }}>{ship.length} zones</div></div>)}</div>
  </section>;

  const weaponsBlock = <section style={blockStyle(GREEN)}>
    <div style={{ color: GREEN, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 9 }}>SYSTÈMES D’ARMES</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
      <PresetCard active={variant === "classic"} icon="🎯" title="CLASSIQUE" subtitle="S, D et T attaquent une seule zone." color={BLUE} onClick={() => setVariant("classic")} />
      <PresetCard active={variant === "tactical"} icon="💥" title="TACTIQUE" subtitle="D et T frappent plusieurs zones." color={GOLD} onClick={() => setVariant("tactical")} />
    </div>
    <div style={{ display: "grid", gap: 7 }}>
      <OptionRow label="Sonar au Bull" hint="Analyse la zone sélectionnée"><OptionToggle value={sonarEnabled} onChange={setSonarEnabled} /></OptionRow>
      <OptionRow label="Frappe DBULL" hint="Frappe de précision spéciale"><OptionToggle value={dbullStrikeEnabled} onChange={setDbullStrikeEnabled} /></OptionRow>
      <OptionRow label="Tir déjà effectué" hint="La fléchette est tout de même consommée"><OptionToggle value={duplicateConsumesDart} onChange={setDuplicateConsumesDart} /></OptionRow>
    </div>
  </section>;

  const battleBlock = <section style={blockStyle(GOLD)}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 9 }}>PARAMÈTRES DE BATAILLE</div>
    <div style={{ display: "grid", gap: 7 }}>
      <OptionRow label="Participants" hint="Chacun pour soi ou deux flottes partagées"><OptionSelect value={participantMode} onChange={setParticipantMode} options={[{ value: "players", label: "Joueurs" }, { value: "teams", label: "Équipes" }]} /></OptionRow>
      <OptionRow label="Difficulté" hint="Aides tactiques et lisibilité"><OptionSelect value={difficulty} onChange={setDifficulty} options={[{ value: "recruit", label: "Recrue" }, { value: "captain", label: "Capitaine" }, { value: "admiral", label: "Amiral" }]} /></OptionRow>
      <OptionRow label="Placement" hint="Automatique ou placement secret"><OptionSelect value={placement} onChange={setPlacement} options={[{ value: "automatic", label: "Automatique" }, { value: "manual", label: "Manuel" }]} /></OptionRow>
      <OptionRow label="Numéros de grille" hint="1 à 20 dans l’ordre ou mélangés"><OptionSelect value={gridOrder} onChange={setGridOrder} options={[{ value: "sequential", label: "Ordre 1–20" }, { value: "random", label: "Aléatoires" }]} /></OptionRow>
      <OptionRow label="Format du match" hint="Premier à 1, 2 ou 3 victoires"><OptionSelect value={winsNeeded} onChange={(v) => setWinsNeeded(Number(v) as any)} options={[{ value: 1, label: "1 manche" }, { value: 2, label: "Best of 3" }, { value: 3, label: "Best of 5" }]} /></OptionRow>
      <OptionRow label="Niveau des bots" hint="Précision et qualité de recherche"><OptionSelect value={botLevel} onChange={setBotLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} /></OptionRow>
      <OptionRow label="Méthode de saisie"><OptionSelect value={scoreInputMethod} onChange={setScoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible tactile" }]} /></OptionRow>
      <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    </div>
  </section>;

  const summaryBlock = <section style={blockStyle(BLUE)}>
    <div style={{ color: BLUE, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 9 }}>ORDRE DE MISSION</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
      {[
        ["MODE", oceanControlVariantLabel(variant), CYAN], ["FLOTTE", oceanControlFleetLabel(fleetPreset), GOLD], ["CASES", `${totalCells}/20`, GREEN],
        ["DIFFICULTÉ", oceanControlDifficultyLabel(difficulty), BLUE], ["MATCH", `Premier à ${winsNeeded}`, RED], [participantMode === "teams" ? "ÉQUIPES" : "JOUEURS", participantMode === "teams" ? selectedTeamIds.length : selectedIds.length, "#fff"],
      ].map(([label, value, color]: any) => <div key={label} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 15, fontWeight: 1100 }}>{value}</div></div>)}
    </div>
    <div style={{ marginTop: 10, color: SOFT, fontSize: 9, lineHeight: 1.45 }}>{variant === "tactical" ? "Simple : 1 zone · Double : 2 zones · Triple : ligne de 3 · Bull : sonar · DBULL : frappe de précision." : "Chaque impact attaque uniquement la zone portant le numéro touché. Bull et DBULL conservent leurs capacités spéciales."}</div>
  </section>;

  const guidedBlocks = [fleetBlock, participantsBlock, weaponsBlock, battleBlock, summaryBlock];

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(48,185,255,.22),#07101b 40%,#020507 100%)", paddingBottom: 18 }}>
    <PageHeader tickerSrc={tickerOcean} tickerAlt="OCEAN CONTROL" left={<BackDot onClick={back} color={BLUE} glow={`${BLUE}88`} />} right={<InfoDot title="Règles OCEAN CONTROL" color={CYAN} glow={`${CYAN}88`} content={<Rules />} />} />
    <main style={{ width: "min(940px,100%)", margin: "0 auto", padding: "7px 9px 18px", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
        <button type="button" onClick={() => chooseView("guided")} style={{ minHeight: 38, borderRadius: 12, border: `1px solid ${viewMode === "guided" ? BLUE : "rgba(255,255,255,.10)"}`, background: viewMode === "guided" ? `${BLUE}18` : "rgba(255,255,255,.025)", color: viewMode === "guided" ? BLUE : SOFT, fontWeight: 1050, cursor: "pointer" }}>CONFIGURATION GUIDÉE</button>
        <button type="button" onClick={() => chooseView("complete")} style={{ minHeight: 38, borderRadius: 12, border: `1px solid ${viewMode === "complete" ? GOLD : "rgba(255,255,255,.10)"}`, background: viewMode === "complete" ? `${GOLD}18` : "rgba(255,255,255,.025)", color: viewMode === "complete" ? GOLD : SOFT, fontWeight: 1050, cursor: "pointer" }}>CONFIGURATION COMPLÈTE</button>
      </div>
      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 5, marginBottom: 8 }}>{steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} style={{ minWidth: 0, minHeight: 34, borderRadius: 11, border: `1px solid ${step === index ? BLUE : "rgba(255,255,255,.08)"}`, background: step === index ? `${BLUE}18` : "rgba(255,255,255,.02)", color: step === index ? BLUE : SOFT, fontSize: 7.5, fontWeight: 1000, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis" }}>{index + 1}. {label}</button>)}</div>
        {guidedBlocks[step]}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ minHeight: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: step === 0 ? "rgba(255,255,255,.3)" : "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button>{step < steps.length - 1 ? <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>SUIVANT</button> : <button type="button" onClick={start} disabled={!valid} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? `linear-gradient(180deg,${GREEN},#239d70)` : "rgba(255,255,255,.035)", color: valid ? "#03130d" : "rgba(255,255,255,.35)", fontWeight: 1200 }}>LANCER OCEAN CONTROL</button>}</div>
      </> : <>{participantsBlock}{fleetBlock}{weaponsBlock}{battleBlock}{summaryBlock}<button type="button" onClick={start} disabled={!valid} style={{ width: "100%", minHeight: 50, borderRadius: 16, border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? `linear-gradient(180deg,${GREEN},#239d70)` : "rgba(255,255,255,.035)", color: valid ? "#03130d" : "rgba(255,255,255,.35)", fontWeight: 1200, fontSize: 13, cursor: valid ? "pointer" : "default" }}>⚓ PRENDRE LE CONTRÔLE DE L’OCÉAN</button></>}
    </main>
  </div>;
}
