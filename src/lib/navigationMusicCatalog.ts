import stadiumPulseUrl from "../assets/audio/navigation/multisports_scoring_nav.m4a";
import victoryCircuitUrl from "../assets/audio/navigation/msamstp_nav.m4a";
import neonOverdriveUrl from "../assets/audio/navigation/ms_electrodyn_nav.m4a";
import electricHorizonUrl from "../assets/audio/navigation/ms_electrodyn_2_nav.m4a";
import midnightEnigmaUrl from "../assets/audio/navigation/midnight_enigma_nav.m4a";
import shadowFrequencyUrl from "../assets/audio/navigation/shadow_frequency_nav.m4a";
import titanGrooveUrl from "../assets/audio/navigation/titan_groove_nav.m4a";
import nightDriveUrl from "../assets/audio/navigation/night_drive_nav.m4a";
import stellarRiotUrl from "../assets/audio/navigation/stellar_riot_nav.m4a";
import bassNebulaUrl from "../assets/audio/navigation/bass_nebula_nav.m4a";
import orbitalEchoUrl from "../assets/audio/navigation/orbital_echo_nav.m4a";
import garageImpactUrl from "../assets/audio/navigation/garage_impact_nav.m4a";
import pixelAscensionUrl from "../assets/audio/navigation/pixel_ascension_nav.m4a";
import dreamwaveHorizonUrl from "../assets/audio/navigation/dreamwave_horizon_nav.m4a";
import steelReactorUrl from "../assets/audio/navigation/steel_reactor_nav.m4a";
import arenaUprisingUrl from "../assets/audio/navigation/arena_uprising_nav.m4a";

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
  {
    id: "midnight_enigma",
    name: "Midnight Enigma",
    subtitle: { fr: "Basses profondes et tension cinématique", en: "Deep bass and cinematic tension", es: "Graves profundos y tensión cinematográfica" },
    url: midnightEnigmaUrl,
  },
  {
    id: "shadow_frequency",
    name: "Shadow Frequency",
    subtitle: { fr: "Synthwave sombre, régulier et immersif", en: "Dark, steady and immersive synthwave", es: "Synthwave oscuro, constante e inmersivo" },
    url: shadowFrequencyUrl,
  },
  {
    id: "titan_groove",
    name: "Titan Groove",
    subtitle: { fr: "Électro massive et percussions puissantes", en: "Massive electro and powerful percussion", es: "Electro masiva y percusión potente" },
    url: titanGrooveUrl,
  },
  {
    id: "night_drive",
    name: "Night Drive",
    subtitle: { fr: "Voyage nocturne, hypnotique et progressif", en: "A hypnotic and progressive night journey", es: "Viaje nocturno, hipnótico y progresivo" },
    url: nightDriveUrl,
  },
  {
    id: "stellar_riot",
    name: "Stellar Riot",
    subtitle: { fr: "Rock spatial énergique, synthés et guitares", en: "Energetic space rock with synths and guitars", es: "Rock espacial enérgico con sintetizadores y guitarras" },
    url: stellarRiotUrl,
  },
  {
    id: "bass_nebula",
    name: "Bass Nebula",
    subtitle: { fr: "Basses cosmiques et progression monumentale", en: "Cosmic bass and a monumental build", es: "Graves cósmicos y progresión monumental" },
    url: bassNebulaUrl,
  },
  {
    id: "orbital_echo",
    name: "Orbital Echo",
    subtitle: { fr: "Atmosphère orbitale, lourde et hypnotique", en: "Heavy, hypnotic orbital atmosphere", es: "Atmósfera orbital, pesada e hipnótica" },
    url: orbitalEchoUrl,
  },
  {
    id: "garage_impact",
    name: "Garage Impact",
    subtitle: { fr: "Rock garage direct, puissant et percutant", en: "Direct, powerful and hard-hitting garage rock", es: "Rock de garaje directo, potente y contundente" },
    url: garageImpactUrl,
  },
  {
    id: "pixel_ascension",
    name: "Pixel Ascension",
    subtitle: { fr: "Électro rétro, mélodies lumineuses et montée orchestrale", en: "Retro electro, bright melodies and an orchestral rise", es: "Electro retro, melodías luminosas y subida orquestal" },
    url: pixelAscensionUrl,
  },
  {
    id: "dreamwave_horizon",
    name: "Dreamwave Horizon",
    subtitle: { fr: "Trance mélodique, piano aérien et énergie positive", en: "Melodic trance, airy piano and uplifting energy", es: "Trance melódico, piano etéreo y energía positiva" },
    url: dreamwaveHorizonUrl,
  },
  {
    id: "steel_reactor",
    name: "Steel Reactor",
    subtitle: { fr: "Métal industriel, synthés lourds et rythme mécanique", en: "Industrial metal, heavy synths and mechanical rhythm", es: "Metal industrial, sintetizadores pesados y ritmo mecánico" },
    url: steelReactorUrl,
  },
  {
    id: "arena_uprising",
    name: "Arena Uprising",
    subtitle: { fr: "Rock de stade rapide, chœurs et tension compétitive", en: "Fast stadium rock, crowd chants and competitive tension", es: "Rock de estadio rápido, coros y tensión competitiva" },
    url: arenaUprisingUrl,
  },
] as const;

export type NavigationMusicTrackId = (typeof NAVIGATION_MUSIC_TRACKS)[number]["id"];

export const NAVIGATION_MUSIC_TRACK_IDS = NAVIGATION_MUSIC_TRACKS.map((track) => track.id) as NavigationMusicTrackId[];

export function getNavigationMusicTrack(id: string | null | undefined) {
  return NAVIGATION_MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}
