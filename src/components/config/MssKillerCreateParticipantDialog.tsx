import React from "react";
import { createPortal } from "react-dom";
import MssIntegratedAvatarPicker from "../MssIntegratedAvatarPicker";

/** Création JOUEUR / BOT MSS : formulaire officiel de KILLER mutualisé. */
export default function MssKillerCreateParticipantDialog({
  open, kind, accent, name, country, avatar, level, busy = false, error,
  onClose, onSubmit, onName, onCountry, onAvatar, onLevel,
}: {
  open: boolean;
  kind: "profile" | "bot";
  accent: string;
  name: string;
  country: string;
  avatar: string | null;
  level: "easy" | "medium" | "strong" | "pro" | "legend";
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onName: (name: string) => void;
  onCountry: (country: string) => void;
  onAvatar: (file: File) => Promise<void> | void;
  onLevel: (level: "easy" | "medium" | "strong" | "pro" | "legend") => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  React.useEffect(() => { if (!open) setPickerOpen(false); }, [open]);
  if (!open) return null;
  return createPortal(<>
    <div role="presentation" onMouseDown={e => { if(e.target===e.currentTarget) onClose(); }}
      style={{position:"fixed",inset:0,zIndex:10130,display:"grid",placeItems:"center",padding:14,background:"rgba(0,0,0,.79)"}}>
      <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label="Créer un participant"
        style={{width:"min(460px,100%)",maxHeight:"88dvh",overflowY:"auto",borderRadius:18,padding:14,boxSizing:"border-box",background:"#0c0e19",border:`1px solid ${accent}88`,display:"grid",gap:12,boxShadow:"0 16px 60px #000"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:accent,fontWeight:900}}>
          <span>{kind==="profile"?"CRÉER UN JOUEUR":"CRÉER UN BOT CPU"}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{color:accent,background:"none",border:0,fontSize:24,cursor:"pointer"}}>×</button>
        </div>
        <div style={{border:`1px solid ${accent}44`,borderRadius:14,padding:10,background:"rgba(0,0,0,.22)"}}>
          <div style={{color:accent,fontSize:11,letterSpacing:1,marginBottom:10,textTransform:"uppercase"}}>{kind==="profile"?"Créer un profil local":"Créer un bot CPU"}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button type="button" aria-label="Choisir un avatar" title="Choisir un avatar MSS ou importer une image"
              onClick={()=>setPickerOpen(true)}
              style={{width:62,height:62,flex:"0 0 62px",borderRadius:"50%",overflow:"hidden",padding:0,border:`1px solid ${accent}77`,background:"#161827",color:"#d8def0",cursor:"pointer"}}>
              {avatar?<img src={avatar} alt="Avatar choisi" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"Avatar"}
            </button>
            <div style={{display:"grid",gap:6,flex:1,minWidth:0}}>
              <input autoFocus required maxLength={32} value={name} onChange={e=>onName(e.target.value)} aria-label="Nom du participant"
                placeholder={kind==="bot"?"Nom du bot":"Nom du profil"}
                style={{width:"100%",boxSizing:"border-box",borderRadius:11,padding:11,background:"#101119",border:"1px solid rgba(255,255,255,.12)",color:"white"}}/>
              <input maxLength={48} value={country} onChange={e=>onCountry(e.target.value)} aria-label="Pays" placeholder="Pays"
                style={{width:"100%",boxSizing:"border-box",borderRadius:11,padding:11,background:"#101119",border:"1px solid rgba(255,255,255,.12)",color:"white"}}/>
            </div>
            <button type="submit" disabled={!name.trim() || busy} aria-label="Créer et ajouter le participant" title="Créer et ajouter"
              style={{width:54,height:54,flex:"0 0 54px",borderRadius:14,border:`1px solid ${accent}`,color:"#fff",fontSize:35,fontWeight:300,background:`${accent}33`,cursor:"pointer",boxShadow:`0 0 18px ${accent}88`,opacity:!name.trim()||busy?.55:1}}>+</button>
          </div>
        </div>
        {kind==="bot"&&<label style={{display:"grid",gap:5,fontSize:12,color:"#ddd"}}>Niveau de performance
          <select value={level} onChange={e=>onLevel(e.target.value as any)} style={{padding:11,borderRadius:10,background:"#161827",color:"white",border:`1px solid ${accent}66`}}>
            <option value="easy">Débutant</option><option value="medium">Intermédiaire</option><option value="strong">Confirmé</option>
            <option value="pro">Expert</option><option value="legend">Légende</option>
          </select>
        </label>}
        {error&&<div role="alert" style={{color:"#ff9b8b",fontSize:12}}>{error}</div>}
        <div style={{color:"#aeb6cc",fontSize:11}}>Appuie sur l’avatar pour choisir parmi les avatars MSS ou importer une image.</div>
      </form>
    </div>
    <MssIntegratedAvatarPicker open={pickerOpen} onClose={()=>setPickerOpen(false)} onChooseFile={onAvatar} zIndex={10140}/>
  </>,document.body);
}
