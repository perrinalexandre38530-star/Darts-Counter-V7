import React from 'react';

/** Light entrypoint. The PDF/image engine is loaded only when the user exports. */
export default function ShoveFinalExportActions({record,accent='#ffbd49',saveError='',onRetrySave}:{record:any; accent?:string; saveError?:string; onRetrySave?:()=>void}) {
  const [busy,setBusy]=React.useState<'pdf'|'png'|null>(null);
  const [notice,setNotice]=React.useState('');
  const exportReport=async(format:'pdf'|'png')=>{
    if(busy)return;
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
  const buttonStyle:React.CSSProperties={minWidth:0,minHeight:39,borderRadius:11,border:`1px solid ${accent}88`,background:`${accent}16`,color:accent,fontWeight:1000,cursor:busy?'wait':'pointer',fontSize:11};
  return <div data-shove-final-export-actions="1" style={{display:'grid',gap:5}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
      <button disabled={!!busy} type="button" onClick={()=>void exportReport('pdf')} style={buttonStyle}>
        {busy==='pdf'?'PRÉPARATION…':'📄 EXPORT PDF'}
      </button>
      <button disabled={!!busy} type="button" onClick={()=>void exportReport('png')} style={buttonStyle}>
        {busy==='png'?'PRÉPARATION…':'🖼️ IMAGES PNG'}
      </button>
    </div>
    {saveError ? <div role="alert" style={{fontSize:10,color:'#ff9da9',display:'grid',gap:5}}>
      <span>Échec de sauvegarde de cette partie dans l’Historique : {saveError}</span>
      {onRetrySave ? <button type="button" onClick={onRetrySave} style={{...buttonStyle,color:'#fff',background:'rgba(185,45,60,.18)'}}>RÉESSAYER LA SAUVEGARDE</button>:null}
    </div> : null}
    {notice?<div role="status" aria-live="polite" style={{fontSize:10,color:'#c9d6e5',padding:'4px 2px'}}>{notice}</div>:null}
  </div>;
}
