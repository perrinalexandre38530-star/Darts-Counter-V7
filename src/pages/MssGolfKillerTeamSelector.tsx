import React from "react";
import { createPortal } from "react-dom";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import MssKillerCreateMenu from "../components/config/MssKillerCreateMenu";
import MssKillerCreateTeamDialog from "../components/config/MssKillerCreateTeamDialog";
import MssKillerCreateParticipantDialog from "../components/config/MssKillerCreateParticipantDialog";
import { loadTeamsBySport, createTeam, upsertTeam } from "../lib/petanqueTeamsStore";
import { buildX01DartsBotTeams, TeamsSection, X01_PRO_BOTS } from "./X01ConfigV3";
import { loadStoredBots, saveStoredBots } from "../lib/bots";
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import teamBlueLogo from "../ui_assets/teams/team_blue.png";
import teamGreenLogo from "../ui_assets/teams/team_green.png";

type TeamKey = "gold" | "pink" | "blue" | "green";
type Tab = "manual" | "saved" | "auto" | "bots";
const keys: TeamKey[] = ["gold", "pink", "blue", "green"];
const presets = [
  { name: "Team Gold", color: "#f7c85c", logo: teamGoldLogo },
  { name: "Team Pink", color: "#ff4fa2", logo: teamPinkLogo },
  { name: "Team Blue", color: "#4fc3ff", logo: teamBlueLogo },
  { name: "Team Green", color: "#6dff7c", logo: teamGreenLogo },
];
const pageSize = 4;

/** KILLER est la référence du parcours équipes : même barre d'actions,
 * modale centrée, cartes logo/membres et actions modifier/retirer.
 * Le pont avec GOLF conserve les teamAssignments gold/pink/blue/green du moteur. */
export default function MssGolfKillerTeamSelector({
  humanProfiles, bots, selectedIds, setSelectedIds, teamAssignments, setTeamAssignments,
  teamCount, teamSize, accent, onBotsUsed, onUpdateProfiles, onRefreshBots, onAddBots, onTeamMetaChange,
}: {
  humanProfiles: any[]; bots: any[]; selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  teamAssignments: Record<string, TeamKey>;
  setTeamAssignments: React.Dispatch<React.SetStateAction<Record<string, TeamKey>>>;
  teamCount: number; teamSize: number; accent: string;
  onBotsUsed?: () => void;
  onUpdateProfiles?: (fn: (current: any) => any) => void;
  onRefreshBots?: () => void;
  onAddBots?: (newBots: any[]) => void;
  /** Optional read-only metadata hook for other game engines. Does not affect GOLF. */
  onTeamMetaChange?: (metadata: Record<string,{name:string;logo:string|null}>) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("manual");
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [teamRevision, setTeamRevision] = React.useState(0);
  const [customMeta, setCustomMeta] = React.useState<Record<string, { name: string; logo: string | null }>>({});
  const metaListenerRef = React.useRef(onTeamMetaChange);
  metaListenerRef.current = onTeamMetaChange;
  React.useEffect(() => { metaListenerRef.current?.(customMeta); }, [customMeta]);
  const [creationOpen, setCreationOpen] = React.useState(false);
  const [creationMenuOpen, setCreationMenuOpen] = React.useState(false);
  const [participantCreateKind, setParticipantCreateKind] = React.useState<"profile" | "bot" | null>(null);
  const [returnToTeamCreate, setReturnToTeamCreate] = React.useState(false);
  const [participantCreateName, setParticipantCreateName] = React.useState("");
  const [participantCreateCountry, setParticipantCreateCountry] = React.useState("");
  const [participantCreateAvatar, setParticipantCreateAvatar] = React.useState<string | null>(null);
  const [participantCreateLevel, setParticipantCreateLevel] = React.useState<"easy" | "medium" | "strong" | "pro" | "legend">("medium");
  const [creationKind, setCreationKind] = React.useState<"players" | "bots">("players");
  const [creationName, setCreationName] = React.useState("");
  const [creationLogo, setCreationLogo] = React.useState<string | null>(null);
  const [creationMembers, setCreationMembers] = React.useState<string[]>([]);
  const [creationPage, setCreationPage] = React.useState(0);
  const [error, setError] = React.useState("");
  // MÊME TeamsSection QUE KILLER : plus de grille locale de choix par avatar.
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>([]);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string,string[]>>({});
  const [sourceMode, setSourceMode] = React.useState<"manual" | "saved" | "auto">("manual");
  const [editSlot, setEditSlot] = React.useState<number | null>(null);
  const [botTeamEditing, setBotTeamEditing] = React.useState<any | null>(null);
  const [botTeamMembersDraft, setBotTeamMembersDraft] = React.useState<string[]>([]);
  const [botMemberPage, setBotMemberPage] = React.useState(0);
  const availableKeys = keys.slice(0, teamCount);
  const availableBotProfiles = React.useMemo(() => [...bots, ...X01_PRO_BOTS].filter((p, i, arr) => arr.findIndex(q => String(q.id) === String(p.id)) === i), [bots]);
  const profiles = React.useMemo(() => [...humanProfiles, ...availableBotProfiles].filter((p, i, arr) => arr.findIndex(q => String(q.id) === String(p.id)) === i), [humanProfiles, availableBotProfiles]);
  const profileById = React.useMemo(() => new Map(profiles.map(p => [String(p.id), p])), [profiles]);
  const savedTeams = React.useMemo(() => loadTeamsBySport("darts").filter((t: any) => Array.isArray(t.playerIds) && t.playerIds.length > 0), [teamRevision]);
  const botTeams = React.useMemo(() => [
    ...buildX01DartsBotTeams(availableBotProfiles),
    ...savedTeams.filter((team: any) => Array.isArray(team.playerIds) && team.playerIds.length >= 2 &&
      team.playerIds.every((id: string) => availableBotProfiles.some(b => String(b.id) === String(id)))
    ).map((team: any) => ({
      ...team,
      members: (team.playerIds || []).map((id: string) => availableBotProfiles.find(b => String(b.id) === String(id))).filter(Boolean),
    })),
  ], [availableBotProfiles, savedTeams]);
  const editableBotMembers = React.useMemo(() => {
    if (!botTeamEditing) return [];
    return (botTeamEditing.members || []).filter((member: any) => profileById.has(String(member.id)));
  }, [botTeamEditing, profileById]);
  const groups = availableKeys.map((key, slot) => ({
    key, slot, ids: selectedIds.filter(id => teamAssignments[id] === key),
    name: customMeta[key]?.name || presets[slot].name,
    logo: customMeta[key]?.logo || presets[slot].logo,
    color: presets[slot].color,
  }));
  const filled = groups.filter(g => g.ids.length === teamSize).length;
  const used = new Set(selectedIds);
  const candidateProfiles = tab === "bots" ? availableBotProfiles : humanProfiles;
  const visibleProfiles = candidateProfiles.slice(page * pageSize, (page + 1) * pageSize);
  const pages = Math.max(1, Math.ceil(candidateProfiles.length / pageSize));
  const selectedGroupIds = editSlot != null ? groups[editSlot]?.ids || [] : [];
  const baseStyle: React.CSSProperties = { borderRadius: 12, border: `1px solid ${accent}66`, background: "rgba(255,255,255,.035)", color: "#f8f9fc", padding: 9, cursor: "pointer" };

  React.useEffect(() => { setPage(0); setError(""); setBotTeamEditing(null); setBotTeamMembersDraft([]); setBotMemberPage(0); }, [tab, editSlot]);
  React.useEffect(() => {
    // Quand le format change, ne conserver que les emplacements valides.
    setSelectedIds(prev => prev.filter(id => availableKeys.includes(teamAssignments[id])));
    setTeamAssignments(prev => Object.fromEntries(Object.entries(prev).filter(([, key]) => availableKeys.includes(key))) as Record<string, TeamKey>);
  }, [teamCount]);

  function assign(id: string, slot: number) {
    if (slot < 0 || slot >= teamCount) return;
    const key = keys[slot];
    const previous = teamAssignments[id];
    if (previous === key && selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
      setTeamAssignments(prev => { const next = {...prev}; delete next[id]; return next; });
      return;
    }
    const occupancy = selectedIds.filter(other => other !== id && teamAssignments[other] === key).length;
    if (occupancy >= teamSize) { setError(`L'équipe contient déjà ${teamSize} membres.`); return; }
    setSelectedIds(prev => [...prev.filter(x => x !== id), id]);
    setTeamAssignments(prev => ({ ...prev, [id]: key }));
    if (availableBotProfiles.some(b => String(b.id) === id)) { onBotsUsed?.(); onAddBots?.(availableBotProfiles.filter((b:any) => String(b.id) === id)); }
    setError("");
  }

  function installTeam(ids: string[], meta?: { name: string; logo?: string | null }, forcedSlot?: number) {
    const clean = [...new Set(ids.map(String))].filter(id => profileById.has(id));
    if (clean.length !== teamSize) { setError(`Choisis exactement ${teamSize} membres valides.`); return false; }
    let slot = forcedSlot ?? groups.findIndex(g => g.ids.length === 0);
    if (slot < 0) { setError(`Les ${teamCount} emplacements sont occupés. Modifie ou retire une équipe.`); return false; }
    const key = keys[slot];
    if (clean.some(id => used.has(id) && teamAssignments[id] !== key)) { setError("Un joueur ou bot est déjà affecté à une autre équipe."); return false; }
    const oldIds = groups[slot]?.ids || [];
    setSelectedIds(prev => [...prev.filter(id => !oldIds.includes(id)), ...clean.filter(id => !prev.includes(id) || oldIds.includes(id))]);
    setTeamAssignments(prev => {
      const next = { ...prev };
      oldIds.forEach(id => delete next[id]);
      clean.forEach(id => { next[id] = key; });
      return next;
    });
    if (meta) setCustomMeta(prev => ({ ...prev, [key]: { name: meta.name, logo: meta.logo || null } }));
    const selectedBots = availableBotProfiles.filter(b => clean.includes(String(b.id)));
    if (selectedBots.length) { onAddBots?.(selectedBots); onBotsUsed?.(); }
    setError("");
    return true;
  }

  function removeGroup(slot: number) {
    const group = groups[slot];
    if (!group) return;
    setSelectedIds(prev => prev.filter(id => !group.ids.includes(id)));
    setTeamAssignments(prev => { const next = { ...prev }; group.ids.forEach(id => delete next[id]); return next; });
    setCustomMeta(prev => { const next = { ...prev }; delete next[group.key]; return next; });
  }

  function openTab(nextTab: Tab, slot: number | null = null) {
    setTab(nextTab); if (nextTab !== "bots") setSourceMode(nextTab); setEditSlot(slot); setOpen(true); setError(""); setPage(0);
  }

  function editBotTeam(team: any) {
    setBotTeamEditing(team);
    const slotIds = editSlot != null ? groups[editSlot]?.ids || [] : [];
    setBotTeamMembersDraft(slotIds.filter((id: string) => (team.members || []).some((m: any) => String(m.id) === id)));
    setBotMemberPage(0);
    setError("");
  }

  function confirmBotTeam() {
    if (!botTeamEditing) return;
    if (installTeam(botTeamMembersDraft, {
      name: String(botTeamEditing.name || "Équipe bot"),
      logo: botTeamEditing.logoDataUrl || botTeamEditing.logoUrl || null,
    }, editSlot ?? undefined)) {
      setBotTeamEditing(null);
      setOpen(false);
    }
  }

  function randomize() {
    const source = [...humanProfiles].sort(() => Math.random() - 0.5).slice(0, teamCount * teamSize);
    if (source.length !== teamCount * teamSize) { setError(`Il faut ${teamCount * teamSize} profils disponibles pour ce format.`); return; }
    const ids = source.map(p => String(p.id));
    setSelectedIds(ids);
    setTeamAssignments(Object.fromEntries(ids.map((id, idx) => [id, keys[idx % teamCount]])) as Record<string, TeamKey>);
    setCustomMeta({}); setError(""); setOpen(false);
  }

  function createAndSelectTeam(e: React.FormEvent) {
    e.preventDefault();
    if (creationMembers.length !== teamSize || !creationName.trim()) { setError(`Choisis ${teamSize} membres et un nom.`); return; }
    const created = createTeam({ sport: "darts", name: creationName.trim(), logoDataUrl: creationLogo });
    upsertTeam({ ...created, playerIds: creationMembers, updatedAt: Date.now() });
    setTeamRevision(x => x + 1);
    if (installTeam(creationMembers, { name: creationName.trim(), logo: creationLogo })) {
      setCreationOpen(false); setOpen(false); setCreationName(""); setCreationMembers([]); setCreationLogo(null);
    }
  }

  function createParticipant(e: React.FormEvent) {
    e.preventDefault();
    const name = participantCreateName.trim();
    if (!name || !participantCreateKind) return;
    const id = `mss-${participantCreateKind}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    if (participantCreateKind === "profile") {
      if (!onUpdateProfiles) { setError("Création de profil indisponible : ouvre Profils."); return; }
      onUpdateProfiles(current => ({ ...current, profiles: [...(current?.profiles || []), { id, name, avatarDataUrl: participantCreateAvatar, avatarUpdatedAt: Date.now(), privateInfo: participantCreateCountry.trim() ? { country: participantCreateCountry.trim() } : undefined }] }));
    } else {
      const now = new Date().toISOString();
      if (!saveStoredBots([...loadStoredBots(), { id, name, level: participantCreateLevel, botLevel: participantCreateLevel, avatarSeed: id, avatarDataUrl: participantCreateAvatar, country: participantCreateCountry.trim() || undefined, createdAt: now, updatedAt: now, isBot: true, type: "bot", kind: "bot", cpu: true }])) {
        setError("Impossible de sauvegarder le bot CPU."); return;
      }
      onRefreshBots?.();
    }
    setParticipantCreateKind(null); setParticipantCreateName(""); setParticipantCreateAvatar(null); setParticipantCreateCountry(""); setParticipantCreateLevel("medium"); setError("");
    if (returnToTeamCreate) { setReturnToTeamCreate(false); setCreationOpen(true); }
  }

  function openCreateChoice(kind: "profile" | "bot" | "team" | "bot-team") {
    setCreationMenuOpen(false); setOpen(false); setError("");
    setParticipantCreateAvatar(null); setParticipantCreateCountry(""); setParticipantCreateName(""); setParticipantCreateLevel("medium");
    if (kind === "team" || kind === "bot-team") {
      setCreationKind(kind === "bot-team" ? "bots" : "players"); setCreationMembers([]); setCreationPage(0);
      setCreationOpen(true);
    } else setParticipantCreateKind(kind);
  }
  function setKillerPlayerTeam(playerId: string, teamId: TeamKey) {
    const index = keys.indexOf(teamId);
    if (index < 0 || index >= teamCount) return;
    const id = String(playerId);
    const occupied = selectedIds.filter(pid => pid !== id && teamAssignments[pid] === teamId).length;
    if (occupied >= teamSize) { setError(`L'équipe contient déjà ${teamSize} membres.`); return; }
    if (!selectedIds.includes(id)) setSelectedIds(prev => [...prev, id]);
    setTeamAssignments(prev => ({ ...prev, [id]: teamId }));
    setError("");
  }
  function toggleKillerManualPlayer(playerId: string) {
    const id = String(playerId);
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
      setTeamAssignments(prev => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    if (selectedIds.length >= teamCount * teamSize) { setError(`Maximum ${teamCount * teamSize} membres.`); return; }
    const slot = groups.findIndex(g => g.ids.length < teamSize);
    if (slot < 0) { setError("Toutes les équipes sont complètes."); return; }
    setSelectedIds(prev => [...prev, id]);
    setTeamAssignments(prev => ({ ...prev, [id]: keys[slot] }));
  }
  function addKillerSavedTeam(teamId: string, ids: string[]) {
    const team = savedTeams.find((t:any) => String(t.id) === String(teamId));
    const usedIds = [...new Set(ids.map(String))];
    if (usedIds.length !== teamSize) { setError(`Sélectionne ${teamSize} membres de cette équipe.`); return; }
    if (installTeam(usedIds, { name: String(team?.name || `Équipe ${selectedStoredTeamIds.length + 1}`), logo: (team as any)?.logoDataUrl || (team as any)?.logoUrl || null })) {
      const instanceId = `${String(teamId)}__slot_${Date.now()}`;
      setSelectedStoredTeamIds(prev => [...prev, instanceId]);
      setSavedTeamMemberSelections(prev => ({ ...prev, [instanceId]: usedIds }));
    }
  }
  function removeKillerSavedTeam(instanceId: string) {
    const ids = savedTeamMemberSelections[instanceId] || [];
    const slot = groups.findIndex(g => ids.some(id => g.ids.includes(id)));
    if (slot >= 0) removeGroup(slot);
    setSelectedStoredTeamIds(prev => prev.filter(id => id !== instanceId));
    setSavedTeamMemberSelections(prev => { const next = { ...prev }; delete next[instanceId]; return next; });
  }
  function toggleKillerSavedTeam(teamId: string) {
    const existing = selectedStoredTeamIds.find(x => x.split("__slot_")[0] === String(teamId));
    if (existing) removeKillerSavedTeam(existing);
    else {
      const team = savedTeams.find((t:any) => String(t.id) === String(teamId));
      if (team) addKillerSavedTeam(teamId, ((team as any).playerIds || []).map(String).slice(0, teamSize));
    }
  }
  function closeOverlays() { setOpen(false); setCreationOpen(false); setCreationMenuOpen(false); setParticipantCreateKind(null); setBotTeamEditing(null); setError(""); }
  const avatar = (p: any) => p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
  const picture = (p: any, size: number) => <span style={{ width:size,height:size,borderRadius:"50%",border:`1px solid ${accent}88`,overflow:"hidden",display:"grid",placeItems:"center",background:"#292c35",color:accent,fontSize:11,fontWeight:900,flexShrink:0 }}>{avatar(p) ? <img src={avatar(p)} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : String(p?.name || "?").slice(0,2).toUpperCase()}</span>;
  const modal = (children: React.ReactNode, close: () => void, label: string) => createPortal(
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }} style={{ position:"fixed",inset:0,zIndex:10100,background:"rgba(0,0,0,.83)",display:"grid",placeItems:"center",padding:12 }}>
      <div role="dialog" aria-modal="true" aria-label={label} style={{ width:"min(610px,100%)",maxHeight:"min(85dvh,720px)",minHeight:0,overflowY:"auto",overscrollBehavior:"contain",boxSizing:"border-box",background:"#0a0d19",border:`1px solid ${accent}88`,borderRadius:18,padding:14,display:"grid",gap:12 }}>
        {children}
      </div>
    </div>, document.body);

  return <div style={{ display:"grid",gap:12,minWidth:0,position:"relative",zIndex:2 }}>
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:9,flexWrap:"nowrap",position:"relative",zIndex:3 }}>
      <MssSelectorIconButton icon="teams" label="Composition manuelle" accent={accent} active={open && tab === "manual"} onClick={() => openTab("manual")} />
      <MssSelectorIconButton icon="saved-teams" label="Équipes enregistrées" accent={accent} active={open && tab === "saved"} onClick={() => openTab("saved")} />
      <MssSelectorIconButton icon="shuffle" label="Brassage automatique" accent={accent} active={open && tab === "auto"} onClick={() => openTab("auto")} />
      <MssSelectorIconButton icon="bot-teams" label="Équipes bots CPU" accent={accent} active={open && tab === "bots"} onClick={() => openTab("bots")} />
      <MssSelectorIconButton icon="plus" label="Créer une équipe" accent={accent} onClick={() => { setOpen(false); setCreationMenuOpen(true); setError(""); }} />
    </div>
    <div style={{ border:`1px solid ${accent}44`,borderRadius:15,padding:10,background:"rgba(255,255,255,.025)" }}>
      <div style={{ color:accent,fontSize:12,fontWeight:900,marginBottom:9,letterSpacing:.5 }}>ÉQUIPES SÉLECTIONNÉES · {filled}/{teamCount}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8 }}>
        {groups.map(g => <div key={g.key} style={{ display:"grid",justifyItems:"center",gap:6,background:"rgba(255,255,255,.035)",border:`1px solid ${g.ids.length ? accent : `${accent}3b`}`,borderRadius:13,padding:"10px 5px",minWidth:0 }}>
          <div style={{ width:64,height:64,overflow:"hidden",borderRadius:"50%",border:`2px solid ${g.color}`,boxShadow:`0 0 12px ${g.color}55`,display:"grid",placeItems:"center" }}><img src={g.logo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /></div>
          <strong style={{color:g.color,fontSize:12,textAlign:"center",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</strong>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",minHeight:57}}>
            {g.ids.map(id => { const p = profileById.get(id); return <div key={id} style={{display:"grid",justifyItems:"center",gap:3,width:48}}>{picture(p,29)}<span style={{fontSize:9,color:"#eee",maxWidth:48,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.name || id}</span></div>; })}
          </div>
          <span style={{fontSize:10,color:g.ids.length===teamSize?accent:"#aeb6c9"}}>{g.ids.length}/{teamSize} membres</span>
          <div style={{display:"flex",gap:9}}>
            <button type="button" title={`Modifier ${g.name}`} aria-label={`Modifier ${g.name}`} onClick={() => openTab("manual",g.slot)} style={{...baseStyle,color:accent,fontSize:18}}>✎</button>
            <button type="button" title={`Retirer ${g.name}`} aria-label={`Retirer ${g.name}`} onClick={() => removeGroup(g.slot)} style={{...baseStyle,color:"#ff9b98",border:"1px solid #d568686b",fontSize:19}}>×</button>
          </div>
        </div>)}
      </div>
    </div>
    {error && !open && !creationOpen && <span role="alert" style={{color:"#ff9898",fontSize:11}}>{error}</span>}
    {open && modal(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><strong style={{color:accent}}>CHOIX ÉQUIPES · {teamCount} × {teamSize}</strong><button type="button" onClick={closeOverlays} aria-label="Fermer" style={{...baseStyle,fontSize:18}}>×</button></div>
      <div style={{display:"flex",justifyContent:"center",gap:8}}>
        {([ ["manual","teams"],["saved","saved-teams"],["auto","shuffle"],["bots","bot-teams"] ] as const).map(([k,icon]) => <MssSelectorIconButton key={k} icon={icon} label={k} accent={accent} active={tab===k} onClick={()=>openTab(k,editSlot)} />)}
        <MssSelectorIconButton icon="plus" label="Créer une équipe" accent={accent} onClick={()=>{setOpen(false);setCreationMenuOpen(true);}} />
      </div>
      {tab === "bots" ? <>
        {botTeamEditing ? <div style={{display:"grid",gap:12}}>
          <button type="button" onClick={()=>{setBotTeamEditing(null);setBotTeamMembersDraft([]);setError("");}} style={{...baseStyle,justifySelf:"start",color:accent}}>← ÉQUIPES BOTS</button>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:9}}>
            {botTeamEditing.logoDataUrl && <img src={botTeamEditing.logoDataUrl} alt="" style={{width:45,height:45,borderRadius:"50%",objectFit:"cover"}} />}
            <strong style={{color:accent}}>{botTeamEditing.name}</strong>
          </div>
          <div style={{textAlign:"center",fontSize:12,color:"#c4cede"}}>Choisis {teamSize} bots en touchant leurs avatars · {botTeamMembersDraft.length}/{teamSize}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
            {editableBotMembers.slice(botMemberPage*4,botMemberPage*4+4).map((p:any)=>{
              const id=String(p.id);
              const selected=botTeamMembersDraft.includes(id);
              const usedElsewhere=selectedIds.includes(id) && (editSlot==null || teamAssignments[id]!==keys[editSlot]);
              return <button key={id} type="button" disabled={usedElsewhere} aria-pressed={selected} onClick={()=>{
                setBotTeamMembersDraft(prev=>selected?prev.filter(x=>x!==id):prev.length<teamSize?[...prev,id]:prev);
                setError("");
              }} style={{...baseStyle,opacity:usedElsewhere?.3:1,display:"grid",justifyItems:"center",gap:5,borderColor:selected?accent:`${accent}55`,background:selected?`${accent}24`:"rgba(255,255,255,.035)"}}>
                {picture(p,56)}
                <span style={{fontWeight:850,fontSize:11,textAlign:"center"}}>{p.name}</span>
                {selected && <span style={{color:accent,fontSize:11}}>✓ SÉLECTIONNÉ</span>}
              </button>;
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"70px 1fr 70px",alignItems:"center",gap:8}}>
            <button type="button" disabled={botMemberPage===0} onClick={()=>setBotMemberPage(p=>p-1)} style={baseStyle}>←</button>
            <span style={{color:accent,textAlign:"center",fontSize:12}}>PAGE {botMemberPage+1}/{Math.max(1,Math.ceil(editableBotMembers.length/4))}</span>
            <button type="button" disabled={(botMemberPage+1)*4>=editableBotMembers.length} onClick={()=>setBotMemberPage(p=>p+1)} style={baseStyle}>→</button>
          </div>
          {error && <span role="alert" style={{color:"#ff9898",fontSize:12}}>{error}</span>}
          <button type="button" disabled={botTeamMembersDraft.length!==teamSize} onClick={confirmBotTeam} style={{...baseStyle,color:accent,fontWeight:900,opacity:botTeamMembersDraft.length===teamSize?1:.45}}>CONFIRMER L'ÉQUIPE</button>
        </div> : <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
          {botTeams.slice(page*4,(page+1)*4).map((team:any) => <button key={team.id} type="button" style={{...baseStyle,display:"grid",justifyItems:"center",gap:6}} onClick={()=>editBotTeam(team)}>
            {team.logoDataUrl || team.logoUrl ? <img src={team.logoDataUrl || team.logoUrl} alt="" style={{width:55,height:55,objectFit:"contain",borderRadius:"50%"}} /> : <span style={{fontSize:28}}>🤖</span>}
            <strong style={{fontSize:11}}>{team.name}</strong>
          </button>)}
        </div>}
      </> : <TeamsSection
        profiles={humanProfiles as any}
        selectableProfiles={humanProfiles as any}
        allProfiles={humanProfiles as any}
        selectedIds={selectedIds.filter(id => humanProfiles.some(p => String(p.id) === id))}
        teamAssignments={teamAssignments as any}
        setPlayerTeam={setKillerPlayerTeam as any}
        togglePlayer={toggleKillerManualPlayer}
        sourceMode={tab === "auto" ? "auto" : tab === "saved" ? "saved" : "manual"}
        setSourceMode={(next) => { setSourceMode(next); setTab(next); setPage(0); }}
        storedTeams={savedTeams as any}
        selectedStoredTeamIds={selectedStoredTeamIds}
        toggleStoredTeam={toggleKillerSavedTeam}
        addStoredTeamSelection={addKillerSavedTeam}
        removeStoredTeamSelection={removeKillerSavedTeam}
        savedTeamMemberSelections={savedTeamMemberSelections}
        teamSizeOverride={teamSize}
        teamCountOverride={teamCount}
        primary={accent}
        primarySoft={`${accent}28`}
        compactContent
      />}
      {tab === "bots" && !botTeamEditing && <div style={{display:"grid",gridTemplateColumns:"70px 1fr 70px",alignItems:"center",gap:8}}><button type="button" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} style={baseStyle}>←</button><span style={{color:accent,textAlign:"center",fontSize:12}}>PAGE {Math.min(page+1,tab==="saved"?Math.max(1,Math.ceil(savedTeams.length/4)):tab==="bots"?Math.max(1,Math.ceil(botTeams.length/4)):pages)}/{tab==="saved"?Math.max(1,Math.ceil(savedTeams.length/4)):tab==="bots"?Math.max(1,Math.ceil(botTeams.length/4)):pages}</span><button type="button" disabled={page+1>=(tab==="saved"?Math.max(1,Math.ceil(savedTeams.length/4)):tab==="bots"?Math.max(1,Math.ceil(botTeams.length/4)):pages)} onClick={()=>setPage(p=>p+1)} style={baseStyle}>→</button></div>}
      {error&&<span role="alert" style={{color:"#ff9999",fontSize:11}}>{error}</span>}
      {!botTeamEditing && <button type="button" onClick={()=>setOpen(false)} style={{...baseStyle,color:accent}}>TERMINER</button>}
    </>,()=>setOpen(false),"Sélecteur d'équipes MSS")}
    <MssKillerCreateMenu
      open={creationMenuOpen}
      accent={accent}
      withTeams
      onClose={() => setCreationMenuOpen(false)}
      onChoose={openCreateChoice}
    />
    <MssKillerCreateParticipantDialog
      open={!!participantCreateKind}
      kind={participantCreateKind || "profile"}
      accent={accent}
      name={participantCreateName}
      country={participantCreateCountry}
      avatar={participantCreateAvatar}
      level={participantCreateLevel}
      busy={false}
      error={error}
      onClose={() => { setParticipantCreateKind(null); setReturnToTeamCreate(false); }}
      onSubmit={createParticipant}
      onName={setParticipantCreateName}
      onCountry={setParticipantCreateCountry}
      onAvatar={file => new Promise<void>((resolve, reject) => {
        if (!file.type.startsWith("image/") || file.size > 2*1024*1024) { setError("Avatar invalide (maximum 2 Mo)."); reject(new Error("Invalid avatar")); return; }
        const reader = new FileReader();
        reader.onload = () => { setParticipantCreateAvatar(typeof reader.result === "string" ? reader.result : null); resolve(); };
        reader.onerror = () => reject(new Error("Lecture avatar impossible"));
        reader.readAsDataURL(file);
      })}
      onLevel={setParticipantCreateLevel}
    />
    <MssKillerCreateTeamDialog
      open={creationOpen}
      accent={accent}
      kind={creationKind}
      name={creationName}
      logo={creationLogo}
      members={creationMembers}
      options={creationKind === "bots" ? availableBotProfiles : humanProfiles}
      page={creationPage}
      teamSize={teamSize}
      onClose={() => setCreationOpen(false)}
      onSubmit={createAndSelectTeam}
      onName={setCreationName}
      onLogo={file => {
        if (!file) return;
        if (!file.type.startsWith("image/") || file.size > 2*1024*1024) {
          setError("Choisis une image de 2 Mo maximum."); return;
        }
        const reader = new FileReader();
        reader.onload = () => setCreationLogo(typeof reader.result === "string" ? reader.result : null);
        reader.readAsDataURL(file);
      }}
      onMembers={setCreationMembers}
      onPage={setCreationPage}
      onNewParticipant={() => {
        setCreationOpen(false);
        setReturnToTeamCreate(true);
        setParticipantCreateKind(creationKind === "bots" ? "bot" : "profile");
      }}
      error={error}
    />
  </div>;
}
