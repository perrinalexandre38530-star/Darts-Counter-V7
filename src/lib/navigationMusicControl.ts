import type { NavigationMusicTrackId } from "./navigationMusicCatalog";

export const AWENA_NAVIGATION_MUSIC_REQUEST_EVENT = "dc:awena-navigation-music-request";

export type AwenaNavigationMusicRequestDetail = {
  action: "play";
  trackId: NavigationMusicTrackId;
  source?: "awena";
};

export function requestNavigationMusicTrackFromAwena(trackId: NavigationMusicTrackId) {
  if (typeof window === "undefined") return false;
  window.dispatchEvent(new CustomEvent<AwenaNavigationMusicRequestDetail>(
    AWENA_NAVIGATION_MUSIC_REQUEST_EVENT,
    { detail: { action: "play", trackId, source: "awena" } },
  ));
  return true;
}
