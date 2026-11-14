import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS,isMission,missionStatus,validateMission,formatIssueBody,parseAgent,mapIssue } from '../src/server/logic.js';
const form={title:'Corriger les statistiques X01',agent:'data-cloud',priority:'high',goal:'Réconcilier les statistiques avec History V4.',success:'Les mêmes parties sont affichées sur toutes les pages.',boundaries:'Ne pas modifier les données de production.'};
test('exactement douze métiers et un formulaire valide',()=>{assert.equal(AGENTS.length,12);const m=validateMission(form);assert.deepEqual(m,form);assert.match(formatIssueBody(m),/Aucun merge|Aucun merge/i);});
test('missions incomplètes ou domaines non autorisés refusés',()=>{
 assert.throws(()=>validateMission({...form,title:'X'}),/nom de la mission/i);
 assert.throws(()=>validateMission({...form,agent:'admin-superuser'}),/robot/i);
 assert.throws(()=>validateMission({...form,goal:'ok'}),/directive/i);
 assert.throws(()=>validateMission({...form,priority:'critical'}),/Priorité/i);
 assert.throws(()=>validateMission({...form,boundaries:'x'.repeat(1501)}),/trop longues/i);
 assert.throws(()=>validateMission({...form,title:'line\u0001'}),/interdits/i);
});
test('statut bloqué prioritaire, une PR ne devient pas une mission',()=>{
 const issue={number:8,state:'open',title:'[AGENT] Crash',labels:[{name:'mss:approved'},{name:'mss:blocked'}],body:'**Robot :** qa'};
 assert.equal(isMission(issue),true);assert.equal(missionStatus(issue),'BLOQUÉE');assert.equal(mapIssue(issue).agent,'qa');
 assert.equal(isMission({...issue,pull_request:{url:'x'}}),false);
 assert.equal(isMission({...issue,state:'closed'}),false);
 assert.equal(isMission({number:4,state:'open',title:'Autre projet',labels:[]}),false);
 assert.equal(parseAgent('**Robot :** root'),null);
});
