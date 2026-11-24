#!/usr/bin/env node
// MSS AI CONTROL V25 - démarrage supervisé et journal local, aucune modification Git.
import { spawn } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:http';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = resolve(root, 'tools', 'mss-ai-control-dev-agent-ui-v15.mjs');
const reportDir = resolve(root, '..', 'MSS_AI_CONTROL_REPORTS');
mkdirSync(reportDir, { recursive: true });
const logfile = join(reportDir, 'demarrage-agent-v25.log');
const url = 'http://127.0.0.1:4184/';
const quiet = process.argv.includes('--no-browser');
const now = () => new Date().toISOString();
function log(msg) {
  const line = `[${now()}] ${msg}`;
  console.log(line);
  try { appendFileSync(logfile, line+'\n', 'utf8'); } catch (err) { console.error('Journal indisponible :',err.message); }
}
// A versioned page title is not a health check. Accept only our stable protocol.
function probe() {
  return new Promise(done => {
    let finished = false;
    const complete = v => { if (!finished) { finished=true; done(v); } };
    const req = get(new URL('api/health',url),{timeout:1200},res=>{
      let content='';
      res.setEncoding('utf8');
      res.on('data',d=>{if(content.length<4096)content+=d;});
      res.on('end',()=>{
        try {
          const data=JSON.parse(content);
          if(res.statusCode===200 && data.service==='mss-ai-control-dev-agent' && data.protocol===1 && data.status==='ready')return complete('ready');
        } catch {}
        complete('occupied');
      });
      res.on('error',()=>complete('unavailable'));
    });
    req.on('timeout',()=>req.destroy());
    req.on('error',()=>complete('unavailable'));
  });
}
function browser() {
  if(quiet)return;
  if(process.platform==='win32') {
    const p=spawn('cmd.exe',['/d','/c','start','""',url],{stdio:'ignore',windowsHide:true});
    p.on('error',e=>log('Impossible d’ouvrir le navigateur : '+e.message));
  } else log('Ouvrir dans le navigateur : '+url);
}
log('--- Démarrage du robot développeur ---');
log('Node : '+process.version+' | Projet : '+root);
log('Journal : '+logfile);
const initial=await probe();
if(initial==='occupied') {
  log('ECHEC : port 4184 occupé par un serveur non reconnu ou une ancienne console MSS. Fermer uniquement cette console, puis relancer.');
  process.exitCode=1;
} else if(initial==='ready') {
  log('Port 4184 déjà actif et interface MSS reconnue.');
  browser();
} else {
  if (!process.env.OPENAI_API_KEY) log('INFO : clé API absente ; interface disponible sans appel IA.');
  const child = spawn(process.execPath,[script],{
    cwd:root,env:process.env,stdio:['inherit','pipe','pipe'],windowsHide:false
  });
  let exited=false, exitCode=null, exitSignal=null;
  child.on('error', e => {exited=true;log('ERREUR démarrage Node : '+e.stack);});
  const childExit=new Promise(done=>child.once('close',done));
  child.on('exit',(code,signal)=>{
    exited=true;exitCode=code;exitSignal=signal;
    log(`Processus serveur terminé : code=${code} signal=${signal}`);
  });
  for(const [name,stream] of [['STDOUT',child.stdout],['STDERR',child.stderr]]) {
    stream.setEncoding('utf8');
    stream.on('data',data=>{
      const s=String(data);
      if(name==='STDERR')process.stderr.write(s);else process.stdout.write(s);
      try { appendFileSync(logfile,`[${now()}] ${name} ${s}`, 'utf8'); }catch{}
    });
  }
  let ready=false;
  const deadline=Date.now()+30000;
  for(;Date.now()<deadline && !exited;){
    if(await probe()==='ready'){ready=true;break;}
    await new Promise(r=>setTimeout(r,300));
  }
  if(!ready) {
    log('ECHEC : aucune réponse HTTP reconnue sur 127.0.0.1:4184 après démarrage.');
    log('Vérifier le journal ci-dessus et le port 4184 ; ne pas réinstaller Git ni effectuer de reset.');
    if(!exited)child.kill();
    process.exitCode=1;
  } else {
    log('SERVEUR PRET : '+url);
    browser();
    // Reste actif tant que le serveur écoute et signale tout arrêt ultérieur.
    await childExit;
    log('ALERTE : console arrêtée après ouverture du navigateur.');
    if(exitCode!==0)process.exitCode=1;
  }
}
