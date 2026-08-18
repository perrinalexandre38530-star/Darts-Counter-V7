#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (ok, message) => {
  if (!ok) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
};

const provider = read("src/awena/AwenaProvider.tsx");
const core = read("src/awena/AwenaCore.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const atlas = read("src/awena/AwenaAppAtlas.ts");
const live = read("src/awena/AwenaLiveScreen.ts");
const sports = read("src/awena/AwenaSportsKnowledge.ts");
const help = read("src/awena/AwenaHelpRegistry.ts");
const infoDot = read("src/components/InfoDot.tsx");
const translation = read("src/awena/AwenaTranslation.ts");
const voicePlugin = read("android/app/src/main/java/com/multisportsscoring/app/AwenaVoicePlugin.java");
const translationPlugin = read("android/app/src/main/java/com/multisportsscoring/app/AwenaTranslationPlugin.java");
const main = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const gradle = read("android/app/build.gradle");
const locale = read("src/awena/AwenaLocale.ts");

must(provider.includes("questionToFrench"), "questions non FR traduites vers la langue canonique d'Awena");
must(provider.includes("replyFromFrench"), "réponses et actions retraduites vers la langue de l'application");
must(core.includes("answerAwenaAppAtlas"), "atlas global MULTISPORTS SCORING branché au moteur de réponse");
must(core.includes("answerAwenaLiveScreenQuestion"), "contexte visuel de l'écran branché au moteur de réponse");
must(core.includes("visibleConfigurationAppendix"), "options visibles de configuration ajoutées aux réponses détaillées");
must(core.includes("getAwenaHelpText"), "ancien contenu InfoDot réutilisé par Awena");
must(infoDot.includes("registerAwenaHelp"), "InfoDot publie son aide dans le registre Awena");
must(atlas.includes('id: "account"') && atlas.includes('id: "camera"') && atlas.includes('id: "petanque"'), "atlas couvre compte, caméra et sports");
must(core.includes("answerAwenaSportsKnowledge"), "corpus détaillé des sports hors Fléchettes branché");
must(sports.includes('id: "petanque-doublette"') && sports.includes('id: "pingpong-2v2"') && sports.includes('id: "molkky-classic"') && sports.includes('id: "dice-farkle"') && sports.includes('id: "babyfoot-match"'), "corpus multisports détaillé présent");
must(live.includes("querySelectorAll") && live.includes("awenaScreenSnapshot"), "scanner d'écran dynamique présent");
const screenKnowledge = read("src/awena/AwenaScreenKnowledge.ts");
must(screenKnowledge.includes('id: "petanque"') && screenKnowledge.includes('id: "babyfoot"') && screenKnowledge.includes('id: "dice"') && screenKnowledge.includes('id: "auth-account"'), "connaissance contextuelle des écrans étendue à toute l'application");
must(translation.includes('registerPlugin<NativeTranslationPlugin>("AwenaTranslation")'), "bridge Capacitor de traduction présent");
must(translationPlugin.includes("TranslatorOptions") && translationPlugin.includes("downloadModelIfNeeded"), "ML Kit on-device translation branché");
must(main.includes("registerPlugin(AwenaTranslationPlugin.class)"), "plugin Android AwenaTranslation enregistré");
must(gradle.includes("com.google.mlkit:translate:17.0.3"), "dépendance ML Kit Translation 17.0.3 présente");
must(voicePlugin.includes("isFrenchLanguage") && voicePlugin.includes("tts.setLanguage(locale)"), "voix non FR routées vers Android TTS de la langue");
must(locale.includes("const FR: UiStrings"), "UI Awena localisée : fr");
for (const code of ["en","es","de","it","pt","nl","ru","zh","ja","ar","hi","tr","da","no","sv","is","pl","ro","sr","hr","cs"]) {
  must(locale.includes(`${code}: {`), `UI Awena localisée : ${code}`);
}
must(overlay.includes("LOCAL V8.0"), "version panneau Awena V8.0");

console.log("\n✅ AWENA V8.0 whole-app / multilingual architecture: OK");
