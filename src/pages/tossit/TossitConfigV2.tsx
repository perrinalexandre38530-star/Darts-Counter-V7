/**
 * TOSSIT configuration V2 — reuse the actual MSS / DartsCounter profile and team selectors.
 * The scoring engines and History V4 are deliberately untouched.
 */
import React from "react";
import { useLang } from "../../contexts/LangContext";
import { useAwenaOptional } from "../../awena/AwenaProvider";
import ConfigTickerHeader from "../../components/ConfigTickerHeader";
import BackDot from "../../components/BackDot";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import TeamSelectorV2 from "../../components/TeamSelectorV2";
import { loadTeamsBySport } from "../../lib/petanqueTeamsStore";
import { teamBaseId, nextTeamInstanceId } from "../../lib/teamSelectionInstances";
import { findRememberedGeneratedTeam } from "../../lib/teamAutoShuffle";
import { newTossitGame, TOSSIT_MODES, type TossitMode, type TossitPlayer } from "./tossitEngine";
import {
  tossitDartsOptions, tossitMaximumPlayers, tossitMinimumPlayers,
  tossitRequiresTwoSides, tossitSelectionError, tossitSetupPreset,
  tossitSupportsTeams, tossitTargetOptions,
  type TossitConfigView, type TossitParticipantKind, type TossitSetupStyle,
} from "./tossitConfigPreset";

const ACCENT = "#48E7CF";
const arcadeBg = "rgba(8,12,24,.95)";
const SURFACE: React.CSSProperties = { border: "1px solid rgba(72,231,207,.21)", background: arcadeBg, borderRadius: 18, padding: 14, boxShadow: "0 14px 34px rgba(0,0,0,.26)" };

type Props = {
  go: (route: any, params?: any) => void;
  store?: any;
  mode: TossitMode;
  onModeChange: (mode: TossitMode) => void;
  ticker: string;
  initialStyle?: TossitSetupStyle;
  showModePicker?: boolean;
};

function nameForProfile(p: any) {
  return String(p?.name || p?.nickname || p?.displayName || "Joueur").trim() || "Joueur";
}
function profileIds(profiles: any[], activeProfileId: any, max: number): string[] {
  const byId = new Map(profiles.map(p => [String(p.id), p]));
  const active = String(activeProfileId ?? "");
  const ids = active && byId.has(active) ? [active] : [];
  for (const p of profiles) if (!ids.includes(String(p.id)) && ids.length < Math.min(max, 2)) ids.push(String(p.id));
  return ids;
}

function AwenaConfigMedallion({ mode, help }: { mode: TossitMode; help: string }) {
  const awena = useAwenaOptional();
  const { lang } = useLang();
  const fr = String(lang || "fr").startsWith("fr");
  const [showHelp, setShowHelp] = React.useState(false);
  const modeLabel = TOSSIT_MODES.find(m => m.id === mode)?.title || "TOSSIT";
  const enabled = Boolean(awena?.settings?.enabled && awena?.settings?.interventionMode !== "off");
  const openHelp = () => {
    if (enabled && awena) {
      awena.setRuntime({ sport: "tossit", mode, phase: "config", inGame: false, screenLabel: `TOSSIT • ${modeLabel}` });
      awena.openPanel();
      void awena.ask(`Explique en français la configuration de TOSSIT ${modeLabel} : profils locaux, équipes, format Partie rapide ou Arcade, règles du mode. Voici l'aide intégrée : ${help}`, { modeTopic: "config", canonicalFrench: true });
    } else setShowHelp(true);
  };
  return <>
    <button className="tossit-awena-dot" type="button" onClick={openHelp} title={enabled ? "Awena — aide IA TOSSIT" : "Aide de configuration TOSSIT"} aria-label={enabled ? "Ouvrir Awena, aide IA" : "Aide configuration"}>
      <img src="/awena/awena-avatar.webp" alt="" />
    </button>
    {showHelp && <div className="tossit-config-help-mask" role="presentation" onClick={() => setShowHelp(false)}>
      <div className="tossit-config-help-dialog" role="dialog" aria-modal="true" aria-label="Aide TOSSIT" onClick={event => event.stopPropagation()}>
        <div className="tossit-config-help-title"><strong>{modeLabel}</strong><button type="button" onClick={() => setShowHelp(false)} aria-label="Fermer">✕</button></div>
        <p>{help}</p>
        <p>{fr ? "Partie rapide : préréglages courts. Arcade : format plus long. Dans les deux cas, les règles du jeu sont identiques." : "Quick game: shorter presets. Arcade: longer presets. The game rules remain identical."}</p>
        <button type="button" onClick={() => setShowHelp(false)} className="tossit-config-primary">OK</button>
      </div>
    </div>}
  </>;
}

function Choice<T extends string | number>({ options, value, onChange, label }: {
  options: ReadonlyArray<{ value: T; text: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return <div className="tossit-v2-choices" role="group" aria-label={label}>{options.map(item =>
    <button key={String(item.value)} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>{item.text}</button>
  )}</div>;
}

export default function TossitConfigV2({ go, store, mode, onModeChange, ticker, initialStyle = "quick", showModePicker = false }: Props) {
  const { lang } = useLang();
  const fr = String(lang || "fr").toLowerCase().startsWith("fr");
  const tr = (f: string, e: string) => fr ? f : e;
  const meta = TOSSIT_MODES.find(m => m.id === mode)!;
  const localProfiles: any[] = React.useMemo(() => (Array.isArray(store?.profiles) ? store.profiles : []).filter((p: any) => p?.id && p?.isBot !== true), [store?.profiles]);
  const profilesById = React.useMemo(() => new Map(localProfiles.map(p => [String(p.id), p])), [localProfiles]);
  const storedTeams = React.useMemo(() => {
    // Teams remain in the SAME shared MSS team repository; accept existing DARTS teams
    // as well as teams explicitly available for TOSSIT (including allSports teams).
    const byId = new Map<string, any>();
    for (const team of [...loadTeamsBySport("tossit"), ...loadTeamsBySport("darts")]) {
      const id = teamBaseId(team);
      if (id && !byId.has(id)) byId.set(id, team);
    }
    return [...byId.values()];
  }, []);
  const [generatedTeams, setGeneratedTeams] = React.useState<any[]>([]);
  const allTeams = React.useMemo(() => {
    const byId = new Map<string, any>();
    for (const team of [...storedTeams, ...generatedTeams]) byId.set(teamBaseId(team), team);
    return [...byId.values()];
  }, [storedTeams, generatedTeams]);
  const [configView, setConfigView] = React.useState<TossitConfigView>("guided");
  const [step, setStep] = React.useState(0);
  const [setupStyle, setSetupStyle] = React.useState<TossitSetupStyle>(initialStyle);
  const [participantKind, setParticipantKind] = React.useState<TossitParticipantKind>(mode === "conquest" ? "teams" : "players");
  const [selectedProfileIds, setSelectedProfileIds] = React.useState<string[]>(() => profileIds(localProfiles, store?.activeProfileId, tossitMaximumPlayers(mode)));
  const [guests, setGuests] = React.useState<Array<{ id: string; name: string }>>([]);
  const [teamSize, setTeamSize] = React.useState<1 | 2>(2);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [teamSelections, setTeamSelections] = React.useState<Record<string, string[]>>({});
  const [darts, setDarts] = React.useState(() => tossitSetupPreset(mode, initialStyle).darts);
  const [gridSize, setGridSize] = React.useState<4 | 5>(() => tossitSetupPreset(mode, initialStyle).gridSize);
  const [victoryTarget, setVictoryTarget] = React.useState(() => tossitSetupPreset(mode, initialStyle).victoryTarget);
  const [error, setError] = React.useState("");

  const setPreset = (style: TossitSetupStyle) => {
    const preset = tossitSetupPreset(mode, style);
    setSetupStyle(style);
    setDarts(preset.darts);
    setVictoryTarget(preset.victoryTarget);
    setGridSize(preset.gridSize);
    setError("");
  };
  const maxPlayers = tossitMaximumPlayers(mode);
  const togglePlayer = (rawId: any) => {
    const id = String(rawId);
    setSelectedProfileIds(old => old.includes(id) ? old.filter(x => x !== id) : old.length + guests.length < maxPlayers ? [...old, id] : old);
  };
  const selectedPlayers: TossitPlayer[] = [
    ...selectedProfileIds.map(id => profilesById.get(id)).filter(Boolean).map(p => ({ id: String(p.id), name: nameForProfile(p), avatarDataUrl: p.avatarDataUrl ?? p.avatarUrl ?? null })),
    ...guests.map(p => ({ ...p })),
  ];
  const selectedTeams = selectedTeamIds.map(instanceId => {
    const team = allTeams.find(t => teamBaseId(t) === teamBaseId(instanceId)) || findRememberedGeneratedTeam(teamBaseId(instanceId));
    const playerIds = teamSelections[instanceId] || [];
    return team ? {
      id: `tossit-team:${instanceId}`,
      name: String(team.name || "Équipe"),
      avatarDataUrl: team.logoDataUrl || team.logoUrl || null,
      teamId: String(team.id || teamBaseId(instanceId)),
      memberIds: playerIds.slice(),
    } : null;
  }).filter(Boolean) as Array<TossitPlayer & { teamId: string; memberIds: string[] }>;
  const membersByTeam = selectedTeams.map(team => team.memberIds);
  const participants: TossitPlayer[] = participantKind === "teams" ? selectedTeams : selectedPlayers;
  const selectionError = tossitSelectionError(mode, participants.map(p => p.id), participantKind, membersByTeam);
  const selectionMessage = selectionError ? {
    "teams-not-supported": tr("Ce mode ne permet pas les équipes.", "Teams are not available for this mode."),
    "two-teams-required": tr("Sélectionne exactement deux équipes.", "Select exactly two teams."),
    "missing-team-members": tr("Chaque équipe doit avoir des membres locaux.", "Each team needs local members."),
    "member-in-both-teams": tr("Un profil ne peut pas jouer dans les deux équipes.", "A profile cannot play on both teams."),
    "missing-players": tr(`Il faut au moins ${tossitMinimumPlayers(mode)} participant(s).`, `At least ${tossitMinimumPlayers(mode)} participant(s) required.`),
    "too-many-players": tr("Trop de joueurs sélectionnés.", "Too many players selected."),
    "exactly-two-sides": tr("Ce mode se joue avec exactement deux camps.", "This mode requires exactly two sides."),
    "duplicate-participants": tr("Les participants doivent être distincts.", "Participants must be distinct."),
  }[selectionError] : "";

  const addTeam = (baseTeamId: string, playerIds: string[]) => {
    if (selectedTeamIds.length >= 2) return;
    const instanceId = nextTeamInstanceId({ id: baseTeamId }, selectedTeamIds);
    setTeamSelections(prev => ({ ...prev, [instanceId]: playerIds.map(String) }));
    setSelectedTeamIds(old => [...old, instanceId]);
  };
  const removeTeam = (id: string) => {
    setSelectedTeamIds(old => old.filter(teamId => teamId !== id));
    setTeamSelections(old => { const next = { ...old }; delete next[id]; return next; });
  };
  const startGame = () => {
    setError("");
    if (selectionError) { setError(selectionMessage); return; }
    if (participantKind === "teams" && selectedTeams.some(t => t.memberIds.length !== teamSize)) {
      setError(tr(`Chaque équipe doit avoir ${teamSize} membre(s).`, `Each team needs ${teamSize} member(s).`)); return;
    }
    try {
      // Validation finale par LE MÊME moteur que PLAY, aucune règle dupliquée.
      newTossitGame(mode, participants, darts, Date.now(), gridSize, victoryTarget);
      go("tossit_play", { mode, players: participants, darts, gridSize, victoryTarget, setupStyle });
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
  };
  const hasValidSelection = !selectionError && (participantKind !== "teams" || selectedTeams.every(t => t.memberIds.length === teamSize));
  const canView = (at: number) => configView === "complete" || step === at;
  const headerHelp = `${meta.description} ${tr("Les joueurs et équipes proviennent des profils locaux MSS.", "Players and teams come from MSS local profiles.")}`;

  return <main className={`tossit-page tossit-config-page tossit-v2-config tossit-v2-config--${configView}`}>
    <ConfigTickerHeader src={ticker} alt={meta.title} height={130} sticky={false}
      left={<BackDot color={ACCENT} size={40} onClick={() => go("games")} />}
      right={<AwenaConfigMedallion mode={mode} help={headerHelp} />}/>
    <header className="tossit-v2-heading">
      <div className="tossit-v2-kicker">TOSSIT SCORING • {tr("CONFIGURATION", "CONFIGURATION")}</div>
      <h1>{meta.title}</h1>
      <p>{meta.description}</p>
      <div className="tossit-v2-heading-switches">
        <Choice<TossitConfigView> label={tr("Affichage de la configuration", "Configuration view")} value={configView} onChange={setConfigView} options={[{ value: "guided", text: tr("GUIDÉE", "GUIDED") }, { value: "complete", text: tr("COMPLÈTE", "COMPLETE") }]}/>
      </div>
    </header>

    {configView === "guided" && <nav className="tossit-v2-steps" aria-label={tr("Étapes de configuration", "Setup steps")}>
      {[tr("Format", "Format"), tr("Joueurs / équipes", "Players / teams"), tr("Options / jouer", "Options / play")].map((label, index) =>
        <button type="button" key={label} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>
      )}
    </nav>}

    {canView(0) && <section className="tossit-v2-panel" style={SURFACE}>
      <h2><span>01</span>{tr("FORMAT DE PARTIE", "MATCH FORMAT")}</h2>
      <div className="tossit-v2-presets">
        <button type="button" className="tossit-v2-preset" aria-pressed={setupStyle === "quick"} onClick={() => setPreset("quick")}>
          <span className="tossit-v2-preset-icon">⚡</span><strong>{tr("PARTIE RAPIDE", "QUICK GAME")}</strong><small>{tr("Préréglages courts et démarrage immédiat", "Short presets and fast start")}</small>
        </button>
        <button type="button" className="tossit-v2-preset" aria-pressed={setupStyle === "arcade"} onClick={() => setPreset("arcade")}>
          <span className="tossit-v2-preset-icon">🏆</span><strong>ARCADE</strong><small>{tr("Plus de manches et de ventouses selon le mode", "More rounds and darts where supported")}</small>
        </button>
      </div>
      {showModePicker && <div className="tossit-v2-mode-picker">
        <h3>{tr("Choisir un des 18 modes", "Choose one of the 18 modes")}</h3>
        <div className="tossit-v2-mode-options" role="group" aria-label={tr("Modes TOSSIT", "TOSSIT modes")}>{TOSSIT_MODES.map(item =>
          <button type="button" key={item.id} aria-pressed={mode === item.id} onClick={() => onModeChange(item.id)}>{item.title}</button>
        )}</div>
      </div>}
      <p className="tossit-v2-note">{tr("Les préréglages Arcade / Partie rapide ne changent pas les règles de TOSSIT, uniquement la durée et les options autorisées.", "Arcade / Quick presets do not change TOSSIT rules, only match length and supported settings.")}</p>
      {setupStyle === "quick" && hasValidSelection && <button type="button" className="tossit-config-primary tossit-v2-quick-start" onClick={startGame}>⚡ {tr("DÉMARRER AVEC LES PROFILS SÉLECTIONNÉS", "START WITH SELECTED PROFILES")}</button>}
    </section>}

    {canView(1) && <section className="tossit-v2-panel" style={SURFACE}>
      <h2><span>02</span>{tr("PARTICIPANTS", "PARTICIPANTS")}</h2>
      {tossitSupportsTeams(mode) && <Choice<TossitParticipantKind> label={tr("Joueurs ou équipes", "Players or teams")} value={participantKind} onChange={setParticipantKind}
        options={[{ value: "players", text: tr("JOUEURS", "PLAYERS") }, { value: "teams", text: tr("ÉQUIPES", "TEAMS") }]}/>}
      {participantKind === "players" ? <>
        <p className="tossit-v2-note">{tr("Sélection commune à tous les sports : profils locaux, photos et identifiants d'origine.", "Shared local MSS profiles, photos and original player IDs.")}</p>
        <PlayerPagedSelector profiles={localProfiles} selectedIds={selectedProfileIds} onToggle={togglePlayer} accent={ACCENT} pageSize={9}
          modalTitle={tr("Choisir les profils locaux", "Choose local profiles")} showProfileStarring={false} usageMode="global" showSelectedSummary={true}/>
        {localProfiles.length === 0 && <div className="tossit-v2-warn">{tr("Aucun profil local disponible. Crée un profil dans PROFILES, ou utilise un invité temporaire.", "No local profile found. Create a profile in PROFILES, or add a temporary guest.")} <button type="button" onClick={() => go("profiles")}>{tr("OUVRIR PROFILS", "OPEN PROFILES")}</button></div>}
        <div className="tossit-v2-guest-area">
          <button type="button" onClick={() => setGuests(old => old.length + selectedProfileIds.length >= maxPlayers ? old : [...old, { id: `tossit-guest-${Date.now()}-${old.length}`, name: `${tr("Invité", "Guest")} ${old.length + 1}` }])} disabled={guests.length + selectedProfileIds.length >= maxPlayers}>+ {tr("Ajouter un invité", "Add guest")}</button>
          {guests.map((guest, index) => <label key={guest.id}>{tr("Invité", "Guest")} {index + 1}<input value={guest.name} maxLength={50} onChange={e => setGuests(old => old.map(g => g.id === guest.id ? { ...g, name: e.target.value } : g))}/><button type="button" onClick={() => setGuests(old => old.filter(g => g.id !== guest.id))} aria-label={tr("Supprimer l'invité", "Remove guest")}>×</button></label>)}
        </div>
        <p className="tossit-v2-note">{participants.length}/{maxPlayers} · {tr("minimum", "minimum")} {tossitMinimumPlayers(mode)}{tossitRequiresTwoSides(mode) ? tr(" · exactement deux camps", " · exactly two sides") : ""}</p>
      </> : <>
        <p className="tossit-v2-note">{tr("Sélecteur DartsCounter : équipes MSS enregistrées pour Darts ou TOSSIT, ou brassage automatique. Exactement deux camps.", "DartsCounter selector: existing Darts or TOSSIT MSS teams, or automatic team shuffle. Exactly two sides.")}</p>
        <Choice<1 | 2> label={tr("Joueurs par équipe", "Players per team")} value={teamSize} onChange={size => { setTeamSize(size); setSelectedTeamIds([]); setTeamSelections({}); }} options={[{ value: 1, text: tr("1 / équipe", "1 / team") }, { value: 2, text: tr("2 / équipe", "2 / team") }]}/>
        <TeamSelectorV2 title={tr("ÉQUIPES MSS", "MSS TEAMS")} teams={allTeams} selectedTeamIds={selectedTeamIds} selectedTeamPlayerIds={teamSelections}
          profilesById={profilesById} maxPlayers={teamSize} maxSelections={2} primary={ACCENT} primarySoft="rgba(72,231,207,.14)" sport="tossit"
          autoShufflePlayers={localProfiles} allowAutoShuffle={true} onAdd={addTeam} onRemove={removeTeam}
          onGeneratedTeamsChange={setGeneratedTeams}
          onReplaceSelectedTeams={(ids, selections, generated) => { setGeneratedTeams(generated); setSelectedTeamIds(ids.slice(0, 2)); setTeamSelections(selections); }}/>
        <p className="tossit-v2-note">{tr("Le score est calculé par équipe. Les identifiants des joueurs membres restent associés au résultat.", "Scoring is by team. Member profile IDs are kept with the match.")}</p>
      </>}
      {selectionError && <p className="tossit-v2-inline-error" role="status">{selectionMessage}</p>}
    </section>}

    {canView(2) && <section className="tossit-v2-panel" style={SURFACE}>
      <h2><span>03</span>{tr("OPTIONS & RÉCAPITULATIF", "OPTIONS & SUMMARY")}</h2>
      <div className="tossit-v2-option-grid">
        <div><h3>{tr("Ventouses par joueur", "Darts per player")}</h3><Choice<number> label={tr("Ventouses", "Darts")} options={tossitDartsOptions(mode).map(value => ({ value, text: String(value) }))} value={darts} onChange={setDarts}/></div>
        {mode === "tictac" && <div><h3>{tr("Grille du Morpion", "Tic-tac grid")}</h3><Choice<4 | 5> label={tr("Grille", "Grid")} options={[{ value: 4, text: "4×4" }, { value: 5, text: "5×5" }]} value={gridSize} onChange={setGridSize}/></div>}
        {tossitTargetOptions(mode).length > 1 && <div><h3>{tr("Manches ou passages", "Rounds or turns")}</h3><Choice<number> label={tr("Format", "Format")} options={tossitTargetOptions(mode).map(value => ({ value, text: String(value) }))} value={victoryTarget} onChange={setVictoryTarget}/></div>}
      </div>
      <div className="tossit-v2-recap">
        <strong>{tr("RÉCAPITULATIF", "RECAP")}</strong>
        <p>{meta.title} · {setupStyle === "quick" ? tr("Partie rapide", "Quick game") : "Arcade"} · {participantKind === "players" ? tr("Joueurs", "Players") : tr("Équipes", "Teams")}</p>
        <p>{participants.map(p => p.name.trim() || "—").join("  VS  ") || "—"}</p>
        <p>{darts} {tr("ventouses", "darts")}{tossitTargetOptions(mode).length > 1 ? ` · ${victoryTarget} ${tr("manches/passages", "rounds/turns")}` : ""}{mode === "tictac" ? ` · ${gridSize}×${gridSize}` : ""}</p>
      </div>
      <p className="tossit-v2-note">{meta.description}</p>
    </section>}

    {configView === "guided" && <div className="tossit-v2-step-actions">
      {step > 0 && <button type="button" className="tossit-v2-back" onClick={() => setStep(old => old - 1)}>{tr("PRÉCÉDENT", "PREVIOUS")}</button>}
      {step < 2 && <button type="button" className="tossit-config-primary" onClick={() => { setStep(old => Math.min(2, old + 1)); setError(""); }}>{tr("SUIVANT", "NEXT")}</button>}
    </div>}
    {(configView === "complete" || step === 2) && <div className="tossit-v2-start-bar">
      {error && <p role="alert" className="tossit-v2-inline-error">{error}</p>}
      <button type="button" className="tossit-config-primary tossit-v2-start" disabled={!hasValidSelection || participants.some(p => !p.name.trim())} onClick={startGame}>
        {tr("LANCER LA PARTIE", "START GAME")}
      </button>
      {!hasValidSelection && <p>{selectionMessage || tr("Termine d'abord la sélection des participants.", "Complete participant selection first.")}</p>}
    </div>}
  </main>;
}
