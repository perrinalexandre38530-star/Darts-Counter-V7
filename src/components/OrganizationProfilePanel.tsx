import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  normalizeOrganizationProfile,
  organizationKindLabel,
  organizationPlanLabel,
  updateOrganizationIdentity,
  updateOrganizationProfile,
  type OrganizationKind,
  type OrganizationRecord,
} from "../organizations/organizationService";
import {
  captureUserMediaFallback,
  organizationCoverMediaKey,
  organizationLogoMediaKey,
} from "../lib/userMediaFallback";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";

type Props = {
  organization: OrganizationRecord;
  userId: string | null;
  logoUrl?: string;
  coverUrl?: string;
  onChanged?: () => void | Promise<void>;
};

const KINDS: OrganizationKind[] = ["club","association","company","venue","school","local_authority","organizer","other"];

export default function OrganizationProfilePanel({ organization, userId, logoUrl = "", coverUrl = "", onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr:string,en:string,es:string)=>pickLegacyLocalizedText(lang,fr,en,es),[lang]);
  const canManage = organization.role === "owner" || organization.role === "admin";
  const [editing,setEditing] = React.useState(false);
  const [busy,setBusy] = React.useState(false);
  const [error,setError] = React.useState("");
  const [notice,setNotice] = React.useState("");
  const [logoPreview,setLogoPreview] = React.useState("");
  const [coverPreview,setCoverPreview] = React.useState("");
  const [form,setForm] = React.useState(() => ({
    name: organization.name, kind: organization.kind, city: organization.city, countryCode: organization.countryCode, description: organization.description,
    legalName: organization.profile.legalName, acronym: organization.profile.acronym, foundedYear: organization.profile.foundedYear,
    addressLine: organization.profile.addressLine, postalCode: organization.profile.postalCode, facilities: organization.profile.facilities,
    sports: organization.profile.sports.join(", "), memberEstimate: String(organization.profile.memberEstimate || ""),
    contactName: organization.profile.contactName, contactEmail: organization.profile.contactEmail, contactPhone: organization.profile.contactPhone, website: organization.profile.website,
  }));

  React.useEffect(()=>{
    if (editing) return;
    setForm({
      name: organization.name, kind: organization.kind, city: organization.city, countryCode: organization.countryCode, description: organization.description,
      legalName: organization.profile.legalName, acronym: organization.profile.acronym, foundedYear: organization.profile.foundedYear,
      addressLine: organization.profile.addressLine, postalCode: organization.profile.postalCode, facilities: organization.profile.facilities,
      sports: organization.profile.sports.join(", "), memberEstimate: String(organization.profile.memberEstimate || ""),
      contactName: organization.profile.contactName, contactEmail: organization.profile.contactEmail, contactPhone: organization.profile.contactPhone, website: organization.profile.website,
    });
  },[organization,editing]);

  React.useEffect(()=>()=>{ if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview); if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview); },[logoPreview,coverPreview]);

  const card:React.CSSProperties={borderRadius:18,border:`1px solid ${theme.borderSoft}`,background:theme.cardBackground||theme.card,boxShadow:"0 16px 34px rgba(0,0,0,.38)"};
  const input:React.CSSProperties={width:"100%",minHeight:40,borderRadius:11,border:`1px solid ${theme.borderSoft}`,background:"rgba(0,0,0,.28)",color:theme.text,padding:"9px 10px",boxSizing:"border-box",outline:"none",fontSize:10.5};
  const button:React.CSSProperties={minHeight:36,borderRadius:11,border:`1px solid ${theme.borderSoft}`,background:"rgba(255,255,255,.035)",color:theme.text,fontWeight:900,padding:"7px 10px",cursor:"pointer"};
  const primary:React.CSSProperties={...button,borderColor:`${theme.primary}88`,background:`${theme.primary}12`,color:theme.primary};

  function pick(file:File|undefined,kind:"logo"|"cover") {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(L("Sélectionne une image.","Select an image.","Selecciona una imagen.")); return; }
    if (file.size > 15*1024*1024) { setError(L("Image trop lourde : 15 Mo maximum.","Image too large: 15 MB maximum.","Imagen demasiado grande: 15 MB máximo.")); return; }
    const url=URL.createObjectURL(file);
    if (kind==="logo") { if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview); setLogoPreview(url); }
    else { if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview); setCoverPreview(url); }
  }

  async function save() {
    if (!canManage || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const identity = await updateOrganizationIdentity(userId,organization.id,{ name:form.name, kind:form.kind, city:form.city, countryCode:form.countryCode, description:form.description });
      const prefs=loadStoragePrefs(); const mirrorR2=prefs.selectedDestination==="cloud_r2";
      let logoKey=organization.profile.logoMediaKey; let coverKey=organization.profile.coverMediaKey;
      if (logoPreview) { logoKey=organizationLogoMediaKey(organization.id); await captureUserMediaFallback(logoKey,logoPreview,{kind:"club_logo",mirrorR2,updatedAt:Date.now()}); }
      if (coverPreview) { coverKey=organizationCoverMediaKey(organization.id); await captureUserMediaFallback(coverKey,coverPreview,{kind:"club_cover",mirrorR2,updatedAt:Date.now()}); }
      const profile=normalizeOrganizationProfile({ ...organization.profile,
        legalName:form.legalName, acronym:form.acronym.toUpperCase(), foundedYear:form.foundedYear, addressLine:form.addressLine, postalCode:form.postalCode,
        facilities:form.facilities, sports:form.sports.split(",").map(v=>v.trim()).filter(Boolean), memberEstimate:Number(form.memberEstimate||0), contactName:form.contactName,
        contactEmail:form.contactEmail, contactPhone:form.contactPhone, website:form.website, logoMediaKey:logoKey, coverMediaKey:coverKey, profileCompleted:true,
      });
      const profileResult=await updateOrganizationProfile(userId,organization.id,profile);
      setNotice([identity.warning,profileResult.warning,L("Fiche organisme mise à jour.","Organization profile updated.","Ficha de organización actualizada.")].filter(Boolean).join(" "));
      setEditing(false); setLogoPreview(""); setCoverPreview(""); await onChanged?.();
    } catch(e:any) { setError(String(e?.message||L("Mise à jour impossible.","Unable to update.","No se puede actualizar."))); }
    finally { setBusy(false); }
  }

  const p=organization.profile;
  const rows:Array<[string,string]>=[
    [L("Type","Type","Tipo"),organizationKindLabel(organization.kind)], [L("Nom officiel","Legal name","Nombre oficial"),p.legalName||organization.name], [L("Sigle","Acronym","Sigla"),p.acronym||"—"],
    [L("Création","Founded","Creación"),p.foundedYear||"—"], [L("Adresse","Address","Dirección"),[p.addressLine,p.postalCode,organization.city,organization.countryCode].filter(Boolean).join(" · ")||"—"],
    [L("Lieu principal","Main venue","Lugar principal"),p.facilities||"—"], [L("Activités","Activities","Actividades"),p.sports.length?p.sports.join(", "):"—"], [L("Taille estimée","Estimated size","Tamaño estimado"),p.memberEstimate?`~ ${p.memberEstimate}`:"—"],
    [L("Contact","Contact","Contacto"),[p.contactName,p.contactEmail,p.contactPhone].filter(Boolean).join(" · ")||"—"], [L("Site","Website","Sitio"),p.website||"—"],
    [L("Stockage médias","Media storage","Almacenamiento multimedia"),getStorageDestination(loadStoragePrefs().selectedDestination).shortLabel],
  ];

  if (!editing) return <div style={{display:"grid",gap:10}}>
    <div style={{...card,overflow:"hidden"}}><div style={{minHeight:160,background:(coverUrl?`url(${coverUrl}) center/cover no-repeat`:`linear-gradient(135deg,${theme.primary}16,rgba(0,0,0,.35))`),position:"relative"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.74))"}}/><div style={{position:"absolute",left:14,right:14,bottom:12,display:"grid",gridTemplateColumns:"72px minmax(0,1fr) auto",gap:11,alignItems:"center"}}><div style={{width:72,height:72,borderRadius:18,border:`1px solid ${theme.primary}88`,background:"rgba(5,8,18,.88)",display:"grid",placeItems:"center",overflow:"hidden"}}>{logoUrl?<img src={logoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<strong style={{color:theme.primary,fontSize:20}}>{p.acronym||organization.name.slice(0,2).toUpperCase()}</strong>}</div><div><div style={{color:theme.primary,fontSize:8,fontWeight:1000}}>{organizationPlanLabel(organization.plan)}</div><div style={{color:theme.text,fontSize:18,fontWeight:1000}}>{organization.name}</div><div style={{color:theme.textSoft,fontSize:9,marginTop:3}}>{organization.description}</div></div>{canManage?<button type="button" style={primary} onClick={()=>setEditing(true)}>{L("MODIFIER","EDIT","EDITAR")}</button>:null}</div></div><div style={{padding:14,display:"grid",gap:7}}>{rows.map(([label,value])=><div key={label} style={{display:"grid",gridTemplateColumns:"105px minmax(0,1fr)",gap:9,padding:"7px 0",borderBottom:`1px solid ${theme.borderSoft}`}}><div style={{color:theme.textSoft,fontSize:8.5,fontWeight:900}}>{label}</div><div style={{color:theme.text,fontSize:9.8,fontWeight:850,lineHeight:1.35,wordBreak:"break-word"}}>{value}</div></div>)}</div></div>
    {notice?<div style={{...card,padding:9,color:theme.primary,fontSize:9}}>{notice}</div>:null}
  </div>;

  return <div style={{display:"grid",gap:10}}>
    <div style={{...card,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><div style={{color:theme.primary,fontWeight:1000,fontSize:12}}>{L("MODIFIER LA FICHE ORGANISME","EDIT ORGANIZATION PROFILE","EDITAR FICHA DE ORGANIZACIÓN")}</div><div style={{color:theme.textSoft,fontSize:8.5,marginTop:2}}>{L("Les médias restent dans le stockage choisi, jamais dans Supabase.","Media stay in selected storage, never in Supabase.","Los medios permanecen en el almacenamiento elegido, nunca en Supabase.")}</div></div><button style={button} onClick={()=>setEditing(false)}>{L("ANNULER","CANCEL","CANCELAR")}</button></div>
      <div style={{display:"grid",gap:8,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 150px",gap:8}}><input style={input} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder={L("Nom public","Public name","Nombre público")}/><select style={input} value={form.kind} onChange={e=>setForm(v=>({...v,kind:e.target.value as OrganizationKind}))}>{KINDS.map(k=><option key={k} value={k}>{organizationKindLabel(k)}</option>)}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8}}><input style={input} value={form.city} onChange={e=>setForm(v=>({...v,city:e.target.value}))} placeholder={L("Ville","City","Ciudad")}/><input style={input} maxLength={2} value={form.countryCode} onChange={e=>setForm(v=>({...v,countryCode:e.target.value.toUpperCase()}))} placeholder="FR"/></div>
        <textarea style={{...input,minHeight:70,resize:"vertical"}} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder={L("Présentation courte","Short presentation","Presentación breve")}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 100px",gap:8}}><input style={input} value={form.legalName} onChange={e=>setForm(v=>({...v,legalName:e.target.value}))} placeholder={L("Nom officiel / raison sociale","Legal / official name","Nombre oficial")}/><input style={input} value={form.acronym} onChange={e=>setForm(v=>({...v,acronym:e.target.value}))} placeholder={L("Sigle","Acronym","Sigla")}/></div>
        <div style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:8}}><input style={input} value={form.foundedYear} onChange={e=>setForm(v=>({...v,foundedYear:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="2026"/><input style={input} value={form.memberEstimate} onChange={e=>setForm(v=>({...v,memberEstimate:e.target.value.replace(/\D/g,"")}))} placeholder={L("Effectif estimé","Estimated members","Miembros estimados")}/></div>
        <input style={input} value={form.addressLine} onChange={e=>setForm(v=>({...v,addressLine:e.target.value}))} placeholder={L("Adresse","Address","Dirección")}/><input style={input} value={form.postalCode} onChange={e=>setForm(v=>({...v,postalCode:e.target.value}))} placeholder={L("Code postal","Postal code","Código postal")}/><input style={input} value={form.facilities} onChange={e=>setForm(v=>({...v,facilities:e.target.value}))} placeholder={L("Lieu principal / installations","Main venue / facilities","Lugar principal / instalaciones")}/><input style={input} value={form.sports} onChange={e=>setForm(v=>({...v,sports:e.target.value}))} placeholder={L("Activités séparées par des virgules","Activities separated by commas","Actividades separadas por comas")}/>
        <input style={input} value={form.contactName} onChange={e=>setForm(v=>({...v,contactName:e.target.value}))} placeholder={L("Contact principal","Main contact","Contacto principal")}/><input style={input} value={form.contactEmail} onChange={e=>setForm(v=>({...v,contactEmail:e.target.value}))} placeholder="email@exemple.fr"/><input style={input} value={form.contactPhone} onChange={e=>setForm(v=>({...v,contactPhone:e.target.value}))} placeholder={L("Téléphone","Phone","Teléfono")}/><input style={input} value={form.website} onChange={e=>setForm(v=>({...v,website:e.target.value}))} placeholder="https://..."/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><label style={{...button,display:"grid",placeItems:"center"}}>{L("REMPLACER LE LOGO","REPLACE LOGO","REEMPLAZAR LOGO")}<input type="file" accept="image/*" hidden onChange={e=>pick(e.target.files?.[0],"logo")}/></label><label style={{...button,display:"grid",placeItems:"center"}}>{L("REMPLACER LA PHOTO","REPLACE COVER","REEMPLAZAR FOTO")}<input type="file" accept="image/*" hidden onChange={e=>pick(e.target.files?.[0],"cover")}/></label></div>
        {(logoPreview||coverPreview)?<div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:8}}>{logoPreview?<img src={logoPreview} alt="" style={{width:90,height:70,objectFit:"contain",borderRadius:12,border:`1px solid ${theme.borderSoft}`}}/>:<span/>}{coverPreview?<img src={coverPreview} alt="" style={{width:"100%",height:70,objectFit:"cover",borderRadius:12,border:`1px solid ${theme.borderSoft}`}}/>:<span/>}</div>:null}
        <button type="button" disabled={busy} style={{...primary,opacity:busy?.55:1}} onClick={()=>void save()}>{busy?"…":L("ENREGISTRER LES MODIFICATIONS","SAVE CHANGES","GUARDAR CAMBIOS")}</button>
      </div>
    </div>
    {error?<div style={{...card,padding:9,color:"#ffaaaa",borderColor:"rgba(255,90,90,.45)",fontSize:9}}>{error}</div>:null}
  </div>;
}
