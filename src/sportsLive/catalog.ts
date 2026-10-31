import type { SportId } from "../contexts/SportContext";
import {
  DARTS_LIVE_SOURCES,
  getAvailableRegions as getDartsAvailableRegions,
  getRecommendedSources as getDartsRecommendedSources,
} from "../dartsLive/sources";
import type { SportLiveLocaleProfile, SportLiveMeta, SportLiveRegion, SportLiveSource, SportLiveSportId } from "./types";
import { LIVE_SPORTS_APP_ORDER } from "./support";

export const SPORT_LIVE_ORDER: SportId[] = LIVE_SPORTS_APP_ORDER;

export const SPORT_LIVE_META: Record<SportLiveSportId, SportLiveMeta> = {
  darts: { id: "darts", icon: "🎯", label: "Fléchettes", shortLabel: "Darts", accent: "#ffcf5a" },
  petanque: { id: "petanque", icon: "🟠", label: "Pétanque", shortLabel: "Pétanque", accent: "#ffb65a" },
  pingpong: { id: "pingpong", icon: "🏓", label: "Ping-Pong", shortLabel: "Ping-Pong", accent: "#70d8ff" },
  babyfoot: { id: "babyfoot", icon: "⚽", label: "Baby-foot", shortLabel: "Baby-foot", accent: "#7fe2a9" },
  molkky: { id: "molkky", icon: "🪵", label: "Mölkky", shortLabel: "Mölkky", accent: "#d9b37c" },
  foot: { id: "foot", icon: "⚽", label: "Football", shortLabel: "Foot", accent: "#49e77b" },
  padel: { id: "padel", icon: "🎾", label: "Padel", shortLabel: "Padel", accent: "#d7ff75" },
  badminton: { id: "badminton", icon: "🏸", label: "Badminton", shortLabel: "Badminton", accent: "#d3a4ff" },
  cornhole: { id: "cornhole", icon: "🟫", label: "Cornhole", shortLabel: "Cornhole", accent: "#ff9b74" },
  bowling: { id: "bowling", icon: "🎳", label: "Bowling", shortLabel: "Bowling", accent: "#ff84c0" },
  archery: { id: "archery", icon: "🏹", label: "Tir à l’arc", shortLabel: "Tir à l’arc", accent: "#ff9b6b" },
  pickleball: { id: "pickleball", icon: "🏓", label: "Pickleball", shortLabel: "Pickleball", accent: "#7ee7ff" },
  frisbee: { id: "frisbee", icon: "🥏", label: "Frisbee", shortLabel: "Frisbee", accent: "#8be28b" },
  billiards: { id: "billiards", icon: "🎱", label: "Billard", shortLabel: "Billard", accent: "#4fe1a4" },
  basket: { id: "basket", icon: "🏀", label: "Basket", shortLabel: "Basket", accent: "#ff9b4f" },
  rugby: { id: "rugby", icon: "🏉", label: "Rugby", shortLabel: "Rugby", accent: "#69d08b" },
  volleyball: { id: "volleyball", icon: "🏐", label: "Volley", shortLabel: "Volley", accent: "#77b9ff" },
  tennis: { id: "tennis", icon: "🎾", label: "Tennis", shortLabel: "Tennis", accent: "#caff55" },
  chess: { id: "chess", icon: "♟️", label: "Échecs", shortLabel: "Échecs", accent: "#d9d9d9" },
  esports: { id: "esports", icon: "🎮", label: "E-sport", shortLabel: "E-sport", accent: "#b28cff" },
};

export const SPORT_LIVE_REGION_LABELS: Record<SportLiveRegion, string> = {
  global: "International",
  france: "France",
  francophone: "Francophone",
  uk_ireland: "UK & Irlande",
  north_america: "Amérique du Nord",
  oceania: "Australie & Nouvelle-Zélande",
  spain: "Espagne",
  latin_america: "Amérique latine & Caraïbes",
  dach: "Allemagne / Autriche / Suisse",
  benelux: "Benelux",
  italy: "Italie",
  portugal: "Portugal / lusophone",
  nordic_baltic: "Nordique & Baltique",
  poland: "Pologne",
  czechia: "Tchéquie",
  balkans: "Balkans",
  eastern_europe: "Europe de l'Est",
  turkey: "Turquie",
  arab_middle_east: "Monde arabe & Moyen-Orient",
  india_asia: "Inde & Asie du Sud",
  japan_asia: "Japon & Asie",
  china_asia: "Chine & Asie",
  europe: "Europe",
  asia: "Asie",
  africa: "Afrique",
};

export const SPORT_LIVE_LOCALE_PROFILES: Record<string, SportLiveLocaleProfile> = {
  fr: { locale: "fr", label: "France / francophone", preferredRegions: ["france", "francophone", "global"], fallbackRegions: ["europe", "global"] },
  en: { locale: "en", label: "UK / Ireland / English-speaking", preferredRegions: ["uk_ireland", "north_america", "oceania", "global"], fallbackRegions: ["global"] },
  es: { locale: "es", label: "España / Latinoamérica", preferredRegions: ["spain", "latin_america", "global"], fallbackRegions: ["europe", "global"] },
  de: { locale: "de", label: "DACH", preferredRegions: ["dach", "global"], fallbackRegions: ["europe", "global"] },
  it: { locale: "it", label: "Italia", preferredRegions: ["italy", "global"], fallbackRegions: ["europe", "global"] },
  pt: { locale: "pt", label: "Portugal / lusophone", preferredRegions: ["portugal", "global"], fallbackRegions: ["europe", "global"] },
  nl: { locale: "nl", label: "Nederland / Benelux", preferredRegions: ["benelux", "global"], fallbackRegions: ["europe", "global"] },
  ru: { locale: "ru", label: "Europe de l'Est", preferredRegions: ["eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  zh: { locale: "zh", label: "China / Asia", preferredRegions: ["china_asia", "asia", "global"], fallbackRegions: ["global"] },
  ja: { locale: "ja", label: "Japan / Asia", preferredRegions: ["japan_asia", "asia", "global"], fallbackRegions: ["global"] },
  ar: { locale: "ar", label: "Arab / Middle East", preferredRegions: ["arab_middle_east", "asia", "global"], fallbackRegions: ["global"] },
  hi: { locale: "hi", label: "India / Asia", preferredRegions: ["india_asia", "asia", "global"], fallbackRegions: ["global"] },
  tr: { locale: "tr", label: "Türkiye", preferredRegions: ["turkey", "global"], fallbackRegions: ["europe", "global"] },
  da: { locale: "da", label: "Danmark / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  no: { locale: "no", label: "Norge / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  sv: { locale: "sv", label: "Sverige / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  is: { locale: "is", label: "Ísland / Nordic", preferredRegions: ["nordic_baltic", "global"], fallbackRegions: ["europe", "global"] },
  pl: { locale: "pl", label: "Polska", preferredRegions: ["poland", "eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  ro: { locale: "ro", label: "România", preferredRegions: ["eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
  sr: { locale: "sr", label: "Srbija / Balkans", preferredRegions: ["balkans", "global"], fallbackRegions: ["europe", "global"] },
  hr: { locale: "hr", label: "Hrvatska / Balkans", preferredRegions: ["balkans", "global"], fallbackRegions: ["europe", "global"] },
  cs: { locale: "cs", label: "Česko", preferredRegions: ["czechia", "eastern_europe", "global"], fallbackRegions: ["europe", "global"] },
};

const OTHER_SPORT_SOURCES: SportLiveSource[] = [

  // FOOTBALL
  {
    id: "foot-thesportsdb", sport: "foot", name: "TheSportsDB Football", shortName: "TheSportsDB",
    description: "Résultats, calendrier, équipes et métadonnées football via API JSON.", kind: "live_scores",
    regions: ["global", "europe", "france", "uk_ireland", "north_america", "latin_america", "asia", "oceania"], official: false,
    homeUrl: "https://www.thesportsdb.com/", scoresUrl: "https://www.thesportsdb.com/", resultsUrl: "https://www.thesportsdb.com/", calendarUrl: "https://www.thesportsdb.com/", badges: ["SCORES", "API", "MONDE"]
  },
  {
    id: "foot-football-data", sport: "foot", name: "football-data.org", shortName: "Football-Data",
    description: "API football structurée : scores, matchs, classements et grandes compétitions européennes/mondiales.", kind: "live_scores",
    regions: ["global", "europe", "france", "uk_ireland", "spain", "dach", "italy", "portugal", "benelux"], official: false,
    homeUrl: "https://www.football-data.org/", scoresUrl: "https://www.football-data.org/", resultsUrl: "https://www.football-data.org/", calendarUrl: "https://www.football-data.org/", badges: ["FOOT", "SCORES", "EUROPE"]
  },
  {
    id: "foot-fifa", sport: "foot", name: "FIFA", shortName: "FIFA",
    description: "Compétitions mondiales, calendriers et actualités officielles du football international.", kind: "governing_body",
    regions: ["global"], official: true, homeUrl: "https://www.fifa.com/", resultsUrl: "https://www.fifa.com/tournaments", calendarUrl: "https://www.fifa.com/tournaments", badges: ["FIFA", "MONDE"]
  },
  {
    id: "foot-uefa", sport: "foot", name: "UEFA", shortName: "UEFA",
    description: "Compétitions européennes, résultats, calendrier et actualités officielles.", kind: "governing_body",
    regions: ["europe", "france", "uk_ireland", "spain", "dach", "italy", "portugal", "benelux", "eastern_europe", "balkans", "nordic_baltic"], official: true, homeUrl: "https://www.uefa.com/", scoresUrl: "https://www.uefa.com/uefachampionsleague/fixtures-results/", resultsUrl: "https://www.uefa.com/uefachampionsleague/fixtures-results/", calendarUrl: "https://www.uefa.com/", badges: ["UEFA", "EUROPE"]
  },
  {
    id: "foot-ligue1", sport: "foot", name: "Ligue 1", shortName: "Ligue 1",
    description: "Actualités, calendrier, résultats et classement du championnat de France.", kind: "results",
    regions: ["france", "francophone", "europe"], locales: ["fr"], official: true, homeUrl: "https://ligue1.com/", resultsUrl: "https://ligue1.com/", calendarUrl: "https://ligue1.com/", badges: ["FRANCE", "LIGUE 1"]
  },
  {
    id: "foot-premierleague", sport: "foot", name: "Premier League", shortName: "Premier League",
    description: "Actualités, fixtures, résultats et classement officiels de Premier League.", kind: "results",
    regions: ["uk_ireland", "europe", "global"], locales: ["en"], official: true, homeUrl: "https://www.premierleague.com/", resultsUrl: "https://www.premierleague.com/results", calendarUrl: "https://www.premierleague.com/fixtures", badges: ["UK", "PREMIER LEAGUE"]
  },
  {
    id: "foot-laliga", sport: "foot", name: "LaLiga", shortName: "LaLiga",
    description: "Résultats, calendrier, classement et actualités officielles du championnat espagnol.", kind: "results",
    regions: ["spain", "europe", "global"], locales: ["es"], official: true, homeUrl: "https://www.laliga.com/", resultsUrl: "https://www.laliga.com/en-GB/results", calendarUrl: "https://www.laliga.com/en-GB/laliga-easports/calendar", badges: ["ESPAGNE", "LALIGA"]
  },
  {
    id: "foot-bundesliga", sport: "foot", name: "Bundesliga", shortName: "Bundesliga",
    description: "Résultats, calendrier, classement et actualités officielles du championnat allemand.", kind: "results",
    regions: ["dach", "europe", "global"], locales: ["de"], official: true, homeUrl: "https://www.bundesliga.com/", resultsUrl: "https://www.bundesliga.com/en/bundesliga/matchday", calendarUrl: "https://www.bundesliga.com/en/bundesliga/matchday", badges: ["ALLEMAGNE", "BUNDESLIGA"]
  },
  {
    id: "foot-seriea", sport: "foot", name: "Lega Serie A", shortName: "Serie A",
    description: "Résultats, calendrier et actualités officielles de Serie A.", kind: "results",
    regions: ["italy", "europe", "global"], locales: ["it"], official: true, homeUrl: "https://www.legaseriea.it/", resultsUrl: "https://www.legaseriea.it/en/serie-a", calendarUrl: "https://www.legaseriea.it/en/serie-a", badges: ["ITALIE", "SERIE A"]
  },

  { id:"foot-fff", sport:"foot", name:"FFF Compétitions", shortName:"FFF", description:"Résultats, calendriers, classements, coupes nationales, ligues et compétitions fédérales françaises.", kind:"results", regions:["france","francophone","europe"], locales:["fr"], official:true, homeUrl:"https://www.fff.fr/", resultsUrl:"https://www.fff.fr/competition", calendarUrl:"https://www.fff.fr/competition", badges:["FRANCE","FÉDÉRAL","AMATEUR"] },
  { id:"foot-laurafoot", sport:"foot", name:"LAuRAFoot", shortName:"LAuRAFoot", description:"Championnats, coupes, résultats, classements et agendas régionaux Auvergne-Rhône-Alpes.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://laurafoot.fff.fr/", resultsUrl:"https://laurafoot.fff.fr/competitions/", calendarUrl:"https://laurafoot.fff.fr/competitions/", badges:["RÉGIONAL","AMATEUR"] },
  { id:"foot-fa-fulltime", sport:"foot", name:"FA Full-Time", shortName:"Full-Time", description:"Plateforme FA des ligues grassroots anglaises : résultats, feuilles de match, calendriers et classements de milliers de compétitions.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://fulltime.thefa.com/", scoresUrl:"https://fulltime.thefa.com/", resultsUrl:"https://fulltime.thefa.com/", calendarUrl:"https://fulltime.thefa.com/", badges:["GRASSROOTS","ANGLETERRE","AMATEUR"] },
  { id:"foot-fussballde", sport:"foot", name:"FUSSBALL.DE", shortName:"FUSSBALL.DE", description:"Portail DFB du football amateur allemand : Regionalliga, Oberliga, ligues locales, jeunes et féminines.", kind:"results", regions:["dach","europe"], locales:["de"], official:true, homeUrl:"https://www.fussball.de/", resultsUrl:"https://www.fussball.de/homepage", calendarUrl:"https://www.fussball.de/homepage", badges:["ALLEMAGNE","AMATEUR","DFB"] },
  { id:"foot-tuttocampo", sport:"foot", name:"Tuttocampo", shortName:"Tuttocampo", description:"Résultats live et archives du football amateur italien : Serie D, Eccellenza, Promozione, catégories régionales, jeunes et féminines.", kind:"results", regions:["italy","europe"], locales:["it"], official:false, homeUrl:"https://www.tuttocampo.it/", scoresUrl:"https://www.tuttocampo.it/", resultsUrl:"https://www.tuttocampo.it/Italia/Dilettanti", calendarUrl:"https://www.tuttocampo.it/Italia/Dilettanti", badges:["ITALIE","DILETTANTI","AMATEUR"] },
  { id:"foot-lnd", sport:"foot", name:"Lega Nazionale Dilettanti", shortName:"LND", description:"Football amateur officiel italien : Serie D, compétitions régionales, jeunes, féminin et futsal.", kind:"results", regions:["italy","europe"], locales:["it"], official:true, homeUrl:"https://www.lnd.it/", resultsUrl:"https://www.lnd.it/", calendarUrl:"https://www.lnd.it/", badges:["ITALIE","LND","AMATEUR"] },
  { id:"foot-rfef", sport:"foot", name:"RFEF", shortName:"RFEF", description:"Compétitions nationales et fédérales espagnoles, y compris divisions inférieures et coupes.", kind:"results", regions:["spain","europe"], locales:["es"], official:true, homeUrl:"https://rfef.es/", resultsUrl:"https://rfef.es/", calendarUrl:"https://rfef.es/", badges:["ESPAGNE","FÉDÉRAL"] },
  { id:"foot-futbolregional", sport:"foot", name:"Fútbol Regional", shortName:"Fútbol Regional", description:"Résultats, calendriers et classements du football régional et amateur espagnol.", kind:"results", regions:["spain","europe"], locales:["es"], official:false, homeUrl:"https://www.futbol-regional.es/", resultsUrl:"https://www.futbol-regional.es/", calendarUrl:"https://www.futbol-regional.es/", badges:["ESPAGNE","RÉGIONAL","AMATEUR"] },
  { id:"foot-soccerway", sport:"foot", name:"Soccerway", shortName:"Soccerway", description:"Résultats et calendriers mondiaux couvrant de nombreuses divisions, réserves, jeunes et compétitions féminines.", kind:"live_scores", regions:["global","europe","asia","north_america","latin_america","oceania"], official:false, homeUrl:"https://www.soccerway.com/", scoresUrl:"https://www.soccerway.com/matches/", resultsUrl:"https://www.soccerway.com/matches/", badges:["MONDE","DIVISIONS"] },
  { id:"foot-flashscore", sport:"foot", name:"Flashscore Football", shortName:"Flashscore", description:"Scores live et résultats de milliers de compétitions mondiales, y compris divisions inférieures.", kind:"live_scores", regions:["global","europe","asia","north_america","latin_america","oceania"], official:false, homeUrl:"https://www.flashscore.com/football/", scoresUrl:"https://www.flashscore.com/football/", resultsUrl:"https://www.flashscore.com/football/", badges:["LIVE","MONDE"] },
  { id:"foot-sofascore", sport:"foot", name:"Sofascore Football", shortName:"Sofascore", description:"Scores, résultats, calendriers et statistiques de compétitions professionnelles et de nombreuses divisions secondaires.", kind:"live_scores", regions:["global","europe","asia","north_america","latin_america","oceania"], official:false, homeUrl:"https://www.sofascore.com/football", scoresUrl:"https://www.sofascore.com/football", resultsUrl:"https://www.sofascore.com/football", badges:["LIVE","MONDE"] },
  { id:"foot-usl2", sport:"foot", name:"USL League Two", shortName:"USL2", description:"Résultats et calendrier du football pré-professionnel nord-américain.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://www.uslleaguetwo.com/", resultsUrl:"https://www.uslleaguetwo.com/", calendarUrl:"https://www.uslleaguetwo.com/", badges:["USA","SEMI-PRO"] },
  { id:"foot-npsl", sport:"foot", name:"NPSL", shortName:"NPSL", description:"Résultats du National Premier Soccer League, championnat semi-pro/amateur aux États-Unis.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://www.npsl.com/", resultsUrl:"https://www.npsl.com/", calendarUrl:"https://www.npsl.com/", badges:["USA","SEMI-PRO"] },
  { id:"foot-league1canada", sport:"foot", name:"League1 Canada", shortName:"League1 Canada", description:"Résultats des ligues semi-pro provinciales canadiennes et compétitions League1.", kind:"results", regions:["north_america"], locales:["en","fr"], official:true, homeUrl:"https://league1canada.ca/", resultsUrl:"https://league1canada.ca/", calendarUrl:"https://league1canada.ca/", badges:["CANADA","SEMI-PRO"] },
  { id:"foot-jfl", sport:"foot", name:"Japan Football League", shortName:"JFL", description:"Résultats et calendrier de la JFL, niveau national semi-professionnel japonais.", kind:"results", regions:["japan_asia","asia"], locales:["ja"], official:true, homeUrl:"https://www.jfl.or.jp/", resultsUrl:"https://www.jfl.or.jp/", calendarUrl:"https://www.jfl.or.jp/", badges:["JAPON","SEMI-PRO"] },

  // PÉTANQUE
  {
    id: "petanque-fipjp", sport: "petanque", name: "Fédération Internationale de Pétanque et Jeu Provençal", shortName: "FIPJP",
    description: "Fédération internationale : championnats du monde, actualités et informations officielles.", kind: "governing_body",
    regions: ["global", "europe", "francophone"], official: true, homeUrl: "https://www.fipjp.org/", watchUrl: "https://www.youtube.com/@FIPJP", badges: ["MONDE", "FIPJP"]
  },
  {
    id: "petanque-ffpjp", sport: "petanque", name: "FFPJP Compétitions", shortName: "FFPJP",
    description: "Compétitions fédérales françaises, calendriers, championnats et résultats officiels.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://compet.ffpjp.org/", resultsUrl: "https://compet.ffpjp.org/", calendarUrl: "https://compet.ffpjp.org/", badges: ["FRANCE", "FFPJP"]
  },
  {
    id: "petanque-cep", sport: "petanque", name: "Confédération Européenne de Pétanque", shortName: "CEP",
    description: "Championnats d'Europe, compétitions continentales et informations officielles européennes.", kind: "governing_body",
    regions: ["europe", "global"], official: true, homeUrl: "https://www.cep-petanque.com/", resultsUrl: "https://www.cep-petanque.com/", calendarUrl: "https://www.cep-petanque.com/", badges: ["EUROPE", "CEP"]
  },
  {
    id: "petanque-petanqueland", sport: "petanque", name: "PetanqueLand", shortName: "PetanqueLand",
    description: "Agrégateur francophone orienté résultats, agenda, directs et replays officiels.", kind: "results",
    regions: ["france", "francophone", "europe"], locales: ["fr"], official: false, homeUrl: "https://www.petanqueland.fr/", resultsUrl: "https://www.petanqueland.fr/officiels-petanque/", badges: ["FR", "RÉSULTATS", "DIRECT"]
  },
  {
    id: "petanque-oeil-bouliste", sport: "petanque", name: "L’Œil du Bouliste", shortName: "Œil du Bouliste",
    description: "Agenda de compétitions et résultats vérifiés avec renvois vers les sources officielles.", kind: "results",
    regions: ["france", "francophone", "europe"], locales: ["fr"], official: false, homeUrl: "https://www.loeildubouliste.fr/", resultsUrl: "https://www.loeildubouliste.fr/competitions", badges: ["AGENDA", "RÉSULTATS"]
  },

  // TENNIS DE TABLE / PING-PONG
  {
    id: "pingpong-ittf", sport: "pingpong", name: "International Table Tennis Federation", shortName: "ITTF",
    description: "Calendrier international officiel ITTF et accès aux grandes compétitions mondiales.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://www.ittf.com/", calendarUrl: "https://www.ittf.com/2026-events-calendar/", badges: ["MONDE", "ITTF"]
  },
  {
    id: "pingpong-wtt", sport: "pingpong", name: "World Table Tennis", shortName: "WTT",
    description: "Circuit WTT : événements, tableaux, résultats et contenus officiels.", kind: "tour",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://worldtabletennis.com/", scoresUrl: "https://worldtabletennis.com/", resultsUrl: "https://worldtabletennis.com/", badges: ["WTT", "LIVE"]
  },
  {
    id: "pingpong-fftt", sport: "pingpong", name: "Fédération Française de Tennis de Table", shortName: "FFTT",
    description: "Compétitions françaises, live scoring, tableaux, programme et diffusion officielle lorsqu'elle est proposée.", kind: "live_scores",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.fftt.com/", scoresUrl: "https://www.fftt.com/competition/", resultsUrl: "https://www.fftt.com/competition/", badges: ["FRANCE", "LIVE"]
  },

  {
    id: "pingpong-ettu", sport: "pingpong", name: "European Table Tennis Union", shortName: "ETTU",
    description: "Actualités, championnats européens, résultats et compétitions continentales.", kind: "results",
    regions: ["europe", "global"], official: true, homeUrl: "https://www.ettu.org/", resultsUrl: "https://www.ettu.org/", calendarUrl: "https://www.ettu.org/", badges: ["EUROPE", "ETTU"]
  },
  {
    id: "pingpong-england", sport: "pingpong", name: "Table Tennis England", shortName: "TT England",
    description: "Résultats, compétitions nationales, actualités et calendriers en Angleterre.", kind: "results",
    regions: ["uk_ireland", "europe"], locales: ["en"], official: true, homeUrl: "https://www.tabletennisengland.co.uk/", resultsUrl: "https://www.tabletennisengland.co.uk/", calendarUrl: "https://www.tabletennisengland.co.uk/", badges: ["UK", "RESULTS"]
  },

  // BABY-FOOT / TABLE SOCCER
  {
    id: "babyfoot-itsf", sport: "babyfoot", name: "International Table Soccer Federation", shortName: "ITSF",
    description: "Tournois internationaux, World Series, classements, résultats et streams officiels de baby-foot.", kind: "governing_body",
    regions: ["global", "europe", "uk_ireland", "north_america", "oceania", "asia"], official: true, homeUrl: "https://www.tablesoccer.org/", scoresUrl: "https://www.tablesoccer.org/", resultsUrl: "https://www.tablesoccer.org/", calendarUrl: "https://www.tablesoccer.org/", watchUrl: "https://www.tablesoccer.org/", badges: ["MONDE", "ITSF", "LIVE"]
  },
  {
    id: "babyfoot-ffbf", sport: "babyfoot", name: "Fédération Française de Baby-Foot", shortName: "FFBF",
    description: "Tournois, classements et compétitions officielles de baby-foot en France.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://ffbabyfoot.fr/", resultsUrl: "https://ffbabyfoot.fr/competition", calendarUrl: "https://ffbabyfoot.fr/competition", badges: ["FRANCE", "FFBF"]
  },

  // MÖLKKY
  {
    id: "molkky-imo", sport: "molkky", name: "International Mölkky Organisation", shortName: "IMO",
    description: "Organisation internationale : championnats du monde et d'Europe, membres et compétitions officielles.", kind: "governing_body",
    regions: ["global", "europe", "oceania", "asia", "north_america"], official: true, homeUrl: "https://www.international-molkky.org/", calendarUrl: "https://www.international-molkky.org/world-championships", resultsUrl: "https://www.international-molkky.org/world-championships", badges: ["MONDE", "IMO"]
  },
  {
    id: "molkky-ffm", sport: "molkky", name: "Fédération Française de Mölkky", shortName: "FFM",
    description: "Calendrier français et informations sur les tournois officiels nationaux et internationaux.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://ff-molkky.fr/", calendarUrl: "https://ff-molkky.fr/partout-dans-le-monde/", badges: ["FRANCE", "FFM"]
  },

  {
    id: "molkky-world", sport: "molkky", name: "Mölkky World", shortName: "Mölkky World",
    description: "Calendrier international, tournois, événements à la une et fiches de compétitions.", kind: "calendar",
    regions: ["global", "europe", "france", "oceania", "asia"], official: false, homeUrl: "https://www.molkky.world/", resultsUrl: "https://www.molkky.world/tournaments", calendarUrl: "https://www.molkky.world/tournaments", badges: ["MONDE", "TOURNOIS"]
  },
  {
    id: "molkky-molkkify", sport: "molkky", name: "Molkkify / Aptus Cup", shortName: "Molkkify",
    description: "Tableaux et résultats détaillés de compétitions Mölkky, avec tours et scores partie par partie.", kind: "live_scores",
    regions: ["global", "europe", "asia", "oceania", "north_america"], official: false, homeUrl: "https://ac.molkkify.app/", scoresUrl: "https://ac.molkkify.app/results", resultsUrl: "https://ac.molkkify.app/results", badges: ["SCORES", "TABLEAUX"]
  },

  // PADEL
  {
    id: "padel-fip", sport: "padel", name: "International Padel Federation", shortName: "FIP",
    description: "Tournois FIP, compétitions en cours, résultats, tableaux et calendrier international.", kind: "live_scores",
    regions: ["global", "europe", "spain", "latin_america", "arab_middle_east", "asia"], official: true, homeUrl: "https://www.padelfip.com/", scoresUrl: "https://www.padelfip.com/live/", resultsUrl: "https://www.padelfip.com/titles-and-finals/", calendarUrl: "https://www.padelfip.com/", badges: ["MONDE", "FIP", "LIVE"]
  },
  {
    id: "padel-premier", sport: "padel", name: "Premier Padel", shortName: "Premier Padel",
    description: "Circuit professionnel officiel : calendrier, événements en cours, résultats et liens de diffusion.", kind: "tour",
    regions: ["global", "europe", "spain", "latin_america", "arab_middle_east"], official: true, homeUrl: "https://premierpadel.com/", scoresUrl: "https://premierpadel.com/en/tournaments", resultsUrl: "https://premierpadel.com/en/tournaments", calendarUrl: "https://premierpadel.com/en/tournaments", watchUrl: "https://premierpadel.com/en/tournaments", badges: ["PRO", "LIVE"]
  },
  {
    id: "padel-fft", sport: "padel", name: "Fédération Française de Tennis · Padel", shortName: "FFT Padel",
    description: "Compétitions nationales françaises de padel, championnats, calendriers et palmarès.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.fft.fr/nos-sports/padel", resultsUrl: "https://www.fft.fr/nos-sports/padel/competitions-padel", calendarUrl: "https://www.fft.fr/nos-sports/padel/competitions-padel", badges: ["FRANCE", "FFT"]
  },
  {
    id: "padel-score", sport: "padel", name: "PadelScore", shortName: "PadelScore",
    description: "Calendrier professionnel, tournois Premier Padel/FIP, tableaux et historique de résultats.", kind: "results",
    regions: ["global", "europe", "spain", "latin_america", "arab_middle_east"], locales: ["es", "en"], official: false, homeUrl: "https://www.padelscore.org/", scoresUrl: "https://www.padelscore.org/calendario", resultsUrl: "https://www.padelscore.org/calendario", calendarUrl: "https://www.padelscore.org/calendario", badges: ["PRO", "SCORES", "CALENDRIER"]
  },

  // BADMINTON
  {
    id: "badminton-bwf", sport: "badminton", name: "Badminton World Federation", shortName: "BWF",
    description: "Fédération mondiale et circuits internationaux : calendrier, événements, rankings et résultats.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://bwfbadminton.com/", calendarUrl: "https://bwfbadminton.com/calendar/", resultsUrl: "https://bwfbadminton.com/", badges: ["MONDE", "BWF"]
  },
  {
    id: "badminton-ffbad", sport: "badminton", name: "Fédération Française de Badminton", shortName: "FFBaD",
    description: "Compétitions françaises, classements et résultats officiels.", kind: "results",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ffbad.org/", resultsUrl: "https://www.ffbad.org/", badges: ["FRANCE", "FFBaD"]
  },

  {
    id: "badminton-europe", sport: "badminton", name: "Badminton Europe", shortName: "BEC",
    description: "Actualités, résultats, championnats et circuits européens de badminton.", kind: "results",
    regions: ["europe", "global"], official: true, homeUrl: "https://badmintoneurope.com/", resultsUrl: "https://badmintoneurope.com/", calendarUrl: "https://badmintoneurope.com/", badges: ["EUROPE", "BEC"]
  },
  {
    id: "badminton-tournamentsoftware", sport: "badminton", name: "BWF Tournament Software", shortName: "BWF TS",
    description: "Tableaux, ordre des matchs, scores et résultats détaillés de nombreux tournois internationaux.", kind: "live_scores",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: false, homeUrl: "https://bwf.tournamentsoftware.com/", scoresUrl: "https://bwf.tournamentsoftware.com/", resultsUrl: "https://bwf.tournamentsoftware.com/", badges: ["SCORES", "TABLEAUX"]
  },

  // CORNHOLE
  {
    id: "cornhole-acl", sport: "cornhole", name: "American Cornhole League", shortName: "ACL",
    description: "Circuit majeur nord-américain de cornhole : événements, joueurs, compétitions et diffusion.", kind: "tour",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://www.iplayacl.com/", badges: ["USA", "ACL"]
  },
  {
    id: "cornhole-aco", sport: "cornhole", name: "American Cornhole Organization", shortName: "ACO",
    description: "Événements ACO, classements, brackets et résultats de tournois.", kind: "results",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://americancornhole.com/", resultsUrl: "https://americancornhole.com/results/", badges: ["USA", "ACO", "RÉSULTATS"]
  },
  {
    id: "cornhole-ofch", sport: "cornhole", name: "Organisation Française de Cornhole", shortName: "OFCH",
    description: "Championnat français, tournois officiels, calendrier et informations de l'équipe de France.", kind: "calendar",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ofch.fr/", calendarUrl: "https://www.ofch.fr/evenements/", resultsUrl: "https://www.ofch.fr/", badges: ["FRANCE", "OFCH"]
  },

  // PALET

  // BOWLING
  {
    id: "bowling-ibf", sport: "bowling", name: "International Bowling Federation", shortName: "IBF",
    description: "Compétitions mondiales officielles avec résultats, scoring en ligne et live streaming selon les événements.", kind: "governing_body",
    regions: ["global", "europe", "asia", "north_america", "oceania"], official: true, homeUrl: "https://bowling.sport/", resultsUrl: "https://bowling.sport/", calendarUrl: "https://bowling.sport/", watchUrl: "https://bowling.sport/", badges: ["MONDE", "IBF"]
  },
  {
    id: "bowling-pba", sport: "bowling", name: "Professional Bowlers Association", shortName: "PBA",
    description: "PBA Tour : calendrier professionnel, résultats, détails des tournois et diffuseurs officiels.", kind: "tour",
    regions: ["north_america", "global"], locales: ["en"], official: true, homeUrl: "https://www.pba.com/", calendarUrl: "https://www.pba.com/schedule/pba-tour", resultsUrl: "https://www.pba.com/schedule/pba-tour", badges: ["USA", "PBA", "PRO"]
  },
  {
    id: "bowling-ffbsq", sport: "bowling", name: "Fédération Française de Bowling et de Sport de Quilles", shortName: "FFBSQ",
    description: "Fédération française : compétitions, disciplines, calendriers et informations officielles.", kind: "governing_body",
    regions: ["france", "francophone"], locales: ["fr"], official: true, homeUrl: "https://www.ffbsq.fr/", badges: ["FRANCE", "FFBSQ"]
  },
  {
    id: "bowling-etbf", sport: "bowling", name: "European Tenpin Bowling Federation", shortName: "ETBF",
    description: "Circuit européen, championnats, calendrier et résultats officiels de bowling tenpin.", kind: "governing_body",
    regions: ["europe", "global"], official: true, homeUrl: "https://etbf.eu/", resultsUrl: "https://etbf.eu/", calendarUrl: "https://etbf.eu/", badges: ["EUROPE", "ETBF"]
  },

  // EXTENDED WORLD / NATIONAL / REGIONAL / AMATEUR RESULT SOURCES
  { id:"petanque-cep", sport:"petanque", name:"Confédération Européenne de Pétanque", shortName:"CEP", description:"Championnats et compétitions européennes de pétanque, résultats et calendriers.", kind:"results", regions:["europe","france","benelux","dach","italy","spain","nordic_baltic","eastern_europe","balkans"], official:true, homeUrl:"https://www.cep-petanque.com/", resultsUrl:"https://www.cep-petanque.com/", calendarUrl:"https://www.cep-petanque.com/", badges:["EUROPE","CEP"] },
  { id:"petanque-petanqueland", sport:"petanque", name:"PétanqueLand", shortName:"PétanqueLand", description:"Résultats, calendriers et suivi de nombreux concours et championnats de pétanque.", kind:"results", regions:["france","francophone","europe"], locales:["fr"], official:false, homeUrl:"https://www.petanqueland.fr/", resultsUrl:"https://www.petanqueland.fr/", badges:["CLUBS","TOURNOIS"] },
  { id:"petanque-boulistenaute", sport:"petanque", name:"Boulistenaute", shortName:"Boulistenaute", description:"Actualités et résultats de compétitions nationales, internationales et de clubs.", kind:"results", regions:["france","francophone","europe","global"], locales:["fr"], official:false, homeUrl:"https://www.boulistenaute.com/", resultsUrl:"https://www.boulistenaute.com/", badges:["RESULTATS","CLUBS"] },

  { id:"pingpong-ettu", sport:"pingpong", name:"European Table Tennis Union", shortName:"ETTU", description:"Compétitions européennes, résultats, tirages et calendriers officiels.", kind:"results", regions:["europe","global"], official:true, homeUrl:"https://www.ettu.org/", resultsUrl:"https://www.ettu.org/", calendarUrl:"https://www.ettu.org/", badges:["EUROPE","ETTU"] },
  { id:"pingpong-england", sport:"pingpong", name:"Table Tennis England", shortName:"TTE", description:"Championnats, ligues, tournois et résultats anglais, y compris niveaux nationaux et clubs.", kind:"results", regions:["uk_ireland"], locales:["en"], official:true, homeUrl:"https://www.tabletennisengland.co.uk/", resultsUrl:"https://www.tabletennisengland.co.uk/", badges:["UK","CLUBS"] },
  { id:"pingpong-tournamentsoftware", sport:"pingpong", name:"Tournament Software · Table Tennis", shortName:"TS", description:"Tableaux et résultats de nombreux tournois nationaux, régionaux et internationaux.", kind:"results", regions:["global","europe","asia","oceania","north_america"], official:false, homeUrl:"https://www.tournamentsoftware.com/", resultsUrl:"https://www.tournamentsoftware.com/", badges:["TOURNOIS","RESULTATS"] },

  { id:"babyfoot-itsf-results", sport:"babyfoot", name:"ITSF Results / Coral", shortName:"ITSF Coral", description:"Résultats, classements et tableaux ITSF, World Series et tournois partenaires.", kind:"results", regions:["global","europe","north_america","asia"], official:true, homeUrl:"https://www.tablesoccer.org/", resultsUrl:"https://www.tablesoccer.org/", badges:["ITSF","RESULTATS"] },
  { id:"babyfoot-usta", sport:"babyfoot", name:"USTSA / Foosball USA", shortName:"USA Foosball", description:"Tournois et résultats de baby-foot aux États-Unis, du niveau open au circuit national.", kind:"results", regions:["north_america"], locales:["en"], official:false, homeUrl:"https://www.foosball.com/", resultsUrl:"https://www.foosball.com/", badges:["USA","TOURNOIS"] },

  { id:"molkky-molkkify", sport:"molkky", name:"Molkkify", shortName:"Molkkify", description:"Tableaux, poules, tours et résultats de compétitions Mölkky, dont événements internationaux et associatifs.", kind:"results", regions:["global","europe","france","japan_asia","oceania"], official:false, homeUrl:"https://ac.molkkify.app/", resultsUrl:"https://ac.molkkify.app/results", badges:["BRACKETS","AMATEUR","MONDE"] },
  { id:"molkky-imo", sport:"molkky", name:"International Mölkky Organisation", shortName:"IMO", description:"Championnats du monde, nations, résultats historiques et compétitions internationales.", kind:"results", regions:["global","europe","asia","oceania"], official:true, homeUrl:"https://www.international-molkky.org/", resultsUrl:"https://www.international-molkky.org/world-championships", badges:["MONDE","IMO"] },

  { id:"padel-tournamentsoftware", sport:"padel", name:"Tournament Software · Padel", shortName:"TS Padel", description:"Tableaux et résultats de nombreux tournois nationaux et régionaux de padel.", kind:"results", regions:["global","europe","spain","latin_america"], official:false, homeUrl:"https://www.tournamentsoftware.com/", resultsUrl:"https://www.tournamentsoftware.com/", badges:["TOURNOIS","AMATEUR"] },
  { id:"padel-padelmanager", sport:"padel", name:"Padel Manager", shortName:"PadelMgr", description:"Compétitions, tableaux et résultats de nombreux circuits et clubs de padel.", kind:"results", regions:["spain","latin_america","europe"], official:false, homeUrl:"https://padelmanager.com/", resultsUrl:"https://padelmanager.com/", badges:["CLUBS","TOURNOIS"] },
  { id:"padel-padelnuestro", sport:"padel", name:"Padel Nuestro / circuits", shortName:"Padel", description:"Actualités et suivi de compétitions professionnelles et nationales de padel.", kind:"results", regions:["spain","europe","latin_america","global"], official:false, homeUrl:"https://www.padelnuestro.com/blog/", badges:["NEWS","RESULTATS"] },

  { id:"badminton-tournamentsoftware", sport:"badminton", name:"BWF Tournament Software", shortName:"BWF TS", description:"Tableaux détaillés et résultats BWF, continentaux, nationaux, juniors et clubs.", kind:"results", regions:["global","europe","asia","north_america","oceania"], official:true, homeUrl:"https://bwf.tournamentsoftware.com/", resultsUrl:"https://bwf.tournamentsoftware.com/", badges:["BWF","DRAWS","RESULTATS"] },
  { id:"badminton-europe", sport:"badminton", name:"Badminton Europe", shortName:"BEC", description:"Championnats et circuits européens, juniors, nationaux et résultats continentaux.", kind:"results", regions:["europe"], official:true, homeUrl:"https://badmintoneurope.com/", resultsUrl:"https://badmintoneurope.com/", badges:["EUROPE","BEC"] },
  { id:"badminton-england", sport:"badminton", name:"Badminton England", shortName:"BE", description:"Résultats de compétitions anglaises, circuits nationaux, juniors et clubs.", kind:"results", regions:["uk_ireland"], locales:["en"], official:true, homeUrl:"https://www.badmintonengland.co.uk/", resultsUrl:"https://www.badmintonengland.co.uk/", badges:["UK","CLUBS"] },

  { id:"cornhole-scoreholio", sport:"cornhole", name:"Scoreholio", shortName:"Scoreholio", description:"Plateforme de tournois cornhole avec brackets, scores et événements locaux/amateurs à grande échelle.", kind:"results", regions:["north_america","global"], official:false, homeUrl:"https://scoreholio.com/", resultsUrl:"https://scoreholio.com/", badges:["AMATEUR","BRACKETS","USA"] },
  { id:"cornhole-iplayacl", sport:"cornhole", name:"ACL Events", shortName:"ACL", description:"Résultats, classements et événements ACL, pro, open, conference et local.", kind:"results", regions:["north_america","global"], official:true, homeUrl:"https://www.iplayacl.com/", resultsUrl:"https://www.iplayacl.com/", badges:["PRO","OPEN","LOCAL"] },

  { id:"bowling-bowlcom", sport:"bowling", name:"Bowl.com / USBC", shortName:"USBC", description:"Championnats USBC, tournois nationaux, college, youth et résultats de bowling amateur/élite.", kind:"results", regions:["north_america","global"], locales:["en"], official:true, homeUrl:"https://bowl.com/", resultsUrl:"https://bowl.com/tournaments", badges:["USA","USBC","AMATEUR"] },
  { id:"bowling-lanetalk", sport:"bowling", name:"Lanetalk", shortName:"Lanetalk", description:"Résultats, compétitions et scoring de bowling depuis de nombreux centres et événements.", kind:"live_scores", regions:["global","europe","north_america","asia"], official:false, homeUrl:"https://www.lanetalk.com/", resultsUrl:"https://www.lanetalk.com/", badges:["LIVE","CLUBS"] },
  { id:"bowling-bowlingresults", sport:"bowling", name:"Bowling Results", shortName:"Results", description:"Portails et feuilles de résultats de tournois bowling nationaux et régionaux.", kind:"results", regions:["global","europe","north_america"], official:false, homeUrl:"https://www.bowlingresults.info/", resultsUrl:"https://www.bowlingresults.info/", badges:["RESULTATS","TOURNOIS"] },

  { id:"foot-soccerway", sport:"foot", name:"Soccerway", shortName:"Soccerway", description:"Scores et calendriers couvrant des centaines de ligues mondiales, divisions inférieures, réserves et football régional.", kind:"results", regions:["global","europe","north_america","latin_america","asia","oceania","africa" as any], official:false, homeUrl:"https://www.soccerway.com/", resultsUrl:"https://www.soccerway.com/matches/", badges:["MONDE","LOWER LEAGUES"] },
  { id:"foot-flashscore", sport:"foot", name:"Flashscore Football", shortName:"Flashscore", description:"Scores mondiaux, divisions inférieures, compétitions nationales, jeunes et nombreux championnats régionaux.", kind:"live_scores", regions:["global","europe","north_america","latin_america","asia","oceania"], official:false, homeUrl:"https://www.flashscore.com/football/", resultsUrl:"https://www.flashscore.com/football/", badges:["LIVE","MONDE"] },
  { id:"foot-sofascore", sport:"foot", name:"Sofascore Football", shortName:"Sofascore", description:"Résultats et calendriers internationaux, ligues professionnelles, semi-professionnelles et compétitions jeunes.", kind:"live_scores", regions:["global","europe","north_america","latin_america","asia","oceania"], official:false, homeUrl:"https://www.sofascore.com/football", resultsUrl:"https://www.sofascore.com/football", badges:["LIVE","LOWER LEAGUES"] },
  { id:"foot-fff", sport:"foot", name:"FFF Compétitions", shortName:"FFF", description:"Résultats fédéraux français, National, National 2/3, féminines, jeunes, coupes et football amateur régional/départemental.", kind:"results", regions:["france","francophone"], locales:["fr"], official:true, homeUrl:"https://www.fff.fr/", resultsUrl:"https://www.fff.fr/competition", badges:["FRANCE","AMATEUR","FFF"] },
  { id:"foot-faw", sport:"foot", name:"FA Full-Time", shortName:"FA Full-Time", description:"Résultats officiels de milliers de ligues grassroots et semi-pro anglaises.", kind:"results", regions:["uk_ireland"], locales:["en"], official:true, homeUrl:"https://fulltime.thefa.com/", resultsUrl:"https://fulltime.thefa.com/", badges:["UK","GRASSROOTS"] },


  // FOOTBALL — couverture renforcée des pyramides, sélections, continents et football amateur
  { id:"foot-fifa-plus", sport:"foot", name:"FIFA Tournaments", shortName:"FIFA", description:"Compétitions de sélections et clubs mondiales : Coupe du Monde, jeunes, féminines, intercontinentales.", kind:"results", regions:["global"], official:true, homeUrl:"https://www.fifa.com/tournaments", resultsUrl:"https://www.fifa.com/tournaments", badges:["MONDE","SÉLECTIONS"], competitionFamily:"national_teams", competitionLevel:"elite", tierLabel:"International" },
  { id:"foot-uefa-competitions", sport:"foot", name:"UEFA Competitions", shortName:"UEFA", description:"Champions League, Europa League, Conference League, EURO, Nations League, Youth League et compétitions féminines.", kind:"results", regions:["europe","global"], official:true, homeUrl:"https://www.uefa.com/", resultsUrl:"https://www.uefa.com/uefachampionsleague/fixtures-results/", badges:["EUROPE","CLUBS","SÉLECTIONS"], competitionFamily:"continental", competitionLevel:"elite", tierLabel:"UEFA" },
  { id:"foot-conmebol", sport:"foot", name:"CONMEBOL", shortName:"CONMEBOL", description:"Libertadores, Sudamericana, Recopa, Copa América et compétitions sud-américaines.", kind:"results", regions:["latin_america","global"], locales:["es","pt"], official:true, homeUrl:"https://www.conmebol.com/", resultsUrl:"https://www.conmebol.com/", badges:["AMÉRIQUE DU SUD","CLUBS","SÉLECTIONS"], competitionFamily:"continental", competitionLevel:"elite", tierLabel:"CONMEBOL" },
  { id:"foot-concacaf", sport:"foot", name:"Concacaf", shortName:"Concacaf", description:"Champions Cup, Gold Cup, Nations League et compétitions régionales Amérique du Nord/Centrale/Caraïbes.", kind:"results", regions:["north_america","latin_america","global"], locales:["en","es"], official:true, homeUrl:"https://www.concacaf.com/", resultsUrl:"https://www.concacaf.com/", badges:["CONCACAF","CLUBS","SÉLECTIONS"], competitionFamily:"continental", competitionLevel:"elite", tierLabel:"Concacaf" },
  { id:"foot-afc", sport:"foot", name:"Asian Football Confederation", shortName:"AFC", description:"AFC Champions League Elite/Two, Asian Cup, jeunes et compétitions de sélections asiatiques.", kind:"results", regions:["asia","japan_asia","china_asia","india_asia","arab_middle_east","global"], official:true, homeUrl:"https://www.the-afc.com/", resultsUrl:"https://www.the-afc.com/", badges:["ASIE","AFC"], competitionFamily:"continental", competitionLevel:"elite", tierLabel:"AFC" },
  { id:"foot-caf", sport:"foot", name:"CAF", shortName:"CAF", description:"Champions League CAF, Confederation Cup, CAN et compétitions africaines de clubs et sélections.", kind:"results", regions:["africa","global"], official:true, homeUrl:"https://www.cafonline.com/", resultsUrl:"https://www.cafonline.com/", badges:["AFRIQUE","CAF"], competitionFamily:"continental", competitionLevel:"elite", tierLabel:"CAF" },
  { id:"foot-ofc", sport:"foot", name:"Oceania Football Confederation", shortName:"OFC", description:"Compétitions de clubs et sélections en Océanie, hommes, femmes et jeunes.", kind:"results", regions:["oceania","global"], official:true, homeUrl:"https://www.oceaniafootball.com/", resultsUrl:"https://www.oceaniafootball.com/", badges:["OCÉANIE","OFC"], competitionFamily:"continental", competitionLevel:"mixed", tierLabel:"OFC" },
  { id:"foot-ligue2", sport:"foot", name:"Ligue 2 BKT", shortName:"Ligue 2", description:"Deuxième niveau professionnel français : calendrier, résultats et classement.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://ligue1.com/", resultsUrl:"https://ligue1.com/", badges:["FRANCE","D2"], countryCode:"FR", countryName:"France", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D2" },
  { id:"foot-fff-national", sport:"foot", name:"FFF National / N2 / N3", shortName:"FFF National", description:"National, National 2, National 3, D1/D2 féminines, jeunes nationaux et coupes fédérales.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.fff.fr/", resultsUrl:"https://www.fff.fr/competition", badges:["FRANCE","D3-D5","FÉDÉRAL"], countryCode:"FR", countryName:"France", competitionFamily:"domestic_league", competitionLevel:"semi_pro", tierLabel:"D3-D5" },
  { id:"foot-fff-regional", sport:"foot", name:"FFF Ligues & Districts", shortName:"FFF Régional", description:"R1, R2, R3, districts, coupes régionales, jeunes, féminines et football départemental via les ligues FFF.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.fff.fr/", resultsUrl:"https://www.fff.fr/competition", badges:["R1","R2","R3","DISTRICT"], countryCode:"FR", countryName:"France", competitionFamily:"regional", competitionLevel:"amateur", tierLabel:"R1 → District" },
  { id:"foot-efl", sport:"foot", name:"English Football League", shortName:"EFL", description:"Championship, League One, League Two et coupes EFL.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://www.efl.com/", resultsUrl:"https://www.efl.com/", badges:["ANGLETERRE","D2-D4"], countryCode:"GB", countryName:"Angleterre", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D2-D4" },
  { id:"foot-nationalleague-eng", sport:"foot", name:"The National League", shortName:"National League", description:"National League, North et South : niveaux 5 et 6 anglais, charnière pro/semi-pro.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://www.thenationalleague.org.uk/", resultsUrl:"https://www.thenationalleague.org.uk/", badges:["ANGLETERRE","D5-D6","SEMI-PRO"], countryCode:"GB", countryName:"Angleterre", competitionFamily:"domestic_league", competitionLevel:"semi_pro", tierLabel:"D5-D6" },
  { id:"foot-fa-fulltime-expanded", sport:"foot", name:"FA Full-Time Grassroots", shortName:"Full-Time", description:"Milliers de ligues et coupes grassroots anglaises : county, district, sunday, youth, women, reserves et clubs locaux.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://fulltime.thefa.com/", resultsUrl:"https://fulltime.thefa.com/", badges:["GRASSROOTS","COUNTY","YOUTH"], countryCode:"GB", countryName:"Angleterre", competitionFamily:"amateur", competitionLevel:"grassroots", tierLabel:"Grassroots" },
  { id:"foot-spfl", sport:"foot", name:"SPFL", shortName:"SPFL", description:"Premiership, Championship, League One et League Two écossaises.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://spfl.co.uk/", resultsUrl:"https://spfl.co.uk/", badges:["ÉCOSSE","D1-D4"], countryCode:"GB", countryName:"Écosse", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1-D4" },
  { id:"foot-scotland-nonleague", sport:"foot", name:"Scottish Non-League", shortName:"Scotland NL", description:"Highland League, Lowland League et football semi-pro/amateur écossais.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:false, homeUrl:"https://slfl.co.uk/", resultsUrl:"https://slfl.co.uk/", badges:["ÉCOSSE","D5+","SEMI-PRO"], countryCode:"GB", countryName:"Écosse", competitionFamily:"regional", competitionLevel:"semi_pro", tierLabel:"D5+" },
  { id:"foot-knvb", sport:"foot", name:"KNVB Competities", shortName:"KNVB", description:"Football professionnel et amateur néerlandais, programmes, classements et résultats via KNVB/Voetbal.nl.", kind:"results", regions:["benelux","europe"], locales:["nl"], official:true, homeUrl:"https://www.knvb.nl/competities", resultsUrl:"https://www.knvb.nl/competities", badges:["PAYS-BAS","PRO","AMATEUR"], countryCode:"NL", countryName:"Pays-Bas", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D1 → Amateur" },
  { id:"foot-rbfa", sport:"foot", name:"RBFA", shortName:"RBFA", description:"Compétitions belges nationales et provinciales, hommes, femmes et jeunes.", kind:"results", regions:["benelux","europe"], locales:["fr","nl"], official:true, homeUrl:"https://www.rbfa.be/", resultsUrl:"https://www.rbfa.be/", badges:["BELGIQUE","PROVINCIAL","AMATEUR"], countryCode:"BE", countryName:"Belgique", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"National → Provincial" },
  { id:"foot-fpf", sport:"foot", name:"Federação Portuguesa de Futebol", shortName:"FPF", description:"Liga 3, Campeonato de Portugal, coupes, jeunes, féminin, futsal et compétitions fédérales portugaises.", kind:"results", regions:["portugal","europe"], locales:["pt"], official:true, homeUrl:"https://www.fpf.pt/", resultsUrl:"https://www.fpf.pt/Competições", badges:["PORTUGAL","D3+","FÉDÉRAL"], countryCode:"PT", countryName:"Portugal", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D3+" },
  { id:"foot-rfef-scoreboard", sport:"foot", name:"Marcadores RFEF", shortName:"RFEF Scores", description:"Scores, feuilles de match, classements et statistiques de dizaines de compétitions espagnoles nationales, féminines, jeunes et futsal.", kind:"live_scores", regions:["spain","europe"], locales:["es"], official:true, homeUrl:"https://marcadores.rfef.es/", scoresUrl:"https://marcadores.rfef.es/", resultsUrl:"https://rfef.es/es/resultados", badges:["ESPAGNE","59+ COMPÉTITIONS"], countryCode:"ES", countryName:"Espagne", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"National → Jeunes" },
  { id:"foot-dfb", sport:"foot", name:"DFB Wettbewerbe", shortName:"DFB", description:"Compétitions fédérales allemandes, coupes, jeunes, féminin et sélections.", kind:"results", regions:["dach","europe"], locales:["de"], official:true, homeUrl:"https://www.dfb.de/", resultsUrl:"https://www.dfb.de/", badges:["ALLEMAGNE","FÉDÉRAL"], countryCode:"DE", countryName:"Allemagne", competitionFamily:"domestic_cup", competitionLevel:"mixed", tierLabel:"Fédéral" },
  { id:"foot-fussballde-expanded", sport:"foot", name:"FUSSBALL.DE Amateur", shortName:"FUSSBALL.DE", description:"Regionalliga, Oberliga, Verbandsliga, Landesliga, Bezirks/Kreis, jeunes et féminines en Allemagne.", kind:"live_scores", regions:["dach","europe"], locales:["de"], official:true, homeUrl:"https://www.fussball.de/", scoresUrl:"https://www.fussball.de/", resultsUrl:"https://www.fussball.de/", badges:["ALLEMAGNE","AMATEUR","KREIS"], countryCode:"DE", countryName:"Allemagne", competitionFamily:"amateur", competitionLevel:"grassroots", tierLabel:"D4 → Kreis" },
  { id:"foot-seried", sport:"foot", name:"LND Serie D", shortName:"Serie D", description:"Serie D italienne, neuf groupes, calendrier et résultats du plus haut niveau amateur national.", kind:"results", regions:["italy","europe"], locales:["it"], official:true, homeUrl:"https://lnd.it/seried/", resultsUrl:"https://lnd.it/seried/", badges:["ITALIE","D4","AMATEUR"], countryCode:"IT", countryName:"Italie", competitionFamily:"domestic_league", competitionLevel:"semi_pro", tierLabel:"D4" },
  { id:"foot-fai", sport:"foot", name:"Football Association of Ireland", shortName:"FAI", description:"League of Ireland, nouvelle National League grassroots, coupes intermediate/junior, jeunes et féminin.", kind:"results", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://www.fai.ie/competitions/", resultsUrl:"https://www.fai.ie/competitions/", badges:["IRLANDE","NATIONAL","GRASSROOTS"], countryCode:"IE", countryName:"Irlande", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"Pro → Grassroots" },
  { id:"foot-aleagues", sport:"foot", name:"A-Leagues", shortName:"A-Leagues", description:"A-League Men/Women, résultats et calendriers Australie/Nouvelle-Zélande.", kind:"results", regions:["oceania"], locales:["en"], official:true, homeUrl:"https://aleagues.com.au/", resultsUrl:"https://aleagues.com.au/", badges:["AUSTRALIE","NZ","PRO"], countryCode:"AU", countryName:"Australie / NZ", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1" },
  { id:"foot-npl-australia", sport:"foot", name:"Football Australia NPL", shortName:"NPL", description:"National Premier Leagues et compétitions des fédérations d'États australiennes, semi-pro et jeunes.", kind:"results", regions:["oceania"], locales:["en"], official:true, homeUrl:"https://www.footballaustralia.com.au/", resultsUrl:"https://www.footballaustralia.com.au/", badges:["AUSTRALIE","NPL","SEMI-PRO"], countryCode:"AU", countryName:"Australie", competitionFamily:"regional", competitionLevel:"semi_pro", tierLabel:"State NPL" },
  { id:"foot-us-soccer", sport:"foot", name:"U.S. Soccer", shortName:"US Soccer", description:"Sélections, Open Cup et compétitions fédérales américaines.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://www.ussoccer.com/", resultsUrl:"https://www.ussoccer.com/", badges:["USA","OPEN CUP","SÉLECTIONS"], countryCode:"US", countryName:"États-Unis", competitionFamily:"domestic_cup", competitionLevel:"mixed", tierLabel:"National" },
  { id:"foot-usl", sport:"foot", name:"USL", shortName:"USL", description:"USL Championship, League One, League Two, Academy et compétitions pré-professionnelles américaines.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://www.uslsoccer.com/", resultsUrl:"https://www.uslsoccer.com/", badges:["USA","D2-D4","SEMI-PRO"], countryCode:"US", countryName:"États-Unis", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D2-D4" },
  { id:"foot-canada-soccer", sport:"foot", name:"Canada Soccer", shortName:"Canada Soccer", description:"Sélections, championnat canadien et pyramide nationale/régionale canadienne.", kind:"results", regions:["north_america"], locales:["en","fr"], official:true, homeUrl:"https://canadasoccer.com/", resultsUrl:"https://canadasoccer.com/", badges:["CANADA","SÉLECTIONS","CUP"], countryCode:"CA", countryName:"Canada", competitionFamily:"national_teams", competitionLevel:"mixed", tierLabel:"National" },
  { id:"foot-cbf", sport:"foot", name:"CBF", shortName:"CBF", description:"Séries A/B/C/D, Copa do Brasil, Brasileirão féminin, jeunes et sélections du Brésil.", kind:"results", regions:["latin_america"], locales:["pt"], official:true, homeUrl:"https://www.cbf.com.br/", resultsUrl:"https://www.cbf.com.br/", badges:["BRÉSIL","A-D","FÉDÉRAL"], countryCode:"BR", countryName:"Brésil", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"A → D" },
  { id:"foot-afa", sport:"foot", name:"AFA", shortName:"AFA", description:"Primera, Primera Nacional, catégories de promotion, coupes, jeunes et sélections argentines.", kind:"results", regions:["latin_america"], locales:["es"], official:true, homeUrl:"https://www.afa.com.ar/", resultsUrl:"https://www.afa.com.ar/", badges:["ARGENTINE","PRO","ASCENSO"], countryCode:"AR", countryName:"Argentine", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"Primera → Ascenso" },
  { id:"foot-jleague", sport:"foot", name:"J.League", shortName:"J.League", description:"J1, J2, J3, calendriers et résultats professionnels japonais.", kind:"results", regions:["japan_asia","asia"], locales:["ja"], official:true, homeUrl:"https://www.jleague.co/", resultsUrl:"https://www.jleague.co/", badges:["JAPON","J1-J3"], countryCode:"JP", countryName:"Japon", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1-D3" },
  { id:"foot-kleague", sport:"foot", name:"K League", shortName:"K League", description:"K League 1/2 et compétitions professionnelles sud-coréennes.", kind:"results", regions:["asia"], locales:["en"], official:true, homeUrl:"https://www.kleague.com/", resultsUrl:"https://www.kleague.com/", badges:["CORÉE","D1-D2"], countryCode:"KR", countryName:"Corée du Sud", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1-D2" },

  // SPORTS À VENIR — catalogue préparé dès maintenant pour éviter une nouvelle phase de sourcing
  { id:"archery-world", sport:"archery", name:"World Archery", shortName:"World Archery", description:"Coupe du Monde, championnats du monde, rankings, résultats et calendriers internationaux.", kind:"results", regions:["global","europe","asia","north_america","oceania"], official:true, homeUrl:"https://www.worldarchery.sport/", resultsUrl:"https://www.worldarchery.sport/competition", calendarUrl:"https://www.worldarchery.sport/competition", badges:["MONDE","PRO"] },
  { id:"archery-ianseo", sport:"archery", name:"Ianseo", shortName:"Ianseo", description:"Scoring et résultats de milliers de compétitions de tir à l'arc, internationales, nationales, clubs et amateurs.", kind:"live_scores", regions:["global","europe","asia","north_america","oceania"], official:false, homeUrl:"https://www.ianseo.net/", resultsUrl:"https://www.ianseo.net/", badges:["LIVE","CLUBS","AMATEUR"] },
  { id:"archery-ffta", sport:"archery", name:"FFTA", shortName:"FFTA", description:"Compétitions françaises, championnats, clubs, calendriers et résultats.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.ffta.fr/", resultsUrl:"https://www.ffta.fr/", badges:["FRANCE","CLUBS"] },
  { id:"pickleball-ppa", sport:"pickleball", name:"PPA Tour", shortName:"PPA", description:"Circuit professionnel pickleball : tableaux, résultats, rankings et événements.", kind:"results", regions:["north_america","global"], locales:["en"], official:true, homeUrl:"https://ppatour.com/", resultsUrl:"https://ppatour.com/", badges:["PRO","USA"] },
  { id:"pickleball-app", sport:"pickleball", name:"APP Tour", shortName:"APP", description:"Circuit professionnel et open pickleball, résultats et calendriers.", kind:"results", regions:["north_america","global"], locales:["en"], official:true, homeUrl:"https://www.theapp.global/", resultsUrl:"https://www.theapp.global/", badges:["PRO","OPEN"] },
  { id:"pickleball-usap", sport:"pickleball", name:"USA Pickleball", shortName:"USAP", description:"Championnats, événements sanctionnés et compétitions amateurs américaines.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://usapickleball.org/", resultsUrl:"https://usapickleball.org/", badges:["USA","AMATEUR"] },
  { id:"frisbee-wfdf", sport:"frisbee", name:"WFDF", shortName:"WFDF", description:"Ultimate, disc golf et sports de disque : mondiaux, continentaux, résultats et calendriers.", kind:"results", regions:["global","europe","asia","north_america","oceania"], official:true, homeUrl:"https://wfdf.sport/", resultsUrl:"https://wfdf.sport/", badges:["MONDE","ULTIMATE"] },
  { id:"frisbee-usa-ultimate", sport:"frisbee", name:"USA Ultimate", shortName:"USAU", description:"College, club, youth et compétitions nationales américaines d'Ultimate.", kind:"results", regions:["north_america"], locales:["en"], official:true, homeUrl:"https://usaultimate.org/", resultsUrl:"https://play.usaultimate.org/events/tournament/?ViewAll=true", badges:["USA","CLUB","COLLEGE"] },
  { id:"billiards-wpa", sport:"billiards", name:"WPA Pool", shortName:"WPA", description:"Pool mondial : championnats, rankings, calendriers et résultats officiels.", kind:"results", regions:["global","europe","asia","north_america"], official:true, homeUrl:"https://wpapool.com/", resultsUrl:"https://wpapool.com/", badges:["POOL","MONDE"] },
  { id:"billiards-umb", sport:"billiards", name:"UMB", shortName:"UMB", description:"Billard carambole mondial : World Cups et championnats internationaux.", kind:"results", regions:["global","europe","asia"], official:true, homeUrl:"https://www.umb-carom.org/", resultsUrl:"https://www.umb-carom.org/", badges:["CARAMBOLE","MONDE"] },
  { id:"billiards-matchroom", sport:"billiards", name:"Matchroom Pool", shortName:"Matchroom", description:"World Nineball Tour, grands opens et résultats professionnels.", kind:"results", regions:["global","europe","north_america","asia"], official:true, homeUrl:"https://matchroompool.com/", resultsUrl:"https://matchroompool.com/", badges:["PRO","9-BALL"] },
  { id:"basket-fiba", sport:"basket", name:"FIBA", shortName:"FIBA", description:"Sélections, Coupes du Monde, compétitions continentales et clubs FIBA.", kind:"results", regions:["global","europe","asia","north_america","africa","oceania"], official:true, homeUrl:"https://www.fiba.basketball/", resultsUrl:"https://www.fiba.basketball/", badges:["MONDE","SÉLECTIONS"] },
  { id:"basket-nba", sport:"basket", name:"NBA", shortName:"NBA", description:"Scores, calendrier, playoffs et statistiques NBA.", kind:"live_scores", regions:["north_america","global"], locales:["en"], official:true, homeUrl:"https://www.nba.com/", scoresUrl:"https://www.nba.com/games", resultsUrl:"https://www.nba.com/games", badges:["USA","PRO"] },
  { id:"basket-euroleague", sport:"basket", name:"EuroLeague", shortName:"EuroLeague", description:"EuroLeague et EuroCup : scores, calendrier et classements européens.", kind:"live_scores", regions:["europe","global"], official:true, homeUrl:"https://www.euroleaguebasketball.net/", resultsUrl:"https://www.euroleaguebasketball.net/", badges:["EUROPE","PRO"] },
  { id:"basket-ffbb", sport:"basket", name:"FFBB", shortName:"FFBB", description:"Basket français national, régional, départemental, jeunes et amateurs.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.ffbb.com/", resultsUrl:"https://resultats.ffbb.com/", badges:["FRANCE","AMATEUR","JEUNES"] },
  { id:"rugby-world", sport:"rugby", name:"World Rugby", shortName:"World Rugby", description:"Coupe du Monde, tests internationaux, rankings et compétitions mondiales.", kind:"results", regions:["global","europe","oceania","africa","asia"], official:true, homeUrl:"https://www.world.rugby/", resultsUrl:"https://www.world.rugby/", badges:["MONDE","SÉLECTIONS"] },
  { id:"rugby-sixnations", sport:"rugby", name:"Six Nations", shortName:"6 Nations", description:"Six Nations hommes/femmes/U20 : calendrier, scores et classements.", kind:"results", regions:["europe","uk_ireland","france","italy"], official:true, homeUrl:"https://www.sixnationsrugby.com/", resultsUrl:"https://www.sixnationsrugby.com/", badges:["EUROPE","SÉLECTIONS"] },
  { id:"rugby-epcr", sport:"rugby", name:"EPCR", shortName:"EPCR", description:"Champions Cup et Challenge Cup européennes de clubs.", kind:"results", regions:["europe"], official:true, homeUrl:"https://www.epcrugby.com/", resultsUrl:"https://www.epcrugby.com/", badges:["EUROPE","CLUBS"] },
  { id:"rugby-lnr", sport:"rugby", name:"LNR", shortName:"TOP14/PROD2", description:"TOP 14 et Pro D2 : résultats, calendriers et classements officiels.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.lnr.fr/", resultsUrl:"https://www.lnr.fr/", badges:["FRANCE","PRO"] },
  { id:"volleyball-world", sport:"volleyball", name:"Volleyball World", shortName:"VB World", description:"VNL, mondiaux, beach-volley et compétitions internationales FIVB.", kind:"live_scores", regions:["global","europe","asia","north_america","oceania"], official:true, homeUrl:"https://en.volleyballworld.com/", resultsUrl:"https://en.volleyballworld.com/", badges:["MONDE","LIVE"] },
  { id:"volleyball-cev", sport:"volleyball", name:"CEV", shortName:"CEV", description:"Champions League, coupes d'Europe, sélections et résultats continentaux.", kind:"results", regions:["europe"], official:true, homeUrl:"https://www.cev.eu/", resultsUrl:"https://www.cev.eu/", badges:["EUROPE","CLUBS"] },
  { id:"volleyball-ffvolley", sport:"volleyball", name:"FFVolley", shortName:"FFVolley", description:"Championnats français nationaux, régionaux, jeunes et compétitions amateurs.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://www.ffvolley.org/", resultsUrl:"https://www.ffvolley.org/", badges:["FRANCE","AMATEUR"] },
  { id:"tennis-atp", sport:"tennis", name:"ATP Tour", shortName:"ATP", description:"Circuit masculin ATP : scores, draws, rankings, calendrier et résultats.", kind:"live_scores", regions:["global"], official:true, homeUrl:"https://www.atptour.com/", resultsUrl:"https://www.atptour.com/en/scores", badges:["PRO","HOMMES"] },
  { id:"tennis-wta", sport:"tennis", name:"WTA", shortName:"WTA", description:"Circuit féminin WTA : scores, tableaux, rankings et calendrier.", kind:"live_scores", regions:["global"], official:true, homeUrl:"https://www.wtatennis.com/", resultsUrl:"https://www.wtatennis.com/scores", badges:["PRO","FEMMES"] },
  { id:"tennis-itf", sport:"tennis", name:"ITF", shortName:"ITF", description:"World Tennis Tour, juniors, seniors, beach tennis et compétitions nationales/internationales.", kind:"results", regions:["global","europe","asia","north_america","oceania","africa"], official:true, homeUrl:"https://www.itftennis.com/", resultsUrl:"https://www.itftennis.com/en/tournament-calendar/", badges:["ITF","SEMI-PRO","JUNIORS"] },
  { id:"tennis-fft", sport:"tennis", name:"FFT Ten'Up", shortName:"FFT", description:"Compétitions françaises, clubs, interclubs, tournois homologués et résultats amateurs via FFT/Ten'Up.", kind:"results", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://tenup.fft.fr/", resultsUrl:"https://tenup.fft.fr/", badges:["FRANCE","CLUBS","AMATEUR"] },
  { id:"chess-fide", sport:"chess", name:"FIDE", shortName:"FIDE", description:"Championnats mondiaux, Olympiades, ratings, calendriers et résultats internationaux.", kind:"results", regions:["global","europe","asia","north_america","africa","oceania"], official:true, homeUrl:"https://www.fide.com/", resultsUrl:"https://www.fide.com/", badges:["MONDE","FIDE"] },
  { id:"chess-results", sport:"chess", name:"Chess-Results", shortName:"Chess-Results", description:"Résultats, appariements et classements de milliers de tournois internationaux, nationaux et amateurs.", kind:"live_scores", regions:["global","europe","asia","north_america","africa","oceania"], official:false, homeUrl:"https://chess-results.com/", resultsUrl:"https://chess-results.com/", badges:["TOURNOIS","AMATEUR","MONDE"] },
  { id:"chess-lichess", sport:"chess", name:"Lichess Broadcasts", shortName:"Lichess", description:"Retransmissions et résultats de tournois d'échecs professionnels et communautaires.", kind:"live_scores", regions:["global"], official:false, homeUrl:"https://lichess.org/broadcast", resultsUrl:"https://lichess.org/broadcast", badges:["LIVE","COMMUNAUTÉ"] },
  { id:"esports-liquipedia", sport:"esports", name:"Liquipedia", shortName:"Liquipedia", description:"Calendriers, brackets et résultats multi-jeux e-sport à couverture mondiale.", kind:"results", regions:["global","europe","asia","north_america"], official:false, homeUrl:"https://liquipedia.net/", resultsUrl:"https://liquipedia.net/", badges:["MULTI-JEUX","MONDE"] },
  { id:"esports-esl", sport:"esports", name:"ESL", shortName:"ESL", description:"Compétitions ESL/ESL Pro Tour, résultats et calendriers officiels.", kind:"results", regions:["global","europe","north_america","asia"], official:true, homeUrl:"https://esl.com/", resultsUrl:"https://esl.com/", badges:["ESL","PRO"] },

  // V215 — sources à forte profondeur / amateur / archives
  { id:"foot-liguesdefoot", sport:"foot", name:"LiguesDeFoot.fr", shortName:"LiguesDeFoot", description:"Pyramide complète du football amateur français : national, régional et départemental, résultats, classements et rencontres par ligue/district.", kind:"results", regions:["france","europe"], locales:["fr"], official:false, homeUrl:"https://www.liguesdefoot.fr/", resultsUrl:"https://www.liguesdefoot.fr/championnats/", badges:["FRANCE","R1-R3","DISTRICTS","AMATEUR"], countryCode:"FR", countryName:"France", competitionFamily:"amateur", competitionLevel:"grassroots", tierLabel:"National → District" },
  { id:"foot-rsssf", sport:"foot", name:"RSSSF Domestic Results", shortName:"RSSSF", description:"Archive mondiale de championnats et divisions nationales, y compris niveaux inférieurs, féminin et compétitions historiques.", kind:"results", regions:["global","europe","asia","africa","north_america","latin_america","oceania"], official:false, homeUrl:"https://www.rsssf.org/", resultsUrl:"https://www.rsssf.org/results.html", badges:["MONDE","ARCHIVES","LOWER LEAGUES"], competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D1 → amateur" },
  { id:"padel-padelmatchs", sport:"padel", name:"PadelMatchs", shortName:"PadelMatchs", description:"Tournois live, tableaux et résultats récents de padel, avec catégories P25/P50/P100/P250/P500 et compétitions locales.", kind:"live_scores", regions:["francophone","oceania"], locales:["fr"], official:false, homeUrl:"https://www.padelmatchs.fr/", resultsUrl:"https://www.padelmatchs.fr/", badges:["LIVE","TOURNOIS","AMATEUR"] },
  { id:"badminton-ffbad-ts", sport:"badminton", name:"FFBaD TournamentSoftware", shortName:"FFBaD TS", description:"Tournois homologués français via TournamentSoftware : tableaux, scores et résultats du niveau national au club.", kind:"live_scores", regions:["france","europe"], locales:["fr"], official:true, homeUrl:"https://ffbad.tournamentsoftware.com/", resultsUrl:"https://ffbad.tournamentsoftware.com/tournaments", badges:["FRANCE","TOURNOIS","CLUBS"] },
  { id:"basket-feuilledematch", sport:"basket", name:"Feuille de Match", shortName:"FeuilleMatch", description:"Résultats, affiches, classements, régions et comités du basket amateur français, jusqu'aux niveaux départementaux.", kind:"results", regions:["france","europe"], locales:["fr"], official:false, homeUrl:"https://www.feuille-de-match.fr/", resultsUrl:"https://www.feuille-de-match.fr/", badges:["FRANCE","RÉGIONAL","DÉPARTEMENTAL","AMATEUR"], countryCode:"FR", countryName:"France", competitionFamily:"amateur", competitionLevel:"grassroots", tierLabel:"National → Départemental" },
  { id:"rugby-rugbyamateur", sport:"rugby", name:"RugbyAmateur.fr", shortName:"Rugby Amateur", description:"Résultats français Top 14 à Régionale, Nationale/Nationale 2, Fédérale 1/2/3 et compétitions territoriales.", kind:"results", regions:["france","europe"], locales:["fr"], official:false, homeUrl:"https://rugbyamateur.fr/", resultsUrl:"https://rugbyamateur.fr/resultats/", calendarUrl:"https://rugbyamateur.fr/calendrier-resultats/", badges:["FRANCE","FÉDÉRALE","RÉGIONALE","AMATEUR"], countryCode:"FR", countryName:"France", competitionFamily:"amateur", competitionLevel:"mixed", tierLabel:"Top14 → Régionale" },
  { id:"archery-wam", sport:"archery", name:"World Archery México Results", shortName:"WA México", description:"Résultats officiels, brackets, rankings et scorecards de compétitions World Archery et nationales basées sur Ianseo.", kind:"live_scores", regions:["latin_america","global"], locales:["es","en"], official:true, homeUrl:"https://wam.mx/", resultsUrl:"https://wam.mx/", badges:["BRACKETS","OFFICIEL","IANSEO"] },
  { id:"pickleball-global-results", sport:"pickleball", name:"Pickleball.com Results", shortName:"Pickleball.com", description:"Résultats et tournois pickleball mondiaux, professionnels, universitaires, clubs et amateurs.", kind:"results", regions:["global","north_america","europe","asia","oceania"], locales:["en"], official:false, homeUrl:"https://pickleball.com/", resultsUrl:"https://pickleball.com/results", badges:["MONDE","TOURNOIS","AMATEUR"] },
  { id:"pickleball-gpa", sport:"pickleball", name:"Global Pickleball Alliance", shortName:"GPA", description:"Calendrier mondial, résultats et profils de circuits pickleball de plusieurs fédérations et tours.", kind:"results", regions:["global","north_america","europe","asia","oceania"], locales:["en"], official:false, homeUrl:"https://www.gpapickleball.org/", resultsUrl:"https://www.gpapickleball.org/tournaments", badges:["MONDE","RANKINGS","TOURS"] },
  { id:"frisbee-ultimate-live", sport:"frisbee", name:"Ultimate Federation Live", shortName:"Ultimate Live", description:"Scores live, poules, brackets, classements et statistiques de compétitions européennes d'Ultimate.", kind:"live_scores", regions:["europe","global"], locales:["en"], official:false, homeUrl:"https://ultimatefederation.eu/", resultsUrl:"https://emucc-schedule.ultimatefederation.eu/", badges:["LIVE","EUROPE","CLUBS"] },
  { id:"frisbee-results-archive", sport:"frisbee", name:"Ultimate Results Archive", shortName:"Ultimate Archive", description:"Archive de résultats de tournois Ultimate internationaux, clubs, jeunes et sélections.", kind:"results", regions:["global","europe"], locales:["en"], official:false, homeUrl:"https://archive.ultimatestats.org/", resultsUrl:"https://archive.ultimatestats.org/", badges:["ARCHIVES","MONDE","CLUBS"] },

  // V216 — profondeur mondiale / clubs / amateur vérifiée
  { id:"foot-isl", sport:"foot", name:"Indian Super League", shortName:"ISL", description:"Calendrier, scores et résultats officiels du championnat indien.", kind:"live_scores", regions:["india_asia","asia"], locales:["en","hi"], official:true, homeUrl:"https://www.indiansuperleague.com/", scoresUrl:"https://www.indiansuperleague.com/schedule-fixtures", resultsUrl:"https://www.indiansuperleague.com/schedule-fixtures", badges:["INDE","D1","LIVE"], countryCode:"IN", countryName:"Inde", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1" },
  { id:"foot-aiff", sport:"foot", name:"AIFF Competitions", shortName:"AIFF", description:"Compétitions nationales indiennes, ISL, I-League et calendriers fédéraux.", kind:"results", regions:["india_asia","asia"], locales:["en","hi"], official:true, homeUrl:"https://www.the-aiff.com/competitions", resultsUrl:"https://www.the-aiff.com/competitions", badges:["INDE","FÉDÉRAL","D1-D3"], countryCode:"IN", countryName:"Inde", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D1 → fédéral" },
  { id:"foot-spl-saudi", sport:"foot", name:"Saudi Pro League", shortName:"SPL", description:"Fixtures, résultats et classement officiels de la Saudi Pro League.", kind:"results", regions:["arab_middle_east","asia"], locales:["ar","en"], official:true, homeUrl:"https://www.spl.com.sa/", resultsUrl:"https://www.spl.com.sa/en/fixtures-results", badges:["ARABIE SAOUDITE","D1"], countryCode:"SA", countryName:"Arabie saoudite", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1" },
  { id:"foot-turkey-superlig", sport:"foot", name:"Türkiye Süper Lig", shortName:"Süper Lig", description:"Scores, calendrier et classement du championnat turc.", kind:"live_scores", regions:["turkey","europe","asia"], locales:["tr","en"], official:false, homeUrl:"https://www.trsuperlig.com/", resultsUrl:"https://www.trsuperlig.com/en", badges:["TURQUIE","D1","LIVE"], countryCode:"TR", countryName:"Turquie", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1" },
  { id:"foot-cbf-seriea", sport:"foot", name:"CBF Brasileirão Série A", shortName:"Brasileirão", description:"Table officielle CBF, calendrier et documents du Brasileirão Série A.", kind:"results", regions:["latin_america"], locales:["pt"], official:true, homeUrl:"https://www.cbf.com.br/", resultsUrl:"https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026", badges:["BRÉSIL","SÉRIE A"], countryCode:"BR", countryName:"Brésil", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1" },
  { id:"foot-lpf-arg", sport:"foot", name:"Liga Profesional Argentina", shortName:"LPF", description:"Résultats, journées, classements et compétitions de la Liga Profesional de Fútbol.", kind:"results", regions:["latin_america"], locales:["es"], official:true, homeUrl:"https://www.ligaprofesional.ar/", resultsUrl:"https://www.ligaprofesional.ar/", badges:["ARGENTINE","D1","JEUNES"], countryCode:"AR", countryName:"Argentine", competitionFamily:"domestic_league", competitionLevel:"mixed", tierLabel:"D1 + réserves/jeunes" },
  { id:"foot-psl-za", sport:"foot", name:"Premier Soccer League South Africa", shortName:"PSL", description:"Calendrier et résultats des compétitions professionnelles sud-africaines.", kind:"results", regions:["africa"], locales:["en"], official:true, homeUrl:"https://www.psl.co.za/", resultsUrl:"https://www.psl.co.za/", badges:["AFRIQUE DU SUD","D1-D2"], countryCode:"ZA", countryName:"Afrique du Sud", competitionFamily:"domestic_league", competitionLevel:"pro", tierLabel:"D1-D2" },
  { id:"pingpong-ttleagues", sport:"pingpong", name:"TT Leagues", shortName:"TT Leagues", description:"Ligues de clubs anglaises : fixtures, résultats, classements, moyennes et statistiques joueurs.", kind:"live_scores", regions:["uk_ireland","europe"], locales:["en"], official:true, homeUrl:"https://www.tabletennisengland.co.uk/leagues-and-counties/tt-leagues/", resultsUrl:"https://www.tabletennisengland.co.uk/leagues-and-counties/tt-leagues/", badges:["UK","CLUBS","AMATEUR"] },
  { id:"pingpong-recreational-eu", sport:"pingpong", name:"Table Tennis Tournaments Europe", shortName:"TT Tournaments", description:"Tournois ouverts et récréatifs européens, vétérans et indépendants.", kind:"results", regions:["europe"], locales:["en"], official:false, homeUrl:"https://tabletennis-tournaments.com/", resultsUrl:"https://tabletennis-tournaments.com/tournaments/", badges:["EUROPE","OPEN","AMATEUR"] },
  { id:"pingpong-ttwrating", sport:"pingpong", name:"TTWRating", shortName:"TTWRating", description:"Résultats vérifiés et classements de tournois amateurs de tennis de table.", kind:"live_scores", regions:["eastern_europe","europe"], locales:["en"], official:false, homeUrl:"https://ttwrating.com/en", resultsUrl:"https://ttwrating.com/en", badges:["TOURNOIS","AMATEUR","LIVE"] },
  { id:"pingpong-mysetmatch", sport:"pingpong", name:"MySetMatch", shortName:"MySetMatch", description:"Scores live, brackets et historique de matchs pour compétitions de clubs et amateurs.", kind:"live_scores", regions:["north_america","global"], locales:["en"], official:false, homeUrl:"https://mysetmatch.com/", resultsUrl:"https://mysetmatch.com/", badges:["LIVE","BRACKETS","AMATEUR"] },
  { id:"babyfoot-foosapp", sport:"babyfoot", name:"Foos App Tournaments", shortName:"Foos App", description:"Tournois de baby-foot communautaires avec brackets, formats et résultats récents.", kind:"live_scores", regions:["north_america","global"], locales:["en"], official:false, homeUrl:"https://www.foos-app.com/", resultsUrl:"https://www.foos-app.com/tournaments", badges:["TOURNOIS","COMMUNAUTÉ","AMATEUR"] },
  { id:"babyfoot-letsfoos", sport:"babyfoot", name:"Let's Foos", shortName:"Let's Foos", description:"Plateforme communautaire de clubs et tournois de baby-foot avec statistiques et classements.", kind:"results", regions:["europe","global"], locales:["en","de"], official:false, homeUrl:"https://lets-foos.com/", resultsUrl:"https://lets-foos.com/", badges:["CLUBS","TOURNOIS","COMMUNAUTÉ"] },
  { id:"molkky-hub-jp", sport:"molkky", name:"Mölkky Hub Japan", shortName:"Mölkky Hub", description:"Grand annuaire japonais de tournois et équipes Mölkky, y compris événements de clubs.", kind:"calendar", regions:["japan_asia","asia"], locales:["ja"], official:false, homeUrl:"https://molkky-hub.com/", resultsUrl:"https://molkky-hub.com/", calendarUrl:"https://molkky-hub.com/event/tournament", badges:["JAPON","CLUBS","AMATEUR"] },
  { id:"molkky-jma", sport:"molkky", name:"Japan Mölkky Association", shortName:"JMA", description:"Calendrier officiel et archives des tournois Mölkky au Japon.", kind:"results", regions:["japan_asia","asia"], locales:["ja"], official:true, homeUrl:"https://molkky.jp/", resultsUrl:"https://molkky.jp/tournament/", badges:["JAPON","OFFICIEL","TOURNOIS"] },
  { id:"molkky-cz", sport:"molkky", name:"Český svaz MÖLKKY", shortName:"Mölkky CZ", description:"Championnats et tournois tchèques avec classements et résultats publiés.", kind:"results", regions:["czechia","europe"], locales:["cs"], official:true, homeUrl:"https://www.molkky.cz/", resultsUrl:"https://www.molkky.cz/", badges:["TCHÉQUIE","RÉSULTATS"] },
  { id:"molkky-de", sport:"molkky", name:"Mölkky Deutschland", shortName:"Mölkky DE", description:"Calendrier de tournois allemands et liens vers résultats/organisateurs.", kind:"calendar", regions:["dach","europe"], locales:["de"], official:false, homeUrl:"https://www.moelkky.de/", calendarUrl:"https://www.moelkky.de/turniere", badges:["ALLEMAGNE","TOURNOIS"] },
  { id:"padel-mypadel", sport:"padel", name:"MyPadel", shortName:"MyPadel", description:"Tournois de clubs : poules, tableaux, scores et classements publics.", kind:"live_scores", regions:["france","francophone","europe"], locales:["fr"], official:false, homeUrl:"https://www.mypadel-home.com/", resultsUrl:"https://www.mypadel-home.com/", badges:["CLUBS","SCORES","AMATEUR"] },
  { id:"padel-pista", sport:"padel", name:"Pista", shortName:"Pista", description:"Calendrier pro et amateur, résultats, tableaux et scores des événements suivis.", kind:"live_scores", regions:["global","north_america","europe"], locales:["en"], official:false, homeUrl:"https://pista.cloud/", resultsUrl:"https://pista.cloud/explore", badges:["PRO","AMATEUR","LIVE"] },
  { id:"padel-listing", sport:"padel", name:"PadelListing", shortName:"PadelListing", description:"Catalogue mondial de tournois FIP et clubs par région, avec événements live et archives.", kind:"calendar", regions:["global","europe","asia","north_america","latin_america","arab_middle_east"], locales:["en"], official:false, homeUrl:"https://padellisting.com/", resultsUrl:"https://padellisting.com/", badges:["MONDE","TOURNOIS","CLUBS"] },
  { id:"padel-padeli", sport:"padel", name:"Padeli Tournaments", shortName:"Padeli", description:"Calendrier et archives de tournois Padel avec filtres et résultats passés.", kind:"results", regions:["global","europe","asia","north_america"], locales:["en"], official:false, homeUrl:"https://padeli.com/", resultsUrl:"https://padeli.com/tournaments/", badges:["TOURNOIS","ARCHIVES","MONDE"] },
  { id:"cornhole-players", sport:"cornhole", name:"Cornhole Players", shortName:"CornholePlayers", description:"Classements ACO, résultats de tournois et liens vers brackets Scoreholio.", kind:"results", regions:["north_america","global"], locales:["en"], official:false, homeUrl:"https://cornholeplayers.com/", resultsUrl:"https://cornholeplayers.com/", badges:["ACO","STANDINGS","RESULTS"] },
  { id:"bowling-leaguesecretary", sport:"bowling", name:"LeagueSecretary", shortName:"LeagueSecretary", description:"Classements, calendriers, recaps et historique de milliers de ligues de bowling, jusqu'au niveau local.", kind:"live_scores", regions:["north_america","global"], locales:["en"], official:false, homeUrl:"https://www.leaguesecretary.com/", resultsUrl:"https://www.leaguesecretary.com/", badges:["LIGUES","CLUBS","AMATEUR"] },

];

const DARTS_AS_GENERIC: SportLiveSource[] = DARTS_LIVE_SOURCES.map((source) => ({
  ...source,
  sport: "darts" as const,
  regions: source.regions as SportLiveRegion[],
}));

export const SPORT_LIVE_SOURCES: SportLiveSource[] = Array.from(
  new Map([...DARTS_AS_GENERIC, ...OTHER_SPORT_SOURCES].map((source) => [source.id, source] as const)).values(),
);

export function getLocaleProfile(locale: string | null | undefined): SportLiveLocaleProfile {
  const key = String(locale || "fr").toLowerCase().split("-")[0];
  return SPORT_LIVE_LOCALE_PROFILES[key] || SPORT_LIVE_LOCALE_PROFILES.en;
}

export function getSportSources(sport: SportLiveSportId): SportLiveSource[] {
  return SPORT_LIVE_SOURCES.filter((source) => source.sport === sport);
}

export function getRecommendedSportSources(sport: SportLiveSportId, locale: string | null | undefined): SportLiveSource[] {
  if (sport === "darts") {
    return getDartsRecommendedSources(locale).map((source) => ({ ...source, sport: "darts" as const, regions: source.regions as SportLiveRegion[] }));
  }

  const profile = getLocaleProfile(locale);
  const localeKey = String(locale || "fr").toLowerCase().split("-")[0];
  const preferred = new Set<SportLiveRegion>(profile.preferredRegions);
  const sources = getSportSources(sport);

  const scored = sources
    .map((source) => {
      let score = 0;
      if (source.locales?.includes(localeKey)) score += 100;
      if (source.regions.some((region) => preferred.has(region))) score += 50;
      if (source.regions.includes("global")) score += 15;
      if (source.official) score += 5;
      return { source, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name));

  return scored.length ? scored.map((item) => item.source) : sources;
}

export function getAvailableRegions(sport: SportLiveSportId, locale: string | null | undefined): SportLiveRegion[] {
  if (sport === "darts") return getDartsAvailableRegions(locale) as SportLiveRegion[];
  const profile = getLocaleProfile(locale);
  const sourceRegions = new Set(getSportSources(sport).flatMap((source) => source.regions));
  const result: SportLiveRegion[] = [];
  const candidates = [...profile.preferredRegions, ...profile.fallbackRegions, "global" as SportLiveRegion, ...Array.from(sourceRegions)];
  for (const region of candidates) {
    if (sourceRegions.has(region) && !result.includes(region)) result.push(region);
  }
  return result;
}
