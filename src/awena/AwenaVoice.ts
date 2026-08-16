import { Capacitor, registerPlugin } from "@capacitor/core";
import type { AwenaSettings, AwenaVoiceOption, AwenaVoiceStatus } from "./awena.types";

type NativeVoicePlugin = {
  speak(options: { text: string; language?: string; voiceName?: string | null; rate?: number; pitch?: number; volume?: number }): Promise<{ ok: boolean; voiceName?: string | null }>;
  stop(): Promise<{ ok: boolean }>;
  getStatus(): Promise<AwenaVoiceStatus>;
  getVoices(options?: { language?: string }): Promise<{ voices: AwenaVoiceOption[] }>;
  setVoice(options: { voiceName: string | null }): Promise<{ ok: boolean; voiceName?: string | null }>;
  installNeuralVoice(): Promise<AwenaVoiceStatus & { ok?: boolean }>;
  removeNeuralVoice(): Promise<AwenaVoiceStatus & { ok?: boolean }>;
};

const NativeAwenaVoice = registerPlugin<NativeVoicePlugin>("AwenaVoice");

function localeForLang(lang: string | undefined): string {
  const value = String(lang || "fr").toLowerCase();
  if (value.startsWith("fr")) return "fr-FR";
  if (value.startsWith("en")) return "en-GB";
  if (value.startsWith("es")) return "es-ES";
  if (value.startsWith("de")) return "de-DE";
  if (value.startsWith("it")) return "it-IT";
  if (value.startsWith("pt")) return "pt-PT";
  if (value.startsWith("nl")) return "nl-NL";
  return value.includes("-") ? value : `${value}-${value.toUpperCase()}`;
}

function webVoiceFor(language: string, voiceName?: string | null): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voiceName) {
    const exact = voices.find((voice) => voice.name === voiceName);
    if (exact) return exact;
  }
  const wanted = language.toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase() === wanted)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(wanted.split("-")[0]))
    || null;
}

export class AwenaVoiceEngine {
  private async synthesize(text: string, settings: AwenaSettings, lang = "fr"): Promise<boolean> {
    const clean = String(text || "").trim();
    if (!clean) return false;
    const language = localeForLang(lang);

    // Un seul canal vocal à la fois : si X01/WebSpeech parlait, on le coupe avant Awena.
    try { window.speechSynthesis?.cancel(); } catch {}

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try {
        const result = await NativeAwenaVoice.speak({
          text: clean,
          language,
          voiceName: settings.voiceName,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume,
        });
        return !!result?.ok;
      } catch (error) {
        // Important: on Android we do NOT fall back to WebSpeech. Once the neural pack is installed,
        // a neural failure must be visible instead of silently speaking with the old system voice.
        console.warn("[AwenaVoice] Android voice engine error", error);
        return false;
      }
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = language;
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        const voice = webVoiceFor(language, settings.voiceName);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (error) {
        console.warn("[AwenaVoice] Web speech unavailable", error);
      }
    }
    return false;
  }

  async speak(text: string, settings: AwenaSettings, lang = "fr"): Promise<boolean> {
    if (!settings.enabled || !settings.voiceEnabled) return false;
    return this.synthesize(text, settings, lang);
  }

  // Utilisé lorsqu'un mode choisit explicitement "Awena" comme voix d'annonce.
  // On reprend SON timbre/réglage, sans dépendre du niveau d'intervention de l'assistante.
  async speakNarration(text: string, settings: AwenaSettings, lang = "fr"): Promise<boolean> {
    return this.synthesize(text, settings, lang);
  }

  async stop(): Promise<void> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try { await NativeAwenaVoice.stop(); } catch {}
    }
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  async getStatus(lang = "fr"): Promise<AwenaVoiceStatus> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try { return await NativeAwenaVoice.getStatus(); } catch {}
    }
    const available = typeof window !== "undefined" && "speechSynthesis" in window;
    const voice = available ? webVoiceFor(localeForLang(lang), null) : null;
    return {
      available,
      ready: available,
      engine: available ? "web-speech" : "none",
      voiceName: voice?.name || null,
      language: voice?.lang || localeForLang(lang),
      offline: null,
    };
  }

  async getVoices(lang = "fr"): Promise<AwenaVoiceOption[]> {
    const language = localeForLang(lang);
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try {
        const result = await NativeAwenaVoice.getVoices({ language });
        return Array.isArray(result?.voices) ? result.voices : [];
      } catch {}
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    const prefix = language.split("-")[0].toLowerCase();
    return window.speechSynthesis.getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith(prefix))
      .map((voice) => ({ name: voice.name, language: voice.lang, offline: !!voice.localService }));
  }

  async setVoice(voiceName: string | null): Promise<void> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try { await NativeAwenaVoice.setVoice({ voiceName }); } catch {}
    }
  }

  async installNeuralVoice(): Promise<AwenaVoiceStatus> {
    if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android")) {
      throw new Error("Le pack vocal neural d'Awena est réservé à l'application Android.");
    }
    return NativeAwenaVoice.installNeuralVoice();
  }

  async removeNeuralVoice(): Promise<AwenaVoiceStatus> {
    if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android")) {
      throw new Error("Le pack vocal neural d'Awena est réservé à l'application Android.");
    }
    return NativeAwenaVoice.removeNeuralVoice();
  }
}

export const awenaVoice = new AwenaVoiceEngine();
