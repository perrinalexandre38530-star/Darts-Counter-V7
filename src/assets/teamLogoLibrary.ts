// @ts-nocheck
// =============================================================
// src/assets/teamLogoLibrary.ts
// Bibliothèque interne de logos d'équipe prêts à choisir.
// IMPORTANT : les catégories ci-dessous pilotent les onglets du sélecteur.
// Un logo peut apparaître dans plusieurs onglets via ses tags.
// =============================================================

import teamLogo001 from "./team_logos/team_logo_001.webp";
import teamLogo002 from "./team_logos/team_logo_002.webp";
import teamLogo003 from "./team_logos/team_logo_003.webp";
import teamLogo004 from "./team_logos/team_logo_004.webp";
import teamLogo005 from "./team_logos/team_logo_005.webp";
import teamLogo006 from "./team_logos/team_logo_006.webp";
import teamLogo007 from "./team_logos/team_logo_007.webp";
import teamLogo008 from "./team_logos/team_logo_008.webp";
import teamLogo009 from "./team_logos/team_logo_009.webp";
import teamLogo010 from "./team_logos/team_logo_010.webp";
import teamLogo011 from "./team_logos/team_logo_011.webp";
import teamLogo012 from "./team_logos/team_logo_012.webp";
import teamLogo013 from "./team_logos/team_logo_013.webp";
import teamLogo014 from "./team_logos/team_logo_014.webp";
import teamLogo015 from "./team_logos/team_logo_015.webp";
import teamLogo016 from "./team_logos/team_logo_016.webp";
import teamLogo017 from "./team_logos/team_logo_017.webp";
import teamLogo018 from "./team_logos/team_logo_018.webp";
import teamLogo019 from "./team_logos/team_logo_019.webp";
import teamLogo020 from "./team_logos/team_logo_020.webp";
import teamLogo021 from "./team_logos/team_logo_021.webp";
import teamLogo022 from "./team_logos/team_logo_022.webp";
import teamLogo023 from "./team_logos/team_logo_023.webp";
import teamLogo024 from "./team_logos/team_logo_024.webp";
import teamLogo025 from "./team_logos/team_logo_025.webp";
import teamLogo026 from "./team_logos/team_logo_026.webp";
import teamLogo027 from "./team_logos/team_logo_027.webp";
import teamLogo028 from "./team_logos/team_logo_028.webp";
import teamLogo029 from "./team_logos/team_logo_029.webp";
import teamLogo030 from "./team_logos/team_logo_030.webp";
import teamLogo031 from "./team_logos/team_logo_031.webp";
import teamLogo032 from "./team_logos/team_logo_032.webp";
import teamLogo033 from "./team_logos/team_logo_033.webp";
import teamLogo035 from "./team_logos/team_logo_035.webp";
import teamLogo036 from "./team_logos/team_logo_036.webp";
import teamLogo037 from "./team_logos/team_logo_037.webp";
import teamLogo038 from "./team_logos/team_logo_038.webp";
import teamLogo039 from "./team_logos/team_logo_039.webp";
import teamLogo040 from "./team_logos/team_logo_040.webp";
import teamLogo041 from "./team_logos/team_logo_041.webp";
import teamLogo042 from "./team_logos/team_logo_042.webp";
import teamLogo043 from "./team_logos/team_logo_043.webp";
import teamLogo044 from "./team_logos/team_logo_044.webp";
import teamLogo045 from "./team_logos/team_logo_045.webp";
import teamLogo046 from "./team_logos/team_logo_046.webp";
import teamLogo047 from "./team_logos/team_logo_047.webp";
import teamLogo048 from "./team_logos/team_logo_048.webp";
import teamLogo049 from "./team_logos/team_logo_049.webp";
import teamLogo050 from "./team_logos/team_logo_050.webp";
import teamLogo051 from "./team_logos/team_logo_051.webp";
import teamLogo052 from "./team_logos/team_logo_052.webp";
import teamLogo053 from "./team_logos/team_logo_053.webp";
import teamLogo054 from "./team_logos/team_logo_054.webp";
import teamLogo055 from "./team_logos/team_logo_055.webp";
import teamLogo056 from "./team_logos/team_logo_056.webp";
import teamLogo057 from "./team_logos/team_logo_057.webp";
import teamLogo058 from "./team_logos/team_logo_058.webp";
import teamLogo059 from "./team_logos/team_logo_059.webp";
import teamLogo060 from "./team_logos/team_logo_060.webp";
import teamLogo061 from "./team_logos/team_logo_061.webp";
import teamLogo062 from "./team_logos/team_logo_062.webp";
import teamLogo063 from "./team_logos/team_logo_063.webp";
import teamLogo064 from "./team_logos/team_logo_064.webp";
import teamLogo065 from "./team_logos/team_logo_065.webp";
import teamLogo066 from "./team_logos/team_logo_066.webp";

export type TeamLogoCategory =
  | "popular"
  | "darts"
  | "skulls"
  | "creatures"
  | "warriors"
  | "crests"
  | "elements";

export type TeamLogoTemplate = {
  id: string;
  fileName: string;
  label: string;
  category: TeamLogoCategory;
  tags: string[];
  src: string;
};

export const TEAM_LOGO_CATEGORIES: Array<{ id: TeamLogoCategory | "all"; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "popular", label: "Populaires" },
  { id: "darts", label: "Fléchettes" },
  { id: "skulls", label: "Crânes" },
  { id: "creatures", label: "Créatures" },
  { id: "warriors", label: "Guerriers" },
  { id: "crests", label: "Blasons" },
  { id: "elements", label: "Éléments" },
];

export const TEAM_LOGO_LIBRARY: TeamLogoTemplate[] = [
  {
    id: "team_logo_001",
    fileName: "team_logo_001.webp",
    label: "Crâne bleu",
    category: "skulls",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo001', 'popular', 'skulls', 'skull', 'crane', 'flamme', 'bleu'],
    src: teamLogo001,
  },
  {
    id: "team_logo_002",
    fileName: "team_logo_002.webp",
    label: "Cible rouge",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo002', 'popular', 'cible', 'target', 'bullseye'],
    src: teamLogo002,
  },
  {
    id: "team_logo_003",
    fileName: "team_logo_003.webp",
    label: "Loup",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo003', 'popular', 'creatures', 'loup', 'wolf', 'animal'],
    src: teamLogo003,
  },
  {
    id: "team_logo_004",
    fileName: "team_logo_004.webp",
    label: "Aigle",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo004', 'popular', 'creatures', 'aigle', 'eagle', 'animal'],
    src: teamLogo004,
  },
  {
    id: "team_logo_005",
    fileName: "team_logo_005.webp",
    label: "Dragon violet",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo005', 'popular', 'creatures', 'dragon', 'violet', 'creature'],
    src: teamLogo005,
  },
  {
    id: "team_logo_006",
    fileName: "team_logo_006.webp",
    label: "Phénix",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo006', 'popular', 'creatures', 'phenix', 'phoenix', 'feu'],
    src: teamLogo006,
  },
  {
    id: "team_logo_007",
    fileName: "team_logo_007.webp",
    label: "Crâne violet",
    category: "skulls",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo007', 'popular', 'skulls', 'skull', 'crane', 'violet'],
    src: teamLogo007,
  },
  {
    id: "team_logo_008",
    fileName: "team_logo_008.webp",
    label: "Cobra",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo008', 'popular', 'creatures', 'cobra', 'serpent', 'snake', 'animal'],
    src: teamLogo008,
  },
  {
    id: "team_logo_009",
    fileName: "team_logo_009.webp",
    label: "Pirate",
    category: "skulls",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo009', 'popular', 'skulls', 'pirate', 'skull', 'crane'],
    src: teamLogo009,
  },
  {
    id: "team_logo_010",
    fileName: "team_logo_010.webp",
    label: "Éclair",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo010', 'popular', 'elements', 'eclair', 'lightning', 'thunder', 'bleu'],
    src: teamLogo010,
  },
  {
    id: "team_logo_011",
    fileName: "team_logo_011.webp",
    label: "Spartiate",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo011', 'popular', 'warriors', 'spartan', 'guerrier', 'casque'],
    src: teamLogo011,
  },
  {
    id: "team_logo_012",
    fileName: "team_logo_012.webp",
    label: "Dragon rouge",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo012', 'popular', 'creatures', 'dragon', 'rouge', 'feu'],
    src: teamLogo012,
  },
  {
    id: "team_logo_013",
    fileName: "team_logo_013.webp",
    label: "Logo 013",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo013', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo013,
  },
  {
    id: "team_logo_014",
    fileName: "team_logo_014.webp",
    label: "Logo 014",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo014', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo014,
  },
  {
    id: "team_logo_015",
    fileName: "team_logo_015.webp",
    label: "Logo 015",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo015', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo015,
  },
  {
    id: "team_logo_016",
    fileName: "team_logo_016.webp",
    label: "Logo 016",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo016', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo016,
  },
  {
    id: "team_logo_017",
    fileName: "team_logo_017.webp",
    label: "Logo 017",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo017', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo017,
  },
  {
    id: "team_logo_018",
    fileName: "team_logo_018.webp",
    label: "Logo 018",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo018', 'popular', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo018,
  },
  {
    id: "team_logo_019",
    fileName: "team_logo_019.webp",
    label: "Logo 019",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo019', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo019,
  },
  {
    id: "team_logo_020",
    fileName: "team_logo_020.webp",
    label: "Logo 020",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo020', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo020,
  },
  {
    id: "team_logo_021",
    fileName: "team_logo_021.webp",
    label: "Logo 021",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo021', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo021,
  },
  {
    id: "team_logo_022",
    fileName: "team_logo_022.webp",
    label: "Logo 022",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo022', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo022,
  },
  {
    id: "team_logo_023",
    fileName: "team_logo_023.webp",
    label: "Logo 023",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo023', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo023,
  },
  {
    id: "team_logo_024",
    fileName: "team_logo_024.webp",
    label: "Logo 024",
    category: "creatures",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo024', 'creatures', 'animal', 'mascotte', 'creature'],
    src: teamLogo024,
  },
  {
    id: "team_logo_025",
    fileName: "team_logo_025.webp",
    label: "Logo 025",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo025', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo025,
  },
  {
    id: "team_logo_026",
    fileName: "team_logo_026.webp",
    label: "Logo 026",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo026', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo026,
  },
  {
    id: "team_logo_027",
    fileName: "team_logo_027.webp",
    label: "Logo 027",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo027', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo027,
  },
  {
    id: "team_logo_028",
    fileName: "team_logo_028.webp",
    label: "Logo 028",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo028', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo028,
  },
  {
    id: "team_logo_029",
    fileName: "team_logo_029.webp",
    label: "Logo 029",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo029', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo029,
  },
  {
    id: "team_logo_030",
    fileName: "team_logo_030.webp",
    label: "Logo 030",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo030', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo030,
  },
  {
    id: "team_logo_031",
    fileName: "team_logo_031.webp",
    label: "Logo 031",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo031', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo031,
  },
  {
    id: "team_logo_032",
    fileName: "team_logo_032.webp",
    label: "Logo 032",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo032', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo032,
  },
  {
    id: "team_logo_033",
    fileName: "team_logo_033.webp",
    label: "Logo 033",
    category: "warriors",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo033', 'warriors', 'guerrier', 'warrior', 'mascotte'],
    src: teamLogo033,
  },
  {
    id: "team_logo_035",
    fileName: "team_logo_035.webp",
    label: "Logo 035",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo035', 'popular', 'cible', 'target'],
    src: teamLogo035,
  },
  {
    id: "team_logo_036",
    fileName: "team_logo_036.webp",
    label: "Logo 036",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo036', 'popular', 'cible', 'target'],
    src: teamLogo036,
  },
  {
    id: "team_logo_037",
    fileName: "team_logo_037.webp",
    label: "Logo 037",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo037', 'popular', 'cible', 'target'],
    src: teamLogo037,
  },
  {
    id: "team_logo_038",
    fileName: "team_logo_038.webp",
    label: "Logo 038",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo038', 'cible', 'target'],
    src: teamLogo038,
  },
  {
    id: "team_logo_039",
    fileName: "team_logo_039.webp",
    label: "Logo 039",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo039', 'cible', 'target'],
    src: teamLogo039,
  },
  {
    id: "team_logo_040",
    fileName: "team_logo_040.webp",
    label: "Logo 040",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo040', 'cible', 'target'],
    src: teamLogo040,
  },
  {
    id: "team_logo_041",
    fileName: "team_logo_041.webp",
    label: "Logo 041",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo041', 'cible', 'target'],
    src: teamLogo041,
  },
  {
    id: "team_logo_042",
    fileName: "team_logo_042.webp",
    label: "Logo 042",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo042', 'cible', 'target'],
    src: teamLogo042,
  },
  {
    id: "team_logo_043",
    fileName: "team_logo_043.webp",
    label: "Logo 043",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo043', 'cible', 'target'],
    src: teamLogo043,
  },
  {
    id: "team_logo_044",
    fileName: "team_logo_044.webp",
    label: "Logo 044",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo044', 'cible', 'target'],
    src: teamLogo044,
  },
  {
    id: "team_logo_045",
    fileName: "team_logo_045.webp",
    label: "Logo 045",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo045', 'popular', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo045,
  },
  {
    id: "team_logo_046",
    fileName: "team_logo_046.webp",
    label: "Logo 046",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo046', 'popular', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo046,
  },
  {
    id: "team_logo_047",
    fileName: "team_logo_047.webp",
    label: "Logo 047",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo047', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo047,
  },
  {
    id: "team_logo_048",
    fileName: "team_logo_048.webp",
    label: "Logo 048",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo048', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo048,
  },
  {
    id: "team_logo_049",
    fileName: "team_logo_049.webp",
    label: "Logo 049",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo049', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo049,
  },
  {
    id: "team_logo_050",
    fileName: "team_logo_050.webp",
    label: "Logo 050",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo050', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo050,
  },
  {
    id: "team_logo_051",
    fileName: "team_logo_051.webp",
    label: "Logo 051",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo051', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo051,
  },
  {
    id: "team_logo_052",
    fileName: "team_logo_052.webp",
    label: "Logo 052",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo052', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo052,
  },
  {
    id: "team_logo_053",
    fileName: "team_logo_053.webp",
    label: "Logo 053",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo053', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo053,
  },
  {
    id: "team_logo_054",
    fileName: "team_logo_054.webp",
    label: "Logo 054",
    category: "elements",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo054', 'elements', 'feu', 'glace', 'foudre', 'element', 'energie'],
    src: teamLogo054,
  },
  {
    id: "team_logo_055",
    fileName: "team_logo_055.webp",
    label: "Logo 055",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo055', 'popular', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo055,
  },
  {
    id: "team_logo_056",
    fileName: "team_logo_056.webp",
    label: "Logo 056",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo056', 'popular', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo056,
  },
  {
    id: "team_logo_057",
    fileName: "team_logo_057.webp",
    label: "Logo 057",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo057', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo057,
  },
  {
    id: "team_logo_058",
    fileName: "team_logo_058.webp",
    label: "Logo 058",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo058', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo058,
  },
  {
    id: "team_logo_059",
    fileName: "team_logo_059.webp",
    label: "Logo 059",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo059', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo059,
  },
  {
    id: "team_logo_060",
    fileName: "team_logo_060.webp",
    label: "Logo 060",
    category: "crests",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo060', 'crests', 'blason', 'shield', 'couronne', 'laurier', 'embleme'],
    src: teamLogo060,
  },
  {
    id: "team_logo_061",
    fileName: "team_logo_061.webp",
    label: "Logo 061",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo061', 'cible'],
    src: teamLogo061,
  },
  {
    id: "team_logo_062",
    fileName: "team_logo_062.webp",
    label: "Logo 062",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo062', 'cible'],
    src: teamLogo062,
  },
  {
    id: "team_logo_063",
    fileName: "team_logo_063.webp",
    label: "Logo 063",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo063', 'cible'],
    src: teamLogo063,
  },
  {
    id: "team_logo_064",
    fileName: "team_logo_064.webp",
    label: "Logo 064",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo064', 'cible'],
    src: teamLogo064,
  },
  {
    id: "team_logo_065",
    fileName: "team_logo_065.webp",
    label: "Logo 065",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo065', 'cible'],
    src: teamLogo065,
  },
  {
    id: "team_logo_066",
    fileName: "team_logo_066.webp",
    label: "Logo 066",
    category: "darts",
    tags: ['team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo066', 'cible'],
    src: teamLogo066,
  },
];

export function teamLogoMatchesCategory(logo: TeamLogoTemplate, category?: TeamLogoCategory | "all") {
  const wanted = String(category || "all");
  if (!wanted || wanted === "all") return true;
  const tags = logo.tags || [];
  if (wanted === "popular") return tags.includes("popular");
  return logo.category === wanted || tags.includes(wanted);
}

export function getRandomTeamLogo(category?: TeamLogoCategory | "all") {
  const filtered = TEAM_LOGO_LIBRARY.filter((logo) => teamLogoMatchesCategory(logo, category));
  const pool = filtered.length ? filtered : TEAM_LOGO_LIBRARY;
  return pool[Math.floor(Math.random() * pool.length)] || TEAM_LOGO_LIBRARY[0];
}

export function getTeamLogoTemplateById(idOrFileName: string | null | undefined): TeamLogoTemplate | null {
  const raw = String(idOrFileName || "").trim();
  if (!raw) return null;
  return TEAM_LOGO_LIBRARY.find((logo) => logo.id === raw || logo.fileName === raw) || null;
}

export function getTeamLogoTemplateBySrc(src: string | null | undefined): TeamLogoTemplate | null {
  const raw = String(src || "").trim();
  if (!raw) return null;
  return TEAM_LOGO_LIBRARY.find((logo) => logo.src === raw || raw.includes(logo.fileName) || raw.includes(logo.id)) || null;
}

export function resolveTeamLogoSrc(idOrFileNameOrSrc: string | null | undefined): string | null {
  const raw = String(idOrFileNameOrSrc || "").trim();
  if (!raw) return null;
  const byId = getTeamLogoTemplateById(raw);
  if (byId?.src) return byId.src;
  const bySrc = getTeamLogoTemplateBySrc(raw);
  if (bySrc?.src) return bySrc.src;
  return raw;
}
