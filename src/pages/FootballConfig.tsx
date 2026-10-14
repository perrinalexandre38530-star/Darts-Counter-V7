// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — configuration guidée claire et progressive
// V11 — 7 étapes, une décision principale par écran + résumé avant coup d'envoi
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
import TeamPagedSelector from "../components/TeamPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import tickerFootball from "../assets/tickers/ticker_football.png";
import { loadBotPlayers } from "../lib/bots";
import {
  footballVariantLabel,
  normalizeFootballConfig,
  type FootballBotLevel,
  type FootballConfigPayload,
  type FootballParticipantMode,
  type FootballTieBreaker,
  type FootballVariant,
  type FootballTargetDifficulty,
  type FootballKickoffMode,
} from "../lib/gameEngines/footballEngine";
import {
  FOOTBALL_BUILTIN_PRESETS,
  FOOTBALL_CUSTOM_PRESET_LIMIT,
  deleteFootballCustomPreset,
  footballRulesMatchPreset,
  loadFootballCustomPresets,
  saveFootballCustomPreset,
  snapshotFootballRules,
  type FootballPresetSettings,
} from "../lib/footballPresetStore";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { x01MostUsedDartSetIdForProfile } from "./X01ConfigV3";
import "../styles/football-config.css";

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
  } catch {
    return {};
  }
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

function presetColor(id: string) {
  if (id === "express" || id === "arcade") return GOLD;
  if (id === "tactical") return BLUE;
  if (id === "cup") return RED;
  return GREEN;
}

function RulesContent() {
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.5 }}>
    <div><strong style={{ color: GREEN }}>PRINCIPE</strong><br />Le terrain t’indique la position du ballon et l’écran te dit toujours quoi viser.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />Simple = +1 zone, Double = +2, Triple = +3. Plus tu es précis, plus vite tu approches du but.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />Simple repousse, Double intercepte, Triple intercepte et lance une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Dans la surface, Triple ou DBULL marque directement. Les autres tirs cadrés peuvent déclencher une parade.</div>
    <div><strong style={{ color: GREEN }}>MODE GUIDÉ</strong><br />Sept étapes courtes : variante, style, participants, format, gameplay, saisie puis résumé. Une seule décision importante à la fois.</div>
    <div><strong style={{ color: BLUE }}>TOUS LES RÉGLAGES</strong><br />Affiche les mêmes options sur une seule page pour les joueurs qui veulent tout régler rapidement.</div>
  </div>;
}

function ModeCard({ active, icon, title, subtitle, rules, badge, color, onClick }: any) {
  return <button
    type="button"
    className="football-mode-card"
    onClick={onClick}
    style={{
      border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`,
      background: active ? `linear-gradient(135deg,${color}22,rgba(255,255,255,.035))` : "rgba(255,255,255,.025)",
      boxShadow: active ? `0 0 18px ${color}18` : "none",
    }}
  >
    <div className="football-mode-card__top">
      <span className="football-mode-card__icon">{icon}</span>
      {badge ? <span className="football-mode-card__badge" style={{ color, border: `1px solid ${color}55`, background: `${color}10` }}>{badge}</span> : null}
    </div>
    <div className="football-mode-card__title" style={{ color: active ? color : "#fff" }}>{title}</div>
    <div className="football-mode-card__subtitle">{subtitle}</div>
    <div className="football-mode-card__rules">{rules.map((rule: string) => <span key={rule} className="football-mode-card__rule">{rule}</span>)}</div>
  </button>;
}

function PresetButton({ active, title, subtitle, color, onClick }: any) {
  return <button
    type="button"
    className="football-preset"
    onClick={onClick}
    style={{
      border: `1px solid ${active ? color : "rgba(255,255,255,.09)"}`,
      background: active ? `${color}14` : "rgba(255,255,255,.025)",
      color: active ? color : "#fff",
    }}
  >
    <div className="football-preset__title">{title}</div>
    <div className="football-preset__subtitle">{subtitle}</div>
  </button>;
}

function ConfigBlock({ title, color, children }: any) {
  return <section className="football-config-block" style={{ borderColor: `${color}36` }}>
    <div className="football-config-block__title" style={{ color }}>{title}</div>
    {children}
  </section>;
}

function GuidedIntro({ index, title, text, color = GREEN }: any) {
  return <div className="football-guided-intro" style={{ borderColor: `${color}55` }}>
    <span style={{ color }}>ÉTAPE {index}/7</span>
    <div><strong>{title}</strong><small>{text}</small></div>
  </div>;
}

export default function FootballConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(() => ({ ...readSaved(), ...(props?.params?.config || {}) }), []);
  const initial = React.useMemo(() => normalizeFootballConfig(saved), [saved]);
  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((profile: any) => !isBotLike(profile)), [allProfiles]);
  const bots = React.useMemo(() => {
    try {
      return loadBotPlayers().map((bot: any) => ({ ...bot, id: String(bot.id), name: playerName(bot), isBot: true }));
    } catch {
      return [];
    }
  }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...bots], [humanProfiles, bots]);
  const byId = React.useMemo(() => new Map(profilePool.map((profile: any) => [String(profile.id), profile])), [profilePool]);
  const teams = React.useMemo(() => {
    try {
      return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0);
    } catch {
      return [];
    }
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
  const steps = ["Mode", "Style", "Participants", "Format", "Gameplay", "Saisie", "Résumé"];
  const [participantMode, setParticipantMode] = React.useState<FootballParticipantMode>(initial.participantMode);
  const [variant, setVariant] = React.useState<FootballVariant>(initial.variant);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(defaultSelected);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(unique(saved.selectedTeamIds || []).slice(0, 2));
  const [botPanel, setBotPanel] = React.useState(Boolean(saved.botPanel));
  const [botLevel, setBotLevel] = React.useState<FootballBotLevel>(initial.botLevel);
  const [halfRounds, setHalfRounds] = React.useState(initial.halfRounds);
  const [extraRounds, setExtraRounds] = React.useState(initial.extraRounds);
  const [tieBreaker, setTieBreaker] = React.useState<FootballTieBreaker>(initial.tieBreaker);
  const [goalTarget, setGoalTarget] = React.useState(initial.goalTarget);
  const [penaltyShots, setPenaltyShots] = React.useState(initial.penaltyShots);
  const [mercyGoals, setMercyGoals] = React.useState(initial.mercyGoals);
  const [targetDifficulty, setTargetDifficulty] = React.useState<FootballTargetDifficulty>(initial.targetDifficulty);
  const [kickoffMode, setKickoffMode] = React.useState<FootballKickoffMode>(initial.kickoffMode);
  const [coachHints, setCoachHints] = React.useState(initial.coachHints);
  const [goalkeeperEnabled, setGoalkeeperEnabled] = React.useState(initial.goalkeeperEnabled);
  const [missLosesPossession, setMissLosesPossession] = React.useState(initial.missLosesPossession);
  const [randomOrder, setRandomOrder] = React.useState(initial.randomOrder);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(initial.scoreInputMethod || "keypad");
  const [customPresets, setCustomPresets] = React.useState(() => loadFootballCustomPresets());
  const [customPresetName, setCustomPresetName] = React.useState("");

  const currentRuleSettings = snapshotFootballRules({
    variant,
    botLevel,
    halfRounds,
    extraRounds,
    tieBreaker,
    goalTarget,
    penaltyShots,
    mercyGoals,
    targetDifficulty,
    kickoffMode,
    coachHints,
    goalkeeperEnabled,
    missLosesPossession,
    randomOrder,
    scoreInputMethod,
  });

  function chooseView(next: "guided" | "complete") {
    setViewMode(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  }

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : previous.length >= 2 ? previous : [...previous, id]);
  }

  function toggleTeam(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedTeamIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : previous.length >= 2 ? previous : [...previous, id]);
  }

  function back() {
    if (typeof go === "function") go("games");
    else window.history.back();
  }

  function applyRuleSettings(settings: FootballPresetSettings) {
    if (settings.variant !== undefined) setVariant(settings.variant as FootballVariant);
    if (settings.botLevel !== undefined) setBotLevel(settings.botLevel as FootballBotLevel);
    if (settings.halfRounds !== undefined) setHalfRounds(settings.halfRounds);
    if (settings.extraRounds !== undefined) setExtraRounds(settings.extraRounds);
    if (settings.tieBreaker !== undefined) setTieBreaker(settings.tieBreaker as FootballTieBreaker);
    if (settings.goalTarget !== undefined) setGoalTarget(settings.goalTarget);
    if (settings.penaltyShots !== undefined) setPenaltyShots(settings.penaltyShots);
    if (settings.mercyGoals !== undefined) setMercyGoals(settings.mercyGoals);
    if (settings.targetDifficulty !== undefined) setTargetDifficulty(settings.targetDifficulty as FootballTargetDifficulty);
    if (settings.kickoffMode !== undefined) setKickoffMode(settings.kickoffMode as FootballKickoffMode);
    if (settings.coachHints !== undefined) setCoachHints(settings.coachHints);
    if (settings.goalkeeperEnabled !== undefined) setGoalkeeperEnabled(settings.goalkeeperEnabled);
    if (settings.missLosesPossession !== undefined) setMissLosesPossession(settings.missLosesPossession);
    if (settings.randomOrder !== undefined) setRandomOrder(settings.randomOrder);
    if (settings.scoreInputMethod !== undefined) setScoreInputMethod(settings.scoreInputMethod);
  }

  function applyPreset(id: string) {
    const preset = FOOTBALL_BUILTIN_PRESETS.find((item) => item.id === id);
    if (preset) applyRuleSettings(preset.settings);
  }

  function saveCurrentPreset() {
    const name = customPresetName.trim();
    if (!name) return;
    const existing = customPresets.find((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (!existing && customPresets.length >= FOOTBALL_CUSTOM_PRESET_LIMIT) return;
    setCustomPresets(saveFootballCustomPreset(name, currentRuleSettings));
    setCustomPresetName("");
  }

  function removeCustomPreset(id: string) {
    setCustomPresets(deleteFootballCustomPreset(id));
  }

  const selectedTeams = selectedTeamIds.map((id) => teams.find((team: any) => String(team.id) === id)).filter(Boolean);
  const effectivePlayerIds = participantMode === "teams"
    ? unique(selectedTeams.flatMap((team: any) => team.playerIds || []))
    : selectedIds;
  const selectedPlayers = effectivePlayerIds.map((id) => byId.get(id) || allProfiles.find((profile: any) => String(profile.id) === id) || { id, name: "Joueur" });
  const teamOverlapIds = participantMode === "teams" && selectedTeams.length === 2
    ? unique((selectedTeams[0]?.playerIds || []).filter((id: string) => (selectedTeams[1]?.playerIds || []).map(String).includes(String(id))))
    : [];
  const teamOverlapNames = teamOverlapIds.map((id) => playerName(byId.get(String(id)) || allProfiles.find((profile: any) => String(profile.id) === String(id)) || { name: id }));
  const valid = participantMode === "players"
    ? selectedIds.length === 2
    : selectedTeams.length === 2 && selectedPlayers.length >= 2 && teamOverlapIds.length === 0;
  const hasSelectedBot = selectedPlayers.some(isBotLike);
  const activeBuiltin = FOOTBALL_BUILTIN_PRESETS.find((preset) => footballRulesMatchPreset(currentRuleSettings, preset.settings));
  const activeCustom = customPresets.find((preset) => footballRulesMatchPreset(currentRuleSettings, preset.settings));
  const selectionLabel = participantMode === "players"
    ? (selectedPlayers.length ? selectedPlayers.map(playerName).join(" vs ") : "2 joueurs")
    : (selectedTeams.length ? selectedTeams.map((team: any) => team.name).join(" vs ") : "2 équipes");
  const durationLabel = variant === "penalties" ? `${penaltyShots} tirs + mort subite` : variant === "classic" ? `BULL → DOUBLE · 1er à ${goalTarget}` : variant === "first_to" ? `1er à ${goalTarget} buts` : variant === "golden_goal" ? `1er but · max ${halfRounds} tours` : `2 × ${halfRounds} tours`;
  const readyLabel = valid
    ? "PRÊT"
    : participantMode === "teams" && teamOverlapIds.length
      ? "MEMBRE PRÉSENT DANS LES 2 ÉQUIPES"
      : participantMode === "players" ? "2 JOUEURS REQUIS" : "2 ÉQUIPES REQUISES";

  function buildPayload(): FootballConfigPayload {
    const playerDartSets = Object.fromEntries(selectedPlayers.map((profile: any) => [
      String(profile.id),
      profile?.dartSetId || x01MostUsedDartSetIdForProfile(String(profile.id), humanProfiles) || null,
    ]));
    const teamConfigs = participantMode === "teams" ? selectedTeams.map((team: any, index: number) => ({
      id: String(team.id),
      name: String(team.name || `Équipe ${index + 1}`),
      color: team.color || (index === 0 ? BLUE : RED),
      logoDataUrl: teamLogo(team),
      playerIds: unique(team.playerIds || []),
    })) : undefined;
    return normalizeFootballConfig({
      mode: "football",
      participantMode,
      variant,
      selectedIds: effectivePlayerIds,
      playersList: selectedPlayers.map((profile: any) => ({ ...profile, id: String(profile.id), name: playerName(profile) })),
      teamConfigs,
      playerDartSets,
      botIds: selectedPlayers.filter(isBotLike).map((profile: any) => String(profile.id)),
      botLevel,
      halfRounds,
      extraRounds,
      tieBreaker,
      goalTarget,
      penaltyShots,
      mercyGoals,
      targetDifficulty,
      kickoffMode,
      coachHints,
      goalkeeperEnabled,
      missLosesPossession,
      randomOrder,
      scoreInputMethod,
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

  const variantBlock = <ConfigBlock title="1 · CHOISIS LE TYPE DE MATCH" color={GREEN}>
    <GuidedIntro index={1} title="Quel match veux-tu jouer ?" text="Choisis simplement une variante. Les règles adaptées seront proposées ensuite." color={GREEN} />
    <div className="football-mode-grid">
      <ModeCard active={variant === "match"} icon="🏟️" title="MATCH" badge="RECOMMANDÉ" subtitle="Deux mi-temps, terrain, possession, tirs et gardien." rules={["COMPLET", "TACTIQUE", "ÉQUILIBRÉ"]} color={GREEN} onClick={() => setVariant("match")} />
      <ModeCard active={variant === "golden_goal"} icon="⚡" title="GOLDEN GOAL" subtitle="Un seul but suffit. Idéal pour une partie très rapide." rules={["RAPIDE", "TENSION"]} color={GOLD} onClick={() => setVariant("golden_goal")} />
      <ModeCard active={variant === "first_to"} icon="🏆" title="PREMIER À X" subtitle="Pas de durée imposée : atteins simplement l’objectif de buts." rules={["OBJECTIF", "LIBRE"]} color={BLUE} onClick={() => setVariant("first_to")} />
      <ModeCard active={variant === "penalties"} icon="🥅" title="TIRS AU BUT" subtitle="Duel de précision, série réglable puis mort subite." rules={["DUEL", "PRÉCISION"]} color={RED} onClick={() => setVariant("penalties")} />
      <ModeCard active={variant === "classic"} icon="🎯" title="CLASSIC" subtitle="BULL pour prendre le ballon, DOUBLE pour marquer." rules={["TRÈS SIMPLE", "IMMÉDIAT"]} color={BLUE} onClick={() => setVariant("classic")} />
    </div>
  </ConfigBlock>;

  const presetBlock = <ConfigBlock title="2 · CHOISIS LE STYLE DE PARTIE" color={GOLD}>
    <GuidedIntro index={2} title="Tu veux aller vite ?" text="Choisis un profil prêt à jouer. Il règle automatiquement les options cohérentes." color={GOLD} />
    <div className="football-preset-row">
      {FOOTBALL_BUILTIN_PRESETS.map((preset) => <PresetButton
        key={preset.id}
        active={activeBuiltin?.id === preset.id}
        title={`${preset.icon} ${preset.title}`}
        subtitle={preset.subtitle}
        color={presetColor(preset.id)}
        onClick={() => applyPreset(preset.id)}
      />)}
    </div>

    <div className="football-personal-presets">
      <div className="football-personal-presets__head"><strong style={{ color: BLUE }}>MES PROFILS</strong><span>{customPresets.length}/{FOOTBALL_CUSTOM_PRESET_LIMIT}</span></div>
      {customPresets.length ? <div className="football-personal-presets__list">
        {customPresets.map((preset) => <div key={preset.id} className="football-personal-preset-row">
          <button type="button" className="football-preset" onClick={() => applyRuleSettings(preset.settings)} style={{ border: `1px solid ${activeCustom?.id === preset.id ? BLUE : "rgba(255,255,255,.09)"}`, color: activeCustom?.id === preset.id ? BLUE : "#fff" }}>
            <div className="football-preset__title">★ {preset.name}</div>
            <div className="football-preset__subtitle">{footballVariantLabel((preset.settings.variant || "match") as FootballVariant)} · {preset.settings.targetDifficulty || "standard"}</div>
          </button>
          <button type="button" aria-label={`Supprimer ${preset.name}`} onClick={() => removeCustomPreset(preset.id)} className="football-delete-preset">×</button>
        </div>)}
      </div> : <div className="football-config-note">Tu peux mémoriser jusqu’à 3 profils de règles. Les joueurs ne sont jamais enregistrés dans ces profils.</div>}
      <div className="football-personal-presets__save">
        <input value={customPresetName} maxLength={24} onChange={(event) => setCustomPresetName(event.target.value)} placeholder="Nom du profil" />
        <button type="button" onClick={saveCurrentPreset} disabled={!customPresetName.trim() || (customPresets.length >= FOOTBALL_CUSTOM_PRESET_LIMIT && !customPresets.some((preset) => preset.name.toLocaleLowerCase() === customPresetName.trim().toLocaleLowerCase()))}>ENREGISTRER</button>
      </div>
    </div>
  </ConfigBlock>;

  const participantsBlock = <ConfigBlock title="3 · CHOISIS QUI JOUE" color={BLUE}>
    <GuidedIntro index={3} title="Qui s’affronte ?" text="Choisis un duel direct ou deux équipes, puis sélectionne les participants." color={BLUE} />
    <OptionRow label="Type de confrontation" hint="1 contre 1 ou deux équipes complètes">
      <OptionSelect value={participantMode} options={[{ value: "players", label: "1 contre 1" }, { value: "teams", label: "2 équipes" }]} onChange={setParticipantMode} />
    </OptionRow>

    {participantMode === "players" ? <>
      <div style={{ marginTop: 10 }}><PlayerPagedSelector usageMode="football" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GREEN} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} /></div>
      <div style={{ marginTop: 10 }}><OptionRow label="Ajouter des BOTS IA" hint="Un BOT peut remplacer l’un des deux joueurs"><OptionToggle value={botPanel} onChange={setBotPanel} /></OptionRow></div>
      {botPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={BLUE} pageSize={8} modalTitle="Choisir un BOT" /></div> : null}

      <div className="football-versus-grid">
        {[0, 1].map((index) => {
          const id = selectedIds[index];
          const profile = byId.get(id);
          const color = index === 0 ? BLUE : RED;
          return <React.Fragment key={`${id || "empty"}-${index}`}>
            {index === 1 ? <div className="football-versus-separator">VS</div> : null}
            <div className="football-versus-card" style={{ border: `1px solid ${color}55`, background: `${color}0c`, gridColumn: index === 0 ? "1" : "3" }}>
              <ProfileAvatar profile={profile} size={42} />
              <div style={{ minWidth: 0 }}>
                <div className="football-versus-card__camp" style={{ color }}>CAMP {index + 1}</div>
                <div className="football-versus-card__name">{profile ? playerName(profile) : "À sélectionner"}</div>
              </div>
            </div>
          </React.Fragment>;
        })}
      </div>

      {hasSelectedBot || botPanel ? <div style={{ marginTop: 10 }}><OptionRow label="Niveau des BOTS" hint="Précision sur les secteurs tactiques"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}
    </> : <>
      <div style={{ marginTop: 10 }}><TeamPagedSelector teams={teams} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={GREEN} pageSize={9} modalTitle="Choisir 2 équipes" chooseLabel="Choisir équipes" listLabel="Équipes sélectionnées" /></div>
      {teamOverlapIds.length ? <div className="football-config-note" style={{ color: RED, borderLeftColor: `${RED}88` }}><strong>CONFLIT D’ÉQUIPES :</strong> {teamOverlapNames.join(", ")} {teamOverlapNames.length > 1 ? "sont présents" : "est présent"} dans les deux équipes.</div> : <div className="football-config-note">Les membres jouent à tour de rôle. Le score est collectif mais les statistiques restent individuelles.</div>}
    </>}
  </ConfigBlock>;

  const formatBlock = <ConfigBlock title="4 · RÈGLE LA DURÉE ET L’ISSUE" color={GOLD}>
    <GuidedIntro index={4} title="Combien de temps joue-t-on ?" text="Seulement les réglages utiles à la variante choisie sont affichés." color={GOLD} />
    <div className="football-options-list">
      {variant === "match" || variant === "golden_goal" ? <OptionRow label={variant === "match" ? "Tours par mi-temps" : "Limite avant décision"} hint={variant === "match" ? "Chaque camp joue une fois par tour" : "Sécurité si aucun but n’est marqué"}><OptionSelect value={halfRounds} options={[3, 5, 6, 8, 10, 12, 15]} onChange={setHalfRounds} /></OptionRow> : null}
      {variant === "first_to" || variant === "classic" ? <OptionRow label="Objectif de buts" hint="Le premier camp qui atteint ce total gagne"><OptionSelect value={goalTarget} options={[1, 2, 3, 5, 7, 10]} onChange={setGoalTarget} /></OptionRow> : null}
      {variant === "penalties" ? <OptionRow label="Tirs par camp" hint="Puis mort subite si égalité"><OptionSelect value={penaltyShots} options={[3, 5, 7, 9]} onChange={setPenaltyShots} /></OptionRow> : null}
      {variant === "match" ? <>
        <OptionRow label="En cas d’égalité" hint="Issue du match après les deux périodes"><OptionSelect value={tieBreaker} options={[{ value: "draw", label: "Match nul" }, { value: "golden_goal", label: "Golden Goal" }, { value: "penalties", label: "Tirs au but" }]} onChange={setTieBreaker} /></OptionRow>
        {tieBreaker === "golden_goal" ? <OptionRow label="Tours de prolongation"><OptionSelect value={extraRounds} options={[1, 2, 3, 5]} onChange={setExtraRounds} /></OptionRow> : null}
        <OptionRow label="Mercy rule" hint="Fin anticipée si l’écart devient trop important"><OptionSelect value={mercyGoals} options={[{ value: 0, label: "Désactivée" }, { value: 3, label: "+3 buts" }, { value: 4, label: "+4 buts" }, { value: 5, label: "+5 buts" }]} onChange={setMercyGoals} /></OptionRow>
      </> : null}
    </div>
  </ConfigBlock>;

  const gameplayBlock = <ConfigBlock title="5 · CHOISIS LE NIVEAU DE JEU" color={RED}>
    <GuidedIntro index={5} title="Comment doit se jouer le match ?" text="Ces options changent le rythme sans modifier les commandes de base." color={RED} />
    <div className="football-options-list">
      {variant !== "penalties" && variant !== "classic" ? <OptionRow label="Gardien sur les tirs cadrés" hint="Les frappes S/D ouvrent une phase de parade"><OptionToggle value={goalkeeperEnabled} onChange={setGoalkeeperEnabled} /></OptionRow> : null}
      {variant === "match" || variant === "golden_goal" || variant === "first_to" ? <OptionRow label="Volée ratée = ballon perdu" hint="Accélère le rythme et récompense la précision"><OptionToggle value={missLosesPossession} onChange={setMissLosesPossession} /></OptionRow> : null}
      {variant !== "classic" ? <OptionRow label="Difficulté des secteurs" hint="Accessible = davantage de cibles · Expert = moins de cibles"><OptionSelect value={targetDifficulty} options={[{ value: "accessible", label: "Accessible" }, { value: "standard", label: "Standard" }, { value: "expert", label: "Expert" }]} onChange={setTargetDifficulty} /></OptionRow> : null}
      {variant !== "penalties" ? <OptionRow label="Coup d’envoi" hint="Choisit le camp qui démarre avec le ballon"><OptionSelect value={kickoffMode} options={[{ value: "home", label: "Camp 1" }, { value: "away", label: "Camp 2" }, { value: "random", label: "Aléatoire" }]} onChange={setKickoffMode} /></OptionRow> : null}
    </div>
    <div className="football-config-note"><strong style={{ color: GREEN }}>À RETENIR :</strong> attaque = S +1 / D +2 / T +3. Défense = S repousse / D intercepte / T contre-attaque.</div>
  </ConfigBlock>;

  const inputBlock = <ConfigBlock title="6 · CHOISIS LA SAISIE" color={GREEN}>
    <GuidedIntro index={6} title="Comment vas-tu saisir les fléchettes ?" text="Choisis seulement la méthode de saisie et l’aide visuelle. Le lancement se fait à l’étape suivante." color={GREEN} />
    <div className="football-options-list">
      <OptionRow label="Coach tactique" hint="Affiche clairement quoi viser et l’effet de S / D / T"><OptionToggle value={coachHints} onChange={setCoachHints} /></OptionRow>
      {participantMode === "players" ? <OptionRow label="Ordre des joueurs aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow> : null}
      <OptionRow label="Méthode de saisie" hint="Le clavier compact est le choix le plus rapide"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier compact" }, { value: "dartboard", label: "Cible tactile" }]} onChange={setScoreInputMethod} /></OptionRow>
    </div>
    <div className="football-config-note"><strong style={{ color: GREEN }}>CONSEIL :</strong> garde le coach tactique activé pour les premières parties. Il explique l’action à jouer sans ouvrir les règles.</div>
  </ConfigBlock>;

  const summaryBlock = <ConfigBlock title="7 · VÉRIFIE ET JOUE" color={BLUE}>
    <GuidedIntro index={7} title="Tout est prêt ?" text="Vérifie les choix importants. Aucun réglage supplémentaire n’est nécessaire pour lancer le match." color={BLUE} />
    <div className="football-kickoff-card">
      <div className="football-kickoff-card__flow">
        <span>⚽ POSSESSION</span><b>→</b><span>➜ PROGRESSION</span><b>→</b><span>🥅 TIR</span><b>→</b><span>⚡ BUT</span>
      </div>
      <div className="football-kickoff-card__rule">À chaque volée, l’écran de jeu indique <strong>quoi viser</strong>, <strong>ce que fait S / D / T</strong> et <strong>ce qui se passe si tu rates</strong>.</div>
    </div>
    <div className="football-final-summary">
      <div><span>VARIANTE</span><strong>{footballVariantLabel(variant)}</strong></div>
      <div><span>FORMAT</span><strong>{durationLabel}</strong></div>
      <div><span>JOUEURS</span><strong>{selectionLabel}</strong></div>
      <div><span>STYLE</span><strong>{activeCustom?.name || activeBuiltin?.title || "Personnalisé"}</strong></div>
      <div><span>DIFFICULTÉ</span><strong>{targetDifficulty === "accessible" ? "Accessible" : targetDifficulty === "expert" ? "Expert" : "Standard"}</strong></div>
      <div><span>COACH</span><strong>{coachHints ? "Activé" : "Désactivé"}</strong></div>
      <div><span>GARDIEN</span><strong>{goalkeeperEnabled && variant !== "penalties" && variant !== "classic" ? "Activé" : "Non utilisé"}</strong></div>
      <div><span>SAISIE</span><strong>{scoreInputMethod === "keypad" ? "Clavier compact" : "Cible tactile"}</strong></div>
    </div>
    {!valid ? <div className="football-config-note" style={{ color: RED, borderLeftColor: `${RED}88` }}><strong>À CORRIGER :</strong> {readyLabel.toLowerCase()}.</div> : <div className="football-config-ready-banner"><span>✓ CONFIGURATION VALIDE</span><strong>Tu peux donner le coup d’envoi.</strong></div>}
  </ConfigBlock>;

  const guidedBlocks = [variantBlock, presetBlock, participantsBlock, formatBlock, gameplayBlock, inputBlock, summaryBlock];

  return <div className="football-config-page" style={{ color: theme?.text || "#fff" }}>
    <PageHeader title="FOOTBALL" tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={back} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<RulesContent />} />} />
    <main className="football-config-main">
      <div className="football-config-switch">
        <button type="button" onClick={() => chooseView("guided")} style={{ border: `1px solid ${viewMode === "guided" ? GREEN : "rgba(255,255,255,.10)"}`, background: viewMode === "guided" ? `${GREEN}18` : "rgba(255,255,255,.025)", color: viewMode === "guided" ? GREEN : SOFT }}>CONFIGURATION GUIDÉE</button>
        <button type="button" onClick={() => chooseView("complete")} style={{ border: `1px solid ${viewMode === "complete" ? BLUE : "rgba(255,255,255,.10)"}`, background: viewMode === "complete" ? `${BLUE}18` : "rgba(255,255,255,.025)", color: viewMode === "complete" ? BLUE : SOFT }}>TOUS LES RÉGLAGES</button>
      </div>

      <div className="football-config-summary">
        <div className="football-config-summary__item"><div className="football-config-summary__label">MODE</div><div className="football-config-summary__value" style={{ color: GREEN }}>{footballVariantLabel(variant)}</div></div>
        <div className="football-config-summary__item"><div className="football-config-summary__label">FORMAT</div><div className="football-config-summary__value">{durationLabel}</div></div>
        <div className="football-config-summary__item"><div className="football-config-summary__label">PROFIL</div><div className="football-config-summary__value" style={{ color: activeCustom ? BLUE : activeBuiltin ? presetColor(activeBuiltin.id) : "#fff" }}>{activeCustom?.name || activeBuiltin?.title || "Personnalisé"}</div></div>
        <div className="football-config-summary__item"><div className="football-config-summary__label">SAISIE</div><div className="football-config-summary__value">{scoreInputMethod === "keypad" ? "Clavier" : "Cible"}</div></div>
      </div>

      {viewMode === "guided" ? <>
        <div className="football-config-steps">{steps.map((label, index) => <button key={label} type="button" className="football-config-step" onClick={() => setStep(index)} style={{ border: `1px solid ${index === step ? GREEN : "rgba(255,255,255,.08)"}`, background: index === step ? `${GREEN}18` : "rgba(255,255,255,.02)", color: index === step ? GREEN : SOFT }}>{index + 1}. {label}</button>)}</div>
        {guidedBlocks[step]}
      </> : <>{variantBlock}{presetBlock}{participantsBlock}{formatBlock}{gameplayBlock}{inputBlock}{summaryBlock}</>}

      <div className="football-config-actions">
        <div className="football-config-ready"><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectionLabel}</span><strong style={{ color: valid ? GREEN : RED }}>{readyLabel}</strong></div>
        <button type="button" onClick={() => viewMode === "guided" ? setStep((value) => Math.max(0, value - 1)) : chooseView("guided")} disabled={viewMode === "guided" && step === 0} style={{ border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: viewMode === "guided" && step === 0 ? "rgba(255,255,255,.25)" : "#fff" }}>{viewMode === "complete" ? "MODE GUIDÉ" : "← RETOUR"}</button>
        {viewMode === "guided" && step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} style={{ border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN }}>SUIVANT →</button> : <button type="button" disabled={!valid} onClick={start} style={{ border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? "linear-gradient(180deg,#72edb5,#2aaa78)" : "rgba(255,255,255,.025)", color: valid ? "#03130d" : SOFT }}>⚽ COUP D’ENVOI</button>}
      </div>
    </main>
  </div>;
}
