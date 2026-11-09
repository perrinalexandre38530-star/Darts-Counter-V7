import React from 'react';
import { createPortal } from 'react-dom';
import type { ChallengeExportResult } from '../lib/challengeResultsExport';

export type ChallengeReportFormat = 'pdf' | 'png' | 'share';

// Same line icon grammar as BottomNav: 24px, round caps, 2px strokes.
function ReportIcon({kind}: {kind: ChallengeReportFormat}) {
 const shared = {width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 if(kind==='pdf')return <svg {...shared}><path d="M7 2h7l5 5v14a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h8M8 16h5"/></svg>;
 if(kind==='png')return <svg {...shared}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg>;
 return <svg {...shared}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.5M8.2 13.3l7.5 4.3"/></svg>;
}
const formats:ChallengeReportFormat[]=['pdf','png','share'];
const titles:Record<ChallengeReportFormat,string>={pdf:'PDF',png:'IMAGES PNG A4 (ZIP)',share:'PARTAGER'};
const colors:Record<ChallengeReportFormat,string>={pdf:'#ffc4d1',png:'#b1efff',share:'#b8f4d6'};

/** Only three clean icons: no frame, no label, centered regardless of width. */
export function ChallengeReportActions({onExport,busy=false,compact=false}:{
 onExport:(format:ChallengeReportFormat)=>void;busy?:boolean;compact?:boolean;
}){
 return <div className="challenge-report-actions" style={{
  display:'flex',justifyContent:'center',alignItems:'stretch',gap:compact?10:14,
  width:'100%',minWidth:0,margin:'0 auto',padding:compact?'2px 0':'6px 0',flexWrap:'wrap'
 }}>
  {formats.map(format=><button key={format} type="button"
   disabled={busy} onClick={()=>onExport(format)} title={titles[format]}
   aria-label={format==='pdf'?'Télécharger le rapport PDF':format==='png'?'Télécharger toutes les pages PNG A4 dans un ZIP':'Choisir où partager la partie'}
   style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:compact?4:7,flex:'0 0 auto',
    minWidth:compact?72:108,height:compact?58:74,border:'1px solid rgba(89,123,154,.42)',outline:0,borderRadius:14,
    background:'linear-gradient(180deg,#132131,#0a121d)',color:colors[format],boxShadow:'inset 0 0 0 1px rgba(255,255,255,.03)',padding:compact?'6px 8px':'10px 12px',
    cursor:busy?'wait':'pointer',opacity:busy ? .52 : 1,touchAction:'manipulation'}}>
    <span style={{display:'flex',transform:compact?'scale(1.02)':'scale(1.18)'}}><ReportIcon kind={format}/></span>
    <span style={{fontSize:compact?10:11,fontWeight:900,letterSpacing:'.35px',lineHeight:1.05,color:'#eff7ff'}}>{format==='png'?'IMAGE':format==='share'?'PARTAGE':'PDF'}</span>
  </button>)}
 </div>;
}

/**
 * The browser share target cannot be selected by a web page. This dialog
 * lets the user choose the file type, then uses the Android/iOS system chooser
 * when supported, showing an accurate fallback when it is not.
 */
export function ChallengeReportShareDialog({
 open,onClose,onShare,busy=false,error='',
}:{
 open:boolean;onClose:()=>void;onShare:(format:'png'|'pdf')=>void;
 busy?:boolean;error?:string;
}){
 if(!open)return null;
 return createPortal(<div role="presentation" onClick={onClose}
  style={{position:'fixed',inset:0,zIndex:230000,display:'grid',placeItems:'center',
   padding:14,background:'rgba(0,0,0,.82)'}}>
  <div role="dialog" aria-modal="true" aria-label="Partager les résultats"
   onClick={event=>event.stopPropagation()}
   style={{width:'min(93vw,460px)',padding:17,borderRadius:17,
    border:'1px solid #364b61',background:'linear-gradient(180deg,#111a27,#080f19)',
    color:'#f3f7ff',display:'grid',gap:14}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
    <strong style={{color:'#ff8293',fontSize:16,letterSpacing:'.3px'}}>PARTAGER MES RÉSULTATS</strong>
    <button type="button" onClick={onClose} aria-label="Fermer"
     style={{border:0,background:'transparent',color:'#fff',fontSize:25,padding:4}}>×</button>
   </div>
   <p style={{margin:0,color:'#b7cadb',fontSize:12,lineHeight:1.55}}>
    Choisis le format à envoyer. Le menu de partage Android proposera
    ensuite WhatsApp, Facebook, Instagram ou les autres applications compatibles
    installées sur ton téléphone.
   </p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
    <button type="button" disabled={busy} onClick={()=>onShare('png')}
     style={{minHeight:82,borderRadius:12,border:'1px solid #468ca7',background:'#142b3b',
      color:'#c6efff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:8,fontSize:11,fontWeight:900,opacity:busy ? .6 : 1}}>
      <ReportIcon kind="png"/>IMAGES PNG (PAGES A4)
    </button>
    <button type="button" disabled={busy} onClick={()=>onShare('pdf')}
     style={{minHeight:82,borderRadius:12,border:'1px solid #945263',background:'#311c27',
      color:'#ffe3ec',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:8,fontSize:11,fontWeight:900,opacity:busy ? .6 : 1}}>
      <ReportIcon kind="pdf"/>DOCUMENT PDF
    </button>
   </div>
   {error&&<div role="alert" style={{padding:'10px 12px',color:'#ffd8a9',
    fontSize:12,lineHeight:1.6,border:'1px solid #8d6641',borderRadius:10,
    background:'#291e18'}}>{error}</div>}
   <small style={{color:'#8298ad',lineHeight:1.55}}>
    Certains navigateurs intégrés bloquent le menu Android.
    Dans ce cas, télécharge le PDF ou le PNG avec les icônes du résultat,
    puis partage le fichier depuis Téléchargements ou Galerie.
   </small>
  </div>
 </div>, document.body);
}

export function ChallengeReportPreview({result,onClose,onDownload}:{result:ChallengeExportResult|null;onClose:()=>void;onDownload?:()=>void}) {
 if(!result||result.status!=='preview')return null;
 return createPortal(<div role="presentation" onClick={onClose} style={{position:'fixed',inset:0,zIndex:220000,display:'grid',placeItems:'center',background:'rgba(0,0,0,.88)',padding:12}}>
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
 </div>, document.body);
}
