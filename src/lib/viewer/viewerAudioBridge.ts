/**
 * MULTISPORTS SCORING — Viewer audio handoff (v242).
 * WebSocket carries EVENTS, never media bytes. Both players resolve their own
 * packaged audio files. HTMLAudioElement only: WebAudio generators are untouched.
 */
import { getActiveViewerSession } from './viewerSession';
import { sendViewerHostCommand } from './viewerRealtime';

const READY_TTL_MS = 26000;
const MAX_CUE_AGE_MS = 2500;
const MAX_PATH = 420;
let sinkSession = '';
let sinkLastSeenAt = 0;
let counter = 0;

export function setViewerTvAudioSink(sessionId: string, ready: boolean) {
  const active = getActiveViewerSession()?.sessionId || '';
  if (!ready || !sessionId || sessionId !== active) {
    if (!ready || sessionId === sinkSession) { sinkSession = ''; sinkLastSeenAt = 0; }
    return;
  }
  sinkSession = sessionId;
  sinkLastSeenAt = Date.now();
}

export function isViewerTvAudioSinkReady() {
  return !!sinkSession && sinkSession === (getActiveViewerSession()?.sessionId || '')
    && (Date.now() - sinkLastSeenAt) < READY_TTL_MS;
}

// Do not transmit arbitrary websites or blobs to the television. Only media
// bundled with MSS, and only a relative path. No credentials or query strings.
export function viewerAudioAssetPath(raw: string, origin?: string): string | null {
  if (!raw || raw.length > 1500 || /^(?:blob:|data:|javascript:)/i.test(raw)) return null;
  try {
    const base = origin || (typeof location !== 'undefined' ? location.href : 'https://local.invalid/index.html');
    const parsed = new URL(raw, base);
    const local = new URL(base);
    if ((local.protocol === 'http:' || local.protocol === 'https:') && parsed.origin !== local.origin) return null;
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return null;
    const path = decodeURIComponent(parsed.pathname || '').replace(/^\/+/, '');
    if (!path || path.length > MAX_PATH || path.includes('..') || path.includes('\\')) return null;
    if (!/\.(?:mp3|m4a|aac|ogg|wav)$/i.test(path)) return null;
    // Vite build assets are /assets/..., static public assets /sounds/... .
    const match = path.match(/(?:^|\/)(assets|sounds|audio)\/(.+)$/i);
    if (!match) return null;
    return `${match[1]}/${match[2]}`;
  } catch { return null; }
}

/** Installed on PHONE only; in a paired TV session audio moves to TV. */
export function installViewerPhoneAudioRelay() {
  if (typeof window === 'undefined' || typeof HTMLMediaElement === 'undefined') return () => {};
  const proto = HTMLMediaElement.prototype;
  const originalPlay = proto.play;
  const originalPause = proto.pause;
  const saved = new Map<HTMLMediaElement, { muted: boolean; id: string }>();
  let disposed = false;
  const restore = (media: HTMLMediaElement) => {
    const state = saved.get(media);
    if (!state) return;
    saved.delete(media);
    try { media.muted = state.muted; } catch {}
  };
  const restoreAll = () => { for (const media of Array.from(saved.keys())) restore(media); };

  const patchedPlay = function (this: HTMLMediaElement): Promise<void> {
    if (disposed || this.tagName !== 'AUDIO' || !isViewerTvAudioSinkReady()) {
      restore(this);
      return originalPlay.call(this);
    }
    const src = viewerAudioAssetPath(this.currentSrc || this.src || this.querySelector('source')?.getAttribute('src') || '');
    if (!src) return originalPlay.call(this);
    const previous = saved.get(this);
    const id = previous?.id || `phone-${Date.now()}-${++counter}`;
    const wasMuted = previous?.muted ?? this.muted;
    const sent = sendViewerHostCommand({
      type: 'viewer_audio_event', action: 'play', id, src,
      volume: Math.max(0, Math.min(1, Number(this.volume) || 0)),
      loop: !!this.loop, playbackRate: Number(this.playbackRate) || 1,
      at: Date.now(),
    });
    if (!sent) { restore(this); return originalPlay.call(this); }
    saved.set(this, { muted: wasMuted, id });
    this.muted = true;
    return originalPlay.call(this);
  };
  const patchedPause = function (this: HTMLMediaElement): void {
    const state = saved.get(this);
    if (state) sendViewerHostCommand({ type: 'viewer_audio_event', action: 'stop', id: state.id, at: Date.now() });
    restore(this);
    originalPause.call(this);
  };

  // Some older WebKit/Tizen runtimes expose non-writable native media methods.
  // Fail open to local audio rather than breaking the application boot.
  try { proto.play = patchedPlay; proto.pause = patchedPause; }
  catch {
    try { if (proto.play === patchedPlay) proto.play = originalPlay; } catch {}
    return () => {};
  }
  const onEnded = (event: Event) => {
    const media = event.target as HTMLMediaElement;
    const state = saved.get(media);
    if (state) sendViewerHostCommand({ type: 'viewer_audio_event', action: 'stop', id: state.id, at: Date.now() });
    restore(media);
  };
  const onFocusOrSession = () => { if (!isViewerTvAudioSinkReady()) restoreAll(); };
  document.addEventListener('ended', onEnded, true);
  window.addEventListener('focus', onFocusOrSession);
  window.addEventListener('dc:viewer-session-changed', onFocusOrSession);
  const check = window.setInterval(onFocusOrSession, 4000);
  return () => {
    disposed = true;
    window.clearInterval(check);
    document.removeEventListener('ended', onEnded, true);
    window.removeEventListener('focus', onFocusOrSession);
    window.removeEventListener('dc:viewer-session-changed', onFocusOrSession);
    if (proto.play === patchedPlay) proto.play = originalPlay;
    if (proto.pause === patchedPause) proto.pause = originalPause;
    restoreAll();
  };
}

const tvMedia = new Map<string, HTMLAudioElement>();
export function receiveViewerTvAudioCue(message: any) {
  if (!message || message.type !== 'viewer_audio_event') return false;
  const at = Number(message.at || 0);
  if (!Number.isFinite(at) || Math.abs(Date.now() - at) > MAX_CUE_AGE_MS) return false;
  const id = String(message.id || '').slice(0, 100);
  if (!id) return false;
  if (message.action === 'stop') {
    const current = tvMedia.get(id);
    if (current) { try { current.pause(); current.currentTime = 0; } catch {} tvMedia.delete(id); }
    return true;
  }
  if (message.action !== 'play' || tvMedia.size > 32) return false;
  const src = viewerAudioAssetPath(String(message.src || ''), 'https://local.invalid/index.html');
  if (!src) return false;
  const old = tvMedia.get(id);
  if (old) { try { old.pause(); } catch {} }
  const audio = new Audio(`./${src}`);
  audio.volume = Math.max(0, Math.min(1, Number(message.volume ?? 1)));
  audio.loop = !!message.loop;
  audio.playbackRate = Math.max(.5, Math.min(2, Number(message.playbackRate) || 1));
  tvMedia.set(id, audio);
  audio.addEventListener('ended', () => { if (tvMedia.get(id) === audio) tvMedia.delete(id); }, { once: true });
  audio.play().catch(() => { if (tvMedia.get(id) === audio) tvMedia.delete(id); });
  return true;
}

export function stopAllViewerTvAudio() {
  for (const media of tvMedia.values()) { try { media.pause(); } catch {} }
  tvMedia.clear();
}
