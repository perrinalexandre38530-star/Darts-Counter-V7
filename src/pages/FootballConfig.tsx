// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — configuration guidée lisible et progressive
// V10 — 7 étapes simples + configuration complète conservée
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
  footballTieBreakerLabel,
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

const GUIDED_STEPS = [
  { id: "format", label: "Format", title: "Quel match veux-tu jouer ?", text: "Choisis seulement la manière de gagner. Les détails viendront ensuite." },
  { id: "style", label: "Style", title: "Quel rythme de match ?", text: "Un profil règle automatiquement l'ambiance et la difficulté sans surcharger l'écran." },
  { id: "participants", label: "Joueurs", title: "Qui joue ?", text: "Choisis un duel ou deux équipes, puis compose les deux camps." },
  { id: "rules", label: "Durée", title: "Combien de temps joue-t-on ?", text: "Uniquement les règles essentielles propres au format sélectionné." },
  { id: "gameplay", label: "Gameplay", title: "Comment doit se jouer le match ?", text: "Régle la difficulté, le gardien et la circulation du ballon." },
  { id: "input", label: "Saisie", title: "Comment veux-tu saisir les fléchettes ?", text: "Choisis le clavier ou la cible tactile et les aides d'affichage." },
  { id: "ready", label: "Prêt", title: "Tout est prêt", text: "Vérifie le résumé et rappelle-toi les quatre actions principales avant le coup d'envoi." },
] as const;

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
  return <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.5 }}>
    <div><strong style={{ color: GREEN }}>PRINCIPE</strong><br />Le terrain indique la position du ballon. Le bloc « QUE DOIS-JE FAIRE ? » indique toujours l'action et les secteurs à viser.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />Simple = +1 zone, Double = +2 zones, Triple = +3 zones.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />Simple repousse, Double intercepte, Triple intercepte et lance une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Triple ou DBULL peut marquer directement. Les autres tirs cadrés peuvent ouvrir une phase de gardien.</div>
    <div><strong style={{ color: GREEN }}>CLASSIC</strong><br />BULL pour prendre la possession, puis n'importe quel DOUBLE pour marquer.</div>
  </div>;
}

function ModeCard({ active, icon, title, subtitle, rules, badge, color, onClick }: any) {
  return <button
    type="button"
    className={`football-mode-card ${active ? "is-active" : ""}`}
    onClick={onClick}
    style={{ ["--football-choice-color" as any]: color }}
  >
    <div className="football-mode-card__top">
      <span className="football-mode-card__icon">{icon}</span>
      {badge ? <span className="football-mode-card__badge">{badge}</span> : null}
    </div>
    <div className="football-mode-card__title">{title}</div>
    <div className="football-mode-card__subtitle">{subtitle}</div>
    <div className="football-mode-card__rules">{rules.map((rule: string) => <span key={rule} className="football-mode-card__rule">{rule}</span>)}</div>
  </button>;
}

function PresetButton({ active, title, subtitle, color, onClick }: any) {
  return <button
    type="button"
    className={`football-preset ${active ? "is-active" : ""}`}
    onClick={onClick}
    style={{ ["--football-choice-color" as any]: color }}
  >
    <div className="football-preset__title">{title}</div>
    <div className="football-preset__subtitle">{subtitle}</div>
  </button>;
}

function ConfigBlock({ title, subtitle, color, children, className = "" }: any) {
  return <section className={`football-config-block ${className}`} style={{ ["--football-block-color" as any]: color }}>
    <div className="football-config-block__heading">
      <div className="football-config-block__title">{title}</div>
      {subtitle ? <div className="football-config-block__subtitle">{subtitle}</div> : null}
    </div>
    {children}
  </section>;
}

function ParticipantModeButton({ active, icon, title, text, color, onClick }: any) {
  return <button
    type="button"
    className={`football-participant-choice ${active ? "is-active" : ""}`}
    style={{ ["--football-choice-color" as any]: color }}
    onClick={onClick}
  >
    <span className="football-participant-choice__icon">{icon}</span>
    <span>
      <strong>{title}</strong>
      <small>{text}</small>
    </span>
  </button>;
}

function ReviewItem({ label, value, color = "#fff" }: any) {
  return <div className="football-review-item">
    <span>{label}</span>
    <strong style={{ color }}>{value}</strong>
  </div>;
}

function HowToPlay() {
  return <div className="football-how-grid">
    <div className="football-how-card is-attack"><strong>1 · ATTAQUE</strong><span>Vise les secteurs affichés</span><small>S +1 · D +2 · T +3 zones</small></div>
    <div className="football-how-card is-defense"><strong>2 · DÉFENSE</strong><span>Récupère ou repousse</span><small>S repousse · D intercepte · T contre</small></div>
    <div className="football-how-card is-shot"><strong>3 · TIR</strong><span>Dans la surface, frappe</span><small>T / DBULL très dangereux</small></div>
    <div className="football-how-card is-keeper"><strong>4 · GARDIEN</strong><span>Vise la zone de parade</span><small>Une réussite peut sauver le but</small></div>
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
    if (next === "guided") setStep(0);
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

  function applyRuleSettings(settings: FootballPresetSettings, preserveVariant = false) {
    const previousVariant = variant;
    if (settings.variant !== undefined && !preserveVariant) setVariant(settings.variant as FootballVariant);
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
    if (preserveVariant) setVariant(previousVariant);
  }

  function applyPreset(id: string, preserveVariant = false) {
    const preset = FOOTBALL_BUILTIN_PRESETS.find((item) => item.id === id);
    if (preset) applyRuleSettings(preset.settings, preserveVariant);
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

  const formatBlock = <ConfigBlock title="CHOISIS LE FORMAT" subtitle="Une seule décision : comment gagne-t-on ?" color={GREEN}>
    <div className="football-mode-grid">
      <ModeCard active={variant === "match"} icon="🏟️" title="MATCH" badge="RECOMMANDÉ" subtitle="Deux périodes, terrain complet, possession et gardien." rules={["COMPLET", "TACTIQUE"]} color={GREEN} onClick={() => setVariant("match")} />
      <ModeCard active={variant === "golden_goal"} icon="⚡" title="GOLDEN GOAL" subtitle="Le premier but termine immédiatement la partie." rules={["RAPIDE", "TENSION"]} color={GOLD} onClick={() => setVariant("golden_goal")} />
      <ModeCard active={variant === "first_to"} icon="🏆" title="PREMIER À X" subtitle="Le premier camp qui atteint l'objectif de buts gagne." rules={["OBJECTIF", "LIBRE"]} color={BLUE} onClick={() => setVariant("first_to")} />
      <ModeCard active={variant === "penalties"} icon="🥅" title="TIRS AU BUT" subtitle="Duel de précision, puis mort subite si nécessaire." rules={["DUEL", "PRÉCISION"]} color={RED} onClick={() => setVariant("penalties")} />
      <ModeCard active={variant === "classic"} icon="🎯" title="CLASSIC" subtitle="BULL pour le ballon, DOUBLE pour marquer." rules={["TRÈS SIMPLE", "DIRECT"]} color={BLUE} onClick={() => setVariant("classic")} />
    </div>
  </ConfigBlock>;

  const styleBlock = <ConfigBlock title="CHOISIS LE STYLE" subtitle="Le format reste inchangé : seul le rythme du match est ajusté." color={GOLD}>
    <div className="football-preset-row is-guided">
      {FOOTBALL_BUILTIN_PRESETS.map((preset) => <PresetButton
        key={preset.id}
        active={activeBuiltin?.id === preset.id}
        title={`${preset.icon} ${preset.title}`}
        subtitle={preset.subtitle}
        color={presetColor(preset.id)}
        onClick={() => applyPreset(preset.id, true)}
      />)}
    </div>
    <div className="football-config-note is-large"><strong>Conseil :</strong> Standard convient à une première partie. Tactique ralentit le rythme, Arcade l'accélère.</div>
  </ConfigBlock>;

  const participantsBlock = <ConfigBlock title="COMPOSE LES DEUX CAMPS" subtitle="Choisis d'abord duel ou équipes, puis sélectionne les participants." color={BLUE}>
    <div className="football-participant-choice-grid">
      <ParticipantModeButton active={participantMode === "players"} icon="👤" title="1 CONTRE 1" text="Deux joueurs ou un joueur contre un BOT" color={BLUE} onClick={() => setParticipantMode("players")} />
      <ParticipantModeButton active={participantMode === "teams"} icon="👥" title="2 ÉQUIPES" text="Chaque membre joue à tour de rôle" color={GREEN} onClick={() => setParticipantMode("teams")} />
    </div>

    {participantMode === "players" ? <>
      <div className="football-selector-shell">
        <PlayerPagedSelector usageMode="football" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GREEN} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
      </div>
      <OptionRow label="Ajouter des BOTS IA" hint="Active cette option si un BOT doit participer"><OptionToggle value={botPanel} onChange={setBotPanel} /></OptionRow>
      {botPanel ? <div className="football-selector-shell"><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={BLUE} pageSize={8} modalTitle="Choisir un BOT" /></div> : null}

      <div className="football-versus-grid">
        {[0, 1].map((index) => {
          const id = selectedIds[index];
          const profile = byId.get(id);
          const color = index === 0 ? BLUE : RED;
          return <React.Fragment key={`${id || "empty"}-${index}`}>
            {index === 1 ? <div className="football-versus-separator">VS</div> : null}
            <div className="football-versus-card" style={{ ["--football-camp-color" as any]: color, gridColumn: index === 0 ? "1" : "3" }}>
              <ProfileAvatar profile={profile} size={42} />
              <div style={{ minWidth: 0 }}>
                <div className="football-versus-card__camp">CAMP {index + 1}</div>
                <div className="football-versus-card__name">{profile ? playerName(profile) : "À sélectionner"}</div>
              </div>
            </div>
          </React.Fragment>;
        })}
      </div>
    </> : <>
      <div className="football-selector-shell"><TeamPagedSelector teams={teams} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={GREEN} pageSize={9} modalTitle="Choisir 2 équipes" chooseLabel="Choisir équipes" listLabel="Équipes sélectionnées" /></div>
      {teamOverlapIds.length ? <div className="football-config-warning"><strong>CONFLIT :</strong> {teamOverlapNames.join(", ")} {teamOverlapNames.length > 1 ? "sont présents" : "est présent"} dans les deux équipes.</div> : <div className="football-config-note is-large">Le score reste collectif, mais les statistiques sont enregistrées pour chaque joueur.</div>}
    </>}
  </ConfigBlock>;

  const rulesBlock = <ConfigBlock title="DURÉE ET CONDITION DE VICTOIRE" subtitle="Seulement les paramètres nécessaires à ce format." color={GOLD}>
    <div className="football-option-stack">
      {variant === "match" || variant === "golden_goal" ? <OptionRow label={variant === "match" ? "Tours par période" : "Limite avant départage"} hint={variant === "match" ? "Chaque camp joue une fois par tour" : "Sécurité si aucun but n'est marqué"}>
        <OptionSelect value={halfRounds} options={[3, 5, 6, 8, 10, 12, 15]} onChange={setHalfRounds} />
      </OptionRow> : null}
      {variant === "first_to" || variant === "classic" ? <OptionRow label="Objectif de buts" hint="Le premier camp qui atteint ce total gagne"><OptionSelect value={goalTarget} options={[1, 2, 3, 5, 7, 10]} onChange={setGoalTarget} /></OptionRow> : null}
      {variant === "penalties" ? <OptionRow label="Tirs par camp" hint="Puis mort subite si égalité"><OptionSelect value={penaltyShots} options={[3, 5, 7, 9]} onChange={setPenaltyShots} /></OptionRow> : null}
      {variant === "match" ? <>
        <OptionRow label="En cas d'égalité" hint="Issue après les deux périodes"><OptionSelect value={tieBreaker} options={[{ value: "draw", label: "Match nul" }, { value: "golden_goal", label: "Golden Goal" }, { value: "penalties", label: "Tirs au but" }]} onChange={setTieBreaker} /></OptionRow>
        {tieBreaker === "golden_goal" ? <OptionRow label="Tours de prolongation"><OptionSelect value={extraRounds} options={[1, 2, 3, 5]} onChange={setExtraRounds} /></OptionRow> : null}
        <OptionRow label="Mercy rule" hint="Fin anticipée si l'écart devient trop important"><OptionSelect value={mercyGoals} options={[{ value: 0, label: "Désactivée" }, { value: 3, label: "+3 buts" }, { value: 4, label: "+4 buts" }, { value: 5, label: "+5 buts" }]} onChange={setMercyGoals} /></OptionRow>
      </> : null}
    </div>
  </ConfigBlock>;

  const gameplayBlock = <ConfigBlock title="SENSATIONS DE JEU" subtitle="Ces réglages changent la difficulté et le rythme sur le terrain." color={GREEN}>
    <div className="football-option-stack">
      {variant !== "classic" ? <OptionRow label="Difficulté des secteurs" hint="Accessible = davantage de cibles · Expert = moins de cibles"><OptionSelect value={targetDifficulty} options={[{ value: "accessible", label: "Accessible" }, { value: "standard", label: "Standard" }, { value: "expert", label: "Expert" }]} onChange={setTargetDifficulty} /></OptionRow> : null}
      {variant !== "penalties" && variant !== "classic" ? <OptionRow label="Gardien sur tirs cadrés" hint="Les frappes S/D ouvrent une phase de parade"><OptionToggle value={goalkeeperEnabled} onChange={setGoalkeeperEnabled} /></OptionRow> : null}
      {variant === "match" || variant === "golden_goal" || variant === "first_to" ? <OptionRow label="Volée ratée = ballon perdu" hint="Rend le match plus rapide et punit l'imprécision"><OptionToggle value={missLosesPossession} onChange={setMissLosesPossession} /></OptionRow> : null}
      {variant !== "penalties" ? <OptionRow label="Coup d'envoi" hint="Choisit le camp qui démarre avec le ballon"><OptionSelect value={kickoffMode} options={[{ value: "home", label: "Camp 1" }, { value: "away", label: "Camp 2" }, { value: "random", label: "Aléatoire" }]} onChange={setKickoffMode} /></OptionRow> : null}
    </div>
  </ConfigBlock>;

  const inputBlock = <ConfigBlock title="SAISIE ET AIDES" subtitle="Choisis l'interface la plus confortable pour jouer." color={BLUE}>
    <div className="football-option-stack">
      <OptionRow label="Méthode de saisie" hint="Clavier = rapide · Cible = plus visuelle"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier compact" }, { value: "dartboard", label: "Cible tactile" }]} onChange={setScoreInputMethod} /></OptionRow>
      <OptionRow label="Coach tactique" hint="Affiche clairement les effets S / D / T et les cibles"><OptionToggle value={coachHints} onChange={setCoachHints} /></OptionRow>
      {participantMode === "players" ? <OptionRow label="Ordre aléatoire des joueurs"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow> : null}
      {hasSelectedBot || botPanel ? <OptionRow label="Niveau des BOTS" hint="Précision sur les secteurs tactiques"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow> : null}
    </div>
  </ConfigBlock>;

  const reviewBlock = <ConfigBlock title="RÉSUMÉ DU MATCH" subtitle="Tu n'as plus rien à régler. Voici ce qui va se passer." color={GREEN}>
    <div className="football-review-grid">
      <ReviewItem label="FORMAT" value={footballVariantLabel(variant)} color={GREEN} />
      <ReviewItem label="AFFICHE" value={selectionLabel} color={BLUE} />
      <ReviewItem label="DURÉE" value={durationLabel} color={GOLD} />
      <ReviewItem label="DIFFICULTÉ" value={variant === "classic" ? "Classic" : targetDifficulty} color={variant === "expert" ? RED : GREEN} />
      <ReviewItem label="GARDIEN" value={goalkeeperEnabled && variant !== "classic" && variant !== "penalties" ? "Activé" : "Non"} />
      <ReviewItem label="SAISIE" value={scoreInputMethod === "keypad" ? "Clavier" : "Cible tactile"} />
    </div>
    <div className="football-review-title">PENDANT LE MATCH</div>
    <HowToPlay />
    <div className={`football-ready-banner ${valid ? "is-ready" : "is-blocked"}`}>
      <strong>{valid ? "✓ PRÊT POUR LE COUP D'ENVOI" : `⚠ ${readyLabel}`}</strong>
      <span>{valid ? "Le terrain te dira toujours où est le ballon et quoi viser." : "Reviens à l'étape Joueurs pour terminer la composition."}</span>
    </div>
  </ConfigBlock>;

  const customPresetsBlock = <ConfigBlock title="MES PROFILS PERSONNELS" subtitle="Option avancée : mémorise jusqu'à trois ensembles de règles." color={BLUE}>
    {customPresets.length ? <div className="football-custom-preset-list">
      {customPresets.map((preset) => <div key={preset.id} className="football-custom-preset-row">
        <button type="button" className={`football-preset ${activeCustom?.id === preset.id ? "is-active" : ""}`} style={{ ["--football-choice-color" as any]: BLUE }} onClick={() => applyRuleSettings(preset.settings)}>
          <div className="football-preset__title">★ {preset.name}</div>
          <div className="football-preset__subtitle">{footballVariantLabel((preset.settings.variant || "match") as FootballVariant)} · {preset.settings.targetDifficulty || "standard"}</div>
        </button>
        <button type="button" className="football-delete-preset" aria-label={`Supprimer ${preset.name}`} onClick={() => removeCustomPreset(preset.id)}>×</button>
      </div>)}
    </div> : <div className="football-config-note is-large">Aucun profil personnel enregistré.</div>}
    <div className="football-custom-preset-create">
      <input value={customPresetName} maxLength={24} onChange={(event) => setCustomPresetName(event.target.value)} placeholder="Nom du profil" />
      <button type="button" onClick={saveCurrentPreset} disabled={!customPresetName.trim() || (customPresets.length >= FOOTBALL_CUSTOM_PRESET_LIMIT && !customPresets.some((preset) => preset.name.toLocaleLowerCase() === customPresetName.trim().toLocaleLowerCase()))}>ENREGISTRER</button>
    </div>
  </ConfigBlock>;

  const guidedBlocks = [formatBlock, styleBlock, participantsBlock, rulesBlock, gameplayBlock, inputBlock, reviewBlock];
  const currentStep = GUIDED_STEPS[Math.max(0, Math.min(step, GUIDED_STEPS.length - 1))];
  const canGoNext = step !== 2 || valid;

  return <div className="football-config-page" style={{ color: theme?.text || "#fff" }}>
    <PageHeader title="FOOTBALL" tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={back} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<RulesContent />} />} />

    <main className="football-config-main">
      <div className="football-config-switch">
        <button type="button" className={viewMode === "guided" ? "is-active" : ""} onClick={() => chooseView("guided")}>CONFIGURATION GUIDÉE</button>
        <button type="button" className={viewMode === "complete" ? "is-active is-blue" : ""} onClick={() => chooseView("complete")}>CONFIGURATION COMPLÈTE</button>
      </div>

      {viewMode === "guided" ? <>
        <section className="football-guided-hero">
          <div className="football-guided-hero__step">ÉTAPE {step + 1} / {GUIDED_STEPS.length}</div>
          <div className="football-guided-hero__title">{currentStep.title}</div>
          <div className="football-guided-hero__text">{currentStep.text}</div>
        </section>

        <div className="football-config-steps" aria-label="Étapes de configuration">
          {GUIDED_STEPS.map((item, index) => <button
            key={item.id}
            type="button"
            className={`football-config-step ${index === step ? "is-active" : ""} ${index < step ? "is-done" : ""}`}
            onClick={() => setStep(index)}
          >
            <span>{index < step ? "✓" : index + 1}</span>
            <strong>{item.label}</strong>
          </button>)}
        </div>

        {guidedBlocks[step]}
      </> : <>
        <div className="football-config-summary">
          <ReviewItem label="MODE" value={footballVariantLabel(variant)} color={GREEN} />
          <ReviewItem label="FORMAT" value={durationLabel} color={GOLD} />
          <ReviewItem label="PROFIL" value={activeCustom?.name || activeBuiltin?.title || "Personnalisé"} color={activeCustom ? BLUE : activeBuiltin ? presetColor(activeBuiltin.id) : "#fff"} />
          <ReviewItem label="SAISIE" value={scoreInputMethod === "keypad" ? "Clavier" : "Cible"} />
        </div>
        {formatBlock}
        {styleBlock}
        {participantsBlock}
        {rulesBlock}
        {gameplayBlock}
        {inputBlock}
        {customPresetsBlock}
        {reviewBlock}
      </>}

      <div className="football-config-actions">
        <div className="football-config-ready">
          <span>{selectionLabel}</span>
          <strong className={valid ? "is-ready" : "is-blocked"}>{readyLabel}</strong>
        </div>

        {viewMode === "guided" ? <>
          <button type="button" className="football-config-back" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>← RETOUR</button>
          {step < GUIDED_STEPS.length - 1 ? <button type="button" className="football-config-next" disabled={!canGoNext} onClick={() => canGoNext && setStep((value) => Math.min(GUIDED_STEPS.length - 1, value + 1))}>SUIVANT →</button> : <button type="button" className="football-config-start" disabled={!valid} onClick={start}>⚽ COUP D'ENVOI</button>}
        </> : <>
          <button type="button" className="football-config-back" onClick={() => chooseView("guided")}>MODE GUIDÉ</button>
          <button type="button" className="football-config-start" disabled={!valid} onClick={start}>⚽ COUP D'ENVOI</button>
        </>}
      </div>
    </main>
  </div>;
}
