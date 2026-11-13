/**
 * Rapports Capital, Killer et Shanghai à partir des résultats réels de History V4.
 * Aucune modification des archives ni des règles de score.
 * Ne remplace jamais le moteur Canvas/PDF ni la mise en page déjà validée.
 */
import type {
  ChallengeExportReport, ChallengeExportPlayer, ChallengeExportMetric, ChallengeExportSection,
} from './challengeResultsExport';

const obj = (v: unknown): Record<string, any> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const arr = (v: unknown): any[] => Array.isArray(v) ? v : [];
const string = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return null;
  const value = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  return Number.isFinite(value) ? value : null;
};
const first = (...values: unknown[]) => values.find(v => v !== undefined && v !== null && v !== '');
const number = (...values: unknown[]): number | null => {
  for (const value of values) { const n = num(value); if (n !== null) return n; }
  return null;
};
const fmt = (n: number): string => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
const metric = (label: string, value: string | number): ChallengeExportMetric => ({label, value:String(value)});
const put = (items: ChallengeExportMetric[], label: string, value: unknown, suffix = '') => {
  const n = num(value);
  if (n !== null && !items.some(item=>item.label === label)) items.push(metric(label, fmt(n) + suffix));
};
const putText = (items: ChallengeExportMetric[], label: string, value: unknown) => {
  const s = string(value);
  if (s && !items.some(item=>item.label===label)) items.push(metric(label, s));
};
const personId = (row: any) => string(first(row?.id,row?.playerId,row?.profileId,row?.pid));
const personName = (row: any) => string(first(row?.name,row?.playerName,row?.displayName,row?.nickname));
const cleanName = (v: unknown) => string(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const blankPlayer = (row: any): ChallengeExportPlayer => ({
  name: personName(row) || 'Joueur', participantId:personId(row)||undefined,
  score:Number.NaN, accuracy:null, darts:null, bestStreak:null, avgVisit:null,
  metrics:[], visits:[], avatarUrl:string(row?.avatarDataUrl || row?.avatarUrl) || undefined,
});
const uniquePush = (metrics: ChallengeExportMetric[], additions: ChallengeExportMetric[]) => {
  for (const item of additions) {
    const index=metrics.findIndex(existing=>existing.label===item.label);
    if (index>=0) metrics[index]=item;
    else metrics.push(item);
  }
};
const section = (title:string,columns:string[],rows:string[][],note?:string):ChallengeExportSection =>
  ({title,columns,rows,...(note?{note}:{})});
const addSection = (report:ChallengeExportReport,added:ChallengeExportSection) => {
  report.details=report.details||[];
  if(added.rows.length) report.details.push(added);
};
const addConfig = (report:ChallengeExportReport,label:string,value:unknown) => {
  if(value===null||value===undefined||value===''||typeof value==='object')return;
  const readable=typeof value==='boolean'?(value?'OUI':'NON'):String(value);
  report.configSummary=report.configSummary||[];
  if(!report.configSummary.some(m=>m.label===label))report.configSummary.push(metric(label,readable));
  const params=report.details?.find(s=>s.title==='PARAMÈTRES DE LA PARTIE');
  if(params&&!params.rows.some(r=>r[0]===label))params.rows.push([label,readable]);
};
/** Never match a saved stat row from another explicitly identified profile. */
const matchRow=(p:ChallengeExportPlayer,rows:any[]):any|null=>{
  const id=String(p.participantId||'').trim();
  if(id){const matches=rows.filter(row=>personId(row)===id);if(matches.length===1)return matches[0];}
  const name=cleanName(p.name);
  if(!name)return null;
  const named=rows.filter(row=>cleanName(personName(row))===name &&(!id || !personId(row)));
  return named.length===1?named[0]:null;
};
const perPlayerMap=(p:ChallengeExportPlayer, maps:any[]):any|null=>{
  const id=String(p.participantId||'').trim();
  for (const map of maps){
    if(!map||typeof map!=='object'||Array.isArray(map))continue;
    if(id && Object.prototype.hasOwnProperty.call(map,id))return obj(map[id]);
    const matchingNames=Object.entries(map).filter(([key,row])=>
      cleanName(key)===cleanName(p.name) && (!id||!personId(row)));
    if(matchingNames.length===1)return obj(matchingNames[0]?.[1]);
  }
  return null;
};

function capitalReport(report:ChallengeExportReport,entry:any,payload:any,summary:any){
  const cfg=obj(entry?.config||payload?.config);
  const players=arr(first(summary?.players,summary?.perPlayer,payload?.stats?.players,payload?.players,entry?.players));
  // History may have retained player stats but no generic ranking.
  if(!report.players.length&&players.length)report.players=players.map(row=>{
    const p=blankPlayer(row);p.score=num(row?.finalCapital??row?.capital??row?.score)??Number.NaN;return p;
  });
  const visits=arr(first(payload?.visitHistory,payload?.visits,summary?.visits,payload?.events));
  const contractDefs=arr(first(summary?.contracts,payload?.summary?.contracts));
  const labels=new Map(contractDefs.map((c:any)=>[String(c?.id||''),string(c?.label||c?.id)]));
  const contractName=(id:unknown)=>labels.get(String(id||''))||String(id||'—').replace(/_/g,' ').toUpperCase();
  const audit=obj(first(summary?.capitalIntegrity,payload?.capitalIntegrity));
  const teams=arr(first(summary?.teams,payload?.stats?.teams,payload?.teams));
  const variant=obj(first(summary?.capitalVariant,payload?.summary?.capitalVariant));
  report.title='CAPITAL'+(string(variant.label)?' · '+string(variant.label):'');
  report.sportLabel='DARTS';
  addConfig(report,'VARIANTE',first(variant.label,cfg?.savedVariantName,cfg?.gridVariant));
  addConfig(report,'CAPITAL INITIAL',cfg?.startingCapital);
  addConfig(report,'PÉNALITÉ ÷2',cfg?.failDivideBy2);
  addConfig(report,'MODE PARTICIPANTS',first(cfg?.participantMode,summary?.participantMode));
  addConfig(report,'CONTRATS',first(summary?.contractsPlayed, contractDefs.length||undefined));
  if(audit.verified===false) addSection(report,section('CAPITAL · INTÉGRITÉ DU JOURNAL',
    ['CONTRÔLE','STATUT'],[['Journal de contrats','Écarts détectés dans l’archive']],
    'Les chiffres d’origine sont présentés sans recalcul ni correction automatique.'));
  const summaryRows:string[][]=[];
  for(const p of report.players){
    const saved=matchRow(p,players)||{};
    const own=String(p.participantId||'');
    const ownVisits=own?visits.filter(v=>String(v?.playerId||'')===own):[];
    const hasStats=Object.keys(saved).length>0;
    const final=number(saved?.finalCapital,saved?.capital,saved?.score,p.score);
    const positive=number(saved?.successfulContracts,saved?.successfulVisits);
    const failures=number(saved?.failedContracts,saved?.failedVisits);
    const gained=number(saved?.pointsWon,saved?.points);
    const penalties=number(saved?.capitalLost,saved?.penaltyLost);
    const m:ChallengeExportMetric[]=[];
    put(m,'CAPITAL FINAL',final);put(m,'CONTRATS RÉUSSIS',positive);
    put(m,'CONTRATS MANQUÉS',failures);put(m,'POINTS GAGNÉS',gained);
    put(m,'CAPITAL PERDU',penalties);
    put(m,'CAPITAL MAX',saved?.peakCapital);put(m,'MEILLEURE VOLÉE',saved?.bestVisit);
    put(m,'CONTRATS JOUÉS',saved?.contractsPlayed);put(m,'RÉUSSITE',saved?.successRate,'%');
    put(m,'FLÉCHETTES',saved?.dartsThrown);
    uniquePush(p.metrics,m);
    p.headlineMetrics=[...m.slice(0,4)];
    if(final!==null){p.score=final;p.scoreDisplay=fmt(final)+' CAPITAL';p.scoreSecondary='Capital final, pénalités comprises';}
    if (hasStats && p.darts===null) p.darts=num(saved?.dartsThrown);
    summaryRows.push([p.name,final===null?'—':fmt(final),positive===null?'—':fmt(positive),
      penalties===null?'—':fmt(penalties),gained===null?'—':fmt(gained)]);
    const contractStats=obj(saved?.contractStats);
    const contractRows=Object.entries(contractStats).map(([id,data])=>{
      const r=obj(data);
      return [contractName(id),String(r?.attempts??'—'),String(r?.successes??'—'),
        String(r?.failures??'—'),String(r?.pointsWon??'—'),String(r?.capitalLost??'—')];
    });
    addSection(report,section(p.name+' · CAPITAL · CONTRATS',
      ['CONTRAT','ESSAIS','RÉUSSITES','ÉCHECS','PTS GAGNÉS','PÉNALITÉS'],contractRows));
    if(ownVisits.length){
      addSection(report,section(p.name+' · CAPITAL · ÉVOLUTION DU MATCH',
        ['TOUR','CONTRAT','RÉUSSI','CAPITAL AVANT','GAIN/PERTES','CAPITAL APRÈS'],
        ownVisits.map((v,i)=>[
          String(num(v?.contractIndex)!==null?Number(v.contractIndex)+1:i+1),contractName(v?.contractId),
          v?.success===true?'OUI':v?.success===false?'NON':'—',
          String(v?.scoreBefore??'—'),String(v?.delta??'—'),String(v?.scoreAfter??'—')]),
        'Valeurs sauvegardées par le mode Capital ; aucune simulation des fléchettes.'));
      p.visits=ownVisits.map(v=>num(v?.rawVisitScore??v?.visitScore)).filter((x):x is number=>x!==null);
    }
  }
  addSection(report,section('CAPITAL · CLASSEMENT ET BILAN',
    ['JOUEUR','CAPITAL FINAL','CONTRATS OK','PÉNALITÉS','PTS GAGNÉS'],summaryRows,
    'Le capital final est distinct de la somme des points bruts.'));
  if((summary?.participantMode==='teams'||cfg?.participantMode==='teams')&&teams.length){
    const teamRows=teams.map(team=>[
      string(team?.name)||'Équipe',
      number(team?.finalCapital,team?.capital,team?.score)===null?'—':String(number(team?.finalCapital,team?.capital,team?.score)),
      number(team?.successfulContracts)===null?'—':String(team.successfulContracts),
      number(team?.capitalLost)===null?'—':String(team.capitalLost),
    ]);
    addSection(report,section('CAPITAL · RÉSULTAT DES ÉQUIPES',
      ['ÉQUIPE','CAPITAL FINAL','CONTRATS OK','CAPITAL PERDU'],teamRows,
      'Classement par équipe enregistré indépendamment du détail individuel.'));
    const winnerId=string(first(summary?.winnerTeamId,entry?.winnerTeamId));
    const winnerTeam=teams.find(t=>personId(t)===winnerId);
    if(winnerTeam) report.sportLabel='CAPITAL PAR ÉQUIPES';
  }
  report.highlight=[
    ...(report.players[0]?.headlineMetrics?.slice(0,2)||[]),
    metric('PARTICIPANTS',report.players.length),
    ...(audit.verified===true?[metric('CONTRÔLE','VÉRIFIÉ')]:[]),
  ];
  return report;
}

function killerReport(report:ChallengeExportReport,entry:any,payload:any,summary:any){
  const detailed=obj(first(summary?.detailedByPlayer,summary?.perPlayerMap,payload?.summary?.detailedByPlayer));
  const rank=arr(first(summary?.ranking,summary?.rankings,payload?.summary?.ranking));
  const cfg=obj(first(payload?.config,entry?.config));
  const all=arr(first(payload?.stats?.players,summary?.players,entry?.players));
  if(!report.players.length&&rank.length)report.players=rank.map(blankPlayer);
  addConfig(report,'VARIANTE',first(summary?.variantId,payload?.variantId));
  addConfig(report,'VIES INITIALES',first(summary?.livesStart,cfg?.lives));
  addConfig(report,'RÈGLE KILLER',first(summary?.becomeRule,cfg?.becomeRule));
  addConfig(report,'RÈGLE DÉGÂTS',first(summary?.damageRule,cfg?.damageRule));
  if(first(summary?.variantId,payload?.variantId)==='progressive')
    addConfig(report,'OBJECTIF PROGRESSIF',first(summary?.progressiveTarget,payload?.progressiveTarget));
  report.title=first(summary?.variantId,payload?.variantId)==='progressive'?'KILLER PROGRESSIF':'KILLER';
  const rows:string[][]=[];
  for(const p of report.players){
    const saved=perPlayerMap(p,[detailed,summary?.perPlayerMap]) ||
      matchRow(p,arr(summary?.perPlayer)) || matchRow(p,all) || matchRow(p,rank) || {};
    const kills=number(saved?.kills); const lives=number(saved?.lives);
    const taken=number(saved?.livesTaken);const lost=number(saved?.livesLost);
    const eliminated=typeof saved?.eliminated==='boolean'?saved.eliminated:null;
    const m:ChallengeExportMetric[]=[];
    put(m,'ÉLIMINATIONS',kills);put(m,'VIES RESTANTES',lives);
    put(m,'VIES PRISES',taken);put(m,'VIES PERDUES',lost);
    put(m,'FLÉCHETTES',first(saved?.totalThrows,saved?.dartsThrown,saved?.darts));
    put(m,'TOUCHES KILLER',first(saved?.killerHits,saved?.successfulHits));
    put(m,'AUTO-ÉLIMINATIONS',saved?.autoKills);
    put(m,'VIES VOLÉES',saved?.livesStolen);
    put(m,'VIES SOIGNÉES',saved?.livesHealed);
    put(m,'DÉSARMEMENTS',saved?.disarmsTriggered);
    put(m,'RÉSURRECTIONS',saved?.resurrectionsReceived);
    uniquePush(p.metrics,m);
    p.headlineMetrics=m.slice(0,4);
    p.score=Number.NaN;
    p.scoreDisplay=kills!==null?fmt(kills)+' ÉLIMINATION'+(kills===1?'':'S'):
      (eliminated===false?'EN JEU':eliminated===true?'ÉLIMINÉ':'RÉSULTAT —');
    p.scoreSecondary='Killer · aucune conversion artificielle en points';
    if(p.darts===null)p.darts=number(saved?.totalThrows,saved?.dartsThrown);
    rows.push([p.name,kills===null?'—':fmt(kills),lives===null?'—':fmt(lives),
      taken===null?'—':fmt(taken),eliminated===null?'—':eliminated?'OUI':'NON']);
    const hits=obj(first(saved?.hitsByNumber,saved?.hits_by_number));
    const byNumber=Object.entries(hits).filter(([,value])=>num(value)!==null).map(([sector,v])=>[sector,String(v)]);
    addSection(report,section(p.name+' · KILLER · TOUCHES PAR SECTEUR',
      ['SECTEUR','TOUCHES'],byNumber));
  }
  addSection(report,section('KILLER · BILAN DES JOUEURS',
    ['JOUEUR','ÉLIMINATIONS','VIES RESTANTES','VIES PRISES','ÉLIMINÉ'],rows));
  const firstPlayer=report.players[0];
  report.highlight=[metric('JOUEURS',report.players.length),
    ...(firstPlayer?.headlineMetrics?.slice(0,3)||[])];
  return report;
}

function shanghaiReport(report:ChallengeExportReport,entry:any,payload:any,summary:any){
  const savedScores=arr(first(summary?.scores,payload?.summary?.scores));
  const rawPlayers=arr(first(entry?.players,payload?.players,payload?.stats?.players));
  const stats=obj(first(payload?.statsShanghai,summary?.statsShanghai,payload?.summary?.statsShanghai));
  const hitsById=obj(first(stats?.hitsById,stats?.hitsCompact));
  const timelines=obj(stats?.scoreTimelineById);
  const winner=string(first(summary?.winnerId,payload?.summary?.winnerId,entry?.winnerId));
  const tie=summary?.isTie===true;
  // The match ranking is stored in summary.scores, while entry.players only
  // contains names and avatar images. Never treat their array indices as scores.
  if(savedScores.length){
    const ordered=[...savedScores].sort((a:any,b:any)=>{
      if(winner){const aw=personId(a)===winner, bw=personId(b)===winner;if(aw!==bw)return aw?-1:1;}
      return (number(b?.score)??-Infinity)-(number(a?.score)??-Infinity);
    });
    report.players=ordered.map((raw:any)=>{
      const id=personId(raw); const existing=report.players.find(p=>String(p.participantId||'')===id);
      const avatar=matchRow(existing||blankPlayer(raw),rawPlayers);
      const p=existing||blankPlayer(raw);
      p.name=personName(raw)||p.name;
      p.participantId=id||p.participantId;
      p.score=number(raw.score)??Number.NaN;
      p.scoreDisplay=Number.isFinite(p.score)?fmt(p.score)+' PTS':'RÉSULTAT —';
      if(!p.avatarUrl)p.avatarUrl=string(avatar?.avatarDataUrl||avatar?.avatarUrl);
      return p;
    });
  }
  report.title='SHANGHAI';
  addConfig(report,'MODE DE VICTOIRE',first(summary?.winRule,stats?.winRule));
  addConfig(report,'ORDRE CIBLES',summary?.targetOrderMode);
  addConfig(report,'TOURS MAX',first(summary?.maxRounds,stats?.maxRounds));
  const leading=report.players[0];
  report.highlight=[metric('PARTICIPANTS',report.players.length),
    ...(tie?[metric('RÉSULTAT','ÉGALITÉ')]:[]),
    ...(!tie&&leading&&Number.isFinite(leading.score)
      ?[metric('MEILLEUR SCORE',fmt(leading.score)+' PTS')]:[])];
  const overview:string[][]=[];
  for(const p of report.players){
    const id=String(p.participantId||'');
    const own=obj(hitsById[id]);
    const rows:string[][]=[];
    let S=0,D=0,T=0,M=0;
    for(const [sector,value] of Object.entries(own)){
      const counts=obj(value);
      const s=num(counts.S),d=num(counts.D),t=num(counts.T),miss=num(counts.MISS),points=num(counts.points);
      if(s!==null)S+=s;if(d!==null)D+=d;if(t!==null)T+=t;if(miss!==null)M+=miss;
      rows.push([sector,s===null?'—':fmt(s),d===null?'—':fmt(d),t===null?'—':fmt(t),
        miss===null?'—':fmt(miss),points===null?'—':fmt(points)]);
    }
    addSection(report,section(p.name+' · SHANGHAI · CIBLES',
      ['CIBLE','SIMPLE','DOUBLE','TRIPLE','MISS','POINTS'],rows,
      'Les résultats sont ceux du journal des touches enregistré.'));
    const m:ChallengeExportMetric[]=[];
    if(rows.length){put(m,'SIMPLES',S);put(m,'DOUBLES',D);put(m,'TRIPLES',T);put(m,'MISS',M);
      put(m,'FLÉCHETTES',S+D+T+M);}
    put(m,'POINTS',p.score);
    uniquePush(p.metrics,m);
    p.headlineMetrics=m.slice(0,4);
    const savedTimeline=arr(timelines[id]).map(num);
    if(savedTimeline.length>=2&&savedTimeline.every(v=>v!==null)){
      const totals=savedTimeline as number[];
      const changes=totals.slice(1).map((v,i)=>v-(totals[i]??v));
      addSection(report,section(p.name+' · SHANGHAI · PROGRESSION',
        ['TOUR','PTS DU TOUR','TOTAL CUMULÉ'],changes.map((value,i)=>[String(i+1),fmt(value),fmt(totals[i+1]??0)])));
      p.visits=changes;
    }
    overview.push([p.name,Number.isFinite(p.score)?fmt(p.score):'—',
      rows.length?String(S):'—',rows.length?String(D):'—',rows.length?String(T):'—']);
  }
  addSection(report,section('SHANGHAI · RÉPARTITION DES TOUCHES',
    ['JOUEUR','POINTS','SIMPLES','DOUBLES','TRIPLES'],overview));
  return report;
}

/** Mode-specific adapter. All other modes and their approved layouts are untouched. */
export function enrichHistoricalDartsModeReport(
  report:ChallengeExportReport,entry:any,mode:string,
):ChallengeExportReport {
  const normalized=String(mode||'').toLowerCase().replace(/[-\s]+/g,'_');
  const payload=obj(entry?.payload||entry?.decoded);
  const summary=obj(entry?.summary||payload?.summary);
  if(normalized==='capital'||normalized.startsWith('capital_'))return capitalReport(report,entry,payload,summary);
  if(normalized==='killer'||normalized.startsWith('killer_'))return killerReport(report,entry,payload,summary);
  if(normalized==='shanghai'||normalized.startsWith('shanghai_'))return shanghaiReport(report,entry,payload,summary);
  return report;
}
