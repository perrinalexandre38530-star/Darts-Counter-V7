import React from "react";
import { useAudio } from "../contexts/AudioContext";
import { useAwenaOptional } from "../awena/AwenaProvider";
import {
  getAudioPreferences,
  getEnabledTrackIds,
  NAVIGATION_MUSIC_PREVIEW_EVENT,
  subscribeAudioPreferences,
  type AudioPreferences,
} from "../lib/audioPreferences";
import {
  getNavigationMusicTrack,
  type NavigationMusicTrackId,
} from "../lib/navigationMusicCatalog";
import {
  GAMEPLAY_ROUTE_STATE_EVENT,
  isGameplayRouteName,
  type GameplayRouteStateDetail,
} from "../lib/gameplayRoutes";

type NavigationMusicZone = "navigation" | null;

export function isNavigationGameplayRoute(routeLike: unknown): boolean {
  return isGameplayRouteName(routeLike);
}

export function navigationMusicZoneForRoute(
  routeLike: unknown,
  gameplayActive = false,
): NavigationMusicZone {
  const route = String(routeLike || "").trim().toLowerCase();
  if (!route || gameplayActive || isGameplayRouteName(route)) return null;
  return "navigation";
}

export function createRandomTrackOrder<T>(trackIds: readonly T[], avoidFirst?: T | null): T[] {
  const order = [...trackIds];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = order[index];
    const swap = order[swapIndex];
    if (current === undefined || swap === undefined) continue;
    order[index] = swap;
    order[swapIndex] = current;
  }
  if (order.length > 1 && avoidFirst != null && order[0] === avoidFirst) {
    const swapIndex = 1 + Math.floor(Math.random() * (order.length - 1));
    const first = order[0];
    const swap = order[swapIndex];
    if (first !== undefined && swap !== undefined) {
      order[0] = swap;
      order[swapIndex] = first;
    }
  }
  return order;
}

function isAudibleVideo(target: EventTarget | null): target is HTMLVideoElement {
  if (!(target instanceof HTMLVideoElement)) return false;
  return !target.muted && Number(target.volume ?? 1) > 0;
}

export default function NavigationBackgroundMusic({
  route,
  gameplayActive = false,
}: {
  route: string;
  gameplayActive?: boolean;
}) {
  const { muted } = useAudio();
  const awena = useAwenaOptional();
  const zone = navigationMusicZoneForRoute(route, gameplayActive);
  const [prefs, setPrefs] = React.useState<AudioPreferences>(() => getAudioPreferences());

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const zoneRef = React.useRef<NavigationMusicZone>(null);
  const cycleRef = React.useRef<NavigationMusicTrackId[]>([]);
  const cursorRef = React.useRef(0);
  const currentTrackIdRef = React.useRef<NavigationMusicTrackId | null>(null);
  const pausedByVideoRef = React.useRef(false);
  const pausedByPreviewRef = React.useRef(false);
  const activeVideoRefs = React.useRef<Set<HTMLVideoElement>>(new Set());
  const pendingAutoplayRef = React.useRef(false);
  const playRequestSerialRef = React.useRef(0);
  const volumeRafRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(false);
  const prefsRef = React.useRef(prefs);

  const awenaSpeaking = awena?.speechCue?.phase === "pending" || awena?.speechCue?.phase === "speaking";

  React.useEffect(() => subscribeAudioPreferences(setPrefs), []);
  React.useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  const cancelVolumeRamp = React.useCallback(() => {
    if (volumeRafRef.current != null && typeof window !== "undefined") {
      window.cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
  }, []);

  const getTargetVolume = React.useCallback((settings = prefsRef.current) => {
    const base = Math.max(0, Math.min(1, settings.navigationVolume));
    if (awenaSpeaking && settings.duckAwenaEnabled) return base * settings.duckAwenaRatio;
    return base;
  }, [awenaSpeaking]);

  const rampVolume = React.useCallback((target: number, durationMs = 320) => {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;
    cancelVolumeRamp();
    const from = Number.isFinite(audio.volume) ? audio.volume : target;
    const to = Math.max(0, Math.min(1, target));
    if (Math.abs(from - to) < 0.004) {
      audio.volume = to;
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, Math.max(0, (now - started) / Math.max(1, durationMs)));
      const eased = ratio * ratio * (3 - 2 * ratio);
      audio.volume = from + (to - from) * eased;
      if (ratio < 1) volumeRafRef.current = window.requestAnimationFrame(tick);
      else volumeRafRef.current = null;
    };
    volumeRafRef.current = window.requestAnimationFrame(tick);
  }, [cancelVolumeRamp]);

  const canPlay = React.useCallback(() => {
    const settings = prefsRef.current;
    return !!zoneRef.current
      && !muted
      && settings.masterEnabled
      && settings.navigationMusicEnabled
      && getEnabledTrackIds(settings).length > 0
      && !pausedByVideoRef.current
      && !pausedByPreviewRef.current;
  }, [muted]);

  const rebuildCycle = React.useCallback((settings = prefsRef.current) => {
    const active = getEnabledTrackIds(settings);
    cycleRef.current = settings.navigationPlaybackMode === "random"
      ? createRandomTrackOrder(active, currentTrackIdRef.current)
      : active;
    cursorRef.current = 0;
  }, []);

  const takeNextTrackId = React.useCallback(() => {
    const settings = prefsRef.current;
    if (cursorRef.current >= cycleRef.current.length) rebuildCycle(settings);
    const fallback = getEnabledTrackIds(settings)[0] ?? null;
    const next = cycleRef.current[cursorRef.current] ?? fallback;
    if (!next) return null;
    cursorRef.current += 1;
    currentTrackIdRef.current = next;
    return next;
  }, [rebuildCycle]);

  const loadNextTrack = React.useCallback((audio: HTMLAudioElement) => {
    const nextId = takeNextTrackId();
    const track = getNavigationMusicTrack(nextId);
    if (!track) return false;
    audio.src = track.url;
    audio.preload = "auto";
    try { audio.currentTime = 0; } catch {}
    try { audio.load(); } catch {}
    return true;
  }, [takeNextTrackId]);

  const requestPlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !canPlay()) return;
    const requestSerial = ++playRequestSerialRef.current;
    audio.muted = false;
    rampVolume(getTargetVolume(), 220);
    try {
      await audio.play();
      // A route can switch to PLAY while the browser is still resolving an
      // autoplay promise. Never let that delayed promise restart the music.
      if (requestSerial !== playRequestSerialRef.current || !canPlay()) {
        try { audio.pause(); } catch {}
        return;
      }
      pendingAutoplayRef.current = false;
    } catch {
      if (requestSerial === playRequestSerialRef.current && canPlay()) {
        pendingAutoplayRef.current = true;
      }
    }
  }, [canPlay, getTargetVolume, rampVolume]);

  const resetPlaylist = React.useCallback((keepZone: NavigationMusicZone = zoneRef.current) => {
    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); } catch {}
    cycleRef.current = [];
    cursorRef.current = 0;
    currentTrackIdRef.current = null;
    zoneRef.current = keepZone;
    pendingAutoplayRef.current = false;
    if (keepZone) {
      rebuildCycle();
      loadNextTrack(audio);
    } else {
      try { audio.currentTime = 0; } catch {}
      audio.removeAttribute("src");
    }
  }, [loadNextTrack, rebuildCycle]);

  const hardStopForGameplay = React.useCallback(() => {
    // Invalidate every pending play() call before touching the element.
    playRequestSerialRef.current += 1;
    pendingAutoplayRef.current = false;
    pausedByPreviewRef.current = false;
    zoneRef.current = null;
    cycleRef.current = [];
    cursorRef.current = 0;
    currentTrackIdRef.current = null;
    cancelVolumeRamp();

    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); } catch {}
    try { audio.currentTime = 0; } catch {}
    try { audio.removeAttribute("src"); } catch {}
    try { audio.load(); } catch {}
  }, [cancelVolumeRamp]);

  const resumeAfterBlockingMedia = React.useCallback(() => {
    const connected = new Set<HTMLVideoElement>();
    activeVideoRefs.current.forEach((video) => {
      if (video.isConnected && !video.ended) connected.add(video);
    });
    activeVideoRefs.current = connected;
    pausedByVideoRef.current = connected.size > 0;
    if (!pausedByVideoRef.current && !pausedByPreviewRef.current) void requestPlay();
  }, [requestPlay]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    mountedRef.current = true;
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = getTargetVolume();
    audioRef.current = audio;

    const onEnded = () => {
      if (!mountedRef.current || !zoneRef.current) return;
      if (loadNextTrack(audio)) void requestPlay();
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      mountedRef.current = false;
      cancelVolumeRamp();
      audio.removeEventListener("ended", onEnded);
      try { audio.pause(); } catch {}
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onGameplayRouteState = (event: Event) => {
      const detail = (event as CustomEvent<GameplayRouteStateDetail>).detail;
      if (detail?.gameplay || isGameplayRouteName(detail?.route)) {
        hardStopForGameplay();
      }
    };
    window.addEventListener(GAMEPLAY_ROUTE_STATE_EVENT, onGameplayRouteState as EventListener);
    return () => window.removeEventListener(GAMEPLAY_ROUTE_STATE_EVENT, onGameplayRouteState as EventListener);
  }, [hardStopForGameplay]);

  React.useEffect(() => {
    const previousZone = zoneRef.current;
    if (zone === previousZone) {
      if (zone) void requestPlay();
      return;
    }
    if (!zone) {
      hardStopForGameplay();
      return;
    }
    zoneRef.current = zone;
    resetPlaylist(zone);
    void requestPlay();
  }, [zone, hardStopForGameplay, requestPlay, resetPlaylist]);

  const playlistSignature = React.useMemo(() => JSON.stringify({
    enabledTrackIds: prefs.enabledTrackIds,
    trackOrder: prefs.trackOrder,
    mode: prefs.navigationPlaybackMode,
  }), [prefs.enabledTrackIds, prefs.trackOrder, prefs.navigationPlaybackMode]);

  const previousPlaylistSignatureRef = React.useRef(playlistSignature);
  React.useEffect(() => {
    if (previousPlaylistSignatureRef.current === playlistSignature) return;
    previousPlaylistSignatureRef.current = playlistSignature;
    if (!zoneRef.current) return;
    resetPlaylist(zoneRef.current);
    void requestPlay();
  }, [playlistSignature, requestPlay, resetPlaylist]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const allowed = !muted && prefs.masterEnabled && prefs.navigationMusicEnabled && getEnabledTrackIds(prefs).length > 0;
    if (!allowed) {
      try { audio.pause(); } catch {}
      return;
    }
    if (zoneRef.current && !pausedByVideoRef.current && !pausedByPreviewRef.current) void requestPlay();
  }, [muted, prefs.masterEnabled, prefs.navigationMusicEnabled, prefs.enabledTrackIds, requestPlay]);

  React.useEffect(() => {
    rampVolume(getTargetVolume(prefs), awenaSpeaking ? 180 : 520);
  }, [prefs.navigationVolume, prefs.duckAwenaEnabled, prefs.duckAwenaRatio, awenaSpeaking, getTargetVolume, rampVolume]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onPreview = (event: Event) => {
      const active = !!(event as CustomEvent<{ active?: boolean }>).detail?.active;
      pausedByPreviewRef.current = active;
      if (active) {
        try { audioRef.current?.pause(); } catch {}
      } else if (!pausedByVideoRef.current) {
        void requestPlay();
      }
    };
    window.addEventListener(NAVIGATION_MUSIC_PREVIEW_EVENT, onPreview as EventListener);
    return () => window.removeEventListener(NAVIGATION_MUSIC_PREVIEW_EVENT, onPreview as EventListener);
  }, [requestPlay]);

  React.useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const onPlay = (event: Event) => {
      if (!isAudibleVideo(event.target) || !zoneRef.current) return;
      const video = event.target;
      activeVideoRefs.current.add(video);
      pausedByVideoRef.current = true;
      pendingAutoplayRef.current = false;
      try { audioRef.current?.pause(); } catch {}
    };
    const onEnded = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return;
      activeVideoRefs.current.delete(event.target);
      resumeAfterBlockingMedia();
    };
    const onPause = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return;
      const video = event.target;
      window.setTimeout(() => {
        if (!video.isConnected || video.ended) {
          activeVideoRefs.current.delete(video);
          resumeAfterBlockingMedia();
        }
      }, 80);
    };
    document.addEventListener("play", onPlay, true);
    document.addEventListener("ended", onEnded, true);
    document.addEventListener("pause", onPause, true);
    const observer = new MutationObserver(() => resumeAfterBlockingMedia());
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("ended", onEnded, true);
      document.removeEventListener("pause", onPause, true);
      observer.disconnect();
    };
  }, [resumeAfterBlockingMedia]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const retry = () => {
      if (!pendingAutoplayRef.current || !canPlay()) return;
      void requestPlay();
    };
    window.addEventListener("pointerdown", retry, { passive: true });
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [canPlay, requestPlay]);

  return null;
}
