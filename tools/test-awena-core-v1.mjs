import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const app = read('src/App.tsx');
const settings = read('src/pages/Settings.tsx');
const bots = read('src/lib/bots.ts');
const main = read('android/app/src/main/java/com/multisportsscoring/app/MainActivity.java');
const plugin = read('android/app/src/main/java/com/multisportsscoring/app/AwenaVoicePlugin.java');

assert(app.includes('<AwenaProvider>'), 'AwenaProvider absent de AppRoot');
assert(app.includes('<AwenaOverlay'), 'AwenaOverlay absent du shell global');
assert(settings.includes('AwenaSettingsSection'), 'Réglages Awena absents');
assert(settings.includes('setTab("awena")'), 'Entrée menu Awena absente');
assert(bots.includes('getOfficialBots'), 'Bots officiels non injectés');
assert(bots.includes('isOfficialBotId'), 'Protection bot officiel absente');
assert(main.includes('registerPlugin(AwenaVoicePlugin.class)'), 'Plugin Android Awena non enregistré');
for (const method of ['speak', 'stop', 'getStatus', 'getVoices', 'setVoice']) {
  assert(plugin.includes(`void ${method}(`), `Méthode Android ${method} absente`);
}
for (const asset of ['public/awena/awena-avatar.webp', 'public/awena/awena-bot-medallion.webp', 'public/awena/awena-presenter.webp']) {
  assert(fs.existsSync(path.join(root, asset)), `Asset absent: ${asset}`);
}
console.log('AWENA CORE V1 integration: OK');
