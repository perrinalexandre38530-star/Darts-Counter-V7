import React from 'react';
import BackDot from '../components/BackDot';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../contexts/StoreContext';
import { useFullscreenPlay } from '../hooks/useFullscreenPlay';
import {
  fetchChallengeLeaderboard,
  fetchChallengeLeaderboardDetail,
  enrichChallengeLeaderboardDetailFromHistory,
  listChallengeTeamScopes,
  syncChallengeHistoricalScores,
  type ChallengeLeaderboardDetail,
  type ChallengeLeaderboardRow,
  type ChallengeLeaderboardTeam,
} from '../lib/challengeLeaderboard';

const TARGETS=[...Array.from({length:20},(_,i)=>String(i+1)),'bull'];
const VISITS=[5,10,15,20,30,50,100];
const RULES=['all','single','double','triple','bull'];
const targetLabel=(v:string)=>v==='bull'?'BULL':v==='bull25'?'BULL 25':v==='bull50'?'BULL 50':v;
const ruleLabel=(v:string)=>v==='single'?'S':v==='double'?'D':v==='triple'?'T':v==='bull'||v==='bull25'||v==='bull50'?'BULL':'TOUS';

function FilterIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="12" cy="18" r="1.8"/></svg>}

export default function ChallengeLeaderboardPage({go,params}:{go:(tab:any,p?:any)=>void;params?:any}){
 useFullscreenPlay({enabled:true,lockBodyScroll:false});
 const theme=useTheme();
 const {store}=useStore();
 const profiles=store?.profiles||[];
 const [target,setTarget]=React.useState(String(params?.target||'20'));
 const [rule,setRule]=React.useState(String(params?.rule||'all'));
 const [visits,setVisits]=React.useState(Math.max(1,Number(params?.visits||20)));
 const [scope,setScope]=React.useState<'public'|'team'>('public');
 const [teams,setTeams]=React.useState<ChallengeLeaderboardTeam[]>([]);
 const [teamKey,setTeamKey]=React.useState('');
 const [rows,setRows]=React.useState<ChallengeLeaderboardRow[]>([]);
 const [loading,setLoading]=React.useState(false);
 const [syncing,setSyncing]=React.useState(false);
 const [error,setError]=React.useState('');
 const [filtersOpen,setFiltersOpen]=React.useState(false);
 const [detail,setDetail]=React.useState<ChallengeLeaderboardDetail|null>(null);
 const [detailLoading,setDetailLoading]=React.useState(false);
 const syncedRef=React.useRef(false);
 const selectedTeam=teams.find(t=>t.key===teamKey)||null;
 const objective=React.useMemo(()=>({target,rule,visits,setMode:params?.setMode||null,setTarget:params?.setTarget||null,legMode:params?.legMode||null,legTarget:params?.legTarget||null}),[target,rule,visits,params?.setMode,params?.setTarget,params?.legMode,params?.legTarget]);

 const refreshTeams=React.useCallback(async()=>{
  try{
   const official=await listChallengeTeamScopes();
   setTeams(official);
   if(!teamKey&&official[0])setTeamKey(official[0].key);
   return official;
  }catch(e){console.warn('[challenge leaderboard] teams',e);return [] as ChallengeLeaderboardTeam[]}
 },[teamKey]);

 const refresh=React.useCallback(async()=>{
  setLoading(true);setError('');
  try{
   if(scope==='team'&&!teamKey){setRows([]);return}
   const data=await fetchChallengeLeaderboard(objective,100,scope==='team'?{type:'team',teamKey}:{type:'public'});
   setRows(data);
  }catch(e:any){
   const msg=String(e?.message||'');
   setError(msg.includes('PRIVATE_TEAM')?'Classement privé réservé aux membres officiels de cette équipe.':'Classement indisponible pour le moment.');
  }finally{setLoading(false)}
 },[objective,scope,teamKey]);

 React.useEffect(()=>{void (async()=>{
  if(!syncedRef.current){syncedRef.current=true;setSyncing(true);try{await syncChallengeHistoricalScores(profiles)}catch(e){console.warn('[challenge leaderboard] backfill',e)}finally{setSyncing(false)}}
  const official=await refreshTeams();
  if(scope==='team'&&!teamKey&&official[0])setTeamKey(official[0].key);
  await refresh();
 })()},[]);
 React.useEffect(()=>{void refresh()},[refresh]);

 const openFullStats=React.useCallback((data:ChallengeLeaderboardDetail)=>{
  const rawEntries=Array.isArray(data?.stats?.entries)?data.stats.entries:[];
  const pid=String(data.userId||'online-player');
  const entries=rawEntries
   .filter((entry:any)=>entry&&['S','D','T','25','50','MISS'].includes(String(entry?.hit||'').toUpperCase()))
   .map((entry:any)=>({hit:String(entry.hit).toUpperCase(),pid}));
  if(!entries.length)return false;

  const player={
   id:pid,
   userId:pid,
   name:data.displayName||'Joueur',
   displayName:data.displayName||'Joueur',
   avatarDataUrl:data.avatarUrl||null,
   score:data.score,
   points:data.score,
   darts:data.darts,
   dartsThrown:data.darts,
   bestStreak:data.bestStreak,
   successRate:data.accuracy,
   bestVisit:Number(data?.stats?.bestVisit||0),
   avgVisit:Number(data?.stats?.avgVisit||0),
   hitSummary:{
    S:Number(data?.stats?.hitCounts?.S||0),
    D:Number(data?.stats?.hitCounts?.D||0),
    T:Number(data?.stats?.hitCounts?.T||0),
    SBull:Number(data?.stats?.hitCounts?.['25']||0),
    DBull:Number(data?.stats?.hitCounts?.['50']||0),
    MISS:Number(data?.stats?.hitCounts?.MISS||0),
    darts:data.darts,
   },
   positionStats:Array.isArray(data?.stats?.positionStats)?data.stats.positionStats:[],
   visitScores:Array.isArray(data?.stats?.visitScores)?data.stats.visitScores:[],
   cumulativeScores:Array.isArray(data?.stats?.cumulativeScores)?data.stats.cumulativeScores:[],
  };
  const config={
   target:data.target as any,
   visits:data.visits,
   rule:data.rule as any,
   playerIds:[],teamIds:[],participantMode:'players',participantSource:'direct',configMode:'complete',matchMode:'solo',
  };
  const summary={
   title:'CHALLENGE',kind:'challenge',mode:'challenge',status:'finished',finished:true,winnerId:null,
   scoreLine:`${data.displayName} ${data.score}`,
   finalScores:{[pid]:data.score},rankings:[{...player,rank:1}],perPlayer:[{...player,rank:1}],
   target:data.target,objective:targetLabel(data.target),rule:data.rule,visits:data.visits,
  };
  const rec={
   id:data.matchId||`online-${pid}-${data.target}-${data.visits}`,
   matchId:data.matchId||`online-${pid}-${data.target}-${data.visits}`,
   kind:'challenge',mode:'challenge',sport:'darts',status:'finished',finishedAt:data.updatedAt||Date.now(),
   players:[player],summary,
   payload:{kind:'challenge',mode:'challenge',sport:'darts',status:'finished',config,state:{log:entries,entries},entries,players:[player],finalPlayers:[player],summary},
  };
  go('challenge_play',{
   historyStatsOnly:true,
   onlineStatsOnly:true,
   returnTab:'challenge_leaderboard',
   returnParams:{from:params?.from||'online',target,rule,visits},
   rec,
  });
  return true;
 },[go,params?.from,target,rule,visits]);

 const openDetail=async(row:ChallengeLeaderboardRow)=>{
  setDetailLoading(true);setError('');
  try{
   // Réinjecte d'abord les anciennes parties locales du compte connecté afin
   // qu'un ancien best score puisse récupérer ses fléchettes/statistiques exactes.
   try{await syncChallengeHistoricalScores(profiles)}catch(e){console.warn('[challenge leaderboard] detail backfill',e)}
   const fetched=await fetchChallengeLeaderboardDetail(objective,row.userId,scope==='team'?{type:'team',teamKey}:{type:'public'});
   if(!fetched){setError('Le détail de cette ancienne performance n’est pas encore disponible.');return}
   const data=await enrichChallengeLeaderboardDetailFromHistory(fetched,profiles);
   if(openFullStats(data))return;
   // Très anciennes performances serveur : aucun journal fléchette-par-fléchette
   // n'existe encore. On garde le résumé disponible au lieu d'inventer des données.
   setDetail(data);
   setError('Ancienne performance : le détail complet fléchette par fléchette n’était pas encore enregistré.');
  }catch(e:any){setError(String(e?.message||'Détail indisponible.'))}finally{setDetailLoading(false)}
 };
 const stats:any=detail?.stats||{};
 const hitCounts=stats?.hitCounts||{};
 const positionStats=Array.isArray(stats?.positionStats)?stats.positionStats:[];
 const visitScores=Array.isArray(stats?.visitScores)?stats.visitScores:[];

 return <div className="challenge-lb-page" style={{background:theme.bg,color:theme.text}}>
  <header className="challenge-lb-head">
   <BackDot onClick={()=>go(params?.from==='online'?'online':'challenge_config')} size={44} color="#35e9ff" glow="#35e9ff77"/>
   <div><small>CHALLENGE</small><h1>CLASSEMENTS ONLINE</h1></div>
   <button type="button" className="challenge-filter-button" onClick={()=>setFiltersOpen(true)} aria-label="Filtres"><FilterIcon/><span>FILTRES</span></button>
  </header>

  <div className="challenge-lb-summary">
   <span>🎯 <b>{targetLabel(target)}</b></span><span>🔁 <b>{visits} TOURS</b></span><span>✦ <b>{ruleLabel(rule)}</b></span><span>{scope==='team'?'🛡️':'🌍'} <b>{scope==='team'?(selectedTeam?.name||'ÉQUIPE OFFICIELLE'):'PUBLIC'}</b></span>
  </div>
  {scope==='team'&&<div className="challenge-official-note">✓ OFFICIEL · classement réservé aux membres réellement affectés à cette équipe dans une Organisation MSS.</div>}
  {syncing&&<div className="challenge-lb-status">↻ Synchronisation de tes anciennes parties Challenge…</div>}
  {error&&<div className="challenge-lb-status error">{error}</div>}

  <main className="challenge-lb-card">
   <div className="challenge-lb-title"><div><b>MEILLEURS SCORES</b><small>Une seule ligne par joueur : sa meilleure performance pour cette configuration exacte.</small></div><button type="button" onClick={()=>void (async()=>{setSyncing(true);try{await syncChallengeHistoricalScores(profiles);await refreshTeams();await refresh()}finally{setSyncing(false)}})()}>↻</button></div>
   {loading?<div className="challenge-lb-empty">CHARGEMENT…</div>:rows.length===0?<div className="challenge-lb-empty">Aucun score pour cette configuration.</div>:<div className="challenge-lb-list">{rows.map(row=><button type="button" className="challenge-lb-row" key={row.userId} onClick={()=>void openDetail(row)}>
    <strong>#{row.rank}</strong><span className="challenge-lb-player">{row.avatarUrl?<img src={row.avatarUrl} alt=""/>:<i>{String(row.displayName||'?').slice(0,1).toUpperCase()}</i>}<span><b>{row.displayName}</b><small>{row.playedCount} partie{row.playedCount>1?'s':''} · meilleur résultat</small></span></span><em>{row.score}<small>PTS</small></em><span className="challenge-lb-meta">{row.accuracy.toFixed(1)}% · suite {row.bestStreak} · {row.darts} fl.</span><span className="challenge-lb-detail">STATS ›</span>
   </button>)}</div>}
  </main>

  {filtersOpen&&<div className="challenge-filter-overlay" onClick={()=>setFiltersOpen(false)}><div className="challenge-filter-modal" onClick={e=>e.stopPropagation()}>
   <header><div className="filter-title-icon"><FilterIcon/></div><div><b>FILTRES DU CLASSEMENT</b><small>Seules les performances strictement comparables sont regroupées.</small></div><button onClick={()=>setFiltersOpen(false)}>×</button></header>
   <section><h3>CLASSEMENT</h3><div className="filter-choice-grid scope"><button className={scope==='public'?'on':''} onClick={()=>setScope('public')}>🌍 PUBLIC</button><button className={scope==='team'?'on':''} disabled={!teams.length} onClick={()=>setScope('team')}>🛡️ ÉQUIPE OFFICIELLE</button></div></section>
   {scope==='team'&&<section><h3>ÉQUIPE OFFICIELLE</h3>{teams.length?<div className="filter-choice-grid teams">{teams.map(team=><button key={team.key} className={teamKey===team.key?'on':''} onClick={()=>setTeamKey(team.key)}><span>✓ OFFICIEL</span><b>{team.name}</b><small>{team.organizationName||'Organisation MSS'}</small></button>)}</div>:<p>Aucune équipe officielle : il faut être membre actif d’une Organisation MSS et être affecté à une de ses équipes Darts.</p>}</section>}
   <section><h3>🎯 CIBLE</h3><div className="filter-choice-grid compact">{TARGETS.map(v=><button className={target===v?'on':''} key={v} onClick={()=>setTarget(v)}>{targetLabel(v)}</button>)}</div></section>
   <section><h3>🔁 TOURS</h3><div className="filter-choice-grid compact">{VISITS.map(v=><button className={visits===v?'on':''} key={v} onClick={()=>setVisits(v)}>{v}</button>)}</div></section>
   <section><h3>✦ IMPACTS AUTORISÉS</h3><div className="filter-choice-grid compact">{RULES.map(v=><button className={rule===v?'on':''} key={v} onClick={()=>setRule(v)}>{ruleLabel(v)}</button>)}</div></section>
   <footer><button onClick={()=>{setFiltersOpen(false);void refresh()}}>APPLIQUER</button></footer>
  </div></div>}

  {(detail||detailLoading)&&<div className="challenge-detail-overlay" onClick={()=>!detailLoading&&setDetail(null)}><div className="challenge-detail-modal" onClick={e=>e.stopPropagation()}>
   {detailLoading?<div className="challenge-lb-empty">CHARGEMENT DES STATS…</div>:detail&&<><header><div className="challenge-detail-avatar">{detail.avatarUrl?<img src={detail.avatarUrl} alt=""/>:<span>{detail.displayName.slice(0,1).toUpperCase()}</span>}</div><div><small>MEILLEURE PERFORMANCE ONLINE</small><b>{detail.displayName}</b><em>🎯 {targetLabel(detail.target)} · 🔁 {detail.visits} tours · ✦ {ruleLabel(detail.rule)}</em></div><strong>{detail.score}<small>PTS</small></strong><button onClick={()=>setDetail(null)}>×</button></header>
    <div className="challenge-detail-kpis"><div><span>PRÉCISION</span><b>{detail.accuracy.toFixed(1)}%</b></div><div><span>SUITE MAX</span><b>{detail.bestStreak}</b></div><div><span>FLÉCHETTES</span><b>{detail.darts}</b></div><div><span>BEST VOLÉE</span><b>{Number(stats?.bestVisit||0)}</b></div><div><span>MOY. / VOLÉE</span><b>{Number(stats?.avgVisit||0).toFixed(1)}</b></div></div>
    <section><h3>IMPACTS</h3><div className="challenge-detail-hits">{['S','D','T','25','50','MISS'].map(k=><span key={k}><small>{k}</small><b>{Number(hitCounts?.[k]||0)}</b></span>)}</div></section>
    {positionStats.length>0&&<section><h3>PRÉCISION PAR FLÉCHETTE</h3><div className="challenge-detail-positions">{positionStats.map((p:any,i:number)=><div key={i}><span>FLÉCHETTE {Number(p?.position||i+1)}</span><b>{Number(p?.accuracy||0).toFixed(1)}%</b><small>{Number(p?.successful||0)}/{Number(p?.attempts||0)} touches</small></div>)}</div></section>}
    {visitScores.length>0&&<section><h3>VOLÉES</h3><div className="challenge-detail-visits">{visitScores.map((v:any,i:number)=><span key={i}><small>#{i+1}</small><b>{Number(v||0)}</b></span>)}</div></section>}
   </>}
  </div></div>}
  <style>{css}</style>
 </div>;
}

const css=`
.challenge-lb-page{min-height:100dvh;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));background:#03060a;overflow:auto}.challenge-lb-head{width:min(1120px,100%);margin:0 auto;display:grid;grid-template-columns:54px minmax(0,1fr) 84px;align-items:center;gap:10px;padding:9px 10px;border:1px solid #29394c;border-radius:17px;background:linear-gradient(180deg,#0d1622,#060a10)}.challenge-lb-head>div{text-align:center;min-width:0}.challenge-lb-head small{display:block;font-size:8px;color:#ff5960;font-weight:1000;letter-spacing:1px}.challenge-lb-head h1{margin:2px 0 0;font-size:clamp(17px,4vw,28px);letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.challenge-filter-button{height:48px;border:1px solid #41536a;border-radius:13px;background:#09131e;color:#dce6f2;display:grid;place-items:center;gap:1px}.challenge-filter-button svg,.filter-title-icon svg{width:22px;height:22px;fill:none;stroke:#37e7ff;stroke-width:1.7}.challenge-filter-button span{font-size:7px;font-weight:1000;letter-spacing:.7px}.challenge-lb-summary{width:min(1120px,100%);margin:8px auto 0;display:flex;gap:6px;overflow-x:auto;padding:2px}.challenge-lb-summary span{flex:0 0 auto;border:1px solid #2c3c50;border-radius:999px;background:#08111b;padding:7px 10px;font-size:9px}.challenge-official-note,.challenge-lb-status{width:min(1120px,100%);margin:7px auto 0;border:1px solid #225842;border-radius:10px;background:#071510;color:#7bf3ad;padding:7px 10px;font-size:9px;font-weight:900}.challenge-lb-status{border-color:#2a3c52;background:#08111b;color:#b7c6d7}.challenge-lb-status.error{border-color:#81313a;color:#ff7d85}.challenge-lb-card{width:min(1120px,100%);margin:8px auto 0;border:1px solid #2b3a4b;border-radius:17px;background:linear-gradient(180deg,#0b121c,#05080d);padding:10px}.challenge-lb-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 4px 10px;border-bottom:1px solid #243244}.challenge-lb-title b{display:block;color:#ff5960;font-size:12px;letter-spacing:.8px}.challenge-lb-title small{display:block;margin-top:2px;color:#8f9fb1;font-size:8px}.challenge-lb-title button{width:36px;height:36px;border-radius:50%;border:1px solid #37e7ff66;background:#071722;color:#37e7ff;font-size:18px}.challenge-lb-list{display:grid;gap:5px;padding-top:8px}.challenge-lb-row{width:100%;min-height:58px;border:1px solid #243345;border-radius:11px;background:#07101a;color:#fff;display:grid;grid-template-columns:42px minmax(150px,1fr) 76px minmax(130px,.8fr) 58px;gap:8px;align-items:center;text-align:left;padding:6px 8px}.challenge-lb-row>strong{font-size:18px;color:#ffb433;text-align:center}.challenge-lb-player{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center;min-width:0}.challenge-lb-player>img,.challenge-lb-player>i{width:42px;height:42px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#152132;font-style:normal;font-weight:1000}.challenge-lb-player span{min-width:0}.challenge-lb-player b,.challenge-lb-player small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.challenge-lb-player b{font-size:10px}.challenge-lb-player small{font-size:7px;color:#8797aa;margin-top:2px}.challenge-lb-row>em{font-style:normal;font-size:21px;color:#ff5960;font-weight:1000;text-align:right}.challenge-lb-row>em small{display:block;font-size:6px;color:#9facbb}.challenge-lb-meta{font-size:8px;color:#9baabc;white-space:normal}.challenge-lb-detail{font-size:8px;color:#37e7ff;font-weight:1000;text-align:right}.challenge-lb-empty{padding:30px;text-align:center;color:#91a0b2;font-weight:900;font-size:11px}.challenge-filter-overlay,.challenge-detail-overlay{position:fixed;inset:0;z-index:12040;background:#000d;backdrop-filter:blur(8px);display:grid;place-items:center;padding:12px}.challenge-filter-modal,.challenge-detail-modal{width:min(720px,96vw);max-height:90dvh;overflow:auto;border:1px solid #43546a;border-radius:18px;background:linear-gradient(180deg,#0e1723,#05080d);box-shadow:0 28px 80px #000;padding:12px}.challenge-filter-modal>header{display:grid;grid-template-columns:42px minmax(0,1fr) 36px;align-items:center;gap:9px;border-bottom:1px solid #273649;padding-bottom:9px}.filter-title-icon{width:40px;height:40px;border-radius:11px;border:1px solid #36eaff55;background:#071722;display:grid;place-items:center}.challenge-filter-modal header b{display:block;font-size:13px}.challenge-filter-modal header small{display:block;font-size:8px;color:#8e9bad;margin-top:2px}.challenge-filter-modal header>button,.challenge-detail-modal header>button{width:34px;height:34px;border-radius:50%;border:1px solid #506176;background:#0a121d;color:#fff;font-size:20px}.challenge-filter-modal section{margin-top:10px;padding:9px;border:1px solid #273648;border-radius:12px;background:#07101a}.challenge-filter-modal h3{margin:0 0 7px;font-size:9px;color:#ff5960;letter-spacing:.75px}.challenge-filter-modal p{margin:0;color:#9daabb;font-size:9px;line-height:1.4}.filter-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.filter-choice-grid.compact{grid-template-columns:repeat(auto-fit,minmax(58px,1fr))}.filter-choice-grid.teams{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.filter-choice-grid button{min-height:38px;border:1px solid #34455a;border-radius:9px;background:#0a131f;color:#c3cfdd;font-size:9px;font-weight:1000;padding:6px}.filter-choice-grid button.on{border-color:#ff4e56;background:linear-gradient(180deg,#4f1419,#16090c);color:#fff}.filter-choice-grid.teams button{text-align:left;display:flex;flex-direction:column;align-items:flex-start}.filter-choice-grid.teams span{font-size:6px;color:#66f0a0}.filter-choice-grid.teams b{font-size:9px;margin-top:2px}.filter-choice-grid.teams small{font-size:7px;color:#8f9daf}.challenge-filter-modal footer{position:sticky;bottom:0;padding-top:10px;background:linear-gradient(180deg,transparent,#05080d 28%)}.challenge-filter-modal footer button{width:100%;height:42px;border:1px solid #ff4e56;border-radius:11px;background:linear-gradient(180deg,#511319,#18090c);color:#fff;font-weight:1000}.challenge-detail-modal{width:min(760px,96vw)}.challenge-detail-modal>header{display:grid;grid-template-columns:56px minmax(0,1fr) auto 36px;gap:9px;align-items:center;border-bottom:1px solid #273649;padding-bottom:10px}.challenge-detail-avatar{width:54px;height:54px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#152132;font-weight:1000}.challenge-detail-avatar img{width:100%;height:100%;object-fit:cover}.challenge-detail-modal header div:nth-child(2){min-width:0}.challenge-detail-modal header div:nth-child(2)>small,.challenge-detail-modal header div:nth-child(2)>b,.challenge-detail-modal header div:nth-child(2)>em{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.challenge-detail-modal header div:nth-child(2)>small{font-size:7px;color:#ff5960;font-weight:1000}.challenge-detail-modal header div:nth-child(2)>b{font-size:13px}.challenge-detail-modal header div:nth-child(2)>em{font-size:7px;color:#95a4b6;font-style:normal}.challenge-detail-modal header>strong{font-size:28px;color:#ff5960;text-align:right}.challenge-detail-modal header>strong small{display:block;font-size:6px;color:#9ca9b8}.challenge-detail-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin-top:10px}.challenge-detail-kpis>div,.challenge-detail-modal section{border:1px solid #273648;border-radius:11px;background:#07101a;padding:8px}.challenge-detail-kpis span,.challenge-detail-modal h3{font-size:7px;color:#91a0b2;font-weight:1000}.challenge-detail-kpis b{display:block;margin-top:2px;font-size:17px}.challenge-detail-modal section{margin-top:8px}.challenge-detail-modal h3{margin:0 0 7px;color:#ff5960;font-size:9px}.challenge-detail-hits{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}.challenge-detail-hits span,.challenge-detail-visits span{border-radius:8px;background:#0d1824;padding:6px;text-align:center}.challenge-detail-hits small,.challenge-detail-visits small{display:block;font-size:7px;color:#8e9cad}.challenge-detail-hits b,.challenge-detail-visits b{display:block;margin-top:2px}.challenge-detail-positions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.challenge-detail-positions>div{border-radius:9px;background:#0d1824;padding:7px}.challenge-detail-positions span,.challenge-detail-positions small{display:block;font-size:7px;color:#8e9cad}.challenge-detail-positions b{display:block;font-size:16px;color:#ff6268;margin:2px 0}.challenge-detail-visits{display:flex;gap:4px;overflow-x:auto}.challenge-detail-visits span{min-width:48px}.challenge-detail-visits b{font-size:15px}
@media(max-width:620px){.challenge-lb-head{grid-template-columns:50px minmax(0,1fr) 66px}.challenge-filter-button{height:44px}.challenge-filter-button span{font-size:6px}.challenge-lb-row{grid-template-columns:34px minmax(0,1fr) 54px;grid-template-areas:'rank player score' 'meta meta detail';gap:5px}.challenge-lb-row>strong{grid-area:rank;font-size:14px}.challenge-lb-player{grid-area:player;grid-template-columns:34px minmax(0,1fr)}.challenge-lb-player>img,.challenge-lb-player>i{width:34px;height:34px}.challenge-lb-row>em{grid-area:score;font-size:18px}.challenge-lb-meta{grid-area:meta;padding-left:39px}.challenge-lb-detail{grid-area:detail}.challenge-detail-modal>header{grid-template-columns:46px minmax(0,1fr) auto 32px}.challenge-detail-avatar{width:44px;height:44px}.challenge-detail-hits{grid-template-columns:repeat(3,minmax(0,1fr))}.challenge-detail-positions{grid-template-columns:1fr}.filter-choice-grid.scope{grid-template-columns:1fr}.challenge-lb-summary span{font-size:8px}}
`;
