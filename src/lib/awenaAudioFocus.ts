export const AWENA_AUDIO_FOCUS_EVENT = "dc:awena-audio-focus";

export type AwenaAudioFocusSource = "voice" | "video";

export type AwenaAudioFocusDetail = {
  active: boolean;
  source: AwenaAudioFocusSource;
  token: string;
  activeCount: number;
};

const activeTokens = new Map<string, AwenaAudioFocusSource>();

function emit(source: AwenaAudioFocusSource, token: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AwenaAudioFocusDetail>(AWENA_AUDIO_FOCUS_EVENT, {
    detail: {
      active: activeTokens.size > 0,
      source,
      token,
      activeCount: activeTokens.size,
    },
  }));
}

/**
 * Awena has exclusive priority over navigation music while she is speaking.
 * Tokens make nested sources safe: closing a video must not resume music if a
 * voice utterance is still active (and vice versa).
 */
export function acquireAwenaAudioFocus(source: AwenaAudioFocusSource, token: string): string {
  const key = String(token || "").trim() || `awena-${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  activeTokens.set(key, source);
  emit(source, key);
  return key;
}

export function releaseAwenaAudioFocus(token: string): void {
  const key = String(token || "").trim();
  if (!key) return;
  const source = activeTokens.get(key);
  if (!source) return;
  activeTokens.delete(key);
  emit(source, key);
}

export function releaseAwenaAudioFocusBySource(source: AwenaAudioFocusSource): void {
  let changed = false;
  for (const [token, tokenSource] of activeTokens) {
    if (tokenSource !== source) continue;
    activeTokens.delete(token);
    changed = true;
  }
  if (changed) emit(source, `awena-${source}-release-all`);
}

export function isAwenaAudioFocusActive(): boolean {
  return activeTokens.size > 0;
}
