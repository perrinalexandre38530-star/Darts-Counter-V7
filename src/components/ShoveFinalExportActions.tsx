import React from 'react';
import type { ChallengePreparedShare, ChallengeExportResult } from '../lib/challengeResultsExport';

type ShareFormat = 'pdf' | 'png';
type PreparedShareFn = (prepared: ChallengePreparedShare, format: ShareFormat) => Promise<ChallengeExportResult>;

/**
 * SHOVE final-screen exports. PDF/PNG downloads are available immediately.
 * Native sharing is a two-step action: prepare the files first, then share
 * synchronously from a separate button tap (required by Android/iOS gestures).
 */
export default function ShoveFinalExportActions({record,accent='#ffbd49',saveError='',onRetrySave}:{record:any; accent?:string; saveError?:string; onRetrySave?:()=>void}) {
  const [busy,setBusy]=React.useState<'pdf'|'png'|'share'|null>(null);
  const [preparing,setPreparing]=React.useState(false);
  const [prepared,setPrepared]=React.useState<ChallengePreparedShare|null>(null);
  const [preparedMatchId,setPreparedMatchId]=React.useState('');
  const [notice,setNotice]=React.useState('');
  const sharePreparedRef=React.useRef<PreparedShareFn|null>(null);
  const matchIdentity=String(record?.matchId || record?.id || '');
  const liveMatchIdRef=React.useRef(matchIdentity);
  liveMatchIdRef.current=matchIdentity;
  React.useEffect(()=>{
    // A replay produces a new match. Never share another match's prepared PDF.
    sharePreparedRef.current=null;
    setPrepared(null);
    setPreparedMatchId('');
    setNotice('');
  },[matchIdentity]);

  const exportReport=async(format:'pdf'|'png')=>{
    if(busy||preparing)return;
    setBusy(format);
    setNotice('');
    try {
      const { visualReportFromHistory, exportChallengeResults } = await import('../lib/challengeResultsExport');
      const report=visualReportFromHistory(record);
      if (!report?.players?.length) throw new Error('Aucun résultat exploitable dans cette partie.');
      const result=await exportChallengeResults(report,format);
      if(result.status==='cancelled') setNotice('Export annulé.');
      else if(result.status==='downloaded'||result.status==='download-started')
        setNotice(format==='pdf'?'PDF multipage demandé dans Téléchargements.':'ZIP contenant les images PNG demandé dans Téléchargements.');
      else setNotice(`Export indisponible : ${result.status}`);
    } catch (error) {
      setNotice('Export impossible : '+String((error as Error)?.message || error));
    } finally { setBusy(null); }
  };

  const prepareShare=async()=>{
    if(busy||preparing||prepared)return;
    if(typeof navigator==='undefined'||typeof navigator.share!=='function') {
      setNotice('Partage natif indisponible sur cet appareil. Utilise PDF ou IMAGES PNG.');
      return;
    }
    const preparingForId=matchIdentity;
    setPreparing(true);
    setNotice('Préparation du PDF et des images à partager…');
    try {
      const mod=await import('../lib/challengeResultsExport');
      const report=mod.visualReportFromHistory(record);
      if(!report?.players?.length) throw new Error('Aucun résultat à partager.');
      const result=await mod.prepareChallengeShare(report);
      if(liveMatchIdRef.current!==preparingForId)return;
      // No navigator.share here: awaiting the renderer ends the user gesture.
      sharePreparedRef.current=mod.sharePreparedChallenge;
      setPrepared(result);
      setPreparedMatchId(preparingForId);
      setNotice('Fichiers prêts. Choisis PARTAGER PDF ou PARTAGER IMAGES.');
    } catch(error) {
      if(liveMatchIdRef.current!==preparingForId)return;
      setPrepared(null);
      sharePreparedRef.current=null;
      setNotice('Préparation du partage impossible : '+String((error as Error)?.message || error));
    } finally { setPreparing(false); }
  };

  const shareNow=(format:ShareFormat)=>{
    if(busy||preparing||!prepared||preparedMatchId!==matchIdentity||!sharePreparedRef.current)return;
    // Critical: the method invokes navigator.share synchronously in THIS tap.
    const pending=sharePreparedRef.current(prepared,format);
    setBusy('share');
    void pending.then((result)=>{
      if(result.status==='shared') setNotice('Rapport envoyé au partage natif.');
      else if(result.status==='cancelled') setNotice('Partage annulé.');
      else setNotice('Partage natif indisponible pour ces fichiers. Tu peux utiliser le téléchargement.');
    }).catch(error=>{
      setNotice('Partage impossible : '+String((error as Error)?.message || error));
    }).finally(()=>setBusy(null));
  };

  const unavailable=!!busy||preparing;
  const buttonStyle:React.CSSProperties={minWidth:0,minHeight:39,borderRadius:11,border:`1px solid ${accent}88`,background:`${accent}16`,color:accent,fontWeight:1000,cursor:unavailable?'wait':'pointer',fontSize:11};
  return <div data-shove-final-export-actions="1" style={{display:'grid',gap:6}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
      <button disabled={unavailable} type="button" onClick={()=>void exportReport('pdf')} style={buttonStyle}>
        {busy==='pdf'?'PRÉPARATION…':'📄 EXPORT PDF'}
      </button>
      <button disabled={unavailable} type="button" onClick={()=>void exportReport('png')} style={buttonStyle}>
        {busy==='png'?'PRÉPARATION…':'🖼️ IMAGES PNG'}
      </button>
    </div>
    {!prepared ? <button disabled={unavailable} type="button" onClick={()=>void prepareShare()} style={buttonStyle}>
      {preparing?'PRÉPARATION DU PARTAGE…':'↗ PRÉPARER LE PARTAGE'}
    </button> : <div data-shove-native-share-ready="1" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
      <button type="button" disabled={unavailable} onClick={()=>shareNow('pdf')} style={buttonStyle}>↗ PARTAGER PDF</button>
      <button type="button" disabled={unavailable} onClick={()=>shareNow('png')} style={buttonStyle}>↗ PARTAGER IMAGES</button>
    </div>}
    {saveError ? <div role="alert" style={{fontSize:10,color:'#ff9da9',display:'grid',gap:5}}>
      <span>Échec de sauvegarde de cette partie dans l’Historique : {saveError}</span>
      {onRetrySave ? <button type="button" onClick={onRetrySave} style={{...buttonStyle,color:'#fff',background:'rgba(185,45,60,.18)'}}>RÉESSAYER LA SAUVEGARDE</button>:null}
    </div> : null}
    {notice?<div role="status" aria-live="polite" style={{fontSize:10,color:'#c9d6e5',padding:'4px 2px'}}>{notice}</div>:null}
  </div>;
}
