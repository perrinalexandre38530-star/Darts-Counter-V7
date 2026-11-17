import {createRequire} from 'node:module';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {existsSync} from 'node:fs';

const MAX_DIAGNOSTICS=12;
function safePath(base,p){const full=resolve(base,p);if(full!==base&&!full.startsWith(base+sep))throw Error('Chemin hors projet');return full;}
export function typecheckOverlay(root,changed,{typescriptModule}={}) {
 const base=resolve(root);
 const tsconfig=join(base,'tsconfig.json');
 if(!existsSync(tsconfig))return {id:'typecheck-global',status:'NON_EXECUTE',detail:'tsconfig.json absent',baselineErrors:null,patchedErrors:null,introducedErrors:null};
 let ts=typescriptModule;
 if(!ts){
  try{ts=createRequire(join(base,'package.json'))('typescript');}
  catch{return {id:'typecheck-global',status:'NON_EXECUTE',detail:'TypeScript non installé dans node_modules du projet',baselineErrors:null,patchedErrors:null,introducedErrors:null};}
 }
 try{
  const config=ts.readConfigFile(tsconfig,ts.sys.readFile);
  if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,' '));
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,base, {noEmit:true,incremental:false,tsBuildInfoFile:undefined},tsconfig);
  if(parsed.errors.length)throw Error('tsconfig invalide : '+ts.flattenDiagnosticMessageText(parsed.errors[0].messageText,' '));
  const overlay=new Map(changed.map(f=>[safePath(base,f.path),f.content]));
  function check(map){
   const host=ts.createCompilerHost(parsed.options);
   const originalRead=host.readFile.bind(host), originalExists=host.fileExists.bind(host);
   host.readFile=p=>map.has(resolve(p))?map.get(resolve(p)):originalRead(p);
   host.fileExists=p=>map.has(resolve(p))||originalExists(p);
   const program=ts.createProgram({rootNames:parsed.fileNames,options:parsed.options,host,projectReferences:parsed.projectReferences});
   return ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({
    key:`${d.code}|${d.file?relative(base,d.file.fileName):'<config>'}|${ts.flattenDiagnosticMessageText(d.messageText,' ')}`,
    code:d.code,
    path:d.file?relative(base,d.file.fileName):'<config>',
    message:ts.flattenDiagnosticMessageText(d.messageText,' ').slice(0,280)
   }));
  }
  const baseline=check(new Map()),patched=check(overlay);
  const available=new Map();for(const d of baseline)available.set(d.key,(available.get(d.key)||0)+1);
  const introduced=[];for(const d of patched){const n=available.get(d.key)||0;if(n)available.set(d.key,n-1);else introduced.push(d);}
  const status=introduced.length?'FAIL':baseline.length?'BASELINE_ERRORS':'PASS';
  return {id:'typecheck-global',status,baselineErrors:baseline.length,patchedErrors:patched.length,introducedErrors:introduced.length,diagnostics:introduced.slice(0,MAX_DIAGNOSTICS),detail:status==='FAIL'?`${introduced.length} nouvelle(s) erreur(s) TypeScript`:(status==='BASELINE_ERRORS'?`${baseline.length} erreur(s) déjà présentes dans la version de départ`:'TypeScript : aucune erreur')};
 }catch(e){return {id:'typecheck-global',status:'NON_EXECUTE',detail:'Erreur du contrôle TypeScript : '+String(e.message||e).slice(0,250),baselineErrors:null,patchedErrors:null,introducedErrors:null};}
}
