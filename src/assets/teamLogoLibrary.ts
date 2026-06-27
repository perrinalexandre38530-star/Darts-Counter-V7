// @ts-nocheck
// =============================================================
// src/assets/teamLogoLibrary.ts
// Bibliothèque interne de logos d'équipe prêts à choisir.
// Source graphique : assets/team_logos/team_logo_XXX.webp.
// Les fichiers sont rangés volontairement par numérotation simple
// pour pouvoir en ajouter sans casser l'ordre du sélecteur.
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
  | "football"
  | "petanque"
  | "babyfoot"
  | "pingpong"
  | "molkky"
  | "dicegame"
  | "multisport";

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
  { id: "football", label: "Foot" },
  { id: "petanque", label: "Pétanque" },
  { id: "babyfoot", label: "Baby-foot" },
  { id: "pingpong", label: "Ping-pong" },
  { id: "molkky", label: "Mölkky" },
  { id: "dicegame", label: "Dés" },
  { id: "multisport", label: "Multi" },
];

export const TEAM_LOGO_LIBRARY: TeamLogoTemplate[] = [
  {
    id: "team_logo_001",
    fileName: "team_logo_001.webp",
    label: "Logo 001",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo001', 'esport', 'mascot', 'mascotte'],
    src: teamLogo001,
  },
  {
    id: "team_logo_002",
    fileName: "team_logo_002.webp",
    label: "Logo 002",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo002', 'esport', 'mascot', 'mascotte'],
    src: teamLogo002,
  },
  {
    id: "team_logo_003",
    fileName: "team_logo_003.webp",
    label: "Logo 003",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo003', 'esport', 'mascot', 'mascotte'],
    src: teamLogo003,
  },
  {
    id: "team_logo_004",
    fileName: "team_logo_004.webp",
    label: "Logo 004",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo004', 'esport', 'mascot', 'mascotte'],
    src: teamLogo004,
  },
  {
    id: "team_logo_005",
    fileName: "team_logo_005.webp",
    label: "Logo 005",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo005', 'esport', 'mascot', 'mascotte'],
    src: teamLogo005,
  },
  {
    id: "team_logo_006",
    fileName: "team_logo_006.webp",
    label: "Logo 006",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo006', 'esport', 'mascot', 'mascotte'],
    src: teamLogo006,
  },
  {
    id: "team_logo_007",
    fileName: "team_logo_007.webp",
    label: "Logo 007",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo007', 'esport', 'mascot', 'mascotte'],
    src: teamLogo007,
  },
  {
    id: "team_logo_008",
    fileName: "team_logo_008.webp",
    label: "Logo 008",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo008', 'esport', 'mascot', 'mascotte'],
    src: teamLogo008,
  },
  {
    id: "team_logo_009",
    fileName: "team_logo_009.webp",
    label: "Logo 009",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo009', 'esport', 'mascot', 'mascotte'],
    src: teamLogo009,
  },
  {
    id: "team_logo_010",
    fileName: "team_logo_010.webp",
    label: "Logo 010",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo010', 'esport', 'mascot', 'mascotte'],
    src: teamLogo010,
  },
  {
    id: "team_logo_011",
    fileName: "team_logo_011.webp",
    label: "Logo 011",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo011', 'esport', 'mascot', 'mascotte'],
    src: teamLogo011,
  },
  {
    id: "team_logo_012",
    fileName: "team_logo_012.webp",
    label: "Logo 012",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo012', 'esport', 'mascot', 'mascotte'],
    src: teamLogo012,
  },
  {
    id: "team_logo_013",
    fileName: "team_logo_013.webp",
    label: "Logo 013",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo013', 'esport', 'mascot', 'mascotte'],
    src: teamLogo013,
  },
  {
    id: "team_logo_014",
    fileName: "team_logo_014.webp",
    label: "Logo 014",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo014', 'esport', 'mascot', 'mascotte'],
    src: teamLogo014,
  },
  {
    id: "team_logo_015",
    fileName: "team_logo_015.webp",
    label: "Logo 015",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo015', 'esport', 'mascot', 'mascotte'],
    src: teamLogo015,
  },
  {
    id: "team_logo_016",
    fileName: "team_logo_016.webp",
    label: "Logo 016",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo016', 'esport', 'mascot', 'mascotte'],
    src: teamLogo016,
  },
  {
    id: "team_logo_017",
    fileName: "team_logo_017.webp",
    label: "Logo 017",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo017', 'esport', 'mascot', 'mascotte'],
    src: teamLogo017,
  },
  {
    id: "team_logo_018",
    fileName: "team_logo_018.webp",
    label: "Logo 018",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo018', 'esport', 'mascot', 'mascotte'],
    src: teamLogo018,
  },
  {
    id: "team_logo_019",
    fileName: "team_logo_019.webp",
    label: "Logo 019",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo019', 'esport', 'mascot', 'mascotte'],
    src: teamLogo019,
  },
  {
    id: "team_logo_020",
    fileName: "team_logo_020.webp",
    label: "Logo 020",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo020', 'esport', 'mascot', 'mascotte'],
    src: teamLogo020,
  },
  {
    id: "team_logo_021",
    fileName: "team_logo_021.webp",
    label: "Logo 021",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo021', 'esport', 'mascot', 'mascotte'],
    src: teamLogo021,
  },
  {
    id: "team_logo_022",
    fileName: "team_logo_022.webp",
    label: "Logo 022",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo022', 'esport', 'mascot', 'mascotte'],
    src: teamLogo022,
  },
  {
    id: "team_logo_023",
    fileName: "team_logo_023.webp",
    label: "Logo 023",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo023', 'esport', 'mascot', 'mascotte'],
    src: teamLogo023,
  },
  {
    id: "team_logo_024",
    fileName: "team_logo_024.webp",
    label: "Logo 024",
    category: "darts",
    tags: ['popular', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo024', 'esport', 'mascot', 'mascotte'],
    src: teamLogo024,
  },
  {
    id: "team_logo_025",
    fileName: "team_logo_025.webp",
    label: "Logo 025",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo025', 'esport', 'mascot', 'mascotte'],
    src: teamLogo025,
  },
  {
    id: "team_logo_026",
    fileName: "team_logo_026.webp",
    label: "Logo 026",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo026'],
    src: teamLogo026,
  },
  {
    id: "team_logo_027",
    fileName: "team_logo_027.webp",
    label: "Logo 027",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo027'],
    src: teamLogo027,
  },
  {
    id: "team_logo_028",
    fileName: "team_logo_028.webp",
    label: "Logo 028",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo028'],
    src: teamLogo028,
  },
  {
    id: "team_logo_029",
    fileName: "team_logo_029.webp",
    label: "Logo 029",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo029'],
    src: teamLogo029,
  },
  {
    id: "team_logo_030",
    fileName: "team_logo_030.webp",
    label: "Logo 030",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo030'],
    src: teamLogo030,
  },
  {
    id: "team_logo_031",
    fileName: "team_logo_031.webp",
    label: "Logo 031",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo031'],
    src: teamLogo031,
  },
  {
    id: "team_logo_032",
    fileName: "team_logo_032.webp",
    label: "Logo 032",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo032'],
    src: teamLogo032,
  },
  {
    id: "team_logo_033",
    fileName: "team_logo_033.webp",
    label: "Logo 033",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo033'],
    src: teamLogo033,
  },
  {
    id: "team_logo_035",
    fileName: "team_logo_035.webp",
    label: "Logo 035",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo035'],
    src: teamLogo035,
  },
  {
    id: "team_logo_036",
    fileName: "team_logo_036.webp",
    label: "Logo 036",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo036'],
    src: teamLogo036,
  },
  {
    id: "team_logo_037",
    fileName: "team_logo_037.webp",
    label: "Logo 037",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo037'],
    src: teamLogo037,
  },
  {
    id: "team_logo_038",
    fileName: "team_logo_038.webp",
    label: "Logo 038",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo038'],
    src: teamLogo038,
  },
  {
    id: "team_logo_039",
    fileName: "team_logo_039.webp",
    label: "Logo 039",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo039'],
    src: teamLogo039,
  },
  {
    id: "team_logo_040",
    fileName: "team_logo_040.webp",
    label: "Logo 040",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo040'],
    src: teamLogo040,
  },
  {
    id: "team_logo_041",
    fileName: "team_logo_041.webp",
    label: "Logo 041",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo041'],
    src: teamLogo041,
  },
  {
    id: "team_logo_042",
    fileName: "team_logo_042.webp",
    label: "Logo 042",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo042'],
    src: teamLogo042,
  },
  {
    id: "team_logo_043",
    fileName: "team_logo_043.webp",
    label: "Logo 043",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo043'],
    src: teamLogo043,
  },
  {
    id: "team_logo_044",
    fileName: "team_logo_044.webp",
    label: "Logo 044",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo044'],
    src: teamLogo044,
  },
  {
    id: "team_logo_045",
    fileName: "team_logo_045.webp",
    label: "Logo 045",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo045'],
    src: teamLogo045,
  },
  {
    id: "team_logo_046",
    fileName: "team_logo_046.webp",
    label: "Logo 046",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo046'],
    src: teamLogo046,
  },
  {
    id: "team_logo_047",
    fileName: "team_logo_047.webp",
    label: "Logo 047",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo047'],
    src: teamLogo047,
  },
  {
    id: "team_logo_048",
    fileName: "team_logo_048.webp",
    label: "Logo 048",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo048'],
    src: teamLogo048,
  },
  {
    id: "team_logo_049",
    fileName: "team_logo_049.webp",
    label: "Logo 049",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo049'],
    src: teamLogo049,
  },
  {
    id: "team_logo_050",
    fileName: "team_logo_050.webp",
    label: "Logo 050",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo050'],
    src: teamLogo050,
  },
  {
    id: "team_logo_051",
    fileName: "team_logo_051.webp",
    label: "Logo 051",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo051'],
    src: teamLogo051,
  },
  {
    id: "team_logo_052",
    fileName: "team_logo_052.webp",
    label: "Logo 052",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo052'],
    src: teamLogo052,
  },
  {
    id: "team_logo_053",
    fileName: "team_logo_053.webp",
    label: "Logo 053",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo053'],
    src: teamLogo053,
  },
  {
    id: "team_logo_054",
    fileName: "team_logo_054.webp",
    label: "Logo 054",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo054'],
    src: teamLogo054,
  },
  {
    id: "team_logo_055",
    fileName: "team_logo_055.webp",
    label: "Logo 055",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo055'],
    src: teamLogo055,
  },
  {
    id: "team_logo_056",
    fileName: "team_logo_056.webp",
    label: "Logo 056",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo056'],
    src: teamLogo056,
  },
  {
    id: "team_logo_057",
    fileName: "team_logo_057.webp",
    label: "Logo 057",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo057'],
    src: teamLogo057,
  },
  {
    id: "team_logo_058",
    fileName: "team_logo_058.webp",
    label: "Logo 058",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo058'],
    src: teamLogo058,
  },
  {
    id: "team_logo_059",
    fileName: "team_logo_059.webp",
    label: "Logo 059",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo059'],
    src: teamLogo059,
  },
  {
    id: "team_logo_060",
    fileName: "team_logo_060.webp",
    label: "Logo 060",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo060'],
    src: teamLogo060,
  },
  {
    id: "team_logo_061",
    fileName: "team_logo_061.webp",
    label: "Logo 061",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo061'],
    src: teamLogo061,
  },
  {
    id: "team_logo_062",
    fileName: "team_logo_062.webp",
    label: "Logo 062",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo062'],
    src: teamLogo062,
  },
  {
    id: "team_logo_063",
    fileName: "team_logo_063.webp",
    label: "Logo 063",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo063'],
    src: teamLogo063,
  },
  {
    id: "team_logo_064",
    fileName: "team_logo_064.webp",
    label: "Logo 064",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo064'],
    src: teamLogo064,
  },
  {
    id: "team_logo_065",
    fileName: "team_logo_065.webp",
    label: "Logo 065",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo065'],
    src: teamLogo065,
  },
  {
    id: "team_logo_066",
    fileName: "team_logo_066.webp",
    label: "Logo 066",
    category: "darts",
    tags: ['darts', 'team', 'logo', 'club', 'darts', 'fléchettes', 'flechettes', 'logo066'],
    src: teamLogo066,
  },
];

export function getRandomTeamLogo(category?: TeamLogoCategory | "all") {
  const wanted = String(category || "all");
  const filtered = TEAM_LOGO_LIBRARY.filter((logo) => {
    if (!wanted || wanted === "all") return true;
    if (wanted === "popular") return (logo.tags || []).includes("popular");
    return logo.category === wanted;
  });
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
