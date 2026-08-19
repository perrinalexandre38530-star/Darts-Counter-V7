import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type AwenaSpeechState =
  | "idle"
  | "starting"
  | "ready"
  | "speech"
  | "processing"
  | "permission-denied"
  | "error";

export type AwenaSpeechResult = {
  text: string;
  alternatives?: string[];
  confidence?: number | null;
  final: boolean;
  onDevice?: boolean;
};

export type AwenaSpeechStatus = {
  available: boolean;
  onDeviceAvailable: boolean;
  permission: "granted" | "prompt" | "denied" | string;
  listening: boolean;
  engine: "android-on-device" | "android-system" | "web-speech" | "none" | string;
  state: AwenaSpeechState;
  lastError?: string | null;
};

type NativeSpeechPlugin = {
  getStatus(): Promise<{ available?: boolean; onDeviceAvailable?: boolean; permission?: string; listening?: boolean; engine?: string }>;
  requestMicrophonePermission(): Promise<{ granted: boolean }>;
  startListening(options: { language: string; preferOffline?: boolean; partialResults?: boolean; maxResults?: number }): Promise<{ started?: boolean; onDevice?: boolean; language?: string }>;
  stopListening(): Promise<void>;
  cancel(): Promise<void>;
  addListener(eventName: "speechResult", listener: (event: AwenaSpeechResult) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "speechState", listener: (event: { state?: string; listening?: boolean; onDevice?: boolean; error?: string; code?: number }) => void): Promise<PluginListenerHandle>;
};

const NativeSpeech = registerPlugin<NativeSpeechPlugin>("AwenaSpeechRecognition");

type ResultListener = (result: AwenaSpeechResult) => void;
type StatusListener = (status: AwenaSpeechStatus) => void;

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

function browserCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function appLanguageToSpeechTag(lang: string) {
  const value = String(lang || "fr").toLowerCase();
  if (value.startsWith("en")) return "en-US";
  if (value.startsWith("es")) return "es-ES";
  if (value.startsWith("de")) return "de-DE";
  if (value.startsWith("it")) return "it-IT";
  if (value.startsWith("pt")) return "pt-PT";
  return "fr-FR";
}

class AwenaSpeechRecognitionController {
  private resultListeners = new Set<ResultListener>();
  private statusListeners = new Set<StatusListener>();
  private nativeHandles: PluginListenerHandle[] = [];
  private nativeListenersReady = false;
  private browserRecognition: any | null = null;
  private running = false;
  private paused = false;
  private startInFlight = false;
  private restartTimer: number | null = null;
  private language = "fr-FR";
  private preferOffline = true;
  private lastFinalAt = 0;
  private status: AwenaSpeechStatus = {
    available: false,
    onDeviceAvailable: false,
    permission: "prompt",
    listening: false,
    engine: "none",
    state: "idle",
    lastError: null,
  };

  private publishStatus(patch: Partial<AwenaSpeechStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      try { listener(this.status); } catch {}
    }
  }

  private publishResult(result: AwenaSpeechResult) {
    const text = String(result?.text || "").trim();
    if (!text) return;
    if (result.final) {
      const now = Date.now();
      if (now - this.lastFinalAt < 150) return;
      this.lastFinalAt = now;
    }
    for (const listener of this.resultListeners) {
      try { listener({ ...result, text }); } catch {}
    }
  }

  private clearRestart() {
    if (this.restartTimer != null && typeof window !== "undefined") {
      window.clearTimeout(this.restartTimer);
    }
    this.restartTimer = null;
  }

  private scheduleRestart(delay = 380) {
    this.clearRestart();
    if (!this.running || this.paused || typeof window === "undefined") return;
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      void this.startOneCycle();
    }, Math.max(160, delay));
  }

  private async ensureNativeListeners() {
    if (this.nativeListenersReady || Capacitor.getPlatform() !== "android") return;
    this.nativeListenersReady = true;
    try {
      const resultHandle = await NativeSpeech.addListener("speechResult", (event) => {
        this.publishResult({
          text: String(event?.text || ""),
          alternatives: Array.isArray(event?.alternatives) ? event.alternatives : [],
          confidence: Number.isFinite(Number(event?.confidence)) ? Number(event.confidence) : null,
          final: event?.final !== false,
          onDevice: !!event?.onDevice,
        });
        if (event?.final !== false) {
          this.publishStatus({ listening: false, state: "idle" });
          this.scheduleRestart(320);
        }
      });
      const stateHandle = await NativeSpeech.addListener("speechState", (event) => {
        const raw = String(event?.state || "idle");
        const state: AwenaSpeechState = ["idle","starting","ready","speech","processing","permission-denied","error"].includes(raw)
          ? raw as AwenaSpeechState
          : raw === "permission" ? "permission-denied" : "error";
        this.publishStatus({
          state,
          listening: event?.listening ?? ["starting","ready","speech","processing"].includes(state),
          lastError: event?.error || (state === "error" ? this.status.lastError : null),
          engine: event?.onDevice ? "android-on-device" : this.status.engine,
        });
        if (state === "idle") this.scheduleRestart(360);
        if (state === "error") {
          const err = String(event?.error || "speech-error");
          const delay = err === "busy" ? 900 : err === "speech-timeout" || err === "no-match" ? 450 : 700;
          this.scheduleRestart(delay);
        }
      });
      this.nativeHandles.push(resultHandle, stateHandle);
    } catch (error) {
      this.nativeListenersReady = false;
      this.publishStatus({ lastError: error instanceof Error ? error.message : String(error) });
    }
  }

  async getStatus(): Promise<AwenaSpeechStatus> {
    if (Capacitor.getPlatform() === "android") {
      try {
        await this.ensureNativeListeners();
        const native = await NativeSpeech.getStatus();
        this.publishStatus({
          available: !!native?.available,
          onDeviceAvailable: !!native?.onDeviceAvailable,
          permission: String(native?.permission || "prompt"),
          listening: !!native?.listening,
          engine: String(native?.engine || (native?.onDeviceAvailable ? "android-on-device" : "android-system")),
        });
        return this.status;
      } catch (error) {
        this.publishStatus({ available: false, lastError: error instanceof Error ? error.message : String(error) });
      }
    }

    const supported = !!browserCtor();
    this.publishStatus({
      available: supported,
      onDeviceAvailable: false,
      permission: supported ? "prompt" : "denied",
      engine: supported ? "web-speech" : "none",
    });
    return this.status;
  }

  async requestPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === "android") {
      try {
        const result = await NativeSpeech.requestMicrophonePermission();
        const granted = !!result?.granted;
        this.publishStatus({ permission: granted ? "granted" : "denied" });
        return granted;
      } catch (error) {
        this.publishStatus({ permission: "denied", lastError: error instanceof Error ? error.message : String(error) });
        return false;
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        this.publishStatus({ permission: "granted" });
        return true;
      } catch (error) {
        this.publishStatus({ permission: "denied", lastError: error instanceof Error ? error.message : String(error) });
        return false;
      }
    }
    return !!browserCtor();
  }

  private startBrowserCycle() {
    const Ctor = browserCtor();
    if (!Ctor || !this.running || this.paused) return false;
    try {
      try { this.browserRecognition?.abort?.(); } catch {}
      const rec = new Ctor();
      this.browserRecognition = rec;
      rec.lang = this.language;
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      rec.onstart = () => this.publishStatus({ listening: true, state: "ready", engine: "web-speech" });
      rec.onspeechstart = () => this.publishStatus({ listening: true, state: "speech" });
      rec.onresult = (event: any) => {
        const idx = Math.max(0, Number(event?.resultIndex || 0));
        const result = event?.results?.[idx];
        if (!result) return;
        const alternatives = Array.from(result).map((item: any) => String(item?.transcript || "")).filter(Boolean);
        this.publishResult({
          text: alternatives[0] || "",
          alternatives,
          confidence: Number.isFinite(Number(result?.[0]?.confidence)) ? Number(result[0].confidence) : null,
          final: !!result.isFinal,
          onDevice: false,
        });
      };
      rec.onerror = (event: any) => {
        const err = String(event?.error || "speech-error");
        this.publishStatus({ listening: false, state: "error", lastError: err, engine: "web-speech" });
      };
      rec.onend = () => {
        this.publishStatus({ listening: false, state: "idle", engine: "web-speech" });
        this.scheduleRestart(420);
      };
      rec.start();
      return true;
    } catch (error) {
      this.publishStatus({ listening: false, state: "error", lastError: error instanceof Error ? error.message : String(error) });
      this.scheduleRestart(850);
      return false;
    }
  }

  private async startOneCycle() {
    if (!this.running || this.paused || this.startInFlight) return;
    this.startInFlight = true;
    try {
      if (Capacitor.getPlatform() === "android") {
        await this.ensureNativeListeners();
        const status = await this.getStatus();
        if (!status.available) return;
        await NativeSpeech.startListening({ language: this.language, preferOffline: this.preferOffline, partialResults: true, maxResults: 5 });
        this.publishStatus({ listening: true, state: "starting" });
      } else {
        this.startBrowserCycle();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.publishStatus({ listening: false, state: "error", lastError: message });
      this.scheduleRestart(/permission/i.test(message) ? 5000 : 800);
    } finally {
      this.startInFlight = false;
    }
  }

  async start(lang = "fr", options?: { preferOffline?: boolean; requestPermission?: boolean }) {
    this.language = appLanguageToSpeechTag(lang);
    this.preferOffline = options?.preferOffline !== false;
    this.running = true;
    this.paused = false;
    this.clearRestart();
    await this.getStatus();
    if (options?.requestPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        this.running = false;
        return false;
      }
    }
    await this.startOneCycle();
    return true;
  }

  async pause() {
    this.paused = true;
    this.clearRestart();
    if (Capacitor.getPlatform() === "android") {
      try { await NativeSpeech.cancel(); } catch {}
    } else {
      try { this.browserRecognition?.abort?.(); } catch {}
      this.browserRecognition = null;
    }
    this.publishStatus({ listening: false, state: "idle" });
  }

  async resume() {
    if (!this.running) return;
    this.paused = false;
    this.clearRestart();
    await this.startOneCycle();
  }

  async stop() {
    this.running = false;
    this.paused = false;
    this.clearRestart();
    if (Capacitor.getPlatform() === "android") {
      try { await NativeSpeech.cancel(); } catch {}
    } else {
      try { this.browserRecognition?.abort?.(); } catch {}
      this.browserRecognition = null;
    }
    this.publishStatus({ listening: false, state: "idle" });
  }

  isRunning() { return this.running; }
  isPaused() { return this.paused; }
  currentStatus() { return this.status; }

  onResult(listener: ResultListener) {
    this.resultListeners.add(listener);
    return () => { this.resultListeners.delete(listener); };
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    try { listener(this.status); } catch {}
    return () => { this.statusListeners.delete(listener); };
  }
}

export const awenaSpeechRecognition = new AwenaSpeechRecognitionController();
