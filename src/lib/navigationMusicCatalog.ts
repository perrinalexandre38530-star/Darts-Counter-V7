import stadiumPulseUrl from "../assets/audio/navigation/multisports_scoring_nav.m4a";
import victoryCircuitUrl from "../assets/audio/navigation/msamstp_nav.m4a";
import neonOverdriveUrl from "../assets/audio/navigation/ms_electrodyn_nav.m4a";
import electricHorizonUrl from "../assets/audio/navigation/ms_electrodyn_2_nav.m4a";

export const NAVIGATION_MUSIC_TRACKS = [
  {
    id: "stadium_pulse",
    name: "Stadium Pulse",
    subtitle: { fr: "Énergie sportive et montée progressive", en: "Sporting energy with a progressive build", es: "Energía deportiva con subida progresiva" },
    url: stadiumPulseUrl,
  },
  {
    id: "victory_circuit",
    name: "Victory Circuit",
    subtitle: { fr: "Ambiance compétition et rythme électronique", en: "Competition atmosphere and electronic rhythm", es: "Ambiente competitivo y ritmo electrónico" },
    url: victoryCircuitUrl,
  },
  {
    id: "neon_overdrive",
    name: "Neon Overdrive",
    subtitle: { fr: "Électro rapide, moderne et lumineuse", en: "Fast, modern and luminous electro", es: "Electro rápida, moderna y luminosa" },
    url: neonOverdriveUrl,
  },
  {
    id: "electric_horizon",
    name: "Electric Horizon",
    subtitle: { fr: "Atmosphère nocturne et futuriste", en: "Night-time and futuristic atmosphere", es: "Atmósfera nocturna y futurista" },
    url: electricHorizonUrl,
  },
] as const;

export type NavigationMusicTrackId = (typeof NAVIGATION_MUSIC_TRACKS)[number]["id"];

export const NAVIGATION_MUSIC_TRACK_IDS = NAVIGATION_MUSIC_TRACKS.map((track) => track.id) as NavigationMusicTrackId[];

export function getNavigationMusicTrack(id: string | null | undefined) {
  return NAVIGATION_MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}
