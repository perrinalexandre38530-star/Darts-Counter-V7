// @ts-nocheck
// ============================================
// src/pages/TournamentView.tsx
// Tournois (LOCAL) — View (multi-visuals) — V5 (PATCH COMPLET)
//
// ✅ UI (demandes):
// - Header type "capture 2": retour à gauche, titre centré, icônes à droite (simulate/delete)
// - Top tabs: icônes ONLY (1 ligne)
// - Titre d’onglet (page) en gros centré sous les tabs
// - Supprime "Simuler prochain match" (déjà un bouton simuler par match)
// - Fix labels matchs poules: "Poule A • Round 1" (plus de KO label sur poules)
// - TAB "Tableau": sous-onglets "Vue" (bracket coupe du monde) / "Détails" (vue actuelle)
//
// ✅ BRACKET "VUE" (DEMANDÉ PAR TOI):
// - Afficher UNIQUEMENT : avatars + drapeaux + traits qui relient (comme ta capture FIFA)
// - Aucun bouton / aucun texte / aucune carte de match dans "Vue"
// - Traits propres (SVG) + layout stable
//
// ✅ DÉTAILS (FIX demandé):
// - Centrage vertical "en escalier" des colonnes (comme Vue) => SEULEMENT dans "Détails"
// - Afficher les scores sur les matchs terminés (badge overlay + ton scoreText existant)
//
// ✅ Fix IMPORTANT:
// - Evite les doublons de matchs KO (dédup par id)
// - Evite l’erreur "16 matchs en huitièmes" due à mauvais filtrage KO (phase/stage)
//
// ✅ FIX BUG CRITIQUE (doublons poules après simulation):
// - Certains matchs reviennent avec groupIndex/groupId/phase/stageIndex undefined
//   => rrMatchesByGroup met alors gi=0 par défaut => tout part en Poule A.
//
// ✅ Solution robuste (FINAL):
//  1) mergeStableMatchMeta: merge anti-undefined + verrouillage depuis l’état précédent
//  2) stableMetaRef: snapshot par match.id des meta structurelles
//     - IMPORTANT: snapshot "UPGRADABLE" : si stable manque une clé et qu’on la voit plus tard, on la complète
//     - MAIS on ne remplace jamais une valeur stable déjà connue
//  3) persist: merged -> applyStableMeta -> updateStableMetaFromMatches (pour capturer les nouvelles meta propres)
// ============================================

import React from "react";
import QRCode from "qrcode";
import MatchDetailCard from "../components/tournament/MatchDetailCard";
import type { Store } from "../lib/types";
import type { Tournament, TournamentMatch } from "../lib/tournaments/types";
import { PageAdBanner } from "../monetization/AdSlot";
import ChallengePlay from "./ChallengePlay";
import { getChallengeObjectiveImage } from "../lib/challengeObjectiveVisuals";

import { startMatch, submitResult, buildInitialMatches } from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
  deleteTournamentLocal,
  deleteMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

import { History } from "../lib/history";
import { getOnlineCompetition, updateOnlineCompetition } from "../lib/tournaments/onlineStore";
import { listFriends, searchUsers, sendPrivateMessage, type OnlineFriendUser } from "../lib/friendsApi";
import { useAuthOnline } from "../hooks/useAuthOnline";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  id: string;
  sharedEntry?: boolean;
};

const BYE = "__BYE__";
const TBD = "__TBD__";

const THEME = "#ffcf57";
const TAB_COLORS: Record<string, string> = {
  home: "#ffcf57",
  pools: "#42e6a4",
  standings: "#7fe2a9",
  bracket: "#4fb4ff",
  matches: "#ff4fd8",
  repechage: "#ff8f2b",
  linked: "#ffd56a",
  stats: "#b6b6ff",
  admin: "#ff6b6b",
  objectives: "#ffb54a",
  my: "#22e6ff",
};

const ADMIN_PERMISSION_DEFS = [
  { key: "identity", label: "Identité & état" },
  { key: "participants", label: "Participants" },
  { key: "invitations", label: "Invitations / inscriptions" },
  { key: "rules", label: "Règles" },
  { key: "schedule", label: "Calendrier / journées" },
  { key: "results", label: "Résultats / essais" },
  { key: "admins", label: "Administrateurs" },
] as const;

const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_DEFS.map((item) => item.key);


const CHALLENGE_VIEW_CSS = `
.chv-page{--chv-surface:#060b12;--chv-surface-2:#08101a;--chv-line:rgba(255,255,255,.085);--chv-muted:#8d9aac;--chv-gold:#ffcf73;--chv-cyan:#22e6ff;--chv-green:#65e6a2;--chv-orange:#ffb54a;}
.chv-page .chv-panel{border:1px solid var(--chv-line);background:linear-gradient(180deg,rgba(7,12,20,.995),rgba(4,8,14,.995));border-radius:18px;padding:13px;box-shadow:0 14px 34px rgba(0,0,0,.28);min-width:0;}
.chv-page .chv-panel-soft{border:1px solid rgba(255,255,255,.07);background:#070d15;border-radius:14px;padding:10px;min-width:0;}
.chv-page .chv-grid-main{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:10px;align-items:start;}
.chv-page .chv-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
.chv-page .chv-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
.chv-page .chv-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;}
.chv-page .chv-kpi{min-width:0;border:1px solid rgba(255,255,255,.07);background:#070d15;border-radius:13px;padding:9px 7px;text-align:center;}
.chv-page .chv-kpi b{display:block;font-size:18px;line-height:1.05;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chv-page .chv-kpi span{display:block;margin-top:4px;font-size:7px;font-weight:1000;letter-spacing:.45px;color:#8d9aac;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.chv-page .chv-eyebrow{font-size:7.2px;font-weight:1000;letter-spacing:.8px;color:#8d9aac;text-transform:uppercase;}
.chv-page .chv-title{font-size:13px;font-weight:1000;color:#f7f9fc;line-height:1.15;}
.chv-page .chv-sub{font-size:8.2px;line-height:1.45;color:#8d9aac;}
.chv-page .chv-status{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:#09111b;font-size:7px;font-weight:1000;white-space:nowrap;}
.chv-page .chv-action{min-height:35px;border-radius:10px;padding:0 11px;font-size:8px;font-weight:1000;color:#fff;cursor:pointer;}
.chv-page .chv-action:disabled{opacity:.35;cursor:default;}
.chv-page .chv-rows{display:grid;gap:5px;}
.chv-page .chv-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:center;min-width:0;padding:8px 9px;border:1px solid rgba(255,255,255,.065);background:#070d15;border-radius:10px;}
.chv-page .chv-row-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:950;}
.chv-page .chv-row-sub{display:block;margin-top:2px;font-size:7px;color:#7f8b9a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.chv-page .chv-objective-row{grid-template-columns:32px minmax(0,1fr) auto auto;}
.chv-page .chv-objective-strip{display:flex;gap:6px;overflow-x:auto;padding:2px 1px 6px;scrollbar-width:thin;}
.chv-page .chv-objective-chip{position:relative;flex:0 0 auto;min-width:62px;min-height:36px;border-radius:11px;padding:5px 28px 5px 9px;border:1px solid rgba(255,255,255,.09);background:#070d15;color:#dce5ef;font-size:8px;font-weight:1000;cursor:pointer;overflow:hidden;}
.chv-page .chv-objective-chip .chv-objective-thumb{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:23px;height:22px;opacity:.9;pointer-events:none;}
.chv-page .chv-objective-thumb{display:inline-flex;align-items:center;justify-content:center;width:28px;height:26px;flex:0 0 auto;overflow:hidden;}
.chv-page .chv-objective-thumb img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.72));}
.chv-page .chv-objective-hero-thumb{width:54px;height:48px;padding:3px;border-radius:11px;border:1px solid rgba(255,181,74,.16);background:#050a10;}
.chv-page .chv-objective-chip[data-active="true"]{border-color:rgba(255,181,74,.52);background:linear-gradient(180deg,rgba(83,48,8,.96),rgba(36,22,7,.96));color:#ffcf73;box-shadow:0 0 18px rgba(255,181,74,.11);}
.chv-page .chv-progress{height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;}
.chv-page .chv-progress>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ffb54a,#65e6a2);}
.chv-page .chv-activity{display:grid;grid-template-columns:68px minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.055);}
.chv-page .chv-activity:last-child{border-bottom:0;}
.chv-page .chv-podium{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;align-items:end;}
.chv-page .chv-podium>div{min-width:0;border:1px solid rgba(255,255,255,.07);background:#080f18;border-radius:12px;padding:8px;text-align:center;}
.chv-page .chv-podium>div:first-child{border-color:rgba(255,207,115,.28);background:linear-gradient(180deg,rgba(64,45,9,.90),#080f18);}
.chv-page .chv-section-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:9px;}
.chv-page .chv-divider{height:1px;background:rgba(255,255,255,.065);margin:9px 0;}
.chv-page .chv-admin-group{border:1px solid rgba(255,255,255,.075);background:#060b12;border-radius:15px;overflow:hidden;}
.chv-page .chv-admin-group>summary{cursor:pointer;list-style:none;padding:10px 12px;font-size:8.5px;font-weight:1000;letter-spacing:.55px;color:#c8d1dc;background:#08101a;border-bottom:1px solid transparent;}
.chv-page .chv-admin-group>summary::-webkit-details-marker{display:none}.chv-page .chv-admin-group>summary:after{content:"＋";float:right;color:#7f8b99}.chv-page .chv-admin-group[open]>summary{border-bottom-color:rgba(255,255,255,.06);color:#ffcf73}.chv-page .chv-admin-group[open]>summary:after{content:"−"}.chv-page .chv-admin-group>section{border:0!important;border-radius:0!important;margin:0!important;background:#050a10!important;}
.chv-page .chv-main-tabs{display:flex;align-items:stretch;gap:5px;overflow-x:auto;overflow-y:hidden;padding:3px 1px 6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch;width:100%;}
.chv-page .chv-main-tab{flex:0 0 auto;min-width:58px;height:43px;border-radius:12px;border:1px solid rgba(255,255,255,.075);background:#070d15;color:#aeb8c4;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 8px;cursor:pointer;white-space:nowrap;}
.chv-page .chv-main-tab span{display:grid;place-items:center;flex:0 0 auto}.chv-page .chv-main-tab b{font-size:7.1px;font-weight:1000;letter-spacing:.15px;}
.chv-page .chv-main-tab[data-active="true"]{color:#fff;border-color:color-mix(in srgb,var(--tab-accent) 62%,transparent);background:linear-gradient(180deg,color-mix(in srgb,var(--tab-accent) 17%,#09111b),#070d15);box-shadow:0 0 16px color-mix(in srgb,var(--tab-accent) 18%,transparent);}
.chv-page .chv-main-tab[data-active="true"] b{color:var(--tab-accent)}
.chv-page .chv-view-context{margin:3px 0 9px;padding:0 3px;display:flex;align-items:baseline;justify-content:center;gap:7px;text-align:center;min-height:18px;}
.chv-page .chv-view-context b{font-size:11px;font-weight:1000}.chv-page .chv-view-context span{font-size:7.3px;color:#7f8b99;line-height:1.25;}
.chv-page .chv-help{padding:0!important;overflow:hidden}.chv-page .chv-help>summary{cursor:pointer;list-style:none;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.chv-page .chv-help>summary::-webkit-details-marker{display:none}.chv-page .chv-help>summary:after{content:"＋";color:#7f8b99;font-size:12px}.chv-page .chv-help[open]>summary:after{content:"−"}.chv-page .chv-help-body{padding:0 11px 11px;display:grid;gap:7px;}
.chv-page .chv-roster-more{margin-top:7px;border:1px solid rgba(255,255,255,.065);background:#060b12;border-radius:11px;overflow:hidden}.chv-page .chv-roster-more>summary{cursor:pointer;list-style:none;padding:8px 10px;font-size:7.7px;font-weight:1000;color:#9ba8b7;text-align:center}.chv-page .chv-roster-more>summary::-webkit-details-marker{display:none}.chv-page .chv-roster-more[open]>summary{color:#ffcf73;border-bottom:1px solid rgba(255,255,255,.05)}
.chv-page .chv-danger{border-color:rgba(255,79,120,.22)!important;background:linear-gradient(180deg,#13080d,#090609)!important;}
@media (max-width:780px){.chv-page .chv-grid-main,.chv-page .chv-grid-2{grid-template-columns:1fr}.chv-page .chv-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.chv-page .chv-grid-3{grid-template-columns:1fr}.chv-page .chv-panel{padding:11px;border-radius:16px}.chv-page .chv-row{grid-template-columns:30px minmax(0,1fr) auto}.chv-page .chv-objective-row{grid-template-columns:28px minmax(0,1fr) auto}.chv-page .chv-objective-row .chv-play{grid-column:2/4;width:100%;min-height:32px}.chv-page .chv-activity{grid-template-columns:58px minmax(0,1fr) auto}.chv-page .chv-main-tabs{overflow:visible;display:grid;grid-template-columns:repeat(auto-fit,minmax(54px,1fr));gap:5px;padding-bottom:4px}.chv-page .chv-main-tab{min-width:0;width:100%;height:42px;padding:0 4px;gap:3px}.chv-page .chv-main-tab b{font-size:6.35px}.chv-page .chv-main-tab.chv-secondary-tab{display:none}.chv-page .chv-more-nav{display:block}.chv-page .chv-view-context{justify-content:flex-start;text-align:left;padding-left:2px}.chv-page .chv-view-context span{display:none}.chv-page .chv-quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.chv-page .chv-personal-focus{grid-template-columns:42px minmax(0,1fr)!important}.chv-page .chv-personal-focus .chv-personal-action{grid-column:1/3;width:100%}}

.chv-page .chv-more-nav{display:none;position:relative;min-width:0}.chv-page .chv-more-nav>summary{list-style:none;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.075);background:#070d15;color:#aeb8c4;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 4px;cursor:pointer;font-size:6.35px;font-weight:1000}.chv-page .chv-more-nav>summary::-webkit-details-marker{display:none}.chv-page .chv-more-nav[open]>summary{border-color:rgba(34,230,255,.35);color:#22e6ff}.chv-page .chv-more-menu{position:absolute;right:0;top:47px;z-index:40;width:min(210px,72vw);padding:7px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:#050a11;box-shadow:0 18px 38px rgba(0,0,0,.55);display:grid;gap:5px}.chv-page .chv-more-item{min-height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.07);background:#08101a;color:#dce5ef;display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:7px;padding:0 9px;text-align:left;cursor:pointer;font-size:8px;font-weight:1000}.chv-page .chv-more-item[data-active="true"]{border-color:rgba(34,230,255,.35);background:rgba(8,35,58,.95);color:#fff}.chv-page .chv-tab-badge{min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#111b27;color:#fff;display:inline-grid;place-items:center;font-size:6px;font-weight:1000;border:1px solid rgba(255,255,255,.09)}.chv-page .chv-quick-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}.chv-page .chv-quick-action{min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.075);background:#070d15;color:#fff;padding:7px 8px;display:grid;grid-template-columns:24px minmax(0,1fr);gap:7px;align-items:center;text-align:left;cursor:pointer}.chv-page .chv-quick-action b{font-size:7.8px;line-height:1.1}.chv-page .chv-quick-action span{display:block;margin-top:2px;font-size:6.4px;color:#84909e;line-height:1.2}.chv-page .chv-personal-focus{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px;border-radius:13px;border:1px solid rgba(34,230,255,.18);background:linear-gradient(180deg,rgba(5,25,32,.96),#060b12);margin-bottom:9px}.chv-page .chv-result-scope{display:grid;grid-template-columns:1fr 1fr;gap:6px}.chv-page .chv-result-scope button{min-height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#070d15;color:#8d9aac;font-size:7.5px;font-weight:1000}.chv-page .chv-result-scope button[data-active="true"]{border-color:rgba(34,230,255,.38);background:rgba(8,35,58,.92);color:#22e6ff}.chv-page .chv-highlight-me{border-color:rgba(34,230,255,.22)!important;background:linear-gradient(180deg,rgba(5,24,31,.97),#070d15)!important}
@media (min-width:980px){.chv-page{max-width:1180px;margin-left:auto;margin-right:auto}.chv-page .chv-panel{padding:14px}.chv-page .chv-objective-chip{min-width:72px}}
`;

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}
function isVoidByeMatch(m: any) {
  return isByeId(m?.aPlayerId) && isByeId(m?.bPlayerId);
}
function isByeMatch(m: any) {
  if (!m) return false;
  if (isVoidByeMatch(m)) return true;
  return isByeId(m?.aPlayerId) || isByeId(m?.bPlayerId);
}
function otherIdIfBye(m: any) {
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (isByeId(a) && !isByeId(b) && b && !isTbdId(b)) return b;
  if (isByeId(b) && !isByeId(a) && a && !isTbdId(a)) return a;
  return "";
}
function isRealPlayable(m: any) {
  if (!m) return false;
  if (String(m.status || "") !== "pending") return false;
  if (!m?.aPlayerId || !m?.bPlayerId) return false;
  if (isTbdId(m.aPlayerId) || isTbdId(m.bPlayerId)) return false;
  if (isByeId(m.aPlayerId) || isByeId(m.bPlayerId)) return false;
  if (isVoidByeMatch(m)) return false;
  return true;
}

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

// ------------------------------------------------------------
// ✅ PÉTANQUE SCORE HELPERS (tournoi)
// - Score peut venir de match.payload / match.summary
// - OU du storage History via match.historyMatchId
// ------------------------------------------------------------
type PetScore = { a: number; b: number };
type ScoreMap = Record<string, PetScore>;

function isPetanqueTournament(tour: any): boolean {
  const raw =
    tour?.game?.mode ||
    tour?.mode ||
    tour?.gameKey ||
    tour?.type ||
    tour?.format?.game ||
    tour?.config?.mode ||
    "";
  const mode = String(raw || "").toLowerCase().trim();
  return mode === "petanque" || mode.includes("petanque");
}

function extractPetanqueScoreFromMatch(m: any): PetScore | null {
  if (!m) return null;

  // 1) payload direct
  const p = m?.payload;
  const k1 = String(p?.kind || "").toLowerCase();
  if (k1 === "petanque") {
    const a = Number(p?.scoreA);
    const b = Number(p?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  // 2) summary direct
  const s = m?.summary;
  const k2 = String(s?.kind || "").toLowerCase();
  if (k2 === "petanque") {
    const a = Number(s?.scoreA);
    const b = Number(s?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  // 3) payload.summary
  const ps = p?.summary;
  const k3 = String(ps?.kind || "").toLowerCase();
  if (k3 === "petanque") {
    const a = Number(ps?.scoreA);
    const b = Number(ps?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  return null;
}

/* -------------------------
   Neon Icons (inline SVG)
-------------------------- */
function Icon({ name, color = THEME }: any) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const stroke = color;
  const sw = 2.2;

  if (name === "back")
    return (
      <svg {...common}>
        <path d="M15 6 9 12l6 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  if (name === "trash")
    return (
      <svg {...common}>
        <path d="M4 7h16" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M10 11v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M14 11v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M6 7l1 14h10l1-14" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M9 7V4h6v3" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "play")
    return (
      <svg {...common}>
        <path d="M9 7v10l10-5-10-5Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "home")
    return (
      <svg {...common}>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "pools")
    return (
      <svg {...common}>
        <path d="M7 7h10v4H7V7Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M5 18h6v-4H5v4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M13 18h6v-4h-6v4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "standings")
    return (
      <svg {...common}>
        <path d="M6 20V10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M12 20V4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M18 20v-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "bracket")
    return (
      <svg {...common}>
        <path d="M6 6h6v5H6V6Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M12 8h6v5h-6" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M12 10h3v8h-3" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M6 13h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "matches")
    return (
      <svg {...common}>
        <path d="M7 7h10M7 12h10M7 17h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path
          d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "repechage")
    return (
      <svg {...common}>
        <path d="M6 7h9a4 4 0 0 1 0 8H8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M9 9 6 7l3-2" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M8 15h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "target")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth={sw} />
        <circle cx="12" cy="12" r="2.5" stroke={stroke} strokeWidth={sw} />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" stroke={stroke} strokeWidth={sw} />
        <path d="M5.5 20c.7-4.2 3-6.3 6.5-6.3s5.8 2.1 6.5 6.3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "results")
    return (
      <svg {...common}>
        <path d="M6 5h12v14H6z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="m8.5 10 1.8 1.8 3.2-3.4M9 15h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  if (name === "admin")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  return (
    <svg {...common}>
      <path d="M5 19V5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M9 19v-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M13 19v-11" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M17 19v-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------
   Top Tabs NEON (1 ligne + ICONES ONLY)
-------------------------- */
function NeonTopTabsIconsOnly({ tabs, activeKey, onChange }: any) {
  const iconMap: Record<string, string> = {
    home: "home",
    pools: "pools",
    standings: "standings",
    bracket: "bracket",
    matches: "matches",
    repechage: "repechage",
    linked: "results",
    stats: "stats",
    admin: "admin",
    objectives: "target",
    my: "user",
  };

  return (
    <div
      className="dc-scroll-thin"
      style={{
        marginTop: 10,
        display: "flex",
        gap: 10,
        alignItems: "center",
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: 6,
        WebkitOverflowScrolling: "touch",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {(tabs || []).map((k: string) => {
        const accent = TAB_COLORS[k] || THEME;
        const active = activeKey === k;

        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            style={{
              flex: "0 0 auto",
              width: 34,
              height: 34,
              borderRadius: 999,
              border: active ? `1px solid ${accent}CC` : "1px solid rgba(255,255,255,0.10)",
              background: active
                ? `radial-gradient(120% 180% at 20% 0%, ${accent}2a, rgba(0,0,0,0.25)), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))`
                : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              cursor: "pointer",
              boxShadow: active ? `0 0 16px ${accent}33` : "none",
              display: "grid",
              placeItems: "center",
            }}
            title={k}
            aria-label={k}
          >
            <span aria-hidden style={{ filter: active ? `drop-shadow(0 0 10px ${accent}66)` : "none" }}>
              <Icon name={iconMap[k] || "stats"} color={accent} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChallengeTopNav({ tabs, activeKey, onChange, labels, badges = {} }: any) {
  const iconMap: Record<string, string> = {
    home: "home", my: "user", objectives: "target", standings: "standings", linked: "results", stats: "stats", admin: "admin",
  };
  const short: Record<string, string> = { home: "Accueil", my: "Jouer", objectives: "Objectifs", standings: "Classement", linked: "Résultats", stats: "Stats", admin: "Admin" };
  const primaryKeys = new Set(["home", "my", "objectives", "standings"]);
  const primary = (tabs || []).filter((k: string) => primaryKeys.has(k));
  const secondary = (tabs || []).filter((k: string) => !primaryKeys.has(k));
  const secondaryActive = secondary.includes(activeKey);
  const renderDirect = (k: string, secondaryTab = false) => {
    const accent = TAB_COLORS[k] || THEME;
    const active = activeKey === k;
    const badge = Number(badges?.[k] || 0);
    return <button key={k} type="button" role="tab" aria-selected={active} data-active={active ? "true" : "false"} className={`chv-main-tab${secondaryTab ? " chv-secondary-tab" : ""}`} onClick={() => onChange(k)} style={{"--tab-accent": accent} as React.CSSProperties} title={labels?.[k] || short[k] || k}>
      <span aria-hidden style={{filter:active?`drop-shadow(0 0 8px ${accent}55)`:"none"}}><Icon name={iconMap[k] || "stats"} color={active ? accent : "#8d9aac"} /></span>
      <b>{short[k] || labels?.[k] || k}</b>
      {badge>0?<i className="chv-tab-badge" style={{fontStyle:"normal",color:active?accent:"#aeb8c4"}}>{badge>99?"99+":badge}</i>:null}
    </button>;
  };
  return (
    <div className="chv-main-tabs dc-scroll-thin" role="tablist" aria-label="Navigation Challenge">
      {primary.map((k: string) => renderDirect(k, false))}
      {secondary.map((k: string) => renderDirect(k, true))}
      {secondary.length ? <details className="chv-more-nav">
        <summary><Icon name={secondaryActive ? (iconMap[activeKey] || "stats") : "stats"} color={secondaryActive ? (TAB_COLORS[activeKey] || "#22e6ff") : "#8d9aac"}/><b>{secondaryActive ? (short[activeKey] || labels?.[activeKey] || "Plus") : "Plus"}</b></summary>
        <div className="chv-more-menu">{secondary.map((k: string) => {
          const active = activeKey === k;
          const accent = TAB_COLORS[k] || THEME;
          const badge = Number(badges?.[k] || 0);
          return <button key={`more-${k}`} type="button" className="chv-more-item" data-active={active ? "true" : "false"} onClick={(event) => { onChange(k); const details=(event.currentTarget.closest("details") as HTMLDetailsElement|null); if(details) details.open=false; }}><Icon name={iconMap[k] || "stats"} color={active ? accent : "#8d9aac"}/><span>{labels?.[k] || short[k] || k}</span>{badge>0?<i className="chv-tab-badge" style={{fontStyle:"normal",color:active?accent:"#aeb8c4"}}>{badge>99?"99+":badge}</i>:null}</button>;
        })}</div>
      </details> : null}
    </div>
  );
}

/* -------------------------
   UI building blocks
-------------------------- */
function Pill({ active, label, onClick, accent = "#ffcf57" }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        borderRadius: 999,
        padding: "7px 12px",
        border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, ${accent}, ${accent}CC)`
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: active ? "#1b1508" : "rgba(255,255,255,0.92)",
        fontWeight: active ? 950 : 850,
        fontSize: 12.2,
        cursor: "pointer",
        boxShadow: active ? `0 10px 22px ${accent}25` : "none",
        whiteSpace: "nowrap",
      }}
      title={label}
    >
      {label}
    </button>
  );
}

function Card({ title, subtitle, badge, children, accent = "#ffcf57", icon }: any) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,0.08), transparent 55%), linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {icon ? (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 30% 0%, ${accent}, ${accent}55)`,
                color: "#150d06",
                fontWeight: 950,
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 950,
                letterSpacing: 0.3,
                color: accent,
                textShadow: `0 0 10px ${accent}40`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            {subtitle ? <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35 }}>{subtitle}</div> : null}
          </div>
        </div>
        {badge}
      </div>

      {children ? <div style={{ marginTop: 12, overflow: "hidden" }}>{children}</div> : null}
    </div>
  );
}

function MiniBadge({ label, value, accent = "#ffcf57" }: any) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${accent}55`,
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.04))`,
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      <span style={{ opacity: 0.75, fontWeight: 850, fontSize: 11.5 }}>{label}</span>
      <span style={{ color: accent, textShadow: `0 0 10px ${accent}30` }}>{value}</span>
    </div>
  );
}

function AvatarCircle({ name, avatarUrl, size = 30, dim }: any) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        opacity: dim ? 0.65 : 1,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ fontWeight: 950, fontSize: Math.max(11, Math.floor(size * 0.4)) }}>{getInitials(name)}</div>
      )}
    </div>
  );
}

function PlayerPill({ name, avatarUrl, dim, extra }: any) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, opacity: dim ? 0.6 : 1 }}>
      <AvatarCircle name={name} avatarUrl={avatarUrl} size={30} dim={dim} />
      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name || "Joueur"}
        </div>
        {extra ? (
          <div
            style={{
              fontSize: 11,
              opacity: 0.75,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   ✅ FIX BUG POOLS/KO (merge meta stable)
   ============================================================ */
function mergeStableMatchMeta(prevMatches: any[], nextMatches: any[]) {
  const prevById = new Map<string, any>();
  for (const pm of Array.isArray(prevMatches) ? prevMatches : []) {
    const id = String(pm?.id || "");
    if (!id) continue;
    const cur = prevById.get(id);
    if (!cur || (pm?.updatedAt ?? 0) >= (cur?.updatedAt ?? 0)) prevById.set(id, pm);
  }

  const STABLE_KEYS = [
    "phase",
    "stageIndex",
    "stage",
    "groupIndex",
    "groupId",
    "group",
    "roundIndex",
    "orderIndex",
    "bracketIndex",
    "bracketSide",
  ];

  const out: any[] = [];
  const seen = new Set<string>();

  for (const nm of Array.isArray(nextMatches) ? nextMatches : []) {
    const id = String(nm?.id || "");
    if (!id) continue;

    if (seen.has(id)) continue;
    seen.add(id);

    const pm = prevById.get(id);

    const merged: any = pm ? { ...pm } : {};
    for (const [k, v] of Object.entries(nm || {})) {
      if (v !== undefined) merged[k] = v;
    }

    if (pm) {
      for (const k of STABLE_KEYS) {
        const pv = pm?.[k];
        if (pv !== undefined && pv !== null) merged[k] = pv;
      }

      if (typeof pm?.groupIndex === "number") merged.groupIndex = pm.groupIndex;
      if (pm?.groupId != null) merged.groupId = pm.groupId;

      if (String(pm?.phase || "") === "ko") merged.phase = "ko";
      if (pm?.stageIndex === 1) merged.stageIndex = 1;
    }

    out.push(merged);
  }

  return out;
}

function scoreText(m: any) {
  const sc = getMatchScore(m);
  if (!sc) return "";
  return `${sc.a} - ${sc.b}`;
}

function koTourLabel(roundIndex: number, totalRounds: number) {
  const remaining = totalRounds - roundIndex;
  if (remaining <= 1) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quart de finale";
  if (remaining === 4) return "Huitième de finale";
  return `Tour ${roundIndex + 1}`;
}

function matchPhaseLabel(m: any, viewKind: string, koRoundsCount: number) {
  const isGroupLike =
    String(m?.phase || "") === "groups" || (typeof m?.groupIndex === "number" && m.groupIndex >= 0);

  if (isGroupLike) {
    const g = typeof m?.groupIndex === "number" ? m.groupIndex : null;
    const gLabel = g != null ? `Poule ${String.fromCharCode(65 + g)}` : null;
    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
    return [gLabel, `Round ${r + 1}`].filter(Boolean).join(" • ");
  }

  if (viewKind.includes("ko") || viewKind === "groups_ko") {
    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
    return koTourLabel(r, koRoundsCount);
  }

  const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
  return `Round ${r + 1}`;
}

function matchPhaseShortLabel(m: any, viewKind: string, koRoundsCount: number) {
  const isGroupLike =
    String(m?.phase || "") === "groups" || (typeof m?.groupIndex === "number" && m.groupIndex >= 0);

  if (isGroupLike) {
    const g = typeof m?.groupIndex === "number" ? m.groupIndex : null;
    return g != null ? `Poule ${String.fromCharCode(65 + g)}` : "Poule";
  }

  return matchPhaseLabel(m, viewKind, koRoundsCount);
}

function pickFirstDefined(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

function resolveSourceMatchForTbdSide(allMatches: any[], current: any, side: "a" | "b"): any | null {
  const directKeysA = ["aFromMatchId", "fromMatchIdA", "prevMatchIdA", "sourceMatchIdA", "feederMatchIdA"];
  const directKeysB = ["bFromMatchId", "fromMatchIdB", "prevMatchIdB", "sourceMatchIdB", "feederMatchIdB"];

  const direct = pickFirstDefined(current, side === "a" ? directKeysA : directKeysB);
  if (direct) {
    const f = allMatches.find((m) => String(m?.id) === String(direct));
    if (f) return f;
  }

  const currentId = String(current?.id || "");
  if (!currentId) return null;

  const candidates = allMatches.filter((m) => {
    const next = pickFirstDefined(m, ["nextMatchId", "nextId", "winnerToMatchId", "toMatchId"]);
    if (!next) return false;
    return String(next) === currentId;
  });

  if (!candidates.length) return null;

  const bySide = candidates.find((m) => {
    const slot = pickFirstDefined(m, ["nextSlot", "toSlot", "winnerToSlot", "slot"]);
    if (!slot) return false;
    const s = String(slot).toLowerCase();
    return side === "a" ? s.includes("a") || s.includes("left") : s.includes("b") || s.includes("right");
  });

  return bySide || candidates[0] || null;
}

function WinnerPlaceholder({ label, leftAvatarUrl, leftName, rightAvatarUrl, rightName }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: -8, flex: "0 0 auto" }}>
        <div style={{ marginRight: -8, zIndex: 2 }}>
          <AvatarCircle name={leftName} avatarUrl={leftAvatarUrl} size={26} />
        </div>
        <AvatarCircle name={rightName} avatarUrl={rightAvatarUrl} size={26} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {leftName} vs {rightName}
        </div>
      </div>
    </div>
  );
}

function renderPlayerOrTbd(allMatches: any[], current: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? current?.aPlayerId : current?.bPlayerId || "");
  if (!pid) return <PlayerPill name="TBD" dim />;

  if (isByeId(pid)) return <PlayerPill name="BYE" dim />;

  if (!isTbdId(pid)) {
    const pl = playersById[pid];
    return <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatarDataUrl || pl?.avatar || pl?.avatarUrl || null} />;
  }

  const feeder = resolveSourceMatchForTbdSide(allMatches, current, side);
  if (!feeder) return <PlayerPill name="Vainqueur du match précédent" dim />;

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  const leftName = pa?.name || (isByeId(fa) ? "BYE" : isTbdId(fa) ? "TBD" : "Joueur");
  const rightName = pb?.name || (isByeId(fb) ? "BYE" : isTbdId(fb) ? "TBD" : "Joueur");
  const label = `Vainqueur match`;

  return (
    <WinnerPlaceholder
      label={label}
      leftName={leftName}
      leftAvatarUrl={pa?.avatarDataUrl || pa?.avatar || pa?.avatarUrl || null}
      rightName={rightName}
      rightAvatarUrl={pb?.avatarDataUrl || pb?.avatar || pb?.avatarUrl || null}
    />
  );
}

function computeStandings(groupPlayerIds: string[], groupMatches: any[], winPoints = 2) {
  const rows: Record<
    string,
    { id: string; played: number; wins: number; losses: number; points: number; scored: number; conceded: number }
  > = {};
  for (const pid of groupPlayerIds) rows[pid] = { id: pid, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

  for (const m of groupMatches) {
    if (m?.status !== "done") continue;

    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;
    if (isByeId(a) || isByeId(b)) continue;
    if (isTbdId(a) || isTbdId(b)) continue;

    if (!rows[a]) rows[a] = { id: a, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
    if (!rows[b]) rows[b] = { id: b, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += winPoints;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += winPoints;
    }
  }

  const arr = Object.values(rows);
  arr.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    const diff1 = r1.scored - r1.conceded;
    const diff2 = r2.scored - r2.conceded;
    if (diff2 !== diff1) return diff2 - diff1;
    return r2.wins - r1.wins;
  });
  return arr;
}

/* -------------------------
   STATS
-------------------------- */
function computeTournamentStats(playersById: Record<string, any>, matches: any[]) {
  const rows: Record<string, any> = {};
  const ids = Object.keys(playersById || {});
  for (const pid of ids) {
    rows[pid] = { id: pid, name: playersById[pid]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };
  }

  const done = (matches || []).filter((m) => String(m?.status) === "done" && !isByeMatch(m) && !isVoidByeMatch(m));

  for (const m of done) {
    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;

    if (!rows[a]) rows[a] = { id: a, name: playersById[a]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };
    if (!rows[b]) rows[b] = { id: b, name: playersById[b]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const list = Object.values(rows).map((r: any) => {
    const diff = r.scored - r.conceded;
    const winrate = r.played ? Math.round((r.wins / r.played) * 100) : 0;
    return { ...r, diff, winrate };
  });

  list.sort((a: any, b: any) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);

  const global = {
    totalMatches: (matches || []).filter((m) => !isVoidByeMatch(m)).length,
    doneMatches: done.length,
    runningMatches: (matches || []).filter((m) => ["running", "playing"].includes(String(m?.status || ""))).length,
    playableMatches: (matches || []).filter((m) => isRealPlayable(m)).length,
    players: ids.length,
  };

  const leaders = {
    points: list[0] || null,
    wins: [...list].sort((a: any, b: any) => b.wins - a.wins || b.winrate - a.winrate)[0] || null,
    diff: [...list].sort((a: any, b: any) => b.diff - a.diff || b.points - a.points)[0] || null,
    scored: [...list].sort((a: any, b: any) => b.scored - a.scored || b.points - a.points)[0] || null,
  };

  return { global, list, leaders };
}


/* -------------------------
   PARTIES HISTORIQUES LIÉES À UNE LIGUE
-------------------------- */
function linkedSafeLower(v: any) {
  return String(v ?? "").toLowerCase().trim();
}

function getHistoryRowId(rec: any) {
  return String(rec?.id ?? rec?.matchId ?? rec?.historyMatchId ?? "").trim();
}

function getHistoryRowTime(rec: any) {
  const n = Number(rec?.updatedAt ?? rec?.createdAt ?? rec?.summary?.finishedAt ?? rec?.payload?.updatedAt ?? rec?.payload?.createdAt ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getHistoryRowStatus(rec: any) {
  const raw = linkedSafeLower(rec?.status ?? rec?.summary?.status ?? rec?.payload?.status);
  if (raw === "finished" || raw === "done" || raw === "termine" || raw === "terminé") return "finished";
  if (rec?.winnerId || rec?.summary?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId) return "finished";
  if (Array.isArray(rec?.summary?.rankings) || Array.isArray(rec?.payload?.summary?.rankings) || Array.isArray(rec?.payload?.rankings)) return "finished";
  if (raw === "in_progress" || raw === "playing" || raw === "running") return "in_progress";
  return raw || "finished";
}

function getHistoryMode(rec: any) {
  const raw =
    rec?.kind ??
    rec?.mode ??
    rec?.game?.mode ??
    rec?.game?.kind ??
    rec?.summary?.mode ??
    rec?.summary?.kind ??
    rec?.summary?.game?.mode ??
    rec?.payload?.kind ??
    rec?.payload?.mode ??
    rec?.payload?.game?.mode ??
    rec?.payload?.config?.mode ??
    rec?.payload?.summary?.kind ??
    rec?.payload?.summary?.mode ??
    "";
  return linkedSafeLower(raw);
}

function normalizeHistorySport(v: any) {
  const raw = linkedSafeLower(v);
  if (!raw) return "";
  if (["darts", "x01", "cricket", "shanghai", "killer", "clock", "scram", "golf"].includes(raw)) return "darts";
  if (["babyfoot", "baby-foot", "foosball", "baby_foot"].includes(raw)) return "babyfoot";
  if (["petanque", "pétanque", "boules"].includes(raw)) return "petanque";
  if (["pingpong", "ping-pong", "table_tennis", "table-tennis"].includes(raw)) return "pingpong";
  if (["molkky", "mölkky"].includes(raw)) return "molkky";
  if (["dice", "dicegame", "dés", "des"].includes(raw)) return "dicegame";
  return raw;
}

function getTournamentSport(tour: any) {
  return normalizeHistorySport(
    tour?.sport ??
      tour?.competitionSport ??
      tour?.game?.rules?.sport ??
      tour?.meta?.forceMode ??
      tour?.game?.mode ??
      tour?.mode ??
      "darts"
  ) || "darts";
}

function getHistorySport(rec: any) {
  return normalizeHistorySport(
    rec?.sport ??
      rec?.competitionSport ??
      rec?.game?.sport ??
      rec?.summary?.sport ??
      rec?.payload?.sport ??
      rec?.payload?.game?.sport ??
      getHistoryMode(rec)
  );
}

function getLeagueFormatForLinkedHistory(tour: any) {
  const f = linkedSafeLower(tour?.game?.rules?.leagueFormat ?? tour?.meta?.leagueFormat ?? tour?.leagueFormat ?? tour?.format);
  const s = linkedSafeLower(tour?.game?.rules?.scoringMode ?? tour?.meta?.scoringMode ?? tour?.scoringMode);
  const mf = linkedSafeLower(tour?.meta?.format);
  if (f === "multi" || s === "rank_points" || mf === "league_multi") return "multi";
  if (f === "free" || mf === "league_free") return "free";
  if (f === "return") return "return";
  if (f === "simple") return "simple";
  return f || "";
}

function getHistoryRawModeText(rec: any) {
  return [
    rec?.kind,
    rec?.mode,
    rec?.variant,
    rec?.game?.mode,
    rec?.game?.kind,
    rec?.summary?.mode,
    rec?.summary?.kind,
    rec?.summary?.game?.mode,
    rec?.payload?.kind,
    rec?.payload?.mode,
    rec?.payload?.variant,
    rec?.payload?.gameMode,
    rec?.payload?.game?.mode,
    rec?.payload?.config?.mode,
    rec?.payload?.summary?.kind,
    rec?.payload?.summary?.mode,
  ].filter(Boolean).map((x: any) => linkedSafeLower(x)).join("|");
}

function getHistoryParticipantCount(rec: any) {
  const players = getHistoryPlayers(rec);
  const ranking = getHistoryRanking(rec);
  const n = Math.max(
    Array.isArray(players) ? players.length : 0,
    Array.isArray(ranking) ? ranking.length : 0,
    Number(rec?.playersCount || 0),
    Number(rec?.summary?.playersCount || 0),
    Number(rec?.payload?.playersCount || 0),
    Number(rec?.payload?.summary?.playersCount || 0)
  );
  return Number.isFinite(n) ? n : 0;
}

function getHistoryX01Kind(rec: any): "multi" | "duo" | "x01" | "other" {
  const mode = getHistoryMode(rec);
  const raw = getHistoryRawModeText(rec);
  const isTraining = raw.includes("training_x01") || raw.includes("training-x01") || raw.includes("training");
  if (isTraining) return "other";
  const isX01 = mode === "x01" || raw.includes("x01");
  if (!isX01) return "other";
  const count = getHistoryParticipantCount(rec);
  if (count > 2) return "multi";
  if (count === 2) return "duo";
  return "x01";
}

function getHistoryLinkedDisplayMode(rec: any) {
  const x01Kind = getHistoryX01Kind(rec);
  if (x01Kind === "multi") return "x01 multi";
  if (x01Kind === "duo") return "x01 duo";
  return getHistoryMode(rec);
}

function isHistoryCompatibleWithTournament(rec: any, tour: any) {
  const ts = getTournamentSport(tour);
  const hs = getHistorySport(rec);
  if (ts && hs && ts !== hs) return false;

  const leagueFormat = getLeagueFormatForLinkedHistory(tour);
  if (ts === "darts" && leagueFormat === "multi") {
    // Une Ligue MULTI est alimentée par des parties libres X01 MULTI uniquement.
    // On exclut donc les X01 DUO affichés dans l'historique.
    return getHistoryX01Kind(rec) === "multi";
  }
  if (ts === "darts" && leagueFormat === "free") {
    // Une Saison libre classique est alimentée par des matchs X01 DUO uniquement.
    return getHistoryX01Kind(rec) === "duo";
  }

  const tMode = linkedSafeLower(tour?.game?.mode ?? tour?.mode ?? "");
  const hMode = getHistoryMode(rec);
  if (!tMode || !hMode) return true;
  if (tMode === hMode) return true;
  if (normalizeHistorySport(tMode) === normalizeHistorySport(hMode)) return true;
  if (normalizeHistorySport(tMode) === "darts" && normalizeHistorySport(hMode) === "darts") return true;
  return false;
}

function getHistoryPlayers(rec: any) {
  const sources = [
    rec?.players,
    rec?.summary?.players,
    rec?.payload?.players,
    rec?.payload?.summary?.players,
    rec?.payload?.config?.players,
    rec?.payload?.state?.players,
  ];
  const map = new Map<string, any>();
  for (const src of sources) {
    if (!Array.isArray(src)) continue;
    for (const p of src) {
      const id = String(p?.id ?? p?.playerId ?? p?.profileId ?? p?.uid ?? p?.name ?? "").trim();
      if (!id) continue;
      const prev = map.get(id) || {};
      map.set(id, {
        ...prev,
        ...p,
        id,
        name: p?.name ?? p?.displayName ?? p?.nickname ?? p?.label ?? prev?.name ?? id,
        avatarDataUrl: p?.avatarDataUrl ?? p?.avatar ?? p?.avatarUrl ?? p?.photo ?? p?.image ?? prev?.avatarDataUrl ?? null,
        avatarUrl: p?.avatarUrl ?? p?.avatarDataUrl ?? p?.avatar ?? p?.photo ?? p?.image ?? prev?.avatarUrl ?? null,
        avatar: p?.avatarDataUrl ?? p?.avatar ?? p?.avatarUrl ?? p?.photo ?? p?.image ?? prev?.avatar ?? null,
        isBot: !!(p?.isBot || p?.bot || prev?.isBot),
      });
    }
  }
  return Array.from(map.values());
}

function getHistoryRanking(rec: any) {
  const candidates = [
    rec?.summary?.rankings,
    rec?.summary?.ranking,
    rec?.summary?.classification,
    rec?.payload?.summary?.rankings,
    rec?.payload?.summary?.ranking,
    rec?.payload?.ranking,
    rec?.payload?.rankings,
    rec?.payload?.finalRanking,
    rec?.payload?.result?.rankings,
    rec?.payload?.state?.ranking,
  ];
  const players = getHistoryPlayers(rec);
  const byId = new Map(players.map((p: any) => [String(p.id), p]));

  for (const raw of candidates) {
    if (!Array.isArray(raw) || !raw.length) continue;
    const out = raw
      .map((r: any, idx: number) => {
        const id = String(r?.id ?? r?.playerId ?? r?.profileId ?? r?.pid ?? r?.uid ?? r?.name ?? "").trim();
        if (!id) return null;
        const p = byId.get(id) || {};
        const rank = Math.max(1, Math.floor(Number(r?.rank ?? r?.place ?? r?.position ?? idx + 1) || idx + 1));
        return {
          ...p,
          ...r,
          id,
          playerId: id,
          rank,
          name: r?.name ?? p?.name ?? id,
          score: r?.score ?? r?.points ?? r?.remaining ?? r?.total ?? null,
          avatarDataUrl: r?.avatarDataUrl ?? r?.avatar ?? r?.avatarUrl ?? p?.avatarDataUrl ?? p?.avatar ?? null,
          avatarUrl: r?.avatarUrl ?? r?.avatarDataUrl ?? r?.avatar ?? p?.avatarUrl ?? null,
          avatar: r?.avatarDataUrl ?? r?.avatar ?? r?.avatarUrl ?? p?.avatar ?? null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Number(a.rank || 0) - Number(b.rank || 0));
    if (out.length) return out;
  }

  // Fallback 1v1 : vainqueur puis autre joueur.
  const winnerId = String(rec?.winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.winnerId ?? rec?.payload?.summary?.winnerId ?? "").trim();
  if (winnerId && players.length >= 2) {
    const rest = players.filter((p: any) => String(p.id) !== winnerId);
    const win = players.find((p: any) => String(p.id) === winnerId) || { id: winnerId, name: winnerId };
    return [win, ...rest].map((p: any, idx: number) => ({ ...p, playerId: String(p.id), rank: idx + 1 }));
  }

  return players.map((p: any, idx: number) => ({ ...p, playerId: String(p.id), rank: idx + 1 }));
}

function getHistoryScorePair(rec: any, aId: string, bId: string) {
  const s = rec?.summary || rec?.payload?.summary || rec?.payload || {};
  const directA = Number(s?.scoreA ?? s?.setsA ?? s?.legsA ?? s?.result?.scoreA ?? s?.result?.a ?? rec?.scoreA ?? rec?.setsA ?? rec?.legsA);
  const directB = Number(s?.scoreB ?? s?.setsB ?? s?.legsB ?? s?.result?.scoreB ?? s?.result?.b ?? rec?.scoreB ?? rec?.setsB ?? rec?.legsB);
  if (Number.isFinite(directA) && Number.isFinite(directB)) return { a: Math.floor(directA), b: Math.floor(directB) };
  const winnerId = String(rec?.winnerId ?? s?.winnerId ?? "");
  if (winnerId && winnerId === aId) return { a: 1, b: 0 };
  if (winnerId && winnerId === bId) return { a: 0, b: 1 };
  return { a: 1, b: 0 };
}

function getRankPointsForTournament(tour: any) {
  const raw = tour?.game?.rules?.rankPoints ?? tour?.meta?.rankPoints ?? tour?.rankPoints ?? [];
  if (Array.isArray(raw)) return raw.map((x: any) => Math.max(0, Math.floor(Number(x) || 0))).filter((x: number) => Number.isFinite(x));
  if (typeof raw === "string") return raw.split(/[;,|\s]+/).map((x) => Math.max(0, Math.floor(Number(x) || 0))).filter((x) => Number.isFinite(x));
  return [10, 8, 6, 4, 2, 1];
}

function isLeagueMultiTournament(tour: any) {
  const f = linkedSafeLower(tour?.game?.rules?.leagueFormat ?? tour?.meta?.leagueFormat ?? tour?.format);
  const s = linkedSafeLower(tour?.game?.rules?.scoringMode ?? tour?.meta?.scoringMode ?? tour?.scoringMode);
  return f === "multi" || s === "rank_points" || linkedSafeLower(tour?.meta?.format) === "league_multi";
}

function getLeagueMultiEndPenalty(rank: number, totalPlayers: number) {
  const r = Math.max(1, Math.floor(Number(rank) || 1));
  const total = Math.max(0, Math.floor(Number(totalPlayers) || 0));
  if (total < 3 || r <= 1) return 0;
  const fromLast = total - r;
  if (fromLast === 0) return 5;
  if (fromLast === 1) return 3;
  if (fromLast === 2) return 1;
  return 0;
}

function getLeagueMultiRankPoints(tour: any, rank: number, totalPlayers: number) {
  const r = Math.max(1, Math.floor(Number(rank) || 1));
  const base = Math.max(0, Number(getRankPointsForTournament(tour)[r - 1] ?? 0) || 0);
  const malus = getLeagueMultiEndPenalty(r, totalPlayers);
  return Math.max(0, base - malus);
}

function getSeasonFreeRankPoints(rank: number) {
  return Math.max(1, Math.floor(Number(rank) || 1)) === 1 ? 3 : 0;
}

function getLinkedPointsAwarded(link: any, tour: any) {
  const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
  const leagueFormat = getLeagueFormatForLinkedHistory(tour);

  if (ranking.length && leagueFormat === "multi") {
    const total = ranking.length;
    return ranking
      .map((r: any, idx: number) => {
        const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
        const base = Math.max(0, Number(getRankPointsForTournament(tour)[rank - 1] ?? 0) || 0);
        const malus = getLeagueMultiEndPenalty(rank, total);
        return {
          playerId: String(r?.playerId ?? r?.id ?? ""),
          name: r?.name || "Joueur",
          rank,
          basePoints: base,
          malus,
          points: Math.max(0, base - malus),
        };
      })
      .filter((r: any) => r.playerId);
  }

  if (ranking.length && leagueFormat === "free") {
    return ranking
      .map((r: any, idx: number) => {
        const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
        return {
          playerId: String(r?.playerId ?? r?.id ?? ""),
          name: r?.name || "Joueur",
          rank,
          basePoints: getSeasonFreeRankPoints(rank),
          malus: 0,
          points: getSeasonFreeRankPoints(rank),
        };
      })
      .filter((r: any) => r.playerId);
  }

  return Array.isArray(link?.pointsAwarded) ? link.pointsAwarded : [];
}

function normalizeChallengeObjective(value: any) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "bull25" || v === "bull50" || v === "bull") return "bull";
  if (v === "any-double" || v === "double" || v === "doubles") return "any-double";
  if (v === "any-triple" || v === "triple" || v === "triples") return "any-triple";
  return v || "20";
}

function challengeObjectiveLabel(value: any) {
  const v = normalizeChallengeObjective(value);
  return v === "any-double" ? "DOUBLES" : v === "any-triple" ? "TRIPLES" : v === "bull" ? "BULL" : v;
}

function ChallengeObjectiveThumb({ objective, className = "", title = "" }: { objective: any; className?: string; title?: string }) {
  return <span className={`chv-objective-thumb ${className}`.trim()} aria-hidden="true" title={title || challengeObjectiveLabel(objective)}>
    <img src={getChallengeObjectiveImage(objective)} alt="" />
  </span>;
}

function historyChallengeObjective(rec: any) {
  return normalizeChallengeObjective(rec?.payload?.config?.target ?? rec?.config?.target ?? rec?.game?.target ?? rec?.summary?.target ?? rec?.payload?.summary?.target ?? rec?.objective ?? "20");
}

function buildLinkedHistoryEntry(rec: any, tour: any) {
  const historyMatchId = getHistoryRowId(rec);
  const ranking = getHistoryRanking(rec).map((r: any, idx: number) => ({ ...r, rank: Math.max(1, Number(r?.rank || idx + 1) || idx + 1) }));
  const pointsAwarded = getLinkedPointsAwarded({ ranking }, tour);

  return {
    id: `linked_${historyMatchId}`,
    historyMatchId,
    matchId: historyMatchId,
    source: "history",
    linkedAt: Date.now(),
    createdAt: getHistoryRowTime(rec) || Date.now(),
    mode: getHistoryMode(rec) || tour?.game?.mode || "x01",
    sport: getHistorySport(rec) || getTournamentSport(tour),
    status: "linked",
    label: `${String(getHistoryMode(rec) || tour?.game?.mode || "match").toUpperCase()} • ${formatDate(getHistoryRowTime(rec))}`,
    players: getHistoryPlayers(rec),
    ranking,
    pointsAwarded,
    challengeObjective: String(getHistoryMode(rec) || "").toLowerCase() === "challenge" ? historyChallengeObjective(rec) : null,
  };
}

function getPlayedCount(row: any) {
  return Math.max(0, Number(row?.played ?? ((Number(row?.wins || 0) + Number(row?.losses || 0)))) || 0);
}

function getPointsAverage(row: any) {
  const played = getPlayedCount(row);
  if (!played) return 0;
  return (Number(row?.points || 0) || 0) / played;
}

function roundPointsAverage(value: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function formatPointsAverage(value: number) {
  const n = roundPointsAverage(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(1).replace(/\.0$/, "");
}

function getPodiumCount(row: any, averageMode = false) {
  const explicit =
    Number(row?.podium ?? row?.podiums ?? row?.top3 ?? row?.topThree ?? row?.podiumCount ?? NaN);
  if (Number.isFinite(explicit)) return Math.max(0, Math.floor(explicit));

  // Saison libre / DUO : une partie à 2 joueurs place forcément les deux joueurs dans le TOP 3.
  // Pour les anciennes lignes sans champ podium, on retombe donc sur le nombre de matchs joués.
  if (averageMode) return getPlayedCount(row);

  return 0;
}

function PodiumHeaderIcon({ color = "#7fe2a9" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Podium" style={{ display: "block" }}>
      <path d="M10 7h4v13h-4V7Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 12h4v8H4v-8Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 10h4v10h-4V10Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 3.5l.78 1.58 1.74.25-1.26 1.23.3 1.73L12 7.47l-1.56.82.3-1.73-1.26-1.23 1.74-.25L12 3.5Z" fill={color} />
    </svg>
  );
}

const AVERAGE_STANDINGS_MIN_PLAYED = 2;

function sortAverageStandingsRows(rows: any[]) {
  return (Array.isArray(rows) ? rows.slice() : []).sort((a: any, b: any) => {
    const avgDiff = getPointsAverage(b) - getPointsAverage(a);
    if (Math.abs(avgDiff) > 0.000001) return avgDiff;
    if ((Number(b?.points || 0) || 0) !== (Number(a?.points || 0) || 0)) return (Number(b?.points || 0) || 0) - (Number(a?.points || 0) || 0);
    if (getPodiumCount(b, true) !== getPodiumCount(a, true)) return getPodiumCount(b, true) - getPodiumCount(a, true);
    if ((Number(b?.wins || 0) || 0) !== (Number(a?.wins || 0) || 0)) return (Number(b?.wins || 0) || 0) - (Number(a?.wins || 0) || 0);
    return ((Number(b?.scored || 0) || 0) - (Number(b?.conceded || 0) || 0)) - ((Number(a?.scored || 0) || 0) - (Number(a?.conceded || 0) || 0));
  });
}

function withPointsAverage(rows: any[]) {
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    ...r,
    pointsAverage: roundPointsAverage(getPointsAverage(r)),
    pointsPerMatch: roundPointsAverage(getPointsAverage(r)),
    ptMoy: roundPointsAverage(getPointsAverage(r)),
  }));
}

function computeLinkedMultiStandings(tour: any, linkedMatches: any[]) {
  const rows: Record<string, any> = {};
  const players = Array.isArray(tour?.players) ? tour.players : [];
  for (const p of players) {
    const id = String(p?.id || "");
    if (!id) continue;
    rows[id] = { id, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0, podium: 0, podiums: 0, top3: 0 };
  }

  for (const link of Array.isArray(linkedMatches) ? linkedMatches : []) {
    const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
    const pointsAwarded = getLinkedPointsAwarded(link, tour);
    const pointsById = new Map(pointsAwarded.map((x: any) => [String(x?.playerId || ""), Number(x?.points || 0)]));
    const count = ranking.length;
    ranking.forEach((r: any, idx: number) => {
      const id = String(r?.playerId ?? r?.id ?? "");
      if (!id) return;
      if (!rows[id]) rows[id] = { id, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0, podium: 0, podiums: 0, top3: 0 };
      const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
      rows[id].played += 1;
      if (rank === 1) rows[id].wins += 1;
      if (rank > 1) rows[id].losses += 1;
      if (rank <= 3) {
        rows[id].podium = (Number(rows[id].podium || 0) || 0) + 1;
        rows[id].podiums = (Number(rows[id].podiums || 0) || 0) + 1;
        rows[id].top3 = (Number(rows[id].top3 || 0) || 0) + 1;
      }
      rows[id].points += Number(pointsById.get(id) ?? 0) || 0;
      rows[id].scored += Math.max(0, count - rank + 1);
      rows[id].conceded += Math.max(0, rank - 1);
    });
  }

  return sortAverageStandingsRows(withPointsAverage(Object.values(rows)));
}

/* -------------------------
   KO DETAILS (Détails)
-------------------------- */
function getMatchScore(m: any) {
  if (!m) return null;

  const a =
    (typeof m?.scoreA === "number" ? m.scoreA : null) ??
    (typeof m?.aScore === "number" ? m.aScore : null) ??
    (typeof m?.setsA === "number" ? m.setsA : null) ??
    (typeof m?.legsA === "number" ? m.legsA : null) ??
    (typeof m?.result?.a === "number" ? m.result.a : null) ??
    (typeof m?.score?.a === "number" ? m.score.a : null) ??
    null;

  const b =
    (typeof m?.scoreB === "number" ? m.scoreB : null) ??
    (typeof m?.bScore === "number" ? m.bScore : null) ??
    (typeof m?.setsB === "number" ? m.setsB : null) ??
    (typeof m?.legsB === "number" ? m.legsB : null) ??
    (typeof m?.result?.b === "number" ? m.result.b : null) ??
    (typeof m?.score?.b === "number" ? m.score.b : null) ??
    null;

  if (a != null && b != null) return { a, b };
  return null;
}

function ScoreBadge({ score }: { score: { a: number; b: number } | null }) {
  if (!score) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(10,12,16,0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
        fontSize: 12,
        fontWeight: 950,
        letterSpacing: 0.2,
        color: "rgba(255,255,255,0.92)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {score.a}–{score.b}
    </div>
  );
}

function WorldCupKoDetailsColumns({
  koMatches,
  renderMatchCard,
  getScore,
}: {
  koMatches: any[];
  renderMatchCard: (m: any) => React.ReactNode;
  getScore: (m: any) => { a: number; b: number } | null;
}) {
  if (!koMatches?.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>;

  const CARD_H = 138;
  const GAP = 12;
  const PAD_T = 8;

  const rounds = Array.from(new Set(koMatches.map((m) => Number(m.roundIndex ?? 0)))).sort((a, b) => a - b);
  const byRound: Record<number, any[]> = {};
  for (const r of rounds) byRound[r] = [];
  for (const m of koMatches) byRound[Number(m.roundIndex ?? 0)].push(m);
  for (const r of rounds) byRound[r].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const maxLen = Math.max(...rounds.map((r) => (byRound[r] || []).length), 1);

  return (
    <div className="dc-scroll-thin" style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", paddingBottom: 10, width: "100%", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
        {rounds.map((r) => {
          const items = byRound[r] || [];
          const missing = maxLen - items.length;
          const offset = PAD_T + (missing * (CARD_H + GAP)) / 2;

          return (
            <div
              key={r}
              style={{
                flex: "0 0 auto",
                width: 292,
                paddingTop: Math.max(0, offset),
                paddingBottom: PAD_T,
                display: "grid",
                gridAutoRows: `${CARD_H}px`,
                gap: GAP,
              }}
            >
              {items.map((m) => {
                const sc = getScore(m);
                return (
                  <div key={m.id} style={{ position: "relative", minHeight: CARD_H }}>
                    <div style={{ height: "100%" }}>{renderMatchCard(m)}</div>
                    <ScoreBadge score={sc} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------
   BRACKET (Vue)
-------------------------- */
function flagEmojiFromISO(code?: string) {
  const cc = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  const first = A + (cc.charCodeAt(0) - base);
  const second = A + (cc.charCodeAt(1) - base);
  return String.fromCodePoint(first, second);
}

function BracketAvatar({ player, dim }: any) {
  const name = player?.name || "Joueur";
  const avatar = player?.avatar || null;
  const flag = flagEmojiFromISO(player?.countryCode);

  return (
    <div style={{ position: "relative", width: 34, height: 34, opacity: dim ? 0.55 : 1 }}>
      <div style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.35))" }}>
        <AvatarCircle name={name} avatarUrl={avatar} size={34} dim={dim} />
      </div>
      {flag ? (
        <div
          title={player?.countryCode || ""}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "rgba(10,10,14,0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
          }}
        >
          {flag}
        </div>
      ) : null}
    </div>
  );
}

function resolvePlayerForSide(allMatches: any[], m: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? m?.aPlayerId : m?.bPlayerId || "");
  if (!pid) return { kind: "tbd" as const, player: null };
  if (isByeId(pid)) return { kind: "bye" as const, player: null };
  if (!isTbdId(pid)) return { kind: "player" as const, player: playersById[pid] || null };

  const feeder = resolveSourceMatchForTbdSide(allMatches, m, side);
  if (!feeder) return { kind: "tbd" as const, player: null };

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  return { kind: "feeder" as const, feederA: pa, feederB: pb };
}

function WorldCupBracketViewPure({ koMatches, playersById, allMatches, onOpenMatch }: any) {
  if (!koMatches?.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>;

  const COL_W = 86;
  const COL_GAP = 60;
  const MATCH_H = 78;
  const ROW_GAP = 22;
  const PAD_T = 12;
  const PAD_L = 12;

  const STEP = MATCH_H + ROW_GAP;

  const rounds = Array.from(new Set(koMatches.map((m: any) => Number(m.roundIndex ?? 0)))).sort((a, b) => a - b);
  const byRound: Record<number, any[]> = {};
  for (const r of rounds) byRound[r] = [];
  for (const m of koMatches) {
    const r = Number(m.roundIndex ?? 0);
    (byRound[r] ||= []).push(m);
  }
  for (const r of rounds) byRound[r].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const firstRound = rounds[0];
  const firstCount = (byRound[firstRound] || []).length;
  const canvasH = PAD_T * 2 + firstCount * MATCH_H + Math.max(0, firstCount - 1) * ROW_GAP;
  const canvasW = PAD_L * 2 + rounds.length * COL_W + Math.max(0, rounds.length - 1) * COL_GAP;

  const colX = (roundPos: number) => PAD_L + roundPos * (COL_W + COL_GAP);

  function matchTop(roundPos: number, matchIndex: number) {
    const pow = 2 ** roundPos;
    return PAD_T + ((pow - 1) / 2) * STEP + matchIndex * pow * STEP;
  }
  function matchCenterY(roundPos: number, matchIndex: number) {
    return matchTop(roundPos, matchIndex) + MATCH_H / 2;
  }

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; xm: number }> = [];
  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const r = rounds[ri];
    const nextR = rounds[ri + 1];
    const left = byRound[r] || [];
    const right = byRound[nextR] || [];

    for (let i = 0; i < left.length; i++) {
      const j = Math.floor(i / 2);
      if (!right[j]) continue;

      const x1 = colX(ri) + COL_W;
      const y1 = matchCenterY(ri, i);
      const x2 = colX(ri + 1);
      const y2 = matchCenterY(ri + 1, j);
      const xm = x1 + COL_GAP * 0.52;
      lines.push({ x1, y1, x2, y2, xm });
    }
  }

  return (
    <div className="dc-scroll-thin" style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", paddingBottom: 8 }}>
      <div style={{ position: "relative", width: canvasW, height: canvasH, margin: "0 auto" }}>
        <svg width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {lines.map((L, idx) => (
            <g key={idx}>
              <path d={`M ${L.x1} ${L.y1} L ${L.xm} ${L.y1}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <path d={`M ${L.xm} ${L.y1} L ${L.xm} ${L.y2}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <path d={`M ${L.xm} ${L.y2} L ${L.x2} ${L.y2}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <circle cx={L.xm} cy={L.y2} r={4.2} fill="rgba(79,180,255,0.65)" />
            </g>
          ))}
        </svg>

        {rounds.map((r, ri) => {
          const items = byRound[r] || [];
          return (
            <div key={r} style={{ position: "absolute", top: 0, left: colX(ri), width: COL_W, height: canvasH }}>
              {items.map((m: any, i: number) => {
                const a = resolvePlayerForSide(allMatches, m, "a", playersById);
                const b = resolvePlayerForSide(allMatches, m, "b", playersById);

                const renderSide = (s: any) => {
                  if (s.kind === "player") return <BracketAvatar player={s.player} />;
                  if (s.kind === "bye") return <BracketAvatar player={{ name: "BYE" }} dim />;
                  if (s.kind === "feeder")
                    return (
                      <div style={{ display: "flex", gap: 6 }}>
                        <BracketAvatar player={s.feederA || { name: "TBD" }} dim={!s.feederA} />
                        <BracketAvatar player={s.feederB || { name: "TBD" }} dim={!s.feederB} />
                      </div>
                    );
                  return <BracketAvatar player={{ name: "TBD" }} dim />;
                };

                return (
                  <div
                    key={m.id}
                    onClick={onOpenMatch ? () => onOpenMatch(m) : undefined}
                    role={onOpenMatch ? "button" : undefined}
                    tabIndex={onOpenMatch ? 0 : undefined}
                    onKeyDown={onOpenMatch ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenMatch(m);
                      }
                    } : undefined}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: matchTop(ri, i),
                      height: MATCH_H,
                      display: "grid",
                      placeItems: "center",
                      gap: 10,
                      cursor: onOpenMatch ? "pointer" : "default",
                    }}
                  >
                    {renderSide(a)}
                    {renderSide(b)}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ position: "absolute", top: 0, left: canvasW - PAD_L, width: PAD_L, height: canvasH }} />
      </div>
    </div>
  );
}

function StandingsTable({
  rows,
  playersById,
  accent = "#7fe2a9",
  averageMode = false,
}: {
  rows: any[];
  playersById: Record<string, any>;
  accent?: string;
  averageMode?: boolean;
}) {
  const sortedRows = averageMode ? sortAverageStandingsRows(withPointsAverage(rows || [])) : (rows || []);
  const eligibleRows = averageMode ? sortedRows.filter((r: any) => getPlayedCount(r) >= AVERAGE_STANDINGS_MIN_PLAYED) : sortedRows;
  const displayRows = averageMode && eligibleRows.length > 0 ? eligibleRows : sortedRows;
  const hiddenUnderMin = averageMode && eligibleRows.length > 0 ? Math.max(0, sortedRows.length - eligibleRows.length) : 0;
  const showDelta = !averageMode;

  const thStyle: React.CSSProperties = {
    padding: "8px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(8,10,14,0.92)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 9.5,
    lineHeight: 1,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  };
  const tdStyle: React.CSSProperties = {
    padding: "7px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 11,
    lineHeight: 1.05,
    verticalAlign: "middle",
  };
  const right: React.CSSProperties = { textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div
      className="dc-scroll-thin"
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
      }}
    >
      {averageMode ? (
        <div
          style={{
            padding: "7px 9px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(127,226,169,0.055)",
            color: "rgba(255,255,255,0.74)",
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          Classement officiel : <b style={{ color: accent }}>Pts/match</b>, 2 matchs minimum.
          {hiddenUnderMin ? <span style={{ opacity: 0.72 }}> {hiddenUnderMin} joueur(s) masqué(s).</span> : null}
        </div>
      ) : null}

      <table
        style={{
          width: "100%",
          minWidth: averageMode ? 450 : 430,
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: 30 }} />
          <col />
          {averageMode ? <col style={{ width: 52 }} /> : null}
          {averageMode ? <col style={{ width: 42 }} /> : null}
          <col style={{ width: 42 }} />
          <col style={{ width: 34 }} />
          <col style={{ width: 34 }} />
          <col style={{ width: 38 }} />
          {showDelta ? <col style={{ width: 42 }} /> : null}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Joueur</th>
            {averageMode ? <th style={{ ...thStyle, ...right, color: accent }}>Pts/m</th> : null}
            {averageMode ? (
              <th style={{ ...thStyle, ...right, color: accent }} title="Podiums : nombre de TOP 3">
                <span style={{ display: "inline-flex", justifyContent: "flex-end", width: "100%" }}><PodiumHeaderIcon color={accent} /></span>
              </th>
            ) : null}
            <th style={{ ...thStyle, ...right, color: averageMode ? "rgba(255,255,255,0.80)" : accent }}>Pts</th>
            <th style={{ ...thStyle, ...right }}>J</th>
            <th style={{ ...thStyle, ...right }}>{averageMode ? "1er" : "V"}</th>
            <th style={{ ...thStyle, ...right }}>{averageMode ? "Aut." : "D"}</th>
            {showDelta ? <th style={{ ...thStyle, ...right }}>Δ</th> : null}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r: any, idx: number) => {
            const pl = playersById[String(r.id)];
            const diff = (r.scored ?? 0) - (r.conceded ?? 0);
            const played = getPlayedCount(r);
            const avg = r?.pointsAverage ?? r?.pointsPerMatch ?? r?.ptMoy ?? getPointsAverage(r);
            const name = pl?.name || "Joueur";
            const avatarUrl = pl?.avatarDataUrl || pl?.avatar || pl?.avatarUrl || null;
            const podiumCount = getPodiumCount(r, averageMode);

            return (
              <tr key={String(r.id)}>
                <td style={{ ...tdStyle, fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.70)", fontSize: 13 }}>{idx + 1}</td>
                <td style={{ ...tdStyle, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <AvatarCircle name={name} avatarUrl={avatarUrl} size={24} />
                    <span
                      title={name}
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 10.5,
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {name}
                    </span>
                  </div>
                </td>
                {averageMode ? <td style={{ ...tdStyle, ...right, fontWeight: 1000, color: accent, fontSize: 13 }}>{formatPointsAverage(avg)}</td> : null}
                {averageMode ? <td style={{ ...tdStyle, ...right, fontWeight: 950, color: "rgba(255,255,255,0.86)" }}>{podiumCount}</td> : null}
                <td style={{ ...tdStyle, ...right, fontWeight: 950, color: averageMode ? "rgba(255,255,255,0.86)" : accent }}>{r.points ?? 0}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{played}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{r.wins ?? 0}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{r.losses ?? 0}</td>
                {showDelta ? <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{diff}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------
   MAIN
-------------------------- */
export default function TournamentView({ store, go, id, sharedEntry = false }: Props) {
  const authOnline = useAuthOnline();
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<TournamentMatch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [resultMatch, setResultMatch] = React.useState<TournamentMatch | null>(null);
  const [selectedMatch, setSelectedMatch] = React.useState<TournamentMatch | null>(null);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [attachLoading, setAttachLoading] = React.useState(false);
  const [attachRows, setAttachRows] = React.useState<any[]>([]);
  const [attachSelected, setAttachSelected] = React.useState<Record<string, boolean>>({});
  const [attachError, setAttachError] = React.useState<string>("");
  const [attachInfo, setAttachInfo] = React.useState<string>("");
  const [adminPlayerPickerOpen, setAdminPlayerPickerOpen] = React.useState(false);
  const [adminAdminPickerOpen, setAdminAdminPickerOpen] = React.useState(false);
  const [adminDraftName, setAdminDraftName] = React.useState("");
  const [adminNotice, setAdminNotice] = React.useState("");
  const [shareNotice, setShareNotice] = React.useState("");
  const [shareQrOpen, setShareQrOpen] = React.useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = React.useState("");
  const [shareQrBusy, setShareQrBusy] = React.useState(false);
  const [onlineInviteQuery, setOnlineInviteQuery] = React.useState("");
  const [onlineInvitePeople, setOnlineInvitePeople] = React.useState<OnlineFriendUser[]>([]);
  const [onlineInviteLoading, setOnlineInviteLoading] = React.useState(false);
  const [onlineInviteError, setOnlineInviteError] = React.useState("");
  const [enrollmentNotice, setEnrollmentNotice] = React.useState("");
  const [publicRefreshing, setPublicRefreshing] = React.useState(false);
  const [liveLastUpdatedAt, setLiveLastUpdatedAt] = React.useState(0);
  const [livePulseText, setLivePulseText] = React.useState("");
  const liveSnapshotRef = React.useRef<{ updatedAt: number; linkedCount: number; matchCount: number }>({ updatedAt: 0, linkedCount: 0, matchCount: 0 });
  const [activeChallengeAttempt, setActiveChallengeAttempt] = React.useState<any>(null);
  const [challengeStandingScope, setChallengeStandingScope] = React.useState<"cycle" | "season">("cycle");
  const [challengeObjectiveFocus, setChallengeObjectiveFocus] = React.useState<string>("");
  const [challengeResultsFocus, setChallengeResultsFocus] = React.useState<string>("all");
  const [challengeResultsOwner, setChallengeResultsOwner] = React.useState<"all" | "mine">("all");
  const [adminSeasonName, setAdminSeasonName] = React.useState("");
  const [adminSeasonMaxCycles, setAdminSeasonMaxCycles] = React.useState("");
  const [adminSeasonEndDate, setAdminSeasonEndDate] = React.useState("");
  const [adminChallengeAttempts, setAdminChallengeAttempts] = React.useState<number>(3);
  const [adminChallengePointsPreset, setAdminChallengePointsPreset] = React.useState<"standard"|"f1"|"linear"|"custom">("standard");
  const [adminChallengeCountBest, setAdminChallengeCountBest] = React.useState<number>(0);
  const [adminChallengePublicationMode, setAdminChallengePublicationMode] = React.useState<"all"|"round_by_round">("round_by_round");
  const [adminChallengeObjectivesPerRound, setAdminChallengeObjectivesPerRound] = React.useState<number>(1);
  const [adminChallengeCyclePointsMode, setAdminChallengeCyclePointsMode] = React.useState<"reset"|"carry"|"carry_percent">("reset");
  const [adminChallengeCarryPercent, setAdminChallengeCarryPercent] = React.useState<number>(50);
  const [adminPlayoffObjectiveMode, setAdminPlayoffObjectiveMode] = React.useState<"fixed"|"random"|"multiple">("fixed");
  const [adminPlayoffObjectives, setAdminPlayoffObjectives] = React.useState<string[]>([]);
  const [adminPlayoffAttempts, setAdminPlayoffAttempts] = React.useState<number>(1);
  const [adminPlayoffVisits, setAdminPlayoffVisits] = React.useState<number>(30);
  const [adminObjectiveToAdd, setAdminObjectiveToAdd] = React.useState<string>("1");

  // ✅ PÉTANQUE : cache score par historyMatchId
  const [petScoresByHistoryId, setPetScoresByHistoryId] = React.useState<ScoreMap>({});

  const safeMatches: TournamentMatch[] = React.useMemo(() => (Array.isArray(matches) ? matches : []), [matches]);

  // ✅ ref pour merge meta (fix bug poules après simulation)
  const matchesRef = React.useRef<TournamentMatch[]>([]);
  React.useEffect(() => {
    matchesRef.current = safeMatches;
  }, [safeMatches]);

  // ------------------------------------------------------------
  // ✅ FREEZE META STRUCTURELLE PAR match.id (FIX FINAL)
  // ------------------------------------------------------------
  const stableMetaRef = React.useRef<Map<string, any>>(new Map());

  function extractStableMeta(m: any) {
    const meta: any = {};
    // ⚠️ on stocke UNIQUEMENT les valeurs réellement définies (pas undefined / pas null)
    if (m?.phase != null) meta.phase = m.phase;
    if (m?.stageIndex != null) meta.stageIndex = m.stageIndex;
    if (m?.groupIndex != null) meta.groupIndex = m.groupIndex;
    if (m?.groupId != null) meta.groupId = m.groupId;
    if (m?.roundIndex != null) meta.roundIndex = m.roundIndex;
    if (m?.orderIndex != null) meta.orderIndex = m.orderIndex;
    return meta;
  }

  function upgradeStable(existing: any, incoming: any) {
    // ✅ On complète uniquement les clés manquantes (on ne remplace jamais une stable déjà connue)
    const out = { ...(existing || {}) };
    for (const [k, v] of Object.entries(incoming || {})) {
      if (v == null) continue;
      if (out[k] === undefined || out[k] === null) out[k] = v;
    }
    return out;
  }

  function updateStableMetaFromMatches(list: any[]) {
    const map = stableMetaRef.current;
    for (const m of Array.isArray(list) ? list : []) {
      const id = String(m?.id || "");
      if (!id) continue;
      const inc = extractStableMeta(m);
      if (!map.has(id)) map.set(id, inc);
      else map.set(id, upgradeStable(map.get(id), inc));
    }
  }

  // seed + complétion snapshot (UPGRADABLE)
  React.useEffect(() => {
    if (!safeMatches.length) return;
    updateStableMetaFromMatches(safeMatches as any[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMatches]);

  function applyStableMeta(nextMatches: any[]) {
    const map = stableMetaRef.current;
    if (!map.size) return nextMatches;

    return (Array.isArray(nextMatches) ? nextMatches : []).map((m: any) => {
      const id = String(m?.id || "");
      if (!id) return m;
      const stable = map.get(id);
      if (!stable) return m;

      const out = { ...m };
      if (stable.phase !== undefined) out.phase = stable.phase;
      if (stable.stageIndex !== undefined) out.stageIndex = stable.stageIndex;
      if (stable.groupIndex !== undefined) out.groupIndex = stable.groupIndex;
      if (stable.groupId !== undefined) out.groupId = stable.groupId;
      if (stable.roundIndex !== undefined) out.roundIndex = stable.roundIndex;
      if (stable.orderIndex !== undefined) out.orderIndex = stable.orderIndex;
      return out;
    });
  }

  // ------------------------------------------------------------
  // MATCHES VISIBLES
  // ------------------------------------------------------------
  const visibleMatches: TournamentMatch[] = React.useMemo(() => {
    return safeMatches.filter((m: any) => !isVoidByeMatch(m));
  }, [safeMatches]);

  const playersById = React.useMemo(() => {
    const out: Record<string, any> = {};
    const sources = [
      ...((((tour as any)?.players || []) as any[])),
      ...((((tour as any)?.participants || []) as any[])),
      ...((((tour as any)?.bots || []) as any[])),
    ];

    for (const p of sources) {
      const id = String(p?.id || "");
      if (!id) continue;

      const prev = out[id] || {};
      out[id] = {
        ...prev,
        ...p,
        id,
        name:
          p?.name ||
          p?.label ||
          p?.botName ||
          prev?.name ||
          "Joueur",
        avatar:
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.avatarUrl ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatar ||
          null,
        avatarDataUrl:
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.avatarUrl ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatarDataUrl ||
          null,
        avatarUrl:
          p?.avatarUrl ||
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatarUrl ||
          null,
        countryCode: p?.countryCode || prev?.countryCode || null,
        isBot: !!(p?.isBot || p?.bot || prev?.isBot),
      };
    }

    return out;
  }, [tour]);

  const activeProfileId = String((store as any)?.activeProfileId || "");
  const allProfiles = React.useMemo<any[]>(() => Array.isArray((store as any)?.profiles) ? (store as any).profiles : [], [store]);
  const activeLocalProfile = React.useMemo<any>(() => allProfiles.find((p:any)=>String(p?.id||"")===activeProfileId) || null, [allProfiles, activeProfileId]);
  const activeOnlineUserId = String((authOnline as any)?.userId || (authOnline as any)?.user?.id || activeLocalProfile?.onlineUserId || activeLocalProfile?.privateInfo?.onlineUserId || activeLocalProfile?.privateInfo?.accountUserId || "");
  const activeOnlineProfileId = String((authOnline as any)?.profile?.id || "");
  const ownerProfileId = String((tour as any)?.ownerProfileId || "");
  const ownerOnlineUserId = String((tour as any)?.ownerOnlineUserId || "");
  const adminProfileIds = React.useMemo(() => Array.from(new Set((((tour as any)?.adminProfileIds || []) as any[]).map(String).filter(Boolean))), [tour]);
  const adminIdentityIds = React.useMemo(() => Array.from(new Set([activeProfileId, activeOnlineProfileId, activeOnlineUserId].filter(Boolean))), [activeProfileId, activeOnlineProfileId, activeOnlineUserId]);
  const isCompetitionOwner = Boolean(tour && (adminIdentityIds.includes(ownerProfileId) || (!!ownerOnlineUserId && adminIdentityIds.includes(ownerOnlineUserId))));
  const currentAdminId = React.useMemo(() => adminIdentityIds.find((value)=>adminProfileIds.includes(value)) || "", [adminIdentityIds, adminProfileIds]);
  const isCompetitionAdmin = Boolean(tour && (isCompetitionOwner || Boolean(currentAdminId)));
  const adminPermissionMap = React.useMemo<Record<string,string[]>>(() => ((tour as any)?.adminPermissions && typeof (tour as any).adminPermissions === "object") ? (tour as any).adminPermissions : {}, [tour]);
  const canAdmin = React.useCallback((permission:string) => {
    if (isCompetitionOwner) return true;
    if (!currentAdminId) return false;
    const configured = adminPermissionMap[currentAdminId];
    // Legacy admins had no permission map: preserve their full access.
    if (!Array.isArray(configured)) return true;
    return configured.includes(permission);
  }, [isCompetitionOwner, currentAdminId, adminPermissionMap]);
  const tournamentPlayers = React.useMemo<any[]>(() => Array.isArray((tour as any)?.players) ? (tour as any).players : [], [tour]);
  const currentTournamentPlayer = React.useMemo<any>(() => tournamentPlayers.find((p:any)=>{
    const pid=String(p?.id||"");
    const uid=String(p?.onlineUserId||"");
    return adminIdentityIds.includes(pid) || (!!activeOnlineUserId && uid===activeOnlineUserId);
  }) || null, [tournamentPlayers, adminIdentityIds, activeOnlineUserId]);
  const availableProfiles = React.useMemo(() => {
    const used = new Set(tournamentPlayers.map((p:any)=>String(p?.id||"")));
    return allProfiles.filter((p:any)=>p?.id && !used.has(String(p.id)));
  }, [allProfiles, tournamentPlayers]);
  const availableAdmins = React.useMemo(() => {
    const merged = [...allProfiles, ...tournamentPlayers];
    const seen = new Set<string>();
    return merged.filter((p:any)=>{
      const pid=String(p?.id||"");
      if(!pid || pid===ownerProfileId || adminProfileIds.includes(pid) || seen.has(pid)) return false;
      seen.add(pid);
      return true;
    });
  }, [allProfiles, tournamentPlayers, ownerProfileId, adminProfileIds]);
  const publicSpectator = Boolean(sharedEntry && !isCompetitionAdmin && !currentTournamentPlayer);
  const enrollmentPolicy = String((tour as any)?.enrollment?.policy || (tour as any)?.meta?.enrollmentPolicy || "fixed");
  const enrollmentMax = Math.max(0, Number((tour as any)?.enrollment?.maxParticipants || (tour as any)?.meta?.enrollmentMax || 0) || 0);
  const enrollmentRequests = React.useMemo<any[]>(() => Array.isArray((tour as any)?.enrollmentRequests) ? (tour as any).enrollmentRequests : [], [tour]);
  const competitionInvitations = React.useMemo<any[]>(() => Array.isArray((tour as any)?.invitations) ? (tour as any).invitations : [], [tour]);
  const currentEnrollmentRequest = React.useMemo<any>(() => {
    if(!activeOnlineUserId) return null;
    return enrollmentRequests.find((row:any)=>String(row?.userId||"")===activeOnlineUserId && String(row?.status||"pending")!=="cancelled") || null;
  }, [enrollmentRequests, activeOnlineUserId]);
  const currentInvitation = React.useMemo<any>(() => {
    if(!activeOnlineUserId) return null;
    return competitionInvitations.find((row:any)=>String(row?.userId||"")===activeOnlineUserId && !["revoked","declined"].includes(String(row?.status||"pending"))) || null;
  }, [competitionInvitations, activeOnlineUserId]);
  const competitionFollowers = React.useMemo<any[]>(() => Array.isArray((tour as any)?.followers) ? (tour as any).followers : [], [tour]);
  const currentFollower = React.useMemo<any>(() => {
    if(!activeOnlineUserId) return null;
    return competitionFollowers.find((row:any)=>String(row?.userId||"")===activeOnlineUserId) || null;
  }, [competitionFollowers, activeOnlineUserId]);
  const competitionIsFull = Boolean(enrollmentMax > 0 && tournamentPlayers.length >= enrollmentMax);
  const isOnlineCompetition = Boolean(tour && (String((tour as any)?.source||"")==="online" || String((tour as any)?.competitionScope||"")==="online" || (tour as any)?.onlineCompetitionId));

  const linkedHistoryMatches = React.useMemo(() => {
    const raw = (tour as any)?.linkedMatches ?? (tour as any)?.meta?.linkedMatches ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [tour]);

  const challengeRules:any = (tour as any)?.game?.rules || {};
  const challengeCompetition:any = (tour as any)?.challengeCompetition || {};
  const isChallengeCompetition = String((tour as any)?.game?.mode || "").toLowerCase() === "challenge";
  const challengeCompetitionFormat = String(challengeCompetition?.format || challengeRules?.challengeCompetitionFormat || "duels");
  const isChallengePerformanceCompetition = isChallengeCompetition && challengeCompetitionFormat !== "duels";
  const challengeAttemptsPerObjective = Math.max(1, Math.min(5, Number(challengeCompetition?.attemptsPerObjective || challengeRules?.challengeAttemptsPerObjective || 3) || 3));
  const challengePointsTable:number[] = Array.isArray(challengeCompetition?.pointsTable) && challengeCompetition.pointsTable.length ? challengeCompetition.pointsTable.map((n:any)=>Math.max(0,Number(n)||0)) : Array.isArray(challengeRules?.challengePointsTable) && challengeRules.challengePointsTable.length ? challengeRules.challengePointsTable.map((n:any)=>Math.max(0,Number(n)||0)) : [25,20,16,13,11,10,9,8,7,6,5,4,3,2,1];
  const challengeCurrentCycle = Math.max(1, Number(challengeCompetition?.currentCycle || 1) || 1);

  React.useEffect(()=>{
    if(!isChallengeCompetition) return;
    const div:any=challengeCompetition?.divisions||{};
    setAdminChallengeAttempts(Math.max(1,Math.min(5,Number(challengeCompetition?.attemptsPerObjective||3)||3)));
    setAdminChallengePointsPreset((String(challengeCompetition?.pointsPreset||"standard") as any));
    setAdminChallengeCountBest(Math.max(0,Number(challengeCompetition?.countBestObjectives||0)||0));
    setAdminChallengePublicationMode(String(challengeCompetition?.schedule?.publicationMode||"round_by_round")==="all"?"all":"round_by_round");
    setAdminChallengeObjectivesPerRound(Math.max(1,Math.min(5,Number(challengeCompetition?.schedule?.objectivesPerRound||1)||1)));
    setAdminChallengeCyclePointsMode((["reset","carry","carry_percent"].includes(String(challengeCompetition?.cyclePoints?.mode))?String(challengeCompetition?.cyclePoints?.mode):"reset") as any);
    setAdminChallengeCarryPercent(Math.max(0,Math.min(100,Number(challengeCompetition?.cyclePoints?.carryPercent??50)||0)));
    setAdminPlayoffObjectiveMode((["fixed","random","multiple"].includes(String(div?.playoffObjectiveMode))?String(div?.playoffObjectiveMode):"fixed") as any);
    const po=Array.isArray(div?.playoffObjectives)&&div.playoffObjectives.length?div.playoffObjectives:[div?.playoffObjective||"20"];
    setAdminPlayoffObjectives(Array.from(new Set(po.map((value:any)=>normalizeChallengeObjective(value)).filter(Boolean))));
    setAdminPlayoffAttempts(Math.max(1,Math.min(5,Number(div?.playoffAttemptsPerObjective||1)||1)));
    setAdminPlayoffVisits(Math.max(1,Number(div?.playoffVisits||challengeRules?.visits||30)||30));
  },[(tour as any)?.id,(tour as any)?.updatedAt,challengeCompetition?.currentCycle]);

  React.useEffect(()=>{
    if(adminPlayoffObjectiveMode==="fixed"&&adminPlayoffObjectives.length>1){
      setAdminPlayoffObjectives([adminPlayoffObjectives[0]]);
    }
  },[adminPlayoffObjectiveMode]);

  const challengeObjectives = React.useMemo(()=>{
    if(!isChallengeCompetition) return [] as string[];
    const mode=String(challengeRules?.objectiveMode||"fixed");
    let values:string[]=[];
    if(mode==="range"){
      const a=Math.max(1,Math.min(20,Number(challengeRules?.objectiveRange?.from)||1));
      const b=Math.max(1,Math.min(20,Number(challengeRules?.objectiveRange?.to)||20));
      const lo=Math.min(a,b),hi=Math.max(a,b);
      values=Array.from({length:hi-lo+1},(_,i)=>String(lo+i));
    }else{
      const arr=Array.isArray(challengeRules?.objectiveTargets)?challengeRules.objectiveTargets:[];
      values=arr.length?arr:[challengeRules?.target||"20"];
    }
    return Array.from(new Set(values.map(normalizeChallengeObjective).filter(Boolean)));
  },[isChallengeCompetition,challengeRules]);

  const challengeObjectiveCatalog = React.useMemo(()=>[
    ...Array.from({length:20},(_,i)=>String(i+1)),
    "any-double","any-triple","bull"
  ],[]);
  const challengeAvailableObjectivesToAdd = React.useMemo(()=>challengeObjectiveCatalog.filter(value=>!challengeObjectives.includes(value)),[challengeObjectiveCatalog,challengeObjectives]);
  React.useEffect(()=>{
    if(challengeAvailableObjectivesToAdd.length && !challengeAvailableObjectivesToAdd.includes(adminObjectiveToAdd)){
      setAdminObjectiveToAdd(challengeAvailableObjectivesToAdd[0]);
    }
  },[challengeAvailableObjectivesToAdd,adminObjectiveToAdd]);

  const challengeObjectiveAttemptLimit = React.useCallback((objective:string)=>{
    const key=normalizeChallengeObjective(objective);
    const override=challengeCompetition?.objectiveSettings?.[key]?.attemptsPerObjective;
    return Math.max(1,Math.min(5,Number(override||challengeAttemptsPerObjective)||challengeAttemptsPerObjective));
  },[challengeCompetition,challengeAttemptsPerObjective]);

  const challengeObjectiveVisits = React.useCallback((objective:string)=>{
    const key=normalizeChallengeObjective(objective);
    const override=challengeCompetition?.objectiveSettings?.[key]?.visits;
    return Math.max(1,Math.min(200,Number(override||challengeRules?.visits||30)||30));
  },[challengeCompetition,challengeRules]);

  const challengeScheduleRounds = React.useMemo(()=>{
    const configured=Array.isArray(challengeCompetition?.schedule?.rounds)?challengeCompetition.schedule.rounds:[];
    const current=configured.filter((row:any)=>Number(row?.cycle||1)===challengeCurrentCycle);
    if(current.length) return current.slice().sort((a:any,b:any)=>Number(a?.round||0)-Number(b?.round||0));
    return challengeObjectives.map((objective,index)=>({
      id:`cycle-${challengeCurrentCycle}-round-${index+1}`,
      cycle:challengeCurrentCycle,
      round:index+1,
      objectives:[objective],
      status:"open",
      openedAt:null,
      closedAt:null,
    }));
  },[challengeCompetition,challengeCurrentCycle,challengeObjectives]);

  const challengeRoundForObjective = React.useCallback((objective:string)=>{
    const obj=normalizeChallengeObjective(objective);
    return challengeScheduleRounds.find((round:any)=>(Array.isArray(round?.objectives)?round.objectives:[]).map(normalizeChallengeObjective).includes(obj))||null;
  },[challengeScheduleRounds]);

  const challengeObjectiveIsOpen = React.useCallback((objective:string)=>{
    const round:any=challengeRoundForObjective(objective);
    return !round || String(round?.status||"open")==="open";
  },[challengeRoundForObjective]);

  const challengeLinkedMatchesCurrentCycle = React.useMemo(()=>{
    return linkedHistoryMatches.filter((link:any)=>{
      const cycle=Math.max(1,Number(link?.challengeCycle||1)||1);
      return cycle===challengeCurrentCycle;
    });
  },[linkedHistoryMatches,challengeCurrentCycle]);

  const challengeObjectiveStandings = React.useMemo(()=>{
    const out:Record<string,any[]>={};
    if(!isChallengePerformanceCompetition) return out;
    for(const objective of challengeObjectives){
      const attemptsByPlayer=new Map<string,any[]>();
      const objectiveAttemptLimit=challengeObjectiveAttemptLimit(objective);
      const relevant=challengeLinkedMatchesCurrentCycle.filter((link:any)=>normalizeChallengeObjective(link?.challengeObjective || link?.target || link?.objective)===objective).slice().sort((a:any,b:any)=>Number(a?.createdAt||0)-Number(b?.createdAt||0));
      for(const link of relevant){
        for(const row of Array.isArray(link?.ranking)?link.ranking:[]){
          const pid=String(row?.playerId||row?.id||""); if(!pid) continue;
          const score=Number(row?.score??row?.points??row?.bestScore??row?.best??0)||0;
          const tie=Number(row?.tieBreakPoints??row?.segmentSum??0)||0;
          const arr=attemptsByPlayer.get(pid)||[];
          if(arr.length<objectiveAttemptLimit){arr.push({score,tie,link});attemptsByPlayer.set(pid,arr);}
        }
      }
      const rows=Array.from(attemptsByPlayer.entries()).map(([playerId,attempts])=>{
        const best=attempts.slice().sort((a,b)=>b.score-a.score||b.tie-a.tie)[0]||{score:0,tie:0};
        return {playerId,name:playersById[playerId]?.name||"Joueur",score:best.score,tie:best.tie,attempts:attempts.length};
      }).sort((a,b)=>b.score-a.score||b.tie-a.tie||a.name.localeCompare(b.name));
      out[objective]=rows.map((row,index)=>({...row,rank:index+1,championshipPoints:Number(challengePointsTable[index]||0)}));
    }
    return out;
  },[isChallengePerformanceCompetition,challengeObjectives,challengeLinkedMatchesCurrentCycle,challengeObjectiveAttemptLimit,challengePointsTable,playersById]);

  const challengeCarryPoints = React.useMemo(()=>{
    const cycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    const current=cycles.find((row:any)=>Number(row?.cycle)===challengeCurrentCycle);
    return current?.carryPoints && typeof current.carryPoints==="object" ? current.carryPoints : {};
  },[challengeCompetition,challengeCurrentCycle]);

  const challengeGeneralStandings = React.useMemo(()=>{
    const map=new Map<string,any>();
    for(const player of tournamentPlayers){
      const playerId=String(player?.id||""); if(!playerId) continue;
      map.set(playerId,{playerId,name:player?.name||playersById[playerId]?.name||"Joueur",points:Number(challengeCarryPoints?.[playerId]||0),cyclePoints:0,carryPoints:Number(challengeCarryPoints?.[playerId]||0),wins:0,podiums:0,objectives:0});
    }
    for(const objective of challengeObjectives){
      for(const row of challengeObjectiveStandings[objective]||[]){
        const prev=map.get(row.playerId)||{playerId:row.playerId,name:row.name,points:Number(challengeCarryPoints?.[row.playerId]||0),cyclePoints:0,carryPoints:Number(challengeCarryPoints?.[row.playerId]||0),wins:0,podiums:0,objectives:0};
        prev.points+=Number(row.championshipPoints||0);
        prev.cyclePoints+=Number(row.championshipPoints||0);
        prev.objectives++;
        if(row.rank===1)prev.wins++;
        if(row.rank<=3)prev.podiums++;
        map.set(row.playerId,prev);
      }
    }
    const countBest=Math.max(0,Number(challengeCompetition?.countBestObjectives||challengeRules?.challengeCountBestObjectives||0)||0);
    if(countBest>0){
      for(const [pid,row] of map){
        const pts=challengeObjectives.map(o=>(challengeObjectiveStandings[o]||[]).find((r:any)=>r.playerId===pid)?.championshipPoints||0).sort((a,b)=>b-a).slice(0,countBest);
        row.cyclePoints=pts.reduce((a:number,b:number)=>a+Number(b||0),0);
        row.points=Number(row.carryPoints||0)+row.cyclePoints;
        map.set(pid,row);
      }
    }
    return Array.from(map.values()).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums||a.name.localeCompare(b.name)).map((row,index)=>({...row,rank:index+1}));
  },[tournamentPlayers,playersById,challengeCarryPoints,challengeObjectives,challengeObjectiveStandings,challengeCompetition,challengeRules]);

  const challengeDisplayGeneralStandings = React.useMemo(
    () => challengeGeneralStandings.filter((row:any) => Number(row?.objectives||0) > 0 || Number(row?.cyclePoints||0) > 0 || Number(row?.carryPoints||0) > 0),
    [challengeGeneralStandings]
  );

  const challengeAttemptCount = React.useCallback((playerId:string, objective:string)=>{
    const obj=normalizeChallengeObjective(objective);
    let count=0;
    for(const link of challengeLinkedMatchesCurrentCycle){
      if(normalizeChallengeObjective((link as any)?.challengeObjective || (link as any)?.target || (link as any)?.objective)!==obj) continue;
      if((Array.isArray((link as any)?.ranking)?(link as any).ranking:[]).some((row:any)=>String(row?.playerId||row?.id||"")===String(playerId))) count++;
    }
    return Math.min(challengeObjectiveAttemptLimit(obj),count);
  },[challengeLinkedMatchesCurrentCycle,challengeObjectiveAttemptLimit]);

  const launchChallengeAttempt = React.useCallback((player:any, objective:string)=>{
    if(!tour||!player) return;
    const pid=String(player?.id||"");
    const obj=normalizeChallengeObjective(objective);
    const round:any=challengeRoundForObjective(obj);
    if(round && String(round?.status||"open")!=="open"){
      setAdminNotice(`${challengeObjectiveLabel(obj)} n’est pas encore ouvert pour le cycle ${challengeCurrentCycle}.`);
      return;
    }
    const used=challengeAttemptCount(pid,obj);
    const maxAttempts=challengeObjectiveAttemptLimit(obj);
    if(used>=maxAttempts){setAdminNotice(`Essais épuisés pour ${player?.name||"ce joueur"} sur ${challengeObjectiveLabel(obj)}.`);return;}
    const rule=obj==='any-double'?'double':obj==='any-triple'?'triple':obj==='bull'?'bull':String(challengeRules?.rule||'all');
    setActiveChallengeAttempt({
      player,
      objective:obj,
      attemptNumber:used+1,
      cycle:challengeCurrentCycle,
      roundId:String(round?.id||""),
      roundNumber:Number(round?.round||0)||null,
      config:{
        target:obj,
        visits:challengeObjectiveVisits(obj),
        rule,
        playerIds:[pid],
        teamIds:[],
        participantMode:'players',
        participantSource:'direct',
        configMode:'complete',
        matchMode:'solo',
        soundsEnabled:true,
        competition:{
          tournamentId:(tour as any).id,
          name:(tour as any).name,
          objective:obj,
          attemptNumber:used+1,
          maxAttempts,
          tieBreak:String(challengeRules?.tieBreak||'segment_sum'),
          cycle:challengeCurrentCycle,
          roundId:String(round?.id||""),
          roundNumber:Number(round?.round||0)||null,
        }
      }
    });
  },[tour,challengeRules,challengeAttemptCount,challengeObjectiveAttemptLimit,challengeObjectiveVisits,challengeRoundForObjective,challengeCurrentCycle]);

  const challengeDivisionState = React.useMemo(()=>{
    const divCfg:any=challengeCompetition?.divisions||{};
    const count=Math.max(1,Number(divCfg?.count||1)||1);
    const cycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    const cycle=challengeCurrentCycle;
    const current=cycles.find((c:any)=>Number(c?.cycle)===cycle)||cycles[cycles.length-1]||null;
    const assignments:any={...(current?.assignments||{})};
    tournamentPlayers.forEach((p:any,index:number)=>{const pid=String(p?.id||'');if(pid&&assignments[pid]==null)assignments[pid]=Math.min(count,1+(index%count));});
    const policies:any=divCfg?.policies||{};
    const policyFor=(division:number)=>{
      const saved=policies[String(division)]||policies[division]||{};
      return {
        promote:division<=1?0:Math.max(0,Number(saved?.promote??divCfg?.promote??0)||0),
        relegate:division>=count?0:Math.max(0,Number(saved?.relegate??divCfg?.relegate??0)||0),
        playoff:Math.max(0,Number(saved?.playoff??divCfg?.playoffSlots??0)||0),
      };
    };
    const byDivision=Array.from({length:count},(_,i)=>{
      const division=i+1;
      const ids=tournamentPlayers.filter((p:any)=>Number(assignments[String(p?.id||'')])===division).map((p:any)=>String(p.id));
      const standings=ids.map(pid=>challengeGeneralStandings.find((r:any)=>String(r.playerId)===pid)||{playerId:pid,name:playersById[pid]?.name||'Joueur',points:0,wins:0,podiums:0,objectives:0,rank:9999}).sort((a:any,b:any)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums||String(a.name).localeCompare(String(b.name))).map((r:any,index:number)=>({...r,divisionRank:index+1}));
      return {division,standings,policy:policyFor(division)};
    });
    return {
      enabled:Boolean(divCfg?.enabled),
      count,
      cycle,
      assignments,
      byDivision,
      policies,
      promote:Math.max(0,Number(divCfg?.promote||0)||0),
      relegate:Math.max(0,Number(divCfg?.relegate||0)||0),
      pendingPlayoffs:Array.isArray(current?.pendingPlayoffs)?current.pendingPlayoffs:[],
    };
  },[challengeCompetition,challengeCurrentCycle,tournamentPlayers,challengeGeneralStandings,playersById]);

  const challengeCycleHistory = React.useMemo(()=>{
    const cycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    return cycles.filter((row:any)=>Array.isArray(row?.standingsSnapshot)&&row.standingsSnapshot.length).slice().sort((a:any,b:any)=>Number(b?.cycle||0)-Number(a?.cycle||0));
  },[challengeCompetition]);

  const challengeSeasonSettings:any = challengeCompetition?.season || {};
  const challengeSeasonStandings = React.useMemo(()=>{
    const map=new Map<string,any>();
    for(const player of tournamentPlayers){
      const playerId=String(player?.id||"");
      if(!playerId) continue;
      map.set(playerId,{playerId,name:player?.name||playersById[playerId]?.name||"Joueur",points:0,wins:0,podiums:0,cycles:0});
    }
    const archivedCycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    const archivedCycleNumbers=new Set<number>();
    for(const cycle of archivedCycles){
      const snapshot=Array.isArray(cycle?.standingsSnapshot)?cycle.standingsSnapshot:[];
      if(!snapshot.length) continue;
      archivedCycleNumbers.add(Number(cycle?.cycle||0));
      for(const row of snapshot){
        const pid=String(row?.playerId||"");
        if(!pid) continue;
        const prev=map.get(pid)||{playerId:pid,name:row?.name||playersById[pid]?.name||"Joueur",points:0,wins:0,podiums:0,cycles:0};
        prev.points+=Number(row?.cyclePoints ?? row?.points ?? 0)||0;
        prev.wins+=Number(row?.wins||0)||0;
        prev.podiums+=Number(row?.podiums||0)||0;
        prev.cycles+=1;
        map.set(pid,prev);
      }
    }
    if(!archivedCycleNumbers.has(challengeCurrentCycle)){
      for(const row of challengeGeneralStandings){
        const pid=String(row?.playerId||"");
        if(!pid) continue;
        const prev=map.get(pid)||{playerId:pid,name:row?.name||playersById[pid]?.name||"Joueur",points:0,wins:0,podiums:0,cycles:0};
        prev.points+=Number(row?.cyclePoints ?? row?.points ?? 0)||0;
        prev.wins+=Number(row?.wins||0)||0;
        prev.podiums+=Number(row?.podiums||0)||0;
        prev.cycles+=1;
        map.set(pid,prev);
      }
    }
    return Array.from(map.values())
      .sort((a:any,b:any)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums||String(a.name).localeCompare(String(b.name)))
      .map((row:any,index:number)=>({...row,rank:index+1}));
  },[tournamentPlayers,playersById,challengeCompetition,challengeCurrentCycle,challengeGeneralStandings]);

  const challengeMovementHistory = React.useMemo(()=>{
    const cycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    const rows:any[]=[];
    for(const cycle of cycles){
      for(const movement of Array.isArray(cycle?.movements)?cycle.movements:[]){
        const playerId=String(movement?.playerId||"");
        if(!playerId) continue;
        const from=Math.max(1,Number(movement?.from||1)||1);
        const to=Math.max(1,Number(movement?.to||1)||1);
        rows.push({
          ...movement,
          id:String(movement?.id||`cycle-${cycle?.cycle||1}-${playerId}-${from}-${to}-${movement?.at||0}`),
          cycle:Math.max(1,Number(movement?.cycle||cycle?.cycle||1)||1),
          playerId,
          playerName:playersById[playerId]?.name||"Joueur",
          from,
          to,
          reason:String(movement?.reason || (movement?.manual?"manual":to<from?"promotion":to>from?"relegation":"manual")),
          at:Number(movement?.at||cycle?.appliedAt||cycle?.closedAt||cycle?.createdAt||0)||0,
        });
      }
    }
    return rows.sort((a:any,b:any)=>Number(b.at||0)-Number(a.at||0)||Number(b.cycle||0)-Number(a.cycle||0));
  },[challengeCompetition,playersById]);

  const challengeSeasonSummary = React.useMemo(()=>{
    const currentLeader=challengeSeasonStandings[0]||null;
    const cycles=Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[];
    const closedCycles=cycles.filter((c:any)=>String(c?.status||"")==="closed"||Boolean(c?.closedAt)).length;
    const pendingPlayoffs=cycles.reduce((sum:number,c:any)=>sum+(Array.isArray(c?.pendingPlayoffs)?c.pendingPlayoffs.filter((p:any)=>!p?.resolved).length:0),0);
    return {
      name:String(challengeCompetition?.season?.name||tour?.name||"Saison Challenge"),
      status:String(challengeCompetition?.season?.status||"running"),
      maxCycles:Math.max(0,Number(challengeCompetition?.season?.maxCycles||0)||0),
      closedCycles,
      leader:currentLeader,
      pendingPlayoffs,
      movementCount:challengeMovementHistory.length,
    };
  },[challengeCompetition,challengeSeasonStandings,challengeMovementHistory,tour]);

  const challengePlayerDashboard = React.useMemo(() => {
    if (!isChallengePerformanceCompetition || !currentTournamentPlayer) return null;
    const playerId = String(currentTournamentPlayer?.id || "");
    if (!playerId) return null;
    const cycleStanding = challengeGeneralStandings.find((row: any) => String(row?.playerId || "") === playerId) || null;
    const seasonStanding = challengeSeasonStandings.find((row: any) => String(row?.playerId || "") === playerId) || null;
    const division = Math.max(1, Number(challengeDivisionState?.assignments?.[playerId] || 1) || 1);
    const objectives = challengeObjectives.map((objective: string) => {
      const standings = challengeObjectiveStandings[objective] || [];
      const standing = standings.find((row: any) => String(row?.playerId || "") === playerId) || null;
      const attempts = challengeAttemptCount(playerId, objective);
      const maxAttempts = challengeObjectiveAttemptLimit(objective);
      const round: any = challengeRoundForObjective(objective);
      const status = String(round?.status || "open");
      const open = challengeObjectiveIsOpen(objective);
      return {
        objective,
        standing,
        attempts,
        maxAttempts,
        round,
        status,
        open,
        playable: open && attempts < maxAttempts,
        completed: attempts >= maxAttempts,
      };
    });
    const playable = objectives.filter((row: any) => row.playable);
    const scored = objectives.filter((row: any) => Boolean(row.standing));
    const completed = objectives.filter((row: any) => row.completed);
    return {
      playerId,
      player: currentTournamentPlayer,
      cycleStanding,
      seasonStanding,
      division,
      objectives,
      playable,
      scored,
      completed,
      progress: objectives.length ? Math.round((completed.length / objectives.length) * 100) : 0,
    };
  }, [
    isChallengePerformanceCompetition,
    currentTournamentPlayer,
    challengeGeneralStandings,
    challengeSeasonStandings,
    challengeDivisionState,
    challengeObjectives,
    challengeObjectiveStandings,
    challengeAttemptCount,
    challengeObjectiveAttemptLimit,
    challengeRoundForObjective,
    challengeObjectiveIsOpen,
  ]);

  const challengeFormatMeta = React.useMemo(() => {
    const key = String(challengeCompetitionFormat || "duels");
    if (key === "objectives") return { key, title: "CHAMPIONNAT OBJECTIFS", short: "OBJECTIFS", description: "Chaque objectif possède son classement. Les points gagnés sur chaque objectif alimentent le classement général." };
    if (key === "free") return { key, title: "COMPÉTITION LIBRE", short: "LIBRE", description: "Les performances Challenge compatibles peuvent être jouées ou rattachées librement, puis classées par objectif." };
    if (key === "divisions") return { key, title: "LIGUES & DIVISIONS", short: "DIVISIONS", description: "Classements par objectifs, cycles, divisions et mouvements de montée / descente." };
    return { key: "duels", title: "CONFRONTATIONS", short: "DUELS", description: "Challenge joué en confrontations directes entre joueurs ou équipes, avec un calendrier de rencontres." };
  }, [challengeCompetitionFormat]);

  const challengeOpenObjectives = React.useMemo(
    () => challengeObjectives.filter((objective: string) => challengeObjectiveIsOpen(objective)),
    [challengeObjectives, challengeObjectiveIsOpen]
  );

  const challengeCurrentRound = React.useMemo(() => {
    const rows = challengeScheduleRounds.slice().sort((a: any, b: any) => Number(a?.round || 0) - Number(b?.round || 0));
    return rows.find((row: any) => String(row?.status || "open") === "open") || rows.find((row: any) => String(row?.status || "") !== "closed") || rows[rows.length - 1] || null;
  }, [challengeScheduleRounds]);

  const challengeProgramProgress = React.useMemo(() => {
    if (!isChallengePerformanceCompetition || !challengeObjectives.length) return 0;
    const completed = challengeObjectives.filter((objective: string) => {
      const limit = challengeObjectiveAttemptLimit(objective);
      return tournamentPlayers.length > 0 && tournamentPlayers.every((player: any) => challengeAttemptCount(String(player?.id || ""), objective) >= limit);
    }).length;
    return Math.round((completed / challengeObjectives.length) * 100);
  }, [isChallengePerformanceCompetition, challengeObjectives, challengeObjectiveAttemptLimit, tournamentPlayers, challengeAttemptCount]);

  React.useEffect(() => {
    if (!isChallengePerformanceCompetition) return;
    const normalized = normalizeChallengeObjective(challengeObjectiveFocus || "");
    if (normalized && challengeObjectives.includes(normalized)) return;
    setChallengeObjectiveFocus(challengeOpenObjectives[0] || challengeObjectives[0] || "");
  }, [isChallengePerformanceCompetition, challengeObjectives.join("|"), challengeOpenObjectives.join("|")]);

  const challengeFocusedObjective = React.useMemo(() => {
    const normalized = normalizeChallengeObjective(challengeObjectiveFocus || "");
    if (normalized && challengeObjectives.includes(normalized)) return normalized;
    return challengeOpenObjectives[0] || challengeObjectives[0] || "";
  }, [challengeObjectiveFocus, challengeObjectives, challengeOpenObjectives]);

  const challengeRecentActivity = React.useMemo(() => {
    if (!isChallengeCompetition) return [] as any[];
    return linkedHistoryMatches
      .slice()
      .sort((a: any, b: any) => Number(b?.createdAt || b?.linkedAt || 0) - Number(a?.createdAt || a?.linkedAt || 0))
      .slice(0, 8)
      .map((link: any) => {
        const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
        const row = ranking[0] || {};
        const pid = String(row?.playerId || row?.id || link?.playerId || "");
        const player = playersById[pid] || tournamentPlayers.find((p: any) => String(p?.onlineUserId || "") === pid) || null;
        const objective = normalizeChallengeObjective(link?.challengeObjective || link?.target || link?.objective || historyChallengeObjective(link));
        const score = Number(row?.score ?? row?.points ?? row?.bestScore ?? row?.best ?? link?.score ?? 0) || 0;
        return {
          id: String(link?.historyMatchId || link?.matchId || link?.id || `${objective}-${pid}-${link?.createdAt || 0}`),
          objective,
          score,
          playerId: pid,
          playerName: String(row?.name || player?.name || "Joueur"),
          attempt: Math.max(0, Number(link?.challengeAttemptNumber || 0) || 0),
          cycle: Math.max(1, Number(link?.challengeCycle || 1) || 1),
          round: Math.max(0, Number(link?.challengeRoundNumber || 0) || 0),
          createdAt: Number(link?.createdAt || link?.linkedAt || 0) || 0,
        };
      });
  }, [isChallengeCompetition, linkedHistoryMatches, playersById, tournamentPlayers]);

  const challengeFilteredResults = React.useMemo(() => {
    let sorted = linkedHistoryMatches
      .slice()
      .sort((a: any, b: any) => Number(b?.createdAt || b?.linkedAt || 0) - Number(a?.createdAt || a?.linkedAt || 0));
    const focus = normalizeChallengeObjective(challengeResultsFocus || "");
    if (challengeResultsFocus && challengeResultsFocus !== "all" && challengeObjectives.includes(focus)) {
      sorted = sorted.filter((link: any) =>
        normalizeChallengeObjective(link?.challengeObjective || link?.target || link?.objective || historyChallengeObjective(link)) === focus
      );
    }
    if (challengeResultsOwner === "mine" && currentTournamentPlayer) {
      const pid = String(currentTournamentPlayer?.id || "");
      const onlineId = String((currentTournamentPlayer as any)?.onlineUserId || "");
      sorted = sorted.filter((link: any) => (Array.isArray(link?.ranking) ? link.ranking : []).some((row: any) => {
        const rowId = String(row?.playerId || row?.id || "");
        const rowOnlineId = String(row?.onlineUserId || "");
        return rowId === pid || (onlineId && (rowId === onlineId || rowOnlineId === onlineId));
      }));
    }
    return sorted;
  }, [linkedHistoryMatches, challengeResultsFocus, challengeResultsOwner, challengeObjectives, currentTournamentPlayer]);

  const isLeagueMulti = React.useMemo(() => isLeagueMultiTournament(tour), [tour]);
  const leagueFormatForStandings = React.useMemo(() => getLeagueFormatForLinkedHistory(tour), [tour]);
  const isLeagueFree = leagueFormatForStandings === "free";
  const isAveragePointsLeague = leagueFormatForStandings === "multi" || leagueFormatForStandings === "free";

  const linkedMultiStandings = React.useMemo(() => {
    return computeLinkedMultiStandings(tour, linkedHistoryMatches);
  }, [tour, linkedHistoryMatches]);


  const tournamentBestOf = React.useMemo(() => {
    const raw =
      (tour as any)?.game?.rules?.bestOf ??
      (tour as any)?.game?.bestOf ??
      (tour as any)?.rules?.bestOf ??
      (tour as any)?.bestOf ??
      1;
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    return [1, 3, 5, 7, 9, 11].includes(n) ? n : 1;
  }, [tour]);


function buildSyntheticScore(winnerId: string, aId: string, bId: string) {
  const bestOf = Math.max(1, tournamentBestOf || 1);
  const winsNeeded = Math.floor(bestOf / 2) + 1;
  const loserMax = Math.max(0, winsNeeded - 1);
  const loserWins = loserMax > 0 ? Math.floor(Math.random() * (loserMax + 1)) : 0;
  const winnerIsA = winnerId === aId;
  const a = winnerIsA ? winsNeeded : loserWins;
  const b = winnerIsA ? loserWins : winsNeeded;
  return {
    scoreA: a,
    scoreB: b,
    setsA: a,
    setsB: b,
    legsA: a,
    legsB: b,
  };
}

function randInt(min: number, max: number) {
  const lo = Math.ceil(Number(min) || 0);
  const hi = Math.floor(Number(max) || 0);
  if (hi <= lo) return lo;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function round2(n: number) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function buildSyntheticLegStats(playerId: string, wonLeg: boolean) {
  const darts = randInt(wonLeg ? 12 : 15, wonLeg ? 24 : 30);
  const visits = Math.max(4, Math.ceil(darts / 3));
  const avg3 = round2((wonLeg ? randInt(58, 92) : randInt(42, 76)) + Math.random());
  const bestVisit = wonLeg ? [100, 121, 140, 180][randInt(0, 3)] : [81, 95, 100, 121, 140][randInt(0, 4)];
  const bestCheckout = wonLeg ? [0, 32, 40, 52, 64, 80, 96, 110, 120][randInt(0, 8)] : 0;
  return { playerId, avg3, darts, visits, bestVisit, bestCheckout };
}

function padSyntheticDarts(darts: string[]) {
  const out = Array.isArray(darts) ? darts.slice(0, 3) : [];
  while (out.length < 3) out.push("MISS");
  return out;
}

type SyntheticDart = { label: string; value: number; isCheckout: boolean };

const SYNTHETIC_DARTS: SyntheticDart[] = (() => {
  const base: SyntheticDart[] = [{ label: "MISS", value: 0, isCheckout: false }];
  for (let n = 1; n <= 20; n++) {
    base.push({ label: String(n), value: n, isCheckout: false });
    base.push({ label: `D${n}`, value: n * 2, isCheckout: true });
    base.push({ label: `T${n}`, value: n * 3, isCheckout: false });
  }
  base.push({ label: "BULL", value: 25, isCheckout: false });
  base.push({ label: "DBULL", value: 50, isCheckout: true });

  return base.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (Number(b.isCheckout) !== Number(a.isCheckout)) return Number(b.isCheckout) - Number(a.isCheckout);
    return a.label.localeCompare(b.label);
  });
})();

const SYNTHETIC_FINISHERS = SYNTHETIC_DARTS.filter((d) => d.isCheckout);

function findSyntheticCombo(total: number, requireCheckout: boolean) {
  const target = Math.max(0, Math.min(180, Math.floor(Number(total) || 0)));
  if (!target) return ["MISS", "MISS", "MISS"];

  const finishers = requireCheckout ? SYNTHETIC_FINISHERS : SYNTHETIC_DARTS;

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of SYNTHETIC_DARTS) {
      for (const d3 of finishers) {
        if (d1.value + d2.value + d3.value !== target) continue;
        const seq = [d1.label, d2.label, d3.label];
        while (seq.length && seq[seq.length - 1] === "MISS") seq.pop();
        const compact = seq.filter((x) => x !== "MISS");
        return padSyntheticDarts(compact.length ? compact : ["MISS"]);
      }
    }
  }

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of finishers) {
      if (d1.value + d2.value !== target) continue;
      return padSyntheticDarts([d1.label, d2.label].filter((x) => x !== "MISS"));
    }
  }

  for (const d1 of finishers) {
    if (d1.value === target) return padSyntheticDarts([d1.label]);
  }

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of SYNTHETIC_DARTS) {
      for (const d3 of SYNTHETIC_DARTS) {
        if (d1.value + d2.value + d3.value !== target) continue;
        const seq = [d1.label, d2.label, d3.label];
        while (seq.length && seq[seq.length - 1] === "MISS") seq.pop();
        const compact = seq.filter((x) => x !== "MISS");
        return padSyntheticDarts(compact.length ? compact : ["MISS"]);
      }
    }
  }

  return padSyntheticDarts(["T20", "20", String(Math.max(1, Math.min(20, target - 80)))]);
}

function syntheticDartsForTotal(total: number, options?: { checkout?: boolean }) {
  const presets = [
    { total: 180, darts: ["T20", "T20", "T20"] },
    { total: 140, darts: ["T20", "T20", "20"] },
    { total: 121, darts: ["T20", "11", "BULL"] },
    { total: 120, darts: ["20", "T20", "20"] },
    { total: 100, darts: ["20", "T20", "20"] },
    { total: 95, darts: ["T19", "18", "20"] },
    { total: 81, darts: ["T19", "12", "12"] },
    { total: 60, darts: ["20", "20", "20"] },
    { total: 45, darts: ["15", "15", "15"] },
    { total: 40, darts: ["D20", "MISS", "MISS"] },
    { total: 32, darts: ["D16", "MISS", "MISS"] },
  ];
  const exact = !options?.checkout ? presets.find((x) => x.total === total) : null;
  if (exact) return padSyntheticDarts(exact.darts);
  return findSyntheticCombo(total, !!options?.checkout);
}

function buildSyntheticVisits(playerId: string, stats: any, opts?: any) {
  const rounds = Math.max(3, Math.floor(Number(opts?.rounds || stats?.visits || 5)));
  const wonLeg = !!opts?.wonLeg;
  const targetAvg = Math.max(36, Math.min(110, Math.round(Number(stats?.avg3 || 60))));
  let remain = 501;
  const rows: any[] = [];

  for (let i = 0; i < rounds; i++) {
    const last = i === rounds - 1;
    const remainBefore = remain;
    let total = 0;
    let checkout = false;

    if (wonLeg && last) {
      total = remain;
      if (total > 170 || total <= 1) {
        total = Math.max(2, Math.min(170, Number(stats?.bestCheckout || 40) || 40));
        remain = total;
      }
      checkout = total === remain;
    } else {
      const roundsLeftAfter = rounds - i - 1;
      const wiggle = randInt(-16, 16);
      const desired = Math.max(18, Math.min(140, targetAvg + wiggle));
      let minKeep = 2;
      let maxKeep = 500;

      if (wonLeg) {
        if (roundsLeftAfter <= 1) {
          minKeep = 2;
          maxKeep = 170;
        } else {
          minKeep = 2 + 18 * (roundsLeftAfter - 1);
          maxKeep = 170 + 140 * (roundsLeftAfter - 1);
        }
      } else {
        minKeep = 2;
        maxKeep = 500;
      }

      const minTotal = Math.max(18, remain - maxKeep);
      const maxTotal = Math.max(minTotal, Math.min(140, remain - minKeep));
      total = Math.max(minTotal, Math.min(maxTotal, desired));

      if (!Number.isFinite(total) || total <= 0 || total >= remain) {
        total = Math.max(18, Math.min(60, remain - minKeep));
      }
    }

    const safeTotal = Math.max(0, Math.min(remainBefore, Math.floor(total)));
    remain = Math.max(0, remainBefore - safeTotal);

    rows.push({
      playerId,
      visitIndex: i,
      total: safeTotal,
      darts: syntheticDartsForTotal(safeTotal, { checkout }),
      remainBefore,
      remainAfter: remain,
      bust: false,
      checkout,
    });
  }

  if (wonLeg && rows.length) {
    const last = rows[rows.length - 1];
    last.total = last.remainBefore;
    last.darts = syntheticDartsForTotal(last.total, { checkout: true });
    last.remainAfter = 0;
    last.checkout = true;
    remain = 0;
  }

  return rows;
}

function summarizeSyntheticVisits(playerId: string, rows: any[]) {
  const visits = Array.isArray(rows) ? rows.length : 0;
  const darts = visits * 3;
  const totals = (rows || []).map((r: any) => Number(r?.total || 0));
  const totalScored = totals.reduce((s: number, x: number) => s + x, 0);
  const avg3 = visits ? round2(totalScored / visits) : 0;
  const bestVisit = totals.length ? Math.max(...totals) : 0;
  const bestCheckout = (rows || []).reduce((best: number, r: any) => r?.checkout ? Math.max(best, Number(r?.total || 0)) : best, 0);
  return { playerId, avg3, darts, visits, bestVisit, bestCheckout };
}

function buildSyntheticLegVisitsPair(args: any) {
  const { aId, bId, aSeed, bSeed, winnerId } = args || {};
  const loserStarts = winnerId === aId ? bId : aId;
  const rounds = Math.max(3, Math.min(10, Math.round((Number(aSeed?.visits || 5) + Number(bSeed?.visits || 5)) / 2)));
  const aVisits = buildSyntheticVisits(aId, aSeed, { rounds, wonLeg: winnerId === aId, starts: loserStarts === aId });
  const bVisits = buildSyntheticVisits(bId, bSeed, { rounds, wonLeg: winnerId === bId, starts: loserStarts === bId });
  return {
    [aId]: aVisits,
    [bId]: bVisits,
    statsA: summarizeSyntheticVisits(aId, aVisits),
    statsB: summarizeSyntheticVisits(bId, bVisits),
  };
}

function buildSyntheticLegWinnerOrder(args: any) {
  const { aId, bId, winnerId, scoreA, scoreB } = args || {};
  const winsA = Math.max(0, Math.floor(Number(scoreA || 0)));
  const winsB = Math.max(0, Math.floor(Number(scoreB || 0)));
  const finalWinnerId = String(winnerId || "");
  const loserId = finalWinnerId === aId ? bId : aId;
  const winnerWins = finalWinnerId === aId ? winsA : winsB;
  const loserWins = finalWinnerId === aId ? winsB : winsA;

  if (!aId || !bId || !finalWinnerId || winnerWins <= 0) return [];

  const order: string[] = Array.from({ length: loserWins }, () => loserId);
  for (let i = order.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }

  const earlyWinnerWins = Math.max(0, winnerWins - 1);
  for (let i = 0; i < earlyWinnerWins; i++) {
    const slot = order.length ? ((Math.random() * (order.length + 1)) | 0) : 0;
    order.splice(slot, 0, finalWinnerId);
  }

  order.push(finalWinnerId);
  return order;
}

async function createSyntheticHistoryForSimulation(args: any) {
  const { tournament, match, winnerId, synthetic } = args || {};
  const aId = String(match?.aPlayerId || "");
  const bId = String(match?.bPlayerId || "");
  if (!aId || !bId) return null;

  const aPlayer = playersById[aId] || { id: aId, name: "Joueur A" };
  const bPlayer = playersById[bId] || { id: bId, name: "Joueur B" };
  const targetScoreA = Math.max(0, Math.floor(Number(synthetic?.scoreA || 0)));
  const targetScoreB = Math.max(0, Math.floor(Number(synthetic?.scoreB || 0)));
  const legWinnerOrder = buildSyntheticLegWinnerOrder({ aId, bId, winnerId, scoreA: targetScoreA, scoreB: targetScoreB });
  const totalLegs = Math.max(1, legWinnerOrder.length || (targetScoreA + targetScoreB));
  const legs: any[] = [];
  let cumA = 0;
  let cumB = 0;

  for (let i = 0; i < totalLegs; i++) {
    const legWinnerId = String(legWinnerOrder[i] || winnerId || aId);

    if (legWinnerId === aId) {
      cumA += 1;
    } else if (legWinnerId === bId) {
      cumB += 1;
    }

    const aSeed = buildSyntheticLegStats(aId, legWinnerId === aId);
    const bSeed = buildSyntheticLegStats(bId, legWinnerId === bId);
    const paired = buildSyntheticLegVisitsPair({ aId, bId, aSeed, bSeed, winnerId: legWinnerId });
    const aStats = paired.statsA;
    const bStats = paired.statsB;
    const aVisitsHistory = paired[aId];
    const bVisitsHistory = paired[bId];
    legs.push({
      id: `${String(match?.id || 'match')}-leg-${i + 1}`,
      label: `Leg ${i + 1}`,
      scoreA: cumA,
      scoreB: cumB,
      winnerId: legWinnerId,
      summary: {
        kind: "x01",
        simulated: true,
        legIndex: i,
        winnerId: legWinnerId,
        scoreA: cumA,
        scoreB: cumB,
        avg3ByPlayer: { [aId]: aStats.avg3, [bId]: bStats.avg3 },
        bestVisitByPlayer: { [aId]: aStats.bestVisit, [bId]: bStats.bestVisit },
        bestCheckoutByPlayer: { [aId]: aStats.bestCheckout, [bId]: bStats.bestCheckout },
        visitsHistoryByPlayer: {
          [aId]: aVisitsHistory,
          [bId]: bVisitsHistory,
        },
        perPlayer: {
          [aId]: { avg3: aStats.avg3, darts: aStats.darts, visits: aStats.visits, bestVisit: aStats.bestVisit, bestCheckout: aStats.bestCheckout, visitsHistory: aVisitsHistory },
          [bId]: { avg3: bStats.avg3, darts: bStats.darts, visits: bStats.visits, bestVisit: bStats.bestVisit, bestCheckout: bStats.bestCheckout, visitsHistory: bVisitsHistory },
        },
      },
    });
  }

  const avg = (arr: any[]) => (arr.length ? round2(arr.reduce((s, x) => s + Number(x || 0), 0) / arr.length) : 0);
  const max = (arr: any[]) => (arr.length ? Math.max(...arr.map((x) => Number(x || 0))) : 0);
  const perA = legs.map((x) => x?.summary?.perPlayer?.[aId] || {});
  const perB = legs.map((x) => x?.summary?.perPlayer?.[bId] || {});
  const summary = {
    kind: "x01",
    simulated: true,
    winnerId,
    scoreA: Number(synthetic?.scoreA || 0),
    scoreB: Number(synthetic?.scoreB || 0),
    legsWon: { [aId]: Number(synthetic?.legsA || synthetic?.scoreA || 0), [bId]: Number(synthetic?.legsB || synthetic?.scoreB || 0) },
    setsWon: { [aId]: Number(synthetic?.setsA || synthetic?.scoreA || 0), [bId]: Number(synthetic?.setsB || synthetic?.scoreB || 0) },
    avg3ByPlayer: { [aId]: avg(perA.map((x) => x.avg3)), [bId]: avg(perB.map((x) => x.avg3)) },
    bestVisitByPlayer: { [aId]: max(perA.map((x) => x.bestVisit)), [bId]: max(perB.map((x) => x.bestVisit)) },
    bestCheckoutByPlayer: { [aId]: max(perA.map((x) => x.bestCheckout)), [bId]: max(perB.map((x) => x.bestCheckout)) },
    visitsHistoryByPlayer: {
      [aId]: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[aId] || []),
      [bId]: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[bId] || []),
    },
    perPlayer: {
      [aId]: { avg3: avg(perA.map((x) => x.avg3)), darts: perA.reduce((s, x) => s + Number(x.darts || 0), 0), visits: perA.reduce((s, x) => s + Number(x.visits || 0), 0), bestVisit: max(perA.map((x) => x.bestVisit)), bestCheckout: max(perA.map((x) => x.bestCheckout)), visitsHistory: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[aId] || []) },
      [bId]: { avg3: avg(perB.map((x) => x.avg3)), darts: perB.reduce((s, x) => s + Number(x.darts || 0), 0), visits: perB.reduce((s, x) => s + Number(x.visits || 0), 0), bestVisit: max(perB.map((x) => x.bestVisit)), bestCheckout: max(perB.map((x) => x.bestCheckout)), visitsHistory: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[bId] || []) },
    },
    legs,
    legacy: {
      avg3: { [aId]: avg(perA.map((x) => x.avg3)), [bId]: avg(perB.map((x) => x.avg3)) },
      darts: { [aId]: perA.reduce((s, x) => s + Number(x.darts || 0), 0), [bId]: perB.reduce((s, x) => s + Number(x.darts || 0), 0) },
      visits: { [aId]: perA.reduce((s, x) => s + Number(x.visits || 0), 0), [bId]: perB.reduce((s, x) => s + Number(x.visits || 0), 0) },
      bestVisit: { [aId]: max(perA.map((x) => x.bestVisit)), [bId]: max(perB.map((x) => x.bestVisit)) },
      bestCheckout: { [aId]: max(perA.map((x) => x.bestCheckout)), [bId]: max(perB.map((x) => x.bestCheckout)) },
    },
  };

  const now = Date.now();
  const rec: any = {
    id: `sim-${String(tournament?.id || 'tour')}-${String(match?.id || 'match')}-${now}`,
    kind: String(tournament?.game?.mode || tournament?.mode || 'x01'),
    status: 'finished',
    winnerId,
    createdAt: now,
    updatedAt: now,
    players: [
      { id: aId, name: aPlayer?.name || 'Joueur A', avatarDataUrl: aPlayer?.avatarDataUrl || aPlayer?.avatar || aPlayer?.avatarUrl || null },
      { id: bId, name: bPlayer?.name || 'Joueur B', avatarDataUrl: bPlayer?.avatarDataUrl || bPlayer?.avatar || bPlayer?.avatarUrl || null },
    ],
    summary,
    payload: {
      kind: 'x01',
      simulated: true,
      winnerId,
      scoreA: Number(synthetic?.scoreA || 0),
      scoreB: Number(synthetic?.scoreB || 0),
      legsWon: summary.legsWon,
      setsWon: summary.setsWon,
      legs,
      summary,
    },
  };

  try {
    await (History as any)?.upsert?.(rec);
  } catch (e) {
    console.error('[TournamentView] synthetic history upsert error:', e);
  }
  return rec;
}

// ------------------------------------------------------------
// LOAD  // ------------------------------------------------------------
  // LOAD
  // ------------------------------------------------------------
  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        let t:any = await getTournamentLocal(id);
        let ms:any = await listMatchesForTournamentLocal(id);
        if (!t) {
          try {
            const remote:any = await getOnlineCompetition(id);
            if (remote?.id) {
              t = remote;
              const remoteMatches = remote?.__onlineRow?.payload?.matches ?? remote?.__onlineRow?.matches ?? remote?.matches ?? [];
              ms = Array.isArray(remoteMatches) ? remoteMatches : [];
            }
          } catch {}
        }
        if (!alive) return;

        setTour((t as any) ?? null);

        // ✅ DEDUP au chargement
        const uniqById = (() => {
          const map = new Map<string, any>();
          for (const m of Array.isArray(ms) ? ms : []) {
            const mid = String(m?.id || "");
            if (!mid) continue;
            const cur = map.get(mid);
            if (!cur || (m?.updatedAt ?? 0) >= (cur?.updatedAt ?? 0)) map.set(mid, m);
          }
          return Array.from(map.values());
        })();

        setMatches(uniqById as any);
      } catch (e) {
        console.error("[TournamentView] load error:", e);
        if (alive) {
          setTour(null);
          setMatches([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const refreshPublicCompetition = React.useCallback(async () => {
    if(!tour || !isOnlineCompetition) return;
    const remoteId=String((tour as any)?.onlineCompetitionId || (tour as any)?.id || id);
    if(!remoteId) return;
    setPublicRefreshing(true);
    try{
      const remote:any=await getOnlineCompetition(remoteId);
      if(remote?.id){
        const remoteMatches=remote?.__onlineRow?.payload?.matches ?? remote?.__onlineRow?.matches ?? remote?.matches ?? [];
        const remoteLinked=Array.isArray(remote?.linkedMatches)
          ? remote.linkedMatches
          : Array.isArray(remote?.meta?.linkedMatches)
          ? remote.meta.linkedMatches
          : [];
        const updatedAt=Number(remote?.updatedAt||0)||0;
        const snapshot={updatedAt,linkedCount:remoteLinked.length,matchCount:Array.isArray(remoteMatches)?remoteMatches.length:0};
        const previous=liveSnapshotRef.current;
        if(previous.updatedAt>0 && (
          snapshot.updatedAt>previous.updatedAt ||
          snapshot.linkedCount!==previous.linkedCount ||
          snapshot.matchCount!==previous.matchCount
        )){
          const delta=Math.max(0,snapshot.linkedCount-previous.linkedCount);
          setLivePulseText(delta>0?`${delta} nouveau${delta>1?"x":""} résultat${delta>1?"s":""} reçu${delta>1?"s":""}`:"Classements actualisés");
        }
        liveSnapshotRef.current=snapshot;
        setLiveLastUpdatedAt(Date.now());
        setTour(remote as any);
        setMatches(Array.isArray(remoteMatches)?remoteMatches:[]);
      }
    }catch(e){
      console.warn("[TournamentView] live refresh failed:",e);
    }finally{
      setPublicRefreshing(false);
    }
  }, [tour, id, isOnlineCompetition]);

  React.useEffect(() => {
    const liveViewer=Boolean(sharedEntry || isCompetitionAdmin || currentTournamentPlayer);
    if(!liveViewer || !tour || !isOnlineCompetition) return;
    const seconds=currentTournamentPlayer
      ? 8
      : Math.max(8,Math.min(60,Number((tour as any)?.publicView?.liveRefreshSeconds||15)||15));
    void refreshPublicCompetition();
    const timer=window.setInterval(()=>{ void refreshPublicCompetition(); },seconds*1000);
    return ()=>window.clearInterval(timer);
  }, [sharedEntry, isCompetitionAdmin, Boolean(currentTournamentPlayer), tour?.id, (tour as any)?.onlineCompetitionId, isOnlineCompetition]);

  // ------------------------------------------------------------
  // ✅ PÉTANQUE : charge les scores depuis History via historyMatchId
  // ------------------------------------------------------------
  React.useEffect(() => {
    let alive = true;

    async function loadPetanqueScoresFromHistory() {
      try {
        if (!tour) return;
        if (!isPetanqueTournament(tour)) return;

        const ids = (matches || []).map((m: any) => String(m?.historyMatchId || "")).filter(Boolean);
        const unique = Array.from(new Set(ids)).filter((hid) => hid && !petScoresByHistoryId[hid]);
        if (!unique.length) return;

        const next: ScoreMap = {};
        for (const hid of unique) {
          try {
            const rec: any = await (History as any)?.get?.(hid);
            const s = rec?.summary || rec?.payload?.summary || rec?.payload || null;
            const k = String(s?.kind || "").toLowerCase();
            if (k !== "petanque") continue;

            const a = Number(s?.scoreA);
            const b = Number(s?.scoreB);
            if (Number.isFinite(a) && Number.isFinite(b)) {
              next[hid] = { a: Math.floor(a), b: Math.floor(b) };
            }
          } catch {}
        }

        if (alive && Object.keys(next).length) {
          setPetScoresByHistoryId((prev) => ({ ...prev, ...next }));
        }
      } catch {}
    }

    loadPetanqueScoresFromHistory();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, matches]);

  // ------------------------------------------------------------
  // PERSIST (MERGE + FREEZE META)
  // ------------------------------------------------------------
  const persist = React.useCallback(async (nextTour: Tournament, nextMatches: TournamentMatch[]) => {
    // 1) merge anti-undefined + verrouillage depuis prev
    const merged = mergeStableMatchMeta(matchesRef.current as any, Array.isArray(nextMatches) ? nextMatches : []);
    // 2) 🔒 override structurel depuis snapshot
    const stabilized = applyStableMeta(Array.isArray(merged) ? merged : []);
    // 3) ✅ on met à jour le snapshot avec les meta désormais “propres”
    updateStableMetaFromMatches(stabilized as any[]);

    setTour(nextTour);
    setMatches(stabilized as any);

    try {
      await upsertTournamentLocal(nextTour as any);
      await upsertMatchesForTournamentLocal((nextTour as any).id, stabilized as any);
      const remoteId=String((nextTour as any).onlineCompetitionId||"");
      if(remoteId){
        try{await updateOnlineCompetition(remoteId,{name:(nextTour as any).name,status:(nextTour as any).status,tournament:nextTour as any,matches:stabilized as any,participants:(nextTour as any).players||[],settings:{...((nextTour as any).game?.rules||{}),identity:(nextTour as any).identity||null}} as any)}catch(e){console.error("[TournamentView] online sync failed:",e)}
      }
    } catch (e) {
      console.error("[TournamentView] persist error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateChallengeRoundStatus = React.useCallback(async(roundId:string,status:"locked"|"open"|"closed")=>{
    if(!tour||!isCompetitionAdmin||!canAdmin("schedule")) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const now=Date.now();
    schedule.rounds=schedule.rounds.map((row:any)=>{
      if(String(row?.id)!==String(roundId)) return row;
      return {
        ...row,
        status,
        openedAt:status==="open"?(row?.openedAt||now):row?.openedAt||null,
        closedAt:status==="closed"?now:(status==="open"?null:row?.closedAt||null),
      };
    });
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:now};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(status==="open"?"Journée publiée.":status==="closed"?"Journée clôturée.":"Journée verrouillée.");
  },[tour,isCompetitionAdmin,persist,safeMatches]);

  const advanceChallengeRound = React.useCallback(async()=>{
    if(!tour||!isCompetitionAdmin||!canAdmin("schedule")) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const currentRows=schedule.rounds.filter((row:any)=>Number(row?.cycle||1)===challengeCurrentCycle).sort((a:any,b:any)=>Number(a?.round||0)-Number(b?.round||0));
    if(!currentRows.length){setAdminNotice("Aucune journée configurée.");return;}
    const now=Date.now();
    const open=currentRows.find((row:any)=>String(row?.status)==="open");
    const nextLocked=currentRows.find((row:any)=>String(row?.status)==="locked");
    if(!open && !nextLocked){setAdminNotice("Toutes les journées de ce cycle sont clôturées.");return;}
    const openId=String(open?.id||"");
    const nextId=String(nextLocked?.id||"");
    schedule.rounds=schedule.rounds.map((row:any)=>{
      if(openId && String(row?.id)===openId) return {...row,status:"closed",closedAt:now};
      if(nextId && String(row?.id)===nextId) return {...row,status:"open",openedAt:now,closedAt:null};
      return row;
    });
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:now};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(nextId?`Journée ${Number(nextLocked?.round||0)} publiée. La précédente est clôturée.`:"Dernière journée clôturée. Le cycle peut maintenant être terminé.");
  },[tour,isCompetitionAdmin,challengeCurrentCycle,persist,safeMatches]);

  const applyChallengePromotionCycle = React.useCallback(async()=>{
    if(!tour||challengeCompetitionFormat!=='divisions'||!challengeDivisionState.enabled||!canAdmin("schedule")) return;
    if(challengeScheduleRounds.some((round:any)=>String(round?.status||"open")!=="closed")){
      setAdminNotice("Clôture d’abord toutes les journées / manches du cycle avant d’appliquer les montées et descentes.");
      return;
    }
    const now=Date.now();
    const nextAssignments:any={...challengeDivisionState.assignments};
    const movements:any[]=[];
    const standingsSnapshot:any[]=[];

    for(const div of challengeDivisionState.byDivision){
      const rows=div.standings||[];
      const policy=div.policy||{promote:0,relegate:0,playoff:0};
      rows.forEach((row:any)=>standingsSnapshot.push({
        playerId:String(row.playerId),
        name:String(row.name||playersById[String(row.playerId)]?.name||"Joueur"),
        division:div.division,
        rank:Number(row.divisionRank||row.rank||0)||0,
        points:Number(row.points||0)||0,
        cyclePoints:Number(row.cyclePoints||0)||0,
        wins:Number(row.wins||0)||0,
        podiums:Number(row.podiums||0)||0,
        objectives:Number(row.objectives||0)||0,
      }));
      const up=new Set(div.division>1?rows.slice(0,Math.max(0,Number(policy.promote)||0)).map((r:any)=>String(r.playerId)):[]);
      const downCount=Math.max(0,Number(policy.relegate)||0);
      const down=new Set(div.division<challengeDivisionState.count&&downCount>0?rows.slice(Math.max(0,rows.length-downCount)).map((r:any)=>String(r.playerId)):[]);
      for(const row of rows){
        const pid=String(row.playerId);
        const both=up.has(pid)&&down.has(pid);
        let to=div.division;
        if(!both&&up.has(pid))to=Math.max(1,div.division-1);
        else if(!both&&down.has(pid))to=Math.min(challengeDivisionState.count,div.division+1);
        nextAssignments[pid]=to;
        if(to!==div.division)movements.push({
          id:`cycle-${challengeDivisionState.cycle}-${pid}-${div.division}-${to}-${now}`,
          playerId:pid,
          from:div.division,
          to,
          reason:to<div.division?"promotion":"relegation",
          cycle:challengeDivisionState.cycle,
          at:now,
        });
      }
    }

    const pendingPlayoffs:any[]=[];
    for(let boundary=1;boundary<challengeDivisionState.count;boundary++){
      const upper=challengeDivisionState.byDivision.find((d:any)=>Number(d.division)===boundary);
      const lower=challengeDivisionState.byDivision.find((d:any)=>Number(d.division)===boundary+1);
      if(!upper||!lower) continue;
      const upperPolicy=upper.policy||{promote:0,relegate:0,playoff:0};
      const lowerPolicy=lower.policy||{promote:0,relegate:0,playoff:0};
      const slots=Math.max(0,Number(upperPolicy.playoff||0),Number(lowerPolicy.playoff||0));
      for(let index=0;index<slots;index++){
        const upperIndex=(upper.standings?.length||0)-Math.max(0,Number(upperPolicy.relegate)||0)-1-index;
        const lowerIndex=Math.max(0,Number(lowerPolicy.promote)||0)+index;
        const upperRow=upperIndex>=0?upper.standings?.[upperIndex]:null;
        const lowerRow=lower.standings?.[lowerIndex]||null;
        if(!upperRow||!lowerRow) continue;
        const playoffMode=(["fixed","random","multiple"].includes(String(challengeCompetition?.divisions?.playoffObjectiveMode))?String(challengeCompetition?.divisions?.playoffObjectiveMode):"fixed") as "fixed"|"random"|"multiple";
        const configuredPool=(Array.isArray(challengeCompetition?.divisions?.playoffObjectives)&&challengeCompetition.divisions.playoffObjectives.length
          ? challengeCompetition.divisions.playoffObjectives
          : [challengeCompetition?.divisions?.playoffObjective || challengeObjectives[0] || challengeRules?.target || "20"])
          .map((value:any)=>normalizeChallengeObjective(value))
          .filter(Boolean);
        const uniquePool=Array.from(new Set(configuredPool.length?configuredPool:[normalizeChallengeObjective(challengeObjectives[0]||"20")]));
        const selectedObjectives=playoffMode==="random"
          ? [uniquePool[Math.floor(Math.random()*uniquePool.length)]]
          : playoffMode==="multiple"
            ? uniquePool.slice(0,8)
            : [uniquePool[0]];
        pendingPlayoffs.push({
          id:`cycle-${challengeDivisionState.cycle}-boundary-${boundary}-playoff-${index+1}`,
          cycle:challengeDivisionState.cycle,
          boundary,
          upperPlayerId:String(upperRow.playerId),
          lowerPlayerId:String(lowerRow.playerId),
          upperDivision:boundary,
          lowerDivision:boundary+1,
          objectiveMode:playoffMode,
          objectivePool:uniquePool,
          objectives:selectedObjectives,
          objective:selectedObjectives[0],
          attemptsPerObjective:Math.max(1,Math.min(5,Number(challengeCompetition?.divisions?.playoffAttemptsPerObjective||1)||1)),
          results:[],
          visits:Math.max(1,Number(challengeCompetition?.divisions?.playoffVisits || challengeRules?.visits || 30)||30),
          status:"pending",
          upperScore:null,
          lowerScore:null,
          upperTieBreak:null,
          lowerTieBreak:null,
          resolved:false,
          winnerPlayerId:null,
        });
      }
    }

    const pointsMode=String(challengeCompetition?.cyclePoints?.mode||((challengeCompetition?.divisions?.resetPointsEachCycle??true)?"reset":"carry"));
    const carryPercent=Math.max(0,Math.min(100,Number(challengeCompetition?.cyclePoints?.carryPercent??50)||0));
    const nextCarry:any={};
    for(const row of challengeGeneralStandings){
      const total=Number(row?.points||0)||0;
      nextCarry[String(row.playerId)]=pointsMode==="carry"?total:pointsMode==="carry_percent"?Math.round(total*carryPercent/100):0;
    }

    const nextCycle=challengeDivisionState.cycle+1;
    const previous=Array.isArray((tour as any)?.challengeCompetition?.divisionCycles)?(tour as any).challengeCompetition.divisionCycles.slice():[];
    const currentIndex=previous.findIndex((row:any)=>Number(row?.cycle)===challengeDivisionState.cycle);
    const currentRecord:any=currentIndex>=0?previous[currentIndex]:{cycle:challengeDivisionState.cycle,assignments:{...challengeDivisionState.assignments}};
    const closedRecord:any={...currentRecord,status:"closed",closedAt:now,standingsSnapshot};
    if(currentIndex>=0) previous[currentIndex]=closedRecord; else previous.push(closedRecord);

    const seasonMaxCycles=Math.max(0,Number(challengeCompetition?.season?.maxCycles||0)||0);
    if(seasonMaxCycles>0 && challengeDivisionState.cycle>=seasonMaxCycles){
      const cfgFinal:any={
        ...((tour as any).challengeCompetition||{}),
        currentCycle:challengeDivisionState.cycle,
        divisionCycles:previous,
        season:{
          ...(((tour as any).challengeCompetition||{})?.season||{}),
          status:"finished",
          finishedAt:now,
        },
      };
      const nextTourFinal:any={...(tour as any),challengeCompetition:cfgFinal,updatedAt:now};
      await persist(nextTourFinal,safeMatches as any);
      setAdminNotice(`Cycle ${challengeDivisionState.cycle} clôturé · saison terminée (${seasonMaxCycles} cycle${seasonMaxCycles>1?"s":""}).`);
      return;
    }

    const nextRecord:any={
      cycle:nextCycle,
      name:`Cycle ${nextCycle}`,
      status:"active",
      createdAt:now,
      assignments:nextAssignments,
      appliedAt:now,
      movements,
      carryPoints:nextCarry,
      pendingPlayoffs,
    };
    const nextExistingIndex=previous.findIndex((row:any)=>Number(row?.cycle)===nextCycle);
    if(nextExistingIndex>=0) previous[nextExistingIndex]={...previous[nextExistingIndex],...nextRecord};
    else previous.push(nextRecord);

    const cfg:any={...((tour as any).challengeCompetition||{}),currentCycle:nextCycle,divisionCycles:previous};
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const templateRows=challengeScheduleRounds.length?challengeScheduleRounds:[{objectives:challengeObjectives}];
    const sequential=String(schedule?.publicationMode||"round_by_round")==="round_by_round";
    const waitForPlayoffs=pendingPlayoffs.length>0;
    const nextRounds=templateRows.map((row:any,index:number)=>({
      id:`cycle-${nextCycle}-round-${index+1}`,
      cycle:nextCycle,
      round:index+1,
      objectives:Array.isArray(row?.objectives)?row.objectives.slice():[],
      status:waitForPlayoffs?"locked":(!sequential||index===0?"open":"locked"),
      openedAt:waitForPlayoffs?null:(!sequential||index===0?now:null),
      closedAt:null,
    }));
    schedule.rounds=[...schedule.rounds.filter((row:any)=>Number(row?.cycle||1)!==nextCycle),...nextRounds];
    cfg.schedule=schedule;

    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:now};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(pendingPlayoffs.length
      ? `Cycle ${challengeDivisionState.cycle} clôturé · cycle ${nextCycle} préparé avec ${pendingPlayoffs.length} barrage${pendingPlayoffs.length>1?'s':''} à résoudre.`
      : `Cycle ${challengeDivisionState.cycle} clôturé · cycle ${nextCycle} ouvert · ${movements.length} mouvement${movements.length>1?'s':''} appliqué${movements.length>1?'s':''}.`);
  },[tour,challengeCompetitionFormat,challengeDivisionState,challengeCompetition,challengeGeneralStandings,challengeScheduleRounds,challengeObjectives,playersById,persist,safeMatches]);

  const resolveChallengePlayoff = React.useCallback(async(playoffId:string,winner:"upper"|"lower")=>{
    if(!tour||!isCompetitionAdmin) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    const cycleIndex=cycles.findIndex((row:any)=>Number(row?.cycle)===challengeCurrentCycle);
    if(cycleIndex<0) return;
    const cycle:any={...cycles[cycleIndex],assignments:{...(cycles[cycleIndex]?.assignments||{})}};
    const playoffs=Array.isArray(cycle?.pendingPlayoffs)?cycle.pendingPlayoffs.slice():[];
    const idx=playoffs.findIndex((row:any)=>String(row?.id)===String(playoffId));
    if(idx<0) return;
    const p:any={...playoffs[idx]};
    if(p.resolved) return;
    const winnerId=winner==="lower"?String(p.lowerPlayerId):String(p.upperPlayerId);
    const now=Date.now();
    const movements=Array.isArray(cycle?.movements)?cycle.movements.slice():[];
    if(winner==="lower"){
      cycle.assignments[String(p.upperPlayerId)]=Number(p.lowerDivision);
      cycle.assignments[String(p.lowerPlayerId)]=Number(p.upperDivision);
      movements.push({playerId:String(p.upperPlayerId),from:Number(p.upperDivision),to:Number(p.lowerDivision)});
      movements.push({playerId:String(p.lowerPlayerId),from:Number(p.lowerDivision),to:Number(p.upperDivision)});
    }
    playoffs[idx]={...p,resolved:true,winnerPlayerId:winnerId,resolvedAt:now};
    cycle.pendingPlayoffs=playoffs;
    cycle.movements=movements;
    cycles[cycleIndex]=cycle;
    cfg.divisionCycles=cycles;

    const unresolved=playoffs.some((row:any)=>!row?.resolved);
    if(!unresolved){
      const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
      const sequential=String(schedule?.publicationMode||"round_by_round")==="round_by_round";
      const currentRows=schedule.rounds.filter((row:any)=>Number(row?.cycle||1)===challengeCurrentCycle).sort((a:any,b:any)=>Number(a?.round||0)-Number(b?.round||0));
      const firstId=String(currentRows[0]?.id||"");
      schedule.rounds=schedule.rounds.map((row:any)=>{
        if(Number(row?.cycle||1)!==challengeCurrentCycle) return row;
        if(!sequential || String(row?.id)===firstId) return {...row,status:"open",openedAt:row?.openedAt||now,closedAt:null};
        return {...row,status:"locked",openedAt:null,closedAt:null};
      });
      cfg.schedule=schedule;
    }
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:now};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(unresolved?"Barrage enregistré. D’autres barrages restent à résoudre.":`Barrages terminés · cycle ${challengeCurrentCycle} ouvert.`);
  },[tour,isCompetitionAdmin,challengeCurrentCycle,persist,safeMatches]);


  const saveChallengeSeasonSettings = React.useCallback(async(statusOverride?: "draft" | "running" | "finished")=>{
    if(!tour||!isCompetitionAdmin||!isChallengePerformanceCompetition||!canAdmin("rules")) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const current:any=cfg.season||{};
    const maxCyclesRaw=String(adminSeasonMaxCycles||"").trim();
    const maxCycles=maxCyclesRaw?Math.max(1,Math.floor(Number(maxCyclesRaw)||1)):current?.maxCycles??null;
    const endRaw=String(adminSeasonEndDate||"").trim();
    const endsAt=endRaw?new Date(`${endRaw}T23:59:59`).getTime():(current?.endsAt??null);
    const name=(String(adminSeasonName||"").trim()||String(current?.name||"").trim()||String((tour as any).name||"Saison Challenge"));
    cfg.season={
      ...current,
      name,
      status:statusOverride||current?.status||"running",
      maxCycles:maxCycles||null,
      endsAt:Number.isFinite(Number(endsAt))?Number(endsAt):null,
      startedAt:current?.startedAt||Date.now(),
      ...(statusOverride==="finished"?{finishedAt:Date.now()}:{}),
    };
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(statusOverride==="finished"?"Saison clôturée.":"Paramètres de saison enregistrés.");
  },[tour,isCompetitionAdmin,isChallengePerformanceCompetition,adminSeasonName,adminSeasonMaxCycles,adminSeasonEndDate,persist,safeMatches]);

  const saveChallengeCompetitionRules = React.useCallback(async()=>{
    if(!tour||!isCompetitionAdmin||!isChallengePerformanceCompetition||!canAdmin("rules")) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const requestedAttempts=Math.max(1,Math.min(5,Number(adminChallengeAttempts)||1));
    let maxAlreadyUsed=0;
    for(const player of tournamentPlayers){
      const pid=String(player?.id||"");
      if(!pid) continue;
      for(const objective of challengeObjectives){
        let used=0;
        for(const link of linkedHistoryMatches){
          if(Math.max(1,Number(link?.challengeCycle||1)||1)!==challengeCurrentCycle) continue;
          if(normalizeChallengeObjective(link?.challengeObjective||link?.target||link?.objective)!==objective) continue;
          if((Array.isArray(link?.ranking)?link.ranking:[]).some((row:any)=>String(row?.playerId||row?.id||"")===pid)) used++;
        }
        maxAlreadyUsed=Math.max(maxAlreadyUsed,used);
      }
    }
    if(requestedAttempts<maxAlreadyUsed){
      setAdminNotice(`Impossible de descendre à ${requestedAttempts} essai${requestedAttempts>1?"s":""} : un joueur en a déjà utilisé ${maxAlreadyUsed} sur un objectif du cycle en cours.`);
      return;
    }
    const pointsPreset=adminChallengePointsPreset;
    const pointsTable=pointsPreset==="f1"
      ? [25,18,15,12,10,8,6,4,2,1]
      : pointsPreset==="linear"
        ? [10,9,8,7,6,5,4,3,2,1]
        : Array.isArray(cfg?.pointsTable)&&cfg.pointsTable.length&&pointsPreset==="custom"
          ? cfg.pointsTable.slice()
          : [25,20,16,13,11,10,9,8,7,6,5,4,3,2,1];
    cfg.attemptsPerObjective=requestedAttempts;
    cfg.pointsPreset=pointsPreset;
    cfg.pointsTable=pointsTable;
    cfg.countBestObjectives=Math.max(0,Number(adminChallengeCountBest)||0)||null;
    cfg.cyclePoints={
      ...(cfg.cyclePoints||{}),
      mode:adminChallengeCyclePointsMode,
      carryPercent:adminChallengeCyclePointsMode==="carry_percent"?Math.max(0,Math.min(100,Number(adminChallengeCarryPercent)||0)):undefined,
    };
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const previousMode=String(schedule?.publicationMode||"round_by_round");
    schedule.publicationMode=adminChallengePublicationMode;
    schedule.objectivesPerRound=Math.max(1,Math.min(5,Number(adminChallengeObjectivesPerRound)||1));

    const hasCurrentResults=linkedHistoryMatches.some((row:any)=>Math.max(1,Number(row?.challengeCycle||1)||1)===challengeCurrentCycle);
    if(!hasCurrentResults){
      const perRound=schedule.objectivesPerRound;
      const chunks:any[]=[];
      for(let index=0;index<challengeObjectives.length;index+=perRound) chunks.push(challengeObjectives.slice(index,index+perRound));
      const now=Date.now();
      const rebuilt=chunks.map((objectives:string[],index:number)=>({
        id:`cycle-${challengeCurrentCycle}-round-${index+1}`,
        cycle:challengeCurrentCycle,
        round:index+1,
        objectives,
        status:adminChallengePublicationMode==="all"||index===0?"open":"locked",
        openedAt:adminChallengePublicationMode==="all"||index===0?now:null,
        closedAt:null,
      }));
      schedule.rounds=[...schedule.rounds.filter((row:any)=>Number(row?.cycle||1)!==challengeCurrentCycle),...rebuilt];
    }else if(previousMode!==adminChallengePublicationMode){
      schedule.rounds=schedule.rounds.map((row:any)=>{
        if(Number(row?.cycle||1)!==challengeCurrentCycle||String(row?.status)==="closed") return row;
        if(adminChallengePublicationMode==="all") return {...row,status:"open",openedAt:row?.openedAt||Date.now()};
        return row;
      });
    }
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(hasCurrentResults
      ?"Règles enregistrées. Les nouvelles découpes de journées s’appliqueront aux prochains cycles pour ne pas casser les résultats du cycle en cours."
      :"Règles Challenge enregistrées et calendrier du cycle recalculé.");
  },[tour,isCompetitionAdmin,isChallengePerformanceCompetition,adminChallengePointsPreset,adminChallengeAttempts,adminChallengeCountBest,adminChallengeCyclePointsMode,adminChallengeCarryPercent,adminChallengePublicationMode,adminChallengeObjectivesPerRound,linkedHistoryMatches,challengeCurrentCycle,challengeObjectives,tournamentPlayers,persist,safeMatches]);

  const saveChallengeObjectiveProgram = React.useCallback(async(nextObjectivesRaw:string[],notice:string)=>{
    if(!tour||!isCompetitionAdmin||!isChallengePerformanceCompetition||!canAdmin("rules")) return false;
    const nextObjectives=Array.from(new Set(nextObjectivesRaw.map(normalizeChallengeObjective).filter(Boolean)));
    if(!nextObjectives.length){setAdminNotice("La compétition doit conserver au moins un objectif.");return false;}
    const removed=challengeObjectives.filter((objective:string)=>!nextObjectives.includes(objective));
    const blocked=removed.find((objective:string)=>linkedHistoryMatches.some((row:any)=>normalizeChallengeObjective(row?.challengeObjective||row?.target||row?.objective)===objective));
    if(blocked){
      setAdminNotice(`${challengeObjectiveLabel(blocked)} possède déjà des résultats liés et ne peut plus être retiré de la saison.`);
      return false;
    }

    const cfg:any={...((tour as any).challengeCompetition||{})};
    if(cfg?.objectiveSettings && typeof cfg.objectiveSettings==="object"){
      cfg.objectiveSettings=Object.fromEntries(Object.entries(cfg.objectiveSettings).filter(([key])=>nextObjectives.includes(normalizeChallengeObjective(key))));
    }
    if(cfg?.divisions && typeof cfg.divisions==="object"){
      const div:any={...cfg.divisions};
      const pool=(Array.isArray(div?.playoffObjectives)?div.playoffObjectives:[])
        .map(normalizeChallengeObjective)
        .filter((value:string)=>nextObjectives.includes(value));
      const fallback=nextObjectives[0];
      div.playoffObjectives=pool.length?pool:[fallback];
      if(!nextObjectives.includes(normalizeChallengeObjective(div?.playoffObjective))) div.playoffObjective=div.playoffObjectives[0];
      cfg.divisions=div;
    }
    const game:any={...((tour as any).game||{}),rules:{...(((tour as any).game||{})?.rules||{})}};
    game.rules.objectiveMode=nextObjectives.length===1?"fixed":"pool";
    game.rules.objectiveTargets=nextObjectives.slice();
    game.rules.target=nextObjectives[0];

    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const currentRounds=schedule.rounds.filter((row:any)=>Number(row?.cycle||1)===challengeCurrentCycle);
    const statusByObjective=new Map<string,string>();
    for(const row of currentRounds){
      for(const objective of Array.isArray(row?.objectives)?row.objectives:[]){
        statusByObjective.set(normalizeChallengeObjective(objective),String(row?.status||"locked"));
      }
    }
    const perRound=Math.max(1,Math.min(5,Number(schedule?.objectivesPerRound||adminChallengeObjectivesPerRound||1)||1));
    const chunks:string[][]=[];
    for(let i=0;i<nextObjectives.length;i+=perRound) chunks.push(nextObjectives.slice(i,i+perRound));
    const publication=String(schedule?.publicationMode||adminChallengePublicationMode||"round_by_round");
    let openAlready=false;
    const now=Date.now();
    const rebuilt=chunks.map((objectives:string[],index:number)=>{
      const prior=objectives.map(objective=>statusByObjective.get(objective)).filter(Boolean);
      let status:"locked"|"open"|"closed"="locked";
      if(prior.length&&prior.every(value=>value==="closed")) status="closed";
      else if(prior.some(value=>value==="open")){status="open";openAlready=true;}
      else if(publication==="all") status="open";
      else if(!openAlready&&index===0){status="open";openAlready=true;}
      return {
        id:`cycle-${challengeCurrentCycle}-round-${index+1}`,
        cycle:challengeCurrentCycle,
        round:index+1,
        objectives,
        status,
        openedAt:status==="open"?now:null,
        closedAt:status==="closed"?now:null,
      };
    });
    schedule.rounds=[...schedule.rounds.filter((row:any)=>Number(row?.cycle||1)!==challengeCurrentCycle),...rebuilt];
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),game,challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(notice);
    return true;
  },[tour,isCompetitionAdmin,isChallengePerformanceCompetition,challengeObjectives,linkedHistoryMatches,challengeCurrentCycle,adminChallengeObjectivesPerRound,adminChallengePublicationMode,persist,safeMatches]);

  const addChallengeSeasonObjective = React.useCallback(async()=>{
    const value=normalizeChallengeObjective(adminObjectiveToAdd);
    if(challengeObjectives.includes(value)){setAdminNotice(`${challengeObjectiveLabel(value)} est déjà dans le programme.`);return;}
    await saveChallengeObjectiveProgram([...challengeObjectives,value],`${challengeObjectiveLabel(value)} ajouté au programme.`);
  },[adminObjectiveToAdd,challengeObjectives,saveChallengeObjectiveProgram]);

  const removeChallengeSeasonObjective = React.useCallback(async(objective:string)=>{
    await saveChallengeObjectiveProgram(challengeObjectives.filter((value:string)=>value!==objective),`${challengeObjectiveLabel(objective)} retiré du programme.`);
  },[challengeObjectives,saveChallengeObjectiveProgram]);

  const moveChallengeSeasonObjective = React.useCallback(async(objective:string,direction:-1|1)=>{
    const index=challengeObjectives.indexOf(objective);
    const target=index+direction;
    if(index<0||target<0||target>=challengeObjectives.length) return;
    const next=challengeObjectives.slice();
    const tmp=next[index]; next[index]=next[target]; next[target]=tmp;
    await saveChallengeObjectiveProgram(next,`Ordre des objectifs mis à jour.`);
  },[challengeObjectives,saveChallengeObjectiveProgram]);

  const updateChallengeObjectiveSetting = React.useCallback(async(objective:string,patch:any)=>{
    if(!tour||!isCompetitionAdmin||!isChallengePerformanceCompetition||!canAdmin("rules")) return;
    const key=normalizeChallengeObjective(objective);
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const objectiveSettings:any={...(cfg.objectiveSettings||{})};
    const current:any={...(objectiveSettings[key]||{})};
    const next:any={...current,...patch};
    if(next.visits!=null) next.visits=Math.max(1,Math.min(200,Number(next.visits)||1));
    if(next.attemptsPerObjective!=null) next.attemptsPerObjective=Math.max(1,Math.min(5,Number(next.attemptsPerObjective)||1));

    if(next.attemptsPerObjective!=null){
      let alreadyUsed=0;
      for(const player of tournamentPlayers){
        const pid=String(player?.id||"");
        let used=0;
        for(const link of linkedHistoryMatches){
          if(Math.max(1,Number(link?.challengeCycle||1)||1)!==challengeCurrentCycle) continue;
          if(normalizeChallengeObjective(link?.challengeObjective||link?.target||link?.objective)!==key) continue;
          if((Array.isArray(link?.ranking)?link.ranking:[]).some((row:any)=>String(row?.playerId||row?.id||"")===pid)) used++;
        }
        alreadyUsed=Math.max(alreadyUsed,used);
      }
      if(Number(next.attemptsPerObjective)<alreadyUsed){
        setAdminNotice(`${challengeObjectiveLabel(key)} : impossible de limiter à ${next.attemptsPerObjective}, un joueur a déjà ${alreadyUsed} essai${alreadyUsed>1?"s":""}.`);
        return;
      }
    }
    objectiveSettings[key]=next;
    cfg.objectiveSettings=objectiveSettings;
    await persist({...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()} as any,safeMatches as any);
    setAdminNotice(`${challengeObjectiveLabel(key)} · réglages enregistrés.`);
  },[tour,isCompetitionAdmin,isChallengePerformanceCompetition,tournamentPlayers,linkedHistoryMatches,challengeCurrentCycle,persist,safeMatches]);

  const toggleAdminPlayoffObjective = React.useCallback((objective:string)=>{
    const value=normalizeChallengeObjective(objective);
    setAdminPlayoffObjectives(prev=>{
      if(adminPlayoffObjectiveMode==="fixed") return [value];
      if(prev.includes(value)){
        const next=prev.filter(item=>item!==value);
        return next.length?next:[value];
      }
      return [...prev,value];
    });
  },[adminPlayoffObjectiveMode]);

  const saveChallengePlayoffSettings = React.useCallback(async()=>{
    if(!tour||!isCompetitionAdmin||challengeCompetitionFormat!=="divisions"||!canAdmin("rules")) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const div:any={...(cfg.divisions||{})};
    const available=challengeObjectives.length?challengeObjectives:["20"];
    const filtered=Array.from(new Set((adminPlayoffObjectives.length?adminPlayoffObjectives:[available[0]]).map(normalizeChallengeObjective).filter((value:string)=>available.includes(value))));
    const selected=filtered.length?filtered:[available[0]];
    div.playoffObjectiveMode=adminPlayoffObjectiveMode;
    div.playoffObjectives=adminPlayoffObjectiveMode==="fixed"?[selected[0]]:selected;
    div.playoffObjective=selected[0];
    div.playoffAttemptsPerObjective=Math.max(1,Math.min(5,Number(adminPlayoffAttempts)||1));
    div.playoffVisits=Math.max(1,Math.min(200,Number(adminPlayoffVisits)||30));
    cfg.divisions=div;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice("Configuration des barrages enregistrée. Elle s’appliquera aux prochains barrages créés.");
  },[tour,isCompetitionAdmin,challengeCompetitionFormat,challengeObjectives,adminPlayoffObjectives,adminPlayoffObjectiveMode,adminPlayoffAttempts,adminPlayoffVisits,persist,safeMatches]);

  const reassignChallengePlayerDivision = React.useCallback(async(playerId:string,nextDivision:number)=>{
    if(!tour||!isCompetitionAdmin||challengeCompetitionFormat!=="divisions"||!canAdmin("schedule")) return;
    const division=Math.max(1,Math.min(challengeDivisionState.count,Math.floor(Number(nextDivision)||1)));
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    let index=cycles.findIndex((row:any)=>Number(row?.cycle)===challengeCurrentCycle);
    if(index<0){
      cycles.push({cycle:challengeCurrentCycle,name:`Cycle ${challengeCurrentCycle}`,status:"active",createdAt:Date.now(),assignments:{},carryPoints:{}});
      index=cycles.length-1;
    }
    const cycle:any={...cycles[index],assignments:{...(cycles[index]?.assignments||{})}};
    const from=Math.max(1,Number(cycle.assignments[String(playerId)]||challengeDivisionState.assignments[String(playerId)]||1)||1);
    if(from===division) return;
    if((Array.isArray(cycle?.pendingPlayoffs)?cycle.pendingPlayoffs:[]).some((row:any)=>!row?.resolved&&(String(row?.upperPlayerId)===String(playerId)||String(row?.lowerPlayerId)===String(playerId)))){
      setAdminNotice("Ce joueur participe à un barrage en attente. Résous ou réinitialise d’abord le barrage.");
      return;
    }
    cycle.assignments[String(playerId)]=division;
    cycle.movements=[...(Array.isArray(cycle?.movements)?cycle.movements:[]),{
      id:`manual-${challengeCurrentCycle}-${playerId}-${Date.now()}`,
      playerId:String(playerId),
      from,
      to:division,
      manual:true,
      reason:"manual",
      cycle:challengeCurrentCycle,
      at:Date.now(),
    }];
    cycles[index]=cycle;
    cfg.divisionCycles=cycles;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(`${playersById[String(playerId)]?.name||"Joueur"} déplacé de D${from} vers D${division}.`);
  },[tour,isCompetitionAdmin,challengeCompetitionFormat,challengeDivisionState,challengeCurrentCycle,playersById,persist,safeMatches]);

  const createChallengeDraftCycle = React.useCallback(async()=>{
    if(!tour||!isCompetitionAdmin||challengeCompetitionFormat!=="divisions") return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    if(cycles.some((row:any)=>String(row?.status||"")==="draft")){
      setAdminNotice("Un cycle brouillon existe déjà. Termine, active ou supprime-le avant d’en préparer un autre.");
      return;
    }
    const maxExisting=Math.max(challengeCurrentCycle,...cycles.map((row:any)=>Number(row?.cycle||0)||0));
    const nextCycle=maxExisting+1;
    const maxCycles=Math.max(0,Number(cfg?.season?.maxCycles||0)||0);
    if(maxCycles>0&&nextCycle>maxCycles){
      setAdminNotice(`La saison est limitée à ${maxCycles} cycle${maxCycles>1?"s":""}.`);
      return;
    }
    const now=Date.now();
    const assignments={...challengeDivisionState.assignments};
    cycles.push({
      cycle:nextCycle,
      name:`Cycle ${nextCycle}`,
      status:"draft",
      createdAt:now,
      assignments,
      carryPoints:{},
      pendingPlayoffs:[],
      movements:[],
    });
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
    const sourceRounds=challengeScheduleRounds.length?challengeScheduleRounds:[{objectives:challengeObjectives}];
    const draftRounds=sourceRounds.map((row:any,index:number)=>({
      id:`cycle-${nextCycle}-round-${index+1}`,
      cycle:nextCycle,
      round:index+1,
      objectives:Array.isArray(row?.objectives)?row.objectives.slice():[],
      status:"locked",
      openedAt:null,
      closedAt:null,
    }));
    schedule.rounds=[...schedule.rounds.filter((row:any)=>Number(row?.cycle||1)!==nextCycle),...draftRounds];
    cfg.divisionCycles=cycles;
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:now};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(`Cycle ${nextCycle} préparé en brouillon.`);
  },[tour,isCompetitionAdmin,challengeCompetitionFormat,challengeCurrentCycle,challengeDivisionState.assignments,challengeScheduleRounds,challengeObjectives,persist,safeMatches]);

  const deleteChallengeDraftCycle = React.useCallback(async(cycleNumber:number)=>{
    if(!tour||!isCompetitionAdmin||challengeCompetitionFormat!=="divisions") return;
    const cycleNo=Math.max(1,Math.floor(Number(cycleNumber)||1));
    if(cycleNo===challengeCurrentCycle){setAdminNotice("Le cycle actif ne peut pas être supprimé.");return;}
    if(linkedHistoryMatches.some((row:any)=>Number(row?.challengeCycle||1)===cycleNo)){
      setAdminNotice("Ce cycle contient déjà des résultats et ne peut pas être supprimé.");
      return;
    }
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    const target=cycles.find((row:any)=>Number(row?.cycle)===cycleNo);
    if(!target||String(target?.status||"draft")!=="draft"){setAdminNotice("Seuls les cycles brouillons peuvent être supprimés.");return;}
    cfg.divisionCycles=cycles.filter((row:any)=>Number(row?.cycle)!==cycleNo);
    const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.filter((row:any)=>Number(row?.cycle||1)!==cycleNo):[]};
    cfg.schedule=schedule;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice(`Cycle ${cycleNo} supprimé.`);
  },[tour,isCompetitionAdmin,challengeCompetitionFormat,challengeCurrentCycle,linkedHistoryMatches,persist,safeMatches]);

  const launchChallengePlayoffAttempt = React.useCallback((playoff:any,side:"upper"|"lower",objectiveOverride?:string)=>{
    if(!tour||!playoff||playoff?.resolved) return;
    const playerId=String(side==="upper"?playoff?.upperPlayerId:playoff?.lowerPlayerId);
    const player=playersById[playerId];
    if(!player){setAdminNotice("Profil du joueur introuvable pour ce barrage.");return;}
    const objectives=(Array.isArray(playoff?.objectives)&&playoff.objectives.length?playoff.objectives:[playoff?.objective||challengeCompetition?.divisions?.playoffObjective||challengeObjectives[0]||challengeRules?.target||"20"]).map(normalizeChallengeObjective);
    const objective=normalizeChallengeObjective(objectiveOverride||objectives[0]);
    if(!objectives.includes(objective)){setAdminNotice("Objectif de barrage invalide.");return;}
    const maxAttempts=Math.max(1,Math.min(5,Number(playoff?.attemptsPerObjective||challengeCompetition?.divisions?.playoffAttemptsPerObjective||1)||1));
    const results=Array.isArray(playoff?.results)?playoff.results:[];
    const used=results.filter((row:any)=>String(row?.side)===side&&normalizeChallengeObjective(row?.objective)===objective).length;
    if(used>=maxAttempts){
      setAdminNotice(`${player?.name||"Joueur"} a utilisé ses ${maxAttempts} essai${maxAttempts>1?"s":""} sur ${challengeObjectiveLabel(objective)}.`);
      return;
    }
    const visits=Math.max(1,Number(playoff?.visits||challengeCompetition?.divisions?.playoffVisits||challengeRules?.visits||30)||30);
    const rule=objective==="any-double"?"double":objective==="any-triple"?"triple":objective==="bull"?"bull":String(challengeRules?.rule||"all");
    setActiveChallengeAttempt({
      kind:"playoff",
      playoffId:String(playoff?.id||""),
      playoffSide:side,
      playoffObjective:objective,
      player,
      objective,
      attemptNumber:used+1,
      cycle:challengeCurrentCycle,
      roundId:"",
      roundNumber:null,
      config:{
        target:objective,
        visits,
        rule,
        playerIds:[playerId],
        teamIds:[],
        participantMode:"players",
        participantSource:"direct",
        configMode:"complete",
        matchMode:"solo",
        soundsEnabled:true,
        competition:{
          tournamentId:(tour as any).id,
          name:(tour as any).name,
          playoff:true,
          playoffId:String(playoff?.id||""),
          playoffSide:side,
          objective,
          attemptNumber:used+1,
          maxAttempts,
          tieBreak:String(challengeRules?.tieBreak||"segment_sum"),
          cycle:challengeCurrentCycle,
        }
      }
    });
  },[tour,playersById,challengeCompetition,challengeObjectives,challengeRules,challengeCurrentCycle]);

  const resetChallengePlayoff = React.useCallback(async(playoffId:string)=>{
    if(!tour||!isCompetitionAdmin) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    const cycleIndex=cycles.findIndex((row:any)=>Number(row?.cycle)===challengeCurrentCycle);
    if(cycleIndex<0) return;
    const cycle:any={...cycles[cycleIndex]};
    const playoffs=Array.isArray(cycle?.pendingPlayoffs)?cycle.pendingPlayoffs.slice():[];
    const index=playoffs.findIndex((row:any)=>String(row?.id)===String(playoffId));
    if(index<0) return;
    const p:any={...playoffs[index]};
    if(p?.resolved){setAdminNotice("Un barrage déjà résolu ne peut pas être réinitialisé depuis ce bouton.");return;}
    playoffs[index]={...p,status:"pending",results:[],upperScore:null,lowerScore:null,upperTieBreak:null,lowerTieBreak:null,upperHistoryMatchId:null,lowerHistoryMatchId:null,winnerPlayerId:null,resolved:false,resolvedAt:null};
    cycle.pendingPlayoffs=playoffs;
    cycles[cycleIndex]=cycle;
    cfg.divisionCycles=cycles;
    const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
    await persist(nextTour,safeMatches as any);
    setAdminNotice("Barrage réinitialisé. Les deux joueurs peuvent rejouer.");
  },[tour,isCompetitionAdmin,challengeCurrentCycle,persist,safeMatches]);

  const finalizeChallengePlayoff = React.useCallback(async(playoffId:string)=>{
    if(!tour||!isCompetitionAdmin) return;
    const cfg:any={...((tour as any).challengeCompetition||{})};
    const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
    const cycleIndex=cycles.findIndex((row:any)=>Number(row?.cycle)===challengeCurrentCycle);
    if(cycleIndex<0) return;
    const cycle:any={...cycles[cycleIndex],assignments:{...(cycles[cycleIndex]?.assignments||{})}};
    const playoffs=Array.isArray(cycle?.pendingPlayoffs)?cycle.pendingPlayoffs.slice():[];
    const idx=playoffs.findIndex((row:any)=>String(row?.id)===String(playoffId));
    if(idx<0) return;
    const p:any={...playoffs[idx]};
    if(p?.resolved) return;

    const objectives=(Array.isArray(p?.objectives)&&p.objectives.length?p.objectives:[p?.objective||challengeCompetition?.divisions?.playoffObjective||challengeObjectives[0]||"20"]).map(normalizeChallengeObjective);
    const results=Array.isArray(p?.results)?p.results:[];
    const upperId=String(p?.upperPlayerId||"");
    const lowerId=String(p?.lowerPlayerId||"");
    const bestFor=(side:"upper"|"lower",objective:string)=>{
      return results
        .filter((row:any)=>String(row?.side)===side&&normalizeChallengeObjective(row?.objective)===objective)
        .slice()
        .sort((a:any,b:any)=>Number(b?.score||0)-Number(a?.score||0)||Number(b?.tieBreak||0)-Number(a?.tieBreak||0))[0]||null;
    };
    const missing=objectives.some((objective:string)=>!bestFor("upper",objective)||!bestFor("lower",objective));
    if(missing){
      setAdminNotice("Chaque joueur doit avoir au moins un essai sur chaque objectif du barrage avant validation.");
      return;
    }

    let upperObjectiveWins=0;
    let lowerObjectiveWins=0;
    let totalUpperScore=0;
    let totalLowerScore=0;
    let totalUpperTie=0;
    let totalLowerTie=0;
    const detail:any[]=[];
    for(const objective of objectives){
      const upper=bestFor("upper",objective);
      const lower=bestFor("lower",objective);
      const us=Number(upper?.score||0)||0;
      const ls=Number(lower?.score||0)||0;
      const ut=Number(upper?.tieBreak||0)||0;
      const lt=Number(lower?.tieBreak||0)||0;
      totalUpperScore+=us; totalLowerScore+=ls; totalUpperTie+=ut; totalLowerTie+=lt;
      let winner:"upper"|"lower"|"tie"="tie";
      if(us!==ls) winner=us>ls?"upper":"lower";
      else if(ut!==lt) winner=ut>lt?"upper":"lower";
      if(winner==="upper") upperObjectiveWins++;
      if(winner==="lower") lowerObjectiveWins++;
      detail.push({objective,upperScore:us,lowerScore:ls,upperTieBreak:ut,lowerTieBreak:lt,winner});
    }

    let winnerSide:"upper"|"lower"|null=null;
    if(upperObjectiveWins!==lowerObjectiveWins) winnerSide=upperObjectiveWins>lowerObjectiveWins?"upper":"lower";
    else if(totalUpperScore!==totalLowerScore) winnerSide=totalUpperScore>totalLowerScore?"upper":"lower";
    else if(totalUpperTie!==totalLowerTie) winnerSide=totalUpperTie>totalLowerTie?"upper":"lower";

    const now=Date.now();
    p.upperScore=totalUpperScore;
    p.lowerScore=totalLowerScore;
    p.upperTieBreak=totalUpperTie;
    p.lowerTieBreak=totalLowerTie;
    p.objectiveResults=detail;

    if(!winnerSide){
      p.status="tied";
      p.resolved=false;
      p.winnerPlayerId=null;
      playoffs[idx]=p;
      cycle.pendingPlayoffs=playoffs;
      cycles[cycleIndex]=cycle;
      cfg.divisionCycles=cycles;
      await persist({...(tour as any),challengeCompetition:cfg,updatedAt:now} as any,safeMatches as any);
      setAdminNotice(`Barrage à égalité parfaite (${upperObjectiveWins}-${lowerObjectiveWins} sur les objectifs). Rejoue ou ajoute des essais.`);
      return;
    }

    const winnerId=winnerSide==="upper"?upperId:lowerId;
    const movements=Array.isArray(cycle?.movements)?cycle.movements.slice():[];
    if(winnerSide==="lower"){
      cycle.assignments[upperId]=Number(p.lowerDivision);
      cycle.assignments[lowerId]=Number(p.upperDivision);
      movements.push({
        id:`playoff-${p.id}-${upperId}-${now}`,
        playerId:upperId,from:Number(p.upperDivision),to:Number(p.lowerDivision),
        reason:"playoff",cycle:challengeCurrentCycle,at:now,playoffId:String(p.id),
        note:`Barrage perdu contre ${playersById[lowerId]?.name||"adversaire"}`,
      });
      movements.push({
        id:`playoff-${p.id}-${lowerId}-${now}`,
        playerId:lowerId,from:Number(p.lowerDivision),to:Number(p.upperDivision),
        reason:"playoff",cycle:challengeCurrentCycle,at:now,playoffId:String(p.id),
        note:`Barrage gagné contre ${playersById[upperId]?.name||"adversaire"}`,
      });
    }
    p.status="resolved";
    p.resolved=true;
    p.winnerPlayerId=winnerId;
    p.resolvedAt=now;
    playoffs[idx]=p;
    cycle.pendingPlayoffs=playoffs;
    cycle.movements=movements;
    cycles[cycleIndex]=cycle;
    cfg.divisionCycles=cycles;

    const unresolved=playoffs.some((row:any)=>!row?.resolved);
    if(!unresolved){
      const schedule:any={...(cfg.schedule||{}),rounds:Array.isArray(cfg?.schedule?.rounds)?cfg.schedule.rounds.slice():[]};
      const sequential=String(schedule?.publicationMode||"round_by_round")==="round_by_round";
      const currentRows=schedule.rounds.filter((row:any)=>Number(row?.cycle||1)===challengeCurrentCycle).sort((a:any,b:any)=>Number(a?.round||0)-Number(b?.round||0));
      const firstId=String(currentRows[0]?.id||"");
      schedule.rounds=schedule.rounds.map((row:any)=>{
        if(Number(row?.cycle||1)!==challengeCurrentCycle) return row;
        if(!sequential||String(row?.id)===firstId) return {...row,status:"open",openedAt:row?.openedAt||now,closedAt:null};
        return {...row,status:"locked",openedAt:null,closedAt:null};
      });
      cfg.schedule=schedule;
    }
    await persist({...(tour as any),challengeCompetition:cfg,updatedAt:now} as any,safeMatches as any);
    setAdminNotice(`Barrage validé · ${playersById[winnerId]?.name||"vainqueur"} gagne ${upperObjectiveWins}-${lowerObjectiveWins} sur les objectifs.`);
  },[tour,isCompetitionAdmin,challengeCurrentCycle,challengeCompetition,challengeObjectives,playersById,persist,safeMatches]);

  const finishDirectChallengeAttempt = React.useCallback(async(result:any)=>{
    if(!tour||!activeChallengeAttempt) return;
    try{
      const rec=result?.record||null;
      const link=rec?buildLinkedHistoryEntry(rec,tour):null;
      if(!link) return;

      if(String(activeChallengeAttempt?.kind||"attempt")==="playoff"){
        const ranking=Array.isArray(link?.ranking)?link.ranking:[];
        const pid=String(activeChallengeAttempt?.player?.id||"");
        const row=ranking.find((r:any)=>String(r?.playerId||r?.id||"")===pid)||ranking[0]||{};
        const score=Number(row?.score??row?.points??row?.bestScore??row?.best??0)||0;
        const tie=Number(row?.tieBreakPoints??row?.segmentSum??row?.tieBreak??0)||0;
        const historyId=String(link?.historyMatchId||link?.matchId||link?.id||"")||null;
        const objective=normalizeChallengeObjective(activeChallengeAttempt?.playoffObjective||activeChallengeAttempt?.objective||"20");
        const side=String(activeChallengeAttempt?.playoffSide)==="lower"?"lower":"upper";
        const attemptNumber=Math.max(1,Number(activeChallengeAttempt?.attemptNumber||1)||1);

        const cfg:any={...((tour as any).challengeCompetition||{})};
        const cycles=Array.isArray(cfg?.divisionCycles)?cfg.divisionCycles.slice():[];
        const cycleIndex=cycles.findIndex((c:any)=>Number(c?.cycle)===Math.max(1,Number(activeChallengeAttempt?.cycle||challengeCurrentCycle)||challengeCurrentCycle));
        if(cycleIndex<0) return;
        const cycle:any={...cycles[cycleIndex],assignments:{...(cycles[cycleIndex]?.assignments||{})}};
        const playoffs=Array.isArray(cycle?.pendingPlayoffs)?cycle.pendingPlayoffs.slice():[];
        const playoffIndex=playoffs.findIndex((r:any)=>String(r?.id)===String(activeChallengeAttempt?.playoffId||""));
        if(playoffIndex<0) return;
        const playoff:any={...playoffs[playoffIndex]};
        const results=Array.isArray(playoff?.results)?playoff.results.slice():[];
        results.push({
          id:`${String(playoff.id)}-${side}-${objective}-${attemptNumber}-${Date.now()}`,
          playerId:pid,
          side,
          objective,
          attemptNumber,
          score,
          tieBreak:tie,
          historyMatchId:historyId,
          createdAt:Date.now(),
        });
        playoff.results=results;
        playoff.status="playing";

        // Legacy summary fields remain populated for old UI/data readers.
        const bestSideObjective=results
          .filter((r:any)=>String(r?.side)===side&&normalizeChallengeObjective(r?.objective)===objective)
          .slice()
          .sort((a:any,b:any)=>Number(b?.score||0)-Number(a?.score||0)||Number(b?.tieBreak||0)-Number(a?.tieBreak||0))[0];
        if(side==="upper"){
          playoff.upperScore=Number(bestSideObjective?.score||0);
          playoff.upperTieBreak=Number(bestSideObjective?.tieBreak||0);
          playoff.upperHistoryMatchId=bestSideObjective?.historyMatchId||null;
        }else{
          playoff.lowerScore=Number(bestSideObjective?.score||0);
          playoff.lowerTieBreak=Number(bestSideObjective?.tieBreak||0);
          playoff.lowerHistoryMatchId=bestSideObjective?.historyMatchId||null;
        }

        playoffs[playoffIndex]=playoff;
        cycle.pendingPlayoffs=playoffs;
        cycles[cycleIndex]=cycle;
        cfg.divisionCycles=cycles;
        const nextTour:any={...(tour as any),challengeCompetition:cfg,updatedAt:Date.now()};
        await persist(nextTour,safeMatches as any);
        const maxAttempts=Math.max(1,Math.min(5,Number(playoff?.attemptsPerObjective||cfg?.divisions?.playoffAttemptsPerObjective||1)||1));
        setAdminNotice(`Barrage · ${activeChallengeAttempt?.player?.name||"joueur"} · ${challengeObjectiveLabel(objective)} · essai ${attemptNumber}/${maxAttempts} enregistré (${score}).`);
        setActiveChallengeAttempt(null);
        return;
      }

      link.challengeObjective=normalizeChallengeObjective(activeChallengeAttempt.objective);
      link.challengeAttemptNumber=Number(activeChallengeAttempt.attemptNumber||1);
      link.challengeCycle=Math.max(1,Number(activeChallengeAttempt.cycle||1)||1);
      link.challengeRoundId=String(activeChallengeAttempt.roundId||"");
      link.challengeRoundNumber=activeChallengeAttempt.roundNumber==null?null:Number(activeChallengeAttempt.roundNumber||0);
      link.challengeDirect=true;
      const existing=Array.isArray((tour as any)?.linkedMatches)?(tour as any).linkedMatches.slice():[];
      const hid=String(link?.historyMatchId||link?.matchId||link?.id||"");
      const deduped=existing.filter((x:any)=>String(x?.historyMatchId||x?.matchId||x?.id||"")!==hid);
      const nextLinked=[...deduped,link];
      const nextTour:any={...(tour as any),linkedMatches:nextLinked,meta:{...((tour as any)?.meta||{}),linkedMatches:nextLinked},updatedAt:Date.now()};
      await persist(nextTour as any,safeMatches as any);
      const maxAttempts=Math.max(1,Number(activeChallengeAttempt?.config?.competition?.maxAttempts||challengeObjectiveAttemptLimit(activeChallengeAttempt.objective))||1);
      setAdminNotice(`${challengeObjectiveLabel(activeChallengeAttempt.objective)} · essai ${activeChallengeAttempt.attemptNumber}/${maxAttempts} enregistré automatiquement.`);
      setActiveChallengeAttempt(null);
    }catch(e){
      console.error("[TournamentView] direct challenge attempt persistence failed",e);
      setActiveChallengeAttempt(null);
    }
  },[tour,activeChallengeAttempt,challengeCurrentCycle,playersById,persist,safeMatches,challengeObjectiveAttemptLimit]);



  const loadAttachableHistory = React.useCallback(async () => {
    if (!tour) return;
    setAttachOpen(true);
    setAttachLoading(true);
    setAttachError("");
    setAttachInfo("");
    setAttachSelected({});
    try {
      const linkedIds = new Set((linkedHistoryMatches || []).map((x: any) => String(x?.historyMatchId || x?.matchId || x?.id || "")).filter(Boolean));
      const api: any = History as any;
      const raw = typeof api.listFinished === "function" ? await api.listFinished() : await api.list();
      const rows = (Array.isArray(raw) ? raw : [])
        .filter((r: any) => getHistoryRowId(r))
        .filter((r: any) => !linkedIds.has(getHistoryRowId(r)))
        .filter((r: any) => getHistoryRowStatus(r) === "finished")
        .filter((r: any) => isHistoryCompatibleWithTournament(r, tour))
        .map((r: any) => ({
          ...r,
          __historyId: getHistoryRowId(r),
          __mode: getHistoryLinkedDisplayMode(r) || String((tour as any)?.game?.mode || "match"),
          __time: getHistoryRowTime(r),
          __rankingCount: getHistoryRanking(r).length,
          __playersCount: getHistoryPlayers(r).length,
        }))
        .filter((r: any) => {
          if (!isLeagueMulti) return true;
          return Number(r.__rankingCount || 0) >= 2 || Number(r.__playersCount || 0) >= 2;
        })
        .sort((a: any, b: any) => Number(b.__time || 0) - Number(a.__time || 0))
        .slice(0, 250);
      setAttachRows(rows);
      setAttachInfo(rows.length ? `${rows.length} partie(s) compatible(s) trouvée(s).` : "Aucune partie compatible trouvée dans l’historique.");
    } catch (e: any) {
      console.error("[TournamentView] load attachable history failed", e);
      setAttachRows([]);
      setAttachError(e?.message || "Impossible de charger l’historique.");
    } finally {
      setAttachLoading(false);
    }
  }, [tour, linkedHistoryMatches, isLeagueMulti]);

  const attachSelectedHistoryMatches = React.useCallback(async () => {
    if (!tour) return;
    const selectedIds = Object.keys(attachSelected || {}).filter((id) => attachSelected[id]);
    if (!selectedIds.length) {
      setAttachError("Sélectionne au moins une partie à rattacher.");
      return;
    }

    setAttachLoading(true);
    setAttachError("");
    try {
      const api: any = History as any;
      const linkedExisting = Array.isArray((tour as any)?.linkedMatches) ? (tour as any).linkedMatches.slice() : [];
      const linkedIds = new Set(linkedExisting.map((x: any) => String(x?.historyMatchId || x?.matchId || x?.id || "")).filter(Boolean));

      const entries: any[] = [];
      for (const hid of selectedIds) {
        if (linkedIds.has(hid)) continue;
        const lite = attachRows.find((r: any) => String(r.__historyId || getHistoryRowId(r)) === hid) || null;
        const full = typeof api.get === "function" ? ((await api.get(hid).catch(() => null)) || lite) : lite;
        if (!full) continue;
        const built:any=buildLinkedHistoryEntry(full, tour);
        if(isChallengePerformanceCompetition){
          const objective=normalizeChallengeObjective(built?.challengeObjective || built?.target || built?.objective || full?.target || full?.config?.target || full?.settings?.target || "");
          const round:any=objective?challengeRoundForObjective(objective):null;
          built.challengeCycle=challengeCurrentCycle;
          if(objective) built.challengeObjective=objective;
          built.challengeRoundId=String(round?.id||"");
          built.challengeRoundNumber=round?.round==null?null:Number(round.round||0);
        }
        entries.push(built);
      }

      if (!entries.length) {
        setAttachError("Aucune nouvelle partie à rattacher.");
        return;
      }

      const playersMap = new Map<string, any>();
      for (const p of Array.isArray((tour as any)?.players) ? (tour as any).players : []) {
        const idp = String(p?.id || "");
        if (idp) playersMap.set(idp, p);
      }
      for (const link of entries) {
        for (const p of Array.isArray(link?.players) ? link.players : []) {
          const idp = String(p?.id || p?.playerId || "");
          if (!idp || playersMap.has(idp)) continue;
          playersMap.set(idp, {
            id: idp,
            name: p?.name || "Joueur",
            avatarDataUrl: p?.avatarDataUrl || p?.avatar || p?.avatarUrl || null,
            avatarUrl: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || null,
            avatar: p?.avatarDataUrl || p?.avatar || p?.avatarUrl || null,
            isBot: !!p?.isBot,
          });
        }
        for (const r of Array.isArray(link?.ranking) ? link.ranking : []) {
          const idp = String(r?.playerId || r?.id || "");
          if (!idp || playersMap.has(idp)) continue;
          playersMap.set(idp, {
            id: idp,
            name: r?.name || "Joueur",
            avatarDataUrl: r?.avatarDataUrl || r?.avatar || r?.avatarUrl || null,
            avatarUrl: r?.avatarUrl || r?.avatarDataUrl || r?.avatar || null,
            avatar: r?.avatarDataUrl || r?.avatar || r?.avatarUrl || null,
            isBot: !!r?.isBot,
          });
        }
      }

      let nextMatches: any[] = Array.isArray(safeMatches) ? safeMatches.slice() : [];
      if (!isLeagueMulti && !isChallengePerformanceCompetition) {
        const existingByHistory = new Set(nextMatches.map((m: any) => String(m?.historyMatchId || "")).filter(Boolean));
        for (const link of entries) {
          const hid = String(link?.historyMatchId || "");
          if (!hid || existingByHistory.has(hid)) continue;
          const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
          if (ranking.length < 2) continue;
          const aId = String(ranking[0]?.playerId || ranking[0]?.id || "");
          const bId = String(ranking[1]?.playerId || ranking[1]?.id || "");
          if (!aId || !bId) continue;
          const src = attachRows.find((r: any) => String(r.__historyId || getHistoryRowId(r)) === hid) || null;
          const sc = getHistoryScorePair(src || link, aId, bId);
          nextMatches.push({
            id: `linked_${hid}`,
            tournamentId: (tour as any).id,
            stageIndex: 0,
            groupIndex: 0,
            roundIndex: 999,
            orderIndex: nextMatches.length,
            aPlayerId: aId,
            bPlayerId: bId,
            status: "done",
            winnerId: aId,
            scoreA: sc.a,
            scoreB: sc.b,
            setsA: sc.a,
            setsB: sc.b,
            legsA: sc.a,
            legsB: sc.b,
            historyMatchId: hid,
            createdAt: link.createdAt || Date.now(),
            updatedAt: Date.now(),
            phase: "groups",
            linkedFromHistory: true,
          });
        }
      }

      const nextLinked = [...linkedExisting, ...entries];
      const nextTour: any = {
        ...(tour as any),
        players: Array.from(playersMap.values()),
        linkedMatches: nextLinked,
        meta: { ...((tour as any)?.meta || {}), linkedMatches: nextLinked },
        updatedAt: Date.now(),
      };

      await persist(nextTour as any, nextMatches as any);
      setAttachOpen(false);
      setAttachRows([]);
      setAttachSelected({});
      setAttachInfo(`${entries.length} partie(s) rattachée(s).`);
    } catch (e: any) {
      console.error("[TournamentView] attach selected history failed", e);
      setAttachError(e?.message || "Erreur pendant le rattachement des parties.");
    } finally {
      setAttachLoading(false);
    }
  }, [tour, attachSelected, attachRows, safeMatches, isLeagueMulti, isChallengePerformanceCompetition, persist, challengeCurrentCycle, challengeRoundForObjective]);

  const onStartMatch = React.useCallback(
    async (matchId: string) => {
      if (!tour) return;
      try {
        const r = startMatch({ tournament: tour as any, matches: safeMatches as any, matchId });
        await persist(r.tournament as any, r.matches as any);
        go("tournament_match_play", { tournamentId: (tour as any).id, matchId });
      } catch (e) {
        console.error("[TournamentView] startMatch error:", e);
      }
    },
    [tour, safeMatches, persist, go]
  );

  const onOpenMatchDetails = React.useCallback((m: any) => setSelectedMatch(m), []);

  const autoQualified = React.useMemo(() => {
    const ids: string[] = [];
    for (const m of visibleMatches as any[]) {
      if (!m) continue;
      if (!isByeMatch(m)) continue;
      if (isVoidByeMatch(m)) continue;
      const pid = otherIdIfBye(m);
      if (!pid) continue;
      ids.push(pid);
    }
    const uniq = Array.from(new Set(ids)).filter((x) => x && !isByeId(x) && !isTbdId(x));
    return uniq.map((pid) => playersById[pid]).filter(Boolean);
  }, [visibleMatches, playersById]);

  const displayMatches = React.useMemo(() => visibleMatches.filter((m: any) => !isByeMatch(m)), [visibleMatches]);

  const viewKind = String((tour as any)?.viewKind || "groups_ko");
  const repechageEnabled = !!(tour as any)?.repechage?.enabled || (tour as any)?.viewKind === "double_ko";

  const byPhase = React.useMemo(() => {
    // Robust split between Groups / KO / Repechage.
    // IMPORTANT: older engine versions incorrectly set groupIndex=0 for KO matches.
    // So we MUST prefer phase/stageIndex over groupIndex to avoid "everything in Poule A".
    const phaseOf = (m: any) => String(m?.phase || "");
    const stageOf = (m: any) => (typeof m?.stageIndex === "number" ? m.stageIndex : -1);

    const isKo = (m: any) => phaseOf(m) === "ko" || stageOf(m) === 1;

    const isRep = (m: any) =>
      phaseOf(m) === "repechage" ||
      stageOf(m) === 2 ||
      // compat: certains double_ko ont stageIndex=1 pour losers
      (stageOf(m) === 1 && (tour as any)?.viewKind === "double_ko" && phaseOf(m) === "repechage");

    const isGroup = (m: any) => {
      if (isKo(m) || isRep(m)) return false;
      const ph = phaseOf(m);
      const st = stageOf(m);
      // groupe si explicitement groups OU stageIndex=0
      if (ph === "groups" || st === 0) return true;
      // fallback legacy si groupIndex>=0 mais pas KO/Rep
      return typeof m?.groupIndex === "number" && m.groupIndex >= 0;
    };

    const groups = displayMatches.filter(isGroup);
    const ko = displayMatches.filter((m: any) => !isGroup(m) && isKo(m));
    const rep = displayMatches.filter((m: any) => !isGroup(m) && isRep(m));

    return { groups, ko, rep };
  }, [displayMatches, tour]);

  const playableMatches = React.useMemo(() => displayMatches.filter((m: any) => isRealPlayable(m)), [displayMatches]);
  const runningMatches = React.useMemo(
    () => displayMatches.filter((m: any) => ["running", "playing"].includes(String(m?.status || ""))),
    [displayMatches]
  );
  const doneMatches = React.useMemo(() => displayMatches.filter((m: any) => String(m?.status || "") === "done"), [displayMatches]);

  const groupsMeta = React.useMemo(() => Math.max(1, Number((tour as any)?.stages?.[0]?.groups || 1)), [tour]);

  const TABS = React.useMemo(() => {
    if (publicSpectator) {
      if (isChallengePerformanceCompetition) return ["home", "objectives", "standings", "stats"];
      if (viewKind === "single_ko") return ["home", "bracket", "matches", "stats"];
      if (viewKind === "double_ko") return ["home", "bracket", "matches", "repechage", "stats"];
      if (viewKind === "round_robin") return ["home", "standings", "matches", "stats"];
      return ["home", "pools", "standings", "bracket", "matches", ...(repechageEnabled ? ["repechage"] : []), "stats"];
    }
    const admin = isCompetitionAdmin ? ["admin"] : [];
    const playerSpace = isChallengePerformanceCompetition && currentTournamentPlayer ? ["my"] : [];
    if (isChallengePerformanceCompetition) return ["home", ...playerSpace, "objectives", "standings", "linked", "stats", ...admin];
    if (viewKind === "single_ko") return ["home", "bracket", "matches", "linked", "stats", ...admin];
    if (viewKind === "double_ko") return ["home", "bracket", "matches", "linked", "repechage", "stats", ...admin];
    if (viewKind === "round_robin") return ["home", "standings", "matches", "linked", "stats", ...admin];
    return ["home", "pools", "standings", "bracket", "matches", "linked", ...(repechageEnabled ? ["repechage"] : []), "stats", ...admin];
  }, [viewKind, repechageEnabled, isCompetitionAdmin, isChallengePerformanceCompetition, publicSpectator, currentTournamentPlayer]);

  const [tab, setTab] = React.useState<string>("home");
  React.useEffect(() => {
    if (!TABS.includes(tab)) setTab("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TABS.join("|")]);

  const tabLabel: Record<string, string> = {
    home: "Accueil",
    bracket: "Tableau",
    matches: "Matchs",
    standings: "Classement",
    pools: "Poules",
    repechage: "Repêchage",
    linked: isChallengePerformanceCompetition ? "Résultats" : "Liées",
    stats: "Stats",
    admin: "Administration",
    objectives: "Objectifs",
    my: "Jouer",
  };

  const challengeViewDescription: Record<string,string> = {
    home: "Vue d’ensemble et prochain objectif",
    my: "Tes essais disponibles, tes scores et ta progression",
    objectives: "Choisir une cible, jouer et consulter son classement",
    standings: "Points cumulés des classements par objectif",
    linked: "Historique des essais enregistrés",
    stats: "Synthèse de la compétition",
    admin: "Participants, règles, journées et gestion",
  };

  const [activeGroupIdx, setActiveGroupIdx] = React.useState(0);

  const rrMatchesByGroup = React.useMemo(() => {
    const out: any[] = Array.from({ length: groupsMeta }, () => []);
    for (const m of byPhase.groups as any[]) {
      const gi = typeof m?.groupIndex === "number" ? m.groupIndex : -1;
      if (gi < 0 || gi >= groupsMeta) continue;
      (out[gi] ||= []).push(m);
    }
    for (const arr of out)
      arr.sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return out;
  }, [byPhase.groups, groupsMeta]);

  const rrPlayersByGroup = React.useMemo(() => {
    const out: string[][] = Array.from({ length: groupsMeta }, () => []);
    for (let g = 0; g < groupsMeta; g++) {
      const set = new Set<string>();
      for (const m of rrMatchesByGroup[g] || []) {
        const a = String(m.aPlayerId || "");
        const b = String(m.bPlayerId || "");
        if (a && !isByeId(a) && !isTbdId(a)) set.add(a);
        if (b && !isByeId(b) && !isTbdId(b)) set.add(b);
      }
      out[g] = Array.from(set);
    }
    return out;
  }, [rrMatchesByGroup, groupsMeta]);

  const rrStandingsByGroup = React.useMemo(() => {
    const out: any[] = [];
    for (let g = 0; g < groupsMeta; g++) out[g] = computeStandings(rrPlayersByGroup[g] || [], rrMatchesByGroup[g] || []);
    return out;
  }, [rrPlayersByGroup, rrMatchesByGroup, groupsMeta]);

  const koRoundsCount = React.useMemo(() => {
    const ko = (byPhase.ko || []).filter((m: any) => typeof m.roundIndex === "number");
    const max = ko.reduce((acc: number, m: any) => Math.max(acc, Number(m.roundIndex)), 0);
    return max + 1;
  }, [byPhase.ko]);

  const onOpenResult = React.useCallback(
    (m: any) => {
      const historyMatchId = String(m?.historyMatchId || "");
      if (!historyMatchId) return;
      go("tournament_match_result", {
        tournamentId: String((tour as any)?.id || id || ""),
        matchId: String(m?.id || ""),
        historyMatchId,
        phaseLabel: matchPhaseLabel(m, viewKind, koRoundsCount),
      });
    },
    [go, tour, id, viewKind, koRoundsCount]
  );

  /* -------------------------
     SIMULATION
  -------------------------- */
  const simulateMatch = React.useCallback(
    async (m: any) => {
      if (!tour) return;
      if (!isRealPlayable(m)) return;

      const a = String(m?.aPlayerId || "");
      const b = String(m?.bPlayerId || "");
      if (!a || !b || isByeId(a) || isByeId(b) || isTbdId(a) || isTbdId(b)) return;

      const winnerId = Math.random() < 0.5 ? a : b;

      try {
        const synthetic = buildSyntheticScore(winnerId, a, b);
        const saved = await createSyntheticHistoryForSimulation({ tournament: tour as any, match: m, winnerId, synthetic });
        const r = submitResult({ tournament: tour as any, matches: safeMatches as any, matchId: String(m.id), winnerId, historyMatchId: saved?.id || null, ...synthetic });
        await persist(r.tournament as any, r.matches as any);
      } catch (e) {
        console.error("[TournamentView] simulateMatch error:", e);
      }
    },
    [tour, safeMatches, persist]
  );

  const simulateTournament = React.useCallback(async () => {
    if (!tour) return;

    let guard = 0;
    let curTour = tour as any;
    let curMatches = safeMatches as any[];

    try {
      while (guard++ < 4000) {
        const playable = (curMatches || []).filter((m) => isRealPlayable(m));
        if (!playable.length) break;

        const m = playable[0];
        const a = String(m?.aPlayerId || "");
        const b = String(m?.bPlayerId || "");
        if (!a || !b || isByeId(a) || isByeId(b) || isTbdId(a) || isTbdId(b)) break;

        const winnerId = Math.random() < 0.5 ? a : b;

        const bestOf = Math.max(1, Math.floor(Number((curTour as any)?.game?.rules?.bestOf ?? (curTour as any)?.game?.bestOf ?? (curTour as any)?.rules?.bestOf ?? (curTour as any)?.bestOf ?? 1) || 1));
        const winsNeeded = Math.floor(bestOf / 2) + 1;
        const loserMax = Math.max(0, winsNeeded - 1);
        const loserWins = loserMax > 0 ? Math.floor(Math.random() * (loserMax + 1)) : 0;
        const winnerIsA = winnerId === a;
        const synthetic = {
          scoreA: winnerIsA ? winsNeeded : loserWins,
          scoreB: winnerIsA ? loserWins : winsNeeded,
          setsA: winnerIsA ? winsNeeded : loserWins,
          setsB: winnerIsA ? loserWins : winsNeeded,
          legsA: winnerIsA ? winsNeeded : loserWins,
          legsB: winnerIsA ? loserWins : winsNeeded,
        };
        const saved = await createSyntheticHistoryForSimulation({ tournament: curTour, match: m, winnerId, synthetic });
        const r = submitResult({ tournament: curTour, matches: curMatches, matchId: String(m.id), winnerId, historyMatchId: saved?.id || null, ...synthetic });
        curTour = r.tournament;
        curMatches = r.matches;
      }

      await persist(curTour as any, curMatches as any);
    } catch (e) {
      console.error("[TournamentView] simulateTournament error:", e);
    }
  }, [tour, safeMatches, persist]);

  // ------------------------------------------------------------
  // ✅ SCORE UNIFIÉ (Pétanque via payload/History, sinon engine score normal)
  // ------------------------------------------------------------
  const isPet = React.useMemo(() => isPetanqueTournament(tour), [tour]);

  function getPetanqueScoreForMatch(m: any): PetScore | null {
    if (!isPet) return null;

    const direct = extractPetanqueScoreFromMatch(m);
    if (direct) return direct;

    const hid = String(m?.historyMatchId || "");
    if (hid && petScoresByHistoryId[hid]) return petScoresByHistoryId[hid];

    if (typeof m?.scoreA === "number" && typeof m?.scoreB === "number") {
      return { a: Math.floor(m.scoreA), b: Math.floor(m.scoreB) };
    }

    return null;
  }

  function getScoreForAnyMatch(m: any) {
    if (isPet) {
      const ps = getPetanqueScoreForMatch(m);
      if (ps) return ps;
    }
    return getMatchScore(m);
  }

  function scoreTextAny(m: any) {
    const sc = getScoreForAnyMatch(m);
    if (!sc) return "";
    return `${sc.a} - ${sc.b}`;
  }

  function renderMatchCard(m: any, accent: string, opts?: { clickable?: boolean; hideActions?: boolean }) {
    const status = String(m?.status || "pending");
    const playable = isRealPlayable(m);
    const running = status === "running" || status === "playing";
    const done = status === "done";
    const topTag = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";
    const topColor = done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.55)";

    const phaseLabel = matchPhaseLabel(m, viewKind, koRoundsCount);
    const clickable = opts?.clickable !== false;
    const hideActions = publicSpectator || !!opts?.hideActions;

    return (
      <div
        key={m.id}
        onClick={clickable ? () => onOpenMatchDetails(m) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenMatchDetails(m);
          }
        } : undefined}
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
          padding: 12,
          boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          cursor: clickable ? "pointer" : "default",
          transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: topColor, boxShadow: `0 0 14px ${topColor}55`, flex: "0 0 auto" }} />
            <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 12.5, color: topColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topTag}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m?.updatedAt ? `• ${formatDate(m.updatedAt)}` : ""}
              </div>
            </div>
          </div>

          {!hideActions ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                simulateMatch(m);
              }}
              disabled={!playable}
              title="Simuler"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: playable ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.08)",
                background: playable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                display: "grid",
                placeItems: "center",
                cursor: playable ? "pointer" : "default",
                opacity: playable ? 1 : 0.45,
              }}
            >
              <Icon name="play" color={playable ? "#ffcf57" : "rgba(255,255,255,0.45)"} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (done) onOpenMatchDetails(m);
                else if (running || playable) onStartMatch(m.id);
              }}
              disabled={!done && !running && !playable}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "none",
                fontWeight: 950,
                cursor: !done && !running && !playable ? "default" : "pointer",
                background:
                  !done && !running && !playable
                    ? "linear-gradient(180deg,#3a3a3a,#232323)"
                    : running
                    ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                    : done
                    ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                    : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
                opacity: !done && !running && !playable ? 0.6 : 1,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              {done ? "Voir" : running ? "Reprendre" : playable ? "Jouer" : "—"}
            </button>
          </div>
          ) : (
          <div
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              fontWeight: 900,
              fontSize: 11.5,
              color: topColor,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            Détails
          </div>
          )}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, width: "100%", maxWidth: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: "1 1 0", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}
            </div>

            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9, flex: "0 0 auto" }}>
              {done ? scoreTextAny(m) : "VS"}
            </div>

            <div style={{ minWidth: 0, flex: "1 1 0", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}
            </div>
          </div>

          <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {phaseLabel}
          </div>

          {done && m?.winnerId ? (
            <div style={{ fontSize: 11.5, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ✅ Vainqueur : <b style={{ color: "#7fe2a9" }}>{playersById[String(m.winnerId)]?.name || "—"}</b>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function sectionTitleForMatches() {
    if (viewKind === "round_robin") return "Tous les rounds à jouer";
    if (viewKind === "groups_ko") return "Tous les matchs (poules + éliminatoires)";
    return "Matchs à jouer";
  }

  const stats = React.useMemo(() => computeTournamentStats(playersById, displayMatches), [playersById, displayMatches]);

  const koMatches = React.useMemo(() => {
    const raw = (byPhase.ko || [])
      .filter((m: any) => !m?.groupId)
      .filter((m: any) => !isVoidByeMatch(m))
      .slice();

    const map = new Map<string, any>();
    for (const m of raw) {
      const k = String(m?.id || "");
      if (!k) continue;
      if (!map.has(k)) map.set(k, m);
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return arr;
  }, [byPhase.ko]);

  const [bracketSub, setBracketSub] = React.useState<"view" | "details">("view");

  const tourIdentity: any = (tour as any)?.identity || {};
  const tournamentLogoSrc =
    tourIdentity.logoDataUrl ||
    tourIdentity.logoUrl ||
    tourIdentity.avatarDataUrl ||
    (tour as any)?.logoDataUrl ||
    (tour as any)?.logoUrl ||
    (tour as any)?.avatarDataUrl ||
    null;
  const tournamentCoverSrc =
    tourIdentity.coverDataUrl ||
    tourIdentity.bannerDataUrl ||
    tourIdentity.coverUrl ||
    (tour as any)?.coverDataUrl ||
    (tour as any)?.bannerDataUrl ||
    (tour as any)?.coverUrl ||
    null;

  const profileToTournamentPlayer = (profile:any) => ({
    id:String(profile?.id||""),
    name:String(profile?.name||profile?.nickname||profile?.displayName||"Joueur"),
    avatarDataUrl:profile?.avatarDataUrl||profile?.avatarUrl||profile?.avatar||null,
    countryCode:profile?.countryCode||profile?.country||null,
    isBot:!!profile?.isBot,
  });
  const saveTournamentAdmin = async (patch:any, rebuild=false, requiredPermission?:string) => {
    if(!tour || !isCompetitionAdmin) return;
    if(requiredPermission && !canAdmin(requiredPermission)){
      setAdminNotice("Tu n’as pas l’autorisation nécessaire pour cette action.");
      return;
    }
    const next:any={...(tour as any),...patch,updatedAt:Date.now()};
    let nextMatches=safeMatches;
    if(rebuild){
      if(doneMatches.length){setAdminNotice("Impossible de reconstruire le calendrier : des matchs sont déjà terminés.");return;}
      nextMatches=buildInitialMatches(next as any) as any;
    }
    await persist(next as any,nextMatches as any);
    setAdminNotice("Modifications enregistrées.");
  };
  const addCompetitionPlayer = async (profile:any) => {
    if(!tour || !canAdmin("participants")) return;
    const nextPlayers=[...tournamentPlayers,profileToTournamentPlayer(profile)];
    await saveTournamentAdmin({players:nextPlayers}, !isChallengePerformanceCompetition, "participants");
    setAdminPlayerPickerOpen(false);
  };
  const removeCompetitionPlayer = async (playerId:string) => {
    if(!canAdmin("participants")) return;
    const nextPlayers=tournamentPlayers.filter((p:any)=>String(p?.id)!==String(playerId));
    await saveTournamentAdmin({players:nextPlayers}, !isChallengePerformanceCompetition, "participants");
  };
  const addCompetitionAdmin = async (profileId:string) => {
    if(!isCompetitionOwner && !canAdmin("admins")) return;
    const nextIds=Array.from(new Set([...adminProfileIds,String(profileId)]));
    const nextPermissions={...adminPermissionMap,[String(profileId)]:ALL_ADMIN_PERMISSIONS.slice()};
    await saveTournamentAdmin({adminProfileIds:nextIds,adminPermissions:nextPermissions}, false, "admins");
    setAdminAdminPickerOpen(false);
  };
  const removeCompetitionAdmin = async (profileId:string) => {
    if(!isCompetitionOwner && !canAdmin("admins")) return;
    const nextPermissions={...adminPermissionMap};
    delete nextPermissions[String(profileId)];
    await saveTournamentAdmin({adminProfileIds:adminProfileIds.filter(id=>id!==String(profileId)),adminPermissions:nextPermissions}, false, "admins");
  };
  const toggleAdminPermission = async (profileId:string, permission:string) => {
    if(!tour || !isCompetitionOwner) return;
    const current=Array.isArray(adminPermissionMap[String(profileId)]) ? adminPermissionMap[String(profileId)] : ALL_ADMIN_PERMISSIONS.slice();
    const nextList=current.includes(permission) ? current.filter((item:string)=>item!==permission) : Array.from(new Set([...current,permission]));
    await saveTournamentAdmin({adminPermissions:{...adminPermissionMap,[String(profileId)]:nextList}},false);
  };
  const onlineUserIdOf = (person:any) => String(person?.userId || person?.id || "");
  const competitionPublicUrl = React.useMemo(() => {
    if(typeof window==="undefined") return "";
    const publicId=String((tour as any)?.onlineCompetitionId || (tour as any)?.id || id);
    return `${window.location.origin}${window.location.pathname}#/competition/${encodeURIComponent(publicId)}`;
  }, [tour, id]);

  const loadOnlineInviteCandidates = async () => {
    if(!isOnlineCompetition || !canAdmin("invitations")) return;
    setOnlineInviteLoading(true);
    setOnlineInviteError("");
    try{
      const rows=await listFriends();
      const invited=new Set(competitionInvitations.filter((row:any)=>String(row?.status||"pending")!=="revoked").map((row:any)=>String(row?.userId||"")));
      const participantUsers=new Set(tournamentPlayers.map((row:any)=>String(row?.onlineUserId||"")).filter(Boolean));
      setOnlineInvitePeople((Array.isArray(rows)?rows:[]).filter((row:any)=>{
        const uid=onlineUserIdOf(row);
        return uid && uid!==activeOnlineUserId && !invited.has(uid) && !participantUsers.has(uid);
      }));
    }catch(e:any){
      setOnlineInviteError(String(e?.message||"Impossible de charger les joueurs Online."));
    }finally{
      setOnlineInviteLoading(false);
    }
  };

  const searchOnlineInviteCandidates = async () => {
    const query=String(onlineInviteQuery||"").trim();
    if(query.length<2){ await loadOnlineInviteCandidates(); return; }
    if(!canAdmin("invitations")) return;
    setOnlineInviteLoading(true);
    setOnlineInviteError("");
    try{
      const rows=await searchUsers(query);
      const invited=new Set(competitionInvitations.filter((row:any)=>String(row?.status||"pending")!=="revoked").map((row:any)=>String(row?.userId||"")));
      const participantUsers=new Set(tournamentPlayers.map((row:any)=>String(row?.onlineUserId||"")).filter(Boolean));
      setOnlineInvitePeople((Array.isArray(rows)?rows:[]).filter((row:any)=>{
        const uid=onlineUserIdOf(row);
        return uid && uid!==activeOnlineUserId && !invited.has(uid) && !participantUsers.has(uid);
      }));
    }catch(e:any){
      setOnlineInviteError(String(e?.message||"Recherche Online impossible."));
    }finally{
      setOnlineInviteLoading(false);
    }
  };

  const sendCompetitionInvite = async (person:any) => {
    if(!tour || !isOnlineCompetition || !canAdmin("invitations")) return;
    const userId=onlineUserIdOf(person);
    if(!userId) return;
    const name=String(person?.displayName||person?.nickname||"Joueur");
    const invitation={
      id:`invite-${Date.now()}-${userId.slice(-6)}`,
      userId,
      profileId:String(person?.id||userId),
      name,
      avatarUrl:person?.avatarUrl||null,
      status:"pending",
      createdAt:Date.now(),
    };
    const nextInvitations=[
      ...competitionInvitations.filter((row:any)=>String(row?.userId||"")!==userId || String(row?.status||"") === "revoked"),
      invitation,
    ];
    const nextInvited=Array.from(new Set([...(Array.isArray((tour as any)?.invitedProfileIds)?(tour as any).invitedProfileIds:[]).map(String),userId]));
    await saveTournamentAdmin({invitations:nextInvitations,invitedProfileIds:nextInvited},false,"invitations");
    try{
      await sendPrivateMessage(userId,`Invitation à rejoindre ${String((tour as any)?.name||"la compétition")} · ${competitionPublicUrl}`,{
        type:"mss-competition-invite-v1",
        competitionId:String((tour as any)?.onlineCompetitionId||(tour as any)?.id||id),
        competitionName:String((tour as any)?.name||"Compétition"),
        shareCode:String((tour as any)?.shareCode||""),
        url:competitionPublicUrl,
      });
      setAdminNotice(`Invitation envoyée à ${name}.`);
    }catch(e:any){
      setAdminNotice(`Invitation enregistrée. Notification impossible : ${String(e?.message||"erreur Online")}`);
    }
    setOnlineInvitePeople((prev)=>prev.filter((row:any)=>onlineUserIdOf(row)!==userId));
  };

  const revokeCompetitionInvite = async (inviteId:string) => {
    if(!canAdmin("invitations")) return;
    const next=competitionInvitations.map((row:any)=>String(row?.id||"")===String(inviteId)?{...row,status:"revoked",respondedAt:Date.now()}:row);
    await saveTournamentAdmin({invitations:next},false,"invitations");
  };

  const onlinePlayerFromAuth = () => {
    const profile:any=(authOnline as any)?.profile||{};
    const user:any=(authOnline as any)?.user||{};
    const profileId=String(profile?.id||activeOnlineUserId||activeProfileId);
    return {
      id: profileId,
      onlineUserId: activeOnlineUserId || null,
      name:String(profile?.displayName||profile?.nickname||user?.user_metadata?.nickname||user?.email?.split?.("@")?.[0]||activeLocalProfile?.name||"Joueur"),
      avatarDataUrl:profile?.avatarUrl||activeLocalProfile?.avatarDataUrl||activeLocalProfile?.avatarUrl||null,
      avatarUrl:profile?.avatarUrl||activeLocalProfile?.avatarUrl||null,
      countryCode:profile?.countryCode||profile?.country||activeLocalProfile?.countryCode||null,
      isBot:false,
      source:"online",
    };
  };

  const persistPublicTournamentPatch = async (patch:any, rebuildForPlayers=false):Promise<boolean> => {
    if(!tour) return false;
    const next:any={...(tour as any),...patch,updatedAt:Date.now()};
    let nextMatches:any[]=safeMatches as any[];
    if(rebuildForPlayers && !isChallengePerformanceCompetition && doneMatches.length===0){
      try{ nextMatches=buildInitialMatches(next as any) as any[]; }catch{}
    }
    try{
      const remoteId=String((tour as any)?.onlineCompetitionId || (tour as any)?.id || id);
      if(isOnlineCompetition && remoteId){
        await updateOnlineCompetition(remoteId,{
          name:next.name,
          status:next.status,
          tournament:next,
          matches:nextMatches,
          participants:next.players||[],
          settings:{...((next as any)?.game?.rules||{}),identity:(next as any)?.identity||null},
        } as any);
      }
      await upsertTournamentLocal(next as any);
      await upsertMatchesForTournamentLocal(next.id,nextMatches as any);
      setTour(next as any);
      setMatches(nextMatches as any);
      return true;
    }catch(e:any){
      console.error("[TournamentView] public competition update failed:",e);
      setEnrollmentNotice(`Impossible d’enregistrer l’inscription en ligne : ${String(e?.message||"erreur serveur")}`);
      return false;
    }
  };

  const requestOrJoinCompetition = async () => {
    if(!tour || !isOnlineCompetition) return;
    setEnrollmentNotice("");
    if(!activeOnlineUserId){
      setEnrollmentNotice("Connecte-toi à ton compte Online pour rejoindre cette compétition.");
      return;
    }
    if(currentTournamentPlayer){
      setEnrollmentNotice("Tu participes déjà à cette compétition.");
      return;
    }
    if(competitionIsFull){
      setEnrollmentNotice("La compétition est complète.");
      return;
    }
    const player=onlinePlayerFromAuth();
    if(enrollmentPolicy==="open"){
      if(!await persistPublicTournamentPatch({players:[...tournamentPlayers,player]},true)) return;
      setEnrollmentNotice("Inscription confirmée. Tu fais maintenant partie de la compétition.");
      return;
    }
    if(enrollmentPolicy==="invite"){
      if(!currentInvitation || String(currentInvitation?.status||"pending")!=="pending"){
        setEnrollmentNotice("Cette compétition fonctionne sur invitation.");
        return;
      }
      const nextInvitations=competitionInvitations.map((row:any)=>String(row?.id||"")===String(currentInvitation.id)?{...row,status:"accepted",respondedAt:Date.now()}:row);
      if(!await persistPublicTournamentPatch({players:[...tournamentPlayers,player],invitations:nextInvitations},true)) return;
      setEnrollmentNotice("Invitation acceptée. Bienvenue dans la compétition.");
      return;
    }
    if(enrollmentPolicy==="approval"){
      if(currentEnrollmentRequest?.status==="pending"){
        setEnrollmentNotice("Ta demande d’inscription est déjà en attente.");
        return;
      }
      const request={
        id:`request-${Date.now()}-${activeOnlineUserId.slice(-6)}`,
        userId:activeOnlineUserId,
        profileId:String((authOnline as any)?.profile?.id||activeOnlineUserId),
        name:player.name,
        avatarUrl:player.avatarUrl||player.avatarDataUrl||null,
        status:"pending",
        requestedAt:Date.now(),
      };
      const next=enrollmentRequests.filter((row:any)=>String(row?.userId||"")!==activeOnlineUserId || String(row?.status||"")!=="pending");
      if(!await persistPublicTournamentPatch({enrollmentRequests:[...next,request]},false)) return;
      setEnrollmentNotice("Demande envoyée à l’organisateur.");
      return;
    }
    setEnrollmentNotice("Les inscriptions sont fermées pour cette compétition.");
  };

  const togglePublicFollow = async () => {
    if(!tour || !isOnlineCompetition) return;
    setEnrollmentNotice("");
    if(!activeOnlineUserId){
      setEnrollmentNotice("Connecte-toi à ton compte Online pour suivre cette compétition.");
      return;
    }
    if(currentTournamentPlayer){
      setEnrollmentNotice("Tu participes déjà à cette compétition : son suivi est inclus dans ton espace joueur.");
      return;
    }
    if(currentFollower){
      const nextFollowers=competitionFollowers.filter((row:any)=>String(row?.userId||"")!==activeOnlineUserId);
      if(!await persistPublicTournamentPatch({followers:nextFollowers},false)) return;
      setEnrollmentNotice("Suivi désactivé. La compétition reste consultable depuis son lien.");
      return;
    }
    const player=onlinePlayerFromAuth();
    const follower={
      userId:activeOnlineUserId,
      profileId:String((authOnline as any)?.profile?.id||activeOnlineUserId),
      name:player.name,
      avatarUrl:player.avatarUrl||player.avatarDataUrl||null,
      followedAt:Date.now(),
    };
    const nextFollowers=[
      ...competitionFollowers.filter((row:any)=>String(row?.userId||"")!==activeOnlineUserId),
      follower,
    ];
    if(!await persistPublicTournamentPatch({followers:nextFollowers},false)) return;
    setEnrollmentNotice("Suivi activé. Cette compétition apparaît maintenant dans En ligne → Compétitions.");
  };

  const approveEnrollmentRequest = async (request:any) => {
    if(!tour || !canAdmin("invitations")) return;
    if(enrollmentMax>0 && tournamentPlayers.length>=enrollmentMax){setAdminNotice("Impossible : la compétition est complète.");return;}
    const player={
      id:String(request?.profileId||request?.userId||request?.id),
      onlineUserId:String(request?.userId||"")||null,
      name:String(request?.name||"Joueur"),
      avatarDataUrl:request?.avatarUrl||null,
      avatarUrl:request?.avatarUrl||null,
      isBot:false,
      source:"online",
    };
    const nextRequests=enrollmentRequests.map((row:any)=>String(row?.id||"")===String(request?.id||"")?{...row,status:"approved",respondedAt:Date.now(),respondedBy:activeProfileId||activeOnlineUserId}:row);
    const nextPlayers=tournamentPlayers.some((row:any)=>String(row?.id||"")===String(player.id)||String(row?.onlineUserId||"")===String(player.onlineUserId||""))
      ? tournamentPlayers
      : [...tournamentPlayers,player];
    await saveTournamentAdmin({players:nextPlayers,enrollmentRequests:nextRequests},!isChallengePerformanceCompetition,"invitations");
    setAdminNotice(`${player.name} a été accepté.`);
  };

  const rejectEnrollmentRequest = async (request:any) => {
    if(!canAdmin("invitations")) return;
    const nextRequests=enrollmentRequests.map((row:any)=>String(row?.id||"")===String(request?.id||"")?{...row,status:"rejected",respondedAt:Date.now(),respondedBy:activeProfileId||activeOnlineUserId}:row);
    await saveTournamentAdmin({enrollmentRequests:nextRequests},false,"invitations");
    setAdminNotice("Demande refusée.");
  };

  const shareCompetition = async () => {
    if(!tour) return;
    const directUrl = competitionPublicUrl || `${window.location.origin}${window.location.pathname}#/competition/${encodeURIComponent(String((tour as any).onlineCompetitionId || (tour as any).id || id))}`;
    const shareCode = String((tour as any).shareCode || `MSC-${String((tour as any).id||id).replace(/[^a-z0-9]/gi,"").slice(-8).toUpperCase()}`);
    const cloudReady = String((tour as any).source||"") === "online" || String((tour as any).competitionScope||"") === "online" || Boolean((tour as any).onlineCompetitionId);
    const text = `${String((tour as any).name||"Compétition MULTISPORTS SCORING")} · Code ${shareCode}${cloudReady ? ` · ${directUrl}` : ""}`;
    try {
      if (cloudReady && navigator.share) await navigator.share({title:String((tour as any).name||"Compétition"),text,url:directUrl});
      else if (navigator.clipboard) await navigator.clipboard.writeText(cloudReady ? directUrl : text);
      setShareNotice(cloudReady ? "Lien de consultation copié / partagé." : "Code de compétition copié. Pour un suivi depuis un autre téléphone, publie la compétition en ONLINE.");
    } catch {
      try { await navigator.clipboard?.writeText(cloudReady ? directUrl : text); setShareNotice("Accès copié."); } catch {}
    }
  };

  const openCompetitionQr = async () => {
    if(!tour) return;
    const cloudReady = String((tour as any).source||"") === "online" || String((tour as any).competitionScope||"") === "online" || Boolean((tour as any).onlineCompetitionId);
    if(!cloudReady){
      setShareNotice("Le QR de suivi nécessite une compétition publiée en ONLINE.");
      return;
    }
    const directUrl = competitionPublicUrl || `${window.location.origin}${window.location.pathname}#/competition/${encodeURIComponent(String((tour as any).onlineCompetitionId || (tour as any).id || id))}`;
    setShareQrBusy(true);
    try{
      const dataUrl=await QRCode.toDataURL(directUrl,{margin:1,width:280,errorCorrectionLevel:"M"});
      setShareQrDataUrl(dataUrl);
      setShareQrOpen(true);
    }catch(e:any){
      setShareNotice(`Impossible de générer le QR : ${String(e?.message||"erreur")}`);
    }finally{
      setShareQrBusy(false);
    }
  };

  if(activeChallengeAttempt){
    const p=activeChallengeAttempt.player;
    const close=()=>setActiveChallengeAttempt(null);
    const attemptGo=(tab:any,params?:any)=>{
      if(tab==="challenge_config"||tab==="games"||tab==="tournaments"||tab==="tournament_view"){
        close();
        return;
      }
      go(tab,params);
    };
    return (
      <ChallengePlay
        go={attemptGo}
        params={{
          config:activeChallengeAttempt.config,
          competitionParticipants:[{
            id:String(p?.id||""),
            name:p?.name||"Joueur",
            avatarDataUrl:p?.avatarDataUrl||p?.avatarUrl||null,
          }],
          competitionAttempt:true,
          competitionPlayoff:String(activeChallengeAttempt?.kind||"")==="playoff",
        }}
        onCompetitionFinish={finishDirectChallengeAttempt}
      />
    );
  }

  return (
    <div className={`container ${isChallengeCompetition ? "chv-page" : ""}`} style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      <style>{CHALLENGE_VIEW_CSS}</style>
      {/* HEADER VISUEL COMPÉTITION */}
      <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            border: "1px solid rgba(255,207,87,0.18)",
            background: tournamentCoverSrc
              ? `${isChallengeCompetition ? "linear-gradient(90deg, rgba(0,0,0,.93), rgba(0,0,0,.68), rgba(0,0,0,.93))" : "linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.32), rgba(0,0,0,.82))"}, url("${tournamentCoverSrc}") center / cover no-repeat`
              : isChallengeCompetition ? "linear-gradient(180deg, rgba(9,14,22,.995), rgba(4,8,13,.995))" : "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
            boxShadow: "0 16px 44px rgba(0,0,0,.42)",
            padding: "12px 14px",
            minHeight: 94,
            display: "grid",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: tournamentLogoSrc ? "54px 1fr" : "1fr", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
            {tournamentLogoSrc ? (
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  padding: 4,
                  border: "1px solid rgba(255,207,87,.62)",
                  background: "rgba(0,0,0,.50)",
                  boxShadow: "0 0 22px rgba(255,207,87,.30)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                <img src={tournamentLogoSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 999, display: "block" }} />
              </div>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,.80)" }}>
                {(tour as any)?.name || "Mon tournoi"}
              </div>
              <div style={{ marginTop: 3, fontSize: 11.5, opacity: 0.88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,.75)" }}>
                {isChallengePerformanceCompetition
                  ? `${String((tour as any)?.status||"—").toUpperCase()} • CYCLE ${challengeCurrentCycle} • ${challengeObjectives.length} OBJECTIF${challengeObjectives.length>1?"S":""}`
                  : <>{(tour as any)?.status ? String((tour as any).status).toUpperCase() : "—"} • {playableMatches.length} à jouer • {doneMatches.length} terminé{doneMatches.length>1?"s":""}</>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                <span style={{padding:"4px 8px",borderRadius:999,border:"1px solid rgba(255,207,87,.35)",background:"rgba(255,207,87,.09)",fontSize:8.5,fontWeight:1000,color:"#ffcf57"}}>{String((tour as any)?.kind||"COMPÉTITION").toUpperCase()}</span>
                <span style={{padding:"4px 8px",borderRadius:999,border:"1px solid rgba(255,255,255,.14)",background:"rgba(0,0,0,.26)",fontSize:8.5,fontWeight:1000}}>{String((tour as any)?.competitionScope||"local").toUpperCase()==="TEAM"?"ORGANISATION":String((tour as any)?.competitionScope||"LOCAL").toUpperCase()}</span>
                <span style={{padding:"4px 8px",borderRadius:999,border:"1px solid rgba(255,255,255,.14)",background:"rgba(0,0,0,.26)",fontSize:8.5,fontWeight:1000}}>{String((tour as any)?.game?.mode||"—").toUpperCase()}</span>
                {isOnlineCompetition && (sharedEntry || isCompetitionAdmin || currentTournamentPlayer) ? <span style={{padding:"4px 8px",borderRadius:999,border:"1px solid rgba(101,230,162,.28)",background:"rgba(14,62,43,.42)",fontSize:8.2,fontWeight:1000,color:"#8bf0b9"}}>● LIVE · {publicRefreshing?"SYNC…":livePulseText || (liveLastUpdatedAt?"À JOUR":"CONNEXION")}</span> : null}
              </div>
            </div>
          </div>
        </div>

      <PageAdBanner placement="competitions" slotKey="page-competitions-view-under-header" style={{ marginBottom: 12 }} />

      {shareQrOpen && shareQrDataUrl ? (
        <div onClick={()=>setShareQrOpen(false)} style={{position:"fixed",inset:0,zIndex:9999,display:"grid",placeItems:"center",padding:18,background:"rgba(0,0,0,.82)",backdropFilter:"blur(8px)"}}>
          <div onClick={(event)=>event.stopPropagation()} style={{width:"min(360px,92vw)",borderRadius:20,border:"1px solid rgba(79,180,255,.28)",background:"linear-gradient(180deg,#08111b,#03070c)",padding:16,boxShadow:"0 22px 70px rgba(0,0,0,.65)",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:1000,letterSpacing:.8,color:"#4fb4ff"}}>ACCÈS COMPÉTITION</div>
            <b style={{display:"block",marginTop:4,fontSize:15}}>{String((tour as any)?.name||"Compétition")}</b>
            <div style={{fontSize:8.2,opacity:.62,marginTop:4}}>Scanne ce QR avec un autre téléphone pour ouvrir directement le suivi public.</div>
            <div style={{margin:"14px auto 10px",width:292,maxWidth:"100%",padding:6,borderRadius:16,background:"#fff",display:"grid",placeItems:"center"}}>
              <img src={shareQrDataUrl} alt="QR compétition" style={{width:"100%",height:"auto",display:"block",borderRadius:10}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              <button type="button" onClick={()=>void shareCompetition()} style={{minHeight:36,borderRadius:10,border:"1px solid rgba(79,180,255,.28)",background:"rgba(8,35,58,.92)",color:"#fff",fontSize:8,fontWeight:1000}}>PARTAGER LE LIEN</button>
              <button type="button" onClick={()=>setShareQrOpen(false)} style={{minHeight:36,borderRadius:10,border:"1px solid rgba(255,255,255,.10)",background:"#070c13",color:"#c9d2dc",fontSize:8,fontWeight:1000}}>FERMER</button>
            </div>
          </div>
        </div>
      ) : null}

      {sharedEntry && tour ? (
        <section style={{marginBottom:12,borderRadius:18,border:"1px solid rgba(79,180,255,.26)",background:"linear-gradient(180deg,rgba(4,10,18,.995),rgba(3,6,11,.995))",padding:12,boxShadow:"0 16px 36px rgba(0,0,0,.5)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
            <div>
              <span style={{display:"inline-flex",padding:"4px 7px",borderRadius:999,border:"1px solid rgba(79,180,255,.34)",background:"rgba(79,180,255,.08)",color:"#7bc8ff",fontSize:7.2,fontWeight:1000}}>● SUIVI PUBLIC</span>
              <b style={{display:"block",fontSize:12,marginTop:6}}>Consultation depuis le lien de la compétition</b>
              <div style={{fontSize:8.2,opacity:.64,marginTop:3}}>Classements, objectifs et résultats se mettent à jour automatiquement.</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,auto)",gap:5}}>
              <button type="button" onClick={()=>void refreshPublicCompetition()} disabled={publicRefreshing||!isOnlineCompetition} style={{minWidth:74,minHeight:32,borderRadius:10,border:"1px solid rgba(79,180,255,.28)",background:"rgba(8,35,58,.92)",color:"#fff",fontSize:7.1,fontWeight:1000,opacity:publicRefreshing?.55:1}}>{publicRefreshing?"SYNC…":"↻ ACTUALISER"}</button>
              <button type="button" onClick={()=>void openCompetitionQr()} disabled={shareQrBusy||!isOnlineCompetition} style={{minWidth:42,minHeight:32,borderRadius:10,border:"1px solid rgba(255,207,115,.24)",background:"rgba(72,49,8,.48)",color:"#ffcf73",fontSize:7.1,fontWeight:1000,opacity:shareQrBusy?.55:1}}>{shareQrBusy?"…":"QR"}</button>
              {!currentTournamentPlayer ? <button type="button" onClick={()=>void togglePublicFollow()} disabled={!isOnlineCompetition} style={{minWidth:68,minHeight:32,borderRadius:10,border:`1px solid ${currentFollower?"rgba(101,230,162,.28)":"rgba(79,180,255,.28)"}`,background:currentFollower?"rgba(14,62,43,.72)":"rgba(8,35,58,.72)",color:currentFollower?"#9cf1c0":"#9fd8ff",fontSize:7.1,fontWeight:1000}}>{currentFollower?"✓ SUIVIE":"☆ SUIVRE"}</button> : null}
            </div>
          </div>

          {isOnlineCompetition ? (
            <div style={{marginTop:10,padding:"9px 10px",borderRadius:12,border:"1px solid rgba(255,255,255,.08)",background:"#050910"}}>
              {currentTournamentPlayer ? (
                <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b style={{fontSize:9.5,color:"#65e6a2"}}>✓ TU ES INSCRIT</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>Retrouve la compétition dans ton espace Compétitions pour jouer tes essais ou matchs.</div></div><button type="button" onClick={()=>{ if(isChallengePerformanceCompetition){setTab("my");return;} try{window.location.hash="#/competitions";}catch{}; go("tournaments"); }} style={{minHeight:31,borderRadius:9,border:"1px solid rgba(101,230,162,.3)",background:"rgba(14,62,43,.88)",color:"#fff",fontSize:7.2,fontWeight:1000}}>MON ESPACE</button></div>
              ) : competitionIsFull ? (
                <div><b style={{fontSize:9.5,color:"#ff7178"}}>COMPÉTITION COMPLÈTE</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>Le nombre maximum de participants est atteint.</div></div>
              ) : enrollmentPolicy==="approval" && currentEnrollmentRequest?.status==="pending" ? (
                <div><b style={{fontSize:9.5,color:"#ffcf73"}}>DEMANDE EN ATTENTE</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>L’organisateur doit valider ton inscription.</div></div>
              ) : enrollmentPolicy==="approval" && currentEnrollmentRequest?.status==="rejected" ? (
                <div><b style={{fontSize:9.5,color:"#ff7178"}}>DEMANDE REFUSÉE</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>L’organisateur n’a pas retenu cette demande d’inscription.</div></div>
              ) : enrollmentPolicy==="fixed" ? (
                <div><b style={{fontSize:9.5,color:"#aeb7c3"}}>LISTE DE PARTICIPANTS FERMÉE</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>Cette compétition n’accepte pas d’inscription depuis le lien public.</div></div>
              ) : enrollmentPolicy==="invite" && !currentInvitation ? (
                <div><b style={{fontSize:9.5,color:"#aeb7c3"}}>SUR INVITATION</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>Seuls les joueurs invités par l’organisation peuvent rejoindre la compétition.</div></div>
              ) : (
                <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                  <div><b style={{fontSize:9.5,color:"#4fb4ff"}}>{enrollmentPolicy==="invite"?"INVITATION REÇUE":enrollmentPolicy==="approval"?"INSCRIPTIONS SUR VALIDATION":"INSCRIPTIONS OUVERTES"}</b><div style={{fontSize:7.8,opacity:.62,marginTop:2}}>{activeOnlineUserId?"Ton compte Online sera utilisé pour l’inscription.":"Connexion Online requise pour participer."}</div></div>
                  <button type="button" onClick={()=>void requestOrJoinCompetition()} style={{minHeight:32,borderRadius:9,border:"1px solid rgba(79,180,255,.36)",background:"rgba(8,35,58,.96)",color:"#fff",padding:"0 10px",fontSize:7.4,fontWeight:1000}}>{enrollmentPolicy==="invite"?"ACCEPTER":enrollmentPolicy==="approval"?"DEMANDER À REJOINDRE":"REJOINDRE"}</button>
                </div>
              )}
              {enrollmentNotice?<div style={{marginTop:7,fontSize:7.6,color:"#dce8f5",opacity:.78}}>{enrollmentNotice}</div>:null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* NAVIGATION PRINCIPALE : titre supprimé, icônes intégrées à la place */}
      <div style={{ display: "grid", gridTemplateColumns: isChallengePerformanceCompetition ? "40px minmax(0, 1fr)" : "40px minmax(0, 1fr) 88px", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => sharedEntry ? go("online") : go("tournaments")}
          title="Retour"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="back" color="#ffcf57" />
        </button>

        <div style={{ minWidth: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
          {isChallengePerformanceCompetition ? <ChallengeTopNav tabs={TABS} activeKey={tab} onChange={setTab} labels={tabLabel} badges={{my:challengePlayerDashboard?.playable?.length||0,objectives:challengeOpenObjectives.length,linked:linkedHistoryMatches.length}} /> : <NeonTopTabsIconsOnly tabs={TABS} activeKey={tab} onChange={setTab} />}
        </div>

        {!isChallengePerformanceCompetition ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!publicSpectator && isCompetitionAdmin ? <button
            type="button"
            onClick={simulateTournament}
            title="Simuler le tournoi"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="play" color="#ffcf57" />
          </button> : null}

          {!publicSpectator && isCompetitionAdmin ? <button
            type="button"
            onClick={async () => {
              if (!id) return;
              const ok = window.confirm("Supprimer ce tournoi et tous ses matchs ?");
              if (!ok) return;
              try {
                await deleteMatchesForTournamentLocal(id);
                await deleteTournamentLocal(id);
              } catch (e) {
                console.error("[TournamentView] delete error:", e);
              } finally {
                go("tournaments");
              }
            }}
            title="Supprimer"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,80,120,0.35)",
              background: "rgba(255,80,120,0.08)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="trash" color="#ff4fd8" />
          </button> : null}
        </div> : null}
      </div>

      {isChallengePerformanceCompetition ? <div className="chv-view-context"><b style={{color:TAB_COLORS[tab]||"#ffcf73"}}>{tabLabel[tab]||"—"}</b><span>{challengeViewDescription[tab]||""}</span></div> : <div
        style={{
          marginTop: 2,
          textAlign: "center",
          fontWeight: 950,
          fontSize: 18,
          color: TAB_COLORS[tab] || "#ffcf57",
          textShadow: `0 0 18px ${(TAB_COLORS[tab] || "#ffcf57")}33`,
        }}
      >
        {tabLabel[tab] || "—"}
      </div>}

      {tour && (!isChallengeCompetition || tab === "home") ? <div className={isChallengeCompetition ? "chv-grid-4" : undefined} style={isChallengeCompetition ? {margin:"10px 0 12px"} : {display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,margin:"10px 0 12px"}}>
        {(isChallengePerformanceCompetition ? [
          ["PARTICIPANTS",tournamentPlayers.length,"#ffcf73"],
          ["OUVERTS",challengeOpenObjectives.length,"#65e6a2"],
          ["RÉSULTATS",linkedHistoryMatches.length,"#22e6ff"],
          [challengeCompetitionFormat==="divisions"?"CYCLE":"PROGRESSION",challengeCompetitionFormat==="divisions"?challengeCurrentCycle:`${challengeProgramProgress}%`,"#b6b6ff"],
        ] : isChallengeCompetition ? [
          ["PARTICIPANTS",tournamentPlayers.length,"#ffcf73"],
          ["À JOUER",playableMatches.length,"#4fb4ff"],
          ["TERMINÉS",doneMatches.length,"#65e6a2"],
          ["FORMAT",challengeFormatMeta.short,"#ffb54a"],
        ] : [
          ["PARTICIPANTS",Array.isArray((tour as any)?.players)?(tour as any).players.length:0,"#ffcf57"],
          ["À JOUER",playableMatches.length,"#4fb4ff"],
          ["TERMINÉS",doneMatches.length,"#65e6a2"],
          ["LIÉS",linkedHistoryMatches.length,"#ffe68a"],
        ]).map(([label,value,accent]:any)=> isChallengeCompetition ? <div key={label} className="chv-kpi"><b style={{color:accent}}>{value}</b><span>{label}</span></div> : <div key={label} style={{minWidth:0,borderRadius:13,border:`1px solid ${accent}33`,background:`linear-gradient(180deg,${accent}12,rgba(5,8,14,.92))`,padding:"8px 6px",textAlign:"center"}}><b style={{display:"block",fontSize:18,color:accent,lineHeight:1}}>{value}</b><span style={{display:"block",marginTop:4,fontSize:7.4,fontWeight:1000,opacity:.82,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</span></div>)}
      </div>:null}

      {loading ? (
        <Card title="Chargement…" subtitle="Récupération du tournoi et des matchs." accent={TAB_COLORS.home} />
      ) : !tour ? (
        <Card title="Introuvable" subtitle="Ce tournoi n'existe pas (ou a été supprimé)." accent="#ff4fd8" />
      ) : (
        <>
          {/* HOME */}
          {tab === "home" ? (
            isChallengeCompetition ? (
            <>
              <section className="chv-panel" style={{borderColor:"rgba(255,181,74,.22)"}}>
                <div className="chv-section-head">
                  <div style={{minWidth:0}}>
                    <div className="chv-eyebrow">MODE CHALLENGE · {String((tour as any)?.competitionScope||"local").toUpperCase()==="TEAM"?"ORGANISATION":String((tour as any)?.competitionScope||"LOCAL").toUpperCase()}</div>
                    <div className="chv-title" style={{marginTop:4,color:"#ffcf73"}}>{challengeFormatMeta.title}</div>
                    <div className="chv-sub" style={{marginTop:4,maxWidth:720}}>{challengeFormatMeta.description}</div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <span className="chv-status" style={{color:String((tour as any)?.status)==="running"?"#65e6a2":"#ffcf73"}}>● {String((tour as any)?.status||"draft").toUpperCase()}</span>
                    {isChallengePerformanceCompetition?<span className="chv-status" style={{color:"#b6b6ff"}}>CYCLE {challengeCurrentCycle}</span>:null}
                    {isOnlineCompetition?<span className="chv-status" style={{color:"#22e6ff"}}>ONLINE</span>:null}
                  </div>
                </div>

                {isChallengePerformanceCompetition ? (
                  <div className="chv-grid-main">
                    <div className="chv-panel-soft">
                      <div className="chv-section-head" style={{marginBottom:8}}>
                        <div>
                          <div className="chv-eyebrow">MAINTENANT</div>
                          <div className="chv-title" style={{marginTop:3}}>
                            {challengePlayerDashboard?.playable?.length ? `À jouer · ${challengeObjectiveLabel(challengePlayerDashboard.playable[0].objective)}` : challengeOpenObjectives.length ? `Objectif ouvert · ${challengeObjectiveLabel(challengeOpenObjectives[0])}` : "Aucun objectif ouvert"}
                          </div>
                        </div>
                        {challengeCurrentRound?<span className="chv-status" style={{color:String(challengeCurrentRound?.status)==="open"?"#65e6a2":"#ffb54a"}}>J{Number(challengeCurrentRound?.round||0)||1}</span>:null}
                      </div>

                      {challengePlayerDashboard?.playable?.length ? (()=>{
                        const next=challengePlayerDashboard.playable[0];
                        return <div style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) auto",gap:9,alignItems:"center",padding:"10px",borderRadius:13,border:"1px solid rgba(101,230,162,.16)",background:"rgba(8,24,19,.88)"}}>
                          <ChallengeObjectiveThumb objective={next.objective} className="chv-objective-hero-thumb" />
                          <div style={{minWidth:0}}>
                            <b style={{display:"block",fontSize:15,color:"#65e6a2"}}>{challengeObjectiveLabel(next.objective)}</b>
                            <span className="chv-sub" style={{display:"block",marginTop:3}}>{next.attempts}/{next.maxAttempts} essais · {challengeObjectiveVisits(next.objective)} tours{next.standing?` · meilleur ${next.standing.score} · #${next.standing.rank}`:""}</span>
                          </div>
                          {!publicSpectator?<button type="button" className="chv-action" onClick={()=>launchChallengeAttempt(challengePlayerDashboard.player,next.objective)} style={{border:"1px solid rgba(101,230,162,.36)",background:"rgba(14,62,43,.92)"}}>JOUER</button>:null}
                        </div>
                      })() : challengeOpenObjectives.length ? (
                        <div style={{padding:"10px",borderRadius:13,border:"1px solid rgba(34,230,255,.14)",background:"rgba(7,20,28,.88)"}}>
                          <b style={{fontSize:12,color:"#22e6ff"}}>{challengeOpenObjectives.map(challengeObjectiveLabel).join(" · ")}</b>
                          <div className="chv-sub" style={{marginTop:4}}>{currentTournamentPlayer?"Aucun essai disponible pour ton profil sur les objectifs actuellement ouverts.":"Les participants peuvent enregistrer leurs performances sur les objectifs ouverts."}</div>
                        </div>
                      ) : <div style={{padding:"11px",borderRadius:13,border:"1px solid rgba(255,181,74,.12)",background:"#070d15"}}><b style={{fontSize:10,color:"#ffb54a"}}>PROGRAMME EN ATTENTE</b><div className="chv-sub" style={{marginTop:4}}>L’organisateur doit publier une journée ou ouvrir un objectif.</div></div>}

                      {challengeScheduleRounds.length?<div style={{marginTop:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><span className="chv-eyebrow">PROGRAMME</span><span className="chv-sub">{challengeProgramProgress}% terminé</span></div>
                        <div className="chv-progress" style={{marginTop:5}}><i style={{width:`${challengeProgramProgress}%`}}/></div>
                        <div className="chv-objective-strip" style={{marginTop:8}}>{challengeScheduleRounds.map((round:any)=>{
                          const status=String(round?.status||"open");
                          const accent=status==="open"?"#65e6a2":status==="closed"?"#6f7a88":"#ffb54a";
                          return <button key={String(round?.id)} type="button" className="chv-objective-chip" onClick={()=>{const first=(Array.isArray(round?.objectives)?round.objectives:[])[0];if(first){setChallengeObjectiveFocus(normalizeChallengeObjective(first));setTab("objectives");}}} style={{borderColor:`${accent}33`,color:accent}}><span style={{display:"block",fontSize:7,opacity:.72}}>J{Number(round?.round||0)||1}</span><b style={{display:"block",marginTop:2,fontSize:8.5}}>{(Array.isArray(round?.objectives)?round.objectives:[]).map(challengeObjectiveLabel).join(" · ")||"—"}</b></button>})}</div>
                      </div>:null}
                    </div>

                    <div className="chv-panel-soft">
                      <div className="chv-section-head" style={{marginBottom:7}}><div><div className="chv-eyebrow">CLASSEMENT GÉNÉRAL</div><div className="chv-title" style={{marginTop:3}}>Top actuel</div></div><button type="button" onClick={()=>setTab("standings")} style={{border:0,background:"transparent",color:"#65e6a2",fontSize:7.5,fontWeight:1000,cursor:"pointer"}}>VOIR TOUT →</button></div>
                      <div className="chv-rows">{challengeDisplayGeneralStandings.slice(0,5).map((row:any)=><div key={`home-rank-${row.playerId}`} className="chv-row"><b style={{color:Number(row.rank)<=3?"#ffcf73":"#8d9aac"}}>#{row.rank}</b><div style={{minWidth:0}}><span className="chv-row-name">{row.name}</span><span className="chv-row-sub">{row.wins||0} victoire{Number(row.wins||0)>1?"s":""} · {row.podiums||0} podium{Number(row.podiums||0)>1?"s":""}</span></div><b style={{fontSize:10,color:"#65e6a2"}}>{row.points} pts</b></div>)}</div>
                      {!challengeDisplayGeneralStandings.length?<div style={{padding:"11px 9px",borderRadius:11,border:"1px dashed rgba(101,230,162,.16)",background:"#060b12"}}><b style={{display:"block",fontSize:8.7,color:"#8d9aac"}}>CLASSEMENT EN ATTENTE</b><span className="chv-sub" style={{display:"block",marginTop:3}}>Il apparaîtra automatiquement après le premier essai classé.</span></div>:null}
                    </div>
                  </div>
                ) : (
                  <div className="chv-grid-main">
                    <div className="chv-panel-soft">
                      <div className="chv-section-head"><div><div className="chv-eyebrow">CONFRONTATIONS</div><div className="chv-title" style={{marginTop:3}}>Prochaines rencontres</div></div><span className="chv-status" style={{color:"#4fb4ff"}}>{playableMatches.length} À JOUER</span></div>
                      {playableMatches.length?<div style={{display:"grid",gap:7}}>{playableMatches.slice(0,3).map((m:any)=>renderMatchCard(m,"#ffb54a"))}</div>:<div className="chv-sub">Aucune confrontation prête à jouer pour le moment.</div>}
                    </div>
                    <div className="chv-panel-soft"><div className="chv-eyebrow">ÉTAT DU CALENDRIER</div><div className="chv-grid-3" style={{marginTop:8}}><div className="chv-kpi"><b style={{color:"#4fb4ff"}}>{playableMatches.length}</b><span>À JOUER</span></div><div className="chv-kpi"><b style={{color:"#65e6a2"}}>{doneMatches.length}</b><span>TERMINÉS</span></div><div className="chv-kpi"><b style={{color:"#ffcf73"}}>{runningMatches.length}</b><span>EN COURS</span></div></div></div>
                  </div>
                )}

                {isChallengePerformanceCompetition ? <div className="chv-quick-actions">
                  {challengePlayerDashboard ? <button type="button" className="chv-quick-action" onClick={()=>setTab("my")} style={{borderColor:"rgba(34,230,255,.20)"}}><Icon name="user" color="#22e6ff"/><div><b>JOUER / MON ESPACE</b><span>{challengePlayerDashboard.playable.length ? `${challengePlayerDashboard.playable.length} objectif${challengePlayerDashboard.playable.length>1?"s":""} disponible${challengePlayerDashboard.playable.length>1?"s":""}` : "Voir ma progression"}</span></div></button> : null}
                  <button type="button" className="chv-quick-action" onClick={()=>setTab("objectives")} style={{borderColor:"rgba(255,181,74,.20)"}}><Icon name="target" color="#ffb54a"/><div><b>OBJECTIFS</b><span>{challengeOpenObjectives.length} ouvert{challengeOpenObjectives.length>1?"s":""} · classements</span></div></button>
                  <button type="button" className="chv-quick-action" onClick={()=>setTab("standings")} style={{borderColor:"rgba(101,230,162,.20)"}}><Icon name="standings" color="#65e6a2"/><div><b>CLASSEMENT</b><span>Cycle et saison</span></div></button>
                  <button type="button" className="chv-quick-action" onClick={()=>setTab("linked")} style={{borderColor:"rgba(79,180,255,.20)"}}><Icon name="results" color="#4fb4ff"/><div><b>RÉSULTATS</b><span>{linkedHistoryMatches.length} essai{linkedHistoryMatches.length>1?"s":""} enregistré{linkedHistoryMatches.length>1?"s":""}</span></div></button>
                  {challengeCompetitionFormat==="free"&&!publicSpectator?<button type="button" className="chv-quick-action" onClick={loadAttachableHistory} style={{borderColor:"rgba(255,213,106,.20)"}}><Icon name="results" color="#ffe68a"/><div><b>PARTIE LOISIR</b><span>Rattacher depuis l’historique</span></div></button>:null}
                  <button type="button" className="chv-quick-action" onClick={shareCompetition} style={{borderColor:"rgba(79,180,255,.20)"}}><Icon name="share" color="#4fb4ff"/><div><b>PARTAGER</b><span>Inviter ou faire suivre</span></div></button>
                  {isOnlineCompetition?<button type="button" className="chv-quick-action" onClick={()=>void openCompetitionQr()} style={{borderColor:"rgba(255,207,115,.20)"}}><span style={{fontSize:17,color:"#ffcf73",lineHeight:1}}>▦</span><div><b>QR D’ACCÈS</b><span>Suivre depuis un autre téléphone</span></div></button>:null}
                  {!publicSpectator&&isCompetitionAdmin?<button type="button" className="chv-quick-action" onClick={()=>setTab("admin")} style={{borderColor:"rgba(255,107,107,.20)"}}><Icon name="admin" color="#ff6b6b"/><div><b>ADMINISTRATION</b><span>Joueurs, règles et programme</span></div></button>:null}
                </div> : <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}><button type="button" className="chv-action" onClick={shareCompetition} style={{border:"1px solid rgba(79,180,255,.30)",background:"rgba(8,35,58,.88)"}}>↗ PARTAGER</button>{!publicSpectator&&isCompetitionAdmin?<button type="button" className="chv-action" onClick={()=>setTab("admin")} style={{border:"1px solid rgba(255,107,107,.28)",background:"rgba(71,18,24,.88)"}}>⚙ ADMIN</button>:null}</div>}
              </section>

              {isChallengePerformanceCompetition && challengeCompetitionFormat === "divisions" && challengeDivisionState.enabled ? (
                <section className="chv-panel" style={{borderColor:"rgba(182,182,255,.17)"}}>
                  <div className="chv-section-head">
                    <div><div className="chv-eyebrow" style={{color:"#b6b6ff"}}>SAISON & DIVISIONS</div><div className="chv-title" style={{marginTop:3}}>{challengeSeasonSummary.name}</div><div className="chv-sub" style={{marginTop:3}}>Cycle {challengeCurrentCycle}{challengeSeasonSummary.maxCycles?` / ${challengeSeasonSummary.maxCycles}`:""} · {challengeDivisionState.count} division{challengeDivisionState.count>1?"s":""}</div></div>
                    <span className="chv-status" style={{color:challengeSeasonSummary.status==="finished"?"#8d9aac":"#b6b6ff"}}>{challengeSeasonSummary.status==="finished"?"TERMINÉE":challengeSeasonSummary.status==="draft"?"BROUILLON":"EN COURS"}</span>
                  </div>
                  <div className="chv-grid-2">
                    {challengeDivisionState.byDivision.map((div:any)=>{
                      const leader=div.standings[0]||null;
                      return <div key={`home-div-${div.division}`} className="chv-panel-soft">
                        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{fontSize:10,color:"#d8d8ff"}}>DIVISION {div.division}</b><span className="chv-sub">↑{Number(div.policy?.promote||0)} · ↓{Number(div.policy?.relegate||0)} · B{Number(div.policy?.playoff||0)}</span></div>
                        <div className="chv-rows" style={{marginTop:7}}>{div.standings.slice(0,4).map((row:any)=><div key={`home-divrow-${div.division}-${row.playerId}`} className="chv-row"><b style={{color:row.divisionRank<=3?"#b6b6ff":"#8d9aac"}}>#{row.divisionRank}</b><div style={{minWidth:0}}><span className="chv-row-name">{row.name}</span></div><b style={{fontSize:9}}>{row.points} pts</b></div>)}</div>
                        {!leader?<div className="chv-sub" style={{marginTop:7}}>Aucun classement dans cette division.</div>:null}
                      </div>
                    })}
                  </div>
                </section>
              ) : null}

              {isChallengePerformanceCompetition && challengeRecentActivity.length ? <section className="chv-panel">
                <div className="chv-section-head"><div><div className="chv-eyebrow">ACTIVITÉ RÉCENTE</div><div className="chv-title" style={{marginTop:3}}>Derniers essais</div></div><button type="button" onClick={()=>setTab("linked")} style={{border:0,background:"transparent",color:"#22e6ff",fontSize:7.5,fontWeight:1000,cursor:"pointer"}}>TOUS LES RÉSULTATS →</button></div>
                <div>{challengeRecentActivity.slice(0,4).map((row:any)=><div key={row.id} className="chv-activity"><div style={{display:"flex",alignItems:"center",gap:5}}><ChallengeObjectiveThumb objective={row.objective}/><b style={{fontSize:8,color:"#ffb54a"}}>{challengeObjectiveLabel(row.objective)}</b></div><div style={{minWidth:0}}><span className="chv-row-name">{row.playerName}</span><span className="chv-row-sub">{row.attempt?`Essai ${row.attempt}`:"Partie liée"}{row.round?` · J${row.round}`:""} · {row.createdAt?formatDate(row.createdAt):""}</span></div><b style={{fontSize:11,color:"#65e6a2"}}>{row.score}</b></div>)}</div>
              </section> : !isChallengePerformanceCompetition ? <section className="chv-panel"><div className="chv-section-head"><div><div className="chv-eyebrow">ACTIVITÉ RÉCENTE</div><div className="chv-title" style={{marginTop:3}}>Derniers résultats</div></div></div>{doneMatches.length?<div style={{display:"grid",gap:7}}>{doneMatches.slice().sort((a:any,b:any)=>(b.updatedAt??0)-(a.updatedAt??0)).slice(0,3).map((m:any)=>renderMatchCard(m,"#65e6a2"))}</div>:<div className="chv-sub">Aucun résultat pour le moment.</div>}</section> : null}

              <details className="chv-panel chv-help">
                <summary><div><div className="chv-eyebrow">AIDE</div><div className="chv-title" style={{marginTop:2}}>Comprendre cette compétition</div></div><span className="chv-sub">Règles & fonctionnement</span></summary>
                <div className="chv-help-body">
                  <div className="chv-panel-soft"><b style={{fontSize:8.5,color:"#ffcf73"}}>FORMAT</b><span className="chv-sub" style={{display:"block",marginTop:3}}>{challengeFormatMeta.description}</span></div>
                  {isChallengePerformanceCompetition?<div className="chv-panel-soft"><b style={{fontSize:8.5,color:"#65e6a2"}}>CLASSEMENT</b><span className="chv-sub" style={{display:"block",marginTop:3}}>Chaque objectif possède son classement. Les points gagnés sur chaque objectif sont additionnés au classement général.</span></div>:<div className="chv-panel-soft"><b style={{fontSize:8.5,color:"#4fb4ff"}}>MATCHS</b><span className="chv-sub" style={{display:"block",marginTop:3}}>Chaque confrontation Challenge alimente le calendrier et la progression du tournoi.</span></div>}
                  {isChallengePerformanceCompetition?<div className="chv-panel-soft"><b style={{fontSize:8.5,color:"#22e6ff"}}>ESSAIS</b><span className="chv-sub" style={{display:"block",marginTop:3}}>{challengeAttemptsPerObjective} essai{challengeAttemptsPerObjective>1?"s":""} max par défaut · seul le meilleur essai est retenu.</span></div>:null}
                </div>
              </details>
            </>
            ) : (
            <>
              <Card title="Centre de compétition" subtitle="Résumé général, participants, organisateurs et accès rapide." accent={TAB_COLORS.home} icon="⌂">
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
                  <div style={{padding:10,borderRadius:14,background:"rgba(4,7,12,.97)",border:"1px solid rgba(255,207,87,.22)"}}><span style={{fontSize:8,opacity:.65,fontWeight:900}}>PARTICIPANTS</span><b style={{display:"block",fontSize:22,color:"#ffcf57",marginTop:3}}>{tournamentPlayers.length}</b></div>
                  <div style={{padding:10,borderRadius:14,background:"rgba(4,7,12,.97)",border:"1px solid rgba(79,180,255,.22)"}}><span style={{fontSize:8,opacity:.65,fontWeight:900}}>ADMINISTRATEURS</span><b style={{display:"block",fontSize:22,color:"#4fb4ff",marginTop:3}}>{1+adminProfileIds.length}</b></div>
                </div>
                <div style={{marginTop:8,padding:10,borderRadius:14,background:"rgba(4,7,12,.97)",border:"1px solid rgba(255,255,255,.10)"}}>
                  <div style={{fontSize:8,opacity:.62,fontWeight:900}}>ORGANISATEUR</div><div style={{fontSize:11,fontWeight:1000,marginTop:3}}>{(tour as any)?.hostOrganizationName || playersById[ownerProfileId]?.name || "Créateur de la compétition"}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isCompetitionAdmin?"1fr 1fr 1fr":"1fr 1fr",gap:7,marginTop:9}}>
                  {isCompetitionAdmin?<button type="button" onClick={()=>setTab("admin")} style={{minHeight:38,borderRadius:12,border:"1px solid rgba(255,107,107,.45)",background:"rgba(90,15,20,.92)",color:"#fff",fontWeight:1000,cursor:"pointer"}}>⚙ GÉRER</button>:null}
                  <button type="button" onClick={shareCompetition} style={{minHeight:38,borderRadius:12,border:"1px solid rgba(79,180,255,.42)",background:"rgba(8,35,58,.94)",color:"#fff",fontWeight:1000,cursor:"pointer"}}>↗ PARTAGER</button>
                  <button type="button" onClick={()=>void openCompetitionQr()} disabled={shareQrBusy||!isOnlineCompetition} style={{minHeight:38,borderRadius:12,border:"1px solid rgba(255,207,115,.32)",background:"rgba(72,49,8,.62)",color:"#ffcf73",fontWeight:1000,cursor:"pointer",opacity:!isOnlineCompetition?.4:1}}>{shareQrBusy?"…":"▦ QR"}</button>
                </div>
                {shareNotice?<div style={{marginTop:7,fontSize:8.5,lineHeight:1.35,opacity:.72}}>{shareNotice}</div>:null}
              </Card>
              {autoQualified.length ? (
                <Card
                  title="Qualifiés d’office"
                  subtitle="Exempt (BYE) — ces joueurs passent automatiquement."
                  accent={TAB_COLORS.standings}
                  icon="★"
                  badge={<MiniBadge label="Qualifiés" value={autoQualified.length} accent={TAB_COLORS.standings} />}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    {autoQualified.map((p: any) => (
                      <div
                        key={String(p.id)}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(255,255,255,0.03))",
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <PlayerPill name={p?.name || "Joueur"} avatarUrl={p?.avatar || null} />
                        <div style={{ fontWeight: 950, color: "#7fe2a9", opacity: 0.95, whiteSpace: "nowrap" }}>✅ Qualifié</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <div style={{display:"grid",gap:10}}>
                {isChallengePerformanceCompetition ? <div style={{borderRadius:18,border:"1px solid rgba(255,181,74,.28)",background:"linear-gradient(180deg,rgba(38,25,8,.98),rgba(5,8,13,.99))",padding:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div><b style={{fontSize:13,color:TAB_COLORS.objectives}}>🎯 CHALLENGE · {challengeCompetitionFormat === "objectives" ? "CHAMPIONNAT OBJECTIFS" : challengeCompetitionFormat === "free" ? "COMPÉTITION LIBRE" : "LIGUES & DIVISIONS"}</b><div style={{fontSize:9,opacity:.72,marginTop:3}}>Pas de faux matchs : chaque objectif possède son classement, puis les points sont cumulés au général.</div></div><MiniBadge label="Essais / objectif" value={challengeAttemptsPerObjective} accent={TAB_COLORS.objectives}/></div>
                  <div className="chv-objective-strip" style={{marginTop:9}}>{challengeObjectives.map(obj=><button key={obj} type="button" className="chv-objective-chip" onClick={()=>{setChallengeObjectiveFocus(obj);setTab("objectives")}}><ChallengeObjectiveThumb objective={obj}/><b style={{display:"block",fontSize:8.5}}>{challengeObjectiveLabel(obj)}</b><span style={{display:"block",marginTop:2,fontSize:6.4,color:challengeObjectiveIsOpen(obj)?"#65e6a2":"#8d9aac"}}>{challengeObjectiveIsOpen(obj)?"OUVERT":"VOIR"}</span></button>)}</div>
                  <div style={{display:"grid",gridTemplateColumns:isCompetitionAdmin?"1fr 1fr":"1fr",gap:7,marginTop:10}}>
                    {!publicSpectator?<button type="button" onClick={loadAttachableHistory} style={{minHeight:38,borderRadius:11,border:"1px solid rgba(255,230,138,.32)",background:"rgba(72,55,12,.92)",color:"#fff",fontWeight:1000}}>＋ AJOUTER UN ESSAI / HISTORIQUE</button>:<div style={{minHeight:38,borderRadius:11,border:"1px solid rgba(255,255,255,.08)",background:"#060a10",display:"grid",placeItems:"center",fontSize:8,opacity:.62}}>MODE CONSULTATION</div>}
                    {!publicSpectator&&isCompetitionAdmin?<button type="button" onClick={()=>{setTab("admin");setAdminPlayerPickerOpen(true)}} style={{minHeight:38,borderRadius:11,border:"1px solid rgba(79,180,255,.35)",background:"rgba(8,35,58,.94)",color:"#fff",fontWeight:1000}}>＋ AJOUTER DES JOUEURS</button>:null}
                  </div>
                </div> : <div style={{borderRadius:18,border:"1px solid rgba(79,180,255,.24)",background:"linear-gradient(180deg,rgba(12,21,30,.98),rgba(5,8,13,.99))",padding:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:playableMatches.length?9:0}}><div><b style={{fontSize:13,color:TAB_COLORS.home}}>⚡ PROCHAINS MATCHS</b><div style={{fontSize:9,opacity:.65,marginTop:2}}>{playableMatches.length?"Lance directement une rencontre prête à jouer.":"Aucune rencontre jouable actuellement."}</div></div><MiniBadge label="À jouer" value={playableMatches.length} accent={TAB_COLORS.home}/></div>
                  {playableMatches.length?<div style={{display:"grid",gap:8}}>{playableMatches.slice(0,4).map((m:any)=>renderMatchCard(m,TAB_COLORS.home))}</div>:null}
                </div>}
                {isChallengePerformanceCompetition&&challengeCompetitionFormat==="divisions"&&challengeDivisionState.enabled?<div style={{display:"grid",gap:9}}>
                  <section style={{borderRadius:18,border:"1px solid rgba(182,182,255,.24)",background:"linear-gradient(180deg,rgba(20,20,43,.98),rgba(5,8,13,.99))",padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                      <div><span style={{fontSize:7.6,fontWeight:1000,color:"#b6b6ff"}}>FICHE SAISON</span><b style={{display:"block",fontSize:14,marginTop:3}}>{challengeSeasonSummary.name}</b><div style={{fontSize:8,opacity:.62,marginTop:3}}>Cycle {challengeCurrentCycle}{challengeSeasonSummary.maxCycles?` / ${challengeSeasonSummary.maxCycles}`:""} · {challengeDivisionState.count} division{challengeDivisionState.count>1?"s":""}</div></div>
                      <span style={{padding:"4px 7px",borderRadius:999,border:"1px solid rgba(182,182,255,.28)",fontSize:7,fontWeight:1000,color:"#d8d8ff"}}>{challengeSeasonSummary.status==="finished"?"TERMINÉE":challengeSeasonSummary.status==="draft"?"BROUILLON":"EN COURS"}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:6,marginTop:9}}>
                      {[
                        ["LEADER",challengeSeasonSummary.leader?.name||"—"],
                        ["CYCLES",challengeSeasonSummary.closedCycles],
                        ["MOUVEMENTS",challengeSeasonSummary.movementCount],
                        ["BARRAGES",challengeSeasonSummary.pendingPlayoffs],
                      ].map(([label,value]:any)=><div key={label} style={{minWidth:0,padding:"7px 6px",borderRadius:10,background:"#080d14",border:"1px solid rgba(255,255,255,.07)",textAlign:"center"}}><b style={{display:"block",fontSize:9,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</b><span style={{display:"block",fontSize:6.5,opacity:.55,marginTop:2}}>{label}</span></div>)}
                    </div>
                  </section>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(2,challengeDivisionState.count)},minmax(0,1fr))`,gap:8}}>
                    {challengeDivisionState.byDivision.map((div:any)=>{
                      const leader=div.standings[0]||null;
                      return <section key={`sheet-div-${div.division}`} style={{borderRadius:15,border:"1px solid rgba(182,182,255,.18)",background:"#070a11",padding:10,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:7,alignItems:"center"}}><div><span style={{fontSize:6.8,color:"#b6b6ff",fontWeight:1000}}>FICHE DIVISION</span><b style={{display:"block",fontSize:11,marginTop:2}}>DIVISION {div.division}</b></div><span style={{fontSize:6.8,opacity:.6}}>↑{Number(div.policy?.promote||0)} · ↓{Number(div.policy?.relegate||0)} · B{Number(div.policy?.playoff||0)}</span></div>
                        <div style={{marginTop:7,padding:"6px 7px",borderRadius:9,background:"rgba(182,182,255,.06)",fontSize:7.4}}><span style={{opacity:.55}}>LEADER</span><b style={{display:"block",fontSize:9,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{leader?`${leader.name} · ${leader.points} pts`:"Aucun classement"}</b></div>
                        <div style={{display:"grid",gap:3,marginTop:7}}>{div.standings.slice(0,5).map((row:any)=><div key={`sheet-${div.division}-${row.playerId}`} style={{display:"grid",gridTemplateColumns:"22px minmax(0,1fr) auto",gap:5,fontSize:7.2,alignItems:"center"}}><span style={{color:row.divisionRank<=3?"#ffcf73":"#8b96a5"}}>#{row.divisionRank}</span><b style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.name}</b><span>{row.points} pts</span></div>)}</div>
                      </section>
                    })}
                  </div>
                </div>:null}
                {isChallengePerformanceCompetition ? <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10}}>
                  <div style={{borderRadius:18,border:"1px solid rgba(101,230,162,.22)",background:"linear-gradient(180deg,rgba(8,22,17,.98),rgba(5,8,13,.99))",padding:11,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:7}}><b style={{fontSize:11,color:TAB_COLORS.standings}}>✓ ESSAIS ENREGISTRÉS</b><strong style={{color:TAB_COLORS.standings,fontSize:16}}>{linkedHistoryMatches.length}</strong></div>
                    <div style={{fontSize:8.5,opacity:.62,marginTop:4}}>{linkedHistoryMatches.length?"Les derniers essais alimentent immédiatement les classements.":"Aucun essai pour le moment."}</div>
                  </div>
                  <div style={{borderRadius:18,border:"1px solid rgba(255,181,74,.22)",background:"linear-gradient(180deg,rgba(35,23,8,.98),rgba(5,8,13,.99))",padding:11,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:7}}><b style={{fontSize:11,color:TAB_COLORS.objectives}}>🎯 OBJECTIFS CLASSÉS</b><strong style={{color:TAB_COLORS.objectives,fontSize:16}}>{challengeObjectives.filter((objective:string)=>(challengeObjectiveStandings[objective]||[]).length>0).length}/{challengeObjectives.length}</strong></div>
                    <div style={{fontSize:8.5,opacity:.62,marginTop:4}}>Chaque objectif conserve son classement, puis attribue ses points au général.</div>
                  </div>
                </div> : <>
                  <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10}}>
                    <div style={{borderRadius:18,border:"1px solid rgba(101,230,162,.22)",background:"linear-gradient(180deg,rgba(8,22,17,.98),rgba(5,8,13,.99))",padding:11,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:7}}><b style={{fontSize:11,color:TAB_COLORS.standings}}>✓ RÉSULTATS</b><strong style={{color:TAB_COLORS.standings,fontSize:16}}>{doneMatches.length}</strong></div>
                      <div style={{fontSize:8.5,opacity:.62,marginTop:4}}>{doneMatches.length?"Dernières rencontres terminées":"Aucun résultat pour le moment"}</div>
                    </div>
                    <div style={{borderRadius:18,border:"1px solid rgba(255,230,138,.22)",background:"linear-gradient(180deg,rgba(27,23,10,.98),rgba(5,8,13,.99))",padding:11,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:7}}><b style={{fontSize:11,color:TAB_COLORS.linked}}>＋ HISTORIQUE</b><strong style={{color:TAB_COLORS.linked,fontSize:16}}>{linkedHistoryMatches.length}</strong></div>
                      {!publicSpectator?<button type="button" onClick={loadAttachableHistory} style={{marginTop:7,width:"100%",border:"1px solid rgba(255,230,138,.25)",borderRadius:10,padding:"7px 8px",fontWeight:950,fontSize:8.5,cursor:"pointer",color:"#ffe68a",background:"rgba(255,230,138,.07)"}}>AJOUTER UNE PARTIE</button>:null}
                    </div>
                  </div>
                  {doneMatches.length?<div style={{display:"grid",gap:8}}>{doneMatches.slice().sort((a:any,b:any)=>(b.updatedAt??0)-(a.updatedAt??0)).slice(0,3).map((m:any)=>renderMatchCard(m,TAB_COLORS.standings))}</div>:null}
                </>}
              </div>
            </>
            )
          ) : null}

          {/* POOLS */}
          {tab === "pools" ? (
            <Card title="Poules" subtitle="Sous-onglets par poule + rounds." accent={TAB_COLORS.pools} icon="▦">
              <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                {Array.from({ length: groupsMeta }, (_, i) => (
                  <Pill key={i} active={activeGroupIdx === i} label={`${String.fromCharCode(65 + i)}`} onClick={() => setActiveGroupIdx(i)} accent={TAB_COLORS.pools} />
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {(() => {
                  const arr = rrMatchesByGroup[activeGroupIdx] || [];
                  const byRound: Record<number, any[]> = {};
                  for (const m of arr) {
                    const r = Number(m.roundIndex ?? 0);
                    if (!byRound[r]) byRound[r] = [];
                    byRound[r].push(m);
                  }
                  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                  return rounds.map((r) => (
                    <div key={r} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                      <div style={{ fontWeight: 950, color: TAB_COLORS.pools, marginBottom: 10 }}>ROUND {r + 1}</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {byRound[r]
                          .filter((m) => !isByeMatch(m))
                          .filter((m) => !isTbdId(m?.aPlayerId) && !isTbdId(m?.bPlayerId))
                          .map((m: any) => renderMatchCard(m, TAB_COLORS.pools))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          ) : null}

          {/* MON ESPACE JOUEUR — CHALLENGE ONLINE */}
          {tab === "my" && isChallengePerformanceCompetition && challengePlayerDashboard ? (
            <Card
              title="Mon espace joueur"
              subtitle="Ta progression personnelle, les objectifs ouverts et tes classements sont synchronisés avec la compétition Online."
              accent={TAB_COLORS.my}
              icon="⚡"
            >
              <div style={{display:"grid",gap:10}}>
                <section style={{borderRadius:17,border:"1px solid rgba(34,230,255,.24)",background:"linear-gradient(180deg,#07141c,#04090f)",padding:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"52px minmax(0,1fr) auto",gap:10,alignItems:"center"}}>
                    <div style={{width:52,height:52,borderRadius:999,overflow:"hidden",display:"grid",placeItems:"center",border:"1px solid rgba(34,230,255,.42)",background:"rgba(34,230,255,.10)",color:"#bff8ff",fontWeight:1000,fontSize:18}}>
                      {(challengePlayerDashboard.player?.avatarDataUrl||challengePlayerDashboard.player?.avatarUrl||challengePlayerDashboard.player?.avatar)
                        ? <img src={challengePlayerDashboard.player?.avatarDataUrl||challengePlayerDashboard.player?.avatarUrl||challengePlayerDashboard.player?.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : String(challengePlayerDashboard.player?.name||"J").slice(0,1).toUpperCase()}
                    </div>
                    <div style={{minWidth:0}}>
                      <b style={{display:"block",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{challengePlayerDashboard.player?.name||"Joueur"}</b>
                      <span style={{display:"block",marginTop:3,fontSize:8.5,color:"#8fdfee",fontWeight:900}}>CYCLE {challengeCurrentCycle}{challengeCompetitionFormat==="divisions"?` · DIVISION ${challengePlayerDashboard.division}`:""}</span>
                      <span style={{display:"block",marginTop:3,fontSize:8,opacity:.58}}>{liveLastUpdatedAt?`Synchronisé ${Math.max(0,Math.floor((Date.now()-liveLastUpdatedAt)/1000))<12?"à l’instant":`il y a ${Math.max(1,Math.floor((Date.now()-liveLastUpdatedAt)/60000))} min`}`:"Synchronisation Online en cours…"}</span>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <b style={{display:"block",fontSize:22,color:TAB_COLORS.my}}>#{challengePlayerDashboard.cycleStanding?.rank||"—"}</b>
                      <span style={{display:"block",fontSize:7.5,opacity:.58}}>CLASSEMENT CYCLE</span>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:6,marginTop:11}}>
                    {[
                      ["POINTS",challengePlayerDashboard.cycleStanding?.points||0,"#65e6a2"],
                      ["SAISON",challengePlayerDashboard.seasonStanding?.rank?`#${challengePlayerDashboard.seasonStanding.rank}`:"—","#b6b6ff"],
                      ["JOUÉS",`${challengePlayerDashboard.scored.length}/${challengePlayerDashboard.objectives.length}`,"#ffcf73"],
                      ["TERMINÉS",`${challengePlayerDashboard.completed.length}/${challengePlayerDashboard.objectives.length}`,"#ffb54a"],
                    ].map(([label,value,color])=><div key={String(label)} style={{padding:"8px 6px",borderRadius:11,border:"1px solid rgba(255,255,255,.07)",background:"#080d14",textAlign:"center"}}><b style={{display:"block",fontSize:14,color:String(color)}}>{String(value)}</b><span style={{display:"block",marginTop:2,fontSize:6.8,opacity:.55,fontWeight:1000}}>{label}</span></div>)}
                  </div>

                  <div style={{marginTop:9}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:7.5,fontWeight:900,opacity:.68}}><span>PROGRESSION PROGRAMME</span><span>{challengePlayerDashboard.progress}%</span></div>
                    <div style={{height:6,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden",marginTop:4}}><div style={{height:"100%",width:`${challengePlayerDashboard.progress}%`,background:"linear-gradient(90deg,#22e6ff,#65e6a2)",boxShadow:"0 0 12px rgba(34,230,255,.45)"}}/></div>
                  </div>
                </section>

                <section style={{borderRadius:16,border:"1px solid rgba(101,230,162,.20)",background:"#060d11",padding:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                    <div><b style={{fontSize:11,color:"#65e6a2"}}>À JOUER MAINTENANT</b><div style={{fontSize:8,opacity:.58,marginTop:2}}>Objectifs actuellement ouverts avec des essais disponibles.</div></div>
                    <span style={{fontSize:15,fontWeight:1000,color:"#65e6a2"}}>{challengePlayerDashboard.playable.length}</span>
                  </div>
                  {challengePlayerDashboard.playable.length ? <div style={{display:"grid",gap:6,marginTop:8}}>
                    {challengePlayerDashboard.playable.map((row:any)=><div key={`my-open-${row.objective}`} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:"8px 9px",borderRadius:11,border:"1px solid rgba(101,230,162,.12)",background:"#081019"}}>
                      <ChallengeObjectiveThumb objective={row.objective}/>
                      <div><b style={{display:"block",fontSize:10}}>{challengeObjectiveLabel(row.objective)}</b><span style={{display:"block",marginTop:2,fontSize:7.5,opacity:.58}}>J{Number(row.round?.round||0)||1} · {row.attempts}/{row.maxAttempts} essais · {challengeObjectiveVisits(row.objective)} tours</span></div>
                      <span style={{fontSize:8,color:row.standing?"#65e6a2":"#8593a3",fontWeight:900}}>{row.standing?`#${row.standing.rank} · ${row.standing.score}`:"PAS DE SCORE"}</span>
                      <button type="button" onClick={()=>launchChallengeAttempt(challengePlayerDashboard.player,row.objective)} style={{minHeight:32,borderRadius:9,border:"1px solid rgba(101,230,162,.34)",background:"rgba(14,62,43,.84)",color:"#fff",padding:"0 10px",fontSize:8,fontWeight:1000}}>JOUER</button>
                    </div>)}
                  </div>:<div style={{marginTop:8,padding:10,borderRadius:11,background:"rgba(255,255,255,.025)",fontSize:9,opacity:.65}}>Aucun objectif jouable pour le moment. Une nouvelle journée peut être publiée par l’organisation.</div>}
                </section>

                <section style={{borderRadius:16,border:"1px solid rgba(255,181,74,.18)",background:"#080c12",padding:11}}>
                  <b style={{fontSize:11,color:"#ffcf73"}}>MON PROGRAMME</b>
                  <div style={{display:"grid",gap:5,marginTop:8}}>
                    {challengePlayerDashboard.objectives.map((row:any)=>{
                      const state=row.completed?"TERMINÉ":row.open?"OUVERT":String(row.status)==="closed"?"CLOS":"À VENIR";
                      const tone=row.completed?"#65e6a2":row.open?"#22e6ff":String(row.status)==="closed"?"#7c8796":"#ffb54a";
                      return <button type="button" key={`my-program-${row.objective}`} onClick={()=>{setChallengeObjectiveFocus(row.objective);setTab("objectives")}} style={{display:"grid",gridTemplateColumns:"28px 64px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:10,border:"1px solid rgba(255,255,255,.06)",background:"#060b12",color:"#fff",textAlign:"left",cursor:"pointer",width:"100%"}}>
                        <ChallengeObjectiveThumb objective={row.objective}/>
                        <b style={{fontSize:8.5,color:tone}}>{challengeObjectiveLabel(row.objective)}</b>
                        <div style={{minWidth:0,fontSize:7.7,opacity:.68,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.attempts}/{row.maxAttempts} essais{row.standing?` · meilleur ${row.standing.score} · #${row.standing.rank}`:" · aucun score"}</div>
                        <span style={{fontSize:7.2,fontWeight:1000,color:tone}}>{state}</span>
                      </button>
                    })}
                  </div>
                </section>
              </div>
            </Card>
          ) : null}

          {/* CHALLENGE OBJECTIVES */}
          {tab === "objectives" && isChallengePerformanceCompetition ? (
            <Card title="Objectifs Challenge" subtitle="Un objectif à la fois : programme, classement, essais disponibles et meilleur résultat." accent={TAB_COLORS.objectives} icon="🎯">
              <div style={{display:"grid",gap:10}}>
                {challengeScheduleRounds.length ? (
                  <section className="chv-panel" style={{padding:11,borderColor:"rgba(255,181,74,.15)"}}>
                    <div className="chv-section-head" style={{marginBottom:7}}>
                      <div><div className="chv-eyebrow">PROGRAMME · CYCLE {challengeCurrentCycle}</div><div className="chv-sub" style={{marginTop:3}}>{String(challengeCompetition?.schedule?.publicationMode||"round_by_round")==="round_by_round"?"Publication journée par journée":"Tous les objectifs peuvent être ouverts simultanément"}</div></div>
                      <span className="chv-status" style={{color:"#ffcf73"}}>{challengeScheduleRounds.length} JOURNÉE{challengeScheduleRounds.length>1?"S":""}</span>
                    </div>
                    <div className="chv-objective-strip">
                      {challengeScheduleRounds.map((round:any)=>{
                        const status=String(round?.status||"open");
                        const accent=status==="open"?"#65e6a2":status==="closed"?"#707b88":"#ffb54a";
                        return <button key={String(round?.id)} type="button" className="chv-objective-chip" onClick={()=>{const first=(Array.isArray(round?.objectives)?round.objectives:[])[0];if(first)setChallengeObjectiveFocus(normalizeChallengeObjective(first));}} style={{borderColor:`${accent}33`,color:accent,minWidth:84}}><span style={{display:"block",fontSize:6.8,opacity:.72}}>J{Number(round?.round||0)||1} · {status==="open"?"OUVERTE":status==="closed"?"CLOSE":"À VENIR"}</span><b style={{display:"block",marginTop:3,fontSize:8.5}}>{(Array.isArray(round?.objectives)?round.objectives:[]).map(challengeObjectiveLabel).join(" · ")||"—"}</b></button>
                      })}
                    </div>
                  </section>
                ) : null}

                <section className="chv-panel" style={{padding:11}}>
                  <div className="chv-section-head" style={{marginBottom:7}}><div><div className="chv-eyebrow">CHOISIR L’OBJECTIF</div><div className="chv-sub" style={{marginTop:3}}>Choisis une cible pour voir son classement, tes essais disponibles et jouer.</div></div><span className="chv-status" style={{color:"#ffb54a"}}>{challengeObjectives.length} OBJECTIF{challengeObjectives.length>1?"S":""}</span></div>
                  <div className="chv-objective-strip">
                    {challengeObjectives.map((objective:string)=>{
                      const open=challengeObjectiveIsOpen(objective);
                      const round=challengeRoundForObjective(objective);
                      const status=String(round?.status||"open");
                      const active=normalizeChallengeObjective(challengeFocusedObjective)===normalizeChallengeObjective(objective);
                      const tone=open?"#65e6a2":status==="closed"?"#778391":"#ffb54a";
                      return <button key={objective} type="button" className="chv-objective-chip" data-active={active?"true":"false"} onClick={()=>setChallengeObjectiveFocus(objective)}><ChallengeObjectiveThumb objective={objective}/><b style={{display:"block",fontSize:9,color:active?"#ffcf73":"#e5ebf2"}}>{challengeObjectiveLabel(objective)}</b><span style={{display:"block",marginTop:2,fontSize:6.6,color:tone}}>{open?"OUVERT":status==="closed"?"CLOS":"À VENIR"}</span></button>
                    })}
                  </div>
                </section>

                {challengeFocusedObjective ? (()=>{
                  const objective=challengeFocusedObjective;
                  const rows=challengeObjectiveStandings[objective]||[];
                  const round:any=challengeRoundForObjective(objective);
                  const open=challengeObjectiveIsOpen(objective);
                  const status=String(round?.status||"open");
                  const attemptLimit=challengeObjectiveAttemptLimit(objective);
                  const visits=challengeObjectiveVisits(objective);
                  const top3=rows.slice(0,3);
                  return <section className="chv-panel" style={{borderColor:"rgba(255,181,74,.20)"}}>
                    <div className="chv-section-head">
                      <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}><ChallengeObjectiveThumb objective={objective} className="chv-objective-hero-thumb"/><div style={{minWidth:0}}><div className="chv-eyebrow">OBJECTIF SÉLECTIONNÉ</div><div className="chv-title" style={{fontSize:17,color:"#ffcf73",marginTop:3}}>{challengeObjectiveLabel(objective)}</div><div className="chv-sub" style={{marginTop:4}}>Meilleur essai retenu · {visits} tours · {attemptLimit} essai{attemptLimit>1?"s":""} maximum</div></div></div>
                      <span className="chv-status" style={{color:open?"#65e6a2":status==="closed"?"#7f8a98":"#ffb54a"}}>{open?"● OUVERT":status==="closed"?"CLOS":"À VENIR"}</span>
                    </div>

                    {currentTournamentPlayer ? (()=>{
                      const meId=String(currentTournamentPlayer?.id||"");
                      const meRow=(challengeObjectiveStandings[objective]||[]).find((row:any)=>String(row?.playerId||"")===meId)||null;
                      const used=challengeAttemptCount(meId,objective);
                      const max=challengeObjectiveAttemptLimit(objective);
                      const canPlayMine=!publicSpectator&&open&&used<max;
                      return <div className="chv-personal-focus"><ChallengeObjectiveThumb objective={objective} className="chv-objective-hero-thumb"/><div style={{minWidth:0}}><div className="chv-eyebrow" style={{color:"#22e6ff"}}>MON OBJECTIF</div><b style={{display:"block",fontSize:11,marginTop:2}}>{meRow?`#${meRow.rank} · ${meRow.score} pts`:`Pas encore classé`}</b><span className="chv-sub" style={{display:"block",marginTop:3}}>{used}/{max} essai{max>1?"s":""} utilisé{used>1?"s":""}{meRow?` · +${meRow.championshipPoints} pts championnat`:""}</span></div>{!publicSpectator?<button type="button" className="chv-action chv-personal-action" disabled={!canPlayMine} onClick={()=>launchChallengeAttempt(currentTournamentPlayer,objective)} style={{border:`1px solid ${canPlayMine?"rgba(34,230,255,.38)":"rgba(255,255,255,.07)"}`,background:canPlayMine?"rgba(8,43,57,.92)":"#080d14",color:canPlayMine?"#22e6ff":"#677280"}}>{used>=max?"ESSAIS TERMINÉS":!open?"OBJECTIF FERMÉ":"JOUER UN ESSAI"}</button>:null}</div>;
                    })() : null}
                    {top3.length ? <div className="chv-podium" style={{marginBottom:10}}>{top3.map((row:any,index:number)=><div key={`pod-${objective}-${row.playerId}`} style={index===0?{order:1}:index===1?{order:0}:{order:2}}><span className="chv-eyebrow">#{row.rank}</span><b style={{display:"block",fontSize:index===0?12:10,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:index===0?"#ffcf73":"#fff"}}>{row.name}</b><strong style={{display:"block",fontSize:index===0?18:15,marginTop:5,color:"#65e6a2"}}>{row.score}</strong><span className="chv-sub">+{row.championshipPoints} pts</span></div>)}</div>:null}

                    {(()=>{
                      const orderedPlayers=[...tournamentPlayers].sort((a:any,b:any)=>{
                        const ar=rows.find((r:any)=>String(r.playerId)===String(a?.id||""));
                        const br=rows.find((r:any)=>String(r.playerId)===String(b?.id||""));
                        if(ar&&br)return Number(ar.rank||999)-Number(br.rank||999);
                        if(ar)return -1;if(br)return 1;return String(a?.name||"").localeCompare(String(b?.name||""));
                      });
                      const renderPlayer=(player:any)=>{
                        const pid=String(player?.id||"");
                        const row=rows.find((r:any)=>String(r.playerId)===pid);
                        const attempts=challengeAttemptCount(pid,objective);
                        const maxAttempts=challengeObjectiveAttemptLimit(objective);
                        const canPlay=!publicSpectator&&(isCompetitionAdmin||String(currentTournamentPlayer?.id||"")===pid)&&open&&attempts<maxAttempts;
                        return <div key={`${objective}-${pid}`} className={`chv-row chv-objective-row${String(currentTournamentPlayer?.id||"")===pid?" chv-highlight-me":""}`}>
                          <strong style={{color:row&&Number(row.rank)<=3?"#ffcf73":"#7f8b99"}}>{row?`#${row.rank}`:"—"}</strong>
                          <div style={{minWidth:0}}><span className="chv-row-name">{player?.name||"Joueur"}</span><span className="chv-row-sub">{attempts}/{maxAttempts} essai{maxAttempts>1?"s":""}{row?` · meilleur ${row.score}`:" · aucun score"}</span></div>
                          <b style={{fontSize:9,color:row?"#65e6a2":"#768190"}}>{row?`+${row.championshipPoints} pts`:"—"}</b>
                          {!publicSpectator?<button type="button" className="chv-action chv-play" disabled={!canPlay} onClick={()=>launchChallengeAttempt(player,objective)} style={{minWidth:66,border:`1px solid ${canPlay?"rgba(255,181,74,.38)":"rgba(255,255,255,.07)"}`,background:canPlay?"rgba(75,45,8,.92)":"#080d14",color:canPlay?"#ffcf73":"#677280"}}>{attempts>=maxAttempts?"COMPLET":!open?"FERMÉ":"JOUER"}</button>:null}
                        </div>;
                      };
                      const first=orderedPlayers.slice(0,6), rest=orderedPlayers.slice(6);
                      return <><div className="chv-rows">{first.map(renderPlayer)}</div>{rest.length?<details className="chv-roster-more"><summary>VOIR LES {rest.length} AUTRE{rest.length>1?"S":""} PARTICIPANT{rest.length>1?"S":""}</summary><div className="chv-rows" style={{padding:7}}>{rest.map(renderPlayer)}</div></details>:null}</>;
                    })()}
                    {!tournamentPlayers.length?<div className="chv-sub" style={{padding:"10px 0"}}>Aucun participant inscrit.</div>:null}
                  </section>
                })() : <section className="chv-panel"><div className="chv-sub">Aucun objectif configuré.</div></section>}
              </div>
            </Card>
          ) : null}

          {/* STANDINGS */}
          {tab === "standings" ? (
            <Card title={isChallengePerformanceCompetition?"Classement général":"Classement"} subtitle={isChallengePerformanceCompetition?"Somme des points obtenus dans les classements de chaque objectif.":viewKind === "round_robin" ? (isAveragePointsLeague ? "Classement par moyenne de points par match." : "Classement du championnat.") : "Classement par poule."} accent={TAB_COLORS.standings} icon="🏁">
              {isChallengePerformanceCompetition ? (() => {
                const standingsRows = challengeStandingScope === "season" ? (challengeCycleHistory.length ? challengeSeasonStandings : challengeSeasonStandings.filter((row:any)=>Number(row?.points||0)>0||Number(row?.wins||0)>0||Number(row?.podiums||0)>0)) : challengeDisplayGeneralStandings;
                const podiumRows = standingsRows.slice(0, 3);
                const otherRows = standingsRows.slice(3);
                return (
                  <div style={{display:"grid",gap:10}}>
                    <section className="chv-panel" style={{padding:11}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        <button type="button" onClick={()=>setChallengeStandingScope("cycle")} className="chv-action" style={{border:`1px solid ${challengeStandingScope==="cycle"?"rgba(255,207,115,.48)":"rgba(255,255,255,.08)"}`,background:challengeStandingScope==="cycle"?"rgba(63,45,9,.90)":"#070d15",color:challengeStandingScope==="cycle"?"#ffcf73":"#a7b0bb"}}>CYCLE {challengeCurrentCycle}</button>
                        <button type="button" onClick={()=>setChallengeStandingScope("season")} className="chv-action" style={{border:`1px solid ${challengeStandingScope==="season"?"rgba(182,182,255,.48)":"rgba(255,255,255,.08)"}`,background:challengeStandingScope==="season"?"rgba(28,28,65,.88)":"#070d15",color:challengeStandingScope==="season"?"#d8d8ff":"#a7b0bb"}}>SAISON</button>
                      </div>
                      <div className="chv-sub" style={{marginTop:7}}>{challengeStandingScope==="season" ? `${String(challengeSeasonSettings?.name||"Saison Challenge")} · somme des points acquis sur les cycles` : `Points du cycle obtenus dans les classements de chaque objectif.`}</div>
                    </section>

                    {standingsRows.length ? (
                      <>
                        {currentTournamentPlayer ? (()=>{
                          const meId=String(currentTournamentPlayer?.id||"");
                          const me=standingsRows.find((row:any)=>String(row?.playerId||"")===meId)||null;
                          if(!me)return null;
                          return <section className="chv-panel chv-highlight-me" style={{padding:10}}><div style={{display:"grid",gridTemplateColumns:"38px minmax(0,1fr) auto",gap:9,alignItems:"center"}}><div style={{width:38,height:38,borderRadius:12,border:"1px solid rgba(34,230,255,.22)",background:"rgba(7,28,36,.92)",display:"grid",placeItems:"center",fontSize:13,fontWeight:1000,color:"#22e6ff"}}>#{me.rank}</div><div style={{minWidth:0}}><div className="chv-eyebrow" style={{color:"#22e6ff"}}>MA POSITION · {challengeStandingScope==="season"?"SAISON":`CYCLE ${challengeCurrentCycle}`}</div><b style={{display:"block",fontSize:10.5,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.name}</b><span className="chv-row-sub">{me.wins||0} victoire{Number(me.wins||0)>1?"s":""} · {me.podiums||0} podium{Number(me.podiums||0)>1?"s":""}</span></div><b style={{fontSize:15,color:"#65e6a2"}}>{me.points} pts</b></div></section>;
                        })() : null}
                        <section className="chv-panel" style={{borderColor:"rgba(101,230,162,.16)"}}>
                          <div className="chv-section-head"><div><div className="chv-eyebrow">PODIUM</div><div className="chv-title" style={{marginTop:3}}>{challengeStandingScope==="season"?"Classement saison":"Classement du cycle"}</div></div><span className="chv-status" style={{color:"#65e6a2"}}>{standingsRows.length} CLASSÉ{standingsRows.length>1?"S":""}</span></div>
                          <div className="chv-podium">{podiumRows.map((row:any,index:number)=><div key={`overall-pod-${challengeStandingScope}-${row.playerId}`} style={index===0?{order:1}:index===1?{order:0}:{order:2}}><span className="chv-eyebrow">#{row.rank}</span><b style={{display:"block",fontSize:index===0?12:10,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:index===0?"#ffcf73":"#fff"}}>{row.name}</b><strong style={{display:"block",fontSize:index===0?19:16,marginTop:5,color:"#65e6a2"}}>{row.points}</strong><span className="chv-sub">POINTS</span>{challengeCompetitionFormat==="divisions"?<span className="chv-row-sub" style={{marginTop:3}}>D{Math.max(1,Number(challengeDivisionState?.assignments?.[String(row.playerId)]||1)||1)}</span>:null}</div>)}</div>
                        </section>

                        {otherRows.length ? <section className="chv-panel" style={{padding:10}}><div className="chv-rows">{otherRows.map((row:any)=><div key={`${challengeStandingScope}-${row.playerId}`} className="chv-row"><strong style={{color:"#8d9aac"}}>#{row.rank}</strong><div style={{minWidth:0}}><span className="chv-row-name">{row.name}</span><span className="chv-row-sub">{challengeStandingScope==="season"?`${row.wins||0} vic. · ${row.podiums||0} podiums · ${row.cycles||0} cycles`:`${row.wins||0} vic. objectif · ${row.podiums||0} podiums · ${row.objectives||0} classés`}{challengeCompetitionFormat==="divisions"?` · D${Math.max(1,Number(challengeDivisionState?.assignments?.[String(row.playerId)]||1)||1)}`:""}</span></div><b style={{fontSize:12,color:"#65e6a2"}}>{row.points} pts</b></div>)}</div></section>:null}
                      </>
                    ) : <section className="chv-panel"><div style={{textAlign:"center",padding:"16px 8px"}}><b style={{fontSize:10,color:"#8d9aac"}}>CLASSEMENT EN ATTENTE</b><div className="chv-sub" style={{marginTop:4}}>Le classement apparaîtra dès le premier résultat classé.</div></div></section>}

                    {challengeStandingScope==="cycle"&&challengeCycleHistory.length?<details className="chv-panel" style={{padding:11}}><summary style={{cursor:"pointer",fontSize:9,fontWeight:1000,color:"#b6b6ff"}}>HISTORIQUE DES CYCLES · {challengeCycleHistory.length}</summary><div style={{display:"grid",gap:7,marginTop:9}}>{challengeCycleHistory.map((cycle:any)=><div key={`history-${cycle.cycle}`} className="chv-panel-soft"><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{fontSize:9.5}}>{cycle.name||`CYCLE ${cycle.cycle}`}</b><span className="chv-sub">{cycle.closedAt?formatDate(Number(cycle.closedAt)):""}</span></div><div className="chv-rows" style={{marginTop:6}}>{(Array.isArray(cycle.standingsSnapshot)?cycle.standingsSnapshot:[]).slice(0,10).sort((a:any,b:any)=>Number(a.division||1)-Number(b.division||1)||Number(a.rank||999)-Number(b.rank||999)).map((row:any)=><div key={`${cycle.cycle}-${row.playerId}-${row.division}`} className="chv-row"><span style={{fontSize:7.5,color:"#b6b6ff"}}>D{Number(row.division||1)} · #{Number(row.rank||0)}</span><div style={{minWidth:0}}><span className="chv-row-name">{row.name||playersById[String(row.playerId)]?.name||"Joueur"}</span></div><b style={{fontSize:8.5}}>{Number(row.cyclePoints??row.points??0)} pts</b></div>)}</div></div>)}</div></details>:null}
                  </div>
                );
              })() : viewKind === "round_robin" ? (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <MiniBadge label={isLeagueMulti ? "Parties liées" : "Matchs"} value={isLeagueMulti ? linkedHistoryMatches.length : byPhase.groups.length} accent={TAB_COLORS.standings} />
                    <button type="button" onClick={loadAttachableHistory} style={{ borderRadius: 999, border: "1px solid rgba(255,207,87,.45)", background: "rgba(255,207,87,.10)", color: "#ffcf57", fontWeight: 950, padding: "8px 10px", cursor: "pointer" }}>+ Partie jouée</button>
                  </div>
                  <StandingsTable rows={isLeagueMulti ? linkedMultiStandings : computeStandings(Object.keys(playersById), byPhase.groups, isLeagueFree ? 3 : 2)} playersById={playersById} accent={TAB_COLORS.standings} averageMode={isAveragePointsLeague} />
                </>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                    {Array.from({ length: groupsMeta }, (_, i) => (
                      <Pill key={i} active={activeGroupIdx === i} label={`${String.fromCharCode(65 + i)}`} onClick={() => setActiveGroupIdx(i)} accent={TAB_COLORS.pools} />
                    ))}
                  </div>

                  <StandingsTable rows={rrStandingsByGroup[activeGroupIdx] || []} playersById={playersById} accent={TAB_COLORS.standings} />
                </div>
              )}
            </Card>
          ) : null}

          {/* BRACKET */}
          {tab === "bracket" ? (
            <Card title="Tableau" subtitle={viewKind === "round_robin" ? "Le classement est dans l’onglet Classement." : "Éliminatoires (Vue coupe du monde / Détails)."} accent={TAB_COLORS.bracket} icon="⟂">
              {viewKind === "round_robin" ? (
                <div style={{ fontSize: 12, opacity: 0.78 }}>Pas de bracket en championnat.</div>
              ) : (
                <>
                  <div className="dc-scroll-thin" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                    <Pill active={bracketSub === "view"} label="Vue" onClick={() => setBracketSub("view")} accent={TAB_COLORS.bracket} />
                    <Pill active={bracketSub === "details"} label="Détails" onClick={() => setBracketSub("details")} accent={TAB_COLORS.bracket} />
                  </div>

                  {bracketSub === "view" ? (
                    <div style={{ marginTop: 12 }}>
                      <WorldCupBracketViewPure koMatches={koMatches} playersById={playersById} allMatches={safeMatches as any} onOpenMatch={onOpenMatchDetails} />
                    </div>
                  ) : null}

                  {bracketSub === "details" ? (
                    <div style={{ marginTop: 12 }}>
                      {(() => {
                        const detailsKo = koMatches.filter((m: any) => !isByeMatch(m));
                        return (
                          <WorldCupKoDetailsColumns
                            koMatches={detailsKo}
                            renderMatchCard={(m: any) => renderMatchCard(m, TAB_COLORS.bracket, { clickable: true, hideActions: true })}
                            getScore={getScoreForAnyMatch}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          {/* MATCHES */}
          {tab === "matches" ? (
            <Card title="Matchs" subtitle={sectionTitleForMatches()} accent={TAB_COLORS.matches} icon="≡">
              {(() => {
                let arr: any[] = [];
                if (viewKind === "round_robin") arr = byPhase.groups.slice();
                else if (viewKind === "groups_ko") arr = displayMatches.slice();
                else arr = byPhase.ko.slice();

                arr = arr.filter((m) => !isByeMatch(m)).filter((m) => !isVoidByeMatch(m));
                if (!arr.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match à afficher.</div>;

                const byBlock: Record<string, any[]> = {};
                for (const m of arr) {
                  const isGroupLike =
                    String(m?.phase || "") === "groups" ||
                    typeof m?.groupIndex === "number" ||
                    m?.stageIndex === 0;

                  if (isGroupLike) {
                    if (typeof m?.groupIndex !== "number") {
                      const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                      const key = `UNASSIGNED_R${r}`;
                      (byBlock[key] ||= []).push(m);
                    } else {
                      const g = m.groupIndex;
                      const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                      const key = `G${g}_R${r}`;
                      (byBlock[key] ||= []).push(m);
                    }
                  } else {
                    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                    const key = `KO_R${r}`;
                    (byBlock[key] ||= []).push(m);
                  }
                }

                const keys = Object.keys(byBlock).sort((a, b) => {
                  const aUn = a.startsWith("UNASSIGNED");
                  const bUn = b.startsWith("UNASSIGNED");
                  if (aUn !== bUn) return aUn ? 1 : -1;
                  return a.localeCompare(b);
                });

                return (
                  <div style={{ display: "grid", gap: 12 }}>
                    {keys.map((k) => {
                      const items = (byBlock[k] || [])
                        .slice()
                        .sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                      const first = items[0];
                      const isUnassigned = k.startsWith("UNASSIGNED_");
                      const isGroupLike =
                        !isUnassigned &&
                        (String(first?.phase || "") === "groups" || typeof first?.groupIndex === "number" || first?.stageIndex === 0);

                      let title = "Matchs";
                      if (isUnassigned) {
                        const r = typeof first?.roundIndex === "number" ? first.roundIndex : 0;
                        title = `À classer • Round ${r + 1}`;
                      } else if (isGroupLike) {
                        const g = first.groupIndex;
                        const r = typeof first.roundIndex === "number" ? first.roundIndex : 0;
                        title = `Poule ${String.fromCharCode(65 + g)} • Round ${r + 1}`;
                      } else {
                        const r = typeof first?.roundIndex === "number" ? first.roundIndex : 0;
                        title = koTourLabel(r, koRoundsCount);
                      }

                      return (
                        <div key={k} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                          <div style={{ fontWeight: 950, color: isUnassigned ? "#ff8f2b" : TAB_COLORS.matches, marginBottom: 10 }}>{title}</div>
                          <div style={{ display: "grid", gap: 10 }}>{items.map((m: any) => renderMatchCard(m, TAB_COLORS.matches))}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          ) : null}

          {/* REPECHAGE */}
          {tab === "repechage" ? (
            <Card title="Repêchage" subtitle="Matchs de repêchage (Losers / ou stage dédié)." accent={TAB_COLORS.repechage} icon="↻">
              {(() => {
                const rep = byPhase.rep
                  .filter((m: any) => !isByeMatch(m))
                  .filter((m: any) => !isVoidByeMatch(m))
                  .slice()
                  .sort((a: any, b: any) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                if (!rep.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match de repêchage.</div>;
                return <div style={{ display: "grid", gap: 10 }}>{rep.map((m) => renderMatchCard(m, TAB_COLORS.repechage))}</div>;
              })()}
            </Card>
          ) : null}

          {/* RÉSULTATS / PARTIES LIÉES */}
          {tab === "linked" ? (
            isChallengePerformanceCompetition ? (
              <Card title="Résultats Challenge" subtitle="Tous les essais rattachés à la compétition, triés du plus récent au plus ancien." accent={TAB_COLORS.linked} icon="↔">
                <div style={{display:"grid",gap:10}}>
                  {!publicSpectator ? <div className="chv-panel" style={{padding:10,borderColor:"rgba(255,213,106,.16)"}}>
                    <div style={{display:"grid",gridTemplateColumns:isCompetitionAdmin?"1fr 1fr":"1fr",gap:7}}>
                      <button type="button" className="chv-action" onClick={loadAttachableHistory} style={{border:"1px solid rgba(255,213,106,.32)",background:"rgba(60,47,13,.92)",color:"#ffe68a"}}>＋ RATTACHER UNE PARTIE DE L’HISTORIQUE</button>
                      {isCompetitionAdmin?<button type="button" className="chv-action" onClick={()=>setTab("admin")} style={{border:"1px solid rgba(255,107,107,.24)",background:"rgba(65,18,24,.88)"}}>GÉRER LES ESSAIS</button>:null}
                    </div>
                    <div className="chv-sub" style={{marginTop:6}}>Les essais lancés directement depuis la compétition sont ajoutés automatiquement. Le rattachement manuel sert surtout à la compétition libre ou aux parties déjà jouées.</div>
                  </div> : null}

                  {currentTournamentPlayer ? <div className="chv-result-scope"><button type="button" data-active={challengeResultsOwner==="all"?"true":"false"} onClick={()=>setChallengeResultsOwner("all")}>TOUS LES JOUEURS</button><button type="button" data-active={challengeResultsOwner==="mine"?"true":"false"} onClick={()=>setChallengeResultsOwner("mine")}>MES ESSAIS</button></div> : null}

                  {challengeObjectives.length ? <div className="chv-objective-strip"><button type="button" className="chv-objective-chip" data-active={challengeResultsFocus==="all"?"true":"false"} onClick={()=>setChallengeResultsFocus("all")} style={{paddingRight:9}}><b style={{display:"block",fontSize:8.5}}>TOUS</b><span style={{display:"block",marginTop:2,fontSize:6.5,color:"#8d9aac"}}>{linkedHistoryMatches.length} résultat{linkedHistoryMatches.length>1?"s":""}</span></button>{challengeObjectives.map((objective:string)=>{
                    const count=linkedHistoryMatches.filter((link:any)=>normalizeChallengeObjective(link?.challengeObjective||link?.target||link?.objective||historyChallengeObjective(link))===objective).length;
                    return <button key={`result-chip-${objective}`} type="button" className="chv-objective-chip" data-active={normalizeChallengeObjective(challengeResultsFocus)===objective?"true":"false"} onClick={()=>setChallengeResultsFocus(objective)}><ChallengeObjectiveThumb objective={objective}/><b style={{display:"block",fontSize:8.5}}>{challengeObjectiveLabel(objective)}</b><span style={{display:"block",marginTop:2,fontSize:6.5,color:"#8d9aac"}}>{count} résultat{count>1?"s":""}</span></button>})}</div>:null}

                  {challengeFilteredResults.length ? <section className="chv-panel" style={{padding:8}}>
                    {challengeFilteredResults.map((link:any,index:number)=>{
                      const ranking=Array.isArray(link?.ranking)?link.ranking:[];
                      const row=ranking[0]||{};
                      const pid=String(row?.playerId||row?.id||link?.playerId||"");
                      const player=playersById[pid]||null;
                      const objective=normalizeChallengeObjective(link?.challengeObjective||link?.target||link?.objective||historyChallengeObjective(link));
                      const score=Number(row?.score??row?.points??row?.bestScore??row?.best??link?.score??0)||0;
                      const attempt=Math.max(0,Number(link?.challengeAttemptNumber||0)||0);
                      const when=Number(link?.createdAt||link?.linkedAt||0)||0;
                      const cycle=Math.max(1,Number(link?.challengeCycle||1)||1);
                      const round=Math.max(0,Number(link?.challengeRoundNumber||0)||0);
                      return <div key={String(link?.historyMatchId||link?.matchId||link?.id||`result-${index}`)} className="chv-activity" style={{gridTemplateColumns:"74px minmax(0,1fr) auto"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}><ChallengeObjectiveThumb objective={objective}/><div style={{minWidth:0}}><b style={{display:"block",fontSize:8.5,color:"#ffb54a"}}>{challengeObjectiveLabel(objective)}</b><span className="chv-row-sub">C{cycle}{round?` · J${round}`:""}</span></div></div>
                        <div style={{minWidth:0}}><span className="chv-row-name">{row?.name||player?.name||"Joueur"}</span><span className="chv-row-sub">{attempt?`Essai ${attempt}`:"Partie liée"}{when?` · ${formatDate(when)}`:""}</span></div>
                        <div style={{textAlign:"right"}}><b style={{display:"block",fontSize:14,color:"#65e6a2"}}>{score}</b><span className="chv-row-sub">SCORE</span></div>
                      </div>
                    })}
                  </section> : <section className="chv-panel"><div style={{textAlign:"center",padding:"18px 8px"}}><b style={{fontSize:10,color:"#8d9aac"}}>AUCUN RÉSULTAT</b><div className="chv-sub" style={{marginTop:4}}>Les essais apparaîtront ici dès qu’ils seront joués ou rattachés.</div></div></section>}
                </div>
              </Card>
            ) : (
              <Card title="Parties liées" subtitle="Parties de l’historique rattachées à cette ligue. Le rattachement ne modifie pas l’historique d’origine." accent={TAB_COLORS.linked} icon="↔">
                <button
                  type="button"
                  onClick={loadAttachableHistory}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: 999,
                    padding: "12px 14px",
                    fontWeight: 1000,
                    cursor: "pointer",
                    color: "#1b1204",
                    background: "linear-gradient(180deg,#ffe68a,#ffc447)",
                    boxShadow: "0 12px 28px rgba(255,207,87,.22)",
                    marginBottom: 12,
                  }}
                >
                  + Ajouter des parties déjà jouées
                </button>

                {linkedHistoryMatches.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {linkedHistoryMatches
                      .slice()
                      .sort((a: any, b: any) => Number(b?.linkedAt || b?.createdAt || 0) - Number(a?.linkedAt || a?.createdAt || 0))
                      .map((link: any) => {
                        const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
                        const points = getLinkedPointsAwarded(link, tour);
                        return (
                          <div key={String(link?.historyMatchId || link?.id)} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                              <div style={{ fontWeight: 950, color: TAB_COLORS.linked }}>{String(link?.mode || "MATCH").toUpperCase()}</div>
                              <div style={{ fontSize: 11, opacity: .75 }}>{formatDate(Number(link?.createdAt || link?.linkedAt || 0))}</div>
                            </div>
                            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                              {ranking.slice(0, 8).map((r: any, idx: number) => {
                                const pid = String(r?.playerId || r?.id || "");
                                const pts = points.find((p: any) => String(p?.playerId || "") === pid)?.points ?? 0;
                                return (
                                  <div key={`${pid}_${idx}`} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                                    <b style={{ color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,.72)" }}>{idx + 1}</b>
                                    <PlayerPill name={r?.name || playersById[pid]?.name || "Joueur"} avatarUrl={r?.avatarDataUrl || r?.avatar || playersById[pid]?.avatar || null} />
                                    <b style={{ color: TAB_COLORS.linked }}>+{pts}</b>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: .76 }}>Aucune partie liée pour l’instant.</div>
                )}
              </Card>
            )
          ) : null}

          {/* ADMINISTRATION HÔTE */}
          {tab === "admin" && isCompetitionAdmin ? (
            <Card title="Administration" subtitle={isChallengePerformanceCompetition?"Administration Challenge organisée par rubriques : ouvre uniquement la section que tu veux modifier.":"Gère les participants, les administrateurs et les paramètres essentiels de la compétition."} accent={TAB_COLORS.admin} icon="⚙">
              {adminNotice?<div style={{marginBottom:10,padding:9,borderRadius:11,background:"rgba(101,230,162,.12)",border:"1px solid rgba(101,230,162,.30)",fontSize:9.5}}>{adminNotice}</div>:null}
              <div style={{display:"grid",gap:10}}>
                <details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>GÉNÉRAL<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Identité, état et nom de la compétition</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,255,255,.11)"}}>
                  <b style={{color:"#ffcf57",fontSize:11}}>IDENTITÉ & ÉTAT</b>
                  <label style={{display:"grid",gap:5,marginTop:9,fontSize:8.5,opacity:.8}}>Nom de la compétition<input value={adminDraftName || String((tour as any)?.name||"")} onChange={e=>setAdminDraftName(e.target.value)} style={{height:38,borderRadius:11,border:"1px solid rgba(255,255,255,.14)",background:"#070b11",color:"#fff",padding:"0 10px",fontWeight:900}}/></label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:8}}><button disabled={!canAdmin("identity")} onClick={()=>saveTournamentAdmin({name:(adminDraftName||String((tour as any)?.name||"")).trim()||String((tour as any)?.name||"")},false,"identity")} style={{minHeight:36,borderRadius:10,border:"1px solid rgba(255,207,87,.35)",background:"rgba(72,52,7,.92)",color:"#fff",fontWeight:1000}}>ENREGISTRER</button><button disabled={!canAdmin("identity")} onClick={()=>saveTournamentAdmin({status:String((tour as any)?.status)==="running"?"draft":"running"},false,"identity")} style={{minHeight:36,borderRadius:10,border:"1px solid rgba(79,180,255,.35)",background:"rgba(8,35,58,.94)",color:"#fff",fontWeight:1000}}>{String((tour as any)?.status)==="running"?"METTRE EN PAUSE":"LANCER"}</button></div>
                </section>
                </details>
                <details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>JOUEURS<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Participants et ajout de joueurs</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,255,255,.11)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><b style={{color:"#4fb4ff",fontSize:11}}>PARTICIPANTS</b><div style={{fontSize:8.5,opacity:.65,marginTop:2}}>Ajoute les joueurs avant le lancement, ou reconstruis le calendrier tant qu’aucun match n’est terminé.</div></div><button onClick={()=>setAdminPlayerPickerOpen(v=>!v)} style={{borderRadius:999,border:"1px solid rgba(79,180,255,.4)",background:"rgba(79,180,255,.10)",color:"#fff",padding:"7px 10px",fontWeight:1000}}>+ AJOUTER</button></div>
                  {adminPlayerPickerOpen?<div style={{display:"grid",gap:6,marginTop:9,maxHeight:180,overflowY:"auto"}}>{availableProfiles.length?availableProfiles.map((p:any)=><button key={p.id} onClick={()=>addCompetitionPlayer(p)} style={{textAlign:"left",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(255,255,255,.10)",background:"#080d14",color:"#fff",fontWeight:900}}>{p.name||p.nickname||p.displayName||"Joueur"}</button>):<div style={{fontSize:9,opacity:.65}}>Aucun autre profil local disponible.</div>}</div>:null}
                  <div style={{display:"grid",gap:6,marginTop:9}}>{tournamentPlayers.map((p:any)=><div key={p.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"8px 9px",borderRadius:11,background:"#080d14",border:"1px solid rgba(255,255,255,.08)"}}><b style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||"Joueur"}</b><button disabled={doneMatches.length>0} onClick={()=>removeCompetitionPlayer(String(p.id))} style={{border:0,borderRadius:8,background:"rgba(255,70,80,.15)",color:"#ff7178",padding:"5px 8px",fontWeight:1000,opacity:doneMatches.length>0?.35:1}}>RETIRER</button></div>)}</div>
                </section>
                </details>

                {isOnlineCompetition && canAdmin("invitations") ? <details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>INSCRIPTIONS ONLINE<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Invitations et demandes d’inscription</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(79,180,255,.18)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div><b style={{color:"#4fb4ff",fontSize:11}}>INVITATIONS & INSCRIPTIONS ONLINE</b><div style={{fontSize:8.5,opacity:.65,marginTop:2}}>Invite des comptes Online et traite les demandes reçues depuis le lien public.</div></div>
                    <span style={{padding:"4px 7px",borderRadius:999,border:"1px solid rgba(79,180,255,.25)",fontSize:7.2,fontWeight:1000,color:"#7bc8ff"}}>{enrollmentPolicy==="open"?"OUVERT":enrollmentPolicy==="approval"?"VALIDATION":enrollmentPolicy==="invite"?"INVITATION":"FERMÉ"}</span>
                  </div>

                  {enrollmentRequests.filter((row:any)=>String(row?.status||"pending")==="pending").length ? <div style={{display:"grid",gap:6,marginTop:9}}>
                    <div style={{fontSize:7.6,fontWeight:1000,color:"#ffcf73"}}>DEMANDES EN ATTENTE</div>
                    {enrollmentRequests.filter((row:any)=>String(row?.status||"pending")==="pending").map((row:any)=><div key={String(row.id)} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:6,alignItems:"center",padding:"8px 9px",borderRadius:10,border:"1px solid rgba(255,207,87,.13)",background:"#080d14"}}>
                      <div style={{minWidth:0}}><b style={{display:"block",fontSize:8.8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row?.name||"Joueur Online"}</b><span style={{display:"block",fontSize:6.8,opacity:.55,marginTop:2}}>Demande du {formatDate(Number(row?.requestedAt||Date.now()))}</span></div>
                      <button type="button" onClick={()=>void approveEnrollmentRequest(row)} style={{minHeight:28,borderRadius:8,border:"1px solid rgba(101,230,162,.3)",background:"rgba(14,62,43,.85)",color:"#fff",fontSize:6.9,fontWeight:1000}}>ACCEPTER</button>
                      <button type="button" onClick={()=>void rejectEnrollmentRequest(row)} style={{minHeight:28,borderRadius:8,border:"1px solid rgba(255,113,120,.25)",background:"rgba(71,19,23,.8)",color:"#fff",fontSize:6.9,fontWeight:1000}}>REFUSER</button>
                    </div>)}
                  </div> : null}

                  <div style={{marginTop:10,padding:"9px",borderRadius:11,border:"1px solid rgba(79,180,255,.12)",background:"#080d14"}}>
                    <div style={{fontSize:7.6,fontWeight:1000,color:"#7bc8ff"}}>INVITER UN JOUEUR ONLINE</div>
                    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:6,marginTop:7}}>
                      <input value={onlineInviteQuery} onChange={e=>setOnlineInviteQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") void searchOnlineInviteCandidates();}} placeholder="Pseudo / nom Online" style={{height:33,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#070b11",color:"#fff",padding:"0 8px",fontSize:8,fontWeight:800}}/>
                      <button type="button" onClick={()=>void searchOnlineInviteCandidates()} style={{minWidth:72,borderRadius:9,border:"1px solid rgba(79,180,255,.28)",background:"rgba(8,35,58,.9)",color:"#fff",fontSize:7,fontWeight:1000}}>RECHERCHER</button>
                      <button type="button" onClick={()=>void loadOnlineInviteCandidates()} style={{minWidth:58,borderRadius:9,border:"1px solid rgba(255,255,255,.11)",background:"#070b11",color:"#fff",fontSize:7,fontWeight:1000}}>AMIS</button>
                    </div>
                    {onlineInviteError?<div style={{fontSize:7.2,color:"#ff7178",marginTop:6}}>{onlineInviteError}</div>:null}
                    {onlineInviteLoading?<div style={{fontSize:7.2,opacity:.58,marginTop:6}}>Chargement…</div>:null}
                    {!onlineInviteLoading && onlineInvitePeople.length ? <div style={{display:"grid",gap:5,marginTop:7,maxHeight:180,overflowY:"auto"}}>{onlineInvitePeople.map((person:any)=>{
                      const uid=onlineUserIdOf(person);
                      const label=String(person?.displayName||person?.nickname||"Joueur Online");
                      return <div key={uid} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}><div style={{minWidth:0}}><b style={{display:"block",fontSize:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</b><span style={{fontSize:6.5,opacity:.52}}>{person?.nickname&&person?.displayName!==person?.nickname?`@${person.nickname}`:"Compte Online"}</span></div><button type="button" onClick={()=>void sendCompetitionInvite(person)} style={{minHeight:28,borderRadius:8,border:"1px solid rgba(79,180,255,.28)",background:"rgba(8,35,58,.88)",color:"#fff",fontSize:6.8,fontWeight:1000}}>INVITER</button></div>
                    })}</div>:null}
                  </div>

                  {competitionInvitations.length ? <div style={{display:"grid",gap:5,marginTop:9}}>
                    <div style={{fontSize:7.6,fontWeight:1000,opacity:.7}}>INVITATIONS</div>
                    {competitionInvitations.slice().sort((a:any,b:any)=>Number(b?.createdAt||0)-Number(a?.createdAt||0)).map((row:any)=>{
                      const status=String(row?.status||"pending");
                      const accent=status==="accepted"?"#65e6a2":status==="pending"?"#ffcf73":"#8b96a5";
                      return <div key={String(row.id)} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}><b style={{fontSize:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row?.name||"Joueur Online"}</b><span style={{fontSize:6.7,fontWeight:1000,color:accent}}>{status==="accepted"?"ACCEPTÉE":status==="pending"?"EN ATTENTE":status.toUpperCase()}</span>{status==="pending"?<button type="button" onClick={()=>void revokeCompetitionInvite(String(row.id))} style={{border:0,borderRadius:7,background:"rgba(255,70,80,.12)",color:"#ff7178",padding:"5px 7px",fontSize:6.5,fontWeight:1000}}>ANNULER</button>:<span/>}</div>
                    })}
                  </div>:null}
                </section>
                </details> : null}

                {(isCompetitionOwner || canAdmin("admins")) ? <details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>ADMINISTRATEURS<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Rôles et permissions</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,255,255,.11)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><b style={{color:"#ff6b6b",fontSize:11}}>ADMINISTRATEURS</b><div style={{fontSize:8.5,opacity:.65,marginTop:2}}>Le propriétaire peut attribuer des droits différents à chaque administrateur.</div></div><button onClick={()=>setAdminAdminPickerOpen(v=>!v)} style={{borderRadius:999,border:"1px solid rgba(255,107,107,.4)",background:"rgba(255,107,107,.10)",color:"#fff",padding:"7px 10px",fontWeight:1000}}>+ NOMMER</button></div>
                  {adminAdminPickerOpen?<div style={{display:"grid",gap:6,marginTop:9,maxHeight:160,overflowY:"auto"}}>{availableAdmins.length?availableAdmins.map((p:any)=><button key={p.id} onClick={()=>addCompetitionAdmin(String(p.id))} style={{textAlign:"left",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(255,255,255,.10)",background:"#080d14",color:"#fff",fontWeight:900}}>{p.name||p.nickname||p.displayName||"Profil"}</button>):<div style={{fontSize:9,opacity:.65}}>Aucun profil supplémentaire disponible.</div>}</div>:null}
                  <div style={{display:"grid",gap:6,marginTop:9}}>
                    <div style={{padding:"8px 9px",borderRadius:11,background:"#080d14",border:"1px solid rgba(255,207,87,.18)",fontSize:9.5}}><b>PROPRIÉTAIRE</b> · {allProfiles.find((p:any)=>String(p.id)===ownerProfileId)?.name||playersById[ownerProfileId]?.name||"Créateur"}</div>
                    {adminProfileIds.map(pid=>{
                      const adminName=allProfiles.find((p:any)=>String(p.id)===pid)?.name||playersById[pid]?.name||pid;
                      const permissions=Array.isArray(adminPermissionMap[pid])?adminPermissionMap[pid]:ALL_ADMIN_PERMISSIONS;
                      return <div key={pid} style={{padding:"8px 9px",borderRadius:11,background:"#080d14",border:"1px solid rgba(255,255,255,.08)"}}>
                        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"center"}}><b style={{fontSize:9.5}}>{adminName}</b><button onClick={()=>void removeCompetitionAdmin(pid)} style={{border:0,borderRadius:8,background:"rgba(255,70,80,.15)",color:"#ff7178",padding:"5px 8px",fontWeight:1000}}>RETIRER</button></div>
                        {isCompetitionOwner?<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:7}}>{ADMIN_PERMISSION_DEFS.map(item=><button key={`${pid}-${item.key}`} type="button" onClick={()=>void toggleAdminPermission(pid,item.key)} style={{minHeight:24,borderRadius:999,border:`1px solid ${permissions.includes(item.key)?"rgba(101,230,162,.3)":"rgba(255,255,255,.09)"}`,background:permissions.includes(item.key)?"rgba(14,62,43,.65)":"#070b11",color:permissions.includes(item.key)?"#9ef4c2":"#7d8794",padding:"0 7px",fontSize:6.3,fontWeight:1000}}>{item.label}</button>)}</div>:<div style={{fontSize:6.7,opacity:.58,marginTop:5}}>{permissions.length} autorisation{permissions.length>1?"s":""}</div>}
                      </div>
                    })}
                  </div>
                </section>
                </details> : null}
                {isChallengePerformanceCompetition?<details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>SAISON<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>État et durée de la saison Challenge</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(101,230,162,.18)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                    <div><b style={{color:"#65e6a2",fontSize:11}}>SAISON CHALLENGE</b><div style={{fontSize:8.5,opacity:.65,marginTop:3}}>Édite une saison déjà créée sans toucher aux résultats enregistrés.</div></div>
                    <span style={{padding:"4px 7px",borderRadius:999,border:"1px solid rgba(101,230,162,.24)",fontSize:7.5,fontWeight:1000,color:"#65e6a2"}}>{String(challengeSeasonSettings?.status||"running").toUpperCase()}</span>
                  </div>
                  <div style={{display:"grid",gap:7,marginTop:9}}>
                    <label style={{display:"grid",gap:4,fontSize:8,opacity:.8}}>NOM DE SAISON
                      <input value={adminSeasonName} placeholder={String(challengeSeasonSettings?.name||"Saison Challenge")} onChange={e=>setAdminSeasonName(e.target.value)} style={{height:36,borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 9px",fontWeight:900}}/>
                    </label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <label style={{display:"grid",gap:4,fontSize:8,opacity:.8}}>NB MAX DE CYCLES
                        <input inputMode="numeric" value={adminSeasonMaxCycles} placeholder={challengeSeasonSettings?.maxCycles?String(challengeSeasonSettings.maxCycles):"Illimité"} onChange={e=>setAdminSeasonMaxCycles(e.target.value.replace(/\D/g,"").slice(0,2))} style={{height:36,borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 9px",fontWeight:900}}/>
                      </label>
                      <label style={{display:"grid",gap:4,fontSize:8,opacity:.8}}>FIN PRÉVUE
                        <input type="date" value={adminSeasonEndDate} onChange={e=>setAdminSeasonEndDate(e.target.value)} style={{height:36,borderRadius:10,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 9px",fontWeight:900}}/>
                      </label>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <button type="button" onClick={()=>saveChallengeSeasonSettings()} style={{minHeight:35,borderRadius:9,border:"1px solid rgba(101,230,162,.34)",background:"rgba(14,62,43,.88)",color:"#fff",fontWeight:1000,fontSize:8}}>ENREGISTRER LA SAISON</button>
                      {String(challengeSeasonSettings?.status||"running")==="finished"
                        ? <button type="button" onClick={()=>saveChallengeSeasonSettings("running")} style={{minHeight:35,borderRadius:9,border:"1px solid rgba(79,180,255,.34)",background:"rgba(8,35,58,.9)",color:"#fff",fontWeight:1000,fontSize:8}}>RÉOUVRIR</button>
                        : <button type="button" onClick={()=>saveChallengeSeasonSettings("finished")} style={{minHeight:35,borderRadius:9,border:"1px solid rgba(255,107,107,.28)",background:"rgba(71,19,23,.84)",color:"#fff",fontWeight:1000,fontSize:8}}>CLÔTURER LA SAISON</button>}
                    </div>
                  </div>
                </section>
                </details>:null}
                {isChallengePerformanceCompetition?<details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>RÈGLES<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Barème, essais et paramètres de saison</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(79,180,255,.18)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                    <div><b style={{color:"#4fb4ff",fontSize:11}}>RÈGLES DE LA SAISON</b><div style={{fontSize:8.5,opacity:.65,marginTop:3}}>Modifie les règles générales sans supprimer les résultats déjà enregistrés.</div></div>
                    <span style={{fontSize:7.3,opacity:.62}}>CYCLE {challengeCurrentCycle}</span>
                  </div>
                  <div style={{display:"grid",gap:9,marginTop:9}}>
                    <div>
                      <div style={{fontSize:7.8,fontWeight:1000,opacity:.72,marginBottom:5}}>ESSAIS MAX / OBJECTIF</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{[1,2,3,4,5].map(n=><button key={`adm-att-${n}`} type="button" onClick={()=>setAdminChallengeAttempts(n)} style={{minWidth:38,minHeight:31,borderRadius:9,border:`1px solid ${adminChallengeAttempts===n?"rgba(79,180,255,.55)":"rgba(255,255,255,.10)"}`,background:adminChallengeAttempts===n?"rgba(8,35,58,.95)":"#080d14",color:"#fff",fontSize:8,fontWeight:1000}}>{n}</button>)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:7.8,fontWeight:1000,opacity:.72,marginBottom:5}}>BARÈME</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{(["standard","f1","linear"] as const).map(preset=><button key={preset} type="button" onClick={()=>setAdminChallengePointsPreset(preset)} style={{minHeight:31,borderRadius:9,border:`1px solid ${adminChallengePointsPreset===preset?"rgba(79,180,255,.55)":"rgba(255,255,255,.10)"}`,background:adminChallengePointsPreset===preset?"rgba(8,35,58,.95)":"#080d14",color:"#fff",padding:"0 9px",fontSize:7.6,fontWeight:1000}}>{preset==="standard"?"STANDARD":preset==="f1"?"F1":"LINÉAIRE"}</button>)}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <label style={{display:"grid",gap:4,fontSize:7.8,opacity:.8}}>MEILLEURS OBJECTIFS COMPTÉS
                        <input inputMode="numeric" value={String(adminChallengeCountBest||0)} onChange={e=>setAdminChallengeCountBest(Math.max(0,Math.min(99,Number(e.target.value)||0)))} style={{height:34,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 8px",fontWeight:900}}/>
                        <small style={{fontSize:6.8,opacity:.55}}>0 = tous</small>
                      </label>
                      <label style={{display:"grid",gap:4,fontSize:7.8,opacity:.8}}>OBJECTIFS / JOURNÉE
                        <input inputMode="numeric" value={String(adminChallengeObjectivesPerRound)} onChange={e=>setAdminChallengeObjectivesPerRound(Math.max(1,Math.min(5,Number(e.target.value)||1)))} style={{height:34,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 8px",fontWeight:900}}/>
                      </label>
                    </div>
                    <div>
                      <div style={{fontSize:7.8,fontWeight:1000,opacity:.72,marginBottom:5}}>PUBLICATION</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        <button type="button" onClick={()=>setAdminChallengePublicationMode("round_by_round")} style={{minHeight:32,borderRadius:9,border:`1px solid ${adminChallengePublicationMode==="round_by_round"?"rgba(79,180,255,.55)":"rgba(255,255,255,.10)"}`,background:adminChallengePublicationMode==="round_by_round"?"rgba(8,35,58,.95)":"#080d14",color:"#fff",fontSize:7.5,fontWeight:1000}}>UNE JOURNÉE À LA FOIS</button>
                        <button type="button" onClick={()=>setAdminChallengePublicationMode("all")} style={{minHeight:32,borderRadius:9,border:`1px solid ${adminChallengePublicationMode==="all"?"rgba(79,180,255,.55)":"rgba(255,255,255,.10)"}`,background:adminChallengePublicationMode==="all"?"rgba(8,35,58,.95)":"#080d14",color:"#fff",fontSize:7.5,fontWeight:1000}}>TOUT OUVRIR</button>
                      </div>
                    </div>
                    {challengeCompetitionFormat==="divisions"?<div>
                      <div style={{fontSize:7.8,fontWeight:1000,opacity:.72,marginBottom:5}}>POINTS AU CYCLE SUIVANT</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {(["reset","carry","carry_percent"] as const).map(mode=><button key={mode} type="button" onClick={()=>setAdminChallengeCyclePointsMode(mode)} style={{minHeight:31,borderRadius:9,border:`1px solid ${adminChallengeCyclePointsMode===mode?"rgba(79,180,255,.55)":"rgba(255,255,255,.10)"}`,background:adminChallengeCyclePointsMode===mode?"rgba(8,35,58,.95)":"#080d14",color:"#fff",padding:"0 9px",fontSize:7.4,fontWeight:1000}}>{mode==="reset"?"REMISE À ZÉRO":mode==="carry"?"CONSERVER 100 %":"CONSERVER %"}</button>)}
                      </div>
                      {adminChallengeCyclePointsMode==="carry_percent"?<input inputMode="numeric" value={String(adminChallengeCarryPercent)} onChange={e=>setAdminChallengeCarryPercent(Math.max(0,Math.min(100,Number(e.target.value)||0)))} style={{marginTop:6,width:"100%",height:34,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#080d14",color:"#fff",padding:"0 8px",fontWeight:900}}/>:null}
                    </div>:null}
                    <button type="button" onClick={saveChallengeCompetitionRules} style={{minHeight:36,borderRadius:10,border:"1px solid rgba(79,180,255,.38)",background:"rgba(8,35,58,.94)",color:"#fff",fontSize:8,fontWeight:1000}}>ENREGISTRER LES RÈGLES</button>
                  </div>
                </section>
                </details>:null}
                {isChallengePerformanceCompetition?<details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>OBJECTIFS<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Programme et paramètres par objectif</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,181,74,.18)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                    <div><b style={{color:"#ffb54a",fontSize:11}}>PROGRAMME D’OBJECTIFS</b><div style={{fontSize:8.5,opacity:.65,marginTop:3}}>Ajoute, retire, ordonne et personnalise chaque objectif de la saison.</div></div>
                    <MiniBadge label="Objectifs" value={challengeObjectives.length} accent="#ffb54a"/>
                  </div>
                  <div style={{display:"grid",gap:6,marginTop:8}}>
                    {challengeObjectives.map((objective:string,index:number)=>{
                      const settings=challengeCompetition?.objectiveSettings?.[objective]||{};
                      const visits=Math.max(1,Number(settings?.visits||challengeRules?.visits||30)||30);
                      const attempts=Math.max(1,Math.min(5,Number(settings?.attemptsPerObjective||challengeAttemptsPerObjective)||challengeAttemptsPerObjective));
                      const hasResults=linkedHistoryMatches.some((row:any)=>normalizeChallengeObjective(row?.challengeObjective||row?.target||row?.objective)===objective);
                      return <div key={`program-${objective}`} style={{display:"grid",gridTemplateColumns:"minmax(80px,1fr) 64px 64px auto",gap:6,alignItems:"end",padding:"8px",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",background:"#080d14"}}>
                        <div style={{minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}><ChallengeObjectiveThumb objective={objective}/><b style={{display:"block",fontSize:8.6,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{index+1}. {challengeObjectiveLabel(objective)}</b></div>
                          <div style={{display:"flex",gap:4,marginTop:5}}>
                            <button type="button" disabled={index===0} onClick={()=>moveChallengeSeasonObjective(objective,-1)} style={{width:25,height:25,borderRadius:7,border:"1px solid rgba(255,255,255,.10)",background:"#070b11",color:"#fff",opacity:index===0?.3:1}}>↑</button>
                            <button type="button" disabled={index===challengeObjectives.length-1} onClick={()=>moveChallengeSeasonObjective(objective,1)} style={{width:25,height:25,borderRadius:7,border:"1px solid rgba(255,255,255,.10)",background:"#070b11",color:"#fff",opacity:index===challengeObjectives.length-1?.3:1}}>↓</button>
                            <button type="button" disabled={challengeObjectives.length<=1||hasResults} onClick={()=>removeChallengeSeasonObjective(objective)} style={{height:25,borderRadius:7,border:"1px solid rgba(255,113,120,.22)",background:"rgba(255,70,80,.12)",color:"#ff7178",padding:"0 7px",fontSize:6.8,fontWeight:1000,opacity:(challengeObjectives.length<=1||hasResults)?.3:1}}>RETIRER</button>
                          </div>
                        </div>
                        <label style={{display:"grid",gap:3,fontSize:6.8,opacity:.72}}>TOURS
                          <input key={`visits-${objective}-${visits}`} defaultValue={String(visits)} inputMode="numeric" onBlur={e=>updateChallengeObjectiveSetting(objective,{visits:Number(e.target.value)||1})} style={{height:30,borderRadius:8,border:"1px solid rgba(255,255,255,.10)",background:"#070b11",color:"#fff",padding:"0 6px",fontSize:7.5,fontWeight:900}}/>
                        </label>
                        <label style={{display:"grid",gap:3,fontSize:6.8,opacity:.72}}>ESSAIS
                          <select value={attempts} onChange={e=>updateChallengeObjectiveSetting(objective,{attemptsPerObjective:Number(e.target.value)})} style={{height:30,borderRadius:8,border:"1px solid rgba(255,255,255,.10)",background:"#070b11",color:"#fff",padding:"0 5px",fontSize:7.5,fontWeight:900}}>
                            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <span style={{fontSize:6.6,color:hasResults?"#65e6a2":"#8b96a5",fontWeight:1000,alignSelf:"center"}}>{hasResults?"RÉSULTATS":"LIBRE"}</span>
                      </div>
                    })}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:7,marginTop:8}}>
                    <select disabled={!challengeAvailableObjectivesToAdd.length} value={challengeAvailableObjectivesToAdd.length?adminObjectiveToAdd:""} onChange={e=>setAdminObjectiveToAdd(e.target.value)} style={{height:34,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#070b11",color:"#fff",padding:"0 8px",fontSize:8,fontWeight:900,opacity:challengeAvailableObjectivesToAdd.length?1:.45}}>
                      {challengeAvailableObjectivesToAdd.length?challengeAvailableObjectivesToAdd.map(value=><option key={`add-${value}`} value={value}>{challengeObjectiveLabel(value)}</option>):<option value="">Tous les objectifs sont déjà ajoutés</option>}
                    </select>
                    <button type="button" disabled={!challengeAvailableObjectivesToAdd.length} onClick={addChallengeSeasonObjective} style={{minWidth:92,minHeight:34,borderRadius:9,border:"1px solid rgba(255,181,74,.34)",background:"rgba(74,46,10,.92)",color:"#fff",fontSize:7.5,fontWeight:1000,opacity:challengeAvailableObjectivesToAdd.length?1:.4}}>+ AJOUTER</button>
                  </div>
                  <div style={{fontSize:7,opacity:.55,lineHeight:1.35,marginTop:6}}>Un objectif ayant déjà des résultats ne peut plus être retiré. Son ordre, son nombre de tours et son quota d’essais restent éditables.</div>
                </section>
                </details>:null}
                {isChallengePerformanceCompetition?<details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>JOURNÉES<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Publication et progression du cycle</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,181,74,.18)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                    <div><b style={{color:"#ffb54a",fontSize:11}}>JOURNÉES / MANCHES · CYCLE {challengeCurrentCycle}</b><div style={{fontSize:8.5,opacity:.65,marginTop:3}}>Publication : {String(challengeCompetition?.schedule?.publicationMode||"round_by_round")==="round_by_round"?"une journée à la fois":"toutes ouvertes"}</div></div>
                    <MiniBadge label="Total" value={challengeScheduleRounds.length} accent="#ffb54a"/>
                  </div>
                  <div style={{display:"grid",gap:6,marginTop:8}}>
                    {challengeScheduleRounds.map((round:any)=>{
                      const status=String(round?.status||"open");
                      const accent=status==="open"?"#65e6a2":status==="closed"?"#7c8796":"#ffb54a";
                      return <div key={String(round?.id)} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"8px 9px",borderRadius:10,background:"#080d14",border:`1px solid ${accent}22`}}>
                        <b style={{fontSize:8.5,color:accent}}>J{Number(round?.round||0)||1}</b>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(Array.isArray(round?.objectives)?round.objectives:[]).map((objective:any)=><span key={String(objective)} style={{fontSize:7.4,padding:"3px 6px",borderRadius:999,border:"1px solid rgba(255,255,255,.09)"}}>{challengeObjectiveLabel(objective)}</span>)}</div>
                        <div style={{display:"flex",gap:4}}>
                          {status!=="open"?<button type="button" onClick={()=>updateChallengeRoundStatus(String(round.id),"open")} style={{border:0,borderRadius:7,padding:"5px 7px",background:"rgba(40,120,74,.24)",color:"#65e6a2",fontSize:7,fontWeight:1000}}>OUVRIR</button>:null}
                          {status!=="closed"?<button type="button" onClick={()=>updateChallengeRoundStatus(String(round.id),"closed")} style={{border:0,borderRadius:7,padding:"5px 7px",background:"rgba(255,255,255,.08)",color:"#d7dde6",fontSize:7,fontWeight:1000}}>FERMER</button>:null}
                        </div>
                      </div>
                    })}
                  </div>
                  {String(challengeCompetition?.schedule?.publicationMode||"round_by_round")==="round_by_round"?<button type="button" onClick={advanceChallengeRound} style={{marginTop:9,width:"100%",minHeight:36,borderRadius:10,border:"1px solid rgba(255,181,74,.34)",background:"rgba(74,46,10,.92)",color:"#fff",fontWeight:1000}}>CLÔTURER L’ACTUELLE · PUBLIER LA SUIVANTE</button>:null}
                </section>
                </details>:null}
                {challengeCompetitionFormat==='divisions'&&challengeDivisionState.enabled?<details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>DIVISIONS & BARRAGES<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Divisions, mouvements et barrages</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(182,182,255,.18)"}}>
                  <b style={{color:"#b6b6ff",fontSize:11}}>LIGUES & DIVISIONS · CYCLE {challengeDivisionState.cycle}</b>
                  <div style={{fontSize:8.5,opacity:.65,marginTop:3}}>Chaque division possède ses propres règles de montée, descente et barrage. Le classement du cycle est archivé avant de passer au suivant.</div>
                  <div style={{display:"grid",gap:6,marginTop:8}}>
                    {challengeDivisionState.byDivision.map((div:any)=><div key={div.division} style={{display:"grid",gridTemplateColumns:"74px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"8px 9px",borderRadius:9,background:"#080d14",fontSize:8.2}}>
                      <b>DIVISION {div.division}</b>
                      <span>{div.standings.length} joueur{div.standings.length>1?'s':''}</span>
                      <span style={{opacity:.72}}>↑{Number(div.policy?.promote||0)} · ↓{Number(div.policy?.relegate||0)} · B{Number(div.policy?.playoff||0)}</span>
                    </div>)}
                  </div>

                  <div style={{marginTop:10,padding:"9px",borderRadius:11,border:"1px solid rgba(255,207,87,.16)",background:"#080d14"}}>
                    <div><b style={{fontSize:9,color:"#ffcf73"}}>CONFIGURATION DES BARRAGES</b><div style={{fontSize:7.6,opacity:.58,marginTop:2}}>Règle commune aux prochains barrages générés.</div></div>
                    <div style={{display:"grid",gap:8,marginTop:8}}>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {(["fixed","random","multiple"] as const).map(mode=><button key={mode} type="button" onClick={()=>setAdminPlayoffObjectiveMode(mode)} style={{minHeight:31,borderRadius:9,border:`1px solid ${adminPlayoffObjectiveMode===mode?"rgba(255,207,87,.55)":"rgba(255,255,255,.10)"}`,background:adminPlayoffObjectiveMode===mode?"rgba(74,46,10,.92)":"#070b11",color:"#fff",padding:"0 9px",fontSize:7.3,fontWeight:1000}}>{mode==="fixed"?"OBJECTIF FIXE":mode==="random"?"ALÉATOIRE":"MULTI-OBJECTIFS"}</button>)}
                      </div>
                      <div style={{fontSize:7.3,opacity:.62,lineHeight:1.35}}>{adminPlayoffObjectiveMode==="fixed"?"Les deux joueurs jouent le même objectif.":adminPlayoffObjectiveMode==="random"?"Un objectif est tiré au sort dans la liste au moment de créer le barrage.":"Tous les objectifs sélectionnés sont joués ; le gagnant est déterminé sur l’ensemble des mini-duels."}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {challengeObjectives.map(objective=><button key={`adm-po-${objective}`} type="button" onClick={()=>toggleAdminPlayoffObjective(objective)} style={{minHeight:29,borderRadius:999,border:`1px solid ${adminPlayoffObjectives.includes(objective)?"rgba(255,207,87,.55)":"rgba(255,255,255,.10)"}`,background:adminPlayoffObjectives.includes(objective)?"rgba(74,46,10,.9)":"#070b11",color:"#fff",padding:"0 8px",fontSize:7.2,fontWeight:1000}}>{challengeObjectiveLabel(objective)}</button>)}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                        <label style={{display:"grid",gap:4,fontSize:7.5,opacity:.8}}>ESSAIS MAX / OBJECTIF
                          <select value={adminPlayoffAttempts} onChange={e=>setAdminPlayoffAttempts(Math.max(1,Math.min(5,Number(e.target.value)||1)))} style={{height:33,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#070b11",color:"#fff",padding:"0 7px",fontWeight:900}}>
                            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <label style={{display:"grid",gap:4,fontSize:7.5,opacity:.8}}>TOURS / ESSAI
                          <input inputMode="numeric" value={String(adminPlayoffVisits)} onChange={e=>setAdminPlayoffVisits(Math.max(1,Math.min(200,Number(e.target.value)||1)))} style={{height:33,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"#070b11",color:"#fff",padding:"0 7px",fontWeight:900}}/>
                        </label>
                      </div>
                      <button type="button" onClick={saveChallengePlayoffSettings} style={{minHeight:34,borderRadius:9,border:"1px solid rgba(255,207,87,.32)",background:"rgba(74,46,10,.88)",color:"#fff",fontSize:7.7,fontWeight:1000}}>ENREGISTRER LES BARRAGES</button>
                    </div>
                  </div>

                  <div style={{marginTop:10,padding:"9px",borderRadius:11,border:"1px solid rgba(182,182,255,.13)",background:"#080d14"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                      <div><b style={{fontSize:9,color:"#d8d8ff"}}>AFFECTATIONS MANUELLES</b><div style={{fontSize:7.6,opacity:.58,marginTop:2}}>Déplace un joueur entre divisions sans supprimer ses résultats.</div></div>
                    </div>
                    <div style={{display:"grid",gap:5,marginTop:7}}>
                      {tournamentPlayers.map((player:any)=>{
                        const pid=String(player?.id||"");
                        const currentDivision=Math.max(1,Number(challengeDivisionState.assignments?.[pid]||1)||1);
                        return <div key={`assign-${pid}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 96px",gap:7,alignItems:"center"}}>
                          <span style={{fontSize:8.3,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player?.name||"Joueur"}</span>
                          <select value={currentDivision} onChange={e=>reassignChallengePlayerDivision(pid,Number(e.target.value))} style={{height:31,borderRadius:8,border:"1px solid rgba(255,255,255,.12)",background:"#070b11",color:"#fff",fontSize:8,fontWeight:900,padding:"0 6px"}}>
                            {Array.from({length:challengeDivisionState.count},(_,i)=><option key={i+1} value={i+1}>DIVISION {i+1}</option>)}
                          </select>
                        </div>
                      })}
                    </div>
                  </div>

                  <div style={{marginTop:10,padding:"9px",borderRadius:11,border:"1px solid rgba(182,182,255,.13)",background:"#080d14"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                      <div><b style={{fontSize:9,color:"#d8d8ff"}}>CYCLES DE LA SAISON</b><div style={{fontSize:7.6,opacity:.58,marginTop:2}}>Prépare le prochain cycle à l’avance. Un cycle brouillon peut être supprimé tant qu’il n’a aucun résultat.</div></div>
                      <button type="button" onClick={createChallengeDraftCycle} style={{borderRadius:999,border:"1px solid rgba(182,182,255,.34)",background:"rgba(28,28,65,.9)",color:"#fff",padding:"6px 8px",fontSize:7.2,fontWeight:1000}}>+ PRÉPARER</button>
                    </div>
                    <div style={{display:"grid",gap:5,marginTop:7}}>
                      {(Array.isArray(challengeCompetition?.divisionCycles)?challengeCompetition.divisionCycles:[]).slice().sort((a:any,b:any)=>Number(a?.cycle||0)-Number(b?.cycle||0)).map((cycle:any)=>{
                        const status=Number(cycle?.cycle)===challengeCurrentCycle?"active":String(cycle?.status||((cycle?.closedAt)?"closed":"draft"));
                        const color=status==="active"?"#65e6a2":status==="closed"?"#8b96a5":"#ffcf73";
                        return <div key={`cycle-admin-${cycle.cycle}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}>
                          <div><b style={{fontSize:8.2}}>{cycle?.name||`Cycle ${cycle?.cycle}`}</b><span style={{marginLeft:6,fontSize:7,color}}>{status==="active"?"ACTIF":status==="closed"?"CLÔTURÉ":"BROUILLON"}</span></div>
                          {status==="draft"?<button type="button" onClick={()=>deleteChallengeDraftCycle(Number(cycle?.cycle))} style={{border:0,borderRadius:7,background:"rgba(255,70,80,.13)",color:"#ff7178",padding:"5px 7px",fontSize:7,fontWeight:1000}}>SUPPRIMER</button>:<span style={{fontSize:7,opacity:.55}}>{cycle?.closedAt?formatDate(Number(cycle.closedAt)):""}</span>}
                        </div>
                      })}
                    </div>
                  </div>

                  {challengeDivisionState.pendingPlayoffs.length?<div style={{display:"grid",gap:7,marginTop:10}}>
                    <b style={{fontSize:9,color:"#ffcf73"}}>BARRAGES CHALLENGE À JOUER</b>
                    {challengeDivisionState.pendingPlayoffs.map((p:any)=>{
                      const upper=playersById[String(p.upperPlayerId)]?.name||"Joueur haut";
                      const lower=playersById[String(p.lowerPlayerId)]?.name||"Joueur bas";
                      const objectives=(Array.isArray(p?.objectives)&&p.objectives.length?p.objectives:[p?.objective||challengeCompetition?.divisions?.playoffObjective||challengeObjectives[0]||"20"]).map(normalizeChallengeObjective);
                      const maxAttempts=Math.max(1,Math.min(5,Number(p?.attemptsPerObjective||challengeCompetition?.divisions?.playoffAttemptsPerObjective||1)||1));
                      const results=Array.isArray(p?.results)?p.results:[];
                      const best=(side:"upper"|"lower",objective:string)=>results.filter((row:any)=>String(row?.side)===side&&normalizeChallengeObjective(row?.objective)===objective).slice().sort((a:any,b:any)=>Number(b?.score||0)-Number(a?.score||0)||Number(b?.tieBreak||0)-Number(a?.tieBreak||0))[0]||null;
                      const count=(side:"upper"|"lower",objective:string)=>results.filter((row:any)=>String(row?.side)===side&&normalizeChallengeObjective(row?.objective)===objective).length;
                      const canFinalize=objectives.every((objective:string)=>count("upper",objective)>0&&count("lower",objective)>0);
                      const modeLabel=String(p?.objectiveMode||"fixed")==="multiple"?"MULTI":String(p?.objectiveMode||"fixed")==="random"?"ALÉATOIRE":"FIXE";
                      return <div key={String(p.id)} style={{padding:"9px",borderRadius:10,background:"#080d14",border:"1px solid rgba(255,207,87,.14)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:7,alignItems:"center"}}>
                          <div style={{fontSize:8.2,fontWeight:900}}>D{p.upperDivision} {upper} ↔ D{p.lowerDivision} {lower}</div>
                          <span style={{fontSize:7.2,color:"#ffcf73",fontWeight:1000}}>{modeLabel} · {maxAttempts} essai{maxAttempts>1?"s":""}/objectif · {Math.max(1,Number(p?.visits||challengeCompetition?.divisions?.playoffVisits||challengeRules?.visits||30)||30)} tours</span>
                        </div>
                        {p.resolved?<div style={{marginTop:7}}>
                          <div style={{fontSize:7.8,color:"#65e6a2",fontWeight:1000}}>RÉSOLU · {playersById[String(p.winnerPlayerId)]?.name||"vainqueur"} gagne le barrage</div>
                          <div style={{display:"grid",gap:4,marginTop:6}}>{(Array.isArray(p?.objectiveResults)?p.objectiveResults:[]).map((row:any)=><div key={`resolved-${p.id}-${row.objective}`} style={{display:"grid",gridTemplateColumns:"minmax(70px,1fr) auto auto",gap:7,fontSize:7.2,opacity:.78}}><b>{challengeObjectiveLabel(row.objective)}</b><span>{upper} {Number(row.upperScore||0)}</span><span>{lower} {Number(row.lowerScore||0)}</span></div>)}</div>
                        </div>:<>
                          <div style={{display:"grid",gap:6,marginTop:8}}>
                            {objectives.map((objective:string)=>{
                              const upperCount=count("upper",objective),lowerCount=count("lower",objective);
                              const upperBest=best("upper",objective),lowerBest=best("lower",objective);
                              return <div key={`${p.id}-${objective}`} style={{padding:"7px",borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}>
                                <div style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"center"}}><b style={{fontSize:7.8,color:"#ffcf73"}}>{challengeObjectiveLabel(objective)}</b><span style={{fontSize:6.9,opacity:.55}}>meilleur essai retenu</span></div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
                                  <button type="button" disabled={upperCount>=maxAttempts} onClick={()=>launchChallengePlayoffAttempt(p,"upper",objective)} style={{minHeight:36,borderRadius:8,border:"1px solid rgba(182,182,255,.28)",background:"rgba(28,28,65,.85)",color:"#fff",fontSize:7.2,fontWeight:1000,opacity:upperCount>=maxAttempts?.42:1}}>{upper}<br/><span style={{opacity:.7}}>{upperCount}/{maxAttempts}{upperBest?` · best ${Number(upperBest.score||0)}`:" · JOUER"}</span></button>
                                  <button type="button" disabled={lowerCount>=maxAttempts} onClick={()=>launchChallengePlayoffAttempt(p,"lower",objective)} style={{minHeight:36,borderRadius:8,border:"1px solid rgba(101,230,162,.28)",background:"rgba(14,62,43,.85)",color:"#fff",fontSize:7.2,fontWeight:1000,opacity:lowerCount>=maxAttempts?.42:1}}>{lower}<br/><span style={{opacity:.7}}>{lowerCount}/{maxAttempts}{lowerBest?` · best ${Number(lowerBest.score||0)}`:" · JOUER"}</span></button>
                                </div>
                              </div>
                            })}
                          </div>
                          <button type="button" disabled={!canFinalize} onClick={()=>finalizeChallengePlayoff(String(p.id))} style={{marginTop:7,width:"100%",minHeight:32,borderRadius:8,border:"1px solid rgba(101,230,162,.3)",background:"rgba(14,62,43,.9)",color:"#fff",fontSize:7.4,fontWeight:1000,opacity:canFinalize?1:.35}}>VALIDER LES MEILLEURS ESSAIS</button>
                          {String(p?.status)==="tied"?<button type="button" onClick={()=>resetChallengePlayoff(String(p.id))} style={{marginTop:6,width:"100%",minHeight:30,borderRadius:8,border:"1px solid rgba(255,181,74,.3)",background:"rgba(74,46,10,.9)",color:"#fff",fontSize:7.5,fontWeight:1000}}>ÉGALITÉ · RÉINITIALISER LE BARRAGE</button>:null}
                        </>}
                      </div>
                    })}
                  </div>:null}

                  {challengeMovementHistory.length?<div style={{marginTop:10,padding:"9px",borderRadius:11,border:"1px solid rgba(101,230,162,.13)",background:"#080d14"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b style={{fontSize:9,color:"#65e6a2"}}>HISTORIQUE MONTÉES / DESCENTES</b><div style={{fontSize:7.4,opacity:.58,marginTop:2}}>Tous les mouvements de la saison, y compris barrages et changements manuels.</div></div><span style={{fontSize:7,color:"#65e6a2",fontWeight:1000}}>{challengeMovementHistory.length}</span></div>
                    <div style={{display:"grid",gap:5,marginTop:7,maxHeight:220,overflowY:"auto"}}>
                      {challengeMovementHistory.map((movement:any)=>{
                        const reason=String(movement?.reason||"manual");
                        const accent=reason==="promotion"?"#65e6a2":reason==="relegation"?"#ff7178":reason==="playoff"?"#ffcf73":"#4fb4ff";
                        const label=reason==="promotion"?"MONTÉE":reason==="relegation"?"DESCENTE":reason==="playoff"?"BARRAGE":"MANUEL";
                        return <div key={movement.id} style={{display:"grid",gridTemplateColumns:"58px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}>
                          <span style={{fontSize:6.9,fontWeight:1000,color:accent}}>C{movement.cycle} · {label}</span>
                          <div style={{minWidth:0}}><b style={{display:"block",fontSize:7.8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{movement.playerName}</b>{movement.note?<small style={{display:"block",fontSize:6.5,opacity:.55,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{movement.note}</small>:null}</div>
                          <span style={{fontSize:7.2,fontWeight:1000,color:accent}}>D{movement.from} → D{movement.to}</span>
                        </div>
                      })}
                    </div>
                  </div>:null}

                  <div style={{marginTop:9,padding:"8px 9px",borderRadius:9,background:"rgba(182,182,255,.06)",fontSize:8.2,lineHeight:1.4}}>
                    Nouveau cycle : {String(challengeCompetition?.cyclePoints?.mode||"reset")==="reset"?"points remis à zéro":String(challengeCompetition?.cyclePoints?.mode)==="carry"?"points intégralement conservés":`${Math.max(0,Math.min(100,Number(challengeCompetition?.cyclePoints?.carryPercent??50)||0))}% des points conservés`}.
                  </div>
                  <button type="button" onClick={applyChallengePromotionCycle} disabled={!challengeGeneralStandings.length || challengeDivisionState.pendingPlayoffs.some((p:any)=>!p?.resolved) || challengeScheduleRounds.some((round:any)=>String(round?.status||"open")!=="closed") || String(challengeSeasonSettings?.status||"running")==="finished"} style={{marginTop:9,width:"100%",minHeight:38,borderRadius:11,border:"1px solid rgba(182,182,255,.4)",background:"rgba(28,28,65,.94)",color:"#fff",fontWeight:1000,opacity:(!challengeGeneralStandings.length||challengeDivisionState.pendingPlayoffs.some((p:any)=>!p?.resolved)||challengeScheduleRounds.some((round:any)=>String(round?.status||"open")!=="closed")||String(challengeSeasonSettings?.status||"running")==="finished")?.35:1}}>CLÔTURER LE CYCLE · APPLIQUER MONTÉES / DESCENTES</button>
                </section>
                </details>:null}
                                                <details className={isChallengePerformanceCompetition ? "chv-admin-group" : ""} open={!isChallengePerformanceCompetition ? true : undefined}>
                  <summary style={{display:isChallengePerformanceCompetition?"list-item":"none"}}>OUTILS<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#7f8b99"}}>Outils de gestion et rattachements</span></summary>
                  <section style={{padding:11,borderRadius:15,background:"rgba(4,7,12,.98)",border:"1px solid rgba(255,255,255,.11)"}}>
                  <b style={{color:"#b6b6ff",fontSize:11}}>OUTILS DE GESTION</b><div style={{fontSize:8.5,opacity:.65,marginTop:3}}>{isChallengePerformanceCompetition?"Challenge performances : aucun calendrier de matchs n’est généré. Les essais sont rattachés aux objectifs et alimentent leurs classements.":"Les matchs et résultats restent éditables dans l’onglet Matchs. La reconstruction du calendrier est possible uniquement avant le premier résultat."}</div>
                  {!isChallengePerformanceCompetition?<button disabled={doneMatches.length>0 || tournamentPlayers.length<2} onClick={()=>saveTournamentAdmin({},true)} style={{marginTop:9,width:"100%",minHeight:38,borderRadius:11,border:"1px solid rgba(182,182,255,.35)",background:"rgba(28,28,65,.94)",color:"#fff",fontWeight:1000,opacity:(doneMatches.length>0||tournamentPlayers.length<2)?.35:1}}>RECONSTRUIRE LE CALENDRIER</button>:<button onClick={loadAttachableHistory} style={{marginTop:9,width:"100%",minHeight:38,borderRadius:11,border:"1px solid rgba(255,181,74,.35)",background:"rgba(64,40,9,.94)",color:"#fff",fontWeight:1000}}>＋ RATTACHER DES ESSAIS CHALLENGE</button>}
                </section>
                </details>
                {isChallengePerformanceCompetition && isCompetitionOwner ? <details className="chv-admin-group chv-danger">
                  <summary>ZONE DANGER<span style={{display:"block",marginTop:2,fontSize:6.8,fontWeight:700,letterSpacing:0,color:"#9b7782"}}>Suppression définitive de la compétition</span></summary>
                  <section style={{padding:11}}>
                    <b style={{display:"block",fontSize:9,color:"#ff718e"}}>SUPPRIMER LA COMPÉTITION</b>
                    <div className="chv-sub" style={{marginTop:4}}>Cette action supprime la compétition et ses données locales associées. Elle n’est plus exposée dans la navigation principale pour éviter les erreurs.</div>
                    <button type="button" onClick={async()=>{if(!id)return;const ok=window.confirm("Supprimer définitivement cette compétition et tous ses matchs ?");if(!ok)return;try{await deleteMatchesForTournamentLocal(id);await deleteTournamentLocal(id);}catch(e){console.error("[TournamentView] delete error:",e);}finally{go("tournaments");}}} style={{marginTop:9,width:"100%",minHeight:36,borderRadius:10,border:"1px solid rgba(255,79,120,.38)",background:"rgba(80,13,31,.88)",color:"#fff",fontSize:8,fontWeight:1000}}>SUPPRIMER DÉFINITIVEMENT</button>
                  </section>
                </details> : null}
              </div>
            </Card>
          ) : null}

          {/* STATS */}
          {tab === "stats" ? (
            isChallengePerformanceCompetition ? (
              <Card title="Statistiques Challenge" subtitle="Vue synthétique de la progression de la compétition, sans faux indicateurs de matchs." accent={TAB_COLORS.stats} icon="📊">
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7}}>
                  {[
                    ["JOUEURS",tournamentPlayers.length,"#ffcf73"],
                    ["OBJECTIFS",challengeObjectives.length,"#ffb54a"],
                    ["ESSAIS",linkedHistoryMatches.length,"#65e6a2"],
                    ["CYCLE",challengeCurrentCycle,"#b6b6ff"],
                  ].map(([label,value,accent]:any)=><div key={label} style={{padding:"9px 6px",borderRadius:11,border:`1px solid ${accent}28`,background:"#070b11",textAlign:"center"}}><b style={{display:"block",fontSize:16,color:accent}}>{value}</b><span style={{fontSize:6.8,fontWeight:1000,opacity:.62}}>{label}</span></div>)}
                </div>
                <div style={{marginTop:11,display:"grid",gap:6}}>
                  {challengeGeneralStandings.slice(0,10).map((row:any)=><div key={`stats-ch-${row.playerId}`} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"8px 9px",borderRadius:10,border:"1px solid rgba(255,255,255,.07)",background:"#070b11"}}><strong style={{color:Number(row.rank)<=3?"#ffcf73":"#8b96a5"}}>#{row.rank}</strong><div style={{minWidth:0}}><b style={{display:"block",fontSize:8.8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.name}</b><span style={{display:"block",fontSize:6.8,opacity:.55,marginTop:2}}>{Number(row.wins||0)} victoire{Number(row.wins||0)>1?"s":""} d’objectif · {Number(row.podiums||0)} podium{Number(row.podiums||0)>1?"s":""}</span></div><b style={{fontSize:10,color:"#b6b6ff"}}>{row.points} pts</b></div>)}
                  {!challengeGeneralStandings.length?<div style={{padding:12,textAlign:"center",fontSize:8.5,opacity:.62}}>Les statistiques apparaîtront dès les premiers essais classés.</div>:null}
                </div>
              </Card>
            ) : (
              <Card title="Statistiques" subtitle="Synthèse basée sur les résultats de la compétition." accent={TAB_COLORS.stats} icon="📊">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <MiniBadge label="Matchs" value={stats.global.totalMatches} accent={TAB_COLORS.stats} />
                  <MiniBadge label="Terminés" value={stats.global.doneMatches} accent="#7fe2a9" />
                  <MiniBadge label="En cours" value={stats.global.runningMatches} accent="#4fb4ff" />
                  <MiniBadge label="À jouer" value={stats.global.playableMatches} accent="#ffcf57" />
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {stats.list.map((r: any, idx: number) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.25)",
                        width: "100%",
                        maxWidth: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)" }}>{idx + 1}</div>
                      <PlayerPill name={r.name} avatarUrl={playersById[String(r.id)]?.avatar} />
                      <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9, whiteSpace: "nowrap" }}>
                        <b style={{ color: TAB_COLORS.stats }}>{r.points}</b> pts • {r.wins}-{r.losses} • <b style={{ color: "#7fe2a9" }}>{r.winrate}%</b> • Δ {r.diff}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          ) : null}
        </>
      )}


      {attachOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.68)",
            display: "grid",
            placeItems: "end center",
            padding: 14,
          }}
          onClick={() => !attachLoading && setAttachOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "78vh",
              overflow: "hidden",
              borderRadius: 24,
              border: "1px solid rgba(255,207,87,.26)",
              background: "linear-gradient(180deg, rgba(23,21,18,.98), rgba(8,8,12,.98))",
              boxShadow: "0 28px 80px rgba(0,0,0,.72)",
              padding: 14,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ color: TAB_COLORS.linked, fontWeight: 1000, fontSize: 14 }}>AJOUTER DES PARTIES JOUÉES</div>
                <div style={{ fontSize: 11.5, opacity: .75, marginTop: 3 }}>{isLeagueMulti ? "Ligue MULTI : points selon classement." : "Ligue classique : ajout comme résultat joué."}</div>
              </div>
              <button type="button" onClick={() => !attachLoading && setAttachOpen(false)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <MiniBadge label="Trouvées" value={attachRows.length} accent={TAB_COLORS.linked} />
              <MiniBadge label="Sélection" value={Object.values(attachSelected || {}).filter(Boolean).length} accent="#7fe2a9" />
            </div>

            {attachInfo ? <div style={{ marginTop: 10, fontSize: 12, opacity: .78 }}>{attachInfo}</div> : null}
            {attachError ? <div style={{ marginTop: 10, fontSize: 12, color: "#ff7a9e", fontWeight: 900 }}>{attachError}</div> : null}

            <div className="dc-scroll-thin" style={{ marginTop: 12, display: "grid", gap: 8, maxHeight: "48vh", overflowY: "auto", paddingRight: 3 }}>
              {attachLoading ? <div style={{ padding: 16, textAlign: "center", opacity: .8 }}>Chargement…</div> : null}
              {!attachLoading && !attachRows.length ? <div style={{ padding: 16, textAlign: "center", opacity: .72 }}>Aucune partie compatible à afficher.</div> : null}
              {!attachLoading && attachRows.map((row: any) => {
                const hid = String(row.__historyId || getHistoryRowId(row));
                const ranking = getHistoryRanking(row);
                const names = ranking.slice(0, 4).map((r: any, idx: number) => `${idx + 1}. ${r?.name || "Joueur"}`).join(" · ");
                const checked = !!attachSelected[hid];
                return (
                  <label key={hid} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center", borderRadius: 16, border: checked ? `1px solid ${TAB_COLORS.linked}AA` : "1px solid rgba(255,255,255,.10)", background: checked ? "rgba(255,207,87,.12)" : "rgba(255,255,255,.035)", padding: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={checked} onChange={(e) => setAttachSelected((prev) => ({ ...prev, [hid]: e.target.checked }))} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <b style={{ color: TAB_COLORS.linked, fontSize: 12 }}>{String(row.__mode || getHistoryMode(row) || "MATCH").toUpperCase()}</b>
                        <span style={{ fontSize: 11, opacity: .72 }}>{formatDate(Number(row.__time || getHistoryRowTime(row)))}</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11.5, opacity: .82, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names || `${row.__playersCount || 0} joueur(s)`}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <button type="button" disabled={attachLoading} onClick={() => setAttachOpen(false)} style={{ borderRadius: 999, padding: "12px 14px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 950, cursor: "pointer" }}>Annuler</button>
              <button type="button" disabled={attachLoading} onClick={attachSelectedHistoryMatches} style={{ borderRadius: 999, padding: "12px 14px", border: "none", background: "linear-gradient(180deg,#ffe68a,#ffc447)", color: "#1b1204", fontWeight: 1000, cursor: "pointer", opacity: attachLoading ? .55 : 1 }}>Lier</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMatch ? (
        <MatchDetailCard
          match={selectedMatch}
          playersById={playersById}
          allMatches={safeMatches as any}
          score={getScoreForAnyMatch(selectedMatch)}
          phaseLabel={matchPhaseShortLabel(selectedMatch, viewKind, koRoundsCount)}
          formatLabel={`BO${tournamentBestOf}`}
          onClose={() => setSelectedMatch(null)}
          onSimulate={publicSpectator ? undefined : () => simulateMatch(selectedMatch)}
          onPlay={publicSpectator ? undefined : () => {
            if (!selectedMatch) return;
            if (String(selectedMatch?.status || "") === "done") {
              return;
            }
            if (String(selectedMatch?.status || "") === "running" || String(selectedMatch?.status || "") === "playing" || isRealPlayable(selectedMatch)) {
              onStartMatch(String(selectedMatch.id));
            }
          }}
          onOpenResult={publicSpectator ? undefined : () => {
            if (!selectedMatch) return;
            onOpenResult(selectedMatch);
          }}
        />
      ) : null}

    </div>
  );
}
