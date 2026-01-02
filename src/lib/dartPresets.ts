// =============================================================
// src/lib/dartPresets.ts
// Bibliothèque de sets de fléchettes "cartoon" pré-définis
// - Utilisés par DartSetSelector (onglet "Presets")
// =============================================================

export type DartPresetTheme =
  | "gold"
  | "grey"
  | "yellow"
  | "white"
  | "red"
  | "green"
  | "blue"
  | "pink"
  | "purple";

export type DartPreset = {
  id: string;
  name: string;
  imgUrlMain: string;   // 1024x1024
  imgUrlThumb: string;  // 256x256
  theme: DartPresetTheme;
};

export const dartPresets: DartPreset[] = [
  {
    id: "gold-darts",
    name: "Gold",
    imgUrlMain: "/images/darts/gold-darts-1024.png",
    imgUrlThumb: "/images/darts/gold-darts-256.png",
    theme: "gold",
  },
  {
    id: "jack-daniels",
    name: "Jack Daniels",
    imgUrlMain: "/images/darts/jack-daniels-1024.png",
    imgUrlThumb: "/images/darts/jack-daniels-256.png",
    theme: "grey",
  },
  {
    id: "rose-kuli-us",
    name: "Rose Kuli US",
    imgUrlMain: "/images/darts/rose-kuli-us-1024.png",
    imgUrlThumb: "/images/darts/rose-kuli-us-256.png",
    theme: "red",
  },
  {
    id: "rose-kuli-butterfly",
    name: "Rose Kuli Butterfly",
    imgUrlMain: "/images/darts/rose-kuli-butterfly-1024.png",
    imgUrlThumb: "/images/darts/rose-kuli-butterfly-256.png",
    theme: "yellow",
  },
  {
    id: "rose-kuli-red",
    name: "Rose Kuli Red",
    imgUrlMain: "/images/darts/rose-kuli-red-1024.png",
    imgUrlThumb: "/images/darts/rose-kuli-red-256.png",
    theme: "red",
  },
  {
    id: "koto-brass-red",
    name: "Koto Brass Red",
    imgUrlMain: "/images/darts/koto-brass-red-1024.png",
    imgUrlThumb: "/images/darts/koto-brass-red-256.png",
    theme: "white",
  },
  {
    id: "koto-kingprove",
    name: "Koto Kingprove",
    imgUrlMain: "/images/darts/koto-kingprove-1024.png",
    imgUrlThumb: "/images/darts/koto-kingprove-256.png",
    theme: "blue",
  },
  {
    id: "winmau-aspria",
    name: "Winmau Aspria",
    imgUrlMain: "/images/darts/winmau-aspria-1024.png",
    imgUrlThumb: "/images/darts/winmau-aspria-256.png",
    theme: "grey",
  },
  {
    id: "winmau-firestorm",
    name: "Winmau Firestorm",
    imgUrlMain: "/images/darts/winmau-firestorm-1024.png",
    imgUrlThumb: "/images/darts/winmau-firestorm-256.png",
    theme: "grey",
  },
  {
    id: "winmau-xenon",
    name: "Winmau Xenon",
    imgUrlMain: "/images/darts/winmau-xenon-1024.png",
    imgUrlThumb: "/images/darts/winmau-xenon-256.png",
    theme: "white",
  },
  {
    id: "winmau-foxfire-urban",
    name: "Winmau Foxfire Urban",
    imgUrlMain: "/images/darts/winmau-foxfire-urban-1024.png",
    imgUrlThumb: "/images/darts/winmau-foxfire-urban-256.png",
    theme: "grey", // ⚠️ corrigé : "Grey" → "grey"
  },
  {
    id: "winmau-epix",
    name: "Winmau Epix",
    imgUrlMain: "/images/darts/winmau-epix-1024.png",
    imgUrlThumb: "/images/darts/winmau-epix-256.png",
    theme: "white",
  },
  {
    id: "winmau-cypher",
    name: "Winmau Cypher",
    imgUrlMain: "/images/darts/winmau-cypher-1024.png",
    imgUrlThumb: "/images/darts/winmau-cypher-256.png",
    theme: "white",
  },
  {
    id: "winmau-neutron",
    name: "Winmau Neutron",
    imgUrlMain: "/images/darts/winmau-neutron-1024.png",
    imgUrlThumb: "/images/darts/winmau-neutron-256.png",
    theme: "white",
  },
  {
    id: "target-exo03",
    name: "Target Exo",
    imgUrlMain: "/images/darts/target-exo03-1024.png",
    imgUrlThumb: "/images/darts/target-exo03-256.png",
    theme: "white",
  },
  {
    id: "target-975-ultra",
    name: "Target 975 Ultra",
    imgUrlMain: "/images/darts/target-975-ultra-1024.png",
    imgUrlThumb: "/images/darts/target-975-ultra-256.png",
    theme: "blue",
  },
  {
    id: "target-darth-vader-sith-lord",
    name: "DarthVader SithLord",
    imgUrlMain: "/images/darts/target-darth-vader-sith-lord-1024.png",
    imgUrlThumb: "/images/darts/target-darth-vader-sith-lord-256.png",
    theme: "white",
  },
  {
    id: "harrows-ryan-searle",
    name: "Harrows Ryan Searle",
    imgUrlMain: "/images/darts/harrows-ryan-searle-1024.png",
    imgUrlThumb: "/images/darts/harrows-ryan-searle-256.png",
    theme: "pink",
  },
  {
    id: "harrows-voodoo-brass",
    name: "Voodoo Brass",
    imgUrlMain: "/images/darts/harrows-voodoo-brass-1024.png",
    imgUrlThumb: "/images/darts/harrows-voodoo-brass-256.png",
    theme: "gold",
  },
  {
    id: "harrows-chizzy",
    name: "Harrows Chizzy",
    imgUrlMain: "/images/darts/harrows-chizzy-1024.png",
    imgUrlThumb: "/images/darts/harrows-chizzy-256.png",
    theme: "gold",
  },
];
