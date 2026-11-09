import React from 'react';
import type { ChallengeExportResult } from '../lib/challengeResultsExport';

export type ChallengeReportFormat = 'pdf' | 'png' | 'share';

// Same line icon grammar as BottomNav: 24px, round caps, 2px strokes.
function ReportIcon({kind}: {kind: ChallengeReportFormat}) {
 const shared = {width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 if(kind==='pdf')return <svg {...shared}><path d="M7 2h7l5 5v14a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h8M8 16h5"/></svg>;
 if(kind==='png')return <svg {...shared}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg>;
 return <svg {...shared}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.5M8.2 13.3l7.5 4.3"/></svg>;
}
const styles:Record<ChallengeReportFormat,React.CSSProperties>={
 pdf:{borderColor:'#bd6277',color:'#ffbecd',background:'linear-gradient(180deg,#321720,#170e16)'},
 png:{borderColor:'#459bc2',color:'#b5edff',background:'linear-gradient(180deg,#163546,#0d1c2b)'},
 share:{borderColor:'#48b88d',color:'#c4ffe7',background:'linear-gradient(180deg,#123c2b,#0b2119)'},
};
const formats:ChallengeReportFormat[]=['pdf','png','share'];
const titles:Record<ChallengeReportFormat,string>={pdf:'PDF',png:'IMAGE',share:'PARTAGER'};
export function ChallengeReportActions({onExport,busy=false,compact=false}:{
 onExport:(format:ChallengeReportFormat)=>void;busy?:boolean;compact?:boolean;
}){
 return <div className="challenge-report-actions" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',width:'100%',gap:7,minWidth:0}}>
  {formats.map(format=><button key={format} type="button" disabled={busy} onClick={()=>onExport(format)}
   aria-label={format==='pdf'?'Exporter en PDF':format==='png'?'Exporter en image PNG':'Partager le résultat'} title={titles[format]}
   style={{...styles[format],display:'flex',flexDirection:compact?'row':'column',justifyContent:'center',alignItems:'center',gap:compact?6:3,
    minWidth:0,minHeight:compact?39:57,padding:compact?'5px 7px':'8px 3px',borderWidth:1,borderStyle:'solid',borderRadius:12,
    fontWeight:900,fontSize:compact?9:10,letterSpacing:'.4px',cursor:busy?'wait':'pointer',opacity:busy?.55:1}}>
   <ReportIcon kind={format}/><span>{titles[format]}</span>
  </button>)}
 </div>;
}

export function ChallengeReportPreview({result,onClose,onDownload}:{result:ChallengeExportResult|null;onClose:()=>void;onDownload?:()=>void}) {
 if(!result||result.status!=='preview')return null;
 return <div role="presentation" onClick={onClose} style={{position:'fixed',inset:0,zIndex:220000,display:'grid',placeItems:'center',background:'rgba(0,0,0,.88)',padding:12}}>
  <div role="dialog" aria-modal="true" aria-label="Prévisualisation du rapport" onClick={e=>e.stopPropagation()} style={{width:'min(95vw,620px)',maxHeight:'92dvh',overflowY:'auto',background:'#09111d',color:'#edf6ff',border:'1px solid #42536c',borderRadius:16,padding:13,display:'grid',gap:11,boxShadow:'0 22px 70px #000b'}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
    <strong style={{fontSize:15,color:'#ff818b'}}>APERÇU DU RAPPORT</strong>
    <button type="button" onClick={onClose} aria-label="Fermer" style={{fontSize:23,color:'#fff',background:'none',border:0,padding:'4px 8px'}}>×</button>
   </div>
   <p style={{margin:0,fontSize:12,lineHeight:1.55,color:'#c5d5e4'}}>
    Ton navigateur intégré ne prend pas en charge l'enregistrement direct de ce fichier.
    L'image est affichée ci-dessous : un appui long permet généralement de l'enregistrer.
    Pour un PDF, ouvre la preview dans Chrome ou un navigateur externe, puis utilise le bouton PDF.
   </p>
   {result.previewUrl&&<img src={result.previewUrl} alt="Rapport Challenge complet avec classement et statistiques" style={{display:'block',width:'100%',height:'auto',borderRadius:10,border:'1px solid #344254'}}/>}
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    {onDownload&&!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)&&<button type="button" onClick={onDownload} style={{flex:1,minHeight:42,border:'1px solid #459bc2',borderRadius:10,color:'#d1f2ff',background:'#133246',fontWeight:900}}>TÉLÉCHARGER</button>}
    <button type="button" onClick={()=>{try{const op=navigator.clipboard?.writeText(window.location.href);void op?.catch(()=>{});}catch{}}} style={{flex:1,minHeight:42,border:'1px solid #459bc2',borderRadius:10,color:'#d1f2ff',background:'#133246',fontWeight:900}}>COPIER LE LIEN POUR CHROME</button>
    <button type="button" onClick={onClose} style={{flex:1,minHeight:42,border:'1px solid #6f788b',borderRadius:10,color:'#fff',background:'#202c3d',fontWeight:900}}>FERMER</button>
   </div>
  </div>
 </div>;
}
