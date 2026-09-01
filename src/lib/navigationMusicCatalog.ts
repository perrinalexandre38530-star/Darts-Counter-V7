import stadiumPulseUrl from "../assets/audio/navigation/multisports_scoring_nav.m4a";
import victoryCircuitUrl from "../assets/audio/navigation/msamstp_nav.m4a";
import { contentPackAssetUrl } from "./contentPacks";

const neonOverdriveUrl = contentPackAssetUrl("navigation-music", "ms_electrodyn_nav.webm");
const electricHorizonUrl = contentPackAssetUrl("navigation-music", "ms_electrodyn_2_nav.webm");
const midnightEnigmaUrl = contentPackAssetUrl("navigation-music", "midnight_enigma_nav.webm");
const shadowFrequencyUrl = contentPackAssetUrl("navigation-music", "shadow_frequency_nav.webm");
const titanGrooveUrl = contentPackAssetUrl("navigation-music", "titan_groove_nav.webm");
const nightDriveUrl = contentPackAssetUrl("navigation-music", "night_drive_nav.webm");
const stellarRiotUrl = contentPackAssetUrl("navigation-music", "stellar_riot_nav.webm");
const bassNebulaUrl = contentPackAssetUrl("navigation-music", "bass_nebula_nav.webm");
const orbitalEchoUrl = contentPackAssetUrl("navigation-music", "orbital_echo_nav.webm");
const garageImpactUrl = contentPackAssetUrl("navigation-music", "garage_impact_nav.webm");
const pixelAscensionUrl = contentPackAssetUrl("navigation-music", "pixel_ascension_nav.webm");
const dreamwaveHorizonUrl = contentPackAssetUrl("navigation-music", "dreamwave_horizon_nav.webm");
const steelReactorUrl = contentPackAssetUrl("navigation-music", "steel_reactor_nav.webm");
const arenaUprisingUrl = contentPackAssetUrl("navigation-music", "arena_uprising_nav.webm");
const stoneReverieUrl = contentPackAssetUrl("navigation-music", "stone_reverie_nav.webm");
const obsidianFlowUrl = contentPackAssetUrl("navigation-music", "obsidian_flow_nav.webm");
const heartwaveAnthemUrl = contentPackAssetUrl("navigation-music", "heartwave_anthem_nav.webm");
const linearSkylineUrl = contentPackAssetUrl("navigation-music", "linear_skyline_nav.webm");
const orientalSurgeUrl = contentPackAssetUrl("navigation-music", "oriental_surge_nav.webm");
const neonCaravanUrl = contentPackAssetUrl("navigation-music", "neon_caravan_nav.webm");
const basslineJackpotUrl = contentPackAssetUrl("navigation-music", "bass_bet_nav.webm");
const pulseWagerUrl = contentPackAssetUrl("navigation-music", "bet_bass_nav.webm");
const distortedHorizonUrl = contentPackAssetUrl("navigation-music", "distorted_bed_nav.webm");
const temporalDriveUrl = contentPackAssetUrl("navigation-music", "temporal_drive_nav.webm");
const scoringOvertureUrl = contentPackAssetUrl("navigation-music", "scoring_overture_nav.webm");
const dartsVanguardUrl = contentPackAssetUrl("navigation-music", "darts_vanguard_nav.webm");
const temporalResolveUrl = contentPackAssetUrl("navigation-music", "temporal_resolve_nav.webm");

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
  {
    id: "stone_reverie",
    name: "Stone Reverie",
    subtitle: { fr: "Électro fluide, lumineuse et contemplative", en: "Fluid, luminous and contemplative electro", es: "Electro fluida, luminosa y contemplativa" },
    url: stoneReverieUrl,
  },
  {
    id: "obsidian_flow",
    name: "Obsidian Flow",
    subtitle: { fr: "Ambiance profonde, minérale et hypnotique", en: "Deep, mineral and hypnotic atmosphere", es: "Atmósfera profunda, mineral e hipnótica" },
    url: obsidianFlowUrl,
  },
  {
    id: "heartwave_anthem",
    name: "Heartwave Anthem",
    subtitle: { fr: "House mélodique, pulsation lumineuse et montée émotionnelle", en: "Melodic house, bright pulse and emotional build", es: "House melódico, pulso luminoso y subida emocional" },
    url: heartwaveAnthemUrl,
  },
  {
    id: "linear_skyline",
    name: "Linear Skyline",
    subtitle: { fr: "Progressive house aérienne et trajectoire régulière", en: "Airy progressive house with a steady trajectory", es: "Progressive house aérea con trayectoria constante" },
    url: linearSkylineUrl,
  },
  {
    id: "oriental_surge",
    name: "Oriental Surge",
    subtitle: { fr: "Lead oriental, énergie club et rythme incisif", en: "Oriental lead, club energy and a sharp rhythm", es: "Melodía oriental, energía de club y ritmo incisivo" },
    url: orientalSurgeUrl,
  },
  {
    id: "neon_caravan",
    name: "Neon Caravan",
    subtitle: { fr: "Cordes orientales, basses électro et groove nomade", en: "Oriental strings, electro bass and nomadic groove", es: "Cuerdas orientales, bajos electro y groove nómada" },
    url: neonCaravanUrl,
  },
  {
    id: "bassline_jackpot",
    name: "Bassline Jackpot",
    subtitle: { fr: "Basses nerveuses, tension club et montée progressive", en: "Driving bass, club tension and a progressive build", es: "Bajos intensos, tensión club y subida progresiva" },
    url: basslineJackpotUrl,
  },
  {
    id: "pulse_wager",
    name: "Pulse Wager",
    subtitle: { fr: "Électro rythmée, pulsation directe et énergie compétitive", en: "Rhythmic electro, direct pulse and competitive energy", es: "Electro rítmica, pulso directo y energía competitiva" },
    url: pulseWagerUrl,
  },
  {
    id: "distorted_horizon",
    name: "Distorted Horizon",
    subtitle: { fr: "Synthés saturés, batterie massive et tension futuriste", en: "Distorted synths, massive drums and futuristic tension", es: "Sintetizadores saturados, batería masiva y tensión futurista" },
    url: distortedHorizonUrl,
  },
  {
    id: "temporal_drive",
    name: "Temporal Drive",
    subtitle: { fr: "Progression hypnotique, pulsation cinématique et voyage temporel", en: "Hypnotic progression, cinematic pulse and temporal journey", es: "Progresión hipnótica, pulso cinematográfico y viaje temporal" },
    url: temporalDriveUrl,
  },
  {
    id: "scoring_overture",
    name: "Scoring Overture",
    subtitle: { fr: "Ouverture épique, percussions sportives et montée orchestrale", en: "Epic overture, sporting percussion and orchestral build", es: "Obertura épica, percusión deportiva y subida orquestal" },
    url: scoringOvertureUrl,
  },
  {
    id: "darts_vanguard",
    name: "Darts Vanguard",
    subtitle: { fr: "Percussions cinématiques, tension sombre et montée de tournoi", en: "Cinematic percussion, dark tension and tournament build", es: "Percusión cinematográfica, tensión oscura y subida de torneo" },
    url: dartsVanguardUrl,
  },
  {
    id: "temporal_resolve",
    name: "Temporal Resolve",
    subtitle: { fr: "Cordes épiques, pulsation urbaine et progression héroïque", en: "Epic strings, urban pulse and heroic progression", es: "Cuerdas épicas, pulso urbano y progresión heroica" },
    url: temporalResolveUrl,
  },
] as const;

export type NavigationMusicTrackId = (typeof NAVIGATION_MUSIC_TRACKS)[number]["id"];

export const NAVIGATION_MUSIC_TRACK_IDS = NAVIGATION_MUSIC_TRACKS.map((track) => track.id) as NavigationMusicTrackId[];

export function getNavigationMusicTrack(id: string | null | undefined) {
  return NAVIGATION_MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}
