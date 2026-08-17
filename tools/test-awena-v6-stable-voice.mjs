import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const engine = read('android/app/src/main/java/com/multisportsscoring/app/AwenaPocketTtsEngine.java');
const manager = read('android/app/src/main/java/com/multisportsscoring/app/AwenaNeuralModelManager.java');
const plugin = read('android/app/src/main/java/com/multisportsscoring/app/AwenaVoicePlugin.java');
const appGradle = read('android/app/build.gradle');
const rootGradle = read('android/build.gradle');
const settings = read('src/awena/components/AwenaSettingsSection.tsx');

const must = (condition, message) => { if (!condition) throw new Error(message); };
must(engine.includes('com.k2fsa.sherpa.onnx.OfflineTts'), 'Awena V6 must use sherpa OfflineTts.');
must(engine.includes('AudioTrack.MODE_STREAM'), 'Awena V6.4 must use media-stream playback for the already-generated full audio buffer.');
must(!engine.includes('OrtSession') && !engine.includes('EOS_THRESHOLD'), 'Experimental PocketTTS generation code must be gone.');
must(manager.includes('vits-piper-fr_FR-siwis-medium.tar.bz2'), 'Stable French Piper model pack missing.');
must(manager.includes('piper_siwis_fr'), 'Stable pack folder missing.');
must(appGradle.includes('com.github.k2-fsa:sherpa-onnx:v1.13.5'), 'sherpa Android dependency v1.13.5 missing.');
must(appGradle.includes('exclude group: "com.github.k2-fsa.sherpa-onnx", module: "sherpa-onnx-jvm"'), 'sherpa JVM duplicate exclusion missing.');
must(!appGradle.includes('onnxruntime-android:1.27.0'), 'Direct ORT dependency must be removed to avoid runtime collision.');
must(rootGradle.includes('https://jitpack.io'), 'JitPack repository missing.');
must(plugin.includes('sherpa-onnx · VITS/Piper'), 'Plugin status must expose the real engine.');
must(settings.includes('Tester Awena') && settings.includes('VITS/Piper FR'), 'Settings must identify the stable engine.');
console.log('AWENA V6 stable voice architecture: OK');
