import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const ultra = read('src/awena/AwenaUltraLexicon.ts');
const core = read('src/awena/AwenaCore.ts');
const speech = read('src/awena/AwenaSpeechRecognition.ts');
const commands = read('src/awena/AwenaVoiceCommands.ts');
const overlay = read('src/awena/components/AwenaOverlay.tsx');
const config = read('src/pages/X01ConfigV3.tsx');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const main = read('android/app/src/main/java/com/multisportsscoring/app/MainActivity.java');
const native = read('android/app/src/main/java/com/multisportsscoring/app/AwenaSpeechRecognitionPlugin.java');
const settings = read('src/awena/AwenaSettings.ts');
const pkg = JSON.parse(read('package.json'));

const entryCount = (ultra.match(/\bid:\s*"ultra-/g) || []).length;
assert.equal(entryCount, 466, `Ultra Lexicon doit contenir 466 entrées, trouvé ${entryCount}`);
for (const domain of ['darts','petanque','pingpong','football','babyfoot','molkky','dice','stats','app']) {
  assert.match(ultra, new RegExp(`domain:\\s*"${domain}"`), `domaine ${domain} manquant`);
}
assert.match(core, /answerAwenaUltraLexicon/);
assert.match(core, /awenaUltraLexiconCount/);

assert.match(commands, /AWENA_VOICE_TRANSCRIPT_EVENT/);
assert.match(commands, /x01-start/);
assert.match(commands, /awena\|avena/);
assert.match(speech, /registerPlugin<NativeSpeechPlugin>\("AwenaSpeechRecognition"\)/);
assert.match(speech, /preferOffline/);
assert.match(speech, /pause\(\)/);
assert.match(speech, /resume\(\)/);

assert.match(overlay, /parseAwenaVoiceIntent/);
assert.match(overlay, /voiceCommandsEnabled/);
assert.match(overlay, /awenaVoiceSetup:\s*true/);
assert.match(overlay, /publishAwenaVoiceTranscript/);
assert.match(overlay, /LOCAL V(?:8\.[6-9]|9(?:\.\d+)?).*VOICE X01/);

assert.match(config, /voiceSetupRequested/);
assert.match(config, /Très bien\. Je lance la configuration vocale de votre partie X01/);
for (const step of ['participant','players','start-score','in-mode','out-mode','format-unit','leg-format','serve','score-input','arcade','hits','game-voice','external','confirm']) {
  assert.match(config, new RegExp(`"${step}"`), `étape vocale ${step} manquante`);
}
assert.match(config, /handleStart\(\)/);
assert.match(config, /AWENA VOICE · CONFIGURATION X01/);

assert.match(settings, /voiceCommandsEnabled:\s*false/);
assert.match(settings, /preferOnDeviceRecognition:\s*true/);
assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
assert.match(manifest, /android\.speech\.RecognitionService/);
assert.match(main, /registerPlugin\(AwenaSpeechRecognitionPlugin\.class\)/);
assert.match(native, /SpeechRecognizer\.createOnDeviceSpeechRecognizer/);
assert.match(native, /SpeechRecognizer\.createSpeechRecognizer/);
assert.match(native, /@Permission\(alias = "microphone"/);
assert.equal(pkg.scripts['test:awena:v86'], 'node ./tools/test-awena-v86-voice-ultra.mjs && npm run test:awena:v85');

console.log(`AWENA V8.6 OK — ${entryCount} nouvelles entrées Ultra Lexicon + commandes vocales X01 + SpeechRecognizer Android.`);
