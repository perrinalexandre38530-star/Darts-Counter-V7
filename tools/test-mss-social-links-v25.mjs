#!/usr/bin/env node
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const p=(file)=>resolve(root,file);
const read=(file)=>readFileSync(p(file),'utf8');
const x='https://x.com/multisportsscor';
const youtube='https://www.youtube.com/@MultisportsScoring';
const langs=['ar','cs','da','de','en','es','fr','hi','hr','is','it','ja','nl','no','pl','pt','ro','ru','sr','sv','tr','zh'];
const registry=JSON.parse(read('tools/mss-social-content/verified-social-accounts-v25.json'));
if(registry.accounts.filter(a=>a.status==='verified_owned').length!==2)throw new Error('Only 2 accounts may be verified');
const source=read('src/pages/PublicLandingPage.tsx');
if(!source.includes('aria-label="X (Twitter) officiel MULTISPORTS SCORING"')||!source.includes('aria-label="YouTube officiel MULTISPORTS SCORING"'))throw new Error('Landing links missing');
const gen=read('tools/build-seo-public-pages.mjs');
if(!gen.includes(x)||!gen.includes(youtube))throw new Error('Générateur SEO non synchronisé');
const seo=JSON.parse(read('public/seo/entity.json'));
if(!(seo.sameAs.includes(x)&&seo.sameAs.includes(youtube)))throw new Error('SEO entity missing social links');
function readGraph(file){const html=read(file);const match=html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);if(!match)throw new Error('JSON-LD absent : '+file);return JSON.parse(match[1]);}
for(const file of ['index.html', ...langs.map(lang=>`public/${lang}/index.html`)]){
 const graph=readGraph(file);const list=graph['@graph']||[];
 const app=list.find(n=>n['@type']?.includes?.('SoftwareApplication')||n['@id']==='https://multisports-scoring.pages.dev/#app');
 if(!app || !app.sameAs?.includes(x)||!app.sameAs?.includes(youtube))throw new Error('URLs sociales manquantes : '+file);
}
const official=registry.accounts.filter(a=>a.status==='verified_owned').map(a=>a.url);
for(const link of [x,youtube])if(!official.includes(link))throw new Error('Official URL not in registry');
for(const name of registry.assets_existing_in_v25)if(!existsSync(p(name)))throw new Error('Asset required: '+name);
for(const old of ['https://www.instagram.com/multisportsscoring/','https://www.threads.com/@multisportsscoring']){
 if(source.includes(old)||seo.sameAs.includes(old))throw new Error('Unverified social link accidentally published: '+old);
}
console.log(`OK MSS Social SEO V25 : ${langs.length} langues, 2 comptes officiels, aucune page non vérifiée publiée.`);
