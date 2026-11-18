#!/usr/bin/env node
// Lanceur local MSS AI CONTROL V24 : aucun changement de fichiers du projet ou de Git.
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:http';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverScript = resolve(root, 'tools', 'mss-ai-control-dev-agent-ui-v15.mjs');
const url = 'http://127.0.0.1:4184/';
const noBrowser = process.argv.includes('--no-browser');
const timeoutMs = 16000;

function probe() {
  return new Promise((done) => {
    const req = get(url, { timeout: 1200, headers: { Host: '127.0.0.1:4184' } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (text.length < 20000) text += chunk; });
      res.on('end', () => done(res.statusCode === 200 && text.includes('Robot développeur V23')));
      res.on('error', () => done(false));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => done(false));
  });
}

function openBrowser() {
  if (noBrowser) return;
  if (process.platform === 'win32') {
    // cmd.exe START ouvre l'URL, sans exécuter de code téléchargé.
    const p = spawn('cmd.exe', ['/d', '/s', '/c', 'start "" "http://127.0.0.1:4184/"'], { stdio: 'ignore', windowsHide: true });
    p.on('error', err => console.error('Impossible d’ouvrir le navigateur :', err.message));
  } else {
    console.log('Ouvre cette adresse dans ton navigateur :', url);
  }
}

if (await probe()) {
  console.log('Console MSS AI CONTROL déjà en service :', url);
  openBrowser();
  process.exit(0);
}

console.log('Démarrage du robot développeur MSS AI CONTROL...');
if (!process.env.OPENAI_API_KEY) {
  console.log('INFO : OPENAI_API_KEY absente. La console peut s’ouvrir, mais les appels IA resteront désactivés.');
}
const child = spawn(process.execPath, [serverScript], { cwd: root, stdio: ['inherit', 'pipe', 'pipe'], env: process.env, windowsHide: false });
let exited = false;
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', chunk => process.stdout.write(chunk));
child.stderr.on('data', chunk => process.stderr.write(chunk));
child.on('error', e => { exited = true; console.error('ERREUR démarrage Node :', e.message); });
child.on('exit', (code, signal) => {
  exited = true;
  console.error(`Serveur arrêté (code ${code ?? 'inconnu'}, signal ${signal ?? 'aucun'}).`);
});

const start = Date.now();
let ready = false;
while (Date.now() - start < timeoutMs && !exited) {
  if (await probe()) { ready = true; break; }
  await new Promise(r => setTimeout(r, 250));
}
if (!ready) {
  console.error('ECHEC : la console ne répond pas sur 127.0.0.1:4184.');
  console.error('Lis les erreurs Node affichées ci-dessus. Vérifie que le port 4184 n’est pas utilisé.');
  if (!exited) child.kill();
  process.exitCode = 1;
} else {
  console.log('CONSOLE DISPONIBLE :', url);
  console.log('Garde cette fenêtre ouverte pendant l’utilisation. Ctrl+C pour arrêter.');
  openBrowser();
  await new Promise(resolveExit => child.once('exit', resolveExit));
}
