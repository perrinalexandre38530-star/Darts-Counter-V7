// @ts-nocheck
import React from 'react';
import PlayerPagedSelector from '../PlayerPagedSelector';
import BotPagedSelector from '../BotPagedSelector';
import MssSelectorIconButton from '../MssSelectorIconButton';
import MssKillerCreateMenu from './MssKillerCreateMenu';
import MssKillerCreateParticipantDialog from './MssKillerCreateParticipantDialog';

/** The KILLER/X01 player-selection layout, shared by GOLF and LES 5 VIES.
 * PlayerPagedSelector owns the four-icon toolbar and the one selected-profile gallery.
 * BotPagedSelector is a centered, paginated modal rather than a second inline selector.
 */
export default function MssKillerPlayersShared({ usageMode, profiles, bots, selectedIds, onToggle, accent,
  onCreateProfile, onCreateBot, onBotSelected, maxSelection=8 }: any) {
  const [botsOpen,setBotsOpen] = React.useState(false);
  const [createOpen,setCreateOpen] = React.useState(false);
  const [createKind,setCreateKind] = React.useState<'profile'|'bot'>('profile');
  const [dialogOpen,setDialogOpen] = React.useState(false);
  const [name,setName] = React.useState('');
  const [country,setCountry] = React.useState('');
  const [avatar,setAvatar] = React.useState<string|null>(null);
  const [level,setLevel] = React.useState<'easy'|'medium'|'strong'|'pro'|'legend'>('medium');
  const [error,setError] = React.useState('');
  const [busy,setBusy] = React.useState(false);
  const handleToggle=(id:string)=>{
    if(!selectedIds.includes(id) && selectedIds.length>=maxSelection)return;
    if(!selectedIds.includes(id) && bots.some((b:any)=>String(b.id)===String(id))) onBotSelected?.();
    onToggle(id);
  };
  const newParticipant=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!name.trim())return;
    setBusy(true);
    try{
      const participant={id:`mss-${createKind}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name:name.trim(),country,
        privateInfo:country.trim()?{country:country.trim()}:undefined,
        avatarDataUrl:avatar,isBot:createKind==='bot',botLevel:level};
      const add=createKind==='bot'?onCreateBot:onCreateProfile;
      if(!add)throw Error('La création de ce type de participant est indisponible.');
      await add(participant);
      onToggle(participant.id);
      setDialogOpen(false);setName('');setCountry('');setAvatar(null);setError('');
    }catch(err:any){setError(String(err?.message||err));}finally{setBusy(false);}
  };
  return <>
    <PlayerPagedSelector usageMode={usageMode} profiles={profiles} selectedIds={selectedIds}
      onToggle={handleToggle} accent={accent} pageSize={9} modalTitle="Choisir des joueurs"
      toolbarExtra={<>
        <MssSelectorIconButton icon="bots" label="Choisir des bots IA" accent={accent} active={botsOpen} onClick={()=>setBotsOpen(true)} />
        <MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={accent} onClick={()=>setCreateOpen(true)} />
      </>}
      modalHeaderExtra={<MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={accent} onClick={()=>setCreateOpen(true)} />}
      summaryExtra={selectedIds.some((id:string)=>bots.some((b:any)=>String(b.id)===String(id))) ? <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:12}}>{bots.filter((b:any)=>selectedIds.includes(String(b.id))).map((b:any)=><div key={b.id} style={{position:'relative',display:'grid',justifyItems:'center',gap:5,padding:8,border:`1px solid ${accent}44`,borderRadius:12}}><img src={b.avatarDataUrl||b.avatarUrl||b.avatar||''} alt="" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover'}}/><strong style={{fontSize:11}}>{b.name}</strong><button type="button" aria-label={`Retirer ${b.name}`} onClick={()=>handleToggle(String(b.id))} style={{position:'absolute',right:4,top:4,color:accent,background:'#070b17',border:`1px solid ${accent}`,borderRadius:'50%',cursor:'pointer'}}>×</button></div>)}</div>:null}
    />
    <BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={handleToggle} accent={accent} label="BOTS IA" pageSize={4} showCheckbox={false} showSelectedSummary={false} hideToolbar controlledOpen={botsOpen} onControlledOpenChange={setBotsOpen} />
    <MssKillerCreateMenu open={createOpen} accent={accent} withTeams={false} onClose={()=>setCreateOpen(false)} onChoose={(kind)=>{setCreateOpen(false);setCreateKind(kind==='bot'?'bot':'profile');setDialogOpen(true);setError('');}} />
    <MssKillerCreateParticipantDialog open={dialogOpen} kind={createKind} accent={accent} name={name} country={country} avatar={avatar} level={level} busy={busy} error={error} onClose={()=>setDialogOpen(false)} onSubmit={newParticipant} onName={setName} onCountry={setCountry} onAvatar={async(file)=>{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});setAvatar(data);}} onLevel={setLevel}/>
  </>;
}
