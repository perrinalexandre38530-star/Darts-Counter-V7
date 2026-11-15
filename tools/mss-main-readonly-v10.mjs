#!/usr/bin/env node
// MSS AI CONTROL: no mutation of Git state.
import {execFileSync} from 'node:child_process';
function git(...args){return execFileSync('git',args,{encoding:'utf8',timeout:15000,windowsHide:true}).trim()}
try{
 const branch=git('branch','--show-current');
 if(branch!=='main')throw Error('Branche différente de main : '+branch);
 const dirty=git('status','--porcelain');if(dirty)throw Error('Fichiers locaux modifiés : vérifier git status');
 const local=git('rev-parse','HEAD');
 const remote=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];
 if(!/^[a-f0-9]{40}$/.test(remote))throw Error('Référence origin/main distante indisponible');
 if(local!==remote)throw Error('MAIN désynchronisé : local='+local.slice(0,12)+' GitHub='+remote.slice(0,12));
 console.log('PASS MAIN : branche=main commit='+local.slice(0,12)+' arbre propre');
}catch(e){console.error('FAIL MAIN : '+e.message);process.exitCode=1}
