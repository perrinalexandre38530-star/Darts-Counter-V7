import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(condition, message) { if (!condition) throw new Error(message); }

const app = read('src/App.tsx');
const info = read('src/components/InfoDot.tsx');
const overlay = read('src/awena/components/AwenaOverlay.tsx');
const provider = read('src/awena/AwenaProvider.tsx');
const catalog = read('src/awena/AwenaVoiceCatalog.ts');
const profile = read('src/awena/AwenaVoiceProfile.ts');

must(app.includes('inGame={HIDE_BOTTOM_NAV_TABS.has(tab)'), 'App must pass gameplay context to AwenaOverlay');
must(info.includes('awenaTakesOver'), 'InfoDot must hand over to Awena in gameplay');
must(info.includes('awena.openPanel()'), 'Awena game dot must open the Awena panel');
must(overlay.includes('{!inGame && <button'), 'Floating Awena FAB must be hidden during gameplay');
must(overlay.includes('top: 78'), 'Awena gameplay panel must open from a safe top position');
must(provider.includes('panelOpen'), 'Awena panel state must be centralized in provider');
must(catalog.includes('perfect180'), 'Voice catalog must include gameplay lines');
must(catalog.includes('firefighter'), 'Voice catalog must include Firefighter lines');
must(catalog.includes('x01'), 'Voice catalog must include X01 lines');
must(profile.includes('voice: "estelle"'), 'Estelle must be the targeted official build voice');

console.log('AWENA V3 dock + Estelle catalog integration: OK');
