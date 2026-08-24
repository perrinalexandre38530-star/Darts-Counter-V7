// ============================================
// src/pages/Settings.tsx — Thème + Langue + Compte + Reset App + Choix de sport
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
// + Drapeaux pour les langues
// + Catégories + carrousels horizontaux pour les thèmes
// + Bloc "Compte & sécurité" inline (V8 always-connected)
// + Bloc "Notifications & communications"
// + Bouton "Tout réinitialiser" (hard reset + reload)
// + Bouton "Supprimer mon compte" (via useAuthOnline().deleteAccount ONLY)
// ✅ NEW : UI "shell" style StatsShell : header + liste de cartes menu
// - Le menu remplace le row d’onglets : tu cliques une carte => ouvre la section
// - Bouton "Retour" en haut :
//   • si on est dans une section => retour au menu settings
//   • sinon => retour Home
// ✅ NEW : Boutons “Changer de jeu” + “Réinitialiser le choix” (START_GAME_KEY)
// ✅ NEW (REQUEST): Vraie page "Compte" simple et efficace :
//   - Menu Compte (cartes): Profil / Notifications / Sécurité / Danger
//   - Sous-pages claires (retour interne au menu compte)
//
// ✅ NEW (DEV MODE):
// - Bloc "Développeur" dans Settings (menu) :
//   • Toggle ON/OFF
//   • ON = rend cliquables les features grisées (non terminées)
// - Panel "Tests & Simulations" (best-effort flags locaux, reset ciblés, etc.)
// ============================================

import { localeForLang, pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import TerritoriesMapView from "../territories/TerritoriesMapView";
import { buildTerritoriesMap, getBaseSvgForCountry } from "../territories/map";
import { useStore } from "../contexts/StoreContext";
import { PageAdBanner } from "../monetization/AdSlot";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { THEMES, type ThemeId, type AppTheme } from "../theme/themePresets";
import { CITRUS_THEME_IDS, FACTORY_THEME_IDS, PUB_THEME_IDS, GRAFFITI_THEME_IDS, POSTAPOC_THEME_IDS, ARCADE_THEME_IDS, STREET_THEME_IDS, PRESTIGE_THEME_IDS, ABSTRACT_THEME_IDS, arePremiumThemesUnlocked, canUseTheme, isPremiumTheme } from "../theme/themeAccess";
import { subscribeVerifiedEntitlements } from "../monetization/prefs";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { AccountToolsPanel } from "../components/account/AccountToolsPanel";
import OnlineStatsCleanupPanel from "../components/OnlineStatsCleanupPanel";
import { pushNasAccountSnapshot, pullNasAccountSnapshot, getNasSyncState, computeNasSyncSummary } from "../lib/manualNasSync";
import { getApiUrl } from "../lib/apiClient";
import { onlineApi } from "../lib/onlineApi";
import { exportCloudBackupAsJson, restoreCloudBackupFromJson } from "../lib/cloudBackup";
import { generateDiagnostic, exportDiagnostic } from "../lib/diagnosticPro";
import { getCrashLog, getLastCrashReport } from "../lib/crashReporter";
import { simulateDevMatchesAllGames } from "../lib/devMatchSimulator";
import { injectDevX01ReferenceMatch } from "../lib/devInjectX01TestMatch";
import { useSport } from "../contexts/SportContext";
// MONETIZATION_V1
import MonetizationSettingsPanel from "../monetization/MonetizationSettingsPanel";
import AwenaSettingsSection from "../awena/components/AwenaSettingsSection";
import AudioSettingsPanel from "../components/settings/AudioSettingsPanel";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { getAudioPreferences } from "../lib/audioPreferences";

import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  endGoogleCastSession,
  getGoogleCastAppId,
  getGoogleCastState,
  pingGoogleCastReceiver,
  requestGoogleCastSession,
  resetGoogleCastAppId,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";
import { buildViewerWaitingSnapshot } from "../lib/viewer/buildViewerSnapshot";
import { createViewerSession, publishViewerSnapshot, viewerJoinUrl } from "../lib/viewer/viewerClient";
import { clearActiveViewerSession, getActiveViewerSession, setActiveViewerSession, subscribeViewerSessionChanged } from "../lib/viewer/viewerSession";
import { clearViewerDiagLog, getViewerDiagLog } from "../lib/viewer/viewerPublisher";
import type { ViewerSessionInfo } from "../lib/viewer/types";
import {
  getLocalStorageCapabilities,
  estimateBrowserStorage,
  formatStorageBytes,
  formatStoragePrice,
  getPublicStorageDestinations,
  getPublicStoragePlans,
  loadStoragePrefs,
  saveStoragePrefs,
  type StorageDestinationId,
  type StoragePlanId,
} from "../lib/storagePlans";
import {
  chooseExternalBackupFile,
  downloadExternalBackupFallback,
  forgetExternalBackupFile,
  getExternalBackupStatus,
  writeExternalBackupNow,
  type ExternalBackupStatus,
} from "../lib/externalBackupTarget";
import {
  getSupabaseAuthFailoverState,
  type SupabaseAuthFailoverState,
} from "../lib/supabaseAuthFailover";
import {
  createStorageCheckoutSession,
  getAccountStorageUsage,
  deleteCloudObjectRemote,
  downloadCloudBackupJson,
  downloadCloudObject,
  getCloudStorageStatus,
  getSupabaseAccountStatus,
  getSupabaseBridgeStatus,
  getSupabaseTablesStatus,
  getStorageStripeStatus,
  listCloudBackups,
  saveAccountStoragePreferences,
  uploadCloudBackupJson,
  uploadCloudObject,
  verifyStorageCheckoutSession,
  type AccountStorageUsage,
  type CloudObjectIndexItem,
  type CloudStorageStatus,
  type SupabaseAccountStatus,
  type SupabaseBridgeStatus,
  type SupabaseTablesStatus,
  type StorageBillingInterval,
  type StorageStripeStatus,
} from "../lib/cloudStorageApi";
import { getDirectR2Status, getDirectR2Usage, isDirectR2PremiumWriteAllowed } from "../lib/directR2BackupApi";

// ✅ DEV MODE (assure-toi d’avoir DevModeProvider au root)
import { useDevMode } from "../contexts/DevModeContext";

// IMPORTANT: ajuste les chemins si tes assets sont ailleurs
import logoDarts from "../assets/games/logo-darts.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoBabyFoot from "../assets/games/logo-babyfoot.png";
import logoRunning from "../assets/games/logo-running-performance.png";

// ✅ Sports à venir (SOON)
import logoArchery from "../assets/games/logo-archery.png";
import logoMolkky from "../assets/games/logo-molkky.png";
import logoPadel from "../assets/games/logo-padel.png";
import logoPickleball from "../assets/games/logo-pickleball.png";
import logoFrisbee from "../assets/games/logo-frisbee.png";
import logoBillard from "../assets/games/logo-billard.png";
import logoBadminton from "../assets/games/logo-badminton.png";
import logoBasket from "../assets/games/logo-basket.png";
import logoCornhole from "../assets/games/logo-cornhole.png";
import logoDiceGame from "../assets/games/logo-dicegame.png";
import logoFoot from "../assets/games/logo-foot.png";
import logoRugby from "../assets/games/logo-rugby.png";
import logoVolley from "../assets/games/logo-volley.png";
import logoTennis from "../assets/games/logo-tennis.png";
import logoChess from "../assets/games/logo-chess.png";

type Props = { go?: (tab: any, params?: any) => void; params?: any };

// ---------------- Thèmes dispo + descriptions fallback ----------------

const NEONS: ThemeId[] = ["gold", "pink", "petrol", "green", "magenta", "red", "orange", "white"];
const SOFTS: ThemeId[] = ["blueNight", "blueOcean", "limeYellow", "sage", "skyBlue"];
const CITRUS: ThemeId[] = [...CITRUS_THEME_IDS];
const DARKS: ThemeId[] = ["darkTitanium", "darkCarbon", "darkFrost", "darkObsidian"];
const FACTORY: ThemeId[] = [...FACTORY_THEME_IDS];
const PUBS: ThemeId[] = [...PUB_THEME_IDS];
const GRAFFITIS: ThemeId[] = [...GRAFFITI_THEME_IDS];
const POSTAPOC: ThemeId[] = [...POSTAPOC_THEME_IDS];
const ARCADES: ThemeId[] = [...ARCADE_THEME_IDS];
const STREETS: ThemeId[] = [...STREET_THEME_IDS];
const PRESTIGES: ThemeId[] = [...PRESTIGE_THEME_IDS];
const ABSTRACTS: ThemeId[] = [...ABSTRACT_THEME_IDS];
const PREMIUM_THEMES_STORE_PACK_ID = "themes_neon_01";
const THEME_SECTION_STATE_STORAGE_KEY = "dc_settings_theme_section_state_v4";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type ThemeFxProfile = {
  texture: number;
  ambient: number;
  sheen: number;
  frame: number;
  innerTexture: number;
  innerSheen: number;
  innerFrame: number;
  swatchTexture: number;
  swatchAmbient: number;
  swatchSheen: number;
  swatchFrame: number;
  tileTexture: number;
  tileSheen: number;
  tileFrame: number;
};

const getThemeFxProfile = (preset?: Partial<AppTheme> | null): ThemeFxProfile => {
  const base: ThemeFxProfile = {
    texture: 0.42,
    ambient: 0.16,
    sheen: 0.24,
    frame: 0.76,
    innerTexture: 0.30,
    innerSheen: 0.22,
    innerFrame: 0.44,
    swatchTexture: 0.20,
    swatchAmbient: 0.10,
    swatchSheen: 0.18,
    swatchFrame: 0.20,
    tileTexture: 0.34,
    tileSheen: 0.22,
    tileFrame: 0.32,
  };
  switch (preset?.previewVariant) {
    case "matte":
      return { ...base, texture: 0.18, ambient: 0.06, sheen: 0.0, frame: 0.10, innerTexture: 0.12, innerSheen: 0.0, innerFrame: 0.06, swatchTexture: 0.12, swatchAmbient: 0.05, swatchSheen: 0.0, swatchFrame: 0.08, tileTexture: 0.16, tileSheen: 0.0, tileFrame: 0.10 };
    case "etched":
      return { ...base, texture: 0.20, ambient: 0.06, sheen: 0.04, frame: 0.16, innerTexture: 0.15, innerSheen: 0.04, innerFrame: 0.12, swatchTexture: 0.13, swatchAmbient: 0.05, swatchSheen: 0.02, swatchFrame: 0.10, tileTexture: 0.18, tileSheen: 0.03, tileFrame: 0.14 };
    case "glass":
      return { ...base, texture: 0.14, ambient: 0.07, sheen: 0.10, frame: 0.12, innerTexture: 0.11, innerSheen: 0.10, innerFrame: 0.10, swatchTexture: 0.10, swatchAmbient: 0.06, swatchSheen: 0.08, swatchFrame: 0.08, tileTexture: 0.15, tileSheen: 0.10, tileFrame: 0.10 };
    case "velvet":
      return { ...base, texture: 0.16, ambient: 0.05, sheen: 0.03, frame: 0.14, innerTexture: 0.13, innerSheen: 0.03, innerFrame: 0.12, swatchTexture: 0.11, swatchAmbient: 0.04, swatchSheen: 0.02, swatchFrame: 0.08, tileTexture: 0.15, tileSheen: 0.03, tileFrame: 0.12 };
    case "neon":
      return { ...base, texture: 0.22, ambient: 0.10, sheen: 0.06, frame: 0.14, innerTexture: 0.18, innerSheen: 0.06, innerFrame: 0.12, swatchTexture: 0.14, swatchAmbient: 0.08, swatchSheen: 0.05, swatchFrame: 0.10, tileTexture: 0.21, tileSheen: 0.06, tileFrame: 0.12 };
    default:
      return base;
  }
};

const THEME_META: Record<ThemeId, { defaultLabel: string; defaultDesc: string }> = {
  gold: { defaultLabel: "Gold néon", defaultDesc: "Thème premium doré" },
  pink: { defaultLabel: "Rose fluo", defaultDesc: "Ambiance arcade rose" },
  petrol: { defaultLabel: "Bleu pétrole", defaultDesc: "Bleu profond néon" },
  green: { defaultLabel: "Vert néon", defaultDesc: "Style practice lumineux" },
  magenta: { defaultLabel: "Magenta", defaultDesc: "Violet / magenta intense" },
  red: { defaultLabel: "Rouge", defaultDesc: "Rouge arcade agressif" },
  orange: { defaultLabel: "Orange", defaultDesc: "Orange chaud énergique" },
  white: { defaultLabel: "Blanc", defaultDesc: "Fond clair moderne" },

  blueNight: { defaultLabel: "Bleu nuit", defaultDesc: "Fond sombre + flash bleu clair" },
  blueOcean: { defaultLabel: "Bleu océan", defaultDesc: "Bleu naturel océan / ciel" },
  limeYellow: { defaultLabel: "Vert jaune", defaultDesc: "Couleur lime hyper flashy" },
  citrusVolt: { defaultLabel: "Citrus Volt", defaultDesc: "Marbre vert profond, touches olive et veines dorées" },
  citrusOliveMarble: { defaultLabel: "Olive Marbre", defaultDesc: "Marbre olive sombre et nervures dorées" },
  citrusJadeFlow: { defaultLabel: "Jade Flow", defaultDesc: "Flux jade lumineux et reflets premium" },
  citrusGildedInk: { defaultLabel: "Encre Dorée", defaultDesc: "Encre vert-or avec relief artistique" },
  citrusLimeAurora: { defaultLabel: "Lime Aurora", defaultDesc: "Fusion jaune-vert intense et énergie lumineuse" },
  sage: { defaultLabel: "Vert sauge", defaultDesc: "Tons verts naturels et doux" },
  skyBlue: { defaultLabel: "Bleu pastel", defaultDesc: "Bleu très doux et lumineux" },

  darkTitanium: { defaultLabel: "Titane sombre", defaultDesc: "Look métal premium mat" },
  darkCarbon: { defaultLabel: "Carbone", defaultDesc: "Ambiance fibre carbone moderne" },
  darkFrost: { defaultLabel: "Givre sombre", defaultDesc: "Noir givré futuriste" },
  darkObsidian: { defaultLabel: "Obsidienne", defaultDesc: "Noir poli premium et lisible" },

  arenaDartsPub: { defaultLabel: "Darts Pub", defaultDesc: "Bois sombre, lumière chaude et touches pub" },
  arenaChampionship: { defaultLabel: "Championship Arena", defaultDesc: "Rouge compétition, projecteurs et ambiance TV" },
  arenaCyber: { defaultLabel: "Cyber Arena", defaultDesc: "Cyan, magenta et profondeur holographique" },
  arenaStreet: { defaultLabel: "Street Sport", defaultDesc: "Béton sombre, énergie urbaine et accents lime" },
  arenaStadiumNight: { defaultLabel: "Stadium Night", defaultDesc: "Bleu nuit, projecteurs et ambiance grand stade" },
  arenaLuxuryClub: { defaultLabel: "Luxury Club", defaultDesc: "Noir, or et finition club premium" },
  arenaRetroArcade: { defaultLabel: "Retro Arcade", defaultDesc: "Néons rétro modernisés et grille lumineuse" },
  arenaFireIce: { defaultLabel: "Fire & Ice", defaultDesc: "Contraste glace bleue et chaleur rouge-orange" },

  materialBoisNoble: { defaultLabel: "Bois Noble", defaultDesc: "Bois premium ambré, relief chaud et vernis noble" },
  materialMarbreVert: { defaultLabel: "Marbre Vert", defaultDesc: "Pierre sombre veinée avec éclats jade" },
  materialCuivreFondu: { defaultLabel: "Cuivre Fondu", defaultDesc: "Cuivre incandescent et reflets métalliques" },

  metalAluminiumPro: { defaultLabel: "Aluminium Pro", defaultDesc: "Métal clair usiné et ambiance technique" },
  metalAcierBrosse: { defaultLabel: "Acier Brossé", defaultDesc: "Acier industriel avec brossage horizontal" },
  metalTitaneForge: { defaultLabel: "Titane Forgé", defaultDesc: "Titane sombre, forgé et très haut de gamme" },

  extremeLavaCore: { defaultLabel: "Lava Core", defaultDesc: "Lave craquelée, énergie chaude et magma" },
  extremeFireGlace: { defaultLabel: "Feu Solaire", defaultDesc: "Feu incandescent, braises premium et intensité orange" },
  extremeArcticPulse: { defaultLabel: "Glace Polaire", defaultDesc: "Glace cristalline, froid bleu et éclat premium" },

  luxePlatineRoyale: { defaultLabel: "Platine Royale", defaultDesc: "Platine, métal noble et prestige sobre" },
  luxeOrDiamant: { defaultLabel: "Or Royal", defaultDesc: "Or brossé premium et luxe lumineux" },
  luxeEmeraudeNoire: { defaultLabel: "Diamant Noir", defaultDesc: "Facettes sombres, éclats glacés et prestige minéral" },

  factoryArgentSatine: { defaultLabel: "Argent Satiné", defaultDesc: "Aluminium satiné doux et propre" },
  factoryDegradeGraphite: { defaultLabel: "Dégradé Graphite", defaultDesc: "Dégradé graphite minimal et élégant" },
  factoryAtelierGrunge: { defaultLabel: "Atelier Grunge", defaultDesc: "Plaque grise mate et usure atelier" },
  factoryPlaquesDecoupees: { defaultLabel: "Plaques Découpées", defaultDesc: "Panneaux acier géométriques et modernes" },
  factoryLamesMetal: { defaultLabel: "Lames Métal", defaultDesc: "Lames industrielles anthracite et relief" },
  factoryAcierFissure: { defaultLabel: "Acier Fissuré", defaultDesc: "Acier usé fissuré et contraste fort" },
  factoryAcierRaye: { defaultLabel: "Acier Rayé", defaultDesc: "Brossage horizontal net et éclat froid" },
  factoryToleGivree: { defaultLabel: "Tôle Givrée", defaultDesc: "Tôle claire patinée et lumière froide" },
  factoryBrossagePro: { defaultLabel: "Brossage Pro", defaultDesc: "Acier brossé premium ultra lisible" },
  factoryBrumeArgent: { defaultLabel: "Brume Argent", defaultDesc: "Brume métallique douce et profonde" },
  factoryMurIndustriel: { defaultLabel: "Mur Industriel", defaultDesc: "Mur d’atelier sombre et poussiéreux" },
  pubBoisViolet: { defaultLabel: "Bois Violet", defaultDesc: "Lames de bois froides et halo lounge" },
  pubSceneAmbree: { defaultLabel: "Scène Ambrée", defaultDesc: "Scène pub chaude et spots ambrés" },
  pubComptoirVintage: { defaultLabel: "Comptoir Vintage", defaultDesc: "Bois patiné et ambiance bistrot" },
  graffitiTagsNocturnes: { defaultLabel: "Tags Nocturnes", defaultDesc: "Mur noir saturé de tags urbains" },
  graffitiEclatCyan: { defaultLabel: "Éclat Cyan", defaultDesc: "Jet cyan graphique et énergie street" },
  graffitiMurPop: { defaultLabel: "Mur Pop", defaultDesc: "Mur pop coloré et vibe graffiti" },
  graffitiRuelle: { defaultLabel: "Ruelle Graff", defaultDesc: "Ruelle sombre avec touches colorées" },
  graffitiExplosionBlanche: { defaultLabel: "Explosion Blanche", defaultDesc: "Impact blanc et spray contrasté" },
  graffitiRougeUnderground: { defaultLabel: "Rouge Underground", defaultDesc: "Tags rouges agressifs et ambiance night" },
  graffitiChaosPrimaire: { defaultLabel: "Chaos Primaire", defaultDesc: "Graffiti noir ultra dense avec couleurs primaires explosives" },
  graffitiBetonPastel: { defaultLabel: "Béton Pastel", defaultDesc: "Mur béton clair couvert de tags pastel et halos doux" },
  graffitiPeaceLove: { defaultLabel: "Peace Love", defaultDesc: "Typographies pop néon, amour street et contrastes magenta" },
  graffitiSplashAcidule: { defaultLabel: "Splash Acidulé", defaultDesc: "Drips jaune fluo, rose saturé et énergie ultra pop" },
  graffitiLineLove: { defaultLabel: "Line Love", defaultDesc: "Version lumineuse et calligraphique d’un mur love urbain" },
  graffitiBlackbookRiot: { defaultLabel: "Blackbook Riot", defaultDesc: "Noir & blanc sauvage avec éclats couleur au centre" },
  graffitiAtelierSpray: { defaultLabel: "Atelier Spray", defaultDesc: "Mur d’atelier saturé, marqueurs visibles et street fusion" },
  graffitiCollageChrome: { defaultLabel: "Collage Chrome", defaultDesc: "Collage urbain, traits blancs et reflets chrome colorés" },
  graffitiBleuLilas: { defaultLabel: "Bleu Lilas", defaultDesc: "Bleus électriques, lilas froid et tag mural moderne" },
  graffitiRoseHero: { defaultLabel: "Rose Hero", defaultDesc: "Brosses roses, tags arty et énergie créative assumée" },
  postApocAubeRuines: { defaultLabel: "Aube des Ruines", defaultDesc: "Atmosphère chaude, poussière et soleil sur la ville effondrée" },
  postApocBetonGris: { defaultLabel: "Béton Gris", defaultDesc: "Ville froide, béton fissuré et silence minéral" },
  postApocCrepusculeCorbeau: { defaultLabel: "Crépuscule Corbeau", defaultDesc: "Ciel orange, carcasses urbaines et ambiance crépusculaire" },
  postApocHorizonCendre: { defaultLabel: "Horizon Cendre", defaultDesc: "Fumées, lumière dorée et route abandonnée" },
  postApocTourBrisee: { defaultLabel: "Tour Brisée", defaultDesc: "Béton clair, végétation sauvage et structures éventrées" },
  postApocEdenPerdu: { defaultLabel: "Éden Perdu", defaultDesc: "Ruines tropicales, palmiers et soleil de fin du monde" },
  postApocChuteFinale: { defaultLabel: "Chute Finale", defaultDesc: "Impact céleste, fumées et ville au bord de l’effondrement" },
  postApocAvenueSilence: { defaultLabel: "Avenue du Silence", defaultDesc: "Rue désertée, gravats et lumière chaude entre les immeubles" },
  postApocPluieNeon: { defaultLabel: "Néon Déchu", defaultDesc: "Pluie urbaine, reflets cyan et ville abandonnée" },
  arcadePixelRose: { defaultLabel: "Pixel Rose", defaultDesc: "Pixel art rose et violet arcade" },
  arcadeNeonPixels: { defaultLabel: "Néon Pixels", defaultDesc: "Grille néon multi-couleurs hyper arcade" },
  arcadePortailBleu: { defaultLabel: "Portail Bleu", defaultDesc: "Portail numérique bleu électrique" },
  arcadeVioletMatrix: { defaultLabel: "Violet Matrix", defaultDesc: "Mosaïque violette et néons froids" },
  streetRouteUrbex: { defaultLabel: "Route Urbex", defaultDesc: "Asphalte usé, lignes jaunes et énergie urbaine" },
  streetMurStreetArt: { defaultLabel: "Street Art", defaultDesc: "Mur street art coloré et brut" },
  streetAcierUrbain: { defaultLabel: "Acier Urbain", defaultDesc: "Façade urbaine bleutée et lignes métal" },
  streetPisteColors: { defaultLabel: "Piste Colors", defaultDesc: "Asphalte peint et explosions de couleurs" },
  prestigeDiamantPur: { defaultLabel: "Diamant Pur", defaultDesc: "Cristal blanc facetté et prestige glacé" },
  prestigeDiamantBrume: { defaultLabel: "Diamant Brume", defaultDesc: "Diamant nacré et reflets argentés" },
  prestigeDiamantRose: { defaultLabel: "Diamant Rose", defaultDesc: "Facettes roses et luxe pop cristallin" },
  prestigeQuartzDore: { defaultLabel: "Quartz Doré", defaultDesc: "Cristaux dorés et éclats luxueux" },
  prestigeSaphirCristal: { defaultLabel: "Saphir Cristal", defaultDesc: "Saphir lavande aux facettes lumineuses" },
  prestigeEmeraudeRoyale: { defaultLabel: "Émeraude Royale", defaultDesc: "Prismes verts profonds et élégance minérale" },
  prestigeEmeraudeLumiere: { defaultLabel: "Émeraude Lumière", defaultDesc: "Émeraude lumineuse et halo précieux" },
  prestigeOrPatine: { defaultLabel: "Or Patiné", defaultDesc: "Or texturé patiné et finition noble" },
  prestigeOrVelours: { defaultLabel: "Or Velours", defaultDesc: "Or velours diffus et chaleur premium" },
  prestigeOrSoie: { defaultLabel: "Or Soie", defaultDesc: "Voile d’or soyeux et texture fine" },
  prestigeOrBrut: { defaultLabel: "Or Brut", defaultDesc: "Or brut minéral et caractère luxueux" },
  prestigeOrFusion: { defaultLabel: "Or Fusion", defaultDesc: "Matière dorée fusionnée et éclat intense" },
  prestigeOrFacettes: { defaultLabel: "Or Facettes", defaultDesc: "Or facetté et éclats joaillerie" },
  prestigeSaphirRoyal: { defaultLabel: "Saphir Royal", defaultDesc: "Saphir profond et prestige nocturne" },
  prestigeSaphirNuit: { defaultLabel: "Saphir Nuit", defaultDesc: "Éclats bleus électriques et cristal nuit" },
  abstractGreenSplash: { defaultLabel: "Vert Splash", defaultDesc: "Projection verte sombre et texture urbaine" },
  abstractVioletInk: { defaultLabel: "Encre Violette", defaultDesc: "Splash violet néon sur fond noir" },
  abstractOrangeRugged: { defaultLabel: "Orange Rugueux", defaultDesc: "Éclats orange bruts et fond charbon" },
  abstractVioletMur: { defaultLabel: "Mur Violet", defaultDesc: "Mur abstrait violet très profond" },
  abstractOrangeFusion: { defaultLabel: "Orange Fusion", defaultDesc: "Matière orange chaleureuse et diffuse" },
  abstractOrangeFlare: { defaultLabel: "Orange Flare", defaultDesc: "Orange incandescent et énergie vive" },
  abstractGreenBurst: { defaultLabel: "Green Burst", defaultDesc: "Éclats verts et jaunes sur fond intense" },
  abstractOrangeObsidian: { defaultLabel: "Orange Obsidienne", defaultDesc: "Grunge noir/orange très contrasté" },
  abstractAmberStorm: { defaultLabel: "Ambre Storm", defaultDesc: "Lumière ambre diffuse et texture artistique" },
  abstractWatercolor: { defaultLabel: "Aquarelle Verte", defaultDesc: "Aquarelle douce et fraîcheur moderne" },
  abstractPurpleGrunge: { defaultLabel: "Purple Grunge", defaultDesc: "Béton violet nocturne et ambiance club" },
  abstractIceRed: { defaultLabel: "Glace Rouge", defaultDesc: "Stries glacées rouges et ambiance polaire" },
  abstractPatina: { defaultLabel: "Patine Matière", defaultDesc: "Patine minérale beige et rouille douce" },
  abstractSolarDust: { defaultLabel: "Solar Dust", defaultDesc: "Explosion rouge/orange et halo de chaleur" },
  abstractCrimsonIce: { defaultLabel: "Crimson Ice", defaultDesc: "Cristaux rouges et texture glacée" },
  abstractSolarGlow: { defaultLabel: "Solar Glow", defaultDesc: "Lumière chaude et matière brûlante" },
  abstractOxydBlue: { defaultLabel: "Oxyd Bleu", defaultDesc: "Oxydation bleu/gris et grain industriel" },
  abstractOliveCanvas: { defaultLabel: "Olive Canvas", defaultDesc: "Toile olive diffuse et relief subtil" },
  abstractSpectrumDust: { defaultLabel: "Spectrum Dust", defaultDesc: "Nuancier grunge multicolore et fond sombre" },
  abstractTurquoiseRust: { defaultLabel: "Turquoise Rust", defaultDesc: "Turquoise patiné et texture froide" },
  abstractVioletPoster: { defaultLabel: "Poster Violet", defaultDesc: "Poster violet vibrant et grain mural" },
  abstractPurpleNebula: { defaultLabel: "Purple Nebula", defaultDesc: "Nébuleuse violette et profondeur grunge" },
};

function getPreset(id: ThemeId): AppTheme {
  const found = THEMES.find((t) => t.id === id);
  return found ?? THEMES[0];
}

// ---------------- Langues + libellés fallback ----------------

const LANG_CHOICES: { id: Lang; defaultLabel: string; short: string }[] = [
  { id: "fr", defaultLabel: "Français", short: "FR" },
  { id: "en", defaultLabel: "English", short: "GB" },
  { id: "es", defaultLabel: "Español", short: "ES" },
  { id: "de", defaultLabel: "Deutsch", short: "DE" },
  { id: "it", defaultLabel: "Italiano", short: "IT" },
  { id: "pt", defaultLabel: "Português", short: "PT" },
  { id: "nl", defaultLabel: "Nederlands", short: "NL" },

  { id: "ru", defaultLabel: "Русский", short: "RU" },
  { id: "zh", defaultLabel: "中文", short: "CN" },
  { id: "ja", defaultLabel: "日本語", short: "JP" },
  { id: "ar", defaultLabel: "العربية", short: "AR" },

  { id: "hi", defaultLabel: "हिन्दी", short: "HI" },
  { id: "tr", defaultLabel: "Türkçe", short: "TR" },

  { id: "da", defaultLabel: "Dansk", short: "DK" },
  { id: "no", defaultLabel: "Norsk", short: "NO" },
  { id: "sv", defaultLabel: "Svenska", short: "SE" },
  { id: "is", defaultLabel: "Íslenska", short: "IS" },

  { id: "pl", defaultLabel: "Polski", short: "PL" },
  { id: "ro", defaultLabel: "Română", short: "RO" },
  { id: "sr", defaultLabel: "Српски", short: "RS" },
  { id: "hr", defaultLabel: "Hrvatski", short: "HR" },
  { id: "cs", defaultLabel: "Čeština", short: "CZ" },
];

const LANG_FLAGS: Record<Lang, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
  ru: "🇷🇺",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ar: "🇸🇦",
  hi: "🇮🇳",
  tr: "🇹🇷",
  da: "🇩🇰",
  no: "🇳🇴",
  sv: "🇸🇪",
  is: "🇮🇸",
  pl: "🇵🇱",
  ro: "🇷🇴",
  sr: "🇷🇸",
  hr: "🇭🇷",
  cs: "🇨🇿",
};


type LanguageWorldMeta = {
  primaryCountry: string;
  countries: string[];
};

// Pays où la langue est officielle ou très largement utilisée. La carte LANGUES
// réutilise directement le SVG MONDE du mode TERRITORIES.
const LANGUAGE_WORLD_META: Record<Lang, LanguageWorldMeta> = {
  fr: { primaryCountry: "FR", countries: ["FR","BE","CH","LU","MC","CA","HT","SN","CI","ML","BF","NE","TG","BJ","GN","CM","CF","TD","CG","CD","GA","BI","RW","DJ","KM","MG","MU","SC","VU","GQ"] },
  en: { primaryCountry: "GB", countries: ["GB","US","CA","AU","NZ","IE","ZA","IN","PK","SG","PH","MY","NG","GH","KE","UG","TZ","ZM","ZW","BW","NA","MW","SL","LR","GM","JM","TT","BB","BS","BZ","GY","FJ","PG","SB","VU","WS","TO","KI","TV","MT","CY"] },
  es: { primaryCountry: "ES", countries: ["ES","MX","GT","HN","SV","NI","CR","PA","CU","DO","PR","CO","VE","EC","PE","BO","PY","CL","AR","UY","GQ"] },
  de: { primaryCountry: "DE", countries: ["DE","AT","CH","LI","LU","BE"] },
  it: { primaryCountry: "IT", countries: ["IT","CH","SM","VA"] },
  pt: { primaryCountry: "PT", countries: ["PT","BR","AO","MZ","CV","GW","ST","TL","GQ"] },
  nl: { primaryCountry: "NL", countries: ["NL","BE","SR","AW","CW","SX"] },
  ru: { primaryCountry: "RU", countries: ["RU","BY","KZ","KG"] },
  zh: { primaryCountry: "CN", countries: ["CN","TW","SG"] },
  ja: { primaryCountry: "JP", countries: ["JP"] },
  ar: { primaryCountry: "SA", countries: ["SA","AE","BH","QA","KW","OM","YE","IQ","JO","LB","SY","PS","EG","LY","TN","DZ","MA","MR","SD","SO","DJ","KM"] },
  hi: { primaryCountry: "IN", countries: ["IN"] },
  tr: { primaryCountry: "TR", countries: ["TR","CY"] },
  da: { primaryCountry: "DK", countries: ["DK","GL","FO"] },
  no: { primaryCountry: "NO", countries: ["NO"] },
  sv: { primaryCountry: "SE", countries: ["SE","FI"] },
  is: { primaryCountry: "IS", countries: ["IS"] },
  pl: { primaryCountry: "PL", countries: ["PL"] },
  ro: { primaryCountry: "RO", countries: ["RO","MD"] },
  sr: { primaryCountry: "RS", countries: ["RS","BA","ME","XK"] },
  hr: { primaryCountry: "HR", countries: ["HR","BA"] },
  cs: { primaryCountry: "CZ", countries: ["CZ"] },
};

const SETTINGS_FLAG_GLOB = import.meta.glob("../assets/flags/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findSettingsFlagSrc(countryCode: string): string | null {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!code) return null;
  const suffix = `/${code}.PNG`;
  for (const [path, src] of Object.entries(SETTINGS_FLAG_GLOB)) {
    if (path.toUpperCase().endsWith(suffix)) return src;
  }
  return null;
}

function extractWorldCountryPath(countryCode: string): string | null {
  try {
    const code = String(countryCode || "").trim().toUpperCase();
    if (!code) return null;
    const raw = getBaseSvgForCountry("WORLD");
    const tag = raw.match(new RegExp(`<path\\b[^>]*\\bid=["']${code}["'][^>]*>`, "i"))?.[0];
    if (!tag) return null;
    return tag.match(/\bd=["']([^"']+)["']/i)?.[1] || null;
  } catch {
    return null;
  }
}

// ---------------- Animation halo une seule fois ----------------

function injectSettingsAnimationsOnce() {
  if (typeof document === "undefined") return;
  const STYLE_ID = "dc-settings-theme-animations";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.innerHTML = `
    @keyframes dcSettingsHaloPulse {
      0%   { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
      40%  { box-shadow: 0 0 12px currentColor, 0 0 26px currentColor; }
      100% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
    }

    @keyframes dcSettingsCardGlow {
      0%, 100% { opacity: 0.02; }
      50% { opacity: 0.12; }
    }
  `;
  document.head.appendChild(style);
}

function safeAlert(msg: string) {
  try {
    // eslint-disable-next-line no-alert
    alert(msg);
  } catch {}
}

// ---------------- Bouton de thème (compact) ----------------

type ThemeChoiceButtonProps = {
  id: ThemeId;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
};

function ThemeChoiceButton({ id, label, desc, active, onClick }: ThemeChoiceButtonProps) {
  const preset = getPreset(id);
  const neonColor = preset.primary;
  const [hovered, setHovered] = React.useState(false);

  const cardBoxShadow = active || hovered ? `0 0 14px ${neonColor}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.01 : 1.0;
  const borderColor = active ? neonColor : "rgba(255,255,255,0.12)";
  const titleColor = active ? neonColor : "#FFFFFF";
  const descColor = active ? neonColor : "rgba(255,255,255,0.6)";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        padding: "8px 10px",
        background: active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${borderColor}`,
        boxShadow: cardBoxShadow,
        color: "#FFFFFF",
        cursor: "pointer",
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out",
        minWidth: 140,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${neonColor}`,
            background: "transparent",
            color: neonColor,
            boxShadow: active
              ? `0 0 8px ${neonColor}, 0 0 18px ${neonColor}`
              : hovered
              ? `0 0 5px ${neonColor}`
              : "none",
            animation: active ? "dcSettingsHaloPulse 2.1s ease-in-out infinite" : "",
            flexShrink: 0,
          }}
        />
        <span style={{ color: titleColor }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: descColor, lineHeight: 1.25 }}>{desc}</div>
    </button>
  );
}

// ---------------- Bouton de langue ----------------

type LanguageChoiceButtonProps = {
  id: Lang;
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
};

function LanguageChoiceButton({ id, label, active, onClick, primary }: LanguageChoiceButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const flag = LANG_FLAGS[id] ?? id.toUpperCase();

  const borderColor = active ? primary : "rgba(255,255,255,0.18)";
  const textColor = active ? primary : "rgba(255,255,255,0.8)";
  const bg = active ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.04)";
  const boxShadow = active || hovered ? `0 0 12px ${primary}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.03 : 1.0;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        boxShadow,
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, color 0.18s ease-out",
      }}
    >
      <span style={{ fontSize: 16, minWidth: 24, textAlign: "center" }}>{flag}</span>
      <span>{label}</span>
    </button>
  );
}


function CountryFlagShape({
  countryCode,
  accent,
  width = 86,
  height = 56,
}: {
  countryCode: string;
  accent: string;
  width?: number;
  height?: number;
}) {
  const code = String(countryCode || "").toUpperCase();
  const pathD = React.useMemo(() => extractWorldCountryPath(code), [code]);
  const flagSrc = React.useMemo(() => findSettingsFlagSrc(code), [code]);
  const pathRef = React.useRef<SVGPathElement | null>(null);
  const [viewBox, setViewBox] = React.useState("0 0 100 70");
  const [imageBox, setImageBox] = React.useState({ x: 0, y: 0, width: 100, height: 70 });
  const clipId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  React.useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path || !pathD) return;
    try {
      const box = path.getBBox();
      if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || box.width <= 0 || box.height <= 0) return;
      const pad = Math.max(box.width, box.height) * 0.08;
      setViewBox(`${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`);
      setImageBox({ x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 });
    } catch {}
  }, [pathD]);

  if (!pathD || !flagSrc) {
    return (
      <div style={{ width, height, display: "grid", placeItems: "center", fontSize: Math.round(height * 0.55) }}>
        {LANG_FLAGS[(Object.keys(LANGUAGE_WORLD_META) as Lang[]).find((id) => LANGUAGE_WORLD_META[id].primaryCountry === code) || "en"] || "🌐"}
      </div>
    );
  }

  return (
    <svg width={width} height={height} viewBox={viewBox} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={pathD} />
        </clipPath>
      </defs>
      <path ref={pathRef} d={pathD} fill="transparent" stroke="none" opacity={0} />
      <image
        href={flagSrc}
        x={imageBox.x}
        y={imageBox.y}
        width={imageBox.width}
        height={imageBox.height}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      <path d={pathD} fill="transparent" stroke={accent} strokeWidth={0.9} vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${accent})` }} />
    </svg>
  );
}



type SettingsLoopCarouselProps = {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  theme: any;
  itemWidth?: number;
  gap?: number;
  initialIndex?: number;
  ariaLabel: string;
  onActiveIndexChange?: (index: number) => void;
  snapMode?: "mandatory" | "proximity";
  recenterOnInitialIndexChange?: boolean;
  explicitCenterRequest?: { index: number; nonce: number } | null;
};

function SettingsLoopCarousel({
  items,
  renderItem,
  theme,
  itemWidth = 126,
  gap = 9,
  initialIndex = 0,
  ariaLabel,
  onActiveIndexChange,
  snapMode = "mandatory",
  recenterOnInitialIndexChange = true,
  explicitCenterRequest = null,
}: SettingsLoopCarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const lastActiveRef = React.useRef(-1);
  const normalizingRef = React.useRef(false);
  const didInitialCenterRef = React.useRef(false);
  const step = itemWidth + gap;

  const normalizedInitialIndex = items.length
    ? ((initialIndex % items.length) + items.length) % items.length
    : 0;

  const recenter = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollerRef.current;
    if (!el || !items.length) return;
    const span = items.length * step;
    const target = span + normalizedInitialIndex * step - Math.max(0, (el.clientWidth - itemWidth) / 2);
    el.scrollTo({ left: Math.max(0, target), behavior });
  }, [items.length, step, normalizedInitialIndex, itemWidth]);

  React.useLayoutEffect(() => {
    // The language picker receives many async i18n rerenders. When requested,
    // only center on the first mount; afterwards the user owns the scroll position.
    if (didInitialCenterRef.current && !recenterOnInitialIndexChange) return;
    didInitialCenterRef.current = true;
    const raf = requestAnimationFrame(() => recenter("auto"));
    return () => cancelAnimationFrame(raf);
  }, [recenter, recenterOnInitialIndexChange]);

  React.useLayoutEffect(() => {
    // Explicit centering is reserved for deliberate external actions (e.g. a click
    // on the world map). Normal i18n rerenders must never steal the user's scroll.
    const el = scrollerRef.current;
    if (!el || !items.length || !explicitCenterRequest) return;
    const requestedIndex = ((explicitCenterRequest.index % items.length) + items.length) % items.length;
    const span = items.length * step;
    const target = span + requestedIndex * step - Math.max(0, (el.clientWidth - itemWidth) / 2);
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [explicitCenterRequest?.nonce, explicitCenterRequest?.index, items.length, step, itemWidth]);

  const reportActive = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !items.length || !onActiveIndexChange) return;
    const span = items.length * step;
    if (!span) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let local = center - span;
    while (local < 0) local += span;
    while (local >= span) local -= span;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round((local - itemWidth / 2) / step)));
    if (idx !== lastActiveRef.current) {
      lastActiveRef.current = idx;
      onActiveIndexChange(idx);
    }
  }, [items.length, step, itemWidth, onActiveIndexChange]);

  const handleScroll = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !items.length || normalizingRef.current) return;
    const span = items.length * step;
    if (!span) return;

    if (el.scrollLeft < span * 0.45) {
      normalizingRef.current = true;
      el.scrollLeft += span;
      requestAnimationFrame(() => { normalizingRef.current = false; reportActive(); });
      return;
    }
    if (el.scrollLeft > span * 1.55) {
      normalizingRef.current = true;
      el.scrollLeft -= span;
      requestAnimationFrame(() => { normalizingRef.current = false; reportActive(); });
      return;
    }
    reportActive();
  }, [items.length, step, reportActive]);

  const scrollByOne = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el || !items.length) return;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (!items.length) return null;
  const tripled = [0, 1, 2].flatMap((copy) => items.map((item, index) => ({ item, index, copy })));

  const arrowStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${theme.primary}55`,
    background: "rgba(0,0,0,.42)",
    color: theme.primary,
    fontSize: 22,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) 34px", gap: 10, alignItems: "center" }} aria-label={ariaLabel}>
      <button type="button" aria-label={`${ariaLabel} précédent`} onClick={() => scrollByOne(-1)} style={arrowStyle}>‹</button>
      <div
        ref={scrollerRef}
        className="dc-scroll-thin"
        onScroll={handleScroll}
        style={{
          display: "flex",
          gap,
          overflowX: "auto",
          scrollSnapType: `x ${snapMode}`,
          padding: "8px 8px 12px",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
        }}
      >
        {tripled.map(({ item, index, copy }) => (
          <div key={`${copy}-${index}`} style={{ width: itemWidth, minWidth: itemWidth, flex: `0 0 ${itemWidth}px`, scrollSnapAlign: "center" }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      <button type="button" aria-label={`${ariaLabel} suivant`} onClick={() => scrollByOne(1)} style={arrowStyle}>›</button>
    </div>
  );
}



type SettingsPagedGridProps<T> = {
  items: T[];
  renderItem: (item: T, absoluteIndex: number) => React.ReactNode;
  theme: any;
  pageSize?: number;
  ariaLabel: string;
};

function SettingsPagedGrid<T>({ items, renderItem, theme, pageSize = 4, ariaLabel }: SettingsPagedGridProps<T>) {
  const [page, setPage] = React.useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = ((page % pages) + pages) % pages;
  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  React.useEffect(() => {
    if (page >= pages) setPage(0);
  }, [page, pages]);

  const goPrev = () => setPage((current) => ((current - 1) % pages + pages) % pages);
  const goNext = () => setPage((current) => (current + 1) % pages);

  const navStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${theme.primary}66`,
    background: "rgba(0,0,0,.42)",
    color: theme.primary,
    fontSize: 21,
    fontWeight: 950,
    display: "grid",
    placeItems: "center",
    cursor: pages > 1 ? "pointer" : "default",
    opacity: pages > 1 ? 1 : .45,
  };

  return (
    <div aria-label={ariaLabel}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        {pageItems.map((item, localIndex) => (
          <React.Fragment key={`${safePage}-${localIndex}`}>
            {renderItem(item, safePage * pageSize + localIndex)}
          </React.Fragment>
        ))}
        {Array.from({ length: Math.max(0, pageSize - pageItems.length) }).map((_, index) => (
          <div key={`empty-${index}`} aria-hidden style={{ minHeight: 132, opacity: 0 }} />
        ))}
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "38px minmax(0,1fr) 38px", alignItems: "center", gap: 10 }}>
        <button type="button" aria-label={`${ariaLabel} page précédente`} onClick={goPrev} disabled={pages <= 1} style={navStyle}>‹</button>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}>
          {Array.from({ length: pages }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Page ${index + 1}`}
              onClick={() => setPage(index)}
              style={{
                width: index === safePage ? 22 : 7,
                height: 7,
                borderRadius: 999,
                border: "none",
                background: index === safePage ? theme.primary : "rgba(255,255,255,.18)",
                boxShadow: index === safePage ? `0 0 10px ${theme.primary}77` : "none",
                padding: 0,
                cursor: "pointer",
                transition: "width 160ms ease, background 160ms ease",
              }}
            />
          ))}
        </div>
        <button type="button" aria-label={`${ariaLabel} page suivante`} onClick={goNext} disabled={pages <= 1} style={navStyle}>›</button>
      </div>
      <div style={{ marginTop: 5, textAlign: "center", color: theme.textSoft, fontSize: 9.5, fontWeight: 850 }}>
        PAGE {safePage + 1}/{pages} · boucle continue
      </div>
    </div>
  );
}

const COUNTRY_DEFAULT_LANGUAGE: Partial<Record<string, Lang>> = {
  FR: "fr", GB: "en", US: "en", ES: "es", DE: "de", AT: "de", IT: "it", PT: "pt", BR: "pt",
  NL: "nl", RU: "ru", CN: "zh", TW: "zh", JP: "ja", SA: "ar", IN: "hi", TR: "tr", DK: "da",
  NO: "no", SE: "sv", IS: "is", PL: "pl", RO: "ro", RS: "sr", HR: "hr", CZ: "cs",
  BE: "fr", CH: "fr", CA: "en", IE: "en", AU: "en", NZ: "en", MX: "es", AR: "es",
};

function languageForWorldTerritory(territoryId: string, current: Lang): Lang {
  const code = String(territoryId || "").replace(/^WORLD-/i, "").toUpperCase();
  if (!code) return "en";
  const candidates = (Object.keys(LANGUAGE_WORLD_META) as Lang[]).filter((id) => LANGUAGE_WORLD_META[id].countries.includes(code));
  if (!candidates.length) return "en";
  if (candidates.includes(current)) return current;
  const preferred = COUNTRY_DEFAULT_LANGUAGE[code];
  if (preferred && candidates.includes(preferred)) return preferred;
  const primary = candidates.find((id) => LANGUAGE_WORLD_META[id].primaryCountry === code);
  return primary || candidates[0] || "en";
}

type ThemePackId = "neons" | "soft" | "citrus" | "dark" | "factory" | "pub" | "graffiti" | "postapoc" | "arcade" | "street" | "prestige" | "abstract";
type ThemePack = { id: ThemePackId; ids: ThemeId[]; label: string; subtitle: string; colors: string[]; premium?: boolean };
const THEME_PACKS: ThemePack[] = [
  { id: "neons", ids: NEONS, label: "NÉONS CLASSIQUES", subtitle: "Énergie arcade et accents lumineux", colors: ["#F6C256", "#FF4FA3", "#2ECC71", "#1ABC9C"] },
  { id: "soft", ids: SOFTS, label: "COULEURS DOUCES", subtitle: "Tons modernes, naturels et apaisés", colors: ["#22E6FF", "#3B82F6", "#A3B18A", "#A7D8FF"] },
  { id: "citrus", ids: CITRUS, label: "CITRUS & JADE", subtitle: "Marbres olive, encres dorées et fluides vert premium", colors: ["#D8F26B", "#8EF1B9", "#EBD97B", "#8EDB6F"], premium: true },
  { id: "dark", ids: DARKS, label: "DARK PREMIUM", subtitle: "Métal, carbone et noirs premium", colors: ["#5A5A5A", "#263238", "#8CA6B8", "#1D1D24"] },
  { id: "factory", ids: FACTORY, label: "USINE & MÉTAUX", subtitle: "Un thème par texture industrielle : alu, acier, grunge et atelier", colors: ["#E3EAF2", "#9EACBC", "#62C9FF", "#DCE4EE"], premium: true },
  { id: "pub", ids: PUBS, label: "AMBIANCE PUB", subtitle: "Bois, lumière chaude et atmosphères de bar / pub", colors: ["#F1B86C", "#B39CFF", "#5FD0C2", "#FF7E45"], premium: true },
  { id: "graffiti", ids: GRAFFITIS, label: "GRAFFITI", subtitle: "Murs, tags et explosions urbaines très visuelles", colors: ["#56E9FF", "#FF4D73", "#B98AFF", "#F6F7FB"], premium: true },
  { id: "postapoc", ids: POSTAPOC, label: "POST-APOCALYPSE", subtitle: "Ruines, béton fissuré, métal oxydé et villes abandonnées", colors: ["#D88943", "#D3D6D3", "#5FC8FF", "#655C55"], premium: true },
  { id: "arcade", ids: ARCADES, label: "ARCADE", subtitle: "Pixels, néons et écrans rétro-futuristes", colors: ["#FF5AD7", "#39F2FF", "#B95BFF", "#F1F768"], premium: true },
  { id: "street", ids: STREETS, label: "STREET", subtitle: "Asphalte, street art et matières urbaines colorées", colors: ["#FFA34B", "#4DE7FF", "#FFD05D", "#FF7060"], premium: true },
  { id: "prestige", ids: PRESTIGES, label: "PRESTIGE", subtitle: "Or, pierres précieuses et finitions luxueuses — un thème par image", colors: ["#FFD768", "#46D49D", "#4D7BFF", "#FF7DC4"], premium: true },
  { id: "abstract", ids: ABSTRACTS, label: "ABSTRAIT", subtitle: "Textures artistiques, grunge et couleurs intenses — un thème par image", colors: ["#FF8C37", "#B55CFF", "#43E3C2", "#E8F1FF"], premium: true },
];

const localizeThemeBackground = (value?: string | null): string =>
  String(value || "").replace(/\bfixed\b/g, "scroll");

const getThemeSceneUrl = (preset?: Partial<AppTheme> | null): string | null => {
  const source = String(preset?.pageBackground || preset?.cardBackground || "");
  const match = source.match(/url\((['"]?)([^)'"]+)\1\)/i);
  return match?.[2] || null;
};

const POSTAPOC_CARD_SUBTITLE: Partial<Record<ThemeId, string>> = {
  postApocAubeRuines: "ATMOSPHÈRE CHAUDE",
  postApocBetonGris: "ATMOSPHÈRE FROIDE",
  postApocPluieNeon: "ATMOSPHÈRE URBAINE",
  postApocCrepusculeCorbeau: "CRÉPUSCULE TOXIQUE",
  postApocHorizonCendre: "HORIZON DE CENDRE",
  postApocTourBrisee: "BÉTON & VÉGÉTATION",
  postApocEdenPerdu: "RUINES TROPICALES",
  postApocChuteFinale: "CHAOS TERMINAL",
  postApocAvenueSilence: "VILLE DÉSERTÉE",
};


function ThemePreviewBlock({
  themeIdPreview,
  activeThemeId,
  theme,
  onApply,
  locked = false,
  onOpenShop,
}: {
  themeIdPreview: ThemeId | null;
  activeThemeId: ThemeId;
  theme: any;
  onApply: (id: ThemeId) => void;
  locked?: boolean;
  onOpenShop?: () => void;
}) {
  const preview = themeIdPreview ? getPreset(themeIdPreview) : null;
  const premiumPreview = !!preview && isPremiumTheme(preview.id);
  const previewBackground = preview
    ? localizeThemeBackground(preview.pageBackground) || `radial-gradient(circle at 50% 10%, ${preview.primary}26, transparent 52%), ${preview.bg}`
    : "radial-gradient(circle at 50% 35%, rgba(255,255,255,.05), rgba(0,0,0,.28) 62%)";
  const previewCard = localizeThemeBackground(preview?.cardBackground) || preview?.card;
  const fx = getThemeFxProfile(preview);
  const previewTextureOpacity = premiumPreview
    ? clamp01(preview?.previewTextureOpacity ?? Math.min(.62, Math.max(.30, preview?.textureOpacity ?? .42)) * fx.texture)
    : 0;
  const ambientOpacity = premiumPreview
    ? clamp01(preview?.previewAmbientOpacity ?? Math.min(.24, Math.max(.085, (preview?.ambientOpacity || .05) * 2.5)) * fx.ambient)
    : clamp01(Math.min(.14, Math.max(.04, (preview?.ambientOpacity || .04) * 1.7)) * .85);
  const previewSheenOpacity = clamp01(preview?.previewSheenOpacity ?? fx.sheen);
  const previewFrameOpacity = clamp01(preview?.previewFrameOpacity ?? Math.min(.78, preview?.frameOpacity ?? .72) * fx.frame);
  const innerTextureOpacity = clamp01((preview?.previewTextureOpacity ?? previewTextureOpacity) * (fx.innerTexture / Math.max(fx.texture, .01)));
  const innerSheenOpacity = clamp01(Math.max(0, previewSheenOpacity * (fx.innerSheen / Math.max(fx.sheen || .01, .01))));
  const innerFrameOpacity = clamp01(Math.max(0, previewFrameOpacity * (fx.innerFrame / Math.max(fx.frame || .01, .01))));
  const isPostApocPreview = Boolean(preview && String(preview.id).startsWith("postApoc"));
  const meta = preview ? THEME_META[preview.id] : null;

  if (!preview) {
    return (
      <div
        style={{
          minHeight: 250,
          borderRadius: 22,
          border: `1px solid ${theme.borderSoft}`,
          background: "linear-gradient(180deg, rgba(7,9,15,.94), rgba(5,7,12,.98))",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 0 30px rgba(0,0,0,.38)",
          display: "grid",
          placeItems: "center",
          padding: 14,
        }}
      >
        <img src="/img/settings-theme-logo-preview.webp" alt="MULTISPORTS SCORING" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: .76 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,4,10,.28), rgba(2,4,10,.86))" }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 16px" }}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 1000, letterSpacing: .8, textTransform: "uppercase" }}>THÈME</div>
          <div style={{ marginTop: 6, color: "rgba(255,255,255,.76)", fontSize: 10.5, fontWeight: 850 }}>Choisissez un pack puis un thème pour afficher l’aperçu complet.</div>
        </div>
      </div>
    );
  }

  const shellOuterBackground = isPostApocPreview
    ? `linear-gradient(180deg, rgba(4,4,4,.34), rgba(4,4,4,.78)), url(/theme-textures/postapoc-panel-concrete.svg) center/cover no-repeat, #080808`
    : previewBackground;
  const shellPanelBackground = isPostApocPreview
    ? `linear-gradient(180deg, rgba(30,29,27,.78), rgba(8,9,9,.95)), url(/theme-textures/postapoc-cracks-overlay.svg) center/cover no-repeat, url(/theme-textures/postapoc-panel-concrete.svg) center/cover no-repeat`
    : previewCard;
  const sceneUrl = getThemeSceneUrl(preview);
  const heroBackground = sceneUrl
    ? `linear-gradient(180deg, rgba(4,5,7,.08) 0%, rgba(4,5,7,.18) 38%, rgba(4,5,7,.80) 100%), url(${sceneUrl}) center/cover no-repeat`
    : localizeThemeBackground(preview.pageBackground || previewCard || previewBackground);
  const titleColor = isPostApocPreview ? "#F4F2EC" : preview.primary;
  const subtitleColor = isPostApocPreview ? "rgba(242,240,234,.68)" : preview.textSoft;
  const activeLabel = locked ? "🔒 VOIR CE PACK DANS LA BOUTIQUE" : preview.id === activeThemeId ? "THÈME ACTIF" : "APPLIQUER CE THÈME";

  return (
    <div
      className={isPostApocPreview ? "dc-postapoc-theme-preview" : undefined}
      style={{
        minHeight: isPostApocPreview ? 530 : 380,
        borderRadius: isPostApocPreview ? 28 : 20,
        border: `1px solid ${isPostApocPreview ? `${preview.primary}48` : (preview?.borderSoft || theme.borderSoft)}`,
        background: shellOuterBackground,
        overflow: "hidden",
        position: "relative",
        boxShadow: isPostApocPreview
          ? `0 24px 54px rgba(0,0,0,.62), 0 0 26px ${preview.primary}18, inset 0 1px 0 rgba(255,255,255,.05)`
          : (preview.surfaceShadow || `0 18px 42px rgba(0,0,0,.52), 0 0 28px ${preview.primary}24, inset 0 1px 0 rgba(255,255,255,.07)`),
        display: "grid",
        placeItems: "center",
        padding: isPostApocPreview ? 16 : 12,
        isolation: "isolate",
      }}
    >
      {preview?.textureOverlay ? (
        <div aria-hidden="true" className="dc-theme-preview-texture" style={{ background: preview.textureOverlay, opacity: isPostApocPreview ? clamp01(previewTextureOpacity * 1.25) : previewTextureOpacity, mixBlendMode: preview.textureBlendMode || "soft-light" }} />
      ) : null}
      {preview?.ambientOverlay ? (
        <div aria-hidden="true" className={`dc-theme-preview-ambient dc-theme-preview-${preview.ambientAnimation || "pulse"}`} style={{ background: preview.ambientOverlay, opacity: isPostApocPreview ? clamp01(ambientOpacity * 1.15) : ambientOpacity }} />
      ) : null}
      {preview?.surfaceSheen ? (
        <div aria-hidden="true" className="dc-theme-preview-sheen" style={{ background: preview.surfaceSheen, opacity: previewSheenOpacity }} />
      ) : null}
      {preview?.frameOverlay ? (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: preview.frameOverlay, opacity: previewFrameOpacity, pointerEvents: "none", zIndex: 2 }} />
      ) : null}

      <div style={{ width: "100%", maxWidth: 410, position: "relative", zIndex: 3 }}>
        <div style={{ textAlign: "center", marginBottom: isPostApocPreview ? 12 : 8 }}>
          <div style={{ color: titleColor, fontWeight: 1000, fontSize: isPostApocPreview ? 20 : 18, textTransform: "uppercase", letterSpacing: .9, lineHeight: 1, textShadow: `0 0 16px ${preview.primary}38` }}>{meta?.defaultLabel || preview.name}</div>
          <div style={{ marginTop: 6, color: subtitleColor, fontSize: 9.6, lineHeight: 1.3 }}>{meta?.defaultDesc || preview.name}</div>
        </div>

        <div
          className={isPostApocPreview ? "dc-postapoc-preview-panel" : undefined}
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isPostApocPreview ? 26 : 16,
            border: `1px solid ${isPostApocPreview ? `${preview.primary}80` : `${preview.primary}70`}`,
            background: shellPanelBackground,
            boxShadow: isPostApocPreview
              ? `0 18px 38px rgba(0,0,0,.54), 0 0 22px ${preview.primary}18, inset 0 1px 0 rgba(255,255,255,.05)`
              : (preview.surfaceShadow || `0 12px 28px rgba(0,0,0,.52), 0 0 20px ${preview.primary}22`),
          }}
        >
          {preview.textureOverlay ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: preview.textureOverlay, opacity: clamp01(innerTextureOpacity * (isPostApocPreview ? 1.2 : 1)), mixBlendMode: preview.textureBlendMode || "soft-light", pointerEvents: "none" }} /> : null}
          {preview.surfaceSheen ? <div aria-hidden="true" className="dc-theme-preview-sheen" style={{ background: preview.surfaceSheen, opacity: innerSheenOpacity }} /> : null}
          {preview.frameOverlay ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: preview.frameOverlay, opacity: innerFrameOpacity, pointerEvents: "none", zIndex: 1 }} /> : null}

          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: isPostApocPreview ? "10px 12px 9px" : "7px 9px", borderBottom: `1px solid ${preview.borderSoft}`, background: isPostApocPreview ? "linear-gradient(180deg, rgba(12,12,12,.92), rgba(8,8,8,.96))" : "rgba(3,5,12,.34)", backdropFilter: "blur(7px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {isPostApocPreview ? (
                  <span style={{ alignSelf: "stretch", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 9px", borderRadius: 9, border: `1px solid ${preview.primary}55`, background: `linear-gradient(135deg, color-mix(in srgb, ${preview.primary} 62%, #e8ddc6), color-mix(in srgb, ${preview.primary} 42%, #2a1c13))`, color: "#111", fontSize: 7.8, fontWeight: 1000, letterSpacing: .5, textTransform: "uppercase", boxShadow: `0 0 12px ${preview.primary}35` }}>Nouveau</span>
                ) : (
                  <img src={logoDarts} alt="" style={{ width: 22, height: 22, objectFit: "contain", filter: `drop-shadow(0 0 7px ${preview.primary}55)` }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: preview.text, fontSize: isPostApocPreview ? 9.2 : 8.8, fontWeight: 1000, lineHeight: 1, letterSpacing: .45 }}>MULTISPORTS SCORING</div>
                  <div style={{ color: preview.primary, fontSize: isPostApocPreview ? 7.8 : 7.2, fontWeight: 950, marginTop: 3, textTransform: "uppercase", letterSpacing: .4 }}>X01 • Partie en cours</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                <span style={{ borderRadius: 999, border: `1px solid rgba(255,95,95,.55)`, background: `rgba(30,5,5,.78)`, color: "#FF5F5F", padding: "4px 8px", fontSize: 6.9, fontWeight: 1000, boxShadow: `0 0 10px rgba(255,95,95,.24)` }}>● EN DIRECT</span>
                {locked ? <span style={{ fontSize: 11, color: preview.primary }}>🔒</span> : <span style={{ fontSize: 14, color: preview.textSoft }}>⋮</span>}
              </div>
            </div>

            <div style={{ position: "relative", padding: isPostApocPreview ? 12 : 8 }}>
              <div className={isPostApocPreview ? "dc-postapoc-scene" : undefined} style={{ position: "relative", overflow: "hidden", borderRadius: isPostApocPreview ? 18 : 13, border: `1px solid ${preview.borderSoft}`, background: heroBackground, backgroundAttachment: "scroll", backgroundPosition: "center center", backgroundRepeat: "no-repeat", backgroundSize: "cover", minHeight: isPostApocPreview ? 170 : 110, boxShadow: `0 10px 22px rgba(0,0,0,.44)` }}>
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,4,8,.12), rgba(2,4,8,.14) 35%, rgba(2,4,8,.82) 100%)", pointerEvents: "none" }} />
                {preview.ambientOverlay ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preview.ambientOverlay, opacity: isPostApocPreview ? .22 : .16, pointerEvents: "none" }} /> : null}
                <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(120px,.72fr)", gap: 8, alignItems: "end" }}>
                  <div style={{ display: "flex", alignItems: "end", gap: 9, minWidth: 0 }}>
                    <div style={{ width: isPostApocPreview ? 56 : 44, height: isPostApocPreview ? 56 : 44, borderRadius: 999, padding: 3, background: `linear-gradient(135deg, color-mix(in srgb, ${preview.primary} 90%, #fff 10%), color-mix(in srgb, ${preview.accent2 || preview.primary} 65%, #000 35%))`, boxShadow: `0 0 16px ${preview.primary}40` }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(12,12,12,.88)", color: preview.text, fontSize: isPostApocPreview ? 24 : 18, fontWeight: 1000 }}>☠</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="dc-player-name" style={{ color: preview.text, fontSize: isPostApocPreview ? 11.5 : 10.5, fontWeight: 950, lineHeight: 1, textTransform: "uppercase" }}>NINJA</div>
                      <div style={{ color: preview.primary, fontSize: isPostApocPreview ? 34 : 24, fontWeight: 1000, lineHeight: .92, textShadow: `0 0 12px ${preview.primary}48` }}>301</div>
                    </div>
                  </div>
                  <div style={{ borderRadius: isPostApocPreview ? 14 : 11, border: `1px solid ${preview.borderSoft}`, background: `linear-gradient(180deg, rgba(12,12,12,.76), rgba(5,5,5,.86))`, padding: isPostApocPreview ? "10px 12px" : "8px 9px", textAlign: "left", boxShadow: `0 8px 18px rgba(0,0,0,.30)` }}>
                    <div style={{ color: preview.textSoft, fontSize: isPostApocPreview ? 7.5 : 6.6, fontWeight: 900, textTransform: "uppercase" }}>Objectif</div>
                    <div style={{ color: preview.accent2 || preview.primary, fontSize: isPostApocPreview ? 23 : 16, fontWeight: 1000, marginTop: 3, textShadow: `0 0 10px ${preview.accent2 || preview.primary}42` }}>T20</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 7 }}>
                {[["AVG 3D", "62.4"], ["MEILLEUR", "180"], ["CHECKOUT", "96"]].map(([label, value]) => (
                  <div key={label} className={isPostApocPreview ? "dc-postapoc-kpi" : undefined} style={{ position: "relative", overflow: "hidden", borderRadius: isPostApocPreview ? 10 : 10, border: `1px solid ${preview.borderSoft}`, background: shellPanelBackground, padding: isPostApocPreview ? "8px 7px" : "5px 6px", textAlign: "center", boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 5px 12px rgba(0,0,0,.25)` }}>
                    {preview.textureOverlay ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preview.textureOverlay, opacity: clamp01(innerTextureOpacity * .78), mixBlendMode: preview.textureBlendMode || "soft-light", pointerEvents: "none" }} /> : null}
                    <div style={{ position: "relative", color: preview.textSoft, fontSize: isPostApocPreview ? 6.7 : 6.1, fontWeight: 900 }}>{label}</div>
                    <div style={{ position: "relative", color: preview.text, fontSize: isPostApocPreview ? 12.8 : 10.5, fontWeight: 1000, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isPostApocPreview ? "1fr" : "1fr auto", gap: 6, marginTop: 7 }}>
                <div className={isPostApocPreview ? "dc-postapoc-action dc-postapoc-action-primary" : undefined} style={{ minHeight: isPostApocPreview ? 44 : 30, borderRadius: isPostApocPreview ? 9 : 10, border: `1px solid ${preview.primary}88`, background: preview.buttonBackground || preview.primary, color: isPostApocPreview ? "#F9F6F0" : "#050712", display: "grid", placeItems: "center", fontSize: isPostApocPreview ? 9.6 : 8, fontWeight: 1000, letterSpacing: .25, textTransform: "uppercase", textShadow: isPostApocPreview ? "0 2px 4px rgba(0,0,0,.55)" : "none", boxShadow: `0 0 16px ${preview.primary}2e, inset 0 1px 0 rgba(255,255,255,.16)` }}>Valider la volée</div>
                {isPostApocPreview ? (
                  <div className="dc-postapoc-action dc-postapoc-action-secondary" style={{ marginTop: 6, minHeight: 40, borderRadius: 9, border: `1px solid ${preview.borderSoft}`, background: shellPanelBackground, color: preview.text, display: "grid", placeItems: "center", fontSize: 9.2, fontWeight: 950, textTransform: "uppercase", boxShadow: `0 8px 16px rgba(0,0,0,.28)` }}>Appliquer ce thème</div>
                ) : (
                  <div style={{ width: 34, minHeight: 30, borderRadius: 10, border: `1px solid ${preview.borderSoft}`, background: previewCard, color: preview.primary, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 1000 }}>↶</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, padding: "5px 7px 6px", borderTop: `1px solid ${preview.borderSoft}`, background: preview.navBackground || "rgba(4,6,13,.82)", backdropFilter: "blur(9px)" }}>
              {[["◉", "JEUX"], ["◎", "PROFILS"], ["▥", "STATS"], ["⚙", "RÉGLAGES"]].map(([icon, label], index) => (
                <div key={label} style={{ minWidth: 0, borderRadius: 8, border: index === 3 ? `1px solid ${preview.primary}70` : "1px solid transparent", background: index === 3 ? `${preview.primary}13` : "transparent", color: index === 3 ? preview.primary : preview.textSoft, textAlign: "center", padding: "3px 1px", boxShadow: index === 3 ? `0 0 10px ${preview.primary}22` : "none" }}>
                  <div style={{ fontSize: 9, lineHeight: 1 }}>{icon}</div>
                  <div style={{ fontSize: 5.6, fontWeight: 900, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          className={isPostApocPreview ? "dc-postapoc-apply-button" : undefined}
          type="button"
          onClick={() => locked ? onOpenShop?.() : onApply(preview.id)}
          style={{
            marginTop: 10,
            width: "100%",
            minHeight: isPostApocPreview ? 42 : 34,
            borderRadius: isPostApocPreview ? 13 : 11,
            border: `1px solid ${preview.primary}88`,
            background: locked ? (preview.buttonBackground || `linear-gradient(135deg,${preview.primary},${preview.accent2 || preview.primary})`) : preview.id === activeThemeId ? `${preview.primary}20` : (preview.buttonBackground || preview.primary),
            color: locked ? (isPostApocPreview ? "#F8F5EE" : "#050712") : preview.id === activeThemeId ? preview.primary : (isPostApocPreview ? "#F8F5EE" : "#050712"),
            fontSize: isPostApocPreview ? 10.5 : 9.5,
            fontWeight: 1000,
            cursor: "pointer",
            textTransform: isPostApocPreview ? "uppercase" : "none",
            letterSpacing: isPostApocPreview ? .35 : 0,
            boxShadow: `0 0 18px ${preview.primary}32, inset 0 1px 0 rgba(255,255,255,.16)`,
          }}
        >
          {activeLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------- Constantes de page & prefs ----------------

const LEGACY_PAGE_BG = "#050712";
const LEGACY_CARD_BG = "rgba(8, 10, 20, 0.98)";
const PAGE_BG = LEGACY_PAGE_BG;
const CARD_BG = LEGACY_CARD_BG;
const LS_ACCOUNT_PREFS = "dc_account_prefs_v1";

// ✅ Choix jeu/sport au démarrage
const START_GAME_KEY = "dc-start-game";

// ✅ DEV test flags
const FORCE_OFFLINE_KEY = "dc:force_offline:v1";
const SEED_DEMO_KEY = "dc:seed_demo:v1";

type AccountPrefs = {
  emailsNews: boolean;
  emailsStats: boolean;
  inAppNotifs: boolean;
};

const DEFAULT_PREFS: AccountPrefs = {
  emailsNews: true,
  emailsStats: true,
  inAppNotifs: true,
};

function safeReadJson<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtDateTime(v: any): string {
  try {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return new Date(n).toLocaleString();
  } catch {
    return "—";
  }
}


function startOfLocalDayMs(value = Date.now()): number {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatPreviousLogin(value: number | null, lang: Lang = "fr"): string {
  const empty = pickLegacyLocalizedText(
    lang,
    "Aucune connexion antérieure enregistrée",
    "No previous login recorded",
    "No hay una conexión anterior registrada",
  );
  if (!value || !Number.isFinite(value)) return empty;
  try {
    return new Date(value).toLocaleString(localeForLang(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return empty;
  }
}

// ---------------- Petit composant ligne toggle ----------------

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  const primary = theme.primary;

  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        padding: "6px 8px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${theme.borderSoft}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        {help && (
          <div className="subtitle" style={{ fontSize: 11, color: theme.textSoft }}>
            {help}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            background: checked ? primary : "rgba(255,255,255,0.08)",
            border: `1px solid ${checked ? primary : theme.borderSoft}`,
            display: "flex",
            alignItems: "center",
            padding: 2,
            boxSizing: "border-box",
            cursor: "pointer",
            boxShadow: checked ? `0 0 10px ${primary}66` : "none",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#050712",
              transform: `translateX(${checked ? 18 : 0}px)`,
              transition: "transform 0.18s ease-out",
            }}
          />
        </button>
      </div>
    </label>
  );
}

/* -------------------------------------------------------------
   RESET TOTAL HARDCORE
------------------------------------------------------------- */
async function fullHardReset() {
  try {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}

    try {
      const anyIndexedDB: any = (window as any).indexedDB;
      if (anyIndexedDB && typeof anyIndexedDB.databases === "function") {
        const dbs = await anyIndexedDB.databases();
        for (const db of dbs) {
          if (db?.name) {
            await new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name as string);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          }
        }
      } else {
        const knownDbs = ["dc_stats_v1", "dc_history_v1", "dc_profiles_v1", "dc_training_v1"];
        for (const name of knownDbs) {
          await new Promise<void>((resolve) => {
            const req = window.indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        }
      }
    } catch {}

    // Ancien sign-out Supabase retiré : le reset local ne dépend plus de cette configuration obsolète.

    try {
      const anyWindow = window as any;
      if (anyWindow.__DARTS_STORE__?.setState) {
        anyWindow.__DARTS_STORE__.setState(() => ({
          profiles: [],
          bots: [],
          history: [],
          settings: {},
          activeProfileId: null,
        }));
      }
    } catch {}

    window.location.reload();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("FULL HARD RESET FAILED", err);
    alert("Erreur lors du reset complet. Tu peux aussi vider manuellement les données du site dans le navigateur.");
  }
}

async function clearGameDataAndStatsOnly() {
  try {
    if (typeof window === "undefined") return;

    const ok = window.confirm(
      "⚠️ Reset données & statistiques\n\n" +
        "Cette action supprime uniquement les historiques, matchs simulés et statistiques locales de cet appareil.\n" +
        "Les profils, bots, dartsets, thème, langue et compte sont conservés autant que possible.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    const patterns = [
      "history",
      "histories",
      "stats",
      "stat",
      "match",
      "matches",
      "game-record",
      "game_record",
      "dev-match-simulator",
    ];

    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      for (const k of keys) {
        const lower = k.toLowerCase();
        if (patterns.some((needle) => lower.includes(needle))) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {}

    try {
      const anyIndexedDB: any = (window as any).indexedDB;
      const names = new Set<string>();
      if (anyIndexedDB && typeof anyIndexedDB.databases === "function") {
        const dbs = await anyIndexedDB.databases();
        for (const db of dbs || []) {
          const name = String(db?.name || "");
          const lower = name.toLowerCase();
          if (name && patterns.some((needle) => lower.includes(needle))) names.add(name);
        }
      }
      ["dc_stats_v1", "dc_history_v1"].forEach((name) => names.add(name));
      for (const name of names) {
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    } catch {}

    window.location.reload();
  } catch (err) {
    console.error("CLEAR GAME DATA/STATS FAILED", err);
    alert("Erreur pendant le reset données/statistiques. Tu peux vider manuellement l’historique depuis le navigateur.");
  }
}

// ---------------- UI card menu (settings shell) ----------------

const AWENA_AVATAR = "/awena/awena-avatar.webp";
const AWENA_TITLE_FONT = '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';

function SettingsInfoDot({
  title,
  content,
  theme,
  size = 32,
  helpText,
}: {
  title: string;
  content?: React.ReactNode;
  theme: any;
  size?: number;
  helpText?: string;
}) {
  const awena = useAwenaOptional();

  const openAwena = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!awena) return;
    awena.setRuntime({
      route: "settings",
      mode: "settings-help",
      phase: "menu",
      inGame: false,
      screenLabel: title,
      extra: { settingsSection: title, settingsHelp: helpText || "" },
    });
    awena.openPanel();
    await awena.ask(`Présente-moi en détail la page de réglages « ${title} ». ${helpText || ""} Explique chaque fonction disponible, à quoi elle sert, comment l'utiliser, les conséquences des choix, les précautions éventuelles et les conseils pratiques. Ensuite reste dans ce contexte pour répondre à mes questions.`);
  };

  return (
    <button
      type="button"
      aria-label={`Awena — ${title}`}
      title={`Awena — ${title}`}
      onClick={(event) => void openAwena(event)}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: "none",
        background: "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)",
        boxShadow: "0 0 14px rgba(22,232,255,.42),0 0 22px rgba(255,56,199,.22),0 0 0 2px rgba(0,0,0,.45)",
        cursor: awena ? "pointer" : "default",
        flexShrink: 0,
        padding: 3,
        display: "grid",
        placeItems: "center",
        opacity: awena ? 1 : .55,
      }}
    >
      <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}>
        <img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </span>
    </button>
  );
}

function SettingsMenuCard({
  title,
  subtitle,
  theme,
  onClick,
  rightHint,
  titleNode,
}: {
  title: string;
  subtitle: string;
  theme: any;
  onClick?: () => void;
  rightHint?: string;
  titleNode?: React.ReactNode;
}) {
  const infoContent = (
    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, color: "rgba(255,255,255,0.92)", fontSize: 13 }}>
      {subtitle}
      {rightHint ? (
        <div style={{ marginTop: 10, color: theme.primary, fontWeight: 900, letterSpacing: 0.5 }}>
          {rightHint}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className="dc-settings-shell-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: (theme as any).cardBackground || theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          minHeight: 70,
          display: "flex",
          alignItems: "center",
          padding: "14px 56px 14px 16px",
          background: "transparent",
          border: "none",
          cursor: onClick ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: theme.primary,
            textShadow: `0 0 10px ${theme.primary}55`,
            lineHeight: 1.2,
            whiteSpace: "normal",
            overflow: "hidden",
          }}
        >
          {titleNode ?? title}
        </div>
      </button>

      <div
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
        }}
      >
        <InfoDot title={title} content={infoContent} size={32} color={theme.primary} glow={`${theme.primary}66`} disableAwenaTakeover />
      </div>
    </div>
  );
}

function SettingsPageHeader({
  title,
  subtitle,
  theme,
  onBack,
  backTitle = "Retour",
  showHelp = true,
  onTitleClick,
}: {
  title: string;
  subtitle: string;
  theme: any;
  onBack: () => void;
  backTitle?: string;
  showHelp?: boolean;
  onTitleClick?: () => void;
}) {
  return (
    <div style={{ width: "100%", paddingInline: 8, boxSizing: "border-box", marginBottom: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "42px minmax(0, 1fr) 42px",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <BackDot onClick={onBack} title={backTitle} size={38} color={theme.primary} glow={`${theme.primary}55`} />

        <button
          type="button"
          onClick={onTitleClick}
          style={{
            minWidth: 0,
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: theme.primary,
            fontSize: "clamp(23px, 6.4vw, 34px)",
            lineHeight: 1.05,
            textShadow: `0 0 10px ${theme.primary}33`,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: onTitleClick ? "pointer" : "default",
          }}
        >
          {title}
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {showHelp ? (
            <SettingsInfoDot
              title={title}
              theme={theme}
              size={38}
              helpText={subtitle}
            />
          ) : (
            <div style={{ width: 38, height: 38 }} />
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 9,
          paddingInline: 10,
          textAlign: "center",
          fontSize: 12,
          lineHeight: 1.35,
          color: theme.textSoft,
          maxWidth: 390,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

// ---------------- Composant DEV MODE (Settings / menu) ----------------

function DevModeBlock({ go }: { go?: (tab: any, params?: any) => void }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const dev = useDevMode() as any;
  const { sport } = useSport();

  const enabled: boolean = !!dev?.enabled;
  const setEnabled: (v: boolean) => void = dev?.setEnabled ?? (() => {});

  const [openTests, setOpenTests] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [simBusy, setSimBusy] = React.useState(false);
  const [simLastResult, setSimLastResult] = React.useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const sectionStyle: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    padding: 16,
    marginTop: 10,
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
    padding: "8px 12px",
    background: active ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.04)",
    color: active ? theme.primary : theme.textSoft,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: active ? `0 0 14px ${theme.primary}33` : "none",
  });

  function resetForceOffline() {
    try {
      localStorage.removeItem(FORCE_OFFLINE_KEY);
      notify(t("settings.dev.tests.online", "Online simulé (flag OFF)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function setForceOffline() {
    try {
      localStorage.setItem(FORCE_OFFLINE_KEY, "1");
      notify(t("settings.dev.tests.offline", "Offline simulé (flag ON)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function seedDemo() {
    try {
      localStorage.setItem(SEED_DEMO_KEY, String(Date.now()));
      notify(t("settings.dev.tests.seed", "Seed démo demandé (flag)."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  async function simulateAllGames() {
    if (simBusy) return;
    const ok = window.confirm(
      "Simulation de parties DEV\n\n" +
        "Cette action remplace les anciennes simulations DEV du sport actif par des parties fictives terminées.\n" +
        "Elle évite donc les compteurs doublés quand tu relances plusieurs fois le test.\n" +
        "Les parties sont marquées devSim/source=dev-match-simulator-v1.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    setSimBusy(true);
    setSimLastResult(null);
    try {
      const res = await simulateDevMatchesAllGames({ perGame: 1, sport: sport as any, replacePrevious: true });
      const label = `${res.created} parties fictives créées (${Object.keys(res.games).length} jeux, ${res.removed} ancienne(s) simulation(s) supprimée(s)).`;
      setSimLastResult(label);
      notify(label);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Erreur simulation parties.";
      setSimLastResult(msg);
      notify(msg);
    } finally {
      setSimBusy(false);
    }
  }

  async function injectX01ReferenceMatch() {
    try {
      const rec = await injectDevX01ReferenceMatch();
      const msg = "Match X01 test JN/SP injecté dans l'historique.";
      setSimLastResult(msg);
      notify(msg);
      if (go) {
        go("x01_end", { matchId: rec.id, resumeId: rec.id, showEnd: true, fresh: Date.now() });
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Erreur injection match X01 test.";
      setSimLastResult(msg);
      notify(msg);
    }
  }

  function clearOnlyDevFlags() {
    try {
      localStorage.removeItem(FORCE_OFFLINE_KEY);
      localStorage.removeItem(SEED_DEMO_KEY);
      notify(t("settings.dev.tests.cleared", "Flags DEV supprimés."));
    } catch {
      notify(t("settings.dev.tests.error", "Erreur opération (storage)."));
    }
  }

  function clearLocalStorageNonCritical() {
    const ok = window.confirm(
      "⚠️ Reset local (soft)\n\n" +
        "Cette action efface le LocalStorage (y compris préférences UI / flags),\n" +
        "sans tenter de supprimer les bases IndexedDB.\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    try {
      localStorage.clear();
      sessionStorage.clear();
      notify("LocalStorage vidé. Recharge la page.");
    } catch {
      notify("Erreur reset local.");
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              margin: 0,
              marginBottom: 4,
              fontSize: 16,
              fontWeight: 900,
              color: theme.primary,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              textShadow: `0 0 12px ${theme.primary}55`,
            }}
          >
            {t("settings.dev.title", "Développeur")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.35 }}>
            {t(
              "settings.dev.subtitle",
              "ON = rend cliquables uniquement les features déjà grisées (non terminées)."
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          style={pillBtn(enabled)}
          title={t("settings.dev.toggleHint", "Active/désactive l’unlock des features grisées.")}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: theme.textSoft }}>
          {enabled
            ? t("settings.dev.stateOn", "Unlock activé : les boutons gris sont testables.")
            : t("settings.dev.stateOff", "Unlock inactif : comportement normal (gris = inactif).")}
        </div>

        <button
          type="button"
          onClick={() => setOpenTests((v) => !v)}
          style={{
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            color: theme.textSoft,
            fontWeight: 900,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {openTests ? t("settings.dev.tests.hide", "Masquer tests") : t("settings.dev.tests.show", "Tests & simu")}
        </button>
      </div>

      {toast && (
        <div style={{ marginTop: 10, fontSize: 11, color: theme.primary, fontWeight: 800 }}>
          {toast}
        </div>
      )}

      {openTests && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8, color: "#fff" }}>
            {t("settings.dev.tests.title", "Tests & Simulations")}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.primary}55`,
                background: `linear-gradient(135deg, ${theme.primary}14, rgba(255,255,255,0.03))`,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Simulations rapides
              </div>
              <button
                type="button"
                onClick={simulateAllGames}
                disabled={simBusy}
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${theme.primary}`,
                  padding: "11px 12px",
                  background: simBusy ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.55)",
                  color: simBusy ? theme.textSoft : theme.primary,
                  fontWeight: 950,
                  cursor: simBusy ? "wait" : "pointer",
                  textAlign: "left",
                  boxShadow: simBusy ? "none" : `0 0 16px ${theme.primary}22`,
                }}
              >
                {simBusy ? "Simulation en cours…" : "Créer simulations — sport actif"}
                <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                  Remplace les anciennes simulations DEV du sport actif, puis ajoute 1 partie terminée par jeu. En mode Darts : X01, Cricket, Killer, Shanghai et Golf.
                </div>
              </button>
              <button
                type="button"
                onClick={injectX01ReferenceMatch}
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(125,226,169,0.75)",
                  padding: "11px 12px",
                  background: "rgba(0,60,35,0.32)",
                  color: "#7de2a9",
                  fontWeight: 950,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 0 16px rgba(125,226,169,0.18)",
                }}
              >
                Injecter match X01 test JN/SP
                <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                  Crée directement en historique la partie 301 simple out : JN 117/61/26/74/23 et SP 67/120/65/bust. Ouvre ensuite le résumé pour tester sans rejouer.
                </div>
              </button>
              {simLastResult && <div style={{ marginTop: 8, fontSize: 11, color: theme.primary, fontWeight: 850 }}>{simLastResult}</div>}
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.025)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Réseau / flags
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={setForceOffline}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  padding: "10px 10px",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("settings.dev.tests.offlineBtn", "Simuler OFFLINE")}
              </button>

              <button
                type="button"
                onClick={resetForceOffline}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  padding: "10px 10px",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("settings.dev.tests.onlineBtn", "Simuler ONLINE")}
              </button>
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.02)",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: theme.textSoft, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Maintenance locale
              </div>

            <button
              type="button"
              onClick={seedDemo}
              style={{
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                padding: "10px 10px",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.seedBtn", "Seed démo (flag)")}
              <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4, lineHeight: 1.35 }}>
                {t(
                  "settings.dev.tests.seedHelp",
                  "Pose un flag local. À brancher côté app (store) pour injecter des profils/parties de test."
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={clearOnlyDevFlags}
              style={{
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                padding: "10px 10px",
                background: "rgba(255,255,255,0.02)",
                color: theme.textSoft,
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.clearFlags", "Supprimer flags DEV")}
            </button>

            <button
              type="button"
              onClick={clearLocalStorageNonCritical}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,120,120,0.55)",
                padding: "10px 10px",
                background: "rgba(255,0,0,0.06)",
                color: "#ffb3b3",
                fontWeight: 900,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {t("settings.dev.tests.softReset", "Reset local (soft)")}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 1.35 }}>
                {t(
                  "settings.dev.tests.softResetHelp",
                  "Efface LocalStorage/SessionStorage uniquement (sans IndexedDB)."
                )}
              </div>
            </button>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
            {t(
              "settings.dev.tests.note",
              "Note : ces tests posent surtout des flags. Pour que ce soit pleinement effectif, lis FORCE_OFFLINE_KEY dans tes modules réseau/sync."
            )}
          </div>
        </div>
      )}

      {openTests && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              fontWeight: 900,
              color: theme.primary,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Sécurité & outils compte DEV
          </div>
          <div style={{ fontSize: 11, color: theme.textSoft, lineHeight: 1.35, marginBottom: 8 }}>
            Les actions techniques de session, sync express, refresh, purge locale et debug sont regroupées ici pour ne plus polluer la page Compte.
          </div>
          <AccountToolsPanel go={go} />
        </div>
      )}
    </section>
  );
}

// ---------------- Composant principal ----------------

type SettingsTab = "menu" | "account" | "advertising" | "shop" | "privacy" | "theme" | "lang" | "audio" | "general" | "sport" | "castViewer" | "developer" | "awena";
type DeveloperSub = "menu" | "diagnostics" | "tests" | "onlineCleanup" | "nas" | "logs" | "security";

const PRIVACY_POLICY_URL = "https://multisports-scoring.pages.dev/privacy-policy";
const ACCOUNT_DELETION_URL = "https://multisports-scoring.pages.dev/account-deletion";
const PRIVACY_CONTACT_EMAIL = "multisports.scoring@gmail.com";

function openLegalUrl(url: string) {
  if (typeof window === "undefined") return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
}

function PrivacyDataSection({ onOpenAccount }: { onOpenAccount?: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    padding: 14,
    boxShadow: `0 14px 28px rgba(0,0,0,0.34), 0 0 18px ${theme.primary}14`,
  };
  const iconBox: React.CSSProperties = { width: 40, height: 40, borderRadius: 13, border: `1px solid ${theme.primary}55`, background: `${theme.primary}10`, color: theme.primary, display: "grid", placeItems: "center", flexShrink: 0 };
  const action: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 13, border: `1px solid ${theme.primary}77`, background: `${theme.primary}12`, color: theme.primary, fontWeight: 950, fontSize: 10.5, cursor: "pointer", padding: "9px 11px" };
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const Head = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: 10, alignItems: "center" }}><div style={iconBox}>{icon}</div><div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 14 }}>{title}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.38 }}>{subtitle}</div></div></div>
  );

  return (
    <section style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      <div style={card}>
        <Head icon={<svg width="23" height="23" viewBox="0 0 24 24"><path {...p} d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z"/><path {...p} d="M9.5 12 11 13.5l3.5-4"/></svg>} title={L("POLITIQUE DE CONFIDENTIALITÉ", "PRIVACY POLICY", "POLÍTICA DE PRIVACIDAD")} subtitle={L("Prestataires, conservation, sécurité et traitement des données.", "Providers, retention, security and data processing.", "Proveedores, conservación, seguridad y tratamiento de datos.")} />
        <button type="button" style={{ ...action, marginTop: 12 }} onClick={() => openLegalUrl(PRIVACY_POLICY_URL)}>{L("Ouvrir la politique", "Open policy", "Abrir política")}</button>
      </div>

      <div style={card}>
        <Head icon={<svg width="23" height="23" viewBox="0 0 24 24"><circle {...p} cx="12" cy="8" r="3"/><path {...p} d="M5 20a7 7 0 0 1 14 0M18 4v5m-2.5-2.5h5"/></svg>} title={L("MES DROITS & MES DONNÉES", "MY RIGHTS & DATA", "MIS DERECHOS Y DATOS")} subtitle={L("Accès, rectification, portabilité et gestion du compte depuis un seul endroit.", "Access, correction, portability and account management in one place.", "Acceso, rectificación, portabilidad y gestión de la cuenta en un solo lugar.")} />
        <button type="button" style={{ ...action, marginTop: 12 }} onClick={onOpenAccount}>{L("Ouvrir les réglages du compte", "Open account settings", "Abrir ajustes de cuenta")}</button>
      </div>

      <div style={card}>
        <Head icon={<svg width="23" height="23" viewBox="0 0 24 24"><path {...p} d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>} title={L("SUPPRESSION DU COMPTE", "ACCOUNT DELETION", "ELIMINACIÓN DE CUENTA")} subtitle={L("La suppression définitive reste protégée dans Compte → Reset. Une demande web est aussi disponible.", "Permanent deletion remains protected in Account → Reset. A web request is also available.", "La eliminación definitiva está protegida en Cuenta → Reset. También hay una solicitud web.")} />
        <button type="button" style={{ ...action, marginTop: 12, borderColor: "rgba(255,90,105,.55)", color: "#ff8b96", background: "rgba(255,70,90,.08)" }} onClick={() => openLegalUrl(ACCOUNT_DELETION_URL)}>{L("Demande web de suppression", "Web deletion request", "Solicitud web de eliminación")}</button>
      </div>

      <div style={card}>
        <Head icon={<svg width="23" height="23" viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="3"/><path {...p} d="m4 7 8 6 8-6"/></svg>} title={L("CONTACT CONFIDENTIALITÉ", "PRIVACY CONTACT", "CONTACTO DE PRIVACIDAD")} subtitle={L("Pour toute demande concernant tes données personnelles.", "For any request regarding your personal data.", "Para cualquier solicitud sobre tus datos personales.")} />
        <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} style={{ display: "block", marginTop: 12, borderRadius: 13, border: `1px solid ${theme.primary}55`, background: "rgba(255,255,255,.025)", color: theme.primary, padding: 11, fontWeight: 950, fontSize: 10.5, textAlign: "center", overflowWrap: "anywhere" }}>{PRIVACY_CONTACT_EMAIL}</a>
      </div>
    </section>
  );
}

// ---------------- Account pages (NEW simple & clean) ----------------

type AccountPage = "account_menu" | "account_storage" | "account_notifications" | "account_danger";

async function hardClearLocalAccountAndAppDataForDeletedAccount() {
  if (typeof window === "undefined") return;

  try { window.localStorage.clear(); } catch {}
  try { window.sessionStorage.clear(); } catch {}

  try {
    const idb: any = (window as any).indexedDB;
    if (!idb) return;

    if (typeof idb.databases === "function") {
      const dbs = await idb.databases();
      for (const db of dbs || []) {
        const name = String(db?.name || "").trim();
        if (!name) continue;
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
      return;
    }

    const known = [
      "dc_stats_v1",
      "dc_history_v1",
      "dc_profiles_v1",
      "dc_training_v1",
      "darts-counter-v7",
      "multisports-scoring",
    ];
    for (const name of known) {
      await new Promise<void>((resolve) => {
        const req = window.indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch {}
}

function forceAuthRoute(hash: "#/auth/login" | "#/auth/signup" | "#/account/start", reload = false) {
  if (typeof window === "undefined") return;
  try {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } catch {
    window.location.hash = hash;
  }
  if (reload) {
    try { window.location.reload(); } catch {}
  }
}

function AccountPages({
  go,
  onFullReset,
  page,
  setPage,
}: {
  go?: (tab: any, params?: any) => void;
  onFullReset?: () => void | Promise<void>;
  page: AccountPage;
  setPage: React.Dispatch<React.SetStateAction<AccountPage>>;
}) {
  const { theme } = useTheme();
  const { t, lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const { store } = useStore();
  const { session, status, loading, profile, updateProfile, deleteAccount, logout } = useAuthOnline() as any;

  const user = session?.user ?? null;
  const isSignedIn = !!user;

  const emailLabel = (user as any)?.email || "—";
  const userIdLabel = (user as any)?.id ? `#${String((user as any).id).slice(0, 8)}` : "—";
  const activeLocalProfile = React.useMemo(() => {
    const s: any = store ?? (typeof window !== "undefined" ? (window as any)?.__appStore?.store : null) ?? null;
    const list = Array.isArray(s?.profiles) ? s.profiles : [];
    const activeId = String(s?.activeProfileId || "");
    return list.find((row: any) => String(row?.id || "") === activeId) || list[0] || null;
  }, [store]);
  const presenceState: "online" | "away" | "offline" = !isSignedIn
    ? "offline"
    : String((store as any)?.selfStatus || "online") === "away"
      ? "away"
      : String((store as any)?.selfStatus || "online") === "offline"
        ? "offline"
        : "online";
  const presenceColor = presenceState === "online" ? "#28e07b" : presenceState === "away" ? "#ffc857" : "#ff5c67";
  const presenceLabel = presenceState === "online" ? L("Connecté", "Connected", "Conectado") : presenceState === "away" ? L("Absent", "Away", "Ausente") : L("Déconnecté", "Disconnected", "Desconectado");
  const [previousLoginAt, setPreviousLoginAt] = React.useState<number | null>(null);

  const [displayName, setDisplayName] = React.useState(profile?.displayName || profile?.nickname || ((user as any)?.email ? String((user as any).email).split("@")[0] : ""));
  const [country, setCountry] = React.useState(profile?.country || "");

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [merging, setMerging] = React.useState(false);
  const [mergeMsg, setMergeMsg] = React.useState<string | null>(null);

  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState<AccountPrefs>(DEFAULT_PREFS);
  const [storagePrefs, setStoragePrefs] = React.useState(() => loadStoragePrefs());
  const [privateNasCapability, setPrivateNasCapability] = React.useState<Awaited<ReturnType<typeof onlineApi.getPrivateNasCapability>> | null>(null);
  const [externalBackupStatus, setExternalBackupStatus] = React.useState<ExternalBackupStatus>(() => ({ supported: false, configured: false, permission: "unknown" }));
  const [externalBackupBusy, setExternalBackupBusy] = React.useState<null | "choose" | "save" | "download" | "forget">(null);
  const [supabaseFailoverState, setSupabaseFailoverState] = React.useState<SupabaseAuthFailoverState | null>(() => getSupabaseAuthFailoverState());
  const [storageEstimate, setStorageEstimate] = React.useState<{ usage: number; quota: number; free: number }>(() => ({ usage: 0, quota: 0, free: 0 }));
  const [cloudUsage, setCloudUsage] = React.useState<AccountStorageUsage | null>(null);
  const [cloudUsageLoading, setCloudUsageLoading] = React.useState(false);
  const [cloudUsageError, setCloudUsageError] = React.useState<string | null>(null);
  const [cloudStorageStatus, setCloudStorageStatus] = React.useState<CloudStorageStatus | null>(null);
  const [cloudStorageTestLoading, setCloudStorageTestLoading] = React.useState(false);
  const [cloudStorageTestResult, setCloudStorageTestResult] = React.useState<{
    status: "ok" | "error" | "info";
    title: string;
    detail?: string;
    objectKey?: string;
  } | null>(null);
  const [cloudBackupItems, setCloudBackupItems] = React.useState<CloudObjectIndexItem[]>([]);
  const [cloudBackupLoading, setCloudBackupLoading] = React.useState<null | "list" | "backup" | `restore:${string}` | `delete:${string}`>(null);
  const [cloudBackupResult, setCloudBackupResult] = React.useState<{
    status: "ok" | "error" | "info";
    title: string;
    detail?: string;
  } | null>(null);
  const [supabaseAccountStatus, setSupabaseAccountStatus] = React.useState<SupabaseAccountStatus | null>(null);
  const [supabaseTablesStatus, setSupabaseTablesStatus] = React.useState<SupabaseTablesStatus | null>(null);
  const [supabaseBridgeStatus, setSupabaseBridgeStatus] = React.useState<SupabaseBridgeStatus | null>(null);
  const [supabaseStatusLoading, setSupabaseStatusLoading] = React.useState(false);
  const [supabaseStatusResult, setSupabaseStatusResult] = React.useState<{
    status: "ok" | "error" | "info";
    title: string;
    detail?: string;
  } | null>(null);
  const [storageStripeStatus, setStorageStripeStatus] = React.useState<StorageStripeStatus | null>(null);
  const [storageStripeStatusLoading, setStorageStripeStatusLoading] = React.useState(false);
  const [storageCheckoutLoading, setStorageCheckoutLoading] = React.useState<string | null>(null);
  const processedStorageCheckoutRef = React.useRef<string | null>(null);
  const storageCapabilities = React.useMemo(() => getLocalStorageCapabilities(), []);

  React.useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [estimate, external] = await Promise.all([
        estimateBrowserStorage(),
        getExternalBackupStatus(),
      ]);
      if (!alive) return;
      setStorageEstimate(estimate);
      setExternalBackupStatus(external);
      setSupabaseFailoverState(getSupabaseAuthFailoverState());
    };
    void refresh();
    const onStoragePrefs = () => {
      setStoragePrefs(loadStoragePrefs());
      void refresh();
    };
    const onExternalStatus = (event: Event) => {
      const detail = (event as CustomEvent<ExternalBackupStatus>).detail;
      if (detail) setExternalBackupStatus(detail);
    };
    const onFailoverStatus = (event: Event) => {
      const detail = (event as CustomEvent<SupabaseAuthFailoverState>).detail;
      setSupabaseFailoverState(detail || getSupabaseAuthFailoverState());
    };
    window.addEventListener("dc-storage-prefs-changed", onStoragePrefs as any);
    window.addEventListener("dc-external-backup-status", onExternalStatus as EventListener);
    window.addEventListener("dc-supabase-failover-status", onFailoverStatus as EventListener);
    window.addEventListener("storage", onStoragePrefs as any);
    return () => {
      alive = false;
      window.removeEventListener("dc-storage-prefs-changed", onStoragePrefs as any);
      window.removeEventListener("dc-external-backup-status", onExternalStatus as EventListener);
      window.removeEventListener("dc-supabase-failover-status", onFailoverStatus as EventListener);
      window.removeEventListener("storage", onStoragePrefs as any);
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    if (!isSignedIn) {
      setPrivateNasCapability(null);
      return () => { alive = false; };
    }
    void onlineApi.getPrivateNasCapability().then((capability) => {
      if (alive) setPrivateNasCapability(capability);
    }).catch(() => {
      if (alive) setPrivateNasCapability({ checked: false, authorized: false, reason: "capability_unavailable", checkedAt: Date.now() });
    });
    return () => { alive = false; };
  }, [isSignedIn, (user as any)?.id]);

  const refreshCloudUsage = React.useCallback(async () => {
    if (!isSignedIn) {
      setCloudUsage(null);
      setCloudUsageError(null);
      return;
    }
    setCloudUsageLoading(true);
    setCloudUsageError(null);

    // Quota : le backend reste la source de facturation Stripe, mais la Pages
    // Function R2 est le fallback de lecture. Ainsi l'écran reste utile même si
    // le NAS/PostgreSQL est momentanément indisponible.
    try {
      const usage = await getAccountStorageUsage();
      setCloudUsage(usage);
    } catch (backendError: any) {
      try {
        const direct = await getDirectR2Usage();
        setCloudUsage({
          ok: true,
          preference: {
            plan_id: direct.planId,
            storage_provider: "cloud_r2",
            quota_bytes: direct.quotaBytes,
            used_bytes: direct.usedBytes,
            billing_status: direct.billingStatus,
            billing_exempt: direct.billingExempt,
          },
          usedBytes: direct.usedBytes,
          quotaBytes: direct.quotaBytes,
          remainingBytes: direct.remainingBytes,
          percentUsed: direct.percentUsed,
        });
        setCloudUsageError(null);
      } catch {
        setCloudUsageError(backendError?.message || "Impossible de charger le quota cloud.");
      }
    }

    // État R2 : priorité au chemin réellement utilisé pour les sauvegardes.
    try {
      const directStatus = await getDirectR2Status();
      setCloudStorageStatus({
        ok: !!directStatus.ok,
        configured: !!directStatus.ok && !!directStatus.bucketReady,
        provider: "cloudflare-pages-r2-direct",
        bucket: directStatus.bucketReady ? "multisports-user-data" : null,
        canUpload: !!directStatus.ok && !!directStatus.bucketReady,
        message: directStatus.message || directStatus.error || "Cloudflare Pages/R2 direct",
      });
    } catch {
      setCloudStorageStatus(null);
    }

    // Ces diagnostics sont secondaires et peuvent dépendre du backend NAS.
    // Leur échec ne doit pas invalider le stockage R2 direct.
    try { setSupabaseAccountStatus(await getSupabaseAccountStatus()); } catch { setSupabaseAccountStatus(null); }
    try { setSupabaseBridgeStatus(await getSupabaseBridgeStatus()); } catch { setSupabaseBridgeStatus(null); }
    try { setStorageStripeStatus(await getStorageStripeStatus(false)); } catch { setStorageStripeStatus(null); }

    setCloudUsageLoading(false);
  }, [isSignedIn]);

  React.useEffect(() => {
    if (page !== "account_storage") return;
    void refreshCloudUsage();
  }, [page, refreshCloudUsage]);

  async function refreshStorageStripeStatus(verify = true) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de tester Stripe.");
      openAccountLogin();
      return;
    }
    setStorageStripeStatusLoading(true);
    try {
      const status = await getStorageStripeStatus(verify);
      setStorageStripeStatus(status);
      if (status.configured) {
        setMessage("Stripe stockage est configuré : les paiements peuvent être testés.");
      } else if (!status.secretKeyConfigured) {
        setCloudUsageError("STRIPE_SECRET_KEY est manquant dans Cloudflare Pages.");
      } else {
        setCloudUsageError(`Stripe stockage incomplet : ${status.missingEnv?.length || 0} price IDs à renseigner dans le .env.`);
      }
    } catch (e: any) {
      setCloudUsageError(e?.message || "Impossible de tester Stripe.");
    } finally {
      setStorageStripeStatusLoading(false);
    }
  }

  async function syncStoragePrefsToBackend(saved: typeof storagePrefs) {
    if (!isSignedIn) return;
    try {
      const res = await saveAccountStoragePreferences({
        planId: saved.selectedCloudPlan,
        storageDestination: saved.selectedDestination,
        metadata: {
          keepLocalSafetyCopy: saved.keepLocalSafetyCopy,
          supabaseUsage: "auth_profile_only",
          heavyDataProvider: saved.selectedDestination === "cloud_r2" ? "cloudflare_r2" : saved.selectedDestination,
        },
      });
      await refreshCloudUsage();
      if (res?.requiresPayment) {
        setMessage(res.paymentMessage || "Offre préparée. Le quota cloud ne sera activé qu'après paiement.");
      }
    } catch (e: any) {
      setCloudUsageError(e?.message || "Préférence locale enregistrée, mais synchro compte impossible.");
    }
  }

  async function persistStoragePrefs(next: Partial<typeof storagePrefs>, msg?: string) {
    const previous = storagePrefs;
    if (next.selectedDestination === "founder_nas" && previous.selectedDestination !== "founder_nas") {
      const capability = await onlineApi.getPrivateNasCapability({ force: true });
      setPrivateNasCapability(capability);
      if (capability.checked && !capability.authorized) {
        setCloudUsageError("Ce compte public n'est pas autorisé à accéder au NAS privé du fondateur.");
        return;
      }
      // Si le pré-contrôle NAS est simplement indisponible/timeout, ne pas
      // bloquer ici : switchAccountInfrastructure("nas") tentera le bridge
      // sécurisé serveur, qui reste l'autorité finale.
    }
    const saved = saveStoragePrefs(next);
    setStoragePrefs(saved);
    setMessage(msg || "Préférence de stockage enregistrée.");
    try {
      if (saved.selectedDestination === "founder_nas" && previous.selectedDestination !== "founder_nas") {
        await onlineApi.switchAccountInfrastructure("nas");
        setMessage("Mode privé NAS activé pour tes sauvegardes. ONLINE, amis et proximité restent sur le cloud public.");
      } else if (saved.selectedDestination !== "founder_nas" && previous.selectedDestination === "founder_nas") {
        await onlineApi.switchAccountInfrastructure("public");
        setMessage(saved.selectedDestination === "cloud_r2" ? "Mode public activé : session Supabase + sauvegardes Cloudflare R2." : "Mode public activé : session Supabase, avec la destination locale sélectionnée.");
      }
    } catch (e: any) {
      const rolledBack = saveStoragePrefs(previous);
      setStoragePrefs(rolledBack);
      setCloudUsageError(e?.message || "Impossible de basculer l'infrastructure du compte.");
      return;
    }
    // Quand le fondateur quitte le NAS privé, le passage au cloud doit être
    // immédiatement autonome : aucune requête NAS n'est nécessaire pour valider
    // cette bascule. Le backend NAS n'est synchronisé que lorsqu'il est réellement
    // la destination active, ou pour les comptes publics qui utilisaient déjà la
    // gestion de plans historique.
    if (saved.selectedDestination === "founder_nas" || previous.selectedDestination !== "founder_nas") {
      void syncStoragePrefsToBackend(saved);
    }
  }

  async function runExternalBackupAction(action: "choose" | "save" | "download" | "forget") {
    setExternalBackupBusy(action);
    setError(null);
    try {
      let next: ExternalBackupStatus;
      if (action === "choose") next = await chooseExternalBackupFile();
      else if (action === "save") next = await writeExternalBackupNow("settings-manual", { requestPermission: true });
      else if (action === "forget") next = await forgetExternalBackupFile();
      else next = await downloadExternalBackupFallback("settings-download");
      setExternalBackupStatus(next);
      if (next.lastError) setError(next.lastError);
      else if (action === "forget") setMessage("Emplacement externe oublié.");
      else setMessage(action === "choose" ? "Emplacement choisi et première sauvegarde créée." : "Sauvegarde externe créée.");
    } catch (e: any) {
      const cancelled = String(e?.name || "") === "AbortError";
      if (!cancelled) setError(e?.message || "Opération de sauvegarde externe impossible.");
    } finally {
      setExternalBackupBusy(null);
    }
  }

  async function refreshSupabaseStatus(showFeedback = true) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de tester Supabase.");
      openAccountLogin();
      return;
    }
    setSupabaseStatusLoading(true);
    setSupabaseStatusResult({
      status: "info",
      title: "Test Supabase en cours…",
      detail: "Vérification de l’URL projet, des clés backend et de Supabase Auth.",
    });
    try {
      const status = await getSupabaseAccountStatus();
      setSupabaseAccountStatus(status);
      try {
        const tables = await getSupabaseTablesStatus();
        setSupabaseTablesStatus(tables);
      } catch (tableError) {
        setSupabaseTablesStatus(null);
      }
      try {
        const bridge = await getSupabaseBridgeStatus();
        setSupabaseBridgeStatus(bridge);
      } catch {
        setSupabaseBridgeStatus(null);
      }
      try {
        const stripe = await getStorageStripeStatus(false);
        setStorageStripeStatus(stripe);
      } catch {
        setStorageStripeStatus(null);
      }
      const missing = Array.isArray(status?.missingEnv) ? status.missingEnv.filter(Boolean) : [];
      if (!status?.configured || missing.length) {
        setSupabaseStatusResult({
          status: "error",
          title: "Supabase incomplet",
          detail: `Variables manquantes dans le .env : ${missing.join(", ") || "configuration non reconnue"}.`,
        });
        return;
      }
      const authDetail = status.auth?.message ? ` ${status.auth.message}` : "";
      setSupabaseStatusResult({
        status: status.auth?.reachable === false ? "info" : "ok",
        title: status.auth?.reachable === false ? "Supabase configuré, test réseau à surveiller" : "Supabase configuré",
        detail: `${status.message || "Supabase minimal prêt."}${authDetail}`,
      });
      if (showFeedback) setMessage(null);
    } catch (e: any) {
      const detail = e?.message || "Impossible de vérifier Supabase.";
      setSupabaseStatusResult({ status: "error", title: "Test Supabase échoué", detail });
    } finally {
      setSupabaseStatusLoading(false);
    }
  }

  async function runCloudStorageSmokeTest() {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de vérifier le stockage cloud.");
      openAccountLogin();
      return;
    }
    setCloudStorageTestLoading(true);
    setCloudUsageError(null);
    setMessage(null);
    setCloudStorageTestResult({
      status: "info",
      title: "Vérification R2 en cours…",
      detail: "Diagnostic lecture seule : aucun objet test ne sera écrit ni facturé.",
    });
    try {
      const [status, usage] = await Promise.all([getDirectR2Status(), getDirectR2Usage()]);
      setCloudStorageStatus({
        ok: status.ok,
        configured: status.ok === true,
        provider: "cloudflare-pages-r2-direct",
        canUpload: isDirectR2PremiumWriteAllowed(usage),
        message: status.message || status.error || "Cloudflare Pages/R2 direct",
      });
      if (!status.ok) throw new Error(status.message || status.error || "La route Cloudflare Pages/R2 n'est pas prête.");

      const premium = isDirectR2PremiumWriteAllowed(usage);
      setCloudStorageTestResult({
        status: premium ? "ok" : "info",
        title: premium ? "R2 prêt et PREMIUM actif" : "R2 prêt — écritures verrouillées",
        detail: premium
          ? `Route R2 OK · offre ${usage.planId} active · ${formatStorageBytes(usage.remainingBytes)} disponibles. Aucun objet de test n'a été créé.`
          : "Route R2 OK. Aucune offre PREMIUM active : les nouvelles écritures R2 sont bloquées côté application ET côté serveur. Aucun objet de test n'a été créé.",
      });
    } catch (e: any) {
      const detail = e?.message || "Diagnostic stockage cloud impossible.";
      setCloudUsageError(detail);
      setCloudStorageTestResult({ status: "error", title: "Vérification R2 échouée", detail });
    } finally {
      setCloudStorageTestLoading(false);
      void refreshCloudUsage();
    }
  }

  async function refreshCloudBackupList(showFeedback = false) {
    if (!isSignedIn) {
      setCloudBackupItems([]);
      return;
    }
    setCloudBackupLoading("list");
    setCloudBackupResult(showFeedback ? { status: "info", title: "Recherche des sauvegardes…", detail: "Lecture de l’index R2 du compte." } : null);
    try {
      const rows = await listCloudBackups(12);
      setCloudBackupItems(rows);
      if (showFeedback) {
        setCloudBackupResult({
          status: "ok",
          title: rows.length ? `${rows.length} sauvegarde(s) trouvée(s)` : "Aucune sauvegarde cloud pour le moment",
          detail: rows.length ? "Les sauvegardes les plus récentes sont affichées ci-dessous." : "Lance une première sauvegarde manuelle pour créer ton point de restauration R2.",
        });
      }
    } catch (e: any) {
      const detail = e?.message || "Impossible de lister les sauvegardes cloud.";
      setCloudBackupResult({ status: "error", title: "Liste cloud inaccessible", detail });
    } finally {
      setCloudBackupLoading(null);
    }
  }

  async function runCloudBackupNow() {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de sauvegarder vers le cloud.");
      openAccountLogin();
      return;
    }
    setCloudBackupLoading("backup");
    setCloudUsageError(null);
    setCloudBackupResult({
      status: "info",
      title: "Préparation de la sauvegarde…",
      detail: "Export local : profils, dartsets et historique. Les stats agrégées seront reconstruites à la restauration.",
    });
    try {
      const exported = await exportCloudBackupAsJson();
      const backupObj: any = exported.backupObj || {};
      const rawSize = new Blob([exported.backupJson]).size;
      const uploaded = await uploadCloudBackupJson({
        backupJson: exported.backupJson,
        title: `Sauvegarde cloud manuelle — ${new Date().toLocaleString("fr-FR")}`,
        metadata: {
          appVersion: backupObj.appVersion || "unknown",
          exportedAt: backupObj.exportedAt || new Date().toISOString(),
          historyCount: Array.isArray(backupObj.history) ? backupObj.history.length : 0,
          profilesCount: Array.isArray(backupObj.localProfiles) ? backupObj.localProfiles.length : 0,
          dartsetsCount: Array.isArray(backupObj.dartsets) ? backupObj.dartsets.length : 0,
          rawSizeBytes: rawSize,
        },
      });
      if (uploaded?.usage) setCloudUsage(uploaded.usage);
      setCloudBackupResult({
        status: "ok",
        title: "Sauvegarde cloud créée",
        detail: `Backup envoyé vers R2 : ${formatStorageBytes(Number(uploaded?.object?.size_bytes || 0))} stockés · source ${formatStorageBytes(rawSize)}.`,
      });
      await refreshCloudBackupList(false);
      await refreshCloudUsage();
    } catch (e: any) {
      const missing = e?.missingEnv || e?.data?.missingEnv;
      const detail = Array.isArray(missing) && missing.length
        ? `Cloudflare R2 non configuré dans le .env : ${missing.join(", ")}`
        : e?.message || "Sauvegarde cloud impossible.";
      setCloudUsageError(detail);
      setCloudBackupResult({ status: "error", title: "Sauvegarde cloud échouée", detail });
    } finally {
      setCloudBackupLoading(null);
    }
  }

  async function restoreCloudBackupItem(item: CloudObjectIndexItem) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant de restaurer une sauvegarde cloud.");
      openAccountLogin();
      return;
    }
    const label = item.title || item.object_key || "cette sauvegarde";
    const ok = window.confirm(
      `Restaurer ${label} ?\n\n` +
      "Mode V1 sécurisé : fusion des données cloud avec les données locales. Les stats seront reconstruites depuis l’historique."
    );
    if (!ok) return;
    setCloudBackupLoading(`restore:${item.id}`);
    setCloudBackupResult({ status: "info", title: "Restauration en cours…", detail: "Téléchargement R2 puis fusion locale." });
    try {
      const downloaded = await downloadCloudBackupJson(item.id);
      const restored = await restoreCloudBackupFromJson({ json: downloaded.backupJson, mode: "merge", rebuild: true });
      if (!restored.ok) throw new Error(restored.error || "Format de sauvegarde invalide.");
      const backup: any = restored.backup;
      setCloudBackupResult({
        status: "ok",
        title: "Restauration cloud terminée",
        detail: `Fusion effectuée : ${Array.isArray(backup.history) ? backup.history.length : 0} parties · ${Array.isArray(backup.localProfiles) ? backup.localProfiles.length : 0} profils · ${Array.isArray(backup.dartsets) ? backup.dartsets.length : 0} sets.`,
      });
      const reload = window.confirm("Restauration terminée. Recharger l’application maintenant pour afficher les données restaurées ?");
      if (reload) window.location.reload();
    } catch (e: any) {
      const detail = e?.message || "Restauration cloud impossible.";
      setCloudBackupResult({ status: "error", title: "Restauration cloud échouée", detail });
    } finally {
      setCloudBackupLoading(null);
    }
  }

  async function deleteCloudBackupItem(item: CloudObjectIndexItem) {
    const ok = window.confirm(`Supprimer la sauvegarde cloud “${item.title || item.object_key || item.id}” ?`);
    if (!ok) return;
    setCloudBackupLoading(`delete:${item.id}`);
    try {
      const deleted = await deleteCloudObjectRemote(item.id);
      if (deleted?.usage) setCloudUsage(deleted.usage);
      setCloudBackupResult({ status: "ok", title: "Sauvegarde supprimée", detail: "L’objet R2 a été supprimé et le quota a été recalculé." });
      await refreshCloudBackupList(false);
      await refreshCloudUsage();
    } catch (e: any) {
      setCloudBackupResult({ status: "error", title: "Suppression impossible", detail: e?.message || "Erreur suppression sauvegarde cloud." });
    } finally {
      setCloudBackupLoading(null);
    }
  }

  async function startStorageCheckout(planId: StoragePlanId, interval: StorageBillingInterval) {
    if (!isSignedIn) {
      safeAlert("Connecte-toi avant d'activer un abonnement cloud.");
      openAccountLogin();
      return;
    }

    // Checkout stockage direct via Cloudflare Pages : aucun passage par le NAS.
    // La Pages Function crée la session Stripe puis renvoie l'URL Checkout.
    // Si Stripe refuse le price_, on affiche le vrai message au lieu de laisser
    // la carte bloquée sur EN ATTENTE.
    const saved = saveStoragePrefs({ selectedCloudPlan: planId, selectedDestination: "cloud_r2" });
    setStoragePrefs(saved);
    setMessage("Ouverture de Stripe Checkout…");
    setCloudUsageError(null);
    setStorageCheckoutLoading(`${planId}:${interval}`);

    try {
      const base = `${window.location.origin}${window.location.pathname}`;
      const successUrl = `${base}#/settings?account=storage&storage_checkout=success&storage_session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${base}#/settings?account=storage&storage_checkout=cancel`;
      const checkout = await createStorageCheckoutSession({ planId, interval, successUrl, cancelUrl });
      if (!checkout?.url) {
        throw new Error(checkout?.message || checkout?.error || "Stripe n'a pas renvoyé d'URL Checkout.");
      }
      window.location.href = checkout.url;
    } catch (e: any) {
      const missingEnv = e?.missingEnv || e?.data?.missingEnv || "";
      const detail = missingEnv
        ? `Prix Stripe non configuré côté .env : ${missingEnv}`
        : e?.message || "Impossible de lancer le paiement Stripe.";
      setCloudUsageError(detail);
      setMessage(null);
      setStorageCheckoutLoading(null);
      safeAlert(detail);
      void refreshStorageStripeStatus(true);
      void refreshCloudUsage();
    }
  }


  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = String(window.location.hash || "");
    if (!hash.includes("storage_checkout=")) return;
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(query);
    const statusParam = params.get("storage_checkout") || "";
    const sessionId = params.get("storage_session_id") || "";
    setPage("account_storage");
    try {
      const cleanHash = hash.split("?")[0] || "#/settings";
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${cleanHash}`);
    } catch {}
    if (statusParam === "cancel") {
      setMessage("Paiement annulé. L'offre payante reste en attente tant que Stripe n'a pas confirmé.");
      return;
    }
    if (!isSignedIn || !sessionId || sessionId === "cancelled" || processedStorageCheckoutRef.current === sessionId) return;
    processedStorageCheckoutRef.current = sessionId;
    setStorageCheckoutLoading("verify");
    verifyStorageCheckoutSession(sessionId)
      .then((res) => {
        if (res?.usage) setCloudUsage(res.usage);
        setMessage(res?.activated ? "Paiement confirmé : quota cloud activé." : "Paiement vérifié. Le quota sera activé dès confirmation Stripe.");
      })
      .catch((e: any) => setCloudUsageError(e?.message || "Impossible de vérifier le paiement Stripe."))
      .finally(() => setStorageCheckoutLoading(null));
  }, [isSignedIn]);

  React.useEffect(() => {
    setDisplayName(profile?.displayName || profile?.nickname || ((user as any)?.email ? String((user as any).email).split("@")[0] : ""));
    setCountry(profile?.country || "");
  }, [profile?.displayName, profile?.nickname, profile?.country, (user as any)?.email]);


  React.useEffect(() => {
    if (typeof window === "undefined" || !isSignedIn || !(user as any)?.id) {
      setPreviousLoginAt(null);
      return;
    }

    const uid = String((user as any).id);
    const key = `dc_account_login_history_v1:${uid}`;
    const todayStart = startOfLocalDayMs();
    let history: number[] = [];

    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        history = parsed.map(Number).filter((value) => Number.isFinite(value) && value > 0);
      }
    } catch {}

    const authLast = Date.parse(String((user as any)?.last_sign_in_at || ""));
    if (Number.isFinite(authLast) && authLast > 0) history.push(authLast);

    const previous = history.filter((value) => value < todayStart).sort((a, b) => b - a)[0] || null;
    setPreviousLoginAt(previous);

    const now = Date.now();
    const alreadyRecordedToday = history.some((value) => value >= todayStart);
    if (!alreadyRecordedToday) history.push(now);

    const unique = Array.from(new Set(history.map((value) => Math.round(value)))).sort((a, b) => b - a).slice(0, 32);
    try {
      window.localStorage.setItem(key, JSON.stringify(unique));
    } catch {}
  }, [isSignedIn, (user as any)?.id, (user as any)?.last_sign_in_at]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_ACCOUNT_PREFS);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AccountPrefs>;
      setPrefs({ ...DEFAULT_PREFS, ...parsed });
    } catch {}
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_ACCOUNT_PREFS, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  async function handleSaveProfile() {
    if (status !== "signed_in") return;
    setSavingProfile(true);
    setMessage(null);
    setError(null);

    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        country: country.trim() || undefined,
      });
      setMessage(t("settings.account.save.ok", "Informations de compte mises à jour."));
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn("[settings] updateProfile error", e);
      setError(e?.message || t("settings.account.save.error", "Impossible de mettre à jour le compte pour le moment."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogoutV8() {
    setMessage(null);
    setError(null);
    try {
      await logout();
      forceAuthRoute("#/account/start", false);
    } catch (e: any) {
      setError("Erreur déconnexion : " + (e?.message ?? e));
    }
  }

  async function handleDeleteAccountV8() {
    const ok = window.confirm(
      "⚠️ Cette action est définitive.\n\n" +
        "Le compte sera supprimé de la base NAS, puis les données locales de cet appareil seront effacées.\n\n" +
        "Tu seras redirigé vers la création de compte. Continuer ?"
    );
    if (!ok) return;

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      await deleteAccount();
      await hardClearLocalAccountAndAppDataForDeletedAccount();
      forceAuthRoute("#/auth/signup", true);
    } catch (e: any) {
      setError("Erreur suppression compte : " + (e?.message ?? e));
      setDeleting(false);
    }
  }

  const sectionBox: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    padding: 16,
    marginBottom: 16,
  };

  const accountStatusHint = presenceLabel;

  function openAccountLogin() {
    if (typeof go === "function") {
      go("account_start" as any);
      return;
    }
    if (typeof window !== "undefined") forceAuthRoute("#/auth/login", false);
  }

  function openMyProfile() {
    if (typeof go === "function") {
      go("profiles" as any, {
        view: "me",
        autoCreate: true,
        returnTo: {
          tab: "settings",
          params: { settingsTab: "account", accountPage: "account_menu" },
        },
      });
      return;
    }
    if (typeof window !== "undefined") window.location.hash = "#/profiles?view=me";
  }

  const softCard: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.028))",
    padding: 14,
    boxShadow: `0 10px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)`,
  };

  return (
    <div>
      {/* MENU COMPTE */}
      {page === "account_menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <section style={{ ...sectionBox, background: "transparent", border: "none", padding: 0, boxShadow: "none" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...softCard, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) auto", gap: 13, alignItems: "center" }}>
                  <div style={{ position: "relative", width: 72, height: 72 }}>
                    <ProfileAvatar
                      profile={activeLocalProfile || { id: String((store as any)?.activeProfileId || (user as any)?.id || "account"), name: displayName || emailLabel }}
                      size={72}
                      showStars={false}
                      showDartOverlay={false}
                      ringColor={presenceColor}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: 2,
                        bottom: 3,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: presenceColor,
                        border: "3px solid #080b15",
                        boxShadow: `0 0 10px ${presenceColor}`,
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {L("Statut du compte", "Account status", "Estado de la cuenta")}
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7, color: presenceColor, fontSize: 18, fontWeight: 950 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: presenceColor, boxShadow: `0 0 9px ${presenceColor}` }} />
                      {accountStatusHint}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 10.5, color: theme.textSoft, lineHeight: 1.35 }}>
                      {presenceState === "online"
                        ? L("Compte authentifié et présence active.", "Account authenticated and presence active.", "Cuenta autenticada y presencia activa.")
                        : presenceState === "away"
                          ? L("Compte authentifié, statut de présence absent.", "Account authenticated, presence set to away.", "Cuenta autenticada, presencia marcada como ausente.")
                          : L("Compte actuellement déconnecté.", "Account currently disconnected.", "Cuenta actualmente desconectada.")}
                    </div>
                  </div>

                  {status === "signed_in" ? (
                    <button
                      type="button"
                      onClick={handleLogoutV8}
                      aria-label={L("Se déconnecter", "Sign out", "Cerrar sesión")}
                      title={L("Se déconnecter", "Sign out", "Cerrar sesión")}
                      style={{
                        width: 42,
                        height: 42,
                        border: "none",
                        background: "transparent",
                        color: "#ff5c67",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        padding: 0,
                        filter: "drop-shadow(0 0 7px rgba(255,92,103,.55))",
                      }}
                    >
                      <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 5H5v14h5" />
                        <path d="M14 8l4 4-4 4" />
                        <path d="M18 12H9" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openAccountLogin}
                      aria-label={L("Se connecter", "Sign in", "Iniciar sesión")}
                      title={L("Se connecter", "Sign in", "Iniciar sesión")}
                      style={{
                        width: 42,
                        height: 42,
                        border: "none",
                        background: "transparent",
                        color: theme.primary,
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        padding: 0,
                        filter: `drop-shadow(0 0 7px ${theme.primary}66)`,
                      }}
                    >
                      <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 5h5v14h-5" />
                        <path d="M10 8l-4 4 4 4" />
                        <path d="M6 12h9" />
                      </svg>
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gap: 7 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 9, alignItems: "center", minHeight: 42, padding: "8px 10px", borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)" }}>
                    <div style={{ color: theme.primary, display: "grid", placeItems: "center" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m4 7 8 6 8-6" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, color: theme.textSoft, textTransform: "uppercase", fontWeight: 900, letterSpacing: .65 }}>E-mail</div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: theme.text, overflowWrap: "anywhere" }}>{emailLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 9, alignItems: "center", minHeight: 42, padding: "8px 10px", borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)" }}>
                    <div style={{ color: theme.primary, display: "grid", placeItems: "center" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="8" cy="8" r="3" />
                        <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
                        <path d="M15 8h6" />
                        <path d="M18 5v6" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, color: theme.textSoft, textTransform: "uppercase", fontWeight: 900, letterSpacing: .65 }}>
                        {L("Identifiant compte", "Account ID", "ID de cuenta")}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: theme.text, overflowWrap: "anywhere" }}>{userIdLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 9, alignItems: "center", minHeight: 42, padding: "8px 10px", borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)" }}>
                    <div style={{ color: theme.primary, display: "grid", placeItems: "center" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v5l3 2" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, color: theme.textSoft, textTransform: "uppercase", fontWeight: 900, letterSpacing: .65 }}>
                        {L("Dernière connexion avant aujourd’hui", "Last login before today", "Última conexión antes de hoy")}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: theme.text, overflowWrap: "anywhere" }}>{formatPreviousLogin(previousLoginAt, lang)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <SettingsMenuCard
                title={L("Profil joueur", "Player profile", "Perfil del jugador")}
                subtitle={L("Le surnom, l’avatar et les informations joueur se modifient depuis Mon profil.", "Nickname, avatar and player information are edited from My Profile.", "El apodo, el avatar y la información del jugador se editan desde Mi perfil.")}
                theme={theme}
                onClick={openMyProfile}
              />
            </div>
          </section>

          <SettingsMenuCard
            title={L("Stockage & abonnements", "Storage & subscriptions", "Almacenamiento y suscripciones")}
            subtitle={`${L("Destination actuelle", "Current destination", "Destino actual")} : ${storagePrefs.selectedDestination === "cloud_r2" ? "Cloud R2" : storagePrefs.selectedDestination === "founder_nas" ? L("NAS fondateur", "Founder NAS", "NAS del fundador") : L("local / appareil", "local / device", "local / dispositivo")}. ${L("Offre cloud", "Cloud plan", "Plan cloud")} : ${getPublicStoragePlans().find((p) => p.id === storagePrefs.selectedCloudPlan)?.shortLabel || L("R2 verrouillé", "R2 locked", "R2 bloqueado")}.`}
            theme={theme}
            onClick={() => setPage("account_storage")}
            rightHint={storagePrefs.selectedDestination === "cloud_r2" ? "☁" : "↧"}
          />

          <SettingsMenuCard
            title={t("settings.account.menu.notifications", "Notifications")}
            subtitle={L("Options locales uniquement. À garder simple tant que les notifications réelles ne sont pas branchées.", "Local options only. Keep this simple until real notifications are connected.", "Solo opciones locales. Mantenerlo simple hasta que las notificaciones reales estén conectadas.")}
            theme={theme}
            onClick={() => setPage("account_notifications")}
          />
          <SettingsMenuCard
            title={t("settings.account.menu.danger", "Reset")}
            subtitle={L("Suppression du compte ou reset des données/statistiques locales.", "Delete the account or reset local data/statistics.", "Eliminar la cuenta o restablecer datos/estadísticas locales.")}
            theme={theme}
            onClick={() => setPage("account_danger")}
            rightHint="!"
          />
        </div>
      )}

      {/* STOCKAGE / ABONNEMENTS */}
      {page === "account_storage" && (
        <section style={sectionBox}>
          <p style={{ margin: 0, marginBottom: 12, fontSize: 11.5, color: theme.textSoft, lineHeight: 1.45 }}>
            Chaque compte choisit sa destination : mémoire locale gratuite, fichier placé sur ordinateur/HDD/USB/NAS monté,
            cloud personnel synchronisé, Cloudflare R2 PREMIUM, ou NAS fondateur. Supabase reste limité à l’authentification et aux données légères du profil ;
            les parties, historiques, statistiques, sauvegardes et médias ne sont jamais enregistrés dans Supabase.
          </p>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Stockage local appareil
            </div>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Utilisé</div>
                <div style={{ fontWeight: 950, color: "#fff" }}>{formatStorageBytes(storageEstimate.usage)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Quota estimé</div>
                <div style={{ fontWeight: 950, color: "#fff" }}>{formatStorageBytes(storageEstimate.quota)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: theme.textSoft }}>Libre</div>
                <div style={{ fontWeight: 950, color: theme.primary }}>{formatStorageBytes(storageEstimate.free)}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              OPFS : {storageCapabilities.opfs ? "OK" : "non dispo"} · Persistance : {storageCapabilities.persistentStorage ? "OK" : "non dispo"} · Export fichier : {storageCapabilities.filePicker ? "sélecteur avancé" : "fallback téléchargement"}
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Redondance et connexion de secours
            </div>
            <div style={{ marginTop: 7, display: "grid", gap: 8 }}>
              <div style={{ borderRadius: 12, border: "1px solid rgba(98,210,111,0.35)", background: "rgba(98,210,111,0.07)", padding: 10 }}>
                <div style={{ fontWeight: 950, color: "#9cffaa" }}>Copie locale de sécurité : ACTIVE</div>
                <div style={{ marginTop: 3, fontSize: 10.8, color: theme.textSoft, lineHeight: 1.35 }}>
                  Les données restent d'abord dans IndexedDB sur cet appareil, même quand une destination distante est choisie.
                </div>
              </div>


              <div style={{ borderRadius: 12, border: `1px solid ${supabaseFailoverState?.status === "ready" ? "rgba(98,210,111,0.45)" : "rgba(255,204,102,0.4)"}`, background: "rgba(255,255,255,0.03)", padding: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b>Connexion admin Supabase</b>
                  <span style={{ marginLeft: "auto", color: supabaseFailoverState?.status === "ready" ? "#9cffaa" : "#ffdd88", fontSize: 10.5, fontWeight: 950 }}>
                    {supabaseFailoverState?.status === "ready" ? "PRÊTE" : supabaseFailoverState?.status === "pending_confirmation" ? "EMAIL À CONFIRMER" : supabaseFailoverState?.status === "error" ? "À VÉRIFIER" : "CRÉÉE AU PROCHAIN LOGIN NAS"}
                  </span>
                </div>
                <div style={{ marginTop: 3, fontSize: 10.8, color: theme.textSoft, lineHeight: 1.35 }}>
                  {supabaseFailoverState?.message || "La copie d’authentification est créée automatiquement après une connexion NAS réussie. Aucune partie, statistique ou sauvegarde n’est envoyée dans Supabase."}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Quota cloud du compte
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: theme.primary }}>
                  {!isSignedIn
                    ? "Connecte-toi pour synchroniser un quota cloud"
                    : cloudUsageLoading
                      ? "Chargement…"
                      : cloudUsage
                        ? `${formatStorageBytes(cloudUsage.usedBytes)} / ${formatStorageBytes(cloudUsage.quotaBytes)}`
                        : "Non initialisé"}
                </div>
              </div>
              {isSignedIn && (
                <button
                  type="button"
                  onClick={() => void refreshCloudUsage()}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(255,255,255,0.055)",
                    color: theme.text,
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Actualiser
                </button>
              )}
            </div>
            {cloudUsage && (
              <>
                <div style={{ marginTop: 8, height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.borderSoft}` }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, cloudUsage.percentUsed))}%`, height: "100%", background: theme.primary }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
                  Plan actif : <b>{String(cloudUsage.preference?.plan_id || "r2_locked")}</b> · Restant : <b>{formatStorageBytes(cloudUsage.remainingBytes)}</b>
                  {cloudUsage.requiresPayment && (
                    <span style={{ color: "#ffcc66" }}> · paiement requis pour activer {String(cloudUsage.desiredPlanId || "l'offre choisie")}</span>
                  )}
                </div>
              </>
            )}
            {cloudUsageError && <div style={{ marginTop: 6, fontSize: 11, color: "#ff6b6b", lineHeight: 1.35 }}>{cloudUsageError}</div>}
            <div style={{ marginTop: 6, fontSize: 10.5, color: theme.textSoft, lineHeight: 1.35 }}>
              Sécurité : sélectionner une offre payante ne donne pas le quota tant que Stripe n'a pas confirmé l'abonnement. Sans abonnement, les nouvelles écritures R2 sont totalement bloquées (0 octet). Les sauvegardes locales / fichier / USB / SD / cloud personnel restent gratuites.
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Cloudflare R2
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: cloudStorageStatus?.configured ? "#62d26f" : "#ffcc66" }}>
                  {cloudStorageStatus?.configured ? "Configuré" : "Pas encore configuré"}
                </div>
              </div>
              <button
                type="button"
                disabled={cloudStorageTestLoading || !isSignedIn}
                onClick={() => void runCloudStorageSmokeTest()}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}88`,
                  background: cloudStorageTestLoading ? "rgba(255,255,255,0.08)" : `${theme.primary}22`,
                  color: theme.primary,
                  padding: "8px 11px",
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: cloudStorageTestLoading || !isSignedIn ? "not-allowed" : "pointer",
                  opacity: cloudStorageTestLoading || !isSignedIn ? 0.65 : 1,
                }}
              >
                {cloudStorageTestLoading ? "Vérification…" : "Vérifier R2 sans écrire"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              {cloudStorageStatus?.message || "Diagnostic lecture seule de la Pages Function R2. Il ne crée aucun objet et ne consomme donc pas de stockage supplémentaire."}
              {cloudStorageStatus?.bucket ? ` Bucket : ${cloudStorageStatus.bucket}.` : ""}
            </div>
            {cloudStorageTestResult && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  border: `1px solid ${
                    cloudStorageTestResult.status === "ok"
                      ? "rgba(98,210,111,0.55)"
                      : cloudStorageTestResult.status === "error"
                        ? "rgba(255,107,107,0.65)"
                        : theme.borderSoft
                  }`,
                  background:
                    cloudStorageTestResult.status === "ok"
                      ? "rgba(98,210,111,0.10)"
                      : cloudStorageTestResult.status === "error"
                        ? "rgba(255,107,107,0.10)"
                        : "rgba(255,255,255,0.055)",
                  padding: 10,
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: cloudStorageTestResult.status === "error" ? "#ff8c8c" : theme.text,
                }}
              >
                <div style={{ fontWeight: 950, color: cloudStorageTestResult.status === "ok" ? "#62d26f" : cloudStorageTestResult.status === "error" ? "#ff8c8c" : theme.primary }}>
                  {cloudStorageTestResult.title}
                </div>
                {cloudStorageTestResult.detail && (
                  <div style={{ marginTop: 4, color: theme.textSoft }}>{cloudStorageTestResult.detail}</div>
                )}
                {cloudStorageTestResult.objectKey && (
                  <div style={{ marginTop: 4, color: theme.textSoft, wordBreak: "break-all" }}>
                    Objet test : {cloudStorageTestResult.objectKey}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Sauvegardes Cloud R2
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: theme.primary }}>
                  1 courante + 1 précédente
                </div>
                <div style={{ marginTop: 5, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
                  La page Sauvegarde est désormais l’unique point de création/restauration R2. Après chaque nouvelle sauvegarde, toute génération plus ancienne que la précédente est supprimée physiquement du bucket.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const saved = saveStoragePrefs({ selectedDestination: "cloud_r2" });
                  setStoragePrefs(saved);
                  go?.("storage_vault");
                }}
                style={{
                  marginLeft: "auto", borderRadius: 999, border: `1px solid ${theme.primary}88`,
                  background: `${theme.primary}20`, color: theme.primary, padding: "9px 12px",
                  fontSize: 11, fontWeight: 950, cursor: "pointer",
                }}
              >
                Ouvrir Sauvegarde
              </button>
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Supabase minimal
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: supabaseAccountStatus?.configured ? "#62d26f" : "#ffcc66" }}>
                  {supabaseAccountStatus?.configured ? "Configuré" : "Pas encore configuré"}
                </div>
              </div>
              <button
                type="button"
                disabled={supabaseStatusLoading || !isSignedIn}
                onClick={() => void refreshSupabaseStatus(true)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}88`,
                  background: supabaseStatusLoading ? "rgba(255,255,255,0.08)" : `${theme.primary}22`,
                  color: theme.primary,
                  padding: "8px 11px",
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: supabaseStatusLoading || !isSignedIn ? "not-allowed" : "pointer",
                  opacity: supabaseStatusLoading || !isSignedIn ? 0.65 : 1,
                }}
              >
                {supabaseStatusLoading ? "Test…" : "Tester Supabase"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textSoft, lineHeight: 1.4 }}>
              {supabaseAccountStatus?.message || "Supabase sert uniquement à l’authentification minimale et à l’index léger. Les données lourdes restent prévues pour Cloudflare R2."}
              {supabaseAccountStatus?.projectHost ? ` Projet : ${supabaseAccountStatus.projectHost}.` : ""}
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
              {[
                ["URL", supabaseAccountStatus?.projectUrlConfigured],
                ["Clé publique", supabaseAccountStatus?.anonKeyConfigured],
                ["Clé serveur", supabaseAccountStatus?.serviceRoleKeyConfigured],
              ].map(([label, ok]) => (
                <div
                  key={String(label)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${ok ? "rgba(98,210,111,0.45)" : "rgba(255,204,102,0.45)"}`,
                    background: ok ? "rgba(98,210,111,0.08)" : "rgba(255,204,102,0.08)",
                    padding: "7px 8px",
                    fontSize: 10.5,
                    fontWeight: 900,
                    color: ok ? "#9cffaa" : "#ffdd88",
                  }}
                >
                  {String(label)} : {ok ? "OK" : "à remplir"}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
              {(supabaseTablesStatus?.tables || [
                { table: "user_public_index", ok: false },
                { table: "cloud_object_index", ok: false },
              ]).map((row) => {
                const ok = !!row.ok;
                return (
                  <div
                    key={String(row.table)}
                    title={row.message || ""}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${ok ? "rgba(98,210,111,0.45)" : "rgba(255,204,102,0.45)"}`,
                      background: ok ? "rgba(98,210,111,0.08)" : "rgba(255,204,102,0.08)",
                      padding: "7px 8px",
                      fontSize: 10.5,
                      fontWeight: 900,
                      color: ok ? "#9cffaa" : "#ffdd88",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {String(row.table)} : {ok ? "OK" : "à tester"}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
              <div
                title={supabaseBridgeStatus?.message || "Les comptes publics Supabase utilisent directement la Pages Function pour les droits PREMIUM/R2, sans dépendre du NAS."}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${supabaseBridgeStatus?.linked ? "rgba(98,210,111,0.45)" : "rgba(0,245,255,0.35)"}`,
                  background: supabaseBridgeStatus?.linked ? "rgba(98,210,111,0.08)" : "rgba(0,245,255,0.06)",
                  padding: "7px 8px",
                  fontSize: 10.5,
                  fontWeight: 900,
                  color: supabaseBridgeStatus?.linked ? "#9cffaa" : theme.primary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Bridge Supabase / stockage : {supabaseBridgeStatus?.linked ? "lié" : "prêt"}
              </div>
            </div>
            {supabaseStatusResult && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  border: `1px solid ${
                    supabaseStatusResult.status === "ok"
                      ? "rgba(98,210,111,0.55)"
                      : supabaseStatusResult.status === "error"
                        ? "rgba(255,107,107,0.65)"
                        : theme.borderSoft
                  }`,
                  background:
                    supabaseStatusResult.status === "ok"
                      ? "rgba(98,210,111,0.10)"
                      : supabaseStatusResult.status === "error"
                        ? "rgba(255,107,107,0.10)"
                        : "rgba(255,255,255,0.055)",
                  padding: 10,
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: supabaseStatusResult.status === "error" ? "#ff8c8c" : theme.text,
                }}
              >
                <div style={{ fontWeight: 950, color: supabaseStatusResult.status === "ok" ? "#62d26f" : supabaseStatusResult.status === "error" ? "#ff8c8c" : theme.primary }}>
                  {supabaseStatusResult.title}
                </div>
                {supabaseStatusResult.detail && (
                  <div style={{ marginTop: 4, color: theme.textSoft }}>{supabaseStatusResult.detail}</div>
                )}
              </div>
            )}
          </div>


          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: theme.primary, marginBottom: 8 }}>
              Où stocker les données ?
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {getPublicStorageDestinations().map((dest) => {
                const active = storagePrefs.selectedDestination === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() =>
                      persistStoragePrefs(
                        {
                          selectedDestination: dest.id as StorageDestinationId,
                          preferExternalStorage: dest.id === "external_sd_manual" || dest.id === "device_file",
                        },
                        dest.id === "cloud_r2"
                          ? "Cloud R2 sélectionné. Les sauvegardes passent directement par Cloudflare Pages/R2 ; le NAS reste une destination séparée."
                          : "Destination locale enregistrée."
                      )
                    }
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      padding: 12,
                      border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      background: active ? `${theme.primary}16` : "rgba(255,255,255,0.035)",
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 950, color: active ? theme.primary : "#fff" }}>{dest.label}</span>
                      {active && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: theme.primary }}>ACTIF</span>}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>{dest.description}</div>
                    {dest.warning && <div style={{ marginTop: 5, fontSize: 10.5, color: "#ffcc66", lineHeight: 1.35 }}>{dest.warning}</div>}
                  </button>
                );
              })}

              {(privateNasCapability?.authorized === true || storagePrefs.selectedDestination === "founder_nas") && (
                <button
                  type="button"
                  disabled={!isSignedIn}
                  onClick={() => persistStoragePrefs(
                    {
                      selectedDestination: "founder_nas",
                      keepLocalSafetyCopy: true,
                    },
                    "NAS fondateur sélectionné pour les sauvegardes privées. L'ONLINE public reste sur Supabase/Cloudflare."
                  )}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    padding: 12,
                    border: storagePrefs.selectedDestination === "founder_nas" ? `1px solid ${theme.primary}` : `1px dashed ${theme.primary}77`,
                    background: storagePrefs.selectedDestination === "founder_nas" ? `${theme.primary}16` : "rgba(255,255,255,0.025)",
                    color: theme.text,
                    cursor: isSignedIn ? "pointer" : "not-allowed",
                    opacity: isSignedIn ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ color: theme.primary }}>NAS fondateur — sauvegardes privées</b>
                    {storagePrefs.selectedDestination === "founder_nas" && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 950, color: "#9cffaa" }}>ACTIF</span>}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                    Réservé à ton compte fondateur : le NAS peut rester la destination privée des sauvegardes, avec copie locale de sécurité. ONLINE, amis, présence, joueurs à proximité et salons restent indépendants sur Supabase/Cloudflare.
                  </div>
                </button>
              )}
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Fichier externe — ordinateur, HDD, USB ou NAS monté
                </div>
                <div style={{ marginTop: 4, fontWeight: 950, color: externalBackupStatus.configured ? "#9cffaa" : theme.primary }}>
                  {externalBackupStatus.configured ? externalBackupStatus.fileName || "Fichier configuré" : "Aucun fichier choisi"}
                </div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 950, color: externalBackupStatus.permission === "granted" ? "#9cffaa" : "#ffdd88" }}>
                {externalBackupStatus.permission === "granted" ? "ÉCRITURE AUTORISÉE" : externalBackupStatus.supported ? "AUTORISATION REQUISE" : "TÉLÉCHARGEMENT MANUEL"}
              </span>
            </div>
            <div style={{ marginTop: 7, fontSize: 10.8, color: theme.textSoft, lineHeight: 1.4 }}>
              Le navigateur écrit dans le fichier que tu choisis. Il peut se trouver sur le disque du PC, un HDD USB ou un partage NAS déjà monté comme lecteur dans le système.
              Une copie automatique est tentée après les modifications lorsque cette destination est active.
            </div>
            {externalBackupStatus.lastSavedAt && (
              <div style={{ marginTop: 6, fontSize: 10.5, color: "#9cffaa" }}>
                Dernière sauvegarde : {new Date(externalBackupStatus.lastSavedAt).toLocaleString("fr-FR")} · {formatStorageBytes(externalBackupStatus.lastBytes || 0)}
              </div>
            )}
            {externalBackupStatus.lastError && <div style={{ marginTop: 6, fontSize: 10.5, color: "#ff9b9b" }}>{externalBackupStatus.lastError}</div>}
            <div style={{ marginTop: 9, display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button type="button" disabled={!!externalBackupBusy} onClick={() => void runExternalBackupAction("choose")} style={{ borderRadius: 999, border: `1px solid ${theme.primary}88`, background: `${theme.primary}20`, color: theme.primary, padding: "8px 10px", fontSize: 10.8, fontWeight: 950, cursor: externalBackupBusy ? "wait" : "pointer" }}>
                {externalBackupBusy === "choose" ? "Ouverture…" : externalBackupStatus.configured ? "Changer de fichier" : "Choisir un fichier"}
              </button>
              <button type="button" disabled={!!externalBackupBusy || !externalBackupStatus.configured} onClick={() => void runExternalBackupAction("save")} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,0.055)", color: theme.text, padding: "8px 10px", fontSize: 10.8, fontWeight: 950, cursor: externalBackupBusy || !externalBackupStatus.configured ? "not-allowed" : "pointer", opacity: !externalBackupStatus.configured ? 0.55 : 1 }}>
                {externalBackupBusy === "save" ? "Sauvegarde…" : "Sauvegarder maintenant"}
              </button>
              <button type="button" disabled={!!externalBackupBusy} onClick={() => void runExternalBackupAction("download")} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,0.055)", color: theme.text, padding: "8px 10px", fontSize: 10.8, fontWeight: 950, cursor: externalBackupBusy ? "wait" : "pointer" }}>
                {externalBackupBusy === "download" ? "Export…" : "Télécharger une copie"}
              </button>
              {externalBackupStatus.configured && (
                <button type="button" disabled={!!externalBackupBusy} onClick={() => void runExternalBackupAction("forget")} style={{ borderRadius: 999, border: "1px solid rgba(255,107,107,0.4)", background: "rgba(255,107,107,0.07)", color: "#ff9b9b", padding: "8px 10px", fontSize: 10.8, fontWeight: 950, cursor: externalBackupBusy ? "wait" : "pointer" }}>
                  Oublier
                </button>
              )}
            </div>
          </div>

          <div style={{ ...softCard, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Stripe stockage
                </div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000, color: storageStripeStatus?.configured ? "#7CFF8A" : "#ffcc66" }}>
                  {storageStripeStatus?.configured ? "Configuré" : storageStripeStatus ? "À finaliser" : "Non testé"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshStorageStripeStatus(true)}
                disabled={storageStripeStatusLoading}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${theme.primary}88`,
                  background: "rgba(255,255,255,0.055)",
                  color: theme.primary,
                  padding: "10px 13px",
                  fontSize: 12,
                  fontWeight: 950,
                  cursor: storageStripeStatusLoading ? "wait" : "pointer",
                  opacity: storageStripeStatusLoading ? 0.65 : 1,
                }}
              >
                {storageStripeStatusLoading ? "Test Stripe…" : "Tester Stripe"}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 11.5, color: theme.textSoft, lineHeight: 1.4 }}>
              {storageStripeStatus?.message || "Stripe sert uniquement à activer les quotas payants. Les fichiers restent stockés dans Cloudflare R2."}
              <div style={{ marginTop: 5 }}>Après confirmation Stripe, le plan/quota est recopié sous forme d’un droit privé léger dans R2. La Pages Function applique ensuite ce quota directement, même lorsque le NAS est hors ligne.</div>
            </div>

            {storageStripeStatus && (
              <div style={{ marginTop: 8, display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${storageStripeStatus.secretKeyConfigured ? "#62d26f88" : "#ff8c8c88"}`, color: storageStripeStatus.secretKeyConfigured ? "#7CFF8A" : "#ffb3b3", fontSize: 10.5, fontWeight: 950 }}>
                  Clé Stripe : {storageStripeStatus.secretKeyConfigured ? `OK (${storageStripeStatus.mode || "mode ?"})` : "manquante"}
                </span>
                <span style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${storageStripeStatus.configured ? "#62d26f88" : "#ffcc6688"}`, color: storageStripeStatus.configured ? "#7CFF8A" : "#ffcc66", fontSize: 10.5, fontWeight: 950 }}>
                  Prix : {storageStripeStatus.configuredPriceCount || 0} / {storageStripeStatus.priceCount || 0}
                </span>
                <span style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${storageStripeStatus.webhookStorageConfigured ? "#62d26f88" : "#ffcc6688"}`, color: storageStripeStatus.webhookStorageConfigured ? "#7CFF8A" : "#ffcc66", fontSize: 10.5, fontWeight: 950 }}>
                  Webhook stockage : {storageStripeStatus.webhookStorageConfigured ? "OK" : "à créer"}
                </span>
              </div>
            )}

            {!!storageStripeStatus?.missingEnv?.length && (
              <div style={{ marginTop: 8, padding: 9, borderRadius: 12, border: "1px solid rgba(255,204,102,0.35)", background: "rgba(255,204,102,0.08)", color: "#ffe0a3", fontSize: 10.5, lineHeight: 1.35 }}>
                <b>Variables .env à remplir :</b><br />
                {storageStripeStatus.missingEnv.slice(0, 12).join(" · ")}
              </div>
            )}

            {storageStripeStatus && !storageStripeStatus.webhookStorageConfigured && (
              <div style={{ marginTop: 8, padding: 9, borderRadius: 12, border: "1px solid rgba(255,204,102,0.35)", background: "rgba(255,204,102,0.08)", color: "#ffe0a3", fontSize: 10.5, lineHeight: 1.35 }}>
                <b>Webhook stockage à créer :</b><br />
                crée le webhook Stripe vers <code>/api/storage/backups/billing/webhook</code> sur le domaine Cloudflare Pages, puis renseigne <code>STRIPE_WEBHOOK_SECRET_STORAGE</code> dans les secrets Pages.
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 950, color: theme.primary, marginBottom: 8 }}>
              Offres cloud publiques
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {getPublicStoragePlans().map((plan) => {
                const active = storagePrefs.selectedCloudPlan === plan.id;
                const activeOnServer = cloudUsage?.preference?.plan_id === plan.id;
                const pendingOnServer = cloudUsage?.desiredPlanId === plan.id;
                const monthly = formatStoragePrice(plan.priceMonthlyCents);
                const yearly = plan.priceYearlyCents ? formatStoragePrice(plan.priceYearlyCents) : null;
                const paid = plan.priceMonthlyCents > 0;
                const monthlyLoading = storageCheckoutLoading === `${plan.id}:monthly`;
                const yearlyLoading = storageCheckoutLoading === `${plan.id}:yearly`;
                return (
                  <div
                    key={plan.id}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      padding: 12,
                      border: active || activeOnServer ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      background: active || activeOnServer ? `${theme.primary}16` : "rgba(255,255,255,0.035)",
                      color: theme.text,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 950, color: active || activeOnServer ? theme.primary : "#fff" }}>{plan.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 950, color: theme.primary }}>{plan.shortLabel}</span>
                      {plan.badge && <span style={{ fontSize: 10, fontWeight: 950, border: `1px solid ${theme.primary}88`, borderRadius: 999, padding: "2px 7px", color: theme.primary }}>{plan.badge}</span>}
                      {activeOnServer && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: "#62d26f" }}>ACTIF</span>}
                      {!activeOnServer && pendingOnServer && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: "#ffcc66" }}>EN ATTENTE</span>}
                      {!activeOnServer && !pendingOnServer && active && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 950, color: theme.primary }}>CHOISI</span>}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 900 }}>
                      {plan.priceMonthlyCents === 0 ? "0 €" : `${monthly} / mois`}{yearly ? ` · ${yearly} / an` : ""}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>{plan.description}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {plan.features.slice(0, 4).map((f) => (
                        <span key={f} style={{ fontSize: 10.5, borderRadius: 999, padding: "3px 7px", background: "rgba(255,255,255,0.055)", color: theme.textSoft }}>
                          {f}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() =>
                          persistStoragePrefs(
                            {
                              selectedCloudPlan: plan.id as StoragePlanId,
                              selectedDestination: "cloud_r2",
                            },
                            `${plan.label} sélectionné (${plan.shortLabel}).`
                          )
                        }
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${theme.borderSoft}`,
                          background: active ? `${theme.primary}22` : "rgba(255,255,255,0.055)",
                          color: active ? theme.primary : theme.text,
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        Préparer cette offre
                      </button>

                      {paid && (
                        <>
                          <button
                            type="button"
                            disabled={!!storageCheckoutLoading}
                            onClick={() => void startStorageCheckout(plan.id as StoragePlanId, "monthly")}
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${theme.primary}88`,
                              background: `linear-gradient(180deg, ${theme.primary}, ${theme.primary}AA)`,
                              color: "#000",
                              padding: "8px 11px",
                              fontSize: 11,
                              fontWeight: 950,
                              cursor: storageCheckoutLoading ? "wait" : "pointer",
                              opacity: storageCheckoutLoading ? 0.7 : 1,
                            }}
                          >
                            {monthlyLoading ? "Ouverture Stripe…" : `Payer mensuel ${monthly}`}
                          </button>
                          {yearly && (
                            <button
                              type="button"
                              disabled={!!storageCheckoutLoading}
                              onClick={() => void startStorageCheckout(plan.id as StoragePlanId, "yearly")}
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${theme.primary}55`,
                                background: "rgba(255,255,255,0.075)",
                                color: theme.primary,
                                padding: "8px 11px",
                                fontSize: 11,
                                fontWeight: 950,
                                cursor: storageCheckoutLoading ? "wait" : "pointer",
                                opacity: storageCheckoutLoading ? 0.7 : 1,
                              }}
                            >
                              {yearlyLoading ? "Ouverture Stripe…" : `Payer annuel ${yearly}`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {message && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#62d26f", lineHeight: 1.35 }}>
              {message}
            </div>
          )}
        </section>
      )}

      {/* NOTIFICATIONS */}
      {page === "account_notifications" && (
        <section style={sectionBox}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            <ToggleRow
              label={t("settings.account.notifications.emailsNews", "Emails de nouveautés / promotions")}
              help={t(
                "settings.account.notifications.emailsNewsHelp",
                "Actualités majeures, nouvelles fonctionnalités, offres spéciales."
              )}
              checked={prefs.emailsNews}
              onChange={(v) => setPrefs((p) => ({ ...p, emailsNews: v }))}
            />
            <ToggleRow
              label={t("settings.account.notifications.emailsStats", "Emails de résumé de stats & conseils")}
              help={t(
                "settings.account.notifications.emailsStatsHelp",
                "Récapitulatif occasionnel de tes stats avec quelques tips."
              )}
              checked={prefs.emailsStats}
              onChange={(v) => setPrefs((p) => ({ ...p, emailsStats: v }))}
            />
            <ToggleRow
              label={t("settings.account.notifications.inAppNotifs", "Notifications dans l’app (sons / messages info)")}
              help={t(
                "settings.account.notifications.inAppNotifsHelp",
                "Contrôle les sons d’alerte et les petits messages d’infos dans l’application."
              )}
              checked={prefs.inAppNotifs}
              onChange={(v) => setPrefs((p) => ({ ...p, inAppNotifs: v }))}
            />
          </div>
        </section>
      )}

      {/* DANGER */}
      {page === "account_danger" && (
        <section style={sectionBox}>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: theme.primary }}>
                Reset données & statistiques
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                Supprime les historiques, matchs simulés et statistiques locales de cet appareil. Les profils, bots, dartsets, thème et compte sont conservés autant que possible.
              </p>
              <button
                type="button"
                onClick={clearGameDataAndStatsOnly}
                style={{
                  width: "100%",
                  padding: "12px 13px",
                  borderRadius: 12,
                  border: `1px solid ${theme.primary}66`,
                  background: "rgba(0,0,0,0.35)",
                  color: theme.primary,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Reset données & stats
              </button>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(255,255,255,0.035)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: theme.primary }}>
                Réinitialiser l’application
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.35 }}>
                Hard reset local complet de cet appareil : profils locaux, bots, dartsets, historique, stats et réglages. Le compte NAS n’est pas supprimé.
              </p>
              <button
                type="button"
                onClick={() => onFullReset?.()}
                style={{
                  width: "100%",
                  padding: "12px 13px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,120,120,0.55)",
                  background: "rgba(255,0,0,0.06)",
                  color: "#ffb3b3",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Réinitialiser application
              </button>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,0,0,0.35)",
                background: "rgba(255,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6, color: "#ff8a8a" }}>
                {t("settings.account.delete.title", "Supprimer mon compte définitivement")}
              </div>
              <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
                Supprime le compte cloud et ses données associées. Action définitive.
              </p>
              {error && (
                <div className="subtitle" style={{ color: "#ff6666", fontSize: 11, marginBottom: 8 }}>
                  {error}
                </div>
              )}
              <button
                disabled={loading}
                onClick={handleDeleteAccountV8}
                style={{
                  width: "100%",
                  padding: "12px 13px",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, #ff5c5c, #c92a2a)",
                  color: "#fff",
                  fontWeight: 900,
                  border: "none",
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                  boxShadow: "0 0 14px rgba(255,80,80,0.35)",
                }}
              >
                🗑️ {deleting ? "Suppression…" : "Supprimer mon compte"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


function CastViewerSettingsSection({ go }: { go?: (tab: any, params?: any) => void }) {
  const { theme } = useTheme() as any;
  const [castState, setCastState] = React.useState<any>(() => getGoogleCastState());
  const [appId, setAppId] = React.useState<string>(() => getGoogleCastAppId());
  const [viewer, setViewer] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [viewerDiag, setViewerDiag] = React.useState<any[]>(() => getViewerDiagLog());
  const [busy, setBusy] = React.useState<null | "cast" | "viewer" | "ping">(null);
  const [msg, setMsg] = React.useState<string>("Cast TV et Viewer tablette sont deux sorties séparées. Tu peux activer les deux sans conflit.");

  React.useEffect(() => {
    const refreshCast = () => {
      setCastState(getGoogleCastState());
      setAppId(getGoogleCastAppId());
    };
    refreshCast();
    return subscribeGoogleCastStatus(refreshCast);
  }, []);

  React.useEffect(() => subscribeViewerSessionChanged(() => setViewer(getActiveViewerSession())), []);

  React.useEffect(() => {
    const refresh = () => setViewerDiag(getViewerDiagLog());
    window.addEventListener("dc-viewer-diag", refresh as any);
    return () => window.removeEventListener("dc-viewer-diag", refresh as any);
  }, []);

  const box: React.CSSProperties = {
    borderRadius: 18,
    padding: 16,
    background: CARD_BG,
    border: `1px solid ${theme.borderSoft}`,
    boxShadow: `0 14px 34px rgba(0,0,0,.35), 0 0 14px ${theme.primary}18`,
  };

  const btn = (primary = false): React.CSSProperties => ({
    borderRadius: 14,
    padding: "10px 12px",
    border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
    background: primary ? `${theme.primary}22` : "rgba(255,255,255,0.04)",
    color: primary ? theme.primary : theme.text,
    fontWeight: 900,
    cursor: "pointer",
  });

  function saveCastAppId() {
    const next = String(appId || DEFAULT_GOOGLE_CAST_APP_ID).trim().toUpperCase();
    setGoogleCastAppId(next);
    setAppId(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setMsg(`Receiver Cast enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefaultCastAppId() {
    resetGoogleCastAppId();
    setAppId(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setMsg(`Receiver Cast par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function toggleCast() {
    setBusy("cast");
    try {
      if (castState?.isCasting) {
        await endGoogleCastSession();
        setMsg("Session Cast arrêtée.");
      } else {
        const res = await requestGoogleCastSession();
        if (res.ok) setMsg("Session Cast démarrée.");
        else setMsg(res.reason === "cancel" ? "Ouverture Cast annulée." : `Impossible d’ouvrir Cast : ${res.reason}`);
      }
    } finally {
      setCastState(getGoogleCastState());
      setBusy(null);
    }
  }

  async function pingCast() {
    setBusy("ping");
    try {
      const ok = await pingGoogleCastReceiver();
      setMsg(ok ? "PING envoyé au receiver Cast." : "PING impossible : aucune session Cast active ou erreur receiver.");
    } finally {
      setCastState(getGoogleCastState());
      setBusy(null);
    }
  }

  async function startViewer() {
    setBusy("viewer");
    setMsg("Création de la session viewer…");
    try {
      const res = await createViewerSession();
      const now = Date.now();
      const info: ViewerSessionInfo = {
        sessionId: res.sessionId,
        code: res.code || res.sessionId,
        joinUrl: res.joinUrl || viewerJoinUrl(res.sessionId),
        createdAt: now,
        expiresAt: res.expiresInSeconds ? now + res.expiresInSeconds * 1000 : null,
        enabled: true,
      };
      setActiveViewerSession(info);
      setViewer(info);
      try {
        await publishViewerSnapshot(info.sessionId, buildViewerWaitingSnapshot(info.sessionId));
      } catch {}
      setMsg("Session viewer active. Ouvre la page complète pour afficher le QR code.");
    } catch (e: any) {
      setMsg(`Erreur viewer : ${String(e?.message || e || "création impossible")}`);
    } finally {
      setBusy(null);
    }
  }

  async function copyViewerLink() {
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Lien viewer copié.");
    } catch {
      setMsg(url);
    }
  }

  function stopViewer() {
    clearActiveViewerSession();
    setViewer(null);
    setMsg("Session viewer arrêtée.");
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={box}>
        <h2 style={{ margin: "0 0 8px", color: theme.primary, fontSize: 18 }}>Sorties écran</h2>
        <p style={{ margin: 0, color: theme.textSoft, fontSize: 13, lineHeight: 1.45 }}>
          Le Cast envoie vers TV / Chromecast. Le Viewer tablette crée une session live séparée avec QR code. Les deux peuvent tourner en même temps.
        </p>
        <div style={{ marginTop: 12, color: msg.startsWith("Erreur") || msg.startsWith("Impossible") ? "#ffb4b4" : theme.text, fontSize: 13, fontWeight: 800 }}>
          {msg}
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>📺 Google Cast / TV</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>
              {castState?.isCasting ? `Actif${castState?.deviceName ? ` : ${castState.deviceName}` : ""}` : "Aucune session active"}
            </div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${castState?.isCasting ? theme.primary : theme.borderSoft}`, color: castState?.isCasting ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 1000 }}>
            {castState?.isCasting ? "ON" : "OFF"}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ color: theme.textSoft, fontSize: 12, fontWeight: 900 }}>Receiver Application ID</label>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value.toUpperCase())}
            placeholder="Ex: 3534BC6A"
            style={{
              borderRadius: 13,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.05)",
              color: theme.text,
              padding: "11px 12px",
              fontWeight: 900,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={saveCastAppId} style={btn(true)}>Enregistrer</button>
            <button type="button" onClick={restoreDefaultCastAppId} style={btn(false)}>App ID défaut</button>
            <button type="button" disabled={busy === "cast"} onClick={toggleCast} style={btn(true)}>{castState?.isCasting ? "Arrêter Cast" : "Lancer Cast"}</button>
            <button type="button" disabled={busy === "ping"} onClick={pingCast} style={btn(false)}>PING</button>
            <button type="button" onClick={() => go?.("cast_host")} style={btn(false)}>Page Cast complète</button>
          </div>
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>📱 Viewer tablette</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>
              {viewer?.sessionId ? `Session active : ${viewer.code || viewer.sessionId}` : "Aucune session active"}
            </div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${viewer?.sessionId ? theme.primary : theme.borderSoft}`, color: viewer?.sessionId ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 1000 }}>
            {viewer?.sessionId ? "ON" : "OFF"}
          </div>
        </div>

        {viewer?.sessionId && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div style={{ color: theme.primary, fontSize: 30, letterSpacing: 3, fontWeight: 1200 }}>{viewer.code || viewer.sessionId}</div>
            <div style={{ color: theme.textSoft, fontSize: 12, overflowWrap: "anywhere" }}>{viewer.joinUrl}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy === "viewer"} onClick={viewer?.sessionId ? copyViewerLink : startViewer} style={btn(true)}>
            {viewer?.sessionId ? "Copier lien" : busy === "viewer" ? "Création…" : "Créer viewer"}
          </button>
          {viewer?.sessionId && <button type="button" onClick={stopViewer} style={btn(false)}>Arrêter viewer</button>}
          <button type="button" onClick={() => go?.("viewer_host")} style={btn(false)}>Page Viewer / QR code</button>
          <button type="button" onClick={() => go?.("viewer_join")} style={btn(false)}>Rejoindre</button>
        </div>
      </section>

      <section style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.primary, fontSize: 16 }}>Diagnostic viewer</h3>
            <div style={{ color: theme.textSoft, fontSize: 12, marginTop: 3 }}>Derniers envois live vers tablette.</div>
          </div>
          <button type="button" onClick={() => { clearViewerDiagLog(); setViewerDiag([]); }} style={btn(false)}>Vider</button>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 6, maxHeight: 130, overflow: "auto" }}>
          {viewerDiag.length ? viewerDiag.slice(-6).reverse().map((d, i) => (
            <div key={i} style={{ fontSize: 11, color: theme.textSoft, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 5 }}>
              {new Date(d.at || Date.now()).toLocaleTimeString()} · {d.entry} · {d.extra ? JSON.stringify(d.extra).slice(0, 110) : ""}
            </div>
          )) : <div style={{ color: theme.textSoft, fontSize: 12 }}>Aucun envoi pour le moment.</div>}
        </div>
      </section>
    </div>
  );
}

type SettingsLanguageSectionProps = {
  theme: any;
  lang: Lang;
  t: (key: string, fallback?: string) => string;
  L: (fr: string, en: string, es: string) => string;
  languageCarouselBrowseIndexRef: React.MutableRefObject<number | null>;
  applyLanguage: (nextLang: Lang) => void;
};

function SettingsLanguageSection({
  theme,
  lang,
  t,
  L,
  languageCarouselBrowseIndexRef,
  applyLanguage,
}: SettingsLanguageSectionProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [mapCenterRequest, setMapCenterRequest] = React.useState<{ index: number; nonce: number } | null>(null);
  const worldMapBase = React.useMemo(() => buildTerritoriesMap("WORLD"), []);
  const languageMeta = LANGUAGE_WORLD_META[lang] || LANGUAGE_WORLD_META.fr;
  const highlightedIds = React.useMemo(
    () => languageMeta.countries.map((code) => `WORLD-${String(code).toUpperCase()}`),
    [languageMeta],
  );
  const highlightedSet = React.useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const languageMap = React.useMemo(() => ({
    ...worldMapBase,
    territories: worldMapBase.territories.map((territory) => ({
      ...territory,
      ownerId: highlightedSet.has(String(territory.id)) ? "settings-language" : undefined,
    })),
  }), [worldMapBase, highlightedSet]);
  // Ordre volontairement stable : ne jamais trier sur les libellés traduits
  // asynchrones, sinon la liste change d'ordre pendant le scroll et le carrousel
  // se recale visuellement sur la langue active. Les noms natifs servent de clé
  // de tri fixe et les libellés affichés restent, eux, traduits normalement.
  const sortedLanguages = React.useMemo(() => {
    return [...LANG_CHOICES].sort((left, right) =>
      String(left.defaultLabel).localeCompare(String(right.defaultLabel), "en", { sensitivity: "base" })
    );
  }, []);
  const activeLabel = t(`lang.${lang}`, LANG_CHOICES.find((item) => item.id === lang)?.defaultLabel || String(lang).toUpperCase());
  const activeIndex = Math.max(0, sortedLanguages.findIndex((item) => item.id === lang));
  const carouselInitialIndex = languageCarouselBrowseIndexRef.current == null
    ? activeIndex
    : Math.max(0, Math.min(sortedLanguages.length - 1, languageCarouselBrowseIndexRef.current));

  const selectFromTerritory = (territoryId: string) => {
    const nextLang = languageForWorldTerritory(territoryId, lang);
    const nextIndex = sortedLanguages.findIndex((item) => item.id === nextLang);
    if (nextIndex >= 0) {
      languageCarouselBrowseIndexRef.current = nextIndex;
      setMapCenterRequest((previous) => ({ index: nextIndex, nonce: (previous?.nonce || 0) + 1 }));
    }
    applyLanguage(nextLang);
  };

  return (
    <section
      style={{
        background: CARD_BG,
        borderRadius: 18,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.borderSoft}`,
          background: "radial-gradient(circle at 50% 20%, rgba(255,255,255,.05), rgba(0,0,0,.18) 65%)",
          padding: 8,
          boxShadow: `inset 0 0 24px rgba(0,0,0,.36), 0 0 18px ${theme.primary}16`,
        }}
      >
        <div style={{ padding: "3px 5px 7px" }}>
          <div
            style={{
              fontSize: "clamp(8px,2.35vw,10px)",
              color: theme.textSoft,
              textTransform: "uppercase",
              fontWeight: 900,
              letterSpacing: ".65px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {L("CARTE LINGUISTIQUE MONDIALE", "WORLD LANGUAGE MAP", "MAPA LINGÜÍSTICO MUNDIAL")}
          </div>
          <div style={{ marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{LANG_FLAGS[lang] || "🌐"}</span>
              <div style={{ color: theme.primary, fontSize: "clamp(12px,3.5vw,15px)", fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeLabel}</div>
            </div>
            <div style={{ fontSize: 9.5, color: theme.textSoft, textAlign: "right", flexShrink: 0 }}>
              {highlightedIds.length} {L("zones", "areas", "zonas")}
            </div>
          </div>
        </div>

        <div style={{ height: 218, width: "100%", borderRadius: 13, overflow: "hidden", background: "rgba(0,0,0,.24)" }}>
          <TerritoriesMapView
            country="WORLD"
            map={languageMap}
            ownerColors={{ "settings-language": theme.primary }}
            activeColor={theme.primary}
            themeColor={theme.primary}
            interactive
            onSelectTerritory={selectFromTerritory}
            showViewportControls={false}
            showViewportHint={false}
            highlightTerritoryIds={highlightedIds}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div style={{ padding: "7px 6px 2px", color: theme.textSoft, fontSize: 9.5, lineHeight: 1.35, textAlign: "center" }}>
          {L("Touchez un pays : sa langue disponible est sélectionnée, sinon l’anglais est utilisé.", "Tap a country: an available language is selected, otherwise English is used.", "Toca un país: se selecciona un idioma disponible; si no, se usa inglés.")}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            minWidth: 150,
            borderRadius: 999,
            border: `1px solid ${theme.primary}88`,
            background: `${theme.primary}12`,
            color: theme.primary,
            padding: "8px 13px",
            fontSize: 11,
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: `0 0 12px ${theme.primary}22`,
          }}
        >
          {L("Choisir langue", "Choose language", "Elegir idioma")} ▾
        </button>
      </div>

      <div style={{ marginTop: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
          <div style={{ fontSize: 10, color: theme.textSoft, textTransform: "uppercase", fontWeight: 900, letterSpacing: .75 }}>{L("Sélection rapide", "Quick selection", "Selección rápida")}</div>
          <div style={{ fontSize: 9.5, color: theme.textSoft }}>{L("boucle · ordre alphabétique", "loop · alphabetical order", "bucle · orden alfabético")}</div>
        </div>

        <SettingsLoopCarousel
          items={sortedLanguages}
          theme={theme}
          itemWidth={126}
          gap={9}
          initialIndex={carouselInitialIndex}
          snapMode="proximity"
          recenterOnInitialIndexChange={false}
          explicitCenterRequest={mapCenterRequest}
          onActiveIndexChange={(index) => {
            languageCarouselBrowseIndexRef.current = index;
          }}
          ariaLabel={L("Carrousel des langues", "Language carousel", "Carrusel de idiomas")}
          renderItem={(opt: (typeof LANG_CHOICES)[number], index: number) => {
            const label = t(`lang.${opt.id}`, opt.defaultLabel);
            const active = opt.id === lang;
            const primaryCountry = LANGUAGE_WORLD_META[opt.id]?.primaryCountry || opt.short;
            return (
              <button
                type="button"
                onClick={() => {
                  languageCarouselBrowseIndexRef.current = index;
                  applyLanguage(opt.id);
                }}
                style={{
                  width: "100%",
                  height: 112,
                  borderRadius: 15,
                  border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
                  background: active ? `${theme.primary}12` : "rgba(255,255,255,.025)",
                  color: active ? theme.primary : theme.text,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: active ? `0 0 15px ${theme.primary}38` : "none",
                  padding: 7,
                }}
              >
                <CountryFlagShape countryCode={primaryCountry} accent={active ? theme.primary : "rgba(255,255,255,.55)"} width={84} height={58} />
                <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 900 }}>{label}</span>
              </button>
            );
          }}
        />
      </div>

      {pickerOpen ? (
        <div
          role="presentation"
          onClick={() => setPickerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5200,
            background: "rgba(0,0,0,.72)",
            backdropFilter: "blur(7px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={L("Choisir la langue", "Choose language", "Elegir idioma")}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(430px, 94vw)",
              maxHeight: "76vh",
              borderRadius: 20,
              border: `1px solid ${theme.primary}77`,
              background: "linear-gradient(180deg,rgba(8,12,28,.99),rgba(3,5,15,.99))",
              boxShadow: `0 0 26px ${theme.primary}28, 0 20px 54px rgba(0,0,0,.75)`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 14px", borderBottom: `1px solid ${theme.borderSoft}` }}>
              <div>
                <div style={{ color: theme.primary, fontSize: 15, fontWeight: 950, textTransform: "uppercase", letterSpacing: .7 }}>{L("Choisir langue", "Choose language", "Elegir idioma")}</div>
                <div style={{ marginTop: 2, fontSize: 10.5, color: theme.textSoft }}>{L("Toutes les langues disponibles", "All available languages", "Todos los idiomas disponibles")}</div>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label={L("Fermer", "Close", "Cerrar")} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", color: theme.text, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div className="dc-scroll-thin" style={{ overflowY: "auto", padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {sortedLanguages.map((opt, index) => (
                  <LanguageChoiceButton
                    key={opt.id}
                    id={opt.id}
                    label={t(`lang.${opt.id}`, opt.defaultLabel)}
                    active={opt.id === lang}
                    onClick={() => {
                      languageCarouselBrowseIndexRef.current = index;
                      applyLanguage(opt.id);
                      setPickerOpen(false);
                    }}
                    primary={theme.primary}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}


export function Settings({ go, params }: Props) {
  const { theme, themeId, setThemeId } = useTheme() as any;
  const { lang, setLang, t } = useLang();
  const storeBridge = useStore();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);

  // Réglages et Préférences du profil partagent la même langue active.
  // Le changement reste localement effectif même si la session cloud est momentanément indisponible.
  const applyLanguage = React.useCallback((nextLang: Lang) => {
    setLang(nextLang);

    try {
      const current: any = storeBridge.getStore?.() ?? storeBridge.store ?? null;
      const activeId = String(current?.activeProfileId || "").trim();
      if (activeId && Array.isArray(current?.profiles) && typeof storeBridge.update === "function") {
        storeBridge.update((state: any) => ({
          ...(state || {}),
          profiles: (Array.isArray(state?.profiles) ? state.profiles : []).map((profile: any) =>
            String(profile?.id || "") === activeId
              ? {
                  ...(profile || {}),
                  privateInfo: { ...((profile as any)?.privateInfo || {}), appLang: nextLang },
                  preferences: { ...((profile as any)?.preferences || {}), appLang: nextLang },
                }
              : profile
          ),
        }));
      }
    } catch (error) {
      console.warn("[Settings] sync appLang -> active profile failed", error);
    }

    void onlineApi.updateProfile({
      preferences: { appLang: nextLang },
      privateInfo: { appLang: nextLang },
    }).catch((error) => {
      console.warn("[Settings] remote appLang sync deferred", error);
    });
  }, [setLang, storeBridge]);

  // Même règle que pour la langue : le thème choisi dans Réglages devient
  // immédiatement la préférence du profil actif. L'ouverture de MON PROFIL
  // ne doit jamais pouvoir réinjecter un ancien thème.
  const applyThemePreference = React.useCallback((nextTheme: ThemeId) => {
    if (!canUseTheme(nextTheme)) return;
    setThemeId(nextTheme);

    try {
      const current: any = storeBridge.getStore?.() ?? storeBridge.store ?? null;
      const activeId = String(current?.activeProfileId || "").trim();
      if (activeId && Array.isArray(current?.profiles) && typeof storeBridge.update === "function") {
        storeBridge.update((state: any) => ({
          ...(state || {}),
          profiles: (Array.isArray(state?.profiles) ? state.profiles : []).map((profile: any) =>
            String(profile?.id || "") === activeId
              ? {
                  ...(profile || {}),
                  privateInfo: { ...((profile as any)?.privateInfo || {}), appTheme: nextTheme },
                  preferences: { ...((profile as any)?.preferences || {}), appTheme: nextTheme },
                }
              : profile
          ),
        }));
      }
    } catch (error) {
      console.warn("[Settings] sync appTheme -> active profile failed", error);
    }

    void onlineApi.updateProfile({
      preferences: { appTheme: nextTheme },
      privateInfo: { appTheme: nextTheme },
    }).catch((error) => {
      console.warn("[Settings] remote appTheme sync deferred", error);
    });
  }, [setThemeId, storeBridge]);

  const isBlueNightTheme = themeId === "blueNight";
  const PAGE_BG = theme.pageBackground || (isBlueNightTheme
    ? "radial-gradient(900px 520px at 50% -14%, rgba(34,230,255,0.14), transparent 62%), radial-gradient(680px 360px at 0% 28%, rgba(122,247,255,0.08), transparent 62%), #06111F"
    : LEGACY_PAGE_BG);
  const CARD_BG = theme.cardBackground || (isBlueNightTheme
    ? "linear-gradient(180deg, rgba(15,34,55,0.96), rgba(6,17,31,0.98))"
    : LEGACY_CARD_BG);

  const validSettingsTabs: SettingsTab[] = ["menu", "account", "advertising", "shop", "privacy", "theme", "lang", "audio", "general", "sport", "castViewer", "developer", "awena"];
  const validAccountPages: AccountPage[] = ["account_menu", "account_storage", "account_notifications", "account_danger"];
  const initialSettingsTab = validSettingsTabs.includes(String(params?.settingsTab || "") as SettingsTab)
    ? (String(params?.settingsTab) as SettingsTab)
    : "menu";
  const [tab, setTab] = React.useState<SettingsTab>(initialSettingsTab);
  // Conserve la position parcourue dans le carrousel LANGUES même si Settings se
  // rerend pendant le chargement des traductions. Sans cela, le sous-composant
  // LangSection est remonté et se recentre sur la langue déjà sélectionnée.
  const languageCarouselBrowseIndexRef = React.useRef<number | null>(null);
  const [shopInitialTab, setShopInitialTab] = React.useState<"premium" | "packs" | "billing">("premium");
  const [shopFocusPackId, setShopFocusPackId] = React.useState<string | null>(null);
  const [accountPage, setAccountPage] = React.useState<AccountPage>(() => {
    const requested = String(params?.accountPage || "") as AccountPage;
    if (validAccountPages.includes(requested)) return requested;
    if (typeof window === "undefined") return "account_menu";
    const hash = String(window.location.hash || "");
    return /[?&]account=storage(?:&|$)/.test(hash) ? "account_storage" : "account_menu";
  });
  const [devSub, setDevSub] = React.useState<DeveloperSub>("menu");
  const [developerVisible, setDeveloperVisible] = React.useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("dc_settings_developer_visible") === "1";
    } catch {
      return false;
    }
  });
  const settingsTitleTapRef = React.useRef(0);
  const [nasBusy, setNasBusy] = React.useState<null | "backup" | "restore">(null);
  const [nasStatus, setNasStatus] = React.useState<string>("");
  const [nasLastInfo, setNasLastInfo] = React.useState<any>(null);

  React.useEffect(() => {
    injectSettingsAnimationsOnce();
  }, []);


  React.useEffect(() => {
    const requestedTab = String(params?.settingsTab || "") as SettingsTab;
    if (validSettingsTabs.includes(requestedTab)) setTab(requestedTab);
    const requestedAccountPage = String(params?.accountPage || "") as AccountPage;
    if (validAccountPages.includes(requestedAccountPage)) setAccountPage(requestedAccountPage);
  }, [params?.settingsTab, params?.accountPage]);

  async function handleFullReset() {
    const ok = window.confirm(
      "⚠️ RÉINITIALISATION COMPLÈTE ⚠️\n\n" +
        "Cette action va effacer TOUTES les données locales de MULTISPORTS SCORING sur cet appareil :\n" +
        "- Profils locaux & BOTS\n" +
        "- Stats & historique de parties\n" +
        "- Réglages, thèmes, langue…\n\n" +
        "Action définitive. Continuer ?"
    );
    if (!ok) return;
    await fullHardReset();
  }

  function formatBytes(value: any): string {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "0 Ko";
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / 1024 / 1024).toFixed(2)} Mo`;
  }

  function formatMs(value: any): string {
    const n = Math.max(0, Number(value || 0));
    if (n < 1000) return `${Math.round(n)} ms`;
    return `${(n / 1000).toFixed(2)} s`;
  }

  function getNasReportLines(kind: "backup" | "restore", summary: any, res?: any): string[] {
    const media = summary?.media || res?.summary?.media || {};
    const before = summary?.before || {};
    const lines: string[] = [];
    lines.push(kind === "backup" ? "✅ Synchronisation NAS terminée" : "✅ Rechargement NAS terminé");
    lines.push(`Profils locaux : ${summary?.profiles ?? 0}`);
    lines.push(`Bots CPU : ${summary?.bots ?? 0}`);
    lines.push(`Dartsets : ${summary?.dartSets ?? 0}`);
    lines.push(`Historique : ${summary?.history ?? 0}`);
    if (kind === "backup") {
      const createdNow = Math.max(0, Number(summary?.profiles || 0) - Number(before?.totalProfiles || before?.profiles || 0));
      lines.push(`Nouveaux profils détectés : ${createdNow}`);
      lines.push(`Avatars uploadés : ${Number(media?.avatarsUploaded || 0)}`);
      lines.push(`Avatars déjà présents NAS : ${Number(media?.avatarsAlreadyPresent || 0)}`);
      lines.push(`Avatars déjà liés : ${Number(media?.avatarsAlreadyLinked || 0)}`);
      lines.push(`Avatars sans image : ${Number(media?.avatarsMissing || 0)}`);
      lines.push(`Médias dartsets uploadés : ${Number(media?.mediaUploaded || 0)}`);
      lines.push(`Médias dartsets déjà présents : ${Number(media?.mediaAlreadyPresent || 0)}`);
      lines.push(`Base64 supprimés : ${Number(summary?.base64FieldsRemoved ?? media?.base64FieldsRemoved ?? 0)}`);
      lines.push(`Base64 restants dans snapshot : ${Number(summary?.base64FieldsAfter ?? summary?.dataImageFields ?? 0)}`);
      lines.push(`Snapshot allégé : ${summary?.snapshotLightened ? "oui" : "à vérifier"}`);
      lines.push(`Taille payload envoyé : ${formatBytes(summary?.payloadBytes || summary?.storeBytes)}`);
      lines.push(`Durée : ${formatMs(summary?.durationMs || media?.durationMs)}`);
    } else {
      lines.push(`Images NAS résolues : ${Number(summary?.mediaUrls || 0)}`);
      lines.push(`Base64 présents après recharge : ${Number(summary?.dataImageFields || 0)}`);
      lines.push(`Taille store local : ${formatBytes(summary?.storeBytes)}`);
    }
    const updatedAt = res?.updatedAt || res?.updated_at || res?.createdAt || "";
    if (updatedAt) lines.push(`MAJ NAS : ${String(updatedAt)}`);
    return lines;
  }

  function formatNasReport(kind: "backup" | "restore", summary: any, res?: any): string {
    return getNasReportLines(kind, summary, res).join("\n");
  }

  const themeBackActionRef = React.useRef<(() => boolean) | null>(null);

  const readSavedThemeSectionState = () => {
    try {
      const raw = window.localStorage.getItem(THEME_SECTION_STATE_STORAGE_KEY);
      if (!raw) return {} as any;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : ({} as any);
    } catch {
      return {} as any;
    }
  };

  function ThemeSection() {
    const [selectedPackId, setSelectedPackId] = React.useState<ThemePackId | null>(() => readSavedThemeSectionState().selectedPackId ?? null);
    const [previewThemeId, setPreviewThemeId] = React.useState<ThemeId | null>(() => readSavedThemeSectionState().previewThemeId ?? null);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [packCarouselIndex, setPackCarouselIndex] = React.useState<number>(() => Number(readSavedThemeSectionState().packCarouselIndex ?? 0) || 0);
    const [selectedThemeIndex, setSelectedThemeIndex] = React.useState<number>(() => Number(readSavedThemeSectionState().selectedThemeIndex ?? 0) || 0);
    const [pickerPackId, setPickerPackId] = React.useState<ThemePackId | null>(() => readSavedThemeSectionState().pickerPackId ?? null);
    const [entitlementRevision, setEntitlementRevision] = React.useState(0);

    React.useEffect(() => subscribeVerifiedEntitlements(() => setEntitlementRevision((value) => value + 1)), []);

    const premiumThemesUnlocked = React.useMemo(() => arePremiumThemesUnlocked(), [entitlementRevision]);
    const selectedPack = selectedPackId ? THEME_PACKS.find((pack) => pack.id === selectedPackId) || null : null;
    const pickerPack = pickerPackId ? THEME_PACKS.find((pack) => pack.id === pickerPackId) || null : null;

    React.useEffect(() => {
      if (selectedPackId && !selectedPack) setSelectedPackId(null);
    }, [selectedPackId, selectedPack]);

    React.useEffect(() => {
      try {
        window.localStorage.setItem(
          THEME_SECTION_STATE_STORAGE_KEY,
          JSON.stringify({
            selectedPackId,
            previewThemeId,
            packCarouselIndex,
            selectedThemeIndex,
            pickerPackId: pickerPackId || selectedPackId || null,
          })
        );
      } catch {}
    }, [selectedPackId, previewThemeId, packCarouselIndex, selectedThemeIndex, pickerPackId]);

    const themeLocked = (id: ThemeId | null | undefined) => Boolean(id && isPremiumTheme(id) && !premiumThemesUnlocked);
    const packLocked = (pack: ThemePack) => Boolean(pack.premium && !premiumThemesUnlocked);

    const openThemeShop = () => {
      setShopInitialTab("packs");
      setShopFocusPackId(PREMIUM_THEMES_STORE_PACK_ID);
      setTab("shop");
    };

    const openPack = (packId: ThemePackId, themeId?: ThemeId | null) => {
      const packIndex = Math.max(0, THEME_PACKS.findIndex((entry) => entry.id === packId));
      const pack = THEME_PACKS[packIndex] || null;
      const resolvedThemeId = themeId && pack?.ids.includes(themeId) ? themeId : (previewThemeId && pack?.ids.includes(previewThemeId) ? previewThemeId : (pack?.ids[0] || null));
      setPackCarouselIndex(packIndex);
      setSelectedPackId(packId);
      setPreviewThemeId(resolvedThemeId);
      setSelectedThemeIndex(Math.max(0, pack?.ids.indexOf(resolvedThemeId as ThemeId) ?? 0));
    };

    const applyTheme = (id: ThemeId) => {
      setPreviewThemeId(id);
      if (themeLocked(id)) return;
      applyThemePreference(id);
    };

    React.useEffect(() => {
      const callback = pickerOpen
        ? () => { setPickerOpen(false); return true; }
        : selectedPackId
        ? () => { setSelectedPackId(null); return true; }
        : null;
      themeBackActionRef.current = callback;
      return () => {
        if (themeBackActionRef.current === callback) themeBackActionRef.current = null;
      };
    }, [pickerOpen, selectedPackId]);

    const renderThemeTextureSwatch = (preset: AppTheme, key: string, size = 19, radius: number | string = 999) => {
      const fx = getThemeFxProfile(preset);
      return (
      <span
        key={key}
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          position: "relative",
          overflow: "hidden",
          display: "inline-block",
          background: String(preset.id).startsWith("postApoc") ? (preset.pageBackground || preset.cardBackground || `${preset.primary}18`) : (preset.cardBackground || `${preset.primary}18`),
          boxShadow: `0 0 10px ${preset.primary}55`,
          border: "1px solid rgba(255,255,255,.28)",
          isolation: "isolate",
          flexShrink: 0,
        }}
      >
        {preset.textureOverlay ? <span style={{ position: "absolute", inset: 0, background: preset.textureOverlay, opacity: clamp01((preset.previewTextureOpacity ?? Math.min(.30, Math.max(.14, preset.textureOpacity ?? .20))) * fx.swatchTexture / .20), mixBlendMode: preset.textureBlendMode || "soft-light" }} /> : null}
        {preset.ambientOverlay ? <span style={{ position: "absolute", inset: 0, background: preset.ambientOverlay, opacity: clamp01((preset.previewAmbientOpacity ?? Math.min(.16, Math.max(.06, preset.ambientOpacity ?? .08))) * fx.swatchAmbient / .10) }} /> : null}
        {preset.surfaceSheen ? <span style={{ position: "absolute", inset: 0, background: preset.surfaceSheen, opacity: clamp01((preset.previewSheenOpacity ?? .30) * fx.swatchSheen / .18), mixBlendMode: "screen" }} /> : null}
        {preset.frameOverlay ? <span style={{ position: "absolute", inset: 0, background: preset.frameOverlay, opacity: clamp01((preset.previewFrameOpacity ?? Math.max(.30, (preset.frameOpacity ?? .82) - .40)) * fx.swatchFrame / .20) }} /> : null}
      </span>
      );
    };

    const packCard = (pack: ThemePack) => {
      const locked = packLocked(pack);
      const swatchPresets = pack.ids.slice(0, 4).map((id) => getPreset(id));
      const titleSize = pack.label.length > 20 ? 10.4 : pack.label.length > 16 ? 11.1 : 12.1;
      return (
        <button
          key={pack.id}
          type="button"
          className={pack.id === "postapoc" ? "dc-postapoc-pack-card" : undefined}
          onClick={() => openPack(pack.id, pack.ids[0] || null)}
          style={{
            minHeight: 114,
            height: 114,
            borderRadius: 17,
            border: `1px solid ${pack.premium ? `${pack.colors[0]}77` : theme.borderSoft}`,
            background: `linear-gradient(180deg, rgba(6,8,14,.96), rgba(4,6,12,.98))`,
            color: theme.text,
            textAlign: "center",
            padding: "13px 11px 12px",
            cursor: "pointer",
            boxShadow: pack.premium ? `0 12px 25px rgba(0,0,0,.36), 0 0 20px ${pack.colors[0]}24` : `0 12px 25px rgba(0,0,0,.32), 0 0 16px ${pack.colors[0]}18`,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {pack.premium ? (
            <span style={{ position: "absolute", top: 7, right: 8, borderRadius: 999, border: `1px solid ${pack.colors[0]}66`, background: "rgba(0,0,0,.52)", color: pack.colors[0], padding: "3px 7px", fontSize: 7.6, fontWeight: 1000, letterSpacing: .45 }}>
              {locked ? "🔒" : "✓"}
            </span>
          ) : null}
          <div
            style={{
              color: pack.colors[0],
              fontWeight: 1000,
              fontSize: titleSize,
              letterSpacing: .42,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.15,
              paddingRight: pack.premium ? 18 : 0,
            }}
            title={pack.label}
          >
            {pack.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
            {swatchPresets.map((preset, idx) => renderThemeTextureSwatch(preset, `${pack.id}-${idx}`, 28, 999))}
          </div>
        </button>
      );
    };

    return (
      <section style={{ background: CARD_BG, borderRadius: 18, border: `1px solid ${theme.borderSoft}`, padding: 12, marginBottom: 16, overflow: "hidden" }}>
        <ThemePreviewBlock
          themeIdPreview={previewThemeId}
          activeThemeId={themeId}
          theme={theme}
          onApply={applyTheme}
          locked={themeLocked(previewThemeId)}
          onOpenShop={openThemeShop}
        />

        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={() => { setPickerPackId(selectedPackId); setPickerOpen(true); }}
            style={{
              minWidth: 190,
              borderRadius: 999,
              border: `1px solid ${theme.primary}88`,
              background: `${theme.primary}12`,
              color: theme.primary,
              padding: "8px 13px",
              fontSize: 11,
              fontWeight: 950,
              cursor: "pointer",
              boxShadow: `0 0 12px ${theme.primary}22`,
            }}
          >
            Choisir pack / thème ▾
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {!selectedPack ? (
            <>
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ color: theme.textSoft, fontSize: 10, textTransform: "uppercase", fontWeight: 950, letterSpacing: .75 }}>PACKS DE THÈMES</div>
                <div style={{ color: theme.textSoft, fontSize: 9.5, fontWeight: 850 }}>{packCarouselIndex + 1} / {THEME_PACKS.length}</div>
              </div>
              <SettingsLoopCarousel
                items={THEME_PACKS}
                theme={theme}
                itemWidth={168}
                gap={14}
                initialIndex={packCarouselIndex}
                ariaLabel="Carrousel des packs de thèmes"
                onActiveIndexChange={(index) => setPackCarouselIndex(index)}
                renderItem={(pack: ThemePack) => packCard(pack)}
              />
              <button
                type="button"
                onClick={() => { const currentPack = THEME_PACKS[packCarouselIndex] || THEME_PACKS[0]; if (currentPack) openPack(currentPack.id, currentPack.ids[0] || null); }}
                style={{
                  width: "100%",
                  minHeight: 40,
                  marginTop: 10,
                  borderRadius: 13,
                  border: `1px solid ${theme.primary}66`,
                  background: `${theme.primary}16`,
                  color: theme.primary,
                  fontSize: 10.5,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: `0 0 16px ${theme.primary}20`,
                }}
              >
                OUVRIR LE PACK SÉLECTIONNÉ
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <button type="button" onClick={() => { setSelectedPackId(null); }} style={{ border: "none", background: "transparent", color: theme.primary, fontSize: 10.5, fontWeight: 950, cursor: "pointer", padding: 0 }}>← PACKS</button>
                <div style={{ color: selectedPack.premium ? selectedPack.colors[0] : theme.textSoft, fontSize: 10, fontWeight: 900 }}>{selectedPack.label}{selectedPack.premium && !premiumThemesUnlocked ? " · 🔒 BOUTIQUE" : ""}</div>
              </div>
              <div style={{ marginBottom: 7, color: theme.textSoft, fontSize: 9.2, fontWeight: 850, textAlign: "center", letterSpacing: .35 }}>THÈME {Math.min(selectedPack.ids.length, selectedThemeIndex + 1)} / {selectedPack.ids.length} · Défile thème par thème</div>
              <SettingsLoopCarousel
                items={selectedPack.ids}
                theme={theme}
                itemWidth={132}
                gap={14}
                initialIndex={Math.max(0, selectedPack.ids.indexOf(previewThemeId || selectedPack.ids[0]))}
                ariaLabel="Carrousel de thèmes"
                onActiveIndexChange={(index) => {
                  setSelectedThemeIndex(index);
                  const id = selectedPack.ids[index];
                  if (id) setPreviewThemeId(id);
                }}
                renderItem={(id: ThemeId) => {
                  const preset = getPreset(id);
                  const meta = THEME_META[id];
                  const isActive = id === themeId;
                  const isPreview = id === previewThemeId;
                  const locked = themeLocked(id);
                  const fx = getThemeFxProfile(preset);
                  const sceneUrl = getThemeSceneUrl(preset);
                  const imageCard = Boolean(sceneUrl);
                  const isPostApocCard = String(id).startsWith("postApoc");
                  const cardSubtitle = POSTAPOC_CARD_SUBTITLE[id] || meta.defaultDesc;
                  return (
                    <button
                      className={isPostApocCard ? "dc-postapoc-theme-card" : imageCard ? "dc-image-theme-card" : undefined}
                      type="button"
                      onClick={() => applyTheme(id)}
                      style={{
                        width: "100%",
                        height: imageCard ? 164 : 132,
                        borderRadius: 18,
                        border: `1px solid ${isPreview || isActive ? preset.primary : theme.borderSoft}`,
                        background: imageCard ? "#0B0D10" : (localizeThemeBackground(preset.cardBackground) || `radial-gradient(circle at 50% 0%, ${preset.primary}22, transparent 60%), ${preset.card}`),
                        backgroundImage: imageCard && sceneUrl ? `url(${sceneUrl})` : undefined,
                        backgroundSize: imageCard ? "cover" : undefined,
                        backgroundPosition: imageCard ? "center center" : undefined,
                        backgroundRepeat: imageCard ? "no-repeat" : undefined,
                        backgroundAttachment: "scroll",
                        color: preset.text,
                        padding: imageCard ? 0 : 10,
                        cursor: "pointer",
                        boxShadow: isPreview || isActive ? `0 0 18px ${preset.primary}35, 0 12px 28px rgba(0,0,0,.30)` : "0 10px 24px rgba(0,0,0,.22)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: imageCard ? "stretch" : "center",
                        justifyContent: imageCard ? "flex-end" : "center",
                        gap: 6,
                        position: "relative",
                        overflow: "hidden",
                        textAlign: imageCard ? "left" : "center",
                      }}
                    >
                      {preset.textureOverlay ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preset.textureOverlay, opacity: clamp01((preset.previewTextureOpacity ?? .22) + (fx.tileTexture - .16)), mixBlendMode: preset.textureBlendMode || "soft-light", pointerEvents: "none" }} /> : null}
                      {preset.ambientOverlay ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preset.ambientOverlay, opacity: imageCard ? .24 : .18, pointerEvents: "none" }} /> : null}
                      {preset.surfaceSheen ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preset.surfaceSheen, opacity: clamp01((preset.previewSheenOpacity ?? .14) + (fx.tileSheen - .10)), mixBlendMode: "screen", pointerEvents: "none" }} /> : null}
                      {preset.frameOverlay ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: preset.frameOverlay, opacity: clamp01((preset.previewFrameOpacity ?? .18) + (fx.tileFrame - .12)), pointerEvents: "none" }} /> : null}
                      {imageCard ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: isPostApocCard ? "linear-gradient(180deg, rgba(4,5,6,.03) 0%, rgba(4,5,6,.08) 42%, rgba(4,5,6,.72) 73%, rgba(4,5,6,.97) 100%)" : "linear-gradient(180deg, rgba(4,6,12,.04) 0%, rgba(4,6,12,.18) 38%, rgba(4,6,12,.84) 76%, rgba(4,6,12,.96) 100%)", pointerEvents: "none" }} /> : null}
                      {isPostApocCard ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "url(/theme-textures/postapoc-cracks-overlay.svg) center/cover no-repeat", opacity: .52, mixBlendMode: "multiply", pointerEvents: "none" }} /> : null}
                      {isPostApocCard ? <span className="dc-postapoc-overgrowth" aria-hidden="true" /> : null}
                      {locked ? <span style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${preset.primary}55`, background: "rgba(0,0,0,.55)", fontSize: 12 }}>🔒</span> : null}
                      {!locked && (isPreview || isActive) ? <span style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${preset.primary}88`, background: "rgba(0,0,0,.55)", color: preset.primary, fontSize: 12, fontWeight: 1000 }}>✓</span> : null}
                      {imageCard ? (
                        <div style={{ position: "relative", zIndex: 2, marginTop: "auto", padding: "12px 10px 11px" }}>
                          <div style={{ color: preset.text, fontSize: isPostApocCard ? 11.2 : 10.8, fontWeight: 1000, lineHeight: 1.08, textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,.82)", letterSpacing: isPostApocCard ? .3 : 0 }}>{meta.defaultLabel}</div>
                          <div style={{ marginTop: 4, color: locked ? preset.primary : (isPostApocCard ? preset.primary : preset.textSoft), fontSize: isPostApocCard ? 8.1 : 8.4, fontWeight: 900, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: .3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locked ? "Aperçu boutique" : cardSubtitle}</div>
                        </div>
                      ) : (
                        <>
                          {renderThemeTextureSwatch(preset, `${id}-preview`, 40, 13)}
                          <span style={{ fontSize: 10.5, fontWeight: 950, textAlign: "center", lineHeight: 1.15, position: "relative" }}>{meta.defaultLabel}</span>
                          <span style={{ fontSize: 8.5, color: locked ? preset.primary : preset.textSoft, position: "relative" }}>{locked ? "APERÇU BOUTIQUE" : isActive ? "ACTIF" : "APERÇU"}</span>
                        </>
                      )}
                    </button>
                  );
                }}
              />
              {selectedPack.premium && !premiumThemesUnlocked ? (
                <button type="button" onClick={openThemeShop} style={{ width: "100%", marginTop: 10, minHeight: 40, borderRadius: 13, border: `1px solid ${selectedPack.colors[0]}77`, background: `linear-gradient(135deg,${selectedPack.colors[0]},${selectedPack.colors[3]})`, color: "#050712", fontSize: 10.5, fontWeight: 1000, cursor: "pointer", boxShadow: `0 0 18px ${selectedPack.colors[0]}2b` }}>🔒 DÉBLOQUER {selectedPack.label}</button>
              ) : null}
            </>
          )}
        </div>

        {pickerOpen ? (
          <div role="presentation" onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 5200, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 16 }}>
            <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ width: "min(430px,94vw)", maxHeight: "78vh", borderRadius: 20, border: `1px solid ${theme.primary}77`, background: "linear-gradient(180deg,rgba(8,12,28,.99),rgba(3,5,15,.99))", boxShadow: `0 0 26px ${theme.primary}28, 0 20px 54px rgba(0,0,0,.75)`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 14px", borderBottom: `1px solid ${theme.borderSoft}` }}>
                <div><div style={{ color: theme.primary, fontSize: 15, fontWeight: 950, textTransform: "uppercase", letterSpacing: .7 }}>CHOISIR UN THÈME</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 10.5 }}>Choisis d’abord un pack, puis un thème.</div></div>
                <button type="button" onClick={() => setPickerOpen(false)} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", color: theme.text, fontSize: 20, cursor: "pointer" }}>×</button>
              </div>
              <div className="dc-scroll-thin" style={{ overflowY: "auto", padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
                  {THEME_PACKS.map((pack) => {
                    const locked = packLocked(pack);
                    return (
                      <button key={pack.id} type="button" onClick={() => { setPickerPackId(pack.id); setPackCarouselIndex(Math.max(0, THEME_PACKS.findIndex((entry) => entry.id === pack.id))); }} style={{ minHeight: 62, borderRadius: 13, border: `1px solid ${pickerPackId === pack.id ? pack.colors[0] : theme.borderSoft}`, background: `linear-gradient(135deg,${pack.colors[0]}20,rgba(255,255,255,.025))`, color: pickerPackId === pack.id ? pack.colors[0] : theme.text, fontSize: 9.5, fontWeight: 950, cursor: "pointer", padding: 8, position: "relative" }}>
                        {pack.label}{locked ? " · 🔒" : ""}
                      </button>
                    );
                  })}
                </div>
                {pickerPack ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
                    {pickerPack.ids.map((id) => {
                      const preset = getPreset(id);
                      const meta = THEME_META[id];
                      const locked = themeLocked(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            openPack(pickerPack.id, id);
                            if (!locked) applyThemePreference(id);
                            setPickerOpen(false);
                          }}
                          style={{ minHeight: 48, borderRadius: 13, border: `1px solid ${id === themeId ? preset.primary : theme.borderSoft}`, background: `${preset.primary}12`, color: id === themeId ? preset.primary : theme.text, padding: 9, fontSize: 10.5, fontWeight: 900, cursor: "pointer", textAlign: "left" }}
                        >
                          <span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 7 }}>{renderThemeTextureSwatch(preset, `${id}-picker`, 12, 999)}</span>
                          {meta.defaultLabel}{locked ? "  🔒" : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }


  function StartupIntroSection() {
    return <AudioSettingsPanel />;
  }

  function GeneralSection() {
    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.reset.title", "Réinitialiser l’application")}
        </h2>

        <p style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10, lineHeight: 1.4 }}>
          {t(
            "settings.reset.subtitle",
            "Efface tous les profils locaux, BOTS, stats, historique de parties et réglages. Action définitive."
          )}
        </p>

        <button
          type="button"
          onClick={handleFullReset}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "7px 12px",
            border: "1px solid rgba(255,120,120,0.8)",
            background: "linear-gradient(90deg, rgba(255,80,80,0.95), rgba(255,170,120,0.95))",
            color: "#120808",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            boxShadow: "0 0 18px rgba(255,80,80,0.65)",
            cursor: "pointer",
          }}
        >
          {t("settings.reset.button", "Tout réinitialiser")}
        </button>
      </section>
    );
  }

  function NasBackupSection() {
    const btnBase: React.CSSProperties = {
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    };

    async function handleBackup() {
      setNasBusy("backup");
      setNasStatus("⏳ Synchronisation NAS en cours...");
      setNasLastInfo(null);
      try {
        const res = await pushNasAccountSnapshot();
        const summary = await computeNasSyncSummary(res);
        setNasLastInfo({ ...(res ?? {}), summary });
        const msg = formatNasReport("backup", summary, res);
        setNasStatus(msg);
        safeAlert(msg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const finalMsg = `❌ Synchronisation NAS impossible : ${msg}`;
        setNasStatus(finalMsg);
        safeAlert(finalMsg);
      } finally {
        setNasBusy(null);
      }
    }

    async function handleRestore() {
      const ok = window.confirm(
        "Recharger le snapshot du NAS sur cet appareil ?\n\n" +
          "Cette action remplace l’état local importé par le snapshot du compte."
      );
      if (!ok) return;

      setNasBusy("restore");
      setNasStatus("⏳ Rechargement NAS en cours...");
      setNasLastInfo(null);
      try {
        const res = await pullNasAccountSnapshot();
        const summary = await computeNasSyncSummary(res);
        setNasLastInfo({ ...(res ?? {}), summary });
        const msg = formatNasReport("restore", summary, res);
        setNasStatus(msg);
        safeAlert(msg);
        // Après import manuel NAS, on recharge pour que tous les écrans relisent
        // le store IndexedDB fraîchement remplacé/hydraté.
        try { window.location.reload(); } catch {}
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const finalMsg = `❌ Rechargement NAS impossible : ${msg}`;
        setNasStatus(finalMsg);
        safeAlert(finalMsg);
      } finally {
        setNasBusy(null);
      }
    }

    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.nas.title", "Backup NAS")}
        </h2>

        <p style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10, lineHeight: 1.45 }}>
          {t(
            "settings.nas.subtitle",
            "Créer une sauvegarde NAS du compte ou charger la dernière sauvegarde NAS. Les outils techniques avancés sont dans le mode Développeur."
          )}
        </p>

        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.22)",
            marginBottom: 12,
            fontSize: 11,
            color: theme.textSoft,
            wordBreak: "break-all",
          }}
        >
          <div style={{ fontWeight: 800, color: theme.text, marginBottom: 4 }}>API NAS</div>
          <div>{getApiUrl()}</div>
        </div>

        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(255,255,255,0.03)",
            marginBottom: 12,
            fontSize: 11,
            color: theme.text,
          }}
        >
          {(() => { const s = getNasSyncState(); return s.dirty ? `⚠️ Modifications locales non synchronisées${s.reason ? ` (${s.reason})` : ""}` : "✅ Aucune modification locale en attente"; })()}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={handleBackup}
            disabled={nasBusy !== null}
            style={{
              ...btnBase,
              border: `1px solid ${theme.primary}`,
              background: "rgba(0,0,0,0.35)",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}22`,
              opacity: nasBusy ? 0.7 : 1,
            }}
          >
            {nasBusy === "backup" ? "Création..." : "Créer sauvegarde NAS"}
          </button>

          <button
            type="button"
            onClick={handleRestore}
            disabled={nasBusy !== null}
            style={{
              ...btnBase,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.04)",
              color: theme.text,
              opacity: nasBusy ? 0.7 : 1,
            }}
          >
            {nasBusy === "restore" ? "Chargement..." : "Charger sauvegarde NAS"}
          </button>
        </div>

        {nasStatus ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.03)",
              color: theme.text,
              fontSize: 12,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            {nasStatus}
          </div>
        ) : null}

        {nasLastInfo ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.textSoft,
              fontSize: 11,
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          >
            <div style={{ color: theme.text, fontWeight: 900, marginBottom: 6 }}>Détail technique</div>
            {nasLastInfo?.summary ? (
              <div style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
                {getNasReportLines("backup", nasLastInfo.summary, nasLastInfo).slice(1).join("\n")}
              </div>
            ) : null}
            <details>
              <summary style={{ cursor: "pointer", color: theme.primary, fontWeight: 800 }}>Voir la réponse API brute</summary>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(nasLastInfo, null, 2)}</div>
            </details>
          </div>
        ) : null}
      </section>
    );
  }

  function DiagnosticsSection() {
    const [tick, setTick] = React.useState(0);
    const [report, setReport] = React.useState<any>(null);

    React.useEffect(() => {
      const id = window.setInterval(() => setTick((v) => v + 1), 2000);
      return () => window.clearInterval(id);
    }, []);

    const memoryDiag = safeReadJson<any>("dc_memory_diag_v1");
    const storeDiag = safeReadJson<any>("dc_last_store_size_v1");
    const storeWarn = safeReadJson<any>("dc_store_size_warning");
    const memWarn = safeReadJson<any>("dc_last_memory_warning_v1");
    const runtimeErr = safeReadJson<any>("dc_last_runtime_error_v1");
    const chunkErr = safeReadJson<any>("dc_last_chunk_error_v1");
    const lastCrash = getLastCrashReport();
    const crashLog = getCrashLog();

    const rowStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "140px 1fr",
      gap: 8,
      alignItems: "start",
      padding: "8px 0",
      borderBottom: `1px solid ${theme.borderSoft}`,
    };

    const monoBox: React.CSSProperties = {
      marginTop: 8,
      padding: 10,
      borderRadius: 12,
      border: `1px solid ${theme.borderSoft}`,
      background: "rgba(0,0,0,0.28)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 11,
      lineHeight: 1.4,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      color: theme.textSoft,
    };

    const snapshotReport = {
      memoryDiag,
      storeDiag,
      storeWarn,
      memWarn,
      runtimeErr,
      chunkErr,
      lastCrash,
      crashLog,
      href: (() => {
        try { return location.href; } catch { return ""; }
      })(),
      tick,
    };

    async function runDiagnostic() {
      try {
        const r = await generateDiagnostic();
        setReport(r);
      } catch (e: any) {
        safeAlert(`Diagnostic impossible: ${e?.message || e || "erreur inconnue"}`);
      }
    }

    const copyReport = async () => {
      const txt = JSON.stringify({ snapshot: snapshotReport, pro: report }, null, 2);
      try {
        await navigator.clipboard.writeText(txt);
        safeAlert("Diagnostic copié.");
      } catch {
        safeAlert(txt);
      }
    };

    const clearDiag = () => {
      const keys = [
        "dc_memory_diag_v1",
        "dc_last_store_size_v1",
        "dc_store_size_warning",
        "dc_last_memory_warning_v1",
        "dc_last_runtime_error_v1",
        "dc_last_chunk_error_v1",
        "dc_last_promise_error_v1",
        "dc_diag_routes_v2",
        "dc_diag_render_v2",
        "dc_diag_memory_samples_v2",
        "dc_diag_events_v2",
        "dc_diag_session_v2",
        "dc_diag_last_snapshot_v2",
        "dc_diag_longtasks_v2",
        "dc_last_crash_report_v2",
        "dc_crash_log_v2",
      ];
      for (const k of keys) {
        try { localStorage.removeItem(k); } catch {}
      }
      setTick((v) => v + 1);
    };

    return (
      <section
        style={{
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 16,
            color: theme.primary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("settings.diagnostics.title", "Diagnostic mémoire / crash")}
        </h2>

        <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.45, marginBottom: 10 }}>
          {t(
            "settings.diagnostics.help",
            "Ces informations servent à identifier les crashs PWA / mémoire sur mobile et les erreurs de chargement."
          )}
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>MEM</div>
          <div style={{ color: theme.text }}>{memoryDiag ? `${memoryDiag.usedMB ?? "?"} / ${memoryDiag.limitMB ?? "?"} MB` : "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>STORE</div>
          <div style={{ color: theme.text }}>{storeDiag?.mb != null ? `${storeDiag.mb} MB` : "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>Route</div>
          <div style={{ color: theme.text }}>{memoryDiag?.route || "—"}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: theme.textSoft, fontWeight: 800 }}>Dernier relevé</div>
          <div style={{ color: theme.text }}>{fmtDateTime(memoryDiag?.at)}</div>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" onClick={() => setTick((v) => v + 1)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: theme.text, fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.refresh", "Rafraîchir")}
          </button>
          <button type="button" onClick={runDiagnostic} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, padding: "8px 12px", background: "rgba(0,0,0,0.35)", color: theme.primary, fontWeight: 900, cursor: "pointer", boxShadow: `0 0 10px ${theme.primary}22` }}>
            Analyser
          </button>
          <button type="button" onClick={() => exportDiagnostic(report)} disabled={!report} style={{ borderRadius: 12, border: `1px solid ${theme.primary}`, padding: "8px 12px", background: report ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.04)", color: report ? theme.primary : theme.textSoft, fontWeight: 900, cursor: report ? "pointer" : "not-allowed", boxShadow: report ? `0 0 10px ${theme.primary}22` : "none", opacity: report ? 1 : 0.7 }}>
            Exporter rapport
          </button>
          <button type="button" onClick={copyReport} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: theme.text, fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.copy", "Copier le diagnostic")}
          </button>
          <button type="button" onClick={clearDiag} style={{ borderRadius: 12, border: `1px solid rgba(255,120,120,0.45)`, padding: "8px 12px", background: "rgba(90,0,0,0.22)", color: "#ffb7b7", fontWeight: 800, cursor: "pointer" }}>
            {t("settings.diagnostics.clear", "Vider les logs")}
          </button>
        </div>

        {report ? (
          <div style={monoBox}>
            <div><strong>Rapport diagnostic ultra</strong></div>
            <div>Cause probable: {Array.isArray(report?.probableCause) ? report.probableCause.join(" / ") : report?.probableCause || "—"}</div>
            <div>Render count: {report?.app?.renderCount ?? "—"} — rate: {report?.app?.renderRatePerMin ?? "—"}/min</div>
            <div>Mémoire: {report?.memory?.jsHeap?.usedMB ?? "—"} / {report?.memory?.jsHeap?.limitMB ?? "—"} MB</div>
            <div>Timers: timeouts={report?.timers?.activeTimeouts ?? "—"} / intervals={report?.timers?.activeIntervals ?? "—"}</div>
            <div>Listeners actifs: {report?.listeners?.totalActive ?? "—"}</div>
            <div>Réseau: slow={report?.network?.slowCount ?? "—"} / failed={report?.network?.failedCount ?? "—"}</div>
            <div>Images lourdes: {report?.images?.heavyCount ?? "—"}</div>
            <div>Top renders: {Array.isArray(report?.react?.byComponent) ? report.react.byComponent.slice(0,3).map((x:any)=>`${x.component}:${x.count}`).join(" | ") : "—"}</div>
            <div>Routes suivies: {Array.isArray(report?.routes) ? report.routes.join(" | ") : "—"}</div>
          </div>
        ) : null}

        <div style={monoBox}>
          <div><strong>Warning mémoire</strong>: {memWarn ? fmtDateTime(memWarn.at) : "—"}</div>
          <div>{memWarn ? `used=${memWarn.usedMB} MB / limit=${memWarn.limitMB} MB / route=${memWarn.route || "—"}` : "Aucun"}</div>
        </div>

        <div style={monoBox}>
          <div><strong>Warning store</strong>: {storeWarn ? fmtDateTime(storeWarn.at) : "—"}</div>
          <div>{storeWarn ? `size=${storeWarn.mb} MB / reason=${storeWarn.reason || "—"}` : "Aucun"}</div>
        </div>

        <div style={monoBox}>
          <div><strong>Dernière erreur runtime</strong>: {runtimeErr ? fmtDateTime(runtimeErr.at) : "—"}</div>
          <div>{runtimeErr ? `${runtimeErr.type || "error"} — ${runtimeErr.message || ""}` : "Aucune"}</div>
          {runtimeErr?.href ? <div>URL: {runtimeErr.href}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Dernière erreur chunk</strong>: {chunkErr ? fmtDateTime(chunkErr.at) : "—"}</div>
          <div>{chunkErr ? `${chunkErr.message || ""}` : "Aucune"}</div>
          {chunkErr?.href ? <div>URL: {chunkErr.href}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Dernier crash capturé</strong>: {lastCrash ? fmtDateTime(lastCrash.at) : "—"}</div>
          <div>{lastCrash ? `${lastCrash.kind || "crash"} — ${lastCrash.message || ""}` : "Aucun"}</div>
          {lastCrash?.context?.route ? <div>Route: {lastCrash.context.route}</div> : null}
        </div>

        <div style={monoBox}>
          <div><strong>Historique des crashs</strong>: {Array.isArray(crashLog) ? crashLog.length : 0}</div>
          <div>Les derniers crashs restent en mémoire après redémarrage.</div>
          {Array.isArray(crashLog) && crashLog.length ? (
            <div style={{ marginTop: 8 }}>
              {crashLog.slice(0, 5).map((c: any, i: number) => (
                <div key={c?.id || i} style={{ padding: "4px 0", borderBottom: `1px solid ${theme.borderSoft}` }}>
                  <strong>{fmtDateTime(c?.at)}</strong> — {c?.kind || "crash"} — {c?.message || ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }


  function DeveloperSection() {

    if (devSub !== "menu") {
      const titles: Record<DeveloperSub, string> = {
        menu: "Développeur",
        diagnostics: "Diagnostic",
        tests: "Tests & simulations",
        onlineCleanup: "Nettoyage Online",
        nas: "Push / Pull NAS",
        logs: "Logs techniques",
        security: "Sécurité technique",
      };

      return (
        <div>

          {devSub === "diagnostics" && <DiagnosticsSection />}
          {devSub === "tests" && <DevModeBlock go={go} />}
          {devSub === "onlineCleanup" && <OnlineStatsCleanupPanel />}
          {devSub === "nas" && <AccountToolsPanel go={go} />}
          {devSub === "logs" && <AccountToolsPanel go={go} />}
          {devSub === "security" && <AccountToolsPanel go={go} />}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        <SettingsMenuCard title="Diagnostic" subtitle="Mémoire, store, routes, warnings, erreurs runtime et crashs capturés." theme={theme} onClick={() => setDevSub("diagnostics")} />
        <SettingsMenuCard title="Tests & simulations" subtitle="Déverrouillage DEV, simulation offline/online et création de parties fictives tous jeux." theme={theme} onClick={() => setDevSub("tests")} />
        <SettingsMenuCard title="Nettoyage Online" subtitle="Exclure/restaurer les sessions de test pour que Stats Online, X01Compare et Classements Online restent propres." theme={theme} onClick={() => setDevSub("onlineCleanup")} />
        <SettingsMenuCard title="Push / Pull NAS" subtitle="Actions techniques de synchronisation, comparaison local/cloud et refresh session." theme={theme} onClick={() => setDevSub("nas")} />
        <SettingsMenuCard title="Logs" subtitle="Réponses API, état session, snapshots locaux/cloud et exports de debug." theme={theme} onClick={() => setDevSub("logs")} />
        <SettingsMenuCard title="Sécurité technique" subtitle="Session, logout, purge locale, merge et outils compte réservés au debug." theme={theme} onClick={() => setDevSub("security")} />
      </div>
    );
  }

  function SportSection() {
    type GameId =
      | "darts" | "petanque" | "pingpong" | "babyfoot" | "running" | "archery" | "molkky" | "padel" | "pickleball"
      | "frisbee" | "billard" | "badminton" | "basket" | "cornhole" | "dicegame" | "foot" | "rugby" | "volley" | "tennis" | "chess";

    const GAMES: { id: GameId; label: string; logo: string }[] = [
      { id: "darts", label: "Fléchettes", logo: logoDarts }, { id: "petanque", label: "Pétanque", logo: logoPetanque },
      { id: "pingpong", label: "Ping-Pong", logo: logoPingPong }, { id: "babyfoot", label: "Babyfoot", logo: logoBabyFoot },
      { id: "running", label: "Running Performance", logo: logoRunning }, { id: "molkky", label: "Mölkky", logo: logoMolkky }, { id: "archery", label: "Tir à l'arc", logo: logoArchery },
      { id: "badminton", label: "Badminton", logo: logoBadminton }, { id: "basket", label: "Basket", logo: logoBasket },
      { id: "billard", label: "Billard", logo: logoBillard }, { id: "chess", label: "Échecs", logo: logoChess },
      { id: "cornhole", label: "Cornhole", logo: logoCornhole }, { id: "dicegame", label: "Dice Game", logo: logoDiceGame },
      { id: "foot", label: "Foot", logo: logoFoot }, { id: "frisbee", label: "Frisbee", logo: logoFrisbee },
      { id: "padel", label: "Padel", logo: logoPadel }, { id: "pickleball", label: "Pickleball", logo: logoPickleball },
      { id: "rugby", label: "Rugby", logo: logoRugby }, { id: "tennis", label: "Tennis", logo: logoTennis }, { id: "volley", label: "Volley", logo: logoVolley },
    ];

    const ENABLED: Record<GameId, boolean> = {
      darts: true, petanque: true, pingpong: true, babyfoot: true, running: true, molkky: true, dicegame: true,
      archery: false, padel: false, pickleball: false, frisbee: false, billard: false, badminton: false,
      basket: false, cornhole: false, foot: false, rugby: false, volley: false, tennis: false, chess: false,
    };

    const sortedGames = React.useMemo(() => {
      const copy = [...GAMES];
      copy.sort((a, b) => a.label.localeCompare(b.label, "fr"));
      copy.sort((a, b) => Number(!!ENABLED[b.id]) - Number(!!ENABLED[a.id]));
      return copy;
    }, []);

    const onPick = (id: GameId) => {
      try { localStorage.setItem(START_GAME_KEY, id); } catch {}
      try { window.dispatchEvent(new CustomEvent("dc:sport-change", { detail: { sport: id } })); } catch {}
      go?.("home");
    };

    const onReset = () => {
      try { localStorage.removeItem(START_GAME_KEY); } catch {}
      alert("Choix réinitialisé. Au prochain lancement, le hub de sélection réapparaîtra.");
    };

    return (
      <section style={{ background: CARD_BG, borderRadius: 18, border: `1px solid ${theme.borderSoft}`, padding: 12, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ marginBottom: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ color: theme.textSoft, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: .75 }}>SPORTS</div>
          <div style={{ color: theme.textSoft, fontSize: 9.5 }}>4 sports par page · boucle infinie</div>
        </div>

        <SettingsPagedGrid
          items={sortedGames}
          theme={theme}
          pageSize={4}
          ariaLabel="Sélection des sports"
          renderItem={(g: { id: GameId; label: string; logo: string }) => {
            const enabled = !!ENABLED[g.id];
            return (
              <button
                type="button"
                onClick={() => enabled && onPick(g.id)}
                disabled={!enabled}
                style={{
                  minWidth: 0,
                  minHeight: 138,
                  borderRadius: 17,
                  border: `1px solid ${enabled ? `${theme.primary}44` : theme.borderSoft}`,
                  background: enabled ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.022)",
                  padding: 9,
                  cursor: enabled ? "pointer" : "not-allowed",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  opacity: enabled ? 1 : .40,
                  filter: enabled ? "none" : "grayscale(1)",
                  position: "relative",
                  color: theme.text,
                  boxShadow: enabled ? `0 0 16px ${theme.primary}12` : "none",
                }}
              >
                {!enabled ? <span style={{ position: "absolute", top: 6, right: 6, borderRadius: 999, background: "rgba(0,0,0,.68)", border: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 8, fontWeight: 1000, padding: "3px 6px" }}>SOON</span> : null}
                <img src={g.logo} alt={g.label} style={{ width: 82, height: 82, objectFit: "contain", filter: enabled ? `drop-shadow(0 0 9px ${theme.primary}22)` : "none" }} />
                <span style={{ width: "100%", fontSize: 10.5, color: theme.textSoft, fontWeight: 950, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.label}</span>
              </button>
            );
          }}
        />

        <button onClick={onReset} style={{ width: "100%", minHeight: 40, marginTop: 11, borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.textSoft, fontWeight: 900, fontSize: 10.5, cursor: "pointer" }}>{t("settings.sport.resetChoice", "Réinitialiser le choix")}</button>
      </section>
    );
  }

  const headerTitle =
    tab === "menu"
      ? t("settings.title", "Réglages")
      : tab === "account"
      ? accountPage === "account_storage"
        ? L("Stockage & abonnements", "Storage & subscriptions", "Almacenamiento y suscripciones")
        : accountPage === "account_notifications"
        ? t("settings.account.notifications.title", "Notifications & communications")
        : accountPage === "account_danger"
        ? t("settings.account.danger", "Zone dangereuse")
        : t("settings.menu.account", "Compte")
      : tab === "advertising"
      ? L("Publicité", "Advertising", "Publicidad")
      : tab === "shop"
      ? L("Boutique", "Store", "Tienda")
      : tab === "privacy"
      ? L("Confidentialité & données", "Privacy & data", "Privacidad y datos")
      : tab === "awena"
      ? "Awena"
      : tab === "theme"
      ? t("settings.menu.theme", "Thème")
      : tab === "lang"
      ? t("settings.menu.lang", "Langues")
      : tab === "audio"
      ? t("settings.menu.audio", "AUDIO")
      : tab === "general"
      ? L("SAUVEGARDE", "BACKUP", "COPIA DE SEGURIDAD")
      : tab === "castViewer"
      ? "Cast / Viewer"
      : tab === "developer"
      ? devSub === "diagnostics"
        ? L("Diagnostic", "Diagnostics", "Diagnóstico")
        : devSub === "tests"
        ? L("Tests & simulations", "Tests & simulations", "Pruebas y simulaciones")
        : devSub === "onlineCleanup"
        ? L("Nettoyage Online", "Online cleanup", "Limpieza Online")
        : devSub === "nas"
        ? "Push / Pull NAS"
        : devSub === "logs"
        ? L("Logs techniques", "Technical logs", "Registros técnicos")
        : devSub === "security"
        ? L("Sécurité technique", "Technical security", "Seguridad técnica")
        : t("settings.menu.developer", "Développeur")
      : t("settings.menu.sport", "Choix de sport");

  const headerSubtitle =
    tab === "menu"
      ? t("settings.subtitle", "Personnalise le thème et la langue de l’application.")
      : tab === "account"
      ? accountPage === "account_storage"
        ? L("Destination du compte, stockage local/cloud, quota, abonnements et sauvegardes.", "Account destination, local/cloud storage, quota, subscriptions and backups.", "Destino de la cuenta, almacenamiento local/cloud, cuota, suscripciones y copias de seguridad.")
        : accountPage === "account_notifications"
        ? L("Options locales de notifications, sons et communications de l’application.", "Local notification, sound and app communication options.", "Opciones locales de notificaciones, sonidos y comunicaciones de la aplicación.")
        : accountPage === "account_danger"
        ? L("Suppression du compte et réinitialisation des données locales.", "Account deletion and local data reset.", "Eliminación de la cuenta y restablecimiento de datos locales.")
        : L("Compte connecté, profil joueur, stockage, notifications et sécurité.", "Connected account, player profile, storage, notifications and security.", "Cuenta conectada, perfil del jugador, almacenamiento, notificaciones y seguridad.")
      : tab === "advertising"
      ? L("Bannières, interstitiels de fin de partie et consentement publicitaire.", "Banners, end-of-game interstitials and advertising consent.", "Banners, intersticiales de fin de partida y consentimiento publicitario.")
      : tab === "shop"
      ? L("Premium, achats Google Play et packs additionnels.", "Premium, Google Play purchases and add-on packs.", "Premium, compras de Google Play y packs adicionales.")
      : tab === "privacy"
      ? L("Politique de confidentialité, droits, contact et suppression du compte.", "Privacy policy, rights, contact and account deletion.", "Política de privacidad, derechos, contacto y eliminación de la cuenta.")
      : tab === "awena"
      ? L("Présence, voix locale et comportement de l’assistante officielle.", "Presence, local voice and behavior of the official assistant.", "Presencia, voz local y comportamiento de la asistente oficial.")
      : tab === "theme"
      ? t("settings.theme.subtitle", "Choisis un pack puis fais défiler les thèmes pour personnaliser toute l’interface.")
      : tab === "lang"
      ? t("settings.lang.subtitle", "Choisis la langue de l’interface.")
      : tab === "audio"
      ? t("settings.audio.pageSubtitle", "Musiques, playlist, volumes, bruitages et intro de démarrage.")
      : tab === "sport"
      ? t("settings.sport.subtitle", "Contrôle le sport/jeu au démarrage.")
      : tab === "castViewer"
      ? L("Paramètres des deux sorties écran : Google Cast TV et Viewer tablette.", "Settings for both screen outputs: Google Cast TV and tablet Viewer.", "Ajustes de las dos salidas de pantalla: Google Cast TV y Viewer para tableta.")
      : tab === "developer"
      ? devSub === "menu"
        ? t("settings.dev.pageSubtitle", "Diagnostic, tests, logs, sécurité technique et outils NAS avancés.")
        : L("Zone réservée aux tests, diagnostics et actions techniques avancées.", "Area reserved for tests, diagnostics and advanced technical actions.", "Zona reservada para pruebas, diagnósticos y acciones técnicas avanzadas.")
      : L("Backup NAS, synchronisation et restauration du compte.", "NAS backup, synchronization and account restore.", "Copia NAS, sincronización y restauración de la cuenta.");

  const handleSettingsTitleSecretTap = () => {
    if (tab !== "menu") return;
    settingsTitleTapRef.current += 1;
    if (settingsTitleTapRef.current >= 7) {
      const next = !developerVisible;
      settingsTitleTapRef.current = 0;
      setDeveloperVisible(next);
      try {
        window.localStorage.setItem("dc_settings_developer_visible", next ? "1" : "0");
      } catch {}
      try {
        window.alert(next ? "Mode développeur affiché." : "Mode développeur masqué.");
      } catch {}
    }
  };

  const handleHeaderBack = () => {
    if (tab === "menu") {
      go?.("home");
      return;
    }
    if (tab === "account" && accountPage !== "account_menu") {
      setAccountPage("account_menu");
      return;
    }
    if (tab === "developer" && devSub !== "menu") {
      setDevSub("menu");
      return;
    }
    if (tab === "theme" && themeBackActionRef.current?.()) {
      return;
    }
    setTab("menu");
  };

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        paddingTop: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, marginInline: "auto" }}>
        <SettingsPageHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          theme={theme}
          onBack={handleHeaderBack}
          backTitle={t("settings.back", "Retour")}
          onTitleClick={tab === "menu" ? handleSettingsTitleSecretTap : undefined}
        />
      </div>

      <div style={{ width: "100%", maxWidth: 520, marginInline: "auto", paddingInline: 12 }}>
        <PageAdBanner placement="settings" slotKey={`page-settings-${tab}-under-header`} />
        {tab === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SettingsMenuCard
              title="Awena"
              titleNode={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, textTransform: "none", letterSpacing: 0.3 }}>
                  <img src={AWENA_AVATAR} alt="Awena" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${theme.primary}`, boxShadow: `0 0 8px ${theme.primary}55` }} />
                  <span style={{ fontFamily: AWENA_TITLE_FONT, fontSize: 24, fontWeight: 700 }}>Awena</span>
                </span>
              }
              subtitle={L("Présentatrice officielle, assistante interactive, voix locale et comportement en jeu.", "Official presenter, interactive assistant, local voice and in-game behavior.", "Presentadora oficial, asistente interactiva, voz local y comportamiento durante el juego.")}
              theme={theme}
              rightHint={L("IA LOCALE", "LOCAL AI", "IA LOCAL")}
              onClick={() => setTab("awena")}
            />

            <SettingsMenuCard
              title={t("settings.menu.sport", L("Choix de sport", "Sport selection", "Selección de deporte"))}
              subtitle={t("settings.menu.sport.sub", L("Changer de jeu, réinitialiser le choix (hub au démarrage).", "Change sport and reset the startup selection hub.", "Cambia de deporte y restablece la selección del inicio."))}
              theme={theme}
              onClick={() => setTab("sport")}
            />
            <SettingsMenuCard
              title={t("settings.menu.account", L("Compte", "Account", "Cuenta"))}
              subtitle={L("Compte/profil regroupés, notifications locales et zone dangereuse simplifiée.", "Account/profile, local notifications and simplified danger zone.", "Cuenta/perfil, notificaciones locales y zona de riesgo simplificada.")}
              theme={theme}
              onClick={() => setTab("account")}
            />
            <SettingsMenuCard
              title={t("settings.menu.lang", L("Langues", "Languages", "Idiomas"))}
              subtitle={t("settings.menu.lang.sub", L("Choisis la langue de l’interface et explore la carte linguistique.", "Choose the interface language and explore the language map.", "Elige el idioma de la interfaz y explora el mapa lingüístico."))}
              theme={theme}
              onClick={() => setTab("lang")}
            />
            <SettingsMenuCard
              title={L("SAUVEGARDE", "BACKUP", "COPIA DE SEGURIDAD")}
              subtitle={L("Backup NAS, synchronisation, restauration et scan des blocs valides sur une seule page.", "NAS backup, synchronization, restore and valid-block scan on one page.", "Copia NAS, sincronización, restauración y escaneo de bloques válidos en una sola página.")}
              theme={theme}
              onClick={() => go?.("storage_vault")}
            />
            <SettingsMenuCard
              title={t("settings.menu.theme", L("Thème", "Theme", "Tema"))}
              subtitle={t("settings.menu.theme.sub", L("Packs de thèmes, aperçu en direct et sélection rapide.", "Theme packs, live preview and quick selection.", "Packs de temas, vista previa en directo y selección rápida."))}
              theme={theme}
              onClick={() => setTab("theme")}
            />
            <SettingsMenuCard
              title={t("settings.menu.audio", "AUDIO")}
              subtitle={t("settings.menu.audio.sub", L("Musiques de fond, ordre des pistes, volumes, bruitages de partie et intro.", "Background music, track order, volumes, game effects and intro.", "Música de fondo, orden, volúmenes, efectos e intro."))}
              theme={theme}
              rightHint={getAudioPreferences().masterEnabled ? "ON" : "OFF"}
              onClick={() => setTab("audio")}
            />
            <SettingsMenuCard
              title={t("settings.menu.castViewer", "Cast / Viewer")}
              subtitle={L("Cast TV, Viewer tablette et réglages d’écran dans une interface simplifiée.", "Cast TV, tablet Viewer and screen settings in a simplified interface.", "Cast TV, Viewer para tableta y ajustes de pantalla en una interfaz simplificada.")}
              theme={theme}
              onClick={() => go?.("cast_host", { screenTab: "settings" })}
            />
            <SettingsMenuCard
              title={L("PUBLICITÉ", "ADVERTISING", "PUBLICIDAD")}
              subtitle={L("Bannières, fin de partie et consentement AdMob.", "Banners, end-of-game ads and AdMob consent.", "Banners, anuncios de fin de partida y consentimiento AdMob.")}
              theme={theme}
              rightHint="FREE / PREMIUM"
              onClick={() => setTab("advertising")}
            />
            <SettingsMenuCard
              title={L("BOUTIQUE", "STORE", "TIENDA")}
              subtitle={L("Premium, packs additionnels et achats Google Play.", "Premium, add-on packs and Google Play purchases.", "Premium, packs adicionales y compras de Google Play.")}
              theme={theme}
              onClick={() => { setShopInitialTab("premium"); setShopFocusPackId(null); setTab("shop"); }}
            />
            <SettingsMenuCard
              title={L("CONFIDENTIALITÉ & DONNÉES", "PRIVACY & DATA", "PRIVACIDAD Y DATOS")}
              subtitle={L("Politique de confidentialité, droits, contact et suppression du compte.", "Privacy policy, rights, contact and account deletion.", "Política de privacidad, derechos, contacto y eliminación de la cuenta.")}
              theme={theme}
              rightHint="RGPD / PLAY"
              onClick={() => setTab("privacy")}
            />
            {developerVisible ? (
              <SettingsMenuCard
                title={t("settings.menu.developer", L("Développeur", "Developer", "Desarrollador"))}
                subtitle={L("Diagnostic, tests, simulations, push NAS, logs et sécurité technique.", "Diagnostics, tests, simulations, NAS push, logs and technical security.", "Diagnóstico, pruebas, simulaciones, push NAS, registros y seguridad técnica.")}
                theme={theme}
                onClick={() => setTab("developer")}
              />
            ) : null}
            <div style={{ height: 10 }} />
          </div>
        )}

        {tab === "account" && <AccountPages go={go} onFullReset={handleFullReset} page={accountPage} setPage={setAccountPage} />}

        {tab === "advertising" && <MonetizationSettingsPanel mode="advertising" />}

        {tab === "shop" && <MonetizationSettingsPanel mode="shop" initialShopTab={shopInitialTab} focusPackId={shopFocusPackId} />}

        {tab === "privacy" && <PrivacyDataSection onOpenAccount={() => { setAccountPage("account_menu"); setTab("account"); }} />}

        {tab === "awena" && <AwenaSettingsSection />}

        {tab === "theme" && <ThemeSection />}
        {tab === "lang" && (
          <SettingsLanguageSection
            theme={theme}
            lang={lang}
            t={t}
            L={L}
            languageCarouselBrowseIndexRef={languageCarouselBrowseIndexRef}
            applyLanguage={applyLanguage}
          />
        )}
        {tab === "audio" && <StartupIntroSection />}
        {tab === "sport" && <SportSection />}
        {tab === "castViewer" && <CastViewerSettingsSection go={go} />}
        {tab === "developer" && <DeveloperSection />}
        {tab === "general" && <NasBackupSection />}
      </div>
    </div>
  );
}

export default Settings;
