#!/usr/bin/env node
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { prepareAgentContext, requestAiProposal, qualifyAgentProposal } from './mss-dev-agent-core-v15.mjs';
import {assertOutboundContext} from './mss-dev-send-guard-v23.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2), idx=args.indexOf('--files');
const paths=idx>=0?(args[idx+1]||'').split(',').filter(Boolean):undefined;
const description=args.filter((x,i)=>i!==idx&&i!==idx+1).join(' ').trim();
if(!description){console.error('Usage : node tools/mss-ai-control-dev-agent-v15.mjs "Décrire le problème (15 caractères minimum)" [--files src/fichier.ts,src/autre.ts]');process.exitCode=2;}
else {
 try {
  const context=prepareAgentContext(root,description,paths);
  console.log('Mission :',context.missionId,'| Fichiers :',context.files.map(f=>f.path).join(', '));
  if(process.env.MSS_AI_ALLOW_SEND!=='YES')throw Error('Envoi non autorisé : définir MSS_AI_ALLOW_SEND=YES après avoir vérifié les fichiers listés. Ils seront transmis au modèle IA.');
  assertOutboundContext(root,context);
  const proposal=await requestAiProposal(context,{apiKey:process.env.OPENAI_API_KEY,model:process.env.MSS_AI_MODEL||'gpt-5-mini'});
  const {result,changed,zip}=qualifyAgentProposal(root,proposal);
  const sibling=resolve(root,'..','MSS_AI_CONTROL_REPORTS','DEV_V15');mkdirSync(sibling,{recursive:true});
  const id=context.missionId;
  const report={schema:'mss.dev.agent.v15',missionId:id,createdAt:new Date().toISOString(),decision:result.decision,changed,files:result.checks,notice:'Contrôle de syntaxe seulement. Aucun typecheck global ni test de régression. Ne pas installer sans revue humaine.'};
  const reportPath=join(sibling,id+'.json');writeFileSync(reportPath,JSON.stringify(report,null,2));
  console.log('Décision :',result.decision,'| Modifications :',changed,'| Rapport :',reportPath);
  if(zip){const target=join(sibling,id+'-A_REVOIR.zip');writeFileSync(target,zip);console.log('ZIP NON INSTALLÉ :',target);}
  if(result.decision==='BLOQUE')process.exitCode=1;
 }catch(e){console.error('MSS DEV V15 :',e.message);process.exitCode=1;}
}
