import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { AwenaSettings, AwenaVoiceOption, AwenaVoiceStatus } from "./awena.types";

export type AwenaSpeechTimingEvent = {
  utteranceId: string;
  phase: "start" | "end";
  durationMs?: number;
};

type NativeVoicePlugin = {
  speak(options: { text: string; utteranceId?: string; language?: string; voiceName?: string | null; rate?: number; pitch?: number; volume?: number }): Promise<{ ok: boolean; voiceName?: string | null }>;
  addListener(eventName: "speechStart" | "speechEnd", listener: (event: { utteranceId?: string; durationMs?: number }) => void): Promise<PluginListenerHandle>;
  stop(): Promise<{ ok: boolean }>;
  getStatus(options?: { language?: string }): Promise<AwenaVoiceStatus>;
  getVoices(options?: { language?: string }): Promise<{ voices: AwenaVoiceOption[] }>;
  setVoice(options: { voiceName: string | null; language?: string }): Promise<{ ok: boolean; voiceName?: string | null }>;
  installNeuralVoice(): Promise<AwenaVoiceStatus & { ok?: boolean }>;
  removeNeuralVoice(): Promise<AwenaVoiceStatus & { ok?: boolean }>;
};

const NativeAwenaVoice = registerPlugin<NativeVoicePlugin>("AwenaVoice");

function localeForLang(lang: string | undefined): string {
  const value = String(lang || "fr").toLowerCase().split("-")[0];
  const locales: Record<string, string> = {
    fr: "fr-FR",
    en: "en-GB",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    nl: "nl-NL",
    ru: "ru-RU",
    zh: "zh-CN",
    ja: "ja-JP",
    ar: "ar-SA",
    hi: "hi-IN",
    tr: "tr-TR",
    da: "da-DK",
    no: "no-NO",
    sv: "sv-SE",
    is: "is-IS",
    pl: "pl-PL",
    ro: "ro-RO",
    sr: "sr-RS",
    hr: "hr-HR",
    cs: "cs-CZ",
  };
  return locales[value] || String(lang || "fr-FR");
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
  private timingListeners = new Set<(event: AwenaSpeechTimingEvent) => void>();
  private nativeTimingBridgeReady = false;
  private nativeTimingHandles: PluginListenerHandle[] = [];

  private emitTiming(event: AwenaSpeechTimingEvent) {
    for (const listener of this.timingListeners) {
      try { listener(event); } catch {}
    }
  }

  private ensureNativeTimingBridge() {
    if (this.nativeTimingBridgeReady) return;
    if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android")) return;
    this.nativeTimingBridgeReady = true;

    void NativeAwenaVoice.addListener("speechStart", (event) => {
      const utteranceId = String(event?.utteranceId || "");
      if (!utteranceId) return;
      this.emitTiming({
        utteranceId,
        phase: "start",
        durationMs: Number.isFinite(Number(event?.durationMs)) ? Number(event?.durationMs) : undefined,
      });
    }).then((handle) => this.nativeTimingHandles.push(handle)).catch(() => {
      this.nativeTimingBridgeReady = false;
    });

    void NativeAwenaVoice.addListener("speechEnd", (event) => {
      const utteranceId = String(event?.utteranceId || "");
      if (!utteranceId) return;
      this.emitTiming({ utteranceId, phase: "end" });
    }).then((handle) => this.nativeTimingHandles.push(handle)).catch(() => {
      this.nativeTimingBridgeReady = false;
    });
  }

  onSpeechTiming(listener: (event: AwenaSpeechTimingEvent) => void) {
    this.timingListeners.add(listener);
    this.ensureNativeTimingBridge();
    return () => { this.timingListeners.delete(listener); };
  }

  private async synthesize(text: string, settings: AwenaSettings, lang = "fr", utteranceId?: string): Promise<boolean> {
    const clean = String(text || "").trim();
    if (!clean) return false;
    const language = localeForLang(lang);

    // Un seul canal vocal à la fois : si X01/WebSpeech parlait, on le coupe avant Awena.
    try { window.speechSynthesis?.cancel(); } catch {}

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try {
        this.ensureNativeTimingBridge();
        const result = await NativeAwenaVoice.speak({
          text: clean,
          utteranceId,
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
        const id = utteranceId || `awena-web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const words = Math.max(1, clean.split(/\s+/).filter(Boolean).length);
        const estimatedMs = Math.max(650, Math.round((words / (165 * Math.max(0.65, settings.rate))) * 60_000));
        utterance.onstart = () => this.emitTiming({ utteranceId: id, phase: "start", durationMs: estimatedMs });
        utterance.onend = () => this.emitTiming({ utteranceId: id, phase: "end" });
        utterance.onerror = () => this.emitTiming({ utteranceId: id, phase: "end" });
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (error) {
        console.warn("[AwenaVoice] Web speech unavailable", error);
      }
    }
    return false;
  }

  async speak(text: string, settings: AwenaSettings, lang = "fr", utteranceId?: string): Promise<boolean> {
    if (!settings.enabled || !settings.voiceEnabled) return false;
    return this.synthesize(text, settings, lang, utteranceId);
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
      try { return await NativeAwenaVoice.getStatus({ language: localeForLang(lang) }); } catch {}
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

  async setVoice(voiceName: string | null, lang = "fr"): Promise<void> {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try { await NativeAwenaVoice.setVoice({ voiceName, language: localeForLang(lang) }); } catch {}
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
