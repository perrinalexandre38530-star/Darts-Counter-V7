import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import TeamSelectorV2 from "../../components/TeamSelectorV2";
import SelectionStickyBanner from "../../components/SelectionStickyBanner";
import { loadTeamsBySport, type TeamEntity } from "../../lib/petanqueTeamsStore";
import {
  buildTeamInstance,
  canAddTeamInstance,
  nextTeamInstanceId,
  pickAvailableTeamPlayers,
  resolveTeamInstances,
  teamBaseId,
} from "../../lib/teamSelectionInstances";
import { getFootFormat } from "./footFormats";
import { getFootGameTicker } from "./footTickers";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../../lib/profileUsage";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };
type SourceMode = "manual" | "saved";
type ConfigMode = "guided" | "full";
type GuidedStep = "source" | "teams" | "teamPlayers" | "players" | "params" | "summary";

type TeamSlot = {
  name: string;
  playerIds: string[];
  logoDataUrl?: string | null;
  avatarDataUrl?: string | null;
  teamId?: string | null;
};

function profileName(p: any) {
  return String(p?.name || p?.displayName || p?.label || "Joueur");
}

function isBotProfile(p: any) {
  return Boolean(p?.isBot || p?.bot || p?.type === "bot" || p?.kind === "bot" || p?.botLevel);
}

function teamLogo(team: any) {
  return team?.logoDataUrl || team?.logoUrl || team?.avatarUrl || team?.imageUrl || null;
}

function profileAvatar(profile: any) {
  return profile?.avatarDataUrl || profile?.avatarUrl || profile?.avatar || profile?.photoUrl || profile?.imageUrl || profile?.picture || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function FootConfig({ go, params, store }: Props) {
  const spec = getFootFormat(params?.format || params?.config?.format);
  const tickerSrc = getFootGameTicker(spec.id);
  const primary = "#22e6ff";
  const primarySoft = "rgba(34,230,255,.13)";
  const green = "#31f083";

  const profiles = React.useMemo(() => {
    const list = Array.isArray(store?.profiles) ? store.profiles : [];
    const humans = list.filter((p: any) => p && p.id && !isBotProfile(p));
    return sortProfilesByModeUsage(humans, "foot", store?.activeProfileId);
  }, [store?.profiles, store?.activeProfileId]);

  const savedTeams = React.useMemo<TeamEntity[]>(() => {
    try {
      const foot = loadTeamsBySport("foot").filter((t: any) => Array.isArray(t?.playerIds) && t.playerIds.length > 0);
      const football = loadTeamsBySport("football").filter((t: any) => Array.isArray(t?.playerIds) && t.playerIds.length > 0);
      const all = [...foot, ...football];
      const seen = new Set<string>();
      return all.filter((t: any) => {
        const id = String(t?.id || "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch {
      return [];
    }
  }, [store?.profiles]);

  const [sourceMode, setSourceMode] = React.useState<SourceMode>(spec.kind === "team" ? "manual" : "manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [selectedTeamPlayerIds, setSelectedTeamPlayerIds] = React.useState<Record<string, string[]>>({});
  const [minutes, setMinutes] = React.useState(spec.minutesPerPeriod);
  const [periods, setPeriods] = React.useState(spec.periods);
  const [breakMinutes, setBreakMinutes] = React.useState(5);
  const [shoots, setShoots] = React.useState(5);
  const [subsAllowed, setSubsAllowed] = React.useState<any>("illimité");
  const [matchVisibility, setMatchVisibility] = React.useState<"public" | "private">("public");
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [configMode, setConfigMode] = React.useState<ConfigMode>("guided");
  const [guidedStep, setGuidedStep] = React.useState<GuidedStep>(spec.kind === "team" ? "source" : "players");

  React.useEffect(() => {
    setMinutes(spec.minutesPerPeriod);
    setPeriods(spec.periods);
    setBreakMinutes(spec.id === "penalty" ? 0 : 5);
    setShoots(5);
    setSubsAllowed("illimité");
    setMatchVisibility("public");
    setSelectedIds([]);
    setSelectedTeamIds([]);
    setSelectedTeamPlayerIds({});
    setSourceMode("manual");
  }, [spec.id]);

  const requiredPlayers = spec.kind === "duel" ? 2 : spec.playersPerSide * 2;
  const selectedSet = React.useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedTeamSet = React.useMemo(() => new Set(selectedTeamIds.map(String)), [selectedTeamIds]);
  const selectedTeamBaseCounts = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of selectedTeamIds || []) {
      const base = teamBaseId(id);
      if (base) out[base] = (out[base] || 0) + 1;
    }
    return out;
  }, [selectedTeamIds]);
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);

  function togglePlayer(idRaw: any) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((prev) => {
      const exists = prev.map(String).includes(id);
      if (exists) return prev.filter((x) => String(x) !== id);
      if (spec.kind === "duel" && prev.length >= requiredPlayers) return prev;
      return [...prev, id];
    });
  }

  function defaultPlayersForTeam(teamId: string, selectedIdsSnapshot: string[] = selectedTeamIds, selectionsSnapshot: Record<string, string[]> = selectedTeamPlayerIds) {
    const base = teamBaseId(teamId);
    const team: any = savedTeams.find((t: any) => teamBaseId(t) === base);
    return pickAvailableTeamPlayers(team, selectedIdsSnapshot, selectionsSnapshot, spec.playersPerSide, teamId);
  }

  function toggleTeam(idRaw: any) {
    const baseId = teamBaseId(idRaw);
    if (!baseId) return;
    setSelectedTeamIds((prev) => {
      const arr = (Array.isArray(prev) ? prev : []).map(String);
      const exactId = String(idRaw || "");
      if (arr.includes(exactId)) {
        setSelectedTeamPlayerIds((cur) => {
          const next = { ...cur };
          delete next[exactId];
          return next;
        });
        return arr.filter((x) => String(x) !== exactId);
      }
      if (arr.length >= 2) return arr;

      const team: any = savedTeams.find((t: any) => teamBaseId(t) === baseId);
      if (!team || !canAddTeamInstance(team, arr, selectedTeamPlayerIds, spec.playersPerSide)) return arr;

      const instanceId = nextTeamInstanceId(team, arr);
      const playerIds = defaultPlayersForTeam(instanceId, arr, selectedTeamPlayerIds);
      if (playerIds.length < spec.playersPerSide) return arr;

      setSelectedTeamPlayerIds((cur) => ({ ...cur, [instanceId]: playerIds }));
      return [...arr, instanceId];
    });
  }

  function addSavedTeamSelection(teamIdRaw: any, playerIdsRaw: any[]) {
    const baseId = teamBaseId(teamIdRaw);
    const picked = Array.from(new Set((playerIdsRaw || []).map((id: any) => String(id || "").trim()).filter(Boolean)));
    if (!baseId || picked.length <= 0) return;
    setSelectedTeamIds((prev) => {
      const arr = (Array.isArray(prev) ? prev : []).map(String);
      if (arr.length >= 2) return arr;
      const team: any = savedTeams.find((t: any) => teamBaseId(t) === baseId);
      if (!team) return arr;
      const instanceId = nextTeamInstanceId(team, arr);
      setSelectedTeamPlayerIds((cur) => ({ ...cur, [instanceId]: picked }));
      return [...arr, instanceId];
    });
  }

  function removeSavedTeamSelection(instanceIdRaw: any) {
    const instanceId = String(instanceIdRaw || "");
    if (!instanceId) return;
    setSelectedTeamIds((prev) => (Array.isArray(prev) ? prev.filter((id) => String(id) !== instanceId) : []));
    setSelectedTeamPlayerIds((cur) => {
      const next = { ...cur };
      delete next[instanceId];
      return next;
    });
  }

  function toggleTeamPlayer(teamIdRaw: any, playerIdRaw: any) {
    const teamId = String(teamIdRaw || "");
    const playerId = String(playerIdRaw || "");
    if (!teamId || !playerId) return;
    setSelectedTeamPlayerIds((prev) => {
      const current = (prev[teamId] || []).map(String);
      const exists = current.includes(playerId);
      const nextIds = exists ? current.filter((id) => id !== playerId) : [...current, playerId];
      return { ...prev, [teamId]: nextIds };
    });
  }

  const selectedProfiles = React.useMemo(() => selectedIds.map((id) => profileById.get(String(id))).filter(Boolean), [selectedIds, profileById]);
  const manualA = selectedProfiles.slice(0, spec.playersPerSide);
  const manualB = selectedProfiles.slice(spec.playersPerSide, spec.playersPerSide * 2);
  const savedSelectedTeams = resolveTeamInstances(savedTeams as any[], selectedTeamIds, selectedTeamPlayerIds, spec.playersPerSide) as TeamEntity[];
  const savedTeamsReady = savedSelectedTeams.length === 2 && selectedTeamIds.every((id) => (selectedTeamPlayerIds[String(id)] || []).length >= spec.playersPerSide);

  const ready = spec.kind === "duel" ? selectedIds.length === 2 : sourceMode === "saved" ? savedTeamsReady : selectedIds.length >= requiredPlayers;

  const guidedSteps = React.useMemo<GuidedStep[]>(() => {
    const steps: GuidedStep[] = [];
    if (spec.kind === "team") steps.push("source");
    if (spec.kind === "team" && sourceMode === "saved") {
      steps.push("teams", "teamPlayers");
    } else {
      steps.push("players");
    }
    steps.push("params", "summary");
    return steps;
  }, [spec.kind, sourceMode]);

  React.useEffect(() => {
    if (!guidedSteps.includes(guidedStep)) setGuidedStep(guidedSteps[0] || "players");
  }, [guidedStep, guidedSteps]);

  const guidedIndex = Math.max(0, guidedSteps.indexOf(guidedStep));
  const canGoPrev = guidedIndex > 0;
  const canGoNext = guidedIndex < guidedSteps.length - 1;

  function isStepComplete(step: GuidedStep) {
    if (step === "source") return spec.kind !== "team" || sourceMode === "manual" || sourceMode === "saved";
    if (step === "teams") return selectedTeamIds.length === 2;
    if (step === "teamPlayers") return savedTeamsReady;
    if (step === "players") return spec.kind === "duel" ? selectedIds.length === 2 : selectedIds.length >= requiredPlayers;
    if (step === "params") return spec.id === "penalty" ? shoots > 0 : minutes > 0 && periods > 0;
    if (step === "summary") return ready;
    return true;
  }

  function stepLabel(step: GuidedStep) {
    if (step === "source") return "Source";
    if (step === "teams") return "Équipes";
    if (step === "teamPlayers") return "Titulaires";
    if (step === "players") return spec.kind === "duel" ? "Joueurs" : "Joueurs";
    if (step === "params") return "Paramètres";
    return "Récap";
  }

  function goStep(delta: number) {
    const maxIndex = Math.max(0, guidedSteps.length - 1);
    const nextIndex = Math.min(Math.max(guidedIndex + delta, 0), maxIndex);
    const next = guidedSteps[nextIndex];
    if (next) setGuidedStep(next);
  }

  const buildTeamSlots = (): [TeamSlot, TeamSlot] => {
    if (spec.kind === "duel") {
      const a = selectedProfiles[0];
      const b = selectedProfiles[1];
      return [
        { name: profileName(a) || "Joueur A", playerIds: a?.id ? [String(a.id)] : [], avatarDataUrl: profileAvatar(a) },
        { name: profileName(b) || "Joueur B", playerIds: b?.id ? [String(b.id)] : [], avatarDataUrl: profileAvatar(b) },
      ];
    }
    if (sourceMode === "saved" && savedSelectedTeams.length >= 2) {
      const a: any = savedSelectedTeams[0];
      const b: any = savedSelectedTeams[1];
      return [
        { name: String(a?.name || "Équipe A"), playerIds: (selectedTeamPlayerIds[String(a?.id || "")] || []).map(String), logoDataUrl: teamLogo(a), teamId: String(a?.id || "") },
        { name: String(b?.name || "Équipe B"), playerIds: (selectedTeamPlayerIds[String(b?.id || "")] || []).map(String), logoDataUrl: teamLogo(b), teamId: String(b?.id || "") },
      ];
    }
    return [
      { name: "Équipe A", playerIds: manualA.map((p: any) => String(p.id)), avatarDataUrl: profileAvatar(manualA[0]) },
      { name: "Équipe B", playerIds: manualB.map((p: any) => String(p.id)), avatarDataUrl: profileAvatar(manualB[0]) },
    ];
  };

  const start = () => {
    if (!ready) return;
    const [a, b] = buildTeamSlots();
    try { recordProfileUsageForMode("foot", [...a.playerIds, ...b.playerIds]); } catch {}
    go("foot_play", {
      config: {
        sport: "foot",
        mode: `foot_${spec.id}`,
        format: spec.id,
        formatLabel: spec.label,
        kind: spec.kind,
        sourceMode,
        teamA: a.name,
        teamB: b.name,
        teamALogo: a.logoDataUrl || a.avatarDataUrl || null,
        teamBLogo: b.logoDataUrl || b.avatarDataUrl || null,
        teamAVisual: a.logoDataUrl || a.avatarDataUrl || null,
        teamBVisual: b.logoDataUrl || b.avatarDataUrl || null,
        teamAPlayerIds: a.playerIds,
        teamBPlayerIds: b.playerIds,
        playersA: a.playerIds.map((id) => profileName(profileById.get(id)) || id),
        playersB: b.playerIds.map((id) => profileName(profileById.get(id)) || id),
        playersAVisuals: a.playerIds.map((id) => profileAvatar(profileById.get(id)) || null),
        playersBVisuals: b.playerIds.map((id) => profileAvatar(profileById.get(id)) || null),
        minutes,
        periods,
        breakMinutes,
        shoots,
        substitutionsAllowed: subsAllowed,
        matchVisibility,
        publicMatch: matchVisibility === "public",
        privateMatch: matchVisibility === "private",
      },
    });
  };

  const SourceChoice = () => (
    <section style={cardStyle()}>
      <h2 style={sectionTitle(primary)}>SOURCE DES PARTICIPANTS</h2>
      <p style={hintStyle}>
        Choisis si tu composes les équipes manuellement ou si tu pars de tes équipes enregistrées. Ensuite, on choisit les joueurs exacts du match pour rattacher les stats à chaque profil.
      </p>
      {spec.kind === "team" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill label="Manuel" active={sourceMode === "manual"} onClick={() => setSourceMode("manual")} primary={primary} primarySoft={primarySoft} />
          <Pill label="Équipes enregistrées" active={sourceMode === "saved"} onClick={() => setSourceMode("saved")} primary={primary} primarySoft={primarySoft} />
        </div>
      ) : (
        <div style={emptyStyle}>Ce format se joue en duel : sélection directe de 2 profils.</div>
      )}
    </section>
  );

  const TeamsChoice = () => (
    <section style={cardStyle()}>
      <h2 style={sectionTitle(primary)}>ÉQUIPES DU MATCH</h2>
      <p style={hintStyle}>Choisis l’équipe domicile puis l’équipe extérieur. Le choix des titulaires arrive juste après.</p>
      <TeamSelectorV2 teams={savedTeams} selectedTeamIds={selectedTeamIds} selectedTeamPlayerIds={selectedTeamPlayerIds} onAdd={addSavedTeamSelection} onRemove={removeSavedTeamSelection} profilesById={profileById} primary={primary} primarySoft={primarySoft} maxPlayers={spec.playersPerSide} maxSelections={2} />
    </section>
  );

  const TeamPlayersChoice = () => (
    <section style={cardStyle()}>
      <h2 style={sectionTitle(primary)}>JOUEURS DU MATCH</h2>
      <SavedTeamPlayersStep teams={savedSelectedTeams} selectedTeamPlayerIds={selectedTeamPlayerIds} onTogglePlayer={toggleTeamPlayer} profilesById={profileById} primary={primary} primarySoft={primarySoft} maxPlayers={spec.playersPerSide} />
    </section>
  );

  const ManualPlayersChoice = () => (
    <section style={cardStyle()}>
      <h2 style={sectionTitle(primary)}>PARTICIPANTS</h2>
      <p style={hintStyle}>
        {spec.kind === "duel"
          ? "Sélectionne exactement 2 profils pour lancer le duel."
          : `Sélectionne au moins ${spec.playersPerSide} joueurs par équipe, soit ${requiredPlayers} joueurs minimum. Tu peux en ajouter plus pour avoir un banc.`}
      </p>
      {profiles.length === 0 ? (
        <div style={emptyStyle}>Aucun profil local disponible. Crée d’abord tes joueurs dans Profils.</div>
      ) : (
        <PlayerPagedSelector usageMode="foot" showProfileStarring={false} profiles={profiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle={spec.kind === "duel" ? "Choisir les 2 joueurs" : `Choisir au moins ${requiredPlayers} joueurs`} />
      )}
      <SelectedPreview title={spec.kind === "duel" ? "Duel sélectionné" : "Répartition automatique"} leftTitle={spec.kind === "duel" ? "Camp A" : "Équipe A"} rightTitle={spec.kind === "duel" ? "Camp B" : "Équipe B"} left={manualA} right={manualB} primary={primary} />
    </section>
  );

  const ParamsChoice = () => (
    <section style={{ ...cardStyle(), overflow: "visible", position: "relative", zIndex: 8 }} className="foot-config-params-card">
      <h2 style={sectionTitle(primary)}>PARAMÈTRES DU MATCH</h2>
      {spec.id === "penalty" ? (
        <OptionGrid label="Tirs par camp" value={shoots} setValue={setShoots} options={[3, 5, 7, 10]} suffix=" tirs" />
      ) : (
        <div style={{ ...compactParamsGrid, overflow: "visible", position: "relative", zIndex: 9 }}>
          <OptionSelect
            label="Temps d’une mi-temps"
            value={minutes}
            setValue={setMinutes}
            options={[3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45]}
            suffix=" min"
          />
          <OptionSelect
            label="Nombre de mi-temps"
            value={periods}
            setValue={setPeriods}
            options={[1, 2]}
            suffix={periods > 1 ? " mi-temps" : " mi-temps"}
          />
          <OptionSelect
            label="Pause mi-temps"
            value={breakMinutes}
            setValue={setBreakMinutes}
            options={[2, 5, 7, 10, 15]}
            suffix=" min"
          />
          <OptionSelect
            label="Remplacements"
            value={subsAllowed}
            setValue={setSubsAllowed}
            options={[0, 3, 5, "illimité"]}
            suffix=""
          />
          <VisibilityChoice value={matchVisibility} setValue={setMatchVisibility} primary={primary} primarySoft={primarySoft} />
        </div>
      )}
    </section>
  );

  const SummaryChoice = () => {
    const [a, b] = buildTeamSlots();
    return (
      <section style={cardStyle(primarySoft)}>
        <h2 style={sectionTitle(primary)}>RÉCAPITULATIF</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={summaryLineStyle}><b>Format</b><span>{spec.label}</span></div>
          <div style={summaryLineStyle}><b>Participants</b><span>{a.name} vs {b.name}</span></div>
          <div style={summaryLineStyle}><b>Joueurs</b><span>{a.playerIds.length} / {b.playerIds.length}</span></div>
          {spec.id === "penalty" ? <div style={summaryLineStyle}><b>Tirs</b><span>{shoots} par camp</span></div> : <div style={summaryLineStyle}><b>Temps</b><span>{periods} × {minutes} min · pause {breakMinutes} min</span></div>}
          {spec.id !== "penalty" && <div style={summaryLineStyle}><b>Remplacements</b><span>{String(subsAllowed)}</span></div>}
          <div style={summaryLineStyle}><b>Suivi distant</b><span>{matchVisibility === "public" ? "Public / Roommate" : "Privé"}</span></div>
        </div>
      </section>
    );
  };

  const FullParticipants = () => (
    <section style={cardStyle()}>
      <h2 style={sectionTitle(primary)}>PARTICIPANTS</h2>
      <p style={hintStyle}>
        {spec.kind === "duel"
          ? "Sélectionne exactement 2 profils pour lancer le duel."
          : `Sélectionne au moins ${spec.playersPerSide} joueurs par équipe, soit ${requiredPlayers} joueurs minimum, ou choisis 2 équipes enregistrées avec un banc possible.`}
      </p>

      {spec.kind === "team" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Pill label="Manuel" active={sourceMode === "manual"} onClick={() => setSourceMode("manual")} primary={primary} primarySoft={primarySoft} />
          <Pill label="Équipes enregistrées" active={sourceMode === "saved"} onClick={() => setSourceMode("saved")} primary={primary} primarySoft={primarySoft} />
        </div>
      )}

      {sourceMode === "saved" && spec.kind === "team" ? (
        <>
          <TeamSelectorV2 teams={savedTeams} selectedTeamIds={selectedTeamIds} selectedTeamPlayerIds={selectedTeamPlayerIds} onAdd={addSavedTeamSelection} onRemove={removeSavedTeamSelection} profilesById={profileById} primary={primary} primarySoft={primarySoft} maxPlayers={spec.playersPerSide} maxSelections={2} />
          <SavedTeamPlayersStep teams={savedSelectedTeams} selectedTeamPlayerIds={selectedTeamPlayerIds} onTogglePlayer={toggleTeamPlayer} profilesById={profileById} primary={primary} primarySoft={primarySoft} maxPlayers={spec.playersPerSide} />
        </>
      ) : (
        <>
          {profiles.length === 0 ? (
            <div style={emptyStyle}>Aucun profil local disponible. Crée d’abord tes joueurs dans Profils.</div>
          ) : (
            <PlayerPagedSelector usageMode="foot" showProfileStarring={false} profiles={profiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle={spec.kind === "duel" ? "Choisir les 2 joueurs" : `Choisir au moins ${requiredPlayers} joueurs`} />
          )}
          <SelectedPreview title={spec.kind === "duel" ? "Duel sélectionné" : "Répartition automatique"} leftTitle={spec.kind === "duel" ? "Camp A" : "Équipe A"} rightTitle={spec.kind === "duel" ? "Camp B" : "Équipe B"} left={manualA} right={manualB} primary={primary} />
        </>
      )}
    </section>
  );

  function renderGuidedStep() {
    if (guidedStep === "source") return <SourceChoice />;
    if (guidedStep === "teams") return <TeamsChoice />;
    if (guidedStep === "teamPlayers") return <TeamPlayersChoice />;
    if (guidedStep === "players") return <ManualPlayersChoice />;
    if (guidedStep === "params") return <ParamsChoice />;
    return <SummaryChoice />;
  }

  return (
    <div style={pageStyle} className="foot-config-page">
      <style>{`
        .foot-config-page,
        .foot-config-page * {
          box-sizing: border-box;
        }
        .foot-config-page {
          position: fixed !important;
          inset: 0 !important;
          width: 100dvw !important;
          max-width: 100dvw !important;
          min-width: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-x: none !important;
        }

        .foot-config-steps-carousel::-webkit-scrollbar { display: none; }
        .foot-config-params-card { overflow: visible !important; }
        .foot-config-params-card * { overflow: visible; }
        .foot-config-page button,
        .foot-config-page section,
        .foot-config-page div {
          max-width: 100%;
          min-width: 0;
        }
        @media (max-width: 520px) {
          .foot-config-guide-tabs {
            justify-content: flex-start !important;
          }
          .foot-config-guide-tabs > button {
            flex: 1 1 100%;
            width: 100%;
          }
          .foot-config-steps {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            overflow: visible !important;
          }
          .foot-config-steps > div {
            width: 100%;
            max-width: 100% !important;
            flex: initial !important;
          }
          .foot-config-nav {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
      <div style={shellStyle}>
        <header style={headerStyle}>
          <div aria-hidden style={headerTickerWrapStyle}>
            <img src={tickerSrc} alt="" style={headerTickerStyle} draggable={false} />
            <div style={headerTickerFadeStyle} />
          </div>
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <BackDot onClick={() => go("foot_menu")} />
          </div>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <InfoDot onClick={() => setRulesOpen((v) => !v)} title="Règles" size={46} color={primary} glow={`0 0 18px ${primary}`} />
          </div>
        </header>

        <div className="foot-config-guide-tabs" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
          <Pill label="Configuration guidée" active={configMode === "guided"} onClick={() => setConfigMode("guided")} primary={primary} primarySoft={primarySoft} />
          <Pill label="Configuration complète" active={configMode === "full"} onClick={() => setConfigMode("full")} primary={primary} primarySoft={primarySoft} />
        </div>

        {rulesOpen && (
          <section style={cardStyle(primarySoft)}>
            <h2 style={sectionTitle(green)}>RÈGLES DU FORMAT</h2>
            <div style={{ display: "grid", gap: 7 }}>{spec.rules.map((r) => <div key={r} style={hintLine}>• {r}</div>)}</div>
          </section>
        )}

        {configMode === "guided" ? (
          <>
            <GuideProgress steps={guidedSteps} active={guidedStep} complete={isStepComplete} label={stepLabel} primary={primary} primarySoft={primarySoft} />
            {renderGuidedStep()}
            <div className="foot-config-nav" style={guideNavStyle}>
              <button type="button" onClick={() => goStep(-1)} disabled={!canGoPrev} style={navButtonStyle(canGoPrev, "neutral")}>← Retour</button>
              {guidedStep === "summary" ? (
                <button onClick={start} disabled={!ready} style={navButtonStyle(ready, "primary")}>
                  {ready ? `DÉMARRER ${spec.label}` : missingLabel(spec, sourceMode, selectedIds.length, savedSelectedTeams.length, selectedTeamIds, selectedTeamPlayerIds)}
                </button>
              ) : (
                <button type="button" onClick={() => goStep(1)} disabled={!isStepComplete(guidedStep) || !canGoNext} style={navButtonStyle(isStepComplete(guidedStep) && canGoNext, "primary")}>Suivant →</button>
              )}
            </div>
          </>
        ) : (
          <>
            <FullParticipants />
            <ParamsChoice />
            <button onClick={start} disabled={!ready} style={{ ...startButton, opacity: ready ? 1 : .45, cursor: ready ? "pointer" : "not-allowed" }}>
              {ready ? `DÉMARRER ${spec.label}` : missingLabel(spec, sourceMode, selectedIds.length, savedSelectedTeams.length, selectedTeamIds, selectedTeamPlayerIds)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GuideProgress({ steps, active, complete, label, primary, primarySoft }: any) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    const item = itemRefs.current[String(active)];
    if (!scroller || !item) return;
    const left = item.offsetLeft - (scroller.clientWidth / 2) + (item.clientWidth / 2);
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active, steps.length]);

  return (
    <section style={{ ...cardStyle(), padding: 10, overflow: "hidden" }}>
      <div
        ref={scrollerRef}
        className="foot-config-steps-carousel"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
          width: "100%",
          minWidth: 0,
          padding: "2px 2px 8px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          boxSizing: "border-box",
        }}
      >
        {steps.map((step: GuidedStep, index: number) => {
          const isActive = step === active;
          const done = complete(step);
          return (
            <button
              key={step}
              ref={(node) => { itemRefs.current[String(step)] = node; }}
              type="button"
              disabled={!done && !isActive}
              style={{
                flex: "0 0 clamp(132px, 44%, 190px)",
                minWidth: 0,
                scrollSnapAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "9px 12px",
                border: isActive ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)",
                background: isActive ? primarySoft : "rgba(255,255,255,.045)",
                color: isActive ? "#fff" : "#aeb5d0",
                fontWeight: 1000,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: .55,
                boxSizing: "border-box",
                boxShadow: isActive ? `0 0 18px ${primary}28` : "none",
                opacity: done || isActive ? 1 : .55,
                cursor: "default",
              }}
            >
              <span style={{ width: 23, height: 23, flex: "0 0 23px", borderRadius: 999, display: "grid", placeItems: "center", background: done ? primary : "rgba(255,255,255,.08)", color: done ? "#001019" : "#fff", fontSize: 11 }}>{done ? "✓" : index + 1}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label(step)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SelectedPreview({ title, leftTitle, rightTitle, left, right, primary }: any) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: 10, minWidth: 0, maxWidth: "100%" }}>
        <RosterCard title={leftTitle} players={left} primary={primary} />
        <RosterCard title={rightTitle} players={right} primary={primary} />
      </div>
    </div>
  );
}

function RosterCard({ title, players, primary }: any) {
  return (
    <div style={{ borderRadius: 16, padding: 10, background: "rgba(5,8,16,.78)", border: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ color: primary, fontWeight: 1000, fontSize: 12, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 7 }}>
        {players.length === 0 ? <div style={{ color: "#737894", fontSize: 12, fontWeight: 800 }}>En attente</div> : players.map((p: any) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <ProfileAvatar profile={p} size={28} />
            <span style={{ fontSize: 12, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName(p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedTeamsPicker({ teams, selectedSet, selectedBaseCounts = {}, selectedTeamIds = [], selectedTeamPlayerIds = {}, onToggle, onAdd, onRemove, profilesById, primary, primarySoft, maxPlayers }: any) {
  const [teamPicker, setTeamPicker] = React.useState<any | null>(null);
  const [teamPickerPlayerIds, setTeamPickerPlayerIds] = React.useState<string[]>([]);
  const selectedInstances = React.useMemo(() => {
    return (selectedTeamIds || []).map((instanceId: any) => {
      const raw = String(instanceId || "");
      const baseId = teamBaseId(raw);
      const team = (teams || []).find((t: any) => teamBaseId(t) === baseId);
      if (!team) return null;
      const chosen = Array.isArray(selectedTeamPlayerIds?.[raw]) ? selectedTeamPlayerIds[raw].map(String) : [];
      return { instanceId: raw, baseId, team, chosen };
    }).filter(Boolean) as any[];
  }, [selectedTeamIds, selectedTeamPlayerIds, teams]);
  const usedPlayersByBase = React.useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const item of selectedInstances) {
      const base = String(item.baseId || "");
      if (!out[base]) out[base] = new Set<string>();
      for (const id of item.chosen || []) out[base].add(String(id));
    }
    return out;
  }, [selectedInstances]);

  if (!teams.length) return <div style={emptyStyle}>Aucune équipe FOOT enregistrée pour l’instant. Passe en Manuel ou crée tes équipes depuis Profils.</div>;

  const openTeamPicker = (team: any) => {
    const baseId = teamBaseId(team);
    const ids = (Array.isArray(team.playerIds) ? team.playerIds : []).map(String).filter(Boolean);
    const used = usedPlayersByBase[baseId] || new Set<string>();
    const available = ids.filter((id: string) => !used.has(id));
    if (available.length <= 0) return;
    setTeamPicker(team);
    setTeamPickerPlayerIds(available.slice(0, Math.max(1, maxPlayers || 1)));
  };
  const validateTeamPicker = () => {
    const ids = (teamPickerPlayerIds || []).map(String).filter(Boolean);
    if (!teamPicker || ids.length <= 0) return;
    if (onAdd) onAdd(teamPicker.id, ids);
    else onToggle && onToggle(teamPicker.id);
    setTeamPicker(null);
    setTeamPickerPlayerIds([]);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {selectedInstances.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>Équipes validées</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {selectedInstances.map((item: any) => {
              const logo = teamLogo(item.team);
              const names = (item.chosen || []).map((id: string) => profileName(profilesById.get(id))).filter(Boolean).join(", ");
              return (
                <div key={item.instanceId} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "6px 8px", border: `1px solid ${primary}66`, background: `${primary}12`, color: "#fff", maxWidth: 280 }}>
                  <ProfileAvatar name={item.team?.name || "Équipe"} dataUrl={logo || undefined} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.team?.name || "Équipe"}</div>
                    <div style={{ fontSize: 10, color: "#9da3c0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{names || `${item.chosen?.length || 0} joueur`}</div>
                  </div>
                  <button type="button" onClick={() => onRemove && onRemove(item.instanceId)} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#ff7aa8", borderRadius: 999, width: 26, height: 26, cursor: "pointer", fontWeight: 950 }}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", padding: "2px 4px 12px", margin: "0 -4px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
        {teams.map((team: any) => {
          const baseId = teamBaseId(team);
          const ids = (Array.isArray(team.playerIds) ? team.playerIds : []).map(String).filter(Boolean);
          const used = usedPlayersByBase[baseId] || new Set<string>();
          const remaining = ids.filter((id: string) => !used.has(id)).length;
          const canAdd = remaining > 0 && (selectedTeamIds || []).length < 2;
          const activeCount = selectedInstances.filter((it: any) => it.baseId === baseId).length;
          const logo = teamLogo(team);
          return (
            <button key={team.id} type="button" disabled={!canAdd} onClick={() => canAdd && openTeamPicker(team)} style={{ textAlign: "center", borderRadius: 20, padding: "14px 12px 12px", border: canAdd ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,.06)", background: canAdd ? "rgba(5,8,16,.90)" : "rgba(255,255,255,.025)", color: canAdd ? "#fff" : "#656a82", opacity: 1, cursor: canAdd ? "pointer" : "not-allowed", flex: "0 0 min(68vw, 230px)", minHeight: 174, scrollSnapAlign: "start" }}>
              <div style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 0 }}>
                <ProfileAvatar name={team.name || "Équipe"} dataUrl={logo || undefined} size={66} />
                <div style={{ width: "100%", minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name || "Équipe"}</div>
                  <div style={{ color: "#9da3c0", fontSize: 11, marginTop: 2 }}>{remaining} joueur{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}</div>
                  {activeCount > 0 ? <div style={{ color: primary, fontSize: 10, fontWeight: 1000, marginTop: 4 }}>Déjà validée ×{activeCount}</div> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {teamPicker ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setTeamPicker(null)}>
          <div style={{ width: "min(560px, 96vw)", maxHeight: "82vh", overflow: "auto", borderRadius: 24, background: "rgba(8,10,20,0.98)", border: `1px solid ${primary}66`, boxShadow: `0 0 40px ${primary}33`, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <ProfileAvatar name={teamPicker?.name || "Équipe"} dataUrl={teamLogo(teamPicker) || undefined} size={46} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, fontSize: 13 }}>Choisir les joueurs</div>
                <div style={{ color: "#fff", fontWeight: 950, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamPicker?.name || "Équipe"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 8 }}>
              {(Array.isArray(teamPicker?.playerIds) ? teamPicker.playerIds : []).map((pid: any) => String(pid || "")).filter((pid: string) => !(usedPlayersByBase[teamBaseId(teamPicker)] || new Set<string>()).has(pid)).map((pid: string) => {
                const p = profilesById.get(pid);
                if (!p) return null;
                const checked = teamPickerPlayerIds.includes(pid);
                return <button key={pid} type="button" onClick={() => setTeamPickerPlayerIds((prev) => checked ? prev.filter((id) => id !== pid) : [...prev, pid])} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 16, padding: 8, border: checked ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: checked ? `${primary}18` : "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontWeight: 850, minWidth: 0 }}><ProfileAvatar profile={p} size={34} /><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName(p)}</span></button>;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" onClick={() => setTeamPicker(null)} style={{ borderRadius: 999, padding: "9px 14px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Annuler</button>
              <button type="button" disabled={teamPickerPlayerIds.length <= 0} onClick={validateTeamPicker} style={{ borderRadius: 999, padding: "9px 16px", border: `1px solid ${primary}`, background: teamPickerPlayerIds.length > 0 ? `${primary}22` : "rgba(255,255,255,.04)", color: teamPickerPlayerIds.length > 0 ? primary : "#777", fontWeight: 950, cursor: teamPickerPlayerIds.length > 0 ? "pointer" : "not-allowed" }}>Valider</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SavedTeamPlayersStep({ teams, selectedTeamPlayerIds, onTogglePlayer, profilesById, primary, primarySoft, maxPlayers }: any) {
  if (!teams.length) return null;
  return (
    <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8 }}>Joueurs du match</div>
        <div style={{ marginTop: 4, color: "#cfd4ea", fontSize: 12, fontWeight: 800, lineHeight: 1.35 }}>
          Choisis les {maxPlayers} titulaires utilisés dans chaque équipe. Ces profils seront envoyés au match pour rattacher les stats joueur par joueur.
        </div>
      </div>
      {teams.map((team: any, index: number) => {
        const teamId = String(team?.id || "");
        const ids = (Array.isArray(team?.playerIds) ? team.playerIds : []).map(String).filter(Boolean);
        const selected = new Set((selectedTeamPlayerIds[teamId] || []).map(String));
        const count = selected.size;
        return (
          <div key={teamId || index} style={{ borderRadius: 18, padding: 12, background: "rgba(5,8,16,.78)", border: `1px solid ${count === maxPlayers ? primary : "rgba(255,255,255,.10)"}`, boxShadow: count === maxPlayers ? `0 0 18px ${primary}22` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ color: primary, fontWeight: 1000, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{index === 0 ? "Équipe A" : "Équipe B"} · {team?.name || "Équipe"}</div>
              <div style={{ color: count === maxPlayers ? "#31f083" : "#ffce63", fontWeight: 1000, fontSize: 12 }}>{count}/{maxPlayers}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ids.length === 0 ? <div style={{ color: "#9fa6c0", fontSize: 12, fontWeight: 800 }}>Aucun joueur dans cette équipe.</div> : ids.map((id: string) => {
                const profile: any = profilesById.get(id);
                const active = selected.has(id);
                return (
                  <button key={id} type="button" onClick={() => onTogglePlayer(teamId, id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, maxWidth: "100%", borderRadius: 999, padding: "7px 10px 7px 7px", border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.12)", background: active ? primarySoft : "rgba(255,255,255,.055)", color: "#fff", fontWeight: 950, cursor: canAdd ? "pointer" : "not-allowed", boxShadow: active ? `0 0 14px ${primary}2f` : "none" }}>
                    <ProfileAvatar profile={profile || { name: id }} size={26} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{profileName(profile) || id}</span>
                    {active && <span style={{ color: primary, fontWeight: 1000 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function VisibilityChoice({ value, setValue, primary, primarySoft }: any) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, color: "rgba(255,255,255,.72)", fontWeight: 1000, fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase" }}>Suivi distant</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" onClick={() => setValue("public")} style={{ border: `1px solid ${value === "public" ? primary : "rgba(255,255,255,.14)"}`, borderRadius: 14, padding: "12px 8px", background: value === "public" ? primarySoft : "rgba(255,255,255,.04)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>Public</button>
        <button type="button" onClick={() => setValue("private")} style={{ border: `1px solid ${value === "private" ? primary : "rgba(255,255,255,.14)"}`, borderRadius: 14, padding: "12px 8px", background: value === "private" ? primarySoft : "rgba(255,255,255,.04)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>Privé</button>
      </div>
      <div style={{ marginTop: 6, opacity: .65, fontSize: 11, fontWeight: 800 }}>{value === "public" ? "Roommate possible : score live visible à distance." : "Match privé : accès direct bloqué, seul le score peut être partagé."}</div>
    </div>
  );
}

function OptionSelect({ label, value, setValue, options, suffix = "" }: any) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0, zIndex: open ? 999 : 1, overflow: "visible" }}>
      <div style={selectLabelStyle}>{label}</div>
      <button type="button" onClick={() => setOpen((v) => !v)} style={selectBoxStyle(open)}>
        <span>{value}{suffix}</span>
        <span style={{ fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform .16s ease" }}>⌄</span>
      </button>
      {open && (
        <div style={selectListStyle}>
          {options.map((o: number) => (
            <button key={o} type="button" onClick={() => { setValue(o); setOpen(false); }} style={selectItemStyle(value === o)}>
              {o}{suffix}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionGrid({ label, value, setValue, options, suffix = "" }: any) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))", gap: 8 }}>
        {options.map((o: number) => <button key={o} type="button" onClick={() => setValue(o)} style={{ borderRadius: 14, border: value === o ? "1px solid #22e6ff" : "1px solid rgba(255,255,255,.10)", background: value === o ? "rgba(34,230,255,.15)" : "rgba(255,255,255,.055)", color: "#fff", padding: "10px 8px", fontWeight: 1000 }}>{o}{suffix}</button>)}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick, primary, primarySoft }: any) {
  return <button type="button" onClick={onClick} style={{ maxWidth: "100%", minWidth: 0, border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: active ? primarySoft : "rgba(255,255,255,.045)", color: active ? "#fff" : "#c9cee8", borderRadius: 999, padding: "9px 12px", fontWeight: 1000, cursor: "pointer", boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxShadow: active ? `0 0 18px ${primary}2f` : "none" }}>{label}</button>;
}

const pageStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 20,
  minHeight: "100dvh",
  height: "100dvh",
  padding: "14px max(12px, env(safe-area-inset-left)) calc(92px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right))",
  width: "100dvw",
  maxWidth: "100dvw",
  minWidth: 0,
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehaviorX: "none",
  boxSizing: "border-box",
  color: "#fff",
  background: "radial-gradient(circle at 50% 0%, rgba(34,230,255,.16), transparent 34%), linear-gradient(180deg, #050915, #020409 70%)"
};
const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 680,
  minWidth: 0,
  margin: "0 auto",
  display: "grid",
  gap: 14,
  overflowX: "hidden",
  boxSizing: "border-box"
};
const headerStyle: React.CSSProperties = { position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 86, borderRadius: 24, padding: "0 58px", overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(7,11,24,.92)", border: "1px solid rgba(34,230,255,.45)", boxSizing: "border-box", boxShadow: "0 18px 42px rgba(0,0,0,.45), inset 0 0 36px rgba(34,230,255,.06)" };
const headerTickerWrapStyle: React.CSSProperties = { position: "absolute", right: 0, top: 0, height: "100%", width: "75%", pointerEvents: "none", opacity: .28, zIndex: 0, WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)" };
const headerTickerStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: "translateZ(0)", filter: "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))" };
const headerTickerFadeStyle: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.35) 100%)", opacity: .55 };
const cardStyle = (bg = "rgba(10,12,24,.96)"): React.CSSProperties => ({ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box", borderRadius: 20, padding: 14, background: bg, border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 16px 40px rgba(0,0,0,.5)" });
const sectionTitle = (color: string): React.CSSProperties => ({ margin: "0 0 10px", color, fontSize: 13, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1.1 });
const hintStyle: React.CSSProperties = { margin: "0 0 12px", color: "#9fa6c0", fontSize: 12, fontWeight: 750, lineHeight: 1.35 };
const hintLine: React.CSSProperties = { color: "#d5d9ec", fontSize: 13, fontWeight: 800, lineHeight: 1.35 };
const compactParamsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 10 };
const selectLabelStyle: React.CSSProperties = { fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 7 };
const selectBoxStyle = (open: boolean): React.CSSProperties => ({ width: "100%", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 16, border: open ? "1px solid #22e6ff" : "1px solid rgba(255,255,255,.10)", background: open ? "rgba(34,230,255,.14)" : "rgba(255,255,255,.055)", color: "#fff", padding: "0 13px", fontWeight: 1000, boxShadow: open ? "0 0 22px rgba(34,230,255,.24)" : "none" });
const selectListStyle: React.CSSProperties = { position: "absolute", zIndex: 9999, left: 0, right: 0, top: "calc(100% + 7px)", maxHeight: 210, overflowY: "auto", borderRadius: 16, padding: 6, background: "rgba(5,8,16,.98)", border: "1px solid rgba(34,230,255,.38)", boxShadow: "0 18px 34px rgba(0,0,0,.62), 0 0 22px rgba(34,230,255,.18)" };
const selectItemStyle = (active: boolean): React.CSSProperties => ({ width: "100%", border: 0, borderRadius: 12, padding: "11px 12px", marginBottom: 4, textAlign: "left", background: active ? "rgba(34,230,255,.18)" : "transparent", color: active ? "#22e6ff" : "#fff", fontWeight: 1000 });
const emptyStyle: React.CSSProperties = { color: "#9fa6c0", fontSize: 13, fontWeight: 800, borderRadius: 16, padding: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" };
const summaryLineStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0, maxWidth: "100%", borderRadius: 14, padding: "10px 12px", background: "rgba(5,8,16,.62)", border: "1px solid rgba(255,255,255,.08)", color: "#fff", fontSize: 12, fontWeight: 850, boxSizing: "border-box" };
const guideNavStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, .48fr) minmax(0, 1fr)",
  gap: 10,
  alignItems: "stretch",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box"
};
const navButtonStyle = (enabled: boolean, variant: "primary" | "neutral"): React.CSSProperties => ({ minWidth: 0, width: "100%", maxWidth: "100%", border: variant === "primary" ? 0 : "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "13px 10px", background: variant === "primary" ? "linear-gradient(135deg, #22e6ff, #127cff)" : "rgba(255,255,255,.055)", color: variant === "primary" ? "#001019" : "#fff", fontWeight: 1000, opacity: enabled ? 1 : .42, cursor: enabled ? "pointer" : "not-allowed", boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxShadow: variant === "primary" && enabled ? "0 0 24px rgba(34,230,255,.30)" : "none" });
const startButton: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, border: 0, borderRadius: 20, padding: "16px 18px", background: "linear-gradient(135deg, #22e6ff, #127cff)", color: "#001019", fontWeight: 1000, fontSize: 15, boxSizing: "border-box", boxShadow: "0 0 28px rgba(34,230,255,.35)" };
