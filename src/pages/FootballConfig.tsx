// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — configuration compacte, guidée et complète
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
} from "../lib/gameEngines/footballEngine";
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

function RulesContent() {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: GREEN }}>PRINCIPE</strong><br />Chaque camp reçoit une mission claire selon la possession : attaquer, défendre, tirer ou arrêter.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />Touche l’un des trois secteurs affichés. Simple avance d’une zone, Double de deux, Triple de trois.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />Simple repousse le ballon, Double intercepte, Triple déclenche une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR ET GARDIEN</strong><br />Dans la surface, Triple ou DBULL marque directement. Les autres tirs cadrés peuvent être arrêtés.</div>
    <div><strong style={{ color: GREEN }}>CLASSIC</strong><br />BULL pour prendre la possession, puis n’importe quel DOUBLE pour marquer.</div>
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
  const steps = ["Mode", "Participants", "Règles"];
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

  function applyPreset(id: "quick" | "standard" | "tactical") {
    setVariant("match");
    if (id === "quick") {
      setHalfRounds(3);
      setTieBreaker("penalties");
      setGoalkeeperEnabled(false);
      setMissLosesPossession(true);
      return;
    }
    if (id === "tactical") {
      setHalfRounds(8);
      setTieBreaker("golden_goal");
      setExtraRounds(3);
      setGoalkeeperEnabled(true);
      setMissLosesPossession(true);
      return;
    }
    setHalfRounds(5);
    setTieBreaker("penalties");
    setGoalkeeperEnabled(true);
    setMissLosesPossession(true);
  }

  const selectedTeams = selectedTeamIds.map((id) => teams.find((team: any) => String(team.id) === id)).filter(Boolean);
  const effectivePlayerIds = participantMode === "teams"
    ? unique(selectedTeams.flatMap((team: any) => team.playerIds || []))
    : selectedIds;
  const selectedPlayers = effectivePlayerIds.map((id) => byId.get(id) || allProfiles.find((profile: any) => String(profile.id) === id) || { id, name: "Joueur" });
  const valid = participantMode === "players" ? selectedIds.length === 2 : selectedTeams.length === 2 && selectedPlayers.length >= 2;
  const hasSelectedBot = selectedPlayers.some(isBotLike);
  const pace = variant !== "match" ? "custom" : halfRounds === 3 && !goalkeeperEnabled ? "quick" : halfRounds === 5 && goalkeeperEnabled && tieBreaker === "penalties" ? "standard" : halfRounds === 8 && tieBreaker === "golden_goal" ? "tactical" : "custom";
  const selectionLabel = participantMode === "players"
    ? (selectedPlayers.length ? selectedPlayers.map(playerName).join(" vs ") : "2 joueurs")
    : (selectedTeams.length ? selectedTeams.map((team: any) => team.name).join(" vs ") : "2 équipes");
  const durationLabel = variant === "penalties" ? "5 tirs + mort subite" : variant === "classic" ? "BULL puis DOUBLE" : variant === "golden_goal" ? `1er but · max ${halfRounds} tours` : `2 × ${halfRounds} tours`;

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

  const formatBlock = <ConfigBlock title="CHOISIS TON MATCH" color={GREEN}>
    <div className="football-mode-grid">
      <ModeCard active={variant === "match"} icon="🏟️" title="MATCH" badge="RECOMMANDÉ" subtitle="Deux mi-temps, terrain, possession et gardien." rules={["ATTAQUE", "DÉFENSE", "TIRS"]} color={GREEN} onClick={() => setVariant("match")} />
      <ModeCard active={variant === "golden_goal"} icon="⚡" title="GOLDEN GOAL" subtitle="Le premier but met immédiatement fin au match." rules={["RAPIDE", "TENSION"]} color={GOLD} onClick={() => setVariant("golden_goal")} />
      <ModeCard active={variant === "penalties"} icon="🥅" title="TIRS AU BUT" subtitle="Cinq tentatives par camp, puis mort subite." rules={["DUEL", "PRÉCISION"]} color={RED} onClick={() => setVariant("penalties")} />
      <ModeCard active={variant === "classic"} icon="🎯" title="CLASSIC" subtitle="BULL pour le ballon, DOUBLE pour marquer." rules={["SIMPLE", "IMMÉDIAT"]} color={BLUE} onClick={() => setVariant("classic")} />
    </div>

    {variant === "match" ? <div className="football-preset-row">
      <PresetButton active={pace === "quick"} title="⚡ RAPIDE" subtitle="2 × 3 tours · sans gardien" color={GOLD} onClick={() => applyPreset("quick")} />
      <PresetButton active={pace === "standard"} title="⚽ STANDARD" subtitle="2 × 5 tours · complet" color={GREEN} onClick={() => applyPreset("standard")} />
      <PresetButton active={pace === "tactical"} title="🧠 TACTIQUE" subtitle="2 × 8 tours · prolongation" color={BLUE} onClick={() => applyPreset("tactical")} />
    </div> : null}

    <div style={{ marginTop: 7 }}>
      <OptionRow label="Participants" hint="Duel direct ou équipes complètes">
        <OptionSelect value={participantMode} options={[{ value: "players", label: "1 contre 1" }, { value: "teams", label: "2 équipes" }]} onChange={setParticipantMode} />
      </OptionRow>
    </div>
  </ConfigBlock>;

  const participantsBlock = <ConfigBlock title={participantMode === "players" ? "COMPOSITION DU DUEL" : "COMPOSITION DES ÉQUIPES"} color={BLUE}>
    {participantMode === "players" ? <>
      <PlayerPagedSelector usageMode="football" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GREEN} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
      <div style={{ marginTop: 7 }}>
        <OptionRow label="Ajouter des BOTS IA" hint="Un BOT peut remplacer l’un des deux joueurs">
          <OptionToggle value={botPanel} onChange={setBotPanel} />
        </OptionRow>
      </div>
      {botPanel ? <div style={{ marginTop: 7 }}><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={BLUE} pageSize={8} modalTitle="Choisir un BOT" /></div> : null}

      <div className="football-versus-grid">
        {[0, 1].map((index) => {
          const id = selectedIds[index];
          const profile = byId.get(id);
          const color = index === 0 ? BLUE : RED;
          return <React.Fragment key={`${id || "empty"}-${index}`}>
            {index === 1 ? <div className="football-versus-separator">VS</div> : null}
            <div className="football-versus-card" style={{ border: `1px solid ${color}55`, background: `${color}0c`, gridColumn: index === 0 ? "1" : "3" }}>
              <ProfileAvatar profile={profile} size={32} />
              <div style={{ minWidth: 0 }}>
                <div className="football-versus-card__camp" style={{ color }}>CAMP {index + 1}</div>
                <div className="football-versus-card__name">{profile ? playerName(profile) : "À sélectionner"}</div>
              </div>
            </div>
          </React.Fragment>;
        })}
      </div>

      {hasSelectedBot || botPanel ? <div style={{ marginTop: 7 }}>
        <OptionRow label="Niveau des BOTS" hint="Précision sur les secteurs tactiques">
          <OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} />
        </OptionRow>
      </div> : null}
    </> : <>
      <TeamPagedSelector teams={teams} selectedIds={selectedTeamIds} onToggle={toggleTeam} accent={GREEN} pageSize={9} modalTitle="Choisir 2 équipes" chooseLabel="Choisir équipes" listLabel="Équipes sélectionnées" />
      <div className="football-config-note">Les membres jouent à tour de rôle. Le score est collectif, mais chaque fléchette alimente les statistiques individuelles.</div>
    </>}
  </ConfigBlock>;

  const rulesBlock = <ConfigBlock title="RÈGLES DU MATCH" color={GOLD}>
    <div style={{ display: "grid", gap: 6 }}>
      {variant === "match" || variant === "golden_goal" ? <OptionRow label={variant === "match" ? "Tours par mi-temps" : "Limite avant penalties"} hint={variant === "match" ? "Chaque camp joue une fois par tour" : "Sécurité si aucun but n’est marqué"}>
        <OptionSelect value={halfRounds} options={[3, 5, 8, 10, 12]} onChange={setHalfRounds} />
      </OptionRow> : null}
      {variant === "match" ? <>
        <OptionRow label="En cas d’égalité" hint="Issue du match après les deux périodes">
          <OptionSelect value={tieBreaker} options={[{ value: "draw", label: "Match nul" }, { value: "golden_goal", label: "Golden Goal" }, { value: "penalties", label: "Tirs au but" }]} onChange={setTieBreaker} />
        </OptionRow>
        {tieBreaker === "golden_goal" ? <OptionRow label="Tours de prolongation"><OptionSelect value={extraRounds} options={[1, 2, 3, 5]} onChange={setExtraRounds} /></OptionRow> : null}
      </> : null}
      {variant !== "penalties" && variant !== "classic" ? <OptionRow label="Gardien sur tirs cadrés" hint="Les frappes S/D ouvrent une phase de parade"><OptionToggle value={goalkeeperEnabled} onChange={setGoalkeeperEnabled} /></OptionRow> : null}
      {variant === "match" || variant === "golden_goal" ? <OptionRow label="Volée sans cible = ballon perdu" hint="Accélère le rythme et récompense la précision"><OptionToggle value={missLosesPossession} onChange={setMissLosesPossession} /></OptionRow> : null}
      {participantMode === "players" ? <OptionRow label="Ordre de départ aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow> : null}
      <OptionRow label="Méthode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier compact" }, { value: "dartboard", label: "Cible tactile" }]} onChange={setScoreInputMethod} /></OptionRow>
    </div>
    <div className="football-config-note">
      <strong style={{ color: GREEN }}>ATTAQUE :</strong> S +1 · D +2 · T +3 &nbsp;—&nbsp;
      <strong style={{ color: RED }}>DÉFENSE :</strong> S repousse · D intercepte · T contre-attaque.
    </div>
  </ConfigBlock>;

  const guidedBlocks = [formatBlock, participantsBlock, rulesBlock];

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
        <div className="football-config-summary__item"><div className="football-config-summary__label">AFFICHE</div><div className="football-config-summary__value">{participantMode === "players" ? `${selectedIds.length}/2 joueurs` : `${selectedTeamIds.length}/2 équipes`}</div></div>
        <div className="football-config-summary__item"><div className="football-config-summary__label">SAISIE</div><div className="football-config-summary__value">{scoreInputMethod === "keypad" ? "Clavier" : "Cible"}</div></div>
      </div>

      {viewMode === "guided" ? <>
        <div className="football-config-steps">{steps.map((label, index) => <button key={label} type="button" className="football-config-step" onClick={() => setStep(index)} style={{ border: `1px solid ${index === step ? GREEN : "rgba(255,255,255,.08)"}`, background: index === step ? `${GREEN}18` : "rgba(255,255,255,.02)", color: index === step ? GREEN : SOFT }}>{index + 1}. {label}</button>)}</div>
        {guidedBlocks[step]}
      </> : <>{formatBlock}{participantsBlock}{rulesBlock}</>}

      <div className="football-config-actions">
        <div className="football-config-ready">
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectionLabel}</span>
          <strong style={{ color: valid ? GREEN : RED }}>{valid ? "PRÊT" : participantMode === "players" ? "2 JOUEURS REQUIS" : "2 ÉQUIPES REQUISES"}</strong>
        </div>
        <button type="button" onClick={() => viewMode === "guided" ? setStep((value) => Math.max(0, value - 1)) : chooseView("guided")} disabled={viewMode === "guided" && step === 0} style={{ border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: viewMode === "guided" && step === 0 ? "rgba(255,255,255,.25)" : "#fff" }}>{viewMode === "complete" ? "MODE GUIDÉ" : "← RETOUR"}</button>
        {viewMode === "guided" && step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} style={{ border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN }}>SUIVANT →</button> : <button type="button" disabled={!valid} onClick={start} style={{ border: `1px solid ${valid ? GREEN : "rgba(255,255,255,.10)"}`, background: valid ? "linear-gradient(180deg,#72edb5,#2aaa78)" : "rgba(255,255,255,.025)", color: valid ? "#03130d" : SOFT }}>⚽ COUP D’ENVOI</button>}
      </div>
    </main>
  </div>;
}
