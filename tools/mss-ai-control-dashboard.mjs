#!/usr/bin/env node
/** Offline report generator. Defaults to a sibling directory OUTSIDE the Git working tree. */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeReport, renderDashboard } from './mss-ai-control-dashboard-core.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = key => { const i=args.indexOf(key);return i>=0 ? args[i+1] : undefined; };
const invalid = ['--from-json','--out'].some(key=>args.includes(key)&&!opt(key));
if (invalid) {console.error('Usage: node tools/mss-ai-control-dashboard.mjs [--sync-only] [--from-json fichier] [--out dossier-externe]');process.exit(2);}
const output=resolve(opt('--out') || join(dirname(root), 'MSS_AI_CONTROL_REPORTS'));
// Prevent accidental modifications in the repository, including nested output directories.
if (output === root || output.startsWith(root + sep)) {console.error('REFUS : les rapports doivent être enregistrés hors du dépôt Git.');process.exit(2);}
let raw;
try {
 if (opt('--from-json')) raw=JSON.parse(readFileSync(resolve(opt('--from-json')),'utf8'));
 else {
  const run=spawnSync(process.execPath,[join(root,'tools/mss-ai-control-preflight.mjs'),'--json',...(args.includes('--sync-only')?['--sync-only']:[])],{encoding:'utf8',cwd:root,timeout:180000,maxBuffer:4*1024*1024});
  if (run.error) throw run.error;
  if (!run.stdout.trim()) throw new Error(`Précontrôle sans rapport JSON : ${run.stderr.trim()||'sortie vide'}`);
  raw=JSON.parse(run.stdout);
 }
 const data=normalizeReport(raw,new Date().toISOString());
 mkdirSync(output,{recursive:true});
 writeFileSync(join(output,'latest.json'),JSON.stringify(data,null,2)+'\n',{mode:0o600});
 writeFileSync(join(output,'latest.html'),renderDashboard(data),{mode:0o600});
 console.log(`MSS AI CONTROL V3 — ${data.qa.status} | PC ${data.pc.status} | StackBlitz NON VERIFIE`);
 console.log(`Rapport HTML : ${join(output,'latest.html')}`);
 console.log(`Rapport JSON : ${join(output,'latest.json')}`);
 console.log('Aucun fichier du projet modifié. Aucun push GitHub.');
 process.exitCode = data.pc.status==='ALIGNE' && (data.qa.status==='PASS'||(args.includes('--sync-only')&&data.qa.status==='NON_EXECUTE')) ? 0 : 1;
} catch(err) { console.error('Rapport non généré :',err.message);process.exitCode=2; }
