#!/usr/bin/env node
/** MSS AI CONTROL / Sentinelle main — audit strictement en lecture seule. */
import { execFileSync } from 'node:child_process';
import { assessMain } from './mss-main-guard-core.mjs';

const json = process.argv.includes('--json');
const offline = process.argv.includes('--offline');
const command = (args) => execFileSync('git', args, { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const safe = (args) => { try { return command(args); } catch { return null; } };
let branch = safe(['symbolic-ref', '--short', 'HEAD']);
let localSha = safe(['rev-parse', 'HEAD']);
const status = safe(['status', '--porcelain=v1', '--untracked-files=normal']);
const trackingSha = safe(['rev-parse', 'refs/remotes/origin/main']);
let remoteSha = null;
if (!offline) {
  const line = safe(['ls-remote', 'origin', 'refs/heads/main']);
  if (line) remoteSha = line.split(/\s+/)[0];
}
const verdict = assessMain({ branch, localSha, remoteSha, dirty: status === null || status.length > 0, trackingSha, trackingKnown: Boolean(trackingSha), remoteChecked: !offline });
if (status === null) verdict.errors.push('git status inaccessible (Git simplifié ou dépôt indisponible).');
if (offline) verdict.warnings.push('Mode hors ligne : impossible de certifier l’alignement GitHub.');
verdict.ok = verdict.errors.length === 0;
if (json) console.log(JSON.stringify(verdict, null, 2));
else {
  console.log(`MSS AI CONTROL — SENTINELLE MAIN : ${verdict.ok ? 'OK' : 'BLOQUÉ'}`);
  console.log(`Branche : ${branch || '?'} | Local : ${localSha?.slice(0, 12) || '?'} | GitHub : ${remoteSha?.slice(0, 12) || '?'}`);
  for (const e of verdict.errors) console.error(`ERREUR : ${e}`);
  for (const w of verdict.warnings) console.warn(`AVERTISSEMENT : ${w}`);
  if (!verdict.ok) console.log('Aucune modification ni commande git push/reset/merge n’a été exécutée.');
}
process.exitCode = verdict.ok ? 0 : 1;
