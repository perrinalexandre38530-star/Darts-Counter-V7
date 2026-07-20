import React from "react";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStarRing from "./ProfileStarRing";
import {
  getTeamPlayerIds,
  teamBaseId,
} from "../lib/teamSelectionInstances";
import {
  generateShuffledTeams,
  loadRememberedGeneratedTeams,
  playerBalanceLevel,
  playerIdOf,
  playerNameOf,
  rememberGeneratedTeams,
  rerollGeneratedTeamLogo,
  saveGeneratedTeamsToTeamStore,
  type GeneratedTeam,
  type TeamShuffleMode,
} from "../lib/teamAutoShuffle";

type TeamSelectorV2Props = {
  title?: string;
  teams: any[];
  selectedTeamIds: string[];
  selectedTeamPlayerIds: Record<string, string[]>;
  profilesById: Map<string, any> | Record<string, any>;
  onAdd: (baseTeamId: string, playerIds: string[]) => void;
  onRemove: (instanceId: string) => void;
  maxPlayers?: number;
  maxSelections?: number;
  primary?: string;
  primarySoft?: string;
  emptyLabel?: string;
  botMode?: boolean;
  validatedTitle?: string;
  selectorTitle?: string;

  /** Active le bloc commun "brassage aléatoire / équilibré". */
  allowAutoShuffle?: boolean;
  /** Liste explicite des joueurs participants si la page de config en possède déjà une. */
  autoShufflePlayers?: any[];
  /** Sport courant, utilisé si l'utilisateur enregistre les équipes générées. */
  sport?: string;
  /** Permet à une page de config de remplacer proprement la sélection en une seule mise à jour. */
  onReplaceSelectedTeams?: (teamIds: string[], selectedTeamPlayerIds: Record<string, string[]>, teams: any[]) => void;
  /** Notification optionnelle pour les pages qui veulent intégrer les équipes temporaires dans leur état. */
  onGeneratedTeamsChange?: (teams: any[]) => void;
  /** Overlay optionnel dans le bloc flottant joueur (ex. set de fléchettes X01). */
  renderPlayerOverlay?: (player: any) => React.ReactNode;
};

function mapGet(map: any, id: string) {
  if (!map) return null;
  if (typeof map.get === "function") return map.get(id) || map.get(String(id));
  return map[id] || map[String(id)] || null;
}

function mapValues(map: any): any[] {
  if (!map) return [];
  if (typeof map.values === "function") return Array.from(map.values());
  if (typeof map === "object") return Object.values(map);
  return [];
}

function teamLogo(team: any) {
  return team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || team?.avatarUrl || team?.imageUrl || null;
}

function pickName(p: any) {
  return String(p?.name || p?.displayName || p?.nickname || p?.label || "Joueur");
}

function uniqueById(items: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of items || []) {
    const id = playerIdOf(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function generatedSelectionMap(teams: any[]) {
  const out: Record<string, string[]> = {};
  for (const team of teams || []) {
    const id = String(team?.id || "");
    if (!id) continue;
    out[id] = Array.isArray(team?.playerIds) ? team.playerIds.map(String).filter(Boolean) : [];
  }
  return out;
}

export function getUsedPlayersByBase(selectedTeamIds: string[], selectedTeamPlayerIds: Record<string, string[]>) {
  const out: Record<string, Set<string>> = {};
  for (const rawId of selectedTeamIds || []) {
    const instanceId = String(rawId || "");
    const base = teamBaseId(instanceId);
    if (!base) continue;
    if (!out[base]) out[base] = new Set<string>();
    const chosen = Array.isArray(selectedTeamPlayerIds?.[instanceId]) ? selectedTeamPlayerIds[instanceId] : [];
    chosen.map(String).filter(Boolean).forEach((pid) => out[base].add(pid));
  }
  return out;
}

export default function TeamSelectorV2({
  title,
  teams = [],
  selectedTeamIds = [],
  selectedTeamPlayerIds = {},
  profilesById,
  onAdd,
  onRemove,
  maxPlayers = 1,
  maxSelections,
  primary = "#22e6ff",
  primarySoft = "rgba(34,230,255,.13)",
  emptyLabel = "Aucune équipe disponible.",
  botMode = false,
  validatedTitle = "Équipes validées",
  selectorTitle = "Équipes enregistrées",
  allowAutoShuffle = true,
  autoShufflePlayers,
  sport = "darts",
  onReplaceSelectedTeams,
  onGeneratedTeamsChange,
  renderPlayerOverlay,
}: TeamSelectorV2Props) {
  const [pickerTeam, setPickerTeam] = React.useState<any | null>(null);
  const [pickerIds, setPickerIds] = React.useState<string[]>([]);
  const [autoOpen, setAutoOpen] = React.useState(false);
  const [participantIds, setParticipantIds] = React.useState<string[]>([]);
  const [generatedTeams, setGeneratedTeams] = React.useState<GeneratedTeam[]>(() => loadRememberedGeneratedTeams().filter((team: any) => team?.temporary === true));
  const [lastShuffleMode, setLastShuffleMode] = React.useState<TeamShuffleMode>("random");
  const [autoError, setAutoError] = React.useState("");
  const [savedHint, setSavedHint] = React.useState("");

  const candidatePlayers = React.useMemo(() => {
    const explicit = Array.isArray(autoShufflePlayers) && autoShufflePlayers.length ? autoShufflePlayers : [];
    if (explicit.length) return uniqueById(explicit);

    const fromProfiles = mapValues(profilesById).filter((p) => playerIdOf(p));
    if (fromProfiles.length) return uniqueById(fromProfiles);

    const fromTeams: any[] = [];
    for (const team of teams || []) {
      for (const id of getTeamPlayerIds(team)) {
        const profile = mapGet(profilesById, id);
        if (profile) fromTeams.push(profile);
      }
    }
    return uniqueById(fromTeams);
  }, [autoShufflePlayers, profilesById, teams]);

  React.useEffect(() => {
    setParticipantIds((prev) => prev.filter((id) => candidatePlayers.some((p) => playerIdOf(p) === id)));
  }, [candidatePlayers]);

  const allTeams = React.useMemo(() => {
    const byId = new Map<string, any>();
    for (const team of generatedTeams || []) {
      const id = teamBaseId(team);
      if (id) byId.set(id, team);
    }
    for (const team of teams || []) {
      const id = teamBaseId(team);
      if (id && !byId.has(id)) byId.set(id, team);
    }
    return Array.from(byId.values());
  }, [generatedTeams, teams]);

  const usedByBase = React.useMemo(() => getUsedPlayersByBase(selectedTeamIds, selectedTeamPlayerIds), [selectedTeamIds, selectedTeamPlayerIds]);

  const selectedItems = React.useMemo(() => {
    return (selectedTeamIds || []).map((instanceIdRaw) => {
      const instanceId = String(instanceIdRaw || "");
      const base = teamBaseId(instanceId);
      const team = (allTeams || []).find((t) => teamBaseId(t) === base);
      if (!team) return null;
      const chosen = Array.isArray(selectedTeamPlayerIds?.[instanceId]) ? selectedTeamPlayerIds[instanceId].map(String) : [];
      return { instanceId, base, team, chosen };
    }).filter(Boolean) as any[];
  }, [selectedTeamIds, selectedTeamPlayerIds, allTeams]);

  const selectedParticipantPlayers = React.useMemo(() => {
    const set = new Set(participantIds.map(String));
    return candidatePlayers.filter((player) => set.has(playerIdOf(player)));
  }, [candidatePlayers, participantIds]);

  const teamSize = Math.max(1, Math.floor(Number(maxPlayers || 1)));
  const fixedTeamCount = Number.isFinite(Number(maxSelections)) && Number(maxSelections) > 0 ? Math.floor(Number(maxSelections)) : 0;
  const generatedTeamCount = fixedTeamCount || Math.floor(selectedParticipantPlayers.length / teamSize);
  const requiredPlayers = generatedTeamCount * teamSize;
  const canAutoShuffle = allowAutoShuffle && candidatePlayers.length >= Math.max(2, teamSize * (fixedTeamCount || 2));

  function openPicker(team: any) {
    const base = teamBaseId(team);
    const allIds = getTeamPlayerIds(team);
    const used = usedByBase[base] || new Set<string>();
    const available = allIds.filter((id) => !used.has(id));
    if (!available.length) return;
    const defaultCount = Math.min(Math.max(1, Number(maxPlayers || 1)), available.length);
    setPickerTeam(team);
    setPickerIds(available.slice(0, defaultCount));
  }

  function validate() {
    if (!pickerTeam || !pickerIds.length) return;
    onAdd(teamBaseId(pickerTeam), Array.from(new Set(pickerIds.map(String).filter(Boolean))));
    setPickerTeam(null);
    setPickerIds([]);
  }

  function toggleParticipant(id: string) {
    setAutoError("");
    setSavedHint("");
    setParticipantIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function updateGeneratedTeams(next: GeneratedTeam[]) {
    setGeneratedTeams(next);
    rememberGeneratedTeams(next);
    onGeneratedTeamsChange?.(next);
  }

  function runShuffle(mode: TeamShuffleMode) {
    setSavedHint("");
    setLastShuffleMode(mode);
    const players = selectedParticipantPlayers;
    const teamsToCreate = fixedTeamCount || Math.floor(players.length / teamSize);
    const totalNeeded = teamsToCreate * teamSize;

    if (!teamsToCreate || totalNeeded < 2) {
      setAutoError("Sélectionne assez de joueurs pour créer au moins deux équipes.");
      return;
    }
    if (fixedTeamCount && players.length !== totalNeeded) {
      setAutoError(`Format incompatible : il faut exactement ${totalNeeded} joueur${totalNeeded > 1 ? "s" : ""} pour ${fixedTeamCount} équipe${fixedTeamCount > 1 ? "s" : ""} de ${teamSize}.`);
      return;
    }
    if (!fixedTeamCount && players.length % teamSize !== 0) {
      setAutoError(`Nombre de joueurs incompatible : sélectionne un multiple de ${teamSize}.`);
      return;
    }

    const next = generateShuffledTeams({
      players,
      teamSize,
      teamCount: teamsToCreate,
      mode,
      sport,
      seed: `${mode}-${Date.now()}-${players.map(playerIdOf).join("-")}`,
      accent: primary,
    });
    updateGeneratedTeams(next);
    setAutoError("");
  }

  function applyGeneratedTeams() {
    if (!generatedTeams.length) return;
    const ids = generatedTeams.map((team) => String(team.id));
    const selections = generatedSelectionMap(generatedTeams);
    rememberGeneratedTeams(generatedTeams);

    if (onReplaceSelectedTeams) {
      onReplaceSelectedTeams(ids, selections, generatedTeams);
      return;
    }

    // Fallback rétro-compatible : on retire les équipes déjà validées puis on ajoute les temporaires.
    for (const id of selectedTeamIds || []) onRemove(id);
    for (const team of generatedTeams) onAdd(team.id, Array.isArray(team.playerIds) ? team.playerIds : []);
  }

  function saveGeneratedTeams() {
    if (!generatedTeams.length) return;
    const saved = saveGeneratedTeamsToTeamStore(generatedTeams, sport);
    setSavedHint(`${saved.length} équipe${saved.length > 1 ? "s" : ""} enregistrée${saved.length > 1 ? "s" : ""}.`);
  }

  function renameGeneratedTeam(id: string, name: string) {
    const next = generatedTeams.map((team) => team.id === id ? { ...team, name, originalName: name, updatedAt: Date.now() } : team);
    updateGeneratedTeams(next);
  }

  function rerollLogo(id: string) {
    const next = generatedTeams.map((team) => team.id === id ? rerollGeneratedTeamLogo(team) : team);
    updateGeneratedTeams(next as GeneratedTeam[]);
  }

  const reachedMax = Number.isFinite(Number(maxSelections)) && Number(maxSelections) > 0 && selectedTeamIds.length >= Number(maxSelections);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {title ? <div style={{ color: primary, fontSize: 13, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9 }}>{title}</div> : null}

      <section style={{ position: "sticky", top: 0, zIndex: 70, borderRadius: 22, padding: 12, border: `1px solid ${primary}66`, background: "linear-gradient(180deg, rgba(6,9,20,.98), rgba(6,9,20,.90))", boxShadow: `0 12px 34px rgba(0,0,0,.55), 0 0 22px ${primary}22`, backdropFilter: "blur(14px)" }}>
        <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{validatedTitle}</div>
        {selectedItems.length ? (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
            {selectedItems.map((item) => {
              const names = (item.chosen || []).map((id: string) => pickName(mapGet(profilesById, id))).filter(Boolean).join(", ");
              const logo = teamLogo(item.team);
              return (
                <article key={item.instanceId} style={{ flex: "0 0 min(70vw, 250px)", minHeight: 126, borderRadius: 22, padding: 12, border: `1px solid ${primary}77`, background: `linear-gradient(180deg, ${primarySoft}, rgba(7,10,22,.94))`, color: "#fff", scrollSnapAlign: "start", position: "relative", display: "grid", justifyItems: "center", alignContent: "center", textAlign: "center" }}>
                  <button type="button" onClick={() => onRemove(item.instanceId)} style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.28)", color: "#ff7aa8", fontWeight: 950, cursor: "pointer" }}>×</button>
                  <ProfileAvatar name={item.team?.name || "Équipe"} dataUrl={logo || undefined} size={58} />
                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 15, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.team?.name || "Équipe"}</div>
                  <div style={{ marginTop: 3, color: "#b9bfd8", fontSize: 11, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{names || `${item.chosen?.length || 0} joueur`}</div>
                  {item.team?.temporary ? <div style={{ marginTop: 5, color: primary, fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>Temporaire</div> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#8f94b2", fontSize: 12 }}>Aucune équipe validée pour l’instant.</div>
        )}
      </section>

      {canAutoShuffle ? (
        <section style={{ borderRadius: 22, padding: 12, border: `1px solid ${primary}55`, background: `linear-gradient(180deg, ${primarySoft}, rgba(6,9,20,.56))`, boxShadow: `0 0 22px ${primary}16` }}>
          <button type="button" onClick={() => setAutoOpen((v) => !v)} style={{ width: "100%", border: "none", background: "transparent", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer", padding: 0, textAlign: "left" }}>
            <span>
              <span style={{ display: "block", color: primary, fontSize: 12, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .9 }}>Composition automatique</span>
              <span style={{ display: "block", color: "#aab0ca", fontSize: 11, marginTop: 3 }}>Brassage aléatoire ou équilibré avec les niveaux joueurs</span>
            </span>
            <span style={{ color: primary, fontWeight: 1000 }}>{autoOpen ? "−" : "+"}</span>
          </button>

          {autoOpen ? (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setParticipantIds(candidatePlayers.map(playerIdOf).filter(Boolean))} style={miniPill(primary, true)}>Tous les joueurs</button>
                <button type="button" onClick={() => { setParticipantIds([]); setGeneratedTeams([]); setAutoError(""); }} style={miniPill(primary, false)}>Vider</button>
                <span style={{ alignSelf: "center", color: "#aab0ca", fontSize: 11, fontWeight: 850 }}>{participantIds.length} sélectionné{participantIds.length > 1 ? "s" : ""}{fixedTeamCount ? ` / ${requiredPlayers || fixedTeamCount * teamSize} requis` : ""}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 8, maxHeight: 230, overflow: "auto", padding: 4 }}>
                {candidatePlayers.map((player) => {
                  const id = playerIdOf(player);
                  const active = participantIds.includes(id);
                  const level = playerBalanceLevel(player);
                  return (
                    <button key={id} type="button" onClick={() => toggleParticipant(id)} style={{ display: "grid", justifyItems: "center", gap: 5, borderRadius: 16, border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: active ? `${primary}18` : "rgba(255,255,255,.035)", color: "#fff", padding: 8, cursor: "pointer", minWidth: 0 }}>
                      <ProfileAvatar profile={player} name={playerNameOf(player)} size={44} />
                      <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 900 }}>{playerNameOf(player)}</span>
                      <span style={{ color: active ? primary : "#8f94b2", fontSize: 10, fontWeight: 950 }}>Niv. {level.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
                <button type="button" onClick={() => runShuffle("random")} style={autoButton(primary, lastShuffleMode === "random")}>🎲 Brassage aléatoire</button>
                <button type="button" onClick={() => runShuffle("balanced")} style={autoButton(primary, lastShuffleMode === "balanced")}>⚖️ Brassage équilibré</button>
                <button type="button" onClick={() => runShuffle(lastShuffleMode)} disabled={!generatedTeams.length} style={autoButton(primary, false, !generatedTeams.length)}>🔁 Rebrasser</button>
              </div>

              {autoError ? <div style={{ color: "#ff9db8", fontSize: 12, fontWeight: 850 }}>{autoError}</div> : null}

              {generatedTeams.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ color: primary, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8 }}>Aperçu des équipes générées</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                    {generatedTeams.map((team) => {
                      const names = (team.playerIds || []).map((id) => pickName(mapGet(profilesById, id))).join(", ");
                      return (
                        <article key={team.id} style={{ borderRadius: 18, padding: 10, border: `1px solid ${primary}55`, background: "rgba(3,6,16,.70)", display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                            <ProfileAvatar name={team.name} dataUrl={team.logoDataUrl || undefined} size={48} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <input value={team.name} onChange={(e) => renameGeneratedTeam(team.id, e.target.value)} style={{ width: "100%", borderRadius: 10, border: `1px solid ${primary}55`, background: "rgba(0,0,0,.28)", color: "#fff", padding: "7px 8px", fontWeight: 950, outline: "none" }} />
                              <div style={{ color: "#aab0ca", fontSize: 10, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{names}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#aab0ca", fontSize: 10, fontWeight: 850 }}>Force équipe : {Number(team.teamPower || 0).toFixed(1)}</span>
                            <button type="button" onClick={() => rerollLogo(team.id)} style={miniPill(primary, false)}>Logo</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                    <button type="button" onClick={applyGeneratedTeams} style={autoButton(primary, true)}>Valider ces équipes</button>
                    <button type="button" onClick={saveGeneratedTeams} style={autoButton(primary, false)}>Enregistrer ces équipes</button>
                  </div>
                  {savedHint ? <div style={{ color: primary, fontSize: 12, fontWeight: 900 }}>{savedHint}</div> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ borderRadius: 22, padding: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(6,9,20,.46)" }}>
        <div style={{ color: "#aab0ca", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{selectorTitle}</div>
        {!allTeams.length ? (
          <div style={{ color: "#8f94b2", fontSize: 12 }}>{emptyLabel}</div>
        ) : (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", overflowY: "hidden", padding: "2px 6px 14px", margin: "0 -6px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
            {allTeams.map((team, index) => {
              const base = teamBaseId(team) || String(team?.id || index);
              const all = getTeamPlayerIds(team);
              const used = usedByBase[base] || new Set<string>();
              const remaining = all.filter((id) => !used.has(id)).length;
              const disabled = remaining <= 0 || reachedMax;
              const logo = teamLogo(team);
              const level = Number(team?.botTeamLevel || parseFloat(String(team?.botLevel || "0")) || 0);
              return (
                <button key={`${base}-${index}`} type="button" disabled={disabled} onClick={() => openPicker(team)} style={{ textAlign: "center", borderRadius: 24, padding: "16px 14px 14px", border: disabled ? "1px solid rgba(255,255,255,.06)" : `1px solid ${primary}66`, background: disabled ? "rgba(255,255,255,.025)" : "rgba(8,10,20,.92)", color: disabled ? "#62687f" : "#f5f7ff", cursor: disabled ? "not-allowed" : "pointer", flex: "0 0 min(72vw, 250px)", minHeight: 190, scrollSnapAlign: "start" }}>
                  <div style={{ display: "grid", justifyItems: "center", gap: 9, minWidth: 0 }}>
                    <div style={{ position: "relative", width: 90, height: 90, display: "grid", placeItems: "center", overflow: "visible" }}>
                      {botMode && level > 0 ? <ProfileStarRing botLevel={level} anchorSize={74} starSize={9} gapPx={-5} /> : null}
                      <ProfileAvatar name={team?.name || "Équipe"} dataUrl={logo || undefined} size={72} />
                    </div>
                    <div style={{ width: "100%", minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team?.name || "Équipe"}</div>
                      <div style={{ color: disabled ? "#697089" : "#aab0ca", fontSize: 12, marginTop: 3 }}>{remaining} joueur{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}</div>
                      {team?.temporary ? <span style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", borderRadius: 999, border: `1px solid ${primary}77`, color: primary, fontSize: 10, fontWeight: 950 }}>TEMP</span> : null}
                      {botMode ? <span style={{ display: "inline-block", marginTop: 8, marginLeft: team?.temporary ? 5 : 0, padding: "2px 8px", borderRadius: 999, border: `1px solid ${primary}77`, color: primary, fontSize: 10, fontWeight: 950 }}>IA</span> : null}
                      {reachedMax ? <div style={{ marginTop: 6, color: "#8f94b2", fontSize: 10 }}>Maximum atteint</div> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {pickerTeam ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setPickerTeam(null)}>
          <div style={{ width: "min(580px, 96vw)", maxHeight: "82vh", overflow: "auto", borderRadius: 26, background: "rgba(8,10,20,.98)", border: `1px solid ${primary}66`, boxShadow: `0 0 42px ${primary}33`, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <ProfileAvatar name={pickerTeam?.name || "Équipe"} dataUrl={teamLogo(pickerTeam) || undefined} size={50} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, fontSize: 13 }}>Choisir les joueurs</div>
                <div style={{ color: "#fff", fontWeight: 950, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pickerTeam?.name || "Équipe"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))", gap: 9 }}>
              {getTeamPlayerIds(pickerTeam).filter((pid) => !(usedByBase[teamBaseId(pickerTeam)] || new Set<string>()).has(pid)).map((pid) => {
                const p = mapGet(profilesById, pid);
                const checked = pickerIds.includes(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPickerIds((prev) => {
                      if (checked) return prev.filter((id) => id !== pid);
                      if (prev.length >= teamSize) return prev;
                      return [...prev, pid];
                    })}
                    style={renderPlayerOverlay
                      ? { minWidth: 0, borderRadius: 18, padding: "10px 6px", background: checked ? `${primary}22` : "rgba(255,255,255,.035)", border: checked ? `1px solid ${primary}` : `1px solid ${primary}33`, boxShadow: checked ? `0 0 22px ${primary}66` : "inset 0 0 16px rgba(255,255,255,.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, color: "#fff" }
                      : { display: "flex", alignItems: "center", gap: 9, borderRadius: 17, padding: 9, border: checked ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: checked ? `${primary}18` : "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontWeight: 850, minWidth: 0 }}
                  >
                    {renderPlayerOverlay ? (
                      <>
                        <span style={{ position: "relative", width: 98, height: 98, display: "grid", placeItems: "center", overflow: "visible", marginTop: 4 }}>
                          <span style={{ width: 82, height: 82, borderRadius: "50%", overflow: "hidden", border: `2px solid ${checked ? primary : `${primary}88`}`, boxShadow: `0 0 16px ${primary}55`, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center" }}>
                            <ProfileAvatar profile={p} name={pickName(p)} size={76} noFrame />
                          </span>
                          {checked ? renderPlayerOverlay(p) : null}
                        </span>
                        <span style={{ color: checked ? "#fff" : "#cbd1e8", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pickName(p)}</span>
                      </>
                    ) : (
                      <>
                        <ProfileAvatar profile={p} name={pickName(p)} size={36} />
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pickName(p)}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setPickerTeam(null)} style={{ borderRadius: 999, padding: "10px 15px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Annuler</button>
              <button type="button" disabled={pickerIds.length !== teamSize} onClick={validate} style={{ borderRadius: 999, padding: "10px 18px", border: `1px solid ${primary}`, background: pickerIds.length === teamSize ? `${primary}22` : "rgba(255,255,255,.04)", color: pickerIds.length === teamSize ? primary : "#777", fontWeight: 950, cursor: pickerIds.length === teamSize ? "pointer" : "not-allowed" }}>Valider ({pickerIds.length}/{teamSize})</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function miniPill(accent: string, active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${accent}77`,
    background: active ? `${accent}1f` : "rgba(255,255,255,.04)",
    color: accent,
    padding: "7px 10px",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: .6,
    cursor: "pointer",
  };
}

function autoButton(accent: string, active: boolean, disabled = false): React.CSSProperties {
  return {
    borderRadius: 999,
    border: disabled ? "1px solid rgba(255,255,255,.08)" : `1px solid ${accent}88`,
    background: disabled ? "rgba(255,255,255,.035)" : active ? `${accent}22` : "rgba(255,255,255,.055)",
    color: disabled ? "#777" : active ? "#fff" : accent,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: active && !disabled ? `0 0 18px ${accent}33` : "none",
  };
}
