import fs from 'node:fs';
const mod = fs.readFileSync('src/pages/running/RunningModule.tsx','utf8');
const types = fs.readFileSync('src/activity/activityTypes.ts','utf8');
const media = fs.readFileSync('src/activity/runningActivityMedia.ts','utf8');
const css = fs.readFileSync('src/pages/running/runningResponsive.css','utf8');
const checks = [
  ['activity visibility persisted', types.includes('visibility?: "private" | "public"')],
  ['activity photos persisted', types.includes('photos?: ActivityPhoto[]')],
  ['photo compressor', media.includes('compressRunningActivityPhoto') && media.includes('canvas.toDataURL("image/jpeg"')],
  ['8 photo limit', media.includes('const MAX_PHOTOS = 8')],
  ['editable activity title', mod.includes('placeholder={pickLegacyLocalizedText(lang, "Ex. Sortie du lac')],
  ['private/public selector', mod.includes('visibility: "private"') && mod.includes('visibility: "public"')],
  ['activity gallery', mod.includes('running-activity-gallery') && mod.includes('setActivityPhotoViewerId')],
  ['add activity to route library', mod.includes('toggleSelectedRouteLibrary') && mod.includes('AJOUTER À MES PARCOURS')],
  ['new runs default private', mod.includes('visibility: "private", shoeId:')],
  ['gallery responsive', css.includes('.running-activity-gallery') && css.includes('@media (max-width: 420px)')],
];
let ok=0;
for (const [name, pass] of checks) { console.log(`${pass?'OK  ':'FAIL'} ${name}`); if(pass) ok++; }
console.log(`\n${ok}/${checks.length} RUNNING ACTIVITY LIBRARY STAGE 3 V62 checks passed`);
if(ok!==checks.length) process.exit(1);
