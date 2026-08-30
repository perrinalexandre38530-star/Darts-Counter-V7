import React from "react";
import { useAudio } from "../contexts/AudioContext";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useTheme } from "../contexts/ThemeContext";
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
import {
  AWENA_NAVIGATION_MUSIC_REQUEST_EVENT,
  type AwenaNavigationMusicRequestDetail,
} from "../lib/navigationMusicControl";

type NavigationMusicZone = "navigation" | null;

type NowPlayingBanner = {
  trackId: NavigationMusicTrackId;
  title: string;
};

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

export default function NavigationBackgroundMusic({
  route,
  gameplayActive = false,
}: {
  route: string;
  gameplayActive?: boolean;
}) {
  const { muted } = useAudio();
  const awena = useAwenaOptional();
  const { theme } = useTheme();
  const zone = navigationMusicZoneForRoute(route, gameplayActive);
  const [prefs, setPrefs] = React.useState<AudioPreferences>(() => getAudioPreferences());
  const [nowPlaying, setNowPlaying] = React.useState<NowPlayingBanner | null>(null);
  const [nowPlayingVisible, setNowPlayingVisible] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const zoneRef = React.useRef<NavigationMusicZone>(null);
  const cycleRef = React.useRef<NavigationMusicTrackId[]>([]);
  const cursorRef = React.useRef(0);
  const currentTrackIdRef = React.useRef<NavigationMusicTrackId | null>(null);
  const explicitTrackActiveRef = React.useRef(false);
  const pausedByPreviewRef = React.useRef(false);
  const pendingAutoplayRef = React.useRef(false);
  const playRequestSerialRef = React.useRef(0);
  const trackLoadSerialRef = React.useRef(0);
  const announcedTrackSerialRef = React.useRef(0);
  const nowPlayingShowRafRef = React.useRef<number | null>(null);
  const nowPlayingHideTimerRef = React.useRef<number | null>(null);
  const nowPlayingClearTimerRef = React.useRef<number | null>(null);
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

  const clearNowPlayingTimers = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (nowPlayingShowRafRef.current != null) {
      window.cancelAnimationFrame(nowPlayingShowRafRef.current);
      nowPlayingShowRafRef.current = null;
    }
    if (nowPlayingHideTimerRef.current != null) {
      window.clearTimeout(nowPlayingHideTimerRef.current);
      nowPlayingHideTimerRef.current = null;
    }
    if (nowPlayingClearTimerRef.current != null) {
      window.clearTimeout(nowPlayingClearTimerRef.current);
      nowPlayingClearTimerRef.current = null;
    }
  }, []);

  const showNowPlayingBanner = React.useCallback((trackId: NavigationMusicTrackId) => {
    if (typeof window === "undefined") return;
    const track = getNavigationMusicTrack(trackId);
    if (!track) return;

    clearNowPlayingTimers();
    setNowPlaying({ trackId, title: track.name });
    setNowPlayingVisible(false);
    nowPlayingShowRafRef.current = window.requestAnimationFrame(() => {
      nowPlayingShowRafRef.current = window.requestAnimationFrame(() => {
        nowPlayingShowRafRef.current = null;
        setNowPlayingVisible(true);
      });
    });
    nowPlayingHideTimerRef.current = window.setTimeout(() => {
      nowPlayingHideTimerRef.current = null;
      setNowPlayingVisible(false);
    }, 4200);
    nowPlayingClearTimerRef.current = window.setTimeout(() => {
      nowPlayingClearTimerRef.current = null;
      setNowPlaying(null);
    }, 4700);
  }, [clearNowPlayingTimers]);

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

  // MENU MUSIC CONTRACT: navigation/configuration must never pause the playlist.
  // Only an actual gameplay route (handled by zone/hardStopForGameplay) or an
  // explicit music preview/mute setting may suspend this persistent player.
  const canPlay = React.useCallback(() => {
    const settings = prefsRef.current;
    return !!zoneRef.current
      && !muted
      && settings.masterEnabled
      && settings.navigationMusicEnabled
      && (explicitTrackActiveRef.current || getEnabledTrackIds(settings).length > 0)
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
    trackLoadSerialRef.current += 1;
    audio.preload = "auto";
    try { audio.currentTime = 0; } catch {}
    try { audio.load(); } catch {}
    return true;
  }, [takeNextTrackId]);

  const loadRequestedTrack = React.useCallback((audio: HTMLAudioElement, trackId: NavigationMusicTrackId) => {
    const track = getNavigationMusicTrack(trackId);
    if (!track) return false;
    playRequestSerialRef.current += 1;
    pendingAutoplayRef.current = false;
    explicitTrackActiveRef.current = true;
    currentTrackIdRef.current = trackId;
    audio.pause();
    audio.src = track.url;
    trackLoadSerialRef.current += 1;
    audio.preload = "auto";
    try { audio.currentTime = 0; } catch {}
    try { audio.load(); } catch {}
    return true;
  }, []);

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
      if (announcedTrackSerialRef.current !== trackLoadSerialRef.current) {
        const trackId = currentTrackIdRef.current;
        if (trackId) {
          announcedTrackSerialRef.current = trackLoadSerialRef.current;
          showNowPlayingBanner(trackId);
        }
      }
    } catch {
      if (requestSerial === playRequestSerialRef.current && canPlay()) {
        pendingAutoplayRef.current = true;
      }
    }
  }, [canPlay, getTargetVolume, rampVolume, showNowPlayingBanner]);

  const resetPlaylist = React.useCallback((keepZone: NavigationMusicZone = zoneRef.current) => {
    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); } catch {}
    cycleRef.current = [];
    cursorRef.current = 0;
    currentTrackIdRef.current = null;
    explicitTrackActiveRef.current = false;
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
    explicitTrackActiveRef.current = false;
    announcedTrackSerialRef.current = trackLoadSerialRef.current;
    clearNowPlayingTimers();
    setNowPlayingVisible(false);
    setNowPlaying(null);
    cancelVolumeRamp();

    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); } catch {}
    try { audio.currentTime = 0; } catch {}
    try { audio.removeAttribute("src"); } catch {}
    try { audio.load(); } catch {}
  }, [cancelVolumeRamp, clearNowPlayingTimers]);

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
      if (explicitTrackActiveRef.current) explicitTrackActiveRef.current = false;
      if (getEnabledTrackIds(prefsRef.current).length > 0 && loadNextTrack(audio)) {
        void requestPlay();
        return;
      }
      currentTrackIdRef.current = null;
      try { audio.removeAttribute("src"); } catch {}
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      mountedRef.current = false;
      cancelVolumeRamp();
      clearNowPlayingTimers();
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
    if (typeof window === "undefined") return;
    const onAwenaMusicRequest = (event: Event) => {
      const detail = (event as CustomEvent<AwenaNavigationMusicRequestDetail>).detail;
      if (detail?.action !== "play" || !detail.trackId) return;
      // Never let an Awena command bypass the PLAY silence contract.
      if (!zoneRef.current || gameplayActive || isGameplayRouteName(route)) return;
      const settings = prefsRef.current;
      if (muted || !settings.masterEnabled || !settings.navigationMusicEnabled) return;
      const audio = audioRef.current;
      if (!audio) return;
      if (!loadRequestedTrack(audio, detail.trackId)) return;
      void requestPlay();
    };
    window.addEventListener(AWENA_NAVIGATION_MUSIC_REQUEST_EVENT, onAwenaMusicRequest as EventListener);
    return () => window.removeEventListener(AWENA_NAVIGATION_MUSIC_REQUEST_EVENT, onAwenaMusicRequest as EventListener);
  }, [gameplayActive, loadRequestedTrack, muted, requestPlay, route]);

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
    const allowed = !muted
      && prefs.masterEnabled
      && prefs.navigationMusicEnabled
      && (explicitTrackActiveRef.current || getEnabledTrackIds(prefs).length > 0);
    if (!allowed) {
      try { audio.pause(); } catch {}
      clearNowPlayingTimers();
      setNowPlayingVisible(false);
      setNowPlaying(null);
      return;
    }
    if (zoneRef.current && !pausedByPreviewRef.current) void requestPlay();
  }, [muted, prefs.masterEnabled, prefs.navigationMusicEnabled, prefs.enabledTrackIds, clearNowPlayingTimers, requestPlay]);

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
      } else {
        void requestPlay();
      }
    };
    window.addEventListener(NAVIGATION_MUSIC_PREVIEW_EVENT, onPreview as EventListener);
    return () => window.removeEventListener(NAVIGATION_MUSIC_PREVIEW_EVENT, onPreview as EventListener);
  }, [requestPlay]);


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

  if (!nowPlaying) return null;

  const accent = (theme as any)?.navAccent ?? theme.primary ?? "#22e6ff";
  const panel = theme.navBackground
    ?? (theme as any)?.navBg
    ?? `linear-gradient(135deg, ${theme.card ?? "#090b12"}, ${theme.bg ?? "#05060a"})`;
  const text = theme.text ?? "#ffffff";

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        zIndex: 10050,
        top: "calc(env(safe-area-inset-top, 0px) + 7px)",
        left: "50%",
        maxWidth: "min(calc(100vw - 28px), 360px)",
        transform: nowPlayingVisible ? "translate(-50%, 0) scale(1)" : "translate(-50%, -10px) scale(.97)",
        opacity: nowPlayingVisible ? 1 : 0,
        transition: "opacity 240ms ease, transform 280ms cubic-bezier(.2,.8,.2,1)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 30,
          padding: "5px 11px 5px 7px",
          borderRadius: 999,
          border: `1px solid ${accent}88`,
          background: panel,
          color: text,
          boxShadow: `0 8px 24px rgba(0,0,0,.34), 0 0 18px ${accent}35`,
          backdropFilter: "blur(14px) saturate(1.18)",
          WebkitBackdropFilter: "blur(14px) saturate(1.18)",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            flex: "0 0 22px",
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            color: accent,
            background: `${accent}18`,
            boxShadow: `inset 0 0 0 1px ${accent}48, 0 0 12px ${accent}25`,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l10-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="16" cy="16" r="3" />
          </svg>
        </span>
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11.5,
            lineHeight: 1.1,
            fontWeight: 950,
            letterSpacing: .2,
            textShadow: `0 0 10px ${accent}35`,
          }}
        >
          {nowPlaying.title}
        </span>
      </div>
    </div>
  );
}
