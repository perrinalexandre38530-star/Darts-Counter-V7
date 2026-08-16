import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const knowledge = read("src/awena/AwenaKnowledge.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const types = read("src/awena/awena.types.ts");
const voiceTs = read("src/awena/AwenaVoice.ts");
const settings = read("src/awena/components/AwenaSettingsSection.tsx");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/AwenaVoicePlugin.java");
const engine = read("android/app/src/main/java/com/multisportsscoring/app/AwenaPocketTtsEngine.java");
const manager = read("android/app/src/main/java/com/multisportsscoring/app/AwenaNeuralModelManager.java");
const gradle = read("android/app/build.gradle");

const requiredTickers = [
  "ticker_killer_2.png",
  "ticker_darts_firefighter.png",
  "ticker_darts_poker.png",
  "ticker_attrape_moi.png",
];

for (const ticker of requiredTickers) {
  if (!knowledge.includes(ticker)) throw new Error(`Ticker Awena absent: ${ticker}`);
}

if (!knowledge.includes("currentScreenMode?.id === mode.id")) {
  throw new Error("La suppression de l'action lorsque le mode est déjà ouvert est absente.");
}
if (!overlay.includes("action.kind === \"navigate\" && action.imageSrc")) {
  throw new Error("Les actions ticker-image ne sont pas rendues dans AwenaOverlay.");
}
if (!types.includes('"awena-neural"')) {
  throw new Error("Le type de moteur awena-neural n'est pas déclaré.");
}
if (!voiceTs.includes("installNeuralVoice") || !voiceTs.includes("removeNeuralVoice")) {
  throw new Error("Le bridge TypeScript d'installation Estelle est incomplet.");
}
if (!plugin.includes("AwenaPocketTtsEngine") || !plugin.includes("installNeuralVoice")) {
  throw new Error("Le plugin Android n'utilise pas le moteur PocketTTS Awena.");
}
if (!plugin.includes("Never fall back silently") && !plugin.includes("NEVER silently")) {
  throw new Error("La protection anti-fallback silencieux Estelle manque.");
}
if (!engine.includes("flow_lm_main_int8.onnx") || !engine.includes("estelle.wav")) {
  throw new Error("Le moteur neural ne charge pas le bundle PocketTTS/Estelle.");
}
if (!manager.includes("lookbe/pocket-tts-onnx") || !manager.includes("developpeuse-3.wav")) {
  throw new Error("Le gestionnaire du pack neural ne cible pas le modèle FR + Estelle.");
}
if (!gradle.includes("com.microsoft.onnxruntime:onnxruntime-android:1.27.0")) {
  throw new Error("La dépendance ONNX Runtime Android manque.");
}
if (!settings.includes("Installer Awena · Estelle") || !settings.includes("PocketTTS FR · Estelle")) {
  throw new Error("L'UI d'installation Estelle est absente.");
}

console.log("AWENA V4 Estelle + ticker actions: OK");
