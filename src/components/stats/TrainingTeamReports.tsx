import React from 'react';
import { exportChallengeResults, type ChallengeExportReport } from '../../lib/challengeResultsExport';
import ticker from '../../assets/tickers/ticker_menu_training_fr.png';

type Snapshot={player?:string;mode?:string;modeId?:string;variant?:string;period?:string;metric?:string;performance?:string;sessions?:number;darts?:number};
type Share={id:string;user_id:string;created_at:string;snapshot:Snapshot};
type Goal={id:string;title:string;kind:string;starts_on:string;ends_on:string;target_sessions:number;mode_id:string|null};
type Data={shares:Share[];goals:Goal[];progress:{goal_id:string;user_id:string;sessions:number;updated_at:string}[];limited:boolean};
const accent='#8cffcb';
const card:React.CSSProperties={background:'#151721',border:'1px solid #8cffcb33',borderRadius:12,padding:10,display:'grid',gap:8,minWidth:0};
const button:React.CSSProperties={background:'#151721',border:'1px solid #8cffcb55',borderRadius:10,padding:9,color:accent,fontWeight:800};
const date=(v:string)=>new Date(v).toLocaleDateString('fr-FR');
function parse(s:Snapshot){
 const m=String(s?.performance||'').trim().match(/^(\d+(?:[.,]\d+)?)\s*(pts\/3|%)$/);
 if(!m)return null;
 const value=Number(m[1].replace(',','.')),unit=m[2];
 if(!Number.isFinite(value)||value<0||value>(unit==='%'?100:180))return null;
 if(unit==='pts/3'&&(s.modeId!=='training_x01'||s.metric!=='Moyenne 3 fléch.'))return null;
 if(unit==='%'&&!['Checkouts réussis','Taux de touches'].includes(s.metric||''))return null;
 return {value,unit};
}
const config=(s:Snapshot,unit:string)=>JSON.stringify([s.modeId||s.mode||'',s.variant||'',s.period||'',s.metric||'',unit]);
export default function TrainingTeamReports({teamName,data,branding}:{teamName:string;data:Data;branding?:{primary?:string;secondary?:string;logo?:string}}){
 const [days,setDays]=React.useState(30),[selection,setSelection]=React.useState(''),[page,setPage]=React.useState(0),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState('');
 const [member,setMember]=React.useState(''),[anonymous,setAnonymous]=React.useState(false);
 const since=days?Date.now()-days*86400000:0;
 const shares=data.shares.filter(s=>Date.parse(s.created_at)>=since);
 const groups=new Map<string,{label:string;unit:string;rows:Map<string,{share:Share;value:number}>}>();
 for(const share of [...shares].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||a.id.localeCompare(b.id))){
  const s=share.snapshot;if(!s||typeof s!=='object')continue;
  const p=parse(s);if(!p||!s.mode||!s.variant||!s.period)continue;
  const k=config(s,p.unit);
  if(!groups.has(k))groups.set(k,{label:[s.mode,s.variant,s.period,s.metric].join(' · '),unit:p.unit,rows:new Map()});
  const g=groups.get(k)!;
  if(!g.rows.has(share.user_id))g.rows.set(share.user_id,{share,value:p.value});
 }
 const key=groups.has(selection)?selection:groups.keys().next().value||'';
 const group=groups.get(key);
 const rows=Array.from(group?.rows.values()||[]).sort((a,b)=>b.value-a.value||a.share.id.localeCompare(b.share.id));
 const avg=rows.length?rows.reduce((a,b)=>a+b.value,0)/rows.length:null;
 const selectedRows=member?rows.filter(x=>x.share.user_id===member):rows;
 const aliases=new Map(rows.map((x,i)=>[x.share.user_id,`Participant ${i+1}`]));
 const label=(row:typeof rows[number])=>anonymous?(aliases.get(row.share.user_id)||'Participant'):(row.share.snapshot.player||'Participant');
 const value=(v:number)=>`${v.toFixed(1)} ${group?.unit||''}`;
 const goals=data.goals.filter(g=>!days||Date.parse(g.ends_on+'T23:59:59Z')>=since);
 const goalRows=goals.map(g=>{const p=data.progress.filter(x=>x.goal_id===g.id);return {g,n:p.length,done:p.filter(x=>x.sessions>=g.target_sessions).length,credits:p.reduce((a,x)=>a+Math.min(x.sessions,g.target_sessions),0),target:p.length*g.target_sessions};});
 const publication=new Map<string,number>();
 for(const s of shares){const d=s.created_at.slice(0,10);publication.set(d,(publication.get(d)||0)+1);}
 const activity=[...publication.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 const max=Math.max(1,...activity.map(x=>x[1]));
 const pages=Math.max(1,Math.ceil(selectedRows.length/8)),current=Math.min(page,pages-1);
 const histories=selectedRows.map(row=>{const history=shares.filter(x=>x.user_id===row.share.user_id&&x.snapshot&&parse(x.snapshot)&&config(x.snapshot,parse(x.snapshot)!.unit)===key).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id));const first=history[0],last=history[history.length-1];return {row,history,first,last,delta:history.length>1?parse(last.snapshot)!.value-parse(first.snapshot)!.value:null};});
 const report:ChallengeExportReport={title:'TRAINING TEAMS · '+teamName,rounds:0,unit:'bilan',date:new Date().toLocaleDateString('fr-FR'),tickerSrc:ticker,appLogoSrc:branding?.logo,headerAccent:branding?.primary,headerSecondary:branding?.secondary,footerBrand:'MULTISPORTS SCORING',sportLabel:'DARTS · TRAINING TEAMS',highlight:[{label:'Équipe',value:teamName},{label:'Publications',value:days?`${days} derniers jours`:'Toutes disponibles'},{label:'Couverture',value:data.limited?'Partielle (limites atteintes)':'Données accessibles chargées'}],players:[],details:[
 {title:'Comparatif des dernières fiches par membre',columns:['Joueur','Performance','Séances','Fléch.','Publication'],rows:selectedRows.map(x=>[label(x),value(x.value),String(x.share.snapshot.sessions??'—'),String(x.share.snapshot.darts??'—'),date(x.share.created_at)]),note:`${group?.label||'Aucune configuration comparable'}. Moyenne non pondérée : ${avg===null?'—':value(avg)}. Déclaratif, non homologué. Les périodes des fiches peuvent se chevaucher.`},
 {title:'Écart entre publications comparables',columns:['Joueur','Première','Dernière','Écart','Fiches'],rows:histories.map(h=>[label(h.row),h.first?value(parse(h.first.snapshot)!.value):'—',h.last?value(parse(h.last.snapshot)!.value):'—',h.delta===null?'—':(h.delta>0?'+':'')+value(h.delta),String(h.history.length)]),note:'Ordre des publications, pas des séances. Les fenêtres déclarées peuvent se chevaucher ; cet écart ne prouve pas une progression sportive.'},
 {title:'Objectifs collectifs · état actuel',columns:['Objectif','Fin','Participants','Atteints','Crédits'],rows:goalRows.map(x=>[x.g.title,date(x.g.ends_on),String(x.n),String(x.done),`${x.credits}/${x.target}`]),note:'Objectifs dont la fin est dans la fenêtre ou ultérieure. Crédits cumulés actuels, pas des séances uniques ni une mesure historique.'},
 {title:'Activité de publication',columns:['Date UTC','Fiches publiées'],rows:activity.map(([d,n])=>[d,String(n)]),note:'Publications disponibles uniquement, pas des séances ni une courbe de performance.'}
 ]};
 const exportFile=async(format:'pdf'|'png')=>{if(busy)return;setBusy(true);setMessage('');try{const result=await exportChallengeResults(report,format);setMessage(result.status==='cancelled'?'Export annulé.':result.status==='preview'?'Aperçu ouvert.':'Export préparé.');}catch{setMessage('Export impossible. Réessaie.');}finally{setBusy(false);}};
 return <section style={{display:'grid',gap:8}}>
 <strong style={{color:accent}}>BILANS · {teamName}</strong>
 <small>Uniquement les fiches volontairement partagées et les objectifs accessibles. Résultats déclaratifs, non homologués.</small>
 <select aria-label="Fenêtre de publication" style={button} value={days} onChange={e=>{setDays(Number(e.target.value));setSelection('');setMember('');setPage(0);}}><option value={7}>Publications · 7 jours</option><option value={30}>Publications · 30 jours</option><option value={90}>Publications · 90 jours</option><option value={0}>Toutes les publications disponibles</option></select>
 <select aria-label="Configuration comparable" style={{...button,maxWidth:'100%'}} value={key} onChange={e=>{setSelection(e.target.value);setMember('');setPage(0);}}><option value="" disabled>Aucune configuration comparable</option>{Array.from(groups.entries()).map(([k,g])=><option key={k} value={k}>{g.label}</option>)}</select>
 <div style={{...card,borderColor:/^#[0-9a-f]{6}$/i.test(branding?.primary||'')?branding?.primary:undefined}}><div style={{display:'flex',alignItems:'center',gap:8}}>{branding?.logo&&<img src={branding.logo} alt="Logo TEAM" style={{width:44,height:44,objectFit:'contain'}}/>}<strong>{teamName}</strong></div><select aria-label="Membre du rapport" style={button} value={member} onChange={e=>{setMember(e.target.value);setPage(0);}}><option value="">Tous les membres comparables</option>{rows.map(x=><option key={x.share.user_id} value={x.share.user_id}>{label(x)}</option>)}</select><label><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> Masquer les noms dans les exports</label><small>Rapport interne à la TEAM. Le filtre membre concerne les comparatifs, pas les totaux collectifs.</small></div>
 <div style={card}><small>Moyenne des dernières fiches par membre · {rows.length} participant(s)</small><strong style={{fontSize:26,color:accent}}>{avg===null?'—':value(avg)}</strong><small>Comparaison à configuration et période déclarée identiques. Ce n’est pas la moyenne de toutes les séances.</small>
 {selectedRows.slice(current*8,(current+1)*8).map(x=><div key={x.share.id} style={{display:'grid',gap:3}}><div style={{display:'flex',justifyContent:'space-between',gap:6}}><span>{label(x)}</span><strong>{value(x.value)}</strong></div><progress style={{width:'100%',accentColor:accent}} max={group?.unit==='%'?100:180} value={x.value}/></div>)}
 {pages>1&&<div style={{display:'flex',justifyContent:'space-between'}}><button style={button} disabled={!current} onClick={()=>setPage(current-1)}>‹</button><small>{current+1}/{pages}</small><button style={button} disabled={current+1>=pages} onClick={()=>setPage(current+1)}>›</button></div>}</div>
 <div style={card}><strong>ÉCART ENTRE PUBLICATIONS</strong><small>Première et dernière fiche comparable dans la fenêtre. Pas une courbe de séances.</small>{histories.slice(current*8,(current+1)*8).map(h=><div key={h.row.share.user_id} style={{display:'flex',justifyContent:'space-between',gap:8}}><span>{label(h.row)}</span><strong>{h.delta===null?'Une seule fiche':(h.delta>0?'+':'')+value(h.delta)}</strong></div>)}</div>
 <div style={card}><strong>ACTIVITÉ DE PUBLICATION</strong>{activity.length?<svg viewBox="0 0 300 80" role="img" aria-label="Nombre de fiches par jour de publication" style={{width:'100%',height:80}}>{activity.map(([d,n],i)=><rect key={d} x={i*300/activity.length} y={76-70*n/max} width={Math.max(1,300/activity.length-2)} height={70*n/max} fill={accent}><title>{d} : {n}</title></rect>)}</svg>:<small>Aucune publication.</small>}<small>{shares.length} fiche(s) · {activity.length} jour(s) avec publication. Les jours sans publication ne sont pas représentés.</small></div>
 <div style={card}><strong>OBJECTIFS · ÉTAT ACTUEL</strong><small>{goalRows.length} objectif(s) · {goalRows.reduce((a,x)=>a+x.done,0)} objectifs-joueurs atteints</small><small>Crédits cumulés pour les objectifs non échus avant la fenêtre sélectionnée.</small></div>
 <div style={{display:'flex',gap:6}}><button style={button} disabled={busy||(!shares.length&&!goals.length)} onClick={()=>void exportFile('pdf')}>Exporter PDF</button><button style={button} disabled={busy||(!shares.length&&!goals.length)} onClick={()=>void exportFile('png')}>Images</button></div><small>Les exports sont réservés au cadre de la TEAM, même avec les noms masqués.</small>{message&&<small role="status">{message}</small>}
 </section>;
}
