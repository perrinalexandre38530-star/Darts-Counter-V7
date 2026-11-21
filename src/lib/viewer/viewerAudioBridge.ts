/**
 * Viewer audio output for short HTMLAudioElement SFX. The phone stays the audio
 * output until a connected TV announces that its audio has been activated.
 * Only bundled/public asset paths are transmitted, never arbitrary URLs.
 */
import { getActiveViewerSession } from "./viewerSession";
import { sendViewerHostCommand } from "./viewerRealtime";

let tvReadyAt = 0;
let readySessionId = "";
const READY_TTL_MS = 16000;
const ALLOWED_SOUND = /^\/(?:sounds|assets|awena|challenge|fit)\/[a-z0-9._\/-]+\.(?:mp3|wav|ogg|m4a)(?:[?#].*)?$/i;

export function markViewerTvAudioReady(sessionId: string, ready: boolean) {
  readySessionId = ready ? String(sessionId || "") : "";
  tvReadyAt = ready ? Date.now() : 0;
}

export function isViewerTvAudioActive() {
  const sid = getActiveViewerSession()?.sessionId || "";
  return !!sid && sid === readySessionId && Date.now() - tvReadyAt < READY_TTL_MS;
}

export function installViewerAudioOutputBridge(): () => void {
  if (typeof window === "undefined" || typeof HTMLMediaElement === "undefined") return () => {};
  const original = HTMLMediaElement.prototype.play;
  if ((original as any).__mssViewerTvAudioWrapped) return () => {};
  const patched = function (this: HTMLMediaElement): Promise<void> {
    // Images/videos, silent unlock probes, TTS and looped background music are
    // deliberately not hijacked. Never silence the phone without TV readiness.
    if (this instanceof HTMLAudioElement && !this.muted && !this.loop && Number(this.volume) > 0 &&
        document.documentElement.dataset.mscGameplay === "1" &&
        isViewerTvAudioActive()) {
      try {
        const raw = String(this.getAttribute("src") || this.currentSrc || this.src || "");
        const path = raw.startsWith("/") && !raw.startsWith("//")
          ? raw
          : new URL(raw, document.baseURI).pathname;
        if (ALLOWED_SOUND.test(path)) {
          const sessionId = getActiveViewerSession()?.sessionId || "";
          if (sessionId && sendViewerHostCommand({
            type: "tv_audio_play", path,
            volume: Math.max(0, Math.min(1, Number(this.volume))),
            at: Date.now(),
          })) {
            try { this.pause(); } catch {}
            return Promise.resolve();
          }
        }
      } catch {}
    }
    return original.apply(this, arguments as any);
  };
  (patched as any).__mssViewerTvAudioWrapped = true;
  HTMLMediaElement.prototype.play = patched;
  return () => {
    if (HTMLMediaElement.prototype.play === patched) HTMLMediaElement.prototype.play = original;
    markViewerTvAudioReady("", false);
  };
}

/**
 * Backward-compatible entrypoint used by App.tsx (phone / web boot).
 * Keep the existing audio bridge implementation as the single source of truth.
 * In particular, cleanup must always restore HTMLMediaElement.prototype.play.
 */
export function installViewerPhoneAudioRelay(): () => void {
  return installViewerAudioOutputBridge();
}

const TV_SFX_PATH = /^\/(?:sounds|assets|awena|challenge|fit)\/[a-z0-9._\/-]+\.(?:mp3|wav|ogg|m4a)(?:[?#].*)?$/i;

/** Audio playback on Tizen; use local file paths for public/sounds and Vite assets. */
export function playViewerTvAudio(pathValue: unknown, volumeValue: unknown): Promise<boolean> {
  const path = String(pathValue || "");
  if (!TV_SFX_PATH.test(path) || typeof Audio === "undefined") return Promise.resolve(false);
  const map = (window as any).__MSS_TV_RESOLVE_MEDIA__;
  const url = typeof map === "function" ? map(path) : `.${path}`;
  const volumeNumber = Number(volumeValue);
  const volume = Math.max(0, Math.min(1, Number.isFinite(volumeNumber) ? volumeNumber : 0.8));
  const sound = new Audio(url);
  sound.volume = volume;
  sound.preload = "auto";
  const clear = () => { sound.onended = null; sound.onerror = null; };
  sound.onended = clear;
  return Promise.resolve(sound.play()).then(() => true).catch(() => {
    clear();
    return false;
  });
}
